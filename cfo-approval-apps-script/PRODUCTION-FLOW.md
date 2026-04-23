# Production Flow — Trình CFO qua Google Apps Script

## Vai trò
- Người trình kế hoạch: `nguyen.khuong@atherlabs.com`
- CFO phê duyệt: `duc.ho@atherlabs.com`

## Mail gửi từ ai?
- Mail **đi từ tài khoản Google deploy Apps Script**
- Nếu anh deploy bằng `nguyen.khuong@atherlabs.com`
  thì mail sẽ đi **từ chính địa chỉ này**

## Flow rất ngắn gọn

1. Anh bấm **`Trình CFO`** trên dashboard
2. Dashboard `POST` payload plan tới **Google Apps Script Web App**
3. Apps Script dùng **GmailApp** gửi mail:
   - From: `nguyen.khuong@atherlabs.com`
   - To: `duc.ho@atherlabs.com`
4. Trong mail có 2 link:
   - `Cần điều chỉnh`
   - `Duyệt kế hoạch`
5. CFO bấm 1 trong 2 link
6. Apps Script nhận action và update file approval JSON trên GitHub
7. GitHub Pages đọc file JSON mới và hiện trạng thái approval

## Payload gợi ý từ dashboard

```json
{
  "planId": "2026-05-company",
  "month": "2026-05",
  "planType": "company",
  "title": "Kế hoạch dòng tiền & hạn mức thấu chi khả dụng",
  "version": "Draft 2",
  "contentHash": "sha256:test-company-2026-05-draft2",
  "planUrl": "https://nguyenkhuong-maker.github.io/treasury-investment-tool/monthly-plans-live.html?v=202605"
}
```

## File GitHub được cập nhật

Ví dụ:
- `treasury-master-dashboard/data/monthly-plans/approvals/2026-05-company.json`
- `treasury-master-dashboard/data/monthly-plans/approvals/2026-05-personal.json`

## Trạng thái được ghi
- `pending_cfo_review`
- `revision_requested`
- `approved`

## Điều kiện để approval hợp lệ
- approver phải là `duc.ho@atherlabs.com`
- approval gắn với `version` + `contentHash`
- nếu đổi nội dung plan sau khi duyệt thì phải **trình lại CFO**
