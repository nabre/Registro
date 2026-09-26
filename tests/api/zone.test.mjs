// La zona geografica: chi abita dove, e chi sta vicino alla sede.
//
//   1. **Il comune** si confronta con `normalizzaTesto` («bre» trova «Brè») ma
//      **intero** («Lug» non è Lugano).
//   2. **Il NAP** si confronta per prefisso: «69» è il Luganese.
//   3. **Chi non è collocato** resta nell'elenco; solo `entroKm` lo lascia
//      fuori, e la busta dice quanti.
//
// Coordinate scritte a mano, non da `mappa.geocodifica`: niente rete.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

// Dal bundle del dominio: funzioni pure, e riscriverle qui proverebbe altro.
import {
  chiaveIndirizzo,
  scriviCoordinate,
  scriviIndirizzo,
  SEDE,
} from '../../dist-tests/domain.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-zona-')

const DAL = '2026-09-01'
const AL = '2027-06-30'

let api
let archivio
let classe
let altra
let archiviata
/** Ritirata, con l'indirizzo scritto: la riga che sparisce senza dirlo. */
let zorzi
/** A Canobbio, a due passi dalla sede: il vicino. */
let rossi
/** A Bellinzona, una ventina di chilometri più su: il lontano. */
let bianchi
/** A Brè, con l'accento e senza coordinate: il non collocato. */
let verdi
/** A Lugano: serve a provare che «Lug» non prende «Lugano». */
let neri
/** Senza niente scritto: la casella vuota, che non è «manca sulla mappa». */
let gialli

/** Gli indirizzi delle cinque persone, nelle caselle in cui stanno. */
const INDIRIZZI = {
  rossi: { via: 'Via Trevano 12', cap: '6952', localita: 'Canobbio' },
  bianchi: { via: 'Viale Stazione 4', cap: '6500', localita: 'BELLINZONA' },
  verdi: { via: 'Via ai Monti 3', cap: '6979', localita: 'Brè' },
  neri: { via: 'Via Nassa 5', cap: '6900', localita: 'Lugano' },
  zorzi: { via: 'Via Cattori 2', cap: '6600', localita: 'Locarno' },
  gotti: { via: 'Corso San Gottardo 9', cap: '6830', localita: 'Chiasso' },
  aziendaRossi: { via: 'Via Industria 7', cap: '6528', localita: 'Camorino' },
}

/** I punti che il geocodificatore avrebbe trovato, se ci fosse stata la rete. */
const PUNTI = {
  // A un centinaio di metri dalla sede: dentro qualunque raggio che si chieda.
  rossi: { lat: 46.0310, lon: 8.9640 },
  // Bellinzona: una ventina di chilometri in linea d'aria da Trevano.
  bianchi: { lat: 46.1950, lon: 9.0250 },
  neri: { lat: 46.0030, lon: 8.9490 },
  aziendaRossi: { lat: 46.1620, lon: 9.0150 },
}

/** Una voce della rubrica, come la scriverebbe `mappa.geocodifica`. */
function collocazione (indirizzo, punto, extra = {}) {
  const riga = scriviIndirizzo(indirizzo)
  return {
    chiave: chiaveIndirizzo(riga),
    indirizzo: riga,
    lat: punto.lat,
    lon: punto.lon,
    trovatoIl: '2026-09-01T08:00:00.000Z',
    ...extra,
  }
}

/** Le righe di una busta di `mappa.elenco`, per nome e genere. */
function riga (esito, nomeCompleto, genere = 'domicilio') {
  return esito.dati.indirizzi.find(
    (voce) => voce.nomeCompleto === nomeCompleto && voce.genere === genere,
  )
}

/** I nomi che una busta di `mappa.elenco` contiene, in ordine di busta. */
function nomi (esito) {
  return esito.dati.indirizzi.map((voce) => voce.nomeCompleto)
}

