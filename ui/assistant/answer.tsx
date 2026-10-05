// La risposta del modello, disegnata: `format.ts` decide i blocchi (e si prova
// senza browser), qui si costruiscono gli elementi. Solo testo, niente HTML:
// un `<script>` in una risposta resta scritto `<script>`. Le tabelle non sono
// quelle del registro (`components/table.tsx`): stanno in una bolla stretta, con
// il foglio `styles/assistant.css` che anche la finestra staccata carica.

import { Fragment, type ReactElement, type ReactNode } from 'react'

import { blocchi, type Blocco, type Pezzo } from './format.js'

/** I pezzi di una riga: il grassetto e il codice, il resto testo. */
function scritti (pezzi: readonly Pezzo[]): ReactNode[] {
  return pezzi.map((pezzo, indice) => {
    if (pezzo.codice) return <code key={indice}>{pezzo.testo}</code>
    if (pezzo.forte) return <strong key={indice}>{pezzo.testo}</strong>
    return pezzo.testo
  })
}

/** Le righe di un paragrafo, con gli a capo che il modello ci ha messo. */
function paragrafo (righe: Pezzo[][], chiave: number): ReactElement {
  return (
    <p key={chiave} className="assistente__paragrafo">
      {righe.map((riga, indice) => (
        <Fragment key={indice}>
          {indice > 0 ? <br /> : null}
          {scritti(riga)}
        </Fragment>
      ))}
    </p>
  )
}

/**
 * La tabella dell'assistente, per le risposte del modello e per i risultati
 * degli attrezzi (`result.tsx`). La prima colonna è in `th`: il lettore di
 * schermo la ripete accanto a ogni cifra. Righe e colonne sono fisse per
 * risposta: la chiave è la posizione.
 */
export function tabellaAssistente (
  intestazione: ReactNode[],
  righe: ReactNode[][],
  aDestra: (colonna: number) => boolean,
): ReactElement {
  const classe = (colonna: number): string | undefined =>
    aDestra(colonna) ? 'assistente__cella--destra' : undefined

  return (
    <div className="assistente__tabella-contenitore">
      <table className="assistente__tabella">
        <thead>
          <tr>
            {intestazione.map((cella, colonna) => (
              <th key={colonna} className={classe(colonna)} scope="col">{cella}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {righe.map((riga, indice) => (
            <tr key={indice}>
              {riga.map((cella, colonna) =>
                colonna === 0
                  ? <th key={colonna} className={classe(colonna)} scope="row">{cella}</th>
                  : <td key={colonna} className={classe(colonna)}>{cella}</td>,
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function tabella (blocco: Extract<Blocco, { genere: 'tabella' }>): ReactElement {
  return tabellaAssistente(
    blocco.intestazione.map(scritti),
    blocco.righe.map((riga) => riga.map(scritti)),
    (colonna) => blocco.allineamenti[colonna] === 'destra',
  )
}

function disegna (blocco: Blocco, chiave: number): ReactElement {
  switch (blocco.genere) {
    case 'titolo':
      // `h4` e non `h2`: un titolo di primo livello direbbe al lettore di schermo che
      // comincia un'altra pagina.
      return <h4 key={chiave} className="assistente__titoletto">{scritti(blocco.pezzi)}</h4>
    case 'elenco': {
      const Elenco = blocco.ordinato ? 'ol' : 'ul'
      return (
        <Elenco key={chiave} className="assistente__elenco">
          {blocco.voci.map((voce, indice) => <li key={indice}>{scritti(voce)}</li>)}
        </Elenco>
      )
    }
    case 'tabella':
      return <Fragment key={chiave}>{tabella(blocco)}</Fragment>
    default:
      return paragrafo(blocco.righe, chiave)
  }
}

/** Il corpo di una risposta: i blocchi, in ordine di lettura. */
export function corpoDellaRisposta (testo: string): ReactNode[] {
  return blocchi(testo).map(disegna)
}
