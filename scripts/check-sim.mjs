// Simülatör denetimi: node scripts/check-sim.mjs
// Varsayılan filo birkaç rüzgar / sağanak durumunda yarışır; herkes bitirmeli,
// tekneler alan dışına çıkmamalı, temas sayısı az olmalı.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
require('../src/js/engine.js'); require('../src/js/rules.js'); require('../src/js/sim-core.js');
const S = globalThis.SailSim, EN = globalThis.SailEngine;
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
  while (s.t < s.startAt + 142 && s.boats.some(b => !b.finish)) {
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
  while (s.t < s.startAt + 112 && s.boats.some(b => !b.finish)) {
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
// Start'tan önce hat: manuel olmayan teknenin burnu hiç hattı geçmez (yalnız manuel / elle sürülen geçebilir)
{
  const E = globalThis.SailEngine;
  let over = 0, worst = 0;
  for (const wind of [-15, 0, 12]) for (const boat of [null, { cls: 'ilca7', windKn: 18, accelAt: 10 }]) {
    S.setCourse(S.COURSE_DEFAULT);
    const f = S.defaultFleet(12); f.forEach((b, i) => { if (i % 2) b.y = S.LINE.pin.y + 14; });   // yarısı hattın dibinde
    const s = S.newRace(f, { wind, boat }); const P = S.LINE.pin, Q = S.LINE.boat, L = Math.hypot(Q.x - P.x, Q.y - P.y);
    while (s.t < s.startAt - 0.05) {
      S.step(s);
      for (const b of s.boats) { const fw = E.fwd(b.h), bx = b.x + fw.x * 24, by = b.y + fw.y * 24;
        const sd = ((Q.x - P.x) * (by - P.y) - (Q.y - P.y) * (bx - P.x)) / L; if (sd < -1) { over++; worst = Math.min(worst, sd); } }
    }
  }
  console.log(`• start'tan önce hat: burnu hattı geçen kare ${over}${over ? ` (en çok ${(-worst).toFixed(0)} px)` : ''}`);
  if (over) { problems++; console.log('  ⚠ start\'tan önce tekne burnu hattı geçti'); }
}
// Elle sürme: kalabalık ön sırada (varsayılan filo) teknen orsaya dönüp iskotayı çekince komşusuna takılmadan çıkabilmeli
{
  S.setCourse(S.COURSE_DEFAULT);
  const f = S.defaultFleet(12), me = f.find(b => b.mine), x0 = me.x, y0 = me.y;
  f.forEach(b => { b.h = b.tack === 'starboard' ? -25 : 25; });
  Object.assign(me, { h: -45, v: 0, sheetOff: S.SHEET_OFF_MAX, manual: true });
  const ctx = { t: 0, wind: 0, gusts: [], boats: f };
  for (let i = 0; i < 20; i++) S.drive(ctx, me, {}, 0.05);
  const slow = me.v; me.sheetOff = 0;
  for (let i = 0; i < 60; i++) S.drive(ctx, me, {}, 0.05);
  const moved = Math.hypot(me.x - x0, me.y - y0);
  console.log(`• elle sürme kalabalıkta: yelken boşken ${S.knots(slow).toFixed(1)} kn, çekince ${S.knots(me.v).toFixed(1)} kn, ${(moved / 50).toFixed(1)} boy ilerledi`);
  if (moved < 50 || me.v < 30 || slow > 15) { problems++; console.log('  ⚠ elle sürme: kalabalıkta iskota çekince ilerlemedi'); }
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
    while (s.t < s.startAt + 152 && s.boats.some(b => !b.finish)) S.step(s); return s.boats.find(b => b.mine); };
  const a = race(0), b2 = race(16);
  if (!a.finish || !b2.finish) bad.push('otomatikte bitirmedi');
  else if (!(b2.finishT > a.finishT)) bad.push('iskota salıkken yavaşlamadı');
  console.log(`• elle sürme: orsa ${(S.knots(vClose)).toFixed(1)} kn, fazla çekik ${S.knots(vOver).toFixed(1)} kn · otomatik bitiş ${a.finishT ? a.finishT.toFixed(1) : '-'} s, iskota salık ${b2.finishT ? b2.finishT.toFixed(1) : '-'} s`);
  if (bad.length) { problems++; console.log('  ⚠ elle sürme:', bad.join(', ')); }
}
// Yarış kaydı (sim-records.js): kayıt kurulum + işlemleri saklar, tekrar oynatınca yarış birebir aynı çıkmalı.
// Bu yüzden hesap deterministik olmalı ve kurulum JSON'dan geçince aynı sonucu vermeli.
{
  const sig = f => JSON.stringify(f[f.length - 1].boats.map(b => [b.id, Math.round(b.x * 1e6), Math.round(b.y * 1e6), b.finish, b.penalties]));
  const run = fleet => {
    const opts = { wind: 5, gusts: [{ x: 300, y: 450, rx: 120, ry: 190 }], boat: { cls: 'ilca6', windKn: 12, accelAt: 30 } };
    let fr = S.runToEnd(S.newRace(fleet, opts));
    for (const [i, fn] of [[150, r => S.command(r, 'tack')], [250, r => { r.wind += 10; }], [350, r => S.command(r, 'persona', 'sag', '3')]]) {
      const k = Math.min(i, fr.length - 1), base = S.clone(fr[k]); fn(base); fr = fr.slice(0, k).concat(S.runToEnd(base));
    }
    // elle sürme: donmuş kopyada sür, kayda o karenin JSON kopyası girer
    const k = Math.min(420, fr.length - 1), d = S.clone(fr[k]), m = d.boats.find(b => b.mine);
    if (S.drive && ['wait', 'race', 'ocs'].includes(m.phase)) { m.manual = true; for (let j = 0; j < 30; j++) S.drive(d, m, { rudder: j < 10 ? -1 : 0, autoTrim: true }, 0.05); }
    fr = fr.slice(0, k).concat(S.runToEnd(JSON.parse(JSON.stringify(d))));
    return sig(fr);
  };
  S.setCourse(S.COURSE_DEFAULT);
  const f0 = S.defaultFleet(12), a = run(f0), b = run(JSON.parse(JSON.stringify(S.defaultFleet(12))));
  console.log(`• yarış kaydı tekrar oynatma: ${a === b ? 'birebir aynı' : 'FARKLI'}`);
  if (a !== b) { problems++; console.log('  ⚠ kayıttan tekrar oynatılan yarış farklı çıktı (deterministik değil)'); }
}
// Canlı elle sürme (yarışta): herkes aynı zamanda ilerler, teknen diğerlerinden hızlı gitmez (eskiden zaman donuyor,
// teknen tek başına ilerleyip öne fırlıyordu). Kayıttan tekrar oynatınca (yol + bitiş durumu) sonuç aynı çıkmalı.
{
  S.setCourse(S.COURSE_DEFAULT);
  const fr = S.runToEnd(S.newRace(S.defaultFleet(12), { wind: 0 }));
  const k = fr.findIndex(f => f.t >= f.startAt + 3), auto = fr[Math.min(fr.length - 1, k + 100)];   // 10 sim. sn sonra (otomatik)
  const s = S.clone(fr[k]), m = s.boats.find(b => b.mine), path = [];
  Object.assign(m, { manual: true, route: null, sheet: null, hand: true });
  const pos0 = Object.fromEntries(s.boats.map(b => [b.id, [b.x, b.y]]));
  for (let i = 0; i < 200 && m.hand; i++) S.handStep(s, m, { autoTrim: true }, path);
  const adv = b => pos0[b.id][1] - b.y;                       // rüzgarüstüne ilerleme (px)
  const others = s.boats.filter(b => !b.mine), avg = others.reduce((a, b) => a + adv(b), 0) / others.length;
  const autoMe = auto.boats.find(b => b.mine), autoAdv = pos0.SEN[1] - autoMe.y;
  const bad = [];
  if (!(avg > 40)) bad.push('diğer tekneler ilerlemedi');
  if (adv(m) > Math.max(autoAdv, avg) * 1.35 + 20) bad.push(`teknen öne fırladı (${adv(m).toFixed(0)} px, otomatikte ${autoAdv.toFixed(0)} px)`);
  if (Math.abs(s.t - (fr[k].t + 10)) > 0.06) bad.push('zaman ilerlemedi');
  const rows = S.runHand(fr[k], path);
  if (rows.length !== 101) bad.push(`tekrar oynatma kare sayısı ${rows.length}`);
  const hm = rows[rows.length - 1].boats.find(b => b.mine);
  if (Math.hypot(hm.x - m.x, hm.y - m.y) > 2) bad.push('tekrar oynatmada teknen başka yerde');
  console.log(`• canlı elle sürme: 10 sim. sn'de teknen ${(adv(m) / 50).toFixed(1)} boy, diğerleri ort. ${(avg / 50).toFixed(1)} boy, otomatikte teknen ${(autoAdv / 50).toFixed(1)} boy`);
  if (bad.length) { problems++; console.log('  ⚠ canlı elle sürme:', bad.join(', ')); }
}
// Üstüne gelen tekneye takılma: iç içe başlayan teknen öbürünün içinden çıkabilmeli; normal temasta durur; alan sınırını aşamaz
{
  S.setCourse(S.COURSE_DEFAULT);
  const f = S.defaultFleet(2), me = f.find(b => b.mine), o = f.find(b => !b.mine), bad = [];
  Object.assign(me, { x: 500, y: 450, h: 45, v: 40, manual: true, phase: 'race' }); Object.assign(o, { x: 505, y: 445, h: 45, v: 0, phase: 'wait' });
  const ctx = { t: 0, wind: 0, gusts: [], boats: [me, o] };
  for (let i = 0; i < 100; i++) S.drive(ctx, me, { autoTrim: true }, 0.05);
  if (Math.hypot(me.x - 500, me.y - 450) < 40) bad.push('iç içe teknede takıldı');
  Object.assign(me, { x: 500, y: 450, h: 0, v: 40 }); Object.assign(o, { x: 500, y: 380, h: 0 });
  for (let i = 0; i < 60; i++) S.drive(ctx, me, { autoTrim: true }, 0.05);
  if (me.y < 380 + 30) bad.push('normal temasta öbür teknenin içinden geçti');
  Object.assign(me, { x: 500, y: 0, h: 0, v: 60 }); o.y = 2000;
  for (let i = 0; i < 400; i++) S.drive(ctx, me, { autoTrim: true }, 0.05);
  const Bd = S.bounds(); if (me.y < Bd.y0 - 0.01) bad.push('alan sınırını aştı');
  console.log(`• elle sürme temas / alan sınırı: ${bad.length ? 'SORUN' : 'iç içeyken çıkıyor, temasta duruyor, sınırda kalıyor'}`);
  if (bad.length) { problems++; console.log('  ⚠ temas:', bad.join(', ')); }
}
// Orsa (VMG) düğmesi: apazdan ya da pupadan bu kontrada orsa rotasına girer, rüzgar dönünce de orsada kalır
{
  S.setCourse(S.COURSE_DEFAULT);
  const f = S.defaultFleet(2), me = f.find(b => b.mine), bad = [];
  Object.assign(me, { x: 500, y: 450, h: 150, v: 40, manual: true });
  const ctx = { t: 0, wind: 0, gusts: [], boats: [me] };
  for (let i = 0; i < 80; i++) S.drive(ctx, me, { hold: 'orsa', autoTrim: true }, 0.05);
  if (Math.abs(EN.norm180(me.h - 45)) > 2) bad.push(`pupadan orsaya girmedi (${me.h.toFixed(0)}°)`);
  ctx.wind = 10; for (let i = 0; i < 40; i++) S.drive(ctx, me, { hold: 'orsa', autoTrim: true }, 0.05);
  if (Math.abs(EN.norm180(me.h - 55)) > 2) bad.push('rüzgar dönünce orsada kalmadı');
  console.log(`• Orsa (VMG): pupadan orsaya ${bad.length ? 'SORUN' : 'girdi, rüzgar dönünce de kaldı'}`);
  if (bad.length) { problems++; console.log('  ⚠ Orsa:', bad.join(', ')); }
}
// Start bayrakları (5-4-1): son dakikada hattın üstündeki tekne P → OCS döner, I → uçtan dolaşır, Z → %20, U/Siyah → UFD/BFD
{
  const bad = [], want = { P: b => !b.dsq && !b.zPen && b.finish, I: b => b.iDone && b.finish, Z: b => b.zPen && b.finish, U: b => b.dsq === 'UFD', Siyah: b => b.dsq === 'BFD' };
  for (const flag of Object.keys(want)) {
    S.setCourse(S.COURSE_DEFAULT);
    const fleet = S.defaultFleet(12), b3 = fleet.find(b => b.id === '3'); b3.x = 430; b3.y = S.LINE.pin.y - 120;
    const s = S.newRace(fleet, { wind: 0, course: { ...S.COURSE_DEFAULT, flag } });
    while (s.t < s.startAt + 152 && s.boats.some(b => !b.finish)) S.step(s);
    const b = s.boats.find(o => o.id === '3');
    if (!want[flag](b)) bad.push(`${flag}: 3 numara beklenen sonucu almadı`);
    if (s.boats.some(o => o.id !== '3' && (o.dsq || o.zPen || o.iDone))) bad.push(`${flag}: başka tekne cezalandı`);
    if (s.boats.some(o => !o.finish)) bad.push(`${flag}: bitirmeyen var`);
    const sig = s.events.filter(e => e.kind === 'flag').length;
    if (sig !== 4) bad.push(`${flag}: ${sig} işaret (4 olmalı)`);
  }
  console.log(`• Start bayrakları (P/I/Z/U/Siyah): ${bad.length ? 'SORUN' : 'işaretler ve cezalar doğru'}`);
  if (bad.length) { problems++; console.log('  ⚠ Bayrak:', bad.join(', ')); }
}
// Tramola düğmesi (otomatik teknede): taktik kalıcı olarak değişmez, tekne bir süre sonra yine kendi kararını verir
{
  S.setCourse(S.COURSE_DEFAULT);
  const fleet = S.defaultFleet(12), s = S.newRace(fleet, { wind: 0 }), bad = [];
  while (s.t < s.startAt + 6) S.step(s);
  const me = s.boats.find(b => b.mine), p0 = me.persona, t0 = me.tack;
  S.command(s, 'tack');
  if (me.tack === t0) bad.push('tramola atmadı');
  if (me.persona !== p0) bad.push(`taktik değişti (${p0} → ${me.persona})`);
  const hold = s.t; let own = 0;
  while (s.t < hold + 40 && !me.finish) { const k = me.tack; S.step(s); if (me.tack !== k) own++; }
  if (me.persona !== p0) bad.push('taktik sonradan değişti');
  if (!own && !me.finish) bad.push('40 sn boyunca hiç kendi tramolasını atmadı');
  console.log(`• Tramola düğmesi (otomatik): ${bad.length ? 'SORUN' : `taktik korunuyor (${p0}), sonra kendi ${own} tramola`}`);
  if (bad.length) { problems++; console.log('  ⚠ Tramola:', bad.join(', ')); }
}
// Ayar kombinasyonları: arayüzde seçilebilen uç değerler birlikte (16 tekne, en hızlı / en yavaş sınıf, en kısa / en uzun
// parkur, en güçlü akıntı ve dalga, iki sağanak, ±40° rüzgar, her bayrak, yol vermez tekne). Hiçbiri takılmamalı:
// herkes bitirmeli (ya da diskalifiye), konum sayı kalmalı, hesap bir yarış için makul sürede bitmeli.
{
  const bad = [], CLS = Object.keys(S.CLASSES), FLAGS = ['P', 'I', 'Z', 'U', 'Siyah'];
  const COURSES = [{ lineLen: 200, markDist: 400 }, { lineLen: 1000, markDist: 1500 }, { lineLen: 1000, markDist: 400 }, { lineLen: 200, markDist: 1500 }];
  let q = 777; const r = () => (q = (q * 48271) % 2147483647) / 2147483647;
  let worst = 0, n = 0;
  for (let k = 0; k < 24; k++) {
    const course = { ...COURSES[k % 4], flag: FLAGS[k % 5] };
    S.setCourse(course);
    const size = k % 3 === 0 ? 16 : 2 + Math.floor(r() * 14), fleet = S.defaultFleet(size);
    if (k % 2) fleet[1].ignoresRules = true;
    if (k % 4 === 3) fleet.find(b => b.mine).manual = true;
    fleet.forEach((b, i) => { if (i % 5 === 2) b.speedK = 0.9; if (i % 5 === 4) b.speedK = 1.1; if (i % 7 === 3) b.drift = 2; });
    const boat = { cls: CLS[k % CLS.length], windKn: S.WIND_KN[(k * 3) % S.WIND_KN.length], accelAt: S.ACCEL_AT[k % S.ACCEL_AT.length], pre: S.PRE_SEC[k % S.PRE_SEC.length] };
    const wind = [-40, 40, 0, -20, 25][k % 5];
    const gusts = k % 2 ? [{ x: S.WORLD.w * 0.25, y: S.WORLD.h * 0.45, rx: 300, ry: 470 }, { x: S.WORLD.w * 0.75, y: S.WORLD.h * 0.35, rx: 48, ry: 76 }] : [];
    const sea = { current: k % 4, waves: k % 3 };
    const t0 = Date.now();
    const frames = S.runToEnd(S.newRace(fleet, { wind, gusts, course, sea, boat }));
    const ms = Date.now() - t0; worst = Math.max(worst, ms); n++;
    const last = frames[frames.length - 1];
    const tag = `#${k} ${size} tekne ${boat.cls} ${boat.windKn} kn rüzgar ${wind}° parkur ${course.lineLen}/${course.markDist} bayrak ${course.flag} akıntı ${sea.current} dalga ${sea.waves}`;
    const left = last.boats.filter(b => !b.finish && !b.dsq);
    if (left.length) bad.push(`${tag}: ${left.length} tekne bitirmedi (${left.map(b => b.id + ':' + b.phase).join(' ')})`);
    if (last.boats.some(b => !Number.isFinite(b.x) || !Number.isFinite(b.y) || !Number.isFinite(b.h))) bad.push(`${tag}: konum sayı değil`);
    if (ms > 4000) bad.push(`${tag}: hesap ${ms} ms`);
  }
  S.setCourse(S.COURSE_DEFAULT);
  console.log(`• Ayar kombinasyonları (${n} uç kurulum): ${bad.length ? 'SORUN' : `hepsi bitti, en uzun hesap ${worst} ms`}`);
  if (bad.length) { problems++; bad.slice(0, 5).forEach(x => console.log('  ⚠', x)); }
}
console.log(problems ? `\n${problems} uyarı` : '\nSimülatör temiz ✔');
process.exit(problems ? 1 : 0);
