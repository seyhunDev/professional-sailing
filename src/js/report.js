// Bildirim gönder (SailReport): denerken bir şey olunca "ne oldu" notu + o ana kadarki veri tek dokunuşla gönderilir.
//
// Toplanan: bu sekmede yapılan son işlemler (tıklamalar, tuşlar, sayfa olayları; sayfa değişse de oturum boyunca),
// yakalanan hatalar, cihaz/ekran, sayfanın kendi durumu (simülatörde kurulum + yarış kaydı: Claude yarışı node'da aynen
// yeniden kurar, bkz. scripts/report.mjs). Yalnız sahip hesabında görünür (html[data-role="sahip"]).
//
// Gönderme: GitHub'da "bildirim" etiketli bir konu (issue) sayfası hazır doldurulmuş açılır, "Submit" ile gönderilir;
// tam veri ayrıca panoya kopyalanır (konu adresine sığmazsa oraya yapıştırılır). Dosya olarak da indirilebilir.
// Son 10 bildirim bu cihazda saklanır (ps.reports.v1).
(function () {
  const REPO = 'seyhunDev/velora-sailing';
  const BUF = 'ps.report.buf', KEEP = 'ps.reports.v1', MAXBUF = 400, URL_MAX = 7000;
  const PAGE = (location.pathname.split('/').pop() || 'index.html') || 'index.html';
  const T0 = Date.now();
  const sources = {};
  const errors = [];

  // ---------- olay tamponu (sekme boyunca, sayfalar arası) ----------
  let buf = [];
  try { buf = JSON.parse(sessionStorage.getItem(BUF) || '[]'); } catch (e) { buf = []; }
  let saveT = 0;
  function push(type, data) {
    buf.push({ ts: Date.now(), p: PAGE, type, ...(data ? { d: data } : {}) });
    if (buf.length > MAXBUF) buf.splice(0, buf.length - MAXBUF);
    clearTimeout(saveT); saveT = setTimeout(() => { try { sessionStorage.setItem(BUF, JSON.stringify(buf)); } catch (e) { /* dolu */ } }, 300);
  }
  addEventListener('pagehide', () => { try { sessionStorage.setItem(BUF, JSON.stringify(buf)); } catch (e) { /* yok */ } });
  push('page', { title: document.title.slice(0, 60) });

  const labelOf = el => (el.getAttribute('aria-label') || el.innerText || el.textContent || el.title || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  document.addEventListener('click', e => {
    const el = e.target.closest && e.target.closest('button, a, [data-v], [data-cat], [role="button"], li[data-id]');
    if (!el || el.closest('#repDlg')) return;
    const id = el.id || (el.dataset.cat ? 'cat:' + el.dataset.cat : el.dataset.v ? (el.parentElement && el.parentElement.id ? el.parentElement.id + '=' : '') + el.dataset.v : el.dataset.id ? 'boat:' + el.dataset.id : '');
    push('click', { id, l: labelOf(el), ...(el.disabled ? { off: 1 } : {}) });
  }, true);
  document.addEventListener('keydown', e => {
    if (e.repeat || (e.target.closest && e.target.closest('input, textarea, select'))) return;
    if (e.key.length > 12) return;
    push('key', { k: e.key });
  }, true);
  document.addEventListener('change', e => {
    const el = e.target; if (!el || el.closest('#repDlg') || el.type === 'password') return;
    push('change', { id: el.id || el.name || '', v: String(el.value).slice(0, 30) });
  }, true);
  if (window.SailTrack) {                                // sayfanın kendi olayları (race_start, drive, scenario …)
    const orig = SailTrack.log;
    SailTrack.log = function (type, data) { if (type !== 'click') push('ev', { t: type, ...(data || {}) }); return orig.apply(this, arguments); };
  }

  // ---------- hatalar ----------
  function err(kind, msg, stack) {
    const m = String(msg || '').slice(0, 300);
    const last = errors[errors.length - 1];
    if (last && last.m === m) { last.n++; last.ts = Date.now(); return; }
    errors.push({ ts: Date.now(), kind, m, s: String(stack || '').split('\n').slice(0, 4).join(' | ').slice(0, 400), n: 1 });
    if (errors.length > 30) errors.shift();
    push('error', { m: m.slice(0, 120) });
  }
  addEventListener('error', e => err('error', e.message || (e.target && e.target.src ? 'yüklenemedi: ' + e.target.src : ''), e.error && e.error.stack), true);
  addEventListener('unhandledrejection', e => err('promise', e.reason && (e.reason.message || e.reason), e.reason && e.reason.stack));
  const cerr = console.error;
  console.error = function () { try { const a = [...arguments]; err('console', a.map(x => (x && x.message) || (typeof x === 'string' ? x : JSON.stringify(x))).join(' '), a.find(x => x && x.stack) && a.find(x => x && x.stack).stack); } catch (e) { /* yok */ } return cerr.apply(this, arguments); };

  // ---------- rapor ----------
  const ver = () => (document.body && document.body.dataset.ver) || 'geliştirme';
  function device() {
    const c = window.SailTrack && SailTrack.context ? SailTrack.context() : {};
    return { device: c.device, os: c.os, browser: c.browser, viewport: `${innerWidth}×${innerHeight}`, dpr: devicePixelRatio || 1, orient: innerWidth > innerHeight ? 'yatay' : 'dikey', lang: c.lang, tz: c.tz, ua: (navigator.userAgent || '').slice(0, 160) };
  }
  function build(note) {
    const state = {};
    for (const k in sources) { try { state[k] = sources[k](); } catch (e) { state[k] = { hata: String(e && e.message || e) }; } }
    const t = Date.now();
    return {
      app: 'velora-sailing', kind: 'report', v: 1, at: new Date(t).toISOString(), ver: ver(), commit: document.body && document.body.dataset.version || '',
      page: PAGE, url: location.pathname + location.hash, note: note || '', sec: Math.round((t - T0) / 1000),
      role: document.documentElement.dataset.role || '', dev: device(),
      errors: errors.slice(), events: buf.map(e => ({ ...e, ts: e.ts - t })),   // ts: şimdiden önceki ms (eksi)
      state,
    };
  }
  const fmtAgo = ms => { const s = Math.round(-ms / 1000); return s < 60 ? `-${s} sn` : `-${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  function evLine(e) {
    const d = e.d || {};
    const what = e.type === 'click' ? `${d.l || d.id}${d.id && d.l && d.l !== d.id ? ` (${d.id})` : ''}${d.off ? ' · pasif' : ''}`
      : e.type === 'key' ? `tuş ${d.k}` : e.type === 'change' ? `${d.id} = ${d.v}` : e.type === 'error' ? `HATA ${d.m}`
      : e.type === 'ev' ? `${d.t} ${JSON.stringify(Object.fromEntries(Object.entries(d).filter(([k]) => k !== 't'))).slice(0, 80)}` : `${e.type} ${d.title || ''}`;
    return `| ${fmtAgo(e.ts)} | ${e.p.replace('.html', '')} | ${String(what).replace(/\|/g, '/').slice(0, 90)} |`;
  }
  function summary(r) {
    const lines = [];
    for (const k in r.state) { const s = r.state[k]; if (s && s.ozet) lines.push(s.ozet); }
    return lines.join(' · ');
  }
  function bodyText(r, data, n) {
    const d = r.dev;
    const ev = r.events.slice(-n);
    return [
      `**Not:** ${r.note ? r.note.replace(/\n/g, '\n> ') : '(yazılmadı)'}`,
      '',
      `**Sayfa:** ${r.page} · ${r.ver} · ${d.device || ''} ${d.os || ''} ${d.browser || ''} · ${d.viewport} ${d.orient} · ${new Date(r.at).toLocaleString('tr-TR')}`,
      summary(r) ? `**Durum:** ${summary(r)}` : '',
      r.errors.length ? `**Hatalar (${r.errors.length}):**\n` + r.errors.slice(-5).map(e => `- ${fmtAgo(e.ts - Date.parse(r.at))} ${e.kind}: ${e.m}${e.n > 1 ? ` (×${e.n})` : ''}`).join('\n') : '**Hatalar:** yok',
      '',
      `**Son ${ev.length} işlem** (en yeni altta):`, '', '| ne zaman | sayfa | ne |', '|---|---|---|', ...ev.map(evLine),
      '',
      '<details><summary>Veri (Claude yarışı bundan aynen kurar)</summary>', '',
      data ? '```velora-report\n' + data + '\n```' : '⬇ Veri adrese sığmadı, **panoya kopyalandı: buraya yapıştır.**',
      '', '</details>',
    ].filter(x => x !== null).join('\n');
  }
  async function pack(obj) {
    const json = JSON.stringify(obj);
    try {
      if (!window.CompressionStream) throw 0;
      const cs = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
      const bytes = new Uint8Array(await new Response(cs).arrayBuffer());
      let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return 'gz:' + btoa(bin).replace(/(.{100})/g, '$1\n');
    } catch (e) { return 'json:' + json; }
  }
  function keep(r) {
    try { const a = JSON.parse(localStorage.getItem(KEEP) || '[]'); a.unshift(r); localStorage.setItem(KEEP, JSON.stringify(a.slice(0, 10))); }
    catch (e) { /* dolu: sakla­madan devam */ }
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (er) { /* yok */ } ta.remove(); return ok;
    }
  }
  function issueUrl(title, body) {
    return `https://github.com/${REPO}/issues/new?labels=bildirim&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  }
  // GitHub'a: adres sınırına sığacak biçimde (önce işlem sayısı azalır, sonra veri panoya taşınır)
  async function toGithub(r) {
    const data = await pack(r);
    const title = 'Bildirim: ' + (r.note ? r.note.split('\n')[0].slice(0, 70) : `${r.page.replace('.html', '')} · ${r.ver}`);
    let url = null, inUrl = true;
    for (const n of [60, 40, 25, 12]) { const u = issueUrl(title, bodyText(r, data, n)); if (u.length <= URL_MAX) { url = u; break; } }
    if (!url) { inUrl = false; for (const n of [60, 40, 25, 12, 5]) { const u = issueUrl(title, bodyText(r, null, n)); if (u.length <= URL_MAX || n === 5) { url = u; break; } } }
    const copied = await copy('```velora-report\n' + data + '\n```');
    return { url, inUrl, copied, data };
  }

  // ---------- arayüz ----------
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/><path d="M12 8v3.5M12 13.6v.01"/></svg>';
  let dlg = null, last = null;
  function ui() {
    const g = document.querySelector('.topbar .tool-group');
    if (g && !document.getElementById('btnReport')) {
      const b = document.createElement('button');
      b.id = 'btnReport'; b.className = 'tool report-btn'; b.title = 'Bildirim gönder: ne oldu yaz, o ana kadarki veriyle Claude\'a gönder';
      b.innerHTML = ICON + '<span class="lbl">Bildir</span>';
      b.addEventListener('click', open);
      g.prepend(b);
    }
  }
  function open() {
    last = build('');                                     // basıldığı anın verisi (pencere açıkken uygulama ilerlemesin diye şimdi alınır)
    if (!dlg) {
      dlg = document.createElement('div');
      dlg.id = 'repDlg'; dlg.className = 'rep-dlg hidden'; dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true');
      dlg.innerHTML = `<div class="rep-panel">
        <div class="rep-head"><div><h2>Bildirim gönder</h2><p>Bu ana kadar yaptıkların ve uygulamanın durumu eklenir.</p></div>
          <button class="rep-x" id="repClose" title="Kapat (Esc)" aria-label="Kapat">✕</button></div>
        <label for="repNote">Ne oldu? <small>(isteğe bağlı)</small></label>
        <textarea id="repNote" rows="4" maxlength="2000" placeholder="Ör. Elle sür'e bastım, teknem durdu ve dümen tepki vermedi"></textarea>
        <div class="rep-sum" id="repSum"></div>
        <div class="rep-actions">
          <button class="rep-b" id="repFile" title="Bildirimi dosya olarak indir">Dosya</button>
          <button class="rep-b" id="repCopy" title="Bildirimi panoya kopyala (sohbete yapıştırmak için)">Kopyala</button>
          <button class="rep-b primary" id="repSend">GitHub'a gönder</button>
        </div>
        <p class="rep-foot" id="repFoot">GitHub'da açılan sayfada <b>Submit new issue</b>'ya bas; Claude bildirimleri oradan okur.</p>
      </div>`;
      document.body.appendChild(dlg);
      dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
      dlg.addEventListener('keydown', e => { if (e.key === 'Escape') close(); e.stopPropagation(); });
      dlg.querySelector('#repClose').addEventListener('click', close);
      dlg.querySelector('#repSend').addEventListener('click', async () => {
        const r = withNote(); keep(r);
        const w = window.open('about:blank', '_blank');   // iOS: açılır pencere tıklamayla açılmalı
        const res = await toGithub(r);
        if (w) w.location.href = res.url; else location.href = res.url;
        push('report', { how: 'github', note: !!r.note });
        done(res.inUrl ? 'Gönderildi' : 'Panoda', res.inUrl ? 'GitHub açıldı: Submit new issue\'ya bas.'
          : `GitHub açıldı. Veri adrese sığmadı${res.copied ? ', panoya kopyalandı: konunun en altına yapıştırıp' : ''} Submit new issue'ya bas.`);
      });
      dlg.querySelector('#repCopy').addEventListener('click', async () => {
        const r = withNote(); keep(r);
        const ok = await copy(bodyText(r, await pack(r), 40));
        push('report', { how: 'copy' });
        if (ok) done('Kopyalandı', 'Panoya kopyalandı: Claude sohbetine yapıştırabilirsin.'); else foot('Kopyalanamadı. Dosya ile dene.');
      });
      dlg.querySelector('#repFile').addEventListener('click', () => {
        const r = withNote(); keep(r);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(r, null, 1)], { type: 'application/json' }));
        a.download = `velora-bildirim-${r.at.slice(0, 16).replace(/[:T]/g, '-')}.json`; document.body.appendChild(a); a.click(); a.remove();
        push('report', { how: 'file' });
        done('İndirildi', 'Dosya indirildi: Claude sohbetine ekleyebilirsin.');
      });
    }
    const s = summary(last);
    dlg.querySelector('#repSum').innerHTML = `<b>${last.events.length}</b> işlem · <b>${last.errors.length}</b> hata${s ? ' · ' + esc(s) : ''} · ${esc(last.ver)}`;
    foot('GitHub\'da açılan sayfada <b>Submit new issue</b>\'ya bas; Claude bildirimleri oradan okur.');
    dlg.classList.remove('hidden');
    setTimeout(() => dlg.querySelector('#repNote').focus(), 50);
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const foot = html => { dlg.querySelector('#repFoot').innerHTML = html; };
  function withNote() { return { ...last, note: dlg.querySelector('#repNote').value.trim() }; }
  function close() { if (dlg) dlg.classList.add('hidden'); }
  // Gönderince: pencere kapanır, not temizlenir, Bildir düğmesi birkaç saniye onay işaretiyle "Gönderildi" der.
  const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  let doneTimer = 0;
  function done(label, tip) {
    dlg.querySelector('#repNote').value = '';
    close();
    const b = document.getElementById('btnReport'); if (!b) return;
    clearTimeout(doneTimer);
    b.classList.add('sent'); b.innerHTML = CHECK + `<span class="lbl">${esc(label)}</span>`; b.title = tip;
    doneTimer = setTimeout(() => {
      b.classList.remove('sent'); b.innerHTML = ICON + '<span class="lbl">Bildir</span>';
      b.title = 'Bildirim gönder: ne oldu yaz, o ana kadarki veriyle Claude\'a gönder';
    }, label === 'Panoda' ? 9000 : 4000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ui); else ui();

  window.SailReport = {
    source(name, fn) { sources[name] = fn; },            // sayfa kendi durumunu ekler: fn() → { ozet: 'kısa metin', ... }
    log: push, build, open, pack, errors: () => errors.slice(), events: () => buf.slice(),
    saved() { try { return JSON.parse(localStorage.getItem(KEEP) || '[]'); } catch (e) { return []; } },
  };
})();
