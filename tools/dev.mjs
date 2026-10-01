// Il modo sviluppo: `npm run dev`.
//
//   1. esbuild in ascolto su tutti i bundle;
//   2. Electron avviato, e riavviato quando cambiano main process o preload;
//   3. le pagine che si ricaricano da sole quando cambiano viste, CSS o pagine
//      native (lo fa `desktop/apparato/dev.ts`, che raggiunge le finestre);
//   4. Electron rilanciato anche quando esce con `CODICE_RIAVVIO`, chiesto
//      dalle opzioni di sviluppo (menu «Sviluppo», Ctrl+Maiusc+F12).
//
// Una ricarica lascia in piedi archivio, comandi e iscrizioni; un riavvio
// riporta il registro all'apertura. Che cosa fa scattare cosa lo dice
// `ricarica` sulle configurazioni di `esbuild.mjs`.
//
// Gira accanto a `npm run start` e al registro installato: bundle in
// `dist-dev/`, nome «Regiklass-dev», quindi `userData`, impostazioni e
// istanza unica suoi. Lo stesso `.regi` non va aperto in tutti e due.

import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import * as esbuild from 'esbuild'
import elettrone from 'electron'

import { applicazioneIn, copiaCaratteriPdf } from '../esbuild.mjs'

/** La cartella dei bundle di sviluppo, che `desktop/apparato/context.ts` riconosce. */
const CARTELLA = 'dist-dev'

const applicazione = applicazioneIn(CARTELLA)

/**
 * Quel che si dà a Electron: la cartella dei bundle, con un `package.json`
 * suo. Da lì Electron prende nome e versione; il nome dà la cartella di
 * `userData`. Con un file invece di una cartella non legge `package.json`,
 * l'app si chiama «Electron» e `userData` finisce in `%APPDATA%\Electron`.
 */
const AVVIO = CARTELLA

/** Il `package.json` di `dist-dev/`: quello del progetto, col suffisso `-dev`. */
function scriviPacchetto () {
  const progetto = JSON.parse(readFileSync('package.json', 'utf8'))
  const pacchetto = {
    name: `${progetto.name}-dev`,
    productName: `${progetto.productName}-dev`,
    version: progetto.version,
    main: 'main.cjs',
  }
  mkdirSync(CARTELLA, { recursive: true })
  writeFileSync(`${CARTELLA}/package.json`, `${JSON.stringify(pacchetto, null, 2)}
`)
}

/**
 * Il codice d'uscita con cui l'applicazione chiede di essere rilanciata («Riavvia
 * il main process» nelle opzioni di sviluppo): `CODICE_RIAVVIO` di
 * `desktop/apparato/dev.ts`.
 */
const CODICE_RIAVVIO = 75

/** Quanto si aspetta, dall'ultimo bundle finito, prima di riavviare. */
const CALMA = 150

