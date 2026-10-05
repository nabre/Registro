// Il calendario: la striscia delle settimane dell'anno, sopra la settimana
// aperta, con il numero di lezioni, il confine di semestre e, con l'ICS acceso,
// dove qualcosa non torna.

import { Fragment, useEffect, useRef, type ReactElement } from 'react'

import { lessico } from '#core/dominio/lexicon.testi.js'
import { quanti } from '#core/dominio/lexicon.js'
import { formattaData, giornoSettimana, inizioSettimana, nomeSemestre, oggi, settimanaDi, settimanaIso, sommaGiorni } from '#core/dominio/dates.js'
import type { Iso } from '#core/dominio/models.js'
import { classi } from '#ui/classNames.js'
import { Icona } from '#ui/components/icons.js'
import { anomalieCalendario, icsInVista } from '#ui/externalCalendar.js'
import { aggiorna, annoCorrente, lezioniInAgenda, stato } from '#ui/state.js'
import { chiusura, festivo, chiudeSemestreDiMezzo, giorniVisibili, letteraDi } from './common.js'
import { SEGNI_ICS, segniAnomalie } from './ics.js'
import { testi } from './calendar.testi.js'
import { testi as testiPagina } from '#ui/views/calendar.testi.js'

// ------------------------------------------------------------------ settimana

/**
 * Dove si era lasciata la fila, per quale settimana aperta e quanto era larga.
 * Uscendo dal calendario la fila sparisce e ripartirebbe da capo: si ricentra
 * solo se cambiano settimana o larghezza, altrimenti torna dove l'aveva
 * lasciata chi la scorreva.
 */
const scorrimentoFila: { lunedi: Iso | null, larghezza: number, sinistra: number } = {
  lunedi: null,
  larghezza: 0,
  sinistra: 0,
}

/**
 * Tutte le settimane dell'anno scolastico, anche quelle vuote (buchi o pause
 * da vedere). Il confine si segna dove un semestre finisce, se ne segue un
 * altro. Si ripiega; chiusa resta la testata con il conto e il pulsante.
 */
