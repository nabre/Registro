// Il promemoria dell'ora che sta per cominciare.
//
// Sono le due domande che una notifica deve azzeccare — *quando* parlare e
// *che cosa* dire — e tutte e due dipendono dall'orologio. Provate qui si
// verificano in un millesimo di secondo; provate a mano si verificano una volta
// al giorno, alle 08:15, e solo se quel giorno c'è lezione.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  creaConsegna,
  creaLezione,
  oreCheCominciano,
  promemoriaDellOra,
} from '../../dist-tests/domain.mjs'
import { scuolaMinima } from '../helpers/register.mjs'

const GIORNO = '2026-10-19'

function scuola () {
  const base = scuolaMinima()
  const mattina = creaLezione(base.corso.id, GIORNO, '08:20', 45)
  const pomeriggio = creaLezione(base.corso.id, GIORNO, '13:15', 45)
  base.registro.lezioni.push(mattina, pomeriggio)
  return { ...base, mattina, pomeriggio }
}

describe('quali ore si annunciano', () => {
  it('quella che comincia dentro la finestra, non quella dopo', () => {
    const { registro, mattina } = scuola()

    const trovate = oreCheCominciano(registro, GIORNO, '08:15', 5)

    assert.deepEqual(trovate.map((l) => l.id), [mattina.id])
  })

  it('niente se l’inizio è ancora lontano', () => {
    const { registro } = scuola()

    assert.deepEqual(oreCheCominciano(registro, GIORNO, '08:00', 5), [])
  })

  it('l’ora esatta è dentro la finestra: si annuncia anche a inizio scoccato', () => {
    const { registro, mattina } = scuola()

    const trovate = oreCheCominciano(registro, GIORNO, '08:20', 5)

    assert.deepEqual(trovate.map((l) => l.id), [mattina.id])
  })

  it('un’ora già cominciata non si annuncia guardando avanti', () => {
    const { registro } = scuola()

    assert.deepEqual(oreCheCominciano(registro, GIORNO, '08:25', 5), [])
  })

  it('ma chiedendo da prima la si ritrova: è il portatile riaperto in aula', () => {
    const { registro, mattina } = scuola()

    // Alle 08:25, guardando da un quarto d'ora prima con la finestra allargata.
    const trovate = oreCheCominciano(registro, GIORNO, '08:10', 20)

    assert.deepEqual(trovate.map((l) => l.id), [mattina.id])
  })

  it('le annullate non cominciano', () => {
    const { registro, mattina } = scuola()
    mattina.stato = 'annullata'

    assert.deepEqual(oreCheCominciano(registro, GIORNO, '08:15', 5), [])
  })

  it('le ore di un altro giorno restano fuori', () => {
    const { registro } = scuola()

    assert.deepEqual(oreCheCominciano(registro, '2026-10-20', '08:15', 5), [])
  })

  it('più ore insieme escono in ordine di inizio', () => {
    const { registro, corso, mattina } = scuola()
    const prima = creaLezione(corso.id, GIORNO, '08:00', 45)
    registro.lezioni.push(prima)

    const trovate = oreCheCominciano(registro, GIORNO, '07:55', 30)

    assert.deepEqual(trovate.map((l) => l.id), [prima.id, mattina.id])
  })
})

describe('che cosa dice il promemoria', () => {
  it('la classe e quanto manca, nel titolo', () => {
    const { registro, mattina } = scuola()

    assert.equal(promemoriaDellOra(registro, mattina, '08:15').titolo, 'I MEC A fra 5 minuti')
    assert.equal(promemoriaDellOra(registro, mattina, '08:19').titolo, 'I MEC A fra 1 minuto')
    assert.equal(promemoriaDellOra(registro, mattina, '08:20').titolo, 'I MEC A adesso')
    assert.equal(promemoriaDellOra(registro, mattina, '08:30').titolo, 'I MEC A adesso')
  })

  it('l’orario, la materia e l’aula nella prima riga', () => {
    const { registro, mattina } = scuola()
    mattina.aula = 'aula 314'

    const righe = promemoriaDellOra(registro, mattina, '08:15').corpo.split('\n')

    assert.match(righe[0], /^08:20–/)
    assert.ok(righe[0].includes('Matematica'), righe[0])
    assert.ok(righe[0].includes('aula 314'), righe[0])
  })

  it('senza niente in sospeso lo dice, invece di tacere', () => {
    const { registro, mattina } = scuola()

    const promemoria = promemoriaDellOra(registro, mattina, '08:15')

    assert.equal(promemoria.daFare, 0)
    assert.match(promemoria.corpo, /Niente in sospeso/)
  })

  it('conta le cose aperte del corso e ne nomina qualcuna', () => {
    const { registro, corso, mattina } = scuola()
    const consegna = creaConsegna(corso.id, 'Portare il libro')
    consegna.dataLezioneId = mattina.id
    registro.consegne.push(consegna)

    const promemoria = promemoriaDellOra(registro, mattina, '08:15')

    assert.ok(promemoria.daFare >= 1, `daFare = ${promemoria.daFare}`)
    assert.ok(promemoria.corpo.includes('Portare il libro'), promemoria.corpo)
  })

  it('porta con sé l’ora da aprire premendola', () => {
    const { registro, mattina } = scuola()

    assert.equal(promemoriaDellOra(registro, mattina, '08:15').lezioneId, mattina.id)
  })
})
