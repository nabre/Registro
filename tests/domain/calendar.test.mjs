// Il calendario ICS: come si legge e come si mette a fronte delle lezioni. Le
// prove passano sempre il fuso, così non dipendono da dove gira la macchina.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  anomaliePerSettimana,
  collegaEventi,
  confrontaCalendario,
  confrontaLezione,
  creaLezione,
  creaRicorrenza,
  eventiDellaStessaLezione,
  leggiCalendario,
  lezioneDaEventi,
  regoleConScelta,
} from '../../dist-tests/domain.mjs'
import { FINE, INIZIO, scuolaMinima } from '../helpers/register.mjs'

const FUSO = 'Europe/Zurich'

/** Un calendario con dentro gli eventi dati, righe già scritte. */
function ics (...eventi) {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//prova//IT',
    ...eventi.flatMap((righe) => ['BEGIN:VEVENT', ...righe, 'END:VEVENT']),
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}

const leggi = (testo, dal = INIZIO, al = FINE) => leggiCalendario(testo, dal, al, FUSO)

describe('leggiCalendario', () => {
  it('legge un evento con il suo fuso, e scioglie righe piegate e caratteri protetti', () => {
    const { eventi } = leggi(ics([
      'UID:a1',
      'DTSTART;TZID=Europe/Zurich:20260915T082000',
      'DTEND;TZID=Europe/Zurich:20260915T090500',
      'SUMMARY:Matematica\\, I MEC A',
      ' — prima ora',
      'LOCATION:Aula 12\\; sede centro',
      'BEGIN:VALARM',
      'DESCRIPTION:Promemoria',
      'TRIGGER:-PT10M',
      'END:VALARM',
    ]))
    assert.equal(eventi.length, 1)
    assert.deepEqual(
      { data: eventi[0].data, inizio: eventi[0].inizio, fine: eventi[0].fine },
      { data: '2026-09-15', inizio: '08:20', fine: '09:05' },
    )
    assert.equal(eventi[0].titolo, 'Matematica, I MEC A— prima ora')
    assert.equal(eventi[0].luogo, 'Aula 12; sede centro')
    assert.equal(eventi[0].annullato, false)
  })

  it('porta un orario UTC all’ora di chi insegna, di qua e di là dal cambio d’ora', () => {
    const { eventi } = leggi(ics(
      ['UID:e', 'DTSTART:20261020T062000Z', 'DURATION:PT45M', 'SUMMARY:estate'],
      ['UID:i', 'DTSTART:20261027T072000Z', 'DURATION:PT45M', 'SUMMARY:inverno'],
    ))
    assert.deepEqual(eventi.map((e) => [e.data, e.inizio, e.fine]), [
      ['2026-10-20', '08:20', '09:05'],
      ['2026-10-27', '08:20', '09:05'],
    ])
  })

  it('lascia fuori le giornate intere e le conta', () => {
    const letto = leggi(ics(
      ['UID:v', 'DTSTART;VALUE=DATE:20261026', 'DTEND;VALUE=DATE:20261031', 'SUMMARY:Vacanze'],
      ['UID:l', 'DTSTART;TZID=Europe/Zurich:20260915T082000', 'DTEND;TZID=Europe/Zurich:20260915T090500'],
    ))
    assert.equal(letto.eventi.length, 1)
    assert.equal(letto.scartati, 1)
  })

  it('apre una ricorrenza settimanale, toglie le date escluse e rispetta le occorrenze riscritte', () => {
    const { eventi } = leggi(ics(
      [
        'UID:ric',
        'DTSTART;TZID=Europe/Zurich:20260915T082000',
        'DTEND;TZID=Europe/Zurich:20260915T090500',
        'RRULE:FREQ=WEEKLY;BYDAY=TU,TH;COUNT=6',
        'EXDATE;TZID=Europe/Zurich:20260917T082000',
        'SUMMARY:Matematica I MEC A',
      ],
      // Il martedì 22 si sposta di un'ora; il giovedì 24 non si fa.
      [
        'UID:ric',
        'RECURRENCE-ID;TZID=Europe/Zurich:20260922T082000',
        'DTSTART;TZID=Europe/Zurich:20260922T092000',
        'DTEND;TZID=Europe/Zurich:20260922T100500',
        'SUMMARY:Matematica I MEC A',
      ],
      [
        'UID:ric',
        'RECURRENCE-ID;TZID=Europe/Zurich:20260924T082000',
        'DTSTART;TZID=Europe/Zurich:20260924T082000',
        'DTEND;TZID=Europe/Zurich:20260924T090500',
        'STATUS:CANCELLED',
        'SUMMARY:Matematica I MEC A',
      ],
    ))
    assert.deepEqual(eventi.map((e) => [e.data, e.inizio, e.annullato]), [
      ['2026-09-15', '08:20', false],
      ['2026-09-22', '09:20', false],
      ['2026-09-24', '08:20', true],
      ['2026-09-29', '08:20', false],
      ['2026-10-01', '08:20', false],
    ])
  })

  it('si ferma a UNTIL e al periodo chiesto', () => {
    const { eventi } = leggi(ics([
      'UID:u',
      'DTSTART;TZID=Europe/Zurich:20260914T100000',
      'DTEND;TZID=Europe/Zurich:20260914T104500',
      'RRULE:FREQ=WEEKLY;UNTIL=20261005T235959Z',
    ]), '2026-09-20', FINE)
    assert.deepEqual(eventi.map((e) => e.data), ['2026-09-21', '2026-09-28', '2026-10-05'])
  })
})

