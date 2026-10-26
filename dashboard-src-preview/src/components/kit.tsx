import type { ReactNode } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';

export function Panel({ title, sub, right, children, className, pad = true }: {
  title?: ReactNode; sub?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; pad?: boolean;
}) {
  return (
    <section className={cn('bg-card border rounded-md min-w-0 flex flex-col', className)}>
      {(title || right) && (
        <header className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b">
          <div className="min-w-0">
            <h2 className="text-[14px] font-semibold leading-tight">{title}</h2>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          {right && <div className="flex items-center gap-2 flex-wrap">{right}</div>}
        </header>
      )}
      <div className={cn('min-w-0 flex-1', pad && 'p-4')}>{children}</div>
    </section>
  );
}

export function Kpi({ label, value, sub, tone, onClick }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'pos' | 'neg' | 'gold'; onClick?: () => void }) {
  const El = onClick ? 'button' : 'div';
  return (
    <El onClick={onClick} className={cn('text-left bg-card border rounded-md px-4 py-3 min-w-0', onClick && 'hover:border-primary/50 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring')}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('num text-[21px] font-medium mt-1 leading-tight', tone === 'pos' && 'text-pos', tone === 'neg' && 'text-neg', tone === 'gold' && 'text-gold')}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </El>
  );
}

export function Chip({ children, tone = 'default', className }: { children: ReactNode; tone?: 'default' | 'primary' | 'pos' | 'neg' | 'warn' | 'gold'; className?: string }) {
  const t = {
    default: 'border-border text-muted-foreground',
    primary: 'bg-accent text-accent-foreground border-transparent',
    pos: 'text-pos border-current',
    neg: 'text-neg border-current',
    warn: 'text-warn border-current',
    gold: 'text-gold border-current',
  }[tone];
  return <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-sm border px-1.5 py-[1px] text-[11px] font-medium', t, className)}>{children}</span>;
}

export function Donut({ data, center, sub, size = 168 }: { data: { k: string; v: number; c: string }[]; center: string; sub?: string; size?: number }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="v" nameKey="k" innerRadius="66%" outerRadius="98%" stroke="hsl(var(--card))" strokeWidth={2} startAngle={90} endAngle={-270} isAnimationActive={false}>
            {data.map(d => <Cell key={d.k} fill={d.c} />)}
          </Pie>
          <Tooltip formatter={(v: number) => v.toLocaleString('en-US')} contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 4, fontSize: 12 }} itemStyle={{ color: 'hsl(var(--foreground))' }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 grid place-items-center pointer-events-none text-center">
        <div>
          {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
          <div className="num text-[15px] font-medium">{center}</div>
        </div>
      </div>
    </div>
  );
}

export function Legend({ rows }: { rows: { k: string; c: string; v: string; p: string; hint?: string }[] }) {
  return (
    <div className="grid gap-2 flex-1 min-w-[200px]">
      {rows.map(r => (
        <div key={r.k} className="grid grid-cols-[10px_1fr_auto_52px] gap-2 items-center text-[13px]">
          <i className="w-2.5 h-2.5 rounded-[2px]" style={{ background: r.c }} />
          <span className="truncate">{r.k}{r.hint && <span className="text-muted-foreground"> · {r.hint}</span>}</span>
          <span className="num text-right">{r.v}</span>
          <span className="num text-right text-muted-foreground">{r.p}</span>
        </div>
      ))}
    </div>
  );
}

export function Delta({ v, unit = 'bps' }: { v: number | null; unit?: string }) {
  if (v == null) return <span className="text-muted-foreground">–</span>;
  if (Math.abs(v) < 0.001) return <span className="text-muted-foreground num">0</span>;
  const bps = Math.round(v * 100);
  return <span className={cn('num whitespace-nowrap', bps > 0 ? 'text-pos' : 'text-neg')}>{bps > 0 ? '▲ +' : '▼ '}{bps}{unit === 'bps' ? ' bps' : ''}</span>;
}

export const th = 'text-[11px] uppercase tracking-wide text-muted-foreground font-semibold text-left px-3 py-2 border-b whitespace-nowrap bg-muted/50';
export const td = 'px-3 py-2.5 border-b align-middle';
export const tn = 'px-3 py-2.5 border-b align-middle num text-right whitespace-nowrap';
