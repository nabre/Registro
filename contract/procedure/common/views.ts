// L'elenco delle pagine del registro, condiviso da `vista.apri` e
// `assistente.contesto` (vedi `common/register.ts`).

import type { Vista } from '#contract/protocol.js'
import { esaustivo } from '#contract/schemas.js'

/**
 * Le pagine del registro, tutte. `esaustivo` sull'unione `Vista` del
 * protocollo: una pagina dimenticata qui non compila.
 */
export const VISTE = esaustivo<Vista>()([
  'oggi',
  'calendario',
  'todo',
  'daSmistare',
  'lezione',
  'classi',
  'persone',
  'allievo',
  'docenteClasse',
  'corsi',
  'piani',
  'progetti',
  'valutazioni',
  'check',
  'documenti',
  'modelli',
  'modelliLinguistici',
  'mappa',
  'impostazioni',
  'guida',
] as const)
