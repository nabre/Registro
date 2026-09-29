// Un anno che segue il calendario ufficiale (ADR-51): `anni.calendario` lo
// collega, lo riallinea e lo stacca; `anni.salva` rifiuta chi ne cambia inizio,
// fine o chiusure ufficiali, e lascia libero il resto.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-calendario-ufficiale-')
let api
let archivio

const anno = () => structuredClone(archivio.registro.anni[0])
const natale = (a) => a.sospensioni.find((s) => s.id === 'sos-ti-2026-2027-vacanze-di-natale')
const salva = (a) => api.chiama(archivio, 'anni.salva', { anno: a })
const calendario = (collega) =>
  api.chiama(archivio, 'anni.calendario', { annoId: archivio.registro.anni[0].id, collega })

before(async () => {
  ;({ api, archivio } = await archivioDiProva({ lavoro, dati, pdfAutomatici: 'mai' }))
  // Un anno 2026/2027 scritto a mano, con una chiusura che coincide col calendario.
  archivio.modifica((r) => {
    const a = r.anni[0]
    a.etichetta = '2026/2027'
    a.sospensioni = [
      { id: 'sos-mia-autunno', etichetta: 'Autunno', dal: '2026-10-31', al: '2026-11-08' },
      { id: 'sos-istituto', etichetta: 'Giornata d’istituto', dal: '2026-10-16', al: '2026-10-16' },
    ]
  }, ['registro'])
})
after(() => smonta(radice, archivio))

describe('anni.calendario', () => {
  it('collega: date e chiusure ufficiali, quella scritta a mano diventa collegata', async () => {
    assert.equal(anno().inizio, '2026-09-01')
    const esito = await calendario(true)
    assert.equal(esito.ok, true, JSON.stringify(esito))

    const a = anno()
    assert.deepEqual(a.calendarioUfficiale, { cantone: 'TI', annoScolastico: '2026/2027' })
    assert.equal(a.inizio, '2026-08-31')
    assert.equal(a.fine, '2027-06-16')
    assert.ok(natale(a))
    const autunno = a.sospensioni.find((s) => s.dal === '2026-10-31')
    assert.equal(autunno.id, 'sos-ti-2026-2027-vacanze-autunnali')
    assert.equal(autunno.etichetta, 'Vacanze autunnali')
    assert.equal(a.sospensioni.some((s) => s.id === 'sos-mia-autunno'), false)
    assert.ok(a.sospensioni.some((s) => s.id === 'sos-istituto'))
  })

  it('collegare di nuovo riallinea quel che il documento ha perso', async () => {
    // Una chiusura ufficiale sparita dal file, come dopo una modifica a mano.
    archivio.modifica((r) => {
      r.anni[0].sospensioni = r.anni[0].sospensioni.filter((s) => !s.id.endsWith('vacanze-di-natale'))
    }, ['registro'])
    assert.equal(natale(anno()), undefined)
    const esito = await calendario(true)
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.ok(natale(anno()))
  })
})

describe('anni.salva su un anno collegato', () => {
  it('rifiuta inizio e fine cambiati', async () => {
    const a = anno()
    a.semestri[0].inizio = '2026-09-07'
    const esito = await salva(a)
    assert.equal(esito.ok, false)
    assert.match(JSON.stringify(esito), /calendario ufficiale/)
    assert.equal(anno().inizio, '2026-08-31')
  })

  it('rifiuta una chiusura collegata tolta, spostata o rinominata', async () => {
    const tolta = anno()
    tolta.sospensioni = tolta.sospensioni.filter((s) => s !== natale(tolta))
    assert.equal((await salva(tolta)).ok, false)

    const spostata = anno()
    natale(spostata).al = '2027-01-10'
    assert.equal((await salva(spostata)).ok, false)

    const rinominata = anno()
    natale(rinominata).etichetta = 'Natale'
    assert.equal((await salva(rinominata)).ok, false)

    assert.ok(natale(anno()))
  })

  it('rifiuta chi toglie il marcatore salvando', async () => {
    const { calendarioUfficiale: _via, ...a } = anno()
    const esito = await salva(a)
    assert.equal(esito.ok, false)
    assert.ok(anno().calendarioUfficiale)
  })

  it('accetta una chiusura propria e il confine; il nome di un semestre non passa', async () => {
    const a = anno()
    a.sospensioni.push({ id: 'sos-ponte', etichetta: 'Ponte', dal: '2027-05-07', al: '2027-05-07' })
    a.sospensioni = a.sospensioni.filter((s) => s.id !== 'sos-istituto')
    a.semestri[0].fine = '2027-01-24'
    a.semestri[1].inizio = '2027-01-25'
    a.semestri[1].etichetta = 'Primavera'
    const esito = await salva(a)
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const dopo = anno()
    assert.ok(dopo.sospensioni.some((s) => s.id === 'sos-ponte'))
    assert.equal(dopo.sospensioni.some((s) => s.id === 'sos-istituto'), false)
    assert.equal(dopo.semestri[0].fine, '2027-01-24')
    assert.equal('etichetta' in dopo.semestri[1], false)
  })
})

describe('staccato', () => {
  it('toglie solo il marcatore, e poi si modifica tutto', async () => {
    const prima = anno()
    const esito = await calendario(false)
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const staccato = anno()
    assert.equal(staccato.calendarioUfficiale, undefined)
    assert.deepEqual(staccato.sospensioni, prima.sospensioni)
    assert.equal(staccato.inizio, prima.inizio)

    staccato.semestri[0].inizio = '2026-09-07'
    staccato.sospensioni = staccato.sospensioni.filter((s) => s !== natale(staccato))
    const salvato = await salva(staccato)
    assert.equal(salvato.ok, true, JSON.stringify(salvato))
    assert.equal(anno().inizio, '2026-09-07')
    assert.equal(natale(anno()), undefined)
  })
})

describe('anni.crea collegato', () => {
  it('rifiuta date che non sono quelle ufficiali', async () => {
    const esito = await api.chiama(archivio, 'anni.crea', {
      inizio: '2026-09-01',
      fine: '2027-06-30',
      calendarioUfficiale: { cantone: 'TI', annoScolastico: '2026/2027' },
    })
    assert.equal(esito.ok, false)
    assert.match(JSON.stringify(esito), /calendario ufficiale/)
  })
})
