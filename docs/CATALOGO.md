# Catalogo delle funzioni — Regiklass

L'inventario di quel che l'applicazione sa fare, superficie per superficie: la
risposta a «esiste già un'azione per questo?». Le procedure dell'API, le
letture e il canale delle domande stanno in [API](API.md); entità e campi in
[MODELLO-DATI](MODELLO-DATI.md); le ragioni in [DECISIONI](DECISIONI.md). I
conteggi verificati stanno in [INDICE](INDICE.md).

## 1. Come leggere il catalogo

| Superficie | Dove è dichiarata | Che cos'è |
|---|---|---|
| Destinazioni (pagine) | [`ui/pages.ts`](../ui/pages.ts) — `PAGINE` | un posto dove *andare* |
| Viste | [`contract/protocol.ts`](../contract/protocol.ts) — `type Vista`, instradate da [`ui/shell.tsx`](../ui/shell.tsx) | lo schermo disegnato |
| Comandi dell'interfaccia | [`ui/commands.ts`](../ui/commands.ts) — `COMANDI_UI`, dalle sezioni di [`ui/commands/`](../ui/commands/) | una cosa da *fare* nel pannello |
| Comandi del programma | [`contract/manifest.ts`](../contract/manifest.ts) — `COMANDI` | voci del menu nativo, del vassoio, dei promemoria |
| Azioni del protocollo | [`contract/protocol.ts`](../contract/protocol.ts) — `type Azione` | la scrittura che attraversa il ponte |
| Procedure | [`contract/procedure/`](../contract/procedure/) | il contratto davanti alle azioni, più le letture (API § 5) |

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

- Una pagina è una destinazione, una vista uno schermo: tre `pagina.classe.*`
  aprono `docenteClasse` con `schedaDocente` diverse, `pagina.classe.check` e
  `pagina.corso.check` la stessa `check` (`ambitoCheck`), `pagina.progetti` e
  `pagina.corso.integrazione` la stessa `progetti`; le viste `allievo` e
  `docenteClasse` (scheda `todo`) si raggiungono da posti senza voce
  (`pagina.allievo`, `pagina.classe.pendenze`, in
  [`ui/place.ts`](../ui/place.ts)).
- Un comando chiama zero, una o più azioni.
- Il `dove` di un comando è una superficie: `'app'` = menu File, `'schermo'` =
  scheda Proiezione, altrimenti una `Vista`.
- Un comando non eseguibile resta spento e dice perché (`impedimento()`).
  `impedimentoDi()` guarda prima il posto (il `dove` o `vive()` nella vista
  aperta) e poi `impedimento()`.
- Ogni scrittura è un'`Azione`; il pannello non muta mai `stato.registro`.
  Quel che si chiede e basta passa da `Domanda`/`Riscontro` (API § 6).

## 2. Destinazioni (pagine)

### 2.1 Le 22 `Pagina` di `PAGINE`

| id | titolo | gruppo | vista | note |
|---|---|---|---|---|
| `pagina.oggi` | Dashboard | `agenda` | `oggi` | vista del primo avvio |
| `pagina.calendario` | Calendario | `agenda` | `calendario` | |
| `pagina.pendenze` | Pendenze | `agenda` | `todo` | conto `pendenzeDellaBarra().aperti` |
| `pagina.daSmistare` | Da smistare | `agenda` | `daSmistare` | conto `pagineDaSmistareInTutto()` |
| `pagina.corso.registro` | Lezione | `registro` | `lezione` | `vaiAlCorso()`; impedimento `senzaCorso` |
| `pagina.corso.valutazioni` | Valutazioni | `registro` | `valutazioni` | idem |
| `pagina.corso.check` | Check | `registro` | `check` | idem |
| `pagina.corso.documenti` | Documenti | `registro` | `documenti` | idem |
| `pagina.corso.overview` | Panoramica | `progettazione` | `overview` | idem |
| `pagina.corso.piani` | Piani lezione | `progettazione` | `piani` | idem |
| `pagina.corso.integrazione` | Integrazione progetti | `progettazione` | `progetti` | idem; disegna `vistaIntegrazioneProgetti()` |
| `pagina.classe.check` | Check della classe | `classe` | `check` (`ambitoCheck: 'classe'`) | |
| `pagina.classe.documenti` | Archivio documentale | `classe` | `docenteClasse` (`documenti`) | |
| `pagina.classe.assenze` | Assenze | `classe` | `docenteClasse` (`assenze`) | |
| `pagina.classe.messaggistica` | Messaggistica | `classe` | `docenteClasse` (`messaggistica`) | |
| `pagina.classi` | Classi | `anno` | `classi` | |
| `pagina.persone` | Persone | `anno` | `persone` | attiva anche su `pagina.allievo` |
| `pagina.mappa` | Mappa | `anno` | `mappa` | |
| `pagina.corsi` | Corsi | `anno` | `corsi` | |
| `pagina.progetti` | Progetti | `anno` | `progetti` | la biblioteca dell'anno, di nessun corso |
| `pagina.impostazioni` | Impostazioni | `sistema` | `impostazioni` | |
| `pagina.guida` | Guida | `sistema` | `guida` | |

`vaiA(pagina)` è l'unico ingresso di navigazione. Il gruppo `classe` esiste
solo con almeno una classe di cui si è docente (`sezioneCePer`). La vista di
ogni pagina sta in `VISTA_DELLA_PAGINA` ([`ui/place.ts`](../ui/place.ts)).

### 2.2 I sei gruppi

| `GruppoPagina` | nome | pagine |
|---|---|---|
| `agenda` | Agenda | Dashboard, Calendario, Pendenze, Da smistare |
| `registro` | Registro — *corso* | Lezione, Valutazioni, Check, Documenti |
| `progettazione` | Progettazione — *corso* | Panoramica, Piani lezione, Integrazione progetti |
| `classe` | Docente di classe — *classe* | Check della classe e le tre schede del fascicolo |
| `anno` | Anno scolastico | Classi, Persone, Mappa, Corsi, Progetti |
| `sistema` | Il programma | Impostazioni, Guida (non nel menu «File»: la barra laterale è sempre in vista) |

Ordine: `ORDINE`. L'interruttore della barra laterale sta nella sua
intestazione ([`ui/sidebar.tsx`](../ui/sidebar.tsx)).

### 2.3 Le 21 `Vista`