describe('confrontaCalendario', () => {
  /** Un evento del corso, già letto: così la prova parla di lezioni e non di righe ICS. */
  const evento = (data, inizio, fine, altro = {}) => ({
    chiave: `${data}T${inizio}`, data, inizio, fine, titolo: 'Matematica I MEC A', luogo: '', annullato: false, ...altro,
  })
  const letto = (...eventi) => ({ eventi, scartati: 0 })

  it('abbina per nome della classe, e una lezione alla stessa ora combacia', () => {
    const { registro, corso } = scuolaMinima()
    const lezione = creaLezione(corso.id, '2026-09-15', '08:20', 45)
    registro.lezioni.push(lezione)
    const esito = confrontaCalendario(registro, letto(evento('2026-09-15', '08:20', '09:05')), [])
    assert.equal(esito.voci.length, 1)
    assert.equal(esito.voci[0].esito, 'combacia')
    assert.equal(esito.voci[0].lezioneId, lezione.id)
    assert.equal(esito.voci[0].via, 'nome')
  })

  it('propone di allineare una lezione che si sovrappone ma comincia a un’altra ora', () => {
    const { registro, corso } = scuolaMinima()
    const lezione = creaLezione(corso.id, '2026-09-15', '08:20', 90)
    registro.lezioni.push(lezione)
    const esito = confrontaCalendario(registro, letto(evento('2026-09-15', '08:35', '10:05', { luogo: 'A12' })), [])
    const [voce] = esito.voci
    assert.equal(voce.esito, 'allineare')
    assert.equal(voce.cambiaOrario, true)
    assert.deepEqual([voce.inizio, voce.fine, voce.aula], ['08:35', '10:05', 'A12'])
    assert.deepEqual(voce.differenze, ['08:20–09:50 → 08:35–10:05', 'aula — → A12'])
    // L'appello resta dov'è: il confronto non tocca il registro.
    assert.equal(registro.lezioni[0].slot[0].inizio, '08:20')
  })

  it('unisce due eventi vicini in una lezione sola, con la pausa in mezzo', () => {
    const { registro } = scuolaMinima()
    const esito = confrontaCalendario(registro, letto(
      evento('2026-09-16', '08:20', '09:05'),
      evento('2026-09-16', '09:20', '10:05'),
      evento('2026-09-16', '14:00', '14:45'),
    ), [])
    assert.deepEqual(esito.voci.map((v) => [v.esito, v.inizio, v.fine]), [
      ['nuova', '08:20', '10:05'],
      ['nuova', '14:00', '14:45'],
    ])
    assert.deepEqual(esito.voci[0].fasce.map((f) => f.tipo), ['lezione', 'pausa', 'lezione'])
  })

  it('un evento annullato su una lezione la propone annullata, e senza lezione non chiede niente', () => {
    const { registro, corso } = scuolaMinima()
    registro.lezioni.push(creaLezione(corso.id, '2026-09-15', '08:20', 45))
    const esito = confrontaCalendario(registro, letto(
      evento('2026-09-15', '08:20', '09:05', { annullato: true }),
      evento('2026-09-22', '08:20', '09:05', { annullato: true }),
    ), [])
    assert.deepEqual(esito.voci.map((v) => v.esito), ['annullare'])
  })

  it('segnala le lezioni che il calendario non ha, solo nei giorni che copre', () => {
    const { registro, corso } = scuolaMinima()
    const dentro = creaLezione(corso.id, '2026-09-17', '08:20', 45)
    const fuori = creaLezione(corso.id, '2026-11-17', '08:20', 45)
    registro.lezioni.push(dentro, fuori)
    const esito = confrontaCalendario(registro, letto(
      evento('2026-09-15', '08:20', '09:05'),
      evento('2026-09-22', '08:20', '09:05'),
    ), [])
    assert.deepEqual(esito.assenti.map((a) => a.lezioneId), [dentro.id])
    assert.equal(registro.lezioni.length, 2, 'nessuna lezione si cancella')
  })

  it('senza indizi l’evento resta senza corso; una regola lo attribuisce o lo fa ignorare', () => {
    const { registro, corso } = scuolaMinima()
    const riunione = evento('2026-09-15', '16:00', '17:30', { titolo: 'Collegio docenti' })
    const lab = evento('2026-09-16', '10:00', '10:45', { titolo: 'LAB-3' })

    const senza = confrontaCalendario(registro, letto(riunione, lab), [])
    assert.deepEqual(senza.senzaCorso.map((g) => g.titolo).sort(), ['Collegio docenti', 'LAB-3'])

    const conRegole = confrontaCalendario(registro, letto(riunione, lab), [
      { id: 'r1', testo: 'collegio', corsoId: null },
      { id: 'r2', testo: 'lab 3', corsoId: corso.id },
    ])
    assert.equal(conRegole.ignorati, 1)
    assert.deepEqual(conRegole.senzaCorso, [])
    assert.deepEqual(conRegole.voci.map((v) => [v.esito, v.via]), [['nuova', 'regola']])
  })

  it('senza nome nel titolo, l’orario ricorrente del corso decide', () => {
    const { registro, corso } = scuolaMinima()
    corso.orario.push(creaRicorrenza(2, '08:20', 45))
    const esito = confrontaCalendario(registro, letto(evento('2026-09-15', '08:20', '09:05', { titolo: 'MAT' })), [])
    assert.deepEqual(esito.voci.map((v) => [v.esito, v.via]), [['nuova', 'orario']])
  })
})

