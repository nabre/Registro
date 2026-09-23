// Quel che le procedure di `smistamento` si dividono: le guardie, gli elenchi di
// valori e i pezzi di schema che compaiono in più di una.

import { CARTE, SCUOLA } from '../../../domain/lexicon.js'
import type { Classe, Divisione, Smistamento } from '../../../domain/models.js'
import { errore, type Ambito } from '../../contract.js'
import { elenco, numero, oggetto, opzionale, scelta } from '../../schemas.js'

/**
 * Il numero di una pagina, contato da uno.
 *
 * Intero e almeno 1 — `lette[numero - 1]` in `riprendiPagine` dice da sola che
 * la numerazione parte da uno — ma **senza un tetto**: un PDF di segreteria con
 * le assenze di tutto l'anno passa le mille pagine senza sforzo, e un massimo
 * scelto a occhio qui si vedrebbe come «questo file non si riesce a smistare»
 * su certi PDF e non su altri. Che la pagina esista davvero lo sa lo
 * smistatore, che ha il file in mano.
 */
export const pagina = () => numero({ intero: true, minimo: 1, aiuto: 'Numero di pagina, contato da 1' })

/**
 * Un elenco di pagine, anche vuoto.
 *
 * Vuoto si accetta apposta: i gestori hanno già la loro frase per quel caso —
 * «Nessuna pagina da buttare via», «Nessuna pagina da aprire» — e rifiutarlo
 * qui la sostituirebbe con un «ingresso non valido» che dice di meno. Né
 * ordinato né senza ripetizioni: chi lo riceve fa `[...new Set(...)].sort()`
 * da sé, perché le pagine scelte con il mouse arrivano nell'ordine in cui le
 * ha toccate chi guarda.
 */
export const pagine = (aiuto = 'Le pagine scelte, in qualunque ordine') => elenco(pagina(), { aiuto })

/**
 * Come si taglia un PDF.
 *
 * **Questo schema è più largo del tipo, e va detto invece di far finta.**
 * `Divisione` è un'unione discriminata a tre varianti — `{modo:'nomi'}`,
 * `{modo:'passo', pagine}`, `{modo:'mano'}` — e `schemas.ts` non ha un
 * combinatore per le unioni. Quel che si descrive qui è la loro somma
 * appiattita: un `modo` fra i tre e un `pagine` che può esserci sempre. Passa
 * quindi anche `{modo:'nomi', pagine: 7}`, che il tipo vero non ammette.
 *
 * Va bene, e non è una resa: chi stringe davvero è `sanaDivisione` dentro il
 * gestore, che tiene il `pagine` solo per il passo, lo arrotonda e lo riporta
 * fra 1 e 999. Per questo nemmeno `pagine` ha minimo o massimo qui — un `0` o
 * un `1000` oggi entrano e diventano `1` e `999`, e rifiutarli adesso
 * romperebbe un campo che si scrive a mano e una prova che lo verifica.
 */
export const divisione = () => oggetto({
  modo: scelta(['nomi', 'passo', 'mano'], {
    aiuto: 'Dove cadono le forbici: dai nomi, ogni N pagine, o da nessuna parte',
  }),
  pagine: opzionale(numero({
    aiuto: 'Solo con «passo»: quante pagine per documento. Il gestore lo arrotonda fra 1 e 999',
  })),
}, { aiuto: 'Come dividere il PDF. Senza, vale «nomi»' })

/** Il tipo che `divisione()` descrive: la somma appiattita delle tre varianti. */
type DivisioneLarga = { modo: 'nomi' | 'passo' | 'mano'; pagine?: number }

/**
 * La divisione ripassata al gestore com'è arrivata.
 *
 * Il cast c'è perché lo schema è più largo del tipo (vedi `divisione()`), e
 * stringerla qui vorrebbe dire scrivere una seconda `sanaDivisione` accanto a
 * quella che il gestore chiama comunque. Anche l'assenza si ripassa così: il
 * gestore legge `divisione?.modo`, e senza niente vale `nomi` — che è quel che
 * fanno già oggi le prove di `tests/data/sorting.test.mjs`, le quali
 * depositano un PDF senza dire come tagliarlo.
 */
export function comeDivisione (larga: DivisioneLarga | undefined): Divisione {
  return larga as Divisione
}

/**
 * Il PDF in attesa, o il motivo per cui non c'è.
 *
 * `CARTE.smistamento` esiste nel lessico, quindi la frase si accorda da sé:
 * «Lo smistamento non è stato trovato.» Prima ogni gestore ripeteva a mano
 * «Quello smistamento non c'è più», che si legge uguale ma torna come
 * `rifiutato` — indistinguibile da «quella casella è già piena» per chi non
 * confronta stringhe.
 */
export function esigiSmistamento (ambito: Ambito, smistamentoId: string): Smistamento {
  const trovato = ambito.contesto.registro.smistamenti.find((s) => s.id === smistamentoId)
  if (!trovato) throw errore.nonTrovato(CARTE.smistamento)
  return trovato
}

/** La classe, o il motivo per cui non c'è. */
export function esigiClasse (ambito: Ambito, classeId: string): Classe {
  const trovata = ambito.contesto.registro.classi.find((c) => c.id === classeId)
  if (!trovata) throw errore.nonTrovato(SCUOLA.classe)
  return trovata
}
