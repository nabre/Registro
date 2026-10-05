// La supplenza in cui manco io: lo zip accanto al documento porta il foglio da
// leggere, gli allievi con le foto, il piano di ogni ora e i file delle sue
// risorse, e il registro resta com'era.

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'
import { leggiZip } from '../../dist-tests/zip.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-supplenza-')

let api
let archivio
let prima
let seconda
let annullata
let senzaOrario
let ancoraSenzaOrario
/** I file che il registro ha chiesto di mostrare nella cartella. */
const mostrati = []

const esegui = (azione) => api.esegui(archivio, azione)

before(async () => {
  ;({ api, archivio } = await archivioDiProva({ lavoro, dati, deposito: true, pdfAutomatici: 'mai' }))
  api.comandi.registra('apparato.mostraNellaCartella', (file) => { mostrati.push(file) })

  const {
    creaAllievo, creaAttivita, creaClasse, creaCorso,
    creaLezione, creaMateria, creaPiano, creaRisorsa,
  } = api
  const anno = archivio.registro.anni[0]
  const classe = creaClasse(anno.id, '3A')
  classe.allievi.push(creaAllievo('Rossi', 'Maria'), creaAllievo('Bianchi', 'Luca'))
  const materia = creaMateria('Matematica')
  const corso = creaCorso(classe.id, materia.id, '3A — Matematica')

  // Due schede con lo stesso nome in due tappe: nello zip non si devono pestare.
  archivio.deposito.scrivi('risorse/scheda-1.pdf', new TextEncoder().encode('prima scheda'))
  archivio.deposito.scrivi('risorse/scheda-2.pdf', new TextEncoder().encode('seconda scheda'))
  const scheda = (file, titolo) => ({ ...creaRisorsa('file', titolo), file, nome: 'scheda.pdf' })
  const piano = creaPiano(corso.id)
  piano.obiettivi.push('Risolvere equazioni di primo grado')
  piano.attivita.push(
    { ...creaAttivita('Spiegazione', 1), risorse: [scheda('risorse/scheda-1.pdf', 'Esempi')] },
    { ...creaAttivita('Esercizi', 1), risorse: [scheda('risorse/scheda-2.pdf', 'Esercizi')] },
  )
  piano.risorse.push(
    { ...creaRisorsa('collegamento', 'Video'), url: 'https://esempio.ch/video' },
    { ...creaRisorsa('file', 'Sparita'), file: 'risorse/non-ce.pdf', nome: 'sparita.pdf' },
  )

  prima = { ...creaLezione(corso.id, '2026-10-05', '08:15', 45), pianoId: piano.id, aula: 'B12' }
  seconda = creaLezione(corso.id, '2026-10-05', '10:00', 45)
  annullata = { ...creaLezione(corso.id, '2026-10-05', '14:00', 45), stato: 'annullata' }
  // Due ore senza orario, stessa classe e materia, stesso giorno: ognuna col suo piano.
  const altro = creaPiano(corso.id)
  altro.obiettivi.push('Ripassare le frazioni')
  senzaOrario = { ...creaLezione(corso.id, '2026-10-06', '08:00', 45), slot: [], pianoId: piano.id }
  ancoraSenzaOrario = { ...creaLezione(corso.id, '2026-10-06', '08:00', 45), slot: [], pianoId: altro.id }

  archivio.modifica((r) => {
    r.classi.push(classe)
    r.materie.push(materia)
    r.corsi.push(corso)
    r.piani.push(piano, altro)
    r.lezioni.push(prima, seconda, annullata, senzaOrario, ancoraSenzaOrario)
  }, ['classi', 'corsi', 'lezioni', 'piani', 'registro'])
})

after(async () => {
  await api?.fermaRapporti()
  smonta(radice, archivio)
})

