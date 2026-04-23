window.MONTHLY_PLANS_LIVE_DATA = {
  meta: {
    name: "Treasury Monthly Plans Live Index",
    updatedAt: "2026-04-23T19:02:00+07:00",
    defaultMonth: "2026-05",
    reviewTestEmail: "duc.ho@atherlabs.com",
    note: "Chọn tháng kế hoạch để xem, in báo cáo hoặc trình CFO."
  },
  availableMonths: [
    {
      key: "2026-05",
      label: "Tháng 5/2026",
      periodLabel: "01/05/2026 - 15/06/2026"
    },
    {
      key: "2026-04",
      label: "Tháng 4/2026",
      periodLabel: "01/04/2026 - 15/05/2026"
    }
  ],
  months: {
    "2026-05": {
      monthLabel: "Tháng 5/2026",
      periodLabel: "01/05/2026 - 15/06/2026",
      company: {
        id: "2026-05-company",
        type: "company",
        title: "Kế hoạch ngân quỹ VIHALI",
        version: "Draft 2",
        preparedAt: "23/04/2026 12:20 GMT+7",
        status: "ready_for_cfo",
        allowSendToCfo: true,
        highlights: [
          { label: "Hạn mức khả dụng đầu kỳ", value: "13.938 tỷ VND" },
          { label: "Dòng tiền trong kỳ", value: "Thu 3.790 tỷ · Chi 14.847 tỷ" },
          { label: "Hạn mức khả dụng cuối kỳ", value: "2.881 tỷ VND" },
          { label: "Thanh khoản", value: "Mỏng nhất 223 triệu ngày 29/05" }
        ],
        sourceHtml: "./plans/2026-05/company.html",
        sourcePdf: "./plans/2026-05/company.pdf",
        timeline: []
      },
      personal: {
        id: "2026-05-personal",
        type: "personal",
        title: "Kế hoạch ngân quỹ CÁ NHÂN",
        version: "Draft 1",
        preparedAt: "23/04/2026 13:56 GMT+7",
        status: "ready_for_cfo",
        allowSendToCfo: true,
        highlights: [
          { label: "Tiền gửi đầu kỳ", value: "122.249 tỷ VND" },
          { label: "Tăng / giảm", value: "0 VND" },
          { label: "Dư nợ vay cuối kỳ", value: "27.250 tỷ VND" },
          { label: "Thanh khoản VPBank", value: "1.031 tỷ VND" }
        ],
        sourceHtml: "./plans/2026-05/personal.html",
        sourcePdf: "./plans/2026-05/personal.pdf",
        timeline: []
      }
    },
    "2026-04": {
      monthLabel: "Tháng 4/2026",
      periodLabel: "01/04/2026 - 15/05/2026",
      company: {
        id: "2026-04-company",
        type: "company",
        title: "Kế hoạch ngân quỹ VIHALI",
        version: "1.5",
        preparedAt: "07/04/2026 10:31 GMT+7",
        approvedAt: "23/04/2026 11:13 GMT+7",
        approvedBy: "nguyen.khuong@atherlabs.com",
        status: "approved",
        highlights: [
          { label: "Dòng tiền vào kế hoạch", value: "16.8 tỷ VND" },
          { label: "Tổng chi kế hoạch", value: "20.497 tỷ VND" },
          { label: "Số dư cuối kỳ", value: "2.457 tỷ VND" },
          { label: "Thanh khoản", value: "An toàn có kiểm soát" }
        ],
        sourceHtml: "./plans/2026-04/company.html",
        sourcePdf: "./plans/2026-04/company.pdf",
        timeline: [
          {
            type: "cfo_reviewed",
            label: "CFO duyệt",
            at: "23/04/2026 11:13 GMT+7",
            note: "CFO đã xem xét và chấp thuận kế hoạch công ty tháng 4/2026."
          },
          {
            type: "published",
            label: "Đưa lên live page",
            at: "23/04/2026 11:13 GMT+7",
            note: "Kế hoạch công ty đã được đưa lên GitHub Pages."
          }
        ]
      },
      personal: {
        id: "2026-04-personal",
        type: "personal",
        title: "Kế hoạch ngân quỹ CÁ NHÂN",
        version: "1.0",
        preparedAt: "07/04/2026 10:31 GMT+7",
        approvedAt: "23/04/2026 11:13 GMT+7",
        approvedBy: "nguyen.khuong@atherlabs.com",
        status: "approved",
        highlights: [
          { label: "Tổng tiền gửi", value: "105.836 tỷ VND" },
          { label: "Thanh khoản tài khoản", value: "21.882 tỷ VND" },
          { label: "Số dư VPB cuối kỳ", value: "1.959 tỷ VND" },
          { label: "Thanh khoản", value: "An toàn" }
        ],
        sourceHtml: "./plans/2026-04/personal.html",
        sourcePdf: "./plans/2026-04/personal.pdf",
        timeline: [
          {
            type: "cfo_reviewed",
            label: "CFO duyệt",
            at: "23/04/2026 11:13 GMT+7",
            note: "CFO đã chấp thuận kế hoạch cá nhân tháng 4/2026."
          },
          {
            type: "published",
            label: "Đưa lên live page",
            at: "23/04/2026 11:13 GMT+7",
            note: "Kế hoạch cá nhân đã được đưa lên GitHub Pages."
          }
        ]
      }
    }
  }
};
