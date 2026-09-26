// «Importa da un altro registro…» senza disco: `importaRegistro` decide che
// cosa arriva e come si riaggancia, `esitoImportRegistro` lo racconta. I corsi
// arrivano con id nuovi, e carte, piani e regole del calendario passano per la
// mappa di là → qui. Il giro con i due pacchetti lo prova
// `tests/api/importRegisterApi.test.mjs`.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  creaAllievo,
  creaAnno,
  creaAttivita,
  creaClasse,
  creaCorso,
  creaLezione,
  creaMateria,
  creaPiano,
  creaRisorsa,
  esitoImportRegistro,
  importaRegistro,
  registroVuoto,
} from '../../dist-tests/domain.mjs'

/** L'anno scorso: due classi, tre corsi, piani, carte, calendari, regole. */
function dilà () {
  const r = registroVuoto()
  const anno = creaAnno('2025-09-01', '2026-06-30')
  r.anni = [anno]
  r.annoCorrenteId = anno.id
  const mat = creaMateria('Matematica', 'MAT')
  const sto = { ...creaMateria('Storia', 'STO'), colore: '#aa3300' }
  const ing = creaMateria('Inglese', 'ING')
  r.materie = [mat, sto, ing]
  const a = creaClasse(anno.id, 'I MEC A')
  a.allievi.push(creaAllievo('Rossi', 'Maria'), creaAllievo('Bianchi', 'Luca'))
  const b = creaClasse(anno.id, 'II ELE B')
  b.allievi.push(creaAllievo('Verdi', 'Anna'))
  r.classi = [a, b]
  const aMat = creaCorso(a.id, mat.id, 'I MEC A — Matematica')
  const aSto = creaCorso(a.id, sto.id, 'I MEC A — Storia')
  const bMat = creaCorso(b.id, mat.id, 'II ELE B — Matematica')
  r.corsi = [aMat, aSto, bMat]
  const piano = creaPiano(aMat.id)
  piano.obiettivi = ['Le frazioni']
  const tappa = creaAttivita('Esercizi', 1)
  tappa.risorse.push({ ...creaRisorsa('file', 'Scheda'), file: 'archivio/scheda.pdf', nome: 'scheda.pdf' })
  piano.attivita.push(tappa)
  r.piani = [piano, creaPiano(bMat.id), creaPiano(null)]
  r.impostazioni = {
    ...r.impostazioni,
    scala: { min: 1, max: 10, sufficienza: 6, passo: 0.5 },
    passoFineSemestre: 1,
    sogliaAssenza: 25,
    giorniVisibili: [1, 2, 3, 4, 5, 6],
    liste: { tipiSettimana: [{ valore: 'A', testo: 'Settimana A' }] },
    calendario: {
      calendari: [
        { id: 'ics-sede', nome: 'Sede', origine: 'https://esempio.ch/sede.ics', copiatoIl: '2025-09-01T08:00:00Z' },
        { id: 'ics-lab', nome: 'Laboratori', origine: 'C:\\orari\\lab.ics' },
      ],
      regole: [
        { id: 'r1', testo: 'MEC A MAT', corsoId: aMat.id },
        { id: 'r2', testo: 'ELE B MAT', corsoId: bMat.id },
        { id: 'r3', testo: 'Collegio', corsoId: null },
      ],
    },
    intestazione: {
      carte: [
        { id: 'car-prima', sede: 'Scuola A', logo: 'intestazione/car-prima-1.png', altezzaLogo: 14, corsi: [aMat.id, bMat.id] },
        { id: 'car-sera', sede: 'Corsi serali', altezzaLogo: 14, corsi: [aSto.id] },
      ],
      docente: 'Mario Rossi',
      firma: '<p>Mario</p>',
    },
  }
  return { r, a, b, aMat, aSto, bMat, piano, mat, sto }
}