| `Vista` | file | schede interne |
|---|---|---|
| `oggi` | [`views/today.tsx`](../ui/views/today.tsx) | tessere (lezioni del giorno, da compilare, pendenze, da smistare), lezioni, prossime valutazioni, compleanni; nessun comando |
| `calendario` | [`views/calendar.tsx`](../ui/views/calendar.tsx), [`calendar/`](../ui/views/calendar/) | 4 modi (`MODI_CALENDARIO`): settimana, mese, anno, agenda; editor in `views/calendar/editor.tsx` |
| `todo` | [`views/todo.tsx`](../ui/views/todo.tsx) | schede «corsi» (`corso:<id>`) e, da docente di classe, «classi» (`classe:<id>`); famiglie e riassunti da `classTodo.tsx` |
| `daSmistare` | [`views/sorting/toSort.tsx`](../ui/views/sorting/toSort.tsx) | — |
| `lezione` | [`views/lesson.tsx`](../ui/views/lesson.tsx), [`lesson/`](../ui/views/lesson/) | amministrazione (appello, consegne, check, riconsegne), lezione (piano, voti, recuperi, progetto), annotazioni |
| `classi` | [`views/classes.tsx`](../ui/views/classes.tsx) | elenco + anagrafica |
| `persone` | [`views/people.tsx`](../ui/views/people.tsx) | riusa `schedaAllievo()` |
| `allievo` | [`views/student.tsx`](../ui/views/student.tsx), [`student/`](../ui/views/student/) | anagrafica, docenteClasse, materie |
| `docenteClasse` | [`views/classTeacher.tsx`](../ui/views/classTeacher.tsx) | todo, documenti, assenze, messaggistica |
| `corsi` | [`views/courses.tsx`](../ui/views/courses.tsx) | elenco + scheda con matrice |
| `piani` | [`views/plans.tsx`](../ui/views/plans.tsx) | navigatore delle ore ([`plansNavigator.tsx`](../ui/views/plansNavigator.tsx)) + editor a tutta larghezza |
| `progetti` | [`views/projects.tsx`](../ui/views/projects.tsx), [`views/projectIntegration.tsx`](../ui/views/projectIntegration.tsx), [`projects/`](../ui/views/projects/) | biblioteca: testata, fasi, criteri e livelli, corsi; integrazione: stato, compiti, fasi nei piani, matrice, esiti |
| `overview` | [`views/overview.tsx`](../ui/views/overview.tsx), [`overviewLinks.tsx`](../ui/views/overviewLinks.tsx) | lezioni, piani, progetti e risorse del corso con le linee che li collegano |
| `valutazioni` | [`views/assessments.tsx`](../ui/views/assessments.tsx), [`assessments/`](../ui/views/assessments/) | recuperi, riconsegne |
| `check` | [`views/check.tsx`](../ui/views/check.tsx) | la griglia, del corso o della classe (`ambitoCheck`); moduli in [`forms/check.tsx`](../ui/forms/check.tsx) |
| `documenti` | [`views/documents.tsx`](../ui/views/documents.tsx) | corso, lezioni, allievi |
| `mappa` | [`views/map.tsx`](../ui/views/map.tsx) | tutti, domicilio, lavoro |
| `impostazioni` | [`views/settings.tsx`](../ui/views/settings.tsx) | quattro aree (Calendario, Didattica, Utente, Programma), una pagina che scorre per area; pastiglia d'ambito su ogni blocco; «Ripristina» per area |
| `guida` | [`views/help.tsx`](../ui/views/help.tsx) | una scheda per vista |
| `modelli` | — | solo un indirizzo: Utente › Carta e stampa (`utente#stampa`) |
| `modelliLinguistici` | [`views/languageModels.tsx`](../ui/views/languageModels.tsx) | solo un indirizzo: Programma › Assistente e modelli (`programma#modelli`) |

### 2.4 File satellite

Pezzi di vista usati da più pagine: [`views/archive.tsx`](../ui/views/archive.tsx),
[`views/absences.tsx`](../ui/views/absences.tsx),
[`views/assignments.tsx`](../ui/views/assignments.tsx),
[`views/assessments/retakes.tsx`](../ui/views/assessments/retakes.tsx),
[`views/assessments/returns.tsx`](../ui/views/assessments/returns.tsx),
[`views/sorting/pageBrowser.tsx`](../ui/views/sorting/pageBrowser.tsx),
[`views/sorting/pageDrop.tsx`](../ui/views/sorting/pageDrop.tsx),
[`views/sorting.tsx`](../ui/views/sorting.tsx),
[`views/classTodo.tsx`](../ui/views/classTodo.tsx),
[`views/documents/`](../ui/views/documents/) (anteprima, CSV, schede),
[`views/settings/`](../ui/views/settings/) (anno, documento, giornata,
liste, posta, programma, sezioni).

## 3. Comandi dell'interfaccia

`COMANDI_UI` in [`ui/commands.ts`](../ui/commands.ts), concatenato dalle sezioni di
[`ui/commands/`](../ui/commands/) (una per file, con i testi accanto): letterali più
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
  fuoriMenu?: boolean | (() => boolean) // 'app' ma non nel menu «File»
  primario?: boolean | (() => boolean)
  acceso?: () => boolean          // interruttore
  impedimento?: () => string | null
  soloSe?: () => boolean          // falso: nella sua pagina non compare
  al: () => void | Promise<unknown>
}
```

- I comandi `dalMenu` li esegue il menu nativo; per `registro.oggi` e
  `registro.nuovaLezione` l'host manda un `naviga`, che `eseguiNavigazione()`
  ([`ui/main.tsx`](../ui/main.tsx)) riporta allo stesso gesto. Con una
  modale aperta un `naviga` si ignora.
- Nelle tabelle: ◐ = interruttore, ★ = primario.

### 3.1 Il documento, l'anno, la manutenzione (`dove: app`)

| id | titolo | che cosa fa |
|---|---|---|
| `file.apri` ★ | Apri un anno… (`Ctrl+O`, `dalMenu`) | `documento.apri` |
| `file.apriDaOneDrive` | Apri da OneDrive… | `apriOneDrive()`: `onedrive.elenco`, `onedrive.cerca`, poi `onedrive.apri` |
| `file.importaRegistro` | Importa da un altro registro… | `moduloImportaRegistro()`: `registro.sfoglia`, `registro.altrove`, poi `registro.importa` |
| `file.salva` | Salva / Salva l'anno con nome… (`Ctrl+S`) | `stato.salva`; primario con un anno provvisorio |
| `file.ricarica` | Ricarica | `stato.ricarica` |
| `file.chiudi` | Chiudi l'anno | `documento.chiudi` |
| `file.cartella` | Apri la cartella del file | `sistema.apriCartella` |
| `file.informazioni` | Informazioni documento… | `apriInformazioniDocumento()` |
| `file.nuovoAnno` | Nuovo anno scolastico | `moduloAnno()`; primario senza anno |
| `file.modificaAnno` | Modifica l'anno | `moduloAnno(anno)` |
| `file.pause` | Vacanze e sospensioni | `moduloPause(anno)` |
| `file.ripara` | Ripara il registro | `manutenzione.ripara`; spento se non c'è niente da riparare |
| `file.collegaPosta`, `file.provaPosta`, `file.provaInvioPosta`, `file.scollegaPosta` | Posta | `posta.collega`, `posta.prova`, `posta.invioProva`, `posta.scollega` |
| `file.accountPosta` | Account e posta (`fuoriMenu`) | apre Utente › Account (`utente#account`) |
| `finestra.ingrandisci`, `finestra.riduci`, `finestra.dimensioneNormale` | zoom (`Ctrl+Plus`, `Ctrl+-`, `Ctrl+0`, `dalMenu`) | `finestra.zoom` |
| `finestra.schermoIntero` | Schermo intero (`F11`, `dalMenu`) | `finestra.schermoIntero` |
| `finestra.esci` | Esci dal registro | `programma.esci` |
| `modifica.annulla` | Annulla (`Ctrl+Z`) | `storia.annulla`; storia in memoria ([`core/dati/history.ts`](../core/dati/history.ts)), in un campo di testo resta l'annulla del testo |
| `modifica.ripristina` | Ripristina (`Ctrl+Y`, `Ctrl+Maiusc+Z`) | `storia.ripristina` |
| `proiezione.schermo` ★◐ | Proietta / Spegni lo schermo | `proiezione.apri` / `proiezione.chiudi` |
| `calendario.editor` ◐ | Modifica (`Ctrl+E`) | modo del registro: arma la griglia del calendario, rende modificabili le lezioni esistenti, mostra «Nuova lezione» e i comandi ICS |

Impostazioni: nessun comando; le quattro aree stanno nella testata, le sezioni
nell'indice a sinistra (`AREE`, `SEZIONI` in [`ui/views/settings/sections.ts`](../ui/views/settings/sections.ts)).

### 3.2 Calendario (`dove: calendario`)

