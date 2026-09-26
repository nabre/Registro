// `ha` e `senza`: la presenza e l'assenza di un valore, sulle tre letture che
// li hanno. Si prova che dicano **vuoto** dove vuoto vuol dire vuoto:
//
//   1. un telefono senza numero non è un telefono;
//   2. un indirizzo con la via vuota non è un indirizzo;
//   3. un `pianoId` che punta a un piano sparito non è un piano;
//   4. un appello tutto a «non-impostato» è un'ora senza appello.
//
// E un filtro che non trova nessuno torna un elenco vuoto con i conti pieni,
// non un errore.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-valori-')

const DAL = '2026-09-01'
const AL = '2027-06-30'
/** Il piano che il registro ha perso: `pianoId` punta a niente. */
const PIANO_FANTASMA = 'pia-inesistente-0001'

let api
let archivio
let classe
let corso
/** Ha tutto: è la riga che nessun filtro «senza» deve mai prendere. */
let completa
/** Ha i telefoni e nient'altro: è la lista delle telefonate da fare. */
let soloTelefono
/** Ha le caselle aperte e vuote: un telefono senza cifre, un indirizzo senza via. */
let nuda

/** L'ora raccontata: argomento, materiali, consuntivo, aula, piano e appello. */
let raccontata
/** L'ora muta: nessuna delle sei caselle. */
let muta
/** L'ora con la scaletta perduta: dice di avere un piano che non c'è. */
let orfana

/** La prova corretta, descritta e riconsegnata. */
let finita
/** La prova con le righe aperte e nessun voto messo. */
let daCorreggere
/** La prova corretta e mai restituita: la pila che resta sulla scrivania. */
let inMano
let aMeta

/** Chi risponde a `persone.cerca` con quei filtri, per cognome. */
async function cognomiCon (ingresso) {
  const esito = await api.chiama(archivio, 'persone.cerca', ingresso)
  assert.equal(esito.ok, true, JSON.stringify(esito))
  return { esito, cognomi: esito.dati.persone.map((p) => p.cognome).sort() }
}

/** Gli id delle ore che passano quei filtri. */
async function oreCon (ingresso) {
  const esito = await api.chiama(archivio, 'ore.elenco', ingresso)
  assert.equal(esito.ok, true, JSON.stringify(esito))
  return { esito, id: esito.dati.ore.map((o) => o.id).sort() }
}

/** I titoli delle prove che passano quei filtri. */
async function proveCon (ingresso) {
  const esito = await api.chiama(archivio, 'valutazioni.elenco', ingresso)
  assert.equal(esito.ok, true, JSON.stringify(esito))
  return { esito, titoli: esito.dati.momenti.map((m) => m.titolo).sort() }
}

/**
 * Una scrittura del corredo che deve riuscire: con la sola `chiama` un rifiuto
 * passerebbe zitto e le prove dopo leggerebbero un elenco più corto.
 */
async function scrivi (nome, ingresso) {
  const esito = await api.chiama(archivio, nome, ingresso)
  assert.equal(esito.ok, true, `${nome}: ${JSON.stringify(esito)}`)
  return esito
}

