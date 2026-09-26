// La casella di posta scritta nelle impostazioni: unico punto di lettura e
// scrittura. Come accesso e mittente si completano sta in `domain/mailbox.ts`.

import * as apparato from 'apparato'

import { componiCasella, type Casella } from '../domain/mailbox.js'

export type { Casella } from '../domain/mailbox.js'

const SEZIONE = 'registroDocenti.posta'

/** La casella scritta nelle impostazioni, o `null` se non ce n'è nessuna. */
export function casella (): Casella | null {
  const impostazioni = apparato.impostazioni.leggi(SEZIONE)
  return componiCasella(
    impostazioni.get<string>('utente') ?? '',
    impostazioni.get<string>('mittente') ?? '',
  )
}

/**
 * Scrive la casella nelle impostazioni globali dell'utente: è della persona,
 * non della cartella aperta.
 */
export async function scriviCasella (suo: Casella): Promise<void> {
  const impostazioni = apparato.impostazioni.leggi(SEZIONE)
  await impostazioni.update('utente', suo.accesso, apparato.AmbitoImpostazione.Global)
  await impostazioni.update('mittente', suo.mittente, apparato.AmbitoImpostazione.Global)
}
