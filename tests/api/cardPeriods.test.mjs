// `persone.scheda` raggruppata per semestre: la china, non il livello.
//
// La scheda diceva «37,5% di assenza» sull'anno, e chi la leggeva — un tutore,
// un capo apprendista — non poteva sapere se quel numero veniva da un semestre
// storto e uno pulito o da dieci mesi uguali. Sono due situazioni opposte con
// la stessa cifra sopra, e la seconda non si segue, la prima sì.
//
// Il corredo di questo file è costruito apposta perché le due letture siano
// **diverse**: nel corso di Storia la persona perde quattro UD su otto nel
// primo semestre e due su otto nel secondo — 50% contro 25%, con 37,5% in
// mezzo — e prende due voti buoni prima di Natale e uno brutto dopo. Un
// raggruppamento che sbagliasse denominatore o pesi darebbe tre numeri uguali,
// che è esattamente il guasto che non si vede.
//
// Quel che si prova, oltre alla forma:
//
//   1. **Quali conti sono additivi fra periodi.** `udPreviste`, `udAssenza`,
//      `ritardi` e `prove` sommati sui periodi devono tornare il totale. Se
//      non tornassero, uno dei due livelli guarderebbe giorni che l'altro non
//      guarda — periodi che si sovrappongono, o un buco fra i due.
//   2. **Quali non lo sono, e non devono diventarlo.** `assenza`, `presenza` e
//      `media`: qui si prova il contrario, cioè che il totale **non** è la
//      media dei periodi. Due prove al primo semestre e una al secondo fanno
//      una media d'anno pesata sulle prove (4,67), non a metà strada fra le
//      due medie di semestre (4,25).
//   3. **`udPreviste` non si dimezza.** Il corso con l'orario fisso ha due
//      semestri di lunghezza diversa, e il monte ore dei due è diverso: chi
//      ricavasse le previste di un periodo dividendo il totale per due
//      scriverebbe quote che non tornano col foglio che qualcuno firma.
//   4. **Il periodo viene da `common/filters.ts`.** `dal` e `al` erano
//      dichiarati a mano in questa procedura, e il ripiego scritto a mano —
//      `'0000-01-01'`/`'9999-12-31'` quando `intervalloAnno` torna `null` —
//      faceva contare **tutto il tempo** su un anno senza semestri. Qui c'è
//      una classe di un anno così, con un'ora datata otto anni prima, e la
//      scheda non la deve vedere.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-api-periodi-scheda-'))
const lavoro = percorso.join(radice, 'lavoro')
const dati = percorso.join(lavoro, 'registro')
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

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
 * Il confine fra i due semestri, spostato apposta a fine dicembre.
 *
 * Con il confine di serie — fine gennaio — i due semestri di quest'anno hanno
 * per caso lo stesso numero di martedì dentro, e la prova che `udPreviste` non
 * si ricava dividendo il totale per due passerebbe anche a chi lo dividesse.
 * Spostato qui, il primo semestre è corto e il secondo lungo, che è del resto
 * il caso vero di parecchie sedi.
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
/** Otto anni prima dell'anno nudo: quel che il ripiego a `0000-01-01` contava. */
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
    creaAllievo, creaAnno, creaClasse, creaCorso, creaLezione, creaMateria, creaValutazione,
  } = api

  archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  await archivio.apri(null)
  await archivio.creaAnno(
    creaAnno(DAL, AL, undefined, CONFINE),
    Uri.file(percorso.join(dati, '2026-2027.registro')),
  )
  const anno = archivio.registro.anni[0]
  const annoId = anno.id
  ;[primo, secondo] = anno.semestri

  classe = creaClasse(annoId, 'I MEC A')
  rossi = creaAllievo('Rossi', 'Maria')
  // Una seconda persona in classe: la matrice si compone su tutti gli
  // iscritti, e una classe da uno solo nasconderebbe l'errore di chi prendesse
  // la riga sbagliata perché ce n'è una sola.
  const bianchi = creaAllievo('Bianchi', 'Luca')
  classe.allievi.push(rossi, bianchi)

  const materiaStoria = creaMateria('Storia')
  const materiaMatematica = creaMateria('Matematica')

  // Senza orario fisso: `udPrevisteDaOrario` torna zero e il monte ore diventa
  // quello delle ore a calendario, che qui sono otto UD per semestre esatte.
  storia = creaCorso(classe.id, materiaStoria.id, 'I MEC A — Storia')
  storia.orario = []

  // Con l'orario fisso: il monte ore dei due semestri è diverso, perché i due
  // semestri hanno un numero diverso di martedì dentro.
  matematica = creaCorso(classe.id, materiaMatematica.id, 'I MEC A — Matematica')
  matematica.orario = [
    { id: 'ric-periodi-0001', giorno: MARTEDI, inizio: '08:20', durataMin: 90, aula: '' },
  ]

  /** Quattro martedì per semestre, tutti da 90' — cioè due UD ciascuno. */
  const primeOre = ['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22']
    .map((data) => creaLezione(storia.id, data, '08:20', 90))
  const secondeOre = ['2027-02-02', '2027-02-09', '2027-02-16', '2027-02-23']
    .map((data) => creaLezione(storia.id, data, '08:20', 90))

  // L'anno senza semestri, con la sua classe, il suo corso e due ore: una
  // dentro il suo calendario e una di otto anni prima. Sta nello stesso
  // registro perché `persone.scheda` risolve il periodo **sull'anno della
  // classe della persona**, non sull'anno in uso, e due anni aperti insieme
  // sono il caso in cui quella differenza si vede.
  nuda = creaClasse(NUDO.id, 'Corso serale')
  gialli = creaAllievo('Gialli', 'Ivo')
  nuda.allievi.push(gialli)
  corsoNudo = creaCorso(nuda.id, materiaStoria.id, 'Corso serale — Storia')
  corsoNudo.orario = []
  const oraNuda = creaLezione(corsoNudo.id, '2028-10-03', '08:20', 90)
  const oraFuoriAnno = creaLezione(corsoNudo.id, FUORI_ANNO, '08:20', 90)

  archivio.modifica((r) => {
    r.impostazioni.pdfAutomatici = 'mai'
    r.anni.push({ ...NUDO })
    r.classi.push(classe, nuda)
    r.materie.push(materiaStoria, materiaMatematica)
    r.corsi.push(storia, matematica, corsoNudo)
    r.lezioni.push(...primeOre, ...secondeOre, oraNuda, oraFuoriAnno)
  }, ['classi', 'corsi', 'lezioni', 'registro'])

  // Primo semestre: due ore intere perse (quattro UD), un ritardo, una
  // presenza. Quattro UD su otto previste: metà.
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

  // Secondo semestre: un'ora sola persa su quattro. Due UD su otto: un quarto.
  await api.chiama(archivio, 'ore.appello.riga', {
    lezioneId: secondeOre[0].id, allievoId: rossi.id, stato: 'assente',
  })
  for (const ora of secondeOre.slice(1)) {
    await api.chiama(archivio, 'ore.appello.riga', {
      lezioneId: ora.id, allievoId: rossi.id, stato: 'presente',
    })
  }

  // E nell'anno nudo: l'ora dentro il calendario è una presenza, quella di
  // otto anni prima è un'assenza intera. Se la scheda contasse «tutto il
  // tempo» — il ripiego di prima — direbbe due UD perse su quattro.
  await api.chiama(archivio, 'ore.appello.riga', {
    lezioneId: oraNuda.id, allievoId: gialli.id, stato: 'presente',
  })
  await api.chiama(archivio, 'ore.appello.riga', {
    lezioneId: oraFuoriAnno.id, allievoId: gialli.id, stato: 'assente',
  })

  // Due prove buone prima di Natale e una brutta dopo: la media d'anno è
  // pesata sulle prove, e non sta a metà strada fra le due di semestre.
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

