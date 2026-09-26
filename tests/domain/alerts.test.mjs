// La soglia di assenza diventa una pendenza: chi la supera esce in elenco.
// Si provano quale percentuale fa scattare la soglia e quando la segnalazione è
// confermata invece che sospetta.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  creaLezione,
  oltreSoglia,
  segnalazioniAssenza,
  segnalazioniDelCorso,
} from '../../dist-tests/domain.mjs'
import { scuolaMinima } from '../helpers/register.mjs'

/** Un martedì dentro l'anno delle prove: l'orario del corso ci passa sopra. */
const MARTEDI = '2026-09-15'

/**
 * Il periodo su cui si contano le ore: quattro martedì, otto UD previste. La
 * percentuale si conta sulle ore previste *lì dentro*.
 */
const PERIODO = {
  id: 'sem-prova',
  numero: 1,
  etichetta: 'periodo di prova',
  inizio: MARTEDI,
  fine: '2026-10-06',
}

/**
 * Un corso con un'ora fissa a settimana, e le ore già a calendario. L'orario
 * dà il denominatore: le UD *previste* nel periodo, non quelle già a
 * calendario.
 */
function scuolaConOre (quante, presenze) {
  const base = scuolaMinima()
  base.corso.orario = [{ giorno: 2, inizio: '08:00', durataMin: 90 }]

  const lezioni = []
  for (let i = 0; i < quante; i += 1) {
    const data = new Date(`${MARTEDI}T00:00:00Z`)
    data.setUTCDate(data.getUTCDate() + i * 7)
    const lezione = creaLezione(base.corso.id, data.toISOString().slice(0, 10), '08:00', 90)
    lezione.presenze = presenze(i, base)
    lezioni.push(lezione)
    base.registro.lezioni.push(lezione)
  }
  return { ...base, lezioni }
}

