// La supplenza mandata dal registro: lo zip è partito allegato alla mail, e
// accanto al documento — spesso una cartella OneDrive — non deve restare una
// copia di foto e nomi di minorenni. Se non parte niente, invece, lo zip resta:
// è l'unico posto dove trovarlo.
//
// La posta e la composizione dei PDF sono finte; il resto è il registro vero.

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

import { cartelleDiProva } from '../helpers/archivio.mjs'
import { importaSorgente } from '../helpers/sorgente.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-invio-supplenza-')

/** La posta finta: parte se `__invioSupplenza.conferma`, altrimenti niente. */
const POSTA_FINTA = `
export async function puoSpedire () { return true }
export async function confermaInvio () { return globalThis.__invioSupplenza.conferma }
export function nomeBozza () { return 'bozza' }
export async function apriBozzaSingola (messaggio) {
  globalThis.__invioSupplenza.allegati.push(...messaggio.allegati.map((a) => a.nome))
  return { ok: true, spedita: true }
}
`

/** I PDF finti: comporli davvero non è quel che si prova qui. */
const PDF_FINTO = 'export async function componiPdf () { return new Uint8Array([37, 80, 68, 70]) }'

/** Al gestore della supplenza, e solo a lui, la posta e i PDF finti. */
const finti = {
  name: 'posta-e-pdf-finti',
  setup (costruzione) {
    costruzione.onResolve({ filter: /^#core\/dati\/(mail|reportsPdf)\.js$/ }, (args) => {
      if (!args.importer.replaceAll('\\', '/').endsWith('core/azioni/substitute.ts')) return undefined
      return { path: args.path.includes('mail') ? 'posta' : 'pdf', namespace: 'finti' }
    })
    costruzione.onLoad({ filter: /.*/, namespace: 'finti' }, (args) => ({
      contents: args.path === 'posta' ? POSTA_FINTA : PDF_FINTO,
      loader: 'js',
    }))
  },
}

let moduli
let archivio
let lezione

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(dati, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify({ cartellaLavoro: lavoro }),
  )

  moduli = await importaSorgente(
    [
      "export { supplenza } from './core/azioni/substitute.ts'",
      "export { contestoDi } from './core/azioni/context.ts'",
      "export { Archivio } from './core/dati/archive.ts'",
      "export { Uri } from './core/apparato/uri.ts'",
      "export * from './core/dominio/index.ts'",
    ].join('\n'),
    { external: ['node-llama-cpp'], plugins: [finti] },
  )

  const { Archivio, Uri, creaAllievo, creaAnno, creaClasse, creaCorso, creaLezione, creaMateria } =
    moduli
  archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  await archivio.apri(null)
  await archivio.creaAnno(
    creaAnno('2026-09-01', '2027-06-30'),
    Uri.file(percorso.join(dati, '2026-2027.regi')),
  )
  const classe = creaClasse(archivio.registro.anni[0].id, '3A')
  classe.allievi.push(creaAllievo('Rossi', 'Maria'))
  const materia = creaMateria('Matematica')
  const corso = creaCorso(classe.id, materia.id, '3A — Matematica')
  lezione = creaLezione(corso.id, '2026-10-05', '08:15', 45)
  archivio.modifica((r) => {
    r.impostazioni.pdfAutomatici = 'mai'
    r.classi.push(classe)
    r.materie.push(materia)
    r.corsi.push(corso)
    r.lezioni.push(lezione)
  }, ['classi', 'corsi', 'lezioni', 'registro'])
})

after(() => {
  archivio?.dispose()
  delete globalThis.__invioSupplenza
  rmSync(radice, { recursive: true, force: true })
})

/** Prepara la supplenza dell'ora, con l'indirizzo: la posta finta decide se parte. */
async function prepara (conferma) {
  globalThis.__invioSupplenza = { conferma, allegati: [] }
  return await moduli.supplenza['supplenza.prepara'](
    moduli.contestoDi(archivio),
    { tipo: 'supplenza.prepara', lezioniIds: [lezione.id], email: 'anna@esempio.invalid' },
  )
}

const ZIP = 'Supplenza 2026-10-05 08.15–09.00.zip'

describe('supplenza.prepara con l’invio diretto', () => {
  it('se non parte niente, lo zip resta accanto al documento', async () => {
    const esito = await prepara(false)
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.ok(existsSync(percorso.join(dati, ZIP)))
    rmSync(percorso.join(dati, ZIP))
  })

  it('partita la mail, lo zip con foto e nomi non resta nella cartella del documento', async () => {
    const esito = await prepara(true)
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(globalThis.__invioSupplenza.allegati, [ZIP], 'lo zip è partito allegato')
    assert.ok(!existsSync(percorso.join(dati, ZIP)), 'lo zip è stato tolto dopo l’invio')
  })
})
