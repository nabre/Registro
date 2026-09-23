# Il cantiere

Gli altri documenti di `docs/` dicono **com'è** il registro. Questo dice **che
cosa gli sta succedendo**: le scelte aperte, quelle prese, e il lavoro che
resta da fare, diviso per cantiere.

Sta qui e non in un tracker perché le decisioni che contano sono quelle che
cambiano il codice, e il posto dove si leggono deve essere lo stesso in cui si
legge il codice. Quando un cantiere chiude, quel che ha deciso migra in
[DECISIONI.md](DECISIONI.md) e le sue voci spariscono da qui: questo file non è
un archivio, è un tavolo da lavoro.

**Regola del file:** una casella si spunta quando il lavoro è **fatto e
verificato** — `npx tsc --noEmit` pulito, `npx eslint .` senza errori,
`npm test` verde. Non prima.

---

## 1. Le decisioni

Numerate, con lo stato accanto. **Proposta** vuol dire che l'ho scelta io e
basta un «no» per cambiarla; **presa** vuol dire che il codice ci si appoggia
già e disfarla costa.

| # | Decisione | Stato |
| --- | --- | --- |
| D1 | Il lavoro procede a **giri di sciame**: si esplora in parallelo, si verifica in modo avversariale, si applica in sequenza. Un giro alla volta, e fra un giro e l'altro si legge il risultato prima di decidere il successivo. | presa |
| D2 | **Nessun cambiamento di comportamento non richiesto.** Ogni riordino, ogni rimozione e ogni rifattorizzazione deve lasciare **tutti** i test verdi senza toccarli — quanti siano lo dice `npm test`, e cresce a ogni giro: rincorrere il numero in questa riga vorrebbe dire correggerla ogni settimana. Un test che va cambiato per far passare un riordino è il segnale che il riordino ha cambiato il comportamento. | presa |
| D3 | I difetti si correggono **prima** di riordinare le cartelle. Un riordino su codice rotto sposta il difetto invece di toglierlo, e rende illeggibile il diff che lo correggeva. | presa |
| D4 | La **riga di comando cresce come cliente del condotto**, non come secondo registro: non importa `src/`, non conosce le procedure, chiede tutto a `$elenco` e `$schema`. È la proprietà per cui non invecchia, e vale più di qualunque comodità. | presa |
| D5 | Il **riordino delle cartelle si propone prima e si applica dopo**: prima una mappa «da → a» scritta qui, poi `git mv` in un commit che non contiene altro, così il diff resta leggibile. | proposta |
| D6 | Un export senza consumatori esterni **non si cancella se è vivo**: si rende interno. Si cancella solo quel che nessuno chiama, e solo dopo che una prova ha confermato che nessuno lo chiama. | proposta |
| D7 | Il «framework» che manca non è una libreria nuova: è il **completamento di quello che c'è già** — `definisci()`, gli schemi, il nucleo, il giornale. Le funzionalità si aggiungono dichiarandole, non cablandole. | presa |
| D8 | **Cinque strati**, non quattro: `core/`, `contract/`, `desktop/`, `ui/`, `cli/`. Il quinto è `ui/` — 39 000 righe che non stavano in nessuno degli altri. Il disegno per intero sta in [IMPIANTO.md](IMPIANTO.md). | presa |
| D9 | `contract/` ha la **forma di tRPC senza tRPC**: `router()`, `chiamante()` tipizzato, `Link`. L'inferenza end-to-end esce da `Schema<T>`, che il tipo se lo porta già dietro; serviva un `Proxy` di trenta righe, non una dipendenza. Gli schemi restano Standard Schema, quindi passare a tRPC vero più avanti resta un cambio contenuto. | presa |
| D10 | La **riga di comando resta nuda**: solo moduli `node:`, nessuna dipendenza, nessuna costruzione. Cresce in file e in comandi, non in pacchetti. È la proprietà per cui si avvia anche quando la build del registro è rotta. | presa |
| D11 | `core/` diventa puro **invertendo, non riscrivendo**: `vscode` smette di essere un alias del bundler e diventa `core/sistema/vscode.ts`, che esporta i valori puri e delega le capacità a un `Impianto` installato all'avvio. I venticinque file che scrivono `vscode.workspace.fs` non cambiano di una lettera. | presa |
| D12 | `core/` può importare **tipi** da `contract/`, mai valori. Oggi sono sette import, tutti `import type`. | presa |
| D13 | Le regole degli strati le verifica una macchina: `npm run layers`, scritto **prima** degli spostamenti. Una regola d'architettura che nessuno controlla dura fino al prossimo import comodo. | presa |
| D14 | Il modulo dell'ospite si chiama **`apparato`**, non `vscode`. Quel nome era il posto in cui il registro era nato — un'estensione dell'editor — e da quando gira in una finestra sua diceva il falso: nominava un prodotto che non c'è più, e faceva passare per API di qualcun altro il contratto fra il registro e la macchina su cui sta. `apparato` nomina un ruolo, e il ruolo non cambia se domani sotto c'è altro. Scartati: `sistema` (cozza con `azioni/sistema.ts`), `ambiente` (cozza con due locali, e la cartella diventerà `apparato/`), `ospite` (in italiano vale anche «chi è ospitato»). | presa |
| D16 | La regola dei nomi, una sola: **si traduce quel che nomina un prodotto o un'idea dell'editor, resta quel che nomina un'operazione che si chiama così dappertutto.** Quindi `workspace` → `file`/`impostazioni`/`osserva` (di «workspace» qui non ce n'è nessuno), ma `readFile`, `Uri`, `EventEmitter` e `Webview` restano. Sta scritta in testa a `src/ambiente/apparato.ts`, dove serve. | presa |
| D15 | Nello stesso spirito, gli identificativi di comando dell'editor diventano quelli del loro ruolo: `revealFileInOS` → `apparato.mostraNellaCartella`, `vscode.open` → `apparato.apri`, `workbench.action.toggleFullScreen` → `apparato.schermoIntero`, `workbench.action.openSettings` → `registroDocenti.impostazioni`. Li implementa il registro e non li consuma nessun altro programma: portavano il nome di un prodotto che non c'entra. | presa |

---

## 2. I cantieri

### C1 — I difetti

> Trovarli su tutte le dimensioni del codice e correggerli.

- [x] Giro 0: verifiche di base (`tsc`, `eslint`, `npm test`, strumenti interni) — tutto verde di partenza
- [x] Giro 0: 5 difetti trovati e corretti in `api/` + `cli/` (vedi § 3)
- [x] Giro 1: caccia a sciame su 10 dimensioni, con scettico avversariale per dimensione — 20 agenti, 42 reperti, **39 confermati** (10 alti, 21 medi, 8 bassi), 3 confutati
- [x] Giro 1: **tutti e 10 gli «alto» corretti** (vedi § 3)
- [ ] Giro 1: i 21 «medio»
- [ ] Giro 1: gli 8 «basso»
- [ ] Giro 1: una prova di regressione per ogni difetto di severità alta — ne mancano
- [ ] Giro 1bis: secondo passaggio sulle dimensioni che hanno reso di più
- [x] Giro 2: sciame su 8 dimensioni — flusso delle scritture, flusso delle letture,
      contratti delle procedure, dominio, dati, interfaccia, desktop, struttura ed
      efficienza. 5 difetti corretti (vedi § 3), 4 reperti aperti qui sotto
- [ ] Giro 2: la coda unica sull'archivio (C3), che è l'unico reperto d'architettura del giro
- [ ] Giro 2: la prova di regressione dell'appello — non ha dove stare finché le prove
      dell'interfaccia restano fuori dalla costruzione (vedi C8)
- [x] Giro 7: sciame su 8 dimensioni, 8 applicatori — 7 alti (tutti corretti), una
      sessantina fra medi e bassi, 54 prove nuove (vedi § 3). Le pendenze in C20

### C2 — La riga di comando

> Svilupparla. Nuda: D4 e D10 la vincolano — cliente del condotto, zero dipendenze, zero build.

- [x] Impianto deciso: `cli/` fuori da `src/`, divisa in comandi ([IMPIANTO.md § 5](IMPIANTO.md))
- [ ] Spostarla e dividerla: `registro.mjs`, `link.mjs`, `indirizzo.mjs`, `tabella.mjs`, `comandi/`
- [ ] `aspetta`: oggi un condotto spento è un muro secco al primo `ENOENT`
- [ ] `guarda`: seguire il giornale mentre il registro lavora
- [ ] Prove vere: nel giro 7 sono nate le prime — `tests/cli/commandLine.test.mjs`,
      indirizzo del condotto e conversione degli argomenti contro un condotto vero.
      Mancano tutti gli altri comandi
- [x] `chiedi` tolto (ADR-31): non aveva più un modello da chiamare fuori dal processo
- [ ] Il problema di fondo, che è di C3 e non di qui: **149 scritture e 27 letture**. Da terminale si chiede più di quanto si scriva
- [ ] Aggiornare `docs/API.md` § 8

### C3 — Le API

> Controllarne solidità e uso, nell'applicazione e nella riga di comando.

- [x] Per ogni procedura: lo schema dichiarato combacia con quel che il gestore legge
      davvero? **Sì**, e non per fortuna: `prove/api/copertura.test.mjs` confronta già
      campo per campo l'unione `Azione` letta dal sorgente contro `forma.campi` di ogni
      procedura. Ricontrollate a mano tutte e undici le aree: nessuna perdita silenziosa
- [x] Le procedure che dichiarano `idempotente: true` lo sono? **Sì** sui casi che
      contano — `corso.crea`, `valutazione.daAttivita`, `smistamento.pdf.attribuisci`,
      `allievo.foto.togli` tornano quel che c'è invece di rifarlo; `classe.duplica` non
      lo dichiara, ed è giusto
- [x] Le `collezioni` dichiarate sono quelle che si toccano? **Sì.** Gli 8 casi che
      `npm run collections` segnala «da guardare a mano» sono tutti chiusi: le tre
      funzioni opache (`appelloCompleto`, `appelloScritto`, `corsoDi`) leggono e basta,
      e le due chiusure dinamiche (`correzione.applica`, `piano.applica`) raccolgono già
      le proprie collezioni a runtime
