// Script chinh cua bot: quet cac lead dang o Nhom KH = CHO PHAN LOAI,
// phan loai va cap nhat truc tiep qua Lark Open API. Duoc goi dinh ky boi
// GitHub Actions workflow .github/workflows/lead-routing.yml (xem README
// muc "Trien khai bang GitHub Actions").
//
// Chay thu an toan (khong ghi gi vao Base, chi in ra console):
//   DRY_RUN=true node scripts/poll-and-route.mjs

import { classifyLead } from '../src/routing.js';
import { BRANCHES, LARK_BASE_APP_TOKEN, LARK_LEAD_TABLE_ID, COUNTER_TABLE_NAME, NOTIFY_CHAT_ID, FIELD_NAMES, PENDING_GROUP_LABEL } from '../src/config.js';
import {
  searchRecords,
  updateRecord,
  createRecord,
  listTables,
  sendTextMessage,
  resolveOpenIdsByEmail,
  extractText,
} from '../src/larkApi.js';

const DRY_RUN = process.env.DRY_RUN === 'true';

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

async function findCounterTableId() {
  const tables = await listTables(LARK_BASE_APP_TOKEN);
  const found = tables.find((t) => t.name === COUNTER_TABLE_NAME);
  if (!found) {
    throw new Error(
      `Khong tim thay bang "${COUNTER_TABLE_NAME}". Tao thu cong 1 lan trong Base voi 2 cot Key (Text) va STT (Number) - xem README.`,
    );
  }
  return found.table_id;
}

async function getNextStt(counterTableId, prefix) {
  const rows = await searchRecords(LARK_BASE_APP_TOKEN, counterTableId, {
    conjunction: 'and',
    conditions: [{ field_name: 'Key', operator: 'is', value: [prefix] }],
  });

  if (rows.length === 0) {
    if (!DRY_RUN) {
      await createRecord(LARK_BASE_APP_TOKEN, counterTableId, { Key: prefix, STT: 1 });
    }
    return 1;
  }

  const row = rows[0];
  const current = Number(row.fields.STT) || 0;
  const next = current + 1;
  if (!DRY_RUN) {
    await updateRecord(LARK_BASE_APP_TOKEN, counterTableId, row.record_id, { STT: next });
  }
  return next;
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

async function main() {
  log(DRY_RUN ? 'Chay o che do DRY_RUN (khong ghi du lieu that).' : 'Bat dau quet lead cho phan loai...');

  const counterTableId = await findCounterTableId();
  const emailToOpenId = await resolveAllEmails();

  const pendingLeads = await searchRecords(LARK_BASE_APP_TOKEN, LARK_LEAD_TABLE_ID, {
    conjunction: 'and',
    conditions: [{ field_name: FIELD_NAMES.nhomKH, operator: 'is', value: [PENDING_GROUP_LABEL] }],
  });

  log(`Tim thay ${pendingLeads.length} lead dang cho phan loai.`);

  for (const record of pendingLeads) {
    const diaChi = extractText(record.fields[FIELD_NAMES.diaChi]);
    const quanTam = extractText(record.fields[FIELD_NAMES.quanTam]);
    const result = classifyLead({ diaChi, quanTam });

    if (!result.matched) {
      const existingNote = extractText(record.fields[FIELD_NAMES.ghiChuBot]);
      if (existingNote === result.reason) {
        log(`Bo qua (da thong bao truoc do): ${record.record_id}`);
        continue;
      }
      log(`Khong phan loai duoc lead ${record.record_id}: ${result.reason}`);
      if (!DRY_RUN) {
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
      continue;
    }

    const branch = BRANCHES.find((b) => b.code === result.chiNhanhCode);
    const stt = await getNextStt(counterTableId, result.prefix);
    const maKH = `${result.prefix}${String(stt).padStart(4, '0')}`;

    log(`Phan luong lead ${record.record_id} -> ${maKH} / ${result.chiNhanhLabel} / ${result.nhomKHLabel}`);

    if (!DRY_RUN) {
      await updateRecord(LARK_BASE_APP_TOKEN, LARK_LEAD_TABLE_ID, record.record_id, {
        [FIELD_NAMES.maKH]: maKH,
        [FIELD_NAMES.chiNhanh]: result.chiNhanhLabel,
        [FIELD_NAMES.nhomKH]: result.nhomKHLabel,
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
  }

  log('Hoan tat.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
