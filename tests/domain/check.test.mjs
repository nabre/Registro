// Il check, la lista di controllo di un corso: le regole di `domain/check.ts`
// (che cosa vuol dire spuntare, quale giorno vale, che cosa si perde togliendo
// una colonna), la lettura di un file toccato a mano, i riferimenti rotti e le
// spunte quando se ne vanno lezione, persona o corso.
//
// Una spunta data in un'ora segue l'ora, e se l'ora sparisce tiene il giorno
// che l'ora aveva, come nelle consegne.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import * as dominio from '../../dist-tests/domain.mjs'
import { scuolaMinima } from '../helpers/register.mjs'

const {
  allieviDelCheck,
  applicaColonne,
  applicaData,
  applicaSpunta,
  checkDelCorso,
  colonneRipulite,
  creaAnno,
  creaCheck,
  creaLezione,
  dataSpunta,
  eliminazione,
  fatteDellaColonna,
  fetteDellAnno,
  fondiCheck,
  normalizzaCheck,
  normalizzaRegistro,
  riferimentiRotti,
  riparazioni,
  spunteCheCadono,
} = dominio

/**
 * `spuntaDi` c'è in `check.ts` e in `assignments.ts`: il barile con due
 * `export *` omonimi non ne esporta nessuna, quindi si usa il nome col quale
 * esce.
 */
const spuntaDelCheck = dominio.spuntaDelCheck

const PRIMA = '2026-01-01T08:00:00.000Z'
/** Il quando di una spunta data in un'ora che nel registro non c'è. */
const SPARITA = { lezioneId: 'lez-sparita', data: '2026-09-14' }
const DOPO = '2026-10-01T08:00:00.000Z'

/**
 * Un anno con una classe di tre persone — una si è ritirata —, un corso, due
 * ore e un check con due colonne. Nessuna spunta: ogni prova mette le sue.
 */
function scena () {
  const { registro, anno, materia, classe, corso, rossi, bianchi, verdi } = scuolaMinima()
  verdi.attivo = false

  const lunedi = creaLezione(corso.id, '2026-09-14', '08:20', 45)
  const martedi = creaLezione(corso.id, '2026-09-15', '08:20', 45)
  registro.lezioni.push(lunedi, martedi)

  const check = creaCheck(corso.id, [
    { id: 'clc-regolamento', titolo: 'Regolamento firmato' },
    { id: 'clc-quaderno', titolo: 'Quaderno' },
  ])
  check.aggiornatoIl = PRIMA
  registro.check.push(check)

  return { registro, anno, materia, classe, corso, rossi, bianchi, verdi, lunedi, martedi, check }
}

/** Spunta dentro un'ora: il rimando alla lezione e il suo giorno di riserva. */
function inOra (lezione) {
  return { lezioneId: lezione.id, data: lezione.data }
}

// ------------------------------------------------------------ check.ts

