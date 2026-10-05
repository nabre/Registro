// Le pendenze nell'agenda: raggruppate per corso (insegnamento) o per classe (docente di classe).

import type { ReactElement, ReactNode } from 'react'

import { Molti } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import type { Consegna } from '#core/dominio/models.js'
import type { Recupero } from '#core/dominio/retakes.js'
import type { Riconsegna } from '#core/dominio/returns.js'
import {
  descriviFamiglia,
  FAMIGLIE_CONSEGNA,
  FAMIGLIE_TODO,
  nomeFamiglia,
  todoDelCorso,
  todoDelDocenteDiClasse,
  type FamigliaTodo,
  type TodoClasse,
} from '#core/dominio/todo.js'
import { parole } from '#core/dominio/words.testi.js'
import { classi } from '#ui/classNames.js'
import { Pastiglia, Pulsante, Quieto, Scheda, StatoVuoto, TestataVista } from '#ui/components/base.js'
import { StatoVuotoAnno } from '#ui/components/filters.js'
import { Icona, type NomeIcona } from '#ui/components/icons.js'
import { nomeDelCorso } from '#ui/context.js'
import { moduloAnno, moduloConsegna } from '#ui/forms.js'
import {
  aggiorna,
  annoCorrente,
  classePerId,
  classiDellAnno,
  classiDiCuiSonoDocente,
  corsiDellAnnoAperto,
  corsiDi,
  stato,
  vai,
} from '#ui/state.js'
import { telaioVista } from '#ui/viewFrame.js'
import { gruppoConsegne } from './assignments.js'
import { riassuntoClasse, sezioniTodoClasse, simboloFamiglia } from './classTodo.js'
import { gruppoRecuperi } from './assessments/retakes.js'
import { gruppoRiconsegne } from './assessments/returns.js'
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

/**
 * Le pendenze di un corso solo: la scheda e il corso di lavoro insieme, così
 * il Registro aperto dopo è quello del corso guardato. Le pendenze restano la
 * pagina, senza soggetto: il corso lo sceglie la scheda.
 */
function apriPendenzeDelCorso (corsoId: string): void {
  vai({ pagina: 'pagina.pendenze' }, { contesto: { corsoId }, altro: { schedaTodo: idSchedaCorso(corsoId) } })
}

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
): ReactNode {
  const quanti = consegne.length + recuperiChiusi.length + proveRese.length
  if (quanti === 0) return null
  const t = testi()
  return (
    <Scheda
      titolo={t.fatto}
      sottotitolo={t.coseChiuse(quanti)}
      aiuto={t.fattoAiuto}
      classe="todo-fatto"
      contenuto={(
        <details className="todo-fatto__corpo">
          <summary>{t.mostraChiuso}</summary>
          {gruppoRecuperi(t.recuperiChiusi, recuperiChiusi)}
          {gruppoRiconsegne(t.proveRiconsegnate, proveRese)}
          {gruppoConsegne(t.consegneFatte, consegne, 'fatta')}
        </details>
      )}
    />
  )
}

