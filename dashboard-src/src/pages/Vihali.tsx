import { useState, Fragment } from 'react';
import { ChevronDown, ChevronRight, FileText, ExternalLink, Link2 } from 'lucide-react';
import { COMPANY_DEPOSITS } from '@/data/static';
import { GROUP_SUMMARY, LOAN_TOTAL, HM_TOTAL, loansOf } from '@/lib/calc';
import { nf, ty, pct, dmy, daysTo } from '@/lib/fmt';
import { Panel, Kpi, Donut, Legend, Chip, th, td, tn } from '@/components/kit';
import { useApp } from '@/state';
import { LOANS, CONTRACT_DEFAULTS } from '@/data/static';

function ContractCell({ code, bank }: { code: string; bank: string }) {
  const { editor, links, saveLink } = useApp();
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const own = links[code];
  const link = own || CONTRACT_DEFAULTS[bank];
  if (edit) return (
    <form className="flex gap-1 items-center" onSubmit={async e => {
      e.preventDefault(); const v = (e.currentTarget.elements.namedItem('u') as HTMLInputElement).value.trim();
      setBusy(true); setErr(''); const r = await saveLink(code, v); setBusy(false);
      if (r) setErr(r); else setEdit(false);
    }}>
      <input id={'lk' + code} name="u" defaultValue={own || ''} placeholder="Dán link Google Drive (để trống để xóa)" className="h-7 w-52 rounded-sm border bg-background px-2 text-xs" autoFocus />
      <button disabled={busy} className="h-7 px-2 text-xs rounded-sm bg-primary text-primary-foreground disabled:opacity-60">{busy ? '…' : 'Lưu'}</button>
      <button type="button" onClick={() => setEdit(false)} className="h-7 px-2 text-xs rounded-sm border">Hủy</button>
      {err && <span className="text-[11px] text-neg">{err}</span>}
    </form>
  );
  return (
    <div className="flex items-center gap-2">
      {link ? (
        <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline whitespace-nowrap">
          <FileText className="w-3.5 h-3.5" />{own ? 'Bản cứng' : 'HĐTD khung'}<ExternalLink className="w-3 h-3" />
        </a>
      ) : <span className="text-xs text-muted-foreground whitespace-nowrap">Chưa gắn</span>}
      {editor && <button onClick={() => setEdit(true)} className="text-muted-foreground hover:text-primary" aria-label="Gắn link hợp đồng"><Link2 className="w-3.5 h-3.5" /></button>}
    </div>
  );
}

