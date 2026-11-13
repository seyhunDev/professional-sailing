// Bildirim okuyucu: node scripts/report.mjs <dosya> [--olaylar=80]
// <dosya>: uygulamadaki "Bildirim gönder"in ürettiği .json, ya da GitHub konusunun metni (```velora-report bloğu içeren).
// Yapar: notu, cihazı, hataları ve son işlemleri yazar; simülatör bildiriminde yarışı kurulum + işlemlerden node'da
// AYNEN yeniden kurar (hesap deterministik), bildirimdeki anla karşılaştırır ve yarışı hata avcısından geçirir
// (takılma, şamandıraya çarpma, alan dışı, bitirmeme, sayı olmayan konum). Bulunan sorun bir teste dönüştürülebilir:
// bildirim dosyası tests/bildirimler/ içine konursa `npm run check` onu her seferinde yeniden dener.
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
require('../src/js/engine.js'); require('../src/js/rules.js'); require('../src/js/sim-core.js');
const S = globalThis.SailSim;

export function decode(text) {
  text = text.trim();
  if (text.startsWith('{')) return JSON.parse(text);
  const m = /```velora-report\s*\n([\s\S]*?)```/.exec(text);
  if (!m) throw new Error('velora-report bloğu bulunamadı');
  const body = m[1].trim();
  if (body.startsWith('json:')) return JSON.parse(body.slice(5));
  if (body.startsWith('gz:')) return JSON.parse(zlib.gunzipSync(Buffer.from(body.slice(3).replace(/\s+/g, ''), 'base64')).toString('utf8'));
  return JSON.parse(body);
}

// Hesaplanmış yarışın kareleri üzerinde hata avcısı (fuzz-sim'deki denetimlerin kısa hali)
export function inspect(frames) {
  const out = [], last = frames[frames.length - 1], seen = new Set();
  const add = (k, msg) => { if (!seen.has(k)) { seen.add(k); out.push(msg); } };
  const W = S.WORLD, prog = {};
  for (const f of frames) {
    for (const b of f.boats) {
      if (![b.x, b.y, b.h, b.v].every(Number.isFinite)) add('nan' + b.id, `${b.id}: konum/hız sayı değil (t=${(f.t - f.startAt).toFixed(1)})`);
      if (b.phase === 'race' && (b.x < -60 || b.x > W.w + 60 || b.y < -60 || b.y > W.h + 60)) add('out' + b.id, `${b.id}: alanın dışında (t=${(f.t - f.startAt).toFixed(1)}, ${b.x.toFixed(0)},${b.y.toFixed(0)})`);
      const dm = Math.hypot(b.x - S.MARK.x, b.y - S.MARK.y);
      if (dm < 12 && b.phase !== 'done') add('mark' + b.id, `${b.id}: şamandıraya çarptı (t=${(f.t - f.startAt).toFixed(1)})`);
      // takılma: yarışta 8 sim. sn boyunca şamandıraya 15 px'den az yaklaştı
      if (b.phase === 'race' && f.t > f.startAt) {
        const p = prog[b.id] || (prog[b.id] = []);
        p.push([f.t, dm]);
        while (p.length && f.t - p[0][0] > 8) p.shift();
        if (p.length > 10 && f.t - p[0][0] > 7.9 && p[0][1] - dm < 15) add('stuck' + b.id, `${b.id}: takıldı (8 sn'de ilerlemedi, t=${(f.t - f.startAt).toFixed(1)}, ${b.x.toFixed(0)},${b.y.toFixed(0)})`);
      } else delete prog[b.id];
    }
  }
  for (const b of last.boats) if (!b.finish && !b.dsq && !b.gone) add('fin' + b.id, `${b.id}: bitirmedi (${b.phase})`);
  // temas: iki tekne 30 px'den yakın (start öncesi kalabalık hariç)
  for (const f of frames.filter((_, i) => i % 4 === 0)) {
    if (f.t < f.startAt + 2) continue;
    const r = f.boats.filter(b => b.phase === 'race');
    for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
      const d = Math.hypot(r[i].x - r[j].x, r[i].y - r[j].y);
      if (d < 22) add('hit' + r[i].id + r[j].id, `${r[i].id} ile ${r[j].id} temas (${d.toFixed(0)} px, t=${(f.t - f.startAt).toFixed(1)})`);
    }
  }
  return out;
}

