// `corso.presenze` raggruppata per semestre: il 23% sull'anno può nascondere
// un 11% e un 50%. Il corredo rende i semestri **diversi**:
//
//   - durano diverso, quindi i due `udPreviste` differiscono e si sommano;
//   - le assenze di Rossi stanno quasi tutte nel secondo;
//   - un voto nel primo e due nel secondo, quindi la media d'anno **non** è la
//     media delle due medie.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-periodi-')

let api
let archivio
let anno
let classe
let rossi
let bianchi
let corso

/** Il martedì: il corso ha una fascia sola, da 90 minuti, cioè due UD. */
const MARTEDI = 2

/** L'anno, e il confine fra i due semestri: scelto corto apposta. */
const ANNO_DAL = '2026-09-01'
const ANNO_AL = '2027-06-30'
const CONFINE = '2026-10-31'

/**
 * Il periodo chiesto quasi sempre: due mesi nel primo semestre e uno nel
 * secondo. Nove martedì nel primo pezzo e quattro nel secondo: due
 * denominatori diversi che si sommano.
 */
const DAL = '2026-09-01'
const AL = '2026-11-30'

/** Nove martedì da due UD: settembre ne ha cinque, ottobre quattro. */
const PREVISTE_PRIMO = 18
/** Quattro martedì da due UD: novembre, fino al trenta. */
const PREVISTE_SECONDO = 8

const chiedi = (ingresso) => api.chiama(archivio, 'corso.presenze', { corsoId: corso.id, ...ingresso })

/** La riga di una persona, e le sue voci per periodo. */
const rigaDi = (dati, allievoId) => dati.righe.find((r) => r.allievoId === allievoId)

before(async () => {
  // Il confine passato per esteso: quello di serie (fine gennaio) farebbe
  // semestri quasi uguali. PDF automatici fermi: qui si provano letture.
  ;({ api, archivio, anno } = await archivioDiProva({
    lavoro,
    dati,
    dal: ANNO_DAL,
    al: ANNO_AL,
    confine: CONFINE,
    pdfAutomatici: 'mai',
  }))

  const {
    creaAllievo, creaClasse, creaCorso, creaLezione, creaMateria, creaValutazione,
  } = api

  classe = creaClasse(anno.id, 'I MEC A')
  rossi = creaAllievo('Rossi', 'Maria')
  bianchi = creaAllievo('Bianchi', 'Luca')
  classe.allievi.push(rossi, bianchi)

  const matematica = creaMateria('Matematica')
  corso = creaCorso(classe.id, matematica.id, 'I MEC A — Matematica')
  corso.orario = [{ id: 'ric-periodi-0001', giorno: MARTEDI, inizio: '08:20', durataMin: 90, aula: '' }]

  // Due ore per semestre: la differenza viene solo da dove stanno le assenze e da
  // quanto prevede l'orario.
  const settembrePrimo = creaLezione(corso.id, '2026-09-01', '08:20', 90)
  const settembreOtto = creaLezione(corso.id, '2026-09-08', '08:20', 90)
  const novembreTre = creaLezione(corso.id, '2026-11-03', '08:20', 90)
  const novembreDieci = creaLezione(corso.id, '2026-11-10', '08:20', 90)

  archivio.modifica((r) => {
    r.classi.push(classe)
    r.materie.push(matematica)
    r.corsi.push(corso)
    r.lezioni.push(settembrePrimo, settembreOtto, novembreTre, novembreDieci)
  }, ['classi', 'corsi', 'lezioni', 'registro'])

  const segna = (lezione, allievo, stato) =>
    api.chiama(archivio, 'ore.appello.riga', { lezioneId: lezione.id, allievoId: allievo.id, stato })

  // Rossi: un'assenza nel primo semestre, tutte e due le ore del secondo. Due UD
  // su diciotto contro quattro su otto: 11% e 50%.
  await segna(settembrePrimo, rossi, 'assente')
  await segna(settembreOtto, rossi, 'presente')
  await segna(novembreTre, rossi, 'assente')
  await segna(novembreDieci, rossi, 'assente')

  // Bianchi: un ritardo. Si conta per ora e non per UD, e si spezza anche lui
  // fra i periodi.
  await segna(settembreOtto, bianchi, 'ritardo')

  // Una prova nel primo e due nel secondo: la media d'anno pesa ogni prova una
  // volta, la media delle medie ogni semestre.
  const primaProva = creaValutazione(corso.id, 'Verifica di settembre', undefined, '2026-09-15')
  primaProva.voti = [
    { allievoId: rossi.id, valore: 5, assente: false },
    { allievoId: bianchi.id, valore: 4, assente: false },
  ]
  const secondaProva = creaValutazione(corso.id, 'Verifica di novembre', undefined, '2026-11-05')
  secondaProva.voti = [{ allievoId: rossi.id, valore: 3, assente: false }]
  const terzaProva = creaValutazione(corso.id, 'Recupero di novembre', undefined, '2026-11-12')
  terzaProva.voti = [{ allievoId: rossi.id, valore: 3, assente: false }]
  for (const prova of [primaProva, secondaProva, terzaProva]) {
    await api.chiama(archivio, 'valutazioni.salva', { valutazione: prova })
  }
})

