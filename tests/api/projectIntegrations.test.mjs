// Le integrazioni dei progetti quando i corsi cambiano sotto di loro:
//
//   - `materie.unisci` fonde due corsi della stessa classe: se lo stesso
//     progetto è integrato in tutti e due, ne resta un'integrazione sola, sul
//     corso superstite, con i compiti, i giudizi e le celle di entrambe; della
//     stessa casella (persona, criterio, giorno senza ora) vale quella del
//     superstite;
//   - `classi.duplica` dà al corso copiato un'integrazione nuova dello stesso
//     progetto, in bozza, con i compiti (id nuovi) e senza quel che è delle
//     persone o delle ore; l'originale resta com'era.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-integrazioni-progetti-')

let api
let archivio
let annoId
let classe
let rossi
let bianchi

const chiama = (nome, ingresso) => api.chiama(archivio, nome, ingresso)
const progettoPerId = (id) => archivio.registro.progetti.find((p) => p.id === id)
const integrazioneIn = (progettoId, corsoId) =>
  progettoPerId(progettoId)?.integrazioni.find((i) => i.corsoId === corsoId)

/** Una chiamata che deve riuscire. */
async function riuscita (nome, ingresso) {
  const esito = await chiama(nome, ingresso)
  assert.equal(esito.ok, true, JSON.stringify(esito))
  return esito
}

/** Un corso nuovo della classe, con una materia sua e un'ora. */
function nuovoCorso (nomeMateria, data, ora = '08:20') {
  const materia = api.creaMateria(nomeMateria)
  const corso = api.creaCorso(classe.id, materia.id, `I MEC A — ${nomeMateria}`)
  const lezione = api.creaLezione(corso.id, data, ora, 45)
  archivio.modifica((r) => {
    r.materie.push(materia)
    r.corsi.push(corso)
    r.lezioni.push(lezione)
  }, ['registro', 'corsi', 'lezioni'])
  return { materia, corso, lezione }
}

/** Un'altra ora di un corso. */
function nuovaOra (corsoId, data, ora) {
  const lezione = api.creaLezione(corsoId, data, ora, 45)
  archivio.modifica((r) => {
    r.lezioni.push(lezione)
  }, ['lezioni'])
  return lezione
}

/** Un progetto dell'anno con un criterio, ancora in nessun corso. */
async function nuovoProgetto (titolo) {
  const { integrazioni: _nessuna, ...progetto } = api.creaProgetto(null, titolo)
  progetto.criteri = [{ id: 'crp-a', titolo: 'Precisione' }]
  await riuscita('progetti.salva', { progetto })
  return progetto
}

/** Integra il progetto nel corso e ci scrive un compito, un giudizio e celle. */
async function lavoroNelCorso (progettoId, corsoId, lezione, { compito, giudizio, celle }) {
  await riuscita('progetti.integra', { progettoId, corsoId })
  const fatto = await riuscita('progetti.compito.salva', {
    progettoId, corsoId, compito: { titolo: compito, fine: null, fineLezioneId: lezione.id },
  })
  await riuscita('progetti.compito.fatto', {
    progettoId, corsoId, compitoId: fatto.dati.creato.id, allievoId: rossi.id, fatto: true,
  })
  await riuscita('progetti.giudizio.salva', {
    progettoId, corsoId, giudizio: { allievoId: rossi.id, testo: giudizio, lezioneId: lezione.id },
  })
  for (const cella of celle) {
    await riuscita('progetti.cella', { progettoId, corsoId, allievoId: rossi.id, criterioId: 'crp-a', ...cella })
  }
  return fatto.dati.creato.id
}

before(async () => {
  ;({ api, archivio } = await archivioDiProva({ lavoro, dati, pdfAutomatici: 'mai' }))
  annoId = archivio.registro.anni[0].id
  classe = api.creaClasse(annoId, 'I MEC A')
  rossi = api.creaAllievo('Rossi', 'Maria')
  bianchi = api.creaAllievo('Bianchi', 'Luca')
  classe.allievi.push(rossi, bianchi)
  archivio.modifica((r) => {
    r.classi.push(classe)
  }, ['classi'])
})

after(() => smonta(radice, archivio))

