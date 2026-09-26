# Il cantiere

Il tavolo di lavoro: solo le voci aperte, per area. Una voce chiusa si
cancella (la storia sta in git); una decisione presa migra in
[DECISIONI.md](DECISIONI.md).

**Regola del file:** una voce si chiude quando il lavoro è **fatto e
verificato** — `npx tsc --noEmit` pulito, `npx eslint .` senza errori,
`npm test` verde (skill `verifica`). Non prima.

## 1. Regole di lavoro

| # | Regola |
| --- | --- |
| D1 | Il lavoro largo procede a **giri di sciame**: esplorare in parallelo, verificare in modo avversariale, applicare su perimetri disgiunti; un giro alla volta, leggendo il risultato prima del successivo (skill `sciame`). |
| D2 | **Nessun cambiamento di comportamento non richiesto**: riordini e rimozioni lasciano verdi tutte le prove senza toccarle. Una prova da cambiare è il segno che il comportamento è cambiato. |
| D3 | I difetti si correggono prima di riordinare le cartelle. |
| D4 | La riga di comando è un cliente del condotto: non importa `src/`, chiede tutto a `$elenco` e `$schema`. |
| D5 | Un riordino delle cartelle si scrive prima come mappa «da → a» (IMPIANTO § 7), poi `git mv` in un commit che non contiene altro. |
| D6 | Un export senza consumatori esterni **non si cancella se è vivo**: si rende interno. Si cancella solo quel che nessuno chiama, dopo che una prova l'ha confermato. |
| D7 | Le funzionalità si aggiungono dichiarandole (`definisci()`, schemi, nucleo, giornale), non cablandole; niente librerie nuove per questo. |
| D8 | Cinque strati: `core/`, `contract/`, `desktop/`, `ui/`, `cli/` ([IMPIANTO.md](IMPIANTO.md)). |
| D9 | `contract/` ha la forma di tRPC senza tRPC: `router()`, `chiamante()` tipizzato, `Link`. |
| D10 | La riga di comando resta nuda: solo moduli `node:`, nessuna dipendenza, nessuna build. |
| D11 | `core/` diventa puro invertendo `apparato`, non riscrivendo (IMPIANTO § 2). |
| D12 | `core/` importa da `contract/` solo tipi. |
| D13 | Le regole degli strati le verifica `npm run layers`. |
| D14–D16 | I nomi dicono il ruolo, non un prodotto (`apparato`, non `vscode`): ADR-02. |

## 2. Lavoro aperto

### Struttura (IMPIANTO)

- [ ] Passi 2–10 di IMPIANTO § 8: `ui/`, `contract/`, router + chiamante +
      link, `core/` (file e inversione), `desktop/`, `cli/`, vassoio e menu
      nativo su `chiamante(registro, diretto)`, poi le docs. A ogni passo:
      `esbuild.mjs`, `tsconfig.json`, `eslint.config.mjs`,
      `electron-builder.json`, `package.json`, `tests/helpers/`.
- [ ] Il router verifica che percorso e `nome` coincidano; dopo, in un passo
      suo, `nome` derivato dalla posizione.
- [ ] Agenda, vassoio e menu nativo chiamano in modi diversi, due senza
      giornale né codici d'errore: passano al link `diretto`.

### Riga di comando

- [ ] Spostarla fuori da `src/` e dividerla in comandi (IMPIANTO § 5).
- [ ] `aspetta`: oggi un condotto spento è un errore secco al primo `ENOENT`.
- [ ] `guarda`: seguire il giornale mentre il registro lavora.
- [ ] Prove per tutti i comandi oltre a quelle di
      `tests/cli/commandLine.test.mjs`, contro un condotto finto.
- [ ] Un tetto di tempo per richiesta, che tenga conto delle procedure che
      aspettano una persona (API § 7).

### API e letture

