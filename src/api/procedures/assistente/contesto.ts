// Dove sta guardando il registro, detto all'assistente.
//
// La gemella di `proiezione.mira`, per un altro schermo: là si dice a un
// proiettore che cosa mostrare, qui si dice a un modello di che cosa si sta
// parlando. Arriva a ogni cambio di vista e non scrive niente — l'host tiene
// l'ultima e basta — quindi `invariato`, come tutte quelle della proiezione.
//
// Dichiarata `scrittura` perché **entra** nel programma: un processo che
// potesse raccontare al modello un contesto inventato potrebbe fargli leggere
// la classe sbagliata e far dire a una risposta il nome di qualcun altro. La
// sola lettura non concede di scrivere nel programma, nemmeno per una riga di
// contesto.
//
// Lo schema c'è per intero, campo per campo, e non si accorcia: `oggetto()`
// scarta le chiavi che non dichiara, quindi un campo dimenticato qui sparisce
// **in silenzio** — il modello continuerebbe a rispondere, semplicemente senza
// sapere su quale corso.

import { assistente } from '../../../actions/assistant.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import {
  booleano,
  elenco,
  identificatore,
  iso,
  nullabile,
  numero,
  oggetto,
  opzionale,
  scelta,
  testo,
} from '../../schemas.js'
import { VISTE } from '../common/views.js'

/** Una scelta di tendina: come si legge, l'id da passare, e le alternative. */
const VOCE = oggetto({
  campo: testo({ aiuto: 'Come si chiama il campo nella barra: «Corso», «Classe»' }),
  valore: testo({ aiuto: 'Il valore come si legge a schermo: «DIC4a · Matematica»' }),
  id: nullabile(identificatore({ aiuto: 'L’id da passare agli attrezzi, quando ce n’è uno' })),
  // Le altre voci della tendina: dicono **dove si può andare**, non solo dove
  // si è. Senza, «e la terza?» costringeva il modello a chiamare un elenco e a
  // scegliere la riga che gli sembrava.
  opzioni: opzionale(elenco(oggetto({
    valore: testo({ aiuto: 'Come si legge quella voce' }),
    id: nullabile(identificatore({ aiuto: 'L’id di quella voce, quando ne ha uno' })),
  }), { aiuto: 'Che cosa si potrebbe scegliere al posto di quel che è scelto' })),
})

export const procedura = definisci({
  nome: 'assistente.contesto',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Dice all’assistente su che pagina, che scheda e che filtri si sta lavorando',
  azione: 'assistente.contesto',
  idempotente: true,
  collezioni: [],
  ingresso: oggetto({
    // `null` vuol dire «chi chiede non lo vuole dire»: c'è un interruttore nel
    // riquadro dell'assistente, e spento vale quanto una tendina chiusa —
    // l'host butta via l'ultima veduta invece di tenere quella di prima, che
    // sarebbe il modo di rispondere sul corso sbagliato proprio dopo aver
    // dichiarato di non voler dire quale.
    contesto: nullabile(oggetto({
      // `null` tutte e due quando chi chiede ha spento «la pagina che guardo»:
      // è una parte del contesto come le altre, e spegnerla non zittisce il
      // resto — le tendine, i filtri e il periodo restano se li si è lasciati.
      vista: nullabile(scelta(VISTE, { aiuto: 'La pagina aperta' })),
      pagina: nullabile(testo({ aiuto: 'Come si chiama nella barra: «Registro della lezione»' })),
      scheda: nullabile(testo({ aiuto: 'La scheda aperta dentro la pagina: «Appello»' })),
      sezione: nullabile(testo({ aiuto: 'La sezione aperta dentro la scheda: «Assistente»' })),
      scelte: elenco(VOCE, { aiuto: 'Le scelte fatte nelle tendine in cima' }),
      filtri: elenco(VOCE, { aiuto: 'Quel che la pagina sta restringendo' }),
      // Tutti nullabili e tutti richiesti: `null` vuol dire «qui non c'è», non
      // «non lo dico». Un campo che manca lascerebbe chi legge a chiedersi se
      // la pagina non abbia un corso o se il contesto sia arrivato a metà.
      riferimenti: oggetto({
        annoId: nullabile(identificatore()),
        semestreId: nullabile(identificatore()),
        corsoId: nullabile(identificatore()),
        classeId: nullabile(identificatore()),
        lezioneId: nullabile(identificatore()),
        allievoId: nullabile(identificatore()),
        pianoId: nullabile(identificatore()),
        valutazioneId: nullabile(identificatore()),
      }),
      // Il periodo in date **e** il `semestreId` che sta più sopra, perché i
      // due servono a due cose diverse. Le date valgono per ogni lettura che
      // guarda nel tempo; l'id del semestre lo accettano le quattro che contano
      // per periodo — `persone.assenze`, `persone.medie`, `corso.presenze`,
      // `persone.scheda` — e a loro dice «un semestre solo» invece di «tutti,
      // ciascuno a parte». Per un pezzo qui c'era scritto che nessun attrezzo
      // accettava un id di semestre: era vero, e non lo è più.
      // `null` quando chi chiede ha spento quella parte nella testata: vuol
      // dire «rispondi senza restringere», che non è «non c'è un periodo».
      periodo: nullabile(oggetto({
        etichetta: testo({ aiuto: 'Come si legge nella tendina: «2° semestre», «Anno intero»' }),
        dal: nullabile(iso({ aiuto: 'Il primo giorno che conta: si passa come «dal»' })),
        al: nullabile(iso({ aiuto: 'L’ultimo giorno che conta: si passa come «al»' })),
      })),
      data: iso({ aiuto: 'Il giorno che la pagina sta mostrando' }),
      oggi: iso({ aiuto: 'Oggi: la pagina può benissimo non starlo mostrando' }),
      ricerca: nullabile(testo({ aiuto: 'La ricerca battuta nella pagina' })),
      visibili: nullabile(oggetto({
        cosa: testo({ aiuto: 'Di che cosa è l’elenco: «corsi», «persone in formazione»' }),
        quanti: numero({ intero: true, minimo: 0, aiuto: 'Quanti ne mostra in tutto' }),
        ids: elenco(identificatore(), { aiuto: 'Gli id mostrati, nell’ordine in cui si vedono' }),
        troncato: booleano({ aiuto: 'Vero se ne mostra più di quanti se ne sono mandati' }),
      })),
    })),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(assistente['assistente.contesto'], (i: typeof ingresso) => ({
      tipo: 'assistente.contesto' as const, ...i,
    }))(ambito, ingresso),
})
