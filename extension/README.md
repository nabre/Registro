# Registro docenti

Registro di classe per VS Code: calendario delle lezioni, classi e allievi,
piani lezione e momenti di valutazione. I dati stanno in file JSON dentro il
workspace, accanto al resto del materiale del docente.

L'estensione si carica da sola all'apertura della cartella e apre il pannello
se il registro è già stato usato qui.

## Come è fatto

| Cosa | Dove |
| --- | --- |
| Modello, calendario, medie, validazione | `src/dominio/` |
| Impaginazione dei rapporti | `templates/`, `src/dominio/rapporti.ts`, `src/dati/rapportiPdf.ts` |
| Che cosa il registro mette dentro un rapporto | `src/dominio/datiRapporti.ts` |
| Lettura e scrittura dei file | `src/dati/` |
| Comandi, viste laterali, pannello | `src/estensione.ts`, `src/pannello.ts`, `src/vista/` |
| Contratto fra host e pannello | `src/protocollo.ts` |
| Applicazione delle azioni | `src/azioni.ts` |
| Interfaccia del pannello | `src/webview/` |

Il dominio non conosce né `vscode` né il DOM: lo usano l'extension host, il
webview e i test, e per questo `npm test` gira senza avviare l'editor.

**La guida sta dentro l'applicazione**, ultima voce della barra laterale: una
sezione per pagina, con che domanda risponde e i gesti che si fanno, e da ogni
sezione si va alla pagina vera. Il contenuto è una struttura di dati in
`src/webview/viste/guida.ts` — chi aggiunge una funzione aggiunge una riga —
perché una guida faticosa da aggiornare è una guida che dopo tre mesi dice il
falso, che è peggio di non averla. Questo file resta il documento di chi
sviluppa: dice *perché*, la guida dice *come*.

L'interfaccia del pannello è scritta senza librerie. `src/webview/dom.ts` è un
`h()` che costruisce elementi veri; la vista si ridisegna per intero quando lo
stato cambia — non a ogni tasto premuto — e le finestre modali vivono fuori dal
ciclo di ridisegno, così quello che si sta scrivendo non si perde mai.

## Il giro, dall'inizio

Il registro ha una catena sola, e tutto il resto pende da lì:

```
Anno ──┬── Semestri (nascono con l'anno)
       └── Classe ──┬── Allievi
Materia ────────────┴── CORSO ──┬── Orario ──> Lezioni ──> appello, osservazioni, consuntivo
                                ├── Piano lezione ──> attività ──> momenti di valutazione ──> voti
                                └── si duplica per un altro corso
```

**La prima volta** non serve percorrerla a mano: `Registro: avvio guidato`
chiede anno, classe, materia e le ore in cui si fa lezione, e da quei quattro
campi fa nascere i sei pezzi nell'ordine giusto, lezioni sul calendario
comprese. Non è una scorciatoia che nasconde il modello — al termine ci sono
gli stessi oggetti che si sarebbero fatti a mano, ognuno modificabile dal suo
modulo.

**Dopo**, ogni pezzo si crea dal posto in cui serve, senza andarlo a cercare
altrove: dove una tendina chiede qualcosa che non c'è ancora, il **«+» accanto**
lo crea sul momento e lo sceglie da solo. La materia dal modulo della classe, il
corso dal modulo della lezione, il piano dal modulo della lezione, la classe dal
modulo del corso. Nessun ordine obbligato da indovinare, e quel che si stava
scrivendo non si perde.

| Cosa | Da dove | Che cosa vuole già pronto |
| --- | --- | --- |
| Anno scolastico | Impostazioni, o l'avvio guidato | — |
| Materia | Impostazioni, o il «+» di ogni tendina | — |
| Classe | Classi, o il «+» del modulo del corso | un anno |
| **Corso** | **Corsi**, o il «+» di lezioni e valutazioni | una classe e una materia |
| Orario | la scheda del corso | un corso |
| Lezione | l'orario che le genera, o il calendario | un corso |
| Piano lezione | Piani, o il «+» del modulo della lezione | un corso |
| Momento di valutazione | la tappa del piano, dentro la lezione — e da nessun'altra parte | una lezione con un piano |

## Concetti

**L'anno scolastico è una cartella.** Non è un campo dentro i dati: è dove i
dati stanno. `registro/2026-2027/` contiene le classi di quell'anno, le sue ore,
i suoi voti, la sua documentazione e la sua cassetta della posta; `registro/2027-2028/`
ne contiene altre, e le due non si vedono mai. Il registro ne tiene aperto uno
per volta, e cambiarlo — da **Impostazioni**, «Apri quest'anno» — non è un
filtro: apre un'altra cartella e ricarica.

Sono tre cose che si guadagnano insieme. Un anno finito si archivia, si copia su
una chiavetta o si consegna a chi subentra spostando una cartella, invece di
esportare qualcosa. Un elenco che si dimentica il filtro dell'anno non può più
mostrare i voti di due anni insieme, perché gli altri anni non sono nemmeno
caricati — ed era l'errore peggiore che il registro potesse fare, perché in una
media non si vede. E un registro di dieci anni pesa quanto uno di uno.

Il prezzo è che quel che si vede è di un anno solo, e per rispondere a «com'era
l'anno scorso» bisogna aprire l'anno scorso. È il prezzo giusto: quella domanda
si fa due volte l'anno, mentre il rischio di mescolare due anni correva ogni
giorno.

Materie, scala dei voti e griglia oraria stanno dentro l'anno, e si copiano in
quello nuovo alla creazione. Copiate e non condivise: sono le stesse quasi
sempre, ma un anno chiuso deve restare leggibile con la scala con cui è stato
scritto, anche se intanto la scala è cambiata.

In radice resta un `registro.json` di due righe, che dice soltanto quale anno è
aperto. Sta lì e non nelle impostazioni di VS Code perché la scelta appartiene
alla cartella: chi apre lo stesso registro sincronizzato su un altro computer si
ritrova sullo stesso anno.

**Il semestre dei conteggi.** In fondo alla barra, sotto l'anno, c'è il periodo
su cui si contano le cose: un semestre, o l'anno intero. Non è un filtro come
gli altri — è la scansione su cui la scuola ragiona, e vale per tutto quel che
riassume: ore svolte, buchi da chiudere, assenze, ritardi, medie, numeri dei
corsi. Una media che mescola i due semestri non è la media di niente, la pagella
ne chiede una per semestre, e «dodici assenze» detto senza dire di quale metà è
un numero che non si può usare. Ogni riepilogo dice a quale periodo si riferisce,
nel proprio sottotitolo.

Il calendario non lo guarda: lì si naviga per l'anno intero, e restringere
vorrebbe dire settimane vuote. Aprendo il registro il periodo è quello in cui
cade oggi — quasi sempre quello che si vuole — e da lì in poi comanda quel che si
è scelto. C'era anche una seconda tendina dentro le Valutazioni: due controlli
per la stessa cosa vogliono dire due numeri diversi letti nello stesso
pomeriggio, e ne è rimasto uno.

**Anno scolastico e semestri.** Le classi stanno dentro un anno, e tutto il
resto risale a loro. Ogni anno ha due semestri: è la scansione su cui si
raggruppano le valutazioni e si calcolano le medie. Il semestre di una
valutazione non è scritto da nessuna parte — è quello in cui cade la sua data,
e si ricava ogni volta.

**Il calendario ha quattro viste.** La **settimana** è quella di lavoro: si vede
l'orario com'è davvero, con le pause e le sovrapposizioni. Il **mese** è una
striscia continua che scorre dentro l'anno. L'**agenda** elenca quel che viene.

L'**anno** è il calendario che la sede stampa e appende: tutti i mesi
affiancati, i giorni in riga. Ogni giorno ha tre colonnine, nell'ordine in cui
le legge chi ha quel foglio appeso — la lettera della settimana a sinistra, che
cosa succede in mezzo, l'iniziale del giorno a destra — e le tre larghezze sono
le stesse in tutti i mesi, così le colonnine si leggono anche in verticale.

I colori e i motivi sono quelli del **mese**: il tratteggio diagonale delle
chiusure, il fondo spento di sabato e domenica, la tinta del confine di
semestre, il punto colore della classe. Non c'è un vocabolario tutto suo — una
quarta convenzione da imparare — e il giorno in cui il tratteggio delle vacanze
cambia, cambia dappertutto. Qui si aggiunge solo quel che nel mese non serviva:
l'iniziale del giorno si spegne nel fine settimana, come là si spegne il numero.

Anche la cella è fatta come quella del mese: nessuno sfondo suo, e la griglia
disegnata dai filetti dei bordi. Era una piastrella grigia staccata dalle
vicine, e le stesse velature — il fine settimana, il tratteggio, il giorno di
oggi — cadevano su una base che nel mese non c'è: gli stessi colori finivano
per sembrarne altri.

In mezzo alla casella, **quanti corsi** ci sono quel giorno — non quante ore.
Due ore dello stesso corso di seguito sono un impegno solo, e in una casella
larga tre caratteri «4 ore» faceva sembrare pieno un giorno con due materie.
Guardando l'anno si conta di quante classi ci si occupa quel giorno, non per
quanto tempo. Accanto, il punto colore di ciascuna. E la A o la B sul lunedì
della sua settimana. Il confine di semestre è una riga orizzontale, e da che parte sta
dice quale dei due: **sopra** il giorno in cui un semestre comincia, **sotto**
quello in cui finisce — un bordo tutt'attorno diceva «qui succede qualcosa» e
lasciava indovinare che cosa. Un clic su un giorno lo apre nella vista
settimana.

Il nome della vacanza si scrive il primo giorno e poi ogni lunedì, non su
tutte le caselle: due settimane di Natale ripetevano «Vacanze di Natale»
quattordici volte, ognuna tagliata a metà dalla colonna stretta, e la
ripetizione copriva quel che nelle celle accanto c'era da leggere. A ogni
lunedì e non solo il primo giorno perché chi guarda una riga qualsiasi deve
sapere che cos'è quel verde: senza, una pausa cominciata in fondo al mese prima
sarebbe una colonna verde di cui nessuno dice il perché.

I numeri dei giorni sono ripetuti in tre punti: ai due capi e in mezzo, al
passaggio di semestre. Dodici colonne di seguito senza un riferimento in mezzo
si leggono male — per sapere in che riga si è bisogna tornare fino al bordo, e
a metà strada si sbaglia riga. È lo stesso motivo per cui il foglio stampato ce
li ha. Sopra ogni gruppo di mesi, il nome del suo semestre.

I mesi stanno in una griglia sola. Erano due blocchi, uno per semestre, e il
secondo finiva sotto il primo: per confrontare novembre con marzo si guardava
in due punti diversi dello schermo, che è proprio quel che questa vista deve
togliere. Quando non ci stanno, il foglio scorre di lato invece di schiacciare
le colonne fino a renderle illeggibili.

Serve a domande che le altre tre non reggono: quante settimane restano prima di
Natale, dove cade il ponte di primavera, se la settimana della verifica è una A
o una B, quanto sta ancora dentro il primo semestre. Sono domande che si fanno
guardando l'anno tutto insieme — scorrendo mese per mese ci si perde il conto,
ed è esattamente il motivo per cui quel foglio stampato esiste.

