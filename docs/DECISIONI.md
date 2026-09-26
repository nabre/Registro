# Decisioni architetturali — Regiclass

Le scelte strutturali e i vincoli che una rifattorizzazione non può rompere
senza saperlo. Per ogni ADR: la decisione, i vincoli, dove vive.

Regole: numerazione progressiva, mai riusata. Un ADR superato non si cancella:
si segna «modificata da ADR-NN» nel titolo. Il lavoro aperto sta in
[CANTIERE.md](CANTIERE.md).

## Gli ADR

### ADR-01 — Lessico centralizzato in un solo file

**Decisione.** I termini di dominio (singolare, plurale, genere, forma breve)
stanno in `src/domain/lexicon.ts` (`Termine`), con un motore di regole italiane
(articoli, preposizioni articolate, accordi) che compone le frasi. Le altre
lingue: ADR-38.

**Vincoli.** Un termine ricorrente si aggiunge qui, non si scrive a mano. Il
plurale è scritto, mai calcolato. Fuori dal lessico: identificatori,
segnaposto dei modelli, nomi di cartelle. `lexicon.ts` è l'unico modulo
riesportato come namespace (`export * as lessico`) da `src/domain/index.ts`:
le sue funzioni (`il`, `del`, `con`…) collidono nel barrel.

### ADR-02 — Un modulo `apparato` isola l'host

**Decisione.** Dominio, dati, azioni e interfaccia non nominano Electron:
passano da `src/environment/platform.ts` (il modulo `apparato`), risolto per
alias da esbuild e `paths` di TypeScript. I nomi seguono il ruolo, non il
prodotto (`apparato.file`, `apparato.dialoghi`, `apparato.finestre`…): si
traduce quel che nomina un'idea dell'editor, resta quel che nomina
un'operazione universale (`Uri`, `readFile`, `EventEmitter`, `Webview`).

**Vincoli.** Electron si nomina solo in `src/environment/` e `shell/`
(ESLint `no-restricted-imports`). Toglierlo vorrebbe dire perdere le prove del
dominio con `node --test`.

### ADR-03 — Coordinate indicizzate per indirizzo, non per persona

**Decisione.** Collezione `Registro.coordinate` (`coordinate.json`), chiave
`chiaveIndirizzo(indirizzo)`: una geocodifica per indirizzo, condivisa da chi
ci abita.

**Vincoli.** Regge sul round-trip `scriviIndirizzo(leggiIndirizzo(riga)) ===
riga` (`src/domain/addresses.ts`). Si riscrive solo su «Trova gli indirizzi».

**Dove.** `src/domain/map.ts`, `src/domain/addresses.ts`, `src/data/geocoding.ts`.

### ADR-04 — La mappa esce dalla macchina solo su un gesto

**Decisione.** Geocodifica solo su «Trova gli indirizzi», verso Nominatim, una
richiesta al secondo, User-Agent dichiarato. Il pannello ha CSP
`default-src 'none'`; le tessere arrivano dall'host con
`registro://mappa/<z>/<x>/<y>.png` (`shell/protocol/tiles.ts`), in cache in
`userData`, mai nella cartella del docente.

**Vincoli.** La CSP non si allenta: ogni sorgente nuova passa dall'host. Tutte
le uscite di rete: ARCHITETTURA § 8.

### ADR-05 — Guida in-app come dati strutturati

**Decisione.** La guida d'uso è una struttura tipizzata, una sezione per
pagina (`src/ui/views/help.ts`, `src/ui/views/help/`). È l'unico posto del
«come si usa»: `docs/` non lo ripete.

**Vincoli.** Una pagina con comandi propri aggiunge la sua voce. Nessuna prova
lo controlla.

### ADR-06 — UI senza framework

**Decisione.** DOM vero con `h()` (`src/ui/dom.ts`); ridisegno completo a ogni
cambio di stato; le modali stanno fuori dal ciclo di ridisegno.

**Vincoli.** Lo stato applicativo è l'unica fonte di verità: il DOM non tiene
stato che lo stato non conosca, o il ridisegno lo azzera.

