/**
 * I campi delle modali che nessuno legge al salvataggio, e le letture di campi
 * che non esistono.
 *
 * In React (ADR-56) la raccolta è automatica: `apriModale({ corpo, alSalva })`
 * passa ad `alSalva` quel che `valoriModulo` trova, cioè ogni elemento con
 * `name` dentro il corpo (`<Campo nome="x">`, `Input`/`Select`/`TextArea` di
 * `ui/fields.tsx`, un `<input name>` scritto a mano). Il legame fra il campo e
 * `valori.x` resta però una stringa, e si rompe in due modi senza nessun errore:
 *
 *   - un campo dichiarato e mai letto: quel che si è scritto sparisce;
 *   - una chiave letta che nessun campo dichiara (un refuso, un campo tolto):
 *     `valori.x` è sempre `undefined` e il salvataggio scrive il vuoto.
 *
 * Il controllo guarda entrambe le direzioni. Legge il programma con il
 * compilatore di TypeScript, come `tools/i18n.mjs` ne usa il parser: ogni nome
 * si risolve al suo simbolo, così si seguono i componenti e le funzioni del
 * corpo (anche importati da un altro file) e `valori` passato intero a
 * un'altra funzione (`recapitiScelti(fascicolo, valori)`), fin dove arriva.
 *
 * Dichiarati: gli attributi `nome`/`name` letterali, o modelli come
 * `` `recapito-${id}` `` che valgono per ogni chiave della stessa forma. Un nome
 * calcolato in altro modo che non arrivi da un parametro (lì lo dichiara chi
 * chiama) rende la seconda direzione cieca, e lo si dice. Non si scende nei
 * mattoni (`ui/components/`, `ui/fields.tsx`) né in un'altra `apriModale`.
 *
 * Un campo con un gestore (`al`, `on…`) porta il valore altrove da sé, e uno
 * spento per sempre si legge soltanto: nessuno dei due si chiede al
 * salvataggio. Una chiave confrontata con `undefined` è letta sapendo che il
 * campo può mancare, e non è un refuso.
 *
 * Letti: le chiavi di `valori` in `alSalva`, e di ogni `valoriModulo(…)` dentro
 * la modale (un'azione secondaria che rilegge i campi). Quando `valori` finisce
 * dove il compilatore non vede (una chiamata di metodo, uno spread) i campi non
 * letti finiscono fra i «da guardare» invece che fra i guasti.
 *
 * Uso: `npm run forms`
 */
import { join } from 'node:path'
import ts from 'typescript'

import { RADICE, daRadice, fileSotto } from './common.mjs'

const PANNELLO = 'ui'

/** Dove non si scende a cercare campi: i mattoni passano `nome` senza dichiararlo. */
const MATTONI = ['ui/components/', 'ui/fields.tsx']

/** I componenti con una prop `nome` che non è il nome di un campo. */
const NOMI_NON_DI_CAMPO = new Set(['Icona', 'CellaNome', 'CorsoPendenza'])

/** Le chiamate che aprono un'altra finestra: i loro campi non sono di questa. */
const ALTRE_MODALI = new Set(['apriModale', 'conferma'])

// ------------------------------------------------------------------ il programma

const radici = fileSotto(join(RADICE, PANNELLO))
const { config } = ts.readConfigFile(join(RADICE, 'tsconfig.json'), ts.sys.readFile)
const { options } = ts.parseJsonConfigFileContent(config, ts.sys, RADICE)
const programma = ts.createProgram(radici, { ...options, noEmit: true })
const cc = programma.getTypeChecker()

/** Il percorso dalla radice del file che contiene il nodo. */
const fileDi = (nodo) => daRadice(nodo.getSourceFile().fileName, RADICE)

/** `file:riga` di un nodo, come i controlli nominano un posto. */
function dove (nodo) {
  const sorgente = nodo.getSourceFile()
  return `${fileDi(nodo)}:${sorgente.getLineAndCharacterOfPosition(nodo.getStart(sorgente)).line + 1}`
}

