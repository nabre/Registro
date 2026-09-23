# L'impianto

Come sarà fatto il registro quando questo cantiere chiude: cinque strati, una
sola definizione delle API, e tre modi di raggiungerle che non si assomigliano
in niente ma parlano tutti la stessa lingua.

[ARCHITETTURA.md](ARCHITETTURA.md) descrive com'è **oggi** e resta vero fino
all'ultimo passo. Questo descrive **dove si va**, e va letto accanto a
[CANTIERE.md](CANTIERE.md), che dice a che punto siamo.

---

## 1. I cinque strati

```
core/       la logica e i dati. Zero Electron, zero contratto, zero trasporto.
contract/   il router: l'unica definizione delle API. Non sa chi lo chiama.
desktop/    Electron: monta il router sui link, ospita le pagine.
ui/         il pannello e i widget: clienti del contratto, girano in un webview.
cli/        la riga di comando: sceglie il link quando parte.
```

Quattro li hai nominati tu. Il quinto — `ui/` — è il 41% del codice, e non stava
in nessuno degli altri: un webview non è il processo Electron, non è il
contratto e non è la logica. È un **cliente**, come la riga di comando, con un
trasporto diverso. Chiamarlo così e metterlo di fianco dice la verità che il
codice già rispetta: `src/ui/` oggi non importa **mai** `dati/`,
`azioni/` né `ambiente/`. Il confine c'è; mancava il nome.

### La regola delle dipendenze

```
core        →  (niente)                        + tipi da contract
contract    →  core
desktop     →  core, contract
ui          →  core/dominio, contract          ← solo tipi e logica pura
cli         →  (niente)                        ← nemmeno contract
```

Tre note che contano più della freccia:

**`core/` può importare *tipi* da `contract/`, mai valori.** Oggi
`actions/context.ts` fa `import type { Azione, Messaggio }` e `data/templates.ts`
fa `import type { VoceModello }`: sono sette import, tutti `import type`, tutti
cancellati alla compilazione. Non è un'inversione di strato — è codice che
dichiara la forma di quel che riceve. La regola scritta è: *`core/` non importa
un valore da `contract/`*, e la verifica una prova, non la buona volontà.

**`cli/` non importa niente, nemmeno `contract/`.** È la proprietà che la tiene
giovane: chiede `$elenco` e `$schema` al condotto e scopre a *runtime* quel che
il registro sa fare. Una procedura aggiunta stamattina si chiama da lì stasera
senza che quel file cambi di una riga — e si avvia anche quando la costruzione
del registro è rotta, che è esattamente il momento in cui serve.

**Le regole le controlla una macchina.** Il progetto ha già quattro controlli
statici fatti in casa (`npm run collections`, `forms`, `buttons`,
`census`); questo ne aggiunge un quinto, `npm run layers`, che legge gli
import e fallisce se uno attraversa un confine. Una regola d'architettura che
nessuno verifica è una regola che dura fino al prossimo `import` comodo.

---

## 2. `core/` — la purezza si ottiene invertendo

### Il problema

`dominio/` è già puro: 23 000 righe, zero import interni, zero Electron. Si
sposta senza toccare una riga.

`dati/` e `azioni/` no: fanno `import * as apparato from 'apparato'` in venticinque
file. Quel `apparato` non è un pacchetto — è un modulo nostro,
`src/environment/platform.ts`, che `tsconfig.json` ed `esbuild.mjs` mettono
al posto del nome. Ma dietro c'è Electron, e finché l'import c'è, `core/` non è
puro nemmeno un po'.

### La cucitura, che è più stretta di quel che sembra

Contati, gli usi sono questi:

| Superficie | usi | che cos'è |
| --- | --- | --- |
| `apparato.Uri` | 188 | **una classe pura**: percorsi, niente sistema operativo |
| `apparato.workspace` | 92 | servizio: file system, impostazioni, osservatori |
| `apparato.window` | 49 | servizio: dialoghi, avvisi, avanzamento |
| `apparato.FileType` e altre enumerazioni | 30 | **costanti pure** |
| `apparato.EventEmitter`, `Disposable` | 30 | **classi pure** |
| `apparato.commands`, `env`, `SecretStorage` | 21 | servizi |

