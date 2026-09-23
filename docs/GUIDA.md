# Registro docenti

Registro di classe per docenti: calendario delle lezioni, classi e persone in
formazione (PiF),
piani lezione e momenti di valutazione. È un'applicazione desktop — Electron —
e i dati stanno in un documento per anno scolastico — `2026-2027.registro`, un
archivio con dentro i JSON — nella cartella di lavoro, accanto al resto del
materiale del docente.

All'avvio l'applicazione chiede una volta sola su quale cartella lavorare, se la
ricorda, e apre il registro se in quella cartella è già stato usato.

## Come è fatto

| Cosa | Dove |
| --- | --- |
| Modello, calendario, medie, validazione | `src/dominio/` |
| Impaginazione dei rapporti | `templates/` (la copia di serie), `src/dominio/rapporti.ts`, `src/dati/rapportiPdf.ts` |
| I modelli visti dal registro: catalogo, controllo, pagina | `src/dominio/catalogoModelli.ts`, `src/dominio/verificaModelli.ts`, `src/azioni/modelli.ts`, `src/interfaccia/viste/modelli.ts` |
| Dove finisce un documento, e con che nome | `src/dominio/collocazioni.ts` |
| Che cosa il registro mette dentro un rapporto | `src/dominio/datiRapporti.ts` |
| Lettura e scrittura dei file | `src/dati/` |
| Comandi e pannelli | `src/avvio.ts`, `src/pannelli/` |
| Che cosa il registro sa fare e che cosa si regola | `src/manifesto.ts` |
| Come si chiamano le cose: i termini, gli articoli, gli elenchi | `src/dominio/lessico.ts` |
| L'ambiente su cui gira: finestre, dialoghi, file, impostazioni | `src/ambiente/` |
| Il widget agganciato al bordo del desktop | `src/dominio/agenda*.ts`, `src/agenda.ts`, `src/ambiente/ancoraggio.ts` |
| Il guscio Electron: avvio, menu, protocollo, pagine native | `guscio/` |
| Contratto fra host e pannello | `src/protocollo.ts` |
| Applicazione delle azioni | `src/azioni.ts` |
| Interfaccia del pannello | `src/interfaccia/` |
| La mappa degli indirizzi: geometria, geocodifica, tasselli | `src/dominio/mappa.ts`, `src/dati/geocodifica.ts`, `guscio/tasselli.ts` |
| I modelli del linguaggio: la cartella, lo scarico, chi li fa parlare | `src/dati/gguf.ts`, `src/dati/huggingFace.ts`, `src/dati/llm.ts`, `src/dati/llamaCpp.ts`, `src/dati/mtmd.ts`, `src/interfaccia/viste/modelliLinguistici.ts` |
| La dettatura: le guardie, il dialetto di whisper, la voce dal microfono | `src/dati/dettatura.ts`, `src/dati/whisper.ts`, `src/interfaccia/assistente/voce.ts` |
| I programmi che il registro si scarica da sé, e con quali guardie | `src/dati/corredo.ts`, `src/dati/corredoVoce.ts`, `src/dati/corredoVista.ts` |
| Dove si può andare: l'elenco delle pagine | `src/interfaccia/pagine.ts` |
| Che cosa si può fare, e in quali pagine | `src/interfaccia/comandi.ts` |

Il dominio non conosce né l'applicazione né il DOM: lo usano il main process, il
webview e le prove, ed è per questo che `npm test` gira senza aprire una
finestra.

**Le tabelle stanno in `docs/`.** Questo file racconta *perché* le cose sono
come sono, e resta il documento da leggere per primo; quel che un racconto non
sa fare — l'elenco completo delle entità, delle azioni, delle destinazioni, i
diagrammi, il contratto dell'interfaccia di programmazione — sta accanto, in
sette documenti indicizzati da [docs/INDICE.md](INDICE.md):
[ARCHITETTURA](ARCHITETTURA.md), [MODELLO-DATI](MODELLO-DATI.md),
[CATALOGO](CATALOGO.md), [API](API.md), [DECISIONI](DECISIONI.md),
[IMPIANTO](IMPIANTO.md) e [CANTIERE](CANTIERE.md) — gli ultimi due
dicono dove va la struttura e a che punto è il lavoro.

**Le parole stanno in un file solo.** `src/dominio/lessico.ts` è l'elenco dei
termini del registro — la persona in formazione, la classe, il corso, l'unità
didattica, la fascia oraria, il momento di valutazione — ognuno con singolare,
plurale, genere e forma corta. Da lì nascono le etichette dei moduli, i messaggi
che il registro risponde, le intestazioni delle tabelle dei PDF e dei CSV, le
voci delle tendine e i testi della guida. Cambiare una parola vuol dire cambiare
una riga: `singolare: 'persona in formazione'` diventa `singolare: 'allievo'`,
`genere: 'f'` diventa `genere: 'm'`, e articoli e accordi si riallineano da sé —
`frase(PIF, 'trovato', { nega: true })` passa da «Persona in formazione non
trovata.» a «Allievo non trovato.» senza che nessuna frase sia stata riscritta.

Tre cose il lessico non le tocca, ed è voluto. **I nomi nel codice** —
`allievo`, `allievoId`, `classe.allievi` — sono identificatori, non parole: si
vedono solo qui dentro. **I segnaposto** dei modelli e delle e-mail —
`{allievo}`, `{{allievo}}`, `tabella: allievi` — sono un contratto con i file
che stanno nella cartella del docente: rinominarli romperebbe ogni oggetto di
posta e ogni modello già personalizzato. **I nomi delle cartelle su disco** —
`allievi/<Cognome Nome>/` — perché rinominarli vorrebbe dire spostare file già
sincronizzati su OneDrive. La sola parola che il lessico scrive nel nome di un
file è quella delle schede personali, e i nomi che ha avuto prima restano
dichiarati in `DOCUMENTO_SCHEDE_PRIMA`, così le stampe vecchie continuano a
essere riconosciute per quel che sono.

Il registro importa un modulo chiamato `apparato`, e non è un pacchetto: quel
modulo è `src/ambiente/apparato.ts`, risolto da un alias di esbuild e da un
`paths` di TypeScript. È l'interfaccia fra il registro e la macchina che lo
ospita — finestre, dialoghi, file, impostazioni, portachiavi — e tenerla stretta
in un solo punto è quel che permette ai trentadue file che la usano di non
sapere niente di Electron.

Si chiamava `vscode`, perché il registro è nato come estensione dell'editor.
Quel nome ha smesso di dire il vero il giorno in cui ha cominciato a girare in
una finestra sua: nominava un prodotto che non c'entra più, e faceva passare per
API di qualcun altro il contratto fra il registro e la macchina. `apparato`
nomina un ruolo, e il ruolo non cambia se domani sotto c'è altro.

**Le coordinate hanno per chiave l'indirizzo, non la persona.** Stanno in una
raccolta loro — `coordinate.json`, `Registro.coordinate`, chiave
`chiaveIndirizzo(indirizzo)` — e non dentro l'allievo. Da questa scelta vengono
tre cose che con il punto nell'anagrafica non si potevano avere: la domanda al
geocodificatore si fa **una volta per indirizzo** (dieci tirocinanti nella stessa
ditta erano dieci domande e dieci risposte leggermente diverse per lo stesso
portone); un indirizzo corretto in una scheda vale subito per tutte le altre; e
soprattutto si vede **chi condivide un indirizzo con chi** — fratelli sotto lo
stesso tetto, compagni nella stessa azienda — che è il fatto per cui una mappa
di classe si guarda. Sulla mappa un segnaposto è un indirizzo: il cartellino
elenca tutti quelli che ci stanno, e la scheda «Indirizzi in comune» li raccoglie
per iscritto. I `geo` che stavano dentro le anagrafiche dei file vecchi entrano
nella raccolta alla prima lettura — `coordinateDellAnno`, in `validazione.ts` — e
poi smettono di comparire.

**La mappa è l'unico posto da cui un dato dell'anagrafica esce dalla macchina**,
e per questo è fatta in modo che si veda: gli indirizzi partono soltanto premendo
«Trova gli indirizzi», la domanda va a Nominatim — una al secondo, con un
`User-Agent` che dice chi chiama — e la risposta resta scritta.

La riga non si manda com'è. Gli indirizzi veri sono «Studio d'ingegneria, Via
Campagna 2.1, CP 570, 6512 Giubiasco», e cercati così non trovano niente: su una
classe vera era un indirizzo su cinque. `scomponiIndirizzo` li spezza — via,
civico, NAP, località — buttando via la casella postale e l'intestazione (il nome
dello studio, il nome di una persona), e `geocodifica` chiede in quattro modi,
dal più preciso al più grossolano: via + civico + NAP + paese in forma
strutturata, la sola via, la riga intera, e in ultimo il paese. L'ultimo scalino
si dichiara — `Coordinata.approssimato`, «solo il paese» nell'elenco — perché una
via che in OpenStreetMap non c'è esiste lo stesso nel mondo, ma a un punto così
non ci si va in macchina. Sui dati veri: da 75 indirizzi su 95 a 95 su 95, di cui
11 approssimati. Le coordinate si
rileggono nella scheda della persona, sotto l'indirizzo che le riguarda, con la
distanza dalla sede e con quel che il geocodificatore ha capito: è lì che un
«Via Roma» finito nel Cantone sbagliato si riconosce.

Il riquadro della mappa è un componente — `interfaccia/componenti/mappa.ts` — e non
un pezzo della pagina: di mappe ce ne sono due, quella grande e quella piccola
nella scheda di una persona («Dove sta»: casa, azienda, scuola e il tragitto fra
le prime due). Ognuna tiene dentro la propria chiusura dove guarda e che
cartellino è aperto, così due mappe nella stessa pagina non si spostano a
vicenda, e rilegge i punti a ogni disegno invece di tenerseli.

Il pannello, invece, continua a non parlare con nessuno — `default-src 'none'`.
Anche le carte passano dall'host: `registro://mappa/<z>/<x>/<y>.png`, servito da
`guscio/tasselli.ts`, che scarica da OpenStreetMap e tiene una cache in
`userData` — non nella cartella del docente, perché sono immagini di strade e non
hanno motivo di finire dentro OneDrive.

**La guida sta dentro l'applicazione**, nel gruppo Programma del menu delle pagine:
una sezione per pagina, con che domanda risponde e i gesti che si fanno, e da
ogni sezione si va alla pagina vera. Il contenuto è una struttura di dati in
`src/interfaccia/viste/guida.ts` — chi aggiunge una funzione aggiunge una riga —
perché una guida faticosa da aggiornare è una guida che dopo tre mesi dice il
falso, che è peggio di non averla. Questo file resta il documento di chi
sviluppa: dice *perché*, la guida dice *come*, e
[docs/CANTIERE.md](CANTIERE.md) dice **che cosa sta cambiando adesso** —
le scelte aperte e il lavoro che resta, cantiere per cantiere. (C'era un
`LACUNE.md` con l'elenco numerato di quel che il registro non copre ancora: è
stato cancellato nel commit `9470241`, e si rilegge con
`git show 9470241^:LACUNE.md`.)

L'interfaccia del pannello è scritta senza librerie. `src/interfaccia/dom.ts` è un
`h()` che costruisce elementi veri; la vista si ridisegna per intero quando lo
stato cambia — non a ogni tasto premuto — e le finestre modali vivono fuori dal
ciclo di ridisegno, così quello che si sta scrivendo non si perde mai.

