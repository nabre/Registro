// Due bozze di piano dello stesso corso e dello stesso giorno si distinguono
// con « (2)» in coda al nome (`documentoPiano`): rifare il foglio della prima
// non deve buttare quello della seconda come se fosse un suo doppione.
//
// Gira su `dist-tests/data.mjs`: anno in uso e deposito sono di modulo.

import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

import { cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-bozze-gemelle-')

let moduli
let dominio
let archivio

/** Il contenuto di un PDF finto: basta che si riconosca. */
function pdf (etichetta) {
  return Buffer.from(`%PDF-1.7\n${etichetta}\n`, 'utf8')
}

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(dati, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify({ cartellaLavoro: lavoro }),
  )

  moduli = await import('../../dist-tests/data.mjs')
  dominio = await import('../../dist-tests/domain.mjs')
  const { Archivio, registraDeposito, Uri } = moduli

  archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  registraDeposito(archivio.deposito)
  await archivio.apri(null)
  await archivio.creaAnno(
    dominio.creaAnno('2026-09-01', '2027-06-30'),
    Uri.file(percorso.join(dati, '2026-2027.regi')),
  )
})

after(() => {
  archivio?.dispose()
  smonta(radice)
})

describe('le bozze gemelle', () => {
  it('rifare la prima lascia il foglio della seconda', async () => {
    const { creaClasse, creaCorso, creaMateria, creaPiano, collocazioneDi, percorsoDi } = dominio
    const classe = creaClasse(archivio.registro.anni[0].id, 'DIC4a')
    const materia = creaMateria('Matematica')
    const corso = creaCorso(classe.id, materia.id, 'DIC4a — Matematica')
    const prima = creaPiano(corso.id)
    const seconda = creaPiano(corso.id)
    // Nati lo stesso giorno, e nessuna lezione li usa: sono bozze gemelle.
    seconda.creatoIl = prima.creatoIl
    archivio.modifica((r) => {
      r.impostazioni.pdfAutomatici = 'mai'
      r.classi.push(classe)
      r.materie.push(materia)
      r.corsi.push(corso)
      r.piani.push(prima, seconda)
    }, ['classi', 'corsi', 'piani', 'registro'])

    const registro = archivio.registro
    const dellaPrima = percorsoDi(collocazioneDi(registro, 'piano', prima.id))
    const dellaSeconda = percorsoDi(collocazioneDi(registro, 'piano', seconda.id))
    // Lo scenario: il nome della seconda è quello della prima con « (2)».
    assert.equal(dellaSeconda, dellaPrima.replace(/\.pdf$/, ' (2).pdf'))

    const { deposito, riscrivi } = moduli
    await riscrivi(dellaSeconda, pdf('seconda'))
    await riscrivi(dellaPrima, pdf('prima'))

    assert.equal(deposito().esiste(dellaPrima), true)
    assert.equal(
      deposito().esiste(dellaSeconda),
      true,
      'il foglio della seconda bozza è stato buttato come doppione della prima',
    )
  })

  it('un doppione vero accanto a un foglio qualunque se ne va ancora', async () => {
    const { deposito, riscrivi } = moduli
    const cartella = 'esportazioni/Matematica/DIC4a/classe'
    const foglio = `${cartella}/2026-2027_DIC4a_Matematica_Presenze_anno intero.pdf`
    const doppione = foglio.replace(/\.pdf$/, ' (2).pdf')
    deposito().scrivi(doppione, pdf('vecchio'))

    await riscrivi(foglio, pdf('nuovo'))
    assert.equal(deposito().esiste(doppione), false)
  })
})
