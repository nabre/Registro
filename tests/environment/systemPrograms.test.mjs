// I programmi di Windows si chiamano per percorso intero: `execFile('reg', …)`
// cerca **prima nella cartella di lavoro**, che per il registro aperto da un
// `.regi` è la cartella del documento (una chiavetta, una cartella condivisa).
// Il rimedio è `diSistema` in `src/environment/system.ts` (o
// `join(SystemRoot, 'System32', …)`). La prova legge `src/` e `shell/` e si
// ferma a:
//
//   1. una chiamata (`execFile`, `execFileSync`, `spawn`, `spawnSync`, `exec`,
//      `execSync`) con primo argomento una stringa senza separatore di
//      percorso che nomina un programma di Windows;
//   2. la stessa stringa altrove (`return ['rundll32.exe', …]`) fuori da un
//      `join(` o da un `diSistema(`.
//
// `open` e `xdg-open` no: su macOS e Linux un nome nudo si cerca solo nel PATH.
// Controllo di forma sul testo, come quelli di `tools/`; le righe di commento
// si saltano.

import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const RADICE = fileURLToPath(new URL('../..', import.meta.url))

/**
 * I programmi di Windows che il registro chiama, o che qualcuno chiamerebbe.
 *
 * Quelli di `ANCHE_PAROLE` sono anche parole comuni — `'timeout'` è il nome di
 * un evento dei socket — e si cercano solo come primo argomento di una
 * chiamata, o con l'estensione attaccata.
 */
const DI_WINDOWS = new Set([
  'reg', 'rundll32', 'powershell', 'pwsh', 'cmd', 'explorer', 'taskkill', 'tasklist', 'schtasks',
  'wmic', 'netsh', 'msiexec', 'mshta', 'cscript', 'wscript', 'certutil', 'icacls', 'setx', 'regsvr32',
])
const ANCHE_PAROLE = new Set(['where', 'attrib', 'shutdown', 'control', 'notepad', 'timeout', 'ping'])

/**
 * Vero se una stringa scritta nel codice nomina, così nuda, un programma di
 * Windows. `chiamata` dice se è il primo argomento di un `execFile` e simili.
 */
function nudoDiWindows (valore, chiamata) {
  if (/[\\/]/.test(valore)) return false
  const conEstensione = /\.(exe|com|cmd|bat)$/i.test(valore)
  const nome = valore.toLowerCase().replace(/\.(exe|com|cmd|bat)$/, '')
  return DI_WINDOWS.has(nome) || ((chiamata || conEstensione) && ANCHE_PAROLE.has(nome))
}

/** Vero se nel pezzo di riga prima della stringa resta aperto un `join(` o un `diSistema(`. */
function dentroUnPercorso (prima) {
  const inizio = Math.max(prima.lastIndexOf('join('), prima.lastIndexOf('diSistema('))
  if (inizio < 0) return false
  let aperte = 0
  for (const carattere of prima.slice(inizio)) {
    if (carattere === '(') aperte += 1
    if (carattere === ')') aperte -= 1
  }
  return aperte > 0
}

const CHIAMATA = /\b(?:execFileSync|execFile|spawnSync|spawn|execSync|exec)\(\s*(['"`])([^'"`\n]*)\1/g
const STRINGA = /(['"`])([^'"`\n]*)\1/g

/**
 * I nomi nudi trovati in un sorgente, con la riga. Le righe di commento si
 * tolgono prima: al loro posto resta una riga vuota, così i numeri tornano.
 */
function nomiNudi (testo) {
  const righe = testo.split(/\r?\n/)
  const senzaCommenti = righe
    .map((riga) => (/^\s*(\/\/|\/\*|\*)/.test(riga) ? '' : riga))
    .join('\n')
  const trovati = []
  const rigaDi = (indice) => senzaCommenti.slice(0, indice).split('\n').length

  for (const corrispondenza of senzaCommenti.matchAll(CHIAMATA)) {
    if (nudoDiWindows(corrispondenza[2], true)) {
      // La riga della stringa, non quella della chiamata: possono essere due.
      const scarto = corrispondenza[0].lastIndexOf(corrispondenza[1] + corrispondenza[2])
      trovati.push({ riga: rigaDi(corrispondenza.index + scarto), nome: corrispondenza[2] })
    }
  }
  for (const [numero, riga] of senzaCommenti.split('\n').entries()) {
    for (const corrispondenza of riga.matchAll(STRINGA)) {
      if (!nudoDiWindows(corrispondenza[2], false)) continue
      if (dentroUnPercorso(riga.slice(0, corrispondenza.index))) continue
      if (trovati.some((t) => t.riga === numero + 1 && t.nome === corrispondenza[2])) continue
      trovati.push({ riga: numero + 1, nome: corrispondenza[2] })
    }
  }
  return trovati
}

/** I sorgenti di una cartella, ricorsivamente: TypeScript e JavaScript. */
function sorgenti (cartella) {
  const fuori = []
  for (const nome of readdirSync(cartella)) {
    const pieno = join(cartella, nome)
    if (statSync(pieno).isDirectory()) fuori.push(...sorgenti(pieno))
    else if (/\.(ts|mts|cts|js|mjs|cjs)$/.test(nome) && !nome.endsWith('.d.ts')) fuori.push(pieno)
  }
  return fuori
}

describe('programmi di sistema', () => {
  it('nessun programma di Windows chiamato per nome nudo in src/ e shell/', () => {
    const guasti = []
    for (const cartella of ['src', 'shell']) {
      for (const file of sorgenti(join(RADICE, cartella))) {
        for (const { riga, nome } of nomiNudi(readFileSync(file, 'utf8'))) {
          guasti.push(`${relative(RADICE, file).replace(/\\/g, '/')}:${riga} «${nome}»`)
        }
      }
    }
    assert.deepEqual(
      guasti,
      [],
      'Un programma di Windows per nome nudo si cerca prima nella cartella del documento: ' +
        'usa `diSistema(…)` (src/environment/system.ts) o `join(SystemRoot, \'System32\', …)`.',
    )
  })

  // Le forme che il controllo deve prendere: se una passa, il controllo sopra è
  // verde per il motivo sbagliato.
  it('prende le tre forme che c\'erano nel registro', () => {
    const tema = "    const uscita = execFileSync(\n      'reg',\n      ['query', 'HKCU'],\n    )"
    const outlook = "      execFile('reg', ['query', chiave, '/ve'], (errore, uscita) =>"
    const apertura = "    return ['rundll32.exe', ['url.dll,FileProtocolHandler', percorso]]"
    assert.deepEqual(nomiNudi(tema).map((t) => t.nome), ['reg'])
    assert.deepEqual(nomiNudi(outlook).map((t) => t.nome), ['reg'])
    assert.deepEqual(nomiNudi(apertura).map((t) => t.nome), ['rundll32.exe'])
  })

  it('lascia passare il percorso intero, i commenti e i programmi di macOS e Linux', () => {
    const buoni = [
      "execFile(diSistema('reg.exe'), ['query'])",
      "execFile(apparato.diSistema('reg.exe'), ['query'])",
      "const reg = join(windows, 'System32', 'reg.exe')",
      "execFile(join(windows, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'), [",
      "  // execFile('reg', …) cerca prima nella cartella corrente",
      "return process.platform === 'darwin' ? ['open', [percorso]] : ['xdg-open', [percorso]]",
      "spawn('open', ['-a', programma])",
    ]
    for (const riga of buoni) assert.deepEqual(nomiNudi(riga), [], riga)
  })
})
