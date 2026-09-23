import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, beforeEach, it } from 'node:test'

const cartella = mkdtempSync(join(tmpdir(), 'registro-documenti-'))
process.env.REGISTRO_USERDATA = cartella
const d = await import('../../dist-tests/documents.mjs')
beforeEach(() => {
  writeFileSync(join(cartella, 'documenti.json'), '{"voci":[]}')
  d.ricaricaDocumenti()
})
after(() => rmSync(cartella, { recursive: true, force: true }))

it('il comando Apri richiama il guscio, con e senza percorso', async () => {
  const ricevuti = []
  d.installaMenu({ apriDocumento: async (percorso) => { ricevuti.push(percorso) } })
  await d.executeCommand('registroDocenti.apriDocumento')
  await d.executeCommand('registroDocenti.apriDocumento', join(cartella, '2026-2027.registro'))
  assert.deepEqual(ricevuti, [undefined, join(cartella, '2026-2027.registro')])
})

it('riaprire lo stesso file non duplica il recente e lo conserva al riavvio', () => {
  const file = join(cartella, '2026-2027.registro')
  writeFileSync(file, '')
  d.segnaDocumentoAperto(file)
  d.segnaDocumentoAperto(file)
  d.ricaricaDocumenti()
  assert.equal(d.documentiNoti().length, 1)
  assert.equal(d.documentiNoti()[0].mancante, false)
  assert.equal(d.documentiNoti()[0].nome, '2026-2027')
})

it('mantiene dodici recenti e conserva i preferiti anche quando il file manca', () => {
  const preferito = join(cartella, 'preferito.registro')
  d.impostaPreferito(preferito, true)
  for (let i = 0; i < 15; i++) d.segnaDocumentoAperto(join(cartella, `${i}.registro`))
  const elenco = d.documentiNoti()
  assert.equal(elenco.length, 13)
  assert.equal(elenco[0].percorso, preferito)
  assert.equal(elenco[0].mancante, true)
})

it('dimenticare un recente conserva il documento sul disco', () => {
  const file = join(cartella, 'da-conservare.registro')
  writeFileSync(file, 'esempio')
  d.segnaDocumentoAperto(file)
  d.dimenticaDocumento(file)
  assert.deepEqual(d.documentiNoti(), [])
  d.segnaDocumentoAperto(file)
  assert.equal(d.documentiNoti()[0].mancante, false)
})
