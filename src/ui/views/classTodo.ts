// Il lavoro aperto di una classe, disegnato una volta sola: lo usano la pagina
// Todo e il registro della classe, che devono dare gli stessi conti. Le
// tipologie restano separate anche a schermo.

import {
  descriviFamiglia,
  FAMIGLIE_TODO,
  nomeFamiglia,
  type FamigliaTodo,
  type TodoClasse,
} from '../../domain/todo.js'
import { scheda } from '../components/base.js'
import { icona, type NomeIcona } from '../components/icons.js'
import { h, type Figlio } from '../dom.js'
import { gruppoRichiesteFirma, gruppoSegnalazioni } from './absences.js'
import { gruppoConsegne } from './assignments.js'
import { gruppoRecuperi } from './retakes.js'
import { gruppoRiconsegne, gruppoRiconsegneAllievi } from './returns.js'
import { testi } from './classTodo.testi.js'

/** Di che corso è ogni riga si dice sempre: sotto una classe ci sono più materie. */
const CON_CORSO = { mostraCorso: true } as const

/**
 * Il segno di una tipologia: il gesto, non la categoria. Lo portano sia la riga
 * di riepilogo in cima sia il capitolo dentro la classe.
 */
export function simboloFamiglia (famiglia: FamigliaTodo): NomeIcona {
  if (famiglia === 'assenze') return 'firma'
  if (famiglia === 'segnalazioni') return 'avviso'
  if (famiglia === 'valutazioni') return 'valutazioni'
  return famiglia === 'consegnaClasse' || famiglia === 'consegnaDocente' ? 'documento' : 'spunta'
}

/**
 * Il titolo di una famiglia, con il conto in fondo alla riga (come nel
 * riepilogo) e il ritardo come sola cosa colorata.
 */
function intestazioneFamiglia (todo: TodoClasse, famiglia: FamigliaTodo): Figlio {
  const conto = todo.conti[famiglia]
  return h(
    'header',
    { class: 'todo-famiglia__testata' },
    icona(simboloFamiglia(famiglia), 'icona--minuta todo-famiglia__segno'),
    h('h4', { class: 'todo-famiglia__titolo' }, nomeFamiglia(famiglia)),
    h('span', { class: 'todo-famiglia__conto testo-quieto' }, descriviFamiglia(famiglia)),
    conto.urgenti > 0
      ? h('span', { class: 'todo-famiglia__ritardo' }, testi().inRitardo(conto.urgenti))
      : null,
    h('span', { class: 'todo-famiglia__aperti' }, String(conto.aperti)),
  )
}

/** Una famiglia con dentro i suoi gruppi, o niente se è vuota. */
function famiglia (todo: TodoClasse, quale: FamigliaTodo): Figlio {
  if (todo.conti[quale].aperti === 0) return null

  const t = testi()
  const dentro: Figlio[] =
    quale === 'assenze'
      ? [
          gruppoRichiesteFirma(t.daSpedire, todo.assenze.daSpedire),
          gruppoRichiesteFirma(t.inAttesaDellaFirma, todo.assenze.inAttesa),
        ]
      : quale === 'segnalazioni'
        ? [
          // Due mucchi: oltre soglia con l'appello fatto (da segnalare) o per ore senza
          // appello (appello da finire).
            gruppoSegnalazioni(
              t.daSegnalare,
              todo.segnalazioni.filter((segnalazione) => segnalazione.confermata),
            ),
            gruppoSegnalazioni(
              t.appelliIncompleti,
              todo.segnalazioni.filter((segnalazione) => !segnalazione.confermata),
            ),
          ]
        : quale === 'valutazioni'
          ? [
            // Prima quel che nessun automatismo chiude, poi le prove ferme in mano.
              gruppoRecuperi(t.recuperiDaFissare, todo.recuperi.daFissare, CON_CORSO),
              gruppoRecuperi(t.recuperiNonRifatti, todo.recuperi.scaduti, CON_CORSO),
              gruppoRecuperi(t.recuperiOggi, todo.recuperi.oggi, CON_CORSO),
              gruppoRecuperi(t.recuperiSettimana, todo.recuperi.presto, CON_CORSO),
              gruppoRecuperi(t.recuperiAvanti, todo.recuperi.avanti, CON_CORSO),
              gruppoRiconsegne(t.daCorreggere, todo.riconsegne.daCorreggere, CON_CORSO),
              gruppoRiconsegne(t.daRiconsegnare, todo.riconsegne.daRiconsegnare, CON_CORSO),
              gruppoRecuperi(t.recuperiDaRiconsegnare, todo.recuperi.daRiconsegnare, CON_CORSO),
              gruppoRiconsegneAllievi(t.daRidareA, todo.singoli, CON_CORSO),
            ]
          : consegneDella(todo, quale)

  return h(
    'section',
    {
      class: [
        'todo-famiglia',
        `todo-famiglia--${quale}`, // testo-fisso: classe CSS
        todo.conti[quale].urgenti > 0 && 'todo-famiglia--preme',
      ],
    },
    intestazioneFamiglia(todo, quale),
    h('div', { class: 'todo-famiglia__corpo' }, ...dentro),
  )
}

/** I mucchi per scadenza di una tipologia di consegne, uguali per tutte e quattro. */
function consegneDella (todo: TodoClasse, quale: FamigliaTodo): Figlio[] {
  if (quale === 'assenze' || quale === 'segnalazioni' || quale === 'valutazioni') return []
  const t = testi()
  const gruppi = todo.consegne[quale]
  return [
    gruppoConsegne(t.rimasteIndietro, gruppi.arretrate, 'arretrata', CON_CORSO),
    gruppoConsegne(t.scadonoOggi, gruppi.oggi, 'scade', CON_CORSO),
    gruppoConsegne(t.entroSettimana, gruppi.presto, 'aperta', CON_CORSO),
    gruppoConsegne(t.piuAvanti, gruppi.avanti, 'aperta', CON_CORSO),
  ]
}

/**
 * Le tipologie di una classe, nell'ordine del dominio (`FAMIGLIE_TODO`). Chi
 * chiama le mette in una scheda con il nome della classe o nude.
 */
export function sezioniTodoClasse (todo: TodoClasse): Figlio[] {
  return FAMIGLIE_TODO.map((quale) => famiglia(todo, quale))
}

/** Com'è messa una classe, detto in una riga: è il sottotitolo della sua scheda. */
export function riassuntoClasse (todo: TodoClasse): string {
  const t = testi()
  if (todo.aperti === 0) return t.nienteInSospeso
  const pezzi = [t.coseAperte(todo.aperti)]
  if (todo.urgenti > 0) pezzi.push(t.inRitardo(todo.urgenti))
  return pezzi.join(' · ')
}

/** La scheda di una classe per la pagina Todo: il nome in testata e sotto le sue tipologie. */
export function schedaTodoClasse (todo: TodoClasse): Figlio {
  if (todo.aperti === 0) return null
  return scheda({
    titolo: todo.classe,
    sottotitolo: riassuntoClasse(todo),
    classe: 'todo-classe',
    contenuto: h('div', { class: 'todo-classe__corpo' }, ...sezioniTodoClasse(todo)),
  })
}
