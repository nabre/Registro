---
name: architettura
description: >
  I cinque strati di Regiclass (core, contract, desktop, ui, cli),
  le regole di isolamento e dipendenza verificate da `npm run layers`,
  la purezza di `core/dominio/`, e la guida decisionale su dove collocare ogni nuovo file.
  Da usare ogni volta che si aggiunge, sposta o scompone un modulo, si disegna una nuova
  funzione, si tocca un import fra strati diversi, o `npm run layers` segnala una violazione.
---

# L'architettura a cinque strati di Regiclass

Regiclass è organizzato in **cinque strati concentrici**, ciascuno con un perimetro di responsabilità rigoroso e confini d'importazione non negoziabili. L'architettura garantisce l'indipendenza della logica di scuola dalla tecnologia grafica (Electron e DOM), la portabilità e velocità dei test, la robustezza del runtime e la chiarezza contrattuale delle API.

I confini tra gli strati non sono convenzioni verbali: sono verificati automaticamente da `npm run layers` (`tools/layers.mjs`) e dalle regole di linting in `eslint.config.mjs`.

```
                    ┌────────────────────────┐
                    │          cli/          │ (autonoma, zero import applicativi)
                    └────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                             desktop/                             │
│     desktop/shell/   desktop/apparato/   desktop/pannelli/       │
│     desktop/transports/   desktop/widget/   desktop/avvio.ts     │
└───────────────┬──────────────────────────────────┬───────────────┘
                │                                  │
                ▼                                  │
┌───────────────────────────────┐                  │
│           contract/           │                  │
│ protocollo.ts   manifesto.ts  │                  │
│ schemas.ts      procedure/    │                  │
│ centralino.ts   bridge.ts     │                  │
│ tools.ts                      │                  │
└───────────────┬───────────────┘                  │
                │ (import type da core)            │
                ▼                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                              core/                               │
│  core/dominio/ (puro)   core/dati/   core/azioni/                │
│  core/i18n/             core/apparato/                           │
└───────────────────────────────▲──────────────────────────────────┘
                                │ (solo core/dominio/ e core/i18n/)
┌───────────────────────────────┴──────────────────────────────────┐
│                              ui/                                 │
│  ui/pannello/ (views/, forms/, components/, bridge.ts, dom.ts)   │
│  (webview Chromium, nessun accesso a Node né Electron)           │
└──────────────────────────────────────────────────────────────────┘
```

---

## 1. I cinque strati e le loro responsabilità

### `core/`: Logica e dati indipendenti dall'ambiente grafico
È il cuore del programma, slegato da qualsiasi interfaccia grafica o runtime desktop. Non conosce Electron né il DOM del browser. È diviso in cinque sotto-aree:

1. **`core/dominio/` (puro)**:
   - Contiene il modello dei dati scolastici (`core/dominio/models.ts`), il calcolo del calendario e orari (`core/dominio/dates.ts`, `core/dominio/calculations.ts`), la validazione e normalizzazione (`core/dominio/validation.ts`), le regole di cancellazione a cascata, e le migrazioni di schema (`core/dominio/upgrades.ts`).
   - **Purezza assoluta**: non importa nulla da fuori di sé (zero dipendenze da `node:*`, zero da `electron`, zero dall'`apparato`, zero percorsi relativi `../` verso altri strati, con l'unica eccezione di `core/i18n/` per i testi).
   - Segue il pattern: *calcolo puro + applica mutante*.
   - Tutte le sue prove girano all'istante con `npm test` o `node --test` senza finestre né dischi finti.
2. **`core/dati/` (persistenza e I/O)**:
   - Gestisce la persistenza del documento `.regi`: lettura e scrittura dell'archivio (`core/dati/archive.ts`), compressione e pacchetto ZIP (`core/dati/package.ts`, `core/dati/zip.ts`), materializzazione su disco (`core/dati/store.ts`).
   - Gestisce i formati e i servizi esterni: generazione PDF (`core/dati/pdf.ts`, `core/dati/reportsPdf.ts`), invio posta ed Exchange (`core/dati/mail.ts`, `core/dati/exchange.ts`, `core/dati/oauth.ts`), modelli di lezione (`core/dati/templates.ts`), geocodifica Nominatim (`core/dati/geocoding.ts`), OCR (`core/dati/ocr.ts`).
   - Non importa mai direttamente `electron`: per interagire con l'ambiente host passa dall'astrazione di `core/apparato/`.
