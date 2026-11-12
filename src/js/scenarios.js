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
      { id: 'A', name: 'A – Orsa şamandırası ucu', color: '#e4572e',
        start: { x: 300, y: 612, h: 330 },
        segs: [
          { mode: 'closehauled', tack: 'starboard', dur: 5, turn: 0 },
          { mode: 'closehauled', tack: 'port', dur: 8, turn: 1.5 }
        ], v0: 48 },
      { id: 'B', name: 'B – Hakem botu ucu', color: '#1f77b4',
        start: { x: 700, y: 612, h: 330 },
        segs: [{ mode: 'closehauled', tack: 'starboard', dur: 13, turn: 0 }], v0: 48 }
    ],
    steps: [
      { t: 0, title: 'Aynı anda start', text: 'A ve B start sinyalinde aynı anda, aynı hızla, sancak kontra orsa çıkıyor. Rüzgar 15° sağdan (hakem botu tarafından) geliyor; çizgi ise yatay. Yani hakem botu ucu rüzgara daha yakın.' },
      { t: 1.5, title: 'Merdiven basamağı', text: 'Kesikli çizgi rüzgara DİK bir "merdiven basamağı"dır. Rüzgara karşı yarışta kim önde sorusunun cevabı bu çizgidir: B\'nin basamağı A\'nın önünde. A çizgiye dik ilerlediği hâlde B\'nin gerisindedir.' },
      { t: 5, title: 'A tramola atıyor', text: 'A iskele kontraya tramola atıp B\'ye doğru gidiyor. Gerçekten geride mi? Kural 10 gereği iskele kontralı A, sancak kontralı B\'ye yol vermek zorunda; zaten onun arkasından geçecek.' },
      { t: 10, title: 'Sonuç', text: 'A, B\'nin kıç tarafından geçiyor. Farkın tek sebebi start çizgisinin avantajlı ucu. Start öncesi mutlaka ölçün: rüzgara karşı durup çizgiye bakın; burnunuzun gösterdiği tarafın GERİSİNDE kalan uç avantajlıdır. Pratik yol: çizgi boyunca gidip her iki uca aynı kontrada seyredin; hangisi daha orsa (rüzgara yakın) gidiyorsa o uç avantajlıdır.' }
    ],
    addBoat: { pin: { x: 400, y: 612 }, middle: { x: 500, y: 612 }, committee: { x: 620, y: 612 } }
  });

  // ---------- A2: Zamanlama ve hızlanma ----------
  S.push({
    id: 'a2-timing',
    category: 'Taktik', topic: 'Start',
    title: 'A2 · Zamanlama: bekleme, hızlanma, erken/geç start',
    summary: 'İyi start = sinyal anında çizgide, tam hızda ve temiz havada olmak. Bunun için çizginin gerisinde "bekleyip" sinyalden ~5 saniye önce bordalayıp hızlanmak gerekir.',
    duration: 30,
    baseSpeed: 55,
    wind: 0,
    line: { pin: { x: 250, y: 420 }, boat: { x: 750, y: 420 } },
    startAt: 20,
    boats: [
      { id: 'D', name: 'Doğru zamanlama', color: '#2a9d8f',
        start: { x: 660, y: 640, h: 290 }, v0: 25,
        segs: [
          { mode: 'heading', h: 290, dur: 6, speed: 0.5, turn: 0 },      // çizgiye paralel yaklaşma
          { mode: 'hold', h: 340, dur: 10.1, speed: 0.1, turn: 1.0 },   // orsalayıp bekleme
          { mode: 'closehauled', tack: 'starboard', dur: 13.9, turn: 1.0 } // ~5 sn kala bordala, hızlan
        ] },
      { id: 'E', name: 'Erken (OCS)', color: '#e76f51',
        start: { x: 640, y: 560, h: 340 }, v0: 5,
        segs: [
          { mode: 'hold', h: 340, dur: 12, speed: 0.1, turn: 0 },
          { mode: 'closehauled', tack: 'starboard', dur: 8, turn: 1.0 },   // çok erken bordaladı
          { mode: 'heading', h: 150, dur: 3.6, turn: 1.6 },                 // geri dönüp çizginin altına
          { mode: 'closehauled', tack: 'starboard', dur: 6.4, turn: 1.6 }
        ] },
      { id: 'G', name: 'Geç kalan', color: '#8d99ae',
        start: { x: 330, y: 620, h: 340 }, v0: 5,
        segs: [
          { mode: 'hold', h: 340, dur: 19.5, speed: 0.1, turn: 0 },
          { mode: 'closehauled', tack: 'starboard', dur: 10.5, turn: 1.0 }
        ] }
    ],
    steps: [
      { t: 0, title: 'Start\'a 20 sn', text: 'Yeşil tekne çizgiye paralel, yarım hızla, sancak kontra geliyor. Gri tekne yerini almış bekliyor; turuncu tekne de bekliyor.' },
      { t: 6, title: 'Bekleme (hold)', text: 'Yeşil tekne orsalayarak (burnu rüzgara yakın, yelken boş) neredeyse duruyor. Yelkenin "sallanması" boş yelken demektir. Burada amaç çizginin ~4-5 tekne boyu gerisinde yerinizi korumaktır.' },
      { t: 12, title: 'Turuncu çok erken bordaladı', text: 'Turuncu 8 saniye kala hızlanmaya başladı. Yarım hızda bile 10 saniyede çizgiyi geçer.' },
      { t: 16.1, title: '4 sn kala: bordala ve hızlan!', text: 'Yeşil tekne orsadan bordalayıp yelkeni dolduruyor. Küçük bir tekne tam hıza ~4-6 saniyede çıkar; bu yüzden hızlanma, start sinyalinden ÖNCE başlamalı.' },
      { t: 18, title: 'Turuncu çizgiyi geçti: OCS', text: 'Start sinyalinden önce çizgiyi geçen tekne "OCS"dir (On Course Side). Geri dönüp çizginin start tarafından yeniden geçmek zorunda (I bayrağı varsa uçlardan dolaşmalı). Kaybettiği süre 10-15 saniye; filo gitmiş olur.' },
      { t: 20.2, title: 'START', text: 'Yeşil tekne tam bu anda, tam hızla çizgide. Gri tekne ise hızlanmaya yeni başlıyor: çizgiyi 3-4 saniye sonra, yavaş geçecek ve öndekilerin rüzgar gölgesinde kalacak.' },
      { t: 25, title: 'Sonuç', text: 'İyi start için formül: zaman–mesafe hissi (kaç saniyede kaç tekne boyu?), çizginin gerisinde güvenli bekleme, ve sinyalden ~5 sn önce tam hıza çıkma. Antrenmanda 1 dakikalık "box start" ve "kaç saniyede çizgiye varırım" egzersizleri yapın.' }
    ],
    addBoat: { pin: { x: 290, y: 560 }, middle: { x: 390, y: 640 }, committee: { x: 720, y: 560 } },
    // hat üstünde boş geçiş noktaları (0 = pin, 1 = hakem botu); scripted tekneler ~0.16 / 0.42 / 0.78'de
    startSlots: { pin: [0.28], middle: [0.54], committee: [0.86] }
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
