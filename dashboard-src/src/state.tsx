import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { APPROVALS, PLAN_INPUTS, CONTRACT_LINKS, PLAN_MONTHS } from '@/data/static';
import type { PlanInputs, PlanApproval, Entity, PlanMonth } from '@/data/static';
import { postToAppsScript, EDITOR_CODE, fmtStamp, defaultInputs, addMonths, monthKey, monthPeriod } from '@/data/store';
import { planLines, currentOpeningDetail } from '@/lib/calc';

type Approvals = typeof APPROVALS;
interface Ctx {
  editor: boolean; setEditor: (b: boolean) => void;
  cryptoOpen: boolean; setCryptoOpen: (b: boolean) => void;
  links: Record<string, string>; saveLink: (code: string, url: string) => Promise<string | null>;
  inputs: Record<string, PlanInputs>; editInputs: (month: string, f: (p: PlanInputs) => PlanInputs) => void;
  dirty: Record<string, boolean>; saveInputs: (month: string, opts?: { keepVersion?: boolean }) => Promise<string | null>; discardInputs: (month: string) => void;
  approvals: Approvals; setApproval: (month: string, ent: Entity, a: PlanApproval) => void;
  liveMonth: string;
  months: PlanMonth[]; nextMonthKey: string; createMonth: () => string;
  refreshOpening: (month: string) => void;
  go: (v: string) => void;
}
const C = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(C);

