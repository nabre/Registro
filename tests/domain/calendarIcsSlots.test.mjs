// Le fasce di una lezione che vengono dal calendario ICS (`Slot.ics`) e quelle
// accanto. Il confronto guarda solo le fasce del calendario, le fasce libere
// seguono l'evento quando si sposta, e le maniglie dell'editor fanno crescere
// o calare solo le libere.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  allineamentiAutomatici,
  collegaEventi,
  collegataPerCerto,
  confrontaLezione,
  creaLezione,
  normalizzaRegistro,
  slotDaFasce,
  slotDelCalendario,
  slotLiberi,
  slotSegnati,
  slotStiratiAncorati,
  leggiCalendario,
} from '../../dist-tests/domain.mjs'
import { scuolaMinima } from '../helpers/register.mjs'

const PRIMA = '2026-09-01'

const evento = (data, inizio, fine, altro = {}) => ({
  chiave: `${data}T${inizio}`, data, inizio, fine, titolo: 'MAT', luogo: '', annullato: false, ...altro,
})

const slot = (id, inizio, fine, tipo = 'lezione', ics = false) =>
  ({ id, inizio, fine, tipo, ...(ics ? { ics: true } : {}) })

/** Le fasce in breve: «08:00-08:45 lezione ics». */
const inBreve = (fasce) =>
  fasce.map((f) => `${f.inizio}-${f.fine} ${f.tipo}${f.ics ? ' ics' : ''}`)

describe('le fasce del calendario e le libere', () => {
  it('senza nessuna fascia segnata valgono tutte come del calendario', () => {
    const tutte = [slot('a', '08:00', '08:45'), slot('b', '08:45', '09:30')]
    assert.equal(slotDelCalendario(tutte).length, 2)
    assert.deepEqual(slotLiberi(tutte), [])
    assert.ok(slotSegnati(tutte).every((s) => s.ics))
  })

  it('con una fascia segnata, le altre sono libere', () => {
    const miste = [slot('a', '07:15', '08:00'), slot('b', '08:00', '08:45', 'lezione', true)]
    assert.deepEqual(slotDelCalendario(miste).map((s) => s.id), ['b'])
    assert.deepEqual(slotLiberi(miste).map((s) => s.id), ['a'])
  })

  it('il segno sopravvive alla lettura del file e alla scrittura dal calendario', () => {
    const { registro, corso } = scuolaMinima()
    const lezione = creaLezione(corso.id, '2026-09-15', '08:00', 45)
    lezione.slot = [slot('a', '08:00', '08:45', 'lezione', true), slot('b', '08:45', '09:30')]
    registro.lezioni.push(lezione)
    const letta = normalizzaRegistro(JSON.parse(JSON.stringify(registro))).lezioni[0]
    assert.deepEqual(letta.slot.map((s) => Boolean(s.ics)), [true, false])
    const scritti = slotDaFasce([
      { inizio: '08:00', fine: '08:45', tipo: 'lezione', ics: true },
      { inizio: '08:45', fine: '09:30', tipo: 'lezione' },
    ])
    assert.deepEqual(scritti.map((s) => Boolean(s.ics)), [true, false])
  })
})

describe('confrontaLezione: le fasce libere non sono una differenza', () => {
  it('un’ora aggiunta dopo l’evento combacia ancora', () => {
    const { corso } = scuolaMinima()
    const lezione = creaLezione(corso.id, '2026-09-15', '08:00', 45)
    lezione.slot = [slot('a', '08:00', '08:45', 'lezione', true), slot('b', '08:45', '09:30')]
    const voce = confrontaLezione(lezione, [evento('2026-09-15', '08:00', '08:45')], 45)
    assert.equal(voce.esito, 'combacia')
  })

  it('l’evento spostato si porta dietro le fasce libere, prima e dopo', () => {
    const { corso } = scuolaMinima()
    const lezione = creaLezione(corso.id, '2026-09-15', '08:00', 45)
    lezione.slot = [
      slot('p', '07:15', '08:00'),
      slot('e', '08:00', '08:45', 'lezione', true),
      slot('q', '08:45', '09:00', 'pausa'),
      slot('r', '09:00', '09:45'),
    ]
    const voce = confrontaLezione(lezione, [evento('2026-09-15', '10:00', '10:45')], 45)
    assert.equal(voce.esito, 'allineare')
    assert.deepEqual(inBreve(voce.fasce), [
      '09:15-10:00 lezione',
      '10:00-10:45 lezione ics',
      '10:45-11:00 pausa',
      '11:00-11:45 lezione',
    ])
  })

  it('l’evento che si allunga spinge avanti le libere che gli stanno dopo', () => {
    const { corso } = scuolaMinima()
    const lezione = creaLezione(corso.id, '2026-09-15', '08:00', 45)
    lezione.slot = [slot('e', '08:00', '08:45', 'lezione', true), slot('r', '08:45', '09:30')]
    const voce = confrontaLezione(lezione, [evento('2026-09-15', '08:00', '09:30')], 45)
    assert.deepEqual(inBreve(voce.fasce), ['08:00-09:30 lezione ics', '09:30-10:15 lezione'])
  })

  it('una lezione di prima, senza segni, si confronta per intero come sempre', () => {
    const { corso } = scuolaMinima()
    const lezione = creaLezione(corso.id, '2026-09-15', '08:00', 90)
    const voce = confrontaLezione(lezione, [evento('2026-09-15', '08:00', '08:45')], 45)
    assert.equal(voce.esito, 'allineare')
    assert.deepEqual(inBreve(voce.fasce), ['08:00-08:45 lezione ics'])
  })
})

