/* Professional Sailing – taktik animasyon motoru
   Koordinatlar: SVG, y aşağı doğru. Pusula: 0° = ekranın üstü (kuzey), 90° = sağ.
   windFrom: rüzgarın GELDİĞİ yön. heading: teknenin baktığı yön.
   TWA = heading - windFrom.  TWA < 0 → sancak kontra (rüzgar sancaktan), bumba iskeleye açılır.
*/
(function (global) {
  const DEG = Math.PI / 180;
  const norm180 = a => { a = ((a + 180) % 360 + 360) % 360 - 180; return a; };
  const norm360 = a => ((a % 360) + 360) % 360;
  const lerp = (a, b, k) => a + (b - a) * k;
  const lerpAngle = (a, b, k) => a + norm180(b - a) * k;
  const fwd = h => ({ x: Math.sin(h * DEG), y: -Math.cos(h * DEG) });

  // ---------- Rüzgar ----------
  function windAt(wind, t) {
    if (typeof wind === 'number') return wind;
    if (typeof wind === 'function') return wind(t);
    const ks = wind;
    if (t <= ks[0].t) return ks[0].from;
    for (let i = 1; i < ks.length; i++) {
      if (t <= ks[i].t) {
        const k = (t - ks[i - 1].t) / (ks[i].t - ks[i - 1].t);
        // yumuşak geçiş
        const s = k * k * (3 - 2 * k);
        return lerpAngle(ks[i - 1].from, ks[i].from, s);
      }
    }
    return ks[ks.length - 1].from;
  }

  const CLOSE_HAULED = 45;   // orsa açısı
  const RUN = 150;           // pupa VMG açısı (tam pupa 180)

  function tackHeading(windFrom, tack, angle) {
    angle = angle == null ? CLOSE_HAULED : angle;
    return tack === 'starboard' ? windFrom - angle : windFrom + angle;
  }
  function runHeading(windFrom, tack, angle) {
    angle = angle == null ? RUN : angle;
    // pupada sancak kontra: rüzgar sancak kıçtan → heading = windFrom - 150
    return tack === 'starboard' ? windFrom - angle : windFrom + angle;
  }

  // ---------- Hız modeli (göreli, px/s) ----------
  function speedFor(twaAbs, base) {
    if (twaAbs < 30) return base * 0.15;          // rüzgara karşı: durur
    if (twaAbs < 40) return base * 0.55;          // çok orsa (pinch)
    if (twaAbs < 60) return base;                 // orsa
    if (twaAbs < 120) return base * 1.15;         // apaz – en hızlı
    if (twaAbs < 165) return base * 1.0;          // geniş apaz
    return base * 0.8;                            // tam pupa
  }

  // ---------- Engel kaçınma ----------
  // Senaryodaki şamandıralar, pin ve hakem botu: [{x,y,r}]
  function obstaclesOf(scn) {
    const o = [];
    for (const m of scn.marks || []) o.push({ x: m.x, y: m.y, r: 14 });
    if (scn.line) { o.push({ x: scn.line.pin.x, y: scn.line.pin.y, r: 14 }); o.push({ x: scn.line.boat.x, y: scn.line.boat.y - 4, r: 38 }); }
    return o;
  }
  // Önümüzde engel varsa kaçınma yönü: +1 sağa dön, -1 sola dön, 0 yok
  function avoidDir(x, y, h, obstacles, v) {
    const f = fwd(h), r = { x: Math.cos(h * DEG), y: Math.sin(h * DEG) };   // sağ yön
    const look = 40 + Math.max(0, v || 0) * 1.2;                              // ileri bakış (px)
    let best = 0, bestAlong = 1e9;
    for (const o of obstacles || []) {
      const dx = o.x - x, dy = o.y - y;
      const along = dx * f.x + dy * f.y, across = dx * r.x + dy * r.y;
      const margin = o.r + 16;
      if (along > -10 && along < look && Math.abs(across) < margin && along < bestAlong) {
        bestAlong = along; best = across >= 0 ? -1 : 1;                      // engel sağdaysa sola dön
      }
    }
    return best;
  }

  // ---------- Rota üretici ----------
  // segs: [{mode:'closehauled'|'run'|'heading'|'hold', tack, h, dur, turn, speed, angle}]
  // Örnekleme adımı DT ile konum/heading entegre edilir; sonuç: [{t,x,y,h}]
  const DT = 0.05;
  function buildTrack(scn, start, segs, opts) {
    opts = opts || {};
    const base = opts.baseSpeed || scn.baseSpeed || 55;
    const samples = [];
    let x = start.x, y = start.y, h = start.h, t = 0;
    let v = opts.v0 || 0;                 // mevcut hız (ivme için)
    const TAU = opts.tau || scn.tau || 1.5;   // hızlanma zaman sabiti (s); küçük tekneler için scn.tau ≈ 1.0
    const obstacles = opts.obstacles || obstaclesOf(scn);
    let avoid = 0;                        // engel kaçınma açısı (derece), zamanla sıfıra döner
    const t0 = opts.t0 || 0;
    // t0'dan önce yerinde bekle
    samples.push({ t: 0, x, y, h });
    if (t0 > 0) { samples.push({ t: t0, x, y, h }); t = t0; }
    for (const seg of segs) {
      const turn = seg.turn == null ? 1.2 : seg.turn;
      const hStart = h;
      const tStart = t;
      const tEnd = t + seg.dur;
      while (t < tEnd - 1e-9) {
        const w = windAt(scn.wind, t);
        let target;
        if (seg.mode === 'closehauled') target = tackHeading(w, seg.tack, seg.angle);
        else if (seg.mode === 'run') target = runHeading(w, seg.tack, seg.angle);
        else if (seg.mode === 'hold') target = seg.h != null ? seg.h : w; // rüzgara karşı dur
        else target = seg.h;
        const k = turn > 0 ? Math.min(1, (t - tStart) / turn) : 1;
        h = lerpAngle(hStart, target, k);
        // dönüş bitince hedefi takip et (rüzgar değişirse rota değişir)
        if (k >= 1) h = target;
        const twa = Math.abs(norm180(h - w));
        let vt = speedFor(twa, base) * (seg.speed == null ? 1 : seg.speed);
        if (seg.mode === 'hold') vt = base * (seg.speed == null ? 0.1 : seg.speed);
        v += (vt - v) * Math.min(1, DT / TAU);
        // engel kaçınma: önümüzde şamandıra/hakem botu varsa yana kaç, sonra rotaya dön
        const dir = avoidDir(x, y, h + avoid, obstacles, v);
        if (dir !== 0) avoid = Math.max(-45, Math.min(45, avoid + dir * 160 * DT));
        else avoid += (0 - avoid) * Math.min(1, DT / 0.5);
        const hUsed = h + avoid;
        const f = fwd(hUsed);
        x += f.x * v * DT; y += f.y * v * DT;
        t += DT;
        samples.push({ t, x, y, h: hUsed, v, note: seg.note || '' });
      }
    }
    return samples;
  }

  function sampleTrack(track, t) {
    if (t <= track[0].t) return track[0];
    const last = track[track.length - 1];
    if (t >= last.t) return last;
    // ikili arama
    let lo = 0, hi = track.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (track[m].t <= t) lo = m; else hi = m; }
    const a = track[lo], b = track[hi];
    const k = (t - a.t) / (b.t - a.t);
    return { t, x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), h: lerpAngle(a.h, b.h, k), v: a.v != null && b.v != null ? lerp(a.v, b.v, k) : a.v, note: a.note };
  }

  // ---------- Yelken geometrisi ----------
  function sailState(h, windFrom) {
    const twa = norm180(h - windFrom);
    const abs = Math.abs(twa);
    const tack = twa < 0 ? 'starboard' : 'port';
    // bumba merkez hattına göre açı
    let boom;
    if (abs < 30) boom = 0;                               // rüzgara karşı – yelken boş
    else boom = 10 + Math.max(0, abs - 45) / 135 * 75;    // 45°→10°, 180°→85°
    boom = Math.min(boom, 88);
    const side = tack === 'starboard' ? -1 : 1;           // -1: bumba iskeleye (sol)
    return { twa, abs, tack, boom, side, luffing: abs < 30 };
  }

  // ---------- Yelken pozu (bekleyen/yavaş teknede pırpırlama) ----------
  // opts: { v, base, t, seed }. Yavaş tekne (v/base küçük) yelkeni boşaltmış sayılır:
  //  - rüzgara tam dönükse bumba ortada, iki yana sallanır;
  //  - baş rüzgardan biraz açıksa bumba rüzgar yönünde (rüzgaraltına) uzanır ve yelken pırpırlar.
  // Dönen: { beta (bumba açısı, + sağa / − sola, derece), flutter (0..1), belly (yelken karnı, px, + sağa) }
  function sailPose(h, windFrom, opts) {
    opts = opts || {};
    const st = sailState(h, windFrom);
    const t = opts.t || 0, seed = opts.seed || 0;
    const base = opts.base || 55;
    let slack = 0;
    if (opts.v != null) slack = Math.max(0, Math.min(1, (0.45 - opts.v / base) / 0.3)); // v ≤ %15 → tamamen boş, ≥ %45 → trimli
    if (st.abs > 100) slack *= Math.max(0, 1 - (st.abs - 100) / 40);                   // pupada boş yelken de dolu durur
    const trim = st.luffing ? 0 : st.boom;
    const stream = Math.min(st.abs, 85);                                               // boş yelken rüzgarla hizalanır
    let mag = trim + (stream - trim) * slack;
    let beta = st.side * mag;
    // rüzgara tam dönük: bumba iki yana sallanır
    const headUp = Math.max(0, 1 - st.abs / 18) * Math.max(slack, st.luffing ? 0.6 : 0);
    beta += headUp * 16 * Math.sin(t * 2.4 + seed);
    const flutter = Math.max(slack, st.luffing ? 0.8 : 0);
    beta += flutter * 2.5 * Math.sin(t * 13 + seed * 1.7);                              // bumba ucunda titreme
    const belly = st.side * 9 * (1 - flutter);
    return { beta, flutter, belly, slack, sail: st };
  }
  // Yelken çizimi (tekne yerel koordinatı: baş −y). Dönen: { d (yelken yolu), tip {x,y} }
  function sailShape(pose, t, seed, L, my) {
    L = L || 27; my = my == null ? -6 : my;
    const b = pose.beta * DEG;
    const tx = Math.sin(b) * L, ty = my + Math.cos(b) * L;
    const nx = Math.cos(b), ny = -Math.sin(b);                 // bumbaya dik (sağ yön, beta=0 iken +x)
    const ph = t * 22 + (seed || 0);
    const A = 7 * pose.flutter;
    const o1 = pose.belly * 1.1 + A * Math.sin(ph), o2 = pose.belly * 0.9 - A * Math.sin(ph + 1.4);
    const c1x = tx / 3 + nx * o1, c1y = my + (ty - my) / 3 + ny * o1;
    const c2x = tx * 2 / 3 + nx * o2, c2y = my + (ty - my) * 2 / 3 + ny * o2;
    const f = v => v.toFixed(1);
    return { d: `M0,${my} C${f(c1x)},${f(c1y)} ${f(c2x)},${f(c2y)} ${f(tx)},${f(ty)} L0,${my} Z`, tip: { x: tx, y: ty } };
  }
  // ---------- Rüzgar gölgesi (pis rüzgar) – senaryolar, kural motoru ve simülatör ortak ----------
  // Her teknenin rüzgaraltında kısa bir koni: kıçtan yaklaşık 1 tekne boyu. İçindeki tekne yavaşlar.
  // along: rüzgaraltı yönünde tekne merkezinden uzaklık; half: o uzaklıkta koninin yarı genişliği.
  const SHADOW = { from: 12, len: 72, w0: 16, spread: 0.25, loss: 0.3 };
  // Yelkeni boş (bekleyen) tekne daha zayıf gölge yapar: 0.4 … 1
  function shadowStrength(v, base) {
    if (v == null) return 1;
    const rel = v / (base || 55);
    return 0.4 + 0.6 * Math.max(0, Math.min(1, (rel - 0.15) / 0.45));
  }
  // p noktası c teknesinin gölgesinde mi? 0..1 (gölge gücü hariç)
  function shadowOf(p, c, w) {
    const d = fwd(w + 180), r = fwd(w + 90);
    const dx = p.x - c.x, dy = p.y - c.y, along = dx * d.x + dy * d.y;
    if (along < SHADOW.from || along > SHADOW.len) return 0;
    const half = SHADOW.w0 + along * SHADOW.spread, lat = Math.abs(dx * r.x + dy * r.y);
    if (lat > half) return 0;
    const a = (along - SHADOW.from) / (SHADOW.len - SHADOW.from), l = lat / half;
    return (1 - 0.7 * a) * (1 - l * l);
  }
  // casters: [{x,y,v?,str?,ref?}] → { k (0..1, hız kaybı = SHADOW.loss·k), by (gölgeyi yapan) }
  function shadowK(p, casters, w, base) {
    let best = { k: 0, by: null };
    for (const c of casters) {
      if (c === p || (c.ref != null && c.ref === p.ref)) continue;
      const k = shadowOf(p, c, w) * (c.str != null ? c.str : shadowStrength(c.v, base));
      if (k > best.k) best = { k: Math.min(1, k), by: c.ref != null ? c.ref : c };
    }
    return best;
  }
  // Koninin çokgen noktaları (SVG points)
  function shadowPolygon(c, w) {
    const d = fwd(w + 180), r = fwd(w + 90), S = SHADOW;
    const p = (a, l) => `${(c.x + d.x * a + r.x * l).toFixed(1)},${(c.y + d.y * a + r.y * l).toFixed(1)}`;
    const h0 = S.w0 + S.from * S.spread, h1 = S.w0 + S.len * S.spread;
    return [p(S.from, -h0), p(S.from, h0), p(S.len, h1), p(S.len, -h1)].join(' ');
  }

  // ---------- Hakem botu (start hattının sağ ucu) ----------
  // Demirli motorlu tekne: demirde başını rüzgara verir; turuncu bayrak direği tam hat ucunda (0,0), bayrak rüzgaraltına dalgalanır.
  // el(tag, attrs, parent) çağıranın SVG üreticisi. Dönen grup (0,0) merkezli; konum/yön için
  // committeeBoatTransform(x, y, windFrom) kullanılır. Dalgalanma SMIL ile sürekli (oynatma dursa da).
  function flagWaveFrames(len, h, n) {
    const fr = [];
    for (let f = 0; f <= n; f++) {
      const ph = (f % n) / n * Math.PI * 2, top = [], bot = [];
      for (let i = 0; i <= 6; i++) {
        const u = i / 6, x = len * u * (1 - 0.06 * u * (1 + Math.sin(ph)));   // dalgada boy hafif kısalır
        const a = 5 * u * Math.sin(u * 2.4 * Math.PI - ph);                   // uca doğru büyüyen dalga
        const hh = h / 2 * (1 - 0.18 * u);                                      // uç biraz daralır
        top.push(`${x.toFixed(1)},${(a - hh).toFixed(1)}`);
        bot.unshift(`${x.toFixed(1)},${(a + hh).toFixed(1)}`);
      }
      fr.push('M' + top.join(' L') + ' L' + bot.join(' L') + ' Z');
    }
    return fr.join(';');
  }
  function drawCommitteeBoat(el, parent) {
    const g = el('g', { class: 'committee-boat' }, parent);
    // (0,0) = start hattının ucu: bayrak direği burada; gövde iskele küpeştesi direğe gelecek şekilde yana kayık
    const hg = el('g', { transform: 'translate(12,0)' }, g);
    // demir zinciri (rüzgarüstüne)
    el('path', { d: 'M0,-30 L0,-50', stroke: 'rgba(222,226,230,.7)', 'stroke-width': 1.2, 'stroke-dasharray': '2 2' }, hg);
    el('circle', { cx: 0, cy: -51, r: 1.8, fill: 'rgba(222,226,230,.8)' }, hg);
    // gölge ve gövde
    el('path', { d: 'M2,-28 C10,-22 14,-11 14,1 L14,25 Q14,30 9,30 L-5,30 Q-10,30 -10,25 L-10,1 C-10,-11 -6,-22 2,-28 Z', fill: 'rgba(0,0,0,.28)' }, hg);
    el('path', { d: 'M0,-32 C8,-25 12,-13 12,0 L12,24 Q12,28 8,28 L-8,28 Q-12,28 -12,24 L-12,0 C-12,-13 -8,-25 0,-32 Z', fill: '#f8f9fa', stroke: '#1d3557', 'stroke-width': 1.6 }, hg);
    // güverte (iç küpeşte çizgisi)
    el('path', { d: 'M0,-27.5 C6.4,-21.5 9.6,-11.5 9.6,0 L9.6,22 L-9.6,22 L-9.6,0 C-9.6,-11.5 -6.4,-21.5 0,-27.5 Z', fill: '#e9ecef', stroke: '#ced4da', 'stroke-width': .8 }, hg);
    el('rect', { x: -3, y: -19, width: 6, height: 5, rx: 1, fill: '#adb5bd' }, hg);                 // baş kaporta
    // kıç kokpit (tik) ve yüzme platformu
    el('rect', { x: -9.6, y: 9, width: 19.2, height: 13, fill: '#c69c6d' }, hg);
    for (const y of [12, 15, 18]) el('line', { x1: -9.6, y1: y, x2: 9.6, y2: y, stroke: '#a47148', 'stroke-width': .6 }, hg);
    el('rect', { x: -10, y: 28, width: 20, height: 4, rx: 1, fill: '#c69c6d', stroke: '#8d6440', 'stroke-width': .7 }, hg);
    // kaptan köşkü: beyaz çatı, ön cam, yan camlar
    el('rect', { x: -8, y: -9, width: 16, height: 17, rx: 4, fill: '#ffffff', stroke: '#868e96', 'stroke-width': 1 }, hg);
    el('path', { d: 'M-7.2,-6.5 Q0,-11 7.2,-6.5 L7.2,-3.5 Q0,-7.5 -7.2,-3.5 Z', fill: '#1d3557' }, hg);
    el('rect', { x: -8, y: -2, width: 1.6, height: 7, fill: '#1d3557' }, hg);
    el('rect', { x: 6.4, y: -2, width: 1.6, height: 7, fill: '#1d3557' }, hg);
    // hat ucundaki direkten rüzgaraltına dalgalanan turuncu bayrak
    const fl = el('g', { transform: 'rotate(90)' }, g);
    const fp = el('path', { fill: '#ff7a1a', stroke: '#c2410c', 'stroke-width': .9, 'stroke-linejoin': 'round' }, fl);
    const frames = flagWaveFrames(28, 15, 8);
    fp.setAttribute('d', frames.split(';')[0]);
    el('animate', { attributeName: 'd', values: frames, dur: '0.75s', repeatCount: 'indefinite', begin: '0s' }, fp);
    el('circle', { cx: 0, cy: 0, r: 2.4, fill: '#343a40', stroke: '#fff', 'stroke-width': 1 }, fl);  // direk = hat ucu
    return g;
  }
  const committeeBoatTransform = (x, y, windFrom) => `translate(${x},${y}) rotate(${norm360(windFrom).toFixed(1)})`;

  function seedOf(id) { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 1000; return h / 37; }

  global.SailEngine = {
    sailPose, sailShape, seedOf, drawCommitteeBoat, committeeBoatTransform,
    SHADOW, shadowStrength, shadowOf, shadowK, shadowPolygon,
    DEG, norm180, norm360, lerp, lerpAngle, fwd,
    windAt, tackHeading, runHeading, buildTrack, sampleTrack, sailState, speedFor, obstaclesOf, avoidDir,
    CLOSE_HAULED, RUN
  };
})(typeof window !== 'undefined' ? window : globalThis);
