// `persone.medie` raggruppata per periodo: le cifre del semestre sono di quel
// semestre, e il totale **non** è la media delle due. Il corredo mette i voti
// ai due lati del confine di gennaio, con pesi e numeri di prove diversi.
//
// Le cifre di Rossi:
//
//   - primo semestre: matematica 5 (peso 1) e storia 5 (peso 1) → media 5.00,
//     due prove, due corsi;
//   - secondo semestre: matematica 2 **di peso 3** → media 2.00, una prova, un
//     corso;
//   - sull'anno: (5·1 + 5·1 + 2·3) / (1 + 1 + 3) = 16/5 = **3.20**, non 3.50.
//
// I corsi: due sull'anno, due più uno sui periodi. Il totale è l'**unione**.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-periodi-medie-')

/** L'anno, e il confine fra i due semestri: fine gennaio, come di serie. */
const DAL = '2026-09-01'
const AL = '2027-06-30'
const FINE_PRIMO = '2027-01-31'
const INIZIO_SECONDO = '2027-02-01'

let api
let archivio
/** La classe con i voti dentro. */
let classe
/** L'altra classe, con un corso suo: serve al conflitto fra i due id. */
let altra
/** La classe archiviata, che di suo resta fuori e va contata lo stesso. */
let archiviata
let rossi
let bianchi
/** Chi si è ritirato: resta nel registro e fuori dal conto. */
let neri
let gialli
let matematica
let storia
let disegno

/** I due semestri dell'anno, come il registro li ha fatti. */
function semestri () {
  return archivio.registro.anni[0].semestri
}

/** La riga di una persona dentro una busta di `persone.medie`. */
function rigaDi (esito, allievo) {
  return esito.dati.persone.find((riga) => riga.allievoId === allievo.id)
}

/** La voce di un periodo dentro una riga, cercata per id come fa chi legge. */
function vocePeriodo (riga, semestreId) {
  return riga.periodi.find((voce) => voce.semestreId === semestreId)
}

before(async () => {
  ;({ api, archivio } = await archivioDiProva({
    lavoro,
    dati,
    dal: DAL,
    al: AL,
    pdfAutomatici: 'mai',
  }))

  const {
    creaAllievo, creaClasse, creaCorso, creaMateria, creaValutazione,
  } = api

  const annoId = archivio.registro.anni[0].id

  classe = creaClasse(annoId, 'I MEC A')
  rossi = creaAllievo('Rossi', 'Mario')
  bianchi = creaAllievo('Bianchi', 'Luca')
  neri = creaAllievo('Neri', 'Ugo')
  neri.attivo = false
  classe.allievi.push(rossi, bianchi, neri)

  altra = creaClasse(annoId, 'II MEC B')
  altra.allievi.push(creaAllievo('Verdi', 'Ada'))

  archiviata = creaClasse(annoId, 'III MEC C')
  archiviata.archiviata = true
  gialli = creaAllievo('Gialli', 'Ivo')
  archiviata.allievi.push(gialli)

  matematica = creaMateria('Matematica')
  storia = creaMateria('Storia')
  disegno = creaMateria('Disegno')
  const arte = creaMateria('Arte')

  const corsoMatematica = creaCorso(classe.id, matematica.id, 'I MEC A — Matematica')
  const corsoStoria = creaCorso(classe.id, storia.id, 'I MEC A — Storia')
  const corsoDisegno = creaCorso(altra.id, disegno.id, 'II MEC B — Disegno')
  const corsoArte = creaCorso(archiviata.id, arte.id, 'III MEC C — Arte')

  archivio.modifica((r) => {
    r.classi.push(classe, altra, archiviata)
    r.materie.push(matematica, storia, disegno, arte)
    r.corsi.push(corsoMatematica, corsoStoria, corsoDisegno, corsoArte)
  }, ['classi', 'corsi', 'registro'])

  // Le prove passano da `valutazioni.salva`: pesi compresi, come le scriverebbe
  // il registro.
  const primaMatematica = creaValutazione(corsoMatematica.id, 'Frazioni', undefined, '2026-10-05')
  primaMatematica.voti = [
    { allievoId: rossi.id, valore: 5, assente: false },
    { allievoId: bianchi.id, valore: 4, assente: false },
  ]
  const primaStoria = creaValutazione(corsoStoria.id, 'Il Risorgimento', undefined, '2026-11-10')
  primaStoria.voti = [
    { allievoId: rossi.id, valore: 5, assente: false },
    { allievoId: bianchi.id, valore: 4, assente: false },
  ]
  // La prova del secondo semestre pesa tre: è il peso che fa divergere le due
  // medie.
  const secondaMatematica = creaValutazione(corsoMatematica.id, 'Equazioni', undefined, '2027-03-10')
  secondaMatematica.peso = 3
  secondaMatematica.voti = [
    { allievoId: rossi.id, valore: 2, assente: false },
    { allievoId: bianchi.id, valore: 4, assente: false },
  ]

  for (const valutazione of [primaMatematica, primaStoria, secondaMatematica]) {
    const esito = await api.chiama(archivio, 'valutazioni.salva', { valutazione })
    assert.equal(esito.ok, true, JSON.stringify(esito))
  }
})

