// Il lavoro aperto, disegnato una volta sola per corso o classe.

import { Fragment, type ReactElement, type ReactNode } from 'react'

import {
  descriviFamiglia,
  FAMIGLIE_TODO,
  nomeFamiglia,
  type FamigliaTodo,
  type TodoClasse,
} from '#core/dominio/todo.js'
import { Icona, type NomeIcona } from '#ui/components/icons.js'
import { classi } from '#ui/classNames.js'
import { gruppoRichiesteFirma, gruppoSegnalazioni } from './absences.js'
import { gruppoConsegne } from './assignments.js'
import { gruppoRecuperi } from './assessments/retakes.js'
import { gruppoRiconsegne, gruppoRiconsegneAllievi } from './assessments/returns.js'
import { testi } from './classTodo.testi.js'

/**
 * Se ogni riga dice di che corso è. Sotto una classe con più materie serve;
 * sotto un corso solo lo dice già la testata, e ripeterlo su ogni riga è rumore.
 */
interface OpzioniCorso { mostraCorso: boolean }

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
function intestazioneFamiglia (todo: TodoClasse, famiglia: FamigliaTodo): ReactElement {
  const conto = todo.conti[famiglia]
  return (
    <header className="todo-famiglia__testata">
      <Icona nome={simboloFamiglia(famiglia)} classe="icona--minuta todo-famiglia__segno" />
      <h4 className="todo-famiglia__titolo">{nomeFamiglia(famiglia)}</h4>
      <span className="todo-famiglia__conto testo-quieto">{descriviFamiglia(famiglia)}</span>
      {conto.urgenti > 0
        ? <span className="todo-famiglia__ritardo">{testi().inRitardo(conto.urgenti)}</span>
        : null}
      <span className="todo-famiglia__aperti">{String(conto.aperti)}</span>
    </header>
  )
}

/**
 * Un gruppo disegnato da un'altra vista, col suo posto fisso nella famiglia:
 * la chiave è il mucchio, non l'indice, così un gruppo che si svuota non
 * presta il nodo al vicino.
 */
function gruppo (chiave: string, disegna: () => ReactNode): ReactElement {
  return <Fragment key={chiave}>{disegna()}</Fragment>
}

/** Una famiglia con dentro i suoi gruppi, o niente se è vuota. */
function famiglia (todo: TodoClasse, quale: FamigliaTodo, conCorso: OpzioniCorso): ReactNode {
  if (todo.conti[quale].aperti === 0) return null

  const t = testi()
  const dentro: ReactElement[] =
    quale === 'assenze'
      ? [
          gruppo('daSpedire', () => gruppoRichiesteFirma(t.daSpedire, todo.assenze.daSpedire)),
          gruppo('inAttesa', () => gruppoRichiesteFirma(t.inAttesaDellaFirma, todo.assenze.inAttesa)),
        ]
      : quale === 'segnalazioni'
        ? [
            // Due mucchi: oltre soglia con l'appello fatto (da segnalare) o per ore senza
            // appello (appello da finire).
            gruppo('daSegnalare', () => gruppoSegnalazioni(
              t.daSegnalare,
              todo.segnalazioni.filter((segnalazione) => segnalazione.confermata),
            )),
            gruppo('appelliIncompleti', () => gruppoSegnalazioni(
              t.appelliIncompleti,
              todo.segnalazioni.filter((segnalazione) => !segnalazione.confermata),
            )),
          ]
        : quale === 'valutazioni'
          ? [
              // Prima quel che nessun automatismo chiude, poi le prove ferme in mano.
              gruppo('recuperiDaFissare', () => gruppoRecuperi(t.recuperiDaFissare, todo.recuperi.daFissare, conCorso)),
              gruppo('recuperiScaduti', () => gruppoRecuperi(t.recuperiNonRifatti, todo.recuperi.scaduti, conCorso)),
              gruppo('recuperiOggi', () => gruppoRecuperi(t.recuperiOggi, todo.recuperi.oggi, conCorso)),
              gruppo('recuperiPresto', () => gruppoRecuperi(t.recuperiSettimana, todo.recuperi.presto, conCorso)),
              gruppo('recuperiAvanti', () => gruppoRecuperi(t.recuperiAvanti, todo.recuperi.avanti, conCorso)),
              gruppo('daCorreggere', () => gruppoRiconsegne(t.daCorreggere, todo.riconsegne.daCorreggere, conCorso)),
              gruppo('daRiconsegnare', () => gruppoRiconsegne(t.daRiconsegnare, todo.riconsegne.daRiconsegnare, conCorso)),
              gruppo('recuperiDaRiconsegnare', () => gruppoRecuperi(t.recuperiDaRiconsegnare, todo.recuperi.daRiconsegnare, conCorso)),
              gruppo('singoli', () => gruppoRiconsegneAllievi(t.daRidareA, todo.singoli, conCorso)),
            ]
          : consegneDella(todo, quale, conCorso)

  return (
    <section
      key={quale}
      className={classi(
        'todo-famiglia',
        `todo-famiglia--${quale}`, // testo-fisso: classe CSS
        todo.conti[quale].urgenti > 0 && 'todo-famiglia--preme',
      )}
    >
      {intestazioneFamiglia(todo, quale)}
      <div className="todo-famiglia__corpo">{dentro}</div>
    </section>
  )
}

/** I mucchi per scadenza di una tipologia di consegne, uguali per tutte e quattro. */
function consegneDella (
  todo: TodoClasse,
  quale: FamigliaTodo,
  conCorso: OpzioniCorso,
): ReactElement[] {
  if (quale === 'assenze' || quale === 'segnalazioni' || quale === 'valutazioni') return []
  const t = testi()
  const gruppi = todo.consegne[quale]
  return [
    gruppo('arretrate', () => gruppoConsegne(t.rimasteIndietro, gruppi.arretrate, 'arretrata', conCorso)),
    gruppo('oggi', () => gruppoConsegne(t.scadonoOggi, gruppi.oggi, 'scade', conCorso)),
    gruppo('presto', () => gruppoConsegne(t.entroSettimana, gruppi.presto, 'aperta', conCorso)),
    gruppo('avanti', () => gruppoConsegne(t.piuAvanti, gruppi.avanti, 'aperta', conCorso)),
  ]
}

/**
 * Le tipologie di una classe, nell'ordine del dominio (`FAMIGLIE_TODO`). Chi
 * chiama le mette in una scheda con il nome della classe o nude, e sa se il
 * corso di ogni riga va detto (`mostraCorso`, di regola sì).
 */
export function sezioniTodoClasse (todo: TodoClasse, mostraCorso = true): ReactNode[] {
  const conCorso = { mostraCorso }
  return FAMIGLIE_TODO.map((quale) => famiglia(todo, quale, conCorso))
}

/** Com'è messa una classe, detto in una riga: è il sottotitolo della sua scheda. */
export function riassuntoClasse (todo: TodoClasse): string {
  const t = testi()
  if (todo.aperti === 0) return t.nienteInSospeso
  const pezzi = [t.coseAperte(todo.aperti)]
  if (todo.urgenti > 0) pezzi.push(t.inRitardo(todo.urgenti))
  return pezzi.join(' · ')
}