**Navigazione e azioni hanno spazi distinti.**

| Spazio | Funzione | Origine |
| --- | --- | --- |
| File | Aprire, salvare, registri recenti, posta e manutenzione | comandi con `dove: ['app']` |
| Sidebar richiudibile | Aprire direttamente le destinazioni raggruppate per sezione | `sidebar.ts`, `pagine.ts` |
| Corso / Anno / Periodo | Scegliere i dati su cui lavorare | `contesto.ts`, `stato.ts` |
| Riga compatta delle azioni | Comandi della pagina corrente, con icone e testo affiancati | `comandi.ts` |
| Proietta e Cerca | Funzioni disponibili da ogni pagina | `comandi.ts`, `palette.ts` |
| Scheda «Proiezione» | Comandi dello schermo per la classe | comandi con `dove: ['schermo']` |
| Fascia sotto la barra | Che cosa sta vedendo la classe adesso | `componenti/proiezione.ts` |

**Un comando, una superficie per volta.** Un comando può nominare più pagine —
«Ora in questo corso» sta nel registro della lezione, nei piani e nelle
valutazioni — ma non nomina una pagina che disegna già il pulsante suo: la riga
delle azioni e il corpo della pagina si vedono nello stesso schermo, e due
pulsanti uguali a un centimetro l'uno dall'altro fanno chiedere in che cosa
differiscano. Per questo le Impostazioni (anno, vacanze, posta) e i Documenti
(le esportazioni del corso) non ripetono nella riga i comandi che hanno già nel
corpo: quelle pagine *sono* la superficie di comando del loro mestiere, e nel
menu File i comandi restano raggiungibili da ogni altra pagina. Per lo stesso
motivo la fascia della proiezione non scrive i propri testi: legge titolo,
aiuto e motivo del no dai comandi `dove: ['schermo']`, e resta sua soltanto la
forma che un pulsante generico non sa dare — le schede a tre stati e il
selettore della vista del calendario.

Vale anche per le destinazioni: due voci che aprono la stessa vista con lo
stesso contesto sono una voce sola. L'elenco della classe si raggiunge da
Il programma › Classi, e non una seconda volta dalla sezione del docente di
classe.

**Le quattro sezioni dicono con che passo si apre una pagina.** *Gestione* è la
giornata — il calendario e le pendenze, che cosa ho oggi e che cosa ho lasciato
in giro. *Registro* sono le quattro facce del corso scelto. *Docente di classe*
è il mestiere sulle stesse persone, e compare solo dove quel mestiere c'è. *Il
programma* è come è fatto l'anno e come è fatto il registro: corsi, classi,
impostazioni, guida. Corsi e Classi stavano in Gestione, accanto al calendario:
là si guarda che cosa c'è da fare, qui si dichiara com'è fatto l'anno — ci si
entra a settembre e poi quando cambia qualcosa, con lo stesso passo con cui si
aprono le impostazioni.

**Ogni sezione porta il filtro su cui lavora, e nessun'altra.** Nel registro è
il corso — lezione, valutazioni, piani, documenti (`siLavoraSuUnCorso`); nel
pannello del docente di classe è la classe, perché l'archivio documentale,
assenze e messaggi valgono per tutte le materie insieme (`siLavoraSuUnaClasse`,
con le sole classi che hanno la spunta). Le due tendine non compaiono mai
insieme. Altrove non compare nessuna delle due: il calendario ha un filtro suo
per classe, le pendenze guardano tutte le classi insieme, Corsi *è* l'elenco
dei corsi e Classi ha il suo elenco laterale. Una tendina che non cambia quel
che si sta guardando insegna a non fidarsi nemmeno dove funziona. Quel che si è
scelto non si perde quando la tendina non si vede: torna scritto rientrando
nella sezione. Aprendo una pagina i filtri si allineano insieme — corso e
classe in `vaiAlCorso`, classe in `vaiAlPannello` — perché le viste filtrano
per tutti e due.

**Lo schermo per la classe ha una scheda sua nella barra.** L'interruttore
«Proietta» resta in fondo alla riga di navigazione — si accende e si spegne da
qualunque pagina — e a schermo acceso, accanto al contesto, compare il pulsante «Proiezione», con il punto verde. Premendola la riga delle
azioni mostra i comandi `dove: ['schermo']` invece di quelli della pagina; si
apre da sé accendendo lo schermo — chi ha appena premuto «Proietta» ha una
domanda sola, che cosa faccio vedere — e torna alla pagina cambiando pagina o
spegnendo. La scelta sta in `stato.schedaComandi` e non si ricorda fra una
sessione e l'altra: è dove si stava guardando un minuto fa, non una preferenza.

La fascia sotto la barra non ripete quei comandi: dice **che cosa sta vedendo
la classe**. Restano le linguette delle schede proiettabili, che hanno uno
stato in più di un pulsante — spenta, accesa ma in coda, in vista adesso — e
l'avviso quando sullo schermo ci sono dati che parlano delle singole persone.
Nome e riga d'aiuto di ogni linguetta vengono dal comando corrispondente, e il
gesto è lo stesso: `apriBlocco` sta in `comandi.ts`.

**Il calendario non ha una barra sua.** «Oggi», le frecce e le quattro
modalità — settimana, mese, anno, agenda — sono comandi con `dove:
['calendario']` e stanno nella riga delle azioni, insieme a «Nuova ora» e «Ora
da compilare». Stavano nella testata della vista: due file di comandi a tre
centimetri l'una dall'altra, e quella che il registro chiama «le azioni di
questa pagina» non conteneva le uniche azioni che quella pagina avesse davvero.
La modalità accesa si legge sul pulsante (`acceso`), come per i comandi dello
schermo. Lo stato di scorrimento della striscia dei mesi vive in
`navigazioneCalendario.ts`, letto sia dalla vista sia dai comandi.

Nella testata della vista non resta nessun filtro: il **filtro per corso del
calendario** sta nella riga delle scelte della barra, accanto ad anno e periodo,
che è dove il registro tiene tutte le risposte a «su che cosa sto guardando».
Scrive in `filtroCorsoAgendaId` e non nel corso del registro — si torna nelle
pagine del corso e ci si ritrova quello di prima, non quello messo qui per
guardare un'ora altrui — e le due tendine non compaiono mai insieme, così non
c'è modo di scambiarle. Un filtro solo: la classe è già scritta nel nome di ogni
corso («DIC4a · Matematica»), e una seconda tendina serviva soltanto ad
accorciare la prima, azzerandosi sotto le dita ogni volta che si toccava quella.

La testata del calendario è **compatta** (`testataVista({ compatta: true })`):
una riga sola con il periodo e i tre numeri in coda, letti come una frase invece
che incolonnati. Il nome della pagina sta già nella barra, e settanta pixel di
intestazione sono settanta pixel tolti alla settimana.

Lo stesso vale per le **Pendenze**: i tre modi di guardarle — «Tutte», «Le
mie», «Delle classi» — sono comandi `dove: ['todo']` con `acceso`, nella riga
delle azioni, e non più un selettore nella testata; la testata è compatta.
`FiltroTodo` vive in `stato.ts` accanto a `ModoCalendario`, così i comandi lo
leggono senza importare la vista che lo disegna.

Le pendenze sono divise per **tipologia**, e la tipologia dice *chi deve fare
che cosa*: le assenze da far firmare, le assenze oltre la soglia e i momenti di
valutazione, che non hanno un «chi», più le quattro che nascono dall'incrocio fra
chi tocca — la classe, il docente — e che gesto è: consegnare un foglio, svolgere
qualcosa. Erano quattro
famiglie e dicevano che *cos'era* una pendenza: sotto «Documenti» stavano
insieme la pagella che il docente deve dare e il certificato che aspetta dagli
allievi, che sono due lavori con due momenti diversi. Il giudizio sta nel
dominio — `FamigliaTodo`, `famigliaDiConsegna` in `dominio/todo.ts` — perché lo
leggono la pagina delle pendenze e la scheda del docente di classe, e due posti
che contano cose diverse chiamandole con lo stesso nome è il difetto che si
scopre tardi.

**La soglia di assenza produce una pendenza.** `sogliaAssenza` era un numero che
compariva su due rapporti stampati e da nessun'altra parte: chi non stampava quei
fogli non sapeva di doverlo fare. Adesso chi la supera compare fra le pendenze
della sua classe — una riga per persona e per corso, con le unità didattiche
perse su quelle previste — e ci resta finché la percentuale non rientra: è un
conto, non uno stato, e non si spunta. Le righe stanno in due mucchi, e la
differenza è quella fra le due percentuali che il registro tiene (vedi
`matriceCorso`): **da segnalare** quando è oltre soglia anche sulle UD con
l'appello fatto, **da guardare** quando il numero viene dalle ore previste ma
l'appello di quelle ore manca. La regola della soglia vive in un posto solo —
`dominio/segnalazioni.ts` — e la usano anche i due rapporti, perché tre conti in
tre posti sono tre occasioni di segnalare persone diverse. Quel che ancora manca
è il registro di chi è già stato segnalato e quando.

Il riepilogo è **una riga per tipologia** e non una scheda in quattro piani:
nome, numero e, se c'è, la pastiglia del ritardo. La
frase che spiega la famiglia sta nel titolo che compare fermandosi sopra — si
legge la prima volta e poi non serve più. Sotto, **una linguetta per classe**
con il suo conto (`stato.classeTodoId`, `null` = tutte): le classi stavano una
sotto l'altra, e con sei classi per arrivare alla terza bisognava scorrere le
prime due. «Tutte» resta la prima ed è quel che si trova aprendo, perché la
domanda della domenica sera è «che cosa ho lasciato in giro, dappertutto»; le
linguette servono a scendere in una classe dopo averla vista in elenco. Le
righe di riepilogo restano di tutte le classi anche con una linguetta aperta: è
il confronto fra le tipologie che dice da dove cominciare.

Sono linguette e non pastiglie: il `selettore` incassato — quello di «settimana
/ mese / anno» — in una riga larga come la pagina non si leggeva come una
scelta fra posti, e quel che organizzava le pendenze restava il riquadro di
ogni classe più sotto. Qui il filo corre sotto quella aperta. E con una
linguetta aperta il riquadro sparisce: il nome della classe è già sulla
linguetta, e ripeterlo in testata a un box che contiene l'unica cosa della
pagina è una cornice attorno al vuoto. Restano le tipologie nude, come nel
registro di classe — `sezioniTodoClasse` serviva già a questo.

