// Velora hesabıyla giriş (VeloraAuth). Velora (seyhunDev/sesliasistan) ile aynı Firebase projesi: sesliasistan-3e95a.
//
// 1) Velora'dan gelen: Velora'daki "Velora Sailing" kartı sunucudan 1 saatlik giriş anahtarı (custom token) alır ve bu
//    siteyi …/velora-sailing/#t=ANAHTAR ile açar. track.js anahtarı ilk iş adresten siler (kayıtlara girmez, window.__veloraToken);
//    burada signInWithCustomToken ile oturum açılır. Firebase oturumu bu sitede de saklanır: sonraki ziyaretlerde doğrudan açılır.
// 2) Doğrudan gelen: giriş ekranında "Velora hesabıyla gir" → Velora e-posta ve şifresi (signInWithEmailAndPassword).
// Rol: Velora'da işletmenin ana hesabı (users/{uid}: role owner, orgId = uid) → 'sahip', diğer Velora hesapları → 'kayitli'.
// Velora anahtarındaki `vs` bilgisi varsa o kullanılır, yoksa profil Firestore'dan okunur (kural: herkes kendi profilini okur).
//
// CONFIG.apiKey boşsa modül hiçbir şey yapmaz (Velora girişi görünmez, site eskisi gibi çalışır).
// Web ayarları gizli değildir (her web sitesinin kaynağında görünür); güvenlik Firebase kurallarındadır.
const CONFIG = {
  apiKey: 'AIzaSyDOiKPuOfTnfYTDNxv6ElknzECRwiQ5qx8',
  authDomain: 'sesliasistan-3e95a.firebaseapp.com',
  projectId: 'sesliasistan-3e95a',
  appId: '1:828345188662:web:b951d19cf1f647c14b3397',
};
const V = '10.14.1';
const CDN = `https://www.gstatic.com/firebasejs/${V}`;

const A = () => window.SailAccess;
const pending = window.__veloraToken || null;
window.__veloraToken = null;

async function start() {
  if (!CONFIG.apiKey) { if (pending) A()?.veloraFail('Velora girişi bu sitede henüz açılmadı.'); return; }
  const [{ initializeApp }, au, fs] = await Promise.all([
    import(`${CDN}/firebase-app.js`), import(`${CDN}/firebase-auth.js`), import(`${CDN}/firebase-firestore-lite.js`),
  ]);
  const app = initializeApp(CONFIG, 'velora');
  const auth = au.getAuth(app);
  auth.languageCode = 'tr';

  async function roleOf(user) {
    try {
      const t = await user.getIdTokenResult();
      if (t.claims.vs === 'sahip' || t.claims.vs === 'kayitli') return { role: t.claims.vs, name: t.claims.ad || '' };
    } catch (e) { /* yok */ }
    try {
      const d = (await fs.getDoc(fs.doc(fs.getFirestore(app), 'users', user.uid))).data() || {};
      const owner = (d.role || 'owner') === 'owner' && (d.orgId || user.uid) === user.uid;
      return { role: owner ? 'sahip' : 'kayitli', name: d.name || '' };
    } catch (e) { return { role: 'kayitli', name: '' }; }
  }
  async function adopt(user, how) {
    const { role, name } = await roleOf(user);
    const nm = name || user.displayName || (user.email ? user.email.split('@')[0] : 'Velora');
    A()?.veloraLogin({ uid: user.uid, name: nm, email: user.email || '', role }, how);
  }

  window.VeloraAuth = {
    async signIn(email, password) {
      try {
        const c = await au.signInWithEmailAndPassword(auth, email.trim(), password);
        await adopt(c.user, 'velora-şifre');
        return null;
      } catch (e) {
        const c = e && e.code || '';
        if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(c)) return 'E-posta ya da şifre yanlış.';
        if (/too-many-requests/.test(c)) return 'Çok fazla deneme. Biraz sonra tekrar dene.';
        if (/network/.test(c)) return 'Bağlantı yok. İnternetini kontrol et.';
        return 'Giriş yapılamadı. Tekrar dene.';
      }
    },
    signOut: () => au.signOut(auth).catch(() => {}),
  };
  document.dispatchEvent(new CustomEvent('velora-ready'));

  if (pending) {
    try {
      const c = await au.signInWithCustomToken(auth, pending);
      await adopt(c.user, 'velora');
    } catch (e) {
      A()?.veloraFail('Velora girişi tamamlanamadı (anahtarın süresi dolmuş olabilir). Velora e-posta ve şifrenle girebilirsin.');
    }
    return;
  }
  // Daha önce Velora ile girilmişse ve bu cihazdaki hesap başka biriyse (ya da hiç yoksa) Firebase oturumunu benimse
  const un = au.onAuthStateChanged(auth, user => {
    un();
    const acc = A()?.account();
    if (user && (!acc || (acc.via === 'velora' && acc.uid !== user.uid) || acc.role === 'misafir')) adopt(user, 'velora-oturum');
  });
}

start().catch(() => { if (pending) A()?.veloraFail('Velora girişi yüklenemedi. Bağlantını kontrol et.'); });