const orologio = () =>
  new Date().toLocaleTimeString('it-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

const dice = (testo) => console.log(`[${orologio()}] ${testo}`)

// --------------------------------------------------------------------- Electron

/** @type {import('node:child_process').ChildProcess | null} */
let processo = null
let uscitaVoluta = false

function avviaElectron () {
  uscitaVoluta = false
  // `electron` importato da Node è il percorso dell'eseguibile, non il modulo.
  processo = spawn(/** @type {string} */ (/** @type {unknown} */ (elettrone)), [AVVIO], {
    stdio: 'inherit',
    env: {
      ...process.env,
      // Per `desktop/apparato/dev.ts`, che ricarica le finestre quando un bundle di pagina cambia.
      REGISTRO_SVILUPPO: '1',
      // Tace le avvertenze di sicurezza che nel pacchetto non valgono.
      ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
      // Accesa da VS Code o da un altro Electron, farebbe partire Node puro.
      ELECTRON_RUN_AS_NODE: undefined,
    },
  })

  processo.on('exit', (codice) => {
    processo = null
    if (uscitaVoluta) return
    if (codice === CODICE_RIAVVIO) {
      dice('riavvio chiesto dall’applicazione')
      avviaElectron()
      return
    }
    // Chiusa dall'utente: si esce anche di qui.
    dice(`Electron è uscito (${codice ?? 0}). Chiudo anche l'ascolto.`)
    void chiudi(codice ?? 0)
  })
}

function riavviaElectron () {
  if (!processo) {
    avviaElectron()
    return
  }
  uscitaVoluta = true
  processo.once('exit', () => {
    dice('riavvio l’applicazione')
    avviaElectron()
  })
  processo.kill()
}

// ----------------------------------------------------------------- l'ascolto

/** Quel che è cambiato dall'ultimo giro, e come va trattato. */
let riavvioInSospeso = false
let attesa = null

/**
 * I bundle che hanno già finito almeno una volta. Il primo giro costruisce
 * tutto e non deve riavviare niente; Electron parte solo a primo giro finito,
 * o si ricaricherebbe una volta per bundle. Si conta per configurazione, non a tempo.
 */
const primoGiro = new Set()

function segnala (configurazione, esito) {
  const nome = configurazione.outfile ?? configurazione.outdir

  if (esito.errors.length > 0) {
    dice(`${nome}: ${esito.errors.length} errori`)
    for (const errore of esito.errors) {
      const dove = errore.location ? ` (${errore.location.file}:${errore.location.line})` : ''
      console.error(`  ${errore.text}${dove}`)
    }
    // Anche un bundle rotto ha fatto il primo giro, o un errore di sintassi
    // all'avvio bloccherebbe tutto senza dirlo.
    finitoIlPrimoGiro(configurazione)
    return
  }

  if (!primoGiro.has(configurazione)) {
    finitoIlPrimoGiro(configurazione)
    return
  }
  dice(`${nome} ricostruito`)

  // Le pagine si ricaricano da sole: `dev.ts` guarda `dist-dev/`.
  if (configurazione.ricarica !== 'riavvia') return

  riavvioInSospeso = true
  if (attesa) clearTimeout(attesa)
  attesa = setTimeout(() => {
    attesa = null
    if (!riavvioInSospeso) return
    riavvioInSospeso = false
    riavviaElectron()
  }, CALMA)
}

/** La configurazione per l'ascolto: senza la chiave `ricarica`, con l'`onEnd` di qui. */
function conAscolto (configurazione) {
  const { ricarica: _ricarica, ...resto } = configurazione
  return {
    ...resto,
    plugins: [
      {
        name: 'sviluppo',
        setup (build) {
          build.onEnd((esito) => segnala(configurazione, esito))
        },
      },
    ],
  }
}

/** Segna un bundle come costruito, e lancia l'applicazione quando ci sono tutti. */
function finitoIlPrimoGiro (configurazione) {
  if (primoGiro.has(configurazione)) return
  primoGiro.add(configurazione)
  if (primoGiro.size < applicazione.length) return
  dice('in ascolto. Le pagine si ricaricano da sole; il main process fa riavviare.')
  avviaElectron()
}

// ----------------------------------------------------------------- la chiusura

let contesti = []

async function chiudi (codice) {
  uscitaVoluta = true
  processo?.kill()
  await Promise.all(contesti.map((c) => c.dispose()))
  process.exit(codice)
}

for (const segnale of ['SIGINT', 'SIGTERM']) {
  process.on(segnale, () => void chiudi(0))
}

// -------------------------------------------------------------------- l'avvio

dice(`costruisco i bundle in ${CARTELLA}/…`)
scriviPacchetto()
copiaCaratteriPdf(`${CARTELLA}/pdf-fonts`)
contesti = await Promise.all(applicazione.map((c) => esbuild.context(conAscolto(c))))
// L'applicazione la lancia `finitoIlPrimoGiro`, quando ogni bundle è sul disco.
await Promise.all(contesti.map((c) => c.watch()))