Anche la pagina **Lezione** segue la stessa regola. La tendina del corso che
aveva nel suo navigatore era la stessa della barra, con la stessa regola per
decidere su quale ora aprirsi: resta solo quella delle ore, e il navigatore
smette di essere un riquadro per tornare una riga di controlli. In riga delle
azioni stanno i **tre stati dell'ora** — Pianificata, Svolta, Annullata
(`dove: ['lezione']`, gruppo «Stato dell'ora») — più «Modifica l'ora» e
«Prossima ora».

Gli stati sono tre pulsanti con `acceso` su quello in vigore, e non due
interruttori che cambiano nome: «Segna come svolta» che diventava «Riporta a
pianificata» costringeva a leggere la promessa del pulsante e dedurre il
contrario per sapere com'era messa l'ora. I nomi e le spiegazioni stanno in un
`Record<StatoLezione, …>`, così uno stato nuovo nel dominio non compila finché
non ha un pulsante. «Svolta» resta `primario` finché l'ora non è chiusa, e
«Annullata» chiede conferma. La testata è compatta, così l'appello resta sopra
la piega.

**Tutto quel che esce dal registro sta in Documenti.** I PDF e i CSV erano
sparsi: le presenze e le valutazioni nella scheda del corso, il verbale dentro
l'ora, la griglia in CSV nella pagina Valutazioni. Ognuno al posto giusto per
chi sta facendo quella cosa lì — e nessun posto per chi invece deve
*consegnare*, che è un lavoro suo: succede a fine semestre, riguarda venti fogli
insieme, e per farlo bisognava ricordarsi dove stava ogni pulsante. Adesso il
verbale di ogni ora (PDF e testo), le schede di ogni persona, la griglia di ogni
prova, i piani, il fascicolo di classe, i due CSV e «tutto il corso in un colpo»
stanno nella stessa pagina, corso per corso, accanto alla regola con cui il
registro li rifà da sé. Nessun comando li porta altrove: nel registro della
lezione e nelle valutazioni non c'è più un pulsante di esportazione.

**In Documenti, fare un foglio e guardarlo sono lo stesso gesto.** La pagina è
in due metà: i riquadri a sinistra, il foglio aperto a destra. `rapporto.genera`
non apre più il programma di sistema — scrive, e rimanda il percorso in
`Risposta.documento`, che la pagina mette nella sua cornice; una riga si apre
premendola ovunque, e resta segnata mentre la si legge. In testa all'anteprima
stanno il posto nell'elenco («3 di 12»), le frecce per scorrere i documenti
della scheda e i gesti di quel foglio — rifarlo, buttarlo via, portarlo in una
finestra sua. Il telaio del lettore vive fuori dalla vista
(`componenti/cornice.ts`) e insegue con una posizione fissa il segnaposto che la
vista dichiara: un `<iframe>` tolto dal documento ricarica, e il ridisegno che
scatta a ogni minuto riportava a pagina uno chi stava leggendo.

La pagina è quattro file, e il taglio segue le dipendenze: `viste/documenti.ts`
è il telaio e decide quale scheda si guarda; `viste/documenti/fogli.ts` tiene i
mattoni — trovare il file, dire se c'è, aprirlo, rifarlo, spuntarlo — e il
registro delle righe disegnate da cui escono il conto in testa a ogni scheda, la
casella «tutti» e l'ordine che l'anteprima scorre; `viste/documenti/schede.ts`
disegna i riquadri; `viste/documenti/anteprima.ts` la cornice. I riquadri e
l'anteprima sanno dei mattoni, i mattoni non sanno di loro.

**Le righe dei documenti sono minime, e si spuntano.** Lo stato del file è un
punto — pieno «nella cartella», vuoto «da fare» — con misura e giorno nel
titolo; i gesti stanno alla misura minuta e il cestino compare solo sulla riga
sotto il puntatore. Davanti a ogni foglio c'è una casella, e in testa a ogni
riquadro quella che le spunta tutte.

**Un fascicolo è una ricetta, non un'unione al volo.** «Combina i N scelti»
chiede un nome, e `composizione.crea` scrive due cose: la ricetta — nome,
percorsi, ordine — in `composizioni/` dentro l'anno, e il PDF composto con
`pdf-lib` in `esportazioni/composizioni/`. Le due cose stanno in due posti
apposta: il PDF è rifabbricabile e sta nella cartella che si consegna, la
ricetta no — se la si perde, l'unico modo di ritrovarla è rispuntare
venticinque caselle. Il riquadro «Fascicoli» li elenca con i soliti tre gesti;
`composizione.aggiorna` ricompone con i fogli di adesso, e «Aggiorna tutto» lo
fa per tutti dopo aver rifatto le parti. Le ricette arrivano al webview con lo
stato (`MessaggioStato.composizioni`), come le esportazioni, perché il documento
dell'anno la pagina non lo vede.

**«Aggiorna tutto» riempie la cartella per intero.** `rapporto.completo` non
chiama più la sola fila dell'automazione (`documentiDelCorso`: presenze, voti,
schede, prove) ma `tuttoDelCorso`, che aggiunge il verbale di ogni ora svolta,
ogni piano lezione, la parete di ritratti e il fascicolo delle classi di cui si
è docente, deduplicando per percorso quando due corsi condividono la classe.
L'automazione resta la fila corta: rifare trenta verbali a ogni casella
dell'appello vorrebbe dire un registro che scrive più di quanto risponda.

**La sezione «Docente di classe» esiste solo dove quel mestiere c'è**
(`sezioneCePer` in `pagine.ts`): senza nemmeno una classe con la spunta «sono
docente di classe» la scheda non compare, e ricompare da sé appena la spunta
c'è. Quando c'è, le sue quattro pagine sono sempre accese: dentro una sezione
che esiste, `classeDelFascicolo()` una classe buona la trova sempre — quella
scelta se ha il fascicolo, la prima che ce l'ha altrimenti. È la differenza fra
un mestiere che non si esercita, che sparisce, e un dato che manca — un corso
non ancora creato — che resta in elenco, spento, con scritto che cosa serve.

Ctrl+B nasconde soltanto le azioni; le pagine restano visibili. Ctrl+K cerca
pagine e comandi. I menu supportano frecce, Home, End, Escape e Tab. Una sola
sezione risulta attiva anche quando due destinazioni condividono una vista.

Il cambio corso passa da `scegliCorso`: aggiorna classe e filtro e, durante
una lezione, apre un'ora del nuovo corso. Se non ha lezioni apre i piani.
La scheda di una persona torna all'elenco quando cambia classe.

I registri recenti sono salvati in `userData/documenti.json`, fuori dai dati
didattici. I file mancanti restano elencati ma non si possono aprire. Il menu
File usa lo stesso gestore del guscio per il dialogo e per un percorso noto, e
lo stesso elenco compare in tre posti: la tendina File, il sottomenu «Apri un
anno recente» della barra dei menu — che serve a chi il pannello non ce l'ha
davanti — e la pagina di benvenuto. Si governa dalle impostazioni del
programma, sotto «File e apertura»: là ogni riga ha la stella dei preferiti,
«Apri» e la croce che la toglie dall'elenco senza toccare il file.

Dove stanno le finestre si ricorda in `userData/finestre.json`: posto, misura,
schermo e stato — ingrandita, a schermo intero — per il pannello del registro,
la proiezione, il lettore dei documenti e le impostazioni. Si rilegge solo se
quel posto cade ancora dentro uno schermo attaccato: staccando il monitor, la
finestra torna alle misure di sempre invece di aprirsi dove non la vede
nessuno. La proiezione riprende il posto ma non lo schermo intero, che le dà il
comando insieme al monitor su cui andare (`src/ambiente/posti.ts`).

Gli stili condivisi sono separati per componente: `barra-comandi.css`,
`menu.css` e `palette.css`; il loro ordine compare in `stili.css`.

Verifiche: `npm run controllo-tipi`, `npm run controllo-stile`, `npm test`,
`npm run build` — le prime tre sono quelle che `docs/CANTIERE.md` pretende
prima di spuntare una casella, e le fa girare anche la CI. Le regressioni
nel browser si eseguono con `python prove/interfaccia/navigazione.py` dopo aver
installato Python Playwright e Chromium. Usano dati sintetici e scrivono le
schermate in `dist-prove/`; non aprono i registri dell'utente.

## Il giro, dall'inizio

Il registro ha una catena sola, e tutto il resto pende da lì:

