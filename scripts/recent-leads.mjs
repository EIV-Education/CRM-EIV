// Liet ke N lead moi tao gan day nhat (sap xep theo "Ngay tao" giam dan),
// kem trang thai isPending va cac truong quan trong - dung de tra loi
// nhanh "lead moi nhat co bi ket khong, vi sao".
//
// Chay: LARK_APP_ID=... node scripts/recent-leads.mjs [so_luong=10]

import { LARK_BASE_APP_TOKEN, LARK_LEAD_TABLE_ID, FIELD_NAMES } from '../src/config.js';
import { searchRecords, extractLinkRecordIds, extractText } from '../src/larkApi.js';
import { isPending, fetchNhomKHLabelToRecordId } from '../src/leadProcessor.js';

const n = parseInt(process.argv[2] || '10', 10);

async function main() {
  const [all, nhomKHLabelToRecordId] = await Promise.all([
    searchRecords(LARK_BASE_APP_TOKEN, LARK_LEAD_TABLE_ID, {}),
    fetchNhomKHLabelToRecordId(),
  ]);

  const sorted = all
    .filter((r) => typeof r.fields['Ngày tạo'] === 'number')
    .sort((a, b) => b.fields['Ngày tạo'] - a.fields['Ngày tạo'])
    .slice(0, n);

  console.log(`${n} lead moi tao gan day nhat (tren tong ${all.length} lead):\n`);

  for (const r of sorted) {
    const ten = extractText(r.fields['Tên Khách Hàng']);
    const dt = extractText(r.fields['Điện thoại']);
    const diaChi = extractText(r.fields[FIELD_NAMES.diaChi]);
    const tinhThanh = extractText(r.fields[FIELD_NAMES.tinhThanh]);
    const quanTam = extractText(r.fields[FIELD_NAMES.quanTam]);
    const maKH = extractText(r.fields[FIELD_NAMES.maKH]);
    const nhomKHIds = extractLinkRecordIds(r.fields[FIELD_NAMES.nhomKH]);
    const pending = isPending(r, nhomKHLabelToRecordId);
    const ngayTao = new Date(r.fields['Ngày tạo']).toISOString();

    console.log(`record_id=${r.record_id} | Ngay tao=${ngayTao}`);
    console.log(`  Ten="${ten}" | SDT="${dt}"`);
    console.log(`  Dia chi="${diaChi}" | Tinh/Thanh="${tinhThanh}"`);
    console.log(`  Quan tam="${quanTam}"`);
    console.log(`  Ma KH="${maKH}" | Nhom KH link_record_ids=${JSON.stringify(nhomKHIds)} | isPending=${pending}`);
    console.log('---');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