/** Vero per i file del progetto in cui ha senso seguire un nome. */
function seguibile (nodo) {
  const file = fileDi(nodo)
  return !file.startsWith('..') && !file.includes('node_modules/') && !file.endsWith('.d.ts')
}

/** Il simbolo di un identificatore, oltre l'import. */
function simboloDi (identificatore) {
  const padre = identificatore.parent
  let simbolo = padre && ts.isShorthandPropertyAssignment(padre) && padre.name === identificatore
    ? cc.getShorthandAssignmentValueSymbol(padre)
    : cc.getSymbolAtLocation(identificatore)
  if (simbolo && simbolo.flags & ts.SymbolFlags.Alias) simbolo = cc.getAliasedSymbol(simbolo)
  return simbolo
}

/**
 * Le funzioni (o i JSX in una costante) a cui un nome porta: è lì che si
 * continua a cercare.
 */
function definizioniDi (identificatore) {
  const simbolo = simboloDi(identificatore)
  const trovate = []
  for (const d of simbolo?.declarations ?? []) {
    if (ts.isFunctionDeclaration(d) && d.body) trovate.push(d)
    else if (ts.isVariableDeclaration(d) && d.initializer) trovate.push(d.initializer)
  }
  return trovate
}

/** Vero per una chiamata che apre un'altra finestra. */
function altraModale (nodo) {
  return ts.isCallExpression(nodo) && ts.isIdentifier(nodo.expression) &&
    ALTRE_MODALI.has(nodo.expression.text)
}

/**
 * Vero per una funzione che apre la sua finestra (`moduloCorso` dietro il «+»
 * di un campo): quel che dichiara, dentro o accanto alla sua `apriModale`, è
 * dell'altra finestra. Un `apriModale` dentro un gestore annidato non conta.
 */
function apreUnaModale (definizione) {
  if (!ts.isFunctionLike(definizione)) return false
  let trovata = false
  const cerca = (nodo) => {
    if (trovata) return
    if (ts.isCallExpression(nodo) && ts.isIdentifier(nodo.expression) && nodo.expression.text === 'apriModale' &&
        ts.findAncestor(nodo.parent, ts.isFunctionLike) === definizione) {
      trovata = true
      return
    }
    ts.forEachChild(nodo, cerca)
  }
  ts.forEachChild(definizione, cerca)
  return trovata
}

/**
 * Cammina sotto un nodo e dentro le funzioni e i componenti che nomina, una
 * volta ciascuno, fuori dai mattoni e dalle altre modali.
 *
 * @param {ts.Node} radice
 * @param {(nodo: ts.Node, seguito: boolean) => void} visita `seguito` è vero
 *   dentro una definizione raggiunta per nome, fuori dal corpo scritto.
 */
function percorri (radice, visita) {
  const viste = new Set()
  const cammina = (nodo, seguito) => {
    if (altraModale(nodo)) return
    visita(nodo, seguito)
    if (ts.isIdentifier(nodo)) {
      for (const definizione of definizioniDi(nodo)) {
        const file = fileDi(definizione)
        if (viste.has(definizione) || !seguibile(definizione) || !file.startsWith('ui/')) continue
        if (MATTONI.some((m) => file.startsWith(m)) || file.endsWith('.testi.ts')) continue
        if (apreUnaModale(definizione)) continue
        viste.add(definizione)
        cammina(definizione, true)
      }
    }
    ts.forEachChild(nodo, (figlio) => cammina(figlio, seguito))
  }
  cammina(radice, false)
}

// ------------------------------------------------------------------ i nomi

/**
 * Un nome di campo o una chiave letta: un testo, o un modello con dei buchi
 * (`recapito-${…}`) che vale per ogni testo della stessa forma.
 *
 * @typedef {{ testo: string, modello: RegExp | null }} Nome
 */

const BUCO = '\u0000'

/**
 * Il nome scritto in un'espressione: un letterale, o un modello i cui buchi
 * sono le espressioni calcolate; una costante di testo nel modello vale il
 * suo testo. Un modello fatto solo di buchi varrebbe per ogni nome: non dice
 * niente, ed esce `null` come un nome calcolato.
 *
 * @returns {Nome | null}
 */
