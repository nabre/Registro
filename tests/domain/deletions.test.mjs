// Le eliminazioni: che cosa si porta via ognuna e che cosa lascia. Dopo ogni
// eliminazione `riferimentiRotti` non ha niente da dire; e non si perde più del
// necessario (un piano sopravvive alla materia, un recupero alla sua lezione, i
// voti di tutti alla partenza di uno).

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  creaAllievo,
  creaAnno,
  creaBloccoAssenze,
  creaClasse,
  creaConsegna,
  creaComunicazione,
  creaCorso,
  creaFascicolo,
  creaLezione,
  creaMateria,
  creaOsservazione,
  creaAttivita,
  creaPiano,
  creaRisorsa,
  creaValutazione,
  eliminazione,
  occupazione,
  registroVuoto,
  riferimentiRotti,
  lessico,
  applicaData,
  applicaLezione,
  applicaQuando,
  applicaSpunta,
  creaCheck,
  creaSmistamento,
  riparazioni,
  validaConsegna,
} from '../../dist-tests/domain.mjs'

/**
 * Un anno pieno: due classi con allievi, un corso per classe, lezioni con
 * appello e osservazioni, valutazioni con voti, un piano e un fascicolo.
 */
function registroPieno () {
  const registro = registroVuoto()

  const anno = creaAnno('2026-09-01', '2027-06-30')
  registro.anni.push(anno)
  registro.annoCorrenteId = anno.id

  const materia = creaMateria('Matematica')
  registro.materie.push(materia)


  const fatti = []
  for (const nome of ['I MEC A', 'I MEC B']) {
    const classe = creaClasse(anno.id, nome)
    const rossi = creaAllievo('Rossi', 'Maria')
    const bianchi = creaAllievo('Bianchi', 'Luca')
    classe.allievi.push(rossi, bianchi)
    registro.classi.push(classe)

    const corso = creaCorso(classe.id, materia.id, `Matematica — ${nome}`)
    registro.corsi.push(corso)

    // Un piano per corso: è di quel corso, per l'altro se ne fa una copia.
    const piano = creaPiano(corso.id)
    registro.piani.push(piano)

    const lezione = creaLezione(corso.id, '2026-09-14', '08:20', 45)
    lezione.pianoId = piano.id
    lezione.presenze = [
      { allievoId: rossi.id, stati: ['presente'] },
      { allievoId: bianchi.id, stati: ['assente'] },
    ]
    lezione.osservazioni = [creaOsservazione('merito', 'Ottimo intervento', rossi.id)]
    registro.lezioni.push(lezione)

    const momento = creaValutazione(corso.id, 'Verifica', registro.impostazioni.scala, '2026-10-05')
    momento.lezioneId = lezione.id
    momento.pianoId = piano.id
    momento.voti = [
      { allievoId: rossi.id, valore: 5, assente: false },
      { allievoId: bianchi.id, valore: 4, assente: false },
    ]
    registro.valutazioni.push(momento)

    const fascicolo = creaFascicolo(classe.id)
    fascicolo.documenti.push({
      id: `doc-${nome}`,
      allievoId: rossi.id,
      titolo: 'Certificato',
      categoria: 'certificato',
      file: `documenti/${classe.id}/certificato.pdf`,
      nome: 'certificato.pdf',
      aggiuntoIl: new Date().toISOString(),
    })
    registro.fascicoli.push(fascicolo)

    fatti.push({ classe, corso, piano, lezione, momento, fascicolo, rossi, bianchi })
  }

  return { registro, anno, materia, piano: fatti[0].piano, prima: fatti[0], seconda: fatti[1] }
}

/** Esegue l'eliminazione come fa il centralino, e torna il piano applicato. */
function togli (registro, bersaglio) {
  const piano = eliminazione(registro, bersaglio)
  assert.ok(piano, 'il bersaglio doveva esistere')
  piano.applica(registro)
  assert.deepEqual(
    riferimentiRotti(registro),
    [],
    'dopo un’eliminazione il registro non deve avere riferimenti appesi',
  )
  return piano
}

