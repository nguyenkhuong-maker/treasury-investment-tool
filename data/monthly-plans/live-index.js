window.MONTHLY_PLANS_LIVE_DATA = {
  meta: {
    name: "Treasury Monthly Plans Live Index",
    updatedAt: "2026-04-23T11:13:00+07:00",
    defaultMonth: "2026-04",
    approverEmail: "nguyen.khuong@atherlabs.com",
    note: "Kế hoạch tháng 4/2026 đã được CFO duyệt trước khi đưa lên live page."
  },
  availableMonths: [
    {
      key: "2026-04",
      label: "Tháng 4/2026",
      periodLabel: "01/04/2026 - 15/05/2026"
    }
  ],
  months: {
    "2026-04": {
      monthLabel: "Tháng 4/2026",
      periodLabel: "01/04/2026 - 15/05/2026",
      governanceNote: "Đã được CFO duyệt trước khi go-live trên GitHub Pages.",
      company: {
        id: "2026-04-company",
        type: "company",
        title: "Kế hoạch dòng tiền & hạn mức thấu chi khả dụng",
        version: "1.5",
        owner: "Finance Team",
        approver: "CFO",
        preparedAt: "07/04/2026 10:31 GMT+7",
        approvedAt: "23/04/2026 11:13 GMT+7",
        approvedBy: "nguyen.khuong@atherlabs.com",
        status: "approved",
        highlights: [
          { label: "Dòng tiền vào kế hoạch", value: "16.8 tỷ VND" },
          { label: "Tổng chi kế hoạch", value: "20.497 tỷ VND" },
          { label: "Số dư cuối kỳ", value: "2.232 tỷ VND" },
          { label: "Thanh khoản", value: "An toàn có kiểm soát" }
        ],
        sourceHtml: "./plans/2026-04/company.html",
        sourcePdf: "../Kế hoạch ngân quỹ/Tháng 4-2026/KE_HOACH_DONG_TIEN_VA_HAN_MUC_THAU_CHI_KHA_DUNG_01-04-2026_15-05-2026.pdf",
        timeline: [
          {
            type: "draft_ready",
            label: "Draft hoàn chỉnh",
            at: "07/04/2026 10:31 GMT+7",
            note: "Finance Team hoàn tất bản kế hoạch công ty version 1.5."
          },
          {
            type: "cfo_reviewed",
            label: "CFO review hoàn tất",
            at: "23/04/2026 11:13 GMT+7",
            note: "CFO đã xem xét và chấp thuận kế hoạch công ty tháng 4/2026."
          },
          {
            type: "published",
            label: "Đưa lên live page",
            at: "23/04/2026 11:13 GMT+7",
            note: "Kế hoạch công ty được đưa lên GitHub Pages trong mục Kế hoạch."
          }
        ]
      },
      personal: {
        id: "2026-04-personal",
        type: "personal",
        title: "Kế hoạch quản lý Individual Treasury",
        version: "1.0",
        owner: "Finance Team",
        approver: "CFO",
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
        sourcePdf: "../Kế hoạch ngân quỹ/Tháng 4-2026/KE_HOACH_QUAN_LY_INDIVIDUAL_TREASURY_01-04-2026_15-05-2026.pdf",
        timeline: [
          {
            type: "draft_ready",
            label: "Draft hoàn chỉnh",
            at: "07/04/2026 10:31 GMT+7",
            note: "Finance Team hoàn tất bản kế hoạch cá nhân tháng 4/2026."
          },
          {
            type: "cfo_reviewed",
            label: "CFO review hoàn tất",
            at: "23/04/2026 11:13 GMT+7",
            note: "CFO đã chấp thuận kế hoạch cá nhân trước khi live."
          },
          {
            type: "published",
            label: "Đưa lên live page",
            at: "23/04/2026 11:13 GMT+7",
            note: "Kế hoạch cá nhân được công bố cùng trang live kế hoạch tháng 4/2026."
          }
        ]
      }
    }
  }
};
