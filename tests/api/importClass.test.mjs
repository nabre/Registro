// «Importa classe dall'anno…» (`classi.altrove`, `classi.importa`). Servono
// due documenti veri: le foto passano dai byte dell'uno al deposito
// dell'altro, e il documento d'origine resta com'era, senza serratura e senza
// un byte cambiato.

import assert from 'node:assert/strict'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

import { cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-importa-classe-')

/** L'anno scorso: il documento da cui si porta la classe. */
const SCORSO = percorso.join(dati, '2025-2026.regi')
/** Lo stesso anno scorso, ma scritto da un registro «più recente». */
const FUTURO = percorso.join(dati, '2099-2100.regi')
/** L'anno aperto. */
const APERTO = percorso.join(dati, '2026-2027.regi')
const FOTO = 'archivio/docente-di-classe/II MEC A/foto/Rossi Maria.jpg'
const BYTE_FOTO = new TextEncoder().encode('jpeg di Rossi, anno scorso')

let api
let archivio
/** La classe dell'anno scorso, con i suoi id di là. */
let origine
/** La materia che qui c'è già, con un nome scritto diversamente. */
let matematicaQui

const classePerId = (id) => archivio.registro.classi.find((c) => c.id === id)
const importa = (ingresso) => api.chiama(archivio, 'classi.importa', {
  percorso: SCORSO, classeId: origine.id, anagrafica: true, corsi: false, ...ingresso,
})

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
    creaValutazione,
  } = api

  // L'anno scorso, scritto e chiuso: una classe con due persone (una con la
  // foto), due corsi con orario, e quel che succede in un anno.
  const scorso = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  await scorso.apri(null)
  await scorso.creaAnno(creaAnno('2025-09-01', '2026-06-30'), Uri.file(SCORSO))
  const annoScorso = scorso.registro.anni[0].id
  origine = creaClasse(annoScorso, 'II MEC A')
  origine.docenteDiClasse = true
  origine.note = 'Classe numerosa'
  const rossi = creaAllievo('Rossi', 'Maria')
  rossi.foto = FOTO
  origine.allievi.push(rossi, creaAllievo('Bianchi', 'Luca'))
  const vuota = creaClasse(annoScorso, 'III ELE B')
  const matematica = creaMateria('Matematica', 'MAT')
  const storia = { ...creaMateria('Storia', 'STO'), colore: '#aa3300', note: 'Dal Medioevo' }
  const corsoMat = creaCorso(origine.id, matematica.id, 'II MEC A — Matematica')
  corsoMat.orario = [{ id: 'ric-vecchia-1', giorno: 2, inizio: '08:20', durataMin: 90, aula: 'A1', dal: '2025-09-01', al: '2026-01-31' }]
  corsoMat.colore = '#112233'
  corsoMat.note = 'Programma del biennio'
  const corsoSto = creaCorso(origine.id, storia.id, 'II MEC A — Storia')
  scorso.deposito.scrivi(FOTO, BYTE_FOTO)
  scorso.modifica((r) => {
    r.classi.push(origine, vuota)
    r.materie.push(matematica, storia)
    r.corsi.push(corsoMat, corsoSto)
    r.lezioni.push(creaLezione(corsoMat.id, '2025-09-09', '08:20', 90))
    r.valutazioni.push(creaValutazione(corsoMat.id, 'Verifica sulle frazioni'))
  }, ['classi', 'registro', 'corsi', 'lezioni', 'valutazioni'])
  await scorso.salva()
  assert.equal(await scorso.chiudi(), true)
  scorso.dispose()

  // Lo stesso anno, ma dichiarato scritto da un registro più recente di questo.
  copyFileSync(SCORSO, FUTURO)
  const { Pacchetto, Uri: UriDati } = await import('../../dist-tests/data.mjs')
  const futuro = await Pacchetto.apri(UriDati.file(FUTURO))
  const testa = JSON.parse(futuro.testo('registro.json'))
  futuro.scrivi('registro.json', JSON.stringify({ ...testa, versione: testa.versione + 1 }))
  await futuro.salva()

  // L'anno aperto: con «matematica» già dichiarata, scritta in un altro modo.
  archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  await archivio.apri(null)
  await archivio.creaAnno(creaAnno('2026-09-01', '2027-06-30'), Uri.file(APERTO))
  api.registraDeposito(archivio.deposito)
  matematicaQui = creaMateria(' matematica ')
  archivio.modifica((r) => { r.materie.push(matematicaQui) }, ['registro'])
})

after(() => smonta(radice, archivio))

describe('classi.altrove', () => {
  it('elenca le classi dell’altro anno, con quante persone e che materie', async () => {
    const prima = archivio.revisione
    const esito = await api.chiama(archivio, 'classi.altrove', { percorso: SCORSO })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(archivio.revisione, prima)
    assert.deepEqual(esito.dati.classi.map((c) => [c.nome, c.persone, c.materie]), [
      ['II MEC A', 2, ['Matematica', 'Storia']],
      ['III ELE B', 0, []],
    ])
  })

  it('rifiuta il documento aperto', async () => {
    const esito = await api.chiama(archivio, 'classi.altrove', { percorso: APERTO })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'rifiutato')
  })

  it('rifiuta un documento scritto da un registro più recente', async () => {
    const esito = await api.chiama(archivio, 'classi.altrove', { percorso: FUTURO })
    assert.equal(esito.ok, false)
    assert.match(esito.messaggi.join(' '), /versione più recente/)
  })
})

