# ⛵ Professional Sailing

Yarışa hazırlanan genç yelkenciler için **etkileşimli taktik ve kural animasyonları**.
Tekne, yelken (rüzgara göre bumba konumu), tramola/kavança, start çizgisi, şamandıra ve rüzgar
değişimleri basit ama doğru bir modelle canlandırılır; her senaryo zamanlı açıklama adımlarıyla gelir.

## Canlı görüntüleme (GitHub Pages)

Site: **https://seyhundev.github.io/professional-sailing/**

Yayın otomatiktir: `main` dalına her push'ta GitHub Actions (`.github/workflows/deploy.yml`)
`scripts/build.mjs` ile `src/` klasörünü derleyip Pages'e yükler. Tek seferlik ayar:
**Settings → Pages → Source: "GitHub Actions"**.

### Önbellek sorunu neden yaşanmaz?
Derleme, her CSS/JS dosyasının adına içerik özetini ekler (`app.e629d783.js` gibi) ve `index.html`
içindeki bağlantıları günceller. İçerik değişince dosya adı da değişir; tarayıcı eski dosyayı
asla yeni HTML ile eşleştiremez. Sayfanın sağ altındaki sürüm damgası (commit + tarih) hangi
sürümün yüklendiğini gösterir.

### Yerelde çalıştırma
```bash
npm run dev        # http://localhost:8000  (src/ doğrudan, derleme gerekmez)
npm run build      # dist/ üretir
npm run preview    # http://localhost:8080  (dist/ ile aynı yayın hâli)
```

## Teknoloji kararı ve gereksinimler

| Gereksinim | Karar |
|---|---|
| Her cihazda (telefon, tablet, projeksiyon) kurulumsuz açılsın | **HTML + CSS + vanilla JavaScript**, derleme adımı yok |
| Tekne / yelken / rüzgar vektör olarak çizilsin, ölçeklenince bozulmasın | **SVG** (Canvas değil: her tekne bir DOM nesnesi, tıklanabilir, CSS ile stillenebilir) |
| Zamanda ileri-geri sarılabilsin, adımlara atlanabilsin | Senaryolar önceden **örneklenmiş rota** (track) üretir; her kare `t` ile örneklenir |
| Senaryo yazmak kolay olsun (kod değil, tanım) | `docs/js/scenarios.js` içinde segment tabanlı tanım: `closehauled / run / heading / hold` |
| Kalabalık start hatları | Senaryoda `crowd` ile tanımlanan filo, `rules.js` ile birlikte simüle edilir; hattın dibinde bekler, sinyalde çıkar ve karşılaşmalarda RRS 10/11/12/14'e göre kendiliğinden manevra yapar; uygulanan kural teknenin üstünde yazar. (Arayüzden tekne ekle/çıkar şimdilik kapalı; kod duruyor.) |
| Ücretsiz yayın | GitHub Pages |
| Python gerekli mi? | Hayır. Python yalnızca ileride veri (sporcu kayıtları, sonuçlar) tarafı için; animasyon tarafı tarayıcıda |

Neden React/Three.js/Unity değil? Hedef "basit, anlaşılır, hızlı üretilen" 2D üstten görünüş animasyonları.
Framework bağımlılığı yok; ileride gerekirse SVG katmanı olduğu gibi React'e taşınabilir.

## Kullanım

- Üst çubuk: senaryo seçimi, **Bilgi** kartı aç/kapat, **Katmanlar** (rüzgar çizgileri, merdiven basamağı, isimler, izler), tam ekran.
- Alt çubuk: oynat/duraklat, başa al, hız, zaman çubuğu.
- Bilgi kartı: **Canlı takip** açıkken animasyonla birlikte adım adım ilerler. Önceki/Sonraki ile kendiniz gezerseniz canlı takip kapanır; **Bu ana git** animasyonu o adımın anına götürür.
- Klavye: Boşluk oynat/duraklat, ← → adımlar arasında gezinme, `i` bilgi kartı.

### Yarış simülatörü (`sim.html`)

Üst çubuktaki **Simülatör** bağlantısıyla açılır. Hazır animasyonlardan bağımsızdır:

