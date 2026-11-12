# NOTLAR – Sohbetler arası ortak hafıza

> Her sohbet başında okunur, sonunda güncellenir (protokol: `CLAUDE.md`).
> Kısa ve güncel tut: eskiyen maddeleri sil, tarih ver.

## Güncel durum (2026-11-12)
- Canlı: https://seyhundev.github.io/professional-sailing/ — main'e push ile otomatik yayın (GitHub Actions, hash'li dosya adları, sağ altta sürüm damgası).
- Hazır senaryolar (8): A1 line bias, A1b ölçüm yöntemleri, A2 zamanlama/OCS, A3 pin ucu avantajlı, A4 hakem botu avantajlı/barging, B1 Kural 10, C1 header'da tramola, B8 Kural 18.
- Arayüz: tam ekran sahne; üst çubukta **senaryo seçici** (kategori sekmeleri Taktik/Kurallar/Teknik, alt konu başlıkları, özetli kartlar), Bilgi, Katmanlar, tam ekran; alt çubuk (oynat, hız, zaman çubuğu, tekne ekle/çıkar); canlı takipli bilgi kartı.
- **Duyarlı düzen** (3 sınıf): bilgisayar (>1100 px: kart sağ üstte, tekne ekle alt çubukta), tablet (≤1100: ikon düğmeler, dikeyde kart altta geniş), telefon (≤640 px ya da yükseklik ≤460: kart alttan açılır sayfa + daraltma tutamacı, tekne ekle popover'da, seçici tam ekran). Dokunma hedefleri ≥44 px, iOS güvenli alan payları.
- **Engel kaçınma** (`engine.avoidDir`): şamandıra, pin ve hakem botu engeldir; önünde engel olan tekne (scripted ya da eklenen) kendiliğinden yana kaçıp rotaya döner. `npm run check` (`scripts/check-scenarios.mjs`) her senaryoda alan dışı, çarpışma, engele yaklaşma ve start hattı geçişini denetler; `expectOutside` / `expectEarly` ile bilinçli istisnalar.
- Terim: start hattının şamandıra ucu **pin**; "orsa şamandırası" yalnızca parkurun rüzgarüstü şamandırası için.
- Senaryo katmanları: `rungs {boat, from, to}`, `laylines [{x,y,tack,len,from,to,label}]`, `readouts [{boat,from,to}]` (rota + rüzgar açısı), segment `note` (scripted tekne üstünde yazı).
- Motor: segment tabanlı rota üretici (closehauled / run / heading / hold), ivme modeli, rüzgar keyframe'leri, yelken/bumba geometrisi, boş yelken sallanması.
- Ek tekneler start senaryolarında **hat üstünde slot** alır (`scn.startSlots`, 0=pin 1=hakem botu; slotlar dolunca 2. sıra 70 px geride). Hızlanma mesafesi hesaplanıp bekleme konumu geriye yerleştirilir; sinyalde hattı uçlar arasından geçerler. Erken geçen "ERKEN · OCS", uçların dışından geçen "Çizgi dışından geçti!" notu alır. Beklerken kural manevrası yapılmaz.
- Ek tekneler: kullanıcı ekler; `rules.js` tüm ek tekneleri birlikte simüle eder. Karşılaşmalarda RRS 10 (bordalama ya da yetmezse tramola), 11 (rüzgarüstü orsalar), 12 (arkadaki yavaşlar), 14 (hak sahibi de temas önler) uygulanır; manevra notu teknenin üstünde 2.5 s görünür. Scripted tekneler rotalarını değiştirmez (ders onlar).
- Kategoriler: Kurallar / Taktik / Teknik; KONULAR.md de bu üç bölüme ayrıldı (Teknik = G1-G7, Aşama 1 ile).

## Sıradaki işler (öncelik sırasıyla, her biri bir sohbete uygun)
> Karar (2026-11-12): **Önce Taktik → Start (A) bitirilecek, sonra Kurallar, sonra Teknik.** Liste: KONULAR.md → A1–A15.
- [x] **Start paketi 1** (2026-11-12): A1b ölçüm yöntemleri · A3 pin ucu avantajlı · A4 hakem botu avantajlı (barging).
- [ ] **Start paketi 2:** A5 hat yayı (line sag) ve transit (A6) · A7 rüzgaraltına boşluk (hole) · A8 bekleme teknikleri.
- [ ] **Start paketi 3:** A9 start sonrası ilk 2 dk (temiz hava, lane) · A10 iskele kontra start · A11 Vanderbilt yaklaşması.
- [ ] **Start paketi 4:** A12 bayraklar/sinyaller · A13 OCS düzeltme · A14 akıntı · A15 kalabalıkta sıra.
- [ ] **Senaryo paketi 2:** B2 Kural 11 (rüzgaraltı/rüzgarüstü), C3 layline & overstand, E1 geniş gir – dar çık. (KONULAR.md'de 🔜 olanlar)
- [ ] **Senaryo paketi 3:** C2 kalıcı dönüş, A3 barging, B4 Kural 13 (tramola atarken), D2 pupada kavança.
- [ ] **Kural motoru iyileştirme:** Kural 13 (tramola atarken yol ver), Kural 18 (zone içinde şamandıra yeri), Kural 16 (rota değiştirirken yer ver), start öncesi bekleyen teknelerin çizgi üstünde dizilmesi; tekne eklerken konumu sürükleyerek seçme.
- [ ] **Görsel katmanlar:** rüzgar gölgesi (dirty air) konisi, layline çizgileri, tekne üstünde "hak sahibi / yol ver" rozetleri.
- [x] **Mobil düzen** (2026-11-12): duyarlı düzen yapıldı. Kalan: dikey telefonda parkur küçük (yatay 1000×680 alan); istenirse dikey ekran için parkuru döndürme/yakınlaştırma.
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
1. `npm run check` çalıştır: alan dışı, tekne çakışması (<30 px), engele yaklaşma (<10 px), start hattı geçişi. Uyarı sıfır olmalı; bilinçli istisnaları `expectOutside` / `expectEarly` ile işaretle.
2. Adım zamanları (`steps[].t`) animasyondaki olaylarla eşleşsin.
3. `addBoat` konumları scripted teknelerle çakışmasın.
4. Playwright ekran görüntüsü (en az 2 kritik an).
5. `KONULAR.md` durumunu ✅ yap.

## Oturum günlüğü (en yeni üstte)
### 2026-11-12 · Arayüz: senaryo seçici ve duyarlı düzen
- Yapılanlar: açılır menü yerine kategori sekmeli kart paneli (`#picker`), üst çubukta kategori › konu + başlık düğmesi; telefon / tablet / bilgisayar düzenleri; telefonda bilgi kartı alttan sayfa (daraltılabilir), tekne ekle popover; iPad'de 44 px dokunma hedefleri. Playwright ile 1400×800, iPad Pro 11 (yatay/dikey), iPhone 13 (dikey/yatay) kontrol edildi.
- Yarım kalan: dikey telefonda sahne küçük; gerçek cihazda dokunma testi kullanıcıya bırakıldı.
- Sonraki sohbete not: arayüz değişikliği yapılırken `shot8.js` benzeri 4 cihazlı ekran görüntüsü alınmalı (betik scratchpad'deydi; kalıcı istenirse `scripts/screenshots.mjs` yazılabilir).

### 2026-11-12 · Start paketi 1 – düzeltmeler (kullanıcı geri bildirimi)
- "Orsa şamandırası (pin)" → "Pin" (her yerde). A1'de tekne pin'in üstünden geçiyordu: geometri düzeltildi + motora genel engel kaçınma eklendi. A3: pin'den çıkan P1 artık 1.5 s sonra iskeleye tramola atıp P3'ün önünden geçiyor (rüzgar 340°, P3 u=0.64). `npm run check` eklendi; tüm senaryolar temiz.
- Kullanıcı isteği: istekler alanlara bölünsün; farklı çalışma alanı gerektiren konu çıkınca yeni sohbet önerilsin.

### 2026-11-12 · Start paketi 1
- Yapılanlar: A1b (3 ölçüm yöntemi: rüzgara karşı durma + basamak, hat boyunca iki yöne seyir + rüzgar açısı okuması, pusula), A3 (pin layline'ı, pin'e sıkışıp çizgi dışından geçen tekne ve geri dönüşü, ortadan güvenli start), A4 (hakem botu layline'ı, barging, rüzgaraltı teknenin orsa edip kapıyı kapatması, 4 boy aşağıda güvenli yer). Yeni katmanlar: laylines, readouts, segment notu, rungs.to.
- Yarım kalan: A4'te L hakem botu gövdesine çok yakın geçiyor (u=0.94); görsel olarak kabul edilebilir ama istenirse 0.92'ye çekilebilir.
- Sonraki sohbete not: Start paketi 2 (A5 hat yayı + A6 transit, A7 boşluk, A8 bekleme). Hat yayı için 6-8 scripted tekneyle "yay" dizilimi gerekecek; `startSlots` + hold mantığı scripted teknelere de uygulanabilir (buildTrack'e `holdUntil` eklenebilir).

### 2026-11-12 · Kuruluş sohbeti (devam): kural motoru ve kategoriler
- Yapılanlar: `src/js/rules.js` (K10/11/12/14, birlikte simülasyon, bordala-veya-tramola seçimi, histerezis), kategoriler Kurallar/Taktik/Teknik, KONULAR.md üç bölüm + Teknik (G) tablosu, A2'de OCS teknesinin dönüş rotası düzeltildi.
- Start düzeltmesi: slot mantığı + OCS / çizgi dışı tespiti; kural eşikleri sıkılaştırıldı (risk dmin<58 px, yakınlık <42 px, K14 dmin<40).
- Yarım kalan: A1'de scripted iskele tekne ile eklenen sancak tekne 25 px'e kadar yaklaşabiliyor (scripted tekne yol vermiyor). Kalabalık senaryolarda etiketler üst üste binebiliyor (ek teknelerde basamak farkı artık gösterilmiyor; yeterli değilse etiket yerleşimi gerekir).
- Sonraki sohbete not: `scripts/check-scenarios.mjs` yazıldı (yalnızca scripted tekneler); ek tekne karışımı (2 iskele + 2 sancak) testi henüz eklenmedi.

### 2026-11-12 · Kuruluş sohbeti
- Yapılanlar: müfredat araştırması (KONULAR.md, 40 konu), motor + 5 senaryo, arayüz v1 → v2 (tam ekran, bilgi kartı), yeni depo, otomatik yayın altyapısı, CLAUDE.md + NOTLAR.md protokolü.
- Yarım kalan: yok.
- Sonraki sohbete not: "Senaryo paketi 2" ile başla. Yeni senaryo yazarken `scripts/`e kalıcı bir simülasyon/kontrol betiği eklemek faydalı olur (`scripts/check-scenarios.mjs`).
