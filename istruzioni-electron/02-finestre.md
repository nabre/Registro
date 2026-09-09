# Fase 2 — Le finestre

**Rende possibile:** `npm run desktop` apre il registro, e lo si può usare.
**È la fase decisiva:** se `pannello.ts` gira senza modifiche, la migrazione è
sostanzialmente riuscita.

> Leggere `00-premessa.md` prima di cominciare.

---

## Prerequisiti

- La fase 1 è chiusa e i suoi criteri di accettazione sono verificati.
- Leggere **per intero** `src/pannello.ts` (395 righe): è il file che questa fase
  deve far funzionare senza toccarlo. E leggere `src/webview/ponte.ts` righe 1-40,
  che è l'altra sponda.
- Leggere `src/estensione.ts`, in particolare `activate` e `deactivate`.

## Perimetro

**Si crea:** `src/ambiente/finestre.ts`, `src/ambiente/contesto.ts`,
`desktop/principale.ts`, `desktop/preload.ts`, `desktop/protocolloFile.ts`.
**Si modifica:** nulla di esistente.

---

## 1. `src/ambiente/finestre.ts` — la mossa che fa risparmiare il lavoro

`createWebviewPanel` restituisce un oggetto che **implementa la stessa forma** di
`WebviewPanel` ma è sostenuto da una `BrowserWindow`. Fatto questo,
`src/pannello.ts` e `src/pannelloProiezione.ts` funzionano **senza una modifica**,
e con loro tutta la coda delle richieste, la spinta dello stato e la gestione
degli errori che c'è dentro.

| Membro | Implementazione |
|---|---|
| `webview.html = …` | memorizza l'HTML e fa `win.loadURL('registro://pagina/<id>')` |
| `webview.postMessage(m)` | `win.webContents.send('registro:messaggio', m)` |
| `webview.onDidReceiveMessage(f)` | `ipcMain.on('registro:messaggio', …)` filtrato per id di finestra |
| `webview.asWebviewUri(uri)` | vedi §3 |
| `webview.cspSource` | la stringa `'registro:'` |
| `webview.options` | `localResourceRoots`: si conserva e si consulta nel protocollo |
| `reveal()` | `win.show()` + `win.focus()` |
| `dispose()` | `win.close()` |
| `onDidDispose(f)` | `win.on('closed', f)` |
| `iconPath` | `new BrowserWindow({ icon })`, o ignorato |
| `retainContextWhenHidden` | ignorato: una finestra conserva sempre il suo contesto |

### L'HTML va servito dal protocollo, non da un `data:` URL

`pannello.ts` compone una Content-Security-Policy che nomina
`webview.cspSource`. Con un `data:` URL l'origine della pagina è opaca, la policy
non combacia, e **la finestra resta bianca senza dire perché** — è il tipo di
guasto su cui si perde un pomeriggio. Servendo l'HTML da `registro://pagina/<id>`
l'origine è `registro://pagina`, e script, stile e immagini combaciano tutti.

### Opzioni della finestra, non negoziabili

```ts
webPreferences: {
  preload: percorsoPreload,
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: false,
}
```

Nel registro ci sono nomi di allievi, note personali e valutazioni: il renderer
non deve avere Node fra le mani. È la stessa ragione per cui `pannello.ts` scrive
già `default-src 'none'`.

### Il filtro per finestra

`onDidReceiveMessage` deve consegnare a un pannello **solo** i messaggi della sua
finestra. Il pannello del registro e quello della proiezione sono due istanze
distinte e parlano sullo stesso canale IPC: senza il filtro, ognuna riceve anche
le richieste dell'altra. Confrontare `evento.sender.id` con il
`webContents.id` della finestra.

## 2. La cartella di lavoro

`percorsi.ts` chiama `vscode.workspace.workspaceFolders?.[0]?.uri`. Lo shim
risponde con la cartella scelta dall'utente, letta da
`<userData>/impostazioni.json` alla chiave `cartellaLavoro`.

All'avvio, se la chiave è vuota o punta a una cartella che non esiste:

```ts
dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] })
```

con un titolo che spiega che cosa si sta scegliendo — «la cartella in cui il
registro tiene i suoi dati» — salvare la scelta, e **solo dopo** procedere con
l'avvio. Se l'utente annulla, chiudere l'applicazione: senza cartella non c'è
registro.

Serve anche un comando «cambia cartella di lavoro», che riesegue la scelta e poi
chiama `archivio.carica()`. In questa fase basta esporlo come funzione; finisce
nel menu alla fase 4.

## 3. `desktop/protocolloFile.ts` — lo schema `registro://`

Sostituisce `asWebviewUri`. Tre autorità:

| URL | Serve |
|---|---|
| `registro://pagina/<id>` | l'HTML memorizzato da `webview.html` |
| `registro://app/<percorso>` | i file dentro `dist-desktop/` e `media/` |
| `registro://dati/<percorso>` | i file sotto la cartella dell'anno in uso |

