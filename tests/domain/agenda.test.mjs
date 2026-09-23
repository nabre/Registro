// L'agenda della settimana, che è quel che il widget sul desktop mostra.
//
// È una vista che si legge con la coda dell'occhio mentre si fa altro: nessuno
// la verificherà aprendo il registro, e quindi tutto quel che dice deve essere
// vero senza controprova. Le prove guardano le tre cose che si sbagliano: quali
// giorni ci sono, che fase ha un'ora a un'ora data, e dove scatta la larghezza
// sulla griglia delle icone.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  CELLE_MINIME,
  agendaSettimana,
  celleDaLarghezza,
  larghezzaDaCelle,
  registroVuoto,
  settimanaDiPartenza,
} from '../../dist-tests/domain.mjs'
import { FINE, INIZIO, ore, scuolaMinima } from '../helpers/register.mjs'

/** Un martedì: la settimana va dal 19 al 25 ottobre 2026. */
const MARTEDI = '2026-10-20'
const LUNEDI = '2026-10-19'

describe('agenda della settimana', () => {
  it('mette le ore nel loro giorno, in ordine di orario', () => {
    const { registro, corso } = scuolaMinima()
    // Il pomeriggio scritto per primo: l'ordine dentro il giorno lo deve fare
    // l'agenda, non l'ordine in cui le ore stanno nel file.
    ore(registro, corso, [MARTEDI], '13:30', 45)
    ore(registro, corso, [MARTEDI], '08:20', 90)

    const settimana = agendaSettimana(registro, MARTEDI, MARTEDI, '07:00')
    const martedi = settimana.giorni.find((giorno) => giorno.data === MARTEDI)

    assert.equal(settimana.lunedi, LUNEDI)
    assert.equal(settimana.quante, 2)
    assert.deepEqual(martedi.ore.map((ora) => ora.inizio), ['08:20', '13:30'])
    assert.equal(martedi.ore[0].fine, '09:50')
    assert.equal(martedi.ore[0].classe, 'I MEC A')
  })

  it('mostra i cinque giorni di scuola anche quando sono vuoti', () => {
    const { registro } = scuolaMinima()
    const settimana = agendaSettimana(registro, MARTEDI, MARTEDI, '07:00')

    assert.deepEqual(settimana.giorni.map((giorno) => giorno.nome), ['lun', 'mar', 'mer', 'gio', 'ven'])
    assert.equal(settimana.quante, 0)
  })

  it('segna in corso l’ora che sta succedendo adesso, e non le altre', () => {
    const { registro, corso } = scuolaMinima()
    ore(registro, corso, [MARTEDI], '08:20', 45)
    ore(registro, corso, [MARTEDI], '10:20', 45)

    const settimana = agendaSettimana(registro, MARTEDI, MARTEDI, '08:30')
    const martedi = settimana.giorni.find((giorno) => giorno.data === MARTEDI)

    assert.equal(martedi.ore[0].fase, 'in-corso')
    assert.equal(settimana.inCorso, martedi.ore[0].lezioneId)
    // La prossima è quella che deve ancora cominciare, non quella in corso.
    assert.equal(settimana.prossima, martedi.ore[1].lezioneId)
  })

  it('scorrendo avanti non fa diventare passate le ore della settimana prossima', () => {
    const { registro, corso } = scuolaMinima()
    const settimanaDopo = '2026-10-27'
    ore(registro, corso, [settimanaDopo], '08:20', 45)

    // Guardata dal martedì di oggi, a ora tarda: il riferimento è la settimana
    // dopo, e l'orologio resta quello vero.
    const settimana = agendaSettimana(registro, settimanaDopo, MARTEDI, '23:00')
    const ora = settimana.giorni.flatMap((giorno) => giorno.ore)[0]

    assert.equal(settimana.corrente, false)
    assert.notEqual(ora.fase, 'da-chiudere')
    assert.equal(settimana.prossima, ora.lezioneId)
  })

  it('dice quando un giorno è chiuso', () => {
    const { registro, anno } = scuolaMinima()
    anno.sospensioni.push({ id: 's1', etichetta: 'Vacanze autunnali', dal: LUNEDI, al: '2026-10-25' })

    const settimana = agendaSettimana(registro, MARTEDI, MARTEDI, '07:00')

    assert.equal(settimana.giorni[0].chiuso, 'Vacanze autunnali')
  })
})