3. **`core/azioni/` (gestori applicativi)**:
   - I gestori applicativi che eseguono le mutazioni richieste dall'utente.
   - Ogni file implementa una porzione dell'unione `Azione` definita nel contratto.
   - Riceve il contesto di mutazione (`core/azioni/context.ts`), valida lo stato, applica le modifiche di dominio e dichiara esplicitamente le collezioni JSON modificate tramite `context.modifica(op, collezioni)`.
4. **`core/i18n/` (gestione delle lingue)**:
   - Il dispositivo multilingua di Regiclass (ADR-38).
   - Gestisce lo stato della lingua (`core/i18n/state.ts`) e le utilità per le pagine (`core/i18n/page.ts`).
   - Sta sotto tutti gli altri moduli e non dipende da nessun altro strato.
5. **`core/apparato/` (interfaccia verso l'host)**:
   - Definisce i contratti astratti delle capacità fornite dal sistema ospite (`core/apparato/platform.ts`): accesso al filesystem, finestre di dialogo, impostazioni di configurazione, archivio segreti, bus eventi.
   - A runtime, la parola chiave `apparato` viene risolta tramite alias verso l'implementazione reale in `desktop/apparato/platform.ts`. Nelle prove senza Electron, viene rediretta verso implementazioni simulate.

### `contract/`: La superficie contrattuale
Rappresenta il contratto esplicito tra il motore applicativo, l'interfaccia utente e l'esterno:

- `contract/protocollo.ts`: Definisce le buste dei messaggi IPC scambiati via canale tra il processo main e il frontend (`Richiesta`, `Risposta`, `Domanda`, `Riscontro`, `Notifica`).
- `contract/manifesto.ts`: Il manifesto delle impostazioni del programma e del documento, con schemi di tipo, valori predefiniti, sezioni di preferenza e definizioni dei comandi.
- `contract/schemas.ts`: Schemi di validazione dei payload e dei formati di scambio.
- `contract/procedure/`: L'insieme delle procedure invocabili dall'esterno (via API JSON-RPC, CLI o assistente LLM), ciascuna dotata di schema Zod d'ingresso rigoroso e registrazione centralizzata.
- `contract/centralino.ts`: Il router che smista le chiamate contrattuali e instradamento richieste verso i rispettivi gestori.
- `contract/bridge.ts`: Interfaccia astratta di comunicazione IPC lato client/server.
- `contract/tools.ts`: Definizione e serializzazione degli strumenti esposti all'assistente e ai modelli linguistici.

### `desktop/`: L'ambiente Electron e host di sistema
Racchiude il processo principale (main process) Electron e le integrazioni con il sistema operativo Windows:

- `desktop/shell/`: Il guscio dell'applicazione. Punto d'ingresso Electron (`desktop/shell/main.ts`), ciclo di vita delle finestre native (`desktop/shell/windows/`), protocollo personalizzato `registro://` (`desktop/shell/protocol/`), script di preload sicuro per Chromium (`desktop/shell/preload.ts`), menu applicativo, scorciatoie globali e associazioni di estensioni file in Windows.
- `desktop/apparato/`: Implementazione reale dell'interfaccia host per Electron (`desktop/apparato/platform.ts`), gestione dei dialoghi di sistema (`desktop/apparato/dialogs.ts`), gestione cartelle utente e percorsi di configurazione.
- `desktop/pannelli/`: Gestione del ciclo di vita delle webview e coordinamento dei pannelli (`desktop/pannelli/panel.ts` per il pannello principale, `desktop/pannelli/projection.ts` per la finestra proiettore, `desktop/pannelli/assistant.ts` per l'assistente, `desktop/pannelli/page.ts` per la costruzione della pagina HTML e header CSP).
- `desktop/transports/`: I canali di trasporto dei dati verso l'esterno o sottoprocessi, tra cui il condotto IPC e socket per l'assistente (`desktop/transports/conduit.ts`, `desktop/transports/assistant.ts`).
- `desktop/widget/`: Componenti dell'area di notifica di Windows, tra cui l'icona nel vassoio di sistema (`desktop/widget/tray.ts`) e le notifiche toast per promemoria (`desktop/widget/reminders.ts`).
- `desktop/avvio.ts`: Modulo orchestratore che avvia i servizi, apre il documento e coordina l'inizializzazione dell'applicazione desktop.

### `ui/`: Il frontend del pannello in webview (`ui/pannello/`)
È l'interfaccia grafica utente renderizzata all'interno della webview di Chromium. È un'applicazione web autonoma priva di framework pesante:

- Organizzazione interna:
  - `ui/pannello/views/` (`views/`): le viste complete dell'applicazione (orario, appello, valutazioni, studenti, ecc.).
  - `ui/pannello/forms/` (`forms/`): i form di inserimento e modifica dati con validazione visuale.
  - `ui/pannello/components/` (`components/`): componenti grafici riutilizzabili (pulsanti, schede, modali, tabelle).
  - `ui/pannello/bridge.ts` (`bridge.ts`): il ponte di comunicazione che invia le richieste IPC al main process e gestisce lo stato di ritorno.
  - `ui/pannello/dom.ts` (`dom.ts`): motore di rendering DOM con funzione `h()` e ripristino chirurgico di cursore, fuoco e scorrimento.
- **Isolamento stringente**: gira dentro una sandbox Chromium con CSP `default-src 'none'`. Non ha accesso a Node (`node:*`) né a moduli Electron. Non può importare moduli da `core/dati/`, `core/azioni/` o `core/apparato/`. Comunica con il sistema esclusivamente tramite messaggi IPC scambiati sul ponte `ui/pannello/bridge.ts`.

### `cli/`: La linea di comando
Fornisce strumenti a riga di comando per operare sul registro e compiere interventi di manutenzione:

- `cli/registro.mjs`: Script CLI principale per ispezionare archivi, verificare lo stato, estrarre dati ed eseguire operazioni automatiche.
- `cli/disinstalla.mjs`: Script per la disinstallazione pulita e rimozione di chiavi di registro e cache.
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
| **`ui/`** | `ui/`, `contract/`, `core/dominio/`, `core/i18n/` | `ui/`, `contract/`, `core/` | `desktop/`, `cli/`, `node:*`, `electron`, `core/dati/`, `core/azioni/`, `core/apparato/` |
| **`cli/`** | `cli/` | `cli/` | `core/`, `contract/`, `desktop/`, `ui/` (autonomia assoluta) |

### L'eccezione contrattuale di `core/`: SOLO tipi (`import type`)

Una regola fondamentale del design di Regiclass riguarda la relazione tra `core/` e `contract/`:

- I gestori in `core/azioni/` e la logica in `core/` hanno la necessità di conoscere la firma delle azioni o i tipi dei payload (es. `Azione`, `Risposta`).
- Tuttavia, `core/` non deve avere dipendenze di valore a runtime da `contract/`. Un import di valore violerebbe il principio che `core/` è alla base di tutto e non dipende da contratti esterni.
- Di conseguenza, `tools/layers.mjs` consente a `core/` di importare da `contract/` **esclusivamente tipi TypeScript**:

```ts
// CORRETTO (import di solo tipo, sparisce alla compilazione):
import type { Azione, Risposta } from '../contract/protocollo.js'
import { type SchemiRegistro } from '../contract/schemas.js'

// ERRORE GRAVE (import di valore a runtime, intercettato da npm run layers):
import { COMANDI } from '../contract/manifesto.js'
import { inviaMessaggio } from '../contract/bridge.js'
```

### La barriera di sicurezza di `ui/`

Sebbene `ui/` possa importare da `core/`, la protezione `VIETATI_A_UI` in `tools/layers.mjs` e le regole in `eslint.config.mjs` impediscono categoricamente alla webview di importare:
- `core/dati/`: la webview non può aprire file, creare ZIP né accedere al filesystem;
- `core/azioni/`: la webview non può mutare direttamente lo stato in memoria, deve passare da una `Richiesta` IPC;
- `core/apparato/`: la webview non può interagire con l'host se non tramite il ponte.

Alla webview è concesso importare solo funzioni pure di calcolo da `core/dominio/` e stringhe da `core/i18n/`.

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
├── È una procedura esposta con schema Zod/JSON all'API, all'assistente o alla riga di comando?
│   └── ➔ contract/procedure/ (contratto esplicito con schema d'ingresso)
│
├── È un protocollo IPC, schema globale di messaggi o definizione delle impostazioni?
│   └── ➔ contract/ (contract/protocollo.ts, contract/schemas.ts, contract/manifesto.ts)
│
├── È una finestra nativa, menu di sistema, scorciatoia OS, tray icon o protocollo registro://?
│   └── ➔ desktop/shell/ o desktop/widget/ o desktop/apparato/ (main process Electron)
│
├── È una vista a schermo, tabella, form, pulsante o componente interattivo del pannello?
│   └── ➔ ui/pannello/ (ui/pannello/views/, ui/pannello/forms/, ui/pannello/components/)
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
| Disegnare la griglia dell'orario settimanale | `ui/pannello/views/` | Componente grafico eseguito nel DOM della webview. |
| Scrivere uno script per disinstallare o pulire dati da terminale | `cli/` | Script eseguibile senza interfaccia grafica e indipendente dalla compilazione. |

---

## 4. Verifica automatica: `npm run layers` ed ESLint

La correttezza architettonica del progetto è garantita da due livelli di controllo statico:

### 1. Il controllo di isolamento: `npm run layers` (`tools/layers.mjs`)
Lo strumento proprietario `tools/layers.mjs` ispeziona tutti i sorgenti `.ts` e `.mjs` del progetto e applica le seguenti verifiche:
1. **Verifica dei confini di strato**: mappa ogni file sorgente sulla tabella `STRATI` e verifica ogni istruzione `import` contro la matrice `PERMESSI`.
2. **Discriminazione tipo vs valore**: controlla se un import importa esclusivamente tipi TypeScript (`soloTipo`). Se un modulo `core/` tenta di importare un valore da `contract/`, lo strumento blocca la build segnalando `VALORE core → contract`.
3. **Controllo webview (`VIETATI_A_UI`)**: assicura che nessun file in `ui/` tenti di importare moduli da `core/dati/`, `core/azioni/` o `core/apparato/`.
4. **Rilevamento cicli di importazione**: costruisce il grafo diretto degli import di valore tra file e rileva qualsiasi ciclo (`cicli()`). La presenza di anche un solo ciclo di importazione fa fallire il comando, poiché i cicli portano a instabilità e problemi di inizializzazione a livello di modulo.

Quando `npm run layers` fallisce:
- Individuare la riga segnalata: `file:riga GRAVITÀ strato_sorgente → strato_bersaglio`.
- Se si tratta di un tipo importato come valore, correggere con `import type { ... }`.
- Se si tratta di una logica necessaria in due punti diversi, spostare il codice comune nello strato inferiore o passare i dati attraverso i parametri di funzione.
- Non inserire deroghe in `tools/layers.mjs` se non espressamente autorizzate da una decisione architetturale (`docs/DECISIONI.md`).

### 2. Le regole ESLint `no-restricted-imports` (`eslint.config.mjs`)
Il linter verifica le restrizioni a livello di singolo file prima e durante lo sviluppo:
- **`core/dominio/**/*.ts`**: vieta `node:*`, `electron`, `apparato` e percorsi relativi risalenti (`../*`). Il dominio deve rimanere intoccato da runtime esterni.
- **`ui/**/*.ts`**: vieta `node:*` ed `electron`. Previene errori catastrofici in produzione causati da bundle browser che referenziano API native Node inesistenti nella webview.
- **`core/dati/**/*.ts`, `core/azioni/**/*.ts`, `desktop/pannelli/**/*.ts`**: vieta l'importazione diretta di `electron`, imponendo il passaggio tramite l'astrazione `apparato` (`core/apparato/platform.ts` / `desktop/apparato/platform.ts`).
- **`desktop/shell/pages/**/*.ts`**: forza l'uso di `allowTypeImports: true` verso il main process, impedendo che codice di Electron finisca nei bundle delle finestre secondarie.

### 3. La coerenza della documentazione: `npm run docs` (`tools/docs.mjs`)
Ogni volta che si documentano percorsi o script in questa skill o in `docs/`:
- Tutti i percorsi racchiusi tra backtick che iniziano con uno dei prefissi canonici (es. `core/`, `contract/`, `desktop/`, `ui/`, `cli/`, `tools/`, `docs/`) devono corrispondere a file realmente esistenti sul disco.
- Tutti i comandi eseguiti con `npm run` devono corrispondere a script dichiarati in `package.json`.
- Eseguire sempre `node tools/docs.mjs` per accertarsi che la documentazione sia perfettamente allineata al codice reale.