**Settimane A e B.** Dove l'orario è quindicinale, ogni settimana dell'anno può
essere marcata A, B, o nessuna delle due. Si marcano dalle **Impostazioni**,
nella scheda dell'anno: tutte le settimane in griglia, ognuna con le sue due
lettere. In fila e non una alla volta nel calendario, perché quel che si
controlla è il disegno dell'alternanza — dove salta si vede guardando la
griglia intera, mai aprendo quaranta settimane una per una. Le settimane
tutte di vacanza si spengono da sole: non aspettano una lettera.

Ricliccando la lettera già messa si toglie. «Nessuna delle due» è il caso
normale — vacanze, stage, settimane in cui la quindicina non conta — e non
merita un terzo pulsante acceso in quasi tutte le settimane dell'anno.

Nel calendario la lettera si legge e basta, e si legge in tutte e quattro le
viste: accanto al numero nella striscia delle settimane, nella colonna del
mese, sul lunedì nella griglia dell'anno, nell'angolo sopra i giorni della
settimana aperta e nella testata di ogni giorno dell'agenda. Lì serve a sapere
dove si è, non a decidere.

Nell'agenda in particolare non si potrebbe ricavare da quel che si ha sotto gli
occhi: si scorre giorno per giorno, e il lunedì che porta la lettera può essere
passato da tre righe o non comparire affatto, se in quel giorno non c'erano
lezioni.

Si assegnano a mano, una per una, e non si ricavano da una regola del tipo
«alterna da settembre». La regola non regge il primo imprevisto: basta una
settimana di vacanza in mezzo, o un recupero, e da lì in poi ogni settimana
sarebbe sbagliata senza che niente lo dica. Per ora la lettera è
un'indicazione e nient'altro: non filtra il calendario e non decide quali ore
l'orario fisso genera.

La lettera si scrive nell'anno, sotto il lunedì che apre la settimana:
`"2026-08-31": "A"`. La chiave è una data e non il numero di settimana ISO
perché il numero cambia significato a cavallo dell'anno solare — la 1 di
gennaio e la 53 di dicembre confinano — mentre una data si confronta con
quella di una lezione senza convertire niente.

**Le date si scrivono, non si compilano.** Il campo data non è più quello del
browser — tre caselle in un ordine deciso dalla lingua dell'editor, da riempire
una per una battendo gli zeri, con l'anno che diventava 0007 se si sbagliava
casella. È un campo di testo, e legge quel che si scrive davvero:

| Si scrive | Viene letto |
| --- | --- |
| `7.9.2026` `7/9/2026` `7-9-2026` | 7 settembre 2026 |
| `7.9.26` | due cifre d'anno: gli anni Duemila |
| `7.9` | l'anno che il campo aveva già |
| `12` | il 12 dello stesso mese |
| `07092026` `070926` `0709` | le cifre di fila, come su un modulo |

Le frecce **su** e **giù** spostano di un giorno, **PagSu** e **PagGiù** di un
mese: correggere di uno è la cosa che si fa più spesso, e riscrivere tutta la
data per farlo era il resto della fatica. Quel che non si riesce a leggere
resta scritto e si segna in rosso, invece di essere cancellato: rimettere la
data di prima sotto le dita di chi sta correggendo è il modo più sicuro di
fargli perdere la correzione. Un 31 aprile non diventa il 1° maggio — chi
l'ha scritto voleva un altro giorno.

**Vacanze e giorni di chiusura** hanno una finestra loro, che si apre dalle
Impostazioni. Stavano dentro il modulo dell'anno, insieme ai semestri:
aggiungere un ponte deciso a gennaio voleva dire avere sotto gli occhi le date
dei due semestri, con il rischio di toccarle per sbaglio. I bottoni delle pause
tipiche — autunnali, Natale, carnevale, Pasqua — creano la riga già intitolata
e con le date nel periodo in cui cadono di solito, che poi si spostano.

**Classe e allievi.** Un gruppo di allievi, e nient'altro: la classe non dice
che materia ci si insegna. Un ritiro non cancella l'allievo: togliendo la
spunta «frequenta» esce dagli appelli ma resta nello storico, e le presenze e i
voti già registrati restano leggibili.

**Corso.** Questa materia, a questa classe. È il perno del registro: la classe
da sola è un gruppo, la materia da sola una voce di catalogo, e l'insegnamento è
la coppia. Ha una vista sua — **Corsi** — perché è la cosa che si prepara a
inizio anno e quella che si controlla quando qualcosa non torna. Si sceglie il
corso dalla tendina in alto e si vede tutto quel che lo riguarda: allievi, ore
svolte su quelle previste, UD, presenza e media di classe, valutazioni, piani,
l'orario fisso con quante UD fa a settimana, la prossima ora, il programma, e
sotto la tabella allievo per allievo.

Un corso alla volta, e prima era l'elenco di tutti. L'elenco rispondeva a
«quali corsi sono pronti?», che è una domanda di settembre e si fa una volta;
«come va questo corso?» ci si torna ogni settimana, e con le schede in fila
quello aperto scivolava sotto le altre insieme alla sua tabella. La tendina
costa un clic e restituisce lo schermo intero a quel che si sta guardando.

I numeri sopra e le righe sotto si contano una volta sola, insieme: contarli
due volte vorrebbe dire poterli contare in due modi, e la somma smetterebbe di
tornare con le righe senza che nessuno se ne accorga. La media di classe pesa
gli allievi, non i voti — chi ha fatto più prove non conta di più — e chi non
ha ancora nessun voto resta fuori invece di valere zero; quando non sono tutti,
l'etichetta lo dice: «media di 8 su 12».

Classe e materia di un corso non si cambiano più una volta creato:
sposterebbero lezioni, presenze e voti addosso a un altro gruppo senza che
nessuno se ne accorga. Una classe può avere più corsi — due materie allo stesso gruppo sono
due corsi, non due classi con gli stessi allievi dentro. Lezioni e valutazioni
conoscono il corso e nient'altro: classe, materia e anno si leggono da lì, e
non stanno scritti addosso a loro perché due copie della stessa cosa sono due
occasioni di dire cose diverse.

**Cruscotto.** La prima schermata, perché risponde alla prima domanda: dove sono
indietro? L'anno intero in una tabella — una colonna per corso, il titolo girato
in verticale perché con otto corsi un nome ruotato si legge ancora mentre uno
tagliato no; una riga per numero di lezione; la data nella cella con i segni di
quel che c'è e di quel che manca. Si legge in due versi: la colonna è il percorso
di un corso, la riga dice se le classi parallele viaggiano appaiate — che a
occhio non si sa mai.

I segni non sono decorazioni. Un'ora già passata senza appello, o passata e non
segnata svolta, si accende: sono i buchi che nessun'altra vista fa vedere tutti
insieme. Il confronto non è sullo stato dichiarato, perché lo stato è proprio la
cosa che si dimentica di aggiornare — un cruscotto che si fida di quel che gli si
dichiara non serve a niente. Un'ora futura senza scaletta è
lavoro da preparare, non un errore; la stessa ora passata non è più niente, si è
svolta lo stesso. In cima, i conti dell'anno e le ore di oggi.

Una tabella per semestre, con il numero di lezione che riparte da uno. Non è
grafica: è la scansione su cui si raggruppano le valutazioni e si calcolano le
medie, e «la dodicesima lezione» detto a maggio vuol dire la dodicesima del
secondo semestre. Le ore annullate non contano: la dodicesima è la dodicesima
che si è fatta, non la dodicesima casella del calendario.

**Il piano lezione è del corso.** Stava sulla materia, perché un piano si
riusa; ma «vale anche là» non è «è di là». Un piano preparato per una classe ne
conosce il livello e il tempo che ha, e cercarlo in un elenco dove metà delle
voci sono di altri corsi era il modo di non trovarlo. Il riuso passa dalla
**duplicazione**: si copia il piano dell'altro corso — o dell'anno scorso — e lo
si adatta. Nel registro, chiedendo il piano di un'ora, si vedono prima i piani di
quel corso e poi gli altri, marcati «da duplicare». I piani scritti quando
stavano sulla materia si agganciano da soli al primo corso che quella materia la
porta.

**Le durate si conservano in unità didattiche, e nel piano si scrivono in
minuti.** Sotto, una tappa dura una frazione di unità: così lo stesso piano
riusato dove le UD sono da cinquanta riempie comunque l'ora, invece di lasciarne
scoperto un decimo senza dirlo. Ma preparando una scaletta si ragiona «venti
minuti di esercizi», non «zero virgola quattro unità» — quindi dentro il piano
lezione, e solo lì, la durata si scrive e si legge in minuti. Tutto il resto —
la capienza di un'ora, l'appello, i conti dell'anno — resta in UD, che è l'unità
in cui la scuola conta. I piani scritti prima si rileggono da soli.

**C'è un tipo di attività per la docenza di classe.** Il tempo che si passa con
la propria classe e che non è insegnamento della materia — comunicazioni,
moduli, colloqui, la gita da organizzare — è una tappa come le altre, con un
ordine del giorno invece di un riferimento sul libro. Compare fra i tipi solo
sulle classi di cui si è docente di classe: altrove sarebbe una voce che non
capita mai, in mezzo a quelle che si scelgono ogni volta.

**Le attività hanno parametri, e possono essere valutate.** Ogni tipo di tappa
chiede quel che serve a lui — la grandezza dei gruppi e come si formano, la
durata e il punteggio di una verifica, la postazione e le istruzioni di
sicurezza di un laboratorio — e nel modulo compaiono solo i campi di quel tipo.
Quel che era stato scritto sotto un tipo di prima resta nel file e smette di
comparire: cambiare tipo per sbaglio non cancella niente.

**Un'attività è il momento di valutazione.** Una tappa dice di essere una prova:
si spunta «È una valutazione» e si scrivono titolo, tipo e peso. Il momento vero
non nasce lì — nasce dentro la lezione in cui la prova si fa, con un clic sulla
tappa, già compilato con quel che il piano aveva detto e con la data dell'ora.
Due prove nella stessa lezione restano due momenti distinti, perché ognuno sa da
quale tappa viene.

Il piano nel suo insieme non ha più una casella «valutazione prevista». Ce
l'aveva, accanto a quella delle attività, e le due dicevano la stessa cosa in
disaccordo: il piano prometteva «una verifica» mentre la scaletta ne aveva due,
o nessuna. La prova è un quarto d'ora dell'ora, non una proprietà dell'ora
intera. I piani scritti prima si rileggono così: la valutazione si posa sulla
loro tappa di verifica, e se non ce n'era una la tappa si aggiunge in fondo.

