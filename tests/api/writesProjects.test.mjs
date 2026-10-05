// Le scritture del progetto (ADR-54 e la sua estensione del 2026-10-03),
// dalle procedure `progetti.*`:
//
//   - `progetti.salva` crea un progetto dell'anno, e cambiando la testata
//     tiene le integrazioni (compiti, giudizi, matrice); un criterio senza id
//     col titolo di uno che c'è ne tiene l'id; celle che cadrebbero si
//     scartano solo con `scartaCelle`; corso, stato e lavoro con la classe
//     mandati con la testata non vi entrano;
//   - l'integrazione: `progetti.integra` (una volta sola), lo stato per corso,
//     `progetti.integrazione.togli` che porta via il lavoro con quella classe e
//     sgancia tappe e momenti del corso, lasciando il progetto e gli altri
//     corsi; il lavoro con la classe si scrive solo in un corso integrato;
//   - i compiti: inizio in un'ora del corso (non di un altro, non svolta),
//     senza giorno solo a chi non ha cominciato; la fine tiene la sua ora se
//     non la si sposta; proroga, spunta e spunta a tutti quelli che frequentano;
//   - la cella: un giorno, una cella; un altro giorno, un'altra; vuota sparisce;
//     due celle nello stesso giorno (ora e giorno senza ora) diventano una;
//   - giudizi su una persona o sulla classe, non in un'ora conclusa;
//   - i legami: la tappa di un piano integra il progetto nel suo corso; il
//     momento lavora solo per un progetto integrato nel suo corso, e quello che
//     nasce da una tappa ne prende il progetto;
//   - `progetti.elimina` sgancia tappe e momenti;
//   - le fasi: almeno una; la tappa cade in una fase del suo progetto (la prima
//     se non dice quale); togliere una fase sposta le sue tappe e lo dice; la
//     lettura dà periodo, tappe e quota di ogni fase, e le presenze.
//
// Ogni rifiuto guarda anche che l'archivio non abbia scritto.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-scritture-progetti-')

let api
let archivio
let rossi
let bianchi
let ritirata
let verdi
let corso
let altroCorso
let lezione
let oraAltroCorso

const chiama = (nome, ingresso) => api.chiama(archivio, nome, ingresso)
const progettoPerId = (id) => archivio.registro.progetti.find((p) => p.id === id)
/** Il lavoro del progetto con la classe del corso: la sua integrazione lì. */
const nelCorso = (id, corsoId = corso.id) => progettoPerId(id)?.integrazioni.find((i) => i.corsoId === corsoId)

/** Una chiamata che deve essere rifiutata senza scrivere. */
async function rifiutata (nome, ingresso, codice) {
  const prima = archivio.revisione
  const esito = await chiama(nome, ingresso)
  assert.equal(esito.ok, false, `${nome} ha accettato: ${JSON.stringify(ingresso)}`)
  if (codice) assert.equal(esito.codice, codice, JSON.stringify(esito))
  assert.equal(archivio.revisione, prima, `${nome} ha scritto rifiutando`)
  return esito
}

/** Una chiamata che deve riuscire. */
async function riuscita (nome, ingresso) {
  const esito = await chiama(nome, ingresso)
  assert.equal(esito.ok, true, JSON.stringify(esito))
  return esito
}

/** Un progetto nuovo dell'anno integrato nel corso, con due criteri, e un compito. */
async function nuovoProgetto (titolo = 'Officina') {
  const { integrazioni: _nessuna, ...progetto } = api.creaProgetto(null, titolo)
  progetto.criteri = [{ id: 'crp-a', titolo: 'Precisione' }, { id: 'crp-b', titolo: 'Ordine' }]
  const creato = await riuscita('progetti.salva', { progetto })
  assert.equal(creato.dati.creato.id, progetto.id)
  assert.deepEqual(progettoPerId(progetto.id).integrazioni, [])
  await riuscita('progetti.integra', { progettoId: progetto.id, corsoId: corso.id })
  const compito = await riuscita('progetti.compito.salva', {
    progettoId: progetto.id, corsoId: corso.id,
    compito: { titolo: 'Rilievo', fine: '2026-10-30' },
  })
  return { progetto, compitoId: compito.dati.creato.id }
}

before(async () => {
  ;({ api, archivio } = await archivioDiProva({ lavoro, dati, pdfAutomatici: 'mai' }))
  const { creaAllievo, creaClasse, creaCorso, creaLezione, creaMateria } = api
  const annoId = archivio.registro.anni[0].id
  const classe = creaClasse(annoId, 'I MEC A')
  rossi = creaAllievo('Rossi', 'Maria')
  bianchi = creaAllievo('Bianchi', 'Luca')
  ritirata = creaAllievo('Blu', 'Carla')
  ritirata.attivo = false
  classe.allievi.push(rossi, bianchi, ritirata)
  const altra = creaClasse(annoId, 'II ELE B')
  verdi = creaAllievo('Verdi', 'Anna')
  altra.allievi.push(verdi)
  const matematica = creaMateria('Matematica')
  corso = creaCorso(classe.id, matematica.id, 'I MEC A — Matematica')
  altroCorso = creaCorso(altra.id, matematica.id, 'II ELE B — Matematica')
  lezione = creaLezione(corso.id, '2026-09-14', '08:20', 45)
  oraAltroCorso = creaLezione(altroCorso.id, '2026-09-14', '10:20', 45)
  archivio.modifica((r) => {
    r.classi.push(classe, altra)
    r.materie.push(matematica)
    r.corsi.push(corso, altroCorso)
    r.lezioni.push(lezione, oraAltroCorso)
  }, ['classi', 'corsi', 'lezioni', 'registro'])
})

