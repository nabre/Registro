// Quali documenti una modifica rende vecchi.
//
// La prova che conta è che non si rifaccia né troppo né troppo poco: rifare
// tutto a ogni tasto vorrebbe dire un registro che scrive su disco invece di
// rispondere, e rifare niente vorrebbe dire una cartella che dice una cosa
// mentre il registro ne sa un'altra — che è peggio, perché un PDF vecchio non
// ha l'aria di essere vecchio.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  IMPOSTAZIONI_PREDEFINITE,
  corsiDaRifare,
  creaAllievo,
  creaAnno,
  creaLezione,
  normalizzaImpostazioni,
  normalizzaRegistro,
} from '../dist-prove/dominio.mjs'

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
    // Cambiargli il cognome rifà la sua riga su ogni foglio di ogni materia:
    // rifarne una sola lascerebbe in giro il nome vecchio.
    assert.deepEqual(corsiDaRifare(registro, { allievoId: 'al-1' }).sort(), ['cor-1', 'cor-2'])
    assert.deepEqual(corsiDaRifare(registro, { classeId: 'cl-2' }), ['cor-3'])
  })

  it('quel che non parla di un corso non fa rifare niente', () => {
    // Le impostazioni, la proiezione, un documento del fascicolo: passano dal
    // centralino come tutto il resto, e non devono far partire venti PDF.
    assert.deepEqual(corsiDaRifare(registro, {}), [])
  })

  it('un id che non esiste non vuol dire «tutti»', () => {
    // Eliminando una lezione l'id arriva qui quando quella lezione non c'è
    // più: rifare l'intero anno per prudenza sarebbe la reazione sbagliata.
    assert.deepEqual(corsiDaRifare(registro, { lezioneId: 'sparita' }), [])
    assert.deepEqual(corsiDaRifare(registro, { corsoId: 'sparito' }), [])
    assert.deepEqual(corsiDaRifare(registro, { allievoId: 'sparito' }), [])
  })

  it('il corso vince sugli altri riferimenti', () => {
    // Un'azione che porta corso e allievo insieme — un voto, una presenza —
    // parla di quel corso: allargare a tutta la classe rifarebbe anche le
    // materie che non c'entrano.
    assert.deepEqual(corsiDaRifare(registro, { corsoId: 'cor-1', allievoId: 'al-1' }), ['cor-1'])
  })
})

describe('la regola con cui i PDF si rifanno', () => {
  it('di serie i documenti seguono i dati', () => {
    assert.equal(IMPOSTAZIONI_PREDEFINITE.pdfAutomatici, 'sempre')
  })

  it('un valore storto torna al predefinito, non spegne l’automazione', () => {
    // Un file scritto a mano con un refuso non deve lasciare la cartella ferma
    // senza dirlo a nessuno: il silenzio è il modo in cui questa cosa si
    // rompe.
    assert.equal(normalizzaImpostazioni({ pdfAutomatici: 'quando mi va' }).pdfAutomatici, 'sempre')
    assert.equal(normalizzaImpostazioni({}).pdfAutomatici, 'sempre')
  })

  it('una scelta buona si tiene', () => {
    assert.equal(normalizzaImpostazioni({ pdfAutomatici: 'mai' }).pdfAutomatici, 'mai')
    assert.equal(normalizzaImpostazioni({ pdfAutomatici: 'chiusura' }).pdfAutomatici, 'chiusura')
  })
})
