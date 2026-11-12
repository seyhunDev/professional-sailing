// Simülatör denetimi: node scripts/check-sim.mjs
// Varsayılan filo birkaç rüzgar / sağanak durumunda yarışır; herkes bitirmeli,
// tekneler alan dışına çıkmamalı, temas sayısı az olmalı.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
require('../src/js/engine.js'); require('../src/js/rules.js'); require('../src/js/sim-core.js');
const S = globalThis.SailSim;
const cases = [
  { name: 'rüzgar 0°', wind: 0 },
  { name: 'rüzgar 15° (hakem botu avantajlı)', wind: 15 },
  { name: 'rüzgar -15° (pin avantajlı)', wind: -15 },
  { name: 'sağda sağanak', wind: 0, gusts: [{ x: 760, y: 450, rx: 130, ry: 200 }] },
  { name: 'yarışta rüzgar 12° sağa döner', wind: 0, shift: { at: 25, to: 12 } },
  { name: 'kısa hat (5 boy), yakın şamandıra (8 boy)', wind: 0, course: { lineLen: 250, markDist: 400 } },
  { name: 'uzun hat (16 boy), uzak şamandıra (24 boy)', wind: 8, course: { lineLen: 800, markDist: 1200 } },
  { name: 'senin teknen sağa rota çizdi', wind: 0, route: [{ x: 560, y: 700 }, { x: 800, y: 560 }, { x: 820, y: 300 }, { x: 600, y: 150 }] },
  { name: 'senin teknen düz yukarı rota (zikzak)', wind: 10, route: [{ x: 500, y: 600 }, { x: 500, y: 200 }] },
];
let problems = 0;
const verbose = process.argv.includes('-v');
for (const c of cases) {
  S.setCourse(c.course || S.COURSE_DEFAULT);
  const fleet = S.defaultFleet(12); if (c.route) fleet.find(b => b.mine).route = c.route;
  const s = S.newRace(fleet, { wind: c.wind, gusts: c.gusts, course: c.course });
  let out = 0; const near = c.route ? c.route.map(() => 1e9) : [];
  while (s.t < 150 && s.boats.some(b => !b.finish)) {
    if (c.shift && Math.abs(s.t - c.shift.at) < 1e-6) s.wind = c.shift.to;
    S.step(s);
    const me = s.boats.find(b => b.mine);
    if (c.route && s.t > s.startAt) c.route.forEach((p, i) => { near[i] = Math.min(near[i], Math.hypot(me.x - p.x, me.y - p.y)); });
    for (const b of s.boats) if (!b.gone && (b.x < -40 || b.x > S.WORLD.w + 40 || b.y < -40 || b.y > S.WORLD.h + 40)) out++;
  }
  const unfinished = s.boats.filter(b => !b.finish).map(b => `${b.id}(${b.phase} ${b.x.toFixed(0)},${b.y.toFixed(0)})`);
  const contacts = s.events.filter(e => e.kind === 'bad' && e.text.startsWith('Temas')).length;
  const rules = s.events.filter(e => e.kind === 'rule').length;
  const order = s.boats.filter(b => b.finish).sort((a, b) => a.finish - b.finish).map(b => b.id).join(' ');
  const last = Math.max(...s.boats.map(b => b.finishT || 0));
  console.log(`• ${c.name}: sıra ${order} · son ${last.toFixed(1)} s · kural olayı ${rules} · temas ${contacts}`);
  if (verbose) for (const e of s.events) console.log(`    ${e.t.toFixed(1)} ${e.text}`);
  if (unfinished.length) { problems++; console.log('  ⚠ bitiremeyen:', unfinished.join(', ')); }
  if (out) { problems++; console.log('  ⚠ alan dışı örnek:', out); }
  // rota: start'tan sonraki her noktanın yakınından geçmeli (kalabalıkta tramola için açık beklerken koridor 3 katına kadar taşabilir)
  const missed = c.route ? c.route.map((p, i) => [i, near[i]]).filter(([i, d]) => S.lineSide(c.route[i]) === -1 && d > 140) : [];
  if (missed.length) { problems++; console.log('  ⚠ rota noktası kaçtı:', missed.map(([i, d]) => `#${i} ${d.toFixed(0)} px`).join(', ')); }
  if (contacts > 6) { problems++; console.log('  ⚠ temas çok:', contacts); }   // kalabalık şamandıra dönüşünde birkaç temas gerçekçi; fazlası hata
}
console.log(problems ? `\n${problems} uyarı` : '\nSimülatör temiz ✔');
process.exit(problems ? 1 : 0);