```
Anno ──┬── Semestri (nascono con l'anno)
       └── Classe ──┬── PiF
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

**L'anno scolastico corrisponde a un documento `.registro`.** Contiene i JSON
e gli allegati dell'anno. La cartella di lavoro contiene uno o più documenti,
ma il registro ne carica uno per volta. Cambiare anno carica un altro
documento, mantenendo separati i dati delle diverse annualità.

Materie, scala dei voti e griglia oraria appartengono all'anno e vengono
copiate alla creazione di quello nuovo. Un anno chiuso conserva le
impostazioni con cui era stato compilato. `registro.json` nella cartella di
lavoro indica quale anno aprire. Le vecchie cartelle degli anni sono lette
dalle procedure di migrazione, mantenute per i registri esistenti.

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

**Classe e persone in formazione.** Un gruppo di PiF, e nient'altro: la classe
non dice che materia ci si insegna. Un ritiro non cancella la persona: togliendo la
spunta «frequenta» esce dagli appelli ma resta nello storico, e le presenze e i
voti già registrati restano leggibili.

**Corso.** Questa materia, a questa classe. È il perno del registro: la classe
da sola è un gruppo, la materia da sola una voce di catalogo, e l'insegnamento è
la coppia. Ha una vista sua — **Corsi** — perché è la cosa che si prepara a
inizio anno e quella che si controlla quando qualcosa non torna. Si sceglie il
corso dalla tendina in alto e si vede tutto quel che lo riguarda: PiF, ore
svolte su quelle previste, UD, presenza e media di classe, valutazioni, piani,
l'orario fisso con quante UD fa a settimana, la prossima ora, il programma, e
sotto la tabella persona per persona.

Un corso alla volta, e prima era l'elenco di tutti. L'elenco rispondeva a
«quali corsi sono pronti?», che è una domanda di settembre e si fa una volta;
«come va questo corso?» ci si torna ogni settimana, e con le schede in fila
quello aperto scivolava sotto le altre insieme alla sua tabella. La tendina
costa un clic e restituisce lo schermo intero a quel che si sta guardando.

I numeri sopra e le righe sotto si contano una volta sola, insieme: contarli
due volte vorrebbe dire poterli contare in due modi, e la somma smetterebbe di
tornare con le righe senza che nessuno se ne accorga. La media di classe pesa
le PiF, non i voti — chi ha fatto più prove non conta di più — e chi non
ha ancora nessun voto resta fuori invece di valere zero; quando non sono tutti,
l'etichetta lo dice: «media di 8 su 12».

Classe e materia di un corso non si cambiano più una volta creato:
sposterebbero lezioni, presenze e voti addosso a un altro gruppo senza che
nessuno se ne accorga. Una classe può avere più corsi — due materie allo stesso gruppo sono
due corsi, non due classi con le stesse PiF dentro. Lezioni e valutazioni
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

**Il corso si guarda anche per persona.** Sotto l'elenco dei corsi, il corso
aperto mostra una riga per PiF: presenza, UD seguite, UD di assenza,
ritardi, prove fatte, media e nota. È la domanda di metà semestre — «come sta
andando questa classe in questa materia?» — e prima non aveva un posto: le
presenze stavano dentro l'ora, i voti nella vista Valutazioni, e per rispondere
bisognava aprire venti lezioni e contare a mente. Il denominatore delle presenze
sono le UD su cui l'appello è stato fatto, non tutte: un'ora dimenticata non è
un'ora di assenze, e contarla come tale farebbe crollare la percentuale di tutti.

**Della persona in formazione il registro tiene chi è e come la si raggiunge.**
Cognome, nome,
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
gita, il modulo in segreteria. Una consegna senza destinatari — la classe c'è ma le PiF non ancora, che è
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
in piedi. La pagina **Pendenze** risponde invece alla domanda della domenica sera:
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
ponti, giornate d'istituto. La giornata è un seguito come le fasce orarie di una
lezione: la seconda fascia del mercoledì comincia quando finisce la prima, di
ogni giorno si dichiara solo l'ora con cui si entra, e l'ordine dentro la
giornata si cambia trascinando la riga — portata fra le fasce di un altro
giorno, la fascia si sposta lì. La generazione non cancella e non sovrascrive:
riempie i buchi, quindi si può rilanciare a ogni cambio d'orario senza pensarci,
e una lezione spostata a mano resta dove l'ha messa chi la insegna. L'orario è
uno stampo, non un vincolo.

**Spostare e copiare.** Nel calendario le lezioni si prendono con il mouse:
trascinandone una la si sposta — giorno e ora insieme, con le fasce che
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
lì in poi vive per conto suo. Ha una o più **fasce orarie**, e una pausa è una
fascia come le altre con tipo `pausa` — così una lezione di due ore con quindici
minuti in mezzo resta una lezione sola, con un piano solo — e un appello che le
conta tutte, unità didattica per unità didattica.
Le fasce stanno attaccate: ciascuna comincia dove finisce quella sopra, si
dichiara solo l'ora del primo — gli altri hanno il campo spento, perché la loro
è un conto — e li si rimette in fila trascinandoli per la presa a sinistra. Il
buco fra due fasce non esiste: se in mezzo si sta fermi lo si dice con una fascia
di pausa, che si vede e si conta, invece di lasciarlo implicito in due orari
che non si toccano.

**Appello.** Una matrice: le PiF in riga, le unità didattiche in colonna.
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
quella persona: chi oggi non c'è si segna in un clic. Dove le caselle non dicono
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

**Toglie un'ora soltanto `assente`.** Il ritardo vale come presenza, e l'esonero
pure: sono tre fatti diversi e uno solo è un'ora persa. Chi entra alla terza UD
di un blocco di quattro ha le prime due segnate assenti — quelle sono le ore
perse, e si contano da sé — e la terza è un'ora in cui c'era; contarla come
assenza vorrebbe dire toglierla due volte, e la percentuale che si consegna
direbbe più di quel che è successo. I ritardi si contano in una colonna loro,
con i minuti scritti sulla presenza, perché sono una cosa da guardare e non ore
da giustificare. L'esonero sta fuori per un'altra ragione: dietro c'è
un'autorizzazione, e abbassare la frequenza di chi ce l'ha vorrebbe dire
penalizzarlo per un permesso ricevuto. La regola sta in un posto solo —
`contaComeAssenza` in `dominio/calcoli.ts` — e la usano il quadro della persona,
il riepilogo dell'ora, la matrice del corso, i rapporti e la soglia delle
segnalazioni; `prove/dominio/ritardo.test.mjs` la tiene ferma in tutti e cinque.

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
una copia: cambiare quella del registro non riscrive i voti già dati. Una PiF
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
togliere la spunta «frequenta» invece di cancellare una persona. I file che
seguono — PDF delle verifiche, risorse dei piani, documenti raccolti — finiscono
nel cestino del sistema, non nel nulla.

**Scheda della persona in formazione.** La vista che raccoglie tutto quel che il
registro sa
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
l'elenco delle PiF dopo tutto quel che era venuto a cercare. Sono due
lavori con due ritmi: nelle Classi si guarda chi c'è e come va, nel fascicolo
si riscuotono documenti e si scrive alle famiglie.

Per lo stesso motivo la pagina **Classi** è soltanto l'anagrafica delle PiF:
nome, indirizzo, e-mail, azienda, e-mail del datore. È l'elenco che si tiene
aperto quando si deve scrivere un'e-mail, spedire una lettera o chiamare un
datore di lavoro, e in quel momento serve tutto lì, una riga per PiF.

Ci stavano anche i tre numeri della classe, le materie che ci si insegnano con
orario e pulsanti, e per ogni PiF presenze, ritardi e media. Erano tre altre
domande, e ognuna ha già il suo posto: che cosa si insegna nella vista
**Corsi**, come va una PiF nella sua **scheda** — una riga, un clic sul nome
— e i conti della classe nel **Cruscotto**. Mescolate all'anagrafica facevano
una tabella che non si finiva di leggere: sei colonne di numeri prima di
arrivare all'indirizzo che si era venuti a copiare.

**Assenze da far firmare.** Tre volte l'anno la scuola stampa, per ogni PiF,
il rapporto delle assenze e quello dei ritardi; il docente di classe li manda
all'azienda, e l'azienda li rispedisce firmati. È una pratica in tre fasi — il
foglio vergine che parte, l'e-mail che chiede la firma, il foglio firmato che
torna — e il registro la tiene in un blocco solo, per periodo: un elenco dei
periodi, e dentro quello aperto una matrice con le PiF in riga e le cinque
caselle in colonna. Verde vuol dire fatto, e la casella scura dice sempre la
prossima mossa.

I fogli si caricano uno per uno dalla casella, o tutti insieme con «Importa
fogli»: si sceglie una cartella di PDF e ognuno va alla PiF che il nome del
file nomina — chi non si riconosce resta fuori e viene elencato, perché fra due
fratelli con lo stesso cognome indovinare vuol dire mandare le assenze di uno
all'azienda dell'altro. L'e-mail parte una per PiF, in chiaro all'indirizzo
del datore di lavoro che sta nella sua scheda, con dentro i suoi soli fogli:
oggetto e testo si scrivono una volta per il periodo e si compilano nome per
nome con i segnaposto (`{allievo}`, `{azienda}`, `{periodo}`, …). Chi non ha
mancato niente non compare: una riga nasce con il suo primo foglio.

Una casella piena apre il foglio **nella cornice accanto alla matrice**, come
nell'archivio documentale: prima di spedire venticinque rapporti bisogna
guardarli, e una finestra del lettore di sistema per foglio vuol dire aprirne
venti e dare per buoni gli altri cinque. Le frecce scorrono i fogli del periodo
nell'ordine della matrice — per riga, e dentro la riga da sinistra a destra —
il «7 di 23» dice quanto manca alla fine, e in testa restano i tre gesti che
riguardano quel file: aprirlo nel programma del sistema, buttarlo via, chiudere.
Il periodo si crea da «Nuovo periodo», nella riga dei comandi, e si chiede
soltanto **quando comincia e quando finisce**: un periodo *sono* le sue due
date, e il nome — «1° semestre» — lo ricava il registro da quelle, perché un
campo accanto a due date che dicono già settembre–gennaio non aggiunge niente e
può smentirle. Chi non sta dentro un semestre resta senza nome e si legge dai
suoi estremi. Le due date si scelgono dal calendario — è l'unico posto del
registro dove la data si guarda invece di scriverla, perché «fin dove arriva il
primo semestre» non si sa a memoria — partono dal semestre di oggi (dall'anno
intero se l'anno non ha semestri), non escono dal calendario scolastico, e
finiscono nel nome dei file archiviati e nella lettera. La pagina si sposta poi
sul semestre del periodo appena scritto, invece di lasciarlo salvato e
introvabile.

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
pagelle diverse — e nella striscia sta **dopo la settimana in cui il semestre
finisce**, una volta sola: la fine dell'ultimo semestre è la fine dell'anno,
cioè il bordo della striscia, e l'inizio di quello dopo è la stessa riga detta
due volte.

## I rapporti in PDF

Quel che esce dal registro per andare in mano a qualcuno esce in PDF: il verbale
di un'ora, il piano lezione da portare in aula, la griglia dei voti di una
classe, il conto delle presenze, il fascicolo di classe, la scheda di un
PiF. Nel verbale l'appello è la stessa griglia che si compila a schermo —
una riga per PiF, una colonna per UD, le stesse sigle — con la legenda
sotto, perché il foglio finisce in mano a chi quella griglia non l'ha mai
vista.

Classe e materia sono due campi separati: nel registro il corso è la
combinazione delle due, ma su un foglio sono due informazioni diverse — la
classe dice a chi, la materia dice di che cosa — e chi legge le cerca in due
punti diversi. Un PDF si apre ovunque, si stampa com'è e non si modifica per sbaglio,
che è quel che si vuole da un verbale. Il CSV resta accanto dove serviva
davvero — le valutazioni e le presenze — perché il PDF si consegna e il CSV si
lavora in un foglio di calcolo.

L'impaginazione non sta nel codice: sta in `templates/`, dentro la cartella di
lavoro — quella che contiene il documento dell'anno — un file per rapporto. Sono
file di testo con righe `direttiva: contenuto`, e valgono dal salvataggio dopo.
La copia di serie viaggia con il programma: è la `templates/` di questo
repository, e `npm run modelli` la traduce in `src/dati/modelliPredefiniti.ts`.
Le due cartelle si chiamano uguale e non sono la stessa: questa è la copia che
il registro scrive quando la cartella del docente è vuota, quella accanto al
documento è la sua — e comanda sempre la sua.
**Intestazione e piè di pagina stanno in `_base.tpl`**, che tutti gli altri
estendono: cambiare la testata di tutti i rapporti è cambiare un file solo. Il
formato è descritto in `templates/LEGGIMI.md`.

**I modelli si governano dal registro: la pagina «Modelli».** Restano file di
testo — è quel che li rende modificabili senza ricompilare, e quel che li fa
sopravvivere agli aggiornamenti — ma non si va più a cercarli nel gestore di
file. Prima il registro sapeva leggerli e nient'altro, e questo costava tre
cose a ogni modifica. *Quale file toccare*: tredici nomi in una cartella non
dicono che cosa fanno, e `_stile.tpl` e `momento-valutazione.tpl` si
somigliano abbastanza da sembrare la stessa specie di cosa. *Che cosa
scriverci*: i nomi che un rapporto sa riempire stavano in una funzione di
`datiRapporti.ts`, e per conoscerli bisognava leggere il codice. *Se è venuto
bene*: il lettore dei modelli salta in silenzio la riga che non capisce — è la
regola giusta, un refuso non deve impedire di stampare il verbale — e quindi
un refuso si scopriva il giorno dopo, guardando un PDF a cui mancava una
tabella.

La pagina risponde alle tre. A sinistra l'elenco diviso per quel che una
modifica cambia: in alto i quattro strati che stanno sotto tutti i fogli, sotto
un modello per rapporto, e ognuno con la riga che dice che cosa si tocca lì. Al
centro l'editor, e sotto di lui **i problemi riga per riga** —
`dominio/verificaModelli.ts` legge il modello con le stesse regole
dell'impaginatore e dice che cosa verrà saltato; premendo un problema il
cursore va a quella riga. Accanto, **i nomi che quel rapporto produce**, presi
dai dati veri e non da un elenco scritto a mano: premendone uno finisce nel
punto in cui si sta scrivendo. In fondo **«Prova»**, che compone il foglio con
i dati veri di un corso e lo mostra lì — il PDF torna in base64 e si disegna
con pdfjs, senza toccare il disco: un foglio di prova nella cartella delle
esportazioni sarebbe un documento in più da spiegare a chi la apre per
consegnare.

Che il catalogo e la cartella dicano gli stessi nomi lo controlla `npm test`, e
che i modelli di serie passino il controllo senza un errore anche: se un giorno
non fosse più vero, o quel foglio esce monco da sempre, o è il controllo a
essersi inventato un errore — e un controllo che grida al lupo su quel che
funziona smette di essere letto.

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
PiF invece di uscirne uno per PiF; `pagina-nuova:` volta foglio, ma solo
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
di chi non ha annotazioni si teneva per buono il titolo della persona dopo e
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
allega a un'e-mail.

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
prove che li tengono in `prove/dominio/rapporti.test.mjs` — prima erano quattro righe
dentro il disegno, dove nessuno le ha mai messe alla prova.

Se la cartella non c'è, il registro ci scrive i modelli di serie al primo
rapporto — e da lì in poi comanda quel che c'è su disco, anche quando qualcuno
ne toglie una riga.

**I rapporti e i documenti seguono la stessa regola: classe, corso,
documento.** Le cartelle però restano due — `archivio/` per quel che si carica,
`esportazioni/` per quel che si stampa — e la ragione è pratica, non
concettuale: `esportazioni/` si può cancellare per intero, perché nessun
percorso salvato ci punta dentro e quel che c'è si rifà con un pulsante;
`archivio/` no, perché lì sta quel che è stato raccolto e che non si rigenera.
Due cartelle che si cancellano in modo diverso non sono la stessa cartella.
C'è stato un giro in cui erano unificate sotto `documentazione/`: quel nome
adesso è solo il vecchio, e la migrazione lo rismonta nelle due radici alla
prima apertura. Il nome del file ripete classe e documento, perché un rapporto esce
dalla sua cartella di continuo — lo si allega a un'e-mail, lo si copia sul
desktop — e fuori di lì un «Presenze.pdf» non dice più di che classe sia.

**Un rapporto rifatto sovrascrive quello di prima**, e si porta via anche i
doppioni numerati che i giri precedenti avevano lasciato: un rapporto è una
fotografia di com'è il registro adesso, e rifarlo vuol dire che quella di prima
non serve più. Numerandoli, la cartella si riempiva di stampe uguali dello
stesso verbale e bisognava guardare le date per capire quale valesse. I file
tolti vanno nel cestino, non si cancellano sul serio.

**Ogni rapporto è di un periodo, e lo dice.** Le presenze, le valutazioni e la
scheda di una PiF sono del semestre scelto; il verbale porta il semestre in
cui cade la sua ora; il fascicolo vale per l'anno intero. Il periodo sta nella
testata di ogni pagina, accanto all'anno scolastico, e nel nome del file:
`DIC2_Presenze_1° semestre.pdf`. Sono due documenti diversi — la presenza del
primo semestre non è quella del secondo — e chiamandoli uguali il secondo
avrebbe coperto il primo alla prima stampa dopo gennaio.

**Nel nome di un rapporto non c'è niente che non si legga.** Si compone di
quattro pezzi e tutti e quattro dicono qualcosa: anno scolastico, classe e
materia in testa, poi che documento è, di chi, e che cosa lo distingue dagli
altri dello stesso genere — `2026-2027_DIC4a_Calcolo professionale_Verbali_260915
08.20.pdf`. A distinguerlo dev'essere una cosa vera: l'ora della lezione, il
periodo, il giorno, il titolo della prova. In mezzo al nome stava anche
l'identificatore interno — `lez-m3k9x2-a7f1` — e serviva a non far coprire due
documenti diversi; ma il nome di un file si legge, si cerca, si detta al
telefono, e quella sigla non si poteva fare nessuna di queste cose. Dove le cose
vere non bastano — due prove con lo stesso titolo nello stesso giorno, due bozze
di piano nate lo stesso pomeriggio — la seconda porta un `(2)`.

**In testata c'è anche che documento è.** Un foglio esce dalla sua cartella di
continuo — lo si allega a un'e-mail, lo si stampa, finisce in una pila sulla
scrivania — e senza il nome del documento in cima si riconosce solo leggendolo.
Vale soprattutto per la seconda pagina, che è quella che si ritrova staccata
dalle altre.

**Segnando un'ora come svolta si rifanno i documenti di quel corso**: il
verbale di quell'ora, le presenze, la griglia dei voti e la scheda di ogni
PiF che frequenta. Sono gli stessi che dopo ogni lezione sarebbero da
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
— un'ora dimenticata dal docente resta un'ora che si doveva fare. La
**% presenza** è calcolata sulle sole UD in cui l'appello è stato fatto, e dice
quanto la prima è affidabile: con quella sola, un semestre con metà appelli
dimenticati risultava perfetto. Sono due domande diverse e chi legge ha diritto
a tutte e due, purché il foglio dica quale è quale — e lo dice, in fondo, con
le UD previste e quelle già a calendario.

Nel foglio delle presenze c'è anche la riga della classe in fondo — il numero
che si guarda per primo, e che nessuno somma a mente da dodici righe — e le ore
annullate restano fuori dalle ore tenute. Le UD previste sono le stesse per
tutti: il registro non sa quando una PiF si è iscritta, e fingere di saperlo
sarebbe peggio che dire il monte ore del corso. La scheda personale porta le presenze in cifre e
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
2. una pagina che nomina una PiF apre il suo blocco; le pagine seguenti che
   non nominano nessuno appartengono a quel blocco — è così che un documento di
   tre facciate col nome solo in testa resta intero;
3. ne esce una **bozza**, sotto «Da smistare» nel pannello del docente di
   classe: un blocco per documento, con scritto di chi il registro crede che
   sia, e l'anteprima della prima pagina da guardare;
4. si conferma — riga per riga, o tutta in un gesto — e solo allora il pezzo
   viene ritagliato, archiviato col nome che parla e **spuntato** nella consegna
   della persona.

Niente viene archiviato prima di una conferma. Riconoscere un nome è
un'ipotesi, e un documento finito nel fascicolo sbagliato è un errore che
nessuno scopre finché non serve quel documento.

Quel che l'ipotesi non la regge — pagine senza nome, scansioni illeggibili, due
fratelli omonimi — resta nella bozza in attesa di una mano. Per quello c'è
l'**assegnazione a mano**, in fondo a ogni PDF: si dicono le pagine, la PiF e
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
due cose diverse. **Me lo consegnano le PiF** — il certificato, la
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

**Come si consegna** lo dice `modoConsegna`: a mano o per e-mail. A mano si spunta
uno per uno mentre si passa fra i banchi. Per e-mail parte **un messaggio a testa**
— non un'e-mail sola in copia nascosta: il documento è suo, e allegarne
venticinque a un unico messaggio darebbe a ogni famiglia la pagella di tutte le
altre. In testa alla colonna compare «Spedisci (n)»: n è chi ha un documento
pronto e non l'ha ancora ricevuto. Si segna spedito solo quel che è partito
davvero, con gli indirizzi a cui è andato; chi non ha un indirizzo resta
indietro e viene detto per nome.

Fra le pendenze la stessa richiesta si racconta con parole sue: «consegno per e-mail»,
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
`registroDocenti.ocr.attivo` il registro guarda quelle pagine con un modello che
gira sulla macchina — un file `.gguf` scelto nella pagina **Modelli
linguistici** — e cerca il nome in quel che legge. Prima la testata, che è dove
il nome sta e costa metà tempo; la pagina intera solo se lì non è comparso
nessuno della classe.

Sta in locale per lo stesso motivo per cui il pannello non parla con la rete: su
quelle pagine ci sono nomi di minorenni e situazioni di famiglia. È facoltativo,
è lento — decine di secondi per pagina su un portatile — e quel che legge
propone, non decide: la conferma resta a chi guarda. Senza modello non cambia
niente, le scansioni restano in quarantena e si assegnano a mano.

Un modello che *guarda* è l'unico pezzo di questa storia che vuole ancora un
programma esterno: `llama-mtmd-cli`, di llama.cpp. La libreria con cui il
registro fa girare i modelli in casa non accetta immagini — sa parlare, non
vedere — e passare un PNG a un modello locale senza un servizio in mezzo si fa
così. È la stessa forma della dettatura, che chiede `whisper-cli`.

**Quei programmi il registro se li prende da sé.** Alla prima pagina da leggere
e alla prima frase dettata, quel che manca scende in una cartella sua — una
ventina di megabyte per llama.cpp, 580 MB per whisper e il suo modello vocale —
una volta sola, con l'impronta verificata prima di farlo partire e la versione
fissata nel sorgente invece che presa «l'ultima». **Non installa niente lo
stesso**: nessun servizio, nessun PATH toccato, e cancellare quella cartella
riporta la macchina com'era. Chi preferisce fare da sé spegne
`registroDocenti.ocr.scaricoAutomatico` o `registroDocenti.dettatura.scaricoAutomatico`
e scrive i percorsi a mano, che vincono comunque.

I **modelli** no, e la differenza è voluta: quale `.gguf` stia su quella
macchina lì — sei gigabyte che leggono la scrittura a mano, o uno che fatica ma
entra dappertutto — è una decisione, non un passaggio meccanico, e ha la sua
pagina. Il programma invece è sempre lo stesso, e sette passaggi per prenderlo
sono sette passaggi che nessuno fa.

## I modelli del linguaggio

Due cose nel registro chiedono a un modello: l'**assistente**, che risponde a
una domanda scritta in italiano leggendo i dati veri, e la **lettura delle
scansioni**, che cerca un cognome su un foglio fotografato. Tutte e due girano
sulla macchina di chi insegna, e la ragione è sempre quella: su quel che passa
di lì ci sono nomi di minorenni, medie, assenze, a volte una situazione di
famiglia.

Un modello, qui, è **un file**: un `.gguf`, il formato con cui llama.cpp
impacchetta pesi e vocabolario in un pezzo solo. La pagina **Modelli
linguistici** è il posto in cui quel file arriva, e ci arriva in tre modi — i
tre modi in cui chi insegna prende un file:

- **si scarica**, dall'elenco dei quattro consigliati o cercando fra i depositi
  pubblici di Hugging Face. La pagina mostra quanto pesa ciascun taglio prima
  di premere, e mentre scende dice a che punto è e come fermarsi;
- **si trascina** dentro la finestra, se lo si ha già sul disco — scaricato con
  un altro programma, arrivato su una chiavetta;
- **si sceglie** con il dialogo di sistema, per chi il trascinamento non lo usa.

I file stanno accanto alle impostazioni del programma, non nella cartella di
lavoro: pesano gigabyte, e in mezzo al materiale del docente finirebbero in
ogni copia e in ogni sincronizzazione. Chi li tiene già altrove dice al registro
dove sono — `registroDocenti.modelli.cartella` — e li vede tutti senza copiarne
nessuno.

**I due mestieri vogliono due modelli diversi**, e la pagina li sceglie
separatamente: chi conversa deve saper *chiamare gli strumenti* (sotto i tre
miliardi di parametri quella capacità diventa inaffidabile, e il modello
comincia a inventarsi i nomi delle procedure invece di aprirle); chi legge le
scansioni deve saper *guardare*, e sta in due file — i pesi e il proiettore,
l'`mmproj`, senza il quale risponde immaginando.

### Che cosa è cambiato, e perché

Prima di qui c'era [Ollama](https://ollama.com): un servizio da installare,
tenere acceso e riempire con comandi battuti in un terminale. Funzionava, e
chiedeva a chi insegna tre cose che non c'entrano con un registro di classe.
Adesso l'assistente carica il `.gguf` dentro il registro — `node-llama-cpp`, che
è una libreria e non un servitore — e di installato non c'è più niente.

Ci si guadagna anche una difesa. Fin qui la riga più delicata di `dati/llm.ts`
controllava che l'indirizzo del servizio, scritto in un file di impostazioni che
qualunque programma sulla macchina può riscrivere, non mandasse altrove le
scansioni e le medie. Adesso quella riga non serve: **non c'è una richiesta di
rete da dirottare.** Al suo posto c'è una guardia sul nome del modello, che
viene risolto soltanto dentro la cartella dei modelli — un percorso messo a mano
in quel JSON non diventa un file che il registro apre.

L'unica cosa che parla con la rete è lo scarico, e va nella direzione opposta a
quella che preoccupa: porta dentro dei pesi. Di quel che esce da questa macchina
ci sono soltanto le parole battute nella casella di ricerca.

## I file dei dati

Nella cartella dei dati — quella che si sceglie aprendo o creando un anno — c'è
un documento per anno scolastico — un file `.registro` — con accanto la
cartella dei documenti di quell'anno, e in radice il file che dice quale anno è
aperto:

```
registro/
  registro.json         due righe: quale anno è aperto
  2026-2027.registro    i dati dell'anno: un archivio con dentro i JSON di sempre
    registro.json       l'anno, i suoi semestri e le sue pause, le materie, le impostazioni
    classi.json         classi con le loro PiF
    corsi.json          classe × materia: il perno a cui tutto si aggancia
    lezioni.json        lezioni, slot, presenze, osservazioni, consuntivi
    piani-lezione.json  piani lezione, per corso, con le loro risorse
    valutazioni.json    momenti di valutazione con i voti
    fascicoli.json      recapiti, documenti, comunicazioni e periodi di assenze
    consegne.json       compiti e mansioni, con le spunte di chi le ha fatte
    smistamenti.json    i PDF in quarantena, con le pagine ancora da assegnare
    manifesto.json      che cos'è questo file, e di che versione
    .storico/           le copie precedenti di ogni collezione, le ultime dieci
  2026-2027/            i documenti di quell'anno, che si aprono con altri programmi
    archivio/           quel che è stato raccolto: per classe, corso, documento
    esportazioni/       quel che il registro stampa: la stessa struttura, e si può buttare
    in-arrivo/          la cassetta: i PDF di classe da dividere, una cartella per documento
    quarantena/         i PDF con pagine non ancora assegnate
    allegati/ risorse/ assenze/    quel che resta delle disposizioni di prima
  2027-2028.registro
  2027-2028/
    …
