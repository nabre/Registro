# Piano: interfaccia in React

Stato: **fatto** 2026-10-05 (ADR-56 in [DECISIONI](DECISIONI.md)). Il piano
resta come racconto della conversione; i §§ 2–10 descrivono il punto di
partenza e la strada scelta, il § 11 com'è andata. Come si scrive oggi: skill
`react`. Fonte: giro di sciame
2026-10-05, quattro esplorazioni parallele in sola lettura (motore del
pannello; viste, moduli e componenti; build, finestre e CSP; prove e
controlli statici). Ogni riga cita il posto nel codice. Le cifre vengono da
`wc -l` e grep sull'albero del 2026-10-05 (dopo 3527154), non da stime.

Obiettivo: React diventa il modo di disegnare **tutte** le pagine del renderer,
non un'isola. Vincolo: nessuna funzione persa, nessun cambio di comportamento
non chiesto (D2), `npm run ci` verde dopo ogni passo (ADR-50 criterio 6).

## 1. Sintesi

- **Fattibile, a passi, senza fermare il prodotto.** Strategia «strangolatore»:
  React prende prima la radice e il telaio, le viste vecchie girano dentro un
  adattatore (`<Vecchio>`) con il motore di oggi, poi si convertono una alla
  volta. A ogni passo l'app è intera e le prove passano.
- **Il contratto non cambia.** Ponte (`ui/bridge.ts`), protocollo, azioni,
  procedure, dominio, formato `.regi`, CSP, CLI: non si toccano. La migrazione
  sta tutta nel renderer.
- **Lo store resta nostro.** `stato` + `aggiorna`/`vai`/`iscriviti` di
  `ui/state.ts` è già uno store esterno; React lo legge con
  `useSyncExternalStore`. Niente Redux/Zustand, niente router (il router è
  `Posto`/`vai`, ADR-47), niente librerie di moduli, niente CSS-in-JS.
- **Il CSS resta com'è.** 16 475 righe in `ui/styles/`, ~1 819 classi BEM
  globali: `className` le usa tali e quali.
- **Decisione da prendere prima:** ADR-06, ADR-48 e ADR-50 criterio 4 vietano
  React per nome. Serve un ADR nuovo (bozza in § 10).
- **Dimensione:** ~69 000 righe in 195 file `.ts` di `ui/` (esclusi i
  cataloghi), ~2 431 chiamate `h(`, 278 gestori `onxxx:` in linea, 117 file
  che importano `stato`. Più ~1 300 righe di pagine native e ~1 000 di
  `core/controlli/`.
- **Sforzo:** 12 fasi, 6 ondate di viste. Ordine di grandezza 3–5
  persona-mesi; con giri di sciame su perimetri disgiunti, molto meno tempo di
  calendario. La parte costosa non è la sintassi (codemod), ma lo stato
  locale oggi tenuto nel DOM e nelle variabili di modulo.

## 2. Il punto di partenza

### 2.1 Motore del pannello

| Pezzo | Dove | Com'è oggi | In React |
| --- | --- | --- | --- |
| Disegno | `dom.ts` | `h(tag, attr, ...figli)` crea nodi **veri**; nessun VDOM | JSX; `h` resta solo per le viste vecchie fino a F11 |
| Ridisegno | `ui/main.tsx` `disegna()` | rAF → `guscio()` intero → `aggiornaElemento(radice, …)` con idiomorph | `createRoot(radice).render(<Guscio/>)`; riconciliazione |
| Telaio | `data-telaio` (guscio, contenuto, barre, `vista:<v>`) | nodi tenuti fra due disegni | componenti stabili, stessa forma; gli attributi restano per le prove |
| Isole | `ui/islands.ts` (32 usi in 16 file) | `isola(chiave, disegna)` rifà un sottoalbero | componente con iscrizione propria |
| Letture asincrone | `ui/asyncResources.ts` (2 consumatori) | `leggi()` → `vuoto/inVolo/pronto/errore`, poi `ridisegnaIsola` | hook `useRisorsa` sullo stesso deposito |
| Nodi pesanti | `data-tieni` (97 usi in 44 file) | iframe, PDF, canvas, editor non si ricreano | `key` stabile + `memo`; struttura dell'albero stabile |
| Fuoco e scorrimento | `data-fuoco` (96), `data-scorrimento` (37) | fotografati e rimessi a ogni disegno | React non ricrea i nodi: il ripristino serve solo al cambio di pagina e alla storia; gli attributi restano |
| Eventi | `gestisci` (delega su `document`, `currentTarget` falsato) | registro WeakMap per nodo | eventi sintetici React; `gestisci` resta per il vecchio |
| Orologio | `ui/clock.ts` `alMinuto`, `stato.adessoOra` scritto senza avviso | muove solo la riga di adesso | `useMinuto()` su un deposito a parte |
| Memo | `derivato()` in `ui/state.ts` | Proxy spia che **sostituisce** `stato.registro` durante il calcolo | resta finché il rendering è sincrono; poi selettori memoizzati sulle collezioni (registro immutabile via immer) |
| Modali | `ui/components/modal.tsx` | `.strato-modale` su `body`, fuori dal ciclo; valori letti dal DOM (`valoriModulo`) | portale React + pila; bozza in `useReducer` |
| Palette, menu, filo | `palette.ts`, `menu.ts`, `shell.ts` `mostraFiloDiLavoro` | su `body`, `replaceChildren` locale | portali |

### 2.2 Stato

- `stato` (`ui/state.ts`, 2 077 righe): un oggetto mutabile. Dati dell'host
  (`registro`, `avvisi`, `documenti`, `lavoro`, `posta`, `proiezione`…),
  navigazione (`posto`, `contesto` e i derivati piatti), stato della UI
  (schede, filtri, anteprime, sfoglio, calendario, `adessoData/Ora`, `rete`).
- Scritture regolari: `aggiorna` (con regole incrociate in `applica`), `vai`
  (solo il posto), `inBlocco` (una notifica sola).
