// Le ore nei giorni di chiusura: `anni.salva` toglie, con una chiusura nuova,
// le ore intatte che ci cadono dentro (quelle con dati restano, e lo dice);
// `ore.chiusure.togli` toglie a richiesta tutte quelle di un intervallo.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-chiusure-')
let api
let archivio
let corso

/** Un'ora del corso quel giorno, già scritta nel registro. */
function ora (data, inizio = '08:20') {
  const lezione = api.creaLezione(corso.id, data, inizio, 45)
  archivio.modifica((r) => { r.lezioni.push(lezione) }, ['lezioni'])
  return lezione
}

const esiste = (id) => archivio.registro.lezioni.some((l) => l.id === id)

before(async () => {
  ;({ api, archivio } = await archivioDiProva({ lavoro, dati, pdfAutomatici: 'mai' }))
  const annoId = archivio.registro.anni[0].id
  const classe = api.creaClasse(annoId, 'I MEC A')
  const allievo = api.creaAllievo('Rossi', 'Maria')
  classe.allievi.push(allievo)
  const materia = api.creaMateria('Matematica')
  corso = api.creaCorso(classe.id, materia.id, 'I MEC A — Matematica')
  archivio.modifica((r) => {
    r.classi.push(classe)
    r.materie.push(materia)
    r.corsi.push(corso)
  }, ['classi', 'corsi', 'registro'])
})
after(() => smonta(radice, archivio))

describe('una chiusura nuova, salvando l’anno', () => {
  it('toglie le ore intatte che ci cadono, lascia quelle con l’appello e lo dice', async () => {
    const intatta = ora('2026-12-28')
    const conAppello = ora('2026-12-29')
    const fuori = ora('2027-01-11')
    const allievoId = archivio.registro.classi[0].allievi[0].id
    archivio.modifica((r) => {
      r.lezioni.find((l) => l.id === conAppello.id).presenze = [{ allievoId, stato: 'presente' }]
    }, ['lezioni'])

    const anno = structuredClone(archivio.registro.anni[0])
    anno.sospensioni.push({ id: 'sos-natale', etichetta: 'Vacanze di Natale', dal: '2026-12-24', al: '2027-01-06' })
    const esito = await api.chiama(archivio, 'anni.salva', { anno })

    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esiste(intatta.id), false)
    assert.equal(esiste(conAppello.id), true)
    assert.equal(esiste(fuori.id), true)
  })

  it('un’ora messa a mano in una vacanza già dichiarata non la tocca', async () => {
    const recupero = ora('2026-12-30', '10:00')
    const anno = structuredClone(archivio.registro.anni[0])
    anno.semestri[0].etichetta = 'Primo semestre'
    const esito = await api.chiama(archivio, 'anni.salva', { anno })
    assert.equal(esito.ok, true)
    assert.equal(esiste(recupero.id), true)
  })
})

describe('ore.chiusure.togli', () => {
  it('toglie tutte le ore nelle chiusure dell’intervallo, e basta', async () => {
    const dentro = archivio.registro.lezioni.filter((l) => l.data >= '2026-12-24' && l.data <= '2027-01-06')
    assert.ok(dentro.length >= 2)
    const fuori = archivio.registro.lezioni.filter((l) => l.data > '2027-01-06').map((l) => l.id)

    const esito = await api.chiama(archivio, 'ore.chiusure.togli', { dal: '2026-12-21', al: '2027-01-10' })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.ok(dentro.every((l) => !esiste(l.id)))
    assert.ok(fuori.every(esiste))
  })

  it('rifatta, non trova più niente', async () => {
    const esito = await api.chiama(archivio, 'ore.chiusure.togli', { dal: '2026-12-21', al: '2027-01-10' })
    assert.equal(esito.ok, false)
  })

  it('sabato e domenica non sono chiusi, se nessuna chiusura li comprende', async () => {
    const sabato = ora('2027-01-16')
    const esito = await api.chiama(archivio, 'ore.chiusure.togli', { dal: '2027-01-11', al: '2027-01-17' })
    assert.equal(esito.ok, false)
    assert.equal(esiste(sabato.id), true)
  })
})