function nomeDa (espressione) {
  if (!espressione) return null
  if (ts.isStringLiteral(espressione) || ts.isNoSubstitutionTemplateLiteral(espressione)) {
    return { testo: espressione.text, modello: null }
  }
  if (!ts.isTemplateExpression(espressione)) return null
  const scappa = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let testo = espressione.head.text
  let modello = scappa(testo)
  for (const pezzo of espressione.templateSpans) {
    const fisso = costanteDiTesto(pezzo.expression)
    testo += (fisso ?? BUCO) + pezzo.literal.text
    modello += (fisso === null ? '.*' : scappa(fisso)) + scappa(pezzo.literal.text)
  }
  if (testo.replaceAll(BUCO, '') === '') return null
  return { testo, modello: new RegExp(`^${modello}$`) }
}

/** Il valore con cui nasce una costante (`const CASELLA = 'classe:'`), o `null`. */
function inizialeDiCostante (espressione) {
  if (!ts.isIdentifier(espressione)) return null
  const d = simboloDi(espressione)?.valueDeclaration
  if (!d || !ts.isVariableDeclaration(d)) return null
  return ts.getCombinedNodeFlags(d) & ts.NodeFlags.Const ? d.initializer ?? null : null
}

/** Il testo di una costante di testo, o `null`. */
function costanteDiTesto (espressione) {
  const iniziale = inizialeDiCostante(espressione)
  return iniziale && (ts.isStringLiteral(iniziale) || ts.isNoSubstitutionTemplateLiteral(iniziale))
    ? iniziale.text
    : null
}

/** Due nomi si toccano se uno può essere l'altro. */
function combaciano (a, b) {
  const prova = (x, y) => x.modello ? x.modello.test(y.testo) : x.testo === y.testo
  return prova(a, b) || prova(b, a)
}

const mostra = (nome) => nome.testo.replaceAll(BUCO, '${…}')

/** Vero se l'espressione arriva da un parametro: il nome lo dichiara chi chiama. */
function daParametro (espressione) {
  let radice = espressione
  while (ts.isPropertyAccessExpression(radice) || ts.isElementAccessExpression(radice) ||
         ts.isParenthesizedExpression(radice) || ts.isNonNullExpression(radice)) {
    radice = radice.expression
  }
  if (!ts.isIdentifier(radice)) return false
  /** @type {ts.Node | undefined} */
  let d = simboloDi(radice)?.valueDeclaration
  for (; d; d = d.parent) {
    if (ts.isParameter(d)) return true
    if (ts.isBindingElement(d) || ts.isObjectBindingPattern(d)) continue
    if (!ts.isArrayBindingPattern(d)) break
  }
  return false
}

/** Il nome di una costante: `const nomeAl = `pausa-al-${id}`` vale il suo modello. */
function nomeDaCostante (espressione) {
  return espressione ? nomeDa(inizialeDiCostante(espressione)) : null
}

/**
 * Vero per un campo il cui valore non aspetta il salvataggio: ha un gestore
 * (`al`, `onCambio`, `on…`) che lo porta altrove, o è spento per sempre e si
 * legge soltanto.
 */
function nonAspetta (attributi) {
  return attributi.properties.some((a) => {
    if (!ts.isJsxAttribute(a)) return false
    const nome = a.name.getText()
    if (nome === 'al' || /^on[A-Z]/.test(nome)) return true
    if (nome !== 'disabilitato' && nome !== 'disabled') return false
    const iniziale = a.initializer
    const valore = iniziale && ts.isJsxExpression(iniziale) ? iniziale.expression : null
    return !a.initializer || valore?.kind === ts.SyntaxKind.TrueKeyword
  })
}

/**
 * I nomi che un corpo dichiara. `daLeggere` sono quelli che solo il salvataggio
 * raccoglie; `ciechi` i nomi calcolati che non si sanno leggere: dove ce n'è
 * uno, una chiave letta può venire da lì.
 */
