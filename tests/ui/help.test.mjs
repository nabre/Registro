// I contenuti della guida si tengono insieme: un «Vedi anche» verso una sezione
// rinominata, una legenda con un numero in meno dei bollini, un `**` spaiato
// non fermano niente e si scoprirebbero solo aprendo la pagina.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { GUIDA, PARTI } from '../../dist-tests/help.mjs'

/** Tutti i testi di una sezione che passano da `testoRicco`. */
function testi (sezione) {
  return [
    sezione.sommario,
    ...sezione.voci.flatMap((voce) => [voce.termine, voce.testo]),
    ...(sezione.note ?? []).map((nota) => nota.testo),
    ...(sezione.figure ?? []).flatMap((figura) => [figura.didascalia, ...(figura.legenda ?? [])]),
  ]
}

describe('la guida', () => {
  it('ha sezioni con id unici, in parti che esistono', () => {
    const visti = new Set()
    for (const sezione of GUIDA) {
      assert.ok(!visti.has(sezione.id), `id ripetuto: ${sezione.id}`)
      visti.add(sezione.id)
      assert.ok(PARTI.includes(sezione.parte), `${sezione.id}: parte sconosciuta «${sezione.parte}»`)
      assert.ok(sezione.voci.length > 0, `${sezione.id}: nessuna voce`)
    }
  })

  it('rimanda solo a sezioni che esistono, e mai a sé', () => {
    const ids = new Set(GUIDA.map((sezione) => sezione.id))
    for (const sezione of GUIDA) {
      for (const id of sezione.vedi ?? []) {
        assert.ok(ids.has(id), `${sezione.id}: «Vedi anche» punta a «${id}», che non c'è`)
        assert.notEqual(id, sezione.id, `${sezione.id}: rimanda a sé`)
      }
    }
  })

  it('chiude ogni grassetto e ogni codice', () => {
    for (const sezione of GUIDA) {
      for (const testo of testi(sezione)) {
        const senzaCodice = testo.replace(/`[^`]*`/g, '')
        assert.equal((testo.match(/`/g) ?? []).length % 2, 0, `${sezione.id}: backtick spaiato in «${testo.slice(0, 60)}…»`)
        assert.equal((senzaCodice.match(/\*\*/g) ?? []).length % 2, 0, `${sezione.id}: grassetto spaiato in «${testo.slice(0, 60)}…»`)
      }
    }
  })

  it('ha figure ben formate, con una riga di legenda per bollino', () => {
    for (const sezione of GUIDA) {
      for (const [indice, figura] of (sezione.figure ?? []).entries()) {
        const dove = `${sezione.id}, figura ${indice + 1}`
        assert.match(figura.vista, /^0 0 \d+(\.\d+)? \d+(\.\d+)?$/, `${dove}: viewBox «${figura.vista}»`)
        assert.ok(figura.disegno.length > 0, `${dove}: disegno vuoto`)
        assert.ok(figura.didascalia.trim().length > 0, `${dove}: senza didascalia`)
        assert.doesNotMatch(figura.disegno, /<script|on\w+=/i, `${dove}: codice nel disegno`)

        // Ogni tag aperto si chiude: `<text>…</text>`, `<g>…</g>`.
        const pila = []
        for (const [, chiude, nome, auto] of figura.disegno.matchAll(/<(\/?)([a-z]+)[^>]*?(\/?)>/g)) {
          if (auto) continue
          if (chiude) assert.equal(pila.pop(), nome, `${dove}: </${nome}> fuori posto`)
          else pila.push(nome)
        }
        assert.deepEqual(pila, [], `${dove}: tag non chiusi`)

        const bollini = [...figura.disegno.matchAll(/class="gd-bollino-numero">(\d+)</g)].map((m) => Number(m[1]))
        const massimo = bollini.length ? Math.max(...bollini) : 0
        assert.equal(figura.legenda?.length ?? 0, massimo, `${dove}: ${massimo} bollini, ${figura.legenda?.length ?? 0} righe di legenda`)
      }
    }
  })

  it('porta a ogni pagina del registro', () => {
    // «allievo» è la scheda di una persona (ci si arriva da un nome, e la racconta
    // la sezione della scheda); «guida» è questa.
    const coperte = new Set(GUIDA.map((sezione) => sezione.vista).filter(Boolean))
    for (const vista of ['oggi', 'calendario', 'todo', 'daSmistare', 'lezione', 'classi', 'persone', 'docenteClasse',
      'corsi', 'piani', 'valutazioni', 'check', 'documenti', 'modelli', 'modelliLinguistici', 'mappa',
      'impostazioni']) {
      assert.ok(coperte.has(vista), `nessuna sezione porta alla pagina «${vista}»`)
    }
  })
})

describe('la ricerca nella guida', async () => {
  const { cerca, forseCercavi, migliori, paroleDi } = await import('../../dist-tests/help.mjs')

  it('non distingue accenti, maiuscole e plurali', () => {
    assert.deepEqual(paroleDi('Valutazioni'), paroleDi('valutazione'))
    assert.deepEqual(paroleDi('perché'), paroleDi('perche'))
  })

  it('trova con le parole di chi cerca: «voto» trova le valutazioni', () => {
    const risultato = cerca(GUIDA, 'voto')
    assert.ok(risultato.sezioni.some(({ sezione }) => sezione.id === 'valutazioni'))
  })

  it('trova «allievo» dove la guida dice persona in formazione', () => {
    assert.ok(cerca(GUIDA, 'allievo').sezioni.some(({ sezione }) => sezione.id === 'scheda'))
  })

  it('riduce i verbi alla radice: «proiettare» trova la proiezione', () => {
    assert.equal(cerca(GUIDA, 'proiettare').sezioni[0]?.sezione.id, 'proiezione')
  })

  it('non allunga le radici corte oltre la desinenza: «prova» non trova «provvisoria»', async () => {
    const { rispondeA } = await import('../../dist-tests/help.mjs')
    assert.ok(rispondeA('prove', 'prov'))
    assert.ok(!rispondeA('provvisoria', 'prov'))
  })

  it('mette prima la sezione che ha la parola nel titolo', () => {
    const [prima] = cerca(GUIDA, 'scorciatoie').sezioni
    assert.equal(prima.sezione.id, 'scorciatoie')
  })

  it('vuole tutte le parole, non una qualsiasi', () => {
    const una = cerca(GUIDA, 'assenza').sezioni.length
    const due = cerca(GUIDA, 'assenza zebra').sezioni.length
    assert.ok(una > 0)
    assert.equal(due, 0)
  })

  it('senza parole risponde tutta la guida, in ordine', () => {
    const risultato = cerca(GUIDA, '   ')
    const ids = risultato.sezioni.map(({ sezione }) => sezione.id)
    assert.deepEqual(ids, GUIDA.map((sezione) => sezione.id))
  })

  it('propone la correzione di una parola sbagliata di una lettera', () => {
    const risultato = cerca(GUIDA, 'calendaio')
    assert.equal(risultato.sezioni.length, 0)
    assert.equal(risultato.forse, 'calendario')
    assert.equal(forseCercavi(GUIDA, 'qwxyzk'), undefined)
  })

  it('dà le risposte migliori in ordine di punteggio', () => {
    const prime = migliori(cerca(GUIDA, 'appello'), 3)
    assert.ok(prime.length > 0 && prime.length <= 3)
  })
})