describe('confrontaLezione', () => {
  const evento = (inizio, fine, altro = {}) => ({
    chiave: `2026-09-15T${inizio}`, data: '2026-09-15', inizio, fine, titolo: '', luogo: '', annullato: false, ...altro,
  })

  it('porta orario e aula dell’evento; senza luogo l’aula del registro resta', () => {
    const lezione = { ...creaLezione('c1', '2026-09-15', '08:20', 45), aula: 'B3' }
    const conLuogo = confrontaLezione(lezione, [evento('08:35', '09:20', { luogo: 'A12' })], 45)
    assert.equal(conLuogo.esito, 'allineare')
    assert.deepEqual([conLuogo.inizio, conLuogo.fine, conLuogo.aula], ['08:35', '09:20', 'A12'])
    const senzaLuogo = confrontaLezione(lezione, [evento('08:20', '09:05')], 45)
    assert.equal(senzaLuogo.esito, 'combacia')
    assert.equal(senzaLuogo.aula, 'B3')
  })

  it('tutti gli eventi annullati: da annullare, finché non lo è', () => {
    const lezione = creaLezione('c1', '2026-09-15', '08:20', 45)
    const annullati = [evento('08:20', '09:05', { annullato: true })]
    assert.equal(confrontaLezione(lezione, annullati, 45).esito, 'annullare')
    assert.equal(confrontaLezione({ ...lezione, stato: 'annullata' }, annullati, 45).esito, 'combacia')
  })
})

