import { assistente } from '../../../actions/assistant.js'
import type { BloccoRisultato } from '../../../protocol.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import {
  booleano, elenco, numero, oggetto, opzionale, qualunque, scelta, testo, type Schema,
} from '../../schemas.js'

/**
 * Un turno della conversazione, come si vede.
 *
 * Lo schema c'è per intero — attrezzi compresi — e non si accorcia a «ruolo e
 * testo»: `oggetto()` scarta le chiavi che non dichiara, e uno schema più
 * stretto vorrebbe dire una conversazione che, staccandosi, perde le procedure
 * aperte sotto ogni risposta. Sono la sola cosa che distingue una risposta
 * letta dal registro da una immaginata, e sparirebbero **in silenzio**: la
 * finestra si aprirebbe con le bolle al posto giusto e senza le loro fonti.
 */
/**
 * Quel che una procedura ha letto, già impaginato.
 *
 * I blocchi passano come sono: li compone `api/presentation.ts` da uno schema
 * d'uscita già convalidato, li disegna `ui/assistant/result.ts`, e
 * in mezzo c'è soltanto il trasferimento da una finestra all'altra. Riscrivere
 * qui l'unione dei tre generi di blocco — valori, tabella, elenco — vorrebbe
 * dire una seconda verità da tenere allineata a mano con `BloccoRisultato`, e
 * la seconda verità è quella che resta indietro: al primo genere nuovo, i
 * blocchi di quel genere sparirebbero staccando, in silenzio, che è esattamente
 * il difetto che questo schema serve a non avere.
 */
const RISULTATO = oggetto({
  procedura: testo({ aiuto: 'Chi l’ha letto: «corso.presenze»' }),
  titolo: testo(),
  // Il tipo si riporta con un cast e la forma resta «qualunque»: chi chiama
  // da fuori vede un blocco senza vincoli — ed è onesto, perché nessuno lo
  // convalida — mentre da dentro resta un `BloccoRisultato`, così il gestore
  // e il protocollo si controllano fra loro come prima.
  blocchi: elenco(
    qualunque({ aiuto: 'Un blocco impaginato: valori, tabella o elenco' }) as Schema<BloccoRisultato>,
  ),
})

export const TURNO = oggetto({
  ruolo: scelta(['utente', 'assistente'], { aiuto: 'Chi ha detto questo turno' }),
  testo: testo(),
  attrezzi: opzionale(elenco(oggetto({
    nome: testo({ aiuto: 'La procedura aperta, con il punto: «corso.presenze»' }),
    ok: booleano(),
    codice: opzionale(testo({ aiuto: 'Il codice dell’API, quando non è andata' })),
    // Il perché, con le parole che si leggono. Il codice dice il genere del
    // guasto, questa riga dice quale classe non c'era e dove si prende l'id
    // giusto — ed è l'unica delle due che serva a chi guarda. Senza, staccando
    // restavano le pastiglie rosse e spariva la ragione.
    messaggio: opzionale(testo({ aiuto: 'Perché non è andata, come si legge' })),
  }))),
  // Le tabelle sotto le risposte. Senza questa riga lo schema le scartava, e
  // la finestra nuova si apriva con le bolle al posto giusto e sotto il
  // vuoto: i dati letti dal registro — la sola cosa che distingua una
  // risposta vera da una immaginata — restavano nel riquadro che si stava
  // chiudendo.
  risultati: opzionale(elenco(RISULTATO)),
  guasto: opzionale(booleano({ aiuto: 'Il servizio non ha risposto' })),
  // Gli id già visti. Senza questa riga `oggetto()` li scarterebbe in silenzio,
  // e la finestra staccata ricomincerebbe a cercare per nome quel che la
  // conversazione aveva già imparato — con la conversazione ancora tutta lì,
  // cioè senza nessun segno che qualcosa si fosse perso per strada.
  visti: opzionale(elenco(oggetto({
    id: testo({ aiuto: 'L’identificatore, come si passa a un attrezzo' }),
    nome: testo({ aiuto: 'Come si legge: «Bernasconi Elia»' }),
    cosa: testo({ aiuto: 'Di che cosa è l’id: «allievo», «classe», «corso»' }),
  }))),
  // Chi ha chiesto ha smesso di aspettare: è un gesto voluto e non un guasto,
  // e i due si disegnano diversi. Senza questa riga il turno fermato si
  // staccava come un turno qualunque, e nella finestra nuova non si capiva più
  // che la risposta era stata interrotta a mano.
  fermato: opzionale(booleano({ aiuto: 'Chi ha chiesto ha smesso di aspettare' })),
})

export const procedura = definisci({
  nome: 'assistente.stacca',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Stacca l’assistente in una finestra sua, con la conversazione',
  azione: 'assistente.stacca',
  idempotente: true,
  collezioni: [],
  ingresso: oggetto({
    storia: elenco(TURNO, { aiuto: 'La conversazione che si porta dietro' }),
    // Si stacca a metà di una domanda: è il momento in cui il riquadro sta
    // stretto. Senza questo campo la mezza domanda restava nel campo del
    // riquadro che si chiudeva, e si ribatteva da capo nella finestra nuova.
    bozza: opzionale(testo({ aiuto: 'Quel che è battuto nel campo e non ancora mandato' })),
    // E si stacca soprattutto a metà di una *risposta*: è lì che il riquadro
    // sta più stretto di tutti. Il filo con il modello vive nell'host e non
    // nella pagina — chiudere una finestra non lo ferma — quindi qui non
    // viaggia il giro, viaggia quanto se n'è già visto: l'host lo mette da
    // parte e la finestra nuova lo riprende da lì. Senza, la domanda più lunga
    // era anche l'unica che si perdeva.
    giro: opzionale(oggetto({
      visti: numero({
        intero: true,
        minimo: 0,
        aiuto: 'Quanti eventi di quel giro la finestra che consegna ha già ricevuto',
      }),
      // Con due pagine che chiedono insieme, «quanti eventi» non basta a dire
      // *di quale* giro: l'host sceglieva il più recente, che poteva essere
      // quello dell'altra pagina — e allora la finestra nuova riprendeva da un
      // conto fatto su una conversazione che non era la sua. L'id della busta
      // lo dice senza doverlo indovinare.
      busta: opzionale(numero({
        intero: true,
        minimo: 0,
        aiuto: 'L’id della busta con cui quella pagina aveva chiesto',
      })),
    }, { aiuto: 'La domanda ancora senza risposta, se se ne sta aspettando una' })),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(assistente['assistente.stacca'], (i: typeof ingresso) => ({
      tipo: 'assistente.stacca' as const, ...i,
    }))(ambito, ingresso),
})
