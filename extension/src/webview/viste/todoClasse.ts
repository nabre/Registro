// Il lavoro aperto di una classe, disegnato una volta sola.
//
// Sta qui e non dentro la pagina Todo perché lo leggono in due posti: la
// pagina, dove le classi stanno una sotto l'altra, e il registro di una classe,
// dove c'è solo quella. Sono la stessa domanda fatta da due punti diversi — «che
// cosa mi manca?» — e due disegni diversi vorrebbero dire due conti diversi,
// scoperti il giorno in cui non tornano.
//
// Le quattro famiglie restano separate anche a schermo: una pagella non
// consegnata e un esercizio non spuntato si somigliano solo nel fatto di essere
// in elenco, e chi guarda cerca l'una o l'altro, mai tutti e due insieme.

import {
  descriviFamiglia,
  nomeFamiglia,
  type FamigliaTodo,
  type TodoClasse,
} from '../../dominio/todo.js'
import { pastiglia, scheda } from '../componenti/base.js'
import { h, type Figlio } from '../dom.js'
import { gruppoRichiesteFirma } from './assenze.js'
import { gruppoConsegne } from './consegne.js'
import { gruppoRecuperi } from './recuperi.js'
import { gruppoRiconsegne, gruppoRiconsegneAllievi } from './riconsegne.js'

/** Quel che serve per disegnare: da una pagina all'altra cambia poco. */
export interface OpzioniTodoClasse {
  /**
   * Se dire di che corso è ogni riga.
   *
   * Nella pagina Todo sì: sotto la stessa classe stanno matematica e italiano,
   * e una riga che non dice di quale materia parla non si sa dove andare a
   * chiudere. Nel registro di una classe di cui si è docenti serve lo stesso,
   * perché anche lì i corsi possono essere due.
   */
  mostraCorso?: boolean
}

/** Il titolo di una famiglia, con il suo conto e il tono di quel che preme. */
function intestazioneFamiglia (todo: TodoClasse, famiglia: FamigliaTodo): Figlio {
  const conto = todo.conti[famiglia]
  return h(
    'header',
    { class: 'todo-famiglia__testata' },
    h('h4', { class: 'todo-famiglia__titolo' }, nomeFamiglia(famiglia)),
    h('span', { class: 'todo-famiglia__conto testo-quieto' }, descriviFamiglia(famiglia)),
    conto.urgenti > 0
      ? pastiglia(`${conto.urgenti} in ritardo`, 'negativo')
      : pastiglia(`${conto.aperti} aperte`, 'quiete'),
  )
}

/**
 * Una famiglia con dentro i suoi gruppi, o niente se non ha nulla da dire.
 *
 * Il vuoto sparisce e non diventa una riga «nessuna cosa da fare»: un elenco di
 * quattro righe che dicono tutte «niente» è il modo più veloce di rendere
 * illeggibile una pagina che serve a vedere quel che c'è.
 */
function famiglia (todo: TodoClasse, quale: FamigliaTodo, opzioni: OpzioniTodoClasse): Figlio {
  if (todo.conti[quale].aperti === 0) return null
  const mostraCorso = opzioni.mostraCorso ?? true

  const dentro: Figlio[] =
    quale === 'assenze'
      ? [
          gruppoRichiesteFirma('Da spedire', todo.assenze.daSpedire),
          gruppoRichiesteFirma('In attesa della firma', todo.assenze.inAttesa),
        ]
      : quale === 'valutazioni'
        ? [
            // Prima quel che nessun automatismo chiude — un recupero da
            // fissare resta lì fino a giugno — poi le prove ferme in mano.
            gruppoRecuperi('Recuperi da fissare', todo.recuperi.daFissare, { mostraCorso }),
            gruppoRecuperi('Recuperi non rifatti', todo.recuperi.scaduti, { mostraCorso }),
            gruppoRecuperi('Recuperi oggi', todo.recuperi.oggi, { mostraCorso }),
            gruppoRecuperi('Recuperi entro la settimana', todo.recuperi.presto, { mostraCorso }),
            gruppoRecuperi('Recuperi più avanti', todo.recuperi.avanti, { mostraCorso }),
            gruppoRiconsegne('Da correggere', todo.riconsegne.daCorreggere, { mostraCorso }),
            gruppoRiconsegne('Da riconsegnare', todo.riconsegne.daRiconsegnare, { mostraCorso }),
            gruppoRecuperi('Recuperi da riconsegnare', todo.recuperi.daRiconsegnare, { mostraCorso }),
            gruppoRiconsegneAllievi('Da ridare a', todo.singoli, { mostraCorso }),
          ]
        : [
            gruppoConsegne(
              'Rimaste indietro',
              todo[quale].arretrate,
              'arretrata',
              { mostraCorso },
            ),
            gruppoConsegne('Scadono oggi', todo[quale].oggi, 'scade', { mostraCorso }),
            gruppoConsegne('Entro la settimana', todo[quale].presto, 'aperta', { mostraCorso }),
            gruppoConsegne(
              'Più avanti, o senza termine',
              todo[quale].avanti,
              'aperta',
              { mostraCorso },
            ),
          ]

  return h(
    'section',
    { class: ['todo-famiglia', `todo-famiglia--${quale}`] },
    intestazioneFamiglia(todo, quale),
    h('div', { class: 'todo-famiglia__corpo' }, ...dentro),
  )
}

/**
 * Le quattro famiglie di una classe, nell'ordine in cui pesano.
 *
 * Chi chiama le mette dove vuole: dentro una scheda con il nome della classe,
 * nella pagina Todo, oppure nude dentro il registro di quella classe, dove il
 * nome sta già in cima alla pagina.
 */
export function sezioniTodoClasse (todo: TodoClasse, opzioni: OpzioniTodoClasse = {}): Figlio[] {
  return [
    famiglia(todo, 'assenze', opzioni),
    famiglia(todo, 'valutazioni', opzioni),
    famiglia(todo, 'documenti', opzioni),
    famiglia(todo, 'attivita', opzioni),
  ]
}

/** Com'è messa una classe, detto in una riga: è il sottotitolo della sua scheda. */
export function riassuntoClasse (todo: TodoClasse): string {
  if (todo.aperti === 0) return 'niente in sospeso'
  const pezzi = [`${todo.aperti} ${todo.aperti === 1 ? 'cosa aperta' : 'cose aperte'}`]
  if (todo.urgenti > 0) pezzi.push(`${todo.urgenti} in ritardo`)
  return pezzi.join(' · ')
}

/**
 * La scheda di una classe: il nome in testata e sotto le sue quattro famiglie.
 *
 * È il blocco della pagina Todo. Il nome della classe in testata e non dentro
 * ogni riga: sono venti righe che parlano tutte della stessa classe, e
 * ripeterlo venti volte è il modo di non farlo leggere nessuna.
 */
export function schedaTodoClasse (todo: TodoClasse, opzioni: OpzioniTodoClasse = {}): Figlio {
  if (todo.aperti === 0) return null
  return scheda({
    titolo: todo.classe,
    sottotitolo: riassuntoClasse(todo),
    classe: 'todo-classe',
    contenuto: h('div', { class: 'todo-classe__corpo' }, ...sezioniTodoClasse(todo, opzioni)),
  })
}
