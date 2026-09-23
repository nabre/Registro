// La soglia di assenza che diventa una pendenza.
//
// `sogliaAssenza` era un numero che compariva su due rapporti stampati e da
// nessun'altra parte: chi non stampava quei fogli non sapeva di doverlo fare.
// Qui si prova la conseguenza — chi la supera esce in elenco — e le due
// distinzioni che la rendono onesta: quale percentuale fa scattare la soglia, e
// quando la segnalazione è confermata invece che sospetta.

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
 * Il periodo su cui si contano le ore: quattro martedì, otto UD previste.
 *
 * Il periodo non è un dettaglio della prova: la percentuale si conta sulle ore
 * che il corso prevede *lì dentro*. Sull'anno intero le stesse quattro assenze
 * sarebbero il cinque per cento — ed è giusto così, ma non è quel che si sta
 * provando.
 */
const PERIODO = {
  id: 'sem-prova',
  numero: 1,
  etichetta: 'periodo di prova',
  inizio: MARTEDI,
  fine: '2026-10-06',
}

/**
 * Un corso con un'ora fissa a settimana, e le ore già a calendario.
 *
 * L'orario serve al denominatore: la percentuale di assenza si conta sulle UD
 * che il corso *prevede* nel periodo, non su quelle già messe a calendario —
 * altrimenti a metà ottobre risulterebbe che tutti hanno seguito tutto.
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
    // Otto UD previste, ma l'appello c'è su una sola ora: chi è mancato a
    // quella risulta oltre soglia sul previsto e non su quel che si è segnato.
    const { registro, corso, rossi } = scuolaConOre(4, (i, base) =>
      i === 0 ? [{ allievoId: base.rossi.id, stati: ['assente', 'assente'] }] : [],
    )
    registro.impostazioni.sogliaAssenza = 20

    const [segnalazione] = segnalazioniDelCorso(registro, corso, PERIODO)

    assert.equal(segnalazione.allievoId, rossi.id)
    // Sulle UD con l'appello fatto è assente al 100%: oltre soglia anche lì.
    assert.equal(segnalazione.confermata, true)

    // Con l'appello fatto dappertutto e una sola assenza su otto UD, nessuno
    // esce: la conferma non è un modo per segnalare comunque.
    const pieno = scuolaConOre(4, (i, base) => [
      { allievoId: base.rossi.id, stati: i === 0 ? ['assente', 'presente'] : ['presente', 'presente'] },
    ])
    pieno.registro.impostazioni.sogliaAssenza = 20
    assert.deepEqual(segnalazioniDelCorso(pieno.registro, pieno.corso, PERIODO), [])
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