describe('classi.importa', () => {
  it('con anagrafica e corsi: persone nuove, foto copiata, materie abbinate per nome', async () => {
    const materiePrima = archivio.registro.materie.length
    const esito = await importa({ nome: 'III MEC A', corsi: true })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const classe = classePerId(esito.dati.creato.id)
    assert.equal(classe.nome, 'III MEC A')
    assert.equal(classe.annoId, archivio.registro.annoCorrenteId)
    assert.equal(classe.note, 'Classe numerosa')
    assert.equal(classe.docenteDiClasse, true)
    assert.deepEqual(classe.allievi.map((a) => a.cognome).sort(), ['Bianchi', 'Rossi'])
    for (const allievo of classe.allievi) {
      assert.ok(!origine.allievi.some((a) => a.id === allievo.id), 'un id di persona passato da un anno all’altro')
    }

    // La foto passa dai byte dell'altro documento al deposito di questo.
    const rossi = classe.allievi.find((a) => a.cognome === 'Rossi')
    assert.ok(rossi.foto, 'la foto non è arrivata')
    assert.match(rossi.foto, /III MEC A/)
    assert.deepEqual(new Uint8Array(archivio.deposito.leggi(rossi.foto)), BYTE_FOTO)

    // Matematica c'era (scritta « matematica »): si usa quella. Storia nasce, con
    // sigla, colore e note di là.
    const corsi = archivio.registro.corsi.filter((c) => c.classeId === classe.id)
    assert.equal(corsi.length, 2)
    assert.equal(archivio.registro.materie.length, materiePrima + 1)
    const suMatematica = corsi.find((c) => c.materiaId === matematicaQui.id)
    assert.ok(suMatematica, 'Matematica non è stata abbinata a quella che c’era')
    const storia = archivio.registro.materie.find((m) => m.nome === 'Storia')
    assert.deepEqual([storia.sigla, storia.colore, storia.note], ['STO', '#aa3300', 'Dal Medioevo'])
    assert.ok(corsi.some((c) => c.materiaId === storia.id))

    // Il corso: titolo rifatto, orario con id nuovi e senza le date di là.
    assert.equal(suMatematica.titolo, 'III MEC A — matematica')
    assert.equal(suMatematica.colore, '#112233')
    assert.equal(suMatematica.note, 'Programma del biennio')
    assert.equal(suMatematica.orario.length, 1)
    const fascia = suMatematica.orario[0]
    assert.notEqual(fascia.id, 'ric-vecchia-1')
    assert.deepEqual([fascia.giorno, fascia.inizio, fascia.durataMin, fascia.aula], [2, '08:20', 90, 'A1'])
    assert.equal(fascia.dal, undefined)
    assert.equal(fascia.al, undefined)

    // Niente di quel che è successo là.
    assert.equal(archivio.registro.lezioni.length, 0)
    assert.equal(archivio.registro.valutazioni.length, 0)
  })

  it('una seconda volta la materia nata prima si riusa: nessun doppione', async () => {
    const materiePrima = archivio.registro.materie.length
    const esito = await importa({ nome: 'IV MEC A', corsi: true })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(archivio.registro.materie.length, materiePrima)
  })

  it('con i corsi spenti arriva la sola classe', async () => {
    const corsiPrima = archivio.registro.corsi.length
    const materiePrima = archivio.registro.materie.length
    const esito = await importa({ nome: 'Solo classe' })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(classePerId(esito.dati.creato.id).allievi.length, 2)
    assert.equal(archivio.registro.corsi.length, corsiPrima)
    assert.equal(archivio.registro.materie.length, materiePrima)
  })

  it('con l’anagrafica spenta la classe arriva vuota, col suo impianto', async () => {
    const esito = await importa({ nome: 'Vuota', anagrafica: false })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const classe = classePerId(esito.dati.creato.id)
    assert.deepEqual(classe.allievi, [])
    assert.equal(classe.colore, origine.colore)
    assert.equal(classe.note, 'Classe numerosa')
    assert.equal(classe.docenteDiClasse, true)
  })

  it('un nome già preso nell’anno si rifiuta, e non si scrive niente', async () => {
    const prima = archivio.revisione
    const esito = await importa({ nome: 'III MEC A' })
    assert.equal(esito.ok, false)
    assert.match(esito.messaggi.join(' '), /Esiste già una classe/)
    assert.equal(archivio.revisione, prima)
  })

  it('rifiuta il documento aperto e quello più recente, senza scrivere', async () => {
    const prima = archivio.revisione
    const aperto = await importa({ percorso: APERTO, nome: 'Da sé' })
    assert.equal(aperto.ok, false)
    assert.match(aperto.messaggi.join(' '), /anno aperto/)
    const futuro = await importa({ percorso: FUTURO, nome: 'Dal futuro' })
    assert.equal(futuro.ok, false)
    assert.match(futuro.messaggi.join(' '), /versione più recente/)
    assert.equal(archivio.revisione, prima)
  })

  it('un ingresso senza le spunte si rifiuta prima di leggere', async () => {
    const prima = archivio.revisione
    const esito = await api.chiama(archivio, 'classi.importa', {
      percorso: SCORSO, classeId: origine.id, nome: 'Senza spunte',
    })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'ingresso-non-valido')
    assert.equal(archivio.revisione, prima)
  })

  it('il documento d’origine resta com’era: stessi byte, nessuna serratura', async () => {
    const bytePrima = readFileSync(SCORSO)
    const cartellaPrima = readdirSync(dati).sort()
    const esito = await importa({ nome: 'Ancora una', corsi: true })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    await archivio.salva()
    assert.deepEqual(readFileSync(SCORSO), bytePrima)
    assert.equal(existsSync(percorso.join(dati, '.2025-2026.regi.serratura')), false)
    assert.deepEqual(readdirSync(dati).sort(), cartellaPrima)
  })
})
