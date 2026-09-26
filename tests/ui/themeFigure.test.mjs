// Le miniature del tema hanno i colori veri del tema. In fondo a
// `src/ui/styles/theme.css` due blocchi `[data-tema-figura]` ridefiniscono i
// token per le miniature (una media query non si accende in un contenitore
// solo): sono copie per valore, e qui si tengono uguali alle tavolozze.
//
// E ogni token che il foglio delle miniature usa dentro la figura è fra quelli
// ridefiniti, o varrebbe quello del tema di fuori.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as percorso from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const RADICE = percorso.resolve(percorso.dirname(fileURLToPath(import.meta.url)), '..', '..')
const leggi = (...pezzi) => readFileSync(percorso.join(RADICE, ...pezzi), 'utf8')

const tema = leggi('src', 'ui', 'styles', 'theme.css')
const figure = leggi('src', 'ui', 'styles', 'figure-choice.css')

/** I token dichiarati dentro il primo blocco che comincia con `selettore {`. */
function blocco (testo, selettore) {
  const inizio = testo.indexOf(`${selettore} {`)
  assert.ok(inizio >= 0, `${selettore} non trovato`)
  const corpo = testo.slice(inizio, testo.indexOf('}', inizio))
  return Object.fromEntries(
    [...corpo.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, nome, valore]) => [nome, valore.trim()]),
  )
}

const scuroDa = tema.indexOf('@media (prefers-color-scheme: dark)')
const forzateDa = tema.indexOf("[data-tema-figura='chiaro']")
const TAVOLOZZE = {
  chiaro: blocco(tema.slice(0, scuroDa), ':root'),
  scuro: blocco(tema.slice(scuroDa, forzateDa), ':root'),
}

describe('le miniature del tema', () => {
  for (const nome of ['chiaro', 'scuro']) {
    it(`«${nome}» ha i valori della tavolozza ${nome}`, () => {
      const forzata = blocco(tema, `[data-tema-figura='${nome}']`)
      assert.ok(Object.keys(forzata).length > 0)
      for (const [token, valore] of Object.entries(forzata)) {
        assert.equal(valore, TAVOLOZZE[nome][token], `${token} nella miniatura ${nome}`)
      }
    })
  }

  it('dentro la figura si usano solo i token ridefiniti', () => {
    const ridefiniti = new Set(Object.keys(blocco(tema, "[data-tema-figura='chiaro']")))
    assert.deepEqual(
      new Set(Object.keys(blocco(tema, "[data-tema-figura='scuro']"))),
      ridefiniti,
      'le due miniature ridefiniscono token diversi',
    )
    // Fino alla figura della lingua: le bandiere hanno i loro colori.
    const finoA = figure.indexOf('- la figura della lingua')
    const dallaFigura = figure.slice(figure.indexOf('- la figura del tema'), finoA > 0 ? finoA : undefined)
    const usati = new Set([...dallaFigura.matchAll(/var\((--[\w-]+)\)/g)].map(([, nome]) => nome))
    // Le misure non cambiano con il tema: stanno in `metrics.css`, uguali per tutti.
    const colori = [...usati].filter((nome) => !nome.startsWith('--raggio') && !nome.startsWith('--spazio'))
    assert.ok(colori.length > 0)
    for (const nome of colori) assert.ok(ridefiniti.has(nome), `${nome} non è ridefinito per la miniatura`)
  })
})
