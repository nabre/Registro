// Le scritture su piani, valutazioni, consegne e calendari: dicono «fatto»
// solo se hanno fatto, accettano uno stato già voluto, e non lasciano a chi
// chiama nominare un file di un altro.
//
//   - `piani.assegna` con lo stesso piano non azzera l'avanzamento dell'ora;
//   - `valutazioni.voto.riconsegna` senza casella o con id inventato non
//     risponde «fatto» né alza la revisione;
//   - `valutazioni.salva` non rimette la copia vecchia sopra voti e allegati
//     scritti nel frattempo;
//   - una consegna nuova non accetta percorsi di file da chi chiama, e
//     `consegne.elimina` non cestina il file di un'altra;
//   - `piani.salva` non accetta una risorsa col file di un altro;
//   - `orario.genera`, `consegne.firme.togli`, `consegne.documento.togli`
//     ripetute non rispondono «rifiutato»;
//   - `consegne.spunta` ripetuta non sposta la data;
//   - `calendario.aggiorna` su un id ignoto è `non-trovato`.
//
// Si passa da `chiama`, la strada di chi sta fuori dal pannello, dove il
// codice d'errore conta.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-giro13-scritture-')

let api
let archivio
let classe
let rossi
let bianchi
let verdi
let corso

const byte = (testo) => new TextEncoder().encode(testo)
const chiama = (nome, ingresso) => api.chiama(archivio, nome, ingresso)
const deposito = () => archivio.deposito
const consegnaViva = (id) => archivio.registro.consegne.find((c) => c.id === id)
const momentoVivo = (id) => archivio.registro.valutazioni.find((v) => v.id === id)

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
  rossi = creaAllievo('Rossi', 'Maria')
  bianchi = creaAllievo('Bianchi', 'Luca')
  classe.allievi.push(rossi, bianchi)
  // Una persona di un'altra classe: esiste, ma non ha caselle in queste prove.
  const altra = creaClasse(annoId, 'II ELE B')
  verdi = creaAllievo('Verdi', 'Anna')
  altra.allievi.push(verdi)
  const matematica = creaMateria('Matematica')
  corso = creaCorso(classe.id, matematica.id, 'I MEC A — Matematica')
  // Il martedì alle 8:20: `orario.genera` ne ha bisogno.
  corso.orario = [{ id: 'ric-mar-0001', giorno: 2, inizio: '08:20', durataMin: 50 }]

  archivio.modifica((r) => {
    r.classi.push(classe, altra)
    r.materie.push(matematica)
    r.corsi.push(corso)
  }, ['classi', 'corsi', 'registro'])
})

after(() => smonta(radice, archivio))

describe('piani.assegna con lo stesso piano', () => {
  it('non azzera l’avanzamento e non scrive niente', async () => {
    const piano = api.creaPiano(corso.id)
    const lezione = api.creaLezione(corso.id, '2026-09-15', '08:20', 50)
    lezione.pianoId = piano.id
    lezione.avanzamento = [{ attivitaId: 'att-1', titolo: 'Ripasso', stato: 'fatta' }]
    archivio.modifica((r) => {
      r.piani.push(piano)
      r.lezioni.push(lezione)
    }, ['piani', 'lezioni'])
    const prima = archivio.revisione

    const esito = await chiama('piani.assegna', { lezioneId: lezione.id, pianoId: piano.id })

    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.invariato, true)
    assert.equal(archivio.revisione, prima)
    const viva = archivio.registro.lezioni.find((l) => l.id === lezione.id)
    assert.equal(viva.avanzamento.length, 1, 'le spunte dell’ora restano')
  })
})

describe('valutazioni.voto.riconsegna', () => {
  let momento
  before(() => {
    momento = api.creaValutazione(corso.id, 'Verifica sulle frazioni', undefined, '2026-10-01')
    momento.voti = [
      { allievoId: rossi.id, valore: 7, assente: false },
      { allievoId: bianchi.id, valore: null, assente: true },
    ]
    archivio.modifica((r) => { r.valutazioni.push(momento) }, ['valutazioni'])
  })

  it('un id che non c’è è un «non trovato», e non scrive', async () => {
    const prima = archivio.revisione
    const esito = await chiama('valutazioni.voto.riconsegna', {
      valutazioneId: momento.id, allievoId: 'all-inventato-0001', il: '2026-10-10',
    })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'non-trovato', JSON.stringify(esito))
    assert.equal(archivio.revisione, prima)
  })

  it('una persona senza casella in quella prova è un no, e non scrive', async () => {
    const prima = archivio.revisione
    const esito = await chiama('valutazioni.voto.riconsegna', {
      valutazioneId: momento.id, allievoId: verdi.id, il: '2026-10-10',
    })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'rifiutato', JSON.stringify(esito))
    assert.equal(archivio.revisione, prima)
  })

  it('un assente non riceve una riconsegna: il suo foglio è il recupero', async () => {
    const esito = await chiama('valutazioni.voto.riconsegna', {
      valutazioneId: momento.id, allievoId: bianchi.id, il: '2026-10-10',
    })
    assert.equal(esito.ok, false)
    const suo = momentoVivo(momento.id).voti.find((v) => v.allievoId === bianchi.id)
    assert.equal(suo.riconsegnataIl, undefined)
  })

  it('chi ha il voto la riceve', async () => {
    const esito = await chiama('valutazioni.voto.riconsegna', {
      valutazioneId: momento.id, allievoId: rossi.id, il: '2026-10-10',
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(
      momentoVivo(momento.id).voti.find((v) => v.allievoId === rossi.id).riconsegnataIl,
      '2026-10-10',
    )
  })
})

