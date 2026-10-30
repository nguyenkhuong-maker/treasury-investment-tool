import { useEffect, useState } from 'react';
import { Lock, LockOpen, ShieldCheck } from 'lucide-react';
import { AppProvider, useApp } from '@/state';
import Overview from '@/pages/Overview';
import Vihali from '@/pages/Vihali';
import Personal from '@/pages/Personal';
import Crypto from '@/pages/Crypto';
import Rates from '@/pages/Rates';
import Plan from '@/pages/Plan';
import { cn } from '@/lib/utils';
import { META, BALANCE } from '@/data/static';
import { PREVIEW } from '@/data/store';

const stamp = (iso: string) => { if (!iso) return '–'; const d = new Date(iso); if (isNaN(d.getTime())) return iso; const p = (n: number) => String(n).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`; };

const VIEWS = [
  { k: 'tong-quan', l: 'Tổng quan', t: 'Tổng quan ngân quỹ', src: () => `Sheet Balance · Dashboard Treasury Balance${BALANCE ? ' · ngày ' + BALANCE.asOf.split('-').reverse().join('/') : ''}`, C: Overview },
  { k: 'vihali', l: 'Cty Vihali', t: 'Dư nợ BIDV & Standard Chartered', src: () => `Loan-BIDV / Loan-SC · cập nhật ${stamp(META.companyUpdatedAt)}`, C: Vihali },
  { k: 'ca-nhan', l: 'Cá nhân', t: 'Sổ tiết kiệm & tiền gửi cá nhân', src: () => `Dashboard-fix · cập nhật ${stamp(META.personalUpdatedAt)}`, C: Personal },
  { k: 'crypto', l: 'Tokens', t: 'Tài sản token', src: () => `Sheet Crypto Assets · giá ngày ${META.cryptoPriceDate || '–'}`, C: Crypto },
  { k: 'lai-suat', l: 'Đầu tư', t: 'Đầu tư · lãi suất tiền gửi & sản phẩm', src: () => `history.json · cập nhật ${stamp(META.ratesUpdatedAt)}`, C: Rates },
  { k: 'ke-hoach', l: 'Kế hoạch', t: 'Kế hoạch ngân quỹ tháng', src: () => 'Tự sinh từ dữ liệu các tab + khoản định kỳ các tháng trước', C: Plan },
];

function EditorGate() {
  const { editor, setEditor } = useApp();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState(false);
  if (editor) return (
    <button onClick={() => setEditor(false)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-sm text-body font-medium bg-[hsl(var(--gold))] text-[hsl(var(--bar))]">
      <LockOpen className="w-3.5 h-3.5" />Người lập · Thoát
    </button>);
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-sm text-body border border-white/20 text-[hsl(var(--bar-fg))] hover:bg-white/10">
        <Lock className="w-3.5 h-3.5" />Người lập
      </button>
      {open && (
        <form onSubmit={e => { e.preventDefault(); if (pin === '1993') { setEditor(true); setOpen(false); setPin(''); setErr(false); } else setErr(true); }}
          className="absolute right-0 top-10 z-50 w-64 bg-popover text-popover-foreground border rounded-md shadow-lg p-3 grid gap-2">
          <label htmlFor="pin" className="text-xs text-muted-foreground">Mã người lập</label>
          <input id="pin" type="password" inputMode="numeric" value={pin} onChange={e => setPin(e.target.value)} autoFocus className="h-8 rounded-sm border bg-background px-2 num" />
          {err && <span className="text-xs text-neg">Mã chưa đúng, nhập lại.</span>}
          <button className="h-8 rounded-sm bg-primary text-primary-foreground text-body font-medium">Mở chế độ người lập</button>
        </form>)}
    </div>
  );
}

function Shell({ view, go }: { view: string; go: (v: string) => void }) {
  const V = VIEWS.find(v => v.k === view) || VIEWS[0];
  const { editor } = useApp();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-40 bg-[hsl(var(--bar))] text-[hsl(var(--bar-fg))]">
        <div className="gutter max-w-[1320px] mx-auto flex items-center gap-4 h-14">
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="grid place-items-center w-8 h-8 rounded-sm bg-[hsl(var(--gold))] text-[hsl(var(--bar))] font-bold text-body">VH</span>
            <div className="leading-tight hidden sm:block"><div className="font-semibold text-title">Vihali Treasury</div><div className="text-caption text-[hsl(var(--bar-muted))]">Nội bộ · Ban điều hành</div></div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-[hsl(var(--bar-muted))]"><ShieldCheck className="w-3.5 h-3.5" />Dữ liệu {stamp(META.companyUpdatedAt)}</span>
            <EditorGate />
          </div>
        </div>
        <nav className="gutter max-w-[1320px] mx-auto flex gap-1 overflow-x-auto" aria-label="Phân hệ">
          {VIEWS.map(v => (
            <a key={v.k} href={'#' + v.k} onClick={e => { e.preventDefault(); go(v.k); }}
              className={cn('px-3 py-2.5 text-body font-medium whitespace-nowrap border-b-2 transition-colors',
                view === v.k ? 'border-[hsl(var(--gold))] text-white' : 'border-transparent text-[hsl(var(--bar-muted))] hover:text-white')}>{v.l}</a>))}
        </nav>
      </header>
      {PREVIEW && <div className="bg-[hsl(var(--warn))]/15 border-b border-[hsl(var(--warn))]/40"><div className="gutter max-w-[1320px] mx-auto py-1.5 text-xs font-medium flex flex-wrap gap-x-3 gap-y-1 justify-between"><span className="text-warn">BẢN MẪU chờ duyệt · số liệu thật, chế độ người lập không lưu thay đổi</span><a href="../" className="text-primary hover:underline">Mở dashboard chính</a></div></div>}
      {editor && <div className="bg-[hsl(var(--gold))]/15 border-b border-[hsl(var(--gold))]/40"><div className="gutter max-w-[1320px] mx-auto py-1.5 text-xs text-gold font-medium">Đang ở chế độ người lập · có thể nhập thu chi phát sinh, khoản định kỳ và gắn link hợp đồng</div></div>}
      <main className="gutter max-w-[1320px] w-full mx-auto py-5 flex-1">
        <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
          <div><div className="eyebrow">{V.l}</div><h1 className="text-h1 font-semibold mt-0.5">{V.t}</h1></div>
          <span className="text-xs text-muted-foreground">{V.src()}</span>
        </div>
        <V.C />
      </main>
      <footer className="gutter max-w-[1320px] w-full mx-auto py-4 text-caption text-muted-foreground border-t">Tài liệu nội bộ · chỉ lưu hành trong Ban điều hành · phiên bản dữ liệu {META.siteVersion}</footer>
    </div>
  );
}

export default function App() {
  const valid = (h: string) => (VIEWS.some(v => v.k === h) ? h : 'tong-quan');
  const [view, setView] = useState(() => valid(location.hash.slice(1)));
  useEffect(() => { const f = () => setView(valid(location.hash.slice(1))); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  const go = (v: string) => { setView(v); try { history.replaceState(null, '', '#' + v); } catch { /* ignore */ } window.scrollTo(0, 0); };
  return <AppProvider go={go}><Shell view={view} go={go} /></AppProvider>;
}
