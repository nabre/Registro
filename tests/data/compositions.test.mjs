// Le composizioni dall'inizio alla fine: comporre, rifare, buttare via, con un
// anno vero in una cartella temporanea. Buttare via sono due cancellazioni
// (elenco e PDF): si guarda che cosa resta nel documento, anche riaprendo.
//
// Gira su `dist-tests/data.mjs`, dati e azioni in un grafo solo: con bundle
// separati il deposito sarebbe due.

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

import { PDFDocument, StandardFonts } from '@cantoo/pdf-lib'

import { cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-fascicoli-')

after(() => smonta(radice))

let moduli
let archivio

const PRIMO = 'esportazioni/Matematica/DIC4a/classe/DIC4a_Presenze.pdf'
const SECONDO = 'esportazioni/Matematica/DIC4a/classe/DIC4a_Valutazioni.pdf'
const FASCICOLO = 'esportazioni/composizioni/Consiglio di classe.pdf'

/** Un PDF vero: il fascicolo si compone davvero, non si finge. */
async function foglio (titolo) {
  const documento = await PDFDocument.create()
  const font = await documento.embedFont(StandardFonts.Helvetica)
  documento.addPage([595, 842]).drawText(titolo, { x: 60, y: 780, size: 16, font })
  return documento.save()
}

/** L'azione, chiamata come la chiama il centralino. */
function esegui (parte, azione) {
  return parte[azione.tipo](null, azione)
}

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(dati, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify({ cartellaLavoro: lavoro }),
  )

  moduli = await import('../../dist-tests/data.mjs')
  const { Archivio, registraDeposito, Uri } = moduli
  const { creaAnno } = await import('../../dist-tests/domain.mjs')

  archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  registraDeposito(archivio.deposito)
  await archivio.apri(null)
  await archivio.creaAnno(
    creaAnno('2026-09-01', '2027-06-30'),
    Uri.file(percorso.join(dati, '2026-2027.regi')),
  )

  const { deposito } = moduli
  deposito().scrivi(PRIMO, await foglio('Presenze'))
  deposito().scrivi(SECONDO, await foglio('Valutazioni'))
})

/** La composizione che c'è adesso, una sola: le prove vanno in fila. */
function solo () {
  const tutte = moduli.ricettePresenti()
  assert.equal(tutte.length, 1, `composizioni in elenco: ${tutte.length}`)
  return tutte[0]
}

async function creaFascicolo (nome = 'Consiglio di classe') {
  const esito = await esegui(moduli.composizioni, {
    tipo: 'composizione.crea',
    nome,
    percorsi: [PRIMO, SECONDO],
  })
  assert.ok(esito.ok, `composizione rifiutata: ${JSON.stringify(esito.errori)}`)
  return esito
}

describe('comporre una composizione', () => {
  it('scrive il PDF e la ricetta, e i fogli restano dove sono', async () => {
    await creaFascicolo()
    const { deposito } = moduli

    assert.ok(deposito().esiste(FASCICOLO), 'il PDF del fascicolo non c’è')
    assert.equal(solo().composizione.nome, 'Consiglio di classe')
    assert.deepEqual(solo().composizione.percorsi, [PRIMO, SECONDO])
    assert.ok(deposito().esiste(PRIMO) && deposito().esiste(SECONDO), 'i fogli sono spariti')
    // Due pagine, una per foglio: il fascicolo è composto davvero.
    const unito = await PDFDocument.load(deposito().leggi(FASCICOLO))
    assert.equal(unito.getPageCount(), 2)
  })

  it('una seconda composizione con lo stesso nome si rifiuta: scriverebbe sullo stesso file', async () => {
    const esito = await esegui(moduli.composizioni, {
      tipo: 'composizione.crea',
      nome: 'Consiglio di classe',
      percorsi: [PRIMO, SECONDO],
    })
    assert.equal(esito.ok, false, 'il doppione è passato')
    assert.match(esito.errori.join(' '), /già una composizione/)
  })
})

describe('rifare una composizione', () => {
  it('un foglio sparito non ferma gli altri, e il conto lo dice', async () => {
    const { deposito } = moduli
    const id = solo().composizione.id
    // Una scheda buttata via dalla cartella, come quando si rifà un rapporto
    // datato con un nome nuovo.
    deposito().elimina(SECONDO)

    const esito = await esegui(moduli.composizioni, { tipo: 'composizione.aggiorna', id })
    assert.ok(esito.ok, `aggiornamento rifiutato: ${JSON.stringify(esito.errori)}`)
    assert.equal(esito.messaggio.livello, 'avviso')
    assert.match(esito.messaggio.testo, /1 rimasti fuori/)
    assert.match(esito.messaggio.testo, /non erano più nella cartella/)

    // Il fascicolo c'è lo stesso, con dentro la scheda che è rimasta.
    const unito = await PDFDocument.load(deposito().leggi(FASCICOLO))
    assert.equal(unito.getPageCount(), 1)
    // La ricetta non si accorcia: il foglio può tornare, e «aggiorna» lo rimette.
    assert.deepEqual(solo().composizione.percorsi, [PRIMO, SECONDO])

    deposito().scrivi(SECONDO, await foglio('Valutazioni'))
    const secondo = await esegui(moduli.composizioni, { tipo: 'composizione.aggiorna', id })
    assert.equal(secondo.messaggio.livello, 'info')
    assert.equal((await PDFDocument.load(deposito().leggi(FASCICOLO))).getPageCount(), 2)
  })
})

