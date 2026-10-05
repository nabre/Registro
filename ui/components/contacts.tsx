// I recapiti che si premono, in React: un numero che si compone, un indirizzo
// che apre una mail. Il clic manda un'azione e apre l'host: un `<a href="tel:">`
// dalla sandbox non arriva da nessuna parte. Quel che non si può comporre (un
// numero con l'interno in coda) resta testo, perché un pulsante finto farebbe
// credere di aver chiamato.

import type { ReactElement } from 'react'

import { indirizzoScrivibile } from '#core/dominio/contacts.js'
import { numeroComponibile } from '#core/dominio/phones.js'
import { azione } from '#ui/bridge.js'
import { testi } from '#ui/components/contacts.testi.js'
import { Collegamento } from './base.js'

/** Che cosa si fa con un recapito premuto: si chiama, o ci si scrive. */
export type GenereRecapito = 'telefono' | 'email'

/**
 * Il recapito: un pulsante se il sistema può aprirlo, altrimenti testo, con la
 * stessa `classe` nei due casi perché occupi lo stesso posto.
 */
export function RecapitoPremibile ({ genere, valore, classe }: {
  genere: GenereRecapito
  valore: string
  classe?: string
}): ReactElement {
  const buono = genere === 'telefono' ? numeroComponibile(valore) : indirizzoScrivibile(valore)
  if (!buono) return <span className={classe}>{valore}</span>

  return (
    <Collegamento
      testo={valore}
      classe={classe}
      titolo={genere === 'telefono' ? testi().chiama(valore) : testi().scrivi(valore)}
      al={() =>
        void azione(
          genere === 'telefono'
            ? { tipo: 'sistema.chiama', numero: valore }
            : { tipo: 'sistema.scrivi', indirizzo: valore },
        )}
    />
  )
}
