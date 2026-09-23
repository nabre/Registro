// La guida: che cosa fa ogni pagina del registro, e come si usa.
//
// Sta dentro l'applicazione e non in un file a parte perché è lì che serve —
// nel momento in cui non si sa dove mettere le mani — e perché un manuale in
// un'altra finestra invecchia da solo: questo si legge accanto alla pagina che
// descrive, e da ogni voce si va alla pagina vera con un clic.
//
// Il contenuto sta in una struttura di dati, non nel disegno. Chi aggiunge una
// funzione aggiunge una riga in `GUIDA` e ha finito: senza questa separazione,
// aggiornare la guida vorrebbe dire rimettere le mani in un albero di `h()`, e
// una guida faticosa da aggiornare è una guida che dopo tre mesi dice il falso
// — che è peggio di non averla.

import { CARTE, PERSONE, PIF, Molti, corto, del, il, un } from '../../domain/lexicon.js'
import type { Vista } from '../../protocol.js'
import { pastiglia, pulsante, scheda, testataVista } from '../components/base.js'
import { icona, type NomeIcona } from '../components/icons.js'
import { andaturaScorrimento, h, type Figlio } from '../dom.js'
import { aggiorna } from '../state.js'

/** Una cosa che si sa fare, e come. */
interface VoceGuida {
  /** Il gesto, o il concetto: è quel che si cerca scorrendo. */
  termine: string
  testo: string
}

interface SezioneGuida {
  id: string
  titolo: string
  simbolo: NomeIcona
  /** A che domanda risponde la pagina. Una riga, non tre. */
  sommario: string
  /** La pagina vera, quando ce n'è una: dalla guida ci si arriva. */
  vista?: Vista
  voci: VoceGuida[]
}

