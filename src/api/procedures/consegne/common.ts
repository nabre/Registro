// Guardie, elenchi di valori e pezzi di schema delle procedure di `consegne`.

import { CHI_INSEGNA, type Consegna } from '../../../domain/models.js'
import type { TestoPigro } from '../../../i18n/index.js'
import { errore, type Ambito } from '../../contract.js'
import { identificatore, nullabile, testo } from '../../schemas.js'
import { testi } from './consegne.testi.js'

/** La consegna, o il motivo per cui non c'è. */
export function esigiConsegna (ambito: Ambito, consegnaId: string): Consegna {
  const consegna = ambito.contesto.registro.consegne.find((c) => c.id === consegnaId)
  if (!consegna) throw errore.nonTrovato('consegna')
  return consegna
}

/**
 * Chi deve spuntare. Testo e non `identificatore`: può essere il docente
 * (`CHI_INSEGNA`), che non ha la forma di un id del registro.
 */
export const chiSpunta = testo({
  minimo: 1,
  massimo: 64,
  aiuto: () => testi().comune.chiSpunta(CHI_INSEGNA),
})

/**
 * A chi è destinato un documento, o `null` per «lo stesso per tutti» (la
 * circolare, il foglio unico). Nel protocollo la chiave c'è sempre: `nullabile`
 * da solo.
 */
export const perChi = nullabile(identificatore({ aiuto: () => testi().comune.perChi }))

/**
 * Chi riguarda un documento di consegna. Testo e non `identificatore()`: può
 * valere `CHI_INSEGNA` (`'docente'`).
 */
export const chiRiguarda = (aiuto: TestoPigro) => testo({ minimo: 1, massimo: 64, aiuto })
