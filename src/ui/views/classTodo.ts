// Il lavoro aperto di una classe, disegnato una volta sola.
//
// Sta qui e non dentro la pagina Todo perché lo leggono in due posti: la
// pagina, dove le classi stanno una sotto l'altra, e il registro di una classe,
// dove c'è solo quella. Sono la stessa domanda fatta da due punti diversi — «che
// cosa mi manca?» — e due disegni diversi vorrebbero dire due conti diversi,
// scoperti il giorno in cui non tornano.
//
// Le tipologie restano separate anche a schermo: una pagella che devo dare e un
// esercizio che aspetto dalla classe si somigliano solo nel fatto di essere in
// elenco, e chi guarda cerca l'una o l'altro, mai tutti e due insieme.

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

/**
 * Di che corso è ogni riga si dice sempre.
 *
 * Sotto la stessa classe stanno matematica e italiano, e una riga che non dice
 * di quale materia parla non si sa dove andare a chiudere — vale nella pagina
 * delle pendenze e vale nel registro di una classe di cui si è docenti, perché
 * anche lì i corsi possono essere due. Era un'opzione, e nessuna delle due
 * pagine l'ha mai passata: il ramo che la spegneva non è mai stato percorso.
 */
const CON_CORSO = { mostraCorso: true } as const

/**
 * Il segno di una tipologia: il gesto, non la categoria.
 *
 * Una firma che deve tornare, un caso da guardare, un voto da mettere, un
 * foglio che passa di mano, una cosa da spuntare. Sta qui e non nella pagina
 * delle pendenze perché lo portano tutti e due i livelli — la riga di
 * riepilogo in cima e il capitolo dentro la classe — ed è quel che li lega:
 * si cerca «le firme» nel riepilogo e si ritrova lo stesso segno più sotto.
 */
export function simboloFamiglia (famiglia: FamigliaTodo): NomeIcona {
  if (famiglia === 'assenze') return 'firma'
  if (famiglia === 'segnalazioni') return 'avviso'
  if (famiglia === 'valutazioni') return 'valutazioni'
  return famiglia === 'consegnaClasse' || famiglia === 'consegnaDocente' ? 'documento' : 'spunta'
}

/**
 * Il titolo di una famiglia, con il suo conto e quel che preme.
 *
 * Il numero è un numero e non una pastiglia: «4 aperte» in un riquadro grigio
 * pesava a schermo quanto «2 in ritardo» in uno rosso, e le due cose non pesano
 * uguale. Adesso il conto sta in fondo alla riga come nel riepilogo in cima, e
 * il ritardo è la sola cosa colorata della testata.
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
      ? h('span', { class: 'todo-famiglia__ritardo' }, `${conto.urgenti} in ritardo`)
      : null,
    h('span', { class: 'todo-famiglia__aperti' }, String(conto.aperti)),
  )
}

/**
 * Una famiglia con dentro i suoi gruppi, o niente se non ha nulla da dire.
 *
 * Il vuoto sparisce e non diventa una riga «nessuna cosa da fare»: un elenco di
 * quattro righe che dicono tutte «niente» è il modo più veloce di rendere
 * illeggibile una pagina che serve a vedere quel che c'è.
 */
