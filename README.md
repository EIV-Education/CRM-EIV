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
   mới (đã có sẵn `chat_id` mặc định trong `src/config.js`:
   `oc_22558fe11452f8afc13a6b33a41af823` — chỉ cần đổi nếu dùng nhóm khác,
   lấy chat_id mới bằng `node scripts/list-chats.mjs`).
4. **Khai báo GitHub Actions Secrets** cho repo này (Settings → Secrets and
   variables → Actions → New repository secret):
   - `LARK_APP_ID`
   - `LARK_APP_SECRET`

   ⚠️ App ID/Secret là thông tin nhạy cảm — tuyệt đối không dán vào code,
   commit, hay chat công khai. Chỉ lưu trong GitHub Secrets (đã mã hoá).
   Vì App Secret từng được dán trực tiếp trong cuộc trò chuyện này, cân
   nhắc **tạo lại (rotate) App Secret mới** trên Lark Developer Console
   sau khi hoàn tất setup, rồi cập nhật lại GitHub Secret.

Email của 7 người phụ trách/liên quan đã được điền sẵn trong
`src/config.js` — bot tự tra ra ID người dùng qua API mỗi lần chạy, không
cần bạn tìm ID thủ công.

Sau 4 bước trên, bot chạy hoàn toàn tự động mỗi 5 phút, không cần làm gì
thêm.

## 1. Quy tắc phân luồng đã cài đặt

**Chi nhánh**: nguồn chính là field Single Select **"Tỉnh/Thành phố"** (đã
chuẩn hoá sẵn 51 giá trị trong Base — khớp trực tiếp, không cần đoán chữ),
chỉ fallback sang parse text tự do ở "Địa chỉ" khi "Tỉnh/Thành phố" trống:
- Đà Nẵng + miền Trung/Tây Nguyên → `EIV ĐN` (mã `43`)
- TP.HCM + miền Nam → `EIV HCM` (mã `59`)
- Hà Nội + miền Bắc → `EIV HN` (mã `29`)

Bảng ánh xạ đầy đủ (từng tỉnh/thành → chi nhánh) nằm trong `src/config.js`
(`PROVINCE_BRANCH_MAP`); danh sách dự phòng cho "Địa chỉ" nằm trong
`BRANCHES[].provinces`. Hai giá trị `N/a` và `Đài Loan` cố tình để không
khớp (cần xem thủ công).

**Nhóm KH** (theo field "Mô tả", xét theo đúng thứ tự ưu tiên bên dưới,
dừng ở điều kiện đầu tiên khớp):
1. Có "trường học" / "cung cấp giáo viên" → `TRƯỜNG HỌC`
2. Có "trung tâm" → `TTAN`
3. Có tín hiệu 1 kèm 1 (one-to-one, 1-1, 1 kèm 1...) **và** "online"/"trực
   tuyến" → `OTO-ONLINE`
4. Có tín hiệu 1 kèm 1 **và** "offline"/"trực tiếp" → `OTO-OFFLINE`
5. Có "doanh nghiệp" → `DOANH NGHIỆP`
6. Có "kid"/"bé"/"trẻ em" **và** "online"/"trực tuyến" → `KIDS-ONL`
7. Có "kid"/"bé"/"trẻ em" **và** "tại nhà" → `KIDS-OFF`

Nếu mô tả có "1 kèm 1" nhưng không rõ online/offline (hoặc có "kid" nhưng
không rõ hình thức), bot **không** tự đoán — chỉ gửi thông báo (⚠️) qua
Lark để nhân viên xem lại, tránh gán sai nhóm, không ghi gì vào record.
Lead vẫn giữ nguyên `CHỜ PHÂN LOẠI` nên **sẽ được nhắc lại ở lần quét 5
phút tiếp theo** nếu chưa ai xử lý — đây là thông báo **nghiệp vụ bình
thường**, khác với thông báo lỗi kỹ thuật bên dưới.

**Thông báo lỗi kỹ thuật**: nếu bot gặp lỗi ngoài dự kiến khi xử lý (ví dụ
sai tên field, mất quyền truy cập API...), nó cũng gửi 1 tin nhắn (🛑) vào
đúng nhóm chat thông báo, kèm nội dung lỗi cụ thể — không âm thầm bỏ qua.
Với lịch quét 5 phút, nếu nhiều lead cùng gặp 1 lỗi trong 1 lần quét, bot
gộp lại thành **1 tin nhắn tổng hợp** (liệt kê tối đa 5 lead đầu, còn lại
ghi số lượng) thay vì gửi lặp lại nhiều lần, tránh spam nhóm chat.

