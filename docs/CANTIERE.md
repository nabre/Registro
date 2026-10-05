# Il cantiere

Il tavolo di lavoro: solo le voci aperte, per area. Una voce chiusa si
cancella (la storia sta in git); una decisione presa migra in
[DECISIONI.md](DECISIONI.md).

**Regola del file:** una voce si chiude quando il lavoro è **fatto e
verificato** — `npm run ci -- --solo verifica` verde (tipi, stile, prove e
controlli statici; skill `verifica`). Non prima.

## 1. Regole di lavoro

| # | Regola |
| --- | --- |
| D1 | Il lavoro largo procede a **giri di sciame**: esplorare in parallelo, verificare in modo avversariale, applicare su perimetri disgiunti; un giro alla volta, leggendo il risultato prima del successivo (skill `sciame`). |
| D2 | **Nessun cambiamento di comportamento non richiesto**: riordini e rimozioni lasciano verdi tutte le prove senza toccarle. Una prova da cambiare è il segno che il comportamento è cambiato. |
| D3 | I difetti si correggono prima di riordinare le cartelle. |
| D4 | La riga di comando è un cliente del condotto: non importa il codice interno, chiede tutto a `$elenco` e `$schema`. |
| D5 | Un riordino delle cartelle si scrive prima come mappa «da → a» (ARCHITETTURA § 11), poi `git mv` in un commit che non contiene altro. |
| D6 | Un export senza consumatori esterni **non si cancella se è vivo**: si rende interno. Si cancella solo quel che nessuno chiama, dopo che una prova l'ha confermato. |
| D7 | Le funzionalità si aggiungono dichiarandole (`definisci()`, schemi, nucleo, giornale), non cablandole. Le librerie si giudicano con i criteri di ADR-50. |
| D8 | Cinque strati: `core/`, `contract/`, `desktop/`, `ui/`, `cli/` ([ARCHITETTURA.md](ARCHITETTURA.md)). |
| D9 | `contract/` ha la forma di tRPC senza tRPC: `router()`, `chiamante()` tipizzato, `Link`. |
| D10 | La riga di comando resta nuda: solo moduli `node:`, nessuna dipendenza, nessuna build. |
| D11 | `core/` diventa puro invertendo `apparato`, non riscrivendo (ARCHITETTURA § 3). |
| D12 | `core/` importa da `contract/` solo tipi. |
| D13 | Le regole degli strati le verifica `npm run layers`. |
| D14 | I nomi dicono il ruolo, non un prodotto (`apparato`, non `vscode`): ADR-02. |

## 2. Lavoro aperto

### Archivio e sincronizzazione

- [ ] Due PC sullo stesso `.regi`: con il file cambiato fuori, `salva` fa
      `rifai` di tutte le voci in memoria (`core/dati/package.ts`, «chi salva
      per ultimo copre») e cancella il lavoro dell'altro, anche in collezioni
      non toccate. Proposta: riaprire dal disco e riapplicare solo le
      collezioni pendenti; conflitto sulla stessa collezione → copia accanto e
      avviso. Decisione strutturale (ADR-19): da scrivere in DECISIONI prima.
      Analisi del 2026-10-01: nessuna libreria (SQLite, CRDT, Dexie) lo
      risolve senza rompere ADR-17; la fusione per collezione sì, con le voci
      `data/<collezione>` già separate e le patch che dicono che cosa è stato
      toccato. Prove per proprietà: due scrittori interlacciati non perdono
      mai una collezione senza conflitto.
- [ ] Copie materializzate (`core/dati/store.ts`, PDF con dati di minorenni):
      ora in `%LOCALAPPDATA%\Regiklass` (`cartellaCopieUri`) e ripulite
      all'avvio. Resta: guida, sezione «Dati sensibili sul computer» (chi vede le copie, quando
      spariscono, cancellazione non sicura senza BitLocker, Acrobat tiene le
      sue); portabile su chiavetta FAT/exFAT o cartella di rete = cartella dati
      leggibile da altri: avviso al primo avvio.
