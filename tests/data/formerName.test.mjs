// Il nome precedente: la cartella dei dati da rinominare e i percorsi scritti dentro.
//
// Il trasloco gira una volta sola sui dati veri di un docente: qui lo si fa su
// una cartella temporanea, in tutti i casi che l'avvio può incontrare.

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, describe, it } from 'node:test'

import {
  riscriviPercorsi,
  traslocaDati,
} from '../../dist-tests/formerName.mjs'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-nome-precedente-'))
after(() => rmSync(radice, { recursive: true, force: true }))

let giro = 0
/** Una cartella del sistema tutta per la prova, con dentro solo quel che si dice. */
function sistema () {
  const cartella = percorso.join(radice, `sistema-${++giro}`)
  mkdirSync(cartella, { recursive: true })
  return {
    vecchia: percorso.join(cartella, 'Registro docenti'),
    nuova: percorso.join(cartella, 'Regiclass'),
  }
}

function scriviJson (file, valore) {
  mkdirSync(percorso.dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(valore, null, 2)}\n`)
}

const leggiJson = (file) => JSON.parse(readFileSync(file, 'utf8'))

describe('il trasloco della cartella dei dati', () => {
  it('senza la cartella vecchia non fa niente', () => {
    const { vecchia, nuova } = sistema()
    assert.deepEqual(traslocaDati(vecchia, nuova), { esito: 'niente' })
    assert.equal(existsSync(nuova), false)
  })

  it('rinomina la vecchia, con dentro tutto', () => {
    const { vecchia, nuova } = sistema()
    mkdirSync(percorso.join(vecchia, 'modelli-linguistici'), { recursive: true })
    writeFileSync(percorso.join(vecchia, 'modelli-linguistici', 'modello.gguf'), 'pesi')
    writeFileSync(percorso.join(vecchia, 'Local State'), '{}')
    const esito = traslocaDati(vecchia, nuova)
    assert.equal(esito.esito, 'traslocata')
    assert.equal(existsSync(vecchia), false)
    assert.equal(readFileSync(percorso.join(nuova, 'modelli-linguistici', 'modello.gguf'), 'utf8'), 'pesi')
    assert.equal(existsSync(percorso.join(nuova, 'Local State')), true, 'la chiave dei segreti viaggia con la cartella')
  })

  it('con tutte e due presenti usa la nuova e non tocca la vecchia', () => {
    const { vecchia, nuova } = sistema()
    scriviJson(percorso.join(vecchia, 'impostazioni.json'), { a: 'vecchia' })
    scriviJson(percorso.join(nuova, 'impostazioni.json'), { a: 'nuova' })
    assert.deepEqual(traslocaDati(vecchia, nuova), { esito: 'entrambe' })
    assert.deepEqual(leggiJson(percorso.join(vecchia, 'impostazioni.json')), { a: 'vecchia' })
    assert.deepEqual(leggiJson(percorso.join(nuova, 'impostazioni.json')), { a: 'nuova' })
  })

  it('se la rinomina fallisce lo dice, e la vecchia resta com’è', () => {
    const { vecchia } = sistema()
    mkdirSync(vecchia)
    // Un posto dove non si può rinominare: dentro un file.
    const bloccato = percorso.join(radice, `file-${giro}`)
    writeFileSync(bloccato, '')
    const esito = traslocaDati(vecchia, percorso.join(bloccato, 'Regiclass'))
    assert.equal(esito.esito, 'fallita')
    assert.ok(esito.motivo.length > 0)
    assert.equal(existsSync(vecchia), true)
  })

  it('riscrive i percorsi che cominciano con la cartella vecchia, e solo quelli', () => {
    const { vecchia, nuova } = sistema()
    const provvisorio = percorso.join(vecchia, 'anni-nuovi', 'abc1', '2026-2027.regi')
    scriviJson(percorso.join(vecchia, 'impostazioni.json'), {
      'registroDocenti.ultimoDocumento': provvisorio,
      'registroDocenti.modelli.cartella': percorso.join(vecchia, 'modelli-linguistici'),
      'registroDocenti.ocr.cartella': percorso.join(vecchia, 'lettura'),
      'registroDocenti.dettatura.cartella': vecchia,
      // Il documento del docente sta altrove: resta com'è.
      cartellaLavoro: 'D:\\Scuola',
      altro: 'D:\\Scuola\\2025-2026.regi',
      // Un nome che comincia allo stesso modo non è la stessa cartella.
      vicino: `${vecchia}2\\file`,
      numero: 3,
    })
    scriviJson(percorso.join(vecchia, 'documenti.json'), [
      { percorso: provvisorio, preferito: false },
      { percorso: 'D:\\Scuola\\2026-2027.regi', preferito: true },
    ])
    writeFileSync(percorso.join(vecchia, 'finestre.json'), JSON.stringify({ dove: vecchia }))
    mkdirSync(percorso.dirname(provvisorio), { recursive: true })
    writeFileSync(provvisorio, 'PK')
    mkdirSync(percorso.join(vecchia, 'anni-nuovi', 'abc1', '2026-2027'))

    const esito = traslocaDati(vecchia, nuova)
    assert.equal(esito.esito, 'traslocata')
    assert.deepEqual(esito.riscritti, ['impostazioni.json', 'documenti.json'])
    const nuovoProvvisorio = percorso.join(nuova, 'anni-nuovi', 'abc1', '2026-2027.regi')
    assert.equal(existsSync(nuovoProvvisorio), true)
    assert.equal(existsSync(percorso.join(nuova, 'anni-nuovi', 'abc1', '2026-2027')), true)

    assert.deepEqual(leggiJson(percorso.join(nuova, 'impostazioni.json')), {
      'registroDocenti.ultimoDocumento': nuovoProvvisorio,
      'registroDocenti.modelli.cartella': percorso.join(nuova, 'modelli-linguistici'),
      'registroDocenti.ocr.cartella': percorso.join(nuova, 'lettura'),
      'registroDocenti.dettatura.cartella': nuova,
      cartellaLavoro: 'D:\\Scuola',
      altro: 'D:\\Scuola\\2025-2026.regi',
      vicino: `${vecchia}2\\file`,
      numero: 3,
    })
    assert.deepEqual(leggiJson(percorso.join(nuova, 'documenti.json')), [
      { percorso: nuovoProvvisorio, preferito: false },
      { percorso: 'D:\\Scuola\\2026-2027.regi', preferito: true },
    ])
    // Gli altri file non si guardano.
    assert.deepEqual(leggiJson(percorso.join(nuova, 'finestre.json')), { dove: vecchia })
  })

  it('un file illeggibile resta com’è, e non ferma il resto', () => {
    const { vecchia } = sistema()
    mkdirSync(vecchia, { recursive: true })
    writeFileSync(percorso.join(vecchia, 'impostazioni.json'), '{ rotto')
    scriviJson(percorso.join(vecchia, 'documenti.json'), [{ percorso: percorso.join(vecchia, 'x') }])
    assert.deepEqual(riscriviPercorsi(vecchia, vecchia, percorso.join(radice, 'altrove')), ['documenti.json'])
    assert.equal(readFileSync(percorso.join(vecchia, 'impostazioni.json'), 'utf8'), '{ rotto')
  })
})