- [x] I codici d'errore sono quelli giusti? **Sì.** Nessun conflitto di revisione finito
      su `interno`, nessun id inesistente finito su `rifiutato`
- [x] **La coda è per trasporto, non per archivio.** Chiuso nel giro 3, ed era il
      reperto d'architettura del giro 2. Adesso c'è **una fila sola dentro
      `chiama()`, sulle sole scritture**: le letture saltano la corsia, perché
      sono sincrone sul registro in memoria e metterle dietro venti PDF vorrebbe
      dire una pagina ferma per niente.

      Tre cose che la coda ingenua avrebbe sbagliato, e come stanno adesso:
      **il turno può non arrivare mai** — la ricerca degli indirizzi sulla mappa
      arriva a dieci minuti e un dialogo di sistema resta aperto finché non gli
      si risponde — quindi c'è un tetto d'attesa di trenta secondi, oltre il
      quale si rinuncia con una frase che dice *perché*, invece di lasciare
      l'agenda ferma; **il documento può cambiare mentre si aspetta**, e allora
      la scrittura esce con il codice del conflitto senza toccare niente (tranne
      chi dichiara `collezioni: []`, che *è* il cambio di documento); **un errore
      non avvelena la fila**, con la stessa forma che `Archivio.inFila` aveva già.

      La coda del pannello **resta**: serializza anche l'ordine delle spinte di
      stato, che la fila del nucleo non conosce. Si potrà togliere il giorno in
      cui la pagina si aggiornerà per sottoscrizione, con un numero di revisione
      con cui scartare da sé quel che arriva in ritardo.
- [x] Il condotto: **backpressure in scrittura**. `scrivi()` guarda il ritorno di
      `presa.write()` e aspetta `'drain'` — abbandonato su `close` e su `error`,
      o lo spegnimento aspetterebbe un cliente morto — e c'è il tetto speculare
      sulla profondità della fila di richieste, senza il quale il buffer si
      sarebbe solo spostato dall'altra parte
- [ ] Il condotto: prove vere, oggi ne ha zero
- [ ] Il giornale: chi lo ascolta, e che cosa se ne fa
- [x] **La chiusura pulita.** Allo spegnimento non si aspettava né si fermava
      niente: la coda del pannello, quella dei PDF e quella dell'OCR restavano
      a metà, e una pagina letta dall'OCR dopo `lasciaPacchetto()` era persa in
      silenzio. E il commento che dichiarava «`subscriptions` viene svuotato allo
      spegnimento» era falso: li uccideva `app.exit(0)`. Adesso la sequenza è
      scritta e provata — letture OCR, vassoio, agenda, condotto, pannello,
      smistatore, rapporti, archivio, e per ultimo lo svuotamento vero delle
      `subscriptions`
- [ ] **Le scritture che non sono azioni.** `Smistatore.assorbiCassettaVecchia()`
      scrive `smistamenti` e sposta byte in quarantena senza passare né da
      `esegui()` né da `chiama()` — e non è solo all'accensione: sta dentro
      `archivio.alCambiamento`, quindi riscatta a ogni cambio di documento. Si
      perdono il giornale, il codice d'errore, il tracciato e la
      `programmaRigenerazione()` che vive dentro `esegui()`.

      **Metà è chiusa**: il completamento OCR in coda dura minuti e non può stare
      dentro una chiamata, quindi non si instrada — si **racconta**, e adesso lo
      fa: lo smistatore emette una voce per pagina letta e l'avvio la scrive nel
      giornale.

      L'altra metà è scritta e **non applicata**, apposta. L'azione
      `smistamento.cassetta.assorbi` è pronta — procedura, indice, gestore,
      dispaccio — ma passando da `chiama()` quell'assorbimento entra nella fila
      unica, e legge PDF interi: su una cassetta grossa supererebbe i trenta
      secondi del tetto e farebbe **rinunciare le scritture dietro di sé**. La
      strada giusta non è alzare il tetto: è spezzarla per file, un'azione per
      PDF, e allora ogni pezzo sta comodo nel turno suo. Il codice pronto sta nel
      rapporto del giro 3, e si incolla quando quella divisione è fatta

### C4 — Il framework

> Gestire meglio le funzionalità. D7 e D9: si completa quel che c'è, non si importa una libreria.

- [x] Forma decisa: `router()` + `chiamante()` tipizzato + `Link` ([IMPIANTO.md § 3](IMPIANTO.md))
- [ ] `contract/router.ts`: l'albero, `foglie()`, e la **verifica** che percorso e `nome` coincidano
- [ ] `contract/chiamante.ts`: il `Proxy` tipizzato — `reg.ore.appello.casella({…})` con ingresso e uscita dedotti
- [ ] `contract/link.ts`: l'interfaccia dei tre trasporti
- [ ] I tre link scritti: `diretto`, `ipc`, `socket`
- [ ] Agenda, vassoio e menu nativo passano a `chiamante(registro, diretto)`: oggi chiamano in tre modi diversi e due dei tre non hanno giornale né codici d'errore
- [ ] Dopo, in un passo suo: togliere il campo `nome` e farlo derivare dalla posizione (149 call site)
- [ ] Solo alla fine: rimisurare che cosa costa aggiungere una funzionalità, file per file

### C5 — Le cartelle

> I cinque strati di D8. Mappa «da → a» per intero in [IMPIANTO.md § 7](IMPIANTO.md), ordine in § 8.

- [x] Mappa dello stato di fatto: gli strati reggono già — `dominio/` puro, `interfaccia/` non tocca mai `dati`/`azioni`/`ambiente`, `cli/` non importa niente da `src/`
- [x] Disposizione nuova proposta e scelta (D8)
- [x] **Passo 1** — `npm run layers`: il controllo, scritto prima degli spostamenti (D13). Passa su 230 file, 3 deroghe dichiarate e datate, 7 cicli segnalati
- [ ] **Passo 2** — `ui/`: 39k righe ma lo spostamento più isolato del progetto
- [ ] **Passo 3** — `contract/`: `api/` + `protocollo.ts` + `manifesto.ts` + `azioni.ts`
- [ ] **Passo 4** — router, chiamante, link (è C4)
- [ ] **Passo 5** — `core/`: `dominio`, `dati`, `azioni`, e le 582 righe pure di `ambiente`
- [ ] **Passo 6** — l'inversione di D11: la porta, i delegati, `impianta()`. Via otto alias `electron:` da `esbuild.mjs`
- [ ] **Passo 7** — `desktop/`: il resto di `ambiente/`, `guscio/`, `pannelli/`, i link, i widget
- [ ] **Passo 8** — `cli/` fuori da `src/` (è C2)
- [ ] Aggiornare a ogni passo: `esbuild.mjs`, `tsconfig.json`, `eslint.config.mjs`, `electron-builder.json`, `package.json`, `prove/aiuti/*`
- [ ] Alla fine: `ARCHITETTURA.md`, e `IMPIANTO.md` diventa storia

### C7 — I nomi che nominano un prodotto invece di un ruolo

> D14 e D15. Un nome d'implementazione in un posto astratto è una bugia che dura.

- [x] `vscode` → `apparato`: 31 file, 522 occorrenze, più `tsconfig.json`, `esbuild.mjs`, il nome del file e la prosa dei commenti
- [x] I quattro identificativi di comando (D15)
- [x] `aliasShim` → `aliasApparato` in `esbuild.mjs`: anche «shim» è una parola d'implementazione
- [x] **I membri**, che erano ancora l'API di VS Code in inglese. La regola, scritta in testa ad `apparato.ts`: *si traduce quel che nomina un prodotto o un'idea dell'editor, resta quel che nomina un'operazione che si chiama così dappertutto.* Quindi restano `Uri`, `readFile`, `EventEmitter`, `Webview`, `ViewColumn`

  | prima | adesso |
  | --- | --- |
  | `workspace.fs` | `apparato.file` |
  | `workspace.getConfiguration` / `onDidChangeConfiguration` | `apparato.impostazioni.leggi` / `.alCambio` |
  | `workspace.createFileSystemWatcher` | `apparato.osserva` |
  | `workspace.workspaceFolders` | `apparato.cartelleDiLavoro()` |
  | `window.show{Information,Warning,Error}Message` | `apparato.dialoghi.{informa,avvisa,errore}` |
  | `window.show{InputBox,QuickPick,OpenDialog,SaveDialog}` | `apparato.dialoghi.chiedi{Testo,Scelta,File,DoveSalvare}` |
  | `window.showTextDocument` / `withProgress` | `apparato.dialoghi.apriDocumento` / `.conAvanzamento` |
  | `window.createWebviewPanel` | `apparato.finestre.crea` |
  | `commands.{register,execute}Command` | `apparato.comandi.{registra,esegui}` |
  | `env.openExternal` / `clipboard` | `apparato.esterno.apri` / `.appunti` |
  | `Disposable` · `ExtensionContext` · `ConfigurationTarget` | `Smaltitore` · `ContestoApplicazione` · `AmbitoImpostazione` |
  | `WorkspaceConfiguration` · `ConfigurationChangeEvent` | `Configurazione` · `CambioImpostazione` |
  | `FileType` · `FileStat` · `FileSystemError` · `FileSystemWatcher` | `GenereFile` · `StatoFile` · `ErroreFile` · `Osservatore` |
  | `ProgressLocation` · `RelativePattern` · `CancellationToken` | `DoveAvanzamento` · `ModelloRelativo` · `Annullamento` |
  | `SecretStorage` · `SecretStorageChangeEvent` | `DepositoSegreti` · `CambioSegreti` |
  | `MessageItem` · `QuickPickItem` | `VoceMessaggio` · `VoceScelta` |
  | `radiceWorkspace()` · `WorkspaceFolder` | `radiceDiLavoro()` · `CartellaDiLavoro` |

