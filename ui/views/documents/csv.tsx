// Il CSV guardato nella cornice, come una tabella: il lettore PDF non lo
// saprebbe mostrare, quindi si legge e si disegna. Il testo arriva dallo stesso
// indirizzo `registro://` dei PDF, e le celle le ricava `leggiCsv`, la stessa
// grammatica di chi l'ha scritto. Si legge una volta per versione del file,
// non a ogni ridisegno, e mai dentro il disegno (`asyncResources.ts`).

import type { ReactElement, ReactNode } from 'react'

import { leggiCsv } from '#core/dominio/csv.js'
import { classi } from '#ui/classNames.js'
import { Tabella } from '#ui/components/table.js'
import { risorse } from '#ui/asyncResources.js'
import { Quieto } from '#ui/components/base.js'
import { testi } from './csv.testi.js'

/** I fogli letti, per versione del file. */
const fogli = risorse<string[][]>(4)

/**
 * La tabella di un CSV, o il suo posto mentre lo si legge. `chiave` è quella
 * del lettore dei PDF: cambia quando il file viene rifatto. `isola` è quella
 * che la mostra: a lettura finita si rifà lei sola, non la pagina.
 */
export function anteprimaCsv (opzioni: {
  indirizzo: string
  chiave: string
  isola: string
}): ReactElement {
  const letto = fogli.leggi(opzioni.chiave, () => leggi(opzioni.indirizzo), {
    isola: opzioni.isola,
  })
  if (letto.stato === 'vuoto' || letto.stato === 'inVolo') {
    return riquadro(<Quieto>{testi().leggendo}</Quieto>)
  }
  if (letto.stato === 'errore') {
    return riquadro(<p className="testo-quieto">{testi().illeggibile(letto.errore)}</p>)
  }

  const { titolo, intestazione, corpo } = scomponi(letto.valore)
  if (intestazione.length === 0) {
    return riquadro(<Quieto>{testi().vuoto}</Quieto>)
  }

  const colonne = corpo.reduce((larga, riga) => Math.max(larga, riga.length), intestazione.length)
  return riquadro(
    <>
      {titolo ? <p className="documenti__csv-titolo">{titolo}</p> : null}
      <Tabella
        variante="csv"
        griglia
        // Per versione del file: un foglio rifatto riparte dall'alto.
        scorrimento={`csv:${opzioni.chiave}`} // testo-fisso: chiave di scorrimento
        // Celle e righe per posizione: il foglio non ha altri nomi, e non si riordina.
        intestazione={pareggia(intestazione, colonne).map((cella, i) => <th key={i}>{cella}</th>)}
        righe={corpo.map((riga, r) => (
          <tr key={r}>
            {pareggia(riga, colonne).map((cella, i) => (
              <td key={i} className={classi(numerica(cella) && 'tabella__numero')}>{cella}</td>
            ))}
          </tr>
        ))}
      />
    </>,
  )
}

/** Il contenitore che prende il posto del telaio: stessa area, stesso bordo. */
function riquadro (dentro: ReactNode): ReactElement {
  return <div className="documenti__csv">{dentro}</div>
}

/** Legge il foglio dall'indirizzo `registro://` e lo divide in celle. */
async function leggi (indirizzo: string): Promise<string[][]> {
  const risposta = await fetch(indirizzo)
  if (!risposta.ok) throw new Error(testi().risposta(risposta.status))
  return leggiCsv(await risposta.text())
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