describe('eliminazioni', () => {
  it('non trova niente da eliminare se il bersaglio non c’è', () => {
    const { registro } = registroPieno()
    assert.equal(eliminazione(registro, { genere: 'classe', id: 'cls-mai-esistita' }), null)
  })

  it('l’anno si porta via classi, corsi, lezioni e voti', () => {
    const { registro, anno } = registroPieno()
    const piano = togli(registro, { genere: 'anno', id: anno.id })

    assert.equal(registro.anni.length, 0)
    assert.equal(registro.annoCorrenteId, null)
    assert.equal(registro.classi.length, 0)
    assert.equal(registro.corsi.length, 0)
    assert.equal(registro.lezioni.length, 0)
    assert.equal(registro.valutazioni.length, 0)
    assert.equal(registro.fascicoli.length, 0)
    // I piani non seguono l'anno: restano, staccati dal corso che non c'è più.
    assert.equal(registro.piani.length, 2)
    for (const scaletta of registro.piani) assert.equal(scaletta.corsoId, null)
    assert.ok(
      piano.perdite.some((p) => p.includes(`4 ${lessico.PIF.plurale}`)),
      piano.perdite.join(' | '),
    )
    assert.equal(piano.file.documenti.length, 2, 'i documenti del fascicolo escono dalla cartella')
  })

  it('la classe si porta via i suoi corsi e lascia stare l’altra classe', () => {
    const { registro, prima, seconda } = registroPieno()
    togli(registro, { genere: 'classe', id: prima.classe.id })

    assert.deepEqual(registro.classi.map((c) => c.id), [seconda.classe.id])
    assert.deepEqual(registro.corsi.map((c) => c.id), [seconda.corso.id])
    assert.deepEqual(registro.lezioni.map((l) => l.id), [seconda.lezione.id])
    assert.deepEqual(registro.valutazioni.map((v) => v.id), [seconda.momento.id])
    assert.deepEqual(registro.fascicoli.map((f) => f.id), [seconda.fascicolo.id])
  })

  it('il corso si porta via le sue ore e i suoi voti, la classe resta', () => {
    const { registro, prima } = registroPieno()
    const piano = togli(registro, { genere: 'corso', id: prima.corso.id })

    assert.equal(registro.classi.length, 2, 'la classe non se ne va con il corso')
    assert.equal(registro.corsi.length, 1)
    assert.equal(registro.lezioni.length, 1)
    assert.equal(registro.valutazioni.length, 1)
    assert.ok(piano.perdite.some((p) => p.includes('2 voti')), piano.perdite.join(' | '))
  })

  it('il corso se ne va e lascia i piani, staccati', () => {
    const { registro, prima, piano: scaletta } = registroPieno()
    const esito = togli(registro, { genere: 'corso', id: prima.corso.id })

    assert.equal(registro.corsi.length, 1, 'l’altro corso resta')
    assert.equal(registro.piani.length, 2, 'il piano è lavoro di preparazione: resta')
    const suo = registro.piani.find((p) => p.id === scaletta.id)
    assert.equal(suo.corsoId, null, 'resta, ma senza il corso che non c’è più')
    assert.ok(esito.staccati.some((x) => x.includes('piano')), esito.staccati.join(' | '))
  })

  it('la lezione se ne va e la valutazione resta, senza il suo rimando', () => {
    const { registro, prima } = registroPieno()
    togli(registro, { genere: 'lezione', id: prima.lezione.id })

    assert.equal(registro.lezioni.length, 1)
    const momento = registro.valutazioni.find((v) => v.id === prima.momento.id)
    assert.equal(momento.lezioneId, null)
    assert.equal(momento.voti.length, 2, 'i voti restano dov’erano')
  })

  it('il piano se ne va e le lezioni restano, senza scaletta né spunte', () => {
    const { registro, piano, prima } = registroPieno()
    prima.lezione.avanzamento = [{ attivitaId: 'att-1', titolo: 'saluto', stato: 'svolta' }]
    const esito = togli(registro, { genere: 'piano', id: piano.id })

    assert.equal(registro.piani.length, 1, 'se ne va solo il suo')
    assert.equal(registro.lezioni.length, 2)
    // Solo la lezione che quel piano lo usava resta senza scaletta.
    const orfana = registro.lezioni.find((l) => l.id === prima.lezione.id)
    assert.equal(orfana.pianoId, null)
    assert.deepEqual(orfana.avanzamento, [])
    const suo = registro.valutazioni.find((v) => v.id === prima.momento.id)
    assert.equal(suo.pianoId, null, 'il momento resta, senza il piano che l’aveva previsto')
    // Un piano senza allegati non si porta via cartelle: i suoi file stanno
    // accanto agli altri documenti del corso e si tolgono per percorso (più sotto).
    assert.deepEqual(esito.file.risorse, [])
    assert.deepEqual(esito.file.documenti, [])
  })

  it('la valutazione se ne va con i suoi voti e i suoi PDF', () => {
    const { registro, prima } = registroPieno()
    prima.momento.allegati = [
      {
        id: 'alg-1',
        ruolo: 'verifica',
        allievoId: null,
        nome: 'verifica.pdf',
        file: `allegati/${prima.momento.id}/verifica.pdf`,
        aggiuntoIl: new Date().toISOString(),
      },
    ]
    const esito = togli(registro, { genere: 'valutazione', id: prima.momento.id })

    assert.equal(registro.valutazioni.length, 1)
    assert.deepEqual(esito.file.allegati, [prima.momento.id])
  })

  it('l’allievo si porta via le sue presenze, i suoi voti e le sue osservazioni', () => {
    const { registro, prima, seconda } = registroPieno()
    const esito = togli(registro, {
      genere: 'allievo',
      classeId: prima.classe.id,
      id: prima.rossi.id,
    })

    const classe = registro.classi.find((c) => c.id === prima.classe.id)
    assert.deepEqual(classe.allievi.map((a) => a.id), [prima.bianchi.id])

    const lezione = registro.lezioni.find((l) => l.id === prima.lezione.id)
    assert.deepEqual(lezione.presenze.map((p) => p.allievoId), [prima.bianchi.id])
    assert.equal(lezione.osservazioni.length, 0)

    const momento = registro.valutazioni.find((v) => v.id === prima.momento.id)
    assert.deepEqual(momento.voti.map((v) => v.allievoId), [prima.bianchi.id])

    // L'altra classe non si accorge di niente.
    const altra = registro.valutazioni.find((v) => v.id === seconda.momento.id)
    assert.equal(altra.voti.length, 2)

    assert.ok(esito.invece?.includes('Frequenta'), 'va offerta l’alternativa che non perde niente')
  })

  it('i recuperi di chi se ne va spariscono con lui, e si dicono prima', () => {
    const { registro, prima, seconda } = registroPieno()
    // Due recuperi promossi: uno suo, uno dell'altro. Solo il suo deve cadere.
    prima.momento.recuperi = [
      { allievoId: prima.rossi.id, previstoIl: '2026-11-03' },
      { allievoId: prima.bianchi.id, previstoIl: '2026-11-03' },
    ]
    seconda.momento.recuperi = [{ allievoId: seconda.rossi.id, previstoIl: '2026-11-03' }]

    const esito = eliminazione(registro, {
      genere: 'allievo',
      classeId: prima.classe.id,
      id: prima.rossi.id,
    })
    // Il preventivo dice anche questa riga, così chi conferma sa che se ne va.
    assert.ok(
      esito.perdite.some((riga) => riga.includes('recupero')),
      'il conto dei recuperi va fra le perdite annunciate',
    )

    togli(registro, { genere: 'allievo', classeId: prima.classe.id, id: prima.rossi.id })

    const suo = registro.valutazioni.find((v) => v.id === prima.momento.id)
    assert.deepEqual(
      suo.recuperi.map((r) => r.allievoId),
      [prima.bianchi.id],
      'restava una riga intestata a un id che non è più di nessuno',
    )
    const altra = registro.valutazioni.find((v) => v.id === seconda.momento.id)
    assert.equal(altra.recuperi.length, 1, 'l’altra classe non si accorge di niente')
  })

  it('togliere un piano dichiara le raccolte che scrive davvero', () => {
    const { registro, piano } = registroPieno()
    const esito = eliminazione(registro, { genere: 'piano', id: piano.id })

    // Le raccolte staccate (`lezioni`, `valutazioni`) vanno dichiarate anche per il
    // bersaglio «piano», o il distacco resterebbe in memoria e riaprendo l'anno i
    // riferimenti morti tornerebbero.
    assert.ok(esito.collezioni.includes('piani'))
    assert.ok(esito.collezioni.includes('lezioni'), 'le ore staccate vanno riscritte')
    assert.ok(esito.collezioni.includes('valutazioni'), 'i momenti staccati pure')
  })

  it('il documento dell’allievo resta nel fascicolo, senza intestatario', () => {
    const { registro, prima } = registroPieno()
    togli(registro, { genere: 'allievo', classeId: prima.classe.id, id: prima.rossi.id })

    const fascicolo = registro.fascicoli.find((f) => f.classeId === prima.classe.id)
    assert.equal(fascicolo.documenti.length, 1, 'il file non si butta: non era la domanda')
    assert.equal(fascicolo.documenti[0].allievoId, null)
  })

  it('dice che cosa tocca, così si riscrivono solo quei file', () => {
    const { registro, prima } = registroPieno()
    const esito = eliminazione(registro, { genere: 'classe', id: prima.classe.id })
    assert.deepEqual(
      [...esito.collezioni].sort(),
      // I piani dei corsi che se ne vanno restano, staccati: anche quel file cambia.
      ['classi', 'corsi', 'fascicoli', 'lezioni', 'piani', 'valutazioni'],
    )
  })

  it('una consegna se ne va con i suoi documenti, e il PDF che l’aspettava esce dalla quarantena', () => {
    const { registro, prima } = registroPieno()
    const consegna = creaConsegna(prima.corso.id, 'Pagella 3° anno', '2026-10-01')
    consegna.documento = 'certificato'
    consegna.documenti = [
      { allievoId: prima.rossi.id, file: 'archivio/x/pagella.pdf', nome: 'pagella.pdf', aggiuntoIl: '2026-10-01T08:00:00.000Z' },
    ]
    consegna.fileFirme = 'archivio/x/firme.pdf'
    registro.consegne.push(consegna)
    registro.smistamenti.push({
      id: 'smi-1',
      consegnaId: consegna.id,
      classeId: prima.classe.id,
      file: 'quarantena/1 pagelle.pdf',
      nome: 'pagelle.pdf',
      pagine: 3,
      letture: [{ numero: 1, testo: '', lettura: 'niente', anteprima: 'quarantena/anteprime/smi-1-p1.png' }],
      assegnate: [],
      blocchi: [{ id: 'blc-1', da: 1, a: 3, allievoId: null, motivo: 'senza-nome', estratto: '', fiducia: 0, lettura: 'niente' }],
      arrivatoIl: '2026-10-01T08:00:00.000Z',
    })

    const esito = togli(registro, { genere: 'consegna', id: consegna.id })

    assert.equal(registro.consegne.length, 0)
    assert.equal(registro.smistamenti.length, 0, 'il PDF non resta ad aspettare una richiesta che non c’è')
    // I file citati escono tutti dall'archivio, non solo quelli delle spunte.
    assert.ok(esito.file.documenti.includes('archivio/x/pagella.pdf'))
    assert.ok(esito.file.documenti.includes('archivio/x/firme.pdf'))
    assert.ok(esito.file.documenti.includes('quarantena/1 pagelle.pdf'))
    assert.ok(esito.collezioni.includes('smistamenti'))
  })

  it('l’allievo che se ne va si porta via il documento che lo nominava', () => {
    const { registro, prima } = registroPieno()
    const consegna = creaConsegna(prima.corso.id, 'Certificato medico', '2026-10-01')
    consegna.documento = 'certificato'
    consegna.documenti = [
      { allievoId: prima.rossi.id, file: 'archivio/x/rossi.pdf', nome: 'rossi.pdf', aggiuntoIl: '2026-10-01T08:00:00.000Z' },
    ]
    registro.consegne.push(consegna)

    togli(registro, { genere: 'allievo', classeId: prima.classe.id, id: prima.rossi.id })

    assert.deepEqual(
      registro.consegne[0].documenti,
      [],
      'un documento che punta a un file cestinato direbbe che c’è qualcosa di pronto',
    )
  })
})