`asWebviewUri(uri)` decide fra `app` e `dati` guardando se `uri.fsPath` sta sotto
`extensionUri` oppure sotto uno dei `localResourceRoots` del pannello, e codifica
il resto del percorso con `encodeURIComponent` **segmento per segmento** (non
sull'intera stringa, o i `/` vengono codificati anche loro).

Prima di `app.whenReady()`:

```ts
protocol.registerSchemesAsPrivileged([{
  scheme: 'registro',
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
}])
```

`standard: true` serve perché l'origine sia una origine vera e la CSP funzioni;
`stream: true` perché i PDF e le immagini dell'archivio possono essere grossi.

### Il controllo di sicurezza è obbligatorio

Nel gestore, risolvere il percorso con `path.resolve` e **verificare che stia
dentro una delle radici concesse** prima di aprire qualunque file.

Senza questo controllo, un `..` in un nome di file salvato nei JSON diventa una
lettura arbitraria del disco — e quei nomi non sono tutti scritti dal docente:
arrivano anche dai PDF che entrano dalla cassetta `in-arrivo/`, per via dello
smistamento. Fuori dalle radici: rispondere **403, non 404**, e registrarlo sulla
console, perché un 403 in sviluppo si nota e un 404 si scambia per un percorso
sbagliato.

## 4. `desktop/preload.ts`

Poche righe, e sono il ponte che tiene `src/webview/ponte.ts` intatto:

```ts
import { contextBridge, ipcRenderer } from 'electron'

let stato: unknown = null

contextBridge.exposeInMainWorld('acquireVsCodeApi', () => ({
  postMessage: (messaggio: unknown) => ipcRenderer.send('registro:messaggio', messaggio),
  getState: () => stato,
  setState: (nuovo: unknown) => { stato = nuovo },
}))

// I messaggi che arrivano dall'host si ributtano nella pagina come eventi
// `message`: è la forma che `src/webview/ponte.ts` ascolta già, e che non deve
// accorgersi di aver cambiato mondo.
ipcRenderer.on('registro:messaggio', (_evento, messaggio) => {
  window.postMessage(messaggio, '*')
})
```

## 5. `desktop/principale.ts`

```
app.requestSingleInstanceLock()      // due copie sullo stesso registro si contraddicono
  → se non lo ottiene: portare in primo piano l'istanza viva e uscire
registerSchemesAsPrivileged()
app.whenReady()
  → registra il protocollo
  → sceglie/verifica la cartella di lavoro
  → costruisce l'ExtensionContext finto
  → chiama activate(contesto)      ← la activate esistente, non riscritta
app.on('window-all-closed')  → su Windows e Linux: app.quit()
app.on('before-quit')        → attende deactivate(), poi esce
```

### Lo spegnimento è un punto delicato

`deactivate()` esiste apposta: i salvataggi sono ritardati di mezzo secondo e
senza attesa **l'ultima modifica si perde** — sta scritto nel commento in fondo a
`estensione.ts`. Electron non aspetta le promesse in `before-quit`, quindi:

```ts
let inChiusura = false
app.on('before-quit', (evento) => {
  if (inChiusura) return
  evento.preventDefault()
  inChiusura = true
  void deactivate().finally(() => app.exit(0))
})
```

### L'`ExtensionContext` finto

`src/ambiente/contesto.ts`: `subscriptions: Disposable[]`, `secrets` (dalla
fase 1), `extensionUri` = `Uri.file(app.getAppPath())`, `extensionPath`,
`globalStorageUri` = `Uri.file(app.getPath('userData'))`.

## 6. Il worker di pdfjs

`estensione.ts` chiama
`impostaWorker(pathToFileURL(joinPath(extensionUri, 'dist', 'pdf.worker.mjs').fsPath).href)`.
Sul desktop il file sta in `dist-desktop/`: o `extensionUri` punta alla radice
dell'app e il bundle si trova lì sotto con lo stesso nome relativo, oppure — più
pulito — lo shim aggiusta il percorso.

**Attenzione all'asar** (conta davvero dalla fase 6, ma va previsto adesso): pdfjs
carica il worker con un `import()` di un file URL, che *non* passa dal `fs` con la
patch asar. Dentro un archivio asar il caricamento fallisce con un errore poco
chiaro. Vedi `06-impacchettare.md`.

---

## Criterio di accettazione

- [ ] `npm run desktop` apre la finestra del registro
- [ ] il calendario si vede e si naviga
- [ ] si crea una lezione, si chiude l'app **dalla X**, si riapre: la lezione c'è
- [ ] le immagini dei piani lezione si vedono (è la prova che `registro://dati/`
      funziona)
- [ ] un percorso con `..` servito dal protocollo risponde 403
- [ ] `git diff` non mostra modifiche a file esistenti
- [ ] `npm run controllo-tipi`, `npm test`, `npm run pacchetto` verdi
- [ ] le quattro prove manuali di `00-premessa.md` §6 passano

