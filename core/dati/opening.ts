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
    return [apparato.diSistema('rundll32.exe') ?? 'rundll32.exe', ['url.dll,FileProtocolHandler', percorso]]
  }
  return process.platform === 'darwin' ? ['open', [percorso]] : ['xdg-open', [percorso]]
}

// Estensioni che il sistema non «apre» ma esegue. I file arrivano dentro il
// documento, che può venire da altri (una cartella condivisa, una mail), e la
// copia materializzata la scrive il programma: niente Mark-of-the-Web, quindi
// nessun avviso di SmartScreen fra il clic e l'esecuzione.
const ESEGUIBILI = new Set([
  'exe', 'com', 'scr', 'pif', 'cpl', 'msi', 'msp', 'msix', 'appx', 'appxbundle',
  'bat', 'cmd', 'ps1', 'psm1', 'vbs', 'vbe', 'js', 'jse', 'wsf', 'wsh', 'hta',
  'lnk', 'url', 'website', 'scf', 'inf', 'reg', 'msc', 'jar', 'dll', 'sys',
  'application', 'appref-ms', 'gadget', 'settingcontent-ms', 'library-ms',
  'searchconnector-ms', 'diagcab', 'xll', 'iso', 'img', 'vhd', 'vhdx',
  'app', 'command', 'tool', 'pkg', 'dmg', 'terminal', 'workflow',
  'sh', 'desktop', 'appimage', 'run', 'bin',
])

/**
 * Vero se il nome, come lo leggerebbe Windows (punti e spazi in coda tolti),
 * finisce con un'estensione che si esegue.
 */
export function èEseguibile (percorso: string): boolean {
  const nome = percorso.split(/[\\/]/).pop()?.replace(/[. ]+$/, '') ?? ''
  const punto = nome.lastIndexOf('.')
  return punto >= 0 && ESEGUIBILI.has(nome.slice(punto + 1).toLowerCase())
}

/**
 * Apre un file con il programma del sistema; se non riesce lo mostra nella sua
 * cartella. Torna falso se non è riuscita nessuna delle due. Un eseguibile non
 * si lancia: si mostra soltanto, e l'eventuale doppio clic resta di chi guarda.
 */
export async function apriConIlSistema (file: apparato.Uri): Promise<boolean> {
  if (èEseguibile(file.fsPath)) return mostraNellaCartella(file)
  const [comando, argomenti] = comandoDiApertura(file.fsPath)
  const aperto = await new Promise<boolean>((risolvi) => {
    try {
      execFile(comando, argomenti, (errore) => risolvi(!errore))
    } catch {
      risolvi(false)
    }
  })
  if (aperto) return true
  return mostraNellaCartella(file)
}

async function mostraNellaCartella (file: apparato.Uri): Promise<boolean> {
  try {
    await apparato.comandi.esegui('apparato.mostraNellaCartella', file)
    return true
  } catch {
    return false
  }
}
