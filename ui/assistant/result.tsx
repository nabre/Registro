// I dati che una lettura ha tirato fuori, disegnati dal registro: la busta
// della procedura impaginata da `api/presentation.ts`, senza passare dal
// modello. Si vede anche se la risposta non arriva, perché il dato letto resta.
// Le tabelle sono quelle di `answer.tsx` (`assistente__tabella`).

import { Fragment, type ReactElement, type ReactNode } from 'react'

import type { BloccoRisultato, RisultatoAssistente } from '#contract/protocol.js'
import { tabellaAssistente } from './answer.js'
import { testi } from './chat.testi.js'

function valori (blocco: Extract<BloccoRisultato, { tipo: 'valori' }>): ReactElement {
  return (
    <dl className="assistente__valori">
      {blocco.voci.map((voce, indice) => (
        <Fragment key={indice}>
          <dt>{voce.etichetta}</dt>
          <dd>{voce.valore}</dd>
        </Fragment>
      ))}
    </dl>
  )
}

function tabella (blocco: Extract<BloccoRisultato, { tipo: 'tabella' }>): ReactElement {
  return tabellaAssistente(
    blocco.colonne.map((colonna) => colonna.testo),
    blocco.righe,
    (indice) => blocco.colonne[indice]?.allinea === 'destra',
  )
}

/**
 * Quante righe si vedono e quante ce n'erano, solo se tagliato: un elenco
 * tagliato in silenzio sembrerebbe completo (come `ElencoVisibile`). Senza i
 * campi opzionali non si dichiara niente.
 */
function coda (mostrate: number, quante: number | undefined, troncata?: boolean): ReactNode {
  if (!troncata || typeof quante !== 'number') return null
  return <p className="assistente__coda-tabella">{testi().seNeVedono(mostrate, quante)}</p>
}

/**
 * Se un blocco ha davvero la forma che dichiara: rientrando, lo schema di
 * `assistente.stacca` passa i blocchi come `qualunque()`, e un blocco storto
 * farebbe cadere il ridisegno dell'intero registro.
 */
function haForma (voce: BloccoRisultato): boolean {
  if (voce.tipo === 'valori') return Array.isArray(voce.voci)
  if (voce.tipo === 'elenco') return Array.isArray(voce.voci)
  return Array.isArray(voce.colonne) && Array.isArray(voce.righe)
}

function blocco (voce: BloccoRisultato): ReactNode {
  // Un blocco che non è un oggetto con un `tipo` arriva da una busta non convalidata.
  if (!voce || typeof voce !== 'object' || typeof voce.tipo !== 'string') return null

  const titolo = voce.titolo
    ? <h5 className="assistente__blocco-titolo">{voce.titolo}</h5>
    : null

  // Un genere sconosciuto (o rotto) non si mostra.
  if (!haForma(voce)) return null
  switch (voce.tipo) {
    case 'valori':
      return <>{titolo}{valori(voce)}</>
    case 'elenco':
      return (
        <>
          {titolo}
          <ul className="assistente__elenco">
            {voce.voci.map((riga, indice) => <li key={indice}>{riga}</li>)}
          </ul>
          {coda(voce.voci.length, voce.quante, voce.troncata)}
        </>
      )
    case 'tabella':
      return <>{titolo}{tabella(voce)}{coda(voce.righe.length, voce.quante, voce.troncata)}</>
    default:
      return null
  }
}

/**
 * Un risultato letto, col titolo e il nome della procedura, com'è sulla
 * pastiglia dell'attrezzo: è la fonte del numero, per ricontrollarlo.
 */
export function risultatoLetto (risultato: RisultatoAssistente): ReactNode {
  // Come per i blocchi: un rientro non passa da schemi, e un `blocchi` storto
  // farebbe cadere il ridisegno.
  if (!risultato || typeof risultato !== 'object' || !Array.isArray(risultato.blocchi)) return null
  return (
    <section className="assistente__risultato">
      <header className="assistente__risultato-testata">
        <h4>{risultato.titolo}</h4>
        <code>{risultato.procedura}</code>
      </header>
      {risultato.blocchi.map((voce, indice) => <Fragment key={indice}>{blocco(voce)}</Fragment>)}
    </section>
  )
}
