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

  /* Kural tepki eşikleri ("his"). STRICT: kuralın ilk sezildiği an tepki (eski davranış, decide() varsayılanı).
     SCENARIO: senaryolardaki filo ve ek tekneler için gevşek ayar (kullanıcı isteği 2026-11-12): senaryo
     kuralı değil taktiği anlatır, gri tekneler erken orsalayıp / kafa açıp rotadan çıkmasın, olay kesintisiz
     oynasın. Tekneler ancak gerçekten yakınlaşınca (≈0.7 boy) ve kısa süre tepki verir.
     Senaryo bazında `scn.ruleFeel: {...}` ile tek tek değerler değiştirilebilir. Simülatör (sim-core.js)
     kendi kaçış seçicisini kullanır, bu ayardan etkilenmez. */
  const STRICT = {
    look: 260,        // bu mesafeden uzaktaki tekneye bakma (px)
    riskD: 58,        // öngörülen en yakın yaklaşma bunun altındaysa risk (px)
    riskT: 8,         // ... ve bu kadar saniye içindeyse
    nearD: HULL * 0.85,   // şu an bu kadar yakınsa risk
    k14D: 40, k14T: 2.2, k14Near: HULL * 0.8,   // hak sahibinin temas önleme (K14) eşiği
    hold: 1.2,        // manevra tetiklenince en az bu kadar sürer (s)
    luffK11: 28,      // K11 rüzgarüstü orsalama: rüzgara açı (küçük = daha çok orsa, pırpır)
    slow: 0.55, slowTurn: 18,   // K12 arkadaki: hız çarpanı, bordalama açısı
    duck: 60,         // bordalama açısı (orsa rotasından)
  };
  const SCENARIO = {
    ...STRICT,
    look: 160, riskD: 34, riskT: 2.5, nearD: 30,
    k14D: 20, k14T: 1.0, k14Near: 26,
    hold: 0.6, luffK11: 36, slow: 0.8, slowTurn: 8, duck: 40,
    // senaryo teknesi (dersin kendisi, rotasını değiştirmez) karşısında biraz daha erken: çarpışma olmasın
    lesson: { riskD: 44, riskT: 3.5, nearD: 31, k14D: 36, k14T: 2.0, k14Near: 36 },
  };

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

  // X için karar: {kind, note, rule} | null
  function decide(X, others, windFrom, feel) {
    const F0 = feel || STRICT;
    let best = null;
    for (const O of others) {
      const a = approach(X, O);
      if (a.d > F0.look) continue;
      const F = typeof O.ref === 'string' && F0.lesson ? { ...F0, ...F0.lesson } : F0;
      const risk = a.dmin < F.riskD && a.tc < F.riskT && a.dmin < a.d - 6;   // yakınsıyor olmalı; paralel seyir risk değil
      const nearNow = a.d < F.nearD;
      if (!risk && !nearNow) continue;
      const sX = E.sailState(X.h, windFrom), sO = E.sailState(O.h, windFrom);
      let dec;
      if (sX.tack !== sO.tack) {
        dec = sX.tack === 'port'
          ? { kind: 'duck', note: 'Yol veriyor · K10', rule: 10 }
          : { kind: 'row', note: 'Hak sahibi · K10', rule: 10 };
      } else {
        const xAstern = clearAstern(X, O), oAstern = clearAstern(O, X);
        if (!xAstern && !oAstern) {
          const windward = isWindward(X, O, windFrom);
          dec = windward
            ? { kind: 'luffK11', note: 'Rüzgarüstü yol verir · K11 (orsalıyor)', rule: 11 }
            : { kind: 'row', note: 'Hak sahibi · K11', rule: 11 };
        } else if (xAstern) {
          dec = { kind: 'slow', note: 'Arkadaki yol verir · K12', rule: 12 };
        } else {
          dec = { kind: 'row', note: 'Hak sahibi · K12', rule: 12 };
        }
      }
      // Kural 14: hak sahibi olsa da temas kaçınılmazsa kaç.
      // Rüzgaraltı tekne (K11 hak sahibi) rotasından çıkmaz: temas önleme işi rüzgarüstündedir (orsalar,
      // yelkeni pırpırlar). Yalnız çok yakında rotasında yavaşlar. Senaryo teknesi (yol vermez) karşısında eski kural.
      const leeK11 = dec.kind === 'row' && dec.rule === 11 && typeof O.ref !== 'string';
      if (leeK11) {
        if ((a.dmin < 12 && a.tc < 0.8) || a.d < HULL * 0.5) dec = { kind: 'brake', note: 'Temas önleme · K14 (rotada yavaşlıyor)', rule: 14 };
      } else if (dec.kind === 'row' && ((a.dmin < F.k14D && a.tc < F.k14T) || a.d < F.k14Near)) {
        dec = { kind: 'duck', note: 'Temas önleme · K14', rule: 14 };
      }
      // en acil olanı seç: önce manevra gerektirenler, sonra en yakın
      const prio = (dec.kind === 'row' ? 0 : 10) + (8 - a.tc);
      // çok yakında (gevşek ayarda geç kalınmışsa) manevra tam açıyla yapılır
      const urgent = F !== STRICT && (a.d < F.nearD + 4 || a.dmin < F.riskD * 0.6);
      if (!best || prio > best.prio) best = { ...dec, prio, tc: a.tc, urgent };
    }
    return best;
  }

  // Manevraya göre hedef rota ve hız çarpanı
  function maneuverTarget(kind, windFrom, tack, baseTarget, F = STRICT) {
    const away = tack === 'starboard' ? -1 : 1;    // rüzgardan uzaklaşma yönü (bordalama)
    switch (kind) {
      case 'duck': return { h: E.tackHeading(windFrom, tack) + away * F.duck, speed: 1 };
      case 'luff': return { h: windFrom + away * 32, speed: 1 };          // sıkıştır (pinch): yavaşlar ama durmaz
      case 'luffK11': return { h: windFrom + away * F.luffK11, speed: 1 }; // K11 rüzgarüstü: rüzgara döner, yelken pırpırlar, hız düşer
      case 'brake': return { h: baseTarget, speed: 0.5 };                // rotada yavaşla (rüzgaraltı K14)
      case 'slow': return { h: baseTarget + away * F.slowTurn, speed: F.slow };
      default: return { h: baseTarget, speed: 1 };                        // 'tack': yeni kontrada orsa
    }
  }

  // Aday rotanın diğer teknelere göre en yakın yaklaşma mesafesi (2-4 s içinde)
  function clearance(X, hCand, others) {
    let m = 1e9;
    for (const O of others) { const a = approach({ x: X.x, y: X.y, h: hCand, v: Math.max(X.v, 20) }, O); if (a.d < 260) m = Math.min(m, a.dmin); }
    return m;
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

  /* Tüm ek tekneleri birlikte simüle et.
     specs: [{pos:{x,y}, tack}] ya da start senaryosunda [{slot:{x,y}, tack}] (hat üstündeki hedef geçiş noktası)
     scripted: [{track}]  → her spec için örnek dizisi [{t,x,y,h,v,note}] */
  function simulate(scn, specs, scripted) {
    const base = scn.baseSpeed || 55, TAU = scn.tau || 1.5;
    const isStart = !!(scn.line && scn.startAt > 0);
    const goAt = isStart ? Math.max(0, scn.startAt - (scn.goBefore || 2.5)) : 0;   // küçük tekne: 2.5 s önce yelkeni doldur
    const rulesFrom = scn.line ? (scn.startAt || 0) + 0.5 : 0;
    const w0 = E.windAt(scn.wind, 0);
    const HOLD_V = base * 0.04;
    const obstacles = E.obstaclesOf(scn);
    const shadowsOn = scn.shadows !== false;
    const F = { ...SCENARIO, ...(scn.ruleFeel || {}) };   // senaryoda gevşek kural tepkisi
    const boats = specs.map(s => {
      const h0 = E.tackHeading(w0, s.tack);
      let pos = s.pos;
      if (isStart && s.slot) {
        // geçiş noktasından geriye: hızlanma yolu + bekleme sürüklenmesi kadar
        const f = E.fwd(h0), fh = E.fwd(w0 + (s.tack === 'starboard' ? -25 : 25));
        const sAcc = accelDistance(base, HOLD_V, scn.startAt - goAt, TAU) + (s.row || 0) * 60 + (s.back || 0);
        pos = { x: s.slot.x - f.x * sAcc - fh.x * HOLD_V * goAt, y: s.slot.y - f.y * sAcc - fh.y * HOLD_V * goAt };
      }
      return { x: pos.x, y: pos.y, h: h0, v: s.v0 != null ? s.v0 : (isStart ? HOLD_V : 0), tack: s.tack,
        man: null, manUntil: -1, noteUntil: -1, note: '', crossed: false, avoid: 0,
        side: scn.line ? lineSide(scn.line, pos) : 0, out: [{ t: 0, x: pos.x, y: pos.y, h: h0 }] };
    });
    let t = 0;
    while (t < scn.duration) {
      const w = E.windAt(scn.wind, t);
      const scriptedNow = scripted.map((b, i) => { const s = E.sampleTrack(b.track, t); return { x: s.x, y: s.y, h: s.h, v: s.v != null ? s.v : base, ref: 's' + i }; });
      const casters = shadowsOn ? [...scriptedNow, ...boats.map(o => ({ x: o.x, y: o.y, v: o.v, ref: o }))] : [];
      const othersOf = b => [...scriptedNow, ...boats.filter(o => o !== b).map(o => ({ x: o.x, y: o.y, h: o.h, v: o.v }))];
      const decisions = boats.map(b => (t < rulesFrom ? null : decide(b, othersOf(b), w, F)));   // start patlamasında kural manevrası yok (yalnızca engel kaçınma)
      boats.forEach((b, i) => {
        const dec = decisions[i];
        const holding = t < goAt;
        let baseTarget = E.tackHeading(w, b.tack), speed = 1;
        if (holding) baseTarget = w + (b.tack === 'starboard' ? -25 : 25);   // orsalayıp bekle
        if (dec && dec.kind !== 'row') {
          let kind = dec.kind, note = dec.note;
          if (kind === 'luffK11') {
            // rüzgarüstünde de bir tekne varsa orsalayamaz (ona doğru gider): rotada yavaşlar
            const above = othersOf(b).some(o => Math.hypot(o.x - b.x, o.y - b.y) < 45 && isWindward(o, b, w));
            if (above) { kind = 'brake'; note = 'Rüzgarüstü yol verir · K11 (yavaşlıyor)'; }
          }
          if (!b.man) {
            const others = othersOf(b);
            if (kind === 'duck' && dec.rule === 10) {
              const duckH = maneuverTarget('duck', w, b.tack, baseTarget, F).h;
              const newTack = b.tack === 'starboard' ? 'port' : 'starboard';
              const tackH = E.tackHeading(w, newTack);
              const cd = clearance(b, duckH, others), ct = clearance(b, tackH, others);
              if (cd < 90 && ct > cd) { kind = 'tack'; b.tack = newTack; note = 'Yol veriyor · K10 (tramola)'; }
              else note = 'Yol veriyor · K10 (bordalıyor)';
            } else if (dec.rule === 14 && kind !== 'brake') {
              const duckH = maneuverTarget('duck', w, b.tack, baseTarget, F).h, luffH = maneuverTarget('luff', w, b.tack, baseTarget, F).h;
              kind = clearance(b, luffH, others) > clearance(b, duckH, others) ? 'luff' : 'duck';
            }
          }
          if (b.man !== kind && !(b.man === 'tack' && kind === 'duck')) b.man = kind;
          b.manF = dec.urgent ? STRICT : F;
          b.manUntil = t + F.hold; b.note = note; b.noteUntil = t + 2.5;
        } else if (b.man && t > b.manUntil) b.man = null;
        let target = holding ? baseTarget : E.tackHeading(w, b.tack);
        if (b.man && !holding) { const m = maneuverTarget(b.man, w, b.tack, target, b.manF || F); target = m.h; speed *= m.speed; }
        b.h = E.lerpAngle(b.h, target, Math.min(1, DT / 0.6));
        const dir = E.avoidDir(b.x, b.y, b.h, obstacles, b.v);
        if (dir !== 0) b.h += dir * 160 * DT;                       // engelden yana kaç (rota hedefi sonra geri çeker)
        let vt = holding ? HOLD_V : E.speedFor(Math.abs(E.norm180(b.h - w)), base) * (b.man ? speed : 1);
        if (!holding && shadowsOn) vt *= 1 - E.SHADOW.loss * E.shadowK({ x: b.x, y: b.y, ref: b }, casters, w, base).k;   // pis rüzgar
        b.v += (vt - b.v) * Math.min(1, DT / TAU);
      });
      t += DT;
      for (const b of boats) {
        const f = E.fwd(b.h); b.x += f.x * b.v * DT; b.y += f.y * b.v * DT;
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
        b.out.push({ t, x: b.x, y: b.y, h: b.h, v: b.v, note: t < b.noteUntil ? b.note : '' });
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

  global.SailRules = { FEEL: { STRICT, SCENARIO }, simulate, buildScene, warpForShadows, decide, clearAstern, isWindward, approach, lineSide, lineParam };
})(typeof window !== 'undefined' ? window : globalThis);