describe('check: le letture', () => {
  it('checkDelCorso trova la lista del corso, e nessuna per un corso che non ne ha', () => {
    const { registro, corso, check } = scena()

    assert.equal(checkDelCorso(registro, corso.id), check)
    assert.equal(checkDelCorso(registro, 'cor-inesistente'), null)
  })

  it('spuntaDelCheck dice la spunta di una casella, e null se è vuota', () => {
    assert.equal(
      typeof spuntaDelCheck,
      'function',
      'check.ts: `spuntaDi` va rinominata `spuntaDelCheck`, o il barile non la esporta',
    )
    const { check, rossi, lunedi } = scena()
    applicaSpunta(check, rossi.id, 'clc-quaderno', inOra(lunedi), DOPO)

    assert.equal(spuntaDelCheck(check, rossi.id, 'clc-quaderno').lezioneId, lunedi.id)
    assert.equal(spuntaDelCheck(check, rossi.id, 'clc-regolamento'), null)
  })

  it('dataSpunta segue la lezione quando la lezione si sposta', () => {
    const { registro, check, rossi, lunedi } = scena()
    applicaSpunta(check, rossi.id, 'clc-quaderno', inOra(lunedi), DOPO)
    const spunta = check.spunte[0]

    assert.equal(dataSpunta(registro, spunta), '2026-09-14')
    lunedi.data = '2026-09-21'
    assert.equal(dataSpunta(registro, spunta), '2026-09-21')
  })

  it('dataSpunta ripiega sul giorno scritto se la lezione non c’è più', () => {
    const { registro, check, rossi, lunedi } = scena()
    applicaSpunta(check, rossi.id, 'clc-quaderno', inOra(lunedi), DOPO)
    registro.lezioni = registro.lezioni.filter((l) => l.id !== lunedi.id)

    assert.equal(dataSpunta(registro, check.spunte[0]), '2026-09-14')
  })

  it('dataSpunta di una data scelta a mano è quella data', () => {
    const { registro, check, rossi } = scena()
    applicaData(check, rossi.id, 'clc-quaderno', '2026-10-03', DOPO)

    assert.equal(dataSpunta(registro, check.spunte[0]), '2026-10-03')
  })

  it('allieviDelCheck: chi frequenta, più chi si è ritirato con qualcosa di spuntato', () => {
    const { registro, corso, check, verdi } = scena()

    // Senza spunte, chi si è ritirato non ha una riga: resterebbe aperta per sempre.
    assert.deepEqual(allieviDelCheck(registro, corso.id).map((a) => a.cognome), [
      'Bianchi',
      'Rossi',
    ])

    // Con una spunta, la riga torna: quel che ha fatto mentre c'era è successo.
    applicaData(check, verdi.id, 'clc-quaderno', '2026-09-20', DOPO)
    assert.deepEqual(
      allieviDelCheck(registro, corso.id).map((a) => a.cognome).sort(),
      ['Bianchi', 'Rossi', 'Verdi'],
    )
    assert.deepEqual(allieviDelCheck(registro, 'cor-inesistente'), [])
  })

  it('fatteDellaColonna conta solo fra le persone date', () => {
    const { check, rossi, bianchi, verdi, lunedi } = scena()
    applicaSpunta(check, rossi.id, 'clc-quaderno', inOra(lunedi), DOPO)
    applicaSpunta(check, verdi.id, 'clc-quaderno', inOra(lunedi), DOPO)
    applicaSpunta(check, bianchi.id, 'clc-regolamento', inOra(lunedi), DOPO)

    assert.equal(fatteDellaColonna(check, 'clc-quaderno', [rossi, bianchi]), 1)
    assert.equal(fatteDellaColonna(check, 'clc-quaderno', [rossi, bianchi, verdi]), 2)
    assert.equal(fatteDellaColonna(check, 'clc-regolamento', []), 0)
  })
})

describe('check: le colonne', () => {
  it('colonneRipulite toglie spazi e colonne senza titolo, e dà un id a chi non ce l’ha', () => {
    const pulite = colonneRipulite([
      { id: 'clc-a', titolo: '  Quaderno  ' },
      { id: 'clc-b', titolo: '   ' },
      { id: '', titolo: 'Relazione' },
    ])

    assert.equal(pulite.length, 2)
    assert.deepEqual(pulite[0], { id: 'clc-a', titolo: 'Quaderno' })
    assert.equal(pulite[1].titolo, 'Relazione')
    assert.match(pulite[1].id, /^clc/)
  })

  it('colonneRipulite non lascia due colonne con lo stesso id', () => {
    const pulite = colonneRipulite([
      { id: 'clc-a', titolo: 'Uno' },
      { id: 'clc-a', titolo: 'Due' },
    ])

    assert.equal(pulite[0].id, 'clc-a')
    assert.notEqual(pulite[1].id, 'clc-a')
  })

  it('spunteCheCadono conta le spunte delle colonne che spariscono', () => {
    const { check, rossi, bianchi, lunedi } = scena()
    applicaSpunta(check, rossi.id, 'clc-quaderno', inOra(lunedi), DOPO)
    applicaSpunta(check, bianchi.id, 'clc-quaderno', inOra(lunedi), DOPO)
    applicaSpunta(check, rossi.id, 'clc-regolamento', inOra(lunedi), DOPO)

    assert.equal(spunteCheCadono(check, [{ id: 'clc-regolamento', titolo: 'Regolamento' }]), 2)
    assert.equal(spunteCheCadono(check, check.colonne), 0)
    assert.equal(spunteCheCadono(null, []), 0)
  })

  it('applicaColonne rinomina senza staccare e toglie le spunte delle colonne sparite', () => {
    const { check, rossi, lunedi } = scena()
    applicaSpunta(check, rossi.id, 'clc-quaderno', inOra(lunedi), DOPO)
    applicaSpunta(check, rossi.id, 'clc-regolamento', inOra(lunedi), DOPO)

    const cambiato = applicaColonne(
      check,
      [{ id: 'clc-quaderno', titolo: 'Quaderno di bordo' }],
      '2026-11-01T08:00:00.000Z',
    )

    assert.equal(cambiato, true)
    assert.deepEqual(check.colonne, [{ id: 'clc-quaderno', titolo: 'Quaderno di bordo' }])
    assert.deepEqual(check.spunte.map((s) => s.colonnaId), ['clc-quaderno'])
    assert.equal(check.aggiornatoIl, '2026-11-01T08:00:00.000Z')
  })

  it('applicaColonne con le stesse colonne non cambia niente', () => {
    const { check } = scena()

    assert.equal(applicaColonne(check, check.colonne.map((c) => ({ ...c })), DOPO), false)
    assert.equal(check.aggiornatoIl, PRIMA)
  })
})

