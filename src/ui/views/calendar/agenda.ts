// Il calendario: l'agenda, tutto l'anno giorno per giorno raggruppato per
// settimane, a partire dal giorno di riferimento.

import {
  confrontaLezioni,
  fineLezione,
  inizioLezione,
  minutiEffettivi,
  riepilogaPresenze,
} from '../../../domain/calculations.js'
import {
  formattaData,
  formattaDurata,
  inizioSettimana,
  oggi,
  settimanaIso,
  sommaGiorni,
} from '../../../domain/dates.js'
import type { Compleanno } from '../../../domain/birthdays.js'
import type { EventoCalendario } from '../../../domain/calendarIcs.js'
import type { Iso, Lezione } from '../../../domain/models.js'
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
import { lessico } from '../../../domain/lexicon.testi.js'
import { minuscolo } from '../../../i18n/index.js'

/**
 * Il giorno su cui l'agenda si è già portata da sé: una volta per giorno di
 * riferimento; ai ridisegni dopo resta dove l'ha lasciata chi guarda.
 */
let agendaPortataSu: Iso | null = null

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

  // Il giorno su cui portarsi: quello di riferimento o il primo elencato dopo.
  const elencati = [...settimane.values()].flat()
  const bersaglio = elencati.find((data) => data >= stato.data) ?? elencati.at(-1)
  if (bersaglio && agendaPortataSu !== stato.data) {
    agendaPortataSu = stato.data
    requestAnimationFrame(() => {
      document
        .querySelector(`[data-agenda-giorno="${bersaglio}"]`)
        ?.scrollIntoView({ block: 'start' })
    })
  }

  return h(
    'div',
    { class: 'agenda', dataset: { scorrimento: 'calendario:agenda' } },
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
        data === oggi() && 'agenda__giorno--oggi',
        vuoto && 'agenda__giorno--vuoto',
        (festivo(data) || chiusura(data)) && 'agenda__giorno--libero',
      ],
    },
    h(
      'header',
      { class: 'agenda__testata' },
      h('span', { class: 'agenda__data' }, formattaData(data, 'lungo')),
      data === oggi() ? pastiglia(t.oggi, 'informativo') : null,
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
