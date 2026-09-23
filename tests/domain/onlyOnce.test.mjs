// Le regole del registro stanno scritte una volta sola.
//
// «Il lavoro non si sposta» è la regola che la skill delle procedure enuncia
// per ultima e che vale per tutto il programma: se ti ritrovi a riscrivere quel
// che una funzione del dominio fa già, o si chiama quella, o si estrae e la
// chiamano tutti e due — estratta, non duplicata.
//
// Finché è una frase in un documento, però, non ferma nessuno. Questa prova la
// rende un cancello, e non è una precauzione teorica: ognuna delle regole qui
// sotto è stata **davvero** riscritta a mano da qualche parte, e ogni copia ha
// prodotto un guasto o stava per produrlo.
//
//   — la soglia di assenza confrontata senza il `× 100` del dominio: la colonna
//     «oltre soglia» diceva «no» su tutte le righe di una classe, perché una
//     quota fra 0 e 1 non supera mai un venti scritto in cifra tonda. Nessuno
//     se n'è accorto per mesi: «nessuno oltre soglia» è una risposta plausibile.
//
//   — il periodo di un anno ricavato dai soli semestri: `intervalloAnno` torna
//     `null` anche quando l'anno c'è ma i semestri no, e chi si fermava lì
//     ricadeva su «tutto il tempo». Una scheda contava ogni ora di ogni anno
//     dentro le colonne di uno solo. Tre copie, trovate in tre momenti diversi.
//
//   — il nome composto come `${cognome} ${nome}` senza il `trim` di
//     `nomeCompleto`: due buste dell'API rendevano lo stesso allievo con uno
//     spazio in coda e le altre no.
//
//   — gli allievi attivi filtrati a mano e le UD contate a mano: copie del
//     corpo di `allieviAttivi` e di `contaUd`. Non hanno ancora rotto niente, e
//     sono il posto da cui le prime tre sono venute fuori.
//
// La prova legge il **sorgente** e non gira il programma, come
// `tests/api/coverage.test.mjs` fa con l'unione delle azioni: una regola
// riscritta non si vede a runtime — i due conti tornano, finché non tornano.

import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import * as percorso from 'node:path'
import { describe, it } from 'node:test'

/** La radice dei sorgenti: questo file sta in `tests/domain/`. */
const SRC = percorso.resolve(
  percorso.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  '..',
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
 * Le regole che non si riscrivono, e dove sta quella buona.
 *
 * `esenti` sono i percorsi in cui la forma può comparire per una ragione
 * scritta: il file che **è** la regola, e i pochi casi in cui la stessa forma
 * dice un'altra cosa. Ogni esenzione porta il suo perché, perché un elenco di
 * esenzioni senza motivi è il modo in cui una prova come questa smette di
 * valere un pezzo per volta.
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
      // Sono la regola: `intervalloAnno` sta lì, e `estremiAnno` è il ripiego
      // che le si costruisce intorno.
      'domain/years.ts',
      // Rimette l'anno in accordo con i propri semestri: è il posto in cui
      // l'invariante si fa valere, e per farlo valere deve calcolarla.
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
      // `indiceNomi` riceve un elenco di allievi e non una classe: la stessa
      // condizione su un ingresso diverso, non la stessa regola riscritta.
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
    // Se la scansione tornasse vuota — una cartella spostata, un percorso
    // cambiato — tutte le prove qui sotto passerebbero raccontando di aver
    // guardato il programma intero.
    assert.ok(codice.length > 200, `sorgenti trovati: ${codice.length}`)
  })

  for (const regola of REGOLE) {
    it(`${regola.nome} si chiede a ${regola.chiama}`, () => {
      const colpevoli = []
      for (const [file, testo] of codice) {
        if (regola.esenti.some((e) => file.includes(e))) continue
        testo.split('\n').forEach((riga, i) => {
          const pulita = riga.trimStart()
          // I commenti no: questa prova esiste anche per poterla raccontare, e
          // raccontarla vuol dire scrivere la forma sbagliata da qualche parte.
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
