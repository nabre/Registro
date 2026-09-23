// La scheda «pendenze» del widget: che cosa è rimasto indietro.
//
// Serve a una domanda sola — «sono indietro?» — e la risposta si legge senza
// aprire il registro: se dicesse di no mentre tre ore sono rimaste senza
// appello, nessuno se ne accorgerebbe fino a fine semestre. Le prove guardano
// che cosa conta come ora aperta, in che ordine stanno, e che cosa succede
// quando sono più di quante ne entrano.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  ORE_APERTE_MOSTRATE,
  agendaPendenze,
  creaConsegna,
  creaPresenza,
  oreAperte,
  registroVuoto,
} from '../../dist-tests/domain.mjs'
import { ore, scuolaMinima } from '../helpers/register.mjs'

/** Un venerdì di ottobre 2026. */
const VENERDI = '2026-10-23'

/** L'ora chiusa come si chiude davvero: appello fatto, e segnata svolta. */
function chiudi (registro, classe, lezione) {
  lezione.stato = 'svolta'
  lezione.presenze = classe.allievi.map((allievo) => creaPresenza(allievo.id, 1, 'presente'))
}

describe('le ore rimaste aperte', () => {
  it('prende quelle passate senza appello, e dice che cosa manca', () => {
    const { registro, corso } = scuolaMinima()
    const [lezione] = ore(registro, corso, ['2026-10-19'], '08:20', 45)

    const aperte = oreAperte(registro, VENERDI, '10:00')

    assert.equal(aperte.length, 1)
    assert.equal(aperte[0].lezioneId, lezione.id)
    assert.equal(aperte[0].quando, 'lun 19')
    assert.equal(aperte[0].inizio, '08:20')
    assert.equal(aperte[0].classe, 'I MEC A')
    assert.deepEqual(aperte[0].manca, ['senza appello', 'non segnata svolta'])
  })

  it('lascia fuori le ore chiuse, le annullate e quelle che devono ancora venire', () => {
    const { registro, classe, corso } = scuolaMinima()
    const [fatta] = ore(registro, corso, ['2026-10-19'], '08:20', 45)
    chiudi(registro, classe, fatta)
    const [saltata] = ore(registro, corso, ['2026-10-20'], '08:20', 45)
    saltata.stato = 'annullata'
    ore(registro, corso, ['2026-10-26'], '08:20', 45)

    assert.deepEqual(oreAperte(registro, VENERDI, '10:00'), [])
  })

  it('non chiama buco l’ora che sta succedendo adesso', () => {
    const { registro, corso } = scuolaMinima()
    ore(registro, corso, [VENERDI], '08:20', 90)

    // Alle 08:30 l'ora è cominciata da dieci minuti: l'appello si sta facendo.
    assert.deepEqual(oreAperte(registro, VENERDI, '08:30'), [])
    // Alle 10:30 è finita, e il registro è rimasto aperto.
    assert.equal(oreAperte(registro, VENERDI, '10:30').length, 1)
  })

  it('mette davanti la più vecchia: è quella che si sta dimenticando', () => {
    const { registro, corso } = scuolaMinima()
    ore(registro, corso, ['2026-10-21'], '08:20', 45)
    ore(registro, corso, ['2026-10-19'], '08:20', 45)
    ore(registro, corso, ['2026-10-20'], '08:20', 45)

    const aperte = oreAperte(registro, VENERDI, '10:00')

    assert.deepEqual(aperte.map((ora) => ora.quando), ['lun 19', 'mar 20', 'mer 21'])
  })
})

describe('la scheda delle pendenze', () => {
  it('conta a parte quelle che non entrano nell’elenco', () => {
    const { registro, corso } = scuolaMinima()
    const giorni = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09',
      '2026-10-12', '2026-10-13', '2026-10-14']
    ore(registro, corso, giorni, '08:20', 45)

    const scheda = agendaPendenze(registro, VENERDI, '10:00')

    assert.equal(scheda.oreAperte.length, ORE_APERTE_MOSTRATE)
    assert.equal(scheda.altreOre, giorni.length - ORE_APERTE_MOSTRATE)
    // Il totale le conta tutte: una linguetta che dicesse sei mentre ne mancano
    // otto sarebbe un conto sbagliato, non un elenco accorciato.
    assert.equal(scheda.aperti, giorni.length)
    assert.equal(scheda.senzaRegistro, false)
  })

  it('dice che non c’è un registro invece di dire che non c’è niente da fare', () => {
    const scheda = agendaPendenze(registroVuoto(), VENERDI, '10:00')

    assert.equal(scheda.senzaRegistro, true)
    assert.deepEqual(scheda.oreAperte, [])
    assert.deepEqual(scheda.classi, [])
    assert.equal(scheda.aperti, 0)
  })

  it('tiene fuori le classi che non aspettano niente', () => {
    const { registro, classe, corso } = scuolaMinima()
    const [fatta] = ore(registro, corso, ['2026-10-19'], '08:20', 45)
    chiudi(registro, classe, fatta)

    const scheda = agendaPendenze(registro, VENERDI, '10:00')

    assert.deepEqual(scheda.classi, [])
    assert.equal(scheda.aperti, 0)
  })

  it('porta la classe con il lavoro aperto, divisa per tipologia', () => {
    const { registro, corso } = scuolaMinima()
    const [lezione] = ore(registro, corso, ['2026-10-21'], '08:20', 45)
    registro.consegne.push(creaConsegna(corso.id, 'esercizi di ottobre', lezione.data, lezione.id))

    const scheda = agendaPendenze(registro, VENERDI, '10:00')

    assert.equal(scheda.classi.length, 1)
    assert.equal(scheda.classi[0].classe, 'I MEC A')
    assert.ok(scheda.classi[0].aperti > 0)
    assert.ok(scheda.classi[0].voci.length > 0)
    // Ogni voce si legge da sola: il nome della tipologia e quanti sono.
    for (const voce of scheda.classi[0].voci) {
      assert.equal(typeof voce.nome, 'string')
      assert.ok(voce.aperti > 0)
    }
  })
})
