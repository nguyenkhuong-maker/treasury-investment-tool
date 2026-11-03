/* Kế hoạch tháng:
   - Chưa duyệt: Vihali = hạn mức tín dụng đầu kỳ + kế hoạch dòng tiền; Cá nhân = thanh khoản đầu kỳ + tiền gửi đầu kỳ + kế hoạch Individual.
   - CFO đã duyệt: bản đầy đủ theo đúng mẫu kế hoạch đã duyệt T10/2026 (dựng thành các khối như bản lưu trữ). */
import type { PlanLine, PlanMonth, OpeningDetail, ArchiveBlock, ArchiveCell } from '@/data/static';
import { nf, dmy } from '@/lib/fmt';
import { fmtStamp } from '@/data/store';
import { Panel, Chip, th, td, tn } from '@/components/kit';

type Row = PlanLine & { bal: number };
const sum = (rows: PlanLine[], f: (l: PlanLine) => boolean) => rows.filter(f).reduce((a, l) => a + l.amount, 0);

/* ---------- Các bảng khi kế hoạch chưa duyệt ---------- */

export function VihaliOpening({ detail, opening }: { detail: OpeningDetail; opening: number }) {
  const rows: [string, number][] = [
    ['HM vốn lưu động SC còn lại', detail.scLimit],
    ['HM vốn lưu động BIDV còn lại', detail.bidvVldLimit],
  ];
  return (
    <Panel pad={false} title={<span className="flex items-center gap-2"><span className="eyebrow text-primary">Vihali</span>Hạn mức tín dụng đầu kỳ</span>}
      sub={`Theo sheet Loan-BIDV / Loan-SC · ${fmtStamp(detail.companyAsOf)}`}>
      <table className="w-full text-body border-collapse">
        <tbody>
          <tr><td className={td}>HM thấu chi BIDV khả dụng<div className="text-xs text-muted-foreground">CN Thống Nhất <span className="num">{nf(detail.odTn)}</span> · CN Trường Sơn <span className="num">{nf(detail.odTs)}</span></div></td><td className={tn + ' font-semibold'}>{nf(detail.odLimit)}</td></tr>
          {rows.map(([k, v]) => <tr key={k}><td className={td}>{k}</td><td className={tn}>{nf(v)}</td></tr>)}
        </tbody>
        <tfoot><tr className="bg-muted/60 font-semibold"><td className={td}>Tổng hạn mức còn lại</td><td className={tn}>{nf(detail.odLimit + detail.scLimit + detail.bidvVldLimit)}</td></tr></tfoot>
      </table>
      {opening !== detail.odLimit && <p className="px-4 py-2 text-xs text-warn border-t">Đầu kỳ của kế hoạch ({nf(opening)}) khác HM thấu chi BIDV trên sheet.</p>}
    </Panel>
  );
}

