// Il ciclo di vita del documento: che cosa fa il registro quando non resta
// nessuna finestra, e quando il vassoio chiede il benvenuto. Scegliere un
// recente dal benvenuto non fa uscire l'applicazione né avvisare del vassoio
// mentre l'anno arriva; «Mostra il benvenuto» durante l'apertura non lascia un
// benvenuto sopra l'anno.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { importaSorgente } from '../helpers/sorgente.mjs'

const { quandoNonRestanoFinestre, allaRichiestaDelBenvenuto } = await importaSorgente('shell/lifecycle.ts')

/** Uno stato qualunque, ritoccato dove la prova lo dice. */
function stato (ritocchi = {}) {
  return {
    inChiusura: false,
    aperturaInCorso: false,
    vassoioAcceso: false,
    chiusuraNelVassoio: false,
    piattaforma: 'win32',
    ...ritocchi,
  }
}

describe('quando non restano finestre', () => {
  it('un anno che si sta aprendo non fa uscire, nemmeno senza vassoio', () => {
    assert.equal(quandoNonRestanoFinestre(stato({ aperturaInCorso: true })), 'aspetta')
  })

  it('un anno che si sta aprendo non fa partire l’avviso del vassoio', () => {
    const conVassoio = stato({
      aperturaInCorso: true, vassoioAcceso: true, chiusuraNelVassoio: true,
    })
    assert.equal(quandoNonRestanoFinestre(conVassoio), 'aspetta')
  })

  it('senza apertura in corso resta la regola di sempre', () => {
    assert.equal(quandoNonRestanoFinestre(stato()), 'esci')
    assert.equal(quandoNonRestanoFinestre(stato({ vassoioAcceso: true })), 'esci')
    assert.equal(quandoNonRestanoFinestre(stato({ chiusuraNelVassoio: true })), 'esci')
    assert.equal(
      quandoNonRestanoFinestre(stato({ vassoioAcceso: true, chiusuraNelVassoio: true })),
      'vassoio',
    )
    assert.equal(quandoNonRestanoFinestre(stato({ piattaforma: 'darwin' })), 'aspetta')
  })

  it('chi sta uscendo esce, anche con un anno a metà e il vassoio acceso', () => {
    const tutto = stato({
      inChiusura: true, aperturaInCorso: true, vassoioAcceso: true, chiusuraNelVassoio: true,
    })
    assert.equal(quandoNonRestanoFinestre(tutto), 'esci')
  })
})

describe('«Mostra il benvenuto» dal vassoio', () => {
  it('mentre un anno si apre non fa niente', () => {
    assert.equal(allaRichiestaDelBenvenuto({ aperturaInCorso: true, documentoAperto: false }), 'niente')
    assert.equal(allaRichiestaDelBenvenuto({ aperturaInCorso: true, documentoAperto: true }), 'niente')
  })

  it('con un anno aperto riporta davanti il registro', () => {
    assert.equal(allaRichiestaDelBenvenuto({ aperturaInCorso: false, documentoAperto: true }), 'registro')
  })

  it('senza anno mostra il benvenuto', () => {
    assert.equal(allaRichiestaDelBenvenuto({ aperturaInCorso: false, documentoAperto: false }), 'benvenuto')
  })
})
