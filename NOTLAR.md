# NOTLAR – Sohbetler arası ortak hafıza

> Her sohbet başında okunur, sonunda güncellenir (protokol: `CLAUDE.md`).
> Kısa ve güncel tut: eskiyen maddeleri sil, tarih ver.

## Güncel durum (2026-11-12)
- Canlı: https://seyhundev.github.io/professional-sailing/ — main'e push ile otomatik yayın (GitHub Actions, hash'li dosya adları, sağ altta sürüm damgası).
- Hazır senaryolar (5): A1 line bias, A2 zamanlama/OCS, B1 Kural 10, C1 header'da tramola, B8 Kural 18.
- Arayüz: tam ekran sahne, üst çubuk (senaryo seçimi, Bilgi, Katmanlar, tam ekran), alt çubuk (oynat, hız, zaman çubuğu, tekne ekle/çıkar), sağda canlı takipli bilgi kartı.
- Motor: segment tabanlı rota üretici (closehauled / run / heading / hold), ivme modeli, rüzgar keyframe'leri, yelken/bumba geometrisi, boş yelken sallanması.
- Ek tekneler: kullanıcı ekler; `rules.js` tüm ek tekneleri birlikte simüle eder. Karşılaşmalarda RRS 10 (bordalama ya da yetmezse tramola), 11 (rüzgarüstü orsalar), 12 (arkadaki yavaşlar), 14 (hak sahibi de temas önler) uygulanır; manevra notu teknenin üstünde 2.5 s görünür. Scripted tekneler rotalarını değiştirmez (ders onlar).
- Kategoriler: Kurallar / Taktik / Teknik; KONULAR.md de bu üç bölüme ayrıldı (Teknik = G1-G7, Aşama 1 ile).