describe('valutazioni.salva su un momento che c’è già', () => {
  it('tiene i voti, i recuperi e gli allegati vivi, non quelli della copia', async () => {
    const momento = api.creaValutazione(corso.id, 'Interrogazione', undefined, '2026-10-05')
    archivio.modifica((r) => { r.valutazioni.push(momento) }, ['valutazioni'])
    // Chi salva ha aperto il modulo qui: niente voti.
    const copia = structuredClone(momentoVivo(momento.id))

    // Intanto, dalla griglia e dal fascicolo: un voto e un PDF.
    const votato = await chiama('valutazioni.voto.imposta', {
      valutazioneId: momento.id, allievoId: rossi.id, valore: 5, assente: false,
    })
    assert.equal(votato.ok, true, JSON.stringify(votato))
    deposito().scrivi('archivio/prove/rossi.pdf', byte('pdf'))
    archivio.modifica((r) => {
      r.valutazioni.find((v) => v.id === momento.id).allegati.push({
        id: 'all-rossi-0001', ruolo: 'prova', allievoId: rossi.id, nome: 'rossi.pdf',
        file: 'archivio/prove/rossi.pdf', aggiuntoIl: '2026-10-06T08:00:00.000Z',
      })
    }, ['valutazioni'])

    const esito = await chiama('valutazioni.salva', {
      valutazione: { ...copia, titolo: 'Interrogazione orale' },
    })

    assert.equal(esito.ok, true, JSON.stringify(esito))
    const vivo = momentoVivo(momento.id)
    assert.equal(vivo.titolo, 'Interrogazione orale')
    assert.equal(vivo.voti.find((v) => v.allievoId === rossi.id)?.valore, 5, 'il voto resta')
    assert.equal(vivo.allegati.length, 1, 'il PDF resta')
  })

  it('un momento nuovo nasce con i suoi voti ma senza allegati di altri', async () => {
    const nuovo = api.creaValutazione(corso.id, 'Compito', undefined, '2026-10-07')
    nuovo.voti = [{ allievoId: rossi.id, valore: 6, assente: false }]
    nuovo.allegati = [{
      id: 'all-rubato-0001', ruolo: 'prova', allievoId: rossi.id, nome: 'rossi.pdf',
      file: 'archivio/prove/rossi.pdf', aggiuntoIl: '2026-10-07T08:00:00.000Z',
    }]
    const esito = await chiama('valutazioni.salva', { valutazione: nuovo })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(momentoVivo(nuovo.id).voti.length, 1)
    assert.deepEqual(momentoVivo(nuovo.id).allegati, [])
  })
})

describe('consegne.salva di una consegna nuova', () => {
  it('non prende i file da chi chiama: eliminarla non cestina quelli di un’altra', async () => {
    const file = 'archivio/consegne/modulo-di-tutti.pdf'
    deposito().scrivi(file, byte('il modulo'))
    const legittima = { ...api.creaConsegna(corso.id, 'Modulo', '2026-10-01'), fileTutti: file }
    archivio.modifica((r) => { r.consegne.push(legittima) }, ['consegne'])

    const intrusa = {
      ...api.creaConsegna(corso.id, 'Intrusa', '2026-10-02'),
      fileTutti: file,
      nomeTutti: 'modulo.pdf',
      fileFirme: file,
      documenti: [{ allievoId: rossi.id, file, nome: 'x.pdf', aggiuntoIl: '2026-10-02T08:00:00.000Z' }],
      fatte: [{ chi: rossi.id, fattaIl: '2026-10-02T08:00:00.000Z', file, nome: 'x.pdf' }],
    }
    const salvata = await chiama('consegne.salva', { consegna: intrusa })
    assert.equal(salvata.ok, true, JSON.stringify(salvata))
    const viva = consegnaViva(intrusa.id)
    assert.equal(viva.fileTutti, undefined)
    assert.equal(viva.fileFirme, undefined)
    assert.deepEqual(viva.documenti, [])
    assert.equal(viva.fatte.length, 1, 'la spunta resta')
    assert.equal(viva.fatte[0].file, undefined, 'ma senza il file')

    const tolta = await chiama('consegne.elimina', { consegnaId: intrusa.id })
    assert.equal(tolta.ok, true, JSON.stringify(tolta))
    assert.notEqual(deposito().leggi(file), null, 'il file dell’altra consegna c’è ancora')
  })
})

