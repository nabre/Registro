// La copertura delle prove di `node --test`, riportata sui sorgenti. `npm run copertura`.
//
//   1. ricostruisce `dist-tests/` con le mappe inline (`esbuild.mjs --test --copertura`);
//   2. esegue le prove con `NODE_V8_COVERAGE`: ogni processo lascia i conteggi
//      grezzi di V8 e le mappe dei file caricati; `REGISTRO_COPERTURA=1` dà una
//      mappa anche ai moduli di `importaSorgente` (`tests/helpers/sorgente.mjs`);
//   3. riporta i conteggi sui sorgenti di `core/`, `contract/`, `desktop/`,
//      `ui/`, `cli/`, scrive `copertura/lcov.info` e `copertura/riassunto.txt`
//      e stampa il riassunto per cartella;
//   4. ricostruisce `dist-tests/` senza mappe, com'era: `npm test` non cambia.
//
// È un rapporto, non una soglia. Un file che nessuna prova carica non compare,
// invece di comparire a zero.
//
// Perché il riporto è fatto qui. `--experimental-test-coverage` rimappa i
// bundle, ma unisce male lo stesso `.ts` presente in più bundle e più
// processi: aggiungendo prove le percentuali scendevano. `c8` (per `npx`,
// versioni 10 e 12) su questi bundle dava le righe al 100% e quasi nessuna
// funzione. Qui un conteggio si legge sempre nel bundle e nel processo che lo
// ha prodotto, e solo dopo si porta sul sorgente.

import { spawnSync } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { RADICE } from './common.mjs'

/** Le cartelle dei sorgenti: il resto (`tools/`, i finti, le prove) sta fuori dal rapporto. */
const STRATI = ['core', 'contract', 'desktop', 'ui', 'cli']

const USCITA = join(RADICE, 'copertura')
const GREZZI = join(USCITA, 'v8')

/** `node` con questi argomenti nella radice; l'uscita va sul terminale. */
function node (argomenti, env = {}) {
  const esito = spawnSync(process.execPath, argomenti, {
    cwd: RADICE,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  })
  return esito.status ?? 1
}

