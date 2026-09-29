// Il calendario: l'agenda, tutto l'anno giorno per giorno raggruppato per
// settimane, a partire dal giorno di riferimento.

import {
  confrontaLezioni,
  fineLezione,
  inizioLezione,
  minutiEffettivi,
  riepilogaPresenze,
} from '../../../../core/dominio/calculations.js'
import {
  formattaData,
  formattaDurata,
  inizioSettimana,
  settimanaIso,
  sommaGiorni,
} from '../../../../core/dominio/dates.js'
import type { Compleanno } from '../../../../core/dominio/birthdays.js'
import type { EventoCalendario } from '../../../../core/dominio/calendarIcs.js'
import type { Iso, Lezione } from '../../../../core/dominio/models.js'
import { pastiglia, pulsante, puntoColore, statoVuoto } from '../../components/base.js'
import { h } from '../../dom.js'
import {
  eventiDellaLezione,
  eventiEsterni,
  icsInVista,
  lezioneDellEvento,
} from '../../externalCalendar.js'
import { moduloLezione } from '../../forms.js'
import {
  annoCorrente,
  compleanniFra,
  iscriviti,
  lezioniInAgenda,
  nomeClasseDiLezione,
  nomeMateriaDiLezione,
  coloreDiLezione,
  semestrePerData,
  titoloDiLezione,
  stato,
} from '../../state.js'
import { chiusura, apriLezione, festivo, letteraDi } from './common.js'
import {
  ancora,
  segnoCollegamento,
  voceEvento,
  divergenzaLezione,
  classiDivergenza,
  conDivergenza,
} from './ics.js'
import { classiInAula, chipCompleanno } from './birthdays.js'
import { menuLezione } from './menus.js'
import { testi } from './calendar.testi.js'
import { lessico } from '../../../../core/dominio/lexicon.testi.js'
import { minuscolo } from '../../../../core/i18n/index.js'

/**
 * Il giorno su cui l'agenda si è già portata da sé: una volta per giorno di
 * riferimento; ai ridisegni dopo resta dove l'ha lasciata chi guarda.
 */
let agendaPortataSu: Iso | null = null

/**
 * Porta l'agenda sul giorno di riferimento, o sul primo elencato dopo, a
 * disegno fatto: dal disegno lo scorrimento partiva a ogni ridisegno in cui
 * il giorno era nuovo, anche a metà gesto.
 */
function portaAgenda (): void {
  if (agendaPortataSu === stato.data) return
  const giorni = Array.from(document.querySelectorAll<HTMLElement>('[data-agenda-giorno]'))
  if (giorni.length === 0) return
  agendaPortataSu = stato.data
  const bersaglio = giorni.find((giorno) => (giorno.dataset.agendaGiorno ?? '') >= stato.data) ??
    giorni[giorni.length - 1]
  bersaglio.scrollIntoView({ block: 'start' })
}

// Il disegno parte da un iscritto venuto dopo questo: il microtask mette il
// fotogramma di qui in fila dietro al suo.
iscriviti(() => {
  if (stato.vista !== 'calendario' || stato.modoCalendario !== 'agenda') return
  if (agendaPortataSu === stato.data) return
  queueMicrotask(() => requestAnimationFrame(portaAgenda))
})

