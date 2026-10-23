import { ArrowRight } from 'lucide-react';
import { RATE_WEEKS, PERSONAL_DEPOSITS, COMPANY_DEPOSITS } from '@/data/static';
import { CRYPTO_TOTAL, CRYPTO_TOKENS, STATUS_LABEL, PLAN_MONTHS } from '@/data/static';
import { GROUP_SUMMARY, LOAN_TOTAL, HM_TOTAL, PERSONAL_TOTAL, PLEDGED_TOTAL, collateralFlows, buildPlan, runBalance } from '@/lib/calc';
import { nf, ty, usd, pct, dm, dmy, daysTo, FX } from '@/lib/fmt';
import { Panel, Kpi, Chip, Delta, th, td, tn } from '@/components/kit';
import { useApp } from '@/state';

function CollateralMap() {
  const { src, links } = collateralFlows();
  const S = Object.entries(src).filter(([, v]) => v.amount > 0);
  // Thứ tự bên phải: BIDV TN thấu chi, BIDV VLĐ, BIDV TS thấu chi, SC VLĐ để các dải nối không chồng lên nhau
  const ORDER = ['bidv-od-tn', 'bidv-vld', 'bidv-od-ts', 'sc-vld'];
  const G = [...GROUP_SUMMARY].sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));
  const W = 760, nodeW = 10, gap = 18, top = 10, minH = 30;
  const scale = 240 / Math.max(S.reduce((a, [, v]) => a + v.amount, 0), LOAN_TOTAL);
  let y = top; const sy: Record<string, { y: number; h: number; off: number }> = {};
  S.forEach(([k, v]) => { const h = Math.max(v.amount * scale, minH); sy[k] = { y, h, off: 0 }; y += h + gap; });
  const yL = y; y = top; const gy: Record<string, { y: number; h: number; off: number }> = {};
  G.forEach(g => { const h = Math.max(g.out * scale, minH); gy[g.key] = { y, h, off: 0 }; y += h + gap; });
  const H = Math.max(yL, y) - gap + top;
  const xL = 190, xR = W - 230;
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
            <text x={xL - 10} y={sy[k].y + sy[k].h / 2 + 12} textAnchor="end" fontSize="11" fill="hsl(var(--muted-foreground))" fontFamily="var(--font-num)">{ty(v.amount)}</text>
          </g>))}
        {G.map(g => {
          const cov = Object.entries(links).filter(([k]) => k.endsWith('|' + g.key) && !k.startsWith('none')).reduce((a, [, v]) => a + v, 0);
          return (
            <g key={g.key}>
              <rect x={xR} y={gy[g.key].y} width={nodeW} height={gy[g.key].h} fill={g.color} rx={1.5} />
              <text x={xR + 18} y={gy[g.key].y + gy[g.key].h / 2 - 3} fontSize="12.5" fontWeight={600} fill="hsl(var(--foreground))">{g.short}</text>
              <text x={xR + 18} y={gy[g.key].y + gy[g.key].h / 2 + 12} fontSize="11" fill="hsl(var(--muted-foreground))" fontFamily="var(--font-num)">Dư nợ {ty(g.out)} · TSĐB/dư nợ {(cov / g.out * 100).toFixed(0)}%</text>
            </g>);
        })}
      </svg>
    </div>
  );
}

