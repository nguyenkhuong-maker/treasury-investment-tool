import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, Legend as RLegend } from 'recharts';
import { RATE_WEEKS } from '@/data/static';
import { nf, pct } from '@/lib/fmt';
import { Panel, Kpi, Chip, Delta, th, td, tn, chartAxisTick, chartAxisLine, chartGrid, chartTip } from '@/components/kit';
import { cn } from '@/lib/utils';

type Week = (typeof RATE_WEEKS)[number];
type Cat = 'medium' | 'short' | 'ultra';
const TENORS: Record<Cat, [string, string][]> = {
  medium: [['6m', '6 tháng'], ['9m', '9 tháng'], ['12m', '12 tháng']],
  short: [['1m', '1 tháng'], ['2m', '2 tháng'], ['3m', '3 tháng'], ['4m', '4 tháng'], ['5m', '5 tháng']],
  ultra: [['1d', '1 ngày'], ['1w', '1 tuần'], ['2w', '2 tuần'], ['3w', '3 tuần']],
};
const DAYS: Record<string, number> = { '1d': 1, '1w': 7, '2w': 14, '3w': 21, '1m': 30, '2m': 61, '3m': 91, '4m': 122, '5m': 152, '6m': 182, '9m': 273, '12m': 365 };
const catOf = (t: string): Cat => (['6m', '9m', '12m'].includes(t) ? 'medium' : ['1d', '1w', '2w', '3w'].includes(t) ? 'ultra' : 'short');
const items = (w: Week, c: Cat) => (w[c] as readonly any[]);
const rateOf = (w: Week | undefined, c: Cat, name: string, t: string): number | null =>
  w ? (items(w, c).find((i: any) => i.name === name)?.r?.[t] ?? null) : null;
const tip = chartTip;
const axis = { tick: chartAxisTick, axisLine: chartAxisLine, tickLine: false };

function RateCell({ v, prev, best }: { v: number | null; prev: number | null; best: boolean }) {
  if (v == null) return <td className={tn + ' text-muted-foreground'}>–</td>;
  return (
    <td className={tn}>
      <div className={cn(best && 'text-primary font-semibold')}>{pct(v)}</div>
      {prev != null && Math.abs(v - prev) > 0.001 && <div className="text-caption"><Delta v={v - prev} /></div>}
    </td>
  );
}

