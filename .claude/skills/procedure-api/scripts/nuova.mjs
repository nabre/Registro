/**
 * Apre una procedura nuova: il file al posto giusto, le cartelle che mancano,
 * gli indici fino a `src/api/indice.ts`.
 *
 * Fa la parte meccanica — quella in cui si sbaglia per distrazione e non per
 * giudizio — e si ferma prima di quella che richiede di pensare: lo schema
 * dell'ingresso, le guardie, il lavoro. Quelli restano da scrivere, e il file
 * che esce di qui lo dice con dei segnaposto che non compilano, apposta: una
 * procedura mezza scritta che compila è una procedura che qualcuno dimentica
 * mezza scritta.
 *
 * Uso:
 *   node .claude/skills/procedure-api/scripts/nuova.mjs ore.appello.casella \
 *     --genere scrittura --titolo "Segna una casella dell'appello" \
 *     --azione presenze.ud --collezioni lezioni
 *
 * Opzioni:
 *   --genere      lettura | scrittura        (obbligatoria)
 *   --titolo      una riga per chi non conosce il codice
 *   --azione      l'azione del protocollo che prende in carico, se c'è
 *   --collezioni  le raccolte che tocca, separate da virgola (solo scritture)
 *   --idempotente vero | falso               (predefinito: vero)
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

const PROCEDURE = 'src/api/procedure'
const INDICE = 'src/api/indice.ts'
const PROTOCOLLO = 'src/protocollo.ts'

// ------------------------------------------------------------- gli argomenti

function analizza (argomenti) {
  const opzioni = new Map()
  const liberi = []
  for (let i = 0; i < argomenti.length; i++) {
    const voce = argomenti[i]
    if (!voce.startsWith('--')) { liberi.push(voce); continue }
    const dopo = argomenti[i + 1]
    if (dopo === undefined || dopo.startsWith('--')) opzioni.set(voce.slice(2), 'vero')
    else { opzioni.set(voce.slice(2), dopo); i++ }
  }
  return { liberi, opzioni }
}

function muori (...frasi) {
  for (const frase of frasi) console.error(frase)
  process.exit(1)
}

const { liberi, opzioni } = analizza(process.argv.slice(2))
const nome = liberi[0]

if (!nome) {
  muori(
    'Serve il nome della procedura, nella forma area.cosa.verbo:',
    '  node .claude/skills/procedure-api/scripts/nuova.mjs ore.appello.casella --genere scrittura',
  )
}

// La forma del nome non è un vezzo: è quella che `prove/api/copertura.test.mjs`
// pretende, ed è quella che rende il percorso del file l'indirizzo della
// procedura. Un nome storto si scopre più tardi, quando il file è già scritto.
if (!/^[a-z][a-zA-Z]*(\.[a-z][a-zA-Z]*)+$/.test(nome)) {
  muori(`«${nome}» non è nella forma area.cosa.verbo, tutto in minuscolo e in italiano.`)
}

const genere = opzioni.get('genere')
if (genere !== 'lettura' && genere !== 'scrittura') {
  muori('Serve --genere, «lettura» o «scrittura». Una lettura non tocca mai il registro.')
}

const azione = opzioni.get('azione')
const titolo = opzioni.get('titolo') ?? 'DA SCRIVERE: che cosa fa, in una riga'
const idempotente = (opzioni.get('idempotente') ?? 'vero') !== 'falso'
const collezioni = (opzioni.get('collezioni') ?? '')
  .split(',').map((c) => c.trim()).filter(Boolean)

if (genere === 'lettura' && collezioni.length > 0) {
  muori('Una lettura non dichiara collezioni: o legge, o scrive.')
}
if (genere === 'lettura' && azione) {
  muori('Una lettura non prende in carico un’azione: le azioni sono scritture.')
}

// ----------------------------------------------------------- i conti prima

const segmenti = nome.split('.')
const cartelle = segmenti.slice(0, -1)
const ultimo = segmenti.at(-1)
const percorso = join(PROCEDURE, ...segmenti) + '.ts'

if (existsSync(percorso)) muori(`${percorso} esiste già.`)

// Un nome che è prefisso di un altro vorrebbe dire una cartella e un file con
// lo stesso nome nella stessa cartella. Lo si dice adesso, non a metà.
const dentro = join(PROCEDURE, ...segmenti)
if (existsSync(dentro)) {
  muori(
    `«${nome}» non si può usare: ${dentro}/ è già una cartella, e ci starebbe accanto`,
    `un file ${ultimo}.ts con lo stesso nome. Serve un verbo in fondo: ${nome}.leggi, ${nome}.salva…`,
  )
}
if (existsSync(`${join(PROCEDURE, ...cartelle)}.ts`)) {
  muori(
    `«${nome}» non si può usare: ${join(PROCEDURE, ...cartelle)}.ts è già una procedura,`,
    'e una procedura non può essere anche una cartella.',
  )
}

if (azione) {
  const protocollo = readFileSync(PROTOCOLLO, 'utf8')
  if (!new RegExp(`\\btipo:\\s*'${azione.replace('.', '\\.')}'`).test(protocollo)) {
    muori(
      `L’azione «${azione}» non esiste in ${PROTOCOLLO}.`,
      'Va dichiarata lì, nell’unione `Azione`, prima che una procedura la prenda in carico —',
      'e con lei va contata nei due controlli che leggono quel sorgente:',
      '  prove/api/copertura.test.mjs   («azioni trovate»)',
      '  prove/api/ponte.test.mjs       («tutte e N le scritture»)',
    )
  }
}

// -------------------------------------------------------------- il modello

const capitale = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const cammello = (s) => s.split('.').map((p, i) => (i === 0 ? p : capitale(p))).join('')
const risali = (f) => (f === 0 ? './' : '../'.repeat(f))
const f = cartelle.length

const versoApi = `${risali(f)}../`
const versoAzioni = `${risali(f)}../../azioni/`

const righeImport = [
  ...(azione ? [`import { ${cartelle[0]} } from '${versoAzioni}${cartelle[0]}.js'`] : []),
  `import { definisci } from '${versoApi}contratto.js'`,
  ...(genere === 'scrittura'
    // `daGestore` solo quando c'è un gestore a cui passare la palla: importarlo
    // e non usarlo è un errore di stile, e un file nuovo che non passa
    // `controllo-stile` insegna a dare quel comando più tardi.
    ? [`import { ${azione ? 'daGestore, ' : ''}SCRITTURA } from '${versoApi}nucleo.js'`]
    : []),
  `import { oggetto } from '${versoApi}schemi.js'`,
]

const corpoScrittura = azione
  ? [
      '  esegui: daGestore(',
      `    ${cartelle[0]}['${azione}'],`,
      '    // Il `tipo` è l’indirizzo, non un dato: il gestore riceve i campi e basta.',
      `    (i: { DA_SCRIVERE: string }) => ({ tipo: '${azione}' as const, ...i }),`,
      '  ),',
    ]
  : [
      '  esegui: (ambito, ingresso) => {',
      '    // DA SCRIVERE: le guardie — quel che può non esistere più va detto con',
      '    // `errore.nonTrovato(...)`, quel che non si può fare con `errore.rifiuta(...)`.',
      '    // Poi il lavoro, che sta in `src/azioni/`, non qui.',
      '    throw new Error(`DA SCRIVERE: ${ambito.tracciato} ${JSON.stringify(ingresso)}`)',
      '  },',
    ]

const corpoLettura = [
  '  esegui: (ambito, ingresso) => {',
  '    // DA SCRIVERE: la risposta, calcolata dal dominio e non ricontata qui.',
  '    // Una lettura torna il conto già fatto e una forma piatta e dichiarata,',
  '    // mai i tipi interni: quelli cambiano quando serve al registro, questa no.',
  '    throw new Error(`DA SCRIVERE: ${ambito.tracciato} ${JSON.stringify(ingresso)}`)',
  '  },',
]

const testo = [
  ...righeImport,
  '',
  'export const procedura = definisci({',
  `  nome: '${nome}',`,
  '  versione: 1,',
  `  genere: '${genere}',`,
  `  titolo: '${titolo.replace(/'/g, '’')}',`,
  ...(azione ? [`  azione: '${azione}',`] : []),
  `  idempotente: ${idempotente},`,
  ...(collezioni.length > 0
    ? [`  collezioni: [${collezioni.map((c) => `'${c}'`).join(', ')}],`]
    : []),
  '  ingresso: oggetto({',
  '    // DA SCRIVERE: i campi, con `aiuto:` su ognuno — l’aiuto finisce nel JSON',
  '    // Schema che legge chi chiama da fuori, ed è l’unica frase che riceverà.',
  '  }),',
  ...(genere === 'scrittura'
    ? ['  uscita: SCRITTURA,', ...corpoScrittura]
    : [
        '  uscita: oggetto({',
        '    // DA SCRIVERE: la forma della risposta. È un contratto con chi la legge.',
        '  }),',
        ...corpoLettura,
      ]),
  '})',
  '',
].join('\n')

// ------------------------------------------------------------- gli indici

/** L'indice di una cartella, scritto da zero. */
function indiceVuoto (parti) {
  const profondita = parti.length
  return [
    `// Le procedure di \`${parti.join('.')}\`: un file per procedura, questo`,
    '// le raccoglie, e con loro gli indici delle cartelle sotto.',
    '//',
    "// L'elenco si tiene a mano e non a colpi di glob: un file che c'è ma non è",
    '// nominato qui non si registra, e questo è il punto in cui ci si accorge che',
    '// manca.',
    '',
    `import type { ProceduraQualunque } from '${risali(profondita)}../contratto.js'`,
    '',
    `export const procedure${parti.map(capitale).join('')}: ProceduraQualunque[] = [`,
    ']',
    '',
  ].join('\n')
}

