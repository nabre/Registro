/**
 * Verifica che nessun import attraversi un confine fra i cinque strati di
 * `docs/ARCHITETTURA.md` (`core`, `contract`, `desktop`, `ui`, `cli`).
 *
 * Le regole degli import stanno in `.dependency-cruiser.cjs` (ADR-50):
 *
 *   1. Le frecce vanno in una direzione sola: `core` non conosce nessuno,
 *      `contract` conosce `core`, `desktop` tutti e due, `ui` la logica pura e
 *      il contratto (mai persistenza né ospite), `cli` nessuno.
 *   2. `core` può importare da `contract` un tipo, mai un valore: `import type`
 *      sparisce alla compilazione.
 *   3. `cli` non importa niente dal progetto, così parte anche a costruzione
 *      rotta (vedi `cli/registro.mjs`).
 *   4. `core/dominio/` non importa niente da fuori di sé tranne `core/i18n/`,
 *      che a sua volta non importa niente.
 *   5. `core/controlli/` (il DOM dei controlli delle impostazioni, ADR-52)
 *      importa solo `core/i18n/`, le parole di tutti e tipi da `contract`.
 *   6. Nessun ciclo fra import di valore.
 *
 * Qui restano le tre regole che si vedono solo nel testo, e che un grafo di
 * import non sa dire: nessuno specificatore con un segmento `...`; le regole
 * del dominio scritte una volta sola (soglia, estremi dell'anno, nome, allievi
 * attivi, UD); nessun gestore che rientra in `chiama()`.
 *
 * Uso: `npm run layers`, o `npm run layers -- --grafico` per il grafico delle
 * cartelle in `copertura/strati.dot` (da aprire con Graphviz).
 */
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { cruise, format } from 'dependency-cruiser'
import extractDepcruiseOptions from 'dependency-cruiser/config-utl/extract-depcruise-options'
import extractTSConfig from 'dependency-cruiser/config-utl/extract-ts-config'

import { RADICE, daRadice, fileSotto, piano } from './common.mjs'

// --------------------------------------------------------------- le deroghe

/**
 * Le deroghe, ognuna con il motivo. `da` e `a` sono espressioni regolari sui
 * percorsi. Sono gli import che il controllo scritto a mano non vedeva (una
 * regola rotta lasciava passare ogni `import … from` statico) e che il
 * passaggio a dependency-cruiser ha messo in luce: restano qui, visibili a
 * ogni giro, finché non si spostano.
 */
const DEROGHE = [
  {
    da: '^core/azioni/system\\.ts$',
    a: '^desktop/apparato/settings\\.ts$',
    perche: 'le impostazioni dichiarate vivono nell’ospite: vanno portate in core/ o passate dall’apparato',
  },
  {
    da: '^contract/(centralino\\.ts|procedure/proiezione/)',
    a: '^desktop/azioni/projection\\.ts$',
    perche: 'la proiezione è una capacità dell’ospite: va chiesta dall’apparato, non importata',
  },
  {
    da: '^ui/pannello/forms/schoolCalendar\\.ts$',
    a: '^core/dati/schoolCalendarTicino\\.ts$',
    perche: 'il calendario ufficiale è un dato generato puro: va letto dal dominio o chiesto al ponte',
  },
  {
    da: '^core/dominio/schoolCalendar\\.ts$',
    a: '^core/dati/schoolCalendars\\.ts$',
    perche: 'i calendari ufficiali sono dati puri: il loro indice va nel dominio',
  },
]

// ------------------------------------------------------------------ il grafo

/** Anche gli `.mjs`: la riga di comando è codice, e ha i suoi confini da rispettare. */
const ESTENSIONI = ['.ts', '.mjs']

const RADICI = ['core', 'contract', 'desktop', 'ui', 'cli']

function esiste (percorso) {
  try {
    statSync(join(RADICE, percorso))
    return true
  } catch {
    return false
  }
}

