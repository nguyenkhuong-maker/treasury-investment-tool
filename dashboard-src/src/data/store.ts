/* Dữ liệu runtime: đọc các file JSON trong repo (data/...) khi mở trang.
   Các biến export là live binding (let) và được gán trong loadAll() trước khi render. */

export interface Loan {
  code: string; group: string; bank: 'BIDV' | 'SC'; disb: string | null; due: string; rate: number;
  principal: number; interest: number; settle: number; limit: number | null; deposits: string[];
}
export interface Deposit {
  owner: string; bank: string; code: string; type: string; principal: number; rate: number | null;
  open: string | null; due: string | null; pledged: boolean; settle: number; loans: string[];
}
export interface CompanyDeposit { bank: string; code: string; principal: number; rate: number; open: string; due: string; settle: number; loans: string[] }
export interface Wallet { grp: string; name: string; ent: string; chain: string; type: string; addr: string; st: number; btc: number; eth: number; oth: number; tot: number }
export interface Token { k: string; v: number; qty: number; c: string }
export type Entity = 'vihali' | 'personal';
export type Source = 'loan' | 'deposit' | 'carry' | 'recurring' | 'adhoc';
export interface PlanLine { id: string; date: string; entity: Entity; dir: 'in' | 'out'; label: string; amount: number; source: Source; note?: string }
export interface Recurring { id: string; label: string; entity: Entity; dir: 'in' | 'out'; day: number; amount: number; seen: string; on: boolean; startMonth?: string }
export interface PlanInputs {
  month: string; version: string; updatedAt?: string;
  opening: { vihali: number; personal: number; vihaliNote?: string; personalNote?: string };
  carry: PlanLine[]; recurring: Recurring[]; adhoc: PlanLine[];
  /* Ảnh chụp kế hoạch tại lần lưu/trình CFO gần nhất, dùng khi tháng đã qua */
  snapshot?: { savedAt: string; opening: { vihali: number; personal: number }; lines: PlanLine[] };
}
export type ApprovalStatus = 'draft' | 'pending_cfo_review' | 'revision_requested' | 'approved';
export interface TLEvent { at: string; kind: 'draft' | 'submit' | 'revise' | 'approve'; text: string }
export interface PlanApproval { version: string; status: ApprovalStatus; events: TLEvent[] }
export type PlanMode = 'live' | 'snapshot' | 'archive';
export interface PlanMonth { key: string; label: string; from: string; to: string; live: boolean; mode: PlanMode }
export interface ArchiveCell { t: string; b: boolean; n: boolean }
export type ArchiveBlock = { type: 'h'; level: number; text: string } | { type: 'p'; text: string } | { type: 'ul'; items: string[] } | { type: 'table'; head: string[]; rows: ArchiveCell[][] };
export interface ArchivePlan { title: string; meta: string; blocks: ArchiveBlock[]; source: string }

export let LOANS: Loan[] = [];
export let PERSONAL_DEPOSITS: Deposit[] = [];
export let COMPANY_DEPOSITS: CompanyDeposit[] = [];
export let RATE_WEEKS: any[] = [];
export let BIDV_VLD_LIMIT = 0;
export let SC_LIMIT = 0;
export let CRYPTO_PRICES: Record<string, number> = {};
export let CRYPTO_TOKENS: Token[] = [];
export let WALLETS: Wallet[] = [];
export let CRYPTO_TOTAL = 0;
export let CRYPTO_HISTORY: { date: string; total: number; stable: number; btc: number; eth: number; other: number }[] = [];
export let CONTRACT_LINKS: Record<string, string> = {};
export let CONTRACT_DEFAULTS: Record<string, string> = {};
export let PLAN_MONTHS: PlanMonth[] = [];
export let PLAN_INPUTS: Record<string, PlanInputs> = {};
export let APPROVALS: Record<string, Record<Entity, PlanApproval>> = {};
export let PLAN_HIGHLIGHTS: Record<string, Record<Entity, [string, string][]>> = {};
export let META = { siteVersion: '', companyUpdatedAt: '', personalUpdatedAt: '', ratesUpdatedAt: '', cryptoUpdatedAt: '', cryptoPriceDate: '' };

const TOKEN_COLORS: Record<string, string> = {
  'USDC/USDT': 'hsl(var(--c2))', BTC: 'hsl(var(--c3))', ETH: 'hsl(var(--c1))', SOL: 'hsl(var(--c4))', OP: 'hsl(var(--c5))',
};
const pad = (n: number) => String(n).padStart(2, '0');
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fmtStamp = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? iso : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
export function monthPeriod(key: string) {
  const [y, m] = key.split('-').map(Number);
  const next = new Date(y, m, 15); // ngày 15 tháng sau
  return { from: `${key}-01`, to: isoDate(next), label: `Tháng ${m}/${y}` };
}
export const addMonths = (key: string, n: number) => { const [y, m] = key.split('-').map(Number); return monthKey(new Date(y, m - 1 + n, 1)); };

