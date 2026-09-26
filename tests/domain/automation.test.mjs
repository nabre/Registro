// Quali documenti una modifica rende vecchi: né troppo (un registro che scrive
// su disco invece di rispondere) né troppo poco (un PDF vecchio non ha l'aria
// di esserlo).

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  IMPOSTAZIONI_PREDEFINITE,
  corsiDaRifare,
  giornoDaRifare,
  creaAllievo,
  creaAnno,
  creaLezione,
  normalizzaImpostazioni,
  normalizzaRegistro,
} from '../../dist-tests/domain.mjs'

/** Una classe con due corsi, due allievi e un'ora: il minimo per distinguere. */
function registroCon () {
  const anno = creaAnno('2026-09-01', '2027-06-30', '2026/27', '2027-01-31')
  anno.id = 'a1'

  const lezione = creaLezione('cor-1', '2026-10-06', '08:00', 90)
  lezione.id = 'lez-1'

  return normalizzaRegistro({
    anni: [anno],
    annoCorrenteId: 'a1',
    materie: [
      { id: 'mat-1', nome: 'Calcolo professionale' },
      { id: 'mat-2', nome: 'Disegno' },
    ],
    classi: [
      {
        id: 'cl-1',
        annoId: 'a1',
        nome: 'DIC2',
        allievi: [
          { ...creaAllievo('Rossi', 'Anna'), id: 'al-1' },
          { ...creaAllievo('Bianchi', 'Luca'), id: 'al-2' },
        ],
      },
      { id: 'cl-2', annoId: 'a1', nome: 'DIC4a', allievi: [] },
    ],
    corsi: [
      { id: 'cor-1', classeId: 'cl-1', materiaId: 'mat-1', titolo: 'CP — DIC2' },
      { id: 'cor-2', classeId: 'cl-1', materiaId: 'mat-2', titolo: 'DIS — DIC2' },
      { id: 'cor-3', classeId: 'cl-2', materiaId: 'mat-1', titolo: 'CP — DIC4a' },
    ],
    lezioni: [lezione],
    valutazioni: [
      {
        id: 'val-1',
        corsoId: 'cor-2',
        lezioneId: null,
        titolo: 'Test',
        tipo: 'scritto',
        data: '2026-10-20',
        peso: 1,
        scala: IMPOSTAZIONI_PREDEFINITE.scala,
        voti: [],
        creatoIl: '',
        aggiornatoIl: '',
      },
    ],
    impostazioni: IMPOSTAZIONI_PREDEFINITE,
  })
}

describe('quali documenti una modifica rende vecchi', () => {
  const registro = registroCon()

  it('il corso detto per nome è quello e basta', () => {
    assert.deepEqual(corsiDaRifare(registro, { corsoId: 'cor-1' }), ['cor-1'])
  })

  it('una lezione e una valutazione portano al loro corso', () => {
    assert.deepEqual(corsiDaRifare(registro, { lezioneId: 'lez-1' }), ['cor-1'])
    assert.deepEqual(corsiDaRifare(registro, { valutazioneId: 'val-1' }), ['cor-2'])
  })

  it('un allievo tocca tutte le materie della sua classe, e nessun’altra', () => {
    // Un cognome cambiato rifà la sua riga su ogni foglio di ogni materia.
    assert.deepEqual(corsiDaRifare(registro, { allievoId: 'al-1' }).sort(), ['cor-1', 'cor-2'])
    assert.deepEqual(corsiDaRifare(registro, { classeId: 'cl-2' }), ['cor-3'])
  })

  it('quel che non parla di un corso non fa rifare niente', () => {
    // Impostazioni, proiezione, un documento del fascicolo: non fanno partire PDF.
    assert.deepEqual(corsiDaRifare(registro, {}), [])
  })

  it('un id che non esiste non vuol dire «tutti»', () => {
    // Una lezione eliminata arriva qui quando non c'è più: non si rifà l'anno per
    // prudenza.
    assert.deepEqual(corsiDaRifare(registro, { lezioneId: 'sparita' }), [])
    assert.deepEqual(corsiDaRifare(registro, { corsoId: 'sparito' }), [])
    assert.deepEqual(corsiDaRifare(registro, { allievoId: 'sparito' }), [])
  })

  it('il corso vince sugli altri riferimenti', () => {
    // Corso e allievo insieme parlano di quel corso: non si allarga alla classe.
    assert.deepEqual(corsiDaRifare(registro, { corsoId: 'cor-1', allievoId: 'al-1' }), ['cor-1'])
  })
})

describe('di quale giorno parla una modifica', () => {
  const registro = registroCon()

  it('una lezione e una valutazione portano la loro data', () => {
    // Il giorno sceglie il periodo: un voto di ottobre corretto a marzo rifà la
    // griglia del primo semestre.
    assert.equal(giornoDaRifare(registro, { lezioneId: 'lez-1' }), '2026-10-06')
    assert.equal(giornoDaRifare(registro, { valutazioneId: 'val-1' }), '2026-10-20')
  })

  it('quel che non ha una data non ne inventa una', () => {
    // Un cognome vale per l'anno intero: nessuna data, e chi chiama ripiega su
    // oggi.
    assert.equal(giornoDaRifare(registro, { corsoId: 'cor-1' }), null)
    assert.equal(giornoDaRifare(registro, { allievoId: 'al-1' }), null)
    assert.equal(giornoDaRifare(registro, { lezioneId: 'sparita' }), null)
    assert.equal(giornoDaRifare(registro, {}), null)
  })
})

describe('la regola con cui i PDF si rifanno', () => {
  it('di serie i documenti seguono i dati', () => {
    assert.equal(IMPOSTAZIONI_PREDEFINITE.pdfAutomatici, 'sempre')
  })

  it('un valore storto torna al predefinito, non spegne l’automazione', () => {
    // Un valore storto scritto a mano torna al predefinito, non ferma la cartella
    // in silenzio.
    assert.equal(normalizzaImpostazioni({ pdfAutomatici: 'quando mi va' }).pdfAutomatici, 'sempre')
    assert.equal(normalizzaImpostazioni({}).pdfAutomatici, 'sempre')
  })

  it('una scelta buona si tiene', () => {
    assert.equal(normalizzaImpostazioni({ pdfAutomatici: 'mai' }).pdfAutomatici, 'mai')
    assert.equal(normalizzaImpostazioni({ pdfAutomatici: 'chiusura' }).pdfAutomatici, 'chiusura')
  })
})
