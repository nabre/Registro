// `modifiche` su una lettura è zero anche se nel frattempo passa una
// scrittura: una lettura si può sempre ritentare. Lo stesso nel giornale.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-giro12-modifiche-')

let api
let archivio
let sblocca = () => undefined

before(async () => {
  ;({ api, archivio } = await archivioDiProva({ lavoro, dati, registra: false }))
  const { definisci, registra, SCRITTURA, schemi } = api

  const lenta = (nome, esito) => definisci({
    nome,
    versione: 1,
    genere: 'lettura',
    titolo: 'Una lettura che aspetta la prova',
    idempotente: true,
    ingresso: schemi.vuoto(),
    uscita: schemi.vuoto(),
    esegui: async () => {
      await new Promise((risolvi) => { sblocca = risolvi })
      return esito()
    },
  })

  registra(
    lenta('giro12.lentaFallisce', () => { throw new Error('rete giù') }),
    lenta('giro12.lentaRiesce', () => ({})),
    definisci({
      nome: 'giro12.scrive',
      versione: 1,
      genere: 'scrittura',
      titolo: 'Una scrittura vera, che muove la revisione',
      idempotente: true,
      collezioni: ['registro'],
      ingresso: schemi.oggetto({
        minuti: schemi.numero({ intero: true, minimo: 0, massimo: 600 }),
      }),
      uscita: SCRITTURA,
      esegui: (ambito, ingresso) => {
        ambito.contesto.modifica((r) => {
          r.impostazioni.durataPausaPredefinita = ingresso.minuti
        }, ['registro'])
        return { revisione: ambito.contesto.archivio.revisione }
      },
    }),
  )
})

after(() => {
  sblocca()
  smonta(radice, archivio)
})

/** Lancia la lettura lenta, fa passare una scrittura, e poi la lascia finire. */
async function conScritturaInMezzo (nome, minuti) {
  const voci = []
  const stacca = api.osserva((voce) => voci.push(voce))
  // Un `console.error` del guasto interno è atteso: si zittisce per la prova.
  const errore = console.error
  console.error = () => undefined
  try {
    const lettura = api.chiama(archivio, nome, {})
    await new Promise((risolvi) => setTimeout(risolvi, 10))
    const prima = archivio.revisione
    const scrittura = await api.chiama(archivio, 'giro12.scrive', { minuti })
    assert.equal(scrittura.ok, true, JSON.stringify(scrittura))
    assert.equal(archivio.revisione, prima + 1, 'la scrittura non ha scritto: la prova non prova')
    sblocca()
    const esito = await lettura
    return { esito, voce: voci.find((v) => v.procedura === nome) }
  } finally {
    console.error = errore
    stacca()
  }
}

describe('una lettura non conta le scritture degli altri', () => {
  it('fallita, riporta zero modifiche nella busta e nel giornale', async () => {
    const { esito, voce } = await conScritturaInMezzo('giro12.lentaFallisce', 21)
    assert.equal(esito.ok, false)
    assert.equal(esito.modifiche, 0, 'una lettura fallita dice «non ritentare»')
    assert.equal(voce?.modifiche, 0)
  })

  it('riuscita, riporta zero modifiche nel giornale', async () => {
    const { esito, voce } = await conScritturaInMezzo('giro12.lentaRiesce', 22)
    assert.equal(esito.ok, true)
    assert.equal(voce?.modifiche, 0)
  })
})