E dentro `src/environment/`, ventiquattro file, la stessa cucitura è già scavata:

- **puri, zero Electron** — `uri.ts` (230), `events.ts` (128),
  `enumerations.ts` (34): **392 righe**
- **serviti da Electron** — gli altri venti: ~4 500 righe

Le 392 righe pure sono valori di cui `core/` ha bisogno *davvero* (un `Uri` è
un dato, non una capacità). Le 4 500 sono capacità dell'ospite, e sono quelle
che vanno invertite.

> `watcher.ts` (190 righe) sembrava il quarto file puro — non importa
> `electron` né `node:` — e non lo è: importa `environment/context.ts`, che
> Electron lo importa eccome. Se n'è accorto `npm run layers` il giorno in cui
> è stato scritto, guardando gli import invece dei pacchetti. È il motivo per
> cui il passo 1 viene prima del passo 5.

### Le tre capacità travestite da logica

Lo stesso controllo ha trovato in `azioni/` tre import che scendono verso
l'ospite, e tutti e tre dicono la stessa cosa: **non è logica che ha bisogno
di Electron, è codice dell'ospite finito nella cartella sbagliata.**

| File | Importa | Che cos'è davvero | Dove va |
| --- | --- | --- | --- |
| `actions/projection.ts` | `panels/projection.ts` | apre una finestra e ci punta la mira — «nessuna di queste azioni tocca il registro», dice il file stesso | `desktop/`, passo 7 |
| `actions/documents.ts` | `environment/documents.ts` | l'elenco dei documenti recenti in `userData` | nell'`Impianto`, passo 6 |
| `actions/system.ts` | `environment/settings.ts` | `vociImpostazioni`, `valoreAccettabile`: dati dichiarativi travestiti da ambiente | `contract/manifesto.ts`, passo 3 |

Sono le uniche tre in 5 706 righe di `azioni/`, e stanno scritte come deroghe
dentro `tools/layers.mjs`, ognuna con il passo che la toglie: un'eccezione
senza scadenza è una regola in meno.

### Come si inverte senza riscrivere venticinque file

Non si toglie `import * as apparato from 'apparato'` da `core/`: si cambia **che
cosa quel nome è**.

```ts
// core/apparato/indice.ts — il modulo «apparato» dopo la migrazione

// I valori puri escono di qui e basta: sono dati, non capacità.
export { Uri } from './uri.js'
export { Disposable, EventEmitter } from './eventi.js'
export { FileType, ConfigurationTarget, ProgressLocation } from './enumerazioni.js'

// Le capacità, invece, le porta chi ospita.
let impianto: Impianto | null = null

/** Chi ospita il registro dice, una volta sola, che cosa sa fare. */
export function impianta (i: Impianto): void { impianto = i }

function vivo (): Impianto {
  if (!impianto) {
    throw new Error('Il sistema non è stato impiantato: impianta() va chiamata all’avvio.')
  }
  return impianto
}

// Delegati espliciti e non un Proxy: uno stack che passa di qui deve restare
// leggibile, e un Proxy in mezzo a un guasto di file system non lo è.
export const workspace = {
  get fs () { return vivo().workspace.fs },
  getConfiguration: (sezione?: string) => vivo().workspace.getConfiguration(sezione),
  createFileSystemWatcher: (...a: never[]) => vivo().workspace.createFileSystemWatcher(...a),
  // …
}
export const window = { /* idem */ }
export const commands = { /* idem */ }
export const env = { /* idem */ }
```

E il contratto di quel che l'ospite deve saper fare:

