// Gli stati dell'appello, e il filtro che li nomina.
//
// Stavano in `ore/common.ts`, e ci sono stati finché a guardarli era soltanto
// l'area `ore`. Adesso li guarda anche `persone.assenze` — «chi ha assenze» è
// una domanda sulle persone, non sulle ore — e un'area che importa da un'altra
// è il modo in cui due aree finiscono legate senza che nessuno l'abbia deciso.
// Vedi la nota in testa a `common/register.ts`.
//
// Qui non c'è nessuna regola nuova: c'è l'elenco dei cinque stati, il pezzo di
// schema per chiederne alcuni, e la sola domanda che si fa su di loro in più
// di un posto — «questa casella conta, dati gli stati che mi interessano?».

import type { StatoPresenza } from '../../../domain/models.js'
import { elenco, esaustivo, opzionale, scelta } from '../../schemas.js'

/**
 * I cinque stati dell'appello.
 *
 * Scritti qui e non dedotti da `lexicon.ts` perché uno schema ha bisogno dei
 * valori quando compila, non quando gira. Che l'elenco resti quello del
 * dominio lo tengono fermo due cose: `esaustivo()`, che non fa compilare un
 * elenco incompleto e nomina il valore mancante, e una prova —
 * `tests/api/procedures.test.mjs`.
 */
export const STATI_APPELLO = esaustivo<StatoPresenza>()([
  'non-impostato', 'presente', 'assente', 'ritardo', 'esonerato',
] as const)

/** Quali stati si contano quando non lo si dice: l'assenza, e nient'altro. */
export const STATI_PREDEFINITI: readonly StatoPresenza[] = ['assente']

/**
 * `stati`, da mettere nell'ingresso di una lettura che guarda l'appello.
 *
 * Un **elenco** e non un valore solo, ed è la ragione per cui questo pezzo
 * esiste: le domande vere ne mettono insieme più d'uno. «Chi ha problemi di
 * frequenza» è `['assente', 'ritardo']`; «chi ha un permesso» è
 * `['esonerato']`; «su chi non si è mai segnato niente» è `['non-impostato']`,
 * che è la domanda con cui ci si accorge di un registro tenuto male. Con un
 * valore solo quelle tre diventano tre chiamate e una somma fatta a mano, e
 * una somma fatta a mano su stati diversi conta due volte chi li ha tutti e
 * due nella stessa ora.
 */
export function stati (cosa: string): {
  stati: ReturnType<typeof opzionale<ReturnType<typeof elenco<ReturnType<typeof scelta<typeof STATI_APPELLO>>>>>>
} {
  return {
    stati: opzionale(elenco(scelta(STATI_APPELLO), {
      aiuto: `Quali caselle dell’appello contano per ${cosa}. Senza, solo «assente»`,
      minimo: 1,
    })),
  }
}

/**
 * Gli stati chiesti, o il predefinito: quel che si conta davvero.
 *
 * Torna sempre un elenco pieno, e chi chiama lo rimanda nella busta. È la
 * stessa regola del periodo: una risposta che ha contato «assente e ritardo»
 * senza dirlo è una cifra che chi legge attribuirà alle sole assenze.
 */
export function statiScelti (chiesti: readonly StatoPresenza[] | undefined): StatoPresenza[] {
  return chiesti && chiesti.length > 0 ? [...chiesti] : [...STATI_PREDEFINITI]
}
