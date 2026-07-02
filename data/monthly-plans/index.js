window.MONTHLY_PLANS_TEST_DATA = {
  meta: {
    name: "Treasury Monthly Plans Test Index",
    updatedAt: "2026-07-02T11:06:00+07:00",
    generatedBy: "Vesper",
    defaultMonth: "2026-07",
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
      totalDepositAndPapersOpening: "Nếu card đang hiển thị 'Tổng tiền gửi/giấy tờ có giá' theo form tháng 5 thì phải lấy Mục 1. Tiền gửi đầu kỳ cộng Mục 3. Thanh khoản đầu kỳ.",
      openingLiquidity: "Nếu card đang thể hiện riêng 'Thanh khoản đầu kỳ' thì phải lấy đúng tổng ở Mục 3. Thanh khoản đầu kỳ, không được gán nhầm sang tổng tiền gửi/giấy tờ có giá.",
      openingDebtLabel: "Luôn dùng nhãn 'Dư nợ vay đầu kỳ' theo Mục 2, không ghi 'cuối kỳ' nếu chưa có chỉ tiêu cuối kỳ riêng."
    }
  },
  availableMonths: [
    {
      key: "2026-07",
      label: "Tháng 7/2026",
      periodLabel: "01/07/2026 - 15/08/2026",
      status: "draft"
    },
    {
      key: "2026-06",
      label: "Tháng 6/2026",
      periodLabel: "01/06/2026 - 15/07/2026",
      status: "draft"
    },
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
    "2026-07": {
      monthLabel: "Tháng 7/2026",
      periodLabel: "01/07/2026 - 15/08/2026",
      company: {
        id: "2026-07-company",
        type: "company",
        title: "Kế hoạch dòng tiền & hạn mức thấu chi khả dụng",
        status: "draft",
        version: "Draft 3",
        owner: "Finance Team",
        approver: "CFO",
        preparedAt: "02/07/2026 11:29 GMT+7",
        highlights: [
          { label: "HM khả dụng đầu kỳ", value: "12.086 tỷ VND" },
          { label: "Thu DOPA 06/07", value: "3.153 tỷ VND" },
          { label: "Số dư cuối kỳ", value: "10.106 tỷ VND" },
          { label: "Thanh khoản", value: "Mỏng nhất 11.766 tỷ ngày 03/07" }
        ],
        contentHash: "sha256:test-company-2026-07-draft3",
        sourceHtml: "./plans/2026-07/company.html",
        sourceMarkdown: "../Kế hoạch ngân quỹ/Tháng 7-2026/KE_HOACH_DONG_TIEN_VA_HAN_MUC_THAU_CHI_KHA_DUNG_01-07-2026_15-08-2026.md"
      },
      personal: {
        id: "2026-07-personal",
        type: "personal",
        title: "Kế hoạch quản lý Individual Treasury",
        status: "draft",
        version: "Waiting",
        owner: "Finance Team",
        approver: "CFO",
        preparedAt: "02/07/2026 11:06 GMT+7",
        highlights: [
          { label: "Trạng thái", value: "Chờ cập nhật" },
          { label: "Tiền gửi", value: "Chưa dựng draft" },
          { label: "Dư nợ vay", value: "Chưa dựng draft" },
          { label: "Thanh khoản", value: "Chờ anh Nguyên chốt tiếp" }
        ],
        contentHash: "sha256:test-personal-2026-07-placeholder",
        sourceHtml: "./plans/2026-07/personal.html",
        sourceMarkdown: "../Kế hoạch ngân quỹ/Tháng 7-2026/"
      },
      automationPreview: {
        nextDraftWindow: "25-28 hằng tháng",
        expectedOutput: "Draft công ty tháng 7 đã dựng; phần cá nhân đang chờ cập nhật tiếp."
      }
    },
    "2026-06": {
      monthLabel: "Tháng 6/2026",
      periodLabel: "01/06/2026 - 15/07/2026",
      company: {
        id: "2026-06-company",
        type: "company",
        title: "Kế hoạch dòng tiền & hạn mức thấu chi khả dụng",
        status: "draft",
        version: "Draft 3",
        owner: "Finance Team",
        approver: "CFO",
        preparedAt: "01/06/2026 14:11 GMT+7",
        highlights: [
          { label: "HM khả dụng đầu kỳ", value: "3.915 tỷ VND" },
          { label: "Thu DOPA 10/06", value: "3.283 tỷ VND" },
          { label: "Số dư cuối kỳ", value: "2.825 tỷ VND" },
          { label: "Thanh khoản", value: "Mỏng nhất 2.785 tỷ ngày 09/06" }
        ],
        contentHash: "sha256:test-company-2026-06-draft3",
        sourceHtml: "./plans/2026-06/company.html",
        sourceMarkdown: "../Kế hoạch ngân quỹ/Tháng 6-2026/KE_HOACH_DONG_TIEN_VA_HAN_MUC_THAU_CHI_KHA_DUNG_01-06-2026_15-07-2026.md"
      },
      personal: {
        id: "2026-06-personal",
        type: "personal",
        title: "Kế hoạch quản lý Individual Treasury",
        status: "draft",
        version: "Draft 5",
        owner: "Finance Team",
        approver: "CFO",
        preparedAt: "01/06/2026 17:23 GMT+7",
        highlights: [
          { label: "Tổng tiền gửi/giấy tờ có giá", value: "125.513 tỷ VND" },
          { label: "Thanh khoản mỏng nhất", value: "0.310 tỷ ngày 15/06" },
          { label: "Dư nợ vay đầu kỳ", value: "27.000 tỷ VND" },
          { label: "Thanh khoản VPBank", value: "0.639 tỷ VND" }
        ],
        contentHash: "sha256:test-personal-2026-06-draft5",
        sourceHtml: "./plans/2026-06/personal.html",
        sourceMarkdown: "../Kế hoạch ngân quỹ/Tháng 6-2026/KE_HOACH_QUAN_LY_INDIVIDUAL_TREASURY_01-06-2026_15-07-2026.md"
      },
      automationPreview: {
        nextDraftWindow: "25-28 hằng tháng",
        expectedOutput: "Draft công ty và cá nhân tháng 6 đã dựng để anh Nguyên rà trước khi trình CFO."
      }
    },
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