export function vistaAgenda (): HTMLElement {
  const t = testi()
  const tutte = lezioniInAgenda()
    // L'ordine del dominio, `id` compreso: due ore che cominciano insieme non si
    // scambiano fra un ridisegno e l'altro.
    .sort(confrontaLezioni)

  // Tutto il tratto: dall'inizio dell'anno (o dalla prima lezione, se prima)
  // alla fine dei semestri (o all'ultima lezione, se dopo).
  const anno = annoCorrente()
  const inizioSemestri = (anno?.semestri ?? []).map((s) => s.inizio).sort()[0]
  const fineSemestri = (anno?.semestri ?? []).map((s) => s.fine).sort().at(-1)
  const primo = [anno?.inizio, inizioSemestri, tutte[0]?.data]
    .filter((data): data is Iso => Boolean(data))
    .sort()[0]
  const fine = [fineSemestri, tutte.at(-1)?.data]
    .filter((data): data is Iso => Boolean(data))
    .sort()
    .at(-1)

  if (!primo || !fine) {
    return statoVuoto({
      simbolo: 'calendario',
      titolo: t.vuotoTitolo,
      testo: t.vuotoTesto,
      azione: pulsante({
        testo: t.nuovaLezione,
        variante: 'primario',
        simbolo: 'piu',
        al: () => moduloLezione({ data: stato.data }),
      }),
    })
  }
  const ultimo = fine

  const perGiorno = new Map<Iso, Lezione[]>()
  for (const lezione of tutte) {
    const gruppo = perGiorno.get(lezione.data) ?? []
    gruppo.push(lezione)
    perGiorno.set(lezione.data, gruppo)
  }

  // Compleanni ed eventi ICS dello stesso tratto, anche fuori dai semestri.
  const feste = compleanniFra(primo, ultimo)
  const eventi = new Map<Iso, EventoCalendario[]>()
  for (let data = primo; data <= ultimo; data = sommaGiorni(data, 1)) {
    const delGiorno = eventiEsterni(data)
    if (delGiorno.length > 0) eventi.set(data, delGiorno)
  }

  // Tutti i giorni, fine settimana e vacanze compresi: anche un giorno vuoto dice qualcosa.
  const settimane = new Map<Iso, Iso[]>()
  for (let data = primo; data <= ultimo; data = sommaGiorni(data, 1)) {
    const qualcosa = perGiorno.has(data) || feste.has(data) || eventi.has(data)
    if (!semestrePerData(data) && !qualcosa) continue
    const lunedi = inizioSettimana(data)
    const giorni = settimane.get(lunedi) ?? []
    giorni.push(data)
    settimane.set(lunedi, giorni)
  }

  // Il confine fra i semestri si segna fra i due giorni elencati in cui cambia.
  let semestrePrecedente = semestrePerData(primo)

  return h(
    'div',
    // Nodo di telaio (`dom.ts`): un ridisegno non lo ricrea, chi scorre non
    // perde il gesto. Dove portarlo lo decide `portaAgenda`, dopo il disegno.
    { class: 'agenda', dataset: { scorrimento: 'calendario:agenda', telaio: 'agenda' } },
    ...[...settimane].flatMap(([lunedi, giorni]) => [
      // Il titolo della settimana: il numero, i giorni che copre e la lettera,
      // che vale per tutta la settimana.
      h(
        'h3',
        { class: 'agenda__settimana' },
        h('span', null, t.settimana(settimanaIso(lunedi))),
        h(
          'span',
          { class: 'agenda__settimana-date' },
          `${formattaData(lunedi, 'corto')}–${formattaData(sommaGiorni(lunedi, 6), 'corto')}`,
        ),
        letteraDi(lunedi)
          ? h(
              'span',
              {
                class: 'settimana__lettera',
                attr: { title: t.letteraSiCambia },
              },
              letteraDi(lunedi) as string,
            )
          : null,
      ),
      ...giorni.flatMap((data) => {
        const suo = semestrePerData(data)
        const cambio = suo && suo.id !== semestrePrecedente?.id ? suo : null
        semestrePrecedente = suo
        return [
          cambio
            ? h(
                'div',
                { class: 'mese__semestre' },
                h('span', null, t.cominciaSemestre(cambio.etichetta)),
                h('span', { class: 'mese__semestre-data' }, formattaData(cambio.inizio, 'giorno')),
              )
            : null,
          giornoAgenda(
            data,
            perGiorno.get(data) ?? [],
            feste.get(data) ?? [],
            eventi.get(data) ?? [],
          ),
        ]
      }),
    ]),
  )
}

