# Catalogo delle funzioni — Regiclass

L'inventario di quel che l'applicazione sa fare, superficie per superficie: la
risposta a «esiste già un'azione per questo?». Le procedure dell'API, le
letture e il canale delle domande stanno in [API](API.md); entità e campi in
[MODELLO-DATI](MODELLO-DATI.md); le ragioni in [DECISIONI](DECISIONI.md). I
conteggi verificati stanno in [INDICE](INDICE.md).

## 1. Come leggere il catalogo

| Superficie | Dove è dichiarata | Che cos'è |
|---|---|---|
| Destinazioni (pagine) | [`src/ui/pages.ts`](../src/ui/pages.ts) — `PAGINE` | un posto dove *andare* |
| Viste | [`src/protocol.ts`](../src/protocol.ts) — `type Vista`, instradate da [`src/ui/shell.ts`](../src/ui/shell.ts) | lo schermo disegnato |
| Comandi dell'interfaccia | [`src/ui/commands.ts`](../src/ui/commands.ts) — `COMANDI_UI` | una cosa da *fare* nel pannello |
| Comandi del programma | [`src/manifest.ts`](../src/manifest.ts) — `COMANDI` | voci del menu nativo, del vassoio, dei promemoria |
| Azioni del protocollo | [`src/protocol.ts`](../src/protocol.ts) — `type Azione` | la scrittura che attraversa il ponte |
| Procedure | [`src/api/procedures/`](../src/api/procedures/) | il contratto davanti alle azioni, più le letture (API § 5) |

```
  utente
    +- barra laterale / palette  -> vaiA(pagina)          -> impedimento()? -> pagina.apri() -> aggiorna({vista…})
    +- barra dei comandi / tasto -> eseguiComando(comando) -> impedimento()? -> comando.al()
    |                                  +- aggiorna({...})      solo navigazione o filtro
    |                                  +- un modulo (forms/)   chiede dati
    |                                  `- azione({tipo})       una o più Azioni verso l'host
    `- menu nativo / vassoio / promemoria -> executeCommand('registroDocenti.…')
                                       +- MessaggioNavigazione  porta il pannello su una Vista
                                       `- esegui(archivio, {tipo})  la stessa Azione del pannello