- [x] Le prove che chiamavano l'API con i nomi vecchi, seguite: 8 file. Non è un cambio di comportamento — è la stessa API con altri nomi, e i 1384 test lo confermano
- [ ] Restano per forza, e sono fatti veri su VS Code: `.vscode/settings.json` in `dati/posta.ts`, `--vscode-editor-background` in `stili/tema.css`, `@types/vscode` nel commento di `tsconfig.json`

### C8 — Le letture

> Le scritture sono tutte sotto contratto. Le letture quasi nessuna, ed è il
> lavoro che resta.

Il conto sta in due cifre: **149 scritture e 27 letture**. Le prime undici
rispondevano a chi il registro non ce l'ha; le altre undici — `persone.cerca`, `classi.elenco`,
`classe.persone`, `persone.scheda`, `ore.elenco`, `ore.leggi`,
`valutazioni.elenco`, `valutazioni.voti`, `piani.elenco`, `piani.leggi`,
`consegne.elenco` — sono nate perché l'assistente riceveva nel contesto gli id
della pagina e non aveva un attrezzo che ne prendesse uno. Tutte e ventitré sono
provate, ma il pannello ne chiama cinque, e tre di quelle cinque sono arrivate insieme alla pagina
«Modelli linguistici», che è nata chiedendo invece di ricalcolare. `chiedi()`
ha punti di chiamata in due file soli, `ui/views/templates.ts` e
`ui/views/languageModels.ts`. Per tutto il resto l'host gli spinge il `Registro` intero
dopo ogni scrittura e lui se lo ricalcola.

Fin qui è la scelta scritta in testa a `api/procedure/lettura.ts`, e per la
sveltezza regge. Quel che non regge è la conseguenza: **la stessa regola finisce
scritta in due posti che possono divergere**, ed è già successo. Il commento in
`ui/views/student.ts` lo racconta senza giri — «la stessa persona era al 12% qui e
al 19% sul foglio stampato» — perché quella vista aveva una copia della formula
delle presenze invece della funzione del dominio. Oggi la copia è tolta, ma il
file continua a chiamare `matriceCorso` per conto suo mentre `corso.presenze`
esiste, torna esattamente quei numeri con i denominatori dichiarati accanto, e
non la usa nessuno.

- [ ] Il pannello chiama `corso.presenze` invece di rifare `matriceCorso`
      (`ui/views/courses.ts`, `ui/views/student.ts`). Non è una procedura nuova:
      è smettere di averne due. **Adesso si può**: fino al giro 7 le due strade
      divergevano — `corso.presenze` e `persone.scheda` contavano le ore
      annullate — e passare all'API avrebbe cambiato i numeri a schermo
- [ ] Il pannello chiama `registro.integrita` invece di rifare `riferimentiRotti`
      e `riparazioni` (`ui/shell.ts`, `ui/commands.ts`). Poco urgente: tutte e due
      girano solo quando servono — all'apertura del menu, o se ci sono avvisi
- [ ] `ore.cruscotto` — qual è l'ora da compilare adesso. È la prima domanda che
      un cliente esterno fa, e oggi non c'è modo di farla. Nel pannello la regola
      adesso è una sola, `oraDaFare()` in `ui/state.ts` (barra e comando la
      contavano in due modi, con e senza semestre)
- [ ] `classe.pendenze` — `riepilogoTodo` sotto contratto. La barra e la pagina
      adesso contano sulle stesse classi (`pendenzeDellaBarra()`); il widget
      dell'agenda (`domain/agendaPending.ts`) include ancora le archiviate
- [ ] `valutazioni.orfane` — l'anomalia più netta del contratto: esiste la
      scrittura `valutazione.eliminaOrfane` e **non esiste la lettura che la
      precede**. Il pannello deve calcolarsi da sé la lista da cui l'utente
      sceglie che cosa cancellare
- [ ] `smistamento.daFare` — che cosa c'è in quarantena, per classe.
      `registro.riassunto` ne dà solo il totale
- [ ] La spinta dello stato ricalcola `riferimentiRotti(registro)` a ogni
      scrittura (`panels/panel.ts`). Nel giro 7 è diventata lineare — prima
      chiedeva il nome di **ogni** piano, e il nome ordina tutte le lezioni: era
      O(piani × lezioni) per ogni casella d'appello. Resta una scansione intera,
      senza indice come le altre quattro voci della busta

### C11 — I modelli, da un servizio a un file

> Ollama non c'è più: i modelli sono `.gguf` nella cartella del registro.

Fatto, e sta tutto in `docs/DECISIONI.md`, ADR-25 riscritta. Quel che resta
aperto è di seconda fila, e si scrive qui perché non si scopra fra sei mesi:

- [x] `dati/llamaCpp.ts` — l'assistente carica il `.gguf` nel main process
- [x] `dati/mtmd.ts` — le scansioni passano da `llama-mtmd-cli`, perché
      `node-llama-cpp` non accetta immagini
- [x] `dati/gguf.ts`, `dati/huggingFace.ts`, otto procedure `llm.*` e la pagina
      «Modelli linguistici»: scaricare, trascinare, scegliere, togliere
- [ ] **Le scansioni senza programma esterno.** Il giorno in cui
      `node-llama-cpp` accetta un'immagine, `mtmd.ts` sparisce e con lui
      `registroDocenti.ocr.programma`: è l'ultimo pezzo che chiede a chi insegna
      di installare qualcosa per l'OCR
- [ ] **Il modello caricato non si scarica da sé.** `llamaCpp.ts` tiene i pesi
      in memoria finché non cambiano — sono secondi di caricamento risparmiati a
      ogni domanda — e li libera solo quando si sceglie un altro modello o si
      cancella quello in uso. Su una macchina stretta, un assistente usato una
      volta al mattino si tiene quei gigabyte fino a sera
- [ ] **Il catalogo dei consigliati è scritto a mano** in `huggingFace.ts`.
      Regge finché quei quattro depositi esistono; quando uno sparisce, la riga
      mente e nessuna prova se ne accorge — provarlo vorrebbe dire una prova che
      chiama la rete, che è peggio

### C9 — Le prove dove non ce ne sono

> La massa del codice e la massa delle prove sono invertite.

| Area | Righe | File di prova |
| --- | --- | --- |
| `src/interfaccia/` | 39 559 | **1** |
| `src/dominio/` | 23 318 | 54 |
| `src/dati/` | 11 855 | 10 |
| `src/api/` | 7 114 | 7 |
| `src/azioni/` | 5 879 | **0 propri** (solo di rimbalzo, da `prove/api/`) |
| `src/ambiente/` | 5 148 | 14 |
| `guscio/` | — | **0** |
| `src/cli/` | 532 | **0** |

C'era una cosa peggiore di una prova che manca: una prova che c'è e non gira
mai. `prove/interfaccia/navigazione.py` e `sfoglio.py` sono 914 righe di
regressioni vere su Chromium — pagine, comandi, filtri, tendine, tastiera,
responsive, registro vuoto — e stavano fuori da `npm test` e fuori dalla CI.
**Quel che questa voce temeva era già successo**: al primo tentativo di
eseguirle, nel giro 3, `navigazione.py` era rossa — ferma a prima che nascesse
la pagina «Modelli linguistici», e nessuno lo sapeva da mesi.

- [x] Portarle dentro la costruzione: `npm run ui-tests`
      (`strumenti/proveInterfaccia.mjs`: trova l'interprete, dice che cosa manca
      quando manca, lancia i due file) e un lavoro di CI a parte in
      `.github/workflows/verifica.yml`, perché vogliono Python, playwright e un
      Chromium che gli altri controlli non chiedono. Resta aperta la riscrittura
      su Playwright per Node, che toglierebbe di mezzo Python: non urge più
- [ ] Solo dopo: la prova di regressione dell'appello del giro 2 — oggi non ha
      dove stare, perché il difetto vive in una chiusura del DOM e nessuna prova
      `.mjs` può vederlo
- [ ] `src/cli/`: un condotto finto su socket, come quello già usato per i fix
      del giro 0 (è anche in C2)
- [ ] `src/azioni/`: una cartella di prove propria, o la constatazione scritta
      che `prove/api/` la copre già abbastanza

### C10 — L'efficienza

> Non è lento. È scritto in un modo che diventa lento se il docente prende una
> cattedra in più.

Chiuso quasi per intero nel giro 7: la `Map` delle presenze in `matriceCorso`
(tiene il **primo** doppione, come `find`), `riferimentiRotti` lineare (C8), la
catena morta `riepilogoCruscotto` → `colonnaCruscotto` → `lezioniDelCorso`
tolta invece che ottimizzata, i quattro timeout da 1000 ms raccolti in
`mostraComunque()` (`environment/showAnyway.ts`), e la barra di stato che non
ricalcola più pendenze e ora da compilare a ogni ridisegno (`derivato()` in
`ui/state.ts`, memoria per oggetto `Registro`). `GRUPPI` in `shell/windows/menu.ts`
non era accoppiato al manifesto — le etichette sono locali — ma aveva un ramo
morto che teneva fuori dal menu nativo «Modifica» e «Visualizza»: corretto.

- [ ] Lo stesso schema di `matriceCorso` in `mediaAllievo`
      (`domain/calculations.ts`): trascurabile oggi (25 × 20 × 25), da fare solo
      se si tocca il file per altro. Niente `WeakMap` sugli array dei voti: le
      azioni fanno `push`, e l'indice resterebbe vecchio

### C6 — Il codice morto

> Toglierlo, senza perdere una funzionalità.

- [x] Export senza consumatori: `npm run census` ne conta **zero** alla fine del giro 7. Si rilegge, non si ricorda
- [ ] Export che usano **solo le prove** — `census` non li vede: `primoGiornoUtile`
      (`domain/agendaMonth.ts`, descritta e mai collegata al calendario), `TERMINI`
      (`domain/lexicon.ts`), `dellaCasella` (`domain/mailbox.ts`: il controllo di
      «chi è entrato» dopo l'accesso OAuth, documentato e mai chiamato — collegarlo o
      toglierlo), `tendinaAccesa` (`ui/assistant/parts.ts`). Una sessantina di altri
      export usati solo nel proprio file e dalle prove sono candidati interni (D6)
