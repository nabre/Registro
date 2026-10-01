// Un giro di rapporti scrive molti PDF, uno alla volta, e ognuno si compone in
// più del ritardo del salvataggio: senza trattenerlo, ogni foglio farebbe un
// salvataggio a sé, e ognuno riscrive l'indice centrale del `.regi` (sulla
// cartella sincronizzata, un caricamento intero a ogni foglio). I file
// depositati dentro `salvaAllaFine` aspettano la fine del giro; le modifiche ai
// dati no, e il tetto dalla prima modifica vale ancora.
//
// Il tempo è finto (`mock.timers`): fra un foglio e l'altro passa più del
// ritardo senza aspettarlo davvero.

import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, describe, it, mock } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-salvataggi-rapporti-')

/** Più di `RITARDO_SALVATAGGIO_MS`: un foglio composto con calma. */
const FRA_UN_FOGLIO_E_L_ALTRO = 400

let api
let archivio
let corso
/** I salvataggi partiti con qualcosa da scrivere. */
let salvataggi = 0

before(async () => {
  ;({ api, archivio } = await archivioDiProva({ lavoro, dati, deposito: true, pdfAutomatici: 'mai' }))

  const { creaAllievo, creaClasse, creaCorso, creaLezione, creaMateria } = api
  const anno = archivio.registro.anni[0]
  const classe = creaClasse(anno.id, 'I MEC A')
  classe.allievi.push(creaAllievo('Rossi', 'Maria'), creaAllievo('Bianchi', 'Luca'))
  const matematica = creaMateria('Matematica')
  corso = creaCorso(classe.id, matematica.id, 'I MEC A — Matematica')
  const lezione = { ...creaLezione(corso.id, '2026-09-08', '08:20', 90), stato: 'svolta' }

  archivio.modifica((r) => {
    r.classi.push(classe)
    r.materie.push(matematica)
    r.corsi.push(corso)
    r.lezioni.push(lezione)
  }, ['classi', 'corsi', 'lezioni', 'registro'])
  await archivio.salva()
  // Il timer della modifica è vero, non finto: lo si lascia scadere, o
  // scatterebbe in mezzo a una prova.
  await new Promise((fatto) => setTimeout(fatto, 500))

  // `salva` è la strada del timer: si contano quelle con qualcosa da scrivere.
  const salva = archivio.salva.bind(archivio)
  archivio.salva = () => {
    if (archivio.statoSalvataggio.inSospeso) salvataggi += 1
    return salva()
  }
})

after(async () => {
  await api?.fermaRapporti()
  smonta(radice, archivio)
})

beforeEach(() => {
  salvataggi = 0
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: Date.now() })
})

afterEach(async () => {
  // Quel che resta in attesa scatta adesso, finché il tempo è ancora finto.
  mock.timers.tick(5000)
  await respira()
  mock.timers.reset()
  await archivio.salva()
})

/** Un file nel documento, come lo scrive `scriviGenerato`. */
function deposita (nome) {
  archivio.deposito.scrivi(`esportazioni/prova/${nome}.pdf`, new TextEncoder().encode(nome))
}

/** Lascia girare le promesse già pronte (la coda dell'archivio). */
async function respira () {
  for (let i = 0; i < 5; i += 1) await new Promise((fatto) => setImmediate(fatto))
}

