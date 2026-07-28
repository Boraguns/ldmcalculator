import { BinPacking3D } from '../src/utils/binpacking.js';
const C = { length: 1360, width: 245, height: 275, maxWeight: 22000 };
let pass = 0, fail = 0; const failures = [];
function verify(name, items, expect = {}) {
  const t0 = Date.now();
  let placed;
  try { placed = new BinPacking3D(C, items).pack().placedItems || []; }
  catch (e) { fail++; failures.push(name + ': THROW ' + e.message); console.log('FAIL ' + name); return; }
  const ms = Date.now() - t0;
  let oob = 0, coll = 0, flo = 0;
  for (const p of placed) { const d = p.dimensions, po = p.position; if (po.x < -0.01 || po.y < -0.01 || po.z < -0.01 || po.x + d.length > C.length + 0.01 || po.y + d.width > C.width + 0.01 || po.z + d.height > C.height + 0.01) oob++; }
  for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) { const a = placed[i], b = placed[j], ax = a.position, ad = a.dimensions, bx = b.position, bd = b.dimensions; if (ax.x < bx.x + bd.length - 0.01 && ax.x + ad.length > bx.x + 0.01 && ax.y < bx.y + bd.width - 0.01 && ax.y + ad.width > bx.y + 0.01 && ax.z < bx.z + bd.height - 0.01 && ax.z + ad.height > bx.z + 0.01) coll++; }
  for (const p of placed) { if (p.position.z < 0.5) continue; let area = 0; const bl = p.dimensions.length * p.dimensions.width; for (const q of placed) { if (q === p) continue; if (Math.abs(q.position.z + q.dimensions.height - p.position.z) > 0.5) continue; const ox = Math.min(p.position.x + p.dimensions.length, q.position.x + q.dimensions.length) - Math.max(p.position.x, q.position.x); const oy = Math.min(p.position.y + p.dimensions.width, q.position.y + q.dimensions.width) - Math.max(p.position.y, q.position.y); area += Math.max(0, ox) * Math.max(0, oy); } if (area / bl < 0.9) flo++; }
  const byId = {}; for (const p of placed) byId[p.id] = (byId[p.id] || 0) + 1;
  const errs = [];
  if (oob) errs.push('OOB=' + oob); if (coll) errs.push('coll=' + coll); if (flo) errs.push('unsupported=' + flo);
  if (expect.total != null && placed.length !== expect.total) errs.push('total ' + placed.length + ' != ' + expect.total);
  if (expect.minTotal != null && placed.length < expect.minTotal) errs.push('total ' + placed.length + ' < ' + expect.minTotal);
  if (expect.maxMs != null && ms > expect.maxMs) errs.push('slow ' + ms + 'ms');
  if (expect.check) { const r = expect.check(placed, byId); if (r) errs.push(r); }
  if (errs.length) { fail++; failures.push(name + ': ' + errs.join(', ')); }
  else pass++;
  console.log((errs.length ? 'FAIL ' : 'PASS ') + name.padEnd(44) + ' placed=' + placed.length + ' ' + ms + 'ms');
}
const F = { maxStack: 99, allowRotation: true, stackMode: 'full' };
verify('433 mixed fits fully', [
  { id: '1', length: 80, width: 120, height: 100, weight: 100, quantity: 33, ...F },
  { id: '2', length: 60, width: 40, height: 40, weight: 10, quantity: 200, ...F },
  { id: '3', length: 50, width: 50, height: 40, weight: 20, quantity: 200, ...F }], { total: 433, maxMs: 5000 });
verify('client 5-product topup >=580', [
  { id: '1', length: 80, width: 120, height: 100, weight: 100, quantity: 33, ...F },
  { id: '2', length: 60, width: 40, height: 40, weight: 10, quantity: 200, ...F },
  { id: '3', length: 80, width: 60, height: 40, weight: 10, quantity: 70, ...F },
  { id: '4', length: 30, width: 30, height: 30, weight: 5, quantity: 300, ...F },
  { id: '5', length: 120, width: 120, height: 50, weight: 30, quantity: 20, ...F }], { minTotal: 580, maxMs: 5000 });
const LIST69 = [[90, 86, 71], [161, 86, 71], [221, 86, 71], [155, 85, 12], [155, 85, 12], [55, 55, 12], [39, 39, 42], [90, 86, 71], [221, 86, 71], [155, 85, 12], [39, 39, 42], [55, 55, 12], [39, 39, 42], [152, 85.5, 71], [152, 85.5, 71], [90, 90, 71], [80, 85.5, 71], [155, 85, 12], [39, 39, 42], [55, 55, 12], [39, 39, 42], [250, 225, 12], [180, 63, 75], [155, 155, 12], [100, 100, 75], [125, 125, 12], [85, 85, 75], [74, 73, 87], [74, 73, 87], [155, 85, 12], [80, 45, 105], [74, 73, 120], [74, 73, 120], [85, 175, 45], [155, 175, 45], [85, 105, 82], [65, 65, 20], [250, 250, 53], [250, 250, 14], [61, 112, 84], [85, 85, 12], [45, 45, 105], [85, 105, 82], [155, 105, 82], [225, 105, 82], [85, 85, 20], [85, 85, 20], [85, 65, 20], [65, 65, 20], [85, 105, 82], [225, 105, 82], [85, 85, 20], [85, 65, 20], [65, 65, 20], [150, 105, 82], [150, 105, 82], [75, 105, 82], [110, 110, 82], [85, 105, 82], [85, 85, 20], [85, 65, 20], [65, 65, 20], [85, 175, 82], [155, 175, 82], [65, 65, 20], [105, 105, 20], [65, 75, 90], [115, 85, 20], [65, 68, 115]];
verify('69-piece one-off list all placed', LIST69.map(([l, w, h], i) => ({ id: 'B' + i, length: l, width: w, height: h, weight: 10, quantity: 1, allowTip: true, ...F })), { total: 69, maxMs: 5000 });
verify('none: single floor row only', [{ id: 'a', length: 120, width: 100, height: 90, weight: 200, quantity: 40, allowRotation: true, stackMode: 'none' }],
  { total: 26, check: (p) => p.some(x => x.position.z > 0.5) ? 'stacked despite none' : null });
