// Il calendario: un'ora disegnata, come blocco della settimana o pastiglia del
// mese, con gli stessi gesti.

import type { ReactElement } from 'react'

import {
  fineLezione,
  inizioLezione,
  momentoLezione,
  riepilogaPresenze,
} from '#core/dominio/calculations.js'
import { minutiDaOra } from '#core/dominio/dates.js'
import type { Lezione } from '#core/dominio/models.js'
import { classi } from '#ui/classNames.js'
import { Icona } from '#ui/components/icons.js'
import { eventiDellaLezione } from '#ui/externalCalendar.js'
import { moduloLezione } from '#ui/forms.js'
import {
  nomeClasseDiLezione,
  nomeDiLezione,
  nomeMateriaDiLezione,
  siglaMateriaDiLezione,
  coloreDiLezione,
  titoloDiLezione,
  stato,
} from '#ui/state.js'
import { apriLezione } from './common.js'
import { trascinabile, type Afferrabile } from './drag.js'
import {
  ancora,
  segnoCollegamento,
  divergenzaLezione,
  classiDivergenza,
  conDivergenza,
} from './ics.js'
import { inModifica, Maniglie, scegli, sceltaLezione } from './editor.js'
import { menuLezione } from './menus.js'
import { testi } from './calendar.testi.js'

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
  if (lezione.supplenza) righe.push(testi().supplenza)

  return righe.filter((riga) => riga.length > 0).join('\n')
}

/** Che numero ha quest'ora nel suo corso; vuoto per un'ora annullata. */
function etichettaNumero (lezione: Lezione): string {
  return lezione.stato === 'annullata' ? '' : nomeDiLezione(lezione)
}

/**
 * Gli attributi del trascinamento, solo in modifica: trascinare è un gesto della
 * modifica, come disegnare e stirare. Fuori il suggerimento resta quello.
 */
function presa (lezione: Lezione, titolo: string): Afferrabile | null {
  return inModifica() ? trascinabile(lezione, titolo) : null
}

/**
 * Il rettangolo di una lezione nella griglia della settimana. Posizione e
 * altezza in percentuale della fascia, perché la griglia si allunga con la
 * finestra; i pixel alla scala minima decidono solo che cosa scriverci dentro.
 */
export function BloccoLezione ({ lezione, minutiPrimaOra, durataFascia, scala }: {
  lezione: Lezione
  minutiPrimaOra: number
  durataFascia: number
  scala: number
}): ReactElement {
  const inizio = inizioLezione(lezione)
  const fine = fineLezione(lezione)
  if (!inizio || !fine) return <div />

  const minuti = minutiDaOra(fine) - minutiDaOra(inizio)
  const alto = ((minutiDaOra(inizio) - minutiPrimaOra) / durataFascia) * 100
  const quanto = (minuti / durataFascia) * 100
  // La stessa misura in pixel alla scala minima: decide quante righe entrano.
  const altezza = Math.max(22, minuti * scala)
  const colore = coloreDiLezione(lezione)
  const riepilogo = riepilogaPresenze(lezione.presenze)
  const momento = momentoLezione(lezione, stato.adessoData, stato.adessoOra)
  const materia = nomeMateriaDiLezione(lezione)
  const numero = etichettaNumero(lezione)
  const titolo = conDivergenza(
    dettagliDellaLezione(lezione, inizio, fine),
    divergenzaLezione(lezione.id),
  )
  const afferra = presa(lezione, titolo)

  return (
    <button
      className={classi(
        momento === 'in-corso' && 'blocco--adesso',
        momento === 'passata' && 'blocco--passata',
        'blocco',
        // testo-fisso: classe CSS
        `blocco--${lezione.stato}`,
        altezza < 46 && 'blocco--basso',
        sceltaLezione(lezione.id) && 'blocco--scelto',
        ...classiDivergenza(divergenzaLezione(lezione.id)),
        afferra?.ancorata && 'blocco--ancorata',
      )}
      type="button"
      // La chiave di fuoco tiene il blocco scelto sotto la tastiera dopo il ridisegno.
      data-lezione={lezione.id}
      // testo-fisso: chiave di fuoco, non testo
      data-fuoco={`lezione:${lezione.id}`}
      style={{
        top: `${alto}%`,
        height: `${quanto}%`,
        borderLeftColor: colore,
        // Tinta appena accennata: la colonna deve restare leggibile.
        // testo-fisso: un colore CSS
        backgroundColor: `color-mix(in srgb, ${colore} 14%, transparent)`,
      }}
      title={afferra?.title ?? titolo}
      draggable={afferra?.draggable}
      onDragStart={afferra?.onDragStart}
      {...ancora(lezione.id, eventiDellaLezione(lezione.id).length > 0)}
      // In modifica il clic sceglie e il doppio clic apre il modulo.
      onClick={() => (inModifica() ? scegli(lezione.id, true) : apriLezione(lezione))}
      onDoubleClick={() => {
        if (inModifica()) moduloLezione({ lezione })
      }}
      onFocus={(evento) => {
        if (evento.target === evento.currentTarget && inModifica()) scegli(lezione.id)
      }}
      onContextMenu={(evento) => {
        evento.stopPropagation()
        menuLezione(evento.nativeEvent, lezione)
      }}
    >
      {/* Le pause come tagli chiari dentro il blocco. */}
      {lezione.slot
        .filter((s) => s.tipo === 'pausa')
        .map((pausa) => (
          <span
            key={`${pausa.inizio}-${pausa.fine}`}
            className="blocco__pausa"
            style={{
              // In percentuale del blocco: la pausa resta al suo posto anche stirandolo.
              top: `${((minutiDaOra(pausa.inizio) - minutiDaOra(inizio)) / minuti) * 100}%`,
              height: `${((minutiDaOra(pausa.fine) - minutiDaOra(pausa.inizio)) / minuti) * 100}%`,
            }}
          />
        ))}
      <span className="blocco__testata">
        <span className="blocco__ora">{inizio}</span>
        <span className="blocco__classe">{nomeClasseDiLezione(lezione)}</span>
        {/* La stessa classe può avere due materie: la materia sta su una riga sua
            sotto la classe; accanto solo nei blocchi bassi, dove una riga in più non entra. */}
        {altezza < 46 && materia ? <span className="blocco__materia">{materia}</span> : null}
        {/* In testata e non nel piede: si deve vedere anche nei blocchi bassi. */}
        {lezione.supplenza
          ? (
              <span className="blocco__supplenza" title={testi().supplenza}>
                <Icona nome="scambio" classe="icona--minuta" />
              </span>
            )
          : null}
        {segnoCollegamento(eventiDellaLezione(lezione.id))}
      </span>
      {altezza >= 46 && materia
        ? <span className="blocco__materia blocco__materia--riga">{materia}</span>
        : null}
      {/* L'aula su una riga sua, sotto classe e materia; nei blocchi bassi resta
          solo nel suggerimento. */}
      {altezza >= 46 && lezione.aula ? <span className="blocco__aula">{lezione.aula}</span> : null}
      {altezza >= 46 && numero ? <span className="blocco__numero">{numero}</span> : null}
      {altezza >= 64
        ? (
            <span className="blocco__piede">
              {lezione.stato === 'svolta' && riepilogo.udTotali > 0
                ? (
                    <span className="blocco__presenze">
                      {`${riepilogo.presenti}/${riepilogo.totale - riepilogo.senzaAppello}`}
                    </span>
                  )
                : null}
              {lezione.pianoId ? <Icona nome="piano" classe="icona--minuta" /> : null}
              {lezione.osservazioni.length > 0
                ? <span className="blocco__note">{String(lezione.osservazioni.length)}</span>
                : null}
            </span>
          )
        : null}
      {inModifica()
        ? (
            <Maniglie
              lezione={lezione}
              fascia={{ primaOra: minutiPrimaOra, ultimaOra: minutiPrimaOra + durataFascia }}
            />
          )
        : null}
    </button>
  )
}

