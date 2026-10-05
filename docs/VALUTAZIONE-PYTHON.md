# Valutazione: convertire Regiklass in Python

Misure prese dall'albero il 2026-10-01 (verso la 1.5.0, con i progetti).
Destinatario: chi decide. Le cifre sono righe di file, non stime.

## 1. Sintesi

**Non conviene.** Né riscrittura totale, né backend Python sotto la UI di oggi.
Il progetto è ~325 mila righe TypeScript con ~3 200 prove, un formato `.regi`
scritto in casa e un'interfaccia che calcola con il dominio TypeScript (727
import da `core/dominio/`). Python non porta niente che oggi manchi: LLM, OCR,
PDF, posta e OneDrive sono già locali e funzionanti. Lo sforzo minimo serio
(scenario b) è 20–40 persona-mesi per arrivare dove si è già. Unica parte
ragionevole in Python: strumenti di sviluppo isolati, come già
`tools/calendario/estrai_calendario_ticino.py`.

## 2. Il progetto oggi in numeri

| Strato | File | Righe totali | di cui cataloghi `*.testi.ts` | Codice vero |
| --- | --- | --- | --- | --- |
| `core/` | 229 TS | 65 400 | 10 900 | 54 500 |
| `contract/` | 377 TS | 30 500 | 11 800 | 18 700 |
| `desktop/` | 84 TS + 14 CSS/HTML | 18 500 + 1 700 | 3 000 | 15 500 |
| `ui/` | 306 TS + 42 CSS | 117 900 + 16 200 | 51 200 | 66 700 |
| `cli/` | 15 MJS | 2 200 | (catalogo nudo) | 2 200 |
| `tools/` | 26 MJS + 1 PY | 4 600 | — | 4 600 |
| `tests/` | 251 MJS + 54 TS | 65 900 | — | 65 900 |
| `templates/` | 19 TPL | 1 400 | — | 1 400 |

- Codice di prodotto senza cataloghi né prove: **~158 000 righe TS + 18 000 CSS**.
- Cataloghi in quattro lingue: **~77 000 righe**.
- Prove: 236 file `node:test` con **~3 200 casi**; 44 file Playwright con **~83
  casi** sull'app vera (`tests/interfaccia/`); prove per proprietà
  (fast-check), mutanti (Stryker), campioni del formato `tests/samples/formato/`.
- Contratto: al 2026-10-01, 226 procedure e 184 azioni (i conti di oggi in
  `docs/INDICE.md`), JSON Schema per ognuna, catalogo `resources/tools.json`
  per CLI e assistente.
- Dipendenze di programma, oggi: `electron-updater`, `node-llama-cpp`, `immer`,
  `react`, `react-dom` (ADR-56, che ha tolto `idiomorph`), `valibot`,
  `@tanstack/virtual-core`. In bundle (dev): `@cantoo/pdf-lib`,
  `pdfjs-dist`. ZIP, OAuth, SMTP, JSON-RPC, i18n: scritti in casa.
- Controlli statici propri: layers, census, collections, forms, buttons,
  procedures, docs, i18n, licenze.

### Funzioni legate a Electron / Chromium / Node

| Funzione | Dove | Dipende da |
| --- | --- | --- |
| Pannello (UI intera) | `ui/`, `ui/main.tsx` | Chromium: DOM, `moveBefore`, `Temporal` nativo, CSP |
| Finestre, figlie, proiezione | `desktop/apparato/windows.ts` | `BrowserWindow` |
| Vassoio, promemoria | `desktop/apparato/tray.ts`, `desktop/widget/tray.ts` | `Tray`, `Menu` |
| Notifiche | `desktop/apparato/notifications.ts` | `Notification`, AppUserModelID |
| Aggiornamenti firmati | `desktop/apparato/updates.ts`, `desktop/apparato/updateInstaller.ts`, `desktop/apparato/updateMac.ts` | electron-updater, NSIS, portabile, dmg/zip, AppImage/deb/rpm |
| Protocollo `registro://` (file, tessere della mappa) | `desktop/shell/protocol/fileProtocol.ts`, `desktop/shell/protocol/tiles.ts` | `protocol.handle` |
| Condotto JSON-RPC | `desktop/transports/conduit.ts` | `node:net` named pipe / socket unix, HMAC |
| CLI `regi` | `cli/main.mjs` | Node dentro Electron (`ELECTRON_RUN_AS_NODE`) |
| PDF scritti | `core/dati/reportsPdf.ts` | pdf-lib |
| PDF letti, smistamento | `core/dati/pdf.ts`, `core/dati/sorter.ts` | pdfjs |
| LLM locali, assistente | `core/dati/llamaCpp.ts`, `core/dati/llm.ts` | node-llama-cpp (binari nativi) |
| OCR | `core/dati/ocr.ts`, `core/dati/mtmd.ts` | `llama-mtmd-cli` esterno |
| Dettatura | `core/dati/voicebox.ts`, `ui/assistant/voice.ts` | voicebox locale via HTTP |
| Mappa | `desktop/shell/protocol/tiles.ts`, `core/dati/geocoding.ts` | rete dell'host, CSP |
| Posta, OAuth Microsoft | `core/dati/mail.ts`, `core/dati/oauth.ts` | `node:tls`, browser di sistema, PKCE |
| OneDrive / Graph | `core/dati/onedrive.ts`, `core/dati/oneDriveLocal.ts` | `fetch`, registro di Windows |
| Segreti | `desktop/apparato/secrets.ts` | `safeStorage` |
| Documento `.regi` | `core/dati/package.ts`, `core/dati/zip.ts` | `node:zlib`, ZIP incrementale nostro |