describe('collegaEventi', () => {
  const evento = (data, inizio, fine, altro = {}) => ({
    chiave: `${data}T${inizio}`, data, inizio, fine, titolo: 'Matematica I MEC A', luogo: '', annullato: false, ...altro,
  })

  it('una lezione di due ore con la pausa è ancorata a tutti e due i suoi eventi', () => {
    // I gestionali d'orario: due eventi da novanta minuti con un quarto d'ora in
    // mezzo, e nel registro una lezione sola.
    const { registro, corso } = scuolaMinima()
    const lezione = creaLezione(corso.id, '2026-09-16', '08:20', 225)
    registro.lezioni.push(lezione)
    const primo = evento('2026-09-16', '10:05', '11:35')
    const secondo = evento('2026-09-16', '08:20', '09:50')
    const esito = collegaEventi(registro, [primo, secondo], [])
    assert.deepEqual(esito.eventiPerLezione.get(lezione.id).map((e) => e.inizio), ['08:20', '10:05'])
    assert.equal(esito.lezionePerEvento.get(primo.chiave), lezione.id)
    assert.equal(esito.lezionePerEvento.get(secondo.chiave), lezione.id)
  })

  it('un evento senza lezione sotto, o che una regola ignora, resta libero', () => {
    const { registro, corso } = scuolaMinima()
    registro.lezioni.push(creaLezione(corso.id, '2026-09-15', '08:20', 45))
    const senzaLezione = evento('2026-09-17', '08:20', '09:05')
    const riunione = evento('2026-09-15', '08:20', '09:05', { titolo: 'Collegio docenti' })
    const regole = [{ id: 'r1', testo: 'Collegio docenti', corsoId: null }]
    const esito = collegaEventi(registro, [senzaLezione, riunione], regole)
    assert.equal(esito.lezionePerEvento.size, 0)
    assert.equal(esito.eventiPerLezione.size, 0)
  })

  it('dice le stesse cose del confronto: la lezione che combacia è quella collegata', () => {
    const { registro, corso } = scuolaMinima()
    const lezione = creaLezione(corso.id, '2026-09-15', '08:20', 45)
    registro.lezioni.push(lezione)
    const e = evento('2026-09-15', '08:20', '09:05')
    const confronto = confrontaCalendario(registro, { eventi: [e], scartati: 0 }, [])
    assert.equal(
      confronto.voci[0].lezioneId,
      collegaEventi(registro, [e], []).lezionePerEvento.get(e.chiave),
    )
  })
})