- [ ] `as const satisfies readonly T[]` non garantisce che ogni valore ci sia
      (`common/reports.ts`, `smistamento/assenze/assegna.ts`,
      `classe/common.ts`, `valutazioni/allegato/aggiungi.ts`): dove serve la
      completezza, `esaustivo`.
- [ ] Il giornale si legge solo in console (`startup.ts`): un file che ruota o
      una vista in Impostazioni.
- [ ] `Smistatore.assorbiCassettaVecchia()` (`src/data/sorter.ts`) scrive
      `smistamenti` fuori da `chiama()`, a ogni cambio di documento.
      L'azione `smistamento.cassetta.assorbi` va spezzata per file prima di
      instradarla (un PDF grosso supererebbe i 30 s della fila).
- [ ] Il pannello rifà da sé conti che hanno una lettura: `matriceCorso` in
      `src/ui/views/courses.ts` e `src/ui/views/student/attendance.ts` invece
      di `corso.presenze`; `riferimentiRotti`/`riparazioni` in `ui/shell.ts` e
      `ui/commands.ts` invece di `registro.integrita`.
- [ ] Letture che mancano: `ore.cruscotto` (l'ora da compilare, oggi
      `oraDaFare()` in `src/ui/state.ts`), `classe.pendenze` (`riepilogoTodo`),
      `valutazioni.orfane` (la lettura prima di `valutazione.eliminaOrfane`),
      `smistamento.daFare` (quarantena per classe).
- [ ] La spinta dello stato ricalcola `riferimentiRotti` a ogni scrittura
      (`src/panels/panel.ts:444`): una scansione intera, senza indice.
- [ ] Il pannello riceve il `Registro` intero a ogni scrittura: nessuna
      sottoscrizione parziale.
- [ ] Le letture che non elencano non hanno paginazione (`corso.presenze`,
      `valutazioni.voti`, `documenti.inventario`).
- [ ] Manca la prova che una lettura non faccia nascere un file sul disco.
- [ ] Quindici procedure che aprono un dialogo non hanno una controparte da
      script (API § 7); `smistamento.pdf.deposita` è il modello.
- [ ] `esigiClasse` in `classe/*` e `smistamento/*` non suggerisce
      `classi.elenco` come le altre guardie.
- [ ] `npm run collections` segnala `src/actions/system.ts` («dichiara corsi
      senza toccarli»): li tocca in un ciclo che lo strumento non vede; e 4
      voci da guardare in `src/data` (`filing.ts`, `sorter.ts`).
- [ ] L'errore «versione più recente» si riconosce dal testo
      (`fraseVersionePiuRecente`): servirebbe un errore strutturato da
      `data/archive.ts` e `data/package.ts` fino alla finestra.
- [ ] Da decidere, senza urgenza: un contratto unico (OpenAPI) oltre al JSON
      Schema per procedura; una versione di protocollo negoziata; transazioni su
      più procedure.

### Dominio: da decidere prima del codice

- [ ] Un allievo arrivato a metà anno riapre le prove passate
      (`src/domain/returns.ts`): contare solo chi ha una voce, o un gesto «non
      riguarda».
- [ ] Voto e assenza insieme (`valutazioni.voto.imposta`): il PDF stampa il
      voto. Rifiutare la coppia, o stampare «ass.».
- [ ] Medie di prove con scale diverse (`mediaAllievo`): almeno un avviso.
- [ ] Un'ora annullata e recuperata fuori orario (ADR-30): il recupero conta
      come ora in più, senza legame con quella che sostituisce.
- [ ] `votiDellaScala` con minimo 1 e passo 0,3 propone 6,1 (poi
      `arrotondaVoto` lo riporta a 6).
- [ ] I riferimenti vuoti: `''` → `null` non è uniforme (MODELLO-DATI § 10.2).
- [ ] Giro 1: 21 reperti medi e 8 bassi mai trascritti; un secondo passaggio
      sulle dimensioni che avevano reso di più.

### Robustezza

