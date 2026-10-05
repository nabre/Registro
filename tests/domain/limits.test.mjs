// I tetti contro i dati fuori misura che arrivano dall'API o da un file
// scritto a mano: ognuno, senza tetto, fermava il processo o scriveva nomi
// che il disco non accetta.
//
//   una scala da un miliardo di voti    rifiutata, e la tendina resta corta
//   una fascia oltre mezzanotte         rifiutata
//   un anno di tre anni                 rifiutato
//   una serie ICS dal 1601             letta senza contare ogni giorno
//   un nome di classe lunghissimo       cartella accorciata, i nomi veri no
//   CONIN$, COM¹, LPT0                  nomi riservati anche questi

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  leggiCalendario,
  nomeSicuro,
  normalizzaImpostazioni,
  percorsoArchivio,
  validaAnno,
  validaRicorrenza,
  validaScala,
  votiDellaScala,
} from '../../dist-tests/domain.mjs'

describe('la scala dei voti ha un tetto', () => {
  const enorme = { min: 0, max: 1e9, sufficienza: 4, passo: 1 }

  it('validaScala rifiuta estremi e passi fuori misura', () => {
    assert.equal(validaScala(enorme).valido, false)
    assert.equal(validaScala({ min: 1, max: 6, sufficienza: 4, passo: 0.001 }).valido, false)
    assert.equal(validaScala({ min: -2000, max: 6, sufficienza: 4, passo: 1 }).valido, false)
    assert.equal(validaScala({ min: 1, max: 6, sufficienza: 4, passo: 0.25 }).valido, true)
    assert.equal(validaScala({ min: 0, max: 100, sufficienza: 60, passo: 0.25 }).valido, true)
  })

  it('votiDellaScala non genera più di quattrocento passi', () => {
    assert.equal(votiDellaScala(enorme).length, 401)
  })

  it('un file avvelenato torna a una scala che sta in piedi', () => {
    const letta = (scala) => normalizzaImpostazioni({ scala }).scala
    const fuori = letta(enorme)
    assert.equal(validaScala(fuori).valido, true)
    const fitta = letta({ min: 0, max: 1000, sufficienza: 600, passo: 0.01 })
    assert.equal(fitta.min, 0)
    assert.equal(fitta.max, 1000)
    assert.equal(validaScala(fitta).valido, true)
    const solita = letta({ min: 1, max: 6, sufficienza: 4, passo: 0.5 })
    assert.deepEqual(solita, { min: 1, max: 6, sufficienza: 4, passo: 0.5 })
  })
})

describe('una fascia dell’orario sta in un giorno', () => {
  it('23:00 per due unità da 45 minuti si rifiuta', () => {
    const esito = validaRicorrenza({ id: 'r1', giorno: 1, inizio: '23:00', durataMin: 90 }, 45)
    assert.equal(esito.valido, false)
  })

  it('finire a mezzanotte in punto va bene', () => {
    const esito = validaRicorrenza({ id: 'r1', giorno: 1, inizio: '22:30', durataMin: 90 }, 45)
    assert.equal(esito.valido, true, esito.errori.join(' '))
  })
})

describe('un anno scolastico dura al più due anni', () => {
  const anno = (fine) => ({
    etichetta: '2026/27',
    inizio: '2026-08-31',
    fine,
    semestri: [
      { id: 's1', numero: 1, inizio: '2026-08-31', fine: '2027-01-31' },
      { id: 's2', numero: 2, inizio: '2027-02-01', fine },
    ],
    sospensioni: [],
  })

  it('tre anni si rifiutano, uno no', () => {
    assert.equal(validaAnno(anno('2029-06-30')).valido, false)
    const solito = validaAnno(anno('2027-06-30'))
    assert.equal(solito.valido, true, solito.errori.join(' '))
  })
})

describe('una serie ICS lontana nel passato', () => {
  const ics = (regola) => [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    'UID:antica',
    'DTSTART;TZID=Europe/Zurich:16010101T080000',
    'DTEND;TZID=Europe/Zurich:16010101T090000',
    `RRULE:${regola}`,
    'SUMMARY:Sempre',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')

  it('senza COUNT salta avanti e tiene il passo della regola', () => {
    const { eventi } = leggiCalendario(ics('FREQ=DAILY'), '2026-09-14', '2026-09-20', 'Europe/Zurich')
    assert.equal(eventi.length, 7)
    // A settimane alterne dal lunedì 1.1.1601: dopo il salto ogni occorrenza
    // cade ancora a un multiplo di quattordici giorni, mai una settimana spostata.
    const settimane = leggiCalendario(
      ics('FREQ=WEEKLY;INTERVAL=2'), '2026-09-01', '2026-09-30', 'Europe/Zurich',
    ).eventi.map((e) => e.data)
    assert.equal(settimane.length >= 2, true)
    const primo = Date.UTC(1601, 0, 1)
    for (const data of settimane) {
      const giorni = (new Date(`${data}T00:00:00Z`).getTime() - primo) / 86_400_000
      assert.equal(giorni % 14, 0, data)
    }
  })

  it('con COUNT enorme si ferma al tetto invece di contare per sempre', () => {
    const inizio = Date.now()
    leggiCalendario(ics('FREQ=DAILY;COUNT=999999999'), '2026-09-14', '2026-09-20', 'Europe/Zurich')
    assert.ok(Date.now() - inizio < 5000)
  })
})

describe('le cartelle dell’archivio', () => {
  it('un nome lunghissimo si accorcia a ottanta caratteri, emoji intere', () => {
    const lungo = `${'😀'.repeat(50)}${'x'.repeat(200)}`
    const pezzi = percorsoArchivio(lungo, lungo, 'foglio.pdf', lungo).split('/')
    for (const pezzo of pezzi.slice(1, -1)) {
      assert.ok(Array.from(pezzo).length <= 80, pezzo)
      assert.equal(pezzo, pezzo.toWellFormed())
    }
  })

  it('un nome vero non cambia percorso', () => {
    assert.equal(
      percorsoArchivio('I MEC A', 'Calcolo professionale', 'foglio.pdf', 'Rossi Mario'),
      'archivio/Calcolo professionale/I MEC A/allievi/Rossi Mario/foglio.pdf',
    )
  })
})

describe('i nomi riservati di Windows', () => {
  it('anche le console, gli esponenti e lo zero', () => {
    for (const nome of ['CONIN$', 'conout$', 'COM¹', 'LPT³', 'COM0', 'lpt0.txt']) {
      assert.equal(nomeSicuro(nome), `${nome}-`)
    }
    assert.equal(nomeSicuro('COMPITI'), 'COMPITI')
  })
})