```

Il documento è uno ZIP con un'estensione nostra, e questo è il punto: si apre
con un doppio clic — l'installazione lo associa al registro — ma il giorno che
il registro non parte lo apre anche `unzip`, e dentro ci sono i JSON di sempre.
Un formato inventato si legge solo con il programma che lo ha scritto, cioè
proprio quello che non funziona. `.registro` per esteso e non una sigla: un
docente che dopo tre anni ritrova il file deve capire che cos'è senza aprirlo, e
`.reg` — lo script del registro di configurazione di Windows — con un doppio
clic per sbaglio scriverebbe dentro il sistema.

Documento e cartella portano lo stesso nome, ed è quel che li tiene insieme
senza un identificatore scritto da qualche parte che si possa contraddire.
Nel documento va quel che il registro scrive e rilegge da sé; nella cartella
quel che si apre con altri programmi — i PDF perderebbero il doppio clic, a
stare chiusi in un archivio.

Per vedere com'è fatto senza costruirsi un anno, in `prove/campioni/` c'è un
documento con dentro dati inventati — una classe, tre persone in formazione, tre
ore e una verifica, storico compreso. Si rinomina in `.zip` e si guarda dentro.
Lo riapre a ogni giro `prove/dati/campione.test.mjs`, ed è la sola prova che
guarda indietro: le altre scrivono e rileggono con lo stesso codice, e
resterebbero verdi anche se il formato cambiasse in blocco. Si rigenera con
`npm run campione`, e solo quando il formato cambia apposta. I documenti veri
stanno in `registro/`, che è in `.gitignore` per la ragione ovvia: dentro ci
sono nomi, voti e assenze di persone.

Il nome della cartella viene dall'etichetta dell'anno — «2026/2027» diventa
`2026-2027` — e da lì non si muove più: rinominare l'anno non sposta la
cartella, perché una cartella che si rinomina da sola smette di essere dove i
collegamenti dicono che sia, e in una cartella sincronizzata si porta dietro i
conflitti di chi la stava aprendo altrove.

Il documento si apre e si chiude: il registro lo prende all'avvio, lo tiene
finché ci lavora e lo lascia quando esce. Finché è aperto, accanto c'è una
serratura — `.2026-2027.registro.serratura` — che dice quale macchina lo sta
usando. Non impedisce niente, e non potrebbe: su una cartella sincronizzata non
esiste un lucchetto vero. Serve a fare la domanda giusta prima che sia tardi —
«questo anno è aperto sul computer della sala docenti: vuoi aprirlo lo stesso?»
— invece di lasciare due registri che si coprono a vicenda al primo
salvataggio. Una serratura della propria macchina non ferma nessuno: è quel che
resta di un registro chiuso male.

**Senza un anno aperto** — al primo avvio, o dopo aver chiuso il documento — al
posto della finestra si apre la pagina di benvenuto (`guscio/benvenuto.html`):
le due strade, «Apri un anno…» e «Crea un nuovo anno…», e sotto l'elenco dei
documenti già visti. I preferiti in cima e i recenti sotto, con la cartella di
ognuno, perché due anni possono chiamarsi uguale; la stella tiene da parte —
i preferiti non scadono, i recenti sono dodici — e la croce toglie la riga senza
toccare il file. Prima c'erano tre pulsanti di sistema, che chiedevano *come*
cominciare quando dal secondo anno in poi la domanda è *quale* riaprire.

**«Chiudi l'anno»** — nel menu File e nelle impostazioni, sotto «Anni del
registro» — scrive l'ultimo salvataggio, lascia il documento libero e riporta al
benvenuto. Serve tutte le volte che il file deve restare libero: una cartella da
far salire su OneDrive, una copia da portare via, l'anno rimasto aperto a casa
che si vuole riprendere da scuola. Il documento chiuso si dimentica anche come
ultimo aperto — chi chiude non vuole ritrovarselo davanti al prossimo avvio —
ma resta fra i recenti, e riaprirlo è un clic.

I percorsi salvati dentro i JSON — `archivio/DIC4a/…`, `allegati/…` — sono
relativi alla cartella dell'anno, non alla radice. È per questo che un anno si
può spostare, rinominare o consegnare a qualcun altro senza che nulla dentro si
rompa.

**Chi viene dalla disposizione di prima** non deve fare niente: alla prima
apertura il registro fa i due traslochi da solo — prima divide per anno i file
che stavano tutti insieme, seguendo le classi, poi impacchetta i JSON di ogni
anno nel suo documento e manda nel cestino la cartella `dati/` di prima. Quel
che non si sa a quale anno assegnare finisce nell'anno aperto — mai perso, mai
lasciato indietro — e i file vecchi vanno nel cestino, non cancellati: è il
momento in cui si potrebbe scoprire che qualcosa non è passato, ed è l'unica
copia di com'era. Lo fa una volta, senza chiedere: chiedere
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
          DIC4a_Schede PiF_Rossi Mario_1° semestre.pdf
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

Presenze e schede PiF stavano dalla parte sbagliata. Contavano le ore di
tutta la classe — due materie sommate insieme — e finivano in
`docente-di-classe/` insieme alle pagelle. Ma le ore sono di un insegnamento:
una PiF può mancare al laboratorio e non al calcolo professionale, e una
percentuale che le somma non è vera per nessuna delle due. Adesso sono del
corso, nel contenuto e nella cartella, e si stampano dalla vista **Corsi**, che
è dove si sceglie di quale materia si sta parlando. Il fascicolo resta della
classe: i corsi li attraversa per mestiere.

Le stampe già fatte si spostano da sole alla prima apertura, per le classi che
portano un corso solo. Dove ce n'erano due il file vecchio parlava davvero di
tutte e due, e infilarlo sotto una delle due lo farebbe leggere come se fosse
suo: quelli restano dov'erano, e la prossima stampa esce già al posto giusto.

Il nome del file ripete quel che dicono le cartelle — classe, documento,
persona — apposta. Un file dall'archivio esce di continuo: lo si allega a una
e-mail, lo si copia sul desktop, lo si manda in segreteria, e fuori dalle sue
cartelle un «Rossi Mario.pdf» non dice più di che classe è né di che cosa
parla.

Prima erano cartelle piatte con nomi fatti di identificatori. Il registro ci si
ritrovava benissimo; una persona no, e quella cartella la si apre da fuori — si
cerca il documento di una PiF, si allega una pagella a un'e-mail, si consegna
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
campo mancante o di tipo sbagliato non fa cadere l'applicazione — e nemmeno una
versione precedente del formato: la conversione avviene in lettura e i file si
riscrivono una volta sola, da soli. Un JSON che non si legge proprio — una
parentesi persa correggendolo a mano — non viene coperto: si dice, quella
collezione resta vuota per quella sessione, e alla prima modifica il file
rotto viene messo da parte con un altro nome invece di essere sovrascritto.

Le scritture sono incrementali: le voci nuove si accodano in fondo al file, poi
l'indice, poi la coda — si scrive quanto la modifica e non quanto il documento,
e i byte di prima non si toccano. È anche il modo di essere atomici senza
copiare niente: la coda che nomina le voci nuove è l'ultima cosa che si scrive,
e finché non c'è vale ancora quella di prima, che punta a voci tutte al loro
posto. Un salvataggio interrotto lascia dunque il documento di prima, intero.
Il prezzo è lo spazio morto — le versioni vecchie restano nel file — e quando
supera un terzo del documento si riscrive tutto da capo, con il temporaneo e la
rinomina di sempre. Prima di riscrivere una collezione, la copia di com'era finisce in
`.storico/`, dentro lo stesso documento, dove restano le ultime dieci per
collezione. Costa poco — dieci versioni dello stesso JSON dentro uno ZIP si
comprimono quasi a niente — e ripaga la prima volta che si vuole sapere che cosa
c'era ieri, o quando due macchine hanno scritto insieme sulla stessa cartella
sincronizzata. Sta dentro il documento e non accanto: un anno resta un file
solo anche con il suo passato dentro, e chi lo copia su una chiavetta se lo
porta via.

Il documento si riscrive per intero a ogni salvataggio — uno ZIP non si aggiorna
in una voce sola — ma non si *ricomprime* per intero: ogni voce si porta dietro
il proprio blocco già compresso, e alla riscrittura torna in fila così com'è.
Solo la collezione che è cambiata passa da `deflate`. È la differenza fra
quaranta millisecondi e tre: nove decimi di un documento sono lo storico, che
una volta scritto non cambia più, e ricomprimerlo a ogni tasto premuto era tutto
il costo di un salvataggio. Per la stessa ragione l'apertura non decomprime
niente che non venga chiesto: le collezioni sì, le copie dello storico solo
quando qualcuno le va a cercare.

Le collezioni si comprimono al livello intermedio e lo storico al massimo: sulle
prime il livello massimo guadagna novecento byte e costa tre millisecondi a ogni
riscrittura, sul secondo si paga una volta e risparmia otto kilobyte a ogni
sincronizzazione che verrà.

Il ritardo prima di scrivere è di un terzo di secondo dall'ultima modifica —
quanto basta a raccogliere una frase battuta a macchina in una scrittura sola —
e comunque non più di due secondi dalla prima modifica non ancora salvata: senza
quel tetto, chi scrive un consuntivo lungo senza mai fermarsi resterebbe con
tutto in memoria fino alla fine. La compressione avviene fuori dal thread che
disegna le finestre, così il registro resta reattivo mentre salva. E prima di
toccare il disco il registro confronta quel che ha in mano con quel che ha
scritto per ultimo: un anno consultato e non modificato non produce nessuna
sincronizzazione.

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

```bash
npm run sviluppo        # il modo di lavoro: vedi sotto
npm run build           # una compilazione in dist/
npm run avvia           # compila e lancia, senza ascolto
npm run controllo-tipi  # tsc --noEmit
npm test                # le prove
npm run pacchetto       # installer e versione portabile in pacchetti/
```

`npm run sviluppo` è il comando con cui si lavora. Tiene insieme tre cose:
esbuild in ascolto su tutti i bundle, l'applicazione avviata, e il
ricaricamento — che non è uno solo, ed è la ragione per cui vale la pena
descriverlo:

- **le pagine si ricaricano**, in un decimo di secondo, quando cambia una vista,
  un foglio di stile o una pagina nativa. La finestra resta aperta, l'archivio
  resta caricato, e la pagina richiede lo stato da sé appena torna in piedi;
- **l'applicazione si riavvia** quando cambia il main process o il preload —
  codice che non si può ricaricare a caldo. Costa un secondo e mezzo, e la
  cartella di lavoro se la ricorda, quindi si riparte da dov'era.

Che cosa fa scattare cosa lo dice il campo `ricarica` sulle configurazioni in
`esbuild.mjs`: non c'è un secondo elenco da tenere allineato.

Un bundle che non compila non fa riavviare niente: resta in piedi quello di
prima, l'errore si legge nel terminale, e al salvataggio dopo si riprende.

### Le cartelle della build

`dist/` sono i bundle dell'applicazione, ed è quel che finisce nel pacchetto.
`dist-prove/` sono gli stessi sorgenti ricompilati in una forma che Node sa
importare — ESM, con `electron` sostituito dal finto di `prove/aiuti/finto-electron.mjs`
— e servono solo a `npm test`.

### I cinque controlli scritti in casa

Oltre a `tsc` e a ESLint, il progetto verifica a macchina cinque regole che un
type-checker non sa vedere. Non sono un ornamento: sono il modo in cui le regole
d'architettura restano vere, perché *una regola che nessuno controlla dura fino
al prossimo import comodo*.

```bash
npm run strati       # nessun import attraversa un confine fra strati, e nessun ciclo
npm run censimento   # export che non chiama nessuno
npm run collezioni   # nessuna scrittura tocca una raccolta che non dichiara
npm run moduli       # ogni campo dichiarato in un modulo viene raccolto al salvataggio
npm run pulsanti     # nessun comando si disegna senza dire che cosa fa
```

Escono con un codice diverso da zero quando trovano qualcosa, e li fa girare
anche `.github/workflows/verifica.yml` a ogni push.

## Il condotto, e il registro da terminale

Il registro sa farsi pilotare da fuori. Si accende con l'impostazione
`registroDocenti.api.condotto`, e da quel momento ascolta JSON-RPC su una pipe
nominata (Windows) o un socket Unix — mai su una porta di rete, e mai fuori
dall'utente che l'ha acceso.

**Quanto si concede è una seconda decisione.** Sotto l'interruttore generale
stanno `registroDocenti.api.lettura`, accesa di suo, e
`registroDocenti.api.scrittura`, spenta: acceso il condotto e basta, si guarda
e non si tocca. Il confine passa sul `genere` che ogni procedura dichiara —
`lettura` o `scrittura` — e non c'è un secondo elenco da tenere allineato: una
procedura di scrittura chiamata senza quel permesso torna `non-permesso` prima
ancora di essere convalidata. Nella pagina delle impostazioni le due voci si
disabilitano e si mostrano spente finché il generale lo è, perché una casella
spuntata sotto un interruttore spento direbbe che qualcosa è concesso quando
non lo è. `regdoc stato` dice che cosa vale adesso.

```bash
regdoc elenco                    # tutte le procedure che sa fare
regdoc schema ore.appello.casella
regdoc chiama ore.appello.casella --lezioneId lez-… --allievoId alv-… --ud 0 --stato assente
```

`regdoc` **c'è senza che nessuno lo installi**: il registro lo scrive da sé a
ogni avvio — `guscio/comandoRiga.ts` — in una cartella che aggiunge al PATH
dell'utente, su Windows, Linux e macOS. Dentro c'è un ponte di cinque righe che
lancia `src/cli/registro.mjs` con l'eseguibile del registro e
`ELECTRON_RUN_AS_NODE`: Node non serve che sia installato, perché Electron lo è
già. Riscritto a ogni avvio, segue l'applicazione quando la si sposta o la si
aggiorna. Nel portable non si scrive — quello gira da una cartella temporanea, e
un ponte che la indica è rotto appena il registro si chiude. Dal repository
resta `npm run registro -- elenco`, che fa la stessa cosa.

Il primo terminale aperto **dopo** il primo avvio è quello che vede il comando:
il PATH lo leggono i processi quando nascono.

La riga di comando è **nuda per scelta**: solo moduli `node:`, nessuna
dipendenza, nessuna compilazione. Non conosce le procedure — le chiede al
condotto con `$elenco` e `$schema` — e quindi non invecchia: una procedura
aggiunta stamattina si chiama da lì stasera senza che quel file cambi di una
riga. È anche la proprietà per cui si avvia quando la costruzione del registro
è rotta, che è esattamente il momento in cui serve.

Il contratto per intero — le procedure, i tre trasporti, i codici d'errore —
è in [docs/API.md](API.md).

## Proiettare per la classe

Il registro sta su uno schermo, la classe ne guarda un altro. `Registro:
proietta per la classe` — o il pulsante **Proietta** in fondo alla barra di
navigazione — apre una seconda finestra. Con «proiezione: schermo intero» accesa
nelle Impostazioni, il registro la mette da sé sul secondo schermo e la allarga:
non c'è niente da trascinare. Da lì in poi segue il registro: si apre un'ora nel pannello, e
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

Gli ultimi tre parlano delle singole PiF, e per questo partono **spenti** —
si riconoscono dal bordo tratteggiato, e accesi la fascia diventa gialla e dice
che cosa sta sullo schermo. La ragione è che la proiezione segue il registro:
senza questa partenza, aprire l'ora dopo mentre lo schermo è acceso porterebbe
i voti dell'ultima verifica davanti alla classe senza che nessuno l'abbia
chiesto.

Un interruttore a parte decide se accanto ai voti e ai documenti mancanti ci
vanno i **nomi**. Spento — com'è di suo — una verifica si vede come è andata la
classe: media, quanti sufficienti, la colonnina per fascia. Acceso, compare la
colonna per PiF. L'appello i nomi ce li ha comunque: senza, non
correggerebbe niente, ed è proprio la classe a doverlo correggere.

**Pausa** spegne il contenuto lasciando la finestra dov'è: serve nel mezzo
dell'ora, quando si passa a scrivere qualcosa che non deve essere letto. In
pausa i dati non escono nemmeno dall'applicazione — il messaggio che parte è
vuoto — e riprendendo si ritrova tutto com'era.

Un blocco spento non è un blocco nascosto dal foglio di stile: non finisce
proprio nel messaggio che raggiunge l'altra finestra. Il filtro sta in
`dominio/proiezione.ts`, in un posto solo, e le prove che lo tengono sono in
`prove/dominio/proiezione.test.mjs`.

## L'icona accanto all'orologio

Il registro tiene un'icona nel vassoio di sistema, e il suo menu è l'anno visto
da fuori: in testa l'ora in corso e quella su cui andare, poi un corso per riga,
e dentro ogni corso le sue ore divise in **In corso**, **Da chiudere**,
**Prossime**, **Svolte**, **Annullate**. Il numero fra parentesi è quello vero
anche quando le righe sono meno: un menu di sessanta voci non si legge, e per
vederle tutte c'è «Apri il corso».

I segni sono sei e sempre gli stessi: `▶` l'ora che sta succedendo, `⚠` un
registro rimasto aperto, `✓` un'ora a posto, `○` una futura senza piano, `·` una
futura preparata, `×` una annullata. Il segno davanti al corso è quello della sua
ora più urgente. Accanto a ogni ora c'è il *perché* — «senza appello», «non
segnata svolta», «senza piano», «2 assenti» — perché sono buchi diversi che si
chiudono in posti diversi.

**Questo cambia come si chiude il registro.** La X mette via la finestra e
l'applicazione resta accesa nell'icona: un docente il registro lo apre venti
volte al giorno per trenta secondi, e chiuderlo davvero a ogni giro vorrebbe
dire rileggere i JSON venti volte. L'uscita vera è «Esci dal registro», in fondo
al menu dell'icona, e passa dallo stesso spegnimento della X di prima —
l'ultimo salvataggio si aspetta. La prima volta che la X non chiude, una
notifica lo dice: taciuta, diventerebbe «il registro non si chiude più».

Chi preferisce la X di sempre spegne `vassoio.chiusuraNelVassoio`; chi non vuole
l'icona spegne `vassoio.attivo`, e allora la X torna a chiudere l'applicazione da
sé — un'applicazione viva senza finestre *e* senza icona non si riprende più.

Il codice sta in tre pezzi che non si conoscono: `src/dominio/vassoio.ts` decide
che cosa scrivere e si prova con `node --test`, `src/vassoio.ts` guarda
l'orologio e l'archivio, `src/ambiente/vassoio.ts` traduce in menu di Electron.
È la stessa divisione dei promemoria, e per la stessa ragione.

## L'agenda sul desktop

Un riquadro appoggiato sul desktop, con dentro **tre schede** che rispondono a
tre domande diverse. `⌂` apre il registro, `✕` lo toglie dal desktop, e la
linguetta scelta si ricorda fra un avvio e l'altro.

| Scheda | La domanda | Che cosa mostra |
| --- | --- | --- |
| **Calendario** | dove devo essere | il mese in griglia — un pallino sui giorni con lezione, rosso dove è rimasto un buco — e sotto la settimana, un giorno per riga con orario, classe, materia e aula. Si preme una casella del mese per saltarci, un'ora per aprirla nel registro; le frecce scorrono le settimane, `oggi` torna a questa |
| **Pendenze** | sono indietro? | in cima le ore rimaste aperte, dalla più vecchia, con il perché — «senza appello», «non segnata svolta»; sotto, classe per classe, il lavoro che aspetta, con le stesse tipologie e gli stessi conti della pagina Todo |
| **Lezione** | che cosa sto facendo | l'ora di adesso, e **da qui la si tiene**: l'appello riga per riga, l'argomento da battere a macchina, «fatta» che la segna svolta. Le frecce vanno all'ora prima e a quella dopo, per tornare a chiudere quella di ieri |

Le linguette portano i loro numeri anche da spente — quante cose aspettano,
quante persone mancano ancora all'appello dell'ora in corso — ed è metà del
motivo per cui vale la pena tenere la striscia accesa. Sotto le tre celle di
larghezza restano i soli segni: tre parole tagliate a metà sono peggio di tre
simboli.

**La scheda «lezione» scrive, e scrive dal posto di sempre.** L'appello, i testi
dell'ora e lo stato passano da `esegui` — lo stesso centralino del pannello, con
le stesse convalide. Il widget è una seconda porta sullo stesso registro, non un
secondo registro: le righe dell'appello si allungano da sé quando l'ora cambia
durata e comprendono chi si è iscritto a metà anno, perché a scriverle è
`azioni/ore.ts`, come per il registro aperto. Premendo una riga si gira fra
presente, assente, in ritardo, esonerato e «da fare», che è l'ordine in cui si fa
un appello guardando la classe invece dello schermo.

**Sta sotto le applicazioni, e non prende il fuoco.** La finestra non si attiva
(`WS_EX_NOACTIVATE`): premere un'ora non toglie il cursore da dove si stava
scrivendo e non porta il widget davanti alla finestra da cui lo si è premuto.
Il suo piano è subito sopra il desktop — `SetWindowPos` con il desktop come
riferimento, rifatto a ogni evento e una volta al secondo — così qualunque
finestra gli passa sopra e lui resta dov'è.

**Due modi di stare sul desktop**, e la differenza è una sola impostazione,
`agenda.ancorata`:

| | Libero (predefinito) | Agganciato |
| --- | --- | --- |
| Dove sta | dove lo si trascina, preso per la testata | incollato al bordo destro |
| Icone del desktop | restano dove sono | gli fanno posto |
| Finestre massimizzate | ci passano sopra | si fermano al suo bordo |
| Win+D | resta al suo piano, sopra il desktop | non lo tocca: è una barra di sistema |

L'agganciato è una *appbar*, lo stesso meccanismo con cui la barra delle
applicazioni si riserva il proprio bordo: la fetta che si prende esce dall'area
di lavoro, e l'area di lavoro è proprio ciò dentro cui Windows dispone le icone
e massimizza le finestre. È l'unico modo di spostare le icone, e costa il
posto: un'area di lavoro è un rettangolo, e un buco in mezzo allo schermo non si
può descrivere.

**Si ridimensiona e si sposta sulla griglia delle icone.** Bordo sinistro per la
larghezza, bordo di sotto per l'altezza, testata per spostarlo: tutto scatta di
cella in cella — la stessa griglia su cui il desktop dispone le icone, chiesta a
Windows con `SPI_ICONHORIZONTALSPACING`. È la ragione per cui il widget sembra
parte della scrivania invece di un foglietto appiccicato sopra. Il piè di pagina
dice quanto è grande — «4 × 9 celle» — e misura e posto si ricordano fra un
avvio e l'altro. Nel modo agganciato, l'altezza trascinata fino in fondo torna
alla striscia intera.

Si accende dal menu, `Registro ▸ Vai a ▸ Agenda sul desktop`, con `ctrl+alt+a`,
o dalla spunta nel menu dell'icona accanto all'orologio — che è il posto dove si
va a cercarla, perché l'agenda si guarda proprio quando il registro non è
aperto. Lo stesso interruttore la spegne, e resta accesa fra un avvio e l'altro
finché non la si chiude con la sua `✕`.

**L'anno, e quando manca.** La settimana mostrata non è cieca rispetto al
documento aperto: fuori dall'anno scolastico — a luglio, in agosto — l'agenda si
apre sulla prima settimana dell'anno o sull'ultima invece di mostrare cinque
giorni vuoti, e lo dice («l'anno scolastico comincia più avanti», «l'anno
scolastico è finito»). Senza nessun documento aperto non resta vuota: spiega che
manca e offre **Apri un registro…**, che è lo stesso dialogo del menu. Aprendo un
altro anno, la settimana torna da sé a quella giusta.

**Solo su Windows.** L'aggancio è `SHAppBarMessage` e il resto `SetWindowPos`,
che Electron non espone: passano da `koffi`, l'unica dipendenza nativa del
progetto — binari già pronti, nessun compilatore. Altrove il comando lo dice e
non succede nient'altro.

Il codice sta nei soliti tre pezzi che non si conoscono:
`src/dominio/agenda.ts` costruisce la settimana, decide da che settimana
partire e fa i conti della griglia — e accanto a lui `agendaMese.ts`,
`agendaPendenze.ts` e `agendaLezione.ts` fanno la griglia del mese e le altre
due schede; tutti e quattro si provano con `node --test`;
`src/agenda.ts` guarda l'orologio e l'archivio; `src/ambiente/agenda.ts` fa la
finestra, e sotto di lui `src/ambiente/ancoraggio.ts` parla con Windows. La
pagina è `guscio/agenda.html`.

Tre avvertenze che stanno nel codice e vale la pena ripetere. La riserva
dell'agganciato va tolta all'uscita — una appbar registrata e mai rimossa lascia
il desktop con una colonna vuota che non si riprende più — e ci pensa
`spegni()`. La finestra si sposta con `SetWindowPos` e non con `setBounds`:
Electron riporta dentro l'area di lavoro le finestre che ne escono, e qui la
finestra ne deve stare fuori per mestiere. E `movable: false` non si può usare
per impedire che la si trascini: con quella opzione è Electron stesso a rimettere
la finestra dove crede, cioè a disfare il lavoro dell'ancoraggio.

## Partire con il computer

Due impostazioni, che sono due domande diverse.

`avvio.conWindows` accende il registro insieme al computer: scrive la voce
d'avvio di Windows (`app.setLoginItemSettings`) e la rilancia con
`--avvio-silenzioso`. Vale solo per l'applicazione installata — in sviluppo
l'eseguibile è un `electron.exe` dentro `node_modules`, e registrarlo vorrebbe
dire lasciare nel sistema un residuo che poi nessuno collega più a niente.

`avvio.soloVassoio` fa partire il registro senza aprire nessuna finestra, anche
lanciandolo a mano: si trovano l'icona accanto all'orologio e l'agenda sul
desktop, e la finestra si apre quando la si chiede. È il modo in cui lo tiene
chi lo lascia acceso tutto il giorno.

Una regola le tiene insieme: se non resta *niente* da premere — né icona nel
vassoio né agenda accesa — la finestra si apre lo stesso. Un'applicazione viva e
invisibile non si riprende più, e sarebbe l'unico modo di rompere davvero
l'avvio automatico.

## Impostazioni

Una pagina sola, e la prima cosa che si sceglie è **di chi** sono le
impostazioni che si stanno guardando. I due pulsanti stanno nella riga delle
azioni, accanto a tutto il resto che in quella pagina si può fare:

| | **Programma** | **Registro** |
| --- | --- | --- |
| Dove finisce il valore | `impostazioni.json` in `userData` | dentro il `.registro` dell'anno |
| Per chi vale | questo computer, tutti i documenti | quel documento, ovunque lo si apra |
| Che cosa c'è | tema, agenda sul desktop, icona accanto all'orologio, avvisi, posta, lettura delle scansioni, cartella dei dati | anno e semestri, chiusure, settimane A/B, griglia oraria, scala dei voti, materie, file |

Non è una divisione estetica: è l'unica cosa che lì si può sbagliare senza
accorgersene. Cambiare la scala dei voti vuol dire cambiarla per chiunque apra
quel documento, anche fra due anni; cambiare il tema non esce da questa
macchina. Mescolate in un elenco solo — come stavano prima, metà nel pannello e
metà in una finestra nativa — le due cose si distinguevano solo sapendolo già.

Il secondo livello sono gli argomenti, nella colonna di sinistra, ognuno con il
suo riassunto: cinque sezioni per il documento, sei per il programma. Le sezioni
del programma portano accanto al nome **quante impostazioni sono state decise a
mano**, che è la sola cosa che si cerca aprendo le impostazioni dopo sei mesi.

Ogni riga del programma dice il nome a parole, la chiave per esteso — è quella
che compare negli errori e nella guida — e se il valore è il predefinito o è
stato scritto. Una riga modificata dice anche *da che cosa*, e si ritira: da
sola con **Ritira**, o tutta la sezione con **Ripristina**. Le impostazioni del
documento si salvano appena si tocca il campo, e se l'host corregge qualcosa in
silenzio — un'ora vuota, una pausa troppo corta — la notifica lo dice invece di
annunciare «salvate».

La finestra nativa delle impostazioni resta, e serve ancora: senza un documento
aperto il pannello non c'è. Mostra le stesse voci, in un elenco filtrabile, e
rimanda alla pagina con «Apri nel registro».

### Le chiavi del programma

Sono trentanove, e l'elenco completo — chiave, tipo, predefinito, descrizione —
sta in [docs/CATALOGO.md](CATALOGO.md). Qui non si ricopia: una tabella
scritta a mano accanto a una generata è una seconda verità, e questa lo era
diventata — elencava diciotto chiavi, due delle quali non esistevano più e
undici delle quali non c'erano mai entrate.

L'elenco vero è `src/manifesto.ts`, che è l'unico: la pagina, la finestra nativa
e i valori predefiniti nascono tutti di lì. Ogni chiave finisce in una sezione e
in una sola, e quel che nessuna sezione nomina finisce in «File e apertura» —
così un'impostazione aggiunta domani compare comunque, invece di esistere senza
vedersi. Lo prova `prove/interfaccia/sezioniImpostazioni.test.mjs`, che è la sola
cosa di quella pagina che può rompersi in silenzio.

Tutto il resto — orari della griglia, giorni visibili, scala dei voti, durate
predefinite — appartiene all'anno scolastico e si cambia dalla scheda
**Registro**, che scrive dentro il documento dell'anno aperto. Così viaggia con
il file: chi lo apre su un'altra macchina trova la stessa griglia, e un anno
chiuso resta leggibile con le regole con cui è stato scritto.

Anche quale anno sia aperto sta nel documento e non fra queste chiavi, per lo
stesso motivo.

## Comandi

Ventuno, e l'elenco per intero — con l'identificativo di ognuno e la
scorciatoia dove c'è — sta in [docs/CATALOGO.md](CATALOGO.md) § 4. Come per
le impostazioni, la fonte unica è `src/manifesto.ts`: una copia qui accanto
diventa falsa al primo comando aggiunto, ed era già successo (questo elenco ne
contava sedici, fra cui uno che non esiste).

Cinque hanno una scorciatoia, e sono quelle che si premono ogni giorno:
`ctrl+alt+r` apre il registro, `ctrl+alt+t` va a oggi, `ctrl+alt+n` comincia
una lezione nuova, `ctrl+alt+a` accende o spegne l'agenda sul desktop,
`ctrl+,` apre le impostazioni.

## Scorciatoie nell'uso

- Il Cruscotto è la schermata d'apertura: una tabella per semestre, una colonna
  per corso, e in ogni cella i segni di quel che manca a quell'ora.
- La sidebar porta tutte le destinazioni, raggruppate per sezione e con la pagina
  corrente evidenziata. Il pulsante in alto a sinistra la riduce alle sole icone
  cliccabili per allargare il contenuto. Nelle finestre strette parte compatta
  e torna alle icone dopo la scelta; i nomi restano disponibili al passaggio del mouse.
  Corso, classe, anno e periodo si scelgono dalla barra superiore.
- Sotto, la riga delle azioni mostra soltanto quel che si può fare nella pagina
  aperta. Si nasconde con `ctrl+b` quando lo schermo è piccolo, e i comandi
  restano raggiungibili con `ctrl+k`.
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
  testa alla riga su tutta l'ora di una PiF; «Tutti presenti» riempie
  l'intera matrice e «Azzera» la riporta tutta a non impostata — e lo chiede
  prima, perché è l'unico gesto della pagina che cancella un'ora di lavoro.
- Quel che si scrive resta scritto anche se il pannello si ridisegna sotto le
  dita: l'orologio del registro batte ogni minuto, e prima aspetta che il campo
  in cui si sta scrivendo venga lasciato.
- Una classe si duplica nell'anno nuovo dalla sua scheda: si scelgono anno e
  nome, e con lei passano le PiF e i corsi che le si insegnavano.