export function AppProvider({ children, go }: { children: ReactNode; go: (v: string) => void }) {
  const [editor, setEditor] = useState(false);
  const [cryptoOpen, setCryptoOpenState] = useState<boolean>(() => { try { return sessionStorage.getItem('tm-crypto') === '1'; } catch { return false; } });
  const setCryptoOpen = (b: boolean) => { setCryptoOpenState(b); try { b ? sessionStorage.setItem('tm-crypto', '1') : sessionStorage.removeItem('tm-crypto'); } catch { /* ignore */ } };
  const [links, setLinks] = useState<Record<string, string>>(() => ({ ...CONTRACT_LINKS }));
  const [inputs, setInputs] = useState<Record<string, PlanInputs>>(() => structuredClone(PLAN_INPUTS));
  const [saved, setSaved] = useState<Record<string, PlanInputs>>(() => structuredClone(PLAN_INPUTS));
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [approvals, setApprovals] = useState<Approvals>(() => structuredClone(APPROVALS));
  const [months, setMonths] = useState<PlanMonth[]>(() => [...PLAN_MONTHS]);
  // Tháng mặc định: tháng đang mở chưa được CFO duyệt đủ (cũ nhất trước), không có thì tháng mở mới nhất
  const liveMonth = [...months].reverse().find(m => m.live && !(approvals[m.key]?.vihali.status === 'approved' && approvals[m.key]?.personal.status === 'approved'))?.key
    || months.find(m => m.live)?.key || '';
  const latestInput = Object.keys(inputs).sort().pop();
  const nextMonthKey = latestInput ? addMonths(latestInput, 1) : addMonths(monthKey(new Date()), 1);
  /* Người lập bấm lập kế hoạch tháng kế tiếp: tạo bản nháp Draft 1, bấm Lưu kế hoạch mới ghi lên GitHub */
  const createMonth = () => {
    const key = nextMonthKey;
    if (inputs[key]) return key;
    const p: PlanInputs = { ...defaultInputs(key, latestInput ? inputs[latestInput] : undefined), updatedAt: new Date().toISOString() };
    setInputs(x => ({ ...x, [key]: p }));
    setSaved(x => ({ ...x, [key]: structuredClone(p) }));
    setDirty(d => ({ ...d, [key]: true }));
    const per = monthPeriod(key);
    setMonths(ms => [{ key, label: per.label, from: per.from, to: per.to, live: true, mode: 'live' as const }, ...ms.filter(m => m.key !== key)].sort((a, b) => b.key.localeCompare(a.key)));
    const ev = { at: fmtStamp(p.updatedAt!), kind: 'draft' as const, text: `Lập ${p.version}` };
    setApprovals(x => ({ ...x, [key]: { vihali: { version: p.version, status: 'draft', events: [ev] }, personal: { version: p.version, status: 'draft', events: [ev] } } }));
    return key;
  };

  const saveLink = async (code: string, url: string) => {
    const r = await postToAppsScript({ action: 'saveContractLink', editorCode: EDITOR_CODE, code, url });
    if (!r.ok) return r.error || 'Không lưu được link';
    setLinks(l => { const n = { ...l }; if (url) n[code] = url; else delete n[code]; return n; });
    return null;
  };
  const editInputs = (month: string, f: (p: PlanInputs) => PlanInputs) => {
    setInputs(x => ({ ...x, [month]: f(structuredClone(x[month])) }));
    setDirty(d => ({ ...d, [month]: true }));
  };
  const saveInputs = async (month: string, opts: { keepVersion?: boolean } = {}) => {
    const a = approvals[month];
    let data = inputs[month];
    // Sửa sau khi CFO trả về hoặc đã duyệt thì nâng version để trình lại
    if (!opts.keepVersion && a && (a.vihali.status !== 'draft' || a.personal.status !== 'draft')) {
      const n = (Number(String(data.version).match(/\d+/)?.[0]) || 1) + 1;
      data = { ...data, version: `Draft ${n}` };
    }
    // Lưu kèm ảnh chụp các dòng kế hoạch để xem lại đúng như lúc trình, kể cả sau khi khoản vay đã tất toán
    const lines = planLines(month, data);
    const { snapshot: _old, ...rest } = data;
    void _old;
    data = { ...rest, snapshot: { savedAt: new Date().toISOString(), opening: { vihali: rest.opening.vihali, personal: rest.opening.personal }, lines } };
    const r = await postToAppsScript({ action: 'savePlanInputs', editorCode: EDITOR_CODE, month, inputs: data });
    if (!r.ok) return r.error || 'Không lưu được kế hoạch';
    setInputs(x => ({ ...x, [month]: data }));
    setSaved(x => ({ ...x, [month]: structuredClone(data) }));
    setDirty(d => ({ ...d, [month]: false }));
    if (data.version !== inputs[month].version) {
      const now = fmtStamp(new Date().toISOString());
      setApprovals(x => ({ ...x, [month]: {
        vihali: { version: data.version, status: 'draft', events: [...x[month].vihali.events, { at: now, kind: 'draft', text: `Lập ${data.version}` }] },
        personal: { version: data.version, status: 'draft', events: [...x[month].personal.events, { at: now, kind: 'draft', text: `Lập ${data.version}` }] },
      } }));
    }
    return null;
  };
  /* Người lập cập nhật số đầu kỳ theo dữ liệu hiện tại: HM thấu chi BIDV, HM VLĐ, tiền gửi và thanh khoản cá nhân */
  const refreshOpening = (month: string) => {
    const d = currentOpeningDetail();
    const liq = d.deposits.filter(x => !x.due).reduce((a, x) => a + x.principal, 0);
    const at = (s: string) => fmtStamp(s).slice(0, 10);
    editInputs(month, x => ({ ...x, openingDetail: d, opening: { ...x.opening, vihali: d.odLimit, personal: liq,
      vihaliNote: `HM thấu chi BIDV khả dụng theo sheet Loan-BIDV ngày ${at(d.companyAsOf)}`,
      personalNote: `Tổng tài khoản không kỳ hạn theo sheet Dashboard-fix ngày ${at(d.personalAsOf)}` } }));
  };
  const discardInputs = (month: string) => { setInputs(x => ({ ...x, [month]: structuredClone(saved[month]) })); setDirty(d => ({ ...d, [month]: false })); };

  return (
    <C.Provider value={{
      editor, setEditor, cryptoOpen, setCryptoOpen, links, saveLink,
      inputs, editInputs, dirty, saveInputs, discardInputs,
      approvals, setApproval: (m, e, a) => setApprovals(x => ({ ...x, [m]: { ...x[m], [e]: a } })),
      liveMonth, months, nextMonthKey, createMonth, refreshOpening, go,
    }}>{children}</C.Provider>
  );
}
