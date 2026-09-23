// La scheda «lezione» del widget: l'ora che si sta tenendo.
//
// È l'unica scheda da cui si scrive, e quindi l'unica in cui mostrare l'ora
// sbagliata fa danno: un appello fatto sull'ora di martedì mentre si è in aula
// martedì prossimo è un appello da rifare due volte. Le prove guardano quale
// ora viene scelta e quando, e che cosa dice l'appello di un'ora che nessuno ha
// ancora toccato.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  creaPresenza,
  lezioneAgenda,
  oraDaTenere,
  registroVuoto,
} from '../../dist-tests/domain.mjs'
import { ore, scuolaMinima } from '../helpers/register.mjs'

/** Un mercoledì di ottobre 2026. */
const MERCOLEDI = '2026-10-21'

describe('quale ora tenere', () => {
  it('sceglie quella in corso, anche se prima ne è rimasta una aperta', () => {
    const { registro, corso } = scuolaMinima()
    ore(registro, corso, ['2026-10-19'], '08:20', 45)
    const [adesso] = ore(registro, corso, [MERCOLEDI], '08:20', 90)

    assert.equal(oraDaTenere(registro, MERCOLEDI, '08:30').id, adesso.id)
  })

  it('senza un’ora in corso propone il buco più vecchio', () => {
    const { registro, corso } = scuolaMinima()
    const [vecchia] = ore(registro, corso, ['2026-10-19'], '08:20', 45)
    ore(registro, corso, ['2026-10-20'], '08:20', 45)
    ore(registro, corso, ['2026-10-26'], '08:20', 45)

    assert.equal(oraDaTenere(registro, MERCOLEDI, '15:00').id, vecchia.id)
  })

  it('senza buchi guarda avanti', () => {
    const { registro, classe, corso } = scuolaMinima()
    const [fatta] = ore(registro, corso, ['2026-10-19'], '08:20', 45)
    fatta.stato = 'svolta'
    fatta.presenze = classe.allievi.map((allievo) => creaPresenza(allievo.id, 1, 'presente'))
    const [prossima] = ore(registro, corso, ['2026-10-26'], '08:20', 45)

    assert.equal(oraDaTenere(registro, MERCOLEDI, '15:00').id, prossima.id)
  })

  it('non propone niente quando non c’è niente', () => {
    assert.equal(oraDaTenere(registroVuoto(), MERCOLEDI, '08:00'), null)

    const { registro } = scuolaMinima()
    assert.equal(oraDaTenere(registro, MERCOLEDI, '08:00'), null)
  })
})

describe('la scheda dell’ora', () => {
  it('dice quando è, di chi è, e perché è quella mostrata', () => {
    const { registro, corso } = scuolaMinima()
    const [lezione] = ore(registro, corso, [MERCOLEDI], '08:20', 90)
    lezione.aula = '214'

    const scheda = lezioneAgenda(registro, MERCOLEDI, '08:30')

    assert.equal(scheda.lezioneId, lezione.id)
    assert.equal(scheda.quando, 'mer 21')
    assert.equal(scheda.inizio, '08:20')
    assert.equal(scheda.fine, '09:50')
    assert.equal(scheda.classe, 'I MEC A')
    assert.equal(scheda.aula, '214')
    assert.equal(scheda.fase, 'in-corso')
    assert.equal(scheda.scelta, 'in-corso')
    assert.equal(scheda.stato, 'pianificata')
  })

  it('fa le righe dell’appello anche se l’ora non è mai stata aperta', () => {
    const { registro, corso } = scuolaMinima()
    ore(registro, corso, [MERCOLEDI], '08:20', 45)

    const scheda = lezioneAgenda(registro, MERCOLEDI, '08:30')

    // I tre della scuola minima, in ordine di cognome, con il nome accorciato
    // come sta in una striscia larga una colonna di icone.
    assert.deepEqual(scheda.appello.map((riga) => riga.breve), ['Bianchi L.', 'Rossi M.', 'Verdi A.'])
    assert.deepEqual(scheda.appello.map((riga) => riga.stato), [
      'non-impostato',
      'non-impostato',
      'non-impostato',
    ])
    assert.equal(scheda.senzaAppello, 3)
    assert.equal(scheda.presenti, 0)
    assert.deepEqual(scheda.manca, [])
  })

  it('riassume la riga di chi è mancato solo per una parte dell’ora', () => {
    const { registro, corso, rossi } = scuolaMinima()
    const [lezione] = ore(registro, corso, [MERCOLEDI], '08:20', 90)
    lezione.presenze = [{ allievoId: rossi.id, stati: ['assente', 'presente'] }]

    const scheda = lezioneAgenda(registro, MERCOLEDI, '10:00')
    const riga = scheda.appello.find((voce) => voce.allievoId === rossi.id)

    assert.equal(scheda.ud, 2)
    assert.equal(riga.stato, 'assente')
    assert.equal(riga.mista, true)
    // Gli altri due non hanno una riga nel file, e restano da fare.
    assert.equal(scheda.senzaAppello, 2)
  })

  it('dice che cosa manca a un’ora rimasta aperta', () => {
    const { registro, corso } = scuolaMinima()
    ore(registro, corso, ['2026-10-19'], '08:20', 45)

    const scheda = lezioneAgenda(registro, MERCOLEDI, '15:00')

    assert.equal(scheda.fase, 'da-chiudere')
    assert.equal(scheda.scelta, 'aperta')
    assert.deepEqual(scheda.manca, ['senza appello', 'non segnata svolta'])
  })

  it('tiene l’ora scelta con le frecce, e sa quali sono le vicine', () => {
    const { registro, corso } = scuolaMinima()
    const [prima] = ore(registro, corso, ['2026-10-19'], '08:20', 45)
    const [seconda] = ore(registro, corso, ['2026-10-20'], '08:20', 45)
    const [terza] = ore(registro, corso, ['2026-10-26'], '08:20', 45)

    const scheda = lezioneAgenda(registro, MERCOLEDI, '15:00', seconda.id)

    assert.equal(scheda.lezioneId, seconda.id)
    assert.equal(scheda.scelta, 'fissata')
    assert.equal(scheda.precedente, prima.id)
    assert.equal(scheda.successiva, terza.id)
  })

  it('torna all’ora di adesso quando quella scelta non c’è più', () => {
    const { registro, corso } = scuolaMinima()
    const [unica] = ore(registro, corso, [MERCOLEDI], '08:20', 45)

    const scheda = lezioneAgenda(registro, MERCOLEDI, '08:30', 'lezione-cancellata')

    assert.equal(scheda.lezioneId, unica.id)
    assert.equal(scheda.scelta, 'in-corso')
    assert.equal(scheda.precedente, null)
    assert.equal(scheda.successiva, null)
  })

  it('non inventa un’ora dove non ce ne sono', () => {
    assert.equal(lezioneAgenda(registroVuoto(), MERCOLEDI, '08:00'), null)
  })
})