describe('check: le spunte', () => {
  it('applicaSpunta spunta, e una seconda volta non cambia il quando', () => {
    const { check, rossi, lunedi, martedi } = scena()

    assert.equal(applicaSpunta(check, rossi.id, 'clc-quaderno', inOra(lunedi), DOPO), true)
    assert.equal(check.aggiornatoIl, DOPO)
    // Il doppio clic, o la rispunta da un'altra ora: resta la prima volta.
    assert.equal(applicaSpunta(check, rossi.id, 'clc-quaderno', inOra(martedi), DOPO), false)
    assert.equal(check.spunte.length, 1)
    assert.equal(check.spunte[0].lezioneId, lunedi.id)
    assert.equal(check.spunte[0].fattaIl, DOPO)
  })

  it('applicaSpunta con null toglie la spunta, e su una casella vuota non fa niente', () => {
    const { check, rossi, lunedi } = scena()
    applicaSpunta(check, rossi.id, 'clc-quaderno', inOra(lunedi), DOPO)

    assert.equal(applicaSpunta(check, rossi.id, 'clc-quaderno', null, DOPO), true)
    assert.deepEqual(check.spunte, [])
    assert.equal(applicaSpunta(check, rossi.id, 'clc-quaderno', null, DOPO), false)
  })

  it('applicaData stacca la spunta dall’ora e le dà il giorno scelto', () => {
    const { check, rossi, lunedi } = scena()
    applicaSpunta(check, rossi.id, 'clc-quaderno', inOra(lunedi), DOPO)

    assert.equal(applicaData(check, rossi.id, 'clc-quaderno', '2026-09-30', DOPO), true)
    assert.equal(check.spunte[0].lezioneId, null)
    assert.equal(check.spunte[0].data, '2026-09-30')
    // Lo stesso giorno una seconda volta non è un cambiamento.
    assert.equal(applicaData(check, rossi.id, 'clc-quaderno', '2026-09-30', DOPO), false)
  })

  it('applicaData su una casella vuota la spunta, e rifiuta un giorno che non esiste', () => {
    const { check, rossi } = scena()

    assert.equal(applicaData(check, rossi.id, 'clc-quaderno', '2026-02-30', DOPO), false)
    assert.deepEqual(check.spunte, [])
    assert.equal(applicaData(check, rossi.id, 'clc-quaderno', '2026-10-02', DOPO), true)
    assert.deepEqual(
      { lezioneId: check.spunte[0].lezioneId, data: check.spunte[0].data },
      { lezioneId: null, data: '2026-10-02' },
    )
  })
})

// ------------------------------------------------------------ costruzione

