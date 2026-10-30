// Dựng số liệu THỰC CHI theo tháng dương lịch để đối chiếu với kế hoạch ngân quỹ (tab Kế hoạch).
// Nguồn (đã tải ở bước fetch, thư mục tmp/treasury-online/latest):
//   pr-vihali-2026.csv   — Payment & Fund Request · PR (Vihali)-2026: chỉ nguồn "BIDV TC" (thấu chi) mới tính vào kế hoạch;
//                          SC VLD / BIDV VLD / BIDV VTC ghi lại để tham khảo.
//   fr-1102-2026.csv     — FR (1102 Group)-2026: các khoản chi từ tài khoản VPB5678 (chị Thảo) → kế hoạch Cá nhân.
//   pr-beyond-atoms.csv  — PR(Beyond Atoms): khoản "Điều tiền nội bộ theo KHNQ" → Opex Beyond Atoms.
//   usdt-npv.csv         — Treasury Individuals_VND · NPV comparison: nhật ký mua USDT.
// HM thấu chi BIDV khả dụng cuối tháng lấy từ data/company-loans-current.json (chỉ ghi khi ngày dữ liệu còn trong tháng đó).
// Tên cá nhân được ẩn; chỉ giữ tên công ty / cơ quan. Không làm hỏng pipeline: lỗi thì giữ file cũ, thoát 0.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = process.env.TM_SRC || path.join(ROOT, 'tmp', 'treasury-online', 'latest');
const REPO = process.env.TM_REPO || path.join(ROOT, 'treasury-master-dashboard');
const OUT = path.join(REPO, 'data', 'plan-actuals.json');
const FIRST_MONTH = '2026-10';

