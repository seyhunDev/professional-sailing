// Optimist yelken ayarı (TASLAK, 2D). Kaynak: yelken üreticilerinin ayar kılavuzları (orijinal) + eğitmenin özel ayarı.
// Hava (hafif/orta/sert) ve deniz (düz/dalgalı) seçilince ayarlar yumuşakça değişir; kaydırıcılarla elle oynanır.
// Gerçek birimli: direk eğimi (cm), direk bağları boşluğu (mm, 8 bağ, tepeden aşağı). Göreli (0 gevşek, 1 sıkı):
// gırcala, palanga, köşe, orsa yakası gerginliği (Cunningham / bumba emniyeti). Özel ayarlar bu cihazda saklanır.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const $ = id => document.getElementById(id);
  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString('tr-TR');
  const NTIES = 8;

  // ---------- kaynaklar (kılavuzlar) ----------
  // Her alan: sayı (kılavuzda verilen) ya da yok (→ taslak varsayılanı, panelde "?" ile).
  // note: kılavuzun o hava için söylediği (çeviri, kısaltılmış).
  const DEF = {
    hafif: { rake: 280, ties: Array(NTIES).fill(2), sprit: 0.45, vang: 0.1, out: 0.35, luff: 0.3 },
    orta:  { rake: 280, ties: Array(NTIES).fill(2), sprit: 0.5, vang: 0.5, out: 0.6, luff: 0.5 },
    sert:  { rake: 279, ties: Array(NTIES).fill(1), sprit: 0.55, vang: 0.85, out: 0.9, luff: 0.7 },
  };
  const BRANDS = {
    onesails: {
      name: 'OneSails', url: 'https://www.onesails.com/wp-content/uploads/onedesign_optimist_tuningguide.pdf',
      about: 'Kılavuz direk eğimi (cm) ve havaya göre 8 değerlik bir mm dizisi veriyor. Dizinin direk bağları boşluğu olduğu ve sırası belgede açıkça yazmıyor (dizi simetrik).',
      hafif: { rake: 279.5, ties: [5, 4, 3, 2, 2, 3, 4, 5], luff: 0.2, note: { rake: '279-280 cm', ties: '5,4,3,2,2,3,4,5 mm, "gergin değil"', luff: 'Gergin değil; orsa yakasında hafif çizgiler.' } },
      orta: { rake: 279.5, ties: [2, 2, 2, 2, 2, 2, 2, 2], luff: 0.4, note: { rake: '279-280 cm', ties: 'Hepsi 2 mm, "hafif gergin"', luff: 'Hafif gergin.' } },
      sert: { rake: 277.5, ties: [0, 1, 2, 3, 3, 2, 1, 0], luff: 0.75, out: 0.95, note: { rake: '277-278 cm', ties: '0,1,2,3,3,2,1,0 mm, "gergin"', out: 'Köşe çekili ve bağlı: 0 mm.', sprit: 'Sorun olursa gırcalayı biraz aç.', luff: 'Gergin.' } },
    },
    north: {
      name: 'North Sails', url: 'https://northsails.com/sailing/en/resources/optimist-dinghy-speed-guide',
      about: 'Hız kılavuzu çoğunlukla göreli; direk eğimi için yalnız "taban ayara göre" farklar veriyor (taban 280 cm burada varsayım). Bu kılavuza göre Optimist\'te Cunningham yok, orsa yakası bumba emniyet halatının (boom preventer) bükümüyle gerilir.',
      hafif: { rake: 279, sprit: 0.36, vang: 0.1, out: 0.3, luff: 0.25,
        note: { rake: 'Tabanın biraz gerisi.', sprit: 'Direk tepesinden köşeye bir kırışık çıkana kadar gevşet.', out: 'Altta yatay kırışık kaybolana, bağların üstündeki dikey izler ilk dikişi geçmeyene kadar gevşet.', luff: 'Sağanakta bağlarda yatay kırışık görünene kadar gevşet.' } },
      orta: { rake: 280, sprit: 0.5, vang: 0.5, out: 0.55, luff: 0.5,
        note: { rake: 'Küpeşteye çıkınca tabana dön.', sprit: 'Yelken çok pürüzsüz olana kadar sık.', out: 'Dalgada bumba bağlarındaki dikey izler yalnız ilk dikişe varsın.', luff: 'Bumba emniyetinden bir büküm al; orta gerginlik, sıkı değil.' } },
      sert: { rake: 281, sprit: 0.55, vang: 0.9, out: 0.85, luff: 0.75,
        note: { rake: 'Küpeştede: tabanın biraz önü. Fazla güçte (overpowered): tabandan 2 cm geri.', sprit: 'Hâlâ sıkı, yelken pürüzsüz. Fazla güçte: gevşet, sonra direk tepesinden köşeye kırışık çıkana kadar yeniden sık.', out: 'Yelken dolana kadar altta kırışık görünecek kadar sıkı.', luff: 'Bir büküm daha al; fazla güçte çok sıkı.', vang: 'Fazla güçte bumbayı sertçe aşağı bas.' } },
    },
    quantum: {
      name: 'Quantum', url: 'https://quantumsails.com/en/sails/one-design/documents/optimist/opti_tuning_guide',
      about: 'Direk eğimini havaya göre değil sporcunun kilosuna göre veriyor (burada 40-45 kg: 280-283 cm). Orsa yakası için diğer kılavuzların tersini söylüyor: hafif ve orta modellerde hafif havada gergin, sert havada gevşek.',
      hafif: { rake: 281.5, ties: Array(NTIES).fill(1.5), vang: 0.05, luff: 0.6,
        note: { rake: '40-45 kg: 280-283 cm (30-40 kg: 278-281, 45 kg üstü: 283-286).', ties: 'Orsa yakası ile direk arası 1-2 mm.', vang: 'Çok az ya da hiç.', luff: 'Hafif/orta modellerde hafif havada gerginlik ver (orsa açısı için).', sprit: 'Tepe: direk tepesinden aşağı en az kırışık; emin değilsen az gerginlik.' } },
      orta: { rake: 281.5, ties: Array(NTIES).fill(1.5), note: { rake: '40-45 kg: 280-283 cm.', ties: '1-2 mm.' } },
      sert: { rake: 281.5, ties: [0, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 0], vang: 0.9, luff: 0.3,
        note: { rake: 'Dümen ağırsa önce salmayı geri al, olmazsa direği 1-2 cm öne.', ties: 'En üst ve en alt bağ direğe yapışık (0 mm). 44 kg üstü, orsa yakasından köşeye kırışık varsa orta bağları gevşet.', vang: 'Çok daha sıkı; orsa yakasından köşeye kırışık çıkınca dur.', luff: 'Gevşet: kambur öne gelir, arka yaka açılır.' } },
    },
    jsails: { name: 'J-Sails', missing: true },
    olimpic: { name: 'Olimpic', missing: true },
    cd: { name: 'CD Sails', missing: true },
  };

  const CTRL = [
    { k: 'sprit', name: 'Gırcala', en: 'sprit', lo: 'Gevşek', hi: 'Sıkı',
      tip: 'Yelkenin tepesini yukarı ve geriye iter. Gevşekse direk tepesinden köşeye, fazla sıkıysa tepeden karulaya çapraz kırışık çıkar.' },
    { k: 'vang', name: 'Palanga', en: 'vang / kicker', lo: 'Gevşek', hi: 'Sıkı',
      tip: 'Bumbanın kalkmasını engeller, arka yakayı gerer. Gevşedikçe yelkenin üstü açılır (twist artar).' },
    { k: 'out', name: 'Köşe', en: 'outhaul', lo: 'Derin', hi: 'Düz',
      tip: 'Köşeyi bumba ucuna çeker. Gevşekse alt kısım derin (güç), sıkıysa düz.' },
    { k: 'luff', name: 'Orsa yakası gerginliği', en: 'Cunningham / boom preventer', lo: 'Gevşek', hi: 'Gergin',
      tip: 'Orsa yakasını aşağı gerer. Gevşekken bağlarda yatay kırışık; gerdikçe kambur öne gelir.' },
  ];

  const WIND = { hafif: 0, orta: 0.5, sert: 1 };
  const WIND_TXT = { hafif: 'Hafif hava (yaklaşık 0-6 knot)', orta: 'Orta hava (yaklaşık 6-12 knot)', sert: 'Sert hava (yaklaşık 12 knot üstü)' };
  const SEA_TXT = { duz: 'düz deniz', dalgali: 'dalgalı deniz' };
  const SEA_WHY = {
    duz: 'Düz denizde daha sıkı trim ile orsa açısı kazanılır.',
    dalgali: 'Dalgada güçte kalmak için biraz daha derin yelken ve biraz daha açık üst (köşe ve palanga bir tık gevşek).',
  };

  // ---------- durum ----------
  const KEY = 'ps.trim.v1';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { saved = {}; }
  const st = {
    wind: WIND[saved.wind] != null ? saved.wind : 'orta', sea: SEA_TXT[saved.sea] ? saved.sea : 'duz',
    brand: (BRANDS[saved.brand] && !BRANDS[saved.brand].missing) ? saved.brand : 'onesails',
    mode: saved.mode === 'ozel' ? 'ozel' : 'orijinal',
    custom: (saved.custom && typeof saved.custom === 'object') ? saved.custom : {},
    val: null, target: null, active: null, focusTie: -1,
  };
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify({ wind: st.wind, sea: st.sea, brand: st.brand, mode: st.mode, custom: st.custom })); } catch (e) { /* yok */ }
  }
  const ckey = () => `${st.brand}|${st.wind}|${st.sea}`;

  function original(brand, wind, sea) {
    const b = BRANDS[brand], w = b[wind] || {}, d = DEF[wind];
    const v = {}, src = {};
    for (const k of ['rake', 'ties', 'sprit', 'vang', 'out', 'luff']) {
      const has = w[k] != null;
      const x = has ? w[k] : d[k];
      v[k] = Array.isArray(x) ? x.slice() : x;
      src[k] = has;
    }
    if (sea === 'dalgali') { v.out = clamp(v.out - 0.1, 0, 1); v.vang = clamp(v.vang - 0.1, 0, 1); }
    return { v, src, note: w.note || {} };
  }
  const copy = v => ({ ...v, ties: v.ties.slice() });
  const current = () => (st.mode === 'ozel' && st.custom[ckey()]) ? st.custom[ckey()] : original(st.brand, st.wind, st.sea).v;

  // ---------- panel ----------
  const panel = $('ctrls');
  panel.innerHTML = `
    <div class="ctl ctl-ties" data-k="ties">
      <div class="ctl-top"><span class="ctl-name">Direk bağları <em>(mast ties)</em></span><span class="ctl-val">boşluk, mm</span></div>
      <div class="ties-grid" id="tiesGrid"></div>
      <p class="ctl-why" id="whyTies"></p>
    </div>
    <div class="ctl" data-k="rake">
      <div class="ctl-top"><span class="ctl-name">Direk eğimi <em>(mast rake)</em></span><span class="ctl-val" id="rakeVal"></span></div>
      <input type="range" id="rakeIn" min="274" max="288" step="0.5" aria-label="Direk eğimi">
      <div class="ctl-ends"><span>Geriye eğik</span><span>Dik</span></div>
      <p class="ctl-why" id="whyRake"></p>
    </div>`;
  const tiesGrid = $('tiesGrid');
  const tieCells = [];
  for (let i = 0; i < NTIES; i++) {
    const c = document.createElement('div');
    c.className = 'tie';
    c.innerHTML = `<span class="tie-n">${i === 0 ? 'Tepe' : i === NTIES - 1 ? 'Alt' : i + 1}</span>
      <button class="tie-b" data-d="0.5" aria-label="${i + 1}. bağ boşluğunu artır">+</button>
      <span class="tie-v"></span>
      <button class="tie-b" data-d="-0.5" aria-label="${i + 1}. bağ boşluğunu azalt">−</button>`;
    c.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const v = ensureCustom();
      v.ties[i] = clamp(Math.round((v.ties[i] + Number(b.dataset.d)) * 2) / 2, 0, 10);
      st.active = 'ties'; st.focusTie = i; changed();
    });
    tiesGrid.appendChild(c);
    tieCells.push(c);
  }
  $('rakeIn').addEventListener('input', e => { const v = ensureCustom(); v.rake = Number(e.target.value); st.active = 'rake'; changed(); });

  const rows = {};
  for (const c of CTRL) {
    const row = document.createElement('div');
    row.className = 'ctl'; row.dataset.k = c.k;
    row.innerHTML = `
      <div class="ctl-top"><span class="ctl-name">${c.name} <em>(${c.en})</em></span><span class="ctl-val"></span></div>
      <input type="range" min="0" max="100" step="1" aria-label="${c.name}">
      <div class="ctl-ends"><span>${c.lo}</span><span>${c.hi}</span></div>
      <p class="ctl-why"></p>`;
    panel.appendChild(row);
    const inp = row.querySelector('input');
    inp.addEventListener('input', () => { const v = ensureCustom(); v[c.k] = inp.value / 100; st.active = c.k; changed(); });
    rows[c.k] = { row, inp, val: row.querySelector('.ctl-val'), why: row.querySelector('.ctl-why'), c };
  }
  for (const r of panel.querySelectorAll('.ctl')) {
    const f = () => { if (st.active !== r.dataset.k) { st.active = r.dataset.k; refresh(); } };
    r.addEventListener('pointerenter', f); r.addEventListener('focusin', f);
  }

  // Orijinal modda bir ayara dokunulursa: o kılavuzun kopyasıyla Özel'e geç
  function ensureCustom() {
    if (!st.custom[ckey()]) st.custom[ckey()] = copy(original(st.brand, st.wind, st.sea).v);
    st.mode = 'ozel';
    return st.custom[ckey()];
  }
  function changed() { st.target = null; st.val = copy(current()); persist(); syncTop(); refresh(); }

  function word(k, v) {
    const words = k === 'out' ? ['Derin', 'Orta-derin', 'Orta', 'Orta-düz', 'Düz'] : ['Gevşek', 'Biraz gevşek', 'Orta', 'Biraz sıkı', 'Sıkı'];
    return words[clamp(Math.round(v * 4), 0, 4)];
  }

  // ---------- üst seçimler ----------
  const brandSel = $('brandSel');
  brandSel.innerHTML = Object.entries(BRANDS).map(([k, b]) => `<option value="${k}"${b.missing ? ' disabled' : ''}>${esc(b.name)}${b.missing ? ' (kılavuz bekleniyor)' : ''}</option>`).join('');
  function setSeg(id, v) { for (const b of $(id).querySelectorAll('button')) b.classList.toggle('on', b.dataset.v === v); }
  function syncTop() {
    setSeg('segWind', st.wind); setSeg('segSea', st.sea); setSeg('segMode', st.mode);
    brandSel.value = st.brand;
    $('btnResetCustom').hidden = st.mode !== 'ozel';
    const b = BRANDS[st.brand];
    $('condText').textContent = `${WIND_TXT[st.wind]}, ${SEA_TXT[st.sea]}. ${SEA_WHY[st.sea]}`;
    $('srcText').innerHTML = `${esc(b.about || '')} <a href="${b.url}" target="_blank" rel="noopener">Kılavuz ↗</a>`;
  }
  function choose() { syncTop(); st.target = copy(current()); persist(); refresh(); }
  $('segWind').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; st.wind = b.dataset.v; choose(); });
  $('segSea').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; st.sea = b.dataset.v; choose(); });
  $('segMode').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    st.mode = b.dataset.v;
    if (st.mode === 'ozel' && !st.custom[ckey()]) st.custom[ckey()] = copy(original(st.brand, st.wind, st.sea).v);
    choose();
  });
  brandSel.addEventListener('change', () => { st.brand = brandSel.value; choose(); });
  $('btnResetCustom').addEventListener('click', () => { st.custom[ckey()] = copy(original(st.brand, st.wind, st.sea).v); choose(); });

  function refresh() {
    const o = original(st.brand, st.wind, st.sea);
    const v = st.val;
    const diff = (a, b) => Math.abs(a - b) > 0.02;
    const srcTag = k => o.src[k] ? '' : ' <b class="q" title="Bu kılavuzda yok: taslak varsayılanı">?</b>';
    const origTxt = (ov, cur, f) => st.mode === 'ozel' && diff(ov, cur) ? `<span class="orig">orijinal ${f(ov)}</span>` : '';
    tieCells.forEach((c, i) => {
      c.querySelector('.tie-v').textContent = fmt(v.ties[i]);
      c.classList.toggle('changed', st.mode === 'ozel' && diff(v.ties[i], o.v.ties[i]));
      c.classList.toggle('focus', st.focusTie === i);
      c.title = `Orijinal: ${fmt(o.v.ties[i])} mm`;
    });
    $('whyTies').innerHTML = (o.note.ties ? `Kılavuz: ${esc(o.note.ties)}.` : 'Bu kılavuzda bağ ölçüsü yok; taslak varsayılanı.') +
      ' 0 mm = yelken direğe bitişik. Çizimde boşluk büyütülmüş.' + srcTag('ties');
    const ri = $('rakeIn');
    if (document.activeElement !== ri) ri.value = v.rake;
    ri.style.setProperty('--p', ((v.rake - 274) / 14 * 100) + '%');
    $('rakeVal').innerHTML = `${origTxt(o.v.rake, v.rake, x => fmt(x) + ' cm')}${fmt(v.rake)} cm`;
    $('whyRake').innerHTML = (o.note.rake ? `Kılavuz: ${esc(o.note.rake.replace(/\.?$/, '.'))}` : 'Kılavuzda bu hava için ölçü yok.') +
      ' Ölçü direk tepesinden kıç aynalığa; sayı küçüldükçe direk geriye yatar.' + srcTag('rake');
    for (const k in rows) {
      const r = rows[k], x = v[k];
      if (document.activeElement !== r.inp) r.inp.value = Math.round(x * 100);
      r.inp.style.setProperty('--p', Math.round(x * 100) + '%');
      r.val.innerHTML = origTxt(o.v[k], x, y => word(k, y).toLowerCase()) + word(k, x);
      const n = o.note[k];
      r.why.innerHTML = (n ? `Kılavuz: ${esc(n)}` : esc(r.c.tip)) + srcTag(k);
    }
    for (const r of panel.querySelectorAll('.ctl')) r.classList.toggle('active', st.active === r.dataset.k);
  }

  // ---------- türetilmiş şekil (göreli, şematik) ----------
  function shape(v, w, wave) {
    const twist = 4 + (1 - v.vang) * (6 + 10 * w) + 2 * wave;
    const lift = (1 - v.vang) * w * 9;
    const midGap = v.ties.slice(2, 6).reduce((a, b) => a + b, 0) / 4;
    const foot = 5 + (1 - v.out) * 9 + (v.sprit - 0.5) * 3;
    const mid = foot * 0.85 + 2 + (v.sprit - 0.5) * 4 + (midGap - 2) * 0.4;
    const top = mid * 0.75;
    const sheet = 9 + w * 5;
    const draftPos = 0.48 - v.luff * 0.1;
    return { twist, lift, depth: [foot, mid, top], sheet, draftPos };
  }

  // ---------- yandan görünüş ----------
  const gRig = $('rig'), gHull = $('hull'), gWater = $('water'), gWind = $('windLayer'), gCall = $('callouts'), gGhost = $('ghost');
  const STEP = { x: 196, y: 404 };
  const GAP_PX = 2.6;            // çizimde 1 mm kaç px (büyütülmüş)

  function drawHull() {
    gHull.innerHTML = '';
    el('path', { d: 'M118,398 L472,404 L466,444 Q320,466 178,452 Q138,442 118,398 Z', fill: '#e2e8f0', stroke: '#0b1724', 'stroke-width': 2 }, gHull);
    el('path', { d: 'M118,398 L472,404', stroke: '#94a3b8', 'stroke-width': 4, 'stroke-linecap': 'round' }, gHull);
    el('path', { d: 'M282,450 L278,520 L298,520 L300,452', fill: '#cbd5e1', stroke: '#0b1724', 'stroke-width': 1.5 }, gHull);
    el('path', { d: 'M470,412 L494,412 L490,500 L474,498 Z', fill: '#cbd5e1', stroke: '#0b1724', 'stroke-width': 1.5 }, gHull);
    el('path', { d: 'M474,412 L520,394', stroke: '#64748b', 'stroke-width': 3, 'stroke-linecap': 'round' }, gHull);
    el('circle', { cx: 404, cy: 360, r: 13, fill: '#fbbf24', stroke: '#0b1724', 'stroke-width': 1.5 }, gHull);
    el('path', { d: 'M404,374 L398,404 M400,384 L440,396', stroke: '#fbbf24', 'stroke-width': 9, 'stroke-linecap': 'round' }, gHull);
  }

  let rot = 0, bob = 0;
  function tp(p) {
    const a = rot * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    return { x: STEP.x + p.x * c - p.y * s, y: STEP.y + bob + p.x * s + p.y * c };
  }
  const P = (x, y) => ({ x, y });
  const pt = p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  const add = (a, b) => P(a.x + b.x, a.y + b.y);
  const mul = (a, k) => P(a.x * k, a.y * k);
  const sub = (a, b) => P(a.x - b.x, a.y - b.y);
  const len = a => Math.hypot(a.x, a.y);
  const unit = a => mul(a, 1 / (len(a) || 1));
  const mix = (a, b, t) => P(lerp(a.x, b.x, t), lerp(a.y, b.y, t));
  const rakeDeg = cm => 1 + (281 - cm) * 0.6;

  function geom(v, sh) {
    const bh = 40;
    const G = P(0, -bh);
    const la = sh.lift * Math.PI / 180;
    const C = add(G, P(272 * Math.cos(la), -272 * Math.sin(la)));
    const S = P(0, -112);
    let Pk = P(178, -350);
    Pk = add(Pk, mul(unit(sub(Pk, S)), (v.sprit - 0.5) * 14));
    const yTop = -292, yBot = -bh - 4;
    const luff = v.ties.map((g, i) => P(3 + g * GAP_PX, lerp(yTop, yBot, i / (NTIES - 1))));
    return { G, C, S, Pk, luff, T: luff[NTIES - 1], H: luff[0] };
  }
  function sailPath(g, sh) {
    const { C, Pk, luff } = g;
    const nrm = unit(P(-(C.y - Pk.y), C.x - Pk.x));
    const L1 = add(mix(Pk, C, 0.5), mul(nrm, -(16 - sh.twist * 0.35)));
    const headMid = add(mix(luff[0], Pk, 0.5), P(0, -6));
    let d = `M${pt(tp(luff[NTIES - 1]))}`;
    for (let i = NTIES - 2; i >= 0; i--) d += ` L${pt(tp(luff[i]))}`;
    d += ` Q${pt(tp(headMid))} ${pt(tp(Pk))} Q${pt(tp(L1))} ${pt(tp(C))} Z`;
    return d;
  }

  function drawRig(v, sh, pitch, ghostV, ghostSh) {
    gRig.innerHTML = ''; gGhost.innerHTML = '';
    rot = rakeDeg(v.rake) + pitch;
    const g = geom(v, sh);
    const { G, C, S, Pk, luff, T, H } = g;
    const tieOn = i => st.active === 'ties' && st.focusTie === i;

    el('path', { d: sailPath(g, sh), fill: 'url(#sailFill)', stroke: '#0b1724', 'stroke-width': 1.6, 'stroke-linejoin': 'round', class: 'sail' }, gRig);

    [0.25, 0.5, 0.78].forEach((f, i) => {
      const a = mix(T, H, f), b = mix(C, Pk, f * 1.02);
      const m = add(mix(a, b, sh.draftPos - 0.06), P(0, sh.depth[i] * 1.4));
      el('path', { d: `M${pt(tp(a))} Q${pt(tp(m))} ${pt(tp(b))}`, fill: 'none', stroke: '#0ea5e9', 'stroke-width': 2, opacity: 0.75 }, gRig);
    });

    // gırcala kırışıkları: gevşek → direk tepesinden köşeye; fazla sıkı → tepeden karulaya
    const loose = clamp((0.42 - v.sprit) / 0.22, 0, 1);
    const tight = clamp((v.sprit - 0.62) / 0.22, 0, 1);
    const crease = (A, B, k, op) => {
      const nn = unit(P(-(B.y - A.y), B.x - A.x));          // çizgiye dik: kırışıklar yan yana, paralel
      for (let i = 0; i < 5; i++) {
        const off = mul(nn, (i - 2) * 16 * k);
        const a = add(mix(A, B, 0.12 + Math.abs(i - 2) * 0.04), off), b = add(mix(A, B, 0.66 - Math.abs(i - 2) * 0.05), off);
        el('path', { d: `M${pt(tp(a))} L${pt(tp(b))}`, stroke: '#64748b', 'stroke-width': 1.3, opacity: op, 'stroke-dasharray': '6 5' }, gRig);
      }
    };
    if (loose > 0) crease(H, C, 1, 0.25 + 0.6 * loose);
    if (tight > 0) crease(Pk, T, 1, 0.25 + 0.6 * tight);
    const lw = clamp((0.35 - v.luff) / 0.3, 0, 1);
    if (lw > 0) luff.slice(1, -1).forEach(q => {
      const a = add(q, P(6, 0)), b = add(q, P(34, 0));
      el('path', { d: `M${pt(tp(a))} L${pt(tp(b))}`, stroke: '#64748b', 'stroke-width': 1.2, opacity: 0.25 + 0.55 * lw, 'stroke-dasharray': '4 4' }, gRig);
    });

    // direk ve bağlar
    const m0 = tp(P(0, 0)), m1 = tp(P(0, -300));
    el('line', { x1: m0.x, y1: m0.y, x2: m1.x, y2: m1.y, stroke: '#1e293b', 'stroke-width': 6, 'stroke-linecap': 'round' }, gRig);
    luff.forEach((q, i) => {
      const a = tp(P(0, q.y)), b = tp(q);
      el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#f59e0b', 'stroke-width': 2.4, 'stroke-linecap': 'round' }, gRig);
      el('circle', { cx: b.x, cy: b.y, r: tieOn(i) ? 4.5 : 2.6, fill: tieOn(i) ? '#fde047' : '#f59e0b' }, gRig);
    });
    // rüzgar gülü (direk tepesi): ok rüzgarın geldiği yöne, kuyruk rüzgaraltına
    const wb = tp(P(0, -300)), wv = tp(P(0, -324));
    el('line', { x1: wb.x, y1: wb.y, x2: wv.x, y2: wv.y, stroke: '#1e293b', 'stroke-width': 2 }, gRig);
    const sway = Math.sin(performance.now() / 700) * 3;
    const nose = { x: wv.x - 14, y: wv.y - sway * 0.2 }, tail = { x: wv.x + 18, y: wv.y + sway * 0.3 };
    el('line', { x1: nose.x, y1: nose.y, x2: tail.x, y2: tail.y, stroke: '#e2e8f0', 'stroke-width': 1.8 }, gRig);
    el('path', { d: `M${tail.x.toFixed(1)},${tail.y.toFixed(1)} l8,-7 l0,14 z`, fill: '#f472b6' }, gRig);
    el('circle', { cx: nose.x.toFixed(1), cy: nose.y.toFixed(1), r: 2.6, fill: '#e2e8f0' }, gRig);
    // bumba + köşe
    el('line', { x1: tp(G).x, y1: tp(G).y, x2: tp(C).x, y2: tp(C).y, stroke: '#334155', 'stroke-width': 6, 'stroke-linecap': 'round' }, gRig);
    const Co = add(C, P(10, 0));
    el('line', { x1: tp(C).x, y1: tp(C).y, x2: tp(Co).x, y2: tp(Co).y, stroke: '#ef4444', 'stroke-width': 3 }, gRig);
    // orsa yakası gerginliği (karuladan bumbaya)
    const K1 = add(G, P(12, 0));
    el('line', { x1: tp(T).x, y1: tp(T).y, x2: tp(K1).x, y2: tp(K1).y, stroke: '#ef4444', 'stroke-width': 1.5 + v.luff * 2.5 }, gRig);
    // gırcala
    el('line', { x1: tp(S).x, y1: tp(S).y, x2: tp(Pk).x, y2: tp(Pk).y, stroke: '#78350f', 'stroke-width': 4.5, 'stroke-linecap': 'round' }, gRig);
    el('circle', { cx: tp(S).x, cy: tp(S).y, r: 4, fill: '#ef4444' }, gRig);
    el('circle', { cx: tp(Pk).x, cy: tp(Pk).y, r: 3.5, fill: '#ef4444' }, gRig);
    // palanga
    const V0 = P(0, -6), V1 = add(G, mul(unit(sub(C, G)), 46));
    const sag = (1 - v.vang) * 12;
    const Vm = add(mix(V0, V1, 0.5), P(sag, sag * 0.4));
    el('path', { d: `M${pt(tp(V0))} Q${pt(tp(Vm))} ${pt(tp(V1))}`, fill: 'none', stroke: '#ef4444', 'stroke-width': 3 }, gRig);

    // orijinal (kılavuz) yelkenin hayalet çizgisi
    if (ghostV) {
      const keep = rot; rot = rakeDeg(ghostV.rake) + pitch;
      const gg = geom(ghostV, ghostSh);
      el('path', { d: sailPath(gg, ghostSh), fill: 'none', stroke: '#fbbf24', 'stroke-width': 1.6, 'stroke-dasharray': '7 5', opacity: 0.85 }, gGhost);
      const a = tp(P(0, 0)), b = tp(P(0, -300));
      el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#fbbf24', 'stroke-width': 1.4, 'stroke-dasharray': '5 5', opacity: 0.7 }, gGhost);
      rot = keep;
    }
    return { ...g, V1 };
  }

  function drawCallouts(k) {
    gCall.innerHTML = '';
    const items = [
      { key: 'sprit', at: mix(k.S, k.Pk, 0.55), dx: 70, dy: -20, txt: 'Gırcala' },
      { key: 'ties', at: k.luff[2], dx: -50, dy: 64, txt: 'Tepe bağları' },
      { key: 'rake', at: P(0, -150), dx: -46, dy: 44, txt: 'Direk' },
      { key: 'out', at: k.C, dx: 26, dy: -34, txt: 'Köşe' },
      { key: 'vang', at: k.V1, dx: -70, dy: 48, txt: 'Palanga' },
      { key: 'luff', at: k.T, dx: -56, dy: 10, txt: 'Cunningham' },
    ];
    for (const it of items) {
      const a = tp(it.at);
      const b = { x: a.x + it.dx, y: a.y + it.dy };
      const g = el('g', { class: 'callout' + (st.active === it.key ? ' on' : '') }, gCall);
      el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y }, g);
      el('circle', { cx: a.x, cy: a.y, r: 3 }, g);
      const w = it.txt.length * 7.4 + 16;
      const rx = it.dx < 0 ? b.x - w : b.x;
      el('rect', { x: rx, y: b.y - 11, width: w, height: 22, rx: 6 }, g);
      el('text', { x: rx + w / 2, y: b.y + 4.5, 'text-anchor': 'middle' }, g).textContent = it.txt;
      g.addEventListener('pointerdown', () => {
        st.active = it.key; refresh();
        const r = panel.querySelector(`.ctl[data-k="${it.key}"]`);
        if (r) r.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    }
  }

  const streaks = Array.from({ length: 26 }, (_, i) => ({ x: Math.random() * 700 - 30, y: 40 + (i * 37) % 300, l: 20 + Math.random() * 30 }));
  function drawEnv(dt, w, wave, time) {
    gWind.innerHTML = '';
    const n = Math.round(lerp(8, 26, w)), sp = lerp(40, 190, w);
    for (let i = 0; i < n; i++) {
      const s = streaks[i];
      s.x += sp * dt; if (s.x > 680) s.x = -60;
      el('line', { x1: s.x, y1: s.y, x2: s.x + s.l, y2: s.y, stroke: '#7dd3fc', 'stroke-width': 1.4, opacity: 0.35, 'stroke-linecap': 'round' }, gWind);
    }
    gWater.innerHTML = '';
    const amp = lerp(1.5, 9, wave), wl = lerp(70, 120, wave);
    let d = 'M0,560 L0,430';
    for (let x = 0; x <= 640; x += 10) d += ` L${x},${(430 + amp * Math.sin((x / wl) * 2 * Math.PI - time * 2.2)).toFixed(1)}`;
    d += ' L640,560 Z';
    el('path', { d, fill: '#0c3b5e', opacity: 0.9 }, gWater);
  }

  // ---------- üstten kesitler + rüzgar gülü ----------
  const secSvg = $('sections');
  function drawSections(sh, ghostSh) {
    secSvg.innerHTML = '';
    const defs = el('defs', {}, secSvg);
    const m = el('marker', { id: 'secArrow', markerWidth: 8, markerHeight: 8, refX: 6, refY: 4, orient: 'auto' }, defs);
    el('path', { d: 'M0,0 L8,4 L0,8 Z', fill: '#7dd3fc' }, m);
    const O = { x: 120, y: 34 };
    el('line', { x1: O.x, y1: 6, x2: O.x, y2: 226, stroke: '#334155', 'stroke-width': 1.5, 'stroke-dasharray': '4 4' }, secSvg);
    el('text', { x: O.x - 6, y: 222, 'text-anchor': 'end', class: 'sec-note' }, secSvg).textContent = 'tekne ekseni';
    const R = { x: 40, y: 44 };
    el('circle', { cx: R.x, cy: R.y, r: 24, fill: 'none', stroke: '#334155', 'stroke-width': 1.2 }, secSvg);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, r1 = i % 2 ? 19 : 15;
      el('line', { x1: R.x + Math.sin(a) * r1, y1: R.y - Math.cos(a) * r1, x2: R.x + Math.sin(a) * 24, y2: R.y - Math.cos(a) * 24, stroke: '#475569', 'stroke-width': 1 }, secSvg);
    }
    const wa = -40 * Math.PI / 180;
    el('line', { x1: R.x + Math.sin(wa) * 22, y1: R.y - Math.cos(wa) * 22, x2: R.x - Math.sin(wa) * 14, y2: R.y + Math.cos(wa) * 14, stroke: '#7dd3fc', 'stroke-width': 2.2, 'marker-end': 'url(#secArrow)' }, secSvg);
    el('text', { x: R.x, y: R.y + 38, 'text-anchor': 'middle', class: 'sec-note' }, secSvg).textContent = 'rüzgar gülü';
    const cols = ['#34d399', '#38bdf8', '#f472b6'], names = ['Alt', 'Orta', 'Üst'], chord = [178, 168, 150];
    const curve = (s, i, attrs) => {
      const ang = (s.sheet + s.twist * (i / 2)) * Math.PI / 180;
      const dir = { x: Math.sin(ang), y: Math.cos(ang) }, n = { x: dir.y, y: -dir.x };
      const c = chord[i], h = 2 * (s.depth[i] / 100) * c * 1.6;
      const E = { x: O.x + dir.x * c, y: O.y + dir.y * c };
      const Q = { x: O.x + dir.x * c * s.draftPos * 0.85 + n.x * h, y: O.y + dir.y * c * s.draftPos * 0.85 + n.y * h };
      el('path', { d: `M${O.x},${O.y} Q${Q.x.toFixed(1)},${Q.y.toFixed(1)} ${E.x.toFixed(1)},${E.y.toFixed(1)}`, fill: 'none', ...attrs }, secSvg);
      return E;
    };
    for (let i = 0; i < 3; i++) {
      if (ghostSh) curve(ghostSh, i, { stroke: '#fbbf24', 'stroke-width': 1.2, 'stroke-dasharray': '4 3', opacity: 0.8 });
      const E = curve(sh, i, { stroke: cols[i], 'stroke-width': 3, 'stroke-linecap': 'round' });
      el('text', { x: E.x + 6, y: E.y + 4, fill: cols[i], class: 'sec-lbl' }, secSvg).textContent = `${names[i]} %${Math.round(sh.depth[i])}`;
    }
    el('text', { x: 296, y: 222, 'text-anchor': 'end', class: 'sec-note' }, secSvg).textContent = `twist ≈ ${Math.round(sh.twist)}°`;
  }

  // ---------- yakın görünüş: direk bağları (gerçek oranlı büyütme) ----------
  const tieSvg = $('tiesZoom');
  function drawTiesZoom(v, ov) {
    tieSvg.innerHTML = '';
    const X0 = 34, PX = 9;               // 1 mm = 9 px
    const ys = Array.from({ length: NTIES }, (_, i) => 12 + i * 21);
    el('rect', { x: X0 - 12, y: 2, width: 12, height: 170, rx: 4, fill: '#475569' }, tieSvg);
    el('text', { x: X0 - 6, y: 188, 'text-anchor': 'middle', class: 'sec-note' }, tieSvg).textContent = 'direk';
    const pts = ys.map((y, i) => ({ x: X0 + v.ties[i] * PX, y }));
    el('polygon', { points: pts.map(p => `${p.x},${p.y}`).join(' ') + ` 150,${ys[NTIES - 1]} 150,${ys[0]}`, fill: 'rgba(248,250,252,.14)' }, tieSvg);
    if (ov && ov.ties.some((g, i) => Math.abs(g - v.ties[i]) > 0.01)) {
      el('polyline', { points: ys.map((y, i) => `${X0 + ov.ties[i] * PX},${y}`).join(' '), fill: 'none', stroke: '#fbbf24', 'stroke-width': 1.4, 'stroke-dasharray': '4 3' }, tieSvg);
    }
    el('polyline', { points: pts.map(p => `${p.x},${p.y}`).join(' '), fill: 'none', stroke: '#f8fafc', 'stroke-width': 2.4 }, tieSvg);
    pts.forEach((p, i) => {
      const on = st.focusTie === i;
      if (p.x > X0 + 1) el('line', { x1: X0, y1: p.y, x2: p.x, y2: p.y, stroke: '#f59e0b', 'stroke-width': 3, 'stroke-linecap': 'round' }, tieSvg);
      el('circle', { cx: p.x, cy: p.y, r: on ? 4.5 : 3.2, fill: on ? '#fde047' : '#f59e0b' }, tieSvg);
      el('text', { x: 158, y: p.y + 4, class: 'tie-lbl' + (on ? ' on' : '') }, tieSvg).textContent = `${fmt(v.ties[i])} mm`;
    });
    el('line', { x1: X0, y1: 182, x2: X0 + 5 * PX, y2: 182, stroke: '#94a3b8', 'stroke-width': 1 }, tieSvg);
    el('text', { x: X0 + 5 * PX + 4, y: 185, class: 'sec-note' }, tieSvg).textContent = '5 mm';
  }

  // ---------- uyarılar ----------
  function warnings(v, sh) {
    // Kılavuzun istediği bir görüntüyse (ör. hafif havada bilerek gevşek) mavi bilgi, değilse kırmızı uyarı
    const o = original(st.brand, st.wind, st.sea).v;
    const asGuide = k => Math.abs(v[k] - o[k]) < 0.03;
    const out = [];
    if (v.sprit < 0.42) out.push(['sprit', 'Gırcala gevşek: direk tepesinden köşeye kırışık.']);
    if (v.sprit > 0.62) out.push(['sprit', 'Gırcala fazla sıkı: tepeden karulaya kırışık.']);
    if (v.luff < 0.35) out.push(['luff', 'Orsa yakası gevşek: bağlarda yatay kırışıklar.']);
    if (sh.lift > 4) out.push(['vang', 'Sert havada palanga gevşek: bumba kalkıyor, üst kısım fazla açık.']);
    if (st.wind === 'hafif' && v.vang > 0.55) out.push(['vang', 'Hafif havada palanga sıkı: yelken düzleşir, güç azalır.']);
    if (st.wind === 'sert' && v.out < 0.45) out.push(['out', 'Sert havada köşe gevşek: alt kısım derin, tekne fazla yatar.']);
    const w = $('warn');
    w.hidden = !out.length;
    w.classList.toggle('info', out.length > 0 && out.every(([k]) => asGuide(k)));
    w.innerHTML = out.map(([k, t]) => `<div>${asGuide(k) ? 'Kılavuzun istediği görüntü: ' + esc(t.charAt(0).toLowerCase() + t.slice(1)) : esc(t)}</div>`).join('');
  }

  // ---------- döngü ----------
  let last = performance.now(), time = 0, windNow = WIND[st.wind], waveNow = st.sea === 'dalgali' ? 1 : 0, lastKey = '';
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
    if (st.target) {
      let done = true;
      const step = (a, b) => { const d = b - a; if (Math.abs(d) > 0.004) { done = false; return a + d * Math.min(1, dt * 3.2); } return b; };
      for (const k of ['rake', 'sprit', 'vang', 'out', 'luff']) st.val[k] = step(st.val[k], st.target[k]);
      st.val.ties = st.val.ties.map((x, i) => step(x, st.target.ties[i]));
      if (done) { st.val = copy(st.target); st.target = null; }
      refresh();
    }
    windNow = lerp(windNow, WIND[st.wind], Math.min(1, dt * 2));
    waveNow = lerp(waveNow, st.sea === 'dalgali' ? 1 : 0, Math.min(1, dt * 2));
    const pitch = waveNow * 1.8 * Math.sin(time * 2.2 - 1.2);
    bob = waveNow * 4 * Math.sin(time * 2.2 - 2.4);
    const sh = shape(st.val, windNow, waveNow);
    const ov = original(st.brand, st.wind, st.sea).v;
    const differs = st.mode === 'ozel' && !!st.custom[ckey()] && JSON.stringify(ov) !== JSON.stringify(st.custom[ckey()]);
    const gsh = differs ? shape(ov, windNow, waveNow) : null;
    drawEnv(dt, windNow, waveNow, time);
    gHull.setAttribute('transform', `rotate(${pitch.toFixed(2)} ${STEP.x} ${STEP.y}) translate(0 ${bob.toFixed(2)})`);
    const k = drawRig(st.val, sh, pitch, differs ? ov : null, gsh);
    drawCallouts(k);
    $('legend').hidden = !differs;
    const key = JSON.stringify(st.val) + st.active + st.wind + st.sea + st.focusTie + differs + Math.round(windNow * 50) + Math.round(waveNow * 50);
    if (key !== lastKey) { drawSections(sh, gsh); drawTiesZoom(st.val, differs ? ov : null); warnings(st.val, sh); lastKey = key; }
    requestAnimationFrame(frame);
  }

  drawHull();
  syncTop();
  st.val = copy(current());
  refresh();
  if (window.SailReport && window.SailReport.source) window.SailReport.source('ayar', () => ({ ozet: `${st.brand} ${st.wind}/${st.sea} ${st.mode}`, brand: st.brand, wind: st.wind, sea: st.sea, mode: st.mode, val: st.val }));
  requestAnimationFrame(frame);
})();
