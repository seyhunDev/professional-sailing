/* Arayüz: tam ekran sahne, senaryo seçimi, zaman çizelgesi, bilgi kartı, tekne ekleme/çıkarma */
(function () {
  const E = SailEngine;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const $ = id => document.getElementById(id);
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    // sahne yazıları yakın görünümde --ls ile büyür (style.css: tekne ve gösterge katmanında --ls = 1)
    if (tag === 'text' && attrs['font-size']) n.style.fontSize = `calc(${attrs['font-size']}px * var(--ls, 1))`;
    if (parent) parent.appendChild(n);
    return n;
  };
  const HULL = 50;                 // tekne boyu (px)
  const COURSE = { w: 1000, h: 680 };   // senaryo koordinat alanı
  const EXTRA_COLORS = ['#ffd166', '#c77dff', '#90be6d', '#f9844a', '#48cae4', '#f94144', '#b5e48c'];
  const CAT_COLORS = { 'Taktik': 'var(--c-taktik)', 'İleri Taktik': 'var(--c-ileri)', 'Kurallar': 'var(--c-kural)', 'Teknik': 'var(--c-teknik)' };
  // tekne rolleri: sahnede etiket kenarı + simge, kartta rozet
  const ROLES = {
    hak:   { label: 'Hak sahibi', glyph: '✓', color: '#34d399' },
    yol:   { label: 'Yol verir',  glyph: '!', color: '#fbbf24' },
    dogru: { label: 'Doğru',      glyph: '✓', color: '#34d399' },
    hata:  { label: 'Hata',       glyph: '✕', color: '#f87171' }
  };
  const splitTitle = t => { const m = t.match(/^(\S+?\d+[a-z]?)\s*·\s*(.*)$/); return m ? [m[1], m[2]] : ['', t]; };
  // SVG içi kutuların genişliği metne göre: tahmini değil ölçülmüş genişlik (taşma olmasın)
  const measureCtx = document.createElement('canvas').getContext('2d');
  const FONT = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';
  const textW = (str, size, weight = 400, spacing = 0) => {
    measureCtx.font = `${weight} ${size}px ${FONT}`;
    return measureCtx.measureText(str).width + spacing * str.length;
  };
  const fmtClock = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CROWD_COLORS = ['#c9d6e3', '#b8c7d6', '#aab9c9', '#d5dde6', '#bfcbd8', '#a3b3c4', '#cdd7e1', '#b0bfcf', '#dbe3ea', '#9fb0c3'];

  const state = {
    scn: null, boats: [], extras: [], t: 0, playing: false, speed: 1, lastTs: 0,
    show: { wind: true, rungs: true, labels: true, trails: false, shadows: true, startLay: false },
    vb: { x: 0, y: 0, w: COURSE.w, h: COURSE.h },      // ekranı dolduran görünüm alanı
    follow: true, stepIdx: 0, infoOpen: true, zoom: null, rungNotes: [], ls: 1
  };

  const phoneMq = window.matchMedia('(max-width: 640px), (max-height: 460px)');

  // ---------- Görünüm alanı: sahne oranına göre su alanını genişlet ----------
  function fitViewBox() {
    const svg = $('course');
    const W = svg.clientWidth || 1, H = svg.clientHeight || 1;
    const aspect = W / H, ca = COURSE.w / COURSE.h;
    let w = COURSE.w, h = COURSE.h;
    if (aspect > ca) w = COURSE.h * aspect; else h = COURSE.w / aspect;
    // dikey ekranda fazla yükseklik: tablette parkur aşağıda (üst boşluk bilgi kartına), telefonda yukarıda (kart altta)
    const topShare = (typeof phoneMq !== 'undefined' && phoneMq.matches) ? 0.22 : 0.68;
    // geniş ekranda bilgi kartı sağda: yatay fazlalığı sağa ver ki parkur kartın altında kalmasın
    let x = -(w - COURSE.w) / 2;
    const card = $('infoCard');
    if (!phoneMq.matches && state.infoOpen && card && aspect > ca && !matchMedia('(max-width: 1100px) and (orientation: portrait)').matches) {
      const upp = w / W, need = (card.offsetWidth + 28) * upp;      // kartın kapladığı genişlik (SVG birimi)
      const extra = w - COURSE.w, right = Math.min(extra, need);
      x = -(extra - right) / 2;
    }
    state.vb = { x, y: -(h - COURSE.h) * topShare, w, h };
    svg.setAttribute('viewBox', `${state.vb.x} ${state.vb.y} ${w} ${h}`);
  }

  // ---------- Yakın görünüm (odak kamerası) ----------
  // Telefonda parkurun tamamı sığdırılınca tekneler çok küçük kalıyor. Bunun yerine olayın geçtiği
  // kutu (teknelerin rotaları + start hattı) bilgi kartının üstünde kalan alana sığdırılır.
  // Senaryonun tamamı yeterince büyük sığıyorsa görünüm sabit; sığmıyorsa kamera teknelerin
  // o anki çevresini (t-2 … t+4 sn) yumuşakça izler. İzlerken yakınlık SABİT (minScale: tekne ≈ 38 px),
  // yalnız kaydırma yapılır: zoom oynayıp göz yormasın.
  const CAM = { dt: 0.5, floor: 0.5, minScale: 0.85, maxScale: 1.3, pad: 64, padTop: 70, minBox: 340, back: 2, ahead: 4 };
  let camCur = null, camFull = null, camWins = [];
  function camOn() { return state.zoom == null ? phoneMq.matches : state.zoom; }
  function boxOf(t0, t1, full) {
    const scn = state.scn, b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    const add = (x, y) => { if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y; };
    // izleme penceresinde yalnız dersin tekneleri (filo görünümün dışında kalabilir); tam kutuda herkes.
    // Yazı boyları bilinmediğinden tekne yazıları için kenarlarda CAM.pad payı bırakılır.
    for (const bt of full ? [...state.boats, ...state.extras] : state.boats) for (let t = t0; t <= t1 + 1e-6; t += 0.5) { const q = E.sampleTrack(bt.track, t); add(q.x, q.y); }
    // sabit nesneler (pin, hakem botu + yazısı, şamandıra + yazısı): tam kutuda hepsi; izlemede yalnız teknelere
    // yakın olanlar (ders o uçta geçiyorsa uç görünsün). Hazırlık bayrağı gösterilen senaryoda hat hep görünür.
    const fixed = [];
    if (scn.line) {
      const { pin, boat: cb } = scn.line;
      fixed.push([{ x: pin.x, y: pin.y }, { x: pin.x, y: pin.y + 28 }], [{ x: cb.x - 20, y: cb.y - 50 }, { x: cb.x + 70, y: cb.y + 64 }]);
      if (scn.prepFlag) fixed.push([{ x: cb.x + 70 + textW(`Hazırlık bayrağı: ${scn.prepFlag}`, 11), y: cb.y - 46 }]);
    }
    for (const m of scn.marks || []) fixed.push([{ x: m.x, y: m.y - 28 }, { x: m.x + 16 + textW(m.label || '', 12) , y: m.y + 6 }]);
    const near = 170, b0 = { ...b };
    for (const f of fixed) {
      const keep = full || (scn.prepFlag && scn.line) || f.some(p => p.x > b0.x0 - near && p.x < b0.x1 + near && p.y > b0.y0 - near && p.y < b0.y1 + near);
      if (keep) f.forEach(p => add(p.x, p.y));
    }
    return b;
  }
  // görünür alan (SVG öğesinin pikselleri): bilgi kartının ve sol üst göstergenin kapladığı yer çıkarılır
  function camArea() {
    const svg = $('course'), W = svg.clientWidth || 1, H = svg.clientHeight || 1;
    const a = { x: 0, y: 0, w: W, h: H };
    const card = $('infoCard');
    if (state.infoOpen && card) {
      const sr = svg.getBoundingClientRect(), cr = card.getBoundingClientRect();
      if (cr.width > W * 0.7) a.h = Math.max(120, cr.top - sr.top - 6);           // alttan açılan kart
      else if (cr.left > sr.left + W * 0.4) a.w = Math.max(160, cr.left - sr.left - 6);   // sağdaki kart
    }
    if (H > W) { a.y = 80; a.h = Math.max(100, a.h - 80); }                       // dikey ekran: pusula/sayaç için üstte pay
    return a;
  }
  function camTarget(box, a, kFix) {
    const bw = Math.max(CAM.minBox, box.x1 - box.x0 + 2 * CAM.pad), bh = Math.max(CAM.minBox * 0.6, box.y1 - box.y0 + CAM.pad + CAM.padTop);
    const k = kFix || Math.min(CAM.maxScale, a.w / bw, a.h / bh);
    const cx = (box.x0 + box.x1) / 2, cy = (box.y0 - CAM.padTop + box.y1 + CAM.pad) / 2;
    return { k, cx, cy };
  }
  function camView(snap, dt) {
    const svg = $('course'), W = svg.clientWidth || 1, H = svg.clientHeight || 1, a = camArea();
    let tg = camTarget(camFull, a);
    if (tg.k < CAM.minScale && camWins.length) {
      // yakınlık: ±3 sn içindeki pencerelerin hepsini sığdıracak kadar (yavaş değişir), en az tüm senaryo kadar;
      // merkez dersin teknelerinin o anki çevresi; senaryo kutusunun dışına boşuna taşmasın
      const i0 = Math.max(0, Math.floor((state.t - 3) / CAM.dt)), i1 = Math.min(camWins.length - 1, Math.ceil((state.t + 3) / CAM.dt));
      let k = CAM.maxScale;
      for (let i = i0; i <= i1; i++) k = Math.min(k, camTarget(camWins[i], a).k);
      k = Math.max(tg.k, k, CAM.floor);                     // alt sınır: tekne en az ~25 px (kenardaki nesne taşabilir)
      const win = camTarget(boxOf(Math.max(0, state.t - CAM.back), Math.min(state.scn.duration, state.t + CAM.ahead)), a, k);
      const hw = a.w / 2 / k, hh = a.h / 2 / k, F = camFull;
      const clampC = (c, lo, hi, half) => hi - lo <= 2 * half ? (lo + hi) / 2 : Math.max(lo + half, Math.min(hi - half, c));
      tg = { k, cx: clampC(win.cx, F.x0 - CAM.pad, F.x1 + CAM.pad, hw), cy: clampC(win.cy, F.y0 - CAM.padTop, F.y1 + CAM.pad, hh) };
    }
    if (snap || !camCur) camCur = { ...tg };
    else { const f = 1 - Math.exp(-(dt || 0.016) * 2.5); for (const key of ['k', 'cx', 'cy']) camCur[key] += (tg[key] - camCur[key]) * f; }
    const { k, cx, cy } = camCur, w = W / k, h = H / k;
    state.vb = { x: cx - (a.x + a.w / 2) / k, y: cy - (a.y + a.h / 2) / k, w, h };
    svg.setAttribute('viewBox', `${state.vb.x.toFixed(1)} ${state.vb.y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`);
  }
  function updateView(snap, dt) { if (state.scn && camOn()) camView(snap, dt); else fitViewBox(); }

  // ---------- Senaryo yükleme ----------
  function loadScenario(scn) {
    state.scn = scn; state.t = 0; state.playing = false; state.stepIdx = 0;
    state.boats = scn.boats.map(b => ({ ...b }));
    // kalabalık filo: senaryoda tanımlı, kural motoruyla birlikte simüle edilen tekneler
    state.extras = (scn.crowd || []).map((c, i) => {
      const b = { id: c.id || String(i + 1), name: c.name || `Filo ${i + 1}`, color: c.color || CROWD_COLORS[i % CROWD_COLORS.length], tack: c.tack || 'starboard', extra: true, crowd: true };
      if (c.slot != null && scn.line) { const { pin, boat: cb } = scn.line; b.slot = { x: pin.x + (cb.x - pin.x) * c.slot, y: pin.y + (cb.y - pin.y) * c.slot }; b.row = c.row || 0; b.back = c.back || 0; }
      else b.pos = c.pos;
      b.v0 = c.v0;
      return b;
    });
    simulateExtras();
    camFull = boxOf(0, scn.duration, true); camCur = null;
    camWins = [];
    for (let t = 0; t <= scn.duration + 1e-6; t += CAM.dt) camWins.push(boxOf(Math.max(0, t - CAM.back), Math.min(scn.duration, t + CAM.ahead)));
    $('scrub').max = scn.duration;
    $('scnSummary').textContent = scn.summary;
    const [code, ttl] = splitTitle(scn.title);
    $('curCode').textContent = code; $('curTitle').textContent = ttl;
    $('btnScenarios').title = `${scn.category}${scn.topic ? ' · ' + scn.topic : ''} · senaryo seç`;
    $('btnScenarios').style.setProperty('--cat', CAT_COLORS[scn.category] || 'var(--accent)');
    document.title = `${scn.title} · Velora Sailing`;
    document.querySelectorAll('.card').forEach(c => c.classList.toggle('active', c.dataset.id === scn.id));
    setFollow(true);
    buildLegend(); buildTimeline(); buildSideOptions(); drawCourse(); updatePlayButton();
    showStep(0, false); render();
    if (window.SailTrack) SailTrack.log('scenario', { id: scn.id, title: scn.title, category: scn.category });
  }
  // Tekne listesi: renkli kimlik + kısa ad + rol rozeti; filo tek satırda özetlenir
  function buildLegend() {
    const c = $('legend'); c.innerHTML = '';
    const used = new Set();
    for (const b of state.boats) {
      const r = ROLES[b.role]; if (r) used.add(b.role);
      const row = document.createElement('div'); row.className = 'boat-row'; row.title = b.name + (r ? ' · ' + r.label : '');
      row.innerHTML = `<span class="boat-id" style="--c:${b.color}">${esc(b.id)}</span><span class="boat-name">${esc(b.name)}</span>` +
        (r ? `<span class="role" style="--r:${r.color}"><i>${r.glyph}</i>${r.label}</span>` : '');
      c.appendChild(row);
    }
    const crowd = state.extras.filter(b => b.crowd).length;
    if (crowd) {
      const row = document.createElement('div'); row.className = 'boat-row crowd-row';
      row.innerHTML = `<span class="boat-id">1–${crowd}</span><span class="boat-name">Filo · ${crowd} tekne, kurallara göre</span>`;
      c.appendChild(row);
    }
    const key = $('roleKey');
    key.innerHTML = state.show.labels ? '<span><b class="k s">S</b> sancak kontra</span><span><b class="k i">İ</b> iskele kontra</span><span>etiket kenarı = rol</span>' : '';
  }
  // Zaman çizelgesi: her adım için tıklanabilir işaret; kartta adım çubuğu
  function buildTimeline() {
    const scn = state.scn, ticks = $('ticks'), bar = $('stepBar');
    ticks.innerHTML = ''; bar.innerHTML = '';
    scn.steps.forEach((st, i) => {
      const t = document.createElement('button'); t.style.left = (st.t / scn.duration * 100) + '%'; t.title = `${i + 1}. ${st.title}`;
      t.onclick = () => { state.t = st.t; state.playing = false; updatePlayButton(); setFollow(true); render(); };
      ticks.appendChild(t);
      const b = document.createElement('button'); b.title = `${i + 1}. ${st.title}`; b.setAttribute('aria-label', `Adım ${i + 1}`);
      b.onclick = () => browse(i);
      bar.appendChild(b);
    });
  }
  function buildSideOptions() {
    const sel = $('selSide'); sel.innerHTML = '';
    const lab = state.scn.addBoatLabels || (state.scn.line
      ? { pin: 'Pin ucu', middle: 'Orta', committee: 'Hakem botu ucu' }
      : { pin: 'Sol', middle: 'Orta', committee: 'Sağ' });
    for (const k of Object.keys(state.scn.addBoat || {})) {
      const o = document.createElement('option'); o.value = k; o.textContent = lab[k] || k; sel.appendChild(o);
    }
  }

  // ---------- Bilgi kartı ----------
  function stepAt(t) { let i = 0; state.scn.steps.forEach((s, k) => { if (t >= s.t - 1e-6) i = k; }); return i; }
  function showStep(i, flash) {
    const steps = state.scn.steps; i = Math.max(0, Math.min(steps.length - 1, i));
    const changed = i !== state.stepIdx; state.stepIdx = i;
    const s = steps[i];
    $('stepIdx').textContent = `Adım ${i + 1} / ${steps.length}`;
    [...$('stepBar').children].forEach((b, k) => { b.classList.toggle('cur', k === i); b.classList.toggle('done', k < i); });
    $('stepTitle').textContent = s.title; $('stepText').textContent = s.text;
    $('btnPrev').disabled = i === 0; $('btnNext').disabled = i === steps.length - 1;
    if (flash && changed) { const c = $('infoCard'); c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash'); }
  }
  function setInfoOpen(open) {
    state.infoOpen = open; $('infoCard').classList.toggle('hidden', !open); $('btnInfo').classList.toggle('on', open);
    // kart açılıp kapanınca (ve telefonda daraltılınca) görünür alan değişir
    requestAnimationFrame(() => {
      // telefonda marka (sol alt) çekmecenin hemen üstünde dursun
      $('infoCard').parentNode.style.setProperty('--sheet', (phoneMq.matches && state.infoOpen ? $('infoCard').offsetHeight : 0) + 'px');
      camCur = null; updateView(true); if (state.scn) render();
    });
  }

  // ---------- Ek tekneler: kural motoruyla birlikte simüle edilir ----------
  function simulateExtras() {
    const scn = state.scn;
    // senaryo tekneleri + filo + ek tekneler birlikte; pis rüzgar yavaşlaması dahil (SailRules.buildScene)
    const sc = SailRules.buildScene(scn, state.extras.map(b => ({ pos: b.pos, slot: b.slot, row: b.row, back: b.back, tack: b.tack, v0: b.v0 })));
    state.boats.forEach((b, i) => b.track = sc.scripted[i]);
    state.extras.forEach((b, i) => b.track = sc.extras[i]);
  }
  function addBoat() {
    const scn = state.scn; if (!scn.addBoat) return;
    const side = $('selSide').value, tack = $('selTack').value;
    const n = state.extras.length;
    const boat = { id: 'X' + (n + 1), name: `Tekne ${n + 1} (${tack === 'starboard' ? 'sancak' : 'iskele'})`,
      color: EXTRA_COLORS[n % EXTRA_COLORS.length], tack, extra: true };
    if (scn.line && scn.startAt > 0) {
      // start senaryosu: hat üstünde bir geçiş noktası (slot) seç; tekne geride bekleyip oradan geçer
      const { pin, boat: cb } = scn.line;
      const slots = (scn.startSlots || { pin: [0.12, 0.26], middle: [0.5, 0.62], committee: [0.9, 0.78] })[side] || [0.5];
      const k = state.extras.filter(b => b.side === side).length;      // bu uçta kaçıncı tekne
      const u = slots[k % slots.length];
      boat.side = side;
      boat.slot = { x: pin.x + (cb.x - pin.x) * u, y: pin.y + (cb.y - pin.y) * u };
      boat.row = Math.floor(k / slots.length);        // slotlar dolunca 2. sıra: daha geride bekler
    } else {
      const pos = scn.addBoat[side];
      boat.pos = { x: pos.x + (n % 3 - 1) * 26, y: pos.y + Math.floor(n / 3) * 44 };
    }
    state.extras.push(boat);
    simulateExtras(); buildLegend(); render();
  }
  function removeBoat() { state.extras.pop(); simulateExtras(); buildLegend(); render(); }

  // ---------- Sabit parkur ----------
  let cbNode = null;                                   // hakem botu: rüzgarla döner (demirde başı rüzgarda)
  function drawCourse() {
    const g = $('courseLayer'); g.innerHTML = ''; cbNode = null;
    const scn = state.scn;
    if (scn.line) {
      const { pin, boat } = scn.line;
      el('line', { x1: pin.x, y1: pin.y, x2: boat.x, y2: boat.y, stroke: '#ffd166', 'stroke-width': 2, 'stroke-dasharray': '10 8', opacity: .9 }, g);
      el('circle', { cx: pin.x, cy: pin.y, r: 7, fill: '#ff8c42', stroke: '#fff', 'stroke-width': 1.5 }, g);
      el('text', { x: pin.x, y: pin.y + 24, 'text-anchor': 'middle', fill: '#ffd166', 'font-size': 12 }, g).textContent = 'Pin';
      cbNode = E.drawCommitteeBoat(el, g);
      cbNode.setAttribute('transform', E.committeeBoatTransform(boat.x, boat.y, E.windAt(scn.wind, state.t)));
      // committeeLabel: 'right' → yazı hakem botunun sağına (sol tarafta bekleyen tekneyle çakışmasın)
      // 'upright' → sağ üstte (botun sağında, hat hizasında bekleyen tekne varsa)
      const cbRight = scn.committeeLabel === 'right' || scn.committeeLabel === 'upright', cbUp = scn.committeeLabel === 'upright';
      el('text', { x: boat.x + (cbRight ? 30 : 14), y: boat.y + (cbUp ? -26 : cbRight ? 52 : 60), 'text-anchor': cbRight ? 'start' : 'middle', fill: '#ffd166', 'font-size': 12, 'paint-order': 'stroke', stroke: 'rgba(0,0,0,.45)', 'stroke-width': 3 }, g).textContent = 'Hakem botu';
    }
    for (const m of scn.marks || []) {
      if (m.zone) {
        el('circle', { cx: m.x, cy: m.y, r: 3 * HULL, fill: 'rgba(255,209,102,0.06)', stroke: '#ffd166', 'stroke-width': 1.5, 'stroke-dasharray': '6 6' }, g);
        el('text', { x: m.x, y: m.y - 3 * HULL - 8, 'text-anchor': 'middle', fill: '#ffd166', 'font-size': 12 }, g).textContent = 'Zone (3 tekne boyu)';
      }
      el('circle', { cx: m.x, cy: m.y, r: 8, fill: '#ff8c42', stroke: '#fff', 'stroke-width': 1.5 }, g);
      el('line', { x1: m.x, y1: m.y - 8, x2: m.x, y2: m.y - 26, stroke: '#fff', 'stroke-width': 1.5 }, g);
      el('path', { d: `M${m.x},${m.y - 26} l 12,4 l -12,4 z`, fill: '#ff8c42' }, g);
      el('text', { x: m.x + 16, y: m.y + 4, fill: '#ffd166', 'font-size': 12 }, g).textContent = m.label || '';
    }
  }

  // ---------- Her karede çizim ----------
  function drawBoat(parent, b, s, w) {
    const sail = E.sailState(s.h, w);
    const g = el('g', { transform: `translate(${s.x.toFixed(1)},${s.y.toFixed(1)}) rotate(${s.h.toFixed(1)})` }, parent);
    el('path', { d: 'M0,-25 C 9,-16 11,2 9,22 L -9,22 C -11,2 -9,-16 0,-25 Z', fill: b.color, stroke: '#fff', 'stroke-width': 1.5 }, g);
    el('path', { d: 'M0,-20 C 6,-13 7,2 6,18 L -6,18 C -7,2 -6,-13 0,-20 Z', fill: 'rgba(255,255,255,0.18)' }, g);
    const my = -6, seed = E.seedOf(b.id);
    const pose = E.sailPose(s.h, w, { v: s.v, base: state.scn.baseSpeed || 55, t: state.t, seed });
    const sh = E.sailShape(pose, state.t, seed, 27, my);
    el('path', { d: sh.d, fill: 'rgba(255,255,255,0.85)', stroke: '#fff', 'stroke-width': 1 }, g);
    el('line', { x1: 0, y1: my, x2: sh.tip.x.toFixed(1), y2: sh.tip.y.toFixed(1), stroke: '#222', 'stroke-width': 1.5 }, g);
    el('circle', { cx: 0, cy: my, r: 1.8, fill: '#222' }, g);
    if (state.show.labels) drawLabel(parent, b, s, sail);
    if (s.note) frameNotes.push({ x: s.x, y: s.y, text: s.note, color: b.color });
    const shk = state.shadowed && state.shadowed.get(b.id);
    if (shk) frameNotes.push({ x: s.x, y: s.y, kind: 'shadow', text: `Pis rüzgar · hız −${Math.round(E.SHADOW.loss * shk * 100)}%` });
  }

  // Tekne notları: kutulu rozet, tekne üstünde. Üst üste binerse yukarı (sonra aşağı) kaydırılır, ince çizgiyle tekneye bağlanır.
  let frameNotes = [];
  function drawNotes(parent) {
    const ls = state.ls, placed = [], H = 22 * ls, pad = 10 * ls, fs = 12 * ls;
    const boats = [...state.boats, ...state.extras].map(b => E.sampleTrack(b.track, state.t));
    // engeller: tekne gövdeleri, tekne etiketleri, hakem botu (+ yazısı), pin, şamandıralar
    const obst = [];
    for (const p of boats) { obst.push({ x: p.x - 16, y: p.y - 26, w: 32, h: 52 }); if (state.show.labels) obst.push({ x: p.x - 28 * ls, y: p.y + 26, w: 56 * ls, h: 20 * ls }); }
    const scn = state.scn;
    if (scn.line) { const { pin, boat: cb } = scn.line; obst.push({ x: cb.x - 40, y: cb.y - 54, w: 80, h: 122 }, { x: pin.x - 16, y: pin.y - 10, w: 32, h: 40 }); }
    for (const m of scn.marks || []) obst.push({ x: m.x - 12, y: m.y - 28, w: 24, h: 38 });
    obst.push(hudBox());
    const ov = (r, q, m) => r.x < q.x + q.w + m && q.x < r.x + r.w + m && r.y < q.y + q.h + m && q.y < r.y + r.h + m;
    const hit = (r) => placed.some(q => ov(r, q, 4)) || obst.some(q => ov(r, q, 0));
    // önce teknesi üstte olanlar yerleşsin (yukarı kaydırma tutarlı olsun)
    for (const n of [...frameNotes].sort((a, b) => a.y - b.y)) {
      const fault = /^HATA/.test(n.text), col = n.kind === 'shadow' ? '#c4b5fd' : n.kind === 'rung' ? n.color : fault ? '#f87171' : '#fbbf24';
      const w = Math.ceil(textW(n.text, fs, 700)) + pad * 2;
      const offs = [-50, -74, -98, -122, 52, 76].map(o => o < 0 ? -28 - (-o - 28) * ls : 28 + (o - 28) * ls);
      let r = null, off = offs[0];
      for (const o of offs) { const c = { x: n.x - w / 2, y: n.y + o, w, h: H }; if (!hit(c)) { r = c; off = o; break; } }
      if (!r) {                                                // boş yer yoksa en az örten yeri seç (etiketleri örtmesin)
        const area = (a, q) => Math.max(0, Math.min(a.x + a.w, q.x + q.w) - Math.max(a.x, q.x)) * Math.max(0, Math.min(a.y + a.h, q.y + q.h) - Math.max(a.y, q.y));
        let best = Infinity;
        for (const o of offs) { const c = { x: n.x - w / 2, y: n.y + o, w, h: H }, sc = [...placed, ...obst].reduce((t, q) => t + area(c, q), 0); if (sc < best) { best = sc; r = c; off = o; } }
      }
      placed.push(r);
      const g = el('g', {}, parent);
      if (off !== offs[0]) {                                   // kaydırıldıysa tekneye ince bağlantı
        const ey = off < 0 ? r.y + H : r.y;
        el('line', { x1: n.x, y1: n.y + (off < 0 ? -22 : 22), x2: n.x, y2: ey, stroke: col, 'stroke-width': 1, opacity: .6 }, g);
      }
      el('rect', { x: r.x, y: r.y, width: w, height: H, rx: H / 2, fill: 'rgba(7,18,30,.86)', stroke: col, 'stroke-width': 1.2 }, g);
      el('text', { x: n.x, y: r.y + H / 2 + 4.2 * ls, 'text-anchor': 'middle', fill: col, 'font-size': fs.toFixed(1), 'font-weight': 700 }, g).textContent = n.text;
    }
  }

  // Etiket: tekne altında küçük rozet. [rol simgesi] KİMLİK | S/İ (kontra). Kenar rengi rolü gösterir.
  function drawLabel(parent, b, s, sail) {
    const ls = state.ls, x = s.x, y = s.y + 26 + 10 * ls;
    if (b.crowd) {
      el('text', { x: x.toFixed(1), y: y.toFixed(1), 'text-anchor': 'middle', fill: 'rgba(255,255,255,.75)', 'font-size': (10 * ls).toFixed(1),
        'paint-order': 'stroke', stroke: 'rgba(0,0,0,.55)', 'stroke-width': 3 }, parent).textContent = b.id;
      return;
    }
    const r = ROLES[b.role], tack = sail.tack === 'starboard' ? 'S' : 'İ';
    const idW = Math.ceil(textW(b.id, 12, 700)), gW = r ? 15 : 0, w = 8 + gW + idW + 5 + 14 + 3, h = 20;
    const g = el('g', { transform: `translate(${(x - w * ls / 2).toFixed(1)},${(y - h * ls / 2).toFixed(1)}) scale(${ls.toFixed(3)})` }, parent);
    el('rect', { width: w, height: h, rx: 9, fill: 'rgba(7,18,30,.82)', stroke: r ? r.color : 'rgba(255,255,255,.35)', 'stroke-width': r ? 1.5 : 1 }, g);
    let cx = 8;
    if (r) {
      el('circle', { cx: cx + 5.5, cy: h / 2, r: 6, fill: r.color }, g);
      el('text', { x: cx + 5.5, y: h / 2 + 3.5, 'text-anchor': 'middle', fill: '#071522', 'font-size': 9, 'font-weight': 800 }, g).textContent = r.glyph;
      cx += gW;
    }
    el('text', { x: cx, y: h / 2 + 4, fill: '#fff', 'font-size': 12, 'font-weight': 700 }, g).textContent = b.id;
    cx += idW + 5;                                          // kontra: küçük renkli kutu (sancak yeşil, iskele kırmızı — seyir feneri gibi)
    el('rect', { x: cx, y: 3, width: 14, height: h - 6, rx: 4, fill: tack === 'S' ? '#22c55e' : '#ef4444' }, g);
    el('text', { x: cx + 7, y: h / 2 + 3.5, 'text-anchor': 'middle', fill: '#fff', 'font-size': 10, 'font-weight': 800 }, g).textContent = tack;
    el('title', {}, g).textContent = `${b.id} · ${b.name} · ${sail.tack === 'starboard' ? 'sancak' : 'iskele'} kontra` + (r ? ` · ${r.label}` : '');
  }

  function drawWind(w) {
    const g = $('windLayer'); g.innerHTML = '';
    if (!state.show.wind) return;
    const vb = state.vb;
    const d = E.fwd(w + 180), px = E.fwd(w + 90);
    const cx0 = vb.x + vb.w / 2, cy0 = vb.y + vb.h / 2;
    const R = Math.hypot(vb.w, vb.h) / 2 + 100;         // alanı kaplayacak yarıçap
    const spacing = 95, n = Math.ceil(2 * R / spacing), len = 70;
    for (let i = 0; i < n; i++) {
      const lateral = -R + i * spacing + 40;
      const along = ((state.t * 45 + i * 137) % (2 * R)) - R;
      const cx = cx0 + px.x * lateral + d.x * along, cy = cy0 + px.y * lateral + d.y * along;
      el('line', { x1: cx - d.x * len / 2, y1: cy - d.y * len / 2, x2: cx + d.x * len / 2, y2: cy + d.y * len / 2,
        stroke: 'rgba(255,255,255,0.16)', 'stroke-width': 2, 'stroke-linecap': 'round' }, g);
    }
  }

  function drawOverlays(w) {
    const g = $('overlayLayer'); g.innerHTML = '';
    const scn = state.scn; state.rungNotes = [];
    // ayarlardaki anahtar: pin ve hakem botu layline'ları (rüzgara göre her karede)
    if (state.show.startLay && scn.line) E.drawStartLaylines(el, g, scn.line, w);
    if (state.show.rungs && scn.rungs && state.t >= scn.rungs.from && (scn.rungs.to == null || state.t <= scn.rungs.to)) {
      const b = state.boats.find(x => x.id === scn.rungs.boat);
      const s = E.sampleTrack(b.track, state.t);
      const p = E.fwd(w + 90);
      el('line', { x1: s.x - p.x * 1500, y1: s.y - p.y * 1500, x2: s.x + p.x * 1500, y2: s.y + p.y * 1500,
        stroke: b.color, 'stroke-width': 1.5, 'stroke-dasharray': '8 6', opacity: .8 }, g);
      for (const o of state.boats) {
        if (o === b) continue;
        const so = E.sampleTrack(o.track, state.t);
        const up = E.fwd(w);
        const gain = ((so.x - s.x) * up.x + (so.y - s.y) * up.y) / HULL;
        // kutulu rozet olarak not sistemine (drawNotes) gider: tekne etiketi, pin ve diğer notlarla çakışmaz
        if (Math.abs(gain) > 0.3) state.rungNotes.push({ x: so.x, y: so.y, kind: 'rung', color: o.color, text: `${gain > 0 ? '+' : ''}${gain.toFixed(1)} tekne boyu` });
      }
    }
    // layline'lar: şamandıradan/uçtan geriye, orsa rotası boyunca
    for (const L of scn.laylines || []) {
      if (state.t < (L.from || 0) || (L.to != null && state.t > L.to)) continue;
      const hd = E.tackHeading(w, L.tack), f = E.fwd(hd), len = L.len || 500;
      el('line', { x1: L.x, y1: L.y, x2: L.x - f.x * len, y2: L.y - f.y * len, stroke: L.color || '#4cc9f0', 'stroke-width': 1.5, 'stroke-dasharray': '4 6', opacity: .8 }, g);
      if (L.label) el('text', { x: L.x - f.x * len * 0.55 + 10, y: L.y - f.y * len * 0.55, fill: L.color || '#4cc9f0', 'font-size': 12 }, g).textContent = L.label;
    }
    // transit / nişan hattı: pin'den hakem botuna bakış
    if (scn.sightline && scn.line && state.t >= (scn.sightline.from || 0) && (scn.sightline.to == null || state.t <= scn.sightline.to)) {
      const { pin, boat } = scn.line; const dx = boat.x - pin.x, dy = boat.y - pin.y, L = Math.hypot(dx, dy);
      const ux = dx / L, uy = dy / L;
      el('line', { x1: pin.x - ux * 120, y1: pin.y - uy * 120, x2: boat.x + ux * 160, y2: boat.y + uy * 160, stroke: '#fff', 'stroke-width': 2, 'stroke-dasharray': '2 6', opacity: .9 }, g);
      el('circle', { cx: pin.x - ux * 120, cy: pin.y - uy * 120, r: 6, fill: 'none', stroke: '#fff', 'stroke-width': 2 }, g);
      el('text', { x: pin.x - ux * 120 - 10, y: pin.y - uy * 120 - 14, 'text-anchor': 'start', fill: '#fff', 'font-size': 12, 'font-weight': 600 }, g).textContent = scn.sightline.label || 'Transit: pin → hakem botu hizası';
    }
    const inWin = o => o && state.t >= (o.from || 0) && (o.to == null || state.t <= o.to);
    const crowdNow = () => state.extras.filter(b => b.crowd).map(b => E.sampleTrack(b.track, state.t));
    // boşluk işaretleri: iki filo teknesi ({a,b}: crowd sırası, 0'dan) arasındaki boşluk, hattın hemen
    // üstünde köşeli parantez + etiket; uçlar teknelerin o anki konumunun hatta izdüşümü
    if (scn.gaps && scn.line && inWin(scn.gaps)) {
      const { pin, boat } = scn.line; const dx = boat.x - pin.x, dy = boat.y - pin.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
      const nx = uy, ny = -ux;                               // hattın rüzgarüstü normali (pin→hakem botu, ekranda yukarı)
      const cr = crowdNow(), off = 16, tick = 6, pad = 18;   // pad: tekne genişliği kadar içeri
      const onLine = (p, sh) => { const u = (p.x - pin.x) * ux + (p.y - pin.y) * uy + sh; return { x: pin.x + ux * u + nx * off, y: pin.y + uy * u + ny * off }; };
      for (const it of scn.gaps.items || []) {
        if (!cr[it.a] || !cr[it.b]) continue;
        const col = it.color || '#fbbf24', a = onLine(cr[it.a], pad), b = onLine(cr[it.b], -pad);
        el('path', { d: `M${a.x - nx * tick},${a.y - ny * tick} L${a.x},${a.y} L${b.x},${b.y} L${b.x - nx * tick},${b.y - ny * tick}`, fill: 'none', stroke: col, 'stroke-width': 2, opacity: .9 }, g);
        if (it.label) el('text', { x: (a.x + b.x) / 2 + nx * 8, y: (a.y + b.y) / 2 + ny * 8, 'text-anchor': 'middle', fill: col, 'font-size': 12, 'font-weight': 700, 'paint-order': 'stroke', stroke: 'rgba(0,0,0,.7)', 'stroke-width': 3 }, g).textContent = it.label;
      }
    }
    // yer işareti (spots): sahnede bir noktayı kesikli halkayla gösterir (ör. hakem botu dibinde açılan boşluk);
    // aralığın ilk ve son saniyesinde yumuşakça belirir / kaybolur
    for (const sp of scn.spots || []) {
      if (!inWin(sp)) continue;
      const fade = Math.max(0, Math.min(1, (state.t - (sp.from || 0)) / 1, sp.to == null ? 1 : (sp.to - state.t) / 1));
      const col = sp.color || '#fbbf24', r = sp.r || 26;
      const sg = el('g', { opacity: fade.toFixed(2) }, g);
      el('circle', { cx: sp.x, cy: sp.y, r, fill: 'rgba(251,191,36,.10)', stroke: col, 'stroke-width': 2, 'stroke-dasharray': '6 5' }, sg);
      if (sp.label) el('text', { x: sp.x + (sp.dx || 0), y: sp.y + (sp.dy != null ? sp.dy : r + 15), 'text-anchor': 'middle', fill: col, 'font-size': 12, 'font-weight': 700, 'paint-order': 'stroke', stroke: 'rgba(0,0,0,.7)', 'stroke-width': 3 }, sg).textContent = sp.label;
    }
    // hat yayı (line sag): filonun burunlarından geçen eğri, hat ile arası taralı
    if (scn.sag && scn.line && inWin(scn.sag)) {
      const { pin, boat } = scn.line; const lx0 = boat.x - pin.x, ly0 = boat.y - pin.y, L = Math.hypot(lx0, ly0), ux = lx0 / L, uy = ly0 / L;
      const bows = crowdNow().map(s => { const f = E.fwd(s.h); return { x: s.x + f.x * 25, y: s.y + f.y * 25 }; })
        .map(p => ({ ...p, u: (p.x - pin.x) * ux + (p.y - pin.y) * uy })).filter(p => p.u > 0 && p.u < L).sort((a, b) => a.u - b.u);
      const pts = [{ x: pin.x, y: pin.y }, ...bows, { x: boat.x, y: boat.y }];
      let d = `M${pts[0].x},${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {        // Catmull-Rom → kübik Bezier
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
        const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }, c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
        d += ` C${c1.x.toFixed(1)},${c1.y.toFixed(1)} ${c2.x.toFixed(1)},${c2.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
      }
      el('path', { d: d + ' Z', fill: 'rgba(255,140,66,.10)', stroke: 'none' }, g);
      el('path', { d, fill: 'none', stroke: '#ff8c42', 'stroke-width': 2, 'stroke-dasharray': '7 5', opacity: .9 }, g);
      let deep = null;
      for (const p of bows) { const dep = (p.x - pin.x) * -uy + (p.y - pin.y) * ux; if (!deep || dep > deep.dep) deep = { ...p, dep }; }
      if (deep && deep.dep > 8) {
        const inside = deep.dep > 2 * HULL;                 // derin yayda etiket taralı alanın içine, sığda teknelerin altına
        const k = inside ? 0.5 : 0.62, off = inside ? deep.dep * 0.45 : -16;   // derin: hattın ortası, taralı alanın içi · sığ: hattın sağ yarısı, üstü
        const lx = pin.x + lx0 * k - uy * off, ly = pin.y + ly0 * k + ux * off;
        const tx = el('text', { x: lx, y: ly, 'text-anchor': 'middle', fill: '#ff8c42', 'font-size': 12, 'font-weight': 700, 'paint-order': 'stroke', stroke: 'rgba(0,0,0,.7)', 'stroke-width': 3 }, g);
        tx.textContent = (scn.sag.label || 'Hat yayı (line sag): ortada {d} boy geride').replace('{d}', (deep.dep / HULL).toFixed(1));
      }
    }
    // rüzgar gölgesi (pis rüzgar): HER teknenin rüzgaraltında ~1 boyluk koni (engine.SHADOW).
    // Yavaşlama rotalarda hesaplı (SailRules.buildScene); burada yalnızca çizim ve senaryo teknesine not.
    state.shadowed = new Map();
    if (scn.shadows !== false) {
      const base = scn.baseSpeed || 55;
      const all = [...state.boats, ...state.extras].map(b => ({ ...E.sampleTrack(b.track, state.t), ref: b }));
      all.forEach(c => c.str = E.shadowStrength(c.v, base));
      if (state.show.shadows && inWin(scn.shadows === true || !scn.shadows ? {} : scn.shadows)) {
        for (const c of all) el('polygon', { points: E.shadowPolygon(c, w), fill: `rgba(2,10,20,${(0.3 * c.str).toFixed(2)})`,
          stroke: `rgba(248,113,113,${(0.4 * c.str).toFixed(2)})`, 'stroke-dasharray': '3 4' }, g);
      }
      for (const p of all) {
        if (p.ref.crowd || p.ref.extra || (p.v || 0) < base * 0.25) continue;          // yalnızca seyreden senaryo teknelerine not
        const sh = E.shadowK(p, all, w, base);
        if (sh.k > 0.15) state.shadowed.set(p.ref.id, sh.k);
      }
    }
    // okumalar: teknenin rüzgar açısı
    for (const R of scn.readouts || []) {
      if (state.t < (R.from || 0) || (R.to != null && state.t > R.to)) continue;
      const b = state.boats.find(x => x.id === R.boat); if (!b) continue;
      const s = E.sampleTrack(b.track, state.t), st = E.sailState(s.h, w);
      const tx = el('text', { x: s.x + 34, y: s.y - 10, fill: '#fff', 'font-size': 13, 'font-weight': 600, 'paint-order': 'stroke', stroke: 'rgba(0,0,0,.6)', 'stroke-width': 3 }, g);
      tx.textContent = `Rota ${Math.round(E.norm360(s.h))}° · Rüzgar açısı ${Math.round(st.abs)}°`;
    }
    if (state.show.trails) {
      for (const b of [...state.boats, ...state.extras]) {
        let d = '';
        for (let t = 0; t <= state.t; t += 0.25) { const s = E.sampleTrack(b.track, t); d += (d ? ' L' : 'M') + s.x.toFixed(1) + ',' + s.y.toFixed(1); }
        if (d) el('path', { d, fill: 'none', stroke: b.color, 'stroke-width': 1.5, opacity: .45 }, g);
      }
    }
  }

  // sol üst gösterge ölçeği (SVG birimi / gösterge birimi); notlar göstergenin altına girmesin diye kutusu da burada
  function hudScale() {
    const upp = state.vb.w / ($('course').clientWidth || state.vb.w);
    const ph = camOn() && phoneMq.matches;                  // telefonda gösterge biraz küçük (sahneye yer kalsın)
    return Math.max(ph ? 0.55 : 0.8, Math.min(1.6, upp * (ph ? 0.68 : 0.95)));
  }
  // gösterge kartının ölçüleri (gösterge birimiyle): saat yoksa yalnız pusula (100), varsa saat sütunu eklenir
  function hudLayout() {
    const scn = state.scn;
    if (!(scn.startAt != null && scn.startAt > 0)) return { W: 100, clock: null };
    const cs = scn.clockScale || 1, rem = (scn.startAt - state.t) * cs;
    const fmt = r => scn.clockScale ? fmtClock(r) : `${r.toFixed(1)} sn`;
    const on = rem > 0, col = on ? (rem <= 5 * cs ? '#f87171' : '#fbbf24') : '#34d399';
    const big = on ? fmt(rem) : 'Start verildi', small = on ? "START'A" : 'YARIŞ';
    const fs = on ? 30 : 20;
    const minBig = textW(fmt(scn.startAt * cs), 30, 800);         // geri sayarken kart daralıp genişlemesin
    const kn = scn.windKn ? textW(`${scn.windKn} KN${scn.windKn >= 15 ? ' · KUVVETLİ' : ''}`, 10, 700, .6) : 0;   // rüzgar şiddeti satırı
    const W = Math.ceil(100 + 16 + Math.max(textW(big, fs, 800), minBig, textW(small, 10, 700, 1) + 14, kn) + 18);
    return { W, clock: { big, small, col, fs } };
  }
  function hudBox() {
    const k = hudScale();
    return { x: state.vb.x, y: state.vb.y, w: (12 + hudLayout().W + 6) * k, h: (12 + 100 + 6) * k };
  }
  function drawHud(w) {
    const g = $('hudLayer'); g.innerHTML = '';
    const scn = state.scn, vb = state.vb;
    // sol üst gösterge (pusula + sayaç): ekranda hep aynı boyda görünsün diye ölçeklenir
    const svg = $('course'), upp = vb.w / (svg.clientWidth || vb.w);       // ekran pikseli başına SVG birimi
    const k = hudScale();
    const hg = el('g', { transform: `translate(${vb.x.toFixed(1)},${vb.y.toFixed(1)}) scale(${k.toFixed(3)})`, style: '--ls: 1' }, g);
    // tek gösterge kartı (simülatörle aynı dil): solda pusula, start senaryosunda sağda saat
    const L = hudLayout(), X = 12, Y = 12, H = 100;
    el('rect', { x: X, y: Y, width: L.W, height: H, rx: 16, fill: 'rgba(9,20,33,0.86)', stroke: 'rgba(148,178,208,.22)', 'stroke-width': 1 }, hg);
    const cx = X + 50, cy = Y + 44, r = 32;
    el('circle', { cx, cy, r, fill: 'rgba(255,255,255,.03)', stroke: 'rgba(255,255,255,.16)', 'stroke-width': 1 }, hg);
    for (let a = 0; a < 360; a += 30) {                           // pusula çentikleri
      const f = E.fwd(a), r1 = a % 90 ? r - 4 : r - 7;
      el('line', { x1: cx + f.x * r1, y1: cy + f.y * r1, x2: cx + f.x * (r - 1), y2: cy + f.y * (r - 1), stroke: a === 0 ? '#7dd3fc' : 'rgba(255,255,255,.32)', 'stroke-width': a % 90 ? 1 : 1.6 }, hg);
    }
    const d = E.fwd(w + 180);
    el('line', { x1: cx - d.x * 21, y1: cy - d.y * 21, x2: cx + d.x * 14, y2: cy + d.y * 14, stroke: '#7dd3fc', 'stroke-width': 3.2, 'stroke-linecap': 'round', 'marker-end': 'url(#arrowHead)' }, hg);
    el('text', { x: cx, y: Y + H - 10, 'text-anchor': 'middle', fill: 'rgba(255,255,255,.62)', 'font-size': 10, 'font-weight': 700, 'letter-spacing': .6 }, hg).textContent = `RÜZGAR ${Math.round(E.norm360(w))}°`;
    if (L.clock) {
      const { big, small, col } = L.clock, RX = X + 100;
      el('line', { x1: RX, y1: Y + 14, x2: RX, y2: Y + H - 14, stroke: 'rgba(148,178,208,.18)' }, hg);
      el('circle', { cx: RX + 20, cy: Y + 33, r: 3.5, fill: col }, hg);
      el('text', { x: RX + 30, y: Y + 37, fill: 'rgba(255,255,255,.62)', 'font-size': 10, 'font-weight': 700, 'letter-spacing': 1 }, hg).textContent = small;
      el('text', { x: RX + 16, y: Y + 72, fill: col, 'font-size': L.clock.fs, 'font-weight': 800, 'font-variant-numeric': 'tabular-nums', 'letter-spacing': -.5 }, hg).textContent = big;
      // rüzgar şiddeti (senaryoda windKn varsa): saatin altında; 15 knot ve üstü "kuvvetli" diye vurgulanır
      if (scn.windKn) {
        const strong = scn.windKn >= 15;
        el('text', { x: RX + 16, y: Y + H - 10, fill: strong ? '#fbbf24' : 'rgba(255,255,255,.62)', 'font-size': 10, 'font-weight': 700, 'letter-spacing': .6 }, hg).textContent = `${scn.windKn} KN${strong ? ' · KUVVETLİ' : ''}`;
      }
      // hazırlık bayrağı: son 1 dakikada indirilir
      if (scn.prepFlag && scn.line) {
        const up = state.t < (scn.flagDownAt != null ? scn.flagDownAt : scn.startAt);
        const bx = scn.line.boat.x + 34, by = scn.line.boat.y - 40;
        el('line', { x1: bx, y1: by + 46, x2: bx, y2: by - 6, stroke: '#fff', 'stroke-width': 2 }, g);
        if (up) {
          const col = { P: '#1f77b4', I: '#ffd166', U: '#e63946', Z: '#e63946', Siyah: '#111' }[scn.prepFlag] || '#ffd166';
          el('rect', { x: bx, y: by - 6, width: 30, height: 20, fill: col, stroke: '#fff', 'stroke-width': 1 }, g);
          el('text', { x: bx + 15, y: by + 9, 'text-anchor': 'middle', fill: scn.prepFlag === 'Siyah' ? '#fff' : '#fff', 'font-size': 13, 'font-weight': 700 }, g).textContent = scn.prepFlag === 'Siyah' ? '■' : scn.prepFlag;
        }
        el('text', { x: bx + 36, y: by + 8, fill: '#ffd166', 'font-size': 11, 'paint-order': 'stroke', stroke: 'rgba(0,0,0,.6)', 'stroke-width': 3 }, g).textContent = up ? `Hazırlık bayrağı: ${scn.prepFlag}` : 'Bayrak indi: son 1 dk';
      }
    }
  }

  function render(opts = {}) {
    const scn = state.scn; if (!scn) return;
    if (camOn()) camView(!state.playing || opts.snap, opts.dt);
    // yakın görünümde sahne küçük ölçekle sığdıysa tekne etiketleri ve notlar biraz büyür (okunabilsin)
    const upp = state.vb.w / ($('course').clientWidth || state.vb.w);
    state.ls = camOn() ? Math.max(1, Math.min(1.45, upp * 0.9)) : 1;
    $('course').style.setProperty('--ls', state.ls.toFixed(3));
    const w = E.windAt(scn.wind, state.t);
    if (cbNode) cbNode.setAttribute('transform', E.committeeBoatTransform(scn.line.boat.x, scn.line.boat.y, w));
    drawWind(w); drawOverlays(w);
    const bl = $('boatLayer'); bl.innerHTML = '';
    frameNotes = [...state.rungNotes];
    for (const b of [...state.boats, ...state.extras]) drawBoat(bl, b, E.sampleTrack(b.track, state.t), w);
    drawNotes(el('g', {}, bl));
    drawHud(w);
    const sc = $('scrub'); sc.value = state.t; sc.style.setProperty('--p', (state.t / scn.duration * 100) + '%');
    $('timeLabel').innerHTML = `${fmtClock(state.t)}<span class="tot"> / ${fmtClock(scn.duration)}</span>`;
    [...$('ticks').children].forEach((b, k) => b.classList.toggle('done', scn.steps[k].t <= state.t + 1e-6));
    if (state.follow) showStep(stepAt(state.t), true);
  }

  // ---------- Zaman döngüsü ----------
  // Döngü hiçbir hatada durmaz (tek bir çizim hatası zinciri koparıp sayfayı donuk bırakmasın); hata konsola yazılır.
  let tickErr = 0;
  function tick(ts) {
    try {
      if (state.playing) {
        const dt = Math.min(0.1, (ts - state.lastTs) / 1000);
        state.t += dt * state.speed;
        if (state.t >= state.scn.duration) { state.t = state.scn.duration; state.playing = false; updatePlayButton(); }
        render({ dt });
      }
    } catch (e) {
      if (Date.now() - tickErr > 15000) { tickErr = Date.now(); console.error('[senaryo] kare hatası', e);
        if (window.SailTrack) try { SailTrack.log('error', { where: 'app.tick', msg: String(e && e.message || e).slice(0, 120) }); } catch (e2) { /* yok */ } }
    }
    state.lastTs = ts; requestAnimationFrame(tick);
  }
  function updatePlayButton() {
    const b = $('btnPlay'); b.querySelector('use').setAttribute('href', state.playing ? '#i-pause' : '#i-play');
    b.setAttribute('aria-label', state.playing ? 'Duraklat' : 'Oynat');
  }
  function togglePlay() { if (state.t >= state.scn.duration) state.t = 0; state.playing = !state.playing; if (state.playing) setFollow(true); updatePlayButton(); }

  // ---------- Olaylar ----------
  $('btnPlay').onclick = togglePlay;
  $('btnReset').onclick = () => { state.t = 0; state.playing = false; updatePlayButton(); setFollow(true); render(); };
  // hız: masaüstünde üç düğme; telefonda yalnız seçili görünür, dokununca sıradakine geçer
  $('speedSeg').onclick = e => {
    const btn = e.target.closest('button'); if (!btn) return;
    const all = [...$('speedSeg').children];
    const next = phoneMq.matches && btn.classList.contains('on') ? all[(all.indexOf(btn) + 1) % all.length] : btn;
    all.forEach(x => x.classList.toggle('on', x === next)); state.speed = +next.dataset.v;
  };
  $('scrub').oninput = e => { state.t = +e.target.value; setFollow(true); render(); };
  $('btnAdd').onclick = addBoat; $('btnRemove').onclick = removeBoat;
  $('chkWind').onchange = e => { state.show.wind = e.target.checked; render(); };
  $('chkStartLay').onchange = e => { state.show.startLay = e.target.checked; render(); };
  $('chkRungs').onchange = e => { state.show.rungs = e.target.checked; render(); };
  $('chkLabels').onchange = e => { state.show.labels = e.target.checked; buildLegend(); render(); };
  $('chkShadows').onchange = e => { state.show.shadows = e.target.checked; render(); };
  $('chkTrails').onchange = e => { state.show.trails = e.target.checked; render(); };
  $('chkZoom').onchange = e => { state.zoom = e.target.checked; camCur = null; updateView(true); render({ snap: true }); };
  // tam ekran: iPad'de sistemin X düğmesi sol üste biner → üst çubukta yer aç
  const fsSync = () => document.documentElement.classList.toggle('is-fs', !!(document.fullscreenElement || document.webkitFullscreenElement));
  document.addEventListener('fullscreenchange', fsSync); document.addEventListener('webkitfullscreenchange', fsSync);
  // tam ekran: Katmanlar menüsünde anahtar (desteklemeyen tarayıcıda, ör. iPhone Safari, gizli)
  const fsOk = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
  if (!fsOk) $('rowFull').style.display = 'none';
  const fsSyncChk = () => { $('chkFull').checked = !!(document.fullscreenElement || document.webkitFullscreenElement); };
  document.addEventListener('fullscreenchange', fsSyncChk); document.addEventListener('webkitfullscreenchange', fsSyncChk);
  $('chkFull').onchange = e => {
    const de = document.documentElement;
    if (!e.target.checked) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else (de.requestFullscreen || de.webkitRequestFullscreen).call(de);
  };
  $('btnInfo').onclick = () => setInfoOpen(!state.infoOpen);
  $('btnInfoClose').onclick = () => setInfoOpen(false);
  // Kart normalde animasyonu izler. Önceki/Sonraki ile gezince izleme durur ve "Bu ana git" belirir;
  // ona basınca (ya da oynat / zaman çubuğu / başa al) animasyon o ana gider, kart yeniden izler.
  function setFollow(on) {
    state.follow = on; $('btnGoto').classList.toggle('hidden', on);
    if (on && state.scn) showStep(stepAt(state.t), false);
  }
  function browse(i) {
    if (!state.scn) return;
    state.follow = false; showStep(i, false);
    $('btnGoto').classList.toggle('hidden', stepAt(state.t) === state.stepIdx);
  }
  $('btnPrev').onclick = () => browse(state.stepIdx - 1);
  $('btnNext').onclick = () => browse(state.stepIdx + 1);
  $('btnGoto').onclick = () => { state.t = state.scn.steps[state.stepIdx].t; state.playing = false; updatePlayButton(); setFollow(true); render(); };
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { openPicker(false); if (window.SailAccess && SailAccess.closeMenu) SailAccess.closeMenu(); return; }
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    else if (e.code === 'ArrowRight') browse(state.stepIdx + 1);
    else if (e.code === 'ArrowLeft') browse(state.stepIdx - 1);
    else if (e.key === 'i' || e.key === 'ı') setInfoOpen(!state.infoOpen);
  });
  document.addEventListener('click', e => {
    if (phoneMq.matches && !e.target.closest('#addMenu') && !e.target.closest('#btnAddMenu')) $('addMenu').classList.add('hidden');
  });
  window.addEventListener('resize', () => setInfoOpen(state.infoOpen));   // görünüm + marka konumu yeniden

  // ---------- Senaryo seçici (kategori sekmeleri + kartlar) ----------
  const CATS = ['Taktik', 'İleri Taktik', 'Kurallar', 'Teknik'];
  let pickerCat = 'Taktik';
  let query = '';
  function openPicker(open) {
    $('picker').classList.toggle('hidden', !open);
    if (!open && window.SailThumbs) SailThumbs.reset();
    if (open) {
      pickerCat = state.scn ? state.scn.category : pickerCat; query = ''; $('pickerSearch').value = ''; buildPicker();
      if (!phoneMq.matches) setTimeout(() => $('pickerSearch').focus(), 50);
      const a = $('pickerList').querySelector('.card.active'); if (a) a.scrollIntoView({ block: 'nearest' });
    }
  }
  // erişim: misafire kapalı kategoriler (js/access.js → FEATURES)
  const lockedScn = x => x.category === 'İleri Taktik' && window.SailAccess && !SailAccess.can('scn.ileri');
  const norm = t => t.toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  function scenarioCard(x) {
    const [code, ttl] = splitTitle(x.title);
    const c = document.createElement('button'); c.className = 'card'; c.dataset.id = x.id;
    c.style.setProperty('--cat', CAT_COLORS[x.category] || 'var(--accent)');
    const active = state.scn && state.scn.id === x.id; c.classList.toggle('active', active);
    const locked = lockedScn(x); c.classList.toggle('locked', locked);
    // kare küçük resim (döngüde oynayan ön izleme) + altında kod ve başlık; özet yalnız ipucunda
    c.title = x.summary;
    const th = window.SailThumbs ? SailThumbs.make(x) : document.createElement('div');
    th.classList.add('thumb');
    th.insertAdjacentHTML('beforeend', `<span class="code-badge">${esc(code)}</span>` +
      (active ? '<span class="now">Açık</span>' : '') + (locked ? '<span class="lock">Kaydol</span>' : ''));
    c.appendChild(th);
    c.insertAdjacentHTML('beforeend', `<div class="ttl">${esc(ttl)}</div>`);
    c.onclick = () => {
      if (lockedScn(x)) { SailAccess.guard('scn.ileri'); return; }
      location.hash = x.id; openPicker(false);
    };
    return c;
  }
  function buildPicker() {
    if (window.SailThumbs) SailThumbs.reset();
    const tabs = $('pickerTabs'); tabs.innerHTML = '';
    for (const c of CATS) {
      const n = SCENARIOS.filter(x => x.category === c).length;
      const b = document.createElement('button'); b.setAttribute('role', 'tab'); b.style.setProperty('--cat', CAT_COLORS[c]);
      b.innerHTML = `${c}<span class="count">${n}</span>`;
      b.classList.toggle('active', !query && c === pickerCat); b.classList.toggle('empty', !n);
      b.onclick = () => { pickerCat = c; query = ''; $('pickerSearch').value = ''; buildPicker(); }; tabs.appendChild(b);
    }
    const list = $('pickerList'); list.innerHTML = '';
    const q = norm(query.trim());
    const items = q ? SCENARIOS.filter(x => norm([x.title, x.summary, x.topic || '', x.category].join(' ')).includes(q))
                    : SCENARIOS.filter(x => x.category === pickerCat);
    if (!items.length) {
      const d = document.createElement('div'); d.className = 'picker-empty';
      d.textContent = q ? `"${query}" için sonuç yok.` : 'Bu bölümün animasyonları hazırlanıyor.';
      list.appendChild(d); return;
    }
    const groups = [];
    for (const x of items) { const k = q ? x.category : (x.topic || 'Genel'); if (!groups.includes(k)) groups.push(k); }
    for (const gname of groups) {
      const h = document.createElement('div'); h.className = 'picker-topic'; h.textContent = gname; list.appendChild(h);
      const grid = document.createElement('div'); grid.className = 'picker-grid'; list.appendChild(grid);
      for (const x of items.filter(i => (q ? i.category : (i.topic || 'Genel')) === gname)) grid.appendChild(scenarioCard(x));
    }
  }
  $('pickerSearch').addEventListener('input', e => { query = e.target.value; buildPicker(); });
  $('btnScenarios').onclick = () => openPicker(true);
  $('btnPickerClose').onclick = () => openPicker(false);
  $('picker').addEventListener('click', e => { if (e.target === $('picker')) openPicker(false); });

  // ---------- Tekne ekle denetimlerinin yeri: telefonda popover, geniş ekranda alt çubuk ----------
  function placeAddControls() {
    const menu = $('addMenu'), row = $('addRow');
    const nodes = ['selSide', 'selTack', 'btnAdd', 'btnRemove'].map($);
    if (phoneMq.matches) {
      const rows = menu.querySelectorAll('.row'); if (!rows.length) return;
      rows[0].append(nodes[0], nodes[1]); rows[1].append(nodes[2], nodes[3]);
    } else {
      if (!row.querySelector('.lbl')) { const l = document.createElement('span'); l.className = 'lbl'; l.textContent = 'Tekne ekle'; row.appendChild(l); }
      row.append(...nodes); menu.classList.add('hidden');
    }
  }
  phoneMq.addEventListener('change', placeAddControls);
  placeAddControls();
  // Tekne ekle/çıkar şimdilik kapalı (karar: NOTLAR.md); kalabalık senaryo tanımından gelir
  ['addRow', 'addMenu', 'btnAddMenu'].forEach(id => $(id).style.display = 'none');
  $('btnAddMenu').onclick = () => $('addMenu').classList.toggle('hidden');
  // telefonda alttan çekmece: tutamağa ya da başlığa dokun → daralt/genişlet; aşağı/yukarı kaydır → aynısı
  function setCollapsed(c) { $('infoCard').classList.toggle('collapsed', c); setInfoOpen(state.infoOpen); }
  $('btnCollapse').onclick = () => setCollapsed(!$('infoCard').classList.contains('collapsed'));
  $('infoCard').addEventListener('click', e => { if (phoneMq.matches && e.target.closest('.step-meta, .step-title')) setCollapsed(!$('infoCard').classList.contains('collapsed')); });
  let swipeY = null;
  $('infoHead').addEventListener('touchstart', e => { swipeY = e.touches[0].clientY; }, { passive: true });
  $('infoHead').addEventListener('touchend', e => {
    if (swipeY == null || !phoneMq.matches) return;
    const dy = e.changedTouches[0].clientY - swipeY; swipeY = null;
    if (dy > 30) setCollapsed(true); else if (dy < -30) setCollapsed(false);
  }, { passive: true });
  $('chkZoom').checked = camOn();
  phoneMq.addEventListener('change', () => { if (state.zoom == null) $('chkZoom').checked = camOn(); });

  const fromHash = () => {
    const s = SCENARIOS.find(s => s.id === location.hash.slice(1)) || SCENARIOS[0];
    if (lockedScn(s)) { SailAccess.guard('scn.ileri'); return state.scn || SCENARIOS.find(x => !lockedScn(x)); }
    return s;
  };
  window.addEventListener('hashchange', () => { const s = fromHash(); if (s !== state.scn) loadScenario(s); });
  // giriş/kayıt sonrası kilitler değişir: seçici açıksa yenile, adresteki kilitli senaryoyu aç
  document.addEventListener('sail-access', () => {
    if (!$('picker').classList.contains('hidden')) buildPicker();
    const s = SCENARIOS.find(s => s.id === location.hash.slice(1));
    if (s && s !== state.scn && !lockedScn(s)) loadScenario(s);
  });
  const ds = document.body.dataset;
  $('versionLabel').textContent = ds.version ? `Sürüm ${ds.ver || ds.version} · ${ds.version} · ${ds.built}` : 'Geliştirme sürümü';
  // Bildirim gönder (report.js): hangi senaryo, hangi an
  if (window.SailReport) SailReport.source('senaryo', () => ({
    ozet: `senaryo ${state.scn ? state.scn.id : '-'} · ${state.t.toFixed(1)} / ${state.scn ? state.scn.duration : '-'} sn · ${state.playing ? 'oynuyor' : 'duruyor'} · hız ${state.speed}×`,
    id: state.scn && state.scn.id, t: state.t, playing: state.playing, speed: state.speed, follow: state.follow, stepIdx: state.stepIdx,
    infoOpen: state.infoOpen, show: { ...state.show }, extras: state.extras.length, zoom: state.zoom
  }));
  fitViewBox(); loadScenario(fromHash()); setInfoOpen(true);
  requestAnimationFrame(ts => { state.lastTs = ts; requestAnimationFrame(tick); });
})();
