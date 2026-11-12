/* Yarış simülatörü – çekirdek (DOM yok; node'da da çalışır)
   Kullanıcının yerleştirdiği tekneler start hattında bekler, sinyalde hattı geçer,
   orsa şamandırasına kendi taktikleriyle gider (layline'da tramola), şamandırayı iskeleden
   (saat yönünün tersine) döner ve bitirir. Rüzgar ve sağanaklar canlı değiştirilebilir.
   Kurallar: SailRules.decide (K10/11/12/14) her adımda, yarıştaki teknelere uygulanır.
*/
(function (global) {
  const E = global.SailEngine, R = global.SailRules;
  const DT = 0.05, HULL = 50;
  const WORLD = { w: 1000, h: 900 };
  const LINE = { pin: { x: 290, y: 740 }, boat: { x: 710, y: 740 } };
  const MARK = { x: 500, y: 90, label: 'Orsa şamandırası' };
  const BASE = 55, TAU = 1.2, HOLD_V = BASE * 0.04;
  const START_AT = 12;            // sn (simülasyon); sayaç clockScale ile 1:00 gösterir
  const CLOCK_SCALE = 5;
  const TURN_RATE = 110;          // derece/sn
  const GUST_GAIN = 0.25;         // sağanakta hız artışı
  const SHADOW_LEN = 4 * HULL;    // rüzgar gölgesi (pis rüzgar) boyu: 4 tekne boyu
  const SHADOW_LOSS = 0.3;        // gölgenin tam ortasında hız kaybı
  const KNOTS = 3.5 / BASE;       // px/s → knot (orsada 55 px/s ≈ 3.5 kn, Optimist)
  const MIN_TACK_GAP = 3;         // iki tramola arası en az (sn)
  const OBSTACLES = E.obstaclesOf({ marks: [MARK], line: LINE });
  const LINE_OBS = E.obstaclesOf({ line: LINE });           // pin + hakem botu
  const MARK_OBS = [{ x: MARK.x, y: MARK.y, r: 14 }];

  const PERSONAS = {
    sol: 'Sol taraf', orta: 'Orta', sag: 'Sağ taraf', saganak: 'Sağanak avcısı', manuel: 'Senin kararın'
  };

  const dot = (a, b) => a.x * b.x + a.y * b.y;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- Yardımcılar ----------
  // Şamandıranın iskeleden dönülmesi için geçiş noktası (şamandıranın rüzgarüstü-sağı)
  // Dönüş çemberi: tekne şamandıranın etrafında R_ROUND yarıçapla, şamandıra iskelesinde kalacak şekilde
  // (saat yönünün tersine) döner. Giriş noktası çemberin rüzgarüstü-sağında (rüzgara göre +60°).
  const R_ROUND = 38;
  function waypoint(w) {
    const f = E.fwd(w + 60);
    return { x: MARK.x + f.x * R_ROUND, y: MARK.y + f.y * R_ROUND };
  }
  // Teknenin şamandıra etrafındaki açısı (rüzgara göre): 0 = tam rüzgarüstü, +90 sağ, −90 sol, ±180 rüzgaraltı
  const markAngle = (b, w) => E.norm180(bearing(MARK, b) - w);
  function bearing(a, b) { return E.norm360(Math.atan2(b.x - a.x, -(b.y - a.y)) / E.DEG); }
  const lineSide = p => R.lineSide(LINE, p);     // +1: start tarafı (hattın altı)

  // Hızlanma: v0'dan orsa hızına çıkarken T saniyede alınan yol (tablo)
  const ACCEL = (() => { const out = [0]; let v = HOLD_V, s = 0; const vt = E.speedFor(45, BASE);
    for (let i = 1; i <= 400; i++) { v += (vt - v) * Math.min(1, DT / TAU); s += v * DT; out.push(s); } return out; })();
  function timeToCover(d) { for (let i = 0; i < ACCEL.length; i++) if (ACCEL[i] >= d) return i * DT; return 20 + (d - ACCEL[ACCEL.length - 1]) / BASE; }

  // Teknenin rotası boyunca start hattına mesafe (hattın içinden geçmiyorsa en yakın uca)
  function distToLine(b, h) {
    const f = E.fwd(h), p = LINE.pin, q = LINE.boat;
    const ex = q.x - p.x, ey = q.y - p.y;
    const den = f.x * ey - f.y * ex;
    if (Math.abs(den) > 1e-6) {
      const t = ((p.x - b.x) * ey - (p.y - b.y) * ex) / den;
      const u = ((p.x - b.x) * f.y - (p.y - b.y) * f.x) / den;
      if (t >= 0 && u >= 0 && u <= 1) return t;
    }
    return Math.min(Math.hypot(b.x - p.x, b.y - p.y), Math.hypot(b.x - q.x, b.y - q.y));
  }

  // Sağanak etkisi 0..1 (elips, rüzgar yönünde uzun; kenarda yumuşak)
  function gustAt(gusts, p, w) {
    let m = 0;
    const up = E.fwd(w), right = E.fwd(w + 90);
    for (const g of gusts) {
      const dx = p.x - g.x, dy = p.y - g.y;
      const a = (dx * right.x + dy * right.y) / g.rx, b = (dx * up.x + dy * up.y) / g.ry;
      const r = Math.hypot(a, b);
      if (r < 1) m = Math.max(m, r < 0.7 ? 1 : (1 - r) / 0.3);
    }
    return m;
  }

  // Rüzgar gölgesi: b, başka bir teknenin rüzgaraltındaki konide mi? {k: 0..1, by}
  function shadowAt(b, snap, w) {
    const down = E.fwd(w + 180), right = E.fwd(w + 90);
    let best = { k: 0, by: null };
    for (const o of snap) {
      if (o.ref === b || o.ref.phase === 'wait' || o.ref.phase === 'done') continue;
      const dx = b.x - o.x, dy = b.y - o.y, along = dx * down.x + dy * down.y;
      if (along < 12 || along > SHADOW_LEN) continue;
      const half = 16 + along * 0.22, lat = Math.abs(dx * right.x + dy * right.y);
      if (lat > half) continue;
      const k = (1 - along / SHADOW_LEN) * (1 - lat / half) * 1.6;
      if (k > best.k) best = { k: Math.min(1, k), by: o.ref };
    }
    return best;
  }
  const knots = v => v * KNOTS;

  // ---------- Kurulum ----------
  const COLORS = ['#c9d6e3', '#b8c7d6', '#aab9c9', '#d5dde6', '#bfcbd8', '#a3b3c4', '#cdd7e1', '#b0bfcf', '#dbe3ea', '#9fb0c3', '#c4d0dc', '#b4c3d2', '#d0d9e3', '#a8b8c8'];
  const MINE_COLOR = '#fb923c';
  const AUTO_PERSONAS = ['orta', 'sol', 'sag', 'saganak', 'orta', 'sol', 'orta', 'sag', 'saganak', 'sol', 'orta', 'sag', 'saganak', 'sol', 'orta', 'sag'];

  function makeBoat(i, pos, opts) {
    opts = opts || {};
    return {
      id: opts.id || String(i + 1), name: opts.name || `Tekne ${i + 1}`,
      color: opts.mine ? MINE_COLOR : COLORS[i % COLORS.length], mine: !!opts.mine,
      x: pos.x, y: pos.y, h: 0, v: HOLD_V, tack: opts.tack || 'starboard',
      persona: opts.persona || AUTO_PERSONAS[i % AUTO_PERSONAS.length], ignoresRules: !!opts.ignoresRules, penalties: 0, penaltyAt: null,
      phase: 'wait', go: false, man: null, manUntil: -1, note: '', noteUntil: -1, noteKind: '',
      lastTack: -10, finish: null, finishT: null, inGust: 0, gone: false, doneAt: null, ocsOnce: false
    };
  }

  // Varsayılan kalabalık: hattın 1-1.5 boy dibinde ön sıra + arkada 2. sıra
  function defaultFleet(n) {
    n = n || 12;
    const front = Math.min(n, Math.ceil(n * 0.7)), back = n - front;
    const boats = [];
    const P = LINE.pin, Q = LINE.boat;
    for (let k = 0; k < front; k++) {
      const u = 0.07 + (0.86 * k) / Math.max(1, front - 1);
      boats.push({ x: P.x + (Q.x - P.x) * u - 22, y: P.y + 58 });
    }
    for (let k = 0; k < back; k++) {
      const u = 0.18 + (0.64 * k) / Math.max(1, back - 1 || 1);
      boats.push({ x: P.x + (Q.x - P.x) * u - 40, y: P.y + 120 });
    }
    const mineIdx = Math.floor(front / 2);
    return boats.map((p, i) => makeBoat(i, p, i === mineIdx ? { mine: true, id: 'SEN', name: 'Senin teknen', persona: 'orta' } : null))
      .map((b, i) => { if (!b.mine) { b.id = String(i < mineIdx ? i + 1 : i); b.name = `Tekne ${b.id}`; } return b; });
  }

  function newRace(fleet, opts) {
    opts = opts || {};
    const w = opts.wind != null ? opts.wind : 0;
    const boats = fleet.map(b => ({ ...b, phase: 'wait', go: false, man: null, manUntil: -1, note: '', noteUntil: -1,
      lastTack: -10, finish: null, finishT: null, gone: false, doneAt: null, ocsOnce: false, sideDone: false, started: false, outside: false, penalties: 0, penaltyAt: null, penTurn: 0, penWait: false, penFinish: false, v: HOLD_V }));
    for (const b of boats) b.h = w + (b.tack === 'starboard' ? -25 : 25);
    return { t: 0, wind: w, gusts: (opts.gusts || []).map(g => ({ ...g })), boats, events: [], finished: 0, pairLog: {}, startAt: START_AT };
  }

  // ---------- Strateji: hangi kontrada olmak istiyor? ----------
  function wantedTack(b, s, w) {
    const wp = waypoint(w), up = E.fwd(w), right = E.fwd(w + 90);
    const rel = E.norm180(bearing(b, wp) - w);           // şamandıranın rüzgara göre kerterizi
    const along = dot({ x: wp.x - b.x, y: wp.y - b.y }, up);
    const lat = dot({ x: b.x - wp.x, y: b.y - wp.y }, right);   // + sağ taraf
    // layline: daha fazla gidersen şamandırayı aşarsın → dön
    if (b.tack === 'starboard' && rel >= 46) return 'port';
    if (b.tack === 'port' && rel <= -46) return 'starboard';
    // layline'dayken (şamandırayı tutuyorsa) dönme
    if (b.tack === 'starboard' && rel <= -40) return 'starboard';
    if (b.tack === 'port' && rel >= 40) return 'port';
    if (b.x < 70 && b.tack === 'starboard') return 'port';           // parkur kenarı
    if (b.x > WORLD.w - 70 && b.tack === 'port') return 'starboard';
    if (along < 110) return b.tack;
    let p = b.persona;
    if (p === 'saganak') {
      const g = s.gusts.length ? nearestGust(s.gusts, b, w) : null;
      if (g && dot({ x: wp.x - g.x, y: wp.y - g.y }, up) < along - 20) {
        const glat = dot({ x: g.x - wp.x, y: g.y - wp.y }, right);
        const half = Math.max(30, g.rx * 0.5);
        if (lat < glat - half) return 'port';
        if (lat > glat + half) return 'starboard';
        return b.tack;
      }
      p = 'orta';
    }
    // sol/sağ: o tarafa (parkurun kenarına yakın) kadar git, sonra dön
    const EDGE = 330;
    if (p === 'sol') { if (lat < -EDGE) b.sideDone = true; if (!b.sideDone) return 'starboard'; p = 'orta'; }
    if (p === 'sag') { if (lat > EDGE) b.sideDone = true; if (!b.sideDone) return 'port'; p = 'orta'; }
    if (p === 'manuel') return b.tack;
    const C = Math.max(40, along * 0.32);                // orta: daralan koridor
    if (lat < -C) return 'port';
    if (lat > C) return 'starboard';
    return b.tack;
  }
  function nearestGust(gusts, b, w) {
    let best = null, bd = 1e9;
    for (const g of gusts) { const d = Math.hypot(g.x - b.x, g.y - b.y); if (d < bd) { bd = d; best = g; } }
    return best;
  }

  function maneuverTarget(kind, w, tack, baseTarget) {
    const away = tack === 'starboard' ? -1 : 1;
    switch (kind) {
      case 'duck': return { h: E.tackHeading(w, tack) + away * 60, speed: 1 };
      case 'luff': return { h: w + away * 32, speed: 1 };
      case 'slow': return { h: baseTarget + away * 18, speed: 0.55 };
      case 'row': return { h: baseTarget, speed: 1 };
      case 'brake': return { h: baseTarget, speed: 0.45 };
      default: return { h: baseTarget, speed: 1 };
    }
  }
  function clearance(X, hCand, others) {
    let m = 1e9;
    for (const O of others) { const a = R.approach({ x: X.x, y: X.y, h: hCand, v: Math.max(X.v, 20) }, O); if (a.d < 260) m = Math.min(m, a.dmin); }
    return m;
  }

  function note(b, s, text, kind, dur) { b.note = text; b.noteKind = kind || ''; b.noteUntil = s.t + (dur || 2.5); }
  function log(s, text, kind, key) {
    if (key) { if (s.pairLog[key] != null && s.t - s.pairLog[key] < 5) return; s.pairLog[key] = s.t; }
    s.events.push({ t: s.t, text, kind: kind || '' });
  }
  function doTack(b, s, why) {
    b.tack = b.tack === 'starboard' ? 'port' : 'starboard'; b.lastTack = s.t;
    if (why) note(b, s, why, '', 1.6);
  }

  // ---------- Komutlar (senin teknen) ----------
  function command(s, cmd, arg) {
    const b = s.boats.find(x => x.mine); if (!b) return;
    if (cmd === 'tack') {
      if (b.phase === 'race' && s.t - b.lastTack > 1) { doTack(b, s, 'Tramola!'); b.persona = 'manuel'; log(s, `${b.id}: tramola (senin kararın)`); }
      else if (b.phase === 'wait') { b.tack = b.tack === 'starboard' ? 'port' : 'starboard'; }
    } else if (cmd === 'rules') { b.ignoresRules = !!arg; log(s, `${b.id}: ${arg ? 'artık yol vermiyor (kural bilmeyen)' : 'kurallara uyuyor'}`);
    } else if (cmd === 'persona') { b.persona = arg; log(s, `${b.id}: taktik → ${PERSONAS[arg]}`); }
  }

  // ---------- Yol hakkı (RRS Bölüm 2) ----------
  const tackOf = (h, w) => (E.norm180(h - w) < 0 ? 'starboard' : 'port');
  // a ile c'nin (h, v ile) en yakın yaklaşması, ufuk H saniye
  function closest(a, h, v, c, H) {
    const fa = E.fwd(h), fc = E.fwd(c.h);
    const rx = c.x - a.x, ry = c.y - a.y, wx = fc.x * c.v - fa.x * v, wy = fc.y * c.v - fa.y * v;
    const w2 = wx * wx + wy * wy;
    const tc = w2 < 1e-6 ? 0 : clamp(-(rx * wx + ry * wy) / w2, 0, H);
    return { dmin: Math.hypot(rx + wx * tc, ry + wy * tc), tc, d: Math.hypot(rx, ry) };
  }
  // b, O'ya hangi kurala göre yol vermeli? (0 = b hak sahibi)
  function classify(b, O, w, t) {
    const tk = x => t - x.lastTack < 1.4 && Math.abs(E.norm180(x.h - w)) < 44;
    if (b.phase === 'penalty') return 22;                                 // ceza turu atan tekne herkese yol verir (K22.2)
    if (O.phase === 'penalty') return 0;
    if (b.phase === 'ocs') return 22;                                     // geri dönen tekne herkese yol verir
    if (O.phase === 'ocs') return 0;
    if (O.phase === 'round' && b.phase !== 'round') return 18;            // şamandırayı dönen tekneye yer ver
    if (b.phase === 'round' && O.phase !== 'round') return 0;
    if (tk(b) && !tk(O)) return 13;
    if (tk(O) && !tk(b)) return 0;
    const tb = tackOf(b.h, w), to = tackOf(O.h, w);
    if (tb !== to) return tb === 'port' ? 10 : 0;
    if (R.clearAstern(b, O)) return 12;
    if (R.clearAstern(O, b)) return 0;
    return dot({ x: b.x - O.x, y: b.y - O.y }, E.fwd(w)) > 0 ? 11 : 0;
  }
  // Protesto: hak sahibi `by`, `b`'nin kural ihlali yüzünden rota değiştirmek zorunda kaldı ya da temas oldu → b iki tur ceza atar
  function protest(s, b, by, rule, why) {
    if (b.penaltyAt != null || b.phase === 'penalty' || b.phase === 'done') return;
    if (s.pairLog['p' + b.id + by.id] != null && s.t - s.pairLog['p' + b.id + by.id] < 10) return;
    s.pairLog['p' + b.id + by.id] = s.t;
    b.penaltyAt = s.t + 1; b.penaltyRule = rule; b.penalties = (b.penalties || 0) + 1;
    note(b, s, `Protesto! K${rule} · iki tur ceza`, 'bad', 3);
    note(by, s, `Protesto: ${b.id}`, 'bad', 2.5);
    s.events.push({ t: s.t, text: `Protesto: ${by.id} → ${b.id} · K${rule} ihlali${why ? ' (' + why + ')' : ''}. ${b.id} iki tur (720°) ceza atacak`, kind: 'protest' });
  }
  // b kime yol vermeli? {O, rule, dmin, tc} | null
  function giveWay(b, others, w, t) {
    let best = null;
    const vb = Math.max(b.v, 22);
    for (const O of others) {
      const c = closest(b, b.h, vb, O, 4);
      if (c.d > 200 || c.dmin > 44) continue;
      if (c.dmin > c.d - 4 && c.d > 34) continue;                       // uzaklaşıyor / paralel
      let rule = classify(b, O.ref, w, t);
      if (!rule && c.dmin < 28 && c.tc < 1.5) rule = 14;               // hak sahibi de teması önler
      if (!rule) continue;
      const urg = c.tc - c.dmin / 40;
      if (!best || urg < best.urg) best = { O, rule, dmin: c.dmin, tc: c.tc, urg, mine: b.mine };
    }
    return best;
  }
  // Kaçış: aday rota farkları arasından en güvenlisini seç
  function chooseEscape(b, others, w, target, t, g) {
    const away = b.tack === 'starboard' ? -1 : 1;                       // bordalama yönü (+ rüzgardan uzak)
    const cands = [];
    for (const off of [0, 15, 30, 45, 60]) cands.push({ kind: off ? 'duck' : 'hold', off: away * off, speed: 1, cost: off * 0.12 });
    for (const off of [15, 25]) cands.push({ kind: 'luff', off: -away * off, speed: 1, cost: off * 0.18 });
    cands.push({ kind: 'slow', off: 0, speed: 0.35, cost: 5 });
    cands.push({ kind: 'slow', off: away * 20, speed: 0.4, cost: 6 });
    if (b.phase === 'race' && t - b.lastTack > 1.5 && g.rule !== 14) cands.push({ kind: 'tack', h: E.tackHeading(w, b.tack === 'starboard' ? 'port' : 'starboard'), speed: 0.6, cost: 9 });
    // K18: şamandırada dönen tekneye yer ver → bordalayıp uzaklaşma, rotada yavaşla ya da hafif orsala
    if (g.rule === 18) cands.splice(0, cands.length,
      { kind: 'hold', off: 0, speed: 1, cost: 0 }, { kind: 'slow', off: 0, speed: 0.3, cost: 3 }, { kind: 'slow', off: -away * 15, speed: 0.35, cost: 4 }, { kind: 'duck', off: away * 15, speed: 0.6, cost: 5 });
    let best = null;
    for (const c of cands) {
      const h = c.h != null ? c.h : target + c.off, v = Math.max(8, Math.max(b.v, 22) * c.speed);
      let m = 1e9;
      for (const O of others) { const r = closest(b, h, v, O, 4); if (r.d < 220) m = Math.min(m, r.dmin); }
      const rm = closest(b, h, v, { x: MARK.x, y: MARK.y, h: 0, v: 0 }, 3); m = Math.min(m, rm.dmin + 14);   // şamandıraya da çarpma
      const score = Math.min(m, 50) - c.cost;
      if (!best || score > best.score) best = { ...c, score };
    }
    return best;
  }
  function ruleText(rule, kind, mine) {
    const act = { duck: 'bordalıyor', luff: 'orsalıyor', slow: 'yavaşlıyor', tack: 'tramola', hold: 'rotada' }[kind] || '';
    const r = { 10: 'K10', 11: 'K11', 12: 'K12', 13: 'K13', 14: 'K14', 18: 'K18', 22: 'K22' }[rule];
    return rule === 14 ? `Temas önleme · K14 (${act})` : `${r} (${act})`;
  }

  // ---------- Bir adım ----------
  function step(s) {
    const w = s.wind, t = s.t, active = s.boats.filter(b => !b.gone);
    const racing = b => b.phase === 'race' || b.phase === 'ocs' || b.phase === 'round';
    const snap = active.filter(b => b.phase !== 'done').map(b => ({ ref: b, x: b.x, y: b.y, h: b.h, v: b.v }));
    const rulesOn = t >= s.startAt + 0.5;

    for (const b of active) {
      const remain = s.startAt - t;
      b.inGust = gustAt(s.gusts, b, w);
      const sh = b.phase === 'race' || b.phase === 'round' ? shadowAt(b, snap, w) : { k: 0, by: null };
      if (b.mine && sh.k > 0.25 && !(b.shadow > 0.25) && t > s.startAt) log(s, `${b.id} pis rüzgarda kaldı (${sh.by.id} numaranın rüzgar gölgesi), yavaşladı`, 'bad', 'golge' + b.id);
      b.shadow = sh.k; b.shadowBy = sh.by ? sh.by.id : null;
      let target = b.h, speedK = 1, holding = false, turnDir = 0;

      if (b.phase === 'wait') {
        const hClose = E.tackHeading(w, b.tack);
        if (!b.go) {
          const need = timeToCover(distToLine(b, hClose)) + 0.4;
          if (remain <= need) b.go = true;
        }
        const outside = (b.x < 60 && E.fwd(hClose).x < 0) || (b.x > WORLD.w - 60 && E.fwd(hClose).x > 0);
        if (outside) b.go = false;                       // kenara gidiyorsa bekle (alan dışına çıkma)
        if (b.go) target = hClose;
        else { target = w + (b.tack === 'starboard' ? -25 : 25); holding = true; }
        if (remain <= 0) { b.phase = lineSide(b) === -1 ? 'ocs' : 'race'; if (b.phase === 'ocs') ocs(b, s); }
      }
      if (b.phase === 'race') {
        let wt = wantedTack(b, s, w);
        // start hattını henüz uçların arasından geçmediyse: önce hattın içine yönel
        let lineAim = null;
        if (!b.started) {
          const u0 = R.lineParam(LINE, b), u = clamp(u0, 0.12, 0.88);
          if (Math.abs(u0 - u) > 0.01) {                   // uçların dışında: hattın içindeki bir noktaya yönel
            const P = { x: LINE.pin.x + (LINE.boat.x - LINE.pin.x) * u, y: LINE.pin.y + (LINE.boat.y - LINE.pin.y) * u - 30 };
            lineAim = { brg: bearing(b, P), rel: E.norm180(bearing(b, P) - w) };
            wt = lineAim.rel > 0 ? 'port' : 'starboard';
          } else wt = b.tack;                              // uçların arasında: düz devam, hattı geç
        }
        const edge = b.x < 40 || b.x > WORLD.w - 40;
        if (wt !== b.tack && t - b.lastTack > MIN_TACK_GAP && (t > s.startAt + 3 || edge)) {
          // K13 bilinci: tramoladan sonra biriyle çakışacaksa bekle
          const nh = E.tackHeading(w, wt), others = snap.filter(o => o.ref !== b);
          const relWp = E.norm180(bearing(b, waypoint(w)) - w);
          const must = (b.tack === 'starboard' && relWp >= 46) || (b.tack === 'port' && relWp <= -46) || b.x < 70 || b.x > WORLD.w - 70;
          let m = 1e9;
          for (const o of others) { const c = closest(b, nh, 30, o, 4); if (c.d < 220) m = Math.min(m, c.dmin); }
          if (m > (must ? 26 : 32) || edge || t - Math.max(b.lastTack, s.startAt) > 9) doTack(b, s, '');
        }
        const wp = waypoint(w), dWp = Math.hypot(wp.x - b.x, wp.y - b.y);
        const brg = bearing(b, wp), rel = E.norm180(brg - w);
        target = E.tackHeading(w, b.tack);
        // şamandırayı tutuyorsa doğrudan geçiş noktasına (orsa açısından dar değilse)
        if (lineAim) { if (Math.abs(lineAim.rel) >= 45) { target = lineAim.brg; b.tack = lineAim.rel > 0 ? 'port' : 'starboard'; } }
        else if (!b.started) { /* hattın içinde: orsa rotasında devam */ }
        else if ((b.tack === 'starboard' && rel <= -45) || (b.tack === 'port' && rel >= 45)) target = brg;
        else if (!lineAim && Math.abs(rel) >= 55) { target = brg; b.tack = rel > 0 ? 'port' : 'starboard'; }   // şamandıra rüzgarüstünde değil (aşmış): doğrudan git
        // dönüşe başla: giriş noktasına geldi ya da şamandıranın rüzgarüstü tarafında, çembere yakın.
        // Şamandıranın altından (rüzgaraltı yarısından) dönüşe başlanmaz.
        const dM = Math.hypot(b.x - MARK.x, b.y - MARK.y), phi = markAngle(b, w);
        if (b.started && (dWp < 20 || (phi > -10 && phi < 110 && dM < R_ROUND + 26) || (phi > -95 && phi < 95 && dM < 160 && dot({ x: b.x - MARK.x, y: b.y - MARK.y }, E.fwd(w)) > 30))) {
          b.phase = 'round'; b.roundAt = t;
        }
      }
      if (b.phase === 'round') {
        // çember teğeti (şamandıra solda) + yarıçap düzeltmesi
        const dM = Math.hypot(b.x - MARK.x, b.y - MARK.y), th = bearing(MARK, b);
        target = th - 90 - clamp((dM - R_ROUND) * 1.4, -45, 45);
        if ((markAngle(b, w) < -100 || t - b.roundAt > 8) && b.penaltyAt != null) {
          // cezası bekliyorsa bitirmiş sayılmaz: şamandıradan uzaklaşıp iki turu atar, sonra bitirir
          b.phase = 'penalty'; b.penWait = true; b.penTurn = 0; b.penaltyAt = null; b.man = null; b.penFinish = true;
          note(b, s, 'Önce cezasını atmalı', 'bad', 2.5);
        } else if (markAngle(b, w) < -100 || t - b.roundAt > 8) {
          b.phase = 'done'; b.finish = ++s.finished; b.finishT = t - s.startAt; b.doneAt = t;
          note(b, s, `${b.finish}. bitirdi`, 'good', 3);
          log(s, `${b.id} şamandırayı ${b.finish}. sırada döndü`, 'good');
        }
      }
      if (b.phase === 'done') {
        target = w + 180 + 25; turnDir = 0;
        if (t - b.doneAt > 5) b.gone = true;
      }
      // ceza turu şamandıradan ve hattan uzakta atılır (K44.2: "diğer teknelerden ve şamandıradan uzaklaşıp")
      if (b.phase === 'race' && b.started && b.penaltyAt != null && t >= b.penaltyAt &&
          Math.hypot(b.x - MARK.x, b.y - MARK.y) > 140 && lineSide(b) === -1 && distToLine(b, w) > 40) {
        b.phase = 'penalty'; b.penWait = false; b.penTurn = 0; b.penaltyAt = null; b.man = null;
        log(s, `${b.id} iki tur ceza atıyor (K${b.penaltyRule})`, 'bad');
      }
      if (b.phase === 'penalty' && b.penWait) {
        target = w + 180 + 25;                                              // şamandıradan uzaklaş
        if (Math.hypot(b.x - MARK.x, b.y - MARK.y) > 110) { b.penWait = false; b.penTurn = 0; log(s, `${b.id} iki tur ceza atıyor (K${b.penaltyRule})`, 'bad'); }
      } else if (b.phase === 'penalty') {
        target = b.h - 170; turnDir = -1; speedK = 0.55;
        if (b.penTurn >= 720 && b.penFinish) {
          b.penFinish = false; b.phase = 'done'; b.finish = ++s.finished; b.finishT = t - s.startAt; b.doneAt = t;
          note(b, s, `Ceza tamam · ${b.finish}. bitirdi`, 'good', 3);
          log(s, `${b.id} cezasını tamamladı, ${b.finish}. sırada bitirdi`, 'good');
        } else if (b.penTurn >= 720) { b.phase = 'race'; note(b, s, 'Ceza tamam, yarışa dönüyor', 'good', 2); log(s, `${b.id} cezasını tamamladı`, 'good'); }
      }
      if (b.phase === 'ocs') {
        target = w + 180;
        if (lineSide(b) === 1 && distToLine(b, w) > 8) { b.phase = 'race'; b.started = false; note(b, s, b.outside ? 'Geri döndü, şimdi hattın içinden' : 'Geri döndü, şimdi start', '', 2); }
      }

      // kurallar: yol vermesi gereken tekne, temas riskini en iyi azaltan rotayı seçer
      if (rulesOn && (b.phase === 'race' || b.phase === 'ocs') && b.ignoresRules) b.man = null;   // kural bilmeyen: yol vermez, kaçmaz
      else if (rulesOn && (b.phase === 'race' || b.phase === 'ocs')) {
        const others = snap.filter(o => o.ref !== b);
        const g = giveWay(b, others, w, t);
        // hak sahibi temastan kaçmak zorunda kaldıysa ve karşıdaki yol vermiyorsa: protesto
        if (g && g.rule === 14) {
          const ob = g.O.ref, r2 = classify(ob, b, w, t);
          if (r2 && !classify(b, ob, w, t) && t - b.lastTack > 2.5 && (ob.ignoresRules || (g.dmin < 14 && g.tc < 1 && (r2 === 13 || t - ob.lastTack < 2.5)))) protest(s, ob, b, r2, 'hak sahibi rotasını değiştirmek zorunda kaldı');
        }
        if (g) {
          if (t >= (b.reEval || 0) || !b.man) {
            const ch = chooseEscape(b, others, w, target, t, g);
            b.reEval = t + 0.3;
            if (ch.kind === 'tack') { doTack(b, s, ''); b.man = 'tack'; b.escH = null; }
            else { b.man = ch.kind; b.escH = ch.off; b.escSpeed = ch.speed; }
            if (ch.kind !== 'hold') {
              const txt = ruleText(g.rule, ch.kind, g.mine);
              if (b.lastRuleWith !== g.O.ref.id || t - (b.lastRuleT || -9) > 4) {
                if (g.rule !== 14) log(s, `${b.id} yol verdi → ${g.O.ref.id} · ${txt}`, 'rule', b.id + '>' + g.O.ref.id);
              }
              b.lastRuleWith = g.O.ref.id; b.lastRuleT = t;
              note(b, s, (g.rule === 14 ? '' : 'Yol veriyor · ') + txt, 'rule', 2);
            }
          }
          b.manUntil = t + 0.8;
        } else if (b.man && t > b.manUntil) { b.man = null; b.escH = null; }
        if (b.man && b.man !== 'tack' && b.escH != null) { target = target + b.escH; speedK = b.escSpeed; }
      } else b.man = null;

      // dönüş
      let diff = E.norm180(target - b.h);
      if (turnDir < 0 && diff > 0) diff -= 360;          // yalnızca sola dön
      const rate = (b.phase === 'round' ? 130 : b.phase === 'penalty' ? 150 : TURN_RATE) * DT;
      const dh = clamp(diff, -rate, rate); b.h = E.norm360(b.h + dh);
      if (b.phase === 'penalty' && !b.penWait) b.penTurn += Math.abs(dh);
      if (b.phase !== 'round') {
        let dir = E.avoidDir(b.x, b.y, b.h, LINE_OBS, b.v);
        // kaçış rüzgara doğru (yelken boşa) götürecekse öbür taraftan, bordalayarak dolaş
        if (dir !== 0 && b.phase !== 'wait' && Math.abs(E.norm180(b.h + dir * 20 - w)) < 38) dir = -dir;
        // start etmemiş tekne pin'i hattın içinden (pin solunda kalacak şekilde) geçmeye çalışır
        if (dir !== 0 && !b.started && Math.hypot(b.x - LINE.pin.x, b.y - LINE.pin.y) < 90 && Math.abs(E.norm180(b.h + 20 - w)) >= 32) dir = 1;
        if (dir !== 0) b.h = E.norm360(b.h + dir * 160 * DT);
        // şamandıra önündeyse hep sağa kaç: şamandıra teknenin iskelesinde (solunda) kalsın, yanlış taraftan geçilmesin
        else if (b.phase !== 'done' && !(b.phase === 'penalty' && b.penFinish) && E.avoidDir(b.x, b.y, b.h, MARK_OBS, b.v) !== 0) b.h = E.norm360(b.h + 320 * DT);
      }
      // hız
      const twa = Math.abs(E.norm180(b.h - w));
      let vt = holding ? HOLD_V : E.speedFor(twa, BASE) * speedK;
      // sinyalden önce hatta varacaksa yavaşla (burnu hattın altında kalsın)
      if (b.phase === 'wait' && b.go && remain > 0) vt = Math.min(vt, Math.max(HOLD_V, (distToLine(b, b.h) - 6) / remain));
      if (b.phase === 'done') vt *= 0.8;
      if (!holding) vt *= (1 + GUST_GAIN * b.inGust) * (1 - SHADOW_LOSS * b.shadow);
      b.v += (vt - b.v) * Math.min(1, DT / TAU);
    }

    // hareket
    for (const b of active) { const f = E.fwd(b.h); b.x += f.x * b.v * DT; b.y += f.y * b.v * DT; }
    // temas: üst üste binmeyi engelle, kaydet
    const live = active.filter(b => b.phase !== 'done');
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i], c = live[j], dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy);
      if (d < 26 && d > 0.01) {
        const push = (26 - d) / 2, ux = dx / d, uy = dy / d;
        a.x -= ux * push; a.y -= uy * push; c.x += ux * push; c.y += uy * push;
        if (rulesOn && d < 22) {
          const fresh = s.pairLog['temas' + a.id + c.id] == null || s.t - s.pairLog['temas' + a.id + c.id] >= 5;
          log(s, `Temas: ${a.id} – ${c.id}`, 'bad', 'temas' + a.id + c.id); note(a, s, 'Temas!', 'bad', 1.5); note(c, s, 'Temas!', 'bad', 1.5);
          if (fresh) {
            const ra = classify(a, c, w, t), rc = classify(c, a, w, t);
            if (ra) protest(s, a, c, ra, 'temas'); if (rc) protest(s, c, a, rc, 'temas');
            // hak sahibi de kaçınabilecekken kaçınmadıysa (kural bilmeyen tekne) o da ceza alır: K14
            if (ra && c.ignoresRules) protest(s, c, a, 14, 'temastan kaçınmadı');
            if (rc && a.ignoresRules) protest(s, a, c, 14, 'temastan kaçınmadı');
          }
        }
      }
    }
    // start hattı geçişleri (temas itmesi dahil, tüm hareketten sonra)
    for (const b of active) {
      const side = lineSide(b), was = b.prevSide == null ? side : b.prevSide;
      b.prevSide = side;
      if (!(was === 1 && side === -1)) continue;
      if (b.phase === 'wait' && t < s.startAt) { ocs(b, s); continue; }
      if ((b.phase === 'race' || b.phase === 'wait' || b.phase === 'penalty') && !b.started) {
        const u = R.lineParam(LINE, b);
        if (u >= -0.05 && u <= 1.05) b.started = true;    // gövde payı: merkez uca 20 px'e kadar dışarıda olabilir
        else {
          b.phase = 'ocs'; b.outside = true;
          note(b, s, 'Hattı uçların dışından geçti · start sayılmaz', 'bad', 3.5);
          log(s, `${b.id} start hattını uçların dışından geçti, geri dönüp hattın içinden geçmeli`, 'bad', 'dis' + b.id);
        }
      }
    }
    s.t = +(t + DT).toFixed(4);
  }
  function ocs(b, s) {
    b.phase = 'ocs'; b.go = true;
    if (!b.ocsOnce) { b.ocsOnce = true; note(b, s, 'ERKEN · OCS – geri dön', 'bad', 3.5); log(s, `${b.id} erken çıktı (OCS), geri dönüyor`, 'bad'); }
  }

  // Sıralama anahtarı: bitirenler önce; yarışanlar şamandıraya kalan yol (rüzgar ekseninde)
  function standings(s) {
    const w = s.wind, wp = waypoint(w), up = E.fwd(w), right = E.fwd(w + 90);
    return s.boats.map(b => {
      let key, status;
      if (b.finish) { key = -1000 + b.finish; status = `${b.finish}. · ${fmt(b.finishT)}${b.penalties ? ' · ' + b.penalties + ' ceza' : ''}`; }
      else {
        const along = Math.max(0, dot({ x: wp.x - b.x, y: wp.y - b.y }, up)), lat = Math.abs(dot({ x: b.x - wp.x, y: b.y - wp.y }, right));
        key = along + Math.max(0, lat - along) + (b.phase === 'ocs' ? 400 : 0);
        status = b.phase === 'wait' ? (s.t < s.startAt ? 'Bekliyor' : 'Yarışta') : b.phase === 'ocs' ? 'OCS · geri dönüyor' : b.phase === 'round' ? 'Şamandırayı dönüyor' : b.phase === 'penalty' ? 'Ceza turu' : `${(key / HULL).toFixed(1)} boy kaldı`;
      }
      return { b, key, status };
    }).sort((a, c) => a.key - c.key);
  }
  const fmt = t => `${Math.floor(t * CLOCK_SCALE / 60)}:${String(Math.floor(t * CLOCK_SCALE % 60)).padStart(2, '0')}`;

  // Durumun kopyası (geri sarma için)
  function clone(s) {
    return { ...s, gusts: s.gusts.map(g => ({ ...g })), boats: s.boats.map(b => ({ ...b })), events: s.events.slice(), pairLog: { ...s.pairLog } };
  }

  // Yarışı bitene kadar ileri hesapla; her 0.1 s'de bir kare (durumun kopyası) döndürür
  function runToEnd(s0, maxT) {
    const s = clone(s0), frames = [clone(s)];
    maxT = maxT || 200;
    while (s.t < maxT && !s.boats.every(b => b.finish || b.gone)) {
      step(s);
      if (Math.round(s.t / DT) % 2 === 0) frames.push(clone(s));
    }
    if (frames[frames.length - 1].t < s.t) frames.push(clone(s));
    return frames;
  }

  global.SailSim = {
    runToEnd,
    DT, HULL, WORLD, LINE, MARK, BASE, START_AT, CLOCK_SCALE, PERSONAS, MINE_COLOR, OBSTACLES,
    SHADOW_LEN, knots, defaultFleet, makeBoat, newRace, step, command, standings, clone, waypoint, gustAt, fmt, lineSide
  };
})(typeof window !== 'undefined' ? window : globalThis);