Isolamento già buono: Electron vive solo in `desktop/` (ADR-02). È il punto che
rende possibili gli scenari b e c. Ma `ui/` importa `core/` in 265 file: la UI
non è un client sottile, calcola da sé (decisione implicita 7).

## 3. Scenari

Ritmo usato per le stime: **2 000–4 000 righe portate per persona-mese**,
comprese prove e verifica, con assistenza di un modello. Sotto quella soglia
c'è il lavoro nuovo (disegno di UI); sopra, la traduzione meccanica.

### a) Riscrittura totale nativa (Qt)

- **Architettura.** PySide6 (Qt 6, LGPLv3) per finestre, vassoio, notifiche;
  dominio e dati in Python puro; pydantic v2 per i modelli e gli schemi.
- **Librerie.** PySide6 (non PyQt6: GPL o commerciale); pydantic; zipfile + zlib
  per lo ZIP (ma l'accodare incrementale va riscritto a mano); reportlab o
  WeasyPrint per i PDF; pypdf / pypdfium2 per leggerli; llama-cpp-python (MIT,
  release regolari nel 2026); msal per Microsoft; smtplib con XOAUTH2;
  QtWebEngine o QtLocation per la mappa; Nuitka (Apache-2) o PyInstaller per
  il pacchetto; tufup per gli aggiornamenti; Babel/gettext o dizionari per le
  lingue.
- **Si riusa.** Il formato `.regi` come specifica; i campioni del formato come
  prove d'oro; i testi (convertiti); i modelli `.tpl` solo se si riscrive il
  motore che li legge.
- **Si riscrive.** Tutto: 158 000 righe + UI ridisegnata in widget (66 700 TS +
  16 200 CSS non si traducono, si ridisegnano) + 66 000 righe di prove.
- **Sforzo.** ~225 000 righe da rifare / 3 000 ≈ 75; forchetta **40–80
  persona-mesi**. Più 1–2 per i cataloghi.

### b) Backend Python + UI web esistente in pywebview

- **Architettura.** pywebview (BSD) apre il pannello di oggi in WebView2
  (Windows), WKWebView (macOS), WebKitGTK o QtWebEngine (Linux). Python fa
  host, dati, procedure. Il ponte `ui/bridge.ts` parla con
  `js_api` di pywebview o con un FastAPI locale.
- **Librerie.** pywebview; FastAPI + uvicorn (o asyncio puro) per il condotto
  su named pipe; pydantic per gli schemi (genera JSON Schema 2020-12);
  le stesse di (a) per PDF, LLM, Microsoft, pacchetto.
- **Si riusa.** UI web (66 700 righe), CSS, cataloghi della UI, prove
  Playwright solo in parte (`_electron.launch` non vale più).
- **Si riscrive.** `core/` (54 500), `contract/` (18 700), `desktop/` (15 500),
  prove di dominio e API (~47 000), cataloghi lato host (~26 000, meccanico).
- **Il nodo.** La UI importa `core/dominio/` e `core/i18n/` in 265 file. O il
  dominio resta in TypeScript per la UI **e** si rifà in Python per l'host
  (due implementazioni dello stesso calcolo, da tenere uguali per sempre), o
  ogni calcolo della UI diventa una chiamata (latenza, flicker: proprio quel
  che la decisione implicita 7 evita). Nessuna delle due è accettabile.
- **Altri attriti.** WebKit non è Chromium: `moveBefore`, `Temporal` nativo,
  resa CSS diversa su macOS e Linux. Nessun `protocol.handle`: le tessere e i
  file passano da un server locale (porta TCP, contro la regola del condotto
  «mai una porta di rete»), o da schemi personalizzati diversi per motore.
- **Sforzo.** ~135 000 righe / 3 000 ≈ 45, meno la parte meccanica: **20–40
  persona-mesi**, più il costo perpetuo del dominio doppio.

### c) Ibrido: resta Electron/TS, Python come servizio

- **Architettura.** Un processo Python a lato (sidecar) per un compito che
  Python fa meglio, chiamato via pipe come oggi voicebox via HTTP.
- **Candidati.** OCR (pytesseract, docTR), estrazione da PDF (pdfplumber),
  LLM (llama-cpp-python).
- **Verifica dei candidati.** Nessuno ha un vuoto da colmare: OCR e LLM passano
  già da llama.cpp locale (ADR-25); i PDF da pdfjs. Un sidecar aggiunge un
  secondo runtime (~30–80 MB), un secondo pacchetto da firmare, un secondo
  albero di licenze, un processo da avviare e uccidere.
- **Sforzo.** 0,5–2 persona-mesi per servizio. **Oggi: nessuno.** La dettatura
  mostra già il modello giusto: servizio esterno, installato a parte, parlato
  per HTTP locale. Se domani serve Python, si fa così, senza impacchettarlo.

### d) Solo CLI e strumenti in Python

- **CLI (`cli/`, 2 200 righe).** Oggi gira con il Node dentro Electron: zero
  installazioni per il docente (D10). In Python servirebbe un interprete sul
  computer della scuola o un eseguibile in più da firmare. **Peggiora.** 0,5–1
  persona-mese per un guadagno negativo.
- **Strumenti (`tools/`, 4 600 righe).** Leggono `package.json`, lanciano
  esbuild, si tipizzano con JSDoc in `npm run typecheck`. In Python perderebbero
  tutto questo. Ha senso solo per strumenti a sé stanti, che producono un file
  generato: come lo script del calendario ticinese, già in Python. 1–2
  persona-mesi se si volesse tutto, senza beneficio.

## 4. Rischi e benefici per scenario

| | a) Qt totale | b) pywebview | c) sidecar | d) CLI/strumenti |
| --- | --- | --- | --- | --- |
| Sforzo | 40–80 p-m | 20–40 p-m + dominio doppio | 0,5–2 p-m a servizio | 0,5–2 p-m |
| Regressioni | altissime: 184 azioni rifatte | alte nell'host, sottili nella UI | basse | basse |
| Prove | si perdono quasi tutte, si riscrivono | si perdono quelle di host e API e `_electron.launch` | restano | restano |
| Documenti `.regi` già scritti | rischio vero: ZIP incrementale, storico, passi del formato da rifare byte per byte | idem | nessuno | nessuno |
| Aggiornamenti e firma | da rifare: niente equivalente maturo di electron-updater; tufup + NSIS a mano | idem | secondo binario da firmare | CLI: binario in più da firmare |
| Installazione senza diritti | possibile (per utente), da riprovare | possibile; WebView2 c'è su Windows 11, su 10 non sempre | invariata | invariata |
| Portabile | Nuitka/PyInstaller onefile: estrae in temporanei, antivirus sospettosi | idem | idem per il sidecar | idem |
| Dimensione pacchetto | ~80–150 MB (Qt + WebEngine se mappa) | ~30–60 MB: unico guadagno | +30–80 MB | +20 MB |
| Avvio | Qt rapido; onefile lento | rapido | invariato | CLI più lenta se onefile |
| Tipizzazione | mypy/pyright: buoni ma opzionali; niente `Forma<T>` per i cataloghi | due linguaggi | due linguaggi | perde JSDoc in `npm run typecheck` |
| Beneficio reale | aspetto nativo; nessuno funzionale | pacchetto più piccolo | nessuno oggi | nessuno |