// Bildirimdeki simülatör durumundan yarışı kur
export function rebuild(rep) {
  const sim = rep.state && rep.state.sim;
  if (!sim) return null;
  if (sim.rec) {
    let frames = S.replayRecord(JSON.parse(JSON.stringify(sim.rec)));
    let note = `kayıttan yeniden kuruldu (${sim.rec.ops.length} işlem)`;
    if (sim.drive && sim.drive.live && sim.drive.i != null && sim.drive.path && sim.drive.path.length) {   // elle sürme sürüyordu: o bölümü de oynat
      const i = Math.min(sim.drive.i, frames.length - 1), hf = S.runHand(frames[i], sim.drive.path);
      const end = JSON.parse(JSON.stringify(hf[hf.length - 1])); const m = end.boats.find(b => b.mine);
      if (m) { m.hand = false; m.sheetOff = 0; m.manual = sim.drive.prev ? !!sim.drive.prev.manual : false; }   // uygulamadaki gibi: Elle sür bitince otomatiğe döner
      frames = S.spliceHand(frames, i, hf, end); note += ` + elle sürme (${sim.drive.path.length} adım, sonra otomatik)`;
    }
    return { frames, note };
  }
  if (sim.setup) return { frames: S.runToEnd(S.newRace(JSON.parse(JSON.stringify(sim.setup.fleet)), JSON.parse(JSON.stringify(sim.setup)))), note: 'kurulumdan start verildi (bildirim kurulumdaydı)' };
  return null;
}

function main() {
  const file = process.argv[2];
  if (!file) { console.log('Kullanım: node scripts/report.mjs <bildirim.json | konu-metni.md> [--olaylar=80]'); process.exit(1); }
  const n = +((process.argv.find(a => a.startsWith('--olaylar=')) || '=60').split('=')[1]);
  const rep = decode(fs.readFileSync(file, 'utf8'));
  const d = rep.dev || {};
  console.log(`Bildirim · ${rep.at} · ${rep.page} · ${rep.ver} (${rep.commit}) · ${d.device || ''} ${d.os || ''} ${d.browser || ''} ${d.viewport || ''} ${d.orient || ''}`);
  console.log(`Not: ${rep.note || '(yok)'}`);
  for (const k in rep.state || {}) if (rep.state[k] && rep.state[k].ozet) console.log(`Durum (${k}): ${rep.state[k].ozet}`);
  console.log(`\nHatalar (${(rep.errors || []).length}):`); for (const e of rep.errors || []) console.log(`  ${(e.ts / 1000).toFixed(0)} sn · ${e.kind}: ${e.m}${e.n > 1 ? ` ×${e.n}` : ''}${e.s ? '\n      ' + e.s : ''}`);
  console.log(`\nSon ${Math.min(n, rep.events.length)} işlem:`);
  for (const e of rep.events.slice(-n)) console.log(`  ${(e.ts / 1000).toFixed(1).padStart(7)} sn  ${e.p.padEnd(10)} ${e.type.padEnd(6)} ${JSON.stringify(e.d || {}).slice(0, 110)}`);
  const sim = rep.state && rep.state.sim;
  if (sim) {
    if (sim.simEvents && sim.simEvents.length) { console.log('\nYarış olayları (bildirim anı, start\'a göre sn):'); for (const e of sim.simEvents.slice(-20)) console.log(`  ${String(e.t).padStart(7)}  ${e.text}`); }
    const r = rebuild(rep);
    if (r) {
      const last = r.frames[r.frames.length - 1];
      console.log(`\nYarış ${r.note}: ${r.frames.length} kare, son t=${(last.t - last.startAt).toFixed(1)} sn`);
      if (sim.rec && sim.mine && sim.frame != null && !sim.drive) {
        const f = r.frames[Math.min(sim.frame, r.frames.length - 1)], m = f.boats.find(b => b.mine);
        const dd = m ? Math.hypot(m.x - sim.mine.x, m.y - sim.mine.y) : -1;
        console.log(`Bildirim anında teknen: bildirimde (${sim.mine.x},${sim.mine.y}) ${sim.mine.phase} · yeniden kurulan (${m.x.toFixed(1)},${m.y.toFixed(1)}) ${m.phase} → ${dd < 1 ? 'AYNI' : 'FARKLI (' + dd.toFixed(1) + ' px: sürüm farkı ya da deterministik olmayan hesap)'}`);
      }
      const probs = inspect(r.frames);
      console.log(probs.length ? `\nHata avcısı ${probs.length} sorun buldu:\n  ` + probs.slice(0, 20).join('\n  ') : '\nHata avcısı: sorun yok');
      console.log('\nSıralama: ' + S.standings(last).map(x => `${x.b.id}${x.b.finish ? '' : '(' + x.b.phase + ')'}`).join(' '));
    }
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) main();