**La scaletta è una tabella, in scrittura e in lettura.** Le colonne — numero,
attività, tipo, durata, e in aula anche quando cade e a che punto è — stanno
ferme su una griglia sola, con i nomi in cima. Prima ogni riga si disponeva per
conto suo: con titoli di lunghezza diversa i tipi e le durate finivano ognuno a
un'ascissa sua, e confrontare due tappe voleva dire leggerle una per una. Quel
che in una colonna non ci sta — descrizione, parametri, prova, materiale —
scende sotto, allineato al titolo. Su un pannello stretto le colonne si
impilano: una tabella schiacciata è peggio di un elenco.

**Ogni attività porta con sé il suo materiale.** La scheda del lavoro di gruppo
appartiene a quel quarto d'ora, non al piano intero: si allega dalla riga della
tappa, mentre si scrive la scaletta, e in aula compare sotto la tappa a cui
serve. Quel che vale per tutta l'ora — la dispensa del capitolo, il video
d'apertura — sta invece fra le risorse del piano. Un collegamento resta un
indirizzo; un file e un'immagine vengono copiati nell'archivio del registro,
accanto agli altri documenti di quel corso, perché il PDF scelto può stare in
Download e sparire mentre il piano deve reggere anche l'anno prossimo.
Allegare qualcosa salva il piano su cui si sta lavorando: un file dev'essere di
qualcuno. Una risorsa finita sulla tappa sbagliata si sposta dalla matita, senza
cancellarla e riallegarla: il file si sposta con lei e cambia nome, perché il
nome dice a quale tappa appartiene.

**Le tre schede della lezione.** Aprendo un'ora si fa quasi sempre una cosa
sola, e sono tre mestieri diversi. **Amministrazione** — appello e consegne — si
fa mentre la classe entra. **Lezione** — piano, svolgimento, valutazioni —
durante e dopo. **Annotazioni** — le osservazioni su qualcuno — quando c'è
qualcosa da segnare. Stavano tutte aperte insieme, e per arrivare all'appello
bisognava scorrere mezza pagina. La scheda scelta si ricorda fra un'ora e
l'altra.

**I voti si mettono nella lezione.** Il foglio delle valutazioni sta dentro
l'ora in cui la prova si è fatta: data e classe le eredita dalla lezione, e non
c'è niente da ridigitare né da cercare altrove. La vista **Valutazioni** resta,
ma per guardare: l'anno intero, le medie, i confronti fra momenti — con le
caselle in sola lettura, perché due posti in cui scrivere lo stesso voto sono un
posto di troppo.

**Il corso si guarda anche per allievo.** Sotto l'elenco dei corsi, il corso
aperto mostra una riga per allievo: presenza, UD seguite, UD di assenza,
ritardi, prove fatte, media e nota. È la domanda di metà semestre — «come sta
andando questa classe in questa materia?» — e prima non aveva un posto: le
presenze stavano dentro l'ora, i voti nella vista Valutazioni, e per rispondere
bisognava aprire venti lezioni e contare a mente. Il denominatore delle presenze
sono le UD su cui l'appello è stato fatto, non tutte: un'ora dimenticata non è
un'ora di assenze, e contarla come tale farebbe crollare la percentuale di tutti.

**Dell'allievo il registro tiene chi è e come lo si raggiunge.** Cognome, nome,
l'indirizzo di casa e i recapiti — la sua e-mail, quella del tutore, il suo
telefono, l'azienda, e l'e-mail e il telefono del datore di lavoro che
controfirma i fogli delle assenze.
Nient'altro: data di nascita e note c'erano e non le riempiva nessuno, e
l'anagrafica della scuola sta altrove — tenerne una seconda copia qui vuol dire
tenerne una che invecchia.

L'indirizzo è una riga sola e non quattro campi — via, numero, NAP, località —
perché il registro non ci fa niente: non ordina per NAP e non stampa etichette,
lo mostra e basta. Spezzarlo vorrebbe dire quattro caselle da riempire per
ottenere la stessa riga, e un indirizzo estero che in quelle caselle non ci sta.

**Le valutazioni si guardano un corso alla volta.** Il corso è l'unico filtro
della vista — è già la coppia classe e materia, e chiedere prima la classe erano
due tendine per una scelta sola: la media in fondo alla griglia è quella del corso,
e mescolare le prove di matematica con quelle di italiano dà un numero che non è
la media di niente — mentre la colonna lo dichiarava come se lo fosse. Anche il
PDF e il CSV escono per corso: una classe con quattro corsi fa quattro fogli, che
è poi il modo in cui si consegnano.

**La nota di fine semestre ha un passo suo.** Durante l'anno i voti si mettono a
quarti di punto; la nota che va sulla pagella si dà a mezzi, e la media pesata di
sei prove non ci cade quasi mai sopra. Il passo si imposta accanto alla scala —
`0.5` di serie, `0` per non arrotondare — e la griglia mostra due colonne: la
**media**, che è il conto, e la **nota**, che è quel che si scrive. Prima
l'arrotondamento lo faceva a mente chi compilava, che è il posto peggiore dove
tenere una regola: due docenti la applicavano in due modi.

**I momenti sganciati si vedono e si buttano.** Un momento nasce dalla tappa del
piano che dichiara di essere una prova; quelli che quell'aggancio non ce l'hanno
— creati quando lo si poteva fare da cinque punti diversi, o rimasti senza la
tappa dopo — compaiono in cima alla vista, ognuno con il motivo per cui è
sganciato e quanti voti si porterebbe via. Si eliminano uno per uno o tutti
insieme. Non si riparano da soli e non si buttano da soli: portano dei voti, e i
voti sono l'unica cosa del registro che non si può rifare guardando altrove.

**Consegne.** Quel che si è dato da fare, e a chi. Hanno preso il posto del campo
di testo «compiti assegnati»: due posti per la stessa cosa erano un posto di
troppo. Nella lezione hanno una scheda loro, sotto lo svolgimento — ci stavano
dentro, e un elenco che si spunta non ha lo stesso ritmo di tre campi che si
riempiono a fine ora: per arrivare al consuntivo bisognava scorrerlo, e
l'elenco a sua volta si perdeva fra i campi di testo. La differenza è
che quel testo era il verbale di quel giorno — si scriveva una volta e si
rileggeva solo riaprendolo — mentre una consegna vive: nasce in un'ora, ha un
termine, e torna a galla in ogni lezione successiva del corso finché non è
spuntata. È la differenza fra «l'avevo scritto» e «me l'ero segnato». Quel che
era già scritto nel vecchio campo diventa una consegna in lettura, e nasce
chiusa: aprirle tutte vorrebbe dire ritrovarsi con quattrocento arretrati mai
spuntati, e un cruscotto pieno di allarmi falsi è un cruscotto che si smette di
guardare.

Le due date si dicono in due modi. «Per la prossima volta» non è una data, è
un'ora: legandola a una lezione, spostando quell'ora si sposta anche il termine.
Un giorno secco serve quando il termine non coincide con nessuna lezione — la
gita, il modulo in segreteria. Una consegna senza destinatari — la classe c'è ma gli allievi non ancora, che è
la situazione di settembre — resta aperta: contarla come fatta la farebbe sparire
il minuto dopo averla scritta. Per toglierla di mezzo c'è «Chiudi comunque», che
è un gesto di chi sa quel che sta facendo invece di una deduzione del registro.

Il destinatario è la classe, chi insegna, o i nomi
scelti: «portare le fotocopie» e «correggere le verifiche» sono consegne come le
altre, e stanno nello stesso posto perché è il motivo per cui ci si arriva
davvero. La spunta resta individuale in ogni caso — «fatto» detto di una classe
non vuol dire niente, vuol dire fatto da chi l'ha fatto — e si mette dalla
lezione, dove si ritira, non da un modulo di modifica. I nomi però non stanno
in vista: ventiquattro caselle aperte su ogni riga fanno una parete, e la pagina
diventa illeggibile proprio quando le consegne sono tante, cioè quando serve.
Nella riga resta il conto e i primi nomi che mancano, ed è un pulsante: premendolo
si apre **il ritiro**, una finestra con la consegna per intero e i nomi da
spuntare per esteso — perché ritirare è un gesto a sé, ci si ferma su una
consegna sola e si fa l'appello. Lì ci sono anche «Segna tutti» e «Togli tutti»,
che è come si ritira davvero: si segnano tutti e si tolgono i tre che mancano.
Le spunte partono subito, una per una: non c'è niente da salvare in fondo e
chiudere la finestra a metà non perde nulla. Quel che tocca a una persona sola
non apre niente: c'è una cosa da premere e sta lì. Chi si ritira esce dai
destinatari: una consegna eternamente incompleta perché aspetta chi non c'è più
è un allarme che si impara a ignorare.

Si guardano da due posti, e sono due domande diverse. Nella scheda di una
lezione si vede quel che riguarda quell'ora — è lì che si assegna e si ritira, e
il sottotitolo dice subito quante sono rimaste indietro — in ordine di
urgenza e non di data: prima quel che è rimasto indietro, poi quel che scade
oggi, poi quel che si è dato proprio in quest'ora, e in fondo quel che sta ancora
in piedi. La pagina **Todo** risponde invece alla domanda della domenica sera:
che cosa ho lasciato in giro? A quella nessuna lezione può rispondere, perché
ognuna guarda un corso solo. Lì le consegne di tutti i corsi stanno insieme,
divise per quanto premono e filtrabili fra le proprie e quelle delle classi —
«portare le fotocopie» e «esercizi 4–7» sono due liste con due momenti diversi.
Le fatte stanno in fondo, chiuse: servono a ricordarsi che cosa si era dato, non
a occupare la schermata.

**Il tempo che passa.** Il registro sa che ore sono, e lo sa mentre è aperto: lo
stato porta un orologio che batte ogni minuto, quindi un'ora smette da sola di
essere «in corso» senza che nessuno tocchi niente. Non è un dettaglio di
grafica. Confrontando le sole date, l'ora delle otto guardata a mezzogiorno era
ancora «di oggi»: non finita, quindi non un buco, quindi invisibile fino al
giorno dopo — mentre a mezzogiorno quell'appello manca adesso. È la differenza
fra un cruscotto che serve la mattina e uno che serve il giorno dopo.

Si vede nel calendario — la riga rossa di adesso sulla colonna di oggi, l'ora in
corso contornata, quelle finite di un passo indietro — e nel cruscotto, dove le
ore di oggi si spengono man mano che passano e quella che si sta facendo resta
accesa. Alle 10:15 di un giovedì con cinque ore in fila, sapere a colpo d'occhio
a che punto si è vale più del resto della schermata.

**Orario.** Le ore fisse di un corso in settimana: «il martedì dalle 08:20,
novanta minuti». Da lì le lezioni si generano da sole per il periodo che si
sceglie, saltando i **giorni senza lezione** dichiarati sull'anno — vacanze,
ponti, giornate d'istituto. La giornata è un seguito come gli slot di una
lezione: la seconda fascia del mercoledì comincia quando finisce la prima, di
ogni giorno si dichiara solo l'ora con cui si entra, e l'ordine dentro la
giornata si cambia trascinando la riga — portata fra le fasce di un altro
giorno, la fascia si sposta lì. La generazione non cancella e non sovrascrive:
riempie i buchi, quindi si può rilanciare a ogni cambio d'orario senza pensarci,
e una lezione spostata a mano resta dove l'ha messa chi la insegna. L'orario è
uno stampo, non un vincolo.