```ts
// core/apparato/impianto.ts
export interface Impianto {
  workspace: { fs: FileSystem, getConfiguration (sezione?: string): Configurazione, /* … */ }
  window: { showErrorMessage (…): …, withProgress (…): …, /* … */ }
  commands: { executeCommand (…): …, registerCommand (…): … }
  env: { openExternal (uri: Uri): …, clipboard: …, /* … */ }
  segreti: SecretStorage
  versioneApplicazione (): string
}
```

**Che cosa si guadagna, concretamente.** `core/` compila e gira senza Electron
e senza alias del bundler. Oggi otto configurazioni di `esbuild.mjs` portano
`alias: { electron: './tests/helpers/fake-electron.mjs' }` per poter provare
`dati/`: dopo l'inversione quell'alias serve solo a `desktop/`, e le prove del
nucleo chiamano `impianta(sistemaFinto)` in una riga. Una finzione dichiarata
al posto di una finzione cablata nella costruzione.

**Che cosa costa.** Spostare quattro file, scrivere ~120 righe fra porta e
delegati, e una riga di `impianta()` all'avvio e in `tests/helpers/`. I
venticinque file di `core/` che scrivono `apparato.workspace.fs.readFile` non
cambiano di una lettera.

### Che cosa va in `core/`

```
core/
  dominio/     23 175 righe — invariato, zero import interni
  dati/        11 734 righe — persistenza, documento d'anno, PDF, posta
  azioni/       5 671 righe — i gestori: il lavoro vero di ogni scrittura
  sistema/        ~510 righe — Uri, eventi, enumerazioni, la porta, i delegati
```

---

## 3. `contract/` — il router, unica definizione

### Dall'elenco piatto all'albero

Oggi le procedure stanno in una `Map` piatta, e il nome — `ore.appello.casella`
— è una stringa dichiarata a mano in ognuna. L'albero c'è già: è
scritto dentro i punti. Il router lo rende una struttura.

```ts
// contract/router.ts
export interface Ramo { [chiave: string]: Ramo | ProceduraQualunque }

export function router<const R extends Ramo> (rami: R): R { return rami }
```

```ts
// contract/registro.ts — l'unica definizione delle API
export const registro = router({
  ore: router({
    appello: router({ casella, riga, colonna, tutti, campi, leggi }),
    comportamento: router({ cella }),
    stato, testi, salva, elimina, duplica, sposta,
    osservazione: router({ salva: ossSalva, elimina: ossElimina }),
  }),
  valutazioni: router({ /* … */ }),
  // … le undici aree
})

export type Registro = typeof registro
```

`foglie(registro)` ripercorre l'albero e torna le coppie
`['ore.appello.casella', procedura]`: **l'elenco piatto smette di essere una
seconda verità e diventa una derivata.** `$elenco`, `$schema`, il ponte delle
azioni, il condotto e la riga di comando continuano a vedere esattamente i nomi
di oggi, senza accorgersi di niente.

**Sul campo `nome`.** Al primo passo resta dov'è, e il router **verifica**
all'avvio che il percorso nell'albero e il nome dichiarato coincidano: una
procedura appesa al ramo sbagliato smette di essere un guasto silenzioso e
diventa un'eccezione in faccia, al secondo di vita del processo. Solo dopo, e
in un passo suo, `nome` si può togliere e far derivare dalla posizione — 149
call site, nessun rischio, ma un diff che merita di stare da solo.

### Il chiamante tipizzato

È la cosa per cui si guarda a tRPC, e si ottiene senza:

```ts
// contract/chiamante.ts
type Chiamante<R> = {
  [K in keyof R]: R[K] extends Procedura<infer I, infer U>
    ? (ingresso: I) => Promise<Risultato<U>>
    : R[K] extends Ramo ? Chiamante<R[K]> : never
}

export function chiamante<R extends Ramo> (albero: R, link: Link): Chiamante<R>
```