- [ ] Funzioni, rami e costanti che nessuno raggiunge
- [ ] Doppioni: la stessa regola scritta in due posti che possono divergere
- [x] CSS e risorse non più riferite: **zero orfani**, e zero file `.ts` mai importati (i cinque che risultano tali sono entry point di esbuild)
- [x] I **7 cicli di import** che stavano dentro `src/interfaccia/` — `moduli/{comune,corso,classe,materia}` e `viste/{recuperi,valutazioni,riconsegne}` — sono **sciolti**: `npm run layers` ne conta zero, e tiene la riga che li conta apposta perché restino zero
- [ ] Dopo ogni rimozione: `tsc`, `eslint`, `npm test` (D2)

---

## 3. Il registro dei giri

### Giro 0 — la mano, non lo sciame

Verifiche di base tutte verdi. Cinque difetti trovati a mano nel codice nuovo
dell'ultimo commit (API, condotto, riga di comando), tutti corretti:

1. **La riga di comando mandava testo dove il contratto vuole un numero.**
   `converti()` confrontava `forma.type === 'number'`, ma un campo `nullabile()`
   pubblica `"type": ["number","null"]` — un elenco, non una parola. Provato
   end-to-end: `--valore 5.5` partiva come `"5.5"`. Peggio: `--pianoId null`
   mandava il **testo** `"null"`, che per `identificatore()` è una stringa
   valida e finiva scritta nel registro al posto del distacco voluto.
2. **`entita()` pubblicava un contratto che rifiuta il dato buono.** Lo JSON
   Schema di `ore.salva` diceva `additionalProperties: false` con il solo `id`
   fra le proprietà: chi convalida il proprio ingresso contro `$schema` si
   rifiuta da solo di mandare una `Lezione` vera.
3. **Il condotto: una promessa rifiutata avvelenava la coda.** `coda.then(...)`
   senza `catch`: la connessione avrebbe smesso di rispondere in silenzio
   restando aperta.
4. **Il condotto: server non chiuso se `listen` fallisce.**
5. **`ore.appello.leggi` riportava le UD della prima riga** invece di quelle
   dell'ora — zero su un'ora senza appello.

Aggiunte 2 prove di regressione in `prove/api/schemi.test.mjs`; `docs/API.md`
allineato sui due punti di contratto. 1384 test verdi.

**Non coperto dal giro 0:** `src/interfaccia/` — 39k righe, il 41% del codice —
guardata solo di sfuggita.

### Giro 1 — caccia a sciame

Dieci dimensioni, un cacciatore e uno scettico per ciascuna. 20 agenti, 3,6 M
token, 19 minuti. **42 reperti, 39 confermati, 3 confutati** — tasso di
confutazione basso, quindi i dieci «alto» li ho riverificati a mano uno per
uno prima di toccarli: tutti e dieci reggevano, descritti con precisione.

**I dieci alti, corretti:**

| Dove | Che cosa succedeva |
| --- | --- |
| `dominio/matriceCorso.ts` | l'esonero stava al **denominatore** di `presenza` e non al numeratore: chi è esonerato tutto l'anno da educazione fisica leggeva «presenza 0%» senza aver mai mancato un'ora — mentre tre punti del codice e la guida dentro l'app dichiaravano il contrario. Corretto anche nella copia in `viste/allievo.ts` |
| `azioni/ore.ts` | toccare **una** casella dell'appello ricostruiva le righe dal solo elenco attivo: la riga di chi si era ritirato spariva da *tutte* le ore, comprese quelle che aveva fatto, e con lei la percentuale su cui era stata scritta una segnalazione |
| `dati/anni.ts` | `inglobaCartelle` mandava la cartella nel cestino **anche se un file non era entrato** nel documento. Il `catch` diceva «la sua cartella non si cancella perché il file c'è ancora», ma non aveva modo di farlo valere. E su una chiavetta o una condivisione di rete `fs.ts` ripiega sulla cancellazione definitiva |
| `dati/exchange.ts` | il terminatore del `DATA` partiva **due volte** — `perFilo` lo scrive già, e `chiedi('.')` ne aggiungeva un altro. Il primo messaggio sembrava riuscito, il 500 del punto di troppo sfasava tutte le risposte dopo: su un giro d'invii — una richiesta di firma per persona — partiva **solo il primo** |
| `interfaccia/componenti/base.ts` | una data illeggibile lasciava il campo nascosto **alla data di prima**: si scriveva «31.02.2026», si premeva Salva, la finestra si chiudeva, la notifica diceva «salvato» e nel registro restava la data vecchia |
| `dominio/datiRapporti.ts` | con più corsi il monte ore sommava solo quelli **con orario**, mentre le assenze arrivavano da tutti: una classe con un laboratorio non pianificato leggeva «assenza del 91%» dove il conto vero diceva 48, e sopra il 20% la scheda ci scrive un avviso |
| `interfaccia/stato.ts` | il `semestreId` ricordato non si riconvalidava cambiando documento — l'unico campo ricordato senza controllo: la tendina «Periodo» diceva un semestre e i conti erano dell'anno intero |
| `ambiente/agenda.ts` | cambiare una misura del widget lo chiudeva e non lo faceva rinascere: `close()` è asincrono, chi riapriva subito trovava la finestra morente ancora viva, e il `closed` della vecchia azzerava la striscia nuova |
| `guscio/principale.ts` | doppio clic su un `.registro` mentre è aperto il benvenuto: `avvia()` trattava `altrove` come una rinuncia e faceva `app.exit(0)` — mentre il tipo dichiara a chiare lettere che non lo è. Aggiunta anche l'attesa dei comandi, o l'anno non si sarebbe aperto lo stesso |
| `azioni/rapporti.ts` | la rigenerazione differita dei PDF teneva il `Registro` in chiusura, ma `leggiTutto` **sostituisce** l'oggetto: fra gli 8 e i 60 secondi d'attesa una rilettura ci sta comoda, e i PDF uscivano con i dati di prima, in silenzio |

| Dimensione | Che cosa copre |
| --- | --- |
| `dominio-nucleo` | validazione, modelli, calcoli, date, anni, orario, assenze, recuperi |
| `dominio-rapporti` | rapporti, datiRapporti, proiezione, mappa, matriceCorso, cruscotto, agenda\* |
| `dominio-resto` | testo, lessico, importazione, smistamento, consegne, riparazioni, orfani, eliminazioni |
| `dati-archivio` | archivio, archiviazione, deposito, pacchetto, anni, apertura, percorsi, zip |
| `dati-esterni` | posta, outlook, exchange, oauth, ocr, pdf, rapportiPdf, smistatore, geocodifica |
| `interfaccia-viste-a` | calendario, allievo, lezione, sfoglio |
| `interfaccia-viste-b` | assenze, docenteClasse, valutazioni, classi, piani, smistamento, documenti/, impostazioni/ |
| `interfaccia-nucleo` | stato, comandi, ponte, dom, pagine, moduli/, componenti/ |
| `ambiente-azioni` | ambiente/, azioni/, avvio, agenda, protocollo, vassoio, guscio/ |
| `api-cli` | contratto, nucleo, schemi, condotto, procedure/, registro.mjs |

### Giro 2 — otto dimensioni, sola lettura poi mano

Otto agenti in sola lettura, una dimensione per ciascuno: flusso delle scritture,
flusso delle letture, i contratti delle procedure, dominio, dati e servizi
esterni, interfaccia, strato desktop, struttura ed efficienza. Ogni reperto
riletto a mano prima di toccarlo.

**Quattro dimensioni su otto hanno reso zero**, ed è un risultato e non un buco:
il dominio (23k righe, quattro ipotesi verificate e tutte e quattro cadute), lo
strato desktop (`contextIsolation` ovunque, CSP con nonce per pagina, doppia
difesa contro il traversal in `protocolloFile.ts`, whitelist di schemi su
`openExternal`), i due casi che `npm run forms` segnalava come «da guardare a
mano» — entrambi falsi positivi dello strumento, che non sa seguire `valori`
passato intero a `recapitiScelti` — e i sette cicli di import, già sciolti.

**I cinque corretti:**

| Dove | Che cosa succedeva |
| --- | --- |
| `docs/` | Gli otto documenti erano stati cancellati dall'ultimo commit, che nello stesso diff **aggiungeva** due riferimenti a quei file. Ripristinati da `46fdcc9^` |
| `interfaccia/viste/lezione.ts` | Due clic rapidi sulla stessa casella d'appello ricalcolavano `prossimoStato` dal valore del ridisegno precedente, che il giro di IPC non aveva ancora aggiornato: due tocchi per arrivare ad «assente» scrivevano «presente» due volte, senza errore e senza che niente lo dicesse. Sulla casella di colonna, per l'intera classe. Ed è proprio il gesto che quel pulsante incoraggia — «l'appello si fa a raffica», dice il commento che gli toglie la rotella apposta. Adesso si riparte da quel che si è mandato, non da quel che si vede, e un rifiuto riporta a fidarsi del ridisegno |
| `api/nucleo.ts` | `chiama()` costruiva il contesto senza origine: `ambito.origine` diceva la verità e `ambito.contesto.origine` diceva `undefined` per chiunque non arrivasse dal ponte — cioè agenda, condotto e riga di comando, esattamente i chiamanti per cui il campo è stato inventato. Latente, non ancora esploso |
| `dati/pdf.ts` | `contaPagine` non aveva il `finally` che le altre due funzioni del file avevano già: ogni PDF rovinato lasciava vivo un compito di pdfjs con il suo lavoratore dietro. E il PDF rovinato lì è il caso **previsto** — chi chiama lo prende in un `catch` apposta per metterlo in quarantena invece di buttarlo |
| `dati/oauth.ts` | Le due sole `fetch` del registro senza scadenza. Non due qualunque: stanno **prima** che l'invio diretto apra il collegamento SMTP, quindi una rete che accetta e non risponde — un portale captive, un filtro che lascia cadere i pacchetti — bloccava l'intera spedizione senza niente da mostrare e niente da annullare |