describe('i file di un piano lezione', () => {
  it('se ne vanno con lui, uno per uno', () => {
    // La cartella di un piano sta accanto agli altri documenti del corso: si
    // tolgono i suoi file, non la cartella.
    const { registro, piano } = registroPieno()

    const dispensa = creaRisorsa('file', 'Dispensa')
    dispensa.file = 'archivio/I MEC A/Matematica — I MEC A/Piano 15.09/dispensa.pdf'
    piano.risorse.push(dispensa)

    const tappa = creaAttivita('Lavoro di gruppo', 20)
    const scheda = creaRisorsa('file', 'Scheda 3')
    scheda.file = 'archivio/I MEC A/Matematica — I MEC A/Piano 15.09/scheda 3.pdf'
    tappa.risorse.push(scheda)
    piano.attivita.push(tappa)

    // Un collegamento non è un file: la pagina resta dov'è.
    piano.risorse.push(creaRisorsa('collegamento', 'Video'))

    const esito = eliminazione(registro, { genere: 'piano', id: piano.id })
    assert.deepEqual(esito.file.documenti, [dispensa.file, scheda.file])
    assert.deepEqual(esito.file.risorse, [])
    assert.ok(esito.perdite.some((p) => p.includes('file allegati al piano')))
  })

  it('la vecchia cartella piatta se ne va com’era', () => {
    // Se c'è ancora una cartella `risorse/<id>` si toglie anche quella: lì dentro
    // ci sono solo i suoi file.
    const { registro, piano } = registroPieno()
    const vecchia = creaRisorsa('file', 'Scheda')
    vecchia.file = `risorse/${piano.id}/scheda.pdf`
    piano.risorse.push(vecchia)

    const esito = eliminazione(registro, { genere: 'piano', id: piano.id })
    assert.deepEqual(esito.file.risorse, [piano.id])
  })
})

describe('i fogli già stampati di quel che se ne va', () => {
  it('l’ora porta via il suo verbale', () => {
    // Il PDF dell'ora eliminata se ne va: racconta una lezione che il registro non
    // ha più.
    const { registro, prima } = registroPieno()

    const esito = eliminazione(registro, { genere: 'lezione', id: prima.lezione.id })

    assert.equal(esito.file.stampati.length, 1)
    assert.match(esito.file.stampati[0], /^esportazioni\/.+Verbali.+\.pdf$/)
    // I fogli stampati stanno a parte dai documenti raccolti dal docente: questi
    // si rifanno con un pulsante, quelli no.
    assert.deepEqual(esito.file.documenti, [])
    assert.ok(esito.perdite.some((riga) => riga.includes('foglio già stampato')))
  })

  it('la prova porta via la sua scheda, il piano la sua', () => {
    const { registro, piano, prima } = registroPieno()

    const prova = eliminazione(registro, { genere: 'valutazione', id: prima.momento.id })
    assert.equal(prova.file.stampati.length, 1)
    assert.match(prova.file.stampati[0], /Prove/)

    const suo = eliminazione(registro, { genere: 'piano', id: piano.id })
    assert.equal(suo.file.stampati.length, 1)
    assert.match(suo.file.stampati[0], /Piani/)
  })

  it('la persona porta via le sue schede, in tutti i periodi', () => {
    // Una scheda per l'anno e una per semestre, e la stessa in due posti (cartella
    // della materia e della classe): toglierne una lascia le altre.
    const { registro } = registroPieno()
    const classe = registro.classi[0]
    const chi = classe.allievi[0]

    const esito = eliminazione(registro, { genere: 'allievo', classeId: classe.id, id: chi.id })

    assert.ok(esito.file.stampati.length >= 3)
    assert.ok(esito.file.stampati.every((p) => p.includes('Rossi Maria')))
  })

  it('quel che resta non si tocca', () => {
    // Il piano sopravvive al corso, e il suo foglio resta.
    const { registro } = registroPieno()
    const corso = registro.corsi[0]

    const esito = eliminazione(registro, { genere: 'corso', id: corso.id })

    assert.ok(!esito.file.stampati.some((p) => p.includes('Piani')))
    assert.ok(esito.file.stampati.some((p) => p.includes('Presenze')))
  })
})

// Quel che un'eliminazione non lascia indietro: togliendo un allievo se ne
// vanno la foto, le pagine smistate a suo nome, i blocchi che lo proponevano e
// una consegna data solo a lui. In più due riparazioni per rotture che
// `riferimentiRotti` segnala, e la data di una spunta del check convalidata.

const ADESSO = '2026-10-01T08:00:00.000Z'

/** Una classe con due persone e un corso: il minimo su cui togliere qualcuno. */
function scenaDiDue () {
  const registro = registroVuoto()
  const anno = creaAnno('2026-09-01', '2027-06-30')
  registro.anni.push(anno)
  registro.annoCorrenteId = anno.id
  const materia = creaMateria('Matematica')
  registro.materie.push(materia)
  const classe = creaClasse(anno.id, 'I MEC A')
  const rossi = creaAllievo('Rossi', 'Maria')
  const bianchi = creaAllievo('Bianchi', 'Luca')
  classe.allievi.push(rossi, bianchi)
  registro.classi.push(classe)
  const corso = creaCorso(classe.id, materia.id, 'I MEC A — Matematica')
  registro.corsi.push(corso)
  return { registro, anno, classe, corso, rossi, bianchi }
}

describe('la foto di chi se ne va', () => {
  it('togliendo l’allievo la sua foto esce dal pacchetto, e si dice', () => {
    const { registro, classe, rossi } = scenaDiDue()
    rossi.foto = 'documentazione/I MEC A/foto/Rossi Maria.jpg'

    const piano = togli(registro, { genere: 'allievo', classeId: classe.id, id: rossi.id })

    assert.ok(piano.file.documenti.includes(rossi.foto), 'la foto restava nel pacchetto')
    assert.ok(piano.perdite.some((riga) => riga.includes('foto')))
  })

  it('una foto che un altro allievo cita ancora resta', () => {
    const { registro, classe, rossi, bianchi } = scenaDiDue()
    rossi.foto = 'documentazione/I MEC A/foto/condivisa.jpg'
    bianchi.foto = rossi.foto

    const piano = togli(registro, { genere: 'allievo', classeId: classe.id, id: rossi.id })

    assert.ok(!piano.file.documenti.includes(rossi.foto))
  })

  it('togliendo la classe se ne vanno le foto di tutti i suoi allievi', () => {
    const { registro, classe, rossi, bianchi } = scenaDiDue()
    rossi.foto = 'documentazione/I MEC A/foto/Rossi Maria.jpg'
    bianchi.foto = 'documentazione/I MEC A/foto/Bianchi Luca.jpg'

    const piano = togli(registro, { genere: 'classe', id: classe.id })

    assert.ok(piano.file.documenti.includes(rossi.foto))
    assert.ok(piano.file.documenti.includes(bianchi.foto))
  })
})

describe('lo smistamento dopo l’allievo', () => {
  it('le sue fette se ne vanno, e i blocchi che lo proponevano restano senza nome', () => {
    const { registro, classe, corso, rossi, bianchi } = scenaDiDue()
    const consegna = creaConsegna(corso.id, 'Pagella', '2026-10-01')
    registro.consegne.push(consegna)
    const smistamento = creaSmistamento('quarantena/pagelle.pdf', 'pagelle.pdf', 4, consegna.id, classe.id)
    smistamento.assegnate = [
      { allievoId: rossi.id, consegnaId: consegna.id, da: 1, a: 1 },
      { allievoId: bianchi.id, consegnaId: consegna.id, da: 2, a: 2 },
    ]
    smistamento.blocchi = [
      { id: 'blc-1', da: 3, a: 3, allievoId: rossi.id, motivo: 'da-confermare', estratto: '', fiducia: 0.9, lettura: 'testo' },
      { id: 'blc-2', da: 4, a: 4, allievoId: bianchi.id, motivo: 'da-confermare', estratto: '', fiducia: 0.9, lettura: 'testo' },
    ]
    registro.smistamenti.push(smistamento)

    const piano = togli(registro, { genere: 'allievo', classeId: classe.id, id: rossi.id })

    const dopo = registro.smistamenti[0]
    assert.deepEqual(dopo.assegnate.map((f) => f.allievoId), [bianchi.id])
    assert.deepEqual(dopo.blocchi.map((b) => b.allievoId), [null, bianchi.id])
    assert.ok(piano.collezioni.includes('smistamenti'), 'gli smistamenti vanno riscritti')
  })
})

