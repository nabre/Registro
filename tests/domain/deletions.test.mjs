// Le eliminazioni: che cosa si porta via ognuna, e che cosa lascia in piedi.
//
// La prova che conta è sempre la stessa, ripetuta su ogni bersaglio: dopo aver
// tolto qualcosa, `riferimentiRotti` non deve avere niente da dire. È la regola
// che rende sicuro l'aver smesso di rifiutare le eliminazioni — si cancella
// tutto, ma quel che resta è sempre coerente.
//
// L'altra metà è che non si perda più del necessario: un piano lezione
// sopravvive alla sua materia, una valutazione di recupero alla sua lezione, i
// voti di tutti alla partenza di uno solo.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  creaAllievo,
  creaAnno,
  creaClasse,
  creaConsegna,
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
  registroVuoto,
  riferimentiRotti,
  lessico,
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

    // Un piano per corso: è di quel corso, e per l'altro se ne fa una copia —
    // che è come il riuso funziona da quando i piani stanno sul corso.
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
    // I piani non seguono l'anno: valgono ancora per l'anno prossimo — uno per
    // corso, e restano tutti e due, staccati dal corso che non c'è più.
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
    // Un piano senza allegati non si porta via nessuna cartella: i suoi file
    // stanno nell'archivio accanto a quelli degli altri documenti del corso, e
    // si tolgono per percorso — la prova sta più sotto.
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
    // Detto nel preventivo: prima non compariva, e la riga se ne andava senza
    // che chi confermava sapesse che c'era.
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

    // `applica` stacca le ore (`pianoId`, `avanzamento`) e i momenti
    // (`pianoId`), ma le due raccolte non venivano dichiarate: gli insiemi da
    // cui nascevano quelle righe si riempiono dai corsi, e per un bersaglio
    // «piano» restano vuoti. Una raccolta non dichiarata non viene riscritta,
    // quindi il distacco viveva solo in memoria e riaprendo l'anno i
    // riferimenti morti tornavano tutti.
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
    // Nell'archivio la cartella di un piano sta accanto a quelle degli altri
    // documenti dello stesso corso: si tolgono i suoi file, non la cartella.
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
    // Finché `risorse/<id>` esiste, si toglie anche quella: è la disposizione
    // di prima, e i file dentro non stanno accanto a niente d'altro.
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
    // Prima restava nella cartella: un PDF con l'appello di quel giorno e i
    // nomi di chi c'era, che racconta una lezione che il registro non ha più.
    const { registro, prima } = registroPieno()

    const esito = eliminazione(registro, { genere: 'lezione', id: prima.lezione.id })

    assert.equal(esito.file.stampati.length, 1)
    assert.match(esito.file.stampati[0], /^esportazioni\/.+Verbali.+\.pdf$/)
    // I fogli stampati stanno per conto loro: i documenti raccolti dal docente
    // non si rifanno con un pulsante, questi sì, e chi li cestina deve poterli
    // distinguere.
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
    // Una scheda per l'anno intero e una per semestre, e la stessa in due
    // posti: chiesta dalla materia sta nella sua cartella, chiesta dalla
    // classe in quella della classe. Toglierne una sola lascia le altre.
    const { registro } = registroPieno()
    const classe = registro.classi[0]
    const chi = classe.allievi[0]

    const esito = eliminazione(registro, { genere: 'allievo', classeId: classe.id, id: chi.id })

    assert.ok(esito.file.stampati.length >= 3)
    assert.ok(esito.file.stampati.every((p) => p.includes('Rossi Maria')))
  })

  it('quel che resta non si tocca', () => {
    // Il piano sopravvive al corso — è lavoro di preparazione — e il suo foglio
    // resta dov'è: si butta il PDF di quel che non c'è più, non di quel che c'è.
    const { registro } = registroPieno()
    const corso = registro.corsi[0]

    const esito = eliminazione(registro, { genere: 'corso', id: corso.id })

    assert.ok(!esito.file.stampati.some((p) => p.includes('Piani')))
    assert.ok(esito.file.stampati.some((p) => p.includes('Presenze')))
  })
})
