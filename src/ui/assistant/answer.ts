// La risposta del modello, disegnata.
//
// `format.ts` ha già deciso che cosa c'è dentro — una tabella, un elenco, un
// paragrafo — e qui si costruiscono i nodi. Due file e non uno perché il primo
// si prova senza un browser intorno, e il conto delle colonne di una tabella è
// proprio quel che va provato: una cella in meno non rompe niente di visibile,
// e chi guarda dà la colpa al modello.
//
// **Nodi, non HTML.** Ogni parola passa da un nodo di testo: `h()` non
// interpreta niente, e un `<script>` scritto in una risposta resta scritto
// `<script>`. È la promessa che c'era prima — quando la risposta era un `<p>`
// solo — e non cambia: quel che cambia è che adesso i *dati* si leggono.
//
// Le tabelle non sono quelle del registro (`components/table.ts`): quelle
// hanno l'intestazione che resta ferma scorrendo, le colonne che non vanno a
// capo e un contenitore alto quanto la finestra, e vivono in pagine larghe. Qui
// si sta in una colonna di trecento pixel, dentro una bolla, e il foglio è
// `styles/assistant.css` — che la finestra staccata carica e `lists.css` no.

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

function tabella (blocco: Extract<Blocco, { genere: 'tabella' }>): Figlio {
  const classe = (colonna: number): string | undefined =>
    blocco.allineamenti[colonna] === 'destra' ? 'assistente__cella--destra' : undefined

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
          ...blocco.intestazione.map((cella, colonna) =>
            h('th', { class: classe(colonna), attr: { scope: 'col' } }, ...scritti(cella)),
          ),
        ),
      ),
      h(
        'tbody',
        null,
        ...blocco.righe.map((riga) =>
          h(
            'tr',
            null,
            ...riga.map((cella, colonna) =>
              // La prima colonna è quella che si cerca con l'occhio — il nome
              // della persona, del corso — e sta in `th`: è l'intestazione
              // della riga, e chi legge con lo schermo che parla se la sente
              // ripetere accanto a ogni cifra invece di perdersi dopo la terza.
              colonna === 0
                ? h('th', { class: classe(colonna), attr: { scope: 'row' } }, ...scritti(cella))
                : h('td', { class: classe(colonna) }, ...scritti(cella)),
            ),
          ),
        ),
      ),
    ),
  )
}

function disegna (blocco: Blocco): Figlio {
  switch (blocco.genere) {
    case 'titolo':
      // `h4` e non `h2`: dentro la bolla di una risposta, e sotto il titolo
      // della finestra. Un titolo di primo livello in mezzo alla conversazione
      // direbbe a chi legge con lo schermo che parla che qui comincia un'altra
      // pagina.
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

/**
 * Il corpo di una risposta: i blocchi, nell'ordine in cui si leggono.
 *
 * Una risposta senza niente di riconoscibile resta un paragrafo solo, che è il
 * caso normale — la maggior parte delle risposte sono due frasi — e non costa
 * niente più di prima.
 */
export function corpoDellaRisposta (testo: string): Figlio[] {
  return blocchi(testo).map(disegna)
}
