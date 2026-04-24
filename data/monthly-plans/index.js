window.MONTHLY_PLANS_TEST_DATA = {
  meta: {
    name: "Treasury Monthly Plans Test Index",
    updatedAt: "2026-04-24T10:13:00+07:00",
    generatedBy: "Vesper",
    defaultMonth: "2026-05",
    storageMode: "browser-local-storage-for-test",
    makerEmail: "nguyen.khuong@atherlabs.com",
    designatedApproverEmail: "duc.ho@atherlabs.com",
    slackApprovalTarget: {
      channelName: "#treasury-management",
      channelId: "C0AT2E4CBDX",
      botUsername: "vesper_treasury"
    },
    note: "Bản test để anh Nguyên xem concept kế hoạch tháng trên Index trước khi nhập vào dashboard chính.",
    personalHighlightRules: {
      totalDepositAndPapersOpening: "Luôn lấy Mục 1. Tiền gửi đầu kỳ cộng Mục 3. Thanh khoản đầu kỳ.",
      openingDebtLabel: "Luôn dùng nhãn 'Dư nợ vay đầu kỳ' theo Mục 2, không ghi 'cuối kỳ' nếu chưa có chỉ tiêu cuối kỳ riêng."
    }
  },
  availableMonths: [
    {
      key: "2026-05",
      label: "Tháng 5/2026",
      periodLabel: "01/05/2026 - 15/06/2026",
      status: "draft"
    },
    {
      key: "2026-04",
      label: "Tháng 4/2026",
      periodLabel: "01/04/2026 - 15/05/2026",
      status: "approved"
    }
  ],
  months: {
    "2026-05": {
      monthLabel: "Tháng 5/2026",
      periodLabel: "01/05/2026 - 15/06/2026",
      company: {
        id: "2026-05-company",
        type: "company",
        title: "Kế hoạch dòng tiền & hạn mức thấu chi khả dụng",
        status: "draft",
        version: "Draft 2",
        owner: "Finance Team",
        approver: "CFO",
        preparedAt: "23/04/2026 12:20 GMT+7",
        highlights: [
          { label: "HM khả dụng đầu kỳ", value: "13.938 tỷ VND" },
          { label: "Thu DOPA 26/05", value: "3.790 tỷ VND" },
          { label: "Số dư cuối kỳ", value: "2.881 tỷ VND" },
          { label: "Thanh khoản", value: "Mỏng nhất 2.158 tỷ ngày 19/05" }
        ],
        contentHash: "sha256:test-company-2026-05-draft2",
        sourceHtml: "./plans/2026-05/company.html",
        sourceMarkdown: "../Kế hoạch ngân quỹ/Tháng 5-2026/KE_HOACH_DONG_TIEN_VA_HAN_MUC_THAU_CHI_KHA_DUNG_01-05-2026_15-06-2026.md"
      },
      personal: {
        id: "2026-05-personal",
        type: "personal",
        title: "Kế hoạch quản lý Individual Treasury",
        status: "draft",
        version: "Draft 1",
        owner: "Finance Team",
        approver: "CFO",
        preparedAt: "23/04/2026 13:56 GMT+7",
        highlights: [
          { label: "Tổng tiền gửi/giấy tờ có giá", value: "127.896 tỷ VND" },
          { label: "Tăng / giảm", value: "0 VND" },
          { label: "Dư nợ vay đầu kỳ", value: "27.250 tỷ VND" },
          { label: "Thanh khoản VPBank", value: "1.031 tỷ VND" }
        ],
        contentHash: "sha256:test-personal-2026-05-draft1",
        sourceHtml: "./plans/2026-05/personal.html",
        sourceMarkdown: "../Kế hoạch ngân quỹ/Tháng 5-2026/KE_HOACH_QUAN_LY_INDIVIDUAL_TREASURY_01-05-2026_15-06-2026.md"
      },
      automationPreview: {
        nextDraftWindow: "25-28 hằng tháng",
        expectedOutput: "Draft công ty tháng 5 đã dựng; phần cá nhân sẽ bổ sung sau khi anh Nguyên chốt tiếp."
      }
    },
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
          { label: "Số dư cuối kỳ", value: "2.457 tỷ VND" },
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
