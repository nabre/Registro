/**
 * Il controllo del dispositivo multilingua. Cerca:
 *
 *   1. Testo fuori catalogo: una stringa che si legge come una frase scritta
 *      nel codice invece che in un `.testi.ts`.
 *   2. Lessico italiano fuori catalogo: la grammatica di `domain/lexicon.ts`
 *      (`del(PIF)`, `frase(...)`) usata fuori da un catalogo italiano.
 *   3. Catalogo letto a livello di modulo: si calcola prima che la lingua sia
 *      scelta e resta in italiano. Fa fallire anche senza `--severo`. Non vale
 *      per le pagine (`src/ui/`, `shell/pages/`), che scelgono la lingua col
 *      primo import (`src/i18n/page.ts`) e si ricaricano al cambio.
 *
 * La prima è un'euristica: quel che non è testo per chi usa il registro si
 * dichiara sulla riga stessa o su quella sopra con `// testo-fisso: <perché>`,
 * e il perché è obbligatorio.
 *
 * Uso:
 *   npm run i18n                          riepilogo per file
 *   npm run i18n -- --elenco [percorso…]  ogni reperto, con la riga
 *   npm run i18n -- --severo              esce con 1 se resta qualcosa (1 e 2)
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'

import { daRadice, fileSotto, RADICE } from './common.mjs'

// ------------------------------------------------------------------ dove

const CARTELLE = ['src', 'shell']

/** I file che non si guardano, con il perché. Pochi apposta. */
const FUORI = [
  // Il dispositivo stesso: non contiene testi, e i nomi delle lingue sono
  // autonimi che non si traducono.
  { prefisso: 'src/i18n/', perche: 'il motore, senza testi' },
  // Il lessico italiano è la fonte del blocco `it` di `lexicon.testi.ts`; il
  // suo uso fuori posto lo trova la domanda 2.
  { prefisso: 'src/domain/lexicon.ts', perche: 'il lessico italiano, fonte del catalogo' },
  // Generato da `npm run templates`: il testo è quello dei modelli.
  { prefisso: 'src/data/defaultTemplates.ts', perche: 'generato dai modelli' },
  // Le vacanze del Ticino come le pubblica il Cantone: dati, non parole del registro.
  { prefisso: 'src/data/schoolCalendarTicino.ts', perche: 'dati del Cantone, generati' },
  // La riga di comando ha i suoi testi, senza import.
  { prefisso: 'src/cli/', perche: 'la riga di comando ha i suoi testi' },
]

const argomenti = process.argv.slice(2)
const elenco = argomenti.includes('--elenco')
const severo = argomenti.includes('--severo')
const filtri = argomenti.filter((a) => !a.startsWith('--')).map((a) => a.replace(/\\/g, '/'))

// ---------------------------------------------------------- che cosa è testo

/** Una parola: lettere, con l'apostrofo o il trattino dentro, e la punteggiatura attorno. */
const PAROLA = /^[«"(“‘¿¡]*\p{L}[\p{L}’'-]*[»".,;:!?)”’…]*$/u

/** Una lettera che l'inglese del codice non scrive mai. */
const DA_LINGUA = /[àèéìòùÀÈÉÌÒÙ’«»…]/u

/**
 * Le parole sole che hanno la maiuscola e non sono testo: nomi di tasti e di
 * eventi del DOM, valori che Electron o il sistema si aspettano scritti così.
 */
const PAROLE_DI_CODICE = new Set([
  'Escape', 'Enter', 'Tab', 'Backspace', 'Delete', 'Home', 'End', 'Shift', 'Control', 'Alt',
  'Meta', 'Insert', 'Space', 'Bearer', 'Basic', 'Content', 'Mozilla', 'Windows', 'Linux',
  'Darwin', 'Electron', 'Chrome', 'Chromium', 'Outlook', 'Teams', 'Skype', 'GitHub', 'Node',
  'Registro', 'Arial', 'Helvetica', 'Segoe', 'Courier', 'Times', 'Symbol', 'Consolas',
  'Error', 'TypeError', 'RangeError', 'Object', 'Array', 'String', 'Number', 'Boolean',
  'Date', 'Promise', 'Uint8Array', 'Buffer', 'Infinity', 'NaN', 'None', 'True', 'False',
  'Bypass', 'Hidden', 'Unknown', 'Normal', 'Maximized', 'Minimized',
])

