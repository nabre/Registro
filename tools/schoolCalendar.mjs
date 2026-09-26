// Aggiorna il calendario scolastico ufficiale che il registro porta con sé.
//
//   npm run calendario            scarica i PDF, rilegge, rigenera
//   npm run calendario -- --solo-genera   rigenera il .ts dal JSON, senza rete
//
// 1. Si scaricano dal sito del DECS i PDF degli anni vicini (da due anni fa a
//    quattro avanti) e `calendario/estrai_calendario_ticino.py` ne ricava date
//    e chiusure.
// 2. Il risultato si fonde con `resources/calendario-scolastico-ticino.json`:
//    gli anni riletti sostituiscono i loro, quelli non più pubblicati restano
//    (un registro vecchio deve ancora confrontarsi).
// 3. Dal JSON nasce `src/data/schoolCalendarTicino.ts`, che viaggia nel
//    pacchetto; `npm test` controlla che i due siano d'accordo.
//
// Lo lancia `npm run package`. Senza rete, Python o `pdftotext` avvisa e tiene
// il JSON che c'è.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { RADICE } from './common.mjs'

export const FILE_JSON = join(RADICE, 'resources', 'calendario-scolastico-ticino.json')
export const FILE_GENERATO = join(RADICE, 'src', 'data', 'schoolCalendarTicino.ts')
const SCRIPT = join(RADICE, 'tools', 'calendario', 'estrai_calendario_ticino.py')
const BASE = 'https://www4.ti.ch/fileadmin/DECS/calendario_scolastico/Calendario_scolastico_'

const TESTATA = `// Il calendario scolastico ufficiale del Cantone Ticino, come il registro lo
// porta con sé: inizio e fine delle lezioni, vacanze e festivi, anno per anno.
//
// Generato da \`resources/calendario-scolastico-ticino.json\` con
// \`npm run calendario\`, a ogni versione: non si scrive a mano. Che i due siano
// d'accordo lo controlla \`npm test\`. Il confronto con l'anno del registro sta
// in \`domain/schoolCalendar.ts\`.

import type { CalendarioUfficiale } from '../domain/schoolCalendar.js'

export const CALENDARIO_TICINO: CalendarioUfficiale = `

/** Il file TypeScript che nasce dal JSON: solo i campi che il registro legge. */
export function componiFile (dati = JSON.parse(readFileSync(FILE_JSON, 'utf8'))) {
  const essenziale = {
    cantone: dati.cantone,
    cantoneNome: dati.cantoneNome,
    fonte: dati.fonte,
    estrattoIl: dati.estrattoIl,
    anni: dati.anni,
  }
  return `${TESTATA}${JSON.stringify(essenziale, null, 2)}\n`
}

/** Gli indirizzi possibili del PDF di un anno: il DECS usa ora «_», ora «-». */
function indirizzi (primo) {
  return [`${BASE}${primo}_${primo + 1}.pdf`, `${BASE}${primo}-${primo + 1}.pdf`]
}

/**
 * Il PDF di un anno, scaricato in `cartella`, o `null` se il sito non lo ha. Lo
 * scarica Node: il sito del DECS chiude la connessione all'`urllib` di Python.
 */
async function scarica (primo, cartella) {
  for (const url of indirizzi(primo)) {
    try {
      const risposta = await fetch(url, { signal: AbortSignal.timeout(30000) })
      if (!risposta.ok) continue
      const file = join(cartella, url.slice(url.lastIndexOf('/') + 1))
      writeFileSync(file, Buffer.from(await risposta.arrayBuffer()))
      return { url, file }
    } catch {
      // Niente rete o sito giù: vale come «non c'è», e decide chi chiama.
    }
  }
  return null
}

/** Python, con il nome che ha su questa macchina. */
function python () {
  for (const nome of [process.env.PYTHON, 'python3', 'python'].filter(Boolean)) {
    try {
      execFileSync(nome, ['--version'], { stdio: 'ignore' })
      return nome
    } catch {
      // Il prossimo.
    }
  }
  return null
}

/** Gli anni riletti dai PDF, o `null` se non si è potuto. */
async function rileggi () {
  const eseguibile = python()
  if (!eseguibile) {
    console.warn('Calendario: Python non trovato (o PYTHON=…). Resta il JSON che c’è.')
    return null
  }
  const oggi = new Date()
  const corrente = oggi.getMonth() >= 7 ? oggi.getFullYear() : oggi.getFullYear() - 1
  const cartella = mkdtempSync(join(tmpdir(), 'registro-calendario-'))
  try {
    const scaricati = []
    for (let primo = corrente - 2; primo <= corrente + 4; primo += 1) {
      const pdf = await scarica(primo, cartella)
      if (pdf) scaricati.push(pdf)
    }
    if (scaricati.length === 0) {
      console.warn('Calendario: nessun PDF raggiungibile sul sito del DECS (rete?). Resta il JSON che c’è.')
      return null
    }
    const uscita = join(cartella, 'calendario.json')
    execFileSync(eseguibile, [SCRIPT, ...scaricati.map((pdf) => pdf.file), '--json', uscita], {
      stdio: ['ignore', 'ignore', 'inherit'],
    })
    const dati = JSON.parse(readFileSync(uscita, 'utf8'))
    // La fonte di ogni anno è l'indirizzo del PDF, non il file temporaneo.
    for (const anno of dati.anni) {
      const pdf = scaricati.find((p) => p.file.endsWith(anno.fonte))
      if (pdf) anno.fonte = pdf.url
    }
    return dati
  } catch (errore) {
    console.warn(`Calendario: lo script non è andato in porto (${errore.message}). Resta il JSON che c’è.`)
    return null
  } finally {
    rmSync(cartella, { recursive: true, force: true })
  }
}

/**
 * Il JSON di prima con gli anni riletti al posto dei loro. `estrattoIl` cambia
 * solo se cambia qualcosa, per non sporcare il repository a ogni versione.
 */
export function fondi (prima, riletto) {
  const perAnno = new Map(prima.anni.map((anno) => [anno.annoScolastico, anno]))
  for (const anno of riletto.anni) {
    if (!anno.annoScolastico) continue
    perAnno.set(anno.annoScolastico, anno)
  }
  const anni = [...perAnno.values()]
    .sort((a, b) => a.annoScolastico.localeCompare(b.annoScolastico))
  const uguali = JSON.stringify(anni) === JSON.stringify(prima.anni)
  return {
    ...prima,
    ...riletto,
    // Le note scritte a mano nel JSON restano: lo script conosce solo le sue.
    note: prima.note ?? riletto.note,
    estrattoIl: uguali ? prima.estrattoIl : riletto.estrattoIl,
    anni,
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const prima = existsSync(FILE_JSON) ? JSON.parse(readFileSync(FILE_JSON, 'utf8')) : { anni: [] }
  let dati = prima
  if (!process.argv.includes('--solo-genera')) {
    const riletto = await rileggi()
    if (riletto) {
      dati = fondi(prima, riletto)
      writeFileSync(FILE_JSON, `${JSON.stringify(dati, null, 2)}\n`, 'utf8')
    }
  }
  writeFileSync(FILE_GENERATO, componiFile(dati), 'utf8')
  console.log(
    `Calendario scolastico: ${dati.anni.map((a) => a.annoScolastico).join(', ')} ` +
      `(estratto il ${dati.estrattoIl}).`,
  )
}
