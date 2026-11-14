// Tam ekran: tarayıcının adres çubuğu ve sekmeleri gizlenir, uygulama bütün ekranı kullanır.
// - Üst çubukta hesap düğmesinin solunda tek düğme: normalde "tam ekran" (dört köşe), tam ekrandayken ✕ (çık).
// - İlk girişte (dokunmatik cihaz, tarayıcıda) bir kez sorar: "Tam ekran yapmak ister misin?". Cevap hatırlanır.
// - "Evet" denmişse sonraki sayfalarda ilk dokunuşta yeniden tam ekrana geçer (tarayıcılar sayfa değişince
//   tam ekrandan çıkar ve yeniden girmek için bir dokunuş ister). ✕ ile çıkınca bu da kapanır.
// - iPhone Safari tam ekranı desteklemez: soru yerine "Ana Ekrana Ekle" rehberi; ana ekrandan açılınca
//   uygulama tarayıcı çubukları olmadan açılır (manifest + apple-mobile-web-app-capable). Orada düğme gizli.
// - iPad Safari tam ekranda sol üstte kendi ✕ düğmesini gösterir; bizimki o sırada gizlenir (iki ✕ olmasın).
// localStorage 'velora.fs.v1': 'on' (tam ekran ister) · 'off' (istemez) · 'ios' (rehber gösterildi)
(function () {
  const KEY = 'velora.fs.v1';
  const H = document.documentElement, D = document;
  const get = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const put = v => { try { localStorage.setItem(KEY, v); } catch (e) { /* yok */ } };
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const touch = H.classList.contains('is-touch');
  const standalone = H.classList.contains('is-standalone');
  const supported = !!(H.requestFullscreen || H.webkitRequestFullscreen) && D.fullscreenEnabled !== false;
  H.classList.toggle('is-ios', ios);
  const isFs = () => !!(D.fullscreenElement || D.webkitFullscreenElement);
  // iPhone (API yok) ve tarayıcıda: ana ekrana ekleme rehberi gösterilebilir
  const needsHome = !supported && ios && !standalone;

  let leaving = false, mine = false;   // sayfa kapanırken gelen çıkış tercihi değiştirmesin
  addEventListener('pagehide', () => { leaving = true; });
  addEventListener('beforeunload', () => { leaving = true; });

  function enter() {
    if (!supported || isFs()) return;
    try {
      const p = (H.requestFullscreen ? H.requestFullscreen({ navigationUI: 'hide' }) : H.webkitRequestFullscreen());
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* tarayıcı reddetti */ }
  }
  function exit() {
    if (!isFs()) return;
    mine = true;
    try { const p = (D.exitFullscreen || D.webkitExitFullscreen).call(D); if (p && p.catch) p.catch(() => {}); } catch (e) { /* yok */ }
  }
  function toggle() {
    if (needsHome) return openGuide();
    if (isFs()) { put('off'); exit(); } else { put('on'); enter(); }
  }

  // ---------- üst çubuk düğmesi ----------
  const ICON_IN = '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICON_X = '<svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  let btn = null;
  function syncBtn() {
    const on = isFs();
    H.classList.toggle('is-fs', on);
    if (!btn) return;
    btn.innerHTML = on ? ICON_X : ICON_IN;
    btn.classList.toggle('fs-exit', on);
    const t = on ? 'Tam ekrandan çık' : needsHome ? 'Tam ekran: ana ekrana ekle' : 'Tam ekran';
    btn.title = t; btn.setAttribute('aria-label', t);
  }
  function buildBtn() {
    if (standalone || (!supported && !needsHome)) return;          // ana ekrandan açılmış ya da hiç olanak yok
    btn = D.getElementById('btnFull');                               // simülatörde hazır düğme var
    if (!btn) {
      btn = D.createElement('button');
      btn.id = 'btnFull'; btn.className = 'tool fs-btn'; btn.type = 'button';
      const acc = D.getElementById('btnAccount');
      const bar = (acc && acc.parentElement) || D.querySelector('.topbar .tool-group') || D.querySelector('.topbar');
      if (!bar) { btn = null; return; }
      acc && acc.parentElement === bar ? bar.insertBefore(btn, acc) : bar.appendChild(btn);
    }
    btn.classList.add('fs-btn');
    btn.addEventListener('click', e => { e.stopPropagation(); toggle(); });
    syncBtn();
  }

  D.addEventListener('fullscreenchange', onChange);
  D.addEventListener('webkitfullscreenchange', onChange);
  function onChange() {
    syncBtn();
    // ✕ dışında çıkış (Esc, Android geri hareketi, iPad'in kendi ✕'i): kullanıcı tam ekranı kapattı, sonraki sayfada zorlamayalım
    if (!isFs() && !mine) setTimeout(() => { if (!leaving && !isFs() && D.visibilityState === 'visible') put('off'); }, 350);
    mine = false;
  }

  // "Evet" denmişse bu sayfada ilk dokunuşta yeniden tam ekran (tarayıcı kullanıcı hareketi ister)
  function armReenter() {
    if (!supported || get() !== 'on' || isFs()) return;
    const go = e => {
      if (e.target.closest && e.target.closest('#btnFull, .fs-dlg')) return;   // düğmenin kendisi zaten yapar
      D.removeEventListener('click', go, true); D.removeEventListener('touchend', go, true);
      if (get() === 'on') enter();
    };
    D.addEventListener('click', go, true);
    D.addEventListener('touchend', go, true);
  }

  // ---------- ilk giriş sorusu / iPhone rehberi ----------
  const SHARE = '<svg class="fs-share" viewBox="0 0 24 24" aria-label="Paylaş"><path d="M12 3.5v11M8 7.5l4-4 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.5 10.5H6.5v9.5h11v-9.5h-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const PLUS = '<svg class="fs-share" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8.5v7M8.5 12h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  function dialog(html, wire) {
    const d = D.createElement('div');
    d.className = 'gate fs-dlg'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
    d.innerHTML = `<div class="gate-card fs-card">${html}</div>`;
    D.body.appendChild(d);
    const close = () => d.remove();
    d.addEventListener('click', e => { if (e.target === d) close(); });
    wire(d, close);
    const f = d.querySelector('.gate-btn.primary'); if (f) f.focus({ preventScroll: true });
    return d;
  }
  function openAsk() {
    dialog(`<div class="gate-hero">
        <span class="gate-logo fs-logo">${ICON_IN}</span>
        <h2>Tam ekran yapmak ister misin?</h2>
        <p>Tarayıcının adres çubuğu gizlenir, parkur bütün ekranı kullanır. İstediğin zaman sağ üstteki
          <b class="fs-x-chip">${ICON_X}</b> düğmesiyle çıkabilirsin.</p>
      </div>
      <div class="gate-btns fs-btns">
        <button class="gate-btn ghost" data-no>Şimdi değil</button>
        <button class="gate-btn primary" data-yes>Tam ekran yap</button>
      </div>
      <p class="gate-hint">Sonra da sağ üstteki dört köşe düğmesiyle açabilirsin.</p>`, (d, close) => {
      d.querySelector('[data-yes]').onclick = () => { put('on'); close(); enter(); log('evet'); };
      d.querySelector('[data-no]').onclick = () => { put('off'); close(); log('hayır'); };
      d.addEventListener('click', e => { if (e.target === d) { put('off'); log('kapat'); } });
    });
  }
  function openGuide() {
    dialog(`<div class="gate-hero">
        <span class="gate-logo fs-logo">${ICON_IN}</span>
        <h2>Tam ekran için ana ekrana ekle</h2>
        <p>iPhone'da Safari tam ekranı desteklemez. Velora'yı ana ekrana eklersen uygulama gibi, tarayıcı çubukları olmadan açılır.</p>
      </div>
      <ol class="fs-steps">
        <li><span class="fs-n">1</span><span>Tarayıcının <b>Paylaş</b> düğmesine dokun ${SHARE}</span></li>
        <li><span class="fs-n">2</span><span><b>Ana Ekrana Ekle</b> seç ${PLUS}</span></li>
        <li><span class="fs-n">3</span><span>Ana ekrandaki <b>Velora</b> simgesinden aç</span></li>
      </ol>
      <div class="gate-btns fs-btns one"><button class="gate-btn primary" data-ok>Anladım</button></div>`, (d, close) => {
      d.querySelector('[data-ok]').onclick = close;
    });
    put('ios'); log('rehber');
  }
  const log = a => { try { window.SailTrack && SailTrack.log && SailTrack.log('fullscreen', { answer: a }); } catch (e) { /* yok */ } };

  function maybeAsk() {
    if (!touch || standalone || get()) return;                   // masaüstü, ana ekran uygulaması ya da daha önce cevaplandı
    if (!supported && !needsHome) return;
    const show = () => setTimeout(() => {
      if (get() || isFs() || H.classList.contains('gate-open') || D.querySelector('.fs-dlg')) return;
      supported ? openAsk() : openGuide();
    }, 500);
    // önce giriş ekranı (misafir / kaydol) kapansın
    if (H.classList.contains('gate-open') || (window.SailAccess && !SailAccess.account())) {
      const once = () => { D.removeEventListener('sail-access', once); setTimeout(() => !H.classList.contains('gate-open') && show(), 50); };
      D.addEventListener('sail-access', once);
    } else show();
  }

  function init() { buildBtn(); armReenter(); maybeAsk(); }
  // hesap düğmesi access.js'de DOMContentLoaded sırasında eklenir; ondan sonra yerleş
  D.readyState === 'loading' ? D.addEventListener('DOMContentLoaded', () => setTimeout(init, 0)) : setTimeout(init, 0);

  window.VeloraFS = { supported, needsHome, isFs, enter, exit, toggle, openGuide };
})();
