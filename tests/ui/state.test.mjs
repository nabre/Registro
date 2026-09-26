// Lo stato dell'interfaccia nel webview: una finestra nuova riparte da quel che
// la precedente aveva lasciato nel ponte.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { apriInterfaccia } from '../helpers/statoInterfaccia.mjs'

describe('lo stato dell’interfaccia nel ponte', () => {
  it('convalida l’ambito del check ricordato', () => {
    const interfaccia = apriInterfaccia({
      getState: () => ({ ambitoCheck: 'altro' }),
      setState: () => {},
    })
    assert.equal(interfaccia.stato.ambitoCheck, 'corso')
  })

  it('una nuova finestra ripristina pagina, filtri e selezioni dal ponte', () => {
    let salvato = null
    const apri = () => apriInterfaccia({
      getState: () => salvato,
      setState: (valore) => { salvato = JSON.parse(JSON.stringify(valore)) },
    })
    const prima = apri()
    const preferenze = {
      vista: 'docenteClasse',
      paginaId: 'pagina.classe.assenze',
      schedaDocente: 'assenze',
      ambitoCheck: 'classe',
      sidebarDesktop: false,
      modoCalendario: 'mese',
      data: '2026-10-02',
      ricerca: 'Rossi',
      classeId: 'classe-1',
      corsoId: 'corso-1',
      semestreId: 'semestre-1',
      allievoId: 'allievo-1',
      filtroClasseId: 'classe-1',
      filtroCorsoAgendaId: 'corso-1',
    }
    prima.aggiorna(preferenze)
    prima.aggiorna({ documentiScelti: ['esportazioni/a.pdf', 'esportazioni/b.pdf'] })
    const seconda = apri()
    for (const [chiave, valore] of Object.entries(preferenze)) {
      assert.equal(seconda.stato[chiave], valore, chiave)
    }
    assert.deepEqual(
      Array.from(seconda.stato.documentiScelti),
      ['esportazioni/a.pdf', 'esportazioni/b.pdf'],
    )
  })
})