describe('la consegna data a lui soltanto', () => {
  it('se ne va con lui, con i suoi file, e si dice fra le perdite', () => {
    const { registro, classe, corso, rossi, bianchi } = scenaDiDue()
    const sua = { ...creaConsegna(corso.id, 'Recupero', '2026-10-01'), a: 'allievi', allieviIds: [rossi.id] }
    sua.fileTutti = 'archivio/recupero/consegna.pdf'
    const diDue = {
      ...creaConsegna(corso.id, 'Lavoro a coppie', '2026-10-01'),
      a: 'allievi',
      allieviIds: [rossi.id, bianchi.id],
    }
    registro.consegne.push(sua, diDue)

    const piano = togli(registro, { genere: 'allievo', classeId: classe.id, id: rossi.id })

    assert.deepEqual(registro.consegne.map((c) => c.id), [diDue.id])
    assert.deepEqual(registro.consegne[0].allieviIds, [bianchi.id])
    for (const consegna of registro.consegne) assert.equal(validaConsegna(consegna).valido, true)
    assert.ok(piano.file.documenti.includes('archivio/recupero/consegna.pdf'))
    assert.ok(piano.perdite.some((riga) => riga.includes('consegna che era solo sua')))
  })
})

describe('le riparazioni del check', () => {
  it('toglie la lista di un corso che non c’è più', () => {
    const { registro, corso } = scenaDiDue()
    const orfano = creaCheck('cor-sparito', [{ id: 'clc-1', titolo: 'Quaderno' }])
    registro.check.push(creaCheck(corso.id, [{ id: 'clc-2', titolo: 'Libro' }]), orfano)
    assert.ok(riferimentiRotti(registro).length > 0)

    for (const riparazione of riparazioni(registro)) riparazione.applica(registro)

    assert.deepEqual(registro.check.map((c) => c.corsoId), [corso.id])
    assert.deepEqual(riferimentiRotti(registro), [])
  })

  it('toglie le spunte di chi non è iscritto, e lascia le altre', () => {
    const { registro, corso, rossi } = scenaDiDue()
    const lista = creaCheck(corso.id, [{ id: 'clc-1', titolo: 'Quaderno' }])
    lista.spunte = [
      { allievoId: rossi.id, colonnaId: 'clc-1', lezioneId: null, data: '2026-09-10', fattaIl: ADESSO },
      { allievoId: 'all-sparito', colonnaId: 'clc-1', lezioneId: null, data: '2026-09-10', fattaIl: ADESSO },
    ]
    registro.check.push(lista)
    assert.ok(riferimentiRotti(registro).length > 0)

    const proposte = riparazioni(registro)
    assert.ok(proposte.some((r) => r.collezioni.includes('check')))
    for (const riparazione of proposte) riparazione.applica(registro)

    assert.deepEqual(lista.spunte.map((s) => s.allievoId), [rossi.id])
    assert.deepEqual(riferimentiRotti(registro), [])
  })
})

describe('la data di una spunta', () => {
  it('una data storta non si scrive', () => {
    const lista = creaCheck('cor-1', [{ id: 'clc-1', titolo: 'Quaderno' }])
    const scritta = applicaSpunta(lista, 'all-1', 'clc-1', { lezioneId: null, data: 'boh' }, ADESSO)
    assert.equal(scritta, false)
    assert.deepEqual(lista.spunte, [])
  })

  it('data e lezione passano da un corpo solo, e dicono le stesse cose di prima', () => {
    const lista = creaCheck('cor-1', [{ id: 'clc-1', titolo: 'Quaderno' }])
    assert.equal(applicaData(lista, 'all-1', 'clc-1', '2026-09-10', ADESSO), true)
    assert.equal(applicaData(lista, 'all-1', 'clc-1', '2026-09-10', ADESSO), false)
    assert.equal(applicaData(lista, 'all-1', 'clc-1', 'boh', ADESSO), false)
    const lezione = { id: 'lez-1', data: '2026-09-11' }
    assert.equal(applicaLezione(lista, 'all-1', 'clc-1', lezione, ADESSO), true)
    assert.equal(applicaLezione(lista, 'all-1', 'clc-1', lezione, ADESSO), false)
    assert.equal(
      applicaQuando(lista, 'all-1', 'clc-1', { lezioneId: 'lez-1', data: '2026-09-11' }, ADESSO),
      false,
    )
    assert.deepEqual(
      lista.spunte.map((s) => [s.lezioneId, s.data]),
      [['lez-1', '2026-09-11']],
    )
  })
})

// Le collezioni che un'eliminazione dichiara: l'archivio riscrive (e sa
// annullare) solo quelle annunciate, e una riga tolta dallo stato vivo ma non
// dal disco torna alla riapertura.

/** La scena di due persone con un'ora e una verifica del corso. */
function conOraEVerifica () {
  const scena = scenaDiDue()
  const lezione = creaLezione(scena.corso.id, '2026-09-14', '08:20', 45)
  scena.registro.lezioni.push(lezione)
  const momento = creaValutazione(scena.corso.id, 'Verifica', scena.registro.impostazioni.scala, '2026-10-05')
  scena.registro.valutazioni.push(momento)
  return { ...scena, lezione, momento }
}

describe('eliminazioni: collezioni dichiarate', () => {
  it('un allievo con sola riga voto vuota dichiara «valutazioni»', () => {
    const { registro, classe, momento, rossi } = conOraEVerifica()
    momento.voti = [{ allievoId: rossi.id, valore: null, assente: false }]
    const piano = eliminazione(registro, { genere: 'allievo', classeId: classe.id, id: rossi.id })
    assert.ok(piano.collezioni.includes('valutazioni'), piano.collezioni.join(','))
  })

  it('un allievo con solo recupero o prova allegata dichiara «valutazioni»', () => {
    const { registro, classe, momento, rossi } = conOraEVerifica()
    momento.recuperi = [{ allievoId: rossi.id, previstoIl: null }]
    let piano = eliminazione(registro, { genere: 'allievo', classeId: classe.id, id: rossi.id })
    assert.ok(piano.collezioni.includes('valutazioni'), piano.collezioni.join(','))

    momento.recuperi = []
    momento.allegati = [{
      id: 'all-1', ruolo: 'prova', allievoId: rossi.id, nome: 'p.pdf', file: 'x/p.pdf',
      aggiuntoIl: new Date().toISOString(),
    }]
    piano = eliminazione(registro, { genere: 'allievo', classeId: classe.id, id: rossi.id })
    assert.ok(piano.collezioni.includes('valutazioni'), piano.collezioni.join(','))
  })

  it('un allievo con sole caselle della matrice dichiara «lezioni»', () => {
    const { registro, classe, lezione, rossi } = conOraEVerifica()
    lezione.presenze = []
    lezione.matrice = [{ allievoId: rossi.id, aspetto: 'ordine', segno: null }]
    const piano = eliminazione(registro, { genere: 'allievo', classeId: classe.id, id: rossi.id })
    assert.ok(piano.collezioni.includes('lezioni'), piano.collezioni.join(','))
  })

  it('una consegna allegata a una comunicazione esce dagli allegati', () => {
    const { registro, classe, corso } = conOraEVerifica()
    const consegna = creaConsegna(corso.id, 'Modulo', '2026-09-20')
    registro.consegne.push(consegna)
    const fascicolo = creaFascicolo(classe.id)
    const comunicazione = creaComunicazione(fascicolo)
    comunicazione.documentiIds = [consegna.id, 'con-altra']
    fascicolo.comunicazioni.push(comunicazione)
    registro.fascicoli.push(fascicolo)

    const piano = eliminazione(registro, { genere: 'consegna', id: consegna.id })
    assert.ok(piano.collezioni.includes('fascicoli'), piano.collezioni.join(','))
    piano.applica(registro)
    assert.deepEqual(registro.fascicoli[0].comunicazioni[0].documentiIds, ['con-altra'])
  })
})

// Quel che la domanda dice e quel che l'archivio riscrive, per intero: le
// perdite con il loro numero, e le collezioni senza una di meno (una modifica
// persa alla riapertura) né una di più (un file riscritto per niente).

/** Le collezioni in ordine, per confrontarle intere. */
const ordinate = (esito) => [...esito.collezioni].sort()

/** Le righe attese, più quella dei fogli stampati se l'eliminazione ne trova. */
function conFogli (esito, righe) {
  const n = esito.file.stampati.length
  if (n === 0) return righe
  return [...righe, `${n} ${n === 1 ? 'foglio già stampato' : 'fogli già stampati'} nella cartella`]
}

function documento (allievoId, file) {
  return { allievoId, file, nome: file.split('/').pop(), aggiuntoIl: ADESSO }
}

