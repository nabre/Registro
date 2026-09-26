// Le regole del registro stanno scritte una volta sola: «il lavoro non si
// sposta» (skill delle procedure), cioè si chiama la funzione del dominio o la
// si estrae, non la si ricopia. Si fissano le regole che si ricopiano più
// facilmente:
//
//   — la soglia di assenza col `× 100` del dominio (una quota fra 0 e 1 non
//     supera mai un venti in cifra tonda);
//
//   — il periodo di un anno: `intervalloAnno` torna `null` anche quando l'anno
//     c'è ma i semestri no, e il ripiego sta in `estremiAnno`;
//
//   — il nome composto con `nomeCompleto` (che fa il `trim`), non con
//     `${cognome} ${nome}`;
//
//   — gli allievi attivi con `allieviAttivi` e le UD con `contaUd`.
//
// La prova legge il **sorgente**, come `coverage.test.mjs`: una regola
// riscritta non si vede a runtime finché i due conti tornano.

import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import * as percorso from 'node:path'
import { describe, it } from 'node:test'

/** La radice dei sorgenti: questo file sta in `tests/`. */
const SRC = percorso.resolve(
  percorso.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  '..',
  'src',
)

function sorgenti (dir = SRC, dentro = []) {
  for (const voce of readdirSync(dir)) {
    const qui = percorso.join(dir, voce)
    if (statSync(qui).isDirectory()) sorgenti(qui, dentro)
    else if (qui.endsWith('.ts')) dentro.push(qui)
  }
  return dentro
}

/**
 * Le regole che non si riscrivono, e dove sta quella buona. `esenti` sono i
 * percorsi in cui la forma compare per una ragione scritta accanto: il file che
 * **è** la regola, e i casi in cui la stessa forma dice un'altra cosa.
 */
const REGOLE = [
  {
    nome: 'la soglia di assenza',
    chiama: 'oltreSoglia() di domain/alerts.ts',
    forma: /quota[a-zA-Z]*\s*[><]=?\s*soglia|soglia\s*[><]=?\s*quota/,
    esenti: [
      // È la regola.
      'domain/alerts.ts',
    ],
  },
  {
    nome: 'gli estremi di un anno',
    chiama: 'estremiAnno() di domain/years.ts',
    forma: /intervalloAnno\(/,
    esenti: [
      // Sono la regola: `intervalloAnno` sta lì, e `estremiAnno` è il ripiego.
      'domain/years.ts',
      // Rimette l'anno in accordo con i semestri: deve calcolare l'invariante per
      // farla valere.
      'domain/validation.ts',
    ],
  },
  {
    nome: 'il nome di una persona',
    chiama: 'nomeCompleto() di domain/calculations.ts',
    forma: /\$\{\s*\w+\.cognome\s*\}\s\$\{\s*\w+\.nome\s*\}/,
    esenti: ['domain/calculations.ts'],
  },
  {
    nome: 'gli allievi che frequentano',
    chiama: 'allieviAttivi() di domain/calculations.ts',
    forma: /\.filter\(\s*\(?\s*\w+\s*\)?\s*=>\s*\w+\.attivo\s*\)/,
    esenti: [
      'domain/calculations.ts',
      // `indiceNomi` riceve un elenco di allievi, non una classe: un'altra regola.
      'domain/sorting.ts',
    ],
  },
  {
    nome: 'le unità didattiche di un’ora',
    chiama: 'contaUd() di domain/calculations.ts',
    forma: /unitaDidattiche\([^)]*\)\.length/,
    esenti: ['domain/calculations.ts'],
  },
]

describe('le regole del registro stanno scritte una volta sola', () => {
  const codice = sorgenti().map((f) => [
    f.replace(/\\/g, '/').slice(f.replace(/\\/g, '/').indexOf('/src/') + 1),
    readFileSync(f, 'utf8'),
  ])

  it('ci sono dei sorgenti da guardare', () => {
    // Una scansione vuota (cartella spostata) farebbe passare tutto.
    assert.ok(codice.length > 200, `sorgenti trovati: ${codice.length}`)
  })

  for (const regola of REGOLE) {
    it(`${regola.nome} si chiede a ${regola.chiama}`, () => {
      const colpevoli = []
      for (const [file, testo] of codice) {
        if (regola.esenti.some((e) => file.includes(e))) continue
        testo.split('\n').forEach((riga, i) => {
          const pulita = riga.trimStart()
          // I commenti no: raccontare la regola vuol dire scrivere la forma sbagliata.
          if (pulita.startsWith('//') || pulita.startsWith('*')) return
          if (regola.forma.test(riga)) colpevoli.push(`${file}:${i + 1}`)
        })
      }
      assert.deepEqual(
        colpevoli,
        [],
        `${regola.nome} è riscritta a mano invece di chiedere a ${regola.chiama}:\n  ` +
        `${colpevoli.join('\n  ')}\n` +
        'O si chiama quella, o si estrae e la chiamano tutti e due — estratta, non duplicata.',
      )
    })
  }
})
