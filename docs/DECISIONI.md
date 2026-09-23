# Decisioni architetturali — Registro docenti

## Premessa

Questo file è il registro delle decisioni architetturali (ADR, *Architecture
Decision Record*) del progetto. Non racconta: elenca. La [GUIDA](GUIDA.md) è il
documento del *perché* discorsivo — spiega una scelta dentro la storia che
l'ha resa necessaria, con l'esempio concreto che l'ha fatta capire. Questo
file estrae da quella narrazione il nocciolo consultabile: contesto in una
riga, decisione, conseguenze (comprese quelle scomode), e soprattutto i
vincoli che una futura rifattorizzazione non può rompere senza saperlo.

Chi ha bisogno di capire *perché* una cosa è com'è, legge la GUIDA. Chi sta
per toccare del codice e vuole sapere se sta per rompere un contratto
implicito, legge qui prima.

**Come si aggiunge un ADR.** Numerazione progressiva, mai riusata (`ADR-30`,
non un buco riempito). Un ADR non si cancella quando la decisione cambia: si
marca `superata da ADR-NN` nell'indice e resta leggibile — dice ancora perché
si era fatto così, il che aiuta a non tornarci per sbaglio. Un ADR nuovo che
supera un vecchio lo cita esplicitamente in **Contesto**.

Questo file copre due categorie diverse, tenute separate apposta:

- **§3, Gli ADR** — decisioni che il README dichiara e motiva esplicitamente.
- **§4, Decisioni implicite mai scritte** — scelte che il codice applica in
  modo consistente ma che nessun documento del progetto dichiara. Non sono
  ADR in senso proprio (nessuno le ha "decise" con un contesto scritto): sono
  qui perché una rifattorizzazione le incontrerà comunque, e non trovarle
  scritte da nessuna parte è peggio che trovarle qui con l'avvertenza che la
  motivazione è ricostruita, non citata.

## Indice

| N. | Titolo | Stato | Area |
|---|---|---|---|
| ADR-01 | Lessico centralizzato in un solo file | in vigore | dominio |
| ADR-02 | Shim `vscode-desktop` per isolare l'host | in vigore | guscio |
| ADR-03 | Coordinate indicizzate per indirizzo, non per persona | in vigore | dati |
| ADR-04 | La mappa è l'unico punto da cui un dato esce dalla macchina | in vigore | guscio |
| ADR-05 | Guida in-app come dati strutturati | in vigore | interfaccia |
| ADR-06 | UI senza framework | in vigore | interfaccia |
| ADR-07 | Navigazione e azioni in spazi distinti, "un comando una superficie" | in vigore | interfaccia |
| ADR-08 | Piano lezione appartiene al corso, riuso per duplicazione esplicita | in vigore | dominio |
| ADR-09 | Unità Didattiche come unità canonica, minuti solo nel piano lezione | in vigore | dominio |
| ADR-10 | Il momento di valutazione nasce dalla tappa del piano | in vigore | dominio |
| ADR-11 | Regola "conta come assenza" centralizzata | in vigore | dominio |
| ADR-12 | Appello per Unità Didattica, stato "non-impostato" mai conteggiato | in vigore | dominio |
| ADR-13 | Motore di rapporti a 4 strati, fuori dal codice | in vigore | dati |
| ADR-14 | Un rapporto rifatto sovrascrive, non si accumula | in vigore | dati |
| ADR-15 | Nome file leggibile, niente ID interni | in vigore | dati |
| ADR-16 | Cartelle disco: materia prima di classe, `archivio`+`esportazioni` unificate in `documentazione` | in vigore | dati |
| ADR-17 | Formato documento `.registro` = ZIP con JSON dentro | in vigore | dati |
| ADR-18 | Persistenza incrementale con storico integrato | in vigore | dati |
| ADR-19 | Serratura informativa, non bloccante | in vigore | dati |
| ADR-20 | Percorsi salvati relativi alla cartella anno | in vigore | dati |
| ADR-21 | Impostazioni divise per scope: Programma vs Registro | in vigore | dati |
| ADR-22 | Apertura file per percorso diretto, non URL/`openExternal` | in vigore | guscio |
| ADR-23 | Widget di sistema in tre file "che non si conoscono" | in vigore | guscio |
| ADR-24 | Eliminazione sempre permessa, mai rifiutata per riferimenti | in vigore | dominio |
| ADR-25 | Modelli locali in file `.gguf`, mai cloud | in vigore | dati |
| ADR-26 | Smistamento PDF: nessun archivio automatico prima di conferma umana | in vigore | dominio |
| ADR-27 | Un contratto davanti al centralino, non al posto suo | in vigore | api |
| ADR-28 | Gli schemi fatti in casa, con il contratto Standard Schema | in vigore | api |
| ADR-29 | Un canale per le domande, separato dalle azioni | in vigore | api |

Nota: ADR-13 sostituisce implicitamente un impianto precedente non
documentato come ADR a sé — "prima le misure erano costanti nel codice"
(vedi Contesto di ADR-13) — ma quell'impianto non ha un numero proprio perché
il README non lo tratta come una decisione presa a sé stante, solo come lo
stato "prima".

---

## Gli ADR

### ADR-01 — Lessico centralizzato in un solo file

**Contesto.** Il vocabolario di una scuola non è universale: "persona in
formazione" contro "allievo" contro "studente" secondo istituto e lingua.
Prima di questo file ogni termine era scritto a mano in decine di punti —
form, messaggi di validazione, intestazioni PDF, guida. Cambiare una parola
voleva dire cercarla in tutta l'app e sperare di non perderne una.

**Decisione.** Tutti i termini di dominio (singolare, plurale, genere, forma
breve) vivono in `src/dominio/lessico.ts`: una tabella dati (`Termine {
singolare, plurale, genere, breve? }`) più un piccolo motore di regole
italiane (articoli, preposizioni articolate, accordo del participio) che
compone le frasi invece di scriverle a mano.

**Conseguenze.** Cambiare una parola è una riga; frasi, etichette,
intestazioni PDF/CSV si riallineano da sole. `lessico.ts` non fa prosa
libera: le frasi lunghe della guida restano scritte a mano altrove.
Esplicitamente **fuori** dal lessico, e quindi non toccati da un cambio di
terminologia: identificatori di codice, segnaposto dei modelli, nomi di
cartelle su disco.

**Vincoli che ne derivano.** Un nuovo termine ricorrente va aggiunto qui, non
scritto a mano altrove. Il plurale è sempre scritto a mano nella tabella,
mai calcolato ("unità"→"unità", "persona"→"persone": l'italiano non ha una
regola unica). `lessico.ts` è l'unico modulo riesportato come namespace da
`src/dominio/indice.ts` (`export * as lessico`) perché le sue funzioni hanno
nomi cortissimi (`il`, `i`, `un`, `del`, `con`) che altrimenti colliderebbero
nel barrel globale — un refactor del barrel deve preservare questa eccezione.

**Dove vive.** `src/dominio/lessico.ts`.

---

### ADR-02 — Shim `vscode-desktop` per isolare l'host

**Contesto.** Serve un confine netto fra la logica dell'app e l'ambiente
ospite (Electron: finestre, dialoghi, filesystem, impostazioni,
portachiavi), per poter testare il dominio senza aprire una finestra.

**Decisione.** Il dominio e l'interfaccia importano un modulo `vscode`
fittizio (`src/ambiente/vscode-desktop.ts`), risolto tramite alias esbuild e
`paths` di TypeScript al posto del vero pacchetto `vscode`. Espone gli stessi
namespace (`workspace`, `window`, `commands`, `env`) più funzioni proprie non
presenti nel vero VS Code (`scriviDa`, `radiciConcesse`, `applicaTema`, ecc.).

**Conseguenze.** 26 file che lo usano non conoscono Electron; il dominio
compila e gira in `npm test` senza aprire finestre. Il prezzo è mantenere un
"finto VS Code" sincronizzato con quel che l'app realmente usa — un'API mai
richiamata può restare morta a lungo senza che nessuno se ne accorga.

**Vincoli che ne derivano.** `src/ambiente/` e `guscio/` sono gli **unici**
due posti dove Electron si può nominare — imposto non a parole ma da regole
ESLint `no-restricted-imports` (vedi §4, confini fra strati). `src/dati/`,
`src/azioni/`, `src/pannelli/` non possono importare `electron` direttamente:
devono passare dal guscio `vscode`. Rimuovere lo shim vorrebbe dire perdere
la testabilità del dominio con `node --test`.

**Dove vive.** `src/ambiente/vscode-desktop.ts` (25 export); consumato da
`src/dominio/`, `src/interfaccia/`, `src/dati/`, `src/azioni/`.

---

### ADR-03 — Coordinate indicizzate per indirizzo, non per persona

**Contesto.** Con la geocodifica (`geo`) dentro l'anagrafica di ogni
persona, lo stesso indirizzo (es. la stessa azienda che ospita più
tirocinanti) generava richieste di geocoding duplicate e risultati
leggermente diversi fra loro.

**Decisione.** Raccolta propria `Registro.coordinate` (persistita in
`coordinate.json`), indicizzata su `chiaveIndirizzo(indirizzo)` — l'indirizzo
normalizzato, non l'id della persona.

**Conseguenze.** Una sola richiesta di geocoding per indirizzo; una
correzione si propaga a tutte le schede che condividono quell'indirizzo;
nasce gratis una vista "chi condivide un indirizzo con chi" (fratelli,
colleghi di tirocinio nella stessa azienda).

