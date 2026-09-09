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

import type { Vista } from '../../protocollo.js'
import { pastiglia, pulsante, scheda, testataVista } from '../componenti/base.js'
import { icona, type NomeIcona } from '../componenti/icone.js'
import { h, type Figlio } from '../dom.js'
import { aggiorna } from '../stato.js'

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
    ],
  },
  {
    id: 'barra',
    titolo: 'La barra laterale',
    simbolo: 'libro',
    sommario: 'Il registro si naviga per corso: ogni materia a una classe è un ramo.',
    voci: [
      {
        termine: 'In cima: calendario e todo',
        testo:
          'Le due pagine che non sono di nessun corso in particolare — quando si fa lezione, ' +
          'e che cosa c’è da fare — e per questo stanno sopra l’elenco dei corsi.',
      },
      {
        termine: 'In mezzo: i corsi',
        testo:
          'Un corso per riga. Aprendone uno compaiono sotto di lui le sue quattro pagine — ' +
          'Registro, Piani lezione, Valutazioni, Documenti — già puntate su quel corso: la ' +
          'materia si sceglie una volta sola, non a ogni cambio di pagina.',
      },
      {
        termine: 'L’elenco segue il semestre',
        testo:
          'La barra elenca i corsi che nel semestre scelto hanno almeno un’ora; il periodo si ' +
          'cambia in fondo, sotto l’anno, ed è scritto accanto al titolo «Corsi». I corsi ' +
          'ancora senza nessuna ora restano sempre in elenco.',
      },
      {
        termine: 'In fondo: gli elenchi',
        testo:
          'Corsi e Classi sono le pagine da cui si crea e si sistema — un corso nuovo, un ' +
          'allievo che arriva, l’orario che cambia — non quelle da cui si lavora: stanno sotto, ' +
          'accanto a Impostazioni e Guida.',
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
        termine: 'Cose aperte',
        testo:
          'Quante cose restano da chiudere in tutte le classi — assenze da far firmare, prove ' +
          'da correggere, documenti da raccogliere — e quante sono in ritardo. Un clic apre il ' +
          'Todo. Sparisce quando non c’è più niente.',
      },
      {
        termine: 'La posta e la rete',
        testo:
          'A destra si legge da dove escono le comunicazioni: dalla casella collegata, da ' +
          'Outlook, o come file .eml. Un clic porta nelle Impostazioni. Staccando la rete la ' +
          'voce diventa **senza rete** in rosso: quel che si scrive nel registro si salva lo ' +
          'stesso sul disco, ma le comunicazioni non partono e le scansioni non si leggono.',
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
        termine: 'Filtro per classe',
        testo:
          'In alto si sceglie una classe e il calendario mostra solo le sue ore. È lo stesso ' +
          'filtro di piani e todo, e si sposta da sé sulla classe del corso che si apre nella ' +
          'barra laterale.',
      },
    ],
  },
  {
    id: 'lezione',
    titolo: 'Registro dell’ora',
    simbolo: 'agenda',
    vista: 'lezione',
    sommario: 'La schermata che si tiene aperta durante la lezione.',
    voci: [
      {
        termine: 'Appello per unità didattica',
        testo:
          'Non «presente o assente all’ora», ma casella per casella: un allievo arrivato alla ' +
          'terza UD è presente da lì in poi. Le caselle non toccate restano «non impostate» e ' +
          'non contano né come presenze né come assenze.',
      },
      {
        termine: 'Stato dell’ora',
        testo:
          '«Segna come svolta» chiude la lezione. Da lì i documenti di quel corso — verbale, ' +
          'presenze, valutazioni, schede allievo — si rifanno da soli.',
      },
      {
        termine: 'Le tre schede',
        testo:
          '**Amministrazione** mentre la classe entra — appello e consegne; **Lezione** ' +
          'durante — la scaletta e le prove; **Annotazioni** dopo, a classe uscita — lo ' +
          'svolgimento e quel che c’è da segnare su qualcuno.',
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
          'Note su un allievo o sulla classe, con un tipo. Finiscono nel verbale e nella ' +
          'scheda dell’allievo.',
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
    titolo: 'Todo',
    simbolo: 'todo',
    vista: 'todo',
    sommario: 'Che cosa ho lasciato in giro? Tutte le consegne insieme, di tutti i corsi.',
    voci: [
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
          'filtro «mie / delle classi», perché sono un debito verso un allievo e lo salda ' +
          'chi insegna. Il pulsante con il calendario le fissa alla prossima ora del corso; ' +
          'la graffetta allega o apre la scansione; la matita apre data, nota e documenti; ' +
          'la crocetta dichiara che non si recuperano.',
      },
      {
        termine: 'Le prove svolte',
        testo:
          'Sotto i recuperi: le verifiche fatte che non sono ancora tornate agli allievi. ' +
          'Compaiono da sé il giorno stesso in cui la prova si svolge, e restano finché non ' +
          'sono chiuse: prima «da correggere» — e quel pezzo si chiude mettendo i voti, non ' +
          'con una spunta — poi «da riconsegnare», che è l’unica cosa che il registro non ' +
          'può dedurre e va detta. La riconsegna è **per allievo**: la riga se ne va da sé ' +
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
          'fino a giugno. Nella scheda Riconsegna c’è una riga per allievo, e nel Todo, sotto ' +
          '«Da ridare a», restano i nomi a cui la prova non è ancora tornata.',
      },
      {
        termine: 'Anche i recuperi si riconsegnano',
        testo:
          'In fondo allo stesso elenco: le prove rifatte che sono state valutate ma non ' +
          'ancora ridate all’allievo. È il pezzo che si perde — messo il voto, il recupero ' +
          'sparisce da tutti gli altri elenchi e il foglio corretto resta nella cartella — e ' +
          'un voto che l’allievo non ha visto non è un voto consegnato. La spunta lo segna ' +
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
    sommario: 'L’anagrafica degli allievi: chi sono e come li si raggiunge.',
    voci: [
      {
        termine: 'Che cosa c’è',
        testo:
          'Nome, indirizzo, e-mail, azienda del tirocinio, e-mail del datore di lavoro. Il ' +
          'nome apre la scheda dell’allievo; la matita apre il modulo con anche tutore e ' +
          'telefono.',
      },
      {
        termine: 'Incolla elenco',
        testo:
          'Un elenco copiato da un foglio o da una mail: «Cognome Nome», «Cognome, Nome», o ' +
          'colonne separate da tabulazione con l’e-mail in fondo. Si accettano tutti e tre ' +
          'invece di chiedere un formato.',
      },
      {
        termine: 'Un ritiro non cancella',
        testo:
          'Togliendo la spunta «Frequenta» l’allievo esce dagli appelli ma resta nello ' +
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
          'Allievi, ore svolte su previste, UD previste dall’orario e UD già a calendario, ' +
          'presenza e media di classe, valutazioni, piani. Tutti del semestre scelto in fondo ' +
          'alla barra.',
      },
      {
        termine: 'Orario fisso',
        testo:
          'Le ore che il corso fa ogni settimana. Da lì si generano le lezioni, e da lì si ' +
          'ricava il monte ore su cui si contano le assenze.',
      },
      {
        termine: 'Tabella per allievo',
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
    sommario: 'I voti, nella forma con cui si mettono: righe gli allievi, colonne le prove.',
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
          'quell’ora dice che l’allievo non c’era, la casella lo mostra già in trasparenza. ' +
          'Scriverla serve solo quando la prova era in un’altra ora, o quando l’appello non ' +
          'c’è.',
      },
      {
        termine: 'Recuperi',
        testo:
          'Sotto le statistiche della prova: chi non c’era, e che cosa se ne fa. Un recupero ' +
          'ha due uscite sole — si rifà, e allora vuole un giorno, oppure non si rifà, e ' +
          'allora va dichiarato. Mettere il voto lo chiude da sé: era quello che doveva ' +
          'produrre. Quel che resta senza data compare nel Todo finché non lo si decide.',
      },
      {
        termine: 'Il giorno del recupero',
        testo:
          'Fissarlo serve a una cosa sola, ma è quella che conta: entrando in aula, il ' +
          'registro dell’ora dice «oggi Rossi rifà la verifica del 12». Senza data sarebbe ' +
          'un promemoria che nessuno rilegge.',
      },
      {
        termine: 'Riconsegna',
        testo:
          'Sotto i recuperi: a che punto è la prova. I voti dicono che è corretta, non che ' +
          'la classe l’ha vista — fra le due cose passano regolarmente tre settimane, ed è ' +
          'per questo che «Riconsegnata» è un pulsante e non una conseguenza. Finché nessuno ' +
          'lo preme la prova resta nel Todo, che è quel che deve fare: una pila sulla ' +
          'scrivania non chiede niente a nessuno.',
      },
      {
        termine: 'Allegati della prova',
        testo: 'Testo, soluzione, prove corrette dei singoli: finiscono nella cartella del corso.',
      },
      {
        termine: 'La tabella dei recuperi',
        testo:
          'Sotto le statistiche della prova: una riga per allievo che deve rifarla, con il ' +
          'giorno, il voto che ne è uscito, il giorno in cui ha riavuto la prova corretta e ' +
          'la scansione del suo compito. La riconsegna è di quell’allievo e non della classe: ' +
          'il suo compito rifatto torna indietro quando è corretto, non il giorno in cui la ' +
          'classe ha riavuto il proprio. Il momento di ' +
          'valutazione resta uno — la prova recuperata è la stessa verifica, con lo stesso ' +
          'peso — e il voto si scrive nella casella della tabella: finisce nella colonna di ' +
          'quella prova e fa media come gli altri. È per averlo che il recupero si fa, ed è ' +
          'quel che chiude la riga. Lo si scrive anche dalla riga del Todo e da quella dei ' +
          '«recuperi di oggi» nel registro dell’ora, appena finita la prova.'
      },
      {
        termine: 'I documenti del recupero',
        testo:
          'Tre posti, fra gli allegati della prova: il testo del recupero e la sua ' +
          'soluzione — uno per tutti quelli che la rifanno, ed è un altro testo, quindi con ' +
          'una soluzione sua — e la scansione del compito di ciascuno. Si caricano dalla ' +
          'tabella, o dalla finestra del recupero mentre si fissa il giorno; nel Todo la ' +
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
        termine: 'Documenti',
        testo:
          'Che cosa si è chiesto e chi l’ha portato: allievi in riga, documenti in colonna. ' +
          'Per colonna si vede a che punto è la classe, per riga a che punto è uno.',
      },
      {
        termine: 'La cassetta dei PDF',
        testo:
          'Si buttano i PDF di classe in «in-arrivo» e il registro li divide da solo. Dentro, ' +
          'una sottocartella per ogni documento aperto: il file lasciato lì sa già a quale ' +
          'richiesta appartiene.',
      },
      {
        termine: 'Smistamento',
        testo:
          'Quel che il registro non ha saputo dividere resta in quarantena, con la sua bozza: ' +
          'si guarda la pagina, si controlla il nome, si conferma. Niente viene archiviato ' +
          'prima di una conferma.',
      },
      {
        termine: 'Assenze da far firmare',
        testo:
          'Tre volte l’anno: il foglio parte, la mail chiede la firma al datore di lavoro, il ' +
          'foglio torna firmato. Le tre colonne sono la stessa cosa a tre momenti, e la ' +
          'casella scura dice sempre la prossima mossa.',
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
          'che cosa no, uno per uno. Senza casella collegata fa lo stesso passando da ' +
          'Outlook, dove c’è.',
      },
      {
        termine: 'Fascicolo',
        testo:
          'Il PDF che si consegna a chi subentra: allievi con i recapiti, documenti raccolti, ' +
          'periodi di assenze. Si stampa da **Documenti**, nella scheda «Della classe».',
      },
    ],
  },
  {
    id: 'impostazioni',
    titolo: 'Impostazioni',
    simbolo: 'impostazioni',
    vista: 'impostazioni',
    sommario: 'Come è fatto l’anno, e le regole che valgono per tutto il registro.',
    voci: [
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
          'lettere. Ricliccando quella messa si toglie. Nel calendario la lettera si legge e ' +
          'basta.',
      },
      {
        termine: 'Materie',
        testo:
          'Con sigla e colore. Due materie nate dalla stessa cosa si possono unire: corsi e ' +
          'piani passano alla superstite.',
      },
      {
        termine: 'Scala dei voti',
        testo:
          'Minimo, massimo, sufficienza, passo. E il passo con cui si scrive la nota di fine ' +
          'semestre, che di solito è più largo di quello dei voti.',
      },
      {
        termine: 'Griglia oraria',
        testo:
          'Da che ora a che ora disegnare la settimana, quali giorni mostrare, quanto durano ' +
          'di norma un’ora e una pausa.',
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
          'La scheda Valutazioni mostra la distribuzione dei voti — un punto per allievo, al ' +
          'suo voto esatto, rosso sotto la sufficienza — ed è **lo stesso grafico** che il ' +
          'registro disegna sotto la griglia e che finisce sul PDF della prova: commentando ' +
          'una verifica sul proiettore e riguardandola sul portatile o sul foglio si trova ' +
          'la stessa forma. Con i nomi accesi, sotto, gli allievi in tabella.',
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
          'Si sceglie un corso e c’è tutto quel che ne può uscire: presenze e valutazioni del ' +
          'corso, una scheda per ogni allievo, un verbale per ogni ora, i piani lezione, il ' +
          'fascicolo della classe, i CSV. È l’unico posto da cui si stampa: i pulsanti stavano ' +
          'sparsi in cinque pagine, e **consegnare** è un lavoro suo — riguarda venti fogli ' +
          'insieme, e nessuno ricorda dove fosse ogni pulsante.',
      },
      {
        termine: 'Si rifanno da soli',
        testo:
          'Un documento nella cartella è una fotografia: nasce giusto e invecchia in silenzio, ' +
          'perché un PDF vecchio non ha l’aria di essere vecchio. In fondo alla pagina si dice ' +
          'chi lo tiene aggiornato: **a ogni modifica** che tocca un corso (poco dopo che si è ' +
          'smesso di scrivere, così venti caselle dell’appello lo rifanno una volta sola), ' +
          'oppure **quando si chiude un’ora**, oppure **solo a mano**.',
      },
      {
        termine: 'Quali',
        testo:
          'Verbale dell’ora, piano lezione, presenze del corso, griglia delle valutazioni, ' +
          'scheda dell’allievo, scheda di una singola prova, fascicolo di classe.',
      },
      {
        termine: 'La scheda di una prova',
        testo:
          'Una prova sola, per esteso: chi ha preso che cosa, chi la deve rifare, quando è ' +
          'stata riconsegnata — e la **distribuzione a punti**: un punto per allievo, al suo ' +
          'voto esatto, con la riga della media — la sufficienza la dice il colore dei ' +
          'punti, verdi sopra e rossi sotto. ' +
          'La griglia delle valutazioni risponde a «come va il corso» e le prove le mette in ' +
          'colonne strette; questa risponde a «com’è andata *questa* prova», che è la domanda ' +
          'del giorno in cui la si riconsegna. Il grafico è la sola cosa del foglio che non si ' +
          'legge: si guarda — «nove insufficienze su ventidue» si commenta, un ammasso di ' +
          'colonne a sinistra è una prova da rifare.',
      },
      {
        termine: 'Che cosa dice la scheda dell’allievo',
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
          'Presenze, valutazioni e scheda dell’allievo sono del semestre scelto; il verbale ' +
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
          'chi insegna. Sulla scheda dell’allievo le stesse due ' +
          'cose, per lui: sono quelle che si contestano — «non l’ho mai rifatta», «non me ' +
          'l’hanno mai ridata» — e devono essere scritte, non dedotte.',
      },
      {
        termine: 'Si rifanno da soli',
        testo:
          'Segnando un’ora come svolta, i documenti di quel corso si riscrivono: verbale, ' +
          'presenze, valutazioni e la scheda di ogni allievo. Nessuno si apre, e un avviso ' +
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
          'L’impaginazione sta in `templates/`, in file di testo che si modificano a mano. ' +
          '`_base.tpl` tiene intestazione e piè di pagina di tutti.',
      },
    ],
  },
  {
    id: 'dati',
    titolo: 'Dove stanno i dati',
    simbolo: 'cartella',
    sommario:
      'File JSON dentro il workspace, una cartella per anno scolastico. Niente database, ' +
      'niente rete.',
    voci: [
      {
        termine: 'Un anno, una cartella',
        testo:
          '`registro/2026-2027/` contiene i dati, la documentazione e la cassetta di ' +
          'quell’anno. Si archivia, si copia su una chiavetta o si consegna spostando una ' +
          'cartella.',
      },
      {
        termine: 'I file',
        testo:
          'In `dati/`: l’anno con materie e impostazioni, le classi, i corsi, le lezioni, i ' +
          'piani, le valutazioni, i fascicoli, le consegne, gli smistamenti. Uno per ' +
          'collezione, così i confronti restano leggibili.',
      },
      {
        termine: 'Copie di sicurezza',
        testo:
          'Prima di ogni riscrittura la versione precedente finisce in `dati/.storico/`, con ' +
          'le ultime dieci per file. Serve la prima volta che ci si chiede com’era ieri.',
      },
      {
        termine: 'Si aprono a mano',
        testo:
          'Sono file di testo: si mettono sotto Git, si sincronizzano con la cartella, e se ' +
          'serve si correggono con un editor. Quel che il registro rilegge lo rimette in riga ' +
          'da solo.',
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
          'vuota, e alla prima modifica il file viene messo da parte con un altro nome invece ' +
          'di essere coperto.',
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
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
