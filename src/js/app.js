/* Arayüz: tam ekran sahne, senaryo seçimi, zaman çizelgesi, bilgi kartı, tekne ekleme/çıkarma */
(function () {
  const E = SailEngine;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const $ = id => document.getElementById(id);
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
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
    show: { wind: true, rungs: true, labels: true, trails: false, shadows: true },
    vb: { x: 0, y: 0, w: COURSE.w, h: COURSE.h },      // ekranı dolduran görünüm alanı
    follow: true, stepIdx: 0, infoOpen: true
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
    $('scrub').max = scn.duration;
    $('scnTitle').textContent = scn.title;
    $('scnSummary').textContent = scn.summary;
    const [code, ttl] = splitTitle(scn.title);
    $('curCode').textContent = code; $('curTitle').textContent = ttl;
    $('curCat').textContent = scn.category + (scn.topic ? ' · ' + scn.topic : '');
    $('btnScenarios').style.setProperty('--cat', CAT_COLORS[scn.category] || 'var(--accent)');
    document.title = `${scn.title} · Professional Sailing`;
    document.querySelectorAll('.card').forEach(c => c.classList.toggle('active', c.dataset.id === scn.id));
    buildLegend(); buildTimeline(); buildSideOptions(); drawCourse(); updatePlayButton();
    showStep(0, false); render();
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
      row.innerHTML = `<span class="boat-id">1–${crowd}</span><span class="boat-name">Filo: kurallara göre hareket eden ${crowd} tekne</span>`;
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
      t.onclick = () => { state.t = st.t; state.playing = false; updatePlayButton(); if (!state.follow) showStep(i, false); render(); };
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
    $('stepTime').textContent = `${s.t.toFixed(1)} sn`;
    [...$('stepBar').children].forEach((b, k) => { b.classList.toggle('cur', k === i); b.classList.toggle('done', k < i); });
    $('stepTitle').textContent = s.title; $('stepText').textContent = s.text;
    $('btnPrev').disabled = i === 0; $('btnNext').disabled = i === steps.length - 1;
    if (flash && changed) { const c = $('infoCard'); c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash'); }
  }
  function setInfoOpen(open) {
    state.infoOpen = open; $('infoCard').classList.toggle('hidden', !open); $('btnInfo').classList.toggle('on', open);
    fitViewBox(); if (state.scn) render();
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
      const cbRight = scn.committeeLabel === 'right';
      el('text', { x: boat.x + (cbRight ? 22 : 0), y: boat.y + (cbRight ? 52 : 70), 'text-anchor': cbRight ? 'start' : 'middle', fill: '#ffd166', 'font-size': 12, 'paint-order': 'stroke', stroke: 'rgba(0,0,0,.45)', 'stroke-width': 3 }, g).textContent = 'Hakem botu';
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
    const placed = [], H = 22, pad = 10;
    const boats = [...state.boats, ...state.extras].map(b => E.sampleTrack(b.track, state.t));
    // engeller: tekne gövdeleri, tekne etiketleri, hakem botu (+ yazısı), pin, şamandıralar
    const obst = [];
    for (const p of boats) { obst.push({ x: p.x - 16, y: p.y - 26, w: 32, h: 52 }); if (state.show.labels) obst.push({ x: p.x - 28, y: p.y + 26, w: 56, h: 20 }); }
    const scn = state.scn;
    if (scn.line) { const { pin, boat: cb } = scn.line; obst.push({ x: cb.x - 40, y: cb.y - 54, w: 80, h: 130 }, { x: pin.x - 16, y: pin.y - 10, w: 32, h: 40 }); }
    for (const m of scn.marks || []) obst.push({ x: m.x - 12, y: m.y - 28, w: 24, h: 38 });
    const ov = (r, q, m) => r.x < q.x + q.w + m && q.x < r.x + r.w + m && r.y < q.y + q.h + m && q.y < r.y + r.h + m;
    const hit = (r) => placed.some(q => ov(r, q, 4)) || obst.some(q => ov(r, q, 0));
    // önce teknesi üstte olanlar yerleşsin (yukarı kaydırma tutarlı olsun)
    for (const n of [...frameNotes].sort((a, b) => a.y - b.y)) {
      const fault = /^HATA/.test(n.text), col = n.kind === 'shadow' ? '#c4b5fd' : fault ? '#f87171' : '#fbbf24';
      const w = Math.ceil(textW(n.text, 12, 700)) + pad * 2;
      const offs = [-50, -74, -98, -122, 52, 76];
      let r = null, off = offs[0];
      for (const o of offs) { const c = { x: n.x - w / 2, y: n.y + o, w, h: H }; if (!hit(c)) { r = c; off = o; break; } }
      if (!r) r = { x: n.x - w / 2, y: n.y + offs[0], w, h: H };
      placed.push(r);
      const g = el('g', {}, parent);
      if (off !== offs[0]) {                                   // kaydırıldıysa tekneye ince bağlantı
        const ey = off < 0 ? r.y + H : r.y;
        el('line', { x1: n.x, y1: n.y + (off < 0 ? -22 : 22), x2: n.x, y2: ey, stroke: col, 'stroke-width': 1, opacity: .6 }, g);
      }
      el('rect', { x: r.x, y: r.y, width: w, height: H, rx: 11, fill: 'rgba(7,18,30,.86)', stroke: col, 'stroke-width': 1.2 }, g);
      el('text', { x: n.x, y: r.y + H / 2 + 4.2, 'text-anchor': 'middle', fill: col, 'font-size': 12, 'font-weight': 700 }, g).textContent = n.text;
    }
  }

  // Etiket: tekne altında küçük rozet. [rol simgesi] KİMLİK | S/İ (kontra). Kenar rengi rolü gösterir.
  function drawLabel(parent, b, s, sail) {
    const x = s.x, y = s.y + 36;
    if (b.crowd) {
      el('text', { x: x.toFixed(1), y: y.toFixed(1), 'text-anchor': 'middle', fill: 'rgba(255,255,255,.75)', 'font-size': 10,
        'paint-order': 'stroke', stroke: 'rgba(0,0,0,.55)', 'stroke-width': 3 }, parent).textContent = b.id;
      return;
    }
    const r = ROLES[b.role], tack = sail.tack === 'starboard' ? 'S' : 'İ';
    const idW = Math.ceil(textW(b.id, 12, 700)), gW = r ? 15 : 0, w = 8 + gW + idW + 5 + 14 + 3, h = 20;
    const g = el('g', { transform: `translate(${(x - w / 2).toFixed(1)},${(y - h / 2).toFixed(1)})` }, parent);
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
    const scn = state.scn;
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
        if (Math.abs(gain) > 0.3) {
          const txt = el('text', { x: so.x, y: so.y + 54, 'text-anchor': 'middle', fill: o.color, 'font-size': 12, 'paint-order': 'stroke', stroke: 'rgba(0,0,0,.6)', 'stroke-width': 3 }, g);
          txt.textContent = `${gain > 0 ? '+' : ''}${gain.toFixed(1)} tekne boyu`;
        }
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

  function drawHud(w) {
    const g = $('hudLayer'); g.innerHTML = '';
    const scn = state.scn, vb = state.vb;
    // sol üst gösterge (pusula + sayaç): ekranda hep aynı boyda görünsün diye ölçeklenir
    const svg = $('course'), upp = vb.w / (svg.clientWidth || vb.w);       // ekran pikseli başına SVG birimi
    const k = Math.max(0.8, Math.min(1.6, upp * 0.95));
    const hg = el('g', { transform: `translate(${vb.x.toFixed(1)},${vb.y.toFixed(1)}) scale(${k.toFixed(3)})` }, g);
    const cx = 64, cy = 64;
    el('circle', { cx, cy, r: 44, fill: 'rgba(7,18,30,0.72)', stroke: 'rgba(255,255,255,0.18)', 'stroke-width': 1 }, hg);
    for (let a = 0; a < 360; a += 30) {                           // pusula çentikleri
      const f = E.fwd(a), r1 = a % 90 ? 39 : 35;
      el('line', { x1: cx + f.x * r1, y1: cy + f.y * r1, x2: cx + f.x * 42, y2: cy + f.y * 42, stroke: 'rgba(255,255,255,.35)', 'stroke-width': a % 90 ? 1 : 1.5 }, hg);
    }
    const d = E.fwd(w + 180);
    el('line', { x1: cx - d.x * 28, y1: cy - d.y * 28, x2: cx + d.x * 20, y2: cy + d.y * 20, stroke: '#7dd3fc', 'stroke-width': 3.5, 'stroke-linecap': 'round', 'marker-end': 'url(#arrowHead)' }, hg);
    el('rect', { x: cx - 38, y: cy + 52, width: 76, height: 20, rx: 10, fill: 'rgba(7,18,30,0.72)' }, hg);
    el('text', { x: cx, y: cy + 66, 'text-anchor': 'middle', fill: '#fff', 'font-size': 11, 'font-weight': 600 }, hg).textContent = `Rüzgar ${Math.round(E.norm360(w))}°`;
    if (scn.startAt != null && scn.startAt > 0) {
      const rem = (scn.startAt - state.t) * (scn.clockScale || 1);
      const fmt = r => scn.clockScale ? fmtClock(r) : `${r.toFixed(1)} sn`;
      const on = rem > 0, col = on ? (rem <= 5 * (scn.clockScale || 1) ? '#f87171' : '#fbbf24') : '#34d399';
      const big = on ? fmt(rem) : '✔ Yarış başladı', small = on ? "START'A" : 'START VERİLDİ';
      const minBig = on ? textW(fmt(scn.startAt * (scn.clockScale || 1)), 22, 800) : 0;   // geri sayarken kutu daralıp genişlemesin
      const px = cx + 58, py = cy - 26, ph = 52;
      const pw = Math.ceil(Math.max(textW(big, 22, 800), minBig, textW(small, 10, 700, 1), on ? 104 : 0)) + 30;
      el('rect', { x: px, y: py, width: pw, height: ph, rx: 14, fill: 'rgba(7,18,30,0.78)', stroke: col, 'stroke-opacity': .55, 'stroke-width': 1.5 }, hg);
      el('text', { x: px + 14, y: py + 17, fill: 'rgba(255,255,255,.6)', 'font-size': 10, 'font-weight': 700, 'letter-spacing': 1 }, hg).textContent = small;
      el('text', { x: px + 14, y: py + 42, fill: col, 'font-size': 22, 'font-weight': 800, 'font-variant-numeric': 'tabular-nums' }, hg).textContent = big;
      // hazırlık bayrağı: son 1 dakikada indirilir
      if (scn.prepFlag && scn.line) {
        const up = state.t < (scn.flagDownAt != null ? scn.flagDownAt : scn.startAt);
        const bx = scn.line.boat.x + 22, by = scn.line.boat.y - 40;
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

  function render() {
    const scn = state.scn; if (!scn) return;
    const w = E.windAt(scn.wind, state.t);
    if (cbNode) cbNode.setAttribute('transform', E.committeeBoatTransform(scn.line.boat.x, scn.line.boat.y, w));
    drawWind(w); drawOverlays(w);
    const bl = $('boatLayer'); bl.innerHTML = '';
    frameNotes = [];
    for (const b of [...state.boats, ...state.extras]) drawBoat(bl, b, E.sampleTrack(b.track, state.t), w);
    drawNotes(el('g', {}, bl));
    drawHud(w);
    const sc = $('scrub'); sc.value = state.t; sc.style.setProperty('--p', (state.t / scn.duration * 100) + '%');
    $('timeLabel').innerHTML = `${fmtClock(state.t)}<span class="tot"> / ${fmtClock(scn.duration)}</span>`;
    [...$('ticks').children].forEach((b, k) => b.classList.toggle('done', scn.steps[k].t <= state.t + 1e-6));
    if (state.follow) showStep(stepAt(state.t), true);
  }

  // ---------- Zaman döngüsü ----------
  function tick(ts) {
    if (state.playing) {
      state.t += Math.min(0.1, (ts - state.lastTs) / 1000) * state.speed;
      if (state.t >= state.scn.duration) { state.t = state.scn.duration; state.playing = false; updatePlayButton(); }
      render();
    }
    state.lastTs = ts; requestAnimationFrame(tick);
  }
  function updatePlayButton() {
    const b = $('btnPlay'); b.querySelector('use').setAttribute('href', state.playing ? '#i-pause' : '#i-play');
    b.setAttribute('aria-label', state.playing ? 'Duraklat' : 'Oynat');
  }
  function togglePlay() { if (state.t >= state.scn.duration) state.t = 0; state.playing = !state.playing; updatePlayButton(); }

  // ---------- Olaylar ----------
  $('btnPlay').onclick = togglePlay;
  $('btnReset').onclick = () => { state.t = 0; state.playing = false; updatePlayButton(); render(); if (!state.follow) showStep(0, false); };
  // hız: masaüstünde üç düğme; telefonda yalnız seçili görünür, dokununca sıradakine geçer
  $('speedSeg').onclick = e => {
    const btn = e.target.closest('button'); if (!btn) return;
    const all = [...$('speedSeg').children];
    const next = phoneMq.matches && btn.classList.contains('on') ? all[(all.indexOf(btn) + 1) % all.length] : btn;
    all.forEach(x => x.classList.toggle('on', x === next)); state.speed = +next.dataset.v;
  };
  $('scrub').oninput = e => { state.t = +e.target.value; render(); };
  $('btnAdd').onclick = addBoat; $('btnRemove').onclick = removeBoat;
  $('chkWind').onchange = e => { state.show.wind = e.target.checked; render(); };
  $('chkRungs').onchange = e => { state.show.rungs = e.target.checked; render(); };
  $('chkLabels').onchange = e => { state.show.labels = e.target.checked; buildLegend(); render(); };
  $('chkShadows').onchange = e => { state.show.shadows = e.target.checked; render(); };
  $('chkTrails').onchange = e => { state.show.trails = e.target.checked; render(); };
  $('btnLayers').onclick = () => { const m = $('layersMenu'); m.classList.toggle('hidden'); $('btnLayers').classList.toggle('on', !m.classList.contains('hidden')); };
  // tam ekran: iPad'de sistemin X düğmesi sol üste biner → üst çubukta yer aç
  const fsSync = () => document.documentElement.classList.toggle('is-fs', !!(document.fullscreenElement || document.webkitFullscreenElement));
  document.addEventListener('fullscreenchange', fsSync); document.addEventListener('webkitfullscreenchange', fsSync);
  $('btnFull').onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); };
  $('btnInfo').onclick = () => setInfoOpen(!state.infoOpen);
  $('btnInfoClose').onclick = () => setInfoOpen(false);
  $('chkFollow').onchange = e => { state.follow = e.target.checked; if (state.follow) showStep(stepAt(state.t), true); };
  // Önceki/Sonraki: kullanıcı kendi gezerse canlı takip kapanır, "Bu ana git" ile animasyon o adıma gider
  function browse(i) { state.follow = false; $('chkFollow').checked = false; showStep(i, false); }
  $('btnPrev').onclick = () => browse(state.stepIdx - 1);
  $('btnNext').onclick = () => browse(state.stepIdx + 1);
  $('btnGoto').onclick = () => { state.t = state.scn.steps[state.stepIdx].t; state.playing = false; updatePlayButton(); render(); };
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { openPicker(false); $('layersMenu').classList.add('hidden'); return; }
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    else if (e.code === 'ArrowRight') browse(state.stepIdx + 1);
    else if (e.code === 'ArrowLeft') browse(state.stepIdx - 1);
    else if (e.key === 'i' || e.key === 'ı') setInfoOpen(!state.infoOpen);
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('#layersMenu') && !e.target.closest('#btnLayers')) { $('layersMenu').classList.add('hidden'); $('btnLayers').classList.remove('on'); }
    if (phoneMq.matches && !e.target.closest('#addMenu') && !e.target.closest('#btnAddMenu')) $('addMenu').classList.add('hidden');
  });
  window.addEventListener('resize', () => { fitViewBox(); render(); });

  // ---------- Senaryo seçici (kategori sekmeleri + kartlar) ----------
  const CATS = ['Taktik', 'İleri Taktik', 'Kurallar', 'Teknik'];
  let pickerCat = 'Taktik';
  let query = '';
  function openPicker(open) {
    $('picker').classList.toggle('hidden', !open);
    if (open) {
      pickerCat = state.scn ? state.scn.category : pickerCat; query = ''; $('pickerSearch').value = ''; buildPicker();
      if (!phoneMq.matches) setTimeout(() => $('pickerSearch').focus(), 50);
      const a = $('pickerList').querySelector('.card.active'); if (a) a.scrollIntoView({ block: 'nearest' });
    }
  }
  const norm = t => t.toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  function scenarioCard(x) {
    const [code, ttl] = splitTitle(x.title);
    const c = document.createElement('button'); c.className = 'card'; c.dataset.id = x.id;
    c.style.setProperty('--cat', CAT_COLORS[x.category] || 'var(--accent)');
    const active = state.scn && state.scn.id === x.id; c.classList.toggle('active', active);
    const nBoats = x.boats.length + (x.crowd || []).length;
    c.innerHTML = `<div class="card-top"><span class="code-badge">${esc(code)}</span>${active ? '<span class="now">● Açık</span>' : ''}</div>` +
      `<div class="ttl">${esc(ttl)}</div><div class="sum">${esc(x.summary)}</div>` +
      `<div class="meta"><span><svg><use href="#i-clock"/></svg>${Math.round(x.duration)} sn</span>` +
      `<span><svg><use href="#i-boat"/></svg>${nBoats} tekne</span><span><svg><use href="#i-steps"/></svg>${x.steps.length} adım</span></div>`;
    c.onclick = () => { location.hash = x.id; openPicker(false); };
    return c;
  }
  function buildPicker() {
    $('pickerSub').textContent = `${SCENARIOS.length} animasyon · konu seç ya da ara`;
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
  $('btnCollapse').onclick = () => $('infoCard').classList.toggle('collapsed');
  $('infoHead').addEventListener('click', e => { if (phoneMq.matches && e.target.closest('.info-title-wrap')) $('infoCard').classList.toggle('collapsed'); });

  const fromHash = () => SCENARIOS.find(s => s.id === location.hash.slice(1)) || SCENARIOS[0];
  window.addEventListener('hashchange', () => { const s = fromHash(); if (s !== state.scn) loadScenario(s); });
  const ds = document.body.dataset;
  $('versionLabel').textContent = ds.version ? `Sürüm ${ds.version} · ${ds.built}` : 'Geliştirme sürümü';
  fitViewBox(); setInfoOpen(true); loadScenario(fromHash());
  requestAnimationFrame(ts => { state.lastTs = ts; requestAnimationFrame(tick); });
})();