**Spostare e copiare.** Nel calendario le lezioni si prendono con il mouse:
trascinandone una la si sposta — giorno e ora insieme, con gli slot che
scivolano tutti alla stessa distanza — e tenendo premuto Ctrl (o Alt) se ne fa
una copia. Il puntatore si posa sui cinque minuti, perché nessuna scuola
comincia alle 08:23, e mentre si tiene sospeso il blocco una riga mostra dove
finirebbe: piena per uno spostamento, tratteggiata verde per una copia. La copia
porta con sé la scaletta e l'aula ma non l'appello né il consuntivo — quelli
appartengono all'ora che si è svolta, non a quella che si sta preparando. Dopo
la copia si resta nel calendario: chi copia sta riempiendo la settimana e ne
copierà un'altra subito dopo, e aprire la copia gli toglierebbe di mano la
griglia proprio nel gesto in cui la sta usando. Nel mese si sposta solo di
giorno: una cella non ha un'altezza che voglia dire un'ora, e il quando resta
quello.

Il mese non si ferma al 31: le settimane sono una striscia sola e scorrendo si
continua avanti e indietro, allungandosi da sé quando si arriva a un capo. Un
confine però c'è, ed è l'anno scolastico: fuori non ci sono classi, non ci sono
lezioni e non ce ne possono essere, quindi la striscia finisce lì e lo dice —
scorrere all'infinito dentro il vuoto fa solo credere di essersi persi. Un anno scolastico non è fatto di mesi ma di settimane che si
susseguono, e il pezzo che serve guardare sta quasi sempre a cavallo di due —
l'ultima settimana di ottobre e la prima di novembre sono la stessa cosa per chi
programma. Il nome del mese resta appiccicato in alto mentre le sue settimane
scorrono sotto, e il primo del mese si segna da sé: non ci sono più giornate
spente «fuori dal mese», perché ogni cella è un giorno vero. Sabato e domenica
si possono mostrare come gli altri — capita un recupero, una gita, un esame — e
si riconoscono da un fondo appena più spento, che lascia leggere la settimana
lavorativa senza doverne contare i giorni.

Il cambio di semestre si vede: una banda nella striscia dei mesi e nell'agenda,
un filo pieno sul giorno che lo apre nella settimana, e il semestre in corso
scritto accanto alla data in cima. Non è un abbellimento — di là dal confine le
medie ripartono, e una verifica messa il giorno prima o il giorno dopo finisce
in due pagelle diverse. Il semestre di una valutazione non è scritto da nessuna
parte, è quello in cui cade la sua data: per questo il confine va visto sul
calendario, dove la data si sceglie.

Il piano lezione è solidale con la sua lezione: la segue quando la si sposta e
quando la si copia — la copia insegna la stessa cosa — mentre le spunte messe
sulle attività restano all'ora che si è svolta. Dal calendario si vede il titolo
del piano sul blocco e lo si governa da lì: assegnarlo, cambiarlo, aprirlo,
toglierlo. Vederne il nome e dover aprire la lezione per cambiarlo era mezzo
collegamento.

Il tasto destro su una lezione apre quel che ci si può fare senza aprirla:
segnarla svolta, annullarla, assegnarne o aprirne il piano, copiarla alla
settimana prossima, esportarne il verbale, eliminarla. Sono le stesse voci della sua scheda, perché due elenchi
diversi per le stesse azioni sono due posti in cui dimenticarsene una. Sul vuoto
il menu propone invece una lezione nuova, all'ora su cui è caduto il clic.

**Lezione.** L'unità del registro. Nasce dall'orario o si aggiunge a mano, e da
lì in poi vive per conto suo. Ha uno o più **slot** orari, e una pausa è uno
slot come gli altri con tipo `pausa` — così una lezione di due ore con quindici
minuti in mezzo resta una lezione sola, con un piano solo — e un appello che le
conta tutte, unità didattica per unità didattica.
Gli slot stanno attaccati: ciascuno comincia dove finisce quello sopra, si
dichiara solo l'ora del primo — gli altri hanno il campo spento, perché la loro
è un conto — e li si rimette in fila trascinandoli per la presa a sinistra. Il
buco fra due slot non esiste: se in mezzo si sta fermi lo si dice con uno slot
di pausa, che si vede e si conta, invece di lasciarlo implicito in due orari
che non si toccano.

**Appello.** Una matrice: gli allievi in riga, le unità didattiche in colonna.
Ogni casella nasce a **–**, che vuol dire che nessuno ha ancora detto niente, e
da lì un pulsante solo la porta avanti a ogni clic: **P** presente, **X**
assente, **R** ritardo, **E** esonero, e poi di nuovo **–** — una casella
toccata per sbaglio si rimette a non detta girando fino in fondo. Ogni stato ha
il suo colore, la presenza compresa: una colonna verde si legge da lontano come
«questa l'ho fatta», che è appunto la differenza fra impostata su presente e mai
toccata. Il verde è il più tenue dei quattro, perché è il caso normale e non
deve gridare, e le lettere restano il modo in cui gli stati si distinguono
davvero. In testa a
ogni colonna lo stesso pulsante vale per tutta la classe: l'ora in cui erano in
assemblea si segna in un clic. In testa a ogni riga vale per tutta l'ora di
quell'allievo: chi oggi non c'è si segna in un clic. Dove le caselle non dicono
la stessa cosa il pulsante mostra un punto, e il primo clic le rimette tutte a
presente.

Il **–** non è un quinto modo di stare in aula: è l'assenza di una risposta, ed
è quel che distingue un appello fatto con tutti in classe da un appello mai
cominciato. Le caselle vuote non entrano in nessun conto — né presenze né
assenze, né nelle percentuali di fine semestre — e si contano a parte, come
lavoro da fare: la scheda dell'ora dice quante ne restano, il cruscotto segna
«appello mai fatto» finché sono tutte vuote, e il verbale esportato dichiara in
testa se l'appello era incompleto invece di lasciar passare il non detto per
presenza.

È l'appello, e non lo stato dichiarato, a dire quali ore entrano nelle
percentuali: un'ora con l'appello fatto è un'ora che c'è stata, anche se
nessuno si è ricordato di segnarla svolta — che è proprio la cosa che si
dimentica. Restano fuori le annullate, che ore non sono, e quelle su cui non si
è ancora detto niente. Prima contavano le sole ore dichiarate svolte, e le
assenze di chi aveva fatto l'appello senza chiudere l'ora sparivano dai conti
di fine semestre.

Per unità didattica e non per lezione perché è lì che le assenze si contano: un
blocco di due ore sono quattro UD, e chi arriva alla terza ne ha perse due —
scritto come «in ritardo» e basta, quelle due sparivano dai conti proprio a
fine semestre, quando servono. Le pause non sono colonne: durante la pausa non
si fa appello, e dove ce n'era una le colonne si staccano. Gli stati sono
quattro perché gli altri due che c'erano dicevano peggio quel che le UD dicono
da sole: un'uscita anticipata è presente nelle prime e assente nelle ultime, e
una giustificazione non è un modo di essere assenti ma una cosa che arriva
dopo — si scrive nella nota.

**Registro.** Il dettaglio di un'ora ha la sua voce nel menu, accanto al
Calendario: è dove il registro si scrive davvero — appello, argomenti svolti,
consuntivo — e ci si torna molte volte al giorno. La voce si apre sull'ora che si
stava guardando, e alla prima apertura sull'ultima già passata: è quella di cui
si scrive il consuntivo. Il calendario resta il posto in cui le ore si creano e
si spostano; il Registro quello in cui si riempiono.

Dentro, due tendine per sfogliare: il corso e, dentro il corso, l'ora. Perché il
registro si scrive una materia alla volta, scendendo lungo le sue ore, e passare
ogni volta dal calendario vorrebbe dire cercarle in mezzo alle lezioni di tutte
le altre classi. Le ore annullate restano in elenco, segnate: nel registro ci
sono state anche loro. Cambiando corso si salta al suo registro, sull'ultima ora
già passata — la stessa regola con cui si apre la voce del menu.

**Piano lezione.** La scaletta delle attività, con i tempi. Un titolo suo non
ce l'ha: il piano è la lezione di quel corso, e si chiama così — «Matematica 3A
· 15.09.2025». Finché non è assegnato a nessuna lezione è una bozza, e si
presenta con il corso e la durata della scaletta; quel che un titolo diceva
davvero — «recupero», «con la prova in fondo» — sta negli obiettivi, nelle
etichette e nelle note, che si cercano tutti. Appartiene a una
**materia**, non a un anno né a una classe: è l'unica cosa del registro fatta
apposta per essere riusata, e legarla a un anno vorrebbe dire nasconderla
l'anno dopo, che è il momento in cui serve. Si assegna a una lezione, e in aula
si spuntano le attività man mano; quel che si spunta si porta dietro una copia
del titolo, così modificare il piano a gennaio non riscrive il consuntivo di
novembre.

**Risorse.** Il materiale appeso a un piano o a una sua attività: un
**collegamento**, un **file**, un'**immagine**. Il collegamento resta un
indirizzo — una pagina non si porta dentro il registro — mentre file e immagini
si copiano nella cartella dei dati: il PDF scelto può stare in Download e
sparire la settimana dopo, e un piano deve reggere anche l'anno prossimo. Si
aggiungono dalla vista Piani; durante la lezione compaiono accanto alla
scaletta, in sola lettura, e basta premerle per aprirle. Le immagini si vedono
come miniatura, perché un elenco di nomi di file non aiuta a ritrovarle.

**Momento di valutazione.** Una verifica, un orale, un progetto. Ha un peso, una
scala (di norma 1–6 con sufficienza a 4) e i voti di tutta la classe. La scala è
una copia: cambiare quella del registro non riscrive i voti già dati. Un allievo
assente non prende zero: esce dalla media.

**Eliminare.** Tutto quel che si crea si può togliere, e niente viene rifiutato
perché «ha ancora roba dentro»: un rifiuto lascia nel registro la classe
sbagliata di settembre e spinge a correggere i file a mano, che è il modo con
cui i riferimenti si rompono davvero. La sicurezza sta prima, nella domanda: il
registro dice per intero che cosa sparisce — «12 lezioni con l'appello, 5
momenti con 60 voti, il fascicolo con 4 documenti» — e i conti li fa lo stesso
codice che poi esegue, così non può dire una cosa e farne un'altra.
L'eliminazione è completa per costruzione: si porta dietro tutto quel che senza
di lei resterebbe a puntare nel vuoto, e lascia in piedi quel che sa vivere
staccato — un piano lezione sopravvive alla sua materia, una verifica alla
lezione in cui si era svolta. Dove esiste una mossa che non perde niente, la
domanda la offre: archiviare la classe invece di eliminarla, unire due materie,
togliere la spunta «frequenta» invece di cancellare un allievo. I file che
seguono — PDF delle verifiche, risorse dei piani, documenti raccolti — finiscono
nel cestino del sistema, non nel nulla.

