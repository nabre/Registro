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


### Rilascio e aggiornamenti

- [ ] Aggiornamento su macOS e Linux mai provato dal vero: primo rilascio con
      lavoro `mac` (arm64 + `macos-15-intel`, `latest-mac.yml` fuso con `yq`)
      da guardare in Actions; poi a mano, da una versione alla successiva,
      `.app` in Applicazioni (Apple Silicon e Intel: scarico, scambio di
      `os/macos/aggiornamento.sh`, riapertura), AppImage, `.deb` e `.rpm`
      (password di `pkexec`). Il diario del Mac sta in
      `$TMPDIR/registro-aggiornamento-*/diario.txt`.


### Impostazioni

Riordino di [PIANO-IMPOSTAZIONI.md](PIANO-IMPOSTAZIONI.md) fatto (fasi 0–6). Pendenze:

- [ ] Condotto: `schemaDiUnaScritturaConcessa` e il ramo «scrittura senza
      lettura» di `desktop/transports/conduit.ts` ora solo dallo scavalco
      `permessi` delle prove: togliere o tenere, dopo una prova.
- [ ] Rimando nel posto con `#voce`: ogni rimando fa una voce di storia a sé.
- [ ] CSS orfano: `year.css` `.anno` (già orfana prima).
- [ ] Azione vera `posta.azzera`: oggi «Azzera» in Utente › Account compone
      `posta.scollega` + `programma.azzera` e lascia la cache indirizzi/tenant di
      `azzeraOauth`.
- [ ] ICS: «Sfoglia…» per l'origine file. Chiede `calendario.modifica` con
      origine vuota che apre il dialogo: cambio di procedura (contract/,
      `resources/tools.json`).
- [ ] `ui/pannello/components/notifications.ts` senza azioni: `annullabile.ts` copia il
      nodo. Meglio un parametro `azione` nelle notifiche.


### Riordino

- [ ] Regola della lingua dei nomi di file: non scritta. Convivono inglese
      (`views/check.ts`, `core/dati/sorter.ts`) e italiano
      (`components/annullabile.ts`, `contract/centralino.ts`). Prima un ADR
      (per esempio «i moduli nuovi in italiano, gli esistenti restano»), poi
      eventuali rinomine a lotti.
- [ ] `core/dati/` per temi: il gruppo dei modelli (`gguf`, `ggufName`,
      `huggingFace`, `kit`, `llamaCpp`, `llm`, `modelliConsigliati`, `mtmd`,
      `nodeLlama`, `visionKit`) in `core/dati/llm/`. ~27 import, più
      `tools/modelliConsigliati.mjs` e le `importaSorgente` delle prove: mappa
      in ARCHITETTURA § 11 prima.
- [ ] File oltre 1200 righe da dividere per responsabilità, con re-export
      dove molti importano: `core/dominio/normalization.ts` (impostazioni;
      consegne/check/smistamenti), `core/dominio/reportData.ts` (`datiAllievo`,
      `datiFascicolo`), `ui/pannello/state.ts` (le selezioni),
      `contract/protocollo.ts` (assistente, dettatura, scarico),
      `ui/pannello/commands.ts` (`COMANDI_UI` per gruppo),
      `desktop/transports/conduit.ts` (permessi, metodi),
      `core/dominio/reports.ts` (misure e tabelle),
      `core/dominio/projection.ts` (il calendario).
- [ ] ~170 percorsi del vecchio assetto nei commenti (`domain/`, `actions/`,
      `src/`, file di `ui/` senza `pannello/`), che `npm run docs` non vede perché
      non hanno un prefisso di oggi. I più colpiti: `contract/protocollo.ts`,
      `desktop/transports/assistant.ts`, `core/dominio/models.ts`.
- [ ] Frecce nelle griglie: `frecceNellaGriglia` (`views/check.ts`) e
      `spostaFuoco` (`views/assessments/grades.ts`, con finestra virtuale) si
      somigliano; un aiuto comune in `components/table.ts` se ne arriva una
      terza.
- [ ] Tasti del gruppo radio ripetuti: `dove()` in
      `core/controlli/controllo.ts`, `views/settings.ts`, `components/base.ts`.
- [ ] `tools/screenshotDocs.mjs` e `tools/mail-probe.ps1` senza rimandi: una
      riga in GUIDA.

### Prove

- [ ] `tests/proprieta/migrazioni.test.mjs` «portato e normalizzato, una seconda
      normalizzazione non cambia niente» cade a caso: seme `-2101211184`,
      controesempio `impostazioni.scala.min = {"toString": null}`. Normalizzazione
      della scala non idempotente su oggetti strani. Riprodurre col seme, correggere
      in `core/dominio/validation.ts`.
- [ ] Le viste di `ui/pannello` si provano su Chromium (`tests/interfaccia/`), che
      `npm run copertura` non vede: funzioni al 13%. Misurarle o accettarlo.
- [ ] Mutanti sopravvissuti (misura di prima, `deletions.ts` 87%,
      `calculations.ts:330-735` 97,7%): piano eliminato senza prova che
      dichiari `lezioni` (~:755); guardie `n > 0` delle perdite (~:343-413: una
      perdita a zero non deve comparire); `calculations.ts` ~:344 (lezione
      senza appello nei dati di prova). Rimisurare con `npm run mutanti`.
- [ ] In locale gira Node 26.7, il progetto e la CI chiedono Node 24: `npm ci`
      e le prove vanno ripetute con la versione giusta.

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

- [ ] «Aggiorna tutto» e il rifacimento automatico compongono i PDF con pdf-lib
      sul thread principale, e «Aggiorna tutto» tiene la fila delle scritture
      per tutto il giro: le altre scritture escono «occupato» dopo 30 s. Una
      pausa fra i fogli non basta (ogni foglio già cede); serve la
      composizione in un utility process o worker. Decisione strutturale.
- [ ] Ogni foglio automatico si materializza su disco (`scriviGenerato` →
      `uriArchivio`) anche se nessuno lo apre: I/O e CRC sprecati.
- [ ] `accorciaNome` taglia a 150 caratteri: su un nome lungo toglie anche il
      « (2)» della bozza gemella, e due piani finiscono sullo stesso file.
- [ ] `togliDoppioni` salta le bozze (`finisceConBozza`): un doppione vecchio
      della prima bozza resta nel documento, indistinguibile dalla gemella.

### Attese e blocchi

- [ ] Accesso Microsoft nel browser: nessun **Annulla** nella notifica
      d'avanzamento (oggi si ripreme e il nuovo sostituisce il vecchio). Va
      con l'azione nelle notifiche (§ Impostazioni).
- [ ] Il filo d'attesa resta acceso per tutta l'attesa del browser (fino a
      5 min): sembra un blocco. Toglierlo dal conto è scelta di comportamento.
- [ ] A ogni scrittura il pannello riceve il registro intero e ridisegna
      (`desktop/pannelli/panel.ts`): profilare su un registro grande prima di
      passare alle differenze.
- [ ] Ricerca OneDrive fermata dal tetto di 20 s: la modale dice «Sono troppi
      per mostrarli tutti.», imprecisa quando il motivo è il tempo.

### Check

- [ ] Ora conclusa: il check dell'ora è tutto spento, anche **Cambia la
      data…** e **Togli la spunta** di spunte d'altri giorni, che l'host
      permette (e la pagina Check pure). Decidere se lasciarli vivi.
- [ ] Doppio clic su una casella vuota = spunta e subito tolta (voluto e
      provato in `check.spec.ts`): chi fa doppio clic d'abitudine vede la
      casella «non prendere». Chiedere prima di cambiarlo.

### Da provare a mano

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
