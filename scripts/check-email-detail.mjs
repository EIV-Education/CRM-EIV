// Tra chi tiet 1 email qua Contact API (GET /users/{email}?user_id_type=email)
// thay vi batch_get_id - endpoint nay tra ve code/msg loi cu the (vi du
// "user not in app scope"), giup phan biet: (1) email sai/khong ton tai
// trong tenant Lark, hay (2) email dung nhung tai khoan chua nam trong
// Pham vi kha dung (Availability) cua App.
//
// Chay: LARK_APP_ID=... LARK_APP_SECRET=... node scripts/check-email-detail.mjs "<email>"

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
  const email = process.argv[2];
  if (!email) {
    console.error('Cach dung: node scripts/check-email-detail.mjs "<email>"');
    process.exit(1);
  }

  const token = await getTenantAccessToken();
  const headers = { Authorization: `Bearer ${token}` };

  console.log(`Tra chi tiet email "${email}" qua GET /users/{email}?user_id_type=email:\n`);
  const res1 = await fetch(
    `${LARK_HOST}/open-apis/contact/v3/users/${encodeURIComponent(email)}?user_id_type=email`,
    { headers },
  );
  const data1 = await res1.json();
  console.log('  HTTP status:', res1.status);
  console.log('  Response:', JSON.stringify(data1, null, 2));

  console.log(`\nTra qua batch_get_id (nhu peopleField dung that):\n`);
  const res2 = await fetch(`${LARK_HOST}/open-apis/contact/v3/users/batch_get_id`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ emails: [email], user_id_type: 'open_id' }),
  });
  const data2 = await res2.json();
  console.log('  HTTP status:', res2.status);
  console.log('  Response:', JSON.stringify(data2, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
