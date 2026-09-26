// L'archivio ZIP scritto a mano: un `.regi` è uno ZIP vero, e quel che ci si
// scrive si rilegge uguale, accenti compresi. Un archivio rovinato si ferma
// col nome della voce nel messaggio, invece di dare un JSON troncato.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  apriZip,
  assembla,
  comprimi,
  crc32,
  leggiZip,
  scriviZip,
  sembraZip,
} from '../../dist-tests/zip.mjs'

const testo = (valore) => new TextEncoder().encode(valore)
const stringa = (dati) => new TextDecoder().decode(dati)

describe('lo ZIP del registro', () => {
  it('rilegge quel che ha scritto', () => {
    const voci = [
      { nome: 'classi.json', dati: testo('[{"nome":"I MEC A"}]') },
      { nome: '.storico/classi.2026-09-01-08-30.json', dati: testo('[]') },
    ]
    const letto = leggiZip(scriviZip(voci))

    assert.equal(letto.length, 2)
    assert.deepEqual(letto.map((v) => v.nome), [
      'classi.json',
      '.storico/classi.2026-09-01-08-30.json',
    ])
    assert.equal(stringa(letto[0].dati), '[{"nome":"I MEC A"}]')
  })

  it('tiene gli accenti nei nomi e nel contenuto', () => {
    const voci = [{ nome: 'perché così.json', dati: testo('{"nome":"Nicolò Müller — 3°"}') }]
    const letto = leggiZip(scriviZip(voci))

    assert.equal(letto[0].nome, 'perché così.json')
    assert.equal(stringa(letto[0].dati), '{"nome":"Nicolò Müller — 3°"}')
  })

  it('regge un contenuto che si comprime bene e uno che non si comprime affatto', () => {
    // Il primo passa da `deflate`, il secondo no (comprimerlo costerebbe di più):
    // due strade nello stesso archivio.
    const voci = [
      { nome: 'lungo.json', dati: testo('a'.repeat(20000)) },
      { nome: 'corto.json', dati: testo('[]') },
    ]
    const archivio = scriviZip(voci)
    const letto = leggiZip(archivio)

    assert.equal(stringa(letto[0].dati).length, 20000)
    assert.equal(stringa(letto[1].dati), '[]')
    // La compressione serve: ventimila caratteri non stanno interi lì dentro.
    assert.ok(archivio.length < 5000, `archivio di ${archivio.length} byte`)
  })

  it('accetta un archivio senza voci', () => {
    assert.deepEqual(leggiZip(scriviZip([])), [])
  })

  it('riconosce un archivio dai suoi primi byte', () => {
    assert.equal(sembraZip(scriviZip([{ nome: 'a.json', dati: testo('1') }])), true)
    assert.equal(sembraZip(testo('{"non":"uno zip"}')), false)
  })

  it('si ferma se il contenuto di una voce è stato toccato', () => {
    const archivio = scriviZip([{ nome: 'classi.json', dati: testo('[1,2,3]') }])
    // Un byte cambiato nel corpo della voce, come un file sincronizzato male.
    const rovinato = Buffer.from(archivio)
    rovinato[30 + 'classi.json'.length] ^= 0xff

    assert.throws(() => leggiZip(rovinato), /classi\.json/)
  })

  it('si ferma se non è un archivio', () => {
    assert.throws(() => leggiZip(testo('{"classi":[]}')), /non è un archivio/)
  })

  it('comprime ogni voce, anche la prima', () => {
    // La prima voce: `voci.map(comprimi)` passerebbe l'indice come livello, e la
    // voce zero resterebbe non compressa.
    const lungo = testo('a'.repeat(20000))
    const archivio = scriviZip([{ nome: 'primo.json', dati: lungo }])

    assert.ok(archivio.length < 1000, `la prima voce non è stata compressa: ${archivio.length} byte`)
    assert.equal(stringa(leggiZip(archivio)[0].dati).length, 20000)
  })

  it('apre le voci solo quando qualcuno le chiede', () => {
    const archivio = scriviZip([
      { nome: 'classi.json', dati: testo('[{"nome":"I MEC A"}]') },
      { nome: '.storico/classi.2026-09-01-08-00.json', dati: testo('[]') },
    ])
    const { voci } = apriZip(archivio)

    // Quel che si sa senza aprire niente: nome, misure, controllo.
    assert.deepEqual(voci.map((v) => v.nome), [
      'classi.json',
      '.storico/classi.2026-09-01-08-00.json',
    ])
    assert.equal(voci[0].originale, 20)
    assert.equal(stringa(voci[0].dati()), '[{"nome":"I MEC A"}]')
  })

  it('riusa i blocchi già compressi senza toccarne il contenuto', () => {
    const primo = scriviZip([{ nome: 'lezioni.json', dati: testo('[{"ora":1}]') }])
    const { voci: letto } = apriZip(primo)

    // Il blocco va in un archivio nuovo col nome diverso e senza `deflate`, come
    // una copia dello storico.
    const secondo = assembla([
      { ...letto[0], nome: '.storico/lezioni.2026-09-01-08-00.json' },
      comprimi({ nome: 'lezioni.json', dati: testo('[{"ora":2}]') }),
    ])

    const dopo = leggiZip(secondo)
    assert.deepEqual(dopo.map((v) => v.nome), [
      '.storico/lezioni.2026-09-01-08-00.json',
      'lezioni.json',
    ])
    assert.equal(stringa(dopo[0].dati), '[{"ora":1}]')
    assert.equal(stringa(dopo[1].dati), '[{"ora":2}]')
  })

  it('un blocco riusato porta con sé il proprio controllo', () => {
    const archivio = scriviZip([{ nome: 'classi.json', dati: testo('[1,2,3]') }])
    const { voci: letto } = apriZip(archivio)
    // Il CRC è quello dell'originale: chi legge si accorge se il blocco è rotto.
    assert.equal(letto[0].crc, crc32(testo('[1,2,3]')))
  })

  it('calcola il CRC che calcolano tutti', () => {
    // Il valore di riferimento di «123456789», la prova standard del CRC-32.
    assert.equal(crc32(testo('123456789')), 0xcbf43926)
  })
})
