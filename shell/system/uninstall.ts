// La voce di menu «Disinstalla…»: toglie i dati e, dove può, il programma, su
// ogni piattaforma (macOS, AppImage e portabile non hanno un disinstallatore
// che tolga i dati; NSIS e i pacchetti Linux sì, vedi `os/`).
//
// Il lavoro lo fa `src/cli/disinstalla.mjs`, lanciato staccato con l'eseguibile
// in veste di Node. Riceve il pid e aspetta che il registro sia chiuso: su
// Windows una cartella con un file aperto non si cancella.

import { app, shell } from 'electron'
import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

import { percorsoDisinstallazione } from '../../src/environment/context.js'
import { chiediMessaggio, type BottoneMessaggio } from '../../src/environment/dialogs.js'
import { togliAvvioConWindows } from '../../src/environment/systemStartup.js'
import { parole } from '../../src/domain/words.testi.js'
import { testi, type GruppoDaTenere } from './uninstall.testi.js'

/**
 * Il disinstallatore NSIS accanto all'eseguibile, che porta il nome
 * dell'eseguibile (`productName`); altrimenti il primo
 * `Uninstall *.exe` della cartella.
 */
function disinstallatoreDiWindows (): string | null {
  if (process.platform !== 'win32' || process.env.PORTABLE_EXECUTABLE_FILE) return null
  const cartella = dirname(app.getPath('exe'))
  const file = join(cartella, `Uninstall ${basename(app.getPath('exe'), '.exe')}.exe`)
  if (existsSync(file)) return file
  try {
    const trovato = readdirSync(cartella).find((nome) => /^Uninstall .+\.exe$/i.test(nome))
    return trovato ? join(cartella, trovato) : null
  } catch {
    return null
  }
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

/**
 * Le parti della cartella dei dati che si possono tenere: i nomi sono quelli
 * di `GRUPPI` in `src/cli/disinstalla.mjs`, che sa quali file ci stanno dentro.
 */
const GRUPPI: readonly GruppoDaTenere[] = ['modelli', 'account', 'impostazioni']

/**
 * Una domanda nella finestra del registro (`chiediMessaggio`), e il nome del
 * pulsante premuto: `null` per Esc, la X e «Annulla».
 */
async function chiedi<T extends string> (
  domanda: {
    livello: 'avviso' | 'domanda'
    messaggio: string
    dettaglio: string
    bottoni: Array<BottoneMessaggio & { nome: T | 'annulla' }>
    predefinito: T | 'annulla'
  },
): Promise<T | null> {
  const annulla = domanda.bottoni.findIndex((bottone) => bottone.nome === 'annulla')
  const indice = await chiediMessaggio({
    livello: domanda.livello,
    titolo: testi().disinstalla,
    messaggio: domanda.messaggio,
    dettaglio: domanda.dettaglio,
    bottoni: domanda.bottoni,
    predefinito: domanda.bottoni.findIndex((bottone) => bottone.nome === domanda.predefinito),
    annulla,
  })
  const nome = indice === null ? 'annulla' : domanda.bottoni[indice]?.nome ?? 'annulla'
  return nome === 'annulla' ? null : nome
}

/**
 * Se disinstallare, e che cosa tenere dei dati: `null` è «Annulla», un elenco
 * vuoto è «togli tutto». Dove c'è il disinstallatore di Windows la scelta la
 * fa la sua pagina (`os/windows/uninstall.nsh`), e qui si chiede solo il sì.
 */
async function conferma (programma: string | null): Promise<string[] | null> {
  const nsis = disinstallatoreDiWindows() !== null
  const t = testi()
  const annulla = parole().annulla
  const cosa = [t.cosaSeNeVa(app.getPath('userData')), '', t.documentiRestano]
  if (nsis) cosa.push('', t.chiederàCosaTenere)
  if (!programma && !nsis) {
    // `.deb` o `.rpm`: il programma lo toglie il gestore dei pacchetti, da amministratore.
    cosa.push('', t.programmaResta)
  }
  // Da sinistra a destra: «Scegli…» in disparte, poi «Annulla» e il gesto.
  const risposta = await chiedi({
    livello: 'avviso',
    messaggio: t.domanda,
    dettaglio: cosa.join('\n'),
    bottoni: nsis
      ? [
          { nome: 'annulla', etichetta: annulla },
          { nome: 'tutto', etichetta: t.disinstalla, ruolo: 'pericolo' },
        ]
      : [
          { nome: 'scegli', etichetta: t.scegliCosaTenere, aSinistra: true },
          { nome: 'annulla', etichetta: annulla },
          { nome: 'tutto', etichetta: t.togliTutto, ruolo: 'pericolo' },
        ],
    // Su «Annulla»: un Invio di troppo non deve cancellare niente.
    predefinito: 'annulla',
  })
  if (risposta === null) return null
  if (risposta === 'tutto') return []

  // Una domanda per parte; «Annulla» vale per tutto.
  const tenuti: string[] = []
  for (const gruppo of GRUPPI) {
    const scelta = await chiedi({
      livello: 'domanda',
      messaggio: t.gruppi[gruppo].domanda,
      dettaglio: `${t.gruppi[gruppo].dettaglio}\n\n${t.seLiTieni}`,
      bottoni: [
        { nome: 'annulla', etichetta: annulla, aSinistra: true },
        { nome: 'tieni', etichetta: t.tieni },
        { nome: 'togli', etichetta: parole().togli, ruolo: 'pericolo' },
      ],
      predefinito: 'togli',
    })
    if (scelta === null) return null
    if (scelta === 'tieni') tenuti.push(gruppo)
  }
  return tenuti
}

export async function disinstalla (): Promise<void> {
  // In sviluppo non c'è niente da disinstallare.
  if (!app.isPackaged) {
    await chiediMessaggio({
      livello: 'info',
      titolo: testi().disinstalla,
      messaggio: testi().soloInstallato,
      bottoni: [],
    })
    return
  }

  const programma = programmaDaTogliere()
  const tenuti = await conferma(programma)
  if (!tenuti) return

  // Il disinstallatore di Windows fa tutto, `disinstalla.mjs` compreso.
  const disinstallatore = disinstallatoreDiWindows()
  if (disinstallatore) {
    spawn(disinstallatore, [], { detached: true, stdio: 'ignore' }).unref()
    app.quit()
    return
  }

  // Qui e non nello script: su macOS solo il registro stesso può togliere la voce d'avvio.
  togliAvvioConWindows()

  const argomenti = [
    percorsoDisinstallazione(),
    '--attendi', String(process.pid),
    '--dati', app.getPath('userData'),
    '--eseguibile', app.getPath('exe'),
  ]
  if (tenuti.length > 0) argomenti.push('--tieni', tenuti.join(','))
  // Il portabile lo toglie lo script, quando il suo avviatore si è chiuso.
  if (process.env.PORTABLE_EXECUTABLE_FILE) argomenti.push('--togli', process.env.PORTABLE_EXECUTABLE_FILE)

  spawn(process.execPath, argomenti, {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  }).unref()

  // `.app` e AppImage vanno nel cestino anche a programma aperto: il sistema
  // tiene vivo il file finché è in uso.
  if (programma && !process.env.PORTABLE_EXECUTABLE_FILE) {
    await shell.trashItem(programma).catch((male: unknown) => {
      console.warn('Programma non spostato nel cestino:', male instanceof Error ? male.message : String(male))
    })
  }

  app.quit()
}
