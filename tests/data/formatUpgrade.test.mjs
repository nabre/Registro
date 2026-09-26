// I campioni del formato. In `tests/samples/formato/` c'è un documento vero
// per ogni versione dei dati, fissato da `npm run sample`. Ciascuno si copia e
// si apre con l'archivio vero:
//
//   - si apre con tutto quel che c'era dentro;
//   - una versione precedente si porta al formato di oggi, lo si dice, e prima
//     se ne mette da parte una copia identica;
//   - riscritto, dichiara la versione di oggi e non ha più niente da portare;
//   - la versione di oggi non si tocca e non dice niente.
//
// Alzare `VERSIONE_DATI` senza fissare il campione è rosso. Vedi la skill
// `formato`.

import assert from 'node:assert/strict'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import * as percorso from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

import { cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-formato-')
const CAMPIONI = percorso.join(percorso.dirname(fileURLToPath(import.meta.url)), '..', 'samples', 'formato')

/**
 * Da quale versione un campione è obbligatorio: i passi del formato sono nati
 * alla 6.
 */
const PRIMO_OBBLIGATORIO = 1

let Archivio
let Uri
let leggiZip
let VERSIONE_DATI

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(dati, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify({ cartellaLavoro: lavoro }),
  )
  ;({ Archivio, Uri } = await import('../../dist-tests/data.mjs'))
  ;({ leggiZip } = await import('../../dist-tests/zip.mjs'))
  ;({ VERSIONE_DATI } = await import('../../dist-tests/domain.mjs'))
})

after(() => smonta(radice))

/** I campioni che ci sono, per versione. */
function campioni () {
  return readdirSync(CAMPIONI)
    .map((nome) => /^v(\d+)\.regi$/.exec(nome))
    .filter(Boolean)
    .map((trovato) => ({ versione: Number(trovato[1]), file: percorso.join(CAMPIONI, trovato[0]) }))
    .sort((a, b) => a.versione - b.versione)
}

/** Le voci del documento sul disco, come JSON. */
function vociSulDisco (file) {
  const voci = leggiZip(readFileSync(file))
  return new Map(voci.map((v) => [v.nome, new TextDecoder().decode(v.dati)]))
}

let contatore = 0
/** Il campione copiato in una cartella tutta sua, come starebbe sul disco di un docente. */
function copiaDel (campione) {
  contatore += 1
  const cartella = percorso.join(radice, `anni-${contatore}`)
  mkdirSync(cartella, { recursive: true })
  const file = percorso.join(cartella, '2026-2027.regi')
  copyFileSync(campione.file, file)
  return file
}

/** Apre un documento con l'archivio vero, e raccoglie quel che dice. */
async function apri (file) {
  const archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  const avvisi = []
  const errori = []
  archivio.allAvviso((testo) => avvisi.push(testo))
  archivio.allErrore((testo) => errori.push(testo))
  const registro = await archivio.apri(Uri.file(file))
  return { archivio, registro, avvisi, errori }
}

describe('i campioni del formato', () => {
  it('c’è quello di ogni versione da quando i passi esistono', () => {
    const presenti = new Set(campioni().map((c) => c.versione))
    for (let versione = PRIMO_OBBLIGATORIO; versione <= VERSIONE_DATI; versione += 1) {
      assert.ok(
        presenti.has(versione),
        `manca tests/samples/formato/v${versione}.regi: con VERSIONE_DATI a ${versione} ` +
          'lancia npm run sample, che lo fissa (skill «formato»)',
      )
    }
  })
})

describe('i documenti campione del formato', () => {
  for (const campione of campioni()) {
    it(`v${campione.versione}: si apre intero e resta della versione di oggi`, async () => {
      const file = copiaDel(campione)
      const originale = readFileSync(file)
      const { archivio, registro, avvisi, errori } = await apri(file)
      assert.deepEqual(errori, [])

      // Il campione ha una classe con tre persone, un corso e tre ore.
      assert.equal(registro.classi.length, 1)
      assert.equal(registro.classi[0].allievi.length, 3)
      assert.equal(registro.corsi.length, 1)
      assert.equal(registro.lezioni.length, 3)
      assert.equal(registro.impostazioni.minutiUd, 45)

      const copia = percorso.join(
        percorso.dirname(file), '2026-2027', 'versioni-precedenti',
        `2026-2027.formato-${campione.versione}.regi`,
      )
      if (campione.versione < VERSIONE_DATI) {
        assert.equal(avvisi.length, 1, JSON.stringify(avvisi))
        assert.match(avvisi[0], new RegExp(`dal formato ${campione.versione} al ${VERSIONE_DATI}`))
        assert.ok(avvisi[0].includes('versioni-precedenti'), avvisi[0])
        assert.ok(existsSync(copia), 'la copia com’era non c’è')
        assert.deepEqual(readFileSync(copia), originale, 'la copia non è il documento com’era')
      } else {
        assert.deepEqual(avvisi, [])
        assert.equal(existsSync(copia), false)
      }

      await archivio.salva()
      await archivio.chiudi()

      const voci = vociSulDisco(file)
      assert.equal(JSON.parse(voci.get('registro.json')).versione, VERSIONE_DATI)
      for (const collezione of ['classi.json', 'corsi.json', 'lezioni.json']) {
        assert.ok(voci.has(collezione), `${collezione} manca dal documento riscritto`)
      }

      // Riaperto, è un documento di oggi: niente da portare, niente da dire.
      const dopo = await apri(file)
      assert.deepEqual(dopo.avvisi, [])
      assert.deepEqual(dopo.errori, [])
      assert.equal(dopo.registro.lezioni.length, 3)
      await dopo.archivio.chiudi()
    })
  }

  it('le pause e la durata dell’UD del campione di oggi arrivano intere', async () => {
    const oggi = campioni().find((c) => c.versione === VERSIONE_DATI)
    assert.ok(oggi)
    const { archivio, registro } = await apri(copiaDel(oggi))
    assert.deepEqual(registro.impostazioni.pause, {
      prima: { inizio: '09:50', durataMin: 15 },
      seguenti: [{ dopoUd: 2, durataMin: 10 }],
    })
    await archivio.chiudi()
  })
})
