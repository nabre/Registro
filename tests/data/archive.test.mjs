// L'archivio con un disco vero: si crea un anno, ci si mette una classe, si
// spegne e si riaccende, come ogni docente a settembre.
//
// Cartella di lavoro e impostazioni sono temporanee e si scrivono *prima* di
// importare l'archivio, perché lo shim legge il file una volta sola.

import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

/** La cartella di lavoro di questa prova, e il finto `userData` accanto. */
const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-archivio-'))
const lavoro = percorso.join(radice, 'lavoro')
const impostazioni = percorso.join(radice, 'userData')
process.env.REGISTRO_USERDATA = impostazioni

after(() => rmSync(radice, { recursive: true, force: true }))

/** La cartella dei dati: `lavoro/registro`, che è il predefinito. */
const dati = percorso.join(lavoro, 'registro')

let Archivio
let Uri
let leggiZip
let creaAnnoCorrente
let creaClasse

/**
 * Il documento di un anno nella cartella dei dati: la barra dell'etichetta
 * (`2026/2027`) si sostituisce come fa il registro.
 */
const documentoDi = (etichetta) =>
  Uri.file(percorso.join(dati, `${etichetta.replace(/[/]+/g, '-')}.regi`))

before(async () => {
  const { mkdirSync } = await import('node:fs')
  mkdirSync(impostazioni, { recursive: true })
  mkdirSync(dati, { recursive: true })
  writeFileSync(
    percorso.join(impostazioni, 'impostazioni.json'),
    JSON.stringify({ cartellaLavoro: lavoro }),
  )

  // Dal bundle dello strato dati: serve anche `Uri`.
  ;({ Archivio, Uri } = await import('../../dist-tests/data.mjs'))
  ;({ leggiZip } = await import('../../dist-tests/zip.mjs'))
  ;({ creaAnnoCorrente, creaClasse } = await import('../../dist-tests/domain.mjs'))
})

/** Le voci di un documento sul disco, per nome. */
function dentroIlDocumento (cartella) {
  const file = percorso.join(dati, `${cartella}.regi`)
  return leggiZip(readFileSync(file))
}

describe('l’archivio su un anno vero', () => {
  it('crea un anno, lo scrive in un documento solo e lo rilegge', async () => {
    const archivio = new Archivio()
    await archivio.apri(null)
    assert.equal(archivio.registro.anni.length, 0)

    const proposto = creaAnnoCorrente()
    const anno = await archivio.creaAnno(proposto, documentoDi(proposto.etichetta))
    assert.ok(anno?.cartella, 'l’anno nuovo deve avere la sua cartella')
    const cartella = anno.cartella

    archivio.modifica((registro) => {
      registro.classi.push(creaClasse(anno.id, 'I MEC A'))
    }, ['classi'])
    await archivio.salva()

    // Sul disco: il documento e la cartella dei suoi allegati, nient'altro.
    assert.equal(existsSync(percorso.join(dati, `${cartella}.regi`)), true)
    assert.equal(existsSync(percorso.join(dati, cartella)), true)
    assert.equal(existsSync(percorso.join(dati, cartella, 'dati')), false)

    const voci = dentroIlDocumento(cartella).map((v) => v.nome)
    assert.ok(voci.includes('manifesto.json'), `manifesto assente: ${voci.join(', ')}`)
    assert.ok(voci.includes('registro.json'), `intestazione assente: ${voci.join(', ')}`)
    assert.ok(voci.includes('classi.json'), `classi assenti: ${voci.join(', ')}`)

    await archivio.chiudi()
    archivio.dispose()

    // Riaperto da zero, consegnando l'indirizzo del documento.
    const dopo = new Archivio()
    await dopo.apri(documentoDi(cartella))
    assert.equal(dopo.registro.anni.length, 1)
    assert.equal(dopo.cartellaCorrente, cartella)
    assert.deepEqual(dopo.registro.classi.map((c) => c.nome), ['I MEC A'])
    await dopo.chiudi()
    dopo.dispose()
  })

  it('mette da parte com’era prima di riscrivere', async () => {
    const archivio = new Archivio()
    await archivio.apri(documentoDi(creaAnnoCorrente().etichetta))
    const cartella = archivio.cartellaCorrente
    assert.ok(cartella, 'la prova precedente deve aver lasciato un anno aperto')

    archivio.modifica((registro) => {
      registro.classi[0].nome = 'I MEC B'
    }, ['classi'])
    await archivio.salva()

    const copie = dentroIlDocumento(cartella)
      .map((v) => v.nome)
      .filter((nome) => nome.startsWith('.storico/classi.'))
    assert.equal(copie.length, 1, 'la versione di prima deve restare dentro il documento')
    // Nella copia c'è il nome di prima.
    const copia = dentroIlDocumento(cartella).find((v) => v.nome === copie[0])
    assert.match(new TextDecoder().decode(copia.dati), /I MEC A/)

    await archivio.chiudi()
    archivio.dispose()
  })

  it('lascia libero il documento quando si chiude', async () => {
    const archivio = new Archivio()
    await archivio.apri(documentoDi(creaAnnoCorrente().etichetta))
    const cartella = archivio.cartellaCorrente
    const serratura = percorso.join(dati, `.${cartella}.regi.serratura`)

    // Aperto: la serratura c'è, e dice questa macchina.
    assert.equal(existsSync(serratura), true)

    await archivio.chiudi()
    assert.equal(existsSync(serratura), false)
    archivio.dispose()
  })

})
