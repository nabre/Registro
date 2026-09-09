// I dialoghi dello shim, nella forma in cui il registro li usa davvero.
//
// I casi provati sono quelli del criterio di accettazione della fase: le due
// date del nuovo anno scolastico con la validazione dal vivo, la data della
// lezione duplicata con il valore iniziale, il piano per la lezione con le
// etichette che portano dentro i segnaposto delle icone, e la conferma modale
// prima di eliminare una lezione. Quel che qui passa, lì funziona.

import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { beforeEach, describe, it } from 'node:test'

import { bancoElectron, finestreCostruite, ipcMain } from '../aiuti/finto-electron.mjs'

const RADICE = percorso.join(tmpdir(), 'registro-app')
process.env.REGISTRO_APPPATH = percorso.join(RADICE, 'dist')

const { senzaSegnaposti, Uri, ViewColumn, window } = await import('../../dist-prove/ambiente.mjs')

/** Una finestra del registro aperta: senza, i messaggi non hanno dove andare. */
function apriIlPannello () {
  const primo = finestreCostruite.length
  window.createWebviewPanel('registroDocenti.pannello', 'Registro', ViewColumn.One, {
    enableScripts: true,
  })
  const finestra = finestreCostruite[primo]
  finestra.finisciCaricamento()
  return finestra
}

/** Apre un dialogo e restituisce la finestra che è appena nata. */
function conLaFinestra (apri) {
  const primo = finestreCostruite.length
  const promessa = apri()
  return { promessa, finestra: finestreCostruite[primo] }
}

/**
 * Come sopra, ma per `showQuickPick`, che le voci se le fa dare da una promessa
 * — in VS Code l'elenco può arrivare da un calcolo — e quindi apre la finestra
 * un giro dopo.
 */
async function conLaFinestraDopo (apri) {
  const primo = finestreCostruite.length
  const promessa = apri()
  await Promise.resolve()
  return { promessa, finestra: finestreCostruite[primo] }
}

/** I parametri che la pagina del dialogo si ritrova nella query. */
function parametriDi (finestra) {
  const indirizzo = new URL(finestra.caricati.at(-1))
  return JSON.parse(decodeURIComponent(indirizzo.searchParams.get('p')))
}

beforeEach(() => {
  for (const finestra of finestreCostruite) finestra.close()
  finestreCostruite.length = 0
  bancoElectron.messaggi.length = 0
  bancoElectron.aperture.length = 0
  bancoElectron.fuori.length = 0
  bancoElectron.rispostaAiMessaggi = 0
  bancoElectron.rispostaAlleAperture = { canceled: true, filePaths: [] }
})

describe('i segnaposto delle icone', () => {
  it('spariscono dalle etichette, o si leggerebbero', () => {
    // `estensione.ts`, «piano per questa lezione»: senza questa riga chi guarda
    // legge «$(copy) Piano di matematica».
    assert.equal(senzaSegnaposti('$(copy) Piano di matematica'), 'Piano di matematica')
    assert.equal(senzaSegnaposti('$(add) Piano vuoto da completare'), 'Piano vuoto da completare')
  })

  it('lascia stare un’etichetta che non ne ha', () => {
    assert.equal(senzaSegnaposti('Scegli le date…'), 'Scegli le date…')
  })
})

