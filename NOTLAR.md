# NOTLAR – Sohbetler arası ortak hafıza

> Her sohbet başında okunur, sonunda güncellenir (protokol: `CLAUDE.md`).
> Kısa ve güncel tut: eskiyen maddeleri sil, tarih ver.

## Güncel durum (2026-11-12)
- Canlı: https://seyhundev.github.io/professional-sailing/ — main'e push ile otomatik yayın (GitHub Actions, hash'li dosya adları, sağ altta sürüm damgası).
- Start senaryolarında (A1, A2, A3, A4) kalabalık filo var; A3 hattı 600 px (12 boy), rüzgar 335°.
- Yeni kategori **İleri Taktik** (4. sekme; `category: 'İleri Taktik'`), KONULAR.md → H bölümü. Start senaryoları uca göre üç konuda (2026-11-12): `topic` **'Start · Pin'** (İA1), **'Start · Orta'** (İA2, İA2b, İA2c), **'Start · Hakem botu'** (İA3); uçtan bağımsız yer tutma dersleri **'Start · Yer tutma'** (İA4). Seçici konuları senaryoların dosyadaki ilk geçiş sırasına göre dizer.
- Senaryo alanları: `clockScale` (sayaç gerçek zaman çarpanı, ör. 4 → 30 s animasyon = 2 dk), `prepFlag` ('P','I','U','Siyah') + `flagDownAt` (1 dk kala bayrak iner).
- Hazır senaryolar (15): İA4 rüzgarüstü teknenin altına yanaş, İA3 hakem botu ucunda yer tutma, A12 bayraklar, İA1 pin dışında bekleme, İA2 hat yayı, İA2b yay yok, İA2c boşluk seçimi dahil; A1 line bias, A1b ölçüm yöntemleri, A2 zamanlama/OCS, A3 pin ucu avantajlı, A4 hakem botu avantajlı/barging, B1 Kural 10, C1 header'da tramola, B8 Kural 18.
- Arayüz (v3, 2026-11-12): tam ekran sahne; üst çubukta logo + **senaryo düğmesi** (kategori renkli kod rozeti, kategori · konu, başlık), SVG simgeli Bilgi / Katmanlar / tam ekran. **Senaryo seçici** ortada modal (telefonda tam ekran): arama, kategori sekmeleri (renk noktası + sayı), konu başlıklı 2-3 sütunlu kart ızgarası (kod, başlık, özet, süre/tekne/adım). Alt çubuk: yuvarlak oynat, başa al, **adım işaretli zaman çizelgesi** (işarete tıkla → o ana git), dk:sn, hız düğmeleri (telefonda tek düğme, dokundukça değişir). Bilgi kartı: adım çubuğu (tıklanabilir), Canlı anahtarı, simgeli Önceki / Bu ana git / Sonraki, **Tekneler** listesi (renkli kimlik + kısa ad + rol rozeti). Sürüm damgası Katmanlar menüsünün altında.
- **Tekne etiketi** (sahnede): küçük rozet = [rol simgesi] KİMLİK [S/İ kutusu]. Rol (`boats[].role`: `hak` hak sahibi ✓ yeşil, `yol` yol verir ! sarı, `dogru` doğru ✓ yeşil, `hata` hata ✕ kırmızı) etiket kenarı ve simgesiyle; kontra yeşil S (sancak) / kırmızı İ (iskele) kutusuyla (seyir feneri renkleri). Tekne adları kısa (≤25 harf); uzun açıklama adımlara.
- **Duyarlı düzen** (3 sınıf): bilgisayar (>1100 px: kart sağ üstte, tekne ekle alt çubukta), tablet (≤1100: ikon düğmeler; dikeyde kart SAĞ ÜSTTE geniş (64vw, maks %44 yükseklik), parkur ekranın alt kısmına kaydırılır: `fitViewBox` dikey fazlalığın %68'ini üste verir; telefonda tersi %22), telefon (≤640 px ya da yükseklik ≤460: kart alttan açılır sayfa + daraltma tutamacı, tekne ekle popover'da, seçici tam ekran). Dokunma hedefleri ≥44 px, iOS güvenli alan payları.
- **Engel kaçınma** (`engine.avoidDir`): şamandıra, pin ve hakem botu engeldir; önünde engel olan tekne (scripted ya da eklenen) kendiliğinden yana kaçıp rotaya döner. `npm run check` (`scripts/check-scenarios.mjs`) her senaryoda alan dışı, çarpışma, engele yaklaşma ve start hattı geçişini denetler; `expectOutside` / `expectEarly` ile bilinçli istisnalar.
- **Hakem botu** (2026-11-12): ortak çizim `engine.drawCommitteeBoat(el, parent)` + `committeeBoatTransform(x,y,windFrom)` (senaryolar ve simülatör). Demirli motorlu tekne (kaptan köşkü, tik kokpit, yüzme platformu, demir zinciri), başı rüzgara döner; turuncu bayrak direği tam start hattının ucunda (`line.boat` noktası; gövde iskele küpeştesi direğe gelecek şekilde 12 px yana kayık), bayrak rüzgaraltına SMIL ile sürekli dalgalanır (oynatma dursa da). "Hakem botu" yazısı gövde ortasının (+14 px) 60 px altında; hazırlık bayrağı direği +34 px sağda.
- Terim: start hattının şamandıra ucu **pin**; "orsa şamandırası" yalnızca parkurun rüzgarüstü şamandırası için.
- **Pis rüzgar (rüzgar gölgesi) ortak** (2026-11-12): `engine.js` → `SHADOW` (kıçtan ~1 boy, en fazla %30 hız kaybı), `shadowK`, `shadowPolygon`. Senaryolar, kural motoru ve simülatör aynı hesabı kullanır. Her senaryoda otomatik: tüm teknelerin konisi çizilir (yelkeni boş bekleyen tekne daha zayıf/soluk gölge, `shadowStrength`), filo (`rules.simulate`) gölgede yavaşlar, senaryo tekneleri `SailRules.buildScene` → `warpForShadows` ile zamanda esnetilir (gölgede yavaş ilerler, gecikme beklerken kapanır; start zamanlaması bozulmaz). Seyreden senaryo teknesinde mor "Pis rüzgar · hız −N%" rozeti. Katmanlar → "Pis rüzgar (gölge)". Kapatma: `shadows: false`, tekne bazında `noShadow`.
- Senaryo katmanları: `gaps {from,to,items:[{a,b,label,color}]}` (filo boşluklarını hattın üstünde köşeli parantezle işaretler), `rungs {boat, from, to}`, `laylines [{x,y,tack,len,from,to,label}]`, `readouts [{boat,from,to}]` (rota + rüzgar açısı), segment `note` (scripted tekne üstünde yazı).
- Motor: segment tabanlı rota üretici (closehauled / run / heading / hold), ivme modeli, rüzgar keyframe'leri, yelken/bumba geometrisi, boş yelken sallanması. **Yelken pırpırlaması** (`engine.sailPose` + `sailShape`, senaryolar ve simülatör ortak): yavaş tekne (v ≤ %15 temel hız) yelkeni boşaltmış sayılır; rüzgara tam dönükse bumba ortada iki yana sallanır, baş rüzgardan açıksa bumba rüzgar yönünde uzanır ve yelken dalgalanır; hızlandıkça (≥ %45) kademeli olarak trimlenir.
- **Kalabalık filo** (`scn.crowd`): start senaryolarına senaryo tanımından gelen gri tekneler; `slot` (0=pin, 1=hakem botu), `row` (2. sıra 60 px geride), ya da `pos`+`v0`. Hat geçiş noktası bir slot ise hattın 1-1.5 boy dibinde rüzgara baş verip (`w±25°`, hız %4) bekler; `goBefore` (2.5 s) kala yelkeni doldurur, `tau` (1.0) ile küçük tekne gibi hızlanır; kural manevraları sinyalden 0.5 s sonra başlar (start patlamasında yalnızca engel kaçınma). Yan yana boşluk: hat yönü ile orsa rotası arasındaki açı küçükse (büyük bias) slotları daha seyrek koy (A3: 600 px hat, Δu≥0.2).
- Ek tekneler start senaryolarında **hat üstünde slot** alır (`scn.startSlots`, 0=pin 1=hakem botu; slotlar dolunca 2. sıra 70 px geride). Hızlanma mesafesi hesaplanıp bekleme konumu geriye yerleştirilir; sinyalde hattı uçlar arasından geçerler. Erken geçen "ERKEN · OCS", uçların dışından geçen "Çizgi dışından geçti!" notu alır. Beklerken kural manevrası yapılmaz.
- Ek tekneler: kullanıcı ekler; `rules.js` tüm ek tekneleri birlikte simüle eder. Karşılaşmalarda RRS 10 (bordalama ya da yetmezse tramola), 11 (rüzgarüstü orsalar), 12 (arkadaki yavaşlar), 14 (hak sahibi de temas önler) uygulanır; manevra notu teknenin üstünde 2.5 s görünür. Scripted tekneler rotalarını değiştirmez (ders onlar).
- Kategoriler: Kurallar / Taktik / Teknik; KONULAR.md de bu üç bölüme ayrıldı (Teknik = G1-G7, Aşama 1 ile).
- **Yarış simülatörü** (`src/sim.html`, ana sayfada üst çubukta "Simülatör"): kullanıcı tekneleri sürükleyip yerleştirir, rüzgarı ±5° döndürür, sol/sağ sağanak ekler, start verir; tekneler orsa şamandırasına gidip iskeleden döner, sıralanır. Çekirdek `js/sim-core.js` (canlı adım, DOM yok), arayüz `js/sim.js`. Kurallar kendi "kaçış seçici"siyle (aday rotalar arasında en güvenlisi): K10/11/12/13/14/18/22. Kişilikler: sol/orta/sağ/sağanak avcısı/manuel. Geri sarma: 0.1 s kareler. Denetim: `scripts/check-sim.mjs` (5 durum, herkes bitirmeli, temas ≤6). **Protesto ve ceza (2b):** yol vermeyen tekne yüzünden hak sahibi K14 kaçışı yapmak zorunda kalırsa ya da temas olursa yol vermesi gereken tekne protesto edilir ve iki tur (720°) ceza atar (şamandıradan 140 px, hattan 40 px uzakta; şamandırayı cezasız dönemez, önce uzaklaşıp cezayı atar sonra bitirir). "Yol vermez" (`ignoresRules`) tekne seçeneği (kurulumda tekne seçince "Davranış"; senin teknen için alt çubukta, yarışta da). **Rota çizme (2c):** alt çubukta "Rota çiz" → varsayılan **Açılı** (sürükleme = orsa açısına oturan düz bacak) ya da **Serbest** parmakla çizgi (≈40 px aralıklı noktalara seyreltilir) → `b.route`; teknen start'tan sonra noktaları sırayla izler (`followRoute`), orsadan dar kısımlarda çizginin ±45 px koridorunda zikzak atar, rota bitince taktiğine göre şamandıraya gider; yarışta yeni rota `command('route')` ile o andan yeniden hesaplanır, × siler. Rota kural denetiminden muaf değil (yol vermezse protesto). Fuzz `CEZA_TAKILDI` / `CEZA_ATILMADI` denetler, protesto sayısını yazar (`--protesto` gerekçe dağılımı).

