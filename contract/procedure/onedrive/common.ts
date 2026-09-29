// Quel che le procedure di `onedrive` si dividono: la forma di una voce, e il
// rifiuto che si dà quando Microsoft non risponde.

import { errore } from '../../contract.js'
import { motivoSicuro } from '../../../core/azioni/context.js'
import { elenco, nullabile, numero, oggetto, scelta, testo } from '../../schemas.js'
import { testi } from './onedrive.testi.js'

const t = () => testi().voce

/** Una cartella o un documento `.regi`, come `VoceOneDrive`. */
export const VOCE = oggetto({
  id: testo({ aiuto: () => t().id }),
  drive: testo({ aiuto: () => t().drive }),
  nome: testo(),
  genere: scelta(['cartella', 'regi'], { aiuto: () => t().genere }),
  dimensione: numero({ aiuto: () => t().dimensione }),
  modificato: testo({ aiuto: () => t().modificato }),
  percorso: elenco(testo(), { aiuto: () => t().percorso }),
  figli: nullabile(numero({ aiuto: () => t().figli })),
})

/**
 * Una lettura di OneDrive: un guasto (rete, permesso, elemento sparito) diventa
 * «non disponibile» con la frase già detta, non un errore imprevisto.
 */
export async function daOneDrive<T> (lettura: () => Promise<T>): Promise<T> {
  try {
    return await lettura()
  } catch (guasto) {
    throw errore.nonDisponibile(motivoSicuro(guasto))
  }
}
