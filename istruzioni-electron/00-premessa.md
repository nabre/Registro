# Premessa — da leggere prima di ogni fase

Da estensione VS Code ad app desktop Electron.
Progetto: `Registro docenti`, cartella `…/Registro/extension`.

Questo file non contiene lavoro da fare. Contiene il principio, le regole e la
mappa. **Va riletto all'inizio di ogni fase**, perché ogni file di fase dà per
acquisito quel che c'è scritto qui.

---

## 1. Il principio

Non si riscrive l'estensione. **Si sostituisce l'host.**

Oggi il codice gira dentro l'extension host di VS Code, che è a sua volta un
processo Node di un'applicazione Electron. Domani gira dentro il *main process*
di un'applicazione Electron nostra. Il codice in mezzo è lo stesso.

Il meccanismo è un **alias di build**: per il target desktop, esbuild risolve il
modulo `vscode` su un file nostro invece che sull'API dell'editor.

```js
alias: { vscode: './src/ambiente/vscode-desktop.ts' }
```

Conseguenza da tenere ferma per tutto il lavoro: **i 26 file che scrivono
`import * as vscode from 'vscode'` non si toccano.** Non si cambiano gli import,
non si sostituiscono le chiamate, non si "modernizza" niente. Se una funzione del
registro non funziona sul desktop, il difetto sta nello shim, non nel chiamante.

Ogni volta che viene la tentazione di modificare un file di `src/dati` o
`src/azioni`, fermarsi: quasi sempre significa che manca un pezzo di
`src/ambiente/`. Le eccezioni autorizzate sono tre, elencate al §5.

## 2. Corrispondenza fra i due mondi

| VS Code (oggi) | Electron (domani) |
|---|---|
| extension host (processo Node) | main process |
| `activate(contesto)` | `app.whenReady()` |
| `deactivate()` | `before-quit` |
| webview del pannello | `BrowserWindow` principale |
| webview della proiezione | seconda `BrowserWindow` |
| `webview.postMessage` | `webContents.send` → `window.postMessage` nel preload |
| `webview.onDidReceiveMessage` | `ipcMain.on` |
| `asWebviewUri` | protocollo custom `registro://` |
| `workspaceFolders[0]` | una cartella scelta dall'utente e ricordata |
| impostazioni `registroDocenti.*` | un JSON in `app.getPath('userData')` |
| `SecretStorage` | `safeStorage` + un JSON in `userData` |
| `src/protocollo.ts` | **identico, non si tocca** |
| `src/dominio/**` | **identico, non si tocca** |
| `src/webview/**` | **identico, non si tocca** (salvo la fase 7) |

## 3. Regole di lavoro (vincolanti)

1. **Un ramo dedicato.** Se la cartella è un repo git: `git switch -c desktop`. Se
   non lo è, inizializzarlo e fare un commit dello stato attuale prima di toccare
   qualunque cosa. Non si comincia senza una via di ritorno.
2. **Il `.vsix` deve continuare a funzionare.** Alla fine di *ogni* fase:
   `npm run controllo-tipi`, `npm test` e `npm run pacchetto` devono passare, e il
   pacchetto prodotto deve restare installabile. Il target desktop è un'aggiunta,
   non un rimpiazzo.
3. **Un commit per fase**, con un messaggio che dice che cosa la fase rende
   possibile, non che cosa tocca.
4. **Niente `any`, niente `@ts-ignore`.** `tsconfig.json` è in `strict` con
   `noUnusedLocals` e `noUnusedParameters`: resta così. Se un tipo di
   `@types/vscode` non si riesce a soddisfare, si dichiara nello shim solo la
   parte che serve davvero, tipizzata a mano — non si allarga la maglia.
5. **Lo stile del progetto va rispettato**, ed è marcato: identificatori in
   italiano (`cartellaDati`, `smaltibili`, `portachiavi`), commenti che spiegano
   *perché* una cosa è fatta così e non che cosa fa la riga sotto, niente punto e
   virgola a fine riga, apici singoli, due spazi di indentazione. Leggere
   `src/dati/percorsi.ts` e `src/pannello.ts` prima di scrivere una riga: sono il
   metro.
6. **Non riformattare file esistenti.** Nessun passaggio di prettier
   sull'esistente. I diff devono restare leggibili.
7. **Non toccare `src/dominio/`.** È logica pura, coperta dai test in `test/`, e
   non sa nulla né di VS Code né di Electron. Se sembra necessario modificarla, è
   quasi certo un errore di analisi.
8. **Una fase alla volta.** Non anticipare il lavoro di quelle successive, anche
   quando sembra a portata di mano: i criteri di accettazione sono scritti per
   essere verificati su un perimetro chiuso.
9. **Se una cosa non è chiara, chiedere invece di indovinare.**

## 4. Come sarà fatto il progetto alla fine

