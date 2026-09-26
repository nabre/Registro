// A che punto è un'ora del suo giro (svolta, da chiudere, in corso, futura),
// come la mostra il menu del vassoio. Un'ora a posto non è «da chiudere», e un
// buco non è «svolta».

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { creaLezione, faseDellOra, raggruppaOre } from '../../dist-tests/domain.mjs'
import { conPiano, scuolaMinima } from '../helpers/register.mjs'

const OGGI = '2026-10-20'

/** L'appello preso su tutte le UD: da lì in poi l'ora è a posto. */
function conAppello (lezione, allievi) {
  const ud = lezione.slot.filter((s) => s.tipo !== 'pausa').length || 1
  lezione.presenze = allievi.map((allievo) => ({
    allievoId: allievo.id,
    stati: Array.from({ length: ud }, () => 'presente'),
  }))
}

function scuola () {
  return scuolaMinima()
}

describe('la fase di un’ora', () => {
  it('futura e con la scaletta che copre l’ora: futura', () => {
    const { registro, corso } = scuola()
    const l = creaLezione(corso.id, '2026-10-26', '08:20', 45)
    registro.lezioni.push(l)
    conPiano(registro, l, 1)

    assert.equal(faseDellOra(registro, l, OGGI), 'futura')
  })

  it('futura con una scaletta a metà: ancora da preparare', () => {
    const { registro, corso } = scuola()
    const l = creaLezione(corso.id, '2026-10-26', '08:20', 45)
    registro.lezioni.push(l)
    conPiano(registro, l, 0.5)

    assert.equal(faseDellOra(registro, l, OGGI), 'da-preparare')
  })

  it('futura e senza piano: da preparare', () => {
    const { registro, corso } = scuola()
    const l = creaLezione(corso.id, '2026-10-26', '08:20', 45)
    registro.lezioni.push(l)

    assert.equal(faseDellOra(registro, l, OGGI), 'da-preparare')
  })

  it('passata senza appello: da chiudere', () => {
    const { registro, corso } = scuola()
    const l = creaLezione(corso.id, '2026-10-12', '08:20', 45)
    registro.lezioni.push(l)

    assert.equal(faseDellOra(registro, l, OGGI), 'da-chiudere')
  })

  it('passata con l’appello ma non segnata svolta: ancora da chiudere', () => {
    const { registro, corso, rossi, bianchi, verdi } = scuola()
    const l = creaLezione(corso.id, '2026-10-12', '08:20', 45)
    conAppello(l, [rossi, bianchi, verdi])
    registro.lezioni.push(l)

    assert.equal(faseDellOra(registro, l, OGGI), 'da-chiudere')
  })

  it('passata, segnata svolta e con l’appello: svolta', () => {
    const { registro, corso, rossi, bianchi, verdi } = scuola()
    const l = creaLezione(corso.id, '2026-10-12', '08:20', 45)
    l.stato = 'svolta'
    conAppello(l, [rossi, bianchi, verdi])
    registro.lezioni.push(l)

    assert.equal(faseDellOra(registro, l, OGGI), 'svolta')
  })

  it('annullata: annullata, anche se passata e senza appello', () => {
    const { registro, corso } = scuola()
    const l = creaLezione(corso.id, '2026-10-12', '08:20', 45)
    l.stato = 'annullata'
    registro.lezioni.push(l)

    assert.equal(
      faseDellOra(registro, l, OGGI),
      'annullata',
      'un’ora che non si è tenuta non ha un registro da chiudere',
    )
  })

  it('mentre sta succedendo: in corso, e batte tutto il resto', () => {
    const { registro, corso } = scuola()
    const l = creaLezione(corso.id, OGGI, '08:20', 45)
    registro.lezioni.push(l)

    // Prima: futura. Dentro: in corso. Dopo: da chiudere.
    assert.equal(faseDellOra(registro, l, OGGI, '07:00'), 'da-preparare')
    assert.equal(faseDellOra(registro, l, OGGI, '08:30'), 'in-corso')
    assert.equal(faseDellOra(registro, l, OGGI, '12:00'), 'da-chiudere')
  })
})

describe('le ore divise per mucchio', () => {
  it('ognuna nel suo, e nessuna in due', () => {
    const { registro, corso, rossi, bianchi, verdi } = scuola()
    const fatta = creaLezione(corso.id, '2026-10-05', '08:20', 45)
    fatta.stato = 'svolta'
    conAppello(fatta, [rossi, bianchi, verdi])
    const buco = creaLezione(corso.id, '2026-10-12', '08:20', 45)
    const adesso = creaLezione(corso.id, OGGI, '08:20', 45)
    const futura = creaLezione(corso.id, '2026-10-26', '08:20', 45)
    const persa = creaLezione(corso.id, '2026-10-19', '08:20', 45)
    persa.stato = 'annullata'
    registro.lezioni.push(fatta, buco, adesso, futura, persa)

    const mucchi = raggruppaOre(registro, registro.lezioni, OGGI, '08:30')

    assert.deepEqual(mucchi.svolte.map((l) => l.id), [fatta.id])
    assert.deepEqual(mucchi.daChiudere.map((l) => l.id), [buco.id])
    assert.deepEqual(mucchi.inCorso.map((l) => l.id), [adesso.id])
    assert.deepEqual(mucchi.prossime.map((l) => l.id), [futura.id])
    assert.deepEqual(mucchi.annullate.map((l) => l.id), [persa.id])

    const totale =
      mucchi.svolte.length + mucchi.daChiudere.length + mucchi.inCorso.length +
      mucchi.prossime.length + mucchi.annullate.length
    assert.equal(totale, 5, 'nessuna ora persa né contata due volte')
  })

  it('le svolte tornano dalla più recente, le prossime dalla più vicina', () => {
    const { registro, corso, rossi, bianchi, verdi } = scuola()
    const vecchie = ['2026-10-05', '2026-10-12'].map((data) => {
      const l = creaLezione(corso.id, data, '08:20', 45)
      l.stato = 'svolta'
      conAppello(l, [rossi, bianchi, verdi])
      return l
    })
    const nuove = ['2026-10-26', '2026-11-02'].map((data) =>
      creaLezione(corso.id, data, '08:20', 45),
    )
    registro.lezioni.push(...vecchie, ...nuove)

    const mucchi = raggruppaOre(registro, registro.lezioni, OGGI)

    assert.deepEqual(
      mucchi.svolte.map((l) => l.data),
      ['2026-10-12', '2026-10-05'],
      'all’indietro: «che cosa ho fatto l’altra volta»',
    )
    assert.deepEqual(
      mucchi.prossime.map((l) => l.data),
      ['2026-10-26', '2026-11-02'],
      'in avanti: l’ordine in cui si vive',
    )
  })

  it('senza ore i mucchi ci sono lo stesso, vuoti', () => {
    const { registro } = scuola()

    const mucchi = raggruppaOre(registro, [], OGGI)

    assert.deepEqual(mucchi.svolte, [])
    assert.deepEqual(mucchi.daChiudere, [])
    assert.deepEqual(mucchi.inCorso, [])
    assert.deepEqual(mucchi.prossime, [])
  })
})
