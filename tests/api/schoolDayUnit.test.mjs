// La durata dell'unità didattica del documento: cambiandola orari, lezione
// proposta e ore a calendario tengono le loro UD, e non si cambia se un'ora ha
// l'appello (una casella per UD). Si prova dal gestore, con `esegui`.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-unita-didattica-')

let api
let archivio
let corso

const esegui = (azione) => api.esegui(archivio, azione)
const lezionePerId = (id) => archivio.registro.lezioni.find((l) => l.id === id)
const forma = (lezione) =>
  [...lezione.slot]
    .sort((a, b) => a.inizio.localeCompare(b.inizio))
    .map((s) => `${s.tipo} ${s.inizio}–${s.fine}`)

/** Le impostazioni come le rimanda la pagina, con una modifica. */
function impostazioniCon (modifica) {
  const { intestazione: _intestazione, ...resto } = archivio.registro.impostazioni
  return { ...resto, ...modifica }
}

before(async () => {
  ;({ api, archivio } = await archivioDiProva({ lavoro, dati, deposito: true, pdfAutomatici: 'mai' }))
  const annoId = archivio.registro.anni[0].id
  const classe = api.creaClasse(annoId, 'I MEC A')
  const materia = api.creaMateria('Matematica')
  corso = api.creaCorso(classe.id, materia.id, 'I MEC A — Matematica')
  corso.orario = [{ id: 'r1', giorno: 1, inizio: '08:00', durataMin: 2 * 45, aula: '' }]
  archivio.modifica((r) => {
    r.classi.push(classe)
    r.materie.push(materia)
    r.corsi.push(corso)
  }, ['classi', 'corsi'])
})

after(() => smonta(radice, archivio))

describe('la durata dell’unità didattica', () => {
  it('si legge dal documento: quarantacinque minuti se non l’ha mai detta', () => {
    assert.equal(archivio.registro.impostazioni.minutiUd, 45)
  })

  it('cambiata senza appelli, orario, lezione proposta e ore tengono le loro UD', async () => {
    const ora = api.creaLezione(corso.id, '2026-09-14', '08:00', 2 * 45)
    archivio.modifica((r) => { r.lezioni.push(ora) }, ['lezioni'])

    const esito = await esegui({
      tipo: 'impostazioni.salva',
      impostazioni: impostazioniCon({ minutiUd: 50, durataSlotPredefinita: 2 * 45 }),
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const impostazioni = archivio.registro.impostazioni
    assert.equal(impostazioni.minutiUd, 50)
    assert.equal(impostazioni.durataSlotPredefinita, 100, 'la lezione proposta resta di due UD')
    const fascia = archivio.registro.corsi.find((c) => c.id === corso.id).orario[0]
    assert.equal(fascia.durataMin, 100, 'la fascia dell’orario resta di due UD')
    assert.deepEqual(forma(lezionePerId(ora.id)), ['lezione 08:00–09:40'])
  })

  it('le pause dopo la prima si spostano con le UD', async () => {
    const esito = await esegui({
      tipo: 'impostazioni.salva',
      impostazioni: impostazioniCon({
        pause: { prima: { inizio: '09:40', durataMin: 15 }, seguenti: [{ dopoUd: 2, durataMin: 10 }] },
      }),
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    // Due UD da cinquanta dopo le 9:55: la seconda pausa comincia alle 11:35.
    const nuova = api.creaLezione(corso.id, '2026-09-15', '09:55', 3 * 50)
    const salvata = await esegui({ tipo: 'lezione.salva', lezione: nuova })
    assert.equal(salvata.ok, true, JSON.stringify(salvata))
    assert.deepEqual(forma(lezionePerId(nuova.id)), [
      'lezione 09:55–11:35',
      'pausa 11:35–11:45',
      'lezione 11:45–12:35',
    ])
  })

  it('rifiuta un’ora che non è fatta di UD intere di questa durata', async () => {
    const storta = api.creaLezione(corso.id, '2026-09-16', '14:00', 45)
    const esito = await esegui({ tipo: 'lezione.salva', lezione: storta })
    assert.equal(esito.ok, false)
    assert.match(esito.errori.join(' '), /multiplo dell’unità didattica \(50 min\)/)
  })

  it('fuori dagli estremi dice di no con il motivo', async () => {
    const esito = await esegui({
      tipo: 'impostazioni.salva',
      impostazioni: impostazioniCon({ minutiUd: 7 }),
    })
    assert.equal(esito.ok, false)
    assert.match(esito.errori.join(' '), /fra 20 e 120 minuti interi/)
    assert.equal(archivio.registro.impostazioni.minutiUd, 50)
  })

  it('non si cambia più quando un’ora ha l’appello', async () => {
    const conAppello = api.creaLezione(corso.id, '2026-09-17', '08:00', 2 * 50)
    conAppello.presenze = [{ allievoId: 'x', stati: ['presente', 'assente'] }]
    archivio.modifica((r) => { r.lezioni.push(conAppello) }, ['lezioni'])

    const esito = await esegui({
      tipo: 'impostazioni.salva',
      impostazioni: impostazioniCon({ minutiUd: 45 }),
    })
    assert.equal(esito.ok, false)
    assert.match(esito.errori.join(' '), /resta di 50 minuti: 1 ora ha già l’appello/)
    assert.equal(archivio.registro.impostazioni.minutiUd, 50)
    assert.deepEqual(forma(lezionePerId(conAppello.id)), ['lezione 08:00–09:40'])
  })
})
