// La scheda delle supplenze sta fra i fogli che il registro rifà da sé
// (`documentiDelCorso`): nasce con la prima supplenza svolta, e un corso che
// non ne ha non se la trova nella cartella.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-supplenze-')

let api
let archivio
let corso
let lezione

before(async () => {
  ;({ api, archivio } = await archivioDiProva({ lavoro, dati, deposito: true }))

  const { creaAllievo, creaClasse, creaCorso, creaLezione, creaMateria } = api
  const anno = archivio.registro.anni[0]

  const classe = creaClasse(anno.id, 'I MEC A')
  classe.allievi.push(creaAllievo('Rossi', 'Maria'))
  const matematica = creaMateria('Matematica')
  corso = creaCorso(classe.id, matematica.id, 'I MEC A — Matematica')
  lezione = { ...creaLezione(corso.id, '2026-09-08', '08:20', 90), stato: 'svolta' }

  archivio.modifica((r) => {
    r.impostazioni.pdfAutomatici = 'mai'
    r.classi.push(classe)
    r.materie.push(matematica)
    r.corsi.push(corso)
    r.lezioni.push(lezione)
  }, ['classi', 'corsi', 'lezioni', 'registro'])
})

after(async () => {
  await api?.fermaRapporti()
  smonta(radice, archivio)
})

/** I fogli delle supplenze sotto `esportazioni/`. */
async function schedeSupplenze () {
  const esito = await api.chiama(archivio, 'documenti.inventario', {})
  assert.ok(esito.ok, JSON.stringify(esito))
  return esito.dati.esportazioni
    .map((d) => d.percorso)
    .filter((p) => /Supplenze/.test(p))
}

async function cartellaCompleta () {
  const esito = await api.esegui(archivio, {
    tipo: 'rapporto.completo',
    corsoId: corso.id,
    semestreId: null,
  })
  assert.ok(esito.ok, JSON.stringify(esito))
}

describe('la scheda delle supplenze fra i fogli rifatti da sé', () => {
  it('senza supplenze il corso non la trova nella cartella', async () => {
    await cartellaCompleta()
    assert.deepEqual(await schedeSupplenze(), [])
  })

  it('con una supplenza svolta nasce insieme agli altri fogli del corso', async () => {
    archivio.modifica((r) => {
      const suo = r.lezioni.find((l) => l.id === lezione.id)
      suo.supplenza = true
    }, ['lezioni'])
    await cartellaCompleta()
    assert.equal((await schedeSupplenze()).length, 1)
  })
})