**I quattro aperti**, tutti scritti nel cantiere che li riguarda: la coda per
trasporto invece che per archivio (C3), la backpressure del condotto (C3), lo
smistamento automatico che scrive fuori dal contratto (C3), e i `find` dentro i
cicli di `matriceCorso`/`calcoli`/`cruscotto` (C10).

### Giro 3 — sei dimensioni esplorate, cinque applicate

Sei agenti in sola lettura su sei dimensioni scelte dal lavoro chiesto:
impostazioni (organizzazione e correttezza), grafica (sistema visivo),
scaricamenti dei componenti esterni, contemporaneità delle attività, coerenza e
codice morto, difetti dell'interfaccia. Poi cinque agenti che applicano, su
perimetri di file **disgiunti** perché lavorano insieme.

**96 reperti, 16 di severità alta.** Il tasso di conferma è alto come nel giro
1, e per la stessa ragione: a ogni esploratore è stato chiesto di scrivere anche
le ipotesi cadute, e le ipotesi cadute sono la metà del valore del rapporto —
dicono che cosa non serve più guardare. Fra le cose che *reggono*: nessun
gestore rientra in `chiama()` (quindi la coda unica di C3 non può stallare), i
21 token di colore sono simmetrici nei due temi, nessuna chiave delle
impostazioni è orfana, le uniche classi CSS morte sono due su 1227, e
`risorse/attrezzi.json` è allineato alle 176 procedure.

**I sedici alti, per dimensione:**

| Dimensione | Che cosa succedeva |
| --- | --- |
| impostazioni | `depositoJson.salva` scriveva la fotografia presa **prima** della rilettura protettiva: se il blocco di OneDrive si scioglieva in quell'istante, l'intero `impostazioni.json` veniva sostituito dalla chiave appena scritta — e `salva` tornava `true`, quindi l'evento partiva come se fosse andata bene. Lo stesso deposito tiene i segreti della posta, i documenti recenti e i posti delle finestre |
| impostazioni | La finestra nativa ignora `dipendeDa`: `api.lettura` si vede spuntata e modificabile con il condotto spento, cioè la pagina che governa un accesso dichiara concessa una cosa che il condotto non concede |
| impostazioni | `formato: 'email'` non è una dogana: `valoreAccettabile` non lo guarda, e dal pannello e dalla riga di comando si salva un mittente che non è un indirizzo |
| scaricamenti | `AbortSignal.timeout(30_000)` passato a `fetch` vale **anche per il corpo in streaming**: ogni scaricamento più lungo di trenta secondi muore. Il modello whisper pesa 574 MB — non sarebbe mai arrivato. Misurato, non dedotto |
| scaricamenti | Due domande insieme all'assistente caricano **due copie dei pesi**: `pesi()` è un controlla-poi-agisci con un `await` in mezzo, e la seconda assegnazione rende la prima irraggiungibile — gigabyte di memoria nativa che non si liberano più |
| scaricamenti | I pesi si smaltiscono sotto chi li sta usando: una domanda salta la coda delle scritture, quindi può essere viva mentre `llm.elimina` cancella il modello |
| scaricamenti | Un `.gguf` scaricato non viene verificato — né impronta né i quattro byte in testa — mentre il commento del file promette che «su tutte e tre passa la stessa guardia» |
| scaricamenti | `llama-mtmd-cli` sopravvive all'applicazione fino a tre minuti, tenendo aperto il `.gguf`: al riavvio «Elimina» dirà che il file è occupato |
| contemporaneità | La rigenerazione dei PDF alla chiusura d'ora cattura l'oggetto `Registro` e lo usa decine di secondi dopo: se nel frattempo il documento è stato riletto, i verbali escono con i dati di prima. La correzione esiste già novanta righe più sotto, sulla funzione gemella, e non è mai stata portata qui |
| contemporaneità | `modifica` torna **sempre** «fatto»: se durante un dialogo di sistema il documento cambia e l'id sparisce, il registro dice «salvato» e non ha salvato niente |
| contemporaneità | Allo spegnimento non si aspettano né si fermano la coda del pannello, quella dei PDF e quella dell'OCR: una pagina letta dall'OCR dopo `lasciaPacchetto()` è persa in silenzio |
| contemporaneità | Il commento dice che `subscriptions` si svuota allo spegnimento. Non lo svuota nessuno: li uccide `app.exit(0)` |
| contemporaneità | Lo smistamento automatico scrive fuori dal contratto **a ogni cambio di documento**, non solo all'accensione (era noto solo per l'accensione) |
| coerenza | `valutazioni.voti` conta nella media anche i voti di chi è segnato assente, e risponde `0` dove il dominio risponde `null`: la procedura dà numeri diversi da quelli che l'applicazione mostra |
| interfaccia | Il filtro «Corso» ricordato non si riconvalida cambiando documento, e la tendina si accende su «Tutti i corsi» mentre filtra su un corso che non esiste — con il calendario vuoto e nessun modo ovvio di uscirne |
| interfaccia | La casella «Cerca su Hugging Face» si svuota quattro volte al secondo durante uno scaricamento, perché non ha `data-fuoco` e la pagina si ridisegna |

**Corretto in questo giro, a mano, prima di mandare gli applicatori:** il primo
— il deposito — con due prove di regressione: «il blocco che si scioglie fra la
lettura e la scrittura» e «chi non cambia niente non fa scrivere». `salva`
adesso prende una **funzione** e non un valore, così l'ordine fra rilettura e
cambiamento non si può più sbagliare; i quattro depositi — impostazioni,
segreti, recenti, posti — l'hanno adottata.

**E una pendenza di C9 chiusa:** `npm run ui-tests` esiste, e con lui un
lavoro di CI a parte. Le 914 righe di regressioni su Chromium non le lanciava
nessuno da mesi — e infatti **non passavano più**: `navigazione.py` era ferma a
prima che nascesse la pagina «Modelli linguistici». Si era avverato, parola per
parola, quel che C9 diceva che sarebbe successo.

**Che cosa hanno chiuso gli applicatori.** Tutti e sedici gli alti, e con loro la
gran parte dei medi. In ordine di quel che si vede:

- **Le impostazioni** — `dipendeDa` onorato anche dalla finestra nativa, il
  `formato` diventato una dogana vera (e con lui `minimo`/`massimo`), un rifiuto
  che si legge invece di sparire, le due superfici che si parlano, lo stato del
  widget tolto dalle scelte con `nascosta`, i percorsi e le attese raccolti in un
  gruppo `avanzata`, il condotto con una sezione sua e un'avvertenza in testa, un
  filtro per cercare una chiave per nome. Undici sezioni, e l'ultima che raccoglie
  resta **vuota di chiavi**, che è esattamente il suo mestiere.
- **La grammatica visiva** — vedi C13, che resta aperta solo sul lavoro lungo.
- **Gli scaricamenti** — la scadenza che adesso conta il silenzio e non la durata
  (misurata: uno scarico da 40 secondi moriva a 30, adesso arriva), una promessa
  condivisa che impedisce due copie dei pesi, un conteggio d'uso che impedisce di
  smaltirli sotto chi li sta usando, i quattro byte controllati su quel che
  scende, l'estrazione che non lascia più mezzo `.exe` buono per sempre, un
  parziale già completo che si verifica invece di riscaricarsi, e i tasselli della
  mappa con scadenza, deduplica e scrittura atomica.
- **La contemporaneità** — la fila unica, la chiusura pulita, la backpressure del
  condotto (vedi C3).
- **I doppioni che erano guasti** — i voti degli assenti fuori dalla media
  dell'API, `nomeSicuro` con la sua barra rovescia in tutti e tre i punti,
  l'ordinamento delle lezioni stabile ovunque, gli stati d'appello derivati da un
  dizionario, i due tetti dei giri d'attrezzo riconciliati, e il movimento di file
  che rispediva `archivio/` ed `esportazioni/` dentro la cartella vecchia.
- **L'interfaccia** — la tendina che mentiva (corretta in `dom.ts`, alla radice:
  il `value` di un `<select>` si applica **dopo** le `option`), la casella di
  ricerca che si svuotava, il fuoco che usciva dall'assistente, il destinatario
  che spariva aggiungendone due di fila, i nodi staccati dello sfoglio, la palette
  che non trovava «Chi li rifà» cercando «rifa», e le classi che si elencavano
  M1, M10, M2.

**Che cosa è stato guardato a schermo, non solo letto.** Le pagine del pannello
sono state ritratte in chiaro e in scuro con l'impalcatura delle prove, ed è così
che è saltato fuori l'ultimo difetto del giro: una sezione delle impostazioni
senza voci mostrava la frase della sezione *che raccoglie* — «non ha impostazioni
sue» — anche quando le impostazioni semplicemente non erano ancora arrivate
dall'ospite. Tre vuoti diversi raccontati con la stessa frase.

### Giro 4 — lo scorrimento, sei dimensioni

Sei esploratori in sola lettura su una domanda sola, divisa in sei: chi possiede
lo scorrimento in ogni telaio, che cosa si perde al ridisegno, tastiera e messa
a fuoco, i contenitori dentro i componenti, altezze e viewport, fluidità e
coerenza percepita. **Sette alti, tutti riverificati a mano prima di toccarli**,
e una dozzina fra medi e bassi.

Il difetto dominante era uno solo e sistemico: `main.contenuto` — la scatola su
cui scorre **quasi ogni pagina** — era l'unica grande assente da
`data-scorrimento`. Il meccanismo esisteva ed era ben fatto: `ui/dom.ts` lo
usava per la navigazione, l'archivio, lo sfoglio dei PDF, l'elenco delle
persone e il filo dell'assistente — cinque casi locali — e non per il caso più
comune di tutti, la pagina intera. Siccome il registro rifà l'albero a ogni
cambio di stato, chi si era scorso in fondo alle pendenze tornava in cima a ogni
spunta, e a ogni battito dell'orologio.

**I sette alti, corretti:**

