// Come la fila di Alt+← prende i rimandi dentro le impostazioni: una voce
// diversa della stessa area è la stessa pagina scorsa, un'altra area o
// un'altra pagina sono un posto nuovo.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { apriInterfaccia } from '../helpers/statoInterfaccia.mjs'

/** Una finestra nuova e i modi con cui `vai` ha detto i posti alla storia. */
function finestra () {
  const ui = apriInterfaccia({ getState: () => null, setState: () => {} })
  const modi = []
  ui.seguiPosti((fatto, storia) => {
    modi.push([fatto.posto.scheda ?? fatto.posto.pagina, storia])
  })
  return { ui, modi }
}

const impostazioni = (scheda) => ({ pagina: 'pagina.impostazioni', scheda })

describe('la storia dei rimandi nelle impostazioni', () => {
  it('un rimando a un’altra voce della stessa area sostituisce, uno a un’altra area aggiunge', () => {
    const { ui, modi } = finestra()
    ui.vai({ pagina: 'pagina.calendario' })
    ui.vai(impostazioni('utente#posta'))
    ui.vai(impostazioni('utente#account'))
    ui.vai(impostazioni('utente'))
    ui.vai(impostazioni('programma#modelli'))
    ui.vai({ pagina: 'pagina.guida' })
    assert.deepEqual(modi, [
      ['pagina.calendario', 'aggiungi'],
      ['utente#posta', 'aggiungi'],
      ['utente#account', 'sostituisci'],
      ['utente', 'sostituisci'],
      ['programma#modelli', 'aggiungi'],
      ['pagina.guida', 'aggiungi'],
    ])
  })

  it('il modo chiesto da chi chiama comanda', () => {
    const { ui, modi } = finestra()
    ui.vai(impostazioni('utente#posta'))
    ui.vai(impostazioni('utente#account'), { storia: 'aggiungi' })
    assert.deepEqual(modi.at(-1), ['utente#account', 'aggiungi'])
  })
})
