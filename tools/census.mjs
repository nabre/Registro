/**
 * Censimento degli export senza consumatori: per ogni simbolo esportato cerca
 * chi lo nomina fuori dal suo file. Se nessuno, è morto o pubblico senza
 * motivo, e lo distingue contando le occorrenze in casa propria.
 *
 * Complementare a `noUnusedLocals` (dentro un file) e da usare prima: tolto
 * l'`export` di troppo, `tsc` dice che cosa è diventato irraggiungibile.
 *
 * Due letture, perché sbagliano in versi opposti. Quella di qui cerca il nome
 * nudo ovunque: un omonimo in un altro file (una proprietà, un commento)
 * basta a salvare un export morto. Quella di knip (`knip.config.ts`) segue gli
 * import: non si fa ingannare dagli omonimi, ma non vede dentro gli ingressi
 * (un `export *` di `core/dominio/index.ts`, che le prove leggono tutto, per lei
 * è pubblico) né le prove Python. Le due liste si stampano insieme, con la
 * stessa diagnosi.
 *
 * Uso: `npm run census`             esce rosso per un export mai usato (qui)
 *      `npm run census -- --severo` anche per quel che trova knip
 *      `npm run census -- --senza-knip`  solo la lettura di qui
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { RADICE, daRadice, fileSotto } from './common.mjs'

/** Cartelle di codice: tutto quel che può nominare un simbolo va guardato. */
const CARTELLE = ['core', 'contract', 'desktop', 'ui', 'cli', 'tests', 'tools']

/** File sciolti fuori dalle cartelle di codice che però importano il resto. */
const SCIOLTI = ['esbuild.mjs']

const radice = RADICE

/** Tutte le forme in cui qui dentro si scrive codice: un export si nomina da ognuna. */
const ESTENSIONI = ['.ts', '.mts', '.mjs', '.cjs']

const percorsi = CARTELLE
  .filter((c) => existsSync(join(radice, c)))
  .flatMap((c) => fileSotto(join(radice, c), ESTENSIONI))
  .concat(SCIOLTI.map((f) => join(radice, f)).filter(existsSync))

const relativo = (percorso) => daRadice(percorso, radice)
const testo = new Map(percorsi.map((p) => [relativo(p), readFileSync(p, 'utf8')]))

// `export const x`, `export function x`, `export type X`, e così via.
const DICHIARAZIONE =
  /^export\s+(?:declare\s+)?(?:async\s+)?(?:const|let|var|function\*?|class|type|interface|enum)\s+([A-Za-zÀ-ÿ_$][\w$À-ÿ]*)/gm
// `export { x, y as z }`, anche nella forma `export { x } from './y.js'`.
const LISTA = /^export\s*\{([^}]*)\}/gm

/** Nomi esportati, file per file. */
const dichiarati = new Map()
for (const [percorso, sorgente] of testo) {
  const nomi = new Set()
  for (const trovato of sorgente.matchAll(DICHIARAZIONE)) nomi.add(trovato[1])
  for (const trovato of sorgente.matchAll(LISTA)) {
    for (const voce of trovato[1].split(',')) {
      const nome = voce.trim().split(/\s+as\s+/).pop()?.trim()
      if (nome && /^[A-Za-zÀ-ÿ_$][\w$À-ÿ]*$/.test(nome)) nomi.add(nome)
    }
  }
  if (nomi.size) dichiarati.set(percorso, nomi)
}

// Chi nomina che cosa: l'identificatore nudo e non l'import, perché i barili
// riesportano con `export *`.
const citazioni = new Map()
for (const [percorso, sorgente] of testo) {
  for (const identificatore of new Set(sorgente.match(/[A-Za-zÀ-ÿ_$][\w$À-ÿ]*/g) ?? [])) {
    if (!citazioni.has(identificatore)) citazioni.set(identificatore, new Set())
    citazioni.get(identificatore).add(percorso)
  }
}

// Niente `\b`: una lettera accentata non è un carattere di parola, e
// `èPacchetto` non aggancerebbe. Il confine si scrive a mano, sulla stessa
// classe con cui i nomi sono stati riconosciuti.
const PRIMA = '(?<![' + String.fromCharCode(92) + 'w$À-ÿ])'
const DOPO = '(?![' + String.fromCharCode(92) + 'w$À-ÿ])'
const quanteVolte = (sorgente, nome) =>
  (sorgente.match(new RegExp(PRIMA + nome + DOPO, 'g')) ?? []).length

const rilievi = []
for (const [percorso, nomi] of dichiarati) {
  for (const nome of nomi) {
    const altrove = [...(citazioni.get(nome) ?? [])].filter((p) => p !== percorso)
    if (altrove.length) continue
    // Una sola occorrenza è la dichiarazione stessa: nessuno lo usa, nemmeno qui.
    const usi = quanteVolte(testo.get(percorso), nome)
    rilievi.push({
      percorso,
      nome,
      diagnosi: usi <= 1 ? 'mai usato' : `interno (${usi} citazioni)`,
    })
  }
}

rilievi.sort((a, b) => a.percorso.localeCompare(b.percorso) || a.nome.localeCompare(b.nome))

