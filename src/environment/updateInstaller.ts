// L'installazione di una versione scaricata, condotta da `os/windows/aggiornamento.ps1`:
// una finestra PowerShell/WPF fuori dalla cartella del programma che aspetta
// l'uscita del registro, installa senza pagine nella stessa cartella e lo riapre.
//
// Il registro esce solo quando lo script scrive in `stato.json`; se la finestra
// non arriva si ripiega sull'installatore muto di electron-updater.
//
// Prima di uscire si lascia `aggiornamento.json` in `userData`: al riavvio dice
// se l'aggiornamento è riuscito, o se la finestra sta ancora installando e il
// registro deve uscire subito.

import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  copyFileSync,
  createReadStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { setTimeout as aspetta } from 'node:timers/promises'

import { app } from 'electron'

import { percorsoAiutanteAggiornamento, percorsoIcona } from './context.js'
import { diSistema } from './system.js'
import { scuro } from './theme.js'
import { testi } from './updates.testi.js'
import { lingua } from '../i18n/index.js'

/** Il prefisso delle cartelle di lavoro della finestra, nella cartella temporanea. */
export const PREFISSO_LAVORO = 'registro-aggiornamento-'

/** Il segno lasciato nella cartella dei dati. */
const FILE_SEGNO = 'aggiornamento.json'

/** Attesa massima della finestra (su macchine lente ci mette alcuni secondi). */
const ATTESA_FINESTRA_MS = 20_000

/**
 * Per quanto un segno conta: oltre, un pid vivo è un numero riusato. La finestra
 * dà all'installatore al massimo venti minuti.
 */
const VITA_SEGNO_MS = 30 * 60_000

/** Dopo quanto togliere le cartelle di lavoro rimaste indietro. */
const VITA_LAVORO_MS = 7 * 24 * 3_600_000

/** Le fasi che la finestra scrive in `stato.json`. */
type FaseAiutante = 'pronto' | 'chiusura' | 'installazione' | 'riapertura' | 'fatto' | 'errore' | 'guasto'

/** Le fasi in cui la finestra sta ancora lavorando sui file del programma. */
const FASI_AL_LAVORO: readonly FaseAiutante[] = ['pronto', 'chiusura', 'installazione']

interface StatoAiutante {
  fase: FaseAiutante
  pid?: number
  errore?: string
}

/** Quel che il registro lascia nella cartella dei dati prima di uscire. */
export interface Segno {
  da: string
  a: string
  /** La cartella di lavoro della finestra. */
  lavoro: string
  /** Il processo della finestra. */
  pid: number
  /** Quando è stato scritto, in ISO. */
  quando: string
}

/** Che cosa fare di un segno trovato all'avvio. */
type Decisione = 'nessuno' | 'attendi' | 'riuscito' | 'fallito'

/** Che cosa serve per consegnare un'installazione alla finestra. */
export interface Consegna {
  /** L'installatore scaricato da electron-updater. */
  installatore: string
  /** Lo SHA-512 dichiarato in `latest.yml`, in base64. Senza, non si ricontrolla. */
  sha512?: string
  da: string
  a: string
  /** Se riaprire il registro alla fine (sì da «Riavvia e aggiorna»). */
  riapri: boolean
  pagina: string
}

// --------------------------------------------------------- le parti pure

/** Lo stato scritto dalla finestra, o `null`; toglie il BOM che PowerShell 5.1 può mettere. */
export function leggiStatoAiutante (testo: string): StatoAiutante | null {
  try {
    const dati = JSON.parse(testo.replace(/^\uFEFF/, '')) as Partial<StatoAiutante>
    return typeof dati.fase === 'string' ? (dati as StatoAiutante) : null
  } catch {
    return null
  }
}

/** Il segno letto dal disco, o `null` se non c'è o non è nostro. */
export function leggiSegno (testo: string): Segno | null {
  try {
    const dati = JSON.parse(testo) as Partial<Segno>
    if (
      typeof dati.da !== 'string' || typeof dati.a !== 'string' ||
      typeof dati.lavoro !== 'string' || typeof dati.pid !== 'number' ||
      typeof dati.quando !== 'string'
    ) return null
    return dati as Segno
  } catch {
    return null
  }
}

/**
 * Che cosa vuol dire un segno all'avvio: `attendi` (la finestra installa ancora),
 * `riuscito` (gira la nuova), `fallito` (gira la vecchia), `nessuno`.
 */
