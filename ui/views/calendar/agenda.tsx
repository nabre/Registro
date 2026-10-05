// Il calendario: l'agenda, tutto l'anno giorno per giorno raggruppato per
// settimane, a partire dal giorno di riferimento.

import { useEffect, useRef, type ReactElement, type ReactNode } from 'react'

import {
  confrontaLezioni,
  fineLezione,
  inizioLezione,
  minutiEffettivi,
  riepilogaPresenze,
} from '#core/dominio/calculations.js'
import { formattaData, formattaDurata, inizioSettimana, nomeSemestre, settimanaIso, sommaGiorni } from '#core/dominio/dates.js'
import type { Compleanno } from '#core/dominio/birthdays.js'
import type { EventoCalendario } from '#core/dominio/calendarIcs.js'
import type { Iso, Lezione } from '#core/dominio/models.js'
import { classi } from '#ui/classNames.js'
import { Pastiglia, Pulsante, PuntoColore, StatoVuoto } from '#ui/components/base.js'
import {
  eventiDellaLezione,
  eventiEsterni,
  icsInVista,
  lezioneDellEvento,
} from '#ui/externalCalendar.js'
import { moduloLezione } from '#ui/forms.js'
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
} from '#ui/state.js'
import { chiusura, apriLezione, festivo, letteraDi } from './common.js'
import {
  ancora,
  segnoCollegamento,
  VoceEvento,
  divergenzaLezione,
  classiDivergenza,
  conDivergenza,
} from './ics.js'
import { classiInAula, ChipCompleanno } from './birthdays.js'
import { menuLezione } from './menus.js'
import { testi } from './calendar.testi.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { minuscolo } from '#core/i18n/index.js'

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
function portaAgenda (agenda: HTMLElement): void {
  if (agendaPortataSu === stato.data) return
  const giorni = Array.from(agenda.querySelectorAll<HTMLElement>('[data-agenda-giorno]'))
  if (giorni.length === 0) return
  agendaPortataSu = stato.data
  const bersaglio = giorni.find((giorno) => (giorno.dataset.agendaGiorno ?? '') >= stato.data) ??
    giorni[giorni.length - 1]
  bersaglio.scrollIntoView({ block: 'start' })
}

export function VistaAgenda (): ReactElement {
  const t = testi()
  const agenda = useRef<HTMLDivElement>(null)

  // Dopo il disegno, al fotogramma dopo, e solo se il giorno è nuovo.
  useEffect(() => {
    if (agendaPortataSu === stato.data) return
    requestAnimationFrame(() => {
      if (agenda.current) portaAgenda(agenda.current)
    })
  })

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
    return (
      <StatoVuoto
        simbolo="calendario"
        titolo={t.vuotoTitolo}
        testo={t.vuotoTesto}
        azione={(
          <Pulsante
            testo={t.nuovaLezione}
            variante="primario"
            simbolo="piu"
            al={() => moduloLezione({ data: stato.data })}
          />
        )}
      />
    )
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

  const voci: ReactNode[] = []
  for (const [lunedi, giorni] of settimane) {
    const lettera = letteraDi(lunedi)
    // Il titolo della settimana: il numero, i giorni che copre e la lettera,
    // che vale per tutta la settimana.
    voci.push(
      <h3 key={`settimana:${lunedi}`} className="agenda__settimana">
        <span>{t.settimana(settimanaIso(lunedi))}</span>
        <span className="agenda__settimana-date">
          {`${formattaData(lunedi, 'corto')}–${formattaData(sommaGiorni(lunedi, 6), 'corto')}`}
        </span>
        {lettera ? <span className="settimana__lettera" title={t.letteraSiCambia}>{lettera}</span> : null}
      </h3>,
    )
    for (const data of giorni) {
      const suo = semestrePerData(data)
      const cambio = suo && suo.id !== semestrePrecedente?.id ? suo : null
      semestrePrecedente = suo
      if (cambio) {
        voci.push(
          <div key={`semestre:${data}`} className="mese__semestre">
            <span>{t.cominciaSemestre(nomeSemestre(cambio))}</span>
            <span className="mese__semestre-data">{formattaData(cambio.inizio, 'giorno')}</span>
          </div>,
        )
      }
      voci.push(
        <GiornoAgenda
          key={data}
          data={data}
          delGiorno={perGiorno.get(data) ?? []}
          compleanni={feste.get(data) ?? []}
          eventi={eventi.get(data) ?? []}
        />,
      )
    }
  }

  return (
    // Chi scorre non perde il gesto: il nodo resta fra i disegni. Dove portarlo lo
    // decide `portaAgenda`, dopo il disegno.
    <div ref={agenda} className="agenda" data-scorrimento="calendario:agenda" data-telaio="agenda">
      {voci}
    </div>
  )
}