let bust = '';
async function getJson<T>(path: string, optional = false): Promise<T | null> {
  try {
    const res = await fetch(`${path}${bust}`, { cache: 'no-store' });
    if (!res.ok) { if (optional) return null; throw new Error(`${path}: ${res.status}`); }
    return (await res.json()) as T;
  } catch (e) { if (optional) return null; throw e; }
}
async function getScriptGlobal(path: string, name: string): Promise<any> {
  try {
    const res = await fetch(`${path}${bust}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const text = await res.text();
    const win: Record<string, unknown> = {};
    new Function('window', text)(win);
    return win[name] ?? null;
  } catch { return null; }
}

const todayIso = () => isoDate(new Date());

function mapCompany(c: any) {
  const today = todayIso();
  const out: Loan[] = [];
  const push = (r: any, group: string, bank: 'BIDV' | 'SC') => {
    if (!r.maturityDate || r.maturityDate < today || !(r.principalOutstanding > 0 || group.startsWith('bidv-od'))) return;
    out.push({
      code: String(r.loanCode), group, bank, disb: r.disbursementDate ?? null, due: r.maturityDate, rate: Number(r.interestRate) || 0,
      principal: Number(r.principalOutstanding) || 0, interest: Number(r.interestPayable) || 0, settle: Number(r.projectedSettlement) || 0,
      limit: r.availableLimit ?? null, deposits: (r.depositCodes || []).map(String),
    });
  };
  (c.bidvOverdraft || []).forEach((r: any) => push(r, r.branchCode === 'TS' ? 'bidv-od-ts' : 'bidv-od-tn', 'BIDV'));
  (c.bidvWorkingCapital || []).forEach((r: any) => push(r, 'bidv-vld', 'BIDV'));
  (c.scWorkingCapital || []).forEach((r: any) => push(r, 'sc-vld', 'SC'));
  LOANS = out;
  BIDV_VLD_LIMIT = Number(c.summary?.bidvWorkingCapitalAvailableLimit) || 0;
  SC_LIMIT = Number(c.summary?.scAvailableLimit) || 0;
  COMPANY_DEPOSITS = (c.companyDeposits || []).map((d: any) => ({
    bank: String(d.bank || '').replace('BIDV-TrSon', 'BIDV Trường Sơn'), code: String(d.depositCode), principal: Number(d.principal) || 0,
    rate: Number(d.interestRate) || 0, open: d.openDate, due: d.maturityDate, settle: Number(d.projectedSettlement) || 0, loans: (d.linkedLoanCodes || []).map(String),
  }));
  META.companyUpdatedAt = c.meta?.updatedAt || '';
}

function mapPersonal(p: any) {
  PERSONAL_DEPOSITS = (p.personalDeposits || []).map((r: any) => ({
    owner: r.owner, bank: r.bank, code: String(r.certificateNumber || r.depositCode), type: r.depositType,
    principal: Number(r.principal) || 0, rate: r.interestRate ?? null, open: r.openDate ?? null, due: r.maturityDate ?? null,
    pledged: !!r.pledged, settle: Number(r.projectedSettlement) || 0, loans: (r.linkedLoanCodes || []).map(String),
  }));
  META.personalUpdatedAt = p.meta?.updatedAt || '';
}

function mapRates(h: any) {
  const weeks: any[] = [];
  Object.entries(h?.months || {}).sort(([a], [b]) => a.localeCompare(b)).forEach(([mk, m]: [string, any]) => {
    Object.entries(m.weeks || {}).sort(([a], [b]) => Number(a) - Number(b)).forEach(([wk, w]: [string, any]) => {
      if (!w.available) return;
      weeks.push({
        key: `${mk}-W${wk}`, month: mk, week: Number(wk), label: `T${Number(mk.slice(5))}/${mk.slice(0, 4)} · Tuần ${wk}`,
        updatedAt: w.updatedAt || '', note: w.summary?.note || '',
        medium: (w.mediumTerm?.items || []).map((i: any) => ({ name: i.name, r: i.rates || {}, corp: i.corpBorrowRate ?? null, strategy: i.strategy, comment: i.comment,
          pledge: i.personalPledgeLoan ? { spread: i.personalPledgeLoan.loanRateSpread, ltv: i.personalPledgeLoan.loanToValueRatio, r: i.personalPledgeLoan.loanRates || {} } : null })),
        short: (w.shortTerm?.items || []).map((i: any) => ({ name: i.name, r: i.rates || {}, min: i.minAmount, strategy: i.strategy })),
        ultra: (w.underOneMonth?.items || []).map((i: any) => ({ name: i.name, r: i.rates || {}, strategy: i.strategy, roll: i.rollable })),
      });
    });
  });
  RATE_WEEKS = weeks;
  META.ratesUpdatedAt = h?.meta?.updatedAt || '';
}

function mapCrypto(c: any, hist: any) {
  if (!c) return;
  CRYPTO_PRICES = c.prices || {};
  CRYPTO_TOKENS = (c.tokens || []).map((t: any) => ({ k: t.k, v: Number(t.usd) || 0, qty: Number(t.qty) || 0, c: TOKEN_COLORS[t.k] || 'hsl(var(--c6))' }));
  WALLETS = (c.wallets || []).map((w: any) => ({ grp: w.group, name: w.name, ent: w.entity, chain: w.chain, type: w.type, addr: w.address,
    st: Number(w.stable) || 0, btc: Number(w.btc) || 0, eth: Number(w.eth) || 0, oth: Number(w.other) || 0, tot: Number(w.total) || 0 }));
  CRYPTO_TOTAL = WALLETS.reduce((a, w) => a + w.tot, 0);
  CRYPTO_HISTORY = hist?.days || [];
  META.cryptoUpdatedAt = c.meta?.updatedAt || '';
  META.cryptoPriceDate = c.meta?.priceDate || '';
}

function eventsFromApproval(a: any): TLEvent[] {
  const fmt = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? iso : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const ev: TLEvent[] = [];
  const hist = Array.isArray(a.history) && a.history.length ? a.history : [
    ...(a.submittedAt ? [{ at: a.submittedAt, status: 'pending_cfo_review', version: a.version }] : []),
    ...(a.reviewedAt || a.approvedAt ? [{ at: a.reviewedAt || a.approvedAt, status: a.status, version: a.version }] : []),
  ];
  hist.forEach((h: any) => {
    if (h.status === 'pending_cfo_review') ev.push({ at: fmt(h.at), kind: 'submit', text: `Trình CFO ${h.version || ''}`.trim() });
    else if (h.status === 'approved') ev.push({ at: fmt(h.at), kind: 'approve', text: `CFO duyệt ${h.version || ''}`.trim() });
    else if (h.status === 'revision_requested') ev.push({ at: fmt(h.at), kind: 'revise', text: `CFO yêu cầu chỉnh sửa ${h.version || ''}`.trim() });
  });
  return ev;
}

function defaultInputs(key: string, prev: PlanInputs | undefined): PlanInputs {
  const liquid = PERSONAL_DEPOSITS.filter(d => !d.due).reduce((a, d) => a + d.principal, 0);
  const od = LOANS.filter(l => l.group.startsWith('bidv-od')).reduce((a, l) => a + (l.limit || 0), 0);
  return {
    month: key, version: 'Draft 1',
    opening: { vihali: od, personal: liquid, vihaliNote: 'Theo HM thấu chi trên dữ liệu hiện tại', personalNote: 'Theo số dư tài khoản không kỳ hạn hiện tại' },
    carry: [], adhoc: [],
    recurring: (prev?.recurring || []).map(r => ({ ...r, startMonth: undefined })),
  };
}

const archiveCache: Record<string, Promise<ArchivePlan | null>> = {};
export function loadArchive(month: string, kind: 'company' | 'personal') {
  const k = `${month}-${kind}`;
  if (!archiveCache[k]) archiveCache[k] = getJson<ArchivePlan>(`./data/monthly-plans/archive/${k}.json`, true);
  return archiveCache[k];
}

export async function loadAll() {
  const sv = await getJson<any>('./data/site-version.json', true);
  META.siteVersion = sv?.version || String(Date.now());
  bust = `?v=${encodeURIComponent(META.siteVersion)}`;

  const [company, personal, history, crypto, cryptoHist, links, live, plansIndex] = await Promise.all([
    getJson<any>('./data/company-loans-current.json'),
    getJson<any>('./data/personal-treasury-current.json'),
    getJson<any>('./data/history.json'),
    getJson<any>('./data/crypto-current.json', true),
    getJson<any>('./data/crypto-history.json', true),
    getJson<any>('./data/contract-links.json', true),
    getScriptGlobal('./data/monthly-plans/live-index.js', 'MONTHLY_PLANS_LIVE_DATA'),
    getJson<any>('./data/monthly-plans/inputs/index.json', true),
  ]);
  mapCompany(company); mapPersonal(personal); mapRates(history); mapCrypto(crypto, cryptoHist);
  CONTRACT_LINKS = links?.links || {};
  CONTRACT_DEFAULTS = links?.defaults || {};

  // Tháng kế hoạch: tháng sau (đang lập) + các tháng có file nhập liệu + các tháng cũ trong live-index
  const nextKey = addMonths(monthKey(new Date()), 1);
  const inputMonths: string[] = Array.from(new Set<string>([...(plansIndex?.months || []), nextKey])).sort().reverse();
  const loaded = await Promise.all(inputMonths.map(k => getJson<PlanInputs>(`./data/monthly-plans/inputs/${k}.json`, true)));
  const inputs: Record<string, PlanInputs> = {};
  [...inputMonths].reverse().forEach((k) => {
    const i = inputMonths.indexOf(k);
    const prevKey = Object.keys(inputs).sort().pop();
    inputs[k] = loaded[i] || defaultInputs(k, prevKey ? inputs[prevKey] : undefined);
  });
  PLAN_INPUTS = inputs;

  const archiveIdx = await getJson<any>('./data/monthly-plans/archive/index.json', true);
  const period = (k: string) => { const p = monthPeriod(k); return { from: p.from, to: p.to, label: p.label }; };
  const archiveMonths: string[] = Array.from(new Set<string>([...(archiveIdx?.months || []), ...((live?.availableMonths || []).map((m: any) => m.key))]));
  const monthMap = new Map<string, PlanMonth>();
  archiveMonths.forEach(k => monthMap.set(k, { key: k, ...period(k), live: false, mode: 'archive' }));
  inputMonths.forEach(k => {
    const mode: PlanMode = k >= nextKey ? 'live' : (inputs[k]?.snapshot ? 'snapshot' : (monthMap.has(k) ? 'archive' : 'snapshot'));
    monthMap.set(k, { key: k, ...period(k), live: mode === 'live', mode });
  });
  PLAN_MONTHS = [...monthMap.values()].sort((a, b) => b.key.localeCompare(a.key));

  PLAN_HIGHLIGHTS = {};
  Object.entries(live?.months || {}).forEach(([k, m]: [string, any]) => {
    PLAN_HIGHLIGHTS[k] = {
      vihali: (m.company?.highlights || []).map((h: any) => [h.label, h.value]),
      personal: (m.personal?.highlights || []).map((h: any) => [h.label, h.value]),
    };
  });

  const approvals: Record<string, Record<Entity, PlanApproval>> = {};
  await Promise.all(PLAN_MONTHS.map(async (m) => {
    const [co, pe] = await Promise.all([
      getJson<any>(`./data/monthly-plans/approvals/${m.key}-company.json`, true),
      getJson<any>(`./data/monthly-plans/approvals/${m.key}-personal.json`, true),
    ]);
    const version = inputs[m.key]?.version || live?.months?.[m.key]?.company?.version || 'Draft 1';
    const build = (a: any): PlanApproval => {
      const draftEv: TLEvent = { at: inputs[m.key]?.updatedAt ? fmtStamp(inputs[m.key].updatedAt!) : '', kind: 'draft', text: `Lập ${version}` };
      if (!a) return { version, status: 'draft', events: [draftEv] };
      const events = eventsFromApproval(a);
      // Bản nháp mới sau khi CFO trả về: trạng thái quay lại "chưa trình"
      if (inputs[m.key] && a.version && a.version !== version) return { version, status: 'draft', events: [...events, draftEv] };
      return { version: a.version || version, status: a.status || 'draft', events: events.length ? events : [draftEv] };
    };
    approvals[m.key] = { vihali: build(co), personal: build(pe) };
  }));
  APPROVALS = approvals;
}

export const CFO_APPROVAL_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyMyXnoXOj4PJ7f5w4fPaXzbt4DpsRfA6mxIWEFV3LeYCKUO0aWle-W20CZxzEjvMhWyA/exec';
export const EDITOR_CODE = '1993';

export async function postToAppsScript(payload: unknown): Promise<{ ok: boolean; error?: string; opaque?: boolean }> {
  const body = JSON.stringify(payload);
  try {
    const res = await fetch(CFO_APPROVAL_WEB_APP_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body, redirect: 'follow' });
    const json = await res.json();
    return json.ok ? { ok: true } : { ok: false, error: json.error || 'Apps Script báo lỗi' };
  } catch {
    // Yêu cầu vẫn tới Apps Script nhưng trình duyệt không cho đọc phản hồi; không gửi lại để tránh trình CFO hai lần.
    return { ok: true, opaque: true };
  }
}