> ⚠️ Field **"Nhóm KH" trong bảng Lead là Link (liên kết tới bảng riêng
> `Nhóm KH`)**, không phải Single Select — bot tự tra `record_id` tương
> ứng với từng nhãn qua bảng đó mỗi lần chạy (`NHOM_KH_LINK_TABLE_ID` +
> `NHOM_KH_PRIMARY_FIELD` trong `src/config.js`), không cần bạn cấu hình
> gì thêm. Nhãn 7 nhóm trong `src/config.js` (`GROUPS[].label`) đã đối
> chiếu đúng với dữ liệu thật trong bảng liên kết đó bằng
> `node scripts/inspect-base.mjs`.

**Mã KH** = `<mã nhóm KH>-<mã chi nhánh><STT 4 số>`

| Nhóm KH | Mã nhóm |
|---|---|
| TTAN | TT |
| TRƯỜNG HỌC | TH |
| DOANH NGHIỆP | DN |
| KIDS-ONL | KIDS-ONL |
| KIDS-OFF | KIDS-OFF |
| OTO-ONLINE | OTO-ONL |
| OTO-OFFLINE | OTO-OFF |

Ví dụ: lead ở Đà Nẵng, quan tâm trung tâm, là mã đầu tiên của cặp này →
`TT-430001`.

## 2. Cách sinh STT tiếp nối

Bot **không cần bảng đếm phụ**. Mỗi lần chạy, nó tự quét toàn bộ cột
`Mã KH` đã có sẵn trong bảng Lead, tìm số lớn nhất theo từng prefix
`<mã nhóm>-<mã chi nhánh>` rồi +1 — đúng cách nhân viên đang làm thủ công.
Ví dụ trong nhóm TTAN/HCM (`TT-59...`) mã lớn nhất hiện có là `TT-590047`
thì lead tiếp theo sẽ được đặt `TT-590048` tự động, không cần setup gì
thêm cho phần này.

## 3. Kiểm tra field/quyền truy cập trước khi bật thật

```bash
LARK_APP_ID=... LARK_APP_SECRET=... node scripts/inspect-base.mjs
```

In ra toàn bộ tên trường, option, và (với field Link như "Nhóm KH") cả
record_id của bảng liên kết, để đối chiếu với `src/config.js`
(`FIELD_NAMES`, `GROUPS[].label`, `BRANCHES[].label`). Nếu lệnh báo lỗi
quyền truy cập, quay lại bước 2 ở mục 0 (thêm App vào Base). Đã chạy và
đối chiếu 1 lần — tên field/nhãn hiện tại trong `config.js` đã khớp với
Base thật tính đến thời điểm setup.

Bot **không tạo/ghi thêm field nào** vào bảng Lead ngoài các field nghiệp
vụ đã có sẵn (Mã KH, CHI NHÁNH, Nhóm KH, Người phụ trách, Người Liên
Quan). Với lead **không phân loại được**, bot chỉ gửi thông báo Lark, không
ghi gì vào record — do đó nếu lead vẫn còn thiếu Tỉnh/Thành phố hoặc Mô tả
phù hợp, **mỗi lần quét định kỳ (5 phút) sẽ gửi lại thông báo nhắc** cho
tới khi có người bổ sung dữ liệu hoặc tự tay phân loại. Đây là đánh đổi có
chủ đích (đơn giản, không cần thêm field) — nếu về sau muốn tránh nhắc lặp
lại, có thể cân nhắc thêm 1 field đánh dấu riêng.

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

## 4b. Xử lý gần tức thì bằng Webhook (Vercel) — tuỳ chọn thêm

Lịch 5 phút ở mục 4 vẫn chạy nền như một lớp dự phòng, đảm bảo không lead
nào bị bỏ sót. Nếu muốn lead được phân luồng **gần như ngay khi tạo**
(không phải chờ tới 5 phút), thêm 1 webhook: `api/webhook.js` trong repo
này là 1 Vercel serverless function sẵn sàng dùng, không cần sửa code.

**Bước 1 — Deploy `api/webhook.js` lên Vercel:**
1. Vào [vercel.com](https://vercel.com) (đăng nhập bằng tài khoản GitHub
   của tổ chức) → **Add New → Project** → chọn import repo `CRM-EIV`.
