// Gli stati dell'appello e il filtro che li nomina, condivisi da `ore` e
// `persone` (vedi `common/register.ts`): l'elenco dei cinque stati, lo schema
// per sceglierne alcuni, e «questa casella conta, dati gli stati chiesti?».

import type { StatoPresenza } from '../../../domain/models.js'
import { detto, type TestoPigro } from '../../../i18n/index.js'
import { elenco, esaustivo, opzionale, scelta } from '../../schemas.js'
import { testi } from './common.testi.js'

/**
 * I cinque stati dell'appello. Scritti qui perché lo schema li vuole in
 * compilazione; `esaustivo()` e `tests/api/procedures.test.mjs` li tengono
 * allineati al dominio.
 */
export const STATI_APPELLO = esaustivo<StatoPresenza>()([
  'non-impostato', 'presente', 'assente', 'ritardo', 'esonerato',
] as const)

/** Quali stati si contano quando non lo si dice: l'assenza, e nient'altro. */
const STATI_PREDEFINITI: readonly StatoPresenza[] = ['assente']

/**
 * `stati` per una lettura che guarda l'appello. Un elenco: «problemi di
 * frequenza» è `['assente', 'ritardo']`, e sommare a mano più chiamate
 * conterebbe due volte chi ha stati diversi nella stessa ora. `cosa` è quel che
 * si conta, nella lingua dell'aiuto.
 */
export function stati (cosa: TestoPigro): {
  stati: ReturnType<typeof opzionale<
    ReturnType<typeof elenco<ReturnType<typeof scelta<typeof STATI_APPELLO>>>>
  >>
} {
  return {
    stati: opzionale(elenco(scelta(STATI_APPELLO), {
      aiuto: () => testi().stati(detto(cosa)),
      minimo: 1,
    })),
  }
}

/**
 * Gli stati chiesti, o il predefinito: sempre un elenco pieno, che chi chiama
 * rimanda nella busta.
 */
export function statiScelti (chiesti: readonly StatoPresenza[] | undefined): StatoPresenza[] {
  return chiesti && chiesti.length > 0 ? [...chiesti] : [...STATI_PREDEFINITI]
}
