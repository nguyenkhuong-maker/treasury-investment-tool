/* Các mục của bản kế hoạch tháng theo mẫu đã trình CFO (T10/2026):
   Vihali: hạn mức đầu kỳ, tóm tắt, mốc cần theo dõi.
   Cá nhân: tiền gửi đầu kỳ, dư nợ vay đầu kỳ, thanh khoản đầu kỳ, xử lý khoản đáo hạn / tái đầu tư, tóm tắt cuối kỳ. */
import type { ReactNode } from 'react';
import type { PlanLine, PlanMonth, OpeningDetail } from '@/data/static';
import { nf, dmy, dm, daysTo } from '@/lib/fmt';
import { fmtStamp } from '@/data/store';
import { Panel, Chip, th, td, tn } from '@/components/kit';
import { cn } from '@/lib/utils';

type Row = PlanLine & { bal: number };
const sum = (rows: PlanLine[], f: (l: PlanLine) => boolean) => rows.filter(f).reduce((a, l) => a + l.amount, 0);
const neg = (n: number) => (n ? `(${nf(n)})` : '0');

function KV({ rows, foot }: { rows: [ReactNode, ReactNode, string?][]; foot?: [ReactNode, ReactNode] }) {
  return (
    <table className="w-full text-[13px] border-collapse">
      <tbody>
        {rows.map(([k, v, c], i) => <tr key={i}><td className={td}>{k}</td><td className={cn(tn, c)}>{v}</td></tr>)}
      </tbody>
      {foot && <tfoot><tr className="bg-muted/60 font-semibold"><td className={td}>{foot[0]}</td><td className={tn}>{foot[1]}</td></tr></tfoot>}
    </table>
  );
}