before(async () => {
  // PDF automatici fermi: qui si provano delle letture.
  ;({ api, archivio } = await archivioDiProva({
    lavoro,
    dati,
    dal: DAL,
    al: AL,
    pdfAutomatici: 'mai',
  }))

  const { creaAllievo, creaClasse } = api

  const annoId = archivio.registro.anni[0].id

  classe = creaClasse(annoId, 'I MEC A')
  rossi = creaAllievo('Rossi', 'Maria')
  rossi.indirizzo = { ...INDIRIZZI.rossi }
  rossi.azienda = 'Officina Camorino SA'
  rossi.indirizzoDatore = { ...INDIRIZZI.aziendaRossi }
  bianchi = creaAllievo('Bianchi', 'Luca')
  bianchi.indirizzo = { ...INDIRIZZI.bianchi }
  verdi = creaAllievo('Verdi', 'Anna')
  verdi.indirizzo = { ...INDIRIZZI.verdi }
  neri = creaAllievo('Neri', 'Ugo')
  neri.indirizzo = { ...INDIRIZZI.neri }
  gialli = creaAllievo('Gialli', 'Ivo')
  classe.allievi.push(rossi, bianchi, verdi, neri, gialli)

  // La seconda classe prova che `classeId` restringe davvero.
  altra = creaClasse(annoId, 'II MEC B')
  const bruni = creaAllievo('Bruni', 'Sara')
  bruni.indirizzo = { via: 'Via Motta 1', cap: '6900', localita: 'Lugano' }
  // Ritirata con l'indirizzo scritto: distingue «non frequenta più» da «non ha
  // l'indirizzo».
  zorzi = creaAllievo('Zorzi', 'Ada')
  zorzi.indirizzo = { ...INDIRIZZI.zorzi }
  zorzi.attivo = false
  // Una seconda ritirata: il conto va sull'insieme chiesto, non sulla classe.
  const fumagalli = creaAllievo('Fumagalli', 'Rea')
  fumagalli.attivo = false
  altra.allievi.push(bruni, zorzi, fumagalli)

  // Una classe archiviata, in un comune che non compare altrove: la busta conta
  // quel che lascia fuori.
  archiviata = creaClasse(annoId, 'III MEC C')
  archiviata.archiviata = true
  const gotti = creaAllievo('Gotti', 'Elia')
  gotti.indirizzo = { ...INDIRIZZI.gotti }
  archiviata.allievi.push(gotti)

  archivio.modifica((r) => {
    r.classi.push(classe, altra, archiviata)
  }, ['classi', 'registro'])

  // La rubrica scritta a mano. Verdi non c'è apposta: compare con lat e lon
  // nulli.
  archivio.modifica((r) => {
    r.coordinate.push(
      collocazione(INDIRIZZI.rossi, PUNTI.rossi),
      collocazione(INDIRIZZI.bianchi, PUNTI.bianchi),
      // Approssimato (centro del paese, non il portone): la busta lo dice.
      collocazione(INDIRIZZI.neri, PUNTI.neri, { approssimato: true, etichetta: 'Lugano, TI' }),
      collocazione(INDIRIZZI.aziendaRossi, PUNTI.aziendaRossi),
    )
  }, ['coordinate'])
})

after(() => smonta(radice, archivio))

