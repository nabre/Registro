// Le soglie che non sono le assenze: il profitto, e i giorni di una pendenza.
//
// Una soglia è il genere di cosa che si rompe senza far rumore. Il filtro
// resta, l'elenco torna, le righe sono plausibili — solo che sono le righe
// sbagliate: un estremo escluso invece che compreso toglie proprio chi sta
// esattamente sul confine, cioè il caso per cui la soglia era stata chiesta.
// Nessun tipo lo vede e nessuna forma dichiarata lo vede: si vede soltanto
// contando le righe, ed è quel che questo file fa.
//
// Tre cose si provano qui, e sono tre modi diversi di sbagliare:
//
//   1. **Da dove viene la media.** `persone.medie` non calcola: passa i
//      momenti a `mediaAllievo`, la funzione del dominio che riempie anche
//      la pagella. Se qualcuno un giorno rifacesse la media qui — sommando i
//      voti e dividendo per quanti sono, o mediando le medie dei corsi — la
//      busta direbbe un numero e la pagella un altro, e i due si
//      scoprirebbero solo a un colloquio. Perciò i voti qui sono scelti
//      apposta perché i conti possibili diano cifre **diverse**: fra corso e
//      anno, e fra una media pesata sui pesi e una pesata sul numero di
//      prove. Un archivio con tutte le prove di peso 1 non distingue le due,
//      ed è per questo che Neri ha una prova che pesa tre.
//
//   2. **Chi non ha voti.** Non è insufficiente: è uno di cui non si sa
//      niente, e la differenza è tutta la questione. Di suo resta fuori
//      dall'elenco; `conVoti: false` lo riporta dentro con `media: null`.
//      Senza questa prova, il giorno in cui «nessun voto» tornasse a contare
//      come zero l'elenco dei casi difficili si riempirebbe di persone che
//      non hanno ancora fatto una verifica.
//
//   3. **I giorni di una pendenza.** «Arretrata» è arretrata di un giorno
//      come di due mesi, e le due soglie servono a separarle. Il rischio
//      preciso è il segno: i giorni si contano negativi all'indietro, e uno
//      scambio fra i due versi farebbe tornare le arretrate a chi ha chiesto
//      quel che scade la settimana prossima — un elenco pieno e inutile, che
//      nessun errore segnala.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-api-soglie-'))
const lavoro = percorso.join(radice, 'lavoro')
const dati = percorso.join(lavoro, 'registro')
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

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

/**
 * Il giorno rispetto a cui si giudicano le pendenze.
 *
 * Fisso e non `oggi()`: con la data di sistema queste prove direbbero la
 * verità oggi e una cosa diversa fra un mese, che è il modo più sicuro di
 * avere una prova che nessuno si fida più di leggere.
 */
const GIORNO = '2026-10-01'

/** La sufficienza della scala di serie: da qui in su si è sufficienti. */
const SUFFICIENZA = 4

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
    Archivio, Uri,
    creaAllievo, creaAnno, creaClasse, creaConsegna, creaCorso, creaMateria, creaValutazione,
  } = api

  archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  await archivio.apri(null)
  await archivio.creaAnno(
    creaAnno(DAL, AL),
    Uri.file(percorso.join(dati, '2026-2027.registro')),
  )
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

  // Una classe archiviata con dentro una persona e un voto: serve a provare
  // che chiederla per id la mostra, e che non chiederla la lascia fuori.
  archiviata = creaClasse(annoId, 'V MEC A')
  archiviata.archiviata = true
  bruni = creaAllievo('Bruni', 'Elsa')
  archiviata.allievi.push(bruni)
  const vecchio = creaCorso(archiviata.id, mate.id, 'V MEC A — Matematica')

  archivio.modifica((r) => {
    // I PDF automatici restano fermi: qui si provano delle letture, e rifare
    // dei fogli in sottofondo terrebbe in piedi il processo per niente.
    r.impostazioni.pdfAutomatici = 'mai'
    r.classi.push(classe, archiviata)
    r.materie.push(mate, sto)
    r.corsi.push(matematica, storia, vecchio)
  }, ['classi', 'corsi', 'registro'])

  // I voti sono scelti perché la media del corso e la media dell'anno **non**
  // coincidano: Rossi ha 3 in matematica e 3.5 in storia, e chi guarda solo la
  // matematica deve leggere 3, non 3.25. Una prova con gli stessi voti nei due
  // corsi non distinguerebbe le due cifre, e il giorno in cui il filtro per
  // corso smettesse di funzionare passerebbe lo stesso.
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

  // Le due prove di Neri, e sono la ragione per cui questo archivio esiste: un
  // 6 che pesa tre in matematica e un 4 che pesa uno in storia. Pesando i voti
  // fa 5.5, mediando le due medie di corso fa 5 — due cifre, e una sola è
  // quella con cui il registro scrive le pagelle.
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

  // Quattro pendenze, una per ciascuno dei quattro casi che le soglie devono
  // saper distinguere rispetto al `GIORNO`: scaduta da molto, scaduta da poco,
  // in scadenza, senza termine.
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

