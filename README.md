# Bot phân luồng lead CRM trên Lark Base (EIV Education)

Bot chạy hoàn toàn bằng tính năng **Automation** có sẵn của Lark Base (không
cần server ngoài, không cần App ID/Secret). Khi có lead mới rơi vào nhóm KH
`CHỜ PHÂN LOẠI`, Automation sẽ:

1. Gửi thông báo lead mới trên Lark.
2. Đọc `Địa chỉ` + `Quan tâm` của lead, chạy script phân loại để xác định
   Chi nhánh và Nhóm KH.
3. Rẽ nhánh theo chi nhánh xác định được, gán **Người phụ trách / Người liên
   quan** (chọn sẵn qua people-picker của Lark — không cần ID người dùng).
4. Sinh **Mã KH** nối tiếp theo đúng công thức, dùng một bảng đếm phụ +
   action có sẵn (Find record / Update record) — không cần script đọc toàn
   bộ bảng.
5. Nếu không xác định được chi nhánh và/hoặc nhóm KH, gửi thông báo để nhân
   viên phân loại thủ công, giữ nguyên `CHỜ PHÂN LOẠI`.

Repo này chứa:
- `src/config.js`, `src/routing.js`, `src/text.js` — logic phân loại thuần
  JS, có unit test (`test/routing.test.js`, chạy `npm test`).
- `src/larkScript.js` — bản đóng gói sẵn (không dùng `import`) để **copy
  trực tiếp** vào action "Chạy tập lệnh" (Run script) trong Automation.
- `scripts/seed-counters.js` — công cụ chạy local 1 lần để tính STT khởi
  điểm cho bảng đếm, dựa trên Mã KH hiện có trong bảng.

## 1. Quy tắc phân luồng đã cài đặt

**Chi nhánh** (theo `Địa chỉ`, so khớp theo tên tỉnh/thành, không phân biệt
dấu/hoa-thường):
- Đà Nẵng + miền Trung/Tây Nguyên → `EIV ĐN` (mã `43`)
- TP.HCM + miền Nam → `EIV HCM` (mã `59`)
- Hà Nội + miền Bắc → `EIV HN` (mã `29`)

Danh sách tỉnh cho từng chi nhánh nằm trong `src/config.js` (`BRANCHES[].provinces`)
và trùng khớp trong `src/larkScript.js`. **Vietnam đã có đợt sáp nhập tỉnh
2025 — hãy rà lại danh sách này cho khớp tên tỉnh/thành hiện hành trước khi
đưa vào dùng chính thức.**

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
không rõ hình thức), bot **không** tự đoán — trả về không khớp để nhân viên
xem lại, tránh gán sai nhóm.

> ⚠️ Nhãn (label) của từng nhóm trong `src/config.js` / `src/larkScript.js`
> (`TRUONG HOC`, `TTAN`, `OTO-ONLINE`, `OTO-OFFLINE`, `DOANH NGHIEP`,
> `KIDS-ONL`, `KIDS-OFF`) **phải khớp chính xác từng ký tự** với các option
> đã tạo sẵn trong trường Single Select "Nhóm KH" của bảng — kiểm tra lại
> trước khi dùng, sửa trong `config.js`/`larkScript.js` nếu tên option thực
> tế viết khác (có dấu, viết hoa/thường khác...).

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

## 2. Chuẩn bị trong Lark Base

### 2.1. Kiểm tra/khớp tên trường trong bảng Lead (`tblckO9AXEQ4pLvP`)

Mặc định script dùng các tên trường sau — sửa lại trong `src/config.js`
(`FIELD_NAMES`) và trong phần cấu hình action nếu bảng của bạn đặt tên khác:

- `Địa chỉ`
- `Quan tâm`
- `Nhóm KH` (Single Select, đã có option `CHỜ PHÂN LOẠI`)
- `Chi nhánh`
- `Người phụ trách` (People field)
- `Người liên quan` (People field)
- `Mã KH` (Text)

### 2.2. Tạo bảng phụ "STT Counters"

Tạo 1 bảng mới trong cùng Base, 2 cột:
- `Key` (Text) — giá trị dạng `<mã nhóm>-<mã chi nhánh>`, ví dụ `TT-43`
- `STT hiện tại` (Number, không thập phân)

Tạo sẵn **7 nhóm × 3 chi nhánh = 21 dòng** (hoặc chỉ tạo dòng nào thực tế
sẽ dùng), Key tương ứng, ví dụ: `TH-29`, `TH-43`, `TH-59`, `TT-29`, `TT-43`,
`TT-59`, `DN-29`, ...

Nếu bảng Lead **đã có sẵn Mã KH cũ** theo đúng định dạng này, tính STT khởi
điểm bằng cách:
1. Copy toàn bộ cột `Mã KH` hiện có, dán vào 1 file `.txt` (mỗi dòng 1 mã).
2. Chạy `node scripts/seed-counters.js duong-dan-file.txt`.
3. Nhập kết quả (`Key`, `STT hiện tại`) vào bảng `STT Counters`.

Nếu chưa có Mã KH nào theo định dạng này, để `STT hiện tại = 0` cho tất cả.

## 3. Cấu hình Automation

Vào bảng Lead → **Automation** → tạo automation mới, đặt tên ví dụ
"Phân luồng lead mới".

