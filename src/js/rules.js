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
      const risk = a.dmin < 75 && a.tc < 8;
      const nearNow = a.d < HULL * 1.3;
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
      if (dec.kind === 'row' && ((a.dmin < 48 && a.tc < 2.5) || a.d < HULL * 1.0)) {
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
      case 'luff': return { h: windFrom + away * 22, speed: 1 };          // orsala: hız kendiliğinden düşer
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

  /* Tüm ek tekneleri birlikte simüle et.
     specs: [{pos:{x,y}, tack}]  scripted: [{track}]  → her spec için örnek dizisi [{t,x,y,h,v,note}] */
  function simulate(scn, specs, scripted) {
    const base = scn.baseSpeed || 55, TAU = 1.5;
    const goAt = scn.startAt ? Math.max(0, scn.startAt - 4.5) : 0;
    const w0 = E.windAt(scn.wind, 0);
    const boats = specs.map(s => ({
      x: s.pos.x, y: s.pos.y, h: E.tackHeading(w0, s.tack), v: 0, tack: s.tack,
      man: null, manUntil: -1, noteUntil: -1, note: '', out: [{ t: 0, x: s.pos.x, y: s.pos.y, h: E.tackHeading(w0, s.tack) }]
    }));
    let t = 0;
    while (t < scn.duration) {
      const w = E.windAt(scn.wind, t);
      const scriptedNow = scripted.map(b => { const s = E.sampleTrack(b.track, t); return { x: s.x, y: s.y, h: s.h, v: s.v != null ? s.v : base }; });
      const othersOf = b => [...scriptedNow, ...boats.filter(o => o !== b).map(o => ({ x: o.x, y: o.y, h: o.h, v: o.v }))];
      const decisions = boats.map(b => decide(b, othersOf(b), w));
      boats.forEach((b, i) => {
        const dec = decisions[i];
        let baseTarget = E.tackHeading(w, b.tack), speed = 1;
        if (t < goAt) { baseTarget = w + (b.tack === 'starboard' ? -20 : 20); speed = 0.1; }  // start öncesi bekleme
        if (dec && dec.kind !== 'row') {
          let kind = dec.kind, note = dec.note;
          if (!b.man) {
            const others = othersOf(b);
            if (kind === 'duck' && dec.rule === 10) {
              // bordalamak mı tramola mı? daha çok boşluk bırakanı seç; bordalama yeterliyse onu tercih et
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
        } else {
          if (b.man && t > b.manUntil) b.man = null;
        }
        let target = E.tackHeading(w, b.tack); if (t < goAt) target = baseTarget;
        if (b.man) { const m = maneuverTarget(b.man, w, b.tack, target); target = m.h; speed *= m.speed; }
        b.h = E.lerpAngle(b.h, target, Math.min(1, DT / 0.6));
        const vt = (t < goAt ? base * 0.1 : E.speedFor(Math.abs(E.norm180(b.h - w)), base)) * (b.man ? speed : 1);
        b.v += (vt - b.v) * Math.min(1, DT / TAU);
      });
      // konumları aynı anda güncelle
      t += DT;
      for (const b of boats) {
        const f = E.fwd(b.h); b.x += f.x * b.v * DT; b.y += f.y * b.v * DT;
        b.out.push({ t, x: b.x, y: b.y, h: b.h, v: b.v, note: t < b.noteUntil ? b.note : '' });
      }
    }
    return boats.map(b => b.out);
  }

  global.SailRules = { simulate, decide, clearAstern, approach };
})(typeof window !== 'undefined' ? window : globalThis);
