// L'elenco delle pagine del registro, per gli schemi che lo nominano.
//
// Lo usano due aree diverse — `vista.apri`, che ci porta, e
// `assistente.contesto`, che dice dove si è — e tenerlo in una delle due
// vorrebbe dire che l'altra importa da un'area con cui non ha niente da
// spartire. Vedi la nota in testa a `common/register.ts`.

import type { Vista } from '../../../protocol.js'
import { esaustivo } from '../../schemas.js'

/**
 * Le pagine del registro, tutte.
 *
 * `esaustivo` e non `scelta`: l'elenco è l'unione `Vista` del protocollo, e una
 * pagina aggiunta là e dimenticata qui sarebbe una pagina che esiste, si vede
 * nella barra, e a cui l'assistente risponde «non si può andare» — con il
 * compilatore che tace. Così invece `tsc` nomina quella che manca.
 */
export const VISTE = esaustivo<Vista>()([
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
  'valutazioni',
  'documenti',
  'modelli',
  'modelliLinguistici',
  'mappa',
  'impostazioni',
  'guida',
] as const)
