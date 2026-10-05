---
name: architettura
description: >
  I cinque strati di Regiklass (core, contract, desktop, ui, cli),
  le regole di isolamento e dipendenza verificate da `npm run layers`,
  la purezza di `core/dominio/`, e la guida decisionale su dove collocare ogni nuovo file.
  Da usare ogni volta che si aggiunge, sposta o scompone un modulo, si disegna una nuova
  funzione, si tocca un import fra strati diversi, o `npm run layers` segnala una violazione.
---

# L'architettura a cinque strati di Regiklass

Regiklass è organizzato in **cinque strati concentrici**, ciascuno con un perimetro di responsabilità rigoroso e confini d'importazione non negoziabili. L'architettura garantisce l'indipendenza della logica di scuola dalla tecnologia grafica (Electron e DOM), la portabilità e velocità dei test, la robustezza del runtime e la chiarezza contrattuale delle API.

I confini tra gli strati non sono convenzioni verbali: sono verificati automaticamente da `npm run layers` (`tools/layers.mjs`) e dalle regole di linting in `eslint.config.mjs`.

```
                    ┌────────────────────────┐
                    │          cli/          │ (autonoma, zero import applicativi)
                    └────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                             desktop/                             │
│     desktop/shell/   desktop/apparato/   desktop/pannelli/       │
│     desktop/transports/   desktop/widget/   desktop/boot.ts      │
└───────────────┬──────────────────────────────────┬───────────────┘
                │                                  │
                ▼                                  │
┌───────────────────────────────┐                  │
│           contract/           │                  │
│ protocol.ts     manifest.ts   │                  │
│ schemas.ts      procedure/    │                  │
│ switchboard.ts  bridge.ts     │                  │
│ tools.ts                      │                  │
└───────────────┬───────────────┘                  │
                │ (import type da core)            │
                ▼                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                              core/                               │
│  core/dominio/ (puro)   core/dati/   core/azioni/                │
│  core/i18n/             core/apparato/   core/controlli/         │
└───────────────────────────────▲──────────────────────────────────┘
                                │ (solo core/dominio/, core/i18n/, core/controlli/)
┌───────────────────────────────┴──────────────────────────────────┐
│                              ui/                                 │
│  ui/ (views/, forms/, components/, bridge.ts, focus.ts)          │
│  (webview Chromium, nessun accesso a Node né Electron)           │
└──────────────────────────────────────────────────────────────────┘
```

---

## 1. I cinque strati e le loro responsabilità

### `core/`: Logica e dati indipendenti dall'ambiente grafico
È il cuore del programma, slegato da qualsiasi interfaccia grafica o runtime desktop. Non conosce Electron né il DOM del browser. È diviso in cinque sotto-aree:

1. **`core/dominio/` (puro)**:
   - Contiene il modello dei dati scolastici (`core/dominio/models.ts`), il calcolo del calendario e orari (`core/dominio/dates.ts`, `core/dominio/calculations.ts`), la validazione e normalizzazione (`core/dominio/validation.ts`), le regole di cancellazione a cascata, e le migrazioni di schema (`core/dominio/upgrades.ts`).
   - **Purezza assoluta**: non importa nulla da fuori di sé (zero dipendenze da `node:*`, zero da `electron`, zero dall'`apparato`, zero import verso altri strati, con l'unica eccezione di `core/i18n/` per i testi).
   - Segue il pattern: *calcolo puro + applica mutante*.
   - Tutte le sue prove girano all'istante con `npm test` o `node --test` senza finestre né dischi finti.
