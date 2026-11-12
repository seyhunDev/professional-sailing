# Professional Sailing – Çalışma Kuralları

Bu dosya her Claude Code oturumunda otomatik yüklenir. Proje birden çok sohbete bölünerek
yürütülür; sohbetler arasındaki ortak hafıza **`NOTLAR.md`** dosyasıdır.

## Oturum protokolü (zorunlu)
1. **Başlarken:** `NOTLAR.md` dosyasını oku. "Güncel durum", "Sıradaki işler" ve son 3 oturum
   günlüğü kaydını özetleyerek kullanıcıya 3-4 cümleyle "kaldığımız yer" bilgisi ver, sonra işe başla.
2. **Çalışırken:** Mimariyi, dosya düzenini veya senaryo formatını değiştiren bir karar verirsen
   `NOTLAR.md` → "Kararlar" bölümüne tarih ve gerekçeyle ekle. Başka bir sohbeti ilgilendiren
   bir şey öğrenirsen (kırılan bir şey, bekleyen soru, değişen format) "Sohbetler arası mesajlar"
   bölümüne yaz.
3. **Bitirirken:** `NOTLAR.md` dosyasında şunları güncelle ve commit'e dahil et:
   - "Güncel durum" (ne çalışıyor, ne yayında)
   - "Sıradaki işler" (biteni işaretle, yeni çıkanları ekle)
   - "Oturum günlüğü"na yeni kayıt: tarih, sohbetin konusu, yapılanlar, yarım kalanlar, sonraki sohbete not
4. **Senaryo bazlı sohbet:** kullanıcı "X kartını geliştir" derse `NOTLAR.md` → "Senaryo kartları" tablosundaki satırı oku, işi yap, satırı (durum / eksikler / fikirler) güncelle; bağlı senaryoları etkileyen bir değişiklikse "Sohbetler arası mesajlar"a yaz.
5. Kullanıcının karar vermesi gereken konuları "Açık sorular" bölümüne yaz; cevaplanınca "Kararlar"a taşı.

## Proje özeti
Genç yarış yelkencileri için etkileşimli taktik/kural animasyonları. Üstten görünüş, SVG, vanilla JS.
Canlı site: https://seyhundev.github.io/professional-sailing/ (main'e push → GitHub Actions → otomatik yayın).

## Teknik kurallar
- Dil: arayüz ve açıklamalar **Türkçe**; yelken terimleri yerleşik Türkçe (sancak/iskele kontra, orsa,
  pupa, tramola, kavança, bordalamak, hakem botu). Start hattının şamandıra ucu **"pin"**dir ("orsa şamandırası" DEĞİL; orsa şamandırası = parkurun rüzgarüstü şamandırası). İngilizce karşılığı ilk geçişte
  parantezle verilir (ör. "kapatma (header)").
- Yığın: HTML + CSS + vanilla JS, derleme adımı yalnızca `scripts/build.mjs` (hash'li dosya adları).
  Framework eklenmez (karar: NOTLAR.md → Kararlar). Bağımlılık eklemeden önce kullanıcıya sor.
- Kaynak `src/`, çıktı `dist/` (git'e girmez). `docs/` klasörü kullanılmaz.
- Koordinat alanı 1000×680, pusula: 0° ekranın üstü. Rüzgar `windFrom` = geldiği yön.
  TWA < 0 → sancak kontra. Tekne boyu 50 px, zone = 3 tekne boyu.
- Kategoriler sabit: **Kurallar / Taktik / Teknik** (`category`), alt konu `topic` (ör. Start, Rüzgar ve orsa, Şamandıra).
- Senaryo eklemek: `src/js/scenarios.js` içine `S.push({...})`. Format README'de. Yeni senaryo
  eklenince `KONULAR.md` tablosunda durum ✅ yapılır ve rota `node`'da simüle edilip ekran dışına
  çıkmadığı / teknelerin çakışmadığı kontrol edilir (bkz. NOTLAR.md → "Senaryo kontrol listesi").
- Her senaryo değişikliğinden sonra `npm run check` (sıfır uyarı) ve Playwright ekran görüntüsü (masaüstü 1400×800).
- Kullanıcının isteği farklı bir çalışma alanına giriyorsa (motor / senaryo içeriği / arayüz / yayın altyapısı) bunu söyle ve büyükse yeni sohbet öner; küçükse yap ve NOTLAR'a yaz.
- Commit mesajları Türkçe, kısa başlık + madde listesi. Doğrudan `main`'e push edilir.
- **Sürüm numarası (zorunlu):** her sayfanın sağ alt köşesinde `v1.N` görünür; N = `main`'deki commit sayısı, `scripts/build.mjs` otomatik hesaplar (elle artırma yok, çakışma olmaz). `main`'e her gönderimden sonra `git fetch origin main && git rev-list --count origin/main` ile yeni numarayı bul ve kullanıcıya cevabında "Sürüm v1.N" diye söyle; kullanıcı sitenin güncellenip güncellenmediğini bu numaradan anlar. (Yayın birkaç dakika sürer.)
- Eski depo `seyhunDev/python_deneme` kullanılmaz.

## Dosya haritası
- `src/index.html` arayüz · `src/css/style.css` · `src/js/engine.js` motor · `src/js/rules.js` kural motoru (ek tekneler) · `src/js/scenarios.js` senaryolar · `src/js/app.js` arayüz mantığı
- `src/js/track.js` ziyaret/olay kaydı · `src/js/access.js` giriş ekranı, roller, kilitler (her sayfada uygulama betiğinden önce) · `src/ziyaret.html` ziyaret kayıtları (sahip)
- `scripts/build.mjs` derleme · `.github/workflows/deploy.yml` yayın
- `KONULAR.md` müfredat ve durumları · `NOTLAR.md` sohbetler arası hafıza · `README.md` kullanım ve geliştirme