/** Mette una riga di import e una voce nell'array, tenendo l'ordine. */
function innesta (percorsoIndice, rigaImport, voce) {
  const righe = readFileSync(percorsoIndice, 'utf8').split('\n')
  if (righe.some((r) => r === rigaImport)) return false

  // L'import va dopo l'ultimo import che gli sta davanti in ordine, e prima
  // degli import delle cartelle — che eslint vuole dopo i file.
  const cartella = rigaImport.includes('/indice.js')
  let dove = righe.findLastIndex((r) =>
    r.startsWith('import ') && (cartella || !r.includes('/indice.js')) && r < rigaImport)
  if (dove < 0) dove = righe.findLastIndex((r) => r.startsWith('import type '))
  righe.splice(dove + 1, 0, rigaImport)

  const chiusura = righe.findLastIndex((r) => r === ']')
  const voci = []
  for (let i = chiusura - 1; i >= 0 && righe[i].startsWith('  '); i--) voci.unshift(i)
  let posto = chiusura
  for (const i of voci) {
    if (righe[i] > voce) { posto = i; break }
  }
  righe.splice(posto, 0, voce)
  writeFileSync(percorsoIndice, righe.join('\n'), 'utf8')
  return true
}

const fatti = []

mkdirSync(join(PROCEDURE, ...cartelle), { recursive: true })
writeFileSync(percorso, testo, 'utf8')
fatti.push(`scritto  ${percorso}`)