after(() => smonta(radice, archivio))

describe('persone.medie raggruppa per periodo', () => {
  it('senza semestreId: i due periodi in cima, e due voci per ogni persona', async () => {
    const esito = await api.chiama(archivio, 'persone.medie', {})
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const [primo, secondo] = semestri()

    assert.equal(esito.dati.periodi.length, 2)
    assert.deepEqual(esito.dati.periodi.map((p) => p.semestreId), [primo.id, secondo.id])
    assert.deepEqual(esito.dati.periodi.map((p) => p.numero), [1, 2])
    assert.equal(esito.dati.periodi[0].etichetta, primo.etichetta)
    assert.equal(esito.dati.periodi[0].dal, DAL)
    assert.equal(esito.dati.periodi[0].al, FINE_PRIMO)
    assert.equal(esito.dati.periodi[1].dal, INIZIO_SECONDO)
    assert.equal(esito.dati.periodi[1].al, AL)
    // Gli estremi della busta sono quelli dei periodi attraversati.
    assert.equal(esito.dati.dal, DAL)
    assert.equal(esito.dati.al, AL)

    const riga = rigaDi(esito, rossi)
    assert.equal(riga.periodi.length, 2)
    assert.deepEqual(riga.periodi.map((v) => v.semestreId), [primo.id, secondo.id])

    const suoPrimo = vocePeriodo(riga, primo.id)
    assert.equal(suoPrimo.prove, 2)
    assert.equal(suoPrimo.corsi, 2)
    assert.equal(suoPrimo.media, 5)
    assert.equal(suoPrimo.sufficiente, true)

    const suoSecondo = vocePeriodo(riga, secondo.id)
    assert.equal(suoSecondo.prove, 1)
    assert.equal(suoSecondo.corsi, 1)
    assert.equal(suoSecondo.media, 2)
    assert.equal(suoSecondo.sufficiente, false)
  })

  it('i conti che fra i periodi non si sommano: la media e i corsi', async () => {
    const esito = await api.chiama(archivio, 'persone.medie', {})
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const riga = rigaDi(esito, rossi)
    const [primo, secondo] = semestri()
    const suoPrimo = vocePeriodo(riga, primo.id)
    const suoSecondo = vocePeriodo(riga, secondo.id)

    // La pesata su tutte le prove insieme: (5·1 + 5·1 + 2·3) / 5.
    assert.equal(riga.media, 3.2)
    // E **non** la media delle due medie, 3.5 (vedi il § in testa a `medie.ts`).
    const dalleMedie = (suoPrimo.media + suoSecondo.media) / 2
    assert.equal(dalleMedie, 3.5)
    assert.notEqual(riga.media, dalleMedie)
    // Le prove si sommano: ogni prova cade in un periodo solo.
    assert.equal(riga.prove, suoPrimo.prove + suoSecondo.prove)
    assert.equal(riga.prove, 3)
    // I corsi no: il totale è l'unione. Due più uno fa tre, il totale è due.
    assert.equal(riga.corsi, 2)
    assert.equal(suoPrimo.corsi + suoSecondo.corsi, 3)

    // L'altra persona, per non provare tutto su una riga sola: (4 + 4 + 4·3)/5.
    const suo = rigaDi(esito, bianchi)
    assert.equal(suo.media, 4)
    assert.equal(suo.sufficiente, true)
    assert.equal(vocePeriodo(suo, primo.id).media, 4)
    assert.equal(vocePeriodo(suo, secondo.id).media, 4)
  })

  it('con semestreId: un periodo solo, con le cifre di quel semestre', async () => {
    const [, secondo] = semestri()
    const esito = await api.chiama(archivio, 'persone.medie', { semestreId: secondo.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))

    assert.equal(esito.dati.periodi.length, 1)
    assert.equal(esito.dati.periodi[0].semestreId, secondo.id)
    assert.equal(esito.dati.dal, INIZIO_SECONDO)
    assert.equal(esito.dati.al, AL)

    const riga = rigaDi(esito, rossi)
    assert.equal(riga.periodi.length, 1)
    // Ristretti a un semestre, il totale della riga **è** quello del periodo.
    assert.equal(riga.media, 2)
    assert.equal(riga.prove, 1)
    assert.equal(riga.corsi, 1)
    assert.equal(riga.sufficiente, false)
    assert.deepEqual(
      { ...vocePeriodo(riga, secondo.id) },
      { semestreId: secondo.id, prove: 1, corsi: 1, media: 2, sufficiente: false },
    )
  })

  it('un semestreId che non esiste è «non-trovato», non una busta vuota', async () => {
    const esito = await api.chiama(archivio, 'persone.medie', { semestreId: 'sem-inventato-0001' })
    assert.equal(esito.ok, false, JSON.stringify(esito))
    assert.equal(esito.codice, 'non-trovato')
    // Il rimedio scritto accanto: dove si va a prendere l'id buono.
    assert.match(esito.messaggi.join(' '), /anni\.elenco/)
  })

  it('dal e al che tagliano i semestri: i periodi escono intersecati', async () => {
    const esito = await api.chiama(archivio, 'persone.medie', {
      dal: '2026-11-01',
      al: '2027-03-31',
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const [primo, secondo] = semestri()

    // Gli estremi veri: dal giorno chiesto al giorno chiesto.
    assert.deepEqual(
      esito.dati.periodi.map((p) => [p.semestreId, p.dal, p.al]),
      [
        [primo.id, '2026-11-01', FINE_PRIMO],
        [secondo.id, INIZIO_SECONDO, '2027-03-31'],
      ],
    )
    assert.equal(esito.dati.dal, '2026-11-01')
    assert.equal(esito.dati.al, '2027-03-31')

    // Matematica di ottobre resta fuori: il totale si rifà su quel che resta.
    const riga = rigaDi(esito, rossi)
    assert.equal(vocePeriodo(riga, primo.id).prove, 1)
    assert.equal(vocePeriodo(riga, primo.id).corsi, 1)
    assert.equal(vocePeriodo(riga, primo.id).media, 5)
    assert.equal(vocePeriodo(riga, secondo.id).prove, 1)
    // (5·1 + 2·3) / 4 = 2.75, non la media delle medie (3.5).
    assert.equal(riga.media, 2.75)
    assert.equal(riga.prove, 2)
  })

  it('un anno senza semestri torna un periodo solo, con semestreId vuoto', async () => {
    const anno = archivio.registro.anni[0]
    const suoi = anno.semestri
    // Un anno senza scansione non è valido, ma `periodiDa` deve reggerlo (documento
    // vecchio o letto male). Si toglie per una chiamata e si rimette.
    archivio.modifica((r) => { r.anni[0].semestri = [] }, ['registro'])
    try {
      const esito = await api.chiama(archivio, 'persone.medie', {})
      assert.equal(esito.ok, true, JSON.stringify(esito))
      assert.equal(esito.dati.periodi.length, 1)
      assert.equal(esito.dati.periodi[0].semestreId, '')
      assert.equal(esito.dati.periodi[0].numero, 0)
      assert.equal(esito.dati.periodi[0].dal, DAL)
      assert.equal(esito.dati.periodi[0].al, AL)

      // Il raggruppamento non sparisce: chi legge la busta ha una strada sola.
      const riga = rigaDi(esito, rossi)
      assert.equal(riga.periodi.length, 1)
      assert.equal(riga.periodi[0].semestreId, '')
      assert.equal(riga.periodi[0].prove, 3)
      assert.equal(riga.periodi[0].media, 3.2)
      assert.equal(riga.media, 3.2)
    } finally {
      archivio.modifica((r) => { r.anni[0].semestri = suoi }, ['registro'])
    }
  })
})

describe('persone.medie dice quel che ha lasciato fuori', () => {
  it('il corso di un’altra classe è un errore che nomina il conflitto', async () => {
    const corso = archivio.registro.corsi.find((c) => c.classeId === altra.id)
    const esito = await api.chiama(archivio, 'persone.medie', {
      classeId: classe.id,
      corsoId: corso.id,
    })
    // Due filtri che si escludono sono un errore, non zero righe («non ci sono
    // voti»).
    assert.equal(esito.ok, false, JSON.stringify(esito))
    assert.equal(esito.codice, 'ingresso-non-valido')
    const detto = esito.messaggi.join(' ')
    // L'errore nomina tutti e due, così si vede quale id è di troppo.
    assert.match(detto, /II MEC B/)
    assert.match(detto, /I MEC A/)
    assert.match(detto, /corsi\.elenco/)
  })

  it('i contatori dicono quante persone hanno tolto i due interruttori', async () => {
    const esito = await api.chiama(archivio, 'persone.medie', {})
    assert.equal(esito.ok, true, JSON.stringify(esito))
    // Rossi, Bianchi e Verdi: Neri è ritirato, Gialli in una classe archiviata.
    assert.equal(esito.dati.guardate, 3)
    assert.equal(esito.dati.esclusiRitirati, 1)
    assert.equal(esito.dati.esclusiArchiviate, 1)
    // Tre corsi guardati: distingue «non ho trovato» da «non ho guardato».
    assert.equal(esito.dati.corsiGuardati, 3)
  })

  it('con gli interruttori accesi i contatori si spengono, e tutti rientrano', async () => {
    const esito = await api.chiama(archivio, 'persone.medie', {
      ritirati: true,
      archiviate: true,
      conVoti: false,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.guardate, 5)
    // Nulli e non zero: un interruttore acceso non esclude nessuno.
    assert.equal(esito.dati.esclusiRitirati, null)
    assert.equal(esito.dati.esclusiArchiviate, null)
    assert.equal(esito.dati.corsiGuardati, 4)
    // `conVoti: false` riporta dentro anche chi non ha nessun voto.
    assert.equal(esito.dati.persone.length, 5)
    assert.ok(rigaDi(esito, neri))
    assert.ok(rigaDi(esito, gialli))
    assert.equal(rigaDi(esito, gialli).media, null)
    assert.equal(rigaDi(esito, gialli).sufficiente, false)
  })

  it('con i soli ritirati accesi resta acceso il conto delle archiviate', async () => {
    const esito = await api.chiama(archivio, 'persone.medie', { ritirati: true })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.esclusiRitirati, null)
    assert.equal(esito.dati.esclusiArchiviate, 1)
  })

  it('una «cerca» senza lettere né cifre lo dichiara: cercaIgnorato', async () => {
    const senza = await api.chiama(archivio, 'persone.medie', {})
    const chiocciola = await api.chiama(archivio, 'persone.medie', { cerca: '@' })
    assert.equal(chiocciola.ok, true, JSON.stringify(chiocciola))
    // Il filtro si è spento da solo, e la busta lo dice.
    assert.equal(chiocciola.dati.cerca, '@')
    assert.equal(chiocciola.dati.cercaIgnorato, true)
    assert.equal(chiocciola.dati.persone.length, senza.dati.persone.length)

    const vera = await api.chiama(archivio, 'persone.medie', { cerca: 'rossi' })
    assert.equal(vera.ok, true, JSON.stringify(vera))
    assert.equal(vera.dati.cercaIgnorato, false)
    assert.equal(vera.dati.persone.length, 1)
    assert.equal(vera.dati.persone[0].allievoId, rossi.id)
  })
})
