// Ziyaret kayıtları sayfası (yalnız sahip). Veri: SailTrack.all() (bu tarayıcı) + içe aktarılan dosyalar.
(function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TYPES = {
    visit: 'Ziyaret başladı', page: 'Sayfa açtı', leave: 'Ayrıldı', scenario: 'Senaryo açtı', click: 'Düğmeye bastı',
    race_start: 'Yarış başlattı', race_end: 'Yarış bitti', race_save: 'Yarışı kaydetti', drive: 'Elle sürdü',
    gate: 'Giriş seçimi', signup: 'Kaydoldu', owner: 'Sahip girişi', consent: 'İzin', locked: 'Kilitli bölüme denedi', logout: 'Çıkış yaptı',
  };
  const ROLE = { sahip: 'Sahip', kayitli: 'Kayıtlı', misafir: 'Misafir', yeni: 'Yeni' };
  const fmt = ts => new Date(ts).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const ago = ts => { const s = (Date.now() - ts) / 1000; return s < 60 ? 'az önce' : s < 3600 ? `${Math.round(s / 60)} dk önce` : s < 86400 ? `${Math.round(s / 3600)} sa önce` : `${Math.round(s / 86400)} gün önce`; };
  const short = v => (v || '').slice(0, 6);

  let whoFilter = null, shown = 150;

  function events() {
    let ev = SailTrack.all();
    if ($('visHideOwner').checked) ev = ev.filter(e => e.role !== 'sahip');
    return ev;
  }
  function count(list, key) {
    const m = new Map(); for (const x of list) { const k = key(x); if (k) m.set(k, (m.get(k) || 0) + 1); }
    return [...m].sort((a, b) => b[1] - a[1]);
  }
  function rank(id, rows, empty) {
    const max = rows.length ? rows[0][1] : 1;
    $(id).innerHTML = rows.length ? rows.slice(0, 8).map(([k, n]) =>
      `<li><span class="rk-name">${esc(k)}</span><span class="rk-bar" style="--w:${Math.round(100 * n / max)}%"></span><b>${n}</b></li>`).join('')
      : `<li class="vis-empty">${empty}</li>`;
  }

  function people(ev) {
    const by = new Map();
    for (const e of ev) {
      let p = by.get(e.vid);
      if (!p) by.set(e.vid, p = { vid: e.vid, first: e.ts, last: e.ts, n: 0, sessions: new Set(), role: e.role, name: '', ctx: null, scn: new Set(), sec: 0 });
      p.n++; p.first = Math.min(p.first, e.ts); p.last = Math.max(p.last, e.ts); p.sessions.add(e.sid);
      if (e.ts >= p.last) p.role = e.role;
      if (e.type === 'signup' && e.data) p.name = e.data.name + (e.data.kind ? ` · ${e.data.kind}` : '') + (e.data.club ? ` · ${e.data.club}` : '');
      if (e.type === 'visit' && e.data) p.ctx = e.data;
      if (e.type === 'scenario' && e.data) p.scn.add(e.data.id);
      if (e.type === 'leave' && e.data) p.sec += e.data.sec || 0;
    }
    return [...by.values()].sort((a, b) => b.last - a.last);
  }

  const dur = s => s < 60 ? `${s} sn` : s < 3600 ? `${Math.round(s / 60)} dk` : `${(s / 3600).toFixed(1)} sa`;
  function describe(e) {
    const d = e.data || {};
    switch (e.type) {
      case 'visit': return `${d.device || ''} · ${d.os || ''} · ${d.browser || ''} · ${d.from || ''}${d.utm_source ? ' (' + d.utm_source + ')' : ''} · ${d.lang || ''} · ${d.tz || ''}`;
      case 'page': return d.title || '';
      case 'leave': return `${dur(d.sec || 0)} kaldı`;
      case 'scenario': return d.title || d.id;
      case 'click': return d.label ? `${d.label} (${d.id})` : d.id;
      case 'race_start': return `${d.boats} tekne · ${d.cls || ''}${d.gusts ? ` · ${d.gusts} sağanak` : ''}`;
      case 'race_end': return `${d.boats} tekne · ${d.cls || ''} ${d.windKn || ''} kn${d.mine ? ` · kendi teknesi ${d.mine}.` : ''}${d.winner ? ` · kazanan ${d.winner}` : ''}`;
      case 'race_save': return d.name || '';
      case 'gate': return d.choice || '';
      case 'signup': return [d.name, d.kind, d.club, d.email].filter(Boolean).join(' · ');
      case 'owner': return d.ok ? 'başarılı' : 'yanlış anahtar';
      case 'consent': return d.ok ? 'kayda izin verdi' : 'kaydı kapattı';
      case 'locked': return (SailAccess.FEATURES[d.feature] || {}).name || d.feature || '';
      default: return Object.keys(d).length ? JSON.stringify(d).slice(0, 120) : '';
    }
  }

  function render() {
    const all = events();
    const visits = all.filter(e => e.type === 'visit');
    const vids = new Set(all.map(e => e.vid));
    const signed = new Set(all.filter(e => e.type === 'signup').map(e => e.vid));
    const secs = all.filter(e => e.type === 'leave').map(e => (e.data && e.data.sec) || 0);
    const avg = visits.length ? Math.round(secs.reduce((a, b) => a + b, 0) / visits.length) : 0;
    const stat = (n, l) => `<div class="vis-stat"><b>${n}</b><span>${l}</span></div>`;
    $('visStats').innerHTML = stat(visits.length, 'ziyaret') + stat(vids.size, 'tekil ziyaretçi') + stat(signed.size, 'kaydolan') +
      stat(all.filter(e => e.type === 'scenario').length, 'senaryo açılışı') + stat(all.filter(e => e.type === 'race_start').length, 'simülatör yarışı') +
      stat(dur(avg), 'ziyaret başına ort. süre');

    rank('visTopScn', count(all.filter(e => e.type === 'scenario'), e => e.data && e.data.title), 'Henüz yok');
    rank('visFrom', count(visits, e => e.data && (e.data.utm_source || e.data.from)), 'Henüz yok');
    rank('visDev', count(visits, e => e.data && `${e.data.device} · ${e.data.browser}`), 'Henüz yok');
    rank('visClicks', count(all.filter(e => e.type === 'click'), e => e.data && (e.data.label || e.data.id)), 'Henüz yok');

    const ps = people(all);
    $('visPeople').innerHTML = `<thead><tr><th>Ziyaretçi</th><th>Rol</th><th>Cihaz</th><th>Nereden</th><th>Ziyaret</th><th>Senaryo</th><th>Süre</th><th>Son görülme</th></tr></thead><tbody>` +
      (ps.length ? ps.map(p => `<tr data-vid="${esc(p.vid)}" class="${p.vid === whoFilter ? 'on' : ''}${p.vid === SailTrack.vid ? ' me' : ''}">
        <td><b>${esc(p.name || '#' + short(p.vid))}</b>${p.vid === SailTrack.vid ? ' <small>(bu cihaz)</small>' : ''}</td>
        <td><span class="acc-role" data-role="${esc(p.role)}">${ROLE[p.role] || esc(p.role)}</span></td>
        <td>${esc(p.ctx ? `${p.ctx.device} · ${p.ctx.os} · ${p.ctx.browser}` : '')}</td>
        <td>${esc(p.ctx ? p.ctx.utm_source || p.ctx.from : '')}</td>
        <td>${p.sessions.size}</td><td>${p.scn.size}</td><td>${dur(p.sec)}</td>
        <td title="${esc(fmt(p.first))} ilk">${esc(ago(p.last))}</td></tr>`).join('')
        : '<tr><td colspan="8" class="vis-empty">Kayıt yok.</td></tr>') + '</tbody>';
    $('visPeople').querySelectorAll('tr[data-vid]').forEach(tr => tr.onclick = () => {
      whoFilter = whoFilter === tr.dataset.vid ? null : tr.dataset.vid; shown = 150; render();
    });

    // olay listesi
    const sel = $('visType');
    if (sel.options.length === 1) for (const [k, v] of Object.entries(TYPES)) sel.add(new Option(v, k));
    const q = $('visSearch').value.trim().toLocaleLowerCase('tr');
    let ev = all;
    if (whoFilter) ev = ev.filter(e => e.vid === whoFilter);
    if (sel.value) ev = ev.filter(e => e.type === sel.value);
    if (q) ev = ev.filter(e => (describe(e) + ' ' + (TYPES[e.type] || '') + ' ' + e.page).toLocaleLowerCase('tr').includes(q));
    ev = ev.slice().sort((a, b) => b.ts - a.ts);
    const wp = whoFilter && ps.find(p => p.vid === whoFilter);
    $('visWhoClear').classList.toggle('hidden', !whoFilter);
    $('visWhoClear').textContent = wp ? `× ${wp.name || '#' + short(wp.vid)}` : '';
    $('visEvCount').textContent = `${ev.length} olay`;
    $('visEvents').innerHTML = ev.slice(0, shown).map(e => `<li class="ev-${esc(e.type)}">
      <time>${esc(fmt(e.ts))}</time><span class="ev-type">${esc(TYPES[e.type] || e.type)}</span>
      <span class="ev-desc">${esc(describe(e))}</span><span class="ev-who">#${esc(short(e.vid))} · ${esc(ROLE[e.role] || e.role)} · ${esc(e.page)}</span></li>`).join('')
      || '<li class="vis-empty">Olay yok.</li>';
    $('visMore').classList.toggle('hidden', ev.length <= shown);
  }

  function download(name, text, type) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const stamp = () => new Date().toISOString().slice(0, 10);
  $('visJson').onclick = () => download(`ziyaretler-${stamp()}.json`, JSON.stringify({ app: 'professional-sailing', kind: 'visits', v: 1, events: SailTrack.all() }, null, 1), 'application/json');
  $('visCsv').onclick = () => {
    const cols = ['t', 'type', 'page', 'vid', 'sid', 'role', 'uid', 'desc', 'data'];
    const q = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const rows = SailTrack.all().map(e => cols.map(c => q(c === 'desc' ? describe(e) : c === 'data' ? JSON.stringify(e.data || {}) : e[c])).join(','));
    download(`ziyaretler-${stamp()}.csv`, '﻿' + cols.join(',') + '\n' + rows.join('\n'), 'text/csv');
  };
  $('visFile').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      const n = SailTrack.importEvents(Array.isArray(j) ? j : j.events || []);
      alertNote(`${n} yeni olay eklendi.`); render();
    } catch (err) { alertNote('Dosya okunamadı.'); }
  };
  let clearArm = 0;
  $('visClear').onclick = () => {
    if (Date.now() - clearArm > 3000) { clearArm = Date.now(); $('visClear').textContent = 'Emin misin? Tekrar bas'; setTimeout(() => { $('visClear').textContent = 'Temizle'; }, 3000); return; }
    SailTrack.clear(); clearArm = 0; $('visClear').textContent = 'Temizle'; render();
  };
  function alertNote(msg) { const n = document.querySelector('.vis-note'); const d = document.createElement('div'); d.className = 'vis-flash'; d.textContent = msg; n.after(d); setTimeout(() => d.remove(), 3000); }
  $('visHideOwner').onchange = render;
  $('visType').onchange = () => { shown = 150; render(); };
  $('visSearch').oninput = () => { shown = 150; render(); };
  $('visWhoClear').onclick = () => { whoFilter = null; render(); };
  $('visMore').onclick = () => { shown += 300; render(); };
  $('visOwner').onclick = () => SailAccess.open('owner');

  function gateView() {
    const ok = SailAccess.can('visits');
    $('visLocked').classList.toggle('hidden', ok);
    $('visBody').classList.toggle('hidden', !ok);
    if (ok) render();
  }
  document.addEventListener('sail-access', gateView);
  addEventListener('storage', e => { if (e.key === 'ps.track.v1' && SailAccess.can('visits')) render(); });
  gateView();
})();
