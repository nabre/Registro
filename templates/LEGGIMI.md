# I modelli dei rapporti

> **Questa è la copia di serie**, quella che viaggia dentro il programma:
> `npm run templates` la traduce in `src/dati/modelliPredefiniti.ts`, e il
> registro la scrive nella cartella del docente quando lì non c'è ancora
> niente. I modelli che contano sono quelli in `templates/` **accanto al
> documento dell'anno**: comandano sempre loro, e si modificano dalla pagina
> «Modelli» del registro. Quel che segue descrive il formato, e vale per tutte
> e due.

Ogni rapporto che il registro stampa in PDF — il verbale di un'ora, il piano
lezione, le valutazioni, le presenze, il fascicolo di classe, la scheda di una
persona in formazione, la scheda di una singola prova — è composto da un file di questa
cartella. Sono file di testo: si
aprono con qualunque editor, si modificano a mano e valgono dal salvataggio
successivo, senza ricompilare né riavviare niente.

**Il posto da cui si modificano è il registro stesso: la pagina «Modelli»,
sotto «Il programma».** Ha l'elenco di questi file con la riga che dice a che
cosa serve ognuno, l'editor, l'elenco dei nomi che quel rapporto sa riempire —
da premere per incollarli — e due cose che da un editor di testo non si hanno:
i problemi segnalati riga per riga *mentre* si scrive, e «Prova», che compone
il foglio con i dati veri del registro e lo mostra senza scrivere niente. Il
registro non si ferma mai su un modello storto — salta la riga che non capisce
e stampa il resto — e quindi un refuso, da fuori, si scopre soltanto guardando
un PDF a cui manca qualcosa.

Questa cartella resta quel che è: chi preferisce lavorarci con il proprio
editor lo fa, e comanda sempre quel che c'è su disco. Il documento qui sotto
descrive il formato, e vale per tutti e due i modi.

I file che cominciano con il trattino basso non sono rapporti: sono i quattro
strati che stanno sotto tutti gli altri.

**Intestazione e piè di pagina stanno in `_base.tpl`.** Tutti gli altri modelli
lo estendono, e cambiando quel file cambiano tutti i rapporti insieme. È il
motivo per cui esiste: prima ogni rapporto se la scriveva da sé, e due
documenti affiancati non si somigliavano perché nessuno li aveva mai messi
affianco.

**Le misure stanno in `_stile.tpl`.** Quanto è grande il foglio, quanto è
grande la scrittura, come si spartisce la larghezza fra le colonne di una
tabella. Stava dentro il codice, e cambiarlo voleva dire ricompilare — cioè non
cambiarlo mai. Ma «esce troppo piccolo per leggerlo», «questa tabella non ci
sta in larghezza» e «in sede si stampa in A3» sono cose che si scoprono
usando i rapporti, non scrivendoli.

**Le parole stanno in `_testi.tpl`.** Le frasi che contengono un numero — «4
caselle non impostate», la nota che spiega come sono calcolate le percentuali —
e come si chiamano le colonne delle tabelle. Erano dentro il codice, mescolate
ai conti che le producono; ma «dillo in un altro modo» non è «contalo in un
altro modo», e la prima non deve costare una ricompilazione.

**I pezzi interi stanno in `_blocchi.tpl`.** Quel che più rapporti si
scrivevano uguale: l'apertura — titolo, sottotitolo, lo stacco — era ricopiata
in tutti e sette, la griglia dell'appello con la sua legenda in due. Un rapporto
ne richiama uno con `usa: nome`. Due copie della stessa cosa sono due occasioni
di dire cose diverse, e la seconda si dimentica sempre.

**La firma delle e-mail sta in `_firma.html`.** Non è un modello di rapporto: è
quel che il registro mette in fondo a ogni messaggio che spedisce — le
comunicazioni alla classe, le richieste di firma alle aziende, i documenti
mandati a una persona in formazione. Sta qui e non fra le impostazioni perché è la stessa
specie di cosa delle intestazioni: un pezzo di testo che si scrive una volta e
si corregge a mano quando cambia un numero di telefono. È HTML, e con una firma
in HTML tutta l'e-mail parte in HTML; svuotando il file l'e-mail parte senza
firma.

Sono quattro file e non uno perché si toccano per motivi diversi: in `_base` si
cambia *che cosa* c'è scritto in testata, in `_stile` *quanto è grande*, in
`_testi` *come lo si dice*, in `_blocchi` *quel che si ripete*. `_stile`,
`_testi` e `_blocchi` stanno sotto tutti anche senza che nessuno li nomini — non
dicono niente su che cosa un singolo rapporto contiene, e non possono cambiare
un foglio a sorpresa.

