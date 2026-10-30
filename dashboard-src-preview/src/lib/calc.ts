import { LOANS, PERSONAL_DEPOSITS, COMPANY_DEPOSITS } from '@/data/static';
import { LOAN_GROUPS, BIDV_VLD_LIMIT, SC_LIMIT, PLAN_MONTHS, PLAN_INPUTS } from '@/data/static';
import type { PlanLine, Recurring } from '@/data/static';

export const loansOf = (g: string) => LOANS.filter(l => l.group === g);
type GroupSummary = (typeof LOAN_GROUPS)[number] & { count: number; out: number; hm: number; rate: number; next: (typeof LOANS)[number] | undefined };
export let GROUP_SUMMARY: GroupSummary[] = [];
export let LOAN_TOTAL = 0;
export let HM_TOTAL = 0;
export let OD_HM = 0;
export let PERSONAL_TOTAL = 0;
export let PLEDGED_TOTAL = 0;

/* Gọi lại sau khi tải dữ liệu */
export function recompute() {
  GROUP_SUMMARY = LOAN_GROUPS.map(g => {
    const ls = loansOf(g.key);
    const out = ls.reduce((a, l) => a + l.principal, 0);
    const hm = g.key === 'bidv-vld' ? BIDV_VLD_LIMIT : g.key === 'sc-vld' ? SC_LIMIT : ls.reduce((a, l) => a + (l.limit || 0), 0);
    const wRate = ls.reduce((a, l) => a + l.rate * l.principal, 0) / (out || 1);
    const next = [...ls].sort((a, b) => a.due.localeCompare(b.due))[0];
    return { ...g, count: ls.length, out, hm, rate: wRate, next };
  });
  LOAN_TOTAL = GROUP_SUMMARY.reduce((a, g) => a + g.out, 0);
  HM_TOTAL = GROUP_SUMMARY.reduce((a, g) => a + g.hm, 0);
  OD_HM = GROUP_SUMMARY.filter(g => g.key.startsWith('bidv-od')).reduce((a, g) => a + g.hm, 0);
  PERSONAL_TOTAL = PERSONAL_DEPOSITS.reduce((a, d) => a + d.principal, 0);
  PLEDGED_TOTAL = PERSONAL_DEPOSITS.filter(d => d.pledged).reduce((a, d) => a + d.principal, 0);
}
export const loanGroupOf = (code: string) => LOANS.find(l => l.code === code)?.group;

/* Cấu trúc bảo đảm: nguồn tài sản đảm bảo → nhóm nợ */
export function collateralFlows() {
  const src: Record<string, { label: string; sub: string; amount: number; tone: string }> = {
    'p-bidv': { label: 'Sổ cá nhân BIDV TN', sub: 'Cá nhân · cầm cố', amount: 0, tone: 'hsl(var(--c1))' },
    'c-bidv': { label: 'Sổ công ty BIDV TS', sub: 'Vihali · cầm cố', amount: 0, tone: 'hsl(var(--c2))' },
    'p-sc': { label: 'Sổ cá nhân SC', sub: 'Cá nhân · cầm cố', amount: 0, tone: 'hsl(var(--c4))' },
    'none': { label: 'Chưa gắn TSĐB', sub: 'Theo dữ liệu sheet', amount: 0, tone: 'hsl(var(--c6))' },
  };
  const links: Record<string, number> = {};
  const add = (s: string, g: string, v: number) => { links[s + '|' + g] = (links[s + '|' + g] || 0) + v; src[s].amount += v; };
  PERSONAL_DEPOSITS.filter(d => d.pledged).forEach(d => {
    const gs = [...new Set(d.loans.map(loanGroupOf).filter(Boolean))] as string[];
    if (!gs.length) return;
    const s = d.bank.startsWith('SC') ? 'p-sc' : 'p-bidv';
    gs.forEach(g => add(s, g, d.principal / gs.length));
  });
  COMPANY_DEPOSITS.forEach(d => {
    const gs = [...new Set(d.loans.map(loanGroupOf).filter(Boolean))] as string[];
    gs.forEach(g => add('c-bidv', g, d.principal / gs.length));
  });
  LOANS.filter(l => !l.deposits.length).forEach(l => add('none', l.group, l.principal));
  return { src, links };
}

