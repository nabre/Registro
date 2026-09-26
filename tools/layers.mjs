/**
 * Verifica che nessun import attraversi un confine fra i cinque strati di
 * `docs/IMPIANTO.md` (`core`, `contract`, `desktop`, `ui`, `cli`). La tabella
 * `STRATI` mappa l'albero attuale sugli strati.
 *
 *   1. Le frecce vanno in una direzione sola: `core` non conosce nessuno,
 *      `contract` conosce `core`, `desktop` tutti e due, `ui` la logica pura e
 *      il contratto (mai persistenza né ospite), `cli` nessuno.
 *   2. `core` può importare da `contract` un tipo, mai un valore: `import type`
 *      sparisce alla compilazione.
 *   3. `cli` non importa niente dal progetto, così parte anche a costruzione
 *      rotta (vedi `src/cli/registro.mjs`).
 *
 * Segnala anche i cicli di import (di valore). Legge il testo, non compila:
 * quel che non sa collocare lo dice.
 *
 * Uso: `npm run layers`
 */
import { readFileSync, statSync } from 'node:fs'
import { join, normalize } from 'node:path'

import { fileSotto, piano } from './common.mjs'

// ------------------------------------------------------------------ la mappa

/**
 * Da percorso a strato. Vince la prima riga che combacia: le eccezioni stanno
 * sopra la regola che allargano.
 */
const STRATI = [
  // I file puri di `environment/`: valori, non capacità (IMPIANTO § 2, § 7).
  // `watcher.ts` no: importa `environment/context.ts`, che è Electron.
  ['src/environment/uri.ts', 'core'],
  ['src/environment/events.ts', 'core'],
  ['src/environment/enumerations.ts', 'core'],

  // Il condotto è un trasporto, non il contratto.
  ['src/api/transports/', 'desktop'],

  // Il dispositivo multilingua: puro e sotto a tutti. La riga di comando ha i
  // suoi testi per non importare niente.
  ['src/i18n/', 'core'],

  ['src/domain/', 'core'],
  ['src/data/', 'core'],
  ['src/actions/', 'core'],

  ['src/api/', 'contract'],
  ['src/protocol.ts', 'contract'],
  ['src/manifest.ts', 'contract'],
  ['src/manifest.testi.ts', 'contract'],
  ['src/actions.ts', 'contract'],

  ['src/ui/', 'ui'],

  ['src/environment/', 'desktop'],
  ['src/panels/', 'desktop'],
  ['src/startup.ts', 'desktop'],
  ['src/startup.testi.ts', 'desktop'],
  ['src/tray.ts', 'desktop'],
  ['src/tray.testi.ts', 'desktop'],
  ['src/reminders.ts', 'desktop'],
  ['shell/', 'desktop'],

  ['src/cli/', 'cli'],

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
 * Le deroghe, ognuna con il motivo: punti in cui `src/actions/` contiene
 * capacità dell'ospite invece di logica (IMPIANTO § 2).
 */
const DEROGHE = [
  {
    da: 'src/actions/projection.ts',
    a: 'src/panels/projection.ts',
    perche:
      'Non è logica: apre una finestra e ci punta la mira — «nessuna di queste azioni tocca ' +
      'il registro», dice il file stesso. Va in desktop/ al passo 7.',
  },
  {
    da: 'src/actions/documents.ts',
    a: 'src/environment/documents.ts',
    perche:
      'L’elenco dei documenti recenti sta in `userData`: è una capacità dell’ospite, e passa ' +
      'nell’Impianto al passo 6.',
  },
  {
    da: 'src/actions/system.ts',
    a: 'src/environment/settings.ts',
    perche:
      '`vociImpostazioni` e `valoreConMotivo` sono dati dichiarativi travestiti da ambiente: ' +
      'appartengono al manifesto, e ci vanno al passo 3.',
  },
]

/**
 * Le parti di `core` vietate a `ui`: il dominio gira in un browser, i dati e
 * le azioni aprono file. La regola delle frecce da sola non lo dice.
 */
const VIETATI_A_UI = ['src/data/', 'src/actions/', 'core/data/', 'core/actions/', 'core/platform/']

// ------------------------------------------------------------------- leggere

const RADICI = ['src', 'shell', 'core', 'contract', 'desktop', 'ui', 'cli']

function esiste (percorso) {
  try {
    statSync(percorso)
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

const sorgenti = RADICI.filter(esiste).flatMap((r) => fileSotto(r, ESTENSIONI)).map(piano)
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

  for (const { verso, riga, soloTipo } of importazioni(readFileSync(percorso, 'utf8'))) {
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

// Anche un ciclo fa fallire: costa poco toglierlo appena nato.
process.exitCode = rilievi.length || giri.length ? 1 : 0
