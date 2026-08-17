// Inspect a binary STL: bbox, triangle count, and candidate horizontal "deck"
// planes (large upward-facing flat areas), so the viewer can align cargo on it.
// Run: node scripts/stl-info.mjs <file.stl>
import fs from 'fs';

for (const file of process.argv.slice(2)) {
  const buf = fs.readFileSync(file);
  const isAscii = buf.slice(0, 5).toString() === 'solid' && !buf.slice(0, 512).includes(0);
  console.log('\n=== ' + file + ' (' + (buf.length / 1e6).toFixed(2) + ' MB, ' + (isAscii ? 'ASCII' : 'binary') + ')');
  if (isAscii) { console.log('ASCII STL — parse skipped (convert to binary)'); continue; }
  const n = buf.readUInt32LE(80);
  console.log('triangles:', n);
  let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  // Up-facing area histogram per height bucket, for each axis being "up".
  const H = { x: new Map(), y: new Map(), z: new Map() };
  const B = 5; // bucket size (model units)
  let off = 84;
  for (let i = 0; i < n; i++) {
    const nx = buf.readFloatLE(off), ny = buf.readFloatLE(off + 4), nz = buf.readFloatLE(off + 8);
    const v = [];
    for (let k = 0; k < 3; k++) {
      const x = buf.readFloatLE(off + 12 + k * 12), y = buf.readFloatLE(off + 16 + k * 12), z = buf.readFloatLE(off + 20 + k * 12);
      v.push([x, y, z]);
      if (x < min[0]) min[0] = x; if (x > max[0]) max[0] = x;
      if (y < min[1]) min[1] = y; if (y > max[1]) max[1] = y;
      if (z < min[2]) min[2] = z; if (z > max[2]) max[2] = z;
    }
    // triangle area
    const ax = v[1][0] - v[0][0], ay = v[1][1] - v[0][1], az = v[1][2] - v[0][2];
    const bx = v[2][0] - v[0][0], by = v[2][1] - v[0][1], bz = v[2][2] - v[0][2];
    const cxp = ay * bz - az * by, cyp = az * bx - ax * bz, czp = ax * by - ay * bx;
    const area = Math.sqrt(cxp * cxp + cyp * cyp + czp * czp) / 2;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    const un = [nx / len, ny / len, nz / len];
    const cen = [(v[0][0] + v[1][0] + v[2][0]) / 3, (v[0][1] + v[1][1] + v[2][1]) / 3, (v[0][2] + v[1][2] + v[2][2]) / 3];
    const axes = ['x', 'y', 'z'];
    axes.forEach((a, ai) => {
      if (Math.abs(un[ai]) > 0.95) { // near-flat w.r.t this axis
        const b = Math.round(cen[ai] / B) * B;
        H[a].set(b, (H[a].get(b) || 0) + area);
      }
    });
    off += 50;
  }
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  console.log('bbox min:', min.map(v => v.toFixed(1)).join(', '));
  console.log('bbox max:', max.map(v => v.toFixed(1)).join(', '));
  console.log('size    :', size.map(v => v.toFixed(1)).join(' x '));
  for (const a of ['x', 'y', 'z']) {
    const top = [...H[a].entries()].sort((p, q) => q[1] - p[1]).slice(0, 4);
    console.log('flat-' + a + ' planes (level:area):', top.map(([lv, ar]) => lv + ':' + Math.round(ar)).join('  '));
  }
}
