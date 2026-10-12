// Doi lai Nhom KH (va sinh lai Ma KH theo prefix moi) cho 1 lead DA duoc
// bot xu ly truoc do - dung khi phat hien 1 bug phan loai SAI o Mo ta sau
// khi lead da co Ma KH (khac voi force-route.mjs, chi dung cho lead CON
// dang CHO PHAN LOAI). Khong dong tới CHI NHANH/Nguoi phu trach/Nguoi
// Lien Quan - gia dinh branch van dung, chi Nhom KH bi sai.
//
// Chay: node scripts/reclassify-group.mjs <record_id> <group_code>
// vi du: node scripts/reclassify-group.mjs recvXXXXXXXX DOANH_NGHIEP

import { LARK_BASE_APP_TOKEN, LARK_LEAD_TABLE_ID, FIELD_NAMES, BRANCHES, GROUPS } from '../src/config.js';
import { nextStt } from '../src/routing.js';
import { searchRecords, updateRecord, extractText } from '../src/larkApi.js';
import { extractExistingMaKH } from '../src/leadProcessor.js';

async function main() {
  const recordId = process.argv[2];
  const groupCode = process.argv[3];
  if (!recordId || !groupCode) {
    console.error('Cach dung: node scripts/reclassify-group.mjs <record_id> <group_code>');
    console.error('Cac group_code hop le:', GROUPS.map((g) => g.code).join(', '));
    process.exit(1);
  }

  const group = GROUPS.find((g) => g.code === groupCode);
  if (!group) {
    console.error(`Khong tim thay group_code "${groupCode}" trong config.js`);
    process.exit(1);
  }

  const allRecords = await searchRecords(LARK_BASE_APP_TOKEN, LARK_LEAD_TABLE_ID, {});
  const record = allRecords.find((r) => r.record_id === recordId);
  if (!record) {
    console.error(`Khong tim thay record_id "${recordId}"`);
    process.exit(1);
  }

  const chiNhanhLabel = extractText(record.fields[FIELD_NAMES.chiNhanh]);
  const branch = BRANCHES.find((b) => b.label === chiNhanhLabel);
  if (!branch) {
    console.error(`Khong xac dinh duoc branch tu CHI NHANH hien tai "${chiNhanhLabel}" - dung lai.`);
    process.exit(1);
  }

  const oldMaKH = extractText(record.fields[FIELD_NAMES.maKH]);
  const existingMaKH = extractExistingMaKH(allRecords).filter((m) => m !== oldMaKH);
  const prefix = `${group.maNhom}-${branch.maChiNhanh}`;
  const stt = nextStt(existingMaKH, prefix);
  const newMaKH = `${prefix}${String(stt).padStart(4, '0')}`;

  console.log(`Record ${recordId}: Ma KH "${oldMaKH}" -> "${newMaKH}", Nhom KH -> "${group.label}" (CHI NHANH giu nguyen "${chiNhanhLabel}")`);

  await updateRecord(LARK_BASE_APP_TOKEN, LARK_LEAD_TABLE_ID, recordId, {
    [FIELD_NAMES.maKH]: newMaKH,
    [FIELD_NAMES.nhomKH]: group.label,
  });

  console.log('Da ghi xong.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