export default function Overview() {
  const { go, approvals, inputs, liveMonth, cryptoOpen } = useApp();
  const pm = PLAN_MONTHS.find(x => x.key === liveMonth);
  const pin = inputs[liveMonth];
  const lastApproved = PLAN_MONTHS.filter(x => x.key < liveMonth).map(x => ({ x, a: approvals[x.key]?.vihali })).find(o => o.a?.status === 'approved');
  const W = RATE_WEEKS[RATE_WEEKS.length - 1], P = RATE_WEEKS[RATE_WEEKS.length - 2] || W;
  const top12 = [...W.medium].filter((i: any) => i.r['12m'] != null).sort((a: any, b: any) => b.r['12m'] - a.r['12m']).slice(0, 4);
  const plan = pin ? buildPlan(liveMonth, pin.recurring, pin.adhoc, pin.carry) : [];
  const vh = runBalance(plan, 'vihali', pin?.opening.vihali || 0), cn = runBalance(plan, 'personal', pin?.opening.personal || 0);
  const upcoming = plan.filter(l => daysTo(l.date) >= 0 && daysTo(l.date) <= 45);
  const unpledged = PERSONAL_TOTAL - PLEDGED_TOTAL;
  const st = (e: 'vihali' | 'personal') => approvals[liveMonth]?.[e] || { version: '–', status: 'draft' as const, events: [] };

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Vihali · dư nợ vay" value={ty(LOAN_TOTAL)} sub={`HM còn lại ${ty(HM_TOTAL)}`} onClick={() => go('vihali')} />
        <Kpi label="Cá nhân · tiền gửi" value={ty(PERSONAL_TOTAL)} sub={`Cầm cố cho Vihali ${ty(PLEDGED_TOTAL)}`} onClick={() => go('ca-nhan')} />
        {cryptoOpen ? <Kpi label="Crypto · Sipher & liên quan" value={usd(CRYPTO_TOTAL)} sub={`≈ ${ty(CRYPTO_TOTAL * FX)} · stable ${usd(CRYPTO_TOKENS.find(t => t.k === 'USDC/USDT')?.v || 0)}`} onClick={() => go('crypto')} />
          : <Kpi label="Crypto · Sipher & liên quan" value="••••••" sub="Cần mã xem · bấm để mở" onClick={() => go('crypto')} />}
        <Kpi label={`Kế hoạch ${pm?.label.replace("Tháng ", "T") || ""} · HM thấu chi cuối kỳ`} value={ty(vh[vh.length - 1]?.bal ?? pin?.opening.vihali ?? 0)} sub={`Cá nhân cuối kỳ ${ty(cn[cn.length - 1]?.bal ?? pin?.opening.personal ?? 0)}`} onClick={() => go('ke-hoach')} />
      </div>

      <div className="grid xl:grid-cols-12 gap-4">
        <Panel className="xl:col-span-8" title="Cấu trúc bảo đảm khoản vay Vihali" sub="Sổ tiết kiệm (bên trái) đang cầm cố cho nhóm khoản vay nào (bên phải) · độ dày theo số tiền"
          right={<button onClick={() => go('vihali')} className="text-xs text-primary inline-flex items-center gap-1 hover:underline">Chi tiết khế ước<ArrowRight className="w-3 h-3" /></button>}>
          <CollateralMap />
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground mt-3 pt-3 border-t">
            <span>Tiền gửi cá nhân không cầm cố <b className="num font-medium text-foreground">{ty(unpledged)}</b></span>
            <span>Tổng TSĐB / dư nợ <b className="num font-medium text-foreground">{((PLEDGED_TOTAL + COMPANY_DEPOSITS.reduce((a, d) => a + d.principal, 0)) / LOAN_TOTAL * 100).toFixed(0)}%</b></span>
            <span>{PERSONAL_DEPOSITS.filter(d => d.pledged).length} sổ cá nhân + 2 sổ công ty</span>
          </div>
        </Panel>

        <div className="xl:col-span-4 grid gap-4 content-start">
          <Panel title={`Kế hoạch ${pm?.label.toLowerCase().replace("tháng", "tháng") || ""}`} sub={pm ? `Kỳ ${dmy(pm.from)} – ${dmy(pm.to)}` : ""} right={<button onClick={() => go('ke-hoach')} className="text-xs text-primary inline-flex items-center gap-1 hover:underline">Mở<ArrowRight className="w-3 h-3" /></button>}>
            <div className="grid gap-2.5">
              {(['vihali', 'personal'] as const).map(e => (
                <div key={e} className="flex items-center justify-between gap-2 text-[13px]">
                  <span>{e === 'vihali' ? 'Vihali' : 'Cá nhân'} <span className="text-muted-foreground">· {st(e).version}</span></span>
                  <Chip tone={st(e).status === 'approved' ? 'pos' : st(e).status === 'pending_cfo_review' ? 'gold' : 'default'}>{STATUS_LABEL[st(e).status]}</Chip>
                </div>))}
              {lastApproved && <div className="text-xs text-muted-foreground border-t pt-2.5">{lastApproved.x.label} đã được CFO duyệt{(() => { const e = [...lastApproved.a!.events].reverse().find(v => v.kind === "approve"); return e ? ` ngày ${e.at.slice(0, 10)}` : ""; })()}.</div>}
            </div>
          </Panel>
          <Panel title="Lãi suất 12 tháng cao nhất" sub={`${W.label} · so với tuần trước`} right={<button onClick={() => go('lai-suat')} className="text-xs text-primary inline-flex items-center gap-1 hover:underline">Mở<ArrowRight className="w-3 h-3" /></button>}>
            <div className="grid gap-2">
              {top12.map((i: any) => { const p = (P.medium as readonly any[]).find(x => x.name === i.name)?.r['12m']; return (
                <div key={i.name} className="grid grid-cols-[1fr_auto_76px] gap-2 text-[13px] items-center">
                  <span>{i.name}</span><span className="num font-medium">{pct(i.r['12m'])}</span><span className="text-right text-xs">{p != null ? <Delta v={i.r['12m'] - p} /> : '–'}</span>
                </div>); })}
            </div>
          </Panel>
        </div>
      </div>

      <Panel pad={false} title="Lịch thu chi 45 ngày tới" sub="Gộp khoản vay đến hạn, sổ đến hạn và kế hoạch tháng"
        right={<div className="flex gap-1.5"><Chip tone="primary">Đến hạn</Chip><Chip>Kế hoạch</Chip><Chip tone="gold">Phát sinh</Chip></div>}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead><tr><th className={th}>Ngày</th><th className={th + ' text-right'}>Còn</th><th className={th}>Pháp nhân</th><th className={th}>Nội dung</th><th className={th + ' text-right'}>Thu</th><th className={th + ' text-right'}>Chi</th></tr></thead>
            <tbody>{upcoming.map(l => (
              <tr key={l.id} className="hover:bg-accent/40">
                <td className={td + ' num'}>{dm(l.date)}</td><td className={tn + ' text-muted-foreground'}>{daysTo(l.date)} ngày</td>
                <td className={td}>{l.entity === 'vihali' ? 'Vihali' : 'Cá nhân'}</td>
                <td className={td}><span className="mr-2">{l.label}</span><Chip tone={l.source === 'loan' || l.source === 'deposit' ? 'primary' : l.source === 'adhoc' ? 'gold' : 'default'}>{l.source === 'loan' || l.source === 'deposit' ? 'Đến hạn' : l.source === 'adhoc' ? 'Phát sinh' : 'Kế hoạch'}</Chip></td>
                <td className={tn + ' text-pos'}>{l.dir === 'in' ? nf(l.amount) : ''}</td><td className={tn + ' text-neg'}>{l.dir === 'out' ? nf(l.amount) : ''}</td>
              </tr>))}</tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
