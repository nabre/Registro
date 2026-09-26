// Le assenze **per periodo**: si spezzano, tornano, e dicono chi è peggiorato.
// Il corredo ha una persona che migliora e una che peggiora con lo stesso
// totale. Si prova:
//
//   1. `ud` e `ore` dei periodi ridanno quelli della riga (anche l'ultimo
//      giorno del semestre);
//   2. `udPreviste` si ricalcola per periodo: il confine a fine novembre fa
//      semestri di tre e sette mesi;
//   3. un `semestreId` inventato solleva, invece di una busta vuota.
//
// E la soglia, sulla scala 0–100 di `impostazioni.sogliaAssenza`.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-periodi-')

let api
let archivio
let classe
/** Chi peggiora: poche assenze nel primo semestre, molte nel secondo. */
let peggiora
/** Chi migliora: le stesse cifre in totale, nell'ordine opposto. */
let migliora
let conOrario
let senzaOrario
let primoSemestre
let secondoSemestre

const MARTEDI = 2
const DAL = '2026-09-01'
const AL = '2027-06-30'
/**
 * Il confine a fine novembre: tre mesi contro sette distinguono un
 * denominatore ricalcolato da uno diviso a metà.
 */
const CONFINE = '2026-11-30'

/** I martedì del primo semestre, dove si tengono le ore di settembre. */
const PRIMO = ['2026-09-01', '2026-09-08', '2026-09-15']
/** I martedì del secondo, che qui comincia il 1° dicembre. */
const SECONDO = ['2027-02-02', '2027-02-09', '2027-02-16']

const chiedi = (ingresso = {}) => api.chiama(archivio, 'persone.assenze', ingresso)

/** La riga di una persona nella busta, cercata per id e non per posizione. */
function rigaDi (esito, allievo) {
  return esito.dati.persone.find((p) => p.allievoId === allievo.id)
}

/** La voce di un periodo dentro una riga. */
function vocePer (riga, semestre) {
  return riga.periodi.find((p) => p.semestreId === semestre.id)
}

before(async () => {
  ;({ api, archivio } = await archivioDiProva({
    lavoro,
    dati,
    dal: DAL,
    al: AL,
    confine: CONFINE,
    pdfAutomatici: 'mai',
  }))

  const {
    creaAllievo, creaClasse, creaCorso, creaLezione, creaMateria,
  } = api

  const anno = archivio.registro.anni[0]
  ;[primoSemestre, secondoSemestre] = anno.semestri

  classe = creaClasse(anno.id, 'I MEC A')
  peggiora = creaAllievo('Rossi', 'Mario')
  migliora = creaAllievo('Bianchi', 'Anna')
  classe.allievi.push(peggiora, migliora)

  const matematica = creaMateria('Matematica')
  const storia = creaMateria('Storia')

  // Il corso con l'orario fisso: `udPreviste` viene dal calendario e va
  // ricalcolato per periodo.
  conOrario = creaCorso(classe.id, matematica.id, 'I MEC A — Matematica')
  conOrario.orario = [{ id: 'ric-periodi-0001', giorno: MARTEDI, inizio: '08:20', durataMin: 90, aula: '' }]

  // Il corso senza orario, con ore **solo nel primo semestre**: `corsi` per
  // periodo non si somma (due, poi uno; totale due).
  senzaOrario = creaCorso(classe.id, storia.id, 'I MEC A — Storia')
  senzaOrario.orario = []

  const ore = []
  for (const giorno of [...PRIMO, ...SECONDO]) {
    ore.push(creaLezione(conOrario.id, giorno, '08:20', 90))
  }
  const oraDiStoria = creaLezione(senzaOrario.id, PRIMO[0], '10:00', 90)
  ore.push(oraDiStoria)

  archivio.modifica((r) => {
    r.classi.push(classe)
    r.materie.push(matematica, storia)
    r.corsi.push(conOrario, senzaOrario)
    r.lezioni.push(...ore)
  }, ['classi', 'corsi', 'lezioni', 'registro'])

  /** L'ora di matematica di quel giorno: le si ritrova per data. */
  const oraDel = (giorno) => ore.find((l) => l.corsoId === conOrario.id && l.data === giorno)

  const segna = (lezione, allievo, stato) => api.chiama(archivio, 'ore.appello.riga', {
    lezioneId: lezione.id, allievoId: allievo.id, stato,
  })

  // Stesso totale, ordine opposto. Ogni ora vale due UD (90 minuti):
  //
  //   peggiora: primo semestre 1 lezione, secondo 3  →  2 e 6 UD
  //   migliora: primo semestre 3 lezioni, secondo 1  →  6 e 2 UD
  await segna(oraDel(PRIMO[0]), peggiora, 'assente')
  for (const giorno of SECONDO) await segna(oraDel(giorno), peggiora, 'assente')

  for (const giorno of PRIMO) await segna(oraDel(giorno), migliora, 'assente')
  await segna(oraDel(SECONDO[0]), migliora, 'assente')

  // Storia, solo nel primo semestre e solo per chi peggiora.
  await segna(oraDiStoria, peggiora, 'assente')

  // Le presenze sulle ore rimaste: senza, `udConAppello` sarebbe zero e
  // `quotaSuAppello` nulla.
  await segna(oraDel(PRIMO[1]), peggiora, 'presente')
  await segna(oraDel(PRIMO[2]), peggiora, 'presente')
  await segna(oraDel(SECONDO[1]), migliora, 'presente')
  await segna(oraDel(SECONDO[2]), migliora, 'presente')
})