- **Scritture dirette senza avviso: 12 righe in 8 file**
  (`stato.adessoOra`, `semestreId`, `lavoro`, `segnalibri`,
  `classiApertePersone`, `pagineScelte`, `zoomSfoglio`, `compitiScelti`,
  `sezioneImpostazioni`, più `caricaVoce`). Alcune apposta senza ridisegno:
  React non le vedrebbe. Vanno censite e decise una per una (F2).
- **Stato fuori da `stato`:** `let`/`Map` di modulo in 33 file di `views/`
  (voce già aperta in CANTIERE «Stato fuori da `stato`»): `languageModels.ts`
  (~12), `projectIntegration.ts` (3 Map), `calendar/editor.ts`, `help.ts`,
  `map.ts`, `people.ts`…; più `comandiInVolo` (`ui/commandBar.tsx`),
  `finestraMese/Settimana` (`ui/calendarNavigation.ts`), la `pila` delle
  modali, la `fila` della storia, `detta` di `ui/viewpoint.ts`.
- Dall'host: `'stato'`/`'differenze'` → `SeguitoDelRegistro`
  (`ui/statePatches.ts`, `applyPatches` di immer): il registro nuovo condivide
  le collezioni non toccate. **È la base per memoizzare per collezione.**

### 2.3 Viste, moduli, componenti

19 pagine di primo livello (`ui/shell.tsx` `vistaCorrente`, `ui/pages.ts`
`PAGINE`). Complessità (A+ = il più difficile):

| Vista | Righe | Cx | Pezzi difficili |
| --- | --- | --- | --- |
| `calendar/` | 3 861 | A+ | trascinamento e ridimensionamento ore, mese infinito, orologio, menu, 42 punti di DOM imperativo |
| `settings/` + `settings.ts` | 6 040 | A+ | firma `contenteditable` sanificata, DnD in carta intestata, IntersectionObserver, 49 punti imperativi |
| `sorting/` | 2 030 | A+ | DnD delle pagine, canvas pdfjs, IntersectionObserver, `body.trascino-pagine` |
| `lesson/` | 1 975 | A | appello e comportamento a griglia con tastiera e clic in volo, salvataggio all'uscita dal campo |
| `assessments/` | 1 882 | A | foglio dei voti, finestra virtuale, tastiera |
| `student/` | 1 649 | M | mappa, presenze |
| `projects/` + `projectIntegration.ts` | 2 287 | A | matrice livelli, compiti in volo, 15+8 modali, Map di modulo |
| `documents/` | 1 149 | A | iframe tenuti, anteprima CSV asincrona |
| `help.ts` (+ 6 015 righe di dati) | 1 115 | M | IntersectionObserver, figure SVG da stringa; i dati (ADR-05) non hanno DOM |
| `languageModels.ts` | 1 020 | A | DnD, scaricamenti in coda, ~12 `let` |
| `absences.ts`, `classTeacher.ts` | 949, 944 | A | miniature, bersagli di trascinamento, finestra virtuale |
| `courses.ts`, `check.ts`, `plans.ts` (+ `forms/plan.ts` editor in linea) | 844, 674, 598 | M/A | matrice, griglia con frecce, editor tenuto |
| `todo.ts`, `today.ts`, `classes.ts`, `assignments.ts`, `plansNavigator.ts`, `archive.ts`, `map.ts`, `people.ts`, `overview.ts` | 120–775 | B/M | finestra virtuale (people), SVG dei collegamenti (overview), iframe (archive), tasselli (map) |

`ui/forms/`: 25 file, 10 601 righe, **un solo meccanismo**: `moduloXxx()` →
`apriModale({corpo, alSalva})` → `salva()` di `ui/forms/common.tsx` →
`invia(azione)`; bozza nel DOM, letta per `name`. I più grossi:
`planActivity.ts` 1 202 (bozza ricomposta con `rimpiazza`), `project.ts`
1 058 (9 modali), `class.ts`, `lesson.ts`, `plan.ts`, `year.ts`.

`ui/components/`: 28 file, 5 320 righe. Consumatori: `base` 93 file, `icons`
57, `modal` 53, `notifications` 41, `filters` 27, `table` 20, `menu` 19,
`hint` 13; poi `virtualList` (3), `thumbnails` (4), `map` (2), `frame` (2),
`notes` (3, anche la proiezione), `palette`.

### 2.4 Altre superfici del renderer

| Superficie | Ingresso | Righe | Tecnica | Destino |
| --- | --- | --- | --- | --- |
| Proiezione | `ui/projection.tsx` | 820 | `h` + idiomorph, rAF | React (F10) |
| Assistente staccato | `ui/assistantWindow.tsx` + `ui/assistant/` | 134 + ~1 950 | `h`, stato di modulo in `chat.ts` condiviso col riquadro del pannello | React insieme al riquadro (F10) |
| Impostazioni nativa | `desktop/shell/pages/settings/settings.tsx` | 386 | `elemento()` + `core/controlli/` | React (F10), insieme a `core/controlli/` |
| Benvenuto | `desktop/shell/pages/welcome/welcome.tsx` | 300 | HTML statico + `perId` | React (F10) |
| Dialogo | `desktop/shell/pages/dialog/dialog.tsx` | 293 | `elemento()` | React (F10) |
| Avvio, lettore | `splash`, `reader` | 22, 23 | quasi niente | **restano senza React**: +190 kB per nulla |
| Strumenti dev | `desktop/shell/pages/dev/dev.tsx` | 210 | `elemento()` | facoltativo |

Fuori perimetro: `desktop/widget/` (solo main), `templates/` (testo → PDF),
`core/dati/` (PDF lato main), CLI (D10).

### 2.5 Rete di sicurezza