after(() => smonta(radice, archivio))

describe('progetti.salva', () => {
  it('cambiare la testata tiene le integrazioni; un criterio tolto porta via le sue celle', async () => {
    const { progetto, compitoId } = await nuovoProgetto()
    await riuscita('progetti.cella', {
      progettoId: progetto.id, corsoId: corso.id, allievoId: rossi.id, criterioId: 'crp-a', data: '2026-09-20', livello: 'parziale',
    })
    await riuscita('progetti.cella', {
      progettoId: progetto.id, corsoId: corso.id, allievoId: rossi.id, criterioId: 'crp-b', data: '2026-09-20', livello: 'raggiunto',
    })

    // Una copia vecchia della testata, senza compiti: il registro tiene i suoi.
    // Il criterio tolto ha una cella: senza `scartaCelle` non si salva.
    const senzaB = { ...progetto, titolo: 'Officina delle misure', criteri: [progetto.criteri[0]], compiti: [] }
    const rifiuto = await rifiutata('progetti.salva', { progetto: senzaB }, 'rifiutato')
    assert.match(rifiuto.messaggi.join(' '), /1 cella.*Ordine/)
    const esito = await riuscita('progetti.salva', { progetto: senzaB, scartaCelle: true })
    assert.match(esito.dati.messaggio?.testo ?? '', /1 cella/)
    assert.equal(progettoPerId(progetto.id).titolo, 'Officina delle misure')
    assert.deepEqual(nelCorso(progetto.id).compiti.map((c) => c.id), [compitoId])
    assert.deepEqual(nelCorso(progetto.id).matrice.map((c) => c.criterioId), ['crp-a'])
  })

  it('un criterio rimandato senza id, col titolo di uno che c’è, ne tiene l’id e le celle', async () => {
    const { progetto } = await nuovoProgetto()
    await riuscita('progetti.cella', {
      progettoId: progetto.id, corsoId: corso.id, allievoId: rossi.id, criterioId: 'crp-a', data: '2026-09-20', livello: 'parziale',
    })
    await riuscita('progetti.salva', {
      progetto: { ...progetto, criteri: [{ titolo: ' precisione ' }, progetto.criteri[1], { titolo: 'Cura' }] },
    })
    const vivo = progettoPerId(progetto.id)
    assert.equal(vivo.criteri[0].id, 'crp-a')
    assert.ok(vivo.criteri[2].id && vivo.criteri[2].id !== 'crp-a')
    assert.equal(nelCorso(progetto.id).matrice.length, 1)
  })

  it('un livello cambiato che lascerebbe celle senza livello si rifiuta, se non lo si chiede', async () => {
    const { progetto } = await nuovoProgetto()
    await riuscita('progetti.cella', {
      progettoId: progetto.id, corsoId: corso.id, allievoId: rossi.id, criterioId: 'crp-a', data: '2026-09-20', livello: 'parziale',
    })
    const livelli = progettoPerId(progetto.id).livelli.map((l) =>
      l.valore === 'parziale' ? { ...l, valore: 'in-parte' } : l)
    const rifiuto = await rifiutata('progetti.salva', { progetto: { ...progetto, livelli } }, 'rifiutato')
    assert.match(rifiuto.messaggi.join(' '), /1 cella/)
    assert.equal(nelCorso(progetto.id).matrice[0].livello, 'parziale')
    await riuscita('progetti.salva', { progetto: { ...progetto, livelli }, scartaCelle: true })
    assert.deepEqual(nelCorso(progetto.id).matrice, [])
  })

  it('senza id non si salva; due volte con lo stesso id è un progetto solo', async () => {
    const { id: _via, ...senzaId } = api.creaProgetto(corso.id, 'Senza id')
    await rifiutata('progetti.salva', { progetto: senzaId }, 'ingresso-non-valido')
    const progetto = api.creaProgetto(corso.id, 'Due volte')
    const prima = archivio.registro.progetti.length
    await riuscita('progetti.salva', { progetto })
    await riuscita('progetti.salva', { progetto })
    assert.equal(archivio.registro.progetti.length, prima + 1)
  })

  it('corso, stato e lavoro con la classe mandati con la testata non vi entrano', async () => {
    const { progetto, compitoId } = await nuovoProgetto()
    await riuscita('progetti.salva', {
      progetto: {
        ...progetto, corsoId: altroCorso.id, stato: 'concluso', compiti: [], matrice: [], giudizi: [],
        integrazioni: [],
      },
    })
    const vivo = progettoPerId(progetto.id)
    assert.equal('corsoId' in vivo || 'stato' in vivo || 'compiti' in vivo, false, JSON.stringify(vivo))
    assert.deepEqual(vivo.integrazioni.map((i) => [i.corsoId, i.stato]), [[corso.id, 'bozza']])
    assert.deepEqual(nelCorso(progetto.id).compiti.map((c) => c.id), [compitoId])
  })

  it('rifiuta una testata che non sta in piedi', async () => {
    const { progetto } = await nuovoProgetto()
    await rifiutata('progetti.salva', { progetto: { ...progetto, titolo: '  ' } }, 'ingresso-non-valido')
    await rifiutata('progetti.salva', {
      progetto: { ...progetto, livelli: [{ valore: 'a', testo: 'A' }, { valore: 'a', testo: 'Ancora A' }] },
    }, 'ingresso-non-valido')
  })

  it('un file nelle risorse che il progetto non aveva si rifiuta', async () => {
    const { progetto } = await nuovoProgetto()
    await rifiutata('progetti.salva', {
      progetto: {
        ...progetto,
        risorse: [{ id: 'ris-x', tipo: 'file', titolo: 'Altrui', file: 'risorse/altrui.pdf', aggiuntaIl: '2026-09-01T08:00:00.000Z' }],
      },
    })
  })
})

