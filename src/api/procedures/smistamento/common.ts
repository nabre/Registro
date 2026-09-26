// Guardie, elenchi di valori e pezzi di schema delle procedure di `smistamento`.

import type { Divisione, Smistamento } from '../../../domain/models.js'
import { errore, type Ambito } from '../../contract.js'
import { elenco, numero, oggetto, opzionale, scelta } from '../../schemas.js'
import type { TestoPigro } from '../../../i18n/index.js'
import { testi } from './smistamento.testi.js'

const t = () => testi().comune

/**
 * Il numero di una pagina, contato da uno. Senza tetto: un PDF di segreteria
 * può superare le mille pagine, e che la pagina esista lo sa lo smistatore.
 */
export const pagina = () => numero({ intero: true, minimo: 1, aiuto: () => t().pagina })

/**
 * Un elenco di pagine, anche vuoto: per quel caso i gestori hanno una frase
 * migliore di «ingresso non valido». Né ordinato né senza ripetizioni: chi lo
 * riceve fa `[...new Set(...)].sort()`.
 */
export const pagine = (aiuto: TestoPigro = () => t().pagine) => elenco(pagina(), { aiuto })

/**
 * Come si taglia un PDF.
 *
 * Più largo del tipo: `Divisione` è un'unione discriminata
 * (`{modo:'nomi'}`, `{modo:'passo', pagine}`, `{modo:'mano'}`) e `schemas.ts`
 * non ha un combinatore per le unioni, quindi passa anche
 * `{modo:'nomi', pagine: 7}`. Stringe `sanaDivisione` nel gestore, che tiene
 * `pagine` solo per il passo e lo riporta fra 1 e 999: per questo qui `pagine`
 * non ha limiti.
 */
export const divisione = () => oggetto({
  modo: scelta(['nomi', 'passo', 'mano'], {
    aiuto: () => t().modo,
  }),
  pagine: opzionale(numero({
    aiuto: () => t().passo,
  })),
}, { aiuto: () => t().divisione })

/** Il tipo che `divisione()` descrive: la somma appiattita delle tre varianti. */
type DivisioneLarga = { modo: 'nomi' | 'passo' | 'mano'; pagine?: number }

/**
 * La divisione ripassata al gestore com'è arrivata: il cast serve perché lo
 * schema è più largo del tipo. Assente vale `nomi` (il gestore legge
 * `divisione?.modo`), come nelle prove di `tests/data/sorting.test.mjs`.
 */
export function comeDivisione (larga: DivisioneLarga | undefined): Divisione {
  return larga as Divisione
}

/**
 * Il PDF in attesa, o il motivo per cui non c'è. `smistamento` è nel lessico:
 * la frase si accorda da sé e il codice è `non-trovato`, non `rifiutato`.
 */
export function esigiSmistamento (ambito: Ambito, smistamentoId: string): Smistamento {
  const trovato = ambito.contesto.registro.smistamenti.find((s) => s.id === smistamentoId)
  if (!trovato) throw errore.nonTrovato('smistamento')
  return trovato
}
