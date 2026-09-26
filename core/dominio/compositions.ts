// I fascicoli composti: ricetta, posto, nomi dei file.
//
// La ricetta («queste schede, in quest'ordine, con questo nome») sta nell'anno
// accanto ai dati, perché non si ricompone da sola. Il PDF sta in
// `esportazioni/`, che si può cancellare per intero. L'ordine dei documenti è
// quello dell'elenco della pagina, non quello delle spunte, e fa parte della
// ricetta.

import { ESPORTAZIONI } from './locations.js'
import { nomeSicuro } from './text.js'
import { corto } from './lexicon.js'
import { lessico } from './lexicon.testi.js'

/** La cartella delle ricette dentro l'anno: non sta sotto `esportazioni/`. */
export const COMPOSIZIONI = 'composizioni'

/** Un fascicolo composto: il nome che gli si è dato, e di che cosa è fatto. */
export interface Composizione {
  id: string
  /** Come lo si è chiamato: è anche il nome del file che ne esce. */
  nome: string
  /** I documenti che lo compongono, nell'ordine in cui vanno in fila. */
  percorsi: string[]
  creataIl: string
  aggiornataIl: string
}

/** Dove sta la ricetta di un fascicolo, dentro l'anno. */
export function ricettaDi (id: string): string {
  return `${COMPOSIZIONI}/${nomeSicuro(id, 'composizione')}.json`
}

/**
 * Dove finisce il PDF di un fascicolo: in una cartella sua sotto le
 * esportazioni, perché può unire fogli di corsi diversi.
 */
export function pdfDi (composizione: { nome: string }): string {
  const nome = nomeSicuro(composizione.nome, corto(lessico().fascicolo))
  return `${ESPORTAZIONI}/${COMPOSIZIONI}/${nome}.pdf`
}

/**
 * Una ricetta letta dal disco, o `null` se non è valida. Controllo campo per
 * campo: il JSON può essere vecchio o toccato a mano, e una ricetta senza
 * percorsi darebbe un fascicolo vuoto che sembra a posto.
 */
export function leggiComposizione (dato: unknown): Composizione | null {
  if (dato === null || typeof dato !== 'object') return null
  const voce = dato as Partial<Composizione>
  if (typeof voce.id !== 'string' || !voce.id) return null
  if (typeof voce.nome !== 'string' || !voce.nome.trim()) return null
  if (!Array.isArray(voce.percorsi)) return null
  const percorsi = voce.percorsi.filter(
    (p): p is string => typeof p === 'string' && p.startsWith(`${ESPORTAZIONI}/`),
  )
  if (percorsi.length === 0) return null
  return {
    id: voce.id,
    nome: voce.nome.trim(),
    percorsi,
    creataIl: typeof voce.creataIl === 'string' ? voce.creataIl : '',
    aggiornataIl: typeof voce.aggiornataIl === 'string' ? voce.aggiornataIl : '',
  }
}

/**
 * Vero se il percorso sta nella cartella dei fascicoli: chi toglie quel PDF
 * deve togliere anche la ricetta che lo nomina.
 */
export function fraIFascicoli (percorso: string): boolean {
  return percorso.startsWith(`${ESPORTAZIONI}/${COMPOSIZIONI}/`)
}