- [ ] Dopo la spinta a differenze (`ui/statePatches.ts`) il costo resta il
      ridisegno della pagina intera (ADR-06): `misure.spec.ts` voti 52–56 ms,
      di cui ~44 già senza dati nuovi. Per scendere: isole o ridisegni
      parziali. Differenze scartate → stato intero un giro dopo la risposta.
- [ ] Indice del 1/10 che non tornava: corretti il temporaneo comune di
      `rifai` (ora per processo), il controllo prima di accodare (indice
      intero, non 22 byte) e la serratura (non si copre quella viva di un
      altro processo, si toglie solo la propria), con prove in
      `tests/data/twoPrograms.test.mjs`. La sequenza resta probabile. Resta:
      nessuna esclusione fra processi fra controllo e scrittura in
      `accodaSe`; `core/dati/years.ts` `scriviJsonUri` usa ancora un `.tmp`
      comune (la prova `yearsMigration` ne fissa il nome); un dev aperto «lo
      stesso» non tiene la serratura; `.pid-n.tmp` orfani se un processo
      cade. ADR-19 dice che `chiLoTiene` ignora la serratura della stessa
      macchina, il codice solo se il processo è morto: allineare il testo
      con la regola nuova.


### Rilascio e aggiornamenti

- [ ] Lingua nell'installatore NSIS (`os/windows/installer.nsh`,
      `displayLanguageSelector`) provata solo con estratto `makensis`. Da
      provare con installatore vero: selettore visibile, primo avvio nella
      lingua scelta, aggiornamento muto senza dialogo, installazione «per
      tutti» con altro account amministratore (file nel suo `%APPDATA%`).
      Selettore a bandierine del benvenuto non visto a schermo: `npm run dev`.
      Da decidere dopo la prova: disinstallatore nella lingua di Windows, non
      in quella scelta (`MUI_LANGDLL_REGISTRY_*` + `MUI_UNGETLANGUAGE` in
      `customUnInit`, ma allora serve `MUI_LANGDLL_ALWAYSSHOW`); con «per
      tutti» il rilancio elevato rifà `.onInit` e ripropone il selettore.
- [ ] Aggiornamento su macOS e Linux mai provato dal vero: primo rilascio con
      lavoro `mac` (arm64 + `macos-15-intel`, `latest-mac.yml` fuso con `yq`)
      da guardare in Actions; poi a mano, da una versione alla successiva,
      `.app` in Applicazioni (Apple Silicon e Intel: scarico, scambio di
      `os/macos/aggiornamento.sh`, riapertura), AppImage, `.deb` e `.rpm`
      (password di `pkexec`). Il diario del Mac sta in
      `$TMPDIR/registro-aggiornamento-*/diario.txt`.


### Riordino

Giro di esplorazione del 2026-10-01 (5 dimensioni, sola lettura). I bug veri
trovati sono stati corretti subito; qui restano i lotti a comportamento
invariato, in ordine. Ogni lotto: mappa in ARCHITETTURA § 11, poi un commit.

- [ ] Dati dei rapporti (`core/dominio/reportData/`): helper comuni per
      righe ripetute (pendenze, check, comportamento, scaletta, cella
      recupero, media e nota, comunicazioni, `dataDiIstante`).
- [ ] Normalizzazione (`core/dominio/normalization/`): helper
      `testi()`/`riferimenti()` per `elenco(x).map(testo).filter(Boolean)`
      (gli id in lista oggi non si ripuliscono come `riferimento`: D2,
      cambia il comportamento).
- [ ] Rapporti per genere in una tabella sola (modello, entità, `dati*`) letta
      da `rapporto.genera`, anteprima dei modelli, pacchetto del corso e
      prove: oggi 4 copie, una era rotta (anteprima del diario).
- [ ] Regole di integrità scritte una volta con due usi (diagnosi e
      riparazione): `integrity.ts` segnala consegne e spunte di un'ora
      d'altro corso, `repairs.ts` non le ripara.
- [ ] «Chi cita questa lezione» riscritto 5 volte (`courses.ts`
      `lezioneCompilata`, `timetable.ts`, `azioni/hours.ts`, `deletions.ts`,
      riparazioni): una `citazioniDellaLezione` con filtri; dire se la scadenza
      conta (oggi `lezioneCompilata` no, le altre sì).