```ts
const reg = chiamante(registro, link)
await reg.ore.appello.casella({ lezioneId, allievoId, ud: 0, stato: 'assente' })
//                             ^ ingresso dedotto dallo schema
//        ^ Promise<Risultato<EsitoScrittura>>, dedotto dall'uscita
```

L'inferenza end-to-end esce da `Schema<T>`, che il tipo `T` **se lo porta già
dietro** — `definisci()` lo deduce dagli schemi da quando esiste. Non serviva
una libreria: serviva il `Proxy` che percorre l'albero, che sono trenta righe.

### Il link

```ts
// contract/link.ts
export interface Link {
  readonly nome: 'diretto' | 'ipc' | 'socket'
  chiama (via: string, ingresso: unknown): Promise<Risultato<unknown>>
  elenco (): Promise<Array<Record<string, unknown>>>
  schema (nome: string): Promise<Record<string, unknown>>
  versione (): Promise<{ api: number, applicazione: string, documento: string | null }>
  chiudi? (): void | Promise<void>
}
```

Quattro metodi e mezzo. Il router non conosce nessuna implementazione: le
riceve montate da `desktop/`.

### Che cosa va in `contract/`

```
contract/
  contratto.ts    Procedura, Ambito, Codice, ErroreApi, definisci()  ← da src/api/
  schemi.ts       Standard Schema fatto in casa                      ← da src/api/
  nucleo.ts       chiama(): convalida, cronometro, giornale, codici  ← da src/api/
  router.ts       router(), foglie(), la verifica dei nomi           ← nuovo
  registro.ts     l'albero delle procedure                           ← da src/api/index.ts
  chiamante.ts    il Proxy tipizzato                                 ← nuovo
  link.ts         l'interfaccia dei tre trasporti                    ← nuovo
  ponte.ts        azioni del protocollo ↔ procedure                  ← da src/api/
  centralino.ts   la mappa dei gestori                               ← da src/actions.ts
  protocollo.ts   i messaggi pannello ↔ ospite (1 341 righe)         ← da src/protocol.ts
  manifesto.ts    menu, impostazioni, destinazioni                   ← da src/manifest.ts
  procedure/      tutte, invariate                                   ← da src/api/procedures/
```

**Perché `protocol.ts` sta qui.** È importato da diciotto cartelle diverse —
`core`, `contract`, `ui`, `desktop` — perché è il contratto del secondo
trasporto, quello del pannello. Oggi sta nella radice di `src/` accanto
all'avvio e a un widget, e quella vicinanza non dice niente a nessuno. Qui dice
tutto.

---

## 4. `desktop/` — montare il router sui link

```ts
// desktop/avvio.ts, il nocciolo
impianta(sistemaElectron)                    // core riceve le capacità
const link = [
  montaIpc(registro, pannelli),              // i webview
  await montaSocket(registro, archivio),     // il condotto, se acceso
]
contesto.subscriptions.push(...link)
```

I tre link:

| Link | Chi lo usa | Da dove viene |
| --- | --- | --- |
| `diretto` | menu nativo, vassoio, widget agenda, promemoria | nuovo: dieci righe attorno a `nucleo.chiama` |
| `ipc` | pannello, proiezione | oggi sparso fra `pannelli/` e `ui/bridge.ts` |
| `socket` | riga di comando, script | `src/api/transports/conduit.ts`, invariato nella sostanza |

Il `diretto` non è una comodità: oggi il widget dell'agenda e il vassoio
chiamano `chiama()` a mano, ognuno a modo suo, e il menu nativo passa ancora
dal centralino. Con un link solo, tutti e tre diventano
`chiamante(registro, diretto)` e guadagnano gratis il giornale, i codici
d'errore e la convalida — che è esattamente la cosa che nel giro 0 mancava
all'agenda.

```
desktop/
  shell/        principale.ts, preload.ts, menu.ts, le pagine HTML   ← da shell/
  sistema/       i 19 file che parlano con Electron                   ← da src/environment/
  pannelli/      chi ospita i webview                                 ← da src/panels/
  link/          diretto.ts, ipc.ts, socket.ts
  widget/        agenda.ts, vassoio.ts, promemoria.ts                 ← da src/
  avvio.ts                                                            ← da src/
```