after(() => smonta(radice, archivio))

describe('persone.assenze: il conto si raggruppa per periodo', () => {
  it('senza chiedere niente, i periodi sono i due semestri e stanno in cima', async () => {
    const esito = await chiedi({})
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.periodi.length, 2)
    assert.deepEqual(esito.dati.periodi.map((p) => p.numero), [1, 2])
    assert.deepEqual(
      esito.dati.periodi.map((p) => p.semestreId),
      [primoSemestre.id, secondoSemestre.id],
    )
    // Gli estremi dei periodi sono quelli dei semestri, e la busta ne dichiara
    // l'unione.
    assert.equal(esito.dati.periodi[0].dal, primoSemestre.inizio)
    assert.equal(esito.dati.periodi[1].al, secondoSemestre.fine)
    assert.equal(esito.dati.dal, esito.dati.periodi[0].dal)
    assert.equal(esito.dati.al, esito.dati.periodi[1].al)
  })

  it('ogni persona porta dentro una voce per periodo, nello stesso ordine', async () => {
    const esito = await chiedi({})
    assert.equal(esito.dati.persone.length, 2)
    for (const riga of esito.dati.persone) {
      assert.deepEqual(
        riga.periodi.map((p) => p.semestreId),
        esito.dati.periodi.map((p) => p.semestreId),
      )
    }
  })

  it('la somma dei periodi torna il totale della riga, per ud e per ore', async () => {
    const esito = await chiedi({})
    for (const riga of esito.dati.persone) {
      const ud = riga.periodi.reduce((somma, p) => somma + p.ud, 0)
      const ore = riga.periodi.reduce((somma, p) => somma + p.ore, 0)
      assert.equal(ud, riga.ud, `ud di ${riga.nomeCompleto}`)
      assert.equal(ore, riga.ore, `ore di ${riga.nomeCompleto}`)
    }
  })

  // Stesso totale, storie opposte.
  it('chi peggiora e chi migliora hanno lo stesso totale e periodi rovesciati', async () => {
    const esito = await chiedi({})
    const giu = rigaDi(esito, peggiora)
    const su = rigaDi(esito, migliora)

    // Matematica dà 2 e 6 all'uno, 6 e 2 all'altro, più le due di storia nel primo
    // semestre di chi peggiora.
    assert.equal(giu.ud, 10)
    assert.equal(su.ud, 8)

    assert.equal(vocePer(giu, primoSemestre).ud, 4)
    assert.equal(vocePer(giu, secondoSemestre).ud, 6)
    assert.equal(vocePer(su, primoSemestre).ud, 6)
    assert.equal(vocePer(su, secondoSemestre).ud, 2)

    // Le ore non sono le UD: una lezione da 90' è un'ora toccata e due UD.
    assert.equal(vocePer(giu, primoSemestre).ore, 2)
    assert.equal(vocePer(giu, secondoSemestre).ore, 3)
  })

  // `corsi` non si somma fra periodi: la stessa materia nei due semestri è un
  // corso.
  it('i corsi per periodo non si sommano: il totale è l’unione', async () => {
    const esito = await chiedi({})
    const giu = rigaDi(esito, peggiora)
    assert.equal(vocePer(giu, primoSemestre).corsi, 2)
    assert.equal(vocePer(giu, secondoSemestre).corsi, 1)
    // Due, non tre: matematica c'è in tutti e due i periodi e resta un corso.
    assert.equal(giu.corsi, 2)
  })
})

