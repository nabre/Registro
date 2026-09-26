// Il trasloco dalle cartelle ai documenti: gira una volta sola sui dati veri.
// Si parte da una `dati/` com'era (storico e file di scarto compresi): quel che
// c'era si ritrova nel documento, la cartella va nel cestino, e un anno che ha
// già il suo documento non si tocca.

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-trasloco-'))
const lavoro = percorso.join(radice, 'lavoro')
const dati = percorso.join(lavoro, 'registro')
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

after(() => rmSync(radice, { recursive: true, force: true }))

let impacchettaAnni
let leggiZip
let Uri
/** La radice su cui gira il trasloco: la cartella in cui stanno gli anni. */
let radiceDati

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(dati, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify({ cartellaLavoro: lavoro }),
  )

  ;({ impacchettaAnni } = await import('../../dist-tests/years.mjs'))
  ;({ leggiZip } = await import('../../dist-tests/zip.mjs'))
  ;({ Uri } = await import('../../dist-tests/data.mjs'))
  radiceDati = Uri.file(dati)
})

/** Una cartella d'anno com'era prima: `2026-2027/dati/` con dentro i JSON. */
function annoAllaVecchiaManiera (nome, extra = {}) {
  const cartella = percorso.join(dati, nome, 'dati')
  mkdirSync(percorso.join(cartella, '.storico'), { recursive: true })
  writeFileSync(
    percorso.join(cartella, 'registro.json'),
    JSON.stringify({ versione: 3, anno: { id: 'a1', etichetta: nome }, materie: [] }),
  )
  writeFileSync(percorso.join(cartella, 'classi.json'), '[{"nome":"I MEC A"}]')
  writeFileSync(percorso.join(cartella, '.storico', 'classi.2026-09-01-08-00.json'), '[]')
  for (const [file, contenuto] of Object.entries(extra)) {
    writeFileSync(percorso.join(cartella, file), contenuto)
  }
  return cartella
}

function vociDelDocumento (nome) {
  return leggiZip(readFileSync(percorso.join(dati, `${nome}.regi`))).map((v) => v.nome)
}

describe('dalle cartelle ai documenti', () => {
  it('impacchetta un anno e manda via la cartella di prima', async () => {
    const vecchia = annoAllaVecchiaManiera('2026-2027')

    assert.deepEqual(await impacchettaAnni(radiceDati), ['2026-2027'])

    const voci = vociDelDocumento('2026-2027')
    assert.ok(voci.includes('registro.json'), voci.join(', '))
    assert.ok(voci.includes('classi.json'), voci.join(', '))
    assert.ok(voci.includes('.storico/classi.2026-09-01-08-00.json'), voci.join(', '))
    assert.equal(existsSync(vecchia), false, 'la cartella «dati» di prima deve sparire')
    // La cartella dell'anno resta: dentro ci sono allegati ed esportazioni.
    assert.equal(existsSync(percorso.join(dati, '2026-2027')), true)
  })

  it('non ripassa su un anno già impacchettato', async () => {
    // `dati/` ricompare, portata da una macchina non ancora aggiornata.
    const tornata = annoAllaVecchiaManiera('2026-2027')

    assert.deepEqual(await impacchettaAnni(radiceDati), [])
    // Il documento di oggi non è coperto da quei file.
    assert.equal(existsSync(tornata), true)
    const dentro = leggiZip(readFileSync(percorso.join(dati, '2026-2027.regi')))
    assert.equal(dentro.length, 4)
  })

  it('lascia fuori quel che non sono dati', async () => {
    annoAllaVecchiaManiera('2027-2028', {
      'classi.json.tmp': '[',
      'classi.rotto-2027-01-01.json': '[{"nome":"rotto"}]',
      'appunti.txt': 'niente',
    })

    assert.deepEqual(await impacchettaAnni(radiceDati), ['2027-2028'])

    const voci = vociDelDocumento('2027-2028')
    assert.equal(voci.includes('classi.json.tmp'), false, voci.join(', '))
    assert.equal(voci.includes('appunti.txt'), false, voci.join(', '))
    // La copia di un file rotto entra: è l'unica copia di quel che non si era
    // saputo leggere.
    assert.ok(voci.includes('classi.rotto-2027-01-01.json'), voci.join(', '))
  })

  it('non tocca una cartella che non è un anno', async () => {
    mkdirSync(percorso.join(dati, 'appunti'), { recursive: true })

    assert.deepEqual(await impacchettaAnni(radiceDati), [])
    assert.equal(existsSync(percorso.join(dati, 'appunti.regi')), false)
  })
})
