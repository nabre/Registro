// Quel che le procedure di `ore` si dividono: le guardie, gli elenchi di
// valori e i pezzi di schema che compaiono in più di una.

import { contaUd } from '../../../domain/calculations.js'
import { classeDellaLezione } from '../../../domain/courses.js'
import { LEZIONE } from '../../../domain/lexicon.js'
import type { Lezione, SegnoOsservato, StatoLezione } from '../../../domain/models.js'
import { errore, type Ambito } from '../../contract.js'
import { esaustivo } from '../../schemas.js'

// Gli stati dell’appello stanno in `common/rollCall.ts`: li guarda anche
// `persone.assenze`, che non è di quest’area. Chi li usava qui li importa di là.

export const STATI_LEZIONE = esaustivo<StatoLezione>()([
  'pianificata', 'svolta', 'annullata',
] as const)

export const SEGNI = esaustivo<SegnoOsservato>()(['positivo', 'negativo'] as const)

/** La lezione, o il motivo per cui non c'è. */
export function esigiLezione (ambito: Ambito, lezioneId: string): Lezione {
  const lezione = ambito.contesto.registro.lezioni.find((l) => l.id === lezioneId)
  if (!lezione) {
    throw errore.nonTrovato(
      LEZIONE.lezione,
      'Le ore a calendario le elenca «ore.elenco», per corso o per periodo.',
    )
  }
  return lezione
}

/**
 * Quell'unità didattica esiste davvero in quell'ora.
 *
 * Lo schema si ferma a `massimo: 32`, che è il tetto di un'ora lunghissima e
 * non ha niente a che vedere con l'ora che si sta scrivendo. Un indice oltre
 * la fine non trovava una casella da cambiare — le righe dell'appello sono
 * lunghe `contaUd(lezione)` — e la scrittura passava lo stesso: collezione
 * sporcata, revisione incrementata, `ok: true`. Chi chiamava credeva di aver
 * segnato un'assenza, e l'unico modo di accorgersene era rileggere.
 */
export function esigiUd (lezione: Lezione, ud: number): void {
  const quante = contaUd(lezione)
  if (ud >= quante) {
    throw errore.rifiuta(
      `Quell’unità didattica non esiste in questa ora: ce ne sono ${quante}, contate da zero.`,
    )
  }
}

/**
 * Quella persona è iscritta alla classe di quell'ora.
 *
 * Il controllo esisteva già per la matrice del comportamento — con il motivo
 * scritto accanto: «un dato storto che nessuna schermata mostrerebbe» — e non
 * per l'appello, dove un allievoId sbagliato creava invece una riga nuova che
 * nessuno avrebbe più tolto. Adesso vale per tutti e due.
 */
export function esigiIscritto (ambito: Ambito, lezione: Lezione, allievoId: string): void {
  const classe = classeDellaLezione(ambito.contesto.registro, lezione)
  if (!classe) return
  if (!classe.allievi.some((a) => a.id === allievoId)) {
    throw errore.rifiuta('Quella persona non è in questa classe.')
  }
}
