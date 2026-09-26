// La scheda di una pendenza (recupero, riconsegna, richiesta di firma,
// consegna): filo colorato a sinistra, testata con i gesti, riga quieta con le
// date. Porta la classe comune `pendenza` (la forma) e quella della famiglia,
// es. `recupero` (colori e differenze); lo stesso per i pezzi dentro.

import { h, type Figlio } from '../dom.js'

/** Quel che serve per disegnare una pendenza. */
interface OpzioniPendenza {
  /** La famiglia: `recupero`, `riconsegna`, `richiesta`, `consegna`. */
  classe: string
  /** Le classi di stato, già scritte per intero: `recupero--scaduto`. */
  stato?: Array<string | false | null | undefined>
  /** Quel che sta in testata, prima dei gesti. */
  testata: Figlio[]
  /** I gesti, raccolti in fondo alla testata; niente gruppo se mancano. */
  azioni?: Figlio[]
  /** La riga quieta sotto la testata; niente riga se manca. */
  quando?: Figlio[]
  /** Quel che segue la riga quieta, dentro la scheda. */
  coda?: Figlio[]
  /**
   * Il tag di scheda e testata: un caso che si guarda e non si chiude (oltre la
   * soglia di assenza) è una riga di `div`, non un articolo.
   */
  tag?: 'article' | 'div'
}

/** Le due classi di un pezzo della scheda: quella comune e quella della famiglia. */
function pezzo (classe: string, nome: string): string[] {
  return [`${classe}__${nome}`, `pendenza__${nome}`]
}

/** La scheda di una pendenza, con la testata, i gesti e la riga quieta. */
export function pendenza (o: OpzioniPendenza): HTMLElement {
  const sobria = o.tag === 'div'
  return h(
    sobria ? 'div' : 'article',
    { class: [o.classe, 'pendenza', ...(o.stato ?? [])] },
    h(
      sobria ? 'div' : 'header',
      { class: pezzo(o.classe, 'testata') },
      ...o.testata,
      o.azioni ? h('div', { class: pezzo(o.classe, 'azioni') }, ...o.azioni) : null,
    ),
    o.quando ? h('p', { class: pezzo(o.classe, 'quando') }, ...o.quando) : null,
    ...(o.coda ?? []),
  )
}

/** Il corso di una pendenza, quando pendenze di più corsi stanno nello stesso elenco. */
export function corsoPendenza (classe: string, nome: string): HTMLElement {
  return h('span', { class: pezzo(classe, 'corso') }, nome)
}