**Scheda dell'allievo.** La vista che raccoglie tutto quel che il registro sa
di una persona sola: presenze con le sole giornate storte, voti per corso con la
media pesata, osservazioni, documenti. I dati stanno altrove — nelle lezioni,
nei momenti, nel fascicolo — e questa vista non ne possiede nessuno: li mette
insieme perché il momento in cui servono è uno solo, il colloquio. Si apre dal
nome nell'elenco della classe. La media si ferma dentro il corso: una media che
mescola matematica e italiano sarebbe l'unico numero sbagliato della pagina.

**Fascicolo.** Quel che tiene il docente di classe e nessun altro: recapiti
fissi, documenti raccolti, comunicazioni spedite. Sta fuori dalla classe perché
ha un'altra vita — le comunicazioni si accumulano e non si cancellano mai — e
`classi.json` deve restare corto e leggibile a mano.

Sta fuori anche nella schermata: ha la sua voce nel menu, una classe alla
volta, e nella vista Classi non compare. Le stesse schede stavano anche là, in
fondo alla pagina, e chi in quella classe insegna e basta se le trovava sotto
l'elenco degli allievi dopo tutto quel che era venuto a cercare. Sono due
lavori con due ritmi: nelle Classi si guarda chi c'è e come va, nel fascicolo
si riscuotono documenti e si scrive alle famiglie.

Per lo stesso motivo la pagina **Classi** è soltanto l'anagrafica degli allievi:
nome, indirizzo, e-mail, azienda, e-mail del datore. È l'elenco che si tiene
aperto quando si deve scrivere una mail, spedire una lettera o chiamare un
datore di lavoro, e in quel momento serve tutto lì, una riga per allievo.

Ci stavano anche i tre numeri della classe, le materie che ci si insegnano con
orario e pulsanti, e per ogni allievo presenze, ritardi e media. Erano tre altre
domande, e ognuna ha già il suo posto: che cosa si insegna nella vista
**Corsi**, come va un allievo nella sua **scheda** — una riga, un clic sul nome
— e i conti della classe nel **Cruscotto**. Mescolate all'anagrafica facevano
una tabella che non si finiva di leggere: sei colonne di numeri prima di
arrivare all'indirizzo che si era venuti a copiare.

**Assenze da far firmare.** Tre volte l'anno la scuola stampa, per ogni allievo,
il rapporto delle assenze e quello dei ritardi; il docente di classe li manda
all'azienda, e l'azienda li rispedisce firmati. È una pratica in tre fasi — il
foglio vergine che parte, la mail che chiede la firma, il foglio firmato che
torna — e il registro la tiene in un blocco solo, per periodo: un elenco dei
periodi, e dentro quello aperto una matrice con gli allievi in riga e le cinque
caselle in colonna. Verde vuol dire fatto, e la casella scura dice sempre la
prossima mossa.

I fogli si caricano uno per uno dalla casella, o tutti insieme con «Importa
fogli»: si sceglie una cartella di PDF e ognuno va all'allievo che il nome del
file nomina — chi non si riconosce resta fuori e viene elencato, perché fra due
fratelli con lo stesso cognome indovinare vuol dire mandare le assenze di uno
all'azienda dell'altro. La mail parte una per allievo, in chiaro all'indirizzo
del datore di lavoro che sta nella sua scheda, con dentro i suoi soli fogli:
oggetto e testo si scrivono una volta per il periodo e si compilano nome per
nome con i segnaposto (`{allievo}`, `{azienda}`, `{periodo}`, …). Chi non ha
mancato niente non compare: una riga nasce con il suo primo foglio.

**I piani si guardano un corso alla volta.** Il corso si sceglie in testata: i
piani sono di un corso, e vederli tutti insieme era un elenco in cui metà delle
voci non c'entravano con quel che si stava preparando. Sotto, le ore di quel
corso divise per semestre — è la scansione su cui si prepara, e «il primo
semestre lo chiudo con la verifica» era una domanda a cui si rispondeva
contando le date a mano. Ogni ora tiene la sua scaletta, o non ce l'ha e allora
lo dice e la si prepara di lì. La testata conta quante ore aspettano ancora. Un piano senza corso non si può più salvare: ce ne resta
qualcuno solo se il corso è stato eliminato sotto, e sta in fondo all'elenco
dichiarato per quel che è, da riagganciare.

**Il calendario dice a che punto dell'anno si è.** Il numero della settimana sta
in una colonna sua nel mese, accanto alla data nell'agenda, e sopra la vista
settimana c'è la striscia di tutte le settimane dell'anno: quelle con lezioni si
riempiono, quelle vuote restano chiare, quelle di vacanza si spengono. Il
confine fra i semestri è una barra piena e non un filo — di là le medie
ripartono, e una prova messa il giorno prima o il giorno dopo finisce in due
pagelle diverse.

## I rapporti in PDF

Quel che esce dal registro per andare in mano a qualcuno esce in PDF: il verbale
di un'ora, il piano lezione da portare in aula, la griglia dei voti di una
classe, il conto delle presenze, il fascicolo di classe, la scheda di un
allievo. Nel verbale l'appello è la stessa griglia che si compila a schermo —
una riga per allievo, una colonna per UD, le stesse sigle — con la legenda
sotto, perché il foglio finisce in mano a chi quella griglia non l'ha mai
vista.

Classe e materia sono due campi separati: nel registro il corso è la
combinazione delle due, ma su un foglio sono due informazioni diverse — la
classe dice a chi, la materia dice di che cosa — e chi legge le cerca in due
punti diversi. Un PDF si apre ovunque, si stampa com'è e non si modifica per sbaglio,
che è quel che si vuole da un verbale. Il CSV resta accanto dove serviva
davvero — le valutazioni e le presenze — perché il PDF si consegna e il CSV si
lavora in un foglio di calcolo.

L'impaginazione non sta nel codice: sta in `templates/`, nella radice del
progetto, un file per rapporto. Sono file di testo con righe
`direttiva: contenuto`, si modificano a mano e valgono dal salvataggio dopo.
**Intestazione e piè di pagina stanno in `_base.tpl`**, che tutti gli altri
estendono: cambiare la testata di tutti i rapporti è cambiare un file solo. Il
formato è descritto in `templates/LEGGIMI.md`.

**Sotto c'è un secondo strato, `_stile.tpl`: le misure.** Formato del foglio,
margini, i cinque corpi del testo, l'altezza di una riga di tabella, la regola
con cui si spartisce la larghezza fra le colonne. Erano costanti dentro
l'impaginatore, e cambiarle voleva dire ricompilare — cioè non cambiarle mai.
Ma «esce troppo piccolo per leggerlo», «questa tabella non ci sta in
larghezza» e «in sede si stampa in A3» sono cose che si scoprono usando i
rapporti, non scrivendoli, e allora ricompilare non è un'opzione.

**E un terzo, `_testi.tpl`: le parole.** Le frasi che contengono un numero — «4
caselle non impostate», la nota che spiega su che cosa sono calcolate le
percentuali di presenza — e come si chiamano le colonne delle tabelle. Stavano
dentro `datiRapporti.ts`, mescolate ai conti che le producono; ma una frase e un
conto si cambiano per motivi diversi e da persone diverse, e «dillo in un altro
modo» non deve costare una ricompilazione. Il modello le richiama con
`{{frase.nome}}`, e la frase a sua volta contiene i segnaposto del rapporto: si
risolvono in un giro solo, perché due frasi che si rimandano a vicenda
girerebbero per sempre e non c'è niente che una frase debba dire e non possa
dire in un livello.

I valori composti di prima — `{{presenze}}`, `{{appelloIncompleto}}`, `{{nota}}`
— restano accanto ai numeri che li compongono: un modello scritto prima continua
a chiamarli per nome, e un rapporto che perde una riga senza dirlo è peggio di
una riga in più.

**E un quarto, `_blocchi.tpl`: i pezzi interi.** Quel che più rapporti si
scrivevano uguale — l'apertura con titolo, sottotitolo e stacco stava in tutti e
sette; la griglia dell'appello con la sua legenda in due — e che finora si
copiava. Un modello lo richiama con `usa: apertura | titolo={{titolo}} —
{{classe}}`, e i parametri valgono solo lì dentro, già riempiti da chi chiama.
Due copie della stessa cosa sono due occasioni di dire cose diverse, e la
seconda si dimentica sempre: cambiando lo stacco da 6 a 8 se ne aggiustavano sei
e si scordava il settimo.

Quattro file e non uno perché si toccano per motivi diversi: in `_base` si
cambia *che cosa* c'è scritto in testata, in `_stile` *quanto è grande*, in
`_testi` *come lo si dice*, in `_blocchi` *quel che si ripete*. Il compilatore
non fa altro che aggregarli: legge la catena dei modelli, ci posa gli strati
comuni, sostituisce i blocchi ai loro `usa:`, esegue i `se:` e i `ripeti:` e
consegna a chi disegna una lista piatta di blocchi già risolti. `_stile` e `_testi` stanno sotto tutti anche senza essere
nominati — sono gli unici modelli con questo privilegio, e se lo guadagnano
perché non dicono niente su che cosa un rapporto contiene: non possono cambiare
un foglio a sorpresa, e chi aveva già un `_base.tpl` suo, modificato prima che
questi strati esistessero, altrimenti sarebbe l'unico a non poterli usare. Un
singolo modello può ritoccare una riga di stile in testa al proprio file, e vale
per lui soltanto.

`scala:` è la manopola che si tocca per prima: moltiplica i cinque corpi
insieme. «Tutto un po' più grande» è la richiesta vera, e ritoccare cinque
numeri a mano tenendo i rapporti fra loro è un lavoro che sbaglia chiunque. Le
bande di intestazione e piede crescono con lui, invece di restare i ventidue
punti fissi che una testata in corpo grande scavalcava.

**Il corpo non è più un elenco piatto.** `se:`/`altrimenti:`/`fine:` mostrano un
pezzo solo quando c'è qualcosa da dire — vero vuol dire un valore non vuoto, una
tabella con delle righe, un elenco con dei punti; `ripeti:` rifà quel che sta
dentro per ogni voce di un gruppo, ed è così che un rapporto fa una pagina per
allievo invece di uscirne uno per allievo; `pagina-nuova:` volta foglio, ma solo
se sulla pagina c'è già qualcosa, o due salti di fila lascerebbero una pagina
bianca in mezzo.

Dentro un `ripeti:` i nomi si scrivono come fuori — `{{allievo}}`,
`tabella: prove` — e valgono per la voce di quel giro: chi scrive un modello non
deve imparare due vocabolari. Il prezzo è che il nome della tabella, a giro
finito, non la ritrova più: la composizione la risolve subito e se la porta
appesa al blocco, ed è per questo che `Blocco` ha adesso un `tabella?` accanto al
`valore`.

Sistemando questo è venuto fuori un difetto che c'era da sempre e non si vedeva:
una sezione vuota si potava guardando avanti fino alla sezione dopo, e con un
solo titolo in cima al foglio funzionava. Dentro un `ripeti:`, l'«Annotazioni»
dell'allievo senza annotazioni si teneva per buono il titolo dell'allievo dopo e
restava stampato sopra il nulla. Adesso anche un titolo chiude quel che una
sezione ha sotto di sé.

