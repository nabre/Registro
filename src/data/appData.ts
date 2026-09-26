// La cartella dei dati dell'applicazione (impostazioni, modelli, corredo delle
// scansioni): file del programma, fuori dalla cartella sincronizzata del docente.
// Calcolata qui e non chiesta a Electron perché `data/` gira anche nelle prove.
// `api/transports/conduit.ts` compone lo stesso percorso per sapere dove ascoltare.

import { homedir } from 'node:os'
import * as percorso from 'node:path'

/** Il nome dell'applicazione, per la cartella dei dati. */
// testo-fisso: il nome di una cartella sul disco, che il registro deve ritrovare in ogni lingua
const NOME_APPLICAZIONE = 'Regiclass'

/** La cartella dei dati dell'applicazione, con le regole di ogni sistema. */
export function cartellaApplicazione (): string {
  // La versione portabile la sceglie `shell/system/portable.ts`.
  const scelta = process.env.REGISTRO_DATI
  if (scelta) return scelta
  if (process.platform === 'win32') {
    const roaming = process.env.APPDATA ?? percorso.join(homedir(), 'AppData', 'Roaming')
    return percorso.join(roaming, NOME_APPLICAZIONE)
  }
  if (process.platform === 'darwin') {
    return percorso.join(homedir(), 'Library', 'Application Support', NOME_APPLICAZIONE)
  }
  return percorso.join(
    process.env.XDG_CONFIG_HOME ?? percorso.join(homedir(), '.config'),
    NOME_APPLICAZIONE,
  )
}
