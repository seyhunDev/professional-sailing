// Kaydedilmiş bildirimler birer test: tests/bildirimler/*.json (ya da .md konu metni) yarışı yeniden kurar,
// hata avcısından geçirir. Dosyadaki "expect" alanı (dizi) bilinçli kabul edilen sorunların başlangıç metinleri.
import fs from 'node:fs';
import path from 'node:path';
import { decode, rebuild, inspect } from './report.mjs';
const DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../tests/bildirimler');
const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter(f => /\.(json|md)$/.test(f) && f !== 'README.md').sort() : [];
let problems = 0;
for (const f of files) {
  const rep = decode(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const r = rebuild(rep);
  if (!r) { console.log(`• ${f}: simülatör verisi yok, atlandı`); continue; }
  const ok = rep.expect || [], probs = inspect(r.frames).filter(p => !ok.some(x => p.startsWith(x)));
  console.log(`${probs.length ? '⚠' : '•'} ${f}: ${r.note}${probs.length ? ' · ' + probs.slice(0, 3).join(' | ') : ' · temiz'}`);
  if (probs.length) problems++;
}
console.log(files.length ? (problems ? `\n${problems} bildirimde sorun` : '\nBildirimler temiz ✔') : 'Bildirim testi: tests/bildirimler boş');
process.exit(problems ? 1 : 0);
