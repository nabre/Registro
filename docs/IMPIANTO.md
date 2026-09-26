# L'impianto

Dove va la struttura: cinque strati, una sola definizione delle API, tre link.
È un piano: com'è oggi lo dice [ARCHITETTURA.md](ARCHITETTURA.md), a che punto
è il lavoro [CANTIERE.md](CANTIERE.md) (C4, C5).

## 1. I cinque strati

```
core/       logica e dati. Zero Electron, zero contratto, zero trasporto.
contract/   il router: l'unica definizione delle API.
desktop/    Electron: monta il router sui link, ospita le pagine.
ui/         pannello e widget: clienti del contratto, in un webview.
cli/        la riga di comando: sceglie il link quando parte.
```

Dipendenze:

```
core        →  (niente)                        + tipi da contract
contract    →  core
desktop     →  core, contract
ui          →  core/dominio, contract          ← solo tipi e logica pura
cli         →  (niente)                        ← nemmeno contract
```

- `core/` importa da `contract/` solo tipi (`import type`), mai valori.
- `cli/` non importa niente: scopre le procedure a runtime con `$elenco` e
  `$schema`, e parte anche con la build rotta.
- `src/ui/` oggi non importa già mai `data/`, `actions/` né `environment/`.
- Le regole le controlla `npm run layers` (`tools/layers.mjs`), con le deroghe
  dichiarate e il passo che le toglie.

## 2. `core/` — la purezza si ottiene invertendo

`src/domain/` è già puro. `src/data/` e `src/actions/` importano `apparato`
(`src/environment/platform.ts`), dietro cui c'è Electron. In
`src/environment/` solo `uri.ts`, `events.ts` ed `enumerations.ts` sono puri;
gli altri sono capacità dell'ospite (anche `watcher.ts`, che importa
`environment/context.ts`).

**L'inversione:** il nome `apparato` resta, cambia che cosa è.
`core/apparato/` esporta i valori puri (`Uri`, `EventEmitter`, enumerazioni) e
delegati espliciti (non un `Proxy`) verso un `Impianto` che l'ospite installa
all'avvio con `impianta()`. Le prove chiamano `impianta(sistemaFinto)` invece
dell'alias `electron` → `tests/helpers/fake-electron.mjs` in `esbuild.mjs`. I
file che scrivono `apparato.file.readFile` non cambiano.

Deroghe di oggi in `src/actions/`, ognuna con il suo passo:

| File | Importa | Dove va |
| --- | --- | --- |
| `src/actions/projection.ts` | `src/panels/projection.ts` | `desktop/`, passo 7 |
| `src/actions/documents.ts` | `src/environment/documents.ts` | nell'`Impianto`, passo 6 |
| `src/actions/system.ts` | `src/environment/settings.ts` | `contract/manifesto.ts`, passo 3 |

`core/` = `dominio/`, `dati/`, `azioni/`, `apparato/` (valori puri, porta,
delegati).

## 3. `contract/` — il router, unica definizione

- `router()` rende albero l'elenco piatto delle procedure; `foglie()` lo
  ripercorre e dà le coppie `['ore.appello.casella', procedura]`, quindi
  `$elenco`, `$schema`, ponte, condotto e riga di comando non vedono
  differenze.
- Il campo `nome` resta, e il router verifica all'avvio che coincida con il
  percorso. Toglierlo e derivarlo dalla posizione è un passo a sé.
- `chiamante(albero, link)`: un `Proxy` tipizzato,
  `reg.ore.appello.casella({…})`, ingresso e uscita dedotti da `Schema<T>`
  (forma di tRPC, senza tRPC).
- `Link`: `nome` (`'diretto' | 'ipc' | 'socket'`), `chiama`, `elenco`, `schema`,
  `versione`, `chiudi?`.

Contenuto: contratto, schemi, nucleo, router, albero delle procedure,
chiamante, link, ponte, centralino (`src/actions.ts`), protocollo
(`src/protocol.ts`), manifesto (`src/manifest.ts`), `procedure/`.

