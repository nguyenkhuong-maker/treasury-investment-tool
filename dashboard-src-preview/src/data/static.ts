export {
  LOANS, PERSONAL_DEPOSITS, COMPANY_DEPOSITS, CARDS, RATE_WEEKS, BIDV_VLD_LIMIT, SC_LIMIT,
  CRYPTO_PRICES, CRYPTO_TOKENS, WALLETS, CRYPTO_TOTAL, CRYPTO_HISTORY,
  PLAN_MONTHS, PLAN_INPUTS, APPROVALS, PLAN_HIGHLIGHTS, CONTRACT_LINKS, CONTRACT_DEFAULTS, META, BALANCE, PLAN_ACTUALS, ACTUALS_AT,
} from './store';
export type { CreditCard, Balance, RunwayCase, MonthActual, ActualRow, ActualPlanLine, Loan, Deposit, Wallet, Entity, Source, PlanLine, Recurring, PlanInputs, ApprovalStatus, TLEvent, PlanApproval, PlanMonth, PlanMode, ArchivePlan, ArchiveBlock } from './store';
import type { Source, ApprovalStatus } from './store';

export const LOAN_GROUPS = [
  { key: 'bidv-od-tn', label: 'BIDV thấu chi · CN Thống Nhất', short: 'BIDV TN thấu chi', type: 'Thấu chi', color: 'hsl(var(--c1))' },
  { key: 'bidv-od-ts', label: 'BIDV thấu chi · CN Trường Sơn', short: 'BIDV TS thấu chi', type: 'Thấu chi', color: 'hsl(var(--c2))' },
  { key: 'bidv-vld', label: 'BIDV vốn lưu động', short: 'BIDV VLĐ', type: 'Vốn lưu động', color: 'hsl(var(--c3))' },
  { key: 'sc-vld', label: 'Standard Chartered vốn lưu động', short: 'SC VLĐ', type: 'Vốn lưu động', color: 'hsl(var(--c4))' },
  { key: 'card', label: 'Thẻ tín dụng', short: 'Thẻ tín dụng', type: 'Thẻ tín dụng', color: 'hsl(var(--c7))' },
] as const;

export const SOURCE_LABEL: Record<Source, string> = {
  loan: 'Từ tab Vihali', deposit: 'Từ tab Cá nhân', carry: 'Kế thừa tháng trước', recurring: 'Định kỳ', adhoc: 'Phát sinh', interest: 'Ước tính lãi BIDV',
};
export const STATUS_LABEL: Record<ApprovalStatus, string> = {
  draft: 'Chưa trình', pending_cfo_review: 'Chờ CFO duyệt', revision_requested: 'CFO yêu cầu chỉnh sửa', approved: 'CFO đã duyệt',
};
