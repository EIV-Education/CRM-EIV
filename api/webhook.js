// Vercel serverless function - nhan webhook tu action "Gui HTTP request"
// cua Lark Base Automation moi khi co lead moi (Nhom KH = CHO PHAN LOAI),
// xu ly gan nhu tuc thi thay vi cho lich quet 5 phut cua GitHub Actions.
//
// Cau hinh trong Lark Base Automation (xem README muc "Webhook tuc thi"):
//   - Trigger: ban ghi duoc them moi trong bang Lead, dieu kien
//     Nhom KH = CHO PHAN LOAI.
//   - Action: Gui HTTP request (POST) toi URL deploy cua endpoint nay,
//     vi du https://<project>.vercel.app/api/webhook?token=<WEBHOOK_SECRET>,
//     body JSON: { "record_id": "{{record_id cua ban ghi trigger}}" }.
//
// Bien moi truong can co tren Vercel: LARK_APP_ID, LARK_APP_SECRET,
// LARK_NOTIFY_CHAT_ID (tuy chon, co gia tri mac dinh trong config.js),
// WEBHOOK_SECRET (tu dat, dung de xac thuc request goi den, tranh nguoi
// la biet URL roi goi lung tung).

import { getRecord } from '../src/larkApi.js';
import { LARK_BASE_APP_TOKEN, LARK_LEAD_TABLE_ID } from '../src/config.js';
import { buildCtx, isPending, processLead } from '../src/leadProcessor.js';

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Chi ho tro POST' });
    return;
  }

  const expectedToken = process.env.WEBHOOK_SECRET;
  if (!expectedToken) {
    res.status(500).json({ error: 'Server chua cau hinh WEBHOOK_SECRET' });
    return;
  }
  const givenToken = req.query?.token || req.headers['x-webhook-token'];
  if (givenToken !== expectedToken) {
    res.status(401).json({ error: 'Sai hoac thieu token xac thuc' });
    return;
  }

  const recordId = req.body?.record_id;
  if (!recordId) {
    res.status(400).json({ error: 'Thieu record_id trong body' });
    return;
  }

  try {
    const record = await getRecord(LARK_BASE_APP_TOKEN, LARK_LEAD_TABLE_ID, recordId);
    if (!record) {
      res.status(404).json({ error: 'Khong tim thay record' });
      return;
    }
    if (!isPending(record)) {
      log(`Lead ${recordId} da duoc xu ly truoc do, bo qua.`);
      res.status(200).json({ ok: true, skipped: true });
      return;
    }

    const ctx = await buildCtx({ dryRun: false, log });
    await processLead(record, ctx);

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