/** L'anno aperto: con «matematica» già scritta a modo suo, e una classe I MEC A. */
function diqua () {
  const r = registroVuoto()
  const anno = creaAnno('2026-09-01', '2027-06-30')
  r.anni = [anno]
  r.annoCorrenteId = anno.id
  const mat = creaMateria(' matematica ')
  r.materie = [mat]
  r.impostazioni = {
    ...r.impostazioni,
    calendario: {
      calendari: [{ id: 'ics-qui', nome: 'Sede', origine: 'https://esempio.ch/sede.ics' }],
      regole: [],
    },
    intestazione: { ...r.impostazioni.intestazione, vecchiaCartellaVista: true },
  }
  return { r, anno, mat }
}

const tutto = (la, annoId, ritocchi = {}) => ({
  annoId,
  impostazioni: true,
  materie: true,
  classi: la.r.classi.map((c) => ({ classeId: c.id, anagrafica: true, corsi: true })),
  piani: true,
  calendari: true,
  ...ritocchi,
})

describe('importaRegistro', () => {
  it('con tutti i blocchi spenti non porta niente', () => {
    const la = dilà()
    const qui = diqua()
    const fatto = importaRegistro(la.r, qui.r, {
      annoId: qui.anno.id,
      impostazioni: false,
      materie: false,
      classi: [],
      piani: true,
      calendari: false,
    })
    assert.equal(fatto.impostazioni, null)
    const portati = [fatto.materieNuove, fatto.classi, fatto.corsi, fatto.piani, fatto.copie]
    assert.deepEqual(portati, [[], [], [], [], []])
  })

  it('le materie si abbinano per nome normalizzato: nascono solo quelle che mancano', () => {
    const la = dilà()
    const qui = diqua()
    const fatto = importaRegistro(la.r, qui.r, tutto(la, qui.anno.id, { classi: [] }))
    assert.deepEqual(fatto.materieNuove.map((m) => m.nome).sort(), ['Inglese', 'Storia'])
    assert.equal(fatto.materieNuove.find((m) => m.nome === 'Storia').colore, '#aa3300')
  })

  it('le classi arrivano con persone e corsi, i corsi sulle materie di qui', () => {
    const la = dilà()
    const qui = diqua()
    const fatto = importaRegistro(la.r, qui.r, tutto(la, qui.anno.id))
    assert.deepEqual(fatto.classi.map((c) => c.nome), ['I MEC A', 'II ELE B'])
    assert.ok(fatto.classi.every((c) => c.annoId === qui.anno.id))
    assert.equal(fatto.classi.reduce((n, c) => n + c.allievi.length, 0), 3)
    assert.equal(fatto.corsi.length, 3)
    // Matematica era qui già: i due corsi di matematica stanno su quella, e
    // la Storia sulla materia nata una volta sola, anche se la chiedono in due.
    assert.equal(fatto.corsi.filter((c) => c.materiaId === qui.mat.id).length, 2)
    const storia = fatto.materieNuove.filter((m) => m.nome === 'Storia')
    assert.equal(storia.length, 1)
    assert.ok(fatto.corsi.some((c) => c.materiaId === storia[0].id))
  })

  it('una classe che qui c’è già con lo stesso nome si salta, e lo si dice', () => {
    const la = dilà()
    const qui = diqua()
    qui.r.classi.push(creaClasse(qui.anno.id, 'i mec a'))
    const fatto = importaRegistro(la.r, qui.r, tutto(la, qui.anno.id))
    assert.deepEqual(fatto.classi.map((c) => c.nome), ['II ELE B'])
    assert.deepEqual(fatto.saltate, ['I MEC A: c’è già'])
    // I corsi della saltata non arrivano, e quel che li nominava nemmeno.
    assert.equal(fatto.corsi.length, 1)
    assert.equal(fatto.piani.length, 1)
    assert.match(esitoImportRegistro(fatto, tutto(la, qui.anno.id)), /saltata I MEC A: c’è già\.$/)
  })

  it('i piani dei corsi portati si riagganciano ai corsi nuovi; gli altri restano là', () => {
    const la = dilà()
    const qui = diqua()
    const scelta = tutto(la, qui.anno.id, {
      classi: [{ classeId: la.a.id, anagrafica: false, corsi: true }],
    })
    const fatto = importaRegistro(la.r, qui.r, scelta)
    assert.equal(fatto.piani.length, 1)
    const piano = fatto.piani[0]
    const nuovoMat = fatto.corsi.find((c) => c.materiaId === qui.mat.id)
    assert.equal(piano.corsoId, nuovoMat.id)
    assert.notEqual(piano.id, la.piano.id)
    assert.deepEqual(piano.obiettivi, ['Le frazioni'])
    // Il file resta col percorso di là: lo ricopia l'host.
    assert.equal(piano.attivita[0].risorse[0].file, 'archivio/scheda.pdf')
    assert.notEqual(piano.attivita[0].risorse[0].id, la.piano.attivita[0].risorse[0].id)
    // Senza anagrafica la classe arriva vuota.
    assert.deepEqual(fatto.classi[0].allievi, [])
  })

  it('senza corsi niente piani, anche col blocco dei piani acceso', () => {
    const la = dilà()
    const qui = diqua()
    const fatto = importaRegistro(la.r, qui.r, tutto(la, qui.anno.id, {
      classi: la.r.classi.map((c) => ({ classeId: c.id, anagrafica: true, corsi: false })),
    }))
    assert.equal(fatto.corsi.length, 0)
    assert.equal(fatto.piani.length, 0)
  })

  it('le impostazioni: quelle di chi insegna sì, il calendario e il segno della cartella no', () => {
    const la = dilà()
    const qui = diqua()
    const fatto = importaRegistro(la.r, qui.r, tutto(la, qui.anno.id, { calendari: false }))
    const imp = fatto.impostazioni
    assert.deepEqual(imp.scala, { min: 1, max: 10, sufficienza: 6, passo: 0.5 })
    assert.equal(imp.passoFineSemestre, 1)
    assert.equal(imp.sogliaAssenza, 25)
    assert.deepEqual(imp.giorniVisibili, [1, 2, 3, 4, 5, 6])
    assert.deepEqual(imp.liste, { tipiSettimana: [{ valore: 'A', testo: 'Settimana A' }] })
    assert.equal(imp.intestazione.docente, 'Mario Rossi')
    assert.equal(imp.intestazione.firma, '<p>Mario</p>')
    assert.equal(imp.intestazione.vecchiaCartellaVista, true)
    // Il calendario resta quello di qui: ha il suo blocco, ed è spento.
    assert.deepEqual(imp.calendario, qui.r.impostazioni.calendario)
    // Le impostazioni di là non cambiano: si copia, non si prende in prestito.
    imp.scala.max = 99
    assert.equal(la.r.impostazioni.scala.max, 10)
  })

  it('le carte tengono i corsi importati, rimappati, e perdono gli altri', () => {
    const la = dilà()
    const qui = diqua()
    const fatto = importaRegistro(la.r, qui.r, tutto(la, qui.anno.id, {
      classi: [{ classeId: la.a.id, anagrafica: true, corsi: true }],
    }))
    const [prima, sera] = fatto.impostazioni.intestazione.carte
    const nuovoMat = fatto.corsi.find((c) => c.materiaId === qui.mat.id)
    const nuovoSto = fatto.corsi.find((c) => c.materiaId !== qui.mat.id)
    // bMat non è arrivato: sparisce dalla carta.
    assert.deepEqual(prima.corsi, [nuovoMat.id])
    assert.deepEqual(sera.corsi, [nuovoSto.id])
    assert.equal(prima.logo, 'intestazione/car-prima-1.png', 'il logo resta di là: lo ricopia l’host')
  })

  it('i calendari si aggiungono senza doppioni; le regole seguono i corsi o si lasciano', () => {
    const la = dilà()
    const qui = diqua()
    const fatto = importaRegistro(la.r, qui.r, tutto(la, qui.anno.id, {
      impostazioni: false,
      classi: [{ classeId: la.a.id, anagrafica: true, corsi: true }],
    }))
    const cal = fatto.impostazioni.calendario
    // La sede c'era già (stessa origine): arriva il solo laboratorio, con un id nuovo.
    assert.deepEqual(cal.calendari.map((c) => c.nome), ['Sede', 'Laboratori'])
    assert.equal(fatto.copie.length, 1)
    assert.equal(fatto.copie[0].da, 'ics-lab')
    assert.equal(cal.calendari[1].id, fatto.copie[0].a)
    assert.notEqual(fatto.copie[0].a, 'ics-lab')
    // r1 segue il corso nuovo, r2 (corso non portato) si lascia, r3 «non è una lezione» arriva.
    const nuovoMat = fatto.corsi.find((c) => c.materiaId === qui.mat.id)
    assert.deepEqual(cal.regole.map((r) => [r.testo, r.corsoId]), [
      ['MEC A MAT', nuovoMat.id],
      ['Collegio', null],
    ])
    assert.equal(fatto.regole, 2)
    // Il resto delle impostazioni resta quello di qui.
    assert.deepEqual(fatto.impostazioni.scala, qui.r.impostazioni.scala)
    assert.equal(fatto.impostazioni.intestazione.docente, '')
  })

  it('l’esito dice quel che è arrivato e basta', () => {
    const la = dilà()
    const qui = diqua()
    const scelta = tutto(la, qui.anno.id, { calendari: false, piani: false })
    const fatto = importaRegistro(la.r, qui.r, scelta)
    assert.equal(
      esitoImportRegistro(fatto, scelta),
      'Importato: 2 classi, 3 persone, 3 corsi, 2 materie nuove, impostazioni.',
    )
  })
})

