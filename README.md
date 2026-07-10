# Bot phân luồng lead CRM trên Lark Base (EIV Education)

Bot tự động đọc lead mới (Nhóm KH = `CHỜ PHÂN LOẠI`) trong bảng Lead trên
Lark Base, phân loại Chi nhánh + Nhóm KH, sinh Mã KH, gán Người phụ
trách/Người liên quan, và gửi thông báo trên Lark — **chạy hoàn toàn tự
động, không cần bấm tay trong Lark mỗi khi có lead mới.**

Có 2 cách triển khai trong repo này:

- **Cách A — GitHub Actions (khuyến nghị, mặc định của repo này):** một
  script Node chạy định kỳ mỗi 5 phút trên GitHub, gọi thẳng Lark Open API
  để đọc/ghi record và gửi tin nhắn. Không cần cấu hình Automation trong
  Lark Base. Xem mục 1-4.
- **Cách B — Lark Base Automation (không cần server, nhưng cần bấm tay
  cấu hình 1 lần trong Lark):** dùng action "Run script" + rẽ nhánh có sẵn
  của Lark Base. Xem mục 5 (Phụ lục).

## 0. Việc cần bạn làm 1 lần trước khi bot chạy được (không tránh được)

Đây là các bước bắt buộc phải thao tác thủ công trên Lark — không nền tảng
nào (kể cả Claude) có thể làm thay qua API, vì đây là bước cấp quyền/định
danh ban đầu:

1. **Tạo Lark Custom App** trên Lark Developer Console (đã có: App ID
   `cli_aab0e555bff85eea`). Cấp các quyền (Permissions/Scopes):
   - `bitable:app` (đọc & ghi Bitable)
   - `im:message` / `im:message:send_as_bot` (gửi tin nhắn)
   - `contact:user.email:readonly` hoặc quyền tương đương để tra open_id
     theo email (dùng batch_get_id)
2. **Thêm App vào Base** này: mở Base → nút chia sẻ/thành viên (Share/
   Collaborators) → tìm tên App vừa tạo → thêm với quyền chỉnh sửa (Can
   edit). Nếu bỏ qua bước này, mọi lệnh API sẽ báo lỗi quyền truy cập.
3. **Thêm App (bot) vào 1 nhóm chat Lark** dùng để nhận thông báo lead
   mới, rồi lấy `chat_id` của nhóm đó bằng:
   ```bash
   LARK_APP_ID=... LARK_APP_SECRET=... node scripts/list-chats.mjs
   ```
4. **Tạo bảng phụ "STT Counters"** trong cùng Base — xem mục 2.
5. **Điền email Lark thật** của từng người phụ trách/liên quan vào
   `src/config.js` (đang để `TODO_EMAIL_...`) — bot dùng email để tự tra
   ra ID người dùng qua API, không cần bạn tự tìm ID.
6. **Khai báo GitHub Actions Secrets** cho repo này (Settings → Secrets and
   variables → Actions → New repository secret):
   - `LARK_APP_ID`
   - `LARK_APP_SECRET`
   - `LARK_NOTIFY_CHAT_ID` (chat_id lấy ở bước 3)

   ⚠️ App ID/Secret là thông tin nhạy cảm — tuyệt đối không dán vào code,
   commit, hay chat công khai. Chỉ lưu trong GitHub Secrets (đã mã hoá).
   Vì App Secret từng được dán trực tiếp trong cuộc trò chuyện này, cân
   nhắc **tạo lại (rotate) App Secret mới** trên Lark Developer Console
   sau khi hoàn tất setup, rồi cập nhật lại GitHub Secret.

Sau 6 bước trên, bot chạy hoàn toàn tự động mỗi 5 phút, không cần làm gì
thêm.

## 1. Quy tắc phân luồng đã cài đặt

