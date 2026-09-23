// La voce di menu «Disinstalla…»: il registro che si toglie da sé.
//
// Su Windows installato c'è un disinstallatore, e sui pacchetti `.deb` e `.rpm`
// c'è il gestore dei pacchetti: lì i dati li toglie la disinstallazione
// (`os/windows/uninstall.nsh`, `os/linux/after-remove.sh`). Ma su macOS
// un'applicazione si butta nel cestino e quel che ha scritto in `~/Library`
// resta; con l'AppImage e con il portabile di Windows si butta un file, e
// basta. Questa voce è la strada che vale dappertutto: toglie i dati, e dove
// può anche il programma.
//
// Il lavoro vero lo fa `src/cli/disinstalla.mjs`, lanciato staccato con
// l'eseguibile del registro in veste di Node. Deve girare *dopo* che il
// registro si è chiuso: su Windows una cartella con dentro un file aperto non
// si cancella, e il registro tiene aperti i suoi fino all'ultimo salvataggio.
// Per questo riceve il pid e aspetta.

import { app, BrowserWindow, dialog, shell } from 'electron'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { percorsoDisinstallazione } from '../../src/environment/context.js'
import { togliAvvioConWindows } from '../../src/environment/systemStartup.js'

/** Il disinstallatore che NSIS mette accanto all'eseguibile. */
function disinstallatoreDiWindows (): string | null {
  if (process.platform !== 'win32' || process.env.PORTABLE_EXECUTABLE_FILE) return null
  const file = join(dirname(app.getPath('exe')), `Uninstall ${app.getName()}.exe`)
  return existsSync(file) ? file : null
}

/** Il pacchetto `.app` di macOS, risalendo da `Contents/MacOS/<eseguibile>`. */
function pacchettoDiMacOS (): string | null {
  if (process.platform !== 'darwin') return null
  const pacchetto = dirname(dirname(dirname(app.getPath('exe'))))
  return pacchetto.endsWith('.app') ? pacchetto : null
}

/** Il file del programma da buttare, dove nessun disinstallatore lo fa. */
function programmaDaTogliere (): string | null {
  return pacchettoDiMacOS() ??
    process.env.APPIMAGE ??
    process.env.PORTABLE_EXECUTABLE_FILE ??
    null
}

async function conferma (programma: string | null): Promise<boolean> {
  const cosa = [
    "Si tolgono dal computer le impostazioni, l'elenco dei registri recenti, i modelli scaricati, " +
      `il comando «regdoc» e tutto quel che il registro ha salvato per sé in «${app.getPath('userData')}».`,
    '',
    'I documenti degli anni scolastici — i file .registro — restano dove sono.',
  ]
  if (!programma && !disinstallatoreDiWindows()) {
    // Un `.deb` o un `.rpm`: il programma è del gestore dei pacchetti, e
    // toglierlo chiede i permessi di amministratore.
    cosa.push('', 'Il programma resta installato: toglilo con il gestore dei pacchetti del sistema.')
  }
  const scelte = {
    type: 'warning' as const,
    message: 'Disinstallare il registro docenti?',
    detail: cosa.join('\n'),
    buttons: ['Disinstalla', 'Annulla'],
    // Su «Annulla»: un Invio di troppo non deve cancellare niente.
    defaultId: 1,
    cancelId: 1,
    noLink: true,
  }
  const padre = BrowserWindow.getFocusedWindow()
  const esito = padre
    ? await dialog.showMessageBox(padre, scelte)
    : await dialog.showMessageBox(scelte)
  return esito.response === 0
}

export async function disinstalla (): Promise<void> {
  // In sviluppo `userData` è quella di chi programma, e l'eseguibile è
  // l'Electron di `node_modules`: non c'è niente da disinstallare.
  if (!app.isPackaged) {
    await dialog.showMessageBox({
      type: 'info',
      message: 'La disinstallazione vale solo per il registro installato.',
    })
    return
  }

  const programma = programmaDaTogliere()
  if (!await conferma(programma)) return

  // Dove c'è, il disinstallatore di Windows fa tutto: toglie il programma e
  // chiama da sé `disinstalla.mjs`. Aspetta lui che il registro sia chiuso.
  const disinstallatore = disinstallatoreDiWindows()
  if (disinstallatore) {
    spawn(disinstallatore, [], { detached: true, stdio: 'ignore' }).unref()
    app.quit()
    return
  }

  // Tolta adesso e non dallo script: su macOS la voce d'avvio la tiene il
  // sistema, e solo il registro in persona gliela fa dimenticare.
  togliAvvioConWindows()

  const argomenti = [
    percorsoDisinstallazione(),
    '--attendi', String(process.pid),
    '--dati', app.getPath('userData'),
    '--eseguibile', app.getPath('exe'),
  ]
  // Il portabile di Windows non si può spostare nel cestino mentre il suo
  // avviatore è ancora aperto: lo toglie lo script, quando si è chiuso.
  if (process.env.PORTABLE_EXECUTABLE_FILE) argomenti.push('--togli', process.env.PORTABLE_EXECUTABLE_FILE)

  spawn(process.execPath, argomenti, {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  }).unref()

  // Il pacchetto `.app` e l'AppImage vanno nel cestino, da cui si recuperano:
  // si può fare anche con il programma aperto, perché il sistema tiene il
  // file vivo finché qualcuno lo usa.
  if (programma && !process.env.PORTABLE_EXECUTABLE_FILE) {
    await shell.trashItem(programma).catch((male: unknown) => {
      console.warn('Programma non spostato nel cestino:', male instanceof Error ? male.message : String(male))
    })
  }

  app.quit()
}
