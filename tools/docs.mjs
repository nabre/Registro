/**
 * Verifica che la documentazione nomini cose che esistono.
 *
 * Le cartelle e gli script sono passati all'inglese — `src/dominio` è diventato
 * `src/domain`, `npm run strati` è diventato `npm run layers` — e i documenti
 * sono rimasti a raccontare l'albero di prima. Un documento che rimanda a un
 * file che non c'è è peggio di uno che tace: chi lo segue perde tempo a cercare,
 * e chi lo scrive non se ne accorge mai, perché nessuna prova lo legge. Questo
 * script è quella prova.
 *
 * Guarda due cose, in `docs/*.md` e in `.claude/skills/**\/*.md`:
 *
 *   1. **Ogni `npm run X`** — anche dentro i blocchi di codice — deve essere uno
 *      script di `package.json`.
 *
 *   2. **Ogni percorso fra backtick** che comincia come un file del progetto
 *      (`src/`, `shell/`, `tests/`, `tools/`, `docs/`, `resources/`, …, e anche
 *      i vecchi nomi italiani, proprio per trovarli) deve esistere sul disco.
 *      I numeri di riga in coda (`:120`, `:12-30`) si tolgono; i modelli con
 *      dentro `*`, `<…>`, `{…}` o `…` non sono percorsi e si saltano.
 *
 * Quel che un documento cita apposta come storia — un nome vecchio in una
 * decisione, un file tolto di cui si racconta la fine — sta nelle deroghe qui
 * sotto, ognuna con il suo perché, oppure il file intero sta fra quelli esclusi
 * dal controllo dei percorsi. I nomi degli script si controllano sempre: una
 * storia non ha bisogno di un comando da lanciare.
 *
 * Non è un compilatore: legge il testo, come gli altri controlli di questa
 * cartella.
 *
 * Uso: `npm run docs`
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { daRadice, piano } from './common.mjs'

// ---------------------------------------------------------------- le deroghe

/**
 * I file che raccontano la storia del progetto: i nomi di allora ci stanno
 * apposta, e riscriverli al presente vorrebbe dire falsare il racconto. Per
 * loro si controllano gli script, non i percorsi.
 *
 * `CANTIERE.md` è il diario dei lavori: decine di citazioni di file tolti o
 * rinominati, ognuna vera il giorno in cui è stata scritta. `DECISIONI.md`
 * invece si controlla: le sue sezioni «Dove vive» dicono il presente.
 */
const SENZA_PERCORSI = new Set([
  'docs/CANTIERE.md',
])

/**
 * Le singole citazioni che non esistono e vanno bene così, con il motivo.
 * `file` è il documento, `percorso` è la citazione com'è scritta, tolti i
 * numeri di riga.
 */
const DEROGHE = [
  // { file: 'docs/X.md', percorso: 'src/…', perche: 'perché va bene così' },
]

/** Come comincia una citazione che vuole essere un file del progetto. */
const RADICI = [
  // I nomi di oggi.
  'src/', 'shell/', 'tests/', 'tools/', 'docs/', 'resources/', 'icons/', 'os/', 'templates/', '.claude/',
  // I nomi di prima: si guardano per trovarli, e se ci sono sono sbagliati.
  'guscio/', 'prove/', 'strumenti/', 'risorse/', 'icone/', 'modelli/',
]

// ------------------------------------------------------------------ i documenti

/** I documenti da leggere: `docs/*.md` e ogni `.md` sotto le skill. */
function documenti () {
  const trovati = []
  for (const voce of readdirSync('docs', { withFileTypes: true })) {
    if (voce.isFile() && voce.name.endsWith('.md')) trovati.push(join('docs', voce.name))
  }
  const sotto = (cartella) => {
    if (!existsSync(cartella)) return
    for (const voce of readdirSync(cartella, { withFileTypes: true })) {
      const percorso = join(cartella, voce.name)
      if (voce.isDirectory()) sotto(percorso)
      else if (voce.name.endsWith('.md')) trovati.push(percorso)
    }
  }
  sotto(join('.claude', 'skills'))
  return trovati.map((percorso) => daRadice(percorso))
}

const SCRIPT = new Set(Object.keys(JSON.parse(readFileSync('package.json', 'utf8')).scripts ?? {}))

/** La citazione ripulita: senza numeri di riga, ancore e punteggiatura in coda. */
function ripulita (grezza) {
  return grezza
    .replace(/#.*$/, '')
    .replace(/::.*$/, '')
    .replace(/(:\d+(-\d+)?)+$/, '')
    .replace(/[.,;)]+$/, '')
}

/** Vero se la citazione è un modello e non un percorso vero. */
function modello (percorso) {
  return /[*<>{}…]|\.\.\./.test(percorso)
}

function inDeroga (file, percorso) {
  return DEROGHE.some((d) => (d.file === '*' || d.file === file) && d.percorso === percorso)
}

// ------------------------------------------------------------------ la lettura

const rilievi = []
let citazioni = 0

const elenco = documenti()
for (const file of elenco) {
  const righe = readFileSync(file, 'utf8').split(/\r?\n/)
  let dentroBlocco = false

  righe.forEach((riga, i) => {
    const dove = `${file}:${i + 1}`

    for (const trovato of riga.matchAll(/npm run ([\w:.-]+)/g)) {
      citazioni += 1
      if (!SCRIPT.has(trovato[1])) {
        rilievi.push(`${dove}  script  \`npm run ${trovato[1]}\` non è in package.json`)
      }
    }

    if (/^\s*(```|~~~)/.test(riga)) {
      dentroBlocco = !dentroBlocco
      return
    }
    // Nei blocchi di codice un backtick non delimita niente.
    if (dentroBlocco || SENZA_PERCORSI.has(file)) return

    for (const trovato of riga.matchAll(/`([^`\s]+)`/g)) {
      const percorso = ripulita(trovato[1])
      if (!RADICI.some((radice) => percorso.startsWith(radice))) continue
      if (modello(percorso)) continue
      citazioni += 1
      if (existsSync(percorso) || inDeroga(file, percorso)) continue
      rilievi.push(`${dove}  percorso  \`${piano(percorso)}\` non esiste`)
    }

    // I collegamenti relativi, `[testo](../src/…)`: si risolvono dalla
    // cartella del documento, come li risolve chi li apre.
    for (const trovato of riga.matchAll(/\]\(([^)\s]+)\)/g)) {
      const bersaglio = ripulita(trovato[1])
      if (/^[a-z]+:|^#|^$/i.test(bersaglio) || modello(bersaglio)) continue
      const percorso = piano(join(dirname(file), decodeURI(bersaglio)))
      citazioni += 1
      if (existsSync(percorso) || inDeroga(file, percorso)) continue
      rilievi.push(`${dove}  collegamento  \`${trovato[1]}\` non porta a niente`)
    }
  })
}

// ------------------------------------------------------------------- l'esito

if (rilievi.length === 0) {
  console.log(`La documentazione nomina solo cose che esistono. (${elenco.length} documenti, ${citazioni} citazioni)`)
} else {
  console.log(`# Citazioni che non esistono: ${rilievi.length}\n`)
  for (const r of rilievi) console.log(r)
}

if (SENZA_PERCORSI.size > 0) {
  console.log(`\n# Documenti di storia, controllati solo negli script: ${SENZA_PERCORSI.size}\n`)
  for (const file of SENZA_PERCORSI) console.log(`  ${file}`)
}

process.exitCode = rilievi.length ? 1 : 0