export default function Vihali() {
  const [open, setOpen] = useState<Record<string, boolean>>({ 'bidv-od-tn': true });
  const due30 = LOANS.filter(l => daysTo(l.due) >= 0 && daysTo(l.due) <= 30);
  const wRate = GROUP_SUMMARY.reduce((a, g) => a + g.rate * g.out, 0) / LOAN_TOTAL;
  const { go } = useApp();

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Tổng dư nợ gốc" value={ty(LOAN_TOTAL)} sub={`${LOANS.length} khế ước active · BIDV + SC`} />
        <Kpi label="Hạn mức còn lại" value={ty(HM_TOTAL)} sub="Thấu chi + VLĐ" />
        <Kpi label="Lãi suất bình quân" value={pct(wRate)} sub="Bình quân gia quyền theo dư nợ" />
        <Kpi label="Đến hạn trong 30 ngày" value={ty(due30.reduce((a, l) => a + l.settle, 0))} sub={`${due30.length} khế ước · gốc + lãi`} onClick={() => go('ke-hoach')} />
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        <Panel className="lg:col-span-5" title="Tỷ trọng dư nợ" sub="Theo nhóm khoản vay">
          <div className="flex flex-wrap items-center gap-5">
            <Donut data={GROUP_SUMMARY.map(g => ({ k: g.short, v: g.out, c: g.color }))} center={ty(LOAN_TOTAL, 1)} sub="Dư nợ" />
            <Legend rows={GROUP_SUMMARY.map(g => ({ k: g.short, c: g.color, v: ty(g.out), p: (g.out / LOAN_TOTAL * 100).toFixed(1) + '%' }))} />
          </div>
        </Panel>
        <Panel className="lg:col-span-7" title="Dư nợ và hạn mức còn lại" sub="Mỗi thanh = dư nợ + hạn mức chưa dùng">
          <div className="grid gap-4">
            {GROUP_SUMMARY.map(g => {
              const tot = g.out + g.hm, max = Math.max(...GROUP_SUMMARY.map(x => x.out + x.hm));
              return (
                <div key={g.key} className="grid grid-cols-[minmax(0,120px)_1fr] sm:grid-cols-[150px_1fr_150px] gap-x-3 gap-y-1 items-center text-[13px]">
                  <span className="truncate">{g.short}</span>
                  <div className="h-3 rounded-sm bg-muted overflow-hidden flex" style={{ width: `${(tot / max) * 100}%` }}>
                    <span style={{ width: `${(g.out / tot) * 100}%`, background: g.color }} />
                    <span className="flex-1" style={{ background: `repeating-linear-gradient(45deg, transparent 0 3px, hsl(var(--border)) 3px 5px)` }} />
                  </div>
                  <span className="num text-xs text-muted-foreground sm:text-right col-start-2 sm:col-start-auto">{ty(g.out)} / còn {ty(g.hm)}</span>
                </div>
              );
            })}
            <div className="flex gap-4 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1.5"><i className="w-3 h-2.5 bg-primary rounded-[1px]" />Dư nợ</span>
              <span className="flex items-center gap-1.5"><i className="w-3 h-2.5 rounded-[1px] border" style={{ background: 'repeating-linear-gradient(45deg, transparent 0 3px, hsl(var(--border)) 3px 5px)' }} />Hạn mức còn lại</span>
            </div>
          </div>
        </Panel>
      </div>

      <Panel pad={false} title="Chi tiết khế ước theo nhóm" sub="Bấm nhóm để mở · cột Hợp đồng mở bản cứng trên Google Drive">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead><tr>
              <th className={th}>Khế ước</th><th className={th}>Giải ngân</th><th className={th}>Đáo hạn</th><th className={th + ' text-right'}>Còn</th>
              <th className={th + ' text-right'}>Lãi suất</th><th className={th + ' text-right'}>Dư nợ gốc</th><th className={th + ' text-right'}>Lãi phải trả</th>
              <th className={th + ' text-right'}>Dự trả gốc + lãi</th><th className={th}>Tài sản đảm bảo</th><th className={th}>Hợp đồng</th>
            </tr></thead>
            <tbody>
              {GROUP_SUMMARY.map(g => (
                <Fragment key={g.key}>
                  <tr className="bg-muted/40 cursor-pointer hover:bg-muted" onClick={() => setOpen(o => ({ ...o, [g.key]: !o[g.key] }))}>
                    <td className={td + ' font-semibold'} colSpan={4}>
                      <span className="inline-flex items-center gap-1.5">
                        {open[g.key] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <i className="w-2.5 h-2.5 rounded-[2px]" style={{ background: g.color }} />{g.label}
                        <span className="font-normal text-muted-foreground">· {g.count} khế ước</span>
                      </span>
                    </td>
                    <td className={tn}>{pct(g.rate)}</td><td className={tn + ' font-semibold'}>{nf(g.out)}</td><td className={tn} /><td className={tn} />
                    <td className={td + ' text-xs text-muted-foreground'} colSpan={2}>HM còn lại <span className="num text-foreground">{nf(g.hm)}</span></td>
                  </tr>
                  {open[g.key] && loansOf(g.key).sort((a, b) => a.due.localeCompare(b.due)).map(l => {
                    const d = daysTo(l.due);
                    return (
                      <tr key={l.code} className="hover:bg-accent/40">
                        <td className={td + ' num pl-9'}>{l.code}</td>
                        <td className={td + ' num text-muted-foreground'}>{dmy(l.disb)}</td>
                        <td className={td + ' num'}>{dmy(l.due)}</td>
                        <td className={tn}>{d <= 30 ? <Chip tone="warn">{d} ngày</Chip> : <span className="text-muted-foreground">{d} ngày</span>}</td>
                        <td className={tn}>{pct(l.rate)}</td>
                        <td className={tn}>{nf(l.principal)}</td>
                        <td className={tn + ' text-muted-foreground'}>{l.interest ? nf(l.interest) : '–'}</td>
                        <td className={tn}>{nf(l.settle)}</td>
                        <td className={td}>
                          {l.deposits.length ? (
                            <button onClick={() => go('ca-nhan')} className="text-xs text-primary hover:underline num whitespace-nowrap">
                              {l.deposits.length > 1 ? `${l.deposits.length} sổ SC-HCM` : 'Sổ ' + l.deposits[0]}
                            </button>
                          ) : <span className="text-xs text-muted-foreground">Chưa gắn</span>}
                        </td>
                        <td className={td}><ContractCell code={l.code} bank={l.bank} /></td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
              <tr className="font-semibold bg-muted/60">
                <td className={td} colSpan={5}>Cộng</td><td className={tn}>{nf(LOAN_TOTAL)}</td><td className={tn} /><td className={tn} />
                <td className={td + ' text-xs'} colSpan={2}>HM còn lại <span className="num">{nf(HM_TOTAL)}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel pad={false} title="Sổ tiết kiệm công ty đảm bảo thấu chi" sub="BIDV chi nhánh Trường Sơn">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead><tr><th className={th}>Mã sổ</th><th className={th}>Ngày gửi</th><th className={th}>Đáo hạn</th><th className={th + ' text-right'}>Lãi suất</th><th className={th + ' text-right'}>Số tiền trên sổ</th><th className={th + ' text-right'}>Dự thu cuối kỳ</th><th className={th}>Đảm bảo cho</th></tr></thead>
            <tbody>{COMPANY_DEPOSITS.map(d => (
              <tr key={d.code}><td className={td + ' num'}>{d.code}</td><td className={td + ' num text-muted-foreground'}>{dmy(d.open)}</td><td className={td + ' num'}>{dmy(d.due)}</td>
                <td className={tn}>{pct(d.rate)}</td><td className={tn}>{nf(d.principal)}</td><td className={tn}>{nf(d.settle)}</td>
                <td className={td}>{d.loans.map(c => <Chip key={c} tone="primary" className="num mr-1">{c}</Chip>)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
