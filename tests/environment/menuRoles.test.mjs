// I menu di soli ruoli («Modifica» e «Visualizza») entrano nel modello del
// menu: su macOS danno taglia, copia e incolla nei campi, e ovunque zoom e
// strumenti di sviluppo.

import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { describe, it } from 'node:test'

process.env.REGISTRO_USERDATA = mkdtempSync(percorso.join(tmpdir(), 'registro-menu-ruoli-'))

const { modelloDelMenu } = await import('../../dist-tests/menu.mjs')

/** Il menu costruito con un'azione finta al posto dell'apertura di un anno. */
function menu () {
  return modelloDelMenu({ apriDocumento: async () => {} })
}

/** I ruoli del sottomenu con quell'etichetta, o `undefined` se il menu manca. */
function ruoliDi (etichetta) {
  const trovato = menu().find((gruppo) => gruppo.label === etichetta)
  return trovato?.submenu?.map((voce) => voce.role).filter(Boolean)
}

describe('i menu dei ruoli ci sono', () => {
  it('«Modifica» porta taglia, copia e incolla', () => {
    const ruoli = ruoliDi('Modifica')
    assert.ok(ruoli, 'manca il menu «Modifica»')
    for (const ruolo of ['cut', 'copy', 'paste', 'selectAll']) assert.ok(ruoli.includes(ruolo), ruolo)
  })

  it('«Visualizza» porta lo zoom e gli strumenti di sviluppo', () => {
    const ruoli = ruoliDi('Visualizza')
    assert.ok(ruoli, 'manca il menu «Visualizza»')
    for (const ruolo of ['resetZoom', 'zoomIn', 'zoomOut', 'toggleDevTools']) assert.ok(ruoli.includes(ruolo), ruolo)
  })

  it('ognuno compare una volta sola', () => {
    const etichette = menu().map((gruppo) => gruppo.label)
    assert.equal(etichette.filter((e) => e === 'Modifica').length, 1)
    assert.equal(etichette.filter((e) => e === 'Visualizza').length, 1)
  })
})
