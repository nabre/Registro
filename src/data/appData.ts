// Dove il registro tiene i file che sono suoi e non del docente.
//
// Una riga sola di sapere: la cartella dei dati dell'applicazione, con le
// regole di ogni sistema. Ci stanno dentro le impostazioni, i modelli del
// linguaggio (`gguf.ts`) e il corredo della dettatura (`voiceKit.ts`) —
// cioè le cose che il registro scarica o scrive per sé, e che non devono
// finire nella cartella sincronizzata di chi insegna.
//
// Si ricalcola qui invece di chiederla a Electron perché `dati/` non conosce
// Electron: è lo stesso codice che gira nelle prove, dove `app` non esiste.
// Le stesse tre righe le compone anche `api/transports/conduit.ts`, e stanno
// in due posti perché rispondono a due domande diverse — quella è «dove
// ascolto», questa è «dove tengo i file».

import { homedir } from 'node:os'
import * as percorso from 'node:path'

/** Il nome dell'applicazione, per la cartella dei dati. */
const NOME_APPLICAZIONE = 'Registro docenti'

/** La cartella dei dati dell'applicazione, con le regole di ogni sistema. */
export function cartellaApplicazione (): string {
  // La versione portabile la tiene accanto all'eseguibile: la sceglie
  // `shell/system/portable.ts`, che è quello che sa di Electron.
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