**Dove.** `src/ui/dom.ts`, `src/ui/forms.ts`, `src/ui/components/`.

### ADR-07 — Un comando, una superficie

**Decisione.** Comandi divisi per spazio (barra del titolo, barra laterale,
contesto, barra dei comandi, corpo della pagina); un comando non compare dove
la pagina disegna già il suo pulsante.

**Vincoli.** Disciplina di revisione, nessuna prova.

**Dove.** `src/ui/commands.ts`, `src/ui/commandBar.ts`, `src/ui/sidebar.ts`.

### ADR-08 — Il piano lezione appartiene al corso

**Decisione.** `PianoLezione.corsoId`; il riuso fra corsi è un «duplica»
esplicito. `corsoId: null` = bozza senza casa. `pianiDelCorso`
(`src/domain/courses.ts`) non filtra per anno.

**Vincoli.** Nessun piano condiviso *live* fra corsi.

### ADR-09 — L'UD è l'unità canonica (modificata da ADR-36)

**Decisione.** Capienza dell'ora, appello e conteggi sono in UD. Le tappe del
piano hanno `Attivita.durataUd`; `scalettaSulleUd`
(`src/domain/calculations.ts`) le posa sui minuti reali.

**Vincoli.** Ogni durata nuova a livello di corso, lezione o conteggio è in UD.
La durata dell'UD non è per corso (ADR-36).

**Dove.** `src/domain/calculations.ts`, `src/domain/dates.ts`, `src/domain/activities.ts`.

### ADR-10 — Il momento di valutazione nasce dalla tappa del piano

**Decisione.** Una tappa si marca «È una valutazione»
(`Attivita.valutazione`); il `MomentoValutazione` nasce nella lezione che la
svolge, con `attivitaId`.

**Vincoli.** La coerenza `MomentoValutazione.pianoId` / `Lezione.pianoId` la
controlla `riferimentiRotti`, non bloccante. `src/domain/orphans.ts` diagnostica,
non corregge.

### ADR-11 — «Conta come assenza» in un posto solo

**Decisione.** `contaComeAssenza(stato)` (= `stato === 'assente'`) in
`src/domain/calculations.ts`, usata da quadro della persona, riepilogo
dell'ora, matrice del corso, rapporti e soglia delle segnalazioni.

**Vincoli.** Mai riscritta a mano. `tests/domain/lateness.test.mjs` prova i
cinque consumatori insieme. Anche la soglia sta in un posto solo
(`src/domain/alerts.ts`).

### ADR-12 — Appello per UD, «non-impostato» mai contato

**Decisione.** `Presenza.stati`, uno per UD. `'non-impostato'` non è né
presenza né assenza. Due percentuali mai fuse: assenza sulle UD previste
dall'orario, presenza sulle UD con appello (`src/domain/courseMatrix.ts`).

**Vincoli.** Ogni vista con una percentuale dichiara il denominatore. Uno stato
illeggibile degrada a `'non-impostato'`, mai a `'presente'`.

### ADR-13 — Modelli di stampa a quattro strati, fuori dal codice (modificata da ADR-34)

**Decisione.** L'impaginazione dei PDF sta in `templates/` come testo con
direttive: `_base.tpl` (contenuto), `_stile.tpl` (misure), `_testi.tpl` e
`_testi-<lingua>.tpl` (parole, ADR-38), `_blocchi.tpl` (pezzi ripetuti),
interpretata a runtime. `npm run templates` ne genera
`src/data/defaultTemplates.ts`.

**Vincoli.** `npm test` controlla che la copia generata e `templates/` coincidano,
e che il catalogo dei modelli abbia gli stessi nomi della cartella. Nessuna
risalita `..` in un'`immagine:`.

**Dove.** `src/data/templates.ts`, `src/data/reportsPdf.ts`,
`src/domain/templateCatalog.ts`, `src/domain/templateCheck.ts`.

### ADR-14 — Un rapporto rifatto sovrascrive

**Decisione.** Rigenerare sostituisce il file; nessuna numerazione progressiva.

**Vincoli.** `(2)` solo per distinguere file davvero diversi con lo stesso nome
(ADR-15).