**Vincoli che ne derivano.** L'indicizzazione per indirizzo presuppone un
invariante di round-trip su come l'indirizzo è scritto in stringa
(`scriviIndirizzo(leggiIndirizzo(riga)) === riga`, vedi `src/dominio/indirizzi.ts`):
se questo si rompe, la chiave di cache smette di far combaciare indirizzi
identici scritti in modo lievemente diverso. `coordinate.json` è
volutamente una collezione separata dalle altre 9 perché si riscrive solo su
azione esplicita ("Trova gli indirizzi"), mai in automatico.

**Dove vive.** `src/dominio/mappa.ts`, `src/dominio/indirizzi.ts`,
`src/dati/geocodifica.ts`, `coordinate.json` dentro il `.registro`.

---

### ADR-04 — La mappa è l'unico punto da cui un dato esce dalla macchina

**Contesto.** Privacy dei dati anagrafici degli allievi (minorenni): il
pannello mappa, essendo una webview, non deve poter parlare direttamente con
la rete.

**Decisione.** Geocoding solo su azione esplicita dell'utente ("Trova gli
indirizzi"), verso Nominatim (OpenStreetMap), 1 richiesta al secondo,
User-Agent dichiarato. Il pannello webview ha CSP `default-src 'none'` — dal
codice: "Il pannello, invece, continua a non parlare con nessuno —
`default-src 'none'`." Le tile della mappa sono servite dall'host tramite il
protocollo `registro://mappa/<z>/<x>/<y>.png` (`guscio/tasselli.ts`), con
cache in `userData` (mai nella cartella del docente, per non finire
sincronizzata su OneDrive).

**Conseguenze.** Ogni uscita di dati verso l'esterno è un gesto visibile e
riconducibile a un'azione dell'utente, mai un side-effect silenzioso di
apertura pannello.

**Vincoli che ne derivano.** La CSP `default-src 'none'` sul pannello mappa
non si allenta per comodità di sviluppo: qualunque nuova integrazione che
tocchi quel pannello (es. una nuova sorgente di tile) deve passare
dall'host/guscio, mai da una chiamata diretta nella webview.

**Dove vive.** `src/dominio/mappa.ts`, `src/interfaccia/viste/mappa.ts`,
`src/interfaccia/componenti/mappa.ts`, `src/dati/geocodifica.ts`,
`guscio/tasselli.ts`.

---

### ADR-05 — Guida in-app come dati strutturati

**Contesto.** Una guida scritta come prosa libera mente dopo pochi mesi:
nessuno la aggiorna quando aggiunge una funzione, perché aggiornarla
richiede trovare il paragrafo giusto in un testo lungo.

**Decisione.** `src/interfaccia/viste/guida.ts` è una struttura dati
tipizzata (non prosa libera), una sezione per pagina dell'app.

**Conseguenze.** Chi aggiunge una funzione aggiunge una riga in un elenco
tipizzato, non un paragrafo a mano. Il README resta il documento del
"perché", la guida in-app quello del "come".

**Vincoli che ne derivano.** Una nuova pagina dell'interfaccia che introduce
comandi propri dovrebbe aggiungere la sua voce qui, non lasciare la guida
disallineata — non c'è però un test automatico che lo verifichi (a
differenza di `sezioniImpostazioni.test.mjs` per ADR-21).

**Dove vive.** `src/interfaccia/viste/guida.ts`.

---

### ADR-06 — UI senza framework

**Contesto.** Semplicità voluta: nessuna dipendenza da un framework UI
(React/Vue/altro).

**Decisione.** `src/interfaccia/dom.ts` espone un helper `h()` per costruire
DOM reale. Ridisegno completo a ogni cambio di stato — non per-keystroke —
con le modali tenute fuori dal ciclo di redraw.

**Conseguenze.** Niente si perde mentre si scrive, anche se lo stato cambia
sotto le dita (esempio dato dal codice: l'orologio che avanza ogni minuto e
forza un redraw mentre l'utente sta scrivendo in un campo). Il prezzo è
scrivere a mano quel che un framework darebbe gratis (diffing, componenti
riutilizzabili con stato locale) — mitigato in parte da `moduli.ts` e dai
componenti in `src/interfaccia/componenti/`.

**Vincoli che ne derivano.** Un redraw completo presuppone che lo stato
applicativo sia l'unica fonte di verità e che il DOM non tenga stato che lo
stato non conosca — un componente che tiene stato locale fuori da questa
disciplina rischia di essere azzerato al prossimo redraw. Le modali sono
un'eccezione dichiarata: vivono fuori dal ciclo apposta.

**Dove vive.** `src/interfaccia/dom.ts`, `src/interfaccia/moduli.ts`,
`src/interfaccia/componenti/`.

---

### ADR-07 — Navigazione e azioni in spazi distinti, "un comando una superficie"

**Contesto.** Pulsanti duplicati a un centimetro l'uno dall'altro
confondevano l'utente su quale premere.

**Decisione.** I comandi sono divisi per spazio (File, sidebar, contesto
corso/anno/periodo, riga azioni, Proietta/Cerca, scheda Proiezione); un
comando non compare in una pagina che disegna già il proprio pulsante per la
stessa azione.

**Conseguenze.** Impostazioni e Documenti, per esempio, non ripetono nella
riga azioni i comandi già presenti nel corpo della pagina.

**Vincoli che ne derivano.** Regola di UI esplicita: prima di aggiungere un
comando a una superficie (riga azioni, sidebar, ecc.) va verificato che la
pagina di destinazione non disegni già il pulsante equivalente — non c'è
enforcement automatico, è una disciplina di revisione.

**Dove vive.** `src/interfaccia/comandi.ts`, `src/interfaccia/barraComandi.ts`,
`src/interfaccia/sidebar.ts`.

---

### ADR-08 — Piano lezione appartiene al corso, riuso per duplicazione esplicita

**Contesto.** Un piano lezione nell'elenco unico della materia si mescolava
con i piani di altri corsi della stessa materia, rendendo difficile capire
quali fossero "i miei" per questa classe.

**Decisione.** Il piano lezione è legato al corso (`PianoLezione.corsoId`),
indirettamente alla materia solo ai fini del riuso; il riuso fra corsi passa
da un'azione esplicita di "duplica", non da un elenco condiviso per materia.

**Conseguenze.** Nel registro si vedono prima i piani del corso corrente,
poi gli altri marcati "da duplicare". `pianiDelCorso` (in
`src/dominio/corsi.ts`) non filtra per anno: un piano vecchio resta
duplicabile da un anno all'altro. `corsoId: null` identifica una bozza
"ancora senza casa".

**Vincoli che ne derivano.** Un piano non può essere condiviso *live* fra due
corsi — condividerlo significa sempre creare una copia indipendente. Un
eventuale refactor verso un "piano condiviso" romperebbe questa aspettativa
e richiederebbe una migrazione esplicita del modello dati.

**Dove vive.** `src/dominio/modelli.ts` (`PianoLezione`), `src/dominio/corsi.ts`
(`pianiDelCorso`, `nomeDelPiano`).

---

### ADR-09 — Unità Didattiche come unità canonica, minuti solo nel piano lezione

**Contesto.** Si prepara una scaletta di lezione pensando "20 minuti", non
"0,4 unità didattiche" — ma la scuola conta le ore in Unità Didattiche (UD),
non in minuti, e l'UD dipende dalla scuola/dall'orario (`MINUTI_UD = 45`).

**Decisione.** Capienza dell'ora, appello, conteggi annuali sono sempre
espressi in UD; solo dentro la scaletta del piano lezione la durata si
scrive e si legge in minuti (`Attivita.durataUd`, mai minuti direttamente).

**Conseguenze.** Lo stesso piano riusato su un'UD di durata diversa (scuola
diversa, orario diverso) riempie comunque l'ora — non serve riscrivere la
scaletta. `scalettaSulleUd` (in `src/dominio/calcoli.ts`) posa la scaletta
scritta in UD sui minuti reali della lezione.

**Vincoli che ne derivano.** Qualunque nuovo campo che esprime una durata a
livello di corso/lezione/conteggio annuale va in UD, non in minuti — solo la
scaletta del piano lavora in minuti. `MINUTI_UD` è una costante globale
(`src/dominio/calcoli.ts`), non configurabile per corso: cambiarla in corsa
d'anno cambierebbe la lettura dei dati storici.

**Dove vive.** `src/dominio/calcoli.ts` (`MINUTI_UD`, `unitaDidattiche`),
`src/dominio/date.ts` (conversioni `minutiDaUd`/`udDaMinuti`/`formattaUd`),
`src/dominio/attivita.ts` (`Attivita.durataUd`).

---

### ADR-10 — Il momento di valutazione nasce dalla tappa del piano, non da un campo separato

**Contesto.** Prima il piano lezione aveva una casella "valutazione
prevista" indipendente dalla scaletta delle attività, spesso in disaccordo
con essa: si poteva dichiarare una valutazione prevista senza che nessuna
tappa della scaletta la rispecchiasse.

**Decisione.** Una tappa (`Attivita`) si marca "È una valutazione"
(`Attivita.valutazione: ValutazionePrevista`); il `MomentoValutazione` vero
nasce dentro la lezione in cui quella tappa viene effettivamente svolta,
collegato via `attivitaId`.

**Conseguenze.** Niente più doppio stato che può contraddirsi fra scaletta e
casella separata. Due prove nella stessa lezione restano due momenti
distinti (due tappe di tipo `verifica`, non un unico flag per lezione).

**Vincoli che ne derivano.** Il "triangolo" `MomentoValutazione.pianoId` /
`Lezione.pianoId` deve restare coerente quando entrambi sono popolati —
controllato da `riferimentiRotti` in `validazione.ts`, ma **non bloccante**:
un refactor che rimuova quel controllo lascerebbe incoerenze silenziose.
`orfani.ts` diagnostica (mai corregge da solo) i momenti scollegati dalla
tappa che li ha generati.

