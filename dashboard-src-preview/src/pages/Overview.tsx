import { useState, Fragment } from 'react';
import type { ReactNode } from 'react';
import { ArrowRight, Lock, LockOpen, TriangleAlert, ChevronDown, ChevronRight } from 'lucide-react';
import { RATE_WEEKS, PERSONAL_DEPOSITS, COMPANY_DEPOSITS, BALANCE } from '@/data/static';
import type { Balance } from '@/data/static';
import { GROUP_SUMMARY, LOAN_TOTAL, PERSONAL_TOTAL, PLEDGED_TOTAL, collateralFlows } from '@/lib/calc';
import { ty, pct, dmy, FX, TODAY, usdFull, usdM, vndOf, nf } from '@/lib/fmt';
import { Panel, Chip, Delta, Donut, Legend, th, td, tn } from '@/components/kit';
import { useApp } from '@/state';
import { cn } from '@/lib/utils';

function CollateralMap() {
  const { src, links } = collateralFlows();
  const S = Object.entries(src).filter(([, v]) => v.amount > 0);
  // Thứ tự bên phải: BIDV TN thấu chi, BIDV VLĐ, BIDV TS thấu chi, SC VLĐ để các dải nối không chồng lên nhau
  const ORDER = ['bidv-od-tn', 'bidv-vld', 'bidv-od-ts', 'sc-vld'];
  const G = [...GROUP_SUMMARY].sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));
  const W = 860, nodeW = 10, gap = 18, top = 10, minH = 30;
  const scale = 240 / Math.max(S.reduce((a, [, v]) => a + v.amount, 0), LOAN_TOTAL);
  let y = top; const sy: Record<string, { y: number; h: number; off: number }> = {};
  S.forEach(([k, v]) => { const h = Math.max(v.amount * scale, minH); sy[k] = { y, h, off: 0 }; y += h + gap; });
  const yL = y; y = top; const gy: Record<string, { y: number; h: number; off: number }> = {};
  G.forEach(g => { const h = Math.max(g.out * scale, minH); gy[g.key] = { y, h, off: 0 }; y += h + gap; });
  const H = Math.max(yL, y) - gap + top;
  const xL = 200, xR = W - 300;
  const paths = Object.entries(links).map(([k, v]) => {
    const [s, g] = k.split('|'); const h = v * scale;
    const a = sy[s], b = gy[g]; if (!a || !b) return null;
    const y1 = a.y + a.off + h / 2, y2 = b.y + b.off + h / 2; a.off += h; b.off += h;
    const mx = (xL + nodeW + xR) / 2;
    return <path key={k} d={`M${xL + nodeW},${y1} C${mx},${y1} ${mx},${y2} ${xR},${y2}`} fill="none" stroke={src[s].tone} strokeOpacity={0.35} strokeWidth={Math.max(h, 1.5)} />;
  });
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[620px] h-auto" role="img" aria-label="Tài sản đảm bảo và nhóm khoản vay Vihali">
        {paths}
        {S.map(([k, v]) => (
          <g key={k}>
            <rect x={xL} y={sy[k].y} width={nodeW} height={sy[k].h} fill={v.tone} rx={1.5} />
            <text x={xL - 10} y={sy[k].y + sy[k].h / 2 - 3} textAnchor="end" fontSize="12.5" fontWeight={600} fill="hsl(var(--foreground))">{v.label}</text>
            <text x={xL - 10} y={sy[k].y + sy[k].h / 2 + 12} textAnchor="end" fontSize="11" fill="hsl(var(--muted-foreground))" fontFamily="var(--font-num)">{usdM(v.amount / FX)} · {ty(v.amount, 1)}</text>
          </g>))}
        {G.map(g => {
          const cov = Object.entries(links).filter(([k]) => k.endsWith('|' + g.key) && !k.startsWith('none')).reduce((a, [, v]) => a + v, 0);
          return (
            <g key={g.key}>
              <rect x={xR} y={gy[g.key].y} width={nodeW} height={gy[g.key].h} fill={g.color} rx={1.5} />
              <text x={xR + 18} y={gy[g.key].y + gy[g.key].h / 2 - 3} fontSize="12.5" fontWeight={600} fill="hsl(var(--foreground))">{g.short}</text>
              <text x={xR + 18} y={gy[g.key].y + gy[g.key].h / 2 + 12} fontSize="11" fill="hsl(var(--muted-foreground))" fontFamily="var(--font-num)">Dư nợ {usdM(g.out / FX)} ({ty(g.out, 1)}) · TSĐB/nợ {(cov / g.out * 100).toFixed(0)}%</text>
            </g>);
        })}
      </svg>
    </div>
  );
}