function foglio (file) {
  return { tipo: 'assenze', firmato: false, file, nome: file.split('/').pop(), aggiuntoIl: ADESSO }
}

function nelFascicolo (registro, classe) {
  const fascicolo = creaFascicolo(classe.id)
  registro.fascicoli.push(fascicolo)
  return fascicolo
}

function spunta (allievoId, colonnaId = 'clc-1', lezioneId = null) {
  return { allievoId, colonnaId, lezioneId, data: '2026-09-10', fattaIl: ADESSO }
}

function soloA (corso, allievo, testo = 'Sua') {
  return { ...creaConsegna(corso.id, testo, '2026-09-20'), a: 'allievi', allieviIds: [allievo.id] }
}

describe('eliminazioni: le collezioni di ogni genere, né una di più', () => {
  const casi = [
    ['una consegna', ['consegne'], ({ registro, corso }) => {
      const consegna = creaConsegna(corso.id, 'Esercizi', '2026-09-20')
      registro.consegne.push(consegna)
      return { genere: 'consegna', id: consegna.id }
    }],
    ['una lezione sola', ['lezioni'], ({ lezione }) => ({ genere: 'lezione', id: lezione.id })],
    ['una lezione con consegna e momento legati', ['consegne', 'lezioni', 'valutazioni'],
      ({ registro, corso, lezione, momento }) => {
        registro.consegne.push(creaConsegna(corso.id, 'Esercizi', '2026-09-20', lezione.id))
        momento.lezioneId = lezione.id
        return { genere: 'lezione', id: lezione.id }
      }],
    ['una lezione che fa da scadenza', ['consegne', 'lezioni'], ({ registro, corso, lezione }) => {
      const consegna = creaConsegna(corso.id, 'Esercizi', '2026-09-10')
      consegna.scadenzaLezioneId = lezione.id
      registro.consegne.push(consegna)
      return { genere: 'lezione', id: lezione.id }
    }],
    ['una valutazione', ['valutazioni'], ({ momento }) => ({ genere: 'valutazione', id: momento.id })],
    ['un piano che nessuno usa', ['piani'], ({ registro, corso }) => {
      const piano = creaPiano(corso.id)
      registro.piani.push(piano)
      return { genere: 'piano', id: piano.id }
    }],
    ['un corso vuoto', ['corsi'], ({ registro, classe }) => {
      const corso = creaCorso(classe.id, registro.materie[0].id, 'Vuoto')
      registro.corsi.push(corso)
      return { genere: 'corso', id: corso.id }
    }],
    ['un corso con un piano', ['corsi', 'piani'], ({ registro, classe }) => {
      const corso = creaCorso(classe.id, registro.materie[0].id, 'Con piano')
      registro.corsi.push(corso)
      registro.piani.push(creaPiano(corso.id))
      return { genere: 'corso', id: corso.id }
    }],
    ['un corso con il suo check', ['check', 'corsi'], ({ registro, classe }) => {
      const corso = creaCorso(classe.id, registro.materie[0].id, 'Con check')
      registro.corsi.push(corso)
      registro.check.push(creaCheck(corso.id, [{ id: 'clc-1', titolo: 'Quaderno' }]))
      return { genere: 'corso', id: corso.id }
    }],
    ['una materia senza corsi', ['registro'], ({ registro }) => {
      const materia = creaMateria('Storia')
      registro.materie.push(materia)
      return { genere: 'materia', id: materia.id }
    }],
    ['una materia con il suo corso', ['corsi', 'lezioni', 'registro', 'valutazioni'],
      ({ corso }) => ({ genere: 'materia', id: corso.materiaId })],
    ['un anno senza classi', ['registro'], ({ registro }) => {
      const anno = creaAnno('2027-09-01', '2028-06-30')
      registro.anni.push(anno)
      return { genere: 'anno', id: anno.id }
    }],
    ['un anno con la sua classe', ['classi', 'corsi', 'fascicoli', 'lezioni', 'registro', 'valutazioni'],
      ({ anno }) => ({ genere: 'anno', id: anno.id })],
    ['una classe', ['classi', 'corsi', 'fascicoli', 'lezioni', 'valutazioni'],
      ({ classe }) => ({ genere: 'classe', id: classe.id })],
  ]

  for (const [come, attese, prepara] of casi) {
    it(`${come} dichiara ${attese.join(', ')}`, () => {
      const scena = conOraEVerifica()
      const bersaglio = prepara(scena)
      assert.deepEqual(ordinate(eliminazione(scena.registro, bersaglio)), attese)
    })
  }
})

describe('eliminazioni: le collezioni di chi se ne va', () => {
  const casi = [
    ['senza tracce', ['classi'], () => {}],
    ['con la sola presenza', ['classi', 'lezioni'], ({ lezione, rossi }) => {
      lezione.presenze = [{ allievoId: rossi.id, stati: ['presente'] }]
    }],
    ['con la sola osservazione', ['classi', 'lezioni'], ({ lezione, rossi }) => {
      lezione.osservazioni = [creaOsservazione('merito', 'Bene', rossi.id)]
    }],
    ['con le tracce degli altri soltanto', ['classi'], ({ registro, corso, lezione, momento, bianchi }) => {
      lezione.presenze = [{ allievoId: bianchi.id, stati: ['presente'] }]
      lezione.osservazioni = [creaOsservazione('merito', 'Bene', bianchi.id)]
      lezione.matrice = [{ allievoId: bianchi.id, aspetto: 'ordine', segno: null }]
      momento.voti = [{ allievoId: bianchi.id, valore: 5, assente: false }]
      const consegna = creaConsegna(corso.id, 'Di classe', '2026-09-20')
      consegna.fatte = [{ chi: bianchi.id, fattaIl: ADESSO, file: 'consegne/b.pdf' }]
      consegna.documenti = [documento(bianchi.id, 'consegne/bd.pdf')]
      registro.consegne.push(consegna, soloA(corso, bianchi))
    }],
    ['con una consegna solo sua', ['classi', 'consegne'], ({ registro, corso, rossi }) => {
      registro.consegne.push(soloA(corso, rossi))
    }],
    ['citato fra i destinatari con altri', ['classi', 'consegne'], ({ registro, corso, rossi, bianchi }) => {
      registro.consegne.push({
        ...creaConsegna(corso.id, 'A coppie', '2026-09-20'), a: 'allievi', allieviIds: [bianchi.id, rossi.id],
      })
    }],
    ['con una spunta senza file', ['classi', 'consegne'], ({ registro, corso, rossi }) => {
      const consegna = creaConsegna(corso.id, 'Di classe', '2026-09-20')
      consegna.fatte = [{ chi: rossi.id, fattaIl: ADESSO }]
      registro.consegne.push(consegna)
    }],
    ['con un documento raccolto', ['classi', 'consegne'], ({ registro, corso, rossi }) => {
      const consegna = creaConsegna(corso.id, 'Di classe', '2026-09-20')
      consegna.documenti = [documento(rossi.id, 'consegne/r.pdf')]
      registro.consegne.push(consegna)
    }],
    ['con un documento nel fascicolo', ['classi', 'fascicoli'], ({ registro, classe, rossi }) => {
      nelFascicolo(registro, classe).documenti.push({
        id: 'doc-1', allievoId: rossi.id, titolo: 'Certificato', categoria: 'certificato',
        file: 'documenti/c.pdf', nome: 'c.pdf', aggiuntoIl: ADESSO,
      })
    }],
    ['con una riga di assenze senza fogli', ['classi', 'fascicoli'], ({ registro, classe, rossi }) => {
      const fascicolo = nelFascicolo(registro, classe)
      const blocco = creaBloccoAssenze('2026-09-01', '2027-01-31', fascicolo)
      blocco.righe = [{ allievoId: rossi.id, fogli: [], invio: null }]
      fascicolo.assenze.push(blocco)
    }],
    ['con una fetta smistata a suo nome', ['classi', 'smistamenti'], ({ registro, classe, rossi }) => {
      const smistamento = creaSmistamento('quarantena/p.pdf', 'p.pdf', 2, null, classe.id)
      smistamento.assegnate = [{ allievoId: rossi.id, consegnaId: null, da: 1, a: 1 }]
      registro.smistamenti.push(smistamento)
    }],
    ['proposto da un blocco', ['classi', 'smistamenti'], ({ registro, classe, rossi }) => {
      const smistamento = creaSmistamento('quarantena/p.pdf', 'p.pdf', 2, null, classe.id)
      smistamento.blocchi = [{
        id: 'blc-1', da: 1, a: 1, allievoId: rossi.id, motivo: 'da-confermare', estratto: '', fiducia: 0.9, lettura: 'testo',
      }]
      registro.smistamenti.push(smistamento)
    }],
    ['con una spunta del check', ['check', 'classi'], ({ registro, corso, rossi }) => {
      const lista = creaCheck(corso.id, [{ id: 'clc-1', titolo: 'Quaderno' }])
      lista.spunte = [spunta(rossi.id)]
      registro.check.push(lista)
    }],
    ['con un PDF che aspetta la consegna solo sua', ['classi', 'consegne', 'smistamenti'],
      ({ registro, corso, classe, rossi }) => {
        const sua = soloA(corso, rossi)
        registro.consegne.push(sua)
        registro.smistamenti.push(creaSmistamento('quarantena/p.pdf', 'p.pdf', 1, sua.id, classe.id))
      }],
    ['con la consegna solo sua allegata a una comunicazione', ['classi', 'consegne', 'fascicoli'],
      ({ registro, corso, classe, rossi }) => {
        const sua = soloA(corso, rossi)
        registro.consegne.push(sua)
        const fascicolo = nelFascicolo(registro, classe)
        const comunicazione = creaComunicazione(fascicolo)
        comunicazione.documentiIds = [sua.id]
        fascicolo.comunicazioni.push(comunicazione)
      }],
  ]

  for (const [come, attese, prepara] of casi) {
    it(`l’allievo ${come} dichiara ${attese.join(', ')}`, () => {
      const scena = conOraEVerifica()
      prepara(scena)
      const { registro, classe, rossi } = scena
      const esito = eliminazione(registro, { genere: 'allievo', classeId: classe.id, id: rossi.id })
      assert.deepEqual(ordinate(esito), attese)
    })
  }
})