/** Il percorso dalla radice con le barre dritte, o `null` se il file non è di uno strato. */
function sorgenteDelProgetto (url) {
  if (!url?.startsWith('file:')) return null
  const percorso = relative(RADICE, fileURLToPath(url)).split(/[\\/]+/).join('/')
  if (!STRATI.includes(percorso.split('/')[0]) || percorso.endsWith('.d.ts')) return null
  return percorso
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/**
 * I segmenti di una mappa v3, in ordine di posizione generata:
 * `[riga generata, colonna generata, indice del sorgente, riga, colonna]`, da zero.
 */
function segmenti (mappings) {
  const fuori = []
  let sorgente = 0
  let riga = 0
  let colonna = 0
  mappings.split(';').forEach((linea, rigaGenerata) => {
    let colonnaGenerata = 0
    for (const pezzo of linea.split(',')) {
      if (pezzo === '') continue
      const campi = []
      let valore = 0
      let spostamento = 0
      for (const carattere of pezzo) {
        const cifra = BASE64.indexOf(carattere)
        valore += (cifra & 31) << spostamento
        if (cifra & 32) {
          spostamento += 5
          continue
        }
        campi.push(valore & 1 ? -(valore >>> 1) : valore >>> 1)
        valore = 0
        spostamento = 0
      }
      colonnaGenerata += campi[0]
      if (campi.length < 4) continue
      sorgente += campi[1]
      riga += campi[2]
      colonna += campi[3]
      fuori.push([rigaGenerata, colonnaGenerata, sorgente, riga, colonna])
    }
  })
  return fuori
}

/**
 * Il conteggio in ogni punto (ordinato) di uno script: quello dell'intervallo
 * più interno che lo contiene. V8 annida gli intervalli e omette un blocco
 * quando conta come il suo contenitore, quindi il più interno è il vero.
 */
function conteggiNeiPunti (funzioni, punti) {
  const intervalli = funzioni.flatMap((f) => f.ranges)
    .sort((a, b) => a.startOffset - b.startOffset || b.endOffset - a.endOffset)
  const pila = []
  const conteggi = new Array(punti.length)
  let prossimo = 0
  punti.forEach((punto, i) => {
    while (prossimo < intervalli.length && intervalli[prossimo].startOffset <= punto) {
      const nuovo = intervalli[prossimo++]
      while (pila.length && pila.at(-1).endOffset <= nuovo.startOffset) pila.pop()
      pila.push(nuovo)
    }
    while (pila.length && pila.at(-1).endOffset <= punto) pila.pop()
    conteggi[i] = pila.at(-1)?.count ?? 0
  })
  return conteggi
}

/**
 * Uno script così come si riporta sui sorgenti: i segmenti che cadono in uno
 * strato, con la loro posizione nello script. Senza mappa (i `.mjs` di `cli/`)
 * ogni riga non vuota è un segmento su sé stessa.
 */
function preparaScript (url, mappa) {
  if (mappa?.data) {
    const inizi = [0]
    for (const lunghezza of mappa.lineLengths) inizi.push(inizi.at(-1) + lunghezza + 1)
    const sorgenti = mappa.data.sources.map(sorgenteDelProgetto)
    if (!sorgenti.some(Boolean)) return null
    const tenuti = segmenti(mappa.data.mappings)
      .filter((s) => sorgenti[s[2]])
      .map(([rg, cg, si, riga, colonna]) => ({
        punto: inizi[rg] + cg, file: sorgenti[si], riga, colonna,
      }))
    return { segmenti: tenuti, inizi }
  }
  const file = sorgenteDelProgetto(url)
  if (!file) return null
  const inizi = [0]
  const tenuti = []
  readFileSync(fileURLToPath(url), 'utf8').split('\n').forEach((testo, riga) => {
    const colonna = testo.search(/\S/)
    if (colonna >= 0 && !/^\s*(\/\/|\/\*|\*)/.test(testo)) tenuti.push({ punto: inizi[riga] + colonna, file, riga, colonna })
    inizi.push(inizi[riga] + testo.length + 1)
  })
  return { segmenti: tenuti, inizi }
}

/** L'indice dell'ultimo elemento di `ordinati` che non supera `valore` (-1 se nessuno). */
function ultimoFinoA (ordinati, valore, chiave = (x) => x) {
  let basso = 0
  let alto = ordinati.length - 1
  while (basso <= alto) {
    const medio = (basso + alto) >> 1
    if (chiave(ordinati[medio]) <= valore) basso = medio + 1
    else alto = medio - 1
  }
  return alto
}

/**
 * Il segmento che copre `punto`: l'ultimo che comincia prima, sulla stessa
 * riga generata. Più indietro sarebbe di un'altra istruzione, o di un altro file.
 */
function segmentoIn (script, punto) {
  const trovato = script.segmenti[ultimoFinoA(script.segmenti, punto, (g) => g.punto)]
  if (!trovato) return null
  const stessaRiga = ultimoFinoA(script.inizi, trovato.punto) === ultimoFinoA(script.inizi, punto)
  return stessaRiga ? trovato : null
}

/** Somma i conteggi di un file: riga → volte, funzione e ramo → eseguito sì o no. */
function registra (conti, file) {
  if (!conti.has(file)) conti.set(file, { righe: new Map(), funzioni: new Map(), rami: new Map() })
  return conti.get(file)
}

function riporta () {
  // Primo giro: ogni script con i punti di funzioni e rami visti in qualunque
  // processo, perché un blocco omesso in un processo conta come il contenitore.
  const letture = readdirSync(GREZZI).map((nome) => JSON.parse(readFileSync(join(GREZZI, nome), 'utf8')))
  const script = new Map()
  for (const lettura of letture) {
    for (const { url, functions } of lettura.result) {
      if (!script.has(url)) script.set(url, preparaScript(url, lettura['source-map-cache']?.[url]))
      const s = script.get(url)
      if (!s) continue
      s.funzioni ??= new Set()
      s.rami ??= new Set()
      for (const f of functions) {
        const [primo, ...blocchi] = f.ranges
        // Il modulo intero, che parte da zero, non è una funzione di nessuno.
        if (primo.startOffset > 0) s.funzioni.add(primo.startOffset)
        for (const b of blocchi) s.rami.add(b.startOffset)
      }
    }
  }
  // Secondo giro: in ogni processo, il conteggio di ogni punto dello script.
  const conti = new Map()
  for (const lettura of letture) {
    for (const { url, functions } of lettura.result) {
      const s = script.get(url)
      if (!s) continue
      const funzioni = [...s.funzioni].sort((a, b) => a - b)
      const rami = [...s.rami].sort((a, b) => a - b)
      const punti = s.segmenti.map((g) => g.punto)
      const conteggi = conteggiNeiPunti(functions, punti)
      s.segmenti.forEach((g, i) => {
        const righe = registra(conti, g.file).righe
        righe.set(g.riga, Math.max(righe.get(g.riga) ?? 0, conteggi[i]))
      })
      for (const [chi, punti] of [['funzioni', funzioni], ['rami', rami]]) {
        const volte = conteggiNeiPunti(functions, punti)
        punti.forEach((punto, i) => {
          const g = segmentoIn(s, punto)
          if (!g) return
          const dove = registra(conti, g.file)[chi]
          const chiave = `${g.riga}:${g.colonna}`
          dove.set(chiave, dove.get(chiave) || volte[i] > 0)
        })
      }
    }
  }
  return conti
}

function lcov (conti) {
  const righe = []
  for (const file of [...conti.keys()].sort()) {
    const c = conti.get(file)
    righe.push('TN:', `SF:${file}`)
    const numeri = [...c.righe.keys()].sort((a, b) => a - b)
    for (const n of numeri) righe.push(`DA:${n + 1},${c.righe.get(n)}`)
    const valori = (m) => [...m.values()]
    righe.push(
      `FNF:${c.funzioni.size}`, `FNH:${valori(c.funzioni).filter(Boolean).length}`,
      `BRF:${c.rami.size}`, `BRH:${valori(c.rami).filter(Boolean).length}`,
      `LF:${numeri.length}`, `LH:${valori(c.righe).filter((v) => v > 0).length}`,
      'end_of_record',
    )
  }
  return `${righe.join('\n')}\n`
}

/** La cartella del riassunto: due livelli (`core/dominio`), o lo strato se il file sta lì. */
function gruppo (file) {
  const parti = file.split('/')
  return parti.length > 2 ? parti.slice(0, 2).join('/') : parti[0]
}

const percento = (fatti, tutti) => (tutti === 0 ? '-' : (100 * fatti / tutti).toFixed(1)).padStart(6)

function riassunto (conti) {
  const vuoto = () => ({ file: 0, lf: 0, lh: 0, fnf: 0, fnh: 0, brf: 0, brh: 0 })
  const gruppi = new Map()
  const totale = vuoto()
  for (const [file, c] of conti) {
    if (!gruppi.has(gruppo(file))) gruppi.set(gruppo(file), vuoto())
    for (const g of [gruppi.get(gruppo(file)), totale]) {
      g.file += 1
      g.lf += c.righe.size
      g.lh += [...c.righe.values()].filter((v) => v > 0).length
      g.fnf += c.funzioni.size
      g.fnh += [...c.funzioni.values()].filter(Boolean).length
      g.brf += c.rami.size
      g.brh += [...c.rami.values()].filter(Boolean).length
    }
  }
  const larghezza = Math.max(8, ...[...gruppi.keys()].map((n) => n.length))
  const riga = (nome, g) =>
    `${nome.padEnd(larghezza)} ${String(g.file).padStart(5)} ${percento(g.lh, g.lf)} ${percento(g.fnh, g.fnf)} ${percento(g.brh, g.brf)}`
  return [
    `${'cartella'.padEnd(larghezza)}  file  righe  funz.   rami`,
    ...[...gruppi.keys()].sort().map((nome) => riga(nome, gruppi.get(nome))),
    riga('totale', totale),
  ].join('\n')
}

rmSync(USCITA, { recursive: true, force: true })
mkdirSync(GREZZI, { recursive: true })
let codice = 1
try {
  codice = node(['esbuild.mjs', '--test', '--copertura'])
  if (codice === 0) {
    codice = node(
      ['--enable-source-maps', '--test', '--test-reporter=dot', 'tests/**/*.test.mjs'],
      { NODE_V8_COVERAGE: GREZZI, REGISTRO_COPERTURA: '1' },
    )
    const conti = riporta()
    const testo = riassunto(conti)
    writeFileSync(join(USCITA, 'lcov.info'), lcov(conti))
    writeFileSync(join(USCITA, 'riassunto.txt'), `${testo}\n`)
    console.log(`\n${testo}\n\nPer file: copertura/lcov.info. Come leggerlo: .claude/skills/verifica/SKILL.md`)
  }
} finally {
  // I grezzi pesano centinaia di mega; i moduli di `importaSorgente` servivano solo alla corsa.
  rmSync(GREZZI, { recursive: true, force: true })
  rmSync(join(USCITA, 'moduli'), { recursive: true, force: true })
  // I bundle di sempre, senza mappe: le prove lanciate dopo trovano quel che si aspettano.
  const ricostruzione = node(['esbuild.mjs', '--test'])
  if (codice === 0) codice = ricostruzione
}
process.exitCode = codice
