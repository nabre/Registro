// `persone.scheda` raggruppata per semestre: la china, non il livello. Lo
// stesso 37,5% sull'anno può essere un semestre storto e uno pulito o dieci
// mesi uguali.
//
// Il corredo rende le letture **diverse**: in Storia la persona perde 4 UD su 8
// nel primo semestre e 2 su 8 nel secondo, due voti buoni prima di Natale e uno
// brutto dopo. Si prova:
//
//   1. `udPreviste`, `udAssenza`, `ritardi` e `prove` sommati sui periodi
//      tornano il totale;
//   2. `assenza`, `presenza` e `media` del totale **non** sono la media dei
//      periodi (media d'anno pesata sulle prove: 4,67, non 4,25);
//   3. `udPreviste` di un periodo viene dall'orario, non da una divisione;
//   4. il periodo viene da `common/filters.ts`: su un anno senza semestri non si
//      conta un'ora di otto anni prima.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-periodi-scheda-')

let api
let archivio
let classe
let rossi
/** Il corso senza orario: il monte ore sono le ore a calendario, e le decido io. */
let storia
/** Il corso con l'orario fisso: due UD ogni martedì, e i due semestri non sono uguali. */
let matematica
/** I due semestri veri dell'anno, come il registro li ha costruiti. */
let primo
let secondo

/** La classe dell'anno senza semestri: il ripiego che contava tutto il tempo. */
let nuda
let gialli
let corsoNudo

const DAL = '2026-09-01'
const AL = '2027-06-30'
/**
 * Il confine fra i semestri a fine dicembre: così hanno un numero diverso di
 * martedì, e dividere il totale per due darebbe il numero sbagliato.
 */
const CONFINE = '2026-12-31'
/** Il martedì: è il giorno dell'orario fisso di Matematica. */
const MARTEDI = 2

/** L'anno senza semestri, e la sua ora fuori periodo. */
const NUDO = {
  id: 'ann-nudo-000000000001',
  etichetta: 'Anno senza semestri',
  inizio: '2028-09-01',
  fine: '2029-06-30',
  semestri: [],
  sospensioni: [],
}
/** Otto anni prima dell'anno nudo: fuori da qualunque periodo dell'anno. */
const FUORI_ANNO = '2020-10-06'

/** La riga del corso che si vuole guardare, dalla busta. */
function corsoDi (dati, corsoId) {
  return dati.corsi.find((c) => c.corsoId === corsoId)
}

