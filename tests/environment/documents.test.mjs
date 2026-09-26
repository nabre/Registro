import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, beforeEach, describe, it } from 'node:test'

const cartella = mkdtempSync(join(tmpdir(), 'registro-documenti-'))
process.env.REGISTRO_USERDATA = cartella
const d = await import('../../dist-tests/documents.mjs')
const elencoScritto = join(cartella, 'documenti.json')
beforeEach(async () => {
  // Una verifica lasciata a metà dalla prova di prima finisce qui.
  await d.verificaDocumenti()
  writeFileSync(elencoScritto, '{"voci":[]}')
  d.ricaricaDocumenti()
})
after(() => rmSync(cartella, { recursive: true, force: true }))

/** Un `.regi` vero sul disco, nella cartella delle prove. */
function anno (nome) {
  const file = join(cartella, `${nome}.regi`)
  writeFileSync(file, 'PK')
  return file
}

/** I percorsi scritti in `documenti.json`: quel che il prossimo avvio vedrà. */
function scritti () {
  const letto = JSON.parse(readFileSync(elencoScritto, 'utf8'))
  return (Array.isArray(letto) ? letto : letto.voci).map((v) => v.percorso)
}

describe('i documenti recenti', () => {
  it('il comando Apri richiama il guscio, con e senza percorso', async () => {
    const ricevuti = []
    d.installaMenu({ apriDocumento: async (percorso) => { ricevuti.push(percorso) } })
    await d.executeCommand('registroDocenti.apriDocumento')
    await d.executeCommand('registroDocenti.apriDocumento', join(cartella, '2026-2027.regi'))
    assert.deepEqual(ricevuti, [undefined, join(cartella, '2026-2027.regi')])
  })

  it('riaprire lo stesso file non duplica il recente e lo conserva al riavvio', async () => {
    const file = anno('2026-2027')
    d.segnaDocumentoAperto(file)
    d.segnaDocumentoAperto(file)
    d.ricaricaDocumenti()
    await d.verificaDocumenti()
    assert.equal(d.documentiNoti().length, 1)
    assert.equal(d.documentiNoti()[0].mancante, false)
    assert.equal(d.documentiNoti()[0].nome, '2026-2027')
  })

  it('lo stesso file scritto in un altro modo è una voce sola, e prende il percorso nuovo', () => {
    const file = anno('stesso')
    d.segnaDocumentoAperto(file)
    // Un segmento `..` in mezzo, e su Windows anche barre e maiuscole diverse: è
    // sempre lui.
    const giro = join(cartella, 'sotto', '..', 'stesso.regi')
    const altro = process.platform === 'win32' ? giro.replace(/\\/g, '/').toUpperCase() : giro
    d.segnaDocumentoAperto(altro)
    const elenco = d.documentiNoti()
    assert.equal(elenco.length, 1)
    // Scritto assoluto e pulito, senza il `..`.
    assert.ok(!elenco[0].percorso.includes('..'))
  })

  it('i doppioni scritti da una versione di prima si fondono alla lettura, stella compresa', () => {
    const file = anno('doppio')
    const altro = process.platform === 'win32' ? file.toUpperCase() : join(cartella, '.', 'doppio.regi')
    writeFileSync(elencoScritto, JSON.stringify({
      voci: [
        { percorso: file, ultimoUso: 10 },
        { percorso: altro, preferito: true, ultimoUso: 5 },
      ],
    }))
    d.ricaricaDocumenti()
    const elenco = d.documentiNoti()
    assert.equal(elenco.length, 1)
    assert.equal(elenco[0].preferito, true)
    assert.equal(elenco[0].percorso, file)
  })

  it('l’ultimo aperto va in testa, anche nello stesso millesimo di secondo', () => {
    const primo = anno('primo')
    const secondo = anno('secondo')
    const terzo = anno('terzo')
    d.segnaDocumentoAperto(primo)
    d.segnaDocumentoAperto(secondo)
    d.segnaDocumentoAperto(terzo)
    assert.deepEqual(d.documentiNoti().map((v) => v.nome), ['terzo', 'secondo', 'primo'])
    d.segnaDocumentoAperto(primo)
    assert.deepEqual(d.documentiNoti().map((v) => v.nome), ['primo', 'terzo', 'secondo'])
  })

  it('mantiene dodici recenti, i più freschi, e i preferiti in cima', () => {
    const preferito = anno('preferito')
    d.impostaPreferito(preferito, true)
    for (let i = 0; i < 15; i++) d.segnaDocumentoAperto(anno(`anno-${i}`))
    const elenco = d.documentiNoti()
    assert.equal(elenco.length, 13)
    assert.equal(elenco[0].percorso, preferito)
    assert.equal(elenco[1].nome, 'anno-14')
    assert.ok(!elenco.some((v) => v.nome === 'anno-2'))
  })

  it('un file sparito da una cartella che c’è esce dall’elenco scritto, preferito o no', async () => {
    const resta = anno('resta')
    const sparisce = anno('sparisce')
    const stellato = anno('stellato')
    d.segnaDocumentoAperto(resta)
    d.segnaDocumentoAperto(sparisce)
    d.impostaPreferito(stellato, true)
    await d.verificaDocumenti()
    assert.equal(d.documentiNoti().length, 3)

    rmSync(sparisce)
    rmSync(stellato)
    await d.verificaDocumenti()
    assert.deepEqual(d.documentiNoti().map((v) => v.percorso), [resta])
    // Tolto dal file, non solo nascosto: il prossimo avvio non lo rivede.
    assert.deepEqual(scritti(), [resta])
  })

  it('una cartella che non risponde tiene la voce, detta non disponibile', async () => {
    // La chiavetta staccata: non c'è il file e non c'è nemmeno la sua cartella.
    const staccato = join(cartella, 'chiavetta', 'scuola.regi')
    d.impostaPreferito(staccato, true)
    d.segnaDocumentoAperto(join(cartella, 'chiavetta', 'altro.regi'))
    await d.verificaDocumenti()
    const elenco = d.documentiNoti()
    assert.equal(elenco.length, 2)
    assert.ok(elenco.every((v) => v.mancante))
    assert.equal(scritti().length, 2)

    // Riattaccata: tornano disponibili, senza che nessuno le abbia riscritte.
    mkdirSync(join(cartella, 'chiavetta'))
    writeFileSync(staccato, 'PK')
    writeFileSync(join(cartella, 'chiavetta', 'altro.regi'), 'PK')
    await d.verificaDocumenti()
    assert.ok(d.documentiNoti().every((v) => !v.mancante))
  })

  it('voci che non sono anni — relative, senza estensione, cartelle — escono alla verifica', async () => {
    const buono = anno('buono')
    const cartellaFintoAnno = join(cartella, 'finto.regi')
    mkdirSync(cartellaFintoAnno, { recursive: true })
    writeFileSync(join(cartella, 'appunti.txt'), 'x')
    writeFileSync(elencoScritto, JSON.stringify({
      voci: [
        { percorso: buono, ultimoUso: 3 },
        { percorso: 'relativo.regi', ultimoUso: 2 },
        { percorso: join(cartella, 'appunti.txt'), ultimoUso: 1 },
        { percorso: cartellaFintoAnno, ultimoUso: 0 },
        { percorso: 42 },
        null,
      ],
    }))
    d.ricaricaDocumenti()
    await d.verificaDocumenti()
    assert.deepEqual(d.documentiNoti().map((v) => v.percorso), [buono])
    assert.deepEqual(scritti(), [buono])
    rmSync(cartellaFintoAnno, { recursive: true })
  })

  it('un anno riaperto mentre la verifica guarda non viene tolto', async () => {
    const file = join(cartella, 'appena-salvato.regi')
    d.segnaDocumentoAperto(file)
    // La verifica parte con il file ancora assente; intanto il «salva con nome»
    // lo scrive e l'archivio lo riapre.
    const verifica = d.verificaDocumenti()
    writeFileSync(file, 'PK')
    d.segnaDocumentoAperto(file)
    await verifica
    await d.verificaDocumenti()
    assert.deepEqual(d.documentiNoti().map((v) => v.percorso), [file])
  })

  it('la verifica avvisa chi guarda l’elenco quando toglie qualcosa', async () => {
    const file = anno('avvisato')
    d.segnaDocumentoAperto(file)
    await d.verificaDocumenti()
    const ricevuti = []
    const iscrizione = d.alCambioDocumenti((elenco) => ricevuti.push(elenco.length))
    rmSync(file)
    await d.verificaDocumenti()
    iscrizione.dispose()
    assert.deepEqual(ricevuti, [0])
  })

  it('un anno aperto mentre documenti.json non si legge entra lo stesso, e si scrive dopo', () => {
    // L'elenco non si lascia leggere (qui una cartella al suo posto, dal vero
    // l'antivirus): il deposito non scrive, e l'anno aspetta.
    rmSync(elencoScritto)
    mkdirSync(elencoScritto)
    d.ricaricaDocumenti()
    const primo = anno('bloccato-1')
    d.segnaDocumentoAperto(primo)
    assert.deepEqual(d.documentiNoti().map((v) => v.percorso), [primo])

    // Sbloccato: alla scrittura dopo entrano tutti e due, nell'ordine giusto.
    rmSync(elencoScritto, { recursive: true })
    const secondo = anno('bloccato-2')
    d.segnaDocumentoAperto(secondo)
    assert.deepEqual(scritti().sort(), [primo, secondo].sort())
    d.ricaricaDocumenti()
    assert.deepEqual(d.documentiNoti().map((v) => v.percorso), [secondo, primo])
  })

  it('dimenticare un recente conserva il documento sul disco', () => {
    const file = anno('da-conservare')
    d.segnaDocumentoAperto(file)
    d.dimenticaDocumento(file)
    assert.deepEqual(d.documentiNoti(), [])
    d.segnaDocumentoAperto(file)
    assert.equal(d.documentiNoti()[0].mancante, false)
    assert.equal(readFileSync(file, 'utf8'), 'PK')
  })

  it('un cambiamento che non cambia niente non avvisa nessuno', () => {
    // `ricordaEtichetta` arriva a ogni voto salvato: con lo stesso nome non rifà
    // menu, vassoio e pannello, né rilancia la verifica.
    const file = anno('etichettato')
    d.segnaDocumentoAperto(file, '2026/27')
    let avvisi = 0
    const iscrizione = d.alCambioDocumenti(() => { avvisi += 1 })
    d.ricordaEtichetta(file, '2026/27')
    d.impostaPreferito(file, false)
    d.dimenticaDocumento(join(cartella, 'mai-visto.regi'))
    assert.equal(avvisi, 0)
    // Un nome nuovo, invece, si dice.
    d.ricordaEtichetta(file, '2027/28')
    iscrizione.dispose()
    assert.equal(avvisi, 1)
    assert.equal(d.documentiNoti()[0].etichetta, '2027/28')
  })
})