describe('progetti: i compiti', () => {
  it('l’inizio in un’ora del corso ne prende il giorno; rifatto uguale non scrive', async () => {
    const { progetto, compitoId } = await nuovoProgetto()
    const ingresso = {
      progettoId: progetto.id, corsoId: corso.id, compitoId, allieviIds: [rossi.id, bianchi.id], lezioneId: lezione.id,
    }
    await riuscita('progetti.compito.inizia', ingresso)
    const inizi = nelCorso(progetto.id).compiti[0].inizi
    assert.deepEqual(inizi.map((i) => [i.allievoId, i.data, i.lezioneId]), [
      [rossi.id, lezione.data, lezione.id],
      [bianchi.id, lezione.data, lezione.id],
    ])
    const prima = archivio.revisione
    await riuscita('progetti.compito.inizia', ingresso)
    assert.equal(archivio.revisione, prima, 'lo stesso inizio ha riscritto')

    // Spostato a mano a un altro giorno.
    await riuscita('progetti.compito.inizia', {
      progettoId: progetto.id, corsoId: corso.id, compitoId, allieviIds: [bianchi.id], data: '2026-09-18',
    })
    const suo = nelCorso(progetto.id).compiti[0].inizi.find((i) => i.allievoId === bianchi.id)
    assert.deepEqual([suo.data, suo.lezioneId], ['2026-09-18', null])

    await riuscita('progetti.compito.togliInizio', {
      progettoId: progetto.id, corsoId: corso.id, compitoId, allieviIds: [rossi.id],
    })
    const restano = nelCorso(progetto.id).compiti[0].inizi
    assert.deepEqual(restano.map((i) => i.allievoId), [bianchi.id])
  })

  it('senza giorno né ora si comincia oggi solo chi non ha cominciato', async () => {
    const { progetto, compitoId } = await nuovoProgetto()
    await riuscita('progetti.compito.inizia', {
      progettoId: progetto.id, corsoId: corso.id, compitoId, allieviIds: [rossi.id], lezioneId: lezione.id,
    })
    await riuscita('progetti.compito.inizia', {
      progettoId: progetto.id, corsoId: corso.id, compitoId, allieviIds: [rossi.id, bianchi.id],
    })
    const inizi = nelCorso(progetto.id).compiti[0].inizi
    const suo = inizi.find((i) => i.allievoId === rossi.id)
    assert.deepEqual([suo.data, suo.lezioneId], [lezione.data, lezione.id])
    assert.equal(inizi.length, 2)
    const prima = archivio.revisione
    await riuscita('progetti.compito.inizia', {
      progettoId: progetto.id, corsoId: corso.id, compitoId, allieviIds: [rossi.id, bianchi.id],
    })
    assert.equal(archivio.revisione, prima, 'ripetuto ha riscritto')
  })

  it('rifiuta un’ora di un altro corso, una persona di un’altra classe, un compito che non c’è', async () => {
    const { progetto, compitoId } = await nuovoProgetto()
    await rifiutata('progetti.compito.inizia', {
      progettoId: progetto.id, corsoId: corso.id, compitoId, allieviIds: [rossi.id], lezioneId: oraAltroCorso.id,
    }, 'rifiutato')
    await rifiutata('progetti.compito.inizia', {
      progettoId: progetto.id, corsoId: corso.id, compitoId, allieviIds: [verdi.id],
    }, 'rifiutato')
    await rifiutata('progetti.compito.inizia', {
      progettoId: progetto.id, corsoId: corso.id, compitoId: 'cmp-sparito', allieviIds: [rossi.id],
    }, 'non-trovato')
    await rifiutata('progetti.compito.inizia', {
      progettoId: 'prg-sparito', corsoId: corso.id, compitoId, allieviIds: [rossi.id],
    }, 'non-trovato')
  })

  it('in un’ora svolta non si comincia niente', async () => {
    const { progetto, compitoId } = await nuovoProgetto()
    const svolta = api.creaLezione(corso.id, '2026-09-21', '08:20', 45)
    svolta.stato = 'svolta'
    archivio.modifica((r) => { r.lezioni.push(svolta) }, ['lezioni'])
    await rifiutata('progetti.compito.inizia', {
      progettoId: progetto.id, corsoId: corso.id, compitoId, allieviIds: [rossi.id], lezioneId: svolta.id,
    })
  })

  it('l’inizio e la cella di un’ora che poi si conclude non si tolgono né si cambiano', async () => {
    const { progetto, compitoId } = await nuovoProgetto()
    const ora = api.creaLezione(corso.id, '2026-09-23', '08:20', 45)
    archivio.modifica((r) => { r.lezioni.push(ora) }, ['lezioni'])
    await riuscita('progetti.compito.inizia', {
      progettoId: progetto.id, corsoId: corso.id, compitoId, allieviIds: [rossi.id], lezioneId: ora.id,
    })
    await riuscita('progetti.cella', {
      progettoId: progetto.id, corsoId: corso.id, allievoId: rossi.id, criterioId: 'crp-a', lezioneId: ora.id, livello: 'parziale',
    })
    archivio.modifica((r) => { r.lezioni.find((l) => l.id === ora.id).stato = 'svolta' }, ['lezioni'])
    await rifiutata('progetti.compito.togliInizio', {
      progettoId: progetto.id, corsoId: corso.id, compitoId, allieviIds: [rossi.id],
    }, 'rifiutato')
    // Nominando il giorno e non l'ora, la cella è la stessa.
    await rifiutata('progetti.cella', {
      progettoId: progetto.id, corsoId: corso.id, allievoId: rossi.id, criterioId: 'crp-a', data: ora.data, livello: null,
    }, 'rifiutato')
  })

  it('la proroga si dà e si toglie; la spunta tiene il suo quando, la nota no', async () => {
    const { progetto, compitoId } = await nuovoProgetto()
    const base = { progettoId: progetto.id, corsoId: corso.id, compitoId, allievoId: bianchi.id }
    await riuscita('progetti.compito.proroga', { ...base, fine: '2026-11-06', nota: 'Malattia' })
    assert.deepEqual(nelCorso(progetto.id).compiti[0].proroghe, [
      { allievoId: bianchi.id, fine: '2026-11-06', nota: 'Malattia' },
    ])
    await riuscita('progetti.compito.proroga', { ...base, fine: null })
    assert.deepEqual(nelCorso(progetto.id).compiti[0].proroghe, [])

    await riuscita('progetti.compito.fatto', { ...base, fatto: true })
    const quando = nelCorso(progetto.id).compiti[0].fatti[0].fattoIl
    await riuscita('progetti.compito.fatto', { ...base, fatto: true, nota: 'In ritardo' })
    const fatto = nelCorso(progetto.id).compiti[0].fatti[0]
    assert.deepEqual([fatto.fattoIl, fatto.nota], [quando, 'In ritardo'])
    await riuscita('progetti.compito.fatto', { ...base, fatto: false })
    assert.deepEqual(nelCorso(progetto.id).compiti[0].fatti, [])
  })

  it('spunta a tutti: solo chi frequenta, e chi l’aveva già la tiene', async () => {
    const { progetto, compitoId } = await nuovoProgetto()
    await riuscita('progetti.compito.fatto', {
      progettoId: progetto.id, corsoId: corso.id, compitoId, allievoId: rossi.id, fatto: true,
    })
    const suo = nelCorso(progetto.id).compiti[0].fatti[0].fattoIl
    await riuscita('progetti.compito.fattoTutti', { progettoId: progetto.id, corsoId: corso.id, compitoId, fatto: true })
    const fatti = nelCorso(progetto.id).compiti[0].fatti
    assert.deepEqual(fatti.map((f) => f.allievoId).sort(), [bianchi.id, rossi.id].sort())
    assert.equal(fatti.find((f) => f.allievoId === rossi.id).fattoIl, suo)
    // Togliere toglie tutte le spunte, come per le consegne: anche di chi s'è
    // ritirato, con le loro note.
    await riuscita('progetti.compito.fatto', {
      progettoId: progetto.id, corsoId: corso.id, compitoId, allievoId: ritirata.id, fatto: true, nota: 'Prima di partire',
    })
    await riuscita('progetti.compito.fattoTutti', { progettoId: progetto.id, corsoId: corso.id, compitoId, fatto: false })
    assert.deepEqual(nelCorso(progetto.id).compiti[0].fatti, [])
  })

  it('la fine in un’ora del corso, e il compito tolto', async () => {
    const { progetto, compitoId } = await nuovoProgetto()
    await riuscita('progetti.compito.salva', {
      progettoId: progetto.id, corsoId: corso.id,
      compito: { id: compitoId, titolo: 'Rilievo del pezzo', fine: null, fineLezioneId: lezione.id },
    })
    const compito = nelCorso(progetto.id).compiti[0]
    assert.deepEqual([compito.titolo, compito.fine, compito.fineLezioneId], ['Rilievo del pezzo', lezione.data, lezione.id])
    // Riscritto come lo dà `progetti.leggi`, senza nominare l'ora: la tiene.
    const [letto] = (await riuscita('progetti.leggi', { progettoId: progetto.id, corsoId: corso.id })).dati.progetti[0].compiti
    assert.equal(letto.fineLezioneId, lezione.id)
    await riuscita('progetti.compito.salva', {
      progettoId: progetto.id, corsoId: corso.id, compito: { id: compitoId, titolo: 'Rilievo', fine: letto.fine },
    })
    assert.equal(nelCorso(progetto.id).compiti[0].fineLezioneId, lezione.id)
    // Un altro giorno la stacca dall'ora.
    await riuscita('progetti.compito.salva', {
      progettoId: progetto.id, corsoId: corso.id, compito: { id: compitoId, titolo: 'Rilievo', fine: '2026-10-30' },
    })
    const spostato = nelCorso(progetto.id).compiti[0]
    assert.deepEqual([spostato.fine, spostato.fineLezioneId], ['2026-10-30', null])
    await riuscita('progetti.compito.elimina', { progettoId: progetto.id, corsoId: corso.id, compitoId })
    assert.deepEqual(nelCorso(progetto.id).compiti, [])
    await rifiutata('progetti.compito.elimina', { progettoId: progetto.id, corsoId: corso.id, compitoId }, 'non-trovato')
  })
})

