// Il catalogo dei modelli consigliati e le interrogazioni a Hugging Face:
// il file generato `core/dati/modelliConsigliati.ts` corrisponde a
// `resources/modelli-consigliati.json`, ogni voce ha titolo e nota in tutte
// le quattro lingue del registro, e il catalogo espone i modelli attesi.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { before, describe, it } from 'node:test'

import { importaSorgente } from '../helpers/sorgente.mjs'
import { componiFile, FILE_GENERATO, FILE_JSON } from '../../tools/modelliConsigliati.mjs'

const DATI_JSON = JSON.parse(readFileSync(FILE_JSON, 'utf8'))
const LINGUE = ['it', 'de', 'fr', 'en']

let CATALOGO
let testi

before(async () => {
  const m = await importaSorgente([
    "export { CATALOGO } from './core/dati/modelliConsigliati.ts'",
    "export { testi } from './core/dati/gguf.testi.ts'",
  ].join('\n'))
  CATALOGO = m.CATALOGO
  testi = m.testi
})

describe('il catalogo dei modelli consigliati', () => {
  it('è in accordo con resources/modelli-consigliati.json', () => {
    assert.equal(
      readFileSync(FILE_GENERATO, 'utf8').replace(/\r\n/g, '\n'),
      componiFile(),
      'da rifare: npm run modelli-consigliati',
    )
  })

  it('ogni voce nel JSON ha deposito valido, uso e quantizzazione', () => {
    for (const voce of DATI_JSON) {
      assert.match(voce.deposito, /^[\w.-]+\/[\w.-]+$/, `${voce.deposito} formato non valido`)
      assert.ok(voce.perChe === 'assistente' || voce.perChe === 'ocr', `${voce.perChe} uso non previsto`)
      assert.ok(typeof voce.taglio === 'string' && voce.taglio.length > 0, 'taglio mancante')
      assert.ok(typeof voce.chiave === 'string' && voce.chiave.length > 0, 'chiave mancante')
    }
  })

  it('ogni modello consigliato ha titolo e nota tradotti in tutte e quattro le lingue', () => {
    for (const voce of DATI_JSON) {
      for (const lingua of LINGUE) {
        const catalogoTesti = testi(lingua)
        const consigliato = catalogoTesti.consigliati[voce.chiave]
        assert.ok(consigliato, `manca chiave "${voce.chiave}" in lingua ${lingua}`)
        assert.ok(consigliato.titolo && consigliato.titolo.length > 3, `titolo troppo corto per ${voce.chiave} in ${lingua}`)
        assert.ok(consigliato.nota && consigliato.nota.length > 10, `nota troppo corta per ${voce.chiave} in ${lingua}`)
      }
    }
  })

  it('il catalogo esporta le voci con getter dinamici per titolo e nota', () => {
    assert.equal(CATALOGO.length, DATI_JSON.length)
    for (let i = 0; i < DATI_JSON.length; i += 1) {
      const sorgente = DATI_JSON[i]
      const emesso = CATALOGO[i]
      assert.equal(emesso.deposito, sorgente.deposito)
      assert.equal(emesso.perChe, sorgente.perChe)
      assert.equal(emesso.taglio, sorgente.taglio)
      assert.ok(emesso.titolo.length > 0)
      assert.ok(emesso.nota.length > 0)
    }
  })
})

describe('gli aiuti di huggingFace.ts per file e indirizzi', () => {
  let hf
  before(async () => {
    hf = await importaSorgente([
      "export { fileConsigliato, proiettoreDi, indirizzo } from './core/dati/huggingFace.ts'",
    ].join('\n'))
  })

  it('compone l’indirizzo per lo schema hf:', () => {
    assert.equal(
      hf.indirizzo('bartowski/Qwen2.5-7B-Instruct-GGUF', 'Qwen2.5-7B-Instruct-Q4_K_M.gguf'),
      'hf:bartowski/Qwen2.5-7B-Instruct-GGUF/Qwen2.5-7B-Instruct-Q4_K_M.gguf',
    )
  })

  it('riconosce il proiettore mmproj fra i file remoti', () => {
    const file = [
      { percorso: 'model-Q4_K_M.gguf', byte: 1000, taglio: 'Q4_K_M', proiettore: false },
      { percorso: 'mmproj-model-f16.gguf', byte: 500, taglio: 'F16', proiettore: true },
    ]
    const proiettore = hf.proiettoreDi(file)
    assert.ok(proiettore)
    assert.equal(proiettore.percorso, 'mmproj-model-f16.gguf')
  })

  it('sceglie il file consigliato per il taglio dato, scartando i proiettori', () => {
    const file = [
      { percorso: 'mmproj-model-f16.gguf', byte: 500, taglio: 'F16', proiettore: true },
      { percorso: 'model-Q8_0.gguf', byte: 2000, taglio: 'Q8_0', proiettore: false },
      { percorso: 'model-Q4_K_M.gguf', byte: 1000, taglio: 'Q4_K_M', proiettore: false },
    ]
    const scelto = hf.fileConsigliato(file, 'Q4_K_M')
    assert.ok(scelto)
    assert.equal(scelto.percorso, 'model-Q4_K_M.gguf')

    // Se il taglio non c'è, ripiega sul primo modello non proiettore
    const ripiego = hf.fileConsigliato(file, 'Q2_K')
    assert.ok(ripiego)
    assert.equal(ripiego.percorso, 'model-Q8_0.gguf')
  })
})

