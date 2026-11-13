/* Senaryo tanımları. Her senaryo:
   id, kategori, başlık, özet, süre, rüzgar, start çizgisi / şamandıralar,
   scripted tekneler (segment listesi), adımlar (zamanlı açıklama), tekne ekleme noktaları.
   Koordinat alanı: 1000 x 680.
*/
(function (global) {
  const S = [];

  // ---------- A1: Start çizgisi avantajı ----------
  S.push({
    id: 'a1-line-bias',
    category: 'Taktik', topic: 'Start',
    title: 'A1 · Start çizgisi avantajı (line bias)',
    summary: 'Çizgi rüzgara tam dik değilse bir uç diğerinden daha "rüzgarüstünde"dir. O uçtan start alan tekne, aynı kontrada aynı hızla gitse bile öndedir.',
    duration: 13,
    baseSpeed: 48,
    wind: 15,                                     // rüzgar KKD'den → hakem botu (sağ) ucu avantajlı
    line: { pin: { x: 300, y: 600 }, boat: { x: 700, y: 600 } },
    startAt: 0,
    rungs: { boat: 'B', from: 1.5 },
    boats: [
      { id: 'A', name: 'Pin ucu', color: '#e4572e',
        start: { x: 336, y: 614, h: 330 },
        segs: [
          { mode: 'closehauled', tack: 'starboard', dur: 5, turn: 0 },
          { mode: 'closehauled', tack: 'port', dur: 8, turn: 1.5 }
        ], v0: 48 },
      { id: 'B', name: 'Hakem botu ucu', role: 'dogru', color: '#1f77b4',
        start: { x: 644, y: 614, h: 330 },
        segs: [{ mode: 'closehauled', tack: 'starboard', dur: 13, turn: 0 }], v0: 48 }
    ],
    steps: [
      { t: 0, title: 'Aynı anda start', text: 'A ve B start sinyalinde aynı anda, aynı hızla, sancak kontra orsa çıkıyor. Rüzgar 15° sağdan (hakem botu tarafından) geliyor; çizgi ise yatay. Yani hakem botu ucu rüzgara daha yakın.' },
      { t: 1.5, title: 'Merdiven basamağı', text: 'Kesikli çizgi rüzgara DİK bir "merdiven basamağı"dır. Rüzgara karşı yarışta kim önde sorusunun cevabı bu çizgidir: B\'nin basamağı A\'nın önünde. A çizgiye dik ilerlediği hâlde B\'nin gerisindedir.' },
      { t: 5, title: 'A tramola atıyor', text: 'A iskele kontraya tramola atıp B\'ye doğru gidiyor. Gerçekten geride mi? Kural 10 gereği iskele kontralı A, sancak kontralı B\'ye yol vermek zorunda; zaten onun arkasından geçecek.' },
      { t: 10, title: 'Sonuç', text: 'A, B\'nin kıç tarafından geçiyor. Farkın tek sebebi start çizgisinin avantajlı ucu. Start öncesi mutlaka ölçün: rüzgara karşı durup çizgiye bakın; burnunuzun gösterdiği tarafın GERİSİNDE kalan uç avantajlıdır. Pratik yol: çizgi boyunca gidip her iki uca aynı kontrada seyredin; hangisi daha orsa (rüzgara yakın) gidiyorsa o uç avantajlıdır.' }
    ],
    addBoat: { pin: { x: 400, y: 612 }, middle: { x: 500, y: 612 }, committee: { x: 620, y: 612 } },
    // filo ön sırada, B'ye 1 boy aralıkla (merkezler ~50 px). 2. sıra yok: A'nın iskele rotası onların önünü keserdi
    // (iskele kontra, sancak kontraya yol vermeli; K10). A hepsinin kıçından geçer.
    crowd: [{ pos: { x: 500, y: 614 }, tack: 'starboard', v0: 48 }, { pos: { x: 550, y: 614 }, tack: 'starboard', v0: 48 }, { pos: { x: 600, y: 614 }, tack: 'starboard', v0: 48 }]
  });

  // ---------- A1b: Hat avantajını ölçme yöntemleri ----------
  S.push({
    id: 'a1b-measure',
    category: 'Taktik', topic: 'Start',
    title: 'A1b · Hat avantajını ölçmenin 3 yolu',
    summary: 'Start öncesi mutlaka ölçün: (1) hat ortasında rüzgara karşı durup burnun gösterdiği yöne göre hangi ucun önde kaldığına bakın, (2) hat boyunca iki yöne seyredip hangi yönde daha orsa gittiğinizi görün, (3) pusulayla hat yönünü rüzgar yönüyle karşılaştırın.',
    duration: 24,
    baseSpeed: 48,
    wind: 15,
    line: { pin: { x: 300, y: 400 }, boat: { x: 700, y: 400 } },
    rungs: { boat: 'M', from: 1.5, to: 7.5 },
    readouts: [{ boat: 'M', from: 7.5, to: 19 }],
    boats: [
      { id: 'M', name: 'Ölçüm yapan', color: '#2a9d8f',
        start: { x: 500, y: 440, h: 15 }, v0: 2,
        segs: [
          { mode: 'hold', h: 15, dur: 7.5, speed: 0.02, turn: 0, note: 'Rüzgara karşı duruyor' },
          { mode: 'heading', h: 270, dur: 3.2, turn: 1.2, note: 'Pin\'e doğru' },
          { mode: 'heading', h: 90, dur: 6.3, turn: 1.4, note: 'Hakem botuna doğru' },
          { mode: 'hold', h: 15, dur: 7.0, speed: 0.02, turn: 1.2 }
        ] }
    ],
    steps: [
      { t: 0, title: 'Yöntem 1: rüzgara karşı dur', text: 'Hattın ortasında burnunuzu tam rüzgara çevirip durun. Rüzgar sağ üstteki ok: 15°, yani hat yönüne (0°) göre sağdan geliyor.' },
      { t: 1.5, title: 'Basamağı oku', text: 'Kesikli çizgi teknenin omuz hizası: rüzgara dik "merdiven basamağı". Hangi uç bu çizginin ÖNÜNDE (rüzgar tarafında) kalıyorsa o uç avantajlıdır. Burada hakem botu çizginin üstünde, pin altında kaldı: hakem botu ucu avantajlı. Pratikte: burnunuz rüzgara dönükken omzunuz hangi uca daha yakın bakıyorsa o uç.' },
      { t: 7.5, title: 'Yöntem 2: hat boyunca iki yöne seyret', text: 'Hattın hemen gerisinde önce bir uca, sonra diğerine seyredin. Yelkeninizin ne kadar açık olduğuna ve rüzgar açısına bakın.' },
      { t: 9, title: 'Pin\'e doğru: yelken açık', text: 'Pin\'e giderken rüzgar açısı ~105°: apaz, yelken iyice açık. Bu yön "rüzgardan uzaklaşan" yön.' },
      { t: 12.5, title: 'Hakem botuna doğru: yelken kapalı', text: 'Hakem botuna giderken rüzgar açısı ~75°: daha orsa, yelken daha kapalı. Kural: hangi uca doğru daha ORSA gidiyorsanız (yelken daha kapalıysa) o uç avantajlıdır. Fark ne kadar büyükse avantaj o kadar büyük.' },
      { t: 18, title: 'Yöntem 3: pusula', text: 'Hat yönü: pin → hakem botu 90°. Hatta dik rüzgar 0° olurdu. Rüzgar 15°\'den geliyor: dikten 15° hakem botu tarafına dönmüş → hakem botu ucu avantajlı. Kabaca: 400 px\'lik (≈8 boy) hatta 15° fark ≈ 2 tekne boyu kazanç. Her 5° ≈ hat uzunluğunun %9\'u.' },
      { t: 21, title: 'Pratik', text: 'Üç yöntemi birlikte kullanın; rüzgar salınıyorsa son 3 dakikada ölçümü tekrarlayın. Ölçtükten sonra plan: hangi uç, hangi sıra, hangi boşluk? Bunlar A3 ve A4 senaryolarında.' }
    ],
    addBoat: { pin: { x: 380, y: 520 }, middle: { x: 520, y: 560 }, committee: { x: 660, y: 520 } }
  });

  // ---------- A2: Zamanlama ve hızlanma ----------
  S.push({
    id: 'a2-timing',
    category: 'Taktik', topic: 'Start',
    title: 'A2 · Zamanlama: hattın dibinde bekle, 10-12 sn kala doldur',
    summary: 'Optimist ve ILCA gibi küçük tekneler start hattının hemen gerisinde (1-1.5 tekne boyu) rüzgara baş verip beklerler; aralarında boşluk bırakırlar. İyi start = sinyalden 10-12 saniye önce yelkeni doldurup (Optimist tam hıza bu sürede çıkar) sinyal anında hattı tam hızla geçmek.',
    duration: 28,
    baseSpeed: 40,
    goBefore: 2.5,       // bu derste filo da 10 gerçek sn kala doldurur (diğer start senaryolarında 6 sn, hattın daha dibinde)
    clockScale: 4,       // 1 animasyon saniyesi = 4 gerçek saniye; ivme simülatördeki Optimist tablosundan (engine.accelTau)
    wind: 0,
    line: { pin: { x: 250, y: 420 }, boat: { x: 750, y: 420 } },
    startAt: 20,
    boats: [
      { id: 'D', name: 'Doğru zamanlama', role: 'dogru', color: '#2a9d8f',
        start: { x: 700, y: 540, h: 290 }, v0: 25,
        segs: [
          { mode: 'heading', h: 290, dur: 4, speed: 0.5, turn: 0 },         // hattın dibine yarım hızla gel
          { mode: 'hold', h: 340, dur: 12.9, speed: 0.05, turn: 1.0 },      // rüzgara baş ver, bekle
          { mode: 'closehauled', tack: 'starboard', dur: 11.1, turn: 0.8 }  // 3 s kala doldur, hızlan
        ] },
      { id: 'E', name: 'Erken (fodepar)', role: 'hata', color: '#e76f51',
        start: { x: 455, y: 492, h: 340 }, v0: 2,
        segs: [
          { mode: 'hold', h: 340, dur: 17.2, speed: 0.05, turn: 0 },
          { mode: 'closehauled', tack: 'starboard', dur: 3.3, turn: 0.8 },   // 2.8 s kala doldurdu: yarım boy erken → burnu çizgiyi geçer
          { mode: 'hold', h: 0, dur: 1.5, speed: 0.05, turn: 0.8, note: 'Fodepar!' },        // durdu
          { mode: 'heading', h: 180, dur: 2.4, turn: 1.2, note: 'Geri dön' },                  // çizginin altına in
          { mode: 'closehauled', tack: 'starboard', dur: 3.6, turn: 1.2 }
        ] },
      { id: 'G', name: 'Geç kalan', role: 'hata', color: '#8d99ae',
        start: { x: 335, y: 495, h: 340 }, v0: 2,
        segs: [
          { mode: 'hold', h: 340, dur: 19.5, speed: 0.05, turn: 0 },
          { mode: 'closehauled', tack: 'starboard', dur: 8.5, turn: 0.8 }
        ] }
    ],
    crowd: [
      { slot: 0.215 }, { slot: 0.455 }, { slot: 0.70 }, { slot: 0.79 }, { slot: 0.88 },
      { slot: 0.17, row: 1 }, { slot: 0.44, row: 1 }
    ],
    steps: [
      { t: 0, title: 'Start\'a 1 dk 20 sn: filo hattın dibinde', text: 'Gri tekneler hattın 1-1.5 boy gerisinde rüzgara baş vermiş, yelkenleri boş bekliyor. Aralarında boşluklar var: boşluk, hızlanma alanıdır. Yeşil tekne yarım hızla yerine geliyor.' },
      { t: 4, title: 'Yerini al, rüzgara baş ver', text: 'Yeşil tekne de hattın dibinde durdu. Burnu rüzgara yakın, yelken boş ("sallanıyor"). Küçük teknede bekleme burada yapılır: hattan uzakta değil, hemen gerisinde. Rüzgaraltınızdaki boşluğu koruyun; biri sokulursa orsa edip kapatın (Kural 11).' },
      { t: 17.2, title: 'Turuncu 1 saniye erken doldurdu', text: 'Turuncu 11 saniye kala yelkenini doldurdu; yeşil 12 saniye kala ama 1 boy daha gerideydi. Bekleme yerine göre 1-2 saniye bile küçük teknede yarım boy eder.' },
      { t: 19.6, title: 'Burnu çizgiyi geçti: fodepar (OCS)', text: 'Sinyalde teknenin herhangi bir parçası (burun!) çizginin öbür tarafındaysa erken start = fodepar (OCS). Çoğu fodepar böyle olur: yarım boy. P bayrağında geri dönüp hattı yeniden geçmek yeter; I bayrağında uçlardan dolaşılır; U ve siyah bayrakta son 1 dakikada bu burun yarıştan çıkarır (bkz. A12).' },
      { t: 16.5, title: '14 sn kala: doldurmaya hazırlan', text: 'Yeşil tekne bordalayıp yelkeni dolduruyor; filo 10 saniye kala dolduruyor. Optimist yelkeni doldurunca tam hıza ~10-12 saniyede çıkar (simülatördeki tekne tablosuyla aynı). Bu yüzden bekleme hattın dibinde, hızlanma son 10-12 saniyedir.' },
      { t: 20, title: 'START', text: 'Yeşil tekne tam bu anda, tam hızla çizgide; filo da birlikte çıkıyor. Turuncu geri dönüyor: 20-25 saniye ve kirli hava. Gri tekne geç doldurdu: çizgiyi ~9 saniye sonra, yavaş geçecek.' },
      { t: 25, title: 'Sonuç', text: 'Formül: hattın dibinde (1-1.5 boy) rüzgara baş verip bekle, rüzgaraltında boşluk tut, sinyalden 10-12 sn önce doldur. Antrenmanda "kaç saniyede 1 boy?" hissini çalışın: yelkeni doldurup çizgiye varma süresini tekrar tekrar ölçün.' }
    ],
    addBoat: { pin: { x: 290, y: 560 }, middle: { x: 390, y: 640 }, committee: { x: 720, y: 560 } },
    expectEarly: ['E'],
    startSlots: { pin: [0.28], middle: [0.54], committee: [0.86] }
  });

  // ---------- A3: Pin ucu avantajlı ----------
  S.push({
    id: 'a3-pin-favored',
    category: 'Taktik', topic: 'Start',
    title: 'A3 · Pin ucu avantajlıysa: pin\'e yetiş, hemen tramola, pin\'e sıkışma',
    summary: 'Pin ucu avantajlıysa en iyi start pin\'in hemen yanından, sancak kontra, tam zamanında; sonra hemen iskele kontraya tramola atıp filoyu ÖNDEN kesmek. Tek şart: pin\'e giden layline\'ın ÜSTÜNDE olmak. Layline\'ın altında kalan tekne pin\'i dönemez; dışarıdan geçer ve geri dönmek zorunda kalır.',
    duration: 16.5,
    baseSpeed: 48,
    clockScale: 4,            // sayaç gerçek saniye (1 animasyon sn = 4 sn); ivme Optimist tablosundan
    wind: 335,
    line: { pin: { x: 200, y: 480 }, boat: { x: 800, y: 480 } },
    startAt: 6,
    rungs: { boat: 'P1', from: 8 },
    laylines: [{ x: 200, y: 480, tack: 'starboard', len: 400, from: 2, label: 'Pin layline\'ı (sancak)' }],
    boats: [
      { id: 'P1', name: 'Pin\'de tam zamanında', role: 'dogru', color: '#2a9d8f',
        start: { x: 324, y: 507, h: 310 }, v0: 2,
        segs: [
          { mode: 'hold', h: 310, dur: 3.8, speed: 0.05, turn: 0 },
          { mode: 'closehauled', tack: 'starboard', dur: 3.2, turn: 0.8 },
          { mode: 'closehauled', tack: 'port', dur: 9.5, turn: 1.4, note: 'Tramola → filoyu önden kes' }
        ] },
      { id: 'P2', name: 'Layline altında, sıkışan', role: 'hata', color: '#e76f51',
        start: { x: 290, y: 546, h: 310 }, v0: 2,
        segs: [
          { mode: 'hold', h: 310, dur: 3.8, speed: 0.05, turn: 0 },
          { mode: 'closehauled', tack: 'starboard', dur: 2, turn: 0.8 },
          { mode: 'closehauled', tack: 'starboard', dur: 2.5, turn: 0, note: 'Pin\'e yetişemiyor!' },
          { mode: 'heading', h: 118, dur: 4.6, turn: 1.4, note: 'Çizgi dışı → geri dönüyor' },
          { mode: 'closehauled', tack: 'starboard', dur: 3.6, turn: 1.4 }
        ] },
      { id: 'P3', name: 'Ortadan güvenli', role: 'dogru', color: '#1f77b4',
        start: { x: 684, y: 507, h: 310 }, v0: 2,
        segs: [
          { mode: 'hold', h: 310, dur: 3.8, speed: 0.05, turn: 0 },
          { mode: 'closehauled', tack: 'starboard', dur: 12.7, turn: 0.8 }
        ] }
    ],
    steps: [
      { t: 0, title: 'Pin ucu avantajlı', text: 'Rüzgar 335°\'den, yani pin (sol) tarafından geliyor. Hat geniş (12 boy); pin ucu hakem botundan ~5 tekne boyu "önde". Filo hattın dibinde rüzgara baş vermiş bekliyor; herkes pin tarafına yığılmış, hakem botu tarafı boş. Start\'a 24 saniye var.' },
      { t: 2, title: 'Pin layline\'ı', text: 'Mavi kesikli çizgi: pin\'den geriye, sancak orsa rotası boyunca çizilen layline. Bu çizginin ÜSTÜNDE (sağında) olan tekne pin\'e yetişir; altında kalan yetişemez. Yeşil P1 tam layline\'da, turuncu P2 altında.' },
      { t: 4, title: 'P2 pin\'e yetişemiyor', text: 'P2 orsa gittiği hâlde burnu pin\'in soluna düşüyor. Seçenekleri: tramola atıp iskele kontrada filoya girmek (tehlikeli, Kural 10) ya da pin\'in dışından geçip geri dönmek. İkisi de pahalı.' },
      { t: 6, title: 'START: P1 pin\'de', text: 'P1 start anında pin\'in hemen yanında, tam hızda. Avantajlı uçtan, temiz havada, rüzgaraltında kimse yok.' },
      { t: 7.0, title: 'P1 hemen tramola', text: 'Pin\'den çıkan tekne sancakta uzun gitmez: pin\'i temizler temizlemez iskele kontraya döner. Neden? Pin avantajı onu filonun ÖNÜNE koydu; iskele kontrada herkesin önünden geçip istediği tarafa gidebilir. Sancakta kalsa sol kenara sıkışır.' },
      { t: 8.6, title: 'P2 çizgi dışından geçti', text: 'P2 hattı pin\'in dışından geçti: start almış sayılmaz. Geri dönüp hattı uçlar arasından yeniden geçmek zorunda.' },
      { t: 11, title: 'P1 P3\'ün önünden geçiyor', text: 'İskele kontradaki P1, sancak kontradaki P3\'ün önünden rahatça geçiyor. Normalde iskele yol verirdi (Kural 10) ama P1 yeterince önde. Basamak çizgisi farkı gösteriyor: ~1.5 boy.' },
      { t: 12.5, title: 'P2 geri dönüyor', text: 'P2 hattın altına inip yeniden start alıyor: yarım dakika ve filonun arkasında kirli hava. Pin\'e sıkışmanın maliyeti bu.' },
      { t: 15, title: 'Sonuç', text: 'Pin avantajlıysa: layline\'ı son 30 saniyede gözle kontrol edin, layline\'ın biraz ÜSTÜNDE gelin, son 10 saniyede hızlanın, pin\'i temizleyince tramola atın. Emin değilseniz pin\'den 2-3 boy sağda start alın: küçük kayıp, sıfır risk.' }
    ],
    addBoat: { pin: { x: 400, y: 650 }, middle: { x: 560, y: 660 }, committee: { x: 660, y: 650 } },
    startSlots: { pin: [0.2], middle: [0.4], committee: [0.6] },
    expectOutside: ['P2'],
    // filo P1'in tramola rotasının sağında: P1 iskele kontrada hepsinin önünden temiz geçer (simülatörde K14/protesto yok)
    crowd: [{ slot: 0.36 }, { slot: 0.47 }, { slot: 0.58 }]
  });

  // ---------- A4: Hakem botu ucu avantajlı ----------
  S.push({
    id: 'a4-committee-favored',
    category: 'Taktik', topic: 'Start',
    title: 'A4 · Hakem botu ucu avantajlıysa: layline, barging ve güvenli yer',
    summary: 'Hakem botu ucu avantajlıysa herkes oraya ister. Oraya ancak hakem botunun layline\'ında, rüzgaraltından gelerek hak kazanılır. Rüzgarüstünden sokulmak (barging) hak vermez: rüzgaraltındaki tekne orsa edip kapıyı kapatabilir.',
    duration: 18,
    baseSpeed: 40,
    clockScale: 4,            // sayaç gerçek saniye (1 animasyon sn = 4 sn); ivme Optimist tablosundan
    wind: 15,
    line: { pin: { x: 240, y: 400 }, boat: { x: 640, y: 400 } },
    startAt: 7.5,
    rungs: { boat: 'L', from: 9 },
    laylines: [{ x: 612, y: 400, tack: 'starboard', len: 330, from: 1, label: 'Hakem botu layline\'ı' }],
    boats: [
      { id: 'L', name: 'Rüzgaraltı · layline\'da', role: 'hak', color: '#2a9d8f',
        start: { x: 706, y: 612, h: 330 }, v0: 40,
        segs: [
          { mode: 'closehauled', tack: 'starboard', dur: 2.5, turn: 0 },
          { mode: 'hold', h: 355, dur: 1.3, speed: 0.15, turn: 0.8, note: 'Orsa ediyor: "Yer yok!"' },
          { mode: 'closehauled', tack: 'starboard', dur: 14.2, turn: 1.0 }
        ] },
      { id: 'W', name: 'Rüzgarüstü · barging', role: 'hata', color: '#e76f51',
        start: { x: 841, y: 545, h: 285 }, v0: 46,
        segs: [
          { mode: 'heading', h: 285, dur: 2.5, turn: 0, note: 'Barging' },
          { mode: 'heading', h: 240, dur: 2.2, turn: 1.0, note: 'Yol veriyor · K11' },
          { mode: 'closehauled', tack: 'starboard', dur: 13.3, turn: 1.2 }
        ] },
      { id: 'C', name: '4 boy aşağıda, güvenli', role: 'dogru', color: '#1f77b4',
        start: { x: 455, y: 462, h: 340 }, v0: 2,
        segs: [
          { mode: 'hold', h: 340, dur: 5, speed: 0.05, turn: 0 },
          { mode: 'closehauled', tack: 'starboard', dur: 13, turn: 0.8 }
        ] }
    ],
    steps: [
      { t: 0, title: 'Hakem botu ucu avantajlı', text: 'Rüzgar 15°: hakem botu tarafından. Herkes hakem botunun hemen yanından çıkmak ister; ama orada tek bir yer var.' },
      { t: 1, title: 'Layline ve güvenli yer', text: 'Mavi çizgi hakem botunun kıçına giden sancak layline\'ı. Yeşil L tam bu çizgide, rüzgaraltından geliyor: o yerin sahibi. Mavi C ise 4 boy aşağıda, kalabalıktan uzak, temiz havada.' },
      { t: 2.2, title: 'W barging yapıyor', text: 'Turuncu W rüzgarüstünden, apaz hızla L ile hakem botu arasındaki boşluğa sokulmaya çalışıyor. Buna "barging" denir. Kurallarda yeri yok: aynı kontra, bindirmeli → rüzgarüstündeki W, rüzgaraltındaki L\'ye yol vermek zorunda (Kural 11). Start öncesinde "uygun rota" sınırı da yoktur: L rüzgara kadar orsa edebilir.' },
      { t: 2.6, title: 'L kapıyı kapatıyor', text: 'L orsa ediyor ve "Yer yok!" diye sesleniyor. W\'nin hakem botuna sığacak yeri kalmadı; hakem botuna çarpmak da Kural 31 ihlali.' },
      { t: 3.9, title: 'W bordalayıp arkadan geçiyor', text: 'W\'nin tek seçeneği: sert bordalayıp L\'nin kıçından geçmek ve çok daha aşağıdan start almak. Hız ve yer kaybı: 2-3 boy, üstelik kirli hava.' },
      { t: 7.5, title: 'START', text: 'L hakem botunun hemen rüzgaraltında, tam hızda, avantajlı uçta. C 4 boy aşağıda ama temiz. W geride.' },
      { t: 10, title: 'Basamak: kim nerede?', text: 'L önde. C hakem botu avantajından ~1 boy feragat etti ama kavga etmeden temiz çıktı. W hem geride hem L\'nin rüzgar gölgesinde: en kötüsü.' },
      { t: 14, title: 'Sonuç', text: 'Hakem botu ucu için ya layline\'da erkenden yer alın ve rüzgaraltınızı koruyun, ya da 3-5 boy aşağıda güvenli yeri seçin. Asla rüzgarüstünden sokulmayın: kapı kapanır, çarparsanız ceza sizin.' }
    ],
    addBoat: { pin: { x: 300, y: 600 }, middle: { x: 420, y: 660 }, committee: { x: 760, y: 640 } },
    startSlots: { pin: [0.12], middle: [0.3], committee: [0.62] },
    crowd: [{ slot: 0.08 }, { slot: 0.2 }, { slot: 0.32 }, { slot: 0.58 }, { slot: 0.14, row: 1 }, { slot: 0.5, row: 1 }]
  });

  // ---------- A12: Start bayrakları ve fodepar ----------
  S.push({
    id: 'a12-flags',
    category: 'Taktik', topic: 'Start',
    title: 'A12 · Start bayrakları: P, I, U, siyah — son 1 dakikada burun',
    summary: 'Hazırlık bayrağı hangi fodepar (OCS) kuralının geçerli olduğunu söyler. P: geri dön, yeniden geç. I: uçlardan dolaş. U: son 1 dakikada hattın üstündeysen yarıştan çıkarsın (genel geri çağırma olursa affedilir). Siyah: çıkarsın ve tekrar startta da yarışamazsın.',
    duration: 36,
    baseSpeed: 40,
    clockScale: 4,            // 1 animasyon saniyesi = 4 gerçek saniye (son 2 dakika); ivme Optimist tablosundan
    prepFlag: 'U',
    flagDownAt: 15,           // 1 dk kala bayrak iner (t=15 → 60 s)
    wind: 0,
    line: { pin: { x: 250, y: 440 }, boat: { x: 750, y: 440 } },
    startAt: 30,
    boats: [
      { id: 'F', name: 'Burnu çizgide', role: 'hata', color: '#e76f51',
        start: { x: 520, y: 520, h: 340 }, v0: 2,
        segs: [
          { mode: 'hold', h: 340, dur: 12, speed: 0.05, turn: 0 },
          { mode: 'hold', h: 350, dur: 6, speed: 0.12, turn: 0.8 },                       // hattın dibine fazla sokuldu
          { mode: 'hold', h: 350, dur: 2, speed: 0.1, turn: 0, note: 'Burun çizgide!' },
          { mode: 'heading', h: 170, dur: 3, turn: 1.2, speed: 0.6, note: 'Geri çekiliyor' }, // geri in
          { mode: 'hold', h: 340, dur: 4.5, speed: 0.05, turn: 1.0 },
          { mode: 'closehauled', tack: 'starboard', dur: 8.5, turn: 0.8 }
        ] },
      { id: 'T', name: 'Hattın dibinde, altında', role: 'dogru', color: '#2a9d8f',
        start: { x: 440, y: 524, h: 340 }, v0: 2,
        segs: [
          { mode: 'hold', h: 340, dur: 27.5, speed: 0.05, turn: 0 },
          { mode: 'closehauled', tack: 'starboard', dur: 8.5, turn: 0.8 }
        ] }
    ],
    crowd: [{ slot: 0.1 }, { slot: 0.68 }, { slot: 0.8 }, { slot: 0.88 }, { slot: 0.1, row: 1 }, { slot: 0.68, row: 1 }],
    steps: [
      { t: 0, title: 'Start\'a 2 dakika: hazırlık bayrağı U', text: 'Hakem botunda hazırlık bayrağı dalgalanıyor: U. Bayrak hangi fodepar (OCS) kuralının geçerli olduğunu söyler. Saat sağ üstte, gerçek zaman (animasyon 4× hızlı).' },
      { t: 6, title: 'Bayrak türleri', text: 'P (mavi-beyaz): fodepar yaparsan geri dönüp hattı yeniden geç, ceza yok. I (sarı-siyah): son 1 dakikada hattın üstündeysen uçlardan dolaşarak geri dön. U (kırmızı-beyaz kare): son 1 dakikada gövdenin bir parçası hat üçgenindeyse yarıştan çıkarsın (UFD) ama genel geri çağırma olursa yeniden yarışabilirsin. Siyah: aynı şey ama genel geri çağırmada bile yarışamazsın (BFD).' },
      { t: 12, title: 'Turuncu hattın dibine fazla sokuldu', text: 'Turuncu bekleme yerini hattın tam dibine aldı. Rüzgar ve dalga tekneyi öne iter; küçük teknede yarım boy 2-3 saniyede gider.' },
      { t: 15, title: '1 dakika: bayrak indi, uzun ses', text: 'Hazırlık bayrağı indi. U bayrağı kuralı şimdi başladı: bu andan start sinyaline kadar burnun çizgiyi geçmesi yarıştan çıkarır. Fodepar yalnızca son saniyede olmaz; son 1 dakikanın tamamında olur.' },
      { t: 18, title: 'Burun çizgide: UFD', text: 'Turuncunun burnu çizginin üstünde. U bayrağı altında bu tekne artık fodepar: komite not aldı, start sonrası sonuçlarda "UFD" yazacak. Geri çekilmesi kurtarmaz; yalnızca genel geri çağırma (Birinci Tekrar) kurtarır. P bayrağı olsaydı geri çekilip start tarafına dönmesi yeterdi.' },
      { t: 20, title: 'Geri çekiliyor', text: 'Turuncu yelkeni geri basıp (backing) geri çekiliyor. Geri giden tekne herkese yol verir (Kural 22.3). P bayrağında bu hamle doğru; U ve siyah bayrakta artık geç.' },
      { t: 24, title: 'Yeşil: hattın dibinde ama altında', text: 'Yeşil de filoyla birlikte hattın dibinde bekliyor ama burnu çizginin yarım boy kadar altında. Hattı görmek için transit (kerteriz) kullanın; emin değilseniz yarım boy geride durun. U ve siyah bayrakta "yarım boy fazla" değil, "yarım boy eksik" tarafında hata yapın.' },
      { t: 30, title: 'START', text: 'Filo çıkıyor. Turuncu da geçiyor ama UFD: sonuçlarda yarıştan çıkarılmış sayılacak. Özet: bayrağa bak, kuralı bil; U/siyah bayrakta son 1 dakikada burnu çizgiden uzak tut.' }
    ],
    addBoat: { pin: { x: 290, y: 560 }, middle: { x: 500, y: 560 }, committee: { x: 720, y: 560 } },
    startSlots: { pin: [0.4], middle: [0.5], committee: [0.9] },
    expectEarly: ['F']
  });

  // ---------- İA1: Pin'in dışında bekleyip apaz gel, grubun altına tramola ----------
  S.push({
    id: 'ia1-port-approach-pin',
    category: 'İleri Taktik', topic: 'Start · Pin',
    title: 'İA1 · Pin\'in dışında bekle, apaz gel, grubun en altına tramola',
    summary: 'Pin avantajlıysa pin grubu erken oluşur. İleri taktik: pin\'in SOLUNDA, kavganın dışında bekle; son 45 sn\'de apaz ile hattın altından gel, rüzgara baş vermiş grubun en alttaki teknesinin rüzgaraltındaki boşluğa tramola at. Tek şart: tramola noktası pin layline\'ının ÜSTÜNDE olmalı; boşluk kapalıysa ya da pin\'i kurtarmıyorsan girmenin anlamı yok.',
    duration: 36.5,
    baseSpeed: 40, tau: 1.0,
    clockScale: 3,
    wind: 350,
    line: { pin: { x: 250, y: 440 }, boat: { x: 750, y: 440 } },
    startAt: 24,
    rungs: { boat: 'X', from: 25.5 },
    laylines: [{ x: 250, y: 440, tack: 'starboard', len: 330, from: 0, label: 'Pin layline\'ı — tramola bu çizginin ÜSTÜNDE' }],
    boats: [
      { id: 'X', name: 'Apaz gel, layline üstünde tramola', role: 'dogru', color: '#2a9d8f',
        start: { x: 172, y: 530, h: 15 }, v0: 2,
        segs: [
          { mode: 'hold', h: 15, dur: 9, speed: 0.05, turn: 0, note: 'Pin\'in solunda bekliyor' },
          { mode: 'heading', h: 92, dur: 5.2, turn: 1.0, note: 'Apaz: hattın altından grubun dibine' },
          { mode: 'hold', h: 325, dur: 7.4, speed: 0.03, turn: 1.3, note: 'Tramola → layline üstü, boşluk benim' },
          { mode: 'closehauled', tack: 'starboard', dur: 14.9, turn: 0.8 }
        ] },
      { id: 'Z', name: 'Layline altında tramola', role: 'hata', color: '#e76f51',
        start: { x: 118, y: 585, h: 15 }, v0: 2,
        segs: [
          { mode: 'hold', h: 15, dur: 9.6, speed: 0.05, turn: 0 },
          { mode: 'heading', h: 92, dur: 4.6, turn: 1.0, note: 'Apaz ile geliyor' },
          { mode: 'hold', h: 325, dur: 7.3, speed: 0.05, turn: 1.3, note: 'HATA: layline\'ın altında tramola' },
          { mode: 'closehauled', tack: 'starboard', dur: 1.8, turn: 0.8, note: 'HATA: pin\'i kurtarmıyor!' },
          { mode: 'heading', h: 120, dur: 2.2, turn: 1.5, note: 'Bordala → herkesin arkasından' },
          { mode: 'heading', h: 95, dur: 2.4, turn: 1.0, note: 'Bordala → herkesin arkasından' },
          { mode: 'closehauled', tack: 'starboard', dur: 10.5, turn: 1.2 }
        ] },
      { id: 'Y', name: 'Geç geldi, boşluk kapandı', role: 'hata', color: '#c77dff',
        start: { x: 70, y: 600, h: 15 }, v0: 2,
        segs: [
          { mode: 'hold', h: 15, dur: 14.5, speed: 0.05, turn: 0 },
          { mode: 'heading', h: 90, dur: 5.0, turn: 1.0, note: 'Geç: 25 sn kala geliyor' },
          { mode: 'heading', h: 81, dur: 6.4, turn: 0.8, note: 'HATA: boşluk yok → herkesin altından' },
          { mode: 'closehauled', tack: 'starboard', dur: 12.1, turn: 1.2 }
        ] }
    ],
    crowd: [
      { slot: 0.27 }, { slot: 0.37 }, { slot: 0.47 }, { slot: 0.57 }, { slot: 0.67 }, { slot: 0.77 }, { slot: 0.84 },
      { slot: 0.52, row: 1 }, { slot: 0.72, row: 1 }
    ],
    steps: [
      { t: 0, title: 'Start\'a 72 sn: pin grubu oluştu', text: 'Rüzgar 350°: pin hafif avantajlı. Gri tekneler pin\'e yakın yerleri almış, hattın dibinde rüzgara baş vermiş bekliyor. Mavi kesikli çizgi pin layline\'ı: sancak orsa ile pin\'e varan son rota. Yeşil X kavganın dışında, pin\'in SOLUNDA bekliyor.' },
      { t: 4, title: 'Neden dışarıda, neden solda?', text: 'Grubun içinde 70 saniye yer tutmak zor: sürüklenirsin, biri rüzgarüstünden sokulur, boşluğun kapanır. Pin\'in solunda beklerken hattı, layline\'ı ve boşlukları yandan görürsün; apaz ile hızlı ve kontrollü girersin.' },
      { t: 9, title: 'Son 45 sn: apaz ile gel', text: 'X yelkenini doldurup apaz (yarım rüzgar) ile hattın hemen altından, pin\'in altından geçip gruba doğru gidiyor. İskele kontrada: herkese yol verir (Kural 10); sancak teknelerin burnuna girmeden, altlarından geçer.' },
      { t: 12.5, title: 'KARAR: boşluk var mı, layline\'ın üstünde mi?', text: 'İki soru: (1) Grubun en alttaki teknesinin rüzgaraltında 1 boy boşluk var mı? (2) Tramola noktası pin layline\'ının ÜSTÜNDE mi? İkisi de evetse gir. Boşluk kapalıysa ya da layline\'ın altındaysan girme: pin\'i kurtaramazsın, çizgi dışından geçersin.' },
      { t: 14.5, title: 'X tramola: Kural 13 ve 15', text: 'X layline\'ın üstünde, grubun en altındaki teknenin rüzgaraltına tramola atıyor. Tramola sırasında herkese yol verir (Kural 13). Sancak kontraya geçip rüzgaraltı tekne olunca hak sahibi; ama Kural 15: rüzgarüstündekine başta kaçınma yeri ver. O yüzden tramola dibine değil, yarım boy aşağısına.' },
      { t: 16.5, title: 'Z HATA: layline\'ın altında tramola', text: 'Turuncu Z aynı hamleyi layline\'ın ALTINDA yaptı. Sancak orsa ile pin\'e varamaz: burnu pin\'in soluna düşer. Ya herkese yol verip tramola atacak ya da pin\'in dışından geçip geri dönecek. Boşluk bulsan bile layline\'ın altındaysan girmenin anlamı yok.' },
      { t: 19.5, title: 'Y HATA: geç geldi', text: 'Mor Y 25 saniye kala geldi; X boşluğu almış, grup sıkışmış. Girecek yer yok: herkesin altından, kirli havada, 3-4 boy geride başlayacak. Zamanlama: hafif rüzgarda 50 sn, kuvvetlide 35-40 sn kala gel.' },
      { t: 21.5, title: '2.5 sn kala doldur', text: 'X rüzgaraltı hakkıyla yerini korudu (Kural 11); pin layline\'ının üstünde, boşluğu var: bordalayıp hızlanıyor.' },
      { t: 24, title: 'START', text: 'X pin\'in hemen yanından, tam hızla, temiz havada. Z pin\'i kurtaramıyor: burnu pin\'in soluna düşüyor. Y hâlâ herkesin altında sağa doğru gidiyor.' },
      { t: 25.5, title: 'Z: dışarıdan çıkılmaz, bordala', text: 'Pin\'in dışından geçmek start sayılmaz. Z\'nin iki yolu var: rüzgarüstüne tramola atıp geri dönmek ya da bordalayıp (gerekirse kavança) hattın altından sağa gidip herkesin ARKASINDAN hattın içinden geçmek. Z bordalıyor: 8-10 saniye ve kirli hava.' },
      { t: 32, title: 'Y ve Z: 25-35 saniye geç', text: 'Y boşluk bulamayınca, Z pin\'i kurtaramayınca ikisi de filonun altından geçip ancak herkesten sonra, kirli havada hattın içinden çıkabiliyor. Geç gelmenin ve layline\'ın altında tramola atmanın maliyeti bu.' },
      { t: 34.5, title: 'Özet', text: 'Dışarıda bekle → apaz ile gel → boşluk + layline kontrolü → en alttaki teknenin rüzgaraltına tramola → yerini koru. Erken gelirsen boşluk yok ya da sürüklenirsin; geç gelirsen kapanmıştır; layline\'ın altında tramola pin\'i kaybettirir.' }
    ],
    addBoat: { pin: { x: 290, y: 560 }, middle: { x: 500, y: 560 }, committee: { x: 720, y: 560 } },
    startSlots: { pin: [0.1], middle: [0.5], committee: [0.9] }
  });

  // ---------- İA2: Hat yayı (line sag): pin tarafından bak, ortada yukarıdan çık ----------
  S.push({
    id: 'ia2-line-sag',
    category: 'İleri Taktik', topic: 'Start · Orta',
    title: 'İA2 · Hat yayı: pin tarafından hattı gör, ortada herkesten yukarı dur',
    summary: 'Uzun hatlarda filo ortaya doğru hattan uzaklaşır: hat yayı (line sag). Kimse hattı göremez, herkes komşusuna göre durur. Pin tarafından hakem botuna bakan tekne yayı görür; vakti varsa hattın altından ortaya gelir, bir boşluğa komşularından YUKARI (hatta yakın) yerleşir ve sinyalde 1-2 boy önde çıkar. Yay yoksa: herhangi bir boşluğa, herkesle aynı hizada.',
    duration: 32,
    baseSpeed: 40, tau: 1.0,
    clockScale: 3,
    wind: 0,
    line: { pin: { x: 200, y: 440 }, boat: { x: 800, y: 440 } },
    startAt: 24,
    rungs: { boat: 'S', from: 24.5 },
    sightline: { from: 0, to: 6, label: 'Transit: pin\'den hakem botuna bak — hat burada' },
    sag: { from: 0, to: 21.5 },
    boats: [
      { id: 'S', name: 'Yayı gören, ortada yukarı', role: 'dogru', color: '#2a9d8f',
        start: { x: 88, y: 452, h: 90 }, v0: 2,
        segs: [
          { mode: 'hold', h: 90, dur: 4, speed: 0.04, turn: 0 },
          { mode: 'heading', h: 160, dur: 3.2, turn: 0.8, note: 'Hattın altına iniyor' },
          { mode: 'heading', h: 90, dur: 6.2, turn: 1.0, note: 'Apaz: hattın altından ortaya' },
          { mode: 'heading', h: 35, dur: 2.3, turn: 1.0, speed: 1, note: 'Boşluğa gir, komşulardan YUKARI' },
          { mode: 'hold', h: 340, dur: 6.8, speed: 0.04, turn: 1.0, note: 'Hattı biliyorum: 1 boy geride' },
          { mode: 'closehauled', tack: 'starboard', dur: 9.5, turn: 0.8 }
        ] }
    ],
    // yay: uçlar hatta yakın, orta 2.5-3 boy geride
    crowd: [
      { slot: 0.10, back: 0 }, { slot: 0.15, back: 12 }, { slot: 0.20, back: 30 }, { slot: 0.30, back: 118 }, { slot: 0.40, back: 140 },
      { slot: 0.50, back: 145 }, { slot: 0.60, back: 135 }, { slot: 0.69, back: 95 }, { slot: 0.76, back: 50 }, { slot: 0.87, back: 0 }
    ],
    steps: [
      { t: 0, title: 'Start\'a 72 sn: pin tarafından hatta bak', text: 'Yeşil S pin\'in dışında, tam hattın uzantısında (hattın üstünde) duruyor ve hakem botuna bakıyor: pin ile hakem botunu aynı hizaya getirince hat tam olarak görünür (transit). Gördüğü şey: uçlardaki tekneler hatta yakın, ortadakiler 2-3 boy geride. Bu bir hat yayı (line sag).' },
      { t: 2, title: 'Yay neden oluşur?', text: 'Uzun hatta ortadaki tekne hattı göremez; iki ucu birden hizalayamaz. Herkes komşusuna göre durur, her komşu biraz geri kalır; orta kayar. Yayı yalnızca hattı GÖREN bilir: uçtan bakan ya da kıyıda transit alan.' },
      { t: 4, title: 'Vakit var: hattın altından ortaya', text: 'S hattın uzantısından ayrılıp önce hattın altına iniyor, sonra yelkenini doldurup apaz ile uçtaki teknelerin altından ortaya doğru gidiyor. İskele kontrada: herkese yol verir (Kural 10). Ortaya giderken filonun rüzgar gölgesine girer, hızı düşer: bunu zamanına ekle.' },
      { t: 12, title: 'Hangi boşluk, ne zaman?', text: 'Hedef: yayın derinleştiği yerde, iki teknenin arasında bir boşluk. Zamanı öyle ayarla ki 45-50 sn kala orada ol: daha erken gelirsen sürüklenirsin, daha geç gelirsen boşluk kapanır. Kargaşanın içinde değil, uzaktan planla.' },
      { t: 14, title: 'Boşluğa gir ama YUKARI dur', text: 'S boşluğa giriyor ama komşuları gibi 3 boy geride değil, hattın 1 boy altında duruyor. Komşulara göre "öne çıkmış" görünür; aslında hattın doğru yerindedir. Bunun için hattı gerçekten biliyor olman lazım: transit şart.' },
      { t: 17.5, title: 'Yerini koru, hattı kontrol et', text: 'Rüzgara baş vermiş bekliyor; rüzgaraltında boşluğu var. Son 30 sn\'de transiti bir kez daha kontrol et: pin ile hakem botu hizası nerede, burnun ona göre nerede?' },
      { t: 21.5, title: '2.5 sn kala doldur', text: 'Komşular 3 boy geriden hızlanacak; S 1 boydan. Sinyalde S hatta, onlar değil.' },
      { t: 24, title: 'START: 2 boy önde, temiz hava', text: 'S tam hatta, tam hızda. Ortadaki tekneler 2-3 saniye sonra geçecek. Basamak çizgisi farkı gösteriyor. Üstelik S\'nin rüzgarüstünde kimse yok: temiz hava.' },
      { t: 28, title: 'Yay yoksa?', text: 'Hatta baktın, yay yok: herkes hattın dibinde. O zaman "yukarı durmak" diye bir şey yok: herhangi bir boşluğa, herkesle aynı hizada dur; zamanlamaya ve rüzgaraltı boşluğuna odaklan. Her iki durumda da kural aynı: kargaşadan uzak dur, uzaktan bak, planla, son dakikada gir. Bu durumu İA2b\'de izleyebilirsin.' }
    ],
    addBoat: { pin: { x: 290, y: 560 }, middle: { x: 500, y: 560 }, committee: { x: 720, y: 560 } },
    startSlots: { pin: [0.1], middle: [0.5], committee: [0.9] }
  });

  // ---------- İA2b: yay yok ----------
  S.push({
    id: 'ia2b-no-sag',
    category: 'İleri Taktik', topic: 'Start · Orta',
    title: 'İA2b · Yay yok: hattı gör, boşluğa herkesle aynı hizada gir',
    summary: 'İA2\'nin eşi: bu kez filo hattın dibinde, yay yok. Pin tarafından transitle bakan tekne bunu görür; ortaya gelir, bir boşluğa komşularıyla AYNI hizada yerleşir. Avantaj yukarı durmaktan değil, zamanlamadan ve rüzgaraltındaki boşluktan gelir. Yay yokken yukarı durmaya çalışan, erken çıkar (OCS).',
    duration: 32,
    baseSpeed: 40, tau: 1.0,
    clockScale: 3,
    wind: 0,
    line: { pin: { x: 200, y: 440 }, boat: { x: 800, y: 440 } },
    startAt: 24,
    rungs: { boat: 'S', from: 24.5 },
    sightline: { from: 0, to: 6, label: 'Transit: pin\'den hakem botuna bak — hat burada' },
    sag: { from: 0, to: 21.5, label: 'Yay yok: filo hattın dibinde (en fazla {d} boy)' },
    boats: [
      { id: 'S', name: 'Hattı gören, boşlukta aynı hizada', role: 'dogru', color: '#2a9d8f',
        start: { x: 88, y: 452, h: 90 }, v0: 2,
        segs: [
          { mode: 'hold', h: 90, dur: 4, speed: 0.04, turn: 0 },
          { mode: 'heading', h: 160, dur: 3.2, turn: 0.8, note: 'Hattın altına iniyor' },
          { mode: 'heading', h: 90, dur: 7.5, turn: 1.0, note: 'Apaz: hattın altından 4 numaraya' },
          { mode: 'heading', h: 35, dur: 1.6, turn: 1.0, speed: 1, note: '4\'ün rüzgaraltına sokul' },
          { mode: 'hold', h: 340, dur: 5.2, speed: 0.04, turn: 1.0, note: '4\'ün rüzgaraltında, aynı hiza' },
          { mode: 'closehauled', tack: 'starboard', dur: 10.5, turn: 0.8 }
        ] }
    ],
    // yay yok: herkes hattın dibinde; S için 0.28-0.50 arasında boşluk. S, 4'ün (0.50) hemen rüzgaraltına
    // sokulur (merkezler ~44 px, aynı hiza) ve 4 ile paralel çıkar; 3 ile arasında rüzgaraltı boşluğu kalır.
    crowd: [
      { slot: 0.12, back: 0 }, { slot: 0.20, back: 5 }, { slot: 0.28, back: 0 }, { slot: 0.535, back: 5 },
      { slot: 0.605, back: 0 }, { slot: 0.675, back: 5 }, { slot: 0.745, back: 0 }, { slot: 0.815, back: 5 }
    ],
    steps: [
      { t: 0, title: 'Start\'a 72 sn: yine önce hatta bak', text: 'S yine pin\'in dışında, hattın uzantısında: pin ile hakem botunu aynı hizaya getirip hatta bakıyor (transit). Bu kez gördüğü şey farklı: filo hattın dibinde dizilmiş, yay yok. Turuncu çizgi neredeyse hattın üstünde.' },
      { t: 4, title: 'Yay yoksa plan değişir', text: 'Ortaya gidip "herkesten yukarı durmak" diye bir avantaj yok: yukarı duran erken çıkar (OCS). Avantaj artık iki şeyden gelir: doğru zamanda doğru boşluk ve rüzgaraltında açık su. S yine hattın altından, apaz ile ortaya gidiyor.' },
      { t: 8, title: 'Rüzgar gölgesi', text: 'Filonun rüzgaraltından geçerken her teknenin kıçından yaklaşık 1 boy uzanan bir pis rüzgar (dirty air) konisi var. S bunların içinden geçerken yavaşlar (etiketteki yüzde): ortaya gitme süreni buna göre hesapla, son anda değil, erken yola çık.' },
      { t: 13.5, title: 'Boşluğa gir, herkesle AYNI hizada', text: 'S, 3 ile 4 arasındaki boşluğa giriyor ama ortasına değil: 4\'ün hemen rüzgaraltına sokuluyor, ona yakın ve aynı hizada. Böylece 4 S\'nin rüzgarüstünde kalıyor (Kural 11: rüzgarüstü tekne yol verir) ve S\'nin rüzgaraltında, 3\'e kadar açık bir boşluk oluşuyor. Yukarı çıkmıyor; çünkü komşular zaten hattın dibinde. Sinyalde bu boşluğa doğru doldurup hızlanacak.' },
      { t: 21.5, title: '2.5 sn kala doldur', text: 'Herkes aynı mesafeden hızlanıyor. Fark zamanlamada: geç kalan ya da boşluğu kapatılan geride kalır. S rüzgaraltındaki boşluk sayesinde temiz hızlanıyor.' },
      { t: 24, title: 'START: aynı hizada, temiz', text: 'S komşularıyla aynı anda hatta. İA2\'deki gibi 2 boy önde değil, ama temiz havada ve tam hızda. Yay yoksa amaç öne geçmek değil, kötü start yapmamak.' }
    ],
    addBoat: { pin: { x: 290, y: 560 }, middle: { x: 500, y: 560 }, committee: { x: 720, y: 560 } },
    startSlots: { pin: [0.1], middle: [0.5], committee: [0.9] }
  });

  // ---------- İA2c: yay yok, hangi boşluk? ----------
  S.push({
    id: 'ia2c-pick-gap',
    category: 'İleri Taktik', topic: 'Start · Orta',
    title: 'İA2c · Yay yok: dar mı, geniş mi? 2 dk önceden boşluk seç',
    summary: 'İA2b\'nin devamı: filo yine hattın dibinde ama sırada üç boşluk var: pin yanında DAR bir boşluk, ortada ve hakem botu tarafında iki GENİŞ boşluk. Rüzgar 5° sağda, hakem botu ucu biraz avantajlı. S hatta 2 dakika kala bakar; süresi olduğu için avantajlı uzaktaki geniş boşluğa gider ve rüzgarüstü komşusunun hemen rüzgaraltına sokulur. D 1 dakika kala bakar, süresi yetmez, dezavantajlı uçtaki dar boşluğa sıkışır.',
    duration: 36,
    baseSpeed: 40, tau: 1.0,
    clockScale: 4,
    wind: 5,
    line: { pin: { x: 200, y: 440 }, boat: { x: 800, y: 440 } },
    startAt: 30,
    rungs: { boat: 'S', from: 30.5 },
    sightline: { from: 0, to: 5, label: 'Transit: 2 dk kala hatta bak' },
    gaps: { from: 2, to: 27.5, items: [
      { a: 1, b: 2, label: 'Dar', color: '#f87171' },
      { a: 3, b: 4, label: 'Geniş · orta', color: '#fbbf24' },
      { a: 5, b: 6, label: 'Geniş · avantajlı', color: '#34d399' }
    ] },
    boats: [
      { id: 'S', name: '2 dk önce bakan, avantajlıya', role: 'dogru', color: '#2a9d8f',
        start: { x: 88, y: 452, h: 90 }, v0: 2,
        segs: [
          { mode: 'hold', h: 90, dur: 4, speed: 0.04, turn: 0 },
          { mode: 'heading', h: 160, dur: 3.4, turn: 0.8, note: 'Hattın altına iniyor' },
          { mode: 'heading', h: 90, dur: 12.0, turn: 1.0, note: 'Apaz: filonun altından avantajlı boşluğa' },
          { mode: 'heading', h: 40, dur: 1.6, turn: 1.0, speed: 1, note: '7\'nin rüzgaraltına sokul' },
          { mode: 'hold', h: 345, dur: 6.2, speed: 0.04, turn: 1.0, note: '7\'nin rüzgaraltında, aynı hiza' },
          { mode: 'closehauled', tack: 'starboard', dur: 10, turn: 0.8 }
        ] },
      { id: 'D', name: '1 dk önce bakan, dar boşlukta', role: 'hata', color: '#e76f51',
        start: { x: 78, y: 548, h: 90 }, v0: 2,
        segs: [
          { mode: 'hold', h: 90, dur: 15, speed: 0.04, turn: 0, note: 'Hâlâ hatta bakmadı' },
          { mode: 'heading', h: 110, dur: 2.5, turn: 0.8, note: '1 dk kala: vakit az, en yakın boşluk' },
          { mode: 'heading', h: 80, dur: 3.5, turn: 1.0 },
          { mode: 'heading', h: 20, dur: 1.0, turn: 1.0, speed: 1, note: 'Dar boşluğa sıkıştı' },
          { mode: 'hold', h: 345, dur: 5.6, speed: 0.04, turn: 1.0 },
          { mode: 'closehauled', tack: 'starboard', dur: 9, turn: 0.8, note: 'Dar boşluk: hata payı yok' }
        ] }
    ],
    // 7 tekne: 0.12-0.26 DAR (D buraya), 0.34-0.55 GENİŞ orta, 0.64-0.87 GENİŞ avantajlı (S 7'nin rüzgaraltına)
    crowd: [
      { slot: 0.06, back: 0 }, { slot: 0.13, back: 4 }, { slot: 0.26, back: 0 }, { slot: 0.34, back: 5 },
      { slot: 0.55, back: 0 }, { slot: 0.64, back: 4 }, { slot: 0.87, back: 0 }
    ],
    steps: [
      { t: 0, title: 'Start\'a 2 dk: önce hatta bak', text: 'S pin\'in dışında, hattın uzantısında; pin ile hakem botunu aynı hizaya getirip hatta bakıyor (transit). 2 dakika kala bakmak, 1 dakika kala bakmaktan çok daha fazla seçenek verir: uzaktaki bir boşluğa gitmeye hâlâ vakit vardır.' },
      { t: 3, title: 'Üç boşluk, iki soru', text: 'Yay yok, filo hattın dibinde. Sırada üç boşluk var: pin yanında DAR (tek tekne zor sığar), ortada GENİŞ, hakem botu tarafında GENİŞ. Rüzgar 5° sağa dönmüş: hakem botu ucu biraz avantajlı (A1). İki soru sor: (1) Hangisine zamanında yetişirim? (2) Hangisi daha avantajlı?' },
      { t: 6, title: 'Süre var: avantajlıya git', text: 'S\'nin 1 dakikadan fazla vakti var; filonun 1-2 boy altından apaz ile hakem botu tarafındaki geniş boşluğa gidiyor. Filonun pis rüzgarından geçerken yavaşlar; bunu hesaba katıp erken yola çıkıyor. Dar boşluk en yakın ama riskli: komşular biraz düşerse kapanır, rüzgaraltında yer yok.' },
      { t: 15, title: 'D 1 dk kala bakıyor', text: 'D ancak şimdi hatta bakıyor. Avantajlı boşluğa gidecek vakit yok (filonun altından ~13 boy). Geriye en yakın boşluk kalıyor: pin yanındaki dar boşluk. D oraya sıkışıyor: komşularıyla arasında yarım boy bile yok.' },
      { t: 21, title: 'Geniş boşlukta doğru yer', text: 'S geniş boşluğun ortasına değil, rüzgarüstü komşusu 7\'nin hemen rüzgaraltına sokuluyor (İA2b\'deki gibi), aynı hizada. 7 S\'nin rüzgarüstünde (Kural 11: rüzgarüstü yol verir); S\'nin rüzgaraltında 6\'ya kadar açık su var. Sinyalde oraya doldurup hızlanacak.' },
      { t: 30, title: 'START: avantajlı uçta, temiz', text: 'S avantajlı tarafta, temiz havada ve tam hızda çıkıyor. D dar boşlukta: çıkarken komşuları ona yer açmak zorunda kalıyor (sahnedeki K11/K14 notları), her an temas ve protesto riski; biri biraz düşse boşluk tamamen kapanırdı. Üstelik dezavantajlı uçta: 5° fark 600 px hatta yaklaşık 1 boy eder, S bu boyu avantajlı uçtan bedavaya aldı. Kural: hatta erken bak; süren varsa avantajlı geniş boşluğu seç, yoksa yakındaki geniş boşluğu seç, dar boşluğu son çare bırak.' }
    ],
    addBoat: { pin: { x: 290, y: 580 }, middle: { x: 500, y: 580 }, committee: { x: 720, y: 580 } },
    startSlots: { pin: [0.1], middle: [0.5], committee: [0.9] }
  });

  // ---------- İA4: rüzgarüstü teknenin altına yanaş ----------
  S.push({
    id: 'ia4-leeward-of-windward',
    category: 'İleri Taktik', topic: 'Start · Yer tutma',
    title: 'İA4 · Sıkıştıysan çık: boş yerde rüzgarüstü teknenin altına yanaş',
    summary: 'S pin tarafındaki kalabalıkta ikinci sırada sıkışmış: önü kapalı, havası kirli. Geri çekilip filonun altından daha boş bir yere gider ve bir teknenin hemen RÜZGARALTINA, ona yakın yanaşır; rüzgaraltında açık su kalır, sinyalde oraya doldurup temiz çıkar. Aynı animasyonda hata: H de kalabalıktan çıkar ama bir teknenin RÜZGARÜSTÜNE, ona çok yakın yanaşır; startta rüzgaraltındaki L orsalar, daha hızlıdır ve H\'yi geride bırakır.',
    duration: 36,
    baseSpeed: 40, tau: 1.0,
    clockScale: 3,
    wind: 0,
    line: { pin: { x: 200, y: 440 }, boat: { x: 800, y: 440 } },
    startAt: 27,
    rungs: { boat: 'S', from: 27.5 },
    boats: [
      { id: 'S', name: 'Rüzgarüstündekinin altına', role: 'dogru', color: '#2a9d8f',
        start: { x: 377, y: 560, h: 340 }, v0: 0,
        segs: [
          { mode: 'hold', h: 340, dur: 3, speed: 0.04, turn: 0, note: 'Sıkıştı: önü kapalı, hava kirli' },
          { mode: 'heading', h: 210, dur: 1.5, turn: 0.9, note: 'Geri çekil, kalabalıktan çık' },
          { mode: 'heading', h: 88, dur: 3.75, turn: 1.0, note: 'Filonun altından boş yere' },
          { mode: 'heading', h: 40, dur: 2.4, turn: 1.0, speed: 1, note: 'W\'nin rüzgaraltına yanaş' },
          { mode: 'hold', h: 340, dur: 13.85, speed: 0.04, turn: 1.0, note: 'W\'ye yakın, altı boş' },
          { mode: 'heading', h: 290, dur: 1.4, turn: 0.8, note: 'Boşluğa doldur, hızlan' },
          { mode: 'closehauled', tack: 'starboard', dur: 10, turn: 0.8 }
        ] },
      { id: 'L', name: 'Rüzgaraltı · hızlı çıkan', role: 'hak', color: '#1f77b4',
        start: { x: 700, y: 505, h: 340 }, v0: 0,
        segs: [
          { mode: 'hold', h: 340, dur: 24.5, speed: 0.04, turn: 0 },
          { mode: 'heading', h: 290, dur: 1.4, turn: 0.8, note: 'Altı boş: doldur, hızlan' },
          { mode: 'closehauled', tack: 'starboard', dur: 1.6, turn: 0.8 },
          { mode: 'heading', h: 330, dur: 1.2, turn: 0.8, note: 'K11: orsalar, H yol verir' },
          { mode: 'closehauled', tack: 'starboard', dur: 10, turn: 0.8 }
        ] },
      { id: 'H', name: 'Rüzgaraltındakinin üstüne', role: 'hata', color: '#e76f51',
        start: { x: 431, y: 587, h: 340 }, v0: 0,
        segs: [
          { mode: 'hold', h: 340, dur: 2, speed: 0.04, turn: 0, note: 'Sıkıştı' },
          { mode: 'heading', h: 210, dur: 1.0, turn: 0.9, note: 'O da kalabalıktan çıkıyor' },
          { mode: 'heading', h: 90, dur: 5.5, turn: 1.0 },
          { mode: 'heading', h: 40, dur: 3.0, turn: 1.0, speed: 1, note: 'L\'nin rüzgarüstüne yanaştı' },
          { mode: 'hold', h: 345, dur: 13.0, speed: 0.04, turn: 1.0, note: 'L\'ye çok yakın, üstünde' },
          { mode: 'closehauled', tack: 'starboard', dur: 2.9, turn: 0.8, speed: 0.75, note: 'Altı dolu: düşüp hızlanamıyor' },
          { mode: 'heading', h: 355, dur: 1.6, speed: 0.6, turn: 1.0, note: 'L orsaladı: yol ver' },
          { mode: 'closehauled', tack: 'starboard', dur: 10, turn: 0.8, speed: 0.85, note: 'Geride, L\'nin ters rüzgarında' }
        ] }
    ],
    // pin tarafında kalabalık (0.06-0.27); 0.36 ile W (0.56) arası boş: S W'nin hemen rüzgaraltına (~44 px)
    // yanaşır. Sağda L (scripted, 0.75) ve onun hemen rüzgarüstüne yanaşan H.
    crowd: [
      { slot: 0.05, back: 0 }, { slot: 0.13, back: 5 }, { slot: 0.21, back: 0 }, { slot: 0.30, back: 5 }, { slot: 0.38, back: 0 }, { slot: 0.08, row: 1 },
      { slot: 0.615, back: 0, id: 'W', name: 'Rüzgarüstü komşu' }
    ],
    steps: [
      { t: 0, title: 'Start\'a 81 sn: S sıkışmış', text: 'Pin tarafı kalabalık. S ikinci sırada kalmış: önünde tekneler, havası kirli (pis rüzgar), hızlanacak yeri yok. Burada beklerse start\'ta arkada kalır.' },
      { t: 3, title: 'Geri çekil, kalabalıktan çık', text: 'S rüzgaraltına dönüp kalabalığın arkasından çıkıyor, kavança atıp filonun 2 boy altından apaz ile hattın ortasına gidiyor. Sıkıştığın yerde inat etme: vakit varken daha boş bir yere geç.' },
      { t: 12, title: 'Boş yerde: rüzgarüstündekinin ALTINA yanaş', text: 'Ortada boşluk var. S boşluğun ortasına değil, rüzgarüstü komşusu W\'nin hemen rüzgaraltına, ona yakın yanaşıyor (yaklaşık 1 boy). W rüzgarüstünde olduğu için S\'ye yol verir (Kural 11), üstüne inemez. S\'nin rüzgaraltında ise açık su kalıyor: sinyalde hızlanacağı yer orası.' },
      { t: 15.5, title: 'Hata: rüzgaraltındakinin ÜSTÜNE yanaşmak', text: 'H de kalabalıktan çıkıp sağa gitti ama yanlış tarafa yanaştı: L\'nin hemen rüzgarüstüne, ona çok yakın. Şimdi rüzgaraltı tekne L; L orsalarsa H yol vermek zorunda (Kural 11). H\'nin altında açık su yok, kendi yeri L\'nin elinde.' },
      { t: 24.5, title: '2.5 sn kala doldur', text: 'S ve L altlarındaki boşluğa doğru biraz düşüp yelkeni dolduruyor, hızlanıyor. H\'nin düşecek yeri yok: hemen altında L var.' },
      { t: 27, title: 'START: altı boş olan kazanır', text: 'S temiz havada, tam hızda çıkıyor; W üstte kalıyor. Sağda L hızlanınca biraz orsalıyor (Kural 11): H yol vermek için duruyor, L\'nin ters rüzgarında kalıyor ve geride düşüyor. Kural: yer tutarken hep rüzgarüstündeki teknenin altına, ona yakın yanaş; altındaki boşluk senindir. Rüzgaraltındakinin üstüne yanaşırsan boşluk onundur.' }
    ],
    addBoat: { pin: { x: 290, y: 600 }, middle: { x: 500, y: 600 }, committee: { x: 720, y: 600 } },
    startSlots: { pin: [0.1], middle: [0.5], committee: [0.9] }
  });

  // ---------- B1: Kural 10 ----------
  S.push({
    id: 'b1-rule10',
    category: 'Kurallar', topic: 'Temel hak kuralları',
    title: 'B1 · Kural 10: İskele kontra, sancak kontraya yol verir',
    summary: 'Zıt kontralardaki iki tekne kesişirken rüzgarı iskeleden alan (bumbası sancakta olan) tekne yol vermek zorundadır. Yol vermenin iki yolu vardır: arkasından geç (duck) ya da tramola at.',
    duration: 14,
    baseSpeed: 55,
    wind: 0,
    marks: [{ x: 500, y: 90, label: 'Orsa şamandırası', zone: false }],
    boats: [
      { id: 'S', name: 'Sancak kontra', role: 'hak', color: '#2a9d8f',
        start: { x: 760, y: 620, h: 315 }, v0: 55,
        segs: [{ mode: 'closehauled', tack: 'starboard', dur: 14, turn: 0 }] },
      { id: 'P', name: 'İskele kontra', role: 'yol', color: '#e76f51',
        start: { x: 240, y: 620, h: 45 }, v0: 55,
        segs: [
          { mode: 'closehauled', tack: 'port', dur: 3.6, turn: 0 },
          { mode: 'heading', h: 100, dur: 2.6, turn: 1.0 },           // bordala, arkasından geç
          { mode: 'closehauled', tack: 'port', dur: 7.6, turn: 1.2 }
        ] }
    ],
    steps: [
      { t: 0, title: 'İki tekne kesişiyor', text: 'Yeşil tekne rüzgarı SANCAK tarafından alıyor (bumba iskelede): sancak kontra. Turuncu tekne rüzgarı iskeleden alıyor: iskele kontra. Kural 10: iskele kontralı tekne yol verir.' },
      { t: 3, title: 'Karar anı', text: 'Turuncu, çarpışma rotasında olduğunu erken görmeli. Seçenekler: (1) bordalayıp yeşilin kıçından geçmek (duck), (2) yeşilin rüzgaraltına tramola atmak (lee-bow), (3) erken tramola atıp uzaklaşmak.' },
      { t: 3.8, title: 'Bordalama (duck)', text: 'Turuncu bordalıyor ve yeşilin kıç tarafından geçiyor. Kıça yaklaşırken bir an "lift" alırsınız; dalgaya dikkat. Bu seçenek, gitmek istediğiniz taraf sağ ise en ucuzudur: sadece 1-2 tekne boyu kaybedersiniz.' },
      { t: 7, title: 'Kontraya geri dön', text: 'Yeşilin arkasından geçince hemen orsaya dönün. Sakın yeşilin kıçına çok yakın "sürtmeyin": Kural 14 temas etmeyi her iki tekne için de yasaklar.' },
      { t: 10, title: 'Hatırlatma', text: 'Sancak kontralı tekne "Starboard!" diye seslenir ama hakkı seslenmesine bağlı değildir. Sancak kontra tekne de rotasını aniden değiştirip iskele teknenin kaçmasını engelleyemez (Kural 16).' }
    ],
    addBoat: { pin: { x: 130, y: 600 }, middle: { x: 430, y: 660 }, committee: { x: 880, y: 600 } }
  });

  // ---------- C1: Header'da tramola ----------
  S.push({
    id: 'c1-header-tack',
    category: 'Taktik', topic: 'Rüzgar ve orsa',
    title: 'C1 · Salınımlı rüzgar: kapatmada (header) tramola at',
    summary: 'Rüzgar birkaç dakikada bir sağa-sola salınıyorsa, sizi orsadan "kapatan" dönüşte tramola atıp "açan" (lift) kontrada kalmak, hiç tramola atmayan tekneye kıyasla ciddi kazanç sağlar.',
    duration: 38,
    baseSpeed: 20,
    wind: [
      { t: 0, from: 0 }, { t: 6, from: 0 }, { t: 10, from: -15 }, { t: 18, from: -15 },
      { t: 22, from: 15 }, { t: 30, from: 15 }, { t: 34, from: 0 }, { t: 40, from: 0 }
    ],
    rungs: { boat: 'T', from: 12 },
    showWindTrace: true,
    boats: [
      { id: 'T', name: 'Kapatmada tramola atan', role: 'dogru', color: '#2a9d8f',
        start: { x: 680, y: 650, h: 315 }, v0: 20,
        segs: [
          { mode: 'closehauled', tack: 'starboard', dur: 10, turn: 0 },
          { mode: 'closehauled', tack: 'port', dur: 12, turn: 1.5 },
          { mode: 'closehauled', tack: 'starboard', dur: 16, turn: 1.5 }
        ] },
      { id: 'K', name: 'Kontrada devam eden', color: '#e76f51',
        start: { x: 560, y: 650, h: 315 }, v0: 20,
        segs: [{ mode: 'closehauled', tack: 'starboard', dur: 38, turn: 0 }] }
    ],
    steps: [
      { t: 0, title: 'Rüzgar tam kuzeyden', text: 'İki tekne de sancak kontra orsa gidiyor. Sağ üstteki ok rüzgarın GELDİĞİ yönü gösterir. Pusulada orsa rotanızı not edin: örn. sancak kontra 315°.' },
      { t: 7, title: 'Rüzgar sola dönüyor: HEADER', text: 'Rüzgar sola (−15°) dönünce sancak kontradaki tekne daha aşağı rota tutmak zorunda kalır: burnu şamandıradan uzaklaşır. Buna kapatma/header denir. Pusula 315 → 300.' },
      { t: 10, title: 'Yeşil tramola atıyor', text: 'Kural: "Header\'da tramola." Yeşil iskele kontraya geçince yeni rotası 30°: rüzgar onu şamandıraya doğru "açıyor" (lift). Turuncu ise kapalı kontrada devam ediyor.' },
      { t: 14, title: 'Merdiven basamağı', text: 'Kesikli çizgi (rüzgara dik) kimin gerçekten önde olduğunu gösterir. Yeşil, turuncunun önüne geçti. Rüzgar hangi yöndeyse "üst" o yöndür; ekranın üstü değil!' },
      { t: 20, title: 'Rüzgar sağa dönüyor', text: 'Rüzgar +15°\'ye geçince bu kez iskele kontradaki yeşil kapanır (rotası 30 → 60). Turuncu ise sancak kontrada açılır (300 → 330).' },
      { t: 22, title: 'Yeşil yine tramola', text: 'Yeşil kapanınca tekrar tramola atıp sancak kontraya, yani açılan kontraya geçiyor. Her iki tekne de şimdi aynı kontrada; fark korunuyor ve büyüyor.' },
      { t: 32, title: 'Sonuç', text: 'Yeşil, her dönüşte açılan kontrada kaldığı için rüzgara doğru daha kısa yol yaptı. Pratik: pusula ortalama rotayı bilin; ortalamanın altına düşerseniz (kapandıysanız) tramola; üstündeyseniz devam. Her küçük dalgalanmada değil, dönüş "yerleşince" tramola atın.' }
    ],
    addBoat: { pin: { x: 440, y: 650 }, middle: { x: 620, y: 650 }, committee: { x: 760, y: 650 } }
  });

  // ---------- B8: Kural 18 ----------
  S.push({
    id: 'b8-rule18',
    category: 'Kurallar', topic: 'Şamandıra',
    title: 'B8 · Kural 18: Şamandıra yeri (zone ve bindirme)',
    summary: 'Şamandıranın 3 tekne boyu çevresi "zone"dur. İlk tekne zone\'a girdiği anda içte bindirmesi olan tekne "şamandıra yeri" (mark-room) kazanır; dıştaki tekne ona dönüş için yer vermek zorundadır.',
    duration: 17.5,
    baseSpeed: 40,
    wind: 0,
    marks: [{ x: 450, y: 168, label: 'Orsa şamandırası (iskelede bırak)', zone: true }],
    boats: [
      { id: 'I', name: 'İçteki · yer hakkı', role: 'hak', color: '#2a9d8f',
        start: { x: 830, y: 460, h: 315 }, v0: 40,
        segs: [
          { mode: 'closehauled', tack: 'starboard', dur: 9.3, turn: 0 },
          { mode: 'heading', h: 250, dur: 1.4, turn: 1.4 },
          { mode: 'run', tack: 'starboard', dur: 6.8, turn: 1.8 }
        ] },
      { id: 'O', name: 'Dıştaki · yer verir', role: 'yol', color: '#e76f51',
        start: { x: 876, y: 420, h: 315 }, v0: 40,
        segs: [
          { mode: 'closehauled', tack: 'starboard', dur: 12.2, turn: 0 },
          { mode: 'heading', h: 250, dur: 1.6, turn: 1.4 },
          { mode: 'run', tack: 'starboard', dur: 3.7, turn: 1.8 }
        ] }
    ],
    steps: [
      { t: 0, title: 'İki tekne layline\'da', text: 'İki tekne de sancak kontra, bindirmeli (overlap) şekilde orsa şamandırasına geliyor. Yeşil tekne rüzgaraltında ve şamandıraya daha yakın: "içteki" tekne. Kesikli daire 3 tekne boyu "zone".' },
      { t: 7.6, title: 'Zone\'a giriş', text: 'İlk tekne zone\'a girdiği anda bindirme var mı diye bakılır. Var: yeşil içte. Bu andan itibaren turuncu, yeşile şamandırayı dönmesi için YER vermek zorunda (Kural 18.2). Bindirme daha sonra bozulsa bile hak devam eder.' },
      { t: 9.6, title: 'Dönüş', text: 'Yeşil şamandırayı yakından dönüyor; turuncu dışarıdan, daha geniş dönüyor. Turuncu "ben de buradayım" diye sıkıştıramaz; sıkıştırırsa ceza alır.' },
      { t: 12.5, title: 'Şamandıra sonrası', text: 'Dönüş tamamlanınca Kural 18 biter; normal kurallar (10, 11, 12) geçerli olur. Pupa seyrine geçildi; şimdi rüzgaraltı/rüzgarüstü ilişkisine bakılır.' },
      { t: 14.5, title: '2025-2028 kuralı notu', text: 'Yeni kurallarda ilk tekne zone\'a girdiği an hak sahibi netleşir. Zone içinde tramola atan tekne şamandıra yeri isteyemez (18.3). Zone\'a bindirmesiz, arkadan giren tekne de yer alamaz: içe burun sokmayın!' }
    ],
    addBoat: { pin: { x: 760, y: 530 }, middle: { x: 900, y: 530 }, committee: { x: 940, y: 400 } },
    addBoatLabels: { pin: 'Önde (iç)', middle: 'Arkada', committee: 'Dışta' }
  });

  // ---------- İA3: Hakem botu ucunda yer tut ----------
  S.push({
    id: 'ia3-committee-hold',
    category: 'İleri Taktik', topic: 'Start · Hakem botu',
    title: 'İA3 · Hakem botu ucunda yer tut: bayrağın dibinde bekle, kapıyı kapalı tut',
    summary: 'Hakem botu ucu avantajlıysa oradaki tek yer erken gelenindir. Yeşil H 2 dk kala layline\'dan, rüzgaraltından gelir ve hakem botunun turuncu bayrağının hemen yanında, hattın yarım boy altında rüzgara baş verip bekler. Hakem botuna yakın durduğu için rüzgarüstünde kimseye yer kalmaz; rüzgaraltında ise hızlanmak için boşluğu korur. Geç gelip araya sokulmak isteyen (barging) B yer bulamaz, arkadan dolaşıp H\'nin pis rüzgarında çıkar.',
    duration: 38,
    baseSpeed: 40, tau: 1.0,
    clockScale: 4,
    wind: 5,
    line: { pin: { x: 200, y: 440 }, boat: { x: 800, y: 440 } },
    startAt: 30,
    rungs: { boat: 'H', from: 30.5 },
    committeeLabel: 'right',
    laylines: [{ x: 770, y: 452, tack: 'starboard', len: 260, from: 0, to: 9, label: 'Hakem botu layline\'ı' }],
    boats: [
      { id: 'H', name: 'Bayrağın dibinde yer tutan', role: 'dogru', color: '#2a9d8f',
        start: { x: 893, y: 660, h: 320 }, v0: 30,
        segs: [
          { mode: 'closehauled', tack: 'starboard', dur: 4.9, turn: 0, note: 'Erken: layline\'dan, rüzgaraltından' },
          { mode: 'hold', h: 5, dur: 22.5, speed: 0.008, turn: 1.4, note: 'Bayrağın dibinde: yer benim' },
          { mode: 'closehauled', tack: 'starboard', dur: 11.1, turn: 0.8 }
        ] },
      { id: 'B', name: 'Geç gelip sokulan (barging)', role: 'hata', color: '#e76f51',
        start: { x: 975, y: 470, h: 358 }, v0: 2,
        segs: [
          { mode: 'hold', h: 358, dur: 14, speed: 0.03, turn: 0 },
          { mode: 'heading', h: 250, dur: 3.7, turn: 1.0, note: 'Barging: H ile hakem botu arasına' },
          { mode: 'heading', h: 200, dur: 1.6, turn: 0.8, note: 'Yer yok! Bordala' },
          { mode: 'heading', h: 270, dur: 1.6, turn: 1.0, note: 'H\'nin kıçından dolaşıyor' },
          { mode: 'hold', h: 358, dur: 6.9, speed: 0.04, turn: 1.4, note: '2. sırada, H\'nin arkasında' },
          { mode: 'closehauled', tack: 'starboard', dur: 10.5, turn: 0.8, note: 'H\'nin pis rüzgarında' }
        ] }
    ],
    crowd: [
      { slot: 0.08 }, { slot: 0.14 }, { slot: 0.20 }, { slot: 0.275 }, { slot: 0.35 }, { slot: 0.425 }, { slot: 0.50 }, { slot: 0.575 }, { slot: 0.65 }, { slot: 0.72 },
      { slot: 0.16, row: 1 }, { slot: 0.39, row: 1 }, { slot: 0.54, row: 1 }
    ],
    steps: [
      { t: 0, title: 'Start\'a 2 dk: hakem botu ucu avantajlı', text: 'Rüzgar 5° sağa dönmüş: hakem botu ucu biraz avantajlı. Herkes hakem botunun yanından çıkmak ister ama orada tek bir yer var: turuncu bayrağın hemen yanı. O yer erken ve doğru yönden gelenindir.' },
      { t: 1.5, title: 'Erken gel, layline\'dan gel', text: 'Yeşil H, 2 dk kala hakem botunun sancak layline\'ından, rüzgaraltından geliyor. Rüzgaraltından gelen tekne hak sahibidir (Kural 11); kimse onun rüzgarüstüne sokulamaz. Rüzgarüstünden gelmek (barging) hak vermez.' },
      { t: 5, title: 'Bayrağın dibinde dur', text: 'H hakem botunun turuncu bayrağının hemen yanında, hattın yaklaşık yarım boy altında, filoyla aynı hizada rüzgara baş verip duruyor. Hakem botuyla arasında bir tekne sığmaz: rüzgarüstündeki kapı kapalı. Ama hakem botuna değmiyor: değerse Kural 31, ceza turu.' },
      { t: 9, title: 'Yer tutma: hiç sürüklenme', text: 'Yelken boş, tekne neredeyse duruyor. Burnu rüzgarda tut; düşerse yelken dolar ve hatta sürünürsün, fazla geri giderse rüzgarüstünde boşluk açılır. Gerekirse yelkeni bir an doldurup burnu tekrar rüzgara ver: yer tutmak sürekli küçük düzeltmedir.' },
      { t: 12, title: 'Rüzgaraltında boşluğu koru', text: 'H\'nin rüzgaraltında, filonun en yakın teknesine kadar 2 boyluk açık su var. Sinyalde oraya bordalayıp hızlanacak. Bu boşluk H\'nin hızlanma yolu: biri gelip sokulursa H yavaş kalır. Rüzgaraltındaki boşluk, rüzgarüstü kapı kadar önemlidir.' },
      { t: 14, title: 'B geç geliyor: barging', text: 'Turuncu B son dakikada hakem botunun sağından, rüzgarüstünden, apaz hızla H ile hakem botu arasına girmek istiyor. Burada yer yok: H hakem botunun dibinde. B rüzgarüstü tekne olduğu için H\'ye yol vermek zorunda (Kural 11) ve hakem botu bir engel; ona çarparsa Kural 31.' },
      { t: 17, title: 'B bordalayıp arkadan dolaşıyor', text: 'B\'nin tek çaresi: sert bordalayıp H\'nin kıçından geçmek. Hız ve yer kaybediyor, ikinci sıraya düşüyor.' },
      { t: 27.4, title: '10 sn kala doldur', text: 'H burnunu rüzgaraltındaki boşluğa düşürüp yelkeni dolduruyor; hızlanırken hakem botundan uzaklaşıyor, kimseye çarpmıyor.' },
      { t: 30, title: 'START: avantajlı uçta, temiz hava', text: 'H hakem botunun hemen yanından, tam hızla ve temiz havada çıkıyor. B hem geride hem H\'nin pis rüzgarında (mor gölge).' },
      { t: 34, title: 'Özet', text: 'Hakem botu ucunda: erken gel, layline\'dan rüzgaraltından gel, bayrağın dibinde dur (rüzgarüstünde boşluk bırakma), rüzgaraltındaki boşluğu koru, 2-3 sn kala doldur. Geç kalırsan rüzgarüstünden sokulma: kapı kapalıdır, 3-4 boy aşağıda temiz bir yer seç.' }
    ],
    addBoat: { pin: { x: 290, y: 580 }, middle: { x: 500, y: 580 }, committee: { x: 720, y: 580 } },
    startSlots: { pin: [0.1], middle: [0.5], committee: [0.8] }
  });

  // ---------- İA5: hakem botu ucu kalabalık: erken gir, yerini tut ----------
  S.push({
    id: 'ia5-committee-crowd',
    category: 'İleri Taktik', topic: 'Start · Hakem botu',
    title: 'İA5 · Hakem botu kalabalık: erken gir, yerini tut',
    summary: 'Hakem botu ucu avantajlı ve herkes oraya yığılıyor. Yeşil D erken gelir, kalabalığın içine girip turuncu bayrağın dibinde yerini alır ve start\'a kadar orada bekler. Turuncu Y ise kalabalığın dışında, açıkta bekler: "son dakika girerim" der. 1 dk kala geldiğinde ön sıra dolmuştur; giremez, D\'nin altında (arkasında) ikinci sırada kalır ve start\'ı D\'nin pis rüzgarında alır.',
    duration: 38,
    baseSpeed: 40,
    clockScale: 4,
    wind: 5,
    line: { pin: { x: 200, y: 440 }, boat: { x: 800, y: 440 } },
    startAt: 30,
    rungs: { boat: 'D', from: 30.5 },
    committeeLabel: 'right',
    laylines: [{ x: 770, y: 452, tack: 'starboard', len: 260, from: 0, to: 8, label: 'Hakem botu layline\'ı' }],
    boats: [
      { id: 'D', name: 'Erken girip yer tutan', role: 'dogru', color: '#2a9d8f',
        start: { x: 893, y: 660, h: 320 }, v0: 30,
        segs: [
          { mode: 'closehauled', tack: 'starboard', dur: 4.9, turn: 0, note: 'Erken: layline\'dan kalabalığa gir' },
          { mode: 'hold', h: 5, dur: 22.5, speed: 0.008, turn: 1.4, note: 'Bayrağın dibinde: yer benim' },
          { mode: 'closehauled', tack: 'starboard', dur: 11.1, turn: 0.8 }
        ] },
      { id: 'Y', name: 'Dışarıda bekleyip giremeyen', role: 'hata', color: '#e76f51',
        start: { x: 950, y: 610, h: 0 }, v0: 0,
        segs: [
          { mode: 'hold', h: 0, dur: 14, speed: 0.03, turn: 0, note: 'Dışarıda: "son dakika girerim"' },
          { mode: 'heading', h: 277, dur: 5.05, turn: 1.0, note: 'Geç: hakem botuna doğru' },
          { mode: 'hold', h: 359, dur: 8.35, speed: 0.015, turn: 1.4, note: 'Yer yok! D\'nin altında kaldı' },
          { mode: 'closehauled', tack: 'starboard', dur: 4, turn: 0.8, speed: 0.8 },
          { mode: 'closehauled', tack: 'starboard', dur: 6.6, turn: 0.8, speed: 0.9, note: 'Pis rüzgarda, 2. sırada' }
        ] }
    ],
    crowd: [
      { slot: 0.14 }, { slot: 0.27 }, { slot: 0.335 }, { slot: 0.40 }, { slot: 0.465 }, { slot: 0.53 }, { slot: 0.595 }, { slot: 0.66 }, { slot: 0.725 }, { slot: 0.79 },
      { slot: 0.43, row: 1 }, { slot: 0.56, row: 1 }, { slot: 0.69, row: 1 }
    ],
    steps: [
      { t: 0, title: 'Start\'a 2 dk: hakem botu ucu kalabalık', text: 'Rüzgar 5° sağa dönmüş, hakem botu ucu avantajlı. Filonun yarısı hakem botu tarafına yığılmış. En değerli yer turuncu bayrağın hemen yanı ve orada tek kişilik yer var: önce gelen alır.' },
      { t: 1.5, title: 'D erken geliyor', text: 'Yeşil D, 2 dk kala hakem botunun sancak layline\'ından, rüzgaraltından gelip kalabalığın içine giriyor. Rüzgaraltından gelen tekne hak sahibidir (Kural 11): bekleyen tekneler ona yer açar, kimse onun rüzgarüstüne sokulamaz.' },
      { t: 5.5, title: 'Bayrağın dibinde yerini al', text: 'D turuncu bayrağın hemen yanında, hattın yarım boy altında, filoyla aynı hizada rüzgara baş verip duruyor. Hakem botuyla arasında tekne sığmaz; rüzgaraltındaki tekneye kadar yaklaşık 1 boy hızlanma yeri var. Yer artık D\'nin: 1,5 dakika boyunca burnunu rüzgarda tutup orada bekleyecek.' },
      { t: 9, title: 'Y dışarıda bekliyor', text: 'Turuncu Y kalabalığa girmemiş; hakem botunun sağında, açıkta rahat rahat bekliyor: "Son dakika gelir, araya girerim." Açıkta beklemek kolaydır ama yer tutmaz. Kalabalık uçta yer, bekleyerek değil, erken girip orada durarak alınır.' },
      { t: 14, title: '1 dk kala: Y geç geliyor', text: 'Y şimdi hakem botuna doğru geliyor. Ama ön sıra dolu: bayrağın dibinde D, onun rüzgaraltında filo, aralarda tekne sığacak boşluk yok. Rüzgarüstünden, D ile hakem botu arasına girmek ise barging olur: hak vermez (Kural 11) ve hakem botuna değerse Kural 31.' },
      { t: 20.5, title: 'Yer yok: Y, D\'nin altında kaldı', text: 'Y giremedi; D\'nin hemen altında, arkasında ikinci sırada duruyor. Arkadan gelen tekne öndekine yol verir (Kural 12): D\'nin yerini isteyemez. Önünde D, rüzgaraltında filo teknesi var: sinyalde düşüp hızlanacağı yer de yok.' },
      { t: 27.4, title: '10 sn kala doldur', text: 'D burnunu rüzgaraltındaki küçük boşluğa düşürüp yelkeni dolduruyor ve hızlanıyor. Y ancak D gittikten sonra hareket edebiliyor ve D\'nin pis rüzgarında (mor gölge) hızlanıyor.' },
      { t: 30, title: 'START: erken giren ön sırada', text: 'D avantajlı uçtan, hakem botunun hemen yanından, temiz havada ve tam hızda çıkıyor. Y ikinci sırada, D\'nin arkasında; havası kirli, hızı düşük ve her saniye biraz daha geride.' },
      { t: 34, title: 'Özet', text: 'Hakem botu ucu kalabalıksa: erken gel, layline\'dan rüzgaraltından gir, bayrağın dibinde yerini al ve start\'a kadar orada tut. Dışarıda bekleyip son dakika girmeyi planlarsan ön sıra dolar ve birinin altında, arkasında kalırsın. Geç kaldıysan inat etme: 3-4 boy aşağıda boş bir yer seç.' }
    ],
    addBoat: { pin: { x: 290, y: 580 }, middle: { x: 500, y: 580 }, committee: { x: 720, y: 600 } },
    startSlots: { pin: [0.1], middle: [0.5], committee: [0.8] }
  });

  // ---------- İA6: kuvvetli rüzgar, hakem botu ucunda açılan boşluk ----------
  S.push({
    id: 'ia6-committee-gap',
    category: 'İleri Taktik', topic: 'Start · Hakem botu',
    title: 'İA6 · Kuvvetli rüzgar: hakem botunda açılan boşluğa gir',
    summary: 'Kuvvetli rüzgarda (18 knot) hakem botunun yanı yine kalabalık ama orada durmak zordur: yelkeni boş bekleyen tekneler rüzgaraltına, aşağı kayar ve son 30-40 saniyede botun dibinde boşluk açılır. Turuncu Y erkenden bayrağın dibine park eder, yerini tutamaz, kayar. Yeşil D hakem botunun sancak tarafında, start hattı hizasında bekler; boşluğun açılacağını bildiği için yavaş yavaş botun kıçından dolaşıp açılan boşluğa girer ve hakem botu ucundan, temiz havada start eder.',
    duration: 40,
    baseSpeed: 40,
    clockScale: 4,
    windKn: 18,
    wind: 5,
    line: { pin: { x: 200, y: 440 }, boat: { x: 800, y: 440 } },
    startAt: 32,
    rungs: { boat: 'D', from: 32.5 },
    committeeLabel: 'upright',
    leeway: { from: 18, ramp: 3, rate: 4 },   // kuvvetli rüzgar: bekleyen filo son 1 dk rüzgaraltına kayar (rules.simulate)
    laylines: [{ x: 770, y: 452, tack: 'starboard', len: 260, from: 0, to: 6, label: 'Hakem botu layline\'ı' }],
    boats: [
      { id: 'D', name: 'Dışarıda bekleyip boşluğa giren', role: 'dogru', color: '#2a9d8f',
        start: { x: 905, y: 455, h: 5 }, v0: 0,
        segs: [
          { mode: 'hold', h: 5, dur: 21.6, speed: 0.008, turn: 0, drift: 0.4, note: 'Hat hizasında, botun sancağında' },
          { mode: 'heading', h: 212, dur: 3.4, turn: 1.4, speed: 0.5, note: 'Boşluk açılacak: yavaşça botun kıçına' },
          { mode: 'heading', h: 285, dur: 2.7, turn: 1.0, speed: 0.55, note: 'Açılan boşluğa giriyor' },
          { mode: 'heading', h: 335, dur: 1.1, turn: 0.8, speed: 0.4, note: 'Açılan boşluğa giriyor' },
          { mode: 'hold', h: 325, dur: 1.0, speed: 0.01, turn: 0.8, note: 'Botun dibinde: yer benim' },
          { mode: 'closehauled', tack: 'starboard', dur: 11, turn: 0.8 }
        ] },
      { id: 'Y', name: 'Erken park edip kayan', role: 'hata', color: '#e76f51',
        start: { x: 893, y: 660, h: 320 }, v0: 30,
        segs: [
          { mode: 'closehauled', tack: 'starboard', dur: 4.6, turn: 0, note: 'Erken: bayrağın dibine' },
          { mode: 'hold', h: 5, dur: 13.4, speed: 0.008, turn: 1.4, drift: 0.6, note: 'Bayrağın dibinde, zorlukla' },
          { mode: 'hold', h: 348, dur: 11.5, speed: 0.008, turn: 2.5, drift: 5.5, note: 'Tutamıyor: aşağı kayıyor' },
          { mode: 'closehauled', tack: 'starboard', dur: 10.5, turn: 1.0 }
        ] }
    ],
    crowd: [
      { slot: 0.14, back: -12 }, { slot: 0.26, back: -12 }, { slot: 0.325, back: -12 }, { slot: 0.39, back: -12 }, { slot: 0.455, back: -12 }, { slot: 0.52, back: -12 }, { slot: 0.585, back: -12 }, { slot: 0.65, back: -12 }, { slot: 0.715, back: -12 },
      { slot: 0.42, row: 1, back: -12 }, { slot: 0.55, row: 1, back: -12 }, { slot: 0.73, row: 1, back: -12 }
    ],
    spots: [{ x: 772, y: 482, r: 27, from: 23.5, to: 30, label: 'Boşluk', dx: -48, dy: 4 }],
    steps: [
      { t: 0, title: 'Start\'a 2 dk: kuvvetli rüzgar, hakem botu ucu kalabalık', text: 'Rüzgar 18 knot, kuvvetli (sol üstteki gösterge) ve 5° sağa dönmüş: hakem botu ucu avantajlı, filo oraya yığılıyor, herkes botun yanını kapatmak istiyor. Ama kuvvetli rüzgarda yelkeni boş bir Optimist yerinde durmakta zorlanır.' },
      { t: 1.5, title: 'Y erken gelip bayrağın dibine park ediyor', text: 'Turuncu Y, İA5\'teki gibi erken ve layline\'dan gelip turuncu bayrağın hemen yanına yerleşiyor. Orta ve hafif havada bu doğru plandır. Kuvvetli rüzgarda ise orada 2 dakika beklemek gerekiyor ve bu çok zor.' },
      { t: 6, title: 'D dışarıda, hat hizasında bekliyor', text: 'Yeşil D kalabalığa girmiyor. Hakem botunun sancak tarafında (dışında), start hattının uzantısında, hatla aynı hizada bekliyor. Buradan botun dibini ve kalabalığı görüyor, kimse onu sıkıştıramıyor ve hattan geride de değil.' },
      { t: 11, title: 'Kuvvetli rüzgarda durmak zor', text: 'Yelken boşken rüzgar teknenin gövdesini ve direğini iter; tekne yana ve geriye, rüzgaraltına doğru kayar. Y sık sık yelkeni bir an doldurup burnunu rüzgara veriyor ama her düzeltmede biraz daha aşağı iniyor. Filo da aynı sorunu yaşıyor.' },
      { t: 18, title: 'Son 1 dakika: tekneler aşağı kayıyor', text: 'Beklemek uzadıkça kayma artıyor. Y ve yanındaki tekneler hem aşağı hem rüzgaraltına, pin tarafına doğru kayıyor. Hakem botunun dibi yavaş yavaş boşalıyor. Kuvvetli rüzgarda bu hemen her start\'ta olur: son 30-40 saniyede hakem botunun yanında boşluk açılır.' },
      { t: 21.6, title: 'D boşluğu önceden görüp yavaşça geliyor', text: 'D boşluğun açılacağını biliyor, açılmasını beklemeden yola çıkıyor: yelkeni yarım doldurup yavaşça hakem botunun kıçına doğru düşüyor. Hızlı gelirse erken varıp beklemek zorunda kalır; yavaş gelirse boşluk açıldığı anda oradadır. Hakem botuna değmek Kural 31: ceza turu.' },
      { t: 24.5, title: 'Boşluk açıldı: D botun kıçından dolaşıp giriyor', text: 'Y ve filo 1-1,5 boy aşağı kaydı; hakem botunun dibinde bir tekne sığacak boşluk var (sarı halka). D botun kıçından dolaşıp oraya giriyor. Rüzgarüstü olduğu için Y\'den uzak durur (Kural 11); boşluk yoksa zorlamak barging olur.' },
      { t: 28.5, title: 'Hızı var, yeri var', text: 'D boşluğa yavaşça ama hareket halinde girdi. Bekleyen tekneler sıfır hızdan hızlanacak; D\'nin ise zaten biraz hızı var. Kayan Y, kendi yerinden 1,5 boy geride ve filonun arasında sıkışık.' },
      { t: 30.2, title: '7 sn kala doldur', text: 'D yelkeni dolduruyor ve orsa rotasına dönüyor. Kuvvetli rüzgarda Optimist hızlı hızlanır; geç doldurmak hızlanma yolu boyunca geride kalmak demektir. Y de dolduruyor ama hattın çok gerisinden başlıyor.' },
      { t: 32, title: 'START: hakem botu ucundan, temiz havada', text: 'D filonun en sağından, hakem botunun yanından, avantajlı uçtan, temiz havada ve hızla çıkıyor. Bayrağın dibine erken park eden Y ise kaydığı için hattın yaklaşık 1,5 boy gerisinde, D\'nin rüzgaraltında-arkasında.' },
      { t: 36, title: 'Özet', text: 'Kuvvetli rüzgarda hakem botu ucu: bayrağın dibine erken park etme, orada duramaz, kayarsın. Hakem botunun sancak tarafında, hat hizasında bekle. Son 30-40 saniyede açılan boşluğu öngör, botun kıçından yavaş yavaş gel ve boşluğa hızı olan tekne olarak gir. Boşluk açılmazsa zorlama: 2-3 boy aşağıda temiz bir yer seç.' }
    ],
    addBoat: { pin: { x: 290, y: 580 }, middle: { x: 500, y: 580 }, committee: { x: 720, y: 610 } },
    startSlots: { pin: [0.1], middle: [0.5], committee: [0.8] }
  });

  // ---------- İA7: hatta yer tut, kayınca yüksel ----------
  S.push({
    id: 'ia7-hold-climb',
    category: 'İleri Taktik', topic: 'Start · Yer tutma',
    title: 'İA7 · Kaydıkça yüksel: iskota, ikili tramola, yerinde tramola',
    summary: 'Start\'ı beklerken rüzgar ve akıntı tekneyi aşağı ve rüzgaraltına kaydırır. Yeşil S iki grup teknenin arasında bekliyor ve rüzgaraltındaki gruba doğru kayıyor; oysa yeri rüzgarüstü grubun en alttaki teknesinin hemen rüzgaraltı. S kaybettiği yüksekliği dört yolla geri alır: iskotayı bir an çekip orsalamak, ikili tramola (tramola + tramola + hemen dur), durduğu yerde tramola ve burnu açıp doldurup orsalamak. Hepsinde ölçü aynı: hareket çabuk biter, tekne kendini öne atmaz. Turuncu H aynı hamleyi fazla hızla yapar, hattın üstüne fırlar.',
    duration: 40,
    baseSpeed: 40,
    clockScale: 4,
    windKn: 12,
    wind: 0,
    line: { pin: { x: 200, y: 440 }, boat: { x: 800, y: 440 } },
    startAt: 32,
    rungs: { boat: 'S', from: 32.5 },
    leeway: { from: 0, ramp: 2, rate: 0.5 },
    boats: [
      { id: 'S', name: 'Kaydıkça yükselen', role: 'dogru', color: '#2a9d8f',
        start: { x: 565, y: 482, h: 345 }, v0: 0,
        segs: [
          { mode: 'hold', h: 345, dur: 5.5, speed: 0.004, turn: 0, drift: 6, driftH: 235, note: 'Rüzgar ve akıntı aşağı kaydırıyor' },
          { mode: 'heading', h: 330, dur: 1.3, speed: 0.55, turn: 0.4, note: '1) İskotayı çek: bir an doldur' },
          { mode: 'hold', h: 355, dur: 5.2, speed: 0.004, turn: 0.7, drift: 6, driftH: 235, note: 'Orsala, dur: biraz yükseldi' },
          { mode: 'heading', h: 62, dur: 3.0, speed: 0.55, turn: 0.7, note: '2) Tramola: rüzgarüstüne, W\'ye doğru' },
          { mode: 'heading', h: 345, dur: 1.3, speed: 0.12, turn: 0.7, note: 'İkinci tramola, hemen dur' },
          { mode: 'hold', h: 345, dur: 3.3, speed: 0.004, turn: 0.4, drift: 3, note: 'W\'nin altında bekliyor' },
          { mode: 'heading', h: 25, dur: 1.4, speed: 0.12, turn: 0.9, note: '3) Durduğu yerde tramola' },
          { mode: 'hold', h: 345, dur: 3.6, speed: 0.004, turn: 1.1, drift: 3, note: 'Yerinde tramola: öne atılmadan' },
          { mode: 'heading', h: 330, dur: 1.0, speed: 0.6, turn: 0.4, note: '4) Burnu aç, doldur' },
          { mode: 'hold', h: 358, dur: 4.3, speed: 0.004, turn: 0.6, drift: 3, note: 'Orsala: hız tekneyi yukarı taşır' },
          { mode: 'closehauled', tack: 'starboard', dur: 10, turn: 0.8 }
        ] },
      { id: 'H', name: 'Fazla hızla, öne fırlayan', role: 'hata', color: '#e76f51',
        start: { x: 440, y: 480, h: 345 }, v0: 0,
        segs: [
          { mode: 'hold', h: 345, dur: 10.5, speed: 0.004, turn: 0, drift: 3, note: 'O da kayıyor' },
          { mode: 'heading', h: 45, dur: 2.0, speed: 1, turn: 0.6, note: 'Tramola: yelken tam dolu' },
          { mode: 'heading', h: 340, dur: 1.6, speed: 0.9, turn: 0.6, note: 'Çok hızlı: kendini öne attı!' },
          { mode: 'hold', h: 350, dur: 2.0, speed: 0.01, turn: 0.6, note: 'Burnu hatta: rüzgarüstü kapandı' },
          { mode: 'hold', h: 345, dur: 15.5, speed: 0.004, turn: 0.8, drift: 3, note: 'Önde, korumasız bekliyor' },
          { mode: 'closehauled', tack: 'starboard', dur: 8.4, turn: 0.8 }
        ] }
    ],
    // iki grup: rüzgaraltı (pin tarafı) ve rüzgarüstü (hakem botu tarafı); aradaki boşlukta S ve H
    crowd: [
      { slot: 0.10 }, { slot: 0.175 }, { slot: 0.25 }, { slot: 0.18, row: 1 },
      { slot: 0.62, id: 'W', name: 'Rüzgarüstü grubun en alttakisi' }, { slot: 0.695 }, { slot: 0.77 }, { slot: 0.845 }, { slot: 0.72, row: 1 }
    ],
    steps: [
      { t: 0, title: 'Start\'a 2 dk: iki grubun arasında', text: 'Rüzgar 12 knot, akıntı da rüzgaraltına doğru. Yeşil S iki grup teknenin arasında bekliyor. Yeri belli: sağdaki (rüzgarüstü) grubun en alttaki teknesi W\'nin hemen rüzgaraltı. Orada W\'nin altındaki boşluk S\'nin hızlanma yolu olur.' },
      { t: 2.5, title: 'Beklerken kayıyorsun', text: 'Yelken boşken tekneyi rüzgar ve akıntı aşağıya ve rüzgaraltına (pin tarafına) iter. S yavaş yavaş soldaki gruba yaklaşıyor ve hattan uzaklaşıyor. Hiçbir şey yapmazsan 2 dakikada 2-3 boy kaybedersin.' },
      { t: 5.5, title: '1) İskotayı çek: bir an doldur', text: 'En küçük düzeltme: burnu biraz açıp iskotayı bir an çek. Tekne bir iki metre ileri ve yukarı gider; hemen orsalayıp yelkeni boşalt. Yükseklik geri geldi ama tekne hızlanmadı. Çok çekersen hızlanır ve hattın dibine fırlarsın.' },
      { t: 8, title: 'Ama yine kayıyor', text: 'Bu düzeltme yer değiştirmez, yalnızca yükseltir. S hâlâ soldaki gruba yakın; istediği yer sağda, W\'nin altında. Yana gitmek için tramola gerekir.' },
      { t: 12, title: '2) İkili tramola: tramola + tramola + dur', text: 'S tramola atıp iskele kontrada yukarı ve rüzgarüstüne, W\'ye doğru gidiyor; hemen ikinci tramolayı atıp sancağa dönüyor ve yelkeni boşaltıp duruyor. Hem yükseldi hem W\'ye yaklaştı. İskele kontradayken herkese yol verir (Kural 10, 13): bu yüzden hamle kısa ve kimsenin önünden geçmeden yapılır.' },
      { t: 12.6, title: 'H: aynı hamle, fazla hız', text: 'Turuncu H de ikili tramola atıyor ama yelkeni tam dolduruyor. Tekne hızlanıyor, ikinci tramoladan sonra duramıyor ve kendini öne atıyor: burnu hattın üstünde. Son dakikada bu fodepar riski (I, U, siyah bayrak) ve öndeki tekne rüzgarüstüne kapı bırakır.' },
      { t: 15.5, title: 'W\'nin altında yer', text: 'S artık W\'nin hemen rüzgaraltında, ona yakın. Altında soldaki gruba kadar açık su var. Ama rüzgar ve akıntı kaydırmaya devam ediyor; yerini tutmak sürekli küçük düzeltme ister.' },
      { t: 20, title: '3) Durduğun yerde tramola', text: 'Neredeyse duran tekne de tramola atabilir: dümeni basıp burnu rüzgardan geçir, yelken öbür tarafa geçince tekrar başla. Burun rüzgara girerken tekne biraz yukarı çıkar. Önemli olan hız: hareket çabuk bitsin ama tekne öne atılmasın. Ne çok hızlı (fırlarsın) ne çok yavaş (burun rüzgarda takılır, geri kayarsın).' },
      { t: 25.2, title: '4) Burnu aç, doldur, orsala', text: 'Son düzeltme: burnu biraz açıp yelkeni doldur, tekne bir boy kadar hız alsın; sonra orsalayıp burnu rüzgara ver. Hız tekneyi yukarı taşır ve tekne W\'nin hizasında yeniden durur. Kaydıysan ya da iki tekne arasında sıkıştıysan en çabuk yükselme budur.' },
      { t: 29.9, title: '8 sn kala doldur', text: 'S, W\'nin hemen rüzgaraltında, hat hizasında. Altındaki boşluğa biraz düşüp dolduruyor ve hızlanıyor.' },
      { t: 32, title: 'START', text: 'S W ile yan yana, temiz havada ve tam hızda çıkıyor. H öne fırladığı için uzun süre korumasız bekledi; komşuları onun rüzgarüstünde ve hızlanma yolu kısa.' },
      { t: 36, title: 'Özet', text: 'Beklerken kayarsın: iskotayı bir an çek (yüksel), ikili tramola at (yüksel ve rüzgarüstüne git), durduğun yerde tramola at, ya da burnu açıp doldur ve orsala. Her birinde hareket çabuk biter, tekne öne atılmaz. Yerin: rüzgarüstündeki teknenin hemen altı.' }
    ],
    expectFaults: [],
    addBoat: { pin: { x: 290, y: 600 }, middle: { x: 500, y: 600 }, committee: { x: 720, y: 600 } },
    startSlots: { pin: [0.1], middle: [0.5], committee: [0.9] }
  });

  // ---------- İA8: pin avantajlı, pin'de karmaşa ----------
  S.push({
    id: 'ia8-pin-chaos',
    category: 'İleri Taktik', topic: 'Start · Pin',
    title: 'İA8 · Pin\'de karmaşa: layline\'ın üstünde kal, altında kalırsan çık',
    summary: 'Rüzgar 15° sola dönmüş, pin çok avantajlı ve filonun yarısı pin\'e yığılıyor. Yeşil P erken gelir, pin layline\'ının ÜSTÜNDE, pin\'in yarım boy içinde yerini alır ve pin\'den çıkar. Turuncu L kalabalıkta aşağı itilir, layline\'ın ALTINDA kalır: sinyalde pin\'i dönemez, tramola atıp herkese yol vermek zorunda kalır (Kural 13, 10). Mor Y geç gelir, ön sıra dolmuştur: ikinci sırada, pis rüzgarda çıkar.',
    duration: 38,
    baseSpeed: 40,
    clockScale: 4,
    wind: 345,
    line: { pin: { x: 200, y: 440 }, boat: { x: 800, y: 440 } },
    startAt: 30,
    rungs: { boat: 'P', from: 30.5 },
    laylines: [{ x: 200, y: 440, tack: 'starboard', len: 330, from: 0, to: 31, label: 'Pin layline\'ı: bunun ALTINDA pin dönülmez' }],
    boats: [
      { id: 'P', name: 'Layline üstünde, pin\'den', role: 'dogru', color: '#2a9d8f',
        start: { x: 410, y: 572, h: 300 }, v0: 25,
        segs: [
          { mode: 'closehauled', tack: 'starboard', dur: 5.4, turn: 0, speed: 0.75, note: 'Erken: layline üstünden pin\'e' },
          { mode: 'hold', h: 335, dur: 23.2, speed: 0.006, turn: 1.2, note: 'Pin\'in yarım boy içinde: yer benim' },
          { mode: 'closehauled', tack: 'starboard', dur: 9.4, turn: 0.8 }
        ] },
      { id: 'L', name: 'Layline altında kalan', role: 'hata', color: '#e76f51',
        start: { x: 268, y: 522, h: 335 }, v0: 0,
        segs: [
          { mode: 'hold', h: 335, dur: 14, speed: 0.006, turn: 0, drift: 1, note: 'Kalabalıkta aşağı itildi' },
          { mode: 'hold', h: 335, dur: 12, speed: 0.006, turn: 0, drift: 1, note: 'Layline\'ın ALTINDA' },
          { mode: 'closehauled', tack: 'starboard', dur: 1.8, turn: 0.8, note: 'Pin\'i dönemiyor!' },
          { mode: 'heading', h: 40, dur: 1.3, turn: 0.8, speed: 0.6, note: 'Tramola: herkese yol ver (K13)' },
          { mode: 'heading', h: 105, dur: 3.6, turn: 1.0, speed: 0.8, note: 'İskele kontra: herkesin arkasından (K10)' },
          { mode: 'closehauled', tack: 'port', dur: 4.3, turn: 1.0 }
        ] },
      { id: 'Y', name: 'Geç gelen, ikinci sırada', role: 'hata', color: '#c77dff',
        start: { x: 700, y: 610, h: 270 }, v0: 10,
        segs: [
          { mode: 'hold', h: 270, dur: 13, speed: 0.05, turn: 0, note: '"Pin\'e son dakika girerim"' },
          { mode: 'heading', h: 290, dur: 6.5, turn: 1.0, speed: 0.75, note: 'Geç: pin\'e doğru' },
          { mode: 'hold', h: 335, dur: 9, speed: 0.01, turn: 1.0, note: 'Ön sıra dolu: ikinci sırada' },
          { mode: 'closehauled', tack: 'starboard', dur: 9.5, turn: 0.8, note: 'Pis rüzgarda' }
        ] }
    ],
    crowd: [
      { slot: 0.19 }, { slot: 0.28 }, { slot: 0.37 }, { slot: 0.46 }, { slot: 0.55 }, { slot: 0.24, row: 1 }, { slot: 0.42, row: 1 },
      { slot: 0.68 }, { slot: 0.82 }
    ],
    steps: [
      { t: 0, title: 'Start\'a 2 dk: pin çok avantajlı', text: 'Rüzgar 15° sola dönmüş: pin ucu hattın neredeyse 3 boy önünde. Herkes pin\'den çıkmak istiyor; filonun yarısı pin\'e yığılıyor. Mavi kesikli çizgi pin layline\'ı: sancak orsa ile pin\'e varabileceğin son rota.' },
      { t: 2, title: 'P erken ve layline\'ın üstünden geliyor', text: 'Yeşil P 2 dk kala sancak kontrada, layline\'ın üstünden pin\'e geliyor. Rüzgaraltından gelen tekne hak sahibidir (Kural 11): bekleyenler ona yer açar.' },
      { t: 6, title: 'Pin\'in yarım boy içinde dur', text: 'P pin\'e değmeden, pin\'in yarım boy içinde ve layline\'ın üstünde rüzgara baş verip duruyor. Pin\'e değmek Kural 31: bir tur ceza. Pin\'in dışında beklemek de olur ama sinyalde içeri girmek zorundasın.' },
      { t: 10, title: 'L kalabalıkta aşağı itildi', text: 'Turuncu L, P\'nin hemen arkasında bekliyor. Önünde P, rüzgarüstünde filo var; yer açılmadıkça kayıyor. Şimdi layline\'ın ALTINDA.' },
      { t: 13, title: 'Y geç geliyor', text: 'Mor Y "pin\'e son dakika girerim" diye dışarıda bekledi. Şimdi geliyor ama ön sıra dolu.' },
      { t: 16, title: 'Layline\'ın altındaysan', text: 'Layline\'ın altındaki tekne sancak orsa ile pin\'e varamaz: burnu pin\'in soluna düşer. Ya erken tramola atıp çıkar ya da sinyalde herkesin arkasından dolaşır. Pin\'i "son anda orsalayıp" dönmeye çalışmak Kural 31 (pin\'e değme) ve fodepar riski.' },
      { t: 21, title: 'Y ikinci sırada', text: 'Y, ön sıradakilerin hemen arkasında kaldı. Önündeki teknelerin pis rüzgarında (mor gölge) ve hızlanacak yeri yok. Arkadaki tekne öndekine yol verir (Kural 12).' },
      { t: 26, title: 'L doldurdu ama yetişemeyecek', text: 'L yelkeni doldurup pin\'e gidiyor; ama layline\'ın altında: sancak orsa ile pin\'in soluna düşecek. Pin\'in dışından geçmek start sayılmaz.' },
      { t: 27.8, title: 'L tramola: herkese yol ver', text: 'L tramola atıyor. Tramola sırasında herkese yol verir (Kural 13), iskele kontrada da tüm sancak teknelere (Kural 10). Burnunu düşürüp herkesin arkasından dolaşacak: 30-40 saniye kayıp.' },
      { t: 28.6, title: '6 sn kala doldur', text: 'P burnunu düşürüp dolduruyor; layline\'ın üstünde olduğu için pin\'i rahat geçecek.' },
      { t: 30, title: 'START: P pin\'den', text: 'P pin\'in hemen yanından, avantajlı uçtan, temiz havada çıkıyor. Y ikinci sırada, kirli havada; L herkesin arkasında.' },
      { t: 35, title: 'Özet', text: 'Pin avantajlıysa: erken gel, layline\'ın üstünde kal, pin\'in yarım boy içinde dur, pin\'e değme. Layline\'ın altına düştüysen erken çık, inat etme. Geç kalırsan ön sıra dolar.' }
    ],
    addBoat: { pin: { x: 290, y: 600 }, middle: { x: 500, y: 600 }, committee: { x: 720, y: 600 } },
    startSlots: { pin: [0.1], middle: [0.5], committee: [0.9] }
  });

  // ---------- İA9: bekleme teknikleri: orsala, yelkeni ters bas, geri git ----------
  S.push({
    id: 'ia9-brake-back',
    category: 'İleri Taktik', topic: 'Start · Yer tutma',
    title: 'İA9 · Fren yap: orsala, yelkeni ters bas, geri git',
    summary: 'Seçtiğin boşluğa hızla geldin ve hat çok yakın: nasıl durursun? Yeşil B önce orsalayıp hızını keser, yetmeyince bumbayı rüzgara doğru itip yelkeni ters basar (backing) ve tekneyi bir boy geri götürür; sonra yelken boş, burun rüzgarda bekler. Geri giden tekne herkese yol verir (Kural 22.3): arkasına bakarak, kısa ve kontrollü. Turuncu E aynı hızla gelir ama yalnızca orsalar: tekne süzülür, hattın üstüne çıkar ve geri dönmek için dolaşırken yerini kaybeder.',
    duration: 40,
    baseSpeed: 40,
    clockScale: 4,
    wind: 0,
    line: { pin: { x: 200, y: 440 }, boat: { x: 800, y: 440 } },
    startAt: 32,
    rungs: { boat: 'B', from: 32.5 },
    expectEarly: ['E'],
    boats: [
      { id: 'B', name: 'Orsala, ters bas, geri git', role: 'dogru', color: '#2a9d8f',
        start: { x: 735, y: 650, h: 315 }, v0: 34,
        segs: [
          { mode: 'closehauled', tack: 'starboard', dur: 5.6, turn: 0, note: 'Boşluğa hızla geliyor' },
          { mode: 'hold', h: 0, dur: 2.0, speed: 0.004, turn: 0.6, note: '1) Orsala: hızını kes' },
          { mode: 'back', h: 0, dur: 1.9, speed: 0.35, turn: 0, note: '2) Yelkeni ters bas: geri git (K22.3)' },
          { mode: 'hold', h: 352, dur: 4.7, speed: 0.004, turn: 0.6, note: '3) Yelken boş, burun rüzgarda' },
          { mode: 'back', h: 352, dur: 0.8, speed: 0.15, turn: 0, note: 'Kısa ters basış: yerini koru' },
          { mode: 'hold', h: 345, dur: 13.8, speed: 0.004, turn: 0.6, note: 'Hat yarım boy önde, altı boş' },
          { mode: 'closehauled', tack: 'starboard', dur: 11.0, turn: 0.8 }
        ] },
      { id: 'E', name: 'Fren yok: hattı geçen', role: 'hata', color: '#e76f51',
        start: { x: 575, y: 640, h: 315 }, v0: 34,
        segs: [
          { mode: 'closehauled', tack: 'starboard', dur: 5.8, turn: 0, note: 'O da hızla geliyor' },
          { mode: 'hold', h: 0, dur: 3.4, speed: 0.004, turn: 0.6, note: 'Yalnızca orsaladı: süzülüyor' },
          { mode: 'hold', h: 0, dur: 1.2, speed: 0.004, turn: 0, note: 'Hattın üstüne çıktı!' },
          { mode: 'heading', h: 250, dur: 1.4, turn: 0.8, speed: 0.6, note: 'Geri dönmek için dolaşıyor' },
          { mode: 'heading', h: 175, dur: 3.2, turn: 0.9, speed: 0.6, note: 'Geri dönmek için dolaşıyor' },
          { mode: 'heading', h: 60, dur: 1.0, turn: 1.0, speed: 0.6, note: 'Tramola, yeniden geliyor' },
          { mode: 'hold', h: 345, dur: 14.2, speed: 0.01, turn: 1.0, note: 'Yerini kaybetti: geride' },
          { mode: 'closehauled', tack: 'starboard', dur: 9.8, turn: 0.8, note: 'Kirli havada' }
        ] }
    ],
    crowd: [
      { slot: 0.06 }, { slot: 0.135 }, { slot: 0.21 }, { slot: 0.39 }, { slot: 0.465 }, { slot: 0.69 }, { slot: 0.765 }, { slot: 0.84 },
      { slot: 0.10, row: 1 }, { slot: 0.80, row: 1 }
    ],
    steps: [
      { t: 0, title: 'Start\'a 2 dk: boşluğa hızla geliyorsun', text: 'Yeşil B hattın ortasındaki boşluğu seçmiş ve tam hızla geliyor. Hat yakın: bu hızla hiçbir şey yapmazsa hattın üstüne çıkar. Turuncu E de aynı durumda, solundaki boşluğa geliyor.' },
      { t: 5.6, title: '1) Orsala: hızını kes', text: 'B burnunu rüzgara veriyor; yelken boşalıyor, tekne yavaşlıyor. Ama Optimist hafif bir tekne değil: bir süre daha süzülür. Orsalamak tek başına çoğu zaman yetmez.' },
      { t: 7.6, title: '2) Yelkeni ters bas: geri git', text: 'B bumbayı rüzgara doğru itip yelkeni ters basıyor (backing). Yelken öbür yüzünden dolar ve tekneyi geri iter. Geri giderken dümen ters çalışır: burnu rüzgarda tutmak için dümeni ileri gidiyormuş gibi değil, ters yöne bas. B bir boy geri gidiyor.' },
      { t: 8.5, title: 'Kural 22.3: geri giden yol verir', text: 'Yelkenini ters basıp geri giden tekne, ileri giden ya da duran herkese yol verir. B geri gitmeden önce arkasına bakıyor: arkası boş, yer var. Arkada biri varsa kısa bas, az git; ona çarparsan suçlu sensin.' },
      { t: 9.2, title: 'E: yalnızca orsaladı', text: 'Turuncu E de orsaladı ama ters basmadı. Tekne süzülmeye devam ediyor ve burnu hattın üstüne çıkıyor. Henüz son dakika değil, ceza yok; ama geri dönmek için dolaşmak zorunda.' },
      { t: 9.5, title: '3) Yelken boş, burun rüzgarda', text: 'B duruyor: yelken boş, burun rüzgarda, hat yarım boy önde. Gerekirse yelkeni bir an ters basıp kayan tekneyi yerinde tutuyor. İskotayı bir an çekmek yükseltir (İA7), ters basmak geri götürür: ikisiyle tekneyi istediğin yerde tutarsın.' },
      { t: 11.2, title: 'E dolaşırken yerini kaybediyor', text: 'Hattın üstündeki tekne geri dönmek için bordalayıp kavança atar, hattın altına iner ve yeniden gelir. Bu 20-25 saniye sürer: E boşluğuna döndüğünde hattın 1 boydan fazla gerisinde, komşularından geride kalıyor.' },
      { t: 28.8, title: '13 sn kala doldur', text: 'B burnunu düşürüp yelkeni dolduruyor. Hat yarım boy önde ve altı boş: hızlanırken hafif düşüp hattı tam hızla geçer.' },
      { t: 32, title: 'START', text: 'B boşluğundan, hızla ve temiz havada çıkıyor. E komşularının gerisinden, onların pis rüzgarında çıkıyor.' },
      { t: 36, title: 'Özet', text: 'Fren: orsala (hızı kes), yelkeni ters bas (geri git), yelken boş bekle. Geri giderken arkana bak: geri giden tekne yol verir (K22.3). Yalnızca orsalamak yetmez: tekne süzülür ve hattın üstüne çıkarsın.' }
    ],
    addBoat: { pin: { x: 290, y: 600 }, middle: { x: 500, y: 600 }, committee: { x: 720, y: 600 } },
    startSlots: { pin: [0.1], middle: [0.5], committee: [0.9] }
  });

  // ---------- İA10: boşluğunu savun ----------
  S.push({
    id: 'ia10-defend-gap',
    category: 'İleri Taktik', topic: 'Start · Yer tutma',
    title: 'İA10 · Boşluğunu savun: rüzgaraltını kapat, kimse sokulmasın',
    summary: 'Yer tutmanın ikinci yarısı: hızlanma boşluğunu korumak. Yeşil S, rüzgarüstü komşusu W\'nin hemen altına yerleşmiştir; rüzgaraltında bir tekne sığacak boşluk var. Geç gelen G bu boşluğa sokulmak ister; S burnunu hafif düşürüp yelken boş yanlamasına rüzgaraltına kayar ve boşluğu kapatır: G yer bulamaz, arkadan dolaşır. Turuncu H ise boşluğunun ortasında bekler; geç gelen K onun rüzgaraltına sokulur ve H iki teknenin arasında, hızlanacak yeri olmadan kalır.',
    duration: 40,
    baseSpeed: 40,
    clockScale: 4,
    wind: 0,
    line: { pin: { x: 200, y: 440 }, boat: { x: 800, y: 440 } },
    startAt: 32,
    rungs: { boat: 'S', from: 32.5 },
    boats: [
      { id: 'S', name: 'Boşluğunu savunan', role: 'dogru', color: '#2a9d8f',
        start: { x: 590, y: 480, h: 345 }, v0: 0,
        segs: [
          { mode: 'hold', h: 345, dur: 17, speed: 0.004, turn: 0, note: 'W\'nin altında, rüzgaraltı boş' },
          { mode: 'hold', h: 325, dur: 3.2, speed: 0.004, turn: 0.8, drift: 7, driftH: 265, note: 'Burnu düşür, yanlamasına kay' },
          { mode: 'hold', h: 345, dur: 9.4, speed: 0.004, turn: 0.8, note: 'Boşluk benim: kimse sığmaz' },
          { mode: 'closehauled', tack: 'starboard', dur: 10.4, turn: 0.8 }
        ] },
      { id: 'G', name: 'Sokulmak isteyen, yer bulamayan', role: 'hata', color: '#c77dff',
        start: { x: 650, y: 628, h: 315 }, v0: 0,
        segs: [
          { mode: 'hold', h: 330, dur: 14, speed: 0.02, turn: 0, note: '"Son dakika sokulurum"' },
          { mode: 'closehauled', tack: 'starboard', dur: 5.2, turn: 0.8, speed: 0.7, note: 'S\'nin rüzgaraltına sokulmak istiyor' },
          { mode: 'hold', h: 330, dur: 2.0, speed: 0.02, turn: 0.8, note: 'Yer yok!' },
          { mode: 'heading', h: 215, dur: 1.8, turn: 1.0, speed: 0.4, note: 'Arkadan dolaşıyor' },
          { mode: 'hold', h: 345, dur: 7.8, speed: 0.01, turn: 1.0, note: 'İkinci sırada' },
          { mode: 'closehauled', tack: 'starboard', dur: 9.2, turn: 0.8, note: 'Kirli havada' }
        ] },
      { id: 'H', name: 'Boşluğun ortasında bekleyen', role: 'hata', color: '#e76f51',
        start: { x: 422, y: 478, h: 345 }, v0: 0,
        segs: [
          { mode: 'hold', h: 345, dur: 29.6, speed: 0.004, turn: 0, note: 'Boşluğun ortasında' },
          { mode: 'closehauled', tack: 'starboard', dur: 10.4, turn: 0.8, speed: 0.85, note: 'Altı dolu: hızlanamıyor' }
        ] },
      { id: 'K', name: 'Geç gelip sokulan', color: '#8d99ae',
        start: { x: 485, y: 592, h: 315 }, v0: 0,
        segs: [
          { mode: 'hold', h: 330, dur: 14.5, speed: 0.02, turn: 0 },
          { mode: 'closehauled', tack: 'starboard', dur: 5.4, turn: 0.8, speed: 0.7, note: 'H\'nin rüzgaraltına sokuluyor' },
          { mode: 'hold', h: 345, dur: 9.7, speed: 0.004, turn: 0.9, note: 'H\'nin altında' },
          { mode: 'closehauled', tack: 'starboard', dur: 10.4, turn: 0.8 }
        ] }
    ],
    crowd: [
      { slot: 0.05 }, { slot: 0.115 }, { slot: 0.175 }, { slot: 0.43 }, { slot: 0.495 },
      { slot: 0.67, id: 'W', name: 'S\'nin rüzgarüstü komşusu' }, { slot: 0.745 }, { slot: 0.82 },
      { slot: 0.12, row: 1 }, { slot: 0.80, row: 1 }
    ],
    steps: [
      { t: 0, title: 'Start\'a 2 dk: yer tuttun, şimdi koru', text: 'Yeşil S erken geldi ve rüzgarüstü komşusu W\'nin hemen altına yerleşti (İA4\'teki gibi). Rüzgaraltında bir tekne sığacak açık su var: S\'nin hızlanma yolu. Turuncu H de yerini almış ama boşluğunun tam ortasında duruyor.' },
      { t: 6, title: 'Boşluk herkesin gözünde', text: 'Son dakikaya doğru geç kalan tekneler bir boşluk arar. Rüzgaraltında açık su gören, oraya sokulur. Sokulan tekne rüzgaraltında olduğu için hak sahibi olur (Kural 11); ancak hakkı yeni kazanıyorsa sana kaçınma yeri vermek zorunda (Kural 15). Yani boşluğu kaptırırsan geri alamazsın.' },
      { t: 14, title: 'G ve K geliyor', text: 'İki geç kalan tekne, mor G ve gri K, arkadan sancak kontrada geliyor. G, S\'nin rüzgaraltındaki boşluğa; K, H\'nin rüzgaraltındaki boşluğa bakıyor. Arkadan gelen tekne, bindirme (overlap) kurana kadar öndekine yol verir (Kural 12).' },
      { t: 17, title: 'S boşluğu kapatıyor', text: 'S burnunu hafif düşürüp yelkeni boş bırakıyor ve tekne yanlamasına, rüzgaraltına kayıyor. Hız almıyor, öne gitmiyor: yalnızca boşluğu kapatıyor. Artık S ile soldaki tekne arasında G\'ye yer yok.' },
      { t: 20.2, title: 'G yer bulamadı', text: 'G boşluğa geldiğinde yer yok. Zorlarsa S\'ye ya da soldaki tekneye çarpar: arkadan gelen olarak yol vermek onun işi (Kural 12). G bordalayıp arkadan dolaşıyor, ikinci sırada kalacak.' },
      { t: 21, title: 'K, H\'nin altına sokuldu', text: 'H boşluğunun ortasında, iki yanında da yarım boydan fazla boşluk vardı. K rüzgaraltındaki yarıya sokuldu. H şimdi iki teknenin arasında: altında K, üstünde komşusu. Sinyalde düşüp hızlanacak yeri yok.' },
      { t: 29.6, title: '10 sn kala doldur', text: 'S W\'den biraz uzaklaşmış ama altındaki boşluğu korudu: oraya düşüp dolduruyor ve hızlanıyor.' },
      { t: 32, title: 'START', text: 'S temiz havada, tam hızda. H, K\'nin rüzgarüstünde ve yarım hızda: K hızlanınca H\'nin önü ve altı kapanıyor. G ikinci sırada.' },
      { t: 36, title: 'Özet', text: 'Yerini aldıktan sonra rüzgaraltındaki boşluğu sahiplen: geç kalan biri bakıyorsa burnu hafif düşür, yelken boş yanlamasına kay, boşluğu daralt. Boşluğun ortasında beklersen yarısını kaptırırsın. Rüzgarüstündeki boşluğu kapatmak için de komşuna yakın dur.' }
    ],
    addBoat: { pin: { x: 290, y: 600 }, middle: { x: 500, y: 600 }, committee: { x: 720, y: 600 } },
    startSlots: { pin: [0.1], middle: [0.5], committee: [0.9] }
  });

  // ---------- İA11: B planı: seçtiğin boşluk dolarsa ----------
  S.push({
    id: 'ia11-plan-b',
    category: 'İleri Taktik', topic: 'Start · Orta',
    title: 'İA11 · B planı: seçtiğin boşluk dolarsa yoldaki ikinci boşluğa gir',
    summary: 'İA2c\'nin devamı: S 2 dk kala hatta bakar, avantajlı hakem botu tarafındaki geniş boşluğu (A planı) seçer ve yoldaki orta boşluğu da aklına yazar (B planı). Filonun altından giderken gri F hakem botu tarafından gelip A boşluğunu doldurur. S bunu görünce hemen yanındaki B boşluğuna girer ve rahat start eder. Turuncu D aynı A planındadır ama B planı yoktur: dolan boşluğa gitmeye devam eder, F\'nin arkasında, ikinci sırada kalır.',
    duration: 40,
    baseSpeed: 40,
    clockScale: 4,
    wind: 5,
    line: { pin: { x: 200, y: 440 }, boat: { x: 800, y: 440 } },
    startAt: 32,
    rungs: { boat: 'S', from: 32.5 },
    sightline: { from: 0, to: 5, label: 'Transit: 2 dk kala hatta bak, iki boşluk seç' },
    gaps: { from: 2, to: 29, items: [
      { a: 4, b: 5, label: 'B planı', color: '#fbbf24' },
      { a: 6, b: 7, label: 'A planı · avantajlı', color: '#34d399' }
    ] },
    boats: [
      { id: 'S', name: 'A planı + B planı', role: 'dogru', color: '#2a9d8f',
        start: { x: 88, y: 452, h: 90 }, v0: 2,
        segs: [
          { mode: 'hold', h: 90, dur: 4, speed: 0.04, turn: 0, note: 'İki boşluk seçti: A ve B' },
          { mode: 'heading', h: 160, dur: 3.2, turn: 0.8, note: 'Hattın altına iniyor' },
          { mode: 'heading', h: 90, dur: 7.2, turn: 1.0, note: 'Apaz: A planına doğru' },
          { mode: 'heading', h: 40, dur: 2.0, turn: 0.8, speed: 1, note: 'A doldu! B planına gir' },
          { mode: 'hold', h: 350, dur: 13.4, speed: 0.004, turn: 1.0, note: 'B boşluğunda, komşunun altında' },
          { mode: 'closehauled', tack: 'starboard', dur: 10.2, turn: 0.8 }
        ] },
      { id: 'D', name: 'Yalnızca A planı', role: 'hata', color: '#e76f51',
        start: { x: 70, y: 585, h: 90 }, v0: 2,
        segs: [
          { mode: 'hold', h: 90, dur: 6, speed: 0.04, turn: 0 },
          { mode: 'heading', h: 92, dur: 12.4, turn: 1.0, note: 'Apaz: yalnızca A planı' },
          { mode: 'heading', h: 40, dur: 1.4, turn: 0.8, speed: 0.7, note: 'A dolu! B planı yok' },
          { mode: 'hold', h: 350, dur: 10.8, speed: 0.01, turn: 1.0, note: 'F\'nin arkasında, ikinci sırada' },
          { mode: 'closehauled', tack: 'starboard', dur: 9.4, turn: 0.8, note: 'Kirli havada' }
        ] },
      { id: 'F', name: 'A boşluğunu dolduran', color: '#8d99ae',
        start: { x: 735, y: 612, h: 320 }, v0: 0,
        segs: [
          { mode: 'hold', h: 330, dur: 9, speed: 0.02, turn: 0 },
          { mode: 'closehauled', tack: 'starboard', dur: 5.0, turn: 0.8, speed: 0.8, note: 'A boşluğuna giriyor' },
          { mode: 'hold', h: 350, dur: 15.6, speed: 0.004, turn: 1.0 },
          { mode: 'closehauled', tack: 'starboard', dur: 10.4, turn: 0.8 }
        ] }
    ],
    crowd: [
      { slot: 0.06 }, { slot: 0.13 }, { slot: 0.20 }, { slot: 0.27 }, { slot: 0.34 },
      { slot: 0.52 }, { slot: 0.59 }, { slot: 0.80 }, { slot: 0.87 },
      { slot: 0.16, row: 1 }, { slot: 0.84, row: 1 }
    ],
    steps: [
      { t: 0, title: 'Start\'a 2 dk: iki boşluk seç', text: 'Rüzgar 5° sağda: hakem botu ucu biraz avantajlı. S hattın uzantısından bakıyor ve iki boşluk seçiyor: avantajlı taraftaki geniş boşluk (A planı, yeşil) ve yolda kalan orta boşluk (B planı, sarı).' },
      { t: 4, title: 'Filonun altından A planına', text: 'S hattın altına inip apaz ile filonun altından A planına gidiyor. Yolda B boşluğunun altından geçecek: gözü hem A\'da hem B\'de.' },
      { t: 9, title: 'F geliyor', text: 'Gri F hakem botu tarafından, sancak kontrada A boşluğuna doğru geliyor. A boşluğu hakem botuna daha yakın: F oraya S\'den önce varacak.' },
      { t: 14.5, title: 'A doldu: B planı', text: 'S, F\'nin A boşluğuna girdiğini görüyor. Tam B boşluğunun altında: hemen orsalayıp B\'ye giriyor ve rüzgarüstü komşusunun altına yerleşiyor (İA4). Kararı hızlı vermek önemli: bir boy daha giderse B\'nin de gerisinde kalır.' },
      { t: 17.5, title: 'D\'nin B planı yok', text: 'Turuncu D de A planına gidiyordu ama yedek planı yok. A\'nın dolduğunu görse de oraya gitmeye devam ediyor.' },
      { t: 22, title: 'D ikinci sırada', text: 'D A boşluğuna geldiğinde F yerleşmiş. Araya girecek yer yok; F\'nin hemen arkasında, ikinci sırada kalıyor. Arkadaki tekne öndekine yol verir (Kural 12).' },
      { t: 29.8, title: '9 sn kala doldur', text: 'S, B boşluğunda: altındaki açık suya biraz düşüp dolduruyor ve hızlanıyor.' },
      { t: 32, title: 'START', text: 'S hat ortasından, temiz havada ve tam hızda. A ucu biraz avantajlıydı ama temiz bir start, kirli havada ikinci sıradan çok daha değerli. D, F\'nin pis rüzgarında.' },
      { t: 36, title: 'Özet', text: 'Her zaman iki boşluk seç: A (en iyi) ve yolda kalan B. A dolarsa ya da rüzgar dönerse hemen B\'ye geç. Yedek planı olmayan, dolan boşluğa inatla gider ve ikinci sırada kalır.' }
    ],
    addBoat: { pin: { x: 290, y: 600 }, middle: { x: 500, y: 600 }, committee: { x: 720, y: 600 } },
    startSlots: { pin: [0.1], middle: [0.5], committee: [0.9] }
  });

  // ---------- İA12: son saniyede iskele kontradan boşluğa tramola ----------
  S.push({
    id: 'ia12-late-port-tack',
    category: 'İleri Taktik', topic: 'Start · Orta',
    title: 'İA12 · Son saniyede iskele kontradan tramola: boşluk yeterli mi?',
    summary: 'Son 30-40 saniyede filonun altından iskele kontrada gelip bir boşluğa tramola atmak hızlı ve etkili bir start olabilir; ama boşluk tramolayı bitirip hızlanacak kadar geniş olmalı. Yeşil X geniş boşluğu seçer, tramolasını komşularından 1,5 boy uzakta bitirir ve hızlanarak çıkar. Turuncu P dar boşluğa, bir sancak teknenin dibine tramola atar: tramola atarken yol vermesi gerekir (Kural 13), sancağa geçince de karşı tarafa kaçınma yeri vermelidir (Kural 15). Sancak tekne kaçmak zorunda kalır, P protesto edilir ve iki tur ceza döner.',
    duration: 42,
    baseSpeed: 40,
    clockScale: 4,
    wind: 0,
    line: { pin: { x: 200, y: 440 }, boat: { x: 800, y: 440 } },
    startAt: 32,
    rungs: { boat: 'X', from: 32.5 },
    gaps: { from: 14, to: 29.5, items: [
      { a: 3, b: 4, label: 'Geniş: tramola + hızlanma yeri', color: '#34d399' },
      { a: 6, b: 7, label: 'Dar', color: '#f87171' }
    ] },
    boats: [
      { id: 'X', name: 'Geniş boşluğa tramola', role: 'dogru', color: '#2a9d8f',
        start: { x: 100, y: 545, h: 90 }, v0: 2,
        segs: [
          { mode: 'hold', h: 90, dur: 14.6, speed: 0.03, turn: 0, note: 'İskele kontrada, filonun altında' },
          { mode: 'heading', h: 92, dur: 8.6, turn: 1.0, speed: 0.8, note: 'Son 70 sn: filonun altından' },
          { mode: 'heading', h: 40, dur: 2.2, turn: 0.8, speed: 0.8, note: 'Geniş boşluğa yöneliyor' },
          { mode: 'heading', h: 340, dur: 2.0, turn: 1.0, speed: 0.25, note: 'Tramola: komşulardan 1,5 boy uzakta' },
          { mode: 'hold', h: 345, dur: 2.4, speed: 0.01, turn: 0.6, note: 'Tramola bitti, yer benim' },
          { mode: 'closehauled', tack: 'starboard', dur: 14.2, turn: 0.8 }
        ] },
      { id: 'P', name: 'Dar boşluğa, dibine tramola', role: 'hata', color: '#e76f51',
        start: { x: 222, y: 580, h: 90 }, v0: 2,
        segs: [
          { mode: 'hold', h: 90, dur: 17, speed: 0.03, turn: 0 },
          { mode: 'heading', h: 90, dur: 8.2, turn: 1.0, speed: 0.85, note: 'Son 60 sn: filonun altından' },
          { mode: 'heading', h: 50, dur: 3.3, turn: 0.8, speed: 0.85, note: 'Dar boşluğa' },
          { mode: 'heading', h: 330, dur: 1.4, turn: 0.8, speed: 0.5, note: 'HATA: sancak teknenin dibine tramola (K13, K15)' },
          { mode: 'hold', h: 335, dur: 1.6, turn: 0.6, speed: 0.04, note: 'Protesto!' },
          { mode: 'heading', h: 90, dur: 0.9, turn: 0.9, speed: 0.4, note: 'İki tur ceza (720°)' },
          { mode: 'heading', h: 180, dur: 0.9, turn: 0.9, speed: 0.4, note: 'İki tur ceza (720°)' },
          { mode: 'heading', h: 270, dur: 0.9, turn: 0.9, speed: 0.4, note: 'İki tur ceza (720°)' },
          { mode: 'heading', h: 360, dur: 0.9, turn: 0.9, speed: 0.4, note: 'İki tur ceza (720°)' },
          { mode: 'heading', h: 450, dur: 0.9, turn: 0.9, speed: 0.4, note: 'İki tur ceza (720°)' },
          { mode: 'heading', h: 540, dur: 0.9, turn: 0.9, speed: 0.4, note: 'İki tur ceza (720°)' },
          { mode: 'heading', h: 630, dur: 0.9, turn: 0.9, speed: 0.4, note: 'İki tur ceza (720°)' },
          { mode: 'closehauled', tack: 'starboard', dur: 3.0, turn: 0.9, note: 'Herkesin arkasında' }
        ] }
    ],
    crowd: [
      { slot: 0.06 }, { slot: 0.13 }, { slot: 0.20 }, { slot: 0.27 }, { slot: 0.48 }, { slot: 0.55 }, { slot: 0.62 },
      { slot: 0.715 }, { slot: 0.785 }, { slot: 0.855 }
    ],
    steps: [
      { t: 0, title: 'Start\'a 2 dk: filo hattın dibinde', text: 'Filo hattın dibinde, rüzgara baş vermiş bekliyor. İki boşluk var: ortada geniş bir boşluk (yeşil) ve hakem botu tarafında dar bir boşluk (kırmızı). Yeşil X ve turuncu P kalabalığın dışında, pin tarafında, iskele kontrada bekliyor.' },
      { t: 6, title: 'Neden iskele kontradan gelinir?', text: 'İskele kontrada filonun altından gelen tekne bütün boşlukları önden görür ve en iyisini seçer. Tramolayı boşluğun altında atar ve hemen hızlanır: beklemekle yer kaybetmez. Ama iskele kontrada herkese yol verir (Kural 10) ve tramola atarken de herkese yol verir (Kural 13).' },
      { t: 14.6, title: 'Son 70 sn: X geliyor', text: 'X filonun altından apaz ile geliyor. Hedefi geniş boşluk: komşularıyla arasında 2 boydan fazla açık su var.' },
      { t: 23.1, title: 'Boşluk yeterli mi?', text: 'Kural: boşluk en az 3 boy olmalı. 1 boy tramola için, 1 boy rüzgarüstündeki komşudan uzak durmak için (Kural 15: yeni hak kazanan, karşısındakine kaçınma yeri verir), 1 boy da altında hızlanmak için.' },
      { t: 25.2, title: 'P dar boşluğa', text: 'Turuncu P daha geç geldi ve dar boşluğa yöneldi. Boşluk bir tekne genişliğinden biraz fazla.' },
      { t: 25.4, title: 'X tramola atıyor', text: 'X boşluğun ortasında, komşularından 1,5 boy uzakta tramola atıyor ve sancağa geçiyor. Kimse kaçmak zorunda kalmıyor. Yelken boş bir an bekliyor, sonra doldurup hızlanacak.' },
      { t: 28.5, title: 'P sancak teknenin dibine tramola atıyor', text: 'P tramolayı rüzgarüstündeki sancak teknenin hemen altında atıyor. Tramola sırasında herkese yol vermeliydi (Kural 13); sancağa geçince de karşı tarafa kaçınma yeri vermeliydi (Kural 15). 7 ve 8 numara doldurup hızlanamıyor: P\'ye çarpmamak için beklemek zorunda kalıyorlar. Bu bir ihlal.' },
      { t: 29.9, title: 'Protesto ve iki tur ceza', text: 'Sancak tekne "Protesto!" diye bağırıyor. P ya iki tur ceza döner (Kural 44.2: iki tramola + iki kavança) ya da protesto heyetinde diskalifiye riskini alır. P ceza turunu atıyor: start\'ta herkesin arkasında kalacak.' },
      { t: 32, title: 'START', text: 'X geniş boşluktan, hızla ve temiz havada çıkıyor. P ceza turlarını dönüyor.' },
      { t: 38, title: 'Özet', text: 'Son saniyede iskele kontradan gelip tramola atacaksan: boşluk en az 3 boy olsun, tramolayı komşularından 1-1,5 boy uzakta bitir, hiçbir sancak tekneyi kaçmaya zorlama. Dar boşluğa, birinin dibine atılan tramola ceza turuyla biter.' }
    ],
    addBoat: { pin: { x: 290, y: 600 }, middle: { x: 500, y: 600 }, committee: { x: 720, y: 600 } },
    startSlots: { pin: [0.1], middle: [0.5], committee: [0.9] }
  });

  // ---------- İA13: genel geri çağırmadan sonra siyah bayrak ----------
  S.push({
    id: 'ia13-black-flag',
    category: 'İleri Taktik', topic: 'Start',
    title: 'İA13 · Genel geri çağırma, sonra siyah bayrak: son dakikada burun hatta değmesin',
    summary: 'İlk start\'ta filonun çoğu erken çıktı ve hakem genel geri çağırma yaptı (Birinci Tekrar bayrağı, iki ses). Yeniden start siyah bayrakla: son 1 dakikada gövdesinin bir parçası hat üçgenindeki tekne diskalifiye olur (BFD), yelken numarası hakem botunda gösterilir ve start yeniden yapılsa da yarışamaz. Filo temkinli, hattın gerisinde bekliyor ve ortada yay oluşuyor. Yeşil S transitle hattın yerini bilir, hattın yarım boy altında bekler ve tam hızla çıkar. Turuncu B son dakikada burnunu hatta sokar: BFD. Mor C hattın üstüne son dakikadan ÖNCE çıkar: ceza yok, geri çekilir.',
    duration: 40,
    baseSpeed: 40,
    clockScale: 4,
    prepFlag: 'Siyah',
    flagDownAt: 17,
    wind: 0,
    line: { pin: { x: 200, y: 440 }, boat: { x: 800, y: 440 } },
    startAt: 32,
    rungs: { boat: 'S', from: 32.5 },
    sightline: { from: 0, to: 6, label: 'Transit: pin\'den hakem botuna bak — hat burada' },
    sag: { from: 2, to: 30 },
    expectEarly: ['B'],
    boats: [
      { id: 'S', name: 'Transitle, yarım boy altta', role: 'dogru', color: '#2a9d8f',
        start: { x: 528, y: 476, h: 345 }, v0: 0,
        segs: [
          { mode: 'hold', h: 345, dur: 29.4, speed: 0.004, turn: 0, note: 'Hat yarım boy önde: transit' },
          { mode: 'closehauled', tack: 'starboard', dur: 10.6, turn: 0.8 }
        ] },
      { id: 'B', name: 'Son dakikada burnu hatta: BFD', role: 'hata', color: '#e76f51',
        start: { x: 392, y: 484, h: 345 }, v0: 0,
        segs: [
          { mode: 'hold', h: 345, dur: 18, speed: 0.004, turn: 0, note: 'Hattın dibinde' },
          { mode: 'hold', h: 350, dur: 3.2, speed: 0.18, turn: 0.6, note: 'Sürünüyor…' },
          { mode: 'hold', h: 350, dur: 2.2, speed: 0.004, turn: 0, note: 'Burnu hatta: BFD!' },
          { mode: 'back', h: 350, dur: 2.0, speed: 0.25, turn: 0, note: 'Geri çekilmek kurtarmaz' },
          { mode: 'hold', h: 345, dur: 4.6, speed: 0.004, turn: 0.6, note: 'Numarası hakem botunda: BFD' },
          { mode: 'heading', h: 160, dur: 3.0, turn: 1.0, speed: 0.5, note: 'Yarıştan çıktı' },
          { mode: 'heading', h: 180, dur: 7.0, turn: 1.0, speed: 0.5, note: 'Yarıştan çıktı' }
        ] },
      { id: 'C', name: 'Son dakikadan önce üstte: ceza yok', role: 'hak', color: '#c77dff',
        start: { x: 652, y: 482, h: 345 }, v0: 0,
        segs: [
          { mode: 'hold', h: 350, dur: 5.5, speed: 0.1, turn: 0, note: 'Sürünüyor' },
          { mode: 'hold', h: 350, dur: 2.0, speed: 0.004, turn: 0, note: 'Hattın üstünde: henüz son dakika değil' },
          { mode: 'back', h: 350, dur: 2.6, speed: 0.3, turn: 0, note: 'Geri çekiliyor: ceza yok' },
          { mode: 'hold', h: 345, dur: 19.6, speed: 0.004, turn: 0.6, note: 'Yarım boy altta' },
          { mode: 'closehauled', tack: 'starboard', dur: 10.3, turn: 0.8 }
        ] }
    ],
    // temkinli filo: uçlar hatta yakın, orta 1-1,5 boy geride (siyah bayrak yayı)
    crowd: [
      { slot: 0.06, back: 0 }, { slot: 0.13, back: 10 }, { slot: 0.33, back: 45 },
      { slot: 0.40, back: 55 }, { slot: 0.60, back: 55 }, { slot: 0.73, back: 40 },
      { slot: 0.80, back: 32 }, { slot: 0.89, back: 8 }
    ],
    steps: [
      { t: 0, title: 'Az önce: genel geri çağırma', text: 'İlk start\'ta filonun çoğu hattın üstündeydi ve hakem kimin erken çıktığını tek tek ayıramadı. Genel geri çağırma yaptı: Birinci Tekrar bayrağı (üç köşeli, sarı-mavi) ve iki ses. Herkes geri döndü; start sırası yeniden başlıyor. Bu kez hazırlık bayrağı SİYAH.' },
      { t: 3, title: 'Siyah bayrak ne demek?', text: 'Son 1 dakikada gövdenin, ekipmanın ya da mürettebatın bir parçası hat üçgenindeyse (hat ile iki ucu ve ilk şamandıra arasında) diskalifiye olursun: BFD. Yelken numaran hakem botunda gösterilir. Start yine geri çağrılırsa bir sonraki start\'a da giremezsin. Geri dönmek kurtarmaz.' },
      { t: 6, title: 'Filo temkinli: yay oluşuyor', text: 'Siyah bayrakta herkes hattan uzak durur; ortadaki tekneler uçları göremediği için daha da geride bekler. Ortada 1-1,5 boyluk bir yay oluşur (İA2). Hattın yerini bilen için büyük fırsat.' },
      { t: 7.5, title: 'C hattın üstünde ama…', text: 'Mor C sürünüp hattın üstüne çıktı. Henüz son dakika değil: bayrak hâlâ yukarıda. Siyah bayrak kuralı son 1 dakikada başlar. C yelkenini ters basıp geri çekiliyor: ceza yok.' },
      { t: 12, title: 'S hattı biliyor', text: 'Yeşil S transitle (pin ile hakem botunu bir hizaya getirerek) hattın yerini biliyor ve hattın yarım boy altında bekliyor. Komşuları 1 boy geride. Siyah bayrakta bile yarım boy güvenlidir: hat üçgenine girmez.' },
      { t: 17, title: '1 dakika: bayrak indi', text: 'Hazırlık bayrağı indi, uzun ses. Siyah bayrak kuralı şimdi başladı: start sinyaline kadar hat üçgenine giren diskalifiye.' },
      { t: 18, title: 'B sürünüyor', text: 'Turuncu B yelkeni yarım dolu tutup sürünüyor. Komşularından öne geçti ama hattın nerede olduğunu bilmiyor.' },
      { t: 21.2, title: 'B\'nin burnu hatta: BFD', text: 'B\'nin burnu hat üçgeninde. Siyah bayrak altında bu kadar: hakem numarasını yazdı. B geri çekilse de, start\'ta hattın altından geçse de diskalifiye. P bayrağında geri dönüp düzeltebilirdi; siyah bayrakta düzeltme yok.' },
      { t: 28, title: 'BFD numaraları hakem botunda', text: 'Hakem BFD olan teknelerin numaralarını hakem botunda gösterir. B yarıştan çıkıyor; hakemi dinlemezse protestoyla da diskalifiye olur.' },
      { t: 29.4, title: '10 sn kala doldur', text: 'S yarım boy altta: dolduruyor, düşüp hızlanıyor. Komşuları 1 boy geriden, yavaş başlıyor.' },
      { t: 32, title: 'START', text: 'S yayın ortasından, komşularından bir boy önde ve tam hızda çıkıyor. Siyah bayrakta en büyük kazanç: hattın yerini bilmek ve yarım boy altta, korkusuzca beklemek.' },
      { t: 36, title: 'Özet', text: 'Genel geri çağırma sonrası çoğu zaman U ya da siyah bayrak gelir. Siyah bayrakta son 1 dakikada hat üçgenine girme: geri dönmek kurtarmaz. Son dakikadan önce hattın üstünde olmak ceza değildir. Filo temkinliyken transitle hattı bilen kazanır.' }
    ],
    addBoat: { pin: { x: 290, y: 600 }, middle: { x: 500, y: 600 }, committee: { x: 720, y: 600 } },
    startSlots: { pin: [0.1], middle: [0.5], committee: [0.9] }
  });

  // =====================================================================
  // İLERİ TEKNİK: donanım ve tekne kullanımı. Sahnede üstten görünüş + "Yandan görünüş" paneli (js/rigview.js, scn.rig).
  // =====================================================================

  // Rüzgarüstü şamandıra: aynı rota iki senaryoda, rüzgar şiddeti ve palanga miktarı farklı
  const VANG_MARK = { x: 640, y: 130, label: 'Orsa şamandırası (iskelede bırak)', zone: true };
  const VANG_STEPS = ['İskotayı sonuna kadar al', 'Bumbayı bastır', 'Palangayı al', 'İskotayı kaçır, kafa aç'];
  const vangKeys = (up, set) => [
    { t: 0, sheet: 0.85, vang: up, push: 0, p: -1 },
    { t: 4, sheet: 0.85, vang: up, push: 0, hand: 'sheet', p: 0 },
    { t: 5.2, sheet: 1, vang: up, push: 0, hand: 'sheet', p: 0 },
    { t: 5.6, sheet: 1, vang: up, push: 0, hand: 'boom', p: 1 },
    { t: 6.4, sheet: 1, vang: up, push: 1, hand: 'boom', p: 1 },
    { t: 7, sheet: 1, vang: up, push: 1, hand: 'vang', p: 2 },
    { t: 8.8, sheet: 1, vang: set, push: 1, hand: 'vang', p: 2 },
    { t: 9.2, sheet: 1, vang: set, push: 1, p: 2 },
    { t: 9.8, sheet: 1, vang: set, push: 0, p: 2 },
    { t: 11, sheet: 1, vang: set, push: 0, hand: 'release', p: 3 },
    { t: 13.6, sheet: 0.1, vang: set, push: 0, hand: 'tiller', p: 3 },
    { t: 15, sheet: 0.1, vang: set, push: 0, p: 4 }
  ];
  const vangGhost = up => [
    { t: 0, sheet: 0.85, vang: up }, { t: 11, sheet: 1, vang: up }, { t: 13.6, sheet: 0.1, vang: up }
  ];
  const vangBoatA = (name) => ({ id: 'A', name, role: 'dogru', color: '#2a9d8f',
    start: { x: 894, y: 362, h: 315 }, v0: 28,
    segs: [
      { mode: 'closehauled', tack: 'starboard', dur: 4, turn: 0 },
      { mode: 'closehauled', tack: 'starboard', dur: 5, turn: 0, note: 'İskota · bumba · palanga' },
      { mode: 'closehauled', tack: 'starboard', dur: 2.2, turn: 0 },
      { mode: 'heading', h: 250, dur: 1.4, turn: 1.2 },
      { mode: 'run', tack: 'starboard', angle: 178, dur: 9.4, turn: 1.6 }
    ] });

  // ---------- İT1: orta-sert havada palangayı al, sonra pupaya dön ----------
  S.push({
    id: 'it1-vang-strong',
    category: 'İleri Teknik', topic: 'Şamandıra · Palanga',
    title: 'İT1 · Pupaya dönmeden palangayı al (orta-sert hava)',
    summary: 'Optimist\'te orsada bumbayı aşağıda tutan iskotadır. Rüzgarüstü şamandırada iskotayı kaçırınca bumbayı tutan tek şey palanga (boom vang) kalır. Bu yüzden şamandıradan önce sırayla: iskotayı sonuna kadar al, bumbayı aşağı bastır, palangayı elle al, sonra iskotayı kaçırıp kafa aç. Orta-sert havada palanga belirgin sıkı olur. Sol alttaki "Yandan görünüş" panelinde her adımı izleyin; kesikli kırmızı çizgi palangayı almayan B\'nin yelkenidir.',
    duration: 22,
    baseSpeed: 28,
    wind: 0,
    windKn: 14,
    marks: [VANG_MARK],
    rig: { kn: 14, label: 'ORTA-SERT', steps: VANG_STEPS, mark: 0.9, keys: vangKeys(0.3, 0.9),
      ghost: { label: 'Kesikli kırmızı: palangayı almayan B', short: 'B', from: 11, keys: vangGhost(0.3) } },
    boats: [
      vangBoatA('Palangayı alan'),
      { id: 'B', name: 'Palangayı almayan', role: 'hata', color: '#e76f51',
        noShadow: true,                               // B'nin yavaşlaması palangadan; A'nın gölgesi karışmasın
        start: { x: 824, y: 292, h: 315 }, v0: 28,
        segs: [
          { mode: 'closehauled', tack: 'starboard', dur: 7.7, turn: 0 },
          { mode: 'heading', h: 250, dur: 1.4, turn: 1.2 },
          { mode: 'run', tack: 'starboard', angle: 170, dur: 1.2, turn: 1.4, speed: 0.9 },
          { mode: 'heading', h: 215, dur: 0.9, turn: 0.7, speed: 0.85, note: 'Bumba kalktı · tekne yuvarlanıyor' },
          { mode: 'heading', h: 190, dur: 0.9, turn: 0.7, speed: 0.85, note: 'Bumba kalktı · tekne yuvarlanıyor' },
          { mode: 'heading', h: 215, dur: 0.9, turn: 0.7, speed: 0.85, note: 'Bumba kalktı · tekne yuvarlanıyor' },
          { mode: 'heading', h: 190, dur: 0.9, turn: 0.7, speed: 0.85 },
          { mode: 'heading', h: 215, dur: 0.9, turn: 0.7, speed: 0.85, note: 'Bumba kalktı · tekne yuvarlanıyor' },
          { mode: 'heading', h: 190, dur: 0.9, turn: 0.7, speed: 0.85 },
          { mode: 'heading', h: 215, dur: 0.9, turn: 0.7, speed: 0.85 },
          { mode: 'heading', h: 190, dur: 0.9, turn: 0.7, speed: 0.85 },
          { mode: 'heading', h: 210, dur: 4.5, turn: 1.2, speed: 0.85 }
        ] }
    ],
    steps: [
      { t: 0, title: 'Layline\'da, orsa', text: 'A (yeşil) sancak kontra layline\'da, 14 knot rüzgarda orsa gidiyor. Optimist\'te orsada bumbayı aşağıda tutan asıl iskotadır; palanga gevşek ya da az gergindir. Şamandırada iskotayı kaçıracağız: o an bumbayı tutacak tek şey palanga olacak.' },
      { t: 3.5, title: 'Zone\'dan önce hazırlan', text: 'Bu işi zone\'a (3 boy) girmeden, tekne düz ve sakinken yapın. Zone\'da gözünüz şamandırada, dümende ve çevrenizdeki teknelerde olmalı; palangayla uğraşacak zaman yok.' },
      { t: 4, title: '1 · İskotayı sonuna kadar al', text: 'İskotayı sonuna kadar alın (çekin). Bumba en alçak yerine iner, palanga halatı gevşer. Palanga yüklüyken elle çekilemez; bumbayı önce iskotayla indiriyoruz ki halat kolay gelsin.' },
      { t: 5.6, title: '2 · Bumbayı aşağı bastır', text: 'İskota elinizdeyken bumbayı direğe yakın yerinden aşağı bastırın. Bumba palanganın sınırının da altına iner ve palangada boşluk açılır. North Sails Optimist kılavuzu da sert havada "bumbayı sertçe aşağı bastırıp palangayı çekin" der.' },
      { t: 7, title: '3 · Palangayı elle al', text: 'Açılan boşluğu elle alın ve kurtağzına sıkıştırın. Orta-sert havada belirgin sıkı: panelde sarı çizgiye kadar. Halata bir işaret koyarsanız her seferinde aynı ayarı yaparsınız.' },
      { t: 9.6, title: 'Bumba artık kilitli', text: 'Bumbayı bıraktınız. İskota hâlâ alınmış; palanga şimdi bumbanın kalkabileceği en yüksek yeri belirliyor. B (turuncu) bu işi yapmadı, palangası gevşek duruyor.' },
      { t: 11, title: '4 · İskotayı kaçır, kafa aç', text: 'Şamandırada iskotayı kaçırın, ağırlığı dışarıda tutup dümenle kafa açın (pupaya/apaza dönün). Bumba dışarı açılıyor ama yukarı kalkmıyor: palanga tutuyor (panelde kırmızı, gergin halat).' },
      { t: 14, title: 'Neden? Yelkenin tepesi', text: 'Bumba kalkmayınca yelkenin tepesi fazla açılmaz (tepe açılması, twist). Yelken gücünü tutar, tekne sağa sola yuvarlanmaz (rolling), dümen hafif kalır. Paneldeki "üstten" daire bumba ile yelken tepesi arasındaki açıyı gösterir.' },
      { t: 16.8, title: 'B: palangayı almayan', text: 'B iskotayı kaçırınca bumbası kalktı, yelkenin tepesi rüzgaraltına açıldı (paneldeki kesikli kırmızı). Tepe güç kaybediyor, tekne sağa sola yuvarlanıyor, sporcu dümenle düzeltmeye uğraşıyor ve yavaşlıyor. Sert havada bu yuvarlanma rüzgar altına devrilmeye (death roll) kadar gidebilir.' },
      { t: 19.5, title: 'Fazlası da zarar', text: 'Çok sıkı palanga da iyi değil: apazda sağanakta bumba ucu suya değer, tekne orsalar (round up). Böyle bir sağanakta palangayı ya da iskotayı biraz kaçırın. Doğru miktar yelkene, sporcunun kilosuna ve dalgaya göre değişir; antrenmanda deneyip halata işaret koyun.' }
    ],
    addBoat: { pin: { x: 710, y: 560 }, middle: { x: 830, y: 620 }, committee: { x: 650, y: 620 } },
    addBoatLabels: { pin: 'Arkada', middle: 'Daha arkada', committee: 'Rüzgaraltında' }
  });

  // ---------- İT1b: hafif havada yalnız boşluğu al ----------
  S.push({
    id: 'it1b-vang-light',
    category: 'İleri Teknik', topic: 'Şamandıra · Palanga',
    title: 'İT1b · Hafif havada palanga: yalnız boşluğu al',
    summary: 'Hafif havada sıra aynı (iskotayı al, bumbayı bastır, palangayı al, iskotayı kaçır), ama palanga sıkılmaz: yalnızca boş kalmayacak kadar alınır. Bumba zıplamaz, yelken şeklini korur; yelkenin tepesi de hafif havada gerektiği gibi biraz açık kalır.',
    duration: 20,
    baseSpeed: 28,
    wind: 0,
    windKn: 6,
    marks: [VANG_MARK],
    rig: { kn: 6, label: 'HAFİF', steps: VANG_STEPS, mark: 0.55, keys: vangKeys(0.05, 0.55),
      ghost: { label: 'Kesikli kırmızı: palanga hiç alınmasaydı', short: 'palangasız', from: 11, keys: vangGhost(0.05) } },
    boats: [vangBoatA('Boşluğu alan')],
    steps: [
      { t: 0, title: 'Hafif hava, orsa', text: '6 knot rüzgarda orsa gidiyoruz. Palanga tamamen gevşek: orsada bumbayı iskota tutuyor. Hafif havada da şamandıradan önce palangaya bakılır, ama amaç sıkmak değil, boşluğu almaktır.' },
      { t: 4, title: '1 · İskotayı al', text: 'İskotayı sonuna kadar alın, bumba en alçak yerine insin. Hafif havada tekneyi yatırmadan, ağırlığı ortada tutarak yapın.' },
      { t: 5.6, title: '2 · Bumbayı bastır', text: 'Bumbayı hafifçe aşağı bastırın. Hafif havada çok kuvvet gerekmez; amaç palanga halatının boşluğunu görmek.' },
      { t: 7, title: '3 · Yalnız boşluğu al', text: 'Palangayı boş kalmayacak kadar alın: halat gergin ama sıkı değil (panelde sarı çizgi). Sıkarsanız arka yaka kapanır.' },
      { t: 11, title: '4 · İskotayı kaçır, kafa aç', text: 'İskotayı kaçırıp kafa açın. Bumba biraz kalkıyor ve palangaya yaslanıyor; yelkenin tepesi bir miktar açık. Hafif havada bu istenen şey: yelken nefes alır, hava akışı kopmaz.' },
      { t: 14, title: 'Neden boş bırakmıyoruz?', text: 'Palanga hiç alınmasaydı (kesikli kırmızı) bumba çok kalkar, yelkenin tepesi fazla açılır ve güç kaybedilir. Dalgada bumba aşağı yukarı oynar, yelken şeklini kaybeder.' },
      { t: 17, title: 'Neden sıkmıyoruz?', text: 'Hafif havada sıkı palanga arka yakayı kapatır, yelken tepeden boğulur (stall), tekne yavaşlar. Kural: hafif havada boşluğu al, orta-sert havada belirgin sık (bkz. İT1).' }
    ],
    addBoat: { pin: { x: 710, y: 560 }, middle: { x: 830, y: 620 }, committee: { x: 650, y: 620 } },
    addBoatLabels: { pin: 'Arkada', middle: 'Daha arkada', committee: 'Rüzgaraltında' }
  });

  global.SCENARIOS = S;
})(typeof window !== 'undefined' ? window : globalThis);