| id | titolo | che cosa fa |
|---|---|---|
| `registro.oggi` ★ | Oggi (`Ctrl+Alt+T`, `dalMenu`) | `vaiAOggi()`, e nella settimana scorre all'ora di adesso |
| `calendario.indietro`, `calendario.avanti` | Indietro, Avanti | `scorriCalendario(±1)` |
| `registro.oraDaCompilare` | Lezione da compilare / Prossima lezione | apre la lezione di `oraDaFare()`; anche su `lezione` |
| `calendario.settimana`, `.mese`, `.anno`, `.agenda` ◐ | i quattro modi | `scegliModoCalendario()` |
| `calendario.esterno` ◐ | Calendario ICS | mostra gli eventi ICS; `soloSe` settimana e modifica |
| `registro.nuovaLezione` ★ | Nuova lezione (`Ctrl+Alt+N`, `dalMenu`) | `moduloLezione()`; `soloSe` modifica |
| `calendario.aggiornaIcs` | Aggiorna ICS | `calendario.aggiornaTutti`; `soloSe` settimana, modifica e ICS acceso |
| `registro.confrontaCalendario` | Confronta con il calendario | `moduloCalendariIcs()`; `soloSe` modifica e ICS acceso |

Sabato e domenica si accendono dai «Giorni mostrati» delle impostazioni.
In modifica (`views/calendar/editor.tsx`): clic sceglie, sul vuoto si disegna a UD
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
| `lezione.supplenza` | `lezione` | Prepara la supplenza | `moduloSupplenza()` → `supplenza.prepara`; non su un'ora annullata |
| `piano.vaiAlRegistro` ★ | `piani` | Vai al registro | apre la prima ora del piano |
| `piano.duplica` | `piani` | Duplica | `piano.duplica` |
| `piano.elimina` | `piani` | Elimina | `chiediEliminazione` → `piano.elimina` |
| `corso.nuovaOra` | `piani`, `valutazioni` | Ora in questo corso | `moduloLezione({corsoId})` |
| `check.nuovaColonna` ★ | `check` del corso | Aggiungi una colonna | `moduloColonnaCheck()` → `check.colonne` |
| `check.colonne` | `check` del corso | Colonne | `moduloColonneCheck()` → `check.colonne` (conferma se cadono spunte) |

### 3.4 Progetti (`dove: progetti`)

[`ui/commands/projects.ts`](../ui/commands/projects.ts). La vista è una sola:
`soloSe` separa la biblioteca (`pagina.progetti`) dall'integrazione nel corso
(`pagina.corso.integrazione`).

| id | pagina | titolo | che cosa fa |
|---|---|---|---|
| `progetto.nuovo` ★ | tutte e due | Nuovo progetto | `moduloProgetto()`; nell'integrazione nasce già integrato nel corso (impedimento `senzaCorso`); primario nella biblioteca |
| `progetto.modifica` | biblioteca | Modifica | `moduloProgetto({progetto})` |
| `progetto.fasi`, `.criteri`, `.livelli` | biblioteca | Fasi, Criteri, Livelli | `moduloFasi()`, `moduloCriteri()`, `moduloLivelli()` → `progetto.salva` |
| `progetto.elimina` | biblioteca | Elimina | `chiediEliminazione` → `progetto.elimina` |
| `progetto.nuovoCompito` ★ | integrazione | Nuovo compito | `nuovoCompito()` → `progetto.compito.salva` |

### 3.5 Mappa, persone, docente di classe

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
| `docente.assenze` ★ | `assenze` | Nuovo periodo | `moduloBloccoAssenze()` |
| `docente.comunicazione` ★ | `messaggistica` | Nuova comunicazione | `moduloComunicazione()` |
| `docente.recapito` | `messaggistica` | Nuovo recapito | `moduloRecapito()` |

### 3.6 Proiezione (`dove: schermo`)

| id | titolo | che cosa fa |
|---|---|---|
| `proiezione.pausa` ◐ | Pausa / Riprendi | `proiezione.impostazioni` (`sospesa`) |
| `proiezione.indietro`, `proiezione.avanti` | scheda precedente, successiva | `aperto: bloccoScorrendo(±1)` |
| `proiezione.nomi` ◐ | Nomi visibili / Senza nomi | `nomi` |
| `proiezione.misure` ◐ | Misure strette / larghe | `compatta` |
| `proiezione.blocco.*` ◐ | `scaletta`, `argomenti`, `consegne`, `calendario`, `valutazioni`, `documenti`, `appello` | apre o spegne il blocco; gli ultimi tre sono riservati (`BLOCCHI_RISERVATI`) e partono spenti |
| `proiezione.calendario.*` ◐ | `settimana`, `mese`, `anno`, `agenda` | `calendario` del blocco Calendario |

### 3.7 Documenti (`dove: documenti`)

| id | titolo | che cosa fa |
|---|---|---|
| `documenti.scheda.corso`, `.lezioni`, `.allievi` ◐ | Corso, Lezioni, Persone | `schedaDocumenti` |
| `documenti.aggiornaTutto` ★ | Aggiorna tutto | `rapporto.completo` |
| `documenti.rifare.mai`, `.chiusura`, `.sempre` ◐ | Solo a mano, Chiusura lezione, A ogni modifica | `impostazioni.salva` con `pdfAutomatici`: l'unico comando della barra che scrive un'impostazione del documento |

## 4. Comandi del programma

`COMANDI` in [`contract/manifest.ts`](../contract/manifest.ts), registrati da
[`desktop/boot.ts`](../desktop/boot.ts) con `apparato.comandi.registra`. Il menu
nativo li dispone secondo `GRUPPI` di
[`desktop/shell/windows/menu.ts`](../desktop/shell/windows/menu.ts) (un comando non nominato
finisce sotto «Altro»); il vassoio ([`desktop/widget/tray.ts`](../desktop/widget/tray.ts)) ne espone
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
| `registroDocenti.chiudiDocumento` | Chiudi l'anno (implementato in `desktop/shell/main.ts`) | |
| `registroDocenti.informazioniDocumento` | Informazioni documento… (il dialogo del pannello) | |
| `registroDocenti.account` | Account e posta… (Utente › Account; nel menu solo con un documento aperto) | |
| `registroDocenti.provaPosta`, `provaInvioPosta`, `collegaPosta`, `scollegaPosta`, `azzeraPosta` | posta (nel menu solo senza documento aperto) | |
| `registroDocenti.apriCartellaDati` | Apri la cartella dei dati | |

Registrati fuori dal manifesto, come servizi: `registroDocenti.esci`,
`registroDocenti.benvenuto`, `registroDocenti.creaAnnoNuovo`,
`registroDocenti.ricordaDocumento`, `registroDocenti.mostraDocumento` (lettore
PDF interno, `desktop/shell/windows/reader.ts`) in `desktop/shell/main.ts`;
`registroDocenti.apriDocumento`, `registroDocenti.impostazioniFinestra` in
`desktop/shell/windows/menu.ts`.

## 5. Impostazioni

| | Programma (macchina) | Documento |
|---|---|---|
| Dichiarate in | [`contract/manifest.ts`](../contract/manifest.ts) — `IMPOSTAZIONI` | [`core/dominio/models.ts`](../core/dominio/models.ts) — `Impostazioni` |
| Scritte in | `impostazioni.json` in `userData` | il `.regi`, collezione `registro` |
| Si scrivono con | `programma.salva`, `programma.azzera`, `programma.sfoglia` | `impostazioni.salva` |
| Arrivano al pannello in | `MessaggioStato.programma` (`VoceProgramma`, con `scritta`) | `MessaggioStato.registro.impostazioni` |
| Predefiniti | `predefinitiImpostazioni()` | `IMPOSTAZIONI_PREDEFINITE` ([`core/dominio/factories.ts`](../core/dominio/factories.ts)) |