---

## 5. `cli/` — il link scelto quando parte

Nuda, come oggi: solo moduli `node:`, nessuna costruzione. Cresce in file, non
in dipendenze.

```
cli/
  registro.mjs     l'ingresso: scioglie gli argomenti, sceglie il comando
  link.mjs         sceglie il trasporto a runtime
  indirizzo.mjs    dove ascolta il condotto (le regole di condotto.ts, ripetute)
  tabella.mjs      la stampa a colonne
  comandi/
    elenco.mjs  schema.mjs  chiama.mjs  stato.mjs
    guarda.mjs        ← nuovo: segue il giornale mentre il registro lavora
    aspetta.mjs       ← nuovo: attende che il condotto risponda, con scadenza
```

`link.mjs` sceglie in quest'ordine: `REGISTRO_CONDOTTO` se c'è, altrimenti
l'impronta calcolata, e — quando `--aspetta` lo chiede — ritenta invece di
arrendersi al primo `ENOENT`. È tutto quel che «sceglie il link a runtime»
vuol dire qui: il trasporto è uno solo, ma quale socket e con quanta pazienza
lo si decide quando parte, non quando si costruisce.

La ragione per cui non prende `citty` resta quella scritta in testa al file, e
vale la pena rileggerla prima di cambiarla: *uno strumento che serve a capire
perché il registro non fa quel che dovrebbe non può avere bisogno che la
costruzione sia andata bene.*

---

## 6. `ui/` — il pannello è un cliente

```
ui/
  pannello/     principale.ts, stato, viste, moduli, componenti, stili  ← src/ui/
  proiezione/   la seconda finestra                                     ← src/ui/projection.ts
```

Non cambia una riga di logica: cambia il nome della cartella e la frase che si
può dire su di essa. Il pannello parla al registro **solo** attraverso il link
IPC e i tipi di `contract/protocollo.ts`; per la logica pura pesca da
`core/dominio/`, che gira in un browser perché non ha dipendenze. Le due cose
sono già vere oggi: `src/ui/` fa 138 import da `dominio/` e **zero** da
`dati/`, `azioni/` o `ambiente/`.

---

## 7. La mappa, per intero

| Da | A | Righe |
| --- | --- | --- |
| `src/domain/` | `core/dominio/` | 23 175 |
| `src/data/` | `core/dati/` | 11 734 |
| `src/actions/` | `core/azioni/` | 5 706 |
| `src/environment/{uri,eventi,enumerazioni}.ts` | `core/apparato/` | 392 |
| `src/environment/platform.ts` | si sdoppia: porta in `core/apparato/`, impianto in `desktop/apparato/` | 142 |
| `src/environment/` (gli altri 20, `watcher.ts` compreso) | `desktop/apparato/` | ~4 500 |
| `src/actions/projection.ts` | `desktop/azioni/` — apre finestre, non tocca il registro | 35 |
| `src/api/{contratto,schemi,nucleo,ponte}.ts` | `contract/` | 1 174 |
| `src/api/index.ts` | `contract/registro.ts` | 54 |
| `src/api/procedures/` | `contract/procedure/` | 5 305 |
| `src/api/transports/conduit.ts` | `desktop/link/socket.ts` | 479 |
| `src/protocol.ts` | `contract/protocollo.ts` | 1 341 |
| `src/manifest.ts` | `contract/manifesto.ts` | 355 |
| `src/actions.ts` | `contract/centralino.ts` | 118 |
| `src/startup.ts` | `desktop/avvio.ts` | 664 |
| `src/agenda.ts`, `vassoio.ts`, `promemoria.ts` | `desktop/widget/` | 842 |
| `src/panels/` | `desktop/pannelli/` | 752 |
| `shell/` | `desktop/shell/` | — |
| `src/ui/` | `ui/pannello/` | 39 312 |
| `src/cli/registro.mjs` | `cli/` | 530 |

