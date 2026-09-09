# Da estensione VS Code ad app desktop Electron — indice

Le istruzioni stanno in `istruzioni-electron/`, un file per fase.

**Non consegnare tutto insieme a Claude Code.** Sono 60'000 righe di codice
esistente, e il rischio che generalizzi male cresce con l'ampiezza del mandato.
Una fase alla volta, verificando i criteri di accettazione prima di passare oltre.
In fondo a ogni file c'è il prompt già scritto da incollare.

---

## Il principio, in tre righe

Non si riscrive l'estensione: si sostituisce l'host. Un alias di esbuild fa
risolvere il modulo `vscode` su un file nostro, e i 26 file che lo importano non
si toccano. `createWebviewPanel` viene reimplementato sopra una `BrowserWindow`,
e questo lascia intatti `pannello.ts`, `pannelloProiezione.ts` e
`webview/ponte.ts`. Una sola base di codice produce sia il `.vsix` sia l'app.

---

## I file

| File | Fase | Rende possibile |
|---|---|---|
| [`00-premessa.md`](istruzioni-electron/00-premessa.md) | — | **Da leggere prima di ogni fase**: principio, regole, mappa, prove |
| [`01-fondamenta.md`](istruzioni-electron/01-fondamenta.md) | Lo shim | il target desktop compila |
| [`02-finestre.md`](istruzioni-electron/02-finestre.md) | Le finestre | l'app si apre e il registro si usa |
| [`03-dialoghi-comandi-osservatori.md`](istruzioni-electron/03-dialoghi-comandi-osservatori.md) | L'interazione | i comandi che chiedono qualcosa funzionano |
| [`04-menu-e-impostazioni.md`](istruzioni-electron/04-menu-e-impostazioni.md) | Menu e impostazioni | tutto è raggiungibile e configurabile |
| [`05-posta.md`](istruzioni-electron/05-posta.md) | La posta | si collega la casella e parte una comunicazione |
| [`06-impacchettare.md`](istruzioni-electron/06-impacchettare.md) | L'installer | l'app si installa su una macchina pulita |
| [`07-albero-e-barra.md`](istruzioni-electron/07-albero-e-barra.md) | Albero e barra di stato | la navigazione laterale torna |
| [`08-accesso-microsoft.md`](istruzioni-electron/08-accesso-microsoft.md) | OAuth come si deve | l'accesso smette di essere scomodo |

Le fasi **1-6** sono in sequenza stretta e portano a un'app rilasciabile.
La **7** va fatta dopo che qualcuno ha usato l'app per una settimana: potrebbe
scoprirsi che l'albero non serviva.
La **8** solo se la 5 ha mostrato che il device-code dà davvero fastidio.

---

## Le tre insidie che costano di più se sfuggono

Sono spiegate al loro posto, ma vale la pena averle in mente da subito.

1. **`Uri.toString()` deve essere canonico** (fase 1 §2, si manifesta alla fase 3).
   `archivio.ts` riconosce l'eco delle proprie scritture confrontando quella
   stringa. Se l'Uri costruito in scrittura e quello che arriva dall'osservatore
   differiscono anche solo per `C:` contro `c:`, il registro si ricarica a ogni
   salvataggio e i moduli aperti si azzerano — con una causa niente affatto ovvia.

2. **`rename` con `overwrite: false` deve fallire davvero** (fase 1 §4).
   `fs.rename` di Node su POSIX sovrascrive in silenzio; `anni.ts` e
   `archiviazione.ts` contano su quel fallimento durante le migrazioni. Uno shim
   ingenuo mangia dati.

3. **`pdf.worker.mjs` va tenuto fuori dall'asar** (fase 6 §1). pdfjs lo carica con
   un `import()` di file URL, che non passa dal `fs` con la patch asar. Il sintomo
   è che lo smistamento dei PDF funziona in sviluppo e non nella versione
   installata.

---

## Le modifiche a file esistenti che sono autorizzate

Nelle fasi 1-6, tre sole:

1. `src/dati/oauth.ts` riga ~379 — una stringa mostrata all'utente (fase 5)
2. `src/dati/archivio.ts` — solo se l'eco non regge, e solo per rinforzare la
   difesa che c'è già (fase 3)
3. `package.json` — script, `author`, dipendenze. Non `contributes`, non `engines`,
   non `main`, non `publisher`

La fase 7 è l'unica che modifica file esistenti in modo sostanziale, ed è previsto.

Se ne serve una quarta: **fermarsi e chiedere.** Nove volte su dieci significa che
manca un pezzo di `src/ambiente/`, e aggiustare il chiamante invece dello shim
rompe il `.vsix` in un modo che si scopre settimane dopo.
