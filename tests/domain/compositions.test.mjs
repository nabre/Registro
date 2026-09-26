// I fascicoli composti: dove finiscono e che cosa si accetta come ricetta. La
// ricetta non si ricompone da sola, quindi si legge con diffidenza: un JSON
// toccato a mano non diventa un fascicolo di zero pagine col nome giusto.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  fraIFascicoli,
  leggiComposizione,
  pdfDi,
  ricettaDi,
} from '../../dist-tests/domain.mjs'

const BUONA = {
  id: 'fas-1',
  nome: 'Schede 1° semestre',
  percorsi: ['esportazioni/a.pdf', 'esportazioni/b.pdf'],
  creataIl: '2026-09-13T10:00:00.000Z',
  aggiornataIl: '2026-09-13T10:00:00.000Z',
}

describe('il posto di un fascicolo', () => {
  it('il PDF sta in una cartella sua dentro le esportazioni', () => {
    assert.equal(pdfDi(BUONA), 'esportazioni/composizioni/Schede 1° semestre.pdf')
  })

  it('un nome con una barra dentro non diventa una cartella', () => {
    assert.equal(pdfDi({ nome: 'Schede 1/2' }), 'esportazioni/composizioni/Schede 1-2.pdf')
  })

  it('la ricetta sta nell’anno e non fra le esportazioni: non si rifà da sola', () => {
    assert.equal(ricettaDi('fas-1'), 'composizioni/fas-1.json')
  })
})

describe('leggere una ricetta', () => {
  it('una ricetta intera torna com’è', () => {
    assert.deepEqual(leggiComposizione(BUONA), BUONA)
  })

  it('tiene solo i percorsi delle esportazioni', () => {
    const letta = leggiComposizione({
      ...BUONA,
      percorsi: ['esportazioni/a.pdf', 'archivio/verifica.pdf', 7],
    })
    assert.deepEqual(letta.percorsi, ['esportazioni/a.pdf'])
  })

  it('senza nome, senza id o senza fogli non è una ricetta', () => {
    assert.equal(leggiComposizione({ ...BUONA, nome: '  ' }), null)
    assert.equal(leggiComposizione({ ...BUONA, id: '' }), null)
    assert.equal(leggiComposizione({ ...BUONA, percorsi: [] }), null)
    assert.equal(leggiComposizione({ ...BUONA, percorsi: ['archivio/verifica.pdf'] }), null)
    assert.equal(leggiComposizione(null), null)
    assert.equal(leggiComposizione('fascicolo'), null)
  })
})

describe('riconoscere il PDF di un fascicolo', () => {
  it('un documento qualunque delle esportazioni non è un fascicolo', () => {
    assert.equal(fraIFascicoli('esportazioni/DIC4a/verbale.pdf'), false)
    assert.equal(fraIFascicoli('archivio/composizioni/x.pdf'), false)
    assert.equal(fraIFascicoli('esportazioni/composizioni/Schede.pdf'), true)
  })
})
