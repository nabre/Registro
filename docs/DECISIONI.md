# Decisioni architetturali — Regiklass

Le scelte strutturali e i vincoli che una rifattorizzazione non può rompere
senza saperlo. Per ogni ADR: la decisione, i vincoli, dove vive.

Regole: numerazione progressiva, mai riusata. Un ADR superato non si cancella:
si segna «modificata da ADR-NN» nel titolo. Il lavoro aperto sta in
[CANTIERE.md](CANTIERE.md).

## Gli ADR

### ADR-01 — Lessico centralizzato in un solo file

**Decisione.** I termini di dominio (singolare, plurale, genere, forma breve)
stanno in `core/dominio/lexicon.ts` (`Termine`), con un motore di regole italiane
(articoli, preposizioni articolate, accordi) che compone le frasi. Le altre
lingue: ADR-38.

**Vincoli.** Un termine ricorrente si aggiunge qui, non si scrive a mano. Il
plurale è scritto, mai calcolato. Fuori dal lessico: identificatori,
segnaposto dei modelli, nomi di cartelle. `lexicon.ts` è l'unico modulo
riesportato come namespace (`export * as lessico`) da `core/dominio/index.ts`:
le sue funzioni (`il`, `del`, `con`…) collidono nel barrel.

### ADR-02 — Un modulo `apparato` isola l'host

**Decisione.** Dominio, dati, azioni e interfaccia non nominano Electron:
passano da `desktop/apparato/platform.ts` (il modulo `apparato`), risolto per
alias da esbuild e `paths` di TypeScript. I nomi seguono il ruolo, non il
prodotto (`apparato.file`, `apparato.dialoghi`, `apparato.finestre`…): si
traduce quel che nomina un'idea dell'editor, resta quel che nomina
un'operazione universale (`Uri`, `readFile`, `EventEmitter`, `Webview`).

**Vincoli.** Electron si nomina solo in `desktop/apparato/` e `desktop/shell/`
(ESLint `no-restricted-imports`). Toglierlo vorrebbe dire perdere le prove del
dominio con `node --test`.

### ADR-03 — Coordinate indicizzate per indirizzo, non per persona

**Decisione.** Collezione `Registro.coordinate` (`coordinate.json`), chiave
`chiaveIndirizzo(indirizzo)`: una geocodifica per indirizzo, condivisa da chi
ci abita.

**Vincoli.** Regge sul round-trip `scriviIndirizzo(leggiIndirizzo(riga)) ===
riga` (`core/dominio/addresses.ts`). Si riscrive solo su «Trova gli indirizzi».

**Dove.** `core/dominio/map.ts`, `core/dominio/addresses.ts`, `core/dati/geocoding.ts`.

### ADR-04 — La mappa esce dalla macchina solo su un gesto

**Decisione.** Geocodifica solo su «Trova gli indirizzi», verso Nominatim, una
richiesta al secondo, User-Agent dichiarato. Il pannello ha CSP
`default-src 'none'`; le tessere arrivano dall'host con
`registro://mappa/<z>/<x>/<y>.png` (`desktop/shell/protocol/tiles.ts`), in cache in
`userData`, mai nella cartella del docente.

**Vincoli.** La CSP non si allenta: ogni sorgente nuova passa dall'host. Tutte
le uscite di rete: ARCHITETTURA § 8.

### ADR-05 — Guida in-app come dati strutturati

**Decisione.** La guida d'uso è una struttura tipizzata, una sezione per
pagina (`ui/pannello/views/help.ts`, `ui/pannello/views/help/`). È l'unico posto del
«come si usa»: `docs/` non lo ripete.

**Vincoli.** Una pagina con comandi propri aggiunge la sua voce. Nessuna prova
lo controlla.

### ADR-06 — UI senza framework

**Decisione.** DOM vero con `h()` (`ui/pannello/dom.ts`); ridisegno completo a ogni
cambio di stato; le modali stanno fuori dal ciclo di ridisegno.

**Vincoli.** Lo stato applicativo è l'unica fonte di verità: il DOM non tiene
stato che lo stato non conosca, o il ridisegno lo azzera.

**Dove.** `ui/pannello/dom.ts`, `ui/pannello/forms.ts`, `ui/pannello/components/`.

### ADR-07 — Un comando, una superficie

**Decisione.** Comandi divisi per spazio (barra del titolo, barra laterale,
contesto, barra dei comandi, corpo della pagina); un comando non compare dove
la pagina disegna già il suo pulsante.

**Vincoli.** Disciplina di revisione, nessuna prova.

**Dove.** `ui/pannello/commands.ts`, `ui/pannello/commandBar.ts`, `ui/pannello/sidebar.ts`.

### ADR-08 — Il piano lezione appartiene al corso

**Decisione.** `PianoLezione.corsoId`; il riuso fra corsi è un «duplica»
esplicito. `corsoId: null` = bozza senza casa. `pianiDelCorso`
(`core/dominio/courses.ts`) non filtra per anno.

**Vincoli.** Nessun piano condiviso *live* fra corsi.

### ADR-09 — L'UD è l'unità canonica (modificata da ADR-36)

**Decisione.** Capienza dell'ora, appello e conteggi sono in UD. Le tappe del
piano hanno `Attivita.durataUd`; `scalettaSulleUd`
(`core/dominio/calculations.ts`) le posa sui minuti reali.

**Vincoli.** Ogni durata nuova a livello di corso, lezione o conteggio è in UD.
La durata dell'UD non è per corso (ADR-36).

**Dove.** `core/dominio/calculations.ts`, `core/dominio/dates.ts`, `core/dominio/activities.ts`.

### ADR-10 — Il momento di valutazione nasce dalla tappa del piano

**Decisione.** Una tappa si marca «È una valutazione»
(`Attivita.valutazione`); il `MomentoValutazione` nasce nella lezione che la
svolge, con `attivitaId`.

**Vincoli.** La coerenza `MomentoValutazione.pianoId` / `Lezione.pianoId` la
controlla `riferimentiRotti`, non bloccante. `core/dominio/orphans.ts` diagnostica,
non corregge.

### ADR-11 — «Conta come assenza» in un posto solo

**Decisione.** `contaComeAssenza(stato)` (= `stato === 'assente'`) in
`core/dominio/calculations.ts`, usata da quadro della persona, riepilogo
dell'ora, matrice del corso, rapporti e soglia delle segnalazioni.

**Vincoli.** Mai riscritta a mano. `tests/domain/lateness.test.mjs` prova i
cinque consumatori insieme. Anche la soglia sta in un posto solo
(`core/dominio/alerts.ts`).

### ADR-12 — Appello per UD, «non-impostato» mai contato

**Decisione.** `Presenza.stati`, uno per UD. `'non-impostato'` non è né
presenza né assenza. Due percentuali mai fuse: assenza sulle UD previste
dall'orario, presenza sulle UD con appello (`core/dominio/courseMatrix.ts`).

**Vincoli.** Ogni vista con una percentuale dichiara il denominatore. Uno stato
illeggibile degrada a `'non-impostato'`, mai a `'presente'`.

### ADR-13 — Modelli di stampa a quattro strati, fuori dal codice (modificata da ADR-34)