before(async () => {
  // PDF automatici fermi: qui si provano dei filtri.
  ;({ api, archivio } = await archivioDiProva({
    lavoro,
    dati,
    dal: DAL,
    al: AL,
    pdfAutomatici: 'mai',
  }))

  const {
    creaAllievo, creaClasse, creaCorso, creaLezione, creaMateria,
    creaPiano, creaValutazione,
  } = api

  const annoId = archivio.registro.anni[0].id

  classe = creaClasse(annoId, 'I MEC A')

  completa = creaAllievo('Rossi', 'Maria')
  completa.email = 'maria.rossi@esempio.ch'
  completa.emailTutore = 'tutore.rossi@esempio.ch'
  completa.emailDatore = 'capo@officina.ch'
  completa.telefoni = [
    { id: 'tel-prova-0001', contatto: 'pif', etichetta: 'cellulare', numero: '079 000 00 01' },
  ]
  completa.indirizzo = { via: 'Via Campagna 2', cap: '6500', localita: 'Bellinzona' }
  completa.azienda = 'Officina Meccanica SA'
  completa.dataNascita = '2008-03-14'
  completa.foto = 'classi/i-mec-a/rossi.jpg'

  soloTelefono = creaAllievo('Bianchi', 'Luca')
  soloTelefono.telefoni = [
    {
      id: 'tel-prova-0002',
      contatto: 'rappresentante',
      etichetta: 'casa',
      numero: '091 000 00 02',
    },
  ]

  // Le caselle aperte e mai riempite: telefono senza cifre, indirizzo con la sola
  // località.
  nuda = creaAllievo('Neri', 'Ugo')
  nuda.telefoni = [
    { id: 'tel-prova-0003', contatto: 'datore', etichetta: 'centralino', numero: '   ' },
  ]
  nuda.indirizzo = { via: '', cap: '6600', localita: 'Locarno' }

  classe.allievi.push(completa, soloTelefono, nuda)

  const matematica = creaMateria('Matematica')
  corso = creaCorso(classe.id, matematica.id, 'I MEC A — Matematica')
  corso.orario = []

  raccontata = creaLezione(corso.id, '2026-09-01', '08:20', 90)
  raccontata.argomenti = 'Le frazioni equivalenti'
  raccontata.materiali = 'fotocopie'
  raccontata.consuntivo = 'Finito in tempo'
  raccontata.aula = 'A12'

  muta = creaLezione(corso.id, '2026-09-08', '08:20', 90)
  orfana = creaLezione(corso.id, '2026-09-15', '08:20', 90)

  archivio.modifica((r) => {
    r.classi.push(classe)
    r.materie.push(matematica)
    r.corsi.push(corso)
    r.lezioni.push(raccontata, muta, orfana)
  }, ['classi', 'corsi', 'lezioni', 'registro'])

  // Il piano vero, assegnato dalla procedura come lo scriverebbe il registro.
  const piano = creaPiano(corso.id)
  piano.obiettivi = ['Riconoscere le frazioni equivalenti']
  await scrivi('piani.salva', { piano })

  // L'appello su una sola delle tre ore: le altre restano bianche.
  await scrivi('ore.appello.riga', {
    lezioneId: raccontata.id, allievoId: completa.id, stato: 'presente',
  })

  archivio.modifica((r) => {
    r.lezioni.find((l) => l.id === raccontata.id).pianoId = piano.id
    // La scaletta perduta, messa per ultima così che nient'altro la cancelli.
    r.lezioni.find((l) => l.id === orfana.id).pianoId = PIANO_FANTASMA
  }, ['lezioni'])

  finita = creaValutazione(corso.id, 'Verifica sulle frazioni', undefined, '2026-09-20')
  finita.descrizione = 'Quattro esercizi sulle frazioni equivalenti'
  finita.voti = [
    { allievoId: completa.id, valore: 5, assente: false, riconsegnataIl: '2026-09-25' },
    { allievoId: soloTelefono.id, valore: 4, assente: false, riconsegnataIl: '2026-09-25' },
  ]
  await scrivi('valutazioni.salva', { valutazione: finita })

  // Righe sì, voti no: consegnata e non corretta, `voti` la legge vuota.
  daCorreggere = creaValutazione(corso.id, 'Test sulle potenze', undefined, '2026-10-05')
  daCorreggere.voti = [
    { allievoId: completa.id, valore: null, assente: false },
    { allievoId: soloTelefono.id, valore: null, assente: false },
  ]
  await scrivi('valutazioni.salva', { valutazione: daCorreggere })

  inMano = creaValutazione(corso.id, 'Compito sulle radici', undefined, '2026-11-10')
  inMano.voti = [{ allievoId: completa.id, valore: 5, assente: false }]
  await scrivi('valutazioni.salva', { valutazione: inMano })

  // Riconsegnata a metà: un foglio tornato, l'altro ancora in mano. Resta nella
  // pila da smaltire.
  aMeta = creaValutazione(corso.id, 'Prova sui polinomi', undefined, '2026-11-20')
  aMeta.voti = [
    { allievoId: completa.id, valore: 5, assente: false, riconsegnataIl: '2026-11-25' },
    { allievoId: soloTelefono.id, valore: 4, assente: false },
  ]
  await scrivi('valutazioni.salva', { valutazione: aMeta })
})

