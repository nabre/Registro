// Il punto di lettura delle pagine lunghe che hanno un indice a lato (la guida,
// ogni area delle impostazioni): la sezione che sta in cima e quanto se ne è
// già letto. Riaprendo la pagina, anche dopo aver chiuso il registro, si
// riprende da lì invece che dall'inizio.
//
// Il punto è una sezione più uno scarto in pixel e non lo `scrollTop` nudo:
// se sopra cambia qualcosa (una sezione che si allunga, una voce nuova) si
// torna comunque dentro la stessa sezione.
//
// Qui la misura e il ritorno; dove ricordarlo lo decide `state.ts`, e le
// pagine chiamano `seguiScorrimento` e `riprendi`.

import type { Segnalibro } from './memory.js'
import { ricorda, stato } from './state.js'

/** La scatola che scorre, la stessa per tutte le viste. */
function contenitore (): HTMLElement | null {
  return document.querySelector<HTMLElement>('main.contenuto')
}

/**
 * La sezione in cima: l'ultima il cui inizio è già salito fino al bordo, o
 * la prima se non ce n'è. `ancore` sono gli elementi con `data-sezione`.
 */
export function misura (scatola: HTMLElement, ancore: readonly HTMLElement[]): Segnalibro | null {
  if (ancore.length === 0) return null
  const bordo = scatola.getBoundingClientRect().top
  let qui = ancore[0]
  for (const ancora of ancore) {
    if (ancora.getBoundingClientRect().top - bordo > 1) break
    qui = ancora
  }
  const sezione = qui.dataset.sezione
  if (!sezione) return null
  return { sezione, scarto: Math.round(bordo - qui.getBoundingClientRect().top) }
}

/**
 * Torna al punto: l'inizio della sezione `scarto` pixel sopra il bordo. Falso
 * se la sezione non è nella pagina (filtrata, o sparita), e allora chi chiama
 * fa come senza segnalibro.
 */
export function riprendi (ancore: readonly HTMLElement[], segno: Segnalibro | undefined): boolean {
  const scatola = contenitore()
  const ancora = segno && ancore.find((voce) => voce.dataset.sezione === segno.sezione)
  if (!scatola || !segno || !ancora) return false
  const bordo = scatola.getBoundingClientRect().top
  scatola.scrollTop += ancora.getBoundingClientRect().top - bordo + segno.scarto
  return true
}

/** Dopo quanto fermo lo scorrimento si scrive il punto: non a ogni fotogramma. */
const PAUSA_MS = 400

let attesa: ReturnType<typeof setTimeout> | null = null

/**
 * Segue lo scorrimento della pagina e, a scorrimento fermo, ricorda il punto
 * sotto `chiave()`: `null` quando la pagina aperta non ne ha uno. Una volta
 * sola per pagina, al caricamento del modulo: `main.contenuto` si rifà a ogni
 * ridisegno, quindi si ascolta dal documento (lo `scroll` non risale, ma si
 * cattura).
 */
export function seguiScorrimento (chiave: () => string | null, ancore: () => HTMLElement[]): void {
  document.addEventListener('scroll', (evento) => {
    const scatola = evento.target
    if (!(scatola instanceof HTMLElement) || !scatola.matches('main.contenuto')) return
    if (chiave() === null) return
    if (attesa) clearTimeout(attesa)
    attesa = setTimeout(() => {
      attesa = null
      const dove = chiave()
      if (dove === null || !scatola.isConnected) return
      const segno = misura(scatola, ancore())
      if (!segno) return
      const prima = stato.segnalibri[dove]
      if (prima?.sezione === segno.sezione && prima.scarto === segno.scarto) return
      // Diretto e non da `aggiorna`: è una preferenza, e non si ridisegna.
      stato.segnalibri = { ...stato.segnalibri, [dove]: segno }
      ricorda()
    }, PAUSA_MS)
  }, { capture: true, passive: true })
}