describe('eliminazioni: che cosa si dice togliendo un allievo', () => {
  /** Rossi lascia qualcosa dappertutto, e Bianchi accanto a lui lo stesso. */
  function tracceDiRossi () {
    const scena = conOraEVerifica()
    const { registro, classe, corso, lezione, momento, rossi, bianchi } = scena
    const seconda = creaLezione(corso.id, '2026-09-15', '08:20', 45)
    registro.lezioni.push(seconda)
    lezione.presenze = [
      { allievoId: rossi.id, stati: ['presente'] },
      { allievoId: bianchi.id, stati: ['presente'] },
    ]
    seconda.presenze = [{ allievoId: rossi.id, stati: ['assente'] }]
    lezione.osservazioni = [
      creaOsservazione('merito', 'Bene', rossi.id),
      creaOsservazione('merito', 'Bene', bianchi.id),
    ]
    lezione.matrice = [
      { allievoId: rossi.id, aspetto: 'ordine', segno: null },
      { allievoId: bianchi.id, aspetto: 'ordine', segno: null },
    ]
    // Un voto, un'assenza e una riga vuota: la riga vuota non è un voto.
    momento.voti = [
      { allievoId: rossi.id, valore: 5, assente: false },
      { allievoId: bianchi.id, valore: 4, assente: false },
    ]
    const assente = creaValutazione(corso.id, 'Orale', registro.impostazioni.scala, '2026-10-12')
    assente.voti = [{ allievoId: rossi.id, valore: null, assente: true }]
    assente.recuperi = [
      { allievoId: rossi.id, previstoIl: null },
      { allievoId: bianchi.id, previstoIl: null },
    ]
    const vuota = creaValutazione(corso.id, 'Scritto', registro.impostazioni.scala, '2026-10-19')
    vuota.voti = [{ allievoId: rossi.id, valore: null, assente: false }]
    registro.valutazioni.push(assente, vuota)

    const lista = creaCheck(corso.id, [{ id: 'clc-1', titolo: 'Quaderno' }])
    lista.spunte = [spunta(rossi.id), spunta(bianchi.id)]
    registro.check.push(lista)

    const diClasse = creaConsegna(corso.id, 'Di classe', '2026-09-20')
    diClasse.fatte = [
      { chi: rossi.id, fattaIl: ADESSO, file: 'consegne/r.pdf' },
      { chi: bianchi.id, fattaIl: ADESSO, file: 'consegne/b.pdf' },
    ]
    diClasse.documenti = [documento(rossi.id, 'consegne/rd.pdf'), documento(bianchi.id, 'consegne/bd.pdf')]
    const aCoppie = {
      ...creaConsegna(corso.id, 'A coppie', '2026-09-20'), a: 'allievi', allieviIds: [rossi.id, bianchi.id],
    }
    const sua = soloA(corso, rossi)
    sua.fileTutti = 'consegne/tutti.pdf'
    registro.consegne.push(diClasse, aCoppie, sua)

    const attesa = creaSmistamento('quarantena/s.pdf', 's.pdf', 1, sua.id, classe.id)
    attesa.letture = [{ numero: 1, testo: '', lettura: 'niente', anteprima: 'quarantena/anteprime/s-p1.png' }]
    registro.smistamenti.push(attesa)

    rossi.foto = 'foto/rossi.jpg'

    const fascicolo = nelFascicolo(registro, classe)
    fascicolo.documenti.push(
      { id: 'doc-r', allievoId: rossi.id, titolo: 'C', categoria: 'certificato', file: 'documenti/r.pdf', nome: 'r.pdf', aggiuntoIl: ADESSO },
      { id: 'doc-b', allievoId: bianchi.id, titolo: 'C', categoria: 'certificato', file: 'documenti/b.pdf', nome: 'b.pdf', aggiuntoIl: ADESSO },
    )
    const blocco = creaBloccoAssenze('2026-09-01', '2027-01-31', fascicolo)
    blocco.righe = [
      { allievoId: rossi.id, fogli: [foglio('assenze/r1.pdf'), foglio('assenze/r2.pdf')], invio: null },
      { allievoId: bianchi.id, fogli: [foglio('assenze/b1.pdf')], invio: null },
    ]
    fascicolo.assenze.push(blocco)

    return { ...scena, seconda, assente, lista, diClasse, aCoppie, fascicolo, blocco }
  }

  it('conta ogni sua traccia, e solo le sue', () => {
    const { registro, classe, rossi } = tracceDiRossi()
    const esito = eliminazione(registro, { genere: 'allievo', classeId: classe.id, id: rossi.id })

    assert.equal(esito.nome, 'Rossi Maria')
    assert.deepEqual(esito.perdite, [
      '2 presenze registrate',
      '2 voti',
      '1 recupero',
      '1 osservazione',
      '1 spunta del check',
      '1 casella del comportamento',
      '2 documenti raccolti',
      '1 consegna che era solo sua',
      '1 PDF in quarantena',
      'la sua foto',
      '2 fogli di assenze',
    ])
    assert.deepEqual(esito.staccati, [
      '1 documento resta nel fascicolo, senza intestatario',
      '2 consegne restano, senza il suo nome fra i destinatari',
    ])
    assert.deepEqual(esito.file.documenti, [
      'consegne/r.pdf',
      'consegne/rd.pdf',
      'consegne/tutti.pdf',
      'quarantena/s.pdf',
      'quarantena/anteprime/s-p1.png',
      'foto/rossi.jpg',
      'assenze/r1.pdf',
      'assenze/r2.pdf',
    ])
    assert.deepEqual(
      ordinate(esito),
      ['check', 'classi', 'consegne', 'fascicoli', 'lezioni', 'smistamenti', 'valutazioni'],
    )
  })

  it('applicata, toglie le sue righe e lascia quelle di Bianchi', () => {
    const {
      registro, classe, lezione, seconda, assente, lista,
      diClasse, aCoppie, fascicolo, blocco, rossi, bianchi,
    } = tracceDiRossi()
    togli(registro, { genere: 'allievo', classeId: classe.id, id: rossi.id })

    assert.deepEqual(lezione.presenze.map((p) => p.allievoId), [bianchi.id])
    assert.deepEqual(seconda.presenze, [])
    assert.deepEqual(lezione.osservazioni.map((o) => o.allievoId), [bianchi.id])
    assert.deepEqual(lezione.matrice.map((c) => c.allievoId), [bianchi.id])
    assert.deepEqual(assente.voti, [])
    assert.deepEqual(assente.recuperi.map((x) => x.allievoId), [bianchi.id])
    assert.deepEqual(lista.spunte.map((s) => s.allievoId), [bianchi.id])
    assert.deepEqual(registro.consegne.map((c) => c.id), [diClasse.id, aCoppie.id])
    assert.deepEqual(diClasse.fatte.map((f) => f.chi), [bianchi.id])
    assert.deepEqual(diClasse.documenti.map((d) => d.allievoId), [bianchi.id])
    assert.deepEqual(aCoppie.allieviIds, [bianchi.id])
    assert.deepEqual(registro.smistamenti, [])
    assert.deepEqual(fascicolo.documenti.map((d) => d.allievoId), [null, bianchi.id])
    assert.deepEqual(blocco.righe.map((r) => r.allievoId), [bianchi.id])
  })
})