export default function Rates() {
  const keys = RATE_WEEKS.map(w => w.key);
  const [vk, setVk] = useState<string>(keys[keys.length - 1]);
  const [ck, setCk] = useState<string>(keys[keys.length - 2]);
  const W = RATE_WEEKS.find(w => w.key === vk)!, P = RATE_WEEKS.find(w => w.key === ck);
  const [ct, setCt] = useState('12m');
  const cat = catOf(ct);
  const [trendName, setTrendName] = useState('NCB');
  const [trendT, setTrendT] = useState('12m');
  const [amt, setAmt] = useState('5,000,000,000');
  const [tenor, setTenor] = useState('6m');

  const best = (c: Cat, t: string) => Math.max(...items(W, c).map((i: any) => i.r[t] ?? -1));
  const bestItem = (c: Cat, t: string) => items(W, c).reduce((a: any, i: any) => ((i.r[t] ?? -1) > (a?.r[t] ?? -1) ? i : a), null);

  const compareData = items(W, cat).filter((i: any) => i.r[ct] != null).map((i: any) => ({
    name: i.name.replace('Standard Chartered', 'SC').replace(' (VNDirect)', '').replace('Sinh lợi qua đêm VPBank', 'VPBank qua đêm').replace('Chứng chỉ tiền gửi VPBank', 'CCTG VPBank'),
    cur: i.r[ct], prev: rateOf(P, cat, i.name, ct),
  }));

  const allNames = useMemo(() => [...new Set(RATE_WEEKS.flatMap(w => [...w.medium, ...w.short].map((i: any) => i.name)))], []);
  const trendCat = catOf(trendT);
  const trend = RATE_WEEKS.slice(-14).map((w, i, arr) => {
    const v = rateOf(w, trendCat, trendName, trendT), pv = i ? rateOf(arr[i - 1], trendCat, trendName, trendT) : null;
    return { k: w.key.replace(/^\d{4}-(\d\d)-W(\d)$/, (_: string, m: string, n: string) => `T${Number(m)}·W${n}`), v, dir: v == null || pv == null ? 0 : Math.sign(Math.round((v - pv) * 100)) };
  });

  const amount = parseFloat(amt.replace(/,/g, '')) || 0;
  const reco = useMemo(() => {
    const d = DAYS[tenor];
    const out: { name: string; t: string; rate: number; interest: number; note: string }[] = [];
    (['medium', 'short', 'ultra'] as Cat[]).forEach(c => items(W, c).forEach((i: any) => {
      if (i.r[tenor] != null) out.push({ name: i.name, t: tenor, rate: i.r[tenor], interest: amount * i.r[tenor] / 100 * d / 365, note: i.strategy || '' });
      if (c === 'ultra' && i.roll && i.r['1d'] != null && tenor !== '1d')
        out.push({ name: i.name, t: '1d × ' + d, rate: i.r['1d'], interest: amount * (Math.pow(1 + i.r['1d'] / 100 / 365, d) - 1), note: 'Quay vòng qua đêm hằng ngày' });
    }));
    return out.sort((a, b) => b.interest - a.interest).slice(0, 3);
  }, [W, tenor, amount]);

  const sel = 'h-8 rounded-sm border bg-background px-2 text-body';
  const kpis: [Cat, string, string][] = [['medium', '12m', 'Cao nhất 12 tháng'], ['medium', '6m', 'Cao nhất 6 tháng'], ['short', '1m', 'Cao nhất 1 tháng'], ['ultra', '1d', 'Qua đêm tốt nhất']];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-4 bg-card border rounded-md px-4 py-3">
        <label className="grid gap-1 text-xs text-muted-foreground">Kỳ đang xem
          <select id="rvk" className={sel} value={vk} onChange={e => setVk(e.target.value)}>{[...RATE_WEEKS].reverse().map(w => <option key={w.key} value={w.key}>{w.label}</option>)}</select></label>
        <label className="grid gap-1 text-xs text-muted-foreground">So sánh với
          <select id="rck" className={sel} value={ck} onChange={e => setCk(e.target.value)}>{[...RATE_WEEKS].reverse().filter(w => w.key !== vk).map(w => <option key={w.key} value={w.key}>{w.label}</option>)}</select></label>
        <div className="text-xs text-muted-foreground ml-auto">Cập nhật <span className="num text-foreground">{W.updatedAt.slice(8, 10)}/{W.updatedAt.slice(5, 7)}/{W.updatedAt.slice(0, 4)} {W.updatedAt.slice(11, 16)}</span> · nguồn history.json</div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(([c, t, l]) => { const b = bestItem(c, t); const p = b ? rateOf(P, c, b.name, t) : null; return (
          <Kpi key={l} label={l} value={b ? pct(b.r[t]) : '–'} sub={<span className="flex items-center gap-2">{b?.name}{p != null && <Delta v={b.r[t] - p} />}</span>} />); })}
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        <Panel className="lg:col-span-7" title="So sánh lãi suất giữa hai kỳ" sub={`${P?.label} và ${W.label}`} right={
          <select id="rct" className={sel} value={ct} onChange={e => setCt(e.target.value)}>
            <optgroup label="Trung hạn">{TENORS.medium.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</optgroup>
            <optgroup label="Ngắn hạn">{TENORS.short.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</optgroup>
            <optgroup label="Dưới 1 tháng">{TENORS.ultra.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</optgroup>
          </select>}>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compareData} margin={{ top: 18, right: 8, left: -12, bottom: 0 }} barGap={2}>
                <CartesianGrid {...chartGrid} />
                <XAxis dataKey="name" {...axis} interval={0} />
                <YAxis {...axis} domain={[(m: number) => Math.max(0, Math.floor(m - 1)), (m: number) => Math.ceil(m + 0.5)]} tickFormatter={v => v + '%'} />
                <Tooltip {...tip} formatter={(v: number) => pct(v)} />
                <RLegend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="prev" name={P?.label} fill="hsl(var(--c6))" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="cur" name={W.label} fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="cur" position="top" formatter={(v: number) => v.toFixed(2)} style={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontFamily: 'var(--font-num)' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel className="lg:col-span-5" title="Diễn biến theo tuần" sub="Cột xanh: tăng so với tuần trước · đỏ: giảm" right={<>
          <select id="rtn" className={sel} value={trendName} onChange={e => setTrendName(e.target.value)}>{allNames.map(n => <option key={n}>{n}</option>)}</select>
          <select id="rtt" className={sel} value={trendT} onChange={e => setTrendT(e.target.value)}>{[...TENORS.medium, ...TENORS.short].map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></>}>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 18, right: 4, left: -14, bottom: 0 }}>
                <CartesianGrid {...chartGrid} />
                <XAxis dataKey="k" {...axis} interval={1} />
                <YAxis {...axis} domain={[(m: number) => Math.max(0, Math.floor(m - 1)), (m: number) => Math.ceil(m + 0.3)]} tickFormatter={v => v + '%'} />
                <Tooltip {...tip} formatter={(v: number) => pct(v)} />
                <Bar dataKey="v" name="Lãi suất" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                  {trend.map((d, i) => <Cell key={i} fill={d.dir > 0 ? 'hsl(var(--pos))' : d.dir < 0 ? 'hsl(var(--neg))' : 'hsl(var(--c6))'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel pad={false} title="Tiền gửi trung hạn 6–12 tháng" sub="Kèm khả năng hỗ trợ vay · số nhỏ dưới mỗi mức là biến động so với kỳ so sánh">
        <div className="overflow-x-auto">
          <table className="w-full text-body border-collapse">
            <thead><tr><th className={th}>Ngân hàng</th>{TENORS.medium.map(([k, l]) => <th key={k} className={th + ' text-right'}>{l}</th>)}<th className={th}>Hỗ trợ vay</th><th className={th}>Định hướng sử dụng</th><th className={th + ' min-w-[240px]'}>Nhận định</th></tr></thead>
            <tbody>{W.medium.map((i: any) => (
              <tr key={i.name} className="hover:bg-accent/40">
                <td className={td + ' font-medium'}>{i.name}</td>
                {TENORS.medium.map(([k]) => <RateCell key={k} v={i.r[k]} prev={rateOf(P, 'medium', i.name, k)} best={i.r[k] === best('medium', k)} />)}
                <td className={td + ' text-xs'}>
                  {i.corp != null && <div>DN vay <span className="num font-medium">{pct(i.corp)}</span></div>}
                  {i.pledge && <div>Cầm cố cá nhân <span className="num font-medium">{pct(i.pledge.r['12m'] ?? i.pledge.r['6m'])}</span><span className="text-muted-foreground"> · gửi + {i.pledge.spread}% · LTV {i.pledge.ltv * 100}%</span></div>}
                  {i.corp == null && !i.pledge && <span className="text-muted-foreground">–</span>}
                </td>
                <td className={td}><Chip tone="primary">{i.strategy}</Chip></td>
                <td className={td + ' text-xs text-muted-foreground'}>{i.comment}</td>
              </tr>))}</tbody>
          </table>
        </div>
      </Panel>

      <div className="grid xl:grid-cols-12 gap-4">
        <Panel pad={false} className="xl:col-span-7" title="Đầu tư ngắn hạn 1–5 tháng">
          <div className="overflow-x-auto">
            <table className="w-full text-body border-collapse">
              <thead><tr><th className={th}>Sản phẩm</th>{TENORS.short.map(([k]) => <th key={k} className={th + ' text-right'}>{k.replace('m', ' th')}</th>)}<th className={th + ' min-w-[200px]'}>Đề xuất sử dụng</th></tr></thead>
              <tbody>{W.short.map((i: any) => (
                <tr key={i.name} className="hover:bg-accent/40"><td className={td + ' font-medium'}>{i.name}</td>
                  {TENORS.short.map(([k]) => <RateCell key={k} v={i.r[k]} prev={rateOf(P, 'short', i.name, k)} best={i.r[k] === best('short', k)} />)}
                  <td className={td + ' text-xs text-muted-foreground'}>{i.strategy}</td></tr>))}</tbody>
            </table>
          </div>
        </Panel>
        <Panel pad={false} className="xl:col-span-5" title="Phương án dưới 1 tháng">
          <div className="overflow-x-auto">
            <table className="w-full text-body border-collapse">
              <thead><tr><th className={th}>Sản phẩm</th>{TENORS.ultra.map(([k, l]) => <th key={k} className={th + ' text-right'}>{l}</th>)}</tr></thead>
              <tbody>{W.ultra.map((i: any) => (
                <tr key={i.name} className="hover:bg-accent/40"><td className={td}><div className="font-medium">{i.name}</div><div className="text-caption text-muted-foreground">{i.roll ? 'Quay vòng hằng ngày' : 'Khóa kỳ hạn'}</div></td>
                  {TENORS.ultra.map(([k]) => <RateCell key={k} v={i.r[k]} prev={rateOf(P, 'ultra', i.name, k)} best={i.r[k] === best('ultra', k)} />)}</tr>))}</tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        <Panel className="lg:col-span-7" title="Công cụ khuyến nghị" sub="Xếp hạng 3 phương án tiền lãi cao nhất của kỳ đang xem · lãi = số tiền × lãi suất × số ngày / 365">
          <div className="flex flex-wrap gap-3 items-end mb-3">
            <label className="grid gap-1 text-xs text-muted-foreground">Số tiền (VND)<input id="rAmt" value={amt} onChange={e => setAmt(e.target.value)} onBlur={() => setAmt(nf(amount))} inputMode="numeric" className="num h-8 w-44 text-right rounded-sm border bg-background px-2 text-body text-foreground" /></label>
            <label className="grid gap-1 text-xs text-muted-foreground">Kỳ hạn<select id="rTen" className={sel} value={tenor} onChange={e => setTenor(e.target.value)}>{[...TENORS.ultra, ...TENORS.short, ...TENORS.medium].map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-body border-collapse">
              <thead><tr><th className={th}>Hạng</th><th className={th}>Sản phẩm</th><th className={th + ' text-right'}>Lãi suất</th><th className={th + ' text-right'}>Tiền lãi ước tính</th><th className={th}>Ghi chú</th></tr></thead>
              <tbody>{reco.map((r, i) => (
                <tr key={r.name + r.t}><td className={td}><span className={cn('inline-grid place-items-center w-6 h-6 rounded-sm text-xs font-semibold', i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted')}>{i + 1}</span></td>
                  <td className={td + ' font-medium'}>{r.name}</td><td className={tn}>{pct(r.rate)}</td><td className={tn + ' font-medium'}>{nf(r.interest)}</td><td className={td + ' text-xs text-muted-foreground'}>{r.note}</td></tr>))}
                {!reco.length && <tr><td className={td + ' text-muted-foreground'} colSpan={5}>Kỳ đang xem chưa có sản phẩm cho kỳ hạn này.</td></tr>}</tbody>
            </table>
          </div>
        </Panel>
        <Panel className="lg:col-span-5" title="Ghi chú cập nhật tuần" sub={W.label}>
          <p className="text-body leading-relaxed text-muted-foreground">{W.note}</p>
        </Panel>
      </div>
    </div>
  );
}
