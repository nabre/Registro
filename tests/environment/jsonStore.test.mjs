// Il deposito dei JSON in `userData` (impostazioni, segreti, recenti, posti):
// quando la lettura fallisce, file assente, file corrotto e file bloccato
// (OneDrive) restano tre casi diversi, e un salvataggio non cancella quel che
// non si è letto.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'

import { importaSorgente } from '../helpers/sorgente.mjs'

const { depositoJson, leggiJson } = await importaSorgente('src/environment/jsonStore.ts')

/** Una cartella usa e getta, con dentro il percorso del file di prova. */
function cartella () {
  const radice = mkdtempSync(join(tmpdir(), 'registro-deposito-'))
  return {
    radice,
    file: join(radice, 'prova.json'),
    chiudi: () => rmSync(radice, { recursive: true, force: true }),
  }
}

/** Un deposito di oggetti semplici: è la forma dei quattro file veri. */
function deposito (percorso) {
  return depositoJson(
    () => percorso,
    (letto) => (letto !== null && typeof letto === 'object' ? { ...letto } : {}),
    () => ({}),
  )
}

describe('il deposito dei JSON di userData', () => {
  it('distingue il file che non c’è da quello che non si legge', () => {
    const { file, chiudi } = cartella()
    try {
      assert.equal(leggiJson(file).stato, 'assente')
      writeFileSync(file, 'non sono JSON', 'utf8')
      assert.equal(leggiJson(file).stato, 'rotto')
      writeFileSync(file, '{"a":1}', 'utf8')
      const esito = leggiJson(file)
      assert.equal(esito.stato, 'letto')
      assert.deepEqual(esito.valore, { a: 1 })
    } finally {
      chiudi()
    }
  })

  it('al primo avvio parte dai predefiniti e scrive senza pensarci', () => {
    const { file, chiudi } = cartella()
    try {
      const d = deposito(file)
      assert.deepEqual(d.contenuto(), {})
      assert.equal(d.salva(() => ({ tema: 'scuro' })), true)
      assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), { tema: 'scuro' })
    } finally {
      chiudi()
    }
  })

  it('un file corrotto non finisce sotto il nuovo: si mette da parte', () => {
    const { file, chiudi } = cartella()
    try {
      writeFileSync(file, '{ "password": "mez', 'utf8')
      const d = deposito(file)
      assert.deepEqual(d.contenuto(), {}, 'in memoria si riparte da zero')
      assert.equal(d.salva(() => ({ tema: 'chiaro' })), true)
      assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), { tema: 'chiaro' })
      // Quel che c'era resta ripescabile: se dentro c'erano le credenziali
      // della posta, chi le ha scritte vuole poterle rileggere.
      assert.equal(readFileSync(`${file}.rotto`, 'utf8'), '{ "password": "mez')
    } finally {
      chiudi()
    }
  })

  it('un file che non si riesce a leggere non viene riscritto', () => {
    const { radice, chiudi } = cartella()
    // Una cartella al posto del file: leggerla dà `EISDIR`, che non è «non c'è»
    // (il modo portabile di ottenere l'`EBUSY` di OneDrive e dell'antivirus).
    const dove = join(radice, 'bloccato.json')
    mkdirSync(dove)
    try {
      const d = deposito(dove)
      assert.deepEqual(d.contenuto(), {}, 'si lavora con i predefiniti')
      assert.equal(d.salva(() => ({ tema: 'scuro' })), false, 'ma non si scrive')
      assert.equal(statSync(dove).isDirectory(), true, 'sul disco non è stato toccato niente')
    } finally {
      chiudi()
    }
  })

  it('il blocco che si scioglie fra la lettura e la scrittura non cancella il resto', () => {
    const { radice, chiudi } = cartella()
    // Quando il blocco si scioglie compare il file vero con dentro quel che
    // l'utente aveva scritto: OneDrive che molla la presa fra `contenuto()` e
    // `salva()`.
    const dove = join(radice, 'impostazioni.json')
    mkdirSync(dove)
    try {
      const d = deposito(dove)
      assert.deepEqual(d.contenuto(), {}, 'bloccato: in memoria ci sono i predefiniti')

      rmSync(dove, { recursive: true })
      writeFileSync(dove, JSON.stringify({ mittente: 'x@y.z', ultimoDocumento: 'C:/a.regi' }), 'utf8')

      // Il chiamante cambia una chiave su quel che trova **al proprio turno**: per
      // questo `salva` prende una funzione.
      assert.equal(d.salva((attuale) => ({ ...attuale, tema: 'scuro' })), true)

      assert.deepEqual(JSON.parse(readFileSync(dove, 'utf8')), {
        mittente: 'x@y.z',
        ultimoDocumento: 'C:/a.regi',
        tema: 'scuro',
      }, 'quel che c’era sul disco è ancora tutto lì')
    } finally {
      chiudi()
    }
  })

  it('chi non cambia niente non fa scrivere', () => {
    const { file, chiudi } = cartella()
    try {
      writeFileSync(file, '{"a":1}', 'utf8')
      const d = deposito(file)
      const prima = statSync(file).mtimeMs
      assert.equal(d.salva((attuale) => attuale), true, 'va bene lo stesso: non c’era niente da fare')
      assert.equal(statSync(file).mtimeMs, prima, 'il file non è stato toccato')
    } finally {
      chiudi()
    }
  })

  it('dimentica rilegge dal disco', () => {
    const { file, chiudi } = cartella()
    try {
      writeFileSync(file, '{"a":1}', 'utf8')
      const d = deposito(file)
      assert.deepEqual(d.contenuto(), { a: 1 })
      writeFileSync(file, '{"a":2}', 'utf8')
      assert.deepEqual(d.contenuto(), { a: 1 }, 'finché non glielo si dice, vale quel che ha')
      d.dimentica()
      assert.deepEqual(d.contenuto(), { a: 2 })
    } finally {
      chiudi()
    }
  })
})

