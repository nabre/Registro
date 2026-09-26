// La casella di posta: chi entra e chi scrive. Regole comuni a Exchange,
// Outlook e al file `.eml`: il nome del mittente, l'indirizzo per
// l'autenticazione.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  componiCasella,
  descriviCasella,
  dominioDi,
  sembraIndirizzo,
  stessoIndirizzo,
} from '../../dist-tests/domain.mjs'

describe('la casella', () => {
  it('tiene separati il nome di accesso e l’indirizzo da cui si scrive', () => {
    const suo = componiCasella('vxg140@edu.ti.ch', 'michel.brenna@edu.ti.ch')
    assert.deepEqual(suo, { accesso: 'vxg140@edu.ti.ch', mittente: 'michel.brenna@edu.ti.ch' })
  })

  it('con uno solo scritto, l’altro gli è uguale', () => {
    assert.deepEqual(componiCasella('', 'nome.cognome@edu.ti.ch'), {
      accesso: 'nome.cognome@edu.ti.ch',
      mittente: 'nome.cognome@edu.ti.ch',
    })
    assert.deepEqual(componiCasella('xxx000@edu.ti.ch', ''), {
      accesso: 'xxx000@edu.ti.ch',
      mittente: 'xxx000@edu.ti.ch',
    })
  })

  it('senza niente scritto non c’è nessuna casella', () => {
    assert.equal(componiCasella('', ''), null)
    assert.equal(componiCasella('  ', ' '), null)
  })

  it('toglie gli spazi intorno, che un copia-incolla si porta dietro', () => {
    const suo = componiCasella(' vxg140@edu.ti.ch ', ' michel.brenna@edu.ti.ch')
    assert.equal(suo.accesso, 'vxg140@edu.ti.ch')
    assert.equal(suo.mittente, 'michel.brenna@edu.ti.ch')
  })

  it('confronta gli indirizzi senza badare alle maiuscole', () => {
    assert.equal(stessoIndirizzo('A@B.ch', 'a@b.ch '), true)
    assert.equal(stessoIndirizzo('a@b.ch', 'a@c.ch'), false)
  })

  it('si descrive con l’indirizzo, e con la sigla solo quando è diversa', () => {
    assert.equal(
      descriviCasella(componiCasella('vxg140@edu.ti.ch', 'michel.brenna@edu.ti.ch')),
      'michel.brenna@edu.ti.ch (accesso vxg140@edu.ti.ch)',
    )
    assert.equal(descriviCasella(componiCasella('', 'nome.cognome@edu.ti.ch')), 'nome.cognome@edu.ti.ch')
  })

  it('sa il dominio di un indirizzo, e riconosce quel che non lo è', () => {
    assert.equal(dominioDi('vxg140@EDU.ti.ch'), 'edu.ti.ch')
    assert.equal(dominioDi('senza-chiocciola'), '')
    assert.equal(sembraIndirizzo('nome.cognome@edu.ti.ch'), true)
    assert.equal(sembraIndirizzo('nome cognome'), false)
  })
})
