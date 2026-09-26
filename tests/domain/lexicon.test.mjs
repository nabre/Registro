// Il lessico: le parole del registro si cambiano in un posto solo, e quel che
// ne esce è italiano. Articoli e accordi seguono il termine, e le sigle
// dell'appello e i tipi di attività sono gli stessi che il resto del registro
// pubblica.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  NOMI_TIPO_ATTIVITA,
  SIGLE_PRESENZA,
  creaLezione,
  lessico,
  normalizzaRegistro,
} from '../../dist-tests/domain.mjs'

const { PIF, PERSONE, LEZIONE, SCUOLA, VALUTAZIONE } = lessico

describe('gli articoli seguono la parola', () => {
  it('il femminile che comincia per consonante prende «la»', () => {
    assert.equal(lessico.il(PIF), 'la persona in formazione')
    assert.equal(lessico.i(PIF), 'le persone in formazione')
  })

  it('la vocale iniziale prende l’apostrofo, senza spazio dopo', () => {
    assert.equal(lessico.il(PERSONE.azienda), 'l’azienda formatrice')
    assert.equal(lessico.un(PERSONE.azienda), 'un’azienda formatrice')
    assert.equal(lessico.il(SCUOLA.annoScolastico), 'l’anno scolastico')
  })

  it('la s impura vuole «lo» e «uno», non «il» e «un»', () => {
    const scrutinio = { singolare: 'scrutinio', plurale: 'scrutini', genere: 'm' }
    assert.equal(lessico.il(scrutinio), 'lo scrutinio')
    assert.equal(lessico.i(scrutinio), 'gli scrutini')
    assert.equal(lessico.un(scrutinio), 'uno scrutinio')
  })

  it('le preposizioni articolate escono già unite', () => {
    assert.equal(lessico.del(PIF), 'della persona in formazione')
    assert.equal(lessico.dei(PIF), 'delle persone in formazione')
    assert.equal(lessico.al(PIF), 'alla persona in formazione')
    assert.equal(lessico.del(SCUOLA.annoScolastico), 'dell’anno scolastico')
    assert.equal(lessico.al(SCUOLA.corso), 'al corso')
    assert.equal(lessico.con(LEZIONE.lezione, { preposizione: 'in' }), 'nella lezione')
  })
})

describe('gli accordi seguono il genere del termine', () => {
  it('l’aggettivo in -o si accorda in tutte e quattro le forme', () => {
    assert.equal(lessico.accorda(PIF, 'trovato'), 'trovata')
    assert.equal(lessico.accorda(PIF, 'trovato', true), 'trovate')
    assert.equal(lessico.accorda(SCUOLA.corso, 'trovato'), 'trovato')
    assert.equal(lessico.accorda(SCUOLA.corso, 'trovato', true), 'trovati')
  })

  it('quello in -e cambia solo al plurale, e l’invariabile non cambia mai', () => {
    assert.equal(lessico.accorda(PIF, 'presente'), 'presente')
    assert.equal(lessico.accorda(PIF, 'presente', true), 'presenti')
    assert.equal(lessico.accorda(PIF, 'blu'), 'blu')
  })

  it('la frase di risposta si scrive da sé, negazione e coda comprese', () => {
    assert.equal(lessico.frase(PIF, 'trovato', { nega: true }), 'Persona in formazione non trovata.')
    assert.equal(
      lessico.frase(PIF, 'trovato', { nega: true, coda: 'nella classe' }),
      'Persona in formazione non trovata nella classe.',
    )
    assert.equal(lessico.frase(PIF, 'aggiunto'), 'Persona in formazione aggiunta.')
  })

  it('cambiando genere al termine, la frase si riallinea da sé', () => {
    // Si cambia «persona in formazione» in «allievo» con `genere: 'm'`, e le frasi
    // tornano giuste da sole.
    const allievo = { singolare: 'allievo', plurale: 'allievi', genere: 'm', breve: 'Allievo' }
    assert.equal(lessico.frase(allievo, 'trovato', { nega: true }), 'Allievo non trovato.')
    assert.equal(lessico.il(allievo), 'l’allievo')
    assert.equal(lessico.dei(allievo), 'degli allievi')
  })
})

describe('il numero con la parola giusta', () => {
  it('uno va al singolare, zero e gli altri al plurale', () => {
    assert.equal(lessico.quanti(1, PIF), '1 persona in formazione')
    assert.equal(lessico.quanti(3, PIF), '3 persone in formazione')
    assert.equal(lessico.quanti(0, PIF), '0 persone in formazione')
  })

  it('la forma corta è quella dichiarata, o il singolare quando non c’è', () => {
    assert.equal(lessico.corto(PIF), 'PiF')
    assert.equal(lessico.corto(LEZIONE.unitaDidattica), 'UD')
    assert.equal(lessico.corto(VALUTAZIONE.prova), 'prova')
  })
})

describe('un elenco solo per ogni cosa', () => {
  it('le sigle dell’appello sono quelle del lessico', () => {
    assert.deepEqual(SIGLE_PRESENZA, lessico.STATI_PRESENZA)
  })

  it('i nomi dei tipi di attività sono quelli del lessico', () => {
    assert.deepEqual(NOMI_TIPO_ATTIVITA, lessico.TIPI_ATTIVITA)
  })

  it('ogni termine dichiara singolare, plurale e genere', () => {
    const gruppi = [PERSONE, SCUOLA, LEZIONE, VALUTAZIONE, lessico.CARTE]
    for (const [nome, termine] of gruppi.flatMap((gruppo) => Object.entries(gruppo))) {
      assert.ok(termine.singolare, `${nome} senza singolare`)
      assert.ok(termine.plurale, `${nome} senza plurale`)
      assert.ok(termine.genere === 'm' || termine.genere === 'f', `${nome} senza genere`)
    }
  })
})

describe('gli stati dell’appello sopravvivono a un giro di lettura', () => {
  // La convalida di `validation.ts` prende gli stati da `chiaviDi(VOCI_PRESENZA)`:
  // la prova gira su **tutti** quelli del dizionario, così uno nuovo non viene
  // riletto come «non impostato».
  for (const { valore } of lessico.STATI_PRESENZA) {
    it(`«${valore}» si rilegge com’era`, () => {
      const lezione = creaLezione('cor-1', '2026-10-05', '08:00', 45)
      lezione.presenze = [{ allievoId: 'alv-1', stati: [valore] }]
      const riletto = normalizzaRegistro({
        corsi: [{ id: 'cor-1', classeId: 'cls-1', materiaId: 'mat-1', titolo: 'Corso' }],
        lezioni: [lezione],
      })
      assert.deepEqual(riletto.lezioni[0].presenze[0].stati, [valore])
    })
  }

  it('uno stato che il registro non conosce non diventa «presente»', () => {
    const lezione = creaLezione('cor-1', '2026-10-05', '08:00', 45)
    lezione.presenze = [{ allievoId: 'alv-1', stati: ['inventato'] }]
    const riletto = normalizzaRegistro({
      corsi: [{ id: 'cor-1', classeId: 'cls-1', materiaId: 'mat-1', titolo: 'Corso' }],
      lezioni: [lezione],
    })
    assert.deepEqual(riletto.lezioni[0].presenze[0].stati, ['non-impostato'])
  })
})
