// Lay 1 lead theo dung record_id (GET truc tiep, khong can fetch/lap toan
// bo bang Lead nhu find-lead.mjs) - dung de debug nhanh khi da co san
// record_id (vi du tu link Lark hoac tin nhan thong bao).
//
// Chay: LARK_APP_ID=... LARK_APP_SECRET=... node scripts/get-lead.mjs <record_id>

import { LARK_BASE_APP_TOKEN, LARK_LEAD_TABLE_ID, FIELD_NAMES, PENDING_GROUP_LABEL } from '../src/config.js';
import { getRecord, extractText } from '../src/larkApi.js';
import { classifyLead } from '../src/routing.js';

const recordId = process.argv[2];
if (!recordId) {
  console.error('Cach dung: node scripts/get-lead.mjs <record_id>');
  process.exit(1);
}

async function main() {
  const record = await getRecord(LARK_BASE_APP_TOKEN, LARK_LEAD_TABLE_ID, recordId);
  if (!record) {
    console.error(`Khong tim thay record_id "${recordId}"`);
    process.exit(1);
  }

  console.log('RAW fields:', JSON.stringify(record.fields, null, 2));
  console.log('---');

  const diaChi = extractText(record.fields[FIELD_NAMES.diaChi]);
  const tinhThanh = extractText(record.fields[FIELD_NAMES.tinhThanh]);
  const quanTam = extractText(record.fields[FIELD_NAMES.quanTam]);
  const nhomKH = extractText(record.fields[FIELD_NAMES.nhomKH]);
  const isPending = nhomKH === PENDING_GROUP_LABEL;

  console.log(`Dia chi="${diaChi}" | Tinh/Thanh="${tinhThanh}"`);
  console.log(`Quan tam="${quanTam}"`);
  console.log(`Nhom KH hien tai="${nhomKH}" | isPending=${isPending}`);
  console.log('---');

  const result = classifyLead({ diaChi, quanTam, tinhThanh });
  console.log('classifyLead() =', JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