- **Playwright** (`tests/interfaccia/`): 47 spec, 91 prove. È la rete vera:
  `getByRole` 224 usi, messaggi del ponte controllati (`check.spunta`,
  `impostazioni.salva`, `progetto.salva`…), axe su ogni pagina in chiaro e
  scuro, quattro lingue, tempi (`tests/interfaccia/misure.spec.ts`: primo
  disegno ≤ 200 ms, ridisegno ≤ 50 ms o ≤ 3× la tabella corta).
- Il banco: `tests/helpers/uiStartup.ts` espone `window.prova` (stato,
  aggiorna, ridisegna, vai, PAGINE, datiGrandi…). **Contratto da tenere fermo.**
- Legati al motore di oggi: `morfosi.spec.ts` (prova `h` e idiomorph),
  identità dei nodi dopo ridisegno (`tabelle`, `telaioVista`, `persone`,
  `riquadri`, `documentiRiquadri`, `sfoglioIsole`), `data-isola`.
- Node (`tests/ui/`, 22 file, 262 prove): quasi tutte su logica pura
  (`place`, `memory`, `statePatches`, guida). Legate al DOM finto
  (`tests/helpers/domSintetico.mjs`, nessun jsdom): `attendanceClicks`,
  `commandBarInFlight`, `calendarEditor`, `externalCalendarLoading`.
- **Linea di base oggi rossa:** `comandiFuoriPagina › oggi_dal_menu`
  (ultimo giro) e `tests/interfaccia/navigation.spec.ts:155` (voce in
  CANTIERE § Prove).
- **Buchi:** nessuna prova e2e salva questi moduli: corso, consegna,
  valutazione, materia, orario, assenze, docente di classe, recupero,
  supplenza, risorse, evento ICS, OneDrive, importazione registro,
  calendario; parziali `planActivity`, `projectPlan`, `check`. Poche o
  nessuna sui gesti: trascinamenti del calendario e delle pagine, menu
  contestuali delle ore, annulla/ripeti, allegati e contatti, proiezione,
  assistente, scheda allievo, recuperi e restituzioni, modelli linguistici.

### 2.6 Strumenti che leggono il sorgente

Tutti passano da `fileSotto()` di `tools/common.mjs` con estensione `.ts` di
serie: **un `.tsx` oggi è invisibile a tutti.**

| Strumento | Che cosa legge | Cosa cambia |
| --- | --- | --- |
| `tools/forms.mjs` | `apriModale(` → `campo({nome})` contro `valori.x` | riscritto sull'AST: `name` dei campi JSX contro le chiavi della bozza |
| `tools/buttons.mjs` | `pulsante(`/`campo(` senza `al:` | regola sull'AST JSX (o regola ESLint locale) |
| `tools/i18n.mjs` | AST: letterali fuori catalogo | gestire `JsxText` (oggi ignorato: testo libero invisibile) e `JsxAttribute` (`aria-label`, `title` = testo; `className`, `data-*` = codice) |
| `tools/census.mjs` | export morti | `.tsx` |
| `tools/layers.mjs` | strati | `.tsx` in 3 punti |
| `tools/docs.mjs` | percorsi citati | 96 citazioni di `ui/….ts` nei documenti: aggiornare a ogni rinomina |
| `tests/counts.test.mjs` | `PAGINE` in `ui/pages.ts` con regex | tenere `PAGINE` in un `.ts` senza JSX |

## 3. Principi della conversione

1. **Un'app sola, sempre intera.** Mai un ramo lungo «React»: ogni fase entra
   in `main` verde. Le viste vecchie girano dentro `<Vecchio>` fino a quando
   la loro versione nuova passa le stesse prove.
2. **Il comportamento si prova prima di toccarlo.** Una vista si converte solo
   quando le sue prove e2e esistono e sono verdi sul codice vecchio (F0
   colma i buchi). Una prova da cambiare è un comportamento cambiato (D2):
   si cambia solo per dettagli d'implementazione (identità dei nodi,
   `data-isola`), con motivo nel commit.
3. **I contratti restano.** `window.prova`, `data-fuoco`, `data-scorrimento`,
   `data-telaio` (finché le prove li usano), le classi CSS, i nomi
   accessibili, i messaggi del ponte, `Posto`/`vai`, `COMANDI_UI`, `PAGINE`.
4. **Lo store è uno, quello di oggi.** React legge `stato` attraverso hook;
   nessuno stato applicativo nasce dentro un componente se serve a un altro
   o alla memoria per documento. Stato effimero di una vista (bozza, ricerca
   locale, selezione) → `useState`/`useReducer`, **non** più `let` di modulo.
