// Uygulama kabuğu: siteyi web sayfası değil uygulama gibi davrandırır. Her sayfada ilk betik.
// - Sayfa yukarı/aşağı esnemez, kaymaz, iki parmakla büyümez (yalnız kendi kaydırma alanları kayar).
// - Telefonda yatay zorunlu: dikey tutulunca "telefonu çevir" ekranı. iPad'de iki yön de serbest.
// - Ana ekrana eklenince (standalone) tarayıcı çubukları olmadan tam ekran açılır.
// Sınıflar (<html>): is-phone · is-tablet · is-touch · is-standalone · is-portrait / is-landscape
(function () {
  const H = document.documentElement;
  const mq = q => window.matchMedia(q).matches;
  const touch = mq('(pointer: coarse)') || navigator.maxTouchPoints > 1;
  // Telefon = dokunmatik ve ekranın kısa kenarı < 600 CSS px (iPad mini 744, en küçük tablet ~600).
  const short = Math.min(screen.width, screen.height);
  const phone = touch && short < 600;
  const tablet = touch && !phone;
  const standalone = mq('(display-mode: standalone)') || mq('(display-mode: fullscreen)') || navigator.standalone === true;
  H.classList.toggle('is-touch', touch);
  H.classList.toggle('is-phone', phone);
  H.classList.toggle('is-tablet', tablet);
  H.classList.toggle('is-standalone', !!standalone);
  // Ziyaret kayıtları gibi uzun sayfalar kendi içinde kaysın diye kabuk istisnası: <body data-shell="page">
  const isPage = () => document.body && document.body.dataset.shell === 'page';

  function orient() {
    const portrait = innerHeight > innerWidth;
    H.classList.toggle('is-portrait', portrait);
    H.classList.toggle('is-landscape', !portrait);
    H.style.setProperty('--app-h', innerHeight + 'px');
  }
  orient();
  addEventListener('resize', orient);
  addEventListener('orientationchange', () => setTimeout(orient, 120));

  // Telefonda dikey: tam ekran uyarı (uygulama arkada çalışmaya devam eder, döndürünce kaldığı yerden)
  if (phone) {
    const build = () => {
      if (document.getElementById('rotateGate')) return;
      const d = document.createElement('div');
      d.id = 'rotateGate'; d.className = 'rotate-gate'; d.setAttribute('role', 'alert');
      d.innerHTML = `<div class="rg-in">
        <svg class="rg-phone" viewBox="0 0 120 120" aria-hidden="true">
          <g class="rg-dev"><rect x="38" y="16" width="44" height="88" rx="9" fill="none" stroke="currentColor" stroke-width="5"/>
          <rect x="54" y="23" width="12" height="3" rx="1.5" fill="currentColor"/></g>
          <path class="rg-arrow" d="M96 40a40 40 0 0 1 4 34" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
          <path class="rg-arrow" d="m92 70 8 6 4-10" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <b>Telefonu yan çevir</b>
        <span>Velora Sailing telefonda yatay ekranda kullanılır. Parkur ve düğmeler yan çevrilince tam sığar.</span>
      </div>`;
      document.body.appendChild(d);
    };
    document.body ? build() : document.addEventListener('DOMContentLoaded', build);
    // Android'de tam ekrandayken yönü kilitle (iOS desteklemez; sessizce geç)
    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement && screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
    });
  }

  // iOS Safari: iki parmakla sayfa büyütmesini kapat (sahnenin kendi yakınlaştırması pointer olaylarıyla çalışır)
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));

  // Sayfa esnemesini kapat: dokunuş kaydırılabilir bir alanın içinde başlamadıysa sayfa hiç kaymaz.
  // (overscroll-behavior: none CSS'te de var; eski iOS sürümleri için bu bekçi.)
  const canScroll = (el, dy, dx) => {
    for (; el && el !== document.body && el !== H; el = el.parentElement) {
      if (el.matches && el.matches('input, textarea, select, [contenteditable], [data-touch]')) return true;
      const cs = getComputedStyle(el);
      if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1) {
        if (dy === 0) return true;
        const top = el.scrollTop <= 0, bot = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
        if ((dy > 0 && !top) || (dy < 0 && !bot)) return true;
      }
      if (/(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1) {
        if (dx === 0) return true;
        const l = el.scrollLeft <= 0, r = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
        if ((dx > 0 && !l) || (dx < 0 && !r)) return true;
      }
    }
    return false;
  };
  let sx = 0, sy = 0;
  document.addEventListener('touchstart', e => { if (e.touches.length === 1) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; } }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (isPage() || !e.cancelable) return;
    if (e.touches.length > 1) { e.preventDefault(); return; }           // iki parmak: sayfa büyümesin
    const t = e.touches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (!canScroll(e.target, ay >= ax ? dy : 0, ax > ay ? dx : 0)) e.preventDefault();
  }, { passive: false });

  // Uzun basınca çıkan bağlam menüsü / görsel kaydet balonu sahnede ve düğmelerde çıkmasın
  document.addEventListener('contextmenu', e => {
    if (!touch || isPage()) return;
    if (!e.target.closest('input, textarea, [contenteditable]')) e.preventDefault();
  });
})();