describe('materie.unisci e le integrazioni dei progetti', () => {
  it('due integrazioni dello stesso progetto diventano una, con il lavoro di entrambe', async () => {
    const tiene = nuovoCorso('Tecnologia', '2026-09-15')
    const sparisce = nuovoCorso('Tecno', '2026-09-16')
    const progetto = await nuovoProgetto('Ponte')
    const compitoTiene = await lavoroNelCorso(progetto.id, tiene.corso.id, tiene.lezione, {
      compito: 'Disegno',
      giudizio: 'Attenta',
      celle: [
        { lezioneId: tiene.lezione.id, livello: 'parziale' },
        { data: '2026-10-01', livello: 'raggiunto' },
      ],
    })
    const compitoSparisce = await lavoroNelCorso(progetto.id, sparisce.corso.id, sparisce.lezione, {
      compito: 'Modello',
      giudizio: 'Precisa',
      celle: [
        { lezioneId: sparisce.lezione.id, livello: 'pienamente' },
        // La stessa casella di una del superstite: vale quella.
        { data: '2026-10-01', livello: 'parziale', nota: 'Del doppione' },
      ],
    })
    await riuscita('progetti.integrazione.stato', { progettoId: progetto.id, corsoId: tiene.corso.id, stato: 'in-corso' })

    await riuscita('materie.unisci', { daId: sparisce.materia.id, aId: tiene.materia.id })

    assert.ok(!archivio.registro.corsi.some((c) => c.id === sparisce.corso.id), 'il doppione è rimasto')
    const integrazioni = progettoPerId(progetto.id).integrazioni
    assert.deepEqual(integrazioni.map((i) => [i.corsoId, i.stato]), [[tiene.corso.id, 'in-corso']])
    const [fusa] = integrazioni
    assert.deepEqual(fusa.compiti.map((c) => [c.id, c.titolo]), [[compitoTiene, 'Disegno'], [compitoSparisce, 'Modello']])
    // Le spunte e le ore passano con i compiti: le ore del doppione ora sono del superstite.
    assert.deepEqual(
      fusa.compiti.map((c) => c.fatti.map((f) => f.allievoId)),
      [[rossi.id], [rossi.id]],
    )
    assert.equal(fusa.compiti[1].fineLezioneId, sparisce.lezione.id)
    const spostata = archivio.registro.lezioni.find((l) => l.id === sparisce.lezione.id)
    assert.equal(spostata.corsoId, tiene.corso.id)
    assert.deepEqual(fusa.giudizi.map((g) => [g.testo, g.lezioneId]), [
      ['Attenta', tiene.lezione.id],
      ['Precisa', sparisce.lezione.id],
    ])
    assert.deepEqual(fusa.matrice.map((c) => [c.data, c.lezioneId, c.livello, c.nota]), [
      [tiene.lezione.data, tiene.lezione.id, 'parziale', undefined],
      ['2026-10-01', null, 'raggiunto', undefined],
      [sparisce.lezione.data, sparisce.lezione.id, 'pienamente', undefined],
    ])
    // Il lavoro fuso si legge dal corso superstite.
    const letto = (await riuscita('progetti.leggi', { progettoId: progetto.id, corsoId: tiene.corso.id })).dati.progetti
    assert.deepEqual(letto.map((p) => p.compiti.length), [2])
  })

  it('due celle dello stesso giorno, in ore diverse o una senza ora, restano una: quella del superstite', async () => {
    // «Un giorno, una cella» (`celleDi`): la casella è il giorno, non l'ora.
    const tiene = nuovoCorso('Fisica', '2026-09-22')
    const sparisce = nuovoCorso('Fisica applicata', '2026-09-22', '10:00')
    const oraSparisce = nuovaOra(sparisce.corso.id, '2026-09-23', '10:00')
    const progetto = await nuovoProgetto('Leva')
    await lavoroNelCorso(progetto.id, tiene.corso.id, tiene.lezione, {
      compito: 'Misura',
      giudizio: 'Attenta',
      celle: [
        { lezioneId: tiene.lezione.id, livello: 'parziale' },
        { data: '2026-09-23', livello: 'raggiunto' },
      ],
    })
    await lavoroNelCorso(progetto.id, sparisce.corso.id, sparisce.lezione, {
      compito: 'Calcolo',
      giudizio: 'Precisa',
      celle: [
        { lezioneId: sparisce.lezione.id, livello: 'pienamente' },
        { lezioneId: oraSparisce.id, livello: 'parziale' },
      ],
    })

    await riuscita('materie.unisci', { daId: sparisce.materia.id, aId: tiene.materia.id })

    const [fusa] = progettoPerId(progetto.id).integrazioni
    assert.deepEqual(fusa.matrice.map((c) => [c.data, c.lezioneId, c.livello]), [
      ['2026-09-22', tiene.lezione.id, 'parziale'],
      ['2026-09-23', null, 'raggiunto'],
    ])
  })

  it('l’integrazione del solo doppione passa al superstite così com’è', async () => {
    const tiene = nuovoCorso('Disegno', '2026-09-17')
    const sparisce = nuovoCorso('Disegno tecnico', '2026-09-18')
    const progetto = await nuovoProgetto('Plastico')
    const compito = await lavoroNelCorso(progetto.id, sparisce.corso.id, sparisce.lezione, {
      compito: 'Sezione', giudizio: 'Ordinata', celle: [{ lezioneId: sparisce.lezione.id, livello: 'raggiunto' }],
    })
    const prima = structuredClone(integrazioneIn(progetto.id, sparisce.corso.id))

    await riuscita('materie.unisci', { daId: sparisce.materia.id, aId: tiene.materia.id })

    assert.deepEqual(
      progettoPerId(progetto.id).integrazioni,
      [{ ...prima, corsoId: tiene.corso.id }],
    )
    assert.equal(prima.compiti[0].id, compito)
  })
})

