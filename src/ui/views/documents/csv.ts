// Il CSV guardato nella cornice, come una tabella.
//
// Prima i CSV erano gli unici documenti della cartella che non si potevano
// guardare da qui: la lente li mandava al foglio di calcolo, che è il posto
// giusto per *lavorarci* ma non per la domanda che si fa venti volte prima di
// consegnare — «questo file è quello che voglio dare?». Per rispondere serviva
// aprire Excel, aspettarlo, e tornare indietro; e intanto la cornice della
// pagina restava ferma sul foglio di prima.
//
// Il lettore di PDF di Chromium non saprebbe che farne, quindi qui il documento
// non si inquadra: si legge e si disegna. Il testo arriva dallo stesso indirizzo
// `registro://` da cui il telaio prende i PDF — è il protocollo che materializza
// la copia quando la pagina la chiede — e le celle le ricava `leggiCsv`, che è
// la stessa grammatica di chi il file lo ha scritto.
//
// Si legge una volta sola per versione del file: la vista si rifà a ogni minuto
// dell'orologio, e rileggere il foglio a ogni giro vorrebbe dire una richiesta
// al secondo per una tabella che non è cambiata.

import { leggiCsv } from '../../../domain/csv.js'
import { tabella } from '../../components/table.js'
import { h, type Figlio } from '../../dom.js'
import { aggiorna } from '../../state.js'

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
 * La tabella di un CSV, o quel che c'è al posto suo mentre lo si legge.
 *
 * `chiave` è la stessa che distingue una versione dall'altra nel telaio dei
 * PDF: cambia quando il file viene rifatto, e allora il foglio si rilegge.
 */
export function anteprimaCsv (opzioni: { indirizzo: string, chiave: string }): Figlio {
  if (letto?.chiave !== opzioni.chiave) {
    chiedi(opzioni.indirizzo, opzioni.chiave)
    return riquadro(h('p', { class: 'testo-quieto' }, 'Sto leggendo il foglio…'))
  }
  if (letto.errore !== null) {
    return riquadro(
      h(
        'p',
        { class: 'testo-quieto' },
        `Questo foglio non si è lasciato leggere: ${letto.errore}. ` +
          'Si apre lo stesso nel foglio di calcolo, con il pulsante qui sopra.',
      ),
    )
  }

  const { titolo, intestazione, corpo } = scomponi(letto.righe ?? [])
  if (intestazione.length === 0) {
    return riquadro(h('p', { class: 'testo-quieto' }, 'Questo foglio è vuoto.'))
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

/**
 * Chiede il foglio, una volta per versione.
 *
 * Il ridisegno arriva alla fine e non prima: chi ha premuto la lente vede
 * «sto leggendo», e appena il testo c'è la vista si rifà con la tabella dentro.
 */
function chiedi (indirizzo: string, chiave: string): void {
  if (inCorso === chiave) return
  inCorso = chiave
  void (async () => {
    try {
      const risposta = await fetch(indirizzo)
      if (!risposta.ok) throw new Error(`il protocollo ha risposto ${risposta.status}`)
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
 * Le righe divise in titolo, intestazione e corpo.
 *
 * I CSV del registro cominciano tutti allo stesso modo — una riga con il solo
 * titolo, una riga vuota, e poi i nomi delle colonne — perché è così che un
 * foglio di calcolo mostra di che cosa è l'esportazione. Qui quel titolo va
 * sopra la tabella e non dentro, o diventerebbe una prima riga con una cella
 * sola e dodici vuote accanto.
 *
 * Le righe vuote se ne vanno: in un CSV sono uno stacco per gli occhi di chi
 * apre Excel, e in una tabella disegnata sono righe di niente.
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
  // `Array.from` e non `Array(n).fill('')`: il secondo e' `any[]`, e da li' in
  // poi nessuno controlla piu' che questa funzione torni davvero delle stringhe.
  if (riga.length >= colonne) return riga
  return [...riga, ...Array.from({ length: colonne - riga.length }, () => '')]
}

/**
 * Se una cella è un numero, per allinearla a destra come in un foglio di
 * calcolo. La virgola è quella dei decimali italiani, e il segno di percentuale
 * fa parte del numero: le percentuali di assenza escono così.
 */
function numerica (cella: string): boolean {
  return /^-?\d+(?:[.,]\d+)?\s?%?$/.test(cella.trim())
}
