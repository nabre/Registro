// I dialoghi dello shim, come il registro li usa: le date del nuovo anno con la
// validazione dal vivo, la data della lezione duplicata col valore iniziale, il
// piano per la lezione con i segnaposto delle icone nelle etichette, la
// conferma modale prima di eliminare una lezione.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, it } from 'node:test'

import { app, BrowserWindow, bancoElectron, finestreCostruite, ipcMain } from '../helpers/fake-electron.mjs'

const RADICE_PROGETTO = fileURLToPath(new URL('../..', import.meta.url))
const RADICE = percorso.join(tmpdir(), 'registro-app')
process.env.REGISTRO_APPPATH = percorso.join(RADICE, 'dist')

const { senzaSegnaposti, Uri, ViewColumn, dialoghi, finestre } = await import('../../dist-tests/environment.mjs')

/** Una finestra del registro aperta: senza, i messaggi non hanno dove andare. */
function apriIlPannello () {
  const primo = finestreCostruite.length
  finestre.crea('registroDocenti.pannello', 'Registro', ViewColumn.One, {
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
 * Come sopra, per `showQuickPick`: le voci arrivano da una promessa, quindi la
 * finestra si apre un giro dopo.
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
    // `startup.ts`, «piano per questa lezione»: senza, si leggerebbe «$(copy)
    // Piano di matematica».
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
    assert.equal(await dialoghi.informa('Regiclass: 3 documenti assegnati.'), undefined)
    assert.equal(bancoElectron.messaggi.length, 0)
    assert.deepEqual(pannello.webContents.inviati.at(-1).messaggio, {
      tipo: 'notifica',
      livello: 'info',
      testo: 'Regiclass: 3 documenti assegnati.',
    })
  })

  it('senza nessun pannello la dice in una finestra del registro, non di sistema', async () => {
    const { promessa, finestra } = conLaFinestra(() => dialoghi.errore('Regiclass: non riesco a scrivere.'))
    const parametri = parametriDi(finestra)
    assert.equal(parametri.tipo, 'messaggio')
    assert.equal(parametri.livello, 'errore')
    // «Regiclass:» davanti, nella finestra del registro, è una parola in più.
    assert.equal(parametri.messaggio, 'Non riesco a scrivere.')
    assert.deepEqual(parametri.bottoni, [{ etichetta: 'Chiudi', ruolo: 'primario', aSinistra: false }])
    ipcMain.simulaDallaPagina(finestra.webContents.id, { dialogo: 'conferma', indice: 0 })
    assert.equal(await promessa, undefined)
    assert.equal(bancoElectron.messaggi.length, 0, 'la finestra di sistema non si apre più')
  })

  it('il benvenuto non è un pannello: la nuvoletta lì spariva, adesso è una finestra', async () => {
    // Una finestra del guscio (benvenuto, impostazioni) non disegna le nuvolette.
    const benvenuto = new BrowserWindow({ title: 'Benvenuto' })
    const { promessa, finestra } = conLaFinestra(() =>
      dialoghi.errore('C:\\anni\\2026.regi non si è aperto: il file è sparito.'),
    )
    assert.equal(benvenuto.webContents.inviati.length, 0)
    assert.equal(parametriDi(finestra).tipo, 'messaggio')
    finestra.chiudiDaFuori()
    assert.equal(await promessa, undefined)
  })

  it('un messaggio lungo va nel corpo, e il titolo lo dà il tono', () => {
    const lungo = 'Regiclass: ' + 'i documenti della lezione non si sono potuti rifare, '.repeat(3)
    const { finestra } = conLaFinestra(() => dialoghi.avvisa(lungo, { modal: true }))
    const parametri = parametriDi(finestra)
    assert.equal(parametri.messaggio, 'Attenzione')
    assert.match(parametri.dettaglio, /^I documenti della lezione/)
  })

  it('con un bottone chiede davvero, e risponde con l’etichetta scelta', async () => {
    apriIlPannello()
    const { promessa, finestra } = conLaFinestra(() => dialoghi.avvisa(
      'Eliminare la lezione del 24 agosto?',
      { modal: true },
      'Elimina',
    ))
    const parametri = parametriDi(finestra)
    assert.equal(parametri.livello, 'avviso')
    // Come il piede delle modali del pannello: «Annulla», e il gesto in fondo a
    // destra col fuoco (Invio lo preme).
    assert.deepEqual(parametri.bottoni.map((b) => [b.etichetta, b.ruolo]), [
      ['Annulla', 'secondario'],
      ['Elimina', 'primario'],
    ])
    assert.equal(parametri.predefinito, 1)
    assert.equal(finestra.opzioni.modal, true)
    ipcMain.simulaDallaPagina(finestra.webContents.id, { dialogo: 'conferma', indice: 1 })
    assert.equal(await promessa, 'Elimina')
  })

  it('annullare risolve con undefined, che è quel che il chiamante confronta', async () => {
    apriIlPannello()
    // `startup.ts` scrive `if (conferma !== 'Azzera') return`.
    const primo = conLaFinestra(() => dialoghi.avvisa('Azzerare la posta?', { modal: true }, 'Azzera'))
    ipcMain.simulaDallaPagina(primo.finestra.webContents.id, { dialogo: 'conferma', indice: 0 })
    assert.equal(await primo.promessa, undefined)
    // Esc, che la pagina manda come «annulla».
    const secondo = conLaFinestra(() => dialoghi.avvisa('Azzerare la posta?', { modal: true }, 'Azzera'))
    ipcMain.simulaDallaPagina(secondo.finestra.webContents.id, { dialogo: 'annulla' })
    assert.equal(await secondo.promessa, undefined)
    // E un indice che non è di nessun pulsante.
    const terzo = conLaFinestra(() => dialoghi.avvisa('Azzerare la posta?', { modal: true }, 'Azzera'))
    ipcMain.simulaDallaPagina(terzo.finestra.webContents.id, { dialogo: 'conferma', indice: 7 })
    assert.equal(await terzo.promessa, undefined)
  })

  it('porta con sé il dettaglio, che è dove sta la spiegazione', () => {
    apriIlPannello()
    const { finestra } = conLaFinestra(() =>
      dialoghi.avvisa('Azzerare la posta?', { modal: true, detail: 'Toglie la password.' }, 'Azzera'),
    )
    assert.equal(parametriDi(finestra).dettaglio, 'Toglie la password.')
  })

  it('più bottoni: gli altri a sinistra, e il pericolo in rosso', async () => {
    const { promessa, finestra } = conLaFinestra(() => dialoghi.avvisa(
      'L’anno «Prova» non è ancora stato salvato.',
      { modal: true },
      { title: 'Salva con nome…' },
      { title: 'Butta l’anno', pericolo: true },
    ))
    assert.deepEqual(parametriDi(finestra).bottoni, [
      { etichetta: 'Butta l’anno', ruolo: 'pericolo', aSinistra: true },
      { etichetta: 'Annulla', ruolo: 'secondario', aSinistra: false },
      { etichetta: 'Salva con nome…', ruolo: 'primario', aSinistra: false },
    ])
    ipcMain.simulaDallaPagina(finestra.webContents.id, { dialogo: 'conferma', indice: 0 })
    assert.equal(await promessa, 'Butta l’anno')
  })

  it('se la pagina non arriva, ripiega sulla finestra di sistema: un avviso non detto è peggio', async () => {
    bancoElectron.rispostaAiMessaggi = 1
    const { promessa, finestra } = conLaFinestra(() =>
      dialoghi.avvisa('Azzerare la posta?', { modal: true, detail: 'Toglie la password.' }, 'Azzera'),
    )
    finestra.webContents.emetti('did-fail-load')
    // Nella finestra di sistema l'ordine è lo stesso: «Annulla», «Azzera».
    assert.equal(await promessa, 'Azzera')
    const mostrato = bancoElectron.messaggi[0]
    assert.equal(mostrato.type, 'warning')
    assert.deepEqual(mostrato.buttons, ['Annulla', 'Azzera'])
    assert.equal(mostrato.cancelId, 0)
    assert.equal(mostrato.detail, 'Toglie la password.')
  })
})