/** Le proprietà il cui valore non è mai testo: classi, identificatori, ruoli. */
const PROPRIETA_DI_CODICE = new Set([
  'class', 'className', 'classe', 'id', 'tipo', 'chiave', 'role', 'type', 'kind',
  'href', 'src', 'rel', 'target', 'name', 'for', 'key', 'icona', 'icon', 'formato', 'metodo',
  'canale', 'comando', 'vista', 'destinazione', 'percorso', 'estensione', 'mime', 'lang',
  'autocomplete', 'inputmode', 'accept', 'pattern', 'step', 'method', 'encoding', 'charset',
  'scorciatoia', 'accelerator', 'stile', 'style', 'colore', 'tono', 'variante', 'data',
])

/** Le chiamate i cui argomenti sono selettori, classi o codici, mai testo. */
const CHIAMATE_DI_CODICE = new Set([
  'querySelector', 'querySelectorAll', 'closest', 'matches', 'getElementById',
  'add', 'remove', 'toggle', 'contains', 'setAttribute', 'getAttribute', 'removeAttribute',
  'hasAttribute', 'addEventListener', 'removeEventListener', 'createElement', 'require',
  'registerCommand', 'executeCommand', 'getConfiguration', 'get', 'has', 'startsWith',
  'endsWith', 'includes', 'split', 'join', 'replace', 'replaceAll', 'indexOf', 'on', 'once',
  'off', 'emit', 'send', 'sendSync', 'invoke', 'handle', 'postMessage', 'getPath', 'setPath',
  'appendSwitch', 'setAppUserModelId', 'Symbol', 'toLocaleString', 'toLocaleDateString',
  'toLocaleTimeString', 'localeCompare', 'Intl', 'NumberFormat', 'DateTimeFormat', 'Collator',
])

/** Gli oggetti le cui chiamate sono per chi sviluppa, non per chi usa il registro. */
const OGGETTI_DI_CODICE = new Set(['console', 'process', 'JSON', 'path', 'percorso', 'Buffer'])

/**
 * Vero se il testo si legge come una frase: due parole vere, una sola con la
 * maiuscola che non sia codice, o una lettera accentata o un segno tipografico.
 * Percorsi, indirizzi e selettori non sono parole.
 */
