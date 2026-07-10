// Chay 1 lan de lay chat_id cua nhom Lark ma bot (Lark App) da duoc them
// vao, dung cho bien moi truong LARK_NOTIFY_CHAT_ID.
//
// Truoc khi chay: vao nhom Lark muon nhan thong bao, them App (bot) vua
// tao vao nhom do (giong them 1 thanh vien binh thuong).
//
// Chay: LARK_APP_ID=... LARK_APP_SECRET=... node scripts/list-chats.mjs

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
  const res = await fetch(`${LARK_HOST}/open-apis/im/v1/chats?page_size=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(`${data.code} ${data.msg}`);

  console.log('Danh sach nhom bot dang la thanh vien:\n');
  for (const chat of data.data.items || []) {
    console.log(`${chat.chat_id}\t${chat.name}`);
  }
  if (!data.data.items?.length) {
    console.log('(Chua co nhom nao - hay them App vao 1 nhom Lark truoc.)');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