describe('un evento preso dal calendario', () => {
  const evento = (inizio, fine, altro = {}) => ({
    chiave: `e-${inizio}`, data: '2026-09-16', inizio, fine, titolo: 'Laboratorio DIC4a', luogo: 'aula 12', annullato: false, ...altro,
  })

  it('porta con sé le altre metà della stessa lezione, e non gli eventi lontani o diversi', () => {
    const primo = evento('08:20', '09:50')
    const secondo = evento('10:05', '11:35')
    const pomeriggio = evento('14:00', '15:30')
    const altro = evento('09:55', '10:00', { titolo: 'Collegio docenti' })
    const gruppo = eventiDellaStessaLezione([pomeriggio, secondo, altro, primo], secondo)
    assert.deepEqual(gruppo.map((e) => e.inizio), ['08:20', '10:05'])
  })

  it('fa la lezione con la pausa in mezzo e l’aula scelta', () => {
    const lezione = lezioneDaEventi([evento('08:20', '09:50'), evento('10:05', '11:35')], 'c1', ' aula 14 ', 45)
    assert.equal(lezione.data, '2026-09-16')
    assert.equal(lezione.aula, 'aula 14')
    assert.deepEqual(lezione.fasce.map((f) => f.tipo), ['lezione', 'pausa', 'lezione'])
  })

  it('aggiunge la regola solo se nessuna regola dice già quel corso', () => {
    const { registro, corso } = scuolaMinima()
    const e = evento('08:20', '09:05')
    const nuove = regoleConScelta(registro, e, [], 'DIC4a', corso.id)
    assert.deepEqual(nuove, [{ testo: 'DIC4a', corsoId: corso.id }])
    const salvate = [{ id: 'r1', testo: 'laboratorio', corsoId: corso.id }]
    assert.equal(regoleConScelta(registro, e, salvate, 'DIC4a', corso.id), null)
  })

  it('una regola con lo stesso testo si sostituisce, non si raddoppia', () => {
    const { registro, corso } = scuolaMinima()
    const salvate = [{ id: 'r1', testo: 'dic4a', corsoId: null }]
    const nuove = regoleConScelta(registro, evento('08:20', '09:05'), salvate, 'DIC4a', corso.id)
    assert.deepEqual(nuove, [{ testo: 'DIC4a', corsoId: corso.id }])
  })
})

describe('anomaliePerSettimana', () => {
  const evento = (data, inizio, fine, altro = {}) => ({
    chiave: `${data}T${inizio}`, data, inizio, fine, titolo: 'Matematica I MEC A', luogo: '', annullato: false, ...altro,
  })
  const anomalie = (registro, eventi, regole = []) =>
    anomaliePerSettimana(registro, eventi, collegaEventi(registro, eventi, regole))

  it('un evento senza lezione, una lezione senza evento, e un abbinamento senza regola', () => {
    const { registro, corso } = scuolaMinima()
    // Martedì 15: lezione ed evento, tenuti insieme dal nome della classe.
    const perNome = creaLezione(corso.id, '2026-09-15', '08:20', 45)
    // Mercoledì 16 pomeriggio: una lezione che il calendario non ha.
    const senzaEvento = creaLezione(corso.id, '2026-09-16', '14:00', 45)
    registro.lezioni.push(perNome, senzaEvento)
    const eventi = [
      evento('2026-09-15', '08:20', '09:05'),
      // Mercoledì 16: un evento che il registro non ha.
      evento('2026-09-16', '10:00', '10:45'),
    ]
    const settimana = anomalie(registro, eventi).get('2026-09-14')
    assert.deepEqual(settimana.eventiSenzaLezione.map((e) => e.data), ['2026-09-16'])
    assert.deepEqual(settimana.lezioniSenzaEvento.map((l) => l.id), [senzaEvento.id])
    assert.deepEqual(settimana.lezioniSenzaRegola.map((l) => l.id), [perNome.id])
  })

  it('con una regola, un evento annullato e uno escluso non resta niente da guardare', () => {
    const { registro, corso } = scuolaMinima()
    registro.lezioni.push(creaLezione(corso.id, '2026-09-15', '08:20', 45))
    const eventi = [
      evento('2026-09-15', '08:20', '09:05'),
      evento('2026-09-16', '10:00', '10:45', { annullato: true }),
      evento('2026-09-16', '16:00', '17:00', { titolo: 'Collegio docenti' }),
    ]
    const regole = [
      { id: 'r1', testo: 'Matematica MEC', corsoId: corso.id },
      { id: 'r2', testo: 'collegio', corsoId: null },
    ]
    assert.equal(anomalie(registro, eventi, regole).size, 0)
  })

  it('le lezioni fuori dal periodo che il calendario copre non si segnalano', () => {
    const { registro, corso } = scuolaMinima()
    registro.lezioni.push(creaLezione(corso.id, '2026-11-17', '08:20', 45))
    const esito = anomalie(registro, [evento('2026-09-15', '08:20', '09:05')])
    assert.equal(esito.has('2026-11-16'), false)
  })
})