describe('check: la spunta riportata a un’ora', () => {
  const { applicaLezione } = dominio
  const ORA = { id: 'lez-ora', data: '2026-09-14' }
  const lista = (spunte = []) => ({
    id: 'chk-1', corsoId: 'cor-1', colonne: [{ id: 'c1', titolo: 'Modulo' }],
    spunte, creatoIl: PRIMA, aggiornatoIl: PRIMA,
  })

  it('una spunta con la data scelta a mano passa all’ora', () => {
    const check = lista([
      { allievoId: 'a1', colonnaId: 'c1', lezioneId: null, data: '2026-09-02', fattaIl: PRIMA },
    ])
    assert.equal(applicaLezione(check, 'a1', 'c1', ORA, DOPO), true)
    assert.deepEqual(
      { lezioneId: check.spunte[0].lezioneId, data: check.spunte[0].data },
      { lezioneId: 'lez-ora', data: '2026-09-14' },
    )
    // Il quando in cui è stata scritta resta: è l'ordine, non il giorno.
    assert.equal(check.spunte[0].fattaIl, PRIMA)
    assert.equal(check.aggiornatoIl, DOPO)
  })

  it('una casella vuota diventa spuntata in quell’ora', () => {
    const check = lista()
    assert.equal(applicaLezione(check, 'a1', 'c1', ORA, DOPO), true)
    assert.equal(check.spunte.length, 1)
    assert.equal(check.spunte[0].lezioneId, 'lez-ora')
  })

  it('la stessa ora non cambia niente', () => {
    const check = lista([
      { allievoId: 'a1', colonnaId: 'c1', lezioneId: 'lez-ora', data: '2026-09-14', fattaIl: PRIMA },
    ])
    assert.equal(applicaLezione(check, 'a1', 'c1', ORA, DOPO), false)
    assert.equal(check.aggiornatoIl, PRIMA)
  })
})

describe('check: il riepilogo del corso e il check di una persona', () => {
  // La scheda del corso e la scheda della persona leggono il check da qui: i
  // conti sugli attivi, anche se fra le righe della griglia ci sono i ritirati.
  const { riepilogoDelCheck, checkDellAllievo } = dominio

  it('riepilogoDelCheck conta le fatte fra chi frequenta e dice chi manca', () => {
    const { registro, corso, check, rossi, bianchi, verdi, lunedi } = scena()
    applicaSpunta(check, rossi.id, 'clc-quaderno', inOra(lunedi), DOPO)
    // Chi si è ritirato con una spunta non entra né fra le fatte né nel totale.
    applicaSpunta(check, verdi.id, 'clc-quaderno', inOra(lunedi), DOPO)

    const riepilogo = riepilogoDelCheck(registro, corso.id)
    assert.deepEqual(
      riepilogo.map((r) => [r.colonna.id, r.fatte, r.totale, r.mancano.map((a) => a.cognome)]),
      [
        ['clc-regolamento', 0, 2, ['Bianchi', 'Rossi']],
        ['clc-quaderno', 1, 2, ['Bianchi']],
      ],
    )

    applicaData(check, bianchi.id, 'clc-quaderno', '2026-09-20', DOPO)
    const quaderno = riepilogoDelCheck(registro, corso.id)[1]
    assert.equal(quaderno.fatte, quaderno.totale, 'la colonna chiusa: tutti fra chi frequenta')
    assert.deepEqual(quaderno.mancano, [])
  })

  it('riepilogoDelCheck di un corso senza check è vuoto', () => {
    const { registro } = scena()
    assert.deepEqual(riepilogoDelCheck(registro, 'cor-inesistente'), [])
  })

  it('checkDellAllievo dà una voce per colonna, con il giorno di dataSpunta', () => {
    const { registro, corso, check, rossi, lunedi } = scena()
    applicaSpunta(check, rossi.id, 'clc-quaderno', inOra(lunedi), DOPO)
    lunedi.data = '2026-09-21'

    const caselle = checkDellAllievo(registro, corso.id, rossi.id)
    assert.deepEqual(caselle.map((c) => c.colonna.id), ['clc-regolamento', 'clc-quaderno'])
    assert.equal(caselle[0].spunta, null)
    assert.equal(caselle[0].data, null)
    assert.equal(caselle[1].spunta.lezioneId, lunedi.id)
    // Il giorno segue l'ora spostata, come nella griglia.
    assert.equal(caselle[1].data, '2026-09-21')
  })

  it('checkDellAllievo è vuoto se il corso non ha check o non ha colonne', () => {
    const { registro, corso, check, rossi } = scena()
    assert.deepEqual(checkDellAllievo(registro, 'cor-inesistente', rossi.id), [])
    check.colonne = []
    assert.deepEqual(checkDellAllievo(registro, corso.id, rossi.id), [])
  })
})