**Dove vive.** `src/dominio/modelli.ts` (`Attivita.valutazione`,
`MomentoValutazione.attivitaId`), `src/dominio/orfani.ts`.

---

### ADR-11 — Regola "conta come assenza" centralizzata

**Contesto.** Dal codice: la regola sta in un posto solo perché "ritardo ed
esonero non devono contare come assenza piena" e un'"autorizzazione" non va
mai a penalizzare chi l'ha ricevuta — tre conti in tre punti diversi del
codice avrebbero rischiato di dare tre risultati leggermente diversi.

**Decisione.** `contaComeAssenza(stato)` — che vale `stato === 'assente'`
soltanto — vive in `src/dominio/calcoli.ts`, unico punto usato dal quadro
della persona, dal riepilogo dell'ora, dalla matrice del corso, dai rapporti
stampati e dalla soglia delle segnalazioni.

**Conseguenze.** Un'unica fonte di verità tenuta ferma esplicitamente contro
il rischio di *drift*: `prove/dominio/ritardo.test.mjs` verifica tutti e
cinque i consumatori insieme.

**Vincoli che ne derivano.** Nessun altro file deve reimplementare questa
regola (nemmeno per un caso apparentemente speciale): va sempre chiamata
`contaComeAssenza`, mai riscritta come `stato === 'assente'` a mano in un
punto nuovo — il test esiste apposta per intercettare la duplicazione.

**Dove vive.** `src/dominio/calcoli.ts`; `prove/dominio/ritardo.test.mjs`.

---

### ADR-12 — Appello per Unità Didattica, stato "non-impostato" mai conteggiato

**Contesto.** Un blocco di più UD (un'ora doppia, per esempio) può avere
ingressi/uscite parziali durante l'ora; un'ora semplicemente "dimenticata"
da appellare non deve svuotare le percentuali di presenza di tutta la
classe.

**Decisione.** L'appello è granulare per UD, non per l'intera lezione
(`Presenza.stati: StatoPresenza[]`, una voce per UD). Lo stato iniziale
`'non-impostato'` è esplicitamente escluso da ogni conteggio — non è letto
né come presenza né come assenza.

**Conseguenze.** È l'appello effettivamente fatto (non lo stato "svolta"
dichiarato sulla lezione) a determinare quali UD entrano nei conti. Questo
produce due percentuali distinte e mai fuse fra loro (vedi ADR-11 e
`src/dominio/matriceCorso.ts`): `% assenza` sulle UD previste dall'orario, e
`% presenza/appello` sulle sole UD dove l'appello è stato davvero compilato.

**Vincoli che ne derivano.** Qualunque nuova vista che mostri una
percentuale di presenza/assenza deve dichiarare quale dei due denominatori
usa — fonderli sarebbe un errore di dominio, non solo di presentazione. Un
valore di stato non riconosciuto in lettura (JSON vecchio o corrotto) deve
sempre degradare a `'non-impostato'`, mai a `'presente'`.

**Dove vive.** `src/dominio/modelli.ts` (`StatoPresenza`, `Presenza.stati`),
`src/dominio/matriceCorso.ts`, `src/dominio/calcoli.ts` (`statoDellOra`).

---

### ADR-13 — Motore di rapporti a 4 strati, fuori dal codice

**Contesto.** Prima le misure di impaginazione erano costanti dentro il
codice: cambiarle richiedeva ricompilare l'app, il che in pratica significava
non cambiarle mai.

**Decisione.** L'impaginazione dei rapporti PDF vive in `templates/` come
testo con direttive (`_base.tpl`/`_stile.tpl`/`_testi.tpl`/`_blocchi.tpl`),
interpretata a runtime, mai ricompilata. La copia "di serie" distribuita con
l'app è generata da `npm run modelli` dentro `src/dati/modelliPredefiniti.ts`.

**Conseguenze.** Contenuto (`_base`), misure (`_stile`), parole (`_testi`) e
pezzi ripetuti (`_blocchi`) si toccano per motivi diversi e da persone
diverse, ciascuno nel proprio file, senza toccare codice TypeScript.

**Vincoli che ne derivano.** La copia accanto al documento dell'utente
**comanda sempre** sulla copia di serie: un aggiornamento dell'app non deve
mai sovrascrivere silenziosamente un modello personalizzato (vedi
`catalogoModelli.ts::sorteModello`, che distingue `'aggiorna'`/`'arretrato'`
via hash). `npm run modelli` deve restare sincronizzato con `templates/`,
controllato da `npm test`. Il catalogo modelli e la cartella `templates/`
devono avere esattamente gli stessi nomi, controllato da `npm test`.

**Dove vive.** `templates/_base.tpl`, `templates/_stile.tpl`,
`templates/_testi.tpl`, `templates/_blocchi.tpl`, `src/dati/modelli.ts`,
`src/dati/modelliPredefiniti.ts`, `src/dati/rapportiPdf.ts`,
`src/dominio/catalogoModelli.ts`, `src/dominio/verificaModelli.ts`.

---

### ADR-14 — Un rapporto rifatto sovrascrive, non si accumula

**Contesto.** Un rapporto stampato è "una fotografia di com'è il registro
adesso" — non ha senso tenere versioni obsolete accanto a quella corrente.

**Decisione.** Rigenerare un documento sostituisce il file precedente,
nessuna numerazione progressiva; i vecchi duplicati numerati incontrati
vengono ripuliti.

**Conseguenze.** La cartella non si riempie di stampe obsolete; niente
ambiguità su quale versione sia quella valida.

**Vincoli che ne derivano.** Dove il "vero" (anno, classe+materia, tipo
documento, elemento distintivo) non basta a distinguere due file diversi
(vedi ADR-15), si aggiunge `(2)` — questa è l'unica forma di numerazione
tollerata, e distingue file realmente diversi, non versioni dello stesso
file nel tempo.

**Dove vive.** `src/dati/esportazioni.ts` (`scriviGenerato`),
`src/dominio/collocazioni.ts`.

---

### ADR-15 — Nome file leggibile, niente ID interni

**Contesto.** Dal codice: "il nome di un file si legge, si cerca, si detta
al telefono" — un identificatore tipo `lez-m3k9x2-a7f1` non soddisfa nessuno
di questi usi.

**Decisione.** Il nome di un documento generato è composto da 4 parti
leggibili: anno scolastico, classe+materia, tipo documento, elemento
distintivo reale (ora, periodo, data o titolo) — mai un ID interno.

**Conseguenze.** Dove il "vero" non basta a distinguere due file (due
verifiche omonime lo stesso giorno), si aggiunge un suffisso numerico
tramite `distinzione()`.

**Vincoli che ne derivano.** Un nuovo genere di rapporto (`GenereRapporto`,
8 voci oggi) deve avere la propria regola esplicita di composizione nome che
intrecci gli stessi 4 elementi, evitando collisioni — non deve introdurre un
ID generato per comodità.

**Dove vive.** `src/dominio/collocazioni.ts` (`GenereRapporto`,
`distinzione`).

---

### ADR-16 — Cartelle disco: materia prima di classe, `archivio`/`esportazioni` unificate in `documentazione`

**Contesto.** Con "classe" davanti nel percorso, lo stesso materiale riusato
in classi diverse finiva sparso in cartelle lontane. Separare `archivio/` ed
`esportazioni/` era vero dal punto di vista del codice (una cartella per
file caricati, una per file generati) ma falso per chi apre la cartella a
mano: il verbale e la verifica della stessa ora sono, per chi insegna, la
stessa documentazione.

**Decisione.** Struttura `<materia|docente-di-classe>/<classe>/<classe|allievi/<chi>>/<file>`;
`archivio/` ed `esportazioni/` sono state unificate in `documentazione/`.

**Conseguenze.** Il materiale di una materia sta tutto insieme, indipendente
dalla classe. Per le installazioni esistenti, la migrazione a questo layout
è automatica alla prima apertura (`migraArchivio` in
`src/dati/archiviazione.ts`).

**Vincoli che ne derivano.** I nomi delle cartelle su disco (`allievi/<Cognome
Nome>/`, `documentazione/`, `in-arrivo/`, `quarantena/`) non si rinominano a
cuor leggero: rinominarle sposta file già sincronizzati su OneDrive.
`templates/LEGGIMI.md` descrive ancora la vecchia coppia `archivio/` +
`esportazioni/`: è disallineato rispetto a questa decisione, un promemoria
che quel file andrebbe aggiornato quando lo si tocca di nuovo.

**Dove vive.** `src/dominio/collocazioni.ts`, `src/dati/archiviazione.ts`
(`migraArchivio`).

---

### ADR-17 — Formato documento `.registro` = ZIP con JSON dentro

**Contesto.** Dal codice: "Un formato inventato si legge solo con il
programma che lo ha scritto, cioè proprio quello che non funziona" — un
formato binario proprietario, se l'app si rompe, si porta via anche il modo
di leggerlo.

**Decisione.** Il documento è un vero ZIP con estensione custom `.registro`
(per esteso, non `.reg`, che collide con lo script del registro di sistema
di Windows) — "si apre con un doppio clic [...] ma il giorno che il registro
non parte lo apre anche `unzip`, e dentro ci sono i JSON di sempre."

**Conseguenze.** Recuperabilità garantita anche in caso di rottura
irreparabile dell'app: chiunque, con uno strumento ZIP qualsiasi, recupera i
dati in chiaro.