| Dove | Che cosa succedeva |
| --- | --- |
| `ui/shell.ts` | `main.contenuto` senza `data-scorrimento`: ogni pagina tornava in cima a ogni ridisegno. La chiave adesso nomina vista, destinazione e soggetto, così cambiando classe o persona si riparte dall'alto — che è giusto — e restando si resta |
| `ui/dom.ts` + `ui/assistant/chat.ts` | La conversazione veniva rimessa **allo stesso pixel** mentre cresceva: ogni pezzo di risposta — il turno vuoto, ogni attrezzo, ogni risultato — spuntava sotto il bordo, e bisognava riscorrere a mano dietro al modello. Nasce `data-segue-fondo`: chi era in fondo ci resta, chi era risalito a rileggere non viene tirato giù |
| `ui/views/calendar.ts` | Settimana, Agenda e Anno non avevano memoria: solo il Mese l'aveva, con un meccanismo suo. Nella Settimana si scorre l'**ora del giorno**, quindi la chiave è ferma: chi lavora sul pomeriggio ci resta passando alla settimana dopo |
| `ui/components/palette.ts` | Le frecce cambiavano la riga scelta senza portarla in vista: il fuoco resta nel campo — è quel che permette di continuare a scrivere — quindi il browser non la insegue da sé, e su una finestra bassa si premeva Invio alla cieca |
| `ui/components/table.ts` + tre viste | Le matrici — voti, assenze, documenti di classe — ripartivano in cima a ogni voto scritto. `tabella()` ha adesso una chiave di scorrimento fra le sue opzioni |
| `environment/dialogs.ts` + `shell/dialog.html` | Il tetto della finestra di dialogo erano 620 pixel fissi, che non sanno niente di «Dimensione testo» di Windows: al 200% l'eccedenza non veniva tagliata, **spariva**, con dentro i pulsanti, e restava solo Esc. Adesso il tetto è lo schermo, e il corpo scorre |
| `shell/dialog.html` | `dichiaraAltezza()` era chiamata una volta sola, **prima** che la convalida rispondesse: un errore su due righe cresceva sotto il bordo di una finestra già misurata |

E due di coerenza, che erano il vero argomento del giro: `overscroll-behavior`
stava scritto in otto scatole su ventidue, `scrollbar-width` in quattro,
`scrollbar-gutter` in nessuna, e quattro fogli stimavano a occhio lo stesso
ingombro (`100vh - 160px`, `- 260px`, `- 9rem` in tre punti). Adesso la regola
sta in un posto solo — `styles/foundations.css`, con le tre ragioni scritte — e
l'ingombro è un token, `--fuori-pagina` in `styles/metrics.css`. Il colore della
barra non si tocca: lo dà già `color-scheme` in `theme.css`.

**Le ipotesi cadute** — la metà del valore, come nei giri prima. Non sono
difetti, e non serve riguardarli: il menu a comparsa (è un portale su `body`,
con la posizione limitata al viewport e il proprio tetto); il menu che si
chiuderebbe scorrendosi dentro (la guardia `contains` include il nodo stesso);
la trappola del fuoco nei modali e il fondo che scorrerebbe sotto (`body` ha
`overflow: hidden` sempre, non solo con un modale aperto); le miniature dei PDF
(un solo `IntersectionObserver` condiviso, ripulito a ogni disegno); il modale
più alto dello schermo (testata e piede non scorrono, solo il corpo, quindi
Salva e Annulla restano sempre visibili); la matematica dello scorrimento
infinito del calendario (il delta è letto prima e applicato dopo tutte le
mutazioni); `scroll-behavior: smooth` globale (non esiste, quindi il ripristino
non viene animato); `prefers-reduced-motion` (coperto in nove fogli — l'unico
buco era una chiamata JavaScript, che il CSS non può vedere).

Una prova nuova, `tests/ui/scroll.py`, registrata in `npm run ui-tests`:
sarebbe stata rossa prima. Verificato togliendo l'attributo a runtime e
rifacendo lo stesso gesto — 400 diventa 0.

### Giro 5 — l'icona, quattro dimensioni

Quattro esploratori in sola lettura: formati e misure, puntamento alle
cartelle, coerenza nei luoghi del sistema, prestazioni. **Un alto**,
riverificato nel sorgente di electron-builder prima di toccarlo; cinque medi;
una manciata di bassi. Due dimensioni su quattro — cartelle e prestazioni —
hanno reso zero difetti di comportamento.

**Corretti:**

| Dove | Che cosa succedeva |
| --- | --- |
| `electron-builder.json` | **Alto.** `fileAssociations[].icon: "icons/icon.ico"`: su macOS electron-builder scambia l'estensione (`getPlatformIconFileName`), cerca `icons/icon.icns` e la build si ferma con `InvalidConfigurationError`. Tolta la chiave: il documento prende l'icona dell'eseguibile, e su Windows NSIS scrive `"$appExe",0` — la stessa che riscrive `shell/system/fileAssociation.ts`, che prima divergeva (`$INSTDIR\resources\icon.ico`) |
| `electron-builder.json` | `mimeType: application/zip`: lo legge solo Linux, dove il `.desktop` dichiarava `MimeType=application/zip` e il registro si proponeva per **ogni** archivio. Adesso `application/x-registro-docenti` |
| `tools/icons.cjs` | Il `.ico` aveva sette misure: mancavano la 20 e la 40, quelle dello schermo al 125%, e Windows rimpiccioliva la 24 e la 48. Adesso nove |
| `tools/icons.cjs` | `npm run icons` dal terminale di VS Code cadeva su `app` indefinito: `ELECTRON_RUN_AS_NODE` ereditato. Si rilancia senza, come `tools/dev.mjs` |
| `environment/notifications.ts` | Il portabile appuntato alla barra puntava all'exe estratto in `%TEMP%`: alla chiusura restava un pin con l'icona bianca. `setAppDetails` su ogni finestra, con `PORTABLE_EXECUTABLE_FILE` come comando e icona |
| `environment/tray.ts` | Fuori da Windows il PNG veniva ridotto a 16 fisso: sfocato su Retina, ingrandito nei cassetti Linux da 22-24. Ora 16 + @2x su macOS, 32 su Linux |
| `shell/main.ts` | Da sorgenti su macOS il Dock mostrava l'atomo: `app.dock.setIcon` |
| `shell/system/fileAssociation.ts` | **Per tutti gli utenti** l'installer scrive la classe in HKLM, ma il programma la riscriveva in HKCU per ogni utente che lo apriva — e HKCU vince. Disinstallato, ogni utente restava con i `.registro` a icona bianca. Adesso, se HKLM apre già questo eseguibile, non si scrive e la vecchia copia in HKCU si toglie |
| `src/cli/disinstalla.mjs` | Toglieva da HKCU la classe `Registro docenti` senza guardare dove puntasse: «Disinstalla…» dal portabile si portava via l'associazione dell'installato per utente. Adesso solo se apre questo eseguibile |
| `environment/notifications.ts` | Il portabile ha un'identità sua (`….portabile`), registrata in `HKCU\Software\Classes\AppUserModelId` con nome e icona — copiata nella cartella dei dati, perché quella del programma sparisce con `%TEMP%`. Senza collegamento, le sue notifiche non avevano icona; con l'identità dell'installato, le sue finestre finivano sotto il pin dell'altro. «Disinstalla…» toglie la chiave |
| `environment/notifications.ts` | **Da sorgenti** si usava l'identità dell'installato, e per avere le notifiche si era fatto a mano `Electron.lnk` su `electron.exe` senza argomenti. Quel collegamento si prendeva l'identità anche per l'installato: notifiche intestate «Electron», e il clic su notifica o pin apriva la finestra vuota «electron.exe path-to-app». Adesso i sorgenti hanno un'identità propria (`….sviluppo`), registrata senza collegamento; il collegamento è stato tolto |
| `environment/systemStartup.ts` | Il portabile registrava l'avvio automatico su `process.execPath`, la copia in `%TEMP%` che sparisce: all'accesso dopo Windows lanciava un file inesistente. Adesso `PORTABLE_EXECUTABLE_FILE`, anche nella rimozione di «Disinstalla…» |

Più i nomi rimasti dal rinomino `icone/` → `icons/`, `risorse/` → `resources/`
in `docs/ARCHITETTURA.md`, `eslint.config.mjs`, un commento di
`environment/context.ts` e `tests/environment/windows.test.mjs`. Prova nuova:
`tests/environment/icons.test.mjs`, **tre casi rossi sullo stato di prima**
(verificato rimettendo i due file vecchi).

**Le ipotesi cadute.** `buildResources: "icons"` che toglierebbe le icone dal
pacchetto (le esclude in testa, `files` le reinclude dopo: l'ultimo pattern
vince, e `win-unpacked` le ha); `asarUnpack "icons/**"` senza `**/`
(corrisponde); `fuoriDallAsar` nel portabile, su macOS e in AppImage (stessa
forma); `iconPath` SVG dei pannelli (inerte per scelta, `windows.ts`); una
finestra senza icona (tutte e otto hanno `...icona()`); AUMID diverso
dall'`appId` o dichiarato tardi (`verificaIdentita()` e cima di `main.ts`);
associazione scritta dal portabile o da sorgenti (guardie in
`fileAssociation.ts`); ICO tutto PNG rifiutato da makensis o rcedit (le build in
`pacchetti/` ci sono); `existsSync` a ogni finestra (≈50 µs, nessun ciclo
caldo: una cache non vale la trappola che mette a `tray.test.mjs`); doppio
`smaltisci` del vassoio (due guardie); il PNG da 512 alle notifiche.

### Giro 6 — il riquadro d'avvio

Un esploratore sul ciclo di vita dello splash (`shell/windows/splash.ts`,
`avvia` in `shell/main.ts`), tre alti riverificati a mano. Il filo comune:
lo splash non è solo uno sguardo, è **l'ultima finestra**, e dove spariva
senza un sostituto `window-all-closed` faceva uscire l'applicazione.

