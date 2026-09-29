// I punti di lettura delle pagine con un indice (guida, aree delle
// impostazioni) nella memoria del pannello: tornano come sono stati scritti,
// e quel che non è un punto buono si scarta invece di far saltare la pagina.
// La misura e il ritorno sullo schermo stanno in `ui/pannello/segnalibro.ts`
// e si guardano a mano.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { importaSorgente } from '../helpers/sorgente.mjs'

const { leggiMemoria, serializza } = await importaSorgente('ui/pannello/memoria.ts')

const globaliCon = (segnalibri) =>
  leggiMemoria({ v: 2, globali: { segnalibri }, documenti: {} }).globali.segnalibri

describe('segnalibri nella memoria', () => {
  it('un punto buono fa andata e ritorno', () => {
    const segnalibri = {
      guida: { sezione: 'lezione', scarto: 240 },
      'impostazioni.utente': { sezione: 'posta', scarto: -12 },
    }
    const memoria = leggiMemoria({ v: 2, globali: { segnalibri }, documenti: {} })
    assert.deepEqual(leggiMemoria(serializza(memoria)).globali.segnalibri, segnalibri)
  })

  it('scarta sezione vuota, scarto non intero o fuori misura', () => {
    assert.deepEqual(globaliCon({
      a: { sezione: '', scarto: 0 },
      b: { sezione: 'x', scarto: 1.5 },
      c: { sezione: 'x', scarto: '10' },
      d: { sezione: 'x', scarto: 5_000_000 },
      e: 'guida',
      f: { sezione: 'x', scarto: 3 },
    }), { f: { sezione: 'x', scarto: 3 } })
  })

  it('senza segnalibri, o con un valore che non è un oggetto, non ce ne sono', () => {
    assert.equal(globaliCon(undefined), undefined)
    assert.equal(globaliCon(['guida']), undefined)
  })
})
