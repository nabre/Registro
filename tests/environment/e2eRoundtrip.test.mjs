// Prova end-to-end del ciclo completo di persistenza:
// Pagina webview -> Bridge/Preload (IPC) -> Main Process (PannelloRegistro / Archivio) -> Scrittura fisica su disco (.regi ZIP).

import assert from 'node:assert/strict'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

import { importaSorgente } from '../helpers/sorgente.mjs'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-e2e-roundtrip-'))
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')
process.env.REGISTRO_APPPATH = percorso.join(radice, 'dist')

after(() => {
  rmSync(radice, { recursive: true, force: true })
})

let m

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  m = await importaSorgente(
    [
      "export { PannelloRegistro } from './desktop/pannelli/panel.ts'",
      "export { Archivio } from './core/dati/archive.ts'",
      "export { Uri } from './core/apparato/uri.ts'",
      "export { leggiZip } from './core/dati/zip.ts'",
      "export { finestreCostruite, ipcMain } from './tests/helpers/fake-electron.mjs'",
    ].join('\n'),
    { nodeLlama: 'tests/helpers/fake-node-llama.mjs' },
  )
})

describe('ciclo end-to-end pagina -> preload -> main -> disco', () => {
  it('un’azione inviata dal webview attraversa IPC, modifica l’archivio e si riflette sul file .regi su disco', async () => {
    const { Archivio, PannelloRegistro, Uri, leggiZip, finestreCostruite, ipcMain } = m

    // 1. Predisponiamo una copia di lavoro del documento .regi campione
    const fileCampione = percorso.resolve('tests/samples/2026-2027.regi')
    const fileDestinazione = percorso.join(radice, '2026-2027-e2e.regi')
    copyFileSync(fileCampione, fileDestinazione)

    // 2. Apriamo l'Archivio sul file copiato
    const archivio = new Archivio(Uri.file(radice))
    await archivio.apri(Uri.file(fileDestinazione))
    assert.equal(archivio.pronto, true)

    // 3. Apriamo il pannello registro (simulando l'avvio della finestra Electron)
    const contesto = {
      extensionUri: Uri.file(radice),
      subscriptions: [],
    }
    const pannello = PannelloRegistro.mostra(contesto, archivio)
    PannelloRegistro.istanza = pannello

    const finestra = finestreCostruite.at(-1)
    assert.ok(finestra, 'La finestra del pannello deve essere stata creata')
    finestra.finisciCaricamento()

    try {
      // 4. Simuliamo il preload di acquireVsCodeApi: postMessage inoltra tramite IPC
      const vscodeApi = {
        postMessage (messaggio) {
          ipcMain.simulaDallaPagina(finestra.webContents.id, messaggio)
        },
      }

      // La pagina si annuncia pronta con 'stato.leggi'
      vscodeApi.postMessage({ id: 1, azione: { tipo: 'stato.leggi' } })
      await PannelloRegistro.attendiScritture()

      // 5. La pagina invia un'azione di modifica: salvataggio di una nuova materia
      const nuovaMateria = {
        id: 'mat-e2e-roundtrip',
        nome: 'Informatica Avanzata E2E',
        colore: '#0088cc',
        abbreviazione: 'IAE',
      }
      vscodeApi.postMessage({
        id: 42,
        azione: {
          tipo: 'materia.salva',
          materia: nuovaMateria,
        },
      })

      // 6. Attendiamo che la coda del pannello finisca e forziamo la scrittura su disco
      await PannelloRegistro.attendiScritture()
      await archivio.salva()

      // 7. Verifichiamo che il main abbia risposto alla pagina via IPC webContents.send
      const risposte = finestra.webContents.inviati
        .filter((invio) => invio.canale === 'registro:messaggio' && invio.messaggio?.id === 42)
        .map((invio) => invio.messaggio)

      assert.equal(risposte.length, 1, 'La pagina deve ricevere esattamente una risposta per la richiesta 42')
      assert.equal(risposte[0].ok, true, 'L’esito della richiesta deve essere positivo')
      assert.deepEqual(risposte[0].creato, { id: 'mat-e2e-roundtrip' })

      // 8. Verifichiamo direttamente sul disco leggendo il file .regi grezzo (ZIP decompresso)
      const zipBytes = readFileSync(fileDestinazione)
      const voci = leggiZip(zipBytes)
      const voceRegistro = voci.find((v) => v.nome === 'registro.json')
      assert.ok(voceRegistro, 'registro.json deve essere presente fisicamente nell’archivio .regi')

      const jsonRegistro = JSON.parse(voceRegistro.dati.toString('utf8'))
      const materiaPersistita = jsonRegistro.materie?.find((materia) => materia.id === 'mat-e2e-roundtrip')
      assert.ok(materiaPersistita, 'La nuova materia deve essere presente in registro.json su disco')
      assert.equal(materiaPersistita.nome, 'Informatica Avanzata E2E')
      assert.equal(materiaPersistita.abbreviazione, 'IAE')
    } finally {
      PannelloRegistro.chiudi()
      PannelloRegistro.istanza = null
      await archivio.chiudi()
      archivio.dispose()
    }
  })
})