export function PersonalLiquidity({ detail, opening }: { detail: OpeningDetail; opening: number }) {
  const liquid = detail.deposits.filter(d => !d.due);
  const liq = liquid.reduce((a, d) => a + d.principal, 0);
  return (
    <Panel pad={false} title={<span className="flex items-center gap-2"><span className="eyebrow text-primary">Cá nhân</span>Thanh khoản đầu kỳ</span>}
      sub={`Tài khoản thanh toán, không kỳ hạn · Dashboard-fix ${fmtStamp(detail.personalAsOf)} · dư nợ vay cá nhân ${nf(detail.personalLoans)}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-body border-collapse">
          <thead><tr><th className={th}>Chủ tài khoản</th><th className={th}>Ngân hàng</th><th className={th}>Số tài khoản</th><th className={th + ' text-right'}>Số tiền</th></tr></thead>
          <tbody>{liquid.map(d => <tr key={d.bank + d.code}><td className={td}>{d.owner}</td><td className={td}>{d.bank}</td><td className={td + ' num'}>{d.code}</td><td className={tn}>{nf(d.principal)}</td></tr>)}</tbody>
          <tfoot><tr className="bg-muted/60 font-semibold"><td className={td} colSpan={3}>Tổng</td><td className={tn}>{nf(liq)}</td></tr></tfoot>
        </table>
      </div>
      {opening !== liq && <p className="px-4 py-2 text-xs text-warn border-t">Đầu kỳ của kế hoạch ({nf(opening)}) khác tổng thanh khoản trên sheet.</p>}
    </Panel>
  );
}

export function PersonalDeposits({ detail }: { detail: OpeningDetail }) {
  const term = detail.deposits.filter(d => d.due);
  const t = (f: (d: OpeningDetail['deposits'][number]) => number) => term.reduce((a, d) => a + f(d), 0);
  return (
    <Panel pad={false} title={<span className="flex items-center gap-2"><span className="eyebrow text-primary">Cá nhân</span>Tiền gửi đầu kỳ</span>}
      sub={`Sổ tiết kiệm / chứng chỉ tiền gửi có kỳ hạn · thế chấp ${nf(t(d => (d.pledged ? d.principal : 0)))}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-body border-collapse min-w-[520px]">
          <thead><tr><th className={th}>Chủ sổ · ngân hàng · số sổ</th><th className={th + ' text-right'}>Số tiền</th><th className={th}>Đáo hạn</th><th className={th + ' text-right'}>Dự thu về</th></tr></thead>
          <tbody>
            {term.map(d => (
              <tr key={d.bank + d.code} className="hover:bg-accent/40 align-top">
                <td className={td}><div>{d.owner}{d.pledged && <Chip tone="primary" className="ml-1.5">Thế chấp</Chip>}</div><div className="text-xs text-muted-foreground">{d.bank} · <span className="num">{d.code}</span></div></td>
                <td className={tn}>{nf(d.principal)}</td><td className={td + ' num'}>{dmy(d.due)}</td><td className={tn}>{nf(d.settle)}</td>
              </tr>))}
          </tbody>
          <tfoot><tr className="bg-muted/60 font-semibold"><td className={td}>Tổng · {term.length} sổ</td><td className={tn}>{nf(t(d => d.principal))}</td><td className={td} /><td className={tn}>{nf(t(d => d.settle))}</td></tr></tfoot>
        </table>
      </div>
    </Panel>
  );
}

/* ---------- Bản đầy đủ khi CFO đã duyệt (mẫu T10/2026) ---------- */

const C = (t: string, n = false, b = false): ArchiveCell => ({ t, n, b });
const V = (n: number) => `${nf(n)} VND`;
const NV = (n: number) => (n ? `(${nf(n)}) VND` : '0 VND');
const table = (head: string[], rows: ArchiveCell[][]): ArchiveBlock => ({ type: 'table', head, rows });
const h = (text: string): ArchiveBlock => ({ type: 'h', level: 2, text });

export function vihaliDoc({ m, rows, opening, detail }: { m: PlanMonth; rows: Row[]; opening: number; openNote?: string; detail?: OpeningDetail }): ArchiveBlock[] {
  const end = rows.length ? rows[rows.length - 1].bal : opening;
  const dates = [...new Set(rows.map(r => r.date))];
  const daily: ArchiveCell[][] = [[C(dmy(m.from)), C(nf(opening), true), C('0', true), C('0', true), C(nf(opening), true), C('Mở kỳ theo hạn mức thấu chi BIDV khả dụng đầu kỳ.')]];
  let bal = opening;
  dates.forEach(d => {
    const rs = rows.filter(r => r.date === d);
    const tin = sum(rs, r => r.dir === 'in'), tout = sum(rs, r => r.dir === 'out');
    const note = rs.map(r => r.source === 'loan' ? `${r.label.replace('Trả nợ ', '')}\nThanh toán khế ước đến hạn` : r.label).join('\n');
    daily.push([C(dmy(d)), C(nf(bal), true), C(nf(tin), true), C(nf(tout), true), C(nf(bal + tin - tout), true), C(note)]);
    bal += tin - tout;
  });
  if (!dates.length || dates[dates.length - 1] < m.to) daily.push([C(dmy(m.to)), C(nf(end), true), C('0', true), C('0', true), C(nf(end), true), C('Kết thúc kỳ.')]);
  const tin = sum(rows, r => r.dir === 'in');
  const loan = sum(rows, r => r.dir === 'out' && r.source === 'loan');
  const intr = sum(rows, r => r.dir === 'out' && (r.source as string) === 'interest');
  const other = sum(rows, r => r.dir === 'out') - loan - intr;
  const summary: ArchiveCell[][] = [
    [C('HM thấu chi BIDV đầu kỳ'), C(V(opening), true)],
    ...(detail ? [[C('HM vốn lưu động SC còn lại đầu kỳ'), C(V(detail.scLimit), true)]] : []),
    [C('Tổng thu trong kỳ'), C(V(tin), true)],
    [C('Chi đáo hạn khế ước trong kỳ'), C(NV(loan), true)],
    ...(intr ? [[C('Chi lãi vay BIDV định kỳ (ước tính)'), C(NV(intr), true)]] : []),
    ...(other ? [[C('Chi khác đi bằng thấu chi'), C(NV(other), true)]] : []),
    [C('Tổng chi trong kỳ'), C(NV(loan + intr + other), true)],
    [C('HM cuối kỳ', false, true), C(V(end), true, true)],
  ];
  const marks = rows.map(r => [C(dmy(r.date)), C(r.label.replace('Trả nợ ', '')), C(V(r.amount), true), C(r.source === 'loan' ? 'Thanh toán khế ước đến hạn' : r.note || r.label)]);
  return [
    h('1. Kế hoạch dòng tiền theo ngày'),
    table(['Ngày', 'HM thấu chi đầu ngày', 'Thu', 'Chi', 'HM cuối ngày', 'Ghi chú'], daily),
    h('2. Tóm tắt'), table(['Chỉ tiêu', 'Giá trị'], summary),
    h('3. Mốc cần theo dõi'), table(['Ngày', 'Khoản', 'Giá trị', 'Ghi chú'], marks),
    { type: 'p', text: `Nguồn: Google Sheets / Loan-BIDV / Loan-SC${detail ? ` (đầu kỳ chốt ${fmtStamp(detail.companyAsOf)})` : ''}; khoản đến hạn lấy từ tab Vihali.` },
  ];
}

export function personalDoc({ m, rows, opening, openNote, detail }: { m: PlanMonth; rows: Row[]; opening: number; openNote?: string; detail?: OpeningDetail }): ArchiveBlock[] {
  const blocks: ArchiveBlock[] = [];
  const end = rows.length ? rows[rows.length - 1].bal : opening;
  let n = 1;
  if (detail) {
    const all = detail.deposits;
    blocks.push(h(`${n++}. Tiền gửi đầu kỳ`), table(['Chủ tài khoản', 'Ngân hàng', 'Số tiền (VND)', 'Ngày đáo hạn', 'Trạng thái', 'Giá trị dự thu về (VND)'], [
      ...all.map(d => [C(d.owner), C(`${d.bank} - ${d.code}`), C(nf(d.principal), true), C(d.due ? dmy(d.due) : '-'), C(!d.due ? 'Không kỳ hạn' : d.pledged ? 'Thế chấp' : 'Không thế chấp'), C(nf(d.settle), true)]),
      [C('Tổng'), C(''), C(nf(all.reduce((a, d) => a + d.principal, 0)), true), C(''), C(''), C(nf(all.reduce((a, d) => a + d.settle, 0)), true)],
    ]));
    blocks.push(h(`${n++}. Dư nợ vay đầu kỳ`), table(['Trạng thái', 'Giá trị'], [[C('Dư nợ vay cá nhân active'), C(nf(detail.personalLoans), true)]]));
    const liquid = all.filter(d => !d.due);
    blocks.push(h(`${n++}. Thanh khoản đầu kỳ`), table(['Chủ tài khoản', 'Ngân hàng', 'Số tài khoản', 'Số tiền (VND)'], [
      ...liquid.map(d => [C(d.owner), C(d.bank), C(d.code), C(nf(d.principal), true)]),
      [C('Tổng'), C(''), C(''), C(nf(liquid.reduce((a, d) => a + d.principal, 0)), true)],
    ]));
  }
  blocks.push(h(`${n++}. Dòng tiền tài khoản thanh toán`), table(['Ngày', 'Nội dung giao dịch', 'Thu vào (VND)', 'Chi ra (VND)', 'Số dư (VND)'], [
    [C(dmy(m.from)), C(openNote || 'Thanh khoản đầu kỳ'), C(''), C(''), C(nf(opening), true)],
    ...rows.map(r => [C(dmy(r.date)), C(r.note ? `${r.label} (${r.note})` : r.label), C(r.dir === 'in' ? nf(r.amount) : '', true), C(r.dir === 'out' ? nf(r.amount) : '', true), C(nf(r.bal), true)]),
    [C(dmy(m.to)), C('Số dư cuối kỳ'), C(''), C(''), C(nf(end), true)],
  ]));
  const mats = rows.filter(r => r.dir === 'in');
  const outs = rows.filter(r => r.dir === 'out');
  blocks.push(h(`${n++}. Kế hoạch xử lý khoản đáo hạn / tái đầu tư`), table(['Ngày', 'Khoản', 'Phương án xử lý', 'Số tiền (VND)'],
    mats.map(r => {
      const p = outs.filter(o => o.date === r.date);
      return [C(dmy(r.date)), C(r.label), C(p.length ? `Nhận ${nf(r.amount)}: ` + p.map(o => `${o.label} ${nf(o.amount)}${o.note ? ` (${o.note})` : ''}`).join('; ') + '.' : 'Về tài khoản thanh toán.'), C(nf(r.amount), true)];
    })));
  const cat = (l: PlanLine) => /usdt/i.test(l.label) ? 'usdt' : /cctg|tiết kiệm|chứng chỉ|gửi/i.test(l.label) ? 'save' : /opex|nhân viên|lương|chi phí/i.test(l.label) ? 'opex' : 'other';
  const isMat = (l: PlanLine) => l.dir === 'in' && (l.source === 'deposit' || /đến hạn|đáo hạn|tất toán/i.test(l.label));
  const so = (k: string) => sum(outs, l => cat(l) === k);
  const inOther = sum(rows, l => l.dir === 'in' && !isMat(l));
  blocks.push(h(`${n++}. Tóm tắt cuối kỳ`), table(['Chỉ tiêu', 'Giá trị'], [
    ...(detail ? [[C('Tổng tiền gửi/giấy tờ có giá đầu kỳ'), C(nf(detail.deposits.reduce((a, d) => a + d.principal, 0)), true)]] : []),
    [C('Thanh khoản đầu kỳ (tài khoản thanh toán)'), C(nf(opening), true)],
    [C('Thu từ sổ / CCTG đến hạn'), C(nf(sum(rows, isMat)), true)],
    ...(inOther ? [[C('Thu khác'), C(nf(inOther), true)]] : []),
    [C('Chi Opex + chi phí nhân viên'), C(nf(so('opex')), true)],
    [C('Mua USDT'), C(nf(so('usdt')), true)],
    [C('Gửi tiết kiệm / mua CCTG'), C(nf(so('save')), true)],
    ...(so('other') ? [[C('Chi khác'), C(nf(so('other')), true)]] : []),
    [C(`Thanh khoản cuối kỳ ${dmy(m.to)}`, false, true), C(nf(end), true, true)],
  ]));
  return blocks;
}
