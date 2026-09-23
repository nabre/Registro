// I fascicoli composti: che cosa sono, dove stanno, e come si chiamano i loro
// file.
//
// Un fascicolo è una ricetta, non un documento: dice «queste venticinque
// schede, in quest'ordine, sotto questo nome». Il PDF che ne esce è un
// documento come gli altri — si rifà premendo un pulsante, si butta via, si
// consegna — ma la ricetta no: se la si perde, l'unico modo di ritrovarla è
// rispuntare venticinque caselle una per una.
//
// Per questo le due cose stanno in due posti. La ricetta va nell'anno, accanto
// ai dati del registro, dove sta quel che non si può ricomporre da solo. Il PDF
// va in `esportazioni/`, che è la cartella che si consegna e che si può
// cancellare per intero senza perdere niente.
//
// L'ordine dei documenti è quello in cui la pagina li elenca — non quello in
// cui si sono spuntati — ed è un dato della ricetta: un fascicolo con le schede
// in ordine diverso è un altro fascicolo, e chi lo consegna vuole ritrovare
// quello di prima. Chi compone lo vede scritto prima di premere.

import { ESPORTAZIONI } from './locations.js'
import { nomeSicuro } from './text.js'

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
 * Dove finisce il PDF di un fascicolo.
 *
 * In una cartella sua dentro le esportazioni, e non fra i documenti di una
 * classe: un fascicolo può mettere insieme fogli di corsi diversi, e infilarlo
 * nella cartella di uno dei due vorrebbe dire non ritrovarlo più.
 */
export function pdfDi (composizione: { nome: string }): string {
  return `${ESPORTAZIONI}/${COMPOSIZIONI}/${nomeSicuro(composizione.nome, 'Fascicolo')}.pdf`
}

/**
 * Una ricetta letta dal disco, o `null` se quel che c'è non è una ricetta.
 *
 * Si controlla campo per campo perché il file è un JSON come un altro: lo può
 * aver scritto una versione di prima, o averlo toccato qualcuno a mano, e una
 * ricetta senza percorsi farebbe un fascicolo di zero pagine con il nome
 * giusto — che è il modo peggiore di sbagliare, perché sembra a posto.
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
 * Vero se quel percorso sta nella cartella dei fascicoli.
 *
 * Serve a chi butta via un documento qualunque: sotto `esportazioni/` c'è un
 * posto in cui un PDF non è solo un PDF — c'è una ricetta che lo nomina — e
 * toglierlo senza toglierla lascia in elenco un fascicolo che dice il falso.
 */
export function fraIFascicoli (percorso: string): boolean {
  return percorso.startsWith(`${ESPORTAZIONI}/${COMPOSIZIONI}/`)
}