after(() => {
  archivio?.dispose()
  rmSync(radice, { recursive: true, force: true })
})

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

    // Gli estremi della busta sono l'unione di quel che si è guardato: il
    // primo giorno del primo periodo e l'ultimo dell'ultimo.
    assert.equal(esito.dati.dal, primo.inizio)
    assert.equal(esito.dati.al, secondo.fine)
  })

  // Un `semestreId` che non è di nessun semestre di quell'anno non è una busta
  // vuota: una busta vuota si legge come «non ha assenze», che è un fatto, e
  // qui il fatto è che non si è guardato niente.
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

  // Chiedere «da dicembre a marzo» tocca due semestri, e le cifre del primo
  // devono essere quelle di dicembre e gennaio — non quelle di tutto il primo
  // semestre. Un denominatore più largo di quel che si è chiesto dà una quota
  // più bassa del vero, e chi la legge non ha nessun modo di accorgersene.
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

    // E le cifre seguono il taglio: in dicembre e gennaio di Storia non c'è
    // nessuna ora, quindi il primo periodo è vuoto e non vale mezzo semestre.
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
        // Gli stessi nomi ai due livelli: due parole per la stessa cosa è il
        // modo più sicuro di far sommare a mano chi legge.
        assert.deepEqual(Object.keys(voce).sort(), ['semestreId', ...NOMI].sort())
        assert.ok(esito.dati.periodi.some((p) => p.semestreId === voce.semestreId))
      }
      for (const nome of NOMI) assert.ok(nome in riga, `manca «${nome}» nel totale`)
    }
  })

  // È il caso per cui questa modifica esiste: 50% e 25% sotto un 37,5% che non
  // racconta né l'uno né l'altro.
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

  // Le tre cifre che **non** si sommano e non si mediano, provate dal verso
  // giusto: che il totale sia quel che il totale è, e non la media dei due.
  it('quote e media non sono la media dei periodi', async () => {
    const esito = await api.chiama(archivio, 'persone.scheda', { allievoId: rossi.id })
    const riga = corsoDi(esito.dati, storia.id)
    const uno = periodoDi(riga, primo.id)
    const due = periodoDi(riga, secondo.id)

    // Due prove da 5 e 6 prima di Natale, una da 3 dopo: la media d'anno è
    // pesata sulle prove (14/3 = 4,67), non la media delle due medie (4,25).
    assert.equal(uno.prove, 2)
    assert.equal(uno.media, 5.5)
    assert.equal(due.prove, 1)
    assert.equal(due.media, 3)
    assert.equal(riga.media, 4.67)
    assert.notEqual(riga.media, (uno.media + due.media) / 2)

    // La presenza allo stesso modo: 4/8 e 6/8 fanno 10/16, che qui coincide
    // con la media solo perché i denominatori sono uguali — e la quota di
    // assenza, dove non lo sono, si vede nella prova qui sopra.
    assert.equal(uno.presenza, 0.5)
    assert.equal(due.presenza, 0.75)
    assert.equal(riga.presenza, 0.625)

    // Il ritardo sta con le presenze e non con le assenze: le UD perse da chi
    // arriva tardi sono già segnate assenti, e contarle due volte è il guasto
    // che `contaComeAssenza` esiste per non far ripetere.
    assert.equal(uno.ritardi, 1)
    assert.equal(due.ritardi, 0)
    assert.equal(riga.ritardi, 1)
  })

  // Il monte ore di un periodo si chiede all'orario con gli estremi di quel
  // periodo. Dividere il totale per due darebbe due numeri uguali, e i due
  // semestri di quest'anno non hanno lo stesso numero di martedì dentro.
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
  // Il ripiego scritto a mano dentro questa procedura era `'0000-01-01'` e
  // `'9999-12-31'`: su un anno senza semestri la scheda non contava l'anno,
  // contava tutto il tempo. Qui l'ora di otto anni prima è quella che il
  // vecchio conto avrebbe messo dentro.
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

    // E le cifre stanno dentro l'anno: due UD previste — l'unica ora del
    // calendario dell'anno — e nessuna assenza. Con il ripiego di prima
    // sarebbero state quattro previste e due perse.
    const riga = corsoDi(esito.dati, corsoNudo.id)
    assert.equal(riga.udPreviste, 2)
    assert.equal(riga.udAssenza, 0)
    assert.equal(riga.periodi[0].udPreviste, 2)
    assert.equal(riga.periodi[0].udAssenza, 0)
  })

  // Quel che il passaggio a `...periodo(...)` **non** doveva cambiare: senza
  // filtri la busta risponde sull'anno della classe, e con `dal`/`al` dentro
  // l'anno risponde su quelli, come faceva il conto scritto a mano.
  it('senza filtri la busta è quella di prima: l’anno della classe', async () => {
    const esito = await api.chiama(archivio, 'persone.scheda', { allievoId: rossi.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.dal, DAL)
    assert.equal(esito.dati.al, AL)
    assert.equal(esito.dati.cognome, 'Rossi')
    assert.equal(esito.dati.classe, 'I MEC A')
    // La zona non è stata chiesta, quindi ci si è dentro: il campo non deve
    // essere caduto insieme al periodo riscritto.
    assert.equal(esito.dati.nellaZona, true)
  })

  it('dal e al dentro l’anno tornano come sono stati chiesti', async () => {
    const esito = await api.chiama(archivio, 'persone.scheda', {
      allievoId: rossi.id, dal: '2026-09-01', al: '2026-09-30',
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.dal, '2026-09-01')
    assert.equal(esito.dati.al, '2026-09-30')
    // Settembre sta tutto nel primo semestre: un periodo solo, e le quattro
    // ore di Storia che ci stanno dentro.
    assert.equal(esito.dati.periodi.length, 1)
    assert.equal(esito.dati.periodi[0].semestreId, primo.id)
    const riga = corsoDi(esito.dati, storia.id)
    assert.equal(riga.udPreviste, 8)
    assert.equal(riga.udAssenza, 4)
  })
})