## 5. Confronto

| Criterio | Oggi (Electron/TS) | a) Qt | b) pywebview | c) sidecar | d) CLI/strumenti |
| --- | --- | --- | --- | --- | --- |
| Mantenibilità | alta: un linguaggio, strati verificati | media, dopo anni | bassa: dominio doppio | media | media |
| Stabilità | provata da ~3 200 casi | da ricostruire | da ricostruire | invariata | invariata |
| Prestazioni | buone; Chromium pesante in memoria | migliori in memoria | buone su Windows, variabili altrove | invariate | invariate |
| Distribuzione | matura: NSIS, portabile, mac, linux, firma SignPath | da rifare | da rifare | più complessa | più complessa |
| Ecosistema | npm, Electron 44, Playwright | buono (Qt, scientifico) | giovane per desktop | buono | buono |
| Competenze | quelle del progetto | nuove (Qt) | due insiemi | due insiemi | due insiemi |
| Costo | 0 | molto alto | alto + perpetuo | basso | basso, inutile |

## 6. Che cosa si perderebbe in concreto

- **Prove.** ~3 200 casi `node:test`, ~83 Playwright con `_electron.launch`,
  proprietà fast-check, mutanti, banchi finti (`tests/helpers/fake-electron.mjs`).
  In (a) tutte; in (b) quelle di host e API.
