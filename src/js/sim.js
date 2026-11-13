/* Yarış simülatörü – arayüz: yerleştirme (sürükle), rüzgar / sağanak, start, geri sarma, sıralama */
(function () {
  const E = SailEngine, S = SailSim, Rec = SailRecords, jcopy = Rec.jcopy;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const $ = id => document.getElementById(id);
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const W = S.WORLD;
  const phoneMq = window.matchMedia('(max-width: 640px), (max-height: 460px)');

  const st = {
    mode: 'setup',            // setup | run | pause | end
    fleet: S.defaultFleet(12),
    wind: 0, gusts: [],
    sim: null, frames: [], rec: null, speed: 1, lastTs: 0, acc: 0,
    show: { speed: true, shadow: true, startLay: false, zone: true },   // pis rüzgar konileri varsayılan açık; hat layline'ları ayarlardan
    sel: null, vb: { x: 0, y: 0, w: W.w, h: W.h }, drag: null, mineOnly: false, viewT: 0,
    cam: { z: 1, x: null, y: null, follow: false }, base: null, pinch: null, pts: new Map(),
    course: { ...S.COURSE_DEFAULT }, sea: { ...S.SEA_DEFAULT }, boat: { ...S.BOAT_DEFAULT }, gsel: null, drawMode: false, drawPts: null, routeMode: 'acili', draft: [], steps: [], legPrev: null
  };

  // ---------- görünüm ----------
  function fitViewBox() {
    const svg = $('course'), Wd = svg.clientWidth || 1, Hd = svg.clientHeight || 1;
    // yatay düzende sağdaki kategori rayı (ve açık ayar paneli) parkurun üstüne binmesin: parkuru kalan alana sığdır
    const rail = document.body.classList.contains('lay-rail'), panelOpen = rail && !$('panel').classList.contains('hidden');
    const padPx = rail ? $('catRail').offsetWidth + 24 + (panelOpen ? $('panel').offsetWidth + 10 : 0) : 0, Wa = Math.max(200, Wd - padPx);
    const V = { x: 0, y: -50, w: W.w, h: W.h + 90 };    // gösterilecek alan (şamandıra üstü ve 2. sıra altı paylı)
    const padB = 0, Ha = Math.max(200, Hd - padB);
    let w = V.w, hA = V.h;
    if (Wa / Ha > V.w / V.h) w = V.h * Wa / Ha; else hA = V.w * Ha / Wa;
    const k = w / Wa, wTot = Wd * k, h = Hd * k;           // ekran pikseli başına birim
    const topShare = phoneMq.matches ? 0.12 : 0.5;          // telefonda parkur üstte, alt sayfa altta kalsın
    const old = st.base && st.vb && { ...st.vb };
    st.base = { x: V.x - (w - V.w) / 2, y: V.y - (hA - V.h) * topShare, w: wTot, h, vis: Wa / Wd };
    applyCam();
    // panel açılıp kapanınca parkur zıplamasın: kısa bir geçişle yeni yerine kaysın
    if (old && st.vb && Math.abs(old.w - st.vb.w) < old.w * 0.5) st.tween = { from: old, t0: performance.now() };
  }
  // ---------- Kamera: yakınlaştır / kaydır / teknemi takip et ----------
  const Z_MAX = 5;
  const clampN = (v, a, b) => (a > b ? (a + b) / 2 : Math.max(a, Math.min(b, v)));
  function applyCam() {
    const B = st.base, c = st.cam; if (!B) return;
    if (c.z <= 1.001 && !c.follow) { c.z = 1; c.x = null; st.vb = { x: B.x, y: B.y, w: B.w, h: B.h }; }
    else {
      c.z = Math.max(1, Math.min(Z_MAX, c.z));
      const w = B.w / c.z, h = B.h / c.z, vw = w * B.vis;      // görünen genişlik (masaüstünde panel sağı kapatır)
      let cx = c.x == null ? B.x + B.w * B.vis / 2 : c.x, cy = c.y == null ? B.y + B.h / 2 : c.y;
      const cov = sheetCover();                                // alttan kapanan kısım (dikey ekranda açık ayar paneli)
      const lock = !!(st.drive && c.follow);                  // elle sürerken: tekne hep ekranın ortasında
      if (c.follow) {
        const m = view().boats.find(b => b.mine && !b.gone);
        if (m) {
          // kare hızından bağımsız yumuşak takip (elle sürerken sıkı: gecikme ~0.1 sn, titreme yok)
          const now = performance.now(), dt = Math.min(0.1, Math.max(0, (now - (c.ft || now)) / 1000)); c.ft = now;
          const k = lock ? 1 - Math.exp(-dt * 10) : 0.18, ty = m.y + h * (0.5 - (1 - cov) * (lock ? 0.5 : 0.56));
          cx += (m.x - cx) * k; cy += (ty - cy) * k;
        }
      }
      const ex = cov * h;                              // telefonda alt sayfanın kapattığı kısım: parkur onun üstüne kaydırılabilsin
      const mx = S.MAN_MARGIN + 40;                              // manuel tekne parkur kenarını aşabilir: kamera da gidebilsin
      if (!lock) { cx = clampN(cx, B.x - mx + vw / 2, B.x + B.w * B.vis + mx - vw / 2); cy = clampN(cy, B.y + h / 2, B.y + B.h - h / 2 + ex); }   // parkur kenarında kamera durmaz: tekne ortada kalır
      c.x = cx; c.y = cy;
      st.vb = { x: cx - vw / 2, y: cy - h / 2, w, h };
    }
    let vb = st.vb;
    if (st.tween) {
      const k = Math.min(1, (performance.now() - st.tween.t0) / 260), e = 1 - Math.pow(1 - k, 3), f = st.tween.from;
      if (k >= 1 || st.pinch || st.drag) st.tween = null;
      else vb = { x: f.x + (vb.x - f.x) * e, y: f.y + (vb.y - f.y) * e, w: f.w + (vb.w - f.w) * e, h: f.h + (vb.h - f.h) * e };
    }
    $('course').setAttribute('viewBox', `${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.h.toFixed(1)}`);
    camUi();
  }
  function sheetCover() {
    if (!phoneMq.matches || $('panel').classList.contains('hidden') || !document.body.classList.contains('lay-strip')) return 0;
    const r = $('course').getBoundingClientRect(), p = $('panel').getBoundingClientRect();
    return r.height ? Math.max(0, Math.min(0.7, (r.bottom - p.top) / r.height)) : 0;
  }
  // ekrandaki (clientX, clientY) noktası altındaki dünya noktası yerinde kalacak şekilde yakınlaştır
  function zoomTo(z, clientX, clientY, anchorW) {
    const B = st.base, c = st.cam, r = $('course').getBoundingClientRect();
    z = Math.max(1, Math.min(Z_MAX, z));
    if (st.drive && c.follow) { c.z = Math.max(1.2, z); applyCam(); return; }   // elle sürerken: tekne ortada kalarak yakınlaş / uzaklaş
    const fx = r.width ? (clientX - r.left) / r.width : 0.5, fy = r.height ? (clientY - r.top) / r.height : 0.5;
    const P = anchorW || { x: st.vb.x + fx * st.vb.w, y: st.vb.y + fy * st.vb.h };
    const w = B.w / z, h = B.h / z;
    c.z = z; c.x = P.x - fx * w + w * B.vis / 2; c.y = P.y - fy * h + h / 2;
    applyCam();
  }
  function zoomBy(k) {
    if (st.drive && st.cam.follow) { zoomTo(st.cam.z * k, 0, 0); return; }
    const r = $('course').getBoundingClientRect(), sx = r.left + r.width * st.base.vis / 2, sy = r.top + r.height / 2;
    // tüm parkur görünürken ilk yakınlaştırma senin teknene (yoksa ekran ortasına)
    const m = st.cam.z <= 1.001 && k > 1 && view().boats.find(b => b.mine && !b.gone);
    if (m) { zoomTo(st.cam.z * k, sx, sy, null); const B = st.base, h = B.h / st.cam.z; st.cam.x = m.x; st.cam.y = m.y + h * (0.5 - 0.6 * (1 - sheetCover())); applyCam(); return; /* tekne görünen alanın %60 aşağısında */ }
    // teknen ekrandaysa onu sabit tutarak yakınlaştır (filo kaybolmasın)
    const me = view().boats.find(b => b.mine && !b.gone), vb = st.vb;
    if (me && me.x > vb.x && me.x < vb.x + vb.w * st.base.vis && me.y > vb.y && me.y < vb.y + vb.h) {
      zoomTo(st.cam.z * k, r.left + (me.x - vb.x) / vb.w * r.width, r.top + (me.y - vb.y) / vb.h * r.height, { x: me.x, y: me.y }); return;
    }
    zoomTo(st.cam.z * k, sx, sy);
  }
  function panBy(dxPx, dyPx) {
    const r = $('course').getBoundingClientRect(), u = st.vb.w / (r.width || 1);
    st.cam.follow = false; st.cam.panAt = performance.now(); st.cam.x = (st.cam.x == null ? st.base.x + st.base.w * st.base.vis / 2 : st.cam.x) - dxPx * u; st.cam.y = (st.cam.y == null ? st.base.y + st.base.h / 2 : st.cam.y) - dyPx * u;
    applyCam();
  }
  function camFit() { if (st.drive) return; st.cam.z = 1; st.cam.follow = false; st.cam.panAt = null; applyCam(); }
  function camFollow() {
    if (st.drive) return;                                   // elle sürerken kamera hep teknende
    const c = st.cam; c.follow = !c.follow;
    if (c.follow && c.z < 2.2) c.z = 2.2;
    applyCam(); toast(c.follow ? 'Kamera senin tekneni takip ediyor · kaydırınca bırakır' : 'Takip kapandı');
  }
  function camUi() {
    const c = st.cam, zb = $('zoomVal'); if (!zb) return;
    zb.textContent = `${Math.round(c.z * 100)}%`;
    $('btnZoomOut').disabled = c.z <= (st.drive ? 1.201 : 1.001); $('btnZoomIn').disabled = c.z >= Z_MAX - 0.001; $('btnZoomFit').disabled = c.z <= 1.001 && !c.follow;
    $('btnFollow').classList.toggle('on', !!c.follow);
  }
  function toWorld(ev) {
    const svg = $('course'), p = svg.createSVGPoint();
    p.x = ev.clientX; p.y = ev.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }

  // Ekranda gösterilen durum: kurulumda filo, yarışta simülasyon
  function view() {
    if (st.mode === 'setup') {
      return { t: 0, wind: st.wind, gusts: st.gusts, startAt: S.START_AT,
        boats: st.fleet.map(b => (b.drv ? { ...b } : { ...b, h: st.wind + (b.tack === 'starboard' ? -25 : 25), v: 0 })), events: [] };
    }
    if (st.drive && st.drive.s) return st.drive.view || st.drive.s;   // yarışta elle sürerken: canlı durum (ekranda ara değerli)
    return st.sim;
  }

  // ---------- çizim ----------
  function drawWind(w, t) {
    const g = $('windLayer'); g.innerHTML = '';
    const vb = st.vb, d = E.fwd(w + 180), px = E.fwd(w + 90);
    const cx0 = vb.x + vb.w / 2, cy0 = vb.y + vb.h / 2, R = Math.hypot(vb.w, vb.h) / 2 + 100;
    const spacing = 95, n = Math.ceil(2 * R / spacing), len = 70;
    for (let i = 0; i < n; i++) {
      const lateral = -R + i * spacing + 40, along = ((t * 45 + i * 137) % (2 * R)) - R;
      const cx = cx0 + px.x * lateral + d.x * along, cy = cy0 + px.y * lateral + d.y * along;
      el('line', { x1: cx - d.x * len / 2, y1: cy - d.y * len / 2, x2: cx + d.x * len / 2, y2: cy + d.y * len / 2,
        stroke: 'rgba(255,255,255,0.14)', 'stroke-width': 2, 'stroke-linecap': 'round' }, g);
    }
    // akıntı: suda akış yönünde kayan turkuaz oklar (güce göre sık ve hızlı); yönlü akıntı ayarı görünsün
    const sea = (st.sim && st.sim.sea) || st.sea;
    if (sea && sea.current) {
      const c = E.fwd((sea.from == null ? w : sea.from) + 180), cp = { x: -c.y, y: c.x }, sp = 190 - sea.current * 25, m = Math.ceil(2 * R / sp);
      for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) {
        if ((i + j) % 2) continue;
        const along = ((t * (6 + sea.current * 5) + j * sp) % (2 * R)) - R, lat = -R + i * sp + (j % 3) * 20;
        const x = cx0 + cp.x * lat + c.x * along, y = cy0 + cp.y * lat + c.y * along;
        if (x < vb.x - 20 || x > vb.x + vb.w + 20 || y < vb.y - 20 || y > vb.y + vb.h + 20) continue;
        el('path', { d: `M${(x - c.x * 9 + cp.x * 6).toFixed(1)},${(y - c.y * 9 + cp.y * 6).toFixed(1)} L${x.toFixed(1)},${y.toFixed(1)} L${(x - c.x * 9 - cp.x * 6).toFixed(1)},${(y - c.y * 9 - cp.y * 6).toFixed(1)}`,
          fill: 'none', stroke: 'rgba(94,234,212,0.28)', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
      }
    }
  }

  function drawGusts(v) {
    const g = $('gustLayer'); g.innerHTML = '';
    v.gusts.forEach((gu, i) => {
      const gg = el('g', { transform: `translate(${gu.x.toFixed(1)},${gu.y.toFixed(1)}) rotate(${v.wind.toFixed(1)})`, class: 'gust', 'data-gust': i }, g);
      el('ellipse', { rx: gu.rx, ry: gu.ry, fill: 'url(#gustFill)' }, gg);
      const on = st.gsel === i;
      if (on) {   // seçili sağanak: dışa doğru yayılan halka, ayar kartıyla aynı renk
        const ph = (performance.now() / 1400) % 1, k = 1 + ph * 0.12;
        el('ellipse', { rx: gu.rx * k, ry: gu.ry * k, fill: 'none', stroke: '#38bdf8', 'stroke-opacity': (1 - ph) * 0.7, 'stroke-width': 3 }, gg);
        el('ellipse', { rx: gu.rx, ry: gu.ry, fill: 'rgba(56,189,248,.08)', stroke: 'none' }, gg);
      }
      el('ellipse', { rx: gu.rx, ry: gu.ry, fill: 'none', stroke: on ? '#38bdf8' : 'rgba(125,211,252,.45)', 'stroke-width': on ? 3 : 1.5, 'stroke-dasharray': on ? '' : '3 7' }, gg);
      // kedi pençesi (cat's paw) çizgileri: rüzgarla akar
      for (let k = 0; k < 9; k++) {
        const ax = ((k * 53) % (gu.rx * 1.2)) - gu.rx * 0.6, base = ((k * 97) % (gu.ry * 1.4)) - gu.ry * 0.7;
        const ay = ((base + v.t * 70 + gu.ry) % (gu.ry * 1.6)) - gu.ry * 0.8;
        el('path', { d: `M${ax - 9},${ay} q 4,-3 9,0 t 9,0`, fill: 'none', stroke: 'rgba(186,230,253,.35)', 'stroke-width': 1.4 }, gg);
      }
      const lab = el('g', { transform: `rotate(${-v.wind.toFixed(1)})` }, gg);
      el('text', { y: -gu.ry * 0.15, 'text-anchor': 'middle', fill: '#bae6fd', 'font-size': 14, 'font-weight': 700, 'paint-order': 'stroke', stroke: 'rgba(2,21,38,.8)', 'stroke-width': 4 }, lab).textContent = v.gusts.length > 1 ? `SAĞANAK ${i + 1}` : 'SAĞANAK';
      el('text', { y: -gu.ry * 0.15 + 17, 'text-anchor': 'middle', fill: '#7dd3fc', 'font-size': 12, 'paint-order': 'stroke', stroke: 'rgba(2,21,38,.8)', 'stroke-width': 4 }, lab).textContent = 'tekneler %25 hızlı';
      if (on) el('text', { y: -gu.ry * 0.15 - 20, 'text-anchor': 'middle', fill: '#38bdf8', 'font-size': 11, 'font-weight': 800, 'letter-spacing': '.08em', 'paint-order': 'stroke', stroke: 'rgba(2,21,38,.85)', 'stroke-width': 4 }, lab).textContent = 'SEÇİLİ · AYARLAR ALTTA';
      else { const tag = 'dokun: düzenle', tw = tag.length * 6.4 + 16;
        el('rect', { x: -tw / 2, y: -gu.ry * 0.15 + 26, width: tw, height: 18, rx: 9, fill: 'rgba(2,21,38,.55)', stroke: 'rgba(125,211,252,.35)' }, lab);
        el('text', { x: 0, y: -gu.ry * 0.15 + 39, 'text-anchor': 'middle', fill: '#7dd3fc', 'font-size': 10.5, 'font-weight': 600 }, lab).textContent = tag; }
    });
  }

  // elle sürmede çıkılamayan alanın sınırı: ince, soluk kesik çizgi (göze batmasın)
  function drawBounds() {
    const Bd = S.bounds(), g = $('courseLayer');
    el('rect', { x: Bd.x0, y: Bd.y0, width: Bd.x1 - Bd.x0, height: Bd.y1 - Bd.y0, rx: 18, fill: 'none', stroke: 'rgba(186,230,253,.22)', 'stroke-width': 1.2, 'stroke-dasharray': '10 10', 'vector-effect': 'non-scaling-stroke', 'pointer-events': 'none' }, g);
  }
  let cbNode = null;
  // ---------- Start bayrakları (5-4-1) ve hazırlık bayrağının yasaklı bölgesi ----------
  const FLAGS = ['P', 'I', 'Z', 'U', 'Siyah'];
  const FLAG_INFO = {
    P: { name: 'P bayrağı', short: 'Özel kural yok · erken çıkan geri döner', zone: '',
      text: "Standart hazırlık bayrağı, ek kısıtlama yok. Start işaretinde gövdesinin bir parçası hattın üstünde olan tekne erken (OCS) sayılır: hattın altına tamamen dönüp yeniden start eder (K28, K29.1)." },
    I: { name: 'I bayrağı', short: 'Son 1 dk hattın üstü: uçlardan dolaş', zone: 'Hattın ve uzantılarının üstü',
      text: "Son dakikada gövdesinin bir parçası hattın ya da uzantılarının üstünde olan tekne, start etmeden önce bir ucun (pin ya da hakem botu) uzantısından dolaşıp hattın altına geçmeli; hattın içinden geri dönmek yetmez (K30.1)." },
    Z: { name: 'Z bayrağı', short: 'Son 1 dk üçgen: %20 puan cezası', zone: 'Pin · hakem botu · şamandıra üçgeni',
      text: "Son dakikada pin, hakem botu ve orsa şamandırasının üçgenine giren tekne duruşmasız %20 puan cezası alır (kayıtlı tekne sayısının %20'si, K30.2). Start'ta hattın üstündeyse yine geri dönüp start etmeli." },
    U: { name: 'U bayrağı', short: 'Son 1 dk üçgen: diskalifiye (UFD)', zone: 'Pin · hakem botu · şamandıra üçgeni',
      text: "Son dakikada aynı üçgene giren tekne duruşmasız diskalifiye edilir: UFD (K30.3). Geri dönmesi cezayı kaldırmaz. Yalnız yarış yeniden başlatılırsa (genel geri çağırma) ceza silinir." },
    Siyah: { name: 'Siyah bayrak', short: 'Son 1 dk üçgen: diskalifiye (BFD)', zone: 'Pin · hakem botu · şamandıra üçgeni',
      text: "En sert start kuralı. Son dakikada üçgene giren tekne duruşmasız diskalifiye edilir: BFD (K30.4). Genel geri çağırmada yelken numarası ilan edilir, yeniden start'a da katılamaz." }
  };
  const flagNow = v => ((v && v.course) || st.course).flag || 'P';
  const remReal = v => (v.startAt - v.t) * S.CLOCK_SCALE;
  // Bayrak çizimi (30×20 kutu; işaret bayraklarının gerçek desenleri). Sınıf bayrağı: beyaz zemin, sınıfın kısa adı
  function flagMarkup(f, cls) {
    const R = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
    const P = (d, c) => `<path d="${d}" fill="${c}"/>`;
    let in_ = '';
    if (f === 'P') in_ = R(0, 0, 30, 20, '#1d4ed8') + R(10, 6.5, 10, 7, '#fff');
    else if (f === 'I') in_ = R(0, 0, 30, 20, '#facc15') + '<circle cx="15" cy="10" r="5.6" fill="#111"/>';
    else if (f === 'Z') in_ = P('M0,0H30L15,10Z', '#facc15') + P('M30,0V20L15,10Z', '#1d4ed8') + P('M0,20H30L15,10Z', '#dc2626') + P('M0,0V20L15,10Z', '#111');
    else if (f === 'U') in_ = R(0, 0, 15, 10, '#dc2626') + R(15, 0, 15, 10, '#fff') + R(0, 10, 15, 10, '#fff') + R(15, 10, 15, 10, '#dc2626');
    else if (f === 'Siyah') in_ = R(0, 0, 30, 20, '#111');
    else in_ = R(0, 0, 30, 20, '#fff') + `<text x="15" y="13.6" text-anchor="middle" font-size="${cls && cls.length > 4 ? 7 : 8.5}" font-weight="800" fill="#1d3557" style="font-size:${cls && cls.length > 4 ? 7 : 8.5}px">${esc(cls || 'SINIF')}</text>`;
    return in_ + '<rect x="0" y="0" width="30" height="20" fill="none" stroke="rgba(15,23,42,.75)" stroke-width="1"/>';
  }
  const flagSvgTag = f => `<svg class="flag-ico" viewBox="-1 -1 32 22" aria-hidden="true">${flagMarkup(f)}</svg>`;
  const classShort = () => { const n = (S.CLASSES[st.boat.cls] || {}).name || 'Sınıf'; return n.split(' ')[0].slice(0, 4).toUpperCase(); };
  function flagG(parent, f, x, y, sc) {
    const g = el('g', { transform: `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${sc})` }, parent);
    g.innerHTML = flagMarkup(f, classShort());
    return g;
  }
  // Hangi bayrak hangi yükseklikte (0 = aşağıda/yok, 1 = yukarıda); çekilip inerken ~2.5 gerçek sn kayar
  function flagHoist(rem) {
    const ramp = (a, b) => Math.max(0, Math.min(1, (a - b) / 2.5));
    const cls = rem > 0 ? Math.min(1, ramp(300.01, rem) + (rem < 299 ? 1 : 0)) : Math.max(0, 1 + rem / 2.5);
    const prep = rem > 60 ? (rem <= 240 ? ramp(240, rem) : 0) : Math.max(0, 1 - (60 - rem) / 2.5);
    return { cls: Math.min(1, cls), prep };
  }
  // Hakem botunun direğinde sinyal bayrakları (sahnede; dünya koordinatı, okunur kalsın diye dönmez)
  function drawSignalMast(g, v) {
    const { boat } = S.LINE, setup = st.mode === 'setup', rem = setup ? 300 : remReal(v), f = flagNow(v);
    const hz = setup ? { cls: 1, prep: 0 } : flagHoist(rem);
    if (!setup && rem < -2.5) return;
    const mx = boat.x + 46, top = boat.y - 92, bot = boat.y - 2;
    el('line', { x1: mx, y1: bot, x2: mx, y2: top, stroke: '#e2e8f0', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, g);
    el('line', { x1: mx - 9, y1: top + 4, x2: mx + 9, y2: top + 4, stroke: '#e2e8f0', 'stroke-width': 1.2 }, g);   // seren
    const slot = (k, i) => bot - 26 - (bot - 26 - (top + 6 + i * 32)) * k;   // aşağıdan yuvasına
    if (hz.cls > 0) flagG(g, 'cls', mx + 1, slot(hz.cls, 0), 1.3);
    if (hz.prep > 0 && f) flagG(g, f, mx + 1, slot(hz.prep, 1), 1.3);
  }
  // Son dakikanın yasaklı bölgesi: I → hattın ve uzantılarının üstü (uçlardan dolaşma okları); Z/U/Siyah → üçgen
  function drawZone(g, v) {
    const f = flagNow(v), info = FLAG_INFO[f], rule = S.FLAG_RULE[f];
    if (!rule || !st.show.zone) return;
    const setup = st.mode === 'setup', rem = setup ? null : remReal(v);
    let level;                                                // 'preview' | 'soon' | 'on'
    if (setup) { if (st.cat !== 'course') return; level = 'preview'; }
    else if (rem > 60 && rem <= 240) level = 'soon';
    else if (rem > 0 && rem <= 60) level = 'on';
    else return;
    const pulse = level === 'on' ? 0.5 + 0.5 * Math.sin(performance.now() / 260) : 0;
    const fillA = level === 'on' ? 0.22 + 0.1 * pulse : level === 'preview' ? 0.2 : 0.09;
    const strokeA = level === 'soon' ? 0.55 : 0.95, dash = level === 'on' ? 'none' : '9 7';
    const { pin, boat } = S.LINE, M = S.MARK, zg = el('g', { class: 'flag-zone', 'pointer-events': 'none' }, g);
    const red = a => `rgba(248,60,60,${a.toFixed(2)})`;
    const cx = (pin.x + boat.x) / 2, ly = pin.y;
    if (rule === 'tri') {
      el('path', { d: `M${pin.x},${pin.y} L${boat.x},${boat.y} L${M.x},${M.y} Z`, fill: red(fillA), stroke: red(strokeA), 'stroke-width': level === 'on' ? 2.5 : 1.8, 'stroke-dasharray': dash, 'stroke-linejoin': 'round' }, zg);
    } else {
      const x0 = st.vb.x - 50, x1 = st.vb.x + st.vb.w + 50, bh = 120;
      if (!$('zoneGrad')) {
        const lg = el('linearGradient', { id: 'zoneGrad', x1: 0, y1: 1, x2: 0, y2: 0 }, $('course').querySelector('defs') || el('defs', {}, $('course')));
        el('stop', { offset: 0, 'stop-color': '#ef4444', 'stop-opacity': 1 }, lg); el('stop', { offset: 1, 'stop-color': '#ef4444', 'stop-opacity': 0 }, lg);
      }
      el('rect', { x: x0, y: ly - bh, width: x1 - x0, height: bh, fill: 'url(#zoneGrad)', opacity: (fillA * 2.2).toFixed(2) }, zg);
      el('line', { x1: x0, y1: ly, x2: x1, y2: ly, stroke: red(strokeA), 'stroke-width': level === 'on' ? 2.5 : 1.8, 'stroke-dasharray': '10 7' }, zg);
      // uçlardan dolaşma okları (hattın üstünden, ucun dışından, hattın altına)
      const arrow = (ex, o, r) => `M${ex - o * 34},${ly - 46} C${ex + o * (r - 10)},${ly - 70} ${ex + o * (r + 18)},${ly - 6} ${ex + o * (r - 6)},${ly + 30}`;
      for (const [ex, o, r] of [[pin.x, -1, 46], [boat.x, 1, 92]])
        el('path', { d: arrow(ex, o, r), fill: 'none', stroke: level === 'on' ? '#fca5a5' : red(0.7), 'stroke-width': 2.2, 'stroke-dasharray': '6 5', 'marker-end': 'url(#arrowHead)' }, zg);
    }
    const t1 = level === 'preview' ? `Önizleme · ${info.name}: son dakikada yasaklı bölge` : level === 'soon' ? `${info.name}: son dakikada burası yasak` : `YASAKLI BÖLGE · ${info.name} · son dakika`;
    const t2 = info.short;
    const ty = rule === 'tri' ? ly - Math.min(150, (ly - M.y) * 0.3) : ly - 92;
    const tt = { 'text-anchor': 'middle', 'paint-order': 'stroke', stroke: 'rgba(2,21,38,.85)', 'stroke-width': 3.5 };
    el('text', { x: cx, y: ty, fill: level === 'on' ? '#fecaca' : '#fca5a5', 'font-size': 13, 'font-weight': 800, ...tt }, zg).textContent = t1;
    el('text', { x: cx, y: ty + 16, fill: '#fee2e2', 'font-size': 11.5, 'font-weight': 600, ...tt }, zg).textContent = t2;
  }
  function drawCourse(v) {
    const g = $('courseLayer'); g.innerHTML = '';
    const { pin, boat } = S.LINE, M = S.MARK, w = v.wind;
    // layline'lar: geçiş noktasından geriye, iki kontranın orsa rotası
    const wp = S.waypoint(w);
    for (const tack of ['starboard', 'port']) {
      const f = E.fwd(E.tackHeading(w, tack));
      el('line', { x1: wp.x, y1: wp.y, x2: wp.x - f.x * 900, y2: wp.y - f.y * 900, stroke: tack === 'starboard' ? 'rgba(34,197,94,.45)' : 'rgba(239,68,68,.45)', 'stroke-width': 1.5, 'stroke-dasharray': '4 8' }, g);
    }
    const lf = E.fwd(E.tackHeading(w, 'port'));
    el('text', { x: wp.x - lf.x * 230 - 8, y: wp.y - lf.y * 230, 'text-anchor': 'end', fill: 'rgba(252,165,165,.8)', 'font-size': 11 }, g).textContent = 'iskele layline';
    const rf = E.fwd(E.tackHeading(w, 'starboard'));
    el('text', { x: wp.x - rf.x * 230 + 8, y: wp.y - rf.y * 230, fill: 'rgba(134,239,172,.8)', 'font-size': 11 }, g).textContent = 'sancak layline';
    // ayarlardaki anahtar: pin ve hakem botu layline'ları
    if (st.show.startLay) E.drawStartLaylines(el, g, S.LINE, w);
    drawZone(g, v);                                     // hazırlık bayrağının yasaklı bölgesi (son dakika)
    // start hattı
    el('line', { x1: pin.x, y1: pin.y, x2: boat.x, y2: boat.y, stroke: '#ffd166', 'stroke-width': 2, 'stroke-dasharray': '10 8', opacity: .9 }, g);
    el('circle', { cx: pin.x, cy: pin.y, r: 7, fill: '#ff8c42', stroke: '#fff', 'stroke-width': 1.5 }, g);
    el('text', { x: pin.x, y: pin.y + 24, 'text-anchor': 'middle', fill: '#ffd166', 'font-size': 12 }, g).textContent = 'Pin';
    cbNode = cbNode || E.drawCommitteeBoat(el, g);     // bir kez çizilir; bayrak dalgası kesilmesin
    g.appendChild(cbNode);
    cbNode.setAttribute('transform', E.committeeBoatTransform(boat.x, boat.y, w));
    el('text', { x: boat.x + 14, y: boat.y + 60, 'text-anchor': 'middle', fill: '#ffd166', 'font-size': 12, 'paint-order': 'stroke', stroke: 'rgba(0,0,0,.45)', 'stroke-width': 3 }, g).textContent = 'Hakem botu';
    drawSignalMast(g, v);
    // hat avantajı (bias)
    const bias = E.norm180(w);                          // hat yatay: rüzgar sağa döndükçe hakem botu ucu avantajlı
    const bt = Math.abs(bias) < 3 ? 'Hat dik: iki uç eşit' : (bias > 0 ? `Hakem botu ucu avantajlı (${Math.round(bias)}°)` : `Pin ucu avantajlı (${Math.round(-bias)}°)`);
    el('text', { x: (pin.x + boat.x) / 2, y: pin.y - 12, 'text-anchor': 'middle', fill: 'rgba(255,209,102,.85)', 'font-size': 12, 'font-weight': 600, 'paint-order': 'stroke', stroke: 'rgba(0,0,0,.5)', 'stroke-width': 3 }, g).textContent = bt;
    // orsa şamandırası
    el('circle', { cx: M.x, cy: M.y, r: 9, fill: '#ff8c42', stroke: '#fff', 'stroke-width': 1.5 }, g);
    el('line', { x1: M.x, y1: M.y - 9, x2: M.x, y2: M.y - 28, stroke: '#fff', 'stroke-width': 1.5 }, g);
    el('path', { d: `M${M.x},${M.y - 28} l 12,4 l -12,4 z`, fill: '#ff8c42' }, g);
    el('text', { x: M.x - 16, y: M.y + 4, 'text-anchor': 'end', fill: '#ffd166', 'font-size': 12, 'font-weight': 600 }, g).textContent = 'Orsa şamandırası';
    // dönüş yönü oku (iskeleden: saat yönünün tersine)
    el('path', { d: `M${M.x + 22},${M.y - 14} A 26 26 0 0 0 ${M.x - 22},${M.y - 14}`, fill: 'none', stroke: 'rgba(255,209,102,.7)', 'stroke-width': 1.5, 'marker-end': 'url(#arrowHead)' }, g);
  }

  const boomSm = { beta: null, ts: 0, k: 0.45 };          // derece / ms
  function drawBoat(parent, b, w, t, sel) {
    const sail = E.sailState(b.h, w);
    const op = b.phase === 'done' ? Math.max(0.15, 1 - (t - b.doneAt) / 5) : 1;
    const wrap = el('g', { opacity: op.toFixed(2), 'data-boat': b.id, class: 'boat' }, parent);
    if (b.mine && !sel) el('circle', { cx: b.x.toFixed(1), cy: b.y.toFixed(1), r: 31, fill: 'rgba(251,146,60,.12)', stroke: 'rgba(251,146,60,.7)', 'stroke-width': 1.5, 'stroke-dasharray': '4 4' }, wrap);
    if (sel) {                                           // seçili: dolu mavi halka + dışa yayılan nabız
      const ph = (performance.now() / 1400) % 1;
      el('circle', { cx: b.x.toFixed(1), cy: b.y.toFixed(1), r: (34 + ph * 14).toFixed(1), fill: 'none', stroke: '#38bdf8', 'stroke-width': 2.5, opacity: (0.7 * (1 - ph)).toFixed(2) }, wrap);
      el('circle', { cx: b.x.toFixed(1), cy: b.y.toFixed(1), r: 33, fill: 'rgba(56,189,248,.16)', stroke: '#38bdf8', 'stroke-width': 3 }, wrap);
    }
    if (b.phase === 'penalty') el('circle', { cx: b.x.toFixed(1), cy: b.y.toFixed(1), r: 29, fill: 'none', stroke: '#f87171', 'stroke-width': 2, 'stroke-dasharray': '6 4' }, wrap);
    if (b.inGust > 0.2 && b.phase !== 'wait') el('circle', { cx: b.x.toFixed(1), cy: b.y.toFixed(1), r: 26, fill: 'none', stroke: 'rgba(125,211,252,.6)', 'stroke-width': 1.5 }, wrap);
    const g = el('g', { transform: `translate(${b.x.toFixed(1)},${b.y.toFixed(1)}) rotate(${b.h.toFixed(1)})` }, wrap);
    el('path', { d: 'M0,-25 C 9,-16 11,2 9,22 L -9,22 C -11,2 -9,-16 0,-25 Z', fill: b.color, stroke: '#fff', 'stroke-width': 1.5 }, g);
    el('path', { d: 'M0,-20 C 6,-13 7,2 6,18 L -6,18 C -7,2 -6,-13 0,-20 Z', fill: 'rgba(255,255,255,0.18)' }, g);
    const my = -6, seed = E.seedOf(b.id);
    // elle sürerken yelken iskotaya göre (fazla salıksa pırpırlar); yarışta iskota salınmışsa da öyle
    const drv = !!(st.drive && b.mine), tt = drv ? performance.now() / 1000 : t;
    const sheet = drv ? b.sheet : b.sheetOff ? E.sailState(b.h, w).boom + b.sheetOff : null;
    const pose = E.sailPose(b.h, w, { v: drv ? null : b.v, base: 55, t: tt, seed, sheet, back: !!b.back && (drv || b.hand) });
    if (drv) {                                          // kavançada bumba bir yandan öbürüne savrulur (anında atlamaz)
      const now = performance.now(), p = boomSm;
      if (p.beta != null && now - p.ts < 300) pose.beta = p.beta + Math.max(-p.k * (now - p.ts), Math.min(p.k * (now - p.ts), pose.beta - p.beta));
      p.beta = pose.beta; p.ts = now;
    }
    const sh = E.sailShape(pose, tt, seed, 27, my);
    el('path', { d: sh.d, fill: 'rgba(255,255,255,0.85)', stroke: '#fff', 'stroke-width': 1 }, g);
    el('line', { x1: 0, y1: my, x2: sh.tip.x.toFixed(1), y2: sh.tip.y.toFixed(1), stroke: '#222', 'stroke-width': 1.5 }, g);
    // etiket
    const tk = sail.tack === 'starboard' ? 'S' : 'İ';
    const lab = el('g', { transform: `translate(${b.x.toFixed(1)},${(b.y + 36).toFixed(1)})` }, wrap);
    const idTxt = b.id;
    const wTxt = 7.1 * idTxt.length + 26 + (b.ignoresRules ? 12 : 0);
    el('rect', { x: -wTxt / 2, y: -10, width: wTxt, height: 19, rx: 9, fill: b.mine ? 'rgba(124,45,18,.9)' : 'rgba(7,18,30,.78)', stroke: sel ? '#38bdf8' : b.ignoresRules ? '#f87171' : b.mine ? '#fb923c' : 'rgba(255,255,255,.25)', 'stroke-width': sel ? 2.2 : 1 }, lab);
    if (b.mine && b.manual) {                            // senin teknen manuelde: etiketin solunda turuncu "M" (manuel)
      el('rect', { x: -wTxt / 2 - 20, y: -8.5, width: 17, height: 17, rx: 5, fill: '#fb923c', stroke: '#fff', 'stroke-width': 1 }, lab);
      el('text', { x: -wTxt / 2 - 11.5, y: 4, 'text-anchor': 'middle', fill: '#2a1204', 'font-size': 11, 'font-weight': 900 }, lab).textContent = 'M';
    }
    el('text', { x: -wTxt / 2 + 7, y: 4, fill: '#fff', 'font-size': 11.5, 'font-weight': 700 }, lab).textContent = idTxt;
    if (b.ignoresRules) el('text', { x: -wTxt / 2 + 9 + 7.1 * idTxt.length, y: 4, fill: '#f87171', 'font-size': 12, 'font-weight': 900 }, lab).textContent = '!';
    el('rect', { x: wTxt / 2 - 17, y: -7, width: 13, height: 13, rx: 3.5, fill: tk === 'S' ? '#22c55e' : '#ef4444' }, lab);
    el('text', { x: wTxt / 2 - 10.5, y: 3.5, 'text-anchor': 'middle', fill: '#fff', 'font-size': 9.5, 'font-weight': 800 }, lab).textContent = tk;
    if (b.sailor) el('text', { x: 0, y: 21, 'text-anchor': 'middle', fill: b.mine ? '#fed7aa' : '#e2e8f0', 'font-size': 10.5, 'font-weight': 700,
      'paint-order': 'stroke', stroke: 'rgba(2,12,22,.9)', 'stroke-width': 3 }, lab).textContent = b.sailor;
    // hız: sağanakta yeşil ↑, pis rüzgarda kırmızı ↓
    if (st.show.speed && (drv || b.phase === 'race' || b.phase === 'round' || b.phase === 'ocs' || b.phase === 'penalty')) {
      const up = b.inGust > 0.25, down = b.shadow > 0.05;   // gölgedeki her tekne ↓ gösterir
      const col = down ? '#f87171' : up ? '#4ade80' : 'rgba(226,232,240,.85)';
      const txt = b.v < -0.5 ? `geri ${S.knots(-b.v).toFixed(1)} kn` : `${S.knots(Math.max(0, b.v)).toFixed(1)} kn${down ? ' ↓' : up ? ' ↑' : ''}`;
      el('text', { x: 0, y: b.sailor ? 33 : 22, 'text-anchor': 'middle', fill: col, 'font-size': 10.5, 'font-weight': down || up ? 800 : 600,
        'paint-order': 'stroke', stroke: 'rgba(2,12,22,.85)', 'stroke-width': 3, 'font-variant-numeric': 'tabular-nums' }, lab).textContent = txt;
    }
  }
  // Senin teknenin çizilen rotası (kalan kısmı) ve çizilmekte olan çizgi
  function drawRoute(parent, v) {
    const pts2 = a => a.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const m = v.boats.find(b => b.mine);
    if (!st.drawMode && m && m.route && (m.routeIdx || 0) < m.route.length && !m.finish) {
      const rest = m.route.slice(m.routeIdx || 0), all = st.mode === 'setup' ? rest : [{ x: m.x, y: m.y }, ...rest];
      el('polyline', { points: pts2(all), fill: 'none', stroke: 'rgba(251,146,60,.85)', 'stroke-width': 2.5, 'stroke-dasharray': '8 6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, parent);
      const end = rest[rest.length - 1];
      el('circle', { cx: end.x.toFixed(1), cy: end.y.toFixed(1), r: 6, fill: '#fb923c', stroke: '#fff', 'stroke-width': 1.5 }, parent);
    }
    if (st.drawMode) {
      const o = (() => { const m = mineNow(); return m ? { x: m.x, y: m.y } : null; })();
      const pts = o ? [o, ...st.draft] : st.draft;
      if (pts.length > 1) el('polyline', { points: pts2(pts), fill: 'none', stroke: '#fdba74', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, parent);
      for (const p of st.draft) el('circle', { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 4, fill: '#fdba74', stroke: 'rgba(0,0,0,.5)' }, parent);
    }
    if (st.legPrev) {
      const { from: a, to: b, label } = st.legPrev;
      el('line', { x1: a.x.toFixed(1), y1: a.y.toFixed(1), x2: b.x.toFixed(1), y2: b.y.toFixed(1), stroke: '#fdba74', 'stroke-width': 3, 'stroke-dasharray': '10 6', 'marker-end': 'url(#routeHead)' }, parent);
      el('text', { x: ((a.x + b.x) / 2 + 12).toFixed(1), y: ((a.y + b.y) / 2).toFixed(1), fill: '#fdba74', 'font-size': 12, 'font-weight': 700,
        'paint-order': 'stroke', stroke: 'rgba(0,0,0,.75)', 'stroke-width': 3.5 }, parent).textContent = label;
    }
    if (st.drawPts && st.drawPts.length > 1) el('polyline', { points: pts2(st.drawPts), fill: 'none', stroke: '#fdba74', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, parent);
  }
  // Rüzgar gölgesi (pis rüzgar) konileri
  function drawShadows(parent, boats, w) {
    for (const b of boats) {
      if (!(b.phase === 'race' || b.phase === 'round' || b.phase === 'ocs')) continue;
      el('polygon', { points: E.shadowPolygon(b, w), fill: 'rgba(2,10,20,.3)', stroke: 'rgba(248,113,113,.4)', 'stroke-dasharray': '3 4' }, parent);
    }
  }
  // Notlar: kalabalıkta üst üste binmesin (önce senin teknen, sonra hatalar, sonra kurallar)
  function drawNotes(parent, boats, t) {
    const pr = b => (b.mine ? 0 : 10) + (b.noteKind === 'bad' ? 0 : b.noteKind === 'good' ? 1 : 2);
    const placed = [];
    for (const b of boats.filter(b => b.note && t < b.noteUntil).sort((a, c) => pr(a) - pr(c))) {
      const w = b.note.length * 6.6, x = b.x, y = b.y - 36;
      if (placed.some(p => Math.abs(p.x - x) < (p.w + w) / 2 + 4 && Math.abs(p.y - y) < 16)) continue;
      placed.push({ x, y, w });
      const col = b.noteKind === 'bad' ? '#f87171' : b.noteKind === 'good' ? '#34d399' : '#fde68a';
      el('text', { x: x.toFixed(1), y: y.toFixed(1), 'text-anchor': 'middle', fill: col, 'font-size': 12, 'font-weight': 700,
        'paint-order': 'stroke', stroke: 'rgba(0,0,0,.75)', 'stroke-width': 3.5 }, parent).textContent = b.note;
    }
  }

  // Yazı genişliği ölçümü (kutulu metinler tahminle değil ölçüyle; NOTLAR → Arayüz kontrol listesi)
  const measureCtx = document.createElement('canvas').getContext('2d');
  const textW = (str, size, weight = 600) => { measureCtx.font = `${weight} ${size}px Inter, system-ui, -apple-system, sans-serif`; return measureCtx.measureText(str).width; };
  // Gösterge kartı (sol üst): pusula + saat + sınıf satırı tek kartta, altında sinyal kartı.
  // Ekranda hep aynı boyda: 1 birim = 1 ekran pikseli (yatay telefonda 0.85), yakınlaştırmayla büyüyüp küçülmez.
  function drawHud(v) {
    const g = $('hudLayer'); g.innerHTML = '';
    const vb = st.vb, svg = $('course'), sw = svg.clientWidth || vb.w, sh = svg.clientHeight || vb.h, upp = vb.w / sw;
    const k = upp * (sh < 300 ? 0.75 : sh < 420 ? 0.85 : 1);
    const hg = el('g', { transform: `translate(${vb.x.toFixed(1)},${vb.y.toFixed(1)}) scale(${k.toFixed(4)})`, class: 'hud' }, g);
    const w = v.wind, X = 12, Y = 12, H = 100;
    const rem = (v.startAt - v.t) * S.CLOCK_SCALE, on = rem > 0;
    const col = on ? (rem <= 10 ? '#f87171' : '#fbbf24') : '#34d399';
    const bc = v.boat || st.boat, acc = on && rem <= bc.accelAt;
    const sub = acc ? 'Yelken doldur, hızlan!' : `${S.CLASSES[bc.cls].name} · ${bc.windKn} kn` + (on ? ` · hızlan ${bc.accelAt} sn` : '');
    const subW = textW(sub, 11, 700) + (acc ? 20 : 0);
    const RX = X + 100, W = Math.max(236, Math.ceil(100 + 16 + subW + 16));
    el('rect', { x: X, y: Y, width: W, height: H, rx: 16, fill: 'rgba(9,20,33,0.86)', stroke: 'rgba(148,178,208,.22)', 'stroke-width': 1 }, hg);
    // pusula
    const cx = X + 50, cy = Y + 44, r = 32;
    el('circle', { cx, cy, r, fill: 'rgba(255,255,255,.03)', stroke: 'rgba(255,255,255,.16)', 'stroke-width': 1 }, hg);
    for (let a = 0; a < 360; a += 30) { const f = E.fwd(a), r1 = a % 90 ? r - 4 : r - 7;
      el('line', { x1: cx + f.x * r1, y1: cy + f.y * r1, x2: cx + f.x * (r - 1), y2: cy + f.y * (r - 1), stroke: a === 0 ? '#7dd3fc' : 'rgba(255,255,255,.32)', 'stroke-width': a % 90 ? 1 : 1.6 }, hg); }
    const d = E.fwd(w + 180);
    el('line', { x1: cx - d.x * 21, y1: cy - d.y * 21, x2: cx + d.x * 14, y2: cy + d.y * 14, stroke: '#7dd3fc', 'stroke-width': 3.2, 'stroke-linecap': 'round', 'marker-end': 'url(#arrowHead)' }, hg);
    el('text', { x: cx, y: Y + H - 10, 'text-anchor': 'middle', fill: 'rgba(255,255,255,.62)', 'font-size': 10, 'font-weight': 700, 'letter-spacing': .6 }, hg).textContent = `RÜZGAR ${Math.round(E.norm360(w))}°`;
    // ayraç + saat
    el('line', { x1: RX, y1: Y + 14, x2: RX, y2: Y + H - 14, stroke: 'rgba(148,178,208,.18)' }, hg);
    el('circle', { cx: RX + 20, cy: Y + 25, r: 3.5, fill: col }, hg);
    el('text', { x: RX + 30, y: Y + 29, fill: 'rgba(255,255,255,.62)', 'font-size': 10, 'font-weight': 700, 'letter-spacing': 1 }, hg).textContent = on ? "START'A" : 'YARIŞ SÜRESİ';
    el('text', { x: RX + 16, y: Y + 62, fill: col, 'font-size': 30, 'font-weight': 800, 'font-variant-numeric': 'tabular-nums', 'letter-spacing': -.5 }, hg).textContent = on ? S.fmt(rem / S.CLOCK_SCALE) : S.fmt(-rem / S.CLOCK_SCALE);
    if (acc) el('rect', { x: RX + 10, y: Y + 72, width: subW, height: 20, rx: 10, fill: 'rgba(251,191,36,.94)' }, hg);
    el('text', { x: RX + (acc ? 20 : 16), y: Y + 86, fill: acc ? '#1c1300' : 'rgba(255,255,255,.78)', 'font-size': 11, 'font-weight': 700 }, hg).textContent = sub;
    let y2 = Y + H + 8;
    const sea = v.sea || st.sea;
    if (sea && (sea.current || sea.waves)) {
      const txt = [sea.current ? `Akıntı ${SEA_TXT.current[sea.current]}${sea.from != null ? ' · ' + S.CURRENT_FROM[sea.from] : ''}` : '', sea.waves ? `Dalga ${SEA_TXT.waves[sea.waves]}` : ''].filter(Boolean).join(' · ');
      const tw = textW(txt, 10.5, 600) + 24;
      el('rect', { x: X, y: y2, width: tw, height: 22, rx: 11, fill: 'rgba(9,20,33,0.86)', stroke: 'rgba(125,211,252,.4)' }, hg);
      el('text', { x: X + tw / 2, y: y2 + 15, 'text-anchor': 'middle', fill: '#bae6fd', 'font-size': 10.5, 'font-weight': 600 }, hg).textContent = txt;
      y2 += 30;
    }
    drawSignalCard(hg, v, X, y2, W);
  }
  // Sinyal kartı: o an direkte hangi bayraklar var, sıradaki işaret ve kural (eğitici)
  function drawSignalCard(hg, v, x, y, minW = 0) {
    const f = flagNow(v), info = FLAG_INFO[f], setup = st.mode === 'setup', rem = setup ? 300 : remReal(v);
    if (!setup && rem < -20) return;                               // start'tan ~20 sn sonra kart kalkar
    const fn = f === 'Siyah' ? 'Siyah bayrak' : `${f} bayrağı`;
    let t1, t2, tone = 'info';
    if (setup) { t1 = `Start 5-4-1 · hazırlık: ${fn}`; t2 = info.short; }
    else if (rem > 240) { t1 = 'Uyarı (5:00) · sınıf bayrağı'; t2 = `4:00'te ${fn} çekilecek`; }
    else if (rem > 60) { t1 = `Hazırlık (4:00) · ${fn}`; t2 = info.short; tone = S.FLAG_RULE[f] ? 'warn' : 'info'; }
    else if (rem > 0) { t1 = `Son dakika · ${fn} indi`; t2 = S.FLAG_RULE[f] ? info.short : 'Erken çıkan geri dönüp start eder'; tone = S.FLAG_RULE[f] ? 'bad' : 'warn'; }
    else { t1 = 'Start · sınıf bayrağı indi'; t2 = S.FLAG_RULE[f] ? 'Yasaklı bölge kalktı' : 'İyi yarışlar!'; }
    const hz = setup ? { cls: 1, prep: 1 } : flagHoist(rem);
    const tw = Math.max(textW(t1, 11.5, 800), textW(t2, 10.5, 600)), w = Math.max(minW, Math.ceil(74 + tw + 16)), h = 46;
    const col = { info: 'rgba(255,255,255,.18)', warn: 'rgba(251,191,36,.7)', bad: 'rgba(248,113,113,.85)' }[tone];
    el('rect', { x, y, width: w, height: h, rx: 14, fill: 'rgba(9,20,33,0.86)', stroke: tone === 'info' ? 'rgba(148,178,208,.22)' : col, 'stroke-width': tone === 'info' ? 1 : 1.5 }, hg);
    // iki bayrak yuvası: sınıf + hazırlık (inmişse soluk çerçeve)
    [['cls', hz.cls], [f, hz.prep]].forEach(([k, on], i) => {
      const fx = x + 10 + i * 31, fy = y + 14;
      if (on > 0.5) flagG(hg, k, fx, fy, 0.9);
      else el('rect', { x: fx, y: fy, width: 27, height: 18, rx: 2, fill: 'none', stroke: 'rgba(255,255,255,.28)', 'stroke-dasharray': '3 3' }, hg);
    });
    el('text', { x: x + 74, y: y + 20, fill: tone === 'bad' ? '#fca5a5' : tone === 'warn' ? '#fcd34d' : '#fff', 'font-size': 11.5, 'font-weight': 800 }, hg).textContent = t1;
    el('text', { x: x + 74, y: y + 35, fill: 'rgba(255,255,255,.82)', 'font-size': 10.5, 'font-weight': 600 }, hg).textContent = t2;
  }

  function render() {
    if (st.cam.follow || st.tween) applyCam();
    const v = view(), w = v.wind;
    drawWind(w, st.mode === 'setup' ? performance.now() / 1000 : v.t);
    drawGusts(v); drawCourse(v); drawBounds();
    const bl = $('boatLayer'); bl.innerHTML = '';
    const order = v.boats.filter(b => !b.gone).sort((a, b) => (a.mine ? 1 : 0) - (b.mine ? 1 : 0));
    if (st.show.shadow && st.mode !== 'setup') drawShadows(bl, order, w);
    drawRoute(bl, v);
    for (const b of order) drawBoat(bl, b, w, v.t, st.sel === b.id);
    drawNotes(bl, order, v.t);
    drawHud(v);
    updateBar(v);
  }

  const speedTxt = b => (b.speedK && Math.abs(b.speedK - 1) > 1e-6 ? ` · ${b.speedK > 1 ? '+' : '−'}${Math.round(Math.abs(b.speedK - 1) * 100)}% hız` : '') + (b.drift ? (b.drift > 1 ? ' · çok kayıyor' : ' · kayıyor') : '') + (b.manual ? ' · manuel' : '');
  const SEA_TXT = S.SEA_TXT;
  // ---------- panel ----------
  let lastPanelKey = '';
  function updatePanel(force) {
    const v = view();
    const key = st.mode + '|' + st.course.lineLen + 'x' + st.course.markDist + (st.course.flag || 'P') + '|' + st.gsel + '|' + st.frames.length + '|' + (v.t * 4 | 0) + '|' + st.sel + '|' + v.events.length + '|' + st.mineOnly + '|' + st.fleet.length + '|' + JSON.stringify(v.sea || st.sea) + v.boats.map(b => b.id + (b.sailor || '') + (b.drift || 0) + (b.manual ? 'M' : '') + b.tack + b.persona + b.mine + (b.ignoresRules ? '!' : '') + (b.speedK || 1) + (b.penalties || 0) + b.phase).join();
    if (!force && key === lastPanelKey) return;
    lastPanelKey = key;
    courseUpdate(); gustBarUpdate();
    const label = { setup: 'Kurulum', run: v.t < v.startAt ? "Start'a geri sayım" : 'Yarış', pause: 'Duraklatıldı', end: 'Yarış bitti' }[st.mode];
    st.phaseLabel = label;
    const mine = v.boats.find(b => b.mine);
    $('phaseSub').textContent = st.mode === 'setup' ? 'Tekneleri yerleştir, rüzgarı ayarla, start ver'
      : st.mode === 'end' ? (mine && mine.finish ? `Senin teknen ${finTxt(mine)}` : 'Herkes şamandırayı döndü')
      : mine ? (mine.finish ? `Senin teknen ${finTxt(mine)}` : mine.dsq ? `Senin teknen ${mine.dsq}: diskalifiye` : (() => { const p = predicted(), pm = p && p.boats.find(b => b.mine);
          return pm && pm.finish && !pm.dsq ? `Tahmin: senin teknen ${pm.finish}. olacak · ${S.PERSONAS[mine.persona]}` : `Senin teknen: ${S.PERSONAS[mine.persona]}`; })()) : '';
    // seçili tekne
    const sb = st.sel && (st.mode === 'setup' ? st.fleet : v.boats).find(b => b.id === st.sel);
    const setupSel = st.mode === 'setup';
    $('selBox').classList.toggle('hidden', !sb);
    // tekneye dokununca ayarları kendiliğinden açılır; seçim kalkınca kapanır
    if (sb && st.selShown !== sb.id) { st.selShown = sb.id; openCat('sel', true); }
    else if (!sb && st.selShown) { st.selShown = null; if (st.cat === 'sel') openCat(null); }
    if (sb) {
      $('selTitle').innerHTML = `<span class="boat-id" style="background:${sb.color}">${esc(sb.id)}</span>` + esc((sb.mine ? 'Senin teknen' : `Tekne ${sb.id}`) + (sb.sailor ? ` · ${sb.sailor}` : '')) + '<em>seçili</em>';
      if (document.activeElement !== $('selName')) $('selName').value = sb.sailor || '';
      $('selTackRow').classList.toggle('hidden', !setupSel); $('selSetupRow').classList.toggle('hidden', !setupSel);
      const over = !setupSel && (sb.finish || sb.phase === 'done');
      [...$('selPersona').children, ...$('selSpeed').children, ...$('selDrift').children, ...$('selRules').children].forEach(x => { x.disabled = !!over; });
      [...$('selTack').children].forEach(x => x.classList.toggle('on', x.dataset.v === sb.tack));
      [...$('selPersona').children].forEach(x => x.classList.toggle('on', x.dataset.v === sb.persona));
      [...$('selSpeed').children].forEach(x => x.classList.toggle('on', Math.abs(+x.dataset.v - (sb.speedK || 1)) < 1e-6));
      [...$('selDrift').children].forEach(x => x.classList.toggle('on', +x.dataset.v === (sb.drift || 0)));
      [...$('selRules').children].forEach(x => x.classList.toggle('on', x.dataset.v === (sb.ignoresRules ? 'vermez' : 'uyar')));
      $('btnMakeMine').disabled = sb.mine;
    }
    // sıralama
    const rows = st.mode === 'setup' ? st.fleet.map(b => ({ b, status: S.PERSONAS[b.persona] + ' · ' + (b.tack === 'starboard' ? 'sancak' : 'iskele') + (b.ignoresRules ? ' · yol vermez' : '') + speedTxt(b) })) : S.standings(v).map(r => ({ ...r, status: r.status + speedTxt(r.b) }));
    $('standings').innerHTML = rows.map((r, i) => `<li data-id="${esc(r.b.id)}" class="${r.b.mine ? 'me' : ''} ${r.b.finish ? 'fin' : ''} ${r.b.phase === 'penalty' ? 'pen' : ''} ${st.sel === r.b.id ? 'sel' : ''}"><span class="pos">${st.mode === 'setup' ? '' : i + 1}</span>` +
      `<span class="boat-id" style="background:${r.b.color}">${esc(r.b.id)}</span><span class="nm">${esc(nameOf(r.b))}</span><span class="stt">${esc(r.status)}</span></li>`).join('');
    // olaylar
    const evs = v.events.filter(e => !st.mineOnly || /(^|\s)SEN\b/.test(e.text)).slice(-40).reverse();
    $('events').innerHTML = evs.length ? evs.map(e => `<li class="${e.kind}"><span class="et">${e.t < v.startAt - 1e-6 ? '−' + S.fmt(v.startAt - e.t) : S.fmt(e.t - v.startAt)}</span>${esc(e.text)}</li>`).join('')
      : `<li class="empty">${st.mode === 'setup' ? 'Start verilince kural olayları burada görünür.' : 'Henüz olay yok.'}</li>`;
    const sea = v.sea || st.sea;
    [...$('seaCurrent').children].forEach(x => x.classList.toggle('on', +x.dataset.v === sea.current));
    [...$('seaWaves').children].forEach(x => x.classList.toggle('on', +x.dataset.v === sea.waves));
    [...$('seaFrom').children].forEach(x => x.classList.toggle('on', x.dataset.v === (sea.from == null ? 'w' : String(sea.from))));
    $('seaFrom').classList.toggle('off', !sea.current);
    $('seaFromTxt').textContent = !sea.current ? 'Akıntı yok: önce gücünü seç' : FROM_EFFECT[sea.from == null ? 'w' : sea.from];
    $('seaState').textContent = sea.current || sea.waves ? (sea.current && sea.from != null ? `akıntı ${S.CURRENT_FROM[sea.from]} gelir` : 'tekneler rüzgaraltına kayar') : 'sakin';
    $('seaState').classList.toggle('changed', !!(sea.current || sea.waves));
    boatUpdate();
    saveSetup();
  }
  const nameOf = b => b.sailor || (b.mine ? 'Sen' : b.name);
  const finTxt = b => (b.dsq ? `${b.dsq} (diskalifiye)` : `${b.finish}. oldu${b.zPen ? ` · Z cezasıyla ${b.finish + S.zPoints({ boats: st.fleet })} puan` : ''}`);
  // ---------- Kurulumu bu cihazda sakla (ileride Firebase'e taşınacak) ----------
  const SAVE_KEY = 'ps.sim.setup.v1';
  // Yalnız yerleşim kalır: filo (yer, kontra, isim, taktik, rota), parkur boyu ve ekranda hız. Zorlaştıran ayarlar
  // (rüzgar, sağanak, akıntı/dalga, sınıf/rüzgar hızı, bayrak, yol vermez, manuel, hız farkı, yalpalama) kaydedilmez,
  // her açılışta varsayılandır (kullanıcı 2026-11-13: eklenen ayarlar her açılışta geri gelip işi zorlaştırıyordu).
  const BOAT_KEYS = ['id', 'x', 'y', 'tack', 'persona', 'mine', 'sailor', 'route'];
  function saveSetup() {
    if (st.mode !== 'setup') return;
    const data = { v: 1, course: { lineLen: st.course.lineLen, markDist: st.course.markDist }, vis: st.boat.vis, fleet: st.fleet.map(b => Object.fromEntries(BOAT_KEYS.map(k => [k, b[k]]))) };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { /* özel pencere vb. */ }
  }
  function loadSetup() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { d = null; }
    if (!d || d.v !== 1 || !Array.isArray(d.fleet) || d.fleet.length < 2) return false;
    const c = d.course || {};
    st.course = { ...S.COURSE_DEFAULT, ...(c.lineLen ? { lineLen: +c.lineLen } : {}), ...(c.markDist ? { markDist: +c.markDist } : {}) }; S.setCourse(st.course);   // bayrak hep P
    const vis = d.vis != null ? d.vis : d.boat && d.boat.vis;   // eski kayıt: yalnız ekranda hız tercihi alınır
    if (vis != null) setBoatCfg({ ...S.BOAT_DEFAULT, vis });
    const n = Math.min(16, d.fleet.length), mineIdx = Math.max(0, d.fleet.findIndex(b => b.mine));
    st.fleet = d.fleet.slice(0, n).map((o, i) => {
      const b = S.makeBoat(i, { x: +o.x, y: +o.y }, i === mineIdx ? { mine: true, id: 'SEN', name: 'Senin teknen' } : null);
      if (i !== mineIdx) { b.mine = false; b.color = '#c9d6e3'; }
      b.tack = o.tack === 'port' ? 'port' : 'starboard';
      if (S.PERSONAS[o.persona]) b.persona = o.persona;
      if (o.sailor) b.sailor = String(o.sailor).slice(0, 18);
      if (Array.isArray(o.route) && o.route.length) b.route = o.route;
      return b;
    });
    renumber();
    return true;
  }
  // Tümünü sıfırla (kullanıcı 2026-11-13: eklenen sağanak, akıntı vb. her açılışta geri geliyordu): kayıtlı kurulumu siler,
  // yarışı / elle sürmeyi bitirir, her ayarı varsayılana döndürür. Yanlışlıkla basılmasın diye iki dokunuş (3 sn içinde).
  let clearArm = 0, clearBtn = null;
  const CLEAR_LBL = { btnResetAll: 'Tümünü sıfırla', btnClearSaved: 'Tümünü sıfırla' };
  function clearArmReset() { for (const id in CLEAR_LBL) { const x = $(id); if (!x) continue; x.classList.remove('warn'); const sp = x.querySelector('span'); (sp || x).textContent = CLEAR_LBL[id]; } }
  function clearSaved(e) {
    const btn = (e && e.currentTarget) || $('btnResetAll');
    if (Date.now() - clearArm > 3000 || clearBtn !== btn) {
      clearArmReset(); clearArm = Date.now(); clearBtn = btn; btn.classList.add('warn');
      const sp = btn.querySelector('span'); (sp || btn).textContent = 'Emin misin?';
      toast('Her şey varsayılana dönecek: rüzgar, sağanaklar, akıntı, filo, parkur, isimler. Onaylamak için yeniden dokun');
      setTimeout(() => { if (Date.now() - clearArm >= 2900) clearArmReset(); }, 3000); return;
    }
    clearArm = 0; clearBtn = null; clearArmReset();
    if (st.drawMode) endDraw(false);
    if (st.mode !== 'setup' || st.drive) backToSetup();
    try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem('ps.sim.fastPre'); } catch (er) { /* yok say */ }
    st.course = { ...S.COURSE_DEFAULT }; S.setCourse(st.course);
    st.wind = 0; st.sea = { ...S.SEA_DEFAULT }; setBoatCfg({ ...S.BOAT_DEFAULT }); st.gusts = []; st.gsel = null; st.sel = null; st.fleet = S.defaultFleet(12);
    st.fastPre = true; setSpeed(1);
    st.cam.z = 1; st.cam.follow = false; st.cam.panAt = null; st.cam.x = st.cam.y = null;
    openCat(null); fitViewBox(); applyCam(); updatePanel(true);
    toast('Her şey sıfırlandı: varsayılan filo, rüzgar 0°, sağanak ve akıntı yok');
  }

  // ---------- Geri sayım: tekneler start öncesi neredeyse durur; son dakikaya kadar hızlı geç (varsayılan açık) ----------
  const PRE_FAST = 10;
  const preRem = () => { const v = st.sim; return v ? (v.startAt - v.t) * S.CLOCK_SCALE : 0; };
  const playSpeed = () => (st.fastPre && preRem() > 60 ? Math.max(st.speed, PRE_FAST) : st.speed);
  function jumpTo(realRem) {
    if (!st.frames.length || st.drive) return;
    const t = Math.min(lastT(), Math.max(0, st.sim.startAt - realRem / S.CLOCK_SCALE));
    if (t <= st.playT) return;
    st.playT = t; st.sim = viewAt(t); updatePanel(true);
  }
  function countBarUpdate(v) {
    const setup = st.mode === 'setup', rem = (v.startAt - v.t) * S.CLOCK_SCALE;
    const show = st.drive ? setup : !st.drawMode && (setup || ((st.mode === 'run' || st.mode === 'pause') && rem > 0));   // elle sürerken yalnız kurulumda (süre seçimi)
    $('countBar').classList.toggle('hidden', !show); if (!show) return;
    $('countBar').classList.toggle('setup', setup);
    [...$('cbPre').children].forEach(x => x.classList.toggle('on', +x.dataset.v === st.boat.pre));
    const fastNow = st.fastPre && rem > 60 && st.speed < PRE_FAST;
    $('cbFast').classList.toggle('on', !!st.fastPre); $('cbFast').classList.toggle('live', fastNow);
    $('cbFast').setAttribute('aria-pressed', !!st.fastPre);
    $('cbFast').querySelector('span').textContent = setup ? (st.fastPre ? 'Hızlı 10×' : 'Gerçek zaman') : fastNow ? 'Hızlı 10× · son dk normal' : st.fastPre && rem <= 60 ? 'Son dakika · ' + spTxt(st.speed) : 'Gerçek zaman';
    $('cbJump1').classList.toggle('hidden', setup || rem <= 62);
    $('cbJump0').classList.toggle('hidden', setup || rem <= 12);
  }
  function updateBar(v) {
    countBarUpdate(v);
    const playing = st.mode === 'run';
    $('btnPlay').querySelector('use').setAttribute('href', playing ? '#i-pause' : '#i-play');
    $('btnPlay').title = st.mode === 'setup' ? 'Start ver' : playing ? 'Duraklat' : 'Devam';
    // kurulumda yazılı, belirgin "Start" düğmesi (yalnız simgeyken bulunması zordu, kullanıcı 2026-11-13)
    $('btnPlay').classList.toggle('start', st.mode === 'setup'); $('btnPlayLbl').textContent = st.mode === 'setup' ? 'Start' : '';
    const sc = $('scrub'), maxT = st.frames.length ? st.frames[st.frames.length - 1].t : 0;
    sc.max = maxT; sc.value = v.t; sc.disabled = !st.frames.length;
    sc.style.setProperty('--p', (maxT ? v.t / maxT * 100 : 0) + '%');
    const rem = (v.startAt - v.t) * S.CLOCK_SCALE;
    $('timeLabel').textContent = rem > 0 ? '−' + S.fmt(rem / S.CLOCK_SCALE) : S.fmt(-rem / S.CLOCK_SCALE);
    $('windVal').textContent = `${Math.round(E.norm360(v.wind + (st.mode === 'setup' ? 0 : windPend)))}°`;
    $('fleetVal').textContent = st.fleet.length;
    const setup = st.mode === 'setup';
    ['btnFleetMinus', 'btnFleetPlus', 'btnFleetLine'].forEach(id => { $(id).disabled = !setup; });
    const mine = v.boats.find(b => b.mine);
    $('btnTack').disabled = !mine || setup || !(mine.phase === 'race' || (mine.manual && mine.phase === 'wait'));
    $('btnManual').classList.toggle('on', !!(mine && mine.manual));
    $('btnReset').disabled = st.mode === 'setup';   // kurulumda sıfırlanacak yarış yok
    $('btnManual').disabled = !mine || (!setup && !!mine.finish);
    $('selMinePersona').disabled = !!(mine && mine.manual);
    $('btnTack').classList.toggle('pulse', !!(mine && mine.manual && !setup && mine.phase === 'race'));
    if (mine && document.activeElement !== $('selMinePersona')) $('selMinePersona').value = mine.manual ? 'manuel' : mine.persona;
    if (mine && document.activeElement !== $('selMineSpeed')) $('selMineSpeed').value = String(mine.speedK || 1);
    $('selMineSpeed').disabled = !mine || (!setup && !!mine.finish);
    $('btnMineRules').classList.toggle('on', !!(mine && mine.ignoresRules));
    const hasRoute = !!(mine && mine.route && (mine.routeIdx || 0) < mine.route.length);
    $('btnRoute').disabled = !mine || (!setup && !!mine.finish) || !!mine.manual;
    $('btnRoute').classList.toggle('hidden', !!(mine && mine.manual));   // manuelde rota yok: alt çubukta yer açılsın (Elle sür)
    $('btnRoute').classList.toggle('has', hasRoute);
    $('btnRoute').querySelector('.lbl2').textContent = hasRoute ? 'Rota çizili · düzenle' : 'Rota çiz';
    $('mineRouteRow').classList.toggle('hidden', !!(mine && mine.manual));
    // iskota (yarışta hızını ayarla): kurulumda yok
    const sheetOn = !setup && mine && ['wait', 'race', 'ocs', 'round'].includes(mine.phase);
    $('mineSheetRow').classList.toggle('hidden', !sheetOn);
    if (sheetOn) { const off = mine.sheetOff || 0; $('sheetVal').textContent = off ? `Salık · %${Math.round(S.trimEff(off) * 100)}` : 'Tam hız'; $('sheetVal').classList.toggle('slow', !!off); }
    $('mineNote').textContent = setup ? (mine && mine.manual ? 'Manuel: start\'tan sonra tramolayı sen atarsın (T). Elle sür ile dümen ve iskota sende.' : 'Otomatik: teknen taktiğine göre kendisi tramola atar.') : '';
    catDots(v, mine);
    $('btnMineRules').disabled = !mine || (!setup && (mine.phase === 'done' || !!mine.finish));
    $('btnDrive').classList.toggle('on', !!st.drive); $('btnDrive').setAttribute('aria-pressed', !!st.drive);
    $('btnDrive').disabled = !mine || (!st.drive && !setup && !['wait', 'race', 'ocs'].includes(mine.phase));
    if (st.drive) { $('btnTack').disabled = false; $('btnTack').classList.remove('pulse'); }
    helmUpdate(v);
    stateUpdate(v, mine);
    updatePanel();
  }

  // ---------- Seçim ve mod durumu: neyin seçili / açık olduğunu her an göster ----------
  let lastStateKey = '';
  function stateUpdate(v, mine) {
    const setup = st.mode === 'setup', manual = !!(mine && mine.manual), hasRoute = !!(mine && mine.route && (mine.routeIdx || 0) < mine.route.length);
    const sb = st.sel && (setup ? st.fleet : v.boats).find(b => b.id === st.sel);
    const gl = st.gsel != null && (setup || st.sim) ? gustList() : null;
    const phase = st.drive ? ['drive', !st.drive.live ? 'Elle sürüş · start öncesi yerini al' : st.drive.paused ? 'Elle sürüş · zaman durdu' : 'Elle sürüş · yarış akıyor'] : setup ? ['setup', 'Kurulum'] : st.mode === 'pause' ? ['pause', 'Duraklatıldı'] : st.mode === 'end' ? ['end', 'Yarış bitti'] : v.t < v.startAt ? ['count', "Start'a geri sayım"] : ['race', 'Yarış'];
    const key = [phase[1], !!st.drive, manual, hasRoute, mine && mine.persona, mine && mine.ignoresRules, mine && mine.finish, sb && sb.id, sb && sb.sailor, st.gsel, gl && gl.length, st.drawMode].join('|');
    if (key === lastStateKey) return;
    lastStateKey = key;
    // Sağ üstte küçük durum rozetleri (simge + tek kelime): yalnız ekrandan başka türlü anlaşılmayan durumlar.
    // Kurulum / geri sayım / yarış sol üstteki saatte zaten yazıyor; Otomatik varsayılan; seçim panelde ve sağanak kartında görünüyor.
    const chip = (id, show, cls, icon, txt, title) => {
      const x = $(id); x.classList.toggle('hidden', !show); if (!show) return;
      x.className = 'ms-chip ' + cls; x.title = title; x.innerHTML = `<svg class="ci"><use href="#${icon}"/></svg><span>${txt}</span>`;
    };
    const dp = st.drive && st.drive.live && st.drive.paused;
    chip('msPhase', !st.drive && (st.mode === 'pause' || st.mode === 'end'),   // elle sürerken alttaki panel söylüyor
      st.drive ? 'ph-drive' : st.mode === 'end' ? 'ph-end' : 'ph-pause',
      st.drive && !dp ? 'i-helm' : st.mode === 'end' ? 'i-flag' : 'i-pause', st.drive ? (dp ? 'Durdu' : 'Elle') : st.mode === 'end' ? 'Bitti' : 'Durdu', phase[1]);
    chip('msMine', !!mine && !st.drive && (manual || hasRoute), manual ? 'ms-manual' : 'ms-route', manual ? 'i-tack' : 'i-route', manual ? 'Manuel' : 'Rota',
      manual ? 'Manuel: tramolayı sen atarsın (T)' : 'Teknen çizdiğin rotayı izliyor');
    chip('msRules', !!(mine && mine.ignoresRules), 'ms-warn', 'i-close', 'Yol vermez', 'Senin teknen yol vermiyor: protesto edilebilir');
    $('msSel').classList.add('hidden');
    // düğmeler: basılı durum (aria-pressed) ve devre dışıysa nedeni
    $('btnManual').setAttribute('aria-pressed', manual); $('btnMineRules').setAttribute('aria-pressed', !!(mine && mine.ignoresRules));
    $('btnTack').title = setup ? "Tramola: start'tan sonra kullanılır (T)" : manual ? 'Tramola at (T): manuelde tramolayı yalnız sen atarsın' : 'Tramola at (T)';
    $('selMinePersona').title = manual ? 'Manuel açık: taktik kullanılmaz, tramolayı sen atarsın' : 'Taktik';
    $('btnRoute').title = manual ? 'Manuel açık: rota çizilemez (önce Manuel\'i kapat)' : 'Teknenin rotasını çiz / düzenle';
    [...document.querySelectorAll('.seg button, #speedSeg button, .seg-tgl button')].forEach(x => x.setAttribute('aria-pressed', x.classList.contains('on')));
  }

  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.add('hidden'), 2600);
  }

  // ---------- simülasyon: önceden hesapla, oynat, değişince ileriye yeniden hesapla ----------
  // st.frames: yarışın baştan sona 0.1 s aralıklı kareleri. Oynatma yalnızca kareleri gösterir (aradakiler ara değerlenir).
  // Rüzgar / sağanak / komut değişince o andan itibaren yarış yeniden hesaplanır; öncesi aynen kalır.
  function frameIndexAt(t) {
    const f = st.frames; let lo = 0, hi = f.length - 1;
    if (t <= f[0].t) return 0;
    if (t >= f[hi].t) return hi;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (f[m].t <= t) lo = m; else hi = m; }
    return lo;
  }
  function viewAt(t) {
    const i = frameIndexAt(t), a = st.frames[i], b = st.frames[Math.min(i + 1, st.frames.length - 1)];
    const k = b.t > a.t ? Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t))) : 0;
    if (k === 0) return a;
    return { ...a, t, boats: a.boats.map((p, j) => { const q = b.boats[j];
      return q && q.id === p.id ? { ...p, x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k, h: E.lerpAngle(p.h, q.h, k), v: p.v + (q.v - p.v) * k } : p; }) };
  }
  function lastT() { return st.frames.length ? st.frames[st.frames.length - 1].t : 0; }
  function startRace() {
    const setup = { fleet: jcopy(st.fleet), wind: st.wind, gusts: jcopy(st.gusts), course: { ...st.course }, sea: { ...st.sea }, boat: { ...st.boat } };
    st.frames = S.runToEnd(S.newRace(st.fleet, { wind: st.wind, gusts: st.gusts, course: st.course, sea: st.sea, boat: st.boat }));
    st.playT = 0; st.sim = viewAt(0); st.mode = 'run'; st.sel = null; st.ended = false;
    st.rec = Rec.begin(setup);
    // yatay telefonda parkurun tamamı sığınca tekneler okunmuyor: yarış başlayınca kamera teknene yakından geçer (kaydırınca bırakır)
    if (matchMedia('(max-height: 500px) and (orientation: landscape)').matches && st.fleet.some(b => b.mine) && !st.cam.follow) { st.cam.follow = true; st.cam.panAt = null; if (st.cam.z < 2.2) st.cam.z = 2.2; applyCam(); }
    if (window.SailTrack) SailTrack.log('race_start', { boats: st.fleet.length, cls: st.boat && st.boat.cls, gusts: st.gusts.length });
  }
  // Yarış sırasındaki değişiklikler (işlemler) ve kayıttan tekrar oynatma çekirdekte (sim-core: OPS, replayRecord):
  // node'da da aynı yarış kurulabilsin (bildirimler, testler).
  const OPS = S.OPS;
  // Şu anki kareden başlayarak değişikliği uygula ve yarışı ileriye yeniden hesapla.
  // op: { k: 'wind' | 'cmd' | ... } (kayda girer). Eski tarz fonksiyon da olur: o zaman kayda o karenin kopyası yazılır.
  function applyChange(op) {
    if (st.drive && st.drive.s) {                        // elle sürerken: donmuş ana uygula, Otomatik'te ileri hesaplanır (kayda çıkışta girer)
      if (typeof op === 'function') op(st.drive.s); else OPS[op.k](st.drive.s, op);
      updatePanel(true); return;
    }
    if (!st.frames.length) return;
    const i = frameIndexAt(st.playT), base = S.clone(st.frames[i]);
    if (typeof op === 'function') { op(base); Rec.note(st.rec, i, { k: 'snap', state: jcopy(base) }); }
    else { OPS[op.k](base, op); Rec.note(st.rec, i, op); }
    st.frames = st.frames.slice(0, i).concat(S.runToEnd(base));
    st.playT = base.t; st.sim = viewAt(st.playT); st.ended = false;
    if (st.mode === 'end') st.mode = 'pause';
    updatePanel(true);
  }
  const replay = rec => S.replayRecord(rec);
  // Animasyon döngüsü hiçbir hatada durmaz: hata yakalanır, döngü sürer, kullanıcıya bir kez söylenir
  // (eskiden tek bir çizim hatası requestAnimationFrame zincirini koparıp sayfayı donuk bırakırdı).
  let tickErr = 0;
  function tick(ts) {
    try { tickBody(ts); }
    catch (e) {
      console.error('[sim] kare hatası', e);
      if (Date.now() - tickErr > 15000) { tickErr = Date.now(); try { toast('Bir sorun oldu, animasyon sürüyor. Takılırsa Sıfırla (R).'); } catch (e2) { /* yok */ } }
      if (window.SailTrack) try { SailTrack.log('error', { where: 'sim.tick', msg: String(e && e.message || e).slice(0, 120) }); } catch (e3) { /* yok */ }
    }
    requestAnimationFrame(tick);
  }
  function tickBody(ts) {
    const dt = Math.min(0.1, (ts - st.lastTs) / 1000 || 0); st.lastTs = ts;
    if (st.drive) {
      driveTick(dt);
      // elle sürerken haritayı kaydırdıysan: 2.5 sn dokunulmazsa kamera tekrar teknene döner
      const c = st.cam;
      if (st.drive && !c.follow) { c.follow = true; c.ft = 0; if (c.z < 1.2) c.z = 1.8; }   // elle sürerken kamera hep teknende
    }
    else if (st.mode === 'run') {
      st.playT += dt * playSpeed() / S.CLOCK_SCALE;   // 1× = gerçek zaman (start → şamandıra ~15 dk); geri sayım hızlı geçebilir
      if (st.playT >= lastT()) {
        st.playT = lastT(); st.mode = 'end';
        const mine = st.frames[st.frames.length - 1].boats.find(b => b.mine);
        if (!askSave()) toast(mine && mine.finish ? `Yarış bitti · Senin teknen ${finTxt(mine)}` : 'Yarış bitti');
      }
      st.sim = viewAt(st.playT);
    }
    render();
  }
  function togglePlay() {
    if (st.drive) { drivePause(); return; }              // elle sürerken: zamanı durdur / devam (kurulumda Start)
    if (st.drawMode) endDraw(true);                      // çizim açıkken oynat: rotayı kaydet, sonra devam
    if (st.mode === 'setup') startRace();
    else if (st.mode === 'run') st.mode = 'pause';
    else if (st.mode === 'pause') st.mode = 'run';
    else if (st.mode === 'end') { st.playT = 0; st.sim = viewAt(0); st.mode = 'run'; }
    updatePanel(true);
  }
  function backToSetup() {
    windPend = 0; clearTimeout(windTimer);
    if (st.drive) { st.drive = null; if (st.camPrev) Object.assign(st.cam, st.camPrev); st.camPrev = null; st.cam.follow = false; st.cam.panAt = null; applyCam(); }
    if (st.mode !== 'setup') toast('Yarış sıfırlandı · tekneler start öncesi yerlerinde, ▶ ile yeniden başlat');
    st.mode = 'setup'; st.sim = null; st.frames = []; updatePanel(true); }
  // Tahmini sonuç: hesaplanmış yarışın son karesi
  function predicted() { return st.frames.length ? st.frames[st.frames.length - 1] : null; }

  // ---------- Elle sürme: dümen ve iskota sende ----------
  // Kurulumda: zaman yok, teknen start'tan önce istediğin yere götürülür (diğerleri yerinde).
  // Yarışta (canlı): yarış akmaya devam eder, herkes aynı zamanda hareket eder; yalnız senin teknenin dümeni ve
  // iskotası sende. (Eskiden yarışta da zaman donuyordu: teknen tek başına ~25× hızla gidip diğerlerinin önüne fırlıyordu.)
  // Bitir: yarış o andan otomatik devam eder, teknen orsaya gider; tramolalar yine senin (Manuel açık kalır).
  const DRIVE_TEMPO = 0.7;                                // kurulumda: 1 gerçek sn = 0.7 sim. sn (tekne ~1 boy/sn)
  // yarışta zaman seçili hızla akar (1× = gerçek zaman, saat 5:00'ten gerçek 5 dakikada iner). Dümen ise her ekran karesinde
  // en az bu tempoyla döner (tramola ~2 sn): gerçek zamanda yarışın adımları seyrek, dümen gecikmesin.
  const LIVE_TEMPO = 0.45;
  const SHEET_STEP = 6;                                   // Çek / Sal: bir dokunuş (derece)
  function driveCtx() {
    const d = st.drive;
    return d.s || { t: 0, wind: st.wind, gusts: st.gusts, sea: st.sea, boat: st.boat, course: st.course, boats: st.fleet, events: [] };
  }
  function driveBoat() { return st.drive && driveCtx().boats.find(b => b.mine); }
  function enterDrive() {
    if (st.drive) return;
    if (window.SailAccess && !SailAccess.guard('sim.drive')) return;
    if (window.SailTrack) SailTrack.log('drive', { mode: st.mode });
    if (st.drawMode) endDraw(true);
    if (st.mode === 'setup') {
      const m = st.fleet.find(b => b.mine); if (!m) return;
      // bekleyen tekne başı rüzgarda durur: elle sürmeye orsa rotasında, yelken boş başlar (Çek ile doldurup hızlanırsın)
      if (!m.drv) { m.h = st.wind + (m.tack === 'starboard' ? -45 : 45); m.v = 0; m.sheet = null; m.sheetOff = S.SHEET_OFF_MAX; }
      const prev = { manual: !!m.manual, route: m.route };   // çıkınca geri gelir (eskiden Manuel kalıcı oluyordu)
      m.manual = true; m.route = null;
      st.drive = { s: null, prev };
    } else {
      if (!st.frames.length) return;
      const i = frameIndexAt(st.playT), s = S.clone(st.frames[i]), m = s.boats.find(b => b.mine);
      if (!m || !['wait', 'race', 'ocs'].includes(m.phase)) { toast(m && m.phase === 'penalty' ? 'Ceza turundayken elle sürülemez' : 'Teknen şamandırayı döndü: elle sürülemez'); return; }
      const prev = { manual: !!m.manual, route: null };   // yarışta rota geri gelmez (tekne yolundan çıktı); Manuel eski haline döner
      m.manual = true; m.route = null; m.man = null; m.escH = null; m.sheet = null; m.hand = true;
      if (m.phase === 'wait' && Math.abs(E.norm180(m.h - s.wind)) < 40) { m.h = s.wind + (m.tack === 'starboard' ? -45 : 45); m.sheetOff = S.SHEET_OFF_MAX; }   // beklerken yelken boştu
      // canlı: bu kareden itibaren yarış adım adım ilerler; kareler ve teknenin yolu (kayıt için) tutulur
      st.drive = { s, i, live: true, paused: false, acc: 0, prev,   // Elle sür'e basınca zaman hep akar (durmuş oynatmadan geçince kilitli sanılıyordu)
        n: 0, frames: [S.clone(s)], path: [] };
      st.mode = 'pause'; st.sim = s;
    }
    if (st.cat) openCat(null);                          // ayar paneli kapansın: sahne ve dümen paneli öne çıksın
    st.camPrev = { ...st.cam };                         // kamera tekneni izlesin; çıkınca eski görünüme döner
    if (!st.cam.follow) { st.cam.follow = true; st.cam.z = Math.max(st.cam.z, phoneMq.matches ? 1.6 : 1.8); }
    Object.assign(st.drive, { keyRud: 0, touchRud: 0, autoTrim: true,   // iskota hep otomatik: çekikken seyre, salıkken rüzgara göre (kullanıcı 2026-11-13)
      noteAt: 0, lastEv: {} });
    toast(st.drive.live ? 'Elle sürüyorsun · yarış akıyor, herkes hareket ediyor. ← → dümen, ↑ ↓ iskota' : 'Elle sürüyorsun · start\'tan önce yerini al. ← → dümen, ↑ ↓ iskota, Start ▶ ile yarış başlar');
    updatePanel(true);
  }
  // keep: kurulumdan Start ▶ ile çıkınca elle sürmeye yarışta devam et
  function exitDrive(play, keep) {
    const d = st.drive; if (!d) return;
    const ctx = driveCtx(), m = ctx.boats.find(b => b.mine);
    st.drive = null;
    if (st.camPrev && !st.camPrev.follow && !keep) { Object.assign(st.cam, st.camPrev); applyCam(); }
    st.camPrev = null;
    if (m) {
      m.helm = null; m.note = ''; m.hand = false; m.back = false;
      // otomatiğe dönünce iskota tam trim (eskiden elle salık bırakılan iskota yarışın sonuna kadar kalıyor, tekne yavaş gidiyordu)
      if (!keep) m.sheetOff = 0;
      // Manuel ve rota elle sürmeden önceki haline döner: otomatikte teknen yine kendi tramolasını atar
      if (d.prev) { m.manual = d.prev.manual; if (!d.s) m.route = d.prev.route || null; }
    }
    if (!d.s) {                                          // kurulum: teknen burada bekler, start'ta otomatik devam eder (tam trimle hızlanır)
      if (m && S.lineSide(m) === -1) toast('Teknen hattın üstünde: start\'ta erken (OCS) sayılır, geri dönmek zorunda kalır');
      updatePanel(true);
      if (play) { togglePlay(); if (keep && st.mode === 'run') enterDrive(); }
      return;
    }
    const s = d.s;
    if (m && m.phase !== 'round' && m.phase !== 'penalty') s.events.push({ t: s.t, text: `${m.id}: elle sürdün, otomatiğe döndü${m.manual ? ' (Manuel: tramolalar yine senin)' : ''}`, kind: '' });
    // kayıt: elle sürülen bölümde teknenin yolu + bitişteki durum (tekrar oynatınca aynı yarış)
    Rec.note(st.rec, d.i, { k: 'hand', path: d.path, end: jcopy(s) });
    st.frames = spliceHand(st.frames, d.i, d.frames, s);
    st.playT = s.t; st.sim = viewAt(st.playT); st.ended = false;
    st.mode = play ? 'run' : 'pause';
    updatePanel(true);
  }
  // elle sürülen bölümün kareleri + bitiş durumundan otomatik devam
  const spliceHand = (frames, i, hf, end) => S.spliceHand(frames, i, hf, end);
  function driveNote(m, text, kind) { m.note = text; m.noteKind = kind || ''; m.noteUntil = 1e9; st.drive.noteAt = performance.now() + 1700; }
  function driveEvents(m, ev) {
    const d = st.drive, now = performance.now();
    for (const e of ev) {
      if (e === 'tack' || e === 'jibe') {
        driveNote(m, e === 'tack' ? 'Tramola!' : 'Kavança!', 'good');
        if (d.s) d.s.events.push({ t: d.s.t, text: `${m.id}: ${e === 'tack' ? 'tramola' : 'kavança'} (elle)`, kind: '' });
      } else if (now - (d.lastEv[e] || 0) > 1500) {
        d.lastEv[e] = now;
        driveNote(m, e === 'hit' ? 'Dikkat: çarpıyorsun!' : e === 'edge' ? 'Alan sınırı: geri dön' : `Temas! (${e.slice(8)})`, 'bad');
      }
    }
  }
  function driveTick(dt) {
    const d = st.drive, ctx = driveCtx(), m = ctx.boats.find(b => b.mine); if (!m) return;
    const inp = { rudder: Math.max(-1, Math.min(1, d.keyRud + d.touchRud)), autoTrim: d.autoTrim, hold: d.back ? null : d.hold, back: !!d.back };
    if (inp.rudder && d.hold) { d.hold = null; lastHelmKey = ''; }   // dümene dokununca Orsa bırakır
    if (!d.live) driveEvents(m, S.drive(ctx, m, inp, dt * DRIVE_TEMPO));
    else if (!d.paused) {
      // canlı yarış: sabit adımlarla (DT) herkes birlikte ilerler; ekran karesi başına en çok 8 adım
      const tempo = Math.min(st.speed, 5) / S.CLOCK_SCALE;   // saat hızı (1× = gerçek zaman); teknenin ekrandaki hızı S.CLOCK_SCALE'den (Ekranda hız)
      S.steer(ctx.wind, m, inp, dt * Math.max(tempo, LIVE_TEMPO));   // dümen hemen tepki versin
      const sinp = { ...inp, noTurn: true };
      d.acc = Math.min(d.acc + dt * tempo, S.DT * 8);
      while (d.acc >= S.DT - 1e-9) {
        d.acc -= S.DT;
        d.prev = d.s.boats.map(b => ({ x: b.x, y: b.y, h: b.h }));
        driveEvents(m, S.handStep(d.s, m, sinp, d.path));
        d.n++;
        if (d.n % 2 === 0) d.frames.push(S.clone(d.s));
        if (!m.hand || d.s.boats.every(b => b.finish || b.gone)) {      // şamandıra dönüşü / ceza turu: otomatik devralır
          if (d.n % 2) d.frames.push(S.clone(d.s));
          const why = m.phase === 'round' ? 'Şamandırayı dönüyorsun: otomatik devraldı' : m.phase === 'penalty' || m.penaltyAt != null ? 'Ceza turunu otomatik atıyor' : 'Elle sürme bitti';
          exitDrive(true); toast(why); return;
        }
      }
    }
    if (d.noteAt && performance.now() > d.noteAt) { m.note = ''; d.noteAt = 0; }
    if (st.mode !== 'setup') { st.sim = ctx; st.playT = ctx.t; }
    if (d.live) {
      // ekranda iki adım arası ara değer: yarış 0.05 sn'lik adımlarla ilerler, tekneler (ve kamera) titremeden kaysın
      const a = Math.max(0, Math.min(1, d.acc / S.DT)), P = d.prev;
      d.view = P && P.length === ctx.boats.length ? { ...ctx, boats: ctx.boats.map((b, i) => ({ ...b, x: P[i].x + (b.x - P[i].x) * a, y: P[i].y + (b.y - P[i].y) * a, h: b.mine ? b.h : E.lerpAngle(P[i].h, b.h, a) })) } : ctx;
    }
  }
  function drivePause() {
    const d = st.drive; if (!d) return;
    if (!d.live) { exitDrive(true, true); return; }      // kurulumda: Start ▶ (elle sürmeye yarışta devam)
    d.paused = !d.paused; d.acc = 0;
    if (d.paused) { d.keyRud = 0; d.touchRud = 0; }
    lastHelmKey = '';
  }
  const JIBE_MIN = 100;                                  // bu rüzgar açısından sonra manevra kavançadır
  function helmTurn(kind) {
    const m = driveBoat(); if (!m) return;
    const w = driveCtx().wind, abs = Math.abs(E.norm180(m.h - w));
    if (kind === 'auto') kind = abs >= JIBE_MIN ? 'jibe' : 'tack';
    if (kind === 'jibe' && abs < JIBE_MIN) { toast('Kavança pupadan atılır: önce kafa aç (rüzgarı kıçtan al)'); return; }
    S.helmTurn(m, w, kind);
  }
  // İskota: elle sürerken Çek / Sal; yarışta (otomatik) hız düşür / artır
  function sheetBy(dir) {
    const m = st.drive ? driveBoat() : (st.mode !== 'setup' && view().boats.find(b => b.mine));
    if (!m) return;
    if (st.drive) {
      const abs = Math.abs(E.norm180(m.h - driveCtx().wind));
      if (st.drive.autoTrim) {                           // oto iskotada en çekik hal = ideal (tam hız); daha fazla çekmek yavaşlatırdı
        const was = m.sheetOff || 0; m.sheetOff = Math.max(0, Math.min(S.SHEET_OFF_MAX, was + dir * SHEET_STEP));
        if (m.sheetOff === was) toast(dir < 0 ? 'İskota tam çekili: tekne bu rotada en hızlı' : 'İskota tamamen boş: yelken pırpırlıyor');
      } else m.sheet = Math.max(0, Math.min(S.SHEET_MAX, (m.sheet != null ? m.sheet : S.idealSheet(abs)) + dir * SHEET_STEP));
      if (abs < 30 && Date.now() - (sheetBy.hint || 0) > 4000) { sheetBy.hint = Date.now(); toast('Burnun rüzgarda: iskota işe yaramaz. Önce kafa aç (◀ ▶), yelken dolsun'); }
      lastHelmKey = '';
      return;
    }
    if (!['wait', 'race', 'ocs', 'round'].includes(m.phase)) return;
    const nv = Math.max(0, Math.min(S.SHEET_OFF_MAX, (m.sheetOff || 0) + dir * SHEET_STEP * 1.5));
    if (nv !== (m.sheetOff || 0)) applyChange({ k: 'cmd', c: 'sheet', v: nv });
    else toast(dir < 0 ? 'İskota tam çekili: teknen tam hızda' : 'İskota tamamen boş: daha fazla yavaşlayamaz');
  }
  // İskota tek düğme: salıksa çek (tam trim), trimliyse sal (yelken boşalır, yavaşlar); fazla çekikse ideale sal
  function sheetState(m, w, autoTrim) {
    const abs = Math.abs(E.norm180(m.h - w)), ideal = S.idealSheet(abs);
    const dl = autoTrim ? (m.sheetOff || 0) : (m.sheet != null ? m.sheet : ideal) - ideal;
    return { abs, ideal, st: dl > 8 ? 'eased' : dl < -8 ? 'over' : 'trim' };
  }
  function sheetToggle() {
    const d = st.drive, m = driveBoat(); if (!m) return;
    if (d.back) { d.back = false; m.sheetOff = 0; m.sheet = null; flash('hpSheet'); lastHelmKey = ''; return; }   // terslenmiş yelkeni bırak: iskotayı çek, yelken dolsun
    const k = sheetState(m, driveCtx().wind, d.autoTrim);
    if (d.autoTrim) m.sheetOff = k.st === 'eased' ? 0 : S.SHEET_OFF_MAX;
    else m.sheet = k.st === 'trim' ? Math.min(S.SHEET_MAX, k.ideal + S.SHEET_OFF_MAX) : k.ideal;
    if (k.abs < 30) toast('Burnun rüzgarda: iskota işe yaramaz. Önce kafa aç ya da Orsa\'ya bas');
    flash('hpSheet'); lastHelmKey = '';
  }
  // Orsa (VMG): tekne bu kontrada orsa rotasına girer, iskota tam çekilir; dümene dokununca bırakır
  function vmgToggle() {
    const d = st.drive, m = driveBoat(); if (!m) return;
    d.hold = d.hold === 'orsa' ? null : 'orsa'; d.back = false;
    if (d.hold) { m.helm = null; if (d.autoTrim) m.sheetOff = 0; else m.sheet = null; toast('Orsa: teknen orsa rotasına giriyor ve orada kalıyor · dümene dokununca bırakır'); }
    lastHelmKey = '';
  }
  // Yelkeni tersle (backing): bumbayı rüzgara karşı it. Tekne frenler, durur, sonra geri gider (K22.3: geri giden tekne
  // herkese yol verir). Yeniden dokun ya da Çek: yelken dolar. Geri giderken dümen ters çalışır.
  function backToggle() {
    const d = st.drive, m = driveBoat(); if (!m) return;
    d.back = !d.back; d.hold = null; m.helm = null;
    if (d.back) toast('Yelken ters: tekne frenliyor, durunca geri gider. Geri giderken dümen ters çalışır. Bırakmak için yeniden dokun ya da Çek');
    else { m.sheetOff = 0; m.sheet = null; }
    lastHelmKey = '';
  }
  // dümen paneli (en altta, yalnız elle sürerken)
  const POS = a => a < 30 ? 'rüzgara karşı' : a < 60 ? 'orsa' : a < 120 ? 'apaz' : a < 165 ? 'geniş apaz' : 'pupa';
  let lastHelmKey = '';
  function helmUpdate(v) {
    const pad = $('helmPad'), m = v.boats.find(b => b.mine), show = !!(st.drive && m);
    if (pad.classList.contains('hidden') === show) {
      pad.classList.toggle('hidden', !show); $('driveBar').classList.toggle('hidden', !show); document.body.classList.toggle('driving', show);
      // geri sayım süresi seçimi elle sürerken zaman kutusunun içinde (tek kutu), çıkınca yerine döner
      if (show) $('driveBar').insertBefore($('countBar'), $('dbSpeedSeg')); else $('modeStrip').appendChild($('countBar'));
    }
    if (!show) { lastHelmKey = ''; return; }
    const d = st.drive, abs = Math.abs(E.norm180(m.h - v.wind)), ideal = S.idealSheet(abs);
    const sheet = m.sheet != null ? m.sheet : ideal;
    const dlt = sheet - ideal, eff = abs < 30 ? 1 : S.trimEff(dlt), stb = E.norm180(m.h - v.wind) < 0;
    const trimTxt = abs < 30 ? 'Rüzgara karşı: yelken boş' : dlt > 8 ? 'Fazla salık: pırpırlıyor' : dlt < -8 ? 'Fazla çekik: boğuluyor' : 'İskota iyi';
    const rem = (v.startAt - v.t) * S.CLOCK_SCALE, tTxt = !d.live ? 'Kurulum' : rem > 0 ? `Start'a ${S.fmt(rem / S.CLOCK_SCALE)}` : `Yarış ${S.fmt(-rem / S.CLOCK_SCALE)}`;
    const sk = sheetState(m, v.wind, d.autoTrim);
    const key = [d.live, d.paused, d.hold, d.back, sk.st, Math.round(abs), Math.round(sheet), Math.round(eff * 100), stb, m.v.toFixed(1), d.autoTrim, m.phase, tTxt].join('|');
    if (key === lastHelmKey) return; lastHelmKey = key;
    $('hpSpeed').textContent = m.v < -0.5 ? `${S.knots(-m.v).toFixed(1).replace('.', ',')} kn geri` : `${S.knots(Math.max(0, m.v)).toFixed(1).replace('.', ',')} kn`;
    $('hpBack').classList.toggle('on', !!d.back); $('hpBack').setAttribute('aria-pressed', !!d.back);
    $('hpBackLbl').textContent = d.back ? (m.v < -0.5 ? 'Geri' : 'Fren') : 'Tersle';
    $('hpPoint').textContent = `${POS(abs)} · ${stb ? 'sancak' : 'iskele'} kontra`;
    $('hpLeftSub').textContent = stb ? 'kafa aç' : 'orsa'; $('hpRightSub').textContent = stb ? 'orsa' : 'kafa aç';
    const tg = $('hpGauge'), pct = x => `${Math.max(0, Math.min(100, x / 90 * 100)).toFixed(1)}%`;
    tg.querySelector('.tg-ideal').style.left = pct(ideal); tg.querySelector('.tg-knob').style.left = pct(sheet);
    tg.className = 'trim-gauge ' + (abs < 30 ? 'off' : Math.abs(dlt) <= 8 ? 'ok' : Math.abs(dlt) <= 20 ? 'meh' : 'bad');
    $('hpTrimTxt').textContent = d.back ? (m.v < -0.5 ? 'Yelken ters: geri gidiyor (dümen ters)' : m.v > 0.5 ? 'Yelken ters: frenliyor' : 'Yelken ters: durdu') : `${trimTxt} · güç %${Math.round(eff * 100)}`;
    $('hpVmg').classList.toggle('on', d.hold === 'orsa'); $('hpVmg').setAttribute('aria-pressed', d.hold === 'orsa');
    const sb = $('hpSheet');
    sb.className = 'hp-sheetbtn ' + sk.st;
    $('hpSheetLbl').textContent = sk.st === 'trim' ? 'Sal' : 'Çek';
    $('hpSheetSub').textContent = sk.st === 'eased' ? 'iskota salık' : sk.st === 'over' ? 'fazla çekik' : 'iskota çekili';
    if (sk.st === 'over') $('hpSheetLbl').textContent = 'Sal';
    if (d.back) { sb.className = 'hp-sheetbtn eased'; $('hpSheetLbl').textContent = 'Çek'; $('hpSheetSub').textContent = 'yelkeni doldur'; }
    // tek manevra düğmesi: orsadan apaza kadar Tramola, apazı geçince (rüzgar açısı ≥ 100°) Kavança
    const jibe = abs >= JIBE_MIN, tb = $('hpTack');
    tb.classList.toggle('jibe', jibe); $('hpTackLbl').textContent = jibe ? 'Kavança' : 'Tramola';
    tb.title = jibe ? 'Kavança: rüzgarı kıçtan alıp öbür kontraya (T)' : 'Tramola: rüzgarın içinden öbür kontraya (T)';
    // zaman: yarışta Durdur / Devam; kurulumda Start ▶ (elle sürmeye devam ederek yarışı başlatır)
    const pb = $('hpPlay');
    pb.querySelector('use').setAttribute('href', d.live && !d.paused ? '#i-pause' : '#i-play');
    $('hpPlayLbl').textContent = !d.live ? 'Start' : d.paused ? 'Devam' : 'Durdur';
    pb.classList.toggle('paused', !d.live || d.paused);
    pb.title = !d.live ? 'Start ver: yarış başlar, elle sürmeye devam edersin (boşluk)' : d.paused ? 'Zaman devam etsin (boşluk)' : 'Zamanı durdur (boşluk)';
    $('hpGo').querySelector('.hp-go-lbl').textContent = d.live ? 'Otomatik' : 'Bitir';
    $('hpReset').classList.toggle('hidden', !d.live);   // kurulumda sıfırlanacak yarış yok
    $('hpGo').title = d.live ? 'Elle sürmeyi bitir: yarış devam eder, teknen orsaya gider; tramolalar yine senin (Enter)' : 'Elle sürmeyi bitir: teknen burada bekler, start\'ta otomatik hızlanır (Enter)';
  }
  // basılı tutulan düğmeler (dümen, iskota): parmak kalkınca biter
  function holdBtn(id, down, up, repeat) {
    const x = $(id); let iv = 0, to = 0;
    const stop = () => { clearTimeout(to); clearInterval(iv); to = iv = 0; x.classList.remove('held'); if (up) up(); };
    x.addEventListener('pointerdown', e => { if (x.disabled) return; e.preventDefault(); try { x.setPointerCapture(e.pointerId); } catch (er) { /* yok */ } x.classList.add('held'); down();
      if (repeat) to = setTimeout(() => { iv = setInterval(down, repeat); }, 380); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => x.addEventListener(t, stop));
    x.addEventListener('contextmenu', e => e.preventDefault());
    x.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); down(); if (up) setTimeout(up, 250); } });
  }

  // ---------- rüzgar, sağanak, filo ----------
  const WIND_MAX = 40;   // daha büyük açıda şamandıra yan tarafa düşer, orsa ayağı anlamını yitirir
  // Yarışta her rüzgar değişikliği yarışı o andan yeniden hesaplar (iPad'de ~1 sn). Art arda basışlar toplanır,
  // basmayı bırakınca (WIND_WAIT ms) tek seferde uygulanır; o arada yeni yön göstergede görünür.
  const WIND_WAIT = 450;
  let windPend = 0, windTimer = 0;
  function windFlush() {
    clearTimeout(windTimer); windTimer = 0;
    const d = windPend; windPend = 0;
    if (d && st.mode !== 'setup' && (st.frames.length || st.drive)) applyChange({ k: 'wind', d });
    updatePanel(true);
  }
  function setWind(delta) {
    const cur = (st.mode === 'setup' ? st.wind : st.sim.wind) + windPend;
    if (Math.abs(E.norm180(cur + delta)) > WIND_MAX) { toast(`Rüzgar en fazla ±${WIND_MAX}° döndürülebilir (şamandıra rüzgarüstünde kalsın)`); return; }
    if (st.mode === 'setup') { st.wind = E.norm180(st.wind + delta); return; }
    windPend += delta; $('windVal').textContent = `${Math.round(E.norm360(cur + delta))}°`;
    clearTimeout(windTimer); windTimer = setTimeout(windFlush, WIND_WAIT);
  }
  // ---------- Sağanak düzenleme: dokun → seç, boyut −/+, sıfırla, sil ----------
  const GUST_BASE = S.GUST_BASE, GUST_FX = S.GUST_FX;   // çekirdekte (kayıttan tekrar oynatma da kullanır)
  function gustEdit(fx, k, text) {
    const i = st.gsel; if (i == null) return;
    if (st.mode === 'setup') { if (st.gusts[i]) GUST_FX[fx](st.gusts, i, k); }
    else applyChange({ k: 'gust', fx, i, f: k, text });   // f: büyütme katsayısı (eskiden 'k' adıyla işlem türünü eziyordu: yarışta sağanak büyüt/küçült/sil hata veriyordu)
    gustBarUpdate(); updatePanel(true);
  }
  function gustScale(k) { gustEdit('scale', k, `Sağanak ${st.gsel + 1} ${k > 1 ? 'büyüdü' : 'küçüldü'}`); }
  function gustReset() { gustEdit('reset', 0, `Sağanak ${st.gsel + 1} ilk boyutuna döndü`); }
  function gustDelete() { const n = st.gsel + 1; gustEdit('del', 0, `Sağanak ${n} geçti`); st.gsel = null; gustBarUpdate(); }
  // Sağanağı seç: ayar kartı sağ altta açılır ve bir kez parlar (yeni açıldığı fark edilsin)
  function gustSelect(i) {
    const was = st.gsel;
    st.gsel = i; st.sel = null;
    if (document.body.classList.contains('lay-strip') && st.cat) openCat(null);   // dikey ekranda ayar paneli sağanak kartının üstünü kapatmasın
    gustBarUpdate(); updatePanel(true);
    if (was !== i) { const bar = $('gustBar'); bar.classList.remove('flash'); void bar.offsetWidth; bar.classList.add('flash'); }
  }
  function gustBarUpdate() {
    const list = st.mode === 'setup' || st.sim ? gustList() : [];
    if (st.gsel != null && !list[st.gsel]) st.gsel = null;
    $('gustBar').classList.toggle('hidden', st.gsel == null);
    document.body.classList.toggle('gust-editing', st.gsel != null);
    if (st.gsel == null) return;
    const g = list[st.gsel], pct = Math.round(g.rx / GUST_BASE.rx * 100);
    $('gbTitle').textContent = list.length > 1 ? `Sağanak ${st.gsel + 1} ayarları` : 'Sağanak ayarları';
    $('gbSize').textContent = `%${pct}`;
    $('gbMinus').disabled = pct <= 40; $('gbPlus').disabled = pct >= 250; $('gbReset').disabled = pct === 100;
  }
  // ---------- Parkur: start hattı boyu ve şamandıra uzaklığı (yalnız kurulumda) ----------
  const COURSE_LIM = { lineLen: [200, 1000, 50], markDist: [400, 1500, 50] };
  function changeCourse(next) {
    if (st.mode !== 'setup') return;
    const c = { lineLen: Math.max(COURSE_LIM.lineLen[0], Math.min(COURSE_LIM.lineLen[1], next.lineLen)), markDist: Math.max(COURSE_LIM.markDist[0], Math.min(COURSE_LIM.markDist[1], next.markDist)), flag: next.flag || st.course.flag || 'P' };
    const o = { cx: S.MARK.x, ly: S.LINE.pin.y, my: S.MARK.y, L: S.LINE.boat.x - S.LINE.pin.x };
    st.course = c; S.setCourse(c);
    const n = { cx: S.MARK.x, ly: S.LINE.pin.y, my: S.MARK.y, L: S.LINE.boat.x - S.LINE.pin.x };
    // tekneler hatta göre yerini korur (hat boyunca orantılı), sağanaklar parkura göre
    for (const b of st.fleet) { b.x = n.cx + (b.x - o.cx) * (n.L / o.L); b.y = b.y - o.ly + n.ly; if (b.route) b.route = null; }
    for (const g of st.gusts) { g.x = n.cx + (g.x - o.cx); g.y = n.my + (g.y - o.my) * ((n.ly - n.my) / (o.ly - o.my)); }
    fitViewBox(); updatePanel(true);
  }
  const boyTxt = px => `${(px / S.HULL).toFixed(px % S.HULL ? 1 : 0).replace('.', ',')} boy`;
  function courseUpdate() {
    const c = st.course, setup = st.mode === 'setup', D = S.COURSE_DEFAULT;
    $('lineVal').textContent = boyTxt(c.lineLen); $('markVal').textContent = boyTxt(c.markDist);
    $('btnLineMinus').disabled = !setup || c.lineLen <= COURSE_LIM.lineLen[0]; $('btnLinePlus').disabled = !setup || c.lineLen >= COURSE_LIM.lineLen[1];
    $('btnMarkMinus').disabled = !setup || c.markDist <= COURSE_LIM.markDist[0]; $('btnMarkPlus').disabled = !setup || c.markDist >= COURSE_LIM.markDist[1];
    const def = c.lineLen === D.lineLen && c.markDist === D.markDist;
    $('btnCourseReset').disabled = !setup || def;
    $('courseState').textContent = !setup ? 'Yarışta değiştirilemez (kurulumda ayarlanır)' : def ? 'Varsayılan parkur' : 'Değiştirildi';
    $('courseState').classList.toggle('changed', setup && !def);
    flagUpdate();
  }
  // Ayarlar → Parkur → Start bayrakları
  function flagUpdate() {
    const v = view(), f = flagNow(v), setup = st.mode === 'setup', info = FLAG_INFO[f];
    [...$('flagSeg').children].forEach(x => { x.classList.toggle('on', x.dataset.v === f); x.disabled = !setup; });
    const fn = f === 'Siyah' ? 'siyah bayrak' : `${f} bayrağı`, rem = setup ? 301 : remReal(v);
    const steps = [[300, '5:00', 'Uyarı: sınıf bayrağı çekilir, 1 ses'], [240, '4:00', `Hazırlık: ${fn} çekilir, 1 ses`], [60, '1:00', `${fn[0].toUpperCase() + fn.slice(1)} iner, 1 uzun ses`], [0, '0:00', 'Start: sınıf bayrağı iner, 1 ses']];
    const cur = setup ? -1 : steps.findIndex((s0, i) => rem <= s0[0] + 1e-6 && (i === steps.length - 1 || rem > steps[i + 1][0]));
    $('flagSeq').innerHTML = steps.map((s0, i) => `<li class="${i === cur ? 'now' : i < cur ? 'past' : ''}"><b>${s0[1]}</b><span>${esc(s0[2])}</span></li>`).join('');
    $('flagNote').textContent = info.text + (S.FLAG_RULE[f] ? ` Yasaklı bölge (${info.zone.toLowerCase()}) son dakikada sahnede kırmızı görünür, start'ta kalkar.` : '');
    $('flagState').textContent = setup ? '' : 'Yarışta değiştirilemez';
  }
  function setFlag(f) {
    if (st.mode !== 'setup' || !FLAG_INFO[f]) return;
    st.course = { ...st.course, flag: f }; saveSetup();
    updatePanel(true); render();
  }

  function gustList() { return st.mode === 'setup' ? st.gusts : st.sim.gusts; }
  function addGust(side) {
    const g = { x: S.MARK.x + (side === 'L' ? -270 : 270), y: (S.MARK.y + S.LINE.pin.y) / 2, rx: 120, ry: 190 };
    if (st.mode === 'setup') st.gusts.push(g);
    else applyChange({ k: 'gustAdd', g, side });
    gustSelect(gustList().length - 1);
  }
  function clearGusts() { st.gsel = null; if (st.mode === 'setup') st.gusts.length = 0; else applyChange({ k: 'gustClear' });  gustBarUpdate(); }
  function renumber() {
    let k = 1;
    for (const b of st.fleet) if (!b.mine) { b.id = String(k); b.name = `Tekne ${k}`; k++; }
  }
  function setFleetSize(n) {
    n = Math.max(2, Math.min(16, n));
    const mineAt = st.fleet.find(b => b.mine);
    const fresh = S.defaultFleet(n);
    // senin teknenin yerini koru
    if (mineAt) { const m = fresh.find(b => b.mine); m.x = mineAt.x; m.y = mineAt.y; m.tack = mineAt.tack; m.persona = mineAt.persona; m.ignoresRules = mineAt.ignoresRules; m.route = mineAt.route; m.speedK = mineAt.speedK; }
    // diğer teknelerin isim ve ayarları sırasıyla korunur
    const olds = st.fleet.filter(b => !b.mine), news = fresh.filter(b => !b.mine);
    news.forEach((b, i) => { const o = olds[i]; if (o) { b.persona = o.persona; b.speedK = o.speedK; b.ignoresRules = o.ignoresRules; b.tack = o.tack; if (o.sailor) b.sailor = o.sailor; } });
    if (mineAt && mineAt.sailor) fresh.find(b => b.mine).sailor = mineAt.sailor;
    st.fleet = fresh; st.sel = null;
  }
  function addOne() {
    if (st.fleet.length >= 16) return;
    const P = S.LINE.pin, Q = S.LINE.boat;
    // hattın dibinde en boş yere koy
    let best = null;
    for (let u = 0.05; u <= 0.95; u += 0.05) for (const dy of [62, 128, 190]) {
      const p = { x: P.x + (Q.x - P.x) * u, y: P.y + dy };
      const m = Math.min(...st.fleet.map(b => Math.hypot(b.x - p.x, b.y - p.y)));
      if (!best || m > best.m) best = { p, m };
    }
    st.fleet.push(S.makeBoat(st.fleet.length, best.p)); renumber();
  }
  function removeOne(id) {
    const i = id ? st.fleet.findIndex(b => b.id === id) : st.fleet.map(b => !b.mine).lastIndexOf(true);
    if (i < 0 || st.fleet.length <= 2) return;
    const wasMine = st.fleet[i].mine;
    st.fleet.splice(i, 1);
    if (wasMine) makeMine(st.fleet[0].id);
    renumber(); st.sel = null;
  }
  function makeMine(id) {
    for (const b of st.fleet) {
      if (b.mine && b.id !== id) { b.mine = false; b.color = '#c9d6e3'; b.name = ''; }
    }
    const b = st.fleet.find(x => x.id === id); if (!b) return;
    b.mine = true; b.color = S.MINE_COLOR; b.id = 'SEN'; b.name = 'Senin teknen';
    renumber(); st.sel = 'SEN';
  }

  // ---------- işaretçi: sürükle / seç ----------
  function hitBoat(p) {
    const v = view(); let best = null, bd = 30;
    for (const b of v.boats) { if (b.gone) continue; const d = Math.hypot(b.x - p.x, b.y - p.y); if (d < bd) { bd = d; best = b; } }
    return best;
  }
  function hitGust(p) {
    const list = gustList(), w = view().wind, up = E.fwd(w), right = E.fwd(w + 90);
    for (let i = list.length - 1; i >= 0; i--) {
      const g = list[i], dx = p.x - g.x, dy = p.y - g.y;
      if (Math.hypot((dx * right.x + dy * right.y) / g.rx, (dx * up.x + dy * up.y) / g.ry) < 1) return g;
    }
    return null;
  }
  function capture(ev) { try { $('course').setPointerCapture(ev.pointerId); } catch (e) { /* sentetik olay */ } }
  function pinchStart() {
    const [a, b] = [...st.pts.values()];
    st.pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: st.cam.z, W: toWorld({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }) };
    st.drag = null; st.drawPts = null; st.legPrev = null; if (!st.drive) st.cam.follow = false;   // elle sürerken iki parmak yalnız yakınlaştırır
  }
  function onDown(ev) {
    st.pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (st.pts.size === 2 && st.drive) { st.drag = null; ev.preventDefault(); return; }   // elle sürerken parmakla yakınlaştırma yok: + / − düğmeleri
    if (st.pts.size === 2) { pinchStart(); capture(ev); ev.preventDefault(); return; }
    if (st.pts.size > 2 || st.pinch) return;
    const p = toWorld(ev);
    if (st.drawMode && st.routeMode === 'acili') { legAim(p); capture(ev); ev.preventDefault(); return; }
    if (st.drawMode) { st.drawPts = [p]; capture(ev); ev.preventDefault(); return; }
    const b = hitBoat(p);
    if (b && st.mode !== 'setup') st.drag = { kind: 'pick', obj: b, moved: false, x0: ev.clientX, y0: ev.clientY };
    else if (b) {
      const fb = st.fleet.find(x => x.id === b.id);
      st.drag = { kind: 'boat', obj: fb, dx: fb.x - p.x, dy: fb.y - p.y, moved: false, x0: ev.clientX, y0: ev.clientY };
    } else {
      const g = hitGust(p);
      if (g) st.drag = { kind: 'gust', obj: g, x1: g.x, y1: g.y, dx: g.x - p.x, dy: g.y - p.y, moved: false, x0: ev.clientX, y0: ev.clientY };
      else st.drag = { kind: 'pan', moved: false, x0: ev.clientX, y0: ev.clientY, lx: ev.clientX, ly: ev.clientY };   // boşluk: dokun → seçimi kaldır, sürükle → kaydır
    }
    if (st.drag) { capture(ev); ev.preventDefault(); }
  }
  function onMove(ev) {
    if (st.pts.has(ev.pointerId)) st.pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (st.pinch) {
      if (st.pts.size < 2) return;
      const [a, b] = [...st.pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomTo(st.pinch.z0 * d / st.pinch.d0, (a.x + b.x) / 2, (a.y + b.y) / 2, st.pinch.W);
      return;
    }
    if (st.drag && st.drag.kind === 'pan') {
      const d = st.drag;
      if (Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0) > 4) d.moved = true;
      if (d.moved && !st.drive) { panBy(ev.clientX - d.lx, ev.clientY - d.ly); $('course').style.cursor = 'grabbing'; }
      d.lx = ev.clientX; d.ly = ev.clientY; return;
    }
    if (st.legPrev) { legAim(toWorld(ev)); return; }
    if (st.drawPts) { const p = toWorld(ev), q = st.drawPts[st.drawPts.length - 1]; if (Math.hypot(p.x - q.x, p.y - q.y) > 8) st.drawPts.push(p); return; }
    const d = st.drag;
    if (!d) { const p = toWorld(ev); $('course').style.cursor = hitBoat(p) ? (st.mode === 'setup' ? 'grab' : 'pointer') : hitGust(p) ? 'grab' : ''; return; }
    if (Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0) > 4) d.moved = true;
    if (!d.moved || d.kind === 'pick') return;
    const p = toWorld(ev);
    d.obj.x = Math.max(20, Math.min(W.w - 20, p.x + d.dx));
    d.obj.y = Math.max(20, Math.min(W.h - 10, p.y + d.dy));
    $('course').style.cursor = 'grabbing';
  }
  function onUp(ev) {
    if (ev && ev.pointerId != null) st.pts.delete(ev.pointerId);
    if (st.pinch) { if (st.pts.size < 2) st.pinch = null; return; }
    if (st.drag && st.drag.kind === 'pan') {
      const d = st.drag; st.drag = null; $('course').style.cursor = '';
      if (!d.moved) { if (st.sel) st.sel = null; if (st.gsel != null) st.gsel = null; gustBarUpdate(); updatePanel(true); }
      return;
    }
    if (st.legPrev) { legCommit(); return; }
    if (st.drawPts) { strokeCommit(st.drawPts); st.drawPts = null; return; }
    const d = st.drag; st.drag = null;
    if (!d) return;
    if (d.kind === 'gust' && d.moved && st.mode !== 'setup') {
      const idx = st.sim.gusts.indexOf(d.obj), pos = { x: d.obj.x, y: d.obj.y };
      d.obj.x = d.x1; d.obj.y = d.y1;                 // eski karedeki konumu geri koy; değişiklik bu andan itibaren
      if (idx >= 0) applyChange({ k: 'gustMove', i: idx, pos });
    }
    if (d.kind === 'gust' && (!d.moved || st.mode === 'setup')) { const i = gustList().indexOf(d.obj); if (i >= 0) gustSelect(i); }
    if (d.kind === 'pick') { if (!d.moved) { st.sel = st.sel === d.obj.id ? null : d.obj.id; st.gsel = null; } $('course').style.cursor = ''; updatePanel(true); return; }
    if (d.kind === 'boat' && !d.moved) { st.sel = st.sel === d.obj.id ? null : d.obj.id; }
    if (d.kind === 'boat' && d.moved) settleBoat(d.obj);
    if (d.kind === 'boat' && d.moved && S.lineSide(d.obj) === -1) toast('Bu tekne hattın üstünde: start\'ta erken (OCS) sayılır, geri dönmek zorunda kalır.');
    else if (d.kind === 'boat' && d.moved) {
      const u = (d.obj.x - S.LINE.pin.x) / (S.LINE.boat.x - S.LINE.pin.x);
      if (u < -0.05 || u > 1.05) toast('Bu tekne hattın ucunun dışında: önce hattın içine gelmeli, uçların dışından geçerse start sayılmaz.');
    }
    $('course').style.cursor = '';
    updatePanel(true);
  }

  // ---------- Rota düzenleyici ----------
  // Çizim modunda rota bir taslaktır (st.draft: noktalar, st.steps: geri alma için her adımda eklenen nokta sayısı).
  // "Tamam" ile uygulanır, "Vazgeç" ile eski rota kalır. Açılı modda her sürükleme bir bacak: yön orsadan
  // darsa orsa açısına (rüzgara 45°) oturur, değilse 5° adımlara. Serbest modda parmakla çizilen çizgi ≈40 px'e seyreltilir.
  function mineNow() { return (st.mode === 'setup' ? st.fleet : view().boats).find(b => b.mine); }
  function legOrigin() {
    if (st.draft.length) return st.draft[st.draft.length - 1];
    const m = mineNow(); return m ? { x: m.x, y: m.y } : null;
  }
  const clampW = p => ({ x: Math.max(20, Math.min(W.w - 20, p.x)), y: Math.max(20, Math.min(W.h - 10, p.y)) });
  function legAim(p) {
    const a = legOrigin(); if (!a) return;
    const w = view().wind, dx = p.x - a.x, dy = p.y - a.y;
    if (Math.hypot(dx, dy) < 4) { st.legPrev = { from: a, to: a, label: '' }; return; }
    const brg = E.norm360(Math.atan2(dx, -dy) * 180 / Math.PI), rel = E.norm180(brg - w);
    let h, label;
    if (Math.abs(rel) < 45) { const tack = rel < 0 ? 'starboard' : 'port'; h = E.tackHeading(w, tack); label = `orsa · ${tack === 'starboard' ? 'sancak' : 'iskele'} kontra`; }
    else { h = Math.round(brg / 5) * 5; const r = Math.abs(E.norm180(h - w)); label = r > 150 ? 'pupa' : r > 100 ? 'geniş apaz' : r > 70 ? 'apaz' : 'dar apaz'; }
    const f = E.fwd(h), len = Math.max(0, dx * f.x + dy * f.y);
    st.legPrev = { from: a, to: clampW({ x: a.x + f.x * len, y: a.y + f.y * len }), label };
  }
  function legCommit() {
    const { from: a, to } = st.legPrev; st.legPrev = null;
    if (Math.hypot(to.x - a.x, to.y - a.y) < 25) return;
    st.draft.push(to); st.steps.push(1); routeBarUpdate();
  }
  function strokeCommit(raw) {
    const pts = [raw[0]];
    for (const p of raw) { const q = pts[pts.length - 1]; if (Math.hypot(p.x - q.x, p.y - q.y) >= 40) pts.push(p); }
    const last = raw[raw.length - 1]; if (pts[pts.length - 1] !== last) pts.push(last);
    let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (len < 40) return;
    st.draft.push(...pts.map(clampW)); st.steps.push(pts.length); routeBarUpdate();
  }
  function routeUndo() { const n = st.steps.pop(); if (n) st.draft.splice(st.draft.length - n, n); routeBarUpdate(); }
  function routeWipe() { st.draft = []; st.steps = []; routeBarUpdate(); }
  function applyRoute(pts) {
    if (st.mode === 'setup') { const m = st.fleet.find(b => b.mine); if (m) m.route = pts; }
    else applyChange({ k: 'cmd', c: 'route', v: pts });
    updatePanel(true);
  }
  function startDraw() {
    const m = mineNow(); if (!m) return;
    if (st.mode === 'run') st.mode = 'pause';
    // var olan rotanın kalanı taslağa yüklenir: istersen geri alarak düzeltirsin
    const rest = m.route ? m.route.slice(m.routeIdx || 0) : [];
    st.draft = rest.map(p => ({ x: p.x, y: p.y })); st.steps = rest.map(() => 1);
    st.drawMode = true; st.legPrev = null; st.drawPts = null;
    document.body.classList.add('drawing');
    if (st.cat) openCat(null);                           // çizerken parkurun tamamı açık kalsın
    $('course').style.cursor = 'crosshair';
    routeBarUpdate(); updatePanel(true);
  }
  function endDraw(apply) {
    if (!st.drawMode) return;
    st.drawMode = false; st.legPrev = null; st.drawPts = null;
    document.body.classList.remove('drawing');
    $('course').style.cursor = '';
    routeBarUpdate();
    if (apply) {
      const m = mineNow(), before = m && m.route ? m.route.slice(m.routeIdx || 0) : [];
      const same = before.length === st.draft.length && before.every((p, i) => p.x === st.draft[i].x && p.y === st.draft[i].y);
      if (!same) {
        applyRoute(st.draft.length ? st.draft.slice() : null);
        toast(st.draft.length ? 'Rota kaydedildi: teknen bacakları izler, rüzgara karşı kısımda zikzak atar, sonra şamandıraya gider.' : 'Rota silindi.');
      }
    }
    st.draft = []; st.steps = [];
    updatePanel(true);
  }
  function routeBarUpdate() {
    const bar = $('routeBar'); bar.classList.toggle('hidden', !st.drawMode);
    $('btnRoute').classList.toggle('on', st.drawMode);
    if (!st.drawMode) return;
    [...$('rbMode').children].forEach(x => x.classList.toggle('on', x.dataset.v === st.routeMode));
    const n = st.steps.length;
    $('rbHint').textContent = n === 0
      ? (st.routeMode === 'acili' ? 'Teknenden başlayarak sürükle: her sürükleme bir bacak' : 'Parmağınla teknenin gideceği yolu çiz')
      : `${n} ${st.routeMode === 'acili' ? 'bacak' : 'parça'} · devam et ya da Tamam’a bas`;
    $('rbUndo').disabled = !n; $('rbWipe').disabled = !st.draft.length;
    $('rbDone').classList.toggle('ready', n > 0);
  }

  // Bırakılan tekne başka bir teknenin, pin'in ya da hakem botunun üstüne düştüyse en yakın boş yere kaydır
  function settleBoat(b) {
    const blocked = p => st.fleet.some(o => o !== b && Math.hypot(o.x - p.x, o.y - p.y) < 34) ||
      S.OBSTACLES.some(o => Math.hypot(o.x - p.x, o.y - p.y) < o.r + 22);
    if (!blocked(b)) return;
    for (let r = 10; r < 200; r += 8) for (let a = 0; a < 360; a += 30) {
      const p = { x: b.x + Math.sin(a * E.DEG) * r, y: b.y + Math.cos(a * E.DEG) * r };
      if (p.x > 20 && p.x < W.w - 20 && p.y > 20 && p.y < W.h - 10 && !blocked(p)) { b.x = p.x; b.y = p.y; toast('Orası dolu, tekne en yakın boş yere kaydırıldı'); return; }
    }
  }

  // ---------- Yarış kaydı: bitince "Kaydedelim mi?", Kayıtlar listesi, tekrar izleme, dosya ----------
  const dlgOpen = () => !$('saveDlg').classList.contains('hidden') || !$('recDlg').classList.contains('hidden');
  const fmtDate = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); };
  function raceSummary() {
    const last = st.frames[st.frames.length - 1], boats = last.boats;
    const mine = boats.find(b => b.mine), win = boats.find(b => b.finish === 1);
    return { boats: boats.length, cls: st.boat.cls, windKn: st.boat.windKn, mine: mine && !mine.dsq ? mine.finish || null : null, mineName: mine ? nameOf(mine) : '',
      winner: win ? nameOf(win) : '', penalties: boats.reduce((n, b) => n + (b.penalties || 0), 0), changes: st.rec.ops.length,
      dur: Math.max(0, Math.round((last.t - last.startAt) * S.CLOCK_SCALE)) };
  }
  function defaultName() {
    if (st.rec.savedId && st.rec.name) return `${st.rec.name} (değişik)`.slice(0, 40);
    const d = new Date(), cls = S.CLASSES[st.boat.cls] ? S.CLASSES[st.boat.cls].name : '';
    return `${cls} ${st.boat.windKn} kn · ${d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  function sumHtml(m) {
    const cls = S.CLASSES[m.cls] ? S.CLASSES[m.cls].name : m.cls;
    const chips = [`${esc(cls)} · ${m.windKn} kn`, `${m.boats} tekne`];
    if (m.mine) chips.push(`<b>${esc(m.mineName || 'Sen')}: ${m.mine}.</b>`);
    if (m.winner) chips.push(`Birinci: ${esc(m.winner)}`);
    chips.push(m.changes ? `${m.changes} değişiklik` : 'değişiklik yok');
    if (m.penalties) chips.push(`${m.penalties} ceza`);
    return chips.map(c => `<span class="rc">${c}</span>`).join('');
  }
  // Yarış bittiğinde: kaydedilmemiş değişiklik varsa ve bu hali için daha önce sorulmadıysa sor
  function askSave() {
    const r = st.rec;
    if (!r || !Rec.dirty(r) || r.asked === r.rev) return false;
    r.asked = r.rev;
    if (window.SailTrack) SailTrack.log('race_end', raceSummary());
    if (window.SailAccess && !SailAccess.can('sim.records')) return false;
    openSaveDlg(true);
    return true;
  }
  function openSaveDlg(atEnd) {
    if (!st.rec || !st.frames.length) return;
    if (window.SailAccess && !SailAccess.guard('sim.records')) return;
    if (st.mode === 'run') st.mode = 'pause';
    const m = raceSummary();
    $('saveDlgTitle').textContent = atEnd ? 'Yarış bitti · Kaydedelim mi?' : 'Bu yarışı kaydet';
    $('saveDlgSub').textContent = atEnd && m.mine ? `${m.mineName || 'Senin teknen'} ${m.mine}. oldu` : 'Kurulum ve yarış boyunca yaptığın her şey saklanır';
    $('saveDlgSum').innerHTML = sumHtml(m);
    $('saveName').value = defaultName();
    $('saveDlg').classList.remove('hidden');
    setTimeout(() => { $('saveName').focus(); $('saveName').select(); }, 30);
    updatePanel(true);
  }
  function closeSaveDlg() { $('saveDlg').classList.add('hidden'); }
  function saveRace() {
    const r = st.rec; if (!r) return;
    const name = $('saveName').value.replace(/\s+/g, ' ').trim().slice(0, 40) || defaultName();
    const setup = jcopy(r.setup), names = new Map(st.fleet.map(b => [b.id, b.sailor]));
    setup.fleet.forEach(b => { const n = names.get(b.id); if (n) b.sailor = n; else delete b.sailor; });   // yarışta değişen isimler
    const entry = { id: Rec.newId(), name, savedAt: new Date().toISOString(), setup, ops: jcopy(r.ops), summary: raceSummary() };
    try { Rec.put(entry); }
    catch (e) { toast('Kaydedilemedi: tarayıcının alanı dolu ya da kapalı. Kayıtlar\'dan eski yarışları silip ya da dosyaya aktarıp yeniden dene.'); return; }
    r.savedRev = r.rev; r.savedId = entry.id; r.name = name;
    closeSaveDlg(); updatePanel(true);
    toast(`Kaydedildi: “${name}” · Kayıtlar'dan tekrar izleyebilirsin`);
    if (window.SailTrack) SailTrack.log('race_save', { name });
  }
  // Kayıttaki kurulumu ekrana koy
  function useSetup(su) {
    if (st.drive) exitDrive(false);
    if (st.drawMode) endDraw(false);
    st.course = { ...S.COURSE_DEFAULT, ...(su.course || {}) }; S.setCourse(st.course);
    st.sea = { ...S.SEA_DEFAULT, ...(su.sea || {}) }; setBoatCfg({ ...S.BOAT_DEFAULT, ...(su.boat || {}) });
    st.wind = +su.wind || 0; st.gusts = jcopy(su.gusts || []); st.fleet = jcopy(su.fleet);
    st.sel = null; st.gsel = null; gustBarUpdate();
  }
  function openRace(e, watch) {
    useSetup(e.setup);
    if (!watch) {
      st.mode = 'setup'; st.sim = null; st.frames = []; st.rec = null;
      fitViewBox(); updatePanel(true); toast(`“${e.name}” kurulumu yüklendi: değiştirip yeniden start verebilirsin`);
      return;
    }
    st.frames = replay(e); st.playT = 0; st.sim = viewAt(0); st.mode = 'pause'; st.ended = false;
    st.rec = Object.assign(Rec.begin(jcopy(e.setup)), { ops: jcopy(e.ops), rev: 0, savedRev: 0, asked: 0, savedId: e.id, name: e.name });
    fitViewBox(); updatePanel(true); toast(`“${e.name}” yüklendi · ▶ ile izle, istediğin yerde değiştir`);
  }
  function download(name, text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
  }
  // iki dokunuşla onay (silme / kaydedilmemiş yarışı bırakma)
  function armed(btn, text) {
    if (btn.dataset.armed && Date.now() - +btn.dataset.armed < 3000) return true;
    const old = btn.innerHTML; btn.dataset.armed = Date.now(); btn.textContent = text; btn.classList.add('armed');
    setTimeout(() => { delete btn.dataset.armed; btn.innerHTML = old; btn.classList.remove('armed'); }, 3000);
    return false;
  }
  function openRecDlg() { if (window.SailAccess && !SailAccess.guard('sim.records')) return; recRender(); $('recDlg').classList.remove('hidden'); }
  function closeRecDlg() { $('recDlg').classList.add('hidden'); }
  function recRender() {
    const races = Rec.list(), r = st.rec, can = !!(r && st.frames.length);
    const sv = $('recSaveNow');
    sv.disabled = !can || !Rec.dirty(r);
    sv.classList.toggle('primary', can && Rec.dirty(r));
    sv.innerHTML = !can ? 'Kaydedilecek yarış yok' : Rec.dirty(r) ? '<svg class="ci"><use href="#i-save"/></svg>Bu yarışı kaydet' : '<svg class="ci"><use href="#i-check"/></svg>Bu yarış kayıtlı';
    sv.title = !can ? "Önce start ver: yarış başlayınca kaydedebilirsin" : '';
    $('recExportAll').disabled = !races.length;
    $('recCount').textContent = races.length ? `${races.length} yarış` : '';
    $('recList').innerHTML = races.length ? races.map(e => `<li class="rec-item${r && r.savedId === e.id ? ' cur' : ''}" data-id="${esc(e.id)}">
        <div class="rec-main"><div class="rec-name">${esc(e.name)}${r && r.savedId === e.id ? ' <span class="rec-cur">açık</span>' : ''}</div>
          <div class="rec-date">${esc(fmtDate(e.savedAt))}</div>
          ${e.summary ? `<div class="rec-sum">${sumHtml(e.summary)}</div>` : ''}</div>
        <div class="rec-act">
          <button class="tb primary" data-act="watch" title="Yarışı aynen tekrar oynat"><svg class="ci"><use href="#i-play"/></svg>İzle</button>
          <button class="tb" data-act="setup" title="Yalnız kurulumu yükle (tekneler, isimler, parkur, rüzgar)">Kurulum</button>
          <button class="tb" data-act="file" title="Dosya olarak indir (başka cihaza taşı, paylaş)"><svg class="ci"><use href="#i-download"/></svg>Dosya</button>
          <button class="tb del" data-act="del" title="Kaydı sil">Sil</button>
        </div></li>`).join('')
      : '<li class="rec-empty">Henüz kayıtlı yarış yok.<br>Start ver, yarış bitince “Kaydedelim mi?” diye sorulur. Başka cihazdan aldığın yarış dosyasını <b>Dosyadan yükle</b> ile açabilirsin.</li>';
  }
  $('btnRecs').addEventListener('click', openRecDlg);
  $('recDlgClose').addEventListener('click', closeRecDlg);
  $('recDlg').addEventListener('click', e => { if (e.target === $('recDlg')) closeRecDlg(); });
  $('recSaveNow').addEventListener('click', () => { closeRecDlg(); openSaveDlg(false); });
  $('recExportAll').addEventListener('click', () => { const a = Rec.list(); if (a.length) download(`yarislar-${new Date().toISOString().slice(0, 10)}.json`, Rec.toFile(a)); });
  $('recList').addEventListener('click', ev => {
    const btn = ev.target.closest('button[data-act]'), li = ev.target.closest('li[data-id]'); if (!btn || !li) return;
    const e = Rec.get(li.dataset.id); if (!e) { recRender(); return; }
    const act = btn.dataset.act;
    if (act === 'file') { download(Rec.fileName(e), Rec.toFile(e)); return; }
    if (act === 'del') { if (!armed(btn, 'Emin misin?')) return; Rec.remove(e.id); if (st.rec && st.rec.savedId === e.id) { st.rec.savedId = null; st.rec.savedRev = -1; } recRender(); toast(`“${e.name}” silindi`); return; }
    if (Rec.dirty(st.rec) && st.frames.length && !armed(btn, 'Kaydedilmemiş yarış gidecek, emin misin?')) return;
    closeRecDlg(); openRace(e, act === 'watch');
  });
  $('recFile').addEventListener('change', ev => {
    const f = ev.target.files && ev.target.files[0]; ev.target.value = '';
    if (!f) return;
    f.text().then(text => {
      const got = Rec.fromFile(text);
      if (!got.length) { toast('Bu dosyada yarış kaydı bulunamadı'); return; }
      try { for (const e of got.reverse()) Rec.put(e); } catch (e) { toast('Kaydedilemedi: tarayıcının alanı dolu'); return; }
      recRender(); toast(got.length > 1 ? `${got.length} yarış yüklendi` : `“${got[0].name}” yüklendi · İzle ile aç`);
    });
  });
  $('saveYes').addEventListener('click', saveRace);
  $('saveNo').addEventListener('click', () => { closeSaveDlg(); toast('Kaydedilmedi · istersen Kayıtlar\'dan sonra da kaydedebilirsin'); });
  $('saveDlgClose').addEventListener('click', closeSaveDlg);
  $('saveName').addEventListener('keydown', e => { if (e.key === 'Enter') saveRace(); else if (e.key === 'Escape') closeSaveDlg(); });

  // ---------- panel aç/kapa ----------
  function setPanelOpen(open) { if (!open) openCat(null); else if (!st.cat) openCat('rank'); }
  // ---------- Ayar kategorileri: dokun → aç, yeniden dokun → kapat (aynı anda bir kategori) ----------
  const CAT_TITLE = { mine: 'Senin teknen', wind: 'Rüzgar', gust: 'Sağanak', sea: 'Deniz', fleet: 'Filo ve tekne sınıfı', course: 'Parkur ve start bayrakları', show: 'Sahnede göster', rank: 'Sıralama ve olaylar', help: 'Nasıl kullanılır', sel: 'Seçili tekne' };
  function openCat(cat, keep) {
    if (!keep && cat && cat === st.cat) cat = null;      // aynı düğme: kapat
    if (st.cat === 'sel' && cat !== 'sel' && st.sel) { st.sel = null; st.selShown = null; }   // seçili tekne kartından çıkınca seçim kalkar
    st.cat = cat || null;
    const p = $('panel'), was = !p.classList.contains('hidden');
    p.dataset.open = st.cat || '';
    p.classList.toggle('hidden', !st.cat);
    if (st.cat) { $('catTitle').textContent = CAT_TITLE[st.cat] || 'Ayarlar'; p.querySelector('.panel-scroll').scrollTop = 0; }
    [...document.querySelectorAll('#catRail [data-cat]')].forEach(x => { x.classList.toggle('on', x.dataset.cat === st.cat); x.setAttribute('aria-expanded', x.dataset.cat === st.cat); });
    if (was !== !!st.cat) fitViewBox();
    updatePanel(true);
  }
  // kapalı kategoride varsayılandan farklı bir ayar varsa düğmede turuncu nokta
  function catDots(v, mine) {
    const sea = v.sea || st.sea, b = st.boat, D = S.BOAT_DEFAULT, C = S.COURSE_DEFAULT;
    const on = {
      mine: !!(mine && (mine.manual || mine.ignoresRules || (mine.speedK || 1) !== 1 || (mine.route && mine.route.length) || mine.sheetOff)),
      wind: Math.round(E.norm180(v.wind)) !== 0 || b.windKn !== D.windKn, gust: (v.gusts || []).length > 0, sea: !!(sea.current || sea.waves || sea.from != null),
      fleet: b.cls !== D.cls || b.accelAt !== D.accelAt || b.pre !== D.pre || b.vis !== D.vis, course: st.course.lineLen !== C.lineLen || st.course.markDist !== C.markDist || (st.course.flag || 'P') !== 'P'
    };
    [...document.querySelectorAll('#catRail [data-cat]')].forEach(x => x.classList.toggle('dot', !!on[x.dataset.cat]));
    // değişmiş ayar rozeti (yalnız kurulumda): kaç bölüm varsayılandan farklı + filoda yol vermez / hız farkı / yalpalama
    const fleetMods = st.mode === 'setup' && st.fleet.some(b => !b.mine && (b.ignoresRules || (b.speedK || 1) !== 1 || b.drift || b.manual));
    const n = Object.values(on).filter(Boolean).length + (fleetMods ? 1 : 0), show = st.mode === 'setup' && !st.drive && n > 0;
    const rb = $('btnResetSet'); rb.classList.toggle('hidden', !show);
    if (show && rb.dataset.n !== String(n)) { rb.dataset.n = n; rb.querySelector('span').innerHTML = `Varsayılan<b>${n}</b>`; }
  }
  // Değişmiş ayarları tek dokunuşla geri al: rüzgar, sağanak, deniz, sınıf, parkur/bayrak, teknelerin özel ayarları.
  // Tekne yerleri, isimler ve taktikler (sol/orta/sağ) kalır. Tümünü sıfırla'dan farkı bu.
  function resetSettings() {
    if (st.mode !== 'setup' || st.drive) return;
    if (st.drawMode) endDraw(false);
    st.wind = 0; st.gusts = []; st.gsel = null; st.sea = { ...S.SEA_DEFAULT };
    setBoatCfg({ ...S.BOAT_DEFAULT, vis: st.boat.vis });
    st.course = { ...S.COURSE_DEFAULT }; S.setCourse(st.course);
    for (const b of st.fleet) { b.ignoresRules = false; b.speedK = 1; b.drift = 0; b.manual = false; b.route = null; b.drv = false; b.sheetOff = 0; }
    fitViewBox(); updatePanel(true); gustBarUpdate();
    toast('Ayarlar varsayılana döndü: rüzgar 0°, sağanak ve akıntı yok, Optimist 8 kn. Tekne yerleri ve isimler kaldı');
  }
  // Düzen: yatay ekranda sağda dikey ray, dikey ekranda (ve telefonda) alt çubukta şerit
  function applyLayout() {
    const rail = innerWidth > innerHeight && (innerWidth >= 700 || innerHeight <= 500);   // yatay telefon da ray düzeninde
    const b = document.body, was = b.classList.contains('lay-rail') ? 'rail' : b.classList.contains('lay-strip') ? 'strip' : '';
    if (was !== (rail ? 'rail' : 'strip')) {
      b.classList.toggle('lay-rail', rail); b.classList.toggle('lay-strip', !rail);
      if (rail) { document.querySelector('main.stage').appendChild($('catRail')); document.querySelector('.main-row').appendChild($('quick')); }
      else { $('stripHost').appendChild($('catRail')); $('crQuick').appendChild($('quick')); }
    }
    fitViewBox();
  }

  // ---------- olaylar ----------
  $('btnPlay').addEventListener('click', togglePlay);
  $('btnReset').addEventListener('click', backToSetup);
  $('hpReset').addEventListener('click', backToSetup);
  $('speedSeg').addEventListener('click', e => { let b = e.target.closest('button'); if (!b) return;
    if (b.classList.contains('on') && phoneMq.matches) b = b.nextElementSibling || $('speedSeg').firstElementChild;   // telefonda yalnız seçili görünür: dokununca sıradaki hız
    setSpeed(+b.dataset.v); });
  // Saat hızı (izlerken ve elle sürerken aynı): varsayılan 1× = gerçek zaman. Teknelerin ekrandaki hızı ayrı ayar (Filo → Ekranda hız).
  const SPEEDS = [0.5, 1, 2, 5, 10], spTxt = v => (v === 0.5 ? '½' : v) + '×';
  const DRIVE_SPEEDS = [0.5, 1, 2, 5];                    // elle sürerken daha hızlısı dümeni zorlaştırır
  function setSpeed(v) {
    st.speed = v; [...$('speedSeg').children].forEach(x => x.classList.toggle('on', +x.dataset.v === v));
    [...$('dbSpeedSeg').children].forEach(x => x.classList.toggle('on', +x.dataset.v === v));
    const x = $('dbSpeed'); x.textContent = spTxt(v); x.classList.toggle('changed', v !== 1);
    x.title = `Saat: ${spTxt(v)}${v === 1 ? ' (gerçek zaman)' : ''} · dokun → sıradaki`;
  }
  // elle sürerken: dar ekranda tek düğme, dokununca sıradaki (½× → 1× → 2× → 5×); geniş ekranda yan yana
  $('dbSpeed').addEventListener('click', () => { const i = DRIVE_SPEEDS.indexOf(st.speed), v = DRIVE_SPEEDS[(i + 1) % DRIVE_SPEEDS.length]; setSpeed(v); toast(`Saat ${spTxt(v)}${v === 1 ? ': gerçek zaman' : ''}`); });
  $('dbSpeedSeg').innerHTML = DRIVE_SPEEDS.map(v => `<button data-v="${v}" title="Saat ${spTxt(v)}${v === 1 ? ' (gerçek zaman)' : ''}">${spTxt(v)}</button>`).join('');
  $('dbSpeedSeg').addEventListener('click', e => { const x = e.target.closest('button'); if (x) setSpeed(+x.dataset.v); });
  setSpeed(st.speed || 1);
  st.fastPre = true;
  try { localStorage.removeItem('ps.sim.fastPre'); } catch (e) { /* yok */ }   // artık kaydedilmez: her açılışta hızlı geçiş açık
  $('cbPre').innerHTML = S.PRE_SEC.map(v => `<button data-v="${v}" title="Start'a ${v / 60} dakika">${v / 60}</button>`).join('') + '<i>dk</i>';
  $('cbPre').addEventListener('click', e => { const x = e.target.closest('button'); if (x) changeBoat('pre', +x.dataset.v); });
  $('cbFast').addEventListener('click', () => {
    st.fastPre = !st.fastPre;
    toast(st.fastPre ? 'Geri sayım son dakikaya kadar 10× akar' : 'Geri sayım seçili hızla akar (1× = gerçek zaman)');
  });
  $('cbJump1').addEventListener('click', () => jumpTo(60));
  $('cbJump0').addEventListener('click', () => jumpTo(10));
  $('scrub').addEventListener('input', e => {
    if (!st.frames.length || st.drive) return;
    st.playT = +e.target.value; st.sim = viewAt(st.playT);
    if (st.mode === 'run' || st.mode === 'end') st.mode = 'pause';
    updatePanel(true);
  });
  $('btnShowSpeed').addEventListener('click', () => { st.show.speed = !st.show.speed; $('btnShowSpeed').classList.toggle('on', st.show.speed); });
  $('btnShowShadow').addEventListener('click', () => { st.show.shadow = !st.show.shadow; $('btnShowShadow').classList.toggle('on', st.show.shadow); });
  $('btnShowZone').addEventListener('click', () => { st.show.zone = !st.show.zone; $('btnShowZone').classList.toggle('on', st.show.zone); });
  $('flagSeg').innerHTML = FLAGS.map(f => `<button data-v="${f}" title="${esc(FLAG_INFO[f].name + ': ' + FLAG_INFO[f].short)}">${flagSvgTag(f)}<span>${f}</span></button>`).join('');
  $('flagSeg').addEventListener('click', e => { const x = e.target.closest('button'); if (x) setFlag(x.dataset.v); });
  $('btnWindL').addEventListener('click', () => setWind(-5));
  $('btnWindR').addEventListener('click', () => setWind(5));
  $('btnGustL').addEventListener('click', () => addGust('L'));
  $('btnGustR').addEventListener('click', () => addGust('R'));
  $('btnGustClear').addEventListener('click', clearGusts);
  $('btnTack').addEventListener('click', () => { if (st.drive) helmTurn('tack'); else if (st.frames.length) applyChange({ k: 'cmd', c: 'tack' }); });
  $('selMinePersona').addEventListener('change', e => {
    if (st.mode === 'setup') { const m = st.fleet.find(b => b.mine); if (m) m.persona = e.target.value; updatePanel(true); }
    else { const v = e.target.value; applyChange({ k: 'cmd', c: 'persona', v }); }
  });
  $('btnFleetMinus').addEventListener('click', () => { removeOne(); updatePanel(true); });
  $('btnFleetPlus').addEventListener('click', () => { addOne(); updatePanel(true); });
  $('btnFleetLine').addEventListener('click', () => { setFleetSize(st.fleet.length); updatePanel(true); toast('Tekneler hattın dibine yeniden dizildi'); });
  $('selTack').addEventListener('click', e => { const x = e.target.closest('button'); const b = st.fleet.find(q => q.id === st.sel); if (x && b) { b.tack = x.dataset.v; updatePanel(true); } });
  const LS = COURSE_LIM.lineLen[2], MS = COURSE_LIM.markDist[2];
  $('btnLineMinus').addEventListener('click', () => changeCourse({ ...st.course, lineLen: st.course.lineLen - LS }));
  $('btnLinePlus').addEventListener('click', () => changeCourse({ ...st.course, lineLen: st.course.lineLen + LS }));
  $('btnMarkMinus').addEventListener('click', () => changeCourse({ ...st.course, markDist: st.course.markDist - MS }));
  $('btnMarkPlus').addEventListener('click', () => changeCourse({ ...st.course, markDist: st.course.markDist + MS }));
  $('btnCourseReset').addEventListener('click', () => { changeCourse({ ...S.COURSE_DEFAULT, flag: st.course.flag }); toast('Parkur varsayılana döndü'); });
  $('gbMinus').addEventListener('click', () => gustScale(1 / 1.2));
  $('gbPlus').addEventListener('click', () => gustScale(1.2));
  $('gbReset').addEventListener('click', gustReset);
  $('gbDelete').addEventListener('click', gustDelete);
  $('gbClose').addEventListener('click', () => { st.gsel = null; gustBarUpdate(); updatePanel(true); });
  $('btnRoute').addEventListener('click', () => (st.drawMode ? endDraw(true) : startDraw()));
  $('rbMode').addEventListener('click', e => { const x = e.target.closest('button'); if (x) { st.routeMode = x.dataset.v; routeBarUpdate(); } });
  $('rbUndo').addEventListener('click', routeUndo);
  $('rbWipe').addEventListener('click', routeWipe);
  $('rbCancel').addEventListener('click', () => endDraw(false));
  $('rbDone').addEventListener('click', () => endDraw(true));
  $('selMineSpeed').addEventListener('change', e => {
    const v = +e.target.value;
    if (st.mode === 'setup') { const m = st.fleet.find(b => b.mine); if (m) m.speedK = v; updatePanel(true); }
    else applyChange({ k: 'cmd', c: 'speed', v });
  });
  $('selSpeed').addEventListener('click', e => { const x = e.target.closest('button'); if (x) selEdit('speedK', +x.dataset.v, 'speed'); });
  $('selDrift').addEventListener('click', e => { const x = e.target.closest('button'); if (x) selEdit('drift', +x.dataset.v, 'drift'); });
  // ---------- Tekne sınıfı, rüzgar hızı, hızlanma anı (yalnız kurulumda) ----------
  function setBoatCfg(c) {
    const cls = S.CLASSES[c.cls] ? c.cls : S.BOAT_DEFAULT.cls;
    const windKn = Math.max(2, Math.min(30, +c.windKn || S.BOAT_DEFAULT.windKn)), accelAt = Math.max(5, Math.min(120, +c.accelAt || S.BOAT_DEFAULT.accelAt));
    const pre = Math.max(60, Math.min(600, +c.pre || S.BOAT_DEFAULT.pre));
    const vis = S.VIS[c.vis] ? c.vis : 'eski';   // alanı olmayan (v1.95 öncesi) kayıt eski ölçekte oynar
    st.boat = { cls, windKn, accelAt, pre, vis }; S.setBoat(st.boat);   // zaman ölçeği ve geri sayım buna göre
  }
  const segHtml = (vals, txt) => vals.map(v => `<button data-v="${v}">${txt(v)}</button>`).join('');
  $('boatCls').innerHTML = segHtml(Object.keys(S.CLASSES), k => S.CLASSES[k].name);
  $('boatWind').innerHTML = segHtml(S.WIND_KN, v => `${v} kn`);
  $('boatAccel').innerHTML = segHtml(S.ACCEL_AT, v => `${v} sn`);
  $('boatPre').innerHTML = segHtml(S.PRE_SEC, v => `${v / 60} dk`);
  const VIS_TXT = { yavas: 'Yavaş', normal: 'Normal', hizli: 'Hızlı' };
  $('boatVis').innerHTML = Object.keys(VIS_TXT).map(k => `<button data-v="${k}">${VIS_TXT[k]}</button>`).join('');
  function boatUpdate() {
    const b = st.boat, setup = st.mode === 'setup', D = S.BOAT_DEFAULT;
    [['boatCls', b.cls], ['boatWind', b.windKn], ['boatAccel', b.accelAt], ['boatPre', b.pre], ['boatVis', b.vis]].forEach(([id, val]) =>
      [...$(id).children].forEach(x => { x.classList.toggle('on', x.dataset.v === String(val)); x.disabled = !setup; }));
    const def = b.cls === D.cls && b.windKn === D.windKn && b.accelAt === D.accelAt && b.pre === D.pre && b.vis === D.vis;
    $('boatState').textContent = `orsada ≈${S.upwindKn(b.cls, b.windKn).toFixed(1).replace('.', ',')} kn`;
    $('boatState').classList.toggle('changed', !def);
    $('btnBoatReset').disabled = !setup || def;
  }
  function changeBoat(key, val) {
    if (st.mode !== 'setup') return;
    setBoatCfg({ ...st.boat, [key]: val }); updatePanel(true);
    if (key === 'pre') { toast(`Start geri sayımı ${val / 60} dakika`); return; }
    if (key === 'vis') { toast(`Teknelerin ekrandaki hızı: ${VIS_TXT[val]} · saat yine gerçek zamanda akar`); return; }
    toast(key === 'accelAt' ? `Tekneler start'a ${val} sn kala yelken doldurup hızlanacak` : `${S.CLASSES[st.boat.cls].name}, ${st.boat.windKn} knot rüzgar: orsada ≈${S.upwindKn(st.boat.cls, st.boat.windKn).toFixed(1).replace('.', ',')} kn`);
  }
  $('boatCls').addEventListener('click', e => { const x = e.target.closest('button'); if (x) changeBoat('cls', x.dataset.v); });
  $('boatWind').addEventListener('click', e => { const x = e.target.closest('button'); if (x) changeBoat('windKn', +x.dataset.v); });
  $('boatAccel').addEventListener('click', e => { const x = e.target.closest('button'); if (x) changeBoat('accelAt', +x.dataset.v); });
  $('boatPre').addEventListener('click', e => { const x = e.target.closest('button'); if (x) changeBoat('pre', +x.dataset.v); });
  $('boatVis').addEventListener('click', e => { const x = e.target.closest('button'); if (x) changeBoat('vis', x.dataset.v); });
  $('btnBoatReset').addEventListener('click', () => { if (st.mode !== 'setup') return; setBoatCfg({ ...S.BOAT_DEFAULT }); updatePanel(true); toast('Varsayılan: Optimist, 8 knot rüzgar, 30 sn kala hızlanma, 5 dk geri sayım, ekranda Normal hız'); });
  function setSea(key, val) {
    if (st.mode === 'setup') { st.sea = { ...st.sea, [key]: val }; updatePanel(true); return; }
    applyChange({ k: 'sea', key, val });
  }
  $('seaCurrent').addEventListener('click', e => { const x = e.target.closest('button'); if (x) setSea('current', +x.dataset.v); });
  const FROM_EFFECT = { w: 'Rüzgarla aynı yönden: tekneleri rüzgaraltına taşır', 0: 'Karşıdan: tekneleri aşağı taşır (orsa uzar)', 180: 'Arkadan: tekneleri ileri, şamandıraya taşır (start\'ta erken çıkma riski)',
    90: 'Sağdan: tekneleri sola taşır', 270: 'Soldan: tekneleri sağa taşır', 45: 'Sağ üstten: sola ve aşağı taşır', 315: 'Sol üstten: sağa ve aşağı taşır', 135: 'Sağ alttan: sola ve yukarı taşır', 225: 'Sol alttan: sağa ve yukarı taşır' };
  $('seaFrom').addEventListener('click', e => { const x = e.target.closest('button'); if (!x) return; const v = x.dataset.v === 'w' ? null : +x.dataset.v;
    if (!(st.mode === 'setup' ? st.sea : (st.sim.sea || st.sea)).current) setSea('current', 2);   // yön seçilince akıntı yoksa orta güçte açılır
    setSea('from', v); });
  $('seaWaves').addEventListener('click', e => { const x = e.target.closest('button'); if (x) setSea('waves', +x.dataset.v); });
  $('selRules').addEventListener('click', e => { const x = e.target.closest('button'); if (x) selEdit('ignoresRules', x.dataset.v === 'vermez', 'rules'); });
  function toggleManual() {
    if (st.drive) exitDrive(false);                     // otomatik tramolaya dönmeden önce elle sürmeyi bitir
    const mine = (st.mode === 'setup' ? st.fleet : view().boats).find(b => b.mine); if (!mine) return;
    const on = !mine.manual;
    if (st.mode === 'setup') { mine.manual = on; if (on) mine.route = null; updatePanel(true); }
    else applyChange({ k: 'cmd', c: 'manual', v: on });
    toast(on ? 'Manuel: start\'tan sonra tramolayı yalnız sen atarsın (Tramola düğmesi ya da T)' : 'Otomatik: teknen taktiğine göre kendisi tramola atar');
  }
  $('btnManual').addEventListener('click', toggleManual);
  $('btnMineRules').addEventListener('click', () => {
    const mine = (st.mode === 'setup' ? st.fleet : view().boats).find(b => b.mine); if (!mine) return;
    const on = !mine.ignoresRules;
    if (st.mode === 'setup') { mine.ignoresRules = on; updatePanel(true); }
    else applyChange({ k: 'cmd', c: 'rules', v: on });
    toast(on ? 'Senin teknen artık yol vermiyor: hak sahibi kaçmak zorunda kalırsa protesto edilirsin' : 'Senin teknen yine kurallara uyuyor');
  });
  // seçili tekne: kurulumda doğrudan, yarışta o andan itibaren yeniden hesaplanır
  function selEdit(prop, val, cmd) {
    if (!st.sel) return;
    if (st.mode === 'setup') { const b = st.fleet.find(q => q.id === st.sel); if (b) { b[prop] = val; updatePanel(true); } }
    else { const id = st.sel; applyChange({ k: 'cmd', c: cmd, v: val, id }); }
  }
  $('selPersona').addEventListener('click', e => { const x = e.target.closest('button'); if (x) selEdit('persona', x.dataset.v, 'persona'); });
  $('selName').addEventListener('input', e => {
    const id = st.sel; if (!id) return;
    const nm = e.target.value.replace(/\s+/g, ' ').trimStart().slice(0, 18);
    const set = b => { if (b.id === id) { if (nm.trim()) b.sailor = nm.trim(); else delete b.sailor; } };
    st.fleet.forEach(set); for (const f of st.frames) f.boats.forEach(set); if (st.sim) st.sim.boats.forEach(set);
    updatePanel(true);
  });
  $('selName').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
  $('btnClearSaved').addEventListener('click', clearSaved);
  $('btnResetAll').addEventListener('click', clearSaved);
  $('btnResetSet').addEventListener('click', resetSettings);
  $('btnMakeMine').addEventListener('click', () => { if (st.sel) { makeMine(st.sel); updatePanel(true); } });
  $('btnRemoveBoat').addEventListener('click', () => { if (st.sel) { removeOne(st.sel); updatePanel(true); } });
  $('btnSelClose').addEventListener('click', () => { st.sel = null; updatePanel(true); });
  $('msSel').addEventListener('click', () => { st.sel = null; st.gsel = null; gustBarUpdate(); updatePanel(true); });
  $('standings').addEventListener('click', e => {
    const li = e.target.closest('li[data-id]'); if (!li) return;
    st.sel = st.sel === li.dataset.id ? null : li.dataset.id; st.gsel = null; gustBarUpdate(); updatePanel(true);
  });
  // komut düğmesine basınca kısa parlama: komutun alındığı görülsün
  const flash = id => { const x = $(id); x.classList.remove('fired'); void x.offsetWidth; x.classList.add('fired'); };
  $('btnTack').addEventListener('click', () => flash('btnTack'));
  $('chkStartLay').addEventListener('change', e => { st.show.startLay = e.target.checked; render(); });
  $('chkMineOnly').addEventListener('change', e => { st.mineOnly = e.target.checked; updatePanel(true); });
  $('catRail').addEventListener('click', e => { const x = e.target.closest('button[data-cat]'); if (x) openCat(x.dataset.cat); });
  $('btnSheetEase').addEventListener('click', () => sheetBy(1));
  $('btnSheetTrim').addEventListener('click', () => sheetBy(-1));
  $('btnPanelClose').addEventListener('click', () => setPanelOpen(false));
  // tam ekran: iPad'de sistemin X düğmesi sol üste biner → üst çubukta yer aç
  const fsSync = () => document.documentElement.classList.toggle('is-fs', !!(document.fullscreenElement || document.webkitFullscreenElement));
  document.addEventListener('fullscreenchange', fsSync); document.addEventListener('webkitfullscreenchange', fsSync);
  $('btnFull').addEventListener('click', () => { const d = document.documentElement; if (!(document.fullscreenElement || document.webkitFullscreenElement)) (d.requestFullscreen || d.webkitRequestFullscreen || (() => {})).call(d); else (document.exitFullscreen || document.webkitExitFullscreen).call(document); });
  const svg = $('course');
  svg.addEventListener('pointerdown', onDown);
  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerup', onUp);
  svg.addEventListener('pointercancel', onUp);
  // elle sürme: dümen paneli ve klavye
  holdBtn('hpLeft', () => { if (st.drive) st.drive.touchRud = -1; }, () => { if (st.drive) st.drive.touchRud = 0; });
  holdBtn('hpRight', () => { if (st.drive) st.drive.touchRud = 1; }, () => { if (st.drive) st.drive.touchRud = 0; });
  $('hpSheet').addEventListener('click', sheetToggle);
  $('hpVmg').addEventListener('click', vmgToggle);
  $('hpBack').addEventListener('click', backToggle);
  $('hpTack').addEventListener('click', () => { helmTurn('auto'); flash('hpTack'); });
  $('hpGo').addEventListener('click', () => { if (!st.drive) return; const live = st.drive.live, run = live && !st.drive.paused; exitDrive(live ? run : false); });
  $('hpPlay').addEventListener('click', drivePause);
  $('btnDrive').addEventListener('click', () => (st.drive ? $('hpGo').click() : enterDrive()));
  const RUD_KEYS = { ArrowLeft: -1, ArrowRight: 1, a: -1, A: -1, d: 1, D: 1 };
  document.addEventListener('keyup', e => { if (st.drive && RUD_KEYS[e.key] != null) st.drive.keyRud = 0; });
  window.addEventListener('blur', () => { if (st.drive) { st.drive.keyRud = 0; st.drive.touchRud = 0; } });
  document.addEventListener('keydown', e => {
    if (e.target.closest('input, select, textarea')) return;
    if (dlgOpen()) { if (e.key === 'Escape') { closeSaveDlg(); closeRecDlg(); } return; }
    if (st.drive) {                                      // elle sürerken klavye dümen ve iskotadır
      const k = e.key;
      if (RUD_KEYS[k] != null) { e.preventDefault(); st.drive.keyRud = RUD_KEYS[k]; return; }
      if (k === 'ArrowUp' || k === 'w' || k === 'W') { e.preventDefault(); sheetBy(-1); return; }
      if (k === 'ArrowDown' || k === 's' || k === 'S') { e.preventDefault(); sheetBy(1); return; }
      if (k === 't' || k === 'T' || k === 'k' || k === 'K') { helmTurn('auto'); flash('hpTack'); return; }
      if (k === 'v' || k === 'V') { vmgToggle(); return; }
      if (k === 'b' || k === 'B') { backToggle(); return; }
      if (k === 'i' || k === 'I') { sheetToggle(); return; }
      if ((k === 'r' || k === 'R') && st.drive.live && !e.metaKey && !e.ctrlKey) { backToSetup(); return; }
      if (k === 'Escape' || k === 'Enter') { e.preventDefault(); $('hpGo').click(); return; }
      if (e.code === 'Space') { e.preventDefault(); drivePause(); return; }
    } else if ((e.key === 'd' || e.key === 'D') && !e.metaKey && !e.ctrlKey) { enterDrive(); return; }
    else if (e.key === 'ArrowUp' && st.mode !== 'setup') { e.preventDefault(); sheetBy(-1); return; }
    else if (e.key === 'ArrowDown' && st.mode !== 'setup') { e.preventDefault(); sheetBy(1); return; }
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    else if (e.key === 't' || e.key === 'T') $('btnTack').click();
    else if (e.key === 'm' || e.key === 'M') toggleManual();
    else if (e.key === 'Escape' && st.drawMode) endDraw(false);
    else if (e.key === 'Escape' && st.gsel != null) $('gbClose').click();
    else if (e.key === 'Enter' && st.drawMode) endDraw(true);
    else if ((e.metaKey || e.ctrlKey) && e.key === 'z' && st.drawMode) { e.preventDefault(); routeUndo(); }
    else if (e.key === '+' || e.key === '=') zoomBy(1.4);
    else if (e.key === '-') zoomBy(1 / 1.4);
    else if (e.key === '0') camFit();
    else if (e.key === 'f' || e.key === 'F') camFollow();
    else if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && st.mode !== 'setup') backToSetup();
    else if (e.key === 'ArrowLeft') setWind(-5);
    else if (e.key === 'ArrowRight') setWind(5);
  });
  svg.addEventListener('wheel', e => { e.preventDefault(); zoomTo(st.cam.z * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0022)), e.clientX, e.clientY); }, { passive: false });
  // iPad Safari: sayfanın kendisi yakınlaşmasın (parmak hareketi parkuru yakınlaştırır)
  ['gesturestart', 'gesturechange'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
  $('btnZoomIn').addEventListener('click', () => zoomBy(1.4));
  $('btnZoomOut').addEventListener('click', () => zoomBy(1 / 1.4));
  $('btnZoomFit').addEventListener('click', camFit);
  $('btnFollow').addEventListener('click', camFollow);
  window.addEventListener('resize', applyLayout);
  phoneMq.addEventListener('change', applyLayout);
  // alt çubuğun yüksekliği değişince (elle sürme paneli açılınca) sahne yeniden sığsın
  if (window.ResizeObserver) new ResizeObserver(() => fitViewBox()).observe($('course'));

  if (loadSetup()) toast('Son yerleşimin yüklendi (yerler, isimler, taktikler). Rüzgar, sağanak, akıntı varsayılanda');
  // Bildirim gönder (report.js): o anki durum + yarış kaydı (kurulum + işlemler). scripts/report.mjs yarışı bundan
  // node'da aynen kurar; elle sürme sürüyorsa teknenin yolu (path) da eklenir.
  if (window.SailReport) SailReport.source('sim', () => {
    const v = st.sim, boats = st.mode === 'setup' ? st.fleet : v ? v.boats : [], m = boats.find(b => b.mine);
    const rem = v ? (v.startAt - v.t) * S.CLOCK_SCALE : 0;
    const when = st.mode === 'setup' ? 'kurulum' : rem > 0 ? `start'a ${Math.ceil(rem)} sn` : `start'tan ${Math.round(-rem)} sn sonra`;
    const pick = b => b && { id: b.id, x: +b.x.toFixed(1), y: +b.y.toFixed(1), h: Math.round(b.h || 0), v: +(b.v || 0).toFixed(1), phase: b.phase, tack: b.tack, persona: b.persona,
      manual: !!b.manual, ignoresRules: !!b.ignoresRules, sheetOff: b.sheetOff || 0, hand: !!b.hand, finish: b.finish || null, penalties: b.penalties || 0, man: b.man || null };
    return {
      ozet: `${st.mode === 'setup' ? 'kurulum' : st.mode === 'run' ? 'yarış oynuyor' : st.mode === 'pause' ? 'yarış duraklatıldı' : 'yarış bitti'}${st.drive ? ' · ELLE SÜRÜYOR' + (st.drive.paused ? ' (durdu)' : '') : ''} · ${when} · ${boats.length} tekne · ${st.boat.cls} ${st.boat.windKn} kn · hız ${st.speed}×` +
        (m ? ` · teknen ${m.phase || 'bekliyor'}${m.manual ? ', manuel' : ''}${m.finish ? ', ' + m.finish + '.' : ''}` : ''),
      mode: st.mode, playT: st.playT, frame: st.frames.length ? frameIndexAt(st.playT) : null, frames: st.frames.length, lastT: lastT(),
      speed: st.speed, fastPre: st.fastPre, cat: st.cat || null, drawMode: !!st.drawMode, sel: st.sel || null, show: { ...st.show },
      cam: { z: +st.cam.z.toFixed(2), follow: !!st.cam.follow },
      drive: st.drive ? { live: !!st.drive.live, paused: !!st.drive.paused, prev: st.drive.prev || null, i: st.drive.i == null ? null : st.drive.i, t: st.drive.s ? st.drive.s.t : null, path: (st.drive.path || []).slice(-2000) } : null,
      setup: st.mode === 'setup' ? jcopy({ fleet: st.fleet, wind: st.wind, gusts: st.gusts, course: st.course, sea: st.sea, boat: st.boat }) : null,
      rec: st.rec && st.mode !== 'setup' ? jcopy({ setup: st.rec.setup, ops: st.rec.ops }) : null,
      mine: pick(m), boats: boats.map(pick),
      simEvents: v ? v.events.slice(-40).map(e => ({ t: +(e.t - v.startAt).toFixed(1), text: e.text, kind: e.kind })) : []
    };
  });
  applyLayout();
  updatePanel(true);
  requestAnimationFrame(ts => { st.lastTs = ts; tick(ts); });
})();