**Decisione.** L'impaginazione dei PDF sta in `templates/` come testo con
direttive: `_base.tpl` (contenuto), `_stile.tpl` (misure), `_testi.tpl` e
`_testi-<lingua>.tpl` (parole, ADR-38), `_blocchi.tpl` (pezzi ripetuti),
interpretata a runtime. `npm run templates` ne genera
`core/dati/defaultTemplates.ts`.

**Vincoli.** `npm test` controlla che la copia generata e `templates/` coincidano,
e che il catalogo dei modelli abbia gli stessi nomi della cartella. Nessuna
risalita `..` in un'`immagine:`.

**Dove.** `core/dati/templates.ts`, `core/dati/reportsPdf.ts`,
`core/dominio/templateCatalog.ts`, `core/dominio/templateCheck.ts`.

### ADR-14 — Un rapporto rifatto sovrascrive

**Decisione.** Rigenerare sostituisce il file; nessuna numerazione progressiva.

**Vincoli.** `(2)` solo per distinguere file davvero diversi con lo stesso nome
(ADR-15).

**Dove.** `core/dati/exports.ts` (`scriviGenerato`), `core/dominio/locations.ts`.

### ADR-15 — Nomi di file leggibili, niente id

**Decisione.** Anno, classe+materia, tipo, elemento distintivo reale (ora,
periodo, data, titolo). Collisioni: `distinzione()`.

**Vincoli.** Un `GenereRapporto` nuovo ha la sua regola di nome con gli stessi
quattro elementi.

### ADR-16 — Cartelle su disco: materia prima di classe

**Decisione.** `<materia|docente-di-classe>/<classe>/<classe|allievi/<Cognome Nome>>/<file>`,
sotto due radici: `archivio/` (caricato, unica copia) ed `esportazioni/`
(generato, rifacibile). `quarantena/` è la sala d'attesa dei PDF da dividere.
`documentazione/` è il nome vecchio unico: `core/dati/filing.ts` lo ridivide.

**Vincoli.** I nomi delle cartelle non si rinominano a cuor leggero: spostano
file sincronizzati su OneDrive.

**Dove.** `core/dominio/locations.ts`, `core/dati/filing.ts`.

### ADR-17 — Il documento è uno ZIP con JSON dentro (modificata da ADR-40)

**Decisione.** Il documento `.regi` è uno ZIP vero, apribile con `unzip`.
ZIP scritto in casa su `node:zlib`.

**Vincoli.** Mai un formato binario chiuso. I campioni
`tests/samples/formato/` si fissano solo quando il formato cambia apposta
(ADR-37).

**Dove.** `core/dati/package.ts`, `core/dati/zip.ts`.

### ADR-18 — Persistenza incrementale con storico integrato

**Decisione.** `accoda()` scrive in coda solo le collezioni cambiate, poi
riscrive indice e coda ZIP: finché la coda nuova non è intera, il file resta
leggibile con quella vecchia. `rifai()` (temporaneo + rinomina) quando il file
non c'è, o lo spazio morto supera 256 KB e un terzo del file, o accodare costa
più di metà documento. Storico per collezione in `.storico/` dentro il
pacchetto, potatura a gradini (`conserva`).

**Vincoli.** L'ordine «coda nuova, poi indice» non si inverte. Lo storico viaggia
con il file.

**Dove.** `core/dati/package.ts`, `core/dati/zip.ts`. Dettagli: ARCHITETTURA § 7.

### ADR-19 — Serratura informativa, non bloccante

**Decisione.** Un file accanto al documento dice chi lo tiene aperto; serve a
chiedere «vuoi aprirlo lo stesso?», non impedisce niente.

**Vincoli.** Mai promossa a lock vero (su OneDrive non esiste).
`Pacchetto.chiLoTiene()` ignora la serratura della stessa macchina e utente.

**Dove.** `core/dati/package.ts`, `core/dati/archive.ts`.

### ADR-20 — Percorsi salvati relativi alla cartella dell'anno

**Decisione.** Ogni percorso nei JSON è relativo alla cartella dell'anno.

**Vincoli.** Mai assoluti; i cambi di layout passano da `riscriviPercorsi()`
(`core/dati/filing.ts`). Il nome della cartella dell'anno resta quello di quando
è nata.

**Dove.** `core/dati/paths.ts`, `core/dati/filing.ts`.

### ADR-21 — Impostazioni del programma e del documento

**Decisione.** Programma: `impostazioni.json` in `userData`, per macchina.
Documento: `Registro.impostazioni` dentro il `.regi`. `contract/manifesto.ts` è la
fonte unica di chiavi, predefiniti e interfaccia.

**Vincoli.** Una chiave nuova si dichiara nel manifesto; ogni chiave arriva a
tutte e due le superfici (`tests/ui/settingsSections.test.mjs`). Uno stato che
il programma scrive da sé non è un'impostazione: va in `userData/interfaccia/`.
Il come: skill `impostazione`.

**Dove.** `contract/manifesto.ts`, `desktop/apparato/settings.ts`.

### ADR-22 — I file si aprono per percorso, non per URL

**Decisione.** `execFile` con il percorso come argomento
(`core/dati/opening.ts`, `apriConIlSistema`), mai `openExternal` su un
`file://` (codifica non-ASCII rotta, injection con `&`).

**Vincoli.** `openExternal` solo per `http`, `https`, `mailto`, `tel` e i modi di chiamata `callto`, `skype`, `msteams`
(`desktop/apparato/commands.ts`).

### ADR-23 — Funzioni di sistema in tre file che non si conoscono

**Decisione.** Dominio puro, orchestrazione, ambiente. Oggi: il vassoio.

**Vincoli.** Una funzione di sistema nuova segue lo stesso schema.

**Dove.** `core/dominio/tray.ts`, `desktop/widget/tray.ts`, `desktop/apparato/tray.ts`.

### ADR-24 — Eliminare è sempre permesso

**Decisione.** Ogni entità si elimina. `eliminazione(registro, bersaglio)` è
pura e descrive prima tutto quel che sparisce; `applica(registro)` esegue dopo
la conferma: il messaggio e l'effetto sono lo stesso calcolo. Quel che sa
vivere staccato resta (piani di un corso eliminato → `corsoId = null`). Dove
c'è un'alternativa non distruttiva (archiviare, unire) si offre accanto. I
file vanno nel cestino di sistema.

**Vincoli.** Ogni tipo eliminabile ha la sua voce di cascata in
`core/dominio/deletions.ts`; `core/dominio/repairs.ts` ripara a posteriori, mai in
silenzio. Cascate: MODELLO-DATI § 7.

### ADR-25 — Modelli locali in file `.gguf`, mai cloud

**Decisione.** Un modello è un `.gguf` nella cartella dei modelli.
`core/dati/llamaCpp.ts` lo carica nel main process per l'assistente;
`core/dati/mtmd.ts` usa `llama-mtmd-cli` per le scansioni. Si scaricano dalla
pagina «Modelli linguistici», si trascinano o si scelgono. Senza modello:
scansioni in quarantena, assistente spento.

**Vincoli.** Nessuna dipendenza cloud, nemmeno opzionale. L'unica rete è lo
scarico dei pesi da Hugging Face. Il nome nelle impostazioni passa da
`modelloNellaCartella()`: un percorso scritto a mano non diventa un file
aperto. `node-llama-cpp` e i binari restano fuori dall'`asar`.