**Un modello può mettere un'immagine**: `immagine: logo.png | altezza 16 |
destra`, con il file in `templates/` accanto ai modelli — il logo della sede è
impaginazione, non un documento della classe. Si dichiara la sola altezza e la
larghezza viene dalle proporzioni: dichiararle tutte e due vorrebbe dire poterle
sbagliare, e un logo schiacciato su un foglio che va in segreteria si nota
subito. In `[intestazione]` si ripete su ogni pagina, che è dove serve. Le
immagini si incorporano una volta sola per documento: ripetere i byte del logo su
trenta pagine farebbe un file trenta volte più pesante, e quello è il file che si
allega a una mail.

**Le colonne di una tabella si misurano su quel che contengono.** Prima erano
proporzionali ai soli pesi dichiarati: la colonna della data prendeva lo stesso
spazio di quella dei nomi, e i nomi uscivano «Carvalho Card...» — il difetto si
vedeva in ogni foglio con più di sei colonne. Adesso ognuna chiede quel che le
serve, e l'avanzo va a chi pesa di più: è lì che il peso serve davvero, a dire
chi si allarga quando c'è spazio. Se non ci stanno, prima si scrive più piccolo
— fino a `corpo-minimo-tabella`, sotto il quale non si scende — e solo dopo si
stringe, togliendo a chi è largo e lasciando intere le colonne corte: due punti
tolti alla colonna «UD» la distruggono e non salvano niente. I conti stanno in
`dominio/rapporti.ts`, misurati con il font che l'impaginatore presta, e le
prove che li tengono in `test/rapporti.test.mjs` — prima erano quattro righe
dentro il disegno, dove nessuno le ha mai messe alla prova.

Se la cartella non c'è, il registro ci scrive i modelli di serie al primo
rapporto — e da lì in poi comanda quel che c'è su disco, anche quando qualcuno
ne toglie una riga.

**I rapporti stanno con i documenti, nella stessa cartella.** Erano due —
`archivio/` per quel che si carica, `esportazioni/` per quel che si stampa — e
la distinzione era vera per il programma e falsa per chi apre la cartella: il
verbale di un'ora e la verifica di quell'ora sono la documentazione della stessa
lezione. Adesso c'è `documentazione/`, con la regola di sempre: classe, corso,
documento. Il nome del file ripete classe e documento, perché un rapporto esce
dalla sua cartella di continuo — lo si allega a una mail, lo si copia sul
desktop — e fuori di lì un «Presenze.pdf» non dice più di che classe sia.

**Un rapporto rifatto sovrascrive quello di prima**, e si porta via anche i
doppioni numerati che i giri precedenti avevano lasciato: un rapporto è una
fotografia di com'è il registro adesso, e rifarlo vuol dire che quella di prima
non serve più. Numerandoli, la cartella si riempiva di stampe uguali dello
stesso verbale e bisognava guardare le date per capire quale valesse. I file
tolti vanno nel cestino, non si cancellano sul serio.

**Ogni rapporto è di un periodo, e lo dice.** Le presenze, le valutazioni e la
scheda di un allievo sono del semestre scelto; il verbale porta il semestre in
cui cade la sua ora; il fascicolo vale per l'anno intero. Il periodo sta nella
testata di ogni pagina, accanto all'anno scolastico, e nel nome del file:
`DIC2_Presenze_1° semestre.pdf`. Sono due documenti diversi — la presenza del
primo semestre non è quella del secondo — e chiamandoli uguali il secondo
avrebbe coperto il primo alla prima stampa dopo gennaio.

**In testata c'è anche che documento è.** Un foglio esce dalla sua cartella di
continuo — lo si allega a una mail, lo si stampa, finisce in una pila sulla
scrivania — e senza il nome del documento in cima si riconosce solo leggendolo.
Vale soprattutto per la seconda pagina, che è quella che si ritrova staccata
dalle altre.

**Segnando un'ora come svolta si rifanno i documenti di quel corso**: il
verbale di quell'ora, le presenze, la griglia dei voti e la scheda di ogni
allievo che frequenta. Sono gli stessi che dopo ogni lezione sarebbero da
rifare a mano, uno per uno, e nessuno lo fa: la cartella di un corso restava
ferma alla settimana in cui qualcuno si era ricordato di stampare. Così chi la
apre trova sempre lo stato di ieri sera.

Nessuno di quei file si apre — chiudere un'ora non deve far saltare fuori
quindici finestre del lettore di PDF — e non si aspetta: il pulsante risponde
subito, e un avviso dice quanti documenti sono stati rifatti quando ci sono.
Chiusure ravvicinate si mettono in fila: presenze, voti e schede sono del
corso, non dell'ora, e due scritture sovrapposte sullo stesso PDF lo
lascerebbero a metà. Riportare l'ora a «pianificata» non rifà niente.

**I numeri del foglio sono quelli dello schermo.** Le presenze le contava
`datiRapporti` per conto suo, in un modo diverso da quello della vista Corsi: il
denominatore erano tutte le unità didattiche invece di quelle su cui l'appello
è stato fatto davvero, e un'ora dimenticata faceva crollare la percentuale di
tutti. Il PDF diceva così una cosa e la schermata un'altra. Adesso li fa
`matriceCorso` per tutti e due, e la regola è scritta sul foglio: chi legge
«96%» ha il diritto di sapere su che cosa è fatto.

**Il cento per cento sono le ore che l'orario del corso prevede**, non quelle
già messe a calendario. Le due cose non coincidono quasi mai: a metà ottobre
metà del semestre non è ancora stata generata, e una percentuale contata sulle
ore esistenti direbbe che tutti hanno seguito tutto. Il monte ore si ricava
dall'orario fisso del corso sul periodo, saltando le vacanze — è l'altra
ragione per cui le sospensioni si dichiarano. Un corso senza orario fisso non
ha un monte ore da cui partire, e allora si ripiega sulle ore a calendario: è
l'unico che in quel caso si conosca, e dirlo storto sarebbe peggio che dire
quello.

**Due percentuali, e non una.** La **% assenza** è calcolata su quel monte ore:
è quanto si è perso di ciò che era in programma, ed è la cifra che si consegna
— un'ora dimenticata dal docente resta un'ora che l'allievo doveva fare. La
**% presenza** è calcolata sulle sole UD in cui l'appello è stato fatto, e dice
quanto la prima è affidabile: con quella sola, un semestre con metà appelli
dimenticati risultava perfetto. Sono due domande diverse e chi legge ha diritto
a tutte e due, purché il foglio dica quale è quale — e lo dice, in fondo, con
le UD previste e quelle già a calendario.

Nel foglio delle presenze c'è anche la riga della classe in fondo — il numero
che si guarda per primo, e che nessuno somma a mente da dodici righe — e le ore
annullate restano fuori dalle ore tenute. Le UD previste sono le stesse per
tutti: il registro non sa quando un allievo si è iscritto, e fingere di saperlo
sarebbe peggio che dire il monte ore del corso. La scheda dell'allievo porta le presenze in cifre e
non solo l'elenco delle assenze: a un colloquio è la prima cosa che viene
chiesta, e prima si poteva solo contare a mano le righe della tabella in fondo.

**I modelli di serie si generano da `templates/`.** Sono la copia che il
registro scrive quando quella cartella non c'è ancora, e si aggiornavano a
mano: chi modificava un modello e si dimenticava di ricopiarlo lasciava a chi
installava il registro nuovo i modelli di due versioni prima. Adesso li fa
`npm run modelli`, e che i due siano in accordo lo controlla `npm test`.

**I file si aprono passando il percorso, non un indirizzo.** `openExternal`
consegna alla shell un URL: il grado di «1° semestre» diventa `%C2%B0`, e chi
lo riceve deve rifare il giro al contrario per tornare al nome vero — un giro
che su Windows, fuori dall'ASCII, non torna. Il risultato era una finestra
rossa che diceva «Impossibile trovare il file specificato» su un file che
c'era, con il nome giusto: il peggiore dei messaggi possibili, perché manda a
cercare il problema dove non è. Adesso il percorso si passa com'è, in argomenti
separati — mai una riga di comando composta a mano, così un nome con dentro `&`
non può diventare un'altra istruzione. `openExternal` resta per gli indirizzi
veri, come il collegamento dentro un piano lezione.

**Un rapporto che non si riesce ad aprire resta un rapporto riuscito.** Se il
programma non parte — nessun lettore di PDF associato, una sessione remota — si
ripiega sul mostrare il file nella sua cartella, e in ogni caso si dice dov'è.
Prima quel fallimento tornava indietro come «rapporto non riuscito» con il PDF
già scritto sul disco: dire che è andata male una cosa andata bene è il
peggiore dei due errori, perché la volta dopo non ci si fida più del messaggio
quando dice davvero che qualcosa non va.

Chi aveva già `archivio/` e `esportazioni/` se li ritrova uniti da soli alla
prima apertura, con i percorsi salvati riscritti.

## Smistare un PDF di classe

I documenti arrivano dalla segreteria in un file solo: le pagelle di tutta la
classe, i certificati stampati in blocco. Dividerli a mano è il lavoro che il
registro fa da sé.

Dentro `in-arrivo/` c'è una cartella per ogni documento che si sta raccogliendo
— «DIC4a — Pagella 3° anno» — creata e rinominata dal registro secondo la
consegna a cui corrisponde. Si lascia cadere il PDF lì dentro e succede questo:

1. si legge il testo di ogni pagina — e se il PDF è una scansione, le pagine
   mute finiscono in coda all'OCR, che le legge una per una;
2. una pagina che nomina un allievo apre il suo blocco; le pagine seguenti che
   non nominano nessuno appartengono a quel blocco — è così che un documento di
   tre facciate col nome solo in testa resta intero;
3. ne esce una **bozza**, sotto «Da smistare» nel pannello del docente di
   classe: un blocco per documento, con scritto di chi il registro crede che
   sia, e l'anteprima della prima pagina da guardare;
4. si conferma — riga per riga, o tutta in un gesto — e solo allora il pezzo
   viene ritagliato, archiviato col nome che parla e **spuntato** nella consegna
   dell'allievo.

Niente viene archiviato prima di una conferma. Riconoscere un nome è
un'ipotesi, e un documento finito nel fascicolo sbagliato è un errore che
nessuno scopre finché non serve quel documento.

Quel che l'ipotesi non la regge — pagine senza nome, scansioni illeggibili, due
fratelli omonimi — resta nella bozza in attesa di una mano. Per quello c'è
l'**assegnazione a mano**, in fondo a ogni PDF: si dicono le pagine, l'allievo e
il documento, e si archivia. Il documento si sceglie lì e non si eredita: in un
PDF di segreteria possono esserci due pratiche diverse.

La bozza si rifà a ogni pagina letta: guardando la coda si vedono i blocchi
formarsi mentre la macchina macina, invece di trovarli tutti insieme alla fine.

Il riconoscimento è prudente per scelta. Nome e cognome insieme valgono una
certezza; il cognome da solo vale solo se in classe non c'è nessun altro a
portarlo — due fratelli omonimi non si tirano a sorte. Chi non era fra i
destinatari della consegna, e chi ha già consegnato, finisce in quarantena
invece di essere archiviato o sovrascritto: un documento perso in silenzio è il
solo esito peggiore di uno da sistemare a mano.

In quarantena ogni blocco chiede una cosa sola — di chi sono queste pagine — e
l'intervallo si può stringere prima di confermare: è il modo di separare due
documenti che erano finiti insieme. Il resto torna in coda da sé.

Il PDF originale non sparisce mai per conto suo: resta intero in `quarantena/`
finché c'è una pagina non decisa, e va nel cestino di sistema solo quando non
resta più niente da fare.

### Chi porta il foglio a chi

Un documento del docente di classe va in due direzioni, e la spunta vuol dire
due cose diverse. **Me lo consegnano gli allievi** — il certificato, la
giustificazione — e allora spuntare significa «l'ha portato». Oppure **lo
consegno io**: pagelle, convocazioni, moduli da far firmare a casa, a tutta la
classe o a qualcuno in particolare, e allora spuntare significa «gliel'ho dato».

La differenza si dice nel modulo della consegna, sotto «Chi lo porta».

**In tutti e due i versi i fatti sono due, e non coincidono.** Il file è una
cosa; il gesto — l'ha portato, gliel'ho dato — è un'altra. Rossi mi consegna il
certificato stamattina e lo scansiono stasera; la pagella di Bianchi è pronta da
tre giorni e gliela do lunedì. Per questo ogni casella della matrice ha due
bottoni: a sinistra il gesto, a destra il file. Il file si allega, si apre, si
toglie senza toccare la spunta; la spunta si mette e si leva senza portarsi via
il file.

Il documento da distribuire può essere di uno solo — la pagella, che arriva
dallo smistamento di un PDF di classe — oppure lo stesso per tutti: la
circolare, il modulo da compilare. Chi non ha il suo riceve quello comune.

**Come si consegna** lo dice `modoConsegna`: a mano o per mail. A mano si spunta
uno per uno mentre si passa fra i banchi. Per mail parte **un messaggio a testa**
— non una mail sola in copia nascosta: il documento è suo, e allegarne
venticinque a un unico messaggio darebbe a ogni famiglia la pagella di tutte le
altre. In testa alla colonna compare «Spedisci (n)»: n è chi ha un documento
pronto e non l'ha ancora ricevuto. Si segna spedito solo quel che è partito
davvero, con gli indirizzi a cui è andato; chi non ha un indirizzo resta
indietro e viene detto per nome.

Nel todo la stessa richiesta si racconta con parole sue: «consegno per mail»,
«da consegnare a 12», «3 senza documento» — perché ciò che manca da fare non è
lo stesso in un verso e nell'altro.

Quando si consegna, la prova non è il documento — di quello ognuno tiene il suo
— ma il foglio firmato da chi l'ha ritirato: uno solo per tutta la richiesta.

Non serve sempre: una circolare la si dà e basta. Per questo è una spunta —
«Serve il foglio delle firme di consegna» — e non un obbligo. Dove è chiesto, il
foglio ha la sua casella nella **prima riga della matrice**, sopra i nomi: è la
prova che riguarda tutta la colonna e non una persona, e lì la si vede subito
mancante. Il file finisce nell'archivio insieme agli altri di quel documento.

### Le scansioni

Un PDF scansionato non ha testo: è una fotografia. Con
`registroDocenti.ocr.attivo` il registro guarda quelle pagine con un modello
locale servito da [Ollama](https://ollama.com) — di norma `glm-ocr` — e cerca il
nome in quel che legge. Prima la testata, che è dove il nome sta e costa metà
tempo; la pagina intera solo se lì non è comparso nessuno della classe.

Sta in locale per lo stesso motivo per cui il pannello non parla con la rete: su
quelle pagine ci sono nomi di minorenni e situazioni di famiglia. È facoltativo,
è lento — decine di secondi per pagina su un portatile — e quel che legge
propone, non decide: la conferma resta a chi guarda. Senza Ollama non cambia
niente, le scansioni restano in quarantena e si assegnano a mano.

## I file dei dati

Nella cartella indicata da `registroDocenti.cartellaDati` (di norma `registro/`)
c'è una sottocartella per anno scolastico, e in radice il file che dice quale è
aperto:

```
registro/
  registro.json         due righe: quale anno è aperto
  2026-2027/            un anno scolastico: tutto quel che lo riguarda, e nient'altro
    dati/
      registro.json     l'anno, i suoi semestri e le sue pause, le materie, le impostazioni
      classi.json       classi con i loro allievi
      corsi.json        classe × materia: il perno a cui tutto si aggancia
      lezioni.json      lezioni, slot, presenze, osservazioni, consuntivi
      piani-lezione.json  piani lezione, per corso, con le loro risorse
      valutazioni.json  momenti di valutazione con i voti
      fascicoli.json    recapiti, documenti, comunicazioni e periodi di assenze
      consegne.json     compiti e mansioni, con le spunte di chi le ha fatte
      smistamenti.json  i PDF in quarantena, con le pagine ancora da assegnare
      .storico/         le copie precedenti di ogni file, le ultime dieci
    documentazione/     tutti i documenti, caricati e generati: per classe
    in-arrivo/          la cassetta: i PDF di classe da dividere, una cartella per documento
    quarantena/         i PDF con pagine non ancora assegnate
    allegati/ risorse/ assenze/    quel che resta delle disposizioni di prima
  2027-2028/
    …
