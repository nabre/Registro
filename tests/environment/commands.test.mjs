// I comandi, e i quattro dell'editor che il registro invoca senza averli
// registrati. Conta la sequenza di `panels/projection.ts`: rivelare la
// finestra, staccarla, metterla a schermo intero. Il distacco deve riuscire
// (se fallisce `staccaFinestra()` rinuncia allo schermo intero), e lo schermo
// intero va sul proiettore.

import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, beforeEach, describe, it } from 'node:test'

import { bancoElectron, finestreCostruite } from '../helpers/fake-electron.mjs'

const RADICE = percorso.join(tmpdir(), 'registro-app')
process.env.REGISTRO_APPPATH = percorso.join(RADICE, 'dist')

// Una `userData` di questa prova: le finestre ci scrivono dove stavano, e una
// cartella condivisa aprirebbe un pannello a schermo intero per colpa di
// un'altra prova.
const DATI = mkdtempSync(percorso.join(tmpdir(), 'registro-comandi-'))
process.env.REGISTRO_USERDATA = DATI
after(() => rmSync(DATI, { recursive: true, force: true }))

const { comandi, esterno, finestre, Uri, ViewColumn } = await import('../../dist-tests/environment.mjs')

function apriPannello (titolo) {
  const primo = finestreCostruite.length
  finestre.crea('registroDocenti.pannello', titolo, ViewColumn.One, {})
  return finestreCostruite[primo]
}

beforeEach(() => {
  for (const finestra of finestreCostruite) finestra.close()
  finestreCostruite.length = 0
  bancoElectron.fuori.length = 0
})

describe('la mappa dei comandi', () => {
  it('registra, esegue con gli argomenti, e restituisce quel che il comando dà', async () => {
    const visti = []
    comandi.registra('registroDocenti.prova', (nodo) => {
      visti.push(nodo)
      return 'fatto'
    })
    assert.equal(await comandi.esegui('registroDocenti.prova', { genere: 'lezione' }), 'fatto')
    assert.deepEqual(visti, [{ genere: 'lezione' }])
  })

  it('aspetta i comandi che sono asincroni: quasi tutti quelli del registro lo sono', async () => {
    comandi.registra('registroDocenti.lento', async () => {
      await new Promise((risolvi) => setTimeout(risolvi, 10))
      return 'arrivato'
    })
    assert.equal(await comandi.esegui('registroDocenti.lento'), 'arrivato')
  })

  it('smaltire un comando lo toglie', async () => {
    const smaltibile = comandi.registra('registroDocenti.effimero', () => 'ci sono')
    smaltibile.dispose()
    assert.equal(await comandi.esegui('registroDocenti.effimero'), undefined)
  })

  it('un comando sconosciuto non fa cadere l’azione che lo stava usando', async () => {
    // `startup.ts` lo invoca *dopo* aver esportato il CSV: la rifinitura non fa
    // fallire l'azione.
    assert.equal(await comandi.esegui('registroDocenti.impostazioni', 'registroDocenti.ocr'), undefined)
  })
})

describe('i comandi dell’apparato', () => {
  it('apparato.mostraNellaCartella mostra il file nella sua cartella', async () => {
    const cartella = Uri.file(percorso.join(RADICE, 'esportazioni'))
    await comandi.esegui('apparato.mostraNellaCartella', cartella)
    assert.deepEqual(bancoElectron.fuori.at(-1), { cosa: 'mostra', dove: cartella.fsPath })
  })

  it('apparato.apri lo apre con il programma di sistema', async () => {
    const file = Uri.file(percorso.join(RADICE, 'presenze.csv'))
    await comandi.esegui('apparato.apri', file)
    assert.deepEqual(bancoElectron.fuori.at(-1), { cosa: 'apri', dove: file.fsPath })
  })

  it('staccare la finestra riesce e non fa niente: la proiezione è già una finestra', async () => {
    // Deve *riuscire*: se il distacco fallisce `staccaFinestra()` rinuncia allo
    // schermo intero.
    await assert.doesNotReject(comandi.esegui('apparato.staccaFinestra'))
  })

  it('lo schermo intero prende il secondo schermo, e non quello di chi insegna', async () => {
    const registro = apriPannello('Registro')
    registro.focus()
    const proiezione = apriPannello('Registro · proiezione')
    // Il comando agisce sulla finestra col fuoco, che dev'essere la proiezione.
    registro.conFuoco = false
    proiezione.focus()

    await comandi.esegui('apparato.schermoIntero')

    assert.equal(proiezione.schermoIntero, true)
    assert.deepEqual(proiezione.riquadro, bancoElectron.schermi[1].workArea)
    assert.equal(registro.schermoIntero, false)
  })

  it('con un solo schermo si allarga dov’è, senza spostare niente', async () => {
    const schermi = bancoElectron.schermi
    bancoElectron.schermi = [schermi[0]]
    try {
      const proiezione = apriPannello('Registro · proiezione')
      proiezione.focus()
      await comandi.esegui('apparato.schermoIntero')
      assert.equal(proiezione.schermoIntero, true)
      assert.equal(proiezione.riquadro, null)
    } finally {
      bancoElectron.schermi = schermi
    }
  })
})

describe('l’esterno', () => {
  it('gli indirizzi veri vanno al browser', async () => {
    assert.equal(await esterno.apri(Uri.parse('https://microsoft.com/devicelogin')), true)
    assert.deepEqual(bancoElectron.fuori.at(-1), {
      cosa: 'esterno',
      dove: 'https://microsoft.com/devicelogin',
    })
  })

  it('gli appunti: il codice da incollare ci passa prima di essere mostrato', async () => {
    await esterno.appunti.writeText('H7KQ2P9')
    assert.equal(await esterno.appunti.readText(), 'H7KQ2P9')
  })
})
