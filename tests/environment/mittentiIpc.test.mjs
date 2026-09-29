// Tutte le finestre del registro parlano sullo stesso canale IPC: ogni
// ascoltatore deve scartare i messaggi che non vengono dalla sua finestra. Se
// no, la pagina del pannello (che mostra HTML di piani lezione altrui) potrebbe
// chiudere il benvenuto con un documento a scelta, rispondere a un dialogo di
// conferma al posto di chi guarda o leggere le preferenze di un altro pannello.

import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, beforeEach, describe, it } from 'node:test'

import { finestreCostruite, ipcMain } from '../helpers/fake-electron.mjs'
import { importaSorgente } from '../helpers/sorgente.mjs'

const DATI = mkdtempSync(percorso.join(tmpdir(), 'registro-mittenti-'))
process.env.REGISTRO_USERDATA = DATI
process.env.REGISTRO_APPPATH = percorso.join(DATI, 'app', 'dist')
after(() => rmSync(DATI, { recursive: true, force: true }))

// Un bundle solo: menu, benvenuto, dialoghi e finestre devono condividere lo
// stato dei moduli, come nel main process.
const { installaMenu, mostraBenvenuto, comandi, dialoghi, finestre, ViewColumn } =
  await importaSorgente(`export { installaMenu } from './desktop/shell/windows/menu.ts'
export { mostraBenvenuto } from './desktop/shell/windows/welcome.ts'
export { comandi, dialoghi, finestre, ViewColumn } from 'apparato'
`)

const CANALE_INTERFACCIA = 'registro:interfaccia'

beforeEach(() => {
  for (const finestra of finestreCostruite) finestra.close()
  finestreCostruite.length = 0
})

/** La finestra nata durante `apri`. */
function nataDa (apri) {
  const primo = finestreCostruite.length
  const esito = apri()
  return { esito, finestra: finestreCostruite[primo] }
}

/** Il pannello del registro: il mittente estraneo più realistico. */
function pannello () {
  return nataDa(() => finestre.crea('registroDocenti.pannello', 'Registro', ViewColumn.One, {})).finestra
}

/** Vero se la promessa è ancora in sospeso dopo che i messaggi hanno avuto il tempo di arrivare. */
async function inSospeso (promessa) {
  const segnale = Symbol('sospeso')
  const attesa = new Promise((risolvi) => setTimeout(() => risolvi(segnale), 20))
  const esito = await Promise.race([promessa, attesa])
  return esito === segnale
}

describe('la finestra delle impostazioni', () => {
  it('ascolta solo la sua pagina', async () => {
    installaMenu({ apriDocumento: async () => {} })
    const estraneo = pannello()
    const { finestra } = nataDa(() => comandi.esegui('registroDocenti.impostazioniFinestra'))
    assert.ok(finestra, 'la finestra delle impostazioni è nata')

    ipcMain.simulaDallaPagina(estraneo.webContents.id, { impostazioni: 'pronto' })
    ipcMain.simulaDallaPagina(estraneo.webContents.id, { impostazioni: 'apriPannello' })
    await new Promise((risolvi) => setImmediate(risolvi))
    assert.equal(finestra.isVisible(), false, 'un altro mittente non la mostra')
    assert.equal(finestra.isDestroyed(), false, 'un altro mittente non la chiude')

    ipcMain.simulaDallaPagina(finestra.webContents.id, { impostazioni: 'pronto' })
    await new Promise((risolvi) => setImmediate(risolvi))
    assert.equal(finestra.isVisible(), true)
  })
})

describe('il benvenuto', () => {
  it('una scelta da un’altra finestra non lo conclude', async () => {
    const estraneo = pannello()
    const { esito, finestra } = nataDa(() => mostraBenvenuto({ scegliDocumento: async () => null }))

    ipcMain.simulaDallaPagina(estraneo.webContents.id, { benvenuto: 'apriPercorso', percorso: 'C:/altro.regi' })
    ipcMain.simulaDallaPagina(estraneo.webContents.id, { benvenuto: 'esci' })
    assert.equal(await inSospeso(esito), true)
    assert.equal(finestra.isDestroyed(), false)

    // Dalla sua pagina, un messaggio senza discriminante si scarta anche lui.
    ipcMain.simulaDallaPagina(finestra.webContents.id, { tipo: 'esci' })
    assert.equal(await inSospeso(esito), true)

    ipcMain.simulaDallaPagina(finestra.webContents.id, { benvenuto: 'esci' })
    assert.equal(await esito, null)
  })
})

describe('i dialoghi', () => {
  it('rispondono solo alla loro pagina, e solo a una risposta', async () => {
    const estraneo = pannello()
    estraneo.finisciCaricamento()
    const { esito, finestra } = nataDa(() => dialoghi.avvisa('Eliminare la lezione?', { modal: true }, 'Elimina'))

    ipcMain.simulaDallaPagina(estraneo.webContents.id, { dialogo: 'conferma', indice: 1 })
    assert.equal(await inSospeso(esito), true, 'un altro mittente non conferma')

    ipcMain.simulaDallaPagina(finestra.webContents.id, { benvenuto: 'esci' })
    assert.equal(await inSospeso(esito), true, 'un messaggio che non è una risposta non conta')

    ipcMain.simulaDallaPagina(finestra.webContents.id, { dialogo: 'conferma', indice: 1 })
    assert.equal(await esito, 'Elimina')
  })
})

describe('lo stato dell’interfaccia', () => {
  it('un mittente che non è un pannello legge null e non scrive', () => {
    pannello()
    const lettura = { sender: { id: 987654 } }
    ipcMain.emetti(CANALE_INTERFACCIA, lettura, 'leggi')
    assert.equal(lettura.returnValue, null)

    ipcMain.emetti(CANALE_INTERFACCIA, { sender: { id: 987654 } }, 'scrivi', { vista: 'calendario' })
    assert.equal(existsSync(percorso.join(DATI, 'interfaccia')), false)
  })

  it('il pannello legge quel che ha scritto', () => {
    const suo = pannello()
    ipcMain.emetti(CANALE_INTERFACCIA, { sender: { id: suo.webContents.id } }, 'scrivi', { vista: 'calendario' })
    const lettura = { sender: { id: suo.webContents.id } }
    ipcMain.emetti(CANALE_INTERFACCIA, lettura, 'leggi')
    assert.deepEqual(lettura.returnValue, { vista: 'calendario' })
  })
})