```

Il nome della cartella viene dall'etichetta dell'anno — «2026/2027» diventa
`2026-2027` — e da lì non si muove più: rinominare l'anno non sposta la
cartella, perché una cartella che si rinomina da sola smette di essere dove i
collegamenti dicono che sia, e in una cartella sincronizzata si porta dietro i
conflitti di chi la stava aprendo altrove.

`dati/` sta separata dal resto perché è l'unica sottocartella che non si apre a
mano: dentro ci sono i file del programma, fuori i documenti di chi insegna. Chi
entra in una cartella d'anno per cercare una pagella non deve inciampare in nove
JSON.

I percorsi salvati dentro i JSON — `documentazione/DIC4a/…`, `allegati/…` — sono
relativi alla cartella dell'anno, non alla radice. È per questo che un anno si
può spostare, rinominare o consegnare a qualcun altro senza che nulla dentro si
rompa.

**Chi viene dalla disposizione di prima** non deve fare niente: alla prima
apertura il registro divide da solo i file che stavano tutti insieme, un anno
per cartella, seguendo le classi. Quel che non si sa a quale anno assegnare
finisce nell'anno aperto — mai perso, mai lasciato indietro — e i file vecchi
vanno nel cestino, non cancellati. Lo fa una volta, senza chiedere: chiedere
avrebbe voluto dire lasciare per un po' un registro che il resto del programma
non sa più leggere.

Dentro `archivio/` e `esportazioni/` una regola sola, per tutto: quel che si
carica e quel che il registro stampa.

```
<radice>/<materia oppure docente-di-classe>/<classe>/<classe oppure allievi/<chi>>/<file>

archivio/
  Calcolo professionale/          una materia: quel che riguarda l'insegnamento
    DIC4a/
      classe/                       i fogli che parlano di tutti
        DIC4a_Verifica 1_testo.pdf
        DIC4a_Verifica 1_soluzione.pdf
        DIC4a_Verbali_260915.pdf
        DIC4a_Presenze_260907.pdf
        DIC4a_Valutazioni_1° semestre.pdf
        DIC4a_Piano 260915_dispensa.pdf
      allievi/                      e quelli che parlano di uno
        Rossi Mario/
          DIC4a_Verifica 1_Rossi Mario_prova.pdf
          DIC4a_Schede allievo_Rossi Mario_1° semestre.pdf
    DIC2/
      classe/
        DIC2_Verifica 1_testo.pdf     la stessa verifica, accanto alla sua
  docente-di-classe/              quel che riguarda la classe come gruppo
    DIC4a/
      classe/
        DIC4a_Fascicolo_260907.pdf
        DIC4a_Pagella 3° anno_firme di consegna.pdf
      allievi/
        Rossi Mario/
          DIC4a_Pagella 3° anno_Rossi Mario.pdf
          DIC4a_1° semestre_Rossi Mario_assenze firmato.pdf
      foto/                         l'anagrafica: non è di nessuna materia
        Rossi Mario.jpg
