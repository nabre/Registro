// I PDF seguono i dati da qualunque parte arrivi la scrittura: la
// rigenerazione automatica (`pdfAutomatici: 'sempre'`) sta in `chiama()`, non
// solo nella strada del pannello. Si guarda la coda subito dopo una scrittura
// con l'origine del condotto.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-rigenera-')

let api
let archivio
let lezione
let rossi
let fisica

before(async () => {
  ;({ api, archivio } = await archivioDiProva({ lavoro, dati }))

  const {
    creaAllievo, creaClasse, creaCorso, creaLezione, creaMateria,
  } = api

  const anno = archivio.registro.anni[0]

  const classe = creaClasse(anno.id, 'I MEC A')
  rossi = creaAllievo('Rossi', 'Maria')
  classe.allievi.push(rossi)
  const matematica = creaMateria('Matematica')
  const corso = creaCorso(classe.id, matematica.id, 'I MEC A — Matematica')
  lezione = creaLezione(corso.id, '2026-09-08', '08:20', 90)
  const materiaFisica = creaMateria('Fisica')
  fisica = creaCorso(classe.id, materiaFisica.id, 'I MEC A — Fisica')

  archivio.modifica((r) => {
    r.impostazioni.pdfAutomatici = 'sempre'
    r.classi.push(classe)
    r.materie.push(matematica, materiaFisica)
    r.corsi.push(corso, fisica)
    r.lezioni.push(lezione)
  }, ['classi', 'corsi', 'lezioni', 'registro'])
})

after(async () => {
  // Il timer della rigenerazione non deve sopravvivere alla prova: fermato
  // prima che scatti, non scrive niente.
  await api?.fermaRapporti()
  smonta(radice, archivio)
})

describe('la rigenerazione dei PDF dopo una scrittura che non passa dal pannello', () => {
  it('una casella d’appello segnata dal condotto mette il corso in attesa', async () => {
    await api.fermaRapporti()
    assert.equal(api.rigenerazioniInAttesa(), 0)

    const esito = await api.chiama(
      archivio,
      'ore.appello.riga',
      { lezioneId: lezione.id, allievoId: rossi.id, stato: 'assente' },
      { origine: 'condotto' },
    )
    assert.ok(esito.ok, JSON.stringify(esito))
    assert.equal(api.rigenerazioniInAttesa(), 1)
  })

  it('un’ora salvata intera (l’id sta dentro la lezione) mette il corso in attesa', async () => {
    await api.fermaRapporti()
    assert.equal(api.rigenerazioniInAttesa(), 0)

    const esito = await api.chiama(
      archivio,
      'ore.salva',
      { lezione: { ...lezione, supplenza: true } },
      { origine: 'condotto' },
    )
    assert.ok(esito.ok, JSON.stringify(esito))
    assert.equal(api.rigenerazioniInAttesa(), 1)
  })

  it('un’ora passata a un altro corso mette in attesa anche quello di prima', async () => {
    await api.fermaRapporti()
    const esito = await api.chiama(
      archivio,
      'ore.salva',
      { lezione: { ...lezione, corsoId: fisica.id } },
      { origine: 'condotto' },
    )
    assert.ok(esito.ok, JSON.stringify(esito))
    assert.equal(api.rigenerazioniInAttesa(), 2)
  })
})
