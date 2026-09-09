// Le impostazioni dello shim.
//
// Tre cose da tenere ferme: che i predefiniti vengano da `package.json` e non
// da un secondo elenco scritto a mano; che `affectsConfiguration` confronti per
// prefisso puntato, perché è così che `estensione.ts` e `pannello.ts` sanno se
// il cambiamento riguarda loro; e che `posta.autenticazione: 'vscode'` — il
// valore scritto nel file da chi usava l'estensione — adesso si legga
// `oauth`, perché l'account dell'editor qui non esiste.

import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { beforeEach, describe, it } from 'node:test'

process.env.REGISTRO_USERDATA = mkdtempSync(percorso.join(tmpdir(), 'registro-impostazioni-'))

const { ricaricaImpostazioni, workspace } = await import('../dist-prove/ambiente.mjs')
const { getConfiguration, onDidChangeConfiguration } = workspace

const FILE = percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json')

/** Scrive il file delle impostazioni come lo troverebbe l'app all'avvio. */
function scritte (valori) {
  writeFileSync(FILE, JSON.stringify(valori), 'utf8')
  ricaricaImpostazioni()
}

beforeEach(() => scritte({}))

describe('i predefiniti vengono da package.json', () => {
  it('li dà anche quando il file non dice niente', () => {
    const registro = getConfiguration('registroDocenti')

    assert.equal(registro.get('cartellaDati'), 'registro')
    assert.equal(registro.get('aperturaAutomatica'), true)
  })

  it('funziona con una sezione puntata, come la usa posta.ts', () => {
    const posta = getConfiguration('registroDocenti.posta')

    assert.equal(posta.get('porta'), 587)
    assert.equal(posta.get('server'), 'smtp.office365.com')
    assert.equal(posta.get('bozze'), 'file')
  })

  it('il ripiego passato dal chiamante non copre il predefinito', () => {
    // `percorsi.ts` chiama get('cartellaDati', CARTELLA_PREDEFINITA): i due
    // valori coincidono, ed è giusto che sia il manifesto a comandare.
    assert.equal(getConfiguration('registroDocenti').get('cartellaDati', 'altro'), 'registro')
  })

  it('quel che è scritto nel file vince sul predefinito', () => {
    scritte({ 'registroDocenti.cartellaDati': 'scuola/registro' })

    assert.equal(getConfiguration('registroDocenti').get('cartellaDati'), 'scuola/registro')
  })
})

describe('l’autenticazione «vscode» non esiste più', () => {
  it('il predefinito del manifesto è oauth', () => {
    assert.equal(getConfiguration('registroDocenti.posta').get('autenticazione'), 'oauth')
  })

  it('e chi ha «vscode» scritto nel file lo legge oauth', () => {
    // È il valore che si porta dietro chi ha usato l'estensione: l'account del
    // menu dell'editor non c'è più, e `oauth` è la stessa strada senza l'editor
    // in mezzo. La correzione sta nello shim, che è dove sta il resto della
    // traduzione fra il file di allora e l'applicazione di adesso.
    scritte({ 'registroDocenti.posta.autenticazione': 'vscode' })

    assert.equal(getConfiguration('registroDocenti.posta').get('autenticazione'), 'oauth')
  })

  it('gli altri modi restano quelli che sono', () => {
    scritte({ 'registroDocenti.posta.autenticazione': 'password' })

    assert.equal(getConfiguration('registroDocenti.posta').get('autenticazione'), 'password')
  })
})

describe('update scrive e avvisa chi guarda quel prefisso', () => {
  it('affectsConfiguration confronta per prefisso puntato', async () => {
    const visti = []
    const iscrizione = onDidChangeConfiguration((evento) => visti.push(evento))

    await getConfiguration('registroDocenti.posta').update('mittente', 'nome.cognome@edu.ti.ch')

    assert.equal(visti.length, 1)
    const [evento] = visti
    assert.ok(evento.affectsConfiguration('registroDocenti'))
    assert.ok(evento.affectsConfiguration('registroDocenti.posta'))
    assert.ok(evento.affectsConfiguration('registroDocenti.posta.mittente'))
    // Il pannello guarda `registroDocenti.ocr`: non si deve svegliare per la posta.
    assert.equal(evento.affectsConfiguration('registroDocenti.ocr'), false)
    // E un prefisso che è solo un pezzo di parola non conta.
    assert.equal(evento.affectsConfiguration('registroDocenti.post'), false)

    iscrizione.dispose()
  })

  it('il valore scritto si rilegge, anche dopo una ricarica', async () => {
    await getConfiguration('registroDocenti').update('cartellaDati', 'archivio')
    ricaricaImpostazioni()

    assert.equal(getConfiguration('registroDocenti').get('cartellaDati'), 'archivio')
  })

  it('undefined toglie la chiave e riporta il predefinito', async () => {
    const registro = getConfiguration('registroDocenti')
    await registro.update('cartellaDati', 'archivio')
    await registro.update('cartellaDati', undefined)

    assert.equal(getConfiguration('registroDocenti').get('cartellaDati'), 'registro')
  })
})