function dichiaratiIn (corpo) {
  /** @type {Nome[]} */
  const nomi = []
  /** @type {Nome[]} */
  const daLeggere = []
  const ciechi = []
  percorri(corpo, (nodo, seguito) => {
    if (!ts.isJsxAttribute(nodo)) return
    const attributo = nodo.name.getText()
    if (attributo !== 'nome' && attributo !== 'name') return
    const elemento = nodo.parent.parent
    if (NOMI_NON_DI_CAMPO.has(elemento.tagName.getText())) return
    const iniziale = nodo.initializer
    const espressione = iniziale && ts.isJsxExpression(iniziale) ? iniziale.expression : iniziale
    const nome = nomeDa(espressione) ?? nomeDaCostante(espressione)
    if (nome) {
      nomi.push(nome)
      if (!nonAspetta(nodo.parent)) daLeggere.push(nome)
    } else if (!(seguito && espressione && daParametro(espressione))) {
      ciechi.push(dove(nodo))
    }
  })
  return { nomi, daLeggere, ciechi }
}

// ------------------------------------------------------------------ le letture

/** `valori ?? {}`, `valori || {}`: il valore, quando c'è, è quello. */
const OPERATORI_DI_RIPIEGO = [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken]

/** Il nodo che usa davvero un'espressione, oltre parentesi e asserzioni di tipo. */
function chiUsa (nodo) {
  let qui = nodo
  const passa = (padre) => ts.isParenthesizedExpression(padre) || ts.isAsExpression(padre) ||
    ts.isNonNullExpression(padre) || ts.isSatisfiesExpression(padre) ||
    // `c ? valoriModulo(nodo) : {}`, `valori ?? {}`: il valore è sempre quello.
    (ts.isConditionalExpression(padre) && padre.condition !== qui) ||
    (ts.isBinaryExpression(padre) && OPERATORI_DI_RIPIEGO.includes(padre.operatorToken.kind))
  while (passa(qui.parent)) {
    qui = qui.parent
  }
  return { qui, padre: qui.parent }
}

/**
 * Le chiavi lette da un oggetto di valori. `opachi` sono i posti in cui
 * l'oggetto passa dove il compilatore non arriva.
 */
function nuoveLetture () {
  return {
    chiavi: /** @type {Nome[]} */ ([]),
    /** Le chiavi lette sapendo che il campo può mancare: `valori.x !== undefined`. */
    facoltative: /** @type {Nome[]} */ ([]),
    opachi: /** @type {string[]} */ ([]),
    viste: new Set(),
  }
}

/**
 * Vero per `valori.x === undefined` (o `!==`, `==`, `!=`): chi legge sa che il
 * campo può non esserci, e tiene il valore di prima. Non è un refuso.
 */
function confrontoConIndefinito (accesso) {
  const { padre } = chiUsa(accesso)
  if (!ts.isBinaryExpression(padre)) return false
  const uguaglianze = [
    ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken,
    ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken,
  ]
  const altro = padre.left === accesso ? padre.right : padre.left
  return uguaglianze.includes(padre.operatorToken.kind) && ts.isIdentifier(altro) && altro.text === 'undefined'
}

/** Le chiavi lette da una destrutturazione `{ a, b: c, ...resto }`. */
function daDestrutturazione (schema, letture) {
  for (const elemento of schema.elements) {
    if (elemento.dotDotDotToken) {
      letture.opachi.push(`${dove(elemento)} (…resto)`)
      continue
    }
    const chiave = elemento.propertyName ?? elemento.name
    const nome = ts.isIdentifier(chiave) || ts.isStringLiteral(chiave)
      ? { testo: chiave.text, modello: null }
      : null
    if (nome) letture.chiavi.push(nome)
    else letture.opachi.push(`${dove(elemento)} (chiave calcolata)`)
  }
}

/** Ogni uso del simbolo sotto un nodo, salvo la sua dichiarazione. */
function usiDi (simbolo, dentro, letture) {
  const cammina = (nodo) => {
    if (ts.isIdentifier(nodo) && simboloDi(nodo) === simbolo && !dichiarazione(nodo)) {
      usoDi(nodo, letture)
    }
    ts.forEachChild(nodo, cammina)
  }
  cammina(dentro)
}