// `EPERM` non si ottiene a comando: la rinomina si prova con un `node:fs`
// finto.
describe('la rinomina di jsonStore su Windows', () => {
  it('aspetta un EPERM di passaggio invece di fermarsi', async () => {
    // `node:fs` con un `renameSync` che rifiuta due volte, poi lascia fare.
    const { scriviJson } = await importaSorgente('src/environment/jsonStore.ts', {
      finti: {
        'node:fs': `
        import * as vero from 'fs'
        export * from 'fs'
        export function renameSync (da, a) {
          const banco = (globalThis.__rinomine ??= { rifiuti: 2, tentativi: 0 })
          banco.tentativi += 1
          if (banco.rifiuti > 0) {
            banco.rifiuti -= 1
            throw Object.assign(new Error('EPERM: operation not permitted'), { code: 'EPERM' })
          }
          return vero.renameSync(da, a)
        }
      `,
      },
    })
    const cartella = mkdtempSync(join(tmpdir(), 'registro-giro12-'))
    const piattaforma = Object.getOwnPropertyDescriptor(process, 'platform')
    Object.defineProperty(process, 'platform', { value: 'win32' })
    try {
      const file = join(cartella, 'impostazioni.json')
      scriviJson(file, { a: 1 })
      assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), { a: 1 })
      assert.equal(globalThis.__rinomine.tentativi, 3)
    } finally {
      Object.defineProperty(process, 'platform', piattaforma)
      rmSync(cartella, { recursive: true, force: true })
      delete globalThis.__rinomine
    }
  })

  it('un rifiuto che non è «occupato» sale subito', async () => {
    const { scriviJson } = await importaSorgente('src/environment/jsonStore.ts', {
      finti: {
        'node:fs': `
        export * from 'fs'
        export function renameSync () {
          globalThis.__rinomine = (globalThis.__rinomine ?? 0) + 1
          throw Object.assign(new Error('ENOSPC'), { code: 'ENOSPC' })
        }
      `,
      },
    })
    const cartella = mkdtempSync(join(tmpdir(), 'registro-giro12-'))
    try {
      assert.throws(() => scriviJson(join(cartella, 'x.json'), {}), /ENOSPC/)
      assert.equal(globalThis.__rinomine, 1)
    } finally {
      rmSync(cartella, { recursive: true, force: true })
      delete globalThis.__rinomine
    }
  })
})