/** La pastiglia di una lezione nelle celle del mese. */
export function ChipLezione ({ lezione }: { lezione: Lezione }): ReactElement {
  const inizio = inizioLezione(lezione)
  const materia = nomeMateriaDiLezione(lezione)
  const sigla = siglaMateriaDiLezione(lezione)
  // Nel suggerimento la materia per esteso; nella pastiglia solo la sigla.
  const titolo = `${inizio ?? ''} ${nomeClasseDiLezione(lezione)}${
    materia ? ` — ${materia}` : ''
  } ${titoloDiLezione(lezione)}`.trim()
  const afferra = presa(lezione, titolo)
  return (
    <button
      className={classi(
        'chip',
        // testo-fisso: classe CSS
        `chip--${lezione.stato}`,
        sceltaLezione(lezione.id) && 'chip--scelto',
        ...classiDivergenza(divergenzaLezione(lezione.id)),
        afferra?.ancorata && 'blocco--ancorata',
      )}
      type="button"
      data-lezione={lezione.id}
      // testo-fisso: chiave di fuoco, non testo
      data-fuoco={`lezione:${lezione.id}`}
      style={{ borderLeftColor: coloreDiLezione(lezione) }}
      title={afferra?.title ?? titolo}
      draggable={afferra?.draggable}
      onDragStart={afferra?.onDragStart}
      onClick={(evento) => {
        evento.stopPropagation()
        if (inModifica()) scegli(lezione.id, true)
        else apriLezione(lezione)
      }}
      onDoubleClick={(evento) => {
        if (!inModifica()) return
        // Il doppio clic sulla cella sotto crea una lezione: qui si apre questa.
        evento.stopPropagation()
        moduloLezione({ lezione })
      }}
      onFocus={(evento) => {
        if (evento.target === evento.currentTarget && inModifica()) scegli(lezione.id)
      }}
      onContextMenu={(evento) => {
        // Il menu del giorno, sulla cella sotto, non deve prendere il posto di questo.
        evento.stopPropagation()
        menuLezione(evento.nativeEvent, lezione)
      }}
    >
      <span className="chip__ora">{inizio ?? ''}</span>
      <span className="chip__testo">{nomeClasseDiLezione(lezione)}</span>
      {/* La sigla e non il nome: nella cella del mese i nomi lunghi verrebbero troncati. */}
      {sigla ? <span className="chip__materia">{sigla}</span> : null}
      {segnoCollegamento(eventiDellaLezione(lezione.id))}
    </button>
  )
}
