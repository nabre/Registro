// La griglia del mese in testa al widget.
//
// È una vista che si guarda di sfuggita per decidere dove andare: quel che dice
// deve essere vero senza controprova. Le prove guardano le quattro cose che si
// sbagliano — quali colonne ci sono, dove cadono i pallini, quale settimana
// risulta quella guardata, e dove finisce l'anno.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { meseAgenda, meseSpostato, primoGiornoUtile } from '../../dist-tests/domain.mjs'
import { FINE, INIZIO, ore, scuolaMinima } from '../helpers/register.mjs'

/** Un martedì di ottobre 2026: la sua settimana va dal 19 al 25. */
const MARTEDI = '2026-10-20'

/** Tutte le caselle della griglia, srotolate. */
function celle (mese) {
  return mese.settimane.flat()
}

function cella (mese, data) {
  return celle(mese).find((giorno) => giorno.data === data)
}

describe('il mese dell’agenda', () => {
  it('mostra le sole colonne dei giorni di scuola', () => {
    const { registro } = scuolaMinima()
    const mese = meseAgenda(registro, MARTEDI, MARTEDI, '08:00')

    assert.deepEqual(mese.colonne, ['lun', 'mar', 'mer', 'gio', 'ven'])
    assert.equal(mese.etichetta, 'ottobre 2026')
    assert.equal(mese.primo, '2026-10-01')
    // Cinque colonne per riga, sabato e domenica fuori: la striscia è larga
    // come una colonna di icone, e due colonne vuote sono due settimi buttati.
    for (const settimana of mese.settimane) assert.equal(settimana.length, 5)
  })

  it('segna le caselle con lezione, e quelle rimaste indietro', () => {
    const { registro, corso } = scuolaMinima()
    ore(registro, corso, ['2026-10-19'], '08:20', 45)
    ore(registro, corso, ['2026-10-22'], '08:20', 45)

    // Guardato il 23, il lunedì è passato senza appello: è un buco.
    const mese = meseAgenda(registro, MARTEDI, '2026-10-23', '08:00')

    assert.equal(cella(mese, '2026-10-19').quante, 1)
    assert.equal(cella(mese, '2026-10-19').manca, true)
    assert.equal(cella(mese, '2026-10-22').quante, 1)
    assert.equal(cella(mese, '2026-10-22').manca, true)
    assert.equal(cella(mese, '2026-10-21').quante, 0)
    assert.equal(cella(mese, '2026-10-21').manca, false)
  })

  it('non chiama buco un’ora che deve ancora succedere', () => {
    const { registro, corso } = scuolaMinima()
    ore(registro, corso, ['2026-10-23'], '08:20', 45)

    const mese = meseAgenda(registro, MARTEDI, MARTEDI, '08:00')

    assert.equal(cella(mese, '2026-10-23').quante, 1)
    assert.equal(cella(mese, '2026-10-23').manca, false)
  })

  it('evidenzia la settimana guardata e il giorno di oggi', () => {
    const { registro } = scuolaMinima()
    const mese = meseAgenda(registro, MARTEDI, '2026-10-23', '08:00')

    const nella = celle(mese).filter((giorno) => giorno.nellaSettimana).map((g) => g.data)
    assert.deepEqual(nella, ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'])

    assert.equal(cella(mese, '2026-10-23').oggi, true)
    assert.equal(cella(mese, '2026-10-20').oggi, false)
  })

  it('distingue le code degli altri mesi da quello guardato', () => {
    const { registro } = scuolaMinima()
    const mese = meseAgenda(registro, MARTEDI, MARTEDI, '08:00')

    // Il 1º ottobre 2026 è un giovedì: la prima riga comincia con due giorni di
    // settembre, che ci sono perché la griglia sia un rettangolo.
    assert.equal(cella(mese, '2026-09-28').suo, false)
    assert.equal(cella(mese, '2026-10-01').suo, true)
  })

  it('spegne i giorni fuori dall’anno scolastico', () => {
    const { registro } = scuolaMinima()
    // Agosto: l'anno comincia il 1º settembre.
    const mese = meseAgenda(registro, '2026-08-15', '2026-08-15', '08:00')

    assert.equal(cella(mese, '2026-08-14').fuori, true)
    // La coda di settembre, in fondo alla griglia di agosto, è dentro l'anno.
    assert.equal(cella(mese, '2026-09-01').fuori, false)
  })

  it('dice la chiusura del giorno, quando c’è', () => {
    const { registro, anno } = scuolaMinima()
    anno.sospensioni.push({
      id: 'vacanza',
      etichetta: 'Vacanze autunnali',
      dal: '2026-10-19',
      al: '2026-10-23',
    })

    const mese = meseAgenda(registro, MARTEDI, MARTEDI, '08:00')

    assert.equal(cella(mese, '2026-10-20').chiuso, 'Vacanze autunnali')
    assert.equal(cella(mese, '2026-10-26').chiuso, null)
  })
})

describe('lo spostamento fra i mesi', () => {
  it('va al primo del mese prima e di quello dopo', () => {
    assert.equal(meseSpostato('2026-10-01', -1), '2026-09-01')
    assert.equal(meseSpostato('2026-10-01', 1), '2026-11-01')
    // Dicembre e gennaio: l'anno cambia insieme al mese.
    assert.equal(meseSpostato('2026-12-01', 1), '2027-01-01')
  })

  it('porta dentro l’anno il giorno premuto fuori, e si ferma dopo la fine', () => {
    const { registro } = scuolaMinima()

    assert.equal(primoGiornoUtile(registro, '2026-08-15'), INIZIO)
    assert.equal(primoGiornoUtile(registro, MARTEDI), MARTEDI)
    assert.equal(primoGiornoUtile(registro, '2027-08-01'), null)
    assert.equal(primoGiornoUtile(registro, FINE), FINE)
  })
})