const THRESHOLD = 24;

/* Số tiền USD + dòng VND nhỏ bên dưới (tỷ giá FX) */
function M({ v, big, tone, className }: { v: number; big?: boolean; tone?: 'pos' | 'neg'; className?: string }) {
  return (
    <span className={cn('inline-flex flex-col leading-tight', className)}>
      <span className={cn('num', big ? 'text-[21px] font-medium' : 'font-medium', tone === 'pos' && 'text-pos', tone === 'neg' && 'text-neg')}>{usdFull(v)}</span>
      <span className="num text-[11px] text-muted-foreground mt-0.5">≈ {vndOf(v)}</span>
    </span>
  );
}

function compute(B: Balance, open: boolean) {
  const ents = B.entities.map(e => {
    const dep = e.banks.reduce((a, b) => a + b.depVnd / B.fx + b.depUsd, 0);
    const loan = e.banks.reduce((a, b) => a + b.loanVnd / B.fx, 0);
    return { name: e.name, dep, loan, net: dep - loan, banks: e.banks };
  });
  const entDep = ents.reduce((a, e) => a + e.dep, 0), entLoan = ents.reduce((a, e) => a + e.loan, 0);
  const fiat = B.individuals.total + entDep + B.osBank;
  const debt = entLoan + (B.individuals.loans || 0);
  const tokens = open ? B.tokens.total : 0;
  const assets = fiat + tokens;
  const cashEx = fiat - debt;
  const actual = B.runway.cases.find(c => c.actual);
  const actualBurn = actual ? B.runway.cash / actual.months : 0;
  const cash = open ? B.runway.cash : cashEx;
  const cases = B.runway.cases.map(c => {
    const burn = c.burn ?? actualBurn;
    // Khi gồm token: dùng đúng số tháng trên sheet Balance; khi ẩn token: tính lại trên phần không gồm token
    return { ...c, burn, months: open ? c.months : cashEx / burn, monthsEx: cashEx / burn };
  });
  return { ents, entDep, entLoan, fiat, debt, assets, net: assets - debt, cash, cashEx, cases, actualBurn };
}

const addMonthsLabel = (m: number) => { const d = new Date(TODAY); d.setDate(d.getDate() + Math.round(m * 30.44)); return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };

function TokenSwitch() {
  const { cryptoOpen, setCryptoOpen } = useApp();
  const [code, setCode] = useState('');
  const [err, setErr] = useState(false);
  if (cryptoOpen) return (
    <div className="flex flex-wrap items-center gap-2 text-[13px]">
      <Chip tone="pos"><LockOpen className="w-3 h-3" />Đã gồm token</Chip>
      <button onClick={() => setCryptoOpen(false)} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-sm border text-xs text-muted-foreground hover:text-foreground"><Lock className="w-3 h-3" />Khóa lại</button>
    </div>);
  return (
    <form className="flex flex-wrap items-center gap-2 text-[13px]" onSubmit={e => { e.preventDefault(); if (code === '1993') { setCryptoOpen(true); setCode(''); } else { setErr(true); setCode(''); } }}>
      <Chip tone="warn"><Lock className="w-3 h-3" />Chưa gồm token</Chip>
      <label htmlFor="ovCode" className="sr-only">Mã xem token</label>
      <input id="ovCode" type="password" inputMode="numeric" autoComplete="off" placeholder="Mã xem token" value={code} onChange={e => { setCode(e.target.value); setErr(false); }}
        className={cn('h-7 w-32 rounded-sm border bg-background px-2 text-xs num tracking-widest', err && 'border-[hsl(var(--neg))]')} />
      <button className="h-7 px-2.5 rounded-sm bg-primary text-primary-foreground text-xs font-medium">Hiện token</button>
      {err && <span className="text-xs text-neg">Mã chưa đúng</span>}
    </form>);
}