function schedaFamiglia (
  conto: { aperti: number; urgenti: number },
  famiglia: FamigliaTodo,
): ReactElement {
  return (
    <article
      key={famiglia}
      className={classi(
        'todo-sintesi__scheda',
        conto.urgenti > 0 && 'todo-sintesi__scheda--preme',
        conto.aperti === 0 && 'todo-sintesi__scheda--vuota',
      )}
      title={`${nomeFamiglia(famiglia)}: ${descriviFamiglia(famiglia)}`}
    >
      <Icona nome={simboloFamiglia(famiglia)} classe="icona--minuta" />
      <h3 className="todo-sintesi__titolo">{nomeFamiglia(famiglia)}</h3>
      <span className="todo-sintesi__numero">{String(conto.aperti)}</span>
      {conto.urgenti > 0
        ? <span className="todo-sintesi__ritardo">{testi().inRitardo(conto.urgenti)}</span>
        : null}
    </article>
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

/** Una linguetta del selettore, uguale per le categorie e per le sottovoci. */
function linguetta (voce: VoceNavigazione, accesa: boolean, fuoco: string): ReactElement {
  const t = testi()
  return (
    <button
      key={voce.id}
      className={classi('selettore__voce', accesa && 'selettore__voce--attiva')}
      type="button"
      role="tab"
      data-fuoco={fuoco}
      aria-selected={String(accesa) as 'true' | 'false'}
      title={voce.conto > 0
        ? `${voce.titolo} (${t.coseAperte(voce.conto)}${voce.urgenti > 0 ? ` · ${t.inRitardo(voce.urgenti)}` : ''})`
        : voce.titolo}
      onClick={voce.al}
    >
      <Icona nome={voce.simbolo} classe="icona--minuta" />
      <span>{voce.titolo}</span>
      {voce.conto > 0
        ? (
            <span className="pastiglia pastiglia--minuta pastiglia--quiete" style={{ marginLeft: '4px' }}>
              {String(voce.conto)}
            </span>
          )
        : null}
    </button>
  )
}

function barraNavigazioneTodo (
  categorie: VoceNavigazione[],
  categoriaAttiva: string,
  sottovoci: VoceNavigazione[] | null,
  sottovoceAttiva: string | null,
): ReactElement {
  const t = testi()
  return (
    <div className="todo-navigazione">
      <div className="todo-schede">
        <div className="selettore" role="tablist" aria-label={t.titoloSelettore}>
          {categorie.map((voce) => linguetta(voce, voce.id === categoriaAttiva, voce.fuoco ?? fuocoCat(voce.id)))}
        </div>
      </div>
      {sottovoci && sottovoci.length > 0
        ? (
            <div className="todo-sottoschede">
              <div className="selettore" role="tablist" aria-label={t.titoloSottoSelettore}>
                {sottovoci.map((voce) => linguetta(voce, voce.id === sottovoceAttiva, voce.fuoco ?? fuocoSotto(voce.id)))}
              </div>
            </div>
          )
        : null}
    </div>
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

/** Il pulsante «assegna» dello stato vuoto, uguale nelle quattro schede. */
function assegnaPrima (al: () => void): ReactElement {
  return <Pulsante testo={testi().assegnaPrima} variante="primario" simbolo="piu" al={al} />
}

/** La scheda di un corso o di una classe con lavoro aperto, nelle panoramiche. */
function schedaTodo (opzioni: {
  chiave: string
  titolo: string
  todo: TodoClasse
  classe: string
  al: () => void
  fuoco?: string
}): ReactElement {
  return (
    <Scheda
      key={opzioni.chiave}
      titolo={opzioni.titolo}
      sottotitolo={riassuntoClasse(opzioni.todo)}
      classe={opzioni.classe}
      azioni={<Pulsante testo={parole().apri} variante="sottile" al={opzioni.al} fuoco={opzioni.fuoco} />}
      contenuto={<div className="todo-classe__corpo">{sezioniTodoClasse(opzioni.todo)}</div>}
    />
  )
}

export function vistaTodo (): ReactNode {
  return <VistaTodo />
}

function VistaTodo (): ReactElement {
  const t = testi()
  if (!annoCorrente()) {
    return (
      <div className="vista vista--todo" data-telaio={telaioVista()}>
        <StatoVuotoAnno simbolo="spunta" testo={t.senzaAnno} crea={() => moduloAnno()} />
      </div>
    )
  }

  const classiAnno = classiDellAnno()
  const corsi = corsiDellAnnoAperto()
  const classiDocente = classiDiCuiSonoDocente()

  if (corsi.length === 0 && classiAnno.length === 0) {
    return <StatoVuoto simbolo="spunta" titolo={t.vuotoTitolo} testo={t.senzaAnno} telaio={telaioVista()} />
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
          simbolo: 'libro' as const,
          conto: todo?.aperti ?? 0,
          urgenti: todo?.urgenti ?? 0,
          fuoco: fuocoTabCorso(corso.id),
          al: () => apriPendenzeDelCorso(corso.id),
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
              simbolo: 'classi' as const,
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
          simbolo: 'classi' as const,
          conto: todo?.aperti ?? 0,
          urgenti: todo?.urgenti ?? 0,
          fuoco: fuocoTabClasse(classe.id),
          al: () => aggiorna({ schedaTodo: idSchedaClasse(classe.id) }),
        }
      }),
    ]
  }

  const barraNav = barraNavigazioneTodo(categorie, categoriaAttiva, sottovoci, sottovoceAttiva)
  const titolo = Molti(lessico().pendenza)
  const contorno = (aperti: number) => (aperti > 0 ? <Pastiglia testo={t.coseAperte(aperti)} tono="quiete" /> : null)

  // 1. Vista Corso Singolo
  if (sottovoceAttiva && sottovoceAttiva.startsWith('corso:')) {
    const corsoId = sottovoceAttiva.slice(6)
    const corso = corsi.find((c) => c.id === corsoId)
    const todo = todoCorsi.get(corsoId)
    if (!corso || !todo) {
      return <StatoVuoto simbolo="spunta" titolo={t.vuotoTitolo} testo={t.nessunaPendenzaTesto} telaio={telaioVista()} />
    }

    const chiuse = FAMIGLIE_CONSEGNA.flatMap((famiglia) => todo.consegne[famiglia].completate)

    return (
      <div className="vista vista--todo" data-telaio={telaioVista()}>
        <TestataVista titolo={titolo} sottotitolo={nomeDelCorso(corso)} contorno={contorno(todo.aperti)} compatta />
        {barraNav}
        <div className="todo-sintesi">
          {FAMIGLIE_CORSO.map((famiglia) => schedaFamiglia(todo.conti[famiglia], famiglia))}
        </div>
        {todo.aperti === 0
          ? (
              <StatoVuoto
                simbolo="spunta"
                titolo={t.vuotoTitolo}
                testo={t.vuotoTesto}
                azione={assegnaPrima(() => moduloConsegna({ corsoId: corso.id, corsoFisso: true }))}
              />
            )
          : <div className="todo-classe__corpo">{sezioniTodoClasse(todo)}</div>}
        {schedaFatto(chiuse, todo.recuperi.chiusi, todo.riconsegne.fatte)}
      </div>
    )
  }

  // 2. Vista Classe Singola (Docente di classe)
  if (sottovoceAttiva && sottovoceAttiva.startsWith('classe:')) {
    const classeId = sottovoceAttiva.slice(7)
    const classe = classiDocente.find((c) => c.id === classeId)
    const todo = todoClassiDocente.get(classeId)
    if (!classe || !todo) {
      return <StatoVuoto simbolo="spunta" titolo={t.vuotoTitolo} testo={t.nessunaPendenzaTesto} telaio={telaioVista()} />
    }

    const chiuse = FAMIGLIE_CONSEGNA.flatMap((famiglia) => todo.consegne[famiglia].completate)

    return (
      <div className="vista vista--todo" data-telaio={telaioVista()}>
        <TestataVista
          titolo={titolo}
          sottotitolo={t.docenteDiClasseEtichetta(classe.nome)}
          contorno={contorno(todo.aperti)}
          compatta
        />
        {barraNav}
        <div className="todo-sintesi">
          {FAMIGLIE_CLASSE_DOCENTE.map((famiglia) => schedaFamiglia(todo.conti[famiglia], famiglia))}
        </div>
        {todo.aperti === 0
          ? (
              <StatoVuoto
                simbolo="spunta"
                titolo={t.vuotoTitolo}
                testo={t.vuotoTestoDocenteClasse}
                azione={assegnaPrima(() => moduloConsegna({ classeId: classe.id, ambito: 'classe' }))}
              />
            )
          : <div className="todo-classe__corpo">{sezioniTodoClasse(todo)}</div>}
        {schedaFatto(chiuse, todo.recuperi.chiusi, todo.riconsegne.fatte)}
      </div>
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

    const schedeCorsi: ReactElement[] = []
    for (const corso of corsi) {
      const todo = todoCorsi.get(corso.id)
      if (todo && todo.aperti > 0) {
        schedeCorsi.push(schedaTodo({
          chiave: corso.id,
          titolo: nomeDelCorso(corso),
          todo,
          classe: 'todo-corso-scheda',
          al: () => apriPendenzeDelCorso(corso.id),
        }))
      }
    }

    return (
      <div className="vista vista--todo" data-telaio={telaioVista()}>
        <TestataVista titolo={titolo} sottotitolo={t.corsiAiuto} contorno={contorno(totaleCorsiAperti)} compatta />
        {barraNav}
        <div className="todo-sintesi">
          {FAMIGLIE_CORSO.map((famiglia) => schedaFamiglia(contiCorsi[famiglia], famiglia))}
        </div>
        {totaleCorsiAperti === 0
          ? (
              <StatoVuoto
                simbolo="spunta"
                titolo={t.vuotoTitolo}
                testo={t.vuotoTestoCorsi}
                azione={assegnaPrima(() => moduloConsegna())}
              />
            )
          : <div className="todo-classi">{schedeCorsi}</div>}
        {schedaFatto(chiuseCorsi, recuperiChiusiCorsi, riconsegneFatteCorsi)}
      </div>
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

    const schedeClassi: ReactElement[] = []
    for (const classe of classiDocente) {
      const todo = todoClassiDocente.get(classe.id)
      if (todo && todo.aperti > 0) {
        schedeClassi.push(schedaTodo({
          chiave: classe.id,
          titolo: t.docenteDiClasseEtichetta(classe.nome),
          todo,
          classe: 'todo-classe-scheda',
          al: () => aggiorna({ schedaTodo: idSchedaClasse(classe.id) }),
        }))
      }
    }

    return (
      <div className="vista vista--todo" data-telaio={telaioVista()}>
        <TestataVista
          titolo={titolo}
          sottotitolo={t.docenteDiClasseAiuto}
          contorno={contorno(totaleClassiAperti)}
          compatta
        />
        {barraNav}
        <div className="todo-sintesi">
          {FAMIGLIE_CLASSE_DOCENTE.map((famiglia) => schedaFamiglia(contiClassi[famiglia], famiglia))}
        </div>
        {totaleClassiAperti === 0
          ? (
              <StatoVuoto
                simbolo="spunta"
                titolo={t.vuotoTitolo}
                testo={t.vuotoTestoDocenteClasse}
                azione={assegnaPrima(() => moduloConsegna({ ambito: 'classe' }))}
              />
            )
          : <div className="todo-classi">{schedeClassi}</div>}
        {schedaFatto(chiuseClassi, recuperiChiusiClassi, riconsegneFatteClassi)}
      </div>
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

  const schedeCorsi: ReactElement[] = []
  for (const corso of corsi) {
    const todo = todoCorsi.get(corso.id)
    if (todo && todo.aperti > 0) {
      schedeCorsi.push(schedaTodo({
        chiave: corso.id,
        titolo: nomeDelCorso(corso),
        todo,
        classe: 'todo-corso-scheda',
        al: () => apriPendenzeDelCorso(corso.id),
        fuoco: fuocoTabCorso(corso.id),
      }))
    }
  }

  const schedeDocenteClasse: ReactElement[] = []
  for (const classe of classiDocente) {
    const todo = todoClassiDocente.get(classe.id)
    if (todo && todo.aperti > 0) {
      schedeDocenteClasse.push(schedaTodo({
        chiave: classe.id,
        titolo: t.docenteDiClasseEtichetta(classe.nome),
        todo,
        classe: 'todo-classe-scheda',
        al: () => aggiorna({ schedaTodo: idSchedaClasse(classe.id) }),
        fuoco: fuocoTabClasse(classe.id),
      }))
    }
  }

  return (
    <div className="vista vista--todo" data-telaio={telaioVista()}>
      <TestataVista titolo={titolo} sottotitolo={t.tutteAiuto} contorno={contorno(totaleGlobaleAperti)} compatta />
      {barraNav}
      <div className="todo-sintesi">
        {FAMIGLIE_TODO.map((famiglia) => schedaFamiglia(contiGlobali[famiglia], famiglia))}
      </div>
      {totaleGlobaleAperti === 0
        ? <StatoVuoto simbolo="spunta" titolo={t.vuotoTitolo} testo={t.vuotoTestoTutte} />
        : (
            <div className="todo-classi">
              <section className="todo-sezione-blocco">
                <div className="todo-sezione-banner">
                  <div className="todo-sezione-banner__titolo">
                    <Icona nome="libro" classe="icona--minuta" />
                    <span>{t.sezioneCorsi}</span>
                    {totaleCorsiAperti > 0 ? <Pastiglia testo={String(totaleCorsiAperti)} tono="quiete" /> : null}
                  </div>
                  <Pulsante
                    testo={t.tuttiICorsi}
                    variante="sottile"
                    simbolo="avanti"
                    al={() => aggiorna({ schedaTodo: 'corsi' })}
                  />
                </div>
                {schedeCorsi.length > 0
                  ? <div className="todo-sezione-elenco">{schedeCorsi}</div>
                  : <Quieto>{t.nessunCorsoConLavoro}</Quieto>}
              </section>
              {classiDocente.length > 0
                ? (
                    <section className="todo-sezione-blocco">
                      <div className="todo-sezione-banner">
                        <div className="todo-sezione-banner__titolo">
                          <Icona nome="classi" classe="icona--minuta" />
                          <span>{t.sezioneDocenteClasse}</span>
                          {totaleClassiAperti > 0 ? <Pastiglia testo={String(totaleClassiAperti)} tono="quiete" /> : null}
                        </div>
                        <Pulsante
                          testo={t.tutteLeClassi}
                          variante="sottile"
                          simbolo="avanti"
                          al={() => aggiorna({ schedaTodo: 'classi' })}
                        />
                      </div>
                      {schedeDocenteClasse.length > 0
                        ? <div className="todo-sezione-elenco">{schedeDocenteClasse}</div>
                        : <Quieto>{t.nessunaClasseConLavoro}</Quieto>}
                    </section>
                  )
                : null}
            </div>
          )}
      {schedaFatto(tutteChiuse, tuttiRecuperiChiusi, tutteRiconsegneFatte)}
    </div>
  )
}
