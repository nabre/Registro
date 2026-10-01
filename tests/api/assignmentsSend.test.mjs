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

const { radice, lavoro, dati } = cartelleDiProva('registro-invio-consegne-')

/** La posta finta: tutto parte, e dopo il primo messaggio si cambia documento. */
const POSTA_FINTA = `
export async function puoSpedire () { return true }
export async function confermaInvio () { return true }
export function nomeBozza (_classe, _chi, _argomento, periodo) {
  globalThis.__invioConsegne?.periodi?.push(periodo)
  return 'bozza'
}
export async function bozzeDiGruppo (messaggi, _classe, dopoOgni) {
  const invio = globalThis.__invioConsegne
  for (let indice = 0; indice < messaggi.length; indice++) {
    invio.partiti += 1
    dopoOgni?.(indice, true)
    if (indice === 0) invio.dopoIlPrimo()
  }
  return { ok: true, spediti: true, dove: 'il server della posta', falliti: [], parziali: [] }
}
`

/** Il deposito finto, per il solo gestore: il documento da allegare c'è sempre. */
const DEPOSITO_FINTO = `
export function deposito () { return {} }
export async function contenutoDi () { return new Uint8Array([37, 80, 68, 70]) }
`

/** Al gestore delle consegne, e solo a lui, la posta e il deposito finti. */
const finti = {
  name: 'posta-e-deposito-finti',
  setup (costruzione) {
    costruzione.onResolve({ filter: /^#core\/dati\/(mail|store)\.js$/ }, (args) => {
      if (!args.importer.replaceAll('\\', '/').endsWith('core/azioni/assignments.ts')) return undefined
      return { path: args.path.includes('mail') ? 'posta' : 'deposito', namespace: 'finti' }
    })
    costruzione.onLoad({ filter: /.*/, namespace: 'finti' }, (args) => ({
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
      "export { consegne } from './core/azioni/assignments.ts'",
      "export { contestoDi } from './core/azioni/context.ts'",
      "export { Archivio } from './core/dati/archive.ts'",
      "export { Uri } from './core/apparato/uri.ts'",
      "export * from './core/dominio/index.ts'",
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
  delete globalThis.__invioConsegne
  rmSync(radice, { recursive: true, force: true })
})

describe('consegna.distribuisci con l’invio diretto', () => {
  it('chi è già partito resta segnato anche se il giro si interrompe', async () => {
    const annoVero = archivio.registro.annoCorrenteId
    globalThis.__invioConsegne = {
      partiti: 0,
      // Un altro anno aperto a metà giro: da qui il gestore non scrive più qui.
      dopoIlPrimo: () => { archivio.registro.annoCorrenteId = 'ann-un-altro' },
    }

    const esito = await moduli.consegne['consegna.distribuisci'](
      moduli.contestoDi(archivio),
      { tipo: 'consegna.distribuisci', consegnaId: consegna.id },
    )
    archivio.registro.annoCorrenteId = annoVero

    assert.equal(globalThis.__invioConsegne.partiti, 3)
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

describe('consegna.distribuisci e il nome delle bozze', () => {
  it('con la scadenza legata a un’ora, il nome porta il giorno di quell’ora', async () => {
    const { creaLezione, periodoNelNome } = moduli
    const corsoId = consegna.corsoId
    const lezione = creaLezione(corsoId, '2026-10-20', '08:00', 90)
    const legata = {
      ...creaConsegna(corsoId, 'Convocazione'),
      scadenzaLezioneId: lezione.id,
      scadenza: null,
    }
    archivio.modifica((r) => {
      r.lezioni.push(lezione)
      r.consegne.push(legata)
    }, ['lezioni', 'consegne'])
    globalThis.__invioConsegne = { partiti: 0, periodi: [], dopoIlPrimo: () => {} }

    const esito = await moduli.consegne['consegna.distribuisci'](
      moduli.contestoDi(archivio),
      { tipo: 'consegna.distribuisci', consegnaId: legata.id },
    )

    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(
      [...new Set(globalThis.__invioConsegne.periodi)],
      [periodoNelNome('2026-10-20')],
      'il giorno dell’ora, non oggi',
    )
  })
})

describe('consegna.documento.togli e la consegna sparita intanto', () => {
  it('se la consegna se ne va mentre il file va nel cestino, non è un «fatto»', async () => {
    const effimera = creaConsegna(consegna.corsoId, 'Circolare')
    archivio.modifica((r) => { r.consegne.push(effimera) }, ['consegne'])

    // Il gestore si ferma su `cestina`: intanto la consegna sparisce.
    const inCorso = moduli.consegne['consegna.documento.togli'](
      moduli.contestoDi(archivio),
      { tipo: 'consegna.documento.togli', consegnaId: effimera.id },
    )
    archivio.modifica((r) => {
      r.consegne = r.consegne.filter((c) => c.id !== effimera.id)
    }, ['consegne'])
    const esito = await inCorso

    assert.equal(esito.ok, false, JSON.stringify(esito))
  })
})

/** Una richiesta da distribuire a tutti, come quella del giro sopra. */
function creaConsegna (corsoId, testo) {
  return {
    ...moduli.creaConsegna(corsoId, testo, '2026-10-01'),
    documento: 'modulo',
    verso: 'consegno',
    fileTutti: 'archivio/pagella.pdf',
    nomeTutti: 'pagella.pdf',
  }
}
