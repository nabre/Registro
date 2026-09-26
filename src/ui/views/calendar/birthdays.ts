// Il calendario: i compleanni. Pastiglie, segni e suggerimenti uguali in
// mese, agenda, settimana e anno.

import { lezioniDelGiorno } from '../../../domain/calculations.js'
import { fraseCompleanno, type Compleanno } from '../../../domain/birthdays.js'
import type { Iso, Lezione } from '../../../domain/models.js'
import { icona } from '../../components/icons.js'
import { h, type Figlio } from '../../dom.js'
import { aggiorna, classeDiLezione } from '../../state.js'
import { testi } from './calendar.testi.js'

// ------------------------------------------------------------------ compleanni

/*
 * I compleanni non sono lezioni: niente ora, niente trascinamento; portano una
 * torta e aprono la scheda della persona. Nel mese e nell'agenda per esteso,
 * nella settimana come segno sull'intestazione del giorno (non hanno un'ora a
 * cui appendersi).
 */

/** Il suggerimento di un giorno di compleanni: chi, quanti anni, di che classe. */
export function dettiCompleanni (compleanni: Compleanno[]): string {
  return compleanni.map((festa) => `${fraseCompleanno(festa)} · ${festa.classe}`).join('\n')
}

/**
 * Le classi che quel giorno hanno un'ora in calendario: il compleanno di chi
 * si ha in aula è in primo piano, gli altri restano sbiaditi.
 */
export function classiInAula (lezioni: Lezione[], data: Iso): Set<string> {
  const classi = new Set<string>()
  for (const lezione of lezioniDelGiorno(lezioni, data)) {
    const classe = classeDiLezione(lezione)
    if (classe) classi.add(classe.id)
  }
  return classi
}

/** Vero se almeno uno di quei compleanni è di una classe che si ha in aula quel giorno. */
export function qualcunoInAula (compleanni: Compleanno[], classi: Set<string>): boolean {
  return compleanni.some((festa) => classi.has(festa.classeId))
}

/** Dove porta un compleanno: alla scheda di chi li compie. */
function apriFesteggiato (compleanno: Compleanno): void {
  aggiorna({
    vista: 'allievo',
    classeId: compleanno.classeId,
    allievoId: compleanno.allievoId,
  })
}

/**
 * La pastiglia di un compleanno: torta, nome, anni. Stessa forma delle
 * pastiglie delle ore, con il colore della classe sul bordo.
 */
export function chipCompleanno (compleanno: Compleanno, inAula: boolean): HTMLElement {
  return h(
    'button',
    {
      class: ['chip', 'chip--compleanno', !inAula && 'chip--compleanno-fuori'],
      type: 'button',
      style: { borderLeftColor: compleanno.colore },
      attr: {
        title: [
          fraseCompleanno(compleanno),
          compleanno.classe,
          inAula ? null : testi().nonInAula,
        ]
          .filter(Boolean)
          .join(' · '),
      },
      onclick: (evento: MouseEvent) => {
        evento.stopPropagation()
        apriFesteggiato(compleanno)
      },
    },
    icona('torta', 'chip__segno'),
    h('span', { class: 'chip__testo' }, compleanno.nome),
    // Gli anni in coda, dove nelle ore sta la sigla della materia.
    compleanno.eta !== null ? h('span', { class: 'chip__materia' }, String(compleanno.eta)) : null,
  )
}

/**
 * Il segno sull'intestazione di un giorno della settimana: la torta, e quanti
 * se più d'uno; il resto nel suggerimento.
 */
export function segnoCompleanni (compleanni: Compleanno[], inAula: boolean): Figlio {
  if (compleanni.length === 0) return null
  return h(
    'span',
    {
      class: ['compleanni-segno', !inAula && 'compleanni-segno--fuori'],
      attr: { title: dettiCompleanni(compleanni) },
    },
    icona('torta'),
    compleanni.length > 1 ? h('span', null, String(compleanni.length)) : null,
  )
}
