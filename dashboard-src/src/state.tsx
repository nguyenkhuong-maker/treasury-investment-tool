import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { APPROVALS, PLAN_INPUTS, CONTRACT_LINKS, PLAN_MONTHS } from '@/data/static';
import type { PlanInputs, PlanApproval, Entity } from '@/data/static';
import { postToAppsScript, EDITOR_CODE, fmtStamp } from '@/data/store';

type Approvals = typeof APPROVALS;
interface Ctx {
  editor: boolean; setEditor: (b: boolean) => void;
  cryptoOpen: boolean; setCryptoOpen: (b: boolean) => void;
  links: Record<string, string>; saveLink: (code: string, url: string) => Promise<string | null>;
  inputs: Record<string, PlanInputs>; editInputs: (month: string, f: (p: PlanInputs) => PlanInputs) => void;
  dirty: Record<string, boolean>; saveInputs: (month: string) => Promise<string | null>; discardInputs: (month: string) => void;
  approvals: Approvals; setApproval: (month: string, ent: Entity, a: PlanApproval) => void;
  liveMonth: string;
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
  const liveMonth = PLAN_MONTHS.find(m => m.live)?.key || '';

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
  const saveInputs = async (month: string) => {
    const a = approvals[month];
    let data = inputs[month];
    // Sửa sau khi CFO trả về hoặc đã duyệt thì nâng version để trình lại
    if (a && (a.vihali.status !== 'draft' || a.personal.status !== 'draft')) {
      const n = (Number(String(data.version).match(/\d+/)?.[0]) || 1) + 1;
      data = { ...data, version: `Draft ${n}` };
    }
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
  const discardInputs = (month: string) => { setInputs(x => ({ ...x, [month]: structuredClone(saved[month]) })); setDirty(d => ({ ...d, [month]: false })); };

  return (
    <C.Provider value={{
      editor, setEditor, cryptoOpen, setCryptoOpen, links, saveLink,
      inputs, editInputs, dirty, saveInputs, discardInputs,
      approvals, setApproval: (m, e, a) => setApprovals(x => ({ ...x, [m]: { ...x[m], [e]: a } })),
      liveMonth, go,
    }}>{children}</C.Provider>
  );
}
