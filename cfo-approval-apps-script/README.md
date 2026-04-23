# CFO Approval via Google Apps Script

Mục tiêu: khi anh Nguyên bấm **Trình CFO** trên dashboard kế hoạch tháng:

1. Google Apps Script gửi mail từ **`nguyen.khuong@atherlabs.com`**
2. Mail test đi tới **`kdhn1911@gmail.com`** trước khi chuyển sang mail CFO thật
3. CFO / người test bấm link để:
   - yêu cầu điều chỉnh
   - hoặc duyệt kế hoạch
4. Apps Script cập nhật file approval JSON trên GitHub repo
5. GitHub Pages đọc approval JSON và hiện trạng thái mới

## Kết luận quan trọng

Với phương án Google Apps Script:
- **mail sẽ được gửi từ tài khoản Google sở hữu / deploy script**
- nếu anh deploy script bằng `nguyen.khuong@atherlabs.com`
  thì CFO sẽ nhận mail **từ chính địa chỉ này**

## Thành phần

- `Code.gs` — logic gửi mail, tạo token, xử lý review / approve, cập nhật GitHub
- `appsscript.json` — manifest Apps Script
- `README.md` — hướng dẫn triển khai nhanh

## Flow production ngắn gọn

```text
Dashboard -> bấm "Trình CFO"
       -> Apps Script Web App nhận payload plan
       -> GmailApp gửi mail từ nguyen.khuong@atherlabs.com cho duc.ho@atherlabs.com
       -> CFO mở link và chọn "Cần điều chỉnh" hoặc "Duyệt kế hoạch"
       -> Apps Script ghi approval JSON lên GitHub qua REST API
       -> GitHub Pages load lại trạng thái approval
```

## File approval gợi ý trên repo

- `treasury-master-dashboard/data/monthly-plans/approvals/2026-05-company.json`
- `treasury-master-dashboard/data/monthly-plans/approvals/2026-05-personal.json`

Ví dụ nội dung:

```json
{
  "planId": "2026-05-company",
  "month": "2026-05",
  "makerEmail": "nguyen.khuong@atherlabs.com",
  "approverEmail": "duc.ho@atherlabs.com",
  "status": "approved",
  "version": "Draft 2",
  "contentHash": "sha256:...",
  "approvedBy": "duc.ho@atherlabs.com",
  "approvedAt": "2026-05-01T10:30:00+07:00",
  "channel": "google_apps_script_mail"
}
```

## Các script properties cần cấu hình

Trong Apps Script -> Project Settings -> Script properties:

- `MAKER_EMAIL=nguyen.khuong@atherlabs.com`
- `CFO_EMAIL=kdhn1911@gmail.com`  ← dùng để test trước
- `DASHBOARD_BASE_URL=https://nguyenkhuong-maker.github.io/treasury-investment-tool/`
- `GITHUB_OWNER=nguyenkhuong-maker`
- `GITHUB_REPO=treasury-investment-tool`
- `GITHUB_BRANCH=main`
- `GITHUB_TOKEN=<personal access token>`
- `APPROVAL_DATA_PREFIX=treasury-master-dashboard/data/monthly-plans/approvals`

## Cách deploy nhanh

### 1. Tạo Apps Script project
- mở `script.google.com`
- tạo project mới
- copy `Code.gs` và `appsscript.json`

### 2. Set script properties
- thêm các key như trên

### 3. Deploy Web App
- Deploy -> New deployment
- Type: Web app
- Execute as: **anh Nguyên**
- Who has access: **Anyone with the link**

### 4. Nối từ dashboard
Nút `Trình CFO` sẽ `POST` tới Apps Script Web App URL với payload plan.

## Payload plan gợi ý

```json
{
  "planId": "2026-05-company",
  "month": "2026-05",
  "planType": "company",
  "title": "Kế hoạch dòng tiền & hạn mức thấu chi khả dụng",
  "version": "Draft 2",
  "contentHash": "sha256:test-company-2026-05-draft2",
  "planUrl": "https://nguyenkhuong-maker.github.io/treasury-investment-tool/monthly-plans-live.html?v=..."
}
```

## Hành vi duyệt

### Nếu CFO chọn `Cần điều chỉnh`
- Apps Script ghi `status = revision_requested`
- commit JSON lên GitHub
- dashboard hiển thị cần điều chỉnh

### Nếu CFO chọn `Duyệt kế hoạch`
- Apps Script ghi `status = approved`
- `approvedBy = duc.ho@atherlabs.com`
- commit JSON lên GitHub
- dashboard hiển thị đã phê duyệt

## Khi test xong

Khi anh test ổn với `kdhn1911@gmail.com`, chỉ cần đổi lại script property:

- `CFO_EMAIL=duc.ho@atherlabs.com`

là flow sẽ chuyển sang trình CFO thật mà không cần sửa lại code chính.

## Lưu ý bảo mật

- GitHub token không để trong source code; chỉ để trong Script Properties
- token review nên là token ngẫu nhiên, 1 lần dùng, có hạn dùng
- nếu plan đổi nội dung sau khi duyệt, phải trình lại CFO
