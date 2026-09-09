// I comandi, e i quattro dell'editor che il registro invoca senza averli
// registrati.
//
// La parte che conta è la sequenza di `pannelloProiezione.ts`: rivelare la
// finestra, staccarla, metterla a schermo intero. Sul desktop il distacco non
// serve più — un pannello *è* una finestra — ma deve riuscire lo stesso, perché
// `staccaFinestra()` rinuncia allo schermo intero se il distacco fallisce. E lo
// schermo intero deve prendere il proiettore, non lo schermo di chi insegna.

import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { beforeEach, describe, it } from 'node:test'

import { bancoElectron, finestreCostruite } from '../aiuti/finto-electron.mjs'

const RADICE = percorso.join(tmpdir(), 'registro-app')
process.env.REGISTRO_APPPATH = percorso.join(RADICE, 'dist')

const { commands, env, Uri, ViewColumn, window } = await import('../../dist-prove/ambiente.mjs')

function apriPannello (titolo) {
  const primo = finestreCostruite.length
  window.createWebviewPanel('registroDocenti.pannello', titolo, ViewColumn.One, {})
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
    commands.registerCommand('registroDocenti.prova', (nodo) => {
      visti.push(nodo)
      return 'fatto'
    })
    assert.equal(await commands.executeCommand('registroDocenti.prova', { genere: 'lezione' }), 'fatto')
    assert.deepEqual(visti, [{ genere: 'lezione' }])
  })

  it('aspetta i comandi che sono asincroni: quasi tutti quelli del registro lo sono', async () => {
    commands.registerCommand('registroDocenti.lento', async () => {
      await new Promise((risolvi) => setTimeout(risolvi, 10))
      return 'arrivato'
    })
    assert.equal(await commands.executeCommand('registroDocenti.lento'), 'arrivato')
  })

  it('smaltire un comando lo toglie', async () => {
    const smaltibile = commands.registerCommand('registroDocenti.effimero', () => 'ci sono')
    smaltibile.dispose()
    assert.equal(await commands.executeCommand('registroDocenti.effimero'), undefined)
  })

  it('un comando sconosciuto non fa cadere l’azione che lo stava usando', async () => {
    // `estensione.ts` lo invoca *dopo* aver esportato il CSV: far fallire
    // l'azione per la sola rifinitura vorrebbe dire perdere il lavoro fatto.
    assert.equal(await commands.executeCommand('workbench.action.openSettings', 'registroDocenti.ocr'), undefined)
  })
})

describe('i comandi dell’editor', () => {
  it('revealFileInOS mostra il file nella sua cartella', async () => {
    const cartella = Uri.file(percorso.join(RADICE, 'esportazioni'))
    await commands.executeCommand('revealFileInOS', cartella)
    assert.deepEqual(bancoElectron.fuori.at(-1), { cosa: 'mostra', dove: cartella.fsPath })
  })

  it('vscode.open lo apre con il programma di sistema', async () => {
    const file = Uri.file(percorso.join(RADICE, 'presenze.csv'))
    await commands.executeCommand('vscode.open', file)
    assert.deepEqual(bancoElectron.fuori.at(-1), { cosa: 'apri', dove: file.fsPath })
  })

  it('staccare la finestra riesce e non fa niente: la proiezione è già una finestra', async () => {
    // Deve *riuscire*: `staccaFinestra()` rinuncia allo schermo intero se il
    // distacco fallisce, e la finestra resterebbe piccola in mezzo al proiettore.
    await assert.doesNotReject(commands.executeCommand('workbench.action.moveEditorToNewWindow'))
  })

  it('lo schermo intero prende il secondo schermo, e non quello di chi insegna', async () => {
    const registro = apriPannello('Registro')
    registro.focus()
    const proiezione = apriPannello('Registro · proiezione')
    // È quel che fa `staccaFinestra()` un attimo prima: il comando di VS Code
    // agisce sulla finestra che ha il fuoco, e quella dev'essere la proiezione.
    registro.conFuoco = false
    proiezione.focus()

    await commands.executeCommand('workbench.action.toggleFullScreen')

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
      await commands.executeCommand('workbench.action.toggleFullScreen')
      assert.equal(proiezione.schermoIntero, true)
      assert.equal(proiezione.riquadro, null)
    } finally {
      bancoElectron.schermi = schermi
    }
  })
})

describe('l’esterno', () => {
  it('gli indirizzi veri vanno al browser', async () => {
    assert.equal(await env.openExternal(Uri.parse('https://microsoft.com/devicelogin')), true)
    assert.deepEqual(bancoElectron.fuori.at(-1), {
      cosa: 'esterno',
      dove: 'https://microsoft.com/devicelogin',
    })
  })

  it('gli appunti: il codice da incollare ci passa prima di essere mostrato', async () => {
    await env.clipboard.writeText('H7KQ2P9')
    assert.equal(await env.clipboard.readText(), 'H7KQ2P9')
  })
})
