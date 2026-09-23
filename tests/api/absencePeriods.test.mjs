// Le assenze contate **per periodo**: che si spezzino, che tornino, e che
// dicano chi è peggiorato.
//
// La cifra che questa lettura dava prima era una sola per l'anno, e una sola
// per l'anno è la cifra che nasconde proprio la cosa che si guarda: quattro
// UD nel primo semestre e dodici nel secondo fanno la stessa media di dodici
// e quattro, e le due persone non hanno lo stesso problema. Il corredo qui
// sotto è costruito attorno a quel caso — una persona che migliora e una che
// peggiora, con le stesse cifre in totale — perché una prova che non
// distinguesse le due non proverebbe niente di quel che è stato aggiunto.
//
// Tre cose che si rompono in silenzio, e che qui hanno una prova ciascuna:
//
//   1. **La somma che non torna.** I periodi partizionano l'intervallo, quindi
//      `ud` e `ore` dei pezzi devono ridare esattamente quelli della riga. Un
//      estremo scritto `<` invece di `<=` farebbe sparire le lezioni di un
//      giorno solo — l'ultimo del semestre — e nessuno guarderebbe mai proprio
//      quel giorno.
//   2. **`udPreviste` spalmato.** È il denominatore che si stampa sui
//      rapporti, e due semestri di lunghezza diversa hanno due monte ore
//      diversi: qui il confine cade a fine novembre apposta — tre mesi contro
//      sette — così un denominatore diviso a metà invece che ricalcolato si
//      vede a occhio nudo.
//   3. **Il semestre che non c'è.** Un `semestreId` inventato deve sollevare:
//      una busta vuota si rilegge come «non ha assenze in quel semestre», che
//      è una frase detta con sicurezza su una domanda che non si è capita.
//
// E la soglia, che è il guasto da cui è nato metà di questo file: era
// dichiarata «da 0 a 1» nell'ingresso e ripiegava su `impostazioni.
// sogliaAssenza`, che sta fra 0 e 100. `0.065 > 20` è falso per chiunque,
// quindi `oltreSoglia` era **sempre** falso e il contatore in cima sempre
// zero, sotto una busta per il resto giusta. Le prove della soglia stanno qui
// e non altrove perché è qui che si è visto.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-api-periodi-'))
const lavoro = percorso.join(radice, 'lavoro')
const dati = percorso.join(lavoro, 'registro')
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

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
 * Il confine fra i due semestri, spostato a fine novembre apposta.
 *
 * Con la spartizione usuale — fine gennaio — i due semestri sono lunghi quasi
 * uguali, e due denominatori quasi uguali non distinguono «ricalcolato» da
 * «diviso a metà». Tre mesi contro sette lo distinguono a colpo d'occhio.
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
    creaAllievo, creaAnno, creaClasse, creaCorso, creaLezione, creaMateria,
  } = api

  archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  await archivio.apri(null)
  await archivio.creaAnno(
    creaAnno(DAL, AL, undefined, CONFINE),
    Uri.file(percorso.join(dati, '2026-2027.registro')),
  )
  const anno = archivio.registro.anni[0]
  ;[primoSemestre, secondoSemestre] = anno.semestri

  classe = creaClasse(anno.id, 'I MEC A')
  peggiora = creaAllievo('Rossi', 'Mario')
  migliora = creaAllievo('Bianchi', 'Anna')
  classe.allievi.push(peggiora, migliora)

  const matematica = creaMateria('Matematica')
  const storia = creaMateria('Storia')

  // Il corso con l'orario fisso: è quello che dà un `udPreviste` che viene dal
  // calendario e non dalle ore scritte a mano — cioè il denominatore che va
  // ricalcolato per periodo.
  conOrario = creaCorso(classe.id, matematica.id, 'I MEC A — Matematica')
  conOrario.orario = [{ id: 'ric-periodi-0001', giorno: MARTEDI, inizio: '08:20', durataMin: 90, aula: '' }]

  // Il corso senza orario, con ore **solo nel primo semestre**: serve a
  // provare che `corsi` per periodo non si somma. Chi ha caselle qui e in
  // matematica ha due corsi nel primo semestre e uno nel secondo, e il totale
  // resta due — non tre.
  senzaOrario = creaCorso(classe.id, storia.id, 'I MEC A — Storia')
  senzaOrario.orario = []

  const ore = []
  for (const giorno of [...PRIMO, ...SECONDO]) {
    ore.push(creaLezione(conOrario.id, giorno, '08:20', 90))
  }
  const oraDiStoria = creaLezione(senzaOrario.id, PRIMO[0], '10:00', 90)
  ore.push(oraDiStoria)

  archivio.modifica((r) => {
    r.impostazioni.pdfAutomatici = 'mai'
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

  // Le due storie, con lo stesso totale e l'ordine opposto. Ogni ora vale due
  // UD — 90 minuti — quindi «una lezione assente» è due UD e un'ora toccata.
  //
  //   peggiora: primo semestre 1 lezione, secondo 3  →  2 e 6 UD
  //   migliora: primo semestre 3 lezioni, secondo 1  →  6 e 2 UD
  await segna(oraDel(PRIMO[0]), peggiora, 'assente')
  for (const giorno of SECONDO) await segna(oraDel(giorno), peggiora, 'assente')

  for (const giorno of PRIMO) await segna(oraDel(giorno), migliora, 'assente')
  await segna(oraDel(SECONDO[0]), migliora, 'assente')

  // Storia, solo nel primo semestre e solo per chi peggiora: è il secondo
  // corso che fa dire «due corsi» al totale e «due, poi uno» ai periodi.
  await segna(oraDiStoria, peggiora, 'assente')

  // Le presenze segnate sulle ore rimaste: l'appello fatto è il denominatore
  // onesto, e senza nessuna casella `udConAppello` resterebbe a zero e
  // `quotaSuAppello` nulla dappertutto.
  await segna(oraDel(PRIMO[1]), peggiora, 'presente')
  await segna(oraDel(PRIMO[2]), peggiora, 'presente')
  await segna(oraDel(SECONDO[1]), migliora, 'presente')
  await segna(oraDel(SECONDO[2]), migliora, 'presente')
})

