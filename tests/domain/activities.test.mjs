// I parametri di un'attività e la prova che una tappa prevede. Ogni tipo
// chiede quel che serve a lui; il riassunto mostra solo quel che è riempito, e
// un valore scritto sotto un altro tipo resta quando il tipo cambia.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  attivitaValutata,
  creaAttivita,
  normalizzaPiano,
  parametriDi,
  riassuntoParametri,
  valoreParametro,
} from '../../dist-tests/domain.mjs'

function attivita (tipo, parametri) {
  return { ...creaAttivita('Tappa', 20), tipo, parametri }
}

describe('i parametri dipendono dal tipo', () => {
  it('ogni tipo chiede quel che serve a lui', () => {
    assert.ok(parametriDi('gruppo').some((p) => p.chiave === 'dimensione'))
    assert.ok(parametriDi('verifica').some((p) => p.chiave === 'punti'))
    // Alla spiegazione la grandezza dei gruppi non si chiede.
    assert.equal(parametriDi('spiegazione').some((p) => p.chiave === 'dimensione'), false)
    assert.deepEqual(parametriDi('altro'), [])
  })

  it('il riassunto dice solo quel che è stato riempito', () => {
    const gruppo = attivita('gruppo', { dimensione: 3, composizione: 'sorteggio' })
    assert.equal(riassuntoParametri(gruppo), 'grandezza dei gruppi 3 per gruppo · a sorteggio')

    // Niente di riempito, niente da dire.
    assert.equal(riassuntoParametri(attivita('gruppo', undefined)), '')
  })

  it('un sì/no compare solo quando è sì', () => {
    assert.equal(riassuntoParametri(attivita('laboratorio', { sicurezza: false })), '')
    assert.equal(
      riassuntoParametri(attivita('laboratorio', { sicurezza: true })),
      'istruzioni di sicurezza',
    )
  })

  it('quel che è stato scritto sotto un altro tipo resta, e tace', () => {
    // Cambiare tipo per sbaglio non cancella niente: il valore resta nel file e
    // smette di comparire.
    const cambiata = { ...attivita('gruppo', { dimensione: 3 }), tipo: 'spiegazione' }
    assert.equal(riassuntoParametri(cambiata), '')
    assert.equal(valoreParametro(cambiata, 'dimensione'), 3)
  })

  it('la normalizzazione tiene solo valori che un campo sa mostrare', () => {
    const piano = normalizzaPiano({
      titolo: 'Le disequazioni',
      attivita: [
        {
          titolo: 'Lavoro di gruppo',
          tipo: 'gruppo',
          parametri: { dimensione: 3, composizione: 'liberi', strano: { a: 1 }, elenco: [1, 2] },
        },
      ],
    })

    assert.deepEqual(piano.attivita[0].parametri, { dimensione: 3, composizione: 'liberi' })
  })
})

describe('la tappa che si valuta', () => {
  it('lo dice la valutazione prevista, non il tipo', () => {
    // Una verifica senza valutazione prevista non fa media, e non se ne inventa
    // una.
    assert.equal(attivitaValutata(attivita('verifica', undefined)), false)

    const conProva = {
      ...creaAttivita('Test finale', 30),
      tipo: 'verifica',
      valutazione: { titolo: 'Test finale', tipo: 'scritto', peso: 2 },
    }
    assert.equal(attivitaValutata(conProva), true)
  })

  it('sopravvive alla lettura del file', () => {
    const piano = normalizzaPiano({
      titolo: 'Verifica di metà semestre',
      attivita: [
        {
          titolo: 'Prova scritta',
          tipo: 'verifica',
          valutazione: { titolo: 'Prova scritta', tipo: 'scritto', peso: 2 },
        },
      ],
    })

    assert.equal(attivitaValutata(piano.attivita[0]), true)
    assert.equal(piano.attivita[0].valutazione.peso, 2)
  })
})

describe('la valutazione che stava sul piano', () => {
  // La prova è una tappa della scaletta: i piani con la casella «valutazione
  // prevista» a livello di piano si rileggono così, senza perdere niente.

  it('si posa sulla tappa che era la verifica', () => {
    const piano = normalizzaPiano({
      attivita: [
        { titolo: 'Ripasso', tipo: 'ripasso' },
        { titolo: 'Prova', tipo: 'verifica' },
      ],
      valutazione: { titolo: 'Verifica sulle proporzioni', tipo: 'scritto', peso: 2 },
    })

    assert.equal(piano.attivita.length, 2)
    assert.equal(attivitaValutata(piano.attivita[1]), true)
    assert.equal(piano.attivita[1].valutazione.titolo, 'Verifica sulle proporzioni')
    assert.equal(piano.attivita[1].valutazione.peso, 2)
    assert.equal(piano.valutazione, undefined)
  })

  it('se nella scaletta non c’è nessuna verifica, la tappa si aggiunge in fondo', () => {
    // Una prova senza riga nella scaletta non sparisce dal piano.
    const piano = normalizzaPiano({
      attivita: [{ titolo: 'Spiegazione', tipo: 'spiegazione' }],
      valutazione: { titolo: 'Interrogazione', tipo: 'orale', peso: 1 },
    })

    assert.equal(piano.attivita.length, 2)
    assert.equal(piano.attivita[1].tipo, 'verifica')
    assert.equal(piano.attivita[1].titolo, 'Interrogazione')
    assert.equal(attivitaValutata(piano.attivita[1]), true)
  })

  it('non tocca niente se la scaletta dichiara già le sue prove', () => {
    // La tappa scelta nella scaletta vale più della casella del piano.
    const piano = normalizzaPiano({
      attivita: [
        {
          titolo: 'Test d’ingresso',
          tipo: 'verifica',
          valutazione: { titolo: 'Test d’ingresso', tipo: 'scritto', peso: 0.5 },
        },
      ],
      valutazione: { titolo: 'Verifica finale', tipo: 'scritto', peso: 3 },
    })

    assert.equal(piano.attivita.length, 1)
    assert.equal(piano.attivita[0].valutazione.titolo, 'Test d’ingresso')
    assert.equal(piano.attivita[0].valutazione.peso, 0.5)
  })

  it('un piano senza valutazione resta com’era', () => {
    const piano = normalizzaPiano({ attivita: [{ titolo: 'Esercizi', tipo: 'esercizio' }] })
    assert.equal(piano.attivita.length, 1)
    assert.equal(piano.attivita.some(attivitaValutata), false)
  })
})
