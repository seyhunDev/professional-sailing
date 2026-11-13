// Tarayıcı duman testi: node scripts/smoke.mjs [--shots=klasör]
// Gerçek tarayıcıda (Playwright + Chromium) sayfaları açar, temel akışları dener ve sayfa hatası arar.
// Playwright depoya bağımlılık olarak EKLENMEDİ (CLAUDE.md: bağımlılık eklemeden önce sor); bilgisayarda kurulu
// değilse test atlanır. `npm run check` (node testleri) her yayında çalışır; bu test geliştirme sırasında elle.
//  - Senaryolar: her senaryo açılır, sona sarılır, oynatılır; sayfa hatası olmamalı
//  - Simülatör: kurulum → Start → rüzgar art arda (tek hesap) → Elle sür / çık (Manuel eski haline döner)
//    → kalıcı kayıt yalnız yerleşimi taşır → "Ayarlar varsayılana" rozeti → çizimde yapay hata, döngü sürer
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { console.log('Playwright yok, duman testi atlandı (npm i -D playwright ile kurulabilir)'); process.exit(0); }

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../src');
const shotsArg = process.argv.find(a => a.startsWith('--shots=')); const SHOTS = shotsArg && shotsArg.slice(8);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const server = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
await new Promise(ok => server.listen(0, ok));
const BASE = `http://localhost:${server.address().port}`;

let problems = 0;
const ok = (cond, msg) => { console.log(`${cond ? '•' : '⚠'} ${msg}`); if (!cond) problems++; };
const browser = await chromium.launch();
async function page(vp = { width: 1400, height: 800 }) {
  const ctx = await browser.newContext({ viewport: vp });
  // sahip hesabı: elle sürme ve kayıtlar açık; dışarıya istek gitmesin
  await ctx.addInitScript(() => { if (!localStorage.getItem('ps.account.v1')) localStorage.setItem('ps.account.v1', JSON.stringify({ role: 'sahip', name: 'Test', uid: 'smoke' })); localStorage.setItem('ps.consent.v1', 'false'); });
  await ctx.route(u => !u.href.startsWith(BASE), r => r.abort());
  const p = await ctx.newPage(); p.errors = [];
  p.on('pageerror', e => p.errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) p.errors.push(m.text()); });
  return p;
}
const shot = async (p, name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, name) }); } };

// ---------- Senaryolar ----------
{
  const p = await page();
  await p.goto(BASE + '/index.html'); await p.waitForTimeout(600);
  const ids = await p.evaluate(() => window.SCENARIOS.map(s => s.id));
  const bad = [];
  for (const id of ids) {
    await p.evaluate(i => { location.hash = i; }, id); await p.waitForTimeout(120);
    await p.evaluate(() => { const sc = document.getElementById('scrub'); sc.value = sc.max; sc.dispatchEvent(new Event('input', { bubbles: true })); });
    await p.waitForTimeout(60);
    if (p.errors.length) { bad.push(`${id}: ${p.errors[0]}`); p.errors.length = 0; }
  }
  await p.evaluate(() => { location.hash = window.SCENARIOS[0].id; }); await p.waitForTimeout(150);
  await p.click('#btnPlay'); await p.waitForTimeout(700);
  const t = await p.$eval('#scrub', e => +e.value);
  ok(!bad.length && t > 0, `senaryolar: ${ids.length} senaryo açıldı ve sona sarıldı, oynatma ilerliyor${bad.length ? ' · ' + bad.slice(0, 3).join(' | ') : ''}`);
  await shot(p, 'senaryo.png');
  await p.context().close();
}