function Runway({ R, open }: { R: ReturnType<typeof compute>; open: boolean }) {
  const max = Math.max(60, Math.ceil(Math.max(...R.cases.map(c => c.months)) / 6) * 6);
  const low = R.cases.filter(c => c.months < THRESHOLD).length;
  const pctOf = (m: number) => Math.min(m / max * 100, 100);
  return (
    <Panel title="Runway · số tháng hoạt động còn lại"
      sub={<>Tiền & tương đương <b className="num font-medium text-foreground">{usdFull(R.cash)}</b>{!open && ' (chưa gồm token)'} ÷ mức chi mỗi tháng · ngưỡng cảnh báo {THRESHOLD} tháng</>}
      right={low ? <Chip tone="neg"><TriangleAlert className="w-3 h-3" />{low}/{R.cases.length} kịch bản dưới {THRESHOLD} tháng</Chip> : <Chip tone="pos">Cả {R.cases.length} kịch bản ≥ {THRESHOLD} tháng</Chip>}>
      <div className="grid gap-1">
        <div className="hidden md:grid grid-cols-[230px_1fr_150px] gap-4 text-[11px] uppercase tracking-wide text-muted-foreground font-semibold pb-1">
          <span>Kịch bản · mức chi/tháng</span><span className="relative">0<span className="absolute right-0">{max} tháng</span></span><span className="text-right whitespace-nowrap">Runway · cạn quỹ dự kiến</span>
        </div>
        {R.cases.map(c => {
          const warn = c.months < THRESHOLD;
          return (
            <div key={c.key} className={cn('grid md:grid-cols-[230px_1fr_190px] gap-x-4 gap-y-1.5 items-center rounded-sm px-2 py-2.5 -mx-2', c.actual && 'bg-accent/50')}>
              <div className="min-w-0">
                <div className="text-[13px] font-medium flex items-center gap-1.5 flex-wrap">{c.label}{c.actual && <Chip tone="primary">Số chi thực tế</Chip>}</div>
                <div className="text-xs text-muted-foreground num">{usdFull(c.burn)}/tháng · ≈ {vndOf(c.burn)}</div>
              </div>
              <div className="relative h-6">
                <div className="absolute inset-y-1.5 inset-x-0 bg-muted rounded-sm" />
                <div className="absolute inset-y-1.5 left-0 rounded-sm" style={{ width: pctOf(c.months) + '%', background: warn ? 'hsl(var(--neg))' : 'hsl(var(--pos))', opacity: c.actual ? 1 : 0.75 }} />
                {open && <div className="absolute top-1 bottom-1 w-[2px] bg-foreground/50" style={{ left: pctOf(c.monthsEx) + '%' }} title={`Nếu loại token: ${c.monthsEx.toFixed(1)} tháng`} />}
                <div className="absolute -top-0.5 -bottom-0.5 border-l-2 border-dashed" style={{ left: pctOf(THRESHOLD) + '%', borderColor: 'hsl(var(--warn))' }} />
              </div>
              <div className="flex md:flex-col md:items-end items-baseline gap-2 md:gap-0">
                <span className={cn('num text-[18px] font-semibold leading-tight', warn ? 'text-neg' : 'text-pos')}>{c.months.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">tháng</span></span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{warn ? <span className="text-neg font-medium">Dưới {THRESHOLD} tháng · </span> : null}cạn quỹ ~ {addMonthsLabel(c.months)}</span>
              </div>
            </div>);
        })}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground mt-3 pt-3 border-t">
        <span className="flex items-center gap-1.5"><i className="w-4 border-t-2 border-dashed" style={{ borderColor: 'hsl(var(--warn))' }} />Ngưỡng {THRESHOLD} tháng</span>
        {open && <span className="flex items-center gap-1.5"><i className="w-[2px] h-3 bg-foreground/50" />Runway nếu loại toàn bộ token ({usdFull(R.cashEx)})</span>}
        <span>Mức chi thực tế = tiền & tương đương ÷ runway thực tế trên sheet Balance</span>
      </div>
    </Panel>
  );
}

function BreakdownTable({ R, B, open }: { R: ReturnType<typeof compute>; B: Balance; open: boolean }) {
  const [x, setX] = useState<Record<string, boolean>>({});
  const t = (k: string) => setX(o => ({ ...o, [k]: !o[k] }));
  const Head = ({ k, label, hint, dep, loan, c }: { k: string; label: string; hint?: string; dep: number; loan: number; c: string }) => (
    <tr className="hover:bg-muted/60 cursor-pointer" onClick={() => t(k)}>
      <td className={td}><span className="inline-flex items-center gap-1.5 font-medium">{x[k] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}<i className="w-2.5 h-2.5 rounded-[2px]" style={{ background: c }} />{label}</span>{hint && <div className="text-xs text-muted-foreground pl-[38px]">{hint}</div>}</td>
      <td className={tn}><M v={dep} /></td><td className={tn}>{loan ? <M v={-loan} /> : <span className="text-muted-foreground">–</span>}</td><td className={tn}><M v={dep - loan} tone={dep - loan < 0 ? 'neg' : undefined} /></td>
    </tr>);
  const Sub = ({ label, dep, loan }: { label: ReactNode; dep: number; loan: number }) => (
    <tr className="text-muted-foreground"><td className={td + ' pl-[46px] text-[13px]'}>{label}</td><td className={tn + ' text-xs'}>{dep ? usdFull(dep) : '–'}</td><td className={tn + ' text-xs'}>{loan ? usdFull(-loan) : '–'}</td><td className={tn + ' text-xs'}>{usdFull(dep - loan)}</td></tr>);
  const vn = R.ents;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-[13px] border-collapse">
        <thead><tr><th className={th}>Nguồn</th><th className={th + ' text-right'}>Tài sản</th><th className={th + ' text-right'}>Dư nợ</th><th className={th + ' text-right'}>Ròng</th></tr></thead>
        <tbody>
          <Head k="ind" label="Cá nhân" hint={`Cầm cố cho Vihali ${usdFull(B.individuals.pledged)}`} dep={B.individuals.total} loan={B.individuals.loans} c="hsl(var(--c4))" />
          {x.ind && B.individuals.banks.filter(b => b.pledged + b.unpledged > 0).sort((a, b) => (b.pledged + b.unpledged) - (a.pledged + a.unpledged)).map(b =>
            <Sub key={b.bank} label={<>{b.bank}{b.pledged > 0 && <Chip tone="primary" className="ml-2">cầm cố {usdFull(b.pledged)}</Chip>}</>} dep={b.pledged + b.unpledged} loan={0} />)}
          <Head k="vn" label="Doanh nghiệp Việt Nam" hint={vn.map(e => e.name).join(' · ')} dep={R.entDep} loan={R.entLoan} c="hsl(var(--c6))" />
          {x.vn && vn.map(e => (
            <Fragment key={e.name}>
              <Sub label={<b className="font-medium text-foreground">{e.name}</b>} dep={e.dep} loan={e.loan} />
              {e.banks.length > 1 && e.banks.map(b => <Sub key={e.name + b.bank} label={<span className="pl-4">{b.bank}</span>} dep={b.depVnd / B.fx + b.depUsd} loan={b.loanVnd / B.fx} />)}
            </Fragment>))}
          <tr><td className={td}><span className="inline-flex items-center gap-1.5 font-medium pl-[22px]"><i className="w-2.5 h-2.5 rounded-[2px]" style={{ background: 'hsl(var(--muted-foreground))' }} />OS Bank & tài khoản ảo</span></td><td className={tn}><M v={B.osBank} /></td><td className={tn}><span className="text-muted-foreground">–</span></td><td className={tn}><M v={B.osBank} /></td></tr>
          {open ? <>
            <Head k="tok" label="Tokens" hint="Sipher & các ví liên quan" dep={B.tokens.total} loan={0} c="hsl(var(--c1))" />
            {x.tok && ([['Stablecoin (USDC/USDT)', B.tokens.stable], [`BTC${B.tokens.btcQty ? ' · ' + B.tokens.btcQty + ' BTC' : ''}`, B.tokens.btc], [`ETH${B.tokens.ethQty ? ' · ' + nf(B.tokens.ethQty) + ' ETH' : ''}`, B.tokens.eth], ['Token khác', B.tokens.other]] as [string, number][]).map(([k, v]) => <Sub key={k} label={k} dep={v} loan={0} />)}
          </> : <tr><td className={td + ' text-muted-foreground'} colSpan={4}><span className="inline-flex items-center gap-1.5 pl-[22px]"><Lock className="w-3.5 h-3.5" />Tokens · nhập mã ở thanh trên để hiện</span></td></tr>}
          <tr className="font-semibold bg-muted/60"><td className={td}>Tổng cộng{!open && <span className="font-normal text-xs text-muted-foreground"> · chưa gồm token</span>}</td><td className={tn}><M v={R.assets} /></td><td className={tn}><M v={-R.debt} /></td><td className={tn}><M v={R.net} tone={R.net < 0 ? 'neg' : 'pos'} /></td></tr>
        </tbody>
      </table>
    </div>);
}

