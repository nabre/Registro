// Il modo sviluppo: `npm run dev`.
//
// Un comando solo che tiene in piedi tre cose insieme:
//
//   1. esbuild in ascolto su tutti i bundle — il main process, il preload, i due
//      webview, i fogli di stile, le pagine native;
//   2. Electron avviato, e **riavviato** quando cambia quel che non si può
//      ricaricare: il main process e il preload;
//   3. le pagine che si **ricaricano** da sole quando cambia quel che invece si
//      può — le viste, il CSS, le pagine native. Di quello si occupa
//      `src/environment/dev.ts`, dentro l'applicazione, perché è di lì che si
//      raggiungono le finestre aperte.
//
// La differenza fra i due modi è la ragione per cui questo file esiste. Un
// riavvio costa un secondo e mezzo e riporta il registro all'apertura; una
// ricarica costa un decimo di secondo e lascia in piedi archivio, comandi e
// iscrizioni. Riavviare per un colore sarebbe un rifacimento ogni due minuti,
// tutto il pomeriggio, e alla fine si smette di provare le cose.
//
// Che cosa fa scattare cosa lo dice `ricarica` sulle configurazioni in
// `esbuild.mjs`, che è dove i bundle sono elencati: qui non c'è un secondo
// elenco da tenere allineato.

import { spawn } from 'node:child_process'
import * as esbuild from 'esbuild'
import elettrone from 'electron'

import { applicazione } from '../esbuild.mjs'

/**
 * Quel che si dà a Electron: la cartella del progetto, non il file di avvio.
 *
 * La differenza non è di stile. Dandogli un file, Electron non legge il nostro
 * `package.json` e l'applicazione si chiama «Electron»: `app.getPath('userData')`
 * finisce in `%APPDATA%\Electron`, e impostazioni e portachiavi di chi lavora
 * al codice sarebbero un posto diverso da quelli dell'applicazione installata.
 * Dandogli la cartella, `main` porta allo stesso file e il nome è quello vero:
 * si lavora sulla stessa configurazione che si consegna.
 */
const AVVIO = '.'

/** Quanto si aspetta, dall'ultimo bundle finito, prima di riavviare. */
const CALMA = 150

const orologio = () =>
  new Date().toLocaleTimeString('it-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

const dice = (testo) => console.log(`[${orologio()}] ${testo}`)

// --------------------------------------------------------------------- Electron

let processo = null
let uscitaVoluta = false

function avviaElectron () {
  uscitaVoluta = false
  processo = spawn(elettrone, [AVVIO], {
    stdio: 'inherit',
    env: {
      ...process.env,
      // La accende `src/environment/dev.ts`, che da lì fa ricaricare le
      // finestre quando un bundle di pagina cambia.
      REGISTRO_SVILUPPO: '1',
      // Senza, Electron parla di sicurezza a ogni avvio per cose che nel
      // pacchetto non valgono. Le avvertenze vere restano.
      ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
      // Chi lancia da dentro VS Code (o da un altro programma Electron) se la
      // trova accesa, e Electron partirebbe come Node puro: `app` undefined.
      ELECTRON_RUN_AS_NODE: undefined,
    },
  })

  processo.on('exit', (codice) => {
    processo = null
    if (uscitaVoluta) return
    // Chiusa dall'utente e non da noi: si esce anche di qui, altrimenti resta
    // un terminale che compila per un'applicazione che non c'è più.
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
 * Chi ha già finito almeno una volta.
 *
 * Il primo giro è diverso da tutti gli altri, e per due motivi. Il primo è che
 * mettersi in ascolto fa costruire ogni bundle, e ogni costruzione chiama
 * `onEnd`: senza questa memoria l'applicazione si riavvierebbe appena nata. Il
 * secondo è che **Electron non parte finché il primo giro non è finito**: se
 * partisse prima, vedrebbe arrivare sotto di sé i file appena scritti e si
 * ricaricherebbe una volta per bundle, cinque volte in due secondi, ogni volta
 * che si lancia `npm run dev`.
 *
 * Si conta per configurazione e non con un cronometro, perché i bundle non
 * finiscono tutti insieme — il main process ci mette un terzo del tempo dei
 * webview — e un ritardo indovinato a occhio si sbaglia sulla macchina di
 * qualcun altro.
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
    // Anche un bundle rotto ha fatto il suo primo giro: altrimenti un errore di
    // sintassi al primo avvio lascerebbe il terminale a compilare per
    // un'applicazione che non parte e non dice perché. Si va avanti con quel che
    // c'è, e si riprova al salvataggio dopo.
    finitoIlPrimoGiro(configurazione)
    return
  }

  if (!primoGiro.has(configurazione)) {
    finitoIlPrimoGiro(configurazione)
    return
  }
  dice(`${nome} ricostruito`)

  // Le pagine si ricaricano da sole: `dev.ts` guarda `dist/`.
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

/**
 * La configurazione pronta per l'ascolto: la chiave nostra tolta, e al posto
 * del cronista di `esbuild.mjs` — che stampa due righe a bundle — il solo
 * `onEnd` che serve qui.
 */
function conAscolto (configurazione) {
  const { ricarica: _ricarica, plugins: _plugins, ...resto } = configurazione
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

dice('costruisco i bundle…')
contesti = await Promise.all(applicazione.map((c) => esbuild.context(conAscolto(c))))
// L'applicazione la lancia `finitoIlPrimoGiro`, quando ogni bundle è sul disco.
await Promise.all(contesti.map((c) => c.watch()))
