import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend as RLegend } from 'recharts';
import { Send, Check, RotateCcw, FilePen, Plus, Trash2, Lock, ExternalLink, Save } from 'lucide-react';
import { PLAN_MONTHS, PLAN_HIGHLIGHTS, SOURCE_LABEL, STATUS_LABEL, PLAN_ACTUALS } from '@/data/static';
import PlanActuals from '@/pages/PlanActuals';
import { prevMonth } from '@/lib/calc';
import type { PlanLine, PlanApproval, Entity, PlanMonth, ArchivePlan, ArchiveBlock } from '@/data/static';
import { postToAppsScript, loadArchive, fmtStamp } from '@/data/store';
import { buildPlan, runBalance } from '@/lib/calc';
import { nf, ty, dm, dmy } from '@/lib/fmt';
import { Panel, Chip, th, td, tn } from '@/components/kit';
import { useApp } from '@/state';
import { cn } from '@/lib/utils';

const ENT: Record<Entity, string> = { vihali: 'Vihali', personal: 'Cá nhân' };
const TITLE: Record<Entity, string> = { vihali: 'Kế hoạch dòng tiền & hạn mức thấu chi khả dụng', personal: 'Kế hoạch quản lý Individual Treasury' };
const OLD = './plans/';
const siteUrl = () => location.href.split('#')[0];

