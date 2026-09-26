// La risposta del modello, disegnata: `format.ts` decide i blocchi (e si prova
// senza browser), qui si costruiscono i nodi. Solo nodi di testo, niente HTML:
// un `<script>` in una risposta resta scritto `<script>`. Le tabelle non sono
// quelle del registro (`components/table.ts`): stanno in una bolla stretta, con
// il foglio `styles/assistant.css` che anche la finestra staccata carica.

import { h, type Figlio } from '../dom.js'
import { blocchi, type Blocco, type Pezzo } from './format.js'

/** I pezzi di una riga: il grassetto e il codice, il resto testo. */
function scritti (pezzi: readonly Pezzo[]): Figlio[] {
  return pezzi.map((pezzo) => {
    if (pezzo.codice) return h('code', null, pezzo.testo)
    if (pezzo.forte) return h('strong', null, pezzo.testo)
    return pezzo.testo
  })
}

/** Le righe di un paragrafo, con gli a capo che il modello ci ha messo. */
function paragrafo (righe: Pezzo[][]): Figlio {
  const dentro: Figlio[] = []
  righe.forEach((riga, indice) => {
    if (indice > 0) dentro.push(h('br'))
    dentro.push(...scritti(riga))
  })
  return h('p', { class: 'assistente__paragrafo' }, ...dentro)
}

/**
 * La tabella dell'assistente, per le risposte del modello e per i risultati
 * degli attrezzi (`result.ts`). La prima colonna è in `th`: il lettore di
 * schermo la ripete accanto a ogni cifra.
 */
export function tabellaAssistente (
  intestazione: Figlio[],
  righe: Figlio[][],
  aDestra: (colonna: number) => boolean,
): HTMLElement {
  const classe = (colonna: number): string | undefined =>
    aDestra(colonna) ? 'assistente__cella--destra' : undefined

  return h(
    'div',
    { class: 'assistente__tabella-contenitore' },
    h(
      'table',
      { class: 'assistente__tabella' },
      h(
        'thead',
        null,
        h(
          'tr',
          null,
          ...intestazione.map((cella, colonna) =>
            h('th', { class: classe(colonna), attr: { scope: 'col' } }, cella),
          ),
        ),
      ),
      h(
        'tbody',
        null,
        ...righe.map((riga) =>
          h(
            'tr',
            null,
            ...riga.map((cella, colonna) =>
              colonna === 0
                ? h('th', { class: classe(colonna), attr: { scope: 'row' } }, cella)
                : h('td', { class: classe(colonna) }, cella),
            ),
          ),
        ),
      ),
    ),
  )
}

function tabella (blocco: Extract<Blocco, { genere: 'tabella' }>): Figlio {
  return tabellaAssistente(
    blocco.intestazione.map(scritti),
    blocco.righe.map((riga) => riga.map(scritti)),
    (colonna) => blocco.allineamenti[colonna] === 'destra',
  )
}

function disegna (blocco: Blocco): Figlio {
  switch (blocco.genere) {
    case 'titolo':
      // `h4` e non `h2`: un titolo di primo livello direbbe al lettore di schermo che
      // comincia un'altra pagina.
      return h('h4', { class: 'assistente__titoletto' }, ...scritti(blocco.pezzi))
    case 'elenco':
      return h(
        blocco.ordinato ? 'ol' : 'ul',
        { class: 'assistente__elenco' },
        ...blocco.voci.map((voce) => h('li', null, ...scritti(voce))),
      )
    case 'tabella':
      return tabella(blocco)
    default:
      return paragrafo(blocco.righe)
  }
}

/** Il corpo di una risposta: i blocchi, in ordine di lettura. */
export function corpoDellaRisposta (testo: string): Figlio[] {
  return blocchi(testo).map(disegna)
}