**Dove.** `src/data/exports.ts` (`scriviGenerato`), `src/domain/locations.ts`.

### ADR-15 — Nomi di file leggibili, niente id

**Decisione.** Anno, classe+materia, tipo, elemento distintivo reale (ora,
periodo, data, titolo). Collisioni: `distinzione()`.

**Vincoli.** Un `GenereRapporto` nuovo ha la sua regola di nome con gli stessi
quattro elementi.

### ADR-16 — Cartelle su disco: materia prima di classe

**Decisione.** `<materia|docente-di-classe>/<classe>/<classe|allievi/<Cognome Nome>>/<file>`,
sotto due radici: `archivio/` (caricato, unica copia) ed `esportazioni/`
(generato, rifacibile). `quarantena/` è la sala d'attesa dei PDF da dividere.
`documentazione/` è il nome vecchio unico: `src/data/filing.ts` lo ridivide.

**Vincoli.** I nomi delle cartelle non si rinominano a cuor leggero: spostano
file sincronizzati su OneDrive.

**Dove.** `src/domain/locations.ts`, `src/data/filing.ts`.

### ADR-17 — Il documento è uno ZIP con JSON dentro (modificata da ADR-40)

**Decisione.** Il documento `.regi` è uno ZIP vero, apribile con `unzip`.
ZIP scritto in casa su `node:zlib`.

**Vincoli.** Mai un formato binario chiuso. I campioni
`tests/samples/formato/` si fissano solo quando il formato cambia apposta
(ADR-37).

**Dove.** `src/data/package.ts`, `src/data/zip.ts`.

### ADR-18 — Persistenza incrementale con storico integrato

**Decisione.** `accoda()` scrive in coda solo le collezioni cambiate, poi
riscrive indice e coda ZIP: finché la coda nuova non è intera, il file resta
leggibile con quella vecchia. `rifai()` (temporaneo + rinomina) quando il file
non c'è, o lo spazio morto supera 256 KB e un terzo del file, o accodare costa
più di metà documento. Storico per collezione in `.storico/` dentro il
pacchetto, potatura a gradini (`conserva`).

**Vincoli.** L'ordine «coda nuova, poi indice» non si inverte. Lo storico viaggia
con il file.

**Dove.** `src/data/package.ts`, `src/data/zip.ts`. Dettagli: ARCHITETTURA § 7.

### ADR-19 — Serratura informativa, non bloccante

**Decisione.** Un file accanto al documento dice chi lo tiene aperto; serve a
chiedere «vuoi aprirlo lo stesso?», non impedisce niente.

**Vincoli.** Mai promossa a lock vero (su OneDrive non esiste).
`Pacchetto.chiLoTiene()` ignora la serratura della stessa macchina e utente.

**Dove.** `src/data/package.ts`, `src/data/archive.ts`.

### ADR-20 — Percorsi salvati relativi alla cartella dell'anno

**Decisione.** Ogni percorso nei JSON è relativo alla cartella dell'anno.

**Vincoli.** Mai assoluti; i cambi di layout passano da `riscriviPercorsi()`
(`src/data/filing.ts`). Il nome della cartella dell'anno resta quello di quando
è nata.

**Dove.** `src/data/paths.ts`, `src/data/filing.ts`.

### ADR-21 — Impostazioni del programma e del documento

**Decisione.** Programma: `impostazioni.json` in `userData`, per macchina.
Documento: `Registro.impostazioni` dentro il `.regi`. `src/manifest.ts` è la
fonte unica di chiavi, predefiniti e interfaccia.

**Vincoli.** Una chiave nuova si dichiara nel manifesto; ogni chiave arriva a
tutte e due le superfici (`tests/ui/settingsSections.test.mjs`). Uno stato che
il programma scrive da sé non è un'impostazione: va in `userData/interfaccia/`.
Il come: skill `impostazione`.

**Dove.** `src/manifest.ts`, `src/environment/settings.ts`.

### ADR-22 — I file si aprono per percorso, non per URL

**Decisione.** `execFile` con il percorso come argomento
(`src/data/opening.ts`, `apriConIlSistema`), mai `openExternal` su un
`file://` (codifica non-ASCII rotta, injection con `&`).