**Vincoli che ne derivano.** L'estensione `.registro` resta un vero ZIP
leggibile con `unzip`: non diventa mai un formato binario proprietario
chiuso, nemmeno per guadagni di performance o compattezza. Le prove che
verificano la compatibilità di formato (`prove/campioni/*.registro`) sono
l'unica prova del progetto che guarda indietro: si rigenerano con `npm run
campione` **solo** quando il formato cambia apposta.

**Dove vive.** `src/dati/pacchetto.ts`, `src/dati/zip.ts` (implementazione
ZIP manuale su `node:zlib`, nessuna libreria esterna).

---

### ADR-18 — Persistenza incrementale con storico integrato

**Contesto.** Un salvataggio interrotto (crash, chiusura brusca) non deve
corrompere il documento. Ricomprimere l'intero file a ogni tasto premuto è
costoso (misurato: ~40ms contro ~3ms per un accodamento).

**Decisione.** Scritture ad accodamento (`accoda()`): si comprime solo la/e
collezione/i modificata/e, si scrive in coda al file esistente, poi si
riscrivono indice e coda ZIP con una seconda chiamata separata — l'ordine è
voluto: finché la nuova coda non è scritta per intero, il file resta
leggibile con la coda vecchia. Riscrittura completa (`rifai()`, pattern
write-temp-then-rename) solo quando il file non esiste ancora, o lo spazio
morto supera 256KB **e** 1/3 della dimensione, o accodare costerebbe più di
metà del documento. Storico delle ultime 10 versioni per collezione dentro
lo stesso pacchetto (`.storico/`), compresso al massimo.

**Conseguenze.** Atomicità senza copia integrale del file a ogni salvataggio;
cronologia locale delle ultime modifiche senza servizio esterno; costo di
storage minimo per lo storico grazie alla compressione massima riservata
solo a quel che finisce in `.storico/`.

**Vincoli che ne derivano.** L'ordine "scrivi la coda nuova, poi aggiorna
indice+coda" non è invertibile senza perdere l'atomicità "per costruzione".
Lo storico vive dentro lo stesso file `.registro` (non su disco separato):
sposta l'intero `.registro` e ti porti dietro anche la cronologia.

**Dove vive.** `src/dati/pacchetto.ts` (`accoda`, `rifai`, `conserva`,
`spazioMorto`), `src/dati/zip.ts`.

---

### ADR-19 — Serratura informativa, non bloccante

**Contesto.** Dal codice: su una cartella sincronizzata (OneDrive) "non
esiste un lucchetto vero" — un lock a livello di filesystem non è
implementabile in modo affidabile su quel tipo di storage.

**Decisione.** Un file sidecar `.<nomefile>.serratura` accanto al documento
aperto indica quale macchina/utente/processo lo sta usando. "Non impedisce
niente [...] Serve a fare la domanda giusta prima che sia tardi — 'questo
anno è aperto sul computer della sala docenti: vuoi aprirlo lo stesso?'".

**Conseguenze.** Previene la sovrascrittura silenziosa avvisando prima
dell'azione, non impedendola tecnicamente. Se l'utente ignora l'avviso, due
processi possono comunque scrivere in conflitto.

**Vincoli che ne derivano.** Non si deve mai promuovere questo meccanismo a
lock "vero" che blocchi la scrittura: su storage sincronizzato non
funzionerebbe comunque e darebbe una falsa sicurezza. `Pacchetto.chiLoTiene()`
ignora la serratura se è la stessa macchina+utente (riapertura legittima
dello stesso processo).

**Dove vive.** `src/dati/pacchetto.ts` (`prendi`, `lascia`, `chiLoTiene`),
`src/dati/archivio.ts`.

---

### ADR-20 — Percorsi salvati relativi alla cartella anno

**Contesto.** Un anno scolastico deve poter essere spostato, rinominato o
consegnato ad altri (consegna a fine anno, cambio computer, backup) senza
rompersi.

**Decisione.** Tutti i percorsi scritti nei JSON delle collezioni sono
relativi alla cartella dell'anno, non alla radice del filesystem né a un
percorso assoluto.

**Conseguenze.** Nessun riferimento a un file si rompe spostando la cartella
dell'anno da un computer all'altro o rinominandola.

**Vincoli che ne derivano.** Qualunque codice che scrive un percorso in una
collezione deve produrlo relativo, mai assoluto — anche in casi speciali
(es. migrazioni: `riscriviPercorsi()` in `src/dati/archiviazione.ts` esiste
apposta per aggiornare tutti i riferimenti quando il layout cambia). Il nome
della cartella dell'anno, una volta creato, resta "congelato": non si
rinomina da sé se l'etichetta anno cambia in seguito.

**Dove vive.** `src/dati/percorsi.ts`, `src/dati/archiviazione.ts`
(`riscriviPercorsi`).

---

### ADR-21 — Impostazioni divise per scope: Programma vs Registro

**Contesto.** Mescolate in un solo elenco, un'impostazione di scope diverso
si confondeva con l'altra senza che l'utente se ne accorgesse (esempio dato
dal README: la scala dei voti, che è del documento, contro il tema
dell'interfaccia, che è della macchina).

**Decisione.** Due categorie esplicite: **Programma** (`impostazioni.json`
in `userData`, per macchina) e **Registro** (dentro il `.registro`, per
documento) — con `src/manifesto.ts` come unica fonte di verità per chiavi,
valori predefiniti e generazione dell'UI corrispondente.

**Conseguenze.** Impossibile sbagliare scope per ignoranza da parte di chi
sviluppa: ogni chiave nuova compare comunque da qualche parte nell'interfaccia
(la sezione che raccoglie, "Quel che non sta altrove", se non ne ha una
più specifica), verificato da
`prove/interfaccia/sezioniImpostazioni.test.mjs`.

**Vincoli che ne derivano.** Una nuova impostazione va dichiarata in
`manifesto.ts`, non scritta ad-hoc in `impostazioni.json` o nel documento —
il test fallisce se una chiave manifesto non ha una sezione UI che la mostri.
L'unica uscita da quella garanzia è `nascosta: true` nel manifesto, e va
dichiarata: sono le chiavi che *il programma* si scrive addosso (dove sta
l'agenda, quanto è larga), che offerte come scelte sarebbero campi che si
compilano e non hanno effetto. Restano chiavi vere — `valoreAccettabile` le
accetta, perché è di lì che il widget le scrive — e il test verifica che le
sole assenti dalla pagina siano esattamente quelle dichiarate tali.

**Dove vive.** `src/manifesto.ts`, `src/ambiente/impostazioni.ts`
(Programma), `registro.json.impostazioni` dentro il `.registro` (Registro);
`prove/interfaccia/sezioniImpostazioni.test.mjs`.

---

### ADR-22 — Apertura file per percorso diretto, non URL/`openExternal`

**Contesto.** Dal codice: `openExternal` "consegna alla shell un URL: il
grado di «1° semestre» diventa `%C2%B0`" — un giro di encoding/decoding che
su Windows, fuori dall'ASCII, non torna pulito, con errori fuorvianti che
facevano cercare il problema nel posto sbagliato.

**Decisione.** I rapporti si aprono passando il percorso come argomento
separato al processo (`execFile`, mai concatenazione shell), non tramite
`openExternal`/URL.

**Conseguenze.** Nessuna riga di comando composta a mano (previene
injection: un nome file con `&` dentro non può diventare un'altra
istruzione). `openExternal` resta riservato agli indirizzi web veri, come un
collegamento dentro un piano lezione.

**Vincoli che ne derivano.** Qualunque nuovo punto che apre un file locale
deve passare per percorso diretto (`src/dati/apertura.ts::apriConIlSistema`),
mai costruire un URL `file://` da passare a `openExternal`. In
`src/ambiente/comandi.ts`, `openExternal` resta comunque ristretto a uno
schema whitelist (`http`, `https`, `mailto`, `tel`).

**Dove vive.** `src/dati/apertura.ts` (`apriConIlSistema`),
`src/ambiente/comandi.ts` (whitelist schemi `openExternal`).

---

### ADR-23 — Widget di sistema in tre file "che non si conoscono"

**Contesto.** Serve separare la logica pura di una funzionalità di sistema
(vassoio, agenda desktop) dall'integrazione con la piattaforma, per poterla
testare senza Electron.

**Decisione.** Pattern ripetuto identicamente per vassoio e agenda desktop:
un file di **dominio puro** (testato con `node --test`), un file di
**orchestrazione** (orologio + archivio), un file di **ambiente** (traduzione
verso Electron/Windows).

**Conseguenze.** La stessa architettura è riconoscibile in due funzionalità
diverse; il dominio di entrambe è testabile senza Electron, allo stesso modo
del resto di `src/dominio/`.

**Vincoli che ne derivano.** Una terza funzionalità di sistema (se mai
nascesse) dovrebbe seguire lo stesso schema a tre file, non accorciare il
percorso mettendo logica di dominio nel file ambiente per comodità.

**Dove vive.** Vassoio: `src/dominio/vassoio.ts` (puro), `src/vassoio.ts`
(orchestrazione), `src/ambiente/vassoio.ts` (Electron). Agenda:
`src/dominio/agenda.ts`/`agendaLezione.ts`/`agendaMese.ts`/`agendaPendenze.ts`
(puro), `src/agenda.ts` (orchestrazione), `src/ambiente/agenda.ts` +
`src/ambiente/ancoraggio.ts` (Windows/koffi).

---

### ADR-24 — Eliminazione sempre permessa, mai rifiutata per riferimenti

**Contesto.** Dal codice: un rifiuto di cancellazione per "ha ancora roba
dentro" lascia dati sbagliati in giro e spinge l'utente a correggere i file
a mano — peggio del problema che vorrebbe evitare.

