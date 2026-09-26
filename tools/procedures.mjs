/**
 * Verifica che l'albero delle procedure stia in piedi: il percorso di ogni file
 * è il nome della procedura che contiene (`ore.appello.casella` sta in
 * `src/api/procedures/ore/appello/casella.ts`), ogni file è nominato
 * nell'indice della sua cartella, e ogni cartella arriva a `src/api/index.ts`.
 * Una procedura che non arriva all'indice non si registra, e senza nessun errore.
 *
 * Legge il testo e non compila, così funziona anche quando `tsc` non passa.
 * Quel che non sa leggere lo dice.
 *
 * Uso: `npm run procedures`
 */
import { readFileSync } from 'node:fs'
import { daRadice, fileSotto } from './common.mjs'
import process from 'node:process'

const PROCEDURE = 'src/api/procedures'
const INDICE = 'src/api/index.ts'
const PROTOCOLLO = 'src/protocol.ts'
const CATALOGO = 'resources/tools.json'

/** I file che in una cartella di procedure non sono procedure. */
const NON_PROCEDURE = new Set(['index.ts', 'common.ts'])

/** La cartella dei comuni condivisi fra aree: dentro non ci sono procedure. */
const COMUNI = 'common'

const problemi = []
const male = (dove, che) => problemi.push(`${dove}: ${che}`)

// ------------------------------------------------------------------ l'albero

/** Ogni file `.ts` sotto `src/api/procedures`, con il suo percorso a segmenti. */
function alberoDi (cartella, radice = cartella) {
  return fileSotto(cartella).map((percorso) => ({
    percorso,
    relativo: daRadice(percorso, radice).split('/'),
    testo: readFileSync(percorso, 'utf8'),
  }))
}

const file = alberoDi(PROCEDURE)

// --------------------------------------------------- una procedura per file

/**
 * Le due forme con cui un file dichiara la sua procedura: `definisci({…})`, e
 * `scrittura({…})` — `definisci` con genere, uscita e versione già messi
 * (`src/api/core.ts`).
 */
const DICHIARA = String.raw`export const procedura = (?:definisci|scrittura)\(`

/** Il `nome:` dichiarato dentro `definisci({...})` o `scrittura({...})`, se c'è. */
function nomeDichiarato (testo) {
  const dentro = new RegExp(String.raw`${DICHIARA}\{([\s\S]*?)\n\}\)`).exec(testo)
  if (!dentro) return null
  const nome = /\bnome:\s*'([^']+)'/.exec(dentro[1])
  return nome ? nome[1] : null
}

const procedure = []

for (const f of file) {
  const ultimo = f.relativo.at(-1)
  const dentroComuni = f.relativo[0] === COMUNI

  // I cataloghi dei testi stanno accanto alle procedure che li leggono.
  if (NON_PROCEDURE.has(ultimo) || ultimo.endsWith('.testi.ts') || dentroComuni) continue

  const nome = nomeDichiarato(f.testo)
  if (!nome) {
    male(
      f.percorso,
      'non esporta una procedura. Un file in quest’albero o è una procedura — ' +
      '`export const procedura = definisci({…})`, o `scrittura({…})` — ' +
      'o si chiama `index.ts` o `common.ts`, o è un catalogo di testi `*.testi.ts`.',
    )
    continue
  }

  // Il percorso è l'indirizzo: `a.b.c` sta in `a/b/c.ts`.
  const atteso = `${nome.split('.').join('/')}.ts`
  const suo = f.relativo.join('/')
  if (suo !== atteso) {
    male(f.percorso, `si chiama «${nome}» e dovrebbe stare in ${PROCEDURE}/${atteso}`)
  }

  // Più di una procedura in un file: l'indice ne vedrebbe una sola.
  const quante = (f.testo.match(new RegExp(`^${DICHIARA}`, 'gm')) ?? []).length
  if (quante > 1) male(f.percorso, `dichiara ${quante} procedure: una per file`)

  procedure.push({ nome, percorso: f.percorso, relativo: f.relativo })
}

// ---------------------------------------------------------------- gli indici

const indici = new Map()
for (const f of file) {
  if (f.relativo.at(-1) !== 'index.ts') continue
  indici.set(f.relativo.slice(0, -1).join('/'), f)
}

/** Le cartelle che contengono qualcosa da indicizzare. */
const cartelle = new Set()
for (const p of procedure) {
  const parti = p.relativo.slice(0, -1)
  for (let i = 1; i <= parti.length; i++) cartelle.add(parti.slice(0, i).join('/'))
}

for (const cartella of cartelle) {
  if (!indici.has(cartella)) {
    male(`${PROCEDURE}/${cartella}`, 'non ha un `index.ts`: quel che c’è dentro non si registra')
  }
}

