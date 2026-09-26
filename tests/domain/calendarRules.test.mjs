// Le regole di abbinamento: come si scrivono e quanti eventi prendono. I
// gestionali scrivono i pezzi del titolo in ordine qualunque («Laboratorio CAD
// e BIM - DIC1b, Dis_CG1a»): una regola vale per le parole, non per la frase.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { contaRegole, criterioRegola } from '../../dist-tests/domain.mjs'

/** Un evento già letto, con quel titolo. */
const evento = (titolo, luogo = '') => ({
  chiave: titolo, data: '2026-09-23', inizio: '08:20', fine: '09:50', titolo, luogo, annullato: false,
})

const TITOLO = 'Laboratorio CAD e BIM - DIC1b, Dis_CG1a, DIC1b, Dis_MP1b'

/** Il peso della regola su quel titolo: zero se non vale. */
function peso (testo, titolo = TITOLO, luogo = '') {
  const e = evento(titolo, luogo)
  const parole = new Set(
    `${titolo} ${luogo}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean),
  )
  return criterioRegola(testo)?.peso(e, parole) ?? 0
}

describe('criterioRegola', () => {
  it('non bada a maiuscole, accenti e punteggiatura', () => {
    assert.ok(peso('dic1b') > 0)
    assert.ok(peso('DIS_cg1a') > 0)
    assert.ok(peso('laboratorio') > 0)
    assert.ok(peso('Matematica', 'MATEMÀTICA 2') > 0)
  })

  it('le parole valgono in qualsiasi ordine, e devono esserci tutte', () => {
    assert.ok(peso('DIC1b CAD') > 0)
    assert.ok(peso('BIM laboratorio dic1b') > 0)
    assert.equal(peso('DIC1b Calcolo'), 0)
  })

  it('una parola vale intera, a meno di un asterisco in fondo', () => {
    assert.equal(peso('DIC1'), 0)
    assert.ok(peso('DIC1*') > 0)
    assert.ok(peso('lab* dis_mp*') > 0)
  })

  it('le varianti separate da | valgono se ne vale una', () => {
    assert.ok(peso('DIC1a | DIC1b') > 0)
    assert.equal(peso('DIC4a | DIC4b'), 0)
  })

  it('fra due barre è un’espressione regolare, senza maiuscole', () => {
    assert.ok(peso('/dic1[ab]/') > 0)
    assert.ok(peso('/^laboratorio/') > 0)
    assert.equal(peso('/^CAD/'), 0)
    // Anche sul luogo, come le parole.
    assert.ok(peso('/aula 2\\d\\d/', 'Calcolo', 'Aula 214') > 0)
  })

  it('una regola vuota o una regex rotta non dice niente, e non lancia', () => {
    assert.equal(criterioRegola('   '), null)
    assert.equal(criterioRegola('/dic1[ab/'), null)
    assert.equal(criterioRegola(' | '), null)
  })

  it('dice di più la regola più specifica', () => {
    assert.ok(peso('DIC1b CAD') > peso('DIC1b'))
    assert.ok(peso('DIC1b') > peso('DIC1*'))
  })
})

describe('contaRegole', () => {
  const eventi = [
    evento('Laboratorio CAD e BIM - DIC1b, Dis_CG1a'),
    evento('Laboratorio CAD e BIM - DIC1a, Dis_CG1a'),
    evento('Laboratorio CAD e BIM - DIC1a, Dis_CG1a'),
    evento('Calcolo professionale - DIC4b, Dis_MP4b'),
  ]
  const regola = (id, testo) => ({ id, testo, corsoId: null })

  it('conta gli eventi che una regola riconosce e quelli che decide', () => {
    const conti = contaRegole(eventi, [
      regola('tutti-lab', 'laboratorio'),
      regola('dic1a', 'DIC1a CAD'),
      regola('calcolo', 'calcolo'),
    ])
    // «laboratorio» ne riconosce tre, ma due li decide la regola più specifica.
    assert.deepEqual(conti.get('tutti-lab'), { abbinabili: 3, abbinati: 1, valida: true })
    assert.deepEqual(conti.get('dic1a'), { abbinabili: 2, abbinati: 2, valida: true })
    assert.deepEqual(conti.get('calcolo'), { abbinabili: 1, abbinati: 1, valida: true })
  })

  it('una regola che non prende niente, o rotta, si vede dai numeri', () => {
    const conti = contaRegole(eventi, [regola('refuso', 'DIC5z'), regola('rotta', '/(/')])
    assert.deepEqual(conti.get('refuso'), { abbinabili: 0, abbinati: 0, valida: true })
    assert.deepEqual(conti.get('rotta'), { abbinabili: 0, abbinati: 0, valida: false })
  })
})