describe('check: il clic sinistro', () => {
  // Il clic sinistro spunta una casella vuota e toglie solo quella spuntata nel
  // giorno di cui si parla (oggi nella pagina, il giorno dell'ora dentro un'ora).
  // Il resto passa dal tasto destro.
  const { gestoDelClic } = dominio

  it('una casella vuota si spunta', () => {
    assert.equal(gestoDelClic(null, '2026-09-14'), 'spunta')
  })

  it('una spuntata nel giorno del contesto si toglie', () => {
    assert.equal(gestoDelClic('2026-09-14', '2026-09-14'), 'togli')
  })

  it('una spuntata in un altro giorno non si tocca col clic', () => {
    assert.equal(gestoDelClic('2026-09-10', '2026-09-14'), null)
    assert.equal(gestoDelClic('2026-09-15', '2026-09-14'), null)
  })
})

describe('check: creaCheck e fondiCheck', () => {
  it('creaCheck nasce senza spunte, con colonne sue e non prestate', () => {
    const colonne = [{ id: 'clc-a', titolo: 'Quaderno' }]
    const check = creaCheck('cor-1', colonne)

    assert.match(check.id, /^chk/)
    assert.deepEqual(check.spunte, [])
    assert.deepEqual(check.colonne, colonne)
    colonne[0].titolo = 'Cambiato'
    assert.equal(check.colonne[0].titolo, 'Quaderno')
  })

  it('fondiCheck aggiunge colonne e spunte mancanti e non tocca quelle che ci sono', () => {
    const dentro = creaCheck('cor-1', [{ id: 'clc-a', titolo: 'Quaderno' }])
    dentro.spunte.push({
      allievoId: 'alv-1', colonnaId: 'clc-a', lezioneId: null, data: '2026-09-01', fattaIl: PRIMA,
    })
    const altro = creaCheck('cor-2', [
      { id: 'clc-a', titolo: 'Quaderno (doppione)' },
      { id: 'clc-b', titolo: 'Relazione' },
    ])
    altro.spunte.push(
      { allievoId: 'alv-1', colonnaId: 'clc-a', lezioneId: null, data: '2026-12-01' },
      { allievoId: 'alv-1', colonnaId: 'clc-b', lezioneId: null, data: '2026-12-02' },
    )

    fondiCheck(dentro, altro)

    assert.deepEqual(dentro.colonne.map((c) => c.titolo), ['Quaderno', 'Relazione'])
    assert.deepEqual(
      dentro.spunte.map((s) => `${s.colonnaId} ${s.data}`),
      ['clc-a 2026-09-01', 'clc-b 2026-12-02'],
    )
  })
})

// ------------------------------------------------------------ lettura