describe('un anno scritto da un registro più recente', () => {
  const DAL_PACCHETTO =
    'Regiclass: 2027-2028.regi è stato scritto da una versione più recente del registro ' +
    '(formato 3, qui si arriva a 2). Aggiorna il registro invece di aprirlo: scriverci sopra ' +
    'adesso perderebbe quel che non si sa leggere.'

  it('dice il file, le due versioni e che cosa fare', async () => {
    const { promessa, finestra } = conLaFinestra(() => dialoghi.errore(DAL_PACCHETTO))
    const parametri = parametriDi(finestra)
    assert.equal(parametri.tipo, 'messaggio')
    assert.equal(parametri.livello, 'avviso')
    assert.equal(parametri.messaggio, '«2027-2028.regi» viene da un registro più recente')
    assert.deepEqual(parametri.fatti.map((f) => f.valore), ['3', '2'])
    assert.match(parametri.fatti[0].nome, /formato/)
    assert.match(parametri.fatti[1].nome, /0\.0\.0-prove/, 'la versione del programma che gira')
    assert.deepEqual(parametri.bottoni.map((b) => b.etichetta), [
      'Apri un altro anno…',
      'Chiudi',
      'Scarica la versione nuova',
    ])
    finestra.chiudiDaFuori()
    assert.equal(await promessa, undefined)
  })

  it('«Scarica la versione nuova» porta alla pagina delle release', async () => {
    const { promessa, finestra } = conLaFinestra(() => dialoghi.errore(DAL_PACCHETTO))
    ipcMain.simulaDallaPagina(finestra.webContents.id, { dialogo: 'conferma', indice: 2 })
    await promessa
    await new Promise((risolvi) => setTimeout(risolvi, 0))
    assert.match(bancoElectron.fuori.at(-1)?.dove ?? '', /github\.com\/nabre\/Registro\/releases/)
  })

  it('riconosce anche i dati, e il messaggio di «non si è aperto» che lo avvolge', () => {
    const { finestra } = conLaFinestra(() => dialoghi.errore(
      'C:\\anni\\2027-2028.regi non si è aperto: 2027-2028.regi è stato scritto da una ' +
        'versione più recente del registro (dati 9, qui si arriva a 7). Aggiorna il registro.',
    ))
    const parametri = parametriDi(finestra)
    assert.equal(parametri.messaggio, '«2027-2028.regi» viene da un registro più recente')
    assert.match(parametri.fatti[0].nome, /dati/)
    assert.deepEqual(parametri.fatti.map((f) => f.valore), ['9', '7'])
  })

  it('`data/` scrive la frase con la funzione che la finestra riconosce', () => {
    // Frase e riconoscimento stanno insieme in `domain/upgrades.ts`: chi rifiuta
    // un anno non si scrive la frase da sé, o una copia ritoccata spegnerebbe la
    // finestra.
    for (const file of ['src/data/package.ts', 'src/data/archive.ts']) {
      const testo = readFileSync(percorso.join(RADICE_PROGETTO, file), 'utf8')
      assert.match(testo, /fraseVersionePiuRecente\(/, file)
      assert.doesNotMatch(testo, /è stato scritto da una versione più recente/, file)
    }
  })
})

describe('la scelta di un file', () => {
  it('traduce i filtri e restituisce uri', async () => {
    bancoElectron.rispostaAlleAperture = {
      canceled: false,
      filePaths: [percorso.join(RADICE, 'foglio.pdf')],
    }
    const scelti = await dialoghi.chiediFile({
      title: 'Scegli il documento',
      openLabel: 'Porta nel registro',
      filters: { 'Documenti': ['pdf', '.png'] },
    })
    assert.equal(scelti.length, 1)
    assert.equal(scelti[0].fsPath, percorso.join(RADICE, 'foglio.pdf'))
    // Electron le vuole senza punto; VS Code le accetta in tutti e due i modi.
    assert.deepEqual(bancoElectron.aperture[0].filters, [{ name: 'Documenti', extensions: ['pdf', 'png'] }])
    assert.deepEqual(bancoElectron.aperture[0].properties, ['openFile'])
    assert.equal(bancoElectron.aperture[0].defaultPath, app.getPath('documents'))
  })

  it('annullare dà undefined e non un elenco vuoto', async () => {
    bancoElectron.rispostaAlleAperture = { canceled: true, filePaths: [] }
    assert.equal(await dialoghi.chiediFile({ title: 'Scegli' }), undefined)
  })
})

describe('la domanda con una risposta scritta', () => {
  it('parte dal valore che c’è già, come «duplica la lezione»', () => {
    const { finestra } = conLaFinestra(() =>
      dialoghi.chiediTesto({ title: 'Duplica la lezione', value: '2026-09-08', prompt: 'Formato AAAA-MM-GG' }),
    )
    const parametri = parametriDi(finestra)
    assert.equal(parametri.tipo, 'input')
    assert.equal(parametri.valore, '2026-09-08')
    assert.equal(parametri.invito, 'Formato AAAA-MM-GG')
  })

  it('è modale sulla finestra del registro, e non si ridimensiona', () => {
    const pannello = apriIlPannello()
    pannello.focus()
    const { finestra } = conLaFinestra(() => dialoghi.chiediTesto({ title: 'Inizio dell’anno' }))
    assert.equal(finestra.opzioni.modal, true)
    assert.equal(finestra.opzioni.parent, pannello)
    assert.equal(finestra.opzioni.resizable, false)
  })

  it('valida a ogni tasto, che è il patto delle date AAAA-MM-GG', async () => {
    const { finestra } = conLaFinestra(() =>
      dialoghi.chiediTesto({
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
    // Nullo vuol dire «va bene»: la pagina riaccende il bottone di conferma.
    assert.equal(finestra.webContents.inviati.at(-1).messaggio.messaggio, null)
  })

  it('confermando dà il testo, e la finestra si chiude', async () => {
    const { promessa, finestra } = conLaFinestra(() => dialoghi.chiediTesto({ title: 'Fine dell’anno' }))
    ipcMain.simulaDallaPagina(finestra.webContents.id, { dialogo: 'conferma', testo: '2027-06-30' })
    assert.equal(await promessa, '2027-06-30')
    assert.equal(finestra.isDestroyed(), true)
  })

  it('annullare dà undefined e non un rifiuto', async () => {
    const { promessa, finestra } = conLaFinestra(() => dialoghi.chiediTesto({ title: 'Fine dell’anno' }))
    ipcMain.simulaDallaPagina(finestra.webContents.id, { dialogo: 'annulla' })
    assert.equal(await promessa, undefined)
  })

  it('anche chiudendo la finestra dalla X', async () => {
    const { promessa, finestra } = conLaFinestra(() => dialoghi.chiediTesto({ title: 'Fine dell’anno' }))
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
      dialoghi.chiediScelta(PIANI, { title: 'Piano per la lezione', placeHolder: 'Da zero, oppure copiando' }),
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
    const { promessa, finestra } = await conLaFinestraDopo(() => dialoghi.chiediScelta(PIANI, { title: 'Piano' }))
    ipcMain.simulaDallaPagina(finestra.webContents.id, { dialogo: 'conferma', indice: 1 })
    const scelta = await promessa
    // `startup.ts` usa `scelta.pianoId`: la sola etichetta non basterebbe.
    assert.equal(scelta.pianoId, 'p1')
  })

  it('annullare dà undefined', async () => {
    const { promessa, finestra } = await conLaFinestraDopo(() => dialoghi.chiediScelta(PIANI, { title: 'Piano' }))
    ipcMain.simulaDallaPagina(finestra.webContents.id, { dialogo: 'annulla' })
    assert.equal(await promessa, undefined)
  })
})

describe('l’avanzamento', () => {
  it('esegue il compito e racconta nel pannello', async () => {
    const pannello = apriIlPannello()
    const esito = await dialoghi.conAvanzamento(
      { title: 'Regiclass: provo a entrare…' },
      async (avanzamento) => {
        avanzamento.report({ message: 'quasi…' })
        return 'fatto'
      },
    )
    assert.equal(esito, 'fatto')
    const detti = pannello.webContents.inviati.map((voce) => voce.messaggio.testo)
    assert.deepEqual(detti, ['Regiclass: provo a entrare…', 'quasi…'])
  })

  it('l’errore del compito arriva a chi ha chiamato', async () => {
    apriIlPannello()
    await assert.rejects(
      dialoghi.conAvanzamento({ title: 'Provo…' }, async () => {
        throw new Error('il server ha detto di no')
      }),
      /il server ha detto di no/,
    )
  })
})

describe('aprire un file', () => {
  it('lo consegna al programma di sistema: sul desktop non c’è un editor', async () => {
    await dialoghi.apriDocumento(Uri.file(percorso.join(RADICE, 'presenze.csv')), { preview: false })
    assert.deepEqual(bancoElectron.fuori.at(-1), {
      cosa: 'apri',
      dove: percorso.join(RADICE, 'presenze.csv'),
    })
  })
})

describe('la convalida dell’input', () => {
  const attendi = (ms) => new Promise((risolvi) => setTimeout(risolvi, ms))

  it('le risposte tornano nell’ordine dei tasti, anche quando la prima è lenta', async () => {
    const { promessa, finestra } = conLaFinestra(() =>
      dialoghi.chiediTesto({
        title: 'Data',
        // Il primo testo è lento a convalidarsi e sbagliato, il secondo veloce e
        // giusto: vale l'ultimo.
        validateInput: async (v) => {
          await attendi(v === '2026-0' ? 40 : 0)
          return /^\d{4}-\d{2}-\d{2}$/.test(v) ? null : 'Serve una data AAAA-MM-GG'
        },
      }),
    )
    const id = finestra.webContents.id
    ipcMain.simulaDallaPagina(id, { dialogo: 'valida', testo: '2026-0' })
    ipcMain.simulaDallaPagina(id, { dialogo: 'valida', testo: '2026-09-01' })
    await attendi(80)
    const errori = finestra.webContents.inviati
      .map((i) => i.messaggio)
      .filter((m) => m?.dialogo === 'errore')
    assert.deepEqual(errori.map((m) => m.messaggio), ['Serve una data AAAA-MM-GG', null])
    finestra.chiudiDaFuori()
    assert.equal(await promessa, undefined)
  })

  it('alla conferma si riconvalida: un testo sbagliato non passa', async () => {
    const { promessa, finestra } = conLaFinestra(() =>
      dialoghi.chiediTesto({
        title: 'Data',
        validateInput: (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? null : 'Serve una data AAAA-MM-GG'),
      }),
    )
    const id = finestra.webContents.id
    let finito = false
    void promessa.then(() => { finito = true })

    ipcMain.simulaDallaPagina(id, { dialogo: 'conferma', testo: '2026-0' })
    await attendi(10)
    assert.equal(finito, false, 'un testo che non va non deve chiudere il dialogo')
    assert.equal(finestra.isDestroyed(), false)
    assert.deepEqual(finestra.webContents.inviati.at(-1).messaggio, {
      dialogo: 'errore',
      messaggio: 'Serve una data AAAA-MM-GG',
    })

    ipcMain.simulaDallaPagina(id, { dialogo: 'conferma', testo: '2026-09-01' })
    assert.equal(await promessa, '2026-09-01')
  })
})
