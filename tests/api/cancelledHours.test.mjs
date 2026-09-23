// Le ore annullate non contano, e non contano **da nessuna parte**.
//
// Annullare un'ora non cancella l'appello che aveva: le caselle restano dentro
// la lezione, con il loro «assente». La pagina del corso, la scheda della
// persona, gli avvisi, i rapporti e le esportazioni le lasciano fuori dai conti
// — un'ora che non si è tenuta non è un'ora in cui qualcuno poteva mancare — e
// `persone.assenze` faceva lo stesso. `corso.presenze` e `persone.scheda` no:
// con venti UD previste e due di assenza in un'ora poi annullata, la pagina e il
// PDF dicevano 0% e le due letture 10%. Lo stesso allievo, due numeri, e quello
// sbagliato era proprio quello che un modello o uno script avrebbero ripetuto.
//
// Qui il confronto si fa con la funzione che usa la pagina — `matriceCorso`
// sulle sole ore tenute, con le UD previste dall'orario — e non con un numero
// scritto a mano: se la pagina cambiasse regola, la prova direbbe che le due
// strade si sono separate, che è la cosa da sapere.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

import { matriceCorso, udPrevisteDaOrario } from '../../dist-tests/domain.mjs'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-api-annullate-'))
const lavoro = percorso.join(radice, 'lavoro')
const dati = percorso.join(lavoro, 'registro')
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

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
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(dati, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify({ cartellaLavoro: lavoro }),
  )

  api = await import('../../dist-tests/api.mjs')
  api.registraTutte()

  const {
    Archivio, Uri, creaAllievo, creaAnno, creaClasse, creaCorso, creaLezione, creaMateria,
  } = api

  archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  await archivio.apri(null)
  await archivio.creaAnno(
    creaAnno('2026-09-01', '2027-06-30'),
    Uri.file(percorso.join(dati, '2026-2027.registro')),
  )
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
    r.impostazioni.pdfAutomatici = 'mai'
    r.classi.push(classe)
    r.materie.push(matematica)
    r.corsi.push(corso)
    r.lezioni.push(annullata, tenuta)
  }, ['classi', 'corsi', 'lezioni', 'registro'])

  const segna = (lezione, stato) =>
    api.chiama(archivio, 'ore.appello.riga', { lezioneId: lezione.id, allievoId: rossi.id, stato })
  await segna(annullata, 'assente')
  await segna(tenuta, 'presente')

  // Annullata **dopo** l'appello, come succede davvero: l'ora era a calendario,
  // l'appello è stato fatto per abitudine, poi si scopre che era in gita.
  archivio.modifica((r) => {
    const lezione = r.lezioni.find((l) => l.id === annullata.id)
    lezione.stato = 'annullata'
  }, ['lezioni'])
})

after(() => {
  archivio?.dispose()
  rmSync(radice, { recursive: true, force: true })
})

/** La riga di Rossi come la calcola la pagina del corso: ore tenute, UD dall'orario. */
function comeLaPagina () {
  const r = archivio.registro
  const tenute = r.lezioni.filter(
    (l) => l.corsoId === corso.id && l.data >= DAL && l.data <= AL && l.stato !== 'annullata',
  )
  const previste = udPrevisteDaOrario(anno, corso, DAL, AL)
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
    // Le ore a calendario restano quelle che sono: il periodo ne ha due, e una
    // è annullata. È il conto delle **assenze** che non la guarda.
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
