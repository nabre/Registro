// La scheda personale: i riquadri comuni ai temi dei box di materia.

import type { ReactElement, ReactNode } from 'react'

import { TitoloGruppo } from '#ui/components/base.js'

/**
 * Un riquadro dentro il box di una materia (presenze, voti, osservazioni). Ci
 * sono sempre, anche vuoti, così ogni tema cade alla stessa altezza in ogni box.
 */
export function riquadroTema (titolo: string, quante: number, contenuto: ReactNode): ReactElement {
  return (
    <section className="riquadro-tema">
      {/* h4: sta dentro la scheda della materia (h3); un h5 saltava un livello. */}
      <TitoloGruppo titolo={titolo} quante={quante} />
      {contenuto}
    </section>
  )
}

/** La riga che riempie un riquadro quando non c'è niente da metterci. */
export function nienteQui (testo: string): ReactElement {
  return <p className="testo-quieto riquadro-tema__niente">{testo}</p>
}
