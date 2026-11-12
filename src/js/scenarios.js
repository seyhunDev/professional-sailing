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
    crowd: [410, 480, 545, 590].map((x, i) => ({ pos: { x, y: 614 + (i % 2) * 6 }, tack: 'starboard', v0: 48 }))
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
          { mode: 'hold', h: 340, dur: 12, speed: 0.05, turn: 0 },
          { mode: 'closehauled', tack: 'starboard', dur: 8, turn: 0.8 },   // 8 s kala doldurdu: çok erken
          { mode: 'heading', h: 125, dur: 4.4, turn: 1.6 },                 // geri dönüp çizginin altına
          { mode: 'closehauled', tack: 'starboard', dur: 3.6, turn: 1.6 }
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
      { slot: 0.30, row: 1 }, { slot: 0.42, row: 1 }
    ],
    steps: [
      { t: 0, title: 'Start\'a 20 sn: filo hattın dibinde', text: 'Gri tekneler hattın 1-1.5 boy gerisinde rüzgara baş vermiş, yelkenleri boş bekliyor. Aralarında boşluklar var: boşluk, hızlanma alanıdır. Yeşil tekne yarım hızla yerine geliyor.' },
      { t: 4, title: 'Yerini al, rüzgara baş ver', text: 'Yeşil tekne de hattın dibinde durdu. Burnu rüzgara yakın, yelken boş ("sallanıyor"). Küçük teknede bekleme burada yapılır: hattan uzakta değil, hemen gerisinde. Rüzgaraltınızdaki boşluğu koruyun; biri sokulursa orsa edip kapatın (Kural 11).' },
      { t: 12, title: 'Turuncu çok erken doldurdu', text: 'Turuncu 8 saniye kala yelkenini doldurdu. Küçük tekne 2-3 saniyede tam hıza çıkar; 8 saniye çok fazla, çizgiyi sinyalden önce geçecek.' },
      { t: 15, title: 'Turuncu çizgiyi geçti: OCS', text: 'Start sinyalinden önce çizgiyi geçen tekne OCS\'dir. Geri dönüp çizginin start tarafından yeniden geçmek zorunda (I bayrağı varsa uçlardan dolaşarak). 10-15 saniye kayıp.' },
      { t: 16.5, title: '3.5 sn kala: doldur ve hızlan', text: 'Yeşil tekne bordalayıp yelkeni dolduruyor. Filo da 2.5 s kala dolduruyor. Küçük teknede hızlanma kısa sürer; bu yüzden bekleme hattın dibinde, hızlanma son 2-3 saniyedir.' },
      { t: 20, title: 'START', text: 'Yeşil tekne tam bu anda, tam hızla çizgide; filo da birlikte çıkıyor. Gri tekne hâlâ bekliyor: çizgiyi 2 saniye sonra, yavaş geçecek ve öndekilerin rüzgar gölgesinde kalacak.' },
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
