// L'aggiornamento senza procedura guidata, dal lato del registro. La finestra
// che installa (`os/windows/aggiornamento.ps1`, WPF) si prova a mano; qui le
// decisioni del registro:
//
//   - riaprendosi, se partire o aspettare che la finestra finisca;
//   - se l'aggiornamento è riuscito, e se dirlo con una notifica;
//   - come si legge quel che scrive PowerShell, BOM compreso;
//   - con che argomenti si lancia la finestra;
//   - il tetto all'intervallo fra i controlli.
//
// E due controlli sullo script: il BOM in testa (senza, PowerShell 5.1 legge
// gli accenti con la codepage di sistema) e i colori di `theme.css`.

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

process.env.REGISTRO_USERDATA = mkdtempSync(percorso.join(tmpdir(), 'registro-aggiornamento-prove-'))

const { argomentiAiutante, decidiAllAvvio, leggiSegno, leggiStatoAiutante, PREFISSO_LAVORO } =
  await import('../../dist-tests/updateInstaller.mjs')

const RADICE = fileURLToPath(new URL('../..', import.meta.url))
const SCRIPT = percorso.join(RADICE, 'os', 'windows', 'aggiornamento.ps1')

const ADESSO = Date.parse('2026-09-24T10:00:00Z')
const segno = (piu = {}) => ({
  da: '1.3.1',
  a: '1.4.0',
  lavoro: 'C:\\Temp\\registro-aggiornamento-1',
  pid: 4242,
  quando: new Date(ADESSO - 60_000).toISOString(),
  ...piu,
})

describe('riaprendosi dopo un aggiornamento', () => {
  it('senza segno non c’è niente da concludere', () => {
    assert.equal(decidiAllAvvio(null, '1.4.0', { vivo: false, fase: null }, ADESSO), 'nessuno')
  })

  it('con la finestra ancora al lavoro sui file, aspetta', () => {
    for (const fase of ['pronto', 'chiusura', 'installazione']) {
      assert.equal(decidiAllAvvio(segno(), '1.3.1', { vivo: true, fase }, ADESSO), 'attendi', fase)
    }
  })

  it('con la finestra che lo sta riaprendo, parte', () => {
    assert.equal(
      decidiAllAvvio(segno(), '1.4.0', { vivo: true, fase: 'riapertura' }, ADESSO),
      'riuscito',
    )
  })

  it('un segno vecchio non ferma niente: il numero di processo può essere di un altro', () => {
    const vecchio = segno({ quando: new Date(ADESSO - 2 * 3_600_000).toISOString() })
    assert.equal(decidiAllAvvio(vecchio, '1.3.1', { vivo: true, fase: 'installazione' }, ADESSO), 'fallito')
  })

  it('una finestra morta a metà non tiene il registro chiuso', () => {
    assert.equal(
      decidiAllAvvio(segno(), '1.3.1', { vivo: false, fase: 'installazione' }, ADESSO),
      'fallito',
    )
  })

  it('riconosce la versione nuova e quella vecchia, e ignora le altre', () => {
    const ferma = { vivo: false, fase: 'fatto' }
    assert.equal(decidiAllAvvio(segno(), '1.4.0', ferma, ADESSO), 'riuscito')
    assert.equal(decidiAllAvvio(segno(), '1.3.1', ferma, ADESSO), 'fallito')
    assert.equal(decidiAllAvvio(segno(), '2.0.0', ferma, ADESSO), 'nessuno')
  })

  it('un segno dal futuro — l’orologio spostato — non tiene il registro chiuso', () => {
    const futuro = segno({ quando: new Date(ADESSO + 3_600_000).toISOString() })
    assert.equal(decidiAllAvvio(futuro, '1.3.1', { vivo: true, fase: 'installazione' }, ADESSO), 'fallito')
  })
})

describe('quel che scrive la finestra', () => {
  it('legge lo stato anche con il BOM davanti', () => {
    assert.deepEqual(leggiStatoAiutante('\uFEFF{"fase":"pronto","pid":7}'), { fase: 'pronto', pid: 7 })
  })

  it('uno stato tronco o senza fase non è uno stato', () => {
    assert.equal(leggiStatoAiutante('{"fase":'), null)
    assert.equal(leggiStatoAiutante('{"pid":7}'), null)
  })

  it('il segno vuole tutti i campi', () => {
    assert.deepEqual(leggiSegno(JSON.stringify(segno())), segno())
    const { pid: _pid, ...senzaPid } = segno()
    assert.equal(leggiSegno(JSON.stringify(senzaPid)), null)
    assert.equal(leggiSegno('non è json'), null)
  })
})