describe('progetti.cella', () => {
  it('un giorno, una cella; un altro giorno, un’altra; vuota sparisce', async () => {
    const { progetto } = await nuovoProgetto()
    const cella = { progettoId: progetto.id, corsoId: corso.id, allievoId: rossi.id, criterioId: 'crp-a' }
    await riuscita('progetti.cella', { ...cella, lezioneId: lezione.id, livello: 'parziale' })
    const prima = archivio.revisione
    await riuscita('progetti.cella', { ...cella, lezioneId: lezione.id, livello: 'parziale' })
    assert.equal(archivio.revisione, prima, 'la stessa cella ha riscritto')
    await riuscita('progetti.cella', { ...cella, data: '2026-10-05', livello: 'raggiunto', nota: 'Meglio' })
    assert.deepEqual(
      nelCorso(progetto.id).matrice.map((c) => [c.data, c.livello, c.nota]),
      [[lezione.data, 'parziale', undefined], ['2026-10-05', 'raggiunto', 'Meglio']],
    )
    // Senza nota resta quella che c'è; livello nullo e nota vuota la tolgono.
    await riuscita('progetti.cella', { ...cella, data: '2026-10-05', livello: null })
    assert.equal(nelCorso(progetto.id).matrice[1].nota, 'Meglio')
    await riuscita('progetti.cella', { ...cella, data: '2026-10-05', livello: null, nota: '' })
    assert.equal(nelCorso(progetto.id).matrice.length, 1)
  })

  it('due celle nello stesso giorno, una nell’ora e una no, si riscrivono in una', async () => {
    const { progetto } = await nuovoProgetto()
    archivio.modifica((r) => {
      r.progetti.find((p) => p.id === progetto.id).integrazioni[0].matrice.push(
        { allievoId: rossi.id, criterioId: 'crp-a', data: lezione.data, lezioneId: lezione.id, livello: 'parziale' },
        { allievoId: rossi.id, criterioId: 'crp-a', data: lezione.data, lezioneId: null, livello: 'raggiunto' },
      )
    }, ['progetti'])
    await riuscita('progetti.cella', {
      progettoId: progetto.id, corsoId: corso.id, allievoId: rossi.id, criterioId: 'crp-a', data: lezione.data, livello: 'pienamente',
    })
    assert.deepEqual(nelCorso(progetto.id).matrice.map((c) => c.livello), ['pienamente'])
    await riuscita('progetti.cella', {
      progettoId: progetto.id, corsoId: corso.id, allievoId: rossi.id, criterioId: 'crp-a', data: lezione.data, livello: null,
    })
    assert.deepEqual(nelCorso(progetto.id).matrice, [])
  })

  it('rifiuta un livello che la scala non ha e un criterio che non c’è', async () => {
    const { progetto } = await nuovoProgetto()
    const cella = { progettoId: progetto.id, corsoId: corso.id, allievoId: rossi.id, data: '2026-10-05' }
    await rifiutata('progetti.cella', { ...cella, criterioId: 'crp-a', livello: 'eccelso' }, 'rifiutato')
    await rifiutata('progetti.cella', { ...cella, criterioId: 'crp-zz', livello: 'parziale' }, 'non-trovato')
  })
})