2. **`core/dati/` (persistenza e I/O)**:
   - Gestisce la persistenza del documento `.regi`: lettura e scrittura dell'archivio (`core/dati/archive.ts`), compressione e pacchetto ZIP (`core/dati/package.ts`, `core/dati/zip.ts`), materializzazione su disco (`core/dati/store.ts`).
   - Gestisce i formati e i servizi esterni: generazione PDF (`core/dati/pdf.ts`, `core/dati/reportsPdf.ts`), invio posta ed Exchange (`core/dati/mail.ts`, `core/dati/exchange.ts`, `core/dati/oauth.ts`), OneDrive con Microsoft Graph (`core/dati/microsoft.ts`, `core/dati/onedrive.ts`), modelli di lezione (`core/dati/templates.ts`), geocodifica Nominatim (`core/dati/geocoding.ts`), OCR (`core/dati/ocr.ts`).
   - Non importa mai direttamente `electron`: per interagire con l'ambiente host passa dall'astrazione di `core/apparato/`.
3. **`core/azioni/` (gestori applicativi)**:
   - I gestori applicativi che eseguono le mutazioni richieste dall'utente.
   - Ogni file implementa una porzione dell'unione `Azione` definita nel contratto.
   - Riceve il contesto di mutazione (`core/azioni/context.ts`), valida lo stato, applica le modifiche di dominio e dichiara esplicitamente le collezioni JSON modificate tramite `context.modifica(op, collezioni)`.
4. **`core/i18n/` (gestione delle lingue)**:
   - Il dispositivo multilingua di Regiklass (ADR-38).
   - Gestisce lo stato della lingua (`core/i18n/state.ts`) e le utilità per le pagine (`core/i18n/page.ts`).
   - Sta sotto tutti gli altri moduli e non dipende da nessun altro strato.