// Dalla radice del repository, non dalla cartella da cui si lancia: altrove
// non si leggerebbe niente e il controllo passerebbe.
process.chdir(RADICE)
const opzioni = await extractDepcruiseOptions('./.dependency-cruiser.cjs')
const { output: esito } = await cruise(
  RADICI.filter(esiste),
  { ...opzioni, outputType: 'json' },
  {},
  { tsConfig: extractTSConfig('tsconfig.json') },
)
const risultato = typeof esito === 'string' ? JSON.parse(esito) : esito

const sorgenti = risultato.modules
  .map((m) => piano(m.source))
  .filter((p) => RADICI.some((r) => p.startsWith(`${r}/`)) && ESTENSIONI.some((e) => p.endsWith(e)))
const moduli = new Map(risultato.modules.map((m) => [piano(m.source), m]))

/** Le righe di codice di un file, col numero: i commenti no. */
function righeDiCodice (testo) {
  return testo.split('\n')
    .map((riga, i) => ({ riga, numero: i + 1 }))
    .filter(({ riga }) => {
      // Raccontare una regola vuol dire scrivere la forma sbagliata.
      const pulita = riga.trimStart()
      return !pulita.startsWith('//') && !pulita.startsWith('*')
    })
}

/**
 * Lo specificatore scritto nel codice e la riga dove sta: dependency-cruiser
 * dà il file risolto, non la riga.
 */
function dove (da, a) {
  const dipendenza = moduli.get(da)?.dependencies.find((d) => piano(d.resolved) === a)
  const verso = dipendenza?.module ?? a
  const riga = righeDiCodice(readFileSync(join(RADICE, da), 'utf8'))
    .find(({ riga }) => [verso, `node:${verso}`].some((v) => riga.includes(`'${v}'`) || riga.includes(`"${v}"`)))
  return { verso, riga: riga?.numero ?? 1 }
}

/**
 * Lo strato di un file, o la sua area di `core` quando la regola guarda dentro
 * `core` (dominio, i18n). Fuori dal progetto, lo specificatore stesso (`node:fs`, `electron`).
 */
function stratoDi (percorso, verso, dentroCore) {
  const strato = RADICI.find((r) => percorso.startsWith(`${r}/`))
  if (!strato) return verso
  return dentroCore && strato === 'core' ? percorso.split('/').slice(0, 2).join('/') : strato
}

const rilievi = []
const derogate = new Set()
const giri = []
const chiaviGiri = new Set()
const daGuardare = []

for (const v of risultato.summary.violations) {
  const da = piano(v.from)
  const a = piano(v.to)

  if (v.rule.name === 'ciclo') {
    const giro = [da, ...(v.cycle ?? []).map((c) => piano(c.name))]
    const chiave = [...new Set(giro)].sort().join('|')
    if (!chiaviGiri.has(chiave)) {
      chiaviGiri.add(chiave)
      giri.push(giro)
    }
    continue
  }
  if (v.rule.name === 'non-risolto') {
    daGuardare.push(`${da} — non trova ${v.unresolvedTo ?? a}`)
    continue
  }

  const deroga = DEROGHE.find((d) => new RegExp(d.da).test(da) && new RegExp(d.a).test(a))
  if (deroga) {
    derogate.add(`${da} → ${a}\n    ${deroga.perche}`)
    continue
  }

  const { verso, riga } = dove(da, a)
  const soloTipo = (v.dependencyTypes ?? []).includes('type-only')
  const dentroCore = da.startsWith('core/') && a.startsWith('core/')
  rilievi.push({
    percorso: da,
    riga,
    gravita: soloTipo ? 'TIPO  ' : 'VALORE',
    dettaglio: `${stratoDi(da, da, dentroCore)} → ${stratoDi(a, verso, dentroCore)}   ${verso}   (${v.rule.name})`,
  })
}
rilievi.sort((x, y) => x.percorso.localeCompare(y.percorso) || x.riga - y.riga)

if (process.argv.includes('--grafico')) {
  const { output } = await format(risultato, { outputType: 'archi', includeOnly: '^(core|contract|desktop|ui|cli)/' })
  mkdirSync(join(RADICE, 'copertura'), { recursive: true })
  writeFileSync(join(RADICE, 'copertura', 'strati.dot'), /** @type {string} */ (output))
  console.log('Grafico delle cartelle in copertura/strati.dot (dot -Tsvg copertura/strati.dot).\n')
}

