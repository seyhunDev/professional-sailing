# ⛵ Professional Sailing

Yarışa hazırlanan genç yelkenciler için **etkileşimli taktik ve kural animasyonları**.
Tekne, yelken (rüzgara göre bumba konumu), tramola/kavança, start çizgisi, şamandıra ve rüzgar
değişimleri basit ama doğru bir modelle canlandırılır; her senaryo zamanlı açıklama adımlarıyla gelir.

## Canlı görüntüleme (GitHub Pages)

Uygulama tamamen statiktir (derleme yok, sunucu yok). Yayınlamak için:

1. GitHub'da depo adını değiştir: **Settings → General → Repository name → `professional-sailing`**.
2. Bu dalı `main` ile birleştir (ya da Pages kaynağı olarak bu dalı seç).
3. **Settings → Pages → Build and deployment → Source: "Deploy from a branch" → Branch: `main`, Folder: `/docs`** → Save.
4. 1-2 dakika sonra adres: `https://<kullanıcı-adı>.github.io/professional-sailing/`

Yerelde görmek için `docs/index.html` dosyasını tarayıcıda açmak yeterli; ya da:

```bash
cd docs && python3 -m http.server 8000   # http://localhost:8000
```

## Teknoloji kararı ve gereksinimler

| Gereksinim | Karar |
|---|---|
| Her cihazda (telefon, tablet, projeksiyon) kurulumsuz açılsın | **HTML + CSS + vanilla JavaScript**, derleme adımı yok |
| Tekne / yelken / rüzgar vektör olarak çizilsin, ölçeklenince bozulmasın | **SVG** (Canvas değil: her tekne bir DOM nesnesi, tıklanabilir, CSS ile stillenebilir) |
| Zamanda ileri-geri sarılabilsin, adımlara atlanabilsin | Senaryolar önceden **örneklenmiş rota** (track) üretir; her kare `t` ile örneklenir |
| Senaryo yazmak kolay olsun (kod değil, tanım) | `docs/js/scenarios.js` içinde segment tabanlı tanım: `closehauled / run / heading / hold` |
| Tekne ekle/çıkar, uç seçimi (pin / orta / hakem botu), kontra seçimi | Arayüzden; eklenen tekneler kurallı basit simülasyonla seyreder (ör. Kural 10'da iskele tekne bordalar) |
| Ücretsiz yayın | GitHub Pages |
| Python gerekli mi? | Hayır. Python yalnızca ileride veri (sporcu kayıtları, sonuçlar) tarafı için; animasyon tarafı tarayıcıda |

Neden React/Three.js/Unity değil? Hedef "basit, anlaşılır, hızlı üretilen" 2D üstten görünüş animasyonları.
Framework bağımlılığı yok; ileride gerekirse SVG katmanı olduğu gibi React'e taşınabilir.

## Dosya yapısı

```
docs/
  index.html          arayüz iskeleti
  css/style.css
  js/engine.js        rüzgar, kontra, yelken açısı, hız modeli, rota üretici (buildTrack)
  js/scenarios.js     senaryo tanımları (A1, A2, B1, B8, C1 ...)
  js/app.js           çizim (SVG), zaman döngüsü, kontroller, tekne ekleme
KONULAR.md            müfredat / konu listesi ve durumları
```

## Yeni senaryo eklemek

`docs/js/scenarios.js` içine bir nesne ekleyin:

```js
S.push({
  id: 'b2-rule11', category: 'Kurallar', title: 'B2 · Kural 11 ...', summary: '...',
  duration: 15, baseSpeed: 50,
  wind: 0,                                    // ya da [{t:0,from:0},{t:10,from:-15}] (salınım)
  line: { pin:{x:250,y:420}, boat:{x:750,y:420} },   // isteğe bağlı start çizgisi
  marks: [{ x:480, y:170, label:'...', zone:true }],  // isteğe bağlı şamandıra (+zone)
  boats: [{ id:'L', name:'Rüzgaraltı', color:'#2a9d8f', start:{x:600,y:600,h:315}, v0:50,
            segs:[{mode:'closehauled',tack:'starboard',dur:6},{mode:'heading',h:300,dur:4,turn:1}] }],
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
