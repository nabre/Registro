// La copia materializzata di un file dell'anno è quella di adesso:
//
//   1. con l'originale occupato (su Windows, un PDF aperto in Acrobat) la copia
//      nuova ha un nome segnato accanto, e chi la chiede per indirizzo riceve quello;
//   2. un file riscritto e salvato mentre la richiesta aspetta in fila non lascia
//      sul disco i byte vecchi segnati con l'impronta nuova.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, describe, it } from 'node:test'

import { Uri } from '../../dist-tests/environment.mjs'
import { Deposito } from '../../dist-tests/store.mjs'
import { Pacchetto } from '../../dist-tests/package.mjs'

const cartella = mkdtempSync(percorso.join(tmpdir(), 'registro-copie-'))
after(() => rmSync(cartella, { recursive: true, force: true }))

let contatore = 0

/** Un deposito su un documento nuovo, con la sua cartella di copie. */
async function deposito () {
  const numero = (contatore += 1)
  const pacchetto = await Pacchetto.apri(
    Uri.file(percorso.join(cartella, `anno-${numero}.regi`)),
  )
  const copie = Uri.file(percorso.join(cartella, `copie-${numero}`))
  return { deposito: new Deposito(() => pacchetto, copie), pacchetto }
}

/** Un PDF finto, riconoscibile dalla misura. */
function finoPdf (quanti) {
  const dati = Buffer.alloc(quanti)
  for (let n = 0; n < quanti; n += 1) dati[n] = (n * 11) % 256
  Buffer.from('%PDF-1.7\n', 'latin1').copy(dati, 0)
  return new Uint8Array(dati)
}

describe('le copie materializzate', () => {
  it('chiesta per indirizzo con l’originale occupato, torna la copia segnata accanto', async () => {
    const { deposito: d } = await deposito()
    d.scrivi('esportazioni/Presenze.pdf', finoPdf(256))
    const chiesto = Uri.joinPath(d.radice(), 'esportazioni', 'Presenze.pdf')
    // Una cartella al posto del file: la scrittura fallisce come su un PDF aperto.
    mkdirSync(chiesto.fsPath, { recursive: true })

    const dove = await d.materializzaChiesto(chiesto)

    assert.ok(dove && typeof dove === 'object', 'doveva tornare dove sta la copia')
    assert.equal(percorso.basename(dove.fsPath), 'Presenze ~2.pdf')
    assert.equal(readFileSync(dove.fsPath).length, 256)
  })

  it('fuori dalla cartella delle copie non materializza niente', async () => {
    const { deposito: d } = await deposito()
    d.scrivi('esportazioni/Presenze.pdf', finoPdf(64))
    assert.equal(await d.materializzaChiesto(Uri.file(percorso.join(cartella, 'altrove.pdf'))), null)
  })

  it('un file riscritto mentre la richiesta aspetta si copia com’è adesso', async () => {
    const { deposito: d, pacchetto } = await deposito()
    d.scrivi('esportazioni/Valutazioni.pdf', finoPdf(512))
    await pacchetto.salva()

    // La fila delle copie occupata finché la prova non la libera (`inFila` è
    // privato solo per TypeScript).
    let libera
    const occupata = d.inFila(() => new Promise((risolvi) => { libera = risolvi }))
    const chiesta = d.materializza('esportazioni/Valutazioni.pdf')

    // Riscritto e salvato: l'indice dello ZIP ha già il CRC nuovo.
    d.scrivi('esportazioni/Valutazioni.pdf', finoPdf(1024))
    await pacchetto.salva()
    libera()
    await occupata

    const dove = await chiesta
    assert.equal(readFileSync(dove.fsPath).length, 1024, 'la copia ha i byte di prima')
    // E la richiesta dopo non la crede aggiornata per sbaglio.
    const ancora = await d.materializza('esportazioni/Valutazioni.pdf')
    assert.equal(readFileSync(ancora.fsPath).length, 1024)
  })

  it('una copia già aggiornata non si decomprime di nuovo', async () => {
    const { pacchetto } = await deposito()
    pacchetto.deposita('esportazioni/Note.pdf', finoPdf(2048))
    await pacchetto.salva()
    // Riaperto dal disco: la voce ha il CRC nell'indice e non è ancora aperta.
    const riaperto = await Pacchetto.apri(pacchetto.file)
    const copie = Uri.file(percorso.join(cartella, `copie-riaperto-${contatore}`))
    const d = new Deposito(() => riaperto, copie)
    const prima = await d.materializza('esportazioni/Note.pdf')
    assert.equal(readFileSync(prima.fsPath).length, 2048)

    let letture = 0
    const originale = riaperto.bytes.bind(riaperto)
    riaperto.bytes = (nome) => { letture += 1; return originale(nome) }
    const dopo = await d.materializza('esportazioni/Note.pdf')
    assert.equal(dopo.fsPath, prima.fsPath)
    assert.equal(letture, 0, 'decompressa prima di guardare il CRC')
  })
})
