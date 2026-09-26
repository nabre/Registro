// Il CSV guardato nella cornice, come una tabella: il lettore PDF non lo
// saprebbe mostrare, quindi si legge e si disegna. Il testo arriva dallo stesso
// indirizzo `registro://` dei PDF, e le celle le ricava `leggiCsv`, la stessa
// grammatica di chi l'ha scritto. Si legge una volta per versione del file,
// non a ogni ridisegno.

import { leggiCsv } from '../../../domain/csv.js'
import { tabella } from '../../components/table.js'
import { h, type Figlio } from '../../dom.js'
import { aggiorna } from '../../state.js'
import { quieto } from '../../components/base.js'
import { testi } from './csv.testi.js'

/** Il foglio letto, con la chiave della versione da cui è venuto. */
interface Letto {
  chiave: string
  righe: string[][] | null
  errore: string | null
}

let letto: Letto | null = null
/** La chiave che si sta leggendo adesso: non se ne chiedono due uguali. */
let inCorso: string | null = null

/**
 * La tabella di un CSV, o il suo posto mentre lo si legge. `chiave` è quella
 * del telaio dei PDF: cambia quando il file viene rifatto.
 */
export function anteprimaCsv (opzioni: { indirizzo: string, chiave: string }): Figlio {
  if (letto?.chiave !== opzioni.chiave) {
    chiedi(opzioni.indirizzo, opzioni.chiave)
    return riquadro(quieto(testi().leggendo))
  }
  if (letto.errore !== null) {
    return riquadro(
      h(
        'p',
        { class: 'testo-quieto' },
        testi().illeggibile(letto.errore),
      ),
    )
  }

  const { titolo, intestazione, corpo } = scomponi(letto.righe ?? [])
  if (intestazione.length === 0) {
    return riquadro(quieto(testi().vuoto))
  }

  const colonne = corpo.reduce((larga, riga) => Math.max(larga, riga.length), intestazione.length)
  return riquadro(
    titolo ? h('p', { class: 'documenti__csv-titolo' }, titolo) : null,
    tabella({
      variante: 'csv',
      griglia: true,
      intestazione: pareggia(intestazione, colonne).map((cella) => h('th', null, cella)),
      righe: corpo.map((riga) =>
        h(
          'tr',
          null,
          ...pareggia(riga, colonne).map((cella) =>
            h('td', { class: [numerica(cella) && 'tabella__numero'] }, cella),
          ),
        ),
      ),
    }),
  )
}

/** Il contenitore che prende il posto del telaio: stessa area, stesso bordo. */
function riquadro (...dentro: Figlio[]): HTMLElement {
  return h('div', { class: 'documenti__csv' }, ...dentro)
}

/** Chiede il foglio, una volta per versione; a lettura finita la vista si ridisegna. */
function chiedi (indirizzo: string, chiave: string): void {
  if (inCorso === chiave) return
  inCorso = chiave
  void (async () => {
    try {
      const risposta = await fetch(indirizzo)
      if (!risposta.ok) throw new Error(testi().risposta(risposta.status))
      letto = { chiave, righe: leggiCsv(await risposta.text()), errore: null }
    } catch (errore) {
      letto = {
        chiave,
        righe: null,
        errore: errore instanceof Error ? errore.message : String(errore),
      }
    } finally {
      inCorso = null
      aggiorna({})
    }
  })()
}

/**
 * Le righe divise in titolo, intestazione e corpo. I CSV del registro
 * cominciano con una riga di titolo e una vuota: il titolo va sopra la
 * tabella. Le righe vuote si tolgono.
 */
function scomponi (righe: string[][]): {
  titolo: string | null
  intestazione: string[]
  corpo: string[][]
} {
  const piene = righe.filter((riga) => riga.some((cella) => cella.trim() !== ''))
  if (piene.length === 0) return { titolo: null, intestazione: [], corpo: [] }

  const prima = piene[0].filter((cella) => cella.trim() !== '')
  const conTitolo = prima.length === 1 && piene.length > 1
  const resto = conTitolo ? piene.slice(1) : piene
  return {
    titolo: conTitolo ? prima[0] : null,
    intestazione: resto[0] ?? [],
    corpo: resto.slice(1),
  }
}

/** Una riga lunga quanto la tabella: un CSV può avere righe più corte. */
function pareggia (riga: string[], colonne: number): string[] {
  // `Array.from` e non `Array(n).fill('')`, che è `any[]` e toglierebbe il
  // controllo dei tipi.
  if (riga.length >= colonne) return riga
  return [...riga, ...Array.from({ length: colonne - riga.length }, () => '')]
}

/**
 * Se una cella è un numero, per allinearla a destra: virgola decimale e segno
 * di percentuale ammessi.
 */
function numerica (cella: string): boolean {
  return /^-?\d+(?:[.,]\d+)?\s?%?$/.test(cella.trim())
}