describe('check: la lettura del file', () => {
  it('rimette id, date e liste mancanti', () => {
    const check = normalizzaCheck({
      corsoId: 'cor-1',
      colonne: [{ id: 'clc-a', titolo: ' Quaderno ' }],
      spunte: [
        // Giorno illeggibile: vale quello in cui la spunta è stata scritta.
        {
          allievoId: 'alv-1',
          colonnaId: 'clc-a',
          data: 'ieri',
          fattaIl: '2026-09-18T10:00:00.000Z',
        },
      ],
    })

    assert.match(check.id, /^chk/)
    assert.deepEqual(check.colonne, [{ id: 'clc-a', titolo: 'Quaderno' }])
    assert.equal(check.spunte[0].data, '2026-09-18')
    assert.equal(check.spunte[0].lezioneId, null)
    assert.ok(check.creatoIl)

    const spoglio = normalizzaCheck({ corsoId: 'cor-1' })
    assert.deepEqual(spoglio.colonne, [])
    assert.deepEqual(spoglio.spunte, [])
  })

  it('tiene la prima di due spunte sulla stessa casella', () => {
    const check = normalizzaCheck({
      id: 'chk-1',
      corsoId: 'cor-1',
      colonne: [{ id: 'clc-a', titolo: 'Quaderno' }],
      spunte: [
        { allievoId: 'alv-1', colonnaId: 'clc-a', lezioneId: null, data: '2026-09-01' },
        { allievoId: 'alv-1', colonnaId: 'clc-a', lezioneId: null, data: '2026-09-09' },
      ],
    })

    assert.deepEqual(check.spunte.map((s) => s.data), ['2026-09-01'])
  })

  it('toglie le spunte di colonne che non ci sono e quelle senza persona', () => {
    const check = normalizzaCheck({
      id: 'chk-1',
      corsoId: 'cor-1',
      colonne: [{ id: 'clc-a', titolo: 'Quaderno' }],
      spunte: [
        { allievoId: 'alv-1', colonnaId: 'clc-sparita', data: '2026-09-01' },
        { colonnaId: 'clc-a', data: '2026-09-01' },
        { allievoId: 'alv-2', colonnaId: 'clc-a', lezioneId: '', data: '2026-09-02' },
      ],
    })

    assert.equal(check.spunte.length, 1)
    assert.equal(check.spunte[0].allievoId, 'alv-2')
    // Un rimando vuoto non è un rimando.
    assert.equal(check.spunte[0].lezioneId, null)
  })

  it('un registro senza check — un file di prima — si legge con la lista vuota', () => {
    const { registro } = scena()
    const { check: _via, ...vecchio } = JSON.parse(JSON.stringify(registro))

    assert.deepEqual(normalizzaRegistro(vecchio).check, [])
  })

  it('due liste per lo stesso corso diventano una, senza perdere spunte', () => {
    const { registro, corso, rossi } = scena()
    const grezzo = JSON.parse(JSON.stringify(registro))
    grezzo.check.push({
      id: 'chk-doppio',
      corsoId: corso.id,
      colonne: [{ id: 'clc-altra', titolo: 'Libro' }],
      spunte: [
        { allievoId: rossi.id, colonnaId: 'clc-altra', lezioneId: null, data: '2026-09-02' },
      ],
    })

    const letto = normalizzaRegistro(grezzo)

    assert.equal(letto.check.length, 1)
    assert.deepEqual(letto.check[0].colonne.map((c) => c.id), [
      'clc-regolamento',
      'clc-quaderno',
      'clc-altra',
    ])
    assert.equal(letto.check[0].spunte.length, 1)
  })
})

// ------------------------------------------------------------ integrità

describe('check: i riferimenti rotti', () => {
  it('un check sano non dice niente', () => {
    const { registro, check, rossi, lunedi } = scena()
    applicaSpunta(check, rossi.id, 'clc-quaderno', inOra(lunedi), DOPO)

    assert.deepEqual(riferimentiRotti(registro), [])
  })

  it('segnala il check di un corso che non c’è', () => {
    const { registro } = scena()
    registro.check.push(creaCheck('cor-sparito'))

    assert.ok(riferimentiRotti(registro).some((p) => /check.*nessun corso/.test(p)))
  })

  it('segnala la spunta che cita una lezione sparita', () => {
    const { registro, check, rossi } = scena()
    applicaSpunta(check, rossi.id, 'clc-quaderno', SPARITA, DOPO)

    assert.ok(riferimentiRotti(registro).some((p) => /spunta cita una lezione/.test(p)))
  })

  it('segnala le spunte di chi non è nella classe', () => {
    const { registro, check } = scena()
    applicaData(check, 'alv-estraneo', 'clc-quaderno', '2026-09-14', DOPO)

    assert.ok(riferimentiRotti(registro).some((p) => /spunte di .* non iscritt/.test(p)))
  })
})

// ------------------------------------------------------------ eliminazioni

/** Come fa il centralino: calcola, applica, e pretende un registro coerente. */
function togli (registro, bersaglio) {
  const piano = eliminazione(registro, bersaglio)
  assert.ok(piano, 'il bersaglio doveva esistere')
  piano.applica(registro)
  assert.deepEqual(riferimentiRotti(registro), [])
  return piano
}

