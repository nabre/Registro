// `valutazioni.voti` conta i voti con `votiEffettivi`, lo stesso filtro del
// dominio: anche chi era **assente** resta fuori, o pannello e assistente
// darebbero due medie diverse.
//
// Il caso: un assente con un 1 rimasto in casella accanto a due presenti da 6.
// Con l'assente la media fa 4.33 e c'è un insufficiente; senza fa 6. La seconda
// prova non ha voti che contano: `null`, non zero.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-voti-assenti-')

const DAL = '2026-09-01'
const AL = '2027-06-30'

let api
let archivio
let rossi
let bianchi
let neri
/** La prova con dentro l'assente che ha ancora un numero in casella. */
let conAssente
/** La prova su cui nessun voto conta: uno solo, e di chi non c'era. */
let soloAssenti

before(async () => {
  ;({ api, archivio } = await archivioDiProva({
    lavoro,
    dati,
    dal: DAL,
    al: AL,
    pdfAutomatici: 'mai',
  }))

  const {
    creaAllievo, creaClasse, creaCorso, creaMateria, creaValutazione,
  } = api

  const annoId = archivio.registro.anni[0].id

  const classe = creaClasse(annoId, 'I MEC A')
  rossi = creaAllievo('Rossi', 'Mario')
  bianchi = creaAllievo('Bianchi', 'Luca')
  neri = creaAllievo('Neri', 'Ugo')
  classe.allievi.push(rossi, bianchi, neri)

  const matematica = creaMateria('Matematica')
  const corso = creaCorso(classe.id, matematica.id, 'I MEC A — Matematica')

  archivio.modifica((r) => {
    r.classi.push(classe)
    r.materie.push(matematica)
    r.corsi.push(corso)
  }, ['classi', 'corsi', 'registro'])

  conAssente = creaValutazione(corso.id, 'Frazioni', undefined, '2026-10-05')
  conAssente.voti = [
    { allievoId: rossi.id, valore: 6, assente: false },
    { allievoId: bianchi.id, valore: 6, assente: false },
    // Numero e assenza restano scritti: il conto li salta.
    { allievoId: neri.id, valore: 1, assente: true },
  ]

  soloAssenti = creaValutazione(corso.id, 'Equazioni', undefined, '2026-11-09')
  soloAssenti.voti = [
    { allievoId: neri.id, valore: 3, assente: true },
  ]

  for (const valutazione of [conAssente, soloAssenti]) {
    const esito = await api.chiama(archivio, 'valutazioni.salva', { valutazione })
    assert.equal(esito.ok, true, JSON.stringify(esito))
  }
})

after(() => smonta(radice, archivio))

describe('valutazioni.voti conta solo i voti che contano', () => {
  it('chi era assente resta fuori da media e insufficienti', async () => {
    const esito = await api.chiama(archivio, 'valutazioni.voti', {
      valutazioneId: conAssente.id,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    // Sei e non 4.33: l'1 dell'assente non entra nella divisione.
    assert.equal(esito.dati.media, 6)
    assert.equal(esito.dati.insufficienti, 0)
    // La riga resta, con numero e spunta: si toglie il conto, non il dato.
    const riga = esito.dati.righe.find((r) => r.allievoId === neri.id)
    assert.equal(riga.assente, true)
    assert.equal(riga.voto, 1)
    assert.equal(riga.sufficiente, false)
  })

  it('la stessa media che il dominio dà al pannello', async () => {
    const dominio = await import('../../dist-tests/domain.mjs')
    const momento = archivio.registro.valutazioni.find((v) => v.id === conAssente.id)
    const esito = await api.chiama(archivio, 'valutazioni.voti', {
      valutazioneId: conAssente.id,
    })
    assert.equal(esito.dati.media, dominio.mediaMomento(momento))
  })

  it('senza nemmeno un voto che conti la media è nulla, non zero', async () => {
    const esito = await api.chiama(archivio, 'valutazioni.voti', {
      valutazioneId: soloAssenti.id,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.media, null)
    assert.equal(esito.dati.insufficienti, 0)
  })
})
