// L'archivio con un disco vero sotto.
//
// Le altre prove dei dati guardano un pezzo per volta — lo ZIP, il documento —
// e questa guarda il giro intero: si crea un anno, ci si mette dentro una
// classe, si spegne e si riaccende. È il percorso che fa ogni docente ogni
// settembre, ed è quello in cui un errore non si vede subito: un file scritto
// dove non si rilegge sembra funzionare finché non si riapre l'applicazione il
// giorno dopo.
//
// La cartella di lavoro è temporanea e le impostazioni pure: si scrivono
// *prima* di importare l'archivio, perché lo shim legge il file una volta sola
// e se lo tiene.

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
let leggiZip
let creaAnnoCorrente
let creaClasse

before(async () => {
  const { mkdirSync } = await import('node:fs')
  mkdirSync(impostazioni, { recursive: true })
  mkdirSync(dati, { recursive: true })
  writeFileSync(
    percorso.join(impostazioni, 'impostazioni.json'),
    JSON.stringify({ cartellaLavoro: lavoro }),
  )

  ;({ Archivio } = await import('../../dist-prove/archivio.mjs'))
  ;({ leggiZip } = await import('../../dist-prove/zip.mjs'))
  ;({ creaAnnoCorrente, creaClasse } = await import('../../dist-prove/dominio.mjs'))
})

/** Le voci di un documento sul disco, per nome. */
function dentroIlDocumento (cartella) {
  const file = percorso.join(dati, `${cartella}.registro`)
  return leggiZip(readFileSync(file))
}

describe('l’archivio su un anno vero', () => {
  it('crea un anno, lo scrive in un documento solo e lo rilegge', async () => {
    const archivio = new Archivio()
    await archivio.carica()
    assert.equal(archivio.registro.anni.length, 0)

    const anno = await archivio.creaAnno(creaAnnoCorrente())
    assert.ok(anno?.cartella, 'l’anno nuovo deve avere la sua cartella')
    const cartella = anno.cartella

    archivio.modifica((registro) => {
      registro.classi.push(creaClasse(anno.id, 'I MEC A'))
    }, ['classi'])
    await archivio.salva()

    // Sul disco: un documento e la cartella dei suoi allegati, e nient'altro.
    // Nessun `dati/`, nessun JSON sciolto.
    assert.equal(existsSync(percorso.join(dati, `${cartella}.registro`)), true)
    assert.equal(existsSync(percorso.join(dati, cartella)), true)
    assert.equal(existsSync(percorso.join(dati, cartella, 'dati')), false)

    const voci = dentroIlDocumento(cartella).map((v) => v.nome)
    assert.ok(voci.includes('manifesto.json'), `manifesto assente: ${voci.join(', ')}`)
    assert.ok(voci.includes('registro.json'), `intestazione assente: ${voci.join(', ')}`)
    assert.ok(voci.includes('classi.json'), `classi assenti: ${voci.join(', ')}`)

    await archivio.chiudi()
    archivio.dispose()

    // E riaperto da zero, come farebbe il registro il giorno dopo.
    const dopo = new Archivio()
    await dopo.carica()
    assert.equal(dopo.registro.anni.length, 1)
    assert.equal(dopo.cartellaCorrente, cartella)
    assert.deepEqual(dopo.registro.classi.map((c) => c.nome), ['I MEC A'])
    await dopo.chiudi()
    dopo.dispose()
  })

  it('mette da parte com’era prima di riscrivere', async () => {
    const archivio = new Archivio()
    await archivio.carica()
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
    // E dentro la copia c'è il nome di prima: è quel che si va a cercare
    // quando ci si accorge di aver corretto la cosa sbagliata.
    const copia = dentroIlDocumento(cartella).find((v) => v.nome === copie[0])
    assert.match(new TextDecoder().decode(copia.dati), /I MEC A/)

    await archivio.chiudi()
    archivio.dispose()
  })

  it('lascia libero il documento quando si chiude', async () => {
    const archivio = new Archivio()
    await archivio.carica()
    const cartella = archivio.cartellaCorrente
    const serratura = percorso.join(dati, `.${cartella}.registro.serratura`)

    // Aperto: la serratura c'è, e dice questa macchina.
    assert.equal(existsSync(serratura), true)

    await archivio.chiudi()
    assert.equal(existsSync(serratura), false)
    archivio.dispose()
  })

  it('butta insieme le due metà di un anno eliminato', async () => {
    const archivio = new Archivio()
    await archivio.carica()
    const anno = archivio.registro.anni[0]
    const cartella = anno.cartella

    assert.equal(await archivio.eliminaAnno(anno.id), true)
    assert.equal(existsSync(percorso.join(dati, `${cartella}.registro`)), false)
    assert.equal(existsSync(percorso.join(dati, cartella)), false)
    assert.equal(archivio.registro.anni.length, 0)

    await archivio.chiudi()
    archivio.dispose()
  })
})
