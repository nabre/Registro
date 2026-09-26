// I recapiti che si premono: un numero che si compone, un indirizzo che apre
// una mail. Il clic manda un'azione e apre l'host: un `<a href="tel:">` dalla
// sandbox non arriva da nessuna parte. Quel che non si può comporre (un numero
// con l'interno in coda) resta testo, perché un pulsante finto farebbe credere
// di aver chiamato.

import { indirizzoScrivibile } from '../../domain/contacts.js'
import { numeroComponibile } from '../../domain/phones.js'
import { h, type Figlio } from '../dom.js'
import { azione } from '../bridge.js'
import { collegamento } from './base.js'
import { testi } from './contacts.testi.js'

/** Che cosa si fa con un recapito premuto: si chiama, o ci si scrive. */
export type GenereRecapito = 'telefono' | 'email'

/**
 * Il recapito: un pulsante se il sistema può aprirlo, altrimenti testo, con la
 * stessa `classe` nei due casi perché occupi lo stesso posto.
 */
export function recapitoPremibile (
  genere: GenereRecapito,
  valore: string,
  classe?: string,
): Figlio {
  const buono = genere === 'telefono' ? numeroComponibile(valore) : indirizzoScrivibile(valore)
  if (!buono) return h('span', { class: classe }, valore)

  return collegamento({
    testo: valore,
    classe,
    titolo: genere === 'telefono' ? testi().chiama(valore) : testi().scrivi(valore),
    al: () =>
      void azione(
        genere === 'telefono'
          ? { tipo: 'sistema.chiama', numero: valore }
          : { tipo: 'sistema.scrivi', indirizzo: valore },
      ),
  })
}
