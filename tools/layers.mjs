/**
 * Verifica che nessun import attraversi un confine fra strati.
 *
 * Il registro sta passando ai cinque strati di `docs/IMPIANTO.md` — `core`,
 * `contract`, `desktop`, `ui`, `cli` — e una regola d'architettura che nessuno
 * controlla dura fino al prossimo `import` comodo. Questo script è quel
 * controllo, e nasce **prima** degli spostamenti apposta: scritto contro
 * l'albero di oggi dice già la verità su oggi, e a ogni passo della migrazione
 * basta aggiornare la tabella qui sotto perché continui a dirla.
 *
 * Le tre regole che difende:
 *
 *   1. **Le frecce vanno in una direzione sola.** `core` non conosce nessuno;
 *      `contract` conosce `core`; `desktop` conosce tutti e due; `ui` conosce
 *      la logica pura e il contratto, mai la persistenza né l'ospite; `cli`
 *      non conosce nessuno — nemmeno il contratto.
 *
 *   2. **`core` può importare un *tipo* da `contract`, mai un valore.** Un
 *      `import type` sparisce alla compilazione: è codice che dichiara la forma
 *      di quel che riceve, non codice che dipende. Un import normale, invece,
 *      lega il nucleo al contratto e se lo porta dentro ogni bundle.
 *
 *   3. **`cli` non importa niente dal progetto.** È la proprietà per cui si
 *      avvia anche quando la costruzione del registro è rotta — cioè
 *      esattamente quando serve. Vedi la testa di `src/cli/registro.mjs`.
 *
 * In coda segnala anche i **cicli di import**: non è un guasto finché nessuno
 * dei due file legge a livello di modulo un valore dell'altro, ma è il posto
 * da cui quel guasto nasce, e va visto.
 *
 * Non è un compilatore: legge il testo, come gli altri controlli di questa
 * cartella. Quel che non sa collocare lo dice invece di tacerlo.
 *
 * Uso: `npm run layers`
 */
import { readFileSync, statSync } from 'node:fs'
import { join, normalize } from 'node:path'

import { fileSotto, piano } from './common.mjs'

// ------------------------------------------------------------------ la mappa

/**
 * Da percorso a strato, oggi.
 *
 * L'ordine conta: vince la prima riga che combacia, quindi le eccezioni stanno
 * sopra la regola che allargano. Alla fine della migrazione questa tabella
 * diventa cinque righe — `core/`, `contract/`, `desktop/`, `ui/`, `cli/` — e
 * tutto il resto sparisce.
 */
const STRATI = [
  // I tre file davvero puri di `ambiente/`: valori, non capacità. Vanno in
  // `core/apparato/` (IMPIANTO § 2, § 7).
  //
  // `watcher.ts` sembrava essere il quarto e non lo è: importa
  // `environment/context.ts`, che è Electron. Se ne è accorto questo script il
  // giorno in cui è stato scritto, che è esattamente il lavoro per cui esiste.
  ['src/environment/uri.ts', 'core'],
  ['src/environment/events.ts', 'core'],
  ['src/environment/enumerations.ts', 'core'],

  // Il condotto è un trasporto, non il contratto: diventa `desktop/link/socket.ts`.
  ['src/api/transports/', 'desktop'],

  ['src/domain/', 'core'],
  ['src/data/', 'core'],
  ['src/actions/', 'core'],

  ['src/api/', 'contract'],
  ['src/protocol.ts', 'contract'],
  ['src/manifest.ts', 'contract'],
  ['src/actions.ts', 'contract'],

  ['src/ui/', 'ui'],

  ['src/environment/', 'desktop'],
  ['src/panels/', 'desktop'],
  ['src/startup.ts', 'desktop'],
  ['src/agenda.ts', 'desktop'],
  ['src/tray.ts', 'desktop'],
  ['src/reminders.ts', 'desktop'],
  ['shell/', 'desktop'],

  ['src/cli/', 'cli'],

  // Dopo la migrazione, quando le cartelle si chiamano come gli strati.
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
 * Le deroghe, una per una, con dentro il motivo e il passo che la toglie.
 *
 * Un'eccezione senza scadenza è una regola in meno. Queste tre ce l'hanno
 * scritta, e dicono tutte la stessa cosa: sono i punti in cui `azioni/` non
 * contiene logica ma **capacità dell'ospite**, e sono quelli da cui comincia
 * l'inversione di IMPIANTO § 2.
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
      '`vociImpostazioni` e `valoreAccettabile` sono dati dichiarativi travestiti da ambiente: ' +
      'appartengono al manifesto, e ci vanno al passo 3.',
  },
]

