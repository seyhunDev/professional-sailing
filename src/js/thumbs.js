/* Senaryo seçici küçük resimleri: her senaryonun kare, hızlandırılmış ve döngüde oynayan ön izlemesi.
   Yalnız ekranda görünen küçük resimler oynar (IntersectionObserver); senaryo hesabı ilk görünüşte, kare başına bir tane yapılır.
   "Hareketi azalt" açıksa ön izleme durağan bir kare gösterir. */
(function () {
  const E = SailEngine, NS = 'http://www.w3.org/2000/svg';
  const LOOP = 7, HOLD = 1;          // bir tur 7 sn, sonda 1 sn bekleme
  const CROWD = 'rgba(200,214,227,.75)';
  const HULL = 'M0,-25 C 9,-16 11,2 9,22 L -9,22 C -11,2 -9,-16 0,-25 Z';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const cache = new Map();           // senaryo id → { boats, vb }
  const live = new Set();            // ekranda görünen ve çizilmiş küçük resimler
  const queue = [];                  // çizilmeyi bekleyenler
  let io = null, raf = 0;

  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  // uygulamadaki gibi: senaryo tekneleri + filo, pis rüzgar dahil (SailRules.buildScene)
  function prep(scn) {
    if (cache.has(scn.id)) return cache.get(scn.id);
    const specs = (scn.crowd || []).map(c => {
      const sp = { tack: c.tack || 'starboard', row: c.row || 0, back: c.back || 0, v0: c.v0 };
      if (c.slot != null && scn.line) { const { pin, boat } = scn.line; sp.slot = { x: pin.x + (boat.x - pin.x) * c.slot, y: pin.y + (boat.y - pin.y) * c.slot }; }
      else sp.pos = c.pos;
      return sp;
    });
    const sc = SailRules.buildScene(scn, specs);
    const boats = sc.extras.map(track => ({ color: CROWD, track, crowd: true }))
      .concat(scn.boats.map((b, i) => ({ color: b.color, track: sc.scripted[i] })));
    // çerçeve: anlatılan tekneler + start hattı + şamandıralar (filo dışarıda kalabilir), kare
    const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    const add = (x, y) => { b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y); };
    for (const bt of boats) if (!bt.crowd) for (let t = 0; t <= scn.duration; t += 0.5) { const p = E.sampleTrack(bt.track, t); add(p.x, p.y); }
    // start hattı çerçeveye girmez (uzun hat tekneleri küçültür; kare dışında kalan kısmı kesilir); şamandıralar girer
    for (const m of scn.marks || []) add(m.x, m.y);
    const side = Math.max(b.x1 - b.x0, b.y1 - b.y0, 240) + 100;
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    const r = { boats, side, vb: `${(cx - side / 2).toFixed(0)} ${(cy - side / 2).toFixed(0)} ${side.toFixed(0)} ${side.toFixed(0)}` };
    cache.set(scn.id, r);
    return r;
  }

  function draw(th) {
    const scn = th.scn, p = prep(scn), k = p.side / 160;     // k: ekranda ~1 px'e karşılık gelen SVG birimi
    const svg = el('svg', { viewBox: p.vb, preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true' });
    if (scn.line) {
      const { pin, boat } = scn.line;
      el('line', { x1: pin.x, y1: pin.y, x2: boat.x, y2: boat.y, stroke: '#ffd166', 'stroke-width': 1.6 * k, 'stroke-dasharray': `${5 * k} ${4 * k}`, opacity: .85 }, svg);
      el('circle', { cx: pin.x, cy: pin.y, r: 3.5 * k, fill: '#ff8c42' }, svg);
      const cb = E.drawCommitteeBoat(el, svg);
      cb.setAttribute('transform', E.committeeBoatTransform(boat.x, boat.y, E.windAt(scn.wind, 0)));
    }
    for (const m of scn.marks || []) el('circle', { cx: m.x, cy: m.y, r: 4 * k, fill: '#ff8c42', stroke: '#fff', 'stroke-width': k }, svg);
    th.nodes = p.boats.map(bt => {
      const g = el('g', {}, svg);
      el('path', { d: HULL, transform: 'scale(1.35)', fill: bt.color, stroke: bt.crowd ? 'none' : '#fff', 'stroke-width': 2 }, g);
      return { g, track: bt.track };
    });
    th.box.appendChild(svg);
    th.drawn = true;
    pose(th, reduce.matches ? scn.duration * 0.6 : 0);
  }

  function pose(th, t) {
    for (const n of th.nodes) {
      const s = E.sampleTrack(n.track, t);
      n.g.setAttribute('transform', `translate(${s.x.toFixed(1)},${s.y.toFixed(1)}) rotate(${s.h.toFixed(1)})`);
    }
  }

  function frame(ts) {
    raf = 0;
    // bekleyenlerden yalnız birini çiz (açılışta takılma olmasın)
    const next = queue.shift();
    if (next && next.box.isConnected && !next.drawn) { draw(next); live.add(next); }
    if (!reduce.matches) {
      const u = (ts / 1000) % (LOOP + HOLD) / LOOP;
      for (const th of live) pose(th, Math.min(1, u) * th.scn.duration);
    }
    if (queue.length || (live.size && !reduce.matches)) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  function observer() {
    if (io) return io;
    io = new IntersectionObserver(entries => {
      for (const en of entries) {
        const th = en.target._thumb;
        if (en.isIntersecting) { if (th.drawn) live.add(th); else if (!queue.includes(th)) queue.push(th); }
        else { live.delete(th); const i = queue.indexOf(th); if (i >= 0) queue.splice(i, 1); }
      }
      kick();
    }, { rootMargin: '120px 0px' });
    return io;
  }

  window.SailThumbs = {
    // senaryonun küçük resim kutusu (boş başlar, görününce çizilir)
    make(scn) {
      const box = document.createElement('div'); box.className = 'thumb';
      box._thumb = { scn, box, drawn: false, nodes: [] };
      observer().observe(box);
      return box;
    },
    // seçici yeniden kurulurken / kapanınca: eski küçük resimleri bırak
    reset() { if (io) io.disconnect(); live.clear(); queue.length = 0; }
  };
})();