describe('buttare via una composizione', () => {
  it('se ne vanno tutti e due — la ricetta e il PDF — e i fogli restano', async () => {
    const { deposito } = moduli
    const id = solo().composizione.id

    const esito = await esegui(moduli.composizioni, { tipo: 'composizione.elimina', id })
    assert.ok(esito.ok, `eliminazione rifiutata: ${JSON.stringify(esito.errori)}`)

    assert.equal(deposito().esiste(FASCICOLO), false, 'il PDF del fascicolo è rimasto')
    assert.deepEqual(moduli.ricettePresenti(), [], 'la ricetta è rimasta')
    assert.ok(deposito().esiste(PRIMO) && deposito().esiste(SECONDO), 'i fogli sono spariti con lui')
  })

  it('e non torna riaprendo l’anno', async () => {
    await archivio.chiudi()

    const { Archivio, registraDeposito, Uri, ricettePresenti, deposito } = moduli
    archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
    registraDeposito(archivio.deposito)
    await archivio.apri(Uri.file(percorso.join(dati, '2026-2027.regi')))

    assert.deepEqual(ricettePresenti(), [], 'il fascicolo è tornato dopo la riapertura')
    assert.equal(deposito().esiste(FASCICOLO), false, 'il PDF è tornato dopo la riapertura')
    assert.ok(deposito().esiste(PRIMO), 'i fogli non sono sopravvissuti alla riapertura')
  })

  it('lo stesso nome si può riusare: il posto è libero davvero', async () => {
    await creaFascicolo()
    assert.ok(moduli.deposito().esiste(FASCICOLO))
  })

  it('una composizione che non c’è più si rifiuta invece di dire «fatto»', async () => {
    const esito = await esegui(moduli.composizioni, {
      tipo: 'composizione.elimina',
      id: 'fas-mai-esistito',
    })
    assert.equal(esito.ok, false)
  })

  it('togliendo il PDF dalla cartella se ne va anche la ricetta: nessun orfano', async () => {
    const { deposito } = moduli
    assert.equal(moduli.ricettePresenti().length, 1)

    const esito = await esegui(moduli.esportazioni, {
      tipo: 'esportazione.elimina',
      percorso: FASCICOLO,
    })
    assert.ok(esito.ok, `eliminazione rifiutata: ${JSON.stringify(esito.errori)}`)
    assert.equal(deposito().esiste(FASCICOLO), false)
    assert.deepEqual(moduli.ricettePresenti(), [], 'la ricetta è rimasta a nominare un PDF che non c’è')
  })

  it('e la copia del PDF sparisce dal disco: non resta apribile da fuori', async () => {
    const { deposito, percorsoVero } = moduli
    await creaFascicolo()
    // Come nella cornice: il PDF si materializza in una copia vera.
    const copia = await percorsoVero(FASCICOLO)
    assert.ok(copia && existsSync(copia.fsPath), 'la copia non è stata materializzata')

    await esegui(moduli.composizioni, {
      tipo: 'composizione.elimina',
      id: solo().composizione.id,
    })
    await deposito().smaterializza(FASCICOLO)

    assert.equal(
      existsSync(copia.fsPath),
      false,
      'il fascicolo buttato via si apre ancora: la copia è rimasta sul disco',
    )
    assert.equal(await percorsoVero(FASCICOLO), null)
  })

  it('la ricetta rimasta sola si butta via lo stesso', async () => {
    const { deposito } = moduli
    await creaFascicolo()
    // Il PDF tolto a mano, come lo toglierebbe chi fa ordine da fuori.
    deposito().elimina(FASCICOLO)

    const esito = await esegui(moduli.composizioni, {
      tipo: 'composizione.elimina',
      id: solo().composizione.id,
    })
    assert.ok(esito.ok, `eliminazione rifiutata: ${JSON.stringify(esito.errori)}`)
    assert.equal(esito.messaggio.livello, 'avviso')
    assert.deepEqual(moduli.ricettePresenti(), [])
  })

  // Prima l'elenco, poi il PDF: così il gesto si può ripetere. Nell'ordine
  // contrario resterebbe una composizione in elenco impossibile da togliere.
  it('toglie prima l’elenco e poi il PDF', async () => {
    const { deposito } = moduli
    await creaFascicolo()
    const ordine = []
    const vero = deposito().elimina.bind(deposito())
    deposito().elimina = (percorso) => {
      ordine.push(percorso)
      return vero(percorso)
    }
    try {
      await esegui(moduli.composizioni, { tipo: 'composizione.elimina', id: solo().composizione.id })
    } finally {
      delete deposito().elimina
    }
    assert.ok(ordine[0].startsWith('composizioni/'), `primo tolto: ${ordine[0]}`)
    assert.equal(ordine[1], FASCICOLO)
  })
})

describe('un PDF senza elenco', () => {
  it('si butta via dalla cartella come un documento qualunque', async () => {
    const { deposito } = moduli
    await creaFascicolo()
    // La ricetta tolta a mano: resta un PDF che nessun elenco nomina, e si toglie
    // lo stesso da qui.
    deposito().elimina(solo().percorso)
    assert.deepEqual(moduli.ricettePresenti(), [])
    assert.ok(deposito().esiste(FASCICOLO))

    const esito = await esegui(moduli.esportazioni, {
      tipo: 'esportazione.elimina',
      percorso: FASCICOLO,
    })
    assert.ok(esito.ok, `eliminazione rifiutata: ${JSON.stringify(esito.errori)}`)
    assert.equal(deposito().esiste(FASCICOLO), false, 'il PDF senza elenco è rimasto')
  })
})
