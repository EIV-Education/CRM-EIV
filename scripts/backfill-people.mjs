// Vá lại cho các lead ĐÃ được bot phân luồng xong (đã có Mã KH/CHI NHÁNH)
// nhưng bị thiếu "Người phụ trách" hoặc "Người Liên Quan" - ví dụ do lúc xử
// lý, email trong config.js lúc đó không tra được open_id (rời công ty, gõ
// sai email, chưa mở Availability...), hoặc bị xoá tay sau đó. Script chỉ
// điền vào phần đang trống, dùng ĐÚNG người theo config.js HIỆN TẠI của chi
// nhánh ghi trong CHI NHÁNH của record - KHÔNG đụng tới Mã KH/CHI NHÁNH/Nhóm
// KH đã có.
//
// Mac dinh chi liet ke (khong ghi). Ghi that: DRY_RUN=false
// Chay: LARK_APP_ID=... LARK_APP_SECRET=... DRY_RUN=false node scripts/backfill-people.mjs

import { LARK_BASE_APP_TOKEN, LARK_LEAD_TABLE_ID, FIELD_NAMES, BRANCHES } from '../src/config.js';
import { searchRecords, updateRecord, extractText } from '../src/larkApi.js';
import { resolveAllEmails } from '../src/leadProcessor.js';

const DRY_RUN = (process.env.DRY_RUN ?? 'true') !== 'false';

function peopleIds(people, emailToOpenId) {
  return people
    .map((p) => emailToOpenId[p.email])
    .filter(Boolean)
    .map((id) => ({ id }));
}

function isEmptyPeopleField(value) {
  return !Array.isArray(value) || value.length === 0;
}

async function main() {
  const [emailToOpenId, allRecords] = await Promise.all([
    resolveAllEmails(),
    searchRecords(LARK_BASE_APP_TOKEN, LARK_LEAD_TABLE_ID, {}),
  ]);

  console.log(`Da tai ${allRecords.length} record. DRY_RUN=${DRY_RUN}\n`);

  let checked = 0;
  let fixed = 0;

  for (const record of allRecords) {
    const maKH = extractText(record.fields[FIELD_NAMES.maKH]);
    if (!maKH) continue; // chua duoc bot xu ly - bo qua, khong phai doi tuong backfill

    const chiNhanhLabel = extractText(record.fields[FIELD_NAMES.chiNhanh]);
    const branch = BRANCHES.find((b) => b.label === chiNhanhLabel);
    if (!branch) {
      console.log(`BO QUA ${record.record_id} (${maKH}): CHI NHANH "${chiNhanhLabel}" khong khop config.js`);
      continue;
    }

    checked += 1;
    const missingPhuTrach = isEmptyPeopleField(record.fields[FIELD_NAMES.nguoiPhuTrach]);
    const missingLienQuan = isEmptyPeopleField(record.fields[FIELD_NAMES.nguoiLienQuan]);
    if (!missingPhuTrach && !missingLienQuan) continue;

    const patch = {};
    if (missingPhuTrach) {
      const ids = peopleIds(branch.phuTrach, emailToOpenId);
      if (ids.length > 0) patch[FIELD_NAMES.nguoiPhuTrach] = ids;
    }
    if (missingLienQuan) {
      const ids = peopleIds(branch.lienQuan, emailToOpenId);
      if (ids.length > 0) patch[FIELD_NAMES.nguoiLienQuan] = ids;
    }

    if (Object.keys(patch).length === 0) {
      console.log(`KHONG SUA DUOC ${record.record_id} (${maKH}, ${chiNhanhLabel}): thieu ${missingPhuTrach ? 'Nguoi phu trach' : ''} ${missingLienQuan ? 'Nguoi Lien Quan' : ''} nhung khong tra duoc open_id cho nguoi trong config hien tai`);
      continue;
    }

    const ten = extractText(record.fields['Tên Khách Hàng']);
    console.log(
      `${DRY_RUN ? '[DRY RUN] SE SUA' : 'DANG SUA'} ${record.record_id} (${maKH}, ${chiNhanhLabel}, "${ten}"): ` +
        Object.keys(patch)
          .map((k) => `${k} <- ${JSON.stringify(patch[k])}`)
          .join('; '),
    );
    fixed += 1;

    if (!DRY_RUN) {
      await updateRecord(LARK_BASE_APP_TOKEN, LARK_LEAD_TABLE_ID, record.record_id, patch);
    }
  }

  console.log(`\nDa kiem tra ${checked} lead da phan luong. ${fixed} lead ${DRY_RUN ? 'can' : 'da'} duoc vá Nguoi phu trach/Nguoi Lien Quan.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
