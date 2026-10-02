// Due programmi sullo stesso `.regi`: il Regiklass installato e `npm run dev`
// (cartelle dati diverse, stesso documento). È il caso del 1/10: un indice
// accodato che nominava i corpi di un archivio compattato, mentre al loro posto
// c'erano i corpi di un altro.
//
//   1. due rifacimenti insieme non si scrivono nello stesso temporaneo: con un
//      `.regi.tmp` comune, chi tronca e riscrive mentre l'altro finisce lascia
//      un file mescolato che misura e finisce come quello dell'altro, e le
//      accodate dopo passano il controllo e puntano a corpi che non ci sono;
//   2. prima di accodare si confronta l'indice intero, non i 22 byte della
//      coda, che due archivi con le stesse misure hanno uguali;
//   3. la serratura sta accanto al documento, non nella cartella dati: chi apre
//      «lo stesso» non copre la serratura viva dell'altro, e chiudendo non
//      cancella quella che non è sua.

import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire, syncBuiltinESMExports } from 'node:module'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, describe, it } from 'node:test'

import { Uri } from '../../dist-tests/environment.mjs'
import { Pacchetto } from '../../dist-tests/package.mjs'
import { apriZip, crc32, leggiZip } from '../../dist-tests/zip.mjs'

const cartella = mkdtempSync(percorso.join(tmpdir(), 'registro-due-programmi-'))
after(() => rmSync(cartella, { recursive: true, force: true }))

let contatore = 0
function documento () {
  return Uri.file(percorso.join(cartella, `anno-${(contatore += 1)}.regi`))
}

/** Byte che non si comprimono: un PDF. */
function casuali (quanti) {
  const byte = new Uint8Array(quanti)
  let stato = 0x2545f491
  for (let i = 0; i < quanti; i += 1) {
    stato ^= stato << 13
    stato ^= stato >>> 17
    stato ^= stato << 5
    byte[i] = stato & 0xff
  }
  return byte
}

/**
 * Sostituisce per la durata di `lavoro` alcune funzioni di `node:fs/promises`,
 * anche nei bundle che le importano come modulo ES (`syncBuiltinESMExports`).
 */
async function conFs (sostituite, lavoro) {
  const fsp = createRequire(import.meta.url)('node:fs/promises')
  const originali = {}
  for (const [nome, crea] of Object.entries(sostituite)) {
    originali[nome] = fsp[nome]
    fsp[nome] = crea(fsp[nome].bind(fsp))
  }
  syncBuiltinESMExports()
  try {
    return await lavoro()
  } finally {
    Object.assign(fsp, originali)
    syncBuiltinESMExports()
  }
}

