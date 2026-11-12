// Giriş ara ekranı, roller ve erişim (SailAccess).
//
// ÖNEMLİ: Bu katman tamamen tarayıcıda çalışır, GERÇEK GÜVENLİK DEĞİLDİR. Kodu bilen biri kilitleri
// tarayıcı konsolundan açabilir. Amaç şimdilik ziyaretçiyi yönlendirmek ve kayıt toplamaktır.
// Gerçek kısıtlama Firebase Auth + Firestore güvenlik kurallarıyla gelecek; o zaman `signup`/`ownerLogin`
// Firebase çağrılarına bağlanır, rol sunucudan okunur, FEATURES tablosu aynen kalır.
//
// Roller: 'sahip' (sınırsız) · 'kayitli' (kaydolmuş) · 'misafir'. Hesap localStorage 'ps.account.v1'.
// Sahip girişi: anahtarın kendisi kodda YOK, yalnızca SHA-256 özeti var. Giriş ekranında "Sahip girişi"
// ya da adres çubuğunda ?sahip=ANAHTAR. Anahtar değişecekse OWNER_HASH yeniden hesaplanır:
//   node -e "console.log(require('crypto').createHash('sha256').update('ps-owner-v1:'+process.argv[1]).digest('hex'))" YENI-ANAHTAR
(function () {
  const ACC = 'ps.account.v1';
  const OWNER_HASH = '8be3211987e7c28a67b091e52e657e21ae03992b361fbd159f4e44599a2e1a06';
  const ROLE_NAMES = { sahip: 'Sahip', kayitli: 'Kayıtlı', misafir: 'Misafir' };

  // Hangi rol neye erişir. Değiştirmek için yalnız bu tabloyu düzenle.
  const FEATURES = {
    'scn.ileri':   { roles: ['sahip', 'kayitli'], name: 'İleri Taktik animasyonları' },
    'sim.drive':   { roles: ['sahip', 'kayitli'], name: 'Simülatörde tekneyi elle sürme' },
    'sim.records': { roles: ['sahip', 'kayitli'], name: 'Yarışı kaydetme ve kayıtlı yarışlar' },
    'visits':      { roles: ['sahip'],            name: 'Ziyaret kayıtları' },
  };

  const T = window.SailTrack || { log() {}, setWho() {}, consent: () => null, setConsent() {}, context: () => ({}), newSession: false };
  const get = () => { try { return JSON.parse(localStorage.getItem(ACC)) || null; } catch (e) { return null; } };
  const put = a => { try { a ? localStorage.setItem(ACC, JSON.stringify(a)) : localStorage.removeItem(ACC); } catch (e) { /* yok */ } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rid = () => (crypto.randomUUID ? crypto.randomUUID() : 'u' + Math.random().toString(36).slice(2) + Date.now().toString(36));

  let acc = get();
  const role = () => (acc && acc.role) || 'misafir';
  const can = f => { const x = FEATURES[f]; return !x || x.roles.includes(role()); };
  function syncWho() { T.setWho({ role: acc ? acc.role : null, uid: acc && acc.uid }); document.documentElement.dataset.role = role(); }
  syncWho();

  async function sha256(text) {
    if (!(crypto.subtle && crypto.subtle.digest)) return '';
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  async function isOwnerKey(key) { return !!key && (await sha256('ps-owner-v1:' + key.trim())) === OWNER_HASH; }

  function setAccount(a, how) {
    acc = a; put(a); syncWho(); chipUpdate();
    document.dispatchEvent(new CustomEvent('sail-access', { detail: { role: role(), how } }));
  }

  // ---------- giriş ekranı ----------
  const NOTICE_SHORT = 'Siteyi geliştirmek için ziyaretin kaydedilir: hangi sayfaları ve animasyonları açtığın, ' +
    'hangi düğmelere bastığın, ne zaman ve ne kadar kaldığın, cihaz/tarayıcı türü, dil ve geldiğin site. ' +
    'Kayıtlar şimdilik yalnızca bu tarayıcıda durur, kimseye gönderilmez.';
  const NOTICE_LONG = `
    <p><b>Veri sorumlusu:</b> Professional Sailing site sahibi.</p>
    <p><b>Toplanan veriler:</b> rastgele bir ziyaretçi kimliği (adın ya da IP adresin değil), açtığın sayfalar ve animasyonlar,
    simülatörde yaptığın işlemler (start, kayıt, elle sürme vb.), ziyaret zamanı ve süresi, cihaz türü, işletim sistemi, tarayıcı,
    dil, saat dilimi, ekran boyutu ve hangi siteden geldiğin. Kaydolursan verdiğin ad, e-posta, kulüp ve rol bilgisi.</p>
    <p><b>Amaç:</b> hangi konuların kullanıldığını görüp siteyi ve animasyonları geliştirmek. Reklam ya da satış için kullanılmaz,
    üçüncü kişilerle paylaşılmaz.</p>
    <p><b>Saklama yeri:</b> şimdilik yalnızca bu tarayıcının yerel belleği. İleride site sahibinin sunucusuna (Firebase) aktarılacaksa
    bu metin güncellenir ve sana yeniden sorulur.</p>
    <p><b>Hakların (KVKK md. 11):</b> verilerini görmek, düzeltmek ve silmek. Sağ üstteki hesap menüsünden
    <b>Gizlilik ve verilerim → Kayıtlarımı sil</b> ile hepsini silebilir, izni kapatabilirsin.</p>`;

  let gate = null, gateMode = 'home', lockedFeature = null;
  function el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }

  function buildGate() {
    gate = el(`<div class="gate hidden" role="dialog" aria-modal="true" aria-labelledby="gateTitle">
      <div class="gate-card">
        <div class="gate-brand"><span class="brand-mark"><svg viewBox="0 0 24 24"><path d="M12 2.5 L12 17 L4.5 17 Z" fill="currentColor"/><path d="M13.5 5 C17 8 18.5 12 18.5 17 L13.5 17 Z" fill="currentColor" opacity=".6"/><path d="M3 19 C 7 21.5 17 21.5 21 19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span>
          <div><div class="gate-name">Professional <em>Sailing</em></div><div class="gate-tag">Genç yarış yelkencileri için taktik ve kural animasyonları</div></div>
          <button class="icon gate-x" id="gateClose" title="Kapat" aria-label="Kapat"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
        </div>
        <div class="gate-body" id="gateBody"></div>
        <div class="gate-privacy">
          <label class="gate-consent"><input type="checkbox" id="gateConsent" checked><span>${esc(NOTICE_SHORT)}
            <button type="button" class="gate-link" id="gateMore">Aydınlatma metni</button></span></label>
          <div class="gate-notice hidden" id="gateNotice">${NOTICE_LONG}</div>
        </div>
      </div></div>`);
    document.body.appendChild(gate);
    gate.querySelector('#gateMore').onclick = e => { e.preventDefault(); gate.querySelector('#gateNotice').classList.toggle('hidden'); };
    gate.querySelector('#gateClose').onclick = () => closeGate('kapat');
    gate.addEventListener('keydown', e => { if (e.key === 'Escape' && acc) closeGate('esc'); });
  }

  function renderGate() {
    const body = gate.querySelector('#gateBody');
    gate.querySelector('#gateClose').style.display = acc ? '' : 'none';   // ilk girişte seçim zorunlu
    const f = lockedFeature && FEATURES[lockedFeature];
    if (gateMode === 'home' || gateMode === 'locked') {
      body.innerHTML = `
        ${f ? `<div class="gate-locked"><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2"/></svg>
          <div><b>${esc(f.name)}</b> kayıtlı kullanıcılar için. Kaydolmak ücretsiz, bir dakika sürer.</div></div>`
          : '<h2 id="gateTitle">Hoş geldin</h2><p class="gate-sub">Nasıl devam etmek istersin?</p>'}
        <div class="gate-choices">
          <button class="gate-choice primary" id="gateSignup"><b>Kaydol</b><small>Tüm animasyonlar, simülatörde elle sürme, yarış kaydı · ücretsiz</small></button>
          ${f ? '<button class="gate-choice" id="gateBack"><b>Vazgeç</b><small>Misafir olarak devam et</small></button>'
              : '<button class="gate-choice" id="gateGuest"><b>Misafir olarak devam et</b><small>Temel animasyonlar ve simülatör</small></button>'}
        </div>
        <button class="gate-link gate-owner" id="gateOwner">Site sahibi girişi</button>`;
      const g = body.querySelector('#gateGuest'); if (g) g.onclick = () => chooseGuest();
      const b = body.querySelector('#gateBack'); if (b) b.onclick = () => { T.log('locked', { feature: lockedFeature, answer: 'vazgeç' }); closeGate('vazgeç'); };
      body.querySelector('#gateSignup').onclick = () => { gateMode = 'signup'; renderGate(); };
      body.querySelector('#gateOwner').onclick = () => { gateMode = 'owner'; renderGate(); };
    } else if (gateMode === 'signup') {
      body.innerHTML = `
        <h2 id="gateTitle">Kaydol</h2>
        <p class="gate-sub">Şimdilik hesabın bu cihazda tutulur; çevrimiçi hesaplar geldiğinde aynı bilgilerle taşınır.</p>
        <form class="gate-form" id="gateForm" novalidate>
          <label>Ad soyad<input id="gfName" autocomplete="name" required maxlength="60" placeholder="Ör. Deniz Yılmaz"></label>
          <label>E-posta <small>(isteğe bağlı)</small><input id="gfMail" type="email" autocomplete="email" maxlength="80" placeholder="ornek@eposta.com"></label>
          <div class="gate-row">
            <label>Ben bir<select id="gfKind"><option>Sporcu</option><option>Antrenör</option><option>Veli</option><option>Diğer</option></select></label>
            <label>Kulüp <small>(isteğe bağlı)</small><input id="gfClub" maxlength="60" placeholder="Kulübün"></label>
          </div>
          <div class="gate-err" id="gfErr"></div>
          <div class="gate-actions"><button type="button" class="tb" id="gfBack">Geri</button><button class="tb primary" id="gfGo">Kaydol ve devam et</button></div>
        </form>`;
      body.querySelector('#gfBack').onclick = () => { gateMode = lockedFeature ? 'locked' : 'home'; renderGate(); };
      body.querySelector('#gateForm').onsubmit = e => { e.preventDefault(); doSignup(); };
      setTimeout(() => body.querySelector('#gfName').focus(), 30);
    } else if (gateMode === 'owner') {
      body.innerHTML = `
        <h2 id="gateTitle">Site sahibi girişi</h2>
        <p class="gate-sub">Sahip anahtarını gir. Bu cihaz bundan sonra sınırsız erişimle açılır.</p>
        <form class="gate-form" id="gateOwnerForm">
          <label>Sahip anahtarı<input id="goKey" type="password" autocomplete="current-password" required></label>
          <div class="gate-err" id="goErr"></div>
          <div class="gate-actions"><button type="button" class="tb" id="goBack">Geri</button><button class="tb primary" id="goGo">Giriş</button></div>
        </form>`;
      body.querySelector('#goBack').onclick = () => { gateMode = lockedFeature ? 'locked' : 'home'; renderGate(); };
      body.querySelector('#gateOwnerForm').onsubmit = async e => {
        e.preventDefault();
        const ok = await ownerLogin(body.querySelector('#goKey').value);
        if (!ok) { body.querySelector('#goErr').textContent = 'Anahtar doğru değil.'; T.log('owner', { ok: false }); }
      };
      setTimeout(() => body.querySelector('#goKey').focus(), 30);
    }
  }

  function applyConsent() {
    const c = gate ? gate.querySelector('#gateConsent').checked : T.consent() !== false;
    if (T.consent() !== c) { T.setConsent(c); T.log('consent', { ok: c }); }
  }
  function openGate(mode, feature) {
    if (!gate) buildGate();
    gateMode = mode || 'home'; lockedFeature = feature || null;
    const c = T.consent(); gate.querySelector('#gateConsent').checked = c !== false;
    renderGate(); gate.classList.remove('hidden'); document.documentElement.classList.add('gate-open');
  }
  function closeGate(how) {
    if (!gate) return;
    applyConsent();
    gate.classList.add('hidden'); document.documentElement.classList.remove('gate-open');
    if (!acc && how) chooseGuest();
  }
  function chooseGuest() {
    applyConsent();
    setAccount({ role: 'misafir', uid: null, since: new Date().toISOString() }, 'misafir');
    T.log('gate', { choice: 'misafir' });
    gate.classList.add('hidden'); document.documentElement.classList.remove('gate-open');
  }
  function doSignup() {
    const v = id => gate.querySelector(id).value.trim();
    const name = v('#gfName'), email = v('#gfMail'), kind = v('#gfKind'), club = v('#gfClub');
    const err = gate.querySelector('#gfErr');
    if (name.length < 2) { err.textContent = 'Adını yaz.'; return; }
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = 'E-posta adresi geçerli görünmüyor.'; return; }
    applyConsent();
    const prev = acc;
    setAccount({ role: prev && prev.role === 'sahip' ? 'sahip' : 'kayitli', uid: rid(), name, email, kind, club, since: new Date().toISOString() }, 'kayıt');
    T.log('signup', { name, email, kind, club, from: lockedFeature || 'giriş' });
    gate.classList.add('hidden'); document.documentElement.classList.remove('gate-open');
    toast(`Hoş geldin ${name.split(' ')[0]}! Tüm bölümler açık.`);
  }
  async function ownerLogin(key) {
    if (!(await isOwnerKey(key))) return false;
    applyConsent();
    const prev = acc || {};
    setAccount({ ...prev, role: 'sahip', uid: prev.uid || rid(), name: prev.name || 'Site sahibi', since: prev.since || new Date().toISOString() }, 'sahip');
    T.log('owner', { ok: true });
    if (gate) { gate.classList.add('hidden'); document.documentElement.classList.remove('gate-open'); }
    toast('Sahip girişi yapıldı: her şey açık.');
    return true;
  }

  // ---------- hesap düğmesi ve menü (üst çubuk) ----------
  let chip = null, menu = null;
  function buildChip() {
    const bar = document.querySelector('.topbar .tool-group') || document.querySelector('.topbar');
    if (!bar) return;
    chip = el(`<button id="btnAccount" class="tool acc-chip" title="Hesap ve gizlilik" aria-haspopup="menu">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.6" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M4.8 19.5c1.3-3.4 4-5 7.2-5s5.9 1.6 7.2 5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>
      <span class="lbl" id="accLbl"></span></button>`);
    bar.insertBefore(chip, bar.firstChild);
    menu = el('<div class="acc-menu hidden" role="menu"></div>');
    document.body.appendChild(menu);
    chip.onclick = e => { e.stopPropagation(); toggleMenu(); };
    document.addEventListener('click', e => { if (!menu.contains(e.target)) menu.classList.add('hidden'); });
    chipUpdate();
  }
  function chipUpdate() {
    if (!chip) return;
    const r = role();
    chip.dataset.role = r;
    chip.querySelector('#accLbl').textContent = r === 'kayitli' && acc.name ? acc.name.split(' ')[0] : ROLE_NAMES[r];
  }
  function toggleMenu(force) {
    const open = force != null ? force : menu.classList.contains('hidden');
    if (!open) { menu.classList.add('hidden'); return; }
    const r = role(), c = T.consent();
    const b = chip.getBoundingClientRect();
    menu.style.top = (b.bottom + 6) + 'px';
    menu.style.right = Math.max(8, innerWidth - b.right) + 'px';
    menu.innerHTML = `
      <div class="acc-head"><span class="acc-role" data-role="${r}">${ROLE_NAMES[r]}</span>
        <div class="acc-who">${esc(acc && acc.name ? acc.name : r === 'misafir' ? 'Misafir ziyaretçi' : '')}</div>
        ${acc && acc.email ? `<div class="acc-mail">${esc(acc.email)}</div>` : ''}</div>
      ${r === 'misafir' ? '<button class="acc-item" data-a="signup">Kaydol <small>tüm bölümler açılır</small></button>' : ''}
      ${can('visits') ? '<a class="acc-item" href="ziyaret.html" data-a="visits">Ziyaret kayıtları</a>' : ''}
      <button class="acc-item" data-a="privacy">Gizlilik ve verilerim <small>${c === false ? 'kayıt kapalı' : 'kayıt açık'}</small></button>
      ${r !== 'misafir' ? '<button class="acc-item" data-a="logout">Çıkış yap</button>' : '<button class="acc-item" data-a="owner">Site sahibi girişi</button>'}`;
    menu.querySelectorAll('[data-a]').forEach(x => x.onclick = () => {
      const a = x.dataset.a; menu.classList.add('hidden');
      if (a === 'signup') openGate('signup');
      else if (a === 'owner') openGate('owner');
      else if (a === 'privacy') openPrivacy();
      else if (a === 'logout') { T.log('logout', {}); setAccount(null, 'çıkış'); openGate('home'); }
    });
    menu.classList.remove('hidden');
  }

  function openPrivacy() {
    const c = T.consent() !== false;
    const n = (window.SailTrack && SailTrack.all ? SailTrack.all().filter(e => e.vid === SailTrack.vid).length : 0);
    const d = el(`<div class="gate" role="dialog" aria-modal="true"><div class="gate-card">
      <div class="gate-brand"><div><div class="gate-name">Gizlilik ve verilerim</div><div class="gate-tag">Bu tarayıcıda senin hakkında ${n} kayıt var</div></div>
        <button class="icon gate-x" data-x title="Kapat" aria-label="Kapat"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>
      <div class="gate-body">
        <label class="switch"><input type="checkbox" id="pvOn" ${c ? 'checked' : ''}><span class="track"><span class="knob"></span></span><span class="sw-lbl">Kullanım kayıtlarına izin veriyorum</span></label>
        <div class="gate-notice">${NOTICE_LONG}</div>
        <div class="gate-actions"><button class="tb" id="pvDel">Kayıtlarımı sil</button><button class="tb primary" data-x>Tamam</button></div>
      </div></div></div>`);
    document.body.appendChild(d);
    const close = () => d.remove();
    d.querySelectorAll('[data-x]').forEach(x => x.onclick = close);
    d.addEventListener('click', e => { if (e.target === d) close(); });
    d.querySelector('#pvOn').onchange = e => { T.setConsent(e.target.checked); if (e.target.checked) T.log('consent', { ok: true }); };
    d.querySelector('#pvDel').onclick = () => {
      if (window.SailTrack) SailTrack.clear();
      d.querySelector('.gate-tag').textContent = 'Kayıtların silindi.';
    };
  }

  function toast(msg) {
    const t = el(`<div class="acc-toast">${esc(msg)}</div>`);
    document.body.appendChild(t); setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3100);
  }

  // Kilitli özelliği deneyince çağrılır: izin varsa true, yoksa giriş ekranını açar ve false döner.
  function guard(feature) {
    if (can(feature)) return true;
    T.log('locked', { feature });
    openGate('locked', feature);
    return false;
  }

  window.SailAccess = { FEATURES, role, can, guard, account: () => acc, open: openGate, ownerLogin, ROLE_NAMES };

  // ---------- açılış ----------
  if (T.newSession) T.log('visit', T.context());
  T.log('page', { title: document.title.slice(0, 80) });
  buildChip();
  // ?sahip=ANAHTAR: sahip girişi, sonra adresten temizle
  const q = new URLSearchParams(location.search);
  if (q.has('sahip')) {
    const key = q.get('sahip'); q.delete('sahip');
    history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
    ownerLogin(key).then(ok => { if (!ok && !acc) openGate('owner'); });
  } else if (!acc) openGate('home');
})();