after(() => smonta(radice, archivio))

describe('corso.presenze: i periodi in cima', () => {
  it('senza semestreId guarda tutti i semestri che l’intervallo tocca', async () => {
    const esito = await chiedi({ dal: DAL, al: AL })
    assert.equal(esito.ok, true, JSON.stringify(esito))

    assert.equal(esito.dati.periodi.length, 2, 'i due semestri dell’anno')
    assert.deepEqual(esito.dati.periodi.map((p) => p.numero), [1, 2])
    assert.deepEqual(
      esito.dati.periodi.map((p) => p.semestreId),
      anno.semestri.map((s) => s.id),
      'gli id dei semestri, in ordine di inizio',
    )
    assert.deepEqual(esito.dati.periodi.map((p) => p.etichetta), ['1° semestre', '2° semestre'])

    // Gli estremi **veri**: il secondo periodo finisce dove finisce la richiesta,
    // non a giugno.
    assert.deepEqual(
      esito.dati.periodi.map((p) => [p.dal, p.al]),
      [['2026-09-01', CONFINE], ['2026-11-01', AL]],
    )
  })

  it('ogni riga porta una voce per periodo, con gli stessi id di quelli in cima', async () => {
    const esito = await chiedi({ dal: DAL, al: AL })
    const ids = esito.dati.periodi.map((p) => p.semestreId)
    assert.equal(esito.dati.righe.length, 2)
    for (const riga of esito.dati.righe) {
      assert.deepEqual(riga.periodi.map((p) => p.semestreId), ids, `${riga.cognome} non ha i due periodi`)
    }
  })

  // I pezzi contati a parte rifanno il totale.
  it('i conti additivi, sommati sui periodi, rifanno il totale', async () => {
    const esito = await chiedi({ dal: DAL, al: AL })

    const somma = (voci, campo) => voci.reduce((totale, voce) => totale + voce[campo], 0)
    for (const campo of ['udPreviste', 'udACalendario', 'oreGuardate']) {
      assert.equal(
        somma(esito.dati.periodi, campo),
        esito.dati[campo],
        `«${campo}» dei periodi non fa quello del totale`,
      )
    }

    for (const riga of esito.dati.righe) {
      for (const campo of ['udConAppello', 'udPresenza', 'udAssenza', 'ritardi', 'minutiRitardo', 'prove']) {
        assert.equal(
          somma(riga.periodi, campo),
          riga[campo],
          `«${campo}» di ${riga.cognome} non si somma fra i periodi`,
        )
      }
    }
  })

  it('il ritardo, che si conta per ora, sta nel periodo della sua ora', async () => {
    const esito = await chiedi({ dal: DAL, al: AL })
    const riga = rigaDi(esito.dati, bianchi.id)
    assert.equal(riga.ritardi, 1)
    assert.deepEqual(riga.periodi.map((p) => p.ritardi), [1, 0])
  })
})

