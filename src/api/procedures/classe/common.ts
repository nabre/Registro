// Guardie, elenchi di valori e pezzi di schema delle procedure di `classe`.

import { trovaBloccoAssenze } from '../../../domain/absences.js'
import { fascicoloDellaClasse } from '../../../domain/courses.js'
import type { TipoRapporto } from '../../../domain/models.js'
import { errore, type Ambito } from '../../contract.js'
import { esigiClasse } from '../common/register.js'

/**
 * I due rapporti da far firmare: ore mancate ed entrate in ritardo. Scritti qui
 * perché lo schema li vuole in compilazione; il `satisfies` controlla che siano
 * rapporti del dominio, non che ci siano tutti.
 */
export const GENERI_RAPPORTO = ['assenze', 'ritardi'] as const satisfies readonly TipoRapporto[]

/** La comunicazione dentro il fascicolo di quella classe. */
export function esigiComunicazione (ambito: Ambito, classeId: string, comunicazioneId: string) {
  esigiClasse(ambito, classeId, null)
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
  esigiClasse(ambito, classeId, null)
  const dove = trovaBloccoAssenze(ambito.contesto.registro, classeId, bloccoId)
  if (!dove) throw errore.nonTrovato('periodo')
  return dove
}

/** Quella persona è in quella classe: i fogli di uno non vanno nella riga di un altro. */
export function esigiAllievo (ambito: Ambito, classeId: string, allievoId: string): void {
  const classe = esigiClasse(ambito, classeId, null)
  if (!classe.allievi.some((a) => a.id === allievoId)) {
    throw errore.nonTrovato('pif')
  }
}