for (const [cartella, indice] of indici) {
  if (cartella === '' || cartella === COMUNI) continue

  // I file della cartella vanno nominati uno per uno.
  const suoi = procedure.filter((p) => p.relativo.slice(0, -1).join('/') === cartella)
  for (const p of suoi) {
    const modulo = `./${p.relativo.at(-1).replace(/\.ts$/, '')}.js`
    if (!indice.testo.includes(`from '${modulo}'`)) {
      male(indice.percorso, `non nomina ${p.relativo.at(-1)} («${p.nome}»): non si registrerà`)
    }
  }

  // E le cartelle sotto, una per una.
  const figlie = [...cartelle].filter((c) => {
    const parti = c.split('/')
    return parti.length === cartella.split('/').length + 1 && c.startsWith(`${cartella}/`)
  })
  for (const figlia of figlie) {
    const modulo = `./${figlia.split('/').at(-1)}/index.js`
    if (!indice.testo.includes(`from '${modulo}'`)) {
      male(indice.percorso, `non nomina la cartella ${figlia.split('/').at(-1)}/: le sue procedure non si registrano`)
    }
  }
}

// ------------------------------------------------------- fino all'indice vero

const generale = readFileSync(INDICE, 'utf8')
const aree = new Set(procedure.map((p) => p.relativo[0]))

for (const area of aree) {
  if (!generale.includes(`from './procedures/${area}/index.js'`)) {
    male(INDICE, `non importa l’area «${area}»: le sue procedure non esistono per il registro`)
    continue
  }
  const costante = `procedure${area.charAt(0).toUpperCase()}${area.slice(1)}`
  if (!new RegExp(`\\.\\.\\.${costante}\\b`).test(generale)) {
    male(INDICE, `importa «${costante}» ma non lo sparge dentro TUTTE`)
  }
}

// Un'area nominata nell'indice e sparita dall'albero: l'import non compila, ma
// lo si dice prima e con il nome giusto.
for (const citata of generale.matchAll(/from '\.\/procedures\/([^/]+)\/index\.js'/g)) {
  if (!aree.has(citata[1])) {
    male(INDICE, `nomina l’area «${citata[1]}», che nell’albero non c’è più`)
  }
}

// ------------------------------------------------- le azioni prese in carico

const protocollo = readFileSync(PROTOCOLLO, 'utf8')
const azioni = new Set(
  [...protocollo.matchAll(/\btipo:\s*'([^']+)'/g)].map((trovata) => trovata[1]),
)

for (const f of file) {
  if (NON_PROCEDURE.has(f.relativo.at(-1)) || f.relativo[0] === COMUNI) continue
  const presa = /\bazione:\s*'([^']+)'/.exec(f.testo)
  if (presa && !azioni.has(presa[1])) {
    male(f.percorso, `dichiara l’azione «${presa[1]}», che in ${PROTOCOLLO} non esiste`)
  }
}

// ---------------------------------------------------------------- il catalogo

// Il confronto vero lo fa `tests/api/tools.test.mjs`; qui basta il conto, per
// una procedura aggiunta senza `npm run tools`.
try {
  const catalogo = JSON.parse(readFileSync(CATALOGO, 'utf8'))
  if (catalogo.attrezzi.length !== procedure.length) {
    male(
      CATALOGO,
      `racconta ${catalogo.attrezzi.length} procedure e nell’albero ce ne sono ` +
      `${procedure.length}: dare «npm run tools»`,
    )
  }
  const nomi = new Set(procedure.map((p) => p.nome))
  for (const attrezzo of catalogo.attrezzi) {
    if (!nomi.has(attrezzo.nome)) {
      male(CATALOGO, `racconta «${attrezzo.nome}», che nell’albero non c’è più`)
    }
  }
} catch (guasto) {
  male(CATALOGO, `non si riesce a leggere: ${guasto.message}`)
}

// ------------------------------------------------------------------ il conto

const doppie = new Map()
for (const p of procedure) {
  doppie.set(p.nome, (doppie.get(p.nome) ?? 0) + 1)
}
for (const [nome, quante] of doppie) {
  if (quante > 1) male(PROCEDURE, `«${nome}» è dichiarata ${quante} volte`)
}

if (problemi.length > 0) {
  console.error(`${problemi.length} ${problemi.length === 1 ? 'problema' : 'problemi'}:\n`)
  for (const problema of problemi) console.error(`  ${problema}`)
  console.error('')
  process.exitCode = 1
} else {
  const cartelleConte = cartelle.size
  console.log(
    `${procedure.length} procedure in ${cartelleConte} cartelle, ${aree.size} aree: ` +
    'ognuna al suo posto, nominata nel suo indice e registrata.',
  )
}