describe('classi.duplica e le integrazioni dei progetti', () => {
  it('il corso copiato ha un’integrazione nuova dello stesso progetto, senza il lavoro con le persone', async () => {
    const origine = nuovoCorso('Fisica', '2026-09-21')
    const progetto = await nuovoProgetto('Leve')
    const compito = await lavoroNelCorso(progetto.id, origine.corso.id, origine.lezione, {
      compito: 'Misure', giudizio: 'Curiosa', celle: [{ lezioneId: origine.lezione.id, livello: 'parziale' }],
    })
    await riuscita('progetti.integrazione.stato', { progettoId: progetto.id, corsoId: origine.corso.id, stato: 'in-corso' })
    const originale = structuredClone(integrazioneIn(progetto.id, origine.corso.id))
    const progetti = archivio.registro.progetti.length

    const copia = await riuscita('classi.duplica', { classeId: classe.id, annoId, nome: 'II MEC A' })

    const corsoCopia = archivio.registro.corsi.find(
      (c) => c.classeId === copia.dati.creato.id && c.materiaId === origine.materia.id,
    )
    assert.ok(corsoCopia, 'la copia non ha il corso')
    assert.notEqual(corsoCopia.id, origine.corso.id)
    assert.equal(archivio.registro.progetti.length, progetti, 'duplicare ha fatto un progetto nuovo')
    const vivo = progettoPerId(progetto.id)
    assert.deepEqual(vivo.integrazioni.map((i) => i.corsoId), [origine.corso.id, corsoCopia.id])
    // L'originale non cambia.
    assert.deepEqual(integrazioneIn(progetto.id, origine.corso.id), originale)
    const nuova = integrazioneIn(progetto.id, corsoCopia.id)
    assert.notEqual(nuova, integrazioneIn(progetto.id, origine.corso.id))
    assert.equal(nuova.stato, 'bozza')
    assert.deepEqual([nuova.giudizi, nuova.matrice], [[], []])
    const [nuovoCompito] = nuova.compiti
    assert.equal(nuova.compiti.length, 1)
    assert.notEqual(nuovoCompito.id, compito)
    // La fine si stacca dall'ora dell'altro corso e tiene il suo giorno.
    assert.deepEqual(
      [nuovoCompito.titolo, nuovoCompito.fine, nuovoCompito.fineLezioneId],
      ['Misure', origine.lezione.data, null],
    )
    assert.deepEqual([nuovoCompito.inizi, nuovoCompito.proroghe, nuovoCompito.fatti], [[], [], []])
    // Il lavoro nella copia è suo: scriverci non tocca l'originale.
    await riuscita('progetti.compito.salva', {
      progettoId: progetto.id, corsoId: corsoCopia.id, compito: { titolo: 'Solo nella copia', fine: null },
    })
    assert.equal(integrazioneIn(progetto.id, corsoCopia.id).compiti.length, 2)
    assert.deepEqual(integrazioneIn(progetto.id, origine.corso.id), originale)
  })
})