describe('progetti: i giudizi', () => {
  it('sulla classe o su una persona; una persona d’altri si rifiuta', async () => {
    const { progetto } = await nuovoProgetto()
    const esito = await riuscita('progetti.giudizio.salva', {
      progettoId: progetto.id, corsoId: corso.id,
      giudizio: { allievoId: null, testo: 'Partenza lenta', lezioneId: lezione.id },
    })
    const id = esito.dati.creato.id
    await riuscita('progetti.giudizio.salva', {
      progettoId: progetto.id, corsoId: corso.id, giudizio: { id, allievoId: rossi.id, testo: 'Partenza lenta, ma regolare' },
    })
    const [giudizio] = nelCorso(progetto.id).giudizi
    assert.deepEqual([giudizio.allievoId, giudizio.testo, giudizio.data, giudizio.lezioneId],
      [rossi.id, 'Partenza lenta, ma regolare', lezione.data, lezione.id])
    await rifiutata('progetti.giudizio.salva', {
      progettoId: progetto.id, corsoId: corso.id, giudizio: { allievoId: verdi.id, testo: 'No' },
    }, 'rifiutato')
    await riuscita('progetti.giudizio.elimina', { progettoId: progetto.id, corsoId: corso.id, giudizioId: id })
    assert.deepEqual(nelCorso(progetto.id).giudizi, [])
  })

  it('in un’ora conclusa un giudizio non si scrive né si toglie, come le osservazioni', async () => {
    const { progetto } = await nuovoProgetto()
    const ora = api.creaLezione(corso.id, '2026-09-22', '08:20', 45)
    archivio.modifica((r) => { r.lezioni.push(ora) }, ['lezioni'])
    const esito = await riuscita('progetti.giudizio.salva', {
      progettoId: progetto.id, corsoId: corso.id, giudizio: { allievoId: null, testo: 'Buon avvio', lezioneId: ora.id },
    })
    const id = esito.dati.creato.id
    archivio.modifica((r) => { r.lezioni.find((l) => l.id === ora.id).stato = 'svolta' }, ['lezioni'])
    await rifiutata('progetti.giudizio.salva', {
      progettoId: progetto.id, corsoId: corso.id, giudizio: { allievoId: null, testo: 'Altro', lezioneId: ora.id },
    }, 'rifiutato')
    await rifiutata('progetti.giudizio.salva', {
      progettoId: progetto.id, corsoId: corso.id, giudizio: { id, allievoId: null, testo: 'Buon avvio, corretto' },
    }, 'rifiutato')
    await rifiutata('progetti.giudizio.elimina', { progettoId: progetto.id, corsoId: corso.id, giudizioId: id }, 'rifiutato')
    // Un giorno senza ora, anche lo stesso, resta libero.
    await riuscita('progetti.giudizio.salva', {
      progettoId: progetto.id, corsoId: corso.id, giudizio: { allievoId: null, testo: 'Nota del giorno', data: ora.data },
    })
  })
})