verify('self: only own kind above/below', [
  { id: 'a', length: 100, width: 100, height: 60, weight: 50, quantity: 30, maxStack: 99, allowRotation: true, stackMode: 'self' },
  { id: 'b', length: 100, width: 100, height: 60, weight: 50, quantity: 30, maxStack: 99, allowRotation: true, stackMode: 'self' }],
  { check: (p) => { for (const x of p) { if (x.position.z < 0.5) continue; const sup = p.filter(q => q !== x && Math.abs(q.position.z + q.dimensions.height - x.position.z) < 0.5 && q.position.x < x.position.x + x.dimensions.length - 1 && q.position.x + q.dimensions.length > x.position.x + 1 && q.position.y < x.position.y + x.dimensions.width - 1 && q.position.y + q.dimensions.width > x.position.y + 1); if (sup.some(s => s.id !== x.id)) return 'cross-stack in self mode'; } return null; } });
verify('carrier stays on floor, others on top', [
  { id: 'CAR', length: 120, width: 100, height: 60, weight: 80, quantity: 10, maxStack: 99, allowRotation: true, stackMode: 'carrier' },
  { id: 'A', length: 60, width: 40, height: 40, weight: 15, quantity: 60, ...F }],
  { check: (p) => { if (p.filter(x => x.id === 'CAR').some(x => x.position.z > 0.5)) return 'carrier elevated'; const on = p.filter(x => x.id === 'A' && x.position.z > 0.5).length; return on > 0 ? null : 'nothing stacked on carrier'; } });
verify('topper rides, nothing on topper', [
  { id: 'base', length: 120, width: 100, height: 50, weight: 80, quantity: 20, ...F },
  { id: 'top', length: 60, width: 60, height: 40, weight: 10, quantity: 40, maxStack: 99, allowRotation: true, stackMode: 'topper' }],
  { check: (p) => { for (const x of p) { if (x.position.z < 0.5) continue; const sup = p.filter(q => q !== x && Math.abs(q.position.z + q.dimensions.height - x.position.z) < 0.5 && q.position.x < x.position.x + x.dimensions.length - 1 && q.position.x + q.dimensions.length > x.position.x + 1 && q.position.y < x.position.y + x.dimensions.width - 1 && q.position.y + q.dimensions.width > x.position.y + 1); if (sup.some(s => s.stackMode === 'topper' && s.id !== x.id)) return 'OTHER product resting on a topper'; } return null; } });
verify('rotate ON but fits upright: 0 rotated', [{ id: 'a', length: 60, width: 40, height: 40, weight: 10, quantity: 60, ...F }],
  { total: 60, check: (p) => p.some(x => x.rotation) ? 'rotated needlessly' : null });
verify('wider than deck: rotates to fit', [{ id: 'b', length: 120, width: 280, height: 100, weight: 50, quantity: 6, ...F }],
  { total: 6, check: (p) => p.every(x => x.rotation) ? null : 'did not rotate' });
verify('rotate OFF + too wide: nothing oversize placed', [{ id: 'c', length: 120, width: 280, height: 100, weight: 50, quantity: 6, maxStack: 99, allowRotation: false, stackMode: 'full' }],
  { check: (p) => { for (const x of p) { if (x.dimensions.width > 245.01) return 'placed wider than deck'; } return null; } });
verify('weight cap respected', [{ id: 'h', length: 120, width: 100, height: 100, weight: 1200, quantity: 40, ...F }],
  { check: (p) => { const w = p.reduce((s, x) => s + x.weight, 0); return w > 22000 ? 'over maxWeight ' + w : null; } });
verify('legacy both/bear/top map through', [
  { id: 'x', length: 120, width: 80, height: 60, weight: 90, quantity: 20, maxStack: 99, allowRotation: true, stackMode: 'both' },
  { id: 'y', length: 60, width: 40, height: 40, weight: 15, quantity: 50, allowRotation: true, stackMode: 'top' },
  { id: 'z', length: 110, width: 90, height: 30, weight: 120, quantity: 14, maxStack: 99, allowRotation: true, stackMode: 'bear' }], { minTotal: 84, maxMs: 5000 });
verify('empty list no crash', [], { total: 0 });
verify('1 unit', [{ id: 'a', length: 100, width: 100, height: 100, weight: 10, quantity: 1, ...F }], { total: 1 });
verify('box exactly deck size', [{ id: 'a', length: 1360, width: 245, height: 275, weight: 100, quantity: 1, ...F }], { total: 1 });
verify('box too tall never placed', [{ id: 'a', length: 100, width: 100, height: 300, weight: 10, quantity: 5, allowRotation: false, stackMode: 'full', maxStack: 99 }],
  { check: (p) => { for (const x of p) { if (x.dimensions.height > 275.01) return 'placed taller than deck'; } return null; } });
verify('700 units perf < 6s', [
  { id: 'a', length: 60, width: 40, height: 40, weight: 8, quantity: 350, ...F },
  { id: 'b', length: 40, width: 30, height: 30, weight: 5, quantity: 350, ...F }], { maxMs: 6000 });
console.log('\n=== ' + pass + ' PASS, ' + fail + ' FAIL ===');
if (failures.length) { console.log('FAILURES:'); failures.forEach(f => console.log(' - ' + f)); process.exit(1); }
