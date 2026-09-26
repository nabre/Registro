// Le soglie oltre le assenze: il profitto e i giorni di una pendenza. Un
// estremo sbagliato non si vede dalla forma, solo contando le righe.
//
//   1. **La media** viene da `mediaAllievo`, la stessa della pagella: i voti
//      sono scelti perché i conti possibili (corso o anno, pesi o numero di
//      prove) diano cifre diverse. Neri ha una prova che pesa tre.
//   2. **Chi non ha voti** non è insufficiente: resta fuori, e `conVoti: false`
//      lo riporta con `media: null`.
//   3. **I giorni di una pendenza** sono negativi all'indietro: il segno separa
//      le arretrate da quelle in scadenza.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-soglie-')

let api
let archivio
let classe
/** Rossi: sotto in tutti e due i corsi, ed è il caso che le soglie cercano. */
let rossi
/** Bianchi: sopra in tutti e due, ed è chi non deve comparire. */
let bianchi
/** Verdi: nessun voto. Non è insufficiente, è ignota. */
let verdi
/** Neri: una prova che pesa tre in un corso e una che pesa uno nell'altro. */
let neri
/** Gialli: ritirato a metà anno, e i suoi voti restano nel registro. */
let gialli
/** La classe di un anno finito, e Bruni che la frequentava. */
let archiviata
let bruni
let matematica
let storia
/** Scaduta da undici giorni rispetto al giorno di riferimento. */
let vecchia
/** Scaduta da due. */
let recente
/** Scade fra due giorni. */
let prossima
/** Senza termine: non è arretrata di niente e non scade mai. */
let senzaTermine

const DAL = '2026-09-01'
const AL = '2027-06-30'

/** Il giorno di riferimento delle pendenze: fisso, non `oggi()`. */
const GIORNO = '2026-10-01'

/** La sufficienza della scala di serie: da qui in su si è sufficienti. */
const SUFFICIENZA = 4

before(async () => {
  // PDF automatici fermi: qui si provano delle letture.
  ;({ api, archivio } = await archivioDiProva({
    lavoro,
    dati,
    dal: DAL,
    al: AL,
    pdfAutomatici: 'mai',
  }))

  const {
    creaAllievo, creaClasse, creaConsegna, creaCorso, creaMateria, creaValutazione,
  } = api

  const annoId = archivio.registro.anni[0].id

  classe = creaClasse(annoId, 'I MEC A')
  rossi = creaAllievo('Rossi', 'Maria')
  bianchi = creaAllievo('Bianchi', 'Luca')
  verdi = creaAllievo('Verdi', 'Anna')
  neri = creaAllievo('Neri', 'Gino')
  gialli = creaAllievo('Gialli', 'Ivo')
  gialli.attivo = false
  classe.allievi.push(rossi, bianchi, verdi, neri, gialli)

  const mate = creaMateria('Matematica')
  const sto = creaMateria('Storia')
  matematica = creaCorso(classe.id, mate.id, 'I MEC A — Matematica')
  storia = creaCorso(classe.id, sto.id, 'I MEC A — Storia')

  // Una classe archiviata con una persona e un voto: chiesta per id si vede,
  // altrimenti resta fuori.
  archiviata = creaClasse(annoId, 'V MEC A')
  archiviata.archiviata = true
  bruni = creaAllievo('Bruni', 'Elsa')
  archiviata.allievi.push(bruni)
  const vecchio = creaCorso(archiviata.id, mate.id, 'V MEC A — Matematica')

  archivio.modifica((r) => {
    r.classi.push(classe, archiviata)
    r.materie.push(mate, sto)
    r.corsi.push(matematica, storia, vecchio)
  }, ['classi', 'corsi', 'registro'])

  // Media del corso e media dell'anno **non** coincidono: Rossi ha 3 in
  // matematica e 3.5 in storia, e chi guarda la matematica legge 3, non 3.25.
  const verificaMate = creaValutazione(
    matematica.id, 'Verifica sulle frazioni', undefined, '2026-09-15',
  )
  verificaMate.voti = [
    { allievoId: rossi.id, valore: 3, assente: false },
    { allievoId: bianchi.id, valore: 5, assente: false },
    { allievoId: gialli.id, valore: 2, assente: false },
  ]
  await api.chiama(archivio, 'valutazioni.salva', { valutazione: verificaMate })

  const verificaStoria = creaValutazione(
    storia.id, 'Interrogazione sul Risorgimento', undefined, '2026-09-22',
  )
  verificaStoria.voti = [
    { allievoId: rossi.id, valore: 3.5, assente: false },
    { allievoId: bianchi.id, valore: 6, assente: false },
  ]
  await api.chiama(archivio, 'valutazioni.salva', { valutazione: verificaStoria })

  // Neri: un 6 che pesa tre in matematica e un 4 che pesa uno in storia. Pesando
  // i voti fa 5.5 (quella della pagella), mediando le medie dei corsi 5.
  const esame = creaValutazione(matematica.id, 'Esame di fine modulo', undefined, '2026-09-18')
  esame.peso = 3
  esame.voti = [{ allievoId: neri.id, valore: 6, assente: false }]
  await api.chiama(archivio, 'valutazioni.salva', { valutazione: esame })

  const compitino = creaValutazione(storia.id, 'Compitino', undefined, '2026-09-23')
  compitino.voti = [{ allievoId: neri.id, valore: 4, assente: false }]
  await api.chiama(archivio, 'valutazioni.salva', { valutazione: compitino })

  const vecchiaProva = creaValutazione(vecchio.id, 'Prova di un anno fa', undefined, '2026-09-16')
  vecchiaProva.voti = [{ allievoId: bruni.id, valore: 3, assente: false }]
  await api.chiama(archivio, 'valutazioni.salva', { valutazione: vecchiaProva })

  // Una pendenza per caso rispetto a `GIORNO`: scaduta da molto, da poco, in
  // scadenza, senza termine.
  vecchia = creaConsegna(matematica.id, 'Portare il libro', '2026-09-01')
  vecchia.scadenza = '2026-09-20'
  recente = creaConsegna(matematica.id, 'Firma del tutore', '2026-09-15')
  recente.scadenza = '2026-09-29'
  prossima = creaConsegna(matematica.id, 'Relazione di laboratorio', '2026-09-25')
  prossima.scadenza = '2026-10-03'
  senzaTermine = creaConsegna(matematica.id, 'Leggere il capitolo quarto', '2026-09-25')
  for (const consegna of [vecchia, recente, prossima, senzaTermine]) {
    await api.chiama(archivio, 'consegne.salva', { consegna })
  }
})

