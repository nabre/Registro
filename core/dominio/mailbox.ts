// La casella di posta: con che nome si entra e da che indirizzo si scrive.
//
// Nel tenant di una scuola sono due indirizzi: il nome di accesso (una sigla,
// `xxx000@edu.ti.ch`) per l'autenticazione e l'indirizzo con nome e cognome per
// la busta. Scambiarli dà «5.7.60 does not have permissions to send as» o una
// mail da una sigla anonima. Tutte le vie d'uscita (Exchange, Outlook, `.eml`)
// passano di qui: uno solo scritto vale per tutti e due.

import { testi } from './mailbox.testi.js'

/** La casella da cui il registro spedisce. */
export interface Casella {
  /** Con che nome si entra: il login del tenant, quello che vuole l'autenticazione. */
  accesso: string
  /** Da che indirizzo si scrive: quello che compare in «Da» e nella busta. */
  mittente: string
}

/**
 * La casella da quel che è scritto nelle impostazioni: uno vuoto prende
 * l'altro, tutti e due vuoti danno `null`.
 */
export function componiCasella (accesso: string, mittente: string): Casella | null {
  const entra = accesso.trim()
  const scrive = mittente.trim()
  if (!entra && !scrive) return null
  return { accesso: entra || scrive, mittente: scrive || entra }
}

/** Se due indirizzi sono lo stesso: le maiuscole in una mail non contano. */
export function stessoIndirizzo (uno: string, altro: string): boolean {
  return uno.trim().toLowerCase() === altro.trim().toLowerCase()
}

/** Il dominio di un indirizzo, o vuoto se non ne ha uno. */
export function dominioDi (indirizzo: string): string {
  return indirizzo.split('@')[1]?.trim().toLowerCase() ?? ''
}

/** Se un indirizzo ha la forma di un indirizzo di posta. */
export function sembraIndirizzo (testo: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(testo.trim())
}

/**
 * La casella detta a parole: l'indirizzo, e fra parentesi il nome di accesso
 * quando è diverso. Chi ne ha uno solo legge un indirizzo solo.
 */
export function descriviCasella (casella: Casella): string {
  if (stessoIndirizzo(casella.accesso, casella.mittente)) return casella.mittente
  return testi().conAccesso(casella.mittente, casella.accesso)
}