describe('corso.presenze: i denominatori per periodo', () => {
  // `udPrevisteDaOrario` si chiama per periodo, con i suoi estremi: due semestri
  // di lunghezza diversa danno due numeri diversi, non due metà.
  it('due periodi di lunghezza diversa danno due udPreviste diversi, che si sommano', async () => {
    const esito = await chiedi({ dal: DAL, al: AL })
    const [primo, secondo] = esito.dati.periodi

    assert.equal(primo.udPreviste, PREVISTE_PRIMO, 'nove martedì da due UD')
    assert.equal(secondo.udPreviste, PREVISTE_SECONDO, 'quattro martedì da due UD')
    assert.notEqual(primo.udPreviste, secondo.udPreviste, 'i due semestri non durano uguale')
    assert.equal(esito.dati.udPreviste, PREVISTE_PRIMO + PREVISTE_SECONDO)

    // La metà del totale non è nessuno dei due.
    assert.notEqual(primo.udPreviste, esito.dati.udPreviste / 2)
  })

  // Le quote si calcolano sul denominatore del loro periodo, e non si mediano.
  it('la quota di un periodo non è quella dell’anno, e la differenza è tutto', async () => {
    const esito = await chiedi({ dal: DAL, al: AL })
    const riga = rigaDi(esito.dati, rossi.id)
    const [primo, secondo] = riga.periodi

    // Due UD perse su diciotto previste: l'11%.
    assert.equal(primo.udAssenza, 2)
    assert.equal(primo.assenza, 2 / PREVISTE_PRIMO)
    // Quattro su otto: il 50%. Sull'anno diventa il 23%.
    assert.equal(secondo.udAssenza, 4)
    assert.equal(secondo.assenza, 0.5)

    assert.equal(riga.udAssenza, 6)
    assert.equal(riga.assenza, 6 / (PREVISTE_PRIMO + PREVISTE_SECONDO))
    assert.notEqual(riga.assenza, primo.assenza)
    assert.notEqual(riga.assenza, secondo.assenza)
    // Nemmeno la media delle due: peserebbe un semestre corto come uno lungo.
    assert.notEqual(riga.assenza, (primo.assenza + secondo.assenza) / 2)
  })

  it('anche la presenza si ricalcola sul suo denominatore', async () => {
    const esito = await chiedi({ dal: DAL, al: AL })
    const [primo, secondo] = rigaDi(esito.dati, rossi.id).periodi

    // Presenza: due UD su quattro con l'appello nel primo, zero su quattro nel
    // secondo.
    assert.equal(primo.presenza, 0.5)
    assert.equal(secondo.presenza, 0)
    assert.equal(rigaDi(esito.dati, rossi.id).presenza, 0.25)
  })

  it('la media d’anno non è la media delle medie di semestre', async () => {
    const esito = await chiedi({ dal: DAL, al: AL })
    const riga = rigaDi(esito.dati, rossi.id)
    const [primo, secondo] = riga.periodi

    assert.equal(primo.prove, 1)
    assert.equal(primo.media, 5)
    assert.equal(secondo.prove, 2)
    assert.equal(secondo.media, 3)

    // Tre prove d'anno, ciascuna col suo peso: (5 + 3 + 3) / 3.
    assert.equal(riga.prove, 3)
    assert.equal(riga.media, 3.67)
    // La media delle due medie farebbe 4.
    assert.notEqual(riga.media, (primo.media + secondo.media) / 2)
  })

  it('chi non ha voti in un periodo ha media nulla lì, non zero', async () => {
    const esito = await chiedi({ dal: DAL, al: AL })
    const [primo, secondo] = rigaDi(esito.dati, bianchi.id).periodi
    assert.equal(primo.media, 4)
    // Nulla e non zero: in pagella uno zero sarebbe un'insufficienza.
    assert.equal(secondo.media, null)
    assert.equal(secondo.prove, 0)
  })
})

