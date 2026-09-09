// Quale ora la barra di stato propone, e in che ordine.
//
// È la riga che si legge senza cercarla, e sbagliarla ha un costo preciso: se
// proponesse la prossima lezione mentre dietro c'è un'ora senza appello, quel
// buco non lo ricorderebbe più nessuno — è esattamente il caso che la barra
// esiste per non far succedere.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { creaLezione, creaValutazione, oraDaCompilare } from '../../dist-prove/dominio.mjs'
import { ore as oreDelCorso, scuolaMinima } from '../aiuti/registro.mjs'

/** Il giorno da cui si guarda: le tre ore sono il 12, il 19 e il 26 ottobre. */
const OGGI = '2026-10-20'

function scuola () {
  const base = scuolaMinima()
  const ore = oreDelCorso(base.registro, base.corso, ['2026-10-12', '2026-10-19', '2026-10-26'])
  return { ...base, ore }
}

/**
 * Segna l'ora come fatta e con l'appello preso: da lì in poi non è più un buco.
 *
 * Uno stato per unità didattica, come nel registro vero: `stati` vuoto — o
 * pieno di caselle non decise — è un appello *non* fatto, ed è proprio quel che
 * `diagnosiLezione` cerca.
 */
function compila (lezione, allievi) {
  lezione.stato = 'svolta'
  const ud = lezione.slot.filter((s) => s.tipo !== 'pausa').length || 1
  lezione.presenze = allievi.map((allievo) => ({
    allievoId: allievo.id,
    stati: Array.from({ length: ud }, () => 'presente'),
  }))
}

describe('l’ora che la barra propone', () => {
  it('è il buco più vecchio, non il più recente', () => {
    const { registro, ore, rossi, bianchi, verdi } = scuola()
    // La terza è futura; le prime due sono passate e nessuna è a posto.
    const trovata = oraDaCompilare(registro, registro.lezioni, OGGI)

    assert.equal(trovata.manca, true)
    assert.equal(trovata.lezione.id, ore[0].id, 'dovrebbe proporre il 12, non il 19')
    assert.ok([rossi, bianchi, verdi].length === 3)
  })

  it('passa al buco dopo quando il primo è a posto', () => {
    const { registro, ore, rossi, bianchi, verdi } = scuola()
    compila(ore[0], [rossi, bianchi, verdi])

    const trovata = oraDaCompilare(registro, registro.lezioni, OGGI)

    assert.equal(trovata.manca, true)
    assert.equal(trovata.lezione.id, ore[1].id)
  })

  it('chiusi i buchi, guarda avanti e non è più un allarme', () => {
    const { registro, ore, rossi, bianchi, verdi } = scuola()
    compila(ore[0], [rossi, bianchi, verdi])
    compila(ore[1], [rossi, bianchi, verdi])

    const trovata = oraDaCompilare(registro, registro.lezioni, OGGI)

    assert.equal(trovata.manca, false)
    assert.equal(trovata.lezione.id, ore[2].id, 'dovrebbe proporre l’ora del 26')
  })

  it('un’ora annullata non è un buco e non è la prossima', () => {
    const { registro, ore, rossi, bianchi, verdi } = scuola()
    compila(ore[0], [rossi, bianchi, verdi])
    compila(ore[1], [rossi, bianchi, verdi])
    ore[2].stato = 'annullata'

    assert.equal(oraDaCompilare(registro, registro.lezioni, OGGI), null)
  })

  it('l’ora di stamattina, guardata a mezzogiorno, è già un buco', () => {
    const { registro, corso } = scuolaMinima()
    const mattina = creaLezione(corso.id, '2026-10-20', '08:20', 45)
    registro.lezioni.push(mattina)

    // Alle sette non è ancora successo niente: è la prossima.
    const presto = oraDaCompilare(registro, registro.lezioni, '2026-10-20', '07:00')
    assert.equal(presto.manca, false)

    // A mezzogiorno è passata senza appello: è un buco.
    const tardi = oraDaCompilare(registro, registro.lezioni, '2026-10-20', '12:00')
    assert.equal(tardi.manca, true)
    assert.equal(tardi.lezione.id, mattina.id)
  })

  it('senza lezioni non propone niente invece di inventare', () => {
    const { registro } = scuolaMinima()

    assert.equal(oraDaCompilare(registro, registro.lezioni, OGGI), null)
  })

  it('guarda solo le ore che le si danno: è così che la barra segue il filtro', () => {
    const { registro, ore } = scuola()
    // Solo la terza, che è futura: il buco del 12 non le è stato passato.
    const trovata = oraDaCompilare(registro, [ore[2]], OGGI)

    assert.equal(trovata.manca, false)
    assert.equal(trovata.lezione.id, ore[2].id)
  })

  it('un’ora passata, segnata svolta e con l’appello, non chiede più niente', () => {
    const { registro, ore, rossi, bianchi, verdi } = scuola()
    compila(ore[0], [rossi, bianchi, verdi])
    compila(ore[1], [rossi, bianchi, verdi])
    // Una verifica dentro l'ora non la rende un buco: è un fatto, non un vuoto.
    registro.valutazioni.push(creaValutazione(ore[0].corsoId, 'Prova', undefined, ore[0].data))

    const trovata = oraDaCompilare(registro, registro.lezioni, OGGI)
    assert.equal(trovata.manca, false)
  })
})
