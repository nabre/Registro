# Fase 1 — Le fondamenta dello shim

**Rende possibile:** `npm run build:desktop` compila senza errori.
**Non produce ancora:** nessuna finestra, nessuna applicazione avviabile.

> Leggere `00-premessa.md` prima di cominciare. In particolare: i file che
> importano `vscode` non si toccano, `src/dominio/` non si tocca, e alla fine
> `npm run pacchetto` deve ancora produrre un `.vsix` funzionante.

---

## Prerequisiti

Leggere, per prendere le misure dello stile e dei modi del progetto:

- `src/dati/percorsi.ts` — come si scrivono i commenti e come si usano gli `Uri`
- `src/dati/archivio.ts` — l'uso più fitto di `workspace.fs` e degli eventi
- `esbuild.mjs` — la forma delle configurazioni esistenti

## Perimetro

**Si crea:** `src/ambiente/` per intero, e il ramo `--desktop` in `esbuild.mjs`.
**Si modifica:** solo `package.json` (script, `author`, dipendenze) e `esbuild.mjs`.
**Non si tocca:** nient'altro. Nessun file in `src/dati`, `src/azioni`, `src/vista`,
`src/webview`, `src/dominio`.

---

## 1. Dipendenze e script

```
npm i -D electron electron-builder
npm i chokidar
```

`package.json` ha già `description`; aggiungere `author`, che electron-builder
pretende. Non rimuovere `publisher`, `engines.vscode`, `contributes`, `main`:
servono al `.vsix` e electron-builder li ignora.

Nuovi script:

```json
"build:desktop": "node esbuild.mjs --desktop",
"desktop": "npm run build:desktop && electron dist-desktop/principale.cjs",
"pacchetto:desktop": "npm run build:desktop -- --produzione && electron-builder --config electron-builder.json"
```

`desktop` e `pacchetto:desktop` non funzioneranno prima della fase 2 e della
fase 6: si dichiarano adesso perché stiano tutti insieme.

## 2. `src/ambiente/uri.ts`

`Uri` è la struttura più usata del progetto: 98 chiamate a `joinPath`. Deve essere
fedele su quel che il codice usa davvero — `fsPath`, `path`, `scheme`,
`toString()`, `Uri.file`, `Uri.parse`, `Uri.joinPath` — e serve anche
`RelativePattern(base, glob)`, usata da `archivio.ts` e `smistatore.ts`: basta una
classe che tenga `base` e `pattern`.

Punti da non sbagliare:

- **`path` è sempre POSIX**, con `/`, anche su Windows: `nomeDelFileUri` in
  `percorsi.ts` fa `uri.path.split('/').pop()`. Un `Uri` costruito da `C:\x\y`
  deve avere `path === '/C:/x/y'`.
