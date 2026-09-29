// Le consegne, il check, il fascicolo e le impostazioni del documento, dal
// centralino vero:
//
//   - `consegna.salva` non cancella spunte e documenti arrivati nel frattempo,
//     e non sposta in un'altra classe spunte e documenti;
//   - togliere o sostituire un documento libera le fette dello smistamento;
//   - spunte e «consegnato» solo per chi è della classe, e senza perdere un
//     file raccolto;
//   - una comunicazione con un allegato che non c'è non parte monca;
//   - un recapito tolto sparisce anche dai periodi di assenze;
//   - il check non accetta un id di colonna che la lista non ha;
//   - le impostazioni rifiutano quel che non torna invece di raddrizzarlo.

import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'
import { creaBloccoAssenze, creaComunicazione, creaFascicolo } from '../../dist-tests/domain.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-consegne-')

let api
let archivio
let classe
let altra
let rossi
let bianchi
let corso
let corsoAltra

/** L'azione, come la manda il pannello: senza passare dagli schemi dell'API. */
const esegui = (azione) => api.esegui(archivio, azione)

const consegnaViva = (id) => archivio.registro.consegne.find((c) => c.id === id)

/** Una consegna del corso, già scritta nel registro. */
function nuovaConsegna (testo, extra = {}) {
  const consegna = { ...api.creaConsegna(corso.id, testo, '2026-10-01'), ...extra }
  archivio.modifica((r) => { r.consegne.push(consegna) }, ['consegne'])
  return consegna
}

/** Un PDF in quarantena che ha già messo la pagina 1 nel documento di Rossi. */
function smistamentoPer (consegna) {
  const smistamento = api.creaSmistamento(
    'quarantena/pagelle.pdf', 'pagelle.pdf', 2, consegna.id, classe.id,
  )
  smistamento.assegnate = [
    { allievoId: rossi.id, consegnaId: consegna.id, da: 1, a: 1 },
    { allievoId: bianchi.id, consegnaId: consegna.id, da: 2, a: 2 },
  ]
  archivio.modifica((r) => { r.smistamenti.push(smistamento) }, ['smistamenti'])
  return smistamento
}

before(async () => {
  ;({ api, archivio } = await archivioDiProva({
    lavoro,
    dati,
    deposito: true,
    pdfAutomatici: 'mai',
  }))
  const { creaAllievo, creaClasse, creaCorso, creaMateria } = api

  const annoId = archivio.registro.anni[0].id

  classe = creaClasse(annoId, 'I MEC A')
  altra = creaClasse(annoId, 'II MEC B')
  rossi = creaAllievo('Rossi', 'Maria')
  bianchi = creaAllievo('Bianchi', 'Luca')
  classe.allievi.push(rossi, bianchi)
  altra.allievi.push(creaAllievo('Verdi', 'Anna'))
  const materia = creaMateria('Matematica')
  corso = creaCorso(classe.id, materia.id, 'I MEC A — Matematica')
  corsoAltra = creaCorso(altra.id, materia.id, 'II MEC B — Matematica')
  archivio.modifica((r) => {
    r.classi.push(classe, altra)
    r.materie.push(materia)
    r.corsi.push(corso, corsoAltra)
  }, ['classi', 'corsi', 'registro'])
})

after(() => smonta(radice, archivio))