describe('importaRegistro, con UD di un’altra durata', () => {
  /** L'anno scorso con UD da cinquanta, e una fascia di due UD. */
  const daCinquanta = () => {
    const la = dilà()
    la.r.impostazioni = { ...la.r.impostazioni, minutiUd: 50, durataSlotPredefinita: 100 }
    la.aMat.orario = [{ id: 'f1', giorno: 1, inizio: '08:00', durataMin: 100, aula: '' }]
    return la
  }
  const fasciaDiMatematica = (fatto) =>
    fatto.corsi.find((c) => c.orario.length > 0).orario[0].durataMin

  it('una classe sola: l’orario tiene le UD, in minuti di qui', () => {
    const la = daCinquanta()
    const qui = diqua()
    const fatto = importaRegistro(la.r, qui.r, tutto(la, qui.anno.id, { impostazioni: false }))
    assert.equal(fasciaDiMatematica(fatto), 90)
  })

  it('con le impostazioni arriva anche la durata, e l’orario la segue', () => {
    const la = daCinquanta()
    const qui = diqua()
    const fatto = importaRegistro(la.r, qui.r, tutto(la, qui.anno.id))
    assert.equal(fatto.impostazioni.minutiUd, 50)
    assert.equal(fasciaDiMatematica(fatto), 100)
  })

  it('qui ci sono già appelli: la durata resta quella di qui, e la lezione proposta tiene le UD', () => {
    const la = daCinquanta()
    const qui = diqua()
    const ora = creaLezione('c-qui', '2026-09-14', '08:00', 45)
    ora.presenze = [{ allievoId: 'x', stati: ['presente'] }]
    qui.r.lezioni = [ora]
    const fatto = importaRegistro(la.r, qui.r, tutto(la, qui.anno.id))
    assert.equal(fatto.impostazioni.minutiUd, 45)
    assert.equal(fatto.impostazioni.durataSlotPredefinita, 90)
    assert.equal(fasciaDiMatematica(fatto), 90)
  })
})