describe('piani.salva con il file di un altro', () => {
  it('rifiuta, invece di accettare un file che poi cestinerebbe', async () => {
    const file = 'archivio/prove/verifica-altrui.pdf'
    deposito().scrivi(file, byte('di un altro'))
    const piano = api.creaPiano(corso.id)
    piano.risorse = [{
      id: 'ris-altrui-0001', tipo: 'file', titolo: 'Verifica', file, nome: 'verifica.pdf',
      aggiuntaIl: '2026-09-01T08:00:00.000Z',
    }]
    const prima = archivio.revisione
    const esito = await chiama('piani.salva', { piano })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'rifiutato', JSON.stringify(esito))
    assert.equal(archivio.revisione, prima)
    assert.equal(archivio.registro.piani.some((p) => p.id === piano.id), false)
  })

  it('un file che il piano vivo già cita passa', async () => {
    const file = 'archivio/prove/scheda-sua.pdf'
    deposito().scrivi(file, byte('del piano'))
    const piano = api.creaPiano(corso.id)
    piano.risorse = [{
      id: 'ris-sua-0001', tipo: 'file', titolo: 'Scheda', file, nome: 'scheda.pdf',
      aggiuntaIl: '2026-09-01T08:00:00.000Z',
    }]
    archivio.modifica((r) => { r.piani.push(structuredClone(piano)) }, ['piani'])
    const esito = await chiama('piani.salva', { piano: { ...piano, titolo: 'Frazioni' } })
    assert.equal(esito.ok, true, JSON.stringify(esito))
  })
})

describe('idempotenti al secondo colpo', () => {
  it('orario.genera ripetuta: riuscita, invariata', async () => {
    const ingresso = { corsoId: corso.id, dal: '2026-09-28', al: '2026-10-04' }
    const primo = await chiama('orario.genera', ingresso)
    assert.equal(primo.ok, true, JSON.stringify(primo))
    const revisione = archivio.revisione
    const secondo = await chiama('orario.genera', ingresso)
    assert.equal(secondo.ok, true, JSON.stringify(secondo))
    assert.equal(secondo.dati.invariato, true)
    assert.equal(archivio.revisione, revisione)
  })

  it('consegne.firme.togli e consegne.documento.togli ripetute: riuscite, invariate', async () => {
    const consegna = api.creaConsegna(corso.id, 'Senza fogli', '2026-10-03')
    archivio.modifica((r) => { r.consegne.push(consegna) }, ['consegne'])
    const revisione = archivio.revisione

    const firme = await chiama('consegne.firme.togli', { consegnaId: consegna.id })
    assert.equal(firme.ok, true, JSON.stringify(firme))
    assert.equal(firme.dati.invariato, true)
    const documento = await chiama('consegne.documento.togli', {
      consegnaId: consegna.id, allievoId: null,
    })
    assert.equal(documento.ok, true, JSON.stringify(documento))
    assert.equal(documento.dati.invariato, true)
    assert.equal(archivio.revisione, revisione)
  })
})

describe('consegne.spunta ripetuta', () => {
  it('tiene la data della prima spunta', async () => {
    const consegna = api.creaConsegna(corso.id, 'Relazione', '2026-10-01')
    consegna.fatte = [{ chi: rossi.id, fattaIl: '2026-10-01T08:00:00.000Z' }]
    archivio.modifica((r) => { r.consegne.push(consegna) }, ['consegne'])
    const revisione = archivio.revisione

    const esito = await chiama('consegne.spunta', { consegnaId: consegna.id, chi: rossi.id, fatta: true })

    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(consegnaViva(consegna.id).fatte[0].fattaIl, '2026-10-01T08:00:00.000Z')
    assert.equal(archivio.revisione, revisione)
  })
})

describe('calendario su un id che non c’è', () => {
  it('aggiorna e modifica rispondono «non trovato»', async () => {
    const aggiorna = await chiama('calendario.aggiorna', { calendarioId: 'cal-inventato-0001' })
    assert.equal(aggiorna.codice, 'non-trovato', JSON.stringify(aggiorna))
    const modifica = await chiama('calendario.modifica', { calendarioId: 'cal-inventato-0001', nome: 'X' })
    assert.equal(modifica.codice, 'non-trovato', JSON.stringify(modifica))
  })
})