function èTesto (testo, conSegnaposti) {
  const pulito = testo.trim()
  if (!pulito) return false
  if (/^(?:[a-z]+:\/\/|\/|\.{1,2}\/|#|\.|@|\$\{)/.test(pulito)) return false
  const pezzi = pulito.split(/\s+/)
  const parole = pezzi.filter((p) => PAROLA.test(p) && /\p{L}{2}/u.test(p))
  if (DA_LINGUA.test(pulito) && parole.length > 0) return true
  if (parole.length >= 2 && parole.length >= pezzi.length / 2) {
    // Un elenco di classi CSS: tutte parole minuscole con il trattino dentro.
    if (pezzi.every((p) => /^[a-z0-9]+(?:[-_]{1,2}[a-z0-9]+)+$/.test(p) || /^[a-z]+$/.test(p)) &&
        pezzi.some((p) => /[-_]/.test(p))) return false
    return true
  }
  if (parole.length === 1 && pezzi.length === 1) {
    const sola = parole[0].replace(/[^\p{L}’'-]/gu, '')
    if (PAROLE_DI_CODICE.has(sola)) return false
    if (/^\p{Lu}\p{Ll}{2,}$/u.test(sola)) return true
    // Una parola minuscola in un modello con segnaposti: `${n} lezioni`.
    if (conSegnaposti && /^\p{Ll}{3,}$/u.test(sola)) return true
  }
  if (conSegnaposti && parole.length >= 1 && /\s/.test(testo)) return true
  return false
}

// ------------------------------------------------ la grammatica italiana fuori posto

/**
 * I nomi di `domain/lexicon.ts` che compongono italiano: fuori da un catalogo
 * italiano scrivono italiano in tutte le lingue.
 */
const LESSICO_ITALIANO = new Set([
  'PIF', 'UD', 'FASCIA', 'PERSONE', 'SCUOLA', 'LEZIONE', 'VALUTAZIONE', 'CARTE',
  'il', 'i', 'del', 'dei', 'al', 'ai', 'un', 'con', 'accorda', 'frase',
  'DOCUMENTO_SCHEDE', 'VOCI_PRESENZA', 'STATI_PRESENZA', 'ETICHETTE_TELEFONO', 'TIPI_ATTIVITA',
  'RAGGRUPPAMENTI', 'TIPI_VALUTAZIONE', 'TIPI_OSSERVAZIONE', 'STATI_LEZIONE', 'TIPI_CONSEGNA',
  'CATEGORIE_DOCUMENTO', 'RUOLI_ALLEGATO',
])

// ------------------------------------------------------------------ leggere

function daSaltare (relativo) {
  if (relativo.endsWith('.testi.ts')) return true
  return FUORI.some((f) => relativo.startsWith(f.prefisso))
}

/** Le righe con `// testo-fisso: <perché>`, e quelle subito sotto. */
function righeEsenti (sorgente) {
  const esenti = new Set()
  sorgente.split('\n').forEach((riga, indice) => {
    if (/\/\/\s*testo-fisso:\s*\S/.test(riga)) {
      esenti.add(indice + 1)
      esenti.add(indice + 2)
    }
  })
  return esenti
}

function nomeDellaChiamata (nodo) {
  const bersaglio = nodo.expression
  if (ts.isIdentifier(bersaglio)) return { nome: bersaglio.text, oggetto: null }
  if (ts.isPropertyAccessExpression(bersaglio)) {
    let radice = bersaglio.expression
    while (ts.isPropertyAccessExpression(radice) || ts.isCallExpression(radice)) {
      radice = ts.isCallExpression(radice) ? radice.expression : radice.expression
    }
    return { nome: bersaglio.name.text, oggetto: ts.isIdentifier(radice) ? radice.text : null }
  }
  return { nome: null, oggetto: null }
}

/** Vero se la stringa sta in un posto in cui non può essere testo per una persona. */
function posizioneDiCodice (nodo) {
  const padre = nodo.parent
  if (!padre) return false
  if (ts.isImportDeclaration(padre) || ts.isExportDeclaration(padre)) return true
  if (ts.isExternalModuleReference(padre) || ts.isImportTypeNode?.(padre)) return true
  if (ts.isLiteralTypeNode(padre)) return true
  if (ts.isPropertyAssignment(padre) && padre.name === nodo) return true
  if (ts.isPropertyAssignment(padre) && padre.initializer === nodo) {
    const chiave = padre.name
    const nome = ts.isIdentifier(chiave) || ts.isStringLiteral(chiave) ? chiave.text : ''
    if (PROPRIETA_DI_CODICE.has(nome)) return true
    // `data-*` e simili sono codice; `aria-label` e `aria-description` si leggono.
    if (!nome.startsWith('aria-') && /^[a-z]+-[a-z-]+$/.test(nome)) return true
  }
  if (ts.isElementAccessExpression(padre) && padre.argumentExpression === nodo) return true
  if (ts.isCaseClause(padre)) return true
  if (ts.isBinaryExpression(padre) &&
      [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken,
        ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken]
        .includes(padre.operatorToken.kind)) return true
  if (ts.isTaggedTemplateExpression(padre)) return true
  // Dentro una chiamata di codice, anche annidata in un modello: `console.log(`…`)`.
  for (let su = padre; su; su = su.parent) {
    if (ts.isCallExpression(su) || ts.isNewExpression(su)) {
      const { nome, oggetto } = ts.isCallExpression(su)
        ? nomeDellaChiamata(su)
        : { nome: null, oggetto: null }
      if (oggetto && OGGETTI_DI_CODICE.has(oggetto)) return true
      if (nome && CHIAMATE_DI_CODICE.has(nome) && su.arguments.some((a) => contiene(a, nodo))) {
        // Il primo argomento di `get` e di `has` è una chiave; gli altri no.
        return true
      }
      break
    }
    if (ts.isBlock(su) || ts.isSourceFile(su)) break
  }
  return false
}

function contiene (esterno, interno) {
  return interno.pos >= esterno.pos && interno.end <= esterno.end
}

function dentroUnaFunzione (nodo) {
  for (let su = nodo.parent; su; su = su.parent) {
    if (ts.isFunctionLike(su) || ts.isClassStaticBlockDeclaration?.(su)) return true
  }
  return false
}

/** Le chiavi `export const` di un catalogo: tutte, perché il catalogo è una funzione. */
function importatiDaCataloghi (sorgente) {
  const nomi = new Set()
  const lessico = new Set()
  for (const istruzione of sorgente.statements) {
    if (!ts.isImportDeclaration(istruzione) || !istruzione.importClause) continue
    const da = istruzione.moduleSpecifier.text
    const legami = istruzione.importClause.namedBindings
    if (!legami || !ts.isNamedImports(legami)) continue
    for (const voce of legami.elements) {
      if (voce.isTypeOnly || istruzione.importClause.isTypeOnly) continue
      if (da.endsWith('.testi.js')) nomi.add(voce.name.text)
      if (/(^|\/)lexicon\.js$/.test(da) && LESSICO_ITALIANO.has((voce.propertyName ?? voce.name).text)) {
        lessico.add(voce.name.text)
      }
    }
  }
  return { nomi, lessico }
}

function esamina (percorso) {
  const relativo = daRadice(percorso, RADICE)
  const testo = readFileSync(percorso, 'utf8')
  const esenti = righeEsenti(testo)
  const sorgente = ts.createSourceFile(percorso, testo, ts.ScriptTarget.Latest, true)
  const { nomi, lessico } = importatiDaCataloghi(sorgente)
  // Le pagine scelgono la lingua prima di caricare il resto: vedi la testa del file.
  const diPagina = relativo.startsWith('src/ui/') || relativo.startsWith('shell/pages/')
  const reperti = []
  const riga = (nodo) => sorgente.getLineAndCharacterOfPosition(nodo.getStart(sorgente)).line + 1

  const visita = (nodo) => {
    if (ts.isStringLiteral(nodo) || ts.isNoSubstitutionTemplateLiteral(nodo)) {
      const n = riga(nodo)
      if (!esenti.has(n) && èTesto(nodo.text, false) && !posizioneDiCodice(nodo)) {
        reperti.push({ tipo: 'testo', riga: n, testo: nodo.text })
      }
    } else if (ts.isTemplateExpression(nodo)) {
      const n = riga(nodo)
      const statico = [nodo.head.text, ...nodo.templateSpans.map((s) => s.literal.text)].join(' ')
      if (!esenti.has(n) && èTesto(statico, true) && !posizioneDiCodice(nodo)) {
        reperti.push({ tipo: 'testo', riga: n, testo: nodo.getText(sorgente).slice(0, 120) })
      }
      // I segnaposti possono avere dentro altri modelli e altre chiamate.
      ts.forEachChild(nodo, visita)
      return
    } else if (ts.isCallExpression(nodo) && ts.isIdentifier(nodo.expression) &&
               nomi.has(nodo.expression.text) && !dentroUnaFunzione(nodo) && !diPagina) {
      reperti.push({ tipo: 'modulo', riga: riga(nodo), testo: nodo.getText(sorgente).slice(0, 120) })
    } else if (ts.isIdentifier(nodo) && lessico.has(nodo.text) &&
               !ts.isImportSpecifier(nodo.parent) && !esenti.has(riga(nodo))) {
      reperti.push({ tipo: 'lessico', riga: riga(nodo), testo: nodo.text })
    }
    ts.forEachChild(nodo, visita)
  }
  visita(sorgente)
  return { relativo, reperti }
}

/** Il testo di un file HTML delle pagine native: quel che sta fra i tag, e gli attributi che si leggono. */
function esaminaHtml (percorso) {
  const relativo = daRadice(percorso, RADICE)
  const testo = readFileSync(percorso, 'utf8')
  const reperti = []
  const righe = testo.split('\n')
  righe.forEach((contenuto, indice) => {
    if (/<!--\s*testo-fisso:/.test(contenuto)) return
    const senzaCommenti = contenuto.replace(/<!--.*?-->/g, '')
    for (const [, fra] of senzaCommenti.matchAll(/>([^<>]+)</g)) {
      if (èTesto(fra, false)) reperti.push({ tipo: 'testo', riga: indice + 1, testo: fra.trim() })
    }
    for (const [, , valore] of senzaCommenti.matchAll(/\b(title|placeholder|aria-label|alt)="([^"]+)"/g)) {
      if (èTesto(valore, false)) reperti.push({ tipo: 'testo', riga: indice + 1, testo: valore })
    }
  })
  return { relativo, reperti }
}

// ------------------------------------------------------------------ contare

const percorsi = CARTELLE.flatMap((c) => fileSotto(join(RADICE, c), ['.ts', '.html']))
const esiti = percorsi
  .map((p) => ({ p, relativo: daRadice(p, RADICE) }))
  .filter(({ relativo }) => !daSaltare(relativo))
  .filter(({ relativo }) => filtri.length === 0 || filtri.some((f) => relativo.startsWith(f)))
  .map(({ p }) => (p.endsWith('.html') ? esaminaHtml(p) : esamina(p)))
  .filter((e) => e.reperti.length > 0)

const conta = (tipo) =>
  esiti.reduce((somma, e) => somma + e.reperti.filter((r) => r.tipo === tipo).length, 0)
const testi = conta('testo')
const lessici = conta('lessico')
const moduli = conta('modulo')

if (elenco) {
  for (const { relativo, reperti } of esiti) {
    console.log(`\n${relativo}`)
    for (const r of reperti) {
      const segno = { testo: '  ', lessico: 'L ', modulo: '!!' }[r.tipo]
      console.log(`  ${segno}${String(r.riga).padStart(5)}  ${r.testo.replace(/\s+/g, ' ')}`)
    }
  }
  console.log('')
} else {
  const perFile = esiti
    .map((e) => ({ relativo: e.relativo, quanti: e.reperti.length }))
    .sort((a, b) => b.quanti - a.quanti)
  const perCartella = new Map()
  for (const { relativo, quanti } of perFile) {
    const cartella = relativo.split('/').slice(0, 3).join('/')
    perCartella.set(cartella, (perCartella.get(cartella) ?? 0) + quanti)
  }
  console.log('Per cartella:')
  for (const [cartella, quanti] of [...perCartella].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(quanti).padStart(6)}  ${cartella}`)
  }
  console.log('\nI file con più reperti:')
  for (const { relativo, quanti } of perFile.slice(0, 40)) {
    console.log(`  ${String(quanti).padStart(6)}  ${relativo}`)
  }
}

console.log(
  `\nTesti fuori catalogo: ${testi} · lessico italiano fuori catalogo: ${lessici} · ` +
  `cataloghi letti a livello di modulo: ${moduli}`,
)
if (moduli > 0) {
  console.log('\nUn catalogo letto a livello di modulo resta nella lingua dell’avvio: va letto dentro una funzione.')
}

process.exitCode = moduli > 0 || (severo && testi + lessici > 0) ? 1 : 0