/** Un giorno dell'agenda: la testata, i compleanni, gli eventi, le ore. */
function GiornoAgenda ({ data, delGiorno, compleanni, eventi }: {
  data: Iso
  delGiorno: Lezione[]
  compleanni: Compleanno[]
  eventi: EventoCalendario[]
}): ReactElement {
  const t = testi()
  const inAula = classiInAula(delGiorno, data)
  const vuoto = delGiorno.length === 0 && compleanni.length === 0 && eventi.length === 0
  return (
    <section
      data-agenda-giorno={data}
      className={classi(
        'agenda__giorno',
        data === stato.adessoData && 'agenda__giorno--oggi',
        vuoto && 'agenda__giorno--vuoto',
        (festivo(data) || chiusura(data)) && 'agenda__giorno--libero',
      )}
    >
      <header className="agenda__testata">
        <span className="agenda__data">{formattaData(data, 'lungo')}</span>
        {data === stato.adessoData ? <Pastiglia testo={t.oggi} tono="informativo" /> : null}
        {chiusura(data) ? <Pastiglia testo={chiusura(data)} tono="quiete" /> : null}
      </header>
      {/* I compleanni fra la testata e le ore: sono del giorno, non di un'ora. */}
      {compleanni.length > 0
        ? (
            <div className="agenda__compleanni">
              {compleanni.map((festa) => (
                <ChipCompleanno
                  key={`${festa.allievoId}:${festa.classeId}`}
                  compleanno={festa}
                  inAula={inAula.has(festa.classeId)}
                />
              ))}
            </div>
          )
        : null}
      {/* Gli eventi senza lezione in cima, da soli; quelli collegati sotto la loro ora. */}
      {eventi.filter((e) => !lezioneDellEvento(e)).map((evento) => (
        <VoceEvento key={evento.chiave} evento={evento} />
      ))}
      {delGiorno.map((lezione) => (
        <VoceLezione key={lezione.id} lezione={lezione} />
      ))}
    </section>
  )
}

/** Un'ora dell'agenda, con sotto gli eventi ICS su cui è ancorata. */
function VoceLezione ({ lezione }: { lezione: Lezione }): ReactElement {
  const riepilogo = riepilogaPresenze(lezione.presenze)
  const collegati = eventiDellaLezione(lezione.id)
  const materia = nomeMateriaDiLezione(lezione)
  const titolo = titoloDiLezione(lezione)
  return (
    <>
      <button
        className={classi(
          'agenda__voce',
          `agenda__voce--${lezione.stato}`,
          ...classiDivergenza(divergenzaLezione(lezione.id)),
        )}
        title={conDivergenza('', divergenzaLezione(lezione.id)) || undefined}
        type="button"
        {...ancora(lezione.id, collegati.length > 0)}
        onClick={() => apriLezione(lezione)}
        onContextMenu={(evento) => menuLezione(evento.nativeEvent, lezione)}
      >
        <span className="agenda__orario">
          {`${inizioLezione(lezione) ?? ''}–${fineLezione(lezione) ?? ''}`}
        </span>
        <PuntoColore colore={coloreDiLezione(lezione)} />
        <span className="agenda__testo">
          <strong>{nomeClasseDiLezione(lezione)}</strong>
          {/* La materia accanto alla classe: nella giornata le ore sono di classi e
              materie diverse. */}
          {materia ? <span className="agenda__materia">{materia}</span> : null}
          {titolo ? <span className="agenda__titolo">{titolo}</span> : null}
        </span>
        <span className="agenda__coda">
          {segnoCollegamento(collegati)}
          <Pastiglia testo={formattaDurata(minutiEffettivi(lezione))} tono="quiete" />
          {lezione.stato === 'svolta' && riepilogo.udTotali > 0
            ? (
                <Pastiglia
                  testo={`${riepilogo.presenti}/${riepilogo.totale - riepilogo.senzaAppello}`}
                  tono={riepilogo.assenti > 0 ? 'attenzione' : 'positivo'}
                  simbolo="utente"
                />
              )
            : null}
          {lezione.stato === 'annullata'
            ? <Pastiglia testo={minuscolo(lessico().statiLezione.annullata)} tono="negativo" />
            : null}
        </span>
      </button>
      {/* La catena c'è sempre; gli eventi appesi sotto solo con «Calendario ICS» acceso. */}
      {icsInVista()
        ? collegati.map((evento) => <VoceEvento key={evento.chiave} evento={evento} />)
        : null}
    </>
  )
}