// ------------------------------------------------------- i segmenti «...»

/**
 * Uno specificatore con un segmento `...` (`'.../../core'`): Windows lo legge
 * come `.`, POSIX come una cartella che non c'è. Gira qui e si rompe altrove,
 * perciò si cerca in ogni file di codice, prove e attrezzi compresi.
 */
const TRE_PUNTI = /(?:\bfrom\s+|\b(?:import|require)\s*\(\s*|^\s*import\s+)(['"])([^'"]+)\1/gm
const conTrePunti = []
for (const percorso of ['core', 'contract', 'desktop', 'ui', 'cli', 'tests', 'tools', 'shell', 'src']
  .filter(esiste)
  .flatMap((r) => fileSotto(join(RADICE, r), ['.ts', '.mts', '.mjs', '.cjs', '.js']))
  .map((p) => daRadice(p, RADICE))
  .concat(esiste('esbuild.mjs') ? ['esbuild.mjs'] : [])) {
  const testo = readFileSync(join(RADICE, percorso), 'utf8')
  for (const trovato of testo.matchAll(TRE_PUNTI)) {
    if (!trovato[2].split('/').includes('...')) continue
    const riga = testo.slice(0, trovato.index).split('\n').length
    conTrePunti.push(`${percorso}:${riga}  '${trovato[2]}'`)
  }
}

// ------------------------------------------- le regole che si leggono nel testo

/**
 * Le regole del registro scritte una volta sola: «il lavoro non si sposta»
 * (skill delle procedure), cioè si chiama la funzione del dominio o la si
 * estrae, non la si ricopia. Una regola riscritta non si vede a runtime finché
 * i due conti tornano. `esenti` sono il file che **è** la regola, e i casi in
 * cui la stessa forma dice un'altra cosa.
 */
const UNA_VOLTA = [
  {
    nome: 'la soglia di assenza',
    chiama: 'oltreSoglia() di core/dominio/alerts.ts',
    // Una quota fra 0 e 1 confrontata con una soglia in cifra tonda non la
    // supera mai: il `× 100` sta nel dominio.
    forma: /quota[a-zA-Z]*\s*[><]=?\s*soglia|soglia\s*[><]=?\s*quota/,
    esenti: ['core/dominio/alerts.ts'],
  },
  {
    nome: 'gli estremi di un anno',
    chiama: 'estremiAnno() di core/dominio/years.ts',
    // `intervalloAnno` torna `null` anche quando l'anno c'è ma i semestri no.
    forma: /intervalloAnno\(/,
    esenti: [
      'core/dominio/years.ts',
      // Rimette l'anno in accordo con i semestri: deve calcolare l'invariante
      // per farla valere.
      'core/dominio/validation.ts',
    ],
  },
  {
    nome: 'il nome di una persona',
    chiama: 'nomeCompleto() di core/dominio/calculations.ts',
    forma: /\$\{\s*\w+\.cognome\s*\}\s\$\{\s*\w+\.nome\s*\}/,
    esenti: ['core/dominio/calculations.ts'],
  },
  {
    nome: 'gli allievi che frequentano',
    chiama: 'allieviAttivi() di core/dominio/calculations.ts',
    forma: /\.filter\(\s*\(?\s*\w+\s*\)?\s*=>\s*\w+\.attivo\s*\)/,
    esenti: [
      'core/dominio/calculations.ts',
      // `indiceNomi` riceve un elenco di allievi, non una classe: un'altra regola.
      'core/dominio/sorting.ts',
    ],
  },
  {
    nome: 'le unità didattiche di un’ora',
    chiama: 'contaUd() di core/dominio/calculations.ts',
    forma: /unitaDidattiche\([^)]*\)\.length/,
    esenti: ['core/dominio/calculations.ts'],
  },
]

const codiceTs = sorgenti.filter((p) => p.endsWith('.ts'))
const ricopiate = []
for (const percorso of codiceTs) {
  const righe = righeDiCodice(readFileSync(join(RADICE, percorso), 'utf8'))
  for (const regola of UNA_VOLTA) {
    if (regola.esenti.includes(percorso)) continue
    for (const { riga, numero } of righe) {
      if (regola.forma.test(riga)) ricopiate.push({ regola, dove: `${percorso}:${numero}` })
    }
  }
}

/**
 * Nessun gestore rientra in `chiama()`: la fila delle scritture è una sola, e
 * un gestore che aspetta il nucleo aspetta sé stesso fino al tetto («il
 * registro era occupato»). Che la strada di una lettura esista lo prova
 * `fila.chiamaUnaLettura` in `tests/api/queue.test.mjs`. `chiama(` preceduto
 * da una lettera (`richiamare`, `daGestore`) non conta.
 */
const RIENTRO = /(?<![A-Za-z])chiama\s*\(/
const rientri = []
for (const percorso of codiceTs.filter((p) => p.startsWith('core/azioni/') || p.startsWith('contract/procedure/'))) {
  for (const { riga, numero } of righeDiCodice(readFileSync(join(RADICE, percorso), 'utf8'))) {
    if (RIENTRO.test(riga)) rientri.push(`${percorso}:${numero}  ${riga.trim()}`)
  }
}

// -------------------------------------------------------------------- il detto

if (rilievi.length === 0) {
  console.log(`Nessun import attraversa un confine fra strati. (${sorgenti.length} file letti)`)
} else {
  console.log(`# Import che attraversano un confine: ${rilievi.length}\n`)
  for (const r of rilievi) console.log(`${r.percorso}:${r.riga}  ${r.gravita}  ${r.dettaglio}`)
}

if (derogate.size) {
  console.log(`\n# Deroghe dichiarate: ${derogate.size}\n`)
  for (const voce of derogate) console.log(`  ${voce}`)
}

if (giri.length) {
  console.log(`\n# Cicli di import: ${giri.length}\n`)
  for (const giro of giri) console.log(`  ${giro.join(' → ')}`)
  console.log(
    '\nUn ciclo non è un guasto finché nessuno dei due file legge a livello di modulo\n' +
    'un valore dell’altro — ma è il posto da cui quel guasto nasce.',
  )
}

if (daGuardare.length) {
  console.log(`\n# Da guardare a mano: ${daGuardare.length}\n`)
  for (const voce of daGuardare) console.log(voce)
}

if (conTrePunti.length) {
  console.log(`\n# Import con un segmento «...»: ${conTrePunti.length}\n`)
  for (const voce of conTrePunti) console.log(voce)
  console.log('\nSu Windows «...» vale «.», su POSIX è una cartella che non c’è: si scrive «./» o «../».')
}

if (ricopiate.length) {
  console.log(`\n# Regole riscritte a mano invece di chiamare quella del dominio: ${ricopiate.length}\n`)
  for (const { regola, dove: dov } of ricopiate) console.log(`${dov}  ${regola.nome}: si chiede a ${regola.chiama}`)
  console.log('\nO si chiama quella, o si estrae e la chiamano tutti e due — estratta, non duplicata.')
}

if (rientri.length) {
  console.log(`\n# Gestori che rientrano in chiama(): ${rientri.length}\n`)
  for (const voce of rientri) console.log(voce)
  console.log('\nUn gestore che chiama il nucleo aspetta la sua stessa fila: la fila unica può stallare.')
}

if (sorgenti.length === 0) console.log('Nessun file letto: la radice del progetto è sbagliata?')
// Una scansione quasi vuota (cartella spostata) farebbe passare le regole qui sopra.
const pochi = codiceTs.length < 200
if (pochi) console.log(`Solo ${codiceTs.length} sorgenti .ts: la radice o le cartelle sono cambiate?`)

// Anche un ciclo fa fallire: costa poco toglierlo appena nato. Zero file letti
// non è un progetto in ordine.
const guasti = rilievi.length + giri.length + conTrePunti.length + ricopiate.length + rientri.length
process.exitCode = guasti || pochi ? 1 : 0
