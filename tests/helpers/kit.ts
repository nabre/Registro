// Il meccanismo dello scarico dei corredi, da solo (lo usano le scansioni, ma
// le guardie sono di `kit.ts`). `scarica` e `scompatta` si provano
// dall'ingresso vero: un pacco, una cartella, un sito che risponde piano.
export { scarica, scompatta } from '../../src/data/kit.js'
// Per comporre un archivio vero da dare a `scompatta`: lettore e estrazione
// devono capirsi.
export { scriviZip } from '../../src/data/zip.js'