/** Vero per il nome nel punto in cui si dichiara. */
function dichiarazione (identificatore) {
  const padre = identificatore.parent
  return (ts.isParameter(padre) || ts.isVariableDeclaration(padre) || ts.isBindingElement(padre)) &&
    padre.name === identificatore
}

/** Segue un parametro: le chiavi lette nella funzione che lo riceve. */
function dalParametro (parametro, letture) {
  if (letture.viste.has(parametro)) return
  letture.viste.add(parametro)
  if (parametro.dotDotDotToken) {
    letture.opachi.push(`${dove(parametro)} (parametro resto)`)
  } else if (ts.isObjectBindingPattern(parametro.name)) {
    daDestrutturazione(parametro.name, letture)
  } else if (ts.isIdentifier(parametro.name)) {
    const simbolo = simboloDi(parametro.name)
    if (simbolo) usiDi(simbolo, parametro.parent, letture)
  } else {
    letture.opachi.push(`${dove(parametro)} (parametro)`)
  }
}

/** Che cosa si fa di un'espressione che vale l'oggetto dei valori. */
function usoDi (nodo, letture) {
  const { qui, padre } = chiUsa(nodo)
  if (ts.isPropertyAccessExpression(padre) && padre.expression === qui) {
    const nome = { testo: padre.name.text, modello: null }
    letture.chiavi.push(nome)
    if (confrontoConIndefinito(padre)) letture.facoltative.push(nome)
  } else if (ts.isElementAccessExpression(padre) && padre.expression === qui) {
    const nome = nomeDa(padre.argumentExpression)
    if (nome) letture.chiavi.push(nome)
    else letture.opachi.push(`${dove(padre)} (chiave calcolata)`)
  } else if (ts.isVariableDeclaration(padre) && padre.initializer === qui) {
    if (ts.isObjectBindingPattern(padre.name)) {
      daDestrutturazione(padre.name, letture)
    } else if (ts.isIdentifier(padre.name)) {
      const simbolo = simboloDi(padre.name)
      const ambito = ts.findAncestor(padre, (n) => ts.isFunctionLike(n) || ts.isSourceFile(n))
      if (simbolo && ambito) usiDi(simbolo, ambito, letture)
    }
  } else if (ts.isCallExpression(padre) && padre.arguments.includes(qui)) {
    const indice = padre.arguments.indexOf(qui)
    const definizioni = ts.isIdentifier(padre.expression) ? definizioniDi(padre.expression) : []
    const chiamabile = (d) => seguibile(d) &&
      (ts.isFunctionDeclaration(d) || ts.isArrowFunction(d) || ts.isFunctionExpression(d))
    const trovata = definizioni.find(chiamabile)
    const funzione = /** @type {ts.SignatureDeclaration | undefined} */ (trovata)
    const parametro = funzione?.parameters[indice]
    if (parametro) dalParametro(parametro, letture)
    else letture.opachi.push(`${dove(padre)} (${padre.expression.getText().slice(0, 40)})`)
  } else {
    letture.opachi.push(`${dove(qui)} (${padre.getText().slice(0, 40)})`)
  }
}

/**
 * Le chiavi lette da `alSalva` e da ogni `valoriModulo(…)` della modale. Un
 * `valoriModulo` scritto in una funzione che contiene questa `apriModale` legge
 * la finestra di fuori (l'importazione aperta dal piano rilegge il piano), e
 * non conta.
 */
