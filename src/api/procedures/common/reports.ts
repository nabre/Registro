// Le guardie che più aree condividono, dal vecchio `procedure/rapporti.ts`.
//
// Stanno qui e non in una delle aree perché le usano aree diverse: tenerle in
// una di quelle vorrebbe dire che l'area A importa da B senza averci a che fare.

import type { GenereRapporto } from '../../../domain/locations.js'

/**
 * Gli otto generi di rapporto.
 *
 * Scritti qui e non dedotti da `locations.ts` perché uno schema ha bisogno
 * dei valori quando compila, non quando gira. Il `satisfies` è la rete: un
 * genere aggiunto al dominio e dimenticato qui non compila.
 */
export const GENERI = [
  'lezione', 'piano', 'valutazioni', 'presenze', 'fascicolo', 'allievo', 'momento', 'foto-classe',
] as const satisfies readonly GenereRapporto[]
