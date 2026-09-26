// Il documento che cambia sotto un lavoro lungo. Il cambio di documento non
// passa dalla fila, e un turno può durare minuti (geocodifica, cartelle
// complete): si apre un altro anno **a metà** e si guarda che quel che il
// lavoro scrive dopo finisca nell'anno di prima o da nessuna parte, mai in
// quello nuovo.
//
// Gira su `dist-tests/api.mjs`, che ha insieme centralino e deposito: senza un
// deposito registrato nessun foglio si scriverebbe.

import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

import { cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-giro7-')

let api
let archivio

/** Un anno nuovo, aperto: il documento su cui si comincia ogni prova. */
async function apriAnno (nome, inizio, fine) {
  const anno = api.creaAnno(inizio, fine)
  await archivio.creaAnno(anno, api.Uri.file(percorso.join(dati, `${nome}.regi`)))
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
  api = await import('../../dist-tests/api.mjs')
  api.registraTutte()
  archivio = new api.Archivio(api.Uri.file(process.env.REGISTRO_USERDATA))
  api.registraDeposito(archivio.deposito)
  await archivio.apri(null)
})

after(() => smonta(radice, archivio))

describe('la cartella completa, con un altro anno aperto a metà', () => {
  it('le schede dell’anno di prima non finiscono nel documento nuovo', async () => {
    const annoA = await apriAnno('A-2026-2027', '2026-09-01', '2027-06-30')
    const { corso } = classeCon(annoA, 20)

    const semestreId = archivio.registro.anni[0].semestri[0].id
    const giro = api.esegui(archivio, { tipo: 'rapporto.completo', corsoId: corso.id, semestreId })
    // Il primo foglio scritto dice che il giro è partito: si apre l'altro anno.
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

    // Il servizio finto: mentre «risponde», il docente apre un altro anno.
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