describe('consegna.salva non cancella quel che è arrivato intanto', () => {
  it('le spunte e i documenti restano quelli del registro, non quelli disegnati', async () => {
    const consegna = nuovaConsegna('Autorizzazione uscita', { documento: 'modulo' })
    // Quel che il pannello aveva disegnato: niente spunte, niente documenti.
    const disegnata = structuredClone(consegnaViva(consegna.id))
    // Intanto, in fila: uno smistamento archivia un PDF e dà la spunta.
    archivio.modifica((r) => {
      const viva = r.consegne.find((c) => c.id === consegna.id)
      viva.documenti = [{ allievoId: rossi.id, file: 'archivio/rossi.pdf', nome: 'rossi.pdf', aggiuntoIl: '2026-10-02T08:00:00.000Z' }]
      viva.fatte = [{ chi: rossi.id, fattaIl: '2026-10-02T08:00:00.000Z', modo: 'mano' }]
    }, ['consegne'])

    const esito = await esegui({
      tipo: 'consegna.salva',
      consegna: { ...disegnata, a: 'allievi', allieviIds: [rossi.id, bianchi.id] },
    })

    assert.equal(esito.ok, true, JSON.stringify(esito))
    const viva = consegnaViva(consegna.id)
    assert.deepEqual(viva.allieviIds, [rossi.id, bianchi.id], 'il resto si salva')
    assert.deepEqual(viva.documenti.map((d) => d.file), ['archivio/rossi.pdf'])
    assert.deepEqual(viva.fatte.map((f) => f.chi), [rossi.id])
  })

  it('una consegna nuova nasce con quel che porta', async () => {
    const nuova = api.creaConsegna(corso.id, 'Relazione', '2026-10-01')
    nuova.fatte = [{ chi: bianchi.id, fattaIl: '2026-10-02T08:00:00.000Z' }]
    const esito = await esegui({ tipo: 'consegna.salva', consegna: nuova })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(consegnaViva(nuova.id).fatte.map((f) => f.chi), [bianchi.id])
  })
})