// ---------- Simülatör ----------
{
  const p = await page();
  const cat = async c => { const sel = `#catRail [data-cat="${c}"]`; if (!(await p.$eval(sel, e => e.classList.contains('on')))) await p.click(sel); await p.waitForTimeout(80); };
  const mine = () => p.evaluate(() => { const d = JSON.parse(localStorage.getItem('ps.sim.setup.v1') || 'null'); return d; });
  await p.goto(BASE + '/sim.html'); await p.waitForTimeout(700);
  ok(!p.errors.length, `simülatör açıldı${p.errors.length ? ': ' + p.errors[0] : ''}`);

  // kurulumda zorlaştıran ayarlar: rüzgar, sağanak → rozet görünür
  await cat('wind'); await p.click('#btnWindR'); await p.click('#btnWindR');
  await cat('gust'); await p.click('#btnGustL'); await p.waitForTimeout(200);
  const badge = await p.$eval('#btnResetSet', e => !e.classList.contains('hidden') && e.textContent);
  ok(!!badge && /2/.test(badge), `değişmiş ayar rozeti: "${badge}"`);
  await shot(p, 'sim-rozet.png');

  // yeniden açılış: yalnız yerleşim gelir (rüzgar ve sağanak gelmez)
  const saved = await mine();
  ok(saved && saved.wind === undefined && saved.gusts === undefined && saved.fleet.length >= 2, 'kalıcı kayıt yalnız yerleşimi tutuyor');
  await p.reload(); await p.waitForTimeout(700);
  const after = await p.evaluate(() => [document.getElementById('windVal').textContent, document.getElementById('btnResetSet').classList.contains('hidden')]);
  ok(after[0] === '0°' && after[1], `yeniden açılışta rüzgar ${after[0]}, rozet ${after[1] ? 'yok' : 'VAR'}`);

  // rozet: bir ayar değiştir, rozete bas → varsayılan
  await cat('wind'); await p.click('#btnWindL'); await p.waitForTimeout(100);
  await p.click('#btnResetSet'); await p.waitForTimeout(150);
  ok(await p.$eval('#windVal', e => e.textContent) === '0°', 'rozete basınca rüzgar varsayılana döndü');

  // Elle sür (kurulum) → çık: Manuel kalıcı olmaz
  await p.keyboard.press('d'); await p.waitForTimeout(300);
  await p.click('#hpGo'); await p.waitForTimeout(300);
  ok(!(await p.$eval('#btnManual', e => e.classList.contains('on'))), 'kurulumda elle sürdükten sonra Manuel kapalı');

  // Start → rüzgar art arda: yön hemen görünür, yarış bir kez yeniden hesaplanır
  await p.click('#btnPlay'); await p.waitForTimeout(900);
  const w0 = await p.$eval('#windVal', e => parseInt(e.textContent));
  await cat('wind'); for (let i = 0; i < 4; i++) await p.click('#btnWindR');
  const wNow = await p.$eval('#windVal', e => parseInt(e.textContent));
  await p.waitForTimeout(800);
  const evs = await p.$$eval('#events li', l => l.map(x => x.textContent).filter(t => /Rüzgar .*döndü/.test(t)));
  ok(wNow === (w0 + 20) % 360 && evs.length === 1, `yarışta 4 kez rüzgar: gösterge ${w0}° → ${wNow}°, ${evs.length} yeniden hesap`);

  // yarışta elle sür → çık
  await p.keyboard.press('d'); await p.waitForTimeout(1200);
  await shot(p, 'sim-elle.png');
  await p.click('#hpGo'); await p.waitForTimeout(400);
  ok(!(await p.$eval('#btnManual', e => e.classList.contains('on'))), 'yarışta elle sürdükten sonra Manuel kapalı (tekne kendi tramolasını atar)');

  // yapay çizim hatası: döngü durmamalı
  await p.evaluate(() => { const o = SVGElement.prototype.setAttribute; let n = 0; SVGElement.prototype.setAttribute = function (...a) { if (n++ === 40) throw new Error('duman testi yapay hata'); return o.apply(this, a); }; });
  const c0 = await p.$eval('#countBar', e => e.textContent + document.getElementById('course').innerHTML.length);
  await p.waitForTimeout(1200);
  const toastTxt = await p.$eval('#toast', e => e.textContent);
  const c1 = await p.$eval('#countBar', e => e.textContent + document.getElementById('course').innerHTML.length);
  ok(/sorun/.test(toastTxt) && c0 !== c1, 'çizimde hata olunca animasyon sürüyor ve uyarı çıkıyor');
  p.errors = p.errors.filter(e => !/yapay hata|kare hatası/.test(e));
  ok(!p.errors.length, `simülatörde beklenmeyen hata yok${p.errors.length ? ': ' + p.errors.slice(0, 2).join(' | ') : ''}`);
  await p.context().close();
}

// ---------- Telefon (yatay) ----------
{
  const p = await page({ width: 844, height: 390 });
  await p.goto(BASE + '/sim.html'); await p.waitForTimeout(600);
  await p.click('#btnPlay'); await p.waitForTimeout(600);
  const over = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  ok(!over && !p.errors.length, `yatay telefonda simülatör: taşma ${over ? 'VAR' : 'yok'}${p.errors.length ? ', hata: ' + p.errors[0] : ''}`);
  await shot(p, 'telefon.png');
  await p.context().close();
}

await browser.close(); server.close();
console.log(problems ? `\n${problems} sorun` : '\nDuman testi temiz ✔');
process.exit(problems ? 1 : 0);
