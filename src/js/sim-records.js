/* Yarış simülatörü – yarış kaydı: yarış boyunca kurulum + yapılan değişiklikler (işlemler) tutulur,
   bitince kullanıcıya sorulur, bu cihazda (localStorage) saklanır; dosya olarak dışa / içe aktarılır.
   Kayıt kareleri değil "tarifi" saklar: kurulum + hangi karede hangi işlem. Hesap deterministik olduğu için
   tekrar oynatınca yarış birebir aynı çıkar (bir kayıt birkaç KB). İleride Firebase'e aynı biçimle taşınır. */
(function (global) {
  const KEY = 'ps.sim.races.v1', APP = 'professional-sailing', KIND = 'sim-race', VER = 1;
  const jcopy = o => JSON.parse(JSON.stringify(o));

  // Yarış başında boş bir kayıt tamponu
  function begin(setup) { return { setup, ops: [], rev: 0, savedRev: -1, asked: -1, savedId: null, name: '' }; }
  // i. karede bir işlem yapıldı: o kareden sonraki eski işlemler geçersiz (yarış o andan yeniden hesaplandı)
  function note(rec, i, op) {
    if (!rec) return;
    rec.ops = rec.ops.filter(o => o.i <= i);
    rec.ops.push({ ...jcopy(op), i });
    rec.rev++;
  }
  const dirty = rec => !!rec && rec.rev !== rec.savedRev;

  function list() {
    try { const a = JSON.parse(global.localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a.filter(valid) : []; }
    catch (e) { return []; }
  }
  function write(a) { global.localStorage.setItem(KEY, JSON.stringify(a)); }   // dolarsa hata fırlatır
  function put(entry) {
    const a = list(), i = a.findIndex(x => x.id === entry.id);
    if (i >= 0) a[i] = entry; else a.unshift(entry);
    write(a);
  }
  function remove(id) { write(list().filter(x => x.id !== id)); }
  function get(id) { return list().find(x => x.id === id) || null; }
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  function valid(e) {
    return !!e && typeof e === 'object' && e.setup && Array.isArray(e.setup.fleet) && e.setup.fleet.length >= 2 &&
      Array.isArray(e.ops) && e.ops.every(o => o && typeof o.k === 'string' && Number.isFinite(o.i));
  }

  // Dosya: tek yarış ya da birden çok yarış
  function toFile(entries) {
    const arr = Array.isArray(entries) ? entries : [entries];
    return JSON.stringify({ app: APP, kind: KIND, v: VER, exportedAt: new Date().toISOString(), races: arr }, null, 1);
  }
  function fromFile(text) {
    let d; try { d = JSON.parse(text); } catch (e) { return []; }
    const arr = Array.isArray(d) ? d : d && Array.isArray(d.races) ? d.races : d && d.setup ? [d] : [];
    return arr.filter(valid).map(e => ({ ...e, id: e.id || newId(), name: String(e.name || 'İçe aktarılan yarış').slice(0, 60) }));
  }
  function fileName(e) {
    const tr = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };
    const slug = String(e.name || 'yaris').toLowerCase().replace(/[çğıöşü]/g, c => tr[c]).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'yaris';
    return `yaris-${(e.savedAt || new Date().toISOString()).slice(0, 10)}-${slug}.json`;
  }

  global.SailRecords = { KEY, begin, note, dirty, list, put, remove, get, newId, valid, toFile, fromFile, fileName, jcopy };
})(typeof window !== 'undefined' ? window : globalThis);