- **Seçim durumları (simülatör, 2026-11-12):** seçili/açık olan her şey dolu renkle: seçenek grupları (`.seg button.on`, hız 1×/2×/4×) dolu mavi; aç/kapa düğmeleri (`.tb.tgl`: Manuel, Yol vermez) solda küçük anahtar, açıkken dolu (Yol vermez kırmızı); Rota çizerken düğme dolu turuncu; basınca küçülme, Tramola'ya basınca turuncu parlama. Sahnede **durum şeridi** (`#modeStrip`, `stateUpdate()`): aşama (Kurulum / geri sayım / Yarış / Duraklatıldı / bitti) · senin teknenin modu (MANUEL turuncu / ROTA / OTOMATİK + taktik) · Yol vermez (kırmızı) · seçili tekne ya da sağanak çipi (dokununca seçim kalkar). Masaüstünde üst orta, tablette sahnenin altı, telefonda pusulanın altı; rota çubuğu açıkken gizlenir. Seçili tekne: dolu mavi halka + nabız, etiket kenarı mavi; panelde rozetli "SEÇİLİ" başlık; Sıralama satırına dokununca tekne seçilir (seçili satır mavi). Manuelde teknenin etiketinde turuncu **M**, Taktik seçicide "Taktik: Sen". Sağanak: seçiliyken parlak kenar + "SEÇİLİ · düzenleniyor", değilken "dokun: düzenle". Devre dışı düğmeler nedenini `title`da söyler.

## Sıradaki işler (öncelik sırasıyla, her biri bir sohbete uygun)
> Karar (2026-11-12): **Önce Taktik → Start (A) bitirilecek, sonra Kurallar, sonra Teknik.** Liste: KONULAR.md → A1–A15.
- [x] **Start paketi 1** (2026-11-12): A1b ölçüm yöntemleri · A3 pin ucu avantajlı · A4 hakem botu avantajlı (barging).
- [ ] **Start paketi 5 – İLERİ SEVİYE KALABALIK START (kullanıcı isteği, öncelikli; ayrı sohbet):**
  Hedef kitle: yarışan Optimist sporcuları. Geniş hat (600 px, ~12 boy), 8-10 tekne, gerçek start karmaşası.
  - **A16 · Pin avantajlı, pin'de karmaşa:** pin'e yığılma; layline altında kalıp pin'i dönemeyenler; pin'de tramola atmak zorunda kalan tekne (Kural 13: tramola atarken yol ver; tramola bitince iskele kontrada herkese yol verir, Kural 10); rüzgaraltı teknenin orsa hakkı (K11) ile rüzgarüstündekilerin pin'e sıkıştırılması; geç kalıp 2. sırada çıkan; pin'e çarpan (K31 → tek tur ceza). Doğru çözüm: layline'ın üstünde, 3-4 boy geride bekleyip son 5 s'de hızlanmak.
  - **A17 · Hakem botunda yer mücadelesi (Optimist):** rüzgara baş verip bekleme (hold), yelken boş; "double tack"; rüzgaraltına inip yer açma ve açılan yeri koruma; rüzgarüstünden sokulan (barging) hak alamaz; rüzgaraltı orsa hakkı (K11, start öncesi uygun rota sınırı yok); tramola atarken yol ver (K13); **geri giden tekne yol verir (K22.3: yelkeni geriye basıp suda geri hareket eden tekne herkese yol verir)**; hak kazanınca yer ver (K15), rota değiştirirken yer ver (K16); temas önleme (K14); hakem botuna temas (K31). **Hatalı hareketler (kırmızı rozet):** rüzgarüstünden sokulma, pompalama/sallama/dümenle kürek (K42; rüzgara baş vermişken dümeni çevirerek dönmek K42.3(d) ile sınırlı izinli), hakem botuna yaslanma, geri giderken yol istemek, bindirme kurmadan "yer" istemek.
  - **A8 · Bekleme teknikleri** (bu paketle birleşsin): orsalayıp durma, yelkeni boşaltma, geri yelken (backing) ile yavaşlama/geri gitme, ikili tramola, hattın 2-4 boy gerisinde yer tutma; hızlanma mesafesi.
  - **Motor gereksinimleri:** scripted teknelere bekleme (`hold`) var; eklenecekler: `backing` (yelken geri basılı, tekne geri gidiyor; yelken karnı ters), rüzgara baş vermişken yelkenin tamamen boş çizilmesi (var), 8-10 tekne için etiket seyrekleştirme (yalnızca manevra yapanın notu), kırmızı "hatalı hareket" rozeti (`note` için `kind:'fault'`), daha geniş hat için `addBoat` slotları, Kural 13 ve 22 kural motoruna (ek tekneler) eklenmeli.
  - Teslim: 3 senaryo (A16, A17, A8) + KONULAR.md ✅ + `npm run check` temiz + ekran görüntüleri.
