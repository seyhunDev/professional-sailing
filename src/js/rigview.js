/* Yandan görünüş paneli (İleri Teknik dersleri): Optimist donanımı, palanga / iskota / bumba hareketi.
   Şematik ve göreli bir çizimdir; açılar ölçüm değil, dersin anlatımı içindir.
   Senaryo alanı: rig = { kn, label, steps: ['...'], keys: [{ t, sheet, vang, push, hand, p }], ghost: { label, keys } }
     sheet: iskota 0 (tam kaçık) … 1 (sonuna kadar çekik)
     vang : palanga 0 (boş) … 1 (çok sıkı)
     push : sporcu bumbayı aşağı bastırıyor 0 … 1
     hand : o an elin olduğu yer: 'sheet' | 'boom' | 'vang' | 'tiller' | null
     p    : üstteki adım şeridinde vurgulanan adım (0'dan)
   Arayüz: SailRigView.mount(panelEl) bir kez; SailRigView.show(rig) senaryo değişince; SailRigView.draw(t) her karede. */
(function (global) {
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const rad = d => d * Math.PI / 180;
  const P = (x, y) => ({ x, y });
  const pt = p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;

  // ---------- anahtar karelerden o anki durum ----------
  function stateAt(keys, t) {
    if (!keys || !keys.length) return null;
    let i = 0;
    while (i < keys.length - 1 && keys[i + 1].t <= t) i++;
    const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
    const k = b.t > a.t ? clamp((t - a.t) / (b.t - a.t), 0, 1) : 0;
    const num = f => lerp(a[f] ?? 0, b[f] ?? a[f] ?? 0, k);
    return { sheet: num('sheet'), vang: num('vang'), push: num('push'), hand: a.hand || null, p: a.p ?? 0 };
  }

  // ---------- fizik yerine şematik model ----------
  // windK: rüzgar şiddeti etkisi (hafif ~0.6, orta-sert 1). Bumba iskota kaçtıkça kalkmak ister (freeLift);
  // palanga bu kalkışı sınırlar (maxLift). İskota çekik + bumba bastırılmışsa palanga yüksüz (boş) kalır.
  function model(s, windK) {
    const out = 8 + (1 - s.sheet) * 70;                          // bumbanın merkez hattından açısı (°)
    const freeLift = (1 - s.sheet) * 30 * windK;                 // palanga olmasa bumbanın kalkışı (°)
    const maxLift = 27 * (1 - s.vang) - 2;                       // palanganın izin verdiği en fazla kalkış (°)
    const natural = Math.min(freeLift, maxLift);
    const lift = lerp(natural, -4, s.push);                      // sporcu bastırınca bumba palanga sınırının altına iner
    const load = s.push > 0.5 ? 0 : freeLift > maxLift ? clamp(0.35 + (freeLift - maxLift) / 14, 0, 1) * windK : 0;
    const twist = 3 + Math.max(0, lift) * 0.9 + windK * 2.5;     // tepe açılması (°)
    return { out, lift, maxLift, load, twist };
  }

  // ---------- çizim: yelken ayarı sayfasının (ayar.js) Optimist modeli ----------
  // Gövde, direk, yelken, gırcala, bumba, palanga ayar.js'deki ölçülerle aynı (Optimist sınıf ölçüleri, K = px/mm).
  // Farkı: bumba açıldıkça yandan bakınca kısalır (izdüşüm), tepe açılması üst kısmı daha çok kısaltır.
  const STEP = { x: 196, y: 404 };
  const K = 0.1515, NTIES = 8, GAP_PX = 2.6;
  const SAIL = { luff: 1730, head: 1240, leech: 2800, foot: 1900, boom: 2010, mast: 2350, sprit: 2286 };
  const add = (a, b) => P(a.x + b.x, a.y + b.y);
  const mul = (a, k) => P(a.x * k, a.y * k);
  const sub = (a, b) => P(a.x - b.x, a.y - b.y);
  const len = a => Math.hypot(a.x, a.y);
  const unit = a => mul(a, 1 / (len(a) || 1));
  const mix = (a, b, t) => P(lerp(a.x, b.x, t), lerp(a.y, b.y, t));
  const ROT = 1.6;                                  // direk eğimi (2,80 m ≈ 1,6°)
  let proj = { b: 1, t: 1 };
  function tp(p) {
    // izdüşüm: direğin kıçındaki noktalar yüksekliğe göre (bumba → tepe) kısalır
    const hf = clamp((-p.y - 40) / 270, 0, 1);
    const x = p.x > 0 ? p.x * lerp(proj.b, proj.t, hf) : p.x;
    const a = rad(ROT), c = Math.cos(a), s = Math.sin(a);
    return P(STEP.x + x * c - p.y * s, STEP.y + x * s + p.y * c);
  }
  function circles(A, r1, B, r2) {
    const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
    const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
    const xm = A.x + a * dx / d, ym = A.y + a * dy / d;
    const p1 = P(xm + h * dy / d, ym - h * dx / d), p2 = P(xm - h * dy / d, ym + h * dx / d);
    return p1.y < p2.y ? p1 : p2;
  }
  function geom(lift) {
    const bh = 40, G = P(0, -bh);
    const la = rad(lift), bdir = P(Math.cos(la), -Math.sin(la));
    const C = add(G, mul(bdir, SAIL.foot * K)), BE = add(G, mul(bdir, SAIL.boom * K));
    const yBot = -bh - 4, yTop = yBot - SAIL.luff * K;
    const luff = Array.from({ length: NTIES }, (_, i) => P(3 + 2 * GAP_PX, lerp(yTop, yBot, i / (NTIES - 1))));
    const H = luff[0], T = luff[NTIES - 1];
    const Pk = circles(P(3, yTop), SAIL.head * K, C, SAIL.leech * K);
    const sl = SAIL.sprit * K;
    const S = P(0, Pk.y + Math.sqrt(Math.max(0, sl * sl - Pk.x * Pk.x)));
    const mtop = yTop - 20 * K;
    return { G, C, BE, S, Pk, luff, T, H, mtop, mbot: mtop + SAIL.mast * K };
  }
  function sailPath(g, twist) {
    const { C, Pk, luff } = g;
    const nrm = unit(P(-(C.y - Pk.y), C.x - Pk.x));
    const lm = mix(Pk, C, 0.48), T0 = luff[NTIES - 1];
    const out = len(sub(add(lm, nrm), T0)) > len(sub(add(lm, mul(nrm, -1)), T0)) ? nrm : mul(nrm, -1);
    const L1 = add(lm, mul(out, 13 - twist * 0.25));
    const headMid = add(mix(luff[0], Pk, 0.5), P(-2, -7));
    let d = `M${pt(tp(luff[NTIES - 1]))}`;
    for (let i = NTIES - 2; i >= 0; i--) d += ` Q${pt(tp(add(mix(luff[i + 1], luff[i], 0.5), P(-1.6, 0))))} ${pt(tp(luff[i]))}`;
    return d + ` Q${pt(tp(headMid))} ${pt(tp(Pk))} Q${pt(tp(L1))} ${pt(tp(C))} Z`;
  }
  const setProj = m => { proj = { b: 0.3 + 0.7 * Math.cos(rad(m.out)), t: 0.3 + 0.7 * Math.cos(rad(Math.min(88, m.out + m.twist))) }; };

  function defs(svg) {
    const d = el('defs', {}, svg);
    const lg = (id, x2, y2, stops) => { const g = el('linearGradient', { id, x1: 0, y1: 0, x2, y2 }, d); stops.forEach(([o, c, a]) => el('stop', { offset: o, 'stop-color': c, 'stop-opacity': a == null ? 1 : a }, g)); };
    lg('rvSail', 1, 0, [[0, '#f8fafc', .96], [1, '#dbe7f3', .92]]);
    lg('rvHull', 0, 1, [[0, '#ffffff'], [.55, '#e2e8f0'], [1, '#b6c3d1']]);
    lg('rvFoil', 1, 0, [[0, '#f1f5f9'], [.35, '#ffffff'], [1, '#a8b6c6']]);
    lg('rvMetal', 1, 0, [[0, '#475569'], [.4, '#cbd5e1'], [.6, '#94a3b8'], [1, '#334155']]);
  }

  function drawHull(gH) {
    el('path', { d: 'M116,394 Q290,401 470,403 L465,444 Q330,463 172,447 Q150,442 140,432 Z', fill: 'url(#rvHull)', stroke: '#0b1724', 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, gH);
    el('path', { d: 'M116,394 L140,432 L150,431 L128,395 Z', fill: '#cbd5e1', stroke: '#0b1724', 'stroke-width': 1 }, gH);
    el('path', { d: 'M142,425 Q300,436 467,430', fill: 'none', stroke: '#94a3b8', 'stroke-width': 1.2 }, gH);
    el('path', { d: 'M150,438 Q300,452 465,442', fill: 'none', stroke: 'rgba(15,23,42,.18)', 'stroke-width': 6 }, gH);
    el('path', { d: 'M116,394 Q290,401 470,403', fill: 'none', stroke: '#1e293b', 'stroke-width': 5, 'stroke-linecap': 'round' }, gH);
    el('path', { d: 'M118,392.5 Q290,399.5 469,401.5', fill: 'none', stroke: '#64748b', 'stroke-width': 1.2 }, gH);
    el('rect', { x: STEP.x - 12, y: 392, width: 30, height: 4, rx: 1.5, fill: '#475569' }, gH);
    el('path', { d: 'M282,452 L279,528 Q280,538 290,538 L300,538 Q305,536 304,526 L304,454 Z', fill: 'url(#rvFoil)', stroke: '#0b1724', 'stroke-width': 1.3 }, gH);
    el('rect', { x: 279, y: 389, width: 26, height: 11, rx: 2, fill: 'url(#rvFoil)', stroke: '#0b1724', 'stroke-width': 1 }, gH);
    el('path', { d: 'M468,396 L488,396 L490,414 L470,414 Z', fill: '#334155', stroke: '#0b1724', 'stroke-width': 1 }, gH);
    el('path', { d: 'M470,414 L493,414 Q503,468 495,522 Q489,532 478,528 L472,452 Z', fill: 'url(#rvFoil)', stroke: '#0b1724', 'stroke-width': 1.3 }, gH);
    for (const y of [410, 432]) el('rect', { x: 464, y, width: 9, height: 4, rx: 1, fill: '#94a3b8', stroke: '#0b1724', 'stroke-width': .6 }, gH);
    el('path', { d: 'M478,400 L404,391', stroke: '#a16207', 'stroke-width': 5, 'stroke-linecap': 'round' }, gH);
    el('path', { d: 'M478,400 L404,391', stroke: '#facc15', 'stroke-width': 1, opacity: .5 }, gH);
    el('circle', { cx: 404, cy: 391, r: 2.6, fill: '#0f172a' }, gH);
    el('path', { d: 'M404,391 L322,384', stroke: '#0f172a', 'stroke-width': 3, 'stroke-linecap': 'round' }, gH);
    el('circle', { cx: 322, cy: 384, r: 3.4, fill: '#0f172a' }, gH);
  }

  function arrow(g, a, b, color, w) {
    const ang = Math.atan2(b.y - a.y, b.x - a.x), hl = 10;
    el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: color, 'stroke-width': w || 3, 'stroke-linecap': 'round' }, g);
    el('path', { d: `M${pt(b)} L${pt(P(b.x - hl * Math.cos(ang - .5), b.y - hl * Math.sin(ang - .5)))} L${pt(P(b.x - hl * Math.cos(ang + .5), b.y - hl * Math.sin(ang + .5)))} Z`, fill: color }, g);
  }

  const BLOCK = P(356, 393), HAND = P(338, 372), V0L = P(4, -14), VL = 52;
  function drawRig(g, m, s, ghost) {
    setProj(m);
    const geo = geom(m.lift);
    const { G, C, S, Pk, luff, T, H, BE } = geo;
    const bdir = unit(sub(C, G));
    const V1 = add(G, mul(bdir, VL));
    const sp = sailPath(geo, m.twist);
    if (ghost) {
      el('path', { d: sp, fill: 'none', stroke: '#f87171', 'stroke-width': 2, 'stroke-dasharray': '7 5', opacity: .95 }, g);
      el('line', { x1: tp(G).x, y1: tp(G).y, x2: tp(BE).x, y2: tp(BE).y, stroke: '#f87171', 'stroke-width': 3.4, 'stroke-dasharray': '7 5' }, g);
      return { C: tp(C) };
    }
    const L = (a, b, attrs) => el('line', { x1: tp(a).x, y1: tp(a).y, x2: tp(b).x, y2: tp(b).y, ...attrs }, g);
    const D = (d, attrs) => el('path', { d, ...attrs }, g);
    const mw = 3.6, now = performance.now();
    // ana iskota: bumbadan makaraya, makaradan sporcunun eline
    const MS = add(G, mul(bdir, 220));
    el('line', { x1: tp(MS).x, y1: tp(MS).y, x2: BLOCK.x, y2: BLOCK.y, stroke: '#e2e8f0', 'stroke-width': 1.5 }, g);
    el('path', { d: `M${pt(BLOCK)} Q${pt(P(346, 392 + (1 - s.sheet) * 6))} ${pt(HAND)}`, fill: 'none', stroke: '#e2e8f0', 'stroke-width': 1.5 }, g);
    el('circle', { cx: BLOCK.x, cy: BLOCK.y, r: 3.4, fill: '#0f172a' }, g);
    // direk
    D(`M${pt(tp(P(-mw, geo.mbot)))} L${pt(tp(P(-mw + .8, geo.mtop)))} L${pt(tp(P(mw - .8, geo.mtop)))} L${pt(tp(P(mw, geo.mbot)))} Z`, { fill: 'url(#rvMetal)', stroke: '#0f172a', 'stroke-width': 1 });
    D(`M${pt(tp(P(-mw - .6, geo.mtop + 2)))} L${pt(tp(P(-mw - .6, geo.mtop - 6)))} L${pt(tp(P(mw + .6, geo.mtop - 6)))} L${pt(tp(P(mw + .6, geo.mtop + 2)))} Z`, { fill: '#0f172a' });
    // yelken + kesim dikişleri + köşe takviyeleri
    const clip = el('clipPath', { id: 'rvClip' }, g); el('path', { d: sp }, clip);
    D(sp, { fill: 'url(#rvSail)' });
    const cl = el('g', { 'clip-path': 'url(#rvClip)' }, g);
    const lu = unit(sub(Pk, C)), inward = P(-lu.y, lu.x), inw = inward.x > 0 ? mul(inward, -1) : inward;
    for (let t = 0.1; t < 0.98; t += 0.11) { const a = mix(C, Pk, t), b = add(a, mul(inw, 420)); el('line', { x1: tp(a).x, y1: tp(a).y, x2: tp(b).x, y2: tp(b).y, stroke: '#94a3b8', 'stroke-width': .9, opacity: .55 }, cl); }
    const patch = (c, a, b, r) => {
      const p1 = add(c, mul(unit(sub(a, c)), r)), p2 = add(c, mul(unit(sub(b, c)), r));
      el('path', { d: `M${pt(tp(c))} L${pt(tp(p1))} Q${pt(tp(mix(mix(p1, p2, .5), c, -.15)))} ${pt(tp(p2))} Z`, fill: '#cbd5e1', opacity: .55, stroke: '#94a3b8', 'stroke-width': .6 }, cl);
    };
    patch(Pk, H, C, 46); patch(C, Pk, T, 44); patch(T, H, C, 30); patch(H, Pk, T, 28);
    for (const f of [0.3, 0.62]) { const a = mix(Pk, C, f), b = add(a, mul(inw, 58)); el('line', { x1: tp(a).x, y1: tp(a).y, x2: tp(b).x, y2: tp(b).y, stroke: '#cbd5e1', 'stroke-width': 5, 'stroke-linecap': 'round', opacity: .9 }, cl); el('line', { x1: tp(a).x, y1: tp(a).y, x2: tp(b).x, y2: tp(b).y, stroke: '#64748b', 'stroke-width': 1.2, 'stroke-linecap': 'round' }, cl); }
    const nP = tp(add(mix(H, T, 0.42), P(70, 0)));
    el('text', { x: nP.x, y: nP.y, transform: `rotate(${ROT} ${nP.x.toFixed(1)} ${nP.y.toFixed(1)})`, class: 'rig-no' }, cl).textContent = 'TUR 123';
    D(sp, { fill: 'none', stroke: '#0b1724', 'stroke-width': 1.5, 'stroke-linejoin': 'round' });
    D(`M${luff.map(q => pt(tp(q))).join(' L')}`, { fill: 'none', stroke: '#e2e8f0', 'stroke-width': 3.2, 'stroke-linejoin': 'round' });
    // arka yakanın üst yarısı: tepe açıldıkça turuncu
    const tw = clamp((m.twist - 6) / 14, 0, 1);
    D(`M${pt(tp(Pk))} L${pt(tp(mix(Pk, C, .45)))}`, { stroke: tw > .45 ? '#fb923c' : '#38bdf8', 'stroke-width': 3.2, opacity: .45 + .4 * tw, 'stroke-linecap': 'round' });
    [0.3, 0.55, 0.8].forEach((f, i) => { const a = tp(mix(C, Pk, f)), fl = Math.sin(now / 160 + i * 1.7) * 3; el('path', { d: `M${pt(a)} q9,${(fl * .4).toFixed(1)} 16,${fl.toFixed(1)}`, fill: 'none', stroke: '#f472b6', 'stroke-width': 1.8, 'stroke-linecap': 'round' }, g); });
    // direk bağları
    luff.forEach(q => { const c = tp(P(0, q.y)); el('ellipse', { cx: c.x, cy: c.y, rx: 5.2, ry: 2.2, fill: 'none', stroke: '#f59e0b', 'stroke-width': 1.6 }, g); L(P(mw, q.y), q, { stroke: '#f59e0b', 'stroke-width': 1.8 }); el('circle', { cx: tp(q).x, cy: tp(q).y, r: 2.4, fill: '#e2e8f0', stroke: '#334155', 'stroke-width': 1.1 }, g); });
    // rüzgar gülü
    const vb = tp(P(0, geo.mtop - 6)), vt = tp(P(0, geo.mtop - 30));
    el('line', { x1: vb.x, y1: vb.y, x2: vt.x, y2: vt.y, stroke: '#0f172a', 'stroke-width': 1.6 }, g);
    const sway = Math.sin(now / 650) * 2.5, nose = P(vt.x - 16, vt.y - sway * .25), tail = P(vt.x + 20, vt.y + sway * .35);
    el('line', { x1: nose.x, y1: nose.y, x2: tail.x, y2: tail.y, stroke: '#0f172a', 'stroke-width': 1.6 }, g);
    el('path', { d: `M${pt(tail)} l-9,-8 l5,0 l9,8 l-9,8 l-5,0 z`, fill: '#f472b6', stroke: '#0f172a', 'stroke-width': .6 }, g);
    el('circle', { cx: nose.x, cy: nose.y, r: 3, fill: '#0f172a' }, g);
    // bumba
    const bw = 3, bn = unit(P(-(C.y - G.y), C.x - G.x));
    D(`M${pt(tp(add(G, mul(bn, bw))))} L${pt(tp(add(BE, mul(bn, bw * .9))))} L${pt(tp(add(BE, mul(bn, -bw * .9))))} L${pt(tp(add(G, mul(bn, -bw))))} Z`, { fill: 'url(#rvMetal)', stroke: '#0f172a', 'stroke-width': 1 });
    D(`M${pt(tp(add(G, P(-6, -5))))} L${pt(tp(add(G, P(8, -5))))} L${pt(tp(add(G, P(8, 5))))} L${pt(tp(add(G, P(-6, 5))))} Z`, { fill: '#1e293b' });
    D(`M${pt(tp(add(BE, P(-4, -4))))} L${pt(tp(add(BE, P(3, -4))))} L${pt(tp(add(BE, P(3, 4))))} L${pt(tp(add(BE, P(-4, 4))))} Z`, { fill: '#1e293b' });
    L(C, BE, { stroke: '#ef4444', 'stroke-width': 2 });
    // gırcala
    const sn = unit(P(-(Pk.y - S.y), Pk.x - S.x));
    D(`M${pt(tp(add(S, mul(sn, 2.4))))} L${pt(tp(add(Pk, mul(sn, 1.8))))} L${pt(tp(add(Pk, mul(sn, -1.8))))} L${pt(tp(add(S, mul(sn, -2.4))))} Z`, { fill: 'url(#rvMetal)', stroke: '#0f172a', 'stroke-width': .9 });
    el('circle', { cx: tp(Pk).x, cy: tp(Pk).y, r: 3.8, fill: '#0f172a' }, g);
    el('rect', { x: tp(S).x - 5, y: tp(S).y - 4, width: 10, height: 8, rx: 2, fill: '#0f172a' }, g);
    L(add(S, P(-mw - 1, 4)), P(-mw - 1, -70), { stroke: '#ef4444', 'stroke-width': 1.3 });
    // palanga: boşken sarkar (bumba palanganın sınırının altında), yüklüyken gergin ve koyu kırmızı
    const V1max = add(G, mul(P(Math.cos(rad(m.maxLift)), -Math.sin(rad(m.maxLift))), VL));
    const slack = Math.max(0, len(sub(tp(V1max), tp(V0L))) - len(sub(tp(V1), tp(V0L))));
    const sag = Math.min(14, Math.sqrt(slack) * 3.6);
    const loadC = m.load > 0.6 ? '#dc2626' : m.load > 0.05 ? '#f97316' : '#fca5a5';
    const vn = unit(P(-(V1.y - V0L.y), V1.x - V0L.x));
    for (const o of [-2.2, 0, 2.2]) {
      const a = add(V0L, mul(vn, o)), b = add(V1, mul(vn, o)), mm = add(mix(a, b, .5), P(sag, sag * .45));
      el('path', { d: `M${pt(tp(a))} Q${pt(tp(mm))} ${pt(tp(b))}`, fill: 'none', stroke: loadC, 'stroke-width': 1.2 + m.load * 1.1 }, g);
    }
    for (const q of [V0L, V1]) { el('circle', { cx: tp(q).x, cy: tp(q).y, r: 4.6, fill: '#0f172a' }, g); el('circle', { cx: tp(q).x, cy: tp(q).y, r: 1.8, fill: '#94a3b8' }, g); }
    return { C: tp(C), G: tp(G), BE: tp(BE), MS: tp(MS), V0: tp(V0L) };
  }

  // elin yeri: parlayan halka + ok + kısa yazı
  function drawHand(g, s, r) {
    if (!s.hand) return;
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 260);
    const ring = (c, rr) => el('circle', { cx: c.x, cy: c.y, r: rr + pulse * 3, fill: 'rgba(253,224,71,.16)', stroke: '#fde047', 'stroke-width': 2.4 }, g);
    const tag = (x, y, txt, anchor) => { el('text', { x, y, 'text-anchor': anchor || 'middle', class: 'rig-tag' }, g).textContent = txt; };
    if (s.hand === 'sheet') {
      ring(HAND, 11);
      arrow(g, P(HAND.x + 26, HAND.y + 2), P(HAND.x + 26, HAND.y - 30), '#fde047');
      arrow(g, P(r.MS.x + 10, r.MS.y - 6), P(r.MS.x + 10, r.MS.y + 18), '#fde047', 2.4);
      tag(HAND.x + 26, HAND.y - 38, 'iskotayı al');
    } else if (s.hand === 'release') {
      ring(HAND, 11);
      arrow(g, P(HAND.x + 26, HAND.y - 30), P(HAND.x + 26, HAND.y + 2), '#fde047');
      tag(HAND.x + 26, HAND.y - 38, 'iskotayı kaçır');
    } else if (s.hand === 'boom') {
      const b = P(lerp(r.G.x, r.BE.x, .3), lerp(r.G.y, r.BE.y, .3));
      ring(b, 12);
      arrow(g, P(b.x, b.y - 58), P(b.x, b.y - 15), '#fde047', 3.6);
      tag(b.x, b.y - 66, 'bumbayı bastır');
    } else if (s.hand === 'vang') {
      const c = P(r.V0.x + 6, r.V0.y - 4);
      ring(c, 12);
      el('line', { x1: c.x - 10, y1: c.y + 10, x2: c.x - 34, y2: c.y + 34, stroke: '#fde047', 'stroke-width': 1.6 }, g);
      tag(c.x - 36, c.y + 50, 'palangayı al');
    } else if (s.hand === 'tiller') {
      const c = P(410, 390);
      ring(c, 11);
      tag(c.x, c.y - 22, 'kafa aç');
    }
  }

  // üstten küçük kesit: bumba ve yelken tepesi; aradaki açı = tepe açılması (twist)
  function drawTwist(g, m) {
    const cx = 474, cy = 30, R = 32;
    el('circle', { cx, cy, r: R + 8, fill: 'rgba(9,20,33,.75)', stroke: 'rgba(148,178,208,.3)' }, g);
    const dir = a => P(cx + Math.sin(rad(a)) * R, cy + Math.cos(rad(a)) * R);   // 0° = kıça doğru (aşağı)
    el('line', { x1: cx, y1: cy - R + 4, x2: cx, y2: cy + R - 4, stroke: 'rgba(255,255,255,.2)', 'stroke-dasharray': '2 3' }, g);
    const bo = dir(-Math.min(80, m.out)), top = dir(-Math.min(88, m.out + m.twist));
    el('line', { x1: cx, y1: cy, x2: bo.x, y2: bo.y, stroke: '#94a3b8', 'stroke-width': 3.4, 'stroke-linecap': 'round' }, g);
    el('line', { x1: cx, y1: cy, x2: top.x, y2: top.y, stroke: m.twist > 14 ? '#fb923c' : '#38bdf8', 'stroke-width': 2.4, 'stroke-dasharray': '4 3', 'stroke-linecap': 'round' }, g);
    el('circle', { cx, cy, r: 2.6, fill: '#e2e8f0' }, g);
    el('text', { x: cx, y: cy + R + 22, 'text-anchor': 'middle', class: 'rig-small' }, g).textContent = 'üstten';
  }

  // ---------- panel ----------
  let panel = null, svg = null, rig = null, minimized = false;
  const KEY = 'ps.rigPanel.min';
  function mount(p) {
    panel = p;
    panel.innerHTML = `
      <div class="rig-head">
        <span class="rig-title">Yandan görünüş</span>
        <span class="rig-kn" id="rigKn"></span>
        <button class="rig-min" id="rigMin" type="button" aria-label="Paneli küçült" title="Küçült / büyüt"></button>
      </div>
      <ol class="rig-steps" id="rigSteps"></ol>
      <svg class="rig-svg" viewBox="104 -46 412 512" preserveAspectRatio="xMidYMid meet" aria-label="Optimist donanımı yandan"></svg>
      <div class="rig-gauges">
        <div class="rg-row"><span class="rg-k">Palanga</span><span class="rg-bar"><i id="rgVang"></i><b id="rgVangMark"></b></span><span class="rg-v" id="rgVangTxt"></span></div>
        <div class="rg-row"><span class="rg-k">Bumba</span><span class="rg-v wide" id="rgBoom"></span></div>
        <div class="rg-row rg-legend" id="rgGhost"></div>
      </div>`;
    svg = panel.querySelector('svg');
    try { minimized = localStorage.getItem(KEY) === '1'; } catch (e) { minimized = false; }
    panel.classList.toggle('min', minimized);
    panel.querySelector('#rigMin').addEventListener('click', () => {
      minimized = !minimized; panel.classList.toggle('min', minimized);
      try { localStorage.setItem(KEY, minimized ? '1' : '0'); } catch (e) { /* yok */ }
    });
  }
  function show(r) {
    rig = r || null;
    if (!panel) return;
    panel.classList.toggle('hidden', !rig);
    if (!rig) return;
    const strong = rig.kn >= 12;
    panel.querySelector('#rigKn').textContent = `${rig.kn} KN · ${rig.label || (strong ? 'ORTA-SERT' : 'HAFİF')}`;
    panel.querySelector('#rigKn').classList.toggle('strong', strong);
    const ol = panel.querySelector('#rigSteps'); ol.innerHTML = '';
    (rig.steps || []).forEach((s, i) => { const li = document.createElement('li'); li.innerHTML = `<b>${i + 1}</b><span>${s}</span>`; ol.appendChild(li); });
    panel.querySelector('#rgGhost').innerHTML = rig.ghost ? `<span class="dash"></span>${rig.ghost.label}` : '';
  }
  function draw(t) {
    if (!rig || !svg) return;
    const windK = rig.windK || (rig.kn >= 12 ? 1 : 0.6);
    const s = stateAt(rig.keys, t), m = model(s, windK);
    svg.innerHTML = '';
    defs(svg);
    const g = el('g', {}, svg);
    el('rect', { x: 0, y: 420, width: 700, height: 200, fill: 'rgba(56,189,248,.12)' }, g);
    el('line', { x1: 0, y1: 420, x2: 700, y2: 420, stroke: 'rgba(125,211,252,.5)', 'stroke-width': 1 }, g);
    const gRig = el('g', {}, g), gHull = el('g', {}, g), gTop = el('g', {}, g);
    drawHull(gHull);
    const r = drawRig(gRig, m, s, false);
    // karşılaştırma yelkeni yalnız gerçekten farklıysa (bumba kalkışı ya da tepe açılması belirgin ayrıysa) üstte çizilir
    if (rig.ghost && t >= (rig.ghost.from || 0)) {
      const gs = stateAt(rig.ghost.keys, t);
      if (gs) {
        const gm = model(gs, windK);
        if (Math.abs(gm.lift - m.lift) > 2.5 || Math.abs(gm.twist - m.twist) > 3) {
          const gr = drawRig(gTop, gm, gs, true);
          el('text', { x: gr.C.x + 8, y: gr.C.y - 6, class: 'rig-ghost' }, gTop).textContent = rig.ghost.short || 'B';
        }
      }
    }
    drawHand(gTop, s, r);
    drawTwist(gTop, m);
    // adım şeridi
    [...panel.querySelectorAll('#rigSteps li')].forEach((li, i) => { li.classList.toggle('on', i === s.p); li.classList.toggle('done', i < s.p); });
    // göstergeler
    const vb = panel.querySelector('#rgVang');
    vb.style.width = `${Math.round(s.vang * 100)}%`;
    const mk = rig.mark != null ? rig.mark : null;
    const vm = panel.querySelector('#rgVangMark'); vm.style.display = mk == null ? 'none' : ''; if (mk != null) vm.style.left = `${Math.round(mk * 100)}%`;
    const word = s.vang > 0.8 ? 'sıkı' : s.vang > 0.6 ? 'gergin' : s.vang > 0.4 ? 'boşluğu alınmış' : 'gevşek';
    const st = m.load > 0.05 ? ' · bumbayı tutuyor' : ' · halat boşta';
    panel.querySelector('#rgVangTxt').textContent = word + st;
    const lift = Math.round(m.lift);
    panel.querySelector('#rgBoom').textContent = `${lift > 0 ? '▲ ' + lift + '° kalkık' : lift < 0 ? '▼ bastırıldı' : 'yatay'} · açı ${Math.round(m.out)}° · tepe açılması ${Math.round(m.twist)}°`;
  }

  global.SailRigView = { mount, show, draw, stateAt, model };
})(typeof window !== 'undefined' ? window : globalThis);