after(() => {
  archivio?.dispose()
  rmSync(radice, { recursive: true, force: true })
})

describe('persone.medie: la soglia sul profitto', () => {
  // La media di un corso solo deve essere quella del corso. Se un giorno la
  // combinazione fra corsi si applicasse anche quando il corso è uno, chi
  // chiede «come va in matematica» leggerebbe un numero che comprende storia
  // — e non avrebbe modo di accorgersene, perché resta una media plausibile.
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

  // Senza corso la riga porta la media delle medie pesata sulle prove. Qui
  // Rossi ha 3 e 3.5 con una prova per corso, e il numero giusto è 3.25: un
  // 3 vorrebbe dire che storia è stata dimenticata, un 6.5 che si è sommato
  // invece di mediare. Sono i due sbagli che una riga di codice sola produce.
  it('senza corso la media combina i corsi, e dice quanti ne hanno contato', async () => {
    const esito = await api.chiama(archivio, 'persone.medie', {})
    assert.equal(esito.ok, true, JSON.stringify(esito))

    const maria = esito.dati.persone.find((p) => p.allievoId === rossi.id)
    assert.equal(maria.media, 3.25)
    assert.equal(maria.prove, 2)
    assert.equal(maria.corsi, 2)
    // Senza corso chiesto la colonna della materia resta vuota: scriverci
    // «Matematica» perché è il primo corso trovato sarebbe una didascalia
    // falsa su una media che comprende anche l'altro.
    assert.equal(maria.corso, '')

    const luca = esito.dati.persone.find((p) => p.allievoId === bianchi.id)
    assert.equal(luca.media, 5.5)
  })

  // L'estremo è compreso, e questa è la prova che lo dice. `mediaAlPiu: 3.25`
  // deve prendere chi sta esattamente a 3.25: chi scrive quella soglia l'ha
  // letta in un'altra busta, e un estremo escluso gli toglierebbe proprio la
  // riga da cui era partito.
  it('chi sta sotto la media chiesta esce, estremo compreso, e gli altri no', async () => {
    const esito = await api.chiama(archivio, 'persone.medie', { mediaAlPiu: 3.25 })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(esito.dati.persone.map((p) => p.cognome), ['Rossi'])
    // Le tre persone sono state guardate tutte: `quante` è quel che il filtro
    // ha preso, `guardate` è quel che c'era. Due numeri diversi, e senza il
    // secondo non si sa se «una» sia una su tre o una su una.
    assert.equal(esito.dati.quante, 1)
    assert.equal(esito.dati.guardate, 4)
    assert.equal(esito.dati.conVoti, 3)
    assert.equal(esito.dati.sottoSufficienza, 1)
  })

  // Una soglia che non prende nessuno è una risposta, non un guasto: l'elenco
  // è vuoto, i conti d'insieme restano quelli del periodo, e chi legge vede
  // che la domanda è stata capita.
  it('una soglia che non prende nessuno torna un elenco vuoto, non un errore', async () => {
    const esito = await api.chiama(archivio, 'persone.medie', { mediaAlmeno: 6 })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(esito.dati.persone, [])
    assert.equal(esito.dati.quante, 0)
    assert.equal(esito.dati.troncato, false)
    assert.equal(esito.dati.guardate, 4)
  })

  // «Sotto la sufficienza» non si chiede con una cifra: la cifra è quella
  // della scala del registro, e ripeterla a mano vorrebbe dire che il giorno
  // in cui una scuola cambia scala l'elenco continua a giudicare con la
  // vecchia.
  it('soloSotto usa la sufficienza della scala, senza che la si debba dire', async () => {
    const esito = await api.chiama(archivio, 'persone.medie', { soloSotto: true })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(esito.dati.persone.map((p) => p.cognome), ['Rossi'])
    assert.equal(esito.dati.persone[0].sufficiente, false)
    assert.equal(esito.dati.sufficienza, SUFFICIENZA)
  })

  // Chi non ha voti resta fuori di suo, e rientra con `conVoti: false` — con
  // `media: null` e non con uno zero. Uno zero lo metterebbe in cima
  // all'elenco dei casi difficili, che è il posto di chi va male e non di chi
  // non ha ancora fatto niente.
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
    // E va in coda, non in testa: l'ordine di serie mette per primo chi sta
    // peggio, e una media che manca non è la peggiore di tutte.
    assert.equal(con.dati.persone.at(-1).allievoId, verdi.id)
  })

  // Una media nulla non passa nessuna soglia. È la regola di `fraSoglie`, e
  // qui si prova dal di fuori: chi chiede «chi sta sotto quattro» con
  // `conVoti: false` non deve ricevere chi non ha voti, o segnalerebbe una
  // persona per un dato che manca.
  it('chi non ha voti non passa una soglia, nemmeno chiedendolo con conVoti falso', async () => {
    const esito = await api.chiama(archivio, 'persone.medie', {
      conVoti: false,
      mediaAlPiu: SUFFICIENZA,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(esito.dati.persone.map((p) => p.cognome), ['Rossi'])
  })

  // Il peso è l'intera differenza fra le due aritmetiche possibili, e su un
  // archivio di sole prove di peso 1 le due danno lo stesso numero: è il modo
  // in cui una media di medie passa inosservata. Neri ha un 6 che pesa tre e
  // un 4 che pesa uno: pesando i voti fa 5.5, mediando le medie dei due corsi
  // fa 5. La prima è quella che va sulla pagella, e deve essere questa.
  it('una prova che pesa tre conta per tre, anche quando i corsi sono due', async () => {
    const esito = await api.chiama(archivio, 'persone.medie', { allievoId: neri.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const gino = esito.dati.persone[0]
    assert.equal(gino.media, 5.5)
    // Due prove e non quattro: il peso pesa il voto, non lo conta più volte.
    assert.equal(gino.prove, 2)
    assert.equal(gino.corsi, 2)

    // E dentro il corso solo il conto è quello del corso, che è il numero che
    // la matrice del corso e la scheda mostrano già.
    const solo = await api.chiama(archivio, 'persone.medie', {
      allievoId: neri.id,
      corsoId: matematica.id,
    })
    assert.equal(solo.ok, true, JSON.stringify(solo))
    assert.equal(solo.dati.persone[0].media, 6)
    assert.equal(solo.dati.persone[0].prove, 1)
  })

  // Chi si è ritirato resta fuori dall'elenco, ma chiesto per id esce: un id
  // scritto apposta è già la domanda su quella persona, e rispondergli con una
  // busta vuota si legge come «non ha voti» — la stessa risposta sbagliata che
  // il rifiuto sull'id inventato esiste per non dare.
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

  // Una classe archiviata non compare nell'elenco dell'anno — sono anni
  // finiti, e le loro medie non sono più una cosa su cui intervenire — ma
  // chiesta per id risponde. Zero righe su una classe che esiste si legge
  // «quella classe non ha voti», ed è una risposta, e sbagliata.
  it('una classe archiviata chiesta per id risponde, e senza id resta fuori', async () => {
    const tutte = await api.chiama(archivio, 'persone.medie', {})
    assert.equal(tutte.ok, true, JSON.stringify(tutte))
    assert.equal(tutte.dati.persone.some((p) => p.allievoId === bruni.id), false)

    const esito = await api.chiama(archivio, 'persone.medie', { classeId: archiviata.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(esito.dati.persone.map((p) => p.cognome), ['Bruni'])
    assert.equal(esito.dati.persone[0].media, 3)
  })

  // Un id inventato è un errore e non un elenco vuoto. Una busta vuota si
  // leggerebbe come «quella persona non ha voti» — una risposta, e sbagliata —
  // e chi la riceve smette di cercare l'id buono invece di rileggerlo.
  it('un allievoId inventato lo dice, invece di rispondere «nessuna media»', async () => {
    const esito = await api.chiama(archivio, 'persone.medie', { allievoId: 'all-inventato-0001' })
    assert.equal(esito.ok, false, JSON.stringify(esito))
    assert.equal(esito.codice, 'non-trovato')
    assert.match(esito.messaggi.join(' '), /persone\.cerca/)
  })

  // Il periodo taglia le prove, non le persone: chiedendo un mese in cui non
  // si è fatta nessuna verifica l'elenco è vuoto perché nessuno ha voti, e
  // `guardate` resta tre. Senza questa prova un periodo applicato al posto
  // sbagliato — sulle classi invece che sui momenti — passerebbe inosservato.
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
  // Il conto dei giorni, con il segno che lo rende leggibile: negativo
  // all'indietro. È il numero su cui le due soglie tagliano, e provarlo qui
  // vuol dire che le prove dopo parlano di un dato già verificato.
  it('ogni pendenza dice quanti giorni mancano, negativi se è già scaduta', async () => {
    const esito = await api.chiama(archivio, 'consegne.elenco', { giorno: GIORNO })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const per = (id) => esito.dati.consegne.find((c) => c.id === id)
    assert.equal(per(vecchia.id).giorni, -11)
    assert.equal(per(recente.id).giorni, -2)
    assert.equal(per(prossima.id).giorni, 2)
    // Senza termine non è un ritardo di zero giorni: è l'assenza di un
    // termine, e uno zero la infilerebbe fra quelle che scadono oggi.
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
    // La soglia torna indietro come è stata applicata: tre righe diventate
    // una non lo dicono da sé, e chi legge la busta non ha la chiamata.
    assert.equal(esito.dati.arretrateDaAlmeno, 5)
  })

  // Due soglie diverse sullo stesso elenco devono dare due elenchi diversi:
  // se il taglio andasse sullo stato invece che sui giorni, `5` e `1`
  // tornerebbero le stesse righe e nessuno se ne accorgerebbe.
  it('abbassando la soglia dell’arretrato rientra anche quella scaduta da poco', async () => {
    const esito = await api.chiama(archivio, 'consegne.elenco', {
      giorno: GIORNO,
      arretrateDaAlmeno: 1,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const ids = esito.dati.consegne.map((c) => c.id).sort()
    assert.deepEqual(ids, [recente.id, vecchia.id].sort())
    // Quella senza termine non c'è: non è arretrata di niente, e metterla in
    // mezzo vorrebbe dire segnalare per un dato che manca.
    assert.equal(esito.dati.consegne.some((c) => c.id === senzaTermine.id), false)
  })

  // «Scade entro tre giorni» guarda avanti. Se il segno fosse scambiato
  // tornerebbero le arretrate — un elenco pieno, plausibile, e tutto
  // sbagliato — e per accorgersene bisognerebbe leggere le date a una a una.
  it('scadeEntro guarda avanti, e lascia fuori le arretrate e quelle senza termine', async () => {
    const esito = await api.chiama(archivio, 'consegne.elenco', {
      giorno: GIORNO,
      scadeEntro: 3,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(esito.dati.consegne.map((c) => c.id), [prossima.id])
    assert.equal(esito.dati.scadeEntro, 3)
  })

  // Una soglia che non prende nessuno: lo stesso patto delle medie, elenco
  // vuoto e non errore. Qui `scadeEntro: 0` vuol dire «scade oggi», e oggi
  // non scade niente.
  it('una soglia sui giorni che non prende nessuno torna un elenco vuoto', async () => {
    const esito = await api.chiama(archivio, 'consegne.elenco', { giorno: GIORNO, scadeEntro: 0 })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(esito.dati.consegne, [])
    assert.equal(esito.dati.quante, 0)
    assert.equal(esito.dati.scadeEntro, 0)
  })

  // Le due soglie sono complementari e si possono comporre: chiedendole
  // insieme non resta niente, ed è giusto così — nessuna pendenza è insieme
  // scaduta e non ancora scaduta. Vale come prova che i due filtri si
  // applicano tutti e due e non uno solo, l'ultimo scritto.
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

  // Il `giorno` sposta tutto: le stesse quattro pendenze, guardate da prima,
  // non sono arretrate di niente. Senza questa prova un conto fatto su
  // `oggi()` invece che sul giorno chiesto passerebbe — e passerebbe per
  // mesi, finché la data di sistema non superasse le scadenze.
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