describe('persone.assenze: un periodo solo', () => {
  it('con «semestreId» il periodo è uno, e le cifre sono quelle di quel semestre', async () => {
    const tutti = await chiedi({})
    const solo = await chiedi({ semestreId: secondoSemestre.id })
    assert.equal(solo.ok, true, JSON.stringify(solo))
    assert.equal(solo.dati.periodi.length, 1)
    assert.equal(solo.dati.periodi[0].semestreId, secondoSemestre.id)
    assert.equal(solo.dati.dal, secondoSemestre.inizio)
    assert.equal(solo.dati.al, secondoSemestre.fine)

    const giu = rigaDi(solo, peggiora)
    const suoSecondo = vocePer(rigaDi(tutti, peggiora), secondoSemestre)
    assert.equal(giu.periodi.length, 1)
    assert.equal(giu.ud, suoSecondo.ud)
    assert.equal(giu.ore, suoSecondo.ore)
    assert.equal(giu.udPreviste, suoSecondo.udPreviste)
    assert.equal(giu.periodi[0].ud, suoSecondo.ud)
  })

  // Un id che non esiste è un errore, non una busta vuota.
  it('un semestre inventato è «non-trovato», non un elenco vuoto', async () => {
    const esito = await chiedi({ semestreId: 'sem-inventato-0001' })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'non-trovato')
  })

  it('con «dal» e «al» dentro un semestre solo, il periodo è uno senza chiederlo', async () => {
    const esito = await chiedi({ dal: '2026-09-01', al: '2026-10-31' })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.periodi.length, 1)
    assert.equal(esito.dati.periodi[0].semestreId, primoSemestre.id)
    assert.equal(esito.dati.periodi[0].al, '2026-10-31')
  })

  // Gli estremi veri, non quelli del semestre: un denominatore più largo del
  // chiesto dà una quota più bassa del vero.
  it('«dal» e «al» che tagliano a metà i semestri li intersecano', async () => {
    const esito = await chiedi({ dal: '2026-09-08', al: '2027-03-31' })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.periodi.length, 2)
    assert.equal(esito.dati.periodi[0].dal, '2026-09-08')
    assert.equal(esito.dati.periodi[0].al, primoSemestre.fine)
    assert.equal(esito.dati.periodi[1].dal, secondoSemestre.inizio)
    assert.equal(esito.dati.periodi[1].al, '2027-03-31')
    assert.equal(esito.dati.dal, '2026-09-08')
    assert.equal(esito.dati.al, '2027-03-31')

    // La lezione del 1° settembre resta fuori dal taglio.
    const giu = rigaDi(esito, peggiora)
    assert.equal(vocePer(giu, primoSemestre).ud, 0)
    assert.equal(giu.ud, 6)
  })
})

describe('persone.assenze: le UD previste si ricalcolano per periodo', () => {
  it('due semestri di lunghezza diversa hanno due denominatori diversi', async () => {
    const esito = await chiedi({})
    const giu = rigaDi(esito, peggiora)
    const primo = vocePer(giu, primoSemestre)
    const secondo = vocePer(giu, secondoSemestre)

    assert.ok(primo.udPreviste > 0, 'il primo semestre prevede delle UD')
    assert.ok(secondo.udPreviste > 0, 'il secondo semestre prevede delle UD')
    // Tre mesi contro sette: il secondo ne prevede di più, non «la metà».
    assert.ok(
      secondo.udPreviste > primo.udPreviste,
      `previste: ${primo.udPreviste} e ${secondo.udPreviste}`,
    )
  })

  it('i denominatori dei periodi sommano quello della riga', async () => {
    const esito = await chiedi({})
    for (const riga of esito.dati.persone) {
      const somma = riga.periodi.reduce((quante, p) => quante + p.udPreviste, 0)
      assert.equal(somma, riga.udPreviste, `previste di ${riga.nomeCompleto}`)
    }
  })

  it('la quota di un periodo si fa sul denominatore di quel periodo', async () => {
    const esito = await chiedi({})
    for (const riga of esito.dati.persone) {
      for (const pezzo of riga.periodi) {
        if (pezzo.udPreviste === 0) {
          assert.equal(pezzo.quota, null)
          continue
        }
        const atteso = Math.round((pezzo.ud / pezzo.udPreviste) * 10_000) / 10_000
        assert.equal(pezzo.quota, atteso, `quota di ${riga.nomeCompleto}`)
      }
    }
  })
})

