// Ziyaret ve olay kaydı (SailTrack).
// Şimdilik YALNIZCA bu tarayıcıda (localStorage) tutulur; hiçbir sunucuya gönderilmez.
// Firebase bağlanınca: SailTrack.setSink(async events => { ...Firestore'a yaz... }) — gönderilmemiş
// olaylar sırayla teslim edilir, başarılı olanlar "gönderildi" işaretlenir. Biçim değişmez.
//
// Olay biçimi (v1):
//   { id, t (ISO zaman), ts (ms), type, page, vid (ziyaretçi), sid (oturum), role, uid?, data {…}, sent? }
// Türler: visit (oturum başı + bağlam), page, leave (süre), scenario, play, click, race_start,
//   race_end, race_save, drive, route, gate (giriş ekranı seçimi), signup, owner, consent, locked
// Velora'dan gelen giriş anahtarı (#t=…) adresten hemen silinir: kayıtlara, geçmişe girmez (js/velora-auth.js kullanır)
(function () {
  const m = /^#t=([^&]+)/.exec(location.hash);
  if (!m) return;
  try { window.__veloraToken = decodeURIComponent(m[1]); } catch (e) { /* bozuk */ }
  history.replaceState(null, '', location.pathname + location.search);
})();
(function () {
  const KEY = 'ps.track.v1', VID = 'ps.vid', SID = 'ps.sid', CONSENT = 'ps.consent.v1';
  const MAX = 3000;                       // en fazla bu kadar olay tutulur (eskiler silinir)
  const PAGE = (location.pathname.split('/').pop() || 'index.html').replace(/\?.*$/, '') || 'index.html';
  const t0 = Date.now();

  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* yok */ } },
  };
  const rid = () => (crypto.randomUUID ? crypto.randomUUID() : 'x' + Math.random().toString(36).slice(2) + Date.now().toString(36));

  // ziyaretçi kimliği (cihaz/tarayıcı başına kalıcı) ve oturum kimliği (sekme başına)
  let vid = ls.get(VID, null); if (!vid) { vid = rid(); ls.set(VID, vid); }
  let sid = null; try { sid = sessionStorage.getItem(SID); } catch (e) { /* yok */ }
  const newSession = !sid;
  if (!sid) { sid = rid(); try { sessionStorage.setItem(SID, sid); } catch (e) { /* yok */ } }

  let who = { role: null, uid: null };   // access.js doldurur
  let sink = null, flushing = false;

  // izin: null (henüz sorulmadı) / true / false. Sorulmadıysa olaylar bellekte bekler, izin gelince yazılır.
  const consent = () => ls.get(CONSENT, null);
  const pending = [];
  function store(ev) {
    const c = consent();
    if (c === false) return;
    if (c == null) { pending.push(ev); return; }
    const all = ls.get(KEY, []);
    all.push(ev);
    if (all.length > MAX) all.splice(0, all.length - MAX);
    if (!ls.set(KEY, all)) { all.splice(0, Math.ceil(all.length / 3)); ls.set(KEY, all); }
    flush();
  }

  function log(type, data) {
    const now = Date.now();
    const ev = { id: rid(), t: new Date(now).toISOString(), ts: now, type, page: PAGE, vid, sid, role: who.role || 'yeni' };
    if (who.uid) ev.uid = who.uid;
    if (data && Object.keys(data).length) ev.data = data;
    store(ev);
    return ev;
  }

  // ziyaret bağlamı: nereden (referrer, utm), nasıl (cihaz, tarayıcı, dil, saat dilimi, ekran)
  // IP adresi tarayıcıdan güvenilir biçimde alınamaz; Firebase'te sunucu tarafında (Cloud Function) eklenecek.
  function context() {
    const q = new URLSearchParams(location.search);
    const utm = {}; for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'ref']) if (q.get(k)) utm[k] = q.get(k);
    const ua = navigator.userAgent || '';
    const device = /iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'tablet'
      : /Mobi|iPhone|Android/i.test(ua) ? 'telefon' : 'bilgisayar';
    const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox'
      : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'diğer';
    const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows'
      : /Mac OS X|Macintosh/.test(ua) ? (navigator.maxTouchPoints > 1 ? 'iPadOS' : 'macOS') : /Linux/.test(ua) ? 'Linux' : 'diğer';
    let tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { /* yok */ }
    let from = 'doğrudan';
    try { if (document.referrer) { const r = new URL(document.referrer); from = r.host === location.host ? 'site içi' : r.host; } } catch (e) { /* yok */ }
    return {
      from, referrer: document.referrer || '', ...utm, url: location.pathname + location.search + location.hash,
      device, os, browser, lang: navigator.language || '', tz,
      screen: `${screen.width}×${screen.height}`, viewport: `${innerWidth}×${innerHeight}`, dpr: devicePixelRatio || 1,
      ua: ua.slice(0, 220),
    };
  }

  async function flush() {
    if (!sink || flushing || consent() !== true) return;
    const all = ls.get(KEY, []);
    const todo = all.filter(e => !e.sent);
    if (!todo.length) return;
    flushing = true;
    try {
      await sink(todo);
      const ids = new Set(todo.map(e => e.id));
      const cur = ls.get(KEY, []);
      for (const e of cur) if (ids.has(e.id)) e.sent = true;
      ls.set(KEY, cur);
    } catch (e) { /* bir dahaki sefere */ }
    flushing = false;
  }

  // sayfadan çıkış: kalma süresi
  let leftLogged = false;
  function leave() {
    if (leftLogged) return; leftLogged = true;
    log('leave', { sec: Math.round((Date.now() - t0) / 1000) });
  }
  addEventListener('pagehide', leave);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') leave();
    else if (leftLogged) { leftLogged = false; log('page', { back: true }); }
  });

  // her düğme tıklaması (id'si olanlar): kullanıcı ne yaptı
  let lastClick = { k: '', ts: 0 };
  document.addEventListener('click', e => {
    const el = e.target.closest && e.target.closest('button[id], a[id], label[id], [data-track]');
    if (!el) return;
    const id = el.dataset.track || el.id;
    const now = Date.now();
    if (lastClick.k === id && now - lastClick.ts < 400) return;   // çift tıklamayı tek say
    lastClick = { k: id, ts: now };
    const label = (el.getAttribute('aria-label') || el.innerText || el.textContent || el.title || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    log('click', { id, label });
  }, true);

  window.SailTrack = {
    vid, get sid() { return sid; }, page: PAGE, newSession,
    log,
    context,
    setWho(w) { who = { ...who, ...w }; },
    consent,
    setConsent(v) {
      ls.set(CONSENT, !!v);
      if (v) { const p = pending.splice(0); for (const e of p) { e.role = who.role || e.role; store(e); } }
      else { pending.length = 0; ls.del(KEY); }
    },
    all() { return ls.get(KEY, []); },
    clear() { ls.del(KEY); },
    importEvents(list) {                   // başka cihazdan alınan dosyayı birleştir (aynı id tek kalır)
      const cur = ls.get(KEY, []); const ids = new Set(cur.map(e => e.id)); let n = 0;
      for (const e of list) if (e && e.id && e.type && !ids.has(e.id)) { cur.push(e); ids.add(e.id); n++; }
      cur.sort((a, b) => a.ts - b.ts); if (cur.length > MAX * 3) cur.splice(0, cur.length - MAX * 3);
      ls.set(KEY, cur); return n;
    },
    setSink(fn) { sink = fn; flush(); },
    flush,
  };
})();
