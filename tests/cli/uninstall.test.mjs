// La disinstallazione: `cli/uninstall.mjs` lanciato come lo lanciano il
// disinstallatore di Windows e la voce «Disinstalla…». Con `--tieni` restano
// modelli, account o impostazioni scelti e il resto della cartella dei dati se
// ne va; senza (disinstallazione silenziosa) se ne va tutto.
//
// Lo script tocca casa dell'utente, temporanei e registro di sistema: qui gira
// con `HOME`, `TMP` e `APPDATA` in una cartella di prova e con
// `REGISTRO_SENZA_PULIZIA_WINDOWS`, che gli fa saltare PowerShell.

import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, describe, it } from 'node:test'

const SCRIPT = fileURLToPath(new URL('../../cli/uninstall.mjs', import.meta.url))

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-disinstalla-'))
after(() => rmSync(radice, { recursive: true, force: true }))

let giro = 0

/** Una cartella dei dati con un po' di tutto, come la lascia un registro usato. */
function cartellaUsata () {
  const casa = percorso.join(radice, `casa-${++giro}`)
  const dati = percorso.join(casa, 'Regiklass')
  for (const cartella of ['modelli-linguistici', 'dettatura', 'lettura', 'interfaccia', 'Local Storage', 'bin', 'tasselli']) {
    mkdirSync(percorso.join(dati, cartella), { recursive: true })
    writeFileSync(percorso.join(dati, cartella, 'dentro'), '')
  }
  for (const file of ['segreti.json', 'Local State', 'impostazioni.json', 'documenti.json', 'finestre.json', 'lockfile']) {
    writeFileSync(percorso.join(dati, file), '{}')
  }
  mkdirSync(percorso.join(casa, 'tmp'))
  return { casa, dati }
}

// `SystemRoot` resta: senza, Node su Windows muore all'avvio
// (`ncrypto::CSPRNG`). PowerShell sul registro di sistema dell'utente lo
// spegne la variabile, e ogni giro risparmia mezzo secondo.

/** Un giro dello script; le prove girano insieme, ognuna con la sua casa. */
async function disinstalla (casa, dati, ...altri) {
  const env = {
    ...process.env,
    REGISTRO_SENZA_PULIZIA_WINDOWS: '1',
    HOME: casa,
    USERPROFILE: casa,
    APPDATA: casa,
    LOCALAPPDATA: percorso.join(casa, 'localappdata'),
    XDG_CONFIG_HOME: casa,
    TMP: percorso.join(casa, 'tmp'),
    TEMP: percorso.join(casa, 'tmp'),
    TMPDIR: percorso.join(casa, 'tmp'),
  }
  const esito = await new Promise((risolvi) => {
    execFile(process.execPath, [SCRIPT, '--dati', dati, ...altri], { encoding: 'utf8', env }, (errore, _uscita, stderr) => {
      risolvi({ status: errore ? (errore.code ?? 1) : 0, stderr })
    })
  })
  assert.equal(esito.status, 0, esito.stderr)
}

describe('uninstall.mjs --tieni', { concurrency: true }, () => {
  it('senza --tieni toglie la cartella dei dati intera', async () => {
    const { casa, dati } = cartellaUsata()
    await disinstalla(casa, dati)
    assert.equal(existsSync(dati), false)
  })

  it('tiene i gruppi scelti e toglie tutto il resto', async () => {
    const { casa, dati } = cartellaUsata()
    await disinstalla(casa, dati, '--tieni', 'modelli,impostazioni')
    assert.deepEqual(readdirSync(dati).sort(), [
      'documenti.json', 'dettatura', 'finestre.json', 'impostazioni.json',
      'interfaccia', 'lettura', 'modelli-linguistici',
    ].sort())
  })

  it("l'account porta con sé la chiave che cifra i segreti", async () => {
    const { casa, dati } = cartellaUsata()
    await disinstalla(casa, dati, '--tieni', 'account')
    assert.deepEqual(readdirSync(dati).sort(), ['Local State', 'segreti.json'])
  })

  it('un gruppo sconosciuto non tiene niente', async () => {
    const { casa, dati } = cartellaUsata()
    await disinstalla(casa, dati, '--tieni', 'altro')
    assert.equal(existsSync(dati), false)
  })

  it('toglie anche la cartella col nome precedente, se non è stata rinominata', async () => {
    const { casa, dati } = cartellaUsata()
    const precedente = percorso.join(casa, 'Regiclass')
    mkdirSync(percorso.join(precedente, 'modelli-linguistici'), { recursive: true })
    writeFileSync(percorso.join(precedente, 'impostazioni.json'), '{}')
    await disinstalla(casa, dati, '--tieni', 'modelli')
    assert.deepEqual(readdirSync(precedente), ['modelli-linguistici'])
    await disinstalla(casa, dati)
    assert.equal(existsSync(precedente), false)
  })

  it('toglie la cartella di cache di electron-updater in LOCALAPPDATA', async () => {
    const { casa, dati } = cartellaUsata()
    const updaterCache = percorso.join(casa, 'localappdata', 'regiklass-updater')
    mkdirSync(updaterCache, { recursive: true })
    writeFileSync(percorso.join(updaterCache, 'pending-update.exe'), '')
    await disinstalla(casa, dati)
    assert.equal(existsSync(updaterCache), false)
  })

  it('toglie le copie da aprire dei file dell’anno in LOCALAPPDATA', async () => {
    const { casa, dati } = cartellaUsata()
    const copie = percorso.join(casa, 'localappdata', 'Regiklass', 'materializzati', 'anno')
    mkdirSync(copie, { recursive: true })
    writeFileSync(percorso.join(copie, 'verifica.pdf'), '%PDF')
    await disinstalla(casa, dati)
    assert.equal(existsSync(percorso.join(casa, 'localappdata', 'Regiklass')), false)
  })
})