- Ogni valore passa dalla dogana `valoreConMotivo(chiave, valore)`
  ([`desktop/apparato/settings.ts`](../desktop/apparato/settings.ts)).
- Formati: `cartella`/`eseguibile`/`file` si scelgono con «Sfoglia…»
  (`programma.sfoglia`); `modello` solo dalle righe d'uso di Programma ›
  Assistente e modelli (`CHIAVI_IN_SCHEDA`), altrove in sola lettura, e la
  dogana vuole il nome nudo di un `.gguf` (`nomeDiModello`,
  [`core/dati/ggufName.ts`](../core/dati/ggufName.ts)); `indirizzoLocale` solo
  `http` di questo computer ([`core/dominio/loopback.ts`](../core/dominio/loopback.ts)),
  oggi senza chiavi. `scelte` con `sceltaLibera`: le scelte con un nome passano
  così, il resto passa dal `formato` (`ocr.lettore`).
  Le voci `avanzata` stanno in «Avanzate (n)», chiuse in fondo alla sezione (e al
  gruppo nella finestra nativa); si aprono a mano. `alProssimoAvvio`: pastiglia
  «al prossimo avvio» in tutte e due le superfici.
- Come si disegna: `controllo` (`segmenti`/`tendina`/`cursore`), `passo` (1 se
  non detto: numeri interi, e la dogana lo vuole), `unita`, `scelteDinamiche`
  con `sceltaLibera`. Dal manifesto a `VoceProgramma`, uguali per le due
  superfici (ADR-52).
- Dal condotto non si toccano `registroDocenti.api.*`, `ocr.lettore`,
  `ocr.modello`, `ocr.proiettore`, `assistente.modello`, `dettatura.porta`
  (API § 7), né le chiavi di prima che le precedevano.
- «Ripristina» è per area e tocca solo le voci degli elenchi (`daRipristinare`
  in [`sections.ts`](../ui/views/settings/sections.ts)): mai quelle
  delle schede dedicate (`CHIAVI_IN_SCHEDA`) né quelle del collegamento
  (`CHIAVI_DEL_COLLEGAMENTO`).
- Il procedimento per aggiungerne una: skill `impostazione`.
- Le impostazioni del documento, campo per campo: MODELLO-DATI § 3.44.

### 5.1 Le 31 chiavi del programma

Sezioni con chiavi (`DIVISIONI` in
[`core/controlli/areas.ts`](../core/controlli/areas.ts), le stesse per pannello e
finestra nativa): Utente › Posta; Programma › Aspetto, Avvio e promemoria,
Assistente e modelli, Aggiornamenti, Avanzate (id `condotto`: integrazione di
sistema e condotto). Utente › Account non ha chiavi: gli account stanno nel
portachiavi (ADR-49). Una chiave va alla divisione col prefisso più lungo.

