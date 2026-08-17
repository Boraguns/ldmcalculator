// Print every node of a GLB with its world-space bbox (min/max), so viewer
// alignment constants come from measurement, not guessing.
// Run: node scripts/glb-info.mjs <file.glb>
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';

const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
});

for (const file of process.argv.slice(2)) {
  const doc = await io.read(file);
  console.log('\n=== ' + file);
  const mul = (m, v) => [
    m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
    m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
    m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14],
  ];
  const matMul = (a, b) => { // a*b column-major 4x4
    const r = new Array(16).fill(0);
    for (let c = 0; c < 4; c++) for (let ro = 0; ro < 4; ro++)
      for (let k = 0; k < 4; k++) r[c * 4 + ro] += a[k * 4 + ro] * b[c * 4 + k];
    return r;
  };
  const I = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
  const walk = (node, parentM, depth) => {
    const local = node.getMatrix();
    const world = matMul(parentM, local);
    const mesh = node.getMesh();
    let info = '';
    if (mesh) {
      let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
      for (const prim of mesh.listPrimitives()) {
        const pos = prim.getAttribute('POSITION');
        if (!pos) continue;
        const arr = pos.getArray();
        for (let i = 0; i < arr.length; i += 3) {
          const w = mul(world, [arr[i], arr[i + 1], arr[i + 2]]);
          for (let k = 0; k < 3; k++) { if (w[k] < mn[k]) mn[k] = w[k]; if (w[k] > mx[k]) mx[k] = w[k]; }
        }
      }
      info = '  bbox ' + mn.map(v => v.toFixed(2)).join(',') + ' .. ' + mx.map(v => v.toFixed(2)).join(',') +
             '  mats[' + mesh.listPrimitives().map(p => p.getMaterial()?.getName()).join('|') + ']';
    }
    console.log('  '.repeat(depth) + (node.getName() || '(unnamed)') + (mesh ? ' [mesh]' : '') + info);
    for (const c of node.listChildren()) walk(c, world, depth + 1);
  };
  for (const scene of doc.getRoot().listScenes()) {
    for (const n of scene.listChildren()) walk(n, I, 0);
  }
}