| Dove | Che cosa succedeva |
| --- | --- |
| `shell/main.ts` | **Alto.** Dal benvenuto, scelto l'anno, il benvenuto si chiudeva e per tutta l'apertura non c'era nessuna finestra: `window-all-closed` → uscita a metà avvio. Ora lo splash rinasce dopo la scelta e fa da ponte |
| `shell/main.ts` | **Alto.** «Crea anno»: lo splash scadeva dopo 4 s a «salva con nome» aperto (che non è una finestra del registro) → uscita mentre si sceglieva la cartella. Ora resta e dice «Scegli dove salvare…»; cede al pannello o, annullando, al benvenuto |
| `shell/main.ts` | **Alto.** `preparaDocumento` stava fuori dal `try`, e `avvia` senza `catch`: un `impostazioni.json` bloccato lasciava «Avvio del registro…» per sempre. Ora dentro il `try`, più un `catch` di sicurezza che dice l'errore ed esce |
| `shell/windows/splash.ts` | Alt+F4 sullo splash durante un trasloco dei dati usciva a trasloco a metà: `closable: false` |
| `shell/windows/splash.ts` | L'agenda sul desktop, che si mostra a metà avvio, contava come «finestra arrivata»: lo splash spariva col pannello ancora nascosto. Ora contano solo le finestre che prendono il fuoco |
| `shell/main.ts` | Errore d'avvio: lo splash restava dietro al messaggio. Ora va via prima |
| `shell/main.ts` | Con `aperturaAutomatica` spenta lo splash scadeva e faceva scattare la nuvoletta del vassoio senza che nessuno avesse chiuso niente: ora non compare |

**Le ipotesi cadute:** seconda istanza (esce prima di `whenReady`), invii a
una finestra distrutta (`viva()`, `isLoading`, la fase rimandata a
`did-finish-load`), timer e ascoltatori lasciati in giro (`chiudi` li toglie),
doppio splash (idempotente), lampo bianco (`show: false` + `ready-to-show` +
colore del tema), barra di progresso (indeterminata, niente percentuali da far
tornare indietro), dialoghi appoggiati allo splash (`escludiDaiDialoghi`).

- [ ] Nessuna prova automatica: il ciclo di vita dello splash sta nel processo
      principale, che né `node --test` né le prove in Chromium avviano. Da
      provare a mano: primo avvio → Apri; primo avvio → Crea → annulla e
      conferma; Alt+F4 sullo splash; agenda accesa

### Giro 7 — tutto il progetto, otto dimensioni

Otto esploratori in sola lettura, una domanda ciascuno: integrità del documento
sul disco, numeri e casi limite del dominio, contratto e trasporti, azioni di
scrittura, stato della pagina e ridisegni, processi figli e rete, confini del
processo principale, regole scritte in due posti. Poi otto applicatori su
perimetri disgiunti, e per ultime — su albero fermo — le modifiche che
attraversavano più perimetri. **Sette alti, tutti riverificati a mano** prima di
toccarli; una sessantina fra medi e bassi. Prove: da 1946 a 2000, più una in
Chromium.

**I sette alti:**

| Dove | Che cosa succedeva |
| --- | --- |
| `data/package.ts` | L'accodata scriveva agli offset del file **com'era quando l'aveva letto**, senza guardare il disco. Due scrittori sullo stesso anno — due PC con «Apri lo stesso», installato più portabile — e la modifica del primo spariva, o il file non si apriva più. Adesso si confrontano misura e ultimi 22 byte, e se non tornano si rifà il file intero |
| `data/archive.ts` | Una ricarica (osservatore, OneDrive) sostituiva lo stato dopo tre attese: una modifica arrivata lì in mezzo spariva in silenzio, anche riaprendo |
| `data/years.ts` | `impacchettaAnni` e `migraAnni` saltavano un JSON che non si leggeva — un segnaposto OneDrive offline — e poi mandavano `dati/` nel cestino, che su una chiavetta è cancellazione definitiva. Era il difetto corretto nel giro 1 in `inglobaCartelle`, rimasto nelle due sorelle |
| `actions/reports.ts`, `actions/context.ts` | Il cambio di documento non passa dalla fila: aprire un altro anno mentre venti schede si scrivono, o mentre la geocodifica gira per minuti, faceva finire **i PDF e gli indirizzi dei minori di un anno dentro il documento dell'altro**. Adesso ogni scrittura guarda di essere ancora sul suo documento (`ancoraQui()`), e se no risponde `conflitto` |
| `data/sorter.ts` | Le stesse pagine si potevano assegnare a due allievi: il documento di un minore nel fascicolo di un altro |
| `environment/theme.ts`, `data/outlook.ts`, `data/opening.ts` | `reg` e `rundll32` lanciati **per nome**: su Windows il nome si cerca prima nella cartella corrente, che col doppio clic è quella del documento. Provato: un `reg.exe` messo accanto a un `.registro` condiviso partiva allo splash. Percorsi interi in System32, `NoDefaultCurrentDirectoryInExePath`, e una prova statica che rifiuta i nomi nudi |
| `ui/views/plans.ts` | L'editor del piano restava in memoria e, dopo una modifica fatta altrove, alla prima nota **riscriveva la versione vecchia sopra la nuova** |

Più uno che era un doppione che divergeva: `corso.presenze` e `persone.scheda`
contavano le ore annullate, la pagina e i PDF no — e bloccava C8. E uno solo su
Linux: la riga di comando cercava il socket in una cartella diversa dal server.

**Due regole decise da chi usa il registro**, ADR-30: le ore annullate escono
dal monte ore previsto, e `confermata` misura la copertura degli appelli. Più
ADR-31: la rigenerazione dei PDF sta in `chiama()`, e l'agenda, l'assistente e
il condotto non lasciano più i verbali indietro.

**Fra i medi, quel che si vede:** Ctrl+S che salvava senza il campo in cui si
stava scrivendo; i moduli che al Salva rimandavano la fotografia dell'apertura
e riportavano indietro gli altri allievi della classe; Esc che buttava dieci
minuti di scaletta senza chiedere; lo storico del documento che teneva dieci
minuti di copie mentre l'aiuto prometteva «com'era ieri» (adesso a gradini:
ultime dieci, una al giorno per trenta giorni, una a settimana); i permessi del
condotto che si riaccendevano da soli con `programma.salva`; il nome della pipe
indovinabile da un altro utente della macchina; l'arresto di Windows che non
chiamava `spegni()`; un tetto di venti secondi allo spegnimento; il widget
fuori schermo staccando il monitor; lo schermo intero che poteva finire sul
registro invece che sulla proiezione, davanti alla classe; due scansioni nello
stesso secondo che si coprivano in quarantena; Exchange oltre i trenta messaggi
al minuto; il menu nativo senza «Modifica» e «Visualizza» — su macOS niente
copia e incolla.

**Le ipotesi cadute.** Il markup dai dati: l'unico `innerHTML` della pagina
disegna icone costanti, il markdown del modello passa da un parser senza HTML,
e la CSP non ha `unsafe-inline`. Lo zip: CRC sempre verificato, nomi ripuliti
da `..`, offset controllati. Le date: l'aritmetica è tutta in UTC coerente,
l'ora legale non la tocca. Le medie: `null` senza voti, pesi zero e assenti
fuori, schermo e PDF dalla stessa funzione. Una rinuncia dopo trenta secondi
non esegue mai niente dopo. Le scritture dell'assistente passano sempre da
`offribile()`. L'iniezione nelle intestazioni dei destinatari, il
dot-stuffing SMTP, STARTTLS, PKCE: reggono. Nessun `setTimeout` oltre i 24
giorni. Il mittente di ogni `ipcMain.on` è filtrato per finestra. Il 29
febbraio in `anniCompiuti` è voluto e provato. `archiviaCopia` prende il
deposito dopo un solo microtask, e scrive in quello catturato.

---

## 4. Che cosa resta, dal giro 3

### C13 — La grammatica visiva

> Il sistema di colore era già buono. Mancava il resto, e stava scritto a mano.

Chiuso quasi per intero nel giro 3: i cinque token fantasma, il fuoco che non si
staccava dall'accento, il `:focus-visible` che nel pannello non esisteva, le
pastiglie sotto contrasto, i bersagli sotto i 24 pixel, i due `z-index` pari, la
copia degli spazi fra guscio e pannello. `stili/misure.css` è nato per tenere
insieme le due sponde, e porta la scala del testo, la densità dei comandi, i
raggi, le durate e i piani. Resta il lavoro lungo, che non è un difetto:

- [ ] **Adottare i token nelle pagine.** I fogli fondamentali li usano; le
      pagine no, e hanno valori unici — 0,94em, 0,66em, 1,18em — che *non
      coincidono* con nessun gradino della scala. Un token che dice 0,92em al
      posto di 0,94em non è un miglioramento, è una bugia: vanno guardati uno per
      uno e decisi, non sostituiti a macchina. Stessa cosa per le densità fuori
      dai comandi di base e per i sette punti di rottura scritti in `px`, che non
      scalano con «Dimensione testo» mentre gli altri trentuno sì

### C16 — Lo scorrimento, quel che il giro 4 non ha chiuso

> Tre cose, e nessuna è un difetto: sono scelte che vogliono una decisione.

- [ ] **Il doppio scorrimento nelle pagine a due colonne.** Classi, Persone,
      Piani, Registri, Documenti e Modelli hanno una barra propria
      (`.elenco-laterale`, `.documenti__barra`, `.modelli__barra`: `sticky` più
      `overflow-y`) **dentro** un `.contenuto` che scorre a sua volta: due barre
      verticali nella stessa schermata. Il progetto la tecnica l'ha già scartata
      per iscritto altrove — `styles/map.css` e `styles/class-teacher.css:790`
      dicono che «una colonna che scorre dentro una colonna che scorre è il modo
      più rapido di far perdere il segno» — e la sostituisce con
      `.contenuto:has(…) { overflow: hidden }` più `flex: 1; min-height: 0` sui
      figli. Portarla anche qui vuol dire cambiare l'impaginazione di sei pagine,
      dando alla colonna di destra uno scorrimento suo: è una scelta di forma,
      non una correzione, e va decisa guardandola. Nel giro 4 le due barre sono
      state rese *coerenti* — si fermano in fondo invece di sfondare, e ricordano
      dove stavano — ma restano due
