// Quel che le procedure di `classe` si dividono: le guardie, gli elenchi di
// valori e i pezzi di schema che compaiono in più di una.

import { trovaBloccoAssenze } from '../../../domain/absences.js'
import { fascicoloDellaClasse } from '../../../domain/courses.js'
import { CARTE, PERSONE, SCUOLA } from '../../../domain/lexicon.js'
import type { TipoRapporto } from '../../../domain/models.js'
import { errore, type Ambito } from '../../contract.js'

/**
 * I due rapporti che si fanno firmare: le ore mancate e le entrate in ritardo.
 *
 * Scritti qui e non dedotti dal modello per lo stesso motivo per cui in `hours.ts`
 * ci sono gli stati dell'appello: uno schema ha bisogno dei valori quando
 * compila. Il `satisfies` fa sì che un terzo tipo di rapporto aggiunto al
 * dominio e dimenticato qui non compili.
 */
export const GENERI_RAPPORTO = ['assenze', 'ritardi'] as const satisfies readonly TipoRapporto[]

/**
 * La classe, o il motivo per cui non c'è.
 *
 * È la guardia che mancava di più: senza, un `classeId` inventato passava per
 * `nelFascicolo`, non trovava la classe, non scriveva niente e tornava «fatto».
 */
export function esigiClasse (ambito: Ambito, classeId: string) {
  const classe = ambito.contesto.registro.classi.find((c) => c.id === classeId)
  if (!classe) throw errore.nonTrovato(SCUOLA.classe)
  return classe
}

/** La comunicazione dentro il fascicolo di quella classe. */
export function esigiComunicazione (ambito: Ambito, classeId: string, comunicazioneId: string) {
  esigiClasse(ambito, classeId)
  const fascicolo = fascicoloDellaClasse(ambito.contesto.registro, classeId)
  const comunicazione = fascicolo?.comunicazioni.find((c) => c.id === comunicazioneId)
  if (!comunicazione) throw errore.nonTrovato(CARTE.comunicazione)
  return comunicazione
}

/**
 * Il periodo di assenze, con la classe e il fascicolo attorno.
 *
 * Due «non trovato» distinti — la classe e il periodo — perché sono due cose
 * diverse da rileggere: nel primo caso l'elenco delle classi, nel secondo il
 * fascicolo di questa.
 */
export function esigiBlocco (ambito: Ambito, classeId: string, bloccoId: string) {
  esigiClasse(ambito, classeId)
  const dove = trovaBloccoAssenze(ambito.contesto.registro, classeId, bloccoId)
  if (!dove) throw errore.nonTrovato(SCUOLA.periodo)
  return dove
}

/** Quella persona è in quella classe: i fogli di uno non vanno nella riga di un altro. */
export function esigiAllievo (ambito: Ambito, classeId: string, allievoId: string): void {
  const classe = esigiClasse(ambito, classeId)
  if (!classe.allievi.some((a) => a.id === allievoId)) {
    throw errore.nonTrovato(PERSONE.pif)
  }
}
