// Difetti dei modelli di serie che non devono tornare: la firma delle mail con
// dentro le istruzioni per chi la scrive, frasi che nessun modello stampa, la
// legenda o la nota delle presenze rimaste sotto una tabella che non c'è.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { firmaPosta } from '../../dist-tests/data.mjs'
import { componiCorpo, conBase, leggiBlocchi, leggiModello, leggiTesti } from '../../dist-tests/domain.mjs'

import { leggiModelli } from '../../tools/templates.mjs'
import { datiDelGenere, registroCompleto } from '../helpers/modelli.mjs'

const modelli = new Map(leggiModelli().map(({ nome, testo }) => [nome, testo]))
const LINGUE = ['_testi', '_testi-de', '_testi-fr', '_testi-en']

describe('la firma di serie delle mail', () => {
  it('non porta i commenti del file, e il nome una volta sola', () => {
    const firma = firmaPosta({ carte: [{ id: 'a', sede: 'CPT', altezzaLogo: 14, corsi: [] }], docente: 'Maria Rossi' })
    assert.doesNotMatch(firma, /<!--/)
    assert.equal(firma.split('Maria Rossi').length - 1, 1)
  })
})

describe('le frasi dei modelli', () => {
  // I modelli che le chiamano: tutti tranne i file delle parole stessi.
  const sorgenti = [...modelli]
    .filter(([nome]) => !LINGUE.includes(nome))
    .map(([, testo]) => testo)
    .join('\n')

  for (const lingua of LINGUE) {
    it(`ogni frase di ${lingua} è stampata da qualche modello`, () => {
      const frasi = Object.keys(leggiTesti(modelli.get(lingua)).frasi)
      const morte = frasi.filter((nome) => !sorgenti.includes(`{{frase.${nome}}}`))
      assert.deepEqual(morte, [], `frasi che nessun modello usa: ${morte.join(', ')}`)
    })
  }
})

describe('le presenze senza righe', () => {
  const base = conBase(
    leggiModello('_base', modelli.get('_base')),
    leggiModello('_stile', modelli.get('_stile')),
  )
  const parole = leggiTesti(modelli.get('_testi'))
  const blocchi = leggiBlocchi(modelli.get('_blocchi'))
  const registro = registroCompleto()

  const senzaPresenze = (genere) => {
    const dati = datiDelGenere(registro, genere)
    return {
      ...dati,
      frasi: dati.frasi ?? parole.frasi,
      blocchi: dati.blocchi ?? blocchi,
      tabelle: { ...dati.tabelle, presenze: { ...dati.tabelle.presenze, righe: [] } },
    }
  }

  it('la griglia dell’appello non lascia la legenda da sola', () => {
    const modello = leggiModello('v', '[corpo]\nsezione: Griglia\nusa: griglia-appello\n')
    const corpo = componiCorpo(modello, {
      valori: {},
      elenchi: {},
      tabelle: { presenze: { intestazione: [], chiavi: [], righe: [] } },
      grafici: {},
      frasi: parole.frasi,
      blocchi,
    })
    assert.deepEqual(corpo, [])
  })

  for (const [nome, genere] of [['presenze-classe', 'presenze'], ['scheda-corso', 'corso']]) {
    it(`«${nome}» non stampa la nota delle presenze senza la tabella`, () => {
      const modello = conBase(leggiModello(nome, modelli.get(nome)), base)
      const corpo = componiCorpo(modello, senzaPresenze(genere))
      const inizio = parole.frasi['nota-presenze'].slice(0, 20)
      assert.ok(!corpo.some((blocco) => String(blocco.valore).startsWith(inizio)))
    })
  }
})
