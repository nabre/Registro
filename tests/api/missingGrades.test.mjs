// `valutazioni.voti` conta i voti che contano, e non tutti quelli scritti.
//
// La lettura si era rifatta il filtro per conto suo — «il valore non è nullo» —
// mentre il dominio ne ha uno solo, `votiEffettivi`, che tiene fuori anche chi
// era segnato **assente**. Due filtri diversi sugli stessi voti sono due medie
// diverse per la stessa prova: quella che il docente legge nel pannello e
// quella che l'assistente legge dall'API, e il numero che finisce in una
// risposta è il secondo.
//
// Il caso è costruito perché le due aritmetiche divergano di parecchio: un
// assente a cui è rimasto scritto un 1 in casella — succede quando la prova si
// segna prima e l'assenza dopo — accanto a due presenti da 6. Sulla scala
// ticinese (1–6, sufficienza a 4) con l'assente dentro la media fa 4.33 e gli
// insufficienti sono uno; senza, fa 6 e non ce n'è nessuno: la differenza fra
// una classe che ha fatto benissimo e una che ha appena passato.
//
// La seconda prova non ha nemmeno un voto che conti: il dominio risponde
// `null`, che vuol dire «di questa prova non c'è una media», e non uno zero
// che si legge come «sono andati tutti malissimo».

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-api-voti-assenti-'))
const lavoro = percorso.join(radice, 'lavoro')
const dati = percorso.join(lavoro, 'registro')
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

const DAL = '2026-09-01'
const AL = '2027-06-30'

let api
let archivio
let rossi
let bianchi
let neri
/** La prova con dentro l'assente che ha ancora un numero in casella. */
let conAssente
/** La prova su cui nessun voto conta: uno solo, e di chi non c'era. */
let soloAssenti

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(dati, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify({ cartellaLavoro: lavoro }),
  )

  api = await import('../../dist-tests/api.mjs')
  api.registraTutte()

  const {
    Archivio, Uri,
    creaAllievo, creaAnno, creaClasse, creaCorso, creaMateria, creaValutazione,
  } = api

  archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  await archivio.apri(null)
  await archivio.creaAnno(
    creaAnno(DAL, AL),
    Uri.file(percorso.join(dati, '2026-2027.registro')),
  )
  const annoId = archivio.registro.anni[0].id

  const classe = creaClasse(annoId, 'I MEC A')
  rossi = creaAllievo('Rossi', 'Mario')
  bianchi = creaAllievo('Bianchi', 'Luca')
  neri = creaAllievo('Neri', 'Ugo')
  classe.allievi.push(rossi, bianchi, neri)

  const matematica = creaMateria('Matematica')
  const corso = creaCorso(classe.id, matematica.id, 'I MEC A — Matematica')

  archivio.modifica((r) => {
    r.impostazioni.pdfAutomatici = 'mai'
    r.classi.push(classe)
    r.materie.push(matematica)
    r.corsi.push(corso)
  }, ['classi', 'corsi', 'registro'])

  conAssente = creaValutazione(corso.id, 'Frazioni', undefined, '2026-10-05')
  conAssente.voti = [
    { allievoId: rossi.id, valore: 6, assente: false },
    { allievoId: bianchi.id, valore: 6, assente: false },
    // Il numero resta scritto, l'assenza pure: è il dato che si trova davvero
    // in un registro tenuto a mano, e il conto lo deve saltare.
    { allievoId: neri.id, valore: 1, assente: true },
  ]

  soloAssenti = creaValutazione(corso.id, 'Equazioni', undefined, '2026-11-09')
  soloAssenti.voti = [
    { allievoId: neri.id, valore: 3, assente: true },
  ]

  for (const valutazione of [conAssente, soloAssenti]) {
    const esito = await api.chiama(archivio, 'valutazioni.salva', { valutazione })
    assert.equal(esito.ok, true, JSON.stringify(esito))
  }
})

after(() => {
  archivio?.dispose()
  rmSync(radice, { recursive: true, force: true })
})

describe('valutazioni.voti conta solo i voti che contano', () => {
  it('chi era assente resta fuori da media e insufficienti', async () => {
    const esito = await api.chiama(archivio, 'valutazioni.voti', {
      valutazioneId: conAssente.id,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    // Sei e non 4.33: l'1 dell'assente non entra nella divisione.
    assert.equal(esito.dati.media, 6)
    assert.equal(esito.dati.insufficienti, 0)
    // La riga però c'è, con il suo numero e la sua spunta: quel che si toglie
    // è il conto, non il dato. Chi guarda la tabella deve vedere perché.
    const riga = esito.dati.righe.find((r) => r.allievoId === neri.id)
    assert.equal(riga.assente, true)
    assert.equal(riga.voto, 1)
    assert.equal(riga.sufficiente, false)
  })

  it('la stessa media che il dominio dà al pannello', async () => {
    const dominio = await import('../../dist-tests/domain.mjs')
    const momento = archivio.registro.valutazioni.find((v) => v.id === conAssente.id)
    const esito = await api.chiama(archivio, 'valutazioni.voti', {
      valutazioneId: conAssente.id,
    })
    assert.equal(esito.dati.media, dominio.mediaMomento(momento))
  })

  it('senza nemmeno un voto che conti la media è nulla, non zero', async () => {
    const esito = await api.chiama(archivio, 'valutazioni.voti', {
      valutazioneId: soloAssenti.id,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.media, null)
    assert.equal(esito.dati.insufficienti, 0)
  })
})
