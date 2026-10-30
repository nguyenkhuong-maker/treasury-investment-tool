import { useState, Fragment } from 'react';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import { PLAN_ACTUALS, ACTUALS_AT } from '@/data/static';
import type { ActualRow } from '@/data/static';
import { nf, ty, dmy, dm, TODAY } from '@/lib/fmt';
import { Panel, Chip, th, td, tn } from '@/components/kit';
import { cn } from '@/lib/utils';

/* Thực chi so với kế hoạch theo tháng dương lịch.
   Vihali: chỉ các khoản chi đi bằng thấu chi BIDV (nguồn "BIDV TC" trên PR) mới so với kế hoạch;
   SC VLD / BIDV VLD / BIDV VTC chỉ ghi tham khảo. Cá nhân: chi từ VPB5678, điều tiền BA, mua USDT. */

export interface PlanItem { date: string; label: string; amount: number }
type Status = { t: string; tone: 'pos' | 'neg' | 'warn' | 'gold' | 'default' | 'primary' };
interface Row { id: string; label: string; planDate?: string; plan: number; actual: number; actDate?: string; status: Status; detail: ActualRow[]; extra?: string }

const todayIso = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}-${String(TODAY.getDate()).padStart(2, '0')}`;
const dd = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
const sum = (r: { amount: number }[]) => r.reduce((a, x) => a + x.amount, 0);
function status(plan: number, actual: number, planDate?: string, actDate?: string): Status {
  if (!plan && actual) return { t: 'Ngoài kế hoạch', tone: 'neg' };
  if (plan && !actual) return planDate && planDate > todayIso ? { t: 'Sắp tới', tone: 'default' } : { t: 'Chưa chi', tone: 'warn' };
  const tol = Math.max(1000, plan * 0.005);
  if (actual - plan > tol) return { t: 'Vượt kế hoạch', tone: 'neg' };
  if (plan - actual > tol) return { t: 'Thấp hơn kế hoạch', tone: 'gold' };
  if (planDate && actDate && Math.abs(dd(planDate, actDate)) > 2) return { t: `Lệch ngày ${dd(planDate, actDate) > 0 ? '+' : ''}${dd(planDate, actDate)}`, tone: 'warn' };
  return { t: 'Đúng kế hoạch', tone: 'pos' };
}
const lastDate = (r: ActualRow[]) => r.map(x => x.date).sort().pop();

const BANK_KEY = (label: string, date: string) => {
  const m = label.match(/\b(SC|BIDV)\b/i);
  return m ? `${m[1].toUpperCase()}|${date}` : null;
};

function vihaliRows(month: string, plan: PlanItem[], rows: ActualRow[]): Row[] {
  const tc = rows.filter(r => r.source === 'BIDV TC');
  const out: Row[] = [];
  const isLoan = (p: PlanItem) => /\b(SC|BIDV)\b.*\d{6,}/i.test(p.label);
  const isInt = (p: PlanItem) => /lãi vay bidv/i.test(p.label);
  const used = new Set<string>();
  plan.filter(isLoan).forEach((p, i) => {
    const k = BANK_KEY(p.label, p.date);
    const d = tc.filter(r => r.cat === 'loan' && r.key === k);
    if (k) used.add(k);
    out.push({ id: 'L' + i, label: p.label.replace(/^Trả nợ /, 'Trả nợ '), planDate: p.date, plan: p.amount, actual: sum(d), actDate: lastDate(d), status: status(p.amount, sum(d), p.date, lastDate(d)), detail: d });
  });
  const offLoans = [...new Set(tc.filter(r => r.cat === 'loan' && !used.has(r.key || '')).map(r => r.key))];
  offLoans.forEach(k => {
    const d = tc.filter(r => r.key === k);
    out.push({ id: 'X' + k, label: d[0].label, plan: 0, actual: sum(d), actDate: lastDate(d), status: { t: 'Ngoài kế hoạch', tone: 'neg' }, detail: d,
      extra: (k || '').split('|')[1] < `${month}-01` ? 'đến hạn tháng trước' : undefined });
  });
  const pi = plan.filter(isInt), di = tc.filter(r => r.cat === 'interest');
  if (pi.length || di.length) out.push({ id: 'INT', label: 'Lãi vay BIDV định kỳ', planDate: pi[0]?.date, plan: sum(pi), actual: sum(di), actDate: lastDate(di), status: status(sum(pi), sum(di), pi[0]?.date, lastDate(di)), detail: di, extra: pi.length ? 'Kế hoạch là số ước tính theo dư nợ × lãi suất × số ngày' : undefined });
  const po = plan.filter(p => !isLoan(p) && !isInt(p)), dop = tc.filter(r => r.cat === 'opex' || r.cat === 'salary');
  if (po.length || dop.length) out.push({ id: 'OPEX', label: 'Opex đi bằng thấu chi', planDate: po[0]?.date, plan: sum(po), actual: sum(dop), actDate: lastDate(dop), status: status(sum(po), sum(dop)), detail: dop, extra: `${dop.length} PR` });
  return out;
}

const PCAT: [string, RegExp, string][] = [
  ['usdt', /usdt/i, 'Mua USDT'],
  ['opex-ba', /beyond atoms/i, 'Opex Beyond Atoms'],
  ['staff-dopa', /nhân viên dopa|lương.*dopa/i, 'Chi phí nhân viên DOPA'],
  ['opex-dopa', /opex dopa/i, 'Opex DOPA & pháp nhân liên quan'],
];
function personalRows(plan: PlanItem[], rows: ActualRow[]): Row[] {
  const out: Row[] = [];
  const catOf = (p: PlanItem) => PCAT.find(([, re]) => re.test(p.label))?.[0];
  PCAT.forEach(([k, , label]) => {
    const p = plan.filter(x => catOf(x) === k), d = rows.filter(r => r.cat === k);
    if (!p.length && !d.length) return;
    const extra = k === 'usdt' && d.length ? (() => { const q = d.reduce((a, r) => a + (r.usdt || 0), 0); return `${d.length} lần · ${q.toLocaleString('en-US', { maximumFractionDigits: 0 })} USDT · giá bq ${nf(sum(d) / q)}`; })() : k === 'opex-dopa' && d.length ? `${d.length} FR` : undefined;
    out.push({ id: k, label, planDate: p[0]?.date, plan: sum(p), actual: sum(d), actDate: lastDate(d), status: status(sum(p), sum(d), p[0]?.date, lastDate(d)), detail: d, extra });
  });
  plan.filter(x => !catOf(x)).forEach((p, i) => out.push({ id: 'O' + i, label: p.label, planDate: p.date, plan: p.amount, actual: 0, status: { t: 'Chưa theo dõi thực tế', tone: 'default' }, detail: [] }));
  return out;
}

function Table({ rows }: { rows: Row[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const P = sum(rows.map(r => ({ amount: r.plan }))), A = sum(rows.map(r => ({ amount: r.actual })));
  return (
    <div className="scrollbox overflow-auto flex-1 min-h-0 max-h-[520px] xl:max-h-none">
      <table className="w-full min-w-[540px] text-[13px] border-collapse">
        <thead><tr><th className={th}>Khoản</th><th className={th + ' text-right'}>Kế hoạch</th><th className={th + ' text-right'}>Thực chi</th><th className={th + ' text-right'}>Chênh</th></tr></thead>
        <tbody>
          {rows.map(r => {
            const diff = r.actual - r.plan; const can = r.detail.length > 0;
            return (
              <Fragment key={r.id}>
                <tr className={cn('hover:bg-accent/40 align-top', can && 'cursor-pointer')} onClick={() => can && setOpen(o => ({ ...o, [r.id]: !o[r.id] }))}>
                  <td className={td + ' min-w-[230px]'}>
                    <span className="inline-flex items-start gap-1.5">{can ? (open[r.id] ? <ChevronDown className="w-4 h-4 mt-px shrink-0" /> : <ChevronRight className="w-4 h-4 mt-px shrink-0" />) : <i className="w-4 shrink-0" />}
                      <span><span className="font-medium">{r.label}</span> <Chip tone={r.status.tone} className="ml-1 align-middle">{r.status.t}</Chip>
                        <span className="block text-xs text-muted-foreground">{r.planDate ? `KH ${dm(r.planDate)}` : 'Ngoài KH'}{r.actDate ? ` · chi ${r.detail.length > 1 && r.id !== 'INT' && !r.id.startsWith('L') && !r.id.startsWith('X') ? 'đến ' : ''}${dm(r.actDate)}` : ''}{r.extra ? ` · ${r.extra}` : ''}</span></span></span>
                  </td>
                  <td className={tn}>{r.plan ? nf(r.plan) : '–'}</td>
                  <td className={tn}>{r.actual ? nf(r.actual) : '–'}</td>
                  <td className={cn(tn, diff > 0 && 'text-neg', diff < 0 && 'text-pos')}>{r.plan || r.actual ? (diff > 0 ? '+' : '') + nf(diff) : '–'}</td>
                                  </tr>
                {open[r.id] && r.detail.map((x, i) => (
                  <tr key={r.id + i} className="text-xs text-muted-foreground bg-muted/30">
                    <td className={td + ' pl-10'}><span className="num">{dm(x.date)}</span> · {x.label}<span className="text-foreground/70"> · {x.payee}</span>{x.entity && x.entity !== x.payee ? ` · ${x.entity}` : ''}</td>
                    <td className={tn} /><td className={tn}>{nf(x.amount)}</td><td className={tn} />
                  </tr>))}
              </Fragment>);
          })}
          <tr className="font-semibold bg-muted/60"><td className={td}>Cộng</td><td className={tn}>{nf(P)}</td><td className={tn}>{nf(A)}</td><td className={cn(tn, A - P > 0 ? 'text-neg' : 'text-pos')}>{(A - P > 0 ? '+' : '') + nf(A - P)}</td></tr>
        </tbody>
      </table>
    </div>);
}

export default function PlanActuals({ month, vihaliPlan, personalPlan, planClosing }: { month: string; vihaliPlan: PlanItem[]; personalPlan: PlanItem[]; planClosing?: number | null }) {
  const A = PLAN_ACTUALS[month];
  if (!A) return null;
  const inM = (p: PlanItem) => p.date.startsWith(month);
  const vRows = vihaliRows(month, vihaliPlan.filter(inM), A.vihali);
  const pRows = personalRows(personalPlan.filter(inM), A.personal);
  const other = Object.entries(A.vihali.filter(r => r.source !== 'BIDV TC').reduce<Record<string, number>>((m, r) => { const k = r.source || 'Khác'; m[k] = (m[k] || 0) + r.amount; return m; }, {})).sort((a, b) => b[1] - a[1]);
  const SRC: Record<string, string> = { 'SC VLD': 'Giải ngân SC VLĐ', 'BIDV VLD': 'Giải ngân BIDV VLĐ', 'BIDV VTC': 'BIDV vốn tự có' };
  const closing = A.closing;
  const [y, mm] = month.split('-');
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2 pt-2">
        <div><div className="eyebrow">Thực chi so với kế hoạch</div><h2 className="text-[17px] font-semibold mt-0.5">Tháng {Number(mm)}/{y} · 01/{mm} – {dm(`${month}-${new Date(+y, +mm, 0).getDate()}`)}</h2></div>
        <span className="text-xs text-muted-foreground">Nguồn: Payment & Fund Request, NPV comparison · cập nhật {ACTUALS_AT ? dmy(ACTUALS_AT.slice(0, 10)) : '–'} · tên cá nhân đã ẩn</span>
      </div>
      <div className="grid xl:grid-cols-2 gap-4">
        <Panel pad={false} className="xl:h-[600px]" title={<span className="flex items-center gap-2"><span className="eyebrow text-primary">Vihali</span>Chi đi bằng thấu chi BIDV</span>} sub="Chỉ các PR có nguồn tiền BIDV TC · bấm từng dòng để xem chi tiết">
          <div className="flex flex-col h-full">
          {(closing || planClosing != null) && (
            <div className="grid grid-cols-3 border-b">
              {[['HM thấu chi cuối tháng · KH', planClosing != null ? ty(planClosing) : '–', ''],
                [`Thực tế${closing ? ` (${dm(closing.asOf)})` : ''}`, closing ? ty(closing.odAvailable) : '–', ''],
                ['Chênh', closing && planClosing != null ? ty(closing.odAvailable - planClosing) : '–', closing && planClosing != null && closing.odAvailable < planClosing ? 'text-neg' : 'text-pos']].map(([l, v, c], i) => (
                <div key={l} className={cn('px-4 py-3 min-w-0', i && 'border-l')}><div className="text-xs text-muted-foreground">{l}</div><div className={cn('num text-[15px] font-medium mt-0.5', c)}>{v}</div></div>))}
            </div>)}
          <Table rows={vRows} />
          {other.length > 0 && (
            <div className="px-4 py-3 border-t text-xs text-muted-foreground flex flex-wrap gap-x-5 gap-y-1">
              <span className="inline-flex items-center gap-1"><Info className="w-3.5 h-3.5" />Không tính vào kế hoạch thấu chi:</span>
              {other.map(([k, v]) => <span key={k}>{SRC[k] || k} <b className="num font-medium text-foreground">{ty(v)}</b></span>)}
            </div>)}
          </div>
        </Panel>
        <Panel pad={false} className="xl:h-[600px]" title={<span className="flex items-center gap-2"><span className="eyebrow text-primary">Cá nhân</span>Chi từ Individual Treasury</span>} sub="Chi từ VPB5678 (FR 1102 Group), điều tiền Beyond Atoms, mua USDT (NPV comparison)">
          <div className="flex flex-col h-full"><Table rows={pRows} /></div>
        </Panel>
      </div>
    </div>
  );
}
