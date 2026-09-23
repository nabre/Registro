// I recapiti che si premono: un numero che si compone, un indirizzo che apre
// una mail nuova.
//
// Il registro non telefona e non spedisce da qui: consegna il recapito al
// sistema, che lo passa al programma di turno. È la differenza fra «copiare il
// numero e comporlo a mano» — quel che si faceva prima, e che resta accanto —
// e premerlo: le cifre non si ribattono, e una cifra sbagliata al telefono è
// una chiamata a casa di qualcun altro.
//
// Non è un `<a href="tel:">`: la pagina vive in una sandbox, e un collegamento
// a uno schema che non sia `https` non arriva da nessuna parte. Il clic manda
// un'azione, e ad aprire è l'host.
//
// Quel che non si può comporre resta testo e basta. Un interno scritto in coda
// al numero — «091 000 00 00 int. 12» — non è un numero da comporre, e un
// pulsante che finge di saperlo fare è peggio della riga scritta: chi lo preme
// crede di aver chiamato.

import { indirizzoScrivibile } from '../../domain/contacts.js'
import { numeroComponibile } from '../../domain/phones.js'
import { h, type Figlio } from '../dom.js'
import { azione } from '../bridge.js'

/** Che cosa si fa con un recapito premuto: si chiama, o ci si scrive. */
export type GenereRecapito = 'telefono' | 'email'

/**
 * Il recapito scritto: un pulsante che lo apre se il sistema può farci
 * qualcosa, un testo se no.
 *
 * `classe` è quella che gli darebbe chi lo disegna — `anagrafica__testo`, per
 * dire — e resta la stessa nei due casi: premibile o no, quel che si legge
 * deve andare a capo allo stesso modo e occupare lo stesso posto.
 */
export function recapitoPremibile (
  genere: GenereRecapito,
  valore: string,
  classe?: string,
): Figlio {
  const buono = genere === 'telefono' ? numeroComponibile(valore) : indirizzoScrivibile(valore)
  if (!buono) return h('span', { class: classe }, valore)

  return h(
    'button',
    {
      class: ['collegamento', classe],
      type: 'button',
      attr: { title: genere === 'telefono' ? `Chiama ${valore}` : `Scrivi a ${valore}` },
      onclick: () =>
        void azione(
          genere === 'telefono'
            ? { tipo: 'sistema.chiama', numero: valore }
            : { tipo: 'sistema.scrivi', indirizzo: valore },
        ),
    },
    valore,
  )
}
