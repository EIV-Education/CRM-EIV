const LARK_HOST = process.env.LARK_API_HOST || 'https://open.larksuite.com';

let cachedToken = null;
let cachedTokenExpiry = 0;

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Thieu bien moi truong ${name}`);
  return v;
}

export async function getTenantAccessToken() {
  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiry - 60_000) return cachedToken;

  const appId = requireEnv('LARK_APP_ID');
  const appSecret = requireEnv('LARK_APP_SECRET');

  const res = await fetch(`${LARK_HOST}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Khong lay duoc tenant_access_token: ${data.code} ${data.msg}`);
  }
  cachedToken = data.tenant_access_token;
  cachedTokenExpiry = now + data.expire * 1000;
  return cachedToken;
}

async function larkFetch(path, options = {}) {
  const token = await getTenantAccessToken();
  const res = await fetch(`${LARK_HOST}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Lark API loi ${options.method || 'GET'} ${path}: ${data.code} ${data.msg}`);
  }
  return data.data;
}

export async function searchRecords(appToken, tableId, body = {}) {
  let records = [];
  let pageToken;
  do {
    const qs = pageToken ? `?page_token=${encodeURIComponent(pageToken)}` : '';
    const data = await larkFetch(
      `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/search${qs}`,
      { method: 'POST', body: JSON.stringify(body) },
    );
    records = records.concat(data.items || []);
    pageToken = data.has_more ? data.page_token : undefined;
  } while (pageToken);
  return records;
}

export async function getRecord(appToken, tableId, recordId) {
  const data = await larkFetch(`/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`, {
    method: 'GET',
  });
  return data.record;
}

export async function updateRecord(appToken, tableId, recordId, fields) {
  return larkFetch(`/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`, {
    method: 'PUT',
    body: JSON.stringify({ fields }),
  });
}

export async function sendTextMessage(chatId, text) {
  return larkFetch(`/open-apis/im/v1/messages?receive_id_type=chat_id`, {
    method: 'POST',
    body: JSON.stringify({ receive_id: chatId, msg_type: 'text', content: JSON.stringify({ text }) }),
  });
}

export async function resolveOpenIdsByEmail(emails) {
  const uniq = [...new Set(emails.filter(Boolean))];
  if (uniq.length === 0) return {};
  const data = await larkFetch(`/open-apis/contact/v3/users/batch_get_id`, {
    method: 'POST',
    body: JSON.stringify({ emails: uniq, user_id_type: 'open_id' }),
  });
  const map = {};
  for (const item of data.user_list || []) {
    if (item.user_id) map[item.email] = item.user_id;
  }
  return map;
}

export function extractText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map((seg) => (typeof seg === 'string' ? seg : seg?.text || '')).join('');
  }
  if (typeof value === 'object' && 'text' in value) return value.text;
  return '';
}

// Field kieu Link (vi du "Nhom KH") tra ve dang { link_record_ids: [...] }
// (khong phai mang, khong co .text) khi record chua duoc cache display
// text - extractText() se khong doc dung cho truong hop nay. Ham nay lay
// thang danh sach record_id ma field dang tro toi, dung de so sanh theo
// ID thay vi so text (dang tin cay hon).
export function extractLinkRecordIds(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === 'string') return [item];
      if (Array.isArray(item?.link_record_ids)) return item.link_record_ids;
      if (Array.isArray(item?.record_ids)) return item.record_ids;
      return [];
    });
  }
  if (Array.isArray(value.link_record_ids)) return value.link_record_ids;
  if (Array.isArray(value.record_ids)) return value.record_ids;
  return [];
}