- [ ] L'arresto di Windows con il solo vassoio: nessuna finestra riceve
      `query-session-end`, `spegni()` non gira, la serratura resta. Cura: una
      finestra sentinella nascosta (cambia `window-all-closed` e
      `second-instance`).
- [ ] `Pacchetto.chiLoTiene` ignora la serratura della stessa macchina e utente:
      installato e portabile insieme non si avvisano. Serve un controllo del
      processo (pid vivo).
- [ ] L'eco delle proprie scritture nell'osservatore si riconosce per tempo
      (2,5 s): un cambiamento vero in quella finestra si perde.
- [ ] Gli acceleratori del menu nativo (Ctrl+O…) non consegnano il campo in cui
      si scrive: il guscio dovrebbe chiedere un `blur()` alla pagina.
- [ ] Moduli che rimandano la fotografia dell'apertura: `src/ui/forms/year.ts`
      (una `stato` locale ombreggia quella della pagina), recapito,
      comunicazione, blocco assenze.
- [ ] Chiavi che il condotto lascia cambiare: `modelli.cartella`,
      `ocr.modello`, `ocr.proiettore` (file di dati): proteggerle come gli
      eseguibili?
- [ ] Una scrittura rifiutata dopo `archiviaCopia` lascia la copia orfana
      nell'archivio.
- [ ] `Smistatore.smista` attende due volte prima di `posaInQuarantena` senza
      riguardare il documento; `aggiornaComposizioni` in `rapporto.completo`
      idem.
- [ ] `archiviaCopia` (`src/data/filing.ts`) rifiuta con il messaggio grezzo,
      che nomina il percorso.
- [ ] `panels/panel.ts`: il catch di `eseguiRichiesta` non avvisa più a parte;
      i tre `void invia` di sottofondo in `src/ui/main.ts` tacciono se l'host
      solleva.
- [ ] Il canale IPC unico è multiplexato per stringa: benvenuto, impostazioni e
      dialogo hanno type guard scritti a mano, e un refuso nel discriminante
      scarta il messaggio in silenzio (`shell/preload.ts`).
- [ ] Le quattro autorità di `registro://` non hanno un tipo condiviso con chi
      compone gli URL (`shell/protocol/fileProtocol.ts`).
- [ ] `GRUPPI` in `shell/windows/menu.ts` ripete a mano gli id dei comandi.
- [ ] Scritture con `archivio.modifica` diretto invece di `contesto.modifica`
      (`src/actions/register.ts`, `classTeacher.ts`, `assessments.ts`,
      `assignments.ts`, `sorting.ts`): timbri non uniformi, meno presa per
      `npm run collections`.
- [ ] Il client OAuth è quello pubblico di Microsoft «Graph Command Line Tools»
      (`src/data/oauth.ts`): Microsoft può ritirarlo.
- [ ] La disinstallazione lascia la cache di electron-updater in
      `%LOCALAPPDATA%` (`src/cli/disinstalla.mjs`).
- [ ] `getLlama` senza `build: 'never'` (`src/data/nodeLlama.ts`): senza binario
      adatto potrebbe scaricare sorgenti da compilare.
- [ ] PATH, associazione dei `.regi` e chiave AUMID si riscrivono a ogni avvio,
      anche nel portabile, senza un'impostazione per spegnerli
      (`src/environment/notifications.ts`).

### Prove

- [ ] Una prova di regressione per ogni difetto grave: mancano quella
      dell'appello (vive in una chiusura del DOM) e `comandiInVolo`.
- [ ] `src/actions/`: prove proprie, o la constatazione scritta che
      `tests/api/` le copre.
- [ ] Nessuna prova end-to-end del giro pagina → preload → main → disco.
- [ ] Senza prova: timer d'inattività del condotto durante una chiamata lenta,
      tetto di 16 MiB per presa, `EACCES` sulla pipe, giro Exchange vero, OAuth
      che dimentica un account sbagliato, scarichi con più iscritti.
