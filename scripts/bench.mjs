// Packing-quality benchmark. Measures, for a diverse set of load classes, how
// much of the theoretically loadable volume the engine actually places:
//   efficiency = placedVolume / min(requestedVolume, containerVolume)
// Run: node scripts/bench.mjs
import { BinPacking3D } from '../src/utils/binpacking.js';

const C = { length: 1360, width: 245, height: 275, maxWeight: 22000 };
const CVOL = C.length * C.width * C.height;

// Deterministic PRNG so results are comparable across engine versions.
const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const F = { maxStack: 99, allowRotation: true, stackMode: 'full' };
const scenarios = [];
const add = (name, items) => scenarios.push({ name, items });

// -- structured classes --------------------------------------------------
add('uniform small 40cube', [{ id: 'a', length: 40, width: 40, height: 40, weight: 5, quantity: 2000, ...F }]);
add('uniform euro-box 60x40x40', [{ id: 'a', length: 60, width: 40, height: 40, weight: 8, quantity: 1500, ...F }]);
add('uniform 111x95x104 (client)', [{ id: 'a', length: 111, width: 95, height: 104, weight: 10, quantity: 80, ...F }]);
add('uniform pallet 120x80x100', [{ id: 'a', length: 120, width: 80, height: 100, weight: 100, quantity: 60, ...F }]);
add('bimodal pallet+carton', [
  { id: 'p', length: 120, width: 80, height: 144, weight: 250, quantity: 30, ...F },
  { id: 'c', length: 40, width: 30, height: 30, weight: 4, quantity: 800, ...F }]);
add('client 5-type', [
  { id: '1', length: 80, width: 120, height: 100, weight: 100, quantity: 33, ...F },
  { id: '2', length: 60, width: 40, height: 40, weight: 10, quantity: 200, ...F },
  { id: '3', length: 80, width: 60, height: 40, weight: 10, quantity: 70, ...F },
  { id: '4', length: 30, width: 30, height: 30, weight: 5, quantity: 300, ...F },
  { id: '5', length: 120, width: 120, height: 50, weight: 30, quantity: 20, ...F }]);
add('flat panels + boxes', [
  { id: 'panel', length: 200, width: 100, height: 12, weight: 25, quantity: 80, ...F, allowTip: true },
  { id: 'box', length: 55, width: 45, height: 50, weight: 12, quantity: 300, ...F }]);
add('tall furniture + fillers', [
  { id: 'ward', length: 60, width: 60, height: 210, weight: 60, quantity: 40, ...F },
  { id: 'fill', length: 45, width: 35, height: 30, weight: 6, quantity: 400, ...F, allowTip: true }]);
add('433 mixed', [
  { id: '1', length: 80, width: 120, height: 100, weight: 100, quantity: 33, ...F },
  { id: '2', length: 60, width: 40, height: 40, weight: 10, quantity: 200, ...F },
  { id: '3', length: 50, width: 50, height: 40, weight: 20, quantity: 200, ...F }]);
add('long pipes + boxes', [
  { id: 'pipe', length: 600, width: 25, height: 25, weight: 30, quantity: 60, ...F },
  { id: 'box', length: 60, width: 50, height: 45, weight: 10, quantity: 250, ...F }]);

// -- randomized classes (deterministic) ----------------------------------
for (let s = 1; s <= 8; s++) {
  const rnd = mulberry32(1000 + s);
  const n = 3 + Math.floor(rnd() * 4);
  const items = [];
  for (let i = 0; i < n; i++) {
    items.push({
      id: 'r' + i,
      length: 25 + Math.floor(rnd() * 150),
      width: 25 + Math.floor(rnd() * 120),
      height: 20 + Math.floor(rnd() * 130),
      weight: 2 + Math.floor(rnd() * 60),
      quantity: 30 + Math.floor(rnd() * 250),
      allowTip: rnd() < 0.4,
      ...F,
    });
  }
  add('random mix #' + s, items);
}

// -- run ------------------------------------------------------------------
let sumEff = 0, minEff = 1, minName = '';
const rows = [];
for (const sc of scenarios) {
  const t0 = Date.now();
  const placed = new BinPacking3D(C, sc.items).pack().placedItems || [];
  const ms = Date.now() - t0;
  const req = sc.items.reduce((s, i) => s + i.quantity, 0);
  const reqVol = sc.items.reduce((s, i) => s + i.length * i.width * i.height * i.quantity, 0);
  const placedVol = placed.reduce((s, p) => s + p.dimensions.length * p.dimensions.width * p.dimensions.height, 0);
  const bound = Math.min(reqVol, CVOL);
  const eff = placedVol / bound;
  // integrity
  let bad = 0;
  for (const p of placed) { const d = p.dimensions, po = p.position; if (po.x < -0.01 || po.y < -0.01 || po.z < -0.01 || po.x + d.length > C.length + 0.01 || po.y + d.width > C.width + 0.01 || po.z + d.height > C.height + 0.01) bad++; }
  for (let i = 0; i < placed.length && !bad; i++) for (let j = i + 1; j < placed.length; j++) { const a = placed[i], b = placed[j], ax = a.position, ad = a.dimensions, bx = b.position, bd = b.dimensions; if (ax.x < bx.x + bd.length - 0.01 && ax.x + ad.length > bx.x + 0.01 && ax.y < bx.y + bd.width - 0.01 && ax.y + ad.width > bx.y + 0.01 && ax.z < bx.z + bd.height - 0.01 && ax.z + ad.height > bx.z + 0.01) { bad++; break; } }
  sumEff += eff;
  if (eff < minEff) { minEff = eff; minName = sc.name; }
  rows.push({ name: sc.name, placed: placed.length + '/' + req, eff: (eff * 100).toFixed(1) + '%', ms, bad });
}
for (const r of rows) console.log(r.name.padEnd(30), ('placed ' + r.placed).padEnd(18), 'eff ' + r.eff.padStart(6), (r.ms + 'ms').padStart(7), r.bad ? ' INTEGRITY-FAIL' : '');
console.log('\nMEAN efficiency:', (sumEff / scenarios.length * 100).toFixed(2) + '%', '| WORST:', (minEff * 100).toFixed(1) + '%', '(' + minName + ')');