- **`fsPath` è invece il percorso nativo**, con `\` su Windows: è quel che si passa
  a `node:fs`.
- `Uri.joinPath(uri, '..')` deve **normalizzare**: `archiviazione.ts` e `anni.ts`
  lo usano per ottenere la cartella che contiene un file.
- `joinPath` con zero parti restituisce l'uri stesso.

### La regola che decide il buon esito di tutta la migrazione

**`toString()` deve essere stabile e canonico.** Lo stesso file deve dare la
stessa identica stringa, comunque l'Uri sia nato: da `Uri.file`, da `Uri.parse`,
da una catena di `joinPath`, o dal percorso che un osservatore di file consegnerà
in un evento (fase 3).

Ci contano due meccanismi del registro: la difesa contro l'eco delle proprie
scritture in `archivio.ts` (`ultimeScritture`, chiavata proprio su
`uri.toString()`) e la mappa delle risorse del webview.

Da canonicalizzare **una volta sola, nel costruttore**:

- la lettera di unità su Windows, sempre nello stesso caso
- i separatori, sempre `/` dentro `path`
- i `.` e i `..`, risolti
- la codifica percentuale dei segmenti — e qui i nomi contengono spazi e accenti,
  perché sono nomi di classi e di allievi

Se questo dettaglio sfugge, il sintomo (fase 3) è che il registro si ricarica a
ogni salvataggio: l'interfaccia sfarfalla, i moduli aperti a metà si azzerano, e
la causa non è per niente ovvia. **Scrivere il test adesso**, non dopo.

## 3. `src/ambiente/eventi.ts`

`EventEmitter<T>` (con `.event`, `.fire`, `.dispose`), `Disposable` (classe il cui
costruttore prende una funzione, più `Disposable.from`), `CancellationTokenSource`
e `CancellationToken`.

Una cinquantina di righe senza sottigliezze, tranne una: `EventEmitter.event` deve
restituire una **funzione di sottoscrizione che ritorna un `Disposable`**, perché
è così che il progetto la usa dappertutto — `archivio.alCambiamento(...)` finisce
dritto dentro `contesto.subscriptions`.

## 4. `src/ambiente/fs.ts` — il pezzo grosso

Copre 93 usi di `workspace.fs`, sopra `node:fs/promises`.

| API VS Code | Implementazione |
|---|---|
| `readFile(uri)` | `fs.readFile(uri.fsPath)` → `Uint8Array` |
| `writeFile(uri, byte)` | `fs.writeFile` |
| `createDirectory(uri)` | `fs.mkdir(…, { recursive: true })` |
| `readDirectory(uri)` | `fs.readdir(…, { withFileTypes: true })` → `[nome, FileType][]` |
| `stat(uri)` | `fs.stat` → `{ type, ctime, mtime, size }` |
| `rename(da, a, { overwrite })` | `fs.rename`, ma vedi l'insidia 2 |
| `copy(da, a, { overwrite })` | `fs.cp(…, { recursive: true, force })` |
| `delete(uri, { recursive, useTrash })` | `shell.trashItem` se `useTrash`, altrimenti `fs.rm` |

`FileType` è un enum: `Unknown = 0, File = 1, Directory = 2, SymbolicLink = 64`.

### Tre insidie, tutte capaci di rompere il registro in silenzio

1. **`FileSystemError` deve avere il codice giusto.** `archivio.ts`, righe 308 e
   333, fa `errore instanceof vscode.FileSystemError && errore.code === 'FileNotFound'`
   per distinguere «file mai scritto» da «file rotto». Se lo shim lascia passare un
   `ENOENT` grezzo, il registro tratta un file mancante come un errore di lettura e
   mostra un avviso a ogni avvio. Serve una classe `FileSystemError` con `code` fra
   `FileNotFound`, `FileExists`, `NoPermissions`, `FileIsADirectory`, e una
   funzione che traduce i codici di Node (`ENOENT`, `EEXIST`, `EPERM`, `EACCES`,
   `EISDIR`).

2. **`rename` con `overwrite: false` deve fallire davvero se la destinazione
   esiste.** `fs.rename` di Node su POSIX sovrascrive senza dire niente. `anni.ts`
   e `archiviazione.ts` contano su quel fallimento per non perdere file durante le
   migrazioni: se sovrascrive, **la migrazione mangia dati**. Controllare prima con
   `fs.access` e lanciare `FileSystemError('FileExists')`.

3. **`useTrash: true` deve andare davvero nel cestino.** `archivio.ts` lo usa
   quando cancella i dati di un anno, `smistatore.ts` quando toglie un PDF dalla
   cassetta. `shell.trashItem` è asincrona e può fallire (rete, chiavetta): in quel
   caso ripiegare su `fs.rm` senza propagare l'errore — è quel che fa VS Code.

## 5. `src/ambiente/impostazioni.ts`

Le impostazioni vivono in `<userData>/impostazioni.json`, con le chiavi piatte e
puntate esattamente come in `package.json` (`registroDocenti.posta.mittente`).

`getConfiguration(sezione)` restituisce un oggetto con `get(chiave, ripiego)`,
`update(chiave, valore, target)`, `has`, `inspect`.

- **I valori predefiniti si leggono da `package.json`**, non si riscrivono a mano:
  `contributes.configuration.properties`, importato a build time da esbuild come
  JSON. Duplicarli significa che fra un anno i due elenchi divergono, e la
  divergenza si scopre da un comportamento diverso fra `.vsix` e app.
- `ConfigurationTarget.Global`, `.Workspace` e `.WorkspaceFolder` scrivono tutti e
  tre nello stesso file: sul desktop la distinzione non esiste. **Scriverlo in un
  commento**, perché è una semplificazione voluta e non una dimenticanza.
- `onDidChangeConfiguration` emette un evento con `affectsConfiguration(prefisso)`
  che confronta per prefisso puntato. Lo usano `estensione.ts` (per `cartellaDati`)
  e `pannello.ts` (per `ocr`): devono continuare a scattare.
- **Scrittura atomica**: file temporaneo e `rename`. È lo stesso accorgimento che
  `archivio.ts` usa già per i JSON del registro, e per la stessa ragione.

### Due impostazioni cambiano di significato

- `registroDocenti.cartellaDati` resta relativa, ma alla *cartella di lavoro*
  scelta dall'utente (fase 2), non più alla radice del workspace.
- `registroDocenti.posta.autenticazione` **non può valere `vscode`** sul desktop:
  quel modo passa dall'account di VS Code, che qui non c'è. Il predefinito del
  target desktop è `oauth`, e se il file contiene `vscode` — perché l'utente arriva
  dal `.vsix` — va letto come `oauth`.

## 6. `src/ambiente/segreti.ts`

`SecretStorage` con `get`, `store`, `delete`, `onDidChange`, sopra
`safeStorage.encryptString` / `decryptString`, in `<userData>/segreti.json` (base64
dei buffer cifrati).

Se `safeStorage.isEncryptionAvailable()` è falso — capita su Linux senza
portachiavi — **non scrivere in chiaro**. `get` restituisce `undefined` e `store`
lancia un errore leggibile: «il portachiavi del sistema non è disponibile: la
password della casella non può essere salvata». Scrivere in chiaro la password
della casella scolastica sarebbe peggio che non salvarla.

## 7. `src/ambiente/inerti.ts`

`TreeItem`, `TreeItemCollapsibleState`, `ThemeIcon`, `MarkdownString`,
`StatusBarAlignment`, `ViewColumn`, `ProgressLocation`, `Command`.

Servono perché `vista/alberoRegistro.ts` e `vista/barraStato.ts` vengono comunque
compilati. Sono strutture dati, e sul desktop nessuno le guarda ancora:
implementazioni minime, con un commento che dice che diventeranno vere alla fase 7.

## 8. Il barile e l'alias

`src/ambiente/vscode-desktop.ts` riesporta tutto nella forma che i chiamanti si
aspettano: gli oggetti `workspace`, `window`, `commands`, `env`, `authentication`,
e le classi `Uri`, `Disposable`, `EventEmitter`, `FileSystemError`,
`RelativePattern`, `TreeItem`, `ThemeIcon`, `MarkdownString`, più gli enum.

In questa fase le parti non ancora scritte (`window.createWebviewPanel`,
i dialoghi, `commands.executeCommand`) esistono come funzioni che lanciano
`new Error('non ancora implementato: fase N')`. Meglio un errore esplicito al
primo uso che un `undefined` che si propaga.

In `esbuild.mjs`, ramo `--desktop`, con
`alias: { vscode: './src/ambiente/vscode-desktop.ts' }` (esbuild ≥ 0.17 lo
supporta nativamente; qui c'è la 0.24).

| Uscita | Entrata | Formato |
|---|---|---|
| `dist-desktop/principale.cjs` | `desktop/principale.ts` | cjs, node, `external: ['electron']` |
| `dist-desktop/preload.cjs` | `desktop/preload.ts` | cjs, node, `external: ['electron']` |
| `dist-desktop/webview.js` + `.css` | `src/webview/principale.ts` | iife, browser — **identico al target vsix** |
| `dist-desktop/proiezione.js` | `src/webview/proiezione.ts` | iife, browser — identico |
| `dist-desktop/pdf.worker.mjs` | il worker di pdfjs | esm, node |

I due bundle del guscio non esistono ancora: in questa fase creare
`desktop/principale.ts` e `desktop/preload.ts` come segnaposto minimi (un
`console.log` basta), così la build ha qualcosa da compilare. Il contenuto vero
arriva alla fase 2.

---

## Test da scrivere in questa fase

- `test/uri.test.mjs` — `joinPath` con `..`; `fsPath` su Windows e POSIX; `path`
  sempre con `/`; `Uri.file('C:\\x').path === '/C:/x'`; e soprattutto **la
  canonicità di `toString()`**: lo stesso file per vie diverse deve dare la stessa
  stringa, compresi i nomi con spazi e accenti.
- `test/fs.test.mjs` — `rename` con `overwrite: false` che fallisce davvero;
  `FileSystemError.code === 'FileNotFound'` su un file assente; `readDirectory` che
  restituisce i `FileType` giusti.
- `test/impostazioni.test.mjs` — i predefiniti letti da `package.json`;
  `affectsConfiguration` per prefisso; la lettura di `autenticazione: 'vscode'`
  come `'oauth'`.

---

## Criterio di accettazione

- [ ] `npm run build:desktop` produce i cinque artefatti senza errori
- [ ] `npm run controllo-tipi` verde
- [ ] `npm test` verde, compresi i tre file nuovi
- [ ] `npm run pacchetto` produce ancora un `.vsix` installabile e funzionante
- [ ] `git diff` non mostra modifiche a file esistenti fuori da `package.json` e
      `esbuild.mjs`