- [ ] `ricorda()` in `src/ui/state.ts` manda senza ritardo: la prova non ha
      `setTimeout`.
- [ ] `tests/environment/systemText.test.mjs` chiama `reg` per nome.
- [ ] Prove dell'interfaccia su Playwright per Node, senza Python (non urge).

### Codice morto e doppioni (D6)

- [ ] Circa 120 export usati solo nel proprio file e dalle prove: si rendono
      interni riscrivendo le prove. Censire per simbolo, non per nome.
- [ ] Doppioni: `unisci` dei periodi in `persone/assenze.ts` e
      `persone/medie.ts` (uno allarga gli estremi, l'altro tiene il primo:
      forse un difetto); `toFixed(2)` contro `formattaVoto` nel rapporto;
      `casella` delle figure della guida (tre copie diverse).
- [ ] `mediaAllievo` (`src/domain/calculations.ts`): l'indice di
      `matriceCorso`, solo se si tocca il file.

### Interfaccia

- [ ] Adottare i token nelle pagine: valori unici (0,94em, 0,66em, 1,18em) da
      decidere uno per uno; sette punti di rottura in `px` non scalano con
      «Dimensione testo». Anche il calendario (`calendar.css`) e le pagine con
      misure proprie per il tono di ADR-39.
- [ ] Doppio scorrimento nelle pagine a due colonne (Classi, Persone, Piani,
      Registri, Documenti, Modelli): scelta di forma da prendere guardandola.
- [ ] Gli elenchi delle schede Documenti (`src/ui/views/documents/cards.ts`)
      non hanno chiave di scorrimento.
- [ ] Proiezione su schermo corto: applicare la compattezza quando il
      contenuto eccede (`styles/projection.css:44`).
- [ ] Doppioni del contesto: filtri corso e periodo nella barra di stato e nella
      riga di contesto; due tendine «corso» nella pagina Lezione
      (`statusBar.ts`; `tests/ui/navigation.py` li fissa).
- [ ] Le finestre native tengono la freccia di sistema nelle tendine (CSP senza
      `img data:`).
- [ ] Le finestre figlie tengono la cornice di sistema: da guardare per
      l'assistente staccato.
- [ ] La ✕ del filetto degli aggiornamenti vale separatamente per pannello e
      benvenuto.
- [ ] Con il pannello aperto l'errore «versione più recente» è ancora una
      nuvoletta (`src/panels/panel.ts`).
- [ ] Testi superati: `data/huggingFace.ts` e `manifest.ts` dicono che il
      proiettore scende con il modello; `documents/pageBrowser.ts` e
      `data/archive.ts` nominano un cestino che non c'è.
- [ ] Figura di `help/grades.ts`: «Resa a tutti · 4» forse è 3.
- [ ] `docs/immagini/*.png` sono dell'aspetto di prima: da rifare.

### Modelli e assistente

- [ ] Le scansioni senza programma esterno, il giorno in cui `node-llama-cpp`
      accetta immagini: via `mtmd.ts` e `ocr.programma`.
- [ ] Il modello caricato non si scarica da sé (`llamaCpp.ts`): tiene la
      memoria fino a un cambio di modello.
- [ ] Il catalogo dei consigliati è scritto a mano in `huggingFace.ts`.

### Lingue (ADR-38)

- [ ] Limiti: la descrizione del tipo `.regi` scritta dall'installatore per
      tutti gli utenti resta italiana; i titoli delle finestre native restano
      nella lingua di apertura; l'anteprima di `_testi-de.tpl` si compone nella
      lingua di adesso; le pastiglie delle impostazioni mostrano il valore
      grezzo della scelta.
- [ ] Etichette doppie: en «Messages»/«Messaging»; de «Beobachtete Aspekte im
      Unterricht»/«In der Klasse beobachtete Aspekte», «Nichts
      festzuhalten»/«Nichts zu vermerken»; fr «depuis l'ICS»/«depuis ICS», «Fiche
      précédente/suivante» nella proiezione; de «Karte» per mappa e schede.
