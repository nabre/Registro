// Aprire un file della cartella con il programma del sistema.
//
// Sembra una riga sola — `vscode.env.openExternal(uri)` — e per un anno lo è
// stata. Poi è arrivato un rapporto che si chiamava `DIC4a_Presenze_1°
// semestre.pdf`, e Windows ha risposto «Impossibile trovare il file
// specificato» su un file che c'era, con tanto di finestra rossa.
//
// Il motivo: `openExternal` consegna alla shell un *indirizzo*, non un
// percorso. Il grado diventa `%C2%B0`, e chi lo riceve deve rifare il giro al
// contrario per tornare al nome vero — un giro che su Windows, fuori
// dall'ASCII, non torna. Il file esiste, il nome è giusto, e l'errore parla di
// un file che non esiste: il peggiore dei messaggi possibili, perché manda a
// cercare il problema dove non è.
//
// Qui il percorso si passa com'è, in argomenti separati, senza mai comporre una
// riga di comando: un nome con dentro `&` o uno spazio non può diventare
// un'altra istruzione.
//
// `openExternal` resta la via giusta per gli indirizzi veri — un collegamento
// dentro un piano lezione — dove un URL è quel che si vuole davvero.

import { execFile } from 'node:child_process'

import * as vscode from 'vscode'

/** Come si chiede al sistema di aprire un file, secondo dove si sta girando. */
function comandoDiApertura (percorso: string): [string, string[]] {
  if (process.platform === 'win32') {
    // `url.dll,FileProtocolHandler` è il modo di chiedere a Windows «apri
    // questo con il programma che gli spetta» passandogli un percorso e non
    // un indirizzo. `explorer.exe` farebbe lo stesso, ma torna sempre un
    // codice d'errore anche quando ha funzionato, e a quel punto non si
    // saprebbe più se ripiegare.
    return ['rundll32.exe', ['url.dll,FileProtocolHandler', percorso]]
  }
  return process.platform === 'darwin' ? ['open', [percorso]] : ['xdg-open', [percorso]]
}

/**
 * Apre un file con il programma del sistema. Torna falso se non c'è stato
 * verso, e allora chi chiama lo dice invece di far finta di niente.
 *
 * Se il programma non si apre si ripiega sul mostrare il file nella sua
 * cartella: non è la stessa cosa, ma è meglio di un vicolo cieco — chi lo
 * vede lo apre con due clic.
 */
export async function apriConIlSistema (file: vscode.Uri): Promise<boolean> {
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
    await vscode.commands.executeCommand('revealFileInOS', file)
    return true
  } catch {
    return false
  }
}
