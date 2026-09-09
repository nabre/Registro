// Pezzi ripetuti uguali in mezza dozzina di viste: il filtro per classe, il
// «manda e avvisa se va storto», lo stato vuoto di un registro senza anno.
//
// Stavano scritti da capo in ogni vista, ognuno con una piccola differenza —
// qui il calendario guardava le classi visibili, là gli altri tutte quelle
// dell'anno — e una differenza per distrazione è indistinguibile da una
// voluta. Un posto solo vuol dire una sola risposta alla domanda «quali
// classi elenca il filtro».

import type { Classe, Corso } from '../../dominio/modelli.js'
import type { Azione, Risposta } from '../../protocollo.js'
import { campo, datoSintetico, pulsante, statoVuoto, type TonoPastiglia } from './base.js'
import type { NomeIcona } from './icone.js'
import { notifica } from './notifiche.js'
import { h } from '../dom.js'
import { azione } from '../ponte.js'

/**
 * Il select «Tutte le classi» che filtra calendario, corsi, piani
 * e todo — e, senza la voce «tutte», anche la scelta obbligata di valutazioni.
 *
 * L'elenco è sempre lo stesso: le classi dell'anno in corso, archiviate
 * escluse. Il calendario guardava `classiVisibili()` e gli altri
 * `classiDellAnno()` — due risposte diverse alla stessa domanda — e qui se ne
 * tiene una sola.
 */
export function selettoreClassi (opzioni: {
  nome: string
  classi: Classe[]
  valore: string | null
  includiTutte?: boolean
  al: (valore: string | null) => void
}): HTMLElement {
  const includiTutte = opzioni.includiTutte ?? true
  return campo({
    nome: opzioni.nome,
    tipo: 'select',
    valore: opzioni.valore ?? '',
    opzioni: [
      ...(includiTutte ? [{ valore: '', testo: 'Tutte le classi' }] : []),
      ...opzioni.classi.map((c) => ({ valore: c.id, testo: c.nome })),
    ],
    al: (valore) => opzioni.al(valore || null),
    classe: 'campo--in-linea',
  })
}

/**
 * Il select che sceglie un corso: «Calcolo professionale — DIC4a».
 *
 * Senza la voce «tutti»: la vista dei corsi mostra un corso alla volta con
 * tutto quel che gli appartiene, e «tutti» vorrebbe dire nessuno. L'etichetta
 * è il titolo del corso, che dice già materia e classe — le due cose che
 * servono a riconoscerlo — e per questo non c'è una seconda tendina davanti.
 */
export function selettoreCorsi (opzioni: {
  nome: string
  corsi: Corso[]
  valore: string | null
  al: (valore: string) => void
}): HTMLElement {
  return campo({
    nome: opzioni.nome,
    tipo: 'select',
    valore: opzioni.valore ?? '',
    opzioni: opzioni.corsi.map((c) => ({ valore: c.id, testo: c.titolo })),
    al: (valore) => opzioni.al(valore),
    classe: 'campo--in-linea',
  })
}

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