## Com'è fatto un modello

```
titolo: Verbale della lezione
estende: _base
orientamento: verticale        verticale | orizzontale
margini: 20 18 18 18           alto destra basso sinistra, in millimetri
scala: 1.15                    una misura di stile, valida per questo solo rapporto

[intestazione]
riga: {{classe}} | | {{anno}}

[piede]
riga: {{titolo}} | | pagina {{pagina}} di {{pagine}}

[corpo]
titolo: {{titolo}}
sezione: Presenze
tabella: presenze
```

Una riga è sempre `direttiva: contenuto`. Il cancelletto a inizio riga è un
commento. Una riga che non si capisce viene saltata, e rovina quella riga
soltanto: un refuso non impedisce al rapporto di uscire — e al posto di quel
che non si è capito vale il valore dello strato di sotto.

### Il nero e i capitoli

Due regole che valgono per tutti i rapporti e che non si dichiarano da nessuna
parte, perché non sono scelte di un modello:

**Il testo è tutto nero.** Un rapporto esce da una stampante che non si sceglie
— quella della sede, in bianco e nero, spesso con il toner agli sgoccioli — e un
grigio al 45% è una riga che si legge peggio delle altre senza che nessuno abbia
deciso che contasse meno. Le gerarchie si fanno con il corpo e con il grassetto,
che sopravvivono a qualunque fotocopia. Il grigio resta ai fili e ai fondi.

**Un capitolo non comincia in fondo alla pagina.** Prima di ogni `sezione:` si
misura quanto occupa quel che le sta sotto: se è corto e non ci sta, si volta
pagina e comincia in cima; se è lungo — una tabella di trenta righe non sta in
nessuna pagina — comincia qui e continua di là, ma mai con meno di quattro righe
sotto il suo titolo.

### Le misure del foglio

Stanno in `_stile.tpl`, sotto `[stile]`, e valgono per tutti i rapporti. Le
stesse righe si possono scrivere in testa a un singolo modello — accanto al
titolo, senza aprire nessuna sezione — e lì valgono per lui soltanto: è quel
che fa `valutazioni-classe.tpl` con l'orientamento.

| Direttiva | Che cosa fa |
|---|---|
| `formato:` | il foglio in mm, da diritto: `a3` `a4` `a5` `letter` `legal`, oppure `210x297` |
| `orientamento:` | `verticale` o `orizzontale`: gira il foglio, non lo cambia |
| `margini:` | alto destra basso sinistra, in millimetri |
| `corpo:` | i sei corpi in punti: `titolo=17; sottotitolo=11; sezione=12; testo=9.5; piccolo=8; banda=8.5` |
| `scala:` | moltiplica tutti i corpi insieme, da 0.3 a 3 |
| `interlinea:` | l'altezza di una riga di tabella, in multipli del suo corpo |
| `colonne:` | `adatta` (larghezza dal contenuto) o `uguali` (solo dai pesi) |
| `corpo-minimo-tabella:` | fin dove una tabella può rimpicciolire per non troncare; `0` non rimpicciolisce |

Di `corpo:` si scrivono solo le voci che si vogliono cambiare: le altre restano
quelle di sotto.

**`scala:` è la manopola da toccare per prima.** «Tutto un po' più grande» è la
richiesta vera, e ritoccare cinque numeri a mano tenendo i rapporti fra loro è
un lavoro che sbaglia chiunque. `1.15` è una stampa che si legge a braccio
teso, `0.9` fa stare una lista lunga in una pagina sola.

**Le tabelle si dimensionano su quel che contengono.** Con `colonne: adatta`
ogni colonna chiede quel che le serve, e l'avanzo va a quelle che pesano di
più: è lì che i pesi servono davvero. Se non ci stanno, prima si prova a
scrivere più piccolo — fino a `corpo-minimo-tabella` — e solo dopo si stringe,
togliendo a chi è largo e lasciando intere le colonne corte. Con `uguali` si
torna alla spartizione di prima, che il contenuto non guarda: la colonna della
data prende lo stesso spazio di quella dei nomi, e i nomi escono «Ros...».

### Le direttive del corpo

