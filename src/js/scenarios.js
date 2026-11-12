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
      { id: 'A', name: 'A – Pin ucu', color: '#e4572e',
        start: { x: 336, y: 614, h: 330 },
        segs: [
          { mode: 'closehauled', tack: 'starboard', dur: 5, turn: 0 },
          { mode: 'closehauled', tack: 'port', dur: 8, turn: 1.5 }
        ], v0: 48 },
      { id: 'B', name: 'B – Hakem botu ucu', color: '#1f77b4',
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
    crowd: [{ pos: { x: 530, y: 614 }, tack: 'starboard', v0: 48 }, { pos: { x: 592, y: 614 }, tack: 'starboard', v0: 48 }, { pos: { x: 430, y: 684 }, tack: 'starboard', v0: 48 }, { pos: { x: 478, y: 684 }, tack: 'starboard', v0: 48 }]
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
      { id: 'M', name: 'Ölçüm yapan tekne', color: '#2a9d8f',
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
    title: 'A2 · Zamanlama: hattın dibinde bekle, 2-3 sn kala doldur',
    summary: 'Optimist ve ILCA gibi küçük tekneler start hattının hemen gerisinde (1-1.5 tekne boyu) rüzgara baş verip beklerler; aralarında boşluk bırakırlar. İyi start = sinyalden 2-3 saniye önce yelkeni doldurup sinyal anında hattı tam hızla geçmek.',
    duration: 28,
    baseSpeed: 40,
    tau: 1.0,            // küçük tekne: hızlı ivmelenir
    goBefore: 2.5,       // filo sinyalden 2.5 s önce yelkeni doldurur
    wind: 0,
    line: { pin: { x: 250, y: 420 }, boat: { x: 750, y: 420 } },
    startAt: 20,
    boats: [
      { id: 'D', name: 'Doğru zamanlama', color: '#2a9d8f',
        start: { x: 700, y: 540, h: 290 }, v0: 25,
        segs: [
          { mode: 'heading', h: 290, dur: 4, speed: 0.5, turn: 0 },         // hattın dibine yarım hızla gel
          { mode: 'hold', h: 340, dur: 12.9, speed: 0.05, turn: 1.0 },      // rüzgara baş ver, bekle
          { mode: 'closehauled', tack: 'starboard', dur: 11.1, turn: 0.8 }  // 3 s kala doldur, hızlan
        ] },
      { id: 'E', name: 'Erken (OCS)', color: '#e76f51',
        start: { x: 455, y: 492, h: 340 }, v0: 2,
        segs: [
          { mode: 'hold', h: 340, dur: 17.2, speed: 0.05, turn: 0 },
          { mode: 'closehauled', tack: 'starboard', dur: 3.3, turn: 0.8 },   // 2.8 s kala doldurdu: yarım boy erken → burnu çizgiyi geçer
          { mode: 'hold', h: 0, dur: 1.5, speed: 0.05, turn: 0.8, note: 'Fodepar!' },        // durdu
          { mode: 'heading', h: 180, dur: 2.4, turn: 1.2, note: 'Geri dön' },                  // çizginin altına in
          { mode: 'closehauled', tack: 'starboard', dur: 3.6, turn: 1.2 }
        ] },
      { id: 'G', name: 'Geç kalan', color: '#8d99ae',
        start: { x: 335, y: 495, h: 340 }, v0: 2,
        segs: [
          { mode: 'hold', h: 340, dur: 19.5, speed: 0.05, turn: 0 },
          { mode: 'closehauled', tack: 'starboard', dur: 8.5, turn: 0.8 }
        ] }
    ],
    crowd: [
      { slot: 0.20 }, { slot: 0.44 }, { slot: 0.70 }, { slot: 0.82 }, { slot: 0.93 },
      { slot: 0.20, row: 1 }, { slot: 0.44, row: 1 }
    ],
    steps: [
      { t: 0, title: 'Start\'a 20 sn: filo hattın dibinde', text: 'Gri tekneler hattın 1-1.5 boy gerisinde rüzgara baş vermiş, yelkenleri boş bekliyor. Aralarında boşluklar var: boşluk, hızlanma alanıdır. Yeşil tekne yarım hızla yerine geliyor.' },
      { t: 4, title: 'Yerini al, rüzgara baş ver', text: 'Yeşil tekne de hattın dibinde durdu. Burnu rüzgara yakın, yelken boş ("sallanıyor"). Küçük teknede bekleme burada yapılır: hattan uzakta değil, hemen gerisinde. Rüzgaraltınızdaki boşluğu koruyun; biri sokulursa orsa edip kapatın (Kural 11).' },
      { t: 17.2, title: 'Turuncu yarım saniye erken doldurdu', text: 'Turuncu 2.8 saniye kala yelkenini doldurdu; yeşil 3 saniye kala ama 1 boy daha gerideydi. Yarım saniye bile küçük teknede yarım boy eder.' },
      { t: 19.6, title: 'Burnu çizgiyi geçti: fodepar (OCS)', text: 'Sinyalde teknenin herhangi bir parçası (burun!) çizginin öbür tarafındaysa erken start = fodepar (OCS). Çoğu fodepar böyle olur: yarım boy. P bayrağında geri dönüp hattı yeniden geçmek yeter; I bayrağında uçlardan dolaşılır; U ve siyah bayrakta son 1 dakikada bu burun yarıştan çıkarır (bkz. A12).' },
      { t: 16.5, title: '3.5 sn kala: doldur ve hızlan', text: 'Yeşil tekne bordalayıp yelkeni dolduruyor. Filo da 2.5 s kala dolduruyor. Küçük teknede hızlanma kısa sürer; bu yüzden bekleme hattın dibinde, hızlanma son 2-3 saniyedir.' },
      { t: 20, title: 'START', text: 'Yeşil tekne tam bu anda, tam hızla çizgide; filo da birlikte çıkıyor. Turuncu geri dönüyor: 8-10 saniye ve kirli hava. Gri tekne hâlâ bekliyor: çizgiyi 2 saniye sonra, yavaş geçecek.' },
      { t: 25, title: 'Sonuç', text: 'Formül: hattın dibinde (1-1.5 boy) rüzgara baş verip bekle, rüzgaraltında boşluk tut, sinyalden 2-3 s önce doldur. Antrenmanda "kaç saniyede 1 boy?" hissini çalışın: yelkeni doldurup çizgiye varma süresini tekrar tekrar ölçün.' }
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
    wind: 335,
    line: { pin: { x: 200, y: 480 }, boat: { x: 800, y: 480 } },
    startAt: 6,
    rungs: { boat: 'P1', from: 8 },
    laylines: [{ x: 200, y: 480, tack: 'starboard', len: 400, from: 2, label: 'Pin layline\'ı (sancak)' }],
    boats: [
      { id: 'P1', name: 'P1 – Pin\'de tam zamanında', color: '#2a9d8f',
        start: { x: 324, y: 507, h: 310 }, v0: 2,
        segs: [
          { mode: 'hold', h: 310, dur: 3.8, speed: 0.05, turn: 0 },
          { mode: 'closehauled', tack: 'starboard', dur: 3.2, turn: 0.8 },
          { mode: 'closehauled', tack: 'port', dur: 9.5, turn: 1.4, note: 'Tramola → filoyu önden kes' }
        ] },
      { id: 'P2', name: 'P2 – Layline\'ın altında (sıkışan)', color: '#e76f51',
        start: { x: 290, y: 546, h: 310 }, v0: 2,
        segs: [
          { mode: 'hold', h: 310, dur: 3.8, speed: 0.05, turn: 0 },
          { mode: 'closehauled', tack: 'starboard', dur: 2, turn: 0.8 },
          { mode: 'closehauled', tack: 'starboard', dur: 2.5, turn: 0, note: 'Pin\'e yetişemiyor!' },
          { mode: 'heading', h: 118, dur: 4.6, turn: 1.4, note: 'Çizgi dışı → geri dönüyor' },
          { mode: 'closehauled', tack: 'starboard', dur: 3.6, turn: 1.4 }
        ] },
      { id: 'P3', name: 'P3 – Ortadan güvenli', color: '#1f77b4',
        start: { x: 684, y: 507, h: 310 }, v0: 2,
        segs: [
          { mode: 'hold', h: 310, dur: 3.8, speed: 0.05, turn: 0 },
          { mode: 'closehauled', tack: 'starboard', dur: 12.7, turn: 0.8 }
        ] }
    ],
    steps: [
      { t: 0, title: 'Pin ucu avantajlı', text: 'Rüzgar 335°\'den, yani pin (sol) tarafından geliyor. Hat geniş (12 boy); pin ucu hakem botundan ~5 tekne boyu "önde". Filo hattın dibinde rüzgara baş vermiş bekliyor; herkes pin tarafına yığılmış, hakem botu tarafı boş. Start\'a 6 saniye var.' },
      { t: 2, title: 'Pin layline\'ı', text: 'Mavi kesikli çizgi: pin\'den geriye, sancak orsa rotası boyunca çizilen layline. Bu çizginin ÜSTÜNDE (sağında) olan tekne pin\'e yetişir; altında kalan yetişemez. Yeşil P1 tam layline\'da, turuncu P2 altında.' },
      { t: 4, title: 'P2 pin\'e yetişemiyor', text: 'P2 orsa gittiği hâlde burnu pin\'in soluna düşüyor. Seçenekleri: tramola atıp iskele kontrada filoya girmek (tehlikeli, Kural 10) ya da pin\'in dışından geçip geri dönmek. İkisi de pahalı.' },
      { t: 6, title: 'START: P1 pin\'de', text: 'P1 start anında pin\'in hemen yanında, tam hızda. Avantajlı uçtan, temiz havada, rüzgaraltında kimse yok.' },
      { t: 7.0, title: 'P1 hemen tramola', text: 'Pin\'den çıkan tekne sancakta uzun gitmez: pin\'i temizler temizlemez iskele kontraya döner. Neden? Pin avantajı onu filonun ÖNÜNE koydu; iskele kontrada herkesin önünden geçip istediği tarafa gidebilir. Sancakta kalsa sol kenara sıkışır.' },
      { t: 8.6, title: 'P2 çizgi dışından geçti', text: 'P2 hattı pin\'in dışından geçti: start almış sayılmaz. Geri dönüp hattı uçlar arasından yeniden geçmek zorunda.' },
      { t: 11, title: 'P1 P3\'ün önünden geçiyor', text: 'İskele kontradaki P1, sancak kontradaki P3\'ün önünden rahatça geçiyor. Normalde iskele yol verirdi (Kural 10) ama P1 yeterince önde. Basamak çizgisi farkı gösteriyor: ~1.5 boy.' },
      { t: 12.5, title: 'P2 geri dönüyor', text: 'P2 hattın altına inip yeniden start alıyor: 8-10 saniye ve filonun arkasında kirli hava. Pin\'e sıkışmanın maliyeti bu.' },
      { t: 15, title: 'Sonuç', text: 'Pin avantajlıysa: layline\'ı son 30 saniyede gözle kontrol edin, layline\'ın biraz ÜSTÜNDE gelin, son 5 saniyede hızlanın, pin\'i temizleyince tramola atın. Emin değilseniz pin\'den 2-3 boy sağda start alın: küçük kayıp, sıfır risk.' }
    ],
    addBoat: { pin: { x: 400, y: 650 }, middle: { x: 560, y: 660 }, committee: { x: 660, y: 650 } },
    startSlots: { pin: [0.2], middle: [0.4], committee: [0.6] },
    expectOutside: ['P2'],
    tau: 1.0, goBefore: 2.5,
    crowd: [{ slot: 0.3 }, { slot: 0.5 }]
  });

  // ---------- A4: Hakem botu ucu avantajlı ----------
  S.push({
    id: 'a4-committee-favored',
    category: 'Taktik', topic: 'Start',
    title: 'A4 · Hakem botu ucu avantajlıysa: layline, barging ve güvenli yer',
    summary: 'Hakem botu ucu avantajlıysa herkes oraya ister. Oraya ancak hakem botunun layline\'ında, rüzgaraltından gelerek hak kazanılır. Rüzgarüstünden sokulmak (barging) hak vermez: rüzgaraltındaki tekne orsa edip kapıyı kapatabilir.',
    duration: 18,
    baseSpeed: 40,
    wind: 15,
    line: { pin: { x: 240, y: 400 }, boat: { x: 640, y: 400 } },
    startAt: 7.5,
    rungs: { boat: 'L', from: 9 },
    laylines: [{ x: 612, y: 400, tack: 'starboard', len: 330, from: 1, label: 'Hakem botu layline\'ı' }],
    boats: [
      { id: 'L', name: 'L – Rüzgaraltı, layline\'da (hak sahibi)', color: '#2a9d8f',
        start: { x: 706, y: 612, h: 330 }, v0: 40,
        segs: [
          { mode: 'closehauled', tack: 'starboard', dur: 2.5, turn: 0 },
          { mode: 'hold', h: 355, dur: 1.3, speed: 0.15, turn: 0.8, note: 'Orsa ediyor: "Yer yok!"' },
          { mode: 'closehauled', tack: 'starboard', dur: 14.2, turn: 1.0 }
        ] },
      { id: 'W', name: 'W – Barging (rüzgarüstünden sokulan)', color: '#e76f51',
        start: { x: 841, y: 545, h: 285 }, v0: 46,
        segs: [
          { mode: 'heading', h: 285, dur: 2.5, turn: 0, note: 'Barging' },
          { mode: 'heading', h: 240, dur: 2.2, turn: 1.0, note: 'Yol veriyor · K11' },
          { mode: 'closehauled', tack: 'starboard', dur: 13.3, turn: 1.2 }
        ] },
      { id: 'C', name: 'C – Güvenli: 4 boy aşağıda', color: '#1f77b4',
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
    tau: 1.0, goBefore: 2.5,
    crowd: [{ slot: 0.08 }, { slot: 0.2 }, { slot: 0.32 }, { slot: 0.58 }, { slot: 0.14, row: 1 }, { slot: 0.5, row: 1 }]
  });

  // ---------- A12: Start bayrakları ve fodepar ----------
  S.push({
    id: 'a12-flags',
    category: 'Taktik', topic: 'Start',
    title: 'A12 · Start bayrakları: P, I, U, siyah — son 1 dakikada burun',
    summary: 'Hazırlık bayrağı hangi fodepar (OCS) kuralının geçerli olduğunu söyler. P: geri dön, yeniden geç. I: uçlardan dolaş. U: son 1 dakikada hattın üstündeysen yarıştan çıkarsın (genel geri çağırma olursa affedilir). Siyah: çıkarsın ve tekrar startta da yarışamazsın.',
    duration: 36,
    baseSpeed: 40, tau: 1.0, goBefore: 2.5,
    clockScale: 4,            // 1 animasyon saniyesi = 4 gerçek saniye (son 2 dakika)
    prepFlag: 'U',
    flagDownAt: 15,           // 1 dk kala bayrak iner (t=15 → 60 s)
    wind: 0,
    line: { pin: { x: 250, y: 440 }, boat: { x: 750, y: 440 } },
    startAt: 30,
    boats: [
      { id: 'F', name: 'F – Burnu son dakikada çizgide', color: '#e76f51',
        start: { x: 520, y: 520, h: 340 }, v0: 2,
        segs: [
          { mode: 'hold', h: 340, dur: 12, speed: 0.05, turn: 0 },
          { mode: 'hold', h: 350, dur: 6, speed: 0.12, turn: 0.8 },                       // hattın dibine fazla sokuldu
          { mode: 'hold', h: 350, dur: 2, speed: 0.1, turn: 0, note: 'Burun çizgide!' },
          { mode: 'heading', h: 170, dur: 3, turn: 1.2, speed: 0.6, note: 'Geri çekiliyor' }, // geri in
          { mode: 'hold', h: 340, dur: 4.5, speed: 0.05, turn: 1.0 },
          { mode: 'closehauled', tack: 'starboard', dur: 8.5, turn: 0.8 }
        ] },
      { id: 'T', name: 'T – Temiz: hattın dibinde ama altında', color: '#2a9d8f',
        start: { x: 440, y: 524, h: 340 }, v0: 2,
        segs: [
          { mode: 'hold', h: 340, dur: 27.5, speed: 0.05, turn: 0 },
          { mode: 'closehauled', tack: 'starboard', dur: 8.5, turn: 0.8 }
        ] }
    ],
    crowd: [{ slot: 0.1 }, { slot: 0.68 }, { slot: 0.82 }, { slot: 0.94 }, { slot: 0.1, row: 1 }, { slot: 0.68, row: 1 }],
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
    category: 'İleri Taktik', topic: 'Start',
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
      { id: 'X', name: 'X – Doğru: dışarıda bekle, apaz gel, layline\'ın üstünde tramola', color: '#2a9d8f',
        start: { x: 140, y: 530, h: 15 }, v0: 2,
        segs: [
          { mode: 'hold', h: 15, dur: 9, speed: 0.05, turn: 0, note: 'Pin\'in solunda bekliyor' },
          { mode: 'heading', h: 92, dur: 5.2, turn: 1.0, note: 'Apaz: hattın altından grubun dibine' },
          { mode: 'hold', h: 325, dur: 8.3, speed: 0.03, turn: 1.3, note: 'Tramola → layline üstü, boşluk benim' },
          { mode: 'closehauled', tack: 'starboard', dur: 14, turn: 0.8 }
        ] },
      { id: 'Z', name: 'Z – HATA: layline\'ın altında tramola', color: '#e76f51',
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
      { id: 'Y', name: 'Y – HATA: geç geldi, boşluk kapandı', color: '#c77dff',
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
    category: 'İleri Taktik', topic: 'Start',
    title: 'İA2 · Hat yayı: pin tarafından hattı gör, ortada herkesten yukarı dur',
    summary: 'Uzun hatlarda filo ortaya doğru hattan uzaklaşır: hat yayı (line sag). Kimse hattı göremez, herkes komşusuna göre durur. Pin tarafından hakem botuna bakan tekne yayı görür; vakti varsa hattın altından ortaya gelir, bir boşluğa komşularından YUKARI (hatta yakın) yerleşir ve sinyalde 1-2 boy önde çıkar. Yay yoksa: herhangi bir boşluğa, herkesle aynı hizada.',
    duration: 32,
    baseSpeed: 40, tau: 1.0, goBefore: 2.5,
    clockScale: 3,
    wind: 0,
    line: { pin: { x: 200, y: 440 }, boat: { x: 800, y: 440 } },
    startAt: 24,
    rungs: { boat: 'S', from: 24.5 },
    sightline: { from: 0, to: 9, label: 'Transit: pin\'den hakem botuna bak — hat burada' },
    boats: [
      { id: 'S', name: 'S – Yayı gören: ortada herkesten yukarı', color: '#2a9d8f',
        start: { x: 115, y: 575, h: 25 }, v0: 2,
        segs: [
          { mode: 'hold', h: 25, dur: 7, speed: 0.05, turn: 0, note: 'Pin tarafından hatta bakıyor' },
          { mode: 'heading', h: 90, dur: 6.9, turn: 1.0, note: 'Apaz: hattın altından ortaya' },
          { mode: 'heading', h: 35, dur: 2.3, turn: 1.0, speed: 1, note: 'Boşluğa gir, komşulardan YUKARI' },
          { mode: 'hold', h: 340, dur: 6.3, speed: 0.04, turn: 1.0, note: 'Hattı biliyorum: 1 boy geride' },
          { mode: 'closehauled', tack: 'starboard', dur: 9.5, turn: 0.8 }
        ] }
    ],
    // yay: uçlar hatta yakın, orta 2.5-3 boy geride
    crowd: [
      { slot: 0.10, back: 0 }, { slot: 0.20, back: 30 }, { slot: 0.30, back: 95 }, { slot: 0.40, back: 130 },
      { slot: 0.50, back: 145 }, { slot: 0.60, back: 135 }, { slot: 0.69, back: 95 }, { slot: 0.76, back: 50 }, { slot: 0.87, back: 0 }
    ],
    steps: [
      { t: 0, title: 'Start\'a 72 sn: pin tarafından hatta bak', text: 'Yeşil S pin\'in dışında, hattın hizasında duruyor ve hakem botuna bakıyor: pin ile hakem botunu aynı hizaya getirince hat tam olarak görünür (transit). Gördüğü şey: uçlardaki tekneler hatta yakın, ortadakiler 2-3 boy geride. Bu bir hat yayı (line sag).' },
      { t: 3.5, title: 'Yay neden oluşur?', text: 'Uzun hatta ortadaki tekne hattı göremez; iki ucu birden hizalayamaz. Herkes komşusuna göre durur, her komşu biraz geri kalır; orta kayar. Yayı yalnızca hattı GÖREN bilir: uçtan bakan ya da kıyıda transit alan.' },
      { t: 7, title: 'Vakit var: hattın altından ortaya', text: 'S yelkenini doldurup apaz ile hattın altından, uçtaki teknelerin altından ortaya doğru gidiyor. İskele kontrada: herkese yol verir (Kural 10). Ortaya giderken filonun rüzgar gölgesine girer, hızı düşer: bunu zamanına ekle.' },
      { t: 12, title: 'Hangi boşluk, ne zaman?', text: 'Hedef: yayın derinleştiği yerde, iki teknenin arasında bir boşluk. Zamanı öyle ayarla ki 45-50 sn kala orada ol: daha erken gelirsen sürüklenirsin, daha geç gelirsen boşluk kapanır. Kargaşanın içinde değil, uzaktan planla.' },
      { t: 14, title: 'Boşluğa gir ama YUKARI dur', text: 'S boşluğa giriyor ama komşuları gibi 3 boy geride değil, hattın 1 boy altında duruyor. Komşulara göre "öne çıkmış" görünür; aslında hattın doğru yerindedir. Bunun için hattı gerçekten biliyor olman lazım: transit şart.' },
      { t: 17.5, title: 'Yerini koru, hattı kontrol et', text: 'Rüzgara baş vermiş bekliyor; rüzgaraltında boşluğu var. Son 30 sn\'de transiti bir kez daha kontrol et: pin ile hakem botu hizası nerede, burnun ona göre nerede?' },
      { t: 21.5, title: '2.5 sn kala doldur', text: 'Komşular 3 boy geriden hızlanacak; S 1 boydan. Sinyalde S hatta, onlar değil.' },
      { t: 24, title: 'START: 2 boy önde, temiz hava', text: 'S tam hatta, tam hızda. Ortadaki tekneler 2-3 saniye sonra geçecek. Basamak çizgisi farkı gösteriyor. Üstelik S\'nin rüzgarüstünde kimse yok: temiz hava.' },
      { t: 28, title: 'Yay yoksa?', text: 'Hatta baktın, yay yok: herkes hattın dibinde. O zaman "yukarı durmak" diye bir şey yok: herhangi bir boşluğa, herkesle aynı hizada dur; zamanlamaya ve rüzgaraltı boşluğuna odaklan. Her iki durumda da kural aynı: kargaşadan uzak dur, uzaktan bak, planla, son dakikada gir.' }
    ],
    addBoat: { pin: { x: 290, y: 560 }, middle: { x: 500, y: 560 }, committee: { x: 720, y: 560 } },
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
      { id: 'S', name: 'Sancak kontra (hak sahibi)', color: '#2a9d8f',
        start: { x: 760, y: 620, h: 315 }, v0: 55,
        segs: [{ mode: 'closehauled', tack: 'starboard', dur: 14, turn: 0 }] },
      { id: 'P', name: 'İskele kontra (yol verir)', color: '#e76f51',
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
      { id: 'T', name: 'Tramola atan', color: '#2a9d8f',
        start: { x: 680, y: 650, h: 315 }, v0: 20,
        segs: [
          { mode: 'closehauled', tack: 'starboard', dur: 10, turn: 0 },
          { mode: 'closehauled', tack: 'port', dur: 12, turn: 1.5 },
          { mode: 'closehauled', tack: 'starboard', dur: 16, turn: 1.5 }
        ] },
      { id: 'K', name: 'Devam eden', color: '#e76f51',
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
      { id: 'I', name: 'İçteki (şamandıra yeri hakkı)', color: '#2a9d8f',
        start: { x: 830, y: 460, h: 315 }, v0: 40,
        segs: [
          { mode: 'closehauled', tack: 'starboard', dur: 9.3, turn: 0 },
          { mode: 'heading', h: 250, dur: 1.4, turn: 1.4 },
          { mode: 'run', tack: 'starboard', dur: 6.8, turn: 1.8 }
        ] },
      { id: 'O', name: 'Dıştaki (yer verir)', color: '#e76f51',
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

  global.SCENARIOS = S;
})(typeof window !== 'undefined' ? window : globalThis);
