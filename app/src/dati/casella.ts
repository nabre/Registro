// La casella come sta scritta nelle impostazioni.
//
// È l'unico posto che le legge: chi spedisce — Exchange, Outlook, il file
// `.eml` — e chi collega l'account passano tutti di qui, e nessuno si ricava
// più da sé «l'uno o l'altro» fra nome di accesso e indirizzo. Che cosa
// vogliano dire i due, e come si completano a vicenda, sta nel dominio.

import * as vscode from 'vscode'

import { componiCasella, type Casella } from '../dominio/casella.js'

export type { Casella } from '../dominio/casella.js'

const SEZIONE = 'registroDocenti.posta'

/** La casella scritta nelle impostazioni, o `null` se non ce n'è nessuna. */
export function casella (): Casella | null {
  const impostazioni = vscode.workspace.getConfiguration(SEZIONE)
  return componiCasella(
    impostazioni.get<string>('utente') ?? '',
    impostazioni.get<string>('mittente') ?? '',
  )
}

/**
 * Scrive la casella nelle impostazioni dell'utente, non del progetto.
 *
 * La casella è della persona e non della cartella aperta: la stessa in ogni
 * anno scolastico e in ogni finestra, e non va a finire in un file che sta su
 * Git insieme al registro.
 */
export async function scriviCasella (suo: Casella): Promise<void> {
  const impostazioni = vscode.workspace.getConfiguration(SEZIONE)
  await impostazioni.update('utente', suo.accesso, vscode.ConfigurationTarget.Global)
  await impostazioni.update('mittente', suo.mittente, vscode.ConfigurationTarget.Global)
}
