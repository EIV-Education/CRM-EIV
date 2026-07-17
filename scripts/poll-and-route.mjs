// Quet dinh ky (chay boi GitHub Actions cron) cac lead dang o Nhom KH =
// CHO PHAN LOAI va phan luong. Day la lop du phong - nguon xu ly chinh,
// gan tuc thi, la api/webhook.js nhan webhook truc tiep tu Lark Base
// Automation khi co lead moi (xem README). Giu ca 2 an toan vi logic
// idempotent: lead da xu ly se khong con match dieu kien CHO PHAN LOAI.
//
// Chay thu an toan (khong ghi gi vao Base, chi in ra console):
//   DRY_RUN=true node scripts/poll-and-route.mjs

import { buildCtx, isPending, processLead, notifyProcessingError } from '../src/leadProcessor.js';

const DRY_RUN = process.env.DRY_RUN === 'true';

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

async function main() {
  log(DRY_RUN ? 'Chay o che do DRY_RUN (khong ghi du lieu that).' : 'Bat dau quet lead cho phan loai...');

  const ctx = await buildCtx({ dryRun: DRY_RUN, log });
  const pendingLeads = ctx.allRecords.filter((r) => isPending(r, ctx.nhomKHLabelToRecordId));

  log(`Tim thay ${pendingLeads.length} lead dang cho phan loai (tren tong ${ctx.allRecords.length} lead).`);

  const failures = [];
  for (const record of pendingLeads) {
    try {
      await processLead(record, ctx);
    } catch (err) {
      // Khong de 1 lead loi (vi du thieu field) chan ca cac lead con lai.
      console.error(`Loi khi xu ly lead ${record.record_id}:`, err.message);
      failures.push(`- ${record.record_id}: ${err.message}`);
    }
  }

  // Gom tat ca loi ky thuat cua lan quet nay thanh 1 thong bao duy nhat,
  // tranh spam Lark neu nhieu lead cung gap 1 loi (vi du thieu field).
  if (failures.length > 0 && !DRY_RUN) {
    const preview = failures.slice(0, 5).join('\n');
    const more = failures.length > 5 ? `\n...va ${failures.length - 5} lead khac.` : '';
    await notifyProcessingError(`${failures.length} lead loi khi quet dinh ky:\n${preview}${more}`);
  }

  log('Hoan tat.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