describe('allineamento automatico con fasce libere', () => {
  it('un’ora aggiunta prima dell’evento non toglie la certezza né fa riscrivere', () => {
    const { registro, corso } = scuolaMinima()
    const regole = [{ id: 'r1', testo: 'MAT', corsoId: corso.id }]
    const lezione = creaLezione(corso.id, '2026-09-15', '07:15', 45)
    lezione.slot = [slot('p', '07:15', '08:00'), slot('e', '08:00', '08:45', 'lezione', true)]
    registro.lezioni.push(lezione)
    const eventi = [evento('2026-09-15', '08:00', '08:45')]
    const collegamenti = collegaEventi(registro, eventi, regole)
    assert.ok(collegataPerCerto(registro, lezione, eventi, collegamenti.viaPerEvento))
    assert.deepEqual(allineamentiAutomatici(registro, collegamenti, PRIMA).allinea, [])
  })

  it('l’evento spostato riscrive l’ora e porta con sé la fascia libera', () => {
    const { registro, corso } = scuolaMinima()
    const regole = [{ id: 'r1', testo: 'MAT', corsoId: corso.id }]
    const lezione = creaLezione(corso.id, '2026-09-15', '08:00', 45)
    lezione.slot = [slot('e', '08:00', '08:45', 'lezione', true), slot('r', '08:45', '09:30')]
    registro.lezioni.push(lezione)
    // Spostato di un quarto d'ora: la sovrapposizione con la fascia del
    // calendario tiene il collegamento certo.
    const eventi = [evento('2026-09-15', '08:15', '09:00')]
    const scelte = allineamentiAutomatici(registro, collegaEventi(registro, eventi, regole), PRIMA)
    assert.equal(scelte.allinea.length, 1)
    assert.deepEqual(inBreve(scelte.allinea[0].voce.fasce), [
      '08:15-09:00 lezione ics',
      '09:00-09:45 lezione',
    ])
  })
})

describe('slotStiratiAncorati: le maniglie di un’ora ancorata', () => {
  const ancorata = () => [slot('e', '08:00', '08:45')]

  it('tirata oltre l’evento nasce una fascia libera, attaccata', () => {
    assert.deepEqual(inBreve(slotStiratiAncorati(ancorata(), 'fine', 1, 45)), [
      '08:00-08:45 lezione ics',
      '08:45-09:30 lezione',
    ])
    assert.deepEqual(inBreve(slotStiratiAncorati(ancorata(), 'inizio', 2, 45)), [
      '06:30-08:00 lezione',
      '08:00-08:45 lezione ics',
    ])
  })

  it('l’ora dell’evento non si accorcia', () => {
    assert.equal(slotStiratiAncorati(ancorata(), 'fine', -1, 45), null)
    assert.equal(slotStiratiAncorati(ancorata(), 'inizio', -1, 45), null)
  })

  it('una fascia libera si allunga, si accorcia, e a zero se ne va con la sua pausa', () => {
    const conLibere = [
      slot('e', '08:00', '08:45', 'lezione', true),
      slot('q', '08:45', '09:00', 'pausa'),
      slot('r', '09:00', '09:45'),
    ]
    assert.deepEqual(inBreve(slotStiratiAncorati(conLibere, 'fine', 1, 45)).at(-1), '09:00-10:30 lezione')
    assert.deepEqual(inBreve(slotStiratiAncorati(conLibere, 'fine', -1, 45)), ['08:00-08:45 lezione ics'])
    assert.equal(slotStiratiAncorati(conLibere, 'fine', -2, 45), null)
  })

  it('dopo una pausa libera sul bordo nasce un’ora nuova, e non si esce dal giorno', () => {
    const conPausa = [slot('e', '08:00', '08:45', 'lezione', true), slot('q', '08:45', '09:00', 'pausa')]
    assert.deepEqual(inBreve(slotStiratiAncorati(conPausa, 'fine', 1, 45)).at(-1), '09:00-09:45 lezione')
    assert.equal(slotStiratiAncorati(conPausa, 'fine', -1, 45), null)
    assert.equal(slotStiratiAncorati([slot('e', '23:00', '23:45', 'lezione', true)], 'fine', 1, 45), null)
  })
})