describe('progetti: l’integrazione nei corsi', () => {
  it('integrare due volte è una volta sola; corso o progetto che non c’è sono «non trovato»', async () => {
    const { progetto } = await nuovoProgetto()
    const prima = archivio.revisione
    await riuscita('progetti.integra', { progettoId: progetto.id, corsoId: corso.id })
    assert.equal(archivio.revisione, prima, 'integrare di nuovo ha scritto')
    assert.equal(progettoPerId(progetto.id).integrazioni.length, 1)
    await rifiutata('progetti.integra', { progettoId: progetto.id, corsoId: 'cor-sparito' }, 'non-trovato')
    await rifiutata('progetti.integra', { progettoId: 'prg-sparito', corsoId: corso.id }, 'non-trovato')
  })

  it('il lavoro con la classe si scrive solo in un corso in cui il progetto è integrato', async () => {
    const { progetto, compitoId } = await nuovoProgetto()
    await rifiutata('progetti.compito.salva', {
      progettoId: progetto.id, corsoId: altroCorso.id, compito: { titolo: 'Altrove', fine: null },
    }, 'rifiutato')
    await rifiutata('progetti.compito.fatto', {
      progettoId: progetto.id, corsoId: altroCorso.id, compitoId, allievoId: verdi.id, fatto: true,
    }, 'rifiutato')
    await rifiutata('progetti.cella', {
      progettoId: progetto.id, corsoId: altroCorso.id, allievoId: verdi.id, criterioId: 'crp-a', livello: 'parziale',
    }, 'rifiutato')
    await rifiutata('progetti.giudizio.salva', {
      progettoId: progetto.id, corsoId: altroCorso.id, giudizio: { allievoId: null, testo: 'No' },
    }, 'rifiutato')
    // Senza corso lo schema non passa.
    await rifiutata('progetti.compito.salva', {
      progettoId: progetto.id, compito: { titolo: 'Senza corso', fine: null },
    }, 'ingresso-non-valido')
  })

  it('lo stato è di ogni corso', async () => {
    const { progetto } = await nuovoProgetto()
    await riuscita('progetti.integra', { progettoId: progetto.id, corsoId: altroCorso.id })
    await riuscita('progetti.integrazione.stato', { progettoId: progetto.id, corsoId: corso.id, stato: 'in-corso' })
    assert.equal(nelCorso(progetto.id).stato, 'in-corso')
    assert.equal(nelCorso(progetto.id, altroCorso.id).stato, 'bozza')
    const prima = archivio.revisione
    await riuscita('progetti.integrazione.stato', { progettoId: progetto.id, corsoId: corso.id, stato: 'in-corso' })
    assert.equal(archivio.revisione, prima, 'lo stesso stato ha riscritto')
    await rifiutata('progetti.integrazione.stato', {
      progettoId: progetto.id, corsoId: corso.id, stato: 'finito',
    }, 'ingresso-non-valido')
    const solo = await nuovoProgetto('Solo qui')
    await rifiutata('progetti.integrazione.stato', {
      progettoId: solo.progetto.id, corsoId: altroCorso.id, stato: 'concluso',
    }, 'rifiutato')
  })

  it('togliere l’integrazione porta via il lavoro con la classe e sgancia tappe e momenti del corso', async () => {
    const { progetto } = await nuovoProgetto('Da togliere')
    await riuscita('progetti.cella', {
      progettoId: progetto.id, corsoId: corso.id, allievoId: rossi.id, criterioId: 'crp-a', data: '2026-09-20', livello: 'parziale',
    })
    const piano = api.creaPiano(corso.id)
    piano.attivita = [{ ...api.creaAttivita('Misure', 1), progettoId: progetto.id }]
    await riuscita('piani.salva', { piano })
    const altroPiano = api.creaPiano(altroCorso.id)
    altroPiano.attivita = [{ ...api.creaAttivita('Misure altrove', 1), progettoId: progetto.id }]
    await riuscita('piani.salva', { piano: altroPiano })
    const momento = api.creaValutazione(corso.id, 'Prova del progetto')
    momento.progettoId = progetto.id
    await riuscita('valutazioni.salva', { valutazione: momento })

    const tolto = await riuscita('progetti.integrazione.togli', { progettoId: progetto.id, corsoId: corso.id })
    // Quel che se ne va non se ne va in silenzio: il compito e la cella.
    assert.match(tolto.dati.messaggio?.testo ?? '', /1 tappa dei piani resta senza progetto\. Con il corso se ne sono andati: 1 compito, 1 cella della matrice\./)
    const vivo = progettoPerId(progetto.id)
    assert.ok(vivo, 'il progetto se n’è andato')
    assert.equal(nelCorso(progetto.id), undefined)
    assert.deepEqual(vivo.integrazioni.map((i) => i.corsoId), [altroCorso.id])
    assert.equal(archivio.registro.piani.find((p) => p.id === piano.id).attivita[0].progettoId, undefined)
    assert.equal(archivio.registro.piani.find((p) => p.id === altroPiano.id).attivita[0].progettoId, progetto.id)
    assert.equal(archivio.registro.valutazioni.find((v) => v.id === momento.id).progettoId, null)
    await rifiutata('progetti.integrazione.togli', { progettoId: progetto.id, corsoId: corso.id }, 'rifiutato')
    // Reintegrato, riparte vuoto.
    await riuscita('progetti.integra', { progettoId: progetto.id, corsoId: corso.id })
    assert.deepEqual([nelCorso(progetto.id).compiti, nelCorso(progetto.id).matrice], [[], []])
  })

  it('la lettura senza corso dà i progetti dell’anno con i corsi; con il corso, solo gli integrati lì', async () => {
    const { progetto } = await nuovoProgetto('Letto da due')
    await riuscita('progetti.integra', { progettoId: progetto.id, corsoId: altroCorso.id })
    await riuscita('progetti.integrazione.stato', { progettoId: progetto.id, corsoId: altroCorso.id, stato: 'concluso' })
    const { progetto: soloQui } = await nuovoProgetto('Solo nel primo')

    const anno = (await riuscita('progetti.leggi', {})).dati.progetti
    const voce = anno.find((p) => p.id === progetto.id)
    assert.deepEqual(voce.integrazioni.map((i) => [i.corsoId, i.stato]), [[corso.id, 'bozza'], [altroCorso.id, 'concluso']])
    assert.equal(voce.compiti, undefined, 'senza corso non c’è il lavoro con la classe')
    assert.ok(anno.some((p) => p.id === soloQui.id))

    const altrove = (await riuscita('progetti.leggi', { corsoId: altroCorso.id })).dati.progetti
    assert.ok(altrove.some((p) => p.id === progetto.id))
    assert.ok(!altrove.some((p) => p.id === soloQui.id))
    const visto = altrove.find((p) => p.id === progetto.id)
    assert.deepEqual([visto.corsoId, visto.stato, visto.compiti], [altroCorso.id, 'concluso', []])
    await rifiutata('progetti.leggi', { progettoId: soloQui.id, corsoId: altroCorso.id }, 'rifiutato')
  })
})