/* Kế hoạch: khoản đến hạn lấy từ các tab + kế thừa + định kỳ + phát sinh (từ file nhập liệu tháng) */
export function buildPlan(monthKey: string, recurring: Recurring[], adhoc: PlanLine[], carry?: PlanLine[]): PlanLine[] {
  const m = PLAN_MONTHS.find(x => x.key === monthKey);
  if (!m) return [];
  const inP = (d?: string | null) => !!d && d >= m.from && d <= m.to;
  const lines: PlanLine[] = [];
  LOANS.filter(l => inP(l.due)).forEach(l => lines.push({
    id: 'L' + l.code, date: l.due, entity: 'vihali', dir: 'out', label: `Trả nợ ${l.bank} ${l.code}`, amount: l.settle, source: 'loan',
    note: `Gốc ${l.principal.toLocaleString('en-US')} · LS ${l.rate}%`,
  }));
  PERSONAL_DEPOSITS.filter(d => inP(d.due)).forEach(d => lines.push({
    id: 'D' + d.code, date: d.due!, entity: 'personal', dir: 'in', label: `${d.bank} ${d.code} đến hạn`, amount: d.settle, source: 'deposit',
    note: `${d.owner} · gốc ${d.principal.toLocaleString('en-US')}${d.rate ? ` · LS ${d.rate}%` : ''}`,
  }));
  lines.push(...(carry ?? PLAN_INPUTS[monthKey]?.carry ?? []).filter(c => inP(c.date)));
  const months = [m.from.slice(0, 7), m.to.slice(0, 7)];
  recurring.filter(r => r.on).forEach(r => {
    months.forEach(mm => {
      const date = `${mm}-${String(r.day).padStart(2, '0')}`;
      if (!inP(date) || (r.startMonth && mm < r.startMonth)) return;
      lines.push({ id: r.id + mm, date, entity: r.entity, dir: r.dir, label: `${r.label} T${Number(mm.slice(5))}`, amount: r.amount, source: 'recurring' });
    });
  });
  lines.push(...adhoc.filter(a => inP(a.date)));
  // Lãi vay BIDV định kỳ: BIDV thu lãi hằng tháng theo dư nợ và số ngày thực tế; file theo dõi tính lãi cuối kỳ nên không dùng được
  if (!lines.some(l => l.entity === 'vihali' && /lãi vay bidv/i.test(l.label))) {
    months.forEach(mm => {
      const date = bidvInterestDate(mm);
      if (!inP(date)) return;
      const est = bidvInterestEstimate(date, bidvInterestDate(prevMonth(mm)), lines.filter(l => l.entity === 'vihali'));
      lines.push({ id: 'INT' + mm, date, entity: 'vihali', dir: 'out', label: `Lãi vay BIDV định kỳ T${Number(mm.slice(5))} (ước tính)`, amount: Math.round(est.amount), source: 'interest',
        note: `Dư nợ BIDV thấu chi + VLĐ × lãi suất × ${est.days} ngày/365${est.delta ? ` · gồm ${Math.round(est.delta).toLocaleString('en-US')} do thấu chi tăng trong kỳ (LS bq ${est.odRate.toFixed(2)}%)` : ''}` });
    });
  }
  return lines.sort((a, b) => a.date.localeCompare(b.date) || (a.dir === 'in' ? -1 : 1));
}

export function runBalance(lines: PlanLine[], entity: 'vihali' | 'personal', open: number) {
  let bal = open;
  return lines.filter(l => l.entity === entity).map(l => { bal += l.dir === 'in' ? l.amount : -l.amount; return { ...l, bal }; });
}

/* ---- Lãi vay BIDV định kỳ ----
   Ngày thu lãi: 24 hằng tháng (rơi vào thứ Bảy/Chủ nhật thì lùi về thứ Sáu).
   Ước tính = Σ dư nợ từng khế ước BIDV (thấu chi TN, TS + VLĐ BIDV) × lãi suất × số ngày nắm giữ trong kỳ / 365
            + phần thấu chi tăng thêm do các khoản chi trong kỳ × lãi suất thấu chi bình quân × số ngày còn lại / 365 */
const isoD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const prevMonth = (ym: string) => { const [y, m] = ym.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`; };
export function bidvInterestDate(ym: string) {
  const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1, 24); const w = d.getDay();
  if (w === 6) d.setDate(23); if (w === 0) d.setDate(22);
  return isoD(d);
}
const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
export function bidvInterestEstimate(payDate: string, prevPay: string, vihaliLines: PlanLine[] = []) {
  const bidv = LOANS.filter(l => l.group.startsWith('bidv'));
  let base = 0;
  bidv.forEach(l => {
    const start = l.disb && l.disb > prevPay ? l.disb : prevPay;
    const end = l.due < payDate ? l.due : payDate;
    const d = dayDiff(start, end);
    if (d > 0) base += l.principal * l.rate / 100 * d / 365;
  });
  const od = bidv.filter(l => l.group.startsWith('bidv-od'));
  const odOut = od.reduce((a, l) => a + l.principal, 0);
  const odRate = odOut ? od.reduce((a, l) => a + l.principal * l.rate, 0) / odOut : 0;
  const delta = vihaliLines.filter(l => l.date > prevPay && l.date < payDate)
    .reduce((a, l) => a + (l.dir === 'out' ? 1 : -1) * l.amount * odRate / 100 * dayDiff(l.date, payDate) / 365, 0);
  return { amount: base + delta, base, delta, odRate, days: dayDiff(prevPay, payDate) };
}