const GUIDA: SezioneGuida[] = [
  {
    id: 'inizio',
    titolo: 'Come si comincia',
    simbolo: 'piu',
    sommario:
      'Il registro ha una catena sola, e tutto il resto pende da lì: anno → classe, ' +
      'materia → corso → orario → lezioni.',
    voci: [
      {
        termine: 'Avvio guidato',
        testo:
          'La prima volta non serve percorrere la catena a mano: «Registro: avvio guidato» ' +
          'chiede anno, classe, materia e le ore in cui si fa lezione, e da quei quattro campi ' +
          'fa nascere tutto nell’ordine giusto, lezioni sul calendario comprese.',
      },
      {
        termine: 'Il corso è il perno',
        testo:
          'Un corso è una materia a una classe. Lezioni, valutazioni e piani si agganciano a ' +
          'lui e non alla classe: due materie allo stesso gruppo sono due corsi, con due ' +
          'medie e due conti di presenza.',
      },
      {
        termine: 'Il «+» accanto alle tendine',
        testo:
          'Dove una tendina chiede qualcosa che non esiste ancora, il «+» accanto la crea sul ' +
          'momento e la sceglie da sola. Non c’è un ordine obbligato da indovinare, e quel che ' +
          'si stava scrivendo non si perde.',
      },
      {
        termine: 'Tutto si salva da sé',
        testo:
          'Non c’è un pulsante «Salva» nelle pagine di lavoro: l’appello parte al primo clic, ' +
          'i testi quando si lascia il campo. I moduli in finestra, quelli sì, hanno il loro ' +
          'pulsante di conferma.',
      },
      {
        termine: 'Le finestre si ritrovano dov’erano',
        testo:
          'Posto, misura, schermo e «ingrandita» si ricordano da una volta all’altra: il ' +
          'registro, il lettore dei documenti e le impostazioni riaprono ognuno dov’era. Su ' +
          'due schermi vuol dire che il registro resta su quello grande senza doverlo ' +
          'trascinare ogni mattina. Se lo schermo di ieri non c’è più — il portatile staccato ' +
          'dalla scrivania — la finestra torna al centro di quello che c’è, invece di aprirsi ' +
          'fuori da tutti. La proiezione fa eccezione sullo schermo intero: là ce la manda il ' +
          'comando, che sa anche su quale monitor.',
      },
    ],
  },
  {
    id: 'barra',
    titolo: 'La barra in cima',
    simbolo: 'libro',
    sommario: 'Sopra dove si va, sotto che cosa si può fare nella pagina aperta.',
    voci: [
      {
        termine: 'Sezioni e pagine',
        testo:
          'La barra laterale raccoglie tutte le pagine per sezione: Gestione, Registro, ' +
          'Docente di classe e Programma. Premi una voce per aprirla; quella corrente è ' +
          'evidenziata. Il pulsante in alto a sinistra espande o riduce la navigazione alle sole icone per ' +
          'lasciare più spazio alle tabelle. Nelle finestre strette si apre a richiesta e ' +
          'torna alle sole icone dopo la scelta. Filtri e azioni restano in alto.',
      },
      {
        termine: 'L’elenco è raccolto per mestiere',
        testo:
          '**Gestione**: le pagine che non sono di nessun corso — calendario, pendenze, ' +
          'corsi, classi. **Registro**: le quattro del corso su cui si sta lavorando — ' +
          'lezione, valutazioni, piani, documenti. **Docente di classe**: l’elenco della ' +
          'classe e le sue quattro schede. Corso e classe stanno scritti nel titolo del ' +
          'gruppo: si vede su quale si sta per andare prima di andarci.',
      },
      {
        termine: 'Il corso, l’anno, il periodo',
        testo:
          'Le tendine accanto non fanno accadere niente: dicono di che cosa si sta parlando. ' +
          'Il corso — scritto «classe · materia» — è quello su cui sono puntate tutte le ' +
          'pagine, e per questo nessuna pagina ha più un filtro suo: si sceglie una volta ' +
          'sola qui, non a ogni cambio di pagina. L’elenco contiene i corsi che nel periodo ' +
          'scelto hanno almeno un’ora. Fa eccezione il calendario, che guarda tutte le classi ' +
          'insieme e tiene il suo filtro. Accanto l’anno scolastico e il periodo dei conti.',
      },
      {
        termine: 'La riga sotto: le azioni di questa pagina',
        testo:
          'Soltanto quel che si può fare dove si è: nel calendario «Nuova ora» e «Oggi», ' +
          'nelle pagine di un corso le sue esportazioni, in Classi l’elenco e le famiglie. ' +
          'Un comando spento dice perché nel suo titolo, e quasi sempre la risposta è che ' +
          'manca un corso o una classe.',
      },
      {
        termine: 'Il menu «File» e la ricerca',
        testo:
          'A sinistra di tutto sta quel che si fa al registro intero e non alla pagina: ' +
          'aprire un anno, salvare, ricaricare, l’anno scolastico, la posta, le riparazioni — ' +
          'e in fondo le impostazioni e questa guida. ' +
          'Con Ctrl+K si cerca scrivendo, e lì pagine e comandi stanno insieme. Con Ctrl+B si ' +
          'nasconde la riga delle azioni quando lo schermo è piccolo.',
      },
    ],
  },
  {
    id: 'barra-stato',
    titolo: 'La barra in fondo',
    simbolo: 'informazione',
    sommario: 'Che cosa manca, e com’è messa la macchina. Si guarda senza cercare niente.',
    voci: [
      {
        termine: 'L’ora da compilare',
        testo:
          'A sinistra c’è sempre un’ora, e un clic la apre. Se qualche registro è rimasto ' +
          'indietro — un’ora passata senza appello, o non ancora segnata svolta — la barra ' +
          'propone **il buco più vecchio**, con il triangolo giallo. Se non ce ne sono, ' +
          'propone la prossima lezione in programma. È lo stesso giudizio del cruscotto: se ' +
          'lì un’ora è in ordine, qui non compare.',
      },
      {
        termine: Molti(CARTE.pendenza),
        testo:
          'Quante cose restano da chiudere in tutte le classi — assenze da far firmare, prove ' +
          'da correggere, documenti da raccogliere — e quante sono in ritardo. Un clic apre il ' +
          `pagina delle ${CARTE.pendenza.plurale}. Sparisce quando non c’è più niente.`,
      },
      {
        termine: 'La posta e la rete',
        testo:
          'A destra si legge da dove escono le comunicazioni: dalla casella collegata, o ' +
          'come file .eml. Un clic porta nelle Impostazioni. Staccando la rete la ' +
          'voce diventa **senza rete** in rosso: quel che si scrive nel registro si salva lo ' +
          'stesso sul disco, ma le comunicazioni non partono e le scansioni non si leggono.',
      },
      {
        termine: 'Il promemoria prima della lezione',
        testo:
          'Cinque minuti prima che un’ora cominci arriva una notifica del sistema: la classe, ' +
          'l’orario e l’aula, e che cosa resta aperto per quel corso — con il titolo delle ' +
          'prime cose. Premendola si apre il registro di quell’ora. Non arriva due volte per ' +
          'la stessa ora, non arriva mentre si sta già guardando il registro, e un’ora già ' +
          'cominciata si annuncia ancora per un quarto d’ora: serve al portatile riaperto in ' +
          'aula. Si spegne, o si cambia l’anticipo, dalle Impostazioni sotto «Promemoria».',
      },
      {
        termine: 'Quel che tace',
        testo:
          'Una voce che non ha niente da dire non compare — la lettura delle scansioni si vede ' +
          'solo mentre macina, e «senza rete» solo quando manca. È voluto: una barra che dice ' +
          'sempre le stesse otto cose diventa sfondo, e il giorno che serve non la legge più ' +
          'nessuno.',
      },
    ],
  },
  {
    id: 'vassoio',
    titolo: 'L’icona accanto all’orologio',
    simbolo: 'orologio',
    sommario: 'Il registro a portata di tasto destro, anche a finestre chiuse. Ed è da lì che si esce.',
    voci: [
      {
        termine: 'Il menu',
        testo:
          'Tasto destro sull’icona e si apre l’anno: in testa quel che sta succedendo adesso e ' +
          'l’ora su cui andare, poi **un corso per riga**. Un clic singolo sull’icona riporta ' +
          'davanti il registro, senza aprire niente.',
      },
      {
        termine: 'Le ore di un corso',
        testo:
          'Ogni corso apre un sottomenu con le sue ore divise in mucchi — **In corso**, **Da ' +
          'chiudere**, **Prossime**, **Svolte**, **Annullate** — e il numero fra parentesi dice ' +
          'quante sono in tutto, anche quando le righe mostrate sono meno. Un clic su un’ora ' +
          'apre il suo registro.',
      },
      {
        termine: 'I segni',
        testo:
          '▶ è l’ora che si sta facendo, ⚠ un registro rimasto aperto, ✓ un’ora a posto, ○ ' +
          'un’ora futura che la scaletta non copre ancora, · una futura preparata fino in ' +
          'fondo, × una annullata. Il segno ' +
          'davanti al **corso** è quello della sua ora più urgente: fra dodici ore svolte e un ' +
          'buco, dal primo livello si vede il buco.',
      },
      {
        termine: 'Perché, e non solo che cosa',
        testo:
          'Accanto a ogni ora c’è il motivo: «senza appello», «non segnata svolta», «senza ' +
          'piano», «scaletta corta», «2 assenti», «verifica». Sono buchi diversi, si chiudono ' +
          'in posti diversi, e ' +
          'così si sceglie quale ora aprire senza aprirle tutte.',
      },
      {
        termine: 'Chiudere il registro',
        testo:
          'La X della finestra **mette via** il registro: resta acceso accanto all’orologio e ' +
          'si riapre con un clic, senza rileggere i file. Per chiuderlo davvero c’è **Esci dal ' +
          'registro**, in fondo al menu dell’icona: da lì l’ultima modifica viene salvata prima ' +
          'di uscire. Chi preferisce che la X chiuda tutto lo dice dalle Impostazioni, sotto ' +
          '«Vassoio».',
      },
    ],
  },
  {
    id: 'agenda',
    titolo: 'L’agenda sul desktop',
    simbolo: 'agenda',
    sommario: 'La settimana appoggiata sulla scrivania: si guarda senza aprire niente.',
    voci: [
      {
        termine: 'Che cos’è',
        testo:
          'Un riquadro sul desktop con la settimana: un giorno per riga, le ore con orario, ' +
          'classe, materia e aula. **Un clic su un’ora apre il registro di quell’ora.** Si ' +
          'accende dal menu dell’icona accanto all’orologio, dal menu **Vai a**, o con ' +
          '`ctrl+alt+a`; lo stesso interruttore la spegne.',
      },
      {
        termine: 'Sta sotto, e non ruba il fuoco',
        testo:
          'Qualunque finestra le passa sopra, e premerla non toglie il cursore da dove si stava ' +
          'scrivendo: è una cosa appoggiata sulla scrivania, non una finestra che pretende ' +
          'attenzione. Non compare nella barra delle applicazioni e non entra in Alt+Tab.',
      },
      {
        termine: 'Spostarla e ridimensionarla',
        testo:
          'La si prende per la **testata** e la si posa dove si vuole; il **bordo sinistro** ne ' +
          'cambia la larghezza e quello **di sotto** l’altezza. Tutto scatta sulla griglia delle ' +
          'icone del desktop — la misura in celle è scritta in fondo — e posto e misura si ' +
          'ritrovano al prossimo avvio.',
      },
      {
        termine: 'Agganciarla al bordo',
        testo:
          'Con «agenda: ancorata» acceso, l’agenda si incolla al bordo destro come una barra di ' +
          'sistema: **le icone del desktop le fanno posto** e una finestra massimizzata si ferma ' +
          'al suo bordo. In cambio non la si sposta più: è il prezzo di prendersi una fetta di ' +
          'schermo.',
      },
      {
        termine: 'Quando l’anno non c’è, o non è cominciato',
        testo:
          'Fuori dall’anno scolastico l’agenda si apre sulla prima settimana dell’anno (o ' +
          'sull’ultima) e lo dice, invece di mostrare cinque giorni vuoti. Senza nessun ' +
          'documento aperto offre **Apri un registro…**, che è lo stesso dialogo del menu.',
      },
    ],
  },
  {
    id: 'calendario',
    titolo: 'Calendario',
    simbolo: 'calendario',
    vista: 'calendario',
    sommario: 'Quando si fa lezione. Quattro viste della stessa cosa, per quattro domande diverse.',
    voci: [
      {
        termine: 'Settimana',
        testo:
          'La vista di lavoro: l’orario com’è davvero, con le pause e le sovrapposizioni. Le ' +
          'ore si trascinano per spostarle, e il menu con il tasto destro le duplica, le ' +
          'annulla o le elimina.',
      },
      {
        termine: 'Mese',
        testo:
          'Una striscia continua che scorre dentro l’anno, senza il salto fra un mese e ' +
          'l’altro. Nella prima colonna il numero della settimana: il piano annuale si conta ' +
          'in settimane.',
      },
      {
        termine: 'Anno',
        testo:
          'Il calendario che la sede stampa e appende: tutti i mesi affiancati, i giorni in ' +
          'riga. Serve a quante settimane restano prima di Natale, a dove cade il ponte, a ' +
          'quanto sta ancora dentro il primo semestre.',
      },
      {
        termine: 'Agenda',
        testo: 'Quel che viene, in fila, dal giorno scelto in avanti.',
      },
      {
        termine: 'Generare le ore',
        testo:
          'Le lezioni non si mettono una per una: si dichiara l’orario fisso del corso e da lì ' +
          'si generano, saltando le vacanze. Ogni ora resta poi modificabile per conto suo — ' +
          'la ricorrenza è uno stampo, non un vincolo.',
      },
      {
        termine: 'Compleanni',
        testo:
          'Chi compie gli anni compare sul calendario con una torta, il nome e gli anni: ' +
          'nel mese e nell’agenda per esteso, nella settimana e nell’anno come segno sul ' +
          'giorno. Si ricavano dalle date di nascita dell’anagrafica — non si aggiungono e ' +
          'non si cancellano — e cliccandoli si apre la scheda della persona. Quelli di una ' +
          'classe che quel giorno non si ha in aula restano sbiaditi: sono da sapere, non da ' +
          'fare.',
      },
      {
        termine: 'Filtro per classe',
        testo:
          'In alto si sceglie una classe e il calendario mostra solo le sue ore. È lo stesso ' +
          'filtro di piani e todo, e si sposta da sé sulla classe del corso scelto nella ' +
          'barra in cima. Vale anche per i compleanni: con un corso solo si vedono quelli ' +
          'della sua classe.',
      },
    ],
  },
  {
    id: 'lezione',
    titolo: 'Lezione',
    simbolo: 'agenda',
    vista: 'lezione',
    sommario: 'La schermata che si tiene aperta durante la lezione.',
    voci: [
      {
        termine: 'Appello per unità didattica',
        testo:
          'Non «presente o assente all’ora», ma casella per casella: chi arriva alla ' +
          'terza UD è presente da lì in poi. Le caselle non toccate restano «non impostate» e ' +
          'non contano né come presenze né come assenze.',
      },
      {
        termine: 'Stato dell’ora',
        testo:
          'Nella riga delle azioni ci sono i tre stati — **Pianificata**, **Svolta**, ' +
          '**Annullata** — e quello acceso è quello in vigore: si legge com’è messa l’ora ' +
          'guardandola, e si preme dove la si vuole portare. **Svolta** chiude la lezione, e ' +
          `da lì i documenti di quel corso — verbale, presenze, valutazioni, schede ${corto(PIF)} — ` +
          'si rifanno da soli. **Annullata** chiede conferma: l’ora resta nel registro, e i ' +
          'dati già inseriti non si perdono.',
      },
      {
        termine: 'Le tre schede',
        testo:
          '**Amministrazione** mentre la classe entra — appello e consegne; **Lezione** ' +
          'durante — la scaletta e le prove; **Annotazioni** dopo, a classe uscita — lo ' +
          'svolgimento e quel che c’è da segnare su qualcuno.',
      },
      {
        termine: 'Che cosa toglie un’ora',
        testo:
          'Nei conti — percentuali, medie di frequenza, soglia di assenza — toglie un’ora ' +
          'soltanto **X**. Il **ritardo vale come presenza**: chi entra alla terza unità ' +
          'didattica ha le prime due segnate assenti, e quelle si contano da sé; contare anche ' +
          'quella in cui è arrivato vorrebbe dire toglierla due volte. I ritardi si contano ' +
          'a parte, con i minuti scritti sulla riga. Anche l’**esonero** non abbassa la ' +
          'frequenza: c’è un’autorizzazione dietro. E le caselle **–** non entrano in nessun ' +
          'conto: sono appello da fare.',
      },
      {
        termine: 'Argomenti e consuntivo',
        testo:
          'Gli argomenti sono quel che si è fatto, il consuntivo com’è andata. Stanno nelle ' +
          'Annotazioni, perché si scrivono nello stesso momento in cui si segna che cosa è ' +
          'successo a qualcuno. Si salvano quando si lascia il campo.',
      },
      {
        termine: 'Osservazioni',
        testo:
          `Note su ${un(PIF)} o sulla classe, con un tipo. Finiscono nel verbale e nella ` +
          `scheda ${del(PIF)}.`,
      },
      {
        termine: 'Consegne',
        testo:
          'Quel che si assegna e quel che si ritira. Una consegna data il 12 si ripresenta il ' +
          '19 e il 26 finché non l’hanno fatta tutti, senza che nessuno debba cercarla. Le ' +
          'spunte si mettono qui, **una per nome**: non c’è una chiusura della consegna ' +
          'intera, perché una consegna data alla classe è fatta da chi l’ha fatta — e chiuderla ' +
          'in blocco si portava via i nomi di chi non aveva portato niente, che erano l’unica ' +
          'ragione per cui esisteva. Il gesto rapido resta: «Spunta tutti» segna quelli che ' +
          'mancano, uno per uno.',
      },
      {
        termine: 'Verbale',
        testo:
          'Il PDF di quell’ora — presenze, scaletta svolta, argomenti, consegne, osservazioni — ' +
          'si chiede dalla pagina **Documenti**, in fila con le altre ore del corso.',
      },
      {
        termine: 'Prove da riconsegnare',
        testo:
          'Nella scheda Amministrazione, accanto alle consegne: le prove di questo corso ' +
          'ancora in mano a chi insegna. Una prova per blocco, e sotto di lei quel che le ' +
          'manca — la **griglia da completare**, con dentro solo le caselle vuote, i nomi a ' +
          'cui non è ancora tornata, e i recuperi già valutati e ancora nella cartella. La ' +
          'prova sparisce dall’elenco quando non le manca più niente. È lì che il gesto ' +
          'capita: si entra in aula, si distribuiscono i compiti, e il registro di quest’ora ' +
          'è già aperto. La spunta scrive la data **di quest’ora**, non quella di oggi; ' +
          'accanto c’è il campo «resa il», per un giorno diverso.',
      },
      {
        termine: 'Recuperi di oggi',
        testo:
          'Nella scheda Lezione, sotto le valutazioni: chi in quest’ora rifà una prova di ' +
          'un’altra volta. Compare solo se qualcuno l’ha fissata per oggi. In cima c’è la ' +
          'griglia della prova che si rifà, con dentro soltanto i nomi che la rifanno: il ' +
          'voto si mette lì, ed è la casella di quella verifica. Sotto, le righe con la ' +
          'scansione e i comandi per spostare il recupero o dichiarare che non si fa.',
      },
    ],
  },
  {
    id: 'todo',
    titolo: Molti(CARTE.pendenza),
    simbolo: 'todo',
    vista: 'todo',
    sommario: 'Che cosa ho lasciato in giro? Tutte le consegne insieme, di tutti i corsi.',
    voci: [
      {
        termine: 'Divise per tipologia',
        testo:
          'In cima ci sono le tipologie, e dicono **chi deve fare che cosa**: le **assenze da ' +
          'far firmare** e i **momenti di valutazione**, che non dipendono da una persona sola, ' +
          'e poi le quattro dell’incrocio — **consegna la classe** (i fogli che gli allievi ' +
          'devono portare), **svolge la classe** (quel che è stato assegnato), **consegna il ' +
          'docente** (pagelle, convocazioni, moduli da far firmare a casa), **svolge il ' +
          'docente** (fotocopie, preparazioni, amministrazione). Prima erano quattro e dicevano ' +
          'che *cos’era* una pendenza: sotto «Documenti» stavano insieme la pagella che devo ' +
          'dare e il certificato che aspetto, che sono due lavori con due momenti diversi — uno ' +
          'si sollecita, l’altro si fa. Ogni tipologia porta il suo conto e la pastiglia del ' +
          'ritardo, e l’ordine va da quel che aspetta gli altri a quel che tocca a chi tiene ' +
          'il registro.',
      },
      {
        termine: 'Assenze oltre la soglia',
        testo:
          'La percentuale di assenza oltre cui una persona va seguita si dichiara nelle ' +
          'impostazioni del registro, e da lì produce una pendenza: chi la supera compare qui, ' +
          'corso per corso, con quante unità didattiche ha perso su quante ne erano previste. ' +
          'Due mucchi: **da segnalare** quando anche la percentuale sulle ore con l’appello ' +
          'fatto è oltre — il numero non dipende da appelli dimenticati — e **da guardare** ' +
          'quando invece l’appello di quelle ore manca ancora. Non si spunta: sparisce da sé ' +
          'quando la percentuale rientra. Soglia a zero, nessuna segnalazione.',
      },
      {
        termine: 'L’ordine è la fretta',
        testo:
          'Prima quel che è rimasto indietro, poi quel che scade oggi, poi la settimana che ' +
          'viene. Non per data né per corso: è la domanda della domenica sera.',
      },
      {
        termine: 'La scheda «Fatto»',
        testo:
          'In fondo alla pagina, ripiegata: dentro c’è tutto quel che è stato chiuso — le ' +
          'consegne fatte, i recuperi chiusi o dispensati, le prove riconsegnate. Sparire è ' +
          'quel che devono fare, altrimenti la pagina cresce e non si svuota mai; ma non ' +
          'lasciare traccia è un’altra cosa, e «l’ho già ridata a Rossi?» o «quella verifica ' +
          'l’avevo dispensata?» sono domande che si fanno davvero. Si apre se la si cerca, e ' +
          'da lì una riga si può anche riaprire.',
      },
      {
        termine: 'I recuperi',
        testo:
          'In cima alla pagina, prima delle consegne: le prove da rifare a chi non c’era. ' +
          'Compaiono da sé — l’appello dell’ora dice già chi mancava — e non passano dal ' +
          `filtro «mie / delle classi», perché sono un debito verso ${un(PIF)} e lo salda ` +
          'chi insegna. Il pulsante con il calendario le fissa alla prossima ora del corso; ' +
          'la graffetta allega o apre la scansione; la matita apre data, nota e documenti; ' +
          'la crocetta dichiara che non si recuperano.',
      },
      {
        termine: 'Le prove svolte',
        testo:
          `Sotto i recuperi: le verifiche fatte che non sono ancora tornate alle ${PIF.plurale}. ` +
          'Compaiono da sé il giorno stesso in cui la prova si svolge, e restano finché non ' +
          'sono chiuse: prima «da correggere» — e quel pezzo si chiude mettendo i voti, non ' +
          'con una spunta — poi «da riconsegnare», che è l’unica cosa che il registro non ' +
          `può dedurre e va detta. La riconsegna è **per ${PIF.singolare}**: la riga se ne va da sé ` +
          'quando l’ultimo foglio è tornato al suo. «Resa a tutti» è la scorciatoia — la pila ' +
          'ridistribuita è un gesto solo — e scrive quel giorno su ogni riga che non ha già ' +
          'la sua. Oltre le due settimane la riga si fa rossa: è il momento in cui la classe ' +
          'comincia a chiedere.',
      },
      {
        termine: 'Chi non c’era il giorno della riconsegna',
        testo:
          'La pila torna indietro un giorno solo, ma chi mancava riavrà la sua un’altra ' +
          'volta — e di solito è chi ha più bisogno di vederla. Per questo la data non è ' +
          'della prova ma **di ogni riga**: una sola per tutti direbbe «riavuta» anche di chi ' +
          'quel giorno non c’era, e proprio quei due o tre fogli restavano nella cartella ' +
          `fino a giugno. Nella scheda Riconsegna c’è una riga per ${PIF.singolare}, e fra le ${CARTE.pendenza.plurale}, sotto ` +
          '«Da ridare a», restano i nomi a cui la prova non è ancora tornata.',
      },
      {
        termine: 'Anche i recuperi si riconsegnano',
        testo:
          'In fondo allo stesso elenco: le prove rifatte che sono state valutate ma non ' +
          'ancora ridate a chi le ha fatte. È il pezzo che si perde — messo il voto, il recupero ' +
          'sparisce da tutti gli altri elenchi e il foglio corretto resta nella cartella — e ' +
          'un voto che non si è visto non è un voto consegnato. La spunta lo segna ' +
          'come ridato oggi; per un altro giorno c’è il campo nella tabella della prova.',
      },
      {
        termine: 'Il giorno della riconsegna',
        testo:
          'Ogni riga ha il campo «resa il»: si scrive come tutte le date del registro — ' +
          '7.9, 070926, frecce su e giù per un giorno — e la spunta accanto lo riempie con ' +
          'il giorno da cui si sta guardando: dentro un’ora quella dell’ora, altrove oggi. ' +
          'Non è un dettaglio contabile: da quella data si contano i termini di un ricorso, ' +
          'ed è la sola prova che quel voto è stato visto. Sulla riga della prova non c’è un ' +
          'campo: c’è «Resa a tutti», che scrive quel giorno su chi non ha ancora la sua — e ' +
          'accanto, a giro finito, il tasto che toglie la data a tutti.',
      },
    ],
  },
  {
    id: 'classi',
    titolo: 'Classi',
    simbolo: 'classi',
    vista: 'classi',
    sommario: `L’anagrafica delle ${PIF.plurale}: chi sono e come le si raggiunge.`,
    voci: [
      {
        termine: 'Che cosa c’è',
        testo:
          'Nome, indirizzo, e-mail, azienda del tirocinio, e-mail del datore di lavoro. Il ' +
          `nome apre la scheda personale; la matita apre il modulo con anche ${PERSONE.rappresentante.singolare} e ` +
          'telefono.',
      },
      {
        termine: 'Incolla elenco',
        testo:
          'Un elenco copiato da un foglio o da un’e-mail: «Cognome Nome», «Cognome, Nome», o ' +
          'colonne separate da tabulazione con l’e-mail in fondo. Si accettano tutti e tre ' +
          'invece di chiedere un formato.',
      },
      {
        termine: 'Un ritiro non cancella',
        testo:
          `Togliendo la spunta «Frequenta» ${il(PIF)} esce dagli appelli ma resta nello ` +
          'storico: presenze e voti già registrati restano leggibili.',
      },
      {
        termine: 'Duplica nell’anno',
        testo:
          'La stessa classe con lo stesso elenco in un altro anno: è quel che si fa a ' +
          'settembre quando il gruppo prosegue.',
      },
    ],
  },
  {
    id: 'mappa',
    titolo: 'Mappa',
    simbolo: 'mappa',
    vista: 'mappa',
    sommario:
      `Una mappa sola con tutti i punti: dove abitano e dove lavorano le ${PIF.plurale}, e la sede.`,
    voci: [
      {
        termine: 'Che cosa si vede',
        testo:
          'Un segnaposto per ogni indirizzo scritto nell’anagrafica — il domicilio e il posto ' +
          'di lavoro — più la sede della scuola. La figura dentro il segnaposto dice che cosa ' +
          'è quel posto: una casa, un’azienda, la scuola. Il colore dice di quale classe, ed è ' +
          'lo stesso del calendario: vale per le case, perché una casa è di una persona e la ' +
          'persona è di una classe. Le aziende restano grigie — spesso ci lavorano persone di ' +
          'classi diverse, e dipingerle di uno dei tre colori direbbe una cosa falsa. Una riga ' +
          'tratteggiata unisce i due punti della stessa persona: è il tragitto di ogni mattina.',
      },
      {
        termine: 'Un segnaposto è un indirizzo, non una persona',
        testo:
          'Due fratelli sono una casa sola, e sei tirocinanti nella stessa officina sono un ' +
          'capannone solo: il cartellino li elenca tutti, con la loro classe, e da ogni nome ' +
          'si va alla sua scheda. È anche il motivo per cui le coordinate stanno in una ' +
          'raccolta a parte e non dentro l’anagrafica — l’indirizzo si cerca una volta, e ' +
          'vale per tutti quelli che ci stanno.',
      },
      {
        termine: 'Indirizzi in comune',
        testo:
          'Una riga che porta «3 persone» — o «3 in tirocinio» — è un indirizzo condiviso: ' +
          'la stessa casa o la stessa ditta. Serve a mestiere — una visita in azienda che ' +
          'vale per tre persone si fa una volta, e un foglio da far firmare allo stesso ' +
          'datore di lavoro si manda una volta. Se due che lavorano «nella stessa ditta» ' +
          'compaiono su due righe, è perché in anagrafica hanno due indirizzi diversi: uno ' +
          'dei due è scritto male.',
      },
      {
        termine: 'Due colonne',
        testo:
          'A sinistra l’elenco degli indirizzi, a destra la carta: si legge una riga e si ' +
          'guarda dove cade. In cima all’elenco stanno gli indirizzi che non si è potuto ' +
          'collocare — sono l’unica cosa su cui si agisce — poi quelli caduti solo sul paese, ' +
          'poi tutti gli altri dal più lontano.',
      },
      {
        termine: 'Le tre schede',
        testo:
          '**Tutti**, **Posto di lavoro**, **Domicilio**: comandano insieme l’elenco e i ' +
          'segnaposti, e sono i tre modi in cui questa pagina si apre — guardare la classe ' +
          'intera, mettere in fila le visite in azienda, vedere da dove arriva la gente. La ' +
          'sede resta accesa in tutte e tre: è il punto rispetto a cui si leggono le ' +
          'distanze, non uno dei posti di cui si parla.',
      },
      {
        termine: 'Tutte le classi insieme',
        testo:
          'La mappa mostra sempre tutte le classi dell’anno, e non si restringe: la domanda ' +
          'è «chi viene da dove», il colore dice già di quale classe è ogni casa, e gli ' +
          'indirizzi in comune sono quasi sempre fra classi diverse — quattro tirocinanti ' +
          'nella stessa ditta, uno per anno. Un filtro li avrebbe nascosti.',
      },
      {
        termine: 'Trova gli indirizzi',
        testo:
          'Un indirizzo è una riga di testo, e per diventare un punto va cercato: lo fa il ' +
          'comando «Trova gli indirizzi», che chiede a OpenStreetMap. È l’unico gesto del ' +
          'registro che manda fuori un dato dell’anagrafica, e per questo si preme a mano. ' +
          'Una domanda per indirizzo e non per persona: dieci tirocinanti nella stessa ditta ' +
          'sono una domanda sola. La risposta resta scritta, e non si richiede mai più; ' +
          'cambiando l’indirizzo in anagrafica, il nuovo va cercato la prima volta.',
      },
      {
        termine: 'Come viene cercato',
        testo:
          'Non si manda la riga così com’è: verrebbe cercato un portone che si chiama ' +
          '«Studio d’ingegneria». Il registro la spezza — via, numero civico, NAP, paese — e ' +
          'butta via quel che non è un indirizzo: la casella postale, il nome dello studio o ' +
          'della persona davanti alla via. Poi chiede in quattro modi, dal più preciso al più ' +
          'grossolano: via e civico nel paese, la sola via, la riga intera, e in ultimo il ' +
          'paese.',
      },
      {
        termine: '«Solo il paese»',
        testo:
          'Quando la via non esiste in OpenStreetMap — succede con i nuclei, le strade di ' +
          'frazione e le vie con il nome abbreviato — il punto è quello del centro del paese, ' +
          'e la riga lo dice con la pastiglia «solo il paese». Serve lo stesso, perché «viene ' +
          'da Olivone» è una risposta: ma a quel segnaposto non ci si va in macchina.',
      },
      {
        termine: 'Quando un indirizzo non si trova',
        testo:
          'Resta in cima all’elenco con il suo pulsante «Trova». ' +
          'Quasi sempre è l’indirizzo a essere incompleto: manca il NAP, o il paese, o il ' +
          'numero è quello della casella postale. Si corregge in Classi e si ripreme.',
      },
      {
        termine: 'Quando un punto cade nel posto sbagliato',
        testo:
          'Un indirizzo senza località può risolversi in un altro Cantone. Il cartellino del ' +
          'segnaposto dice che cosa il servizio ha capito: se non torna, si corregge ' +
          'l’indirizzo in Classi e si preme «Rifai gli indirizzi».',
      },
      {
        termine: 'La mappa nella scheda di una persona',
        testo:
          'La scheda personale porta lo stesso riquadro in piccolo, sotto l’anagrafica: casa, '
          + 'azienda e scuola insieme, con la riga del tragitto e le tre distanze scritte in '
          + 'testa. Si trascina e si ingrandisce come quella grande, e «Apri la mappa» porta '
          + 'alla pagina con quel punto aperto.',
      },
      {
        termine: 'Le distanze',
        testo:
          'L’elenco accanto alla mappa mette per prima la persona che sta più lontano dalla ' +
          'sede, in linea d’aria. Non è il tempo di viaggio — quello lo fa l’orario dei treni ' +
          '— ma risponde alla domanda per cui lo si guarda: a chi si può chiedere di ' +
          'fermarsi la sera, e chi ha già un’ora di strada.',
      },
      {
        termine: 'Chi non c’è',
        testo:
          'Chi non ha un indirizzo scritto compare in fondo all’elenco con la sua pastiglia, ' +
          'non sulla mappa. È voluto: una mappa mostra quel che sa, e senza quella riga ' +
          'sembrerebbe che quelle persone non abitino da nessuna parte.',
      },
    ],
  },
  {
    id: 'corsi',
    titolo: 'Corsi',
    simbolo: 'libro',
    vista: 'corsi',
    sommario: 'Che cosa si insegna, a chi, e come sta andando. Un corso alla volta.',
    voci: [
      {
        termine: 'Il selettore in alto',
        testo:
          'Si sceglie il corso e sotto c’è tutto quel che lo riguarda. Un corso alla volta e ' +
          'non l’elenco di tutti: «come va questo corso?» ci si torna ogni settimana.',
      },
      {
        termine: 'I numeri',
        testo:
          `${Molti(PIF)}, ore svolte su previste, UD previste dall’orario e UD già a calendario, ` +
          'presenza e media di classe, valutazioni, piani. Tutti del periodo scelto nella ' +
          'barra in cima.',
      },
      {
        termine: 'Orario fisso',
        testo:
          'Le ore che il corso fa ogni settimana. Da lì si generano le lezioni, e da lì si ' +
          'ricava il monte ore su cui si contano le assenze.',
      },
      {
        termine: `Tabella per ${PIF.singolare}`,
        testo:
          'Assenza, UD di assenza, UD seguite, ritardi, prove fatte, media e nota di fine ' +
          'semestre. È la domanda di metà semestre: come sta andando questa classe in questa ' +
          'materia? La percentuale è di **assenza sulle ore che l’orario prevede** — la stessa ' +
          'del rapporto da consegnare, così non si scopre il numero vero al momento di stampare.',
      },
      {
        termine: 'Da qui non esce niente',
        testo:
          'Presenze, valutazioni, schede, verbali, e anche i CSV: stanno tutti nella pagina ' +
          '**Documenti**, che si sceglie il corso in cima. Qui si tiene il corso — le ore, i ' +
          'conti, l’orario — di là lo si consegna.',
      },
    ],
  },
  {
    id: 'piani',
    titolo: 'Piani lezione',
    simbolo: 'piano',
    vista: 'piani',
    sommario: 'La libreria delle scalette. Un piano si prepara una volta e si assegna a più ore.',
    voci: [
      {
        termine: 'Come si chiama un piano',
        testo:
          'Dalla lezione a cui è appeso: **«3ª lezione»**, e per esteso «I MEC A — Matematica · 3ª lezione». ' +
          'Il numero riparte a ogni semestre, come nel cruscotto. Un piano non ancora assegnato ' +
          'è una **bozza**, e si chiama con il giorno in cui è nata. Non con l’obiettivo né con ' +
          'il titolo della prima tappa: sono le cose che si riscrivono di più mentre si prepara, ' +
          'e l’elenco cambiava sotto le dita. L’argomento resta nella riga piccola, sotto il nome.',
      },
      {
        termine: 'La striscia del tempo',
        testo:
          'La scaletta si vede come una striscia: ci si accorge subito se le attività ci ' +
          'stanno dentro all’ora o no.',
      },
      {
        termine: 'Le tappe',
        testo:
          'Ogni attività ha titolo, durata in UD e un tipo — spiegazione, esercizio, ' +
          'laboratorio, verifica… Il tipo dà il colore e si legge nella striscia.',
      },
      {
        termine: 'Da una tappa nasce una valutazione',
        testo:
          'Una tappa dichiarata «valutazione» fa nascere il momento di valutazione dentro ' +
          'l’ora in cui la prova si fa. È l’unico posto da cui nasce: così il registro sa ' +
          'sempre rispondere a «questa verifica di che tappa era?».',
      },
      {
        termine: 'Risorse',
        testo:
          'File e collegamenti, del piano intero o di una singola tappa. I file finiscono ' +
          'nella documentazione del corso, con il nome della tappa dentro.',
      },
      {
        termine: 'Riuso',
        testo:
          'Un piano si duplica per un altro corso — quello dell’anno scorso è proprio quel ' +
          'che si cerca oggi — e si riaggancia con due clic.',
      },
    ],
  },
  {
    id: 'valutazioni',
    titolo: 'Valutazioni',
    simbolo: 'valutazioni',
    vista: 'valutazioni',
    sommario: `I voti, nella forma con cui si mettono: righe le ${PIF.plurale}, colonne le prove.`,
    voci: [
      {
        termine: 'Si scrive come in un foglio',
        testo:
          'Ci si sposta con le frecce, si scrive il voto e si va avanti. Una casella accetta ' +
          'anche «X» per l’assenza — la stessa sigla dell’appello: un assente non prende ' +
          'zero, esce dalla media, e finisce fra i recuperi.',
      },
      {
        termine: 'Pesi e medie',
        testo:
          'Ogni prova ha un peso; le medie sono pesate e si aggiornano da sole. L’ultima ' +
          'colonna e l’ultima riga sono i due totali che si guardano davvero.',
      },
      {
        termine: 'Si scrive anche da qui',
        testo:
          'La griglia è compilabile in tutte e due le pagine: nell’ora, appena finita la ' +
          'prova, e qui, che è la sola vista da cui si vede l’anno intero — dove si ' +
          'correggono i voti vecchi e si mettono quelli che a un’ora non appartengono. ' +
          'Una «R» accanto alla casella segna i voti che vengono da un recupero: la prova ' +
          'è la stessa, il giorno no, e a giugno una colonna di numeri non lo direbbe.',
      },
      {
        termine: 'Un corso alla volta',
        testo:
          'La griglia è di un corso: mescolare le prove di due materie darebbe un numero che ' +
          'non è la media di niente.',
      },
      {
        termine: 'Nota di fine semestre',
        testo:
          'La media portata sul passo con cui la nota si scrive davvero — di norma mezzi ' +
          'punti. Il passo si cambia dalle Impostazioni.',
      },
      {
        termine: 'Chi era assente',
        testo:
          'La sigla è la stessa dell’appello — «X» — e non serve batterla: se l’appello di ' +
          'quell’ora dice che non c’era, la casella lo mostra già in trasparenza. ' +
          'Scriverla serve solo quando la prova era in un’altra ora, o quando l’appello non ' +
          'c’è.',
      },
      {
        termine: 'Recuperi',
        testo:
          'Sotto le statistiche della prova: chi non c’era, e che cosa se ne fa. Un recupero ' +
          'ha due uscite sole — si rifà, e allora vuole un giorno, oppure non si rifà, e ' +
          'allora va dichiarato. Mettere il voto lo chiude da sé: era quello che doveva ' +
          `produrre. Quel che resta senza data compare fra le ${CARTE.pendenza.plurale} finché non lo si decide.`,
      },
      {
        termine: 'Il giorno del recupero',
        testo:
          'Fissarlo serve a una cosa sola, ma è quella che conta: entrando in aula, il ' +
          'registro della lezione dice «oggi Rossi rifà la verifica del 12». Senza data sarebbe ' +
          'un promemoria che nessuno rilegge.',
      },
      {
        termine: 'Riconsegna',
        testo:
          'Sotto i recuperi: a che punto è la prova. I voti dicono che è corretta, non che ' +
          'la classe l’ha vista — fra le due cose passano regolarmente tre settimane, ed è ' +
          'per questo che «Riconsegnata» è un pulsante e non una conseguenza. Finché nessuno ' +
          `lo preme la prova resta fra le ${CARTE.pendenza.plurale}, che è quel che deve fare: una pila sulla ` +
          'scrivania non chiede niente a nessuno.',
      },
      {
        termine: 'Allegati della prova',
        testo: 'Testo, soluzione, prove corrette dei singoli: finiscono nella cartella del corso.',
      },
      {
        termine: 'La tabella dei recuperi',
        testo:
          `Sotto le statistiche della prova: una riga per ogni ${PIF.singolare} che deve rifarla, con il ` +
          'giorno, il voto che ne è uscito, il giorno in cui ha riavuto la prova corretta e ' +
          'la scansione del suo compito. La riconsegna è sua e non della classe: ' +
          'il suo compito rifatto torna indietro quando è corretto, non il giorno in cui la ' +
          'classe ha riavuto il proprio. Il momento di ' +
          'valutazione resta uno — la prova recuperata è la stessa verifica, con lo stesso ' +
          'peso — e il voto si scrive nella casella della tabella: finisce nella colonna di ' +
          'quella prova e fa media come gli altri. È per averlo che il recupero si fa, ed è ' +
          `quel che chiude la riga. Lo si scrive anche dalla riga delle ${CARTE.pendenza.plurale} e da quella dei ` +
          '«recuperi di oggi» nel registro della lezione, appena finita la prova.',
      },
      {
        termine: 'I documenti del recupero',
        testo:
          'Tre posti, fra gli allegati della prova: il testo del recupero e la sua ' +
          'soluzione — uno per tutti quelli che la rifanno, ed è un altro testo, quindi con ' +
          'una soluzione sua — e la scansione del compito di ciascuno. Si caricano dalla ' +
          `tabella, o dalla finestra del recupero mentre si fissa il giorno; fra le ${CARTE.pendenza.plurale} la ` +
          'graffetta apre la scansione quando c’è già.',
      },
    ],
  },
  {
    id: 'docente',
    titolo: 'Docente di classe',
    simbolo: 'posta',
    sommario:
      'L’altro mestiere: riscuotere documenti, tenere i recapiti, scrivere alle famiglie. ' +
      'Compare solo sulle classi in cui si è spuntato «sono docente di classe».',
    voci: [
      {
        termine: 'Navigazione e comandi',
        testo: 'Scegli Pendenze della classe, Archivio documentale, Assenze o Messaggistica ' +
          'dalla sidebar. La classe si cambia in alto; la barra dei comandi propone le azioni ' +
          'della pagina corrente. Modifiche e operazioni sui singoli elementi restano accanto ' +
          'al loro contenuto. Elenco della classe apre le persone in formazione e la gestione del gruppo.',
      },
      {
        termine: 'Pendenze della classe',
        testo: 'Nuova pendenza aggiunge un’attività personale al corso della classe. ' +
          'Nella riga delle azioni, **Tutte le consegne** — che è quel che si trova aprendo, ' +
          'perché la domanda è come sta la classe — e **Consegne personali**, che isola quel ' +
          'che tocca a chi insegna: la lista della sera prima. Il filtro riguarda le consegne; ' +
          'assenze e momenti di valutazione restano sempre in vista. Senza corsi, creane prima ' +
          'uno dalla pagina Corsi.',
      },
      {
        termine: 'Archivio documentale',
        testo:
          `Che cosa si è chiesto e chi l’ha portato: ${PIF.plurale} in riga, documenti in colonna. ` +
          'Per colonna si vede a che punto è la classe, per riga a che punto è uno.',
      },
      {
        termine: 'Guardare un foglio',
        testo:
          'Premendo una casella piena della matrice — o il nome di un PDF ancora da dividere — ' +
          'il documento si apre nella cornice accanto, dentro il registro. Le due frecce in ' +
          'testa alla cornice passano al foglio dopo e a quello prima, nell’ordine della ' +
          'matrice: venti scansioni si controllano di seguito, senza tornare ogni volta alla ' +
          'casella giusta. Nella stessa testata ci sono il pulsante che lo apre nel programma ' +
          'del sistema — per annotarlo o stamparlo — e quello che lo butta via. Chiudendo la ' +
          'cornice la matrice torna a tutta larghezza.',
      },
      {
        termine: 'Trascinare le pagine sulla casella di chi sono',
        testo:
          'Aprendo un PDF ancora da dividere, la cornice ne mostra le pagine una per una, con ' +
          'dentro quel che c’è scritto davvero; il cursore in alto a destra le ingrandisce, ' +
          'da «quante ne ho» a «che cosa c’è scritto». ' +
          'Premine una per sceglierla — **Ctrl** per aggiungerne altre, anche lontane, ' +
          '**Maiusc** per prendere un tratto — e trascinale sulla casella che incrocia la riga ' +
          'della persona con la colonna del documento — tutta la casella è bersaglio, bordi ' +
          'compresi, e mentre trascini si accendono tutte quelle su cui puoi lasciare. Se il PDF ' +
          'sa già a quale documento appartiene, la colonna non devi mirarla: basta lasciare le ' +
          'pagine in un punto qualsiasi della **riga** di quella persona, e il registro accende ' +
          'la casella in cui finiranno. La casella resta l’unica via per archiviare in una ' +
          'colonna diversa da quella del PDF — capita, quando in un file solo ci sono due ' +
          'pratiche. Anche la riga **Firme di consegna**, in cima alla matrice, prende le ' +
          'pagine: il foglio firme arriva nella stessa scansione di tutto il resto, ed è spesso ' +
          'il primo del mucchio. Quelle pagine vengono ritagliate e ' +
          'archiviate lì, in un documento solo. Se le lasci cadere fuori non succede niente e ' +
          'il registro te lo dice, invece di lasciarti col dubbio. È la via da preferire quando le facciate di ' +
          'una stessa persona non sono di seguito, perché «Dividi a mano» sa dire soltanto ' +
          '«da qui a qui». Una casella già piena non si sovrascrive: prima si toglie quel ' +
          'che c’è. Il pulsante **Leggi** in testa alla cornice passa al lettore di PDF, per ' +
          'quando bisogna proprio leggere invece di smistare.',
      },
      {
        termine: 'Quando la proposta non torna',
        testo:
          'Sulla pagina il registro segna con un rettangolo il punto in cui ha letto il nome, e ' +
          'attaccato al rettangolo scrive che cosa ci ha letto: così il confronto — quel che c’è ' +
          'sul foglio, quel che il registro ne ha capito — si fa senza spostare gli occhi. Il ' +
          'contorno dice anche di chi fidarsi: **pieno** quando il nome sta nel testo del PDF, e ' +
          'allora è esattamente lì; **tratteggiato** quando a leggere è stata la lettura ' +
          'automatica, che restituisce parole e non posizioni, e allora il nome sta da qualche ' +
          'parte dentro la striscia. Sotto la pagina la pastiglia ripete il nome con il simbolo ' +
          'di chi l’ha letto — la lente è la lettura automatica, il foglio è il testo che nel ' +
          'PDF c’era già — oppure dice **da leggere** se la scansione è muta e nessuno l’ha ' +
          'ancora letta, e **nessun nome** se è stata letta senza trovarci nessuno della classe. ' +
          'Con il **tasto destro** su una pagina ci sono ' +
          'i rimedi: rileggerla, assegnarla scegliendo persona e documento, aprirla nel lettore ' +
          'del sistema, o buttarla via se non è di nessuno. Le pagine in coda di lettura si ' +
          'riconoscono dalla pastiglia, e quella che si sta leggendo dalla barra che scorre.',
      },
      {
        termine: 'Rileggere le scansioni',
        testo:
          'In testa alla cornice, **Leggi le scansioni** mette in coda le pagine mute — quelle ' +
          'senza nemmeno una lettera dentro — e accanto **Rileggi** rifà da capo tutte le ' +
          'pagine che restano da smistare di quel PDF, anche quelle che un testo ce l’hanno ' +
          'già: serve quando quel testo non dice niente di utile, come l’intestazione della ' +
          'segreteria ripetuta uguale su trenta fogli. Fra i comandi della pagina, ' +
          '**Rileggi le scansioni** fa la stessa cosa su tutti i PDF della classe in un gesto ' +
          'solo: è la risposta a «ho acceso la lettura automatica a metà lavoro» e a «ho ' +
          'cambiato modello». Chiede conferma perché sono decine di secondi per pagina, dice ' +
          'quante ne sta per macinare, e la coda si ferma quando vuoi. Le pagine già ' +
          'archiviate non vengono toccate: sono documenti nel fascicolo di qualcuno, non più ' +
          'pagine da decidere.',
      },
      {
        termine: 'Le pagine archiviate',
        testo:
          'Una pagina finita nel fascicolo di qualcuno sparisce dallo sfoglio: non è più lavoro ' +
          'da fare. Il pulsante **Archiviate** le rimette in fila, spente, con il nome di chi le ' +
          'ha prese — ed è da lì che si rimedia: tasto destro, **Riprendila**, e il documento ' +
          'esce dal fascicolo mentre le sue pagine tornano fra quelle da smistare.',
      },
      {
        termine: 'Far entrare dei PDF',
        testo:
          'Si trascinano sull’archivio documentale — tutta la pagina è la cassetta — oppure si ' +
          'scelgono con **Carica dei PDF**, fra i comandi della pagina. Non ti viene chiesto ' +
          'niente: a quale documento appartengono lo dici dopo, lasciando le pagine sulla ' +
          'casella giusta. Da quel momento il file sta dentro l’anno — l’originale resta ' +
          'dov’era, e non c’è nessuna cartella da tenere in ordine — e quello appena entrato ' +
          'si apre da sé, a pagine, pronto da smistare.',
      },
      {
        termine: 'Dove tagliare il PDF',
        testo:
          'La tendina in testa alla cornice, che decide le proposte. ' +
          '**Automatica** taglia dove cambia il nome sulle ' +
          'pagine, ed è quel che serve sui PDF della segreteria. **A blocchi** taglia ogni tot ' +
          'pagine — due, tre — ed è la risposta per le scansioni che nessun OCR legge: la ' +
          'regola la sai tu, il registro non la indovinerebbe mai. **A mano** non taglia ' +
          'niente: le pagine le scegli tu, trascinandole. Il modo resta scritto sul PDF e si ' +
          'cambia dalla tendina in testa alla cornice: le proposte si rifanno, quel che è già ' +
          'archiviato resta dov’è.',
      },
      {
        termine: 'Smistamento',
        testo:
          'I PDF ancora da dividere stanno in una riga sopra la matrice: un clic sul nome e le ' +
          'loro pagine compaiono nella cornice. Quel che il registro ha riconosciuto lo dice ' +
          'con il nome scritto sotto la pagina, e **Conferma le proposte** le archivia tutte ' +
          'in un gesto; il resto si trascina. Niente viene archiviato prima di un gesto tuo.',
      },
      {
        termine: 'Dividere a mano',
        testo:
          'Sotto ogni PDF in attesa: si dicono le pagine — da quale a quale — chi e quale ' +
          'documento, e quel pezzo viene archiviato. È la via da usare quando il ' +
          'riconoscimento non arriva, e quando in un file solo ci sono due pratiche diverse: ' +
          'il documento si sceglie qui, e non è per forza quello a cui il PDF era agganciato.',
      },
      {
        termine: 'Assenze da far firmare',
        testo:
          'Tre volte l’anno: il foglio parte, l’e-mail chiede la firma al datore di lavoro, il ' +
          'foglio torna firmato. Le tre colonne sono la stessa cosa a tre momenti, e la ' +
          'casella scura dice sempre la prossima mossa. **Nuovo periodo**, nella riga dei ' +
          'comandi, ne apre uno: il giorno in cui comincia e quello in cui finisce, e ' +
          'nient’altro. Il nome non si chiede — un periodo *sono* le sue due date — e lo ' +
          'ricava il registro: chi sta dentro un semestre ne prende il nome, gli altri si ' +
          'leggono dai loro estremi. Le due date si prendono dal calendario, partono dal ' +
          'semestre di oggi e non escono dall’anno scolastico; entrano nel nome dei file ' +
          'archiviati e nella lettera all’azienda, e la pagina si sposta da sé sul semestre ' +
          'di quel periodo.',
      },
      {
        termine: 'Guardare un rapporto',
        testo:
          'Una casella piena apre il foglio nella cornice accanto alla matrice, come ' +
          'nell’archivio documentale: prima di mandarli all’azienda vanno guardati, e una ' +
          'finestra del lettore di sistema per foglio vuol dire aprirne venti e dare per ' +
          'buoni gli altri cinque. Le frecce in testa passano al foglio dopo e a quello prima ' +
          'nell’ordine della matrice, e accanto ci sono i tre gesti su quel file: aprirlo nel ' +
          'programma del sistema, buttarlo via, chiudere la cornice.',
      },
      {
        termine: 'Comunicazioni',
        testo:
          'Quel che si è scritto alle famiglie, con la data. Il registro ne prepara la ' +
          'bozza — destinatari in copia nascosta, allegati e firma già dentro — e la apre ' +
          'nel programma di posta: a spedirla sei tu, con il tuo account. Poi confermi di ' +
          'averlo fatto, e resta scritto che è partita. Collegando la casella dalle ' +
          'Impostazioni — con l’account Microsoft, il codice da incollare nella pagina che ' +
          'si apre — e ' +
          'accendendo «posta: invio diretto», a spedire è il registro: consegna al server ' +
          'della scuola, chiede conferma una volta per giro, e sa da sé che cosa è partito e ' +
          'che cosa no, uno per uno. Senza casella collegata le comunicazioni escono come ' +
          'file .eml, e a mandarle sei tu.',
      },
      {
        termine: 'Fascicolo',
        testo:
          `Il PDF che si consegna a chi subentra: ${PIF.plurale} con i recapiti, documenti raccolti, ` +
          'periodi di assenze. Si stampa da **Documenti**, nella scheda «Della classe».',
      },
    ],
  },
  {
    id: 'impostazioni',
    titolo: 'Impostazioni',
    simbolo: 'impostazioni',
    vista: 'impostazioni',
    sommario: 'Due mondi separati: quel che è del programma e quel che sta nel documento.',
    voci: [
      {
        termine: 'Programma o Registro',
        testo:
          'I due pulsanti in cima alla riga delle azioni dicono **di chi** sono le impostazioni ' +
          'che si stanno cambiando. **Programma**: restano su questo computer e valgono per ' +
          'tutti i documenti — tema, agenda sul desktop, icona accanto all’orologio, posta, ' +
          'lettura delle scansioni. **Registro**: stanno dentro il documento d’anno e viaggiano ' +
          'con lui — chi lo apre altrove trova la stessa griglia oraria e la stessa scala dei ' +
          'voti.',
      },
      {
        termine: 'Modificata, e come si ritira',
        testo:
          'Nelle impostazioni del programma ogni riga dice se il valore è il predefinito o se ' +
          'è stato deciso a mano: la pastiglia **modificata** dice anche da che cosa. **Ritira** ' +
          'torna al predefinito, e **Ripristina** in cima alla scheda lo fa per tutta la ' +
          'sezione. Il numero accanto al nome della sezione conta quante ne sono state toccate.',
      },
      {
        termine: 'Anni scolastici',
        testo:
          'Ogni anno è una cartella. «Apri quest’anno» non filtra: cambia cartella e ricarica. ' +
          'Materie, scala dei voti e griglia oraria stanno dentro l’anno e si copiano in ' +
          'quello nuovo alla creazione.',
      },
      {
        termine: 'Semestri',
        testo:
          'Le date da scrivere sono tre: quando comincia il primo, quando chiude, quando ' +
          'finisce il secondo. Il secondo parte il giorno dopo il confine, senza che resti un ' +
          'giorno fuori da tutti e due.',
      },
      {
        termine: 'Vacanze e chiusure',
        testo:
          'Hanno una finestra loro. Servono a due cose: nel calendario i giorni si spengono, e ' +
          'la generazione dell’orario li salta — senza, mettere un semestre a calendario ' +
          'vorrebbe dire poi cancellare a mano due settimane di Natale.',
      },
      {
        termine: 'Settimane A e B',
        testo:
          'Dove l’orario è quindicinale: tutte le settimane in griglia, ognuna con le sue due ' +
          'lettere. Ricliccando quella messa si toglie. **Alterna** riempie l’anno da quella ' +
          'marcata in poi, saltando le settimane chiuse — una vacanza non consuma il turno — e ' +
          '**Pulisci** toglie tutto. Nel calendario la lettera si legge e basta.',
      },
      {
        termine: 'Materie',
        testo:
          'Con sigla e colore, e accanto quante classi, corsi e piani le stanno appesi. Due ' +
          'materie nate dalla stessa cosa si possono unire — corsi e piani passano alla ' +
          'superstite — e una si può eliminare: la domanda dice prima, voce per voce, che cosa ' +
          'se ne va insieme.',
      },
      {
        termine: 'Scala dei voti',
        testo:
          'Minimo, massimo, sufficienza, passo. E il passo con cui si scrive la nota di fine ' +
          'semestre, che di solito è più largo di quello dei voti.',
      },
      {
        termine: 'Liste dei menu a tendina',
        testo:
          'Le voci fra cui si sceglie preparando un piano: i tipi di attività, i tipi di ' +
          'prova, come lavora la classe, i supporti della spiegazione. Si rinominano e si ' +
          'riordinano tutte; dove il valore è testo libero — supporti, correzione, come si ' +
          'formano i gruppi, temi della docenza di classe — se ne aggiungono e se ne tolgono. ' +
          'I tipi di attività e di prova no: il programma li legge per decidere quali campi ' +
          'compaiono e come si conta, e uno inventato sarebbe una voce che non fa niente. ' +
          'Togliendo una voce, le tappe che l’avevano scelta restano come sono: la tendina se ' +
          'la ritrova in coda finché qualcuno non ne sceglie un’altra.',
      },
      {
        termine: 'Griglia oraria',
        testo:
          'Da che ora a che ora disegnare la settimana, quali giorni mostrare, quanto durano ' +
          'di norma un’ora e una pausa. I giorni mostrati valgono anche per la proiezione e ' +
          'per l’agenda sul desktop.',
      },
      {
        termine: 'File',
        testo:
          'Quale documento è aperto e dov’è su disco, quanti anni, classi, lezioni e ' +
          'valutazioni contiene, e se tutti i riferimenti fra loro tornano. Da qui si apre un ' +
          'altro registro, si mostra il file nella cartella e si rilegge dal disco.',
      },
    ],
  },
  {
    id: 'date',
    titolo: 'Scrivere le date',
    simbolo: 'orologio',
    sommario: 'I campi data si scrivono come su un foglio, non si compilano casella per casella.',
    voci: [
      {
        termine: 'Che cosa si accetta',
        testo:
          '`7.9.2026`, `7/9/2026`, `7-9-2026`; `7.9.26` per gli anni Duemila; `7.9` prende ' +
          'l’anno che il campo aveva; `12` prende anche il mese; `07092026` e `070926` ' +
          'scritte di fila, come su un modulo.',
      },
      {
        termine: 'Frecce',
        testo:
          '**Su** e **giù** spostano di un giorno, **PagSu** e **PagGiù** di un mese: ' +
          'correggere di uno è la cosa che si fa più spesso.',
      },
      {
        termine: 'Se non si legge',
        testo:
          'Quel che è stato scritto resta e si segna in rosso, invece di essere cancellato. Un ' +
          '31 aprile viene rifiutato, non fatto scivolare al 1° maggio.',
      },
    ],
  },
  {
    id: 'proiezione',
    titolo: 'Proiezione',
    simbolo: 'schermo',
    sommario: 'Lo schermo per la classe: una vista diversa sugli stessi dati, non il registro.',
    voci: [
      {
        termine: 'Che cosa esce',
        testo:
          'Solo quel che il docente ha aperto. Non «nascosto dal foglio di stile»: i blocchi ' +
          'che non sono in vista non entrano proprio nel messaggio che parte verso l’altro ' +
          'schermo.',
      },
      {
        termine: 'Una scheda alla volta',
        testo:
          'Scaletta, argomenti, consegne, calendario — e, da accendere apposta, valutazioni, ' +
          'documenti, appello. Se ne vede una sola, e prende tutto lo schermo: impilate, la ' +
          'classe in fondo all’aula non ne leggeva nessuna.',
      },
      {
        termine: 'Si cambia dal registro',
        testo:
          'Le schede si aprono dalla barra in basso nel pannello del docente, con le frecce ' +
          'o cliccando il nome. Sullo schermo grande non ci sono comandi: un interruttore ' +
          'proiettato è un interruttore che si preme davanti a venti persone.',
      },
      {
        termine: 'Il grafico delle note',
        testo:
          `La scheda Valutazioni mostra la distribuzione dei voti — un punto per ${PIF.singolare}, al ` +
          'suo voto esatto, rosso sotto la sufficienza — ed è **lo stesso grafico** che il ' +
          'registro disegna sotto la griglia e che finisce sul PDF della prova: commentando ' +
          'una verifica sul proiettore e riguardandola sul portatile o sul foglio si trova ' +
          `la stessa forma. Con i nomi accesi, sotto, le ${PIF.plurale} in tabella.`,
      },
      {
        termine: 'I blocchi riservati',
        testo:
          'Valutazioni, documenti e appello parlano dei singoli: partono spenti, e quando ' +
          'sono in vista la barra lo dice in giallo. «Nomi visibili» decide se accanto ai ' +
          'voti e ai documenti mancanti compaiono i nomi.',
      },
      {
        termine: 'Misure strette',
        testo:
          'Di partenza la pagina è compatta: il foglio non scorre — davanti a una classe ' +
          'nessuno può scorrere — e quel che non ci sta non lo legge nessuno. Meglio un ' +
          'carattere un po’ più piccolo e tutto visibile che uno grande e mezzo fuori. Si ' +
          'allarga dal pannello per le aule lunghe, dove le righe da leggere sono poche.',
      },
      {
        termine: 'Pausa',
        testo:
          'Spegne il contenuto lasciando la finestra dov’è e senza perdere il posto: serve ' +
          'nel mezzo dell’ora, quando si passa a scrivere qualcosa che non deve essere letto.',
      },
      {
        termine: 'Il secondo schermo',
        testo:
          'La proiezione si apre in una finestra sua. Con «proiezione: schermo intero» acceso ' +
          'nelle Impostazioni, il registro la mette da sé sul secondo schermo — che in un’aula ' +
          'è il proiettore — e la allarga a schermo intero: non c’è niente da trascinare. ' +
          'Spento, la finestra si apre accanto al registro e la si sposta a mano, il che è ' +
          'quel che serve quando il secondo schermo è un monitor e non un proiettore.',
      },
    ],
  },
  {
    id: 'rapporti',
    titolo: 'Rapporti in PDF',
    simbolo: 'esporta',
    vista: 'documenti',
    sommario: 'Quel che esce dal registro e va in mano ad altri.',
    voci: [
      {
        termine: 'La pagina Documenti',
        testo:
          'Si sceglie un corso e c’è tutto quel che ne può uscire, in tre schede che si ' +
          'scelgono dalla riga delle azioni. ' +
          '**Corso**: presenze e valutazioni (in PDF e in CSV), una scheda per ogni prova, ' +
          'i piani lezione, il fascicolo della classe. ' +
          '**Lezioni**: una matrice, una riga per data e due colonne — **Verbale** e ' +
          '**Piano lezione** — e ogni cella si governa da sé: il piano si stampa prima ' +
          'dell’ora, per portarlo in aula, il verbale dopo, e da una matrice si vede a colpo ' +
          'd’occhio quale delle due colonne è in ritardo. Le ore non ancora concluse ci ' +
          'stanno in grigio, col verbale spento: uscirebbe senza appello e senza consuntivo, ' +
          'e il motivo si legge sul pulsante. Il piano invece si può fare comunque. ' +
          `**${Molti(PIF)}**: la parete delle facce e una scheda a testa. È l’unico posto da ` +
          'cui si stampa: i pulsanti stavano sparsi in cinque pagine, e **consegnare** è un ' +
          'lavoro suo — riguarda venti fogli insieme, e nessuno ricorda dove fosse ogni ' +
          'pulsante.',
      },
      {
        termine: 'Ogni riga dice se quel foglio c’è',
        testo:
          'Accanto a ogni documento c’è un **punto**: pieno vuol dire che il file sta nella ' +
          'cartella, vuoto che è da fare — in una colonna di venticinque righe si contano con ' +
          'l’occhio, senza leggerli. Quanto misura e di che giorno è si leggono fermandosi ' +
          'sopra, e in testa alla cornice per il foglio aperto; in testa a ogni scheda c’è il ' +
          'conto: «18 di 24 nella cartella». Poi tre gesti. La **lente** lo fa vedere *come sta*, che non è ' +
          'sempre quel che il registro direbbe adesso, ed è proprio la differenza che si ' +
          'vuole vedere prima di consegnare — e lo stesso lo fa un clic sulla riga, ovunque ' +
          'lo si dia fuori dai pulsanti. Le **frecce** lo rifanno e lo mettono subito nella ' +
          'cornice: rifare un foglio e guardarlo com’è venuto sono lo stesso gesto, e non si ' +
          'apre più nessun programma fuori dal registro. Il **cestino** lo ' +
          'butta via dalla cartella — si può: sotto `esportazioni/` non c’è niente di unico, ' +
          'i dati restano nel registro — e si vede quando la riga è sotto il puntatore, ' +
          'perché è il gesto che si preme una volta l’anno. Nella riga delle azioni, ' +
          '**Aggiorna tutto** fa in un colpo *tutto* quel che il corso sa stampare: presenze, ' +
          'voti, una scheda per ogni persona e per ogni prova, il verbale di ogni ora svolta, ' +
          'ogni piano lezione, le facce e — per le classi di cui si è docente — il fascicolo. ' +
          'È la cartella da consegnare, riempita per intero; le ore non concluse restano ' +
          'fuori, perché il loro verbale uscirebbe vuoto. Quello non apre niente: sono decine ' +
          'di fogli, e il messaggio dice dove sono andati.',
      },
      {
        termine: 'Le composizioni: più fogli in un PDF solo',
        testo:
          'Davanti a ogni documento che sta nella cartella c’è una **casella**, e in testa a ' +
          'ogni riquadro quella che le spunta tutte. Spuntati i fogli, nella riga delle ' +
          'azioni **Combina i N scelti** chiede come chiamare la composizione e ne fa un PDF ' +
          'solo — le pagine in fila, nell’ordine in cui la pagina le elenca, che la finestra ' +
          'mostra per esteso prima di comporre — che finisce nella ' +
          'cartella come gli altri documenti e si apre nella cornice. È il gesto di chi ' +
          'consegna: venticinque schede vanno in segreteria come un documento, non come ' +
          'venticinque allegati. Ctrl+clic su una riga la spunta, Maiusc+clic spunta fino a ' +
          'lì, come in ogni elenco di file; le spunte attraversano le tre schede, così una ' +
          'composizione può mettere insieme il verbale di un’ora e la scheda di una persona. ' +
          '**Togli le spunte** riparte da zero.',
      },
      {
        termine: 'Una composizione si aggiorna',
        testo:
          'Il registro si ricorda di che cosa è fatta ogni composizione — quali fogli, in che ' +
          'ordine — e lo scrive accanto ai dati dell’anno. Nel riquadro **Composizioni**, che ' +
          'compare quando ce n’è almeno una, ogni riga porta i soliti tre gesti: la lente la ' +
          'guarda, le **frecce la rifanno** con le schede di adesso, il cestino la butta via ' +
          'con il suo elenco — i fogli che la componevano restano dove sono, uno per uno. È ' +
          'la ragione per cui il nome si chiede: le schede cambiano fino all’ultimo giorno, e ' +
          'rifare la composizione non deve voler dire rispuntare venticinque caselle. Anche ' +
          '**Aggiorna tutto** le rifà, dopo aver rifatto i fogli che ci stanno dentro.',
      },
      {
        termine: 'L’anteprima',
        testo:
          'La pagina è in due metà: a sinistra la **barra dei riquadri** — che cosa c’è nella ' +
          'cartella e i gesti per governarlo — e a destra il **foglio che si sta guardando**, ' +
          'che è il corpo della pagina. La **lente** accanto a un documento lo apre lì, ' +
          'grande: è un A4, e in una colonna stretta non si legge. La riga da cui viene resta ' +
          'segnata mentre lo si legge, così in una colonna di venticinque nomi si sa sempre ' +
          'quale si sta guardando. Dentro ' +
          'c’è il lettore di PDF dell’applicazione — pagine, zoom, ricerca nel testo, ' +
          'stampa — e non un programma fuori: controllare venti fogli prima di consegnarli ' +
          'voleva dire venti finestre da ritrovare nella barra delle applicazioni. Il foglio ' +
          'aperto non si riapre da solo mentre lo si legge: la pagina si ridisegna di ' +
          'continuo — un voto salvato, l’orologio che batte — e pagina e ingrandimento ' +
          'restano dove li si era messi. I CSV e i testi vanno invece al foglio di calcolo e ' +
          'all’editor, che è dove si aprono davvero.',
      },
      {
        termine: 'Scorrere i fogli, e governarli da lì',
        testo:
          'In testa all’anteprima c’è **«3 di 12»** e due frecce: sono i documenti della ' +
          'scheda aperta, nell’ordine in cui la pagina li elenca. Controllarne venticinque ' +
          'prima di consegnarli vuol dire scorrerli uno dietro l’altro, non tornare ogni ' +
          'volta alla riga per premere la lente. Accanto stanno i gesti di *questo* foglio — ' +
          'rifarlo, buttarlo via — e il pulsante che lo porta in una finestra sua; **Chiudi** ' +
          'riporta ai riquadri. Erano gesti che stavano solo nella riga di partenza: chi ' +
          'guardava un foglio e vedeva che andava rifatto doveva ritrovare da dove era ' +
          'venuto.',
      },
      {
        termine: 'Qui si gestiscono solo le esportazioni',
        testo:
          'I nomi nelle righe — una data, un piano, una persona — non portano da nessuna ' +
          'parte: da questa pagina non si esce. Premendo una riga si apre il suo documento ' +
          'nella cornice, e nient’altro. Era un clic che portava fuori proprio chi stava ' +
          'mettendo insieme una consegna di venti fogli, ed è il lavoro più facile da perdere ' +
          'a metà. Alle pagine si va dalla barra laterale.',
      },
      {
        termine: 'Si rifanno da soli',
        testo:
          'Un documento nella cartella è una fotografia: nasce giusto e invecchia in silenzio, ' +
          'perché un PDF vecchio non ha l’aria di essere vecchio. Nella riga delle azioni, ' +
          'nel gruppo **Chi li rifà**, si dice chi lo tiene aggiornato — il pulsante acceso è ' +
          'la regola in vigore: **a ogni modifica** che tocca un corso (poco dopo che si è ' +
          'smesso di scrivere, così venti caselle dell’appello lo rifanno una volta sola), ' +
          'oppure **quando si chiude un’ora**, oppure **solo a mano**.',
      },
      {
        termine: 'Quali',
        testo:
          'Verbale dell’ora, piano lezione, presenze del corso, griglia delle valutazioni, ' +
          `scheda ${del(PIF)}, scheda di una singola prova, fascicolo di classe.`,
      },
      {
        termine: 'La scheda di una prova',
        testo:
          'Una prova sola, per esteso: chi ha preso che cosa, chi la deve rifare, quando è ' +
          `stata riconsegnata — e la **distribuzione a punti**: un punto per ${PIF.singolare}, al suo ` +
          'voto esatto, con la riga della media — la sufficienza la dice il colore dei ' +
          'punti, verdi sopra e rossi sotto. ' +
          'La griglia delle valutazioni risponde a «come va il corso» e le prove le mette in ' +
          'colonne strette; questa risponde a «com’è andata *questa* prova», che è la domanda ' +
          'del giorno in cui la si riconsegna. Il grafico è la sola cosa del foglio che non si ' +
          'legge: si guarda — «nove insufficienze su ventidue» si commenta, un ammasso di ' +
          'colonne a sinistra è una prova da rifare.',
      },
      {
        termine: `Che cosa dice la scheda ${del(PIF)}`,
        testo:
          'Il **profitto** — medie per corso, nota di fine semestre, ogni prova con voto, ' +
          'recupero e riconsegna. Le **presenze ora per ora**: la stessa griglia dell’appello, ' +
          'una riga per ora e una colonna per UD, con le sigle che si usano a schermo. Le ' +
          '**annotazioni**: le osservazioni delle ore e le note messe accanto a un voto, in ' +
          'ordine di data, che altrimenti restano sparse una per verbale.',
      },
      {
        termine: 'Sono di un periodo',
        testo:
          `Presenze, valutazioni e scheda ${del(PIF)} sono del semestre scelto; il verbale ` +
          'porta il semestre della sua ora; il fascicolo vale per l’anno. Il periodo sta in ' +
          'testata e nel nome del file.',
      },
      {
        termine: 'Le tre percentuali',
        testo:
          '**% assenza** è quanto si è perso del monte ore che l’orario del corso prevede nel ' +
          'periodo, e **% presenza** è la frequenza: cento meno quella. Le ore ancora da fare ' +
          'non pesano su nessuna delle due — chi non ha mancato niente ha la frequenza piena ' +
          'anche a ottobre. La **% appello** è invece calcolata sulle sole UD con l’appello ' +
          'fatto, e dice quanto le prime due sono affidabili. Accanto c’è la colonna ' +
          '**UD corso**, che è il denominatore in chiaro.',
      },
      {
        termine: 'Recuperi e riconsegne sul foglio',
        testo:
          'Nella griglia delle valutazioni una casella vuota non resta muta: «R 20.10» dice ' +
          'che la prova si rifà quel giorno, «disp.» che non si recupera, «4 R» che quel voto ' +
          'viene da un’altra giornata. Sotto la griglia due elenchi: i recuperi nome per nome ' +
          '— giorno, voto, riconsegna, stato — e le prove che restano da ridare a chi il ' +
          'giorno della riconsegna non c’era. La colonna «Riconsegna» nell’elenco dei momenti ' +
          'dice se il giro è finito — «resa a tutti» — o se qualche foglio è ancora in mano a ' +
          'chi insegna. Sulla scheda personale le stesse due ' +
          'cose: sono quelle che si contestano — «non l’ho mai rifatta», «non me ' +
          'l’hanno mai ridata» — e devono essere scritte, non dedotte.',
      },
      {
        termine: 'Si rifanno da soli',
        testo:
          'Segnando un’ora come svolta, i documenti di quel corso si riscrivono: verbale, ' +
          `presenze, valutazioni e la scheda di ogni ${PIF.singolare}. Nessuno si apre, e un avviso ` +
          'dice quanti ne sono stati rifatti.',
      },
      {
        termine: 'Dove finiscono',
        testo:
          'In `esportazioni/<materia>/<classe>/`, dentro la cartella dell’anno. Accanto c’è ' +
          '`archivio/`, con la stessa struttura, dove sta quel che viene caricato: la ' +
          'differenza è che `esportazioni/` si può cancellare per intero — nessun ' +
          'riferimento ci punta dentro, e tutto quel che contiene si rifà. In tutte e due, ' +
          'due cartelle: `classe/` per i fogli di tutta la classe e `allievi/<Cognome Nome>/` ' +
          'per quelli di una persona sola. Il tipo di documento sta nel nome del file, non ' +
          'in una cartella sua. Sotto `docente-di-classe/` resta quel che riguarda la classe ' +
          'come gruppo: fascicolo, pagelle, autorizzazioni.',
      },
      {
        termine: 'Un rapporto rifatto sovrascrive',
        testo:
          'È una fotografia di com’è il registro adesso: rifarlo vuol dire che quello di ' +
          'prima non serve più. I file tolti vanno nel cestino, non si cancellano sul serio.',
      },
      {
        termine: 'I modelli',
        testo:
          'L’impaginazione sta in `templates/`, in file di testo — e si modificano dalla ' +
          'pagina **Modelli**, sotto «Il programma»: l’elenco dice a che cosa serve ognuno, ' +
          'l’editor segnala riga per riga quel che il registro non capirebbe, e «Prova» ' +
          'compone il foglio sui dati veri senza scriverlo da nessuna parte.',
      },
    ],
  },
  {
    id: 'modelli',
    titolo: 'Modelli',
    simbolo: 'matita',
    vista: 'modelli',
    sommario: 'Com’è fatto ogni foglio che il registro stampa: testata, misure, parole.',
    voci: [
      {
        termine: 'Quattro strati sotto tutti',
        testo:
          '`_base` tiene intestazione e piè di pagina di ogni rapporto, `_stile` le misure — ' +
          'formato del foglio, corpi del testo, altezza delle righe di tabella — `_testi` le ' +
          'frasi e i nomi delle colonne, `_blocchi` i pezzi che più rapporti si dividono. ' +
          'Toccando uno di questi cambiano tutti i fogli insieme: è il motivo per cui ' +
          'esistono, e il motivo per cui stanno in cima all’elenco.',
      },
      {
        termine: 'Un modello per rapporto',
        testo:
          'Sotto gli strati comuni c’è un file per foglio: il verbale, il piano, la griglia ' +
          'dei voti, le presenze, la scheda personale, la scheda di una prova, il fascicolo, ' +
          'la parete di ritratti. Quel che si scrive lì vale solo per quel foglio.',
      },
      {
        termine: 'Che cosa si può mettere dentro',
        testo:
          'Accanto all’editor ci sono i nomi che quel rapporto sa riempire — i `{{segnaposto}}`, ' +
          'le tabelle, gli elenchi, i blocchi — presi dai dati veri e non da un elenco scritto ' +
          'a mano. Premendone uno finisce nel punto in cui si sta scrivendo.',
      },
      {
        termine: 'I problemi, riga per riga',
        testo:
          'Il registro non si ferma mai su un modello storto: salta la riga che non capisce e ' +
          'stampa il resto. Vuol dire che un refuso non si vede — si scopre guardando un PDF a ' +
          'cui manca una tabella — e per questo sotto l’editor c’è l’elenco di quel che verrà ' +
          'saltato. Premendo un problema il cursore va a quella riga.',
      },
      {
        termine: 'Prova, e rimetti quello di serie',
        testo:
          '«Prova» compone il foglio con i dati veri di un corso e lo mostra qui, senza ' +
          'scrivere niente su disco: si guarda com’è venuta la testata prima di salvare. ' +
          '«Rimetti quello di serie» riporta il file alla copia che il registro porta con sé.',
      },
      {
        termine: 'Il logo, e la cartella',
        testo:
          '«Porta un’immagine» copia un PNG o un JPEG in `templates/`: si richiama da un ' +
          'modello con `immagine: logo.jpg | altezza 14 | destra`. «Apri la cartella» resta ' +
          'per chi preferisce lavorarci da fuori: quel che c’è su disco comanda comunque.',
      },
    ],
  },
  {
    id: 'dati',
    titolo: 'Dove stanno i dati',
    simbolo: 'cartella',
    sommario:
      'Un documento per anno scolastico, dentro il workspace. Niente database, niente rete.',
    voci: [
      {
        termine: 'Un anno, un documento',
        testo:
          '`registro/2026-2027.registro` contiene i dati di quell’anno: l’anno con materie e ' +
          'impostazioni, le classi, i corsi, le lezioni, i piani, le valutazioni, i fascicoli, ' +
          'le consegne, gli smistamenti. Si apre con un doppio clic, si copia su una chiavetta ' +
          'e si consegna a chi subentra spostando un file.',
      },
      {
        termine: 'Anche i documenti stanno dentro',
        testo:
          'Le verifiche, le pagelle, i rapporti stampati: tutto dentro il file dell’anno. ' +
          'Aprendone uno il registro ne mette una copia da parte e la apre con il programma ' +
          'di sistema — la copia si butta da sé quando si chiude il registro, e quel che ' +
          'vale resta dentro il documento.',
      },
      {
        termine: 'Quel che resta fuori',
        testo:
          '`bozze/` è dove il programma di posta apre i messaggi da rileggere: è una porta ' +
          'verso un altro programma, e dentro un archivio non ci si trascina niente. I PDF da smistare non ' +
          'passano più da nessuna cartella: entrano dal pannello e stanno nel documento ' +
          'dell’anno da subito.',
      },
      {
        termine: 'Aperto e chiuso',
        testo:
          'Il registro apre il documento all’avvio e lo lascia quando esce; finché lo tiene ' +
          'aperto, accanto compare un file di serratura. Aprendo lo stesso anno da un altro ' +
          'computer il registro lo dice prima, invece di lasciare che chi salva per ultimo ' +
          'copra il lavoro dell’altro.',
      },
      {
        termine: 'Copie di sicurezza',
        testo:
          'Prima di ogni riscrittura la versione precedente finisce in `.storico/`, dentro lo ' +
          'stesso documento, con le ultime dieci per collezione. Serve la prima volta che ci ' +
          'si chiede com’era ieri, e segue il file dovunque lo si porti.',
      },
      {
        termine: 'Si aprono a mano',
        testo:
          'Il documento è un archivio ZIP con dentro i JSON di sempre: rinominandolo in `.zip` ' +
          'lo apre qualunque computer, anche uno che il registro non ce l’ha. Quel che il ' +
          'registro rilegge lo rimette in riga da solo.',
      },
    ],
  },
  {
    id: 'guai',
    titolo: 'Se qualcosa non torna',
    simbolo: 'avviso',
    sommario: 'Dove guardare quando il registro dice che c’è un problema.',
    voci: [
      {
        termine: 'La barra degli avvisi',
        testo:
          'Compare in alto quando un riferimento non torna — un corso che ha perso la ' +
          'materia, una classe senza anno. Se la correzione è fra quelle che non perdono ' +
          'niente, «Ripara» la fa.',
      },
      {
        termine: 'Un file che non si legge',
        testo:
          'Un JSON rotto non azzera il registro: si segnala, quella sola collezione resta ' +
          'vuota, e alla prima modifica viene messa da parte dentro il documento con un altro ' +
          'nome invece di essere coperta. Un documento che non si apre — arrivato a metà da ' +
          'una sincronizzazione — non si apre affatto: il registro lo dice e non ci scrive ' +
          'sopra.',
      },
      {
        termine: 'Un documento che non si apre',
        testo:
          'Il rapporto è stato scritto lo stesso: il messaggio dice dove sta, e in mancanza ' +
          'd’altro il registro lo mostra nella sua cartella.',
      },
      {
        termine: 'Valutazioni sganciate',
        testo:
          'I momenti che nessuna tappa ha fatto nascere si elencano nelle Impostazioni, con ' +
          'quanti voti si porterebbero via: si decide guardandoli, non a scatola chiusa.',
      },
    ],
  },
]

