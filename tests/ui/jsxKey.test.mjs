// La regola `regiklass/jsx-key` (tools/eslint-jsx-key.mjs): le righe di una
// lista disegnate da `.map` portano la loro `key`, così React non passa stato
// e fuoco alla riga accanto.

import { RuleTester } from 'eslint'
import tseslint from 'typescript-eslint'
import { describe, it } from 'node:test'

import regiklass from '../../tools/eslint-jsx-key.mjs'

RuleTester.describe = describe
RuleTester.it = it

const prova = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
})

prova.run('jsx-key', regiklass.rules['jsx-key'], {
  valid: [
    'v.map((x) => <li key={x.id}>{x.nome}</li>)',
    'v.map(function (x) { if (x.a) return <b key={x.id} />; return null })',
    'v.map((x) => x.a ? <b key="a" /> : <i key="b" />)',
    'v.flatMap((x) => [<b key={`a${x}`} />, <i key={`b${x}`} />])',
    'Array.from({ length: 3 }, (_, i) => <span key={i} />)',
    // I figli non sono righe della lista.
    'v.map((x) => <li key={x}><b /></li>)',
    // Una funzione annidata restituisce per sé.
    'v.map((x) => { const f = () => <b />; return <i key={x}>{f()}</i> })',
    'v.filter((x) => <b />)',
  ],
  invalid: [
    { code: 'v.map((x) => <li>{x}</li>)', errors: [{ messageId: 'manca' }] },
    { code: 'v.map((x) => { return <li>{x}</li> })', errors: [{ messageId: 'manca' }] },
    { code: 'v.map((x) => x ? <b key="a" /> : <i />)', errors: [{ messageId: 'manca' }] },
    { code: 'v.map((x) => x && <b />)', errors: [{ messageId: 'manca' }] },
    { code: 'v.map((x) => <>{x}</>)', errors: [{ messageId: 'frammento' }] },
    { code: 'v.flatMap((x) => [<b key="a" />, <i />])', errors: [{ messageId: 'manca' }] },
    { code: 'Array.from(v, (x) => <span />)', errors: [{ messageId: 'manca' }] },
  ],
})