2. Vercel tự nhận diện đây là project Node (không cần build command/output
   directory gì đặc biệt, cứ để mặc định) → bấm **Deploy**.
3. Sau khi deploy xong, vào **Project → Settings → Environment Variables**,
   thêm:
   - `LARK_APP_ID`
   - `LARK_APP_SECRET`
   - `WEBHOOK_SECRET` — tự đặt 1 chuỗi bí mật ngẫu nhiên bất kỳ (ví dụ
     chạy `openssl rand -hex 20`), dùng để xác thực request gọi vào webhook
     này, tránh người ngoài biết URL rồi gọi lung tung.
   - (tuỳ chọn) `LARK_NOTIFY_CHAT_ID` nếu muốn đổi khác giá trị mặc định.
4. Bấm **Redeploy** để áp dụng biến môi trường vừa thêm.
5. Lấy URL production, ví dụ `https://crm-eiv.vercel.app`, endpoint đầy đủ
   sẽ là `https://crm-eiv.vercel.app/api/webhook?token=<WEBHOOK_SECRET>`.

**Bước 2 — Cấu hình Automation trong Lark Base gọi webhook này:**
1. Vào bảng Lead → **Automation** → tạo automation mới.
2. **Trigger**: Khi bản ghi được thêm mới trong bảng Lead.
3. **Điều kiện**: `Nhóm KH` = `CHỜ PHÂN LOẠI`.
4. **Action**: chọn action gửi HTTP request / gọi webhook có sẵn của Lark
   Base Automation (tên có thể là "Gửi yêu cầu HTTP", "Webhook", hoặc
   tương tự tuỳ giao diện) — cấu hình:
   - Method: `POST`
   - URL: `https://<project-cua-ban>.vercel.app/api/webhook?token=<WEBHOOK_SECRET>`
   - Headers: `Content-Type: application/json`
   - Body (JSON): `{"record_id": "{{record_id}}"}` — dùng công cụ chèn biến
     của Lark để chọn đúng "ID bản ghi" của bản ghi vừa trigger (tên biến
     hiển thị có thể khác chút tuỳ bản Lark, miễn key gửi lên là
     `record_id`).
5. Lưu và bật automation.

Từ giờ mỗi lead mới sẽ được webhook xử lý gần như ngay lập tức; lịch 5
phút ở mục 4 vẫn chạy song song để bắt lại bất kỳ lead nào lỡ bị bỏ sót
(webhook lỗi, Vercel tạm gián đoạn...) — an toàn vì logic idempotent
(record đã xử lý sẽ không còn khớp điều kiện `CHỜ PHÂN LOẠI` nữa nên không
bị xử lý 2 lần).

> Nếu Lark Base Automation của bạn **không có sẵn action gửi HTTP
> request/webhook** (một số gói/phiên bản Lark có thể giới hạn action
> này), cho tôi biết — sẽ cần chuyển hướng khác (ví dụ dùng Lark Event
> Subscription cấp app thay vì action trong Automation).

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

- [x] Thêm App vào Base + vào nhóm chat thông báo (mục 0).
- [x] Email 7 người phụ trách/liên quan đã điền trong `src/config.js`.
- [x] Khai báo đủ 2 GitHub Secrets `LARK_APP_ID`/`LARK_APP_SECRET` (mục 0,
      bước 4).
- [x] Đã chạy `inspect-base.mjs`, đối chiếu và sửa tên field/nhãn nhóm cho
      khớp Base thật (mục 1, mục 3).
- [x] Quyền `contact:user.email:readonly` + phạm vi khả dụng (Availability)
      của App đã mở đủ cho 7 người phụ trách/liên quan (`check-emails.mjs`
      xác nhận 8/8 email tra được open_id).
- [x] Test thực tế: lead đã phân loại đúng Mã KH/Chi nhánh/Nhóm KH.
- [ ] Chạy thử `DRY_RUN=true` với vài lead mẫu đủ 3 miền, đủ 7 nhóm trước
      khi để chạy thật (mục 4).
- [ ] Rà lại danh sách tỉnh/thành theo địa giới hành chính hiện hành (sau
      sáp nhập 2025) trong `PROVINCE_BRANCH_MAP`/`provinces`.
- [ ] Cân nhắc rotate App Secret sau khi setup xong (đã dán trong chat).
- [ ] (Tuỳ chọn) Deploy `api/webhook.js` lên Vercel + cấu hình Automation
      gọi webhook để xử lý gần tức thì thay vì chờ lịch 5 phút (mục 4b).
