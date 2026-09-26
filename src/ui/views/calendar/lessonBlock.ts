// Il calendario: un'ora disegnata, come blocco della settimana o pastiglia del
// mese, con gli stessi gesti.

import {
  fineLezione,
  inizioLezione,
  momentoLezione,
  riepilogaPresenze,
} from '../../../domain/calculations.js'
import { minutiDaOra } from '../../../domain/dates.js'
import type { Lezione } from '../../../domain/models.js'
import { icona } from '../../components/icons.js'
import { h } from '../../dom.js'
import { eventiDellaLezione } from '../../externalCalendar.js'
import { moduloLezione } from '../../forms.js'
import {
  nomeClasseDiLezione,
  nomeDiLezione,
  nomeMateriaDiLezione,
  siglaMateriaDiLezione,
  coloreDiLezione,
  titoloDiLezione,
  stato,
} from '../../state.js'
import { apriLezione } from './common.js'
import { rendiTrascinabile } from './drag.js'
import {
  ancora,
  segnoCollegamento,
  divergenzaLezione,
  classiDivergenza,
  conDivergenza,
} from './ics.js'
import { inModifica, maniglie, scegli, sceltaLezione } from './editor.js'
import { menuLezione } from './menus.js'

/**
 * Il suggerimento di un'ora della settimana: quale ora è, dove, e il suo
 * numero. Il piano non si racconta qui (c'è solo l'icona nel piede).
 */
function dettagliDellaLezione (lezione: Lezione, inizio: string, fine: string): string {
  const materia = nomeMateriaDiLezione(lezione)
  const righe = [
    `${nomeClasseDiLezione(lezione)}${materia ? ` — ${materia}` : ''} · ${inizio}–${fine}${
      lezione.aula ? ` · ${lezione.aula}` : ''
    }`,
  ]

  righe.push(etichettaNumero(lezione))

  return righe.filter((riga) => riga.length > 0).join('\n')
}

/** Che numero ha quest'ora nel suo corso; vuoto per un'ora annullata. */
function etichettaNumero (lezione: Lezione): string {
  return lezione.stato === 'annullata' ? '' : nomeDiLezione(lezione)
}

/**
 * Il rettangolo di una lezione nella griglia della settimana. Posizione e
 * altezza in percentuale della fascia, perché la griglia si allunga con la
 * finestra; i pixel alla scala minima decidono solo che cosa scriverci dentro.
 */
