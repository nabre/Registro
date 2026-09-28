// Prova di regressione per la matrice dell'appello:
// la variabile inVolo nella chiusura di pulsanteStato impedisce che clic consecutivi
// a raffica sovrascrivano lo stato ricalcolando sempre dallo stato del ridisegno,
// garantendo la corretta transizione anche prima della risposta dell'host,
// e ripristina lo stato in caso di rifiuto. Inoltre la pressione lunga consuma il clic.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { preparaDomSintetico } from '../helpers/domSintetico.mjs'

preparaDomSintetico()

const { importaSorgente } = await import('../helpers/sorgente.mjs')
const { pulsanteStato } = await importaSorgente('ui/pannello/views/lesson/attendance.ts')

describe('la chiusura di pulsanteStato dell’appello', () => {
  it('i clic a raffica calcolano la sequenza degli stati a partire da inVolo prima della risposta', async () => {
    const chiamate = []
    let risolviAzione
    const promessaInSospeso = new Promise((r) => { risolviAzione = r })

    const bottone = pulsanteStato({
      stato: 'presente',
      titolo: 'Mario Rossi',
      fuoco: 'allievo-1',
      al: (prossimo) => {
        chiamate.push(prossimo)
        return promessaInSospeso
      },
    })

    // Primo clic rapido: da 'presente' passa a 'assente'
    bottone.onclick()
    assert.deepEqual(chiamate, ['assente'])

    // Secondo clic rapido (la promessa non è ancora risolta):
    // deve leggere inVolo ('assente') e passare al prossimo stato ('ritardo'), non ripartire da 'presente'
    bottone.onclick()
    assert.deepEqual(chiamate, ['assente', 'ritardo'])

    // Terzo clic rapido: deve passare da 'ritardo' a 'esonerato'
    bottone.onclick()
    assert.deepEqual(chiamate, ['assente', 'ritardo', 'esonerato'])

    // Risolviamo l'azione con successo
    risolviAzione({ ok: true })
    await new Promise((r) => setTimeout(r, 0))
  })

  it('se l’azione fallisce, inVolo torna null e il clic successivo riparte dallo stato originale', async () => {
    const chiamate = []
    let risolviConErrore
    const promessaRifiutata = new Promise((r) => { risolviConErrore = r })

    const bottone = pulsanteStato({
      stato: 'presente',
      titolo: 'Mario Rossi',
      fuoco: 'allievo-1',
      al: (prossimo) => {
        chiamate.push(prossimo)
        return promessaRifiutata
      },
    })

    bottone.onclick()
    assert.deepEqual(chiamate, ['assente'])

    // L'azione fallisce
    risolviConErrore({ ok: false })
    await new Promise((r) => setTimeout(r, 0))

    // Ora inVolo deve essere tornato null: il clic successivo riparte da stato ('presente') -> 'assente'
    bottone.onclick()
    assert.deepEqual(chiamate, ['assente', 'assente'])
  })

  it('il menu contestuale spende il clic successivo', () => {
    const chiamate = []

    const bottone = pulsanteStato({
      stato: 'presente',
      titolo: 'Mario Rossi',
      fuoco: 'allievo-1',
      al: async (prossimo) => {
        chiamate.push(prossimo)
        return { ok: true }
      },
    })

    // Simuliamo apertura menu contestuale (tasto destro)
    const eventoMock = {
      preventDefault () {},
      stopPropagation () {},
      clientX: 10,
      clientY: 20,
    }
    bottone.oncontextmenu(eventoMock)

    // Il clic conseguente al rilascio deve essere scartato (clicSpeso)
    bottone.onclick()
    assert.equal(chiamate.length, 0, 'Il clic speso non deve far avanzare lo stato')

    // Il clic successivo (normale) invece funziona
    bottone.onclick()
    assert.deepEqual(chiamate, ['assente'])
  })
})