after(() => smonta(radice, archivio))

describe('persone.cerca sa dire chi non ha un recapito', () => {
  // Un filtro che non filtra risponde comunque qualcosa di plausibile: qui si
  // guarda chi esce.
  it('chi non ha e-mail sono le due che non ce l’hanno, e non l’altra', async () => {
    const { cognomi } = await cognomiCon({ senza: ['email'] })
    assert.deepEqual(cognomi, ['Bianchi', 'Neri'])
  })

  // I due filtri si compongono: «chi va chiamato invece che scritto» in una
  // chiamata.
  it('chi ha il telefono ma non l’e-mail è la lista delle telefonate', async () => {
    const { cognomi } = await cognomiCon({ ha: ['telefono'], senza: ['email'] })
    assert.deepEqual(cognomi, ['Bianchi'])
  })

  // La riga di rubrica aperta e mai compilata non conta come telefono.
  it('un numero di telefono fatto di spazi non è un telefono', async () => {
    const { cognomi } = await cognomiCon({ senza: ['telefono'] })
    assert.deepEqual(cognomi, ['Neri'])
  })

  // Un `Indirizzo` con la sola località non è un indirizzo.
  it('un indirizzo con la via vuota non è un indirizzo', async () => {
    const { cognomi } = await cognomiCon({ senza: ['indirizzo'] })
    assert.deepEqual(cognomi, ['Bianchi', 'Neri'])
  })

  // `ha` vuole tutti i campi pieni, non almeno uno: ogni voce in più restringe.
  it('chiedere otto campi pieni lascia solo chi li ha tutti e otto', async () => {
    const { cognomi } = await cognomiCon({
      ha: ['email', 'emailTutore', 'emailDatore', 'telefono',
        'indirizzo', 'azienda', 'dataNascita', 'foto'],
    })
    assert.deepEqual(cognomi, ['Rossi'])
  })

  // La busta dice su che cosa ha risposto.
  it('la busta rimanda i campi chiesti pieni e quelli chiesti vuoti', async () => {
    const { esito } = await cognomiCon({ ha: ['telefono'], senza: ['email'] })
    assert.deepEqual(esito.dati.ha, ['telefono'])
    assert.deepEqual(esito.dati.senza, ['email'])
  })

  // Senza filtri, elenchi vuoti e non nulli.
  it('senza filtri la busta rimanda due elenchi vuoti', async () => {
    const { esito } = await cognomiCon({})
    assert.deepEqual(esito.dati.ha, [])
    assert.deepEqual(esito.dati.senza, [])
  })
})