5. **Il disegno è puro.** Niente richieste all'host, niente iscrizioni,
   niente timer nel corpo di un componente: vanno in `useEffect` (ADR-48
   «nessuna richiesta all'host parte dal disegno» resta vero).
6. **Nessuna libreria in più** oltre `react`, `react-dom` e, di sviluppo,
   `@types/react`, `@types/react-dom`, `eslint-plugin-react-hooks`. Ogni
   altra (finestre virtuali, DnD, test DOM) si giudica con ADR-50 e di
   regola non entra: `@tanstack/virtual-core` e il DnD nativo bastano.
7. **Nomi:** file inglesi camelCase (ADR-53), `.tsx` solo se contengono JSX;
   componenti in italiano PascalCase (`Pulsante`, `Modale`, `Guscio`); hook
   `useXxx` (lo esige `react-hooks/rules-of-hooks`). Testi solo dai cataloghi
   (ADR-38), mai stringhe in JSX.
8. **Un perimetro per agente.** Ogni ondata si divide per cartelle disgiunte
   (skill `sciame`); i file condivisi (`ui/state.ts`, `ui/shell.tsx`,
   `ui/pages.ts`, `ui/forms.ts`, `ui/styles.css`) li tocca un agente solo, a
   fine giro.

## 4. Architettura di arrivo

```text
ui/
  main.ts            avvio: createRoot(#radice).render(<Guscio/>), ponte, orologio, scorciatoie
  state.ts           store di oggi (diviso in tre: CANTIERE «ui/state.ts in tre»)
  storeHooks.ts      useStato(selettore), usePosto(), useRegistro(), useMinuto(), useRete()
  shell.tsx          <Guscio>: barra titolo, laterale, comandi, contenuto, assistente, stato
  pages.ts           PAGINE (senza JSX: la legge counts.test) + mappa pagina → componente
  views/…/*.tsx      una vista = un componente senza props obbligatorie, come oggi vistaX()
  forms/…/*.tsx      un modulo = un componente dentro <Modale>; apriModulo() resta la porta
  components/*.tsx   Pulsante, Campo, Scheda, Tabella, Modale, Menu, Icona, FinestraVirtuale…
  hooks/             useRisorsa, useInVolo, useFrecceNellaGriglia, useOsservaVisibile, useTrascina
```

- **Lettura dello stato.** `useSyncExternalStore(iscriviti, versione)`:
  `avvisa()` alza un contatore `versione`. Primo passo: i componenti leggono
  `stato` come oggi (costo pari al ridisegno intero di adesso). Poi
  `useStato(sel, uguale)` per le viste pesanti: grazie a immer il registro
  cambia identità solo nelle collezioni toccate, quindi un selettore su
  `registro.lezioni` salta il ridisegno se cambiano i voti.
- **Scritture.** Invariate: `aggiorna`, `vai`, `azione`, `invia`, `chiedi`.
- **Modali.** `<OspiteModali>` montato una volta accanto al guscio, in un
  portale su `body`; legge una pila (store piccolo). `apriModale(opzioni)`
  resta l'API imperativa: mette una voce nella pila e torna la promessa/il
  contesto di oggi. Durante la convivenza `corpo` può tornare un nodo `h()`
  (montato con `<Vecchio>`) o un elemento React.
- **Moduli.** `useModulo(iniziale)` → `{bozza, cambia, errori, occupato,
  salva(azione, msg, dopo)}`: lo stesso flusso di `salva()`/`inviaDalModulo`,
  con la bozza in stato invece che nel DOM. Il `<form>` vero resta (Invio
  salva, Esc annulla, Tab dentro).
- **Nodi pesanti.** `<CorniceDocumento>`, visore PDF, `<Miniatura>`,
  `<RiquadroMappa>`: componenti `memo` con `key` = sorgente; il canvas e
  l'iframe si toccano solo in `useLayoutEffect`. La firma `contenteditable`
  resta **non controllata** (ref + sanificazione all'uscita).
- **Fuoco e scorrimento.** Al cambio di pagina e nella storia: un
  `useLayoutEffect` nel `<Guscio>` rimette `data-scorrimento` e
  `data-fuoco` come oggi (`ricordaScorrimenti`/`ripristinaScorrimenti`
  restano, spostate in un modulo senza `h`). Fra due disegni della stessa
  pagina non servono più.
- **Eventi globali.** `ui/shortcuts.ts`, `ui/bookmark.ts`, rete, orologio:
  restano moduli installati in `main.ts`, fuori da React.
- **Modalità rigorosa.** `<StrictMode>` solo in `npm run dev` e solo attorno
  alle parti già convertite: il doppio effetto scopre subito gli effetti nel
  disegno.
- **Niente concorrenza** (`startTransition`, `Suspense` per i dati) finché
  esiste `derivato()`: il Proxy che sostituisce `stato.registro` regge solo
  con un disegno sincrono. Si toglie in F11 e solo allora si valuta.

## 5. Le fasi

Ogni fase: un PR o pochi; uscita = `npm run ci` verde **e** `npm run ui-tests`
verde **e** `misure.spec.ts` non peggiore della linea di base registrata in F0.

### F0 — Decisione e linea di base (prima di ogni riga di React)

1. ADR-56 approvato (§ 10); ADR-06, ADR-48, ADR-50 marcati «modificata da
   ADR-56».
2. Linea di base verde: correggere `navigation.spec.ts:155` e
   `comandiFuoriPagina › oggi_dal_menu`.
3. Registrare in questo file i tempi di `misure.spec.ts` (voti, archivio,
   persone) e la dimensione di `dist/panel.js` in `--produzione`.
4. Colmare i buchi e2e di § 2.5, **una prova per modulo** che apre, compila,
   salva e controlla l'azione mandata (`ULTIMA('corso.salva')`…), più i gesti:
   trascinamento di un'ora, menu contestuale di un'ora, annulla/ripeti,
   trascinamento di una pagina in Da smistare, proiezione accesa,
   assistente che risponde (finto), scheda allievo.
5. Portare in Playwright le quattro prove node legate al DOM finto
   (`attendanceClicks`, `commandBarInFlight`, `calendarEditor`,
   `externalCalendarLoading`), tenendo le vecchie finché il codice vecchio
   esiste.
6. Censire lo stato fuori da `stato` (CANTIERE, voce già aperta): elenco
   file per file con il destino (store, stato locale, ref).

Uscita: ADR approvato, suite e2e verde con ~25 prove in più.

### F1 — Attrezzi (nessun cambio a runtime)

- `package.json`: `react`, `react-dom` (programma); `@types/react`,
  `@types/react-dom`, `eslint-plugin-react-hooks` (sviluppo).
  `npm run licenze` verde.
- `tsconfig.json`: `"jsx": "react-jsx"`; `tsconfig.js.json` invariato.
- `esbuild.mjs`: `jsx: 'automatic'` nei bundle del renderer;
  `define: { 'process.env.NODE_ENV': '"production"' }` con `--produzione`,
  `"development"` altrimenti; `filePagine()` accetta `.tsx`; i bundle di prova
  ereditano.
- `eslint.config.mjs`: ogni `**/*.ts` dei blocchi di strato →
  `**/*.{ts,tsx}`; `react-hooks/rules-of-hooks` e `exhaustive-deps` come
  errori su `ui/**`, `core/controlli/**`, `desktop/shell/pages/**`; vietato
  `dangerouslySetInnerHTML` (regola «mai `innerHTML`»), tranne le figure SVG
  della guida (deroga motivata, come oggi `svg()`).
- `.dependency-cruiser.cjs`: estensioni con `.tsx`; `controlli-leggeri`
  ammette `node_modules/(react|react-dom)/`.
- `knip.config.ts`, `tools/common.mjs`, `tools/layers.mjs`,
  `tools/census.mjs`, `tools/i18n.mjs`: `.tsx` (e `JsxText`/`JsxAttribute` in
  i18n, con una prova che un testo libero in JSX venga segnalato).
- Un file `.tsx` di prova (un componente minuscolo usato da nessuno) che
  attraversa tutto il giro: typecheck, lint, census, i18n, knip; poi via.

Uscita: CI verde; nessun byte cambiato in `dist/panel.js` salvo React non
ancora importato.

### F2 — Il ponte fra store e React

- `ui/state.ts`: contatore `versione` alzato in `avvisa()`; `ridisegna()` lo
  alza anche lui. Le 12 scritture dirette: o passano da `aggiorna`, o
  restano dirette **e** documentate come «non disegnate» (es.
  `adessoOra` → deposito dell'orologio).
- Nuovo `storeHooks.ts`: `useVersione()`, `useStato(sel, uguale?)`,
  `usePosto()`, `useMinuto()` (sopra `ui/clock.ts`), `useRete()`.
- Nuovo componente `<Vecchio disegna={() => Figlio} chiave>`: un `<div>` con
  ref; in `useLayoutEffect` chiama `aggiornaElemento(ref, disegna())` a ogni
  versione, con fotografia e ripristino di fuoco e scorrimento **dentro di
  sé**. È l'unico posto dove i due mondi si toccano.
- `ui/main.tsx`: `disegna()` → `createRoot(radice).render(<Vecchio
  disegna={guscio}/>)`. **Tutta l'app gira ancora col motore vecchio**, ma la
  radice è di React.
- Prove: tutta la suite e2e invariata; una prova in più che due `aggiorna`
  nello stesso blocco danno un disegno solo.

Uscita: app identica, React montato, misure invariate (± rumore).

### F3 — Il telaio in React

- `<Guscio>`, `<BarraTitolo>`, `<Laterale>`, `<BarraComandi>`,
  `<BarraStato>`, `<Briciole>`, `<BarraAvvisi>` convertiti
  (`ui/shell.tsx`, `ui/titleBar.tsx`, `ui/sidebar.tsx`, `ui/commandBar.tsx`,
  `ui/statusBar.tsx`, `ui/breadcrumb.tsx`). Il riquadro dell'assistente resta
  `<Vecchio>` fino a F10.
- La vista corrente: `<Vecchio key={vista} disegna={vistaCorrente}>`
  dentro `main.contenuto[data-telaio=contenuto]`.
- `comandiInVolo` → `useInVolo()` (stesso comportamento di `rinasceInVolo`:
  pulsante disabilitato e `aria-busy` mentre gira).
- Ripristino di fuoco e scorrimento al cambio di pagina e con la storia
  (`conGliScorrimentiDelRitorno`) nel `<Guscio>`.
- Prove da adattare: `telaioVista.spec.ts` (identità del telaio: deve
  reggere da sé), `barraStato`, `sidebarDrawer`, `clicInVolo`,
  `comandiFuoriPagina`, `commandBarInFlight` portata in F0.

### F4 — Componenti di base e modali

In una cartella temporanea `jsx/` dentro `ui/components/` (si rifonde in F11), per non
avere `base.ts` e `base.tsx` con lo stesso nome durante la convivenza:

1. `Icona`, `Logo`, `Avatar`, `DataDiLezione`, `Pastiglia`, `Avviso`,
   `StatoVuoto`, `TestataVista`, `Scheda`, `Pulsante`, `Campo`, `Selettore`,
   `Tendina`, `ControlloData`, `DataInLinea`, `Collegamento`, `Riga`,
   `SezioneModulo`, `DatoSintetico`, `Barra` (da `base.ts`, 790 righe).
2. `Tabella` + `inTelaio`, `Pendenza`, `FiltriVuoti` (`filters.ts`).
3. `<OspiteModali>`, `Modale`, `conferma()`, `useModulo`; `apriModale`
   imperativa sopra la pila. Esc, Tab intrappolato, Invio salva,
   `body.con-modale`, `EVENTO_MODALE_APERTA`, `chiudiTutte` al cambio
   documento: invariati.
4. `notifica()` e `notificaAnnullabile()` restano imperative, disegnate da un
   `<OspiteNotifiche>`.
5. `Menu` (contestuale e a tendina), `Suggerimento` (`hint.ts`), `Palette`.
6. Hook: `useInVolo` (`inFlight.ts`), `useFrecceNellaGriglia`
   (`gridArrows.ts`; chiude anche la voce CANTIERE «Frecce nelle griglie»),
   `useRisorsa` (`asyncResources.ts`), `useOsservaVisibile`.
7. `FinestraVirtuale` sopra `@tanstack/virtual-core` (da `virtualList.ts`),
   con la regola di oggi: `data-chiave` solo sull'elemento col fuoco.
8. `CorniceDocumento` (`frame.ts`), `Miniatura` (`thumbnails.ts`),
   `GraficoNote` (`notes.ts`), `RiquadroMappa` (`map.ts`),
   `SceltaProgettoFase`, `PostoAllegato`, `RecapitoPremibile`,
   `CampoAnno` (`yearSetting.ts`).

Ogni componente: prova in Playwright su una pagina di banco
(`tests/interfaccia/`, stessa `ponte()`), con axe. Uscita: tutti i
componenti esistono in due forme; nessuna vista ancora convertita.

### F5 — Ondata 1: sola lettura, poche dipendenze

`today.ts`, `classTodo.ts`, `todo.ts` **insieme** ai gruppi che esporta
(`assignments`, `absences`, `retakes`, `returns` forniscono gruppi a `todo`:
o si convertono i gruppi qui, o restano `<Vecchio>` dentro la vista nuova),
`overview.ts` + `overviewLinks.ts` (misure in `useLayoutEffect`,
ResizeObserver in effetto), `help.ts` (i dati di `ui/views/help/` non si
toccano; figure con `dangerouslySetInnerHTML` in deroga, come oggi `svg()`),
`student/` senza la mappa.

Per vista: convertire → prove e2e verdi → togliere il file vecchio nello
stesso commit (niente doppioni vivi: D6).

### F6 — Ondata 2: elenchi e CRUD con modali semplici

Viste: `classes.ts`, `courses.ts`, `people.ts` (finestra virtuale),
`documents/cards`, `documents/sheets`, `projects/links`.
Moduli: `subject`, `substitute`, `retake`, `assessment`, `documentInfo`,
`oneDrive`, `registerImport`, `check`, `absences`, `classTeacher`, `course`
con `timetable`. `tools/forms.mjs` e `tools/buttons.mjs` passano sull'AST
**prima** di questa ondata (ne sono il controllo).

### F7 — Ondata 3: griglie con tastiera e clic in volo

`check.ts`, `lesson/attendance`, `lesson/behaviour`, `projects/matrix`,
`projects/tasks`, `projects/judgements`, `assessments/grades` (finestra
virtuale + tastiera), `assessments/retakes`, `returns`, `assignments.ts`;
poi `lesson.ts` intero (salvataggio all'uscita dal campo: `onBlur` +
`onChange`, stessa azione), `projects.ts`, `projectIntegration.ts` (le 3 Map
di modulo → store o `useReducer` della vista). Moduli: `assignment`,
`lesson`, `project`, `resources`. Misure: la griglia dei voti deve restare
≤ 50 ms al ridisegno (`misure.spec.ts`).

### F8 — Ondata 4: editor e nodi tenuti

`plans.ts` + `plansNavigator.ts` + `forms/plan.ts` `editorPiano` +
`forms/planActivity.ts` (bozza in `useReducer`, non più `rimpiazza`;
il contatore `editorCostruiti` diventa una prova che l'editor non si
ricrea), `forms/year.ts` + `schoolCalendar.ts`, `forms/class.ts` (foto),
`forms/calendar.ts`, `forms/icsEvent.ts`, `documents/preview` + `csv`
(`useRisorsa`), `archive.ts`, `map.ts`, `student/registry`.

### F9 — Ondata 5: le tre pagine più difficili

1. `settings/` + `settings.ts` + `languageModels.ts`: firma non controllata,
   DnD della carta intestata, ricerca, sezione attiva con
   IntersectionObserver, scaricamenti in coda (le ~12 `let` in uno store
   piccolo, perché sopravvivono alla pagina).
2. `absences.ts` + `classTeacher.ts` + `sorting/` (+ i bersagli di
   trascinamento in `archive`): **una sola ondata**, perché il trascinamento
   delle pagine attraversa le tre. Canvas pdfjs in effetto; zoom e pagine
   scelte da `stato` (oggi scritte dirette).
3. `calendar/` per ultimo: `drag.ts`/`editor.ts` come hook `useTrascina` con
   puntatore catturato, mese infinito con `useOsservaVisibile`, riga di adesso
   con `useMinuto`, `finestraMese/Settimana` di
   `ui/calendarNavigation.ts` dentro lo store. Il controllo dell'orologio
   «niente cambio giorno durante un trascinamento» (`.settimana__bozza`)
   resta.

### F10 — Le altre superfici

- `core/controlli/`: `<Controllo voce onCambia>` e `<Campo>` in `.tsx`, stessi
  12 disegni, esito in `useState` (via `data-tieni` sulla riga dell'esito).
  Li usano il pannello e la finestra nativa (ADR-52 resta: un disegno solo).
  `tests/ui/controlli.test.mjs` (DOM finto) → Playwright, accanto a
  `impostazioniAnno.spec.ts` e `settingsKeyboard.spec.ts`.
- Impostazioni nativa, benvenuto, dialogo: React; `desktop/shell/pages/shared/`
  (`page.ts`, `titleBar.ts`) diventa componenti. **Momento giusto** per la
  voce CANTIERE «Codice del renderer in un solo strato» (`git mv` in un
  commit a sé, prima della conversione).
- Proiezione (`ui/projection.tsx`): React; usa `GraficoNote`.
- Assistente: `ui/assistant/chat.tsx` (848 righe, stato di modulo) → store
  piccolo + componenti, usato dal riquadro del pannello e dalla finestra
  staccata; `format.ts` e `parts.ts` restano puri.
- Avvio e lettore: invariati.

### F11 — Smontare il vecchio

- Togliere `<Vecchio>`, `h`, `aggiornaElemento`, `gestisci`, `isola`,
  `ridisegnaIsola`, `data-tieni`, `data-isola`, `MORFOSI` (`dom.ts`,
  `ui/islands.ts`); tenere solo fuoco e scorrimento in un modulo piccolo.
- Dipendenza `idiomorph` fuori da `package.json` (e dalla tabella di ADR-50).
- `morfosi.spec.ts` → sostituita da prove di
  comportamento: iframe non si ricarica, cursore e selezione restano nel
  campo durante una risposta dell'host, scorrimento resta.
- `tests/helpers/domSintetico.mjs` e i finti di `h` via.
- `jsx/` dentro `ui/components/` rifusa in `ui/components/`.
- `derivato()` → selettori memoizzati; poi valutare `startTransition` per
  la ricerca e il calendario.
- `npm run knip`, `npm run census` puliti. Documenti: ARCHITETTURA §§ 3–4,
  CATALOGO, GUIDA, skill `architettura`, `testi`, `impostazione`,
  `procedure-api` (le parti di UI), README.

## 6. Comportamenti trasversali da non perdere

Lista di controllo per ogni ondata. Ognuno ha (o riceve in F0) una prova.

| Comportamento | Dove vive oggi | Prova |
| --- | --- | --- |
| Posto, `vai`, `completa`, ripieghi | `ui/place.ts`, `ui/state.ts` | `tests/ui/posto.test.mjs` (60) |
| Storia indietro/avanti con scorrimenti | `ui/history.ts` | `navigation`, `movimento` |
| Memoria per documento (20 documenti) | `ui/memory.ts` | `tests/ui/memoria.test.mjs` |
| Segnalibri di scorrimento | `ui/bookmark.ts` | `tests/ui/segnalibri.test.mjs` |
| Scorciatoie (Alt+frecce, Ctrl+K/B/Z/Y/1…9, tasti mouse) | `ui/shortcuts.ts` | `settingsKeyboard`, `navigation`; +annulla/ripeti in F0 |
| Clic in volo (pulsante disabilitato, `aria-busy`) | `ui/commandBar.tsx`, `ui/components/inFlight.ts` | `clicInVolo`, `check` |
| Differenze dall'host, stato intero al buco | `ui/statePatches.ts` | `tests/ui/statePatches.test.mjs`, `tests/panels/stateDifferences.test.mjs` |
| Cambio documento: modali chiuse, storia azzerata, posto ripristinato | `ui/main.tsx` `ricevoStato` | `informazioniDocumento`; +una in F0 |
| Mira della proiezione e contesto dell'assistente a ogni cambio | `ui/main.tsx` (iscritti) | +una in F0 (messaggi `proiezione.mira`, `assistente.contesto`) |
| Orologio: riga di adesso al minuto, giorno nuovo senza rompere un trascinamento | `ui/clock.ts`, `ui/state.ts` `avviaOrologio` | `tests/ui/aggiorna.test.mjs`; +trascinamento in F0 |
| Rete in linea/fuori linea | `ui/state.ts` `avviaRete` | +una in F0 |
| Quattro lingue | cataloghi `*.testi.ts` | `lingue`, `npm run i18n` |
| Chiaro/scuro, contrasto | `ui/styles/theme.css` | `accessibility`, `calendarContrast`, `themeChoice` |
| Modali: Esc, Tab dentro, Invio, pila, errori dell'host | `ui/components/modal.tsx` | `modalErrors`, `modaleOccupata` |
| Finestre virtuali (voti, archivio, persone) | `ui/components/virtualList.tsx` | `misure`, `persone`, `tabelle` |
| Iframe e PDF non si ricaricano | `data-tieni` | `riquadri`, `documentiRiquadri`, `sfoglioIsole` |
| Animazione d'entrata della pagina | `ui/main.tsx` `segnaEntrata` | `telaioVista` |
| CSP `default-src 'none'` | `desktop/pannelli/page.ts` | React 19 non usa `eval`; `style={}` passa dal CSSOM; nessun `<style>` iniettato |

## 7. Rischi e risposte

| Rischio | Peso | Risposta |
| --- | --- | --- |
| Buchi di prova lasciano passare una regressione silenziosa | alto | F0 prima di tutto; nessuna vista si converte senza la sua prova verde sul vecchio |
| Stato di modulo perso o duplicato fra due montaggi | alto | censimento in F0; `StrictMode` in dev; regola: niente `let` di modulo nei `.tsx` di `views/` (regola ESLint `no-restricted-syntax` locale) |
| Prestazioni: ridisegno di tutto l'albero a ogni `aggiorna` | medio | `useStato` con selettori per collezione; `memo` sulle viste; soglie di `misure.spec.ts` come porta d'uscita di ogni ondata |
| `derivato()` con il Proxy sotto un disegno concorrente | medio | nessuna API concorrente fino a F11 |
| Iframe che si ricarica se il suo genitore cambia tipo | medio | struttura stabile attorno ai nodi pesanti; prova di non ricarica |
| `contenteditable` della firma riscritto da React | medio | componente non controllato, ref, sanificazione invariata |
| Trascinamenti (ore, pagine, loghi) rotti dagli eventi sintetici | medio | `pointer` catturato in effetto, ascoltatori nativi sul nodo con ref; prove di gesto in F0 |
| Bundle più grandi | basso | +~190 kB min per bundle; file locali via `registro://`; costo = parse ~10–20 ms all'apertura; avvio e lettore senza React |
| Due mondi a lungo (h e JSX) | medio | ordine fisso delle ondate; `<Vecchio>` conta i suoi usi in `npm run census`, il conto deve scendere a ogni ondata |
| Strumenti statici ciechi sui `.tsx` | alto | F1 li estende prima del primo `.tsx` vero, con una prova ciascuno |
| Lavoro parallelo su `ui/state.ts`/`ui/shell.tsx` | medio | perimetri disgiunti; i file condivisi a un agente solo, a fine giro |

## 8. Che cosa non si fa

- Niente router (React Router, TanStack Router): `Posto`/`vai` restano.
- Niente store esterno (Redux, Zustand, Jotai): lo store è `ui/state.ts`.
- Niente librerie di moduli (react-hook-form, Formik) né di schemi in UI.
- Niente kit di componenti (MUI, shadcn, Radix) e niente CSS-in-JS: ADR-39
  (aspetto nostro) resta.
- Niente server rendering, niente Next/Vite: esbuild basta.
- Niente cambio di dati, contratto, protocollo, CSP, formato `.regi`.
- Niente React nella CLI (D10) né nel processo main.
- Niente nuove funzioni dentro la conversione: chi le vuole apre una voce a
  parte.

## 9. Come si lavora (giri di sciame)

- Un giro = una fase o un'ondata. Prima esplorazione (mappa dei file e delle
  prove della fase), poi conversione su perimetri disgiunti, poi verifica
  avversariale (un agente che cerca differenze di comportamento fra prima e
  dopo, con le prove e a mano), poi `npm run ci` + `npm run ui-tests`.
- Perimetri tipici dell'ondata 2: agente A `views/classes.ts` + `forms/class`;
  B `views/courses.ts` + `forms/course` + `forms/timetable`; C
  `views/people.ts`; D `views/documents/`. `ui/forms.ts` e `ui/shell.tsx` a
  fine giro.
- Ogni conversione di una vista: un commit che aggiunge il `.tsx`, toglie il
  `.ts`, aggiorna l'ingresso in `ui/shell.tsx` e le citazioni nei documenti
  (`npm run docs`).
- Questo piano tiene una tabella di avanzamento (§ 11) aggiornata a ogni
  fase; CANTIERE tiene una voce sola che rimanda qui.

## 10. Bozza di ADR-56

> **ADR-56 — L'interfaccia in React** (modifica ADR-06, ADR-48, ADR-50)
>
> **Decisione.** Le pagine del renderer si disegnano con React (`react`,
> `react-dom`), JSX compilato da esbuild. Lo store resta `ui/state.ts`, letto
> con `useSyncExternalStore`; navigazione con `Posto`/`vai` (ADR-47). Nessun
> router, store, kit di componenti, libreria di moduli o CSS-in-JS. Avvio e
> lettore restano senza React.
>
> **Perché.** Il motore in casa (`h`, telaio, isole, `data-tieni`, idiomorph,
> delega degli eventi) rifà a mano quel che la riconciliazione fa da sé, e
> obbliga a tenere lo stato effimero nel DOM o in variabili di modulo (33 file).
> React toglie quel motore e dà stato locale per componente, effetti
> dichiarati e un modello noto a chiunque arrivi sul progetto.
>
> **Vincoli.** ADR-50 criterio 4 non vale più per React (gli altri framework
> restano esclusi); criteri 1, 2, 5, 6 restano. Il disegno è puro: niente
> richieste all'host, iscrizioni o timer fuori da un effetto. Lo stato che
> serve a più componenti o alla memoria per documento sta nello store. Testi
> solo dai cataloghi. Niente `dangerouslySetInnerHTML` fuori dalle figure
> della guida. La CSP non cambia. Ogni vista si converte solo con le sue
> prove e2e verdi sul codice vecchio.
>
> **Dove.** `ui/`, `core/controlli/`, `desktop/shell/pages/`, `esbuild.mjs`,
> `eslint.config.mjs`, `tsconfig.json`, questo piano.

## 11. Avanzamento

Scelta presa in corsa (F2): invece di `useSyncExternalStore` per componente,
la radice si ridisegna tutta e subito (`flushSync`) a ogni `avvisa()`, come il
ridisegno di prima; fuoco e scorrimenti li fotografa `Fotografo`
(`getSnapshotBeforeUpdate`) fra il disegno e il documento. Le viste leggono
`stato` durante il disegno: la semantica non cambia. I selettori
memoizzati restano un passo di F11, se le misure lo chiedono.

| Fase | Stato | Nota |
| --- | --- | --- |
| F0 decisione e linea di base | fatta | ADR-56; linea di base 91/91 (supplenza fra i comandi, ADR-07); ~40 prove e2e nuove (`moduli`, `gesti`, porti delle prove node a DOM finto); due prove in `fixme` cadono anche sul codice di prima (CANTIERE) |
| F1 attrezzi | fatta | tsconfig, esbuild, ESLint (hook, niente innerHTML), cruiser, knip, layers, census, i18n con `JsxText` |
| F2 ponte store/React | fatta | `ui/main.tsx`, `Fotografo`; ponte `<Vecchio>` per la convivenza, poi tolto |
| F3 telaio | fatta | barre, laterale, briciole, barra dei comandi con lo stato in volo |
| F4 componenti e modali | fatta | `ui/components/*.tsx`; menu, palette, notifiche con la stessa API imperativa e una radice propria |
| F5–F9 ondate | fatte | dieci perimetri in parallelo: tutte le viste e tutti i moduli |
| F10 altre superfici | fatta | assistente (pannello e finestra), proiezione, `core/controlli/`, finestre native impostazioni, benvenuto, dialogo, sviluppo; avvio e lettore restano senza React |
| F11 smontare il vecchio | fatta | via `h()`, delega, morph, `legacy.tsx`, idiomorph; `dom.ts` → `ui/focus.ts`; `morfosi.spec.ts` → `stabilita.spec.ts` |

Difetti trovati lungo la strada e corretti: il menu del tasto destro sulle ore
della settimana si richiudeva subito (c'era anche prima: uno scorrimento
consegnato a menu aperto); due clic nello stesso giro su una scelta multipla
perdevano il primo; una data scritta in un campo nascosto tornava quella
dell'apertura. Cambi di comportamento tenuti, da confermare: nel calendario
ufficiale di un anno le spunte delle voci restano fra due disegni (prima
tornavano tutte accese); nell'editor delle pause il conto dei giorni segue
subito le date nuove; le notifiche compaiono un fotogramma dopo.

## 12. Da decidere prima di cominciare

1. Approvare ADR-56 (o modificarlo).
2. Pagine native (impostazioni, benvenuto, dialogo) in React anche loro, come
   proposto, o lasciate senza React? Proposta: sì, perché `core/controlli/`
   serve a tutte e due le superfici (ADR-52) e un disegno solo vale più di
   ~190 kB locali.
3. Prove di componente in node con un DOM (happy-dom + Testing Library, solo
   sviluppo) o tutto in Playwright? Proposta: tutto in Playwright, sul banco
   che c'è già; nessuna libreria nuova.
4. Ordine rispetto alle voci aperte del CANTIERE che toccano `ui/`:
   proposta di farle **dentro** le fasi (stato fuori da `stato` in F0,
   `ui/state.ts` in tre in F2, pagine native in `ui/` in F10, frecce nelle
   griglie in F4, `casellaSpunta`/`grigliaDiClasse` in F7).
