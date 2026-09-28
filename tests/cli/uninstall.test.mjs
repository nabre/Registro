// La disinstallazione: `cli/disinstalla.mjs` lanciato come lo lanciano il
// disinstallatore di Windows e la voce «Disinstalla…». Con `--tieni` restano
// modelli, account o impostazioni scelti e il resto della cartella dei dati se
// ne va; senza (disinstallazione silenziosa) se ne va tutto.
//
// Lo script tocca casa dell'utente, temporanei e registro di sistema: qui gira
// con `HOME`, `TMP` e `APPDATA` in una cartella di prova e con `SystemRoot`
// vuota, che gli fa saltare PowerShell.

import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, describe, it } from 'node:test'

const SCRIPT = fileURLToPath(new URL('../../cli/disinstalla.mjs', import.meta.url))

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

// Su Windows la chiave è `SYSTEMROOT` (le maiuscole non contano) e, se manca,
// libuv la rimette nell'ambiente del figlio: va tolta in ogni grafia e
// lasciata vuota. Altrimenti lo script lancia davvero PowerShell sul registro
// di sistema dell'utente, e ogni giro costa mezzo secondo.
const AMBIENTE = Object.fromEntries(
  Object.entries(process.env).filter(([nome]) => nome.toLowerCase() !== 'systemroot'),
)

/** Un giro dello script; le prove girano insieme, ognuna con la sua casa. */
async function disinstalla (casa, dati, ...altri) {
  const env = {
    ...AMBIENTE,
    SystemRoot: '',
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

describe('disinstalla.mjs --tieni', { concurrency: true }, () => {
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
    const precedente = percorso.join(casa, 'Registro docenti')
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
})