function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
const clean = (v) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
function num(v) {
  const s = clean(v).replace(/[$,\s]/g, '');
  if (!s || /^-+$/.test(s)) return 0;
  const n = Number(s.replace(/[()]/g, ''));
  return Number.isFinite(n) ? (/^\(.*\)$/.test(s) ? -n : n) : 0;
}
const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n) => String(n).padStart(2, '0');
function dmyText(v) { // 7-Oct-2026
  const m = clean(v).match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  return m && MON[m[2].toLowerCase()] ? `${m[3]}-${pad(MON[m[2].toLowerCase()])}-${pad(m[1])}` : null;
}
function mdySlash(v) { // 10/24/2026 (sheet NPV comparison để định dạng tháng/ngày/năm)
  const m = clean(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${pad(m[1])}-${pad(m[2])}` : null;
}
function dmySlash(v) { // 31/10/2026 trong bản kế hoạch
  const m = clean(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? `${m[3]}-${pad(m[2])}-${pad(m[1])}` : null;
}
const readCsv = (f, optional) => {
  const p = path.join(SRC, f);
  if (!fs.existsSync(p)) { if (optional) return null; throw new Error(`thiếu ${f}`); }
  return parseCsv(fs.readFileSync(p, 'utf8'));
};
const readJson = (p, d = null) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return d; } };

/* ---- Ẩn tên cá nhân: chỉ giữ tên tổ chức ---- */
const ORG = /(CÔNG TY|CONG TY|CTY|CHI NHÁNH|NGÂN HÀNG|BẢO HIỂM|BẢO HIỂM XÃ HỘI|CHI CỤC|THUẾ|KHO BẠC|TNHH|CỔ PHẦN|JSC|LIMITED|LTD|CO\.|CORP|INC|BANK|FOUNDATION|HOLDING)/i;
const KNOWN = { SC: 'Standard Chartered', BIDV: 'BIDV', BHXH: 'BHXH', CCT1: 'Chi cục thuế', VIHALI: 'Vihali', BA: 'Beyond Atoms', DOPA: 'DOPA' };
function payee(short, full) {
  const s = clean(short).toUpperCase();
  if (KNOWN[s]) return KNOWN[s];
  if (ORG.test(clean(full)) || ORG.test(clean(short))) return clean(short) || clean(full);
  return null; // cá nhân → ẩn
}
const SALARY = /^(net paid salary|pit|social insurance|healthcare|tax allowance|overtime)/i;

function headerIndex(rows, first) {
  const h = rows.findIndex((r) => clean(r[0]).toLowerCase().startsWith(first));
  if (h < 0) throw new Error('không thấy dòng tiêu đề');
  const H = rows[h].map((c) => clean(c).toLowerCase());
  const col = (name, fb) => { const i = H.findIndex((c) => c.startsWith(name)); return i >= 0 ? i : fb; };
  return { h, col };
}

/* ---- PR (Vihali)-2026 ---- */
function prVihali(rows) {
  const { h, col } = headerIndex(rows, 'month');
  const C = { req: col('request date', 2), full: col('beneficiary name', 5), grp: col('headcode decription', 7), amt: col('total amount', 10), cur: col('original currency', 11), desc: col('description', 14), st: col('status', 18), src: col('resources', 19), pay: col('payment date', 20) };
  const out = [];
  for (const r of rows.slice(h + 1)) {
    if (clean(r[C.st]).toLowerCase() !== 'paid') continue;
    const date = dmyText(r[C.pay]) || dmyText(r[C.req]);
    if (!date || clean(r[C.cur]).toUpperCase() !== 'VND') continue;
    const amount = num(r[C.amt]); if (!amount) continue;
    const desc = clean(r[C.desc]); const D = desc.toUpperCase();
    const source = clean(r[C.src]) || 'Khác';
    let cat = 'opex'; let key = null; let label = clean(r[C.grp]) || 'Chi phí khác';
    const due = D.match(/ĐẾN HẠN\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
    if (/GỐC\s*LÃI/.test(D) && due) {
      const bank = /\bSC\b|STANDARD/.test(D) ? 'SC' : 'BIDV';
      cat = 'loan'; key = `${bank}|${dmySlash(due[1])}`; label = `Trả gốc lãi ${bank} VLĐ đến hạn ${due[1]}`;
    } else if (/LÃI VAY.*ĐỊNH KỲ/.test(D)) { cat = 'interest'; label = 'Lãi vay BIDV định kỳ'; }
    else if (SALARY.test(clean(r[C.grp])) && /LƯƠNG/.test(D)) { cat = 'salary'; label = 'Lương, BH, thuế TNCN'; }
    const who = cat === 'salary' ? 'Vihali' : (payee(r[C.req + 1], r[C.full]) || 'Cá nhân (ẩn tên)');
    out.push({ date, source, cat, key, label, payee: who, amount });
  }
  return out;
}

/* ---- FR (1102 Group)-2026: chi từ VPB5678 ---- */
function fr1102(rows) {
  const { h, col } = headerIndex(rows, 'month');
  const C = { req: 1, ent: 2, ben: 4, amt: 5, curReq: 6, usd: 9, curPay: 10, prov: 11, grp: col('headcode decription', 18), code: col('headcode', 17), st: col('status', 21), pay: col('payment date', 22) };
  const vnd = []; const other = {};
  for (const r of rows.slice(h + 1)) {
    if (!clean(r[C.st]).toLowerCase().startsWith('paid')) continue;
    const date = dmyText(r[C.pay]); if (!date) continue;
    const prov = clean(r[C.prov]);
    if (/VPB/i.test(prov)) {
      const amount = clean(r[C.curReq]).toUpperCase() === 'VND' ? num(r[C.amt]) : num(r[C.usd]);
      if (!amount) continue;
      const staff = /^SAL001/i.test(clean(r[C.code]));
      vnd.push({ date, cat: staff ? 'staff-dopa' : 'opex-dopa', label: staff ? 'Lương nhân viên DOPA' : (clean(r[C.grp]) || 'Chi phí khác'),
        entity: clean(r[C.ent]), payee: staff ? 'DOPA' : (payee(r[C.ben], r[C.ben]) || 'Ẩn tên'), amount });
    } else {
      const m = date.slice(0, 7); const k = clean(r[C.curPay]) || 'Khác';
      other[m] = other[m] || {}; other[m][k] = (other[m][k] || 0) + num(r[C.usd]);
    }
  }
  return { vnd, other };
}

/* ---- PR(Beyond Atoms): điều tiền nội bộ theo KHNQ ---- */
function prBA(rows) {
  const { h, col } = headerIndex(rows, 'month');
  const C = { req: col('request date', 2), amt: col('total amount', 10), desc: col('description', 14), st: col('status', 18) };
  return rows.slice(h + 1).filter((r) => /KHNQ/i.test(clean(r[C.desc])) && clean(r[C.st]).toLowerCase() === 'paid')
    .map((r) => ({ date: dmyText(r[C.req]), cat: 'opex-ba', label: 'Điều tiền Beyond Atoms theo KHNQ', entity: 'Beyond Atoms', payee: 'Beyond Atoms', amount: num(r[C.amt]) }))
    .filter((x) => x.date && x.amount);
}

/* ---- NPV comparison: mua USDT ---- */
function usdt(rows) {
  const h = rows.findIndex((r) => r.some((c) => /VND Sold/i.test(clean(c))));
  if (h < 0) return [];
  const H = rows[h].map(clean);
  const iD = H.indexOf('Date'), iV = H.findIndex((c) => /VND Sold/i.test(c)), iU = H.findIndex((c) => /USDT Received/i.test(c));
  return rows.slice(h + 1).map((r) => ({ date: mdySlash(r[iD]), vnd: num(r[iV]), usdt: num(r[iU]) }))
    .filter((x) => x.date && x.vnd > 0)
    .map((x) => ({ date: x.date, cat: 'usdt', label: 'Mua USDT', entity: 'Cá nhân', payee: 'Mua USDT', amount: x.vnd, usdt: x.usdt }));
}

/* ---- Kế hoạch các tháng đã trình (bản archive) → dòng kế hoạch có cấu trúc ---- */
function archivePlan(month) {
  const dir = path.join(REPO, 'data', 'monthly-plans', 'archive');
  const comp = readJson(path.join(dir, `${month}-company.json`));
  const pers = readJson(path.join(dir, `${month}-personal.json`));
  if (!comp && !pers) return null;
  const vihali = []; const personal = []; let opening = null;
  for (const b of comp?.blocks || []) {
    if (b.type !== 'table' || !/ngày/i.test(b.head[0] || '') || !b.head.some((x) => /^chi$/i.test(x))) continue;
    const iC = b.head.findIndex((x) => /^chi$/i.test(x)), iN = b.head.length - 1, iO = b.head.findIndex((x) => /đầu ngày/i.test(x));
    b.rows.forEach((r) => {
      const d = dmySlash(r[0].t); if (!d) return;
      if (opening == null && iO >= 0) opening = num(r[iO].t);
      const amt = num(r[iC].t);
      if (d.startsWith(month) && amt > 0) vihali.push({ date: d, label: r[iN].t.split('\n')[0].trim(), amount: amt });
    });
    break;
  }
  let flow = false;
  for (const b of pers?.blocks || []) {
    if (b.type === 'h') { flow = /dòng tiền/i.test(b.text); continue; }
    if (!flow || b.type !== 'table') continue;
    const iC = b.head.findIndex((x) => /chi ra/i.test(x)), iL = b.head.findIndex((x) => /nội dung/i.test(x));
    if (iC < 0) continue;
    b.rows.forEach((r) => {
      const d = dmySlash(r[0].t); const amt = num(r[iC]?.t);
      if (d && d.startsWith(month) && amt > 0) personal.push({ date: d, label: r[iL].t.split(':')[0].trim(), amount: amt });
    });
  }
  return { source: 'archive', openingVihali: opening, vihali, personal };
}

function main() {
  const prev = readJson(OUT, { months: {} });
  const pr = prVihali(readCsv('pr-vihali-2026.csv'));
  const fr = fr1102(readCsv('fr-1102-2026.csv'));
  const ba = prBA(readCsv('pr-beyond-atoms.csv'));
  const us = usdt(readCsv('usdt-npv.csv', true) || []);

  const loans = readJson(path.join(REPO, 'data', 'company-loans-current.json'));
  const snapDate = (loans?.meta?.liveSource?.generatedAt || loans?.meta?.updatedAt || '').slice(0, 10);
  const odAvail = (loans?.bidvOverdraftGroups || []).reduce((a, g) => a + (g.totalAvailableLimit || 0), 0);

  const today = new Date(); const cur = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
  const months = {};
  for (let m = FIRST_MONTH; m <= cur; m = (() => { const [y, mm] = m.split('-').map(Number); return mm === 12 ? `${y + 1}-01` : `${y}-${pad(mm + 1)}`; })()) {
    const inM = (x) => x.date.startsWith(m);
    const vRows = pr.filter(inM).sort((a, b) => a.date.localeCompare(b.date));
    const pRows = [...fr.vnd, ...ba, ...us].filter(inM).sort((a, b) => a.date.localeCompare(b.date));
    const old = prev.months?.[m] || {};
    const closing = snapDate.startsWith(m) && odAvail ? { odAvailable: odAvail, asOf: snapDate } : old.closing || null;
    months[m] = {
      vihali: vRows, personal: pRows,
      closing, plan: archivePlan(m) || undefined,
    };
  }
  const out = { generatedAt: new Date().toISOString(), note: 'Thực chi theo tháng dương lịch, tên cá nhân đã ẩn', months };
  fs.writeFileSync(OUT, `${JSON.stringify(out, null, 1)}\n`);
  console.log(`plan-actuals.json: ${Object.entries(months).map(([k, v]) => `${k} VH ${v.vihali.length} / CN ${v.personal.length}`).join(' · ')}`);
}

try { main(); } catch (e) {
  console.warn(`[plan-actuals] bỏ qua, giữ file cũ: ${e instanceof Error ? e.message : e}`);
  process.exit(0);
}
