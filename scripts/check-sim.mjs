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
];
let problems = 0;
const verbose = process.argv.includes('-v');
for (const c of cases) {
  const s = S.newRace(S.defaultFleet(12), { wind: c.wind, gusts: c.gusts });
  let out = 0;
  while (s.t < 150 && s.boats.some(b => !b.finish)) {
    if (c.shift && Math.abs(s.t - c.shift.at) < 1e-6) s.wind = c.shift.to;
    S.step(s);
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
  if (contacts > 6) { problems++; console.log('  ⚠ temas çok:', contacts); }   // kalabalık şamandıra dönüşünde birkaç temas gerçekçi; fazlası hata
}
console.log(problems ? `\n${problems} uyarı` : '\nSimülatör temiz ✔');
process.exit(problems ? 1 : 0);