```

**La materia sta davanti alla classe** perché è la cartella che si tiene
aperta. Un insegnamento si porta in più classi con lo stesso materiale — la
verifica, la sua soluzione, i piani — e con la classe davanti la stessa
verifica finiva in tre posti lontani: per riusarla bisognava ricordarsi in
quale classe la si era fatta per prima. Adesso il materiale di una materia sta
tutto insieme, e sotto la materia le sue classi. Quel che non è di nessun
insegnamento sta sotto `docente-di-classe/`, con la stessa forma.

Le cartelle già scritte con la classe davanti si scambiano da sole alla prima
apertura, e i percorsi salvati si riscrivono con loro.

**Sotto il corso ci va tutto quel che riguarda l'insegnare**, e resta sotto
`docente-di-classe/` solo quel che riguarda la classe come gruppo: il
fascicolo, le pagelle, le autorizzazioni, i fogli delle assenze da far firmare.

Presenze e schede allievo stavano dalla parte sbagliata. Contavano le ore di
tutta la classe — due materie sommate insieme — e finivano in
`docente-di-classe/` insieme alle pagelle. Ma le ore sono di un insegnamento:
un allievo può mancare al laboratorio e non al calcolo professionale, e una
percentuale che le somma non è vera per nessuna delle due. Adesso sono del
corso, nel contenuto e nella cartella, e si stampano dalla vista **Corsi**, che
è dove si sceglie di quale materia si sta parlando. Il fascicolo resta della
classe: i corsi li attraversa per mestiere.

Le stampe già fatte si spostano da sole alla prima apertura, per le classi che
portano un corso solo. Dove ce n'erano due il file vecchio parlava davvero di
tutte e due, e infilarlo sotto una delle due lo farebbe leggere come se fosse
suo: quelli restano dov'erano, e la prossima stampa esce già al posto giusto.

Il nome del file ripete quel che dicono le cartelle — classe, documento,
allievo — apposta. Un file dall'archivio esce di continuo: lo si allega a una
mail, lo si copia sul desktop, lo si manda in segreteria, e fuori dalle sue
cartelle un «Rossi Mario.pdf» non dice più di che classe è né di che cosa
parla.

Prima erano cartelle piatte con nomi fatti di identificatori. Il registro ci si
ritrovava benissimo; una persona no, e quella cartella la si apre da fuori — si
cerca il documento di un allievo, si allega una pagella a una mail, si consegna
un fascicolo a chi subentra. I file archiviati con la disposizione di prima si
spostano da soli alla prima apertura, e i riferimenti si riscrivono con loro.

Anche il materiale dei piani lezione sta lì. Stava fuori, in `risorse/<id del
piano>`, da quando un piano apparteneva a una materia e non a una classe;
adesso il piano è di un corso — e quindi di una classe — e la scheda del lavoro
di gruppo è un documento di quel corso come il testo di una verifica. Il nome
della cartella è la data della prima lezione che usa il piano, o l'argomento
finché non ce n'è nessuna, e il nome del file dice anche a quale tappa della
scaletta appartiene.

Sono JSON indentati: si leggono a occhio, fanno diff sensati sotto Git e si
possono correggere a mano. Chi li rilegge normalizza quel che trova, quindi un
campo mancante o di tipo sbagliato non fa cadere l'estensione — e nemmeno una
versione precedente del formato: la conversione avviene in lettura e i file si
riscrivono una volta sola, da soli. Un JSON che non si legge proprio — una
parentesi persa correggendolo a mano — non viene coperto: si dice, quella
collezione resta vuota per quella sessione, e alla prima modifica il file
rotto viene messo da parte con un altro nome invece di essere sovrascritto.

Le scritture passano da un file temporaneo e poi da una rinomina, così un
salvataggio interrotto non lascia un JSON troncato; e prima di riscrivere, la
copia di com'era finisce in `.storico/`, dove restano le ultime dieci per
file. Costa una copia per salvataggio e ripaga la prima volta che si vuole
sapere che cosa c'era ieri — o quando due macchine hanno scritto insieme sulla
stessa cartella sincronizzata. È una cartella di lavoro, non un dato del
registro: sotto Git non ci va.

Il registro tiene d'occhio la cartella: se i file cambiano da fuori — un'altra
finestra, la sincronizzazione della cartella — li ricarica da solo. Quel che
era in attesa di essere salvato viene scritto prima di rileggere: una ricarica
che arriva fra un clic e il suo salvataggio non deve portarsi via il clic.

Se una modifica fatta a mano lascia un riferimento appeso — una materia
cancellata mentre due corsi la usavano ancora — compare una riga in cima al
pannello che lo dice, con il gesto per rimediare accanto. Ripara solo quel che
non perde niente: rimette la materia sparita con il suo identificatore, stacca
il rinvio a una lezione o a un piano che non esistono più, riporta fra le bozze
un piano che cita un corso sparito, e fissa sulla consegna la data dell'ora che
non c'è più — «per la prossima volta» non deve diventare «per mai». Quel che
richiederebbe una scelta — a quale corso appartiene una lezione rimasta orfana —
resta segnalato e basta, perché indovinare al posto del docente è peggio che
lasciare il problema in vista.

## Sviluppo

All'apertura della cartella partono da soli due task (`.vscode/tasks.json`):

- **collega** — mette in `~/.vscode/extensions` una giunzione verso questa
  cartella, così VS Code carica il codice di qui e non una copia impacchettata;
- **watch** — tiene `dist/` allineato ai sorgenti.

Per vedere una modifica basta **Ricarica finestra**. Con F5 si apre invece una
seconda finestra di sviluppo.

```bash
npm run build           # una compilazione
npm run watch           # compilazione continua
npm run controllo-tipi  # tsc --noEmit
npm test                # test del dominio
npm run pacchetto       # registro-docenti.vsix
```

## Proiettare per la classe

Il registro sta su uno schermo, la classe ne guarda un altro. `Registro:
proietta per la classe` — o il pulsante **Proietta** in fondo alla barra di
navigazione — apre una seconda finestra, staccata, da trascinare sul
proiettore. Da lì in poi segue il registro: si apre un'ora nel pannello, e
quella finisce sullo schermo grande.

Non è il registro duplicato, ed è la differenza che conta. Un `WebviewPanel`
non si può mettere in due posti, ma soprattutto non lo si vorrebbe: la pagina
del registro tiene i voti, le assenze e le note di venticinque persone, e
davanti a venticinque persone non ci va. La proiezione è una vista sua — sola
lettura, caratteri grandi, nessun comando sopra — e mostra soltanto i blocchi
che si sono accesi.

I blocchi sono sette, e si accendono dalla fascia che compare in cima al
pannello del docente quando lo schermo è acceso:

| Blocco | Che cosa mostra |
| --- | --- |
| Scaletta | Le tappe del piano con durata, materiali e risorse; le svolte sbiadiscono |
| Argomenti | Gli argomenti dell'ora e che cosa portare |
| Consegne | Che cosa c'è da fare, con il termine; quelle di chi insegna restano fuori |
| Calendario | Le prossime ore del corso e le prossime prove, in un elenco solo |
| Valutazioni | Media, sufficienti e distribuzione dei voti per fascia |
| Documenti | Quanti fogli sono arrivati, su quanti attesi |
| Appello | La griglia delle presenze per unità didattica |

Gli ultimi tre parlano dei singoli allievi, e per questo partono **spenti** —
si riconoscono dal bordo tratteggiato, e accesi la fascia diventa gialla e dice
che cosa sta sullo schermo. La ragione è che la proiezione segue il registro:
senza questa partenza, aprire l'ora dopo mentre lo schermo è acceso porterebbe
i voti dell'ultima verifica davanti alla classe senza che nessuno l'abbia
chiesto.

Un interruttore a parte decide se accanto ai voti e ai documenti mancanti ci
vanno i **nomi**. Spento — com'è di suo — una verifica si vede come è andata la
classe: media, quanti sufficienti, la colonnina per fascia. Acceso, compare la
colonna per allievo. L'appello i nomi ce li ha comunque: senza, non
correggerebbe niente, ed è proprio la classe a doverlo correggere.

**Pausa** spegne il contenuto lasciando la finestra dov'è: serve nel mezzo
dell'ora, quando si passa a scrivere qualcosa che non deve essere letto. In
pausa i dati non escono nemmeno dall'estensione — il messaggio che parte è
vuoto — e riprendendo si ritrova tutto com'era.

Un blocco spento non è un blocco nascosto dal foglio di stile: non finisce
proprio nel messaggio che raggiunge l'altra finestra. Il filtro sta in
`dominio/proiezione.ts`, in un posto solo, e le prove che lo tengono sono in
`test/proiezione.test.mjs`.

## Impostazioni

| Chiave | Predefinito | Che cosa fa |
| --- | --- | --- |
| `registroDocenti.cartellaDati` | `registro` | Cartella che contiene gli anni scolastici, relativa alla radice del workspace |
| `registroDocenti.aperturaAutomatica` | `true` | Apre il pannello all'avvio se la cartella dei dati esiste |
| `registroDocenti.proiezione.finestraSeparata` | `true` | Apre la proiezione in una finestra staccata, da portare sul secondo schermo |
| `registroDocenti.ocr.attivo` | `false` | Legge le scansioni con un OCR locale per riconoscere l'allievo |
| `registroDocenti.ocr.url` | `http://127.0.0.1:11434` | Dove risponde Ollama |
| `registroDocenti.ocr.modello` | `glm-ocr:latest` | Il modello con cui leggere: deve saper guardare le immagini |
| `registroDocenti.ocr.attesaMassimaSecondi` | `180` | Quanto aspettare la lettura di una pagina prima di rinunciare |

Dicono *dove* sta il registro, se aprirlo da solo, e se leggere le scansioni. Tutto il resto — orari della griglia, giorni visibili, scala
dei voti, durate predefinite — appartiene all'anno scolastico, non all'editor,
e si cambia dalla vista **Impostazioni** del pannello, che scrive nel
`registro.json` dell'anno aperto. Così viaggia con la cartella: chi apre lo
stesso registro su un'altra macchina trova la stessa griglia, e un anno chiuso
resta leggibile con le regole con cui è stato scritto.

Anche quale anno sia aperto sta nella cartella — nel `registro.json` in radice —
e non fra queste chiavi, per lo stesso motivo.

## Comandi

`Registro: avvio guidato`, `apri`, `guida`, `proietta per la classe`, `vai a
oggi`, `nuova lezione`, `nuova classe`, `nuovo corso`, `nuovo piano lezione`,
`nuovo momento di valutazione`, `nuovo anno scolastico`, `ricarica i dati`,
`apri la cartella dei dati`, `apri la cassetta dei PDF in arrivo`.

Tre hanno una scorciatoia, e sono le tre che si premono ogni giorno:
`ctrl+alt+r` apre il registro, `ctrl+alt+t` va a oggi, `ctrl+alt+n` comincia
una lezione nuova.

## Scorciatoie nell'uso

- Il Cruscotto è la schermata d'apertura: una tabella per semestre, una colonna
  per corso, e in ogni cella i segni di quel che manca a quell'ora.
- Nella barra laterale di VS Code l'albero raccoglie prossime lezioni, classi,
  **corsi**, piani e valutazioni: un corso si apre sulle ore che restano da
  fare, e cliccandolo si va alla sua scheda nel pannello.
- Nell'albero il tasto destro fa quel che si farebbe aprendo il pannello, senza
  aprirlo: su un'ora apri, duplica ed elimina — e su un'ora senza scaletta il
  piano, vuoto o copiato da un altro corso; su un corso un momento di
  valutazione nuovo e la generazione delle ore dall'orario; su una classe
  l'esportazione delle presenze. Sono le stesse azioni del pannello, perché due
  elenchi diversi per le stesse cose sono due posti in cui dimenticarsene una.
- In fondo alla barra di stato c'è la prossima ora: quella che deve ancora
  cominciare, non quella di stamattina già finita, e premendola si apre lei.
- Nel calendario settimanale, un clic sul vuoto crea una lezione a quell'ora;
  trascinando un blocco lo si sposta, con Ctrl premuto lo si copia, e il tasto
  destro apre quel che ci si può fare sopra — eliminazione compresa.
- Negli orari si dichiarano l'ora d'inizio della prima riga e le durate: il
  resto sono conti. Cambiare l'ora della prima riga fa slittare tutto il
  seguito, pause comprese; allungare una riga spinge avanti quelle sotto.
- Le righe di un orario si rimettono in fila trascinandole per la presa a
  sinistra, o con le frecce su e giù quando la presa ha il fuoco.
- Nella griglia dei voti ci si sposta con le frecce e con Invio; nella casella
  si scrive il voto oppure `a` per segnare l'assenza.
- Nel dettaglio di una lezione l'appello parte al primo clic e i testi si
  salvano quando si lascia il campo.
- Nell'appello ogni casella è un pulsante solo: – → P → X → R → E → –. Il
  pulsante in testa alla colonna fa la stessa cosa su tutta la classe, quello in
  testa alla riga su tutta l'ora di un allievo; «Tutti presenti» riempie
  l'intera matrice e «Azzera» la riporta tutta a non impostata — e lo chiede
  prima, perché è l'unico gesto della pagina che cancella un'ora di lavoro.
- Quel che si scrive resta scritto anche se il pannello si ridisegna sotto le
  dita: l'orologio del registro batte ogni minuto, e prima aspetta che il campo
  in cui si sta scrivendo venga lasciato.
- Una classe si duplica nell'anno nuovo dalla sua scheda: si scelgono anno e
  nome, e con lei passano gli allievi e i corsi che le si insegnavano.
