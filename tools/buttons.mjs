/**
 * I comandi dell'interfaccia che non fanno niente. In React (ADR-56) un
 * `<Pulsante>` senza `al` si disegna, si preme e non succede nulla: `al` è
 * facoltativo perché un `submit` o un pulsante sempre spento non ne hanno
 * bisogno, e il compilatore non può dire quale dei tre casi si voleva. Lo
 * stesso vale per un `<button>` scritto a mano senza nessun gestore `on…`.
 *
 * Legge l'albero di TypeScript (lo stesso parser di `tools/i18n.mjs`), non il
 * testo: un attributo su più righe, un commento o un'espressione con le
 * parentesi dentro non lo confondono.
 *
 * È un guasto un comando senza gestore che non sia `submit`, né spento per
 * sempre, né una presa di riga (`presa-riga`: il comportamento lo attacca
 * `riordinatore`). Fra i «da guardare»:
 *
 *   - un `disabilitato` calcolato o gli attributi sparsi (`{...resto}`): il
 *     gestore può arrivare d'altra parte, o il pulsante essere spento proprio lì;
 *   - un `<button>` con `ref`: il comportamento può attaccarlo chi tiene il nodo;
 *   - un `<Campo>` o un `<ControlloData>` senza `al` fuori da `ui/forms/`: in
 *     una modale lo legge `valoriModulo` al salvataggio (lo controlla
 *     `npm run forms`), in una vista è di solito un filtro rimasto senza effetto.
 *
 * Gli altri comandi del progetto (`Collegamento`, `Selettore`, `Tendina`,
 * `DataInLinea`) hanno `al` obbligatorio: lì basta `tsc`. La forma di prima di
 * React, `pulsante({ testo, al })`, si guarda ancora con le stesse regole.
 *
 * Uso: `npm run buttons`
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import ts from 'typescript'

import { RADICE, daRadice, fileSotto } from './common.mjs'

/** Le cartelle che disegnano (skill `react`). */
const CARTELLE = ['ui', 'core/controlli', 'desktop/shell/pages']

/** I campi il cui `al` è facoltativo: senza, in una vista, non filtrano niente. */
const CAMPI = new Set(['Campo', 'ControlloData'])

/**
 * I pulsanti a cui il comportamento lo attacca chi li usa (`presaDiRiga`:
 * trascinamento e frecce li mette `riordinatore`).
 */
const COMPORTAMENTO_ALTROVE = ['presa-riga']

/**
 * Il modulo dei mattoni: `Pulsante` e `Campo` contano solo se vengono da qui.
 * `core/controlli/` ha un suo `Pulsante` con `gesto` obbligatorio, e un suo
 * `Campo` che non ha `al`: lì il compilatore basta.
 */
const MATTONI = 'ui/components/base'

/**
 * I nomi locali dei componenti di `MATTONI` in un file: nome locale → nome
 * esportato (`import { Pulsante as P }` dà `P` → `Pulsante`).
 *
 * @param {ts.SourceFile} sorgente
 * @param {string} nome il percorso del file dalla radice
 */
function dalMattone (sorgente, nome) {
  /** @type {Map<string, string>} */
  const locali = new Map()
  if (nome.replace(/\.tsx?$/, '') === MATTONI) {
    for (const c of ['Pulsante', ...CAMPI]) locali.set(c, c)
    return locali
  }
  for (const istruzione of sorgente.statements) {
    if (!ts.isImportDeclaration(istruzione)) continue
    if (!ts.isStringLiteral(istruzione.moduleSpecifier)) continue
    const specificatore = istruzione.moduleSpecifier.text
    const verso = specificatore.startsWith('#ui/')
      ? specificatore.slice(1)
      : specificatore.startsWith('.')
        ? daRadice(join(RADICE, dirname(nome), specificatore), RADICE)
        : null
    if (verso?.replace(/\.js$/, '') !== MATTONI) continue
    const legami = istruzione.importClause?.namedBindings
    if (!legami || !ts.isNamedImports(legami)) continue
    for (const legame of legami.elements) {
      locali.set(legame.name.text, (legame.propertyName ?? legame.name).text)
    }
  }
  return locali
}

/** Vero per i comandi che vivono dentro un modulo, dove `al` non serve. */
function dentroUnModulo (percorso) {
  return percorso.includes('/forms/')
}

/** Vero per un nodo scritto dentro `apriModale({…})`: il campo lo legge `alSalva`. */
function dentroUnaModale (nodo) {
  for (let su = nodo.parent; su; su = su.parent) {
    if (ts.isCallExpression(su) && ts.isIdentifier(su.expression) && su.expression.text === 'apriModale') {
      return true
    }
  }
  return false
}

/**
 * Gli attributi di un elemento JSX o le proprietà di un oggetto di opzioni,
 * nella stessa forma: nome → espressione (`null` per `<X disabilitato />`).
 * `sparsi` è vero se ce n'è uno `{...resto}`, che può portare qualunque cosa.
 *
 * @param {ts.JsxAttributes | ts.ObjectLiteralExpression} nodo
 */
