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
  const fmtM = cm => (cm / 100).toLocaleString('tr-TR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

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
      about: 'Kılavuz direk eğimi (m) ve havaya göre 8 değerlik bir mm dizisi veriyor. Dizinin direk bağları boşluğu olduğu ve sırası belgede açıkça yazmıyor (dizi simetrik).',
      hafif: { rake: 279.5, ties: [5, 4, 3, 2, 2, 3, 4, 5], luff: 0.2, note: { rake: '2,79-2,80 m', ties: '5,4,3,2,2,3,4,5 mm, "gergin değil"', luff: 'Gergin değil; orsa yakasında hafif çizgiler.' } },
      orta: { rake: 279.5, ties: [2, 2, 2, 2, 2, 2, 2, 2], luff: 0.4, note: { rake: '2,79-2,80 m', ties: 'Hepsi 2 mm, "hafif gergin"', luff: 'Hafif gergin.' } },
      sert: { rake: 277.5, ties: [0, 1, 2, 3, 3, 2, 1, 0], luff: 0.75, out: 0.95, note: { rake: '2,77-2,78 m', ties: '0,1,2,3,3,2,1,0 mm, "gergin"', out: 'Köşe çekili ve bağlı: 0 mm.', sprit: 'Sorun olursa gırcalayı biraz aç.', luff: 'Gergin.' } },
    },
    north: {
      name: 'North Sails', url: 'https://northsails.com/sailing/en/resources/optimist-dinghy-speed-guide',
      about: 'Hız kılavuzu çoğunlukla göreli; direk eğimi için yalnız "taban ayara göre" farklar veriyor (taban 2,80 m burada varsayım). Bu kılavuza göre Optimist\'te Cunningham yok, orsa yakası bumba emniyet halatının (boom preventer) bükümüyle gerilir.',
      hafif: { rake: 279, sprit: 0.36, vang: 0.1, out: 0.3, luff: 0.25,
        note: { rake: 'Tabanın biraz gerisi.', sprit: 'Direk tepesinden köşeye bir kırışık çıkana kadar gevşet.', out: 'Altta yatay kırışık kaybolana, bağların üstündeki dikey izler ilk dikişi geçmeyene kadar gevşet.', luff: 'Sağanakta bağlarda yatay kırışık görünene kadar gevşet.' } },
      orta: { rake: 280, sprit: 0.5, vang: 0.5, out: 0.55, luff: 0.5,
        note: { rake: 'Küpeşteye çıkınca tabana dön.', sprit: 'Yelken çok pürüzsüz olana kadar sık.', out: 'Dalgada bumba bağlarındaki dikey izler yalnız ilk dikişe varsın.', luff: 'Bumba emniyetinden bir büküm al; orta gerginlik, sıkı değil.' } },
      sert: { rake: 281, sprit: 0.55, vang: 0.9, out: 0.85, luff: 0.75,
        note: { rake: 'Küpeştede: tabanın biraz önü. Fazla güçte (overpowered): tabandan 2 cm geri.', sprit: 'Hâlâ sıkı, yelken pürüzsüz. Fazla güçte: gevşet, sonra direk tepesinden köşeye kırışık çıkana kadar yeniden sık.', out: 'Yelken dolana kadar altta kırışık görünecek kadar sıkı.', luff: 'Bir büküm daha al; fazla güçte çok sıkı.', vang: 'Fazla güçte bumbayı sertçe aşağı bas.' } },
    },
    quantum: {
      name: 'Quantum', url: 'https://quantumsails.com/en/sails/one-design/documents/optimist/opti_tuning_guide',
      about: 'Direk eğimini havaya göre değil sporcunun kilosuna göre veriyor (burada 40-45 kg: 2,80-2,83 m). Orsa yakası için diğer kılavuzların tersini söylüyor: hafif ve orta modellerde hafif havada gergin, sert havada gevşek.',
      hafif: { rake: 281.5, ties: Array(NTIES).fill(1.5), vang: 0.05, luff: 0.6,
        note: { rake: '40-45 kg: 2,80-2,83 m (30-40 kg: 2,78-2,81 m; 45 kg üstü: 2,83-2,86 m).', ties: 'Orsa yakası ile direk arası 1-2 mm.', vang: 'Çok az ya da hiç.', luff: 'Hafif/orta modellerde hafif havada gerginlik ver (orsa açısı için).', sprit: 'Tepe: direk tepesinden aşağı en az kırışık; emin değilsen az gerginlik.' } },
      orta: { rake: 281.5, ties: Array(NTIES).fill(1.5), note: { rake: '40-45 kg: 2,80-2,83 m.', ties: '1-2 mm.' } },
      sert: { rake: 281.5, ties: [0, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 0], vang: 0.9, luff: 0.3,
        note: { rake: 'Dümen ağırsa önce salmayı geri al, olmazsa direği 1-2 cm öne.', ties: 'En üst ve en alt bağ direğe yapışık (0 mm). 44 kg üstü, orsa yakasından köşeye kırışık varsa orta bağları gevşet.', vang: 'Çok daha sıkı; orsa yakasından köşeye kırışık çıkınca dur.', luff: 'Gevşet: kambur öne gelir, arka yaka açılır.' } },
    },
    jsails: { name: 'J-Sails', missing: true, about: 'Bu markanın kılavuzu bulunamadı. Değerler taslak varsayılanı; sahip hesabı "Orijinali düzenle" ile kılavuz değerlerini elle girebilir.' },
    olimpic: { name: 'Olimpic', missing: true, about: 'Bu markanın kılavuzu bulunamadı. Değerler taslak varsayılanı; sahip hesabı "Orijinali düzenle" ile kılavuz değerlerini elle girebilir.' },
    cd: { name: 'CD Sails', missing: true, about: 'Bu markanın kılavuzu bulunamadı. Değerler taslak varsayılanı; sahip hesabı "Orijinali düzenle" ile kılavuz değerlerini elle girebilir.' },
  };

  // Direk eğimi tablosu (metre, kılavuzun yazdığı gibi). * = kılavuz göreli veriyor.
  const RAKE_TAB = {
    onesails: { hafif: '2,79-2,80', orta: '2,79-2,80', sert: '2,77-2,78' },
    north: { hafif: 'taban −1 cm*', orta: 'taban*', sert: 'taban +1 cm*' },
    quantum: { hafif: '2,80-2,83', orta: '2,80-2,83', sert: '2,80-2,83' },
    jsails: {}, olimpic: {}, cd: {},
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

  // ---------- bulut kaydı (Velora hesabı → Firebase / Firestore) ----------
  // sailingTrim/originals : { manual, updatedAt, by }  → herkes okur, yalnız sahip yazar (elle girilmiş orijinaller)
  // sailingTrim/u_<uid>   : { custom, updatedAt }      → her kullanıcı kendi özel ayarı (cihazlar arası)
  // Velora ile girilmemişse ya da Firebase kuralı izin vermiyorsa her şey bu cihazda kalır (localStorage).
  const Cloud = {
    uid: null, state: 'yerel', err: '', at: 0, timers: {},
    api: () => window.VeloraAuth && window.VeloraAuth.getDoc ? window.VeloraAuth : null,
    show() {
      const e = $('syncText'); if (!e) return;
      const t = this.at ? new Date(this.at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
      const txt = {
        yerel: 'Bu cihazda saklanıyor. Velora hesabıyla girersen telefonda ve iPad\'de de aynı ayarlar görünür.',
        bulut: `Velora hesabında saklanıyor${t ? ' · ' + t : ''}. Telefon ve iPad'de aynı.`,
        yaziliyor: 'Kaydediliyor…',
        hata: `Buluta yazılamadı (${this.err}). Ayarlar şimdilik bu cihazda.`,
      }[this.state];
      e.textContent = txt + (this.uid ? ` (hesap kimliği: ${this.uid})` : ''); e.className = 'sync ' + this.state;
    },
    async start() {
      const A = this.api(); if (!A) return;
      A.onUser(async user => {
        try {
          const o = await A.getDoc('sailingTrim', 'originals');
          if (o && o.manual && (o.updatedAt || 0) >= st.manualAt) { st.manual = o.manual; st.manualAt = o.updatedAt || 0; }
        } catch (e) { /* okuma kuralı yoksa yerel kalır */ }
        this.uid = user ? user.uid : null;
        if (!user) { this.state = 'yerel'; persist(); this.show(); choose(); return; }
        try {
          const u = await A.getDoc('sailingTrim', 'u_' + user.uid);
          if (u && u.custom && (u.updatedAt || 0) >= st.customAt) { st.custom = u.custom; st.customAt = u.updatedAt || 0; }
          else if (st.customAt) this.save('custom');
          this.state = 'bulut'; this.at = Math.max(st.customAt, (u && u.updatedAt) || 0);
        } catch (e) { this.state = 'hata'; this.err = (e && e.code) || 'bağlantı'; }
        persist(); this.show(); choose();
      });
    },
    save(what) {
      const A = this.api(); if (!A || !this.uid) { this.show(); return; }
      clearTimeout(this.timers[what]);
      this.timers[what] = setTimeout(async () => {
        this.state = 'yaziliyor'; this.show();
        try {
          if (what === 'custom') await A.setDoc('sailingTrim', 'u_' + this.uid, { custom: st.custom, updatedAt: st.customAt });
          else await A.setDoc('sailingTrim', 'originals', { manual: st.manual, updatedAt: st.manualAt, by: this.uid });
          this.state = 'bulut'; this.at = Date.now();
        } catch (e) { this.state = 'hata'; this.err = (e && e.code) || 'bağlantı'; }
        this.show();
      }, 900);
    },
  };

  // ---------- durum ----------
  const KEY = 'ps.trim.v1';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { saved = {}; }
  const st = {
    wind: WIND[saved.wind] != null ? saved.wind : 'orta', sea: SEA_TXT[saved.sea] ? saved.sea : 'duz',
    brand: BRANDS[saved.brand] ? saved.brand : 'onesails',
    mode: saved.mode === 'ozel' ? 'ozel' : 'orijinal',
    custom: (saved.custom && typeof saved.custom === 'object') ? saved.custom : {},   // custom['marka|hava|deniz'] = tüm değerler (kişisel)
    manual: (saved.manual && typeof saved.manual === 'object') ? saved.manual : {},   // manual[marka][hava][alan] = elle girilmiş orijinal (ortak)
    customAt: saved.customAt || 0, manualAt: saved.manualAt || 0,
    editOrig: false,
    val: null, target: null, active: null, focusTie: -1, trial: null,
  };
  function persist(what) {
    if (what === 'custom') st.customAt = Date.now();
    if (what === 'manual') st.manualAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify({ wind: st.wind, sea: st.sea, brand: st.brand, mode: st.mode, custom: st.custom, manual: st.manual, customAt: st.customAt, manualAt: st.manualAt })); } catch (e) { /* yok */ }
    if (what) Cloud.save(what);
  }
  const ckey = () => `${st.brand}|${st.wind}|${st.sea}`;

  function original(brand, wind, sea) {
    const b = BRANDS[brand], w = b[wind] || {}, d = DEF[wind];
    const v = {}, src = {};
    const m = (st.manual[brand] || {})[wind] || {};
    for (const k of ['rake', 'ties', 'sprit', 'vang', 'out', 'luff']) {
      // kaynak: 'elle' (sahibin girdiği orijinal) > 'kilavuz' (yayımlanmış kılavuz) > 'yok' (taslak varsayılanı)
      const x = m[k] != null ? m[k] : w[k] != null ? w[k] : d[k];
      v[k] = Array.isArray(x) ? x.slice() : x;
      src[k] = m[k] != null ? 'elle' : w[k] != null ? 'kilavuz' : 'yok';
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
      <div class="ctl-ends"><span>2,74 m · geriye eğik</span><span>dik · 2,88 m</span></div>
      <table class="rake-tab" id="rakeTab"></table>
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
      const t = st.val.ties.slice();
      t[i] = clamp(Math.round((t[i] + Number(b.dataset.d)) * 2) / 2, 0, 10);
      st.active = 'ties'; st.focusTie = i; setVal('ties', t);
    });
    tiesGrid.appendChild(c);
    tieCells.push(c);
  }
  $('rakeIn').addEventListener('input', e => { st.active = 'rake'; setVal('rake', Number(e.target.value)); });

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
    inp.addEventListener('input', () => { st.active = c.k; setVal(c.k, inp.value / 100); });
    rows[c.k] = { row, inp, val: row.querySelector('.ctl-val'), why: row.querySelector('.ctl-why'), c };
  }
  for (const r of panel.querySelectorAll('.ctl')) {
    const f = () => { if (st.active !== r.dataset.k) { st.active = r.dataset.k; refresh(); } };
    r.addEventListener('pointerenter', f); r.addEventListener('focusin', f);
  }

  // Bir ayar değişti: "Orijinali düzenle" açıksa elle girilmiş orijinal katmanına (ortak), değilse Özel'e (kişisel)
  function setVal(k, x) {
    if (st.trial) { st.trial = null; drawMistakes(); }
    if (st.editOrig && st.mode === 'orijinal') {
      if (st.sea === 'dalgali' && (k === 'out' || k === 'vang')) x = clamp(x + 0.1, 0, 1);   // dalga düzeltmesi geri alınır
      const b = st.manual[st.brand] || (st.manual[st.brand] = {});
      const w = b[st.wind] || (b[st.wind] = {});
      w[k] = Array.isArray(x) ? x.slice() : x;
      st.target = null; st.val = copy(current()); persist('manual'); syncTop(); refresh();
      return;
    }
    const v = ensureCustom();
    v[k] = Array.isArray(x) ? x.slice() : x;
    st.target = null; st.val = copy(current()); persist('custom'); syncTop(); refresh();
  }
  // Orijinal modda bir ayara dokunulursa: o kılavuzun kopyasıyla Özel'e geç
  function ensureCustom() {
    if (!st.custom[ckey()]) st.custom[ckey()] = copy(original(st.brand, st.wind, st.sea).v);
    st.mode = 'ozel';
    return st.custom[ckey()];
  }

  function word(k, v) {
    const words = k === 'out' ? ['Derin', 'Orta-derin', 'Orta', 'Orta-düz', 'Düz'] : ['Gevşek', 'Biraz gevşek', 'Orta', 'Biraz sıkı', 'Sıkı'];
    return words[clamp(Math.round(v * 4), 0, 4)];
  }

  // ---------- üst seçimler ----------
  const brandSel = $('brandSel');
  brandSel.innerHTML = Object.entries(BRANDS).map(([k, b]) => `<option value="${k}">${esc(b.name)}${b.missing ? ' (kılavuz yok)' : ''}</option>`).join('');
  function setSeg(id, v) { for (const b of $(id).querySelectorAll('button')) b.classList.toggle('on', b.dataset.v === v); }
  function syncTop() {
    setSeg('segWind', st.wind); setSeg('segSea', st.sea); setSeg('segMode', st.mode);
    brandSel.value = st.brand;
    $('btnResetCustom').hidden = st.mode !== 'ozel';
    const owner = document.documentElement.dataset.role === 'sahip';
    const eb = $('btnEditOrig');
    eb.hidden = !(owner && st.mode === 'orijinal');
    if (st.mode !== 'orijinal' || !owner) st.editOrig = false;
    eb.classList.toggle('on', st.editOrig);
    eb.textContent = st.editOrig ? 'Düzenleme açık' : 'Orijinali düzenle';
    document.body.classList.toggle('edit-orig', st.editOrig);
    const man = (st.manual[st.brand] || {})[st.wind] || {};
    $('btnClearManual').hidden = !(st.editOrig && Object.keys(man).length);
    const b = BRANDS[st.brand];
    $('condText').textContent = `${WIND_TXT[st.wind]}, ${SEA_TXT[st.sea]}. ${SEA_WHY[st.sea]}`;
    $('srcText').innerHTML = `${esc(b.about || '')}${b.url ? ` <a href="${b.url}" target="_blank" rel="noopener">Kılavuz ↗</a>` : ''}` +
      (st.editOrig ? '<br><b class="edit-note">Orijinali düzenliyorsun: değiştirdiğin her değer bu marka ve hava için "Elle girildi" diye herkese gösterilir.</b>' : '');
  }
  function choose() { st.trial = null; syncTop(); st.target = copy(current()); persist(); refresh(); if ($('mistakes')) drawMistakes(); }
  $('segWind').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; st.wind = b.dataset.v; choose(); });
  $('segSea').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; st.sea = b.dataset.v; choose(); });
  $('segMode').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    st.mode = b.dataset.v;
    if (st.mode === 'ozel' && !st.custom[ckey()]) st.custom[ckey()] = copy(original(st.brand, st.wind, st.sea).v);
    choose();
  });
  brandSel.addEventListener('change', () => { st.brand = brandSel.value; choose(); });
  $('btnResetCustom').addEventListener('click', () => { st.custom[ckey()] = copy(original(st.brand, st.wind, st.sea).v); persist('custom'); choose(); });
  $('btnEditOrig').addEventListener('click', () => { st.editOrig = !st.editOrig; syncTop(); refresh(); });
  $('btnClearManual').addEventListener('click', () => {
    if (st.manual[st.brand]) delete st.manual[st.brand][st.wind];
    persist('manual'); choose();
  });
  document.addEventListener('sail-access', () => { syncTop(); refresh(); });

  function refresh() {
    const o = original(st.brand, st.wind, st.sea);
    const v = st.val;
    const diff = (a, b) => Math.abs(a - b) > 0.02;
    const srcTag = k => o.src[k] === 'kilavuz' ? ' <span class="src-tag ok" title="Yayımlanmış kılavuzdan">Orijinal · kılavuz</span>'
      : o.src[k] === 'elle' ? ' <span class="src-tag man" title="Kılavuz değeri, elle girildi">Orijinal · elle girildi</span>'
        : ' <span class="src-tag no" title="Kılavuzda yok: taslak varsayılanı">Kılavuzda yok</span>';
    const origTxt = (ov, cur, f) => st.mode === 'ozel' && diff(ov, cur) ? `<span class="orig">orijinal ${f(ov)}</span>` : '';
    tieCells.forEach((c, i) => {
      c.querySelector('.tie-v').textContent = fmt(v.ties[i]);
      c.classList.toggle('changed', st.mode === 'ozel' && diff(v.ties[i], o.v.ties[i]));
      c.classList.toggle('focus', st.focusTie === i);
      c.title = `Orijinal: ${fmt(o.v.ties[i])} mm`;
    });
    $('whyTies').innerHTML = (o.note.ties && o.src.ties === 'kilavuz' ? `Kılavuz: ${esc(o.note.ties)}.` : o.src.ties === 'elle' ? 'Değerler elle girildi.' : 'Bu kılavuzda bağ ölçüsü yok; taslak varsayılanı.') +
      ' 0 mm = yelken direğe bitişik. Çizimde boşluk büyütülmüş.' + srcTag('ties');
    const ri = $('rakeIn');
    if (document.activeElement !== ri) ri.value = v.rake;
    ri.style.setProperty('--p', ((v.rake - 274) / 14 * 100) + '%');
    $('rakeVal').innerHTML = `${origTxt(o.v.rake, v.rake, x => fmtM(x) + ' m')}${fmtM(v.rake)} m`;
    const winds = ['hafif', 'orta', 'sert'];
    $('rakeTab').innerHTML = `<tr><th>Kılavuz</th>${winds.map(w => `<th class="${w === st.wind ? 'cur' : ''}">${w[0].toUpperCase() + w.slice(1)}</th>`).join('')}</tr>` +
      Object.keys(RAKE_TAB).map(b => `<tr class="${b === st.brand ? 'cur' : ''}"><td>${esc(BRANDS[b].name)}</td>${winds.map(w => { const ob = original(b, w, 'duz'); const t = ob.src.rake === 'elle' ? fmtM(ob.v.rake) + ' ✎' : ob.src.rake === 'kilavuz' ? (RAKE_TAB[b][w] || fmtM(ob.v.rake)) : '—'; return `<td class="${b === st.brand && w === st.wind ? 'hit' : ''}">${t}</td>`; }).join('')}</tr>`).join('');
    $('whyRake').innerHTML = (o.src.rake === 'elle' ? 'Değer elle girildi.' : o.note.rake && o.src.rake === 'kilavuz' ? `Kılavuz: ${esc(o.note.rake.replace(/\.?$/, '.'))}` : 'Kılavuzda bu hava için ölçü yok.') +
      ' Ölçü direk tepesinden kıç aynanın üst kenarına (metre); sayı küçüldükçe direk geriye yatar. * North yalnız taban ayara göre fark veriyor; Quantum havaya göre değil kiloya göre (40-45 kg). ✎ elle girildi, — kılavuzda yok.' + srcTag('rake');
    for (const k in rows) {
      const r = rows[k], x = v[k];
      if (document.activeElement !== r.inp) r.inp.value = Math.round(x * 100);
      r.inp.style.setProperty('--p', Math.round(x * 100) + '%');
      r.val.innerHTML = origTxt(o.v[k], x, y => word(k, y).toLowerCase()) + word(k, x);
      const n = o.note[k];
      r.why.innerHTML = (n && o.src[k] === 'kilavuz' ? `Kılavuz: ${esc(n)}` : o.src[k] === 'elle' ? `Değer elle girildi. ${esc(r.c.tip)}` : esc(r.c.tip)) + srcTag(k);
    }
    for (const r of panel.querySelectorAll('.ctl')) r.classList.toggle('active', st.active === r.dataset.k);
  }

  // ---------- türetilmiş şekil (göreli, şematik) ----------
  function shape(v, w, wave) {
    const twist = 4 + (1 - v.vang) * (6 + 10 * w) + 2 * wave;
    const lift = (1 - v.vang) * w * 9;
    // Orsa kavisi: yelkenin orsa yakası kesimde dışa ovaldir. Orta bağlar uçlardan yakın bağlanırsa (ör. uçlar 2-3, orta 1 mm)
    // bu kavis yelkenin içine itilir → torluluk artar (hafif hava). Orta gevşek, uçlar sıkı (0,1,2,3,3,2,1,0) → yelken düzleşir.
    const t = v.ties;
    const ends = (t[0] + t[NTIES - 1]) / 2, midGap = (t[3] + t[4]) / 2;
    const feed = ends - midGap;                                   // mm, + = kavis yelkene
    const topFeed = t[0] - (t[1] + t[2]) / 2;
    const foot = 5 + (1 - v.out) * 9 + (v.sprit - 0.5) * 3;
    const mid = Math.max(3, foot * 0.85 + 2 + (v.sprit - 0.5) * 4 + feed * 0.9);
    const top = Math.max(2.5, mid * 0.75 + topFeed * 0.5);
    const sheet = 9 + w * 5;
    const draftPos = 0.48 - v.luff * 0.1;
    return { twist, lift, depth: [foot, mid, top], sheet, draftPos, feed };
  }

  // ---------- yandan görünüş ----------
  const gRig = $('rig'), gHull = $('hull'), gWater = $('water'), gWind = $('windLayer'), gCall = $('callouts'), gGhost = $('ghost');
  const STEP = { x: 196, y: 404 };
  const GAP_PX = 2.6;            // çizimde 1 mm kaç px (büyütülmüş)

  function drawHull() {
    gHull.innerHTML = '';
    // gövde (pram baş, sert kine, kıç ayna): baş solda
    el('path', { d: 'M116,394 Q290,401 470,403 L465,444 Q330,463 172,447 Q150,442 140,432 Z', fill: 'url(#hullGrad)', stroke: '#0b1724', 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, gHull);
    el('path', { d: 'M116,394 L140,432 L150,431 L128,395 Z', fill: '#cbd5e1', stroke: '#0b1724', 'stroke-width': 1 }, gHull);                 // baş aynası
    el('path', { d: 'M142,425 Q300,436 467,430', fill: 'none', stroke: '#94a3b8', 'stroke-width': 1.2 }, gHull);                                // kine çizgisi
    el('path', { d: 'M150,438 Q300,452 465,442', fill: 'none', stroke: 'rgba(15,23,42,.18)', 'stroke-width': 6 }, gHull);                      // alt gölge
    el('path', { d: 'M116,394 Q290,401 470,403', fill: 'none', stroke: '#1e293b', 'stroke-width': 5, 'stroke-linecap': 'round' }, gHull);    // küpeşte (usturmaça)
    el('path', { d: 'M118,392.5 Q290,399.5 469,401.5', fill: 'none', stroke: '#64748b', 'stroke-width': 1.2 }, gHull);
    el('rect', { x: STEP.x - 12, y: 392, width: 30, height: 4, rx: 1.5, fill: '#475569' }, gHull);                                            // direk oturağı (thwart)
    // salma (centreboard / daggerboard): profil, yuvarlak giriş kenarı
    el('path', { d: 'M282,452 L279,528 Q280,538 290,538 L300,538 Q305,536 304,526 L304,454 Z', fill: 'url(#foilGrad)', stroke: '#0b1724', 'stroke-width': 1.3 }, gHull);
    el('rect', { x: 279, y: 389, width: 26, height: 11, rx: 2, fill: 'url(#foilGrad)', stroke: '#0b1724', 'stroke-width': 1 }, gHull);      // salma başı (kutudan çıkan)
    // dümen: ayna üzerinde iğneli, kanat profili, yeke ve uzatma (hiking stick)
    el('path', { d: 'M468,396 L488,396 L490,414 L470,414 Z', fill: '#334155', stroke: '#0b1724', 'stroke-width': 1 }, gHull);                 // dümen başı
    el('path', { d: 'M470,414 L493,414 Q503,468 495,522 Q489,532 478,528 L472,452 Z', fill: 'url(#foilGrad)', stroke: '#0b1724', 'stroke-width': 1.3 }, gHull);
    for (const y of [410, 432]) el('rect', { x: 464, y, width: 9, height: 4, rx: 1, fill: '#94a3b8', stroke: '#0b1724', 'stroke-width': .6 }, gHull); // iğne-yuva
    el('path', { d: 'M478,400 L404,391', stroke: '#a16207', 'stroke-width': 5, 'stroke-linecap': 'round' }, gHull);                          // yeke (ahşap)
    el('path', { d: 'M478,400 L404,391', stroke: '#facc15', 'stroke-width': 1, opacity: .5 }, gHull);
    el('circle', { cx: 404, cy: 391, r: 2.6, fill: '#0f172a' }, gHull);                                                                        // mafsal
    el('path', { d: 'M404,391 L322,384', stroke: '#0f172a', 'stroke-width': 3, 'stroke-linecap': 'round' }, gHull);                          // uzatma (güvertede yatar)
    el('circle', { cx: 322, cy: 384, r: 3.4, fill: '#0f172a' }, gHull);
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

  // Ölçüler: Optimist sınıf kuralları (mm, üst sınırlar): orsa yakası 1730, tepe 1240, arka yaka 2800; alt yaka ≈ 1900
  // (bumba en çok 2057). Direk 2350, gırcala 2286. Ekran ölçeği gövdeyle aynı (2310 mm ≈ 350 px).
  const K = 0.1515;
  const SAIL = { luff: 1730, head: 1240, leech: 2800, foot: 1900, boom: 2010, mast: 2350, sprit: 2286 };
  function circles(A, r1, B, r2) {            // iki çemberin kesişimi: üstteki (y küçük) nokta
    const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
    const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
    const xm = A.x + a * dx / d, ym = A.y + a * dy / d;
    const p1 = P(xm + h * dy / d, ym - h * dx / d), p2 = P(xm - h * dy / d, ym + h * dx / d);
    return p1.y < p2.y ? p1 : p2;
  }
  function geom(v, sh) {
    const bh = 40;
    const G = P(0, -bh);
    const la = sh.lift * Math.PI / 180;
    const bdir = P(Math.cos(la), -Math.sin(la));
    const C = add(G, mul(bdir, SAIL.foot * K));
    const BE = add(G, mul(bdir, SAIL.boom * K));
    const yBot = -bh - 4, yTop = yBot - SAIL.luff * K;
    const luff = v.ties.map((g, i) => P(3 + g * GAP_PX, lerp(yTop, yBot, i / (NTIES - 1))));
    const H = luff[0], T = luff[NTIES - 1];
    let Pk = circles(P(3, yTop), SAIL.head * K, C, SAIL.leech * K);
    const sl = SAIL.sprit * K;
    const S = P(0, Pk.y + Math.sqrt(Math.max(0, sl * sl - Pk.x * Pk.x)));   // gırcala boyu sabit: alt ucu direkte
    Pk = add(Pk, mul(unit(sub(Pk, S)), (v.sprit - 0.5) * 12));              // gırcala gerginliği tepeyi iter
    const mtop = yTop - 20 * K;                                              // en üst bağ deliği tepeden 20 mm
    return { G, C, BE, S, Pk, luff, T, H, mtop, mbot: mtop + SAIL.mast * K };
  }
  function sailPath(g, sh) {
    const { C, Pk, luff } = g;
    // arka yaka: tepeden köşeye dışa doğru oval (roach)
    const nrm = unit(P(-(C.y - Pk.y), C.x - Pk.x));
    const lm = mix(Pk, C, 0.48), T0 = luff[NTIES - 1];
    const out = len(sub(add(lm, nrm), T0)) > len(sub(add(lm, mul(nrm, -1)), T0)) ? nrm : mul(nrm, -1);   // karuladan uzağa = dışa
    const L1 = add(lm, mul(out, 13 - sh.twist * 0.25));
    const headMid = add(mix(luff[0], Pk, 0.5), P(-2, -7));
    // orsa yakası: bağlar arasında öne doğru hafif oval (yelkenin kesimindeki orsa kavisi)
    let d = `M${pt(tp(luff[NTIES - 1]))}`;
    for (let i = NTIES - 2; i >= 0; i--) {
      const m = add(mix(luff[i + 1], luff[i], 0.5), P(-1.6, 0));
      d += ` Q${pt(tp(m))} ${pt(tp(luff[i]))}`;
    }
    d += ` Q${pt(tp(headMid))} ${pt(tp(Pk))} Q${pt(tp(L1))} ${pt(tp(C))} Z`;
    return d;
  }

  function drawRig(v, sh, pitch, ghostV, ghostSh) {
    gRig.innerHTML = ''; gGhost.innerHTML = '';
    rot = rakeDeg(v.rake) + pitch;
    const g = geom(v, sh);
    const { G, C, S, Pk, luff, T, H } = g;
    const tieOn = i => st.active === 'ties' && st.focusTie === i;
    const L = (a, b, attrs) => el('line', { x1: tp(a).x, y1: tp(a).y, x2: tp(b).x, y2: tp(b).y, ...attrs }, gRig);
    const D = (pts, attrs) => el('path', { d: pts, ...attrs }, gRig);
    const sp = sailPath(g, sh);

    // ana iskota: bumba ucundan teknenin ortasındaki makaraya
    const MS = add(G, mul(unit(sub(C, G)), 220));
    el('line', { x1: tp(MS).x, y1: tp(MS).y, x2: 356, y2: 398 + bob, stroke: '#e2e8f0', 'stroke-width': 1.3, opacity: .8 }, gRig);

    // direk (alüminyum, metal parıltı) — yelkenin arkasında
    const mw = 3.6;
    D(`M${pt(tp(P(-mw, g.mbot)))} L${pt(tp(P(-mw + 0.8, g.mtop)))} L${pt(tp(P(mw - 0.8, g.mtop)))} L${pt(tp(P(mw, g.mbot)))} Z`, { fill: 'url(#metalGrad)', stroke: '#0f172a', 'stroke-width': 1 });
    D(`M${pt(tp(P(-mw - 0.6, g.mtop + 2)))} L${pt(tp(P(-mw - 0.6, g.mtop - 6)))} L${pt(tp(P(mw + 0.6, g.mtop - 6)))} L${pt(tp(P(mw + 0.6, g.mtop + 2)))} Z`, { fill: '#0f172a' }); // tepe kapağı

    // yelken: zemin + çapraz kesim panelleri + köşe takviyeleri (yelken içine kırpılı)
    const clip = el('clipPath', { id: 'sailClip' }, gRig);
    el('path', { d: sp }, clip);
    D(sp, { fill: 'url(#sailFill)', class: 'sail' });
    const cl = el('g', { 'clip-path': 'url(#sailClip)' }, gRig);
    const lu = unit(sub(Pk, C)), inward = P(-lu.y, lu.x);                     // arka yakaya dik, içeri
    const inw = inward.x > 0 ? mul(inward, -1) : inward;
    for (let t = 0.1; t < 0.98; t += 0.11) {                                  // çapraz kesim dikişleri
      const a = mix(C, Pk, t), b = add(a, mul(inw, 420));
      el('line', { x1: tp(a).x, y1: tp(a).y, x2: tp(b).x, y2: tp(b).y, stroke: '#94a3b8', 'stroke-width': 0.9, opacity: .55 }, cl);
    }
    const patch = (c, a, b, r) => {
      const p1 = add(c, mul(unit(sub(a, c)), r)), p2 = add(c, mul(unit(sub(b, c)), r));
      el('path', { d: `M${pt(tp(c))} L${pt(tp(p1))} Q${pt(tp(mix(mix(p1, p2, .5), c, -.15)))} ${pt(tp(p2))} Z`, fill: '#cbd5e1', opacity: .55, stroke: '#94a3b8', 'stroke-width': .6 }, cl);
    };
    patch(Pk, H, C, 46); patch(C, Pk, T, 44); patch(T, H, C, 30); patch(H, Pk, T, 28);
    // balen cepleri (sınıf kuralı: arka yakada 2 cep); uzunluk şematik
    const bat = [];
    for (const f of [0.3, 0.62]) {
      const a = mix(Pk, C, f), b = add(a, mul(inw, 58));
      bat.push(a);
      el('line', { x1: tp(a).x, y1: tp(a).y, x2: tp(b).x, y2: tp(b).y, stroke: '#cbd5e1', 'stroke-width': 5, 'stroke-linecap': 'round', opacity: .9 }, cl);
      el('line', { x1: tp(a).x, y1: tp(a).y, x2: tp(b).x, y2: tp(b).y, stroke: '#64748b', 'stroke-width': 1.2, 'stroke-linecap': 'round' }, cl);
    }
    // torluluk gölgesi: kamburun en derin yerinin arkasında koyulaşan bant (derinlikle artar)
    const midL = mix(T, H, 0.5), midR = mix(C, Pk, 0.5);
    const a0 = tp(midL), a1 = tp(midR);
    const dep = (sh.depth[0] + sh.depth[1] + sh.depth[2]) / 3;
    const gid = 'camberShade';
    const defs = el('defs', {}, gRig);
    const lg = el('linearGradient', { id: gid, gradientUnits: 'userSpaceOnUse', x1: a0.x, y1: a0.y, x2: a1.x, y2: a1.y }, defs);
    const k = clamp((dep - 4) / 10, 0, 1);
    [[0, 0], [sh.draftPos * 0.6, 0.05 * k], [sh.draftPos + 0.12, 0.34 * k], [0.88, 0.12 * k], [1, 0]].forEach(([o, a]) =>
      el('stop', { offset: o, 'stop-color': '#1e3a5f', 'stop-opacity': a.toFixed(3) }, lg));
    el('path', { d: sp, fill: `url(#${gid})` }, cl);
    // yelken numarası (üst balen cebinin altında, orsa yakasından içeride)
    const nP = tp(add(mix(H, T, 0.42), P(70, 0)));
    el('text', { x: nP.x, y: nP.y, transform: `rotate(${rot.toFixed(2)} ${nP.x.toFixed(1)} ${nP.y.toFixed(1)})`, class: 'sail-no', 'text-anchor': 'start' }, cl).textContent = 'TUR 123';
    D(sp, { fill: 'none', stroke: '#0b1724', 'stroke-width': 1.5, 'stroke-linejoin': 'round' });
    // orsa yakası şeridi (luff tape) ve arka yaka şeridi
    D(`M${luff.map(q => pt(tp(q))).join(' L')}`, { fill: 'none', stroke: '#e2e8f0', 'stroke-width': 3.2, 'stroke-linejoin': 'round' });
    // kambur şeritleri
    [0.25, 0.5, 0.78].forEach((f, i) => {
      const a = mix(T, H, f), b = mix(C, Pk, f * 1.02);
      const m = add(mix(a, b, sh.draftPos - 0.06), P(0, sh.depth[i] * 1.4));
      el('path', { d: `M${pt(tp(a))} Q${pt(tp(m))} ${pt(tp(b))}`, fill: 'none', stroke: '#0ea5e9', 'stroke-width': 2, opacity: 0.8 }, gRig);
    });
    // arka yaka şeritleri (leech telltales)
    // Hedefe göre: üst kısım fazla kapalıysa (twist az) üstteki şerit, çok kapalıysa ortadaki de döner (arkaya kıvrılır);
    // fazla açıksa şeritler dümdüz ve hızlı çırpar (yelken boşalıyor).
    [0.3, 0.55, 0.8].forEach((f, i) => {
      const a = mix(C, Pk, f);
      const lvl = 2 - i;                                         // 0 = üst şerit
      const stall = (RES.dt < -2.5 && lvl === 0) || (RES.dt < -5 && lvl === 1);
      const fast = RES.dt > 4;
      const now = performance.now();
      if (stall) {
        const wob = Math.sin(now / 420 + i) * 2;
        el('path', { d: `M${pt(tp(a))} q-3,6 -9,${(9 + wob).toFixed(1)} q-4,3 -2,8`, fill: 'none', stroke: '#f472b6', 'stroke-width': 1.8, 'stroke-linecap': 'round' }, gRig);
      } else {
        const fl = Math.sin(now / (fast ? 70 : 160) + i * 1.7) * (fast ? 1.6 : 3);
        el('path', { d: `M${pt(tp(a))} q9,${(fl * .4).toFixed(1)} ${fast ? 18 : 16},${fl.toFixed(1)}`, fill: 'none', stroke: '#f472b6', 'stroke-width': 1.8, 'stroke-linecap': 'round' }, gRig);
      }
    });

    // kırışıklar: gırcala gevşek → direk tepesinden köşeye; fazla sıkı → tepeden karulaya; orsa yakası gevşek → bağlarda yatay
    const loose = clamp((0.42 - v.sprit) / 0.22, 0, 1);
    const tight = clamp((v.sprit - 0.62) / 0.22, 0, 1);
    const crease = (A, B, op) => {
      const nn = unit(P(-(B.y - A.y), B.x - A.x));
      for (let i = 0; i < 5; i++) {
        const off = mul(nn, (i - 2) * 16);
        const a = add(mix(A, B, 0.12 + Math.abs(i - 2) * 0.04), off), b = add(mix(A, B, 0.66 - Math.abs(i - 2) * 0.05), off);
        el('path', { d: `M${pt(tp(a))} L${pt(tp(b))}`, stroke: '#475569', 'stroke-width': 1.3, opacity: op, 'stroke-dasharray': '6 5' }, gRig);
      }
    };
    if (loose > 0) crease(H, C, 0.25 + 0.6 * loose);
    if (tight > 0) crease(Pk, T, 0.25 + 0.6 * tight);
    const lw = clamp((0.35 - v.luff) / 0.3, 0, 1);
    if (lw > 0) luff.slice(1, -1).forEach(q => {
      L(add(q, P(6, 0)), add(q, P(34, 0)), { stroke: '#475569', 'stroke-width': 1.2, opacity: 0.25 + 0.55 * lw, 'stroke-dasharray': '4 4' });
    });

    // direk bağları: direğin etrafından dolanan halka + yelken kuşgözü
    luff.forEach((q, i) => {
      const m = P(0, q.y), on = tieOn(i);
      const c = tp(m);
      el('ellipse', { cx: c.x, cy: c.y, rx: 5.2, ry: 2.2, transform: `rotate(${rot.toFixed(2)} ${c.x.toFixed(1)} ${c.y.toFixed(1)})`, fill: 'none', stroke: on ? '#fde047' : '#f59e0b', 'stroke-width': 1.6 }, gRig);
      L(P(mw, q.y), q, { stroke: on ? '#fde047' : '#f59e0b', 'stroke-width': 1.8, 'stroke-linecap': 'round' });
      el('circle', { cx: tp(q).x, cy: tp(q).y, r: on ? 4.2 : 2.6, fill: '#e2e8f0', stroke: '#334155', 'stroke-width': 1.2 }, gRig);
    });

    // rüzgar gülü: çubuk, ok, kuyruk kanadı, karşı ağırlık
    const vb = tp(P(0, g.mtop - 6)), vt = tp(P(0, g.mtop - 30));
    el('line', { x1: vb.x, y1: vb.y, x2: vt.x, y2: vt.y, stroke: '#0f172a', 'stroke-width': 1.6 }, gRig);
    const sway = Math.sin(performance.now() / 650) * 2.5;
    const nose = { x: vt.x - 16, y: vt.y - sway * .25 }, tail = { x: vt.x + 20, y: vt.y + sway * .35 };
    el('line', { x1: nose.x, y1: nose.y, x2: tail.x, y2: tail.y, stroke: '#0f172a', 'stroke-width': 1.6 }, gRig);
    el('path', { d: `M${tail.x.toFixed(1)},${tail.y.toFixed(1)} l-9,-8 l5,0 l9,8 l-9,8 l-5,0 z`, fill: '#f472b6', stroke: '#0f172a', 'stroke-width': .6 }, gRig);
    el('circle', { cx: nose.x.toFixed(1), cy: nose.y.toFixed(1), r: 3, fill: '#0f172a' }, gRig);
    el('circle', { cx: vt.x.toFixed(1), cy: vt.y.toFixed(1), r: 1.8, fill: '#e2e8f0' }, gRig);

    // bumba: alüminyum boru, direk çatalı (jaw), uç başlığı
    const bw = 3;
    const bn = unit(P(-(C.y - G.y), C.x - G.x));
    const BE = g.BE;
    D(`M${pt(tp(add(G, mul(bn, bw))))} L${pt(tp(add(BE, mul(bn, bw * .9))))} L${pt(tp(add(BE, mul(bn, -bw * .9))))} L${pt(tp(add(G, mul(bn, -bw))))} Z`, { fill: 'url(#metalGrad)', stroke: '#0f172a', 'stroke-width': 1 });
    D(`M${pt(tp(add(G, P(-6, -5))))} L${pt(tp(add(G, P(8, -5))))} L${pt(tp(add(G, P(8, 5))))} L${pt(tp(add(G, P(-6, 5))))} Z`, { fill: '#1e293b' });
    D(`M${pt(tp(add(BE, P(-4, -4))))} L${pt(tp(add(BE, P(3, -4))))} L${pt(tp(add(BE, P(3, 4))))} L${pt(tp(add(BE, P(-4, 4))))} Z`, { fill: '#1e293b' });
    // köşe gergisi (outhaul): köşe → bumba ucu makarası → bumba üzerinde kurtağzı
    const Cc = add(G, mul(unit(sub(C, G)), 200));
    L(C, BE, { stroke: '#ef4444', 'stroke-width': 1.2 + v.out * 1.6 });
    L(add(BE, P(0, 2.5)), add(Cc, P(0, 2.5)), { stroke: '#ef4444', 'stroke-width': 1.2 });
    el('rect', { x: tp(Cc).x - 4, y: tp(Cc).y + 1, width: 8, height: 4, rx: 1, fill: '#0f172a', transform: `rotate(${rot.toFixed(2)} ${tp(Cc).x.toFixed(1)} ${tp(Cc).y.toFixed(1)})` }, gRig);

    // Cunningham / orsa yakası gergisi: karula kuşgözü → bumba çatalına → kurtağzı
    const Kc = add(G, P(26, 5));
    el('circle', { cx: tp(T).x, cy: tp(T).y, r: 3.4, fill: 'none', stroke: '#ef4444', 'stroke-width': 1.6 }, gRig);
    L(T, add(G, P(6, 4)), { stroke: '#ef4444', 'stroke-width': 1.2 + v.luff * 2 });
    L(add(G, P(6, 4)), Kc, { stroke: '#ef4444', 'stroke-width': 1.2 });

    // gırcala (sprit): ince boru, uç başlığı tepe kuşgözünde, alt uç gırcala halatında (snotter)
    const sn = unit(P(-(Pk.y - S.y), Pk.x - S.x));
    D(`M${pt(tp(add(S, mul(sn, 2.4))))} L${pt(tp(add(Pk, mul(sn, 1.8))))} L${pt(tp(add(Pk, mul(sn, -1.8))))} L${pt(tp(add(S, mul(sn, -2.4))))} Z`, { fill: 'url(#metalGrad)', stroke: '#0f172a', 'stroke-width': .9 });
    el('circle', { cx: tp(Pk).x, cy: tp(Pk).y, r: 3.8, fill: '#0f172a' }, gRig);
    el('rect', { x: tp(S).x - 5, y: tp(S).y - 4, width: 10, height: 8, rx: 2, fill: '#0f172a', transform: `rotate(${rot.toFixed(2)} ${tp(S).x.toFixed(1)} ${tp(S).y.toFixed(1)})` }, gRig);
    L(add(S, P(-mw - 1, 4)), P(-mw - 1, -70), { stroke: '#ef4444', 'stroke-width': 1.3 });                // gırcala halatı direk boyunca aşağı
    el('rect', { x: tp(P(-mw - 3, -70)).x - 3, y: tp(P(-mw - 3, -70)).y - 3, width: 6, height: 6, rx: 1, fill: '#0f172a' }, gRig);

    // palanga (vang): direk dibi ve bumba üzerinde iki makara, aralarında 3 kat halat, kurtağzı
    const V0 = P(4, -14), V1 = add(G, mul(unit(sub(C, G)), 52));
    const vn = unit(P(-(V1.y - V0.y), V1.x - V0.x));
    const sag = (1 - v.vang) * 10;
    for (const o of [-2.2, 0, 2.2]) {
      const a = add(V0, mul(vn, o)), b = add(V1, mul(vn, o)), m = add(mix(a, b, .5), P(sag, sag * .45));
      el('path', { d: `M${pt(tp(a))} Q${pt(tp(m))} ${pt(tp(b))}`, fill: 'none', stroke: '#ef4444', 'stroke-width': 1.2 }, gRig);
    }
    for (const q of [V0, V1]) {
      el('circle', { cx: tp(q).x, cy: tp(q).y, r: 4.6, fill: '#0f172a' }, gRig);
      el('circle', { cx: tp(q).x, cy: tp(q).y, r: 1.8, fill: '#94a3b8' }, gRig);
    }

    // orijinal (kılavuz) yelkenin hayalet çizgisi
    if (ghostV) {
      const keep = rot; rot = rakeDeg(ghostV.rake) + pitch;
      const gg = geom(ghostV, ghostSh);
      el('path', { d: sailPath(gg, ghostSh), fill: 'none', stroke: '#fbbf24', 'stroke-width': 1.6, 'stroke-dasharray': '7 5', opacity: 0.85 }, gGhost);
      const a = tp(P(0, 0)), b = tp(P(0, gg.mtop));
      el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#fbbf24', 'stroke-width': 1.4, 'stroke-dasharray': '5 5', opacity: 0.7 }, gGhost);
      rot = keep;
    }

    // direk eğimi ölçüsü: direk tepesinden kıç aynaya şerit metre
    const mt = tp(P(0, g.mtop - 4)), tr = { x: 470, y: 403 + bob };
    const onR = st.active === 'rake';
    el('line', { x1: mt.x, y1: mt.y, x2: tr.x, y2: tr.y, stroke: onR ? '#fde047' : 'rgba(253,224,71,.45)', 'stroke-width': onR ? 1.8 : 1.2, 'stroke-dasharray': '3 4' }, gRig);
    const mid = { x: lerp(mt.x, tr.x, .62), y: lerp(mt.y, tr.y, .62) };
    const txt = `${fmtM(v.rake)} m`;
    const w = txt.length * 7 + 14;
    el('rect', { x: mid.x - w / 2, y: mid.y - 10, width: w, height: 20, rx: 10, fill: onR ? '#fde047' : 'rgba(11,23,36,.85)', stroke: 'rgba(253,224,71,.6)' }, gRig);
    el('text', { x: mid.x, y: mid.y + 4, 'text-anchor': 'middle', class: 'rake-lbl' + (onR ? ' on' : '') }, gRig).textContent = txt;
    return { ...g, V1 };
  }

  function drawCallouts(k) {
    gCall.innerHTML = '';
    const items = [
      { key: 'sprit', at: mix(k.S, k.Pk, 0.55), dx: 70, dy: -20, txt: 'Gırcala' },
      { key: 'ties', at: k.luff[2], dx: -50, dy: 64, txt: 'Tepe bağları' },
      { key: 'rake', at: P(0, -150), dx: -46, dy: 44, txt: 'Direk' },
      { key: 'out', at: k.C, dx: 26, dy: -34, txt: 'Köşe' },
      { key: 'vang', at: k.V1, dx: 4, dy: 58, txt: 'Palanga' },
      { key: 'luff', at: k.T, dx: -56, dy: 10, txt: 'Cunningham' },
      { key: null, at: mix(k.G, k.C, 0.62), dx: 10, dy: 46, txt: 'Bumba' },
      { key: null, scr: { x: 292, y: 512 }, dx: -58, dy: 10, txt: 'Salma' },
      { key: null, scr: { x: 492, y: 486 }, dx: 26, dy: 4, txt: 'Dümen' },
      { key: null, scr: { x: 446, y: 397 }, dx: 30, dy: 30, txt: 'Yeke' },
    ];
    for (const it of items) {
      const a = it.scr ? { x: it.scr.x, y: it.scr.y + bob } : tp(it.at);
      const b = { x: a.x + it.dx, y: a.y + it.dy };
      const g = el('g', { class: 'callout' + (it.key && st.active === it.key ? ' on' : '') }, gCall);
      el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y }, g);
      el('circle', { cx: a.x, cy: a.y, r: 3 }, g);
      const w = it.txt.length * 7.4 + 16;
      const rx = it.dx < 0 ? b.x - w : b.x;
      el('rect', { x: rx, y: b.y - 11, width: w, height: 22, rx: 6 }, g);
      el('text', { x: rx + w / 2, y: b.y + 4.5, 'text-anchor': 'middle' }, g).textContent = it.txt;
      if (!it.key) { g.classList.add('plain'); continue; }
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
      if (attrs.fillc) el('path', { d: `M${O.x},${O.y} Q${Q.x.toFixed(1)},${Q.y.toFixed(1)} ${E.x.toFixed(1)},${E.y.toFixed(1)} Z`, fill: attrs.fillc, opacity: 0.16, stroke: 'none' }, secSvg);
      const { fillc, ...a2 } = attrs; void fillc;
      el('path', { d: `M${O.x},${O.y} Q${Q.x.toFixed(1)},${Q.y.toFixed(1)} ${E.x.toFixed(1)},${E.y.toFixed(1)}`, fill: 'none', ...a2 }, secSvg);
      return E;
    };
    for (let i = 0; i < 3; i++) {
      if (ghostSh) curve(ghostSh, i, { stroke: '#fbbf24', 'stroke-width': 1.2, 'stroke-dasharray': '4 3', opacity: 0.8 });
      const E = curve(sh, i, { stroke: cols[i], 'stroke-width': 3, 'stroke-linecap': 'round', fillc: cols[i] });
      el('text', { x: E.x + 6, y: E.y + 4, fill: cols[i], class: 'sec-lbl' }, secSvg).textContent = `${names[i]} %${Math.round(sh.depth[i])}`;
    }
    el('text', { x: 296, y: 222, 'text-anchor': 'end', class: 'sec-note' }, secSvg).textContent = `twist ≈ ${Math.round(sh.twist)}°`;
  }

  // ---------- torluluk etiketi ----------
  function fullness(sh) {
    const m = sh.depth[1];
    const [txt, cls] = m >= 11 ? ['Torlu (güçlü)', 'full'] : m >= 8 ? ['Orta derinlik', 'mid'] : ['Düz, duvar gibi', 'flat'];
    const e = $('fullTxt');
    e.className = 'full-badge ' + cls;
    e.textContent = `${txt} · orta kesit %${Math.round(m)}` + (Math.abs(sh.feed) >= 0.5 ? (sh.feed > 0 ? ' · orsa kavisi yelkene verildi' : ' · orsa kavisi geri alındı') : '');
  }

  // ---------- yelken planı (düz yatırılmış, sınıf kuralı ölçüleri) ----------
  function drawPlan() {
    const svg = $('plan'); if (!svg) return;
    svg.innerHTML = '';
    const s2 = 0.072, ox = 78, oy = 210;          // mm → px; karula sol altta
    const M = (x, y) => ({ x: ox + x * s2, y: oy - y * s2 });
    const T0 = { x: 0, y: 0 }, H0 = { x: 0, y: SAIL.luff }, C0 = { x: SAIL.foot, y: 0 };
    const P0 = circles({ x: 0, y: -SAIL.luff }, SAIL.head, { x: SAIL.foot, y: 0 }, SAIL.leech);   // y aşağı pozitif uzayda çöz
    const Pk0 = { x: P0.x, y: -P0.y };
    const t = M(T0.x, T0.y), h = M(H0.x, H0.y), c = M(C0.x, C0.y), pk = M(Pk0.x, Pk0.y);
    const luffMid = M(-110, SAIL.luff / 2);           // orsa kavisi (abartılı)
    const lm = { x: (pk.x + c.x) / 2, y: (pk.y + c.y) / 2 };
    const ln = { x: -(c.y - pk.y), y: c.x - pk.x }, lnl = Math.hypot(ln.x, ln.y);
    const sg = ((lm.x + ln.x - t.x) ** 2 + (lm.y + ln.y - t.y) ** 2) > ((lm.x - ln.x - t.x) ** 2 + (lm.y - ln.y - t.y) ** 2) ? 1 : -1;   // dışa (karuladan uzağa)
    const leechC = { x: lm.x + sg * ln.x / lnl * 14, y: lm.y + sg * ln.y / lnl * 14 };
    el('path', { d: `M${t.x},${t.y} Q${luffMid.x},${luffMid.y} ${h.x},${h.y} L${pk.x},${pk.y} Q${leechC.x.toFixed(1)},${leechC.y.toFixed(1)} ${c.x},${c.y} Z`, fill: 'rgba(248,250,252,.9)', stroke: '#0b1724', 'stroke-width': 1.2 }, svg);
    el('line', { x1: t.x, y1: t.y, x2: h.x, y2: h.y, stroke: '#64748b', 'stroke-width': 1, 'stroke-dasharray': '3 3' }, svg);
    el('line', { x1: pk.x, y1: pk.y, x2: c.x, y2: c.y, stroke: '#64748b', 'stroke-width': 1, 'stroke-dasharray': '3 3' }, svg);
    for (let i = 0; i < NTIES; i++) {            // 8 orsa kuşgözü (tepe ve karula dahil)
      const f = i / (NTIES - 1), y = lerp(t.y, h.y, f);
      const bx = lerp(t.x, h.x, f) - Math.sin(Math.PI * f) * 4;
      el('circle', { cx: bx.toFixed(1), cy: y.toFixed(1), r: 2, fill: '#f59e0b' }, svg);
    }
    for (const f of [0.3, 0.62]) {               // balen cepleri
      const a = { x: lerp(pk.x, c.x, f), y: lerp(pk.y, c.y, f) };
      el('line', { x1: a.x, y1: a.y, x2: a.x - 26, y2: a.y - 3, stroke: '#94a3b8', 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
    }
    const lab = (x, y, txt, anchor = 'middle') => { const e = el('text', { x, y, 'text-anchor': anchor, class: 'plan-lbl' }, svg); e.textContent = txt; };
    lab(t.x - 10, (t.y + h.y) / 2, 'orsa 1730', 'end');
    lab((h.x + pk.x) / 2 - 6, (h.y + pk.y) / 2 - 6, 'tepe 1240', 'end');
    lab((pk.x + c.x) / 2 + 12, (pk.y + c.y) / 2, 'arka yaka 2800', 'start');
    lab((t.x + c.x) / 2, t.y + 13, 'alt yaka ≈1900');
    lab(t.x - 10, (t.y + h.y) / 2 + 14, 'orsa kavisi ↔', 'end');
    el('text', { x: 296, y: 12, 'text-anchor': 'end', class: 'sec-note' }, svg).textContent = 'mm, sınıf kuralı üst sınırları · kavis abartılı';
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
    // yelkenin kesimdeki orsa kavisi: uçlar hizasında düz bir yaka olsaydı ortası öne doğru taşardı (abartılı)
    const lr = 3 * PX;
    el('path', { d: `M${pts[0].x},${pts[0].y} Q${(pts[0].x + pts[NTIES - 1].x) / 2 - lr * 2},${(pts[0].y + pts[NTIES - 1].y) / 2} ${pts[NTIES - 1].x},${pts[NTIES - 1].y}`, fill: 'none', stroke: '#a78bfa', 'stroke-width': 1.3, 'stroke-dasharray': '3 3' }, tieSvg);
    pts.forEach((p, i) => {
      const on = st.focusTie === i;
      if (p.x > X0 + 1) el('line', { x1: X0, y1: p.y, x2: p.x, y2: p.y, stroke: '#f59e0b', 'stroke-width': 3, 'stroke-linecap': 'round' }, tieSvg);
      el('circle', { cx: p.x, cy: p.y, r: on ? 4.5 : 3.2, fill: on ? '#fde047' : '#f59e0b' }, tieSvg);
      el('text', { x: 158, y: p.y + 4, class: 'tie-lbl' + (on ? ' on' : '') }, tieSvg).textContent = `${fmt(v.ties[i])} mm`;
    });
    el('line', { x1: X0, y1: 182, x2: X0 + 5 * PX, y2: 182, stroke: '#94a3b8', 'stroke-width': 1 }, tieSvg);
    el('text', { x: X0 + 5 * PX + 4, y: 185, class: 'sec-note' }, tieSvg).textContent = '5 mm';
  }

  // ---------- sonuç: doğru ayara (kılavuz) göre ne olur? ----------
  // Göreli model: hedef = seçili kılavuzun bu hava/deniz ayarı. Değerler YÖN ve BÜYÜKLÜK gösterir, ölçülmüş knot/derece değildir.
  const RES = { dm: 0, dt: 0, dr: 0, speed: 0, point: 0, heel: 0, helm: 0, heelDeg: 0 };
  function results(v, sh, w, wave) {
    const tv = original(st.brand, st.wind, st.sea).v;
    const tsh = shape(tv, w, wave);
    const dm = sh.depth[1] - tsh.depth[1];                 // orta kesit derinlik farkı (%-puan)
    const dfoot = sh.depth[0] - tsh.depth[0];
    const dtw = sh.twist - tsh.twist;                      // twist farkı (derece)
    const dr = v.rake - tv.rake;                           // direk eğimi farkı (cm); − = daha geride
    const cr = clamp((0.42 - v.sprit) / 0.22, 0, 1) + clamp((v.sprit - 0.62) / 0.22, 0, 1);
    const heavy = w, light = 1 - w;
    const P = dm * 0.7 + dfoot * 0.3;                      // güç farkı
    const lossFull = P > 0 ? P * (0.03 + 0.14 * heavy) : 0;
    const lossFlat = P < 0 ? -P * (0.03 + 0.12 * light + 0.08 * wave) : 0;
    const speed = -clamp(lossFull + lossFlat + Math.abs(dtw) * 0.025 + cr * 0.25 + Math.max(0, sh.lift - tsh.lift) * 0.03 + Math.abs(dr) * 0.03, 0, 1);
    const point = clamp(-P * 0.07 - dtw * 0.03 + (v.luff - tv.luff) * 0.25 - Math.max(0, dr) * 0.05, -1, 1);
    const heel = clamp((P * 0.09 - dtw * 0.035) * (0.25 + heavy), -1, 1);
    const helm = clamp(-dr * 0.14 + heel * 0.5, -1, 1);
    Object.assign(RES, { dm, dt: dtw, dr, speed, point, heel, helm, heelDeg: 4 + 14 * w + heel * 14, tm: tsh.depth[1] });
  }
  const GAUGES = [
    ['speed', 'Hız', 'yavaş', 'hızlı'],
    ['point', 'Orsa açısı', 'düşük', 'yüksek'],
    ['heel', 'Yatma', 'az', 'fazla'],
    ['helm', 'Dümen', 'boş', 'ağır'],
  ];
  const gEl = $('gauges');
  gEl.innerHTML = GAUGES.map(([k, n, lo, hi]) => `<div class="gauge" data-k="${k}"><span class="g-n">${n}</span>
    <span class="g-bar"><i class="g-mid"></i><b class="g-fill"></b><b class="g-dot"></b></span><span class="g-v"></span>
    <span class="g-ends"><em>${lo}</em><em>${hi}</em></span></div>`).join('');
  function drawGauges() {
    for (const [k] of GAUGES) {
      const g = gEl.querySelector(`[data-k="${k}"]`), x = RES[k];
      const p = 50 + x * 50;
      g.querySelector('.g-dot').style.left = p + '%';
      const f = g.querySelector('.g-fill');
      f.style.left = Math.min(50, p) + '%'; f.style.width = Math.abs(p - 50) + '%';
      const bad = k === 'speed' ? x < -0.12 : Math.abs(x) > 0.25;
      g.classList.toggle('bad', bad);
      g.classList.toggle('ok', Math.abs(x) < 0.06);
      g.querySelector('.g-v').textContent = Math.abs(x) < 0.06 ? 'hedefte' : k === 'speed' ? 'kayıp' : x > 0 ? 'artıyor' : 'azalıyor';
    }
    // arkadan görünüş: yatma
    const svg = $('heelView'); svg.innerHTML = '';
    el('path', { d: 'M0,52 Q20,49 40,52 T80,52 L80,70 L0,70 Z', fill: '#0c3b5e' }, svg);
    const g = el('g', { transform: `rotate(${RES.heelDeg.toFixed(1)} 40 50)` }, svg);
    el('path', { d: 'M24,44 L56,44 L52,55 L28,55 Z', fill: '#e2e8f0', stroke: '#0b1724', 'stroke-width': 1 }, g);
    el('line', { x1: 40, y1: 44, x2: 40, y2: 6, stroke: '#94a3b8', 'stroke-width': 2 }, g);
    el('path', { d: 'M41,8 Q52,24 41,42 Z', fill: '#f8fafc', opacity: .85 }, g);
    el('line', { x1: 40, y1: 55, x2: 40, y2: 66, stroke: '#cbd5e1', 'stroke-width': 2.4 }, g);
    const t = el('text', { x: 78, y: 12, 'text-anchor': 'end', class: 'heel-lbl' + (Math.abs(RES.heel) > 0.25 ? ' bad' : '') }, svg);
    t.textContent = `≈${Math.round(RES.heelDeg)}°`;
  }

  // Tipik hatalar: dokununca ayar o hataya kayar, "Düzelt" kılavuz ayarına döndürür (kaydedilmez)
  const MISTAKES = {
    hafif: [
      ['Her şey sıkı', v => { v.vang = 0.8; v.out = 0.9; v.sprit = 0.66; v.ties = v.ties.map(() => 1); }],
      ['Palanga sıkı', v => { v.vang = 0.85; }],
      ['Bağlar düz, kavis yok', v => { const m = (v.ties[0] + v.ties[3]) / 2; v.ties = v.ties.map(() => Math.round(m * 2) / 2); }],
      ['Gırcala fazla sıkı', v => { v.sprit = 0.78; }],
    ],
    orta: [
      ['Köşe çok gevşek', v => { v.out = 0.2; }],
      ['Gırcala gevşek', v => { v.sprit = 0.3; }],
      ['Palanga boş', v => { v.vang = 0.1; }],
      ['Direk çok geride', v => { v.rake -= 4; }],
    ],
    sert: [
      ['Palanga boş', v => { v.vang = 0.15; }],
      ['Köşe gevşek', v => { v.out = 0.3; }],
      ['Bağlar hafif hava ayarında', v => { v.ties = [5, 4, 3, 2, 2, 3, 4, 5]; }],
      ['Direk çok dik', v => { v.rake += 5; }],
    ],
  };
  const SEA_MISTAKE = ['Dalgada fazla düz', v => { v.out = 0.97; v.vang = 0.9; v.ties = v.ties.map((x, i) => (i === 0 || i === NTIES - 1) ? 0 : x + 1); }];
  function drawMistakes() {
    const list = MISTAKES[st.wind].concat(st.sea === 'dalgali' ? [SEA_MISTAKE] : []);
    $('mistakes').innerHTML = list.map(([n], i) => `<button data-i="${i}" class="${st.trial === n ? 'on' : ''}">${esc(n)}</button>`).join('');
    const b = $('trialBar');
    b.hidden = !st.trial;
    $('trialName').textContent = st.trial ? `Hata: ${st.trial}` : '';
  }
  $('mistakes').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const list = MISTAKES[st.wind].concat(st.sea === 'dalgali' ? [SEA_MISTAKE] : []);
    const [n, f] = list[Number(b.dataset.i)];
    const v = copy(original(st.brand, st.wind, st.sea).v);
    f(v); v.rake = clamp(v.rake, 274, 288);
    st.trial = n; st.target = v; st.active = null;
    drawMistakes();
  });
  $('btnFix').addEventListener('click', () => { st.trial = null; st.target = copy(original(st.brand, st.wind, st.sea).v); drawMistakes(); });

  // ---------- uyarılar ----------
  function warnings(v, sh) {
    // Kılavuzun istediği bir görüntüyse (ör. hafif havada bilerek gevşek) mavi bilgi, değilse kırmızı uyarı
    const o = original(st.brand, st.wind, st.sea).v;
    const asGuide = k => k !== 'x' && Math.abs(v[k] - o[k]) < 0.03;
    const out = [];
    if (v.sprit < 0.42) out.push(['sprit', 'Gırcala gevşek: direk tepesinden köşeye kırışık.']);
    if (v.sprit > 0.62) out.push(['sprit', 'Gırcala fazla sıkı: tepeden karulaya kırışık.']);
    if (v.luff < 0.35) out.push(['luff', 'Orsa yakası gevşek: bağlarda yatay kırışıklar.']);
    if (sh.lift > 4) out.push(['vang', 'Sert havada palanga gevşek: bumba kalkıyor, üst kısım fazla açık.']);
    if (st.wind === 'hafif' && v.vang > 0.55) out.push(['vang', 'Hafif havada palanga sıkı: yelken düzleşir, güç azalır.']);
    if (st.wind === 'sert' && v.out < 0.45) out.push(['out', 'Sert havada köşe gevşek: alt kısım derin, tekne fazla yatar.']);
    // kılavuza göre sapma: ne olur, ne yapmalı
    const W = st.wind;
    if (RES.dm > 2) out.push(['x', `Yelken hedeften torlu (orta kesit %${Math.round(sh.depth[1])}, hedef %${Math.round(RES.tm)}): ` +
      (W === 'sert' ? 'güç fazla, tekne yatar, dümen ağırlaşır. Köşeyi sık, orta bağları aç.' : 'orsa açısı düşer. Köşeyi biraz sık ya da orta bağları aç.')]);
    if (RES.dm < -2) out.push(['x', `Yelken hedeften düz (orta kesit %${Math.round(sh.depth[1])}, hedef %${Math.round(RES.tm)}): ` +
      (W === 'hafif' || st.sea === 'dalgali' ? 'güç az, tekne yavaşlar ve dalgada durur. Köşeyi aç, orta bağları yaklaştır.' : 'güç azalır. Köşeyi biraz aç.')]);
    if (RES.dt < -2.5) out.push(['x', 'Üst kısım fazla kapalı: üstteki arka yaka şeridi dönüyor, tekne boğulur. Palangayı ya da iskotayı biraz bırak.']);
    if (RES.dt > 4) out.push(['x', 'Üst kısım fazla açık: şeritler dümdüz çırpıyor, güç kaçıyor. Palangayı sık.']);
    if (RES.dr > 1.5) out.push(['x', `Direk hedeften ${fmt(RES.dr)} cm dik: dümen hafifler, orsa açısı kaybolur.`]);
    if (RES.dr < -1.5) out.push(['x', `Direk hedeften ${fmt(-RES.dr)} cm geride: dümen ağırlaşır, tekne orsaya çeker.`]);
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
    results(st.val, sh, windNow, waveNow);
    const ov = original(st.brand, st.wind, st.sea).v;
    const differs = st.mode === 'ozel' && !!st.custom[ckey()] && JSON.stringify(ov) !== JSON.stringify(st.custom[ckey()]);
    const gsh = differs ? shape(ov, windNow, waveNow) : null;
    drawEnv(dt, windNow, waveNow, time);
    gHull.setAttribute('transform', `rotate(${pitch.toFixed(2)} ${STEP.x} ${STEP.y}) translate(0 ${bob.toFixed(2)})`);
    const k = drawRig(st.val, sh, pitch, differs ? ov : null, gsh);
    drawCallouts(k);
    $('legend').hidden = !differs;
    const key = JSON.stringify(st.val) + st.active + st.wind + st.sea + st.focusTie + differs + Math.round(windNow * 50) + Math.round(waveNow * 50);
    if (key !== lastKey) { drawSections(sh, gsh); drawTiesZoom(st.val, differs ? ov : null); warnings(st.val, sh); fullness(sh); drawGauges(); lastKey = key; }
    requestAnimationFrame(frame);
  }

  drawHull();
  drawPlan();
  drawMistakes();
  for (const b of document.querySelectorAll('.sec-tabs button')) b.addEventListener('click', () => {
    for (const x of document.querySelectorAll('.sec-tabs button')) x.classList.toggle('on', x === b);
    $('sections').toggleAttribute('hidden', b.dataset.t !== 'kesit'); $('plan').toggleAttribute('hidden', b.dataset.t !== 'plan');
  });
  if (window.VeloraAuth && window.VeloraAuth.getDoc) Cloud.start(); else document.addEventListener('velora-ready', () => Cloud.start(), { once: true });
  syncTop();
  Cloud.show();
  st.val = copy(current());
  refresh();
  if (window.SailReport && window.SailReport.source) window.SailReport.source('ayar', () => ({ ozet: `${st.brand} ${st.wind}/${st.sea} ${st.mode}`, brand: st.brand, wind: st.wind, sea: st.sea, mode: st.mode, val: st.val }));
  requestAnimationFrame(frame);
})();
