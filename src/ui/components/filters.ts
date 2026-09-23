// Pezzi ripetuti uguali in mezza dozzina di viste: il filtro per classe, il
// «manda e avvisa se va storto», lo stato vuoto di un registro senza anno.
//
// Stavano scritti da capo in ogni vista, ognuno con una piccola differenza —
// qui il calendario guardava le classi visibili, là gli altri tutte quelle
// dell'anno — e una differenza per distrazione è indistinguibile da una
// voluta. Un posto solo vuol dire una sola risposta alla domanda «quali
// classi elenca il filtro».

import type { Azione, Risposta } from '../../protocol.js'
import { datoSintetico, pulsante, statoVuoto, type TonoPastiglia } from './base.js'
import type { NomeIcona } from './icons.js'
import { notifica } from './notifications.js'
import { h } from '../dom.js'
import { azione } from '../bridge.js'

// Qui c'erano `selettoreClassi` e `selettoreCorsi`, le due tendine che il
// calendario si metteva in testata. Non ci sono più: classe e corso si scelgono
// nella riga delle scelte della barra, insieme ad anno e periodo, che è dove il
// registro tiene tutte le risposte a «su che cosa sto guardando». Restano filtri
// del solo calendario — scrivono in `filtroClasseAgendaId` e
// `filtroCorsoAgendaId`, non nel corso del registro — ma il posto in cui si
// cambiano è uno per tutti.

/**
 * Manda un'azione e avvisa da solo: un errore diventa una notifica rossa con
 * quel che l'host ha detto, un successo — se c'è un messaggio da dare — una
 * verde. Era lo stesso blocco di tre righe ripetuto una quindicina di volte,
 * ognuna un'occasione di dimenticare il controllo su `risposta.ok`.
 */
export async function eseguiOAvvisa (comando: Azione, messaggioOk?: string): Promise<Risposta> {
  // Il rifiuto lo dice gia' `azione`, che e' la porta comune a tutti i comandi
  // che partono da un pulsante: qui resta la buona notizia, che l'host non
  // sempre ha motivo di dare da se'.
  const risposta = await azione(comando)
  if (risposta.ok && messaggioOk && !risposta.messaggio) notifica(messaggioOk, 'successo')
  return risposta
}

/**
 * Lo stato vuoto di un registro senza ancora un anno scolastico: sette viste
 * lo mostravano, ognuna con lo stesso pulsante «Avvio guidato» riscritto a
 * mano. Il testo resta personalizzabile — è lì che ogni vista spiega perché
 * le serve un anno — la struttura no.
 */
export function statoVuotoAnno (opzioni: {
  simbolo?: NomeIcona
  testo?: string
  avvia: () => void
}): HTMLElement {
  return statoVuoto({
    simbolo: opzioni.simbolo ?? 'calendario',
    titolo: 'Nessun anno scolastico',
    testo: opzioni.testo,
    azione: pulsante({
      testo: 'Avvio guidato',
      variante: 'primario',
      simbolo: 'piu',
      al: opzioni.avvia,
    }),
  })
}

/**
 * La fila di numeri in cima a una scheda — allievi, lezioni svolte, media —
 * incassata nel suo riquadro grigio. Lo stesso `div.sintesi--incassata` più
 * `datoSintetico` si scriveva a mano una quindicina di volte; una voce `null`
 * si salta, così chi chiama può costruire l'elenco con un `?&&` invece di un
 * filtro a parte.
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
