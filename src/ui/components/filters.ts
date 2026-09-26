// Pezzi ripetuti in più viste: «manda e avvisa se va storto», lo stato vuoto
// di un registro senza anno, la fila di numeri in cima a una scheda.

import type { Azione, Risposta } from '../../protocol.js'
import { datoSintetico, pulsante, statoVuoto, type TonoPastiglia } from './base.js'
import type { NomeIcona } from './icons.js'
import { notifica } from './notifications.js'
import { h } from '../dom.js'
import { azione } from '../bridge.js'
import { testi } from './filters.testi.js'

/**
 * Manda un'azione e avvisa: il rifiuto lo notifica `azione`, qui si aggiunge
 * il messaggio di successo se l'host non ne dà uno suo.
 */
export async function eseguiOAvvisa (comando: Azione, messaggioOk?: string): Promise<Risposta> {
  const risposta = await azione(comando)
  if (risposta.ok && messaggioOk && !risposta.messaggio) notifica(messaggioOk, 'successo')
  return risposta
}

/**
 * Come si parte, detto una volta per tutte le viste vuote. Una costante: la
 * pagina si ricarica quando cambia lingua (`src/i18n/page.ts`).
 */
export const COME_SI_PARTE = testi().comeSiParte

/**
 * Lo stato vuoto di un registro senza anno scolastico: il testo lo sceglie la
 * vista, sotto c'è sempre come si parte.
 */
export function statoVuotoAnno (opzioni: {
  simbolo?: NomeIcona
  testo?: string
  crea: () => void
}): HTMLElement {
  return statoVuoto({
    simbolo: opzioni.simbolo ?? 'calendario',
    titolo: testi().nessunAnno,
    testo: [opzioni.testo, COME_SI_PARTE].filter(Boolean).join(' '),
    azione: pulsante({
      testo: testi().creaAnno,
      variante: 'primario',
      simbolo: 'piu',
      al: opzioni.crea,
    }),
  })
}

/**
 * La fila di numeri in cima a una scheda, nel suo riquadro grigio. Le voci
 * `null` si saltano.
 */
export function sintesiIncassata (
  ...campi: Array<{ etichetta: string; valore: string; tono?: TonoPastiglia } | null | false>
): HTMLElement {
  return h(
    'div',
    { class: 'sintesi sintesi--incassata' },
    ...campi.map((voce) => (voce ? datoSintetico(voce.etichetta, voce.valore, voce.tono) : null)),
  )
}
