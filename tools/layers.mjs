/**
 * Verifica che nessun import attraversi un confine fra i cinque strati di
 * `docs/ARCHITETTURA.md` (`core`, `contract`, `desktop`, `ui`, `cli`). La tabella
 * `STRATI` mappa l'albero attuale sugli strati.
 *
 *   1. Le frecce vanno in una direzione sola: `core` non conosce nessuno,
 *      `contract` conosce `core`, `desktop` tutti e due, `ui` la logica pura e
 *      il contratto (mai persistenza né ospite), `cli` nessuno.
 *   2. `core` può importare da `contract` un tipo, mai un valore: `import type`
 *      sparisce alla compilazione.
 *   3. `cli` non importa niente dal progetto, così parte anche a costruzione
 *      rotta (vedi `cli/registro.mjs`).
 *
 * Segnala anche i cicli di import (di valore). Legge il testo, non compila:
 * quel che non sa collocare lo dice.
 *
 * E tre regole che si vedono solo nel testo: nessuno specificatore con un
 * segmento `...`; le regole del dominio scritte una volta sola (soglia,
 * estremi dell'anno, nome, allievi attivi, UD); nessun gestore che rientra in
 * `chiama()`.
 *
 * Uso: `npm run layers`
 */
import { readFileSync, statSync } from 'node:fs'
import { join, normalize } from 'node:path'

import { RADICE, daRadice, fileSotto, piano } from './common.mjs'

// ------------------------------------------------------------------ la mappa

/**
 * Da percorso a strato. Vince la prima riga che combacia: le eccezioni stanno
 * sopra la regola che allargano.
 */
const STRATI = [
  ['core/apparato/', 'core'],
  ['core/i18n/', 'core'],
  ['core/dominio/', 'core'],
  ['core/dati/', 'core'],
  ['core/azioni/', 'core'],

  // Il condotto è un trasporto, non il contratto.
  ['desktop/transports/', 'desktop'],
  ['desktop/azioni/', 'desktop'],

  ['contract/', 'contract'],
  ['contract/protocollo.ts', 'contract'],
  ['contract/manifesto.ts', 'contract'],
  ['contract/manifesto.testi.ts', 'contract'],
  ['contract/centralino.ts', 'contract'],

  ['desktop/apparato/', 'desktop'],
  ['desktop/pannelli/', 'desktop'],
  ['desktop/avvio.ts', 'desktop'],
  ['desktop/avvio.testi.ts', 'desktop'],
  ['desktop/widget/tray.ts', 'desktop'],
  ['desktop/widget/tray.testi.ts', 'desktop'],
  ['desktop/widget/reminders.ts', 'desktop'],
  ['desktop/shell/', 'desktop'],

  ['cli/', 'cli'],

  // Le cartelle che portano già il nome dello strato.
  ['core/', 'core'],
  ['contract/', 'contract'],
  ['desktop/', 'desktop'],
  ['ui/', 'ui'],
  ['cli/', 'cli'],
]

/** Chi può importare chi, con un valore. */
const PERMESSI = {
  core: ['core'],
  contract: ['contract', 'core'],
  desktop: ['desktop', 'contract', 'core'],
  ui: ['ui', 'contract', 'core'],
  cli: ['cli'],
}

/** Chi può importare chi, se è un `import type` soltanto. */
const PERMESSI_TIPO = {
  core: ['core', 'contract'],
  contract: ['contract', 'core'],
  desktop: ['desktop', 'contract', 'core'],
  ui: ['ui', 'contract', 'core'],
  cli: ['cli'],
}

/**
 * Le deroghe, ognuna con il motivo: punti in cui `core/azioni/` contiene
 * capacità dell'ospite invece di logica (IMPIANTO § 2).
 */
const DEROGHE = []

/**
 * Le parti di `core` vietate a `ui`: il dominio gira in un browser, i dati e
 * le azioni aprono file. La regola delle frecce da sola non lo dice.
 */
const VIETATI_A_UI = ['core/dati/', 'core/azioni/', 'core/data/', 'core/actions/', 'core/platform/']

// ------------------------------------------------------------------- leggere

const RADICI = ['src', 'shell', 'core', 'contract', 'desktop', 'ui', 'cli']

function esiste (percorso) {
  try {
    statSync(join(RADICE, percorso))
    return true
  } catch {
    return false
  }
}

/** Anche gli `.mjs`: la riga di comando è codice, e ha i suoi confini da rispettare. */
const ESTENSIONI = ['.ts', '.mjs']

function stratoDi (percorso) {
  for (const [prefisso, strato] of STRATI) {
    if (percorso === prefisso || percorso.startsWith(prefisso)) return strato
  }
  return null
}

/**
 * Vero se la dichiarazione porta dentro soltanto tipi: `import type { X }`, o
 * `import { type X, type Y }` con ogni voce `type` (un nome nudo lascia un import vero).
 */
function soltantoTipi (dichiarazione) {
  if (/^\s*type\b/.test(dichiarazione)) return true
  const graffe = /\{([\s\S]*)\}/.exec(dichiarazione)
  if (!graffe) return false
  const voci = graffe[1].split(',').map((v) => v.trim()).filter(Boolean)
  return voci.length > 0 && voci.every((v) => /^type\s/.test(v))
}

