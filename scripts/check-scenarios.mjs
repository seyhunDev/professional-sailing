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
  // uygulamadaki gibi: senaryo tekneleri + filo, pis rüzgar yavaşlaması dahil
  const specs = (scn.crowd || []).map(c => {
    const sp = { tack: c.tack || 'starboard', row: c.row || 0, back: c.back || 0, v0: c.v0 };
    if (c.slot != null && scn.line) { const { pin, boat } = scn.line; sp.slot = { x: pin.x + (boat.x - pin.x) * c.slot, y: pin.y + (boat.y - pin.y) * c.slot }; } else sp.pos = c.pos;
    return sp;
  });
  const sc = R.buildScene(scn, specs);
  const tracks = scn.boats.map((b, i) => ({ id: b.id, track: sc.scripted[i] }));
  sc.extras.forEach((tr, i) => tracks.push({ id: 'filo' + (i + 1), crowd: true, track: tr }));
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
      if (!(k in minPair) || d < minPair[k].d) minPair[k] = { d, t, a: pos[i], b: pos[j] };
    }
  }
  for (const [k, m] of Object.entries(minPair)) if (m.d < 30) warn(scn, `${k} birbirine ${m.d.toFixed(0)} px yaklaşıyor (t=${m.t.toFixed(1)}, ${m.a.x.toFixed(0)},${m.a.y.toFixed(0)} / ${m.b.x.toFixed(0)},${m.b.y.toFixed(0)})`);
  for (const [k, d] of Object.entries(minObs)) if (d < 10) warn(scn, `${k} engele ${d.toFixed(0)} px yaklaşıyor (şamandıra/hakem botu)`);
  if (scn.line && scn.startAt > 0) {
    for (const b of tracks) {
      let c = null;
      for (let t = 0; t <= scn.duration; t += 0.1) { const s = E.sampleTrack(b.track, t); if (R.lineSide(scn.line, s) === -1) { c = { t, u: R.lineParam(scn.line, s) }; break; } }
      if (!c) { if (b.crowd) warn(scn, `${b.id} hattı hiç geçmiyor`); continue; }
      const outside = c.u < 0 || c.u > 1;
      if (outside && !(scn.expectOutside || []).includes(b.id)) warn(scn, `${b.id} hattı dışarıdan geçiyor (u=${c.u.toFixed(2)})`);
      if (!outside && c.t < scn.startAt - 0.3 && !(scn.expectEarly || []).includes(b.id)) warn(scn, `${b.id} erken geçiyor (t=${c.t.toFixed(1)} < ${scn.startAt})`);
    }
  }
}
console.log(problems ? `\n${problems} uyarı` : '\nTemiz ✔');
process.exit(problems ? 1 : 0);
