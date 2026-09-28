// Le pendenze nell'agenda: raggruppate per corso (insegnamento) o per classe (docente di classe).

import { Molti } from '../../../core/dominio/lexicon.js'
import { lessico } from '../../../core/dominio/lexicon.testi.js'
import type { Consegna } from '../../../core/dominio/models.js'
import type { Recupero } from '../../../core/dominio/retakes.js'
import type { Riconsegna } from '../../../core/dominio/returns.js'
import {
  descriviFamiglia,
  FAMIGLIE_CONSEGNA,
  FAMIGLIE_TODO,
  nomeFamiglia,
  todoDelCorso,
  todoDelDocenteDiClasse,
  type FamigliaTodo,
  type TodoClasse,
} from '../../../core/dominio/todo.js'
import { parole } from '../../../core/dominio/words.testi.js'
import { pastiglia, pulsante, quieto, scheda, statoVuoto, testataVista } from '../components/base.js'
import { statoVuotoAnno } from '../components/filters.js'
import { icona, type NomeIcona } from '../components/icons.js'
import { nomeDelCorso } from '../context.js'
import { h, type Figlio } from '../dom.js'
import { moduloAnno, moduloConsegna } from '../forms.js'
import {
  aggiorna,
  annoCorrente,
  classePerId,
  classiDellAnno,
  classiDiCuiSonoDocente,
  corsiDellAnnoAperto,
  corsiDi,
  stato,
} from '../state.js'
import { gruppoConsegne } from './assignments.js'
import { riassuntoClasse, sezioniTodoClasse, simboloFamiglia } from './classTodo.js'
import { gruppoRecuperi } from './retakes.js'
import { gruppoRiconsegne } from './returns.js'
import { testi } from './todo.testi.js'

// testo-fisso: prefisso identificatore interno scheda corso
const idSchedaCorso = (id: string) => `corso:${id}`
// testo-fisso: prefisso identificatore interno scheda classe
const idSchedaClasse = (id: string) => `classe:${id}`
// testo-fisso: selettore fuoco tab corso
const fuocoTabCorso = (id: string) => `todo-tab-corso:${id}`
// testo-fisso: selettore fuoco tab classe
const fuocoTabClasse = (id: string) => `todo-tab-classe:${id}`
// testo-fisso: selettore fuoco categoria
const fuocoCat = (id: string) => `todo-cat-${id}`
// testo-fisso: selettore fuoco sottocategoria
const fuocoSotto = (id: string) => `todo-sotto-${id}`

const FAMIGLIE_CORSO: readonly FamigliaTodo[] = [
  'valutazioni',
  'consegnaClasse',
  'svolgeClasse',
  'consegnaDocente',
  'svolgeDocente',
]