```

- Una pagina è una destinazione, una vista uno schermo: le quattro
  `pagina.classe.*` aprono tutte `docenteClasse` con `schedaDocente` diverse; la
  vista `allievo` non ha pagina propria.
- Un comando chiama zero, una o più azioni.
- Il `dove` di un comando è una superficie: `'app'` = menu File, `'schermo'` =
  scheda Proiezione, altrimenti una `Vista`.
- Un comando non eseguibile resta spento e dice perché (`impedimento()`).
  `impedimentoDi()` guarda prima il posto (il `dove` o `vive()` nella vista
  aperta) e poi `impedimento()`.
- Ogni scrittura è un'`Azione`; il pannello non muta mai `stato.registro`.
  Quel che si chiede e basta passa da `Domanda`/`Riscontro` (API § 6).

## 2. Destinazioni (pagine)

### 2.1 Le 19 `Pagina` di `PAGINE`

| id | titolo | gruppo | vista | note |
|---|---|---|---|---|
| `pagina.oggi` | Dashboard | `agenda` | `oggi` | vista del primo avvio |
| `pagina.calendario` | Calendario | `agenda` | `calendario` | |
| `pagina.pendenze` | Pendenze | `agenda` | `todo` | conto `pendenzeDellaBarra().aperti` |
| `pagina.daSmistare` | Da smistare | `agenda` | `daSmistare` | conto `pagineDaSmistareInTutto()` |
| `pagina.persone` | Persone | `anno` | `persone` | attiva anche su `allievo` |
| `pagina.mappa` | Mappa | `anno` | `mappa` | |
| `pagina.corso.registro` | Lezione | `registro` | `lezione` | `vaiAlCorso()`; impedimento `senzaCorso` |
| `pagina.corso.valutazioni` | Valutazioni | `registro` | `valutazioni` | idem |
| `pagina.corso.check` | Check | `registro` | `check` | idem |
| `pagina.corso.piani` | Piani lezione | `registro` | `piani` | idem |
| `pagina.corso.documenti` | Documenti | `registro` | `documenti` | idem |
| `pagina.classe.pendenze` | Pendenze della classe | `classe` | `docenteClasse` (`todo`) | `vaiAlPannello()` |
| `pagina.classe.documenti` | Archivio documentale | `classe` | `docenteClasse` (`documenti`) | |
| `pagina.classe.assenze` | Assenze | `classe` | `docenteClasse` (`assenze`) | |
| `pagina.classe.messaggistica` | Messaggistica | `classe` | `docenteClasse` (`messaggistica`) | |
| `pagina.corsi` | Corsi | `anno` | `corsi` | |
| `pagina.classi` | Classi | `anno` | `classi` | |
| `pagina.impostazioni` | Impostazioni | `sistema` | `impostazioni` | |
| `pagina.guida` | Guida | `sistema` | `guida` | |

`vaiA(pagina)` è l'unico ingresso di navigazione. Il gruppo `classe` esiste
solo con almeno una classe di cui si è docente (`sezioneCePer`).

### 2.2 I cinque gruppi

| `GruppoPagina` | nome | pagine |
|---|---|---|
| `agenda` | Agenda | Dashboard, Calendario, Da smistare |
| `registro` | Registro — *corso* | Lezione, Valutazioni, Check, Piani lezione, Documenti |
| `classe` | Docente di classe — *classe* | le quattro schede del fascicolo |
| `anno` | L'anno | Persone, Mappa, Corsi, Classi |
| `sistema` | Il programma | Impostazioni, Guida (anche nel menu «File», `GRUPPO_DEL_MENU` in [`src/ui/commandBar.ts`](../src/ui/commandBar.ts)) |

Ordine: `ORDINE`. L'interruttore della barra laterale sta nella sua
intestazione ([`src/ui/sidebar.ts`](../src/ui/sidebar.ts)).

### 2.3 Le 19 `Vista`

| `Vista` | file | schede interne |
|---|---|---|
| `oggi` | [`views/today.ts`](../src/ui/views/today.ts) | tessere (lezioni del giorno, da compilare, pendenze, da smistare), lezioni, prossime valutazioni, compleanni; nessun comando |
| `calendario` | [`views/calendar.ts`](../src/ui/views/calendar.ts), [`calendar/`](../src/ui/views/calendar/) | 4 modi (`MODI_CALENDARIO`): settimana, mese, anno, agenda; editor in `views/calendar/editor.ts` |
| `todo` | [`views/todo.ts`](../src/ui/views/todo.ts) | delega a `classTodo.ts` |
| `daSmistare` | [`views/toSort.ts`](../src/ui/views/toSort.ts) | — |
| `lezione` | [`views/lesson.ts`](../src/ui/views/lesson.ts), [`lesson/`](../src/ui/views/lesson/) | amministrazione (appello, consegne, check, riconsegne), lezione (piano, voti, recuperi), annotazioni |
| `classi` | [`views/classes.ts`](../src/ui/views/classes.ts) | elenco + anagrafica |
| `persone` | [`views/people.ts`](../src/ui/views/people.ts) | riusa `schedaAllievo()` |
| `allievo` | [`views/student.ts`](../src/ui/views/student.ts), [`student/`](../src/ui/views/student/) | anagrafica, docenteClasse, materie |
| `docenteClasse` | [`views/classTeacher.ts`](../src/ui/views/classTeacher.ts) | todo, documenti, assenze, messaggistica |
| `corsi` | [`views/courses.ts`](../src/ui/views/courses.ts) | elenco + scheda con matrice |
| `piani` | [`views/plans.ts`](../src/ui/views/plans.ts) | libreria + editor |
| `valutazioni` | [`views/assessments.ts`](../src/ui/views/assessments.ts) | recuperi, riconsegne |
| `check` | [`views/check.ts`](../src/ui/views/check.ts) | la griglia; moduli in [`forms/check.ts`](../src/ui/forms/check.ts) |
| `documenti` | [`views/documents.ts`](../src/ui/views/documents.ts) | corso, lezioni, allievi |
| `mappa` | [`views/map.ts`](../src/ui/views/map.ts) | tutti, domicilio, lavoro |
| `impostazioni` | [`views/settings.ts`](../src/ui/views/settings.ts) | sezioni in 5 gruppi (`GRUPPI_SEZIONI`); pastiglia «file» su quelle del documento |
| `guida` | [`views/help.ts`](../src/ui/views/help.ts) | una scheda per vista |
| `modelli` | — | solo un indirizzo: `aggiorna()` porta a Impostazioni › Intestazione |
| `modelliLinguistici` | [`views/languageModels.ts`](../src/ui/views/languageModels.ts) | solo un indirizzo: la sezione «Modelli linguistici» delle impostazioni |

### 2.4 File satellite

Pezzi di vista usati da più pagine: [`views/archive.ts`](../src/ui/views/archive.ts),
[`views/absences.ts`](../src/ui/views/absences.ts),
[`views/assignments.ts`](../src/ui/views/assignments.ts),
[`views/retakes.ts`](../src/ui/views/retakes.ts),
[`views/returns.ts`](../src/ui/views/returns.ts),
[`views/pageBrowser.ts`](../src/ui/views/pageBrowser.ts),
[`views/pageDrop.ts`](../src/ui/views/pageDrop.ts),
[`views/sorting.ts`](../src/ui/views/sorting.ts),
[`views/classTodo.ts`](../src/ui/views/classTodo.ts),
[`views/documents/`](../src/ui/views/documents/) (anteprima, CSV, schede),
[`views/settings/`](../src/ui/views/settings/) (anno, documento, giornata,
liste, posta, programma, sezioni).

## 3. Comandi dell'interfaccia

`COMANDI_UI` in [`src/ui/commands.ts`](../src/ui/commands.ts): letterali più
varianti generate con `.map()`.

```ts
interface ComandoUI {
  id: string
  titolo: string | (() => string)
  simbolo: NomeIcona
  dove: readonly Posto[]          // 'app' | 'schermo' | Vista
  schedaDocente?: SchedaDocente
  gruppo: string
  aiuto?: string | (() => string)
  scorciatoia?: string
  dalMenu?: boolean               // l'acceleratore è del menu nativo
  primario?: boolean | (() => boolean)
  acceso?: () => boolean          // interruttore
  impedimento?: () => string | null
  soloSe?: () => boolean          // falso: nella sua pagina non compare
  al: () => void | Promise<unknown>
}
```

- I comandi `dalMenu` li esegue il menu nativo; per `registro.oggi` e
  `registro.nuovaLezione` l'host manda un `naviga`, che `eseguiNavigazione()`
  ([`src/ui/main.ts`](../src/ui/main.ts)) riporta allo stesso gesto. Con una
  modale aperta un `naviga` si ignora.
- Nelle tabelle: ◐ = interruttore, ★ = primario.

### 3.1 Il documento, l'anno, la manutenzione (`dove: app`)

| id | titolo | che cosa fa |
|---|---|---|
| `file.apri` ★ | Apri un anno… (`Ctrl+O`, `dalMenu`) | `documento.apri` |
| `file.importaRegistro` | Importa da un altro registro… | `moduloImportaRegistro()`: `registro.sfoglia`, `registro.altrove`, poi `registro.importa` |
| `file.salva` | Salva / Salva l'anno con nome… (`Ctrl+S`) | `stato.salva`; primario con un anno provvisorio |
| `file.ricarica` | Ricarica | `stato.ricarica` |
| `file.chiudi` | Chiudi l'anno | `documento.chiudi` |
| `file.cartella` | Apri la cartella del file | `sistema.apriCartella` |
| `file.nuovoAnno` | Nuovo anno scolastico | `moduloAnno()`; primario senza anno |
| `file.modificaAnno` | Modifica l'anno | `moduloAnno(anno)` |
| `file.pause` | Vacanze e sospensioni | `moduloPause(anno)` |
| `file.ripara` | Ripara il registro | `manutenzione.ripara`; spento se non c'è niente da riparare |
| `file.collegaPosta`, `file.provaPosta`, `file.provaInvioPosta`, `file.scollegaPosta` | Posta | `posta.collega`, `posta.prova`, `posta.invioProva`, `posta.scollega` |
| `finestra.ingrandisci`, `finestra.riduci`, `finestra.dimensioneNormale` | zoom (`Ctrl+Plus`, `Ctrl+-`, `Ctrl+0`, `dalMenu`) | `finestra.zoom` |
| `finestra.schermoIntero` | Schermo intero (`F11`, `dalMenu`) | `finestra.schermoIntero` |
| `finestra.esci` | Esci dal registro | `programma.esci` |
| `modifica.annulla` | Annulla (`Ctrl+Z`) | `storia.annulla`; storia in memoria ([`src/data/history.ts`](../src/data/history.ts)), in un campo di testo resta l'annulla del testo |
| `modifica.ripristina` | Ripristina (`Ctrl+Y`, `Ctrl+Maiusc+Z`) | `storia.ripristina` |
| `proiezione.schermo` ★◐ | Proietta / Spegni lo schermo | `proiezione.apri` / `proiezione.chiudi` |
| `calendario.editor` ◐ | Modifica (`Ctrl+E`) | modo del registro: arma la griglia del calendario, rende modificabili le lezioni esistenti, mostra «Nuova lezione» e i comandi ICS |

Impostazioni: nessun comando; gruppi e sezioni stanno nella fascia in cima
(`GRUPPI_SEZIONI` in [`src/ui/views/settings/sections.ts`](../src/ui/views/settings/sections.ts)).

### 3.2 Calendario (`dove: calendario`)

| id | titolo | che cosa fa |
|---|---|---|
| `registro.oggi` ★ | Oggi (`Ctrl+Alt+T`, `dalMenu`) | `vaiAOggi()`, e nella settimana scorre all'ora di adesso |
| `calendario.indietro`, `calendario.avanti` | Indietro, Avanti | `scorriCalendario(±1)` |
| `registro.oraDaCompilare` | Lezione da compilare / Prossima lezione | apre la lezione di `oraDaFare()`; anche su `lezione` |
| `calendario.settimana`, `.mese`, `.anno`, `.agenda` ◐ | i quattro modi | `scegliModoCalendario()` |
| `calendario.esterno` ◐ | Calendario ICS | mostra gli eventi ICS; `soloSe` settimana e modifica |
| `registro.nuovaLezione` ★ | Nuova lezione (`Ctrl+Alt+N`, `dalMenu`) | `moduloLezione()`; `soloSe` modifica |
| `registro.confrontaCalendario` | Confronta con il calendario | `moduloCalendariIcs()`; `soloSe` modifica e ICS acceso |

Sabato e domenica si accendono dai «Giorni mostrati» delle impostazioni.
In modifica (`views/calendar/editor.ts`): clic sceglie, sul vuoto si disegna a UD
intere, maniglie stirano, frecce e `Ctrl+D` spostano e copiano, Invio apre, F2
modulo, Canc elimina, Esc esce; ogni gesto è un'azione a gesto finito; ore
ancorate all'ICS ferme.

### 3.3 Pendenze, creazione, ora, piano

| id | dove | titolo | che cosa fa |
|---|---|---|---|
| `registro.nuovaConsegna` ★ | `todo` del corso | Nuova consegna | `moduloConsegna({corsoFisso:true})` |
| `registro.nuovoCorso` | `corsi` | Nuovo corso | `moduloCorso()` |
| `registro.nuovaClasse` | `classi`, `corsi` | Nuova classe | `moduloClasse()` |
| `lezione.stato.pianificata`, `.svolta` ★, `.annullata` ◐ | `lezione` | stato dell'ora | `lezione.stato`; annullare chiede conferma |
| `lezione.modifica` | `lezione` | Modifica la lezione | `moduloLezione({lezione})` |
| `piano.vaiAlRegistro` ★ | `piani` | Vai al registro | apre la prima ora del piano |
| `piano.duplica` | `piani` | Duplica | `piano.duplica` |
| `piano.elimina` | `piani` | Elimina | `chiediEliminazione` → `piano.elimina` |
| `corso.nuovaOra` | `piani`, `valutazioni` | Ora in questo corso | `moduloLezione({corsoId})` |
| `check.nuovaColonna` ★ | `check` del corso | Aggiungi una colonna | `moduloColonnaCheck()` → `check.colonne` |
| `check.colonne` | `check` del corso | Colonne | `moduloColonneCheck()` → `check.colonne` (conferma se cadono spunte) |

### 3.4 Mappa, persone, docente di classe

| id | dove | titolo | che cosa fa |
|---|---|---|---|
| `mappa.geocodifica` ★ | `mappa` | Trova gli indirizzi | `mappa.geocodifica` |
| `mappa.rifai` | `mappa` | Rifai gli indirizzi | conferma → `mappa.geocodifica` con `rifaiTutto` |
| `mappa.inquadra` | `mappa` | Inquadra tutto | locale |
| `classe.nuovoAllievo` | `allievo` | Aggiungi al gruppo | `moduloAllievo()` |
| `classe.incollaElenco` | `allievo` | Incolla elenco | `moduloImportaAllievi()` |
| `persone.nuova` | `persone` | Nuova persona in formazione | `moduloNuovaPersona()` |
| `classe.importa` | `classi` | Importa classe dall'anno… | `chiediImportaClasse()`: `classi.altrove`, poi `classe.importa` |
| `classe.comunicazione` | `allievo` | Nuova comunicazione | `moduloComunicazione()` |
| `classe.assenze` | `allievo` | Nuovo periodo assenze | `moduloBloccoAssenze()` |
| `docente.pendenza` ★ | `todo` docente di classe | Nuova pendenza | `moduloConsegna({a:'classe'})` |
| `docente.documento` ★ | `documenti` | Chiedi un documento | `moduloConsegna({documento:true})` |
| `docente.caricaPdf` ★ | `documenti` | Carica dei PDF | `caricaPdf()` → `smistamento.carica` |
| `docente.rileggiScansioni` | `documenti` | Rileggi le scansioni | `smistamento.rileggiAttive` |
| `docente.personale` | `documenti` | Documento personale | `moduloConsegna({a:'docente', documento:true})` |
| `docente.assenze` ★ | `assenze` | Nuovo periodo | `moduloBloccoAssenze()` |
| `docente.comunicazione` ★ | `messaggistica` | Nuova comunicazione | `moduloComunicazione()` |
| `docente.recapito` | `messaggistica` | Nuovo recapito | `moduloRecapito()` |
| `docente.elenco` | tutte | Elenco della classe | va a `classi` |

### 3.5 Proiezione (`dove: schermo`)

| id | titolo | che cosa fa |
|---|---|---|
| `proiezione.pausa` ◐ | Pausa / Riprendi | `proiezione.impostazioni` (`sospesa`) |
| `proiezione.indietro`, `proiezione.avanti` | scheda precedente, successiva | `aperto: bloccoScorrendo(±1)` |
| `proiezione.nomi` ◐ | Nomi visibili / Senza nomi | `nomi` |
| `proiezione.misure` ◐ | Misure strette / larghe | `compatta` |
| `proiezione.blocco.*` ◐ | `scaletta`, `argomenti`, `consegne`, `calendario`, `valutazioni`, `documenti`, `appello` | apre o spegne il blocco; gli ultimi tre sono riservati (`BLOCCHI_RISERVATI`) e partono spenti |
| `proiezione.calendario.*` ◐ | `settimana`, `mese`, `anno`, `agenda` | `calendario` del blocco Calendario |

### 3.6 Documenti (`dove: documenti`)

| id | titolo | che cosa fa |
|---|---|---|
| `documenti.scheda.corso`, `.lezioni`, `.allievi` ◐ | Corso, Lezioni, Persone | `schedaDocumenti` |
| `documenti.aggiornaTutto` ★ | Aggiorna tutto | `rapporto.completo` |
| `documenti.combina` | Combina i documenti scelti | `moduloComposizione()` (≥ 2) |
| `documenti.svuotaScelta` | Togli le spunte | locale |
| `documenti.rifare.mai`, `.chiusura`, `.sempre` ◐ | Solo a mano, Quando si chiude un'ora, A ogni modifica | `impostazioni.salva` con `pdfAutomatici`: l'unico comando della barra che scrive un'impostazione del documento |

## 4. Comandi del programma

`COMANDI` in [`src/manifest.ts`](../src/manifest.ts), registrati da
[`src/startup.ts`](../src/startup.ts) con `apparato.comandi.registra`. Il menu
nativo li dispone secondo `GRUPPI` di
[`shell/windows/menu.ts`](../shell/windows/menu.ts) (un comando non nominato
finisce sotto «Altro»); il vassoio ([`src/tray.ts`](../src/tray.ts)) ne espone
una parte.

| id | titolo | scorciatoia |
|---|---|---|
| `registroDocenti.apri` | Mostra il registro | `CommandOrControl+Alt+R` |
| `registroDocenti.guida` | Guida | |
| `registroDocenti.impostazioni` | Impostazioni | `CommandOrControl+,` |
| `registroDocenti.proietta` | Proietta per la classe | |
| `registroDocenti.oggi` | Oggi | `CommandOrControl+Alt+T` |
| `registroDocenti.nuovaLezione` | Nuova lezione | `CommandOrControl+Alt+N` |
| `registroDocenti.nuovaClasse`, `nuovoCorso`, `nuovoPiano`, `nuovaValutazione` | Nuova classe, corso, piano, valutazione | |
| `registroDocenti.nuovoAnno` | Nuovo anno scolastico (`chiediAnnoNuovo`: l'anno nasce provvisorio in `userData/anni-nuovi/`) | |
| `registroDocenti.ricarica` | Ricarica i dati | |
| `registroDocenti.salvaConNome` | Salva l'anno con nome… | |
| `registroDocenti.chiudiDocumento` | Chiudi l'anno (implementato in `shell/main.ts`) | |
| `registroDocenti.provaPosta`, `provaInvioPosta`, `collegaPosta`, `scollegaPosta`, `azzeraPosta` | posta | |
| `registroDocenti.apriCartellaDati` | Apri la cartella dei dati | |

Registrati fuori dal manifesto, come servizi: `registroDocenti.esci`,
`registroDocenti.benvenuto`, `registroDocenti.creaAnnoNuovo`,
`registroDocenti.ricordaDocumento`, `registroDocenti.mostraDocumento` (lettore
PDF interno, `shell/windows/reader.ts`) in `shell/main.ts`;
`registroDocenti.apriDocumento`, `registroDocenti.impostazioniFinestra` in
`shell/windows/menu.ts`.

## 5. Impostazioni

| | Programma (macchina) | Documento |
|---|---|---|
| Dichiarate in | [`src/manifest.ts`](../src/manifest.ts) — `IMPOSTAZIONI` | [`src/domain/models.ts`](../src/domain/models.ts) — `Impostazioni` |
| Scritte in | `impostazioni.json` in `userData` | il `.regi`, collezione `registro` |
| Si scrivono con | `programma.salva`, `programma.azzera`, `programma.sfoglia` | `impostazioni.salva` |
| Arrivano al pannello in | `MessaggioStato.programma` (`VoceProgramma`, con `scritta`) | `MessaggioStato.registro.impostazioni` |
| Predefiniti | `predefinitiImpostazioni()` | `IMPOSTAZIONI_PREDEFINITE` ([`src/domain/factories.ts`](../src/domain/factories.ts)) |

- Ogni valore passa dalla dogana `valoreConMotivo(chiave, valore)`
  ([`src/environment/settings.ts`](../src/environment/settings.ts)).
- Formati: `cartella`/`eseguibile`/`file` si scelgono con «Sfoglia…»
  (`programma.sfoglia`); `modello` solo dalla riga «Chi risponde» dei Modelli
  linguistici (`CHIAVI_IN_SCHEDA`); `indirizzoLocale` solo `http` di questo
  computer ([`src/domain/loopback.ts`](../src/domain/loopback.ts)). Le voci
  `avanzata` stanno in «Programmi già installati».
- Dal condotto non si toccano `registroDocenti.api.*`, `ocr.programma`,
  `dettatura.indirizzo` (API § 7).
- Il procedimento per aggiungerne una: skill `impostazione`.
- Le impostazioni del documento, campo per campo: MODELLO-DATI § 3.44.

### 5.1 Le 31 chiavi del programma

Sezioni di `SEZIONI_PROGRAMMA`: Generale, Comunicazioni, Modelli linguistici,
Aggiornamenti, Condotto e riga di comando.

| chiave `registroDocenti.…` | tipo, predefinito | che cosa regola |
|---|---|---|
| `aspetto.lingua` | `sistema` \| `it` \| `de` \| `fr` \| `en`; `sistema` | lingua (ADR-38) |
| `aspetto.tema` | `sistema` \| `chiaro` \| `scuro`; `sistema` | tema, via `nativeTheme.themeSource` |
| `vassoio.attivo` | bool; `true` | icona accanto all'orologio (al prossimo avvio) |
| `vassoio.chiusuraNelVassoio` | bool; `true` | chiudendo resta nel vassoio; dipende da `vassoio.attivo` |
| `avvio.conWindows` | bool; `false` | avvio con il computer, senza finestre (solo installato) |
| `avvio.soloVassoio` | bool; `false` | parte senza aprire il registro |
| `promemoria.attivo` | bool; `true` | notifica prima di una lezione |
| `promemoria.anticipoMinuti` | 0–120; `5` | quanto prima; dipende da `promemoria.attivo` |
| `proiezione.schermoIntero` | bool; `false` | proiezione a schermo intero |
| `posta.mittente` | email; `''` | «Da» (vuoto = il nome d'accesso) |
| `posta.utente` | email; `''` | nome d'accesso (vuoto = il mittente) |
| `posta.invioDiretto` | bool; `false` | spedisce invece di preparare bozze, con conferma |
| `recapiti.telefono` | `tel` \| `msteams` \| `skype` \| `callto` \| `nessuno`; `tel` | come si compone un numero (`sistema.chiama`) |
| `recapiti.posta` | `sistema` \| `outlook` \| `outlookWeb` \| `nessuno`; `sistema` | come si apre una mail (`sistema.scrivi`); `outlook` trova `OUTLOOK.EXE` da sé |
| `modelli.cartella` | cartella; `''` | dove stanno i `.gguf` |
| `modelli.scaricoAutomatico` | bool; `true` | scarica `llama-mtmd-cli` alla prima scansione |
| `ocr.attivo` | bool; `false` | lettura delle scansioni; richiede `ocr.modello` e `ocr.proiettore` |
| `ocr.modello`, `ocr.proiettore` | modello; `''` | nomi di file nella cartella dei modelli (`llm.scegli`) |
| `ocr.programma` | eseguibile, avanzata; `''` | un `llama-mtmd-cli.exe` proprio |
| `assistente.attivo` | bool; `false` | l'assistente; richiede `assistente.modello` |
| `assistente.modello` | modello; `''` | il `.gguf` che risponde |
| `dettatura.attivo` | bool; `false` | microfono nell'assistente, via voicebox |
| `dettatura.taglia` | `turbo` \| `large` \| `medium` \| `small` \| `base`; `turbo` | modello Whisper di voicebox |
| `dettatura.indirizzo` | indirizzoLocale, avanzata; `http://127.0.0.1:17493` | dove sta voicebox (ADR-35) |
| `aggiornamenti.controlloAutomatico` | bool; `true` | controllo all'avvio e ogni sei ore |
| `aggiornamenti.scaricoAutomatico` | bool; `true` | scarica senza chiedere |
| `aggiornamenti.installaAllaChiusura` | bool; `true` | installa all'uscita |
| `api.condotto` | bool; `false` | il condotto locale |
| `api.lettura` | bool; `true` | letture dal condotto; dipende da `api.condotto` |
| `api.scrittura` | bool; `false` | scritture dal condotto; dipende da `api.condotto` |

