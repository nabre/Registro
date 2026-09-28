// `aggiorna` avvisa gli iscritti (e quindi ridisegna) solo quando qualcosa
// cambia davvero: un valore uguale non rifà la pagina e non riscrive quel che
// si ricorda. `ridisegna` è il modo esplicito di rifarla senza cambiare niente.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { apriInterfaccia } from '../helpers/statoInterfaccia.mjs'

/** Un'interfaccia nuova, con il conto degli avvisi e delle scritture nel ponte. */
function apri () {
  const conti = { avvisi: 0, scritture: 0 }
  const interfaccia = apriInterfaccia({
    getState: () => null,
    setState: () => { conti.scritture += 1 },
  })
  interfaccia.iscriviti(() => { conti.avvisi += 1 })
  return { interfaccia, conti }
}

describe('aggiorna confronta prima di avvisare', () => {
  it('un valore identico non avvisa e non ricorda', () => {
    const { interfaccia, conti } = apri()
    interfaccia.aggiorna({ ricerca: 'Rossi' })
    assert.equal(conti.avvisi, 1)
    const scritture = conti.scritture
    interfaccia.aggiorna({ ricerca: 'Rossi' })
    interfaccia.aggiorna({ ricerca: 'Rossi', vista: interfaccia.stato.vista })
    assert.equal(conti.avvisi, 1)
    assert.equal(conti.scritture, scritture)
  })

  it('basta una chiave cambiata per avvisare', () => {
    const { interfaccia, conti } = apri()
    interfaccia.aggiorna({ ricerca: 'Rossi', data: interfaccia.stato.data })
    assert.equal(conti.avvisi, 1)
    assert.equal(interfaccia.stato.ricerca, 'Rossi')
  })

  it('lo stesso oggetto non è un cambio; uno nuovo sì', () => {
    const { interfaccia, conti } = apri()
    const scelti = interfaccia.stato.documentiScelti
    interfaccia.aggiorna({ documentiScelti: scelti })
    assert.equal(conti.avvisi, 0)
    interfaccia.aggiorna({ documentiScelti: [...scelti] })
    assert.equal(conti.avvisi, 1)
  })

  it('ridisegna avvisa senza cambiare lo stato né ricordare', () => {
    const { interfaccia, conti } = apri()
    const scritture = conti.scritture
    interfaccia.ridisegna()
    assert.equal(conti.avvisi, 1)
    assert.equal(conti.scritture, scritture)
  })
})