describe('i messaggi', () => {
  it('senza bottoni è una nuvoletta nel pannello, non una finestra da chiudere', async () => {
    const pannello = apriIlPannello()
    // `smistatore.alTermine` ne manda una per ogni PDF: venti file, venti clic.
    assert.equal(await window.showInformationMessage('Registro: 3 documenti assegnati.'), undefined)
    assert.equal(bancoElectron.messaggi.length, 0)
    assert.deepEqual(pannello.webContents.inviati.at(-1).messaggio, {
      tipo: 'notifica',
      livello: 'info',
      testo: 'Registro: 3 documenti assegnati.',
    })
  })

  it('senza nessuna finestra aperta la dice in una finestra vera', async () => {
    await window.showErrorMessage('Registro: non riesco a scrivere.')
    assert.equal(bancoElectron.messaggi.length, 1)
    assert.equal(bancoElectron.messaggi[0].type, 'error')
  })

  it('con un bottone chiede davvero, e risponde con l’etichetta scelta', async () => {
    apriIlPannello()
    bancoElectron.rispostaAiMessaggi = 0
    const scelta = await window.showWarningMessage(
      'Eliminare la lezione del 24 agosto?',
      { modal: true },
      'Elimina',
    )
    assert.equal(scelta, 'Elimina')
    const mostrato = bancoElectron.messaggi[0]
    assert.equal(mostrato.type, 'warning')
    assert.deepEqual(mostrato.buttons, ['Elimina', 'Annulla'])
  })

  it('annullare risolve con undefined, che è quel che il chiamante confronta', async () => {
    apriIlPannello()
    // Il bottone «Annulla», che è l'ultimo: `estensione.ts` scrive
    // `if (conferma !== 'Elimina') return`.
    bancoElectron.rispostaAiMessaggi = 1
    const scelta = await window.showWarningMessage('Azzerare la posta?', { modal: true }, 'Azzera')
    assert.equal(scelta, undefined)
  })

  it('porta con sé il dettaglio, che è dove sta la spiegazione', async () => {
    apriIlPannello()
    await window.showWarningMessage('Azzerare la posta?', { modal: true, detail: 'Toglie la password.' }, 'Azzera')
    assert.equal(bancoElectron.messaggi[0].detail, 'Toglie la password.')
  })
})

describe('la scelta di un file', () => {
  it('traduce i filtri e restituisce uri', async () => {
    bancoElectron.rispostaAlleAperture = {
      canceled: false,
      filePaths: [percorso.join(RADICE, 'foglio.pdf')],
    }
    const scelti = await window.showOpenDialog({
      title: 'Scegli il documento',
      openLabel: 'Porta nel registro',
      filters: { 'Documenti': ['pdf', '.png'] },
    })
    assert.equal(scelti.length, 1)
    assert.equal(scelti[0].fsPath, percorso.join(RADICE, 'foglio.pdf'))
    // Electron le vuole senza punto; VS Code le accetta in tutti e due i modi.
    assert.deepEqual(bancoElectron.aperture[0].filters, [{ name: 'Documenti', extensions: ['pdf', 'png'] }])
    assert.deepEqual(bancoElectron.aperture[0].properties, ['openFile'])
  })

  it('annullare dà undefined e non un elenco vuoto', async () => {
    bancoElectron.rispostaAlleAperture = { canceled: true, filePaths: [] }
    assert.equal(await window.showOpenDialog({ title: 'Scegli' }), undefined)
  })
})

describe('la domanda con una risposta scritta', () => {
  it('parte dal valore che c’è già, come «duplica la lezione»', () => {
    const { finestra } = conLaFinestra(() =>
      window.showInputBox({ title: 'Duplica la lezione', value: '2026-09-08', prompt: 'Formato AAAA-MM-GG' }),
    )
    const parametri = parametriDi(finestra)
    assert.equal(parametri.tipo, 'input')
    assert.equal(parametri.valore, '2026-09-08')
    assert.equal(parametri.invito, 'Formato AAAA-MM-GG')
  })

  it('è modale sulla finestra del registro, e non si ridimensiona', () => {
    const pannello = apriIlPannello()
    pannello.focus()
    const { finestra } = conLaFinestra(() => window.showInputBox({ title: 'Inizio dell’anno' }))
    assert.equal(finestra.opzioni.modal, true)
    assert.equal(finestra.opzioni.parent, pannello)
    assert.equal(finestra.opzioni.resizable, false)
  })

  it('valida a ogni tasto, che è il patto delle date AAAA-MM-GG', async () => {
    const { finestra } = conLaFinestra(() =>
      window.showInputBox({
        title: 'Inizio dell’anno',
        validateInput: (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? null : 'Serve una data AAAA-MM-GG'),
      }),
    )
    ipcMain.simulaDallaPagina(finestra.webContents.id, { dialogo: 'valida', testo: '2026-0' })
    await new Promise((risolvi) => setTimeout(risolvi, 0))
    assert.deepEqual(finestra.webContents.inviati.at(-1).messaggio, {
      dialogo: 'errore',
      messaggio: 'Serve una data AAAA-MM-GG',
    })

    ipcMain.simulaDallaPagina(finestra.webContents.id, { dialogo: 'valida', testo: '2026-09-01' })
    await new Promise((risolvi) => setTimeout(risolvi, 0))
    // Nullo vuol dire «va bene», ed è il segnale con cui la pagina riaccende il
    // bottone di conferma.
    assert.equal(finestra.webContents.inviati.at(-1).messaggio.messaggio, null)
  })

  it('confermando dà il testo, e la finestra si chiude', async () => {
    const { promessa, finestra } = conLaFinestra(() => window.showInputBox({ title: 'Fine dell’anno' }))
    ipcMain.simulaDallaPagina(finestra.webContents.id, { dialogo: 'conferma', testo: '2027-06-30' })
    assert.equal(await promessa, '2027-06-30')
    assert.equal(finestra.isDestroyed(), true)
  })

  it('annullare dà undefined e non un rifiuto', async () => {
    const { promessa, finestra } = conLaFinestra(() => window.showInputBox({ title: 'Fine dell’anno' }))
    ipcMain.simulaDallaPagina(finestra.webContents.id, { dialogo: 'annulla' })
    assert.equal(await promessa, undefined)
  })

  it('anche chiudendo la finestra dalla X', async () => {
    const { promessa, finestra } = conLaFinestra(() => window.showInputBox({ title: 'Fine dell’anno' }))
    finestra.chiudiDaFuori()
    assert.equal(await promessa, undefined)
  })
})