/** Un giorno dell'agenda: la testata, i compleanni, gli eventi, le ore. */
function giornoAgenda (
  data: Iso,
  delGiorno: Lezione[],
  compleanni: Compleanno[],
  eventi: EventoCalendario[],
): HTMLElement {
  const t = testi()
  const inAula = classiInAula(delGiorno, data)
  const vuoto = delGiorno.length === 0 && compleanni.length === 0 && eventi.length === 0
  return h(
    'section',
    {
      dataset: { agendaGiorno: data },
      class: [
        'agenda__giorno',
        data === stato.adessoData && 'agenda__giorno--oggi',
        vuoto && 'agenda__giorno--vuoto',
        (festivo(data) || chiusura(data)) && 'agenda__giorno--libero',
      ],
    },
    h(
      'header',
      { class: 'agenda__testata' },
      h('span', { class: 'agenda__data' }, formattaData(data, 'lungo')),
      data === stato.adessoData ? pastiglia(t.oggi, 'informativo') : null,
      chiusura(data) ? pastiglia(chiusura(data), 'quiete') : null,
    ),
    // I compleanni fra la testata e le ore: sono del giorno, non di un'ora.
    compleanni.length > 0
      ? h(
          'div',
          { class: 'agenda__compleanni' },
          ...compleanni.map((festa) => chipCompleanno(festa, inAula.has(festa.classeId))),
        )
      : null,
    // Gli eventi senza lezione in cima, da soli; quelli collegati sotto la loro ora.
    ...eventi.filter((e) => !lezioneDellEvento(e)).map(voceEvento),
    ...delGiorno.flatMap((lezione) => {
      const riepilogo = riepilogaPresenze(lezione.presenze)
      const collegati = eventiDellaLezione(lezione.id)
      const riga = h(
        'button',
        {
          class: [
            'agenda__voce',
            `agenda__voce--${lezione.stato}`,
            ...classiDivergenza(divergenzaLezione(lezione.id)),
          ],
          attr: { title: conDivergenza('', divergenzaLezione(lezione.id)) || null },
          type: 'button',
          ...ancora(lezione.id, collegati.length > 0),
          onclick: () => apriLezione(lezione),
          oncontextmenu: (evento: MouseEvent) => menuLezione(evento, lezione),
        },
        h(
          'span',
          { class: 'agenda__orario' },
          `${inizioLezione(lezione) ?? ''}–${fineLezione(lezione) ?? ''}`,
        ),
        puntoColore(coloreDiLezione(lezione)),
        h(
          'span',
          { class: 'agenda__testo' },
          h('strong', null, nomeClasseDiLezione(lezione)),
          // La materia accanto alla classe: nella giornata le ore sono di classi e
          // materie diverse.
          nomeMateriaDiLezione(lezione)
            ? h('span', { class: 'agenda__materia' }, nomeMateriaDiLezione(lezione))
            : null,
          titoloDiLezione(lezione)
            ? h('span', { class: 'agenda__titolo' }, titoloDiLezione(lezione))
            : null,
        ),
        h(
          'span',
          { class: 'agenda__coda' },
          segnoCollegamento(collegati),
          pastiglia(formattaDurata(minutiEffettivi(lezione)), 'quiete'),
          lezione.stato === 'svolta' && riepilogo.udTotali > 0
            ? pastiglia(
                `${riepilogo.presenti}/${riepilogo.totale - riepilogo.senzaAppello}`,
                riepilogo.assenti > 0 ? 'attenzione' : 'positivo',
                'utente',
              )
            : null,
          lezione.stato === 'annullata'
            ? pastiglia(minuscolo(lessico().statiLezione.annullata), 'negativo')
            : null,
        ),
      )
      // La catena c'è sempre; gli eventi appesi sotto solo con «Calendario ICS» acceso.
      return [riga, ...(icsInVista() ? collegati.map(voceEvento) : [])]
    }),
  )
}