export default function Overview() {
  const { go, cryptoOpen } = useApp();
  const B = BALANCE;
  const W = RATE_WEEKS[RATE_WEEKS.length - 1], P = RATE_WEEKS[RATE_WEEKS.length - 2] || W;
  const top12 = [...W.medium].filter((i: any) => i.r['12m'] != null).sort((a: any, b: any) => b.r['12m'] - a.r['12m']).slice(0, 4);
  const unpledged = PERSONAL_TOTAL - PLEDGED_TOTAL;
  if (!B) return <p className="text-muted-foreground">Chưa có dữ liệu sheet Balance (data/balance-current.json).</p>;
  const open = cryptoOpen;
  const R = compute(B, open);
  const actual = R.cases.find(c => c.actual) || R.cases[0];
  const slices = [
    { k: 'Cá nhân', v: B.individuals.total, c: 'hsl(var(--c4))' },
    { k: 'Doanh nghiệp VN', v: R.entDep, c: 'hsl(var(--c6))' },
    { k: 'OS Bank & TK ảo', v: B.osBank, c: 'hsl(var(--muted-foreground))' },
    ...(open ? [
      { k: 'ETH', v: B.tokens.eth, c: 'hsl(var(--c1))' },
      { k: 'BTC', v: B.tokens.btc, c: 'hsl(var(--c3))' },
      { k: 'Stablecoin', v: B.tokens.stable, c: 'hsl(var(--c2))' },
      { k: 'Token khác', v: B.tokens.other, c: 'hsl(var(--c5))' },
    ] : []),
  ].filter(s => s.v > 0);
  const tag = !open && <Chip tone="warn" className="ml-1.5 align-middle">chưa gồm token</Chip>;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border rounded-md px-4 py-2.5">
        <TokenSwitch />
        <div className="text-xs text-muted-foreground">Theo sheet Balance ngày {dmy(B.asOf)} · đơn vị USD · tỷ giá quy đổi <b className="num font-medium text-foreground">{nf(FX)}</b> VND/USD</div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border rounded-md px-4 py-3 min-w-0">
          <div className="text-xs text-muted-foreground">Tổng tài sản{tag}</div>
          <div className="mt-1"><M v={R.assets} big /></div>
        </div>
        <button onClick={() => go('vihali')} className="text-left bg-card border rounded-md px-4 py-3 min-w-0 hover:border-primary/50 transition-colors">
          <div className="text-xs text-muted-foreground">Tổng dư nợ · Vihali BIDV + SC</div>
          <div className="mt-1"><M v={R.debt} big /></div>
        </button>
        <div className="bg-card border rounded-md px-4 py-3 min-w-0">
          <div className="text-xs text-muted-foreground">Thanh khoản ròng = tài sản − dư nợ{tag}</div>
          <div className="mt-1"><M v={R.net} big tone={R.net < 0 ? 'neg' : 'pos'} /></div>
        </div>
        <div className={cn('bg-card border rounded-md px-4 py-3 min-w-0', actual.months < THRESHOLD && 'border-[hsl(var(--neg))]/60')}>
          <div className="text-xs text-muted-foreground">Runway theo chi thực tế{tag}</div>
          <div className={cn('num text-[21px] font-medium mt-1 leading-tight', actual.months < THRESHOLD ? 'text-neg' : 'text-pos')}>{actual.months.toFixed(1)} tháng</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">{actual.months < THRESHOLD ? <span className="text-neg font-medium inline-flex items-center gap-1"><TriangleAlert className="w-3 h-3" />Dưới {THRESHOLD} tháng · </span> : null}chi TB {usdM(R.actualBurn, 2)}/tháng</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        <Panel className="lg:col-span-5" title="Cơ cấu tài sản" sub={open ? 'Gồm tokens · theo sheet Balance' : 'Chưa gồm tokens · nhập mã để hiện phần token'}>
          <div className="flex flex-wrap items-center gap-5">
            <Donut data={slices} center={usdM(R.assets)} sub="Tổng tài sản" size={176} />
            <Legend rows={slices.map(s => ({ k: s.k, c: s.c, v: usdM(s.v), p: (s.v / R.assets * 100).toFixed(1) + '%' }))} />
          </div>
          {!open && <div className="mt-4 rounded-sm border border-dashed px-3 py-2 text-xs text-muted-foreground flex items-center gap-2"><Lock className="w-3.5 h-3.5 shrink-0" />Phần tokens đang ẩn. Tổng tài sản, thanh khoản và runway ở trang này đang tính không gồm token.</div>}
        </Panel>
        <Panel className="lg:col-span-7" pad={false} title="Tài sản và dư nợ theo nguồn" sub="Bấm từng dòng để xem chi tiết theo ngân hàng">
          <BreakdownTable R={R} B={B} open={open} />
        </Panel>
      </div>

      <Runway R={R} open={open} />

      <div className="grid xl:grid-cols-12 gap-4">
        <Panel className="xl:col-span-8" title="Cấu trúc bảo đảm khoản vay Vihali" sub="Sổ tiết kiệm (bên trái) đang cầm cố cho nhóm khoản vay nào (bên phải) · độ dày theo số tiền"
          right={<button onClick={() => go('vihali')} className="text-xs text-primary inline-flex items-center gap-1 hover:underline">Chi tiết khế ước<ArrowRight className="w-3 h-3" /></button>}>
          <CollateralMap />
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground mt-3 pt-3 border-t">
            <span>Tiền gửi cá nhân không cầm cố <b className="num font-medium text-foreground">{usdFull(unpledged / FX)}</b> <span className="num">≈ {ty(unpledged)}</span></span>
            <span>Tổng TSĐB / dư nợ <b className="num font-medium text-foreground">{((PLEDGED_TOTAL + COMPANY_DEPOSITS.reduce((a, d) => a + d.principal, 0)) / LOAN_TOTAL * 100).toFixed(0)}%</b></span>
            <span>{PERSONAL_DEPOSITS.filter(d => d.pledged).length} sổ cá nhân + 2 sổ công ty</span>
          </div>
        </Panel>
        <Panel className="xl:col-span-4" title="Lãi suất 12 tháng cao nhất" sub={`${W.label} · so với tuần trước`} right={<button onClick={() => go('lai-suat')} className="text-xs text-primary inline-flex items-center gap-1 hover:underline">Tab Đầu tư<ArrowRight className="w-3 h-3" /></button>}>
          <div className="grid gap-2">
            {top12.map((i: any) => { const p = (P.medium as readonly any[]).find(x => x.name === i.name)?.r['12m']; return (
              <div key={i.name} className="grid grid-cols-[1fr_auto_76px] gap-2 text-[13px] items-center">
                <span>{i.name}</span><span className="num font-medium">{pct(i.r['12m'])}</span><span className="text-right text-xs">{p != null ? <Delta v={i.r['12m'] - p} /> : '–'}</span>
              </div>); })}
          </div>
        </Panel>
      </div>
    </div>
  );
}