- [ ] Termini del registro ancora scritti per esteso nei cataloghi invece che
      da `lessico()`; nomi di comando da leggere dal manifesto.

### Rilascio, firma, nome

- [ ] SignPath: domanda come Regiclass (progetto `regiclass`); 2FA; app GitHub;
      configurazioni `eseguibile` e `installatori`; politica
      `release-signing`; segreto e variabile su GitHub (GUIDA § «La firma del
      codice»).
- [ ] Prima release firmata: togliere l'avviso SmartScreen dal README e «quando
      la firma sarà attiva» da SECURITY.
- [ ] Da decidere: controllo degli aggiornamenti acceso di serie (se la
      Foundation lo contesta); `publisherName` in `win.signtoolOptions` quando
      le release firmate sono la regola; firma del disinstallatore.
- [ ] Font Liberation 1.x di pdfjs (GPL con eccezione): i 2.x sono OFL, se
      chiesto. Sei pacchetti MIT senza file LICENSE.
- [ ] Da per tutti a per utente l'installatore non toglie la copia per tutti
      (`installSection.nsh` di electron-builder).
- [ ] Il PNG a 1024 per l'`.icns` di macOS; Linux su Wayland senza
      `desktopName`.
- [ ] Un calendario ufficiale solo, il Ticino: un altro cantone vorrebbe una
      scelta nelle impostazioni.

### Da provare a mano

- [ ] Aggiornando su Windows un'installazione col nome precedente: una voce in
      «App installate», cartella dei dati spostata, avvio automatico,
      associazione `.regi`, `regi` nel PATH, icona sulla barra.
- [ ] Installatore: le tre modalità (tutti gli utenti, un utente, portabile)
      con barra, pin, notifiche, icona dei `.regi`, disinstallazione; le altre
      scale oltre il 250%, la pagina di fine, il disinstallatore.
- [ ] «Disinstalla…» su macOS, AppImage, portabile, Windows installato.
- [ ] Arresto di Windows con una modifica fresca e con il solo vassoio; widget
      sul monitor esterno e cavo staccato; proiezione a schermo intero; aprire un
      `.regi` da terminale o con doppio clic mentre il registro esce.
- [ ] Linux: la fascia dei pulsanti su GNOME e KDE.
- [ ] Barra del titolo su Windows accanto ai pulsanti di sistema
      (`--barra-titolo-riserva`).
- [ ] Calendario: il modulo dell'anno con il calendario ufficiale (spostare
      l'inizio, importare, salvare); la scelta dell'anno dal benvenuto su
      un'installazione nuova; «Nuovo anno scolastico» con «Sì, importa».
- [ ] Pause: aggiungere e togliere pause, ore nuove dal calendario e dal modulo,
      trascinare, copiare con Ctrl, stirare sopra una ricreazione, due pause e
      fasce sul bordo, un'ora vecchia con la casella spenta.
- [ ] Liste: cambiare il colore di un tipo di attività, «Rimetti le voci di
      fabbrica», pannello stretto, chiaro e scuro.
- [ ] A occhio: `pendenza`, `corniceFoglio`, `collegamento`, `tendina` (valore
      fuori elenco), le figure SVG nuove della guida.
- [ ] `tests/ui/staleEdits.py` non è mai girata.

### Questioni aperte

- [ ] Più docenti della stessa classe sullo stesso registro: nessuna struttura
      dice «di chi è» una scrittura.
- [ ] Cifratura del `.regi` (dati di minorenni in chiaro) contro «apribile con
      `unzip`» (ADR-17).
- [ ] Ruoli e riservatezza: chi apre il file vede tutto.
- [ ] Accesso da tablet o telefono: vorrebbe un server o una sincronizzazione.
- [ ] SQLite contro JSON: transazioni e query contro leggibilità e ADR-17.
