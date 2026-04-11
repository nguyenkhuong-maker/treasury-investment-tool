# JSON Schema vận hành

## 1) `data/rates-history.json`
Dùng cho lịch sử lãi suất theo **tháng / tuần**.

### Cấu trúc
```json
{
  "meta": {
    "name": "Rates History",
    "updatedAt": "2026-04-11T10:24:00+07:00",
    "hasHistory": true,
    "granularity": "month-week",
    "defaultMonth": "2026-04",
    "defaultWeek": "1"
  },
  "months": {
    "2026-04": {
      "label": "Tháng 4/2026",
      "weeks": {
        "1": {
          "label": "Tuần 1",
          "available": true,
          "updatedAt": "2026-04-11T10:24:00+07:00",
          "summary": {
            "note": "Ghi chú của tuần"
          },
          "mediumTerm": { "items": [] },
          "shortTerm": { "items": [] },
          "underOneMonth": { "items": [] }
        }
      }
    }
  }
}
```

### `mediumTerm.items[]`
```json
{
  "name": "BIDV",
  "rates": { "6m": 8.2, "9m": null, "12m": 8.2 },
  "corpBorrowRate": 7.2,
  "strategy": "Ưu tiên cân bằng",
  "comment": "Cân bằng giữa gửi tiền và hỗ trợ vay."
}
```

### `shortTerm.items[]`
```json
{
  "name": "Trái phiếu VNDirect",
  "rates": { "1m": 8.0, "2m": 8.0, "3m": 8.0 },
  "minAmount": 10000000000,
  "strategy": "Ưu tiên cho khoản trên 10 tỷ cần neo tiền đúng tenor 1-3 tháng."
}
```

### `underOneMonth.items[]`
```json
{
  "name": "Hợp đồng Dplus (VNDirect)",
  "rates": { "1d": null, "1w": 5.2, "2w": 5.3, "3w": 5.4 },
  "minAmount": 0,
  "strategy": "Ưu tiên cho tiền chờ 1-3 tuần.",
  "rollable": false
}
```

---

## 2) `data/company-loans-current.json`
Dùng cho **snapshot hiện tại** của dư nợ vay công ty, **không lưu history**.

### Cấu trúc
```json
{
  "meta": {
    "name": "Company Loans Current Snapshot",
    "updatedAt": "2026-04-11T10:24:00+07:00",
    "hasHistory": false,
    "source": "Google Sheets / Loan-BIDV / Loan-SC"
  },
  "bidvOverdraft": [],
  "bidvWorkingCapital": [],
  "scWorkingCapital": []
}
```

### `bidvOverdraft[]`
```json
{
  "bank": "BIDV",
  "group": "overdraft",
  "company": "VIHALI",
  "loanCode": "1440280147",
  "loanName": "BIDV TN Thấu chi",
  "disbursementDate": "2025-05-07",
  "maturityDate": "2026-05-07",
  "interestRate": 5.2,
  "pledgedAccount": "AAC7305098",
  "principalOutstanding": 10750152548,
  "interestAccrued": 23699805,
  "interestPayable": 18378343,
  "projectedSettlement": 10768530891,
  "availableLimit": 2432752,
  "notes": "Khoản hạn mức thấu chi, ngày đến hạn chung."
}
```

### `bidvWorkingCapital[]`
```json
{
  "bank": "BIDV",
  "group": "working-capital",
  "company": "VIHALI",
  "loanCode": "470703486604",
  "loanName": "BIDV VLĐ",
  "disbursementDate": "2024-09-07",
  "maturityDate": "2026-09-12",
  "interestRate": 4.9,
  "principalOutstanding": 1163640777,
  "interestAccrued": 324102777,
  "interestPayable": 4704195,
  "projectedSettlement": 1116566682,
  "notes": "Mỗi khế ước là 1 dòng riêng."
}
```

### `scWorkingCapital[]`
```json
{
  "bank": "SC",
  "group": "working-capital",
  "company": "VIHALI",
  "loanCode": "007095194",
  "loanName": "SC VLĐ",
  "disbursementDate": "2025-10-14",
  "maturityDate": "2026-04-10",
  "interestRate": 4.7,
  "principalOutstanding": 425279894,
  "interestPayable": 9747642,
  "projectedSettlement": 435027441,
  "notes": "Khế ước gần hạn."
}
```

---

## 3) Quy ước cập nhật
- **Lãi suất**: cập nhật vào `rates-history.json`
- **Dư nợ vay công ty**: cập nhật snapshot mới nhất vào `company-loans-current.json`
- **Không lưu lịch sử** cho phần dư nợ vay công ty
