// I file dell'anno dentro il documento. Un PDF entra ed esce identico, byte per
// byte: passato per una stringa, la decodifica UTF-8 lo rovinerebbe.
//
// Chi sa aprire solo file (il lettore PDF, pdfjs, i webview) riceve una copia
// su disco, rifatta solo quando il contenuto cambia.

import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, describe, it } from 'node:test'

import { Uri } from '../../dist-tests/environment.mjs'
import { Deposito } from '../../dist-tests/store.mjs'
import { Pacchetto } from '../../dist-tests/package.mjs'

const cartella = mkdtempSync(percorso.join(tmpdir(), 'registro-deposito-'))
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

/** Byte che nessuna codifica di testo sopravviverebbe: è il caso vero. */
function finoPdf (quanti = 4096) {
  const dati = Buffer.alloc(quanti)
  for (let n = 0; n < quanti; n += 1) dati[n] = (n * 7) % 256
  // La firma di un PDF in testa, così somiglia a quel che ci finirà davvero.
  Buffer.from('%PDF-1.7\n', 'latin1').copy(dati, 0)
  return new Uint8Array(dati)
}

describe('il deposito', () => {
  it('un file binario entra ed esce identico', async () => {
    const { deposito: d, pacchetto } = await deposito()
    const pdf = finoPdf()
    d.scrivi('archivio/DIC4a/DIC4a_Verifica 1_testo.pdf', pdf)
    await pacchetto.salva()

    const riaperto = await Pacchetto.apri(pacchetto.file)
    const riletto = new Deposito(() => riaperto, Uri.file(cartella))
    const uscito = riletto.leggi('archivio/DIC4a/DIC4a_Verifica 1_testo.pdf')

    assert.equal(uscito.length, pdf.length)
    assert.equal(Buffer.compare(Buffer.from(uscito), Buffer.from(pdf)), 0, 'il file è tornato diverso')
  })

  it('elenca quel che c’è sotto un percorso, e le sue cartelle', async () => {
    const { deposito: d } = await deposito()
    d.scrivi('archivio/DIC4a/classe/verbale.pdf', finoPdf(64))
    d.scrivi('archivio/DIC4a/allievi/Rossi Maria/pagella.pdf', finoPdf(64))
    d.scrivi('esportazioni/DIC4a/medie.pdf', finoPdf(64))
    d.scrivi('lezioni.json', new TextEncoder().encode('[]'))

    assert.deepEqual(d.elenca('archivio'), [
      'archivio/DIC4a/allievi/Rossi Maria/pagella.pdf',
      'archivio/DIC4a/classe/verbale.pdf',
    ])
    assert.deepEqual(d.sottocartelle('archivio/DIC4a'), ['allievi', 'classe'])
    assert.deepEqual(d.fileIn('archivio/DIC4a/classe'), ['archivio/DIC4a/classe/verbale.pdf'])
    // Uno spazio nel nome va bene: sono nomi di voci, non percorsi del sistema.
    assert.equal(d.esiste('archivio/DIC4a/allievi/Rossi Maria/pagella.pdf'), true)
  })

  it('non esce dal documento nemmeno se glielo si chiede', async () => {
    const { deposito: d } = await deposito()
    d.scrivi('../fuori.pdf', finoPdf(32))

    // La risalita si scarta: resta un nome dentro il documento.
    assert.equal(d.esiste('fuori.pdf'), true)
    assert.deepEqual(d.elenca(''), ['fuori.pdf'])
  })

  it('materializza un file e non lo riestrae se non è cambiato', async () => {
    const { deposito: d } = await deposito()
    const pdf = finoPdf(2048)
    d.scrivi('archivio/DIC4a_Presenze.pdf', pdf)

    const dove = await d.materializza('archivio/DIC4a_Presenze.pdf')
    assert.ok(dove, 'il file doveva essere materializzato')
    // Il nome resta quello: l'utente lo legge nella finestra del lettore.
    assert.equal(percorso.basename(dove.fsPath), 'DIC4a_Presenze.pdf')
    assert.equal(Buffer.compare(readFileSync(dove.fsPath), Buffer.from(pdf)), 0)

    // Seconda richiesta: stessa copia, non riscritta.
    const primaVolta = statSync(dove.fsPath).mtimeMs
    const ancora = await d.materializza('archivio/DIC4a_Presenze.pdf')
    assert.equal(ancora.fsPath, dove.fsPath)
    assert.equal(statSync(dove.fsPath).mtimeMs, primaVolta, 'la copia è stata rifatta per niente')
  })

  it('rifà la copia quando il contenuto cambia', async () => {
    const { deposito: d } = await deposito()
    d.scrivi('archivio/rapporto.pdf', finoPdf(512))
    const dove = await d.materializza('archivio/rapporto.pdf')

    const nuovo = finoPdf(1024)
    d.scrivi('archivio/rapporto.pdf', nuovo)
    const dopo = await d.materializza('archivio/rapporto.pdf')

    assert.equal(dopo.fsPath, dove.fsPath)
    assert.equal(readFileSync(dopo.fsPath).length, 1024)
  })

  it('sposta un file senza toccarne il contenuto', async () => {
    const { deposito: d } = await deposito()
    const pdf = finoPdf(128)
    d.scrivi('quarantena/ignoto.pdf', pdf)

    assert.equal(d.sposta('quarantena/ignoto.pdf', 'archivio/DIC4a/pagella.pdf'), true)
    assert.equal(d.esiste('quarantena/ignoto.pdf'), false)
    assert.equal(Buffer.compare(Buffer.from(d.leggi('archivio/DIC4a/pagella.pdf')), Buffer.from(pdf)), 0)
  })

  it('butta via una cartella intera', async () => {
    const { deposito: d } = await deposito()
    d.scrivi('esportazioni/DIC4a/uno.pdf', finoPdf(32))
    d.scrivi('esportazioni/DIC4a/due.pdf', finoPdf(32))
    d.scrivi('archivio/tenuto.pdf', finoPdf(32))

    assert.equal(d.eliminaSotto('esportazioni'), 2)
    assert.deepEqual(d.elenca(''), ['archivio/tenuto.pdf'])
  })

  it('buttando via un file butta via anche la sua copia', async () => {
    const { deposito: d } = await deposito()
    d.scrivi('esportazioni/composizioni/Consiglio.pdf', finoPdf(64))
    const dove = await d.materializza('esportazioni/composizioni/Consiglio.pdf')
    assert.ok(existsSync(dove.fsPath))

    assert.equal(d.elimina('esportazioni/composizioni/Consiglio.pdf'), true)
    // La copia se ne va per conto suo: si aspetta la coda delle copie.
    await d.smaterializza('esportazioni/composizioni/Consiglio.pdf')
    assert.equal(
      existsSync(dove.fsPath),
      false,
      'la copia resta apribile: un documento buttato via si aprirebbe lo stesso',
    )
  })

  it('e lo stesso posto si rimaterializza subito dopo, senza scontri', async () => {
    const { deposito: d } = await deposito()
    d.scrivi('esportazioni/rifatto.pdf', finoPdf(64))
    await d.materializza('esportazioni/rifatto.pdf')

    // Buttato e rifatto nello stesso istante: la cancellazione della copia vecchia
    // non si porta via quella nuova.
    d.elimina('esportazioni/rifatto.pdf')
    d.scrivi('esportazioni/rifatto.pdf', finoPdf(128))
    const dove = await d.materializza('esportazioni/rifatto.pdf')

    assert.ok(dove && existsSync(dove.fsPath), 'la copia nuova è stata portata via dalla vecchia')
    assert.equal(readFileSync(dove.fsPath).length, 128)
  })

  it('butta via anche le copie di una cartella intera', async () => {
    const { deposito: d } = await deposito()
    d.scrivi('esportazioni/DIC4a/uno.pdf', finoPdf(32))
    const dove = await d.materializza('esportazioni/DIC4a/uno.pdf')

    d.eliminaSotto('esportazioni')
    await d.smaterializza('esportazioni/DIC4a/uno.pdf')
    assert.equal(existsSync(dove.fsPath), false)
  })

  it('smontando butta le copie e non i dati', async () => {
    const { deposito: d } = await deposito()
    d.scrivi('archivio/foglio.pdf', finoPdf(64))
    const dove = await d.materializza('archivio/foglio.pdf')

    await d.smonta()
    assert.equal(existsSync(dove.fsPath), false, 'la copia doveva sparire')
    // E il documento non ha perso niente: le copie erano copie.
    assert.equal(d.leggi('archivio/foglio.pdf').length, 64)
  })
})