function attributiDi (nodo) {
  /** @type {Map<string, ts.Expression | null>} */
  const valori = new Map()
  let sparsi = false
  const elementi = ts.isJsxAttributes(nodo) ? nodo.properties : nodo.properties
  for (const voce of elementi) {
    if (ts.isJsxSpreadAttribute(voce) || ts.isSpreadAssignment(voce)) {
      sparsi = true
    } else if (ts.isJsxAttribute(voce)) {
      const iniziale = voce.initializer
      const valore = !iniziale
        ? null
        : ts.isJsxExpression(iniziale) ? iniziale.expression ?? null : iniziale
      valori.set(voce.name.getText(), valore)
    } else if (ts.isPropertyAssignment(voce) || ts.isShorthandPropertyAssignment(voce) ||
               ts.isMethodDeclaration(voce)) {
      const valore = ts.isPropertyAssignment(voce) ? voce.initializer : voce.name
      valori.set(voce.name.getText(), /** @type {ts.Expression} */ (valore))
    }
  }
  return { valori, sparsi }
}

/** Il testo di un letterale, o `null` se l'espressione si calcola. */
function letterale (espressione) {
  if (!espressione) return null
  if (ts.isStringLiteral(espressione) || ts.isNoSubstitutionTemplateLiteral(espressione)) {
    return espressione.text
  }
  return null
}

/** Vero per `<X disabilitato />`, `disabilitato={true}`, `disabilitato: true`. */
function sempreVero (valori, nome) {
  if (!valori.has(nome)) return false
  const valore = valori.get(nome)
  return valore === null || valore.kind === ts.SyntaxKind.TrueKeyword
}

/** Come si chiama il comando per chi legge l'uscita: il testo, o l'espressione. */
function etichettaDi (valori, sorgente) {
  for (const nome of ['testo', 'titolo', 'etichetta', 'aria-label', 'title']) {
    const valore = valori.get(nome)
    if (!valore) continue
    return (letterale(valore) ?? valore.getText(sorgente)).slice(0, 40)
  }
  return '(senza testo)'
}

const muti = []
const daGuardare = []

const letti = CARTELLE.flatMap((cartella) => fileSotto(join(RADICE, cartella), ['.tsx', '.ts']))
for (const percorso of letti) {
  const testo = readFileSync(percorso, 'utf8')
  const nome = daRadice(percorso, RADICE)
  const sorgente = ts.createSourceFile(percorso, testo, ts.ScriptTarget.Latest, true)
  const riga = (nodo) => sorgente.getLineAndCharacterOfPosition(nodo.getStart(sorgente)).line + 1
  const mattoni = dalMattone(sorgente, nome)

  /**
   * Un comando: `Pulsante` (anche la vecchia `pulsante({…})`), `button`, o un campo.
   *
   * @param {string} tipo
   * @param {ts.Node} nodo
   * @param {ts.JsxAttributes | ts.ObjectLiteralExpression} attributi
   */
  const esamina = (tipo, nodo, attributi) => {
    const { valori, sparsi } = attributiDi(attributi)
    const voce = `${nome}:${riga(nodo)}  ${tipo}  «${etichettaDi(valori, sorgente)}»`

    if (CAMPI.has(tipo)) {
      if (valori.has('al') || sparsi || dentroUnModulo(nome) || dentroUnaModale(nodo)) return
      daGuardare.push(`${voce} — filtro o campo di vista senza \`al\``)
      return
    }

    const nativo = tipo === 'button'
    const haGestore = nativo
      ? [...valori.keys()].some((attributo) => /^on[A-Z]/.test(attributo))
      : valori.has('al')
    const eSubmit = letterale(valori.get(nativo ? 'type' : 'tipo') ?? null) === 'submit'
    const spento = nativo ? 'disabled' : 'disabilitato'
    const classe = valori.get(nativo ? 'className' : 'classe')
    const altrove = classe
      ? COMPORTAMENTO_ALTROVE.some((c) => classe.getText(sorgente).includes(c))
      : false
    if (haGestore || eSubmit || sempreVero(valori, spento) || altrove) return

    if (sparsi) daGuardare.push(`${voce} — attributi sparsi: il gestore può arrivare da lì`)
    else if (valori.has(spento)) daGuardare.push(`${voce} — ha \`${spento}\` calcolato`)
    else if (nativo && valori.has('ref')) daGuardare.push(`${voce} — senza \`on…\` ma con \`ref\``)
    else muti.push(voce)
  }

  const visita = (nodo) => {
    if (ts.isJsxSelfClosingElement(nodo) || ts.isJsxOpeningElement(nodo)) {
      const scritto = nodo.tagName.getText(sorgente)
      const tag = scritto === 'button' ? scritto : mattoni.get(scritto)
      if (tag && (tag === 'Pulsante' || tag === 'button' || CAMPI.has(tag))) {
        esamina(tag, nodo, nodo.attributes)
      }
    } else if (ts.isCallExpression(nodo) && ts.isIdentifier(nodo.expression) &&
               nodo.expression.text === 'pulsante' && nodo.arguments[0] &&
               ts.isObjectLiteralExpression(nodo.arguments[0])) {
      esamina('pulsante', nodo, nodo.arguments[0])
    }
    ts.forEachChild(nodo, visita)
  }
  visita(sorgente)
}

if (muti.length === 0) {
  console.log('Nessun comando si disegna senza dire che cosa fa.')
} else {
  console.log(`# Comandi senza gestore: ${muti.length}\n`)
  for (const voce of muti) console.log(voce)
}

if (daGuardare.length) {
  console.log(`\n# Da guardare: ${daGuardare.length}\n`)
  for (const voce of daGuardare) console.log(voce)
}

// Zero file letti è una radice sbagliata, non un pannello in ordine.
if (letti.length === 0) console.log('Nessun file letto: la radice del progetto è sbagliata?')
process.exitCode = muti.length || letti.length === 0 ? 1 : 0
