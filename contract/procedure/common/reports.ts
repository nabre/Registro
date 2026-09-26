// Le guardie dei rapporti che più aree condividono (vedi `common/register.ts`).

import type { GenereRapporto } from '../../../core/dominio/locations.js'
import { esaustivo } from '../../schemas.js'

/**
 * Gli otto generi di rapporto. Scritti qui perché lo schema li vuole in
 * compilazione; `esaustivo()` ne garantisce la completezza.
 */
export const GENERI = esaustivo<GenereRapporto>()([
  'lezione', 'piano', 'valutazioni', 'presenze', 'fascicolo', 'allievo', 'momento', 'foto-classe',
] as const)