**Chi nhánh** (theo `Địa chỉ`, so khớp theo tên tỉnh/thành, không phân biệt
dấu/hoa-thường):
- Đà Nẵng + miền Trung/Tây Nguyên → `EIV ĐN` (mã `43`)
- TP.HCM + miền Nam → `EIV HCM` (mã `59`)
- Hà Nội + miền Bắc → `EIV HN` (mã `29`)

Danh sách tỉnh cho từng chi nhánh nằm trong `src/config.js`
(`BRANCHES[].provinces`). **Việt Nam đã có đợt sáp nhập tỉnh 2025 — hãy rà
lại danh sách này cho khớp tên tỉnh/thành hiện hành trước khi dùng chính
thức.**

**Nhóm KH** (theo `Quan tâm`, xét theo đúng thứ tự ưu tiên bên dưới, dừng ở
điều kiện đầu tiên khớp):
1. Có "trường học" / "cung cấp giáo viên" → `TRUONG HOC`
2. Có "trung tâm" → `TTAN`
3. Có tín hiệu 1 kèm 1 (one-to-one, 1-1, 1 kèm 1...) **và** "online"/"trực
   tuyến" → `OTO-ONLINE`
4. Có tín hiệu 1 kèm 1 **và** "offline"/"trực tiếp" → `OTO-OFFLINE`
5. Có "doanh nghiệp" → `DOANH NGHIEP`
6. Có "kid"/"bé"/"trẻ em" **và** "online"/"trực tuyến" → `KIDS-ONL`
7. Có "kid"/"bé"/"trẻ em" **và** "tại nhà" → `KIDS-OFF`

Nếu mô tả có "1 kèm 1" nhưng không rõ online/offline (hoặc có "kid" nhưng
không rõ hình thức), bot **không** tự đoán — ghi lý do vào cột "Ghi chú
phân loại (bot)" và báo qua Lark để nhân viên xem lại, tránh gán sai nhóm.

> ⚠️ Nhãn (label) của từng nhóm trong `src/config.js` (`TRUONG HOC`,
> `TTAN`, `OTO-ONLINE`, `OTO-OFFLINE`, `DOANH NGHIEP`, `KIDS-ONL`,
> `KIDS-OFF`) **phải khớp chính xác từng ký tự** với option đã tạo sẵn
> trong trường Single Select "Nhóm KH" của bảng — chạy
> `node scripts/inspect-base.mjs` (mục 3) để đối chiếu.

**Mã KH** = `<mã nhóm KH>-<mã chi nhánh><STT 4 số>`

| Nhóm KH | Mã nhóm |
|---|---|
| TTAN | TT |
| TRUONG HOC | TH |
| DOANH NGHIEP | DN |
| KIDS-ONL | KIDS-ONL |
| KIDS-OFF | KIDS-OFF |
| OTO-ONLINE | OTO-ONL |
| OTO-OFFLINE | OTO-OFF |

Ví dụ: lead ở Đà Nẵng, quan tâm trung tâm, là mã đầu tiên của cặp này →
`TT-430001`.

## 2. Tạo bảng phụ "STT Counters"

Tạo 1 bảng mới trong cùng Base (tên đúng `STT Counters`, hoặc đổi tên qua
biến môi trường `LARK_COUNTER_TABLE_NAME`), 2 cột:
- `Key` (Text)
- `STT` (Number, không thập phân)

Không cần tạo sẵn dòng nào — bot tự tạo dòng mới với `STT = 1` khi gặp một
cặp Nhóm KH + Chi nhánh lần đầu tiên.

Nếu bảng Lead **đã có sẵn Mã KH cũ** theo đúng định dạng `<mã nhóm>-<mã chi
nhánh><4 số>`, seed STT khởi điểm để không bị trùng mã:
1. Copy toàn bộ cột `Mã KH` hiện có, dán vào 1 file `.txt` (mỗi dòng 1 mã).
2. Chạy `node scripts/seed-counters.js duong-dan-file.txt`.
3. Nhập thủ công kết quả (`Key`, `STT`) vào bảng `STT Counters`.