function Section({ n, title, sub, children }: { n: number; title: string; sub?: ReactNode; children: ReactNode }) {
  return (
    <div className="border-t first:border-t-0">
      <div className="px-4 pt-3 pb-2"><h3 className="text-[13px] font-semibold">{n}. {title}</h3>{sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}</div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

const when = (d: string, live: boolean) => {
  if (!live) return null;
  const n = daysTo(d);
  return n < 0 ? <Chip>Đã qua</Chip> : n === 0 ? <Chip tone="warn">Hôm nay</Chip> : n <= 7 ? <Chip tone="warn">{n} ngày</Chip> : <span className="text-xs text-muted-foreground num">{n} ngày</span>;
};

/* Phần đầu kỳ: đặt trên bảng dòng tiền */
export function OpeningPanels({ detail, opening }: { detail: OpeningDetail; opening: { vihali: number; personal: number } }) {
  const term = detail.deposits.filter(d => d.due);
  const liquid = detail.deposits.filter(d => !d.due);
  const tot = detail.deposits.reduce((a, d) => a + d.principal, 0), totSettle = detail.deposits.reduce((a, d) => a + d.settle, 0);
  const liq = liquid.reduce((a, d) => a + d.principal, 0);
  const hmTotal = detail.odLimit + detail.bidvVldLimit + detail.scLimit;
  return (
    <div className="grid gap-4 grid-cols-[minmax(0,1fr)]">
    <div className="grid xl:grid-cols-2 gap-4 items-start">
      <Panel pad={false} title={<span className="flex items-center gap-2"><span className="eyebrow text-primary">Vihali</span>Hạn mức tín dụng đầu kỳ</span>}
        sub={`Theo sheet Loan-BIDV / Loan-SC · ${fmtStamp(detail.companyAsOf)}`}>
        <KV rows={[
          [<>HM thấu chi BIDV khả dụng<div className="text-xs text-muted-foreground">CN Thống Nhất {nf(detail.odTn)} · CN Trường Sơn {nf(detail.odTs)}</div></>, nf(detail.odLimit), 'font-semibold'],
          ['HM vốn lưu động SC còn lại', nf(detail.scLimit)],
          ['HM vốn lưu động BIDV còn lại', nf(detail.bidvVldLimit)],
        ]} foot={['Tổng hạn mức còn lại', nf(hmTotal)]} />
        {opening.vihali !== detail.odLimit && <p className="px-4 py-2 text-xs text-warn border-t">Đầu kỳ của kế hoạch ({nf(opening.vihali)}) khác HM thấu chi BIDV trên sheet.</p>}
        <p className="px-4 py-2.5 text-xs text-muted-foreground border-t">Kế hoạch dòng tiền chạy trên HM thấu chi BIDV; HM vốn lưu động SC, BIDV để đối chiếu nguồn trả nợ.</p>
      </Panel>
      <Panel pad={false} title={<span className="flex items-center gap-2"><span className="eyebrow text-primary">Cá nhân</span>Thanh khoản & dư nợ vay đầu kỳ</span>}
        sub={`Theo sheet Dashboard-fix · ${fmtStamp(detail.personalAsOf)}`}>
        <Section n={1} title="Thanh khoản đầu kỳ" sub="Tài khoản thanh toán, không kỳ hạn">
          <table className="w-full text-[13px] border-collapse">
            <thead><tr><th className={th}>Chủ tài khoản</th><th className={th}>Ngân hàng</th><th className={th}>Số tài khoản</th><th className={th + ' text-right'}>Số tiền</th></tr></thead>
            <tbody>{liquid.map(d => <tr key={d.bank + d.code}><td className={td}>{d.owner}</td><td className={td}>{d.bank}</td><td className={td + ' num'}>{d.code}</td><td className={tn}>{nf(d.principal)}</td></tr>)}</tbody>
            <tfoot><tr className="bg-muted/60 font-semibold"><td className={td} colSpan={3}>Tổng</td><td className={tn}>{nf(liq)}</td></tr></tfoot>
          </table>
          {opening.personal !== liq && <p className="px-4 py-2 text-xs text-warn border-t">Đầu kỳ của kế hoạch ({nf(opening.personal)}) khác tổng thanh khoản trên sheet.</p>}
        </Section>
        <Section n={2} title="Dư nợ vay đầu kỳ">
          <KV rows={[['Dư nợ vay cá nhân active', nf(detail.personalLoans)]]} />
        </Section>
      </Panel>
    </div>
      <Panel pad={false} title={<span className="flex items-center gap-2"><span className="eyebrow text-primary">Cá nhân</span>Tiền gửi đầu kỳ</span>}
        sub={`Theo sheet Dashboard-fix · ${fmtStamp(detail.personalAsOf)}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse min-w-[640px]">
            <thead><tr><th className={th}>Chủ tài khoản</th><th className={th}>Ngân hàng · số sổ</th><th className={th + ' text-right'}>Số tiền</th><th className={th}>Đáo hạn</th><th className={th}>Trạng thái</th><th className={th + ' text-right'}>Dự thu về</th></tr></thead>
            <tbody>
              {term.map(d => (
                <tr key={d.bank + d.code} className="hover:bg-accent/40">
                  <td className={td}>{d.owner}</td><td className={td}><span className="text-muted-foreground">{d.bank}</span> · <span className="num">{d.code}</span></td>
                  <td className={tn}>{nf(d.principal)}</td><td className={td + ' num'}>{dmy(d.due)}</td>
                  <td className={td}>{d.pledged ? <Chip tone="primary">Thế chấp</Chip> : <span className="text-xs text-muted-foreground">Không thế chấp</span>}</td>
                  <td className={tn}>{nf(d.settle)}</td>
                </tr>))}
              <tr className="text-muted-foreground"><td className={td} colSpan={2}>Tài khoản không kỳ hạn ({liquid.length})</td><td className={tn}>{nf(liq)}</td><td className={td}>–</td><td className={td + ' text-xs'}>Không kỳ hạn</td><td className={tn}>{nf(liq)}</td></tr>
            </tbody>
            <tfoot><tr className="bg-muted/60 font-semibold"><td className={td} colSpan={2}>Tổng · {detail.deposits.length} sổ / tài khoản</td><td className={tn}>{nf(tot)}</td><td className={td} colSpan={2}>Thế chấp {nf(detail.deposits.filter(d => d.pledged).reduce((a, d) => a + d.principal, 0))}</td><td className={tn}>{nf(totSettle)}</td></tr></tfoot>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* Phần tóm tắt và mốc theo dõi: đặt dưới bảng dòng tiền */
export function SummaryPanels({ m, vh, cn: cnRows, opening, detail, live }: { m: PlanMonth; vh: Row[]; cn: Row[]; opening: { vihali: number; personal: number }; detail?: OpeningDetail; live: boolean }) {
  const vEnd = vh.length ? vh[vh.length - 1].bal : opening.vihali;
  const vMin = vh.reduce((a, r) => (r.bal < a.v ? { v: r.bal, d: r.date } : a), { v: opening.vihali, d: m.from });
  const vIn = sum(vh, l => l.dir === 'in');
  const vLoan = sum(vh, l => l.dir === 'out' && l.source === 'loan');
  const vInt = sum(vh, l => l.dir === 'out' && (l.source as string) === 'interest');
  const vOther = sum(vh, l => l.dir === 'out') - vLoan - vInt;

  const cEnd = cnRows.length ? cnRows[cnRows.length - 1].bal : opening.personal;
  const isMat = (l: PlanLine) => l.dir === 'in' && (l.source === 'deposit' || /đến hạn|đáo hạn|tất toán/i.test(l.label));
  const cDep = sum(cnRows, isMat);
  const cInOther = sum(cnRows, l => l.dir === 'in') - cDep;
  const cat = (l: PlanLine) => /usdt/i.test(l.label) ? 'usdt' : /cctg|tiết kiệm|chứng chỉ|gửi/i.test(l.label) ? 'save' : /opex|nhân viên|lương|chi phí/i.test(l.label) ? 'opex' : 'other';
  const outs = cnRows.filter(l => l.dir === 'out');
  const cOpex = sum(outs, l => cat(l) === 'opex'), cUsdt = sum(outs, l => cat(l) === 'usdt'), cSave = sum(outs, l => cat(l) === 'save'), cOther = sum(outs, l => cat(l) === 'other');

  // Khoản đáo hạn trong kỳ và phương án xử lý: các khoản chi cá nhân cùng ngày
  const mats = cnRows.filter(l => l.dir === 'in');
  const depTotal = detail ? detail.deposits.reduce((a, d) => a + d.principal, 0) : null;

  return (
    <div className="grid xl:grid-cols-2 gap-4 items-start">
      <Panel pad={false} title={<span className="flex items-center gap-2"><span className="eyebrow text-primary">Vihali</span>Tóm tắt & mốc cần theo dõi</span>} sub={`Kỳ ${dmy(m.from)} – ${dmy(m.to)}`}>
        <Section n={1} title="Tóm tắt">
          <KV rows={[
            ['HM thấu chi BIDV đầu kỳ', nf(opening.vihali)],
            ...(detail ? [['HM vốn lưu động SC còn lại đầu kỳ', nf(detail.scLimit)] as [ReactNode, ReactNode]] : []),
            ['Tổng thu trong kỳ', nf(vIn), 'text-pos'],
            ['Chi trả nợ khế ước đến hạn', neg(vLoan), 'text-neg'],
            ...(vInt ? [['Chi lãi vay BIDV định kỳ (ước tính)', neg(vInt), 'text-neg'] as [ReactNode, ReactNode, string]] : []),
            ['Chi khác đi bằng thấu chi', neg(vOther), 'text-neg'],
            ['Tổng chi trong kỳ', neg(vLoan + vInt + vOther), 'text-neg font-medium'],
            [<>HM thấp nhất trong kỳ <span className="text-xs text-muted-foreground">ngày {dm(vMin.d)}</span></>, nf(vMin.v)],
          ]} foot={[`HM thấu chi cuối kỳ ${dm(m.to)}`, nf(vEnd)]} />
        </Section>
        <Section n={2} title="Mốc cần theo dõi" sub="Các khoản trả nợ, chi trong kỳ theo ngày">
          <table className="w-full text-[13px] border-collapse">
            <thead><tr><th className={th}>Ngày</th><th className={th}>Khoản</th><th className={th + ' text-right'}>Giá trị</th><th className={th}>Ghi chú</th>{live && <th className={th}>Còn</th>}</tr></thead>
            <tbody>
              {vh.map(l => (
                <tr key={l.id} className={cn('hover:bg-accent/40 align-top', live && daysTo(l.date) < 0 && 'text-muted-foreground')}>
                  <td className={td + ' num'}>{dmy(l.date)}</td><td className={td}>{l.label}</td>
                  <td className={tn + (l.dir === 'in' ? ' text-pos' : '')}>{l.dir === 'in' ? '+' : ''}{nf(l.amount)}</td>
                  <td className={td + ' text-xs text-muted-foreground'}>{l.note || (l.source === 'loan' ? 'Thanh toán khế ước đến hạn' : '')}</td>
                  {live && <td className={td}>{when(l.date, live)}</td>}
                </tr>))}
              {!vh.length && <tr><td className={td + ' text-muted-foreground'} colSpan={5}>Không có khoản nào trong kỳ.</td></tr>}
            </tbody>
          </table>
        </Section>
      </Panel>

      <Panel pad={false} title={<span className="flex items-center gap-2"><span className="eyebrow text-primary">Cá nhân</span>Xử lý đáo hạn & tóm tắt cuối kỳ</span>} sub={`Kỳ ${dmy(m.from)} – ${dmy(m.to)}`}>
        <Section n={1} title="Kế hoạch xử lý khoản đáo hạn / tái đầu tư">
          <table className="w-full text-[13px] border-collapse">
            <thead><tr><th className={th}>Ngày</th><th className={th}>Khoản</th><th className={th}>Phương án xử lý</th><th className={th + ' text-right'}>Số tiền</th></tr></thead>
            <tbody>
              {mats.map(l => {
                const plan = outs.filter(o => o.date === l.date);
                return (
                  <tr key={l.id} className="align-top hover:bg-accent/40">
                    <td className={td + ' num'}>{dmy(l.date)}{live && <div className="mt-1">{when(l.date, live)}</div>}</td>
                    <td className={td}>{l.label}{l.note && <div className="text-xs text-muted-foreground">{l.note}</div>}</td>
                    <td className={td}>
                      {plan.length ? <ul className="grid gap-0.5 text-xs">{plan.map(o => <li key={o.id} className="flex gap-2 justify-between"><span>{o.label}{o.note ? <span className="text-muted-foreground"> · {o.note}</span> : null}</span><span className="num text-neg whitespace-nowrap">−{nf(o.amount)}</span></li>)}</ul>
                        : <span className="text-xs text-muted-foreground">Chưa có phương án cùng ngày · về tài khoản thanh toán</span>}
                    </td>
                    <td className={tn + ' text-pos'}>+{nf(l.amount)}</td>
                  </tr>);
              })}
              {!mats.length && <tr><td className={td + ' text-muted-foreground'} colSpan={4}>Không có khoản đáo hạn trong kỳ.</td></tr>}
            </tbody>
          </table>
        </Section>
        <Section n={2} title="Tóm tắt cuối kỳ">
          <KV rows={[
            ...(depTotal != null ? [['Tổng tiền gửi / giấy tờ có giá đầu kỳ', nf(depTotal)] as [ReactNode, ReactNode]] : []),
            ['Thanh khoản đầu kỳ (tài khoản thanh toán)', nf(opening.personal)],
            ['Thu từ sổ / CCTG đến hạn', nf(cDep), 'text-pos'],
            ...(cInOther ? [['Thu khác', nf(cInOther), 'text-pos'] as [ReactNode, ReactNode, string]] : []),
            ['Chi Opex + chi phí nhân viên', neg(cOpex), 'text-neg'],
            ['Mua USDT', neg(cUsdt), 'text-neg'],
            ['Gửi tiết kiệm / mua CCTG', neg(cSave), 'text-neg'],
            ...(cOther ? [['Chi khác', neg(cOther), 'text-neg'] as [ReactNode, ReactNode, string]] : []),
          ]} foot={[`Thanh khoản cuối kỳ ${dm(m.to)}`, nf(cEnd)]} />
        </Section>
      </Panel>
    </div>
  );
}