/**
 * `ui` non deve raggiungere la persistenza né l'ospite nemmeno passando per
 * `core`: `core/dominio` è logica pura e gira in un browser, `core/dati` apre
 * file. La regola delle frecce non basta a dirlo, quindi lo si dice qui.
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
 * Vero se la dichiarazione porta dentro soltanto dei tipi.
 *
 * Due forme, tutte e due in uso qui: `import type { X } from` e
 * `import { type X, type Y } from`. La seconda è di soli tipi solo se **ogni**
 * voce lo è — basta un nome nudo in mezzo e alla compilazione resta un import
 * vero, che è quel che la regola 2 vieta a `core`.
 */
function soltantoTipi (dichiarazione) {
  if (/^\s*type\b/.test(dichiarazione)) return true
  const graffe = /\{([\s\S]*)\}/.exec(dichiarazione)
  if (!graffe) return false
  const voci = graffe[1].split(',').map((v) => v.trim()).filter(Boolean)
  return voci.length > 0 && voci.every((v) => /^type\s/.test(v))
}

/**
 * Gli import relativi di un file, con la riga e se sono di soli tipi.
 *
 * Si guardano `import`, `export … from` e `import(…)`: sono i tre modi in cui
 * un file di questo progetto ne tira dentro un altro. I commenti si spengono
 * prima — sostituiti con spazi, così i numeri di riga restano quelli veri — o
 * una riga che *racconta* un import verrebbe contata come un import: in questo
 * progetto, dove i commenti citano il codice per mestiere, succederebbe spesso.
 */
function importazioni (sorgente) {
  const spento = (blocco) => blocco.replace(/[^\n]/g, ' ')
  const netto = sorgente
    .replace(/\/\*[\s\S]*?\*\//g, spento)
    .replace(/^[ \t]*\/\/.*$/gm, spento)

  const esito = []
  const alla = (indice) => netto.slice(0, indice).split('\n').length

  // Il corpo non puo' scavalcare un altro `import`: senza quel divieto una
  // dichiarazione che pesca da `node:` — cioe' da un percorso non relativo —
  // non trovava il proprio `from` relativo e la ricerca tirava avanti fino a
  // quello della dichiarazione **dopo**, inghiottendola. Un `import type`
  // relativo scritto sotto un paio di import di Node finiva cosi' contato come
  // import di valore, e faceva comparire un ciclo che alla compilazione non
  // esiste.
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
    // Solo gli import di **valore** fanno un arco: un ciclo conta perche' uno
    // dei due file puo' leggere a livello di modulo un binding dell'altro
    // prima che esista, e un `import type` sparisce alla compilazione — di
    // notte, in quel grafo, non c'e' nessuno. Contarli faceva comparire cicli
    // che non possono esistere: `actions/context.ts` e `api/contract.ts` si
    // scambiano due `import type` e basta, ed e' precisamente quel che D12
    // permette.
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

// Anche i cicli, adesso che sono zero. Non lo erano — ne restavano sette,
// tutti dentro `interfaccia/` — e finche' erano sette farli fallire avrebbe
// voluto dire uno strumento rosso di suo, cioe' uno strumento che nessuno
// guarda. Sciolti quelli, tenerli a zero costa questa riga: un ciclo non e' un
// guasto, ma e' il posto da cui quel guasto nasce, e il momento in cui si paga
// poco a toglierlo e' quando e' appena nato.
process.exitCode = rilievi.length || giri.length ? 1 : 0
