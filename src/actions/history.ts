// Annulla e ripristina. Il lavoro sta in `data/history.ts` e `Archivio`; qui si
// traduce l'esito. Non passano da `contesto.modifica` (non sono un passo nuovo,
// vedi `panels/panel.ts`), quindi rimettono in attesa da sé i PDF dei corsi cambiati.

import type { Archivio } from '../data/archive.js'
import type { NomeCollezione } from '../data/paths.js'
import type { EsitoStoria } from '../data/history.js'
import { riferimentiCambiati } from '../domain/automation.js'
import { conMessaggio, rifiutaCon, type EsitoAzione, type Parte } from './context.js'
import { rigeneraDopoScrittura } from './reports.js'
import { testi } from './history.testi.js'

/** L'esito della storia in un esito d'azione, con le parole giuste per il verso. */
function esitoDi (
  esito: EsitoStoria<NomeCollezione>,
  verso: 'annulla' | 'ripristina',
): EsitoAzione {
  const t = testi()
  const annulla = verso === 'annulla'
  // Breve: quanti passi restano lo dicono già i pulsanti nella barra del titolo.
  if (esito.ok) return conMessaggio(annulla ? t.annullato : t.ripristinato)
  if (esito.motivo === 'irreversibile') return rifiutaCon('rifiutato', t.irreversibile)
  if (esito.motivo === 'vuota') {
    return rifiutaCon('rifiutato', annulla ? t.nienteDaAnnullare : t.nienteDaRipristinare)
  }
  const dove = esito.collezioni.map((c) => t.collezioni[c]).join(', ')
  return rifiutaCon('conflitto', t.conflitto(dove, annulla))
}

/**
 * Annulla o ripristina, e mette in attesa i fogli dei corsi cambiati. Basta una
 * copia di superficie: annullare sostituisce le raccolte, non le cambia in posto.
 */
function torna (archivio: Archivio, verso: 'annulla' | 'ripristina'): EsitoAzione {
  const prima = { ...archivio.registro }
  const esito = verso === 'annulla' ? archivio.annulla() : archivio.ripristina()
  if (esito.ok) {
    for (const riferimenti of riferimentiCambiati(prima, archivio.registro)) {
      rigeneraDopoScrittura(archivio, { ...riferimenti })
    }
  }
  return esitoDi(esito, verso)
}

export const storia = {
  'storia.annulla': ({ archivio }, _azione) => torna(archivio, 'annulla'),
  'storia.ripristina': ({ archivio }, _azione) => torna(archivio, 'ripristina'),
} satisfies Parte
