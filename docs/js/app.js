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

  const state = {
    scn: null, boats: [], extras: [], t: 0, playing: false, speed: 1, lastTs: 0,
    show: { wind: true, rungs: true, labels: true, trails: false },
    vb: { x: 0, y: 0, w: COURSE.w, h: COURSE.h },      // ekranı dolduran görünüm alanı
    follow: true, stepIdx: 0, infoOpen: true
  };

  // ---------- Görünüm alanı: sahne oranına göre su alanını genişlet ----------
  function fitViewBox() {
    const svg = $('course');
    const W = svg.clientWidth || 1, H = svg.clientHeight || 1;
    const aspect = W / H, ca = COURSE.w / COURSE.h;
    let w = COURSE.w, h = COURSE.h;
    if (aspect > ca) w = COURSE.h * aspect; else h = COURSE.w / aspect;
    state.vb = { x: -(w - COURSE.w) / 2, y: -(h - COURSE.h) / 2, w, h };
    svg.setAttribute('viewBox', `${state.vb.x} ${state.vb.y} ${w} ${h}`);
  }

  // ---------- Senaryo yükleme ----------
  function loadScenario(scn) {
    state.scn = scn; state.t = 0; state.playing = false; state.extras = []; state.stepIdx = 0;
    state.boats = scn.boats.map(b => ({ ...b, track: E.buildTrack(scn, b.start, b.segs, { v0: b.v0, t0: b.t0 }) }));
    $('scrub').max = scn.duration;
    $('scnTitle').textContent = scn.title;
    $('scnSummary').textContent = scn.summary;
    $('selScenario').value = scn.id;
    buildLegend(); buildSideOptions(); drawCourse(); updatePlayButton();
    showStep(0, false); render();
  }
  function buildLegend() {
    const c = $('legend'); c.innerHTML = '';
    for (const b of [...state.boats, ...state.extras]) {
      const s = document.createElement('span'); s.style.setProperty('--c', b.color); s.textContent = b.name; c.appendChild(s);
    }
  }
  function buildSideOptions() {
    const sel = $('selSide'); sel.innerHTML = '';
    const lab = state.scn.addBoatLabels || (state.scn.line
      ? { pin: 'Orsa şamandırası ucu', middle: 'Orta', committee: 'Hakem botu ucu' }
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
    $('stepIdx').textContent = `Adım ${i + 1}/${steps.length}`;
    $('stepTime').textContent = `t = ${s.t.toFixed(1)} s`;
    $('stepTitle').textContent = s.title; $('stepText').textContent = s.text;
    $('btnPrev').disabled = i === 0; $('btnNext').disabled = i === steps.length - 1;
    if (flash && changed) { const c = $('infoCard'); c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash'); }
  }
  function setInfoOpen(open) { state.infoOpen = open; $('infoCard').classList.toggle('hidden', !open); $('btnInfo').classList.toggle('on', open); }

  // ---------- Ek tekne (kullanıcı ekler): basit kurallı simülasyon ----------
  function buildAutoTrack(scn, pos, tack, others) {
    const DT = 0.05, base = scn.baseSpeed || 55, TAU = 1.5;
    let x = pos.x, y = pos.y, t = 0, v = 0;
    let h = E.tackHeading(E.windAt(scn.wind, 0), tack);
    const samples = [{ t: 0, x, y, h }];
    const goAt = scn.startAt ? Math.max(0, scn.startAt - 4.5) : 0;
    let avoidUntil = -1;
    while (t < scn.duration) {
      const w = E.windAt(scn.wind, t);
      let target = E.tackHeading(w, tack), vt;
      if (t < goAt) { target = w + (tack === 'starboard' ? -20 : 20); vt = base * 0.1; }
      else {
        if ((scn.autoRules || []).includes('r10') && tack === 'port') {
          const f = E.fwd(h);
          for (const o of others) {
            const s = E.sampleTrack(o.track, t);
            if (E.sailState(s.h, w).tack !== 'starboard') continue;
            const dx = s.x - x, dy = s.y - y, d = Math.hypot(dx, dy);
            const ahead = (dx * f.x + dy * f.y) / (d || 1);
            if (d < 110 && ahead > 0.2) { avoidUntil = t + 2.0; break; }
          }
          if (t < avoidUntil) target = E.tackHeading(w, tack) + 50;
        }
        vt = E.speedFor(Math.abs(E.norm180(h - w)), base);
      }
      h = E.lerpAngle(h, target, Math.min(1, DT / 0.6));
      v += (vt - v) * Math.min(1, DT / TAU);
      const f = E.fwd(h); x += f.x * v * DT; y += f.y * v * DT; t += DT;
      samples.push({ t, x, y, h });
    }
    return samples;
  }
  function addBoat() {
    const scn = state.scn; if (!scn.addBoat) return;
    const side = $('selSide').value, tack = $('selTack').value;
    const pos = scn.addBoat[side]; const n = state.extras.length;
    const jitter = { x: pos.x + (n % 3 - 1) * 22, y: pos.y + Math.floor(n / 3) * 40 };
    const boat = { id: 'X' + (n + 1), name: `Tekne ${n + 1} (${tack === 'starboard' ? 'sancak' : 'iskele'})`,
      color: EXTRA_COLORS[n % EXTRA_COLORS.length], track: buildAutoTrack(scn, jitter, tack, [...state.boats, ...state.extras]), extra: true };
    state.extras.push(boat); buildLegend(); render();
  }
  function removeBoat() { state.extras.pop(); buildLegend(); render(); }

  // ---------- Sabit parkur ----------
  function drawCourse() {
    const g = $('courseLayer'); g.innerHTML = '';
    const scn = state.scn;
    if (scn.line) {
      const { pin, boat } = scn.line;
      el('line', { x1: pin.x, y1: pin.y, x2: boat.x, y2: boat.y, stroke: '#ffd166', 'stroke-width': 2, 'stroke-dasharray': '10 8', opacity: .9 }, g);
      el('circle', { cx: pin.x, cy: pin.y, r: 7, fill: '#ff8c42', stroke: '#fff', 'stroke-width': 1.5 }, g);
      el('text', { x: pin.x, y: pin.y + 24, 'text-anchor': 'middle', fill: '#ffd166', 'font-size': 12 }, g).textContent = 'Orsa şamandırası (pin)';
      const cb = el('g', { transform: `translate(${boat.x},${boat.y})` }, g);
      el('path', { d: 'M-12,-30 C 2,-26 12,-12 12,0 L 12,28 L -12,28 Z', fill: '#e9ecef', stroke: '#6c757d', 'stroke-width': 1.5 }, cb);
      el('rect', { x: -7, y: -4, width: 14, height: 18, fill: '#adb5bd' }, cb);
      el('line', { x1: 0, y1: -30, x2: 0, y2: -52, stroke: '#fff', 'stroke-width': 2 }, cb);
      el('path', { d: 'M0,-52 L 16,-46 L 0,-40 Z', fill: '#ff8c42' }, cb);
      el('text', { x: boat.x, y: boat.y + 44, 'text-anchor': 'middle', fill: '#ffd166', 'font-size': 12 }, g).textContent = 'Hakem botu';
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
    const L = 27, my = -6;
    let tipX, tipY, ctrlX, ctrlY;
    if (sail.luffing) {
      const fl = Math.sin(state.t * 18) * 6;
      tipX = fl * 0.6; tipY = my + L; ctrlX = fl * 1.5; ctrlY = my + L * 0.5;
    } else {
      const a = sail.boom * E.DEG;
      tipX = sail.side * Math.sin(a) * L; tipY = my + Math.cos(a) * L;
      ctrlX = tipX * 0.5 + sail.side * 9; ctrlY = my + (tipY - my) * 0.5;
    }
    el('path', { d: `M0,${my} Q${ctrlX.toFixed(1)},${ctrlY.toFixed(1)} ${tipX.toFixed(1)},${tipY.toFixed(1)} L0,${my} Z`,
      fill: 'rgba(255,255,255,0.85)', stroke: '#fff', 'stroke-width': 1 }, g);
    el('line', { x1: 0, y1: my, x2: tipX.toFixed(1), y2: tipY.toFixed(1), stroke: '#222', 'stroke-width': 1.5 }, g);
    el('circle', { cx: 0, cy: my, r: 1.8, fill: '#222' }, g);
    if (state.show.labels) {
      const lbl = el('text', { x: s.x.toFixed(1), y: (s.y + 40).toFixed(1), 'text-anchor': 'middle', fill: '#fff', 'font-size': 12, 'font-weight': 600,
        'paint-order': 'stroke', stroke: 'rgba(0,0,0,.6)', 'stroke-width': 3 }, parent);
      lbl.textContent = `${b.id} · ${sail.tack === 'starboard' ? 'sancak' : 'iskele'}`;
    }
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
    if (state.show.rungs && scn.rungs && state.t >= scn.rungs.from) {
      const b = state.boats.find(x => x.id === scn.rungs.boat);
      const s = E.sampleTrack(b.track, state.t);
      const p = E.fwd(w + 90);
      el('line', { x1: s.x - p.x * 1500, y1: s.y - p.y * 1500, x2: s.x + p.x * 1500, y2: s.y + p.y * 1500,
        stroke: b.color, 'stroke-width': 1.5, 'stroke-dasharray': '8 6', opacity: .8 }, g);
      for (const o of [...state.boats, ...state.extras]) {
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
    const cx = vb.x + 70, cy = vb.y + 70;                       // rüzgar oku sol üst
    el('circle', { cx, cy, r: 42, fill: 'rgba(0,0,0,0.35)', stroke: 'rgba(255,255,255,0.3)' }, g);
    const d = E.fwd(w + 180);
    el('line', { x1: cx - d.x * 30, y1: cy - d.y * 30, x2: cx + d.x * 22, y2: cy + d.y * 22, stroke: '#fff', 'stroke-width': 3, 'marker-end': 'url(#arrowHead)' }, g);
    el('text', { x: cx, y: cy + 60, 'text-anchor': 'middle', fill: '#fff', 'font-size': 12 }, g).textContent = `Rüzgar ${Math.round(E.norm360(w))}°`;
    if (scn.startAt != null && scn.startAt > 0) {
      const rem = scn.startAt - state.t;
      const txt = el('text', { x: cx + 60, y: cy + 10, fill: rem > 0 ? '#ffd166' : '#2a9d8f', 'font-size': 26, 'font-weight': 700, 'font-variant-numeric': 'tabular-nums' }, g);
      txt.textContent = rem > 0 ? `Start'a ${rem.toFixed(1)} s` : 'START ✔';
    }
    el('text', { x: vb.x + 16, y: vb.y + vb.h - 12, fill: 'rgba(255,255,255,0.45)', 'font-size': 12 }, g).textContent = scn.category + ' · ' + scn.title;
  }

  function render() {
    const scn = state.scn; if (!scn) return;
    const w = E.windAt(scn.wind, state.t);
    drawWind(w); drawOverlays(w);
    const bl = $('boatLayer'); bl.innerHTML = '';
    for (const b of [...state.boats, ...state.extras]) drawBoat(bl, b, E.sampleTrack(b.track, state.t), w);
    drawHud(w);
    $('scrub').value = state.t; $('timeLabel').textContent = `${state.t.toFixed(1)} / ${scn.duration} s`;
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
  function updatePlayButton() { $('btnPlay').textContent = state.playing ? '❚❚ Duraklat' : '▶ Oynat'; }
  function togglePlay() { if (state.t >= state.scn.duration) state.t = 0; state.playing = !state.playing; updatePlayButton(); }

  // ---------- Olaylar ----------
  $('btnPlay').onclick = togglePlay;
  $('btnReset').onclick = () => { state.t = 0; state.playing = false; updatePlayButton(); render(); if (!state.follow) showStep(0, false); };
  $('selSpeed').onchange = e => state.speed = +e.target.value;
  $('scrub').oninput = e => { state.t = +e.target.value; render(); };
  $('btnAdd').onclick = addBoat; $('btnRemove').onclick = removeBoat;
  $('chkWind').onchange = e => { state.show.wind = e.target.checked; render(); };
  $('chkRungs').onchange = e => { state.show.rungs = e.target.checked; render(); };
  $('chkLabels').onchange = e => { state.show.labels = e.target.checked; render(); };
  $('chkTrails').onchange = e => { state.show.trails = e.target.checked; render(); };
  $('btnLayers').onclick = () => $('layersMenu').classList.toggle('hidden');
  $('btnFull').onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); };
  $('btnInfo').onclick = () => setInfoOpen(!state.infoOpen);
  $('btnInfoClose').onclick = () => setInfoOpen(false);
  $('chkFollow').onchange = e => { state.follow = e.target.checked; if (state.follow) showStep(stepAt(state.t), true); };
  // Önceki/Sonraki: kullanıcı kendi gezerse canlı takip kapanır, "Bu ana git" ile animasyon o adıma gider
  const browse = i => { state.follow = false; $('chkFollow').checked = false; showStep(i, false); };
  $('btnPrev').onclick = () => browse(state.stepIdx - 1);
  $('btnNext').onclick = () => browse(state.stepIdx + 1);
  $('btnGoto').onclick = () => { state.t = state.scn.steps[state.stepIdx].t; state.playing = false; updatePlayButton(); render(); };
  document.addEventListener('keydown', e => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    else if (e.code === 'ArrowRight') browse(state.stepIdx + 1);
    else if (e.code === 'ArrowLeft') browse(state.stepIdx - 1);
    else if (e.key === 'i' || e.key === 'ı') setInfoOpen(!state.infoOpen);
  });
  document.addEventListener('click', e => { if (!e.target.closest('#layersMenu') && !e.target.closest('#btnLayers')) $('layersMenu').classList.add('hidden'); });
  window.addEventListener('resize', () => { fitViewBox(); render(); });

  // ---------- Senaryo seçici ----------
  (function buildSelect() {
    const sel = $('selScenario'); const cats = [];
    for (const s of SCENARIOS) if (!cats.includes(s.category)) cats.push(s.category);
    for (const c of cats) {
      const og = document.createElement('optgroup'); og.label = c;
      for (const s of SCENARIOS.filter(x => x.category === c)) { const o = document.createElement('option'); o.value = s.id; o.textContent = s.title; og.appendChild(o); }
      sel.appendChild(og);
    }
    sel.onchange = () => { location.hash = sel.value; };
  })();

  const fromHash = () => SCENARIOS.find(s => s.id === location.hash.slice(1)) || SCENARIOS[0];
  window.addEventListener('hashchange', () => { const s = fromHash(); if (s !== state.scn) loadScenario(s); });
  fitViewBox(); setInfoOpen(true); loadScenario(fromHash());
  requestAnimationFrame(ts => { state.lastTs = ts; requestAnimationFrame(tick); });
})();
