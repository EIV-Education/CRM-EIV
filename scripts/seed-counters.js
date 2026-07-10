// Cong cu chay local (khong dung Lark API) de tinh STT khoi diem cho tung
// cap Nhom KH + Chi nhanh, dung 1 lan khi khoi tao bang "STT Counters".
//
// Cach dung:
//   1. Trong Lark Base, mo cot "Ma KH" cua bang Lead, copy toan bo gia tri
//      (moi dong 1 ma) dan vao 1 file .txt, vi du ma-kh-hien-tai.txt
//   2. Chay: node scripts/seed-counters.js ma-kh-hien-tai.txt
//   3. Ket qua in ra la danh sach "Key" + "STT hien tai" - nhap thu cong
//      cac dong nay vao bang "STT Counters" trong Base (xem README).
//
// Neu bang chua co Ma KH nao, khong can chay script nay - tao truc tiep
// cac dong trong "STT Counters" voi STT hien tai = 0.

import { readFileSync } from 'node:fs';

const path = process.argv[2];
if (!path) {
  console.error('Cach dung: node scripts/seed-counters.js <duong-dan-file-ma-kh.txt>');
  process.exit(1);
}

const lines = readFileSync(path, 'utf8')
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean);

const maxByPrefix = new Map();
const re = /^([A-Z0-9-]+)-(\d{2})(\d{4,})$/;

for (const line of lines) {
  const m = line.match(re);
  if (!m) {
    console.warn(`Bo qua dong khong dung dinh dang: "${line}"`);
    continue;
  }
  const prefix = `${m[1]}-${m[2]}`;
  const stt = parseInt(m[3], 10);
  const current = maxByPrefix.get(prefix) || 0;
  if (stt > current) maxByPrefix.set(prefix, stt);
}

console.log('Key\tSTT hien tai');
for (const [prefix, stt] of [...maxByPrefix.entries()].sort()) {
  console.log(`${prefix}\t${stt}`);
}
