// Le ore annullate non contano **da nessuna parte**. L'appello resta dentro la
// lezione, ma pagina del corso, scheda, avvisi, rapporti, esportazioni e le
// letture dell'API la lasciano fuori dai conti. Il confronto si fa con la
// funzione della pagina (`matriceCorso` sulle ore tenute, UD previste
// dall'orario), non con un numero scritto a mano.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { matriceCorso, udPrevisteDaOrario } from '../../dist-tests/domain.mjs'
import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-annullate-')

let api
let archivio
let anno
let classe
let rossi
let corso

/** Il martedì, una fascia da 90 minuti: due UD per ora. */
const MARTEDI = 2

/** Settembre: cinque martedì, cioè dieci UD previste dall'orario. */
const DAL = '2026-09-01'
const AL = '2026-09-30'

before(async () => {
  ;({ api, archivio } = await archivioDiProva({ lavoro, dati, pdfAutomatici: 'mai' }))

  const {
    creaAllievo, creaClasse, creaCorso, creaLezione, creaMateria,
  } = api

  anno = archivio.registro.anni[0]

  classe = creaClasse(anno.id, 'I MEC A')
  rossi = creaAllievo('Rossi', 'Maria')
  classe.allievi.push(rossi)

  const matematica = creaMateria('Matematica')
  corso = creaCorso(classe.id, matematica.id, 'I MEC A — Matematica')
  corso.orario = [{ id: 'ric-annullate-01', giorno: MARTEDI, inizio: '08:20', durataMin: 90, aula: '' }]

  const annullata = creaLezione(corso.id, '2026-09-01', '08:20', 90)
  const tenuta = creaLezione(corso.id, '2026-09-08', '08:20', 90)

  archivio.modifica((r) => {
    r.classi.push(classe)
    r.materie.push(matematica)
    r.corsi.push(corso)
    r.lezioni.push(annullata, tenuta)
  }, ['classi', 'corsi', 'lezioni', 'registro'])

  const segna = (lezione, stato) =>
    api.chiama(archivio, 'ore.appello.riga', { lezioneId: lezione.id, allievoId: rossi.id, stato })
  await segna(annullata, 'assente')
  await segna(tenuta, 'presente')

  // Annullata **dopo** l'appello, come succede davvero.
  archivio.modifica((r) => {
    const lezione = r.lezioni.find((l) => l.id === annullata.id)
    lezione.stato = 'annullata'
  }, ['lezioni'])
})

after(() => smonta(radice, archivio))

/** La riga di Rossi come la calcola la pagina del corso: ore tenute, UD dall'orario. */
function comeLaPagina () {
  const r = archivio.registro
  const tenute = r.lezioni.filter(
    (l) => l.corsoId === corso.id && l.data >= DAL && l.data <= AL && l.stato !== 'annullata',
  )
  const previste = udPrevisteDaOrario(anno, corso, DAL, AL, 45)
  const matrice = matriceCorso([rossi], tenute, [], r.impostazioni, previste)
  return { previste, riga: matrice.righe[0] }
}

describe('le ore annullate, nelle letture per corso e per persona', () => {
  it('la pagina non le conta: è il riferimento', () => {
    const { previste, riga } = comeLaPagina()
    assert.equal(previste, 10, 'cinque martedì da due UD')
    assert.equal(riga.udAssenza, 0)
  })

  it('corso.presenze dice lo stesso numero della pagina', async () => {
    const esito = await api.chiama(archivio, 'corso.presenze', { corsoId: corso.id, dal: DAL, al: AL })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const riga = esito.dati.righe.find((voce) => voce.allievoId === rossi.id)
    const pagina = comeLaPagina().riga
    assert.equal(riga.udAssenza, pagina.udAssenza, 'le UD di assenza dell’ora annullata sono contate')
    assert.equal(riga.assenza, pagina.assenza)
    // Le ore a calendario restano due, una annullata: sono le **assenze** a non
    // guardarla.
    assert.equal(esito.dati.oreGuardate, 2)
  })

  it('persone.scheda dice lo stesso numero della pagina', async () => {
    const esito = await api.chiama(archivio, 'persone.scheda', { allievoId: rossi.id, dal: DAL, al: AL })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const suo = esito.dati.corsi.find((voce) => voce.corsoId === corso.id)
    const pagina = comeLaPagina().riga
    assert.equal(suo.udAssenza, pagina.udAssenza, 'le UD di assenza dell’ora annullata sono contate')
    assert.equal(suo.assenza, pagina.assenza)
  })
})