**Vincoli.** `openExternal` solo per `http`, `https`, `mailto`, `tel`
(`src/environment/commands.ts`).

### ADR-23 — Funzioni di sistema in tre file che non si conoscono

**Decisione.** Dominio puro, orchestrazione, ambiente. Oggi: il vassoio.

**Vincoli.** Una funzione di sistema nuova segue lo stesso schema.

**Dove.** `src/domain/tray.ts`, `src/tray.ts`, `src/environment/tray.ts`.

### ADR-24 — Eliminare è sempre permesso

**Decisione.** Ogni entità si elimina. `eliminazione(registro, bersaglio)` è
pura e descrive prima tutto quel che sparisce; `applica(registro)` esegue dopo
la conferma: il messaggio e l'effetto sono lo stesso calcolo. Quel che sa
vivere staccato resta (piani di un corso eliminato → `corsoId = null`). Dove
c'è un'alternativa non distruttiva (archiviare, unire) si offre accanto. I
file vanno nel cestino di sistema.

**Vincoli.** Ogni tipo eliminabile ha la sua voce di cascata in
`src/domain/deletions.ts`; `src/domain/repairs.ts` ripara a posteriori, mai in
silenzio. Cascate: MODELLO-DATI § 7.

### ADR-25 — Modelli locali in file `.gguf`, mai cloud

**Decisione.** Un modello è un `.gguf` nella cartella dei modelli.
`src/data/llamaCpp.ts` lo carica nel main process per l'assistente;
`src/data/mtmd.ts` usa `llama-mtmd-cli` per le scansioni. Si scaricano dalla
pagina «Modelli linguistici», si trascinano o si scelgono. Senza modello:
scansioni in quarantena, assistente spento.

**Vincoli.** Nessuna dipendenza cloud, nemmeno opzionale. L'unica rete è lo
scarico dei pesi da Hugging Face. Il nome nelle impostazioni passa da
`modelloNellaCartella()`: un percorso scritto a mano non diventa un file
aperto. `node-llama-cpp` e i binari restano fuori dall'`asar`.

**Dove.** `src/data/llm.ts`, `src/data/gguf.ts`, `src/data/huggingFace.ts`.

### ADR-26 — Smistamento dei PDF: niente archivio senza conferma

**Decisione.** Il riconoscimento del nome produce una bozza; niente si archivia
da solo.

**Vincoli.** `FIDUCIA_SUFFICIENTE` (0,7) e lo stacco minimo fra i primi due
candidati (0,2) decidono se *proporre*, mai se eseguire. Un allievo riceve al
massimo un blocco per passata.

**Dove.** `src/domain/sorting.ts`, `src/data/sorter.ts`, `src/ui/views/sorting.ts`.

### ADR-27 — Un contratto davanti al centralino

**Decisione.** Ogni azione ha una `Procedura` (`src/api/contract.ts`) che
dichiara `azione`; `gestoriDelleProcedure()` (`src/api/bridge.ts`) la spande
sopra `GESTORI` in `src/actions.ts`. Il lavoro resta nel gestore. `chiama()`
(`src/api/core.ts`) è l'unico punto che convalida, esegue, cronometra e scrive
nel giornale, per tutti i trasporti. Doppia nomenclatura: azione
(`presenze.riga`) e procedura (`ore.appello.riga`), accostate in CATALOGO § 6.

**Vincoli.**
- Il lavoro non si sposta nella procedura.
- Una procedura, un'azione; nessuna azione sconosciuta
  (`tests/api/coverage.test.mjs`).
- Lo schema dichiara **tutti** i campi dell'azione, verificato campo per campo:
  `oggetto()` scarta le chiavi non dichiarate, e un campo mancante sparirebbe
  in silenzio.
- `VERSIONE_API` sale quando cambia la busta, non quando si aggiunge una
  procedura.
- Il nucleo non spinge lo stato al pannello.

### ADR-28 — Schemi fatti in casa, contratto Standard Schema

