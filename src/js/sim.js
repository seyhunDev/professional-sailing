/* Yarış simülatörü – arayüz: yerleştirme (sürükle), rüzgar / sağanak, start, geri sarma, sıralama */
(function () {
  const E = SailEngine, S = SailSim;
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
    sim: null, frames: [], speed: 1, lastTs: 0, acc: 0,
    sel: null, vb: { x: 0, y: 0, w: W.w, h: W.h }, drag: null, mineOnly: false, viewT: 0
  };

  // ---------- görünüm ----------
  function fitViewBox() {
    const svg = $('course'), Wd = svg.clientWidth || 1, Hd = svg.clientHeight || 1;
    // masaüstünde sağdaki panel parkurun üstüne binmesin: parkuru kalan alana sığdır
    const panelOpen = !$('panel').classList.contains('hidden') && !phoneMq.matches && Wd > 900;
    const padPx = panelOpen ? Math.min(400, $('panel').offsetWidth + 28) : 0, Wa = Math.max(200, Wd - padPx);
    const V = { x: 0, y: -50, w: W.w, h: W.h + 90 };    // gösterilecek alan (şamandıra üstü ve 2. sıra altı paylı)
    let w = V.w, h = V.h;
    if (Wa / Hd > V.w / V.h) w = V.h * Wa / Hd; else h = V.w * Hd / Wa;
    const k = w / Wa, wTot = Wd * k;                      // ekran pikseli başına birim
    const topShare = phoneMq.matches ? 0.12 : 0.5;          // telefonda parkur üstte, alt sayfa altta kalsın
    st.vb = { x: V.x - (w - V.w) / 2, y: V.y - (h - V.h) * topShare, w: wTot, h };
    w = wTot;
    svg.setAttribute('viewBox', `${st.vb.x} ${st.vb.y} ${w} ${h}`);
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
        boats: st.fleet.map(b => ({ ...b, h: st.wind + (b.tack === 'starboard' ? -25 : 25), v: 0 })), events: [] };
    }
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
      el('ellipse', { rx: gu.rx, ry: gu.ry, fill: 'none', stroke: 'rgba(125,211,252,.45)', 'stroke-width': 1.5, 'stroke-dasharray': '3 7' }, gg);
      // kedi pençesi (cat's paw) çizgileri: rüzgarla akar
      for (let k = 0; k < 9; k++) {
        const ax = ((k * 53) % (gu.rx * 1.2)) - gu.rx * 0.6, base = ((k * 97) % (gu.ry * 1.4)) - gu.ry * 0.7;
        const ay = ((base + v.t * 70 + gu.ry) % (gu.ry * 1.6)) - gu.ry * 0.8;
        el('path', { d: `M${ax - 9},${ay} q 4,-3 9,0 t 9,0`, fill: 'none', stroke: 'rgba(186,230,253,.35)', 'stroke-width': 1.4 }, gg);
      }
      const lab = el('g', { transform: `rotate(${-v.wind.toFixed(1)})` }, gg);
      el('text', { y: -gu.ry * 0.15, 'text-anchor': 'middle', fill: '#bae6fd', 'font-size': 14, 'font-weight': 700, 'paint-order': 'stroke', stroke: 'rgba(2,21,38,.8)', 'stroke-width': 4 }, lab).textContent = 'SAĞANAK';
      el('text', { y: -gu.ry * 0.15 + 17, 'text-anchor': 'middle', fill: '#7dd3fc', 'font-size': 12, 'paint-order': 'stroke', stroke: 'rgba(2,21,38,.8)', 'stroke-width': 4 }, lab).textContent = 'tekneler %25 hızlı';
    });
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
    // start hattı
    el('line', { x1: pin.x, y1: pin.y, x2: boat.x, y2: boat.y, stroke: '#ffd166', 'stroke-width': 2, 'stroke-dasharray': '10 8', opacity: .9 }, g);
    el('circle', { cx: pin.x, cy: pin.y, r: 7, fill: '#ff8c42', stroke: '#fff', 'stroke-width': 1.5 }, g);
    el('text', { x: pin.x, y: pin.y + 24, 'text-anchor': 'middle', fill: '#ffd166', 'font-size': 12 }, g).textContent = 'Pin';
    const cb = el('g', { transform: `translate(${boat.x},${boat.y})` }, g);
    el('path', { d: 'M-12,-30 C 2,-26 12,-12 12,0 L 12,28 L -12,28 Z', fill: '#e9ecef', stroke: '#6c757d', 'stroke-width': 1.5 }, cb);
    el('rect', { x: -7, y: -4, width: 14, height: 18, fill: '#adb5bd' }, cb);
    el('line', { x1: 0, y1: -30, x2: 0, y2: -52, stroke: '#fff', 'stroke-width': 2 }, cb);
    el('path', { d: 'M0,-52 L 16,-46 L 0,-40 Z', fill: '#ff8c42' }, cb);
    el('text', { x: boat.x, y: boat.y + 44, 'text-anchor': 'middle', fill: '#ffd166', 'font-size': 12 }, g).textContent = 'Hakem botu';
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

  function drawBoat(parent, b, w, t, sel) {
    const sail = E.sailState(b.h, w);
    const op = b.phase === 'done' ? Math.max(0.15, 1 - (t - b.doneAt) / 5) : 1;
    const wrap = el('g', { opacity: op.toFixed(2), 'data-boat': b.id, class: 'boat' }, parent);
    if (b.mine || sel) el('circle', { cx: b.x.toFixed(1), cy: b.y.toFixed(1), r: 31, fill: b.mine ? 'rgba(251,146,60,.12)' : 'rgba(56,189,248,.1)', stroke: sel ? '#38bdf8' : 'rgba(251,146,60,.7)', 'stroke-width': sel ? 2 : 1.5, 'stroke-dasharray': sel ? '' : '4 4' }, wrap);
    if (b.inGust > 0.2 && b.phase !== 'wait') el('circle', { cx: b.x.toFixed(1), cy: b.y.toFixed(1), r: 26, fill: 'none', stroke: 'rgba(125,211,252,.6)', 'stroke-width': 1.5 }, wrap);
    const g = el('g', { transform: `translate(${b.x.toFixed(1)},${b.y.toFixed(1)}) rotate(${b.h.toFixed(1)})` }, wrap);
    el('path', { d: 'M0,-25 C 9,-16 11,2 9,22 L -9,22 C -11,2 -9,-16 0,-25 Z', fill: b.color, stroke: '#fff', 'stroke-width': 1.5 }, g);
    el('path', { d: 'M0,-20 C 6,-13 7,2 6,18 L -6,18 C -7,2 -6,-13 0,-20 Z', fill: 'rgba(255,255,255,0.18)' }, g);
    const L = 27, my = -6;
    let tipX, tipY, ctrlX, ctrlY;
    if (sail.luffing) { const fl = Math.sin(t * 18 + b.x) * 6; tipX = fl * 0.6; tipY = my + L; ctrlX = fl * 1.5; ctrlY = my + L * 0.5; }
    else { const a = sail.boom * E.DEG; tipX = sail.side * Math.sin(a) * L; tipY = my + Math.cos(a) * L; ctrlX = tipX * 0.5 + sail.side * 9; ctrlY = my + (tipY - my) * 0.5; }
    el('path', { d: `M0,${my} Q${ctrlX.toFixed(1)},${ctrlY.toFixed(1)} ${tipX.toFixed(1)},${tipY.toFixed(1)} L0,${my} Z`, fill: 'rgba(255,255,255,0.85)', stroke: '#fff', 'stroke-width': 1 }, g);
    el('line', { x1: 0, y1: my, x2: tipX.toFixed(1), y2: tipY.toFixed(1), stroke: '#222', 'stroke-width': 1.5 }, g);
    // etiket
    const tk = sail.tack === 'starboard' ? 'S' : 'İ';
    const lab = el('g', { transform: `translate(${b.x.toFixed(1)},${(b.y + 36).toFixed(1)})` }, wrap);
    const wTxt = 7.4 * b.id.length + 26;
    el('rect', { x: -wTxt / 2, y: -10, width: wTxt, height: 19, rx: 9, fill: b.mine ? 'rgba(124,45,18,.9)' : 'rgba(7,18,30,.78)', stroke: b.mine ? '#fb923c' : 'rgba(255,255,255,.25)' }, lab);
    el('text', { x: -wTxt / 2 + 7, y: 4, fill: '#fff', 'font-size': 11.5, 'font-weight': 700 }, lab).textContent = b.id;
    el('rect', { x: wTxt / 2 - 17, y: -7, width: 13, height: 13, rx: 3.5, fill: tk === 'S' ? '#22c55e' : '#ef4444' }, lab);
    el('text', { x: wTxt / 2 - 10.5, y: 3.5, 'text-anchor': 'middle', fill: '#fff', 'font-size': 9.5, 'font-weight': 800 }, lab).textContent = tk;
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
    const rem = (v.startAt - v.t) * S.CLOCK_SCALE, on = rem > 0;
    const col = on ? (rem <= 10 ? '#f87171' : '#fbbf24') : '#34d399';
    const px = cx + 58, py = cy - 26, pw = 150, ph = 52;
    el('rect', { x: px, y: py, width: pw, height: ph, rx: 14, fill: 'rgba(7,18,30,0.78)', stroke: col, 'stroke-opacity': .55, 'stroke-width': 1.5 }, hg);
    el('text', { x: px + 14, y: py + 17, fill: 'rgba(255,255,255,.6)', 'font-size': 10, 'font-weight': 700, 'letter-spacing': 1 }, hg).textContent = on ? "START'A" : 'YARIŞ SÜRESİ';
    el('text', { x: px + 14, y: py + 42, fill: col, 'font-size': 22, 'font-weight': 800, 'font-variant-numeric': 'tabular-nums' }, hg).textContent = on ? S.fmt(rem / S.CLOCK_SCALE) : S.fmt(-rem / S.CLOCK_SCALE);
  }

  function render() {
    const v = view(), w = v.wind;
    drawWind(w, st.mode === 'setup' ? performance.now() / 1000 : v.t);
    drawGusts(v); drawCourse(v);
    const bl = $('boatLayer'); bl.innerHTML = '';
    const order = v.boats.filter(b => !b.gone).sort((a, b) => (a.mine ? 1 : 0) - (b.mine ? 1 : 0));
    for (const b of order) drawBoat(bl, b, w, v.t, st.sel === b.id);
    drawNotes(bl, order, v.t);
    drawHud(v);
    updateBar(v);
  }

  // ---------- panel ----------
  let lastPanelKey = '';
  function updatePanel(force) {
    const v = view();
    const key = st.mode + '|' + (v.t * 4 | 0) + '|' + st.sel + '|' + v.events.length + '|' + st.mineOnly + '|' + st.fleet.length + '|' + v.boats.map(b => b.id + b.tack + b.persona + b.mine).join();
    if (!force && key === lastPanelKey) return;
    lastPanelKey = key;
    const label = { setup: 'Kurulum', run: v.t < v.startAt ? "Start'a geri sayım" : 'Yarış', pause: 'Duraklatıldı', end: 'Yarış bitti' }[st.mode];
    $('phaseLabel').textContent = label;
    const mine = v.boats.find(b => b.mine);
    $('phaseSub').textContent = st.mode === 'setup' ? 'Tekneleri yerleştir, rüzgarı ayarla, start ver'
      : st.mode === 'end' ? (mine && mine.finish ? `Senin teknen ${mine.finish}. oldu` : 'Herkes şamandırayı döndü')
      : mine ? `Senin teknen: ${mine.finish ? mine.finish + '. bitirdi' : S.PERSONAS[mine.persona]}` : '';
    $('howto').classList.toggle('hidden', st.mode !== 'setup');
    // seçili tekne
    const sb = st.sel && st.fleet.find(b => b.id === st.sel);
    $('selBox').classList.toggle('hidden', !(sb && st.mode === 'setup'));
    if (sb && st.mode === 'setup') {
      $('selTitle').textContent = sb.mine ? 'Senin teknen' : `Tekne ${sb.id}`;
      [...$('selTack').children].forEach(x => x.classList.toggle('on', x.dataset.v === sb.tack));
      [...$('selPersona').children].forEach(x => x.classList.toggle('on', x.dataset.v === sb.persona));
      $('btnMakeMine').disabled = sb.mine;
    }
    // sıralama
    const rows = st.mode === 'setup' ? st.fleet.map(b => ({ b, status: S.PERSONAS[b.persona] + ' · ' + (b.tack === 'starboard' ? 'sancak' : 'iskele') })) : S.standings(v);
    $('standings').innerHTML = rows.map((r, i) => `<li class="${r.b.mine ? 'me' : ''} ${r.b.finish ? 'fin' : ''}"><span class="pos">${st.mode === 'setup' ? '' : i + 1}</span>` +
      `<span class="boat-id" style="background:${r.b.color}">${esc(r.b.id)}</span><span class="nm">${esc(r.b.mine ? 'Sen' : r.b.name)}</span><span class="stt">${esc(r.status)}</span></li>`).join('');
    // olaylar
    const evs = v.events.filter(e => !st.mineOnly || /(^|\s)SEN\b/.test(e.text)).slice(-40).reverse();
    $('events').innerHTML = evs.length ? evs.map(e => `<li class="${e.kind}"><span class="et">${S.fmt(Math.max(0, e.t - v.startAt))}</span>${esc(e.text)}</li>`).join('')
      : `<li class="empty">${st.mode === 'setup' ? 'Start verilince kural olayları burada görünür.' : 'Henüz olay yok.'}</li>`;
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
    $('btnTack').disabled = !mine || setup || mine.phase !== 'race';
    if (mine && document.activeElement !== $('selMinePersona')) $('selMinePersona').value = mine.persona;
    updatePanel();
  }

  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.add('hidden'), 2600);
  }

  // ---------- simülasyon döngüsü ----------
  function startRace() {
    st.sim = S.newRace(st.fleet, { wind: st.wind, gusts: st.gusts });
    st.frames = [S.clone(st.sim)]; st.mode = 'run'; st.sel = null; st.acc = 0;
  }
  function stepOnce() {
    const s = st.sim;
    S.step(s);
    if (Math.round(s.t / S.DT) % 2 === 0) st.frames.push(S.clone(s));
    if (s.boats.every(b => b.finish || b.gone)) {
      st.mode = 'end'; st.frames.push(S.clone(s));
      const mine = s.boats.find(b => b.mine);
      toast(mine && mine.finish ? `Yarış bitti · Senin teknen ${mine.finish}. oldu` : 'Yarış bitti');
    }
  }
  function tick(ts) {
    const dt = Math.min(0.1, (ts - st.lastTs) / 1000 || 0); st.lastTs = ts;
    if (st.mode === 'run') {
      st.acc += dt * st.speed;
      while (st.acc >= S.DT && st.mode === 'run') { st.acc -= S.DT; stepOnce(); }
    }
    render();
    requestAnimationFrame(tick);
  }
  // Geri sarılmış bir andan devam edilecekse gelecek kayıtları at
  function truncateFrames() {
    const t = st.sim.t;
    while (st.frames.length && st.frames[st.frames.length - 1].t > t + 1e-6) st.frames.pop();
  }
  function togglePlay() {
    if (st.mode === 'setup') startRace();
    else if (st.mode === 'run') st.mode = 'pause';
    else if (st.mode === 'pause') { truncateFrames(); st.mode = 'run'; }
    else if (st.mode === 'end') { st.sim = S.clone(st.frames[0]); st.frames = [S.clone(st.sim)]; st.mode = 'run'; }
    updatePanel(true);
  }
  function backToSetup() { st.mode = 'setup'; st.sim = null; st.frames = []; updatePanel(true); }

  // ---------- rüzgar, sağanak, filo ----------
  function setWind(delta) {
    if (st.mode === 'setup') st.wind = E.norm180(st.wind + delta);
    else { truncateFrames(); st.sim.wind = E.norm180(st.sim.wind + delta); st.sim.events.push({ t: st.sim.t, text: `Rüzgar ${delta > 0 ? 'sağa' : 'sola'} döndü → ${Math.round(E.norm360(st.sim.wind))}°`, kind: 'wind' }); }
  }
  function gustList() { return st.mode === 'setup' ? st.gusts : st.sim.gusts; }
  function addGust(side) {
    const list = gustList();
    const x = side === 'L' ? 230 : 770;
    list.push({ x, y: 430, rx: 120, ry: 190 });
    if (st.mode !== 'setup') { truncateFrames(); st.sim.events.push({ t: st.sim.t, text: `${side === 'L' ? 'Sol' : 'Sağ'} tarafa sağanak geldi`, kind: 'wind' }); }
    toast(`${side === 'L' ? 'Sol' : 'Sağ'} tarafa sağanak eklendi · sürükleyerek taşıyabilirsin`);
  }
  function clearGusts() { gustList().length = 0; if (st.mode !== 'setup') truncateFrames(); }
  function renumber() {
    let k = 1;
    for (const b of st.fleet) if (!b.mine) { b.id = String(k); b.name = `Tekne ${k}`; k++; }
  }
  function setFleetSize(n) {
    n = Math.max(2, Math.min(16, n));
    const mineAt = st.fleet.find(b => b.mine);
    const fresh = S.defaultFleet(n);
    // senin teknenin yerini koru
    if (mineAt) { const m = fresh.find(b => b.mine); m.x = mineAt.x; m.y = mineAt.y; m.tack = mineAt.tack; m.persona = mineAt.persona; }
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
  function onDown(ev) {
    const p = toWorld(ev);
    const b = st.mode === 'setup' ? hitBoat(p) : null;
    if (b) {
      const fb = st.fleet.find(x => x.id === b.id);
      st.drag = { kind: 'boat', obj: fb, dx: fb.x - p.x, dy: fb.y - p.y, moved: false, x0: ev.clientX, y0: ev.clientY };
    } else {
      const g = hitGust(p);
      if (g) st.drag = { kind: 'gust', obj: g, dx: g.x - p.x, dy: g.y - p.y, moved: false, x0: ev.clientX, y0: ev.clientY };
      else if (st.mode === 'setup' && st.sel) { st.sel = null; updatePanel(true); }
    }
    if (st.drag) { $('course').setPointerCapture(ev.pointerId); ev.preventDefault(); }
  }
  function onMove(ev) {
    const d = st.drag;
    if (!d) { const p = toWorld(ev); $('course').style.cursor = (st.mode === 'setup' && hitBoat(p)) || hitGust(p) ? 'grab' : ''; return; }
    if (Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0) > 4) d.moved = true;
    if (!d.moved) return;
    const p = toWorld(ev);
    d.obj.x = Math.max(20, Math.min(W.w - 20, p.x + d.dx));
    d.obj.y = Math.max(20, Math.min(W.h - 10, p.y + d.dy));
    if (d.kind === 'gust' && st.mode !== 'setup') truncateFrames();
    $('course').style.cursor = 'grabbing';
  }
  function onUp() {
    const d = st.drag; st.drag = null;
    if (!d) return;
    if (d.kind === 'boat' && !d.moved) { st.sel = st.sel === d.obj.id ? null : d.obj.id; if (phoneMq.matches) setPanelOpen(true); }
    if (d.kind === 'boat' && d.moved && S.lineSide(d.obj) === -1) toast('Bu tekne hattın üstünde: start\'ta erken (OCS) sayılır, geri dönmek zorunda kalır.');
    $('course').style.cursor = '';
    updatePanel(true);
  }

  // ---------- panel aç/kapa ----------
  function setPanelOpen(open) { $('panel').classList.toggle('hidden', !open); $('btnPanel').classList.toggle('on', open); fitViewBox(); }

  // ---------- olaylar ----------
  $('btnPlay').addEventListener('click', togglePlay);
  $('btnReset').addEventListener('click', backToSetup);
  $('speedSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; st.speed = +b.dataset.v; [...$('speedSeg').children].forEach(x => x.classList.toggle('on', x === b)); });
  $('scrub').addEventListener('input', e => {
    if (!st.frames.length) return;
    const t = +e.target.value;
    let i = st.frames.findIndex(f => f.t >= t - 1e-6); if (i < 0) i = st.frames.length - 1;
    st.sim = S.clone(st.frames[i]);
    if (st.mode === 'run' || st.mode === 'end') st.mode = 'pause';
    updatePanel(true);
  });
  $('btnWindL').addEventListener('click', () => setWind(-5));
  $('btnWindR').addEventListener('click', () => setWind(5));
  $('btnGustL').addEventListener('click', () => addGust('L'));
  $('btnGustR').addEventListener('click', () => addGust('R'));
  $('btnGustClear').addEventListener('click', clearGusts);
  $('btnTack').addEventListener('click', () => { if (st.sim) { truncateFrames(); S.command(st.sim, 'tack'); } });
  $('selMinePersona').addEventListener('change', e => {
    if (st.mode === 'setup') { const m = st.fleet.find(b => b.mine); if (m) m.persona = e.target.value; updatePanel(true); }
    else { truncateFrames(); S.command(st.sim, 'persona', e.target.value); }
  });
  $('btnFleetMinus').addEventListener('click', () => { removeOne(); updatePanel(true); });
  $('btnFleetPlus').addEventListener('click', () => { addOne(); updatePanel(true); });
  $('btnFleetLine').addEventListener('click', () => { setFleetSize(st.fleet.length); updatePanel(true); toast('Tekneler hattın dibine yeniden dizildi'); });
  $('selTack').addEventListener('click', e => { const x = e.target.closest('button'); const b = st.fleet.find(q => q.id === st.sel); if (x && b) { b.tack = x.dataset.v; updatePanel(true); } });
  $('selPersona').addEventListener('click', e => { const x = e.target.closest('button'); const b = st.fleet.find(q => q.id === st.sel); if (x && b) { b.persona = x.dataset.v; updatePanel(true); } });
  $('btnMakeMine').addEventListener('click', () => { if (st.sel) { makeMine(st.sel); updatePanel(true); } });
  $('btnRemoveBoat').addEventListener('click', () => { if (st.sel) { removeOne(st.sel); updatePanel(true); } });
  $('btnSelClose').addEventListener('click', () => { st.sel = null; updatePanel(true); });
  $('chkMineOnly').addEventListener('change', e => { st.mineOnly = e.target.checked; updatePanel(true); });
  $('btnPanel').addEventListener('click', () => setPanelOpen($('panel').classList.contains('hidden')));
  $('btnPanelClose').addEventListener('click', () => setPanelOpen(false));
  $('panelHead').addEventListener('click', e => { if (phoneMq.matches && e.target.closest('.info-title-wrap, .handle')) $('panel').classList.toggle('collapsed'); });
  $('btnFull').addEventListener('click', () => { const d = document.documentElement; if (!document.fullscreenElement) (d.requestFullscreen || d.webkitRequestFullscreen || (() => {})).call(d); else document.exitFullscreen(); });
  const svg = $('course');
  svg.addEventListener('pointerdown', onDown);
  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerup', onUp);
  svg.addEventListener('pointercancel', onUp);
  document.addEventListener('keydown', e => {
    if (e.target.closest('input, select, textarea')) return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    else if (e.key === 't' || e.key === 'T') $('btnTack').click();
    else if (e.key === 'ArrowLeft') setWind(-5);
    else if (e.key === 'ArrowRight') setWind(5);
  });
  window.addEventListener('resize', fitViewBox);
  phoneMq.addEventListener('change', fitViewBox);

  fitViewBox();
  if (phoneMq.matches) $('panel').classList.add('collapsed');
  updatePanel(true);
  requestAnimationFrame(ts => { st.lastTs = ts; tick(ts); });
})();
