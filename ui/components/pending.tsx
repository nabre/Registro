// La scheda di una pendenza in React (recupero, riconsegna, richiesta di firma,
// consegna): filo colorato a sinistra, testata con i gesti, riga quieta con le
// date. Porta la classe comune `pendenza` (la forma) e quella della famiglia,
// es. `recupero` (colori e differenze); lo stesso per i pezzi dentro.

import type { ReactElement, ReactNode } from 'react'

import { classi } from '#ui/classNames.js'

/** Quel che serve per disegnare una pendenza. */
interface OpzioniPendenza {
  /** La famiglia: `recupero`, `riconsegna`, `richiesta`, `consegna`. */
  classe: string
  /** Le classi di stato, già scritte per intero: `recupero--scaduto`. */
  stato?: Array<string | false | null | undefined>
  /** Quel che sta in testata, prima dei gesti. */
  testata: ReactNode
  /** I gesti, raccolti in fondo alla testata; niente gruppo se mancano. */
  azioni?: ReactNode
  /** La riga quieta sotto la testata; niente riga se manca. */
  quando?: ReactNode
  /** Quel che segue la riga quieta, dentro la scheda. */
  coda?: ReactNode
  /**
   * Il tag di scheda e testata: un caso che si guarda e non si chiude (oltre la
   * soglia di assenza) è una riga di `div`, non un articolo.
   */
  tag?: 'article' | 'div'
}

/** Le due classi di un pezzo della scheda: quella comune e quella della famiglia. */
function pezzo (classe: string, nome: string): string | undefined {
  return classi(`${classe}__${nome}`, `pendenza__${nome}`)
}

/** La scheda di una pendenza, con la testata, i gesti e la riga quieta. */
export function Pendenza (o: OpzioniPendenza): ReactElement {
  const sobria = o.tag === 'div'
  const Scheda = sobria ? 'div' : 'article'
  const Testata = sobria ? 'div' : 'header'
  return (
    <Scheda className={classi(o.classe, 'pendenza', ...(o.stato ?? []))}>
      <Testata className={pezzo(o.classe, 'testata')}>
        {o.testata}
        {o.azioni ? <div className={pezzo(o.classe, 'azioni')}>{o.azioni}</div> : null}
      </Testata>
      {o.quando ? <p className={pezzo(o.classe, 'quando')}>{o.quando}</p> : null}
      {o.coda}
    </Scheda>
  )
}

/** Il corso di una pendenza, quando pendenze di più corsi stanno nello stesso elenco. */
export function CorsoPendenza ({ classe, nome }: { classe: string, nome: string }): ReactElement {
  return <span className={pezzo(classe, 'corso')}>{nome}</span>
}
