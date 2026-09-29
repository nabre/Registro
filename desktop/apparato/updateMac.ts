// L'aggiornamento su macOS: scarico dell'archivio `.zip` indicato da
// `latest-mac.yml` e scambio dei pacchetti con `os/macos/aggiornamento.sh`.
//
// electron-updater qui serve solo al controllo. Il suo scarico passa a
// Squirrel.Mac, che accetta soltanto un pacchetto firmato come quello che gira:
// con la firma ad-hoc (`mac.identity` in `electron-builder.json`) la firma
// cambia a ogni versione e Squirrel rifiuterebbe ogni aggiornamento.

import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  accessSync,
  constants,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'

import { app, net } from 'electron'

import type { UpdateFileInfo, UpdateInfo } from 'electron-updater'

import { percorsoAiutanteAggiornamentoMac } from './context.js'
import { impronta, PREFISSO_LAVORO } from './updateInstaller.js'
import { testi } from './updates.testi.js'

/** Da dove si scaricano i file di una release. */
const RADICE_SCARICO = 'https://github.com/nabre/Registro/releases/download'

/** Il pacchetto `.app` che gira, risalendo da `Contents/MacOS/<eseguibile>`. */
function pacchettoApp (): string | null {
  const pacchetto = percorso.dirname(percorso.dirname(percorso.dirname(app.getPath('exe'))))
  return pacchetto.endsWith('.app') ? pacchetto : null
}

/**
 * Se il pacchetto si può sostituire: non dall'immagine disco, non da una copia
 * in quarantena che macOS fa girare altrove (App Translocation), e con il
 * permesso di scrivere dove sta.
 */
export function macAggiornabile (): boolean {
  const pacchetto = pacchettoApp()
  if (!pacchetto) return false
  if (pacchetto.startsWith('/Volumes/') || pacchetto.includes('/AppTranslocation/')) return false
  try {
    accessSync(percorso.dirname(pacchetto), constants.W_OK)
    accessSync(pacchetto, constants.W_OK)
    return true
  } catch {
    return false
  }
}

/**
 * L'archivio `.zip` per questa macchina fra i file della release: su Apple
 * Silicon quello `arm64` se c'è (altrimenti l'Intel, che gira con Rosetta), su
 * Intel mai quello `arm64`. Lo stesso criterio di `MacUpdater` di electron-updater.
 */
export function archivioPerMac (
  file: readonly UpdateFileInfo[],
  arm64: boolean,
): UpdateFileInfo | undefined {
  const archivi = file.filter((voce) => voce.url.endsWith('.zip'))
  const perArm = archivi.filter((voce) => voce.url.includes('arm64'))
  if (arm64 && perArm.length > 0) return perArm[0]
  return archivi.find((voce) => !voce.url.includes('arm64'))
}

function suArm64 (): boolean {
  return process.arch === 'arm64' || app.runningUnderARM64Translation
}

/** La cartella degli scarichi, svuotata prima di ognuno. */
function cartellaScarichi (): string {
  return percorso.join(app.getPath('userData'), 'aggiornamento-mac')
}

/**
 * Scarica l'archivio della versione `info` e ne controlla lo SHA-512.
 * `avanza` riceve byte scesi e totale (0 se ignoto).
 */
export async function scaricaPerMac (
  info: UpdateInfo,
  avanza: (byte: number, totale: number) => void,
): Promise<{ file: string, sha512: string }> {
  const voce = archivioPerMac(info.files, suArm64())
  if (!voce) throw new Error(testi().senzaRelease)
  const indirizzo = /^https?:/.test(voce.url)
    ? voce.url
    : `${RADICE_SCARICO}/v${info.version}/${encodeURIComponent(voce.url)}`

  const cartella = cartellaScarichi()
  rmSync(cartella, { recursive: true, force: true })
  mkdirSync(cartella, { recursive: true })
  const destinazione = percorso.join(cartella, percorso.basename(voce.url))
  const parziale = `${destinazione}.part`

  // `net.fetch`: la rete di Chromium, con proxy e certificati del sistema.
  const risposta = await net.fetch(indirizzo)
  // testo-fisso: lo traduce `motivoDi` in `updates.ts` (il 404 diventa «senza release»)
  if (!risposta.ok || !risposta.body) throw new Error(`HTTP ${risposta.status} ${indirizzo}`)
  const totale = Number(risposta.headers.get('content-length')) || voce.size || 0

  const hash = createHash('sha512')
  const uscita = createWriteStream(parziale)
  let byte = 0
  try {
    const lettore = risposta.body.getReader()
    for (;;) {
      const { done, value } = await lettore.read()
      if (done) break
      hash.update(value)
      byte += value.byteLength
      if (!uscita.write(value)) await new Promise<void>((risolvi) => uscita.once('drain', () => risolvi()))
      avanza(byte, totale)
    }
  } finally {
    await new Promise<void>((risolvi, rifiuta) => {
      uscita.end((errore?: Error | null) => errore ? rifiuta(errore) : risolvi())
    })
  }

  if (hash.digest('base64') !== voce.sha512) {
    rmSync(parziale, { force: true })
    // testo-fisso: nomina `sha512` perché `motivoDi` in `updates.ts` lo traduca
    throw new Error(`sha512 mismatch: ${voce.url}`)
  }
  renameSync(parziale, destinazione)
  return { file: destinazione, sha512: voce.sha512 }
}

/** Solleva se l'archivio non c'è più o non è quello scaricato. */
export async function controllaArchivio (file: string, sha512: string | undefined): Promise<void> {
  if (!existsSync(file)) throw new Error(testi().installatoreSparito)
  if (sha512 && (await impronta(file)) !== sha512) throw new Error(testi().installatoreCambiato)
}

/**
 * Lancia lo scambio dei pacchetti, staccato: parte adesso e lavora dopo
 * l'uscita del registro. Da chiamare all'uscita, dopo l'ultimo salvataggio.
 */
export function installaSuMac (archivio: string, riapri: boolean): void {
  const pacchetto = pacchettoApp()
  if (!pacchetto) throw new Error(testi().nonSiAggiorna)

  // Fuori dall'asar, in una cartella che resta dopo l'uscita.
  const lavoro = percorso.join(tmpdir(), `${PREFISSO_LAVORO}${Date.now()}`)
  mkdirSync(lavoro, { recursive: true })
  const script = percorso.join(lavoro, 'aggiornamento.sh')
  writeFileSync(script, readFileSync(percorsoAiutanteAggiornamentoMac(), 'utf8'), 'utf8')

  const figlio = spawn('/bin/bash', [script, String(process.pid), archivio, pacchetto, riapri ? '1' : '0'], {
    detached: true,
    stdio: 'ignore',
  })
  figlio.unref()
}
