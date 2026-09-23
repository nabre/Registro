// Quel che le procedure di `programma` si dividono: le guardie, gli elenchi di
// valori e i pezzi di schema che compaiono in più di una.

import { testo, type Schema } from '../../schemas.js'

/**
 * Il modello di una chiave del programma: `registroDocenti.agenda.attiva`.
 *
 * Non è la dogana — la dogana è `valoreAccettabile`, che sta in
 * `environment/settings.ts` perché è l'unico posto che ha in mano il
 * manifesto: sa quali chiavi esistono, di che tipo sono, quali scelte
 * ammettono e qual è il predefinito. Ripetere qui quell'elenco vorrebbe dire
 * due verità da tenere allineate a mano, e la seconda resterebbe indietro alla
 * prima impostazione nuova.
 *
 * Il modello fa la sola cosa che alla dogana non serve: tiene fuori quel che
 * non ha nemmeno la *forma* di una chiave nostra. Una chiave di un altro
 * programma, o un pezzo di percorso, non deve arrivare fino a un `update`.
 */
export const CHIAVE_PROGRAMMA = /^registroDocenti\.[A-Za-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9]*)*$/

export function chiaveProgramma (): Schema<string> {
  return testo({
    minimo: 16,
    massimo: 120,
    modello: CHIAVE_PROGRAMMA,
    esempio: 'registroDocenti.agenda.attiva',
    aiuto: 'Una chiave del manifesto. Che esista davvero lo dice «valoreAccettabile»',
  })
}