/** La voce di un semestre dentro la riga di un corso. */
function periodoDi (riga, semestreId) {
  return riga.periodi.find((p) => p.semestreId === semestreId)
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
    creaAllievo, creaClasse, creaCorso, creaLezione, creaMateria, creaValutazione,
  } = api

  const anno = archivio.registro.anni[0]
  const annoId = anno.id
  ;[primo, secondo] = anno.semestri

  classe = creaClasse(annoId, 'I MEC A')
  rossi = creaAllievo('Rossi', 'Maria')
  // Una seconda persona: con una sola non si vedrebbe chi prende la riga
  // sbagliata.
  const bianchi = creaAllievo('Bianchi', 'Luca')
  classe.allievi.push(rossi, bianchi)

  const materiaStoria = creaMateria('Storia')
  const materiaMatematica = creaMateria('Matematica')

  // Senza orario fisso `udPrevisteDaOrario` torna zero e il monte ore sono le ore
  // a calendario: otto UD per semestre.
  storia = creaCorso(classe.id, materiaStoria.id, 'I MEC A — Storia')
  storia.orario = []

  // Con l'orario fisso i due semestri hanno monte ore diversi.
  matematica = creaCorso(classe.id, materiaMatematica.id, 'I MEC A — Matematica')
  matematica.orario = [
    { id: 'ric-periodi-0001', giorno: MARTEDI, inizio: '08:20', durataMin: 90, aula: '' },
  ]

  /** Quattro martedì per semestre, tutti da 90' — cioè due UD ciascuno. */
  const primeOre = ['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22']
    .map((data) => creaLezione(storia.id, data, '08:20', 90))
  const secondeOre = ['2027-02-02', '2027-02-09', '2027-02-16', '2027-02-23']
    .map((data) => creaLezione(storia.id, data, '08:20', 90))

  // L'anno senza semestri, con un'ora dentro il calendario e una di otto anni
  // prima. Sta nello stesso registro perché `persone.scheda` risolve il periodo
  // sull'anno **della classe della persona**, non sull'anno in uso.
  nuda = creaClasse(NUDO.id, 'Corso serale')
  gialli = creaAllievo('Gialli', 'Ivo')
  nuda.allievi.push(gialli)
  corsoNudo = creaCorso(nuda.id, materiaStoria.id, 'Corso serale — Storia')
  corsoNudo.orario = []
  const oraNuda = creaLezione(corsoNudo.id, '2028-10-03', '08:20', 90)
  const oraFuoriAnno = creaLezione(corsoNudo.id, FUORI_ANNO, '08:20', 90)

  archivio.modifica((r) => {
    r.anni.push({ ...NUDO })
    r.classi.push(classe, nuda)
    r.materie.push(materiaStoria, materiaMatematica)
    r.corsi.push(storia, matematica, corsoNudo)
    r.lezioni.push(...primeOre, ...secondeOre, oraNuda, oraFuoriAnno)
  }, ['classi', 'corsi', 'lezioni', 'registro'])

  // Primo semestre: quattro UD perse su otto, un ritardo, una presenza.
  await api.chiama(archivio, 'ore.appello.riga', {
    lezioneId: primeOre[0].id, allievoId: rossi.id, stato: 'assente',
  })
  await api.chiama(archivio, 'ore.appello.riga', {
    lezioneId: primeOre[1].id, allievoId: rossi.id, stato: 'ritardo',
  })
  await api.chiama(archivio, 'ore.appello.riga', {
    lezioneId: primeOre[2].id, allievoId: rossi.id, stato: 'presente',
  })
  await api.chiama(archivio, 'ore.appello.riga', {
    lezioneId: primeOre[3].id, allievoId: rossi.id, stato: 'assente',
  })

  // Secondo semestre: due UD perse su otto.
  await api.chiama(archivio, 'ore.appello.riga', {
    lezioneId: secondeOre[0].id, allievoId: rossi.id, stato: 'assente',
  })
  for (const ora of secondeOre.slice(1)) {
    await api.chiama(archivio, 'ore.appello.riga', {
      lezioneId: ora.id, allievoId: rossi.id, stato: 'presente',
    })
  }

  // Anno nudo: presenza dentro il calendario, assenza otto anni prima (che non
  // deve contare).
  await api.chiama(archivio, 'ore.appello.riga', {
    lezioneId: oraNuda.id, allievoId: gialli.id, stato: 'presente',
  })
  await api.chiama(archivio, 'ore.appello.riga', {
    lezioneId: oraFuoriAnno.id, allievoId: gialli.id, stato: 'assente',
  })

  // Due prove buone prima di Natale e una brutta dopo.
  const primaProva = creaValutazione(storia.id, 'Verifica sulle fonti', undefined, '2026-10-05')
  primaProva.voti = [{ allievoId: rossi.id, valore: 5, assente: false }]
  const secondaProva = creaValutazione(storia.id, 'Verifica sul Medioevo', undefined, '2026-11-09')
  secondaProva.voti = [{ allievoId: rossi.id, valore: 6, assente: false }]
  const terzaProva = creaValutazione(storia.id, 'Verifica sul Rinascimento', undefined, '2027-03-02')
  terzaProva.voti = [{ allievoId: rossi.id, valore: 3, assente: false }]
  for (const prova of [primaProva, secondaProva, terzaProva]) {
    await api.chiama(archivio, 'valutazioni.salva', { valutazione: prova })
  }
})

after(() => smonta(radice, archivio))

