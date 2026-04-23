window.MONTHLY_PLANS_TEST_DATA = {
  meta: {
    name: "Treasury Monthly Plans Test Index",
    updatedAt: "2026-04-23T10:08:00+07:00",
    generatedBy: "Vesper",
    defaultMonth: "2026-04",
    storageMode: "browser-local-storage-for-test",
    designatedApproverEmail: "nguyen.khuong@atherlabs.com",
    note: "Bản test Pha 1 để anh Nguyên xem concept kế hoạch tháng trên Index trước khi nhập vào dashboard chính."
  },
  availableMonths: [
    {
      key: "2026-04",
      label: "Tháng 4/2026",
      periodLabel: "01/04/2026 - 15/05/2026",
      status: "ready-for-review"
    }
  ],
  months: {
    "2026-04": {
      monthLabel: "Tháng 4/2026",
      periodLabel: "01/04/2026 - 15/05/2026",
      company: {
        id: "2026-04-company",
        type: "company",
        title: "Kế hoạch dòng tiền & hạn mức thấu chi khả dụng",
        status: "draft",
        version: "1.5",
        owner: "Finance Team",
        approver: "CFO",
        preparedAt: "07/04/2026 10:31 GMT+7",
        highlights: [
          { label: "Dòng tiền vào kế hoạch", value: "16.8 tỷ VND" },
          { label: "Tổng chi kế hoạch", value: "20.497 tỷ VND" },
          { label: "Số dư cuối kỳ", value: "2.232 tỷ VND" },
          { label: "Thanh khoản", value: "An toàn có kiểm soát" }
        ],
        contentHash: "sha256:test-company-2026-04-v1-5",
        sourceHtml: "./plans/2026-04/company.html",
        sourceMarkdown: "../Kế hoạch ngân quỹ/Tháng 4-2026/KE_HOACH_DONG_TIEN_VA_HAN_MUC_THAU_CHI_KHA_DUNG_01-04-2026_15-05-2026.md",
        sourcePdf: "../Kế hoạch ngân quỹ/Tháng 4-2026/KE_HOACH_DONG_TIEN_VA_HAN_MUC_THAU_CHI_KHA_DUNG_01-04-2026_15-05-2026.pdf"
      },
      personal: {
        id: "2026-04-personal",
        type: "personal",
        title: "Kế hoạch quản lý Individual Treasury",
        status: "draft",
        version: "1.0",
        owner: "Finance Team",
        approver: "CFO",
        preparedAt: "07/04/2026 10:31 GMT+7",
        highlights: [
          { label: "Tổng tiền gửi", value: "105.836 tỷ VND" },
          { label: "Thanh khoản tài khoản", value: "21.882 tỷ VND" },
          { label: "Số dư VPB cuối kỳ", value: "1.959 tỷ VND" },
          { label: "Thanh khoản", value: "An toàn" }
        ],
        contentHash: "sha256:test-personal-2026-04-v1-0",
        sourceHtml: "./plans/2026-04/personal.html",
        sourceMarkdown: "../Kế hoạch ngân quỹ/Tháng 4-2026/KE_HOACH_QUAN_LY_INDIVIDUAL_TREASURY_01-04-2026_15-05-2026.md",
        sourcePdf: "../Kế hoạch ngân quỹ/Tháng 4-2026/KE_HOACH_QUAN_LY_INDIVIDUAL_TREASURY_01-04-2026_15-05-2026.pdf"
      },
      automationPreview: {
        nextDraftWindow: "25-28 hằng tháng",
        expectedOutput: "Tạo draft kế hoạch công ty + cá nhân tháng sau và chờ CFO review"
      }
    }
  }
};