describe('eliminazioni: che cosa si dice togliendo il resto', () => {
  it('il corso dice ore, voti, consegne, check e PDF, e non sé stesso', () => {
    const { registro, classe, corso, rossi, bianchi } = scenaDiDue()
    registro.lezioni.push(
      creaLezione(corso.id, '2026-09-14', '08:20', 45),
      creaLezione(corso.id, '2026-09-15', '08:20', 45),
    )
    const scritto = creaValutazione(corso.id, 'Scritto', registro.impostazioni.scala, '2026-10-05')
    scritto.voti = [
      { allievoId: rossi.id, valore: 5, assente: false },
      { allievoId: bianchi.id, valore: null, assente: false },
    ]
    const orale = creaValutazione(corso.id, 'Orale', registro.impostazioni.scala, '2026-10-12')
    orale.voti = [{ allievoId: rossi.id, valore: null, assente: true }]
    registro.valutazioni.push(scritto, orale)
    const altroCorso = creaCorso(classe.id, registro.materie[0].id, 'Altro')
    registro.corsi.push(altroCorso)
    const uno = creaConsegna(corso.id, 'Uno', '2026-09-20')
    registro.consegne.push(
      uno,
      creaConsegna(corso.id, 'Due', '2026-09-21'),
      creaConsegna(altroCorso.id, 'Altrui', '2026-09-20'),
    )
    const lista = creaCheck(corso.id, [{ id: 'clc-1', titolo: 'A' }, { id: 'clc-2', titolo: 'B' }])
    lista.spunte = [spunta(rossi.id), spunta(rossi.id, 'clc-2'), spunta(bianchi.id)]
    registro.check.push(lista, creaCheck(altroCorso.id))
    const attesa = creaSmistamento('quarantena/s.pdf', 's.pdf', 1, uno.id, null)
    attesa.letture = [{ numero: 1, testo: '', lettura: 'niente', anteprima: 'quarantena/s-p1.png' }]
    registro.smistamenti.push(attesa, creaSmistamento('quarantena/altro.pdf', 'altro.pdf', 1, null, null))

    const esito = eliminazione(registro, { genere: 'corso', id: corso.id })

    assert.equal(esito.nome, 'il corso «I MEC A — Matematica»')
    assert.equal(esito.invece, null)
    assert.deepEqual(esito.perdite, conFogli(esito, [
      '2 lezioni, con appello, osservazioni e consuntivo',
      '2 momenti di valutazione, con 2 voti',
      '2 consegne',
      '1 check, con 3 spunte',
      '1 PDF in quarantena',
    ]))
    assert.deepEqual(esito.staccati, [])
    assert.deepEqual(esito.file.documenti, ['quarantena/s.pdf', 'quarantena/s-p1.png'])
    assert.deepEqual(ordinate(esito), ['check', 'consegne', 'corsi', 'lezioni', 'smistamenti', 'valutazioni'])

    togli(registro, { genere: 'corso', id: corso.id })
    assert.deepEqual(registro.consegne.map((c) => c.testo), ['Altrui'])
    assert.deepEqual(registro.check.map((c) => c.corsoId), [altroCorso.id])
    assert.deepEqual(registro.smistamenti.map((s) => s.nome), ['altro.pdf'])
  })

  it('il corso lascia i suoi piani e lo dice una volta', () => {
    const { registro, corso } = scenaDiDue()
    registro.piani.push(creaPiano(corso.id), creaPiano(corso.id), creaPiano(null))
    const esito = eliminazione(registro, { genere: 'corso', id: corso.id })
    assert.deepEqual(esito.staccati, ['2 piani lezione restano, senza corso'])
  })

  it('la materia dice anche i corsi che si porta via', () => {
    const { registro, corso } = scenaDiDue()
    const esito = eliminazione(registro, { genere: 'materia', id: corso.materiaId })
    assert.equal(esito.nome, 'la materia «Matematica»')
    assert.deepEqual(esito.perdite, conFogli(esito, ['1 corso']))
    assert.match(esito.invece, /Unirla/)
  })

  it('la materia usata da un corso è occupata, e dice di unirla', () => {
    const { registro, corso } = scenaDiDue()
    const occupata = occupazione(registro, { genere: 'materia', id: corso.materiaId })
    assert.match(occupata.motivo, /1 corso la usa/)
    assert.match(occupata.invece, /Unirla/)
    const libera = creaMateria('Storia')
    registro.materie.push(libera)
    assert.equal(occupazione(registro, { genere: 'materia', id: libera.id }), null)
    assert.equal(occupazione(registro, { genere: 'corso', id: corso.id }), null)
  })

  it('la classe dice allievi, foto, corsi, PDF in attesa e fascicolo', () => {
    const { registro, classe, rossi } = scenaDiDue()
    rossi.foto = 'foto/rossi.jpg'
    const fascicolo = nelFascicolo(registro, classe)
    fascicolo.documenti.push({
      id: 'doc-1', allievoId: null, titolo: 'C', categoria: 'certificato', file: 'documenti/c.pdf', nome: 'c.pdf', aggiuntoIl: ADESSO,
    })
    fascicolo.comunicazioni.push(creaComunicazione(fascicolo), creaComunicazione(fascicolo))
    const blocco = creaBloccoAssenze('2026-09-01', '2027-01-31', fascicolo)
    blocco.righe = [{ allievoId: rossi.id, fogli: [foglio('assenze/1.pdf'), foglio('assenze/2.pdf')], invio: null }]
    fascicolo.assenze.push(blocco)
    registro.smistamenti.push(
      creaSmistamento('quarantena/sua.pdf', 'sua.pdf', 1, null, classe.id),
      creaSmistamento('quarantena/altra.pdf', 'altra.pdf', 1, null, 'cls-altra'),
    )

    const esito = eliminazione(registro, { genere: 'classe', id: classe.id })

    assert.equal(esito.nome, 'la classe I MEC A')
    assert.deepEqual(esito.perdite, conFogli(esito, [
      lessico.quanti(2, lessico.PIF),
      '1 foto',
      '1 corso',
      '1 PDF in quarantena',
      'il fascicolo della classe: 1 documento, 2 comunicazioni, 1 periodo di assenze con 2 fogli',
    ]))
    assert.deepEqual(esito.file.documenti, [
      'foto/rossi.jpg', 'quarantena/sua.pdf', 'documenti/c.pdf', 'assenze/1.pdf', 'assenze/2.pdf',
    ])
    assert.match(esito.invece, /Archiviarla/)
  })

  it('una classe vuota non dice allievi, e un fascicolo vuoto non si dice', () => {
    const { registro, anno } = scenaDiDue()
    const vuota = creaClasse(anno.id, 'II MEC')
    registro.classi.push(vuota)
    nelFascicolo(registro, vuota)
    const esito = eliminazione(registro, { genere: 'classe', id: vuota.id })
    assert.deepEqual(esito.perdite, [])
    assert.deepEqual(ordinate(esito), ['classi', 'fascicoli'])
  })

  it('l’anno aperto dice cartella, classi con i loro allievi e il resto', () => {
    const { registro, anno } = registroPieno()
    const esito = eliminazione(registro, { genere: 'anno', id: anno.id })
    assert.equal(esito.nome, 'l’anno 2026/2027')
    assert.deepEqual(esito.perdite, conFogli(esito, [
      'la cartella «2026/2027» per intero, con la sua documentazione',
      `2 classi, con ${lessico.quanti(4, lessico.PIF)}`,
      '2 corsi',
      '2 lezioni, con appello, osservazioni e consuntivo',
      '2 momenti di valutazione, con 4 voti',
      'il fascicolo della classe: 1 documento',
      'il fascicolo della classe: 1 documento',
    ]))
    assert.deepEqual(esito.staccati, ['2 piani lezione restano, senza corso'])
    assert.match(esito.invece, /cestino/)
  })

  it('un anno non aperto dice la sua cartella e che il resto non si conta', () => {
    const { registro } = registroPieno()
    const vecchio = creaAnno('2025-09-01', '2026-06-30')
    vecchio.cartella = 'Anno vecchio'
    registro.anni.push(vecchio)
    const esito = eliminazione(registro, { genere: 'anno', id: vecchio.id })
    assert.deepEqual(esito.perdite, [
      'la cartella «Anno vecchio» per intero, con la sua documentazione',
      'quel che contiene: non è l’anno aperto, e non si può contarlo da qui',
    ])
  })

  it('la consegna dice i documenti raccolti e non sé stessa', () => {
    const { registro, corso, rossi, bianchi } = scenaDiDue()
    const consegna = creaConsegna(corso.id, 'Pagella', '2026-10-01')
    consegna.fatte = [
      { chi: rossi.id, fattaIl: ADESSO, file: 'consegne/r.pdf' },
      { chi: bianchi.id, fattaIl: ADESSO },
    ]
    consegna.documenti = [documento(bianchi.id, 'consegne/b.pdf')]
    consegna.fileTutti = 'consegne/tutti.pdf'
    consegna.fileFirme = 'consegne/firme.pdf'
    registro.consegne.push(consegna, creaConsegna(corso.id, 'Altra', '2026-10-02'))

    const esito = eliminazione(registro, { genere: 'consegna', id: consegna.id })

    assert.equal(esito.nome, 'la consegna «Pagella»')
    assert.deepEqual(esito.perdite, conFogli(esito, ['4 documenti raccolti']))
    assert.deepEqual(
      esito.file.documenti,
      ['consegne/r.pdf', 'consegne/b.pdf', 'consegne/tutti.pdf', 'consegne/firme.pdf'],
    )
    assert.match(esito.invece, /Spuntarla/)
  })

  it('una consegna senza file non dice niente', () => {
    const { registro, corso } = scenaDiDue()
    const consegna = creaConsegna(corso.id, 'Esercizi', '2026-10-01')
    registro.consegne.push(consegna)
    const esito = eliminazione(registro, { genere: 'consegna', id: consegna.id })
    assert.deepEqual(esito.perdite, conFogli(esito, []))
    assert.deepEqual(esito.file.documenti, [])
  })

  it('il piano dice le ore che restano senza scaletta', () => {
    const { registro, piano } = registroPieno()
    const esito = eliminazione(registro, { genere: 'piano', id: piano.id })
    assert.match(esito.nome, /^il piano di Matematica — I MEC A/)
    assert.deepEqual(esito.staccati, ['1 lezione resta, senza scaletta e senza le spunte già messe'])
  })
})