---

## 8. L'ordine dei lavori

Uno alla volta, e dopo ognuno: `npx tsc --noEmit` pulito, `npx eslint .` senza
errori, `npm test` verde. **Nessun test si tocca** — un test che va cambiato
per far passare uno spostamento è il segnale che lo spostamento ha cambiato il
comportamento, e va disfatto, non aggiustato.

| # | Passo | Perché in quest'ordine |
| --- | --- | --- |
| 0 | I difetti del giro 1 | Riordinare su codice rotto sposta il difetto e rende illeggibile il diff che lo correggeva |
| 1 | `npm run layers` | ✅ **fatto.** Il controllo prima del lavoro che deve controllare. Scritto contro l'albero di oggi: passa, con tre deroghe dichiarate e datate — e nel nascere ha già corretto due cose che questo documento diceva sbagliate |
| 2 | `ui/` | 39 000 righe, ma è lo spostamento **più isolato** del progetto: nessuno importa `interfaccia/` dall'esterno tranne quattro entry point di esbuild |
| 3 | `contract/` | Sposta `api/` e i due file di radice che gli appartengono; da qui in poi «l'unica definizione» ha un indirizzo |
| 4 | `router.ts` + `chiamante.ts` + `link.ts` | Il primo lavoro che non è uno spostamento. L'albero **verifica** i nomi di oggi, quindi o parte o si ferma subito |
| 5 | `core/` — i file | `dominio`, `dati`, `azioni`, e le 582 righe pure di `ambiente` |
| 6 | `core/` — l'inversione | La porta, i delegati, `impianta()` all'avvio e in `tests/helpers/`; via otto alias da `esbuild.mjs` |
| 7 | `desktop/` | Quel che resta di `ambiente/`, `shell/`, `pannelli/`, i tre link, i widget |
| 8 | `cli/` | Fuori da `src/`, divisa in comandi; `guarda` e `aspetta` |
| 9 | I tre link al posto delle tre strade | Agenda, vassoio e menu nativo passano a `chiamante(registro, diretto)` |
| 10 | Carta | `ARCHITETTURA.md`, `API.md`, `INDICE.md`, e questo file che diventa storia |

I passi 2, 3, 5 e 7 sono `git mv` più riscrittura degli import: meccanici,
larghi, verificabili a macchina. Vanno in commit che **non contengono altro**,
o il diff diventa illeggibile e la revisione impossibile.

---

## 9. Che cosa non cambia

Il valore di un riordino si misura da quanto poco rompe.

- **Le procedure**: stessi nomi, stessi schemi, stessi codici d'errore.
- **Il protocollo del pannello**: stessi messaggi, stessa busta.
- **Il condotto**: stesso JSON-RPC, stesso indirizzo, stessi tre metodi
  riservati. Uno script scritto oggi funziona dopo.
- **La riga di comando**: stessi comandi, stesse uscite, stessi codici di
  uscita. Nessuna dipendenza, nessuna costruzione.
- **I 1 384 test**: passano senza essere toccati, a ogni passo.
- **Il file `.registro`**: nessuna migrazione di dati. Un registro scritto ieri
  si apre dopo.

E una cosa che è già cambiata, e va detta: **il modulo dell'ospite non si
chiama più `vscode`, si chiama `apparato`** (CANTIERE D14). Quel nome era il
posto in cui il registro era nato — un'estensione dell'editor — e da quando
gira in una finestra sua diceva il falso. Con la migrazione smette anche di
essere un alias del bundler e diventa un modulo vero, `core/apparato/`: il
commento in testa a `tsconfig.json` — quello che spiega perché i tipi vengono
dal file nostro e non da `@types/vscode` — resta vero e diventa più semplice,
perché il percorso punta a quel che davvero gira senza che `esbuild.mjs` debba
ripetere la stessa cosa.