**Dove.** `core/dati/llm.ts`, `core/dati/gguf.ts`, `core/dati/huggingFace.ts`.

### ADR-26 — Smistamento dei PDF: niente archivio senza conferma

**Decisione.** Il riconoscimento del nome produce una bozza; niente si archivia
da solo.

**Vincoli.** `FIDUCIA_SUFFICIENTE` (0,7) e lo stacco minimo fra i primi due
candidati (0,2) decidono se *proporre*, mai se eseguire. Un allievo riceve al
massimo un blocco per passata.

**Dove.** `core/dominio/sorting.ts`, `core/dati/sorter.ts`, `ui/pannello/views/sorting.ts`.

### ADR-27 — Un contratto davanti al centralino

**Decisione.** Ogni azione ha una `Procedura` (`contract/contract.ts`) che
dichiara `azione`; `gestoriDelleProcedure()` (`contract/bridge.ts`) la spande
sopra `GESTORI` in `contract/centralino.ts`. Il lavoro resta nel gestore. `chiama()`
(`contract/core.ts`) è l'unico punto che convalida, esegue, cronometra e scrive
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

### ADR-28 — Schemi nostri sopra valibot, contratto Standard Schema

*Modificata da ADR-50 (passo 4): la convalida la fa valibot.*

**Decisione.** `contract/schemas.ts` espone `~standard`, come zod/valibot; il
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
- La convalida la fa valibot, dietro `~standard`. Forma e JSON Schema restano
  nostri (`schemaJson`): portano l'aiuto nella lingua del momento,
  `perAssistente`, `aperto`, `severo`, `nullo`, `entita()`; per questo
  `@valibot/to-json-schema` non serve. Un campo dice un problema solo, il primo
  (`abortPipeEarly`); un oggetto li raccoglie tutti.

**Dove.** `contract/schemas.ts`, `core/dominio/validation.ts`, `tests/api/schemas.test.mjs`.

### ADR-29 — Un canale per le domande, separato dalle azioni

**Decisione.** `Domanda` / `Riscontro` sullo stesso canale IPC: `chiedi()` in
`ui/pannello/bridge.ts`, `rispondiDomanda()` in `desktop/pannelli/panel.ts`. Le domande
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

**Dove.** `udPrevisteDaOrario` in `core/dominio/timetable.ts`,
`segnalazioniDelCorso` in `core/dominio/alerts.ts`.

### ADR-31 — I documenti seguono i dati dentro `chiama()`

**Decisione.** Dopo una scrittura riuscita che cambia la revisione, `chiama()`
lancia `rigeneraDopoScrittura` (`pdfAutomatici: 'sempre'`): vale per pannello,
condotto e assistente. `esegui()` la tiene solo per le azioni senza procedura.

**Dove.** `contract/core.ts`, `contract/centralino.ts`, `core/azioni/reports.ts`,
`tests/api/regeneration.test.mjs`.

### ADR-32 — Il contesto del modello resta caldo

**Decisione.**
1. Prompt (`componiBattute` in `desktop/transports/assistant.ts`): una battuta
   di sistema, `istruzioni()`, poi il catalogo; veduta della pagina e id visti
   vanno in una nota davanti all'ultima domanda, mai salvata. Il prefisso
   [istruzioni + catalogo] resta identico byte per byte.
2. Contesto caldo (`Caldo` in `core/dati/llamaCpp.ts`): legato ai pesi; se ne va
   con loro, dopo `RIPOSO_MS` (5 min) o se la domanda si rompe. I pesi (`Pesi`)
   restano caricati e si scaricano automaticamente dopo `RIPOSO_PESI_MS` (15 min)
   di inattività, per liberare memoria di sistema e VRAM.

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

**Dove.** `core/dominio/check.ts`, `tests/domain/check.test.mjs`.

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

**Dove.** `core/dominio/letterhead.ts`, `ui/pannello/views/settings/letterhead.ts`,
`core/azioni/templates.ts`, `tests/domain/letterhead.test.mjs`.

### ADR-35 — La dettatura passa da voicebox, solo in locale

**Decisione.** Il riconoscimento della voce lo fa
[voicebox](https://github.com/jamiepine/voicebox) (MIT), installato a parte:
`GET /health`, poi `POST /transcribe` con un WAV costruito in memoria, la
lingua del registro e `dettatura.taglia`, all'indirizzo `dettatura.indirizzo`
(di serie `http://127.0.0.1:17493`). Il registro non installa, avvia né
scarica niente per la voce.

**Vincoli.** voicebox non ha autenticazione, quindi:
- l'indirizzo è solo di questo computer (`http`, `127.0.0.1`/`localhost`/`[::1]`,
  niente credenziali né percorso; `core/dominio/loopback.ts`), ricontrollato a
  ogni lettura;
- niente rinvii (`redirect: 'manual'`);
- il condotto non cambia `dettatura.indirizzo` (`chiaveIntoccabile` in
  `desktop/transports/conduit.ts`).

**Dove.** `core/dati/dictation.ts`, `core/dati/voicebox.ts`, `ui/pannello/assistant/voice.ts`.

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

**Dove.** `core/dominio/dates.ts`, `core/dominio/breaks.ts`, `core/azioni/system.ts`,
`ui/pannello/views/settings/schoolDay.ts`.

### ADR-37 — I documenti vecchi si portano avanti per passi

**Decisione.** `PASSI_DEL_FORMATO` in `core/dominio/upgrades.ts`, uno per
versione (`{ a, cambia, porta? }`). Aprendo un documento con `versione` più
bassa di `VERSIONE_DATI`: copia in `‹nome›/versioni-precedenti/`
(`copiaPrimaDelFormato`), passi sui dati grezzi (`aggiornaFormato`), riscrittura
intera, avviso con le frasi `cambia`. Senza copia non si riscrive niente. Un
documento più recente si rifiuta con una frase sola
(`fraseVersionePiuRecente`, riconosciuta da `versionePiuRecente`).

**Vincoli.** Ogni campo nuovo ha il suo passo, anche senza `porta`. Ogni
versione dalla 1 ha il suo campione in `tests/samples/formato/`, fissato da
`npm run sample` e mai riscritto. Il come: skill `formato`.

**Dove.** `core/dati/archive.ts`, `tools/sample.mjs`.

### ADR-38 — Quattro lingue, i testi accanto al codice, l'italiano come forma

**Decisione.**
- Lingue `it` (fonte e ripiego), `de`, `fr`, `en` (`core/i18n/languages.ts`).
  `registroDocenti.aspetto.lingua`: `sistema` (prima lingua del sistema,
  altrimenti italiano) o una lingua.
- Una lingua per processo (`core/i18n/state.ts`): nel main la sceglie
  `desktop/apparato/language.ts`; le pagine la ricevono dal preload e la
  adottano in `core/i18n/page.ts`, primo import. Al cambio: menu e icona si
  ridisegnano, le finestre si ricaricano.