| Direttiva | Che cosa fa |
|---|---|
| `titolo:` | il titolo grande in cima |
| `sottotitolo:` | la riga sotto il titolo, in grigio |
| `sezione:` | un'intestazione di sezione, con il filo sotto |
| `paragrafo:` | testo lungo, va a capo da sé |
| `testo:` | una riga sola, troncata se non ci sta |
| `campi:` | coppie `Etichetta=valore` separate da `;`; `\| colonne 1` per incolonnarle tutte |
| `riquadro:` | le stesse coppie, ma in evidenza: etichetta piccola, valore grande, un bordo |
| `elenco:` | i punti di un elenco, per nome (`elenco: obiettivi`) |
| `tabella:` | una tabella, per nome (`tabella: presenze`) |
| `grafico:` | una distribuzione a punti, per nome (`grafico: distribuzione`) |
| `galleria:` | una parete di ritratti: foto e nome sotto (`galleria: allievi \| colonne 4 \| altezza 32`) |
| `spazio:` | uno stacco verticale; il numero sono punti tipografici |
| `filo:` | una riga orizzontale |
| `immagine:` | un PNG o un JPEG di questa cartella (`immagine: logo.png \| altezza 16 \| centro`) |
| `pagina-nuova:` | volta pagina, se sulla pagina c'è già qualcosa |
| `usa:` | mette qui un pezzo di `_blocchi.tpl` (`usa: apertura \| titolo=Presenze`) |
| `se:` … `altrimenti:` … `fine:` | mostra un pezzo solo quando c'è qualcosa da dire |
| `ripeti:` … `fine:` | rifà quel che sta dentro per ogni voce di un gruppo |

### I campi, e come si incolonnano

```
campi: Indirizzo={{indirizzo}}; E-mail={{email}}
campi: Indirizzo={{indirizzo}}; E-mail={{email}} | colonne 1
```

Le etichette cominciano tutte al margine, i valori tutti a un tabulatore solo:
si legge la colonna delle etichette come una lista e quella dei valori diritta,
senza rincorrerli. Il tabulatore è **uno per rapporto** — lo decide l'etichetta
più lunga di tutto il foglio — così due gruppi di campi in due punti della
pagina restano incolonnati fra loro.

Due colonne dividono la riga in due, e con due colonne i tabulatori sulla pagina
tornano a essere due: uno per metà. Dove l'allineamento conta più della
compattezza si scrive `| colonne 1`.

Due colonne di serie, che è come stanno bene dei conti brevi. `| colonne 1`
quando i valori sono lunghi, quando lo spazio è poco — l'anagrafica accanto al
ritratto, dove un indirizzo in mezza colonna esce troncato — o quando si vuole
un tabulatore solo su tutta la pagina.

Un campo senza valore non si stampa: «Azienda: » non dice niente più di quanto
dica non scriverlo.

### Il totale di una tabella

Una tabella può portare un'ultima riga che tira le somme — le prove di una
persona in formazione finiscono con «Totale · 5 prove · 4.62» — scritta in grassetto e
staccata dalle altre da un filo più marcato. Non si dichiara nel modello: la
mette chi produce i dati, perché è un conto, non impaginazione. Scegliendo le
colonne il totale le segue.

### Un dato in evidenza

```
riquadro: Nota di fine semestre={{notaSemestre}}
```

Le stesse coppie di `campi:`, ma dentro un riquadro: etichetta piccola sopra,
valore grande sotto. Serve al numero che è il motivo per cui il foglio esiste —
la nota di fine semestre su una scheda — e che in una riga di campi si legge
come uno dei tanti. Più coppie stanno una accanto all'altra nello stesso
riquadro, a colonne uguali.

### Le colonne di una tabella

`tabella: presenze` le mostra tutte. Con una barra si scelgono e si mettono
nell'ordine che si vuole:

```
tabella: presenze | PiF, % presenza
tabella: voti | PiF, Media, *
```

Le colonne si nominano **com'erano di serie**, non come `_testi.tpl` le
ribattezza: se cambiare il nome rompesse i modelli, il legame fra i due file
sarebbe una trappola. Un `*` sta per «tutte le altre, nell'ordine loro»: è come
si tiene una colonna per prova senza sapere quante prove ci saranno. Un nome che
la tabella non ha si salta.

### Riusare un pezzo

```
usa: apertura | titolo={{titolo}} — {{classe}}; sottotitolo={{materia}} · {{periodo}}
usa: griglia-appello
```

Il blocco sta in `_blocchi.tpl`, sotto `[blocco: nome]`, e dentro si scrive
tutto quel che si scrive in un corpo — `se:` e `ripeti:` compresi. Quel che c'è
dentro prende il posto della riga.

I parametri dopo la barra valgono **solo dentro quel blocco** e coprono i valori
del rapporto. Arrivano già riempiti: chi chiama li scrive con i segnaposto suoi,
e il blocco riceve il testo. Un parametro non passato non copre niente, e la
riga che lo conteneva sparisce da sé.

Un `usa:` che nomina un blocco che non c'è salta quella riga. Un blocco che
richiama sé stesso, o due che si richiamano a vicenda, si fermano al secondo
giro invece di girare per sempre.

