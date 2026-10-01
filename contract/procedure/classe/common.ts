// Guardie, elenchi di valori e pezzi di schema delle procedure di `classe`.

import { trovaBloccoAssenze } from '../../../core/dominio/absences.js'
import { fascicoloDellaClasse } from '../../../core/dominio/courses.js'
import type { TipoRapporto } from '../../../core/dominio/models.js'
import { errore, type Ambito } from '../../contract.js'
import { esaustivo } from '../../schemas.js'
import { esigiClasse } from '../common/register.js'

/**
 * I due rapporti da far firmare: ore mancate ed entrate in ritardo. Scritti qui
 * perché lo schema li vuole in compilazione; `esaustivo()` ne garantisce la completezza.
 */
export const GENERI_RAPPORTO = esaustivo<TipoRapporto>()(['assenze', 'ritardi'] as const)

/** La comunicazione dentro il fascicolo di quella classe. */
export function esigiComunicazione (ambito: Ambito, classeId: string, comunicazioneId: string) {
  esigiClasse(ambito, classeId)
  const fascicolo = fascicoloDellaClasse(ambito.contesto.registro, classeId)
  const comunicazione = fascicolo?.comunicazioni.find((c) => c.id === comunicazioneId)
  if (!comunicazione) throw errore.nonTrovato('comunicazione')
  return comunicazione
}

/**
 * Il periodo di assenze, con classe e fascicolo. Due «non trovato» distinti:
 * da rileggere c'è l'elenco delle classi, o il fascicolo di questa.
 */
export function esigiBlocco (ambito: Ambito, classeId: string, bloccoId: string) {
  esigiClasse(ambito, classeId)
  const dove = trovaBloccoAssenze(ambito.contesto.registro, classeId, bloccoId)
  if (!dove) throw errore.nonTrovato('periodo')
  return dove
}