export function StrisciaSettimane (): ReactElement | null {
  const fila = useRef<HTMLDivElement>(null)
  const anno = annoCorrente()
  const chiusa = stato.strisciaSettimaneChiusa
  const corrente = inizioSettimana(stato.data)

  // La settimana aperta dev'essere visibile nella fila: si scorre solo la fila,
  // di lato e se serve (`scrollIntoView` muoverebbe la pagina), a disegno fatto.
  // Solo quando cambiano settimana o larghezza.
  useEffect(() => {
    if (chiusa) return
    const quadro = requestAnimationFrame(() => {
      const viva = fila.current
      if (!viva) return
      const larghezza = viva.clientWidth
      if (scorrimentoFila.lunedi === corrente && scorrimentoFila.larghezza === larghezza) {
        // Una fila nuova (rientrando nel calendario, o riaperta) riparte da zero:
        // torna dov'era. Quella che resta è già lì, e non la si tocca mentre scorre.
        if (viva.scrollLeft === 0 && scorrimentoFila.sinistra > 0) {
          viva.scrollLeft = scorrimentoFila.sinistra
        }
        return
      }
      scorrimentoFila.lunedi = corrente
      scorrimentoFila.larghezza = larghezza
      const accesa = viva.querySelector<HTMLElement>('.striscia-settimane__voce--corrente')
      if (accesa) {
        const vista = viva.getBoundingClientRect()
        const voce = accesa.getBoundingClientRect()
        if (voce.left < vista.left || voce.right > vista.right) {
          viva.scrollLeft += voce.left - vista.left - (vista.width - voce.width) / 2
        }
      }
      scorrimentoFila.sinistra = viva.scrollLeft
    })
    return () => cancelAnimationFrame(quadro)
  })

  if (!anno) return null
  const t = testi()

  const lezioni = lezioniInAgenda()
  // Si contano solo i giorni che la griglia mostra, come la settimana aperta.
  const visibili = giorniVisibili()
  const quante = new Map<Iso, number>()
  for (const lezione of lezioni) {
    if (!visibili.includes(giornoSettimana(lezione.data))) continue
    const lunedi = inizioSettimana(lezione.data)
    quante.set(lunedi, (quante.get(lunedi) ?? 0) + 1)
  }

  // La settimana di oggi, che non è per forza quella aperta.
  const diOggi = inizioSettimana(oggi())
  const ultima = inizioSettimana(anno.fine)
  const voci: ReactElement[] = []
  // Con l'interruttore «Calendario ICS» acceso ogni settimana dice se qualcosa
  // non torna; `null` è «non ancora letto» e non segna niente.
  // Chiusa, niente segni e niente confronto con l'ICS, che è la parte cara.
  const anomalie = !chiusa && icsInVista()
    ? anomalieCalendario()
    : null
  let daGuardare = 0

  for (
    let lunedi = inizioSettimana(anno.inizio);
    lunedi <= ultima;
    lunedi = sommaGiorni(lunedi, 7)
  ) {
    const giorni = settimanaDi(lunedi).filter((g) => visibili.includes(giornoSettimana(g)))
    const conta = quante.get(lunedi) ?? 0
    // Il confine si segna a destra della settimana in cui un semestre finisce
    // (non all'inizio del successivo, né all'inizio dell'anno). Si cerca su tutti
    // e sette i giorni: può finire in un giorno nascosto.
    const chiude = settimanaDi(lunedi).map(chiudeSemestreDiMezzo).find(Boolean) ?? null
    const sospesa = giorni.length > 0 && giorni.every((g) => festivo(g) || chiusura(g))
    const lettera = letteraDi(lunedi)
    const guasti = anomalie?.get(lunedi)
    const segni = guasti ? segniAnomalie(guasti) : []
    if (segni.length > 0) daGuardare += 1

    voci.push(
      <button
        key={lunedi}
        className={classi(
          'striscia-settimane__voce',
          conta > 0 ? 'striscia-settimane__voce--piena' : 'striscia-settimane__voce--vuota',
          lunedi === corrente && 'striscia-settimane__voce--corrente',
          lunedi === diOggi && 'striscia-settimane__voce--oggi',
          sospesa && 'striscia-settimane__voce--sospesa',
          chiude && 'striscia-settimane__voce--chiude-semestre',
          segni.length > 0 && 'striscia-settimane__voce--ics-anomala',
        )}
        type="button"
        title={[
          [
            t.settimana(settimanaIso(lunedi)),
            `${formattaData(giorni[0] ?? lunedi)}–${formattaData(giorni[giorni.length - 1] ?? lunedi)}`,
            lunedi === diOggi ? t.questaSettimana : null,
            conta > 0 ? quanti(conta, lessico().lezione) : t.nessunaLezione,
            lettera ? t.settimanaMinuscola(lettera) : null,
            chiude ? t.finisceIl(nomeSemestre(chiude)) : null,
          ]
            .filter(Boolean)
            .join(' · '),
          ...segni.map((segno) => `${segno.simbolo} ${segno.frase}`),
        ].join('\n')}
        aria-current={lunedi === corrente ? 'true' : undefined}
        onClick={() => aggiorna({ data: lunedi })}
      >
        <span className="striscia-settimane__numero">{String(settimanaIso(lunedi))}</span>
        {/* La lettera, in sola lettura: si mette dall'angolo della settimana aperta. */}
        {lettera ? <span className="striscia-settimane__lettera">{lettera}</span> : null}
        {/* Il numero di lezioni, non un pallino: tre e undici non sono uguali. */}
        <span className="striscia-settimane__conta">{conta > 0 ? String(conta) : '·'}</span>
        {segni.length > 0
          ? (
              <span className="striscia-settimane__ics">
                {segni.map((segno) => (
                  <span key={segno.tipo} className={`striscia-settimane__ics--${segno.tipo}`}>{segno.simbolo}</span>
                ))}
              </span>
            )
          : null}
      </button>,
    )
  }

  // Solo le settimane della striscia: `quante` raccoglie anche lezioni fuori dall'anno.
  const prima = inizioSettimana(anno.inizio)
  const piene = [...quante.entries()]
    .filter(([lunedi, n]) => n > 0 && lunedi >= prima && lunedi <= ultima)
    .length
  return (
    // Anello della catena di telaio fino alla fila.
    <div className={classi('striscia-settimane', chiusa && 'striscia-settimane--chiusa')} data-telaio="striscia">
      <div className="striscia-settimane__testata">
        <span>{testiPagina().settimaneConLezioni(piene, voci.length)}</span>
        {anomalie
          ? (
              <span
                className="striscia-settimane__legenda"
                title={SEGNI_ICS.map((s) => `${s.simbolo} ${s.spiegazione}`).join('\n')}
              >
                {daGuardare > 0 ? t.icsDaGuardare(daGuardare) : t.icsTuttoTorna}
                {SEGNI_ICS.map((s) => (
                  <Fragment key={s.tipo}>
                    <span className={`striscia-settimane__ics--${s.tipo}`}>{s.simbolo}</span>
                    {` ${s.breve} `}
                  </Fragment>
                ))}
              </span>
            )
          : null}
        <button
          className="striscia-settimane__ripiega"
          type="button"
          // Il fuoco resta sul pulsante dopo il ridisegno.
          data-fuoco="striscia-settimane-ripiega"
          // `aria-expanded` dice lo stato ai lettori di schermo; il nome dice il gesto.
          aria-expanded={!chiusa}
          aria-controls={chiusa ? undefined : 'striscia-settimane-voci'}
          aria-label={chiusa ? t.mostraSettimane : t.nascondiSettimane}
          title={chiusa ? t.mostraSettimane : t.nascondiSettimane}
          onClick={() => aggiorna({ strisciaSettimaneChiusa: !chiusa })}
        >
          <Icona nome={chiusa ? 'giu' : 'su'} classe="icona--minuta" />
        </button>
      </div>
      {chiusa
        ? null
        : (
            // La fila resta lo stesso nodo fra i disegni: chi la sta scorrendo non
            // perde il gesto né la posizione.
            <div
              ref={fila}
              className="striscia-settimane__voci"
              id="striscia-settimane-voci"
              data-telaio="fila-settimane"
              onScroll={(evento) => { scorrimentoFila.sinistra = evento.currentTarget.scrollLeft }}
            >
              {voci}
            </div>
          )}
    </div>
  )
}