5. **`core/apparato/` (interfaccia verso l'host)**:
   - Definisce i contratti astratti delle capacità fornite dal sistema ospite (`core/apparato/platform.ts`): accesso al filesystem, finestre di dialogo, impostazioni di configurazione, archivio segreti, bus eventi.
   - A runtime, la parola chiave `apparato` viene risolta tramite alias verso l'implementazione reale in `desktop/apparato/platform.ts`. Nelle prove senza Electron, viene rediretta verso implementazioni simulate.

### `contract/`: La superficie contrattuale
Rappresenta il contratto esplicito tra il motore applicativo, l'interfaccia utente e l'esterno:

- `contract/protocol.ts`: Definisce le buste dei messaggi IPC scambiati via canale tra il processo main e il frontend (`Richiesta`, `Risposta`, `Domanda`, `Riscontro`, `Notifica`).
- `contract/manifest.ts`: Il manifesto delle impostazioni del programma e del documento, con schemi di tipo, valori predefiniti, sezioni di preferenza e definizioni dei comandi.
- `contract/schemas.ts`: Schemi di validazione dei payload e dei formati di scambio.
- `contract/procedure/`: L'insieme delle procedure invocabili dall'esterno (via API JSON-RPC, CLI o assistente LLM), ciascuna dotata di schema d'ingresso (`contract/schemas.ts`, valibot sotto `~standard`) rigoroso e registrazione centralizzata.
- `contract/switchboard.ts`: Il router che smista le chiamate contrattuali e instradamento richieste verso i rispettivi gestori.
- `contract/bridge.ts`: Interfaccia astratta di comunicazione IPC lato client/server.
- `contract/tools.ts`: Definizione e serializzazione degli strumenti esposti all'assistente e ai modelli linguistici.

### `desktop/`: L'ambiente Electron e host di sistema
Racchiude il processo principale (main process) Electron e le integrazioni con il sistema operativo Windows:

- `desktop/shell/`: Il guscio dell'applicazione. Punto d'ingresso Electron (`desktop/shell/main.ts`), ciclo di vita delle finestre native (`desktop/shell/windows/`), protocollo personalizzato `registro://` (`desktop/shell/protocol/`), script di preload sicuro per Chromium (`desktop/shell/preload.ts`), menu applicativo, scorciatoie globali e associazioni di estensioni file in Windows.
- `desktop/apparato/`: Implementazione reale dell'interfaccia host per Electron (`desktop/apparato/platform.ts`), gestione dei dialoghi di sistema (`desktop/apparato/dialogs.ts`), gestione cartelle utente e percorsi di configurazione.
- `desktop/pannelli/`: Gestione del ciclo di vita delle webview e coordinamento dei pannelli (`desktop/pannelli/panel.ts` per il pannello principale, `desktop/pannelli/projection.ts` per la finestra proiettore, `desktop/pannelli/assistant.ts` per l'assistente, `desktop/pannelli/page.ts` per la costruzione della pagina HTML e header CSP).
- `desktop/transports/`: I canali di trasporto dei dati verso l'esterno o sottoprocessi, tra cui il condotto IPC e socket per l'assistente (`desktop/transports/conduit.ts`, `desktop/transports/assistant.ts`).
- `desktop/widget/`: Componenti dell'area di notifica di Windows, tra cui l'icona nel vassoio di sistema (`desktop/widget/tray.ts`) e le notifiche toast per promemoria (`desktop/widget/reminders.ts`).
- `desktop/boot.ts`: Modulo orchestratore che avvia i servizi, apre il documento e coordina l'inizializzazione dell'applicazione desktop.

### `ui/`: Il frontend del pannello in webview (`ui/`)
È l'interfaccia grafica utente renderizzata all'interno della webview di Chromium. È un'applicazione React (ADR-56) senza router, store né kit di componenti:

- Organizzazione interna:
  - `ui/views/` (`views/`): le viste complete dell'applicazione (orario, appello, valutazioni, studenti, ecc.).
  - `ui/forms/` (`forms/`): i form di inserimento e modifica dati con validazione visuale.
  - `ui/components/` (`components/`): componenti grafici riutilizzabili (pulsanti, schede, modali, tabelle).
  - `ui/bridge.ts` (`bridge.ts`): il ponte di comunicazione che invia le richieste IPC al main process e gestisce lo stato di ritorno.
  - `ui/main.tsx` (`main.tsx`): la radice React (ADR-56), ridisegnata tutta a ogni cambio di stato; `ui/focus.ts` rimette cursore, fuoco e scorrimento. Come si scrive un componente: skill `react`.
  - **Dove si è (ADR-47):** un `Posto` (`place.ts`); si naviga solo con `vai(posto)`, `vaiA(pagina)` o `apriLezione(id)`, mai con `aggiorna({vista…})`. Il posto si ricorda per documento (`memory.ts`).
  - **Ogni aggiornamento resta nel suo riquadro (ADR-48).** Scrivendo una vista:
    - una lettura asincrona (anteprima, PDF, CSV, miniature, avanzamento) va in un'`isola` (`islands.ts`) e si legge con `risorse.leggi(…, { isola })`: all'arrivo si rifà solo quella;
    - un nodo pesante (`iframe`, visore, `canvas`, mappa, immagine grande) è un componente con la sorgente per `key`;
    - un contenitore che scorre porta `data-scorrimento` e, se la catena dalla radice lo permette, `data-telaio`;
    - niente `chiedi`/`invia`/`aggiorna`/`scrollIntoView` mentre si disegna: si fanno in un gesto, in un effetto o in un iscritto;
    - ciò che segna l'ora si muove con `alMinuto` (`clock.ts`), non ridisegnando.
- **Isolamento stringente**: gira dentro una sandbox Chromium con CSP `default-src 'none'`. Non ha accesso a Node (`node:*`) né a moduli Electron. Non può importare moduli da `core/dati/`, `core/azioni/` o `core/apparato/`. Comunica con il sistema esclusivamente tramite messaggi IPC scambiati sul ponte `ui/bridge.ts`.

### `cli/`: La linea di comando
Fornisce strumenti a riga di comando per operare sul registro e compiere interventi di manutenzione:

- `cli/main.mjs`: Script CLI principale per ispezionare archivi, verificare lo stato, estrarre dati ed eseguire operazioni automatiche.
- `cli/uninstall.mjs`: Script per la disinstallazione pulita e rimozione di chiavi di registro e cache.
- **Indipendenza totale**: scritti in JavaScript standard (Node ESM `.mjs`), senza compilazione TypeScript intermedia. Non importano a runtime moduli applicativi da `core/`, `contract/`, `desktop/` o `ui/`. Questa indipendenza garantisce che la CLI possa partire ed eseguire diagnostica anche quando il progetto non compila o la build è temporaneamente interrotta.

---

## 2. La matrice delle dipendenze permesse e vietate

Le dipendenze del codice devono seguire rigorosamente la direzione consentita ("le frecce verso il basso"). Nessun import può risalire verso strati a livello superiore o più periferici.

### Matrice di importazione

| Strato (chi importa) | Può importare valori da | Può importare tipi (`import type`) da | Import severamente VIETATI |
|---|---|---|---|
| **`core/`** | `core/` | `core/`, `contract/` | `contract/` (valori), `desktop/`, `ui/`, `cli/`, `electron` (diretto) |
| **`contract/`** | `contract/`, `core/` | `contract/`, `core/` | `desktop/`, `ui/`, `cli/`, `electron` |
| **`desktop/`** | `desktop/`, `contract/`, `core/` | `desktop/`, `contract/`, `core/` | `ui/`, `cli/` |
| **`ui/`** | `ui/`, `contract/`, `core/dominio/`, `core/i18n/`, `core/controlli/` | `ui/`, `contract/`, `core/` | `desktop/`, `cli/`, `node:*`, `electron`, `core/dati/`, `core/azioni/`, `core/apparato/` |
| **`cli/`** | `cli/` | `cli/` | `core/`, `contract/`, `desktop/`, `ui/` (autonomia assoluta) |

### L'eccezione contrattuale di `core/`: SOLO tipi (`import type`)

Una regola fondamentale del design di Regiklass riguarda la relazione tra `core/` e `contract/`:

- I gestori in `core/azioni/` e la logica in `core/` hanno la necessità di conoscere la firma delle azioni o i tipi dei payload (es. `Azione`, `Risposta`).
- Tuttavia, `core/` non deve avere dipendenze di valore a runtime da `contract/`. Un import di valore violerebbe il principio che `core/` è alla base di tutto e non dipende da contratti esterni.
- Di conseguenza, `tools/layers.mjs` consente a `core/` di importare da `contract/` **esclusivamente tipi TypeScript**:

```ts
// CORRETTO (import di solo tipo, sparisce alla compilazione):
import type { Azione, Risposta } from '../contract/protocol.js'
import { type SchemiRegistro } from '../contract/schemas.js'

// ERRORE GRAVE (import di valore a runtime, intercettato da npm run layers):
import { COMANDI } from '../contract/manifest.js'
import { inviaMessaggio } from '../contract/bridge.js'
```

### La barriera di sicurezza di `ui/`

Sebbene `ui/` possa importare da `core/`, la regola `ui-persistenza-ospite` di `.dependency-cruiser.cjs` (con `npm run layers`) e le regole in `eslint.config.mjs` impediscono alla webview di importare:
- `core/dati/`: la webview non può aprire file, creare ZIP né accedere al filesystem;
- `core/azioni/`: la webview non può mutare direttamente lo stato in memoria, deve passare da una `Richiesta` IPC;
- `core/apparato/`: la webview non può interagire con l'host se non tramite il ponte.

Alla webview è concesso importare solo funzioni pure di calcolo da `core/dominio/`, stringhe da `core/i18n/` e i controlli delle impostazioni da `core/controlli/`.

### `core/controlli/`: il DOM condiviso dei controlli (ADR-52)

I controlli delle impostazioni del programma (il componente `<Controllo>` in `core/controlli/control.tsx`, `<Campo>` in `core/controlli/field.tsx` per i campi dell'anno, le aree in `core/controlli/areas.ts`, il foglio `core/controlli/controls.css`) si disegnano una volta e arrivano per import al pannello (`ui/`) e alla finestra nativa (`desktop/shell/pages/settings/`). Regole: componenti React (ADR-56, skill `react`), il valore esce da `quandoCambia`, mai `innerHTML` (i nodi di `core/i18n/flags.ts` entrano come nodi, `core/controlli/dom.tsx`), niente ponte, IPC, Node o Electron; importa solo `react`, `core/i18n/`, le parole di tutti (`core/dominio/words.testi.ts`) e tipi da `contract/`. Lo fanno rispettare la regola `controlli-leggeri` di `.dependency-cruiser.cjs` e il blocco `core/controlli/**` di `eslint.config.mjs`.

---

## 3. Guida decisionale: «Dove metto questo codice?»

Quando si deve introdurre un nuovo modulo, funzione o classe, utilizzare la seguente guida decisionale:

```
Qual è lo scopo del codice da aggiungere?
│
├── È una formula matematica, calcolo di ore/assenze, modello dati o validazione pura?
│   └── ➔ core/dominio/ (puro, senza effetti collaterali, zero Node/Electron)
│
├── È un'operazione di lettura/scrittura disco, gestione ZIP, esportazione PDF, rete o email?
│   └── ➔ core/dati/ (persistenza e I/O, niente Electron diretto)
│
├── È un gestore applicativo che riceve un'azione, modifica il registro e dichiara le collezioni?
│   └── ➔ core/azioni/ (gestori delle azioni con context.modifica)
│
├── È una procedura esposta con schema d'ingresso all'API, all'assistente o alla riga di comando?
│   └── ➔ contract/procedure/ (contratto esplicito con schema d'ingresso)
│
├── È un protocollo IPC, schema globale di messaggi o definizione delle impostazioni?
│   └── ➔ contract/ (contract/protocol.ts, contract/schemas.ts, contract/manifest.ts)
│
├── È una finestra nativa, menu di sistema, scorciatoia OS, tray icon o protocollo registro://?
│   └── ➔ desktop/shell/ o desktop/widget/ o desktop/apparato/ (main process Electron)
│
├── È una vista a schermo, tabella, form, pulsante o componente interattivo del pannello?
│   └── ➔ ui/ (ui/views/, ui/forms/, ui/components/)
│
└── È un comando autonomo da terminale per manutenzione, batch o diagnostica?
    └── ➔ cli/ (script Node ESM autonomo senza import applicativi)
```

### Esempi pratici

| Necessità | Collocazione corretta | Motivazione |
|---|---|---|
| Calcolare la media ponderata o i decimali di voto | `core/dominio/calculations.ts` | Calcolo puro su strutture dati in memoria. |
| Aggiungere un nuovo campo a una classe o entità | `core/dominio/models.ts` | Modello dati scolastico (richiede anche aggiornamento formato). |
| Creare o estrarre un file di backup ZIP del documento | `core/dati/archive.ts` | Operazione di I/O e persistenza dati. |
| Rispondere all'azione utente che muta il registro | `core/azioni/` | Modifica dello stato del registro con salvataggio collezioni. |
| Esporre un metodo per interrogare le assenze via API/LLM | `contract/procedure/` | Procedura contrattuale tipizzata con schema di input validato. |
| Mostrare un dialogo nativo di conferma dell'OS | `desktop/apparato/dialogs.ts` | Integrazione con l'host di sistema e finestre native. |
| Disegnare la griglia dell'orario settimanale | `ui/views/` | Componente grafico eseguito nel DOM della webview. |
| Scrivere uno script per disinstallare o pulire dati da terminale | `cli/` | Script eseguibile senza interfaccia grafica e indipendente dalla compilazione. |

---

## 4. Verifica automatica: `npm run layers` ed ESLint

La correttezza architettonica del progetto è garantita da due livelli di controllo statico:

### 1. Il controllo di isolamento: `npm run layers` (`tools/layers.mjs`)
`tools/layers.mjs` fa leggere il grafo degli import (`.ts` e `.mjs`) a dependency-cruiser e lo confronta con le regole di `.dependency-cruiser.cjs`, ognuna col suo perché:
1. **Confini di strato**: `core-verso-fuori`, `contract-verso-fuori`, `desktop-verso-fuori`, `ui-verso-fuori`, `cli-autonoma`.
2. **Tipo contro valore**: `core-valore-da-contract` — `core/` può prendere da `contract/` solo tipi; un valore esce come `VALORE core → contract`.
3. **Barriera della webview**: `ui-persistenza-ospite` — niente `core/dati/`, `core/azioni/`, `core/apparato/` da `ui/`.
4. **Sotto-strati di `core/`**: `dominio-puro`, `i18n-sotto-a-tutti`, `controlli-leggeri`.
5. **Cicli** fra import di valore (`ciclo`) e import relativi che non trovano il file (`non-risolto`).
6. **Alias degli strati** (ADR-55): nel TypeScript un import che risale si scrive `#core/…`, `#contract/…`, `#desktop/…`, `#ui/…`; un `'../'` è un guasto. `./` resta relativo.

Le eccezioni stanno in `DEROGHE` di `tools/layers.mjs`, ognuna col motivo; oggi nessuna.

Quando `npm run layers` fallisce:
- Individuare la riga segnalata: `file:riga GRAVITÀ strato_sorgente → strato_bersaglio`.
- Se si tratta di un tipo importato come valore, correggere con `import type { ... }`.
- Se si tratta di una logica necessaria in due punti diversi, spostare il codice comune nello strato inferiore o passare i dati attraverso i parametri di funzione.
- Non inserire deroghe in `tools/layers.mjs` se non espressamente autorizzate da una decisione architetturale (`docs/DECISIONI.md`).

### 2. Le regole ESLint `no-restricted-imports` (`eslint.config.mjs`)
Il linter verifica le restrizioni a livello di singolo file prima e durante lo sviluppo:
- **`core/dominio/`** non ha un blocco ESLint: la purezza la controlla `dominio-puro` di `.dependency-cruiser.cjs` (niente da fuori di sé, tranne `core/i18n/`).
- **`ui/**/*.ts`**: vieta `node:*` ed `electron`. Previene errori catastrofici in produzione causati da bundle browser che referenziano API native Node inesistenti nella webview.
- **`core/dati/**/*.ts`, `core/azioni/**/*.ts`, `desktop/pannelli/**/*.ts`**: vieta l'importazione diretta di `electron`, imponendo il passaggio tramite l'astrazione `apparato` (`core/apparato/platform.ts` / `desktop/apparato/platform.ts`).
- **`desktop/shell/pages/**/*.ts`**: forza l'uso di `allowTypeImports: true` verso il main process, impedendo che codice di Electron finisca nei bundle delle finestre secondarie; da fuori di `shell/pages/` passano come valori solo `core/i18n/`, `core/controlli/` e le parole di tutti.
- **`core/controlli/**/*.ts`**: vieta `node:*`, `electron`, `apparato` e, da fuori della cartella, tutto tranne `core/i18n/`, `core/dominio/words.testi.ts` e i tipi di `contract/`.

### 3. La coerenza della documentazione: `npm run docs` (`tools/docs.mjs`)
Ogni volta che si documentano percorsi o script in questa skill o in `docs/`:
- Tutti i percorsi racchiusi tra backtick che iniziano con uno dei prefissi canonici (es. `core/`, `contract/`, `desktop/`, `ui/`, `cli/`, `tools/`, `docs/`) devono corrispondere a file realmente esistenti sul disco.
- Tutti i comandi eseguiti con `npm run` devono corrispondere a script dichiarati in `package.json`.
- Eseguire sempre `node tools/docs.mjs` per accertarsi che la documentazione sia perfettamente allineata al codice reale.
