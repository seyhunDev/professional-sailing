/* Yarış simülatörü – çekirdek (DOM yok; node'da da çalışır)
   Kullanıcının yerleştirdiği tekneler start hattında bekler, sinyalde hattı geçer,
   orsa şamandırasına kendi taktikleriyle gider (layline'da tramola), şamandırayı iskeleden
   (saat yönünün tersine) döner ve bitirir. Rüzgar ve sağanaklar canlı değiştirilebilir.
   Kurallar: SailRules.giveWay / chooseEscape (K10/11/12/13/14, senaryolarla ortak) her adımda, yarıştaki teknelere uygulanır.
*/
(function (global) {
  const E = global.SailEngine, R = global.SailRules;
  const DT = 0.05, HULL = 50;
  const WORLD = { w: 1000, h: 900 };
  // Parkur: start hattı boyu ve orsa şamandırasının hatta uzaklığı ayarlanabilir (setCourse).
  // Nesneler yerinde güncellenir; arayüz aynı nesneleri (S.LINE, S.MARK, S.WORLD) okur.
  const COURSE_DEFAULT = { lineLen: 400, markDist: 650 };
  const LINE = { pin: { x: 300, y: 740 }, boat: { x: 700, y: 740 } };
  const MARK = { x: 500, y: 90, label: 'Orsa şamandırası' };
  const BASE = 55, TAU = 1.2, HOLD_V = BASE * 0.04;
  // Zaman ölçeği: 1 simülasyon saniyesi = CLOCK_SCALE gerçek saniye. Varsayılan parkurda (Optimist, 8 knot rüzgar)
  // start → orsa şamandırası ortalama ~15 dakika sürer; 1× oynatma gerçek zamandır (sim.js oynatırken CLOCK_SCALE'e böler).
  // Tekne sınıfı ve rüzgar hızı (setBoat) tekne hızını değiştirir: hız px/s olarak sabit kalır (orsada 55 px/s), değişen
  // zaman ölçeğidir. 2 kat hızlı tekne için 1 sim. saniyesi yarı kadar gerçek zamandır: ekranda (1×) iki kat hızlı gider,
  // aynı 5 dakikalık geri sayımda iki kat yol alır. Böylece kural/kaçış/şamandıra ayarları her sınıfta aynı çalışır.
  const CLOCK_REF = 300 / 8.4;    // Optimist 8 knot (3.5 kn orsa): 1 sim. sn = 35.7 gerçek sn
  let CLOCK_SCALE = CLOCK_REF, START_AT = 300 / CLOCK_SCALE;   // geri sayım her zaman 5:00 (gerçek)
  const MAN_MARGIN = 320;         // manuel tekne parkur kenarını bu kadar aşabilir (deniz parkurla bitmez); ötesinde zorunlu tramola
  const TURN_RATE = 110;          // derece/sn
  let GUST_GAIN = 0.25;           // sağanakta hız artışı (setBoat: rüzgar +5 knot olunca sınıfın hızı ne kadar artıyor; en fazla eski sabit %25)
  let SPD = 1;                    // tekne hızı / Optimist 8 knot hızı (setBoat)
  // Deniz: akıntı ve dalga tekneleri rüzgaraltına kaydırır (px/s). Teknenin kendi sürüklenmesi (yalpalama, köre düşme) de eklenir.
  const SEA = { current: [0, 3, 6, 10], waveDrift: [0, 2, 4], waveLoss: [0, 0.05, 0.1], boatDrift: [0, 3, 6], boatLoss: [0, 0.05, 0.1] };
  const SEA_DEFAULT = { current: 0, waves: 0 };
  // Akıntıda orsa: yere göre gidilen açı (COG) rüzgardan 45°'den geniş → layline'lar açılır
  function layAngle(s, b) {
    const D = driftOf(s, b); if (D <= 0) return 45;
    const v = BASE * 0.9, a = 45 * E.DEG;
    return Math.atan2(v * Math.sin(a), Math.max(1, v * Math.cos(a) - D)) / E.DEG;
  }
  // akıntıya karşı burun tutma: yere göre `brg` yönünde gitmek için baş açısı
  function crabTo(brg, w, D, v) {
    if (D <= 0) return brg;
    return brg - Math.asin(clamp(D * Math.sin(E.norm180(w + 180 - brg) * E.DEG) / Math.max(v, 20), -0.9, 0.9)) / E.DEG;
  }
  function driftOf(s, b) {
    const sea = s.sea || SEA_DEFAULT;
    // akıntı gerçek zamanda aynı hızdadır: hızlı teknede 1 sim. sn daha kısa → px/sim-sn olarak az
    return Math.min(13, ((SEA.current[sea.current] || 0) + (SEA.waveDrift[sea.waves] || 0) + (SEA.boatDrift[b.drift || 0] || 0)) / SPD);   // en fazla 13: orsada yine de ilerler
  }
  const SHADOW_LEN = E.SHADOW.len;   // rüzgar gölgesi (pis rüzgar): engine.SHADOW ile ortak (~1 boy kıçtan)
  const SHADOW_LOSS = E.SHADOW.loss; // gölgenin tam ortasında hız kaybı
  const KNOTS = 3.5 / BASE;       // px/s → knot (orsada 55 px/s ≈ 3.5 kn, Optimist 8 knot rüzgar); sınıf/rüzgar: × SPD
  // Yol verme mesafeleri (merkezler arası px; tekne boyu 50). Optimist'ler yakın geçer:
  // Yol verme mesafeleri: rules.js → SailRules.GW (senaryolarla ortak)
  const MIN_TACK_GAP = 3;         // iki tramola arası en az (sn)
  const OBSTACLES = E.obstaclesOf({ marks: [MARK], line: LINE });
  const LINE_OBS = E.obstaclesOf({ line: LINE });           // pin + hakem botu
  const MARK_OBS = [{ x: MARK.x, y: MARK.y, r: 14 }];
  const AVOID_OBS = [...LINE_OBS, MARK_OBS[0]];             // kaçınma listesi (sıra sabit: pin, hakem botu, şamandıra)
  let courseKey = '';
  function setCourse(c) {
    const L = Math.round((c && c.lineLen) || COURSE_DEFAULT.lineLen), D = Math.round((c && c.markDist) || COURSE_DEFAULT.markDist);
    const key = L + 'x' + D; if (key === courseKey) return; courseKey = key;
    WORLD.w = Math.max(1000, L + 520); WORLD.h = 90 + D + 160;
    const cx = WORLD.w / 2, ly = 90 + D;
    LINE.pin.x = cx - L / 2; LINE.pin.y = ly; LINE.boat.x = cx + L / 2; LINE.boat.y = ly;
    MARK.x = cx; MARK.y = 90;
    const refill = (a, b) => { a.length = 0; a.push(...b); };
    refill(OBSTACLES, E.obstaclesOf({ marks: [MARK], line: LINE }));
    refill(LINE_OBS, E.obstaclesOf({ line: LINE }));
    refill(MARK_OBS, [{ x: MARK.x, y: MARK.y, r: 14 }]);
    refill(AVOID_OBS, [...LINE_OBS, MARK_OBS[0]]);
  }
  setCourse(COURSE_DEFAULT);

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

  // ---------- Tekne sınıfı, rüzgar hızı, hızlanma anı ----------
  // Orsa tekne hızı (knot), rüzgar hızına (knot) göre. Kaynak: sınıfların bilinen ortalama orsa hızları
  // (Optimist: hafif havada ~2.5, orta havada ~3.5-4, kuvvetlide fazla güçlenir, artmaz; ILCA: 10 knot üstünde ~5-5.5).
  // acc: hızlanma süresi sabiti (gerçek sn) – yelkeni doldurduktan sonra tam hıza ~3×acc sn'de çıkar.
  const CLASSES = E.BOAT_CLASSES;   // sınıf hız tablosu engine.js'te (senaryolarla ortak)
  const BOAT_DEFAULT = { cls: 'optimist', windKn: 8, accelAt: 30 };   // accelAt: start'a kaç gerçek sn kala yelken doldurulur
  const WIND_KN = [4, 6, 8, 10, 12, 15, 18];
  const ACCEL_AT = [60, 45, 30, 20, 15, 10];
  const upwindKn = E.upwindKn;
  let TAU_START = 4 / CLOCK_SCALE, CREEP_T = 240 / CLOCK_SCALE, ACCEL = [0], boatKey = '';
  const BOAT = { ...BOAT_DEFAULT };
  function setBoat(c) {
    const cls = CLASSES[c && c.cls] ? c.cls : BOAT_DEFAULT.cls;
    const windKn = clamp(+(c && c.windKn) || BOAT_DEFAULT.windKn, 2, 30), accelAt = clamp(+(c && c.accelAt) || BOAT_DEFAULT.accelAt, 5, 120);
    const key = cls + '|' + windKn + '|' + accelAt; if (key === boatKey) return; boatKey = key;
    Object.assign(BOAT, { cls, windKn, accelAt });
    SPD = upwindKn(cls, windKn) / 3.5; CLOCK_SCALE = CLOCK_REF / SPD; START_AT = 300 / CLOCK_SCALE;
    CREEP_T = 240 / CLOCK_SCALE;     // hızlanmadan önceki son 4 dk: yelken yarı boş, hızlanma noktasına yavaşça sokulur
    GUST_GAIN = clamp(upwindKn(cls, windKn + 5) / upwindKn(cls, windKn) - 1, 0.06, 0.25);
    TAU_START = E.accelTau(cls, windKn, CLOCK_SCALE);   // sınıf tablosundan, senaryolarla aynı formül (hafif havada daha yavaş)
    // Hızlanma: beklerken (yelken boş) orsa hızına çıkarken T saniyede alınan yol (tablo)
    ACCEL = [0]; let v = HOLD_V, d = 0; const vt = E.speedFor(45, BASE);
    for (let i = 1; i <= 400; i++) { v += (vt - v) * Math.min(1, DT / TAU_START); d += v * DT; ACCEL.push(d); }
  }
  function timeToCover(d) { for (let i = 0; i < ACCEL.length; i++) if (ACCEL[i] >= d) return i * DT; return 20 + (d - ACCEL[ACCEL.length - 1]) / BASE; }
  const accelDist = T => ACCEL[Math.min(ACCEL.length - 1, Math.max(0, Math.round(T / DT)))];
  setBoat(BOAT_DEFAULT);

  // Teknenin rotası boyunca start hattına mesafe (hattın içinden geçmiyorsa en yakın uca)
  // Rota hattı uçların arasından kesiyorsa kesişme konumu (0 = pin, 1 = hakem botu), kesmiyorsa null
  function rayLineU(b, h) {
    const f = E.fwd(h), p = LINE.pin, q = LINE.boat, ex = q.x - p.x, ey = q.y - p.y, den = f.x * ey - f.y * ex;
    if (Math.abs(den) < 1e-6) return null;
    const t = ((p.x - b.x) * ey - (p.y - b.y) * ex) / den, u = ((p.x - b.x) * f.y - (p.y - b.y) * f.x) / den;
    return t >= 0 ? u : null;
  }
  // Start öncesi yaklaşma rotası: orsa rotası hattı uçların arasından kesiyorsa o; kesmiyorsa (ör. pin'in dışına
  // gidiyor) hattın uca yakın iç noktasına, orsadan dar değilse. Tutmuyorsa null (bekler, start'tan sonra döner).
  function approachHeading(b, w) {
    const h = E.tackHeading(w, b.tack), u = rayLineU(b, h);
    if (u != null && u >= 0.04 && u <= 0.96) return h;
    const k = u != null ? (u < 0.5 ? 0.08 : 0.92) : (b.tack === 'starboard' ? 0.08 : 0.92);
    const P = { x: LINE.pin.x + (LINE.boat.x - LINE.pin.x) * k, y: LINE.pin.y + (LINE.boat.y - LINE.pin.y) * k };
    const brg = bearing(b, P), rel = E.norm180(brg - w);
    if (b.tack === 'starboard' ? rel <= -42 : rel >= 42) return brg;
    return null;
  }
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
    const casters = snap.filter(o => o.ref !== b && o.ref.phase !== 'wait' && o.ref.phase !== 'done').map(o => ({ x: o.x, y: o.y, v: o.v, ref: o.ref }));
    return E.shadowK({ x: b.x, y: b.y, ref: b }, casters, w, BASE);
  }
  const knots = v => v * KNOTS * SPD;

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
      persona: opts.persona || AUTO_PERSONAS[i % AUTO_PERSONAS.length], ignoresRules: !!opts.ignoresRules, speedK: opts.speedK || 1, drift: opts.drift || 0, manual: !!opts.manual, penalties: 0, penaltyAt: null,
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
      const u = 0.1 + (0.76 * k) / Math.max(1, front - 1);
      boats.push({ x: P.x + (Q.x - P.x) * u + 58, y: P.y + 58 });   // sancak orsa rotası hattı u civarında keser
    }
    for (let k = 0; k < back; k++) {
      const u = 0.18 + (0.64 * k) / Math.max(1, back - 1 || 1);
      boats.push({ x: P.x + (Q.x - P.x) * u + 70, y: P.y + 120 });
    }
    const mineIdx = Math.floor(front / 2);
    return boats.map((p, i) => makeBoat(i, p, i === mineIdx ? { mine: true, id: 'SEN', name: 'Senin teknen', persona: 'orta' } : null))
      .map((b, i) => { if (!b.mine) { b.id = String(i < mineIdx ? i + 1 : i); b.name = `Tekne ${b.id}`; } return b; });
  }

  function newRace(fleet, opts) {
    opts = opts || {};
    const w = opts.wind != null ? opts.wind : 0;
    const boats = fleet.map(b => ({ ...b, phase: 'wait', go: false, man: null, manUntil: -1, note: '', noteUntil: -1,
      lastTack: -10, finish: null, finishT: null, gone: false, doneAt: null, ocsOnce: false, sideDone: false, started: false, outside: false, penalties: 0, penaltyAt: null, penTurn: 0, penWait: false, penAway: null, penFinish: false, routeIdx: 0, routeFrom: null, v: b.drv && b.v != null ? b.v : HOLD_V }));
    for (const b of boats) if (!b.drv) b.h = w + (b.tack === 'starboard' ? -25 : 25);   // elle sürülmüş tekne yönünü korur
    const course = { ...COURSE_DEFAULT, ...(opts.course || {}) }; setCourse(course);
    const sea = { ...SEA_DEFAULT, ...(opts.sea || {}) };
    const boat = { ...BOAT_DEFAULT, ...(opts.boat || {}) }; setBoat(boat);
    return { t: 0, wind: w, gusts: (opts.gusts || []).map(g => ({ ...g })), boats, events: [], finished: 0, pairLog: {}, startAt: START_AT, course, sea, boat };
  }

  // ---------- Strateji: hangi kontrada olmak istiyor? ----------
  function wantedTack(b, s, w) {
    const wp = waypoint(w), up = E.fwd(w), right = E.fwd(w + 90);
    const rel = E.norm180(bearing(b, wp) - w);           // şamandıranın rüzgara göre kerterizi
    const along = dot({ x: wp.x - b.x, y: wp.y - b.y }, up);
    const lat = dot({ x: b.x - wp.x, y: b.y - wp.y }, right);   // + sağ taraf
    // layline: daha fazla gidersen şamandırayı aşarsın → dön
    const L = layAngle(s, b);
    if (b.tack === 'starboard' && rel >= L + 1) return 'port';
    if (b.tack === 'port' && rel <= -L - 1) return 'starboard';
    // layline'dayken (şamandırayı tutuyorsa) dönme
    if (b.tack === 'starboard' && rel <= -L + 5) return 'starboard';
    if (b.tack === 'port' && rel >= L - 5) return 'port';
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
  function command(s, cmd, arg, id) {           // id verilmezse senin teknen
    const b = s.boats.find(x => (id ? x.id === id : x.mine)); if (!b) return;
    if (cmd === 'tack') {
      if (b.phase === 'race' && s.t - b.lastTack > 1) { doTack(b, s, 'Tramola!'); if (!b.manual) b.persona = 'manuel'; log(s, `${b.id}: tramola (senin kararın)`); }
      else if (b.phase === 'wait') { b.tack = b.tack === 'starboard' ? 'port' : 'starboard'; }
    } else if (cmd === 'rules') { b.ignoresRules = !!arg; log(s, `${b.id}: ${arg ? 'artık yol vermiyor (kural bilmeyen)' : 'kurallara uyuyor'}`);
    } else if (cmd === 'speed') { b.speedK = +arg || 1; log(s, `${b.id}: hız ${b.speedK === 1 ? 'normal' : (b.speedK > 1 ? '+' : '−') + Math.round(Math.abs(b.speedK - 1) * 100) + '%'}`);
    } else if (cmd === 'route') {
      b.route = arg && arg.length ? arg.map(p => ({ x: p.x, y: p.y })) : null; b.routeIdx = 0; b.routeFrom = { x: b.x, y: b.y };
      log(s, b.route ? `${b.id}: yeni rota çizildi` : `${b.id}: rota silindi`);
    } else if (cmd === 'manual') { b.manual = !!arg; if (arg) b.route = null; log(s, `${b.id}: ${arg ? 'manuel: tramolaları sen atıyorsun' : 'otomatik tramolaya döndü'}`);
    } else if (cmd === 'sheet') {
      b.sheetOff = clamp(+arg || 0, 0, SHEET_OFF_MAX);
      log(s, `${b.id}: ${b.sheetOff ? `iskota salındı, hız %${Math.round(trimEff(b.sheetOff) * 100)}` : 'iskota çekildi, tam hız'}`);
    } else if (cmd === 'drift') { b.drift = +arg || 0; log(s, `${b.id}: sürüklenme ${['yok', 'az', 'çok'][b.drift]}`);
    } else if (cmd === 'persona') { b.persona = arg; log(s, `${b.id}: taktik → ${PERSONAS[arg]}`); }
  }

  // ---------- Yol hakkı (RRS Bölüm 2) ----------
  // Yol hakkı çekirdeği senaryolarla ORTAK (rules.js): classify / giveWay / chooseEscape / ruleText.
  const tackOf = R.tackOf, closest = R.closest, classify = R.classify, giveWay = R.giveWay, ruleText = R.ruleText;
  // Kaçış seçici: simülatöre özgü olan yalnızca "kaçmak için tramola serbest mi" kararı ve şamandıra
  function chooseEscape(b, others, w, target, t, g) {
    // kaçmak için tramola: rota çizilmişse ya da sol/sağ taktiğinde o tarafa daha varmadıysa yok (yavaşla / bordala ile yol verir)
    const routing = b.started && b.route && b.routeIdx < b.route.length;
    const sideLock = (b.persona === 'sol' && !b.sideDone && b.tack === 'starboard') || (b.persona === 'sag' && !b.sideDone && b.tack === 'port');
    const allowTack = b.phase === 'race' && !b.manual && t - b.lastTack > 1.5 && !routing && !sideLock;
    return R.chooseEscape(b, others, w, target, t, g, { allowTack, marks: [MARK] });
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

  // ---------- Çizilen rota (senin teknen) ----------
  // Rota noktalarını sırayla izler. Nokta rüzgarın yasak bölgesindeyse (orsadan dar) zikzak atar:
  // çizginin iki yanında ROUTE_CORR px'lik bir koridorda kalır, koridorun kenarına gelince ya da
  // noktayı öbür kontrayla tutunca tramola atar. Rota bitince taktiğine göre şamandıraya gider.
  const ROUTE_CORR = 45;
  function routeNext(b) {
    const r = b.route;
    while (b.routeIdx < r.length) {
      const P = r[b.routeIdx], A = b.routeIdx > 0 ? r[b.routeIdx - 1] : (b.routeFrom || P);
      const d = Math.hypot(P.x - b.x, P.y - b.y);
      const seg = { x: P.x - A.x, y: P.y - A.y }, L = Math.hypot(seg.x, seg.y);
      const passed = L > 1 && dot({ x: P.x - b.x, y: P.y - b.y }, seg) / L < -5;   // noktayı çizgi yönünde geçti
      if (d < 32 || passed || lineSide(P) === 1) { b.routeIdx++; continue; }      // hattın dibindeki noktalar start'tan önce
      return { P, A };
    }
    return null;
  }
  function followRoute(b, s, w, t, others) {
    if (!b.routeFrom) b.routeFrom = { x: b.x, y: b.y };
    const nx = routeNext(b);
    if (!nx) { note(b, s, 'Rota bitti, şamandıraya', 'good', 2); log(s, `${b.id}: çizdiğin rota bitti, şamandıraya gidiyor`); return E.tackHeading(w, b.tack); }
    const { P, A } = nx, brg = bearing(b, P), r = E.norm180(brg - w), LA = layAngle(s, b);
    const clearFor = tk => { const nh = E.tackHeading(w, tk); let m = 1e9;
      for (const o of others) { const c = closest(b, nh, 30, o, 4); if (c.d < 220) m = Math.min(m, c.dmin); }
      return m > 24; };
    if (Math.abs(r) >= LA + 2) {                       // açık seyir: doğrudan noktaya
      const want = r > 0 ? 'port' : 'starboard';
      if (want !== b.tack) {
        // kontra değişecek (tramola ya da kavança): orsadaysa önce açık olmasını bekle
        if (Math.abs(r) > 100 || clearFor(want)) { b.tack = want; b.lastTack = t; }
        else return E.tackHeading(w, b.tack);
      }
      return brg;
    }
    // orsa: zikzak. Çizgiye göre yanal sapma (+ sağ)
    const seg = { x: P.x - A.x, y: P.y - A.y }, L = Math.hypot(seg.x, seg.y) || 1;
    const lat = dot({ x: b.x - A.x, y: b.y - A.y }, { x: -seg.y / L, y: seg.x / L });
    let want = b.tack;
    if (b.tack === 'starboard' && (lat < -ROUTE_CORR || r >= LA - 1)) want = 'port';
    if (b.tack === 'port' && (lat > ROUTE_CORR || r <= -LA + 1)) want = 'starboard';
    if (b.x < 60) want = 'port'; if (b.x > WORLD.w - 60) want = 'starboard';
    if (want !== b.tack && t - b.lastTack > 2.2) {
      // K13 bilinci: tramoladan sonra biriyle çakışacaksa açık olana kadar bekle (koridordan çok taşmadıkça)
      if (clearFor(want) || Math.abs(lat) > ROUTE_CORR * 3 || b.x < 40 || b.x > WORLD.w - 40) doTack(b, s, '');
    }
    if ((b.tack === 'starboard' && r <= -LA + 1) || (b.tack === 'port' && r >= LA - 1)) return brg;   // noktayı tutuyor
    return E.tackHeading(w, b.tack);
  }

  // ---------- İskota ve elle sürme (senin teknen) ----------
  // İdeal iskota = rüzgar açısına göre bumba açısı (engine.sailState: orsada ~10°, apazda ~35°, pupada ~85°).
  // Fazla salınmış yelken pırpırlar (40° fazlası: neredeyse durur), fazla çekik yelken boğulur (en çok %65 kayıp).
  const SHEET_MAX = 88, SHEET_OFF_MAX = 36;
  const idealSheet = abs => E.sailState(abs, 0).boom;
  const trimEff = d => (d >= 0 ? Math.max(0.1, 1 - d / 40) : Math.max(0.35, 1 + d / 45));
  // Elle sürme: zaman durur, diğer tekneler yerinde kalır; yalnız `b` hareket eder (dt sim. saniyesi kadar).
  // inp: { rudder: −1 (sola) … +1 (sağa), autoTrim: iskota rüzgar açısına göre kendiliğinden ayarlanır }
  // b.sheet: bumba açısı (iskota), b.sheetOff: otomatik iskotada ideale göre salma payı, b.helm: Tramola/Kavança düğmesiyle dönüş.
  // Dönen: olaylar dizisi ('tack' | 'jibe' | 'contact:ID' | 'hit')
  function drive(s, b, inp, dt) {
    if (s.course) setCourse(s.course);
    setBoat(s.boat || BOAT_DEFAULT);
    inp = inp || {};
    const w = s.wind, out = [];
    const others = s.boats.filter(o => o !== b && !o.gone && o.phase !== 'done');
    const casters = others.filter(o => o.phase !== 'wait').map(o => ({ x: o.x, y: o.y, v: o.v, ref: o }));   // simülatördeki gibi: bekleyen tekne gölge yapmaz
    if (b.sheet == null) b.sheet = idealSheet(Math.abs(E.norm180(b.h - w)));
    const n = Math.max(1, Math.ceil(dt / DT - 1e-9)), H = dt / n;   // ekran karesi kadar (kesirli) adımlar
    for (let i = 0; i < n; i++) {
      const h0 = b.h;
      // dümen: tekne hızlandıkça daha çabuk döner (dururken dümen az tutar)
      const rate = (30 + 55 * clamp(b.v / BASE, 0, 1)) * H;
      if (inp.rudder) { b.h = E.norm360(b.h + clamp(inp.rudder, -1, 1) * rate); b.helm = null; b.v *= 1 - 0.12 * H * Math.abs(inp.rudder); }
      else if (b.helm) { const st = Math.min(b.helm.left, rate); b.h = E.norm360(b.h + b.helm.dir * st); b.helm.left -= st; if (b.helm.left <= 0.01) b.helm = null; }
      const rel = E.norm180(b.h - w), abs = Math.abs(rel), tk = rel < 0 ? 'starboard' : 'port';
      if (tk !== b.tack) { out.push(abs < 90 ? 'tack' : 'jibe'); b.tack = tk; b.lastTack = s.t; }
      // iskota
      const ideal = idealSheet(abs);
      if (inp.autoTrim !== false) { const want = clamp(ideal + (b.sheetOff || 0), 0, SHEET_MAX); b.sheet += clamp(want - b.sheet, -150 * H, 150 * H); }
      b.sheet = clamp(b.sheet, 0, SHEET_MAX);
      const eff = abs < 30 ? 1 : trimEff(b.sheet - ideal);
      b.trim = eff;
      // rüzgar: sağanak, pis rüzgar, deniz (yarıştaki hız modeliyle aynı)
      b.inGust = gustAt(s.gusts, b, w);
      const sh = E.shadowK({ x: b.x, y: b.y, ref: b }, casters, w, BASE);
      b.shadow = sh.k; b.shadowBy = sh.by ? sh.by.id : null;
      const sea = s.sea || SEA_DEFAULT, upw = abs < 75 ? 1 : 0.4;
      const vt = E.speedFor(abs, BASE) * eff * (1 + GUST_GAIN * b.inGust) * (1 - SHADOW_LOSS * b.shadow) * (b.speedK || 1) *
        (1 - upw * ((SEA.waveLoss[sea.waves] || 0) + (SEA.boatLoss[b.drift || 0] || 0)));
      b.v += (vt - b.v) * Math.min(1, H / (vt > b.v ? TAU : TAU * 1.4));   // yelkeni boşaltınca tekne kısa süre süzülür
      const f = E.fwd(b.h), dw = E.fwd(w + 180), dr = driftOf(s, b), x0 = b.x, y0 = b.y;
      b.x += (f.x * b.v + dw.x * dr) * H; b.y += (f.y * b.v + dw.y * dr) * H;
      // şamandıra, pin, hakem botu ve duran teknelerin içine giremez: yaklaşan adım geri alınır, tekne durur
      // (eskiden dışarı itiliyordu: tekne öbürünün kenarı boyunca yan yan kayıyordu)
      const blocked = (o, R0) => { const d1 = Math.hypot(b.x - o.x, b.y - o.y); return d1 < R0 && d1 < Math.hypot(x0 - o.x, y0 - o.y); };
      for (const o of OBSTACLES) if (blocked(o, o.r + 16)) { b.x = x0; b.y = y0; b.v *= 0.3; if (!out.includes('hit')) out.push('hit'); }
      // teknelerde gövde biçimi (uzun, dar): yan yana ya da kıç kıça yakın geçilebilir, gövdeler değince durur
      for (const o of others) {
        const g1 = hullGap(b, o);
        if (g1 < HULL_GAP && g1 < hullGap({ x: x0, y: y0, h: h0 }, o)) { b.x = x0; b.y = y0; b.h = h0; b.v *= 0.3; if (!out.includes('contact:' + o.id)) out.push('contact:' + o.id); }
      }
      b.x = clamp(b.x, -MAN_MARGIN + 20, WORLD.w + MAN_MARGIN - 20); b.y = clamp(b.y, 15, WORLD.h - 10);
    }
    b.drv = true;
    return out;
  }
  // İki teknenin gövdeleri (baş-kıç doğrusu, ±19 px) arasındaki en kısa uzaklık; HULL_GAP altı = temas (gövde genişliği ~14 px)
  const HULL_GAP = 13;
  function hullGap(a, c) {
    const A = E.fwd(a.h), C = E.fwd(c.h), L = 19;
    const p1 = { x: a.x - A.x * L, y: a.y - A.y * L }, d1 = { x: A.x * 2 * L, y: A.y * 2 * L };
    const p2 = { x: c.x - C.x * L, y: c.y - C.y * L }, d2 = { x: C.x * 2 * L, y: C.y * 2 * L };
    const r = { x: p1.x - p2.x, y: p1.y - p2.y }, aa = dot(d1, d1), ee = dot(d2, d2), f = dot(d2, r), cc = dot(d1, r), bb = dot(d1, d2), den = aa * ee - bb * bb;
    let sP = den > 1e-9 ? clamp((bb * f - cc * ee) / den, 0, 1) : 0, tP = (bb * sP + f) / ee;
    if (tP < 0) { tP = 0; sP = clamp(-cc / aa, 0, 1); } else if (tP > 1) { tP = 1; sP = clamp((bb - cc) / aa, 0, 1); }
    return Math.hypot(p1.x + d1.x * sP - p2.x - d2.x * tP, p1.y + d1.y * sP - p2.y - d2.y * tP);
  }
  // Tramola / kavança düğmesi: rüzgarın içinden (tramola) ya da pupadan (kavança) öbür kontraya dön
  function helmTurn(b, w, kind) {
    const stb = E.norm180(b.h - w) < 0;
    const target = kind === 'tack' ? E.tackHeading(w, stb ? 'port' : 'starboard') : w + (stb ? 150 : -150);
    const dir = kind === 'tack' ? (stb ? 1 : -1) : (stb ? -1 : 1);
    b.helm = { dir, left: E.norm360((target - b.h) * dir), kind };
  }

  // ---------- Bir adım ----------
  function step(s) {
    if (s.course) setCourse(s.course);                      // parkur bu yarışınki (değişmediyse işlem yok)
    setBoat(s.boat || BOAT_DEFAULT);                         // tekne sınıfı / rüzgar hızı / hızlanma anı
    const w = s.wind, t = s.t, active = s.boats.filter(b => !b.gone);
    const racing = b => b.phase === 'race' || b.phase === 'ocs' || b.phase === 'round';
    const snap = active.filter(b => b.phase !== 'done').map(b => ({ ref: b, x: b.x, y: b.y, h: b.h, v: b.v }));
    const rulesOn = t >= s.startAt + 0.5;

    for (const b of active) {
      const remain = s.startAt - t;
      b.inGust = gustAt(s.gusts, b, w);
      const sh = b.phase === 'race' || b.phase === 'round' || b.phase === 'ocs' ? shadowAt(b, snap, w) : { k: 0, by: null };   // pis rüzgar seyreden tekneyi hep yavaşlatır (OCS dönüşü dahil; start öncesi bekleme ve ceza turu hariç)
      if (b.mine && sh.k > 0.25 && !(b.shadow > 0.25) && t > s.startAt) log(s, `${b.id} pis rüzgarda kaldı (${sh.by.id} numaranın rüzgar gölgesi), yavaşladı`, 'bad', 'golge' + b.id);
      b.shadow = sh.k; b.shadowBy = sh.by ? sh.by.id : null;
      if (b.hand) { handPhase(b, s, t, w, remain); continue; }   // elle sürülen tekne: dümen/iskota kullanıcıda (drive), yalnız evre geçişleri
      let target = b.h, speedK = 1, holding = false, turnDir = 0, creepV = null;

      if (b.phase === 'wait') {
        // Hızlanma anı (kullanıcı seçer, ör. 30 sn kala): o ana kadar yelken boş bekler, son 4 dk.da hızlanma
        // noktasına (o sürede alınacak yol kadar geride) yavaşça sokulur; anı gelince yelkeni doldurup hızlanır.
        // Çok gerideki tekne (2. sıra) yetişmek için daha erken doldurmak zorunda kalır.
        const hA = approachHeading(b, w), tGo = BOAT.accelAt / CLOCK_SCALE, dr = driftOf(s, b);
        const d0 = hA == null ? 0 : distToLine(b, hA), dGo = Math.max(4, accelDist(tGo) - dr * tGo);
        const outside = hA == null || (b.x < 60 && E.fwd(hA).x < 0) || (b.x > WORLD.w - 60 && E.fwd(hA).x > 0);
        if (!b.go && !outside) {
          const need = timeToCover(d0 + dr * timeToCover(d0) * 1.2) + 0.1;
          const late = remain <= need && d0 - dGo > BASE * 0.3 * Math.max(0, remain - tGo);   // sokularak yetişemez
          if (remain <= tGo || late) { b.go = true; if (b.mine && remain > 0) log(s, `${b.id} yelkeni doldurdu, hızlanıyor (start'a ${Math.round(remain * CLOCK_SCALE)} sn)`, '', 'hizlan' + b.id); }
        }
        if (outside) b.go = false;                       // hattı tutmuyor ya da kenara gidiyor: bekle
        if (b.go) target = hA;
        else if (!outside && remain - tGo <= CREEP_T) {
          target = hA;                                    // yelken yarı boş, hızlanma noktasına sokul; varınca rotada bekle
          creepV = clamp((d0 - dGo) / Math.max(0.15, remain - tGo), 0, BASE * 0.3) + dr * 0.9;
        } else { target = w + (b.tack === 'starboard' ? -25 : 25); holding = true; }
        if (remain <= 0) { b.phase = lineSide(b) === -1 ? 'ocs' : 'race'; if (b.phase === 'ocs') ocs(b, s); }
      }
      if (b.phase === 'race') {
        const routing = !b.manual && b.started && b.route && b.routeIdx < b.route.length;
        let wt = routing || b.manual ? b.tack : wantedTack(b, s, w);   // manuel: tramolayı yalnız sen atarsın
        // start hattını henüz uçların arasından geçmediyse: önce hattın içine yönel
        let lineAim = null;
        if (!b.started) {
          const u0 = R.lineParam(LINE, b), u = clamp(u0, 0.12, 0.88);
          // gerçekten uçların dışında (pin'in solu / hakem botunun sağı): hattın içindeki bir noktaya yönel.
          // Manuelde uca yakın ama içerideyse düz devam eder (otomatikte pin'e sıkışmasın diye %11 pay)
          const edgeU = b.manual ? 0.02 : 0.11;
          if (u0 < edgeU || u0 > 1 - edgeU) {
            const P = { x: LINE.pin.x + (LINE.boat.x - LINE.pin.x) * u, y: LINE.pin.y + (LINE.boat.y - LINE.pin.y) * u - 30 };
            lineAim = { brg: bearing(b, P), rel: E.norm180(bearing(b, P) - w) };
            wt = lineAim.rel > 15 ? 'port' : lineAim.rel < -15 ? 'starboard' : b.tack;   // ölü bölgede gidip gelmesin
            if (b.manual) {                                 // manuel: kendisi dönmez, yalnız uyarır
              if (wt !== b.tack) { wt = b.tack; if (Math.abs(lineAim.rel) < 45 || (lineAim.rel > 0) !== (b.tack === 'port')) lineAim = null; if (t - (b.warnAt || -9) > 4) { b.warnAt = t; note(b, s, 'Hattın dışındasın: tramola at', 'bad', 3); } }
            }
          } else wt = b.tack;                              // uçların arasında: düz devam, hattı geç
        }
        const edge = b.manual ? b.x < -MAN_MARGIN + 40 || b.x > WORLD.w + MAN_MARGIN - 40 : b.x < 40 || b.x > WORLD.w - 40;
        if (b.manual) {                                    // yalnız parkurdan çıkmasın (ve bunu söyler)
          // tramolayı yalnız sen atarsın: parkurun yan kenarını geçebilir, ancak çok uzaklaşırsa (MAN_MARGIN) zorunlu döner
          const L = -MAN_MARGIN, Rr = WORLD.w + MAN_MARGIN;
          wt = (b.x < L + 25 && b.tack === 'starboard') ? 'port' : (b.x > Rr - 25 && b.tack === 'port') ? 'starboard' : b.tack;
          if (wt !== b.tack) { note(b, s, 'Çok uzaklaştın: zorunlu tramola', 'bad', 3); log(s, `${b.id}: parkurdan çok uzaklaştı, zorunlu tramola`); }
          else if ((b.x < 0 && b.tack === 'starboard') || (b.x > WORLD.w && b.tack === 'port')) { if (t - (b.warnAt || -9) > 6) { b.warnAt = t; note(b, s, 'Parkurun dışına çıkıyorsun: tramola?', '', 2.5); } }
        }
        if (wt !== b.tack && t - b.lastTack > MIN_TACK_GAP && (t > s.startAt + 3 || edge)) {
          // K13 bilinci: tramoladan sonra biriyle çakışacaksa bekle
          const nh = E.tackHeading(w, wt), others = snap.filter(o => o.ref !== b);
          const relWp = E.norm180(bearing(b, waypoint(w)) - w);
          const LA = layAngle(s, b), must = (b.tack === 'starboard' && relWp >= LA + 1) || (b.tack === 'port' && relWp <= -LA - 1) || b.x < 70 || b.x > WORLD.w - 70;
          let m = 1e9;
          for (const o of others) { const c = closest(b, nh, 30, o, 4); if (c.d < 220) m = Math.min(m, c.dmin); }
          if (m > (must ? 22 : 26) || edge || t - Math.max(b.lastTack, s.startAt) > 9) doTack(b, s, '');
        }
        const wp = waypoint(w), dWp = Math.hypot(wp.x - b.x, wp.y - b.y);
        const brg = bearing(b, wp), rel = E.norm180(brg - w);
        target = E.tackHeading(w, b.tack);
        // şamandırayı tutuyorsa doğrudan geçiş noktasına (orsa açısından dar değilse)
        if (lineAim) { if (Math.abs(lineAim.rel) >= 45) { target = lineAim.brg; b.tack = lineAim.rel > 0 ? 'port' : 'starboard'; } }
        else if (!b.started) { /* hattın içinde: orsa rotasında devam */ }
        else if ((b.tack === 'starboard' && rel <= -layAngle(s, b)) || (b.tack === 'port' && rel >= layAngle(s, b))) target = brg;
        else if (!lineAim && Math.abs(rel) >= 55 && (!b.manual || (rel > 0) === (b.tack === 'port'))) { target = brg; b.tack = rel > 0 ? 'port' : 'starboard'; }   // şamandıra rüzgarüstünde değil (aşmış): doğrudan git
        if (routing) target = followRoute(b, s, w, t, snap.filter(o => o.ref !== b));
        // dönüşe başla: giriş noktasına geldi ya da şamandıranın rüzgarüstü tarafında, çembere yakın.
        // Şamandıranın altından (rüzgaraltı yarısından) dönüşe başlanmaz.
        const dM = Math.hypot(b.x - MARK.x, b.y - MARK.y), phi = markAngle(b, w);
        if (b.started && !(b.route && b.routeIdx < b.route.length) && (dWp < 20 || (phi > -10 && phi < 110 && dM < R_ROUND + 26) || (phi > -95 && phi < 95 && dM < 160 && dot({ x: b.x - MARK.x, y: b.y - MARK.y }, E.fwd(w)) > 30))) {
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
        // K44.2: önce diğer teknelerden uzaklaş, sonra dön. Yön: teknenin gitmek istediği (avantajlı) taraf;
        // o taraf kalabalıksa öbür taraf. Hafif apaz (rüzgara ~100°) ile yana açılır.
        const pref = b.manual ? b.tack : wantedTack(b, s, w), others = snap.filter(o => o.ref !== b);
        const cand = ['starboard', 'port'].map(tk => {
          const h = w + (tk === 'starboard' ? -100 : 100); let m = 1e9;
          for (const o of others) { const c = closest(b, h, 40, o, 3); if (c.d < 260) m = Math.min(m, c.dmin); }
          const edgeBad = (tk === 'starboard' && b.x < 140) || (tk === 'port' && b.x > WORLD.w - 140);
          return { tk, h, score: Math.min(m, 120) + (tk === pref ? 45 : 0) - (edgeBad ? 200 : 0) };
        }).sort((a, c) => c.score - a.score)[0];
        b.phase = 'penalty'; b.penWait = true; b.penAway = { h: cand.h, t0: t }; b.penTurn = 0; b.penaltyAt = null; b.man = null;
        note(b, s, `Ceza için ${cand.tk === 'starboard' ? 'sola' : 'sağa'} açılıyor`, 'bad', 2.5);
        log(s, `${b.id} ceza turu için diğer teknelerden ${cand.tk === 'starboard' ? 'sola' : 'sağa'} uzaklaşıyor (K44.2)`, 'bad');
      }
      if (b.phase === 'penalty' && b.penWait && b.penAway) {
        target = b.penAway.h;
        let near = 1e9; for (const o of snap) if (o.ref !== b) near = Math.min(near, Math.hypot(o.x - b.x, o.y - b.y));
        const dt0 = t - b.penAway.t0, atEdge = b.x < 50 || b.x > WORLD.w - 50 || lineSide(b) !== -1 && distToLine(b, w) < 30;
        if ((near > 85 && dt0 > 1.2) || dt0 > 5 || atEdge) { b.penWait = false; b.penAway = null; b.penTurn = 0; log(s, `${b.id} iki tur ceza atıyor (K${b.penaltyRule})`, 'bad'); }
      } else if (b.phase === 'penalty' && b.penWait) {
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

      // akıntı: hedef yöne yere göre gidebilmek için burnu akıntıya karşı tut (orsa açısından dar olmadan)
      if ((b.phase === 'race' || b.phase === 'round' || b.phase === 'ocs') && b.started !== undefined) {
        const D = driftOf(s, b);
        if (D > 0) {
          const r0 = E.norm180(target - w), h2 = crabTo(target, w, D, b.v), r2 = E.norm180(h2 - w);
          target = Math.abs(r0) < 44 ? target : (Math.abs(r2) < 44 ? w + Math.sign(r0) * 44 : h2);
        }
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

      // engel kaçınma (pin, hakem botu, şamandıra): hedef rota engelin güvenlik çemberine çarpıyorsa çembere
      // teğet rota. Kaçış ve dönüş süreklidir: tekne engelin yanından tek, temiz bir yayla geçer (titreme yok).
      let avoiding = 0;                                     // kaçarken dönüş hızı (derece/sn)
      if (b.phase !== 'round' && turnDir >= 0) {
        const markOn = b.phase !== 'done' && !(b.phase === 'penalty' && b.penFinish && !b.penWait);
        const into = (hh, lim) => Math.abs(E.norm180(hh - w)) < lim;
        const st = E.steerAround(b.x, b.y, target, markOn ? AVOID_OBS : LINE_OBS, b.v, { maxTurn: o => o === MARK_OBS[0] ? 0 : 90,   // pin/hakem botunda en çok 90° sapma (eski davranışa yakın)

          ok: b.phase === 'wait' ? null : (hh, o) => o === MARK_OBS[0] || !into(hh, 35),   // rüzgarın içine kaçılmaz (şamandırada tramola kuralı var)
          side: (o, def, hL, hR) => {
            if (o === MARK_OBS[0]) return 1;                     // şamandıra hep iskelede (solda) kalsın
            let sd = def;
            // kaçış rüzgara doğru (yelken boşa) götürecekse öbür taraftan, bordalayarak dolaş
            if (b.phase !== 'wait' && into(b.h + sd * 20, 38)) sd = -sd;
            // start etmemiş tekne pin'i hattın içinden (pin solunda kalacak şekilde) geçmeye çalışır
            if (o === LINE_OBS[0] && !b.started && Math.hypot(b.x - LINE.pin.x, b.y - LINE.pin.y) < 90 && !into(b.h + 20, 32)) sd = 1;
            return sd;
          }
        });
        if (st) {
          // şamandırayı tutamıyor (sağa kaçış rüzgarın içine sokuyor): rüzgarda kalmak yerine hemen tramola
          if (st.o === MARK_OBS[0] && b.phase === 'race' && b.started && !b.manual && b.tack === 'starboard' && into(b.h + 25, 40) && t - b.lastTack > 2) doTack(b, s, 'Tutmuyor, tramola');
          else { target = st.h; avoiding = st.o === MARK_OBS[0] ? 320 : 160; }
        }
      }
      // dönüş
      let diff = E.norm180(target - b.h);
      if (turnDir < 0 && diff > 0) diff -= 360;          // yalnızca sola dön
      const rate = (b.phase === 'round' ? 130 : b.phase === 'penalty' ? 150 : avoiding || TURN_RATE) * DT;
      const dh = clamp(diff, -rate, rate); b.h = E.norm360(b.h + dh);
      if (b.phase === 'penalty' && !b.penWait) b.penTurn += Math.abs(dh);
      // rüzgarın içinde kaldı (şamandıranın altında, akıntı itiyor): tramola atıp çık
      if (b.phase === 'race' && b.started && !b.manual && Math.abs(E.norm180(b.h - w)) < 30 && b.v < 15 && t - b.lastTack > 4) {
        if (!b.stallAt) b.stallAt = t; else if (t - b.stallAt > 1.5) { doTack(b, s, 'Rüzgarda kaldı, tramola'); b.stallAt = 0; }
      } else b.stallAt = 0;
      // hız
      const twa = Math.abs(E.norm180(b.h - w));
      let vt = holding ? driftOf(s, b) * 0.85 : creepV != null ? creepV : E.speedFor(twa, BASE) * speedK;   // beklerken yerinde durmaya çalışır (akıntıya karşı az yelken)
      const tau = b.phase === 'wait' ? TAU_START : TAU;
      // sinyalden önce hatta varacaksa yavaşla (burnu hattın altında kalsın): şu anki hızdan tau ile vt'ye
      // yaklaşırken kalan sürede alınan yol hattaki mesafeyi aşmasın
      if (b.phase === 'wait' && b.go && remain > 0) {
        const k = 1 - Math.exp(-remain / tau), den = remain - tau * k;
        if (den > 0.01) vt = Math.min(vt, Math.max(0, (distToLine(b, b.h) - BOW - 2 - b.v * tau * k) / den + driftOf(s, b) * 0.9));   // burun (merkezden BOW px önde) hatta
      }
      // start öncesi (kurallar henüz yok): öndeki teknenin kıçına girme, arkasında kal (K12 bilinci)
      if (b.phase === 'wait' && !holding) {
        const f = E.fwd(b.h);
        for (const o of active) {
          if (o === b || o.gone) continue;
          const dx = o.x - b.x, dy = o.y - b.y, al = dx * f.x + dy * f.y, lat = Math.abs(dx * f.y - dy * f.x);
          if (al > 0 && al < 80 && lat < 26) vt = Math.min(vt, Math.max(driftOf(s, b) * 0.9, o.v * 0.9 + (al - 36) * 2));   // akıntıda yerinde kal
        }
      }
      if (b.phase === 'done') vt *= 0.8;
      if (!holding && creepV == null) {
        const sea = s.sea || SEA_DEFAULT, upw = twa < 75 ? 1 : 0.4;              // dalga ve yalpalama en çok orsada yavaşlatır
        vt *= (1 + GUST_GAIN * b.inGust) * (1 - SHADOW_LOSS * b.shadow) * (b.speedK || 1) * (1 - upw * ((SEA.waveLoss[sea.waves] || 0) + (SEA.boatLoss[b.drift || 0] || 0)));
        if (b.sheetOff && b.phase !== 'penalty') vt *= trimEff(b.sheetOff);   // senin teknen: iskota salınmış (yavaşlıyor)
      }   // teknenin kendi hızı (tekne/denizci farkı)
      b.v += (vt - b.v) * Math.min(1, DT / tau);
    }

    // hareket
    const dw = E.fwd(w + 180);                                    // rüzgaraltı yönü
    for (const b of active) {
      if (b.hand) continue;                                       // elle sürülen tekne drive() ile zaten ilerledi
      const f = E.fwd(b.h), dr = b.phase === 'done' ? 0 : driftOf(s, b) * (b.phase === 'round' ? 0.3 : 1);   // dönüşte kısa süre: az kayar
      b.x += (f.x * b.v + dw.x * dr) * DT; b.y += (f.y * b.v + dw.y * dr) * DT;
    }
    // temas: üst üste binmeyi engelle, kaydet
    const live = active.filter(b => b.phase !== 'done');
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i], c = live[j], dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy);
      if (d < 26 && d > 0.01) {
        const push = (26 - d) / 2, ux = dx / d, uy = dy / d;
        nudge(a, -ux * push, -uy * push); nudge(c, ux * push, uy * push);
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
    // start'tan önce hattı yalnız manuel (ya da elle sürülen) tekne geçebilir: diğerlerinin burnu hattın altında kalır
    if (t < s.startAt) for (const b of active) if (b.phase === 'wait' && !b.manual) keepBehindLine(b);
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
  // Elle sürülen tekne (canlı elle sürme): hareketi drive() yapar; burada yalnız yarış evreleri ilerler.
  // Şamandıra dönüşü ve ceza turu otomatiğe geçer (b.hand kalkar, arayüz elle sürmeyi bitirir).
  function handPhase(b, s, t, w, remain) {
    if (b.phase === 'wait' && remain <= 0) { b.phase = lineSide(b) === -1 ? 'ocs' : 'race'; if (b.phase === 'ocs') ocs(b, s); }
    else if (b.phase === 'ocs' && lineSide(b) === 1 && distToLine(b, w) > 8) { b.phase = 'race'; b.started = false; note(b, s, b.outside ? 'Geri döndü, şimdi hattın içinden' : 'Geri döndü, şimdi start', '', 2); }
    if (b.phase === 'race' && b.started) {
      const wp = waypoint(w), dWp = Math.hypot(wp.x - b.x, wp.y - b.y), dM = Math.hypot(b.x - MARK.x, b.y - MARK.y), phi = markAngle(b, w);
      // şamandıraya ~1.5 boy yaklaşınca (hangi yandan gelirse gelsin) dönüşü otomatik yapar
      const level = dot({ x: b.x - MARK.x, y: b.y - MARK.y }, E.fwd(w)) > -15;   // şamandıranın hizasına gelmiş (altından kesmiyor)
      if (dWp < 20 || (level && dM < R_ROUND + 40) || (phi > -10 && phi < 110 && dM < R_ROUND + 26)) { b.phase = 'round'; b.roundAt = t; b.hand = false; }
      else if (b.penaltyAt != null && t >= b.penaltyAt) b.hand = false;      // ceza turunu otomatik atar
    }
  }
  // Canlı elle sürme: önce senin teknen dümen/iskotayla bir adım (DT) ilerler, sonra yarışın geri kalanı bir adım.
  // Herkes aynı zamanda hareket eder (eskiden zaman donuyordu, teknen tek başına öne fırlıyordu).
  function handStep(s, b, inp, path) {
    const ev = drive(s, b, inp, DT);
    if (path) path.push(handRow(b));                            // kayıt için: sürüşten sonraki, adımdan önceki durum
    b.hand = true; step(s);
    return ev;
  }
  // Kayıttan tekrar: elle sürülen bölümde senin teknenin adım adım durumu (yol) uygulanır, diğerleri yeniden hesaplanır
  const HAND_KEYS = ['x', 'y', 'h', 'v', 'sheet'];
  const handRow = b => [...HAND_KEYS.map(k => +(+b[k] || 0).toFixed(2)), b.tack === 'port' ? 1 : 0];
  function runHand(s0, path) {
    const s = clone(s0), frames = [clone(s)], b = s.boats.find(o => o.mine);
    if (!b) return frames;
    b.manual = true;
    path.forEach((p, i) => {
      HAND_KEYS.forEach((k, j) => { b[k] = p[j]; });
      const tk = p[5] ? 'port' : 'starboard'; if (tk !== b.tack) { b.tack = tk; b.lastTack = s.t; }
      b.drv = true; b.hand = true; step(s);
      if (Math.round(s.t / DT) % 2 === 0 || i === path.length - 1) frames.push(clone(s));
    });
    b.hand = false;
    return frames;
  }

  // Temas itmesi: üst üste binen tekneler ayrılır. Yan yana ise itme çoğunlukla teknenin kendi rotası boyunca
  // (geri tutulur) uygulanır, yana kayma yarıya iner: tekne yan yan (yengeç gibi) gitmesin.
  function nudge(b, px, py) {
    const f = E.fwd(b.h), al = px * f.x + py * f.y, lx = px - al * f.x, ly = py - al * f.y;
    b.x += al * f.x + lx * 0.5; b.y += al * f.y + ly * 0.5;   // yana yarısı (tamamen kaldırınca uçlarda kalabalık takılıyor: fuzz)
  }
  // Burnu (ve kıçı) hattın start tarafında tut: hat çizgisine dik uzaklık en az 2 px
  const BOW = 24;
  function keepBehindLine(b) {
    const p = LINE.pin, q = LINE.boat, lx = q.x - p.x, ly = q.y - p.y, L = Math.hypot(lx, ly), nx = -ly / L, ny = lx / L;   // n: start tarafı
    const f = E.fwd(b.h), sd = Math.min(...[BOW, -BOW].map(k => ((b.x + f.x * k - p.x) * nx + (b.y + f.y * k - p.y) * ny)));
    if (sd >= 2) return;
    if ((b.x - p.x) * nx + (b.y - p.y) * ny < -BOW) return;     // kurulumda hattın üstüne konmuş: OCS kalır
    b.x += nx * (2 - sd); b.y += ny * (2 - sd); b.v *= 0.5;
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
    return { ...s, sea: { ...(s.sea || SEA_DEFAULT) }, gusts: s.gusts.map(g => ({ ...g })), boats: s.boats.map(b => ({ ...b })), events: s.events.slice(), pairLog: { ...s.pairLog } };
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
    DT, HULL, WORLD, LINE, MARK, BASE, CLASSES, BOAT_DEFAULT, WIND_KN, ACCEL_AT, setBoat, upwindKn, BOAT,
    get START_AT() { return START_AT; }, get CLOCK_SCALE() { return CLOCK_SCALE; }, MAN_MARGIN, PERSONAS, MINE_COLOR, OBSTACLES,
    SHADOW_LEN, SEA, SEA_DEFAULT, knots, drive, helmTurn, idealSheet, trimEff, SHEET_MAX, SHEET_OFF_MAX, defaultFleet, handStep, runHand, handRow, setCourse, COURSE_DEFAULT, makeBoat, newRace, step, command, standings, clone, waypoint, gustAt, fmt, lineSide
  };
})(typeof window !== 'undefined' ? window : globalThis);