after(() => smonta(radice, archivio))

describe('persone.medie: la soglia sul profitto', () => {
  // Con un corso solo la media è quella del corso, senza mescolare gli altri.
  it('con un corso solo la media è quella del corso, con la materia accanto', async () => {
    const esito = await api.chiama(archivio, 'persone.medie', { corsoId: matematica.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.sufficienza, SUFFICIENZA)

    const maria = esito.dati.persone.find((p) => p.allievoId === rossi.id)
    assert.equal(maria.media, 3)
    assert.equal(maria.prove, 1)
    assert.equal(maria.corsi, 1)
    assert.equal(maria.corso, 'Matematica')
    assert.equal(maria.sufficiente, false)

    const luca = esito.dati.persone.find((p) => p.allievoId === bianchi.id)
    assert.equal(luca.media, 5)
    assert.equal(luca.sufficiente, true)
  })

  // Senza corso: media delle medie pesata sulle prove, 3.25 per Rossi (3
  // dimenticherebbe storia, 6.5 sommerebbe).
  it('senza corso la media combina i corsi, e dice quanti ne hanno contato', async () => {
    const esito = await api.chiama(archivio, 'persone.medie', {})
    assert.equal(esito.ok, true, JSON.stringify(esito))

    const maria = esito.dati.persone.find((p) => p.allievoId === rossi.id)
    assert.equal(maria.media, 3.25)
    assert.equal(maria.prove, 2)
    assert.equal(maria.corsi, 2)
    // Senza corso chiesto la materia resta vuota: la media comprende tutti i corsi.
    assert.equal(maria.corso, '')

    const luca = esito.dati.persone.find((p) => p.allievoId === bianchi.id)
    assert.equal(luca.media, 5.5)
  })

  // L'estremo è compreso: `mediaAlPiu: 3.25` prende chi sta a 3.25.
  it('chi sta sotto la media chiesta esce, estremo compreso, e gli altri no', async () => {
    const esito = await api.chiama(archivio, 'persone.medie', { mediaAlPiu: 3.25 })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(esito.dati.persone.map((p) => p.cognome), ['Rossi'])
    // `quante` è quel che il filtro prende, `guardate` quel che c'era.
    assert.equal(esito.dati.quante, 1)
    assert.equal(esito.dati.guardate, 4)
    assert.equal(esito.dati.conVoti, 3)
    assert.equal(esito.dati.sottoSufficienza, 1)
  })

  // Una soglia che non prende nessuno è un elenco vuoto, non un guasto.
  it('una soglia che non prende nessuno torna un elenco vuoto, non un errore', async () => {
    const esito = await api.chiama(archivio, 'persone.medie', { mediaAlmeno: 6 })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(esito.dati.persone, [])
    assert.equal(esito.dati.quante, 0)
    assert.equal(esito.dati.troncato, false)
    assert.equal(esito.dati.guardate, 4)
  })

  // «Sotto la sufficienza» usa la scala del registro, senza ripeterne la cifra.
  it('soloSotto usa la sufficienza della scala, senza che la si debba dire', async () => {
    const esito = await api.chiama(archivio, 'persone.medie', { soloSotto: true })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(esito.dati.persone.map((p) => p.cognome), ['Rossi'])
    assert.equal(esito.dati.persone[0].sufficiente, false)
    assert.equal(esito.dati.sufficienza, SUFFICIENZA)
  })

  // Chi non ha voti rientra con `media: null`, non con uno zero che lo
  // metterebbe fra i casi difficili.
  it('chi non ha nessun voto resta fuori di suo, e rientra con conVoti falso', async () => {
    const senza = await api.chiama(archivio, 'persone.medie', {})
    assert.equal(senza.ok, true, JSON.stringify(senza))
    assert.equal(senza.dati.persone.some((p) => p.allievoId === verdi.id), false)
    assert.equal(senza.dati.quante, 3)

    const con = await api.chiama(archivio, 'persone.medie', { conVoti: false })
    assert.equal(con.ok, true, JSON.stringify(con))
    assert.equal(con.dati.quante, 4)
    const anna = con.dati.persone.find((p) => p.allievoId === verdi.id)
    assert.equal(anna.media, null)
    assert.equal(anna.prove, 0)
    assert.equal(anna.corsi, 0)
    assert.equal(anna.sufficiente, false)
    // In coda: l'ordine mette prima chi sta peggio, e una media che manca non lo è.
    assert.equal(con.dati.persone.at(-1).allievoId, verdi.id)
  })

  // Una media nulla non passa nessuna soglia (`fraSoglie`), nemmeno con
  // `conVoti: false`.
  it('chi non ha voti non passa una soglia, nemmeno chiedendolo con conVoti falso', async () => {
    const esito = await api.chiama(archivio, 'persone.medie', {
      conVoti: false,
      mediaAlPiu: SUFFICIENZA,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(esito.dati.persone.map((p) => p.cognome), ['Rossi'])
  })

  // Con pesi tutti 1 le due aritmetiche coincidono: Neri le separa. Pesando i
  // voti fa 5.5, mediando le medie dei corsi 5; vale la prima.
  it('una prova che pesa tre conta per tre, anche quando i corsi sono due', async () => {
    const esito = await api.chiama(archivio, 'persone.medie', { allievoId: neri.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const gino = esito.dati.persone[0]
    assert.equal(gino.media, 5.5)
    // Due prove e non quattro: il peso pesa il voto, non lo conta più volte.
    assert.equal(gino.prove, 2)
    assert.equal(gino.corsi, 2)

    // Dentro un corso solo il conto è quello del corso, come matrice e scheda.
    const solo = await api.chiama(archivio, 'persone.medie', {
      allievoId: neri.id,
      corsoId: matematica.id,
    })
    assert.equal(solo.ok, true, JSON.stringify(solo))
    assert.equal(solo.dati.persone[0].media, 6)
    assert.equal(solo.dati.persone[0].prove, 1)
  })

  // Chi si è ritirato resta fuori, ma chiesto per id esce: una busta vuota si
  // leggerebbe «non ha voti».
  it('chi si è ritirato esce se lo si chiede per id, e non di suo', async () => {
    const tutti = await api.chiama(archivio, 'persone.medie', {})
    assert.equal(tutti.ok, true, JSON.stringify(tutti))
    assert.equal(tutti.dati.persone.some((p) => p.allievoId === gialli.id), false)

    const esito = await api.chiama(archivio, 'persone.medie', { allievoId: gialli.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.quante, 1)
    assert.equal(esito.dati.persone[0].allievoId, gialli.id)
    assert.equal(esito.dati.persone[0].attivo, false)
    assert.equal(esito.dati.persone[0].media, 2)
  })

  // Una classe archiviata non compare nell'elenco dell'anno, ma chiesta per id
  // risponde.
  it('una classe archiviata chiesta per id risponde, e senza id resta fuori', async () => {
    const tutte = await api.chiama(archivio, 'persone.medie', {})
    assert.equal(tutte.ok, true, JSON.stringify(tutte))
    assert.equal(tutte.dati.persone.some((p) => p.allievoId === bruni.id), false)

    const esito = await api.chiama(archivio, 'persone.medie', { classeId: archiviata.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(esito.dati.persone.map((p) => p.cognome), ['Bruni'])
    assert.equal(esito.dati.persone[0].media, 3)
  })

  // Un id inventato è un errore, non un elenco vuoto.
  it('un allievoId inventato lo dice, invece di rispondere «nessuna media»', async () => {
    const esito = await api.chiama(archivio, 'persone.medie', { allievoId: 'all-inventato-0001' })
    assert.equal(esito.ok, false, JSON.stringify(esito))
    assert.equal(esito.codice, 'non-trovato')
    assert.match(esito.messaggi.join(' '), /persone\.cerca/)
  })

  // Il periodo taglia le prove, non le persone: `guardate` resta tre.
  it('un periodo senza prove svuota le medie e lascia le persone al loro posto', async () => {
    const esito = await api.chiama(archivio, 'persone.medie', {
      dal: '2027-05-01',
      al: '2027-05-31',
      conVoti: false,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.guardate, 4)
    assert.equal(esito.dati.conVoti, 0)
    assert.equal(esito.dati.sottoSufficienza, 0)
    assert.equal(esito.dati.persone.every((p) => p.media === null), true)
  })
})

describe('consegne.elenco: le soglie sui giorni', () => {
  // I giorni, negativi all'indietro: il numero su cui tagliano le due soglie.
  it('ogni pendenza dice quanti giorni mancano, negativi se è già scaduta', async () => {
    const esito = await api.chiama(archivio, 'consegne.elenco', { giorno: GIORNO })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const per = (id) => esito.dati.consegne.find((c) => c.id === id)
    assert.equal(per(vecchia.id).giorni, -11)
    assert.equal(per(recente.id).giorni, -2)
    assert.equal(per(prossima.id).giorni, 2)
    // Senza termine è `null`, non zero (che vorrebbe dire «scade oggi»).
    assert.equal(per(senzaTermine.id).giorni, null)
    assert.equal(esito.dati.arretrateDaAlmeno, null)
    assert.equal(esito.dati.scadeEntro, null)
  })

  it('arretrateDaAlmeno tiene solo quelle scadute da abbastanza tempo', async () => {
    const esito = await api.chiama(archivio, 'consegne.elenco', {
      giorno: GIORNO,
      arretrateDaAlmeno: 5,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(esito.dati.consegne.map((c) => c.id), [vecchia.id])
    // La soglia applicata torna nella busta.
    assert.equal(esito.dati.arretrateDaAlmeno, 5)
  })

  // Due soglie diverse danno elenchi diversi: il taglio è sui giorni, non sullo
  // stato.
  it('abbassando la soglia dell’arretrato rientra anche quella scaduta da poco', async () => {
    const esito = await api.chiama(archivio, 'consegne.elenco', {
      giorno: GIORNO,
      arretrateDaAlmeno: 1,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const ids = esito.dati.consegne.map((c) => c.id).sort()
    assert.deepEqual(ids, [recente.id, vecchia.id].sort())
    // Quella senza termine non è arretrata.
    assert.equal(esito.dati.consegne.some((c) => c.id === senzaTermine.id), false)
  })

  // «Scade entro» guarda avanti: col segno scambiato tornerebbero le arretrate.
  it('scadeEntro guarda avanti, e lascia fuori le arretrate e quelle senza termine', async () => {
    const esito = await api.chiama(archivio, 'consegne.elenco', {
      giorno: GIORNO,
      scadeEntro: 3,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(esito.dati.consegne.map((c) => c.id), [prossima.id])
    assert.equal(esito.dati.scadeEntro, 3)
  })

  // Elenco vuoto e non errore: `scadeEntro: 0` vuol dire «scade oggi», e oggi non
  // scade niente.
  it('una soglia sui giorni che non prende nessuno torna un elenco vuoto', async () => {
    const esito = await api.chiama(archivio, 'consegne.elenco', { giorno: GIORNO, scadeEntro: 0 })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(esito.dati.consegne, [])
    assert.equal(esito.dati.quante, 0)
    assert.equal(esito.dati.scadeEntro, 0)
  })

  // Le due soglie insieme non lasciano niente: si applicano tutte e due.
  it('le due soglie insieme non lasciano niente: si applicano tutte e due', async () => {
    const esito = await api.chiama(archivio, 'consegne.elenco', {
      giorno: GIORNO,
      arretrateDaAlmeno: 1,
      scadeEntro: 30,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(esito.dati.consegne, [])
    assert.equal(esito.dati.arretrateDaAlmeno, 1)
    assert.equal(esito.dati.scadeEntro, 30)
  })

  // Il `giorno` sposta tutto: guardate da prima, le pendenze non sono arretrate.
  // Il conto non usa `oggi()`.
  it('cambiando il giorno di riferimento cambiano i giorni, e con loro le soglie', async () => {
    const esito = await api.chiama(archivio, 'consegne.elenco', {
      giorno: '2026-09-10',
      arretrateDaAlmeno: 1,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(esito.dati.consegne, [])

    const avanti = await api.chiama(archivio, 'consegne.elenco', {
      giorno: '2026-09-10',
      scadeEntro: 10,
    })
    assert.equal(avanti.ok, true, JSON.stringify(avanti))
    assert.deepEqual(avanti.dati.consegne.map((c) => c.id), [vecchia.id])
  })
})
