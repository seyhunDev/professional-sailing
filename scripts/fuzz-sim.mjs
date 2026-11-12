// Simülatör hata avcısı: node scripts/fuzz-sim.mjs [adet] [-v]
// Rastgele yerleşim / rüzgar / sağanak ile yarışlar koşar ve her teknede şunları arar:
//  - YANLIŞ_TARAF: şamandırayı dönerken şamandıra teknenin sancağında (iskeleden dönülmeli)
//  - ALTINDAN: şamandıranın seviyesine (rüzgar ekseninde) hiç çıkmadan "döndü" sayıldı
//  - ÇARPTI: şamandıraya 12 px'den fazla yaklaştı
//  - BİTMEDİ: 150 s içinde bitiremedi · TAKILDI: yarışta 8 s boyunca neredeyse hiç ilerlemedi
//  - ALAN_DIŞI: yarışırken alanın dışına çıktı
//  - HAT_DIŞI: start hattını uçların arasından geçmeden bitirdi
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
require('../src/js/engine.js'); require('../src/js/rules.js'); require('../src/js/sim-core.js');
const E = globalThis.SailEngine, S = globalThis.SailSim;
const N = +(process.argv.find(a => /^\d+$/.test(a)) || 60), verbose = process.argv.includes('-v');
const traceArg = process.argv.find(a => a.startsWith('--iz=')); const [traceK, traceId] = traceArg ? traceArg.slice(5).split(':') : [];   // --iz=15:6 → yarış 15, tekne 6
let seed = 12345; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const counts = {}; const samples = {};
const stat = { protest: 0, penalty: 0, done: 0, why: {} };
const hit = (kind, msg) => { counts[kind] = (counts[kind] || 0) + 1; (samples[kind] = samples[kind] || []).length < 4 && samples[kind].push(msg); };
for (let k = 0; k < N; k++) {
  const n = 4 + Math.floor(rnd() * 12);
  const fleet = S.defaultFleet(n);
  const wind = Math.round((rnd() - 0.5) * 70);   // ±35°
  // rastgele yerleşim: hattın altında 0-400 px, hat boyunca ±150 px taşma; bazen kontra iskele
  for (const b of fleet) {
    if (rnd() < 0.6) { b.x = 150 + rnd() * 700; b.y = S.LINE.pin.y + 40 + rnd() * 120; }
    if (b.mine || rnd() < 0.15) b.y += rnd() * 280;
    b.y = Math.min(S.WORLD.h - 20, b.y);
    if (rnd() < 0.15) b.tack = 'port';
  }
  if (k % 3 === 0) fleet[k % n].ignoresRules = true;
  if (k % 4 === 1) {                                    // senin teknene rastgele rota (seed dizisini bozmamak için ayrı üreteç)
    let q = k * 7919 + 1; const r2 = () => (q = (q * 48271) % 2147483647) / 2147483647;
    const nr = 2 + Math.floor(r2() * 3);
    fleet.find(b => b.mine).route = Array.from({ length: nr }, (_, i) => ({ x: 120 + r2() * 760, y: 680 - (i + 1) * (560 / nr) + r2() * 60 }));
  }     // her 3 yarıştan birinde bir "yol vermez" tekne
  const gusts = rnd() < 0.5 ? [{ x: rnd() < 0.5 ? 230 : 770, y: 250 + rnd() * 300, rx: 120, ry: 190 }] : [];
  const s = S.newRace(fleet, { wind, gusts });
  const shiftAt = rnd() < 0.5 ? 15 + rnd() * 20 : -1, shiftTo = wind + Math.round((rnd() - 0.5) * 30);
  const tr = {};
  for (const b of s.boats) tr[b.id] = { maxAbove: -1e9, wrong: 0, minMark: 1e9, prog: [], out: false, flagged: {} };
  const tag = `#${k} n=${n} rüzgar=${wind}${shiftAt > 0 ? '→' + shiftTo : ''}${gusts.length ? ' sağanak' : ''}`;
  while (s.t < 150 && s.boats.some(b => !b.finish)) {
    if (shiftAt > 0 && Math.abs(s.t - shiftAt) < 0.026) s.wind = shiftTo;
    const before = new Map(s.boats.map(b => [b.id, b.phase]));
    S.step(s);
    const w = s.wind, up = E.fwd(w);
    if (traceArg && String(k) === traceK) { const b = s.boats.find(x => x.id === traceId); if (b && Math.round(s.t * 20) % 5 === 0) console.log(s.t.toFixed(2), b.phase, b.tack, 'st', b.started, 'h', b.h.toFixed(0), 'v', b.v.toFixed(0), 'man', b.man, b.escH, (b.x).toFixed(0), (b.y).toFixed(0)); }
    for (const b of s.boats) {
      if (b.gone) continue;
      const T = tr[b.id], rel = { x: b.x - S.MARK.x, y: b.y - S.MARK.y };
      if (b.phase === 'race' || b.phase === 'round') T.maxAbove = Math.max(T.maxAbove, rel.x * up.x + rel.y * up.y);
      const d = Math.hypot(rel.x, rel.y);
      if (b.phase !== 'done' && d < T.minMark) { T.minMark = d; T.minInfo = `${b.phase} ${b.tack} h${b.h.toFixed(0)} man=${b.man} t=${s.t.toFixed(1)}`; }
      if (b.phase === 'round' && d < 70) {
        const left = E.fwd(b.h - 90);
        if (-(rel.x * left.x + rel.y * left.y) < -4) T.wrong++;      // şamandıra sağda (sancakta)
      }
      if (before.get(b.id) !== 'done' && b.phase === 'done' && T.maxAbove < -8 && !T.flagged.alt) { T.flagged.alt = 1; hit('ALTINDAN', `${tag} ${b.id}${b.mine ? '(sen)' : ''} en yüksek ${T.maxAbove.toFixed(0)} px`); }
      if (before.get(b.id) !== 'penalty' && b.phase === 'penalty') { stat.penalty++; T.penStart = s.t; }
      if (before.get(b.id) === 'penalty' && b.phase !== 'penalty') stat.done++;
      if (b.phase === 'penalty' && s.t - T.penStart > 20 && !T.flagged.pen) { T.flagged.pen = 1; hit('CEZA_TAKILDI', `${tag} ${b.id} (${b.x.toFixed(0)},${b.y.toFixed(0)}) t=${s.t.toFixed(1)}`); }
      if (b.phase === 'race') {
        T.prog.push({ t: s.t, x: b.x, y: b.y }); while (T.prog.length && T.prog[0].t < s.t - 8) T.prog.shift();
        if (T.prog.length > 150 && Math.hypot(b.x - T.prog[0].x, b.y - T.prog[0].y) < 25 && !T.flagged.stuck) { T.flagged.stuck = 1; hit('TAKILDI', `${tag} ${b.id} (${b.x.toFixed(0)},${b.y.toFixed(0)}) t=${s.t.toFixed(1)}`); }
        if ((b.x < -30 || b.x > S.WORLD.w + 30 || b.y < -40 || b.y > S.WORLD.h + 30) && !T.out) { T.out = true; hit('ALAN_DIŞI', `${tag} ${b.id} (${b.x.toFixed(0)},${b.y.toFixed(0)}) ${b.persona}`); }
      }
    }
  }
  for (const e of s.events) if (e.kind === "protest") { stat.protest++; const m = e.text.match(/K(\d+) ihlali \(([^)]*)\)/); if (m) stat.why[m[1] + " " + m[2]] = (stat.why[m[1] + " " + m[2]] || 0) + 1; }
  for (const b of s.boats) {
    const T = tr[b.id];
    if (T.wrong > 6) hit('YANLIŞ_TARAF', `${tag} ${b.id}${b.mine ? '(sen)' : ''} ${T.wrong} kare`);
    if (T.minMark < 12) hit('ÇARPTI', `${tag} ${b.id} ${T.minMark.toFixed(0)} px · ${T.minInfo}`);
    if (b.finish && !b.started) hit('HAT_DIŞI', `${tag} ${b.id} start hattını geçmeden bitirdi`);
    if (b.finish && b.penaltyAt != null) hit('CEZA_ATILMADI', `${tag} ${b.id} cezasını atmadan bitirdi`);
    if (!b.finish) hit('BİTMEDİ', `${tag} ${b.id} ${b.phase} (${b.x.toFixed(0)},${b.y.toFixed(0)})`);
  }
}
const total = Object.values(counts).reduce((a, b) => a + b, 0);
console.log(`${N} yarış · ${total} sorun · ${stat.protest} protesto · ${stat.penalty} ceza turu (${stat.done} tamamlandı)`);
for (const [k, c] of Object.entries(counts)) { console.log(`  ${k}: ${c}`); for (const m of samples[k]) console.log('     ', m); }
if (process.argv.includes("--protesto")) console.log(stat.why);
process.exit(total ? 1 : 0);
