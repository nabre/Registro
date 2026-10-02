import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  creaAttivita,
  duplicaPiano,
  duplicaProgetto,
  eliminazione,
  normalizzaProgetto,
  normalizzaRegistro,
  validaProgetto,
} from '../../dist-tests/domain.mjs'
import { registroCompleto } from '../helpers/modelli.mjs'

function conScaletta () {
  const registro = registroCompleto()
  const progetto = registro.progetti[0]
  const piano = registro.piani.find((p) => p.corsoId === progetto.corsoId)
  assert.ok(piano)
  const { risorse: _risorse, ...contenuto } = creaAttivita('Rilievo', 1.5)
  progetto.attivita = [{ ...contenuto, faseId: progetto.fasi[0].id }]
  piano.attivita = [{
    ...creaAttivita('Rilievo', 0.5),
    progettoId: progetto.id,
    faseProgettoId: progetto.fasi[0].id,
    attivitaProgettoId: contenuto.id,
  }]
  return { registro, progetto, piano }
}

describe('formato della progettazione condivisa', () => {
  it('i progetti precedenti hanno una scaletta vuota senza inventare attività', () => {
    const registro = registroCompleto()
    for (const progetto of registro.progetti) delete progetto.attivita
    const letto = normalizzaRegistro(registro)
    assert.ok(letto.progetti.every((p) => p.attivita.length === 0))
    assert.equal(letto.piani.length, registro.piani.length)
  })

  it('la rilettura conserva origine e durata locale ed è idempotente', () => {
    const { registro, progetto, piano } = conScaletta()
    const letto = normalizzaRegistro(JSON.parse(JSON.stringify(registro)))
    const riletto = normalizzaRegistro(JSON.parse(JSON.stringify(letto)))
    assert.deepEqual(riletto, letto)
    const origine = letto.progetti.find((p) => p.id === progetto.id).attivita[0]
    const istanza = letto.piani.find((p) => p.id === piano.id).attivita[0]
    assert.equal(istanza.attivitaProgettoId, origine.id)
    assert.equal(istanza.durataUd, 0.5)
    assert.equal(origine.durataUd, 1.5)
  })

  it('i template non portano file o legami e riparano fase e id duplicati', () => {
    const { progetto } = conScaletta()
    const grezza = {
      ...progetto.attivita[0], faseId: 'non-esiste', progettoId: progetto.id,
      faseProgettoId: 'non-esiste', attivitaProgettoId: 'altra',
      risorse: [{ id: 'ris-1', tipo: 'file', titolo: 'Privato', file: 'risorse/test.pdf' }],
    }
    progetto.attivita = [grezza, { ...grezza }]
    const letto = normalizzaProgetto(progetto)
    assert.notEqual(letto.attivita[0].id, letto.attivita[1].id)
    for (const attivita of letto.attivita) {
      assert.equal(attivita.faseId, letto.fasi[0].id)
      for (const campo of ['risorse', 'progettoId', 'faseProgettoId', 'attivitaProgettoId']) {
        assert.equal(campo in attivita, false)
      }
    }
  })

  it('un’origine orfana si stacca senza perdere la tappa locale', () => {
    const { registro, progetto, piano } = conScaletta()
    progetto.attivita = []
    const letto = normalizzaRegistro(registro)
    const attivita = letto.piani.find((p) => p.id === piano.id).attivita[0]
    assert.equal(attivita.attivitaProgettoId, null)
    assert.equal(attivita.titolo, 'Rilievo')
    assert.equal(attivita.durataUd, 0.5)
    assert.equal(attivita.progettoId, progetto.id)
    const riletto = normalizzaRegistro(JSON.parse(JSON.stringify(letto)))
    assert.equal(riletto.piani.find((p) => p.id === piano.id).attivita[0].attivitaProgettoId, null)
  })

  it('eliminare il progetto conserva il contenuto e cancella tutti i legami', () => {
    const { registro, progetto, piano } = conScaletta()
    eliminazione(registro, { genere: 'progetto', id: progetto.id }).applica(registro)
    const attivita = piano.attivita[0]
    assert.equal(attivita.titolo, 'Rilievo')
    assert.equal(attivita.durataUd, 0.5)
    for (const campo of ['progettoId', 'faseProgettoId', 'attivitaProgettoId']) {
      assert.equal(campo in attivita, false)
    }
  })

  it('duplicare il progetto ricrea le identità senza condividere oggetti', () => {
    const { progetto } = conScaletta()
    progetto.attivita[0].parametri = { gruppi: 2 }
    const copia = duplicaProgetto(progetto, 'cor-altro')
    assert.notEqual(copia.attivita[0].id, progetto.attivita[0].id)
    assert.equal(copia.attivita[0].faseId, copia.fasi[0].id)
    copia.attivita[0].parametri.gruppi = 4
    assert.equal(progetto.attivita[0].parametri.gruppi, 2)
  })

  it('duplicare il piano nello stesso corso mantiene il contenuto condiviso', () => {
    const { piano } = conScaletta()
    const copia = duplicaPiano(piano)
    assert.notEqual(copia.attivita[0].id, piano.attivita[0].id)
    assert.equal(copia.attivita[0].attivitaProgettoId, piano.attivita[0].attivitaProgettoId)
    assert.equal(copia.attivita[0].durataUd, 0.5)
  })

  it('la scaletta rifiuta titoli vuoti e durate infinite', () => {
    const { progetto } = conScaletta()
    progetto.attivita[0].titolo = ''
    progetto.attivita[0].durataUd = Infinity
    assert.equal(validaProgetto(progetto).valido, false)
  })
})
