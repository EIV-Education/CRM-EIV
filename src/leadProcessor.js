// Logic xu ly 1 lead (phan loai + ghi Base + gui thong bao), dung chung
// cho ca 2 duong vao: scripts/poll-and-route.mjs (quet dinh ky) va
// api/webhook.js (nhan webhook tuc thi tu Lark Base Automation).

import { classifyLead, nextStt } from './routing.js';
import {
  BRANCHES,
  LARK_BASE_APP_TOKEN,
  LARK_LEAD_TABLE_ID,
  NHOM_KH_LINK_TABLE_ID,
  NHOM_KH_PRIMARY_FIELD,
  NOTIFY_CHAT_ID,
  FIELD_NAMES,
  PENDING_GROUP_LABEL,
} from './config.js';
import { searchRecords, updateRecord, sendTextMessage, resolveOpenIdsByEmail, extractText } from './larkApi.js';

export async function fetchAllLeadRecords() {
  // Khong dung field_names de gioi han - neu 1 ten field cau hinh sai/chua
  // ton tai (vi du "Ghi chu phan loai (bot)" chua duoc tao), Lark tra loi
  // FieldNameNotFound va chan toan bo request.
  return searchRecords(LARK_BASE_APP_TOKEN, LARK_LEAD_TABLE_ID, {});
}

export function extractExistingMaKH(allRecords) {
  return allRecords.map((r) => extractText(r.fields[FIELD_NAMES.maKH])).filter(Boolean);
}

export function isPending(record) {
  return extractText(record.fields[FIELD_NAMES.nhomKH]) === PENDING_GROUP_LABEL;
}

export async function fetchNhomKHLabelToRecordId() {
  const rows = await searchRecords(LARK_BASE_APP_TOKEN, NHOM_KH_LINK_TABLE_ID, {});
  const map = {};
  for (const row of rows) {
    const label = extractText(row.fields[NHOM_KH_PRIMARY_FIELD]);
    if (label) map[label] = row.record_id;
  }
  return map;
}

export async function resolveAllEmails() {
  const emails = [];
  for (const branch of BRANCHES) {
    for (const p of [...branch.phuTrach, ...branch.lienQuan]) {
      if (p.email && !p.email.startsWith('TODO_')) emails.push(p.email);
    }
  }
  return resolveOpenIdsByEmail(emails);
}

function peopleField(people, emailToOpenId, log) {
  const ids = people
    .map((p) => emailToOpenId[p.email])
    .filter(Boolean)
    .map((id) => ({ id }));
  if (ids.length === 0) {
    log('  CANH BAO: khong tra duoc open_id cho', people.map((p) => `${p.name} <${p.email}>`).join(', '));
  }
  return ids;
}

// ctx = { dryRun, log, emailToOpenId, nhomKHLabelToRecordId, existingMaKH }
// `existingMaKH` la mang co the bi mutate (push them ma vua sinh) de tranh
// trung ma khi xu ly nhieu lead cung mot lan chay.
async function handleUnmatched(record, result, diaChi, quanTam, ctx) {
  const { dryRun, log } = ctx;
  const existingNote = extractText(record.fields[FIELD_NAMES.ghiChuBot]);
  if (existingNote === result.reason) {
    log(`Bo qua (da thong bao truoc do): ${record.record_id}`);
    return;
  }
  log(`Khong phan loai duoc lead ${record.record_id}: ${result.reason}`);
  if (dryRun) return;

  await updateRecord(LARK_BASE_APP_TOKEN, LARK_LEAD_TABLE_ID, record.record_id, {
    [FIELD_NAMES.ghiChuBot]: result.reason,
  });
  if (NOTIFY_CHAT_ID) {
    await sendTextMessage(
      NOTIFY_CHAT_ID,
      `⚠️ Lead cần phân loại thủ công (${result.reason})\nĐịa chỉ: ${diaChi || '(trống)'}\nQuan tâm: ${quanTam || '(trống)'}`,
    );
  }
}

