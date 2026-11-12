// Senaryo denetimi: node scripts/check-scenarios.mjs
// - tekneler alan dışına çıkıyor mu (1000x680, ±60 tolerans)
// - tekneler birbirine 30 px'den fazla yaklaşıyor mu
// - tekneler şamandıra / pin / hakem botuna çarpıyor mu
// - start senaryolarında hattı uçlar arasından mı geçiyorlar (scn.expectOutside ile istisna)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
require('../src/js/engine.js'); require('../src/js/rules.js'); require('../src/js/scenarios.js');
const E = globalThis.SailEngine, R = globalThis.SailRules;
let problems = 0;
const warn = (scn, msg) => { problems++; console.log(`  ⚠ ${scn.id}: ${msg}`); };
for (const scn of globalThis.SCENARIOS) {
  console.log('•', scn.id);
  const tracks = scn.boats.map(b => ({ id: b.id, track: E.buildTrack(scn, b.start, b.segs, { v0: b.v0, t0: b.t0 }) }));
  const obs = E.obstaclesOf(scn);
  const minPair = {}; const minObs = {};
  for (let t = 0; t <= scn.duration; t += 0.1) {
    const pos = tracks.map(b => ({ id: b.id, ...E.sampleTrack(b.track, t) }));
    for (const p of pos) {
      if (t < scn.duration - 1 && (p.x < -60 || p.x > 1060 || p.y < -60 || p.y > 740)) { warn(scn, `${p.id} t=${t.toFixed(1)} alan dışında (${p.x.toFixed(0)},${p.y.toFixed(0)})`); break; }
      for (const o of obs) { const d = Math.hypot(p.x - o.x, p.y - o.y) - o.r; if (!(p.id in minObs) || d < minObs[p.id]) minObs[p.id] = d; }
    }
    for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) {
      const k = pos[i].id + '-' + pos[j].id, d = Math.hypot(pos[i].x - pos[j].x, pos[i].y - pos[j].y);
      if (!(k in minPair) || d < minPair[k]) minPair[k] = d;
    }
  }
  for (const [k, d] of Object.entries(minPair)) if (d < 30) warn(scn, `${k} birbirine ${d.toFixed(0)} px yaklaşıyor`);
  for (const [k, d] of Object.entries(minObs)) if (d < 10) warn(scn, `${k} engele ${d.toFixed(0)} px yaklaşıyor (şamandıra/hakem botu)`);
  if (scn.line && scn.startAt > 0) {
    for (const b of tracks) {
      let c = null;
      for (let t = 0; t <= scn.duration; t += 0.1) { const s = E.sampleTrack(b.track, t); if (R.lineSide(scn.line, s) === -1) { c = { t, u: R.lineParam(scn.line, s) }; break; } }
      if (!c) continue;
      const outside = c.u < 0 || c.u > 1;
      if (outside && !(scn.expectOutside || []).includes(b.id)) warn(scn, `${b.id} hattı dışarıdan geçiyor (u=${c.u.toFixed(2)})`);
      if (!outside && c.t < scn.startAt - 0.3 && !(scn.expectEarly || []).includes(b.id)) warn(scn, `${b.id} erken geçiyor (t=${c.t.toFixed(1)} < ${scn.startAt})`);
    }
  }
}
console.log(problems ? `\n${problems} uyarı` : '\nTemiz ✔');
process.exit(problems ? 1 : 0);
