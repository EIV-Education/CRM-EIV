// Kiem tra rieng buoc tra open_id tu email (Contact API) - dung de chan
// doan xem "Nguoi phu trach"/"Nguoi Lien Quan" khong duoc gan la do quyen
// API hay do email cau hinh sai, tach biet voi phan phan loai/ghi Base.
//
// Chay: LARK_APP_ID=... LARK_APP_SECRET=... node scripts/check-emails.mjs

import { BRANCHES } from '../src/config.js';
import { resolveOpenIdsByEmail } from '../src/larkApi.js';

async function main() {
  const allPeople = [];
  for (const branch of BRANCHES) {
    for (const p of [...branch.phuTrach, ...branch.lienQuan]) {
      allPeople.push({ ...p, branch: branch.label });
    }
  }

  const emails = allPeople.map((p) => p.email).filter((e) => e && !e.startsWith('TODO_'));
  console.log(`Dang tra ${emails.length} email qua Contact API...\n`);

  let map;
  try {
    map = await resolveOpenIdsByEmail(emails);
  } catch (err) {
    console.error('LOI KHI GOI CONTACT API (rat co the do thieu quyen):', err.message);
    process.exit(1);
  }

  console.log('Ket qua:\n');
  let missing = 0;
  for (const p of allPeople) {
    const openId = map[p.email];
    if (openId) {
      console.log(`  OK   ${p.name} (${p.branch}) <${p.email}> -> ${openId}`);
    } else {
      missing++;
      console.log(`  MISS ${p.name} (${p.branch}) <${p.email}> -> KHONG TRA DUOC`);
    }
  }

  console.log(`\n${emails.length - missing}/${emails.length} email tra duoc open_id.`);
  if (missing > 0) {
    console.log('\nCac email "MISS" co the do: (1) sai chinh ta so voi email that tren Lark,');
    console.log('(2) App chua co quyen contact du de tra id theo email, hoac quyen chua duoc');
    console.log('publish/kich hoat, (3) nguoi do khong thuoc cung to chuc/tenant Lark nay.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
