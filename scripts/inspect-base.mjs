// Chay 1 lan de kiem tra: app da co quyen truy cap Base chua, ten cac
// truong trong bang Lead co dung nhu config.js khong, va cac option cua
// truong Single Select "Nhom KH"/"Chi nhanh".
//
// Chay: LARK_APP_ID=... LARK_APP_SECRET=... node scripts/inspect-base.mjs

import { LARK_BASE_APP_TOKEN, LARK_LEAD_TABLE_ID } from '../src/config.js';

const LARK_HOST = process.env.LARK_API_HOST || 'https://open.larksuite.com';

async function getTenantAccessToken() {
  const res = await fetch(`${LARK_HOST}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      app_id: process.env.LARK_APP_ID,
      app_secret: process.env.LARK_APP_SECRET,
    }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(`${data.code} ${data.msg}`);
  return data.tenant_access_token;
}

async function main() {
  const token = await getTenantAccessToken();
  const headers = { Authorization: `Bearer ${token}` };

  console.log(`Kiem tra bang Lead (table_id=${LARK_LEAD_TABLE_ID})...\n`);

  const res = await fetch(
    `${LARK_HOST}/open-apis/bitable/v1/apps/${LARK_BASE_APP_TOKEN}/tables/${LARK_LEAD_TABLE_ID}/fields?page_size=100`,
    { headers },
  );
  const data = await res.json();
  if (data.code !== 0) {
    console.error(`Loi ${data.code}: ${data.msg}`);
    console.error('Neu la loi quyen truy cap, kiem tra: da them App nay vao Base chua (nut Chia se / Them thanh vien trong Base, tim ten App).');
    process.exit(1);
  }

  const linkFields = [];
  for (const field of data.data.items || []) {
    console.log(`- ${field.field_name} (type=${field.type})`);
    if (field.property?.options) {
      console.log(`    options: ${field.property.options.map((o) => o.name).join(', ')}`);
    }
    if (field.type === 18) {
      console.log(`    property: ${JSON.stringify(field.property)}`);
      linkFields.push(field);
    }
    if (field.type === 11) {
      // Field Person - can biet co cho phep chon nhieu nguoi khong
      // (multiple:false thi chi ghi duoc 1 nguoi, ghi 2+ se bi loi/bo qua).
      console.log(`    property: ${JSON.stringify(field.property)}`);
    }
  }

  for (const field of linkFields) {
    const linkedTableId = field.property?.table_id;
    if (!linkedTableId) continue;
    console.log(`\nBang lien ket cua field "${field.field_name}" (table_id=${linkedTableId}):`);
    const linkedRes = await fetch(
      `${LARK_HOST}/open-apis/bitable/v1/apps/${LARK_BASE_APP_TOKEN}/tables/${linkedTableId}/records?page_size=100`,
      { headers },
    );
    const linkedData = await linkedRes.json();
    if (linkedData.code !== 0) {
      console.error(`  Loi ${linkedData.code}: ${linkedData.msg}`);
      continue;
    }
    for (const rec of linkedData.data.items || []) {
      console.log(`  record_id=${rec.record_id} fields=${JSON.stringify(rec.fields)}`);
    }
  }

  console.log('\nDoi chieu danh sach tren voi src/config.js (FIELD_NAMES, GROUPS[].label, BRANCHES[].label) va sua cho khop.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
