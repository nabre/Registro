# Fase 3 — Dialoghi, comandi, osservatori

**Rende possibile:** tutto quel che nel registro chiede qualcosa all'utente, e
tutto quel che reagisce ai file che cambiano.

> Leggere `00-premessa.md` prima di cominciare.

---

## Prerequisiti

- Le fasi 1 e 2 sono chiuse e verificate.
- Leggere `src/estensione.ts` righe 120-330 (i comandi che usano `showInputBox` e
  `showQuickPick`), `src/dati/smistatore.ts` righe 218-300 (l'osservatore della
  cassetta) e `src/dati/archivio.ts` righe 725-760 (l'osservatore dei dati e la
  difesa contro l'eco).

## Perimetro

**Si crea:** `src/ambiente/dialoghi.ts`, `src/ambiente/comandi.ts`,
`src/ambiente/osservatore.ts`, `desktop/dialogo.html`.
**Si modifica:** nulla di esistente — **con una sola eccezione condizionata**,
descritta al §3.

---

## 1. `src/ambiente/dialoghi.ts`

| API | Implementazione |
|---|---|
| `showInformationMessage` / `showWarningMessage` / `showErrorMessage` | `dialog.showMessageBox` con il `type` corrispondente; i bottoni sono i parametri variadici; la promessa risolve con l'etichetta scelta o `undefined` |
| con `{ modal: true, detail }` | `dialog.showMessageBox` con `detail` e finestra padre |
| `showOpenDialog(opzioni)` | `dialog.showOpenDialog`, `filters` dai `filters` di VS Code |
| `showTextDocument(uri)` | `shell.openPath(uri.fsPath)` |
| `withProgress(opzioni, compito)` | esegue il compito, instradando `progress.report` sul canale `lavoro` del webview se il pannello è aperto |

Su `showTextDocument`: sul desktop non c'è un editor dove aprire un file, e
aprirlo con il programma di sistema è quel che l'utente si aspetta davvero. Lo
usano `azioni/sistema.ts` in tre punti, su file esportati.

### La finestra di dialogo generica

`showInputBox` e `showQuickPick` non hanno un equivalente in Electron: vanno
costruiti. **Un solo file, `desktop/dialogo.html`, e una sola finestra generica**
parametrizzata dal tipo (`messaggio` / `input` / `elenco`), servita dal protocollo
`registro://`, modale sulla finestra principale, `resizable: false`, chiusa da
Esc, che risponde via `ipcMain.handleOnce`.

Requisiti che il registro dà per scontati e che vanno rispettati:

- **`validateInput` gira a ogni tasto**, e il bottone di conferma resta spento
  finché il messaggio di errore non è nullo. Il registro la usa per le date
  `AAAA-MM-GG` in quattro punti di `estensione.ts`: senza validazione dal vivo,
  l'errore si scopre solo dopo aver premuto Invio, e la si riscrive da capo.
- **I segnaposto di icone vanno tolti.** Le etichette di `showQuickPick`
  contengono `$(add)`, `$(copy)` — vedi `estensione.ts` riga ~200, «piano per
  questa lezione». Vanno rimossi con una regex prima di mostrarli, o l'utente
  legge «$(copy) Piano di matematica».
- `showQuickPick` mostra `label` e `description`, su due righe.
- **Annullare risolve con `undefined`, mai con un rifiuto.** Esc, la X, il bottone
  Annulla: tutti. Tutto il codice chiamante fa `if (!scelta) return`, e una
  promessa rifiutata farebbe cadere l'azione con un errore che l'utente non
  capisce.

## 2. `src/ambiente/comandi.ts`

`registerCommand(nome, f)` mette in una mappa e restituisce un `Disposable`.
`executeCommand(nome, ...argomenti)` cerca nella mappa, e conosce a parte i
comandi di VS Code che il registro invoca:

| Comando VS Code | Sul desktop |
|---|---|
| `revealFileInOS` | `shell.showItemInFolder(uri.fsPath)` |
| `workbench.action.moveEditorToNewWindow` | niente: la proiezione **è già** una finestra a sé |
| `workbench.action.toggleFullScreen` | `finestraDellaProiezione.setFullScreen(true)` |
| `vscode.open`, se presente | `shell.openPath` |

Un comando sconosciuto non deve far cadere niente: registrarlo sulla console e
risolvere con `undefined`.

### La proiezione

In `pannelloProiezione.ts` l'impostazione `proiezione.finestraSeparata` perde
senso: sul desktop la proiezione è sempre una finestra a sé. Lasciare
l'impostazione — il `.vsix` la usa ancora — e farla ignorare allo shim, con un
commento che dice perché.

`proiezione.schermoIntero` invece resta viva, e **finalmente funziona bene**: si
può mandare la finestra sullo schermo giusto con `screen.getAllDisplays()`, e se
ce n'è più d'uno scegliere il secondario. Con VS Code non si poteva fare, e la
descrizione dell'impostazione in `package.json` lo lascia intendere fra le righe.
Questa è la prima cosa che sul desktop diventa migliore, non solo diversa.

## 3. `src/ambiente/osservatore.ts`

`createFileSystemWatcher(new RelativePattern(base, glob))` su `chokidar`, con
`onDidCreate`, `onDidChange`, `onDidDelete` e `dispose`.

I due pattern usati sono `{registro.json,*/dati/*.json}` (in `archivio.ts`) e
`**/*.pdf` (in `smistatore.ts`). chokidar li accetta entrambi in stile glob, ma il
primo va tradotto in un **array di due pattern**: chokidar non gestisce le graffe
come VS Code.

### L'eco delle proprie scritture — l'insidia principale della fase

`archivio.ts`, in `osserva()` (riga ~744), tiene una mappa `ultimeScritture`
chiavata su **`uri.toString()`** e ignora gli eventi arrivati entro
`FINESTRA_ECO_MS` dalla propria scrittura.

Perché la difesa regga, `Uri.toString()` dello shim deve dare la **stessa identica
stringa** per lo stesso file, sia che l'Uri nasca da `joinPath` nel percorso di
scrittura, sia che nasca dal percorso che chokidar consegna nell'evento. È la
regola scritta nella fase 1 §2, e questa è la fase in cui si scopre se è stata
rispettata.

Il sintomo, se non lo è: **il registro si ricarica a ogni salvataggio**.
L'interfaccia sfarfalla, i moduli aperti a metà si azzerano, e la causa non è per
niente ovvia. Da controllare per prime: la lettera di unità su Windows (`C:`
contro `c:`), i separatori, la codifica percentuale dei nomi con spazi e accenti.

**L'eccezione autorizzata:** se anche con un `toString()` canonico la difesa non
regge — chokidar è più loquace di VS Code e può emettere due eventi per una
scrittura — allora si può ritoccare `src/dati/archivio.ts`, per esempio
allargando `FINESTRA_ECO_MS`. È l'unica modifica a un file esistente che questa
fase autorizza, va tenuta minima, e va commentata dicendo perché.

### Un accorgimento da non confondere

`awaitWriteFinish` di chokidar è utile, ma **non sostituisce** `aspettaCheSiFermi`
in `smistatore.ts`, che aspetta che la dimensione del PDF smetta di crescere.
Lasciare quella logica dov'è: risolve un problema diverso (un file copiato
lentamente da una chiavetta) e in modo più adatto.

---

## Test da scrivere in questa fase

- L'osservatore con un `Uri` costruito per due vie diverse: la chiave dell'eco
  deve combaciare.
- La rimozione dei segnaposto `$(…)` dalle etichette.
- La traduzione del pattern con le graffe nell'array di due.

---

## Criterio di accettazione

Dal menu o dalla palette equivalente, funzionano:

- [ ] «nuovo anno scolastico» (due `showInputBox` con validazione della data)
- [ ] «duplica la lezione» (`showInputBox` con valore iniziale)
- [ ] «piano per questa lezione» (`showQuickPick` con icone da ripulire)
- [ ] «elimina la lezione» (`showWarningMessage` modale con bottone)
- [ ] «apri la cartella dei dati» (`revealFileInOS`)
- [ ] un PDF lasciato cadere in `in-arrivo/` viene smistato
- [ ] **salvare una modifica non provoca una ricarica** (la prova dell'eco)
- [ ] la proiezione si apre a schermo intero sul secondo schermo, se c'è
- [ ] `npm run controllo-tipi`, `npm test`, `npm run pacchetto` verdi
- [ ] le quattro prove manuali di `00-premessa.md` §6 passano

