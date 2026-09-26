// Gli aggiornamenti detti a parole (`racconta` in `environment/updates.ts`),
// per quattro superfici: impostazioni, barra in fondo, filetto della barra del
// titolo, benvenuto. Ogni fase tiene il suo gesto, e solo le fasi che sono
// notizie accendono il filetto.

import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

import { cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice } = cartelleDiProva('registro-aggiornamenti-')

let api

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  writeFileSync(percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'), '{}')
  api = await import('../../dist-tests/api.mjs')
})

after(() => smonta(radice))

/** Uno stato nudo, come lo tiene `updates.ts`: supportato, con una versione trovata. */
function grezzo (altro = {}) {
  return {
    versione: '1.6.0',
    supportato: true,
    fase: 'fermo',
    pagina: 'https://github.com/nabre/Registro/releases/latest',
    ...altro,
  }
}

const NUOVA = { nuova: { versione: '1.7.0' } }

describe('il racconto degli aggiornamenti', () => {
  it('ogni fase ha le sue due parole, la sua frase e il suo tono', () => {
    const fasi = ['fermo', 'controllo', 'aggiornato', 'disponibile', 'scarico', 'pronto', 'installazione', 'errore']
    for (const fase of fasi) {
      const r = api.racconta(grezzo({ fase, ...NUOVA }))
      assert.ok(r.breve.length > 0, fase)
      assert.ok(r.frase.length > 0, fase)
      assert.ok(['quiete', 'informativo', 'positivo', 'attenzione', 'negativo'].includes(r.tono), fase)
    }
  })

  it('il gesto è quello che la fase permette', () => {
    const gesto = (fase) => api.racconta(grezzo({ fase, ...NUOVA })).gesto
    assert.equal(gesto('fermo').tipo, 'aggiornamenti.controlla')
    assert.equal(gesto('aggiornato').tipo, 'aggiornamenti.controlla')
    assert.equal(gesto('errore').tipo, 'aggiornamenti.controlla')
    assert.equal(gesto('disponibile').tipo, 'aggiornamenti.scarica')
    assert.equal(gesto('pronto').tipo, 'aggiornamenti.installa')
    assert.equal(gesto('pronto').testo, 'Riavvia e aggiorna')
    // Durante il controllo il pulsante c'è ma è spento: non si rilancia.
    assert.equal(gesto('controllo').spento, true)
    // Mentre scende o si installa non c'è niente da premere.
    assert.equal(gesto('scarico'), undefined)
    assert.equal(gesto('installazione'), undefined)
  })

  it('è una notizia solo una versione nuova, e la chiave cambia quando è pronta', () => {
    const notizia = (fase) => api.racconta(grezzo({ fase, ...NUOVA })).notizia
    for (const fase of ['fermo', 'controllo', 'aggiornato', 'errore']) {
      assert.equal(notizia(fase), undefined, fase)
    }
    // Trovata e in arrivo sono la stessa notizia: chiusa una, non torna l'altra.
    assert.equal(notizia('disponibile'), notizia('scarico'))
    // Scaricata è una notizia nuova: il filetto chiuso torna, una volta.
    assert.notEqual(notizia('pronto'), notizia('disponibile'))
    assert.equal(notizia('installazione'), notizia('pronto'))
  })

  it('lo scarico dice quanto, e senza totale non inventa una quota', () => {
    const mezzo = api.racconta(grezzo({ fase: 'scarico', ...NUOVA, byte: 50, totale: 200 }))
    assert.equal(mezzo.quota, 0.25)
    assert.equal(mezzo.breve, 'scarico la 1.7.0: 25%')
    const ignoto = api.racconta(grezzo({ fase: 'scarico', ...NUOVA, byte: 0, totale: 0 }))
    assert.equal(ignoto.quota, undefined)
    assert.equal(ignoto.breve, 'scarico la 1.7.0')
  })

  it('uno scarico fallito lascia «Scarica» e dice perché', () => {
    const r = api.racconta(grezzo({ fase: 'disponibile', ...NUOVA, errore: 'GitHub non risponde.' }))
    assert.equal(r.gesto.tipo, 'aggiornamenti.scarica')
    assert.match(r.frase, /GitHub non risponde\.$/)
  })

  it('«pronta» dice come si installa, secondo l’impostazione', async () => {
    const pronta = () => api.racconta(grezzo({ fase: 'pronto', ...NUOVA })).frase
    assert.match(pronta(), /quando esci dal registro/)
    const conf = api.impostazioni.leggi('registroDocenti.aggiornamenti')
    await conf.update('installaAllaChiusura', false)
    try {
      assert.match(pronta(), /quando premi «Riavvia e aggiorna»/)
    } finally {
      await conf.update('installaAllaChiusura', undefined)
    }
  })

  it('chi non si aggiorna da sé ha la pagina delle release, e nessuna notizia', () => {
    const r = api.racconta(grezzo({ supportato: false, motivo: 'Portabile.' }))
    assert.equal(r.frase, 'Portabile.')
    assert.equal(r.gesto.tipo, 'pagina')
    assert.equal(r.notizia, undefined)
  })

  it('lo stato che esce porta sempre le sue parole', () => {
    // Con l'Electron finto il registro non è impacchettato: non si aggiorna da sé,
    // e il racconto lo dice.
    const s = api.statoAggiornamenti()
    assert.equal(s.supportato, false)
    assert.deepEqual(s.racconto, api.racconta({ ...s, racconto: undefined }))
  })
})
