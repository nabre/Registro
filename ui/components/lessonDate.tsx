// La data con cui si nomina una lezione, in React: il giorno della settimana in
// tre lettere davanti, «gio 01.10.2026». Le lettere restano minuscole nel testo
// (quello letto ad alta voce, copiato e confrontato dalle prove) e il foglio di
// stile le disegna in maiuscoletto. Dove non c'è stile — una voce di menu, un
// `title`, un `aria-label` — si usa `formattaData(iso, 'settimana')`.

import type { ReactElement } from 'react'

import { formattaData, giornoTreLettere } from '#core/dominio/dates.js'
import type { Iso } from '#core/dominio/models.js'

/**
 * La data di una lezione. `stile` è quello di `formattaData` per la parte
 * numerica: 'breve' (01.10.2026, il solito) o 'corto' (01.10) dove l'anno è già
 * scritto altrove.
 */
export function DataDiLezione ({ iso, stile = 'breve' }: {
  iso: Iso
  stile?: 'breve' | 'corto'
}): ReactElement {
  const giorno = giornoTreLettere(iso)
  return (
    <span className="data-lezione">
      {giorno ? <><span className="data-lezione__giorno">{giorno}</span>{' '}</> : null}
      {formattaData(iso, stile)}
    </span>
  )
}