describe('persone.scheda: i periodi in cima', () => {
  it('senza semestreId porta i due semestri dell’anno, con i giorni veri', async () => {
    const esito = await api.chiama(archivio, 'persone.scheda', { allievoId: rossi.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.periodi.length, 2)

    const [uno, due] = esito.dati.periodi
    assert.equal(uno.semestreId, primo.id)
    assert.equal(uno.numero, 1)
    assert.equal(uno.dal, primo.inizio)
    assert.equal(uno.al, primo.fine)
    assert.equal(due.semestreId, secondo.id)
    assert.equal(due.numero, 2)
    assert.equal(due.dal, secondo.inizio)
    assert.equal(due.al, secondo.fine)

    // Gli estremi della busta sono l'unione dei periodi guardati.
    assert.equal(esito.dati.dal, primo.inizio)
    assert.equal(esito.dati.al, secondo.fine)
  })

  // Un `semestreId` inventato non è una busta vuota, che si leggerebbe «non ha
  // assenze».
  it('un semestreId inventato è un «non-trovato», non una busta vuota', async () => {
    const esito = await api.chiama(archivio, 'persone.scheda', {
      allievoId: rossi.id, semestreId: 'sem-inventato-0001',
    })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'non-trovato')
    assert.match(esito.messaggi.join(' '), /anni\.elenco/)
  })

  it('con semestreId il periodo è uno solo, e sono i suoi giorni', async () => {
    const esito = await api.chiama(archivio, 'persone.scheda', {
      allievoId: rossi.id, semestreId: secondo.id,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.periodi.length, 1)
    assert.equal(esito.dati.periodi[0].semestreId, secondo.id)
    assert.equal(esito.dati.dal, secondo.inizio)
    assert.equal(esito.dati.al, secondo.fine)
  })

  // «Da dicembre a marzo» interseca i semestri: le cifre del primo sono solo di
  // dicembre, non di tutto il semestre.
  it('dal e al che tagliano i semestri danno periodi intersecati', async () => {
    const esito = await api.chiama(archivio, 'persone.scheda', {
      allievoId: rossi.id, dal: '2026-12-01', al: '2027-03-31',
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.periodi.length, 2)
    assert.deepEqual(
      esito.dati.periodi.map((p) => [p.dal, p.al]),
      [['2026-12-01', primo.fine], [secondo.inizio, '2027-03-31']],
    )
    assert.equal(esito.dati.dal, '2026-12-01')
    assert.equal(esito.dati.al, '2027-03-31')

    // In dicembre di Storia non c'è nessuna ora: il primo periodo è vuoto.
    const riga = corsoDi(esito.dati, storia.id)
    assert.equal(periodoDi(riga, primo.id).udPreviste, 0)
    assert.equal(periodoDi(riga, primo.id).udAssenza, 0)
    assert.equal(periodoDi(riga, secondo.id).udAssenza, 2)
  })
})

describe('persone.scheda: le cifre per periodo', () => {
  it('ogni corso porta una voce per periodo, con gli stessi nomi di campo', async () => {
    const esito = await api.chiama(archivio, 'persone.scheda', { allievoId: rossi.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.corsi.length, 2)

    const NOMI = ['udPreviste', 'udAssenza', 'assenza', 'presenza', 'ritardi', 'prove', 'media']
    for (const riga of esito.dati.corsi) {
      assert.equal(riga.periodi.length, 2)
      for (const voce of riga.periodi) {
        // Gli stessi nomi ai due livelli.
        assert.deepEqual(Object.keys(voce).sort(), ['semestreId', ...NOMI].sort())
        assert.ok(esito.dati.periodi.some((p) => p.semestreId === voce.semestreId))
      }
      for (const nome of NOMI) assert.ok(nome in riga, `manca «${nome}» nel totale`)
    }
  })

  // 50% e 25% sotto un 37,5%.
  it('la quota di un semestre è diversa da quella dell’anno', async () => {
    const esito = await api.chiama(archivio, 'persone.scheda', { allievoId: rossi.id })
    const riga = corsoDi(esito.dati, storia.id)

    assert.equal(riga.udPreviste, 16)
    assert.equal(riga.udAssenza, 6)
    assert.equal(riga.assenza, 0.375)

    assert.equal(periodoDi(riga, primo.id).udPreviste, 8)
    assert.equal(periodoDi(riga, primo.id).udAssenza, 4)
    assert.equal(periodoDi(riga, primo.id).assenza, 0.5)

    assert.equal(periodoDi(riga, secondo.id).udPreviste, 8)
    assert.equal(periodoDi(riga, secondo.id).udAssenza, 2)
    assert.equal(periodoDi(riga, secondo.id).assenza, 0.25)
  })

  it('i conti additivi sommati sui periodi tornano il totale', async () => {
    const esito = await api.chiama(archivio, 'persone.scheda', { allievoId: rossi.id })
    for (const riga of esito.dati.corsi) {
      for (const nome of ['udPreviste', 'udAssenza', 'ritardi', 'prove']) {
        const somma = riga.periodi.reduce((t, voce) => t + voce[nome], 0)
        assert.equal(somma, riga[nome], `«${nome}» del corso ${riga.corso}`)
      }
    }
  })

  // Il totale è quel che è, non la media dei periodi.
  it('quote e media non sono la media dei periodi', async () => {
    const esito = await api.chiama(archivio, 'persone.scheda', { allievoId: rossi.id })
    const riga = corsoDi(esito.dati, storia.id)
    const uno = periodoDi(riga, primo.id)
    const due = periodoDi(riga, secondo.id)

    // Due prove da 5 e 6 prima di Natale, una da 3 dopo: 14/3 = 4,67, non 4,25.
    assert.equal(uno.prove, 2)
    assert.equal(uno.media, 5.5)
    assert.equal(due.prove, 1)
    assert.equal(due.media, 3)
    assert.equal(riga.media, 4.67)
    assert.notEqual(riga.media, (uno.media + due.media) / 2)

    // La presenza allo stesso modo: 4/8 e 6/8 fanno 10/16 (coincide con la media
    // solo perché i denominatori sono uguali).
    assert.equal(uno.presenza, 0.5)
    assert.equal(due.presenza, 0.75)
    assert.equal(riga.presenza, 0.625)

    // Il ritardo sta con le presenze: le UD perse in ritardo sono già assenti
    // (`contaComeAssenza`).
    assert.equal(uno.ritardi, 1)
    assert.equal(due.ritardi, 0)
    assert.equal(riga.ritardi, 1)
  })

  // Il monte ore di un periodo si chiede all'orario con i suoi estremi.
  it('udPreviste di un periodo viene dall’orario, non da una divisione', async () => {
    const esito = await api.chiama(archivio, 'persone.scheda', { allievoId: rossi.id })
    const riga = corsoDi(esito.dati, matematica.id)
    const uno = periodoDi(riga, primo.id)
    const due = periodoDi(riga, secondo.id)

    assert.ok(uno.udPreviste > 0, 'il primo semestre ha dei martedì dentro')
    assert.ok(due.udPreviste > 0, 'il secondo semestre anche')
    assert.notEqual(uno.udPreviste, due.udPreviste)
    assert.notEqual(uno.udPreviste, riga.udPreviste / 2)
    assert.equal(uno.udPreviste + due.udPreviste, riga.udPreviste)
  })
})

describe('persone.scheda: il periodo viene dai filtri comuni', () => {
  // Senza semestri il periodo è l'anno, non tutto il tempo: l'ora di otto anni
  // prima resta fuori.
  it('un anno senza semestri dà un periodo solo, con semestreId vuoto', async () => {
    const esito = await api.chiama(archivio, 'persone.scheda', { allievoId: gialli.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.periodi.length, 1)
    assert.equal(esito.dati.periodi[0].semestreId, '')
    assert.equal(esito.dati.periodi[0].numero, 0)
    assert.equal(esito.dati.periodi[0].dal, NUDO.inizio)
    assert.equal(esito.dati.periodi[0].al, NUDO.fine)
    assert.equal(esito.dati.dal, NUDO.inizio)
    assert.equal(esito.dati.al, NUDO.fine)

    // Due UD previste (l'unica ora dell'anno) e nessuna assenza.
    const riga = corsoDi(esito.dati, corsoNudo.id)
    assert.equal(riga.udPreviste, 2)
    assert.equal(riga.udAssenza, 0)
    assert.equal(riga.periodi[0].udPreviste, 2)
    assert.equal(riga.periodi[0].udAssenza, 0)
  })

  // Senza filtri la busta risponde sull'anno della classe; con `dal`/`al` dentro
  // l'anno risponde su quelli.
  it('senza filtri la busta è quella di prima: l’anno della classe', async () => {
    const esito = await api.chiama(archivio, 'persone.scheda', { allievoId: rossi.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.dal, DAL)
    assert.equal(esito.dati.al, AL)
    assert.equal(esito.dati.cognome, 'Rossi')
    assert.equal(esito.dati.classe, 'I MEC A')
    // La zona non è stata chiesta, quindi ci si è dentro.
    assert.equal(esito.dati.nellaZona, true)
  })

  it('dal e al dentro l’anno tornano come sono stati chiesti', async () => {
    const esito = await api.chiama(archivio, 'persone.scheda', {
      allievoId: rossi.id, dal: '2026-09-01', al: '2026-09-30',
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.dal, '2026-09-01')
    assert.equal(esito.dati.al, '2026-09-30')
    // Settembre sta tutto nel primo semestre: un periodo solo.
    assert.equal(esito.dati.periodi.length, 1)
    assert.equal(esito.dati.periodi[0].semestreId, primo.id)
    const riga = corsoDi(esito.dati, storia.id)
    assert.equal(riga.udPreviste, 8)
    assert.equal(riga.udAssenza, 4)
  })
})
