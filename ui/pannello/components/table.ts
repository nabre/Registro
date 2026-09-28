// Il telaio di una tabella (contenitore che scorre, intestazione, corpo,
// piede), scritto una volta: chi costruisce una tabella scrive solo le celle.

import { h, type Figlio } from '../dom.js'

interface OpzioniTabella {
  /**
   * La variante senza prefisso (`voti` → `tabella--voti`): il foglio di stile ci
   * appende colonne ferme e minimi. Più d'una per le tabelle che ne sommano due
   * (le assenze sono `documenti` con regole in più).
   */
  variante?: string | readonly string[]
  /**
   * La tabella scorre nelle due direzioni e si ferma in altezza sotto la
   * testata: per le matrici, che crescono in righe e in colonne.
   */
  griglia?: boolean
  /**
   * La chiave di scorrimento di questa tabella (`ricordaScorrimenti` in
   * `dom.ts`): una spunta non la riporta in cima, cambiare matrice sì.
   */
  scorrimento?: string
  /**
   * La chiave di telaio del contenitore (`data-telaio`, vedi `aggiornaElemento`
   * in `dom.ts`): se tutta la catena dalla radice è telaio, il contenitore resta
   * lo stesso nodo fra due disegni e un clic non ferma né riporta indietro lo
   * scorrimento. Senza catena non fa niente.
   */
  telaio?: string
  /** Le celle dell'intestazione: i `<th>` della riga in cima. */
  intestazione: Figlio[]
  /** Le righe del corpo, già costruite. */
  righe: Figlio
  /** Le celle del piede — i totali, le medie — se ce n'è uno. */
  piede?: Figlio[]
  /**
   * Classi proprie al posto di `tabella-contenitore` e `tabella`, per le matrici
   * col loro foglio di stile (appello, check, corsi); allora `variante` e
   * `griglia` non contano.
   */
  classi?: { telaio?: string, tabella?: string }
  /** Il nome della tabella per chi legge con la voce: `aria-label`. */
  etichetta?: string
}

/**
 * Il contenitore scorre e la tabella no: la barra di scorrimento sta intorno,
 * così l'intestazione appiccicata in cima non scivola via con le righe.
 */
export function tabella (opzioni: OpzioniTabella): HTMLElement {
  const varianti = typeof opzioni.variante === 'string' ? [opzioni.variante] : opzioni.variante ?? []

  return h(
    'div',
    {
      class: opzioni.classi?.telaio ??
        ['tabella-contenitore', opzioni.griglia && 'tabella-contenitore--griglia'],
      dataset: { scorrimento: opzioni.scorrimento, telaio: opzioni.telaio },
    },
    h(
      'table',
      {
        class: opzioni.classi?.tabella ?? ['tabella', ...varianti.map((nome) => `tabella--${nome}`)], // testo-fisso: classe CSS
        attr: { 'aria-label': opzioni.etichetta },
      },
      h('thead', null, h('tr', null, ...opzioni.intestazione)),
      h('tbody', null, opzioni.righe),
      opzioni.piede ? h('tfoot', null, h('tr', null, ...opzioni.piede)) : null,
    ),
  )
}

/**
 * Porta la catena di telaio dentro una scheda di `base.ts`: la sezione e il suo
 * corpo diventano anelli, così la tabella che ci sta dentro può restare lo
 * stesso nodo. Sul telaio non si mettono ascoltatori legati allo stato: restano
 * quelli del primo disegno.
 */
export function inTelaio<T extends HTMLElement> (nodo: T, chiave: string): T {
  nodo.dataset.telaio = chiave
  const corpo = Array.from(nodo.children).find((figlio) => figlio.classList.contains('scheda__corpo'))
  if (corpo instanceof HTMLElement) corpo.dataset.telaio = `${chiave}:corpo`
  return nodo
}