async function handleMatched(record, result, diaChi, quanTam, ctx) {
  const { dryRun, log, emailToOpenId, nhomKHLabelToRecordId, existingMaKH } = ctx;
  const branch = BRANCHES.find((b) => b.code === result.chiNhanhCode);
  const stt = nextStt(existingMaKH, result.prefix);
  const maKH = `${result.prefix}${String(stt).padStart(4, '0')}`;
  existingMaKH.push(maKH);

  const nhomKHRecordId = nhomKHLabelToRecordId[result.nhomKHLabel];
  if (!nhomKHRecordId) {
    log(`  LOI: khong tim thay record_id cho nhom "${result.nhomKHLabel}" trong bang lien ket - bo qua lead ${record.record_id}`);
    return;
  }

  log(`Phan luong lead ${record.record_id} -> ${maKH} / ${result.chiNhanhLabel} / ${result.nhomKHLabel}`);
  if (dryRun) return;

  await updateRecord(LARK_BASE_APP_TOKEN, LARK_LEAD_TABLE_ID, record.record_id, {
    [FIELD_NAMES.maKH]: maKH,
    [FIELD_NAMES.chiNhanh]: result.chiNhanhLabel,
    [FIELD_NAMES.nhomKH]: [nhomKHRecordId],
    [FIELD_NAMES.nguoiPhuTrach]: peopleField(branch.phuTrach, emailToOpenId, log),
    [FIELD_NAMES.nguoiLienQuan]: peopleField(branch.lienQuan, emailToOpenId, log),
  });
  if (NOTIFY_CHAT_ID) {
    await sendTextMessage(
      NOTIFY_CHAT_ID,
      `🆕 Lead mới đã phân luồng: ${maKH}\nChi nhánh: ${result.chiNhanhLabel}\nNhóm KH: ${result.nhomKHLabel}\nĐịa chỉ: ${diaChi}\nQuan tâm: ${quanTam}`,
    );
  }
}

// Gom 3 fetch dung chung (map nguoi dung, map nhom KH, toan bo Ma KH hien
// co) thanh 1 ctx dung duoc cho ca quet dinh ky lan xu ly 1 lead tu
// webhook. Fetch full bang Lead moi lan goi (~vai giay voi vai nghin
// dong) - chap nhan duoc vi day la automation chay nen, khong phai thao
// tac dong bo can phan hoi tuc thi cho nguoi dung.
export async function buildCtx({ dryRun, log }) {
  const [emailToOpenId, nhomKHLabelToRecordId, allRecords] = await Promise.all([
    resolveAllEmails(),
    fetchNhomKHLabelToRecordId(),
    fetchAllLeadRecords(),
  ]);
  return {
    dryRun,
    log,
    emailToOpenId,
    nhomKHLabelToRecordId,
    existingMaKH: extractExistingMaKH(allRecords),
    allRecords,
  };
}

export async function processLead(record, ctx) {
  const diaChi = extractText(record.fields[FIELD_NAMES.diaChi]);
  const tinhThanh = extractText(record.fields[FIELD_NAMES.tinhThanh]);
  const quanTam = extractText(record.fields[FIELD_NAMES.quanTam]);
  const result = classifyLead({ diaChi, quanTam, tinhThanh });

  if (!result.matched) {
    await handleUnmatched(record, result, diaChi, quanTam, ctx);
  } else {
    await handleMatched(record, result, diaChi, quanTam, ctx);
  }
}

// Bao loi KY THUAT (exception ngoai du kien - vi du sai ten field, mat
// quyen truy cap...) qua Lark, phan biet voi truong hop "khong phan loai
// duoc" o handleUnmatched (do la nghiep vu binh thuong, da tu bao rieng).
// Khong throw tiep neu ban than viec gui thong bao cung loi - chi log.
export async function notifyProcessingError(message) {
  console.error(message);
  if (!NOTIFY_CHAT_ID) return;
  try {
    await sendTextMessage(NOTIFY_CHAT_ID, `🛑 Bot phân luồng lead gặp lỗi kỹ thuật:\n${message}`);
  } catch (err) {
    console.error('Khong gui duoc thong bao loi qua Lark:', err.message);
  }
}