- [ ] **Gli elenchi delle schede Documenti** (`ui/views/documents/cards.ts`,
      `.documenti__elenco`) non hanno una chiave di scorrimento: sono cinque
      contenitori con la stessa classe nella stessa pagina, e darne una a
      ciascuno vuol dire inventare un nome per ognuno. Poco grave — sono
      collegamenti che di solito portano via dalla pagina
- [ ] **La proiezione su schermo corto.** Con «Misure strette» spenta a mano, una
      scaletta di sei tappe supera l'altezza del blocco su un proiettore 1280×720,
      e l'unico scorrimento è dentro un riquadro che durante la lezione nessuno
      tocca: davanti alla classe non c'è né mouse né tastiera. Il codice lo sa
      già — il commento in `styles/projection.css:44` lo dice — e la cura è
      applicare la compattezza anche quando il contenuto misurato eccede, non
      solo quando lo si chiede. Vuole una misura a runtime, quindi è lavoro vero

### C17 — La prova dell'interfaccia che cade di notte

- [x] `tests/ui/navigation.py:127` confrontava la data dell'applicazione, che è
      **locale**, con `new Date().toISOString().slice(0,10)`, che è **UTC**. Fra
      la mezzanotte locale e le 02:00 le due non coincidono, e la prova cadeva da
      sola: in CI non si vedeva perché la macchina gira a UTC. Adesso la riga
      ricompone la data locale come fa `oggi()` in `dominio/date.ts` —
      `getFullYear/getMonth/getDate` — e la prova passa anche all'una di notte,
      che è quando è stata vista cadere

### C18 — La barra del titolo

> La cornice della finestra la disegna il registro: una striscia in meno su
> Windows, il documento aperto al centro, la stessa forma su tutti e tre i
> sistemi.

- [x] `titleBarStyle: 'hidden'` sulla sola finestra del registro
      (`ambiente/finestre.ts`, `cornice()`): fascia di sistema per i tre
      pulsanti su Windows e Linux, semafori in posizione su macOS, e
      `autoHideMenuBar` perché la barra dei menu non ricompaia dentro la pagina
- [x] I colori della fascia seguono il tema (`ambiente/tema.ts`,
      `fasciaDelTema()` + `ricordaFascia()`): girando da chiaro a scuro i tre
      pulsanti cambiano con il resto, e `setTitleBarOverlay` si chiama solo
      sulle finestre che la fascia ce l'hanno davvero
- [x] `interfaccia/barraTitolo.ts` + `stili/barra-titolo.css`: a sinistra
      navigazione e «File», al centro il documento aperto e la pagina, a destra
      la ricerca. Le quattro cose venivano dalla riga sotto, che adesso porta
      solo il contesto
- [x] Il titolo della finestra dice il documento: `2026-2027 — Registro
      docenti` invece di «Registro», che era uguale per ogni anno aperto
- [x] Le tre voci che vivevano solo nella barra dei menu di sistema — zoom,
      schermo intero, esci — sono comandi del registro: cinque `ComandoUI`, tre
      azioni, tre procedure (`finestra.zoom`, `finestra.schermoIntero`,
      `programma.esci`)
- [ ] Le finestre figlie — impostazioni, benvenuto, lettore, assistente
      staccato — tengono la cornice di sistema. Per i dialoghi è giusto; per
      l'assistente staccato è da guardare
- [ ] Su Linux la fascia dei pulsanti dipende dalla scrivania: va provata su
      GNOME e su KDE prima di dirla fatta

### C19 — L'icona, quel che il giro 5 non ha chiuso

- [ ] Le misure 16, 20 e 24 escono impastate: `tools/icons.cjs` scala il
      tratto del `.svg` (1.8 su `viewBox` 32, righe a y 10.5 e 14) e le righe
      del libro cadono su mezzi pixel. Serve un disegno piccolo allineato alla
      griglia, che è in contrasto con «il tratto si legge dal `.svg` e non si
      ridisegna»: decisione da prendere prima del codice
- [ ] Le tre modalità provate su una macchina vera, una per volta: per tutti
      gli utenti, per un utente, portabile. Per ognuna: barra, pin chiuso e
      riaperto, notifica, icona dei `.registro` in Esplora risorse, e di nuovo
      dopo la disinstallazione (niente icone bianche). Le prove automatiche
      non arrivano al registro di sistema
- [ ] Da per tutti a per utente l'installer non toglie la copia per tutti:
      restano due collegamenti con la stessa identità. È di electron-builder
      (`installSection.nsh:52-58`), non nostro
- [ ] Il PNG a 1024 per l'`.icns` di macOS alle misure Retina grandi — quando
      il mac si costruirà davvero
- [ ] Linux su Wayland: senza `desktopName` l'`app_id` può non coincidere con
      il `.desktop`, e il dock di GNOME mostra un'icona generica. Da provare
      con un `.deb` installato

### C15 — L'interfaccia

> Chiuso nel giro 3 quel che si poteva chiudere. Resta uno.

- [ ] Il calendario in modalità Settimana non riporta la data dentro l'anno
      appena aperto: griglia vuota e nessuna settimana accesa, e niente che lo
      dica. In modalità Mese il riporto c'è, con il commento che nomina proprio
      «un anno cambiato sotto» — quindi è un caso già capito, e coperto da una
      parte sola

### C20 — Quel che il giro 7 lascia aperto

> Scritto qui perché un reperto che resta in una conversazione è un reperto perso.

**Da decidere prima del codice:**

- [ ] **L'arresto di Windows con il solo vassoio.** `query-session-end` arriva
      alle finestre; con il registro ridotto nel vassoio e il widget spento non
      ce n'è nessuna, e `spegni()` non gira: la serratura resta accanto al
      `.registro`. La cura è una finestra sentinella nascosta, ma cambia
      `window-all-closed` e il `getAllWindows()[0]` di `second-instance`
- [ ] **Un allievo arrivato a metà anno riapre le prove passate**
      (`domain/returns.ts`): non ha righe di voto, e ogni prova già riconsegnata
      torna «da correggere» e in ritardo. Contare solo chi ha una voce, o un
      gesto «non riguarda»
- [ ] **Voto e assenza insieme** (`valutazioni.voto.imposta`): il dominio accetta
      apposta la coppia — il numero resta, il conto lo salta (prova in
      `tests/api/missingGrades.test.mjs`) — ma il PDF stampa il voto. O la
      procedura rifiuta la coppia, o il PDF scrive «ass.»
- [ ] **Medie di prove con scale diverse** (`mediaAllievo`): ogni prova fissa la
      sua scala; se il documento passa da 1–6 a 1–10 a metà anno, la media
      mescola i due. Almeno un avviso
- [ ] Un'ora annullata **e recuperata** fuori orario (ADR-30): oggi il recupero
      conta come ora in più, senza legame con quella che sostituisce

**Lavoro noto, non ancora fatto:**

- [ ] `Pacchetto.chiLoTiene` ignora sempre la serratura della stessa macchina e
      dello stesso utente: installato più portabile non si avvisano. Serve un
      controllo del processo (`pid` vivo e avviato dopo l'accensione)
- [ ] L'eco delle proprie scritture nell'osservatore si riconosce per tempo
      (2,5 s): un cambiamento vero in quella finestra si perde. Per `stat` non è
      sicuro — OneDrive tocca l'`mtime` da sé
- [ ] Ctrl+O e gli altri acceleratori del menu nativo non «consegnano» il campo
      in cui si sta scrivendo: la pagina non li vede. Il guscio dovrebbe chiedere
      alla pagina un `blur()` prima di eseguire
- [ ] I moduli che rimandano ancora la fotografia dell'apertura: `ui/forms/year.ts`
      (una variabile locale `stato` ombreggia quella della pagina), recapito,
      comunicazione e blocco assenze (si salvano come voce del fascicolo)
- [ ] Le chiavi che il condotto lascia cambiare: `modelli.cartella`,
      `dettatura.modello`, `ocr.modello`, `ocr.proiettore` — file di dati, non
      eseguibili; da decidere se proteggerle come gli eseguibili
- [ ] Senza prova: il timer d'inattività del condotto sospeso durante una
      chiamata lenta, il tetto di 16 MiB per presa, `EACCES` sulla pipe, il giro
      Exchange vero con `dopoOgni`, l'accesso OAuth che dimentica un account
      sbagliato
- [ ] `tests/ui/staleEdits.py` (editor del piano, Ctrl+S) è scritta e registrata
      in `npm run ui-tests`, ma non è mai girata: su questa macchina manca
      playwright
- [ ] Quando una scrittura viene rifiutata dopo `archiviaCopia`, la copia appena
      fatta resta orfana nell'archivio
- [ ] `Smistatore.smista` ha due attese prima di `posaInQuarantena` senza
      guardare il documento; `aggiornaComposizioni` in `rapporto.completo` gira
      dopo il giro, idem
- [ ] `data/filing.ts` `archiviaCopia` rifiuta con il messaggio grezzo
      dell'errore, che nomina il percorso: la pulizia di `motivoSicuro` sta in
      `actions/` e lo strato dei dati non la vede
- [ ] `votiDellaScala` con minimo 1 e passo 0,3 propone 6,1, fuori scala
      (`arrotondaVoto` poi lo riporta a 6)
- [ ] `tests/environment/systemText.test.mjs` chiama anch'essa `reg` per nome
- [ ] `docs/ARCHITETTURA.md` dice che non esiste una CI: `.github/workflows/`
      c'è

**Da provare a mano** (il processo principale non lo avvia nessuna prova):
arresto di Windows con una modifica fresca e con il solo vassoio; widget libero
sul monitor esterno, poi staccare il cavo; proiezione a schermo intero aperta
cliccando subito nel registro; `Registro.exe ..\Y\2026-2027.registro` da un
terminale con il registro già aperto; doppio clic su un `.registro` mentre
l'applicazione sta uscendo.