export function bloccoLezione (
  lezione: Lezione,
  minutiPrimaOra: number,
  durataFascia: number,
  scala: number,
): HTMLElement {
  const inizio = inizioLezione(lezione)
  const fine = fineLezione(lezione)
  if (!inizio || !fine) return h('div')

  const minuti = minutiDaOra(fine) - minutiDaOra(inizio)
  const alto = ((minutiDaOra(inizio) - minutiPrimaOra) / durataFascia) * 100
  const quanto = (minuti / durataFascia) * 100
  // La stessa misura in pixel alla scala minima: decide quante righe entrano.
  const altezza = Math.max(22, minuti * scala)
  const colore = coloreDiLezione(lezione)
  const riepilogo = riepilogaPresenze(lezione.presenze)
  const momento = momentoLezione(lezione, stato.adessoData, stato.adessoOra)

  const blocco = h(
    'button',
    {
      class: [
        momento === 'in-corso' && 'blocco--adesso',
        momento === 'passata' && 'blocco--passata',
        'blocco',
        // testo-fisso: classe CSS
        `blocco--${lezione.stato}`,
        altezza < 46 && 'blocco--basso',
        sceltaLezione(lezione.id) && 'blocco--scelto',
        ...classiDivergenza(divergenzaLezione(lezione.id)),
      ],
      type: 'button',
      // La chiave di fuoco tiene il blocco scelto sotto la tastiera dopo il ridisegno.
      // testo-fisso: chiave di fuoco, non testo
      dataset: { lezione: lezione.id, fuoco: `lezione:${lezione.id}` },
      style: {
        top: `${alto}%`,
        height: `${quanto}%`,
        borderLeftColor: colore,
        // Tinta appena accennata: la colonna deve restare leggibile.
        // testo-fisso: un colore CSS
        backgroundColor: `color-mix(in srgb, ${colore} 14%, transparent)`,
      },
      attr: {
        title: conDivergenza(
          dettagliDellaLezione(lezione, inizio, fine),
          divergenzaLezione(lezione.id),
        ),
      },
      ...ancora(lezione.id, eventiDellaLezione(lezione.id).length > 0),
      // In modifica il clic sceglie e il doppio clic apre il modulo.
      onclick: () => (inModifica() ? scegli(lezione.id, true) : apriLezione(lezione)),
      ondblclick: () => {
        if (inModifica()) moduloLezione({ lezione })
      },
      onfocus: () => {
        if (inModifica()) scegli(lezione.id)
      },
      oncontextmenu: (evento: MouseEvent) => menuLezione(evento, lezione),
    },
    // Le pause come tagli chiari dentro il blocco.
    lezione.slot
      .filter((s) => s.tipo === 'pausa')
      .map((pausa) =>
        h('span', {
          class: 'blocco__pausa',
          style: {
            // In percentuale del blocco: la pausa resta al suo posto anche stirandolo.
            top: `${((minutiDaOra(pausa.inizio) - minutiDaOra(inizio)) / minuti) * 100}%`,
            height: `${((minutiDaOra(pausa.fine) - minutiDaOra(pausa.inizio)) / minuti) * 100}%`,
          },
        }),
      ),
    h(
      'span',
      { class: 'blocco__testata' },
      h('span', { class: 'blocco__ora' }, inizio),
      h('span', { class: 'blocco__classe' }, nomeClasseDiLezione(lezione)),
      // La materia accanto alla classe: la stessa classe può avere due materie.
      nomeMateriaDiLezione(lezione)
        ? h('span', { class: 'blocco__materia' }, nomeMateriaDiLezione(lezione))
        : null,
      segnoCollegamento(eventiDellaLezione(lezione.id)),
    ),
    // L'aula su una riga sua, sotto classe e materia; nei blocchi bassi resta
    // solo nel suggerimento.
    altezza >= 46 && lezione.aula
      ? h('span', { class: 'blocco__aula' }, lezione.aula)
      : null,
    altezza >= 46 && etichettaNumero(lezione)
      ? h('span', { class: 'blocco__numero' }, etichettaNumero(lezione))
      : null,
    altezza >= 64
      ? h(
          'span',
          { class: 'blocco__piede' },
          lezione.stato === 'svolta' && riepilogo.udTotali > 0
            ? h('span', { class: 'blocco__presenze' }, `${riepilogo.presenti}/${riepilogo.totale - riepilogo.senzaAppello}`)
            : null,
          lezione.pianoId ? icona('piano', 'icona--minuta') : null,
          lezione.osservazioni.length > 0
            ? h('span', { class: 'blocco__note' }, String(lezione.osservazioni.length))
            : null,
        )
      : null,
  )

  // Trascinare è un gesto della modifica, come disegnare e stirare.
  if (inModifica()) {
    rendiTrascinabile(blocco, lezione)
    blocco.append(...maniglie(blocco, lezione, {
      primaOra: minutiPrimaOra,
      ultimaOra: minutiPrimaOra + durataFascia,
    }))
  }
  return blocco
}

/** La pastiglia di una lezione nelle celle del mese. */
export function chipLezione (lezione: Lezione): HTMLElement {
  const inizio = inizioLezione(lezione)
  const chip = h(
    'button',
    {
      class: [
        'chip',
        // testo-fisso: classe CSS
        `chip--${lezione.stato}`,
        sceltaLezione(lezione.id) && 'chip--scelto',
        ...classiDivergenza(divergenzaLezione(lezione.id)),
      ],
      type: 'button',
      // testo-fisso: chiave di fuoco, non testo
      dataset: { lezione: lezione.id, fuoco: `lezione:${lezione.id}` },
      style: { borderLeftColor: coloreDiLezione(lezione) },
      // Nel suggerimento la materia per esteso; nella pastiglia solo la sigla.
      attr: {
        title: `${inizio ?? ''} ${nomeClasseDiLezione(lezione)}${
          nomeMateriaDiLezione(lezione) ? ` — ${nomeMateriaDiLezione(lezione)}` : ''
        } ${titoloDiLezione(lezione)}`.trim(),
      },
      onclick: (evento: MouseEvent) => {
        evento.stopPropagation()
        if (inModifica()) scegli(lezione.id, true)
        else apriLezione(lezione)
      },
      ondblclick: (evento: MouseEvent) => {
        if (!inModifica()) return
        // Il doppio clic sulla cella sotto crea una lezione: qui si apre questa.
        evento.stopPropagation()
        moduloLezione({ lezione })
      },
      onfocus: () => {
        if (inModifica()) scegli(lezione.id)
      },
      oncontextmenu: (evento: MouseEvent) => menuLezione(evento, lezione),
    },
    h('span', { class: 'chip__ora' }, inizio ?? ''),
    h('span', { class: 'chip__testo' }, nomeClasseDiLezione(lezione)),
    // La sigla e non il nome: nella cella del mese i nomi lunghi verrebbero troncati.
    siglaMateriaDiLezione(lezione)
      ? h('span', { class: 'chip__materia' }, siglaMateriaDiLezione(lezione))
      : null,
    segnoCollegamento(eventiDellaLezione(lezione.id)),
  )

  if (inModifica()) rendiTrascinabile(chip, lezione)
  return chip
}