describe('progetti: i legami con piani e valutazioni', () => {
  it('un momento lavora solo per un progetto integrato nel suo corso; una tappa lo integra', async () => {
    const { progetto } = await nuovoProgetto()
    const momento = api.creaValutazione(altroCorso.id, 'Prova')
    momento.progettoId = progetto.id
    await rifiutata('valutazioni.salva', { valutazione: momento }, 'rifiutato')
    const piano = api.creaPiano(altroCorso.id)
    piano.attivita = [{ ...api.creaAttivita('Misure', 1), progettoId: progetto.id }]
    await riuscita('piani.salva', { piano })
    assert.equal(nelCorso(progetto.id, altroCorso.id)?.stato, 'bozza')
    await riuscita('valutazioni.salva', { valutazione: momento })
  })

  it('il momento che nasce da una tappa di progetto è del progetto', async () => {
    const { progetto } = await nuovoProgetto()
    const piano = api.creaPiano(corso.id)
    const tappa = { ...api.creaAttivita('Prova pratica', 1), progettoId: progetto.id }
    tappa.valutazione = { titolo: 'Prova pratica', tipo: 'pratico', peso: 1 }
    piano.attivita = [tappa]
    await riuscita('piani.salva', { piano })
    const ora = api.creaLezione(corso.id, '2026-09-28', '08:20', 45)
    ora.pianoId = piano.id
    archivio.modifica((r) => { r.lezioni.push(ora) }, ['lezioni'])
    const esito = await riuscita('valutazioni.daAttivita', { lezioneId: ora.id, attivitaId: tappa.id })
    const momento = archivio.registro.valutazioni.find((v) => v.id === esito.dati.creato.id)
    assert.equal(momento.progettoId, progetto.id)
  })

  it('eliminare il progetto sgancia tappe e momenti, senza cancellarli', async () => {
    const { progetto } = await nuovoProgetto()
    const piano = api.creaPiano(corso.id)
    piano.attivita = [{ ...api.creaAttivita('Misure', 1), progettoId: progetto.id }]
    await riuscita('piani.salva', { piano })
    const momento = api.creaValutazione(corso.id, 'Prova del progetto')
    momento.progettoId = progetto.id
    await riuscita('valutazioni.salva', { valutazione: momento })

    await riuscita('progetti.elimina', { progettoId: progetto.id })
    assert.equal(progettoPerId(progetto.id), undefined)
    const tappa = archivio.registro.piani.find((p) => p.id === piano.id).attivita[0]
    assert.equal(tappa.progettoId, undefined)
    assert.equal(archivio.registro.valutazioni.find((v) => v.id === momento.id).progettoId, null)
    await rifiutata('progetti.elimina', { progettoId: progetto.id }, 'non-trovato')
  })
})

