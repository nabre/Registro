/**
 * Verifica che la documentazione nomini cose che esistono, in `docs/*.md` e
 * `.claude/skills/**\/*.md`:
 *
 *   1. ogni `npm run X`, anche nei blocchi di codice, è uno script di `package.json`;
 *   2. ogni percorso fra backtick che comincia come un file del progetto
 *      (anche con le radici italiane precedenti, per trovarle) esiste sul disco.
 *      I numeri di riga in coda si tolgono; i modelli con `*`, `<…>`, `{…}` o
 *      `…` si saltano.
 *
 * Le citazioni volute di cose che non esistono stanno nelle deroghe, o il
 * documento intero è escluso dai percorsi; gli script si controllano sempre.
 * Legge il testo, non compila.
 *
 * Uso: `npm run docs`
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { daRadice, fileSotto, piano } from './common.mjs'

// ---------------------------------------------------------------- le deroghe

/** Documenti di cui si controllano gli script ma non i percorsi citati. */
const SENZA_PERCORSI = new Set([])

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
  // Le radici italiane precedenti: se compaiono sono sbagliate.
  'guscio/', 'prove/', 'strumenti/', 'risorse/', 'icone/', 'modelli/',
]

// ------------------------------------------------------------------ i documenti

/** I documenti da leggere: `docs/*.md` e ogni `.md` sotto le skill. */
function documenti () {
  const trovati = []
  for (const voce of readdirSync('docs', { withFileTypes: true })) {
    if (voce.isFile() && voce.name.endsWith('.md')) trovati.push(join('docs', voce.name))
  }
  const skill = join('.claude', 'skills')
  if (existsSync(skill)) fileSotto(skill, ['.md'], trovati)
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
