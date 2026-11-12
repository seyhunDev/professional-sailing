// Derleme: src/ → dist/. CSS/JS dosyalarını içerik özetiyle (hash) yeniden adlandırır,
// index.html içindeki bağlantıları günceller ve sürüm bilgisini yazar.
// Kullanım: node scripts/build.mjs
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname, basename, extname } from 'node:path';
import { execSync } from 'node:child_process';

const SRC = 'src', DIST = 'dist';
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

// 1) her şeyi kopyala
cpSync(SRC, DIST, { recursive: true });

// 2) css/js dosyalarını hash'le ve yeniden adlandır
const hashed = new Map();   // "js/app.js" → "js/app.3f9a2c1b.js"
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
for (const file of walk(DIST)) {
  const ext = extname(file);
  if (!['.css', '.js'].includes(ext)) continue;
  const content = readFileSync(file);
  const h = createHash('sha256').update(content).digest('hex').slice(0, 8);
  const rel = relative(DIST, file);
  const newName = join(dirname(file), `${basename(file, ext)}.${h}${ext}`);
  cpSync(file, newName); rmSync(file);
  hashed.set(rel.replaceAll('\\', '/'), relative(DIST, newName).replaceAll('\\', '/'));
}

// 3) index.html içindeki bağlantıları değiştir, sürüm damgası ekle
let html = readFileSync(join(DIST, 'index.html'), 'utf8');
for (const [from, to] of hashed) html = html.replaceAll(`"${from}"`, `"${to}"`);
let commit = 'local';
try { commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch {}
const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
html = html.replace('<body>', `<body data-version="${commit}" data-built="${stamp}">`);
writeFileSync(join(DIST, 'index.html'), html);
// Jekyll'ı kapat (GitHub Pages dosyaları olduğu gibi sunsun)
writeFileSync(join(DIST, '.nojekyll'), '');

console.log('Derlendi →', DIST);
for (const [from, to] of hashed) console.log('  ', from, '→', to);
console.log('  sürüm:', commit, stamp);