- Cataloghi `<file>.testi.ts` accanto al codice, `catalogo(it, { de, fr, en })`;
  il compilatore impone le stesse chiavi (`Forma<T>`). Frasi con dati =
  funzioni. `lessico()` per lingua, `parole()` per le parole comuni
  (`core/dominio/words.testi.ts`).
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
  (ricopiati in `desktop/apparato/theme.ts` e nell'installatore). Carattere di
  sistema.
- Componenti: titolo di pagina (`testataVista`), tessere KPI, tabelle con
  intestazione tenue, avatar (`ui/pannello/components/avatar.ts`), stati vuoti,
  segmenti a pillola.
- Navigazione: **Dashboard** (vista `oggi`, solo collegamenti, ADR-07), barra
  laterale a pillola, ricerca in vista (Ctrl+K) con persone, corsi e classi,
  indietro/avanti (`ui/pannello/history.ts`), Ctrl+1…9.
- Nessuna dipendenza nuova; icone mancanti da Lucide (ISC) in `icons.ts`.

**Vincoli.** Un token nuovo va in tutte e due le tavolozze e, se lo usa la
miniatura del tema, nei blocchi `[data-tema-figura]`
(`tests/ui/themeFigure.test.mjs`).

### ADR-40 — Il nome: Regiklass

**Decisione.**
- Marchio **Regiklass**, non si traduce; nome npm `regiklass`, artefatti
  `regiklass-<versione>-installer.exe` / `-portabile.exe`.
- `appId` `ch.nabre.regiklass`; `nsis.guid` fisso al GUID ricavato dal vecchio
  `ch.edu.ti.cptt.registro-docenti`.
- Eseguibile `Regiklass.exe`: lo script d'aggiornamento installato
  (`os/windows/aggiornamento.ps1`) riconosce ancora i nomi precedenti (`Regiclass.exe`
  e `Registro docenti.exe`) e riapre quello nuovo nello stesso percorso.
- Cartella dei dati `%APPDATA%\Regiklass` (rinominata al primo avvio).
- Estensione `.regi`.
- Comando `regi`.
- Restano: formato `registro-docenti/anno`, protocollo `registro://`, chiavi
  `registroDocenti.*`, repository `nabre/Registro`.

**Vincoli.** `nsis.guid` non cambia mai. Il nome dell'eseguibile cambia insieme
in `.github/workflows/rilascio.yml` e in
`.signpath/artifact-configuration/eseguibile.xml`. Il nome del prodotto è lo
stesso negli eseguibili, in `.signpath/` e in `tools/peMetadata.ps1`, o
SignPath rifiuta la firma.

### ADR-41 — Risoluzione questioni aperte di cantiere: prove, valutazioni, scale e riservatezza

**Decisione.**
1. **Allievi arrivati a metà anno:** Iscrizione esplicita tramite campo
   Allievo.iscrittoIl?: Iso (introdotto nel formato dati con VERSIONE_DATI = 2
   e migrazione per passi). Un allievo con data di iscrizione posteriore alla data
   di una prova passata viene escluso da quella prova, non lasciando debiti pregressi
   o buchi fittizi nelle valutazioni.
2. **Esclusione reciproca voto e assenza:** In valutazioni.voto.imposta, l'attribuzione
   di un voto (valore !== null) azzera lo stato di assenza (assente = false),
   e contrassegnare un allievo come assente (assente = true) rimuove il valore del
   voto (valore = null). Non è possibile avere contemporaneamente un voto numerico
   e l'assenza segnata sulla stessa prova.
3. **Scale voti e medie:** Le valutazioni numeriche sono ancorate alla scala definita
   nelle impostazioni del documento (minimo 0%, massimo 100%, con grado di precisione
   del passo conservato). Nel calcolo della media (mediaAllievo), qualora un allievo
   abbia valutazioni espresse su scale eterogenee, viene calcolata la media normalizzata
   e restituito il contrassegno scaleEterogenee = true per avvisare l'interfaccia.
4. **Indipendenza delle ore:** Confermato il principio di ADR-30: ogni ora o lezione
   cancellata, spostata o recuperata fuori orario mantiene la propria identità e
   contabilità oraria senza legami invisibili.
5. **Formato archivio e riservatezza in aula:** Confermato ADR-17 sul formato .regi
   (ZIP compresso contenente file JSON leggibili in chiaro, senza cifratura del file
   per preservare ispezionabilità, longevità e recuperabilità da backup). La riservatezza
   durante le lezioni è demandata alla modalità videoproiezione/aula dell'interfaccia,
   che oscura voti, note sensibili e dati personali degli altri allievi quando lo
   schermo è proiettato.
6. **Normalizzazione e consistenza:** Tutti i campi opzionali di tipo identificativo o
   chiave esterna sono normalizzati in modo coerente tramite riferimento: stringa non
   vuota o null (stringa vuota convertita in null). Le azioni sulle collezioni
   utilizzano contesto.modifica dichiarando esplicitamente le partizioni coinvolte.

**Vincoli.** VERSIONE_DATI = 2: i documenti aperti a versione 1 vengono aggiornati
creando la copia di backup in versioni-precedenti/ prima di applicare il passo.
Nessuna dipendenza crittografica opaca nel file .regi.

**Dove.** `core/dominio/models.ts`, `core/dominio/upgrades.ts`, `core/dominio/normalization.ts`,
`core/dominio/calculations.ts`, `core/azioni/assessments.ts`, `core/azioni/register.ts`,
`core/azioni/sorting.ts`, `core/azioni/assignments.ts`, `core/azioni/classTeacher.ts`.

### ADR-42 — Decisioni di interfaccia: scorrimento a due colonne, finestre figlie e filtri di contesto

**Decisione.**
1. **Doppio scorrimento indipendente nelle pagine a due colonne:** Nelle viste
   a due colonne (Classi, Persone, Piani, Registri, Documenti, Modelli), la lista
   di sinistra e la scheda di destra mantengono scorrimenti separati e indipendenti.
   Questo consente di consultare ed esplorare elenchi lunghi senza perdere la
   posizione nella scheda di dettaglio.
2. **Cornice nativa del sistema per le finestre figlie staccate (assistente):**
   La finestra dell'assistente staccato mantiene la cornice di sistema dell'OS,
   differenziando chiaramente la finestra satellite dal frame overlay del registro
   principale.
3. **Unicità dei filtri di contesto:** I filtri di corso e periodo risiedono
   unicamente nella riga di contesto/comandi in alto, eliminando le tendine
   duplicate nella barra di stato in basso.

**Vincoli.** Nessun duplicato di controlli di contesto fra barra comandi e barra
di stato. I pannelli a due colonne conservano contenitori di scorrimento isolati
e chiavi `data-scorrimento` dedicate. Le finestre figlie staccate adottano la
decorazione standard della piattaforma, mentre la finestra principale conserva la
barra del titolo con overlay.

**Dove.** `ui/pannello/commandBar.ts`, `ui/pannello/statusBar.ts`,
`desktop/apparato/windows.ts`.

### ADR-43 — Architettura dell'API: stato monolitico, transazioni, schemi e paginazione

**Decisione.**
1. **Spinta dello stato monolitico al pannello:** Il pannello webview riceve l'intera
   istanza immutabile di `Registro` a ogni modifica via IPC (`flushStato`). Data la
   natura dell'applicazione (monoutente desktop, dimensioni tipiche del registro
   nell'ordine di pochi megabyte), le sottoscrizioni parziali a singole entità
   introdurrebbero complessità architetturale (state store distribuiti, riconciliazione,
   rischio di viste disallineate) senza alcun beneficio percettibile di reattività.
2. **Atomicità a singola azione e rifiuto delle transazioni multi-procedura:** Ogni
   chiamata a procedura o azione applicativa è un'unità atomica di mutazione. Non sono
   ammesse transazioni che abbracciano più procedure consecutive: questo preserva
   l'invariante di consistenza del documento, la semplicità del rollback a livello di
   singola azione e la tracciabilità lineare nel giornale degli eventi.
3. **JSON Schema per procedura e rifiuto di OpenAPI:** Il protocollo JSON-RPC e il
   centralino utilizzano JSON Schema standard (draft 2020-12) per definire l'ingresso e
   l'uscita di ciascuna procedura. OpenAPI (specifica pensata per API RESTful HTTP con
   metodi, rotte e codici di stato HTTP) è inadatta ed eccedente rispetto a un centralino
   RPC a messaggio tipizzato; la CLI e l'assistente LLM consumano direttamente
   `resources/tools.json` e le definizioni del manifesto.