export function decidiAllAvvio (
  segno: Segno | null,
  versione: string,
  aiutante: { vivo: boolean, fase: FaseAiutante | null },
  adesso: number,
): Decisione {
  if (!segno) return 'nessuno'
  const eta = adesso - Date.parse(segno.quando)
  const fresco = Number.isFinite(eta) && eta >= 0 && eta < VITA_SEGNO_MS
  if (fresco && aiutante.vivo && aiutante.fase !== null && FASI_AL_LAVORO.includes(aiutante.fase)) {
    return 'attendi'
  }
  if (versione === segno.a) return 'riuscito'
  if (versione === segno.da) return 'fallito'
  return 'nessuno'
}

/** Gli argomenti con cui si lancia la finestra. */
export function argomentiAiutante (script: string, parametri: string): string[] {
  return [
    '-NoProfile',
    '-NonInteractive',
    // Solo per questo processo; un criterio di gruppo vince comunque.
    '-ExecutionPolicy', 'Bypass',
    // WPF vuole un filo STA.
    '-STA',
    '-WindowStyle', 'Hidden',
    '-File', script,
    '-Parametri', parametri,
  ]
}

// ----------------------------------------------------------- il disco

function fileSegno (): string {
  return percorso.join(app.getPath('userData'), FILE_SEGNO)
}

function leggiTesto (file: string): string | null {
  try {
    return readFileSync(file, 'utf8')
  } catch {
    return null
  }
}

function statoDi (lavoro: string): StatoAiutante | null {
  const testo = leggiTesto(percorso.join(lavoro, 'stato.json'))
  return testo === null ? null : leggiStatoAiutante(testo)
}

/** Se il processo esiste ancora (`kill(pid, 0)` non manda segnali). */
function vivo (pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (errore) {
    // EPERM: esiste, ma è di un altro utente.
    return (errore as NodeJS.ErrnoException).code === 'EPERM'
  }
}

function togli (cammino: string): void {
  try {
    rmSync(cammino, { recursive: true, force: true })
  } catch {
    // File bloccato: si riprova al prossimo avvio.
  }
}

/** Lo SHA-512 di un file, in base64 come lo scrive `latest.yml`. */
function impronta (file: string): Promise<string> {
  return new Promise((risolvi, rifiuta) => {
    const hash = createHash('sha512')
    createReadStream(file)
      .on('data', (pezzo) => hash.update(pezzo))
      .on('error', rifiuta)
      .on('end', () => risolvi(hash.digest('base64')))
  })
}

/** Toglie le cartelle di lavoro vecchie, che la finestra lascia col diario se fallisce. */
function togliLavoriVecchi (tranne: string | null): void {
  const radice = tmpdir()
  let voci: string[] = []
  try {
    voci = readdirSync(radice)
  } catch {
    return
  }
  const adesso = Date.now()
  for (const voce of voci) {
    if (!voce.startsWith(PREFISSO_LAVORO)) continue
    const cammino = percorso.join(radice, voce)
    if (tranne && percorso.resolve(cammino) === percorso.resolve(tranne)) continue
    try {
      if (adesso - statSync(cammino).mtimeMs > VITA_LAVORO_MS) togli(cammino)
    } catch {
      // Sparita nel frattempo.
    }
  }
}

// ------------------------------------------------------------ la consegna

/**
 * Controlla l'installatore, lancia la finestra e aspetta che compaia. Vero se
 * l'ha presa in mano, falso per ripiegare sul muto; solleva se l'installatore
 * manca o non è quello pubblicato.
 */