describe('l’anno rispetto al file', () => {
  it('senza un registro aperto lo dice, invece di mostrare cinque giorni vuoti', () => {
    const settimana = agendaSettimana(registroVuoto(), MARTEDI, MARTEDI, '08:00')

    assert.equal(settimana.stato, 'senza-registro')
    assert.equal(settimana.anno, null)
    // I giorni ci sono lo stesso: è la testata a spiegare, non l'elenco a
    // sparire.
    assert.equal(settimana.giorni.length, 5)
  })

  it('distingue «l’anno comincia più avanti» da «l’anno è finito»', () => {
    const { registro } = scuolaMinima()

    const prima = agendaSettimana(registro, '2026-07-07', '2026-07-07', '08:00')
    const dopo = agendaSettimana(registro, '2027-08-10', '2027-08-10', '08:00')
    const dentro = agendaSettimana(registro, MARTEDI, MARTEDI, '08:00')

    assert.equal(prima.stato, 'prima-dell-anno')
    assert.equal(dopo.stato, 'dopo-l-anno')
    assert.equal(dentro.stato, 'ok')
    assert.equal(dentro.anno, registro.anni[0].etichetta)
  })

  it('la settimana in cui l’anno comincia è già dentro l’anno', () => {
    const { registro } = scuolaMinima()
    // L'anno apre il primo settembre 2026, che è un martedì: la settimana
    // comincia il 31 agosto, e chiamarla «prima dell'anno» nasconderebbe le
    // prime ore.
    const settimana = agendaSettimana(registro, '2026-08-31', '2026-08-31', '08:00')

    assert.equal(settimana.stato, 'ok')
  })

  it('fuori dall’anno si apre sulla prima settimana, non su cinque giorni vuoti', () => {
    const { registro } = scuolaMinima()

    // In agosto si guarda avanti: la risposta utile è «l'anno comincia qui».
    assert.equal(settimanaDiPartenza(registro, '2026-08-01'), '2026-08-31')
    // A settembre, la settimana di oggi.
    assert.equal(settimanaDiPartenza(registro, MARTEDI), LUNEDI)
    // Dopo la fine, l'ultima settimana dell'anno.
    assert.equal(settimanaDiPartenza(registro, '2027-09-01'), '2027-06-28')
    // Senza un anno aperto non c'è niente da cui ripartire: la settimana di oggi.
    assert.equal(settimanaDiPartenza(registroVuoto(), MARTEDI), LUNEDI)

    assert.ok(INIZIO < FINE)
  })
})

describe('la larghezza sulla griglia delle icone', () => {
  const CELLA = 75
  const SCHERMO = 1920

  it('scatta alla cella più vicina', () => {
    assert.equal(celleDaLarghezza(220, CELLA, SCHERMO), 3)
    assert.equal(celleDaLarghezza(260, CELLA, SCHERMO), 3)
    assert.equal(celleDaLarghezza(120, CELLA, SCHERMO), 2)
  })

  it('non scende sotto il minimo né passa metà schermo', () => {
    assert.equal(celleDaLarghezza(10, CELLA, SCHERMO), CELLE_MINIME)
    assert.equal(celleDaLarghezza(5000, CELLA, SCHERMO), 12)
    assert.equal(larghezzaDaCelle(5000, CELLA, SCHERMO), 12 * CELLA)
  })

  it('torna sempre un multiplo intero della cella', () => {
    for (const larghezza of [0, 99, 151, 226, 999]) {
      const celle = celleDaLarghezza(larghezza, CELLA, SCHERMO)
      assert.equal(larghezzaDaCelle(celle, CELLA, SCHERMO) % CELLA, 0)
    }
  })
})