## Sıradaki işler (öncelik sırasıyla, her biri bir sohbete uygun)
- [ ] **Senaryo paketi 2:** B2 Kural 11 (rüzgaraltı/rüzgarüstü), C3 layline & overstand, E1 geniş gir – dar çık. (KONULAR.md'de 🔜 olanlar)
- [ ] **Senaryo paketi 3:** C2 kalıcı dönüş, A3 barging, B4 Kural 13 (tramola atarken), D2 pupada kavança.
- [ ] **Kural motoru iyileştirme:** Kural 13 (tramola atarken yol ver), Kural 18 (zone içinde şamandıra yeri), Kural 16 (rota değiştirirken yer ver), start öncesi bekleyen teknelerin çizgi üstünde dizilmesi; tekne eklerken konumu sürükleyerek seçme.
- [ ] **Görsel katmanlar:** rüzgar gölgesi (dirty air) konisi, layline çizgileri, tekne üstünde "hak sahibi / yol ver" rozetleri.
- [ ] **Mobil düzen:** dikey ekranda parkurun küçük kalması ve bilgi kartının sahneyi kapatması (şimdilik bilinçli ertelendi).
- [ ] **Paylaşılabilir durum:** URL'de senaryo + zaman + eklenen tekneler (ör. `#b1-rule10?t=5&boats=pin:port,middle:starboard`).
- [ ] **Dil:** TR/EN geçişi (önce metinleri ayrı dosyaya taşı).
- [ ] **Senaryo editörü (büyük iş, ayrı aşama):** tekneleri sürükle, segment ekle, rüzgar ayarla, JSON dışa aktar. Bu aşamada Vite+React+TS+Tailwind'e geçiş değerlendirilecek (bkz. Kararlar).
- [ ] **Kullanıcı senaryoları (sonraki aşama):** Firebase Auth + Firestore, link ile paylaşım, Firebase Hosting.

## Kararlar
- 2026-11-12 · **Yığın: vanilla HTML/SVG/JS.** Next.js/Tailwind şimdilik yok: motor framework'ten bağımsız, GitHub Pages statik, SSR gereksiz, SVG+rAF React'te gereksiz karmaşıklık. Editör aşamasında Vite+React yeniden değerlendirilecek. Firebase, Next.js gerektirmez.
- 2026-11-12 · **Yayın: GitHub Actions + hash'li derleme.** Sebep: Pages'in 10 dk önbelleği yeni HTML'i eski CSS/JS ile eşleştirdi. `scripts/build.mjs` dosya adına içerik özeti ekler.
- 2026-11-12 · **Yeni depo** `seyhunDev/professional-sailing`; eski `python_deneme` terk edildi.
- 2026-11-12 · **Aşama 1 (yeni öğrenenler) atlandı**, Aşama 2 (yarış hazırlığı) ile başlandı.
- 2026-11-12 · **Kural motoru ek teknelere uygulanır, scripted teknelere uygulanmaz.** Sebep: scripted tekneler dersin kendisi; ek tekneler "kalabalık" ve kuralların canlı gösterimi. Hak sahibi notu gösterilmez (kalabalıkta okunmuyor), yalnızca yol veren manevralar yazılır.
- 2026-11-12 · **Üç sabit kategori: Kurallar / Taktik / Teknik**, alt konu `topic` alanı ile.
- 2026-11-12 · **Bilgi kartı tek adım gösterir**, canlı takip açık/kapalı; kullanıcı Önceki/Sonraki ile gezince takip kapanır.

## Açık sorular (kullanıcıya)
- Hedef sınıf: Optimist mi, ILCA 4/6 mı, karışık mı? (Hız/dönüş oranları ve "tekne boyu" ölçeği buna göre ayarlanabilir.)
- Senaryolarda İngilizce terimlerin parantez içinde verilmesi devam etsin mi, yoksa yalnızca Türkçe mi?
- Antrenörler sahada tablet mi kullanacak? (Mobil düzenin önceliğini belirler.)

## Sohbetler arası mesajlar
- (boş) — Başka bir sohbeti ilgilendiren şeyleri buraya tarih ve konu ile yazın; ilgili sohbet okuyunca satırı siler.

## Senaryo kontrol listesi (her yeni senaryo için)
1. `node` ile rotayı simüle et: tekneler 1000×680 dışına çıkmasın, çakışmasın, şamandıraya 40 px'den fazla yaklaşmasın. (Örnek betik: engine + scenarios'u `require` edip `buildTrack` / `sampleTrack` ile her saniye konum yazdır.)
2. Adım zamanları (`steps[].t`) animasyondaki olaylarla eşleşsin.
3. `addBoat` konumları scripted teknelerle çakışmasın.
4. Playwright ekran görüntüsü (en az 2 kritik an).
5. `KONULAR.md` durumunu ✅ yap.

## Oturum günlüğü (en yeni üstte)
### 2026-11-12 · Kuruluş sohbeti (devam): kural motoru ve kategoriler
- Yapılanlar: `src/js/rules.js` (K10/11/12/14, birlikte simülasyon, bordala-veya-tramola seçimi, histerezis), kategoriler Kurallar/Taktik/Teknik, KONULAR.md üç bölüm + Teknik (G) tablosu, A2'de OCS teknesinin dönüş rotası düzeltildi.
- Yarım kalan: kalabalık senaryolarda etiketler üst üste binebiliyor (ek teknelerde basamak farkı artık gösterilmiyor; yeterli değilse etiket yerleşimi gerekir).
- Sonraki sohbete not: `scripts/check-scenarios.mjs` yazılırken ek tekne karışımıyla (2 iskele + 2 sancak) minimum mesafe testi de eklensin; bu sohbette geçici betikle ölçüldü (min ~40 px).

### 2026-11-12 · Kuruluş sohbeti
- Yapılanlar: müfredat araştırması (KONULAR.md, 40 konu), motor + 5 senaryo, arayüz v1 → v2 (tam ekran, bilgi kartı), yeni depo, otomatik yayın altyapısı, CLAUDE.md + NOTLAR.md protokolü.
- Yarım kalan: yok.
- Sonraki sohbete not: "Senaryo paketi 2" ile başla. Yeni senaryo yazarken `scripts/`e kalıcı bir simülasyon/kontrol betiği eklemek faydalı olur (`scripts/check-scenarios.mjs`).