- [x] **Yarış simülatörü – 1. aşama** (2026-11-12): sayfa, sürükle-bırak, rüzgar, sağanak, start/OCS, layline tramolası, şamandıra dönüşü, sıralama, olay listesi, Tramola komutu, geri sarma.
- [x] **Simülatör 2a** (2026-11-12, yapıldı): start'ta yarışın tamamını önceden hesapla, değişiklikte (sağanak/rüzgar/rota) o andan ileri yeniden hesapla; ileri sarma ve "tahmini sıra". Her teknede hız ("4.2 kn"), sağanakta yeşil ↑, pis rüzgarda kırmızı ↓; pis rüzgar gölgesi (katman; 2026-11-12'den beri engine.SHADOW ile ortak, ~1 boy).
- [x] **Simülatör 2b:** "ne oldu / kim haklı" ayrımı: yol vermeyen tekne → protesto + iki tur ceza (720°) animasyonu; temasta hak sahibi kaçınabilecekken kaçınmadıysa o da ceza (K14); "kural bilmeyen" tekne özelliği (kendi teknene de).
- [x] **Simülatör 2c:** kendi teknene rota çizme (parmakla çizgi; rüzgara karşı kısımda otomatik zikzak; bitince şamandıraya).
- [ ] **Yarış simülatörü – 2. aşama (eski liste):** rüzgar gölgesi (dirty air) etkisi, salınımlı rüzgar (otomatik kayma), sağanağın rüzgarla sürüklenmesi, şamandırada tam K18 (zone, iç tekneye yer), pupa ayağı ve bitiş hattı, senaryoyu linkle paylaşma, tekne döndürerek yerleştirme. Şamandırada 12 teknede 3-6 temas oluyor; zone mantığıyla azaltılabilir.
- [ ] **Uygulama adı (ayrı sohbet):** "Professional Sailing" muhtemelen kullanımda. Yeni isim kriterleri: kısa, akılda kalıcı, Türkçe sporcuya da uluslararası kitleye de uyan, alan adı / GitHub adı boş, "taktik + yelken + öğrenme" çağrışımı. 10-15 aday üret, 3'e indir, kullanıcıya sun. Seçilince: GitHub depo adı, site adresi, `index.html` başlığı, README, CLAUDE.md, NOTLAR.md güncellenir (yayın adresi değişeceği için kullanıcıya haber verilir).
- [ ] **Start paketi 2:** A5 hat yayı (line sag) ve transit (A6) · A7 rüzgaraltına boşluk (hole) · A8 bekleme teknikleri.
- [ ] **Start paketi 3:** A9 start sonrası ilk 2 dk (temiz hava, lane) · A10 iskele kontra start · A11 Vanderbilt yaklaşması.
- [ ] **Start paketi 4:** A12 bayraklar/sinyaller · A13 OCS düzeltme · A14 akıntı · A15 kalabalıkta sıra.
- [ ] **Senaryo paketi 2:** B2 Kural 11 (rüzgaraltı/rüzgarüstü), C3 layline & overstand, E1 geniş gir – dar çık. (KONULAR.md'de 🔜 olanlar)
- [ ] **Senaryo paketi 3:** C2 kalıcı dönüş, A3 barging, B4 Kural 13 (tramola atarken), D2 pupada kavança.
- [ ] **Kural motoru iyileştirme:** Kural 13 (tramola atarken yol ver), Kural 18 (zone içinde şamandıra yeri), Kural 16 (rota değiştirirken yer ver), start öncesi bekleyen teknelerin çizgi üstünde dizilmesi; tekne eklerken konumu sürükleyerek seçme.
- [ ] **Görsel katmanlar:** ~~rüzgar gölgesi (dirty air) konisi~~ (yapıldı, ortak), layline çizgileri, tekne üstünde "hak sahibi / yol ver" rozetleri.
- [x] **Mobil düzen** (2026-11-12): duyarlı düzen yapıldı. Kalan: dikey telefonda parkur küçük (yatay 1000×680 alan); istenirse dikey ekran için parkuru döndürme/yakınlaştırma.
- [ ] **Paylaşılabilir durum:** URL'de senaryo + zaman + eklenen tekneler (ör. `#b1-rule10?t=5&boats=pin:port,middle:starboard`).
- [ ] **Dil:** TR/EN geçişi (önce metinleri ayrı dosyaya taşı).
- [ ] **Senaryo editörü (büyük iş, ayrı aşama):** tekneleri sürükle, segment ekle, rüzgar ayarla, JSON dışa aktar. Bu aşamada Vite+React+TS+Tailwind'e geçiş değerlendirilecek (bkz. Kararlar).
- [ ] **Kullanıcı senaryoları (sonraki aşama):** Firebase Auth + Firestore, link ile paylaşım, Firebase Hosting.

## Kararlar
- 2026-11-12 · **Simülatör ayrı sayfa, ayrı çekirdek.** `sim-core.js` canlı (adım adım) çalışır çünkü rüzgar/sağanak yarış sırasında değişir; `rules.js` önceden hesaplı rota üretir ve senaryolar için aynen kalır (`approach`, `clearAstern`, `lineSide` paylaşılır). Simülatörde yol veren tekne aday rotalar (bordala, orsala, yavaşla, tramola) arasından temas riskini en iyi azaltanı seçer; hak sahibi rotasını korur, yalnızca temas kaçınılmazsa (K14) yavaşlar. Şamandıra iskeleden dönülür; sıra = dönüş sırası. Derleme tüm `src/*.html` sayfalarını işler.
- 2026-11-12 · **Tekne rolü yazıyla değil rozetle:** `boats[].role` alanı (hak/yol/dogru/hata) eklendi, adlardaki "(hak sahibi)", "X –" önekleri kaldırıldı. Sebep: kullanıcı rüzgarüstü/rüzgaraltı, hak sahibi gibi bilgilerin daha az yazıyla, görsel verilmesini istedi. Yeni senaryolarda `name` kısa tutulur, `role` verilir.
- 2026-11-12 · **Arayüz yeniden tasarım (v3):** simgeler `index.html` başındaki SVG `<symbol>` setinden (`#i-play` vb.), bağımlılık/yazı tipi eklenmedi. Renk belirteçleri `:root` içinde (`--c-taktik`, `--hak`, …). Animasyon/motor koduna dokunulmadı; yalnızca etiket ve HUD çizimi (`drawLabel`, `drawHud`) değişti. HUD (pusula + sayaç) ekran boyuna göre ölçeklenir.
- 2026-11-12 · **Yığın: vanilla HTML/SVG/JS.** Next.js/Tailwind şimdilik yok: motor framework'ten bağımsız, GitHub Pages statik, SSR gereksiz, SVG+rAF React'te gereksiz karmaşıklık. Editör aşamasında Vite+React yeniden değerlendirilecek. Firebase, Next.js gerektirmez.
- 2026-11-12 · **Yayın: GitHub Actions + hash'li derleme.** Sebep: Pages'in 10 dk önbelleği yeni HTML'i eski CSS/JS ile eşleştirdi. `scripts/build.mjs` dosya adına içerik özeti ekler.
- 2026-11-12 · **Yeni depo** `seyhunDev/professional-sailing`; eski `python_deneme` terk edildi.
- 2026-11-12 · **Aşama 1 (yeni öğrenenler) atlandı**, Aşama 2 (yarış hazırlığı) ile başlandı.
- 2026-11-12 · **Fodepar (OCS) gösterimi hafif:** erken tekne çizgiyi burnuyla yarım boy geçer, durur, geri döner (K22.3). "Fodepar" terimi kullanıcı tercihi; OCS parantezde.
- 2026-11-12 · **Tekne ekle/çıkar arayüzden kaldırıldı** (kod duruyor, `addBoat`/`removeBoat`); kalabalık, senaryo tanımındaki `crowd` ile gelir. Sebep: kullanıcı gerçekçi, hazır kalabalık startlar istiyor; serbest ekleme kafa karıştırıyordu.
- 2026-11-12 · **Küçük tekne start modeli:** Optimist/ILCA hattın hemen dibinde (1-1.5 boy) bekler, 2-3 s kala doldurur. A2 buna göre yeniden yazıldı; eski "4-5 boy geride bekle" metni kaldırıldı.
- 2026-11-12 · **Kural motoru ek teknelere uygulanır, scripted teknelere uygulanmaz.** Sebep: scripted tekneler dersin kendisi; ek tekneler "kalabalık" ve kuralların canlı gösterimi. Hak sahibi notu gösterilmez (kalabalıkta okunmuyor), yalnızca yol veren manevralar yazılır.
- 2026-11-12 · **Üç sabit kategori: Kurallar / Taktik / Teknik**, alt konu `topic` alanı ile.
- 2026-11-12 · **Bilgi kartı tek adım gösterir**, canlı takip açık/kapalı; kullanıcı Önceki/Sonraki ile gezince takip kapanır.

- 2026-11-12 · **Pis rüzgar tek yerden:** gölge geometrisi ve hız kaybı `engine.js` → `SHADOW`'da; senaryo/kural motoru/simülatör aynı fonksiyonları çağırır. Boy 4 tekne boyundan ~1 boya indirildi (kullanıcı: "çok uzun"). Senaryo teknelerinin rotası değişmez, yalnızca zamanda esnetilir (ders rotası korunur). Uygulama ve `check-scenarios` rotaları aynı `SailRules.buildScene` ile üretir.

## Açık sorular (kullanıcıya)
- Uygulama adı: karar bekliyor (ayrı sohbette adaylar üretilecek).
- Hedef sınıf: Optimist mi, ILCA 4/6 mı, karışık mı? (Hız/dönüş oranları ve "tekne boyu" ölçeği buna göre ayarlanabilir.)
- Senaryolarda İngilizce terimlerin parantez içinde verilmesi devam etsin mi, yoksa yalnızca Türkçe mi?
- Antrenörler sahada tablet mi kullanacak? (Mobil düzenin önceliğini belirler.)

## Senaryo kartları (her senaryo için ayrı sohbet açılabilir)
> Kullanım: yeni sohbette "NOTLAR.md'deki **İA2 kartını** geliştir: <istek>" de. Sohbet, kartı okur, işi yapar, kartı günceller.
> Kart formatı: id · dosyadaki yer · durum · bilinen eksikler · fikirler · bağlı senaryolar.

| Kart | id | Durum | Bilinen eksikler / fikirler | Bağlı |
|---|---|---|---|---|
| A1 | `a1-line-bias` | ✅ | Filo 4 tekne; A iskele kontrada filonun arasından geçiyor (basamak farkı ≥1 boy). | A1b, A3, A4 |
| A1b | `a1b-measure` | ✅ | Rüzgar açısı okuması. Fikir: pusula kadranı görseli. | A1 |
| A2 | `a2-timing` | ✅ | Hattın dibinde bekleme modeli, fodepar hafif. Fikir: "kaç saniyede 1 boy" ölçüm katmanı. | A12 |
| A3 | `a3-pin-favored` | ✅ | 600 px hat, 25° bias; P2 çizgi dışı (ders olarak). Fikir: P2 için de "geri dönüş" yolu. | İA1 |
| A4 | `a4-committee-favored` | ✅ | Barging; L hakem botuna yakın (u=0.9). Fikir: hakem botunun kıçından "çit" vurgusu. | A17 |
| A12 | `a12-flags` | ✅ | Yalnızca U bayrağı canlı; P/I/siyah varyantları ve 5-4-1-0 sırası eksik. | A2, A13 |
| İA1 | `ia1-port-approach-pin` | ✅ | Solda bekle, apaz gel, layline üstünde tramola; X en alttaki teknenin ~1 boy altına girer (rüzgaraltında boşluk kalır), sinyalde onunla yan yana çıkar; Z (layline altı) ve Y (geç) hataları. Fikir: K13/K15 ihlali yapan 3. hata teknesi (ceza turu). | A3, A16 |
| İA2 | `ia2-line-sag` | ✅ | Transit nişan hattı, yay (back), S yukarı durur. S hattın uzantısında (pin dışı, hat hizası) bakar, sonra hattın altından ortaya gider. Yay eğrisi (`sag`) çiziliyor; pis rüzgar artık ortak motor özelliği (S gölgede gerçekten yavaşlar, ama filonun 2-3 boy altından geçtiği için etkisi küçük). | A5, A6, H5 |
| İA2b | `ia2b-no-sag` | ✅ | İA2'nin "yay yok" eşi: 8 tekne hattın dibinde; S 3 ile 4 arasındaki boşluğa girer ama **4'ün hemen rüzgaraltına sokulur** (merkezler ~44 px, aynı hiza; kullanıcı isteği 2026-11-12: "4'e yakın olsun, önemli taktik"), 3'e doğru rüzgaraltı boşluğu kalır; 4 ile paralel çıkar. Kendi sohbeti var ("İA2b yay yok taktiğini geliştir"). | A5, H5 |
| İA4 | `ia4-leeward-of-windward` | ✅ | Yer tutma (2026-11-12, `topic: 'Start · Yer tutma'`, İA2c'nin arkasında): pin tarafı 4 teknelik kalabalık; S ikinci sırada sıkışık, geri çekilip (bordala, kavança) filonun altından apaz ile ortaya gider, W'nin (adlı filo teknesi, `crowd[].id/name`) ~45 px rüzgaraltına yanaşır, rüzgaraltında ~2.5 boy açık su; sinyalde oraya düşüp hızlanır. Hata H de kalabalıktan çıkar ama L'nin (scripted, hak) ~42 px rüzgarüstüne yanaşır; startta altı dolu, yavaş (hız ×0.75), L orsalayınca (K11) yol verip geride kalır. Fikir: ters rüzgar (backwind) motorda yok, yalnızca hız katsayısıyla; istenirse rüzgaraltı teknenin rüzgarüstüne gölgesi motora eklenebilir. | İA2b, İA3, H3 |
| İA3 | `ia3-committee-hold` | ✅ | Hakem botu ucu (rüzgar 5°): H 2 dk kala layline'dan gelir, turuncu bayrağın hemen solunda (merkez ~(767,487), hakem botu engeline ~22 px) hattın 1 boy altında `hold` (hız 0.008, sürünmez) bekler; rüzgaraltında 6 numaraya kadar ~2 boy boşluk. B (hata) 1 dk kala sağdan apaz barging dener, bordalayıp H'nin kıçından dolaşır, 2. sırada H'nin pis rüzgarında çıkar. `committeeLabel: 'right'` (yazı H ile çakışmasın). Fikir: H'nin rüzgaraltındaki boşluğa sokulmaya çalışan 3. tekne ve H'nin bordalayıp boşluğu koruması (H3); geri yelken ile yer düzeltme (motor `backing` gelince). | A4, A17, İA4 |
| İA2c | `ia2c-pick-gap` | ✅ | İA2b'nin alt senaryosu (2026-11-12): rüzgar 5° (hakem botu ucu avantajlı), 7 tekne, üç boşluk: pin yanında DAR (2-3), ortada GENİŞ (4-5), hakem botu tarafında GENİŞ avantajlı (6-7); `gaps` katmanı. S 2 dk kala bakar (`clockScale: 4`), filonun altından avantajlı boşluğa gider, 7'nin hemen rüzgaraltına sokulur (~45 px). D 1 dk kala bakar, dar boşluğa sıkışır; startta komşuları K11/K14 ile yer açar. Sonraki varyant fikirleri: "İA2b ailesi fikir listesi". | İA2b, A1, A5 |
| B1 | `b1-rule10` | ✅ | Tek tekne bordalama. Fikir: lee-bow varyantı. | B2 |
| B8 | `b8-rule18` | ✅ | Zone + bindirme. Fikir: 18.3 zone içinde tramola varyantı. | B9 |
| C1 | `c1-header-tack` | ✅ | Salınımlı rüzgar. Fikir: pusula okuması katmanı. | C2, C3 |

### İA2b ailesi: sonraki varyant fikirleri (kullanıcı isteği 2026-11-12, sırayla eklenecek)
> Ortak ders: yay yokken avantaj boşluk seçiminden, zamanlamadan ve rüzgaraltı açık sudan gelir. Hepsinde anahtar hareket: rüzgarüstü komşunun hemen rüzgaraltına sokulmak.
1. **Boşluğu savun:** S geniş boşluğa erken girer; geç gelen bir tekne S'nin rüzgaraltına sokulup boşluğu kapatmak ister. S hafif bordalayıp rüzgaraltını "sahiplenir" (yelkeni boşaltıp yanlamasına kayar), gelen tekne yer bulamaz. Hata teknesi: boşluğun ortasında bekleyip rüzgaraltını kaptıran.
2. **1 dk mı 2 dk mı?** Pin'e yakın çıkacak tekne için 1 dk kala bakmak yeterli (kullanıcının yaptığı); ortaya ya da karşı uca gidecekse 2 dk gerekir. İki tekne aynı anda bakar, biri pin yanı boşluğa (yetişir), diğeri karşı uca (yetişemez).
3. **B planı:** S 2 dk kala avantajlı uca yönelir, 40 sn kala rüzgar geri döner (avantaj pin'e geçer) ya da boşluk dolar; S yoldaki yakın geniş boşluğa geçer. Ders: her zaman ikinci boşluğu aklında tut.
4. **Dar boşluk kapanınca kaçış:** D dar boşluğa girer, komşusu düşer ve boşluk kapanır; D'nin seçenekleri: geri çekilip arkadan çıkış ya da sinyalde tramola ile sağa kaçış. Kural 11/14/15 gösterimi.
5. **Boşluğa iskele kontra yaklaşım:** filonun altından apaz yerine iskele kontrada gelip boşluğun önünde tramola (İA1 ile bağ); K13/K15 riski.
6. **Avantaj vs kalabalık:** avantajlı uç dolu (barging riski, A4), az avantajlı tarafta geniş boşluk; hangisi daha çok kazandırır? (5° bias ≈ 600 px hatta 1 boy hesabıyla.)

## Sohbetler arası mesajlar
- 2026-11-12 · Sağanak sohbetinden **seçim vurgusu sohbetine:** sağanak seçimi artık `gustSelect(i)` ile; seçiliyken `body.gust-editing` sınıfı var (alt çubuktaki Sağanak grubu mavi), kart `#gustBar` sağ altta. Seçim stillerini birleştirirsen bu mavi dili koru ya da tek yerde topla.
- 2026-11-12 · Pis rüzgar sohbetinden **simülatör sohbetine:** `sim-core.shadowAt` ve `sim.drawShadows` artık `engine.SHADOW`/`shadowK`/`shadowPolygon` kullanıyor; gölge ~1 boy (eskiden 4), yelkeni boş tekne zayıf gölge yapar. `SHADOW_LEN` dışa aktarımı duruyor. Simülatör 2b/2c ile birlikte fuzz 60'ta 1 TAKILDI (#23, start öncesi kalabalıkta dönen tekne); 150/300 yarışta oran öncekiyle aynı (2/150; 300'de 4, önce 7), yani yeni hata değil, sabit tohumlu sete denk gelen eski takılma sınıfı. check-scenarios ve check-sim temiz.
- 2026-11-12 · Pis rüzgar sohbetinden **tüm senaryo sohbetlerine:** senaryo teknelerinin rotası artık `SailRules.buildScene` ile kuruluyor (gölgede yavaşlama dahil). Yeni senaryoda zamanlama birkaç px kayabilir; `npm run check` bunu da denetliyor. İstemezsen `noShadow: true`.
- 2026-11-12 · Simülatör sohbetinden **pis rüzgar sohbetine:** okundu. fuzz-sim'de start etmemiş tekne için TAKILDI penceresi 14 s (start etmiş için 8 s): aşırı hat avantajında pin kalabalığında birkaç saniye dönüp yer arayan tekne gerçekçi, sonra start ediyor (#23 izlendi). 60 temiz, 150'de 1, 300'de 2.

## Arayüz kontrol listesi: boşluk ve taşma (her arayüz değişikliğinde)
1. **Metin kutudan taşmasın:** SVG içindeki kutulu metinlerde (sayaç, tekne etiketi) genişlik tahmin edilmez, `textW()` ile ölçülür. Kutu iç boşluğu en az 12-14 px (sağ ve sol eşit).
2. **Uzun metin kaybolmasın:** kartta kaydırılan alan tek: `.info-scroll` (adım metni + Tekneler + Senaryo özeti). Yeni bölüm eklenirse bunun içine konur; `overflow: hidden` olan kapsayıcıya sabit yükseklikli bölüm eklenmez. Uzun kelimeler için `overflow-wrap: anywhere`.
3. **Gezinti hep görünsün:** Önceki / Bu ana git / Sonraki kartın en altında sabit; kaydırmayla kaybolmaz.
4. **Parkur kartın altında kalmasın:** geniş ekranda `fitViewBox` yatay fazlalığı kartın genişliği kadar sağa verir; kart kapanınca ortalanır.
5. **Kontrol:** masaüstü 1400×800, iPad Pro 11 yatay/dikey, iPhone 13 dikey/yatay; her senaryonun SON anında (en uzun metinler) ve "Senaryo özeti" açıkken ekran görüntüsü. Playwright ile `scrollWidth > clientWidth` olan HTML öğesi kalmamalı.
6. Sahnedeki yazı kutulu rozet olur ve `drawNotes` çakışma denetiminden geçer; yeni bir sahne yazısı eklenirse engel listesine (`obst`) eklenir.
7. Kenar boşlukları: kart içi yatay 16 px (telefonda 14), bölümler arası ince çizgi + 10-12 px; dokunma hedefi ≥ 44 px.

## Senaryo kontrol listesi (her yeni senaryo için)
1. `npm run check` çalıştır: alan dışı, tekne çakışması (<30 px), engele yaklaşma (<10 px), start hattı geçişi. Uyarı sıfır olmalı; bilinçli istisnaları `expectOutside` / `expectEarly` ile işaretle.
2. Adım zamanları (`steps[].t`) animasyondaki olaylarla eşleşsin.
3. `addBoat` konumları scripted teknelerle çakışmasın.
4. Playwright ekran görüntüsü (en az 2 kritik an).
5. `KONULAR.md` durumunu ✅ yap.

## Oturum günlüğü (en yeni üstte)

### 2026-11-12 · Simülatör: seçim durumları belirgin
- Kullanıcı: "manuel seçildiğinde ne seçili, ne yapılıyor anlaşılmıyor; her bağlam için seçim durumlarını belirgin yap". Yapılanlar "Güncel durum"da (Seçim durumları maddesi). Yalnız `sim.html`, `sim.css`, `sim.js` (çizim/etiket ve `stateUpdate`); çekirdeğe dokunulmadı. `npm run check` temiz.
- Hız/tramola ve sağanak paneli yerleşimi ayrı sohbetlerde. Durum şeridi rota çubuğu açıkken gizlenir; sağanak kartı sağ altta olduğundan ona karışmaz.
- Sonraki: kullanıcı geri bildirimi; telefonda şerit pusulanın altında alt alta, kalabalık bulursa yalnız aşama + seçili gösterilebilir.

### 2026-11-12 · Simülatör: sağanak ayarları görünür
- Kullanıcı: sağanak eklenince ayarlar üstte çıkıyor, fark edilmiyor. Ayar çubuğu **sağ altta kart** oldu (`#gustBar`, "Sağanak N ayarları"): Boyut − %N +, Sıfırla, Sil, ×/Esc. Panel açıkken panelin soluna kayar (≥641 px), telefonda altta tam genişlik ve alt panel kapanır.
- **+ Sol / + Sağ** ile eklenen sağanak kendiliğinden seçilir (`gustSelect`), kart açılırken iki kez mavi parlar. Seçili sağanak haritada dışa yayılan mavi halka + "SEÇİLİ · AYARLAR ALTTA" yazısıyla, alttaki Sağanak grubu da maviyle (`body.gust-editing`) vurgulanır. Eski "eklendi" toast'u kalktı.
- Yarım kalan yok. Aynı mesajdaki hız (1× yavaşlatma), manuel tramola ve seçim vurgusu işleri başka sohbetlerde.

### 2026-11-12 · Simülatör: gerçek zaman ölçeği ve manuel tekne kenarda dönmüyor
- **Zaman:** `CLOCK_SCALE = 300 / START_AT` (START_AT 8,4 sim-sn = 5:00 geri sayım). Varsayılan parkurda start → orsa şamandırası ortanca ~14 dk. `sim.js` oynatırken CLOCK_SCALE'e böler: 1× = gerçek zaman. Hız düğmeleri 1× / 5× / 15× / 40× (40× ≈ eski 1×). Fizik değişmedi; parkur sıkıştırılmış olduğu için 1×'te tramolalar ağır çekim gibi görünür.
- **Manuel:** v1.50'de manuel tekne "kendiliğinden" yalnız parkurun yan kenarında (x<25) dönüyordu; start'tan ~7-10 sim-sn sonra oluyordu, kullanıcı bunu istemsiz tramola sandı. Artık manuel tekne parkur kenarını `MAN_MARGIN` (320 px) kadar aşabilir, kenarı geçince uyarır ("Parkurun dışına çıkıyorsun: tramola?"), yalnız o sınırda zorunlu döner. Kamera da yakınlaştırınca bu kadar dışarı kaydırılabilir / takip eder.
- `check-sim.mjs`: manuel modda kendiliğinden tramola sayan denetim eklendi (3 rüzgar, 0 olmalı).
- Seçim durumları ve sağanak paneli ayrı sohbetlerde ("Simülatörde seçim durumlarını belirginleştir", "Sağanak ayarlarını görünür yap").

### 2026-11-12 · Sürüm etiketi (tüm site) ve ceza turunda uzaklaşma
- **Sürüm:** `build.mjs` her HTML sayfasına sağ alt köşede `.ver-badge` (`v1.<main commit sayısı>`) ekler; stil `style.css`. deploy.yml checkout `fetch-depth: 0`. Kural CLAUDE.md'de: her main gönderiminden sonra yeni numara kullanıcıya söylenir.
- **Ceza turu (K44.2):** tekne önce diğer teknelerden uzaklaşır: gitmek istediği (avantajlı) tarafa doğru rüzgara ~100° açılır; o taraf kalabalıksa ya da kenardaysa öbür tarafa. 85 px açıklık bulunca (en az 1,2 s, en çok 5 s) iki turu atar. Dönmeye başladığı anda en yakın tekne: ortanca 26 px → 84 px.

### 2026-11-12 · Manuel modda start'ta kendiliğinden tramola düzeltmesi
- Sebep: start'tan sonra hattı henüz geçmemiş tekne, hattın uçlarına %12 yakınsa "uçların dışında" sayılıp hattın içine dönmek için tramola atıyordu (`lineAim`). Sancakta sola giden teknede pin tarafında hep oluyordu.
- Manuelde artık yalnız gerçekten dışarıdaysa (%2) uyarı verir ("Hattın dışındasın: tramola at"), kendisi dönmez. Otomatikte %11 pay kaldı (pin'e sıkışmasın).
- Manuelde tek zorunlu tramola parkurun kenarı (25 px), artık olaylara yazılıyor; kenara 110 px kala "tramola?" uyarısı.

### 2026-11-12 · Simülatör: Manuel mod (tramolayı yalnız kullanıcı atar)
- Alt çubukta **Manuel** anahtarı (M tuşu), kurulumda ve yarışta. Açıkken senin teknen start'tan sonra hiç kendi tramola atmaz: taktik / layline / kaçış tramolası / rüzgarda kalma / şamandırayı tutmama tramolaları kapalı; yalnız parkurun kenarına (25 px) gelince güvenlik tramolası. Start'a yaklaşma ve şamandıra dönüşü otomatik. Rota kapanır, taktik seçimi pasif, Tramola düğmesi yanıp söner. Kapalıyken eski davranış.
- Motor: `b.manual`, `command 'manual'`; kayıtta saklanır.
- Taktik seçimindeki "Yalnız komutla" seçeneği kaldırıldı (Manuel onun yerini aldı); alt çubuk 1400 px'te tek satıra sığacak şekilde sıkıştırıldı.
### 2026-11-12 – İA4 rüzgarüstü teknenin altına yanaş (yer tutma)
- Kullanıcı isteği: ayrı başlık; kalabalıkta sıkışan tekne çıkıp boş yerde rüzgarüstü teknenin altına yanaşsın, bekleyip start etsin; aynı animasyonda hatalı olan rüzgaraltındakinin üstüne yanaşsın, alttaki daha hızlı gitsin.
- Yapılanlar: yeni İA4 `ia4-leeward-of-windward` (S doğru, L hak, H hata + 5 filo, W adlı filo teknesi), KONULAR H8 ✅. `npm run check` temiz. Ekran görüntüleri: proje dosyaları `yer-tutma/`.
- Sonraki sohbete not: aynı topic'e sonraki fikir "rüzgaraltındaki boşluğu savun" (İA2b ailesi 1, H3).
### 2026-11-12 – İA3 hakem botu ucunda yer tutma + İleri Taktik start gruplaması
- İleri Taktik start senaryoları üç konuya ayrıldı: Start · Pin / Start · Orta / Start · Hakem botu (kullanıcı isteği). Kardeş sohbetin "rüzgarüstü teknenin altına yanaş" senaryosu (İA4) ayrı konu 'Yer tutma' ile geliyor.
- Yeni İA3 (`ia3-committee-hold`), dosyanın sonunda. KONULAR H7 ✅. Arayüz: `scn.committeeLabel: 'right'` seçeneği (hakem botu yazısı sağa).
- `npm run check` temiz; ekran görüntüleri project-files/hakem-botu-yer-tutma/.
- Sonraki sohbete not: H'nin rüzgaraltı boşluğunu savunduğu varyant (H3) bu senaryonun doğal devamı.

### 2026-11-12 – Hakem botu çizimi
- Hakem botu gerçekçi motorlu tekne olarak yeniden çizildi, tek kod (`engine.js`) iki sayfada kullanılıyor; turuncu bayrak belirgin dalgalanıyor, rüzgarla dönüyor.
- Düzeltme: turuncu bayrak direği tam start hattının ucuna alındı (gövde 12 px yana kaydı), yazı ve hazırlık bayrağı buna göre yerleşti.
- Sonraki sohbete not: bayrak/gövde rüzgar yönüne göre döndüğünden çok büyük rüzgar dönüşlerinde etiket ile çakışma kontrol edilebilir.

### 2026-11-12 · Simülatör: sabit sayfa, yakınlaştırma / kaydırma / takip kamerası
- Sayfa sabit: `body.sim { position: fixed; overscroll-behavior: none }`, panel kaydırması sayfaya taşmaz, iPad'de sayfa yakınlaşması (gesturestart) engellendi.
- **Kamera** (`sim.js` → `st.cam {z,x,y,follow}`, `applyCam`, `zoomTo`, `panBy`): iki parmak (pinch) ve fare tekerleği ile yakınlaştırma (1–5×), boş yeri sürükleyince kaydırma (dokunmak hâlâ seçimi kaldırır), sol altta + / − / Tümü / Takip (telefonda sağ üstte). Takip kamerayı senin teknene kilitler; kaydırınca bırakır. Klavye: + − 0 F.
- Düğmeyle yakınlaştırma teknen ekrandaysa onu sabit tutar; tüm parkurdayken teknene yaklaşır. Telefonda alt sayfanın kapattığı kısım hesaba katılır.
- Pinch testi sentetik PointerEvent ile yapıldı (gerçek iPad'de denenmeli).

### 2026-11-12 · Simülatör: start öncesi erken çıkış, taktiğe sadakat, akıntı/dalga, kayan tekne
- **Erken çıkış:** bekleyen tekne artık ileri sürünmüyor (bekleme hızı 0, akıntı varsa ona karşı tutar); hatta yakın bekleyen teknelerde OCS 8 → 1.
- **Taktiğe sadakat:** yol veren tekne kaçmak için tramola seçeneğini K11/K12'de, rota çizilmişken ve Sol/Sağ taktiğinde o tarafa varmadan kullanmaz (yavaşlar / bordalar / orsalar).
- **Deniz kutusu** (panel): Akıntı Yok/Hafif/Orta/Güçlü (3/6/10 px/s), Dalga Yok/Küçük/Büyük (2/4 px/s kayma + orsada %5/%10 yavaşlama). Yarışta da değişir. Pusulanın altında "Akıntı … · Dalga …" etiketi.
- **Kayma (tekne başına):** Yok/Az/Çok (+3/+6 px/s, orsada %5/%10 yavaş) — yalpalayan, köre düşen sporcu. `command 'drift'`.
- Motor: `driftOf` (toplam en fazla 13 px/s), `layAngle` (akıntıda layline açılır), `crabTo` (burnu akıntıya karşı tutma), dönüşte kayma ×0.3, rüzgarda kalınca ve şamandırayı tutmayınca tramola, hat ucu nişanında ±15° ölü bölge.
- Testler: check-sim'e akıntı+dalga+kayan tekne senaryosu, fuzz'da her 3 yarıştan biri denizli (akıntılı yarışta TAKILDI penceresi 12 s). 60'lık fuzz temiz, 150'de 3 (önceki düzeyde).
- Seçili tekne kutusu panelin en üstüne alındı.

### 2026-11-12 · Simülatör: sporcu isimleri, tekne başına taktik, kalıcı kurulum
- Seçili tekne kutusunda **Sporcu** isim alanı (`b.sailor`, en fazla 18 harf); isim teknenin altında, sıralamada ve başlıkta görünür.
- Taktik (Sol / Orta / Sağ / Sağanak), hız ve "yol vermez" artık **yarışta da** her tekne için değişir: yarışta tekneye dokun → `S.command(r, cmd, arg, id)` (id yoksa senin teknen), o andan itibaren yeniden hesaplanır.
- **Kalıcı kurulum:** filo (konum, kontra, taktik, hız, isim, rota), rüzgar, sağanaklar ve parkur `localStorage` → `ps.sim.setup.v1` anahtarında; sayfa açılınca yüklenir. "Kaydı sil" (iki dokunuş) her şeyi varsayılana döndürür. "Diz" ve filo sayısı değişimi diğer teknelerin isim/taktiğini sırayla korur.
- Sonraki adım (kullanıcı planı): Firebase'e geçince aynı veri yapısı (`saveSetup`/`loadSetup`) Firestore'a taşınacak.

### 2026-11-12 · Simülatör parkur ayarı ve sağanak düzenleme
- **Parkur** kutusu (panelin üstü, yalnız kurulumda): start hattı 4-20 boy, orsa şamandırası uzaklığı 8-30 boy (50 px adım), "Varsayılan" (8 boy hat, 13 boy şamandıra) ve "Değiştirildi" uyarısı. `sim-core.js` → `setCourse({lineLen, markDist})` WORLD/LINE/MARK/engel dizilerini yerinde günceller; `newRace({course})` durumda tutar, `step` her karede uygular (hesaplar yeni parkura göre). Hat değişince tekneler hat boyunca orantılı kayar, rotalar silinir, sağanaklar parkurla taşınır; görüş alanı yeni boyuta uyar.
- **Sağanak düzenleme:** sağanağa dokun → üstte mavi çubuk: Küçült / Büyüt (%40-250), Sıfırla (ilk boyut), Sil, ×. Birden çok sağanak "Sağanak 1, 2…" diye numaralanır; seçili olan mavi çizgili. Yarışta da çalışır (o andan itibaren yeniden hesaplanır, olaylara yazılır).
- Testler: check-sim'e kısa/uzun parkur senaryoları, fuzz'da her 5 yarıştan 2'si rastgele parkur. `npm run check` temiz.
- Sonraki sohbete not: parkur yarış sırasında değiştirilemez (bilerek); istenirse ileride "geri dön → değiştir" akışı yeterli.

### 2026-11-12 · Simülatör üst çubuğu, Simülatör düğmesi, tam ekran
- Simülatör üst çubuğu sadeleşti: logo, SİM rozeti ve alt yazı kalktı; solda çerçeveli "← Senaryolar" düğmesi + "Yarış Simülatörü" başlığı, sağda Sıralama ve tam ekran.
- Ana sayfadaki Simülatör bağlantısı diğer araç düğmeleriyle aynı yapıda, turuncu zemin + çerçeve; tablette de yazısı görünür (≤420 px'te yalnız simge).
- Tam ekranda (iPad Safari) sistemin sol üstteki X düğmesi üst çubuğa biniyordu: `html.is-fs` sınıfı (fullscreenchange / webkitfullscreenchange) ile üst çubuğun soluna 76 px boşluk; iki sayfada da.

### 2026-11-12 · İA2b: S 4'ün rüzgaraltında + yeni İA2c (boşluk seçimi)
- Kullanıcı isteği: İA2b'de S 3'e yakındı; 4'ün hemen rüzgaraltına, ona yakın olsun (önemli taktik). Ayrıca İA2b'nin içinde alt senaryolar: dar/geniş boşluk, süreye ve avantaja göre seçim, 2 dk önceden bakış; şimdilik +1 senaryo, gerisi fikir.
- Yapılanlar: İA2b S rotası (apaz 7.5 s, giriş 1.6 s, bekleme 5.2 s; filoyla aynı anda doldurur), 4 ile ~44 px, paralel çıkış. Yeni senaryo İA2c `ia2c-pick-gap` + yeni katman `gaps` (app.js, README). NOTLAR'a İA2b ailesi fikir listesi. `npm run check` temiz.
- Not: filo teknesine yakın (≤45 px) senaryo teknesi yerleştirirken, sinyalde birlikte doldurmazsa (S geç/erken hızlanırsa) kural motoru filo teknesini bordalatıyor ya da yaklaşıyor; S'nin `closehauled` başlangıcını `startAt - goBefore` ile eşitle.
- Sonraki sohbete: fikir listesindeki 1 (boşluğu savun) en öncelikli görünüyor.

### 2026-11-12 · Simülatör: tekne hızı ayarı
- Kullanıcı: seçilen teknenin (kendi teknesi dahil) hızını kolayca ayarlamak, hızlı teknenin önemini göstermek istedi.
- `speedK` (0.9 / 0.95 / 1 / 1.05 / 1.1): `makeBoat` alanı, `step` hızında çarpan (sağanak ve pis rüzgarla birlikte), `command('speed')`. Kurulumda tekne seçince "Hız" segmenti; kendi teknen için alt çubukta "Hız" seçimi (yarışta da, o andan yeniden hesaplanır). Sıralamada "+10% hız". Tekne seçiliyken panelde nasıl kullanılır listesi gizlenir, ayarlar üstte görünür.
- Etki (12 tekne, 3 rüzgar): +10% genellikle ilk 1-5, −10% 7-8. Sıra kalabalık yüzünden gürültülü.

### 2026-11-12 · Simülatör: alt çubuk düzeni ve rota düzenleyici
- Kullanıcı (iPad'den): alt düğmeler düzensiz, 3 satıra taşıyordu; rota çizerken bitirmek belirsizdi, bıraktıktan sonra fazladan bacaklar ekleniyordu, geri alma yoktu.
- Alt çubuk: denetim grupları (`.cg`: büyük harf etiket üstte, gövde altta, aynı 38 px yükseklik, aralarında ince çizgi). Rüzgar ve Filo "stepper" (− değer +), Sağanak ve Göster segment. Masaüstünde tek satır; tablette (641-1279 px, dikey ve yatay) üst satır "Senin teknen", alt satır diğer dört grup; telefonda yana kayan tek satır, "Senin teknen" başta.
- Rota düzenleyici: "Rota" düğmesi sahnenin üstünde turuncu **rota çubuğu** açar (yanıp sönen nokta, "N bacak · devam et ya da Tamam'a bas"; Açılı/Serbest; Geri al (Ctrl+Z); Temizle; Vazgeç (Esc); yeşil, nabız atan **Tamam** (Enter)). Taslak Tamam'a kadar uygulanmaz; var olan rota taslağa yüklenir (geri alarak düzeltilir). Çizim açıkken oynat → rota kaydedilir. Çizim sırasında diğer gruplar soluklaşır. Rota varsa düğme "Rota ✓".
- Panel açıkken (masaüstü) rota çubuğu panelin solunda ortalanır (`:has`).

### 2026-11-12 · Simülatör: açılı rota, sakin yol verme, yakın mesafe
- Kullanıcı isteği: rota varsayılan olarak orsa açısında düz bacaklarla çizilsin (serbest çizim de kalsın); hak sahibi her zaman rotasında kalsın, yol veren sakince tramola ya da arkadan geçsin; Optimist'ler daha yakın geçebilsin; pis rüzgar ortak yerden yönetilsin.
- `sim.js`: "Açılı / Serbest" seçimi (varsayılan Açılı). Açılı: her sürükleme bir bacak; yön orsadan darsa rüzgara 45°'ye (sancak/iskele), değilse 5° adımlara oturur; ok uçlu önizleme + "orsa · sancak kontra / apaz / pupa" etiketi; sonraki bacak öncekinin ucundan; düğme "Bitti" olur. Her bacak hemen uygulanır.
- `sim-core.js`: hak sahibi K14 kaçışını yalnızca karşıdaki "yol vermez"se (dmin<24) ya da temas kaçınılmazsa (dmin<14, tc<0.9) yapar; yoksa rotasında kalır. Yol verme mesafeleri `GW_DETECT`/`GW_SAFE` = 34 px (eskiden 44/50), tramola açıklık eşiği 22/26 (eskiden 26/32). Rota izlerken tramola/kontra değişimi de K13 açıklık kontrolüyle (açık olana kadar bekler; koridor 3 katını aşarsa zorla).
- Pis rüzgar zaten `engine.SHADOW` ortak koduyla (pis rüzgar sohbeti); simülatörde ayrı hesap yok.
- Bilinen: protesto sayısı yarış başına ~3 (yakın mesafe yüzünden biraz arttı).

### 2026-11-12 · Pis rüzgarı tüm animasyonlarda ortak yönet
- Kullanıcı isteği: İA2'deki pis rüzgar (ve rozetler) tüm animasyonlarda olsun, tek yerden yönetilsin, boyu ~1 tekne boyu olsun.
- Yapılanlar: `engine.SHADOW` + `shadowStrength/shadowOf/shadowK/shadowPolygon`; `rules.simulate` filoyu gölgede yavaşlatır; `SailRules.buildScene/warpForShadows` senaryo teknelerini esnetir; app.js tek koni çizimi + mor "Pis rüzgar · hız −%" rozeti + Katmanlar anahtarı; sim-core/sim.js ortak hesaba geçti; check-scenarios uygulamayla aynı rotaları denetliyor. İA2/İA2b'deki `shadows: {from,to}` kaldırıldı (her an açık). Kural rozetleri (K10/11/12/14, HATA) zaten tüm senaryolarda ortak `drawNotes` ile çiziliyordu; `sag` İA2'ye özgü bırakıldı.
- Sonuç: `npm run check` temiz. En büyük kayma A2'de G (34 px), diğerlerinde ≤9 px.
- Sonraki sohbete not: istenirse `sag` da Katmanlar'dan her start senaryosunda açılabilir hale getirilebilir.

### 2026-11-12 · Simülatör 2c: rota çizme
- `sim-core.js`: `routeNext` (yakın / geçilmiş / hattın dibindeki noktaları atlar), `followRoute` (açık seyirde doğrudan, orsada koridor + layline ile zikzak, kenar koruması), rota bitmeden şamandıra dönüşü başlamaz. `command('route', pts|null)`.
- `sim.js`: çizim modu (imleç artı, Esc iptal, yarış oynuyorsa duraklar), kalan rota turuncu kesikli çizgi + bitiş noktası; × rotayı siler. Kurulumda çizilen rota filo yeniden dizilince korunur.
- Denetim: check-sim'e 2 rota durumu (her nokta 80 px içinden geçilmeli); fuzz her 4 yarıştan birinde senin teknene rastgele rota.
- Bilinen: masaüstünde (1400 px) alt çubuk artık iki satır (Filo alta iniyor).

### 2026-11-12 · Simülatör 2b: protesto ve iki tur ceza
- `sim-core.js`: `classify` (kim yol verir), `protest`, `penalty` evresi (sola 720°, %55 hız, herkese yol verir K22), `ignoresRules`. Protesto koşulu: hak sahibi K14 kaçışı yaptı, kendisi yol vermekle yükümlü değil, son 2.5 s'de tramola atmadı; karşı taraf "yol vermez" ya da tramolayla çok yakına girdi (dmin<14, tc<1). Temasta yol vermesi gereken + (kural bilmeyen hak sahibi K14) ceza alır.
- Düzeltmeler: ceza start etmeden/hat yakınında başlamaz (OCS hali kayboluyordu); ceza bekleyen tekne şamandırayı dönünce önce uzaklaşır, cezayı atar, sonra bitirir.
- Arayüz: seçili tekne "Davranış: Kurallara uyar / Yol vermez", alt çubukta "Yol vermez" (senin teknen), etikette kırmızı "!", ceza turunda kırmızı kesikli halka, olaylarda kırmızı protesto satırı, sıralamada "Ceza turu" / "N ceza".
- Bilinen: kurala uyan yapay tekneler de yarış başına ~2-3 protesto alıyor (kalabalıkta geç tramola); gerekirse eşik `dmin < 14` sıkılaştırılır. Fuzz 150'de birkaç TAKILDI (şamandıra kalabalığı, eskiden de vardı).
- Sıradaki: 2c rota çizme.

### 2026-11-12 · İA2: yay eğrisi, pis rüzgar, İA2b
- Yapılanlar: Yeni senaryo katmanları `sag` (filo burunlarından Catmull-Rom eğri + taralı alan + "ortada N boy geride" etiketi) ve `shadows` (filo teknelerinin 4 boyluk rüzgar gölgesi konisi, sim.js ile aynı geometri; koniye giren senaryo teknesine "Pis rüzgar" notu). İA2'ye eklendi. Yeni senaryo İA2b `ia2b-no-sag`: yay yok, S boşluğa herkesle aynı hizada. README'ye katman formatı yazıldı. `npm run check` temiz.
- Yarım kalan: S'nin hızı gölgede gerçekten düşmüyor (buildTrack filoyu bilmiyor).

### 2026-11-12 · Simülatör 2a: önceden hesaplama, hız, pis rüzgar
- Start'ta `SailSim.runToEnd` yarışı sonuna kadar hesaplar (0.1 s kareler); `sim.js` kareler arasını ara değerleyerek oynatır. Değişiklik (`applyChange`: rüzgar, sağanak ekle/taşı/temizle, Tramola, taktik) o karenin kopyasından ileriye yeniden hesaplar. Zaman çubuğu ileri de sarar; panelde "Tahmin: senin teknen N. olacak".
- Pis rüzgar: her teknenin rüzgaraltında 4 boy, genişleyen koni; içindeki tekne en fazla %30 yavaşlar (`shadowAt`). Senin teknen gölgeye girince olay listesine yazılır. "Göster: Hız / Pis rüzgar" düğmeleri; hız knot olarak (orsa 55 px/s ≈ 3.5 kn), sağanakta yeşil ↑, gölgede kırmızı ↓.
- Sıradaki: 2b protesto/ceza turu, 2c rota çizme.

### 2026-11-12 · Simülatör: şamandıra dönüşü ve uç durumlar
- Kullanıcı bildirdi: geriye çekilen tekne şamandırayı altından/yanlış taraftan döndü. Sebep: şamandıradan kaçınma "engel sağdaysa sola dön" diyordu, iskele kontrayla soldan gelen tekne şamandıranın solundan çıkıp yanlış yönde dönüyordu; dönüş de sabit "sola dön" ile yapılıyordu.
- Düzeltme: dönüş artık şamandıra etrafında 38 px yarıçaplı çember (şamandıra hep iskelede); giriş yalnızca rüzgarüstü yarıdan; şamandıradan kaçış hep sağa; kural kaçış rotaları şamandırayı da hesaba katıyor; K18'de yol veren yavaşlıyor.
- Yeni uç durumlar: hattı uçların dışından geçen start sayılmaz (geri dönüp içinden geçer), kenara giden tekne bekler/tramola atar, pin'e takılan bordalayarak dolaşır, üst üste bırakılan tekne boş yere kayar, rüzgar ±40° ile sınırlı.
- `scripts/fuzz-sim.mjs`: rastgele yerleşim/rüzgar/sağanakla yarışlar; YANLIŞ_TARAF, ALTINDAN, ÇARPTI, BİTMEDİ, TAKILDI, ALAN_DIŞI, HAT_DIŞI arar (`--iz=yarış:tekne` ile iz). `npm run check` 60 yarış koşar. 150 yarışta kalan: şamandıra kalabalığında nadiren 8 s yavaş ilerleme (TAKILDI).
- Kullanıcının yeni istekleri (sıradaki işlere eklendi): ileriye yeniden hesaplama, hız göstergesi + pis rüzgar, protesto/ceza turu, rota çizme.
### 2026-11-12 · Arayüz boşluk ve taşma düzeltmeleri
- Kullanıcı geri bildirimi: "Yarış başladı" yazısı sayaç kutusundan taşıyordu; bilgi kartında uzun "Senaryo özeti" kesiliyordu; genel padding hataları.
- Yapılanlar: sayaç kutusu ve tekne etiketi genişliği ölçülerek (`textW`, canvas measureText) hesaplanıyor; kartta adım metni + Tekneler + Senaryo özeti tek kaydırılabilir alanda (`.info-scroll`), gezinti düğmeleri en altta sabit; telefonda da Senaryo özeti açılabiliyor; masaüstünde parkur kartın altında kalmıyor (görünüm sağa kayıyor); hazırlık bayrağı yazısına kontur. NOTLAR'a "Arayüz kontrol listesi" eklendi. 11 senaryo × 4 cihaz son anda tarandı; taşan HTML öğesi yok.
- Ek (aynı gün): tekne notları (segment `note`, kural motoru notları) artık kutulu rozet (`drawNotes`): sarı = bilgi, kırmızı = "HATA:". Tekne gövdesi/etiketi, hakem botu, pin, şamandıra ve diğer notlarla çakışırsa yukarı (sonra aşağı) kaydırılır, ince çizgiyle tekneye bağlanır.
- Yarım kalan: layline / transit etiketleri hâlâ kutusuz; oynatırken kaydırılan not bir konumdan diğerine zıplayabilir.


### 2026-11-12 · Bekleyen teknelerde yelken pırpırlaması
- Yapılanlar: `engine.sailPose` (hıza ve rüzgar açısına göre bumba açısı, sallanma, titreme) ve `engine.sailShape` (dalgalanan yelken yolu) eklendi; `app.js` ve `sim.js` bunları kullanıyor. Senaryo verisine dokunulmadı.
- Sonraki sohbete not: A8/A17 (geri yelken, backing) için `sailPose`'a ters karın eklenebilir.

### 2026-11-12 · Yarış simülatörü (1. aşama)
- Kullanıcı isteği: hazır animasyonlardan ayrı, kendi kurduğu yarış. Karar (kullanıcı): senin teknen otomatik gider + Tramola / taktik komutları.
- Yapılanlar: `sim.html` + `css/sim.css` + `js/sim-core.js` + `js/sim.js`; ana sayfaya "Simülatör" bağlantısı; `build.mjs` çoklu sayfa; `scripts/check-sim.mjs` `npm run check`e eklendi. Masaüstü 1400×800, iPhone 13, iPad Pro 11 ekran görüntüleri kontrol edildi.
- Yarım kalan: 2. aşama listesi "Sıradaki işler"de. Kalabalık şamandıra dönüşünde birkaç temas oluyor (olay listesinde kırmızı).
- Sonraki sohbete not: simülatör parametreleri `sim-core.js` başında (hat, şamandıra, START_AT=12 s × CLOCK_SCALE 5 = 1:00, GUST_GAIN). Varsayılan filo `defaultFleet`.
### 2026-11-12 · Arayüz tasarımı v3 (profesyonelleştirme)
- Yapılanlar: üst çubuk, senaryo seçici (arama + ızgara kartlar + meta), alt çubuk (adım işaretli zaman çizelgesi, hız düğmeleri), bilgi kartı (adım çubuğu, Tekneler + rol rozetleri), Katmanlar menüsü (anahtarlar + sürüm), HUD (pusula çentikleri, sayaç kutusu, 5 sn kala kırmızı). Sahnede tekne etiketi kompakt rozet. Tüm senaryolarda tekne adları kısaltıldı + `role`. Masaüstü 1400×800, iPad Pro 11 yatay/dikey, iPhone 13 dikey/yatay ekran görüntüleriyle kontrol edildi; `npm run check` temiz.
- Yarım kalan: dikey telefonda parkur hâlâ küçük (eski konu); B8'de şamandıra etiketi "Orsa şamandırası (…)" senaryo metninde. Sahnedeki adım notları (ör. "Yol veriyor · K11") aynı sarı yazı; istenirse onlar da rozet yapılabilir.
- Sonraki sohbete not: yeni senaryoda her scripted tekneye kısa `name` + `role` ver; kalabalık (`crowd`) teknelerinde rol yok, gri numara.

### 2026-11-12 · İA2: S hattın uzantısından bakar
- Yapılanlar: Kullanıcı geri bildirimi: S çok aşağıda bekliyordu. S artık (88,452) noktasında, pin dışında tam hattın uzantısında, hakem botuna dönük 4 sn bakıyor; sonra 160° ile hattın altına iniyor, apaz ile ortaya gidiyor. Ortadaki boşluk ve start anı (t=24, ≈ 446,458) eskisiyle aynı. Adımlar t=2 ve t=4'e çekildi, transit katmanı 0-6 sn. `npm run check` temiz.
- Yarım kalan: yay eğrisi görseli, rüzgar gölgesi görseli, "yay yok" varyantı.
### 2026-11-12 · İA2 hat yayı + senaryo kartları
- Yapılanlar: İA2 (600 px hat, 9 teknelik yay: `crowd[].back` px ile ortadakiler 2.5-3.5 boy geride; S pin tarafından transitle hattı görür, apaz ile ortaya gelir, boşluğa komşularından yukarı yerleşir, sinyalde 2 boy önde; "yay yoksa" adımı). Yeni: `scn.sightline` transit katmanı, `crowd[].back`. NOTLAR'a "Senaryo kartları" tablosu: her senaryo için ayrı sohbet açılabilir, kart güncellenir.
- Yarım kalan: yayın kendisi için eğri çizim yok (tekne dizilimi yeterli görünüyor); ortadaki filo teknelerinin start sonrası K12 ile fazla yavaşlaması (f6 7 s geç).
- Sonraki sohbete not: senaryo bazlı sohbetlerde CLAUDE.md protokolü aynen geçerli; kart satırı + oturum günlüğü güncellenir.

### 2026-11-12 · İA1: X grubun en altındaki teknenin dibine daha yakın
- Kullanıcı isteği: X apaz gelip en alttaki teknenin altına daha yakın girsin, kendi rüzgaraltında biraz boşluk kalsın. X bekleme noktası 32 px sağa (start x 172): tramola sonrası filo 1'in ~45 px (1 boy) altında; eskiden 75 px idi. X bekleme süresi 8.3 → 7.4 s (filo ile aynı anda doldurur, sinyalde yan yana; yoksa filo 1'in kıçına giriyordu), son orsa segmenti 14.9 s. `npm run check` temiz.
- Yelken pırpırlaması (bekleyen teknelerde yelkenin rüzgara göre sallanması) ayrı sohbette, engine.js'te yapılıyor.

### 2026-11-12 · İA1 düzeltme: dışarıdan start yok, burun hattın altında
- Kural: start edemeyen tekne hattın dışından ÇIKMAZ; ya rüzgarüstüne tramola ya da bordalayıp/kavança ile herkesin arkasından hattın içinden geçer. Z buna göre: pin'i kurtaramayınca bordalar, hattın altından sağa gider, herkesin arkasından geçer. `expectOutside` kullanımı artık yalnızca "ders olarak gösterilen" çizgi dışı için (A3 P2).
- Bekleyen teknenin burnu sinyalden önce hattı geçmemeli (X: tramola noktası 15 px aşağı, bekleme sürüklenmesi 0.03).
- Kural motoru: risk için yakınsama şartı (`dmin < d−6`; paralel seyir risk değil); "luff" manevrası artık w±32° (sıkıştırma; tekne durmuyor). Sebep: tek bir orsalama zincirleme yavaşlamaya ve kalabalığın birbirine girmesine yol açıyordu.
- A1 filo konumları A'nın iskele rotasına göre yeniden (basamak farkı ≥1 boy olacak şekilde).

### 2026-11-12 · İA1 yeniden: solda bekle, apaz gel, hatalı davranışlar
- Kullanıcı düzeltmesi: X pin'in SOLUNDA bekler, apaz (heading ~92°) ile hattın altından gelir, rüzgara baş vermiş grubun en alttaki teknesinin rüzgaraltına tramola atar. Pin layline'ı baştan görünür ("tramola bu çizginin ÜSTÜNDE"). Hatalı tekneler: Z layline'ın altında tramola → pin'i kurtaramaz, çizgi dışı; Y geç gelir (25 s kala) → boşluk yok, herkesin altından, 15-20 s geç. "HATA:" ile başlayan notlar kırmızı çizilir.
- Öğrenilen: apaz yaklaşımında ivme (tau 1.0) hesaba katılmalı; 5.2 s'de ~195 px. Tramola dönüşü (turn 1.3 s) tekneyi ~(+24,−26) px taşır; bekleme konumu buna göre geriden seçilmeli.
- Sonraki sohbete not: hatalı davranış rozeti ("HATA:") artık standart; Start paketi 5'te kullanılsın. Layline etiketi uzun; kalabalıkta teknelerle çakışabilir.

### 2026-11-12 · Fodepar hafif, start bayrakları (A12), İleri Taktik grubu (İA1)
- Yapılanlar: A2'de erken tekne yarım boy geçip duruyor ve geri dönüyor; A12 (U bayrağı, 1 dk kala bayrak iner, burnu çizgide olan UFD; P/I/siyah farkları adımlarda; clockScale 4); yeni kategori İleri Taktik + İA1 (pin dışında iskele bekleme, grubun altına tramola, K10/13/15/11; clockScale 3). HUD: hazırlık bayrağı çizimi ve dakika:saniye sayaç.
- Yarım kalan: A12'de yalnızca U bayrağı canlandırılıyor; P/I/siyah için ayrı varyant (ya da bayrak seçici) istenebilir. 5-4-1-0 sinyal sırası ve AP/Birinci Tekrar ayrı senaryo.
- Sonraki sohbete not: İleri Taktik H2–H6 konuları KONULAR.md'de; Start paketi 5 (A16/A17) ile birlikte planlanabilir.

### 2026-11-12 · Kalabalık start ve hattın dibinde bekleme (kullanıcı düzeltmesi)
- Yapılanlar: `crowd` alanı + rules.simulate'te start modeli (goBefore, tau, rulesFrom); A2 yeniden (hattın dibinde bekleme, 7 filo teknesi, 2 sıra); A3 geniş hat 600 px, rüzgar 335°, P1/P2/P3 de bekliyor, 2 filo; A4'te C bekliyor + 6 filo; A1'de 4 filo. Tekne ekle/çıkar arayüzden gizlendi. Checker kalabalığı da denetliyor (`filoN`), en yakın yaklaşma zamanı ve konumuyla.
- Öğrenilen: büyük bias'ta hat boyunca dizilen tekneler neredeyse kıç kıça gelir (yan mesafe = Δx·sin(rota–hat açısı)); slotları seyrek koymak gerekir. Hakem botu çevresi 60 px boş kalmalı (hold konumu sağa kayar).
- Sonraki sohbete not: Start paketi 5 (ileri kalabalık) bu altyapıyı kullanmalı; `crowd` teknelerine senaryo bazlı davranış (ör. `behavior:'barging'`, `'late'`) eklenebilir.

### 2026-11-12 · İş tanımı: ileri seviye kalabalık start + uygulama adı
- Kullanıcı istedi: kalabalık, geniş hatlı, pin avantajlı ve pin'de karmaşa olan start; bekleme taktikleri; Optimist'lerin hakem botunda rüzgara baş verip yer mücadelesi; geçerli kurallar ve hatalı hareketler. Ayrı sohbette yapılacak → "Sıradaki işler → Start paketi 5" ayrıntılı tanım.
- Uygulama adı için ayrı sohbet → "Sıradaki işler → Uygulama adı".

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
