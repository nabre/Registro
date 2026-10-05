// La regola `regiklass/jsx-key`: un elemento JSX restituito dalla funzione di
// `.map(...)`, `.flatMap(...)` o `Array.from(..., fn)` porta la sua `key`.
// Senza, React confonde le righe quando la lista cambia: lo stato locale e il
// fuoco passano alla riga accanto. Fa il lavoro di `react/jsx-key` senza
// portare tutto `eslint-plugin-react` per una regola sola.
//
// Guarda solo quel che la funzione restituisce direttamente (anche dentro un
// `?:` o un `&&`), non i figli: la chiave serve all'elemento della lista.

/** I metodi la cui funzione disegna una riga per elemento. */
const METODI = new Set(['map', 'flatMap'])

/** La funzione passata come argomento che disegna le righe, se c'è. */
function funzioneDelleRighe (chiamata) {
  const callee = chiamata.callee
  if (callee.type !== 'MemberExpression' || callee.computed) return null
  const nome = callee.property.name
  const argomento = nome === 'from' && callee.object.type === 'Identifier' && callee.object.name === 'Array'
    ? chiamata.arguments[1]
    : METODI.has(nome) ? chiamata.arguments[0] : null
  if (!argomento) return null
  return argomento.type === 'ArrowFunctionExpression' || argomento.type === 'FunctionExpression'
    ? argomento
    : null
}

/** I valori che una funzione restituisce, senza entrare nelle funzioni annidate. */
function restituiti (funzione) {
  if (funzione.body.type !== 'BlockStatement') return [funzione.body]
  const esito = []
  const visita = (nodo) => {
    if (!nodo || typeof nodo.type !== 'string') return
    if (nodo.type === 'ReturnStatement') {
      if (nodo.argument) esito.push(nodo.argument)
      return
    }
    if (nodo.type.includes('Function') || nodo.type === 'ClassBody') return
    for (const [campo, valore] of Object.entries(nodo)) {
      if (campo === 'parent') continue
      if (Array.isArray(valore)) valore.forEach(visita)
      else if (valore && typeof valore === 'object') visita(valore)
    }
  }
  funzione.body.body.forEach(visita)
  return esito
}

/** Gli elementi JSX in cui un valore restituito può finire. */
function elementi (valore, flat) {
  switch (valore.type) {
    case 'JSXElement':
    case 'JSXFragment':
      return [valore]
    case 'ConditionalExpression':
      return [...elementi(valore.consequent, flat), ...elementi(valore.alternate, flat)]
    case 'LogicalExpression':
      return elementi(valore.right, flat)
    case 'ArrayExpression':
      // Da `flatMap` ogni elemento dell'array è una riga della lista.
      return flat ? valore.elements.filter(Boolean).flatMap((e) => elementi(e, false)) : []
    default:
      return []
  }
}

function haChiave (elemento) {
  return elemento.openingElement.attributes.some(
    (a) => a.type === 'JSXAttribute' && a.name.type === 'JSXIdentifier' && a.name.name === 'key',
  )
}

const jsxKey = {
  meta: {
    type: 'problem',
    docs: { description: 'Gli elementi JSX di una lista portano la loro `key`.' },
    schema: [],
    messages: {
      manca:
        'Un elemento di una lista vuole la sua `key` stabile (un id, non l\'indice se la lista cambia): ' +
        'senza, React passa stato e fuoco alla riga accanto.',
      frammento:
        'Un frammento `<>` in una lista non può portare la `key`: usa `<Fragment key={...}>`.',
    },
  },
  create (context) {
    return {
      CallExpression (nodo) {
        const funzione = funzioneDelleRighe(nodo)
        if (!funzione) return
        const flat = nodo.callee.property.name === 'flatMap'
        for (const valore of restituiti(funzione)) {
          for (const elemento of elementi(valore, flat)) {
            if (elemento.type === 'JSXFragment') {
              context.report({ node: elemento, messageId: 'frammento' })
            } else if (!haChiave(elemento)) {
              context.report({ node: elemento.openingElement, messageId: 'manca' })
            }
          }
        }
      },
    }
  },
}

export default { rules: { 'jsx-key': jsxKey } }