describe('il calendario ICS: le serie e le giornate', () => {
  const FUSO = 'Europe/Zurich'

  function ics (...eventi) {
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      ...eventi.flatMap((r) => ['BEGIN:VEVENT', ...r, 'END:VEVENT']),
      'END:VCALENDAR',
      '',
    ].join('\r\n')
  }

  const date = (letto) => letto.eventi.map((e) => e.data)

  it('UNTIL in UTC con un TZID alla Windows tiene l’ultima occorrenza', () => {
    // 06:15Z è 08:15 a Zurigo in giugno: l'ultima ora è proprio il 10.
    const letto = leggiCalendario(ics([
      'UID:o',
      'DTSTART;TZID=W. Europe Standard Time:20260527T081500',
      'DTEND;TZID=W. Europe Standard Time:20260527T090000',
      'RRULE:FREQ=WEEKLY;UNTIL=20260610T061500Z;BYDAY=WE',
    ]), '2026-05-01', '2026-06-30', FUSO)
    assert.deepEqual(date(letto), ['2026-05-27', '2026-06-03', '2026-06-10'])
  })

  it('UNTIL in UTC con un’ora flottante fa lo stesso', () => {
    const letto = leggiCalendario(ics([
      'UID:f',
      'DTSTART:20260527T081500',
      'DTEND:20260527T090000',
      'RRULE:FREQ=WEEKLY;UNTIL=20260610T061500Z',
    ]), '2026-05-01', '2026-06-30', FUSO)
    assert.deepEqual(date(letto), ['2026-05-27', '2026-06-03', '2026-06-10'])
  })

  it('una giornata scritta con le ore, o di più giorni, non è una lezione', () => {
    const letto = leggiCalendario(ics(
      ['UID:g', 'DTSTART:20260915T000000', 'DTEND:20260916T000000', 'SUMMARY:gita'],
      ['UID:s', 'DTSTART:20260915T000000', 'DTEND:20260918T000000', 'SUMMARY:settimana'],
      ['UID:l', 'DTSTART:20260915T220000', 'DTEND:20260916T000000', 'SUMMARY:sera'],
    ), '2026-09-01', '2026-09-30', FUSO)
    assert.equal(letto.scartati, 2)
    // Una fine a mezzanotte del giorno dopo resta valida, e finisce alle 23:59.
    assert.deepEqual(letto.eventi.map((e) => [e.titolo, e.inizio, e.fine]), [
      ['sera', '22:00', '23:59'],
    ])
  })

  it('la barra protetta seguita da una n resta una barra e una n', () => {
    const letto = leggiCalendario(ics([
      'UID:e',
      'SUMMARY:Cartella C:\\\\nuovi\\, prova\\nseconda riga',
      'DTSTART:20260915T080000',
      'DTEND:20260915T090000',
    ]), '2026-09-01', '2026-09-30', FUSO)
    assert.equal(letto.eventi[0].titolo, 'Cartella C:\\nuovi, prova seconda riga')
  })

  it('una serie giornaliera cominciata anni fa arriva fino al periodo chiesto', () => {
    const letto = leggiCalendario(ics([
      'UID:d',
      'DTSTART;TZID=Europe/Zurich:20150907T075000',
      'DTEND;TZID=Europe/Zurich:20150907T080000',
      'RRULE:FREQ=DAILY',
    ]), '2026-09-01', '2026-09-30', FUSO)
    assert.equal(letto.eventi.length, 30)
  })

  it('COUNT si conta ancora dalla prima occorrenza, non dal periodo', () => {
    const letto = leggiCalendario(ics([
      'UID:c',
      'DTSTART;TZID=Europe/Zurich:20260901T080000',
      'DTEND;TZID=Europe/Zurich:20260901T090000',
      'RRULE:FREQ=DAILY;COUNT=5',
    ]), '2026-09-03', '2026-09-30', FUSO)
    assert.deepEqual(date(letto), ['2026-09-03', '2026-09-04', '2026-09-05'])
  })

  it('EXDATE di un giorno solo toglie l’ora di quel giorno da una serie con le ore', () => {
    const letto = leggiCalendario(ics([
      'UID:x',
      'DTSTART;TZID=Europe/Zurich:20260914T080000',
      'DTEND;TZID=Europe/Zurich:20260914T090000',
      'RRULE:FREQ=WEEKLY;COUNT=3',
      'EXDATE;VALUE=DATE:20260921',
    ]), '2026-09-01', '2026-09-30', FUSO)
    assert.deepEqual(date(letto), ['2026-09-14', '2026-09-28'])
  })
})
