// Il ritardo è una presenza, in tutti i conti: `contaComeAssenza` accetta solo
// `assente`, e vale per quadro della persona, riepilogo dell'ora, matrice del
// corso, percentuali di fine semestre e soglia delle segnalazioni.
//
// Chi entra alla terza UD di quattro ha le prime due `assente`; la terza, in
// cui è arrivato, è un'ora in cui c'era. Le prove usano il ritardo **da solo**,
// così il conto dipende solo da lui.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  IMPOSTAZIONI_PREDEFINITE,
  contaComeAssenza,
  creaAllievo,
  creaLezione,
  matriceCorso,
  riepilogaPresenze,
  segnalazioniDelCorso,
} from '../../dist-tests/domain.mjs'
import { scuolaMinima } from '../helpers/register.mjs'

/** Un'ora di due UD, con gli stati che si vogliono provare. */
function ora (stati, data = '2026-09-15', allievoId = 'a1') {
  const lezione = creaLezione('cor-1', data, '08:00', 90)
  lezione.presenze = [{ allievoId, stati }]
  return lezione
}

describe('il ritardo nei conti delle assenze', () => {
  it('la regola: solo «assente» toglie un’ora', () => {
    assert.equal(contaComeAssenza('assente'), true)
    assert.equal(contaComeAssenza('ritardo'), false)
    // L'esonero è fuori perché c'è un permesso dietro.
    assert.equal(contaComeAssenza('esonerato'), false)
    assert.equal(contaComeAssenza('presente'), false)
    assert.equal(contaComeAssenza('non-impostato'), false)
  })

  it('nel riepilogo dell’ora: chi arriva tardi è fra i presenti', () => {
    const riepilogo = riepilogaPresenze([
      { allievoId: 'a1', stati: ['ritardo', 'presente'] },
      { allievoId: 'a2', stati: ['assente', 'assente'] },
    ])

    assert.equal(riepilogo.presenti, 1)
    assert.equal(riepilogo.assenti, 1)
    assert.equal(riepilogo.parziali, 0, 'un ritardo non è un’assenza parziale')
    assert.equal(riepilogo.ritardi, 1)
    assert.equal(riepilogo.udAssenza, 2, 'le due UD dell’assente, e nessuna del ritardo')
  })

  it('nella matrice del corso: presenza piena, e il ritardo in colonna sua', () => {
    const anna = creaAllievo('Rossi', 'Anna')
    const lezione = ora(['ritardo', 'presente'], '2026-09-15', anna.id)

    const { righe } = matriceCorso([anna], [lezione], [], IMPOSTAZIONI_PREDEFINITE, 2)

    assert.equal(righe[0].udAssenza, 0)
    assert.equal(righe[0].udPresenza, 2)
    assert.equal(righe[0].presenza, 1, 'frequenza piena')
    assert.equal(righe[0].assenza, 0, 'e nessuna quota di assenza sulle ore previste')
    assert.equal(righe[0].ritardi, 1)
    assert.equal(righe[0].minutiRitardo, 0, 'senza minuti battuti non se ne inventano')
    // Non è nemmeno un'assenza intera, e neppure parziale: in aula c'è stato.
    assert.equal(righe[0].assenzeIntere, 0)
    assert.equal(righe[0].assenzeParziali, 0)
  })

  it('nella soglia: chi è sempre in ritardo non viene segnalato', () => {
    const base = scuolaMinima()
    base.registro.impostazioni.sogliaAssenza = 1
    base.corso.orario = [{ giorno: 2, inizio: '08:00', durataMin: 90 }]
    for (const data of ['2026-09-15', '2026-09-22', '2026-09-29']) {
      const lezione = creaLezione(base.corso.id, data, '08:00', 90)
      lezione.presenze = [{ allievoId: base.rossi.id, stati: ['ritardo', 'ritardo'] }]
      base.registro.lezioni.push(lezione)
    }
    const periodo = {
      id: 'sem-prova',
      numero: 1,
      etichetta: 'periodo di prova',
      inizio: '2026-09-15',
      fine: '2026-09-29',
    }

    assert.deepEqual(
      segnalazioniDelCorso(base.registro, base.corso, periodo),
      [],
      'con la soglia all’1% e tre ore tutte in ritardo, non c’è niente da segnalare',
    )
  })
})
