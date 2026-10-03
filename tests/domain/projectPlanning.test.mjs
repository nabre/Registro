import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'
import { importaSorgente } from '../helpers/sorgente.mjs'
import { creaAttivita, creaLezione, creaPiano, creaProgetto } from '../../dist-tests/domain.mjs'

let pianificazione
before(async () => { pianificazione = await importaSorgente('core/dominio/projectPlanning.ts') })

function dati () {
  const progetto = creaProgetto('corso', 'Officina')
  progetto.attivita = ['Preparare', 'Montare', 'Controllare'].map((titolo) => {
    const { risorse: _risorse, ...attivita } = creaAttivita(titolo, 1)
    return { ...attivita, faseId: progetto.fasi[0].id }
  })
  return { progetto, piano: creaPiano('corso'), registro: { impostazioni: { minutiUd: 45 } } }
}

describe('importazione della scaletta del progetto', () => {
  it('divide la fase per attività intere, in ordine, e continua in un altro piano', () => {
    const { progetto, piano, registro } = dati()
    const ids = progetto.attivita.map((a) => a.id)
    const lezione = creaLezione('corso', '2026-10-06', '08:00', 90)
    const proposta = pianificazione.propostaImportazione(
      registro, piano, progetto, null, ids, lezione)
    assert.deepEqual(proposta.importabili.map((a) => a.titolo), ['Preparare', 'Montare'])
    assert.equal(proposta.restanti[0].titolo, 'Controllare')
    const importato = pianificazione.importaAttivitaDelProgetto(
      registro, piano, progetto, null, ids, lezione)
    assert.equal(importato.attivita.length, 2)
    assert.equal(piano.attivita.length, 0)
    const ripetuto = pianificazione.importaAttivitaDelProgetto(
      registro, importato, progetto, null, ids, lezione)
    assert.equal(ripetuto.attivita.length, 2)
    const seguito = pianificazione.importaAttivitaDelProgetto(registro, creaPiano('corso'), progetto, null,
      proposta.restanti.map((a) => a.id), lezione)
    assert.equal(seguito.attivita[0].titolo, 'Controllare')
  })

  it('non salta un’attività lunga e non importa una selezione vuota; un altro corso sì', () => {
    const { progetto, piano, registro } = dati()
    progetto.attivita[0].durataUd = 3
    const lezione = creaLezione('corso', '2026-10-06', '08:00', 45)
    const ids = progetto.attivita.map((a) => a.id)
    const proposta = pianificazione.propostaImportazione(
      registro, piano, progetto, null, ids, lezione)
    assert.equal(proposta.importabili.length, 0)
    const vuoto = pianificazione.importaAttivitaDelProgetto(registro, piano, progetto, null, [])
    assert.equal(vuoto.attivita.length, 0)
    // Il progetto è dell'anno: il piano di un corso dove non è integrato ne
    // prende le tappe, e chi scrive lo integra (`piano.salva`).
    assert.equal(pianificazione.importaAttivitaDelProgetto(registro, creaPiano('altro'), progetto, null, ids).attivita.length, 3)
  })

  it('conserva i minuti indicativi quando le UD effettive della lezione sono più brevi', () => {
    const { progetto, piano, registro } = dati()
    progetto.attivita[0].durataUd = 0.4
    const lezione = creaLezione('corso', '2026-10-06', '08:00', 30)
    const importato = pianificazione.importaAttivitaDelProgetto(
      registro, piano, progetto, null, [progetto.attivita[0].id], lezione)
    assert.ok(Math.abs(importato.attivita[0].durataUd - 0.6) < 1e-9)
    assert.ok(Math.abs(importato.attivita[0].durataUd * 30 - 18) < 1e-9)
  })

  it('non perde l’ultima attività per gli arrotondamenti delle somme', () => {
    const { progetto, piano, registro } = dati()
    progetto.attivita.forEach((a) => { a.durataUd = 1 / 3 })
    const lezione = creaLezione('corso', '2026-10-06', '08:00', 45)
    const proposta = pianificazione.propostaImportazione(registro, piano, progetto, null,
      progetto.attivita.map((a) => a.id), lezione)
    assert.equal(proposta.importabili.length, 3)
    assert.ok(proposta.residuoUd < 1e-9)
  })

  it('sincronizza contenuto e fase conservando identità, durata e allegati locali; stacca una canonica rimossa', () => {
    const { progetto, piano, registro } = dati()
    const importato = pianificazione.importaAttivitaDelProgetto(
      registro, piano, progetto, null, [progetto.attivita[0].id])
    const attivita = importato.attivita[0]
    const id = attivita.id
    attivita.durataUd = 2
    attivita.risorse = [{ id: 'locale', tipo: 'file', titolo: 'Scheda', file: 'scheda.pdf' }]
    progetto.attivita[0].titolo = 'Preparare il banco'
    assert.equal(pianificazione.sincronizzaPianiDelProgetto([importato], progetto), true)
    assert.equal(attivita.id, id)
    assert.equal(attivita.durataUd, 2)
    assert.equal(attivita.risorse[0].file, 'scheda.pdf')
    progetto.attivita = []
    pianificazione.sincronizzaPianiDelProgetto([importato], progetto)
    assert.equal(attivita.attivitaProgettoId, null)
    assert.equal(attivita.titolo, 'Preparare il banco')
  })
})