/**
 * Gli import relativi di un file (`import`, `export … from`, `import(…)`), con
 * la riga e se sono di soli tipi. I commenti diventano spazi prima, così un
 * import citato in un commento non conta e le righe restano quelle vere.
 */
function importazioni (sorgente) {
  const spento = (blocco) => blocco.replace(/[^\n]/g, ' ')
  const netto = sorgente
    .replace(/\/\*[\s\S]*?\*\//g, spento)
    .replace(/^[ \t]*\/\/.*$/gm, spento)

  const esito = []
  const alla = (indice) => netto.slice(0, indice).split('\n').length

  // Il corpo non può scavalcare un altro `import`, o una dichiarazione da
  // `node:` (senza `from` relativo) inghiottirebbe quella dopo.
  const statico =
    /^[ 	]*(?:import|export)((?:(?!(?:import|export))[\s\S])*?)from\s+'(\.[^']+)'/gm
  for (let t = statico.exec(netto); t !== null; t = statico.exec(netto)) {
    esito.push({ verso: t[2], riga: alla(t.index), soloTipo: soltantoTipi(t[1]) })
  }

  const dinamico = /\bimport\(\s*'(\.[^']+)'\s*\)/g
  for (let d = dinamico.exec(netto); d !== null; d = dinamico.exec(netto)) {
    esito.push({ verso: d[1], riga: alla(d.index), soloTipo: false })
  }
  return esito
}

/** Dal `'../pannelli/proiezione.js'` scritto nel codice al file che c'è sul disco. */
function bersaglio (percorsoFile, verso) {
  const cartella = percorsoFile.replace(/\/[^/]*$/, '')
  const t = piano(normalize(join(cartella, verso)))
  return t.endsWith('.js') ? `${t.slice(0, -3)}.ts` : t
}

// ------------------------------------------------------------------ guardare

// Dalla radice del repository, non dalla cartella da cui si lancia: altrove
// non si leggerebbe niente e il controllo passerebbe.
const sorgenti = RADICI
  .filter(esiste)
  .flatMap((r) => fileSotto(join(RADICE, r), ESTENSIONI))
  .map((p) => daRadice(p, RADICE))
const dentro = new Set(sorgenti)
const grafo = new Map()
const rilievi = []
const daGuardare = []
const derogate = new Set()

for (const percorso of sorgenti) {
  const strato = stratoDi(percorso)
  if (!strato) {
    daGuardare.push(`${percorso} — nessuno strato: la tabella di layers.mjs non lo nomina`)
    continue
  }
  const uscite = new Set()

  for (const { verso, riga, soloTipo } of importazioni(readFileSync(join(RADICE, percorso), 'utf8'))) {
    const dove = bersaglio(percorso, verso)
    // Solo gli import di valore fanno un arco: un `import type` sparisce alla
    // compilazione e non può creare un ciclo vero.
    if (dentro.has(dove) && !soloTipo) uscite.add(dove)

    const suo = stratoDi(dove)
    if (!suo || suo === strato) continue

    const deroga = DEROGHE.find((d) => percorso === d.da && dove === d.a)
    if (deroga) {
      derogate.add(`${percorso} → ${dove}\n    ${deroga.perche}`)
      continue
    }

    if (!(soloTipo ? PERMESSI_TIPO : PERMESSI)[strato].includes(suo)) {
      rilievi.push({
        percorso,
        riga,
        gravita: soloTipo ? 'TIPO  ' : 'VALORE',
        dettaglio: `${strato} → ${suo}   ${verso}`,
      })
    } else if (strato === 'ui' && VIETATI_A_UI.some((v) => dove.startsWith(v))) {
      rilievi.push({
        percorso,
        riga,
        gravita: 'VALORE',
        dettaglio: `ui → ${dove}: un webview non può toccare la persistenza né l’ospite`,
      })
    }
  }
  grafo.set(percorso, [...uscite])
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

// --------------------------------------------------------------------- cicli

function cicli () {
  const visti = new Set()
  const pila = []
  const inPila = new Set()
  const trovati = []
  const chiavi = new Set()

  function scendi (nodo) {
    visti.add(nodo)
    pila.push(nodo)
    inPila.add(nodo)
    for (const prossimo of grafo.get(nodo) ?? []) {
      if (inPila.has(prossimo)) {
        const giro = pila.slice(pila.indexOf(prossimo)).concat(prossimo)
        const chiave = [...new Set(giro)].sort().join('|')
        if (!chiavi.has(chiave)) {
          chiavi.add(chiave)
          trovati.push(giro)
        }
      } else if (!visti.has(prossimo)) scendi(prossimo)
    }
    pila.pop()
    inPila.delete(nodo)
  }

  for (const nodo of [...grafo.keys()].sort()) if (!visti.has(nodo)) scendi(nodo)
  return trovati
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

const giri = cicli()
if (giri.length) {
  const corto = (p) => p.replace(/^src\//, '')
  console.log(`\n# Cicli di import: ${giri.length}\n`)
  for (const giro of giri) console.log(`  ${giro.map(corto).join(' → ')}`)
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
  for (const { regola, dove } of ricopiate) console.log(`${dove}  ${regola.nome}: si chiede a ${regola.chiama}`)
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