- **Cataloghi tipizzati.** `catalogo(it, { de, fr, en })` con `Forma<T>` fa
  fallire la compilazione se una lingua perde una chiave (ADR-38). Con gettext
  o dizionari diventa una prova a run-time.
- **Lessico italiano** (`core/dominio/lexicon.ts`): articoli, preposizioni,
  accordi. Nessuna libreria Python lo sostituisce (ADR-50, criterio 4).
- **Contratto e condotto.** `definisci()`, Standard Schema dietro
  `contract/schemas.ts`, `resources/tools.json` generato, HMAC sul condotto: da
  rifare e riprovare in sicurezza.
- **Strati verificati** (`npm run layers`, ESLint per cartella): in Python
  servono import-linter o simili, da riconfigurare.
- **immer**: annulla e storico dalle patch (ADR-50, passo 2). In Python non c'è
  un equivalente di pari maturità.
- **Distribuzione.** Fuses, firma, `nsis.guid` fermo (ADR-40), associazione
  `.regi`, aggiornamento portabile e mac già provati.
- **CLI senza installazioni** (D10).

## 7. Quando la risposta cambierebbe

- Electron diventa inutilizzabile a scuola (bloccato dai criteri IT, firma non
  più ottenibile) e un pacchetto Qt firmato invece passa.
- Serve una funzione che esiste **solo** in Python e non come programma
  esterno (un modello di riconoscimento senza port in llama.cpp, uno strumento
  scientifico): allora scenario (c), come servizio esterno alla voicebox.
- Il progetto passa a più utenti o a un server (decisione implicita 1 «un solo
  scrittore» cade): allora un backend nuovo va pensato da capo, e Python
  (FastAPI, SQLAlchemy) è un candidato serio fra altri.
- Chi mantiene il progetto non sa più TypeScript e sa Python: costo delle
  competenze ribaltato. Anche così, (a) resta 40–80 p-m.
- La memoria di Chromium diventa un problema misurato sui PC della scuola: si
  guarda prima Tauri (Rust + WebView di sistema, UI riusata), non Python.

## 8. Se si decidesse comunque: piano a fasi (strangler)

Regola: un passo alla volta, `npm run ci` verde dopo ognuno, documenti `.regi`
mai riscritti da codice Python finché non supera i campioni.

1. **Specifica eseguibile del formato.** Lettore Python di sola lettura per
   `.regi` (ZIP + JSON + storico). Prova: legge tutti i campioni di
   `tests/samples/formato/` e dà lo stesso JSON normalizzato del TypeScript.
   Costo 1 p-m. Utile anche se ci si ferma qui (strumenti di analisi).
2. **Client Python del condotto.** Libreria che parla JSON-RPC sulla pipe di
   `desktop/transports/conduit.ts` e legge `resources/tools.json`. Nessun
   rischio: l'app non cambia. 0,5 p-m.
3. **Primo servizio a lato** (solo se c'è un bisogno vero): processo esterno,
   indirizzo locale, come voicebox (ADR-35). 1–2 p-m.
4. **Dominio puro in Python**, modulo per modulo, con prove incrociate: stesse
   entrate, stesse uscite di `core/dominio/`. Solo qui si vede il costo vero.
5. **Scrittura dei `.regi`** da Python, prima su copie, confrontando byte e
   rilettura con il TypeScript.
6. **Guscio.** Solo alla fine si sceglie fra Qt e pywebview; il TypeScript si
   spegne quando l'ultima procedura ha un gemello verde.

Fermarsi dopo il passo 2 è già un buon risultato: Python come cliente, non come
sostituto.