4. **Paginazione naturale vs buste chiuse:** La paginazione a cursore/finestra è
   adottata per collezioni che possono crescere indefinitamente. Le letture legate al
   contesto di classe o anno (`corso.presenze`, `valutazioni.voti`,
   `documenti.inventario`) restituiscono buste chiuse complete senza paginazione: il
   loro dominio è naturalmente limitato (es. capienza di una classe, tipicamente 20–30
   allievi, o inventario dell'anno), rendendo la paginazione superflua e d'intralcio
   ai consumatori sincroni.

**Vincoli.** Nessuna libreria di schema o framework REST aggiuntivo; le procedure rimangono
autodescrittive tramite `definisci()`. Il salvataggio su disco rimane asincrono e a prova
di coalescenza.

**Dove.** `contract/protocollo.ts`, `contract/procedure/`, `desktop/pannelli/panel.ts`,
`docs/API.md`.

### ADR-44 — Prove d'interfaccia con Playwright Python sincrono (superata)

**Decisione.** I test d'interfaccia completi con browser reale (25 suite per oltre
3'700 righe in `tests/ui/*.py`) restano scritti in Python sfruttando
`playwright.sync_api`. Non si migra il framework a Node.js (`@playwright/test`).
Le prove di regressione puntuali sui componenti DOM dell'interfaccia (`attendanceClicks`,
`commandBarInFlight`, ecc.) si scrivono invece in JavaScript/Node.js sotto `tests/ui/*.test.mjs`
tramite DOM sintetico, eseguibili direttamente con `node --test` e `npm test`.

**Perché.**
1. `playwright.sync_api` offre una sintassi lineare e sincrona priva di cascate di
   `await` su ogni locator, asserzione e clic, rendendo i test di flusso UI estremamente
   chiari e concisi.
2. L'ambiente Python è leggero, già integrato e isolato nel runner della CI
   (`.github/workflows/verifica.yml`) e in `tools/uiTests.mjs`.
3. Una riscrittura completa dei 25 file in TypeScript/Node richiederebbe l'aggiunta di
   pesanti pacchetti npm in `devDependencies`, aumentando il tempo di installazione e
   creando potenziale duplicazione senza alcun guadagno di copertura o stabilità.
4. I test unitari veloci dell'interfaccia girano in millisecondi in memoria con
   `node --test` senza avviare Chromium.

**Vincoli.** Nessuna dipendenza da Playwright nel `package.json` di produzione o
di sviluppo Node; Python 3 e Playwright Chromium restano gestiti esternamente via `ui-tests`.

**Dove.** `tools/uiTests.mjs`, `tests/ui/*.py`, `tests/ui/*.test.mjs`.

*Superata da ADR-50 (passo 5): le prove d'interfaccia sono @playwright/test in TypeScript (`tests/interfaccia/`), Python non serve più. Restano valide le prove puntuali `tests/ui/*.test.mjs` su DOM sintetico.*

### ADR-45 — Controllo degli aggiornamenti disattivato per impostazione predefinita

**Decisione.** L'impostazione `registroDocenti.aggiornamenti.controlloAutomatico`
ha valore predefinito `false`. All'avvio dell'applicazione non viene effettuata
alcuna chiamata o polling di rete verso GitHub Releases senza l'esplicita volontà
dell'utente. Il controllo manuale («Controlla adesso») e l'attivazione della
ricerca automatica restano sempre disponibili nelle impostazioni del programma.

**Perché.**
1. Rispetto della sovranità e privacy dell'utente: un registro di classe
   contenente dati di allievi non deve aprire connessioni di rete esterne di
   propria iniziativa appena lanciato.
2. Rispetto delle politiche di fondazioni di firma del codice aperto (SignPath
   Foundation) e compatibilità con ambienti scolastici operanti su reti isolate,
   a consumo o dietro proxy restrittivi.
3. Trasparenza: l'utente ha il pieno controllo su quando effettuare richieste
   di rete verso server esterni.

**Vincoli.** Nessuna richiesta di rete per gli aggiornamenti finché
`controlloAutomatico` non è abilitato dall'utente o non viene premuto
«Controlla adesso».

**Dove.** `contract/manifesto.ts`, `desktop/apparato/updates.ts`, `docs/CATALOGO.md`,
`os/windows/installer.nsh`.

### ADR-46 — Risoluzione questioni di cantiere: registro mono-docente, purezza delle viste, azioni per campo e calcoli canonici

**Decisione.**
1. **Registro mono-docente e dati strutturati (D-4):** Regiklass è un'applicazione
   personale destinata a un unico docente titolare che apre e modifica il
   documento. Si rigetta l'introduzione di metadati complessi di paternità o
   controllo accessi multi-utente per ogni scrittura. Per valorizzare la
   documentazione generata e le stampe, l'identità del docente viene
   strutturata (`appellativo`, `nome`, `cognome`) e integrata automaticamente nei
   modelli di stampa (`templates/`) e nei rapporti PDF.
2. **Purezza assoluta delle viste e rimozione scritture implicite (D-2):** In
   osservanza del principio fondamentale «una lettura o vista non scrive mai dati»,
   la pagina dei piani lezione (`ui/pannello/views/plans.ts`) e qualsiasi altra
   vista non possono generare o assegnare entità durante il disegno o la semplice
   navigazione. La creazione o associazione di un piano per una lezione priva di
   scaletta richiede un'interazione esplicita dell'utente tramite pulsante dedicato.
3. **Azioni atomiche per campo contro scritture sovrapposte (D-3):** Per eliminare
   il rischio di regressione dello stato causato dall'invio di oggetti interi
   concorrenti o ravvicinati (es. rinomina e archiviazione quasi simultanee di una
   classe), le mutazioni si scompongono in azioni mirate per campo o intento
   (es. rinomina, archiviazione, impostazione docente di classe), estendendo il
   pattern collaudato di `lezione.testi`.
4. **Calcolo canonico dei tempi di scaletta (D-5):** L'arrotondamento ai 5 minuti
   delle attività non è un mero artefatto visivo dell'interfaccia, ma una regola
   canonica di dominio. I calcoli di `durataPiano`, `scalettaSulleUd` e
   `minutiDiScarto` in `core/dominio/calculations.ts` operano sui valori coerenti,
   eliminando ogni discrepanza tra il tempo mostrato a schermo e quello calcolato.
