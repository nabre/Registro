// Aprire un file della cartella con il programma del sistema.
//
// Non `openExternal`: passa un indirizzo, e su Windows un nome fuori dall'ASCII
// (`1° semestre.pdf`) non torna al percorso vero. Qui il percorso va com'è, in
// argomenti separati e senza riga di comando, così `&` o spazi restano nome.
// `openExternal` resta per gli URL veri.

import { execFile } from 'node:child_process'

import * as apparato from 'apparato'

/** Come si chiede al sistema di aprire un file, secondo dove si sta girando. */
function comandoDiApertura (percorso: string): [string, string[]] {
  if (process.platform === 'win32') {
    // `FileProtocolHandler` apre un percorso col programma associato; non
    // `explorer.exe`, che torna errore anche quando riesce e impedirebbe di
    // sapere se ripiegare. Percorso intero perché un nome nudo su Windows si
    // cerca prima nella cartella del documento (`environment/system.ts`);
    // `open` e `xdg-open` si cercano solo nel PATH.
    return [apparato.diSistema('rundll32.exe'), ['url.dll,FileProtocolHandler', percorso]]
  }
  return process.platform === 'darwin' ? ['open', [percorso]] : ['xdg-open', [percorso]]
}

/**
 * Apre un file con il programma del sistema; se non riesce lo mostra nella sua
 * cartella. Torna falso se non è riuscita nessuna delle due.
 */
export async function apriConIlSistema (file: apparato.Uri): Promise<boolean> {
  const [comando, argomenti] = comandoDiApertura(file.fsPath)
  const aperto = await new Promise<boolean>((risolvi) => {
    try {
      execFile(comando, argomenti, (errore) => risolvi(!errore))
    } catch {
      risolvi(false)
    }
  })
  if (aperto) return true

  try {
    await apparato.comandi.esegui('apparato.mostraNellaCartella', file)
    return true
  } catch {
    return false
  }
}