## 4. `desktop/` — montare il router sui link

| Link | Chi lo usa | Da dove viene |
| --- | --- | --- |
| `diretto` | menu nativo, vassoio, promemoria | nuovo, attorno a `chiama` |
| `ipc` | pannello, proiezione | oggi fra `src/panels/` e `src/ui/bridge.ts` |
| `socket` | riga di comando, script | `src/api/transports/conduit.ts` |

Vassoio e menu nativo oggi chiamano ognuno a modo suo; con `diretto` guadagnano
giornale, codici d'errore e convalida.

Contenuto: `shell/`, il resto di `src/environment/`, `src/panels/`, i link, i
widget (`src/tray.ts`, `src/reminders.ts`), l'avvio (`src/startup.ts`).

## 5. `cli/` — il link scelto quando parte

Nuda: solo moduli `node:`, nessuna build. Cresce in file:

```
cli/
  registro.mjs     ingresso, argomenti
  link.mjs         REGISTRO_CONDOTTO, altrimenti l'impronta; con --aspetta ritenta
  indirizzo.mjs    dove ascolta il condotto
  tabella.mjs      stampa a colonne
  comandi/         elenco, schema, chiama, stato, guarda (nuovo), aspetta (nuovo)
```

## 6. `ui/` — il pannello è un cliente

`ui/pannello/` (da `src/ui/`) e `ui/proiezione/`. Nessuna logica cambia: il
pannello parla solo attraverso il link IPC e i tipi del protocollo, e pesca
logica pura da `core/dominio/`.

## 7. La mappa, per intero

| Da | A |
| --- | --- |
| `src/domain/` | `core/dominio/` |
| `src/data/` | `core/dati/` |
| `src/actions/` | `core/azioni/` (`projection.ts` → `desktop/azioni/`) |
| `src/environment/{uri,events,enumerations}.ts` | `core/apparato/` |
| `src/environment/platform.ts` | porta in `core/apparato/`, impianto in `desktop/apparato/` |
| `src/environment/` (il resto) | `desktop/apparato/` |
| `src/api/{contract,schemas,core,bridge}.ts` | `contract/` |
| `src/api/index.ts` | `contract/registro.ts` |
| `src/api/procedures/` | `contract/procedure/` |
| `src/api/transports/conduit.ts` | `desktop/link/socket.ts` |
| `src/protocol.ts` | `contract/protocollo.ts` |
| `src/manifest.ts` | `contract/manifesto.ts` |
| `src/actions.ts` | `contract/centralino.ts` |
| `src/startup.ts` | `desktop/avvio.ts` |
| `src/tray.ts`, `src/reminders.ts` | `desktop/widget/` |
| `src/panels/` | `desktop/pannelli/` |
| `shell/` | `desktop/shell/` |
| `src/ui/` | `ui/pannello/` |
| `src/cli/` | `cli/` |

## 8. L'ordine dei lavori

Dopo ogni passo: `tsc`, ESLint, `npm test` verdi, **nessun test toccato**. Gli
spostamenti (`git mv` + import) in commit che non contengono altro.

| # | Passo |
| --- | --- |
| 1 | `npm run layers` — fatto |
| 2 | `ui/` — lo spostamento più isolato |
| 3 | `contract/` |
| 4 | `router.ts`, `chiamante.ts`, `link.ts` |
| 5 | `core/`: i file |
| 6 | `core/`: l'inversione (`impianta()`, via gli alias `electron` da `esbuild.mjs`) |
| 7 | `desktop/` |
| 8 | `cli/` fuori da `src/`, divisa in comandi |
| 9 | vassoio e menu nativo su `chiamante(registro, diretto)` |
| 10 | aggiornare ARCHITETTURA, API, INDICE; togliere questo file |

## 9. Che cosa non cambia

Nomi, schemi e codici delle procedure; messaggi del protocollo; il condotto
(JSON-RPC, indirizzo, metodi riservati); comandi e uscite della riga di
comando; le prove; il formato `.regi`.