describe('un filtro che non trova nessuno è una risposta, non un errore', () => {
  // Lo stesso campo pieno e vuoto insieme non trova niente: elenco vuoto con i
  // conti in ordine, non un errore. «Zero trovate» accanto a «tre nel registro»
  // impedisce di concludere «non c'è nessuno».
  it('persone.cerca torna elenco vuoto, quante a zero e il registro pieno', async () => {
    const { esito, cognomi } = await cognomiCon({ ha: ['foto'], senza: ['foto'] })
    assert.deepEqual(cognomi, [])
    assert.equal(esito.dati.quante, 0)
    assert.equal(esito.dati.troncato, false)
    assert.equal(esito.dati.ancora, 0)
    assert.equal(esito.dati.inRegistro, 3)
    // Il suggerimento dice che nel registro c'è gente, e che sono i filtri.
    assert.match(esito.dati.suggerimento, /3/)
  })

  it('ore.elenco e valutazioni.elenco fanno lo stesso', async () => {
    const ore = await oreCon({ ha: ['aula'], senza: ['aula'] })
    assert.deepEqual(ore.id, [])
    assert.equal(ore.esito.dati.quante, 0)
    assert.equal(ore.esito.dati.troncato, false)

    const prove = await proveCon({ ha: ['voti'], senza: ['voti'] })
    assert.deepEqual(prove.titoli, [])
    assert.equal(prove.esito.dati.quante, 0)
    assert.equal(prove.esito.dati.troncato, false)
  })

  // Il suggerimento nomina il filtro che ha svuotato l'elenco: se sono «ha» e
  // «senza», rimandare a togliere «cerca» darebbe di nuovo zero.
  it('il suggerimento nomina i campi chiesti e non incolpa «cerca»', async () => {
    const { esito, cognomi } = await cognomiCon({ cerca: 'rossi', senza: ['email'] })
    assert.deepEqual(cognomi, [])
    assert.match(esito.dati.suggerimento, /«email»/)
    assert.doesNotMatch(esito.dati.suggerimento, /senza «cerca» per averle tutte/)
  })

  // Un campo fuori elenco è un ingresso storto, non un filtro che non trova.
  it('un campo inventato è un ingresso rifiutato, non zero righe', async () => {
    const esito = await api.chiama(archivio, 'persone.cerca', { senza: ['telefax'] })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'ingresso-non-valido')
  })

  // Un elenco vuoto si rifiuta: «non filtrare» si dice non passando il campo.
  it('un elenco di campi vuoto è un ingresso rifiutato', async () => {
    const esito = await api.chiama(archivio, 'persone.cerca', { ha: [] })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'ingresso-non-valido')
  })

  // L'id inventato resta «non c'è», non un elenco vuoto.
  it('valutazioni.elenco con un corso inventato dice ancora «non c’è»', async () => {
    const esito = await api.chiama(archivio, 'valutazioni.elenco', {
      corsoId: 'cor-inventato-0001', senza: ['voti'],
    })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'non-trovato')
  })
})

describe('ore.elenco sa dire quali ore non raccontano niente', () => {
  // «Quali ore non dicono che cosa si è fatto».
  it('le ore senza argomento sono le due che nessuno ha raccontato', async () => {
    const { id } = await oreCon({ senza: ['argomenti'] })
    assert.deepEqual(id, [muta.id, orfana.id].sort())
  })

  it('l’ora raccontata ha argomento, materiali, consuntivo e aula', async () => {
    const { id } = await oreCon({ ha: ['argomenti', 'materiali', 'consuntivo', 'aula'] })
    assert.deepEqual(id, [raccontata.id])
  })

  // Un `pianoId` che non punta a niente non conta come piano.
  it('un piano che non esiste più non conta come piano', async () => {
    const con = await oreCon({ ha: ['piano'] })
    assert.deepEqual(con.id, [raccontata.id])
    const senza = await oreCon({ senza: ['piano'] })
    assert.deepEqual(senza.id, [muta.id, orfana.id].sort())
  })

  // Un appello tutto a «non-impostato» non è un appello fatto.
  it('un’ora su cui nessuno ha spuntato niente è un’ora senza appello', async () => {
    const con = await oreCon({ ha: ['appello'] })
    assert.deepEqual(con.id, [raccontata.id])
    assert.equal(con.esito.dati.ore[0].conAppello, true)
    const senza = await oreCon({ senza: ['appello'] })
    assert.deepEqual(senza.id, [muta.id, orfana.id].sort())
  })

  // Con l'appello ma senza argomento: il lavoro arretrato.
  it('con l’appello ma senza argomento sono le ore da riprendere', async () => {
    const { id } = await oreCon({ ha: ['appello'], senza: ['argomenti'] })
    assert.deepEqual(id, [])
  })

  it('la busta delle ore rimanda i campi chiesti', async () => {
    const { esito } = await oreCon({ senza: ['argomenti', 'aula'] })
    assert.deepEqual(esito.dati.senza, ['argomenti', 'aula'])
    assert.deepEqual(esito.dati.ha, [])
  })
})

