// Tim 1 lead theo Ten Khach Hang (hoac 1 phan text) va in RAW toan bo
// fields cua no - dung de debug truong hop bot khong nhan dien duoc 1
// record cu the du no hien dung tren Lark UI.
//
// Chay: LARK_APP_ID=... LARK_APP_SECRET=... node scripts/find-lead.mjs "<tu khoa>"

import { LARK_BASE_APP_TOKEN, LARK_LEAD_TABLE_ID, FIELD_NAMES, PENDING_GROUP_LABEL } from '../src/config.js';
import { searchRecords, extractLinkRecordIds } from '../src/larkApi.js';
import { isPending, fetchNhomKHLabelToRecordId } from '../src/leadProcessor.js';

const keyword = process.argv[2];
if (!keyword) {
  console.error('Cach dung: node scripts/find-lead.mjs "<tu khoa trong So dien thoai hoac Ten Khach Hang>"');
  process.exit(1);
}

async function main() {
  const [all, nhomKHLabelToRecordId] = await Promise.all([
    searchRecords(LARK_BASE_APP_TOKEN, LARK_LEAD_TABLE_ID, {}),
    fetchNhomKHLabelToRecordId(),
  ]);
  console.log(`Da tai ${all.length} record. Dang tim theo tu khoa "${keyword}"...\n`);

  const matches = all.filter((r) => JSON.stringify(r.fields).includes(keyword));
  console.log(`Tim thay ${matches.length} record khop.\n`);

  for (const r of matches) {
    console.log(`record_id = ${r.record_id}`);
    console.log('RAW fields:', JSON.stringify(r.fields, null, 2));
    console.log('---');
    console.log('extractLinkRecordIds(Nhom KH) =', JSON.stringify(extractLinkRecordIds(r.fields[FIELD_NAMES.nhomKH])));
    console.log('record_id cua PENDING_GROUP_LABEL =', JSON.stringify(nhomKHLabelToRecordId[PENDING_GROUP_LABEL]));
    console.log('isPending(record) =', isPending(r, nhomKHLabelToRecordId));
    console.log('===\n');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