after(() => {
  archivio?.dispose()
  rmSync(radice, { recursive: true, force: true })
})

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
    // Gli estremi dei periodi sono quelli dei semestri, e la busta dichiara la
    // loro unione: `dal` del primo e `al` dell'ultimo.
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

  // La ragione per cui tutto questo esiste: due persone con lo stesso totale e
  // due storie opposte. Prima uscivano dalla stessa busta con la stessa cifra.
  it('chi peggiora e chi migliora hanno lo stesso totale e periodi rovesciati', async () => {
    const esito = await chiedi({})
    const giu = rigaDi(esito, peggiora)
    const su = rigaDi(esito, migliora)

    // Otto UD contro otto: matematica dà 2 e 6 all'uno, 6 e 2 all'altro, e le
    // due di storia stanno nel primo semestre di chi peggiora.
    assert.equal(giu.ud, 10)
    assert.equal(su.ud, 8)

    assert.equal(vocePer(giu, primoSemestre).ud, 4)
    assert.equal(vocePer(giu, secondoSemestre).ud, 6)
    assert.equal(vocePer(su, primoSemestre).ud, 6)
    assert.equal(vocePer(su, secondoSemestre).ud, 2)

    // Le ore, che non sono le UD: una lezione da 90 minuti è **un'ora
    // toccata** e due unità didattiche.
    assert.equal(vocePer(giu, primoSemestre).ore, 2)
    assert.equal(vocePer(giu, secondoSemestre).ore, 3)
  })

  // `corsi` è l'unico conto che fra i periodi non si somma, ed è giusto così:
  // due semestri della stessa materia sono un corso solo.
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

  // Una busta vuota si rilegge come «non ne ha»: è la frase sbagliata detta
  // con sicurezza, e per un id che non esiste la risposta è un errore.
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

  // Gli estremi veri, non quelli del semestre: una quota calcolata su un
  // denominatore più largo di quel che si è chiesto è più bassa del vero, e
  // nessuno che la legga se ne accorge.
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

    // La lezione del 1° settembre resta fuori dal taglio: chi peggiora perde
    // le due UD di matematica e le due di storia di quel giorno.
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
    // Tre mesi contro sette: il secondo ne prevede di più, e non «la metà».
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
  // Il periodo stretto serve a far salire le quote: cinque martedì in
  // settembre sono dieci UD previste di matematica, e due lezioni saltate su
  // quelle sono il quaranta per cento — sopra il venti del registro.
  const settembre = { dal: '2026-09-01', al: '2026-09-30' }

  it('la soglia del registro è in cifra tonda, e la busta la rimanda com’è', async () => {
    const esito = await chiedi(settembre)
    assert.equal(esito.dati.sogliaUsata, esito.dati.sogliaDelRegistro)
    assert.equal(esito.dati.sogliaUsata, archivio.registro.impostazioni.sogliaAssenza)
    // Venti, non 0,2: è la scala di `impostazioni.sogliaAssenza`, quella che i
    // modelli dei rapporti stampano come «{{sogliaAssenza}}%».
    assert.equal(esito.dati.sogliaUsata, 20)
  })

  // Il guasto per cui questa prova esiste: `0.065 > 20` è falso per chiunque,
  // quindi nessuno è mai stato segnalato e il contatore in cima è sempre stato
  // zero, sotto sette righe con delle assenze vere.
  it('chi supera la soglia del registro è segnalato, e il contatore lo conta', async () => {
    const esito = await chiedi(settembre)
    const su = rigaDi(esito, migliora)
    // Sei UD su dieci previste di matematica più due di storia: il sessanta
    // per cento abbondante, e comunque sopra il venti.
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

  // Zero vuol dire «non segnalare», ed è così che si spengono gli avvisi nei
  // rapporti: vale anche qui, e vale anche dentro i periodi.
  it('la soglia a zero spegne tutto, righe e periodi', async () => {
    const esito = await chiedi({ ...settembre, soglia: 0 })
    assert.equal(esito.dati.oltreSoglia, 0)
    for (const riga of esito.dati.persone) {
      assert.equal(riga.oltreSoglia, false)
      assert.ok(riga.periodi.every((p) => p.oltreSoglia === false))
    }
  })

  // La colonna per cui il raggruppamento esiste: chi sfonda in un semestre lo
  // sfonda anche se l'anno intero lo diluisce.
  it('si può essere oltre soglia in un periodo e non nell’altro', async () => {
    const esito = await chiedi({})
    const giu = rigaDi(esito, peggiora)
    const primo = vocePer(giu, primoSemestre)
    const secondo = vocePer(giu, secondoSemestre)
    // Le quote dei due periodi sono diverse, e la soglia si giudica su
    // ciascuna con la stessa cifra dichiarata in cima.
    const soglia = esito.dati.sogliaUsata
    assert.equal(primo.oltreSoglia, primo.quota !== null && primo.quota * 100 > soglia)
    assert.equal(secondo.oltreSoglia, secondo.quota !== null && secondo.quota * 100 > soglia)

    // Con una soglia scelta fra le due quote, uno dei due periodi è oltre e
    // l'altro no: è la differenza che una cifra sola sull'anno cancellava.
    const fra = Math.round(((primo.quota + secondo.quota) / 2) * 100)
    const mirata = await chiedi({ soglia: fra })
    const suoi = rigaDi(mirata, peggiora).periodi
    assert.notEqual(suoi[0].oltreSoglia, suoi[1].oltreSoglia)
  })
})

describe('persone.assenze: un anno senza semestri', () => {
  // Il raggruppamento non sparisce mai: senza semestri ne esce **uno** che
  // copre tutto, con l'id vuoto. Chi legge la busta ha una strada sola, e non
  // deve scrivere il caso «periodi assenti» che nessuno prova mai.
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
