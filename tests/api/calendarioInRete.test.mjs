// Un'origine di calendario scritta nel documento si legge anche su un'altra
// macchina: un percorso di rete (`\\server\quota`, `file://server/…`) vorrebbe
// dire una connessione SMB, che su Windows manda da sola l'impronta della
// password. Si rifiuta prima di aprire. E un file vero con righe piegate a metà
// di un carattere arriva nella copia senza «�».

import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-calendario-rete-')

let api
let archivio

before(async () => {
  ;({ api, archivio } = await archivioDiProva({ lavoro, dati, deposito: true, pdfAutomatici: 'mai' }))
})

after(() => smonta(radice, archivio))

describe('un calendario in una cartella di rete', () => {
  for (const origine of [
    '\\\\regiklass-prova.invalid\\quota\\orario.ics',
    '//regiklass-prova.invalid/quota/orario.ics',
    'file://regiklass-prova.invalid/quota/orario.ics',
    'file:////regiklass-prova.invalid/quota/orario.ics',
    '\\\\?\\UNC\\regiklass-prova.invalid\\quota\\orario.ics',
  ]) {
    it(`non si apre: ${origine}`, async () => {
      const esito = await api.chiama(archivio, 'calendario.aggiungi', { origine })
      assert.equal(esito.ok, false)
      assert.match(esito.messaggi.join(' '), /cartella di rete/)
      assert.ok(!esito.messaggi.join(' ').includes('regiklass-prova'), 'il messaggio dice il percorso')
      assert.equal(archivio.registro.impostazioni.calendario, undefined)
    })
  }
})

describe('un file con una riga piegata a metà di un carattere', () => {
  it('arriva nella copia con il carattere intero', async () => {
    const file = percorso.join(radice, 'piegato.ics')
    const trattino = Buffer.from('—')
    writeFileSync(file, Buffer.concat([
      Buffer.from([
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'BEGIN:VEVENT',
        'UID:piegato',
        'DTSTART:20260915T082000',
        'DTEND:20260915T090500',
        'SUMMARY:Matematica ',
      ].join('\r\n')),
      trattino.subarray(0, 1),
      Buffer.from('\r\n '),
      trattino.subarray(1),
      Buffer.from([' I MEC A', 'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n')),
    ]))
    const esito = await api.chiama(archivio, 'calendario.aggiungi', { origine: file })
    assert.equal(esito.ok, true, JSON.stringify(esito).slice(0, 400))
    const [aggiunto] = archivio.registro.impostazioni.calendario.calendari
    const copia = archivio.deposito.leggiTesto(`calendari/${aggiunto.id}.ics`)
    assert.ok(copia, 'la copia non è nel documento')
    assert.ok(!copia.includes('�'), 'il carattere spezzato è diventato «�»')
    assert.match(copia, /SUMMARY:Matematica — I MEC A/)
  })
})