describe('consegna.salva e il cambio di classe', () => {
  it('con spunte o documenti non passa a un corso di un’altra classe', async () => {
    const consegna = nuovaConsegna('Autorizzazione uscita')
    archivio.modifica((r) => {
      r.consegne.find((c) => c.id === consegna.id).fatte = [
        { chi: rossi.id, fattaIl: '2026-10-02T08:00:00.000Z' },
      ]
    }, ['consegne'])
    const disegnata = structuredClone(consegnaViva(consegna.id))

    const esito = await esegui({
      tipo: 'consegna.salva', consegna: { ...disegnata, corsoId: corsoAltra.id },
    })

    assert.equal(esito.ok, false, JSON.stringify(esito))
    assert.equal(consegnaViva(consegna.id).corsoId, corso.id, 'resta dov’era')
  })

  it('senza spunte né documenti il cambio di classe passa', async () => {
    const consegna = nuovaConsegna('Gita')
    const esito = await esegui({
      tipo: 'consegna.salva', consegna: { ...consegnaViva(consegna.id), corsoId: corsoAltra.id },
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(consegnaViva(consegna.id).corsoId, corsoAltra.id)
  })
})

describe('spunte solo per chi è della classe', () => {
  it('consegna.spunta non spunta un estraneo', async () => {
    const consegna = nuovaConsegna('Firma')
    const estraneo = altra.allievi[0].id
    const esito = await esegui({
      tipo: 'consegna.spunta', consegnaId: consegna.id, chi: estraneo, fatta: true,
    })
    assert.equal(esito.ok, false, JSON.stringify(esito))
    assert.deepEqual(consegnaViva(consegna.id).fatte, [])

    const buona = await esegui({
      tipo: 'consegna.spunta', consegnaId: consegna.id, chi: rossi.id, fatta: true,
    })
    assert.equal(buona.ok, true, JSON.stringify(buona))
  })

  it('consegna.spunta toglie la spunta anche con file se modo è email', async () => {
    const consegna = nuovaConsegna('Ricevuta email', { documento: 'modulo' })
    archivio.modifica((r) => {
      r.consegne.find((c) => c.id === consegna.id).fatte = [
        { chi: rossi.id, fattaIl: '2026-10-02T08:00:00.000Z', file: 'ricevute/rossi.eml', modo: 'email' },
      ]
    }, ['consegne'])

    const esito = await esegui({
      tipo: 'consegna.spunta', consegnaId: consegna.id, chi: rossi.id, fatta: false,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(consegnaViva(consegna.id).fatte, [])
  })

  it('consegna.spunta rifiuta di togliere una spunta con file non email', async () => {
    const consegna = nuovaConsegna('Documento cartaceo', { documento: 'modulo' })
    archivio.modifica((r) => {
      r.consegne.find((c) => c.id === consegna.id).fatte = [
        { chi: rossi.id, fattaIl: '2026-10-02T08:00:00.000Z', file: 'ricevute/rossi.pdf' },
      ]
    }, ['consegne'])

    const esito = await esegui({
      tipo: 'consegna.spunta', consegnaId: consegna.id, chi: rossi.id, fatta: false,
    })
    assert.equal(esito.ok, false, JSON.stringify(esito))
    assert.equal(consegnaViva(consegna.id).fatte.length, 1)
  })

  it('consegna.spuntaTutti con fatta: false rimuove le spunte email anche se portano file', async () => {
    const consegna = nuovaConsegna('Spunta tutti prova', { documento: 'modulo' })
    archivio.modifica((r) => {
      r.consegne.find((c) => c.id === consegna.id).fatte = [
        { chi: rossi.id, fattaIl: '2026-10-02T08:00:00.000Z', file: 'rossi.eml', modo: 'email' },
        { chi: bianchi.id, fattaIl: '2026-10-02T08:00:00.000Z', file: 'bianchi.pdf' },
      ]
    }, ['consegne'])

    const esito = await esegui({
      tipo: 'consegna.spuntaTutti', consegnaId: consegna.id, fatta: false,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(consegnaViva(consegna.id).fatte.map((f) => f.chi), [bianchi.id])
  })

  it('consegna.consegnato non spunta un estraneo', async () => {
    const consegna = nuovaConsegna('Circolare', { documento: 'modulo', verso: 'consegno' })
    const esito = await esegui({
      tipo: 'consegna.consegnato', consegnaId: consegna.id, allievoId: 'all-inventato', fatta: true,
    })
    assert.equal(esito.ok, false, JSON.stringify(esito))
    assert.deepEqual(consegnaViva(consegna.id).fatte, [])
  })

  it('consegna.consegnato non toglie una spunta che porta un file raccolto', async () => {
    const consegna = nuovaConsegna('Modulo firmato', { documento: 'modulo' })
    archivio.modifica((r) => {
      r.consegne.find((c) => c.id === consegna.id).fatte = [
        { chi: rossi.id, fattaIl: '2026-10-02T08:00:00.000Z', file: 'archivio/solo-qui.pdf' },
      ]
    }, ['consegne'])

    const esito = await esegui({
      tipo: 'consegna.consegnato', consegnaId: consegna.id, allievoId: rossi.id, fatta: false,
    })

    assert.equal(esito.ok, false, JSON.stringify(esito))
    assert.equal(consegnaViva(consegna.id).fatte.length, 1)
  })

  it('consegna.consegnato si annulla quando il file è la copia distribuita', async () => {
    const consegna = nuovaConsegna('Pagella a mano', { documento: 'modulo', verso: 'consegno' })
    archivio.modifica((r) => {
      r.consegne.find((c) => c.id === consegna.id).documenti = [
        { allievoId: rossi.id, file: 'archivio/pagella.pdf', nome: 'p.pdf', aggiuntoIl: '2026-10-02T08:00:00.000Z' },
      ]
    }, ['consegne'])
    const avanti = { tipo: 'consegna.consegnato', consegnaId: consegna.id, allievoId: rossi.id }

    assert.equal((await esegui({ ...avanti, fatta: true })).ok, true)
    assert.equal(consegnaViva(consegna.id).fatte[0].file, 'archivio/pagella.pdf')
    const indietro = await esegui({ ...avanti, fatta: false })

    assert.equal(indietro.ok, true, JSON.stringify(indietro))
    assert.deepEqual(consegnaViva(consegna.id).fatte, [])
    assert.equal(consegnaViva(consegna.id).documenti.length, 1, 'il documento resta')
  })
})

describe('il documento di una persona e le pagine smistate', () => {
  it('togliendo il documento, le fette che ce lo avevano messo se ne vanno', async () => {
    const consegna = nuovaConsegna('Pagella', { documento: 'modulo' })
    archivio.modifica((r) => {
      r.consegne.find((c) => c.id === consegna.id).documenti = [
        { allievoId: rossi.id, file: 'archivio/pagella-rossi.pdf', nome: 'p.pdf', aggiuntoIl: '2026-10-02T08:00:00.000Z' },
      ]
    }, ['consegne'])
    const smistamento = smistamentoPer(consegna)

    const esito = await esegui({
      tipo: 'consegna.documento.togli', consegnaId: consegna.id, allievoId: rossi.id,
    })

    assert.equal(esito.ok, true, JSON.stringify(esito))
    const vivo = archivio.registro.smistamenti.find((s) => s.id === smistamento.id)
    assert.deepEqual(vivo.assegnate.map((f) => f.allievoId), [bianchi.id])
  })

  it('raccogliendo un documento nuovo, le fette di prima se ne vanno', async () => {
    const consegna = nuovaConsegna('Certificato', { documento: 'modulo' })
    const smistamento = smistamentoPer(consegna)
    const scelto = percorso.join(radice, 'certificato.pdf')
    writeFileSync(scelto, '%PDF-1.4\n%%EOF\n')
    globalThis.__bancoElectron.rispostaAlleAperture = { canceled: false, filePaths: [scelto] }
    try {
      const esito = await esegui({ tipo: 'consegna.raccogli', consegnaId: consegna.id, chi: rossi.id })
      assert.equal(esito.ok, true, JSON.stringify(esito))
    } finally {
      globalThis.__bancoElectron.rispostaAlleAperture = { canceled: true, filePaths: [] }
    }

    assert.equal(consegnaViva(consegna.id).documenti.length, 1)
    const vivo = archivio.registro.smistamenti.find((s) => s.id === smistamento.id)
    assert.deepEqual(vivo.assegnate.map((f) => f.allievoId), [bianchi.id])
  })

  it('consegna.file.togli: le fette che avevano fatto il documento tolto se ne vanno', async () => {
    const consegna = nuovaConsegna('Pagella', { documento: 'modulo' })
    archivio.modifica((r) => {
      const viva = r.consegne.find((c) => c.id === consegna.id)
      viva.documenti = [
        { allievoId: rossi.id, file: 'archivio/pagella-rossi.pdf', nome: 'p.pdf', aggiuntoIl: '2026-10-02T08:00:00.000Z' },
      ]
      viva.fatte = [{ chi: rossi.id, fattaIl: '2026-10-02T08:00:00.000Z', modo: 'mano' }]
    }, ['consegne'])
    const smistamento = smistamentoPer(consegna)

    const esito = await esegui({ tipo: 'consegna.file.togli', consegnaId: consegna.id, chi: rossi.id })

    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(consegnaViva(consegna.id).documenti, [])
    const vivo = archivio.registro.smistamenti.find((s) => s.id === smistamento.id)
    assert.deepEqual(vivo.assegnate.map((f) => f.allievoId), [bianchi.id])
  })
})

describe('il check dal canale del pannello', () => {
  let lista

  before(async () => {
    const esito = await esegui({
      tipo: 'check.colonne', corsoId: corso.id, colonne: [{ id: '', titolo: 'Quaderno' }],
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    lista = () => archivio.registro.check.find((c) => c.corsoId === corso.id)
  })

  it('un id di colonna che la lista non ha viene rifatto', async () => {
    const quaderno = lista().colonne[0]
    const esito = await esegui({
      tipo: 'check.colonne',
      corsoId: corso.id,
      colonne: [quaderno, { id: 'clc-di-un-altro-corso', titolo: 'Libro' }],
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const ids = lista().colonne.map((c) => c.id)
    assert.equal(ids[0], quaderno.id, 'la colonna che c’era tiene il suo id')
    assert.equal(ids.length, 2)
    assert.notEqual(ids[1], 'clc-di-un-altro-corso')
  })
})

describe('il fascicolo della classe', () => {
  let fascicolo
  let recapito

  before(() => {
    fascicolo = creaFascicolo(classe.id)
    recapito = api.creaRecapito('Azienda', 'ditta@esempio.ch')
    fascicolo.recapiti.push(recapito)
    fascicolo.assenze.push(creaBloccoAssenze('2026-09-01', '2026-10-31', fascicolo))
    archivio.modifica((r) => { r.fascicoli.push(fascicolo) }, ['fascicoli'])
  })

  const vivo = () => archivio.registro.fascicoli.find((f) => f.id === fascicolo.id)

  it('una comunicazione con un allegato che non c’è non parte', async () => {
    const comunicazione = {
      ...creaComunicazione(vivo()),
      oggetto: 'Uscita',
      corpo: 'Gentili famiglie',
      documentiIds: ['csg-sparita'],
    }
    archivio.modifica((r) => {
      r.fascicoli.find((f) => f.id === fascicolo.id).comunicazioni.push(comunicazione)
    }, ['fascicoli'])

    const esito = await esegui({
      tipo: 'comunicazione.invia', classeId: classe.id, comunicazioneId: comunicazione.id, conferma: true,
    })

    assert.equal(esito.ok, false, JSON.stringify(esito))
    const viva = vivo().comunicazioni.find((c) => c.id === comunicazione.id)
    assert.equal(viva.stato, 'bozza')
  })

  it('un recapito tolto sparisce anche dai periodi di assenze', async () => {
    assert.deepEqual(vivo().assenze[0].recapitiIds, [recapito.id])

    const esito = await esegui({
      tipo: 'recapito.elimina', classeId: classe.id, recapitoId: recapito.id,
    })

    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(vivo().assenze[0].recapitiIds, [])
  })
})

describe('impostazioni.salva dice di no invece di raddrizzare', () => {
  const salva = (modifiche) => esegui({
    tipo: 'impostazioni.salva',
    impostazioni: { ...archivio.registro.impostazioni, ...modifiche },
  })

  it('rifiuta una scala rovesciata, una giornata al contrario, un giorno che non c’è', async () => {
    const prima = structuredClone(archivio.registro.impostazioni)
    for (const storto of [
      { scala: { min: 6, max: 1, sufficienza: 4, passo: -1 } },
      { oraInizioGiornata: '18:00', oraFineGiornata: '07:30' },
      { oraInizioGiornata: '25:00' },
      { giorniVisibili: [9] },
      { giorniVisibili: [] },
    ]) {
      const esito = await salva(storto)
      assert.equal(esito.ok, false, JSON.stringify(storto))
      assert.ok(esito.errori.length > 0, 'il rifiuto dice il motivo')
    }
    assert.deepEqual(archivio.registro.impostazioni, prima, 'il registro resta com’era')
  })

  it('quel che torna si salva come prima', async () => {
    const esito = await salva({ oraInizioGiornata: '07:45', giorniVisibili: [1, 2, 3, 4, 5, 6] })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(archivio.registro.impostazioni.oraInizioGiornata, '07:45')
    // Dall'API: lo schema lascia passare il giorno 9, il gestore no.
    const dallApi = await api.chiama(archivio, 'impostazioni.salva', {
      impostazioni: { ...archivio.registro.impostazioni, giorniVisibili: [9] },
    })
    assert.equal(dallApi.ok, false, JSON.stringify(dallApi))
  })
})