**Decisione.** `src/api/schemas.ts` espone `~standard`, come zod/valibot; il
nucleo conosce solo quell'interfaccia. Una dichiarazione dà convalida, tipo
inferito e JSON Schema. Le entità intere passano da `entita()`, che controlla
la forma minima e cede al validatore del dominio.

**Vincoli.**
- Un'entità non si riscrive come forma: se c'è una `valida*`, `entita()` la usa;
  i controlli che vogliono il registro restano nel gestore.
- Il nucleo non importa `schemas.ts` oltre `~standard`: sostituire la libreria
  deve costare una riga.
- `nullo` è un attributo della forma, non un genere (JSON Schema
  `type: ["number", "null"]`).
- Uno schema d'oggetto scarta le chiavi non dichiarate (tolleranza verso un
  pannello più nuovo).

**Dove.** `src/api/schemas.ts`, `src/domain/validation.ts`, `tests/api/schemas.test.mjs`.

### ADR-29 — Un canale per le domande, separato dalle azioni

**Decisione.** `Domanda` / `Riscontro` sullo stesso canale IPC: `chiedi()` in
`src/ui/bridge.ts`, `rispondiDomanda()` in `src/panels/panel.ts`. Le domande
non entrano nella coda delle scritture. `Riscontro` porta il `codice` dell'API.

**Vincoli.**
- `rispondiDomanda` rifiuta tutto ciò che non è `genere: 'lettura'`
  (`tests/api/writes.test.mjs` lo legge dal sorgente).
- Una lettura è innocua davvero: niente scrittura, file aperti, finestre,
  rete. Se serve una di queste, è una scrittura.
- Una lettura non dichiara `collezioni` né un'azione
  (`tests/api/coverage.test.mjs`).
- Una lettura torna il conto fatto dal dominio, in forma piatta dichiarata.
- Niente campi di ritorno nella `Risposta` per servire una chiamata sola.

Dettagli: API § 6.

### ADR-30 — La quota d'assenza conta le ore che si potevano seguire

**Decisione.** Le UD previste non contano le occorrenze d'orario occupate da
un'ora annullata (stesso giorno, stessa ora d'inizio). `confermata` = appello
su tutte le UD delle ore svolte nel periodo (vero se non ce n'è nessuna).

**Dove.** `udPrevisteDaOrario` in `src/domain/timetable.ts`,
`segnalazioniDelCorso` in `src/domain/alerts.ts`.

### ADR-31 — I documenti seguono i dati dentro `chiama()`

**Decisione.** Dopo una scrittura riuscita che cambia la revisione, `chiama()`
lancia `rigeneraDopoScrittura` (`pdfAutomatici: 'sempre'`): vale per pannello,
condotto e assistente. `esegui()` la tiene solo per le azioni senza procedura.

**Dove.** `src/api/core.ts`, `src/actions.ts`, `src/actions/reports.ts`,
`tests/api/regeneration.test.mjs`.

### ADR-32 — Il contesto del modello resta caldo

**Decisione.**
1. Prompt (`componiBattute` in `src/api/transports/assistant.ts`): una battuta
   di sistema, `istruzioni()`, poi il catalogo; veduta della pagina e id visti
   vanno in una nota davanti all'ultima domanda, mai salvata. Il prefisso
   [istruzioni + catalogo] resta identico byte per byte.
2. Contesto caldo (`Caldo` in `src/data/llamaCpp.ts`): legato ai pesi; se ne va
   con loro, dopo `RIPOSO_MS` (5 min) o se la domanda si rompe.

Una domanda alla volta (`inFila`); le istruzioni entrano sempre come storia
(modelli senza battuta di sistema).

**Vincoli.** Niente in `istruzioni()` o nel catalogo dipende da data, pagina o
impostazioni (`tests/api/tools.test.mjs` confronta il catalogo byte per byte).
Un sottoinsieme di attrezzi per domanda romperebbe il prefisso.

**Dove.** `tests/data/llamaCpp.test.mjs`, `tests/helpers/fake-node-llama.mjs`.

### ADR-33 — Il check in una collezione a sé

**Decisione.** Collezione `check` (`check.json`): un `Check` per corso, le sue
`ColonnaCheck`, le sole caselle spuntate (`SpuntaCheck`). Una spunta data
nell'ora tiene `lezioneId` e segue la lezione; con un giorno scelto a mano
`lezioneId = null` e vale `data`. Due liste dello stesso corso si fondono in
lettura (`fondiCheck`). `classe.duplica` copia le colonne, non le spunte.

**Vincoli.** Chi scrive spunte dichiara `'check'`, non `'corsi'`; chi elimina
corsi, classi, materie, persone o ore dichiara anche `'check'`.

**Dove.** `src/domain/check.ts`, `tests/domain/check.test.mjs`.

### ADR-34 — I modelli sono del programma, la carta intestata del documento

**Decisione.** I modelli stanno solo nel programma e non si modificano
dall'applicazione. `Impostazioni.intestazione` porta: `carte` (almeno una;
sede, logo in `intestazione/<carta>.png` dentro il pacchetto, altezza, corsi
che la usano — ogni corso su una carta sola), `docente`, `firma` delle e-mail.
Si regola in Impostazioni › Documenti e stampa › Intestazione. Letture
`modelli.leggi` e `modelli.prova`; logo con `intestazione.logo` /
`intestazione.togliLogo`.