const mai = rilievi.filter((r) => r.diagnosi === 'mai usato')
console.log(`# Export senza consumatori esterni: ${rilievi.length}`)
console.log(`# Da eliminare: ${mai.length} — da rendere interni: ${rilievi.length - mai.length}\n`)

let corrente = ''
for (const rilievo of rilievi) {
  if (rilievo.percorso !== corrente) {
    corrente = rilievo.percorso
    console.log(`\n## ${corrente}`)
  }
  console.log(`- \`${rilievo.nome}\` — ${rilievo.diagnosi}`)
}

/**
 * I reperti di knip, o `null` se non ha risposto (non installato, configurazione
 * rotta): il censimento di qui vale anche da solo, e lo dice.
 */
function repertiKnip () {
  // Per percorso: gli `exports` di knip non espongono `bin/`.
  const eseguibile = join(radice, 'node_modules', 'knip', 'bin', 'knip.js')
  if (!existsSync(eseguibile)) return null
  const esito = spawnSync(
    process.execPath,
    [eseguibile, '--no-progress', '--reporter', 'json', '--include', 'exports,types,duplicates,files'],
    { cwd: radice, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  )
  // 0 pulito, 1 con reperti; ogni altro codice è knip che non è arrivato in fondo.
  if (esito.status !== 0 && esito.status !== 1) return null
  try {
    return JSON.parse(esito.stdout).issues
  } catch {
    return null
  }
}

const severo = process.argv.includes('--severo')
const knip = process.argv.includes('--senza-knip') ? undefined : repertiKnip()

/** Quel che knip trova e il censimento di qui no, con la stessa diagnosi. */
const soloKnip = []
const fileMorti = []
const doppi = []
const giàQui = new Set(rilievi.map((r) => `${r.percorso}:${r.nome}`))
for (const voce of knip ?? []) {
  for (const { name } of voce.files) fileMorti.push(name)
  for (const gruppo of voce.duplicates) doppi.push(`${voce.file}: ${gruppo.map((d) => d.name).join(' = ')}`)
  for (const [chiave, genere] of [['exports', 'valore'], ['types', 'tipo']]) {
    for (const { name, line } of voce[chiave]) {
      if (giàQui.has(`${voce.file}:${name}`)) continue
      const sorgente = testo.get(voce.file) ?? ''
      const usi = quanteVolte(sorgente, name)
      // Una riga `export { … }` o `export type { … }` che nomina e basta: il
      // codice sta in un altro modulo, e togliere la riesportazione non lo tocca.
      const riga = sorgente.split(/\r?\n/)[line - 1] ?? ''
      const riesportato = /^export\s+(?:type\s+)?\{/.test(riga.trim()) && usi <= 2
      soloKnip.push({
        percorso: voce.file,
        nome: name,
        riga: line,
        genere,
        diagnosi: riesportato ? 'riesportato e basta' : usi <= 1 ? 'mai usato' : `interno (${usi} citazioni)`,
      })
    }
  }
}
soloKnip.sort((a, b) => a.percorso.localeCompare(b.percorso) || a.riga - b.riga)

if (knip === null) {
  console.log('\n# knip non ha risposto (`npm run knip` dice perché): qui sopra c\'è solo la lettura per nome.')
} else if (knip) {
  const quanti = (diagnosi) => soloKnip.filter((r) => r.diagnosi === diagnosi).length
  console.log(`\n# Secondo knip, in più: ${soloKnip.length} export, ${fileMorti.length} file, ${doppi.length} doppi`)
  console.log(`# Da eliminare: ${quanti('mai usato')} — riesportati e basta: ${quanti('riesportato e basta')}`)
  corrente = ''
  for (const rilievo of soloKnip) {
    if (rilievo.percorso !== corrente) {
      corrente = rilievo.percorso
      console.log(`\n## ${corrente}`)
    }
    const genere = rilievo.genere === 'tipo' ? ' (tipo)' : ''
    console.log(`- \`${rilievo.nome}\`${genere}, riga ${rilievo.riga} — ${rilievo.diagnosi}`)
  }
  if (fileMorti.length) {
    console.log('\n## File che nessuno importa')
    for (const file of fileMorti) console.log(`- ${file}`)
  }
  if (doppi.length) {
    console.log('\n## Lo stesso export con due nomi')
    for (const doppio of doppi) console.log(`- ${doppio}`)
  }
}

// Fa fallire solo quel che nessuno chiama, cioè codice morto. Quel che è solo
// «interno» è un consiglio: certi tipi restano esportati apposta perché
// compaiono nella firma di una funzione esportata (il motivo è nel sorgente).
// Quel che trova solo knip ferma con `--severo`: finché la lista di D6 non è
// smaltita, è da leggere, non un guasto.
// Zero file letti è una radice sbagliata, non un progetto senza codice morto.
if (percorsi.length === 0) console.log('Nessun file letto: la radice del progetto è sbagliata?')
const knipRosso = severo && (soloKnip.length > 0 || fileMorti.length > 0 || doppi.length > 0)
process.exitCode = mai.length || percorsi.length === 0 || knipRosso ? 1 : 0