function famiglia (todo: TodoClasse, quale: FamigliaTodo): Figlio {
  if (todo.conti[quale].aperti === 0) return null

  const dentro: Figlio[] =
    quale === 'assenze'
      ? [
          gruppoRichiesteFirma('Da spedire', todo.assenze.daSpedire),
          gruppoRichiesteFirma('In attesa della firma', todo.assenze.inAttesa),
        ]
      : quale === 'segnalazioni'
        ? [
          // Due mucchi e non uno: chi è oltre soglia con l'appello fatto è un
          // caso da segnalare, chi lo è per ore senza appello è un appello da
          // finire. Messi insieme, si finirebbe per trattarli allo stesso modo.
            gruppoSegnalazioni(
              'Da segnalare',
              todo.segnalazioni.filter((segnalazione) => segnalazione.confermata),
            ),
            gruppoSegnalazioni(
              'Da guardare: appelli incompleti',
              todo.segnalazioni.filter((segnalazione) => !segnalazione.confermata),
            ),
          ]
        : quale === 'valutazioni'
          ? [
            // Prima quel che nessun automatismo chiude — un recupero da
            // fissare resta lì fino a giugno — poi le prove ferme in mano.
              gruppoRecuperi('Recuperi da fissare', todo.recuperi.daFissare, CON_CORSO),
              gruppoRecuperi('Recuperi non rifatti', todo.recuperi.scaduti, CON_CORSO),
              gruppoRecuperi('Recuperi oggi', todo.recuperi.oggi, CON_CORSO),
              gruppoRecuperi('Recuperi entro la settimana', todo.recuperi.presto, CON_CORSO),
              gruppoRecuperi('Recuperi più avanti', todo.recuperi.avanti, CON_CORSO),
              gruppoRiconsegne('Da correggere', todo.riconsegne.daCorreggere, CON_CORSO),
              gruppoRiconsegne('Da riconsegnare', todo.riconsegne.daRiconsegnare, CON_CORSO),
              gruppoRecuperi('Recuperi da riconsegnare', todo.recuperi.daRiconsegnare, CON_CORSO),
              gruppoRiconsegneAllievi('Da ridare a', todo.singoli, CON_CORSO),
            ]
          : consegneDella(todo, quale)

  return h(
    'section',
    {
      class: [
        'todo-famiglia',
        `todo-famiglia--${quale}`,
        todo.conti[quale].urgenti > 0 && 'todo-famiglia--preme',
      ],
    },
    intestazioneFamiglia(todo, quale),
    h('div', { class: 'todo-famiglia__corpo' }, ...dentro),
  )
}

/**
 * I mucchi per scadenza di una tipologia di consegne.
 *
 * Uguali per tutte e quattro: quel che cambia fra «consegna la classe» e
 * «svolge il docente» è chi deve muoversi, non come si legge una scadenza.
 */
function consegneDella (todo: TodoClasse, quale: FamigliaTodo): Figlio[] {
  if (quale === 'assenze' || quale === 'segnalazioni' || quale === 'valutazioni') return []
  const gruppi = todo.consegne[quale]
  return [
    gruppoConsegne('Rimaste indietro', gruppi.arretrate, 'arretrata', CON_CORSO),
    gruppoConsegne('Scadono oggi', gruppi.oggi, 'scade', CON_CORSO),
    gruppoConsegne('Entro la settimana', gruppi.presto, 'aperta', CON_CORSO),
    gruppoConsegne('Più avanti, o senza termine', gruppi.avanti, 'aperta', CON_CORSO),
  ]
}

/**
 * Le tipologie di una classe, nell'ordine in cui pesano.
 *
 * L'ordine è quello del dominio — prima quel che aspetta gli altri, in fondo
 * quel che tocca a chi tiene il registro — e non si ricopia qui: un secondo
 * elenco si scosta dal primo al primo cambiamento.
 *
 * Chi chiama le mette dove vuole: dentro una scheda con il nome della classe,
 * nella pagina delle pendenze, oppure nude dentro il registro di quella classe,
 * dove il nome sta già in cima alla pagina.
 */
export function sezioniTodoClasse (todo: TodoClasse): Figlio[] {
  return FAMIGLIE_TODO.map((quale) => famiglia(todo, quale))
}

/** Com'è messa una classe, detto in una riga: è il sottotitolo della sua scheda. */
export function riassuntoClasse (todo: TodoClasse): string {
  if (todo.aperti === 0) return 'niente in sospeso'
  const pezzi = [`${todo.aperti} ${todo.aperti === 1 ? 'cosa aperta' : 'cose aperte'}`]
  if (todo.urgenti > 0) pezzi.push(`${todo.urgenti} in ritardo`)
  return pezzi.join(' · ')
}

/**
 * La scheda di una classe: il nome in testata e sotto le sue tipologie.
 *
 * È il blocco della pagina Todo. Il nome della classe in testata e non dentro
 * ogni riga: sono venti righe che parlano tutte della stessa classe, e
 * ripeterlo venti volte è il modo di non farlo leggere nessuna.
 */
export function schedaTodoClasse (todo: TodoClasse): Figlio {
  if (todo.aperti === 0) return null
  return scheda({
    titolo: todo.classe,
    sottotitolo: riassuntoClasse(todo),
    classe: 'todo-classe',
    contenuto: h('div', { class: 'todo-classe__corpo' }, ...sezioniTodoClasse(todo)),
  })
}