- [ ] «Voto scritto» in due varianti (`valore !== null || assente` contro
      `valore !== null`): il cestino e `eliminaOrfane` contano diverso.
- [ ] 7 copie di «file da `azione.file`» in `core/azioni/` con estensione non
      in minuscolo e ripieghi diversi: `fileDaPercorso` in `context.ts`.
- [ ] `suVoce` riscritto a mano nelle consegne e in `classTeacher.ts`.
- [ ] Guardie ancora senza rimedio: `contract/procedure/check/common.ts`
      `esigiLezioneDelCorso` (e `esigiAllievoDelCorso`), `classe/common.ts`
      `esigiBlocco`, `esigiComunicazione`.
- [ ] Rifiuti «non trovato» con e senza codice (~63 contro ~31): uniformare
      cambia l'uscita della CLI, decidere prima (D2).
- [ ] Pannello: componente `casellaSpunta` (check, consegne, docente di
      classe) e `grigliaDiClasse` (check, matrice, appello) con CSS comune
      (`.check__telaio` = `.matrice__telaio` = `.appello__telaio`); colori
      positivi già divergenti.
- [ ] «Segna/togli tutti» di una consegna per tre strade: nella modale «togli
      tutti» non chiede conferma e ignora i fogli raccolti (D2: decidere).
- [ ] Finestre native: stessa ricetta in 5 posti (`menu.ts`,
      `desktop/shell/windows/welcome.ts`, `reader.ts`, `dialogs.ts`,
      `windows.ts`) → fabbrica unica.
- [ ] Monte ore del corso fra due date: `corso/presenze.ts`,
      `persone/scheda.ts`, `persone/assenze.ts` lo rifanno accanto a
      `matriceDelCorsoNelPeriodo`.