describe('progetti: le fasi', () => {
  /** Un progetto in due fasi, con una tappa in ciascuna. */
  async function inDueFasi () {
    const { progetto } = await nuovoProgetto('In fasi')
    const [prima] = progettoPerId(progetto.id).fasi
    await riuscita('progetti.salva', {
      progetto: { ...progettoPerId(progetto.id), fasi: [prima, { id: 'fsp-collaudo', titolo: 'Collaudo' }] },
    })
    const piano = api.creaPiano(corso.id)
    piano.attivita = [
      { ...api.creaAttivita('Rilievo', 1), progettoId: progetto.id },
      { ...api.creaAttivita('Prova', 1), progettoId: progetto.id, faseProgettoId: 'fsp-collaudo' },
    ]
    await riuscita('piani.salva', { piano })
    const pianoVivo = () => archivio.registro.piani.find((p) => p.id === piano.id)
    return { progetto, prima, pianoVivo, tappe: () => pianoVivo().attivita }
  }

  it('la tappa senza fase, o con una d’altri, va nella prima del progetto', async () => {
    const { prima, pianoVivo, tappe } = await inDueFasi()
    assert.deepEqual(tappe().map((a) => a.faseProgettoId), [prima.id, 'fsp-collaudo'])
    await riuscita('piani.salva', {
      piano: { ...pianoVivo(), attivita: [{ ...tappe()[1], faseProgettoId: 'fsp-straniera' }] },
    })
    assert.equal(tappe()[0].faseProgettoId, prima.id)
  })

  it('una fase rinominata senza id tiene il suo; omesse, restano quelle di prima', async () => {
    const { progetto, tappe } = await inDueFasi()
    const fasi = progettoPerId(progetto.id).fasi
    await riuscita('progetti.salva', {
      progetto: { ...progettoPerId(progetto.id), fasi: [fasi[0], { titolo: 'collaudo ' }] },
    })
    assert.equal(progettoPerId(progetto.id).fasi[1].id, 'fsp-collaudo')
    const { fasi: _via, ...senzaFasi } = progettoPerId(progetto.id)
    await riuscita('progetti.salva', { progetto: { ...senzaFasi, titolo: 'Rinominato' } })
    assert.equal(progettoPerId(progetto.id).fasi.length, 2)
    assert.equal(tappe()[1].faseProgettoId, 'fsp-collaudo')
  })

  it('togliere una fase porta le sue tappe in quella che la precedeva, e lo dice', async () => {
    const { progetto, prima, tappe } = await inDueFasi()
    const esito = await riuscita('progetti.salva', { progetto: { ...progettoPerId(progetto.id), fasi: [prima] } })
    assert.match(esito.messaggio?.testo ?? JSON.stringify(esito), /1 tappa/)
    assert.deepEqual(tappe().map((a) => a.faseProgettoId), [prima.id, prima.id])
  })

  it('senza fasi, o con una fase senza titolo, non si salva', async () => {
    const { progetto } = await inDueFasi()
    await rifiutata('progetti.salva', { progetto: { ...progettoPerId(progetto.id), fasi: [] } })
    await rifiutata('progetti.salva', {
      progetto: { ...progettoPerId(progetto.id), fasi: [{ id: 'fsp-x', titolo: '  ' }] },
    })
  })

  it('la lettura dà fase per fase periodo, tappe e quota, e le presenze di chi frequenta', async () => {
    const { progetto, pianoVivo, tappe } = await inDueFasi()
    const ora = api.creaLezione(corso.id, '2026-10-05', '08:20', 45)
    ora.pianoId = pianoVivo().id
    ora.avanzamento = [{ attivitaId: tappe()[0].id, titolo: 'Rilievo', stato: 'svolta' }]
    archivio.modifica((r) => { r.lezioni.push(ora) }, ['lezioni'])
    const letto = await riuscita('progetti.leggi', { progettoId: progetto.id, corsoId: corso.id })
    const [voce] = letto.dati.progetti
    assert.deepEqual(voce.fasi.map((f) => [f.titolo, f.inizio, f.quota, f.tappe.map((a) => a.stato)]), [
      ['Fase 1', '2026-10-05', 1, ['svolta']],
      ['Collaudo', '2026-10-05', 0, ['da-fare']],
    ])
    assert.equal(voce.quota, 0.5)
    // Chi frequenta: la ritirata no.
    assert.deepEqual(voce.presenze.map((p) => p.allievoId).sort(), [rossi.id, bianchi.id].sort())
  })
})
