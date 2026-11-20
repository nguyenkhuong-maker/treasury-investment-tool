// Đọc file "Dashboard Treasury Balance" (các sheet Balance, Crypto, Individuals, Vihali, Vixion,
// Beyond Atoms) đã tải ở bước fetch và xuất treasury-master-dashboard/data/balance-current.json
// cho tab Tổng quan. Không làm hỏng pipeline: thiếu CSV hoặc số liệu không khớp thì giữ file cũ, thoát 0.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'tmp', 'treasury-online', 'latest');
const OUT = path.join(ROOT, 'treasury-master-dashboard', 'data', 'balance-current.json');
const FX = 26300;
const FILES = {
  balance: 'balance-balance.csv', crypto: 'balance-crypto.csv', individuals: 'balance-individuals.csv',
  vihali: 'balance-vihali.csv', vixion: 'balance-vixion.csv', ba: 'balance-beyond-atoms.csv',
};
const BANK = { BID: 'BIDV', VTB: 'VietinBank', BVB: 'BVBank', VPB: 'VPBank', MBB: 'MB', VDR: 'VDSC' };

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
  const neg = /^\(.*\)$/.test(s);
  const n = Number(s.replace(/[()]/g, ''));
  return Number.isFinite(n) ? (neg ? -n : n) : 0;
}
const read = (k) => {
  const p = path.join(SRC, FILES[k]);
  if (!fs.existsSync(p)) throw new Error(`thiếu ${FILES[k]}`);
  return parseCsv(fs.readFileSync(p, 'utf8'));
};
const rowOf = (rows, label) => rows.find((r) => clean(r[0]).toLowerCase() === label.toLowerCase());
const bankName = (b) => BANK[b] || b;

function entity(rows, name) {
  const h = rows.findIndex((r) => clean(r[0]) === 'Bank/CTCK');
  const banks = []; let net = 0;
  for (const r of rows.slice(h + 1)) {
    const k = clean(r[0]);
    if (!k) continue;
    if (k === 'Total') { net = num(r[6]); break; }
    const b = { bank: bankName(k), depVnd: num(r[1]), loanVnd: Math.abs(num(r[2])), depUsd: num(r[5]), net: num(r[6]) };
    if (b.loanVnd || Math.round(b.depVnd / FX + b.depUsd) !== 0) banks.push(b);
  }
  return { name, banks, net };
}

function main() {
  const bal = read('balance');
  const asOfRaw = clean(rowOf(bal, 'Up to date')?.[1]);
  const d = new Date(`${asOfRaw} 12:00`);
  const asOf = isNaN(d.getTime()) ? asOfRaw : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const pool = (l) => num(rowOf(bal, l)?.[1]);
  const total = pool('Total'), cryptoPool = pool('Crypto Assets'), osBank = pool('OS Bank & Virtual Accs');

  // Runway: dòng "Run-way (months)" và 3 dòng dưới; cột C ghi mức chi ("350k/month burn rate" / "Actual avg...")
  const ri = bal.findIndex((r) => /^run-?way/i.test(clean(r[0])));
  const cases = [];
  for (const r of bal.slice(ri, ri + 6)) {
    const m = num(r[1]); const note = clean(r[2]);
    if (!m || !note) continue;
    if (/actual/i.test(note)) { cases.unshift({ key: 'actual', label: 'Thực tế · TB 3 tháng gần nhất', burn: null, months: m, actual: true }); continue; }
    const k = note.match(/([\d.]+)\s*k/i);
    if (k) cases.push({ key: `${k[1]}k`, label: `Kịch bản ${k[1]}K/tháng`, burn: Number(k[1]) * 1000, months: m });
  }
  const fixed = cases.filter((c) => c.burn);
  if (!fixed.length) throw new Error('không đọc được runway trên sheet Balance');
  const cash = Math.round(fixed.reduce((a, c) => a + c.months * c.burn, 0) / fixed.length);

  // Token: dòng tổng cuối sheet Crypto có cột J bằng tổng crypto trên Balance
  const cr = read('crypto');
  const tot = [...cr].reverse().find((r) => Math.abs(num(r[9]) - cryptoPool) <= 2 && num(r[9]) > 0);
  if (!tot) throw new Error('không tìm thấy dòng tổng sheet Crypto');
  const tokens = { stable: num(tot[5]), btc: num(tot[6]), eth: num(tot[7]), other: num(tot[8]), total: num(tot[9]),
    btcQty: num(rowOf(bal, 'BTC balance')?.[1]) || undefined, ethQty: num(rowOf(bal, 'ETH balance')?.[1]) || undefined };

  const ind = read('individuals');
  const banks = []; let loans = 0;
  for (const r of ind.slice(1)) {
    const k = clean(r[0]);
    if (!k) continue;
    if (/^total/i.test(k)) break;
    if (/loan/i.test(k)) { loans += Math.abs(num(r[3])); continue; }
    const b = { bank: bankName(k), pledged: num(r[1]), unpledged: num(r[2]) };
    if (b.pledged || b.unpledged) banks.push(b);
  }
  const indRow = ind.find((r) => /^total/i.test(clean(r[0])));
  const individuals = { banks, pledged: num(indRow?.[1]), unpledged: num(indRow?.[2]), total: num(indRow?.[3]), loans };

  const entities = [entity(read('vihali'), 'Vihali'), entity(read('vixion'), 'Vixion'), entity(read('ba'), 'Beyond Atoms')];

  // Đối chiếu: tổng các nguồn phải khớp dòng Total của sheet Balance
  const sum = tokens.total + individuals.total + entities.reduce((a, e) => a + e.net, 0) + osBank;
  if (Math.abs(sum - total) > 5) throw new Error(`lệch tổng: cộng nguồn ${sum} ≠ Balance ${total}`);

  const out = { asOf, source: 'Dashboard Treasury Balance · sheet Balance', fx: FX, total, individuals, entities, osBank, tokens, runway: { cash, cases }, generatedAt: new Date().toISOString() };
  fs.writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`balance-current.json: total ${total}, runway ${cases.map((c) => c.months).join('/')} tháng`);
}

try { main(); } catch (e) {
  console.warn(`[balance] bỏ qua, giữ file cũ: ${e instanceof Error ? e.message : e}`);
  process.exit(0);
}
