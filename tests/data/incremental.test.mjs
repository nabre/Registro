// La scrittura incrementale del documento: le voci nuove si accodano in fondo
// e si riscrive solo l'indice, perché un anno pesa megabyte e la cartella
// sincronizzata ricaricherebbe tutto.
//
//   1. si scrive quanto la modifica, non quanto il documento;
//   2. i byte di prima non si toccano: chi sincronizza carica solo la coda;
//   3. un salvataggio interrotto lascia il documento *di prima* intero, perché
//      la coda che nomina le voci nuove si scrive per ultima.
//
// Lo spazio morto si misura: quando cresce troppo il documento si rifà.

import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, describe, it } from 'node:test'

import { Uri } from '../../dist-tests/environment.mjs'
import { Pacchetto } from '../../dist-tests/package.mjs'
import { leggiZip } from '../../dist-tests/zip.mjs'

const cartella = mkdtempSync(percorso.join(tmpdir(), 'registro-incrementale-'))
after(() => rmSync(cartella, { recursive: true, force: true }))

let contatore = 0
function documento () {
  return Uri.file(percorso.join(cartella, `anno-${(contatore += 1)}.regi`))
}

/** Un contenuto grosso abbastanza da far pesare la differenza: finge un PDF. */
function pesante (chilobyte) {
  return 'x'.repeat(chilobyte * 1024)
}

describe('la scrittura incrementale', () => {
  it('accoda invece di riscrivere: il file cresce di quanto è la modifica', async () => {
    const file = documento()
    const pacchetto = await Pacchetto.apri(file)
    pacchetto.scrivi('archivio/verifica.pdf', pesante(400))
    pacchetto.scrivi('lezioni.json', '[{"ora":1}]')
    await pacchetto.salva()
    const primaMisura = statSync(file.fsPath).size

    // Una modifica minuscola su un documento grosso.
    const riaperto = await Pacchetto.apri(file)
    riaperto.scrivi('lezioni.json', '[{"ora":2}]')
    await riaperto.salva()
    const dopo = statSync(file.fsPath).size

    const cresciuto = dopo - primaMisura
    assert.ok(cresciuto < 4096, `il file è cresciuto di ${cresciuto} byte: non ha accodato`)
    // E il contenuto è quello nuovo, con il pesante ancora al suo posto.
    const dentro = await Pacchetto.apri(file)
    assert.equal(dentro.testo('lezioni.json'), '[{"ora":2}]')
    assert.equal(dentro.testo('archivio/verifica.pdf').length, 400 * 1024)
  })

  it('non tocca i byte di prima', async () => {
    const file = documento()
    const pacchetto = await Pacchetto.apri(file)
    pacchetto.scrivi('archivio/verifica.pdf', pesante(200))
    pacchetto.scrivi('lezioni.json', '[1]')
    await pacchetto.salva()

    const prima = readFileSync(file.fsPath)
    const riaperto = await Pacchetto.apri(file)
    riaperto.scrivi('lezioni.json', '[2]')
    await riaperto.salva()
    const dopo = readFileSync(file.fsPath)

    // Il prefisso è identico: la cartella sincronizzata carica solo la coda.
    assert.ok(dopo.length > prima.length)
    assert.equal(
      Buffer.compare(dopo.subarray(0, prima.length - 512), prima.subarray(0, prima.length - 512)),
      0,
      'i byte di prima sono cambiati: non è una scrittura incrementale',
    )
  })

  it('un salvataggio interrotto lascia il documento di prima', async () => {
    const file = documento()
    const pacchetto = await Pacchetto.apri(file)
    pacchetto.scrivi('lezioni.json', '[{"ora":"buona"}]')
    pacchetto.scrivi('archivio/verifica.pdf', pesante(100))
    await pacchetto.salva()
    const intero = readFileSync(file.fsPath)

    // L'interruzione: i corpi nuovi in fondo, la coda che li nomina no, come se
    // mancasse la corrente.
    writeFileSync(file.fsPath, Buffer.concat([intero, Buffer.from(pesante(80), 'utf8')]))

    const dopo = await Pacchetto.apri(file)
    assert.equal(dopo.testo('lezioni.json'), '[{"ora":"buona"}]')
    assert.equal(dopo.testo('archivio/verifica.pdf').length, 100 * 1024)
  })

  it('rifà il documento da capo quando lo spazio morto è troppo', async () => {
    const file = documento()
    const pacchetto = await Pacchetto.apri(file)
    pacchetto.scrivi('lezioni.json', pesante(300))
    await pacchetto.salva()

    // Riscritture ripetute della stessa voce grossa: ogni giro lascia dietro la
    // versione di prima, e prima o poi il documento si rifà.
    let compattato = false
    for (let n = 0; n < 8; n += 1) {
      const giro = await Pacchetto.apri(file)
      giro.scrivi('lezioni.json', `${pesante(300)}${n}`)
      await giro.salva()
      if (giro.sprecato === 0) compattato = true
    }

    assert.ok(compattato, 'lo spazio morto non è mai stato recuperato')
    const finale = statSync(file.fsPath).size
    // Otto riscritture da 300 KB senza compattazione farebbero due megabyte e
    // mezzo di spazio morto.
    assert.ok(finale < 1_500_000, `il documento è rimasto a ${finale} byte`)

    const dentro = await Pacchetto.apri(file)
    assert.equal(dentro.testo('lezioni.json').endsWith('7'), true)
  })

  it('resta un archivio che aprirebbe chiunque, anche dopo le accodate', async () => {
    const file = documento()
    const pacchetto = await Pacchetto.apri(file)
    pacchetto.scrivi('classi.json', '[{"nome":"I MEC A"}]')
    await pacchetto.salva()

    for (const testo of ['[1]', '[1,2]', '[1,2,3]']) {
      const giro = await Pacchetto.apri(file)
      giro.scrivi('lezioni.json', testo)
      await giro.salva()
    }

    // Letto da fuori, senza `Pacchetto`: l'indice nomina l'ultima versione di ogni
    // voce, una volta sola.
    const voci = leggiZip(readFileSync(file.fsPath))
    const nomi = voci.map((v) => v.nome)
    assert.equal(new Set(nomi).size, nomi.length, `voci ripetute nell’indice: ${nomi.join(', ')}`)
    const lezioni = voci.find((v) => v.nome === 'lezioni.json')
    assert.equal(new TextDecoder().decode(lezioni.dati), '[1,2,3]')
  })

  it('conserva le copie senza riscrivere quel che copia', async () => {
    const file = documento()
    const pacchetto = await Pacchetto.apri(file)
    pacchetto.scrivi('lezioni.json', pesante(200))
    await pacchetto.salva()
    const primaMisura = statSync(file.fsPath).size

    const riaperto = await Pacchetto.apri(file)
    riaperto.conserva('lezioni.json', 10)
    riaperto.scrivi('lezioni.json', '[]')
    await riaperto.salva()

    // La copia in `.storico/` riusa il blocco compresso: il file cresce di quel
    // blocco, non del contenuto crudo.
    const cresciuto = statSync(file.fsPath).size - primaMisura
    assert.ok(cresciuto < 20_000, `il file è cresciuto di ${cresciuto} byte`)

    const dentro = await Pacchetto.apri(file)
    const copie = dentro.copieDi('lezioni')
    assert.equal(copie.length, 1)
    assert.equal(dentro.testo(copie[0]).length, 200 * 1024)
  })
})