const FAMIGLIE_CLASSE_DOCENTE: readonly FamigliaTodo[] = [
  'assenze',
  'segnalazioni',
  ...FAMIGLIE_CONSEGNA,
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

function schedaFamiglia (
  conto: { aperti: number; urgenti: number },
  famiglia: FamigliaTodo,
): Figlio {
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

interface VoceNavigazione {
  id: string
  titolo: string
  simbolo: NomeIcona
  conto: number
  urgenti: number
  fuoco?: string
  al: () => void
}

function barraNavigazioneTodo (
  categorie: VoceNavigazione[],
  categoriaAttiva: string,
  sottovoci: VoceNavigazione[] | null,
  sottovoceAttiva: string | null,
): HTMLElement {
  const t = testi()
  return h(
    'div',
    { class: 'todo-navigazione' },
    h(
      'div',
      { class: 'todo-schede' },
      h(
        'div',
        {
          class: 'selettore',
          attr: { role: 'tablist', 'aria-label': t.titoloSelettore },
        },
        ...categorie.map((voce) => {
          const accesa = voce.id === categoriaAttiva
          return h(
            'button',
            {
              class: ['selettore__voce', accesa && 'selettore__voce--attiva'],
              type: 'button',
              role: 'tab',
              dataset: { fuoco: voce.fuoco ?? fuocoCat(voce.id) },
              attr: {
                'aria-selected': String(accesa),
                title:
                  voce.conto > 0
                    ? `${voce.titolo} (${t.coseAperte(voce.conto)}${voce.urgenti > 0 ? ` · ${t.inRitardo(voce.urgenti)}` : ''})`
                    : voce.titolo,
              },
              onclick: voce.al,
            },
            icona(voce.simbolo, 'icona--minuta'),
            h('span', null, voce.titolo),
            voce.conto > 0
              ? h(
                  'span',
                  {
                    class: 'pastiglia pastiglia--minuta pastiglia--quiete',
                    style: { marginLeft: '4px' },
                  },
                  String(voce.conto),
                )
              : null,
          )
        }),
      ),
    ),
    sottovoci && sottovoci.length > 0
      ? h(
          'div',
          { class: 'todo-sottoschede' },
          h(
            'div',
            {
              class: 'selettore',
              attr: { role: 'tablist', 'aria-label': t.titoloSottoSelettore },
            },
            ...sottovoci.map((voce) => {
              const accesa = voce.id === sottovoceAttiva
              return h(
                'button',
                {
                  class: ['selettore__voce', accesa && 'selettore__voce--attiva'],
                  type: 'button',
                  role: 'tab',
                  dataset: { fuoco: voce.fuoco ?? fuocoSotto(voce.id) },
                  attr: {
                    'aria-selected': String(accesa),
                    title:
                      voce.conto > 0
                        ? `${voce.titolo} (${t.coseAperte(voce.conto)}${voce.urgenti > 0 ? ` · ${t.inRitardo(voce.urgenti)}` : ''})`
                        : voce.titolo,
                  },
                  onclick: voce.al,
                },
                icona(voce.simbolo, 'icona--minuta'),
                h('span', null, voce.titolo),
                voce.conto > 0
                  ? h(
                      'span',
                      {
                        class: 'pastiglia pastiglia--minuta pastiglia--quiete',
                        style: { marginLeft: '4px' },
                      },
                      String(voce.conto),
                    )
                  : null,
              )
            }),
          ),
        )
      : null,
  )
}

function unisciContiFamiglia (
  todos: TodoClasse[],
  famiglie: readonly FamigliaTodo[],
): Record<FamigliaTodo, { aperti: number; urgenti: number }> {
  const conti: Record<FamigliaTodo, { aperti: number; urgenti: number }> = {
    assenze: { aperti: 0, urgenti: 0 },
    segnalazioni: { aperti: 0, urgenti: 0 },
    valutazioni: { aperti: 0, urgenti: 0 },
    consegnaClasse: { aperti: 0, urgenti: 0 },
    svolgeClasse: { aperti: 0, urgenti: 0 },
    consegnaDocente: { aperti: 0, urgenti: 0 },
    svolgeDocente: { aperti: 0, urgenti: 0 },
  }
  for (const todo of todos) {
    for (const famiglia of famiglie) {
      conti[famiglia].aperti += todo.conti[famiglia].aperti
      conti[famiglia].urgenti += todo.conti[famiglia].urgenti
    }
  }
  return conti
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

  const classi = classiDellAnno()
  const corsi = corsiDellAnnoAperto()
  const classiDocente = classiDiCuiSonoDocente()

  if (corsi.length === 0 && classi.length === 0) {
    return statoVuoto({ simbolo: 'spunta', titolo: t.vuotoTitolo, testo: t.senzaAnno })
  }

  const todoCorsi = new Map<string, TodoClasse>()
  let totaleCorsiAperti = 0
  let totaleCorsiUrgenti = 0
  for (const corso of corsi) {
    const classe = classePerId(corso.classeId)
    if (classe) {
      const todo = todoDelCorso(stato.registro, classe, corso, stato.adessoData)
      todoCorsi.set(corso.id, todo)
      totaleCorsiAperti += todo.aperti
      totaleCorsiUrgenti += todo.urgenti
    }
  }

  const todoClassiDocente = new Map<string, TodoClasse>()
  let totaleClassiAperti = 0
  let totaleClassiUrgenti = 0
  for (const classe of classiDocente) {
    const todo = todoDelDocenteDiClasse(
      stato.registro,
      classe,
      corsiDi(classe.id),
      stato.adessoData,
    )
    todoClassiDocente.set(classe.id, todo)
    totaleClassiAperti += todo.aperti
    totaleClassiUrgenti += todo.urgenti
  }

  const totaleGlobaleAperti = totaleCorsiAperti + totaleClassiAperti
  const totaleGlobaleUrgenti = totaleCorsiUrgenti + totaleClassiUrgenti

  // Risoluzione stato e navigazione
  const schedaRichiesta = stato.schedaTodo || 'tutte'
  let categoriaAttiva = 'tutte'
  let sottovoceAttiva: string | null = null

  if (schedaRichiesta === 'corsi' || schedaRichiesta.startsWith('corso:')) {
    categoriaAttiva = 'corsi'
    sottovoceAttiva = schedaRichiesta
    if (schedaRichiesta.startsWith('corso:') && !todoCorsi.has(schedaRichiesta.slice(6))) {
      sottovoceAttiva = 'corsi'
    }
  } else if (
    classiDocente.length > 0 &&
    (schedaRichiesta === 'classi' || schedaRichiesta.startsWith('classe:'))
  ) {
    categoriaAttiva = 'classi'
    sottovoceAttiva = schedaRichiesta
    if (schedaRichiesta.startsWith('classe:') && !todoClassiDocente.has(schedaRichiesta.slice(7))) {
      sottovoceAttiva = 'classi'
    }
  } else {
    categoriaAttiva = 'tutte'
    sottovoceAttiva = 'tutte'
  }

  // Categorie principali di navigazione
  const categorie: VoceNavigazione[] = [
    {
      id: 'tutte',
      titolo: parole().tutte,
      simbolo: 'spunta',
      conto: totaleGlobaleAperti,
      urgenti: totaleGlobaleUrgenti,
      fuoco: 'todo-tab-tutte',
      al: () => aggiorna({ schedaTodo: 'tutte' }),
    },
    {
      id: 'corsi',
      titolo: t.corsi,
      simbolo: 'libro',
      conto: totaleCorsiAperti,
      urgenti: totaleCorsiUrgenti,
      fuoco: 'todo-tab-corsi',
      al: () => aggiorna({ schedaTodo: 'corsi' }),
    },
  ]

  if (classiDocente.length > 0) {
    categorie.push({
      id: 'classi',
      titolo: t.docenteDiClasse,
      simbolo: 'classi',
      conto: totaleClassiAperti,
      urgenti: totaleClassiUrgenti,
      fuoco: 'todo-tab-classi',
      al: () => aggiorna({ schedaTodo: 'classi' }),
    })
  }

  // Sottovoci
  let sottovoci: VoceNavigazione[] | null = null
  if (categoriaAttiva === 'corsi') {
    sottovoci = [
      {
        id: 'corsi',
        titolo: t.tuttiICorsi,
        simbolo: 'libro',
        conto: totaleCorsiAperti,
        urgenti: totaleCorsiUrgenti,
        fuoco: 'todo-tab-tutti-corsi',
        al: () => aggiorna({ schedaTodo: 'corsi' }),
      },
      ...corsi.map((corso) => {
        const todo = todoCorsi.get(corso.id)
        return {
          id: idSchedaCorso(corso.id),
          titolo: nomeDelCorso(corso),
          simbolo: 'libro',
          conto: todo?.aperti ?? 0,
          urgenti: todo?.urgenti ?? 0,
          fuoco: fuocoTabCorso(corso.id),
          al: () => aggiorna({ schedaTodo: idSchedaCorso(corso.id), corsoId: corso.id }),
        }
      }),
    ]
  } else if (categoriaAttiva === 'classi') {
    sottovoci = [
      ...(classiDocente.length > 1
        ? [
            {
              id: 'classi',
              titolo: t.tutteLeClassi,
              simbolo: 'classi',
              conto: totaleClassiAperti,
              urgenti: totaleClassiUrgenti,
              fuoco: 'todo-tab-tutte-classi',
              al: () => aggiorna({ schedaTodo: 'classi' }),
            },
          ]
        : []),
      ...classiDocente.map((classe) => {
        const todo = todoClassiDocente.get(classe.id)
        return {
          id: idSchedaClasse(classe.id),
          titolo: t.docenteDiClasseEtichetta(classe.nome),
          simbolo: 'classi',
          conto: todo?.aperti ?? 0,
          urgenti: todo?.urgenti ?? 0,
          fuoco: fuocoTabClasse(classe.id),
          al: () => aggiorna({ schedaTodo: idSchedaClasse(classe.id) }),
        }
      }),
    ]
  }

  const barraNav = barraNavigazioneTodo(categorie, categoriaAttiva, sottovoci, sottovoceAttiva)

  // 1. Vista Corso Singolo
  if (sottovoceAttiva && sottovoceAttiva.startsWith('corso:')) {
    const corsoId = sottovoceAttiva.slice(6)
    const corso = corsi.find((c) => c.id === corsoId)
    const todo = todoCorsi.get(corsoId)
    if (!corso || !todo) {
      return statoVuoto({ simbolo: 'spunta', titolo: t.vuotoTitolo, testo: t.nessunaPendenzaTesto })
    }

    const chiuse = FAMIGLIE_CONSEGNA.flatMap((famiglia) => todo.consegne[famiglia].completate)

    return h(
      'div',
      { class: 'vista vista--todo' },
      testataVista({
        titolo: Molti(lessico().pendenza),
        sottotitolo: nomeDelCorso(corso),
        contorno: todo.aperti > 0 ? pastiglia(t.coseAperte(todo.aperti), 'quiete') : null,
        compatta: true,
      }),
      barraNav,
      h(
        'div',
        { class: 'todo-sintesi' },
        ...FAMIGLIE_CORSO.map((famiglia) => schedaFamiglia(todo.conti[famiglia], famiglia)),
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

  // 2. Vista Classe Singola (Docente di classe)
  if (sottovoceAttiva && sottovoceAttiva.startsWith('classe:')) {
    const classeId = sottovoceAttiva.slice(7)
    const classe = classiDocente.find((c) => c.id === classeId)
    const todo = todoClassiDocente.get(classeId)
    if (!classe || !todo) {
      return statoVuoto({ simbolo: 'spunta', titolo: t.vuotoTitolo, testo: t.nessunaPendenzaTesto })
    }

    const chiuse = FAMIGLIE_CONSEGNA.flatMap((famiglia) => todo.consegne[famiglia].completate)

    return h(
      'div',
      { class: 'vista vista--todo' },
      testataVista({
        titolo: Molti(lessico().pendenza),
        sottotitolo: t.docenteDiClasseEtichetta(classe.nome),
        contorno: todo.aperti > 0 ? pastiglia(t.coseAperte(todo.aperti), 'quiete') : null,
        compatta: true,
      }),
      barraNav,
      h(
        'div',
        { class: 'todo-sintesi' },
        ...FAMIGLIE_CLASSE_DOCENTE.map((famiglia) =>
          schedaFamiglia(todo.conti[famiglia], famiglia),
        ),
      ),
      todo.aperti === 0
        ? statoVuoto({
            simbolo: 'spunta',
            titolo: t.vuotoTitolo,
            testo: t.vuotoTestoDocenteClasse,
            azione: pulsante({
              testo: t.assegnaPrima,
              variante: 'primario',
              simbolo: 'piu',
              al: () => moduloConsegna({ classeId: classe.id, ambito: 'classe' }),
            }),
          })
        : h('div', { class: 'todo-classe__corpo' }, ...sezioniTodoClasse(todo)),
      schedaFatto(chiuse, todo.recuperi.chiusi, todo.riconsegne.fatte),
    )
  }

  // 3. Vista Tutti i Corsi
  if (categoriaAttiva === 'corsi') {
    const tuttiCorsiTodo = Array.from(todoCorsi.values())
    const contiCorsi = unisciContiFamiglia(tuttiCorsiTodo, FAMIGLIE_CORSO)
    const chiuseCorsi = tuttiCorsiTodo.flatMap((todo) =>
      FAMIGLIE_CONSEGNA.flatMap((famiglia) => todo.consegne[famiglia].completate),
    )
    const recuperiChiusiCorsi = tuttiCorsiTodo.flatMap((todo) => todo.recuperi.chiusi)
    const riconsegneFatteCorsi = tuttiCorsiTodo.flatMap((todo) => todo.riconsegne.fatte)

    const schedeCorsi: Figlio[] = []
    for (const corso of corsi) {
      const todo = todoCorsi.get(corso.id)
      if (todo && todo.aperti > 0) {
        schedeCorsi.push(
          scheda({
            titolo: nomeDelCorso(corso),
            sottotitolo: riassuntoClasse(todo),
            classe: 'todo-corso-scheda',
            azioni: pulsante({
              testo: parole().apri,
              variante: 'sottile',
              al: () => aggiorna({ schedaTodo: idSchedaCorso(corso.id), corsoId: corso.id }),
            }),
            contenuto: h('div', { class: 'todo-classe__corpo' }, ...sezioniTodoClasse(todo)),
          }),
        )
      }
    }

    return h(
      'div',
      { class: 'vista vista--todo' },
      testataVista({
        titolo: Molti(lessico().pendenza),
        sottotitolo: t.corsiAiuto,
        contorno: totaleCorsiAperti > 0 ? pastiglia(t.coseAperte(totaleCorsiAperti), 'quiete') : null,
        compatta: true,
      }),
      barraNav,
      h(
        'div',
        { class: 'todo-sintesi' },
        ...FAMIGLIE_CORSO.map((famiglia) => schedaFamiglia(contiCorsi[famiglia], famiglia)),
      ),
      totaleCorsiAperti === 0
        ? statoVuoto({
            simbolo: 'spunta',
            titolo: t.vuotoTitolo,
            testo: t.vuotoTestoCorsi,
            azione: pulsante({
              testo: t.assegnaPrima,
              variante: 'primario',
              simbolo: 'piu',
              al: () => moduloConsegna(),
            }),
          })
        : h('div', { class: 'todo-classi' }, ...schedeCorsi),
      schedaFatto(chiuseCorsi, recuperiChiusiCorsi, riconsegneFatteCorsi),
    )
  }

  // 4. Vista Tutta la Docenza di Classe
  if (categoriaAttiva === 'classi') {
    const tutteClassiTodo = Array.from(todoClassiDocente.values())
    const contiClassi = unisciContiFamiglia(tutteClassiTodo, FAMIGLIE_CLASSE_DOCENTE)
    const chiuseClassi = tutteClassiTodo.flatMap((todo) =>
      FAMIGLIE_CONSEGNA.flatMap((famiglia) => todo.consegne[famiglia].completate),
    )
    const recuperiChiusiClassi = tutteClassiTodo.flatMap((todo) => todo.recuperi.chiusi)
    const riconsegneFatteClassi = tutteClassiTodo.flatMap((todo) => todo.riconsegne.fatte)

    const schedeClassi: Figlio[] = []
    for (const classe of classiDocente) {
      const todo = todoClassiDocente.get(classe.id)
      if (todo && todo.aperti > 0) {
        schedeClassi.push(
          scheda({
            titolo: t.docenteDiClasseEtichetta(classe.nome),
            sottotitolo: riassuntoClasse(todo),
            classe: 'todo-classe-scheda',
            azioni: pulsante({
              testo: parole().apri,
              variante: 'sottile',
              al: () => aggiorna({ schedaTodo: idSchedaClasse(classe.id) }),
            }),
            contenuto: h('div', { class: 'todo-classe__corpo' }, ...sezioniTodoClasse(todo)),
          }),
        )
      }
    }

    return h(
      'div',
      { class: 'vista vista--todo' },
      testataVista({
        titolo: Molti(lessico().pendenza),
        sottotitolo: t.docenteDiClasseAiuto,
        contorno: totaleClassiAperti > 0 ? pastiglia(t.coseAperte(totaleClassiAperti), 'quiete') : null,
        compatta: true,
      }),
      barraNav,
      h(
        'div',
        { class: 'todo-sintesi' },
        ...FAMIGLIE_CLASSE_DOCENTE.map((famiglia) =>
          schedaFamiglia(contiClassi[famiglia], famiglia),
        ),
      ),
      totaleClassiAperti === 0
        ? statoVuoto({
            simbolo: 'spunta',
            titolo: t.vuotoTitolo,
            testo: t.vuotoTestoDocenteClasse,
            azione: pulsante({
              testo: t.assegnaPrima,
              variante: 'primario',
              simbolo: 'piu',
              al: () => moduloConsegna({ ambito: 'classe' }),
            }),
          })
        : h('div', { class: 'todo-classi' }, ...schedeClassi),
      schedaFatto(chiuseClassi, recuperiChiusiClassi, riconsegneFatteClassi),
    )
  }

  // 5. Vista "Tutte": panoramica globale con sezioni ben distinte per Corsi e Docenza di classe
  const tuttiTodo = [
    ...Array.from(todoCorsi.values()),
    ...Array.from(todoClassiDocente.values()),
  ]
  const contiGlobali = unisciContiFamiglia(tuttiTodo, FAMIGLIE_TODO)
  const tutteChiuse = tuttiTodo.flatMap((todo) =>
    FAMIGLIE_CONSEGNA.flatMap((famiglia) => todo.consegne[famiglia].completate),
  )
  const tuttiRecuperiChiusi = tuttiTodo.flatMap((todo) => todo.recuperi.chiusi)
  const tutteRiconsegneFatte = tuttiTodo.flatMap((todo) => todo.riconsegne.fatte)

  const schedeCorsi: Figlio[] = []
  for (const corso of corsi) {
    const todo = todoCorsi.get(corso.id)
    if (todo && todo.aperti > 0) {
      const btn = pulsante({
        testo: parole().apri,
        variante: 'sottile',
        al: () => aggiorna({ schedaTodo: idSchedaCorso(corso.id), corsoId: corso.id }),
      })
      btn.dataset.fuoco = fuocoTabCorso(corso.id)
      schedeCorsi.push(
        scheda({
          titolo: nomeDelCorso(corso),
          sottotitolo: riassuntoClasse(todo),
          classe: 'todo-corso-scheda',
          azioni: btn,
          contenuto: h('div', { class: 'todo-classe__corpo' }, ...sezioniTodoClasse(todo)),
        }),
      )
    }
  }

  const schedeDocenteClasse: Figlio[] = []
  for (const classe of classiDocente) {
    const todo = todoClassiDocente.get(classe.id)
    if (todo && todo.aperti > 0) {
      const btn = pulsante({
        testo: parole().apri,
        variante: 'sottile',
        al: () => aggiorna({ schedaTodo: idSchedaClasse(classe.id) }),
      })
      btn.dataset.fuoco = fuocoTabClasse(classe.id)
      schedeDocenteClasse.push(
        scheda({
          titolo: t.docenteDiClasseEtichetta(classe.nome),
          sottotitolo: riassuntoClasse(todo),
          classe: 'todo-classe-scheda',
          azioni: btn,
          contenuto: h('div', { class: 'todo-classe__corpo' }, ...sezioniTodoClasse(todo)),
        }),
      )
    }
  }

  return h(
    'div',
    { class: 'vista vista--todo' },
    testataVista({
      titolo: Molti(lessico().pendenza),
      sottotitolo: t.tutteAiuto,
      contorno: totaleGlobaleAperti > 0 ? pastiglia(t.coseAperte(totaleGlobaleAperti), 'quiete') : null,
      compatta: true,
    }),
    barraNav,
    h(
      'div',
      { class: 'todo-sintesi' },
      ...FAMIGLIE_TODO.map((famiglia) => schedaFamiglia(contiGlobali[famiglia], famiglia)),
    ),
    totaleGlobaleAperti === 0
      ? statoVuoto({
          simbolo: 'spunta',
          titolo: t.vuotoTitolo,
          testo: t.vuotoTestoTutte,
        })
      : h(
          'div',
          { class: 'todo-classi' },
          h(
            'section',
            { class: 'todo-sezione-blocco' },
            h(
              'div',
              { class: 'todo-sezione-banner' },
              h(
                'div',
                { class: 'todo-sezione-banner__titolo' },
                icona('libro', 'icona--minuta'),
                h('span', null, t.sezioneCorsi),
                totaleCorsiAperti > 0
                  ? pastiglia(String(totaleCorsiAperti), 'quiete')
                  : null,
              ),
              pulsante({
                testo: t.tuttiICorsi,
                variante: 'sottile',
                simbolo: 'avanti',
                al: () => aggiorna({ schedaTodo: 'corsi' }),
              }),
            ),
            schedeCorsi.length > 0
              ? h('div', { class: 'todo-sezione-elenco' }, ...schedeCorsi)
              : quieto(t.nessunCorsoConLavoro),
          ),
          classiDocente.length > 0
            ? h(
                'section',
                { class: 'todo-sezione-blocco' },
                h(
                  'div',
                  { class: 'todo-sezione-banner' },
                  h(
                    'div',
                    { class: 'todo-sezione-banner__titolo' },
                    icona('classi', 'icona--minuta'),
                    h('span', null, t.sezioneDocenteClasse),
                    totaleClassiAperti > 0
                      ? pastiglia(String(totaleClassiAperti), 'quiete')
                      : null,
                  ),
                  pulsante({
                    testo: t.tutteLeClassi,
                    variante: 'sottile',
                    simbolo: 'avanti',
                    al: () => aggiorna({ schedaTodo: 'classi' }),
                  }),
                ),
                schedeDocenteClasse.length > 0
                  ? h('div', { class: 'todo-sezione-elenco' }, ...schedeDocenteClasse)
                  : quieto(t.nessunaClasseConLavoro),
              )
            : null,
        ),
    schedaFatto(tutteChiuse, tuttiRecuperiChiusi, tutteRiconsegneFatte),
  )
}
