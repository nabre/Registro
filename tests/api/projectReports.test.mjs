// I due rapporti del progetto dalla procedura, visto da un corso in cui è
// integrato: dove finiscono (quello della classe nella cartella del corso,
// quello di una persona nella sua), il «non trovato» quando manca il progetto
// o la persona, il rifiuto senza un corso integrato, e come stanno fra gli altri
// fogli del corso: si rifanno con loro, e un progetto rinominato non lascia il
// foglio col titolo di prima.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-progetto-pdf-')

let api
let archivio
let progetto
let rossi
let corso

before(async () => {
  ;({ api, archivio } = await archivioDiProva({ lavoro, dati, deposito: true }))

  const { creaAllievo, creaClasse, creaCorso, creaMateria, creaProgetto } = api
  const anno = archivio.registro.anni[0]

  const classe = creaClasse(anno.id, 'I MEC A')
  rossi = creaAllievo('Rossi', 'Maria')
  classe.allievi.push(rossi)
  const matematica = creaMateria('Matematica')
  corso = creaCorso(classe.id, matematica.id, 'I MEC A — Matematica')
  progetto = creaProgetto(corso.id, 'Il ponte di carta')

  archivio.modifica((r) => {
    r.impostazioni.pdfAutomatici = 'mai'
    r.classi.push(classe)
    r.materie.push(matematica)
    r.corsi.push(corso)
    r.progetti.push(progetto)
  }, ['classi', 'corsi', 'progetti', 'registro'])
})

after(async () => {
  await api?.fermaRapporti()
  smonta(radice, archivio)
})

describe('i rapporti del progetto', () => {
  it('quello della classe va nella cartella del corso, col titolo del progetto nel nome', async () => {
    const esito = await api.chiama(archivio, 'rapporti.genera', { genere: 'progetto-classe', id: progetto.id, corsoId: corso.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.match(esito.dati.documento, /\/classe\/[^/]*_Progetto_Il ponte di carta\.pdf$/)
  })

  it('quello di una persona va nella sua cartella', async () => {
    const esito = await api.chiama(archivio, 'rapporti.genera', {
      genere: 'progetto-allievo', id: progetto.id, corsoId: corso.id, allievoId: rossi.id,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.match(esito.dati.documento, /\/Rossi Maria\/[^/]*_Progetto_Rossi Maria_Il ponte di carta\.pdf$/)
  })

  it('senza la persona, o con un progetto che non c’è, è «non trovato»', async () => {
    const senza = await api.chiama(archivio, 'rapporti.genera', {
      genere: 'progetto-allievo', id: progetto.id, corsoId: corso.id,
    })
    assert.equal(senza.codice, 'non-trovato')
    const sparito = await api.chiama(archivio, 'rapporti.genera', {
      genere: 'progetto-classe', id: 'prg-sparito-0001', corsoId: corso.id,
    })
    assert.equal(sparito.codice, 'non-trovato')
  })

  it('il foglio è del lavoro con una classe: senza corso, o in un corso non integrato, si rifiuta', async () => {
    const senzaCorso = await api.chiama(archivio, 'rapporti.genera', { genere: 'progetto-classe', id: progetto.id })
    assert.equal(senzaCorso.codice, 'rifiutato', JSON.stringify(senzaCorso))
    const altro = api.creaCorso(corso.classeId, corso.materiaId, 'Altro')
    archivio.modifica((r) => { r.corsi.push(altro) }, ['corsi'])
    const fuori = await api.chiama(archivio, 'rapporti.genera', {
      genere: 'progetto-classe', id: progetto.id, corsoId: altro.id,
    })
    assert.equal(fuori.codice, 'rifiutato', JSON.stringify(fuori))
  })
})

/** I fogli dei progetti sotto `esportazioni/`. */
async function fogliDeiProgetti () {
  const esito = await api.chiama(archivio, 'documenti.inventario', {})
  assert.ok(esito.ok, JSON.stringify(esito))
  return esito.dati.esportazioni.map((d) => d.percorso).filter((p) => /_Progetto_/.test(p)).sort()
}

describe('i rapporti del progetto fra i fogli del corso', () => {
  it('«tutti i fogli del corso» li scrive: quello della classe e uno per persona', async () => {
    const esito = await api.esegui(archivio, { tipo: 'rapporto.completo', corsoId: corso.id, semestreId: null })
    assert.ok(esito.ok, JSON.stringify(esito))
    const fogli = await fogliDeiProgetti()
    assert.ok(fogli.some((p) => /\/classe\/[^/]*_Progetto_Il ponte di carta\.pdf$/.test(p)), fogli.join(' | '))
    assert.ok(fogli.some((p) => /\/Rossi Maria\/[^/]*_Progetto_Rossi Maria_Il ponte di carta\.pdf$/.test(p)))
  })

  it('rinominato, il foglio nuovo prende il posto di quello col titolo di prima', async () => {
    archivio.modifica((r) => {
      r.progetti.find((p) => p.id === progetto.id).titolo = 'Il ponte di legno'
    }, ['progetti'])
    const esito = await api.chiama(archivio, 'rapporti.genera', { genere: 'progetto-classe', id: progetto.id, corsoId: corso.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const fogli = await fogliDeiProgetti()
    assert.ok(fogli.every((p) => !/Il ponte di carta/.test(p)), fogli.join(' | '))
    assert.ok(fogli.some((p) => /\/classe\/[^/]*_Progetto_Il ponte di legno\.pdf$/.test(p)))
  })

  it('una scrittura sul progetto mette in attesa i fogli del suo corso', async () => {
    await api.fermaRapporti()
    archivio.modifica((r) => { r.impostazioni.pdfAutomatici = 'sempre' }, ['registro'])
    try {
      const suo = structuredClone(archivio.registro.progetti.find((p) => p.id === progetto.id))
      suo.descrizione = 'Con la colla vinilica'
      const esito = await api.chiama(archivio, 'progetti.salva', { progetto: suo })
      assert.equal(esito.ok, true, JSON.stringify(esito))
      assert.equal(api.rigenerazioniInAttesa(), 1)
    } finally {
      await api.fermaRapporti()
      archivio.modifica((r) => { r.impostazioni.pdfAutomatici = 'mai' }, ['registro'])
    }
  })
})
