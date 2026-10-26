import { useState, Fragment } from 'react';
import { ChevronDown, ChevronRight, Lock } from 'lucide-react';
import { useApp } from '@/state';
import { WALLETS, CRYPTO_TOTAL, CRYPTO_TOKENS, CRYPTO_PRICES, CRYPTO_HISTORY } from '@/data/static';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
const tok = (k: string) => CRYPTO_TOKENS.find(t => t.k === k) || { k, v: 0, qty: 0, c: '' };
import { nf, ty, usd, FX } from '@/lib/fmt';
import { Panel, Kpi, Donut, Legend, Chip, th, td, tn } from '@/components/kit';


function CryptoGate() {
  const { setCryptoOpen } = useApp();
  const [code, setCode] = useState('');
  const [err, setErr] = useState(false);
  return (
    <div className="grid place-items-center py-16">
      <form onSubmit={e => { e.preventDefault(); if (code === '1993') setCryptoOpen(true); else { setErr(true); setCode(''); } }}
        className="w-full max-w-sm bg-card border rounded-md p-6 grid gap-3">
        <span className="grid place-items-center w-10 h-10 rounded-sm bg-accent text-accent-foreground"><Lock className="w-5 h-5" /></span>
        <div><h2 className="text-[16px] font-semibold">Nhập mã để xem tài sản token</h2>
          <p className="text-xs text-muted-foreground mt-1">Số dư ví chỉ hiển thị cho người có mã xem. Mã giữ hiệu lực đến khi đóng trình duyệt.</p></div>
        <label htmlFor="cryptoCode" className="text-xs text-muted-foreground">Mã xem</label>
        <input id="cryptoCode" type="password" inputMode="numeric" autoComplete="off" value={code} onChange={e => { setCode(e.target.value); setErr(false); }} autoFocus className="h-9 rounded-sm border bg-background px-3 num tracking-widest" />
        {err && <span className="text-xs text-neg">Mã chưa đúng, nhập lại.</span>}
        <button className="h-9 rounded-sm bg-primary text-primary-foreground text-[13px] font-medium">Mở tab Tokens</button>
      </form>
    </div>
  );
}

export default function Crypto() {
  const { cryptoOpen, setCryptoOpen } = useApp();
  if (!cryptoOpen) return <CryptoGate />;
  return <CryptoBody onLock={() => setCryptoOpen(false)} />;
}

function CryptoBody({ onLock }: { onLock: () => void }) {
  if (!WALLETS.length) return <p className="text-muted-foreground">Chưa có dữ liệu token (data/crypto-current.json).</p>;
  return <CryptoInner onLock={onLock} />;
}

