import { useState, Fragment } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { PERSONAL_DEPOSITS } from '@/data/static';
import { PERSONAL_TOTAL, PLEDGED_TOTAL, loanGroupOf } from '@/lib/calc';
import { LOAN_GROUPS } from '@/data/static';
import { nf, ty, pct, dmy, daysTo } from '@/lib/fmt';
import { Panel, Kpi, Donut, Legend, Chip, th, td, tn } from '@/components/kit';
import { useApp } from '@/state';

const OWNER_C = ['hsl(var(--c1))', 'hsl(var(--c4))', 'hsl(var(--c3))'];
const bankName = (b: string) => b.split('-')[0].replace('VPB', 'VPBank').replace('BVB', 'BVBank');

export default function Personal() {
  const { go } = useApp();
  const [view, setView] = useState<'owner' | 'bank'>('bank');
  const owners = [...new Set(PERSONAL_DEPOSITS.map(d => d.owner))]
    .map((o, i) => ({ k: o, v: PERSONAL_DEPOSITS.filter(d => d.owner === o).reduce((a, d) => a + d.principal, 0), c: OWNER_C[i % 3] }))
    .sort((a, b) => b.v - a.v);
  const banks = Object.entries(PERSONAL_DEPOSITS.reduce<Record<string, number>>((m, d) => { const b = bankName(d.bank); m[b] = (m[b] || 0) + d.principal; return m; }, {}))
    .sort((a, b) => b[1] - a[1]);
  const [openB, setOpenB] = useState<Record<string, boolean>>({});
  const bankRows = [...new Set(PERSONAL_DEPOSITS.map(d => bankName(d.bank)))].map(k => {
    const rows = PERSONAL_DEPOSITS.filter(d => bankName(d.bank) === k).sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
    const v = rows.reduce((a, d) => a + d.principal, 0);
    const rated = rows.filter(d => d.rate != null);
    const rv = rated.reduce((a, d) => a + d.principal, 0);
    const next = rows.map(d => d.due).filter((x): x is string => !!x && daysTo(x) >= 0).sort()[0];
    return { k, rows, v, share: v / PERSONAL_TOTAL * 100, settle: rows.reduce((a, d) => a + d.settle, 0), pledged: rows.filter(d => d.pledged).reduce((a, d) => a + d.principal, 0),
      wRate: rv ? rated.reduce((a, d) => a + (d.rate as number) * d.principal, 0) / rv : null, next };
  }).sort((a, b) => b.v - a.v);
  const due30 = PERSONAL_DEPOSITS.filter(d => d.due && daysTo(d.due) >= 0 && daysTo(d.due) <= 30);
  const liquid = PERSONAL_DEPOSITS.filter(d => !d.due).reduce((a, d) => a + d.principal, 0);

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Tổng tiền gửi" value={ty(PERSONAL_TOTAL)} sub={`${PERSONAL_DEPOSITS.length} sổ / tài khoản · 0 nợ vay`} />
        <Kpi label="Đang cầm cố cho Vihali" value={ty(PLEDGED_TOTAL)} sub={(PLEDGED_TOTAL / PERSONAL_TOTAL * 100).toFixed(1) + '% tổng tiền gửi'} onClick={() => go('vihali')} />
        <Kpi label="Thanh khoản không kỳ hạn" value={ty(liquid)} sub="Sẵn sàng chi" />
        <Kpi label="Đến hạn trong 30 ngày" value={ty(due30.reduce((a, d) => a + d.settle, 0))} sub={due30.map(d => d.code).join(', ') || 'Không có'} onClick={() => go('ke-hoach')} />
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        <Panel className="lg:col-span-5" title="Cơ cấu tiền gửi" right={
          <div className="inline-flex border rounded-sm overflow-hidden text-xs">
            {(['owner', 'bank'] as const).map(v => <button key={v} onClick={() => setView(v)} className={'px-2.5 py-1 ' + (view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>{v === 'owner' ? 'Chủ sổ' : 'Ngân hàng'}</button>)}
          </div>}>
          <div className="flex flex-wrap items-center gap-5">
            {view === 'owner' ? <>
              <Donut data={owners} center={ty(PERSONAL_TOTAL, 1)} sub="Tổng" />
              <Legend rows={owners.map(o => ({ k: o.k, c: o.c, v: ty(o.v), p: (o.v / PERSONAL_TOTAL * 100).toFixed(1) + '%' }))} />
            </> : <div className="grid gap-2.5 w-full">
              {banks.map(([b, v]) => (
                <div key={b} className="grid grid-cols-[70px_1fr_80px] gap-3 items-center text-[13px]">
                  <span>{b}</span>
                  <div className="h-2.5 bg-muted rounded-sm overflow-hidden"><span className="block h-full bg-primary" style={{ width: `${Math.max(v / banks[0][1] * 100, 0.8)}%` }} /></div>
                  <span className="num text-right">{ty(v)}</span>
                </div>))}
            </div>}
          </div>
        </Panel>
        <Panel className="lg:col-span-7" title="Sổ cầm cố đảm bảo khoản vay Vihali" sub="Mỗi sổ và nhóm khoản vay mà sổ đang đảm bảo">
          <div className="grid gap-2.5">
            {PERSONAL_DEPOSITS.filter(d => d.pledged).map(d => {
              const gs = [...new Set(d.loans.map(loanGroupOf).filter(Boolean))];
              return (
                <div key={d.code} className="grid grid-cols-[1fr_auto] sm:grid-cols-[170px_1fr_auto] gap-x-3 gap-y-1 items-center text-[13px] border-b last:border-0 pb-2.5 last:pb-0">
                  <span className="num truncate">{bankName(d.bank)} · {d.code.length > 14 ? d.code.slice(0, 14) + '…' : d.code}</span>
                  <span className="flex flex-wrap gap-1 order-3 sm:order-none col-span-2 sm:col-span-1">
                    {gs.map(g => <Chip key={g} tone="primary">{LOAN_GROUPS.find(x => x.key === g)?.short}</Chip>)}
                    <span className="text-xs text-muted-foreground">{d.loans.length} khế ước</span>
                  </span>
                  <span className="num text-right">{ty(d.principal)}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <Panel pad={false} title="Bảng kê tiền gửi" sub="Cộng theo ngân hàng · bấm từng ngân hàng để xem chi tiết sổ"
        right={<button onClick={() => setOpenB(o => Object.keys(o).length === bankRows.length && Object.values(o).every(Boolean) ? {} : Object.fromEntries(bankRows.map(b => [b.k, true])))} className="text-xs text-primary hover:underline">{bankRows.every(b => openB[b.k]) ? 'Thu gọn tất cả' : 'Mở tất cả'}</button>}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead><tr><th className={th}>Ngân hàng</th><th className={th}>Chủ sổ</th><th className={th}>Mã sổ / tài khoản</th><th className={th + ' text-right'}>Số tiền gốc</th><th className={th + ' text-right'}>Lãi suất</th><th className={th}>Ngày mở</th><th className={th}>Đáo hạn</th><th className={th + ' text-right'}>Dự thu cuối kỳ</th><th className={th}>Cầm cố</th></tr></thead>
            <tbody>
              {bankRows.map(b => (
                <Fragment key={b.k}>
                  <tr className="bg-muted/40 cursor-pointer hover:bg-muted" onClick={() => setOpenB(o => ({ ...o, [b.k]: !o[b.k] }))}>
                    <td className={td + ' font-semibold'} colSpan={3}>
                      <span className="inline-flex items-center gap-1.5">{openB[b.k] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}{b.k}
                        <span className="font-normal text-muted-foreground">· {b.rows.length} sổ · {b.share.toFixed(1)}%</span></span>
                    </td>
                    <td className={tn + ' font-semibold'}>{nf(b.v)}</td>
                    <td className={tn + ' text-muted-foreground text-xs'}>{b.wRate != null ? 'BQ ' + pct(b.wRate) : '–'}</td>
                    <td className={td} />
                    <td className={td + ' num text-xs'}>{b.next ? <>Gần nhất {dmy(b.next)}{daysTo(b.next) <= 30 && <Chip tone="warn" className="ml-1">{daysTo(b.next)} ngày</Chip>}</> : <span className="text-muted-foreground">Không kỳ hạn</span>}</td>
                    <td className={tn + ' font-semibold'}>{nf(b.settle)}</td>
                    <td className={td}>{b.pledged ? <Chip tone="primary">{ty(b.pledged)}</Chip> : <span className="text-xs text-muted-foreground">Không</span>}</td>
                  </tr>
                  {openB[b.k] && b.rows.map(d => {
                    const dd = d.due ? daysTo(d.due) : null;
                    return (
                      <tr key={d.code} className="hover:bg-accent/40">
                        <td className={td + ' pl-9 text-muted-foreground'}>{d.bank}</td><td className={td}>{d.owner}</td><td className={td + ' num'}>{d.code}</td>
                        <td className={tn}>{nf(d.principal)}</td><td className={tn}>{pct(d.rate)}</td>
                        <td className={td + ' num text-muted-foreground'}>{dmy(d.open)}</td>
                        <td className={td + ' num'}>{d.due ? dmy(d.due) : <span className="text-muted-foreground">Không kỳ hạn</span>} {dd != null && dd <= 30 && <Chip tone="warn" className="ml-1">{dd} ngày</Chip>}</td>
                        <td className={tn}>{nf(d.settle)}</td>
                        <td className={td}>{d.pledged ? <Chip tone="primary">Cầm cố</Chip> : <span className="text-xs text-muted-foreground">Không</span>}</td>
                      </tr>);
                  })}
                </Fragment>
              ))}
              <tr className="font-semibold bg-muted/60"><td className={td} colSpan={3}>Tổng cộng · {PERSONAL_DEPOSITS.length} sổ</td><td className={tn}>{nf(PERSONAL_TOTAL)}</td><td className={td} colSpan={3} /><td className={tn}>{nf(PERSONAL_DEPOSITS.reduce((a, d) => a + d.settle, 0))}</td><td className={td}><span className="num text-xs">{ty(PLEDGED_TOTAL)}</span></td></tr>
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
