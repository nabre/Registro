// La data con cui si nomina una lezione: il giorno della settimana in tre
// lettere davanti, «gio 01.10.2026». Le lettere restano minuscole nel testo
// (quello letto ad alta voce, copiato e confrontato dalle prove) e il foglio di
// stile le disegna in maiuscoletto. Dove non c'è stile — una voce di menu, un
// `title`, un `aria-label` — si usa `formattaData(iso, 'settimana')`.

import { formattaData, giornoTreLettere } from '#core/dominio/dates.js'
import type { Iso } from '#core/dominio/models.js'
import { h } from '#ui/dom.js'

/**
 * La data di una lezione come nodo. `stile` è quello di `formattaData` per la
 * parte numerica: 'breve' (01.10.2026, il solito) o 'corto' (01.10) dove l'anno
 * è già scritto altrove.
 */
export function dataDiLezione (iso: Iso, stile: 'breve' | 'corto' = 'breve'): HTMLElement {
  const giorno = giornoTreLettere(iso)
  return h('span', { class: 'data-lezione' },
    giorno ? h('span', { class: 'data-lezione__giorno' }, giorno) : null,
    giorno ? ' ' : null,
    formattaData(iso, stile),
  )
}
