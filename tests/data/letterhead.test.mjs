// La firma delle e-mail: quella del documento, o quella di serie riempita con
// l'intestazione. Il programma non porta più i dati di nessuno.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { firmaPosta } from '../../dist-tests/data.mjs'

const carta = ({ sede = '', ...altro } = {}) => ({
  carte: [{ id: 'a', sede, altezzaLogo: 14, corsi: [] }],
  docente: '',
  ...altro,
})

describe('firmaPosta', () => {
  it('senza nome né sede non firma', () => {
    assert.equal(firmaPosta(carta()), '')
  })

  it('la firma scritta nel documento vince su quella di serie', () => {
    assert.equal(firmaPosta(carta({ docente: 'Io', firma: '<p>Mia</p>' })), '<p>Mia</p>')
  })

  it('quella di serie porta nome e sede, messi al riparo dentro l’HTML', () => {
    const firma = firmaPosta(carta({ docente: 'Rossi & <Bianchi>', sede: 'CPT' }))
    assert.match(firma, /Rossi &amp; &lt;Bianchi&gt;/)
    assert.match(firma, /CPT/)
    assert.doesNotMatch(firma, /\{\{/)
    assert.doesNotMatch(firma, /Brenna/)
  })
})
