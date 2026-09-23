// Le cartelle temporanee di voce e di pagine rimaste da un giro precedente.
//
// `whisper.ts` e `mtmd.ts` le cancellano nel loro `finally`, ma quando Windows
// si spegne con il registro aperto quel `finally` non gira: restano in `%TEMP%`
// l'audio di una dettatura e la scansione di un foglio firmato. Qui si prova la
// rete che le toglie all'avvio — solo le vecchie, solo quelle con i due
// prefissi, e senza mai sollevare.

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'

import { importaSorgente } from './bundleDiProva.mjs'

const { ripulisciTemporaneiVecchi } = await importaSorgente('src/data/temporanei.ts')

const ORA = 60 * 60 * 1000

/** Una cartella con un file dentro, invecchiata di `eta` millisecondi. */
function cartellaVecchia (radice, nome, eta, adesso) {
  const cartella = join(radice, nome)
  mkdirSync(cartella)
  writeFileSync(join(cartella, 'pagina.png'), 'finto')
  const quando = new Date(adesso - eta)
  utimesSync(cartella, quando, quando)
  return cartella
}

describe('ripulisciTemporaneiVecchi', () => {
  it('toglie le cartelle di voce e di pagine più vecchie di un\'ora, e nient\'altro', async () => {
    const radice = mkdtempSync(join(tmpdir(), 'registro-prova-temporanei-'))
    const adesso = Date.now()
    try {
      const pagina = cartellaVecchia(radice, 'registro-pagina-abc123', 2 * ORA, adesso)
      const voce = cartellaVecchia(radice, 'registro-voce-def456', 3 * ORA, adesso)
      const giovane = cartellaVecchia(radice, 'registro-voce-ghi789', 10 * 60 * 1000, adesso)
      const altrui = cartellaVecchia(radice, 'registro-dettatura-xyz', 5 * ORA, adesso)
      const estranea = cartellaVecchia(radice, 'altro-programma', 5 * ORA, adesso)
      // Un file e non una cartella, con il prefisso giusto: non è roba nostra.
      const file = join(radice, 'registro-pagina-file')
      writeFileSync(file, 'x')
      utimesSync(file, new Date(adesso - 5 * ORA), new Date(adesso - 5 * ORA))

      await ripulisciTemporaneiVecchi(radice, adesso)

      assert.equal(existsSync(pagina), false, 'la scansione vecchia resta')
      assert.equal(existsSync(voce), false, 'la voce vecchia resta')
      assert.equal(existsSync(giovane), true, 'toccata una cartella forse al lavoro adesso')
      assert.equal(existsSync(altrui), true)
      assert.equal(existsSync(estranea), true)
      assert.equal(existsSync(file), true)
    } finally {
      rmSync(radice, { recursive: true, force: true })
    }
  })

  it('non solleva quando la cartella non c\'è', async () => {
    await ripulisciTemporaneiVecchi(join(tmpdir(), 'registro-cartella-che-non-esiste-mai'))
  })
})