**Vincoli.** Nessun dato personale nei modelli di serie. `logo.png` è un nome
riservato (`NOME_LOGO`). Il logo passa da `logoAmmesso` (solo in
`intestazione/`, PNG o JPEG).

**Dove.** `src/domain/letterhead.ts`, `src/ui/views/settings/letterhead.ts`,
`src/actions/templates.ts`, `tests/domain/letterhead.test.mjs`.

### ADR-35 — La dettatura passa da voicebox, solo in locale

**Decisione.** Il riconoscimento della voce lo fa
[voicebox](https://github.com/jamiepine/voicebox) (MIT), installato a parte:
`GET /health`, poi `POST /transcribe` con un WAV costruito in memoria, la
lingua del registro e `dettatura.taglia`, all'indirizzo `dettatura.indirizzo`
(di serie `http://127.0.0.1:17493`). Il registro non installa, avvia né
scarica niente per la voce.

**Vincoli.** voicebox non ha autenticazione, quindi:
- l'indirizzo è solo di questo computer (`http`, `127.0.0.1`/`localhost`/`[::1]`,
  niente credenziali né percorso; `src/domain/loopback.ts`), ricontrollato a
  ogni lettura;
- niente rinvii (`redirect: 'manual'`);
- il condotto non cambia `dettatura.indirizzo` (`chiaveIntoccabile` in
  `src/api/transports/conduit.ts`).

**Dove.** `src/data/dictation.ts`, `src/data/voicebox.ts`, `src/ui/assistant/voice.ts`.

### ADR-36 — La durata dell'UD sta nel documento, e l'appello la fissa

**Decisione.** `Impostazioni.minutiUd`, intero in `LIMITI_UD` (20–120, di serie
45). Ogni conto in UD la vuole come argomento obbligatorio; le funzioni della
giornata prendono una `Giornata` (`{ minutiUd, pause }`). Cambiandola,
`impostazioni.salva` fa tenere a orario, lezione proposta e ore le loro UD
(`slotSuAltraUd`); un'ora che uscirebbe dal giorno resta com'era, detta. I
piani in minuti si rileggono a 45 (`UD_DEI_PIANI_IN_MINUTI`).

**Vincoli.** Non cambia quando un'ora ha l'appello (`oreConAppello`): le assenze
finirebbero sotto UD diverse. Importando impostazioni da un altro anno, con
appelli qui resta quella di qui.

**Dove.** `src/domain/dates.ts`, `src/domain/breaks.ts`, `src/actions/system.ts`,
`src/ui/views/settings/schoolDay.ts`.

### ADR-37 — I documenti vecchi si portano avanti per passi