describe('check: le eliminazioni', () => {
  it('la lezione che se ne va lascia le spunte, con il suo giorno al posto del rimando', () => {
    const { registro, check, rossi, bianchi, lunedi, martedi } = scena()
    applicaSpunta(check, rossi.id, 'clc-quaderno', inOra(lunedi), DOPO)
    applicaSpunta(check, bianchi.id, 'clc-quaderno', inOra(martedi), DOPO)
    // L'ora si era spostata dopo la spunta: vale il giorno di adesso.
    lunedi.data = '2026-09-21'

    const piano = togli(registro, { genere: 'lezione', id: lunedi.id })

    assert.ok(piano.collezioni.includes('check'))
    assert.ok(piano.staccati.some((s) => /1 spunta del check resta, con la data/.test(s)))
    const sua = check.spunte.find((s) => s.allievoId === rossi.id)
    assert.deepEqual({ lezioneId: sua.lezioneId, data: sua.data }, {
      lezioneId: null,
      data: '2026-09-21',
    })
    // Quella dell'altra ora non si tocca.
    assert.equal(check.spunte.find((s) => s.allievoId === bianchi.id).lezioneId, martedi.id)
  })

  it('una lezione senza spunte non tocca il file del check', () => {
    const { registro, lunedi } = scena()

    const piano = togli(registro, { genere: 'lezione', id: lunedi.id })

    assert.ok(!piano.collezioni.includes('check'))
  })

  it('la persona che se ne va si porta via le sue spunte, e lo dice', () => {
    const { registro, classe, check, rossi, bianchi, lunedi } = scena()
    applicaSpunta(check, rossi.id, 'clc-quaderno', inOra(lunedi), DOPO)
    applicaSpunta(check, rossi.id, 'clc-regolamento', inOra(lunedi), DOPO)
    applicaSpunta(check, bianchi.id, 'clc-quaderno', inOra(lunedi), DOPO)

    const piano = togli(registro, { genere: 'allievo', classeId: classe.id, id: rossi.id })

    assert.ok(piano.perdite.includes('2 spunte del check'))
    assert.ok(piano.collezioni.includes('check'))
    assert.deepEqual(check.spunte.map((s) => s.allievoId), [bianchi.id])
  })

  it('il corso che se ne va si porta via il suo check', () => {
    const { registro, corso, check, rossi, lunedi } = scena()
    applicaSpunta(check, rossi.id, 'clc-quaderno', inOra(lunedi), DOPO)

    const piano = togli(registro, { genere: 'corso', id: corso.id })

    assert.deepEqual(registro.check, [])
    assert.ok(piano.collezioni.includes('check'))
    assert.ok(piano.perdite.some((p) => /1 check, con 1 spunta/.test(p)))
    // Il check se ne va intero: le sue spunte non sono «staccate».
    assert.ok(!piano.staccati.some((s) => /spunt/.test(s)))
  })

  it('anche con la classe, la materia e l’anno', () => {
    for (const genere of ['classe', 'materia', 'anno']) {
      const s = scena()
      const id = { classe: s.classe.id, materia: s.materia.id, anno: s.anno.id }[genere]

      const piano = togli(s.registro, { genere, id })

      assert.deepEqual(s.registro.check, [], genere)
      assert.ok(piano.collezioni.includes('check'), genere)
    }
  })
})

// ------------------------------------------------------------ riparazioni

describe('check: le riparazioni', () => {
  it('stacca la spunta dalla lezione sparita e le lascia il giorno che aveva', () => {
    const { registro, check, rossi } = scena()
    applicaSpunta(check, rossi.id, 'clc-quaderno', SPARITA, DOPO)

    const proposta = riparazioni(registro).find((r) => r.collezioni.includes('check'))
    assert.ok(proposta, 'la riparazione doveva essere proposta')
    assert.match(proposta.descrizione, /1 spunta del check/)
    proposta.applica(registro)

    assert.deepEqual(
      { lezioneId: check.spunte[0].lezioneId, data: check.spunte[0].data },
      { lezioneId: null, data: '2026-09-14' },
    )
    assert.deepEqual(riferimentiRotti(registro), [])
  })

  it('non propone niente per un check sano', () => {
    const { registro, check, rossi, lunedi } = scena()
    applicaSpunta(check, rossi.id, 'clc-quaderno', inOra(lunedi), DOPO)

    assert.ok(!riparazioni(registro).some((r) => r.collezioni.includes('check')))
  })
})

// ------------------------------------------------------------ anni

describe('check: la divisione per anno', () => {
  it('il check va nell’anno del suo corso', () => {
    const { registro, anno, check } = scena()
    const altro = creaAnno('2027-09-01', '2028-06-30')
    registro.anni.push(altro)

    assert.deepEqual(fetteDellAnno(registro, anno.id, false).check, [check])
    assert.deepEqual(fetteDellAnno(registro, altro.id, false).check, [])
  })
})
