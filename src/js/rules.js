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
  function decide(X, others, windFrom) {
    const up = E.fwd(windFrom);                    // rüzgara doğru birim vektör
    let best = null;
    for (const O of others) {
      const a = approach(X, O);
      if (a.d > 260) continue;
      const risk = a.dmin < 58 && a.tc < 8 && a.dmin < a.d - 6;   // yakınsıyor olmalı; paralel seyir risk değil
      const nearNow = a.d < HULL * 0.85;
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
          const windward = dot({ x: X.x - O.x, y: X.y - O.y }, up) > 0;
          dec = windward
            ? { kind: 'luff', note: 'Rüzgarüstü yol verir · K11', rule: 11 }
            : { kind: 'row', note: 'Hak sahibi · K11', rule: 11 };
        } else if (xAstern) {
          dec = { kind: 'slow', note: 'Arkadaki yol verir · K12', rule: 12 };
        } else {
          dec = { kind: 'row', note: 'Hak sahibi · K12', rule: 12 };
        }
      }
      // Kural 14: hak sahibi olsa da temas kaçınılmazsa kaç
      if (dec.kind === 'row' && ((a.dmin < 40 && a.tc < 2.2) || a.d < HULL * 0.8)) {
        dec = { kind: 'duck', note: 'Temas önleme · K14', rule: 14 };
      }
      // en acil olanı seç: önce manevra gerektirenler, sonra en yakın
      const prio = (dec.kind === 'row' ? 0 : 10) + (8 - a.tc);
      if (!best || prio > best.prio) best = { ...dec, prio, tc: a.tc };
    }
    return best;
  }

  // Manevraya göre hedef rota ve hız çarpanı
  function maneuverTarget(kind, windFrom, tack, baseTarget) {
    const away = tack === 'starboard' ? -1 : 1;    // rüzgardan uzaklaşma yönü (bordalama)
    switch (kind) {
      case 'duck': return { h: E.tackHeading(windFrom, tack) + away * 60, speed: 1 };
      case 'luff': return { h: windFrom + away * 32, speed: 1 };          // sıkıştır (pinch): yavaşlar ama durmaz
      case 'slow': return { h: baseTarget + away * 18, speed: 0.55 };
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
      const scriptedNow = scripted.map(b => { const s = E.sampleTrack(b.track, t); return { x: s.x, y: s.y, h: s.h, v: s.v != null ? s.v : base }; });
      const othersOf = b => [...scriptedNow, ...boats.filter(o => o !== b).map(o => ({ x: o.x, y: o.y, h: o.h, v: o.v }))];
      const decisions = boats.map(b => (t < rulesFrom ? null : decide(b, othersOf(b), w)));   // start patlamasında kural manevrası yok (yalnızca engel kaçınma)
      boats.forEach((b, i) => {
        const dec = decisions[i];
        const holding = t < goAt;
        let baseTarget = E.tackHeading(w, b.tack), speed = 1;
        if (holding) baseTarget = w + (b.tack === 'starboard' ? -25 : 25);   // orsalayıp bekle
        if (dec && dec.kind !== 'row') {
          let kind = dec.kind, note = dec.note;
          if (!b.man) {
            const others = othersOf(b);
            if (kind === 'duck' && dec.rule === 10) {
              const duckH = maneuverTarget('duck', w, b.tack, baseTarget).h;
              const newTack = b.tack === 'starboard' ? 'port' : 'starboard';
              const tackH = E.tackHeading(w, newTack);
              const cd = clearance(b, duckH, others), ct = clearance(b, tackH, others);
              if (cd < 90 && ct > cd) { kind = 'tack'; b.tack = newTack; note = 'Yol veriyor · K10 (tramola)'; }
              else note = 'Yol veriyor · K10 (bordalıyor)';
            } else if (dec.rule === 14) {
              const duckH = maneuverTarget('duck', w, b.tack, baseTarget).h, luffH = maneuverTarget('luff', w, b.tack, baseTarget).h;
              kind = clearance(b, luffH, others) > clearance(b, duckH, others) ? 'luff' : 'duck';
            }
          }
          if (b.man !== kind && !(b.man === 'tack' && kind === 'duck')) b.man = kind;
          b.manUntil = t + 1.2; b.note = note; b.noteUntil = t + 2.5;
        } else if (b.man && t > b.manUntil) b.man = null;
        let target = holding ? baseTarget : E.tackHeading(w, b.tack);
        if (b.man && !holding) { const m = maneuverTarget(b.man, w, b.tack, target); target = m.h; speed *= m.speed; }
        b.h = E.lerpAngle(b.h, target, Math.min(1, DT / 0.6));
        const dir = E.avoidDir(b.x, b.y, b.h, obstacles, b.v);
        if (dir !== 0) b.h += dir * 160 * DT;                       // engelden yana kaç (rota hedefi sonra geri çeker)
        const vt = holding ? HOLD_V : E.speedFor(Math.abs(E.norm180(b.h - w)), base) * (b.man ? speed : 1);
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

  global.SailRules = { simulate, decide, clearAstern, approach, lineSide, lineParam };
})(typeof window !== 'undefined' ? window : globalThis);