describe('supplenza.prepara', () => {
  it('scrive lo zip accanto al documento, senza toccare il registro', async () => {
    const registroPrima = structuredClone(archivio.registro)

    const esito = await esegui({
      tipo: 'supplenza.prepara',
      lezioniIds: [seconda.id, prima.id, annullata.id],
      supplente: 'Anna Verdi',
    })

    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.invariato, true)
    assert.equal(esito.messaggio.livello, 'avviso', 'la risorsa sparita si dice')
    assert.match(esito.messaggio.testo, /Sparita/)
    assert.deepEqual(archivio.registro, registroPrima)

    const zip = percorso.join(dati, 'Supplenza 2026-10-05 08.15–10.45.zip')
    assert.ok(existsSync(zip), 'lo zip sta accanto al .regi')
    assert.equal(mostrati.at(-1)?.fsPath, zip, 'senza indirizzo, lo zip si mostra nella cartella')

    const voci = new Map(leggiZip(readFileSync(zip)).map((v) => [v.nome, v.dati]))
    const nomi = [...voci.keys()]
    assert.ok(voci.has('Leggimi.txt'))
    assert.ok(voci.has('Allievi 3A.pdf'), nomi.join(', '))
    const ora = '2026-10-05 08.15 3A Matematica'
    assert.ok(voci.has(`${ora}/Piano della lezione.pdf`), nomi.join(', '))
    assert.equal(new TextDecoder().decode(voci.get(`${ora}/risorse/scheda.pdf`)), 'prima scheda')
    assert.equal(new TextDecoder().decode(voci.get(`${ora}/risorse/scheda (2).pdf`)), 'seconda scheda')
    assert.ok(!nomi.some((n) => n.includes('14.00')), 'l’ora annullata resta fuori')

    const leggimi = new TextDecoder().decode(voci.get('Leggimi.txt'))
    assert.match(leggimi, /Per: Anna Verdi/)
    assert.match(leggimi, /Risolvere equazioni di primo grado/)
    assert.match(leggimi, /https:\/\/esempio\.ch\/video/)
    assert.match(leggimi, /Aula: B12/)
    assert.doesNotMatch(leggimi, /sparita\.pdf/, 'un file rimasto fuori non si promette')
    assert.ok(leggimi.indexOf('08:15') < leggimi.indexOf('10:00'), 'le ore in ordine')
  })

  it('due supplenze dello stesso giorno, a ore diverse, non si pestano lo zip', async () => {
    assert.equal((await esegui({ tipo: 'supplenza.prepara', lezioniIds: [prima.id] })).ok, true)
    assert.equal((await esegui({ tipo: 'supplenza.prepara', lezioniIds: [seconda.id] })).ok, true)
    assert.ok(existsSync(percorso.join(dati, 'Supplenza 2026-10-05 08.15–09.00.zip')))
    assert.ok(existsSync(percorso.join(dati, 'Supplenza 2026-10-05 10.00–10.45.zip')))
  })

  it('due ore senza orario della stessa classe e materia hanno due cartelle', async () => {
    const esito = await esegui({
      tipo: 'supplenza.prepara', lezioniIds: [senzaOrario.id, ancoraSenzaOrario.id],
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const zip = percorso.join(dati, 'Supplenza 2026-10-06 3A.zip')
    const nomi = leggiZip(readFileSync(zip)).map((v) => v.nome)
    const piani = nomi.filter((n) => n.endsWith('/Piano della lezione.pdf'))
    assert.deepEqual(piani.sort(), [
      '2026-10-06 3A Matematica (2)/Piano della lezione.pdf',
      '2026-10-06 3A Matematica/Piano della lezione.pdf',
    ])
    const leggimi = new TextDecoder().decode(leggiZip(readFileSync(zip)).find((v) => v.nome === 'Leggimi.txt').dati)
    assert.match(leggimi, /2026-10-06 3A Matematica \(2\)\/Piano della lezione\.pdf/)
  })

  it('rifiuta un indirizzo storto, e il segretariato senza indirizzo', async () => {
    const storto = await esegui({ tipo: 'supplenza.prepara', lezioniIds: [prima.id], email: 'non-va' })
    assert.equal(storto.ok, false)
    const senza = await esegui({ tipo: 'supplenza.prepara', lezioniIds: [prima.id], segretariato: true })
    assert.equal(senza.ok, false)
  })

  it('rifiuta se nessuna delle ore scelte si può lasciare', async () => {
    const esito = await esegui({ tipo: 'supplenza.prepara', lezioniIds: [annullata.id] })
    assert.equal(esito.ok, false)
  })
})
