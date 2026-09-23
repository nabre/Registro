// I documenti seguono i dati, da qualunque parte arrivi la scrittura.
//
// La rigenerazione automatica dei PDF — `pdfAutomatici: 'sempre'`, il
// predefinito — viveva solo dentro `esegui()`, cioè nella strada del pannello.
// L'agenda, l'assistente e il condotto chiamano `chiama()` direttamente: una
// correzione d'appello fatta dal widget lasciava il verbale con «assente»
// finché qualcuno non toccava quel corso dal pannello. Adesso la regola sta in
// `chiama()`, e queste prove guardano la coda in attesa subito dopo una
// scrittura fatta con l'origine dell'agenda.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-api-rigenera-'))
const lavoro = percorso.join(radice, 'lavoro')
const dati = percorso.join(lavoro, 'registro')
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

let api
let archivio
let lezione
let rossi

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(dati, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify({ cartellaLavoro: lavoro }),
  )

  api = await import('../../dist-tests/api.mjs')
  api.registraTutte()

  const {
    Archivio, Uri, creaAllievo, creaAnno, creaClasse, creaCorso, creaLezione, creaMateria,
  } = api

  archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  await archivio.apri(null)
  await archivio.creaAnno(
    creaAnno('2026-09-01', '2027-06-30'),
    Uri.file(percorso.join(dati, '2026-2027.registro')),
  )
  const anno = archivio.registro.anni[0]

  const classe = creaClasse(anno.id, 'I MEC A')
  rossi = creaAllievo('Rossi', 'Maria')
  classe.allievi.push(rossi)
  const matematica = creaMateria('Matematica')
  const corso = creaCorso(classe.id, matematica.id, 'I MEC A — Matematica')
  lezione = creaLezione(corso.id, '2026-09-08', '08:20', 90)

  archivio.modifica((r) => {
    r.impostazioni.pdfAutomatici = 'sempre'
    r.classi.push(classe)
    r.materie.push(matematica)
    r.corsi.push(corso)
    r.lezioni.push(lezione)
  }, ['classi', 'corsi', 'lezioni', 'registro'])
})

after(async () => {
  // Il timer della rigenerazione non deve sopravvivere alla prova: fermato
  // prima che scatti, non scrive niente.
  await api?.fermaRapporti()
  archivio?.dispose()
  rmSync(radice, { recursive: true, force: true })
})

describe('la rigenerazione dei PDF dopo una scrittura che non passa dal pannello', () => {
  it('una casella d’appello segnata dall’agenda mette il corso in attesa', async () => {
    await api.fermaRapporti()
    assert.equal(api.rigenerazioniInAttesa(), 0)

    const esito = await api.chiama(
      archivio,
      'ore.appello.riga',
      { lezioneId: lezione.id, allievoId: rossi.id, stato: 'assente' },
      { origine: 'agenda' },
    )
    assert.ok(esito.ok, JSON.stringify(esito))
    assert.equal(api.rigenerazioniInAttesa(), 1)
  })
})