describe('corso.presenze: un periodo solo', () => {
  it('con semestreId risponde su quel semestre e basta', async () => {
    const tutti = await chiedi({ dal: DAL, al: AL })
    const secondo = anno.semestri[1]
    const esito = await chiedi({ dal: DAL, al: AL, semestreId: secondo.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))

    assert.equal(esito.dati.periodi.length, 1)
    assert.equal(esito.dati.periodi[0].semestreId, secondo.id)
    assert.equal(esito.dati.dal, '2026-11-01')
    assert.equal(esito.dati.al, AL)

    // Le stesse cifre della busta senza filtro: il filtro restringe, non ricalcola.
    assert.deepEqual(esito.dati.periodi[0], tutti.dati.periodi[1])
    assert.equal(esito.dati.udPreviste, PREVISTE_SECONDO)

    const riga = rigaDi(esito.dati, rossi.id)
    assert.equal(riga.udAssenza, 4)
    assert.equal(riga.assenza, 0.5)
    assert.equal(riga.media, 3)
    assert.deepEqual(riga.periodi, [rigaDi(tutti.dati, rossi.id).periodi[1]])
  })

  it('un semestreId inventato è un errore, non una busta vuota', async () => {
    // Un id che non è di quest'anno è un errore, con il posto dove trovare quelli
    // veri.
    const esito = await chiedi({ dal: DAL, al: AL, semestreId: 'sem-inventato-0001' })
    assert.equal(esito.ok, false, 'un id che non esiste ha risposto come se ci fosse')
    assert.equal(esito.codice, 'non-trovato')
    assert.match(esito.messaggi.join(' '), /anni\.elenco/)
  })
})

describe('corso.presenze: il periodo tagliato e l’anno senza semestri', () => {
  it('un dal a metà semestre taglia il periodo, e la busta dichiara il taglio', async () => {
    const meta = '2026-09-15'
    const esito = await chiedi({ dal: meta, al: AL })
    assert.equal(esito.ok, true, JSON.stringify(esito))

    const [primo, secondo] = esito.dati.periodi
    // Il `dal` chiesto, non quello del semestre: un denominatore più largo darebbe
    // una quota più bassa del vero.
    assert.equal(primo.dal, meta)
    assert.notEqual(primo.dal, anno.semestri[0].inizio)
    assert.equal(primo.al, CONFINE)
    assert.equal(secondo.dal, '2026-11-01')

    // Sette martedì da metà settembre a fine ottobre, contro nove.
    assert.equal(primo.udPreviste, 14)
    assert.equal(secondo.udPreviste, PREVISTE_SECONDO)
    assert.equal(esito.dati.udPreviste, 14 + PREVISTE_SECONDO)

    // L'assenza del primo settembre è fuori dal taglio: la quota va a zero.
    const riga = rigaDi(esito.dati, rossi.id)
    assert.equal(riga.periodi[0].udAssenza, 0)
    assert.equal(riga.periodi[0].assenza, 0)
    assert.equal(riga.udAssenza, 4)
  })

  it('un anno senza semestri dà comunque un periodo, con le cifre del totale', async () => {
    // Il raggruppamento non sparisce: un array di uno. Un anno senza semestri non
    // è valido (`validation.ts`) ma arriva da un file riparato a mano.
    const veri = anno.semestri
    archivio.modifica((r) => { r.anni[0].semestri = [] }, ['registro'])
    try {
      const esito = await chiedi({ dal: DAL, al: AL })
      assert.equal(esito.ok, true, JSON.stringify(esito))
      assert.equal(esito.dati.periodi.length, 1)

      const solo = esito.dati.periodi[0]
      assert.equal(solo.semestreId, '', 'senza semestri non c’è nessun id da dichiarare')
      assert.equal(solo.numero, 0)
      assert.equal(solo.dal, DAL)
      assert.equal(solo.al, AL)

      // Un periodo solo vuol dire che le sue cifre **sono** il totale.
      assert.equal(solo.udPreviste, esito.dati.udPreviste)
      assert.equal(solo.udACalendario, esito.dati.udACalendario)
      assert.equal(solo.oreGuardate, esito.dati.oreGuardate)

      const riga = rigaDi(esito.dati, rossi.id)
      assert.equal(riga.periodi.length, 1)
      assert.equal(riga.periodi[0].udAssenza, riga.udAssenza)
      assert.equal(riga.periodi[0].assenza, riga.assenza)
      assert.equal(riga.periodi[0].media, riga.media)
    } finally {
      archivio.modifica((r) => { r.anni[0].semestri = veri }, ['registro'])
    }
  })
})