## 3. Kiểm tra field/quyền truy cập trước khi bật thật

```bash
LARK_APP_ID=... LARK_APP_SECRET=... node scripts/inspect-base.mjs
```

In ra toàn bộ tên trường + option hiện có trong bảng Lead, để đối chiếu với
`src/config.js` (`FIELD_NAMES`, `GROUPS[].label`, `BRANCHES[].label`). Nếu
lệnh báo lỗi quyền truy cập, quay lại bước 2 ở mục 0 (thêm App vào Base).

## 4. Chạy thử an toàn rồi mới bật lịch tự động

```bash
LARK_APP_ID=... LARK_APP_SECRET=... LARK_NOTIFY_CHAT_ID=... DRY_RUN=true node scripts/poll-and-route.mjs
```

`DRY_RUN=true` chỉ in ra console các hành động dự kiến (không ghi dữ liệu,
không gửi tin nhắn) — dùng để kiểm tra logic phân loại đúng với vài lead
thật trước. Khi đã yên tâm, bỏ `DRY_RUN` để chạy thật, hoặc vào tab
**Actions** của repo trên GitHub → chọn workflow **"Lead routing bot"** →
**Run workflow** để chạy thử 1 lần thủ công (có ô `dry_run` để chọn).

Sau khi đã khai báo đủ GitHub Secrets (mục 0, bước 6), workflow
`.github/workflows/lead-routing.yml` tự chạy mỗi 5 phút — không cần làm gì
thêm.

## 5. Phụ lục — Cách B: Lark Base Automation (không cần server ngoài)

Nếu không muốn dùng GitHub Actions/API, có thể cấu hình thủ công ngay
trong Lark Base bằng file `src/larkScript.js` (bản đóng gói sẵn để dán vào
action "Chạy tập lệnh"). Cách này cần ~15-20 phút bấm tay trong Lark mỗi
lần thiết lập (không phải mỗi lead), và **không tự sinh được Mã KH nối
tiếp qua API** — phải dùng thêm action "Find record"/"Update record" có
sẵn của Lark để cập nhật bảng đếm, và chọn Người phụ trách/Người liên quan
trực tiếp qua people-picker (không cần biết email/ID).

Chi tiết từng bước (trigger, điều kiện, action, cách rẽ nhánh theo từng chi
nhánh) — liên hệ để tôi cung cấp lại hướng dẫn đầy đủ nếu muốn dùng cách
này thay vì Cách A.

## 6. Kiểm thử logic phân loại (áp dụng cho cả 2 cách)

```bash
npm test
```

Chạy 20 test case cho `matchBranch`, `matchGroup`, `nextStt`, `buildMaKH`,
`classifyLead`, `routeLead`. Khi chỉnh sửa danh sách tỉnh/từ khóa trong
`src/config.js`, chạy lại test để đảm bảo không phá vỡ quy tắc hiện có —
thêm test case mới cho câu input thực tế hay gặp nếu cần.

## 7. Việc cần bạn xác nhận/hoàn thiện trước khi chạy thật

- [ ] Thêm App vào Base + vào nhóm chat thông báo (mục 0).
- [ ] Điền đủ email thật cho 7 người trong `src/config.js` (đang để
      `TODO_EMAIL_...`).
- [ ] Khai báo đủ 3 GitHub Secrets (mục 0, bước 6).
- [ ] Tạo bảng `STT Counters` (mục 2), seed STT nếu đã có Mã KH cũ.
- [ ] Chạy `inspect-base.mjs` đối chiếu tên field/option (mục 3).
- [ ] Chạy thử `DRY_RUN=true` với vài lead mẫu đủ 3 miền, đủ 7 nhóm trước
      khi để chạy thật (mục 4).
- [ ] Rà lại danh sách tỉnh/thành theo địa giới hành chính hiện hành (sau
      sáp nhập 2025) trong `provinces` của từng chi nhánh.
- [ ] Cân nhắc rotate App Secret sau khi setup xong (đã dán trong chat).
