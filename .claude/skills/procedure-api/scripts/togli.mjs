/**
 * Toglie una procedura e tutte le tracce che lascerebbe dietro.
 *
 * Cancellare il file è la parte facile e non basta: restano la riga
 * nell'indice — che non compila, e va bene — ma anche la cartella vuota con
 * dentro un indice che non indicizza niente, l'area nominata in
 * `src/api/indice.ts`, la voce in `risorse/attrezzi.json` che continuerebbe a
 * raccontare a un modello un attrezzo che non c'è più, e le prove che la
 * chiamano. Le prime quattro le fa questo; le prove no, perché una prova che
 * cita una procedura tolta di solito prova anche altro, e cancellarla sarebbe
 * buttare via una rete insieme al ferro vecchio. Quelle si elencano.
 *
 * Uso:
 *   node .claude/skills/procedure-api/scripts/togli.mjs ore.appello.casella
 *   node .claude/skills/procedure-api/scripts/togli.mjs ore.appello.casella --prova
 *
 * Con `--prova` dice che cosa farebbe e non tocca niente.
 */
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import process from 'node:process'

const PROCEDURE = 'src/api/procedure'
const INDICE = 'src/api/indice.ts'

const argomenti = process.argv.slice(2)
const nome = argomenti.find((a) => !a.startsWith('--'))
const solamenteDire = argomenti.includes('--prova')

if (!nome) {
  console.error('Serve il nome della procedura da togliere: ore.appello.casella')
  process.exit(1)
}

const segmenti = nome.split('.')
const cartelle = segmenti.slice(0, -1)
const ultimo = segmenti.at(-1)
const percorso = join(PROCEDURE, ...segmenti) + '.ts'

if (!existsSync(percorso)) {
  console.error(`${percorso} non c’è. Il nome è giusto?`)
  process.exit(1)
}

const capitale = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const cammello = (s) => s.split('.').map((p, i) => (i === 0 ? p : capitale(p))).join('')

const fatti = []
const fai = (che, azione) => {
  fatti.push(che)
  if (!solamenteDire) azione()
}

/** Toglie da un file le righe che contengono uno di questi pezzi. */
function sfila (percorsoFile, pezzi) {
  const righe = readFileSync(percorsoFile, 'utf8').split('\n')
  const tenute = righe.filter((r) => !pezzi.some((pezzo) => r.includes(pezzo)))
  if (tenute.length === righe.length) return false
  if (!solamenteDire) writeFileSync(percorsoFile, tenute.join('\n'), 'utf8')
  return true
}

/** Quante procedure restano nominate in un indice. */
function quanteRestano (percorsoIndice) {
  const testo = readFileSync(percorsoIndice, 'utf8')
  const dentro = /\[\n([\s\S]*?)\n\]/.exec(testo)
  if (!dentro) return 0
  return dentro[1].split('\n').filter((r) => r.trim() !== '').length
}

// 1. Il file.
fai(`cancellato  ${percorso}`, () => rmSync(percorso))

// 2. La riga nell'indice della sua cartella, e poi su, finché restano vuoti.
let livello = cartelle.length
let sparita = `./${ultimo}.js`
let vociTolte = [`from '${sparita}'`, `  ${cammello(ultimo)},`]

while (livello >= 1) {
  const parti = cartelle.slice(0, livello)
  const indice = join(PROCEDURE, ...parti, 'indice.ts')
  if (!existsSync(indice)) break

  if (sfila(indice, vociTolte)) fatti.push(`sfilata da   ${indice}`)

  // Un indice rimasto senza voci è una cartella che non serve più. Contando su
  // quel che c'è scritto adesso, e non su quel che si è appena tolto: in prova
  // il file non è stato riscritto, e contare due volte direbbe una bugia.
  const restano = solamenteDire
    ? quanteRestano(indice) - (vociTolte.some((v) => readFileSync(indice, 'utf8').includes(v)) ? 1 : 0)
    : quanteRestano(indice)

  if (restano > 0) break

  const cartella = join(PROCEDURE, ...parti)
  // Una cartella con dentro un `comuni.ts` non si butta a cuor leggero: quelle
  // funzioni le può usare un'altra area.
  if (existsSync(join(cartella, 'comuni.ts'))) {
    fatti.push(`lasciata     ${cartella}/ — ha un comuni.ts che qualcun altro può usare`)
    break
  }
  const altri = readdirSync(cartella).filter((v) => v !== 'indice.ts')
  if (altri.length > 0) break

  fai(`cancellata  ${cartella}/ — non conteneva altro`, () => rmSync(cartella, { recursive: true }))
  const costante = `procedure${parti.map(capitale).join('')}`
  sparita = `./${parti.at(-1)}/indice.js`
  vociTolte = [`from '${sparita}'`, `  ...${costante},`]
  livello--
}

// 3. L'area dentro l'indice vero, se la cartella dell'area è sparita.
const area = cartelle[0]
if (!existsSync(join(PROCEDURE, area))) {
  const costante = `procedure${capitale(area)}`
  if (sfila(INDICE, [`from './procedure/${area}/indice.js'`, `  ...${costante},`])) {
    fatti.push(`sfilata l’area «${area}» da ${INDICE}`)
  }
}

// ------------------------------------------------- quel che resta da guardare

for (const fatto of fatti) console.log(`  ${fatto}`)
console.log('')

if (solamenteDire) {
  console.log('Era una prova: non è stato toccato niente.')
  process.exit(0)
}

/** Dove il nome della procedura compare ancora, nel codice e nelle prove. */
function ancoraCitata () {
  try {
    const uscita = execFileSync(
      'git',
      ['grep', '-n', '--fixed-strings', nome, '--', 'src', 'prove', 'docs', 'strumenti', 'README.md'],
      { encoding: 'utf8' },
    )
    return uscita.trim().split('\n').filter(Boolean)
  } catch {
    // `git grep` esce con 1 quando non trova niente: è il caso buono.
    return []
  }
}

const citazioni = ancoraCitata()
if (citazioni.length > 0) {
  console.log(`«${nome}» è ancora nominata in ${citazioni.length} posti, da guardare a mano:`)
  for (const citazione of citazioni) console.log(`  ${citazione}`)
  console.log('')
  console.log('Le prove che la chiamano vanno lette prima di toglierle: una prova che cita')
  console.log('una procedura sparita di solito prova anche altro.')
} else {
  console.log(`«${nome}» non è più nominata da nessuna parte nel sorgente.`)
}

console.log('')
console.log('Poi, nell’ordine:')
console.log('  1. npm run procedure   che l’albero stia ancora in piedi')
console.log('  2. npm run attrezzi    il catalogo, che altrimenti la racconta ancora')
console.log('  3. se prendeva in carico un’azione: toglierla da src/protocollo.ts e il suo')
console.log('     gestore da src/azioni/, e aggiornare i due conti che leggono quel sorgente')
console.log('     (prove/api/copertura.test.mjs, prove/api/ponte.test.mjs)')
console.log('  4. i conti in docs/API.md e docs/INDICE.md')
console.log('  5. npm run controllo-tipi && npm run controllo-stile && npm test')
