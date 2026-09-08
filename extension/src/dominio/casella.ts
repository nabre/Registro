// La casella di posta: con che nome si entra, e da che indirizzo si scrive.
//
// Sono due indirizzi e non uno, e tutta la differenza sta qui. Nel tenant di
// una scuola si entra con un nome di accesso — una sigla come
// `xxx000@edu.ti.ch`, che la dà l'amministrazione — e si scrive da un
// indirizzo con nome e cognome, `nome.cognome@edu.ti.ch`, che è quello che le
// famiglie vedono e a cui rispondono. Per Exchange sono la stessa casella; per
// i programmi no, se nessuno glielo dice: l'autenticazione vuole il primo, la
// busta vuole il secondo, e scambiarli vuol dire un rifiuto del server —
// «5.7.60 does not have permissions to send as» — o una mail che parte da una
// sigla e che nessuno sa di chi è.
//
// Fin qui ogni via d'uscita — Exchange, Outlook, il file `.eml` — si
// arrangiava da sé con «l'uno o l'altro», e non sempre nello stesso ordine.
// Qui si decide una volta sola: chi ne ha uno ne scrive uno, e l'altro gli è
// uguale; chi ne ha due li scrive tutti e due, e ognuno va al suo posto.

/** La casella da cui il registro spedisce. */
export interface Casella {
  /** Con che nome si entra: il login del tenant, quello che vuole l'autenticazione. */
  accesso: string
  /** Da che indirizzo si scrive: quello che compare in «Da» e nella busta. */
  mittente: string
}

/**
 * La casella da quel che è scritto nelle impostazioni.
 *
 * Uno vuoto prende l'altro; tutti e due vuoti vuol dire che non c'è nessuna
 * casella, e si dice `null` invece di una coppia di stringhe vuote che poi
 * ognuno controlla a modo suo.
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

/**
 * Se un indirizzo è uno dei due della casella.
 *
 * Serve a controllare *chi* è entrato: Microsoft chiama l'account ora con il
 * nome di accesso, ora con l'indirizzo, e tutti e due vogliono dire «quello
 * giusto». Un terzo indirizzo — l'account di casa scelto per sbaglio nel
 * browser — no.
 */
export function dellaCasella (casella: Casella | null, indirizzo: string): boolean {
  if (!casella) return false
  return stessoIndirizzo(casella.accesso, indirizzo) || stessoIndirizzo(casella.mittente, indirizzo)
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
  return `${casella.mittente} (accesso ${casella.accesso})`
}
