// Le pendenze del corso scelto. Il lavoro trasversale della classe resta nel
// gruppo «Docente di classe»: qui ogni riga ha un solo contesto didattico.

import { Molti } from '../../domain/lexicon.js'
import { lessico } from '../../domain/lexicon.testi.js'
import type { Consegna } from '../../domain/models.js'
import type { Recupero } from '../../domain/retakes.js'
import type { Riconsegna } from '../../domain/returns.js'
import {
  descriviFamiglia,
  FAMIGLIE_CONSEGNA,
  nomeFamiglia,
  todoDelCorso,
  type FamigliaTodo,
  type TodoClasse,
} from '../../domain/todo.js'
import { pulsante, scheda, statoVuoto, testataVista } from '../components/base.js'
import { statoVuotoAnno } from '../components/filters.js'
import { icona } from '../components/icons.js'
import { corsoDelContesto, nomeDelCorso } from '../context.js'
import { h, type Figlio } from '../dom.js'
import { moduloAnno, moduloConsegna } from '../forms.js'
import { annoCorrente, classePerId, stato } from '../state.js'
import { gruppoConsegne } from './assignments.js'
import { sezioniTodoClasse, simboloFamiglia } from './classTodo.js'
import { gruppoRecuperi } from './retakes.js'
import { gruppoRiconsegne } from './returns.js'
import { testi } from './todo.testi.js'

const FAMIGLIE_CORSO: readonly FamigliaTodo[] = [
  'valutazioni',
  'consegnaClasse',
  'svolgeClasse',
  'consegnaDocente',
  'svolgeDocente',
]

function schedaFatto (
  consegne: Consegna[],
  recuperiChiusi: Recupero[],
  proveRese: Riconsegna[],
): Figlio {
  const quanti = consegne.length + recuperiChiusi.length + proveRese.length
  if (quanti === 0) return null
  const t = testi()
  return scheda({
    titolo: t.fatto,
    sottotitolo: t.coseChiuse(quanti),
    aiuto: t.fattoAiuto,
    classe: 'todo-fatto',
    contenuto: h(
      'details',
      { class: 'todo-fatto__corpo' },
      h('summary', null, t.mostraChiuso),
      gruppoRecuperi(t.recuperiChiusi, recuperiChiusi),
      gruppoRiconsegne(t.proveRiconsegnate, proveRese),
      gruppoConsegne(t.consegneFatte, consegne, 'fatta'),
    ),
  })
}

function schedaFamiglia (todo: TodoClasse, famiglia: FamigliaTodo): Figlio {
  const conto = todo.conti[famiglia]
  return h(
    'article',
    {
      class: [
        'todo-sintesi__scheda',
        conto.urgenti > 0 && 'todo-sintesi__scheda--preme',
        conto.aperti === 0 && 'todo-sintesi__scheda--vuota',
      ],
      attr: { title: `${nomeFamiglia(famiglia)}: ${descriviFamiglia(famiglia)}` },
    },
    icona(simboloFamiglia(famiglia), 'icona--minuta'),
    h('h3', { class: 'todo-sintesi__titolo' }, nomeFamiglia(famiglia)),
    h('span', { class: 'todo-sintesi__numero' }, String(conto.aperti)),
    conto.urgenti > 0
      ? h('span', { class: 'todo-sintesi__ritardo' }, testi().inRitardo(conto.urgenti))
      : null,
  )
}

export function vistaTodo (): Figlio {
  const t = testi()
  if (!annoCorrente()) {
    return h(
      'div',
      { class: 'vista vista--todo' },
      statoVuotoAnno({ simbolo: 'spunta', testo: t.senzaAnno, crea: () => moduloAnno() }),
    )
  }

  const corso = corsoDelContesto()
  const classe = corso ? classePerId(corso.classeId) : null
  if (!corso || !classe) {
    return statoVuoto({ simbolo: 'spunta', titolo: t.vuotoTitolo, testo: t.senzaAnno })
  }

  const todo = todoDelCorso(stato.registro, classe, corso, stato.adessoData)
  const chiuse = FAMIGLIE_CONSEGNA.flatMap(
    (famiglia) => todo.consegne[famiglia].completate,
  )

  return h(
    'div',
    { class: 'vista vista--todo' },
    testataVista({
      titolo: Molti(lessico().pendenza),
      sottotitolo: nomeDelCorso(corso),
      compatta: true,
    }),
    h(
      'div',
      { class: 'todo-sintesi' },
      ...FAMIGLIE_CORSO.map((famiglia) => schedaFamiglia(todo, famiglia)),
    ),
    todo.aperti === 0
      ? statoVuoto({
          simbolo: 'spunta',
          titolo: t.vuotoTitolo,
          testo: t.vuotoTesto,
          azione: pulsante({
            testo: t.assegnaPrima,
            variante: 'primario',
            simbolo: 'piu',
            al: () => moduloConsegna({ corsoId: corso.id, corsoFisso: true }),
          }),
        })
      : h('div', { class: 'todo-classe__corpo' }, ...sezioniTodoClasse(todo)),
    schedaFatto(chiuse, todo.recuperi.chiusi, todo.riconsegne.fatte),
  )
}
