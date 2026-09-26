// L'invio diretto dei documenti segna le spunte una per una: sopra i
// venticinque messaggi il tetto di Exchange fa durare il giro minuti, e un
// documento cambiato a metà non deve lasciare mail partite senza spunta.
//
// La posta è finta (chiama `dopoOgni` come `spedisciConExchange`) e dopo il
// primo messaggio cambia l'anno aperto; il resto è il registro vero.

import assert from 'node:assert/strict'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

import { cartelleDiProva } from '../helpers/archivio.mjs'
import { importaSorgente } from '../helpers/sorgente.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-giro12-invio-')

/** La posta finta: tutto parte, e dopo il primo messaggio si cambia documento. */
const POSTA_FINTA = `
export async function puoSpedire () { return true }
export async function confermaInvio () { return true }
export function nomeBozza () { return 'bozza' }
export async function bozzeDiGruppo (messaggi, _classe, dopoOgni) {
  const giro = globalThis.__giro12Invio
  for (let indice = 0; indice < messaggi.length; indice++) {
    giro.partiti += 1
    dopoOgni?.(indice, true)
    if (indice === 0) giro.dopoIlPrimo()
  }
  return { ok: true, spediti: true, dove: 'il server della posta', falliti: [] }
}
`

/** Il deposito finto, per il solo gestore: il documento da allegare c'è sempre. */
const DEPOSITO_FINTO = `
export function deposito () { return {} }
export async function contenutoDi () { return new Uint8Array([37, 80, 68, 70]) }
`

/** Al gestore delle consegne, e solo a lui, la posta e il deposito finti. */
const finti = {
  name: 'giro12-finti',
  setup (costruzione) {
    costruzione.onResolve({ filter: /^\.\.\/data\/(mail|store)\.js$/ }, (args) => {
      if (!args.importer.replaceAll('\\', '/').endsWith('src/actions/assignments.ts')) return undefined
      return { path: args.path.includes('mail') ? 'posta' : 'deposito', namespace: 'giro12' }
    })
    costruzione.onLoad({ filter: /.*/, namespace: 'giro12' }, (args) => ({
      contents: args.path === 'posta' ? POSTA_FINTA : DEPOSITO_FINTO,
      loader: 'js',
    }))
  },
}

let moduli
let archivio
let classe
let consegna

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(dati, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify({ cartellaLavoro: lavoro }),
  )

  moduli = await importaSorgente(
    [
      "export { consegne } from './src/actions/assignments.ts'",
      "export { contestoDi } from './src/actions/context.ts'",
      "export { Archivio } from './src/data/archive.ts'",
      "export { Uri } from './src/environment/uri.ts'",
      "export * from './src/domain/index.ts'",
    ].join('\n'),
    { external: ['node-llama-cpp'], plugins: [finti] },
  )

  const { Archivio, Uri, creaAllievo, creaAnno, creaClasse, creaConsegna, creaCorso, creaMateria } =
    moduli
  archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  await archivio.apri(null)
  await archivio.creaAnno(
    creaAnno('2026-09-01', '2027-06-30'),
    Uri.file(percorso.join(dati, '2026-2027.regi')),
  )
  const annoId = archivio.registro.anni[0].id

  classe = creaClasse(annoId, 'I MEC A')
  for (const [cognome, nome] of [['Rossi', 'Maria'], ['Bianchi', 'Luca'], ['Verdi', 'Anna']]) {
    const allievo = creaAllievo(cognome, nome)
    allievo.emailTutore = `${cognome.toLowerCase()}@esempio.invalid`
    classe.allievi.push(allievo)
  }
  const materia = creaMateria('Matematica')
  const corso = creaCorso(classe.id, materia.id, 'I MEC A — Matematica')
  consegna = {
    ...creaConsegna(corso.id, 'Pagella', '2026-10-01'),
    documento: 'modulo',
    verso: 'consegno',
    fileTutti: 'archivio/pagella.pdf',
    nomeTutti: 'pagella.pdf',
  }
  archivio.modifica((r) => {
    r.impostazioni.pdfAutomatici = 'mai'
    r.classi.push(classe)
    r.materie.push(materia)
    r.corsi.push(corso)
    r.consegne.push(consegna)
  }, ['classi', 'corsi', 'consegne', 'registro'])
})

after(() => {
  archivio?.dispose()
  delete globalThis.__giro12Invio
  rmSync(radice, { recursive: true, force: true })
})

describe('consegna.distribuisci con l’invio diretto', () => {
  it('chi è già partito resta segnato anche se il giro si interrompe', async () => {
    const annoVero = archivio.registro.annoCorrenteId
    globalThis.__giro12Invio = {
      partiti: 0,
      // Un altro anno aperto a metà giro: da qui il gestore non scrive più qui.
      dopoIlPrimo: () => { archivio.registro.annoCorrenteId = 'ann-un-altro' },
    }

    const esito = await moduli.consegne['consegna.distribuisci'](
      moduli.contestoDi(archivio),
      { tipo: 'consegna.distribuisci', consegnaId: consegna.id },
    )
    archivio.registro.annoCorrenteId = annoVero

    assert.equal(globalThis.__giro12Invio.partiti, 3)
    // Il cambio di documento si dice: le spunte che mancano si mettono a mano.
    assert.equal(esito.ok, false, JSON.stringify(esito))
    const viva = archivio.registro.consegne.find((c) => c.id === consegna.id)
    assert.equal(
      viva.fatte.length,
      1,
      'la prima famiglia ha ricevuto il documento: al secondo giro lo riceverebbe due volte',
    )
    assert.equal(viva.fatte[0].modo, 'email')
  })
})
