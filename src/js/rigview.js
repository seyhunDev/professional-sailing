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

  // ---------- çizim ----------
  const MAST = { x0: 104, y0: 224, x1: 113, y1: 34 };            // direk dibi → tepe (hafif kıça eğik)
  const mastX = y => lerp(MAST.x0, MAST.x1, (MAST.y0 - y) / (MAST.y0 - MAST.y1));
  const G = P(mastX(194), 194);                                  // bumba çatalı (gooseneck)
  const TH = P(mastX(44), 44);                                   // yelkenin tepe-direk köşesi (throat)
  const SN = P(mastX(150), 150);                                 // gırcala halatı (snotter)
  const V0 = P(mastX(212) + 4, 212);                             // palanga alt makarası (direk dibi)
  const LB = 178, LV = 40;                                       // bumba boyu, palanga bumbadaki noktası

  function rigGeom(m) {
    const p = 0.3 + 0.7 * Math.cos(rad(m.out));                  // yandan bakınca açılan bumba kısalır
    const pTop = 0.3 + 0.7 * Math.cos(rad(Math.min(88, m.out + m.twist)));
    const at = (len, lift) => P(G.x + len * Math.cos(rad(lift)) * p, G.y - len * Math.sin(rad(lift)));
    const C = at(LB, m.lift);
    const PK = P(TH.x + 150 * pTop, TH.y - 26 + Math.max(0, m.lift) * 0.4);
    const V1 = at(LV, m.lift);
    const V1max = at(LV, m.maxLift);
    const len = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const slack = Math.max(0, len(V0, V1max) - len(V0, V1));      // palanga boşluğu (px)
    const MS = at(LB * 0.8, m.lift);                             // iskota bumbada
    return { C, PK, V1, slack, MS, p };
  }

  function drawHull(g) {
    // Optimist: küt baş aynası solda, kıç aynası sağda; sert kine
    el('path', { d: 'M38,214 Q170,219 304,216 L297,247 Q180,262 74,248 Q52,243 44,233 Z', fill: '#e2e8f0', stroke: '#0b1724', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }, g);
    el('path', { d: 'M38,214 L44,233 L54,233 L48,215 Z', fill: '#cbd5e1', stroke: '#0b1724', 'stroke-width': .8 }, g);
    el('path', { d: 'M48,229 Q180,240 299,233', fill: 'none', stroke: '#94a3b8', 'stroke-width': 1 }, g);
    el('path', { d: 'M38,214 Q170,219 304,216', fill: 'none', stroke: '#1e293b', 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    // salma ve dümen
    el('path', { d: 'M168,252 L166,286 Q167,291 174,291 L182,291 Q186,290 185,284 L185,253 Z', fill: '#94a3b8', stroke: '#0b1724', 'stroke-width': 1 }, g);
    el('path', { d: 'M301,222 L318,222 Q326,258 318,282 Q313,288 305,285 L302,248 Z', fill: '#94a3b8', stroke: '#0b1724', 'stroke-width': 1 }, g);
  }

  function arrow(g, a, b, color, w) {
    const ang = Math.atan2(b.y - a.y, b.x - a.x), hl = 8;
    el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: color, 'stroke-width': w || 2.6, 'stroke-linecap': 'round' }, g);
    el('path', { d: `M${pt(b)} L${pt(P(b.x - hl * Math.cos(ang - .5), b.y - hl * Math.sin(ang - .5)))} L${pt(P(b.x - hl * Math.cos(ang + .5), b.y - hl * Math.sin(ang + .5)))} Z`, fill: color }, g);
  }

  function drawRig(g, m, s, ghost) {
    const r = rigGeom(m);
    const now = performance.now() / 1000;
    if (ghost) {
      // karşılaştırma (yapılmasaydı): yalnız bumba ve arka yaka, kesikli kırmızı
      const d = `M${pt(TH)} L${pt(r.PK)} Q${pt(P((r.PK.x + r.C.x) / 2 + 10, (r.PK.y + r.C.y) / 2))} ${pt(r.C)} L${pt(G)}`;
      el('path', { d, fill: 'none', stroke: '#f87171', 'stroke-width': 1.8, 'stroke-dasharray': '6 5', opacity: .9 }, g);
      el('line', { x1: G.x, y1: G.y, x2: r.C.x, y2: r.C.y, stroke: '#f87171', 'stroke-width': 3, 'stroke-dasharray': '6 5', opacity: .9 }, g);
      return r;
    }
    // ana iskota: bumbadan kıç taraftaki makaraya, oradan sporcunun eline
    const BLK = P(262, 214), HAND = P(214, 200);
    el('line', { x1: r.MS.x, y1: r.MS.y, x2: BLK.x, y2: BLK.y, stroke: '#e2e8f0', 'stroke-width': 1.6 }, g);
    el('path', { d: `M${pt(BLK)} Q${pt(P(238, 214 - 2 + (1 - s.sheet) * 8))} ${pt(HAND)}`, fill: 'none', stroke: '#e2e8f0', 'stroke-width': 1.6 }, g);
    el('circle', { cx: BLK.x, cy: BLK.y, r: 3.2, fill: '#0f172a' }, g);
    // direk
    el('path', { d: `M${MAST.x0 - 3.2},${MAST.y0} L${MAST.x1 - 2.4},${MAST.y1} L${MAST.x1 + 2.4},${MAST.y1} L${MAST.x0 + 3.2},${MAST.y0} Z`, fill: '#cbd5e1', stroke: '#0f172a', 'stroke-width': 1 }, g);
    // yelken
    const TK = P(mastX(190), 190);
    const bulge = 10 + m.twist * 0.5;
    const L1 = P((r.PK.x + r.C.x) / 2 + bulge * 0.6, (r.PK.y + r.C.y) / 2 + 2);
    const sail = `M${pt(TK)} L${pt(TH)} L${pt(r.PK)} Q${pt(L1)} ${pt(r.C)} Z`;
    el('path', { d: sail, fill: 'rgba(241,245,249,.92)', stroke: '#0b1724', 'stroke-width': 1.4, 'stroke-linejoin': 'round' }, g);
    // tepe açıklığı göstergesi: arka yakanın üst kısmı, twist arttıkça turuncuya döner
    const tw = clamp((m.twist - 6) / 18, 0, 1);
    el('path', { d: `M${pt(r.PK)} Q${pt(P(lerp(r.PK.x, L1.x, .6), lerp(r.PK.y, L1.y, .6)))} ${pt(P(lerp(r.PK.x, r.C.x, .45), lerp(r.PK.y, r.C.y, .45)))}`, fill: 'none', stroke: tw > 0.45 ? '#fb923c' : '#38bdf8', 'stroke-width': 3, opacity: .55 + .35 * tw, 'stroke-linecap': 'round' }, g);
    // arka yaka şeritleri
    [0.3, 0.6].forEach((f, i) => {
      const a = P(lerp(r.PK.x, r.C.x, f), lerp(r.PK.y, r.C.y, f));
      const fl = Math.sin(now * 6 + i * 1.7) * 2.5;
      el('path', { d: `M${pt(a)} q9,${(fl * .4).toFixed(1)} 15,${fl.toFixed(1)}`, fill: 'none', stroke: '#f472b6', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, g);
    });
    // gırcala
    el('line', { x1: SN.x, y1: SN.y, x2: r.PK.x, y2: r.PK.y, stroke: '#64748b', 'stroke-width': 2.6, 'stroke-linecap': 'round' }, g);
    el('circle', { cx: r.PK.x, cy: r.PK.y, r: 3, fill: '#0f172a' }, g);
    // bumba
    el('line', { x1: G.x, y1: G.y, x2: r.C.x, y2: r.C.y, stroke: '#94a3b8', 'stroke-width': 4.4, 'stroke-linecap': 'round' }, g);
    el('line', { x1: G.x, y1: G.y, x2: r.C.x, y2: r.C.y, stroke: '#0f172a', 'stroke-width': .8, opacity: .6 }, g);
    el('rect', { x: G.x - 5, y: G.y - 4, width: 10, height: 8, rx: 2, fill: '#1e293b' }, g);
    // palanga: 3 kat halat; boşken sarkar, yüklüyken gergin ve kalın
    const loadC = m.load > 0.6 ? '#ef4444' : m.load > 0.05 ? '#f97316' : '#fca5a5';
    const sag = Math.min(16, Math.sqrt(r.slack) * 4.2);
    const dx = r.V1.x - V0.x, dy = r.V1.y - V0.y, dl = Math.hypot(dx, dy) || 1, nx = -dy / dl, ny = dx / dl;
    for (const o of [-2, 0, 2]) {
      const a = P(V0.x + nx * o, V0.y + ny * o), b = P(r.V1.x + nx * o, r.V1.y + ny * o);
      const mid = P((a.x + b.x) / 2 + sag * 0.8, (a.y + b.y) / 2 + sag * 0.6);
      el('path', { d: `M${pt(a)} Q${pt(mid)} ${pt(b)}`, fill: 'none', stroke: loadC, 'stroke-width': 1.1 + m.load * 0.9 }, g);
    }
    for (const q of [V0, r.V1]) { el('circle', { cx: q.x, cy: q.y, r: 4, fill: '#0f172a' }, g); el('circle', { cx: q.x, cy: q.y, r: 1.5, fill: '#94a3b8' }, g); }
    // palanga kurtağzı (cleat) ve halat ucu
    el('rect', { x: V0.x + 6, y: V0.y + 2, width: 9, height: 4, rx: 1, fill: '#0f172a' }, g);
    // yeke ve uzatma
    el('path', { d: 'M304,214 L250,207', stroke: '#a16207', 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    el('path', { d: 'M250,207 L196,198', stroke: '#0f172a', 'stroke-width': 2.4, 'stroke-linecap': 'round' }, g);
    return { ...r, HAND };
  }

  // elin yeri: parlayan halka + ok + kısa yazı
  function drawHand(g, s, r, m) {
    if (!s.hand) return;
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 260);
    const ring = (c, rr) => el('circle', { cx: c.x, cy: c.y, r: rr + pulse * 3, fill: 'rgba(253,224,71,.16)', stroke: '#fde047', 'stroke-width': 2 }, g);
    const tag = (x, y, txt, anchor) => {
      const t = el('text', { x, y, 'text-anchor': anchor || 'middle', class: 'rig-tag' }, g); t.textContent = txt;
    };
    if (s.hand === 'sheet') {
      ring(r.HAND, 9);
      arrow(g, P(r.HAND.x + 4, r.HAND.y - 26), P(r.HAND.x + 4, r.HAND.y - 50), '#fde047');
      arrow(g, P(r.MS.x, r.MS.y - 4), P(r.MS.x, r.MS.y + 14), '#fde047', 2);
      tag(r.HAND.x + 4, r.HAND.y - 56, 'iskotayı çek');
    } else if (s.hand === 'release') {
      ring(r.HAND, 9);
      arrow(g, P(r.HAND.x - 4, r.HAND.y - 50), P(r.HAND.x - 4, r.HAND.y - 26), '#fde047');
      tag(r.HAND.x, r.HAND.y - 56, 'iskotayı kaçır');
    } else if (s.hand === 'boom') {
      const b = P(lerp(G.x, r.C.x, .35), lerp(G.y, r.C.y, .35));
      ring(b, 10);
      arrow(g, P(b.x, b.y - 46), P(b.x, b.y - 12), '#fde047', 3);
      tag(b.x, b.y - 52, 'bumbayı bastır');
    } else if (s.hand === 'vang') {
      const c = P(V0.x + 10, V0.y + 4);
      ring(c, 9);
      tag(c.x + 18, c.y + 30, 'palangayı al', 'start');
      el('line', { x1: c.x + 6, y1: c.y + 8, x2: c.x + 16, y2: c.y + 20, stroke: '#fde047', 'stroke-width': 1.4 }, g);
    } else if (s.hand === 'tiller') {
      const c = P(262, 209);
      ring(c, 9);
      tag(c.x, c.y - 24, 'kafa aç');
    }
  }

  // üstten küçük kesit: bumba (alt) ve yelkenin tepesi; aradaki açı = tepe açılması (twist)
  function drawTwist(g, m) {
    const cx = 372, cy = 46, R = 34;
    el('circle', { cx, cy, r: R + 8, fill: 'rgba(9,20,33,.7)', stroke: 'rgba(148,178,208,.25)' }, g);
    const dir = a => P(cx + Math.sin(rad(a)) * R, cy + Math.cos(rad(a)) * R);   // 0° = kıça doğru (aşağı)
    el('line', { x1: cx, y1: cy - R + 4, x2: cx, y2: cy + R - 4, stroke: 'rgba(255,255,255,.18)', 'stroke-dasharray': '2 3' }, g);
    const bo = dir(-Math.min(80, m.out)), tp = dir(-Math.min(88, m.out + m.twist));
    el('line', { x1: cx, y1: cy, x2: bo.x, y2: bo.y, stroke: '#94a3b8', 'stroke-width': 3, 'stroke-linecap': 'round' }, g);
    el('line', { x1: cx, y1: cy, x2: tp.x, y2: tp.y, stroke: m.twist > 14 ? '#fb923c' : '#38bdf8', 'stroke-width': 2.2, 'stroke-dasharray': '4 3', 'stroke-linecap': 'round' }, g);
    el('circle', { cx, cy, r: 2.5, fill: '#e2e8f0' }, g);
    const t = el('text', { x: cx, y: cy + R + 20, 'text-anchor': 'middle', class: 'rig-small' }, g); t.textContent = 'üstten';
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
      <svg class="rig-svg" viewBox="20 0 400 300" preserveAspectRatio="xMidYMid meet" aria-label="Optimist donanımı yandan"></svg>
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
    const g = el('g', {}, svg);
    // su
    el('rect', { x: 0, y: 238, width: 440, height: 70, fill: 'rgba(56,189,248,.12)' }, g);
    el('line', { x1: 0, y1: 238, x2: 440, y2: 238, stroke: 'rgba(125,211,252,.5)', 'stroke-width': 1 }, g);
    drawHull(g);
    const r = drawRig(g, m, s, false);
    // karşılaştırma yelkeni yalnız gerçekten farklıysa (bumba kalkışı ya da tepe açılması belirgin ayrıysa) üstte çizilir
    if (rig.ghost && t >= (rig.ghost.from || 0)) {
      const gs = stateAt(rig.ghost.keys, t);
      if (gs) {
        const gm = model(gs, windK);
        if (Math.abs(gm.lift - m.lift) > 2.5 || Math.abs(gm.twist - m.twist) > 3) {
          const gr = drawRig(g, gm, gs, true);
          const lb = el('text', { x: gr.C.x + 8, y: gr.C.y - 4, class: 'rig-ghost' }, g); lb.textContent = rig.ghost.short || 'B';
        }
      }
    }
    drawHand(g, s, r, m);
    drawTwist(g, m);
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
