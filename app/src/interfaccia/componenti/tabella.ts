// Lo scheletro di una tabella, costruito una volta sola.
//
// Le tabelle del registro sono sette e non si somigliano affatto nel contenuto:
// una matrice di presenze, l'anagrafica di una classe, i voti di un semestre,
// i documenti da raccogliere. Quel che si somigliava era il *telaio* — un
// contenitore che scorre, la tabella, l'intestazione, il corpo, a volte un
// piede — e stava scritto per esteso in ognuna delle sette, dieci righe di
// annidamento prima di arrivare alla prima cella che dice qualcosa.
//
// Qui il telaio c'è una volta. Chi costruisce una tabella scrive le celle, che
// sono la parte che cambia e la sola che valga la pena leggere.

import { h, type Figlio } from '../dom.js'

export interface OpzioniTabella {
  /**
   * La variante, senza il prefisso: `voti`, `allievi`, `matrice`, `documenti`.
   * Diventa `tabella--voti`, ed è quel che il foglio di stile guarda per le
   * colonne che restano ferme scorrendo e per i minimi delle colonne di nomi.
   */
  variante?: string
  /**
   * La tabella scorre nelle due direzioni e si ferma in altezza sotto la
   * testata. Serve alle matrici, che crescono con gli allievi *e* con le unità
   * didattiche: senza, la pagina intera diventerebbe lunga come l'elenco.
   */
  griglia?: boolean
  /** Le celle dell'intestazione: i `<th>` della riga in cima. */
  intestazione: Figlio[]
  /** Le righe del corpo, già costruite. */
  righe: Figlio
  /** Le celle del piede — i totali, le medie — se ce n'è uno. */
  piede?: Figlio[]
}

/**
 * Il contenitore scorre e la tabella no, ed è voluto: la barra di scorrimento
 * deve stare *intorno* alla tabella, non dentro, o l'intestazione appiccicata
 * in cima scorrerebbe via con le righe.
 */
export function tabella (opzioni: OpzioniTabella): HTMLElement {
  return h(
    'div',
    { class: ['tabella-contenitore', opzioni.griglia && 'tabella-contenitore--griglia'] },
    h(
      'table',
      { class: ['tabella', opzioni.variante && `tabella--${opzioni.variante}`] },
      h('thead', null, h('tr', null, ...opzioni.intestazione)),
      h('tbody', null, opzioni.righe),
      opzioni.piede ? h('tfoot', null, h('tr', null, ...opzioni.piede)) : null,
    ),
  )
}
