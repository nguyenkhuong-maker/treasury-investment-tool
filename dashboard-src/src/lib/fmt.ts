export const TODAY = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
export const FX = 26360;

export const nf = (n: number | null | undefined) =>
  n == null || isNaN(n) ? '–' : Math.round(n).toLocaleString('en-US');
export const ty = (n: number, dp = 2) =>
  (n / 1e9).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp }) + ' tỷ';
export const tr = (n: number) => (n / 1e6).toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' tr';
export const usd = (n: number) =>
  !n ? '–' : n >= 1e6 ? '$' + (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? '$' + (n / 1e3).toFixed(1) + 'K' : '$' + nf(n);
export const pct = (n: number | null | undefined, dp = 2) => (n == null ? '–' : n.toFixed(dp) + '%');

export const iso = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const dmy = (s?: string | null) => (s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '–');
export const dm = (s: string) => s.slice(8, 10) + '/' + s.slice(5, 7);
export const daysTo = (s: string) => Math.round((iso(s).getTime() - TODAY.getTime()) / 864e5);
export const addDays = (s: string, n: number) => {
  const d = iso(s); d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const short = (a: string) => (a.length > 12 ? a.slice(0, 6) + '…' + a.slice(-4) : a);

export function store<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
export function save(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ }
}
