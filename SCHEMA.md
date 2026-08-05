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
    "defaultWeek": "1",
    "treasuryGuidance": {
      "orientation": ["An toàn thanh khoản", "Đa dạng phân bổ", "Tối ưu lợi suất"],
      "decisionAxes": ["Mục đích và nhu cầu sử dụng vốn", "Kỳ hạn sử dụng vốn"],
      "allocationRules": {},
      "vehicleNotes": []
    }
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

### `meta.treasuryGuidance` (optional nhưng nên duy trì)

Dùng để lưu định hướng điều hành treasury chung của dashboard, giúp phần UI và AI context đọc thống nhất cùng một logic phân bổ.

```json
{
  "orientation": [
    "An toàn thanh khoản",
    "Đa dạng phân bổ",
    "Tối ưu lợi suất"
  ],
  "decisionAxes": [
    "Mục đích và nhu cầu sử dụng vốn",
    "Kỳ hạn sử dụng vốn"
  ],
  "allocationRules": {
    "atOrAbove6Months": {
      "label": "Kỳ hạn >= 6 tháng",
      "rule": "Ưu tiên tiền gửi tiết kiệm tại ngân hàng",
      "selectionPriority": [
        "Lợi suất tốt nhất",
        "Biên vay lại thấp"
      ]
    },
    "under6Months": {
      "label": "Kỳ hạn < 6 tháng",
      "rule": "Ưu tiên sản phẩm tài chính ngắn hạn có cam kết mua lại",
      "selectionPriority": [
        "Thanh khoản",
        "Lợi suất"
      ]
    }
  },
  "vehicleNotes": [
    {
      "name": "REPO / cam kết mua lại",
      "summary": "Dùng cho tiền 1-6 tháng",
      "details": "Có thể triển khai qua CTCK như VNDirect hoặc LPBS nếu được đánh giá phù hợp"
    },
    {
      "name": "Chứng chỉ tiền gửi / sản phẩm bank",
      "summary": "Làm trực tiếp với ngân hàng",
      "details": "Thanh khoản thường cao hơn nhưng lợi suất thấp hơn nhóm REPO"
    }
  ]
}
```

Quy ước đọc:
- `orientation` = thứ tự ưu tiên điều hành tổng thể.
- `decisionAxes` = 2 trục bắt buộc khi giải thích phương án treasury.
- `allocationRules.atOrAbove6Months` = rule cứng cho vốn có thể khóa từ 6 tháng trở lên.
- `allocationRules.under6Months` = rule cứng cho vốn nhàn rỗi 1-6 tháng.
- `vehicleNotes` = phần chú giải khác nhau giữa REPO / cam kết mua lại và sản phẩm ngắn hạn làm trực tiếp với bank.

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
    "updatedAt": "2026-04-21T11:35:00+07:00",
    "hasHistory": false,
    "source": "Google Sheets / Loan-BIDV / Loan-SC",
    "abbreviationDefinitions": {
      "BIDV TN": "BIDV chi nhánh Thống Nhất",
      "BIDV TS": "BIDV chi nhánh Trường Sơn",
      "BIDV TN — Thấu chi": "Khoản vay thấu chi tại BIDV chi nhánh Thống Nhất",
      "BIDV TS — Thấu chi": "Khoản vay thấu chi tại BIDV chi nhánh Trường Sơn"
    },
    "reportingGuidance": {
      "bidvOverdraftGrouping": "Nếu dữ liệu BIDV thấu chi đã có branchName/reportingGroupLabel thì phải gọi theo tên chi nhánh đầy đủ, không dùng nhãn thứ tự như nhóm thứ nhất/thứ hai.",
      "preferExplicitBranchName": true,
      "forbidOrdinalGroupLabelsWhenBranchKnown": true
    }
  },
  "bidvOverdraft": [],
  "bidvOverdraftGroups": [],
  "bidvWorkingCapital": [],
  "scWorkingCapital": [],
  "companyDeposits": []
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
  "notes": "Khoản hạn mức thấu chi, ngày đến hạn chung.",
  "branchCode": "TN",
  "branchName": "BIDV chi nhánh Thống Nhất",
  "reportingGroupCode": "bidv-overdraft-tn",
  "reportingGroupLabel": "Ngân hàng BIDV — chi nhánh Thống Nhất (nhóm thấu chi)"
}
```

### `bidvOverdraftGroups[]`
```json
{
  "groupCode": "bidv-overdraft-tn",
  "branchCode": "TN",
  "branchName": "BIDV chi nhánh Thống Nhất",
  "displayLabel": "Ngân hàng BIDV — chi nhánh Thống Nhất (nhóm thấu chi)",
  "loanCodes": [
    "1440280147",
    "1440328001",
    "8610037624"
  ],
  "totalOutstanding": 16784821047,
  "totalAvailableLimit": 16804564253
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

### `companyDeposits[]`
```json
{
  "bank": "BIDV-TrSon",
  "company": "VIHALI",
  "owner": "Vihali",
  "depositCode": "814003085258",
  "payoutType": "Cuối kỳ",
  "principal": 4956962302,
  "openDate": "2026-02-21",
  "maturityDate": "2027-02-21",
  "interestRate": 6.2,
  "bookAmount": 4956962302,
  "accruedInterest": 307331663,
  "projectedSettlement": 5264293965,
  "pledgedAmount": 4956962302,
  "unpledgedAmount": 0,
  "notes": "Thế chấp cho hạn mức thấu chi."
}
```

---

## 3) Quy ước cập nhật
- **Lãi suất**: cập nhật vào `rates-history.json`
- **Dư nợ vay công ty**: cập nhật snapshot mới nhất vào `company-loans-current.json`
- **Không lưu lịch sử** cho phần dư nợ vay công ty

---

## 4) Quy ước highlight cho Monthly Plans
Áp dụng cho phần card tóm tắt trên index/live page của kế hoạch tháng.

### Cá nhân — kế hoạch tháng
- **`Tổng tiền gửi/giấy tờ có giá`**
  - công thức: **Mục 1. Tiền gửi đầu kỳ + Mục 3. Thanh khoản đầu kỳ**
- **`Dư nợ vay đầu kỳ`**
  - lấy theo **Mục 2. Dư nợ vay đầu kỳ**
  - không được ghi nhãn **`Dư nợ vay cuối kỳ`** nếu chưa có chỉ tiêu cuối kỳ riêng
- **`Tăng / giảm`**
  - chỉ phản ánh tăng/giảm thực
  - **không tính cơ cấu lại nội bộ** là tăng/giảm

### Nguyên tắc đặt nhãn
- Tên highlight trên card phải bám đúng tên chỉ tiêu gốc trong kế hoạch.
- Nếu là chỉ tiêu opening balance thì ưu tiên dùng nhãn **`đầu kỳ`**.
- Chỉ dùng nhãn **`cuối kỳ`** khi dữ liệu thực sự là closing balance của chỉ tiêu đó.