function CryptoInner({ onLock }: { onLock: () => void }) {
  const [cur, setCur] = useState<'USD' | 'VND'>('USD');
  const [by, setBy] = useState<'ent' | 'chain'>('ent');
  const [hide, setHide] = useState(true);
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const cv = (n: number) => (cur === 'USD' ? usd(n) : n ? ty(n * FX) : '–');
  const cell = (n: number) => (!n ? '–' : cur === 'USD' ? nf(n) : (n * FX / 1e9).toFixed(2));
  const st = WALLETS.reduce((a, w) => a + w.st, 0);
  const agg = Object.entries(WALLETS.reduce<Record<string, number>>((m, w) => { const k = by === 'ent' ? w.ent : w.chain; m[k] = (m[k] || 0) + w.tot; return m; }, {}))
    .filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]);
  const seg = (opts: [string, string][], v: string, set: (x: any) => void) => (
    <div className="inline-flex border rounded-sm overflow-hidden text-xs">
      {opts.map(([k, l]) => <button key={k} onClick={() => set(k)} className={'px-2.5 py-1 ' + (v === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>{l}</button>)}
    </div>);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border rounded-md px-4 py-2.5">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          {Object.entries(CRYPTO_PRICES).map(([k, v]) => <span key={k}>{k} <b className="num font-medium text-foreground">{v.toLocaleString('en-US')}</b></span>)}
          <span>USD/VND <b className="num font-medium text-foreground">{nf(FX)}</b></span>
        </div>
        <div className="flex items-center gap-2">{seg([['USD', 'USD'], ['VND', 'VND']], cur, setCur)}<button onClick={onLock} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-sm border text-xs text-muted-foreground hover:text-foreground"><Lock className="w-3 h-3" />Khóa</button></div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Tổng tài sản token" value={cv(CRYPTO_TOTAL)} sub={cur === 'USD' ? '≈ ' + ty(CRYPTO_TOTAL * FX) : nf(CRYPTO_TOTAL) + ' USD'} />
        <Kpi label="Stablecoin (USDC/USDT)" value={cv(st)} sub={(st / CRYPTO_TOTAL * 100).toFixed(1) + '% tổng'} />
        <Kpi label="BTC" value={cv(tok("BTC").v)} sub={`${tok("BTC").qty.toLocaleString("en-US", { maximumFractionDigits: 2 })} BTC`} />
        <Kpi label="ETH (gồm stETH, wstETH)" value={cv(tok("ETH").v)} sub={`${tok("ETH").qty.toLocaleString("en-US", { maximumFractionDigits: 2 })} ETH`} />
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        <Panel className="lg:col-span-6" title="Cơ cấu theo token">
          <div className="flex flex-wrap items-center gap-5">
            <Donut data={CRYPTO_TOKENS} center={cv(CRYPTO_TOTAL)} sub="Tổng" />
            <Legend rows={CRYPTO_TOKENS.map(t => ({ k: t.k, c: t.c, v: cv(t.v), p: (t.v / CRYPTO_TOTAL * 100).toFixed(1) + '%' }))} />
          </div>
        </Panel>
        <Panel className="lg:col-span-6" title={by === 'ent' ? 'Theo pháp nhân' : 'Theo mạng'} right={seg([['ent', 'Pháp nhân'], ['chain', 'Mạng']], by, setBy)}>
          <div className="grid gap-3">
            {agg.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[90px_1fr_84px] gap-3 items-center text-[13px]">
                <span className="truncate">{k}</span>
                <div className="h-2.5 bg-muted rounded-sm overflow-hidden"><span className="block h-full bg-primary" style={{ width: `${Math.max(v / agg[0][1] * 100, 0.8)}%` }} /></div>
                <span className="num text-right">{cv(v)}</span>
              </div>))}
          </div>
        </Panel>
      </div>

      {CRYPTO_HISTORY.length > 1 && (
        <Panel title="Diễn biến tổng tài sản token" sub={`${CRYPTO_HISTORY.length} ngày gần nhất · cập nhật hằng ngày lúc 13:00`}>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={CRYPTO_HISTORY.slice(-90).map(d => ({ d: d.date.slice(8, 10) + '/' + d.date.slice(5, 7), v: cur === 'USD' ? d.total / 1e6 : d.total * FX / 1e9 }))} margin={{ top: 8, right: 12, left: -6, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="2 3" />
                <XAxis dataKey="d" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip formatter={(v: number) => (cur === 'USD' ? '$' + v.toFixed(2) + 'M' : v.toFixed(2) + ' tỷ')} contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 4, fontSize: 12 }} itemStyle={{ color: 'hsl(var(--foreground))' }} />
                <Line type="monotone" dataKey="v" name="Tổng" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>)}

      <Panel pad={false} title="Danh sách ví" sub="Địa chỉ ví chỉ hiện phần đầu và cuối" right={
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer"><input id="hideZero" type="checkbox" checked={hide} onChange={e => setHide(e.target.checked)} className="accent-[hsl(var(--primary))]" />Ẩn ví số dư 0</label>}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead><tr><th className={th}>Ví</th><th className={th}>Pháp nhân</th><th className={th}>Mạng</th><th className={th}>Loại ví</th><th className={th}>Địa chỉ</th>
              <th className={th + ' text-right'}>Stable</th><th className={th + ' text-right'}>BTC</th><th className={th + ' text-right'}>ETH</th><th className={th + ' text-right'}>Khác</th><th className={th + ' text-right'}>Tổng ({cur === 'USD' ? 'USD' : 'tỷ VND'})</th></tr></thead>
            <tbody>
              {[...new Set(WALLETS.map(w => w.grp))].map(g => {
                const rows = WALLETS.filter(w => w.grp === g), gt = rows.reduce((a, w) => a + w.tot, 0);
                if (hide && !gt) return null;
                return (
                  <Fragment key={g}>
                    <tr className="bg-muted/40 cursor-pointer hover:bg-muted" onClick={() => setClosed(c => ({ ...c, [g]: !c[g] }))}>
                      <td className={td + ' font-semibold'} colSpan={9}><span className="inline-flex items-center gap-1.5">{closed[g] ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}{g}<span className="font-normal text-muted-foreground">· {rows.length} ví</span></span></td>
                      <td className={tn + ' font-semibold'}>{cell(gt)}</td>
                    </tr>
                    {!closed[g] && rows.filter(w => !hide || w.tot).map(w => (
                      <tr key={g + w.name} className="hover:bg-accent/40">
                        <td className={td + ' pl-9'}>{w.name}</td><td className={td}>{w.ent}</td><td className={td + ' text-muted-foreground'}>{w.chain}</td>
                        <td className={td}><Chip>{w.type}</Chip></td><td className={td + ' num text-muted-foreground'}>{w.addr}</td>
                        <td className={tn}>{cell(w.st)}</td><td className={tn}>{cell(w.btc)}</td><td className={tn}>{cell(w.eth)}</td><td className={tn}>{cell(w.oth)}</td><td className={tn + ' font-medium'}>{cell(w.tot)}</td>
                      </tr>))}
                  </Fragment>);
              })}
              <tr className="font-semibold bg-muted/60"><td className={td} colSpan={5}>Tổng cộng</td>
                {(['st', 'btc', 'eth', 'oth', 'tot'] as const).map(k => <td key={k} className={tn}>{cell(WALLETS.reduce((a, w) => a + w[k], 0))}</td>)}</tr>
            </tbody>
          </table>
        </div>
      </Panel>

    </div>
  );
}