**Decisione.** Qualunque entità si può eliminare. Il registro dichiara
*prima*, per intero, cosa sparirà — calcolato dallo stesso codice che poi
eseguirà l'eliminazione (pattern "calcolo puro + `applica` mutante": la
funzione `eliminazione(registro, bersaglio)` è pura e descrive l'effetto, la
closure `applica(registro)` che restituisce muta lo stato solo quando
invocata dopo conferma). L'eliminazione è completa — si porta dietro ciò che
resterebbe orfano — ma lascia vivere ciò che sa vivere staccato (es.
cancellare un corso lascia i suoi piani come orfani con `corsoId=null`,
esplicitamente enumerati come "restano, senza corso"). Dove esiste
un'alternativa non distruttiva (archiviare, unire, togliere la spunta
"Frequenta"), viene offerta accanto all'eliminazione.

**Conseguenze.** Niente *drift* fra il messaggio di conferma mostrato e
l'azione realmente eseguita, perché sono lo stesso calcolo. I file coinvolti
finiscono nel cestino di sistema, non persi per sempre.

**Vincoli che ne derivano.** Ogni nuovo tipo di entità eliminabile deve
avere la propria voce in `eliminazioni.ts::chiusura` (o un ramo indipendente,
come per l'allievo) che descriva esplicitamente cosa cade a cascata e cosa
resta scollegato — non basta cancellare il record e sperare che
`riparazioni.ts` sistemi dopo.

**Dove vive.** `src/dominio/eliminazioni.ts`, `src/dominio/riparazioni.ts`
(riconciliazione a posteriori, mai automatica in silenzio).

---

### ADR-25 — Modelli locali in file `.gguf`, mai cloud

**Contesto.** Le pagine scansionate da riconoscere contengono nomi di
minorenni e possibili situazioni familiari delicate, e le domande
dell'assistente si portano dietro medie, assenze e nomi: mandarle a un
servizio cloud terzo non è accettabile.

La prima versione di questa decisione diceva «via Ollama in esecuzione su
`127.0.0.1`». Reggeva sulla riservatezza e cedeva su tutto il resto: chi
insegna doveva installare un secondo programma, tenerlo acceso e scaricare i
modelli con un comando battuto in un terminale — e l'indirizzo del servizio
restava un'impostazione, cioè un modo di far uscire dalla macchina proprio i
dati che questa decisione protegge.

**Decisione.** Un modello, qui, è **un file `.gguf`** nella cartella dei
modelli del registro. Lo carica `dati/llamaCpp.ts` dentro il main process per
l'assistente, e `dati/mtmd.ts` con il programma `llama-mtmd-cli` per le
scansioni, che vogliono un modello capace di guardare. Non c'è un servizio da
accendere e non c'è un indirizzo da configurare. I modelli si scaricano dalla
pagina «Modelli linguistici», si trascinano dentro o si scelgono dal disco.
Funzione opzionale: propone un'assegnazione, non la decide da sola.

**Conseguenze.** Coerente con la regola "il pannello non parla con la rete" di
ADR-04, e più stretta di prima: **non c'è più una `fetch` da dirottare.** Senza
un modello scelto, le scansioni restano in quarantena per assegnazione manuale
e l'assistente resta spento — la funzione degrada, non blocca il flusso. Il
prezzo è nel pacchetto: `node-llama-cpp` e i binari di llama.cpp vanno tenuti
fuori dall'`asar`, come koffi.

**Vincoli che ne derivano.** Nessuna funzione di riconoscimento immagini o di
conversazione deve introdurre una dipendenza cloud, nemmeno opzionale, senza
rivedere questa decisione esplicitamente. L'unica cosa che parla con la rete è
lo **scarico** di un modello da Hugging Face, che porta dentro dei pesi e non
porta fuori un dato del registro. Il nome del modello scritto nelle impostazioni
è risolto da `modelloNellaCartella()` e non usato com'è: un percorso messo a
mano in quel JSON non diventa un file che il registro apre.

**Dove vive.** `src/dati/llm.ts`, `src/dati/gguf.ts`, `src/dati/llamaCpp.ts`,
`src/dati/mtmd.ts`, `src/dati/huggingFace.ts`.

---

### ADR-26 — Smistamento PDF: nessun archivio automatico prima di conferma umana

**Contesto.** Dal codice: "un documento finito nel fascicolo sbagliato è un
errore che nessuno scopre finché non serve" — un errore di smistamento
automatico è silenzioso per definizione.

**Decisione.** Il riconoscimento del nome (per testo o OCR) produce sempre
una bozza da confermare; niente si archivia automaticamente, nemmeno con
fiducia di riconoscimento alta.

**Conseguenze.** Omonimi, pagine senza nome riconoscibile, scansioni
illeggibili restano in coda di quarantena per intervento manuale, mai
forzati in un fascicolo per "probabilità".

**Vincoli che ne derivano.** La soglia di fiducia (`FIDUCIA_SUFFICIENTE =
0.7`) e la soglia di ambiguità (stacco `< 0.2` fra i primi due candidati, in
`src/dominio/smistamento.ts`) decidono solo se *proporre* un'assegnazione,
mai se *eseguirla* senza conferma — un refactor non deve introdurre un
percorso che salta la conferma umana, nemmeno per i casi a fiducia 1.0. Un
allievo riceve al massimo un blocco per passata di smistamento.

**Dove vive.** `src/dominio/smistamento.ts`, `src/dati/smistatore.ts`,
`src/interfaccia/viste/smistamento.ts`.

---

### ADR-27 — Un contratto davanti al centralino, non al posto suo

**Contesto.** Il registro aveva già un centralino: `src/azioni.ts` costruisce
`GESTORI`, una mappa da `Azione['tipo']` alla funzione che fa il lavoro, e il
compilatore garantisce che non ci sia un'azione senza gestore né un gestore
senza azione. Quel che mancava non era il lavoro — provato, in produzione da
anni — ma **le tre cose che servono a una chiamata che arriva da fuori dal
pannello**: una forma dell'ingresso controllata quando il programma gira e non
solo quando compila; un errore con un codice, oltre alla frase italiana da
mostrare; una versione dichiarata, così che due lati disallineati sappiano
dirselo invece di scoprirlo con un campo `undefined`.

Non è un problema teorico. Il widget dell'agenda è un webview a sé: il tipo che
tiene insieme pannello e host non arriva fin lì, ed è per questo che
`src/agenda.ts` si era portato dentro un elenco degli stati dell'appello
ricontrollato a mano — «un messaggio malformato non deve poter scrivere
*pres3nte* dentro l'appello di una classe». La riga di comando e il condotto
JSON-RPC hanno lo stesso problema, moltiplicato.

Le strade erano due, e sono state scartate tutte e due. **Riscrivere le azioni
sotto un'API nuova** avrebbe prodotto una modifica che nessuno può rileggere e
una giornata in cui niente funziona, per giunta con tutte le prove esistenti da
reinterpretare. **Lasciare tutto com'era** avrebbe voluto dire scrivere un
contratto che non protegge nulla.

**Decisione.** Sostituzione progressiva, un'azione alla volta. Una `Procedura`
(`src/api/contratto.ts`) dichiara `azione: 'presenze.riga'`, e
`gestoriDelleProcedure()` la **spande sopra** `GESTORI` in `src/azioni.ts`:
quelle chiavi vincono su quelle di prima. È l'unica riga di quel file che è
cambiata. Il lavoro resta nel gestore: `daGestore(ore['presenze.riga'], …)`
compone l'azione e gliela passa, quindi nessuna logica si sposta e nessuna
prova esistente cambia significato.

Per il pannello non cambia niente: manda la stessa `Azione` e riceve la stessa
`Risposta`. Ma quella richiesta, adesso, passa da una convalida vera, torna con
un codice d'errore e lascia una riga nel giornale.

La migrazione è finita: **141 azioni su 141** sono sotto contratto.

**Conseguenze.** Il nucleo (`chiama()` in `src/api/nucleo.ts`) diventa l'unico
punto che convalida, esegue, cronometra e scrive nel giornale — e quindi
l'unico punto che tutti i trasporti condividono. Il pannello, il widget, il
menu nativo e la riga di comando non si assomigliano in niente: da lì in poi
diventano la stessa cosa. Il widget dell'agenda ci ha guadagnato tre cose che
gli mancavano tutte e tre: la convalida (e il suo elenco a mano è sparito), un
rifiuto che **si vede** invece di essere buttato via, e `origine: 'agenda'` nel
giornale — che è la prima domanda che si fa quando un dato risulta cambiato e
nessuno se lo ricorda.

C'è un costo, ed è una doppia nomenclatura: `presenze.riga` è il nome
dell'azione, `ore.appello.riga` è il nome della procedura. Le azioni sono
cresciute una alla volta, le procedure sono state ordinate per area. I due
nomi stanno accanto nella tabella del §6 di
[CATALOGO](CATALOGO.md), che è l'unico posto in cui si leggono insieme.

C'è anche un modo di fallire **in silenzio**, e uno solo: `oggetto()` scarta le
chiavi che non dichiara — è la tolleranza che permette a un pannello più nuovo
di parlare con un host più vecchio — e il ponte passa al gestore quel che resta
dell'ingresso. Le due cose insieme fanno che uno schema a cui manca un campo
non rompa niente di visibile: l'azione risponde «fatto», e quel campo smette
semplicemente di arrivare. Una nota che non si salva. Una scadenza che
sparisce. Il compilatore non può accorgersene, perché i campi mancanti
diventano `undefined`, che per un campo opzionale è un valore legittimo.

**Vincoli che ne derivano.**

- **Il lavoro non si sposta nella procedura.** Dove un gestore esiste già ed è
  provato, la procedura gli mette davanti il contratto e gli passa la palla.
  Spostare la logica dentro la procedura è una rifattorizzazione a sé, da fare
  con le sue prove, non un effetto collaterale della migrazione.
- **Una procedura, un'azione.** Due procedure non possono prendere in carico
  la stessa azione, e nessuna può dichiararne una che il protocollo non
  conosce. Lo verifica `prove/api/copertura.test.mjs`.
- **Lo schema di una procedura deve dichiarare tutti i campi della sua
  azione.** È il vincolo che chiude il modo di fallire silenzioso, e si
  verifica **campo per campo** leggendo l'unione `Azione` dal sorgente — non
  contando le procedure, che passerebbe lo stesso con uno schema monco.
- **`VERSIONE_API` si alza quando cambia la busta**, non quando si aggiunge una
  procedura: aggiungere è retrocompatibile per costruzione, e alzare la
  versione a ogni procedura nuova insegnerebbe soltanto a non guardarla.
- **Il nucleo non spinge lo stato e non rigenera i PDF.** Quelle due cose
  dipendono da chi ha chiamato — una riga di comando che corregge un voto non
  ha un webview da aggiornare — e restano del pannello e del centralino.

**Dove vive.** `src/api/contratto.ts` (che cos'è una procedura),
`src/api/nucleo.ts` (`chiama`, `daGestore`, `aEsitoAzione`),
`src/api/ponte.ts` (`gestoriDelleProcedure`), `src/api/indice.ts`,
`src/api/procedure/` (11 file, una riga per area), `src/azioni.ts` (la riga che
li sparge), `prove/api/copertura.test.mjs`.

---

### ADR-28 — Gli schemi fatti in casa, con il contratto Standard Schema

**Contesto.** ADR-27 mette davanti a ogni azione una forma dell'ingresso
convalidata a runtime. Serviva un validatore, e la scelta ovvia era zod — o
valibot, o arktype.

Il problema che quel validatore deve risolvere è più piccolo di quel che
sembra. Il registro ha già `src/dominio/validazione.ts`: 2456 righe che sanno
che i semestri devono essere contigui, che uno slot di lezione dura un multiplo
esatto di unità didattica, che una consegna senza destinatari non è completa.
Quel che mancava non era «sapere se una `Lezione` sta in piedi», ma sapere se
un **messaggio** ha la forma giusta: «questa procedura vuole un `lezioneId`, un
`allievoId` e uno stato fra questi cinque».

**Decisione.** Gli schemi sono scritti nel progetto, in `src/api/schemi.ts`, e
**espongono il contratto «Standard Schema»** (`~standard`) — la stessa
interfaccia che zod, valibot e arktype implementano. Il nucleo non conosce quel
file: conosce quell'interfaccia.

Da una dichiarazione sola escono tre cose: la convalida a runtime, il tipo
TypeScript per inferenza (così non va scritto due volte, e la seconda volta che
si scrive la stessa cosa è la volta in cui si sbaglia), e una descrizione in
JSON Schema — che è quel che serve per spiegare una procedura a chi la chiama
da fuori. La `Forma` è tenuta separata dalla funzione di convalida apposta: una
funzione non si sa raccontare, e l'aiuto della riga di comando legge la forma.

**E per le entità intere, `entita()`.** Un'entità del registro — una `Lezione`,
un `PianoLezione`, una `Consegna` — si convalida **con il validatore del
dominio**, mai con una forma riscritta accanto a quella vera. Lo schema fa la
sola cosa che il dominio non fa: si accerta che sia arrivato un oggetto con un
id, perché un validatore scritto per una `Lezione` non è tenuto a sopravvivere
a un numero o a `null`. Poi passa la palla; e se il validatore lancia comunque,
quel guasto diventa un *ingresso non valido* invece di un guasto interno —
l'errore è di chi ha chiamato, e va detto così.

**Conseguenze.** Nessuna dipendenza nuova per fare quel che
cinquecento righe di questo progetto fanno: l'applicazione scrive già da sé lo ZIP e l'SMTP, e un validatore di
messaggi è meno impegnativo di tutti e due. In cambio, questi schemi coprono
meno: niente tipi ricorsivi, niente trasformazioni, niente unioni discriminate
profonde. Sono le cose che oggi non servono a nessuna procedura.

La porta resta aperta, ed è il punto dell'intera decisione: il giorno in cui
servisse di più, si sostituisce la libreria **senza toccare una riga di nucleo
o di procedura**, perché quel che il nucleo chiama è `~standard.validate`.

`entita()` evita la conseguenza peggiore, che sarebbe stata silenziosa: due
verità sulla stessa entità, da tenere allineate a mano. La seconda sarebbe
restata indietro al primo campo nuovo, e nessuno se ne sarebbe accorto finché
un ingresso valido non fosse stato rifiutato — o, peggio, uno storto accettato.

**Vincoli che ne derivano.**

- **Un'entità del registro non si riscrive come forma.** Se esiste una
  `valida*` di dominio, `entita()` la usa. Se il validatore ha bisogno di
  sapere che cosa c'è già nel registro — `validaClasse(classe, altre)`,
  `validaCorso(corso, altri)` — il controllo resta **dentro il gestore**, dove
  quelle cose si sanno, e lo schema si ferma al controllo di forma.
- **Il nucleo non può importare `schemi.ts` per qualcosa che non sia il
  contratto `~standard`.** È la condizione che tiene aperta la porta di
  uscita: appena il nucleo conoscesse un dettaglio di questa implementazione,
  sostituirla smetterebbe di costare una riga.
- **`nullo` resta un attributo della forma, non un genere a sé.** «Un numero,
  oppure null» non è un genere: è un numero con un permesso in più. Tenuto
  separato, `schemaJson` pubblicherebbe un'unione dove basta
  `type: ["number", "null"]`, e chi si generasse un client da quello schema
  rifiuterebbe da solo il valore che il contratto gli chiede di mandare. È già
  successo, prima che l'attributo esistesse.
- **Uno schema d'oggetto scarta le chiavi che non dichiara.** È voluto — è la
  tolleranza verso un pannello più nuovo — e per questo è anche il vincolo di
  ADR-27 sulla copertura campo per campo.

**Dove vive.** `src/api/schemi.ts` (`Standard`, `Schema`, `Forma`, i
costruttori, `entita`, `schemaJson`), `src/dominio/validazione.ts` (i
validatori a cui `entita` passa la palla), `prove/api/schemi.test.mjs`.

---

### ADR-29 — Un canale per le domande, separato dalle azioni

**Contesto.** Il protocollo host↔pannello sapeva fare una cosa sola: mandare
un'`Azione` e ricevere una `Risposta`. Chiedere qualcosa senza cambiare niente
non era previsto, e non era una dimenticanza: il pannello quasi tutto ce l'ha
già — l'host gli spinge il `Registro` intero dopo ogni scrittura — e per quel
che sta nei dati continua a leggerselo da sé, che è più svelto di qualunque
andata e ritorno.

Restava però quel che nel registro **non c'è**: il sorgente di un modello di
stampa, l'inventario dei file scritti nel documento d'anno, un PDF composto per
prova, la diagnosi dei riferimenti rotti. Non avendo un modo di chiederlo, si
erano scritte due *azioni* che azione non erano — `modello.leggi` e
`modello.prova`, scritture che non scrivevano — e per farle rispondere si erano
aperti tre campi facoltativi nella busta di **ogni** `Risposta`: `testo`,
`nomi`, `pdf`. Tre campi che un salvataggio di voto, una spunta e una riga
d'appello si portavano dietro vuoti, per servire due chiamate su
centoquarantatré.

E restava soprattutto chi il registro non ce l'ha affatto: la riga di comando,
il condotto, il widget dell'agenda.

**Decisione.** Un secondo giro di buste sullo stesso canale IPC: `Domanda`
(`{ id, procedura, ingresso? }`) in salita, `Riscontro`
(`{ tipo: 'riscontro', id, ok, dati?, errori?, codice? }`) in discesa. Dal lato
pagina è `chiedi<T>(procedura, ingresso)` in `src/interfaccia/ponte.ts`, con una
mappa di attese tutta sua; dal lato host è `rispondiDomanda()` in
`src/pannelli/pannello.ts`.

**Le domande non entrano nella coda delle scritture.** `gestisci()` le
riconosce perché `typeof busta.procedura === 'string'` e le serve subito.

`modello.leggi` e `modello.prova` sono state ritirate dal protocollo e sono
diventate le letture `modelli.leggi` e `modelli.prova`; i tre campi sono
spariti da `Risposta` e da `EsitoAzione`. Le azioni sono passate da 143 a 141.

**Conseguenze.** La coda seriale resta la garanzia più forte che il sistema
abbia — due richieste arrivate vicine, un doppio clic, un salvataggio e una
spunta nello stesso istante, non si intrecciano mai sullo stesso registro — e
non viene indebolita, perché quel che la salta non scrive. Il guadagno è
misurabile dall'altra parte: una lettura è sincrona sul registro in memoria, e
metterla in fila dietro la generazione di venti PDF vorrebbe dire un'agenda
ferma dieci secondi per disegnare la settimana.

Il `Riscontro` porta il `codice` dell'API fino alla pagina, che la `Risposta`
non fa (vedi [ARCHITETTURA](ARCHITETTURA.md) § 11, voce 14). E `dati` è
garantito nella forma dichiarata, perché il nucleo convalida anche l'uscita:
una procedura che rispondesse storto produce un guasto dichiarato, non un
oggetto che si manifesta tre ridisegni più tardi.

Il costo: è un discriminante in più sullo stesso canale multiplexato, ed è una
*forma* del payload invece di un campo `tipo`. Peggiora di poco la voce 1 dei
debiti noti.

**Vincoli che ne derivano.**

- **Il privilegio regge su una riga sola, e quella riga non si tocca.**
  `rispondiDomanda` guarda `procedura(nome).genere` e **rifiuta tutto ciò che
  non è `'lettura'`**. Senza quel controllo basterebbe il nome giusto dentro una
  `Domanda` — `ore.appello.riga`, per dire — per scrivere nel registro saltando
  la serializzazione. Stare fuori dalla coda è sicuro *perché* le scritture
  vengono rifiutate, non perché la busta si chiama «domanda».
- **Una procedura raggiungibile come domanda dev'essere innocua davvero.** Non
  basta che non scriva sul `Registro`. `genere: 'lettura'` è una promessa più
  larga di così: **niente file aperti** con il programma predefinito, **niente
  finestre** o dialoghi di sistema, **niente rete** — né posta, né geocodifica,
  né OCR. Una lettura che aprisse un PDF nel lettore, o che chiedesse un
  indirizzo a Nominatim, sarebbe un effetto collaterale innescabile fuori dalla
  coda e senza che l'utente abbia premuto niente. Se una procedura ha bisogno
  di una di quelle cose, è una scrittura, e va chiesta come azione anche se non
  tocca un byte del registro.
- **Una lettura non dichiara `collezioni`**, e non può prendere in carico
  un'azione: sono due modi di dire la stessa cosa due volte, e
  `prove/api/copertura.test.mjs` li verifica tutti e due.
- **Una lettura torna il conto già fatto dal dominio**, mai i dati grezzi da
  ricontare, e in una forma piatta e dichiarata invece dei tipi interni.
  `corso.presenze` manda i tre denominatori accanto ai numeri proprio perché
  nessuno possa ricavarne un quarto: `RigaCorso` può cambiare quando serve al
  registro, la risposta di `corso.presenze` no, perché è un contratto con chi
  la legge.
- **Non si rimettano campi di ritorno nella `Risposta`** per servire una
  chiamata sola. È esattamente la cosa che questo ADR ha disfatto.

**Dove vive.** `src/protocollo.ts` (`Domanda`, `Riscontro`,
`MessaggioVersoWebview`), `src/interfaccia/ponte.ts` (`chiedi`, `Esito<T>`),
`src/pannelli/pannello.ts` (`gestisci`, `rispondiDomanda`),
`src/api/procedure/lettura.ts` e le letture di `ore.ts` e `rapporti.ts`,
`src/interfaccia/viste/modelli.ts` (l'unico consumatore dentro il pannello),
`prove/api/letture.test.mjs` e `prove/api/scritture.test.mjs` — quest'ultimo
legge dal sorgente che `rispondiDomanda` chiami ancora il nucleo e rifiuti
ancora le scritture, perché quella guardia è una riga sola e si toglie senza
accorgersene.

---

## Decisioni implicite mai scritte

Il codice le applica in modo consistente, ma nessun documento del progetto
le dichiara come scelta deliberata. Le motivazioni qui sotto sono
**ricostruite** dall'osservazione del codice, non citate da una fonte: dove
il progetto non dice esplicitamente "perché", questo file lo segnala invece
di inventare una spiegazione a posteriori.

**Due di queste voci non sono più soltanto implicite.** La 3 (validazione
runtime solo sugli aggregati grandi) e la 5 (errori come stringhe libere) sono
state affrontate dal livello `src/api/`, e ciascuna porta in coda che cosa è
cambiato e che cosa no. Restano scritte per intero, com'erano: una decisione
implicita che viene superata non si cancella, perché la descrizione di *com'era*
è la sola cosa che spiega perché la si è cambiata — e senza quella, prima o poi
si torna indietro per distrazione.

**1. Command bus su un aggregato unico, con push dello stato intero.**
Cosa fa oggi: le azioni utente (`src/azioni/*.ts`) passano per un orchestratore
centrale (`Archivio` in `src/dati/archivio.ts`) che tiene l'intero `Registro`
in memoria e lo modifica in blocco (`archivio.modifica(operazione,
collezioni)`); l'interfaccia riceve lo stato aggiornato e si ridisegna per
intero (coerente con ADR-06). Non esiste un bus di eventi granulare per
singola entità. Perché probabilmente è così: un solo docente, un solo
documento aperto alla volta — un aggregato singolo evita la complessità di
sincronizzare sotto-stati indipendenti quando in pratica c'è un solo
scrittore. Cosa costerebbe cambiarla: introdurre più utenti concorrenti (vedi
§6, visibilità multi-docente) richiederebbe rompere questa assunzione da
zero — oggi qualunque funzione con `applica(registro)` presuppone pieno
accesso in scrittura a tutto il registro, non solo alla porzione toccata.

**2. Risposta all'utente prima della persistenza su disco.**
Cosa fa oggi: una modifica aggiorna subito lo stato in memoria e
l'interfaccia (percepita come istantanea); la scrittura su disco è
debounced (350ms di inattività, tetto massimo 2000ms dalla prima modifica
non salvata — `RITARDO_SALVATAGGIO_MS`/`ATTESA_MASSIMA_MS` in
`src/dati/archivio.ts`). Perché probabilmente è così: scrivere un file ZIP a
ogni tasto sarebbe percepibilmente lento (misurato: fino a 40ms per una
riscrittura completa) e inutile — nessuno vuole un salvataggio per ogni
carattere digitato in una nota. Cosa costerebbe cambiarla: un crash
nell'intervallo di debounce perde le ultime modifiche non ancora scritte
(fino a 2 secondi di lavoro); ridurre la finestra abbasserebbe questo
rischio a costo di più scritture su disco.

**3. Validazione runtime solo sugli aggregati grandi.**
Cosa fa oggi: non esiste una libreria di validazione schema (zod, io-ts,
ecc.) applicata campo per campo; la validazione runtime reale si concentra
sui normalizzatori dei grandi aggregati (`normalizzaRegistro`,
`normalizzaAnno`, `normalizzaClasse`, ecc. in `src/dominio/validazione.ts`,
2456 righe), chiamati ai bordi (caricamento file, import). Il type system di
TypeScript garantisce la forma *a compile time*; a runtime, un valore che
non rispetta il tipo dichiarato viene semplicemente accettato se non passa
per uno di questi normalizzatori. Perché probabilmente è così: i
normalizzatori esistono per un motivo concreto e dichiarato nel codice (un
JSON di versione precedente o corretto a mano non deve mai far esplodere
l'apertura, deve degradare) — validare ogni singola funzione interna
sarebbe ridondante una volta che l'aggregato in ingresso è già garantito
pulito. Cosa costerebbe cambiarla: esporre il dominio dietro un'API di rete
(vedi `recon-dominio.md` §9) richiederebbe validare *anche* gli endpoint
granulari, perché un client esterno non passa più per forza dai
normalizzatori dei grandi aggregati.

> **Affrontata da ADR-27 e ADR-28** — e per la ragione esatta che questa voce
> prevedeva. «Esporre il dominio dietro un'API di rete richiederebbe validare
> *anche* gli endpoint granulari, perché un client esterno non passa più per
> forza dai normalizzatori dei grandi aggregati»: i client esterni sono
> arrivati — il widget dell'agenda, la riga di comando, il condotto JSON-RPC —
> e sono arrivati prima della rete. Oggi ogni chiamata passa da uno schema
> d'ingresso dichiarato (`src/api/schemi.ts`) convalidato dal nucleo prima di
> toccare l'archivio, e le azioni coperte sono tutte e 141.
>
> **Quel che non è cambiato, ed era il nocciolo giusto della decisione**: gli
> aggregati grandi si convalidano ancora con i normalizzatori e le `valida*` di
> dominio, non con una forma riscritta nello schema. `entita()` passa la palla
> al validatore del dominio proprio per non avere due verità sulla stessa
> entità (ADR-28). Lo schema dice che il *messaggio* ha la forma giusta; il
> dominio dice che la *cosa* sta in piedi. Sono due domande diverse, e la
> seconda è sempre stata di `validazione.ts`.
>
> **Quel che resta scoperto**: i cinque protocolli del guscio (benvenuto,
> impostazioni, dialogo, agenda) sullo stesso canale IPC — vedi
> [ARCHITETTURA](ARCHITETTURA.md) § 11, voce 1.

**4. Nessuna autorizzazione, perché l'app è single-user.**
Cosa fa oggi: nessun file del dominio gestisce permessi o ruoli; qualunque
funzione con `applica(registro)` presuppone pieno accesso in scrittura a
tutto — non c'è un concetto di "questo docente può vedere/modificare questa
classe" contro un altro. Perché probabilmente è così: l'app è pensata per un
singolo docente su una singola macchina (o un singolo file `.registro`
aperto da una macchina alla volta, mediata solo dalla serratura informativa
di ADR-19). Cosa costerebbe cambiarla: è la lacuna esplicitamente segnalata
come "architetturale" nel vecchio `LACUNE.md` (voce 57: "nessun ruolo/
riservatezza interna — chi apre il file vede tutto") — introdurla
richiederebbe un livello di autorizzazione **sopra** l'attuale layer di
dominio, non un aggiustamento locale.

**5. Errori come stringhe italiane libere, non codici strutturati.**
Cosa fa oggi: `Esito { valido, errori: string[] }` in tutto
`validazione.ts` — i messaggi di errore sono frasi italiane complete pronte
per l'interfaccia (spesso composte con `lessico.ts`), non codici tipo
`ERR_SEMESTRE_NON_CONTIGUO` con traduzione separata. Perché probabilmente è
così: l'interfaccia è l'unico consumatore oggi, e un'unica lingua/un unico
pubblico rende inutile il livello di indirezione di un codice errore.
Cosa costerebbe cambiarla: una futura API (vedi §6) o un'internazionalizzazione
dovrebbe reintrodurre codici stabili — oggi cambiare il testo di un
messaggio di validazione è innocuo, ma un consumatore esterno che provasse a
fare pattern-matching sul testo dell'errore si romperebbe a ogni refactor di
formulazione.

> **Affrontata a metà da ADR-27.** «Una futura API dovrebbe reintrodurre codici
> stabili»: l'API c'è, e i codici anche. `src/api/contratto.ts` dichiara otto
> `Codice` — `ingresso-non-valido`, `non-trovato`, `rifiutato`, `conflitto`,
> `non-disponibile`, `procedura-sconosciuta`, `non-permesso`, `interno` — otto
> e non venti: uno in più si aggiunge quando qualcuno deve *reagire* in modo
> diverso, non quando il testo cambia.
>
> **Il codice sta accanto alle frasi, non al posto loro.** Era l'unico modo di
> farlo senza rompere niente: i messaggi restano in italiano, restano quelli
> che il pannello mostra già oggi, e nessuna frase è stata riscritta passando
> di qui. `errore.nonTrovato` prende un `Termine` del lessico e non una
> stringa, così «Lezione non trovata» e «Momento di valutazione non trovato»
> concordano da sé (ADR-01).
>
> **Quel che resta**: il codice arriva intero a chi chiama dal condotto, dalla
> riga di comando e dal canale delle domande (`Riscontro.codice`, ADR-29), ma
> **non** al pannello: `aEsitoAzione()` appiattisce il `Risultato` in
> `{ ok: false, errori }` per non toccare la busta che l'interfaccia legge già.
> Vedi [ARCHITETTURA](ARCHITETTURA.md) § 11, voce 14.

**6. Confini fra strati imposti da ESLint `no-restricted-imports`, non da package separati.**
Cosa fa oggi: il progetto è un unico package npm, non un monorepo con
pacchetti isolati; i confini architetturali dichiarati nel README
(dominio senza Electron/DOM, interfaccia senza Node, dati/azioni/pannelli
senza Electron diretto) sono imposti da regole ESLint `no-restricted-imports`
per cartella in `eslint.config.mjs`, con messaggi di errore scritti apposta
per spiegare *perché* la regola c'è (es. per `src/dominio/`: "non importa
niente da fuori di sé: è quel che permette di provarlo con `node --test` in
due secondi, senza Electron e senza un disco"). Perché probabilmente è così:
per un progetto di queste dimensioni, un monorepo con `package.json` per
strato sarebbe overhead di build/pubblicazione senza benefici reali — ESLint
ottiene lo stesso confine logico senza quell'overhead. Cosa costerebbe
cambiarla: il confine esiste solo finché qualcuno esegue il linter — non
c'è un errore a build-time indipendente se un import vietato passa
inosservato in un branch non lintato; spostare i confini in package reali
darebbe un confine imposto anche da TypeScript/bundler, al prezzo della
complessità di un monorepo.

**7. Niente integrazione continua (CI).**
Cosa fa oggi: non esiste una cartella `.github/workflows` né altra
configurazione CI nel repository; test (`npm test`), controllo tipi (`npm
run controllo-tipi`) e stile (`npm run controllo-stile`) sono script npm
eseguiti solo localmente, a discrezione di chi sviluppa. Perché probabilmente
è così: progetto con un solo manutentore attivo (a giudicare dalla cronologia
Git) — l'overhead di configurare e mantenere una pipeline CI per un solo
paio di mani non si è ripagato finora. Cosa costerebbe cambiarla: aggiungere
CI è a basso rischio (gli script esistono già, andrebbero solo invocati da
un workflow), ma finché non esiste, nulla impedisce che un commit rompa
`npm test`/`tsc --noEmit` senza che nessuno se ne accorga finché non lo
esegue a mano.

---

## Vincoli intoccabili

| Vincolo | Motivo | Cosa si rompe violandolo |
|---|---|---|
| Segnaposto `{allievo}`, `{{allievo}}`, `tabella: allievi` | Contratto con i modelli di stampa ed e-mail già personalizzati dagli utenti | Ogni modello e oggetto di posta personalizzato dagli utenti smette di funzionare |
| Nomi delle cartelle su disco (`allievi/<Cognome Nome>/`, `documentazione/`, `in-arrivo/`, `quarantena/`) | Rinominarle sposta file già sincronizzati su OneDrive | Sincronizzazione cloud rotta, file duplicati o "persi" agli occhi dell'utente |
| `DOCUMENTO_SCHEDE_PRIMA` | Nomi storici delle "schede personali" mantenuti per riconoscere le stampe vecchie | Le stampe vecchie smettono di essere riconosciute per quel che sono |
| CSP del pannello mappa `default-src 'none'` | Il webview non deve mai parlare direttamente con la rete (privacy dati minori) | Bypassa la garanzia "ogni uscita di dati è un gesto visibile" di ADR-04 |
| Estensione `.registro` come ZIP+JSON leggibile anche senza l'app | Recuperabilità in caso di rottura dell'app (ADR-17) | Un documento diventa illeggibile se l'app si rompe o viene dismessa |
| Percorsi nei JSON relativi alla cartella dell'anno | Un anno deve restare spostabile/consegnabile (ADR-20) | Riferimenti a file rotti dopo lo spostamento della cartella anno |
| Nomi colonne tabella "di serie" nei riferimenti `tabella:` dei modelli | Rinominare una colonna in `_testi.tpl` non deve rompere i modelli | Modelli personalizzati smettono di trovare la colonna referenziata |
| Nessuna risalita `..` nel percorso di un'`immagine:` nei modelli | Vincolo di sicurezza (path traversal) | Un modello potrebbe leggere file fuori dalla cartella consentita |
| Apertura file per percorso diretto, mai `openExternal`/URL per file locali | Bug di encoding non-ASCII + rischio injection (ADR-22) | Percorsi con caratteri non-ASCII si aprono male; injection via nome file con `&` |
| `contaComeAssenza` in un solo posto (`dominio/calcoli.ts`) | Tenuto testato contro tutti e 5 i consumatori (ADR-11) | Rischio di tre conteggi diversi fra quadro persona/riepilogo/matrice/rapporti/soglia |
| Regola soglia assenza in un solo posto (`dominio/segnalazioni.ts`) | Stessa logica di ADR-11 applicata alla soglia di segnalazione | Segnalazioni incoerenti fra viste diverse |
| Catalogo modelli e cartella `templates/` con gli stessi nomi | Controllato da `npm test` | `npm test` fallisce; i modelli di serie non passano la verifica |
| `prove/campioni/*.registro` rigenerato **solo** quando il formato cambia apposta | Unica prova che guarda indietro (compatibilità di formato, ADR-17) | Perdita silenziosa della garanzia di compatibilità con documenti vecchi |
| "Un comando, una superficie per volta" (ADR-07) | Evita pulsanti duplicati che confondono l'utente | Superfici UI ridondanti, esperienza incoerente |
| Dominio senza dipendenze da Electron/DOM | Testabilità con `node --test` senza aprire finestre (ADR-02) | `npm test` non gira più senza Electron; perde il confine imposto da ESLint |
| Widget agenda: `SetWindowPos` non `setBounds`, evitare `movable: false` | Electron riporterebbe la finestra dentro l'area di lavoro, disfacendo l'ancoraggio | Il widget smette di restare ancorato fuori dall'area di lavoro; la riserva appbar va comunque rimossa esplicitamente all'uscita (`spegni()`) |

---

## Questioni aperte

Decisioni non ancora prese che il codice aggira, non risolve. Restano
domande per chi mantiene il progetto — questo file non le decide al posto
suo.

- **Visibilità multi-docente.** Più docenti della stessa classe vedono/
  condividono oggi lo stesso registro? Il vecchio `LACUNE.md` la segnalava
  esplicitamente come la decisione architetturale da prendere *prima* delle
  altre (voce 13/55). Nessuna struttura dati oggi distingue "di chi è" una
  scrittura oltre al nome macchina nella serratura informativa (ADR-19).

- **Cifratura del documento `.registro`.** Il documento contiene dati
  personali di minorenni (indirizzi, telefoni, situazioni familiari nelle
  note) in un file ZIP leggibile in chiaro da chiunque vi acceda
  fisicamente. Cifrarlo cambierebbe la garanzia "apribile anche con `unzip`"
  di ADR-17 — le due esigenze vanno conciliate, non è ovvio come.

- **Ruoli e riservatezza interna.** Legata alla visibilità multi-docente ma
  distinta: anche con un solo utente per file, "chi apre il file vede
  tutto" (citazione dal vecchio `LACUNE.md`, voce 57) — non c'è distinzione
  fra dati che un supplente dovrebbe vedere e dati riservati al docente
  titolare.

- **Accesso da tablet/telefono.** L'app è Electron desktop; non esiste oggi
  un percorso per consultare o aggiornare il registro da un dispositivo
  mobile (es. per fare l'appello in aula da tablet). Implicherebbe
  probabilmente un server/sincronizzazione, in tensione con l'architettura
  "singolo file locale" di ADR-17/ADR-19/ADR-20.

- **SQLite (o database) contro file JSON.** L'intero modello dati è JSON in
  un pacchetto ZIP, con normalizzazione applicata in lettura invece di
  vincoli imposti da uno schema di database. Funziona bene per un singolo
  utente e garantisce leggibilità/diffabilità (JSON indentato, diffabile
  sotto Git) e recuperabilità (ADR-17), ma non offre transazioni reali
  multi-collezione (vedi il punto di rischio "IO non transazionale
  multi-collezione" nella ricognizione dati) né query efficienti su archivi
  molto grandi. Passare a SQLite risolverebbe alcuni di questi problemi al
  prezzo di rompere ADR-17 (un file `.registro` non sarebbe più leggibile
  con un semplice `unzip` + editor di testo).