**Decisione.** `PASSI_DEL_FORMATO` in `src/domain/upgrades.ts`, uno per
versione (`{ a, cambia, porta? }`). Aprendo un documento con `versione` più
bassa di `VERSIONE_DATI`: copia in `‹nome›/versioni-precedenti/`
(`copiaPrimaDelFormato`), passi sui dati grezzi (`aggiornaFormato`), riscrittura
intera, avviso con le frasi `cambia`. Senza copia non si riscrive niente. Un
documento più recente si rifiuta con una frase sola
(`fraseVersionePiuRecente`, riconosciuta da `versionePiuRecente`).

**Vincoli.** Ogni campo nuovo ha il suo passo, anche senza `porta`. Ogni
versione dalla 1 ha il suo campione in `tests/samples/formato/`, fissato da
`npm run sample` e mai riscritto. Il come: skill `formato`.

**Dove.** `src/data/archive.ts`, `tools/sample.mjs`.

### ADR-38 — Quattro lingue, i testi accanto al codice, l'italiano come forma

**Decisione.**
- Lingue `it` (fonte e ripiego), `de`, `fr`, `en` (`src/i18n/languages.ts`).
  `registroDocenti.aspetto.lingua`: `sistema` (prima lingua del sistema,
  altrimenti italiano) o una lingua.
- Una lingua per processo (`src/i18n/state.ts`): nel main la sceglie
  `src/environment/language.ts`; le pagine la ricevono dal preload e la
  adottano in `src/i18n/page.ts`, primo import. Al cambio: menu e icona si
  ridisegnano, le finestre si ricaricano.
- Cataloghi `<file>.testi.ts` accanto al codice, `catalogo(it, { de, fr, en })`;
  il compilatore impone le stesse chiavi (`Forma<T>`). Frasi con dati =
  funzioni. `lessico()` per lingua, `parole()` per le parole comuni
  (`src/domain/words.testi.ts`).
- Mai testi letti a livello di modulo fuori dalle pagine: `TestoPigro` /
  `detto()` o getter pigri.
- Non si traduce: identificatori, valori salvati, cartelle, marchio, sigle
  dell'appello, log, dati del docente, l'ordine dei nomi (`confrontaNomi`).
- La riga di comando ha un catalogo suo, nudo.

**Vincoli.** `npm run i18n` (`tools/i18n.mjs`) trova testi fuori catalogo,
grammatica italiana fuori posto e cataloghi letti a livello di modulo;
eccezione `// testo-fisso: <perché>`. `tests/i18n/catalogs.test.mjs` (forma,
vuoti, italiano rimasto), `tests/i18n/words.test.mjs` (copie di `parole()`,
omonimi da dichiarare). Il come: skill `testi`.

### ADR-39 — L'aspetto dei dashboard kit