describe('persone.assenze: la soglia, che è una percentuale', () => {
  // Settembre: dieci UD previste di matematica, due lezioni saltate sono il 40%,
  // sopra il 20 del registro.
  const settembre = { dal: '2026-09-01', al: '2026-09-30' }

  it('la soglia del registro è in cifra tonda, e la busta la rimanda com’è', async () => {
    const esito = await chiedi(settembre)
    assert.equal(esito.dati.sogliaUsata, esito.dati.sogliaDelRegistro)
    assert.equal(esito.dati.sogliaUsata, archivio.registro.impostazioni.sogliaAssenza)
    // Venti, non 0,2: la scala di `impostazioni.sogliaAssenza`, stampata dai
    // rapporti come «{{sogliaAssenza}}%».
    assert.equal(esito.dati.sogliaUsata, 20)
  })

  // Soglia e quota confrontate sulla stessa scala: chi la supera è segnalato.
  it('chi supera la soglia del registro è segnalato, e il contatore lo conta', async () => {
    const esito = await chiedi(settembre)
    const su = rigaDi(esito, migliora)
    // Sei UD su dieci di matematica più due di storia: sopra il venti.
    assert.ok(su.quota > 0.2, `quota: ${su.quota}`)
    assert.equal(su.oltreSoglia, true)
    assert.ok(esito.dati.oltreSoglia >= 1, 'almeno una persona oltre soglia in cima')
    assert.equal(
      esito.dati.oltreSoglia,
      esito.dati.persone.filter((p) => p.oltreSoglia).length,
    )
  })

  it('chi sta sotto non è segnalato, e una soglia alta non segnala nessuno', async () => {
    const alta = await chiedi({ ...settembre, soglia: 99 })
    assert.equal(alta.dati.sogliaUsata, 99)
    assert.equal(alta.dati.oltreSoglia, 0)
    assert.ok(alta.dati.persone.every((p) => p.oltreSoglia === false))

    const bassa = await chiedi({ ...settembre, soglia: 1 })
    assert.ok(bassa.dati.oltreSoglia >= 1)
    const soli = await chiedi({ ...settembre, soglia: 1, soloOltreSoglia: true })
    assert.ok(soli.dati.persone.every((p) => p.oltreSoglia))
  })

  // Zero vuol dire «non segnalare», anche dentro i periodi.
  it('la soglia a zero spegne tutto, righe e periodi', async () => {
    const esito = await chiedi({ ...settembre, soglia: 0 })
    assert.equal(esito.dati.oltreSoglia, 0)
    for (const riga of esito.dati.persone) {
      assert.equal(riga.oltreSoglia, false)
      assert.ok(riga.periodi.every((p) => p.oltreSoglia === false))
    }
  })

  // Si può sfondare in un semestre anche se l'anno lo diluisce.
  it('si può essere oltre soglia in un periodo e non nell’altro', async () => {
    const esito = await chiedi({})
    const giu = rigaDi(esito, peggiora)
    const primo = vocePer(giu, primoSemestre)
    const secondo = vocePer(giu, secondoSemestre)
    // La soglia si giudica su ciascun periodo con la stessa cifra.
    const soglia = esito.dati.sogliaUsata
    assert.equal(primo.oltreSoglia, primo.quota !== null && primo.quota * 100 > soglia)
    assert.equal(secondo.oltreSoglia, secondo.quota !== null && secondo.quota * 100 > soglia)

    // Con una soglia fra le due quote, un periodo è oltre e l'altro no.
    const fra = Math.round(((primo.quota + secondo.quota) / 2) * 100)
    const mirata = await chiedi({ soglia: fra })
    const suoi = rigaDi(mirata, peggiora).periodi
    assert.notEqual(suoi[0].oltreSoglia, suoi[1].oltreSoglia)
  })
})

describe('persone.assenze: un anno senza semestri', () => {
  // Senza semestri esce **un** periodo con l'id vuoto: chi legge ha una strada
  // sola.
  it('resta un periodo solo, con l’id vuoto e le cifre del totale', async () => {
    const anno = archivio.registro.anni[0]
    const suoi = anno.semestri
    archivio.modifica((r) => { r.anni[0].semestri = [] }, ['registro'])
    try {
      const esito = await chiedi({})
      assert.equal(esito.ok, true, JSON.stringify(esito))
      assert.equal(esito.dati.periodi.length, 1)
      assert.equal(esito.dati.periodi[0].semestreId, '')
      assert.equal(esito.dati.periodi[0].numero, 0)
      assert.equal(esito.dati.periodi[0].dal, esito.dati.dal)
      assert.equal(esito.dati.periodi[0].al, esito.dati.al)

      for (const riga of esito.dati.persone) {
        assert.equal(riga.periodi.length, 1)
        assert.equal(riga.periodi[0].ud, riga.ud)
        assert.equal(riga.periodi[0].ore, riga.ore)
        assert.equal(riga.periodi[0].udPreviste, riga.udPreviste)
        assert.equal(riga.periodi[0].corsi, riga.corsi)
      }
    } finally {
      archivio.modifica((r) => { r.anni[0].semestri = suoi }, ['registro'])
    }
  })
})