describe('la domanda con un elenco', () => {
  const PIANI = [
    { label: '$(add) Piano vuoto da completare', pianoId: null },
    { label: '$(copy) Piano di matematica', description: 'di questo corso · 6 attività', pianoId: 'p1' },
  ]

  it('mostra le etichette ripulite, con la descrizione sotto', async () => {
    const { finestra } = await conLaFinestraDopo(() =>
      window.showQuickPick(PIANI, { title: 'Piano per la lezione', placeHolder: 'Da zero, oppure copiando' }),
    )
    const parametri = parametriDi(finestra)
    assert.equal(parametri.tipo, 'elenco')
    assert.deepEqual(
      parametri.voci.map((voce) => voce.etichetta),
      ['Piano vuoto da completare', 'Piano di matematica'],
    )
    assert.equal(parametri.voci[1].descrizione, 'di questo corso · 6 attività')
  })

  it('restituisce la voce intera, non l’etichetta: il chiamante ne legge i campi', async () => {
    const { promessa, finestra } = await conLaFinestraDopo(() => window.showQuickPick(PIANI, { title: 'Piano' }))
    ipcMain.simulaDallaPagina(finestra.webContents.id, { dialogo: 'conferma', indice: 1 })
    const scelta = await promessa
    // `estensione.ts` fa `scelta.pianoId`: se tornasse la sola etichetta,
    // ripulita per giunta, non ci sarebbe modo di risalire al piano.
    assert.equal(scelta.pianoId, 'p1')
  })

  it('annullare dà undefined', async () => {
    const { promessa, finestra } = await conLaFinestraDopo(() => window.showQuickPick(PIANI, { title: 'Piano' }))
    ipcMain.simulaDallaPagina(finestra.webContents.id, { dialogo: 'annulla' })
    assert.equal(await promessa, undefined)
  })
})

describe('l’avanzamento', () => {
  it('esegue il compito e racconta nel pannello', async () => {
    const pannello = apriIlPannello()
    const esito = await window.withProgress(
      { title: 'Registro: provo a entrare…' },
      async (avanzamento, annulla) => {
        avanzamento.report({ message: 'quasi…' })
        return annulla.isCancellationRequested ? 'annullato' : 'fatto'
      },
    )
    assert.equal(esito, 'fatto')
    const detti = pannello.webContents.inviati.map((voce) => voce.messaggio.testo)
    assert.deepEqual(detti, ['Registro: provo a entrare…', 'quasi…'])
  })

  it('l’errore del compito arriva a chi ha chiamato', async () => {
    apriIlPannello()
    await assert.rejects(
      window.withProgress({ title: 'Provo…' }, async () => {
        throw new Error('il server ha detto di no')
      }),
      /il server ha detto di no/,
    )
  })
})

describe('aprire un file', () => {
  it('lo consegna al programma di sistema: sul desktop non c’è un editor', async () => {
    await window.showTextDocument(Uri.file(percorso.join(RADICE, 'presenze.csv')), { preview: false })
    assert.deepEqual(bancoElectron.fuori.at(-1), {
      cosa: 'apri',
      dove: percorso.join(RADICE, 'presenze.csv'),
    })
  })
})
