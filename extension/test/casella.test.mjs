// La casella di posta: chi entra e chi scrive.
//
// Sono le regole su cui si appoggiano tutte le vie d'uscita — Exchange,
// Outlook, il file `.eml` — e uno sbaglio qui si vede solo quando la mail è
// già partita: dalla sigla invece che dal nome, o non è partita affatto perché
// l'autenticazione ha ricevuto l'indirizzo sbagliato.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  componiCasella,
  dellaCasella,
  descriviCasella,
  dominioDi,
  sembraIndirizzo,
  stessoIndirizzo,
} from '../dist-prove/dominio.mjs'

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

  it('riconosce come suo chi entra con l’uno o con l’altro nome', () => {
    // VS Code chiama l'account ora con la sigla, ora con l'indirizzo: vanno
    // bene tutti e due. Un terzo — l'account di casa — no.
    const suo = componiCasella('vxg140@edu.ti.ch', 'michel.brenna@edu.ti.ch')
    assert.equal(dellaCasella(suo, 'VXG140@edu.ti.ch'), true)
    assert.equal(dellaCasella(suo, 'Michel.Brenna@edu.ti.ch'), true)
    assert.equal(dellaCasella(suo, 'michel@casa.ch'), false)
    assert.equal(dellaCasella(null, 'vxg140@edu.ti.ch'), false)
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