/** Una voce: il gesto in grassetto, la spiegazione di seguito. */
function voceGuida (voce: VoceGuida): HTMLElement {
  return h(
    'li',
    { class: 'guida__voce' },
    h('strong', { class: 'guida__termine' }, voce.termine),
    h('span', { class: 'guida__testo' }, voce.testo),
  )
}

function sezioneGuida (sezione: SezioneGuida): HTMLElement {
  return scheda({
    classe: 'guida__sezione',
    titolo: sezione.titolo,
    sottotitolo: sezione.sommario,
    azioni: sezione.vista
      ? pulsante({
          testo: 'Vai',
          simbolo: 'destra',
          variante: 'sottile',
          titolo: `Apri ${sezione.titolo}`,
          al: () => aggiorna({ vista: sezione.vista }),
        })
      : undefined,
    contenuto: h('ul', { class: 'guida__voci' }, ...sezione.voci.map(voceGuida)),
  })
}

/**
 * L'indice: porta alla sezione senza cambiare pagina.
 *
 * Scorre invece di aprire e chiudere: la guida la si legge cercando una cosa,
 * e un elenco che si richiude a ogni clic obbliga a ritrovare il punto in cui
 * si era.
 */
function indiceGuida (): HTMLElement {
  return h(
    'div',
    { class: 'colonna guida__indice' },
    h('h4', { class: 'guida__indice-titolo' }, 'Indice'),
    h(
      'ul',
      { class: 'guida__indice-voci' },
      ...GUIDA.map((sezione) =>
        h(
          'li',
          null,
          h(
            'button',
            {
              class: 'guida__indice-voce',
              type: 'button',
              onclick: () => {
                document
                  .getElementById(`guida-${sezione.id}`)
                  ?.scrollIntoView({ behavior: andaturaScorrimento(), block: 'start' })
              },
            },
            icona(sezione.simbolo),
            sezione.titolo,
          ),
        ),
      ),
    ),
  )
}

export function vistaGuida (): Figlio {
  return h(
    'div',
    { class: 'vista vista--guida' },
    testataVista({
      titolo: 'Guida',
      sottotitolo: 'che cosa fa ogni pagina, e come si usa',
      contorno: pastiglia(`${GUIDA.length} sezioni`, 'quiete', 'informazione'),
    }),
    h(
      'div',
      { class: 'colonne colonne--guida' },
      indiceGuida(),
      h(
        'div',
        { class: 'colonna' },
        ...GUIDA.map((sezione) =>
          h('div', { class: 'guida__ancora', attr: { id: `guida-${sezione.id}` } }, sezioneGuida(sezione)),
        ),
      ),
    ),
  )
}