const statusTone = (s: PlanApproval['status']) => (s === 'approved' ? 'pos' : s === 'pending_cfo_review' ? 'gold' : s === 'revision_requested' ? 'neg' : 'default') as any;
const nowStr = () => { const d = new Date(); const p = (n: number) => String(n).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`; };

function Approval({ month, ent, readonly }: { month: string; ent: Entity; readonly?: boolean }) {
  const { approvals, setApproval, dirty, saveInputs, inputs } = useApp();
  const a = approvals[month][ent];
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const submit = async () => {
    setBusy(true); setMsg('');
    if (inputs[month]) {
      const err = await saveInputs(month, { keepVersion: true });
      if (err) { setBusy(false); setConfirm(false); setMsg(err); return; }
    }
    const planType = ent === 'vihali' ? 'company' : 'personal';
    const r = await postToAppsScript({
      planId: `${month}-${planType}`, month, planType, title: TITLE[ent], version: a.version,
      contentHash: `${month}-${planType}:${a.version}`, planUrl: `${siteUrl()}#ke-hoach`, indexUrl: `${siteUrl()}#ke-hoach`, reviewChannel: 'mail',
    });
    setBusy(false); setConfirm(false);
    if (!r.ok) { setMsg(r.error || 'Không gửi được, thử lại sau.'); return; }
    setApproval(month, ent, { ...a, status: 'pending_cfo_review', events: [...a.events, { at: nowStr(), kind: 'submit', text: `Trình CFO ${a.version}` }] });
    setMsg('Đã gửi mail trình CFO.');
  };
  const last = (k: string) => [...a.events].reverse().find(e => e.kind === k);
  const submitted = a.status !== 'draft';
  const steps = [
    { l: 'Lập kế hoạch', done: true, at: last('draft')?.at },
    { l: 'Trình CFO', done: submitted, at: submitted ? last('submit')?.at : undefined },
    { l: a.status === 'revision_requested' ? 'CFO trả về' : 'CFO duyệt', done: a.status === 'approved' || a.status === 'revision_requested', at: (last('approve') || last('revise'))?.at, bad: a.status === 'revision_requested' },
  ];
  const canSubmit = !readonly && (a.status === 'draft' || a.status === 'revision_requested');
  return (
    <div className="border rounded-md p-3.5 grid gap-3 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap"><span className="font-semibold">{ENT[ent]}</span><Chip>{a.version}</Chip><Chip tone={statusTone(a.status)}>{STATUS_LABEL[a.status]}</Chip></div>
        {canSubmit && !confirm && dirty[month] && <span className="text-xs text-warn">Lưu kế hoạch trước khi trình</span>}
        {canSubmit && !confirm && !dirty[month] && <button onClick={() => setConfirm(true)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-sm bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90"><Send className="w-3.5 h-3.5" />Trình CFO</button>}
        {a.status === 'pending_cfo_review' && <span className="text-xs text-muted-foreground">Đã gửi mail tới CFO · chờ phản hồi</span>}
      </div>
      {confirm && (
        <div className="flex flex-wrap items-center gap-2 bg-accent/60 rounded-sm px-3 py-2 text-[13px]">
          <span className="flex-1 min-w-[180px]">Gửi {a.version} kế hoạch {ENT[ent]} tới CFO duyệt?</span>
          <button disabled={busy} onClick={submit} className="h-7 px-3 rounded-sm bg-primary text-primary-foreground text-xs font-medium disabled:opacity-60">{busy ? 'Đang gửi…' : 'Gửi'}</button>
          <button onClick={() => setConfirm(false)} className="h-7 px-3 rounded-sm border text-xs">Hủy</button>
        </div>)}
      {msg && <div className={cn('text-xs', msg.startsWith('Đã') ? 'text-pos' : 'text-neg')}>{msg}</div>}
      <ol className="grid grid-cols-3 gap-1">
        {steps.map((s, i) => (
          <li key={i} className="grid gap-1.5">
            <div className={cn('h-1 rounded-full', s.done ? (s.bad ? 'bg-[hsl(var(--neg))]' : 'bg-[hsl(var(--pos))]') : 'bg-muted')} />
            <div className="text-xs font-medium flex items-center gap-1">{s.done && (s.bad ? <RotateCcw className="w-3 h-3 text-neg" /> : <Check className="w-3 h-3 text-pos" />)}{s.l}</div>
            <div className="num text-[11px] text-muted-foreground">{s.at || '—'}</div>
          </li>))}
      </ol>
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Lịch sử ({a.events.length})</summary>
        <ul className="mt-2 grid gap-1.5 border-l pl-3">
          {[...a.events].reverse().map((e, i) => (
            <li key={i} className="grid grid-cols-[112px_1fr] gap-2"><span className="num text-muted-foreground">{e.at}</span>
              <span className={cn(e.kind === 'approve' && 'text-pos', e.kind === 'revise' && 'text-neg')}>{e.text}</span></li>))}
        </ul>
      </details>
    </div>
  );
}

function FlowTable({ rows, open, label, opening, m }: { rows: (PlanLine & { bal: number })[]; open: number; label: string; opening: string; m: PlanMonth }) {
  const tin = rows.filter(r => r.dir === 'in').reduce((a, r) => a + r.amount, 0), tout = rows.filter(r => r.dir === 'out').reduce((a, r) => a + r.amount, 0);
  return (
    <div className="scrollbox overflow-auto flex-1 min-h-0 max-h-[520px] xl:max-h-none">
      <table className="w-full text-[13px] border-collapse">
        <thead><tr><th className={th + ' w-14'}>Ngày</th><th className={th}>Nội dung</th><th className={th + ' text-right'}>Thu / chi</th><th className={th + ' text-right'}>{label}</th></tr></thead>
        <tbody>
          <tr className="bg-muted/40"><td className={td + ' num'}>{dm(m.from)}</td><td className={td + ' font-medium'}>{opening}</td><td className={tn} /><td className={tn + ' font-medium'}>{nf(open)}</td></tr>
          {rows.map(r => (
            <tr key={r.id} className="hover:bg-accent/40 align-top">
              <td className={td + ' num'}>{dm(r.date)}</td>
              <td className={td}>
                <div className="leading-snug">{r.label}</div>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <Chip tone={r.source === 'adhoc' ? 'gold' : r.source === 'loan' || r.source === 'deposit' ? 'primary' : 'default'}>{SOURCE_LABEL[r.source]}</Chip>
                  {r.note && <span className="text-[11px] text-muted-foreground">{r.note}</span>}
                </div>
              </td>
              <td className={tn + (r.dir === 'in' ? ' text-pos' : ' text-neg')}>{r.dir === 'in' ? '+' : '−'}{nf(r.amount)}</td>
              <td className={tn + (r.bal < 0 ? ' text-neg font-semibold' : '')}>{nf(r.bal)}</td>
            </tr>))}
          {!rows.length && <tr><td className={td + ' text-muted-foreground'} colSpan={4}>Không có thu chi trong kỳ.</td></tr>}
        </tbody>
        <tfoot>
          <tr className="bg-muted/60 text-[12.5px]"><td className={td} colSpan={2}>Tổng thu</td><td className={tn + ' text-pos'}>+{nf(tin)}</td><td className={tn} /></tr>
          <tr className="bg-muted/60 text-[12.5px]"><td className={td} colSpan={2}>Tổng chi</td><td className={tn + ' text-neg'}>−{nf(tout)}</td><td className={tn} /></tr>
          <tr className="bg-muted/60 font-semibold"><td className={td} colSpan={3}>Cuối kỳ {dm(m.to)}</td><td className={tn}>{nf(open + tin - tout)}</td></tr>
        </tfoot>
      </table>
    </div>
  );
}

function EditorPanel({ m }: { m: PlanMonth }) {
  const { inputs, editInputs, dirty, saveInputs, discardInputs } = useApp();
  const p = inputs[m.key];
  const [f, setF] = useState({ date: m.from, entity: 'vihali' as Entity, dir: 'out' as 'in' | 'out', label: '', amount: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const inp = 'h-8 rounded-sm border bg-background px-2 text-[13px]';
  const money = (v: string) => parseFloat(v.replace(/,/g, '')) || 0;
  const save = async () => { setBusy(true); setMsg(''); const err = await saveInputs(m.key); setBusy(false); setMsg(err || 'Đã lưu. Người xem thấy bản mới sau khoảng 1 phút.'); };
  return (
    <Panel className="border-[hsl(var(--gold))] border-dashed" title={<span className="inline-flex items-center gap-1.5"><FilePen className="w-4 h-4 text-gold" />Nhập liệu người lập · {p.version}</span>} sub="Chỉ hiện ở chế độ người lập. Bấm Lưu để ghi lên GitHub cho mọi người xem."
      right={<>
        {msg && <span className={cn('text-xs', msg.startsWith('Đã') ? 'text-pos' : 'text-neg')}>{msg}</span>}
        {dirty[m.key] && <button onClick={() => discardInputs(m.key)} className="h-8 px-3 rounded-sm border text-[13px] inline-flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5" />Hoàn tác</button>}
        <button disabled={!dirty[m.key] || busy} onClick={save} className="h-8 px-3 rounded-sm bg-primary text-primary-foreground text-[13px] font-medium inline-flex items-center gap-1.5 disabled:opacity-50"><Save className="w-3.5 h-3.5" />{busy ? 'Đang lưu…' : 'Lưu kế hoạch'}</button>
      </>}>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="grid gap-4 content-start">
          <div className="grid gap-2">
            <h3 className="eyebrow">Số dư đầu kỳ</h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {(['vihali', 'personal'] as Entity[]).map(e => (
                <label key={e} className="grid gap-1 text-xs text-muted-foreground">{e === 'vihali' ? 'Vihali · HM thấu chi khả dụng' : 'Cá nhân · thanh khoản'}
                  <input id={'op' + e} key={p.opening[e]} defaultValue={nf(p.opening[e])} inputMode="numeric" onBlur={ev => { const v = money(ev.target.value); ev.target.value = nf(v); if (v !== p.opening[e]) editInputs(m.key, x => ({ ...x, opening: { ...x.opening, [e]: v } })); }} className={inp + ' num text-right text-foreground'} />
                </label>))}
            </div>
          </div>
          <div className="grid gap-2">
            <h3 className="eyebrow">Thu / chi phát sinh</h3>
            <form className="grid grid-cols-2 sm:grid-cols-[130px_110px_90px_1fr] gap-2" onSubmit={e => {
              e.preventDefault(); const amount = money(f.amount); if (!f.label || !amount) return;
              editInputs(m.key, x => ({ ...x, adhoc: [...x.adhoc, { id: 'a' + Date.now(), date: f.date, entity: f.entity, dir: f.dir, label: f.label, amount, source: 'adhoc' }] }));
              setF({ ...f, label: '', amount: '' });
            }}>
              <input id="adDate" type="date" min={m.from} max={m.to} value={f.date} onChange={e => setF({ ...f, date: e.target.value })} className={inp} />
              <select id="adEnt" value={f.entity} onChange={e => setF({ ...f, entity: e.target.value as Entity })} className={inp}><option value="vihali">Vihali</option><option value="personal">Cá nhân</option></select>
              <select id="adDir" value={f.dir} onChange={e => setF({ ...f, dir: e.target.value as 'in' | 'out' })} className={inp}><option value="out">Chi</option><option value="in">Thu</option></select>
              <input id="adAmt" placeholder="Số tiền" inputMode="numeric" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} onBlur={() => f.amount && setF({ ...f, amount: nf(money(f.amount)) })} className={inp + ' num text-right'} />
              <input id="adLbl" placeholder="Nội dung" value={f.label} onChange={e => setF({ ...f, label: e.target.value })} className={inp + ' col-span-2 sm:col-span-3'} />
              <button className="h-8 rounded-sm bg-primary text-primary-foreground text-[13px] font-medium inline-flex items-center justify-center gap-1"><Plus className="w-3.5 h-3.5" />Thêm</button>
            </form>
            <ul className="grid gap-1.5">
              {[...p.adhoc, ...p.carry].map(a => (
                <li key={a.id} className="flex items-center gap-2 text-[13px] border rounded-sm px-2.5 py-1.5">
                  <span className="num text-muted-foreground w-11">{dm(a.date)}</span><Chip>{ENT[a.entity]}</Chip>
                  <span className="flex-1 truncate">{a.label}{a.source === 'carry' && <span className="text-muted-foreground"> · kế thừa</span>}</span>
                  <span className={cn('num', a.dir === 'in' ? 'text-pos' : 'text-neg')}>{a.dir === 'in' ? '+' : '−'}{nf(a.amount)}</span>
                  <button onClick={() => editInputs(m.key, x => ({ ...x, adhoc: x.adhoc.filter(y => y.id !== a.id), carry: x.carry.filter(y => y.id !== a.id) }))} aria-label="Xóa" className="text-muted-foreground hover:text-neg"><Trash2 className="w-3.5 h-3.5" /></button>
                </li>))}
              {!p.adhoc.length && !p.carry.length && <li className="text-xs text-muted-foreground">Chưa có khoản phát sinh.</li>}
            </ul>
          </div>
        </div>
        <div className="grid gap-2 content-start">
          <h3 className="eyebrow">Khoản định kỳ theo các tháng trước</h3>
          <ul className="grid gap-1.5">
            {p.recurring.map((r, i) => (
              <li key={r.id} className="grid grid-cols-[auto_1fr_130px] gap-2 items-center text-[13px] border rounded-sm px-2.5 py-1.5">
                <input id={'rc' + r.id} type="checkbox" checked={r.on} onChange={e => editInputs(m.key, x => ({ ...x, recurring: x.recurring.map((y, j) => (j === i ? { ...y, on: e.target.checked } : y)) }))} className="accent-[hsl(var(--primary))]" />
                <span className="min-w-0"><span className={cn(!r.on && 'line-through text-muted-foreground')}>{r.label}</span><span className="block text-[11px] text-muted-foreground">{ENT[r.entity]} · {r.dir === 'in' ? 'thu' : 'chi'} ngày {r.day} hằng tháng{r.startMonth ? ` · từ T${Number(r.startMonth.slice(5))}` : ''} · {r.seen}</span></span>
                <input id={'ra' + r.id} key={r.amount} defaultValue={nf(r.amount)} inputMode="numeric" onBlur={e => { const v = money(e.target.value); e.target.value = nf(v); if (v !== r.amount) editInputs(m.key, x => ({ ...x, recurring: x.recurring.map((y, j) => (j === i ? { ...y, amount: v } : y)) })); }} className={inp + ' num text-right w-full'} />
              </li>))}
            {!p.recurring.length && <li className="text-xs text-muted-foreground">Chưa có khoản định kỳ.</li>}
          </ul>
        </div>
      </div>
    </Panel>
  );
}

function ArchiveBlocks({ blocks }: { blocks: ArchiveBlock[] }) {
  return (
    <div className="grid">
      {blocks.map((b, i) => {
        if (b.type === 'h') return <h3 key={i} className={cn('px-4 font-semibold', b.level <= 2 ? 'pt-4 pb-2 text-[13.5px] border-t first:border-t-0 bg-muted/30' : 'pt-3 pb-1.5 text-[13px] text-muted-foreground')}>{b.text}</h3>;
        if (b.type === 'p') return <p key={i} className="px-4 py-1.5 text-[12.5px] text-muted-foreground leading-relaxed whitespace-pre-line">{b.text}</p>;
        if (b.type === 'ul') return <ul key={i} className="px-4 py-1.5 grid gap-1 text-[12.5px] list-disc pl-8">{b.items.map((t, k) => <li key={k} className="whitespace-pre-line">{t}</li>)}</ul>;
        return (
          <div key={i} className="overflow-x-auto">
            <table className="w-full text-[12.5px] border-collapse">
              {b.head.length > 0 && <thead><tr>{b.head.map((h, k) => <th key={k} className={th + (b.rows.some(r => r[k]?.n) ? ' text-right' : '')}>{h}</th>)}</tr></thead>}
              <tbody>{b.rows.map((r, k) => {
                const total = r.length > 0 && /^(tổng|cộng|số dư cuối kỳ)/i.test(r[0].t);
                return (
                  <tr key={k} className={cn('hover:bg-accent/40 align-top', total && 'bg-muted/50 font-semibold')}>
                    {r.map((c, z) => <td key={z} className={cn(c.n ? tn : td, 'py-2 whitespace-pre-line', !c.n && c.t.length > 24 && 'min-w-[180px]', c.b && 'font-semibold', c.n && /^\(|^[-−]/.test(c.t) && 'text-neg')}>{c.t}</td>)}
                  </tr>);
              })}</tbody>
            </table>
          </div>);
      })}
    </div>
  );
}

function ArchiveView({ m }: { m: PlanMonth }) {
  const { approvals } = useApp();
  const [data, setData] = useState<Record<string, ArchivePlan | null | undefined>>({});
  useEffect(() => {
    let on = true;
    setData({});
    Promise.all([loadArchive(m.key, 'company'), loadArchive(m.key, 'personal')]).then(([c, p]) => { if (on) setData({ vihali: c, personal: p }); });
    return () => { on = false; };
  }, [m.key]);
  return (
    <div className="grid xl:grid-cols-2 gap-4">
      {(['vihali', 'personal'] as Entity[]).map(e => {
        const d = data[e];
        const hl = PLAN_HIGHLIGHTS[m.key]?.[e] || [];
        return (
          <Panel key={e} pad={false} className="xl:h-[760px]" title={<span className="flex items-center gap-2"><span className="eyebrow text-primary">{ENT[e]}</span>{e === 'vihali' ? 'Kế hoạch dòng tiền & hạn mức thấu chi' : 'Kế hoạch Individual Treasury'}</span>}
            sub={d?.meta || `${approvals[m.key]?.[e]?.version || ''}`}
            right={<a href={`${OLD}${m.key}/${e === 'vihali' ? 'company' : 'personal'}.html`} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-primary">Bản gốc<ExternalLink className="w-3 h-3" /></a>}>
            <div className="flex flex-col h-full">
            {hl.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 border-b">
                {hl.slice(0, 4).map(([k, v], i) => (
                  <div key={k} className={cn('px-4 py-3 min-w-0', i % 2 && 'border-l', i >= 2 && 'border-t sm:border-t-0', i === 2 && 'sm:border-l')}><div className="text-xs text-muted-foreground">{k}</div><div className="num text-[15px] font-medium mt-0.5">{v}</div></div>))}
              </div>)}
            {d === undefined ? <p className="p-4 text-xs text-muted-foreground">Đang tải…</p>
              : d === null ? <p className="p-4 text-xs text-muted-foreground">Không có bản kế hoạch {ENT[e]} cho tháng này.</p>
              : <div className="scrollbox overflow-auto flex-1 min-h-0 max-h-[520px] xl:max-h-none"><ArchiveBlocks blocks={d.blocks} /></div>}
            </div>
          </Panel>);
      })}
    </div>
  );
}

export default function Plan() {
  const { editor, inputs, approvals, liveMonth } = useApp();
  const [month, setMonth] = useState(liveMonth || PLAN_MONTHS[0]?.key);
  const m = PLAN_MONTHS.find(x => x.key === month)!;
  if (!m) return <p className="text-muted-foreground">Chưa có kế hoạch tháng.</p>;
  const live = m.mode === 'live' && !!inputs[month];
  const snap = m.mode === 'snapshot' ? inputs[month]?.snapshot : undefined;
  const computed = m.mode !== 'archive' && !!inputs[month];
  const lines = !computed ? [] : snap ? snap.lines : buildPlan(month, inputs[month].recurring, inputs[month].adhoc, inputs[month].carry);
  const prevClose = PLAN_ACTUALS[prevMonth(month)]?.closing;
  // Kế hoạch đang lập: HM thấu chi đầu kỳ = HM thấu chi BIDV thực tế cuối tháng trước
  const op = !computed ? { vihali: 0, personal: 0 } : snap ? snap.opening : live && prevClose ? { ...inputs[month].opening, vihali: prevClose.odAvailable } : inputs[month].opening;
  const vh = runBalance(lines, 'vihali', op.vihali), cn_ = runBalance(lines, 'personal', op.personal);
  const end = (rows: { bal: number }[], o: number) => (rows.length ? rows[rows.length - 1].bal : o);
  const minOf = (rows: { bal: number; date: string }[], o: number) => rows.reduce((a, r) => (r.bal < a.v ? { v: r.bal, d: r.date } : a), { v: o, d: m.from });
  const dates = [...new Set([m.from, ...lines.map(l => l.date), m.to])].sort();
  const chart = dates.map(d => ({ d: dm(d), vh: end(vh.filter(r => r.date <= d), op.vihali) / 1e9, cn: end(cn_.filter(r => r.date <= d), op.personal) / 1e9 }));
  const vmin = minOf(vh, op.vihali), cmin = minOf(cn_, op.personal);
  const monthEnd = `${month}-${String(new Date(+month.slice(0, 4), +month.slice(5, 7), 0).getDate()).padStart(2, '0')}`;
  const arch = PLAN_ACTUALS[month]?.plan;
  const actualsPlan = computed
    ? { v: lines.filter(l => l.entity === 'vihali' && l.dir === 'out'), p: lines.filter(l => l.entity === 'personal' && l.dir === 'out'), close: end(vh.filter(r => r.date <= monthEnd), op.vihali) as number | null }
    : { v: arch?.vihali || [], p: arch?.personal || [], close: arch?.openingVihali != null ? arch.openingVihali - (arch.vihali || []).reduce((a, x) => a + x.amount, 0) : null };
  const sum = (rows: PlanLine[], dir: 'in' | 'out') => rows.filter(r => r.dir === dir).reduce((a, r) => a + r.amount, 0);

  return (
    <div className="grid gap-4 grid-cols-[minmax(0,1fr)]">
      <div className="flex flex-wrap items-center gap-3 bg-card border rounded-md px-4 py-3 min-w-0">
        <div className="max-w-full overflow-x-auto">
          <div className="inline-flex border rounded-sm overflow-hidden text-[13px]">
            {PLAN_MONTHS.map(x => {
              const st = approvals[x.key]?.vihali.status;
              return <button key={x.key} onClick={() => setMonth(x.key)} className={cn('px-3 py-1.5 flex items-center gap-1.5 whitespace-nowrap', month === x.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
                {x.label.replace('Tháng ', 'T')}{st === 'approved' && <Check className="w-3 h-3" />}</button>;
            })}
          </div>
        </div>
        <span className="text-[13px]">Kỳ kế hoạch <span className="num font-medium">{dmy(m.from)} – {dmy(m.to)}</span></span>
        <span className="text-xs text-muted-foreground ml-auto">{live ? 'Đang lập · tự sinh từ dữ liệu tab Vihali, Cá nhân và các khoản định kỳ' : snap ? `Bản đã lưu ${fmtStamp(snap.savedAt)}` : 'Bản kế hoạch đã trình'}</span>
      </div>

      {live && editor && <EditorPanel m={m} />}

      <Panel title="Phê duyệt CFO" sub="Trình CFO gửi mail duyệt tới CFO; trạng thái cập nhật khi CFO duyệt hoặc trả về">
        <div className="grid md:grid-cols-2 gap-3">
          <Approval month={month} ent="vihali" readonly={!live} />
          <Approval month={month} ent="personal" readonly={!live} />
        </div>
      </Panel>

      {!computed ? <ArchiveView m={m} /> : <>
        <div className="grid xl:grid-cols-2 gap-4">
          {[
            { k: 'vihali', t: 'Vihali', h: 'Kế hoạch dòng tiền & hạn mức thấu chi', d: live && prevClose ? `Đầu kỳ = HM thấu chi BIDV thực tế ngày ${dmy(prevClose.asOf)} · trả nợ đến hạn từ tab Vihali · lãi BIDV định kỳ ước tính` : 'Trả nợ đến hạn lấy từ tab Vihali · nguồn trả là HM thấu chi BIDV', o: op.vihali, rows: vh, min: vmin, lbl: 'HM còn lại', opening: 'HM thấu chi BIDV khả dụng đầu kỳ' },
            { k: 'personal', t: 'Cá nhân', h: 'Kế hoạch Individual Treasury', d: 'Sổ đến hạn lấy từ tab Cá nhân · chi định kỳ theo các tháng trước', o: op.personal, rows: cn_, min: cmin, lbl: 'Thanh khoản', opening: 'Thanh khoản đầu kỳ (tài khoản thanh toán)' },
          ].map(x => (
            <Panel key={x.k} pad={false} className="xl:h-[720px]" title={<span className="flex items-center gap-2"><span className="eyebrow text-primary">{x.t}</span>{x.h}</span>} sub={x.d}>
              <div className="flex flex-col h-full">
              <div className="grid grid-cols-4 border-b">
                {[['Đầu kỳ', ty(x.o), ''], ['Thu', ty(sum(x.rows, 'in')), 'text-pos'], ['Chi', ty(sum(x.rows, 'out')), 'text-neg'], ['Cuối kỳ', ty(end(x.rows, x.o)), 'font-semibold']].map(([l, v, c], i) => (
                  <div key={l} className={cn('px-4 py-3 min-w-0', i && 'border-l')}><div className="text-xs text-muted-foreground">{l}</div><div className={cn('num text-[15px] sm:text-[17px] font-medium mt-0.5', c)}>{v}</div></div>))}
              </div>
              <div className="px-4 py-2 text-xs text-muted-foreground border-b">{x.lbl} thấp nhất trong kỳ <span className="num text-foreground">{ty(x.min.v)}</span> ngày <span className="num">{dm(x.min.d)}</span></div>
              <FlowTable rows={x.rows} open={x.o} label={x.lbl} opening={x.opening} m={m} />
              </div>
            </Panel>))}
        </div>
        <Panel title="Diễn biến số dư trong kỳ" sub="Tỷ VND · cập nhật theo từng ngày có thu chi">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="2 3" />
                <XAxis dataKey="d" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => v.toFixed(3) + ' tỷ'} contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 4, fontSize: 12 }} itemStyle={{ color: 'hsl(var(--foreground))' }} />
                <RLegend wrapperStyle={{ fontSize: 12 }} />
                <Line type="stepAfter" dataKey="vh" name="HM thấu chi Vihali" stroke="hsl(var(--c1))" strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />
                <Line type="stepAfter" dataKey="cn" name="Thanh khoản cá nhân" stroke="hsl(var(--c3))" strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        {live && !editor && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Lock className="w-3 h-3" />Thu chi phát sinh và khoản định kỳ do người lập nhập ở chế độ người lập.</p>}
      </>}
      <PlanActuals month={month} vihaliPlan={actualsPlan.v} personalPlan={actualsPlan.p} planClosing={actualsPlan.close} />
    </div>
  );
}
