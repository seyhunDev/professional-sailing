# Bildirim testleri

Uygulamadaki **Bildir** düğmesiyle gelen bir bildirim bir hatayı gösteriyorsa, düzeltmeden sonra bildirimin
`.json` dosyası (ya da GitHub konusunun metni, `.md`) buraya konur. `npm run check` her seferinde yarışı bildirimdeki
kurulum ve işlemlerden yeniden kurar ve hata avcısından geçirir: aynı hata geri gelirse yayın durur.

Okumak için: `node scripts/report.mjs <dosya>`
