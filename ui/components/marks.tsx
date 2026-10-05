// I segni della matrice del comportamento in React, disegnati allo stesso modo
// nel registro e nella scheda della persona.

import type { ReactElement } from 'react'

import type { SegnoOsservato } from '#core/dominio/models.js'
import { NOMI_SEGNO, nomeSegnoScritto } from '#core/dominio/observations.js'
import { classi } from '#ui/classNames.js'
import { Icona, type NomeIcona } from './icons.js'

/**
 * I due segni con la loro icona: «++» e «−−» in una casella piccola si
 * confondono, verde e rosso no. Il nome per esteso sta in titolo ed etichetta.
 */
export const SEGNI: Array<{ valore: SegnoOsservato; simbolo: NomeIcona; nome: string }> = [
  { valore: 'positivo', simbolo: 'piu', nome: NOMI_SEGNO.positivo },
  { valore: 'negativo', simbolo: 'meno', nome: NOMI_SEGNO.negativo },
]

/** Come si chiama un segno: le parole del dominio, le stesse del verbale stampato. */
export const nomeSegno = nomeSegnoScritto

/**
 * Il segno da rileggere e non da premere. La casella vuota resta disegnata:
 * dice «annotato senza giudizio» e tiene allineata la riga.
 */
export function SegnoFermo ({ segno, conNota = false, racconto }: {
  segno: SegnoOsservato | null
  conNota?: boolean
  racconto?: string
}): ReactElement {
  const detto = racconto ?? nomeSegno(segno)
  const quale = SEGNI.find((s) => s.valore === segno)
  return (
    <span
      className={classi(
        'cella-segno', segno && `cella-segno--${segno}`, conNota && 'cella-segno--annotata', // testo-fisso: classe CSS
        'cella-segno--ferma',
      )}
      title={detto}
      aria-label={detto}
    >
      {quale ? <Icona nome={quale.simbolo} /> : null}
    </span>
  )
}