5. **Rigidità dei parametri di calendario e orario (D-6):** Il parametro `pause`
   nella funzione `udPrevisteDaOrario` in `core/dominio/timetable.ts` è reso
   obbligatorio a livello di tipo TypeScript per prevenire omissioni accidentali
   nei nuovi chiamanti e garantire uniformità nel computo delle assenze.
6. **Reversibilità delle spunte di consegna (D-7):** L'azione `consegna.spunta` con
   `fatta: false` consente al docente di rimuovere la spunta anche qualora sia
   stata registrata a seguito di una spedizione via posta elettronica (`modo: 'email'`),
   preservando la sovranità decisionale dell'insegnante sulle spunte.
7. **Font PDF e licenze (D-8):** I font Liberation adottati per la generazione dei
   PDF vengono allineati alla versione 2.x rilasciata sotto licenza SIL Open Font
   License (OFL), superando le ambiguità della precedente licenza GPL con eccezione font.

**Perché.**
Garantisce la coerenza architetturale tra strati, elimina le sovrascritture di stato concorrenti,
allinea i calcoli visivi a quelli del dominio e formalizza l'identità personale del registro.

**Vincoli.**
Nessun side-effect di scrittura durante il ciclo di rendering (`h()`) o le funzioni `vaiA`.
Retrocompatibilità garantita per il segnaposto `{{docente}}` nei modelli esistenti.

**Dove.**
`core/dominio/models.ts`, `core/dominio/calculations.ts`, `core/dominio/timetable.ts`,
`core/azioni/assignments.ts`, `ui/pannello/views/plans.ts`, `ui/pannello/views/classes.ts`,
`templates/`.

### ADR-47 — Un posto solo per sapere dove si è, ricordato per documento

**Decisione.** Dove si guarda è un valore solo, `Posto = { pagina, soggetto?, scheda? }`
(`ui/pannello/posto.ts`): `pagina` è l'id stabile di `PAGINE` (più `pagina.allievo` e
`pagina.classe.pendenze`, senza voce nella barra), `soggetto` l'elemento aperto (corso,
classe, lezione, allievo, piano, valutazione), `scheda` la sezione delle impostazioni.
Ci si sposta solo con `vai(posto)` (`state.ts`); un solo risolutore puro, `completa`,
ricava corso, classe, filtro, giorno e semestre dal soggetto e ripiega in modo
deterministico quando il soggetto non c'è più. `stato.vista` e gli id di selezione sono
derivati, scritti solo da `vai`. Una sola chiave, `chiaveDelPosto`, per storia,
scorrimento ed entrata. Il posto e le scelte che contengono id (giorno, semestre,
filtri) si ricordano **per documento** (`ui/pannello/memoria.ts`), sotto il percorso
normalizzato del `.regi`, al più venti documenti; le preferenze dell'interfaccia
restano globali. La navigazione dell'host (`naviga`, `vista.apri`) passa dalla stessa
tabella (`postoDaVista`) e dallo stesso `completa`.

**Perché.** Cinque concetti sovrapposti (vista, destinazione, sotto-pagina, schede,
filtri), tre chiavi di posto, quattro modi di aprire un'ora e id ricordati fra un anno
e l'altro facevano riaprire documenti su id estranei e tornare indietro in posti a
metà.

**Vincoli.** `completa` e `vai` non scrivono nel documento (ADR-46) e non toccano il
DOM (ADR-06). `Vista`, `VISTE` e `vista.apri` restano il contratto verso fuori; gli
alias (`modelli`, `modelliLinguistici`) si risolvono solo nella tabella. Gli id di
`PAGINE` non cambiano. Al cambio di documento la storia si azzera e il posto si
ripristina in `ricevoStato`, dopo l'arrivo dei dati e prima di `proiezione.mira` e
`assistente.contesto`, in un passaggio solo. Il JSON vecchio si migra, non si rifiuta.

**Dove.** `ui/pannello/posto.ts`, `ui/pannello/memoria.ts`, `ui/pannello/state.ts`,
`ui/pannello/history.ts`, `ui/pannello/pages.ts`, `ui/pannello/main.ts`.

### ADR-48 — Ogni aggiornamento resta nel suo riquadro

**Decisione.** Un cambio dello stato globale ridisegna la pagina (ADR-06) con un
telaio stabile: i nodi `data-telaio` lungo la catena dalla radice (guscio, contenuto,
radice della vista, contenitori che scorrono) restano e cambiano solo i figli. Una
lettura asincrona (anteprima, PDF, CSV, miniature, risposta dell'host, avanzamento di
un'operazione) rifà solo l'**isola** che la mostra (`isola`/`ridisegnaIsola` in
`ui/pannello/isole.ts`, `leggi(…, { isola })` in `risorse.ts`). I nodi pesanti
(`<iframe>`, visore PDF, `<canvas>`, mappe, immagini grandi) portano
`data-tieni="<sorgente>"` e non si ricreano finché la sorgente non cambia. L'orologio
muove solo ciò che segna l'ora (`orologio.ts`, `alMinuto`). Nessun ridisegno e
nessuna richiesta all'host partono dal disegno.

**Perché.** Rifare tutta la pagina per una lettura arrivata, un avanzamento o il
minuto che passa la faceva lampeggiare, ricaricava i PDF, interrompeva lo
scorrimento e i trascinamenti.

**Vincoli.** Il contenuto di un'isola è funzione dello stato e delle letture, come il
resto: il DOM non tiene stato (ADR-06). Contenitore d'isola, nodo di telaio e nodo
tenuto conservano gli ascoltatori del primo disegno: non se ne mettono che dipendano
dallo stato. Un nodo tenuto si sposta solo con `moveBefore` senza uscire dal
documento (un iframe staccato si ricarica). La chiave `data-tieni` è la sorgente:
cambia se cambia ciò che il nodo mostra.

**Dove.** `ui/pannello/dom.ts`, `ui/pannello/isole.ts`, `ui/pannello/risorse.ts`,
`ui/pannello/orologio.ts`, `ui/pannello/shell.ts`, `tests/ui/isole.test.mjs`.


### ADR-49 — OneDrive letto dalle cartelle sincronizzate, o con Microsoft Graph

**Decisione.** Il registro cerca i `.regi` su OneDrive per due strade. La prima:
gli account che il client di OneDrive sincronizza su questo computer, letti da
`HKCU\Software\Microsoft\OneDrive\Accounts` (`UserEmail`, `UserFolder`, e le
librerie sotto `Tenants`), si sfogliano e si cercano sul disco
(`core/dati/oneDriveLocale.ts`), senza accesso né consenso; l'id di una voce è il
percorso, il drive `locale`, e un percorso fuori da quelle cartelle si rifiuta.
La seconda, per gli account che qui non sono sincronizzati: Microsoft Graph, a
nome degli account collegati in Impostazioni › «Account Microsoft». L'accesso è quello
della posta (`core/dati/oauth.ts`: browser di sistema, PKCE, client pubblico
«Microsoft Graph Command Line Tools»), con scope `Files.Read.All User.Read
offline_access`. Ogni account ha il suo gettone di rinnovo nel portachiavi; l'elenco
degli account sta nel portachiavi accanto ai gettoni, non nelle impostazioni. Aprire
un documento apre sempre un file sul disco: quello sincronizzato dal client di
OneDrive se c'è (registro di Windows `HKCU\Software\Microsoft\OneDrive\Accounts`;
`OneDriveCommercial`/`OneDrive` solo se il registro non lega nessuna cartella
all'account) e ha la misura che dice Graph, altrimenti una copia scaricata dove si
sceglie. Un omonimo di un altro account non si apre mai al posto dell'originale.

**Perché.** Nel tenant `edu.ti.ch` il consenso a `Files.Read.All` per il client
pubblico è riservato all'amministratore («L'approvazione dell'amministratore è
necessaria»): Graph da solo lascerebbe fuori proprio i docenti per cui la
funzione esiste, mentre il client di OneDrive quasi sempre c'è già. La casella
della posta ha già un account Microsoft, ma un gettone vale
per una risorsa sola: `SMTP.Send` non legge file, e allargare lo scope della posta
avrebbe chiesto a ogni docente un permesso che l'invio non usa. Scrivere su OneDrive
lo fa già il client di sincronizzazione, che conosce i conflitti; un secondo scrittore
li moltiplicherebbe (ADR-19).

