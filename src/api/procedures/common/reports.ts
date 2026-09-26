// Le guardie dei rapporti che più aree condividono (vedi `common/register.ts`).

import type { GenereRapporto } from '../../../domain/locations.js'

/**
 * Gli otto generi di rapporto. Scritti qui perché lo schema li vuole in
 * compilazione. Il `satisfies` controlla che ognuno sia un genere del
 * dominio, non che ci siano tutti (per quello servirebbe `esaustivo`).
 */
export const GENERI = [
  'lezione', 'piano', 'valutazioni', 'presenze', 'fascicolo', 'allievo', 'momento', 'foto-classe',
] as const satisfies readonly GenereRapporto[]