describe('il lancio della finestra', () => {
  it('passa lo script e i parametri in coda, con il criterio aperto solo per sé', () => {
    const argomenti = argomentiAiutante('C:\\T\\a b\\aggiornamento.ps1', 'C:\\T\\a b\\parametri.json')
    assert.deepEqual(argomenti.slice(-4), [
      '-File', 'C:\\T\\a b\\aggiornamento.ps1', '-Parametri', 'C:\\T\\a b\\parametri.json',
    ])
    assert.ok(argomenti.includes('-STA'))
    assert.ok(argomenti.includes('-NoProfile'))
    assert.equal(argomenti[argomenti.indexOf('-ExecutionPolicy') + 1], 'Bypass')
  })

  it('le cartelle di lavoro hanno il prefisso che la disinstallazione toglie', () => {
    const disinstalla = readFileSync(percorso.join(RADICE, 'src', 'cli', 'disinstalla.mjs'), 'utf8')
    assert.ok(disinstalla.includes(`'${PREFISSO_LAVORO}'`))
  })
})

describe('lo script della finestra', () => {
  const byte = readFileSync(SCRIPT)
  const testo = byte.toString('utf8')

  it('comincia con il BOM', () => {
    assert.deepEqual([...byte.subarray(0, 3)], [0xef, 0xbb, 0xbf])
  })

  it('non chiude una stringa con un apostrofo tipografico', () => {
    // PowerShell prende ‘ e ’ per apici: in una stringa fra apici semplici la
    // chiuderebbero.
    const sbagliate = testo.split('\n')
      .map((riga, i) => ({ riga, n: i + 1 }))
      .filter(({ riga }) => !riga.trim().startsWith('#'))
      .filter(({ riga }) => /'[^'\n]*[\u2018\u2019][^'\n]*'/.test(riga))
    assert.deepEqual(sbagliate, [])
  })

  it('ha i colori di theme.css, in tutti e due i temi', () => {
    const tema = readFileSync(percorso.join(RADICE, 'src', 'ui', 'styles', 'theme.css'), 'utf8')
    const scuroDa = tema.indexOf('prefers-color-scheme: dark')
    const valore = (nome, scuro) => {
      const parte = scuro ? tema.slice(scuroDa) : tema.slice(0, scuroDa)
      return new RegExp(`--${nome}:\\s*(#[0-9a-f]{6})`, 'i').exec(parte)?.[1].toLowerCase()
    }
    const tavolozza = (nome) => {
      const inizio = testo.indexOf(`${nome} = @{`)
      return testo.slice(inizio, testo.indexOf('\n  }', inizio)).toLowerCase()
    }
    const coppie = {
      Sfondo: 'sfondo', SfondoAlto: 'sfondo-alto', SfondoAlto2: 'sfondo-alto-2', Bordo: 'bordo',
      Testo: 'testo', Quieto: 'testo-quieto', Accento: 'accento', SuTinta: 'su-tinta',
      Positivo: 'positivo', Negativo: 'negativo', Fuoco: 'fuoco',
    }
    for (const [nomeTema, scuro] of [['chiaro', false], ['scuro', true]]) {
      const ps = tavolozza(nomeTema)
      for (const [chiave, token] of Object.entries(coppie)) {
        const atteso = valore(token, scuro)
        assert.ok(atteso, `--${token} non trovato in theme.css`)
        assert.ok(
          ps.includes(`${chiave.toLowerCase()} = '${atteso}'`),
          `${nomeTema}: ${chiave} dovrebbe essere ${atteso}`,
        )
      }
    }
  })

  it('PowerShell lo legge senza errori di sintassi', { skip: process.platform !== 'win32' }, () => {
    const powershell = percorso.join(
      process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe',
    )
    const comando =
      '$e = $null; $t = $null; ' +
      `[void][System.Management.Automation.Language.Parser]::ParseFile('${SCRIPT.replace(/'/g, "''")}', [ref]$t, [ref]$e); ` +
      '$e | ForEach-Object { "$($_.Extent.StartLineNumber): $($_.Message)" }'
    const uscita = execFileSync(powershell, ['-NoProfile', '-NonInteractive', '-Command', comando], {
      encoding: 'utf8',
    }).trim()
    assert.equal(uscita, '')
  })
})
