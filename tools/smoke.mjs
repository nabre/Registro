/**
 * La prova del fumo: `node tools/smoke.mjs`. Accende il registro in un Electron
 * vero — l'unica prova che lo fa: le altre usano `tests/helpers/fake-electron.mjs`
 * — e gli parla dal condotto come farebbe `regi`.
 *
 * Il giro: costruisce `dist/`, prepara una cartella provvisoria che fa da
 * `userData` (condotto acceso, solo vassoio, nessuna integrazione col sistema)
 * con dentro una copia del campione, accende Electron sul campione, aspetta che
 * il condotto risponda a `$versione`, chiede `classi.elenco`, chiude con
 * `programma.esci` e pretende che il processo esca da sé entro un tetto. Alla
 * fine controlla che nulla sia stato scritto nella cartella dei dati vera.
 *
 * Fuori da `npm test` (il nome non finisce in `.test.mjs`): vuole un display e
 * una decina di secondi. `--senza-costruire` salta `node esbuild.mjs`.
 */

import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

import { leggiChiave, presentati } from '../cli/access.mjs'
import { collega, conversazione } from '../cli/link.mjs'
import { RADICE } from './common.mjs'

/** Quanto si aspetta che il condotto risponda: il primo avvio su CI è lento. */
const ATTESA_CONDOTTO_MS = 60_000

/** Quanto può metterci il processo a uscire dopo `programma.esci`. */
const ATTESA_USCITA_MS = 20_000

const CAMPIONE = join(RADICE, 'tests', 'samples', 'anno_esempio.regi')

/** Il nome della cartella dei dati sotto `APPDATA`, come in `cli/common.mjs`. */
const NOME_APPLICAZIONE = 'Regiklass'

/** Le cartelle dei dati vere, che la prova non deve toccare. */
function cartelleVere () {
  const sistema = process.platform === 'win32'
    ? process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming')
    : process.platform === 'darwin'
      ? join(homedir(), 'Library', 'Application Support')
      : process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config')
  return [NOME_APPLICAZIONE, 'Regiclass', 'Registro docenti'].map((nome) => join(sistema, nome))
}

/** Nome, dimensione e data di ogni file sotto `cartella`: basta a vedere una scrittura. */
function fotografia (cartella, raccolta = new Map()) {
  let voci
  try {
    voci = readdirSync(cartella, { withFileTypes: true })
  } catch {
    return raccolta
  }
  for (const voce of voci) {
    const percorso = join(cartella, voce.name)
    if (voce.isDirectory()) {
      fotografia(percorso, raccolta)
      continue
    }
    try {
      const { size, mtimeMs } = statSync(percorso)
      raccolta.set(percorso, `${size}:${mtimeMs}`)
    } catch {
      // Sparito fra `readdir` e `stat`: lo dirà il confronto.
    }
  }
  return raccolta
}

function fotografie (cartelle) {
  return new Map(cartelle.flatMap((cartella) => [...fotografia(cartella)]))
}

function differenze (prima, dopo) {
  const cambiati = []
  for (const [percorso, firma] of dopo) {
    if (prima.get(percorso) !== firma) cambiati.push(percorso)
  }
  for (const percorso of prima.keys()) {
    if (!dopo.has(percorso)) cambiati.push(percorso)
  }
  return cambiati
}

function impronta (file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

/** Ogni processo che nomina la cartella provvisoria (Electron e i suoi figli), tranne chi la cerca. */
function processiRimasti (radice) {
  if (process.platform !== 'win32') {
    const uscita = spawnSync('pgrep', ['-f', radice], { encoding: 'utf8' })
    return uscita.stdout.split('\n').map((riga) => Number(riga)).filter((pid) => pid > 0 && pid !== process.pid)
  }
  const filtro = radice.replaceAll('\'', '\'\'')
  const uscita = spawnSync('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-Command',
    `Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -and $_.CommandLine.Contains('${filtro}') } | ForEach-Object { $_.ProcessId }`,
  ], { encoding: 'utf8' })
  return uscita.stdout.split(/\r?\n/).map((riga) => Number(riga)).filter((pid) => pid > 0 && pid !== process.pid)
}

function uccidi (pid) {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' })
  } else {
    try {
      process.kill(pid, 'SIGKILL')
    } catch {
      // Già uscito.
    }
  }
}

function dormi (ms) {
  return new Promise((risolvi) => setTimeout(risolvi, ms))
}

