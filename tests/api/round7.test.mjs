// Il documento che cambia sotto un lavoro lungo.
//
// Il cambio di documento — un doppio clic su un altro `.registro`, un anno
// recente — non passa dalla fila delle scritture: arriva quando arriva. La fila
// controlla che il documento sia quello giusto *prima* del turno, ma un turno
// può durare minuti: la geocodifica di una classe, le venticinque schede di una
// cartella completa. Queste prove aprono un altro anno **a metà** del lavoro e
// guardano dove finisce quel che il lavoro scrive dopo: nell'anno di prima, o
// da nessuna parte — mai in quello appena aperto.
//
// **Il bundle se lo fa da sé.** `dist-tests/api.mjs` ha il centralino ma non
// `registraDeposito`, e senza un deposito registrato nessun foglio si scrive:
// la prova passerebbe perché non c'è niente da sbagliare. Un bundle a parte
// sarebbe due grafi — due depositi che non si conoscono. Qui si rifà lo stesso
// grafo di `tests/helpers/api.ts`, con in più le due funzioni del deposito, in
// `dist-tests/` accanto agli altri: pdfjs cerca caratteri e worker vicino al
// bundle che lo carica.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { after, before, describe, it } from 'node:test'

import * as esbuild from 'esbuild'

const progetto = fileURLToPath(new URL('../../', import.meta.url))

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-giro7-'))
const lavoro = percorso.join(radice, 'lavoro')
const dati = percorso.join(lavoro, 'registro')
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

let api
let archivio

/** Un anno nuovo, aperto: il documento su cui si comincia ogni prova. */
async function apriAnno (nome, inizio, fine) {
  const anno = api.creaAnno(inizio, fine)
  await archivio.creaAnno(anno, api.Uri.file(percorso.join(dati, `${nome}.registro`)))
  return archivio.registro.anni[0].id
}

/** Una classe con un corso e tante persone quante se ne chiedono. */
function classeCon (annoId, quanti) {
  const classe = api.creaClasse(annoId, 'I MEC A')
  for (let i = 0; i < quanti; i += 1) {
    const allievo = api.creaAllievo(`Cognome${String(i).padStart(2, '0')}`, 'Nome')
    allievo.indirizzo = { via: `Via Prova ${i + 1}`, cap: '6500', localita: 'Bellinzona' }
    classe.allievi.push(allievo)
  }
  const materia = api.creaMateria('Matematica')
  const corso = api.creaCorso(classe.id, materia.id, 'I MEC A — Matematica')
  archivio.modifica((r) => {
    r.impostazioni.pdfAutomatici = 'mai'
    r.classi.push(classe)
    r.materie.push(materia)
    r.corsi.push(corso)
  }, ['classi', 'corsi', 'registro'])
  return { classe, corso }
}

/** Quel che il documento aperto adesso tiene sotto `esportazioni/`. */
async function esportazioni () {
  const esito = await api.chiama(archivio, 'documenti.inventario', {})
  assert.ok(esito.ok, JSON.stringify(esito))
  return esito.dati.esportazioni.map((d) => d.percorso)
}

/** Aspetta che una condizione diventi vera, un giro di eventi alla volta. */
async function finche (condizione, massimo = 20000) {
  const fine = Date.now() + massimo
  while (!(await condizione())) {
    if (Date.now() > fine) throw new Error('la condizione non si è mai avverata')
    await new Promise((risolvi) => setTimeout(risolvi, 5))
  }
}

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(dati, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify({ cartellaLavoro: lavoro }),
  )
  const bundle = percorso.join(progetto, 'dist-tests', 'round7.mjs')
  await esbuild.build({
    stdin: {
      contents:
        "export * from './tests/helpers/api.ts'\n" +
        "export { deposito, registraDeposito } from './src/data/store.ts'\n",
      resolveDir: progetto,
      loader: 'ts',
    },
    bundle: true,
    outfile: bundle,
    external: ['node-llama-cpp'],
    format: 'esm',
    platform: 'node',
    target: 'node18',
    logLevel: 'silent',
    alias: {
      apparato: './src/environment/platform.ts',
      electron: './tests/helpers/fake-electron.mjs',
    },
  })
  api = await import(pathToFileURL(bundle).href)
  api.registraTutte()
  archivio = new api.Archivio(api.Uri.file(process.env.REGISTRO_USERDATA))
  api.registraDeposito(archivio.deposito)
  await archivio.apri(null)
})

after(() => {
  archivio?.dispose()
  rmSync(radice, { recursive: true, force: true })
})

describe('la cartella completa, con un altro anno aperto a metà', () => {
  it('le schede dell’anno di prima non finiscono nel documento nuovo', async () => {
    const annoA = await apriAnno('A-2026-2027', '2026-09-01', '2027-06-30')
    const { corso } = classeCon(annoA, 20)

    const semestreId = archivio.registro.anni[0].semestri[0].id
    const giro = api.esegui(archivio, { tipo: 'rapporto.completo', corsoId: corso.id, semestreId })
    // Il primo foglio scritto dice che il giro è partito davvero: da lì in poi
    // si apre l'altro anno, come farebbe un doppio clic.
    await finche(async () => (await esportazioni()).length > 0)
    await apriAnno('B-2027-2028', '2027-09-01', '2028-06-30')
    const esito = await giro

    assert.deepEqual(
      await esportazioni(),
      [],
      'dei fogli dell’anno di prima sono finiti nel documento appena aperto',
    )
    assert.equal(esito.ok, false, `il giro interrotto ha risposto «fatto»: ${JSON.stringify(esito)}`)
    assert.match(esito.errori.join(' '), /documento aperto è cambiato/)
  })
})

describe('la geocodifica, con un altro anno aperto mentre il servizio risponde', () => {
  let fetchVero

  before(() => {
    fetchVero = globalThis.fetch
  })

  after(() => {
    globalThis.fetch = fetchVero
  })

  it('le case di una classe non entrano nelle coordinate dell’altro anno', async () => {
    const annoA = await apriAnno('C-2026-2027', '2026-09-01', '2027-06-30')
    const { classe } = classeCon(annoA, 1)

    // Il servizio finto: mentre «risponde», il docente apre un altro anno. È il
    // punto in cui il giro vero aspetta, un secondo a indirizzo.
    let domande = 0
    globalThis.fetch = async () => {
      domande += 1
      if (domande === 1) await apriAnno('D-2027-2028', '2027-09-01', '2028-06-30')
      return new Response(JSON.stringify([{ lat: '46.19', lon: '9.02', display_name: 'Bellinzona' }]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    const esito = await api.esegui(archivio, { tipo: 'mappa.geocodifica', classeIds: [classe.id] })

    assert.ok(domande > 0, 'il servizio non è mai stato interrogato')
    assert.deepEqual(
      archivio.registro.coordinate,
      [],
      'l’indirizzo di casa di una persona è finito nell’anno appena aperto',
    )
    assert.equal(esito.ok, false, `il giro interrotto ha risposto «fatto»: ${JSON.stringify(esito)}`)
    assert.equal(esito.codice, 'conflitto')
  })
})