- **Kurulum:** tekneleri sürükleyip start hattının dibine yerleştir; turuncu tekne senin teknen. Bir tekneye dokunup kontrasını (sancak/iskele), taktiğini (sol / orta / sağ / sağanak avcısı) değiştir ya da onu "benim teknem" yap. Filo 2-16 tekne.
- **Rüzgar:** ◀ ▶ ile 5° döndür (yarış sırasında da). Hat avantajı (pin / hakem botu) ve layline'lar anında güncellenir; bütün tekneler rotasını uydurur.
- **Sağanak (gust):** sol ya da sağ tarafa ekle, sürükleyerek taşı. İçindeki tekneler %25 hızlı; "sağanak avcısı" tekneler oraya yönelir.
- **Start:** 1 dakikalık geri sayım; tekneler hattın dibinde bekler, zamanı gelince doldurup hattı geçer. Erken geçen OCS olur ve geri döner. Sonra herkes orsa şamandırasına gider (layline'da tramola) ve şamandırayı iskeleden döner; sıra dönüş sırasıdır.
- **Kurallar:** K10, K11, K12, K13, K14, K18 (şamandırada yer ver), K22 (OCS dönen tekne yol verir). Yol veren teknenin üstünde not çıkar, olay listesine yazılır; temaslar kırmızı.
- **Senin teknen:** otomatik gider; **Tramola** düğmesi (klavye `T`) ya da taktik seçimiyle müdahale edersin.
- **Önceden hesaplama:** start'ta yarış sonuna kadar hesaplanır; zaman çubuğuyla ileri-geri sarılır, panelde tahmini sıra görünür. Rüzgar, sağanak ya da komut değişince yarış o andan itibaren yeniden hesaplanır.
- **Hız ve pis rüzgar:** teknelerin altında knot; sağanakta yeşil ↑, başka teknenin rüzgar gölgesinde kırmızı ↓ (en fazla %30 yavaş). "Pis rüzgar" düğmesi gölge konilerini gösterir.

## Dosya yapısı

```
src/
  index.html          arayüz iskeleti
  css/style.css
  js/engine.js        rüzgar, kontra, yelken açısı, hız modeli, rota üretici (buildTrack)
  js/rules.js         kural motoru: eklenen tekneler K10/K11/K12/K14'e göre manevra yapar
  js/scenarios.js     senaryo tanımları (A1, A2, B1, B8, C1 ...)
  js/app.js           çizim (SVG), zaman döngüsü, kontroller, bilgi kartı, tekne ekleme
  sim.html            yarış simülatörü sayfası (css/sim.css)
  js/sim-core.js      simülatör çekirdeği (DOM yok): canlı adım, taktik, yol hakları, sıralama
  js/sim.js           simülatör arayüzü: sürükle-bırak, rüzgar/sağanak, geri sarma, panel
scripts/check-sim.mjs simülatör denetimi (npm run check içinde)
scripts/build.mjs     derleme: hash'li dosya adları + sürüm damgası → dist/
.github/workflows/    main'e push → otomatik yayın
KONULAR.md            müfredat / konu listesi ve durumları
```

## Yeni senaryo eklemek

`src/js/scenarios.js` içine bir nesne ekleyin:

```js
S.push({
  id: 'b2-rule11', category: 'Kurallar', topic: 'Temel hak kuralları', title: 'B2 · Kural 11 ...', summary: '...',
  duration: 15, baseSpeed: 50,
  wind: 0,                                    // ya da [{t:0,from:0},{t:10,from:-15}] (salınım)
  line: { pin:{x:250,y:420}, boat:{x:750,y:420} },   // isteğe bağlı start çizgisi
  marks: [{ x:480, y:170, label:'...', zone:true }],  // isteğe bağlı şamandıra (+zone)
  boats: [{ id:'L', name:'Rüzgaraltı', role:'hak', color:'#2a9d8f', start:{x:600,y:600,h:315}, v0:50,
            segs:[{mode:'closehauled',tack:'starboard',dur:6},{mode:'heading',h:300,dur:4,turn:1}] }],
  // name: kısa (≤ 25 harf), uzun açıklama adımlarda. role: 'hak' (hak sahibi) | 'yol' (yol verir)
  //        | 'dogru' (doğru örnek) | 'hata' (hatalı) — sahnede etiket rengi + simge, kartta rozet olur.
  steps: [{ t:0, title:'...', text:'...' }],
  addBoat: { pin:{x:..,y:..}, middle:{..}, committee:{..} }
});
```

Segment modları: `closehauled` (rüzgara 45°, kontrayı takip eder; rüzgar dönerse rota da döner),
`run` (pupa 150°), `heading` (sabit pusula), `hold` (orsalayıp bekleme, yelken boş).
`turn` dönüş süresi (s), `speed` hız çarpanı, `v0` başlangıç hızı.

## Yol haritası

Konu listesi ve öncelikler için `KONULAR.md`. Sıradaki: Kural 11 (rüzgaraltı/rüzgarüstü), layline ve overstand,
geniş gir – dar çık, kalıcı rüzgar dönüşü, barging.

Teknik sıradakiler: rüzgar gölgesi (dirty air) görselleştirme, layline overlay, senaryo durumunu URL'de paylaşma,
mobil kontroller, Türkçe/İngilizce dil seçeneği.

## Kaynaklar

- [World Sailing RRS 2025-2028 – Dave Perry özet](https://www.ussailing.org/wp-content/uploads/2024/12/Quick-Overview-of-Changes-to-2025-Rules-Dave-Perry-3Dec2024.pdf)
- [US Sailing – Around the Race Course (kurallar şemalı)](https://www.ussailing.org/wp-content/uploads/2025/03/Around-the-Race-Course-ver.2025.03.24.pdf)
- [Scuttlebutt – Rule 18 (2025-2028)](https://www.sailingscuttlebutt.com/2024/11/07/rule-18-learn-the-2025-2028-racing-rules)
- [RYA Youth Sailing Scheme – Start Racing](https://www.rya.org.uk/training/courses/Youth-Sailing-Scheme-Start-Racing-YSSRACE)
- [Llandegfedd – Intermediate Racing Programme](https://llandegfedd.org.uk/docs/Intermediate-Racing-Programme.pdf) · [Advanced](https://llandegfedd.org.uk/docs/Advanced-Racing-Programme.pdf)
- [SailZing – Skills kit (start çizgisi egzersizleri)](https://sailzing.com/wp-content/uploads/2021/05/Skills-kit-sample-X.pdf)
- [HKSSA – Optimist Skipper kursu içeriği](https://sites.google.com/view/hkssa2020/2020-summer-program/optimist-sailing-courses-details)
