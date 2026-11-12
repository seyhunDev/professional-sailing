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
  { name: 'orta akıntı + büyük dalga, 3 numara sürükleniyor', wind: 0, sea: { current: 2, waves: 2 }, drift: '3' },
  { name: 'senin teknen sağa rota çizdi', wind: 0, route: [{ x: 560, y: 700 }, { x: 800, y: 560 }, { x: 820, y: 300 }, { x: 600, y: 150 }] },
  { name: 'ILCA 7, 18 knot rüzgar, 10 sn kala hızlan', wind: 0, boat: { cls: 'ilca7', windKn: 18, accelAt: 10 } },
  { name: 'Optimist, 4 knot rüzgar, 60 sn kala hızlan', wind: 5, boat: { cls: 'optimist', windKn: 4, accelAt: 60 } },
  { name: 'senin teknen düz yukarı rota (zikzak)', wind: 10, route: [{ x: 500, y: 600 }, { x: 500, y: 200 }] },
];
let problems = 0;
const verbose = process.argv.includes('-v');
for (const c of cases) {
  S.setCourse(c.course || S.COURSE_DEFAULT);
  const fleet = S.defaultFleet(12); if (c.route) fleet.find(b => b.mine).route = c.route;
  if (c.drift) fleet.find(b => b.id === c.drift).drift = 2;
  const s = S.newRace(fleet, { wind: c.wind, gusts: c.gusts, course: c.course, sea: c.sea, boat: c.boat });
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
// manuel mod: tekne tramolayı yalnız komutla atar (parkurdan MAN_MARGIN kadar uzaklaşınca zorunlu dönüş hariç)
for (const wind of [-12, 0, 12]) {
  S.setCourse(S.COURSE_DEFAULT);
  const fleet = S.defaultFleet(12); fleet.forEach((b, i) => { if (b.mine || i % 3 === 0) b.manual = true; });
  const s = S.newRace(fleet, { wind }); const prev = new Map(s.boats.map(b => [b.id, b.tack])); let self = 0, n0;
  while (s.t < 120 && s.boats.some(b => !b.finish)) {
    n0 = s.events.length; S.step(s);
    for (const b of s.boats) {
      if (b.manual && b.started && b.phase === 'race' && prev.get(b.id) !== b.tack && !s.events.slice(n0).some(e => e.text.startsWith(`${b.id}: parkurdan çok uzaklaştı`))) self++;
      prev.set(b.id, b.tack);
    }
  }
  console.log(`• manuel mod, rüzgar ${wind}°: kendiliğinden tramola ${self}`);
  if (self) { problems++; console.log('  ⚠ manuel tekne kendiliğinden tramola attı'); }
}
// K11 rüzgarüstü testi: bindirmeli aynı kontrada rüzgarüstü, diğerinin rüzgarüstü YANINDAKİ teknedir
// (rüzgaraltı tekne biraz önde olup rüzgar yönüne izdüşümde yukarıda görünse bile).
{
  const R = globalThis.SailRules, E = globalThis.SailEngine;
  let bad = 0;
  for (const w of [-30, 0, 20]) for (const tack of [-1, 1]) for (const back of [0, 25, 44]) for (const lat of [20, 34, 45]) {
    const h = w + tack * 45, f = E.fwd(h), side = E.fwd(h - tack * 90);   // side: rüzgar tarafı
    const L = { x: 300, y: 300, h }, W = { x: 300 + lat * side.x - back * f.x, y: 300 + lat * side.y - back * f.y, h };
    if (!R.isWindward(W, L, w) || R.isWindward(L, W, w)) bad++;
  }
  console.log(`• K11 rüzgarüstü/rüzgaraltı ayrımı: ${bad ? bad + ' hatalı durum' : 'doğru'}`);
  if (bad) { problems++; console.log('  ⚠ K11: rüzgaraltı tekne rüzgarüstü sayıldı'); }
}
// Elle sürme: zaman durur, yalnız senin teknen hareket eder. Kafa aç → pupa → kavança → orsa → tramola;
// fazla çekik iskota yavaşlatır; sonra Otomatik (manuel) yarış biter, iskota salıkken hız düşük kalır.
{
  S.setCourse(S.COURSE_DEFAULT);
  const fleet = S.defaultFleet(12), me = fleet.find(b => b.mine), still = fleet.filter(b => !b.mine).map(b => b.x + ',' + b.y).join();
  Object.assign(me, { x: 500, y: 560, h: -45, v: 0, manual: true });
  const ctx = { t: 0, wind: 0, gusts: [], boats: fleet }, evs = [];
  const run = (n, inp) => { for (let i = 0; i < n; i++) evs.push(...S.drive(ctx, me, inp || {}, 0.05)); };
  run(60); const vClose = me.v;
  run(40, { rudder: -1 }); run(20);                         // kafa aç, pupaya
  S.helmTurn(me, 0, 'jibe'); run(50);                       // kavança
  S.helmTurn(me, 0, 'tack'); run(80);                       // tramola (iskele → sancak)
  const vTrim = me.v; run(10, { rudder: -1, autoTrim: false }); run(40, { autoTrim: false });   // iskota salmadan kafa aç
  const vOver = me.v, ok = [
    ['ilerledi', me.y < 560 || me.x !== 500], ['orsada hızlandı', vClose > 40], ['kavança oldu', evs.includes('jibe')], ['tramola oldu', evs.includes('tack')],
    ['fazla çekik yavaş', vOver < vTrim * 0.8], ['diğerleri yerinde', fleet.filter(b => !b.mine).map(b => b.x + ',' + b.y).join() === still],
    ['sayı', [me.x, me.y, me.h, me.v, me.sheet].every(Number.isFinite)]];
  const bad = ok.filter(([, v]) => !v).map(([k]) => k);
  // otomatik: yarış biter; iskota salık teknen daha geç biter
  const race = off => { const f = S.defaultFleet(12); const m = f.find(b => b.mine); m.manual = true; m.sheetOff = off; const s = S.newRace(f, { wind: 0 });
    while (s.t < 160 && s.boats.some(b => !b.finish)) S.step(s); return s.boats.find(b => b.mine); };
  const a = race(0), b2 = race(16);
  if (!a.finish || !b2.finish) bad.push('otomatikte bitirmedi');
  else if (!(b2.finishT > a.finishT)) bad.push('iskota salıkken yavaşlamadı');
  console.log(`• elle sürme: orsa ${(S.knots(vClose)).toFixed(1)} kn, fazla çekik ${S.knots(vOver).toFixed(1)} kn · otomatik bitiş ${a.finishT ? a.finishT.toFixed(1) : '-'} s, iskota salık ${b2.finishT ? b2.finishT.toFixed(1) : '-'} s`);
  if (bad.length) { problems++; console.log('  ⚠ elle sürme:', bad.join(', ')); }
}
console.log(problems ? `\n${problems} uyarı` : '\nSimülatör temiz ✔');
process.exit(problems ? 1 : 0);