describe('un giro di rapporti fa un salvataggio solo', () => {
  it('«Aggiorna tutto» con fogli lenti: nessun salvataggio a metà, uno alla fine', async () => {
    // Ogni foglio depositato fa passare più del ritardo, come un PDF vero.
    const scrivi = archivio.deposito.scrivi
    let fogli = 0
    archivio.deposito.scrivi = function (...argomenti) {
      const fatto = scrivi.apply(this, argomenti)
      fogli += 1
      mock.timers.tick(FRA_UN_FOGLIO_E_L_ALTRO)
      return fatto
    }
    try {
      const esito = await api.esegui(archivio, {
        tipo: 'rapporto.completo',
        corsoId: corso.id,
        semestreId: null,
      })
      assert.ok(esito.ok, JSON.stringify(esito))
    } finally {
      archivio.deposito.scrivi = scrivi
    }
    assert.ok(fogli >= 5, `fogli scritti: ${fogli}`)
    assert.equal(salvataggi, 0, `salvataggi durante il giro di ${fogli} fogli`)

    mock.timers.tick(FRA_UN_FOGLIO_E_L_ALTRO)
    await respira()
    assert.equal(salvataggi, 1)
  })

  it('i file depositati restano trattenuti anche oltre il tetto, fino alla fine', async () => {
    await archivio.salvaAllaFine(async () => {
      for (let i = 0; i < 8; i += 1) {
        deposita(`foglio-${i}`)
        mock.timers.tick(FRA_UN_FOGLIO_E_L_ALTRO)
        await respira()
      }
    })
    assert.equal(salvataggi, 0)
    mock.timers.tick(FRA_UN_FOGLIO_E_L_ALTRO)
    await respira()
    assert.equal(salvataggi, 1)
  })

  it('una modifica ai dati durante il giro si salva col suo ritardo', async () => {
    await archivio.salvaAllaFine(async () => {
      deposita('prima')
      archivio.modifica((r) => { r.impostazioni.pdfAutomatici = 'chiusura' }, ['registro'])
      mock.timers.tick(FRA_UN_FOGLIO_E_L_ALTRO)
      await respira()
      // Il salvataggio della modifica porta con sé anche il foglio.
      assert.equal(salvataggi, 1)
      deposita('dopo')
    })
    mock.timers.tick(FRA_UN_FOGLIO_E_L_ALTRO)
    await respira()
    assert.equal(salvataggi, 2)
  })

  it('modifiche ai dati senza pause durante il giro: il tetto le scrive lo stesso', async () => {
    await archivio.salvaAllaFine(async () => {
      // Una battuta ogni 300 ms rinnova il ritardo: scrive solo il tetto (2 s).
      for (let i = 0; i < 8; i += 1) {
        deposita(`foglio-${i}`)
        archivio.modifica((r) => { r.impostazioni.pdfAutomatici = i % 2 ? 'mai' : 'chiusura' }, ['registro'])
        mock.timers.tick(300)
        await respira()
      }
      assert.equal(salvataggi, 1)
    })
  })

  it('un giro che fallisce non lascia il salvataggio trattenuto', async () => {
    await assert.rejects(archivio.salvaAllaFine(async () => {
      deposita('rotto')
      throw new Error('composizione fallita')
    }), /composizione fallita/)
    mock.timers.tick(FRA_UN_FOGLIO_E_L_ALTRO)
    await respira()
    assert.equal(salvataggi, 1)

    // Fuori dal giro un file si salva da sé.
    deposita('fuori')
    mock.timers.tick(FRA_UN_FOGLIO_E_L_ALTRO)
    await respira()
    assert.equal(salvataggi, 2)
  })

  it('un giro dentro un giro: si salva alla fine di quello esterno', async () => {
    await archivio.salvaAllaFine(async () => {
      await archivio.salvaAllaFine(async () => { deposita('dentro') })
      mock.timers.tick(FRA_UN_FOGLIO_E_L_ALTRO)
      await respira()
      assert.equal(salvataggi, 0)
      deposita('fuori')
    })
    mock.timers.tick(FRA_UN_FOGLIO_E_L_ALTRO)
    await respira()
    assert.equal(salvataggi, 1)
  })

  it('un file depositato da un altro lavoro durante il giro non aspetta il giro', async () => {
    let finisci
    const giro = archivio.salvaAllaFine(() => new Promise((fatto) => { finisci = fatto }))
    // Un gesto dell'utente (un allegato) arriva da fuori, mentre il giro è aperto.
    deposita('allegato')
    mock.timers.tick(FRA_UN_FOGLIO_E_L_ALTRO)
    await respira()
    assert.equal(salvataggi, 1)
    finisci()
    await giro
  })
})