**Trigger:** Khi bản ghi được thêm mới trong bảng Lead.
**Điều kiện (Condition):** `Nhóm KH` = `CHỜ PHÂN LOẠI`.

**Action 1 — Gửi thông báo (Send notification):**
Chọn action gửi thông báo có sẵn của Lark Base, gửi vào nhóm chat phụ trách
tiếp nhận lead, nội dung gợi ý: *"🆕 Lead mới: {{Tên KH}} — {{Địa chỉ}} —
{{Quan tâm}}"* (thay bằng tên trường thực tế).

**Action 2 — Chạy tập lệnh (Run script):**
- Input params: `diaChi` ← trường Địa chỉ của bản ghi trigger, `quanTam` ←
  trường Quan tâm của bản ghi trigger.
- Dán toàn bộ nội dung `src/larkScript.js` vào ô code.
- Output params: `matched` (boolean), `chiNhanhCode`, `chiNhanhLabel`,
  `maChiNhanh`, `nhomKHCode`, `nhomKHLabel`, `maNhom`, `prefix`, `reason`
  (tất cả kiểu Text trừ `matched` là Boolean).

> Editor script của Lark Base có thể yêu cầu một khuôn mẫu hơi khác (ví dụ
> bắt buộc viết trong hàm `main(params)` rồi `return`, thay vì dùng biến
> `params` ở top-level). Nếu vậy, mở khối code mẫu Lark hiển thị sẵn khi tạo
> action để xem đúng khuôn mẫu, rồi bọc phần logic của `larkScript.js` vào
> đúng chỗ — không cần sửa logic bên trong.

**Action 3 — Rẽ nhánh (If/Else) theo `chiNhanhCode`:**

- **Nhánh `chiNhanhCode = EIV_DN`:**
  1. *Find record* trong bảng `STT Counters` với `Key = {{prefix}}`.
  2. *Update record* (STT Counters): `STT hiện tại = STT hiện tại + 1`.
  3. *Update record* (bản ghi Lead trigger):
     - `Mã KH` = `{{prefix}}` nối với `STT hiện tại` sau bước 2, định dạng
       4 chữ số (dùng công thức dạng `TEXT([STT hiện tại], "0000")` hoặc
       tương đương tùy công thức Lark Base hỗ trợ).
     - `Chi nhánh` = `EIV ĐN`
     - `Nhóm KH` = `{{nhomKHLabel}}`
     - `Người phụ trách` = chọn **Phạm Thị Hồng Vân - CM ĐN** (chọn trực
       tiếp qua people-picker, không cần ID)
     - `Người liên quan` = chọn **Lý Hoàng Thục Linh**

- **Nhánh `chiNhanhCode = EIV_HCM`:** tương tự, `Chi nhánh = EIV HCM`,
  `Người phụ trách` = **Nguyễn Tuấn Khôi** + **Phan Thị Thùy Linh**,
  `Người liên quan` = **Nguyễn Tuấn Khôi**.

- **Nhánh `chiNhanhCode = EIV_HN`:** tương tự, `Chi nhánh = EIV HN`,
  `Người phụ trách` = **Hoàng Hải Yến - Sale HN**, `Người liên quan` =
  **Trịnh Thu Quỳnh** + **Trần Thùy Giang**.

- **Nhánh else (không xác định được, `matched = false`):** Gửi thông báo
  kèm `{{reason}}` tới nhóm chat quản lý để phân loại thủ công, không đổi
  `Nhóm KH`.

> Vì dùng people-picker chọn trực tiếp tên người thật trong UI của Lark
> (thay vì set field bằng ID người dùng lấy từ script), các ID ví dụ trong
> `src/config.js` (`42g8fg61`, `1b57762b`, `62dfgc39`...) **không bắt buộc
> phải có** cho cách triển khai này — chỉ cần chọn đúng người trong danh
> sách. Các ID đó (và các ô còn để `TODO_ID_...`) chỉ hữu ích nếu sau này
> đổi sang phương án gọi Lark Open API từ một service ngoài.

## 4. Kiểm thử logic phân loại

```bash
npm test
```

Chạy 20 test case cho `matchBranch`, `matchGroup`, `nextStt`, `buildMaKH`,
`classifyLead`, `routeLead`. Khi chỉnh sửa danh sách tỉnh/từ khóa trong
`src/config.js`, sửa đồng thời trong `src/larkScript.js` rồi chạy lại test
để đảm bảo không phá vỡ các quy tắc hiện có — thêm test case mới cho câu
input thực tế hay gặp nếu cần.

## 5. Việc cần bạn xác nhận/hoàn thiện trước khi chạy thật

- [ ] Xác nhận đúng tên các trường trong bảng Lead (mục 2.1).
- [ ] Xác nhận nhãn 7 option của trường Single Select "Nhóm KH" khớp với
      `src/config.js`/`src/larkScript.js`.
- [ ] Tạo bảng `STT Counters` + seed STT ban đầu (mục 2.2).
- [ ] Rà lại danh sách tỉnh/thành theo địa giới hành chính hiện hành (sau
      sáp nhập 2025) trong `provinces` của từng chi nhánh.
- [ ] Test thử với vài lead mẫu (đủ 3 miền, đủ 7 nhóm) trước khi bật cho
      toàn bộ lead thật.
