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
  const MIN_TACK_GAP = 3;         // iki tramola arası en az (sn)
  const OBSTACLES = E.obstaclesOf({ marks: [MARK], line: LINE });

  const PERSONAS = {
    sol: 'Sol taraf', orta: 'Orta', sag: 'Sağ taraf', saganak: 'Sağanak avcısı', manuel: 'Senin kararın'
  };

  const dot = (a, b) => a.x * b.x + a.y * b.y;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- Yardımcılar ----------
  // Şamandıranın iskeleden dönülmesi için geçiş noktası (şamandıranın rüzgarüstü-sağı)
  function waypoint(w) {
    const up = E.fwd(w), right = E.fwd(w + 90);
    return { x: MARK.x + up.x * 16 + right.x * 24, y: MARK.y + up.y * 16 + right.y * 24 };
  }
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
      persona: opts.persona || AUTO_PERSONAS[i % AUTO_PERSONAS.length],
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
      lastTack: -10, finish: null, finishT: null, gone: false, doneAt: null, ocsOnce: false, sideDone: false, v: HOLD_V }));
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
    } else if (cmd === 'persona') { b.persona = arg; log(s, `${b.id}: taktik → ${PERSONAS[arg]}`); }
  }

  // ---------- Yol hakkı (RRS Bölüm 2) ----------
  const tackOf = (h, w) => (E.norm180(h - w) < 0 ? 'starboard' : 'port');
  const isTacking = (o, w, t) => t - o.ref.lastTack < 1.4 && Math.abs(E.norm180(o.h - w)) < 44;   // tramola atıyor
  // a ile c'nin (h, v ile) en yakın yaklaşması, ufuk H saniye
  function closest(a, h, v, c, H) {
    const fa = E.fwd(h), fc = E.fwd(c.h);
    const rx = c.x - a.x, ry = c.y - a.y, wx = fc.x * c.v - fa.x * v, wy = fc.y * c.v - fa.y * v;
    const w2 = wx * wx + wy * wy;
    const tc = w2 < 1e-6 ? 0 : clamp(-(rx * wx + ry * wy) / w2, 0, H);
    return { dmin: Math.hypot(rx + wx * tc, ry + wy * tc), tc, d: Math.hypot(rx, ry) };
  }
  // b kime yol vermeli? {O, rule, dmin, tc} | null
  function giveWay(b, others, w, t) {
    let best = null;
    const up = E.fwd(w), vb = Math.max(b.v, 22), self = { ref: b, h: b.h };
    for (const O of others) {
      const c = closest(b, b.h, vb, O, 4);
      if (c.d > 200 || c.dmin > 44) continue;
      if (c.dmin > c.d - 4 && c.d > 34) continue;                       // uzaklaşıyor / paralel
      let rule = 0;
      const ob = O.ref;
      if (b.phase === 'ocs') rule = 22;                                  // geri dönen tekne herkese yol verir
      else if (ob.phase === 'ocs') rule = 0;
      else if (ob.phase === 'round' && b.phase !== 'round') rule = 18;   // şamandırayı dönen tekneye yer ver
      else if (b.phase === 'round' && ob.phase !== 'round') rule = 0;
      else if (isTacking(self, w, t) && !isTacking(O, w, t)) rule = 13;
      else if (isTacking(O, w, t) && !isTacking(self, w, t)) rule = 0;
      else {
        const tb = tackOf(b.h, w), to = tackOf(O.h, w);
        if (tb !== to) rule = tb === 'port' ? 10 : 0;
        else if (R.clearAstern(b, O)) rule = 12;
        else if (R.clearAstern(O, b)) rule = 0;
        else rule = dot({ x: b.x - O.x, y: b.y - O.y }, up) > 0 ? 11 : 0;
      }
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
    let best = null;
    for (const c of cands) {
      const h = c.h != null ? c.h : target + c.off, v = Math.max(8, Math.max(b.v, 22) * c.speed);
      let m = 1e9;
      for (const O of others) { const r = closest(b, h, v, O, 4); if (r.d < 220) m = Math.min(m, r.dmin); }
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
      let target = b.h, speedK = 1, holding = false, turnDir = 0;

      if (b.phase === 'wait') {
        const hClose = E.tackHeading(w, b.tack);
        if (!b.go) {
          const need = timeToCover(distToLine(b, hClose)) + 0.4;
          if (remain <= need) b.go = true;
        }
        if (b.go) target = hClose;
        else { target = w + (b.tack === 'starboard' ? -25 : 25); holding = true; }
        if (remain <= 0) { b.phase = lineSide(b) === -1 ? 'ocs' : 'race'; if (b.phase === 'ocs') ocs(b, s); }
      }
      if (b.phase === 'race') {
        const wt = wantedTack(b, s, w);
        if (wt !== b.tack && t - b.lastTack > MIN_TACK_GAP && t > s.startAt + 3) {
          // K13 bilinci: tramoladan sonra biriyle çakışacaksa bekle
          const nh = E.tackHeading(w, wt), others = snap.filter(o => o.ref !== b);
          const relWp = E.norm180(bearing(b, waypoint(w)) - w);
          const must = (b.tack === 'starboard' && relWp >= 46) || (b.tack === 'port' && relWp <= -46) || b.x < 70 || b.x > WORLD.w - 70;
          let m = 1e9;
          for (const o of others) { const c = closest(b, nh, 30, o, 4); if (c.d < 220) m = Math.min(m, c.dmin); }
          if (m > (must ? 26 : 32) || (b.x < 40 || b.x > WORLD.w - 40) || t - Math.max(b.lastTack, s.startAt) > 9) doTack(b, s, '');
        }
        const wp = waypoint(w), dWp = Math.hypot(wp.x - b.x, wp.y - b.y);
        const brg = bearing(b, wp), rel = E.norm180(brg - w);
        target = E.tackHeading(w, b.tack);
        // şamandırayı tutuyorsa doğrudan geçiş noktasına (orsa açısından dar değilse)
        if ((b.tack === 'starboard' && rel <= -45) || (b.tack === 'port' && rel >= 45)) target = brg;
        else if (Math.abs(rel) >= 55) { target = brg; b.tack = rel > 0 ? 'port' : 'starboard'; }   // şamandıra rüzgarüstünde değil (aşmış): doğrudan git
        const above = dot({ x: b.x - MARK.x, y: b.y - MARK.y }, E.fwd(w));
        if (dWp < 20 || (above > 30 && dWp < 150) || (above > 8 && dot({ x: b.x - MARK.x, y: b.y - MARK.y }, E.fwd(w + 90)) > -6 && dWp < 70)) b.phase = 'round';
      }
      if (b.phase === 'round') {
        target = w + 180; turnDir = -1;                  // iskeleden dönüş: sola (saat yönünün tersine)
        if (Math.abs(E.norm180(b.h - target)) < 20) {
          b.phase = 'done'; b.finish = ++s.finished; b.finishT = t - s.startAt; b.doneAt = t;
          note(b, s, `${b.finish}. bitirdi`, 'good', 3);
          log(s, `${b.id} şamandırayı ${b.finish}. sırada döndü`, 'good');
        }
      }
      if (b.phase === 'done') {
        target = w + 180 + 30; turnDir = 0;
        if (t - b.doneAt > 5) b.gone = true;
      }
      if (b.phase === 'ocs') {
        target = w + 180;
        if (lineSide(b) === 1 && distToLine(b, w) > 8) { b.phase = 'race'; note(b, s, 'Geri döndü, şimdi start', '', 2); }
      }

      // kurallar: yol vermesi gereken tekne, temas riskini en iyi azaltan rotayı seçer
      if (rulesOn && (b.phase === 'race' || b.phase === 'ocs')) {
        const others = snap.filter(o => o.ref !== b);
        const g = giveWay(b, others, w, t);
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
      const rate = (b.phase === 'round' ? 75 : TURN_RATE) * DT;
      b.h = E.norm360(b.h + clamp(diff, -rate, rate));
      if (b.phase !== 'round') { const dir = E.avoidDir(b.x, b.y, b.h, OBSTACLES, b.v); if (dir !== 0) b.h = E.norm360(b.h + dir * 160 * DT); }
      // hız
      const twa = Math.abs(E.norm180(b.h - w));
      let vt = holding ? HOLD_V : E.speedFor(twa, BASE) * speedK;
      // sinyalden önce hatta varacaksa yavaşla (burnu hattın altında kalsın)
      if (b.phase === 'wait' && b.go && remain > 0) vt = Math.min(vt, Math.max(HOLD_V, (distToLine(b, b.h) - 6) / remain));
      if (b.phase === 'done') vt *= 0.8;
      if (!holding) vt *= 1 + GUST_GAIN * b.inGust;
      b.v += (vt - b.v) * Math.min(1, DT / TAU);
    }

    // hareket + erken start
    for (const b of active) {
      const f = E.fwd(b.h), was = lineSide(b);
      b.x += f.x * b.v * DT; b.y += f.y * b.v * DT;
      if (b.phase === 'wait' && t < s.startAt && was === 1 && lineSide(b) === -1) ocs(b, s);
    }
    // temas: üst üste binmeyi engelle, kaydet
    const live = active.filter(b => b.phase !== 'done');
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i], c = live[j], dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy);
      if (d < 26 && d > 0.01) {
        const push = (26 - d) / 2, ux = dx / d, uy = dy / d;
        a.x -= ux * push; a.y -= uy * push; c.x += ux * push; c.y += uy * push;
        if (rulesOn && d < 22) { log(s, `Temas: ${a.id} – ${c.id}`, 'bad', 'temas' + a.id + c.id); note(a, s, 'Temas!', 'bad', 1.5); note(c, s, 'Temas!', 'bad', 1.5); }
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
      if (b.finish) { key = -1000 + b.finish; status = `${b.finish}. · ${fmt(b.finishT)}`; }
      else {
        const along = Math.max(0, dot({ x: wp.x - b.x, y: wp.y - b.y }, up)), lat = Math.abs(dot({ x: b.x - wp.x, y: b.y - wp.y }, right));
        key = along + Math.max(0, lat - along) + (b.phase === 'ocs' ? 400 : 0);
        status = b.phase === 'wait' ? (s.t < s.startAt ? 'Bekliyor' : 'Yarışta') : b.phase === 'ocs' ? 'OCS · geri dönüyor' : b.phase === 'round' ? 'Şamandırayı dönüyor' : `${(key / HULL).toFixed(1)} boy kaldı`;
      }
      return { b, key, status };
    }).sort((a, c) => a.key - c.key);
  }
  const fmt = t => `${Math.floor(t * CLOCK_SCALE / 60)}:${String(Math.floor(t * CLOCK_SCALE % 60)).padStart(2, '0')}`;

  // Durumun kopyası (geri sarma için)
  function clone(s) {
    return { ...s, gusts: s.gusts.map(g => ({ ...g })), boats: s.boats.map(b => ({ ...b })), events: s.events.slice(), pairLog: { ...s.pairLog } };
  }

  global.SailSim = {
    DT, HULL, WORLD, LINE, MARK, BASE, START_AT, CLOCK_SCALE, PERSONAS, MINE_COLOR, OBSTACLES,
    defaultFleet, makeBoat, newRace, step, command, standings, clone, waypoint, gustAt, fmt, lineSide
  };
})(typeof window !== 'undefined' ? window : globalThis);