// Dalla cartella del file fino in cima, creando gli indici che mancano e
// legando ognuno al padre.
for (let i = cartelle.length; i >= 1; i--) {
  const parti = cartelle.slice(0, i)
  const indice = join(PROCEDURE, ...parti, 'indice.ts')
  if (!existsSync(indice)) {
    writeFileSync(indice, indiceVuoto(parti), 'utf8')
    fatti.push(`scritto  ${indice}`)
  }

  if (i === cartelle.length) {
    const nuovo = innesta(
      indice,
      `import { procedura as ${cammello(ultimo)} } from './${ultimo}.js'`,
      `  ${cammello(ultimo)},`,
    )
    if (nuovo) fatti.push(`nominata in ${indice}`)
  }

  if (i > 1) {
    const padre = join(PROCEDURE, ...cartelle.slice(0, i - 1), 'indice.ts')
    if (!existsSync(padre)) {
      writeFileSync(padre, indiceVuoto(cartelle.slice(0, i - 1)), 'utf8')
      fatti.push(`scritto  ${padre}`)
    }
    const costante = `procedure${parti.map(capitale).join('')}`
    const nuovo = innesta(
      padre,
      `import { ${costante} } from './${parti.at(-1)}/indice.js'`,
      `  ...${costante},`,
    )
    if (nuovo) fatti.push(`nominata in ${padre}`)
  }
}

// E l'area dentro l'indice vero, se è nata adesso.
const area = cartelle[0]
const costanteArea = `procedure${capitale(area)}`
const generale = readFileSync(INDICE, 'utf8')
if (!generale.includes(`from './procedure/${area}/indice.js'`)) {
  const righe = generale.split('\n')
  const rigaImport = `import { ${costanteArea} } from './procedure/${area}/indice.js'`
  let dove = righe.findLastIndex((r) => r.startsWith('import { procedure') && r < rigaImport)
  if (dove < 0) dove = righe.findLastIndex((r) => r.startsWith('import '))
  righe.splice(dove + 1, 0, rigaImport)

  const voce = `  ...${costanteArea},`
  const chiusura = righe.findIndex((r, i) => r === ']' && i > righe.indexOf('export const TUTTE: ReadonlyArray<ProceduraQualunque> = ['))
  let posto = chiusura
  for (let i = chiusura - 1; i >= 0 && righe[i].startsWith('  ...'); i--) {
    if (righe[i] > voce) posto = i
  }
  righe.splice(posto, 0, voce)
  writeFileSync(INDICE, righe.join('\n'), 'utf8')
  fatti.push(`area «${area}» aggiunta a ${INDICE}`)
}

// ---------------------------------------------------------------- il seguito

for (const fatto of fatti) console.log(`  ${fatto}`)
console.log('')
console.log('Resta da fare, e non lo fa nessuno script:')
console.log(`  1. lo schema dell’ingresso in ${percorso}, con un «aiuto» su ogni campo`)
if (azione) {
  console.log(`  2. che lo schema dichiari OGNI campo di «${azione}»: quelli che non dichiara`)
  console.log('     vengono scartati in silenzio, e la scrittura risponde «fatto» lo stesso')
  console.log('  3. una prova in prove/api/scritture.test.mjs')
} else if (genere === 'scrittura') {
  console.log('  2. le guardie: «non c’è più» va distinto da «non si può»')
  console.log('  3. una prova in prove/api/scritture.test.mjs')
} else {
  console.log('  2. la forma dell’uscita: è un contratto con chi la legge')
  console.log('  3. una prova in prove/api/letture.test.mjs')
}
console.log('  4. npm run procedure   che l’albero stia in piedi')
console.log('  5. npm run attrezzi    il catalogo per il modello')
console.log('  6. npm run controllo-tipi && npm run controllo-stile && npm test')