| chiave `registroDocenti.…` | tipo, predefinito | che cosa regola |
|---|---|---|
| `aspetto.lingua` | `sistema` \| `it` \| `de` \| `fr` \| `en`; `sistema` | lingua (ADR-38) |
| `aspetto.tema` | `sistema` \| `chiaro` \| `scuro`; `sistema` | tema, via `nativeTheme.themeSource` |
| `vassoio.attivo` | bool; `true` | icona accanto all'orologio (`alProssimoAvvio`) |
| `vassoio.chiusuraNelVassoio` | bool; `true` | chiudendo resta nel vassoio; dipende da `vassoio.attivo` |
| `avvio.conWindows` | bool; `false` | avvio con il computer: senza finestre con l'icona, con la finestra senza |
| `avvio.integrazioneSistema` | bool; `true` | associazione `.regi`, `regi` nel PATH, identità delle notifiche (`alProssimoAvvio`; Programma › Avanzate) |
| `avvio.soloVassoio` | bool; `false` | parte senza aprire il registro; dipende da `vassoio.attivo` |
| `promemoria.avviso` | `nessuno` \| `0` \| `2` \| `5` \| `10` \| `15`; `5` | notifica prima di una lezione, minuti di anticipo; `nessuno` la spegne |
| `proiezione.schermoIntero` | bool; `false` | proiezione a schermo intero |
| `posta.mittente` | email; `''` | «Da» (vuoto = il nome d'accesso) |
| `posta.utente` | email; `''` | nome d'accesso (vuoto = il mittente) |
| `posta.invioDiretto` | bool; `false` | spedisce invece di preparare bozze, con conferma |
| `recapiti.telefono` | `tel` \| `msteams` \| `skype` \| `callto` \| `nessuno`; `tel` | come si compone un numero (`sistema.chiama`) |
| `recapiti.posta` | `sistema` \| `outlook` \| `outlookWeb` \| `nessuno`; `sistema` | come si apre una mail (`sistema.scrivi`); `outlook` trova `OUTLOOK.EXE` da sé |
| `supplenza.segretariato` | email; `''` | il destinatario proposto nel modulo «Prepara la supplenza» quando non si sa ancora chi la farà; vuoto: lo si scrive ogni volta |
| `modelli.cartella` | cartella; `''` | dove stanno i `.gguf` |
| `ocr.attivo` | bool; `false` | lettura delle scansioni; richiede `ocr.modello` e `ocr.proiettore` |
| `ocr.modello`, `ocr.proiettore` | modello; `''` | nomi di file nella cartella dei modelli (`llm.scegli`) |
| `ocr.lettore` | `''` \| `nessuno` \| un `.exe` (eseguibile, `sceltaLibera`); `''` | «Programma di lettura»: `''` lo scarica il registro, `nessuno` non scarica, un percorso è «questo .exe» |
| `assistente.attivo` | bool; `false` | l'assistente; richiede `assistente.modello` |
| `assistente.modello` | modello; `''` | il `.gguf` che risponde |
| `dettatura.attivo` | bool; `false` | microfono nell'assistente, via voicebox; dipende da `assistente.attivo` |
| `dettatura.taglia` | `turbo` \| `large` \| `medium` \| `small` \| `base`; `turbo` | modello Whisper di voicebox |
| `dettatura.porta` | numero 1–65535, avanzata; `17493` | la porta di voicebox; l'host è fisso, `127.0.0.1` (ADR-35) |
| `aggiornamenti.controlloAutomatico` | bool; `false` | controllo all'avvio e ogni sei ore |
| `aggiornamenti.scaricoAutomatico` | bool; `true` | scarica senza chiedere |
| `aggiornamenti.installaAllaChiusura` | bool; `true` | installa all'uscita |
| `api.accesso` | `spento` \| `lettura` \| `letturaScrittura`; `spento` | il condotto locale e quel che concede |

- `CHIAVI_DISMESSE`: le chiavi tolte che `ritiraChiaviDismesse()` cancella da un
  `impostazioni.json` vecchio (attese diventate costanti, vecchia dettatura
  whisper.cpp, agenda sul desktop, `aperturaAutomatica`,
  `recapiti.outlook`, la vecchia posta a mano `posta.server`/`porta`/…). Le chiavi
  accorpate (`api.condotto`/`lettura`/`scrittura` → `api.accesso`,
  `promemoria.attivo`/`anticipoMinuti` → `promemoria.avviso`,
  `modelli.scaricoAutomatico`/`ocr.programma` → `ocr.lettore`,
  `dettatura.indirizzo` → `dettatura.porta`) passano prima da
  `MIGRAZIONI`: il file vecchio si legge già come nuovo. `ritiraCorredoWhisper()`
  ([`core/dati/dictation.ts`](../core/dati/dictation.ts)) cancella la vecchia
  cartella della dettatura.
- Stato, non opzioni (fuori dal manifesto): `registroDocenti.ultimoDocumento`,
  `registroDocenti.cartellaLavoro`.

## 6. Azioni del protocollo

Le 193 varianti di `type Azione` ([`contract/protocol.ts`](../contract/protocol.ts)),
una per gestore in [`core/azioni/`](../core/azioni/); `GESTORI` in
[`contract/switchboard.ts`](../contract/switchboard.ts) (il compilatore vieta azioni senza
gestore e viceversa). Ognuna ha una procedura davanti (ADR-27): `azione →
procedura` quando il nome cambia, altrimenti il nome è lo stesso. Il conteggio
lo tiene `tests/api/coverage.test.mjs`.

| File | Azioni |
|---|---|
| [`register.ts`](../core/azioni/register.ts) | `stato.leggi`, `stato.ricarica`, `anno.crea`→`anni.crea`, `anno.salva`→`anni.salva`, `anno.calendario`→`anni.calendario`, `anno.settimana`→`anni.settimana`, `materia.salva`→`materie.salva`, `materia.elimina`→`materie.elimina`, `materia.unisci`→`materie.unisci`, `corso.crea`→`corsi.crea`, `corso.salva`→`corsi.salva`, `corso.elimina`→`corsi.elimina`, `orario.imposta`, `orario.genera`, `classe.salva`→`classi.salva`, `classe.modifica`→`classi.modifica`, `classe.elimina`→`classi.elimina`, `allievo.elimina`→`persone.elimina`, `allievo.foto.imposta`→`persone.foto.imposta`, `allievo.foto.togli`→`persone.foto.togli`, `classe.duplica`→`classi.duplica`, `classe.importa`→`classi.importa`, `registro.importa`, `allievi.importa`→`persone.importa` |
| [`hours.ts`](../core/azioni/hours.ts) | `lezione.salva`→`ore.salva`, `lezione.elimina`→`ore.elimina`, `lezione.togliNelleChiusure`→`ore.chiusure.togli`, `lezione.duplica`→`ore.duplica`, `lezione.stato`→`ore.stato`, `lezione.sposta`→`ore.sposta`, `lezione.testi`→`ore.testi`, `presenze.ud`→`ore.appello.casella`, `presenze.riga`→`ore.appello.riga`, `presenze.colonna`→`ore.appello.colonna`, `presenze.tutti`→`ore.appello.tutti`, `presenze.campi`→`ore.appello.campi`, `osservazione.cella`→`ore.comportamento.cella`, `osservazione.salva`→`ore.osservazione.salva`, `osservazione.elimina`→`ore.osservazione.elimina` |
| [`plans.ts`](../core/azioni/plans.ts) | `piano.salva`→`piani.salva`, `piano.elimina`→`piani.elimina`, `piano.duplica`→`piani.duplica`, `piano.assegna`→`piani.assegna`, `risorsa.aggiungi`→`risorse.aggiungi`, `risorsa.salva`→`risorse.salva`, `risorsa.sposta`→`risorse.sposta`, `risorsa.elimina`→`risorse.elimina`, `risorsa.apri`→`risorse.apri`, `avanzamento.imposta` |
| [`assessments.ts`](../core/azioni/assessments.ts) | `valutazione.daAttivita`→`valutazioni.daAttivita`, `valutazione.salva`→`valutazioni.salva`, `valutazione.elimina`→`valutazioni.elimina`, `valutazione.eliminaOrfane`→`valutazioni.eliminaOrfane`, `voto.imposta`→`valutazioni.voto.imposta`, `valutazione.riconsegna`→`valutazioni.riconsegna`, `recupero.imposta`→`valutazioni.recupero.imposta`, `voto.riconsegna`→`valutazioni.voto.riconsegna`, `allegato.aggiungi`→`valutazioni.allegato.aggiungi`, `allegato.apri`→`valutazioni.allegato.apri`, `allegato.elimina`→`valutazioni.allegato.elimina` |
| [`assignments.ts`](../core/azioni/assignments.ts) | `consegna.salva`, `.elimina`, `.spunta`, `.spuntaTutti`, `.raccogli`, `.documento.allega`, `.documento.apri`, `.documento.togli`, `.consegnato`, `.distribuisci` → `consegne.*` |
| [`classTeacher.ts`](../core/azioni/classTeacher.ts) | `consegna.firme.aggiungi`, `.firme.apri`, `.firme.togli`, `.file.apri`, `.file.togli` → `consegne.*`; `recapito.salva`, `.elimina` → `classe.recapiti.*`; `comunicazione.salva`, `.elimina`, `.invia`, `.spunta` → `classe.comunicazioni.*`; `assenze.salva`, `.elimina`, `.foglio.aggiungi`, `.importa`, `.foglio.apri`, `.foglio.togli`, `.invia`, `.spunta` → `classe.assenze.*` |
| [`sorting.ts`](../core/azioni/sorting.ts) | `smistamento.carica`→`smistamento.pdf.carica`, `.deposita`→`.pdf.deposita`, `.cassetta.assorbi`, `.dividi`→`.pdf.dividi`, `.attribuisci`→`.pdf.attribuisci`, `.apri`→`.pdf.apri`, `.elimina`→`.pdf.elimina`, `.assegnaPagine`→`.pagine.assegna`, `.assegnaManuale`→`.pagine.assegnaManuale`, `.scartaPagine`→`.pagine.scarta`, `.apriPagine`→`.pagine.apri`, `.riprendiPagine`→`.pagine.riprendi`, `.confermaTutto`→`.bozza.conferma`, `.assegnaAssenze`→`.assenze.assegna`, `.assegnaFirme`→`.firme.assegna`, `.leggiPagine`→`.lettura.pagine`, `.leggiTutto`→`.lettura.tutto`, `.rileggiAttive`→`.lettura.attive`, `.fermaLettura`→`.lettura.ferma`, `.impostazioni`→`.lettura.impostazioni` |
| [`system.ts`](../core/azioni/system.ts) | `impostazioni.salva`, `programma.salva`, `programma.sfoglia`, `programma.azzera`, `esporta.valutazioni`, `esporta.presenze`, `esporta.lezione`, `manutenzione.ripara`, `sistema.apriCartella`, `finestra.zoom`, `finestra.schermoIntero`, `programma.esci`, `sistema.chiama`, `sistema.scrivi`, `posta.prova`, `posta.invioProva`, `posta.collega`, `posta.scollega`, `posta.azzera`, `sistema.messaggio` |
| [`microsoft.ts`](../core/azioni/microsoft.ts) | `microsoft.aggiungi`, `microsoft.togli`, `onedrive.apri` |
| [`calendar.ts`](../core/azioni/calendar.ts) | `calendario.aggiungi`, `calendario.aggiorna`, `calendario.aggiornaTutti`, `calendario.modifica`, `calendario.togli`, `calendario.applica` |
| [`check.ts`](../core/azioni/check.ts) | `check.colonne`, `check.spunta`, `check.data`, `check.lezione` |
| [`projects.ts`](../core/azioni/projects.ts) | `progetto.salva`, `.elimina`, `.integra`, `.integrazione.stato`, `.integrazione.togli`, `.cella`, `.compito.salva`, `.compito.elimina`, `.compito.inizia`, `.compito.togliInizio`, `.compito.proroga`, `.compito.fatto`, `.compito.fattoTutti`, `.giudizio.salva`, `.giudizio.elimina` → `progetti.*` |
| [`documents.ts`](../core/azioni/documents.ts) | `stato.salva`, `documento.apri`, `documento.chiudi`, `documento.preferito`, `documento.dimentica` |
| [`exports.ts`](../core/azioni/exports.ts) | `esportazione.apri`, `.mostra`, `.elimina` → `esportazioni.*` |
| [`reports.ts`](../core/azioni/reports.ts) | `rapporto.genera`, `rapporto.completo` → `rapporti.*` |
| [`substitute.ts`](../core/azioni/substitute.ts) | `supplenza.prepara` |
| [`llm.ts`](../core/azioni/llm.ts) | `llm.scarica`, `llm.annulla`, `llm.importa`, `llm.elimina`, `llm.scegli` |
| [`updates.ts`](../core/azioni/updates.ts) | `aggiornamenti.controlla`, `aggiornamenti.scarica`, `aggiornamenti.installa`, `aggiornamenti.nascondiNotizia` |
| [`templates.ts`](../core/azioni/templates.ts) | `intestazione.logo`, `intestazione.togliLogo` |
| [`projection.ts`](../core/azioni/projection.ts) | `proiezione.apri`, `proiezione.chiudi`, `proiezione.mira`, `proiezione.impostazioni` (nessuna tocca il `Registro`) |
| [`history.ts`](../core/azioni/history.ts) | `storia.annulla`, `storia.ripristina` (con `conflitto` se le collezioni sono cambiate per un'altra strada) |
| [`assistant.ts`](../core/azioni/assistant.ts) | `assistente.stacca`, `assistente.contesto` |
| [`view.ts`](../core/azioni/view.ts) | `vista.apri` |
| [`map.ts`](../core/azioni/map.ts) | `mappa.geocodifica` |

Helper comuni in [`core/azioni/context.ts`](../core/azioni/context.ts):
`fatto`, `invariato`, `rifiuta`, `conMessaggio`, `riponi` (upsert per id),
`apriFile`, `cestina`, `scegliFile`, `lanciaComando`; `Archivio.vietaSeInChiusura`
in [`core/dati/archive.ts`](../core/dati/archive.ts).

Comportamenti da sapere:

- **Idempotenti per progetto**: `corso.crea` (stessa coppia → id esistente),
  `valutazione.daAttivita`, `orario.genera` (quel che c'è non si tocca),
  `calendario.applica` (tutto o niente; non cancella mai lezioni).
- **Aprono un dialogo** (e da uno script aspettano una persona): API § 7.
- **Scrive con `archivio.modifica` diretto**, fuori da `contesto.modifica`, solo
  `chiudiSeFinito` di `sorting.ts` (lo smistamento finito, non annullabile).
- **File prima del registro**: le rimozioni cestinano il file e poi tolgono la
  riga; le aggiunte copiano il file e poi scrivono.
- `lezione.stato` a `svolta` inizializza l'appello vuoto e rifà subito i
  documenti del corso (`aggiornaDopoChiusura` in `reportsRefresh.ts`).
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
  `MessaggioStato.posta` e `MessaggioStato.microsoft` (indirizzi, nessun gettone).

Le letture (senza azione): API § 5.

## 7. Messaggi host → pannello

In [`contract/protocol.ts`](../contract/protocol.ts); `MessaggioVersoWebview` è la loro
unione. Stesso canale `registro:messaggio`; il pannello li distingue da `tipo`
([`ui/bridge.ts`](../ui/bridge.ts)). In salita: `Richiesta { id, azione }`
(in coda) e `Domanda { id, procedura, ingresso? }` (fuori coda); un solo
contatore di `id`.

| Messaggio | `tipo` | Da chi | Quando |
|---|---|---|---|
| `Risposta` | `'risposta'` | `desktop/pannelli/panel.ts` | dopo ogni `Richiesta`, **dopo** l'eventuale `MessaggioStato` |
| `Riscontro` | `'riscontro'` | `rispondiDomanda()` | dopo ogni `Domanda` (API § 6) |
| `MessaggioStato` | `'stato'` | `desktop/pannelli/panel.ts` | il registro intero: alla nascita del pannello, a pagina ricaricata (`stato.leggi`), quando la pagina lo chiede (`ChiestaStatoIntero`, `'stato.intero'`), dopo un registro riletto (documento aperto, file cambiato fuori), con `REGISTRO_STATO_INTERO=1` |
| `MessaggioDifferenze` | `'differenze'` | `desktop/pannelli/panel.ts` | ogni altra spinta: dopo ogni azione che cambia qualcosa, annulla e ripristina, cambi di impostazioni o di documenti recenti |
| `MessaggioNavigazione` | `'naviga'` | `apriRegistro()` (menu, vassoio, promemoria) | per aprire il pannello su un posto; in attesa finché il pannello non manda `stato.leggi` |
| `MessaggioNotifica` | `'notifica'` | `PannelloRegistro.avvisa()` | errori non legati a una richiesta |
| `MessaggioLavoro` | `'lavoro'` | lo smistatore ([`core/dati/sorter.ts`](../core/dati/sorter.ts)) | a ogni pagina letta dall'OCR |
| `MessaggioProiezione` | `'proiezione'` | `desktop/pannelli/projection.ts` | alla proiezione: solo i blocchi accesi |
| `MessaggioStatoProiezione` | `'proiezione.stato'` | `desktop/pannelli/projection.ts` | al pannello: proiezione aperta, chiusa o cambiata |
| `MessaggioAggiornamenti`, `MessaggioScarico` | | aggiornamenti e scarichi dei modelli | stato già detto a parole |
| `MessaggioAssistente`, `MessaggioStatoAssistente`, `MessaggioDettatura` | | `desktop/pannelli/` | un giro dell'assistente e la dettatura (API § 9) |

- **`Risposta`**: `id`, `ok`, `errori?`, `codice?`, `creato?: { id }` (l'entità
  nata), `documento?` (percorso scritto da `rapporto.genera`), `messaggio?`
  (`{ livello, testo }`). Nessun timeout lato pannello.
- **`MessaggioStato`**: `registro` (intero) e la sua `revisione`, più il
  contorno che viaggia a ogni spinta: `programma: VoceProgramma[]`,
  `avvisi`, `radiceDati`, `radiceApp`,
  `ocrAttivo`, `posta` (`exchange`, `server`, `invioDiretto`, `mittente`,
  `accesso`), `documenti` (`corrente`, `elenco` con `preferito`, `mancante`),
  `esportati` e `archiviati` (`{ percorso, misura, revisione }`),
  `storia` (i due conti di annulla/ripristina).
- **`MessaggioDifferenze`**: lo stesso contorno, e al posto del registro le
  patch di immer (`patch`, `collezioni`) che lo portano dalla revisione `da`
  a `revisione`; vuote se è cambiato solo il contorno. La pagina le applica
  (`ui/statePatches.ts`) solo se ha la revisione `da`: altrimenti le scarta e
  manda `{ tipo: 'stato.intero' }`, e la spinta dopo è un `MessaggioStato`.
- **`MessaggioNavigazione`**: `vista`, `elementoId?` (il contesto si risale da
  sé), `data?`, `nuovo?` (apre il modulo di creazione; mai dall'assistente),
  `importa?`, `dialogo?` (apre un dialogo sopra la pagina di adesso, `vista`
  ignorata), `impostazioni?` (indirizzo `<area>#<voce>` con `vista:
  'impostazioni'`).
- **`MessaggioLavoro`**: `corrente`, `fatte`, `totale`, `coda`.
- **`MessaggioStatoProiezione.impostazioni`**: `blocchi`, `aperto`, `sospesa`,
  `nomi`, `compatta`, `calendario`. La proiezione non rimanda niente indietro.

## 8. Canali del guscio

Sullo stesso `registro:messaggio`, filtrati per `evento.sender.id`, convivono
sotto-protocolli con un discriminante di stringa e type guard scritti a mano.

| Sotto-protocollo | Discriminante | File |
|---|---|---|
| Pannello e proiezione | forma `Richiesta`/`Domanda` | [`desktop/apparato/windows.ts`](../desktop/apparato/windows.ts) |
| Benvenuto | `benvenuto: '…'` | [`desktop/shell/windows/welcome.ts`](../desktop/shell/windows/welcome.ts), [`desktop/shell/pages/welcome/welcome.html`](../desktop/shell/pages/welcome/welcome.html) |
| Impostazioni | `impostazioni: '…'` | [`desktop/shell/windows/menu.ts`](../desktop/shell/windows/menu.ts), [`desktop/shell/pages/settings/settings.tsx`](../desktop/shell/pages/settings/settings.tsx) |
| Dialogo | `dialogo: '…'` | [`desktop/apparato/dialogs.ts`](../desktop/apparato/dialogs.ts), [`desktop/shell/pages/dialog/dialog.html`](../desktop/shell/pages/dialog/dialog.html) |

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
da `chiediMessaggio` in `desktop/apparato/dialogs.ts` (pagina
`desktop/shell/pages/dialog/`); nativi restano solo gli errori prima che una finestra
possa nascere.

### 8.4 `registro:interfaccia` (sincrono)

`sendSync('registro:interfaccia', 'leggi' | 'scrivi', nuovo?)` dal preload: lo
stato di visualizzazione della finestra (`StatoPersistito`: vista, schede,
filtri, id scelti), gestito da `gestisciStatoInterfaccia` in
[`desktop/apparato/windows.ts`](../desktop/apparato/windows.ts). Non sono dati del
registro.

### 8.5 Le 4 autorità di `registro://`

[`desktop/shell/protocol/fileProtocol.ts`](../desktop/shell/protocol/fileProtocol.ts):
`privilegiaSchema()` prima di `whenReady`, poi `registraProtocollo()`.

| Autorità | Forma | Serve |
|---|---|---|
| `pagina` | `registro://pagina/<id>` | l'HTML in memoria di una `VistaWeb` (`htmlDellaPagina`) |
| `app` | `registro://app/dist/…` | bundle e pagine native, dentro `radiciConcesse()` |
| `dati` | `registro://dati/<percorso>` | file del documento, materializzati su richiesta |
| `mappa` | `registro://mappa/<z>/<x>/<y>.png` | tasselli ([`desktop/shell/protocol/tiles.ts`](../desktop/shell/protocol/tiles.ts)), zoom ≤ 19 |

Difese: segmenti `.`/`..` rifiutati dopo `decodeURIComponent`; `concesso()`;
CORS solo verso `registro://`; streaming con `net.fetch`.

## 9. Rapporti e modelli di stampa

### 9.1 I 13 `GenereRapporto`

In [`core/dominio/locations.ts`](../core/dominio/locations.ts); dati da
[`core/dominio/reportData/`](../core/dominio/reportData/index.ts), PDF da
[`core/dati/reportsPdf.ts`](../core/dati/reportsPdf.ts).

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
| `diario` | `classe/` | Diario, semestre o «anno intero» | PDF |
| `corso` | `classe/` | Corso (scheda del corso), semestre o «anno intero» | PDF |
| `supplenze` | `classe/` | Supplenze, semestre o «anno intero» (modello `scheda-corso`) | PDF |
| `progetto-classe` | `classe/` | Progetto, titolo (`(n)` fra omonimi nel corso) | PDF |
| `progetto-allievo` | `allievi/<Cognome Nome>/` | Progetto, persona e titolo | PDF |

- I due datati fanno una copia al giorno e sono esclusi da
  `percorsiDiUnDocumento`.
- `percorsoDi(collocazione, estensione)` produce anche CSV e Markdown;
  `precedentiDi` riconosce i nomi vecchi (`DOCUMENTO_SCHEDE_PRIMA`).
- Rigenerazione automatica: ADR-31 e ARCHITETTURA § 6 (c).

### 9.2 `CATALOGO_MODELLI`

In [`core/dominio/templateCatalog.ts`](../core/dominio/templateCatalog.ts). Ruoli:
`comune` (strato sotto tutti), `rapporto`, `posta`, `immagine` (oggi nessuno: il
logo è `logo.png` riservato, `NOME_LOGO`).

| nome | ruolo | che cosa |
|---|---|---|
| `_base` | comune | testata e piede |
| `_stile` | comune | formato, margini, corpi |
| `_testi`, `_testi-de`, `_testi-fr`, `_testi-en` | comune | parole e nomi delle colonne per lingua |
| `_blocchi` | comune | pezzi richiamati con `usa:` |
| `verbale-lezione`, `piano-lezione`, `valutazioni-classe`, `presenze-classe`, `scheda-allievo`, `momento-valutazione`, `fascicolo-classe`, `foto-classe`, `diario-corso`, `scheda-corso`, `progetto-classe`, `progetto-allievo` | rapporto | uno per `GenereRapporto`; `supplenze` usa `scheda-corso` |
| `_firma.html` | posta | la firma delle e-mail (HTML) |

### 9.3 Il motore di template

[`core/dominio/reports.ts`](../core/dominio/reports.ts) (`componiCorpo`) +
[`core/dati/reportsPdf.ts`](../core/dati/reportsPdf.ts) (`componiPdf`, pdf-lib).
Formato per esteso: `templates/LEGGIMI.md`.

| Direttiva | Forma |
|---|---|
| segnaposto, frase | `{{valore}}`, `{{frase.nome}}` |
| elenco, tabella | `elenco:`, `tabella: nome \| Col1, Col2` |
| grafico, galleria, immagine | `grafico:`, `galleria: \| colonne N \| altezza N`, `immagine: file \| altezza N \| sinistra\|destra` |
| ciclo, condizione | `ripeti: gruppo` … `fine:`, `se:` … `altrimenti:` … `fine:` |
| richiamo, ereditarietà | `usa: blocco`, `estende: modello` (profondità ≤ 3) |

## 10. Moduli (form)

In [`ui/forms/`](../ui/forms/). Schema: dati di partenza (entità o
`crea*`) → `apriModale({titolo, corpo, alSalva, azioniSecondarie})` → `alSalva`
ricompone e chiama `salva(contesto, azione, messaggio, dopo?)`, che lascia il
modulo aperto con gli errori o chiude, notifica e chiama `dopo(idCreato)`.

| Modulo | Azioni |
|---|---|
| `moduloAnno` (con calendario ufficiale e «Importa da un altro registro»), `moduloPause` | `anno.crea`, `anno.salva` |
| `moduloBloccoAssenze`, `moduloImportaAssenze` | `assenze.salva`, `assenze.elimina`, `assenze.importa` |
| `moduloClasse`, `moduloAllievo`, `moduloImportaAllievi`, `moduloNuovaPersona` | `classe.salva`, `corso.crea`, `classe.elimina`, `allievo.elimina`, `allievo.foto.*`, `allievi.importa` |
| `moduloConsegna` | `consegna.salva`, `consegna.elimina` |
| `moduloCorso` | `corso.*`, `orario.imposta`, `orario.genera` |
| `moduloRecapito`, `moduloComunicazione` | `recapito.*`, `comunicazione.*` |
| `moduloLezione` (segue le pause della giornata), `moduloOsservazione` | `lezione.salva`, `lezione.duplica`, `lezione.elimina`, `osservazione.*` |
| `moduloMateria`, `moduloUnisciMaterie` | `materia.salva`, `materia.elimina`, `materia.unisci` |
| `editorPiano`, `moduloPiano`, `moduloAssegnaPiano` | `piano.salva`, `piano.duplica`, `piano.elimina`, `piano.assegna` |
| `moduloRecupero` | `recupero.imposta` |
| `BloccoRisorse`, `moduloCollegamento`, `moduloRisorsa` | `risorsa.*` |
| `moduloValutazione` (corregge, non crea) | `valutazione.salva`, `valutazione.elimina` |
| `moduloImportaRegistro` | `registro.importa` |
| `moduloColonnaCheck`, `moduloColonneCheck`, `moduloDataCheck` | `check.colonne`, `check.data` |
| `moduloProgetto`, `moduloFasi`, `moduloCriteri`, `moduloLivelli`, `moduloScalettaProgetto` | `progetto.salva`, `progetto.integra`, `progetto.elimina` |
| `moduloCompito`, `moduloProroga`, `moduloInizio`, `moduloGiudizio`, `moduloCella` | `progetto.compito.*`, `progetto.giudizio.*`, `progetto.cella` |
| `moduloSupplenza` | `supplenza.prepara` |
| `moduloCalendariIcs` (in `ui/views/settings/icsCalendar.tsx`) | `calendario.*` |

`forms/common.tsx`: `salva`, `chiediEliminazione` (mostra tutto ciò che sparisce,
da `core/dominio/deletions.ts`), `TastoElimina`, `TastoDuplica`, `CampoCollegato`
(tendina con «+» che crea la voce mancante), `applicaOrario`, `useRiordino` e
`PresaDiRiga` (trascinamento e tastiera); `campoCorso` sta in `forms/course.tsx`.
Gli editor interni (`EditorPause`, `EditorTelefoni`, `EditorRicorrenze`,
`EditorSlot`, `EditorAttivita`) sono componenti React: tengono lo stato in
proprio e il fuoco resta dov'è (skill `react`).

`components/hint.tsx`: `<Suggerimento>` è la «i» con la spiegazione nascosta
(`aria-describedby`, `useIdSuggerimento`); la usano campi, schede, testate,
sezioni dei moduli e modali.

## 11. Esportazioni e integrazioni

### 11.1 Che cosa esce dal registro

| Formato | Azione | Dove |
|---|---|---|
| PDF | `rapporto.genera`, `rapporto.completo`, rigenerazione automatica | `esportazioni/…` (§ 9.1) |
| PDF di prova | lettura `modelli.prova` | in memoria |
| CSV | `esporta.valutazioni`, `esporta.presenze` | accanto al PDF, stesso nome ([`core/dati/exports.ts`](../core/dati/exports.ts)) |
| Markdown | `esporta.lezione` | accanto al verbale |
| ZIP (allievi con foto, piani, risorse, `Leggimi.txt`) | `supplenza.prepara`, anche con la mail che lo porta | accanto al `.regi`, fuori dal documento; cancellato, senza cestino, quando la mail parte (resta senza indirizzo, con l'invio rifiutato o fallito, con la bozza aperta e non spedita); due supplenze dello stesso giorno con nome uguale si separano con « (2)» |
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
- Invio diretto: Exchange Online, OAuth PKCE (`core/dati/oauth.ts`,
  `core/dati/exchange.ts`); `registroDocenti.azzeraPosta` ripulisce portachiavi,
  memoria e impostazioni.
- «Collega la casella» chiede solo l'account; il mittente si sceglie fra gli
  indirizzi dell'account (`email`/`upn` del gettone con `openid email profile`,
  alias da `User.Read` se il tenant lo concede; `indirizziDellAccount`,
  `core/dominio/mailbox.ts`), conservati nel portachiavi e spinti in
  `MessaggioStato.posta.indirizzi`. `posta.utente` e `posta.mittente` non sono
  campi: li mostra la scheda Posta (`CHIAVI_DEL_COLLEGAMENTO`, in
  `contract/manifest.ts`), fuori da «modificate» e da «Ripristina»; la finestra
  nativa li legge da `VoceProgramma.delCollegamento`, in sola lettura.

### 11.3 Geocodifica

`mappa.geocodifica` da main process verso Nominatim: 1,1 s fra richieste,
quattro tentativi dal più preciso a solo NAP + paese (`approssimato`), al più 60
indirizzi per volta, scrittura incrementale in `Registro.coordinate`, sincrono
nel gestore. Tasselli: `registro://mappa/…` (§ 8.5).

### 11.4 OCR

- Richiede `ocr.modello` e `ocr.proiettore` (`.gguf`) e `llama-mtmd-cli`,
  scaricato da [`core/dati/visionKit.ts`](../core/dati/visionKit.ts) con le
  guardie di [`core/dati/kit.ts`](../core/dati/kit.ts) (indirizzo nel sorgente,
  versione fissa, SHA-256, estrazione stretta) in
  `cartellaApplicazione()/lettura` se `ocr.lettore` è vuoto, o indicato in
  `ocr.lettore` («questo .exe»); `nessuno` non scarica.
- 180 s per pagina. `smistamento.leggiPagine`, `.leggiTutto`, `.rileggiAttive`
  accodano e tornano subito; lo `Smistatore`
  ([`core/dati/sorter.ts`](../core/dati/sorter.ts)) legge una pagina alla volta e
  racconta con `MessaggioLavoro`.

### 11.5 Smistamento

| Fase | Azioni | File |
|---|---|---|
| Ingresso | `smistamento.carica`, `.deposita`, `.cassetta.assorbi` (un PDF alla volta dalla cassetta di arrivo) | i byte in `quarantena/` nel `.regi`, anteprime in `quarantena/anteprime/` |
| Ricostruzione | `.dividi`, `.attribuisci` | nessuno |
| Lettura | `.leggiPagine`, `.leggiTutto`, `.rileggiAttive`, `.fermaLettura` | si riempie `letture` |
| Assegnazione | `.assegnaPagine`, `.assegnaAssenze`, `.assegnaFirme`, `.confermaTutto`, `.assegnaManuale` | il ritaglio va in `archivio/<materia>/<classe>/<chi>/` |
| Scarto | `.scartaPagine` | le pagine escono senza andare da nessuno |
| Rollback | `.riprendiPagine` | cestina l'archiviato, pagine di nuovo in lettura |
| Chiusura | automatica (`chiudiSeFinito`) o `.elimina` | PDF e anteprime nel cestino |
| Servizio | `.apri`, `.apriPagine`, `.impostazioni` | apre PDF o ritaglio |

Riconoscimento ([`core/dominio/sorting.ts`](../core/dominio/sorting.ts)): fino a 4
chiavi per allievo (cognome+nome, nome+cognome, cognome o nome se univoci),
parola intera nel testo normalizzato; soglie e quarantena ADR-26.

### 11.6 Dettatura

| Passo | Dove | Che cosa |
|---|---|---|
| microfono | [`ui/assistant/voice.ts`](../ui/assistant/voice.ts) | PCM 16 kHz mono, tagliato alle pause |
| guardie | [`core/dati/dictation.ts`](../core/dati/dictation.ts) | `MOTORI = { voicebox }`; `prontezzaDettatura`: indirizzo locale, `GET /health` (3 s; un sì vale 10 s) |
| richiesta | [`core/dati/voicebox.ts`](../core/dati/voicebox.ts) | WAV in memoria, `POST /transcribe` (`file`, `language`, `model`), 120 s |
| risposte | | 200 testo; 202 «riprova fra poco» (voicebox scarica la taglia); 3xx rifiutato |

Niente vocabolario di scuola (voicebox non passa `initial_prompt`). ADR-35.

## 12. Scorciatoie da tastiera

| Tasti | Che cosa | Dichiarata in |
|---|---|---|
| `Ctrl+K` | ricerca / palette | `installaScorciatoie()` ([`ui/shortcuts.ts`](../ui/shortcuts.ts)); anche nei campi |
| `Ctrl+B` | mostra o nasconde la barra dei comandi | idem; non nei campi (grassetto) |
| `Ctrl+1`…`Ctrl+9` | voci della barra laterale come si vedono | `ui/shortcuts.ts` |
| `Alt+←`/`Alt+→`, tasti laterali del mouse | indietro/avanti | [`ui/history.ts`](../ui/history.ts) |
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