describe('valutazioni.elenco sa dire che cosa manca a una prova', () => {
  // Righe senza voti: prove ancora da correggere.
  it('le prove senza voti sono quelle con le righe ancora aperte', async () => {
    const { titoli } = await proveCon({ senza: ['voti'] })
    assert.deepEqual(titoli, ['Test sulle potenze'])
  })

  // La pila sulla scrivania: resta almeno un foglio da restituire. La data sta
  // sul voto e non sulla prova, quindi anche la prova riconsegnata **a metà** è
  // nella pila.
  it('le prove con dei fogli ancora in mano sono la pila da smaltire', async () => {
    const { titoli } = await proveCon({ ha: ['voti', 'daRiconsegnare'] })
    assert.deepEqual(titoli, ['Compito sulle radici', 'Prova sui polinomi'])
  })

  // Con «almeno un foglio tornato» la prova a metà sparirebbe dalla pila mentre
  // la busta dice «daRiconsegnare: 1»: filtro e numero devono concordare.
  it('una prova riconsegnata a metà resta nella pila, e la busta lo conferma', async () => {
    const { esito, titoli } = await proveCon({ ha: ['daRiconsegnare'] })
    assert.ok(titoli.includes('Prova sui polinomi'))
    const riga = esito.dati.momenti.find((m) => m.titolo === 'Prova sui polinomi')
    assert.equal(riga.daRiconsegnare, 1, 'un foglio è ancora in mano a chi insegna')
  })

  it('le prove chiuse sono quelle con tutti i fogli tornati', async () => {
    const { titoli } = await proveCon({ ha: ['voti'], senza: ['daRiconsegnare'] })
    assert.deepEqual(titoli, ['Verifica sulle frazioni'])
  })

  // Descrizione, allegati e recuperi: solo una prova del corredo li riempie.
  it('senza descrizione, allegati e recuperi restano le due prove spoglie', async () => {
    const { titoli } = await proveCon({ senza: ['descrizione', 'allegati', 'recuperi'] })
    assert.deepEqual(titoli, ['Compito sulle radici', 'Prova sui polinomi', 'Test sulle potenze'])
  })

  it('la busta delle prove rimanda i campi chiesti', async () => {
    const { esito } = await proveCon({ ha: ['voti'], senza: ['daRiconsegnare'] })
    assert.deepEqual(esito.dati.ha, ['voti'])
    assert.deepEqual(esito.dati.senza, ['daRiconsegnare'])
  })
})

// La zona anche in «persone.cerca»: senza i campi nello schema, `oggetto()` li
// scarterebbe e tornerebbero tutti.
describe('persone.cerca guarda anche la zona', () => {
  it('il comune filtra, e non guarda accenti né maiuscole', async () => {
    const tutte = await api.chiama(archivio, 'persone.cerca', {})
    assert.ok(tutte.dati.persone.length > 1, 'la prova vuole più di una persona')

    const esito = await api.chiama(archivio, 'persone.cerca', { comune: 'LUGANO' })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.ok(esito.dati.persone.length < tutte.dati.persone.length, 'il filtro deve stringere')
    assert.ok(esito.dati.persone.every((p) => p.nomeCompleto !== ''))
    // La busta dice su che cosa ha risposto, come per «cerca».
    assert.equal(esito.dati.comune, 'LUGANO')
  })

  it('il comune si confronta intero: «Lugano» non prende «Luganello»', async () => {
    const esito = await api.chiama(archivio, 'persone.cerca', { comune: 'Lugan' })
    assert.deepEqual(esito.dati.persone, [], 'un confronto a pezzi sarebbe una ricerca')
    // Ma il registro non è vuoto, e la busta lo dice (`inRegistro`).
    assert.ok(esito.dati.inRegistro > 0)
  })

  it('il NAP filtra per prefisso: «69» è la zona, «6900» è la città', async () => {
    const zona = await api.chiama(archivio, 'persone.cerca', { cap: '69' })
    const citta = await api.chiama(archivio, 'persone.cerca', { cap: '6900' })
    assert.ok(zona.dati.persone.length >= citta.dati.persone.length)
    assert.equal(zona.dati.cap, '69')
  })
})