**Decisione.**
- Superfici: `--sfondo-scheda`, `--ombra-scheda`, `--sfondo-rilievo` (in tutte e
  due le tavolozze), `--raggio-scheda`; raggi 12/8/6. Colori di base invariati
  (ricopiati in `src/environment/theme.ts` e nell'installatore). Carattere di
  sistema.
- Componenti: titolo di pagina (`testataVista`), tessere KPI, tabelle con
  intestazione tenue, avatar (`src/ui/components/avatar.ts`), stati vuoti,
  segmenti a pillola.
- Navigazione: **Dashboard** (vista `oggi`, solo collegamenti, ADR-07), barra
  laterale a pillola, ricerca in vista (Ctrl+K) con persone, corsi e classi,
  indietro/avanti (`src/ui/history.ts`), Ctrl+1…9.
- Nessuna dipendenza nuova; icone mancanti da Lucide (ISC) in `icons.ts`.

**Vincoli.** Un token nuovo va in tutte e due le tavolozze e, se lo usa la
miniatura del tema, nei blocchi `[data-tema-figura]`
(`tests/ui/themeFigure.test.mjs`).

### ADR-40 — Il nome: Regiclass

**Decisione.**
- Marchio **Regiclass**, non si traduce; nome npm `regiclass`, artefatti
  `regiclass-<versione>-installer.exe` / `-portabile.exe`.
- `appId` `ch.nabre.regiclass`; `nsis.guid` fisso al GUID ricavato dal vecchio
  `ch.edu.ti.cptt.registro-docenti`.
- Eseguibile `Regiclass.exe`: lo script d'aggiornamento installato
  (`os/windows/aggiornamento.ps1`) riconosce ancora il nome precedente e
  riapre quello nuovo nello stesso percorso.
- Cartella dei dati `%APPDATA%\Regiclass` (rinominata al primo avvio).
- Estensione `.regi`.
- Comando `regi`.
- Restano: formato `registro-docenti/anno`, protocollo `registro://`, chiavi
  `registroDocenti.*`, repository `nabre/Registro`.

**Vincoli.** `nsis.guid` non cambia mai. Il nome dell'eseguibile cambia insieme
in `.github/workflows/rilascio.yml` e in
`.signpath/artifact-configuration/eseguibile.xml`. Il nome del prodotto è lo
stesso negli eseguibili, in `.signpath/` e in `tools/peMetadata.ps1`, o
SignPath rifiuta la firma.

## Decisioni implicite

Scelte che il codice applica senza un ADR; il perché è ricostruito.

1. **Un aggregato unico, stato spinto intero.** `Archivio`
   (`src/data/archive.ts`) tiene il `Registro` in memoria e lo modifica in
   blocco; il pannello riceve lo stato intero e ridisegna (ADR-06). Un solo
   scrittore: più utenti vorrebbero ripensarlo da capo.
2. **Risposta prima del disco.** La scrittura è ritardata di 350 ms
   (`RITARDO_SALVATAGGIO_MS`), al massimo 2000 ms dalla prima modifica
   (`ATTESA_MASSIMA_MS`). Un crash in quella finestra perde al più due secondi.
3. **Due domande di validità diverse.** Lo schema dell'API dice se il
   *messaggio* ha la forma giusta (ADR-27/28); i normalizzatori e le `valida*`
   di `src/domain/validation.ts` dicono se la *cosa* sta in piedi, e fanno
   degradare un JSON vecchio o corretto a mano invece di rifiutarlo.
4. **Nessuna autorizzazione.** Un docente, una macchina alla volta (ADR-19):
   chi apre il file vede tutto.
5. **Errori: codice più frase.** Otto `Codice` in `src/api/contract.ts`
   (`ingresso-non-valido`, `non-trovato`, `rifiutato`, `conflitto`,
   `non-disponibile`, `procedura-sconosciuta`, `non-permesso`, `interno`) per
   chi deve reagire; frasi nei cataloghi (ADR-38) per chi legge. Uno nuovo si
   aggiunge quando qualcuno deve reagire diversamente. Il pannello riceve solo
   le frasi (`aEsitoAzione()`).
6. **Strati imposti da ESLint, non da pacchetti.** `no-restricted-imports` per
   cartella in `eslint.config.mjs`, più `npm run layers`. La CI
   (`.github/workflows/verifica.yml`) li fa girare a ogni push.

## Vincoli intoccabili

Quelli che non stanno già in un ADR, più i più gravi, in una riga:

| Vincolo | Perché |
| --- | --- |
| Segnaposto `{allievo}`, `{{allievo}}`, `tabella: allievi` | contratto con modelli ed e-mail degli utenti |
| Nomi delle colonne di serie nei `tabella:` dei modelli | i modelli le cercano per nome |
| `DOCUMENTO_SCHEDE_PRIMA` (`src/domain/lexicon.ts`) | riconosce le stampe vecchie delle schede personali |
| Nomi delle cartelle su disco | ADR-16: OneDrive |
| Un documento vecchio si riscrive solo dopo la copia | ADR-37 |
| `nsis.guid` fermo | ADR-40 |
| `minutiUd` fermo con l'appello | ADR-36 |
| CSP `default-src 'none'` del pannello | ADR-04 |
| `.regi` resta ZIP + JSON | ADR-17 |
| Percorsi relativi all'anno | ADR-20 |
| File locali per percorso, mai `openExternal` | ADR-22 |
| `contaComeAssenza` e la soglia in un posto solo | ADR-11 |
| Nessun dato personale nei modelli di serie | ADR-34 |
| `dettatura.indirizzo` locale e intoccabile dal condotto | ADR-35 |
| Dominio senza Electron né DOM | ADR-02 |