export async function consegnaAllAiutante (consegna: Consegna): Promise<boolean> {
  if (!existsSync(consegna.installatore)) throw new Error(testi().installatoreSparito)
  // Si ricontrolla: dallo scarico possono passare giorni, in una cartella scrivibile.
  if (consegna.sha512 && (await impronta(consegna.installatore)) !== consegna.sha512) {
    throw new Error(testi().installatoreCambiato)
  }

  const script = percorsoAiutanteAggiornamento()
  let lavoro: string
  let fileParametri: string
  try {
    lavoro = percorso.join(tmpdir(), `${PREFISSO_LAVORO}${Date.now()}`)
    mkdirSync(lavoro, { recursive: true })
    // Copia fuori dall'asar, con il BOM perché PowerShell 5.1 legga gli accenti.
    const testo = readFileSync(script, 'utf8').replace(/^\uFEFF/, '')
    writeFileSync(percorso.join(lavoro, 'aggiornamento.ps1'), '\uFEFF' + testo, 'utf8')
    const icona = percorsoIcona()
    const copiaIcona = percorso.join(lavoro, 'icona.png')
    if (icona) copyFileSync(icona, copiaIcona)

    fileParametri = percorso.join(lavoro, 'parametri.json')
    writeFileSync(fileParametri, JSON.stringify({
      installatore: consegna.installatore,
      // Si installa dove gira adesso, non dove dice il registro di sistema.
      cartella: percorso.dirname(process.execPath),
      eseguibile: process.execPath,
      pid: process.pid,
      da: consegna.da,
      a: consegna.a,
      riapri: consegna.riapri,
      tema: scuro() ? 'scuro' : 'chiaro',
      // La lingua del registro, non di Windows; i testi stanno nello script.
      lingua: lingua(),
      pagina: consegna.pagina,
      icona: icona ? copiaIcona : null,
    }, null, 2), 'utf8')
  } catch (errore) {
    console.warn('Aggiornamenti: la finestra non si prepara', errore)
    return false
  }

  // Per percorso intero: per nome si troverebbe prima un `powershell.exe` estraneo.
  const powershell = diSistema(percorso.join('WindowsPowerShell', 'v1.0', 'powershell.exe'))
  let uscito = false
  let pid: number | undefined
  try {
    const figlio = spawn(powershell, argomentiAiutante(percorso.join(lavoro, 'aggiornamento.ps1'), fileParametri), {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    })
    figlio.on('error', (errore) => {
      console.warn('Aggiornamenti: la finestra non parte', errore)
      uscito = true
    })
    figlio.on('exit', () => {
      uscito = true
    })
    figlio.unref()
    pid = figlio.pid
  } catch (errore) {
    console.warn('Aggiornamenti: la finestra non parte', errore)
    return false
  }
  if (pid === undefined) return false

  const scadenza = Date.now() + ATTESA_FINESTRA_MS
  while (Date.now() < scadenza && !uscito) {
    const stato = statoDi(lavoro)
    if (stato?.fase === 'guasto') {
      console.warn('Aggiornamenti: la finestra non si è disegnata', stato.errore)
      break
    }
    if (stato) {
      scriviSegno({ da: consegna.da, a: consegna.a, lavoro, pid, quando: new Date().toISOString() })
      return true
    }
    await aspetta(150)
  }

  // Non è arrivata: si ferma il processo, o lancerebbe un secondo installatore.
  try {
    if (!uscito) process.kill(pid)
  } catch {
    // Già uscito.
  }
  togli(lavoro)
  return false
}

function scriviSegno (segno: Segno): void {
  try {
    writeFileSync(fileSegno(), JSON.stringify(segno, null, 2), 'utf8')
  } catch (errore) {
    // Senza segno si perde solo l'avviso alla riapertura.
    console.warn('Aggiornamenti: il segno non si scrive', errore)
  }
}

// --------------------------------------------------------- alla riaccensione

/** Il segno e la sua decisione, letti una volta all'avvio. */
let letto: { segno: Segno, decisione: Decisione } | null | undefined

function leggiAllAvvio (): { segno: Segno, decisione: Decisione } | null {
  if (letto !== undefined) return letto
  const testo = leggiTesto(fileSegno())
  const segno = testo === null ? null : leggiSegno(testo)
  if (!segno) {
    letto = null
    return letto
  }
  const stato = statoDi(segno.lavoro)
  const decisione = decidiAllAvvio(
    segno,
    app.getVersion(),
    { vivo: vivo(segno.pid), fase: stato?.fase ?? null },
    Date.now(),
  )
  letto = { segno, decisione }
  return letto
}

/**
 * Se la finestra sta ancora installando: allora le chiede di riaprire il
 * registro alla fine, e chi chiama deve uscire prima di aprire finestre.
 */
export function aggiornamentoInCorso (): boolean {
  const esito = leggiAllAvvio()
  if (esito?.decisione !== 'attendi') return false
  try {
    writeFileSync(percorso.join(esito.segno.lavoro, 'apri'), '', 'utf8')
  } catch {
    // Senza richiesta il registro si riapre a mano.
  }
  return true
}

/**
 * Chiude un aggiornamento, col riquadro d'avvio sullo schermo: congeda la
 * finestra, pulisce segno e cartelle vecchie e dice l'esito (`null` se nessuno).
 */
export function concludiAggiornamento (): { esito: 'riuscito' | 'fallito', segno: Segno, detto: boolean } | null {
  const esito = leggiAllAvvio()
  togliLavoriVecchi(esito?.segno.lavoro ?? null)
  if (!esito || esito.decisione === 'nessuno' || esito.decisione === 'attendi') {
    if (esito?.decisione === 'nessuno') togli(fileSegno())
    return null
  }
  if (existsSync(esito.segno.lavoro)) {
    try {
      writeFileSync(percorso.join(esito.segno.lavoro, 'riaperto'), '', 'utf8')
    } catch {
      // La finestra guarda anche se il registro ha una finestra.
    }
  }
  togli(fileSegno())
  // `detto`: la finestra ha già mostrato l'esito, non va ripetuto.
  const fase = statoDi(esito.segno.lavoro)?.fase
  const detto = fase === 'errore' || fase === 'fatto'
  return { esito: esito.decisione, segno: esito.segno, detto }
}
