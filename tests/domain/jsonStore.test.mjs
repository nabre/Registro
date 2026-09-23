// Il deposito dei JSON in `userData`: impostazioni, segreti, recenti, posti.
//
// La prova che conta non è «legge e scrive», è che cosa succede quando la
// lettura fallisce. Prima c'era un `catch` solo, e qualunque motivo — file
// assente, file corrotto, file bloccato da OneDrive — finiva nello stesso
// ramo: oggetto vuoto in memoria, e il salvataggio dopo cancellava il file.
// Qui si verifica che i tre casi restino tre.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const bundle = await build({
  entryPoints: [fileURLToPath(new URL('../../src/environment/jsonStore.ts', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
})
const { depositoJson, leggiJson } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`,
)

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
    // Una cartella al posto del file: leggerla solleva `EISDIR`, che non è
    // «non c'è». È il modo portabile di ottenere quel che su Windows fanno
    // OneDrive e l'antivirus con `EBUSY`.
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
    // Il file bloccato è una cartella; quando il blocco «si scioglie» la
    // cartella se ne va e al suo posto compare il file vero, con dentro quel
    // che l'utente aveva scritto nei mesi scorsi. È la sequenza che su Windows
    // fa OneDrive quando molla la presa fra un `contenuto()` e un `salva()`.
    const dove = join(radice, 'impostazioni.json')
    mkdirSync(dove)
    try {
      const d = deposito(dove)
      assert.deepEqual(d.contenuto(), {}, 'bloccato: in memoria ci sono i predefiniti')

      rmSync(dove, { recursive: true })
      writeFileSync(dove, JSON.stringify({ mittente: 'x@y.z', ultimoDocumento: 'C:/a.registro' }), 'utf8')

      // Il chiamante cambia una chiave sola, e la cambia su quel che trova
      // **al proprio turno**: è il motivo per cui `salva` prende una funzione.
      assert.equal(d.salva((attuale) => ({ ...attuale, tema: 'scuro' })), true)

      assert.deepEqual(JSON.parse(readFileSync(dove, 'utf8')), {
        mittente: 'x@y.z',
        ultimoDocumento: 'C:/a.registro',
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