```
extension/
  src/
    ambiente/                   ← NUOVO: lo shim, cioè il modulo 'vscode' del desktop
      vscode-desktop.ts           il barile che riesporta tutto
      uri.ts                      Uri, RelativePattern
      eventi.ts                   EventEmitter, Disposable, CancellationTokenSource
      fs.ts                       workspace.fs, FileType, FileSystemError
      impostazioni.ts             workspace.getConfiguration + onDidChangeConfiguration
      segreti.ts                  SecretStorage su safeStorage
      finestre.ts                 createWebviewPanel su BrowserWindow
      dialoghi.ts                 showInformationMessage, showInputBox, showQuickPick…
      comandi.ts                  registerCommand / executeCommand
      osservatore.ts              createFileSystemWatcher su chokidar
      autenticazione.ts           authentication.*
      contesto.ts                 ExtensionContext
      inerti.ts                   TreeItem, ThemeIcon, StatusBarItem: forme vuote
    …                           tutto il resto invariato
  desktop/                      ← NUOVO: il guscio Electron
    principale.ts                 main process: avvio, finestre, ciclo di vita
    preload.ts                    espone acquireVsCodeApi() al renderer
    protocolloFile.ts             il gestore dello schema registro://
    menu.ts                       menu dell'applicazione e scorciatoie
    dialogo.html                  la pagina del dialogo generico
    impostazioni.html             la pagina delle impostazioni
  dist/                         il .vsix, come oggi
  dist-desktop/                 ← NUOVO: i bundle dell'app
```

## 5. Le tre modifiche a file esistenti che sono autorizzate

Tutto il resto è vietato senza chiedere.

1. **`src/dati/oauth.ts` riga ~379** — il testo dell'URI di reindirizzamento
   mostrato all'utente (fase 5). È una stringa, non logica.
2. **`src/dati/archivio.ts`** — solo se l'osservatore chokidar provoca ricariche a
   ogni salvataggio (fase 3), e solo per rinforzare la difesa che c'è già.
3. **`package.json`** — script, `author`, dipendenze. Non toccare `contributes`,
   `engines`, `main`, `publisher`.

Se ne serve una quarta: **fermarsi e chiedere.** Nove volte su dieci significa che
manca un pezzo di `src/ambiente/`, e aggiustare il chiamante invece dello shim
rompe il `.vsix` in un modo che si scopre settimane dopo.

## 6. Prove

I test esistenti (`test/*.test.mjs`) girano su `src/dominio` e su
`src/dati/pdf.ts` e **non vanno toccati**: sono la rete che dice che la migrazione
non ha rotto la logica. Devono restare verdi a ogni commit.

I test nuovi per lo shim sono indicati nelle singole fasi. Per provare lo shim
senza avviare un'applicazione, aggiungere in `esbuild.mjs` la possibilità di
sostituire il modulo `electron` con un finto.

**Le quattro prove manuali**, da rifare per intero prima di dichiarare finita
qualunque fase dalla 2 in poi:

1. Aprire l'app su una cartella che contiene già un registro vero e verificare che
   non cambi **nessun** file all'apertura (`git status` sulla cartella dei dati, se
   è sotto git).
2. Creare una lezione, chiudere l'app **dalla X**, riaprire: la lezione c'è.
3. Aprire la proiezione, spostarla sul secondo schermo, chiudere il pannello:
   anche la proiezione si chiude.
4. Aprire lo stesso registro con il `.vsix` in VS Code e con l'app desktop, uno
   dopo l'altro: devono vedere gli stessi dati, e **nessuno dei due deve migrare
   niente**.

Il punto 4 è il più importante di tutti: è la prova che il formato dei dati è
rimasto uno solo. Se fallisce, il difetto è grave e sta a monte — va risolto prima
di andare avanti, non aggirato.

## 7. Le fasi

| File | Fase | Rende possibile |
|---|---|---|
| `01-fondamenta.md` | Lo shim | il target desktop compila |
| `02-finestre.md` | Le finestre | l'app si apre e il registro si usa |
| `03-dialoghi-comandi-osservatori.md` | L'interazione | i comandi che chiedono qualcosa funzionano |
| `04-menu-e-impostazioni.md` | Menu e impostazioni | tutto è raggiungibile e configurabile |
| `05-posta.md` | La posta | si collega la casella e parte una comunicazione |
| `06-impacchettare.md` | L'installer | l'app si installa su una macchina pulita |
| `07-albero-e-barra.md` | Albero e barra di stato | la navigazione laterale torna (dopo il rilascio) |
| `08-accesso-microsoft.md` | OAuth come si deve | l'accesso smette di essere scomodo (opzionale) |

Le fasi 1-6 sono in sequenza stretta. La 7 va fatta **dopo** che qualcuno ha usato
l'app per una settimana. La 8 solo se la 5 ha mostrato che serve.