/** Una chiamata che deve riuscire: altrimenti il guasto con il metodo che l'ha dato. */
async function chiedi (condotto, metodo, parametri = {}) {
  const busta = await condotto.chiedi(metodo, parametri, { timeout: 30_000 })
  if (busta === null) throw new Error(`${metodo}: il condotto si è chiuso senza rispondere`)
  if (busta.error) throw new Error(`${metodo}: ${busta.error.message} (${JSON.stringify(busta.error.data ?? null)})`)
  return busta.result
}

function passo (testo) {
  console.log(`fumo: ${testo}`)
}

async function prova () {
  const inizio = Date.now()
  if (!process.argv.includes('--senza-costruire')) {
    passo('costruisco dist/')
    const costruzione = spawnSync(process.execPath, ['esbuild.mjs'], { cwd: RADICE, stdio: 'inherit' })
    if (costruzione.status !== 0) throw new Error('la costruzione (node esbuild.mjs) è fallita')
  }
  const principale = join(RADICE, 'dist', 'main.cjs')
  if (!existsSync(principale)) throw new Error(`manca ${principale}: costruisci con npm run build`)

  // Il pacchetto `electron`, letto da Node, è il percorso dell'eseguibile.
  const electron = createRequire(import.meta.url)('electron')

  const radice = mkdtempSync(join(tmpdir(), 'regiklass-fumo-'))
  const appData = join(radice, 'AppData')
  const userData = join(appData, NOME_APPLICAZIONE)
  const lavoro = join(radice, 'lavoro')
  const temporanei = join(radice, 'temp')
  for (const cartella of [userData, lavoro, temporanei]) mkdirSync(cartella, { recursive: true })

  const documento = join(lavoro, 'anno_esempio.regi')
  copyFileSync(CAMPIONE, documento)
  writeFileSync(join(userData, 'impostazioni.json'), JSON.stringify({
    cartellaLavoro: lavoro,
    // La scrittura solo per `programma.esci`: su Windows non c'è un segnale che faccia
    // passare Electron da `before-quit`, e la chiusura va provata pulita.
    'registroDocenti.api.accesso': 'letturaScrittura',
    // Nessuna finestra: il registro apre il documento e il condotto, e sta nel vassoio.
    'registroDocenti.avvio.soloVassoio': true,
    'registroDocenti.vassoio.attivo': true,
    'registroDocenti.aggiornamenti.controlloAutomatico': false,
  }, null, 2))

  const vere = cartelleVere()
  const primaVere = fotografie(vere)
  const primaCampione = impronta(CAMPIONE)

  // `APPDATA` anche qui: `cli/address.mjs` ricava l'indirizzo della pipe dalla
  // cartella dei dati, e deve trovare quella del registro acceso.
  /** @type {NodeJS.ProcessEnv} */
  const ambienteFiglio = {
    ...process.env,
    APPDATA: appData,
    XDG_CONFIG_HOME: appData,
    TEMP: temporanei,
    TMP: temporanei,
    TMPDIR: temporanei,
    // Associazione dei `.regi`, `regi` nel PATH, identità delle notifiche:
    // tutte scritture nel registro di Windows o nel profilo.
    REGISTRO_SENZA_INTEGRAZIONE: '1',
    REGISTRO_SENZA_IDENTITA: '1',
  }
  delete ambienteFiglio.REGISTRO_CONDOTTO
  delete ambienteFiglio.REGISTRO_CHIAVE
  delete ambienteFiglio.REGISTRO_DATI
  delete ambienteFiglio.REGISTRO_USERDATA
  delete ambienteFiglio.ELECTRON_RUN_AS_NODE
  process.env.APPDATA = appData
  process.env.XDG_CONFIG_HOME = appData
  delete process.env.REGISTRO_CONDOTTO
  delete process.env.REGISTRO_CHIAVE

  let figlio = null
  let uscita = null
  let condotto = null
  const console_ = []
  try {
    passo(`accendo Electron (userData in ${userData})`)
    figlio = spawn(electron, [RADICE, `--user-data-dir=${userData}`, documento], {
      cwd: radice,
      env: ambienteFiglio,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
    const uscito = new Promise((risolvi) => {
      figlio.once('exit', (codice, segnale) => {
        uscita = { codice, segnale }
        risolvi(uscita)
      })
    })
    for (const flusso of [figlio.stdout, figlio.stderr]) {
      flusso.setEncoding('utf8')
      flusso.on('data', (pezzo) => console_.push(pezzo))
    }

    const presa = await Promise.race([
      collega({ aspetta: true, timeout: ATTESA_CONDOTTO_MS, intervallo: 250 }),
      uscito.then((u) => {
        throw new Error(`Electron è uscito prima che il condotto rispondesse (codice ${u.codice}, segnale ${u.segnale})`)
      }),
    ]).catch((male) => {
      throw new Error(`il condotto non risponde entro ${ATTESA_CONDOTTO_MS / 1000} s: ${male.message}`)
    })
    condotto = conversazione(presa)
    const chiave = leggiChiave()
    if (!chiave) throw new Error('il condotto risponde ma manca condotto.chiave')
    const presentazione = await presentati(condotto, chiave)
    if (presentazione.esito !== 'riconosciuto') throw new Error(`$accedi: ${presentazione.esito}`)
    passo(`condotto pronto dopo ${((Date.now() - inizio) / 1000).toFixed(1)} s`)

    const versione = await chiedi(condotto, '$versione')
    if (typeof versione?.api !== 'number' && typeof versione?.api !== 'string') {
      throw new Error(`$versione senza api: ${JSON.stringify(versione)}`)
    }
    if (!versione.permessi?.lettura) throw new Error(`$versione: lettura non concessa (${JSON.stringify(versione.permessi)})`)
    if (!versione.documento) throw new Error(`$versione: nessun documento aperto (${JSON.stringify(versione)})`)
    passo(`$versione: api ${versione.api}, applicazione ${versione.applicazione}, documento ${versione.documento}`)

    const risposta = await chiedi(condotto, 'classi.elenco')
    if (risposta?.ok !== true) throw new Error(`classi.elenco rifiutata: ${JSON.stringify(risposta).slice(0, 300)}`)
    const classi = risposta.dati
    const quante = Array.isArray(classi?.classi) ? classi.classi.length : null
    if (quante === null || quante === 0) throw new Error(`classi.elenco: nessuna classe nel campione (${JSON.stringify(classi).slice(0, 200)})`)
    passo(`classi.elenco: ${quante} classi nell'anno ${classi.anno}`)

    await chiedi(condotto, 'programma.esci')
    condotto.chiudi()
    condotto = null
    passo('programma.esci accettato, aspetto l\'uscita')
    let orologio
    const tetto = new Promise((risolvi) => {
      orologio = setTimeout(() => risolvi(null), ATTESA_USCITA_MS)
    })
    const finale = await Promise.race([uscito, tetto])
    // Il tetto non deve tenere acceso Node dopo una prova riuscita.
    clearTimeout(orologio)
    if (finale === null) throw new Error(`Electron non è uscito entro ${ATTESA_USCITA_MS / 1000} s da programma.esci`)
    if (finale.codice !== 0) throw new Error(`Electron è uscito con codice ${finale.codice} (segnale ${finale.segnale})`)

    // I figli di Chromium (GPU, rete) possono sopravvivere di un soffio al padre.
    let rimasti = processiRimasti(radice)
    for (let giro = 0; rimasti.length > 0 && giro < 10; giro++) {
      await dormi(500)
      rimasti = processiRimasti(radice)
    }
    if (rimasti.length > 0) throw new Error(`processi ancora vivi dopo l'uscita: ${rimasti.join(', ')}`)

    const scritti = differenze(primaVere, fotografie(vere))
    if (scritti.length > 0) throw new Error(`scritto fuori dalla cartella provvisoria:\n  ${scritti.join('\n  ')}`)
    if (impronta(CAMPIONE) !== primaCampione) throw new Error(`il campione ${CAMPIONE} è cambiato`)

    passo(`riuscita in ${((Date.now() - inizio) / 1000).toFixed(1)} s`)
  } catch (male) {
    if (console_.length > 0) {
      console.error('fumo: console di Electron:\n' + console_.join('').trimEnd().split('\n').map((r) => `  | ${r}`).join('\n'))
    }
    throw male
  } finally {
    condotto?.chiudi()
    if (figlio && uscita === null) uccidi(figlio.pid)
    for (const pid of processiRimasti(radice)) uccidi(pid)
    // Windows lascia togliere la cartella solo quando l'ultimo processo ha
    // lasciato i suoi file: qualche tentativo.
    for (let giro = 0; giro < 10; giro++) {
      try {
        rmSync(radice, { recursive: true, force: true })
        break
      } catch {
        await dormi(500)
      }
    }
  }
}

try {
  await prova()
} catch (male) {
  console.error(`fumo: GUASTO — ${male instanceof Error ? male.message : String(male)}`)
  process.exitCode = 1
}
