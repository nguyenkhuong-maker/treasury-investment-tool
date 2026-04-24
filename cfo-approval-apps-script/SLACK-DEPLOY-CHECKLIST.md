# Slack Approval Deploy Checklist

Mục tiêu: thêm flow **Gửi CFO qua Slack** mà **không làm hỏng** flow **Gửi CFO qua mail** đang chạy.

## 1) Giữ nguyên các phần mail đang dùng
Không đổi / không xóa các giá trị đang cần cho mail:
- `MAKER_EMAIL`
- `CFO_EMAIL`
- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_BRANCH`
- `GITHUB_TOKEN`
- `APPROVAL_DATA_PREFIX=data/monthly-plans/approvals`

Flow mail vẫn dùng:
- `reviewChannel = mail`
- `submitPlanToCfo(...)`
- `GmailApp.sendEmail(...)`
- action link `approve` / `revise`

## 2) Bổ sung Script Properties cho Slack
Thêm các key sau trong **Apps Script → Project Settings → Script properties**:

- `SLACK_BOT_TOKEN=<bot token của vesper_treasury>`
- `SLACK_APPROVAL_CHANNEL_ID=C0AT2E4CBDX`
- `SLACK_APPROVAL_CHANNEL_NAME=#treasury-management`
- `SLACK_BOT_USERNAME=vesper_treasury`
- `SLACK_CFO_USER_ID=<Slack user id của CFO hợp lệ>`

## 3) Slack app cần bật Interactivity
Trong Slack App config:
- bật **Interactivity & Shortcuts**
- Request URL trỏ về **Apps Script Web App URL**

Ví dụ:
- `https://script.google.com/macros/s/XXXXX/exec`

## 4) Redeploy Apps Script Web App
Sau khi cập nhật `Code.gs`:
1. **Deploy**
2. **Manage deployments**
3. **Edit** deployment hiện tại hoặc tạo deployment mới
4. Web app:
   - Execute as: **anh Nguyên**
   - Who has access: **Anyone** hoặc **Anyone with the link**

## 5) Kiểm tra không đè mất flow mail
Test tối thiểu 2 case:

### Case A — Gửi qua mail
- bấm `Gửi CFO qua mail`
- xác nhận mail vẫn gửi theo `CFO_EMAIL`
- approval JSON vẫn cập nhật bình thường

### Case B — Gửi qua Slack
- bấm `Gửi CFO qua Slack`
- bot post vào `#treasury-management`
- message có 2 nút thật:
  - `Duyệt kế hoạch`
  - `Cần điều chỉnh`
- user không đúng `SLACK_CFO_USER_ID` bấm thử phải bị từ chối
- CFO hợp lệ bấm phải cập nhật JSON
- dashboard reload phải đổi trạng thái theo

## 6) File liên quan trong repo
- `monthly-plans-live.html`
- `data/monthly-plans/live-index.js`
- `data/monthly-plans/index.js`
- `cfo-approval-apps-script/Code.gs`

## 7) Kết quả mong muốn
- Mail approval vẫn hoạt động như cũ
- Slack approval chạy song song
- Cả hai cùng ghi về:
  - `data/monthly-plans/approvals/<planId>.json`
