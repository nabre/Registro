// Quel che le procedure di `consegne` si dividono: le guardie, gli elenchi di
// valori e i pezzi di schema che compaiono in più di una.

import { CARTE } from '../../../domain/lexicon.js'
import { CHI_INSEGNA, type Consegna } from '../../../domain/models.js'
import { errore, type Ambito } from '../../contract.js'
import { identificatore, nullabile, testo } from '../../schemas.js'

/** La consegna, o il motivo per cui non c'è. */
export function esigiConsegna (ambito: Ambito, consegnaId: string): Consegna {
  const consegna = ambito.contesto.registro.consegne.find((c) => c.id === consegnaId)
  if (!consegna) throw errore.nonTrovato(CARTE.consegna)
  return consegna
}

/**
 * Chi deve spuntare.
 *
 * Non è un `identificatore`, ed è voluto: fra chi deve spuntare c'è anche il
 * docente, che non è un allievo e il cui id — `CHI_INSEGNA` — non ha la forma
 * di un id del registro. Dichiararlo `identificatore` farebbe pubblicare al
 * JSON Schema un modello che il valore giusto non rispetta, e chi si generasse
 * un client da lì rifiuterebbe da solo il valore che il contratto gli chiede
 * di mandare.
 */
export const chiSpunta = testo({
  minimo: 1,
  massimo: 64,
  aiuto: `L’id della persona, o «${CHI_INSEGNA}» per quel che tocca a chi insegna`,
})

/**
 * A chi è destinato un documento, o `null` per «lo stesso per tutti».
 *
 * `allievoId: string | null` nel protocollo — la chiave c'è sempre — e quel
 * `null` non è un campo dimenticato: è la circolare, il modulo da compilare,
 * il foglio unico della classe. Quindi `nullabile` da solo, mai `opzionale`.
 */
export const perChi = nullabile(identificatore({
  aiuto: 'Di chi è il documento. null vuol dire «lo stesso per tutti»',
}))

/**
 * Chi riguarda un documento di consegna.
 *
 * Non è `identificatore()` e non è una svista: in una consegna `chi` può valere
 * `CHI_INSEGNA` — la stringa `'docente'` — che è il destinatario «a me», e il
 * modello degli id pubblicato nel JSON Schema lo farebbe rifiutare a chi si
 * genera un client da quello schema. Uno schema troppo stretto qui romperebbe
 * la casella del docente, che oggi funziona.
 */
export const chiRiguarda = (aiuto: string) => testo({ minimo: 1, massimo: 64, aiuto })