describe('eliminazioni: la lezione tolta lascia la sua data', () => {
  it('le consegne legate prendono data e scadenza dell’ora, le altre no', () => {
    const { registro, corso, lezione, momento, rossi } = conOraEVerifica()
    const altra = creaLezione(corso.id, '2026-09-21', '08:20', 45)
    registro.lezioni.push(altra)
    const nata = creaConsegna(corso.id, 'Nata nell’ora', '2026-09-01', lezione.id)
    const scade = creaConsegna(corso.id, 'Scade nell’ora', '2026-09-01')
    scade.scadenzaLezioneId = lezione.id
    const estranea = creaConsegna(corso.id, 'Altrove', '2026-09-01', altra.id)
    estranea.scadenzaLezioneId = altra.id
    estranea.scadenza = '2026-09-02'
    registro.consegne.push(nata, scade, estranea)
    momento.lezioneId = lezione.id
    const lista = creaCheck(corso.id, [{ id: 'clc-1', titolo: 'Quaderno' }])
    lista.spunte = [spunta(rossi.id, 'clc-1', lezione.id)]
    registro.check.push(lista)

    const esito = togli(registro, { genere: 'lezione', id: lezione.id })

    assert.equal(esito.nome, 'la lezione del 2026-09-14')
    assert.deepEqual(esito.staccati, [
      '1 spunta del check resta, con la data al posto della lezione',
      '2 consegne restano, con la data al posto della lezione',
      '1 momento di valutazione resta, senza la lezione a cui era legato',
    ])
    assert.deepEqual(ordinate(esito), ['check', 'consegne', 'lezioni', 'valutazioni'])
    assert.deepEqual([nata.data, nata.dataLezioneId], ['2026-09-14', null])
    assert.deepEqual([scade.data, scade.scadenza, scade.scadenzaLezioneId], ['2026-09-01', '2026-09-14', null])
    assert.deepEqual(
      [estranea.data, estranea.dataLezioneId, estranea.scadenza, estranea.scadenzaLezioneId],
      ['2026-09-01', altra.id, '2026-09-02', altra.id],
    )
    assert.deepEqual([lista.spunte[0].data, lista.spunte[0].lezioneId], ['2026-09-14', null])
    assert.equal(momento.lezioneId, null)
  })
})

describe('eliminazioni: il secondo di due, e chi non c’è', () => {
  /** Due di tutto, con nomi diversi: sbagliare bersaglio si vede dal nome. */
  function dueDiTutto () {
    const pieno = registroPieno()
    const { registro, prima, seconda } = pieno
    const anno2 = creaAnno('2027-09-01', '2028-06-30')
    const materia2 = creaMateria('Storia')
    registro.anni.push(anno2)
    registro.materie.push(materia2)
    seconda.lezione.data = '2026-09-21'
    seconda.momento.titolo = 'Verifica B'
    const consegna2 = creaConsegna(seconda.corso.id, 'Seconda', '2026-09-20')
    registro.consegne.push(creaConsegna(prima.corso.id, 'Prima', '2026-09-20'), consegna2)
    return { ...pieno, anno2, materia2, consegna2 }
  }

  const casi = [
    ['anno', (s) => ({ genere: 'anno', id: s.anno2.id }), 'l’anno 2027/2028'],
    ['materia', (s) => ({ genere: 'materia', id: s.materia2.id }), 'la materia «Storia»'],
    ['classe', (s) => ({ genere: 'classe', id: s.seconda.classe.id }), 'la classe I MEC B'],
    ['corso', (s) => ({ genere: 'corso', id: s.seconda.corso.id }), 'il corso «Matematica — I MEC B»'],
    ['allievo', (s) => ({ genere: 'allievo', classeId: s.seconda.classe.id, id: s.seconda.bianchi.id }), 'Bianchi Luca'],
    ['lezione', (s) => ({ genere: 'lezione', id: s.seconda.lezione.id }), 'la lezione del 2026-09-21'],
    ['piano', (s) => ({ genere: 'piano', id: s.seconda.piano.id }), /^il piano di Matematica — I MEC B/],
    ['valutazione', (s) => ({ genere: 'valutazione', id: s.seconda.momento.id }), 'il momento «Verifica B»'],
    ['consegna', (s) => ({ genere: 'consegna', id: s.consegna2.id }), 'la consegna «Seconda»'],
  ]

  for (const [genere, mira, nome] of casi) {
    it(`${genere}: trova il secondo, e un id che non c’è non trova niente`, () => {
      const scena = dueDiTutto()
      const bersaglio = mira(scena)
      const esito = eliminazione(scena.registro, bersaglio)
      if (nome instanceof RegExp) assert.match(esito.nome, nome)
      else assert.equal(esito.nome, nome)
      assert.equal(eliminazione(scena.registro, { ...bersaglio, id: 'mai-esistito' }), null)
    })
  }

  it('un allievo cercato nella classe sbagliata non c’è', () => {
    const { registro, prima, seconda } = dueDiTutto()
    assert.equal(
      eliminazione(registro, { genere: 'allievo', classeId: seconda.classe.id, id: prima.rossi.id }),
      null,
    )
    assert.equal(
      eliminazione(registro, { genere: 'allievo', classeId: 'cls-mai-esistita', id: prima.rossi.id }),
      null,
    )
  })

  it('togliere il secondo lascia il primo', () => {
    const { registro, anno, anno2, materia, materia2 } = dueDiTutto()
    togli(registro, { genere: 'materia', id: materia2.id })
    assert.deepEqual(registro.materie.map((m) => m.id), [materia.id])
    togli(registro, { genere: 'anno', id: anno2.id })
    assert.deepEqual(registro.anni.map((a) => a.id), [anno.id])
    assert.equal(registro.annoCorrenteId, anno.id, 'l’anno aperto resta aperto')
  })
})