- `CHIAVI_DISMESSE`: le chiavi tolte che `ritiraChiaviDismesse()` cancella da un
  `impostazioni.json` vecchio (attese diventate costanti, vecchia dettatura
  whisper.cpp, agenda sul desktop, `aperturaAutomatica`,
  `recapiti.outlook`…). `ritiraCorredoWhisper()`
  ([`src/data/dictation.ts`](../src/data/dictation.ts)) cancella la vecchia
  cartella della dettatura.
- Stato, non opzioni (fuori dal manifesto): `registroDocenti.ultimoDocumento`,
  `registroDocenti.cartellaLavoro`.

## 6. Azioni del protocollo

Le 168 varianti di `type Azione` ([`src/protocol.ts`](../src/protocol.ts)),
una per gestore in [`src/actions/`](../src/actions/); `GESTORI` in
[`src/actions.ts`](../src/actions.ts) (il compilatore vieta azioni senza
gestore e viceversa). Ognuna ha una procedura davanti (ADR-27): `azione →
procedura` quando il nome cambia, altrimenti il nome è lo stesso. Il conteggio
lo tiene `tests/api/coverage.test.mjs`.

| File | Azioni |
|---|---|
| [`register.ts`](../src/actions/register.ts) | `stato.leggi`, `stato.ricarica`, `anno.crea`→`anni.crea`, `anno.salva`→`anni.salva`, `anno.settimana`→`anni.settimana`, `materia.salva`→`materie.salva`, `materia.elimina`→`materie.elimina`, `materia.unisci`→`materie.unisci`, `corso.crea`→`corsi.crea`, `corso.salva`→`corsi.salva`, `corso.elimina`→`corsi.elimina`, `orario.imposta`, `orario.genera`, `classe.salva`→`classi.salva`, `classe.elimina`→`classi.elimina`, `allievo.elimina`→`persone.elimina`, `allievo.foto.imposta`→`persone.foto.imposta`, `allievo.foto.togli`→`persone.foto.togli`, `classe.duplica`→`classi.duplica`, `classe.importa`→`classi.importa`, `registro.importa`, `allievi.importa`→`persone.importa` |
| [`hours.ts`](../src/actions/hours.ts) | `lezione.salva`→`ore.salva`, `lezione.elimina`→`ore.elimina`, `lezione.togliNelleChiusure`→`ore.chiusure.togli`, `lezione.duplica`→`ore.duplica`, `lezione.stato`→`ore.stato`, `lezione.sposta`→`ore.sposta`, `lezione.testi`→`ore.testi`, `presenze.ud`→`ore.appello.casella`, `presenze.riga`→`ore.appello.riga`, `presenze.colonna`→`ore.appello.colonna`, `presenze.tutti`→`ore.appello.tutti`, `presenze.campi`→`ore.appello.campi`, `osservazione.cella`→`ore.comportamento.cella`, `osservazione.salva`→`ore.osservazione.salva`, `osservazione.elimina`→`ore.osservazione.elimina` |
| [`plans.ts`](../src/actions/plans.ts) | `piano.salva`→`piani.salva`, `piano.elimina`→`piani.elimina`, `piano.perLezione`→`piani.perLezione`, `piano.duplica`→`piani.duplica`, `piano.assegna`→`piani.assegna`, `risorsa.aggiungi`→`risorse.aggiungi`, `risorsa.salva`→`risorse.salva`, `risorsa.sposta`→`risorse.sposta`, `risorsa.elimina`→`risorse.elimina`, `risorsa.apri`→`risorse.apri`, `avanzamento.imposta` |
| [`assessments.ts`](../src/actions/assessments.ts) | `valutazione.daAttivita`→`valutazioni.daAttivita`, `valutazione.salva`→`valutazioni.salva`, `valutazione.elimina`→`valutazioni.elimina`, `valutazione.eliminaOrfane`→`valutazioni.eliminaOrfane`, `voto.imposta`→`valutazioni.voto.imposta`, `valutazione.riconsegna`→`valutazioni.riconsegna`, `recupero.imposta`→`valutazioni.recupero.imposta`, `voto.riconsegna`→`valutazioni.voto.riconsegna`, `allegato.aggiungi`→`valutazioni.allegato.aggiungi`, `allegato.apri`→`valutazioni.allegato.apri`, `allegato.elimina`→`valutazioni.allegato.elimina` |
| [`assignments.ts`](../src/actions/assignments.ts) | `consegna.salva`, `.elimina`, `.spunta`, `.spuntaTutti`, `.raccogli`, `.documento.allega`, `.documento.apri`, `.documento.togli`, `.consegnato`, `.distribuisci` → `consegne.*` |
| [`classTeacher.ts`](../src/actions/classTeacher.ts) | `consegna.firme.aggiungi`, `.firme.apri`, `.firme.togli`, `.file.apri`, `.file.togli` → `consegne.*`; `recapito.salva`, `.elimina` → `classe.recapiti.*`; `comunicazione.salva`, `.elimina`, `.invia`, `.spunta` → `classe.comunicazioni.*`; `assenze.salva`, `.elimina`, `.foglio.aggiungi`, `.importa`, `.foglio.apri`, `.foglio.togli`, `.invia`, `.spunta` → `classe.assenze.*` |
| [`sorting.ts`](../src/actions/sorting.ts) | `smistamento.carica`→`smistamento.pdf.carica`, `.deposita`→`.pdf.deposita`, `.dividi`→`.pdf.dividi`, `.attribuisci`→`.pdf.attribuisci`, `.apri`→`.pdf.apri`, `.elimina`→`.pdf.elimina`, `.assegnaPagine`→`.pagine.assegna`, `.assegnaManuale`→`.pagine.assegnaManuale`, `.scartaPagine`→`.pagine.scarta`, `.apriPagine`→`.pagine.apri`, `.riprendiPagine`→`.pagine.riprendi`, `.confermaTutto`→`.bozza.conferma`, `.assegnaAssenze`→`.assenze.assegna`, `.assegnaFirme`→`.firme.assegna`, `.leggiPagine`→`.lettura.pagine`, `.leggiTutto`→`.lettura.tutto`, `.rileggiAttive`→`.lettura.attive`, `.fermaLettura`→`.lettura.ferma`, `.impostazioni`→`.lettura.impostazioni` |
| [`system.ts`](../src/actions/system.ts) | `impostazioni.salva`, `programma.salva`, `programma.sfoglia`, `programma.azzera`, `esporta.valutazioni`, `esporta.presenze`, `esporta.lezione`, `manutenzione.ripara`, `sistema.apriCartella`, `finestra.zoom`, `finestra.schermoIntero`, `programma.esci`, `sistema.chiama`, `sistema.scrivi`, `posta.prova`, `posta.invioProva`, `posta.collega`, `posta.scollega`, `sistema.messaggio` |
| [`calendar.ts`](../src/actions/calendar.ts) | `calendario.aggiungi`, `calendario.aggiorna`, `calendario.modifica`, `calendario.togli`, `calendario.applica` |
| [`check.ts`](../src/actions/check.ts) | `check.colonne`, `check.spunta`, `check.data`, `check.lezione` |
| [`documents.ts`](../src/actions/documents.ts) | `stato.salva`, `documento.apri`, `documento.chiudi`, `documento.preferito`, `documento.dimentica` |
| [`exports.ts`](../src/actions/exports.ts) | `esportazione.apri`, `.mostra`, `.elimina` → `esportazioni.*` |
| [`compositions.ts`](../src/actions/compositions.ts) | `composizione.crea`, `.aggiorna`, `.elimina` → `composizioni.*` |
| [`reports.ts`](../src/actions/reports.ts) | `rapporto.genera`, `rapporto.completo` → `rapporti.*` |
| [`llm.ts`](../src/actions/llm.ts) | `llm.scarica`, `llm.annulla`, `llm.importa`, `llm.elimina`, `llm.scegli` |
| [`updates.ts`](../src/actions/updates.ts) | `aggiornamenti.controlla`, `aggiornamenti.scarica`, `aggiornamenti.installa` |
| [`templates.ts`](../src/actions/templates.ts) | `intestazione.logo`, `intestazione.togliLogo` |
| [`projection.ts`](../src/actions/projection.ts) | `proiezione.apri`, `proiezione.chiudi`, `proiezione.mira`, `proiezione.impostazioni` (nessuna tocca il `Registro`) |
| [`history.ts`](../src/actions/history.ts) | `storia.annulla`, `storia.ripristina` (con `conflitto` se le collezioni sono cambiate per un'altra strada) |
| [`assistant.ts`](../src/actions/assistant.ts) | `assistente.stacca`, `assistente.contesto` |
| [`view.ts`](../src/actions/view.ts) | `vista.apri` |
| [`map.ts`](../src/actions/map.ts) | `mappa.geocodifica` |

Helper comuni in [`src/actions/context.ts`](../src/actions/context.ts):
`fatto`, `invariato`, `rifiuta`, `conMessaggio`, `riponi` (upsert per id),
`apriFile`, `cestina`, `scegliFile`, `lanciaComando`, `vietaSeInChiusura`.

Comportamenti da sapere:

- **Idempotenti per progetto**: `corso.crea` (stessa coppia → id esistente),
  `valutazione.daAttivita`, `orario.genera` (quel che c'è non si tocca),
  `calendario.applica` (tutto o niente; non cancella mai lezioni).
- **Aprono un dialogo** (e da uno script aspettano una persona): API § 7.
- **Scrivono con `archivio.modifica` diretto**, fuori da `contesto.modifica`:
  `materia.salva`, `comunicazione.invia`, `comunicazione.spunta`,
  `assenze.invia`, `assenze.spunta` e alcune di `sorting.ts`,
  `assignments.ts`, `assessments.ts`.
- **File prima del registro**: le rimozioni cestinano il file e poi tolgono la
  riga; le aggiunte copiano il file e poi scrivono.
- `lezione.stato` a `svolta` inizializza l'appello vuoto e rifà subito i
  documenti del corso (`aggiornaDopoChiusura`).
- `lezione.salva` sposta fuori dalle pause le fasce che le invadono;
  `lezione.sposta`/`lezione.duplica` ridispongono sulle pause
  (`slotSullePause`); `impostazioni.salva` ridispone le ore quando cambiano pause
  o `minutiUd`.
- `anni.salva` con una chiusura nuova toglie le ore intatte che ci cadono;
  `lezione.togliNelleChiusure` toglie le altre.
- `piano.assegna` con un piano diverso azzera l'avanzamento; `piano.duplica`
  ricopia i file delle risorse.
- `consegna.spuntaTutti` con `fatta: false` toglie solo le spunte senza file.
- `assenze.salva` su un blocco esistente tiene le righe dell'host (difesa di
  concorrenza).
- `consegna.distribuisci`, `comunicazione.invia`, `assenze.invia`: con invio
  diretto chiedono conferma prima di generare bozze; si segna come fatto solo
  quel che è partito davvero.
- `smistamento.riprendiPagine` è l'unico rollback: cestina l'archiviato e
  rimette le pagine in lettura. `smistamento.assegnaManuale` e
  `smistamento.dividi` restano per le prove.
- `proiezione.mira` torna `invariato` e non accende l'indicatore di lavoro.
- `rapporto.completo` genera in serie, mai in parallelo (OneDrive).
- Il gettone OAuth non attraversa mai il ponte: il pannello vede solo
  `MessaggioStato.posta`.

Le letture (senza azione): API § 5.

## 7. Messaggi host → pannello

In [`src/protocol.ts`](../src/protocol.ts); `MessaggioVersoWebview` è la loro
unione. Stesso canale `registro:messaggio`; il pannello li distingue da `tipo`
([`src/ui/bridge.ts`](../src/ui/bridge.ts)). In salita: `Richiesta { id, azione }`
(in coda) e `Domanda { id, procedura, ingresso? }` (fuori coda); un solo
contatore di `id`.

| Messaggio | `tipo` | Da chi | Quando |
|---|---|---|---|
| `Risposta` | `'risposta'` | `panels/panel.ts` | dopo ogni `Richiesta`, **dopo** l'eventuale `MessaggioStato` |
| `Riscontro` | `'riscontro'` | `rispondiDomanda()` | dopo ogni `Domanda` (API § 6) |
| `MessaggioStato` | `'stato'` | `panels/panel.ts` | dopo ogni azione che cambia qualcosa, cambi esterni al file, cambi di impostazioni o di documenti recenti |
| `MessaggioNavigazione` | `'naviga'` | `apriRegistro()` (menu, vassoio, promemoria) | per aprire il pannello su un posto; in attesa finché il pannello non manda `stato.leggi` |
| `MessaggioNotifica` | `'notifica'` | `PannelloRegistro.avvisa()` | errori non legati a una richiesta |
| `MessaggioLavoro` | `'lavoro'` | lo smistatore ([`src/data/sorter.ts`](../src/data/sorter.ts)) | a ogni pagina letta dall'OCR |
| `MessaggioProiezione` | `'proiezione'` | `panels/projection.ts` | alla proiezione: solo i blocchi accesi |
| `MessaggioStatoProiezione` | `'proiezione.stato'` | `panels/projection.ts` | al pannello: proiezione aperta, chiusa o cambiata |
| `MessaggioAggiornamenti`, `MessaggioScarico` | | aggiornamenti e scarichi dei modelli | stato già detto a parole |
| `MessaggioAssistente`, `MessaggioStatoAssistente`, `MessaggioDettatura` | | `src/panels/` | un giro dell'assistente e la dettatura (API § 9) |

- **`Risposta`**: `id`, `ok`, `errori?`, `codice?`, `creato?: { id }` (l'entità
  nata), `documento?` (percorso scritto da `rapporto.genera`), `messaggio?`
  (`{ livello, testo }`). Nessun timeout lato pannello.
- **`MessaggioStato`**: `registro` (intero, nessun push differenziale),
  `programma: VoceProgramma[]`, `avvisi`, `radiceDati`, `radiceApp`,
  `ocrAttivo`, `posta` (`exchange`, `server`, `invioDiretto`, `mittente`,
  `accesso`), `documenti` (`corrente`, `elenco` con `preferito`, `mancante`),
  `esportati` e `archiviati` (`{ percorso, misura, revisione }`),
  `composizioni`, `storia` (i due conti di annulla/ripristina).
- **`MessaggioNavigazione`**: `vista`, `elementoId?` (il contesto si risale da
  sé), `data?`, `nuovo?` (apre il modulo di creazione; mai dall'assistente),
  `importa?`.
- **`MessaggioLavoro`**: `corrente`, `fatte`, `totale`, `coda`.
- **`MessaggioStatoProiezione.impostazioni`**: `blocchi`, `aperto`, `sospesa`,
  `nomi`, `compatta`, `calendario`. La proiezione non rimanda niente indietro.

## 8. Canali del guscio

Sullo stesso `registro:messaggio`, filtrati per `evento.sender.id`, convivono
sotto-protocolli con un discriminante di stringa e type guard scritti a mano.

| Sotto-protocollo | Discriminante | File |
|---|---|---|
| Pannello e proiezione | forma `Richiesta`/`Domanda` | [`src/environment/windows.ts`](../src/environment/windows.ts) |
| Benvenuto | `benvenuto: '…'` | [`shell/windows/welcome.ts`](../shell/windows/welcome.ts), [`shell/pages/welcome/welcome.html`](../shell/pages/welcome/welcome.html) |
| Impostazioni | `impostazioni: '…'` | [`shell/windows/menu.ts`](../shell/windows/menu.ts), [`shell/pages/settings/settings.html`](../shell/pages/settings/settings.html) |
| Dialogo | `dialogo: '…'` | [`src/environment/dialogs.ts`](../src/environment/dialogs.ts), [`shell/pages/dialog/dialog.html`](../shell/pages/dialog/dialog.html) |

### 8.1 Benvenuto

Pagina → main: `pronto`, `apri`, `apriPercorso` (`percorso`), `crea`,
`preferito` (`percorso`, `valore`), `dimentica` (`percorso`), `esci`.
Main → pagina: `{benvenuto: 'elenco', invito, versione, voci}`, a ogni cambio
dei documenti noti. Esito: `{tipo:'apri', documento}` | `{tipo:'crea'}` |
`{tipo:'altrove'}` | `null`.

### 8.2 Impostazioni

Pagina → main: `pronto`, `apriPannello`, `scrivi` (`chiave`, `valore`),
`azzera` (`chiave`), `sfoglia` (`chiave`). Main → pagina: `valore` (`chiave`,
`valore`, `scritta`), `schema` (`titolo`, `voci`, `filtro`), `filtro` (`testo`).

### 8.3 Dialogo

Parametri nella query string (`registro://app/dist/dialogo.html?p=<json>`), le
risposte sul canale: `conferma` (`indice?`, `testo?`), `annulla`, `valida`
(`testo`), `altezza` (`valore`). Gli avvisi e le conferme del registro passano
da `chiediMessaggio` in `src/environment/dialogs.ts` (pagina
`shell/pages/dialog/`); nativi restano solo gli errori prima che una finestra
possa nascere.

### 8.4 `registro:interfaccia` (sincrono)

`sendSync('registro:interfaccia', 'leggi' | 'scrivi', nuovo?)` dal preload: lo
stato di visualizzazione della finestra (`StatoPersistito`: vista, schede,
filtri, id scelti), gestito da `gestisciStatoInterfaccia` in
[`src/environment/windows.ts`](../src/environment/windows.ts). Non sono dati del
registro.

### 8.5 Le 4 autorità di `registro://`

[`shell/protocol/fileProtocol.ts`](../shell/protocol/fileProtocol.ts):
`privilegiaSchema()` prima di `whenReady`, poi `registraProtocollo()`.

| Autorità | Forma | Serve |
|---|---|---|
| `pagina` | `registro://pagina/<id>` | l'HTML in memoria di una `VistaWeb` (`htmlDellaPagina`) |
| `app` | `registro://app/dist/…` | bundle e pagine native, dentro `radiciConcesse()` |
| `dati` | `registro://dati/<percorso>` | file del documento, materializzati su richiesta |
| `mappa` | `registro://mappa/<z>/<x>/<y>.png` | tasselli ([`shell/protocol/tiles.ts`](../shell/protocol/tiles.ts)), zoom ≤ 19 |

Difese: segmenti `.`/`..` rifiutati dopo `decodeURIComponent`; `concesso()`;
CORS solo verso `registro://`; streaming con `net.fetch`.

## 9. Rapporti e modelli di stampa

### 9.1 Gli 8 `GenereRapporto`

In [`src/domain/locations.ts`](../src/domain/locations.ts); dati da
[`src/domain/reportData.ts`](../src/domain/reportData.ts), PDF da
[`src/data/reportsPdf.ts`](../src/data/reportsPdf.ts).

```
esportazioni/<materia | docente-di-classe>/<classe>/{ classe | allievi/<Cognome Nome> }/<file>
nome = <anno>_<classe>_<ambito>_<documento>[_<chi>][_<dettaglio>].<est>    (AAMMGG, HH.MM)
```

| genere | cartella | documento e dettaglio | formati |
|---|---|---|---|
| `lezione` | `classe/` | Verbali, `AAMMGG HH.MM` | PDF, MD (`esporta.lezione`) |
| `piano` | `classe/` | Piani, `Piano AAMMGG HH.MM` / `Piano bozza …` / `Piano in preparazione` | PDF |
| `valutazioni` | `classe/` | Valutazioni, semestre o «anno intero» | PDF, CSV (`esporta.valutazioni`) |
| `presenze` | `classe/` | Presenze, semestre o «anno intero» | PDF, CSV (`esporta.presenze`) |
| `momento` | `classe/` | Prove, titolo (`(n)` fra omonimi) e data | PDF |
| `fascicolo` | `docente-di-classe/<classe>/classe/` | Fascicolo, giorno di stampa (datato) | PDF |
| `foto-classe` | `classe/` | Foto della classe, giorno di stampa (datato) | PDF |
| `allievo` | `allievi/<Cognome Nome>/` | Scheda PiF, persona e periodo | PDF |

- I due datati fanno una copia al giorno e sono esclusi da
  `percorsiDiUnDocumento`.
- `percorsoDi(collocazione, estensione)` produce anche CSV e Markdown;
  `precedentiDi` riconosce i nomi vecchi (`DOCUMENTO_SCHEDE_PRIMA`).
- Rigenerazione automatica: ADR-31 e ARCHITETTURA § 6 (c).

### 9.2 `CATALOGO_MODELLI`

In [`src/domain/templateCatalog.ts`](../src/domain/templateCatalog.ts). Ruoli:
`comune` (strato sotto tutti), `rapporto`, `posta`, `immagine` (oggi nessuno: il
logo è `logo.png` riservato, `NOME_LOGO`).

| nome | ruolo | che cosa |
|---|---|---|
| `_base` | comune | testata e piede |
| `_stile` | comune | formato, margini, corpi |
| `_testi`, `_testi-de`, `_testi-fr`, `_testi-en` | comune | parole e nomi delle colonne per lingua |
| `_blocchi` | comune | pezzi richiamati con `usa:` |
| `verbale-lezione`, `piano-lezione`, `valutazioni-classe`, `presenze-classe`, `scheda-allievo`, `momento-valutazione`, `fascicolo-classe`, `foto-classe` | rapporto | uno per `GenereRapporto` |
| `_firma.html` | posta | la firma delle e-mail (HTML) |

### 9.3 Il motore di template

[`src/domain/reports.ts`](../src/domain/reports.ts) (`componiCorpo`) +
[`src/data/reportsPdf.ts`](../src/data/reportsPdf.ts) (`componiPdf`, pdf-lib).
Formato per esteso: `templates/LEGGIMI.md`.

| Direttiva | Forma |
|---|---|
| segnaposto, frase | `{{valore}}`, `{{frase.nome}}` |
| elenco, tabella | `elenco:`, `tabella: nome \| Col1, Col2` |
| grafico, galleria, immagine | `grafico:`, `galleria: \| colonne N \| altezza N`, `immagine: file \| altezza N \| sinistra\|destra` |
| ciclo, condizione | `ripeti: gruppo` … `fine:`, `se:` … `altrimenti:` … `fine:` |
| richiamo, ereditarietà | `usa: blocco`, `estende: modello` (profondità ≤ 3) |

## 10. Moduli (form)

In [`src/ui/forms/`](../src/ui/forms/). Schema: dati di partenza (entità o
`crea*`) → `apriModale({titolo, corpo, alSalva, azioniSecondarie})` → `alSalva`
ricompone e chiama `salva(contesto, azione, messaggio, dopo?)`, che lascia il
modulo aperto con gli errori o chiude, notifica e chiama `dopo(idCreato)`.

| Modulo | Azioni |
|---|---|
| `moduloAnno` (con calendario ufficiale e «Importa da un altro registro»), `moduloPause` | `anno.crea`, `anno.salva` |
| `moduloBloccoAssenze`, `moduloImportaAssenze` | `assenze.salva`, `assenze.elimina`, `assenze.importa` |
| `moduloClasse`, `moduloAllievo`, `moduloImportaAllievi`, `moduloNuovaPersona` | `classe.salva`, `corso.crea`, `classe.elimina`, `allievo.elimina`, `allievo.foto.*`, `allievi.importa` |
| `moduloComposizione` | `composizione.crea` |
| `moduloConsegna` | `consegna.salva`, `consegna.elimina` |
| `moduloCorso` | `corso.*`, `orario.imposta`, `orario.genera` |
| `moduloRecapito`, `moduloComunicazione` | `recapito.*`, `comunicazione.*` |
| `moduloLezione` (segue le pause della giornata), `moduloOsservazione` | `lezione.salva`, `lezione.duplica`, `lezione.elimina`, `osservazione.*` |
| `moduloMateria`, `moduloUnisciMaterie` | `materia.salva`, `materia.elimina`, `materia.unisci` |
| `editorPiano`, `moduloPiano`, `moduloAssegnaPiano` | `piano.salva`, `piano.duplica`, `piano.elimina`, `piano.assegna` |
| `moduloRecupero` | `recupero.imposta` |
| `bloccoRisorse`, `moduloCollegamento`, `moduloRisorsa` | `risorsa.*` |
| `moduloValutazione` (corregge, non crea) | `valutazione.salva`, `valutazione.elimina` |
| `moduloImportaRegistro` | `registro.importa` |
| `moduloColonnaCheck`, `moduloColonneCheck` | `check.colonne` |
| `moduloCalendariIcs` (in `src/ui/views/settings/icsCalendar.ts`) | `calendario.*` |

`forms/common.ts`: `salva`, `chiediEliminazione` (mostra tutto ciò che sparisce,
da `src/domain/deletions.ts`), `tastoElimina`, `tastoDuplica`, `campoCollegato`
(tendina con «+» che crea la voce mancante), `campoCorso`, `applicaOrario`,
`riordinatore` (trascinamento e tastiera). Gli editor interni (`editorPause`,
`editorTelefoni`, `editorRicorrenze`, `editorSlot`, `editorAttivita`)
aggiornano solo i nodi che cambiano, per non perdere il fuoco.

`components/hint.ts`: `suggerimento()` è la «i» con la spiegazione nascosta
(`aria-describedby`); la usano `campo({ aiuto })`, `scheda`, `testataVista`,
`sezioneModulo`, `apriModale`.

## 11. Esportazioni e integrazioni

### 11.1 Che cosa esce dal registro

| Formato | Azione | Dove |
|---|---|---|
| PDF | `rapporto.genera`, `rapporto.completo`, rigenerazione automatica | `esportazioni/…` (§ 9.1) |
| PDF composto | `composizione.crea`, `composizione.aggiorna` | `esportazioni/…` + ricetta JSON nel documento (2–200 PDF) |
| PDF di prova | lettura `modelli.prova` | in memoria |
| CSV | `esporta.valutazioni`, `esporta.presenze` | accanto al PDF, stesso nome ([`src/data/exports.ts`](../src/data/exports.ts)) |
| Markdown | `esporta.lezione` | accanto al verbale |
| `.eml` | invii con invio diretto spento o fallito | `bozze/` |

### 11.2 Posta

- `puoSpedire()` = casella collegata e `posta.invioDiretto`. Altrimenti una
  bozza `.eml` per messaggio in `bozze/` (`spediti: false`: niente si segna da
  solo; si spunta con `comunicazione.spunta`/`assenze.spunta`). Una bozza si apre
  da sé; più di una, si apre la cartella.
- Nell'`.eml` la firma la mette il programma di posta; nell'invio diretto la
  mette il registro. Il periodo sta nel nome della bozza.
- `consegna.distribuisci`: un messaggio per allievo con il documento, senza
  copia nascosta. `comunicazione.invia`: un messaggio, destinatari in copia
  nascosta. `assenze.invia`: una mail per allievo, al datore.
- Invio diretto: Exchange Online, OAuth PKCE (`src/data/oauth.ts`,
  `src/data/exchange.ts`); `registroDocenti.azzeraPosta` ripulisce portachiavi,
  memoria e impostazioni.

### 11.3 Geocodifica

`mappa.geocodifica` da main process verso Nominatim: 1,1 s fra richieste,
quattro tentativi dal più preciso a solo NAP + paese (`approssimato`), al più 60
indirizzi per volta, scrittura incrementale in `Registro.coordinate`, sincrono
nel gestore. Tasselli: `registro://mappa/…` (§ 8.5).

### 11.4 OCR

- Richiede `ocr.modello` e `ocr.proiettore` (`.gguf`) e `llama-mtmd-cli`,
  scaricato da [`src/data/visionKit.ts`](../src/data/visionKit.ts) con le
  guardie di [`src/data/kit.ts`](../src/data/kit.ts) (indirizzo nel sorgente,
  versione fissa, SHA-256, estrazione stretta) in
  `cartellaApplicazione()/lettura`, o indicato in `ocr.programma`.
- 180 s per pagina. `smistamento.leggiPagine`, `.leggiTutto`, `.rileggiAttive`
  accodano e tornano subito; lo `Smistatore`
  ([`src/data/sorter.ts`](../src/data/sorter.ts)) legge una pagina alla volta e
  racconta con `MessaggioLavoro`.

### 11.5 Smistamento

| Fase | Azioni | File |
|---|---|---|
| Ingresso | `smistamento.carica`, `.deposita` | i byte in `quarantena/` nel `.regi`, anteprime in `quarantena/anteprime/` |
| Ricostruzione | `.dividi`, `.attribuisci` | nessuno |
| Lettura | `.leggiPagine`, `.leggiTutto`, `.rileggiAttive`, `.fermaLettura` | si riempie `letture` |
| Assegnazione | `.assegnaPagine`, `.assegnaAssenze`, `.assegnaFirme`, `.confermaTutto`, `.assegnaManuale` | il ritaglio va in `archivio/<materia>/<classe>/<chi>/` |
| Scarto | `.scartaPagine` | le pagine escono senza andare da nessuno |
| Rollback | `.riprendiPagine` | cestina l'archiviato, pagine di nuovo in lettura |
| Chiusura | automatica (`chiudiSeFinito`) o `.elimina` | PDF e anteprime nel cestino |
| Servizio | `.apri`, `.apriPagine`, `.impostazioni` | apre PDF o ritaglio |

Riconoscimento ([`src/domain/sorting.ts`](../src/domain/sorting.ts)): fino a 4
chiavi per allievo (cognome+nome, nome+cognome, cognome o nome se univoci),
parola intera nel testo normalizzato; soglie e quarantena ADR-26.

### 11.6 Dettatura

| Passo | Dove | Che cosa |
|---|---|---|
| microfono | [`src/ui/assistant/voice.ts`](../src/ui/assistant/voice.ts) | PCM 16 kHz mono, tagliato alle pause |
| guardie | [`src/data/dictation.ts`](../src/data/dictation.ts) | `MOTORI = { voicebox }`; `prontezzaDettatura`: indirizzo locale, `GET /health` (3 s; un sì vale 10 s) |
| richiesta | [`src/data/voicebox.ts`](../src/data/voicebox.ts) | WAV in memoria, `POST /transcribe` (`file`, `language`, `model`), 120 s |
| risposte | | 200 testo; 202 «riprova fra poco» (voicebox scarica la taglia); 3xx rifiutato |

Niente vocabolario di scuola (voicebox non passa `initial_prompt`). ADR-35.

## 12. Scorciatoie da tastiera

| Tasti | Che cosa | Dichiarata in |
|---|---|---|
| `Ctrl+K` | ricerca / palette | `installaScorciatoie()` ([`src/ui/shortcuts.ts`](../src/ui/shortcuts.ts)); anche nei campi |
| `Ctrl+B` | mostra o nasconde la barra dei comandi | idem; non nei campi (grassetto) |
| `Ctrl+1`…`Ctrl+9` | voci della barra laterale come si vedono | `src/ui/shortcuts.ts` |
| `Alt+←`/`Alt+→`, tasti laterali del mouse | indietro/avanti | [`src/ui/history.ts`](../src/ui/history.ts) |
| `Ctrl+Z`, `Ctrl+Y` | annulla, ripristina | `tastoDellaStoria`; nei campi di testo resta quello del testo |
| `Ctrl+E` | Modifica del calendario | `calendario.editor` |
| `Ctrl+O` | Apri un anno | `file.apri` (`dalMenu`) |
| `Ctrl+S` | Salva | `file.salva`; anche nei campi |
| `Ctrl+Alt+T`, `Ctrl+Alt+N` | Oggi, Nuova lezione | `COMANDI_UI` (`dalMenu`) e `COMANDI`: un solo scatto |
| `Ctrl+Alt+R` | Mostra il registro | `registroDocenti.apri`, globale |
| `Ctrl+,` | Impostazioni | `registroDocenti.impostazioni` |
| `Ctrl+Plus`, `Ctrl+-`, `Ctrl+0`, `F11` | zoom, schermo intero | `finestra.*` (`dalMenu`) |

`installaScorciatoie()` ascolta `keydown` in cattura, solo con `Ctrl`/`Cmd` e
senza modale aperta, e salta i comandi `dalMenu`. Nel manifesto le scorciatoie
sono in grafia Electron (`CommandOrControl+…`).