describe('due eventi vicini con la stessa dicitura sono una lezione', () => {
  // Se l'evento dopo dista al più quindici minuti e ha la stessa dicitura di
  // abbinamento è la stessa lezione, con la pausa lunga quanto il buco. La
  // dicitura è la regola che ha deciso, o il titolo.
  const evento = (inizio, fine, titolo) => ({
    chiave: `e-${inizio}`, data: '2026-09-16', inizio, fine, titolo, luogo: '', annullato: false,
  })
  const regole = (corsoId) => [
    { id: 'rgc-cad', testo: 'CAD', corsoId },
    { id: 'rgc-teoria', testo: 'Teoria', corsoId },
  ]
  /** Le lezioni nuove che il confronto propone, con le regole della prova. */
  const nuove = (registro, corsoId, eventi) =>
    confrontaCalendario(registro, { eventi, scartati: 0 }, regole(corsoId)).voci.filter((v) => v.esito === 'nuova')

  it('stessa regola, titoli diversi, quindici minuti: una lezione con la pausa', () => {
    const { registro, corso } = scuolaMinima()
    const eventi = [evento('08:20', '09:05', 'Laboratorio CAD'), evento('09:20', '10:05', 'CAD e BIM')]
    const [voce, ...altre] = nuove(registro, corso.id, eventi)
    assert.equal(altre.length, 0)
    // Tutte del calendario, pausa compresa: sono l'ora degli eventi.
    assert.deepEqual(voce.fasce, [
      { inizio: '08:20', fine: '09:05', tipo: 'lezione', ics: true },
      { inizio: '09:05', fine: '09:20', tipo: 'pausa', ics: true },
      { inizio: '09:20', fine: '10:05', tipo: 'lezione', ics: true },
    ])
  })

  it('sedici minuti sono due lezioni', () => {
    const { registro, corso } = scuolaMinima()
    const eventi = [evento('08:20', '09:05', 'Laboratorio CAD'), evento('09:21', '10:06', 'Laboratorio CAD')]
    assert.equal(nuove(registro, corso.id, eventi).length, 2)
  })

  it('stesso corso, regole diverse, anche a cinque minuti: due lezioni', () => {
    const { registro, corso } = scuolaMinima()
    const eventi = [evento('08:20', '09:05', 'Laboratorio CAD'), evento('09:10', '09:55', 'Teoria')]
    assert.equal(nuove(registro, corso.id, eventi).length, 2)
  })

  it('attaccati, senza buco: una lezione senza pausa', () => {
    const { registro, corso } = scuolaMinima()
    const eventi = [evento('08:20', '09:05', 'Laboratorio CAD'), evento('09:05', '09:50', 'Laboratorio CAD')]
    const [voce] = nuove(registro, corso.id, eventi)
    assert.deepEqual(voce.fasce.map((f) => f.tipo), ['lezione', 'lezione'])
  })

  it('il menu di un evento unisce le stesse metà, con la dicitura che gli si passa', () => {
    const primo = evento('08:20', '09:05', 'Laboratorio CAD')
    const secondo = evento('09:20', '10:05', 'CAD e BIM')
    const lontano = evento('09:21', '10:06', 'Altro')
    // Senza dicitura conta il titolo: due titoli diversi restano separati.
    assert.deepEqual(eventiDellaStessaLezione([primo, secondo], secondo).map((e) => e.inizio), ['09:20'])
    // Con la dicitura della regola, sono la stessa lezione.
    const perRegola = (e) => (/cad/i.test(e.titolo) ? 'regola:rgc-cad' : `titolo:${e.titolo}`)
    assert.deepEqual(
      eventiDellaStessaLezione([lontano, secondo, primo], secondo, perRegola).map((e) => e.inizio),
      ['08:20', '09:20'],
    )
  })
})
