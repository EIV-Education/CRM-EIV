// Script chinh cua bot: quet cac lead dang o Nhom KH = CHO PHAN LOAI,
// phan loai va cap nhat truc tiep qua Lark Open API. Duoc goi dinh ky boi
// GitHub Actions workflow .github/workflows/lead-routing.yml.
//
// Ma KH duoc sinh tiep noi bang cach quet toan bo cot "Ma KH" da co san
// trong bang Lead (khong can bang dem phu) - tim so lon nhat cho tung
// prefix <ma nhom>-<ma chi nhanh> roi +1, giong cach nhan vien dang lam
// thu cong.
//
// "Nhom KH" la field Link (type=18) toi bang rieng, nen ghi gia tri phai
// dung record_id cua bang do (khong phai text) - xem NHOM_KH_LINK_TABLE_ID
// trong src/config.js.
//
// Chay thu an toan (khong ghi gi vao Base, chi in ra console):
//   DRY_RUN=true node scripts/poll-and-route.mjs

import { classifyLead, nextStt } from '../src/routing.js';
import {
  BRANCHES,
  LARK_BASE_APP_TOKEN,
  LARK_LEAD_TABLE_ID,
  NHOM_KH_LINK_TABLE_ID,
  NHOM_KH_PRIMARY_FIELD,
  NOTIFY_CHAT_ID,
  FIELD_NAMES,
  PENDING_GROUP_LABEL,
} from '../src/config.js';
import {
  searchRecords,
  updateRecord,
  sendTextMessage,
  resolveOpenIdsByEmail,
  extractText,
} from '../src/larkApi.js';

const DRY_RUN = process.env.DRY_RUN === 'true';

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

async function fetchAllRecords() {
  // Khong dung field_names de gioi han - neu 1 ten field cau hinh sai/chua
  // ton tai (vi du "Ghi chu phan loai (bot)" chua duoc tao), Lark tra loi
  // FieldNameNotFound va chan toan bo request. Lay full record se khong bi
  // loi nay; field khong ton tai chi don gian la undefined khi doc.
  return searchRecords(LARK_BASE_APP_TOKEN, LARK_LEAD_TABLE_ID, {});
}

async function fetchNhomKHLabelToRecordId() {
  const rows = await searchRecords(LARK_BASE_APP_TOKEN, NHOM_KH_LINK_TABLE_ID, {});
  const map = {};
  for (const row of rows) {
    const label = extractText(row.fields[NHOM_KH_PRIMARY_FIELD]);
    if (label) map[label] = row.record_id;
  }
  return map;
}

async function resolveAllEmails() {
  const emails = [];
  for (const branch of BRANCHES) {
    for (const p of [...branch.phuTrach, ...branch.lienQuan]) {
      if (p.email && !p.email.startsWith('TODO_')) emails.push(p.email);
    }
  }
  return resolveOpenIdsByEmail(emails);
}

function peopleField(people, emailToOpenId) {
  const ids = people
    .map((p) => emailToOpenId[p.email])
    .filter(Boolean)
    .map((id) => ({ id }));
  if (ids.length === 0) {
    log('  CANH BAO: khong tra duoc open_id cho', people.map((p) => `${p.name} <${p.email}>`).join(', '));
  }
  return ids;
}

async function handleUnmatched(record, result, diaChi, quanTam) {
  const existingNote = extractText(record.fields[FIELD_NAMES.ghiChuBot]);
  if (existingNote === result.reason) {
    log(`Bo qua (da thong bao truoc do): ${record.record_id}`);
    return;
  }
  log(`Khong phan loai duoc lead ${record.record_id}: ${result.reason}`);
  if (DRY_RUN) return;

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

async function handleMatched(record, result, diaChi, quanTam, existingMaKH, emailToOpenId, nhomKHLabelToRecordId) {
  const branch = BRANCHES.find((b) => b.code === result.chiNhanhCode);
  const stt = nextStt(existingMaKH, result.prefix);
  const maKH = `${result.prefix}${String(stt).padStart(4, '0')}`;
  existingMaKH.push(maKH); // danh truoc de lead tiep theo trong cung lan chay khong bi trung ma

  const nhomKHRecordId = nhomKHLabelToRecordId[result.nhomKHLabel];
  if (!nhomKHRecordId) {
    log(`  LOI: khong tim thay record_id cho nhom "${result.nhomKHLabel}" trong bang lien ket - bo qua lead ${record.record_id}`);
    return;
  }

  log(`Phan luong lead ${record.record_id} -> ${maKH} / ${result.chiNhanhLabel} / ${result.nhomKHLabel}`);
  if (DRY_RUN) return;

  await updateRecord(LARK_BASE_APP_TOKEN, LARK_LEAD_TABLE_ID, record.record_id, {
    [FIELD_NAMES.maKH]: maKH,
    [FIELD_NAMES.chiNhanh]: result.chiNhanhLabel,
    [FIELD_NAMES.nhomKH]: [nhomKHRecordId],
    [FIELD_NAMES.nguoiPhuTrach]: peopleField(branch.phuTrach, emailToOpenId),
    [FIELD_NAMES.nguoiLienQuan]: peopleField(branch.lienQuan, emailToOpenId),
  });
  if (NOTIFY_CHAT_ID) {
    await sendTextMessage(
      NOTIFY_CHAT_ID,
      `🆕 Lead mới đã phân luồng: ${maKH}\nChi nhánh: ${result.chiNhanhLabel}\nNhóm KH: ${result.nhomKHLabel}\nĐịa chỉ: ${diaChi}\nQuan tâm: ${quanTam}`,
    );
  }
}

async function main() {
  log(DRY_RUN ? 'Chay o che do DRY_RUN (khong ghi du lieu that).' : 'Bat dau quet lead cho phan loai...');

  const [emailToOpenId, nhomKHLabelToRecordId, allRecords] = await Promise.all([
    resolveAllEmails(),
    fetchNhomKHLabelToRecordId(),
    fetchAllRecords(),
  ]);

  const existingMaKH = allRecords
    .map((r) => extractText(r.fields[FIELD_NAMES.maKH]))
    .filter(Boolean);

  const pendingLeads = allRecords.filter(
    (r) => extractText(r.fields[FIELD_NAMES.nhomKH]) === PENDING_GROUP_LABEL,
  );

  log(`Tim thay ${pendingLeads.length} lead dang cho phan loai (tren tong ${allRecords.length} lead).`);

  for (const record of pendingLeads) {
    const diaChi = extractText(record.fields[FIELD_NAMES.diaChi]);
    const tinhThanh = extractText(record.fields[FIELD_NAMES.tinhThanh]);
    const quanTam = extractText(record.fields[FIELD_NAMES.quanTam]);
    const result = classifyLead({ diaChi, quanTam, tinhThanh });

    try {
      if (!result.matched) {
        await handleUnmatched(record, result, diaChi, quanTam);
      } else {
        await handleMatched(record, result, diaChi, quanTam, existingMaKH, emailToOpenId, nhomKHLabelToRecordId);
      }
    } catch (err) {
      // Khong de 1 lead loi (vi du thieu field) chan ca cac lead con lai.
      console.error(`Loi khi xu ly lead ${record.record_id}:`, err.message);
    }
  }

  log('Hoan tat.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