**Vincoli.** Solo lettura: nessuno scope `Write`. Il gettone non attraversa il
ponte; il pannello vede indirizzi e pastiglie. Le letture `onedrive.*` restano fuori
dall'assistente (`perAssistente: false`). Una copia scaricata non si risincronizza, e
lo si dice a chi la apre.

**Dove.** `core/dati/microsoft.ts`, `core/dati/onedrive.ts`, `core/dominio/onedrive.ts`,
`core/dati/oneDriveLocale.ts`, `core/azioni/microsoft.ts`, `contract/procedure/microsoft/`, `contract/procedure/onedrive/`,
`ui/pannello/views/settings/microsoft.ts`, `ui/pannello/forms/oneDrive.ts`.

### ADR-50 — Librerie: criteri di adozione, e le prime adottate

**Decisione.** D7 non vieta più le librerie: le giudica. Una libreria entra se passa
tutti questi criteri, scritti qui perché ogni proposta futura abbia la stessa regola.

1. **Licenza permissiva** (MIT, ISC, 0BSD, BSD, Apache-2.0), verificata a macchina
   su tutto l'albero (`npm run licenze`), non a memoria.
2. **Sviluppo o programma.** Una dipendenza di sviluppo non arriva sul computer del
   docente: si adotta con larghezza. Una del programma deve togliere più codice di
   quanto ne porta, e non toccare il formato `.regi` né la rete.
3. **Dietro un confine già nostro.** Entra sotto un contratto che c'è già
   (`~standard` degli schemi, `modifica` dell'archivio, `aggiornaElemento` del DOM,
   le funzioni di `dates.ts`): chi usa quel confine non cambia.
4. **Niente sostituti di quel che è specifico.** Non entrano: framework d'interfaccia
   (React, Vue, Svelte), tRPC, zod, librerie ZIP (JSZip & co.: l'aggiunta
   incrementale sicura al file è nostra), librerie i18n al posto del lessico.
5. **La riga di comando resta nuda** (D10): niente di questo arriva in `cli/`.
6. **Un passo alla volta**, con `npm run ci` verde dopo ognuno.

Adottate, in quest'ordine:

| Passo | Libreria | Dove | Perché |
| --- | --- | --- | --- |
| 1 | fast-check (dev) | `tests/proprieta/` | prove per proprietà sulle invarianti già dichiarate: indirizzi (ADR-03), ZIP scritto e riletto, migrazioni, normalizzazione |
| 1 | knip (dev) | `npm run knip`, accanto a `census` | export, file e dipendenze inutilizzati: il lavoro di D6, che resta la regola (si rende interno, si cancella dopo una prova) |
| 1 | dependency-cruiser (dev) | `npm run layers` | le regole dei cinque strati come configurazione dichiarativa |
| 1 | license-checker-rseidelsohn (dev) | `npm run licenze`, in CI | le licenze dell'albero come controllo, non come promemoria |
| 2 | immer | `core/dati/archive.ts` `modifica`, `core/dati/history.ts` | le collezioni toccate si ricavano dalle patch; l'annulla con le patch inverse |
| 3 | idiomorph | `ui/pannello/dom.ts` | selezione, fuoco e transizioni conservati da sé. Dopo ADR-48 il guadagno è piccolo e i guasti possibili sono silenziosi: entra solo dopo i prerequisiti (3a `h()` riflette `value`/`checked`/`selected` come attributi; 3b eventi per delega su `document`; 3c i circa 100 `addEventListener` sui nodi convertiti; 3d le closure che tengono un nodo controllate, `guardaQuando` e `posate` rifatti), e dietro un interruttore spento finché la rete di prove non è verde |
| 4 | valibot | dietro `~standard` in `contract/schemas.ts` | schemi senza manutenzione fatta in casa; il nucleo non cambia (Standard Schema) |
| 4 | Temporal | `core/dominio/dates.ts` e calendario | `PlainDate`/`PlainTime` per date scolastiche senza fuso. Nativo in Electron 44 (processo principale e pagina); `temporal-polyfill` solo per le prove in Node |
| 5 | @playwright/test (dev) | prove d'interfaccia | l'app vera con `_electron.launch`, in TypeScript; supera ADR-44 quando la migrazione è completa |
| 5 | @tanstack/virtual-core | tabelle lunghe | solo dove una misura dice che una tabella è lenta |

Dependabot raggruppa gli aggiornamenti minori e di correzione delle dipendenze npm in
una richiesta settimanale; Electron e node-llama-cpp restano a mano (binari nativi,
da provare sul pacchetto).

Come sono entrate:

- **immer** (passo 2): `core/dati/bozza.ts` tiene un'istanza `Immer` locale
  (`autoFreeze` spento, patch attive). `modifica` gira su una bozza, ricava le
  collezioni toccate dalle patch e le applica **in posto**, perché gestori in
  attesa di un dialogo e lo smistatore tengono riferimenti vivi. L'annulla mette
  raccolte nuove, come faceva con le copie. La dichiarazione resta un controllo:
  una collezione toccata e non dichiarata lancia con `npm run dev`, altrove
  scrive con un avviso, perché fermarsi perderebbe il lavoro. La storia tiene le
  patch inverse del solo cambiato, non la collezione intera. Il formato su disco
  non cambia.
- **idiomorph** (passo 3): `h()` riflette `value`/`checked`/`selected` come
  attributi. I gestori stanno in un registro di `dom.ts` e li chiama per delega
  un ascoltatore per tipo su `document` (`gestisci`), con `currentTarget` sul
  nodo vivo. Il morph lavora dietro `aggiornaElemento`, con l'interruttore
  `MORFOSI`. Le chiavi di telaio, `data-tieni`, scorrimento e isola diventano
  `id` provvisori; un `data-tieni` ritrovato prende solo gli attributi; i nodi
  nuovi entrano originali, non come copie; un nodo riusato riceve i gestori del
  disegno nuovo. `MORFOSI` è acceso. Il percorso classico di ADR-48 resta
  come ripiego a un interruttore, provato col DOM finto (`percorsoClassico`);
  il morph si prova su Chromium (`tests/interfaccia/morfosi.spec.ts`). Il
  ripiego si toglie dopo un uso vero senza guasti (D6).