### Mostrare qualcosa solo quando c'è

```
se: {{udSenzaAppello}}
testo: {{frase.appello-incompleto}}
altrimenti:
testo: L'appello è completo.
fine:
```

Vero vuol dire «c'è qualcosa da mostrare»: un valore non vuoto, una tabella con
delle righe, un elenco con dei punti, un gruppo con delle voci. `se:` e `ripeti:`
si annidano. Un `fine:` dimenticato porta il blocco fino in fondo al corpo,
invece di far cadere il rapporto; un `fine:` spaiato si salta come ogni riga che
non si capisce.

### Ripetere un pezzo per ogni persona in formazione

```
ripeti: allievi
pagina-nuova:
titolo: {{allievo}}
sezione: Le prove
tabella: prove
fine:
```

Dentro il giro i nomi si scrivono come fuori — `{{allievo}}`, `tabella: prove` —
e valgono per la voce di quel giro: chi scrive un modello non deve imparare due
vocabolari. Quali gruppi un rapporto offre lo dice `datiRapporti.ts`, come per
le tabelle.

### Un'immagine

```
immagine: logo.png | altezza 16 | centro
```

Il file sta in questa cartella, PNG o JPEG. Un nome secco è un'immagine di
`templates/`; un percorso con delle barre — `{{foto}}` diventa
`archivio/docente-di-classe/DIC4a/foto/Rossi Mario.jpg` — è un file della cartella
dell'anno, ed è così che il ritratto di una persona in formazione arriva sulla sua scheda. Le
risalite `..` non passano. Si dichiara solo l'altezza, in millimetri: la larghezza viene dalle proporzioni del
file, e dichiararle tutte e due vorrebbe dire poterle sbagliare. Più larga del
foglio, l'immagine rimpicciolisce invece di uscire dal margine.

Con `| accanto` l'immagine non si prende la sua fascia di foglio: si tiene il
fianco su cui sta, e quel che segue si scrive nella colonna che resta finché non
l'ha sorpassata. È la disposizione della scheda personale — il ritratto a
destra, i recapiti alla sua altezza — e senza, tre centimetri di foto lasciano
tre centimetri di bianco sull'altro lato. Vale per `sinistra` e `destra`: al
centro non resterebbe una colonna in cui scrivere. Un `filo:` o una `sezione:`
chiudono la fascia e riportano la riga intera, ed è così che si dice «da qui in
poi tutta la larghezza».

Scritta dentro `[intestazione]` o `[piede]`, l'immagine si ripete su ogni
pagina: è lì che va il logo della sede, perché su carta la seconda pagina è
quella che si ritrova staccata dalle altre. La banda cresce per contenerla, e la
riga di testo si stringe per non finirle sotto.

Un file che non c'è non fa niente: il rapporto esce senza, e la banda resta
bassa com'era — un modello che nomina un logo mancante non deve lasciare un
centimetro e mezzo di bianco in cima a ogni foglio.

`_base.tpl` porta già `immagine: logo.jpg | altezza 14 | destra`: è il logo del
CPT in alto a destra. Per cambiarlo si sostituisce il file, per toglierlo si
commenta quella riga.

### Una parete di ritratti

```
galleria: allievi | colonne 4 | altezza 32
```

Una casella per persona — la foto, il nome sotto in grassetto, e sotto ancora
l'azienda in grigio — disposte in griglia. È l'unica cosa che una tabella non
sa fare: le sue celle sono testo. Serve a chi ha venticinque nomi da imparare e
a chi entra in aula a sostituire per un'ora, ed è il modello `foto-classe.tpl`.

Le colonne e non la larghezza della casella: si sa quante facce si vogliono per
riga, non quanti millimetri restano dopo i margini. Quattro su un A4 fanno un
ritratto da quattro centimetri, che si riconosce a braccio teso. L'altezza è
quella della foto, in millimetri, e la foto ci sta dentro tenendo le sue
proporzioni.

Le foto si mettono dalla scheda di una persona in formazione, nel pannello «Ritratto», e il
registro se ne tiene una copia in `archivio/docente-di-classe/<classe>/foto/`. Chi non ce
l'ha tiene la sua casella con il posto segnato: una griglia che salta i senza
foto è una griglia in cui i nomi si spostano.

### Le righe fisse

In `[intestazione]` e `[piede]` si scrive `riga:` e si divide con `|`:
`sinistra | centro | destra`. Con una barra sola si intende `sinistra | destra`.

