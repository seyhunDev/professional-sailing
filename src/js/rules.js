/* Kural motoru: kullanıcı tarafından eklenen tekneler, karşılaştıkları teknelere göre
   RRS Bölüm 2 temel kurallarını uygular.
   - Kural 10: zıt kontralar → iskele kontra yol verir (bordalayarak arkadan geçer)
   - Kural 11: aynı kontra, bindirmeli → rüzgarüstü yol verir (orsalayarak uzaklaşır)
   - Kural 12: aynı kontra, bindirmesiz → arkadaki yol verir (yavaşlar, hafif bordalar)
   - Kural 14: hak sahibi tekne de temas kaçınılmazsa kaçar
   Tüm ek tekneler birlikte, adım adım simüle edilir; scripted tekneler rotalarını değiştirmez.
*/
(function (global) {
  const E = global.SailEngine;
  const HULL = 50;
  const DT = 0.05;

  const dot = (a, b) => a.x * b.x + a.y * b.y;

  // X, O'nun "net arkasında" mı? (X'in merkezi O'nun kıç hattının gerisinde)
  function clearAstern(X, O) {
    const f = E.fwd(O.h);
    return dot({ x: X.x - O.x, y: X.y - O.y }, f) < -HULL * 0.9;
  }

  // X, O'nun rüzgarüstünde mi? (RRS tanımı: bindirmeli iki tekneden rüzgarüstü olan, diğerinin
  // RÜZGARÜSTÜ YANINDA duran teknedir.) Yan, teknelerin rotasına diktir: aynı kontrada yan yana
  // giden iki teknede biraz önde olan rüzgaraltı tekne, rüzgar yönüne izdüşümde "daha yukarıda"
  // görünebilir; yalnızca rüzgar yönüne bakmak bu yüzden hakkı ters verir.
  function isWindward(X, O, windFrom) {
    const up = E.fwd(windFrom);
    const fx = E.fwd(X.h), fo = E.fwd(O.h);
    let f = { x: fx.x + fo.x, y: fx.y + fo.y }; const fl = Math.hypot(f.x, f.y);
    const rel = { x: X.x - O.x, y: X.y - O.y };
    if (fl < 1e-6) return dot(rel, up) > 0;
    f = { x: f.x / fl, y: f.y / fl };
    const k = dot(up, f), n = { x: up.x - k * f.x, y: up.y - k * f.y };   // rotaya dik, rüzgar tarafı
    if (Math.hypot(n.x, n.y) < 0.17) return dot(rel, up) > 0;            // tam rüzgara ya da tam pupa: yan belirsiz
    return dot(rel, n) > 0;
  }

  // En yakın yaklaşma: {tc, dmin, d}
  function approach(X, O) {
    const r = { x: O.x - X.x, y: O.y - X.y };
    const fx = E.fwd(X.h), fo = E.fwd(O.h);
    const wv = { x: fo.x * O.v - fx.x * X.v, y: fo.y * O.v - fx.y * X.v };
    const w2 = dot(wv, wv);
    const d = Math.hypot(r.x, r.y);
    let tc = w2 < 1e-6 ? 0 : -dot(r, wv) / w2;
    tc = Math.max(0, Math.min(8, tc));
    const dmin = Math.hypot(r.x + wv.x * tc, r.y + wv.y * tc);
    return { tc, dmin, d };
  }

  // Start hattı yardımcıları (pin → hakem botu vektörü; "arka" taraf = start öncesi taraf)
  function lineSide(line, p) {
    const lx = line.boat.x - line.pin.x, ly = line.boat.y - line.pin.y;
    return (lx * (p.y - line.pin.y) - ly * (p.x - line.pin.x)) > 0 ? 1 : -1;   // +1: start tarafı (hattın altı)
  }
  function lineParam(line, p) {   // hat üzerindeki konum 0..1 (0 = pin, 1 = hakem botu)
    const lx = line.boat.x - line.pin.x, ly = line.boat.y - line.pin.y;
    return ((p.x - line.pin.x) * lx + (p.y - line.pin.y) * ly) / (lx * lx + ly * ly);
  }

  // Hızlanma mesafesi: goAt→startAt arasında v0'dan orsa hızına çıkan teknenin kat ettiği yol
  function accelDistance(base, v0, dur, TAU) {
    let v = v0, sAcc = 0; const vt = E.speedFor(45, base);
    for (let t = 0; t < dur; t += DT) { v += (vt - v) * Math.min(1, DT / TAU); sAcc += v * DT; }
    return sAcc;
  }

  /* ---------- Ortak yol hakkı çekirdeği (simülatör ve senaryolar AYNI fonksiyonları kullanır) ----------
     2026-11-13: senaryo filosu artık simülatörün "kim yol verir" (classify), "yol vermeli miyim" (giveWay) ve
     "kaçış seçici" (chooseEscape) mantığıyla hareket eder; iki yerde farklı davranış kalmasın diye tek kaynak.
     Tekne nesnesinde kullanılan alanlar: x, y, h, v, tack, phase ('race' varsayılır), lastTack, ignoresRules, id. */
  // Yol verme mesafeleri (merkezler arası px; tekne boyu 50). Optimist'ler yakın geçer:
  // detect: bu kadar yakından geçecekse yol veren önlem alır · safe: kaçışta hedeflenen en yakın geçiş
  const GW = { detect: 34, safe: 34 };
  const tackOf = (h, w) => (E.norm180(h - w) < 0 ? 'starboard' : 'port');
  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
  // a ile c'nin (a: h, v ile) en yakın yaklaşması, ufuk H saniye
  function closest(a, h, v, c, H) {
    const fa = E.fwd(h), fc = E.fwd(c.h);
    const rx = c.x - a.x, ry = c.y - a.y, wx = fc.x * c.v - fa.x * v, wy = fc.y * c.v - fa.y * v;
    const w2 = wx * wx + wy * wy;
    const tc = w2 < 1e-6 ? 0 : clampN(-(rx * wx + ry * wy) / w2, 0, H);
    return { dmin: Math.hypot(rx + wx * tc, ry + wy * tc), tc, d: Math.hypot(rx, ry) };
  }
  // b, O'ya hangi kurala göre yol vermeli? (0 = b hak sahibi)
  function classify(b, O, w, t) {
    const lt = x => (x.lastTack != null ? x.lastTack : -10);
    const tk = x => t - lt(x) < 1.4 && Math.abs(E.norm180(x.h - w)) < 44;
    if (b.phase === 'penalty') return 22;                                 // ceza turu atan tekne herkese yol verir (K22.2)
    if (O.phase === 'penalty') return 0;
    if (b.phase === 'ocs') return 22;                                     // geri dönen tekne herkese yol verir
    if (O.phase === 'ocs') return 0;
    if (O.phase === 'round' && b.phase !== 'round') return 18;            // şamandırayı dönen tekneye yer ver
    if (b.phase === 'round' && O.phase !== 'round') return 0;
    if (tk(b) && !tk(O)) return 13;                                       // tramola atan yol verir (K13)
    if (tk(O) && !tk(b)) return 0;
    const tb = tackOf(b.h, w), to = tackOf(O.h, w);
    if (tb !== to) return tb === 'port' ? 10 : 0;
    if (clearAstern(b, O)) return 12;
    if (clearAstern(O, b)) return 0;
    return isWindward(b, O, w) ? 11 : 0;                                  // rüzgarüstü (yan olarak) yol verir
  }
  // b kime yol vermeli? others: [{x,y,h,v,ref}] → {O, rule, lee, dmin, tc} | null
  function giveWay(b, others, w, t) {
    let best = null;
    const vb = Math.max(b.v, 22);
    for (const O of others) {
      const c = closest(b, b.h, vb, O, 4);
      if (c.d > 200 || c.dmin > GW.detect) continue;
      if (c.dmin > c.d - 4 && c.d > 34) continue;                       // uzaklaşıyor / paralel
      let rule = classify(b, O.ref, w, t);
      // hak sahibi rotasında kalır; yalnızca karşıdaki yol vermiyorsa (kural bilmeyen) ya da temas
      // kaçınılmazsa son anda kaçar (K14). Rüzgaraltı tekne (K11 hak sahibi) daha da geç davranır:
      // temas önleme işi rüzgarüstündedir (orsalar, yelkeni pırpırlar, yavaşlar)
      const lee = !rule && classify(O.ref, b, w, t) === 11;
      if (!rule && (lee
        ? (O.ref.ignoresRules && c.dmin < 20 && c.tc < 1.1) || (c.dmin < 9 && c.tc < 0.6)
        : (O.ref.ignoresRules && c.dmin < 24 && c.tc < 1.4) || (c.dmin < 14 && c.tc < 0.9))) rule = 14;
      if (!rule) continue;
      const urg = c.tc - c.dmin / 40;
      if (!best || urg < best.urg) best = { O, rule, lee: rule === 14 && lee, dmin: c.dmin, tc: c.tc, urg, mine: b.mine };
    }
    return best;
  }
  /* Kaçış: aday rota farkları arasından en güvenlisini seç. target: teknenin istediği rota.
     opts.allowTack: kaçmak için tramola serbest mi (çağıran karar verir: taktik, rota, faz)
     opts.marks: çarpılmaması gereken sabit noktalar [{x,y}] (şamandıra) */
  function chooseEscape(b, others, w, target, t, g, opts) {
    opts = opts || {};
    const away = b.tack === 'starboard' ? -1 : 1;                       // bordalama yönü (+ rüzgardan uzak)
    const cands = [];
    for (const off of [0, 15, 30, 45, 60]) cands.push({ kind: off ? 'duck' : 'hold', off: away * off, speed: 1, cost: off * 0.12 });
    for (const off of [15, 25]) cands.push({ kind: 'luff', off: -away * off, speed: 1, cost: off * 0.18 });
    cands.push({ kind: 'slow', off: 0, speed: 0.35, cost: 5 });
    cands.push({ kind: 'slow', off: away * 20, speed: 0.4, cost: 6 });
    if (opts.allowTack && g.rule !== 14 && g.rule !== 11 && g.rule !== 12) cands.push({ kind: 'tack', h: E.tackHeading(w, b.tack === 'starboard' ? 'port' : 'starboard'), speed: 0.6, cost: 9 });
    // K11: rüzgarüstü tekne orsalayarak yol verir (rüzgara döner, yelkeni pırpırlar, yavaşlar).
    // Bordalamak (rüzgaraltındakine doğru inmek) yalnızca öbür tekne açıkça öndeyse, kıçından geçmek için
    if (g.rule === 11) {
      const O = g.O, ahead = dot({ x: O.x - b.x, y: O.y - b.y }, E.fwd(b.h)) > 30;
      cands.splice(0, cands.length, { kind: 'hold', off: 0, speed: 1, cost: 0 });
      for (const off of [10, 20, 30]) cands.push({ kind: 'luff', off: -away * off, speed: 1, cost: off * 0.06 });
      cands.push({ kind: 'luff', off: -away * 25, speed: 0.5, cost: 3 });
      cands.push({ kind: 'slow', off: 0, speed: 0.4, cost: 5 });
      if (ahead) for (const off of [15, 30]) cands.push({ kind: 'duck', off: away * off, speed: 1, cost: off * 0.12 });
    }
    // K14, rüzgaraltı hak sahibi: rotadan çıkıp kaçmaz (rüzgarüstündekine doğru da orsalamaz), yalnız rotasında yavaşlar
    if (g.rule === 14 && g.lee) cands.splice(0, cands.length,
      { kind: 'hold', off: 0, speed: 1, cost: 0 }, { kind: 'slow', off: 0, speed: 0.6, cost: 2 }, { kind: 'slow', off: 0, speed: 0.35, cost: 4 });
    // K18: şamandırada dönen tekneye yer ver → bordalayıp uzaklaşma, rotada yavaşla ya da hafif orsala
    if (g.rule === 18) cands.splice(0, cands.length,
      { kind: 'hold', off: 0, speed: 1, cost: 0 }, { kind: 'slow', off: 0, speed: 0.3, cost: 3 }, { kind: 'slow', off: -away * 15, speed: 0.35, cost: 4 }, { kind: 'duck', off: away * 15, speed: 0.6, cost: 5 });
    let best = null;
    for (const c of cands) {
      const h = c.h != null ? c.h : target + c.off, v = Math.max(8, Math.max(b.v, 22) * c.speed);
      let m = 1e9;
      for (const O of others) { const r = closest(b, h, v, O, 4); if (r.d < 220) m = Math.min(m, r.dmin); }
      for (const mk of opts.marks || []) { const rm = closest(b, h, v, { x: mk.x, y: mk.y, h: 0, v: 0 }, 3); m = Math.min(m, rm.dmin + 14); }   // şamandıraya da çarpma
      const score = Math.min(m, GW.safe) - c.cost;
      if (!best || score > best.score) best = { ...c, score };
    }
    return best;
  }
  function ruleText(rule, kind) {
    const act = { duck: 'bordalıyor', luff: 'orsalıyor', slow: 'yavaşlıyor', tack: 'tramola', hold: 'rotada' }[kind] || '';
    const r = { 10: 'K10', 11: 'K11', 12: 'K12', 13: 'K13', 14: 'K14', 18: 'K18', 22: 'K22' }[rule];
    return rule === 14 ? `Temas önleme · K14 (${act})` : `${r} (${act})`;
  }

  /* Tüm ek tekneleri (senaryo filosu + kullanıcı eklemeleri) birlikte simüle et.
     2026-11-13'ten beri simülatörle AYNI kurallar: giveWay → chooseEscape (K10/11/12/13/14), rüzgarüstü orsalayarak
     yol verir, rüzgaraltı hak sahibi rotasında kalır (K14 yalnız son anda, rotada yavaşlayarak), aynı yol verme
     mesafeleri (GW), aynı dönüş hızı (TURN_RATE), aynı hız modeli (speedFor × kaçış hızı × pis rüzgar) ve start
     öncesi "öndekinin kıçına girme". Senaryo tekneleri (ders) rotasını değiştirmez: filo için "yol vermez" teknedir
     (simülatördeki ignoresRules gibi), hak sahibi filo teknesi ona karşı biraz daha erken K14 yapar.
     specs: [{pos:{x,y}, tack}] ya da start senaryosunda [{slot:{x,y}, tack}] (hat üstündeki hedef geçiş noktası)
     scripted: [{track}]  → her spec için örnek dizisi [{t,x,y,h,v,note}] */
  /* Start öncesi bekleyen filo (kullanıcı 2026-11-13, bildirim #20): gerçek Optimist startı gibi hattın dibinde,
     burun ~0,1-0,5 boy altta, neredeyse kıpırdamadan bekler; 1.6 animasyon sn (clockScale 4 → ~6 gerçek sn) kala
     doldurup hattı ~%80 hızla geçer. Eskiden 2.5 sn / %4 sürünme: filo hattın 1-1,3 boy altında bekliyordu. */
  const CROWD = { goBefore: 1.6, creep: 0.015 };
  const TURN_RATE = 110;   // derece/sn, simülatörle aynı
  function simulate(scn, specs, scripted) {
    const base = scn.baseSpeed || 55, TAU = E.scenarioTau(scn);
    const isStart = !!(scn.line && scn.startAt > 0);
    const goAt = isStart ? Math.max(0, scn.startAt - (scn.goBefore || CROWD.goBefore)) : 0;   // küçük tekne: sinyalden önce yelkeni doldur
    const rulesFrom = scn.line ? (scn.startAt || 0) + 0.5 : 0;                      // simülatör gibi: kurallar sinyalden 0.5 s sonra
    const w0 = E.windAt(scn.wind, 0);
    const HOLD_V = base * (scn.holdCreep != null ? scn.holdCreep : CROWD.creep);   // bekleyen filonun öne sürünme hızı
    const obstacles = E.obstaclesOf(scn);
    const marks = scn.marks || [];
    const shadowsOn = scn.shadows !== false;
    const boats = specs.map((s, i) => {
      const h0 = E.tackHeading(w0, s.tack);
      let pos = s.pos;
      if (isStart && s.slot) {
        // geçiş noktasından geriye: hızlanma yolu + bekleme sürüklenmesi kadar
        const f = E.fwd(h0), fh = E.fwd(w0 + (s.tack === 'starboard' ? -25 : 25));
        const sAcc = accelDistance(base, HOLD_V, scn.startAt - goAt, TAU) + (s.row || 0) * 60 + (s.back || 0);
        pos = { x: s.slot.x - f.x * sAcc - fh.x * HOLD_V * goAt, y: s.slot.y - f.y * sAcc - fh.y * HOLD_V * goAt };
      }
      return { id: 'f' + (i + 1), x: pos.x, y: pos.y, h: h0, v: s.v0 != null ? s.v0 : (isStart ? HOLD_V : 0), tack: s.tack,
        phase: 'race', lastTack: -10, man: null, manUntil: -1, reEval: 0, escH: null, escSpeed: 1, noteUntil: -1, note: '', crossed: false,
        side: scn.line ? lineSide(scn.line, pos) : 0, out: [{ t: 0, x: pos.x, y: pos.y, h: h0 }] };
    });
    // senaryo teknesinin kontrası ve son tramola anı (K13: tramola atan yol verir)
    const sRef = scripted.map((b, i) => ({ id: 's' + (i + 1), ignoresRules: true, phase: 'race', lastTack: -10, tack: null }));
    let t = 0;
    while (t < scn.duration) {
      const w = E.windAt(scn.wind, t);
      const scriptedNow = scripted.map((b, i) => {
        const s = E.sampleTrack(b.track, t), r = sRef[i], tk = tackOf(s.h, w);
        if (r.tack && tk !== r.tack && Math.abs(E.norm180(s.h - w)) < 60) r.lastTack = t;
        r.tack = tk;
        return { x: s.x, y: s.y, h: s.h, v: s.v != null ? s.v : base, ref: r };
      });
      const snap = [...scriptedNow, ...boats.map(o => ({ x: o.x, y: o.y, h: o.h, v: o.v, ref: o }))];
      const casters = shadowsOn ? snap.map(o => ({ x: o.x, y: o.y, v: o.v, ref: o.ref })) : [];
      const rulesOn = t >= rulesFrom;
      for (const b of boats) {
        const holding = t < goAt;
        let target = holding ? w + (b.tack === 'starboard' ? -25 : 25) : E.tackHeading(w, b.tack), speedK = 1;   // beklerken orsalayıp durur
        if (rulesOn) {
          const others = snap.filter(o => o.ref !== b);
          const g = giveWay(b, others, w, t);
          if (g) {
            if (t >= b.reEval || !b.man) {
              const ch = chooseEscape(b, others, w, target, t, g, { allowTack: t - b.lastTack > 1.5, marks });
              b.reEval = t + 0.3;
              if (ch.kind === 'tack') { b.tack = b.tack === 'starboard' ? 'port' : 'starboard'; b.lastTack = t; b.man = 'tack'; b.escH = null; target = E.tackHeading(w, b.tack); }
              else { b.man = ch.kind; b.escH = ch.off; b.escSpeed = ch.speed; }
              if (ch.kind !== 'hold') {
                b.note = (g.rule === 14 ? '' : 'Yol veriyor · ') + ruleText(g.rule, ch.kind); b.noteUntil = t + 2;
                if (g.rule === 14) b.k14 = { t, by: g.O.ref.id };   // hak sahibi kaçmak zorunda kaldı: simülatörde karşı tarafa protesto
              }
            }
            b.manUntil = t + 0.8;
          } else if (b.man && t > b.manUntil) { b.man = null; b.escH = null; }
          if (b.man && b.man !== 'tack' && b.escH != null) { target += b.escH; speedK = b.escSpeed; }
        }
        // dönüş (simülatörle aynı hız)
        // engel (şamandıra/pin/hakem botu) varsa hedef rota çembere teğet olur: tek, temiz bir yay (titreme yok).
        // Beklerken (rüzgara baş vermiş) dönmez, engelin dibinde durur.
        const st = E.steerAround(b.x, b.y, target, obstacles, b.v, holding ? null : { mem: b.avMem || (b.avMem = {}) });
        const holdStop = holding && st && st.gap < 12;
        if (st && !holding) target = st.h;
        const diff = E.norm180(target - b.h), rate = (st && !holding ? 160 : TURN_RATE) * DT;
        b.h = E.norm360(b.h + Math.max(-rate, Math.min(rate, diff)));
        const twa = Math.abs(E.norm180(b.h - w));
        let vt = holding ? (holdStop ? 0 : HOLD_V) : E.speedFor(twa, base) * speedK;
        // start öncesi (kurallar henüz yok): öndeki teknenin kıçına girme, arkasında kal (simülatördeki K12 bilinci)
        if (!rulesOn && !holding) {
          const f = E.fwd(b.h);
          for (const o of snap) {
            if (o.ref === b) continue;
            const dx = o.x - b.x, dy = o.y - b.y, al = dx * f.x + dy * f.y, lat = Math.abs(dx * f.y - dy * f.x);
            if (al > 0 && al < 80 && lat < 26) vt = Math.min(vt, Math.max(0, o.v * 0.9 + (al - 36) * 2));
          }
        }
        if (!holding && shadowsOn) vt *= 1 - E.SHADOW.loss * E.shadowK({ x: b.x, y: b.y, ref: b }, casters, w, base).k;   // pis rüzgar
        b.v += (vt - b.v) * Math.min(1, DT / TAU);
      }
      t += DT;
      for (const b of boats) {
        const f = E.fwd(b.h); b.x += f.x * b.v * DT; b.y += f.y * b.v * DT;
        // kuvvetli rüzgar (scn.leeway {from, rate}): start öncesi bekleyen filo rüzgaraltına kayar (sancakta sola-aşağı)
        if (scn.leeway && t < goAt && t >= (scn.leeway.from || 0)) {
          const lw = scn.leeway, k = lw.ramp ? Math.min(1, (t - (lw.from || 0)) / lw.ramp) : 1;
          const fd = E.fwd(E.windAt(scn.wind, t) + 180 + (b.tack === 'starboard' ? 30 : -30));
          b.x += fd.x * lw.rate * k * DT; b.y += fd.y * lw.rate * k * DT;
        }
        // start hattı geçiş kontrolü
        if (scn.line && !b.crossed) {
          const side = lineSide(scn.line, b);
          if (b.side === 1 && side === -1) {
            b.crossed = true;
            const u = lineParam(scn.line, b);
            if (u < 0 || u > 1) { b.note = 'Çizgi dışından geçti!'; b.noteUntil = t + 3.5; }
            else if (isStart && t < scn.startAt) { b.note = 'ERKEN · OCS'; b.noteUntil = t + 3.5; }
          }
          b.side = side;
        }
        b.out.push({ t, x: b.x, y: b.y, h: b.h, v: b.v, note: t < b.noteUntil ? b.note : '', k14: b.k14 && b.k14.t > t - DT * 1.5 ? b.k14.by : undefined });
      }
    }
    return boats.map(b => b.out);
  }

  /* Senaryo tekneleri pis rüzgarda yavaşlasın: önceden hesaplanmış rotayı zamanda esnet.
     Gölgedeyken rota üzerinde (1 − loss·k) hızla ilerler; biriken gecikme tekne beklerken (yavaşken)
     hızlı geçilerek kapanır, böylece start zamanlaması bozulmaz. fixed: hareketi sabit diğer tekneler. */
  function warpForShadows(scn, scripted, fixed) {
    const base = scn.baseSpeed || 55, dur = scn.duration + 0.5;
    const tau = scripted.map(() => 0), out = scripted.map(() => []);
    for (let t = 0; t <= dur + 1e-9; t += DT) {
      const w = E.windAt(scn.wind, t);
      const cur = scripted.map((b, i) => ({ ...E.sampleTrack(b.track, tau[i]), ref: 's' + i }));
      const casters = [...cur, ...fixed.map((f, j) => ({ ...E.sampleTrack(f, t), ref: 'f' + j }))];
      cur.forEach((p, i) => {
        out[i].push({ ...p, t, ref: undefined });
        const rel = (p.v || 0) / base, lag = t - tau[i];
        let rate = 1;
        if (scripted[i].noShadow) rate = 1;
        else if (rel < 0.2) rate = 1 + Math.min(2, lag * 2);                  // beklerken gecikmeyi kapat
        else rate = 1 - E.SHADOW.loss * E.shadowK(p, casters, w, base).k;
        tau[i] = Math.min(t + DT, tau[i] + rate * DT);
      });
    }
    return out;
  }

  /* Bir senaryonun tüm rotaları: senaryo tekneleri + kalabalık filo (+ ek tekneler), pis rüzgar dahil.
     extraSpecs: simulate() spec listesi (kalabalık + kullanıcı eklemeleri). Dönen: { scripted: [track], extras: [track] } */
  function buildScene(scn, extraSpecs) {
    let scripted = scn.boats.map(b => ({ track: E.buildTrack(scn, b.start, b.segs, { v0: b.v0, t0: b.t0 }), noShadow: b.noShadow }));
    let extras = extraSpecs.length ? simulate(scn, extraSpecs, scripted) : [];
    if (scn.shadows !== false) {
      const warped = warpForShadows(scn, scripted, extras);
      scripted = warped.map((tr, i) => ({ track: tr, noShadow: scripted[i].noShadow }));
      if (extraSpecs.length) extras = simulate(scn, extraSpecs, scripted);   // filo esnetilmiş rotalara göre yeniden
    }
    return { scripted: scripted.map(s => s.track), extras };
  }

  global.SailRules = { GW, closest, classify, giveWay, chooseEscape, ruleText, tackOf, simulate, buildScene, warpForShadows, clearAstern, isWindward, approach, lineSide, lineParam };
})(typeof window !== 'undefined' ? window : globalThis);