- **valibot** (passo 4): solo in `main.cjs`. `@valibot/to-json-schema` non è
  adottato (ADR-28).
- **Temporal** (passo 4): in `dates.ts`, con i tipi dichiarati a mano finché
  TypeScript non li porta.
- **@playwright/test** (passo 5): le prove Python sono migrate tutte in
  `tests/interfaccia/*.spec.ts`, più `electron.spec.ts` con `_electron.launch`.
  La CI non usa più Python.

**Perché.** «Niente librerie nuove» proteggeva da riscritture e da dipendenze opache,
ma lasciava da mantenere in casa quel che altri mantengono meglio (schemi, confronto
del DOM, date, controlli statici). Una regola con criteri protegge le stesse cose e
lascia passare quel che le rispetta.

**Vincoli.** Criteri 1–6 per ogni libreria nuova, anche di sviluppo. Il contratto
davanti a ogni libreria resta nostro: sostituirla non deve toccare chi la usa.
Il polyfill di Temporal entra solo nei bundle di prova (`inject` di esbuild,
`tests/helpers/temporal.mjs`), mai in `dist/`.

**Dove.** `package.json`, `.github/dependabot.yml`, `tools/licenze.mjs`,
`.dependency-cruiser.cjs`, `knip.json`, `tests/proprieta/`, e i file dei passi 2–5.

### ADR-51 — Un anno può seguire il calendario ufficiale, e allora le sue voci non si toccano

**Decisione.** Un anno ricorda da quale anno del calendario scolastico ufficiale
prende inizio, fine e chiusure: `AnnoScolastico.calendarioUfficiale = { cantone,
annoScolastico }` (formato 5, senza `porta`: assente vuol dire anno scritto a
mano). Le chiusure non hanno un segno loro: è collegata quella con il marcatore
presente e l'id `sos-<cantone>-<aaaa-aaaa>-…` di quell'anno (`èCollegata`), l'id
che l'importazione dava già. Con il marcatore `anno.salva` rifiuta inizio e fine
diversi da prima e dai valori ufficiali, una chiusura collegata tolta o cambiata
di nome o date, un id collegato che il calendario non ha, e il marcatore messo,
tolto o cambiato (`motivoCalendarioToccato`, pura, in `core/dominio/schoolCalendar.ts`).
`anno.crea` con il marcatore vuole date e chiusure ufficiali, tutte. Il marcatore
lo mettono e lo tolgono solo `anno.calendario` / `anni.calendario`: collegare
sincronizza nello stesso gesto (date, chiusure con i nomi ufficiali, le scritte a
mano che coincidono diventano collegate) e serve anche a riallineare; staccare
toglie solo il marcatore. Un anno nato scegliendo un anno del calendario nasce
collegato; uno scritto a mano, o di prima, si collega a richiesta.

**Perché.** Le vacanze ufficiali valgono per tutte le classi e decidono quali ore
si generano e quali si tolgono (`lezioniNeiGiorniChiusi`): cambiarne una per
sbaglio, o toglierla col cestino, sposta ore senza che nessuno lo voglia. Un
segno per chiusura avrebbe chiesto di tenerlo coerente con l'id, che già dice da
dove viene; il marcatore sull'anno basta a dire «queste le decide il cantone». La
guardia sta nel gestore e non solo nell'interfaccia perché le scritture arrivano
anche dalla riga di comando e dal condotto.

**Vincoli.** Restano libere le chiusure proprie, il confine e i nomi dei semestri,
le note, le settimane. Una chiusura collegata che il calendario di questa
versione non ha più può andarsene; una che ha si porta ai valori ufficiali o si
lascia com'era. Un marcatore di un calendario che il registro non conosce non
blocca l'apertura: tiene quel che c'era.

**Dove.** `core/dominio/models.ts`, `core/dominio/schoolCalendar.ts`,
`core/dominio/normalization.ts`, `core/dominio/upgrades.ts`, `core/azioni/register.ts`,
`contract/procedure/anni/calendario.ts`, `ui/pannello/forms/year.ts`,
`ui/pannello/forms/schoolCalendar.ts`, `ui/pannello/views/settings/year.ts`,
`desktop/avvio.ts`, `tests/api/officialCalendar.test.mjs`.

## Decisioni implicite

Scelte che il codice applica senza un ADR; il perché è ricostruito.

1. **Un aggregato unico, stato spinto intero.** `Archivio`
   (`core/dati/archive.ts`) tiene il `Registro` in memoria e lo modifica in
   blocco; il pannello riceve lo stato intero e ridisegna (ADR-06, con il
   telaio stabile e le isole di ADR-48). Un solo
   scrittore: più utenti vorrebbero ripensarlo da capo.
2. **Risposta prima del disco.** La scrittura è ritardata di 350 ms
   (`RITARDO_SALVATAGGIO_MS`), al massimo 2000 ms dalla prima modifica
   (`ATTESA_MASSIMA_MS`). Un crash in quella finestra perde al più due secondi.
3. **Due domande di validità diverse.** Lo schema dell'API dice se il
   *messaggio* ha la forma giusta (ADR-27/28); i normalizzatori e le `valida*`
   di `core/dominio/validation.ts` dicono se la *cosa* sta in piedi, e fanno
   degradare un JSON vecchio o corretto a mano invece di rifiutarlo.
4. **Nessuna autorizzazione.** Un docente, una macchina alla volta (ADR-19):
   chi apre il file vede tutto.
5. **Errori: codice più frase.** Otto `Codice` in `contract/contract.ts`
   (`ingresso-non-valido`, `non-trovato`, `rifiutato`, `conflitto`,
   `non-disponibile`, `procedura-sconosciuta`, `non-permesso`, `interno`) per
   chi deve reagire; frasi nei cataloghi (ADR-38) per chi legge. Uno nuovo si
   aggiunge quando qualcuno deve reagire diversamente. Il pannello riceve solo
   le frasi (`aEsitoAzione()`).
6. **Strati imposti da ESLint, non da pacchetti.** `no-restricted-imports` per
   cartella in `eslint.config.mjs`, più `npm run layers`. La CI
   (`.github/workflows/verifica.yml`) li fa girare a ogni push.
7. **Calcoli sincroni del pannello vs letture RPC.** Il pannello webview
   renderizza in modo sincrono attingendo alle funzioni pure di `core/dominio/`
   (`matriceCorso`, `riparazioni`, ecc.) applicate a `stato.registro`. Questo
   preserva la reattività immediata dell'interfaccia senza flicker o latenze
   IPC; le procedure RPC corrispondenti (`corso.presenze`, `registro.integrita`)
   restano il punto d'accesso strutturato per client esterni, CLI e assistente.

## Vincoli intoccabili

Quelli che non stanno già in un ADR, più i più gravi, in una riga:

| Vincolo | Perché |
| --- | --- |
| Segnaposto `{allievo}`, `{{allievo}}`, `tabella: allievi` | contratto con modelli ed e-mail degli utenti |
| Nomi delle colonne di serie nei `tabella:` dei modelli | i modelli le cercano per nome |
| `DOCUMENTO_SCHEDE_PRIMA` (`core/dominio/lexicon.ts`) | riconosce le stampe vecchie delle schede personali |
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
