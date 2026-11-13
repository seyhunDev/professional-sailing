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
    clockScale: 4,       // 1 animasyon saniyesi = 4 gerçek saniye; ivme simülatördeki Optimist tablosundan (engine.accelTau)
    goBefore: 2.5,       // filo sinyalden 2.5 animasyon sn (10 gerçek sn) önce yelkeni doldurur
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
      { slot: 0.20 }, { slot: 0.44 }, { slot: 0.70 }, { slot: 0.82 }, { slot: 0.93 },
      { slot: 0.22, row: 1 }, { slot: 0.44, row: 1 }
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
    goBefore: 2.5,
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
    goBefore: 2.5,
    crowd: [{ slot: 0.08 }, { slot: 0.2 }, { slot: 0.32 }, { slot: 0.58 }, { slot: 0.14, row: 1 }, { slot: 0.5, row: 1 }]
  });

  // ---------- A12: Start bayrakları ve fodepar ----------
  S.push({
    id: 'a12-flags',
    category: 'Taktik', topic: 'Start',
    title: 'A12 · Start bayrakları: P, I, U, siyah — son 1 dakikada burun',
    summary: 'Hazırlık bayrağı hangi fodepar (OCS) kuralının geçerli olduğunu söyler. P: geri dön, yeniden geç. I: uçlardan dolaş. U: son 1 dakikada hattın üstündeysen yarıştan çıkarsın (genel geri çağırma olursa affedilir). Siyah: çıkarsın ve tekrar startta da yarışamazsın.',
    duration: 36,
    baseSpeed: 40, goBefore: 2.5,
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
    crowd: [{ slot: 0.1 }, { slot: 0.68 }, { slot: 0.8 }, { slot: 0.92 }, { slot: 0.1, row: 1 }, { slot: 0.68, row: 1 }],
    steps: [
      { t: 0, title: 'Start\'a 2 dakika: hazırlık bayrağı U', text: 'Hakem botunda hazırlık bayrağı dalgalanıyor: U. Bayrak hangi fodepar (OCS) kuralının geçerli olduğunu söyler. Saat sağ üstte, gerçek zaman (animasyon 4× hızlı).' },
      { t: 6, title: 'Bayrak türleri', text: 'P (mavi-beyaz): fodepar yaparsan geri dönüp hattı yeniden geç, ceza yok. I (sarı-siyah): son 1 dakikada hattın üstündeysen uçlardan dolaşarak geri dön. U (kırmızı-beyaz kare): son 1 dakikada gövdenin bir parçası hat üçgenindeyse yarıştan çıkarsın (UFD) ama genel geri çağırma olursa yeniden yarışabilirsin. Siyah: aynı şey ama genel geri çağırmada bile yarışamazsın (BFD).' },
      { t: 12, title: 'Turuncu hattın dibine fazla sokuldu', text: 'Turuncu bekleme yerini hattın tam dibine aldı. Rüzgar ve dalga tekneyi öne iter; küçük teknede yarım boy 2-3 saniyede gider.' },
      { t: 15, title: '1 dakika: bayrak indi, uzun ses', text: 'Hazırlık bayrağı indi. U bayrağı kuralı şimdi başladı: bu andan start sinyaline kadar burnun çizgiyi geçmesi yarıştan çıkarır. Fodepar yalnızca son saniyede olmaz; son 1 dakikanın tamamında olur.' },
      { t: 18, title: 'Burun çizgide: UFD', text: 'Turuncunun burnu çizginin üstünde. U bayrağı altında bu tekne artık fodepar: komite not aldı, start sonrası sonuçlarda "UFD" yazacak. Geri çekilmesi kurtarmaz; yalnızca genel geri çağırma (Birinci Tekrar) kurtarır. P bayrağı olsaydı geri çekilip start tarafına dönmesi yeterdi.' },
      { t: 20, title: 'Geri çekiliyor', text: 'Turuncu yelkeni geri basıp (backing) geri çekiliyor. Geri giden tekne herkese yol verir (Kural 22.3). P bayrağında bu hamle doğru; U ve siyah bayrakta artık geç.' },
      { t: 24, title: 'Yeşil: hattın dibinde ama altında', text: 'Yeşil de hattın dibinde bekliyor ama burnu çizginin 1-1.5 boy altında. Hattı görmek için transit (kerteriz) kullanın; emin değilseniz yarım boy geride durun. U ve siyah bayrakta "yarım boy fazla" değil, "yarım boy eksik" tarafında hata yapın.' },
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
    baseSpeed: 40, tau: 1.0, goBefore: 2.5,
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
          { mode: 'heading', h: 95, dur: 5.0, turn: 1.0, note: 'Geç: 25 sn kala geliyor' },
          { mode: 'heading', h: 90, dur: 6.4, turn: 0.8, note: 'HATA: boşluk yok → herkesin altından' },
          { mode: 'closehauled', tack: 'starboard', dur: 12.1, turn: 1.2 }
        ] }
    ],
    crowd: [{ slot: 0.22 }, { slot: 0.38 }, { slot: 0.54 }, { slot: 0.7 }, { slot: 0.86 }],
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
    baseSpeed: 40, tau: 1.0, goBefore: 2.5,
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
      { slot: 0.10, back: 0 }, { slot: 0.20, back: 30 }, { slot: 0.30, back: 95 }, { slot: 0.40, back: 130 },
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
    baseSpeed: 40, tau: 1.0, goBefore: 2.5,
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
      { slot: 0.10, back: 0 }, { slot: 0.19, back: 5 }, { slot: 0.28, back: 0 }, { slot: 0.50, back: 5 },
      { slot: 0.59, back: 0 }, { slot: 0.68, back: 5 }, { slot: 0.77, back: 0 }, { slot: 0.87, back: 0 }
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
    baseSpeed: 40, tau: 1.0, goBefore: 2.5,
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
    baseSpeed: 40, tau: 1.0, goBefore: 2.5,
    clockScale: 3,
    wind: 0,
    line: { pin: { x: 200, y: 440 }, boat: { x: 800, y: 440 } },
    startAt: 27,
    rungs: { boat: 'S', from: 27.5 },
    boats: [
      { id: 'S', name: 'Rüzgarüstündekinin altına', role: 'dogru', color: '#2a9d8f',
        start: { x: 377, y: 582, h: 340 }, v0: 0,
        segs: [
          { mode: 'hold', h: 340, dur: 3, speed: 0.04, turn: 0, note: 'Sıkıştı: önü kapalı, hava kirli' },
          { mode: 'heading', h: 210, dur: 2.0, turn: 0.9, note: 'Geri çekil, kalabalıktan çık' },
          { mode: 'heading', h: 88, dur: 3.55, turn: 1.0, note: 'Filonun altından boş yere' },
          { mode: 'heading', h: 40, dur: 2.8, turn: 1.0, speed: 1, note: 'W\'nin rüzgaraltına yanaş' },
          { mode: 'hold', h: 340, dur: 13.15, speed: 0.04, turn: 1.0, note: 'W\'ye yakın, altı boş' },
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
          { mode: 'heading', h: 210, dur: 1.4, turn: 0.9, note: 'O da kalabalıktan çıkıyor' },
          { mode: 'heading', h: 90, dur: 5.3, turn: 1.0 },
          { mode: 'heading', h: 40, dur: 3.8, turn: 1.0, speed: 1, note: 'L\'nin rüzgarüstüne yanaştı' },
          { mode: 'hold', h: 345, dur: 12.0, speed: 0.04, turn: 1.0, note: 'L\'ye çok yakın, üstünde' },
          { mode: 'closehauled', tack: 'starboard', dur: 2.9, turn: 0.8, speed: 0.75, note: 'Altı dolu: düşüp hızlanamıyor' },
          { mode: 'heading', h: 355, dur: 1.6, speed: 0.6, turn: 1.0, note: 'L orsaladı: yol ver' },
          { mode: 'closehauled', tack: 'starboard', dur: 10, turn: 0.8, speed: 0.85, note: 'Geride, L\'nin ters rüzgarında' }
        ] }
    ],
    // pin tarafında kalabalık (0.06-0.27); 0.36 ile W (0.56) arası boş: S W'nin hemen rüzgaraltına (~44 px)
    // yanaşır. Sağda L (scripted, 0.75) ve onun hemen rüzgarüstüne yanaşan H.
    crowd: [
      { slot: 0.03, back: 0 }, { slot: 0.13, back: 5 }, { slot: 0.21, back: 0 }, { slot: 0.30, back: 5 },
      { slot: 0.58, back: 0, id: 'W', name: 'Rüzgarüstü komşu' }
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
    summary: 'Hakem botu ucu avantajlıysa oradaki tek yer erken gelenindir. Yeşil H 2 dk kala layline\'dan, rüzgaraltından gelir ve hakem botunun turuncu bayrağının hemen yanında, hattın 1 boy altında rüzgara baş verip bekler. Hakem botuna yakın durduğu için rüzgarüstünde kimseye yer kalmaz; rüzgaraltında ise hızlanmak için boşluğu korur. Geç gelip araya sokulmak isteyen (barging) B yer bulamaz, arkadan dolaşıp H\'nin pis rüzgarında çıkar.',
    duration: 38,
    baseSpeed: 40, tau: 1.0, goBefore: 2.5,
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
          { mode: 'closehauled', tack: 'starboard', dur: 4.6, turn: 0, note: 'Erken: layline\'dan, rüzgaraltından' },
          { mode: 'hold', h: 5, dur: 22.3, speed: 0.008, turn: 1.4, note: 'Bayrağın dibinde: yer benim' },
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
      { slot: 0.10 }, { slot: 0.22 }, { slot: 0.34 }, { slot: 0.46 }, { slot: 0.58 }, { slot: 0.69 }
    ],
    steps: [
      { t: 0, title: 'Start\'a 2 dk: hakem botu ucu avantajlı', text: 'Rüzgar 5° sağa dönmüş: hakem botu ucu biraz avantajlı. Herkes hakem botunun yanından çıkmak ister ama orada tek bir yer var: turuncu bayrağın hemen yanı. O yer erken ve doğru yönden gelenindir.' },
      { t: 1.5, title: 'Erken gel, layline\'dan gel', text: 'Yeşil H, 2 dk kala hakem botunun sancak layline\'ından, rüzgaraltından geliyor. Rüzgaraltından gelen tekne hak sahibidir (Kural 11); kimse onun rüzgarüstüne sokulamaz. Rüzgarüstünden gelmek (barging) hak vermez.' },
      { t: 5, title: 'Bayrağın dibinde dur', text: 'H hakem botunun turuncu bayrağının hemen yanında, hattın yaklaşık 1 boy altında rüzgara baş verip duruyor. Hakem botuyla arasında bir tekne sığmaz: rüzgarüstündeki kapı kapalı. Ama hakem botuna değmiyor: değerse Kural 31, ceza turu.' },
      { t: 9, title: 'Yer tutma: hiç sürüklenme', text: 'Yelken boş, tekne neredeyse duruyor. Burnu rüzgarda tut; düşerse yelken dolar ve hatta sürünürsün, fazla geri giderse rüzgarüstünde boşluk açılır. Gerekirse yelkeni bir an doldurup burnu tekrar rüzgara ver: yer tutmak sürekli küçük düzeltmedir.' },
      { t: 12, title: 'Rüzgaraltında boşluğu koru', text: 'H\'nin rüzgaraltında, filonun en yakın teknesine kadar 2 boyluk açık su var. Sinyalde oraya bordalayıp hızlanacak. Bu boşluk H\'nin hızlanma yolu: biri gelip sokulursa H yavaş kalır. Rüzgaraltındaki boşluk, rüzgarüstü kapı kadar önemlidir.' },
      { t: 14, title: 'B geç geliyor: barging', text: 'Turuncu B son dakikada hakem botunun sağından, rüzgarüstünden, apaz hızla H ile hakem botu arasına girmek istiyor. Burada yer yok: H hakem botunun dibinde. B rüzgarüstü tekne olduğu için H\'ye yol vermek zorunda (Kural 11) ve hakem botu bir engel; ona çarparsa Kural 31.' },
      { t: 17, title: 'B bordalayıp arkadan dolaşıyor', text: 'B\'nin tek çaresi: sert bordalayıp H\'nin kıçından geçmek. Hız ve yer kaybediyor, ikinci sıraya düşüyor.' },
      { t: 26.9, title: '3 sn kala doldur', text: 'H burnunu rüzgaraltındaki boşluğa düşürüp yelkeni dolduruyor; hızlanırken hakem botundan uzaklaşıyor, kimseye çarpmıyor.' },
      { t: 30, title: 'START: avantajlı uçta, temiz hava', text: 'H hakem botunun hemen yanından, tam hızla ve temiz havada çıkıyor. B hem geride hem H\'nin pis rüzgarında (mor gölge).' },
      { t: 34, title: 'Özet', text: 'Hakem botu ucunda: erken gel, layline\'dan rüzgaraltından gel, bayrağın dibinde dur (rüzgarüstünde boşluk bırakma), rüzgaraltındaki boşluğu koru, 2-3 sn kala doldur. Geç kalırsan rüzgarüstünden sokulma: kapı kapalıdır, 3-4 boy aşağıda temiz bir yer seç.' }
    ],
    addBoat: { pin: { x: 290, y: 580 }, middle: { x: 500, y: 580 }, committee: { x: 720, y: 580 } },
    startSlots: { pin: [0.1], middle: [0.5], committee: [0.8] }
  });

  global.SCENARIOS = S;
})(typeof window !== 'undefined' ? window : globalThis);