describe('la soglia di assenza', () => {
  it('spenta a zero: non segnala nessuno, per quanto si manchi', () => {
    assert.equal(oltreSoglia(0, 0.9), false)
    // E la regola vale nei due versi: sopra la soglia, non «da» la soglia.
    assert.equal(oltreSoglia(20, 0.2), false, '20% esatto non supera il 20%')
    assert.equal(oltreSoglia(20, 0.21), true)
    assert.equal(oltreSoglia(20, null), false, 'senza dato non si segnala')
  })

  it('segnala chi ha perso più ore di quelle ammesse', () => {
    // Quattro ore da due UD: otto UD previste nel periodo. Ne perde quattro.
    const { registro, corso, rossi, bianchi } = scuolaConOre(4, (i, base) => [
      {
        allievoId: base.rossi.id,
        stati: i < 2 ? ['assente', 'assente'] : ['presente', 'presente'],
      },
      { allievoId: base.bianchi.id, stati: ['presente', 'presente'] },
    ])
    registro.impostazioni.sogliaAssenza = 20

    const segnalazioni = segnalazioniDelCorso(registro, corso, PERIODO)

    assert.equal(segnalazioni.length, 1, 'solo chi è oltre')
    assert.equal(segnalazioni[0].allievoId, rossi.id)
    assert.equal(segnalazioni[0].percento, 50)
    assert.equal(segnalazioni[0].scarto, 30, 'di quanto supera, in punti')
    assert.equal(segnalazioni[0].udAssenza, 4)
    assert.ok(segnalazioni.every((s) => s.allievoId !== bianchi.id))
  })

  it('distingue chi è oltre davvero da chi lo è per appelli mancanti', () => {
    // Quattro ore svolte, otto UD previste, l'appello su una sola: chi è mancato
    // a quella è oltre soglia sul previsto, ma è un caso da guardare, non
    // confermato. `confermata` misura la copertura degli appelli.
    const { registro, corso, rossi, lezioni } = scuolaConOre(4, (i, base) =>
      i === 0 ? [{ allievoId: base.rossi.id, stati: ['assente', 'assente'] }] : [],
    )
    for (const lezione of lezioni) lezione.stato = 'svolta'
    registro.impostazioni.sogliaAssenza = 20

    const [segnalazione] = segnalazioniDelCorso(registro, corso, PERIODO)

    assert.equal(segnalazione.allievoId, rossi.id)
    assert.equal(segnalazione.confermata, false, 'tre ore svolte senza appello')

    // Gli stessi numeri con l'appello su tutte le ore svolte: confermata.
    const coperto = scuolaConOre(4, (i, base) => [
      { allievoId: base.rossi.id, stati: i < 2 ? ['assente', 'assente'] : ['presente', 'presente'] },
    ])
    for (const lezione of coperto.lezioni) lezione.stato = 'svolta'
    coperto.registro.impostazioni.sogliaAssenza = 20
    const [piena] = segnalazioniDelCorso(coperto.registro, coperto.corso, PERIODO)
    assert.equal(piena.confermata, true)

    // Appello dappertutto e una sola assenza su otto UD: nessuno esce.
    const pieno = scuolaConOre(4, (i, base) => [
      { allievoId: base.rossi.id, stati: i === 0 ? ['assente', 'presente'] : ['presente', 'presente'] },
    ])
    pieno.registro.impostazioni.sogliaAssenza = 20
    assert.deepEqual(segnalazioniDelCorso(pieno.registro, pieno.corso, PERIODO), [])
  })

  it('un’ora annullata esce anche dalle UD previste', () => {
    // Quattro martedì, uno annullato: sei UD previste, non otto. Rossi perde due
    // UD: il 33%, non il 25%. L'ora annullata non resta nel monte ore.
    const { registro, corso, lezioni } = scuolaConOre(4, (i, base) => [
      { allievoId: base.rossi.id, stati: i === 1 ? ['assente', 'assente'] : ['presente', 'presente'] },
    ])
    lezioni[3].stato = 'annullata'
    registro.impostazioni.sogliaAssenza = 30

    const [segnalazione] = segnalazioniDelCorso(registro, corso, PERIODO)

    assert.ok(segnalazione, 'con sei UD previste il 33% supera il 30%')
    assert.equal(segnalazione.udPreviste, 6)
    assert.equal(segnalazione.udAssenza, 2)
  })

  it('le ore annullate non fanno assenze', () => {
    const { registro, corso, lezioni } = scuolaConOre(4, (_i, base) => [
      { allievoId: base.rossi.id, stati: ['assente', 'assente'] },
    ])
    registro.impostazioni.sogliaAssenza = 20
    for (const lezione of lezioni) lezione.stato = 'annullata'

    assert.deepEqual(
      segnalazioniDelCorso(registro, corso, PERIODO),
      [],
      'un’ora che non si è tenuta non è un’ora in cui qualcuno poteva mancare',
    )
  })

  it('una riga per persona e per corso, dalla più grave', () => {
    const { registro, corso } = scuolaConOre(4, (i, base) => [
      { allievoId: base.rossi.id, stati: i < 3 ? ['assente', 'assente'] : ['presente', 'presente'] },
      { allievoId: base.bianchi.id, stati: i < 2 ? ['assente', 'assente'] : ['presente', 'presente'] },
    ])
    registro.impostazioni.sogliaAssenza = 20

    const segnalazioni = segnalazioniAssenza(registro, [corso], PERIODO)

    assert.deepEqual(segnalazioni.map((s) => s.percento), [75, 50])
    assert.deepEqual(new Set(segnalazioni.map((s) => s.corsoId)), new Set([corso.id]))
  })
})

describe('la soglia di assenza, esatta', () => {
  it('alla soglia non si è oltre, anche dove la virgola mobile sbaglia', () => {
    for (const soglia of [7, 14, 28, 29, 56, 57]) {
      assert.equal(oltreSoglia(soglia, soglia / 100), false, `${soglia}%`)
    }
    assert.equal(oltreSoglia(7, 0.0701), true)
  })

  it('chi è oltre di poco non legge una percentuale uguale alla soglia', () => {
    // Tre martedì da due UD: sei previste. Due perse sono il 33,3%: con la soglia
    // al 33 la persona è oltre, anche se «33%» direbbe il contrario.
    const base = scuolaMinima()
    base.corso.orario = [{ giorno: 2, inizio: '08:00', durataMin: 90 }]
    for (const [i, data] of ['2026-09-15', '2026-09-22', '2026-09-29'].entries()) {
      const lezione = creaLezione(base.corso.id, data, '08:00', 90)
      const stati = i === 0 ? ['assente', 'assente'] : ['presente', 'presente']
      lezione.presenze = [{ allievoId: base.rossi.id, stati }]
      base.registro.lezioni.push(lezione)
    }
    base.registro.impostazioni.sogliaAssenza = 33
    const periodo = { id: 'p', numero: 1, etichetta: 'prova', inizio: '2026-09-15', fine: '2026-09-29' }

    const [segnalazione] = segnalazioniDelCorso(base.registro, base.corso, periodo)

    assert.equal(segnalazione.allievoId, base.rossi.id)
    assert.equal(segnalazione.percento, 33.4)
  })
})