function lettiIn (chiamata, opzioni) {
  const fuori = new Set()
  for (let su = chiamata.parent; su; su = su.parent) if (ts.isFunctionLike(su)) fuori.add(su)
  const diFuori = (nodo) => !ts.findAncestor(nodo, (n) => n === chiamata) &&
    Boolean(ts.findAncestor(nodo, (n) => fuori.has(n)))

  const letture = nuoveLetture()
  const proprieta = (nome) => opzioni.properties.find((p) => p.name?.getText() === nome)

  const alSalva = proprieta('alSalva')
  /** @type {ts.Node | null} */
  let funzione = alSalva && ts.isPropertyAssignment(alSalva) ? alSalva.initializer : null
  if (funzione && ts.isIdentifier(funzione)) funzione = definizioniDi(funzione)[0] ?? null
  if (funzione && ts.isFunctionLike(funzione) && funzione.parameters[0]) {
    dalParametro(funzione.parameters[0], letture)
  }

  percorri(opzioni, (nodo) => {
    if (ts.isCallExpression(nodo) && ts.isIdentifier(nodo.expression) &&
        nodo.expression.text === 'valoriModulo' && !diFuori(nodo)) {
      usoDi(nodo, letture)
    }
  })
  return { ...letture, salva: Boolean(alSalva) }
}

// ------------------------------------------------------------------ il giro

const rilievi = []
const daGuardare = []

/** Un elenco senza doppi, da leggere: nomi o posti. */
const unici = (voci) => [...new Set(voci.map((v) => typeof v === 'string' ? v : mostra(v)))].join(', ')

function esamina (chiamata, opzioni) {
  const corpo = opzioni.properties.find((p) => p.name?.getText() === 'corpo')
  if (!corpo) return
  const posto = dove(chiamata)
  const dichiarati = dichiaratiIn(corpo)
  const letti = lettiIn(chiamata, opzioni)
  if (dichiarati.nomi.length === 0 && letti.chiavi.length === 0) return

  if (!letti.salva && letti.chiavi.length === 0 && letti.opachi.length === 0) {
    if (dichiarati.daLeggere.length) {
      daGuardare.push(`${posto} — senza \`alSalva\` e senza gestore: ${unici(dichiarati.daLeggere)}`)
    }
    return
  }

  const persi = dichiarati.daLeggere.filter((d) => !letti.chiavi.some((l) => combaciano(d, l)))
  if (persi.length) {
    if (letti.opachi.length) {
      daGuardare.push(`${posto} — non letti qui: ${unici(persi)}; \`valori\` prosegue in ${unici(letti.opachi)}`)
    } else {
      rilievi.push(`${posto}  campi compilati e mai letti: ${unici(persi)}`)
    }
  }

  const inventati = letti.chiavi.filter((l) => !dichiarati.nomi.some((d) => combaciano(d, l)) &&
    !letti.facoltative.some((f) => combaciano(f, l)))
  if (inventati.length) {
    if (dichiarati.ciechi.length) {
      daGuardare.push(`${posto} — lette senza campo visibile: ${unici(inventati)}; nomi calcolati in ${unici(dichiarati.ciechi)}`)
    } else {
      rilievi.push(`${posto}  chiavi lette che nessun campo dichiara: ${unici(inventati)}`)
    }
  }
}

for (const sorgente of programma.getSourceFiles()) {
  if (!fileDi(sorgente).startsWith(`${PANNELLO}/`)) continue
  const cerca = (nodo) => {
    if (ts.isCallExpression(nodo) && ts.isIdentifier(nodo.expression) &&
        nodo.expression.text === 'apriModale' && nodo.arguments[0] &&
        ts.isObjectLiteralExpression(nodo.arguments[0])) {
      esamina(nodo, nodo.arguments[0])
    }
    ts.forEachChild(nodo, cerca)
  }
  cerca(sorgente)
}

if (rilievi.length === 0) {
  console.log('Ogni campo delle modali viene letto al salvataggio, e ogni chiave letta ha il suo campo.')
} else {
  console.log(`# Campi persi o chiavi senza campo: ${rilievi.length}\n`)
  for (const voce of rilievi) console.log(voce)
}

if (daGuardare.length) {
  console.log(`\n# Da guardare a mano: ${daGuardare.length}\n`)
  for (const voce of daGuardare) console.log(voce)
}

// Zero file letti è una radice sbagliata, non un pannello in ordine.
if (radici.length === 0) console.log('Nessun file letto: la radice del progetto è sbagliata?')
process.exitCode = rilievi.length || radici.length === 0 ? 1 : 0
