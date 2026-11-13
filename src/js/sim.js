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
    show: { speed: true, shadow: true, startLay: false },   // pis rüzgar konileri varsayılan açık; hat layline'ları ayarlardan
    sel: null, vb: { x: 0, y: 0, w: W.w, h: W.h }, drag: null, mineOnly: false, viewT: 0,
    cam: { z: 1, x: null, y: null, follow: false }, base: null, pinch: null, pts: new Map(),
    course: { ...S.COURSE_DEFAULT }, sea: { ...S.SEA_DEFAULT }, boat: { ...S.BOAT_DEFAULT }, gsel: null, drawMode: false, drawPts: null, routeMode: 'acili', draft: [], steps: [], legPrev: null
  };

  // ---------- görünüm ----------
  function fitViewBox() {
    const svg = $('course'), Wd = svg.clientWidth || 1, Hd = svg.clientHeight || 1;
    // masaüstünde sağdaki panel parkurun üstüne binmesin: parkuru kalan alana sığdır
    const panelOpen = !$('panel').classList.contains('hidden') && !phoneMq.matches && Wd > 900;
    const padPx = panelOpen ? Math.min(400, $('panel').offsetWidth + 28) : 0, Wa = Math.max(200, Wd - padPx);
    const V = { x: 0, y: -50, w: W.w, h: W.h + 90 };    // gösterilecek alan (şamandıra üstü ve 2. sıra altı paylı)
    // tablette alttaki durum şeridi ve bildirim start hattının üstüne binmesin: parkuru o şeridin üstüne sığdır
    // yarışta hız kutusu (dümen paneli, ince) açıksa parkur onun üstüne sığsın
    const hp = $('helmPad'), padHp = hp && !hp.classList.contains('hidden') && !st.drive ? hp.offsetHeight + 22 : 0;
    const padB = Math.max(padHp, !phoneMq.matches && Wd <= 1100 ? (innerHeight > innerWidth ? 100 : 64) : 0), Ha = Math.max(200, Hd - padB);
    let w = V.w, hA = V.h;
    if (Wa / Ha > V.w / V.h) w = V.h * Wa / Ha; else hA = V.w * Ha / Wa;
    const k = w / Wa, wTot = Wd * k, h = Hd * k;           // ekran pikseli başına birim
    const topShare = phoneMq.matches ? 0.12 : 0.5;          // telefonda parkur üstte, alt sayfa altta kalsın
    st.base = { x: V.x - (w - V.w) / 2, y: V.y - (hA - V.h) * topShare, w: wTot, h, vis: Wa / Wd };
    applyCam();
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
      const cov = sheetCover() + padCover();                   // alttan kapanan kısım (telefonda alt sayfa, elle sürerken dümen paneli)
      if (c.follow) { const m = view().boats.find(b => b.mine && !b.gone); if (m) { cx += (m.x - cx) * 0.18; cy += (m.y + h * (0.5 - (1 - cov) * 0.56) - cy) * 0.18; } }   // tekne açık kalan alanın ortasında
      const ex = cov * h;                              // telefonda alt sayfanın kapattığı kısım: parkur onun üstüne kaydırılabilsin
      const mx = S.MAN_MARGIN + 40;                              // manuel tekne parkur kenarını aşabilir: kamera da gidebilsin
      cx = clampN(cx, B.x - mx + vw / 2, B.x + B.w * B.vis + mx - vw / 2); cy = clampN(cy, B.y + h / 2, B.y + B.h - h / 2 + ex);
      c.x = cx; c.y = cy;
      st.vb = { x: cx - vw / 2, y: cy - h / 2, w, h };
    }
    $('course').setAttribute('viewBox', `${st.vb.x.toFixed(1)} ${st.vb.y.toFixed(1)} ${st.vb.w.toFixed(1)} ${st.vb.h.toFixed(1)}`);
    camUi();
  }
  function padCover() {
    const pad = $('helmPad'); if (!pad || pad.classList.contains('hidden')) return 0;
    const r = $('course').getBoundingClientRect(), p = pad.getBoundingClientRect();
    return r.height ? Math.max(0, Math.min(0.6, (r.bottom - p.top + 8) / r.height)) : 0;
  }
  function sheetCover() {
    if (!phoneMq.matches || $('panel').classList.contains('hidden')) return 0;
    const r = $('course').getBoundingClientRect(), p = $('panel').getBoundingClientRect();
    return r.height ? Math.max(0, Math.min(0.7, (r.bottom - p.top) / r.height)) : 0;
  }
  // ekrandaki (clientX, clientY) noktası altındaki dünya noktası yerinde kalacak şekilde yakınlaştır
  function zoomTo(z, clientX, clientY, anchorW) {
    const B = st.base, c = st.cam, r = $('course').getBoundingClientRect();
    z = Math.max(1, Math.min(Z_MAX, z));
    const fx = r.width ? (clientX - r.left) / r.width : 0.5, fy = r.height ? (clientY - r.top) / r.height : 0.5;
    const P = anchorW || { x: st.vb.x + fx * st.vb.w, y: st.vb.y + fy * st.vb.h };
    const w = B.w / z, h = B.h / z;
    c.z = z; c.x = P.x - fx * w + w * B.vis / 2; c.y = P.y - fy * h + h / 2;
    applyCam();
  }
  function zoomBy(k) {
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
    st.cam.follow = false; st.cam.x = (st.cam.x == null ? st.base.x + st.base.w * st.base.vis / 2 : st.cam.x) - dxPx * u; st.cam.y = (st.cam.y == null ? st.base.y + st.base.h / 2 : st.cam.y) - dyPx * u;
    applyCam();
  }
  function camFit() { st.cam.z = 1; st.cam.follow = false; applyCam(); }
  function camFollow() {
    const c = st.cam; c.follow = !c.follow;
    if (c.follow && c.z < 2.2) c.z = 2.2;
    applyCam(); toast(c.follow ? 'Kamera senin tekneni takip ediyor · kaydırınca bırakır' : 'Takip kapandı');
  }
  function camUi() {
    const c = st.cam, zb = $('zoomVal'); if (!zb) return;
    zb.textContent = `${Math.round(c.z * 100)}%`;
    $('btnZoomOut').disabled = c.z <= 1.001; $('btnZoomIn').disabled = c.z >= Z_MAX - 0.001; $('btnZoomFit').disabled = c.z <= 1.001 && !c.follow;
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
    if (st.drive && st.drive.s) return st.drive.s;      // yarışta elle sürerken: donmuş an
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

  let cbNode = null;
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
    // start hattı
    el('line', { x1: pin.x, y1: pin.y, x2: boat.x, y2: boat.y, stroke: '#ffd166', 'stroke-width': 2, 'stroke-dasharray': '10 8', opacity: .9 }, g);
    el('circle', { cx: pin.x, cy: pin.y, r: 7, fill: '#ff8c42', stroke: '#fff', 'stroke-width': 1.5 }, g);
    el('text', { x: pin.x, y: pin.y + 24, 'text-anchor': 'middle', fill: '#ffd166', 'font-size': 12 }, g).textContent = 'Pin';
    cbNode = cbNode || E.drawCommitteeBoat(el, g);     // bir kez çizilir; bayrak dalgası kesilmesin
    g.appendChild(cbNode);
    cbNode.setAttribute('transform', E.committeeBoatTransform(boat.x, boat.y, w));
    el('text', { x: boat.x + 14, y: boat.y + 60, 'text-anchor': 'middle', fill: '#ffd166', 'font-size': 12, 'paint-order': 'stroke', stroke: 'rgba(0,0,0,.45)', 'stroke-width': 3 }, g).textContent = 'Hakem botu';
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
    const pose = E.sailPose(b.h, w, { v: drv ? null : b.v, base: 55, t: tt, seed, sheet });
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
      const txt = `${S.knots(b.v).toFixed(1)} kn${down ? ' ↓' : up ? ' ↑' : ''}`;
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

  function drawHud(v) {
    const g = $('hudLayer'); g.innerHTML = '';
    const vb = st.vb, svg = $('course'), upp = vb.w / (svg.clientWidth || vb.w);
    const k = Math.max(0.8, Math.min(1.8, upp * 0.95));
    const hg = el('g', { transform: `translate(${vb.x.toFixed(1)},${vb.y.toFixed(1)}) scale(${k.toFixed(3)})` }, g);
    const cx = 64, cy = 64, w = v.wind;
    el('circle', { cx, cy, r: 44, fill: 'rgba(7,18,30,0.72)', stroke: 'rgba(255,255,255,0.18)', 'stroke-width': 1 }, hg);
    for (let a = 0; a < 360; a += 30) { const f = E.fwd(a), r1 = a % 90 ? 39 : 35;
      el('line', { x1: cx + f.x * r1, y1: cy + f.y * r1, x2: cx + f.x * 42, y2: cy + f.y * 42, stroke: 'rgba(255,255,255,.35)', 'stroke-width': a % 90 ? 1 : 1.5 }, hg); }
    const d = E.fwd(w + 180);
    el('line', { x1: cx - d.x * 28, y1: cy - d.y * 28, x2: cx + d.x * 20, y2: cy + d.y * 20, stroke: '#7dd3fc', 'stroke-width': 3.5, 'stroke-linecap': 'round', 'marker-end': 'url(#arrowHead)' }, hg);
    el('rect', { x: cx - 38, y: cy + 52, width: 76, height: 20, rx: 10, fill: 'rgba(7,18,30,0.72)' }, hg);
    el('text', { x: cx, y: cy + 66, 'text-anchor': 'middle', fill: '#fff', 'font-size': 11, 'font-weight': 600 }, hg).textContent = `Rüzgar ${Math.round(E.norm360(w))}°`;
    const sea = v.sea || st.sea;
    if (sea && (sea.current || sea.waves)) {
      const txt = [sea.current ? `Akıntı ${SEA_TXT.current[sea.current]}` : '', sea.waves ? `Dalga ${SEA_TXT.waves[sea.waves]}` : ''].filter(Boolean).join(' · ');
      const tw = txt.length * 5.9 + 18;
      el('rect', { x: cx - 44, y: cy + 76, width: tw, height: 18, rx: 9, fill: 'rgba(7,18,30,0.72)', stroke: 'rgba(125,211,252,.4)' }, hg);
      el('text', { x: cx - 44 + tw / 2, y: cy + 89, 'text-anchor': 'middle', fill: '#bae6fd', 'font-size': 10.5, 'font-weight': 600 }, hg).textContent = txt;
    }
    const rem = (v.startAt - v.t) * S.CLOCK_SCALE, on = rem > 0;
    const col = on ? (rem <= 10 ? '#f87171' : '#fbbf24') : '#34d399';
    const px = cx + 58, py = cy - 26, pw = 150, ph = 52;
    el('rect', { x: px, y: py, width: pw, height: ph, rx: 14, fill: 'rgba(7,18,30,0.78)', stroke: col, 'stroke-opacity': .55, 'stroke-width': 1.5 }, hg);
    el('text', { x: px + 14, y: py + 17, fill: 'rgba(255,255,255,.6)', 'font-size': 10, 'font-weight': 700, 'letter-spacing': 1 }, hg).textContent = on ? "START'A" : 'YARIŞ SÜRESİ';
    el('text', { x: px + 14, y: py + 42, fill: col, 'font-size': 22, 'font-weight': 800, 'font-variant-numeric': 'tabular-nums' }, hg).textContent = on ? S.fmt(rem / S.CLOCK_SCALE) : S.fmt(-rem / S.CLOCK_SCALE);
    // sınıf · rüzgar hızı · hızlanma anı (geri sayımda); hızlanma anı gelince "Yelken doldur, hızlan!"
    const bc = v.boat || st.boat, acc = on && rem <= bc.accelAt;
    const btxt = acc ? 'Yelken doldur, hızlan!' : `${S.CLASSES[bc.cls].name} · ${bc.windKn} kn rüzgar` + (on ? ` · hızlan ${bc.accelAt} sn` : '');
    const bw = Math.max(pw, btxt.length * 5.9 + 18);
    el('rect', { x: px, y: py + ph + 5, width: bw, height: 18, rx: 9, fill: acc ? 'rgba(251,191,36,.92)' : 'rgba(7,18,30,0.72)', stroke: acc ? 'none' : 'rgba(255,255,255,.18)' }, hg);
    el('text', { x: px + bw / 2, y: py + ph + 18, 'text-anchor': 'middle', fill: acc ? '#1c1300' : 'rgba(255,255,255,.82)', 'font-size': 10.5, 'font-weight': 700 }, hg).textContent = btxt;
  }

  function render() {
    if (st.cam.follow) applyCam();
    const v = view(), w = v.wind;
    drawWind(w, st.mode === 'setup' ? performance.now() / 1000 : v.t);
    drawGusts(v); drawCourse(v);
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
  const SEA_TXT = { current: ['yok', 'hafif', 'orta', 'güçlü'], waves: ['yok', 'küçük', 'büyük'] };
  // ---------- panel ----------
  let lastPanelKey = '';
  function updatePanel(force) {
    const v = view();
    const key = st.mode + '|' + st.course.lineLen + 'x' + st.course.markDist + '|' + st.gsel + '|' + st.frames.length + '|' + (v.t * 4 | 0) + '|' + st.sel + '|' + v.events.length + '|' + st.mineOnly + '|' + st.fleet.length + '|' + JSON.stringify(v.sea || st.sea) + v.boats.map(b => b.id + (b.sailor || '') + (b.drift || 0) + (b.manual ? 'M' : '') + b.tack + b.persona + b.mine + (b.ignoresRules ? '!' : '') + (b.speedK || 1) + (b.penalties || 0) + b.phase).join();
    if (!force && key === lastPanelKey) return;
    lastPanelKey = key;
    courseUpdate(); gustBarUpdate();
    const label = { setup: 'Kurulum', run: v.t < v.startAt ? "Start'a geri sayım" : 'Yarış', pause: 'Duraklatıldı', end: 'Yarış bitti' }[st.mode];
    $('phaseLabel').textContent = label;
    const mine = v.boats.find(b => b.mine);
    $('phaseSub').textContent = st.mode === 'setup' ? 'Tekneleri yerleştir, rüzgarı ayarla, start ver'
      : st.mode === 'end' ? (mine && mine.finish ? `Senin teknen ${mine.finish}. oldu` : 'Herkes şamandırayı döndü')
      : mine ? (mine.finish ? `Senin teknen ${mine.finish}. bitirdi` : (() => { const p = predicted(), pm = p && p.boats.find(b => b.mine);
          return pm && pm.finish ? `Tahmin: senin teknen ${pm.finish}. olacak · ${S.PERSONAS[mine.persona]}` : `Senin teknen: ${S.PERSONAS[mine.persona]}`; })()) : '';
    $('howto').classList.toggle('hidden', st.mode !== 'setup' || !!st.sel);   // tekne seçiliyse ayarları üstte göster
    // seçili tekne
    const sb = st.sel && (st.mode === 'setup' ? st.fleet : v.boats).find(b => b.id === st.sel);
    const setupSel = st.mode === 'setup';
    $('selBox').classList.toggle('hidden', !sb);
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
    $('events').innerHTML = evs.length ? evs.map(e => `<li class="${e.kind}"><span class="et">${S.fmt(Math.max(0, e.t - v.startAt))}</span>${esc(e.text)}</li>`).join('')
      : `<li class="empty">${st.mode === 'setup' ? 'Start verilince kural olayları burada görünür.' : 'Henüz olay yok.'}</li>`;
    $('btnClearSaved').disabled = st.mode !== 'setup';
    const sea = v.sea || st.sea;
    [...$('seaCurrent').children].forEach(x => x.classList.toggle('on', +x.dataset.v === sea.current));
    [...$('seaWaves').children].forEach(x => x.classList.toggle('on', +x.dataset.v === sea.waves));
    $('seaState').textContent = sea.current || sea.waves ? 'tekneler rüzgaraltına kayar' : 'sakin';
    $('seaState').classList.toggle('changed', !!(sea.current || sea.waves));
    boatUpdate();
    saveSetup();
  }
  const nameOf = b => b.sailor || (b.mine ? 'Sen' : b.name);
  // ---------- Kurulumu bu cihazda sakla (ileride Firebase'e taşınacak) ----------
  const SAVE_KEY = 'ps.sim.setup.v1';
  const BOAT_KEYS = ['id', 'x', 'y', 'tack', 'persona', 'speedK', 'drift', 'manual', 'ignoresRules', 'mine', 'sailor', 'route', 'drv', 'h', 'sheetOff'];
  function saveSetup() {
    if (st.mode !== 'setup') return;
    const data = { v: 1, wind: st.wind, sea: st.sea, boat: st.boat, course: st.course, gusts: st.gusts, fleet: st.fleet.map(b => Object.fromEntries(BOAT_KEYS.map(k => [k, b[k]]))) };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { /* özel pencere vb. */ }
  }
  function loadSetup() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { d = null; }
    if (!d || d.v !== 1 || !Array.isArray(d.fleet) || d.fleet.length < 2) return false;
    st.course = { ...S.COURSE_DEFAULT, ...(d.course || {}) }; S.setCourse(st.course);
    if (d.sea) st.sea = { current: Math.max(0, Math.min(3, d.sea.current | 0)), waves: Math.max(0, Math.min(2, d.sea.waves | 0)) };
    if (d.boat) setBoatCfg({ ...d.boat });
    st.wind = +d.wind || 0; st.gusts = Array.isArray(d.gusts) ? d.gusts : [];
    const n = Math.min(16, d.fleet.length), mineIdx = Math.max(0, d.fleet.findIndex(b => b.mine));
    st.fleet = d.fleet.slice(0, n).map((o, i) => {
      const b = S.makeBoat(i, { x: +o.x, y: +o.y }, i === mineIdx ? { mine: true, id: 'SEN', name: 'Senin teknen' } : null);
      if (i !== mineIdx) { b.mine = false; b.color = '#c9d6e3'; }
      b.tack = o.tack === 'port' ? 'port' : 'starboard';
      if (S.PERSONAS[o.persona]) b.persona = o.persona;
      b.speedK = +o.speedK || 1; b.drift = Math.max(0, Math.min(2, o.drift | 0)); b.manual = !!o.manual; b.ignoresRules = !!o.ignoresRules;
      if (o.sailor) b.sailor = String(o.sailor).slice(0, 18);
      if (Array.isArray(o.route) && o.route.length) b.route = o.route;
      if (o.drv && i === mineIdx) { b.drv = true; b.h = +o.h || 0; b.v = 0; b.sheetOff = Math.max(0, Math.min(S.SHEET_OFF_MAX, +o.sheetOff || 0)); }   // elle sürülmüş: yönü kalsın
      return b;
    });
    renumber();
    return true;
  }
  let clearArm = 0;
  function clearSaved() {
    if (st.mode !== 'setup') return;
    if (Date.now() - clearArm > 3000) { clearArm = Date.now(); $('btnClearSaved').textContent = 'Emin misin?'; $('btnClearSaved').classList.add('warn');
      setTimeout(() => { $('btnClearSaved').textContent = 'Kaydı sil'; $('btnClearSaved').classList.remove('warn'); }, 3000); return; }
    clearArm = 0;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* yok say */ }
    st.course = { ...S.COURSE_DEFAULT }; S.setCourse(st.course);
    st.wind = 0; st.sea = { ...S.SEA_DEFAULT }; setBoatCfg({ ...S.BOAT_DEFAULT }); st.gusts = []; st.gsel = null; st.sel = null; st.fleet = S.defaultFleet(12);
    $('btnClearSaved').textContent = 'Kaydı sil'; $('btnClearSaved').classList.remove('warn');
    fitViewBox(); updatePanel(true); toast('Kayıt silindi: isimler, taktikler ve parkur varsayılana döndü');
  }

  function updateBar(v) {
    const playing = st.mode === 'run';
    $('btnPlay').querySelector('use').setAttribute('href', playing ? '#i-pause' : '#i-play');
    $('btnPlay').title = st.mode === 'setup' ? 'Start ver' : playing ? 'Duraklat' : 'Devam';
    const sc = $('scrub'), maxT = st.frames.length ? st.frames[st.frames.length - 1].t : 0;
    sc.max = maxT; sc.value = v.t; sc.disabled = !st.frames.length;
    sc.style.setProperty('--p', (maxT ? v.t / maxT * 100 : 0) + '%');
    const rem = (v.startAt - v.t) * S.CLOCK_SCALE;
    $('timeLabel').textContent = rem > 0 ? '−' + S.fmt(rem / S.CLOCK_SCALE) : S.fmt(-rem / S.CLOCK_SCALE);
    $('windVal').textContent = `${Math.round(E.norm360(v.wind))}°`;
    $('fleetVal').textContent = st.fleet.length;
    const setup = st.mode === 'setup';
    ['btnFleetMinus', 'btnFleetPlus', 'btnFleetLine'].forEach(id => { $(id).disabled = !setup; });
    const mine = v.boats.find(b => b.mine);
    $('btnTack').disabled = !mine || setup || !(mine.phase === 'race' || (mine.manual && mine.phase === 'wait'));
    $('btnManual').classList.toggle('on', !!(mine && mine.manual));
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
    $('btnRoute').querySelector('.lbl2').textContent = hasRoute ? 'Rota ✓' : 'Rota';
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
    const phase = st.drive ? ['drive', 'Elle sürüş · zaman durdu'] : setup ? ['setup', 'Kurulum'] : st.mode === 'pause' ? ['pause', 'Duraklatıldı'] : st.mode === 'end' ? ['end', 'Yarış bitti'] : v.t < v.startAt ? ['count', "Start'a geri sayım"] : ['race', 'Yarış'];
    const key = [phase[0], !!st.drive, manual, hasRoute, mine && mine.persona, mine && mine.ignoresRules, mine && mine.finish, sb && sb.id, sb && sb.sailor, st.gsel, gl && gl.length, st.drawMode].join('|');
    if (key === lastStateKey) return;
    lastStateKey = key;
    // ana durum ve senin teknenin modu
    $('msPhase').className = 'ms-chip ph-' + phase[0]; $('msPhase').textContent = phase[1];
    const m = $('msMine');
    if (!mine) m.classList.add('hidden');
    else {
      m.classList.remove('hidden');
      m.className = 'ms-chip ' + (manual ? 'ms-manual' : hasRoute ? 'ms-route' : 'ms-auto');
      m.innerHTML = st.drive ? '<b>Elle sür</b> dümen ve iskota sende' : manual ? '<b>Manuel</b> tramolayı sen atarsın (T)' : hasRoute ? '<b>Rota</b> çizdiğin rotayı izliyor' : `<b>Otomatik</b> taktik: ${esc(S.PERSONAS[mine.persona] || mine.persona)}`;
    }
    $('msRules').classList.toggle('hidden', !(mine && mine.ignoresRules));
    // seçili nesne (tekne ya da sağanak); dokununca seçim kalkar
    const s = $('msSel');
    const selTxt = sb ? `<span class="boat-id" style="background:${sb.color}">${esc(sb.id)}</span>${esc(sb.mine ? 'Senin teknen' : 'Tekne ' + sb.id)} seçili`
      : gl && gl[st.gsel] ? `<svg class="ci"><use href="#i-gust"/></svg>${gl.length > 1 ? 'Sağanak ' + (st.gsel + 1) : 'Sağanak'} seçili` : '';
    s.classList.toggle('hidden', !selTxt || !!st.drawMode);
    if (selTxt) s.innerHTML = selTxt + '<svg class="ci x"><use href="#i-close"/></svg>';
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
    if (window.SailTrack) SailTrack.log('race_start', { boats: st.fleet.length, cls: st.boat && st.boat.cls, gusts: st.gusts.length });
  }
  // Yarış sırasındaki değişiklikler: her biri yazılabilir bir "işlem" (op). Aynı işlem kayıtlı yarışı
  // tekrar oynatırken aynı karede yeniden uygulanır; hesap deterministik olduğu için yarış birebir aynı çıkar.
  const OPS = {
    wind: (r, o) => { r.wind = E.norm180(r.wind + o.d); r.events.push({ t: r.t, text: `Rüzgar ${o.d > 0 ? 'sağa' : 'sola'} döndü → ${Math.round(E.norm360(r.wind))}°`, kind: 'wind' }); },
    gustAdd: (r, o) => { r.gusts.push({ ...o.g }); r.events.push({ t: r.t, text: `${o.side === 'L' ? 'Sol' : 'Sağ'} tarafa sağanak geldi`, kind: 'wind' }); },
    gustClear: r => { r.gusts.length = 0; r.events.push({ t: r.t, text: 'Sağanak geçti', kind: 'wind' }); },
    gustMove: (r, o) => { if (r.gusts[o.i]) { Object.assign(r.gusts[o.i], o.pos); r.events.push({ t: r.t, text: 'Sağanak taşındı', kind: 'wind' }); } },
    gust: (r, o) => { if (r.gusts[o.i]) { GUST_FX[o.fx](r.gusts, o.i, o.k); r.events.push({ t: r.t, text: o.text, kind: 'wind' }); } },
    sea: (r, o) => { r.sea = { ...(r.sea || S.SEA_DEFAULT), [o.key]: o.val }; r.events.push({ t: r.t, text: o.key === 'current' ? `Akıntı: ${SEA_TXT.current[o.val]}` : `Dalga: ${SEA_TXT.waves[o.val]}`, kind: 'wind' }); },
    cmd: (r, o) => S.command(r, o.c, o.v, o.id)
  };
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
  // Kayıttaki kurulumu ve işlemleri sırayla uygula (tekrar oynatma)
  function replay(rec) {
    let frames = S.runToEnd(S.newRace(jcopy(rec.setup.fleet), jcopy(rec.setup)));
    for (const op of rec.ops) {
      const i = Math.min(op.i, frames.length - 1);
      let base;
      if (op.k === 'snap') base = jcopy(op.state);
      else if (OPS[op.k]) { base = S.clone(frames[i]); OPS[op.k](base, op); }
      else continue;
      frames = frames.slice(0, i).concat(S.runToEnd(base));
    }
    return frames;
  }
  function tick(ts) {
    const dt = Math.min(0.1, (ts - st.lastTs) / 1000 || 0); st.lastTs = ts;
    if (st.drive) driveTick(dt);
    else if (st.mode === 'run') {
      st.playT += dt * st.speed / S.CLOCK_SCALE;   // 1× = gerçek zaman (start → şamandıra ~15 dk)
      if (st.playT >= lastT()) {
        st.playT = lastT(); st.mode = 'end';
        const mine = st.frames[st.frames.length - 1].boats.find(b => b.mine);
        if (!askSave()) toast(mine && mine.finish ? `Yarış bitti · Senin teknen ${mine.finish}. oldu` : 'Yarış bitti');
      }
      st.sim = viewAt(st.playT);
    }
    render();
    requestAnimationFrame(tick);
  }
  function togglePlay() {
    if (st.drive) { exitDrive(true); return; }          // elle sürerken oynat = Otomatik
    if (st.drawMode) endDraw(true);                      // çizim açıkken oynat: rotayı kaydet, sonra devam
    if (st.mode === 'setup') startRace();
    else if (st.mode === 'run') st.mode = 'pause';
    else if (st.mode === 'pause') st.mode = 'run';
    else if (st.mode === 'end') { st.playT = 0; st.sim = viewAt(0); st.mode = 'run'; }
    updatePanel(true);
  }
  function backToSetup() { st.drive = null; st.mode = 'setup'; st.sim = null; st.frames = []; updatePanel(true); }
  // Tahmini sonuç: hesaplanmış yarışın son karesi
  function predicted() { return st.frames.length ? st.frames[st.frames.length - 1] : null; }

  // ---------- Elle sürme: dümen ve iskota sende, zaman durur (diğer tekneler yerinde) ----------
  // Kurulumda teknen start'tan önce istediğin yere götürülür; yarışta (duraklatıp) o andan sürersin.
  // Otomatik ▶: yarış kaldığı yerden hesaplanır; teknen orsaya devam eder, tramolalar yine senin (Manuel açık kalır).
  const DRIVE_TEMPO = 0.7;                                // elle sürerken 1 gerçek sn = 0.7 sim. sn (tekne ~1 boy/sn)
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
      m.manual = true; m.route = null;
      st.drive = { s: null };
    } else {
      if (!st.frames.length) return;
      const i = frameIndexAt(st.playT), s = S.clone(st.frames[i]), m = s.boats.find(b => b.mine);
      if (!m || !['wait', 'race', 'ocs'].includes(m.phase)) { toast(m && m.phase === 'penalty' ? 'Ceza turundayken elle sürülemez' : 'Teknen şamandırayı döndü: elle sürülemez'); return; }
      m.manual = true; m.route = null; m.man = null; m.escH = null; m.sheet = null;
      if (m.phase === 'wait' && Math.abs(E.norm180(m.h - s.wind)) < 40) { m.h = s.wind + (m.tack === 'starboard' ? -45 : 45); m.sheetOff = S.SHEET_OFF_MAX; }   // beklerken yelken boştu
      st.drive = { s, i };
      st.mode = 'pause'; st.sim = s;
    }
    if (phoneMq.matches) setPanelOpen(false);            // telefonda alt sayfa kapansın: sahne dümen paneline yer açsın
    st.camPrev = { ...st.cam };                         // kamera tekneni izlesin, panelin üstünde kalsın; çıkınca eski görünüme döner
    if (!st.cam.follow) { st.cam.follow = true; st.cam.z = Math.max(st.cam.z, phoneMq.matches ? 1.6 : 1.8); }
    Object.assign(st.drive, { keyRud: 0, touchRud: 0, autoTrim: st.autoTrim !== false, noteAt: 0, lastEv: {} });
    toast('Elle sürüyorsun · diğer tekneler duruyor. ← → dümen, ↑ ↓ iskota, T tramola, K kavança. Bitince Otomatik ▶');
    updatePanel(true);
  }
  function exitDrive(play) {
    const d = st.drive; if (!d) return;
    const ctx = driveCtx(), m = ctx.boats.find(b => b.mine);
    st.drive = null;
    if (st.camPrev && !st.camPrev.follow) { Object.assign(st.cam, st.camPrev); applyCam(); }
    st.camPrev = null;
    if (m) {
      m.helm = null; m.note = '';
      // iskotayı elle bıraktıysan: yarışta ideale göre o kadar salık kalır (hız düşük); fazla çekik yarışta yok
      const ideal = S.idealSheet(Math.abs(E.norm180(m.h - ctx.wind)));
      m.sheetOff = Math.max(0, Math.min(S.SHEET_OFF_MAX, Math.round(d.autoTrim ? (m.sheetOff || 0) : m.sheet - ideal)));
    }
    if (!d.s) {                                          // kurulum: teknen burada bekler, start'ta otomatik devam eder (tam trimle hızlanır)
      if (m) m.sheetOff = 0;
      if (m && S.lineSide(m) === -1) toast('Teknen hattın üstünde: start\'ta erken (OCS) sayılır, geri dönmek zorunda kalır');
      updatePanel(true);
      if (play) togglePlay();
      return;
    }
    const s = d.s;
    if (m) s.events.push({ t: s.t, text: `${m.id}: elle sürdün, otomatiğe döndü (tramolalar yine senin)`, kind: '' });
    Rec.note(st.rec, d.i, { k: 'snap', state: jcopy(s) });   // elle sürülen an kayda: o karenin durumu
    st.frames = st.frames.slice(0, d.i).concat(S.runToEnd(s));
    st.playT = s.t; st.sim = viewAt(st.playT); st.ended = false;
    st.mode = play ? 'run' : 'pause';
    updatePanel(true);
  }
  function driveNote(m, text, kind) { m.note = text; m.noteKind = kind || ''; m.noteUntil = 1e9; st.drive.noteAt = performance.now() + 1700; }
  function driveTick(dt) {
    const d = st.drive, ctx = driveCtx(), m = ctx.boats.find(b => b.mine); if (!m) return;
    const rud = Math.max(-1, Math.min(1, d.keyRud + d.touchRud));
    const ev = S.drive(ctx, m, { rudder: rud, autoTrim: d.autoTrim }, dt * DRIVE_TEMPO);
    const now = performance.now();
    for (const e of ev) {
      if (e === 'tack' || e === 'jibe') {
        driveNote(m, e === 'tack' ? 'Tramola!' : 'Kavança!', 'good');
        if (d.s) d.s.events.push({ t: d.s.t, text: `${m.id}: ${e === 'tack' ? 'tramola' : 'kavança'} (elle)`, kind: '' });
      } else if (now - (d.lastEv[e] || 0) > 1500) {
        d.lastEv[e] = now;
        driveNote(m, e === 'hit' ? 'Dikkat: çarpıyorsun!' : `Temas! (${e.slice(8)})`, 'bad');
      }
    }
    if (d.noteAt && now > d.noteAt) { m.note = ''; d.noteAt = 0; }
    if (st.mode !== 'setup') st.sim = ctx;
  }
  function helmTurn(kind) {
    const m = driveBoat(); if (!m) return;
    const w = driveCtx().wind, abs = Math.abs(E.norm180(m.h - w));
    if (kind === 'jibe' && abs < 100) { toast('Kavança pupadan atılır: önce kafa aç (rüzgarı kıçtan al)'); return; }
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
  function toggleAutoTrim() {
    if (!st.drive) return;
    const m = driveBoat(); st.drive.autoTrim = st.autoTrim = !st.drive.autoTrim;
    if (m && st.drive.autoTrim) m.sheetOff = 0;
    toast(st.drive.autoTrim ? 'Oto iskota: dümen kırdıkça iskota kendiliğinden çekilir / salınır' : 'İskota sende: kafa açarken sal (↓), orsalarken çek (↑)');
  }
  // dümen / iskota paneli
  const POS = a => a < 30 ? 'rüzgara karşı' : a < 60 ? 'orsa' : a < 120 ? 'apaz' : a < 165 ? 'geniş apaz' : 'pupa';
  let lastHelmKey = '';
  function helmUpdate(v) {
    const pad = $('helmPad'), m = v.boats.find(b => b.mine);
    const raceShow = !st.drive && st.mode !== 'setup' && m && m.manual && ['wait', 'race', 'ocs', 'round'].includes(m.phase);
    const show = !!(st.drive && m) || !!raceShow;
    const was = pad.className;
    pad.classList.toggle('hidden', !show); document.body.classList.toggle('driving', !!st.drive);
    if (show) pad.classList.toggle('race', !st.drive);
    if (pad.className !== was) fitViewBox();             // ince yarış kutusu açıldı / kapandı: parkur ona göre sığsın
    if (!show) { lastHelmKey = ''; return; }
    const drv = !!st.drive, abs = Math.abs(E.norm180(m.h - v.wind)), ideal = S.idealSheet(abs);
    const sheet = drv ? (m.sheet != null ? m.sheet : ideal) : Math.min(S.SHEET_MAX, ideal + (m.sheetOff || 0));
    const dlt = sheet - ideal, eff = abs < 30 ? 1 : S.trimEff(dlt), stb = E.norm180(m.h - v.wind) < 0;
    const trimTxt = abs < 30 ? 'Rüzgara karşı: yelken boş, tekne duruyor' : dlt > 8 ? 'Fazla salık: yelken pırpırlıyor' : dlt < -8 ? 'Fazla çekik: yelken boğuluyor' : 'İskota iyi';
    const key = [drv, Math.round(abs), Math.round(sheet), Math.round(eff * 100), stb, m.v.toFixed(1), st.drive && st.drive.autoTrim, m.phase].join('|');
    if (key === lastHelmKey) return; lastHelmKey = key;
    $('hpGo').querySelector('.hp-go-lbl').textContent = drv ? 'Otomatik' : 'Elle sür';
    $('hpGo').title = drv ? 'Otomatik: yarış devam etsin, teknen orsaya gitsin; tramolalar yine senin (Enter / boşluk)' : 'Elle sür (D): zaman durur, dümen ve iskota sende';
    $('hpClose').classList.toggle('hidden', !drv);
    $('hpTitle').textContent = drv ? 'Elle sürüyorsun' : 'Hızın';
    $('hpHint').textContent = drv ? 'Diğer tekneler duruyor · ← → dümen · ↑ ↓ iskota' : '↑ ↓ ile hızını ayarla · D: yeniden elle sür';
    $('hpSpeed').textContent = `${S.knots(m.v).toFixed(1).replace('.', ',')} kn`;
    $('hpPoint').textContent = `${POS(abs)} · ${stb ? 'sancak' : 'iskele'} kontra`;
    $('hpLeftSub').textContent = stb ? 'kafa aç' : 'orsa'; $('hpRightSub').textContent = stb ? 'orsa' : 'kafa aç';
    const tg = $('hpGauge'), pct = x => `${Math.max(0, Math.min(100, x / 90 * 100)).toFixed(1)}%`;
    tg.querySelector('.tg-ideal').style.left = pct(ideal); tg.querySelector('.tg-knob').style.left = pct(sheet);
    tg.className = 'trim-gauge ' + (abs < 30 ? 'off' : Math.abs(dlt) <= 8 ? 'ok' : Math.abs(dlt) <= 20 ? 'meh' : 'bad');
    $('hpTrimTxt').textContent = drv ? `${trimTxt} · güç %${Math.round(eff * 100)}` : (m.sheetOff ? `İskota salık · hız %${Math.round(eff * 100)}` : 'Tam hız · iskota trimli');
    $('hpAuto').classList.toggle('on', !!(st.drive && st.drive.autoTrim));
    $('hpEase').disabled = false; $('hpTrim').disabled = false;   // sınırda da basılabilir: neden olmadığı söylenir
    $('hpJibe').disabled = drv && abs < 100;
    $('hpEase').title = drv ? 'İskotayı sal (↓)' : 'İskotayı sal, yavaşla (↓)'; $('hpTrim').title = drv ? 'İskotayı çek (↑)' : 'İskotayı çek, hızlan (↑)';
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
  function setWind(delta) {
    const cur = st.mode === 'setup' ? st.wind : st.sim.wind;
    if (Math.abs(E.norm180(cur + delta)) > WIND_MAX) { toast(`Rüzgar en fazla ±${WIND_MAX}° döndürülebilir (şamandıra rüzgarüstünde kalsın)`); return; }
    if (st.mode === 'setup') st.wind = E.norm180(st.wind + delta);
    else applyChange({ k: 'wind', d: delta });
  }
  // ---------- Sağanak düzenleme: dokun → seç, boyut −/+, sıfırla, sil ----------
  const GUST_BASE = { rx: 120, ry: 190 };
  const GUST_FX = {
    scale: (a, i, k) => { const g = a[i], f = Math.max(0.4, Math.min(2.5, (g.rx / GUST_BASE.rx) * k)); g.rx = GUST_BASE.rx * f; g.ry = GUST_BASE.ry * f; },
    reset: (a, i) => { a[i].rx = GUST_BASE.rx; a[i].ry = GUST_BASE.ry; },
    del: (a, i) => a.splice(i, 1)
  };
  function gustEdit(fx, k, text) {
    const i = st.gsel; if (i == null) return;
    if (st.mode === 'setup') { if (st.gusts[i]) GUST_FX[fx](st.gusts, i, k); }
    else applyChange({ k: 'gust', fx, i, k, text });
    gustBarUpdate(); updatePanel(true);
  }
  function gustScale(k) { gustEdit('scale', k, `Sağanak ${st.gsel + 1} ${k > 1 ? 'büyüdü' : 'küçüldü'}`); }
  function gustReset() { gustEdit('reset', 0, `Sağanak ${st.gsel + 1} ilk boyutuna döndü`); }
  function gustDelete() { const n = st.gsel + 1; gustEdit('del', 0, `Sağanak ${n} geçti`); st.gsel = null; gustBarUpdate(); }
  // Sağanağı seç: ayar kartı sağ altta açılır ve bir kez parlar (yeni açıldığı fark edilsin)
  function gustSelect(i) {
    const was = st.gsel;
    st.gsel = i; st.sel = null;
    if (phoneMq.matches) setPanelOpen(false);   // telefonda alt panel kartın üstünü kapatmasın
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
    const c = { lineLen: Math.max(COURSE_LIM.lineLen[0], Math.min(COURSE_LIM.lineLen[1], next.lineLen)), markDist: Math.max(COURSE_LIM.markDist[0], Math.min(COURSE_LIM.markDist[1], next.markDist)) };
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
    $('courseState').textContent = def ? 'Varsayılan parkur' : 'Değiştirildi';
    $('courseState').classList.toggle('changed', !def);
    $('courseBox').classList.toggle('hidden', !setup);
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
    st.drag = null; st.drawPts = null; st.legPrev = null; st.cam.follow = false;
  }
  function onDown(ev) {
    st.pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
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
      if (d.moved) { panBy(ev.clientX - d.lx, ev.clientY - d.ly); $('course').style.cursor = 'grabbing'; }
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
    if (d.kind === 'pick') { if (!d.moved) { st.sel = st.sel === d.obj.id ? null : d.obj.id; st.gsel = null; if (phoneMq.matches) setPanelOpen(true); } $('course').style.cursor = ''; updatePanel(true); return; }
    if (d.kind === 'boat' && !d.moved) { st.sel = st.sel === d.obj.id ? null : d.obj.id; if (phoneMq.matches) setPanelOpen(true); }
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
    return { boats: boats.length, cls: st.boat.cls, windKn: st.boat.windKn, mine: mine ? mine.finish || null : null, mineName: mine ? nameOf(mine) : '',
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
  function setPanelOpen(open) { $('panel').classList.toggle('hidden', !open); $('btnPanel').classList.toggle('on', open); fitViewBox(); }

  // ---------- olaylar ----------
  $('btnPlay').addEventListener('click', togglePlay);
  $('btnReset').addEventListener('click', backToSetup);
  $('speedSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; st.speed = +b.dataset.v; [...$('speedSeg').children].forEach(x => x.classList.toggle('on', x === b)); });
  $('scrub').addEventListener('input', e => {
    if (!st.frames.length || st.drive) return;
    st.playT = +e.target.value; st.sim = viewAt(st.playT);
    if (st.mode === 'run' || st.mode === 'end') st.mode = 'pause';
    updatePanel(true);
  });
  $('btnShowSpeed').addEventListener('click', () => { st.show.speed = !st.show.speed; $('btnShowSpeed').classList.toggle('on', st.show.speed); });
  $('btnShowShadow').addEventListener('click', () => { st.show.shadow = !st.show.shadow; $('btnShowShadow').classList.toggle('on', st.show.shadow); });
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
  $('btnCourseReset').addEventListener('click', () => { changeCourse({ ...S.COURSE_DEFAULT }); toast('Parkur varsayılana döndü'); });
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
    st.boat = { cls, windKn, accelAt }; S.setBoat(st.boat);   // zaman ölçeği ve geri sayım buna göre
  }
  const segHtml = (vals, txt) => vals.map(v => `<button data-v="${v}">${txt(v)}</button>`).join('');
  $('boatCls').innerHTML = segHtml(Object.keys(S.CLASSES), k => S.CLASSES[k].name);
  $('boatWind').innerHTML = segHtml(S.WIND_KN, v => `${v} kn`);
  $('boatAccel').innerHTML = segHtml(S.ACCEL_AT, v => `${v} sn`);
  function boatUpdate() {
    const b = st.boat, setup = st.mode === 'setup', D = S.BOAT_DEFAULT;
    [['boatCls', b.cls], ['boatWind', b.windKn], ['boatAccel', b.accelAt]].forEach(([id, val]) =>
      [...$(id).children].forEach(x => { x.classList.toggle('on', x.dataset.v === String(val)); x.disabled = !setup; }));
    const def = b.cls === D.cls && b.windKn === D.windKn && b.accelAt === D.accelAt;
    $('boatState').textContent = `orsada ≈${S.upwindKn(b.cls, b.windKn).toFixed(1).replace('.', ',')} kn`;
    $('boatState').classList.toggle('changed', !def);
    $('btnBoatReset').disabled = !setup || def;
    $('boatBox').classList.toggle('hidden', !setup);
  }
  function changeBoat(key, val) {
    if (st.mode !== 'setup') return;
    setBoatCfg({ ...st.boat, [key]: val }); updatePanel(true);
    toast(key === 'accelAt' ? `Tekneler start'a ${val} sn kala yelken doldurup hızlanacak` : `${S.CLASSES[st.boat.cls].name}, ${st.boat.windKn} knot rüzgar: orsada ≈${S.upwindKn(st.boat.cls, st.boat.windKn).toFixed(1).replace('.', ',')} kn`);
  }
  $('boatCls').addEventListener('click', e => { const x = e.target.closest('button'); if (x) changeBoat('cls', x.dataset.v); });
  $('boatWind').addEventListener('click', e => { const x = e.target.closest('button'); if (x) changeBoat('windKn', +x.dataset.v); });
  $('boatAccel').addEventListener('click', e => { const x = e.target.closest('button'); if (x) changeBoat('accelAt', +x.dataset.v); });
  $('btnBoatReset').addEventListener('click', () => { if (st.mode !== 'setup') return; setBoatCfg({ ...S.BOAT_DEFAULT }); updatePanel(true); toast('Varsayılan: Optimist, 8 knot rüzgar, 30 sn kala hızlanma'); });
  function setSea(key, val) {
    if (st.mode === 'setup') { st.sea = { ...st.sea, [key]: val }; updatePanel(true); return; }
    applyChange({ k: 'sea', key, val });
  }
  $('seaCurrent').addEventListener('click', e => { const x = e.target.closest('button'); if (x) setSea('current', +x.dataset.v); });
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
  $('btnPanel').addEventListener('click', () => setPanelOpen($('panel').classList.contains('hidden')));
  $('btnPanelClose').addEventListener('click', () => setPanelOpen(false));
  $('panelHead').addEventListener('click', e => { if (phoneMq.matches && e.target.closest('.info-title-wrap, .handle')) $('panel').classList.toggle('collapsed'); });
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
  holdBtn('hpEase', () => sheetBy(1), null, 140);
  holdBtn('hpTrim', () => sheetBy(-1), null, 140);
  $('hpAuto').addEventListener('click', toggleAutoTrim);
  $('hpTack').addEventListener('click', () => { helmTurn('tack'); flash('hpTack'); });
  $('hpJibe').addEventListener('click', () => { helmTurn('jibe'); flash('hpJibe'); });
  $('hpGo').addEventListener('click', () => (st.drive ? exitDrive(true) : enterDrive()));
  $('hpClose').addEventListener('click', () => (st.drive ? exitDrive(false) : enterDrive()));
  $('btnDrive').addEventListener('click', () => (st.drive ? exitDrive(false) : enterDrive()));
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
      if (k === 't' || k === 'T') { helmTurn('tack'); flash('hpTack'); return; }
      if (k === 'k' || k === 'K') { helmTurn('jibe'); flash('hpJibe'); return; }
      if (k === 'o' || k === 'O') { toggleAutoTrim(); return; }
      if (k === 'Escape') { exitDrive(false); return; }
      if (k === 'Enter') { exitDrive(true); return; }
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
  window.addEventListener('resize', fitViewBox);
  phoneMq.addEventListener('change', fitViewBox);

  if (loadSetup()) toast('Son kurulumun yüklendi (isimler, taktikler, parkur)');
  fitViewBox();
  if (phoneMq.matches) $('panel').classList.add('collapsed');
  updatePanel(true);
  requestAnimationFrame(ts => { st.lastTs = ts; tick(ts); });
})();
