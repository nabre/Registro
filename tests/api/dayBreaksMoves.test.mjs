// Spostare o copiare un'ora la ridispone sulle pause della giornata, nel
// gestore: vale per calendario, riga di comando e assistente. Le azioni
// passano da `esegui`, col deposito vero.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-pause-giornata-')

/** Ricreazione 9:30–9:45, poi due UD e dieci minuti: 11:15–11:25. */
const GIORNATA = {
  prima: { inizio: '09:30', durataMin: 15 },
  seguenti: [{ dopoUd: 2, durataMin: 10 }],
}

let api
let archivio
let corso

const esegui = (azione) => api.esegui(archivio, azione)
const lezionePerId = (id) => archivio.registro.lezioni.find((l) => l.id === id)
const forma = (lezione) =>
  [...lezione.slot]
    .sort((a, b) => a.inizio.localeCompare(b.inizio))
    .map((s) => `${s.tipo} ${s.inizio}–${s.fine}`)
/** Le UD dell'ora: i minuti di lezione, pause escluse, a 45 per UD. */
const ud = (lezione) =>
  lezione.slot
    .filter((s) => s.tipo === 'lezione')
    .reduce((somma, s) => {
      const [ha, ma] = s.inizio.split(':').map(Number)
      const [hb, mb] = s.fine.split(':').map(Number)
      return somma + ((hb * 60 + mb) - (ha * 60 + ma)) / 45
    }, 0)

/** Un'ora di quattro UD dalle 14:00, senza pause. */
function oraDiQuattro () {
  const lezione = api.creaLezione(corso.id, '2026-09-14', '14:00', 4 * 45)
  archivio.modifica((r) => { r.lezioni.push(lezione) }, ['lezioni'])
  return lezione
}

before(async () => {
  ;({ api, archivio } = await archivioDiProva({ lavoro, dati, deposito: true, pdfAutomatici: 'mai' }))
  const annoId = archivio.registro.anni[0].id
  const classe = api.creaClasse(annoId, 'I MEC A')
  const materia = api.creaMateria('Matematica')
  corso = api.creaCorso(classe.id, materia.id, 'I MEC A — Matematica')
  archivio.modifica((r) => {
    r.classi.push(classe)
    r.materie.push(materia)
    r.corsi.push(corso)
    r.impostazioni.pause = structuredClone(GIORNATA)
  }, ['classi', 'corsi', 'registro'])
})

after(() => smonta(radice, archivio))

describe('le pause della giornata quando un’ora si muove', () => {
  it('spostata a un’altra ora, le UD si fermano alla ricreazione e riprendono dopo', async () => {
    const lezione = oraDiQuattro()
    const esito = await esegui({
      tipo: 'lezione.sposta', lezioneId: lezione.id, data: '2026-09-15', inizio: '08:00',
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const spostata = lezionePerId(lezione.id)
    assert.equal(spostata.data, '2026-09-15')
    assert.deepEqual(forma(spostata), [
      'lezione 08:00–09:30',
      'pausa 09:30–09:45',
      'lezione 09:45–11:15',
    ])
    assert.equal(ud(spostata), 4, 'le UD dell’appello sono cambiate')
  })

  it('spostata solo di giorno resta com’è', async () => {
    const lezione = oraDiQuattro()
    const prima = forma(lezione)
    const esito = await esegui({ tipo: 'lezione.sposta', lezioneId: lezione.id, data: '2026-09-16' })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(forma(lezionePerId(lezione.id)), prima)
  })

  it('copiata a un’altra ora, la copia segue le pause', async () => {
    const lezione = oraDiQuattro()
    const esito = await esegui({
      tipo: 'lezione.duplica', lezioneId: lezione.id, data: '2026-09-17', inizio: '10:30',
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(forma(lezionePerId(esito.creato.id)), [
      'lezione 10:30–11:15',
      'pausa 11:15–11:25',
      'lezione 11:25–13:40',
    ])
  })
})

describe('un’ora che cade su una pausa della giornata', () => {
  it('salvata sopra la ricreazione, si spezza e si sposta con le stesse UD, e lo dice', async () => {
    const lezione = api.creaLezione(corso.id, '2026-09-21', '08:45', 3 * 45)
    const esito = await esegui({ tipo: 'lezione.salva', lezione })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.match(esito.messaggio?.testo ?? '', /pausa della giornata/)
    assert.deepEqual(forma(lezionePerId(lezione.id)), [
      'lezione 08:45–09:30',
      'pausa 09:30–09:45',
      'lezione 09:45–11:15',
    ])
  })

  it('salvata fuori dalle pause resta com’è, pause a mano comprese, e non dice niente', async () => {
    const lezione = api.creaLezione(corso.id, '2026-09-21', '14:00', 2 * 45)
    lezione.slot = [
      { id: 's1', inizio: '14:00', fine: '14:45', tipo: 'lezione' },
      { id: 's2', inizio: '14:45', fine: '14:50', tipo: 'pausa' },
      { id: 's3', inizio: '14:50', fine: '15:35', tipo: 'lezione' },
    ]
    const esito = await esegui({ tipo: 'lezione.salva', lezione })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.messaggio, undefined)
    assert.deepEqual(forma(lezionePerId(lezione.id)), [
      'lezione 14:00–14:45',
      'pausa 14:45–14:50',
      'lezione 14:50–15:35',
    ])
  })

  it('le pause dichiarate dopo sistemano le ore che ci cadono già sopra', async () => {
    archivio.modifica((r) => { delete r.impostazioni.pause }, ['registro'])
    const sopra = api.creaLezione(corso.id, '2026-09-22', '08:00', 4 * 45)
    const fuori = api.creaLezione(corso.id, '2026-09-22', '13:00', 2 * 45)
    archivio.modifica((r) => { r.lezioni.push(sopra, fuori) }, ['lezioni'])
    const prima = forma(fuori)

    const { intestazione: _intestazione, ...resto } = archivio.registro.impostazioni
    const esito = await esegui({
      tipo: 'impostazioni.salva',
      impostazioni: { ...resto, pause: structuredClone(GIORNATA) },
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.match(esito.messaggio?.testo ?? '', /pausa della giornata/)
    assert.deepEqual(forma(lezionePerId(sopra.id)), [
      'lezione 08:00–09:30',
      'pausa 09:30–09:45',
      'lezione 09:45–11:15',
    ])
    assert.deepEqual(forma(lezionePerId(fuori.id)), prima)
  })
})