describe('mappa.elenco: chi abita dove', () => {
  // L'elenco esce intero, domicili e posti di lavoro, e le caselle vuote sono un
  // conto, non righe.
  it('elenca un indirizzo per persona e uno per azienda, e conta le caselle vuote', async () => {
    const esito = await api.chiama(archivio, 'mappa.elenco', { classeId: classe.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    // Quattro domicili scritti su cinque persone, più l'unica azienda.
    assert.equal(esito.dati.quante, 5)
    assert.equal(esito.dati.guardate, 5)
    // Gialli non ha né casa né ditta, gli altri quattro non hanno la ditta: cinque
    // caselle vuote, nessuna è una riga.
    assert.equal(esito.dati.senzaIndirizzo, 5)
    assert.equal(nomi(esito).includes('Gialli Ivo'), false)
    assert.equal(riga(esito, 'Rossi Maria', 'lavoro').azienda, 'Officina Camorino SA')
    assert.equal(riga(esito, 'Rossi Maria', 'lavoro').localita, 'Camorino')
  })

  // L'indirizzo esce nelle sue caselle **e** nella riga composta: il NAP si
  // filtra e si ordina.
  it('dà la riga composta e insieme via, NAP e località', async () => {
    const esito = await api.chiama(archivio, 'mappa.elenco', {
      allievoId: rossi.id, genere: 'domicilio',
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const sua = riga(esito, 'Rossi Maria')
    assert.equal(sua.via, 'Via Trevano 12')
    assert.equal(sua.cap, '6952')
    assert.equal(sua.localita, 'Canobbio')
    assert.equal(sua.indirizzo, 'Via Trevano 12, 6952 Canobbio')
    assert.equal(sua.collocato, true)
    assert.equal(sua.lat, PUNTI.rossi.lat)
    assert.equal(sua.lon, PUNTI.rossi.lon)
  })

  it('il comune si trova senza accenti e senza maiuscole', async () => {
    const bre = await api.chiama(archivio, 'mappa.elenco', { comune: 'bre' })
    assert.equal(bre.ok, true, JSON.stringify(bre))
    assert.deepEqual(nomi(bre), ['Verdi Anna'])
    assert.equal(bre.dati.comune, 'bre')

    const bellinzona = await api.chiama(archivio, 'mappa.elenco', { comune: 'bellinzona' })
    assert.equal(bellinzona.ok, true, JSON.stringify(bellinzona))
    assert.deepEqual(nomi(bellinzona), ['Bianchi Luca'])
  })

  // Il comune si confronta intero: «Lug» non prende Lugano.
  it('un comune scritto a metà non prende niente', async () => {
    const esito = await api.chiama(archivio, 'mappa.elenco', { comune: 'Lug' })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.quante, 0)
    assert.deepEqual(esito.dati.indirizzi, [])
  })

  it('il NAP prende la zona quando è scritto a metà', async () => {
    const luganese = await api.chiama(archivio, 'mappa.elenco', {
      cap: '69', genere: 'domicilio', ordina: 'nome',
    })
    assert.equal(luganese.ok, true, JSON.stringify(luganese))
    // 6952 Canobbio, 6979 Brè, 6900 Lugano e la 6900 dell'altra classe: il
    // Luganese, senza Bellinzona.
    assert.deepEqual(nomi(luganese), ['Bruni Sara', 'Neri Ugo', 'Rossi Maria', 'Verdi Anna'])

    const citta = await api.chiama(archivio, 'mappa.elenco', { cap: '6900', classeId: classe.id })
    assert.equal(citta.ok, true, JSON.stringify(citta))
    assert.deepEqual(nomi(citta), ['Neri Ugo'])
  })

  // «Chi manca sulla mappa»: le righe senza coordinate restano.
  it('chi non è collocato compare lo stesso, con lat e lon nulli', async () => {
    const esito = await api.chiama(archivio, 'mappa.elenco', {
      classeId: classe.id, genere: 'domicilio',
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const sua = riga(esito, 'Verdi Anna')
    assert.equal(sua.collocato, false)
    assert.equal(sua.lat, null)
    assert.equal(sua.lon, null)
    assert.equal(sua.distanzaKm, null)
    // E la busta lo dice in cima: tre con il punto, una senza.
    assert.equal(esito.dati.collocati, 3)
    assert.equal(esito.dati.senzaCoordinate, 1)
    // In fondo: una distanza ignota non è zero.
    assert.equal(nomi(esito)[nomi(esito).length - 1], 'Verdi Anna')
  })

  it('«entro cinque chilometri» tiene il vicino e lascia fuori il lontano', async () => {
    const esito = await api.chiama(archivio, 'mappa.elenco', {
      classeId: classe.id, genere: 'domicilio', entroKm: 5,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    // Rossi a Canobbio e Neri a Lugano stanno dentro; Bianchi a Bellinzona no.
    assert.deepEqual(nomi(esito), ['Rossi Maria', 'Neri Ugo'])
    assert.equal(riga(esito, 'Rossi Maria').distanzaKm < 1, true)
    // Il punto da cui si misura si dichiara sempre.
    assert.equal(esito.dati.attorno, SEDE.nome)
    assert.equal(esito.dati.attornoLat, SEDE.lat)
    assert.equal(esito.dati.entroKm, 5)
    // Verdi resta fuori perché non si può giudicare, e la busta lo conta.
    assert.equal(esito.dati.senzaCoordinate, 1)
  })

  // Il raggio si misura dal punto chiesto, non sempre dalla scuola.
  it('con un punto chiesto il raggio si sposta, e il vicino diventa un altro', async () => {
    const esito = await api.chiama(archivio, 'mappa.elenco', {
      classeId: classe.id,
      genere: 'domicilio',
      entroKm: 5,
      attornoA: { lat: 46.1950, lon: 9.0250 },
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(nomi(esito), ['Bianchi Luca'])
    assert.equal(esito.dati.attorno, '46.19500, 9.02500')
  })

  // Un punto preso dal centro del paese si distingue da uno preso al portone.
  it('dice quando il punto è quello del paese e non del portone', async () => {
    const esito = await api.chiama(archivio, 'mappa.elenco', { allievoId: neri.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(riga(esito, 'Neri Ugo').approssimato, true)
    assert.equal(riga(esito, 'Neri Ugo').etichetta, 'Lugano, TI')
  })

  // Un id inventato dice «non trovato», non zero righe.
  it('una classe che non esiste non risponde «nessuno»', async () => {
    const esito = await api.chiama(archivio, 'mappa.elenco', { classeId: 'cla-inventata-0001' })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'non-trovato')
    assert.match(esito.messaggi.join(' '), /classi\.elenco/)
  })

  // Una persona ritirata chiesta per id non sparisce in silenzio: la busta la
  // conta.
  it('una persona ritirata non sparisce in silenzio: la busta la conta', async () => {
    const muta = await api.chiama(archivio, 'mappa.elenco', { allievoId: zorzi.id })
    assert.equal(muta.ok, true, JSON.stringify(muta))
    assert.equal(muta.dati.quante, 0)
    // Uno e non due: le ritirate della classe sono due, ma la domanda è su una.
    assert.equal(muta.dati.escluse, 1)

    const con = await api.chiama(archivio, 'mappa.elenco', { allievoId: zorzi.id, ritirati: true })
    assert.equal(con.ok, true, JSON.stringify(con))
    assert.deepEqual(nomi(con), ['Zorzi Ada'])
    assert.equal(riga(con, 'Zorzi Ada').localita, 'Locarno')
    // Chiesti i ritirati non ne resta fuori nessuno: nullo e non zero.
    assert.equal(con.dati.escluse, null)
  })

  // Lo stesso per le classi archiviate.
  it('le classi archiviate lasciate fuori si contano', async () => {
    const muta = await api.chiama(archivio, 'mappa.elenco', { classeId: archiviata.id })
    assert.equal(muta.ok, true, JSON.stringify(muta))
    assert.equal(muta.dati.quante, 0)
    assert.equal(muta.dati.classiEscluse, 1)

    const con = await api.chiama(archivio, 'mappa.elenco', {
      classeId: archiviata.id, archiviate: true,
    })
    assert.equal(con.ok, true, JSON.stringify(con))
    assert.deepEqual(nomi(con), ['Gotti Elia'])
    assert.equal(con.dati.classiEscluse, null)
  })

  // Il punto chiesto si scrive come nel dominio (cinque decimali): due scritture
  // dello stesso punto sembrerebbero due punti.
  it('il punto chiesto si scrive come su una scheda', async () => {
    const esito = await api.chiama(archivio, 'mappa.elenco', {
      classeId: classe.id, attornoA: { lat: 46.1, lon: 9 },
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.attorno, scriviCoordinate({ lat: 46.1, lon: 9 }))
    assert.equal(esito.dati.attornoLat, 46.1)
    assert.equal(esito.dati.attornoLon, 9)
  })

  // Un comune in cui non abita nessuno è una busta vuota, non un errore.
  it('un comune in cui non abita nessuno torna una busta vuota, non un errore', async () => {
    const esito = await api.chiama(archivio, 'mappa.elenco', { comune: 'Zurigo' })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.quante, 0)
    assert.equal(esito.dati.troncato, false)
    assert.equal(esito.dati.senzaCoordinate, 0)
    assert.equal(esito.dati.comune, 'Zurigo')
  })
})

describe('classe.persone: l’indirizzo in caselle', () => {
  // Caselle e riga composta insieme: la riga si stampa, le caselle si filtrano.
  it('torna via, NAP e località accanto alla riga composta', async () => {
    const esito = await api.chiama(archivio, 'classe.persone', { classeId: classe.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const sua = esito.dati.persone.find((p) => p.id === rossi.id)
    assert.equal(sua.indirizzo, 'Via Trevano 12, 6952 Canobbio')
    assert.equal(sua.via, 'Via Trevano 12')
    assert.equal(sua.cap, '6952')
    assert.equal(sua.localita, 'Canobbio')
    // E quello dell'azienda, dove si va in visita.
    assert.equal(sua.indirizzoDatore, 'Via Industria 7, 6528 Camorino')
    assert.equal(sua.localitaDatore, 'Camorino')
    // Chi non ha niente scritto ha caselle vuote, non «undefined».
    const senza = esito.dati.persone.find((p) => p.id === gialli.id)
    assert.equal(senza.indirizzo, '')
    assert.equal(senza.cap, '')
    assert.equal(senza.indirizzoDatore, '')
  })

  it('il filtro per comune restringe la classe e dice quanti ha lasciato fuori', async () => {
    const esito = await api.chiama(archivio, 'classe.persone', {
      classeId: classe.id, comune: 'CANOBBIO',
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.quante, 1)
    assert.equal(esito.dati.persone[0].id, rossi.id)
    // Quattro fuori su cinque, e la busta lo dice.
    assert.equal(esito.dati.fuoriZona, 4)
    assert.equal(esito.dati.comune, 'CANOBBIO')
  })

  // Senza zona chiesta il conto è nullo e non zero: niente riga su un filtro che
  // nessuno ha messo.
  it('senza zona chiesta non conta nessun escluso', async () => {
    const esito = await api.chiama(archivio, 'classe.persone', { classeId: classe.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.fuoriZona, null)
    assert.equal(esito.dati.comune, '')
    assert.equal(esito.dati.quante, 5)
  })

  it('il NAP a prefisso prende la zona anche da qui', async () => {
    const esito = await api.chiama(archivio, 'classe.persone', { classeId: classe.id, cap: '69' })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(
      esito.dati.persone.map((p) => p.cognome).sort(),
      ['Neri', 'Rossi', 'Verdi'],
    )
  })
})

describe('persone.scheda: l’indirizzo in caselle', () => {
  it('torna via, NAP e località accanto alla riga composta', async () => {
    const esito = await api.chiama(archivio, 'persone.scheda', { allievoId: bianchi.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.indirizzo, 'Viale Stazione 4, 6500 BELLINZONA')
    assert.equal(esito.dati.via, 'Viale Stazione 4')
    assert.equal(esito.dati.cap, '6500')
    assert.equal(esito.dati.localita, 'BELLINZONA')
  })

  // Una scheda chiesta per id non sparisce perché abita altrove: sembrerebbe
  // «non trovata».
  it('la zona risponde in un campo e non fa sparire la scheda', async () => {
    const dentro = await api.chiama(archivio, 'persone.scheda', {
      allievoId: bianchi.id, comune: 'bellinzona',
    })
    assert.equal(dentro.ok, true, JSON.stringify(dentro))
    assert.equal(dentro.dati.nellaZona, true)

    const fuori = await api.chiama(archivio, 'persone.scheda', {
      allievoId: bianchi.id, cap: '69',
    })
    assert.equal(fuori.ok, true, JSON.stringify(fuori))
    assert.equal(fuori.dati.nellaZona, false)
    assert.equal(fuori.dati.cognome, 'Bianchi')
  })

  // Senza filtro tutti sono nella zona.
  it('senza zona chiesta la scheda dice di essere nella zona', async () => {
    const esito = await api.chiama(archivio, 'persone.scheda', { allievoId: gialli.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.nellaZona, true)
    // E chi non ha l'indirizzo ha le caselle vuote, non mancanti.
    assert.equal(esito.dati.indirizzo, '')
    assert.equal(esito.dati.localita, '')
  })

  // Chi non ha indirizzo, con un filtro acceso, risulta fuori.
  it('chi non ha indirizzo resta fuori da qualunque zona chiesta', async () => {
    const esito = await api.chiama(archivio, 'persone.scheda', {
      allievoId: gialli.id, comune: 'Lugano',
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.nellaZona, false)
  })
})
