// Le frecce in una matrice di caselle (check, appello, comportamento), in
// React: spostano il fuoco da una casella all'altra, come in una griglia; Tab
// resta com'è. È il gestore da dare a `onKeyDown` della griglia.

import type { KeyboardEvent } from 'react'

import { dentroUnCampo } from '#ui/focus.js'

const PASSI: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
}

/**
 * Il gestore delle frecce fra le caselle che rispondono a `casella`, nel corpo
 * della tabella: `<div onKeyDown={frecceNellaGriglia('.casella-check')}>`. In un
 * campo (i minuti, la nota dell'appello) le frecce restano del campo. Legge la
 * tabella al momento del tasto, non al disegno.
 */
export function frecceNellaGriglia (casella: string): (evento: KeyboardEvent<Element>) => void {
  return (evento) => {
    const passo = PASSI[evento.key]
    if (!passo || evento.altKey || evento.ctrlKey || evento.metaKey) return
    if (dentroUnCampo(evento.target)) return
    // Anche le celle di testata di riga (il pulsante di riga dell'appello).
    const cella = (evento.target as HTMLElement).closest('td, th')
    const riga = cella?.parentElement
    const corpo = riga?.parentElement
    if (!(cella instanceof HTMLTableCellElement) || !(riga instanceof HTMLTableRowElement)) return
    if (!(corpo instanceof HTMLTableSectionElement) || corpo.tagName !== 'TBODY') return
    const righe = Array.from(corpo.children) as HTMLTableRowElement[]
    const dopo = righe[righe.indexOf(riga) + passo[0]]?.cells[cella.cellIndex + passo[1]]
    // Al bordo il fuoco resta dov'è, e la pagina non scorre.
    evento.preventDefault()
    dopo?.querySelector<HTMLElement>(casella)?.focus()
  }
}