**Le righe si impilano**, la prima in alto, e la banda cresce per contenerle.
Una riga fatta di soli segnaposto che nessuno ha riempito sparisce, invece di
lasciare una riga bianca fra le altre: vale la stessa regola del corpo, ed è
quel che permette a `_base.tpl` di prevedere una riga per il nome della sede
senza obbligare chi non ce l'ha a cancellarla.

`_base.tpl` è fatto come un foglio intestato: tre righe a destra — la sede, la
materia, classe e periodo — il titolo del documento a sinistra sull'ultima, e il
logo più a destra ancora. Il titolo sta sull'ultima riga perché è lì che i due
blocchi si allineano: a mezz'aria accanto a tre righe sembrerebbe appartenere
alla riga sbagliata. In fondo, chi firma a sinistra e il numero di pagina a
destra.

### Le frasi e i nomi delle colonne

Stanno in **`_testi.tpl`**, il terzo strato. Vale per tutti i rapporti e non si
dichiara: non si estende, c'è e basta.

```
[frasi]
appello-incompleto: Appello incompleto: {{udSenzaAppello}} caselle non impostate.

[colonne]
UD seguite: Ore seguite
```

Una frase si richiama con `{{frase.nome}}`, e dentro può avere i segnaposto del
rapporto. Si risolve in un giro solo: una frase che ne cita un'altra non va più
in fondo di così, e due frasi che si rimandano a vicenda non girano per sempre.

`[colonne]` ribattezza le colonne delle tabelle, in tutti i rapporti insieme —
la stessa colonna deve chiamarsi allo stesso modo dappertutto, per lo stesso
motivo per cui la testata sta in un file solo. Per nome e non per posizione: le
colonne di una griglia non sono sempre le stesse, e «la terza colonna» di due
classi diverse non è la stessa cosa.

Dove serve un'eccezione — una tabella in cui quella parola vuol dire un'altra
cosa — si scrive il nome della tabella davanti, e vince su quella generale:

```
PiF: Nome e cognome              in tutte le tabelle
presenze.PiF: Chi c'era          solo nella tabella «presenze»
```

**Che frasi ci sono, e dove.** Tutte quelle che il registro compone stanno sotto
`[frasi]` in `_testi.tpl`: `sede` e `docente` della carta intestata,
`riepilogo-presenze`, `appello-incompleto`, `legenda-presenze`, `nota-presenze`,
`esecuzione-riconsegna`. I numeri che ci vanno dentro li mette il registro; le
parole attorno sono lì e si cambiano. Della legenda dell'appello le **lettere**
restano del codice — sono le stesse che si premono nella griglia a schermo, e
riscriverle qui vorrebbe dire poter dire una cosa diversa da quella che si
compila — mentre le parole si scrivono in `_testi.tpl`.

### I segnaposto

`{{nome}}` viene sostituito dal registro. Un segnaposto che nessuno riempie
diventa vuoto, e la riga che conteneva solo quello sparisce: è così che le
sezioni facoltative — osservazioni, consuntivo, note — non lasciano
intestazioni seguite dal nulla. Anche una `sezione:` sparisce se sotto di lei
non è rimasto niente.

Disponibili ovunque: `{{titolo}}`, `{{anno}}`, `{{classe}}`, `{{materia}}`,
`{{corso}}` (classe e materia insieme), `{{generato}}`. In intestazione e piede anche `{{pagina}}` e `{{pagine}}`.

Quelli propri di ogni rapporto — e i nomi degli elenchi, delle tabelle e dei
gruppi su cui `ripeti:` gira — sono scritti in
`src/dominio/datiRapporti.ts`, una funzione per rapporto.

I PDF che ne escono finiscono in `registro/esportazioni/<materia>/<classe>/`,
divisi in due cartelle: `classe/` per i fogli di tutta la classe,
`allievi/<Cognome Nome>/` per quelli di una persona sola. Il tipo di documento
sta nel nome del file, non in una cartella sua. Un rapporto rifatto sovrascrive
quello di prima invece di accumularsi con un numero accanto.

Accanto c'è `archivio/`, con la stessa identica struttura, dove sta quel che
viene caricato — scansioni, verifiche, moduli firmati, foto. La differenza è
che `esportazioni/` si può cancellare per intero: nessun percorso salvato ci
punta dentro, e tutto quel che contiene si rifà da un pulsante. È il modo di
ristampare tutto quando si cambia un modello.

## Aggiungere un rapporto

Un modello nuovo in questa cartella non basta: il registro deve sapere quali
dati mettergli dentro. Serve una funzione in `datiRapporti.ts` e una voce in
`src/azioni/rapporti.ts`. Modificare quelli che ci sono, invece, si fa
tutto da qui.
