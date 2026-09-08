// Mette in ~/.vscode/extensions una giunzione verso questa cartella: VS Code
// carica il codice sorgente di qui invece di una copia impacchettata, così una
// modifica si vede con un semplice "Ricarica finestra".
//
// Il nome della giunzione deve essere `editore.nome-versione`, come per le
// estensioni installate davvero: VS Code ricostruisce la cache `extensions.json`
// leggendo quella cartella, e una che non segue la convenzione finisce marcata
// in `.obsolete` e smette di essere caricata senza dire niente.
//
// Idempotente: se il collegamento c'è già e punta qui, non fa nulla.
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const sorgente = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifesto = JSON.parse(readFileSync(join(sorgente, 'package.json'), 'utf8'))
const identificatore = `${manifesto.publisher}.${manifesto.name}`
const cartellaEstensioni = join(homedir(), '.vscode', 'extensions')
const destinazione = join(cartellaEstensioni, `${identificatore}-${manifesto.version}`)

mkdirSync(cartellaEstensioni, { recursive: true })

/** Giunzioni di versioni precedenti — e quella senza versione, di quando il nome era sbagliato. */
function ripulisciVecchie () {
  const candidati = [join(cartellaEstensioni, identificatore)]
  for (const candidato of candidati) {
    if (candidato === destinazione || !existsSync(candidato)) continue
    if (!lstatSync(candidato).isSymbolicLink()) continue
    rmSync(candidato, { force: true })
    console.log(`registro: rimosso il vecchio collegamento ${candidato}`)
  }
}

/**
 * `.obsolete` è la lista delle cartelle che VS Code considera da buttare. Se ci
 * finisce la nostra, l'estensione resta sul disco ma non viene più caricata:
 * si toglie, altrimenti il collegamento nuovo nasce già morto.
 */
function sbloccaObsolete () {
  const file = join(cartellaEstensioni, '.obsolete')
  if (!existsSync(file)) return
  let elenco
  try {
    elenco = JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return
  }
  const nostre = Object.keys(elenco).filter((chiave) => chiave.startsWith(`${identificatore}-`))
  if (nostre.length === 0) return
  for (const chiave of nostre) delete elenco[chiave]
  writeFileSync(file, JSON.stringify(elenco))
  console.log(`registro: tolte da .obsolete ${nostre.join(', ')}`)
}

ripulisciVecchie()
sbloccaObsolete()

if (existsSync(destinazione)) {
  const stato = lstatSync(destinazione)
  if (stato.isSymbolicLink()) {
    if (resolve(readlinkSync(destinazione)) === sorgente) {
      console.log(`registro: collegamento già presente -> ${destinazione}`)
      process.exit(0)
    }
    rmSync(destinazione, { force: true })
  } else {
    console.error(`registro: ${destinazione} esiste e non è un collegamento; rimuoverlo a mano.`)
    process.exit(1)
  }
}

try {
  // "junction" è l'unico tipo che su Windows non richiede privilegi elevati.
  symlinkSync(sorgente, destinazione, process.platform === 'win32' ? 'junction' : 'dir')
  console.log(`registro: collegato ${destinazione} -> ${sorgente}`)
} catch (errore) {
  console.error(`registro: collegamento non riuscito (${errore.message})`)
  process.exit(1)
}
