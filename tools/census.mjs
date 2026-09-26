/**
 * Censimento degli export senza consumatori: per ogni simbolo esportato cerca
 * chi lo nomina fuori dal suo file. Se nessuno, è morto o pubblico senza
 * motivo, e lo distingue contando le occorrenze in casa propria.
 *
 * Complementare a `noUnusedLocals` (dentro un file) e da usare prima: tolto
 * l'`export` di troppo, `tsc` dice che cosa è diventato irraggiungibile.
 *
 * Uso: `npm run census`
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { daRadice, fileSotto } from './common.mjs'

/** Cartelle di codice: tutto quel che può nominare un simbolo va guardato. */
const CARTELLE = ['src', 'shell', 'tests', 'tools']

/** File sciolti fuori dalle cartelle di codice che però importano il resto. */
const SCIOLTI = ['esbuild.mjs']

const radice = process.cwd()

/** Tutte le forme in cui qui dentro si scrive codice: un export si nomina da ognuna. */
const ESTENSIONI = ['.ts', '.mts', '.mjs', '.cjs']

const percorsi = CARTELLE.flatMap((c) => fileSotto(join(radice, c), ESTENSIONI))
  .concat(SCIOLTI.map((f) => join(radice, f)))

const relativo = (percorso) => daRadice(percorso, radice)
const testo = new Map(percorsi.map((p) => [relativo(p), readFileSync(p, 'utf8')]))

// `export const x`, `export function x`, `export type X`, e così via.
const DICHIARAZIONE =
  /^export\s+(?:declare\s+)?(?:async\s+)?(?:const|let|var|function\*?|class|type|interface|enum)\s+([A-Za-zÀ-ÿ_$][\w$À-ÿ]*)/gm
// `export { x, y as z }`, anche nella forma `export { x } from './y.js'`.
const LISTA = /^export\s*\{([^}]*)\}/gm

/** Nomi esportati, file per file. */
const dichiarati = new Map()
for (const [percorso, sorgente] of testo) {
  const nomi = new Set()
  for (const trovato of sorgente.matchAll(DICHIARAZIONE)) nomi.add(trovato[1])
  for (const trovato of sorgente.matchAll(LISTA)) {
    for (const voce of trovato[1].split(',')) {
      const nome = voce.trim().split(/\s+as\s+/).pop()?.trim()
      if (nome && /^[A-Za-zÀ-ÿ_$][\w$À-ÿ]*$/.test(nome)) nomi.add(nome)
    }
  }
  if (nomi.size) dichiarati.set(percorso, nomi)
}

// Chi nomina che cosa: l'identificatore nudo e non l'import, perché i barili
// riesportano con `export *`.
const citazioni = new Map()
for (const [percorso, sorgente] of testo) {
  for (const identificatore of new Set(sorgente.match(/[A-Za-zÀ-ÿ_$][\w$À-ÿ]*/g) ?? [])) {
    if (!citazioni.has(identificatore)) citazioni.set(identificatore, new Set())
    citazioni.get(identificatore).add(percorso)
  }
}

// Niente `\b`: una lettera accentata non è un carattere di parola, e
// `èPacchetto` non aggancerebbe. Il confine si scrive a mano, sulla stessa
// classe con cui i nomi sono stati riconosciuti.
const PRIMA = '(?<![' + String.fromCharCode(92) + 'w$À-ÿ])'
const DOPO = '(?![' + String.fromCharCode(92) + 'w$À-ÿ])'
const quanteVolte = (sorgente, nome) =>
  (sorgente.match(new RegExp(PRIMA + nome + DOPO, 'g')) ?? []).length

const rilievi = []
for (const [percorso, nomi] of dichiarati) {
  for (const nome of nomi) {
    const altrove = [...(citazioni.get(nome) ?? [])].filter((p) => p !== percorso)
    if (altrove.length) continue
    // Una sola occorrenza è la dichiarazione stessa: nessuno lo usa, nemmeno qui.
    const usi = quanteVolte(testo.get(percorso), nome)
    rilievi.push({
      percorso,
      nome,
      diagnosi: usi <= 1 ? 'mai usato' : `interno (${usi} citazioni)`,
    })
  }
}

rilievi.sort((a, b) => a.percorso.localeCompare(b.percorso) || a.nome.localeCompare(b.nome))

const mai = rilievi.filter((r) => r.diagnosi === 'mai usato')
console.log(`# Export senza consumatori esterni: ${rilievi.length}`)
console.log(`# Da eliminare: ${mai.length} — da rendere interni: ${rilievi.length - mai.length}\n`)

let corrente = ''
for (const rilievo of rilievi) {
  if (rilievo.percorso !== corrente) {
    corrente = rilievo.percorso
    console.log(`\n## ${corrente}`)
  }
  console.log(`- \`${rilievo.nome}\` — ${rilievo.diagnosi}`)
}

// Fa fallire solo quel che nessuno chiama, cioè codice morto. Quel che è solo
// «interno» è un consiglio: certi tipi restano esportati apposta perché
// compaiono nella firma di una funzione esportata (il motivo è nel sorgente).
process.exitCode = mai.length ? 1 : 0