- [ ] Prove: attesa a condizione copiata in 8 file con tempi diversi
      (`helpers/attese.mjs`); contatore di parentesi in 5 strumenti/prove che
      non salta stringhe (usare l'AST come `i18n.mjs`).
- [ ] Cartelle tematiche: `core/dominio/` calendar/, people/, reporting/;
      `core/dati/` microsoft/, pdf/ (oltre a llm/, sotto).

- [ ] `ui/state.ts` in tre: store, posto, selettori di dominio
      (~60 selettori). Mappa «da → a» prima (D5).
- [ ] Stato fuori da `stato`: `let` di modulo in ~42 file di `ui/` (es.
      `languageModels.tsx`, `assistant/chat.tsx`, `help.tsx`), ognuno da pulire a
      mano al cambio di documento (`main.tsx`: `scordaEditorDelPiano`…).
      Censirli con `census` o una regola ESLint.
- [ ] La normalizzazione scrive testi nella lingua di chi apre
      (`core/dominio/normalization/readers.ts`, `titolo: testo(dati.titolo,
      Uno(lessico().corso))`): un predefinito per lingua non va nel documento.
- [ ] Codice del renderer in un solo strato: `desktop/shell/pages/` → una
      cartella nuova sotto `ui/` (benvenuto, avvio, lettore, impostazioni, dialogo,
      `shared/`), accanto al pannello; non `pages/`, che si confonde con
      `ui/pages.ts`. Le pagine native stanno in `desktop/` pur girando nel
      renderer. Toccano:
      `esbuild.mjs` (`PAGINE_NATIVE`, ingressi), `desktop/shell/windows/*`
      (percorsi HTML in `dist/`), `tools/layers.mjs` (regole `ui/**`), docs
      ARCHITETTURA §§ 2, 11. Prima mappa «da → a» in ARCHITETTURA § 11 (D5),
      poi `git mv` in commit a sé; `npm run layers` deve restare verde.

- [ ] `core/dati/` per temi: il gruppo dei modelli (`gguf`, `ggufName`,
      `huggingFace`, `kit`, `llamaCpp`, `llm`, `recommendedModels`, `mtmd`,
      `nodeLlama`, `visionKit`) in core/dati/llm/. ~27 import, più
      `tools/recommendedModels.mjs` e le `importaSorgente` delle prove: mappa
      in ARCHITETTURA § 11 prima.
- [ ] File oltre 1200 righe da dividere per responsabilità, con re-export
      dove molti importano: `ui/state.ts` (le selezioni),
      `desktop/transports/conduit.ts` (permessi, metodi),
      `core/dominio/reports.ts` (misure e tabelle),
      `core/dominio/projection.ts` (il calendario).
- [ ] ~170 percorsi del vecchio assetto nei commenti (domain/, actions/,
      src/), che `npm run docs` non vede perché
      non hanno un prefisso di oggi. I più colpiti: `contract/protocol.ts`,
      `desktop/transports/assistant.ts`, `core/dominio/models.ts`.
- [ ] Frecce nelle griglie: cinque viste usano già
      `ui/components/gridArrows.ts`; resta fuori `spostaFuoco`
      (`views/assessments/grades.tsx`, con finestra virtuale).
- [ ] Tasti del gruppo radio ripetuti: `dove()` in
      `core/controlli/control.tsx`, `views/settings.tsx`, `components/base.tsx`.
- [ ] `tools/mail-probe.ps1` porta di serie un indirizzo personale e un id di
      tenant reale: parametri senza valori di serie?

### Prove

- [ ] `tests/proprieta/storia.test.mjs` «annullare un gesto rimette lo stato
      di prima…» cade di rado: `PROPRIETA_SEME=153678895
      PROPRIETA_ESECUZIONI=4000` lo riproduce (anche prima dei lotti). Dopo
      annulla/ripristina manca un allievo dal nome vuoto aggiunto dopo
      `rinomina` a `" "` e `filtraClassi`. Capire se è la storia o la prova.
- [ ] Instabili sotto carico (da sole passano): `tests/api/importClass.test.mjs:230`
      «il documento d'origine resta com'era» (un `.tmp` atteso manca); «la
      convalida dell'input › le risposte tornano nell'ordine dei tasti»;
      `tests/interfaccia/movimento.spec.ts:58` (scorrimento della Guida 404
      invece di 400); `electron.spec.ts` in timeout con un Regiklass aperto.
- [ ] Le viste di `ui/` si provano su Chromium (`tests/interfaccia/`), che
      `npm run copertura` non vede: funzioni al 13%. Misurarle o accettarlo.
- [ ] Mutanti sopravvissuti (misura di prima, `deletions.ts` 87%,
      `calculations.ts:330-735` 97,7%): piano eliminato senza prova che
      dichiari `lezioni` (~:755); guardie `n > 0` delle perdite (~:343-413: una
      perdita a zero non deve comparire); `calculations.ts` ~:344 (lezione
      senza appello nei dati di prova). Rimisurare con `npm run mutanti`.
- [ ] In locale gira Node 26.7, il progetto e la CI chiedono Node 24: `npm ci`
      e le prove vanno ripetute con la versione giusta.
- [ ] `tests/interfaccia/calendarEditor.spec.ts`: due prove in `test.fixme`
      («Ctrl+D non copia un’ora ancorata», «Canc due volte»), cadono anche sul
      codice di prima della conversione a React: la prima non ancora l'ora
      all'ICS, la seconda non risponde alla conferma dell'eliminazione.
- [ ] Progetti integrati nei corsi: manca la prova API di `materia.unisci`
      (due integrazioni che si fondono) e `classe.duplica` (integrazione nuova
      sullo stesso progetto).

### Audit del 2026-10-02

Cinque aree in sola lettura (report: artefatto «Audit tecnico Regiklass»).
Verificati a mano i primi otto.

- [ ] Aggiornamenti Windows senza verifica dell'editore: `publisherName` in
      `electron-builder.json` con SignPath, `Get-AuthenticodeSignature` in
      `aggiornamento.ps1`; fino ad allora dirlo in SECURITY.md.
- [ ] `core/dati/opening.ts`: lista bianca delle estensioni apribili al posto
      di `ESEGUIBILI` (mancano `chm`, `ws`, `jnlp`, `mht`…); `Zone.Identifier`
      sulle copie materializzate.
- [ ] `core/dati/store.ts` `materializza`: decomprime prima del CRC; leggere
      dopo il confronto, dentro la fila. `voce.bytes` mai liberati.
- [ ] Performance: agenda annuale senza `content-visibility`/virtualizzazione;
      `core/dati/kit.ts:279` estrazione sincrona; soglia di `rifai`
      (`package.ts`) che conta gli allegati.
- [ ] Accessibilità: fuoco perso nell'appello (Invio/Esc, `lesson/attendance.tsx`);
      apice 15 px (< 24); titolo-selettore con controlli dentro `h2` e
      `change` sulle frecce; linguette strumenti senza `aria-pressed`;
      dialogo nativo senza `listbox`/`combobox`/`role=alert`; axe non apre
      modali né finestre native.
- [ ] CSS: codice morto (`barra-stato__filtro/__tendina`, `documenti__cella…`,
      `scelta-giorni`, `barra-comandi__pagina`, `elenco-materie`); bianco fisso
      su `.livello-progetto`; freccia dei `select` duplicata con colori a
      mano.
- [ ] Minori: fuses `onlyLoadAppFromAsar`/`grantFileProtocolExtraPrivileges`;
      `REGISTRO_SVILUPPO` nel pacchetto; `shell.openPath` senza guardia
      (`desktop/apparato/commands.ts:73`, `dialogs.ts`); `switch-exhaustiveness-check`;
      `core/dominio/calendar.ts:273` `fasce[0]`; storia di `conversation.ts:200` non
      convalidata.

### Giro del 2026-10-05

Otto esplorazioni (conversione React, funzioni recenti, limiti, docs). Gli
alti e i medi sono corretti; qui restano le scelte e i bassi.

- [ ] `progetti.compito.elimina` porta via anche gli inizi in ore svolte,
      `togliInizio` (`core/azioni/projects.ts`) lo rifiuta: stessa regola o
      avviso (D2: decidere).
- [ ] `progetti.salva` con `corsoId` (chiamante di prima di v7): il campo
      cade in silenzio e il progetto nasce non integrato. Integrare o
      avvisare.
- [ ] Eliminando un anno, i progetti integrati solo nei suoi corsi restano
      con zero integrazioni (`core/dominio/deletions.ts`): toglierli o
      dirlo fra gli staccati.
- [ ] Normalizzazione: `conCorsoVero` (`normalization/register.ts`,
      `projects.ts`) con due integrazioni dello stesso progetto sullo stesso
      corso superstite tiene la prima e perde compiti, giudizi e celle
      dell'altra; fondere come `fondiIntegrazione`.
- [ ] Supplenza: lo zip con foto e nomi resta in `cartellaDocumento()`
      (spesso OneDrive) dopo l'invio; il foglio delle foto mette
      `allievo.azienda` sotto ogni foto, dato in più per un supplente. Due
      supplenze lo stesso giorno senza orario e per le stesse classi hanno
      ancora lo stesso nome.
- [ ] Allievi omonimi nella stessa classe hanno la stessa collocazione
      (`core/dominio/locations.ts`, cartella e scheda): la seconda copre la
      prima. `distinzione()` come per prove e progetti, ma cambia i percorsi
      dei documenti già scritti: serve un passo che sposti.
- [ ] Eventi ICS con lo stesso UID alla stessa ora danno la stessa `key`
      React (`views/calendar/week.tsx`, `month.tsx`, `agenda.tsx`):
      deduplicare in `core/dominio/calendarIcs.ts`.
- [ ] ESLint senza `react/jsx-key`: oggi nessuna chiave manca (scansione
      AST), ma niente lo impedisce. `eslint-plugin-react` (ADR-50) o regola
      locale.
- [ ] Minori React: `views/classTeacher.tsx` ridisegna due volte allo
      scorrimento (`useFinestra` più `virtuale`); classi del bersaglio di
      trascinamento messe con `classList` su nodi di React
      (`views/sorting.tsx`, `sorting/pageDrop.tsx`), innocuo finché il
      `className` non cambia durante il volo.

### Modelli e assistente

- [ ] Le scansioni senza programma esterno, il giorno in cui `node-llama-cpp`
      accetta immagini: via `mtmd.ts` e `ocr.programma`.

### Rilascio, firma, nome

- [ ] SignPath (differito): domanda come Regiklass (progetto `regiklass`); 2FA; app GitHub;
      configurazioni `eseguibile` e `installatori`; politica
      `release-signing`; segreto e variabile su GitHub (GUIDA § «La firma del
      codice»).
- [ ] Prima release firmata: togliere l'avviso SmartScreen dal README e «quando
      la firma sarà attiva» da SECURITY.
- [ ] Sei pacchetti MIT di produzione senza file LICENSE (`npm run licenze` li
      elenca): `@reflink/reflink`, `@reflink/reflink-win32-x64-msvc`,
      `simple-git`, `@simple-git/args-pathspec`, `@simple-git/argv-parser`,
      `lazy-val`. L'avviso MIT va portato nel pacchetto per altra via.

### Ora conclusa

Lo stato persistito resta `svolta`/`pianificata`: a schermo «Conclusa» e
«Modificabile». Rinominare le chiavi vorrebbe un passo di formato (skill
`formato`).

- [ ] `lezione.salva` (`ore.salva`, modulo della lezione nel calendario) riscrive
      l'ora intera anche se conclusa: `aOraAperta` non la copre perché serve a
      orario e aula. Decidere se tenere il contenuto di prima su un'ora conclusa.
      Consegne, riconsegne e voti non portano `lezioneId`: bloccati solo nel
      pannello.

### PDF e documenti

- [ ] Visualizzazioni proposte e non fatte: barre della % di assenza per
      persona con la soglia; presenze per mese; andamento dei segni +/−;
      avanzamento del check per colonna; livelli dei progetti nel tempo;
      andamento con più corsi (una linea per corso).
- [ ] Scheda del corso: il quadro per persona conta i ritardi (matrice), non
      i minuti per UD; i segni escono «+1 / -1» col trattino ASCII. Le date
      dei piani contano anche le ore pianificate. Scritte delle colonne
      nuove da rivedere a vista.

- [ ] «Aggiorna tutto» e il rifacimento automatico compongono i PDF con pdf-lib
      sul thread principale, e «Aggiorna tutto» tiene la fila delle scritture
      per tutto il giro: le altre scritture escono «occupato» dopo 30 s. Una
      pausa fra i fogli non basta (ogni foglio già cede); serve la
      composizione in un utility process o worker. Decisione strutturale.
- [ ] Ogni foglio automatico si materializza su disco (`scriviGenerato` →
      `uriArchivio`) anche se nessuno lo apre: I/O e CRC sprecati.
- [ ] Nel `.regi` restano le esportazioni coi nomi di prima (id nel nome,
      «1° sem.» e «1° semestre»): su un registro vero 470 voci che nessun dato
      cita, e percorsi oltre i 260 caratteri che Esplora risorse non estrae.

### Attese e blocchi

- [ ] Accesso Microsoft nel browser: nessun **Annulla** nella notifica
      d'avanzamento (oggi si ripreme e il nuovo sostituisce il vecchio). Va
      con l'azione nelle notifiche.
- [ ] Il filo d'attesa resta acceso per tutta l'attesa del browser (fino a
      5 min): sembra un blocco. Toglierlo dal conto è scelta di comportamento.

### Da provare a mano

- [ ] Interfaccia in React (ADR-56, 2026-10-05): provare a mano sull'app vera
      quel che Chromium headless non vede bene: trascinare e allungare un'ora
      nel calendario, trascinare pagine in Da smistare e sui fogli dell'archivio,
      la firma (`contenteditable`), le mappe, le miniature dei PDF, la dettatura.
      Confermare o rimettere tre cambi di comportamento (PIANO-REACT § 11):
      spunte del calendario ufficiale che restano, conto dei giorni delle pause
      sulle date nuove, notifiche un fotogramma dopo.

- [ ] Progetti (biblioteca, `pagina.progetti`) e Integrazione progetti
      (`pagina.corso.integrazione`): integrare dal menu e dalla biblioteca,
      stato nel corso, «Togli dal corso» con la conferma, «Programma in un
      piano…» dalla scaletta, compiti/matrice/esiti per corso; un documento
      v6 si apre con i progetti integrati nel loro corso. Facoltativo: vista
      propria `integrazioneProgetti` nel contratto (oggi condivide `progetti`
      con `ambitoProgetti`).
- [ ] Con un anno aperto, «Crea un nuovo anno…» (benvenuto o vassoio) apre
      il modulo «Nuovo anno scolastico» del pannello: il ramo
      `dialogo: 'nuovoAnno'` di `ui/main.tsx` non ha una prova automatica.
- [ ] Proiezione in pausa (ora, data, marchio, versione): nessuna prova la
      disegna.
- [ ] Barra di stato: la scritta corta del secondo tag («2 di classe», de «der
      Klasse», fr «de classe», en «for the class») è da confermare.
- [ ] Registro grande su OneDrive con «PDF automatici: sempre»: un caricamento
      nella matrice dei documenti fa un salvataggio solo a fine giro di PDF
      (prima uno per foglio: 24 in 36 s, +6,6 MB), e l'azione non resta appesa.

- [ ] Avvio con il documento aperto su un altro PC (serratura): la domanda
      «aperto altrove» sta davanti, il riquadro d'avvio si nasconde e torna
      dopo la risposta; «No» non fa uscire il programma a metà.
- [ ] PDF aperto in Acrobat, poi dati cambiati: anteprima e lettore mostrano
      la versione nuova (copia `X (2).pdf`), non la vecchia.

- [ ] Semestri senza nome scrivibile: modulo anno (nuovo e modifica) con sole
      date «1° semestre: inizio/fine», «2° semestre: fine»; tendina Periodo,
      calendario anno/mese/settimana («fine 1° sem.»), piani, impostazioni anno
      nelle quattro lingue; documento vecchio con nomi propri li perde senza
      errori.
- [ ] Impostazioni › Calendario › Chiusure › Calendari ufficiali: si apre, selettore
      con tutti gli anni (clic e frecce), di serie quello in corso con
      pastiglia, scelta tenuta nei ridisegni, tabella chiusure compatta chiaro/scuro e su
      colonna stretta; clic sul PDF apre il browser di sistema, non una
      finestra Electron vuota; titoli, tipi e guida tradotti in de/fr/en (nomi
      chiusure e fonte restano in italiano: sono dati); Guida › «Calendari
      ufficiali» porta a Impostazioni.
- [ ] Logo in alto a sinistra (pannello e finestre native): in mezzo alla
      colonna delle icone con navigazione larga e stretta, fermo con `npm run
      dev`/`start` (segno DEV/START accanto), nessun lampo ai ridisegni, nessuna
      immagine rotta all'avvio.
- [ ] Barra di stato, lettura delle scansioni accesa senza `llama-mtmd-cli` o
      con il file del modello/proiettore spostato: «non pronta» arancione, il
      titolo dice il motivo, il clic apre Impostazioni › Programma › Assistente e modelli.
- [ ] Barra del titolo propria su benvenuto, impostazioni, dialoghi (anche
      «versione più recente» all'avvio), lettore PDF: logo, titolo, trascinare,
      doppio clic, pulsanti di sistema; cambio tema chiaro/scuro a finestra
      aperta; Windows, macOS (semafori, dialogo modale come foglio senza
      barra), Linux X11 e Wayland; `[DEV]` con `npm run dev`.
- [ ] Nessun menu predefinito di Electron: finestra «versione più recente»
      all'avvio, dialoghi, benvenuto, impostazioni, lettore, proiezione (anche
      premendo Alt); su macOS copia/incolla funzionano.
- [ ] «Disinstalla…» su macOS, AppImage, portabile, Windows installato.
- [ ] Prima release con il lavoro `linux` di `rilascio.yml`: nella release
      AppImage, `.deb` e `.rpm`; l'AppImage si apre, `.deb` su Ubuntu e `.rpm`
      su Fedora si installano con voce nel menu, icona e doppio clic su un
      `.regi`; assistente con llama.cpp Vulkan o CPU.
- [ ] Ora conclusa in sola lettura (`aOraAperta`): nel pannello avviso con
      **Riapri**, schede spente senza hover né fumetti, linguette degli
      strumenti vive.
- [ ] «Conclusa» spenta prima della fine dell'ora; «Annullata» spenta su
      un'ora compilata, domanda sul piano su una vuota con piano.
