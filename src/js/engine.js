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
    const TAU = opts.tau || 1.5;          // hızlanma zaman sabiti (s)
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
        const f = fwd(h);
        x += f.x * v * DT; y += f.y * v * DT;
        t += DT;
        samples.push({ t, x, y, h, v });
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
    return { t, x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), h: lerpAngle(a.h, b.h, k) };
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

  global.SailEngine = {
    DEG, norm180, norm360, lerp, lerpAngle, fwd,
    windAt, tackHeading, runHeading, buildTrack, sampleTrack, sailState, speedFor,
    CLOSE_HAULED, RUN
  };
})(typeof window !== 'undefined' ? window : globalThis);
