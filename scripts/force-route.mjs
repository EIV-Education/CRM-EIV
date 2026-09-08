// Xu ly TAY 1 lead cu the: force chi nhanh (bo qua matchBranch, vi Dia chi
// khong co ten dia danh - vi du "vi tri khach gui qua Google Maps") nhung
// van dung matchGroup binh thuong cho Mo ta. Dung khi nguoi dung xac nhan
// "lead nay o <chi nhanh>" ma dia chi khong the doan duoc bang quy tac
// chung (khong nen sua config.js cho 1 truong hop rieng le).
//
// Chay: LARK_APP_ID=... node scripts/force-route.mjs <record_id> <branch_code>
// vi du: node scripts/force-route.mjs recvXXXXXXXX EIV_HCM

import { LARK_BASE_APP_TOKEN, LARK_LEAD_TABLE_ID, FIELD_NAMES, BRANCHES } from '../src/config.js';
import { matchGroup, nextStt } from '../src/routing.js';
import { searchRecords, updateRecord, extractText } from '../src/larkApi.js';
import { resolveAllEmails, fetchNhomKHLabelToRecordId, extractExistingMaKH, extractLinkRecordIds } from '../src/leadProcessor.js';
import { PENDING_GROUP_LABEL } from '../src/config.js';

function peopleIds(people, emailToOpenId) {
  return people
    .map((p) => emailToOpenId[p.email])
    .filter(Boolean)
    .map((id) => ({ id }));
}

async function main() {
  const recordId = process.argv[2];
  const branchCode = process.argv[3];
  if (!recordId || !branchCode) {
    console.error('Cach dung: node scripts/force-route.mjs <record_id> <branch_code>');
    console.error('Cac branch_code hop le:', BRANCHES.map((b) => b.code).join(', '));
    process.exit(1);
  }

  const branch = BRANCHES.find((b) => b.code === branchCode);
  if (!branch) {
    console.error(`Khong tim thay branch_code "${branchCode}" trong config.js`);
    process.exit(1);
  }

  const [emailToOpenId, nhomKHLabelToRecordId, allRecords] = await Promise.all([
    resolveAllEmails(),
    fetchNhomKHLabelToRecordId(),
    searchRecords(LARK_BASE_APP_TOKEN, LARK_LEAD_TABLE_ID, {}),
  ]);

  const record = allRecords.find((r) => r.record_id === recordId);
  if (!record) {
    console.error(`Khong tim thay record_id "${recordId}"`);
    process.exit(1);
  }

  const pendingId = nhomKHLabelToRecordId[PENDING_GROUP_LABEL];
  const isPending = pendingId && extractLinkRecordIds(record.fields[FIELD_NAMES.nhomKH]).includes(pendingId);
  if (!isPending) {
    console.error(`Record ${recordId} khong con o trang thai CHO PHAN LOAI - dung lai de tranh ghi nham.`);
    process.exit(1);
  }

  const quanTam = extractText(record.fields[FIELD_NAMES.quanTam]);
  const group = matchGroup(quanTam);
  if (!group) {
    console.error(`Khong xac dinh duoc Nhom KH tu Mo ta: "${quanTam}" - dung lai, can sua matchGroup truoc.`);
    process.exit(1);
  }

  const nhomKHRecordId = nhomKHLabelToRecordId[group.label];
  if (!nhomKHRecordId) {
    console.error(`Khong tim thay record_id cho nhom "${group.label}" trong bang lien ket.`);
    process.exit(1);
  }

  const existingMaKH = extractExistingMaKH(allRecords);
  const prefix = `${group.maNhom}-${branch.maChiNhanh}`;
  const stt = nextStt(existingMaKH, prefix);
  const maKH = `${prefix}${String(stt).padStart(4, '0')}`;

  console.log(`Se ghi record ${recordId}: Ma KH=${maKH}, CHI NHANH=${branch.label}, Nhom KH=${group.label}`);

  await updateRecord(LARK_BASE_APP_TOKEN, LARK_LEAD_TABLE_ID, recordId, {
    [FIELD_NAMES.maKH]: maKH,
    [FIELD_NAMES.chiNhanh]: branch.label,
    [FIELD_NAMES.nhomKH]: [nhomKHRecordId],
    [FIELD_NAMES.nguoiPhuTrach]: peopleIds(branch.phuTrach, emailToOpenId),
    [FIELD_NAMES.nguoiLienQuan]: peopleIds(branch.lienQuan, emailToOpenId),
  });

  console.log('Da ghi xong.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