describe('due programmi sullo stesso documento', () => {
  it('due rifacimenti insieme non si mescolano: le accodate dopo nominano corpi veri', async () => {
    const file = documento()
    const iniziale = Pacchetto.nuovo(file)
    iniziale.scrivi('data/registro.json', '{"versione":1}')
    iniziale.scrivi('data/lezioni.json', '[]')
    await iniziale.salva()

    // Tutti e due hanno letto lo stesso file; il primo ci aggiunge molto.
    const primo = await Pacchetto.apri(file)
    const secondo = await Pacchetto.apri(file)
    primo.deposita('archivio/verifica.pdf', casuali(200 * 1024))
    secondo.scrivi('data/classi.json', '[{"nome":"1A"}]')

    // La scena, resa ripetibile: il primo scrive metà del suo temporaneo; il
    // secondo apre il suo (troncando, se è lo stesso), lo scrive tutto e lo
    // chiude; il primo finisce la sua metà e rinomina; il secondo rinomina dopo.
    let aperti = 0
    let secondoScritto
    const scritto = new Promise((risolvi) => { secondoScritto = risolvi })
    let primoRinominato
    const rinominato = new Promise((risolvi) => { primoRinominato = risolvi })
    let rinomine = 0
    let esitoSecondo = null

    await conFs({
      open: (open) => async (dove, modo, ...resto) => {
        const handle = await open(dove, modo, ...resto)
        if (modo !== 'w' || !String(dove).startsWith(cartella)) return handle
        aperti += 1
        if (aperti === 1) {
          return new Proxy(handle, {
            get (bersaglio, chiave) {
              if (chiave === 'writeFile') {
                return async (dati) => {
                  const metà = Math.floor(dati.length / 2)
                  await bersaglio.write(dati, 0, metà, 0)
                  esitoSecondo = secondo.salva({ compatta: true }).then(() => null, (errore) => errore)
                  await scritto
                  await bersaglio.write(dati, metà, dati.length - metà, metà)
                }
              }
              const valore = Reflect.get(bersaglio, chiave)
              return typeof valore === 'function' ? valore.bind(bersaglio) : valore
            },
          })
        }
        if (aperti === 2) {
          return new Proxy(handle, {
            get (bersaglio, chiave) {
              if (chiave === 'close') {
                return async () => {
                  await bersaglio.close()
                  secondoScritto()
                }
              }
              const valore = Reflect.get(bersaglio, chiave)
              return typeof valore === 'function' ? valore.bind(bersaglio) : valore
            },
          })
        }
        return handle
      },
      rename: (rename) => async (da, a) => {
        if (!String(da).startsWith(cartella)) return rename(da, a)
        rinomine += 1
        // La prima rinomina che arriva è del secondo: aspetta quella del primo.
        if (rinomine === 1) {
          await rinominato
          return rename(da, a)
        }
        try {
          return await rename(da, a)
        } finally {
          primoRinominato()
        }
      },
    }, async () => {
      await primo.salva({ compatta: true })
      await esitoSecondo
    })

    // Il primo continua a lavorare: una modifica piccola, che vorrebbe accodare.
    primo.scrivi('data/lezioni.json', '[{"ora":1}]')
    await primo.salva()

    // Il documento si apre, e ogni voce si legge: chi ha salvato per ultimo copre.
    assert.doesNotThrow(() => leggiZip(readFileSync(file.fsPath)))
    const riaperto = await Pacchetto.apri(file)
    assert.equal(riaperto.testo('data/lezioni.json'), '[{"ora":1}]')
    assert.equal(riaperto.bytes('archivio/verifica.pdf')?.length, 200 * 1024)
  })

  it('un file con le stesse misure e la stessa coda ma un altro indice non si accoda', async () => {
    const file = documento()
    const pacchetto = Pacchetto.nuovo(file)
    pacchetto.deposita('archivio/foto.jpg', casuali(4096))
    await pacchetto.salva()

    // Un altro programma riscrive la foto con byte diversi della stessa misura:
    // stessa disposizione, stessa coda di 22 byte, CRC diverso nell'indice.
    const byte = readFileSync(file.fsPath)
    const { voci, inizioIndice } = apriZip(byte)
    const foto = voci.find((voce) => voce.nome === 'archivio/foto.jpg')
    const inizio = foto.offset + 30 + Buffer.byteLength(foto.nome)
    byte[inizio] ^= 0xff
    const crc = crc32(byte.subarray(inizio, inizio + foto.corpo.length))
    byte.writeUInt32LE(crc, foto.offset + 14)
    const nelIndice = byte.indexOf(Buffer.from(foto.nome), inizioIndice) - 46
    byte.writeUInt32LE(crc, nelIndice + 16)
    writeFileSync(file.fsPath, byte)

    pacchetto.scrivi('data/lezioni.json', '[]')
    await pacchetto.salva()

    // Chi salva per ultimo copre: la foto è la nostra, intera.
    assert.doesNotThrow(() => leggiZip(readFileSync(file.fsPath)))
    const riaperto = await Pacchetto.apri(file)
    assert.ok(Buffer.from(casuali(4096)).equals(riaperto.bytes('archivio/foto.jpg')))
  })

  it('chi apre lo stesso non copre la serratura viva dell’altro, e chiudendo non la cancella', async () => {
    const file = documento()
    const nome = percorso.basename(file.fsPath)
    const serratura = percorso.join(cartella, `.${nome}.serratura`)
    // Il Regiklass installato: un altro processo vivo di questa macchina. Il
    // processo che ha lanciato le prove fa la sua parte.
    const installato = {
      macchina: process.env.COMPUTERNAME ?? process.env.HOSTNAME ?? 'computer',
      utente: process.env.USERNAME ?? process.env.USER ?? '',
      processo: process.ppid,
      aperto: '2026-09-30T08:00:00.000Z',
    }
    writeFileSync(serratura, JSON.stringify(installato))

    // `npm run dev`: vede la serratura, apre lo stesso, lavora, chiude.
    assert.equal((await Pacchetto.chiLoTiene(file))?.processo, process.ppid)
    const dev = await Pacchetto.apri(file)
    await dev.prendi()
    dev.scrivi('data/lezioni.json', '[]')
    await dev.salva()
    await dev.lascia()

    // L'installato è ancora aperto: il prossimo che arriva deve saperlo.
    assert.deepEqual(JSON.parse(readFileSync(serratura, 'utf8')), installato)
    assert.equal((await Pacchetto.chiLoTiene(file))?.processo, process.ppid)
  })

  it('chiudendo si toglie la propria serratura, non quella scritta da altri dopo', async () => {
    const file = documento()
    const nome = percorso.basename(file.fsPath)
    const serratura = percorso.join(cartella, `.${nome}.serratura`)
    const pacchetto = await Pacchetto.apri(file)
    await pacchetto.prendi()
    assert.equal((await Pacchetto.chiLoTiene(file))?.processo, process.pid)

    // Un'altra macchina, via OneDrive, l'ha presa dopo di noi.
    const altra = { macchina: 'SALA-DOCENTI', utente: 'collega', processo: 1234, aperto: '2026-10-01T14:00:00.000Z' }
    writeFileSync(serratura, JSON.stringify(altra))
    await pacchetto.lascia()
    assert.deepEqual(JSON.parse(readFileSync(serratura, 'utf8')), altra)

    // Senza nessuno in mezzo, la propria se ne va.
    const ancora = await Pacchetto.apri(file)
    rmSync(serratura)
    await ancora.prendi()
    await ancora.lascia()
    assert.equal(await Pacchetto.chiLoTiene(file), null)
  })
})
