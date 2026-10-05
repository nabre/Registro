import assert from 'node:assert/strict'
import { after, before, it } from 'node:test'
import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'
import { lezioniDelProgetto, nelCorso } from '../../dist-tests/domain.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-pianificazione-')
let api
let archivio
let corso
before(async () => {
  ;({ api, archivio } = await archivioDiProva({ lavoro, dati, pdfAutomatici: 'mai' }))
  const classe = api.creaClasse(archivio.registro.anni[0].id, 'Classe')
  const materia = api.creaMateria('Materia')
  corso = api.creaCorso(classe.id, materia.id, 'Corso')
  archivio.modifica((r) => {
    r.classi.push(classe)
    r.materie.push(materia)
    r.corsi.push(corso)
  }, ['classi', 'corsi', 'registro'])
})
after(() => smonta(radice, archivio))

async function salva (nome, ingresso) {
  const esito = await api.chiama(archivio, nome, ingresso)
  assert.equal(esito.ok, true, JSON.stringify(esito))
}

it('promuove dal piano, importa senza sovrascrivere, sincronizza nei due versi e preserva durata e omissioni', async () => {
  const progetto = api.creaProgetto(corso.id, 'Officina')
  await salva('progetti.salva', { progetto })
  const piano = api.creaPiano(corso.id)
  piano.attivita = [{ ...api.creaAttivita('Montare', 1), progettoId: progetto.id }]
  await salva('piani.salva', { piano })
  const primo = () => structuredClone(archivio.registro.piani.find((p) => p.id === piano.id))
  const origine = () => structuredClone(
    archivio.registro.progetti.find((p) => p.id === progetto.id))
  const canonicaId = primo().attivita[0].attivitaProgettoId
  assert.ok(canonicaId)
  assert.equal(origine().attivita[0].titolo, 'Montare')
  const secondo = api.creaPiano(corso.id)
  secondo.attivita = [{ ...api.creaAttivita('Contenuto vecchio', 2), progettoId: progetto.id,
    attivitaProgettoId: canonicaId, faseProgettoId: progetto.fasi[0].id }]
  await salva('piani.salva', { piano: secondo })
  const copia = () => structuredClone(archivio.registro.piani.find((p) => p.id === secondo.id))
  assert.equal(copia().attivita[0].titolo, 'Montare')
  const modificato = primo()
  modificato.attivita[0].titolo = 'Montare con cura'
  modificato.attivita[0].durataUd = 0.5
  await salva('piani.salva', { piano: modificato })
  assert.equal(origine().attivita[0].titolo, 'Montare con cura')
  assert.equal(copia().attivita[0].titolo, 'Montare con cura')
  assert.equal(copia().attivita[0].durataUd, 2)
  assert.equal(origine().attivita[0].durataUd, 1)
  const aggiornato = origine()
  aggiornato.attivita[0].descrizione = 'Banco pulito'
  await salva('progetti.salva', { progetto: aggiornato })
  assert.equal(primo().attivita[0].descrizione, 'Banco pulito')
  assert.equal(primo().attivita[0].durataUd, 0.5)
  delete aggiornato.attivita
  await salva('progetti.salva', { progetto: aggiornato })
  assert.equal(origine().attivita.length, 1)
  await salva('progetti.salva', { progetto: { ...origine(), attivita: [] } })
  assert.equal(primo().attivita[0].attivitaProgettoId, null)
  assert.equal(copia().attivita[0].titolo, 'Montare con cura')
  await salva('piani.salva', { piano: primo() })
  assert.equal(origine().attivita.length, 0)
})

it('rifiuta un riferimento canonico inesistente senza scrivere', async () => {
  const progetto = api.creaProgetto(corso.id, 'Progetto')
  await salva('progetti.salva', { progetto })
  const piano = api.creaPiano(corso.id)
  piano.attivita = [{ ...api.creaAttivita('Attività', 1), progettoId: progetto.id, attivitaProgettoId: 'inesistente' }]
  const revisione = archivio.revisione
  const esito = await api.chiama(archivio, 'piani.salva', { piano })
  assert.equal(esito.ok, false)
  assert.equal(archivio.revisione, revisione)
})

it('la bozza antecedente alla promozione riusa l’origine e conserva lo sgancio', async () => {
  const progetto = api.creaProgetto(corso.id, 'Bozza')
  await salva('progetti.salva', { progetto })
  const piano = api.creaPiano(corso.id)
  piano.attivita = [{ ...api.creaAttivita('Preparare', 1), progettoId: progetto.id }]
  const origine = () => archivio.registro.progetti.find((p) => p.id === progetto.id)
  const istanza = () => archivio.registro.piani.find((p) => p.id === piano.id).attivita[0]
  await salva('piani.salva', { piano })
  const originId = istanza().attivitaProgettoId
  await salva('piani.salva', { piano })
  assert.equal(origine().attivita.length, 1)
  assert.equal(istanza().attivitaProgettoId, originId)
  piano.attivita[0].titolo = 'Preparare insieme'
  await salva('piani.salva', { piano })
  assert.equal(origine().attivita.length, 1)
  assert.equal(origine().attivita[0].titolo, 'Preparare insieme')
  await salva('progetti.salva', { progetto: { ...structuredClone(origine()), attivita: [] } })
  await salva('piani.salva', { piano })
  assert.equal(istanza().attivitaProgettoId, null)
  assert.equal(origine().attivita.length, 0)
})

it('togliere una fase rimappa la scaletta e le istanze nella fase precedente', async () => {
  const progetto = api.creaProgetto(corso.id, 'Tre fasi')
  progetto.fasi.push({ id: 'fase-seconda', titolo: 'Seconda' }, { id: 'fase-terza', titolo: 'Terza' })
  await salva('progetti.salva', { progetto })
  const piano = api.creaPiano(corso.id)
  piano.attivita = [{ ...api.creaAttivita('Lavoro', 1), progettoId: progetto.id, faseProgettoId: 'fase-terza' }]
  await salva('piani.salva', { piano })
  const aggiornato = structuredClone(archivio.registro.progetti.find((p) => p.id === progetto.id))
  aggiornato.fasi.pop()
  await salva('progetti.salva', { progetto: aggiornato })
  assert.equal(archivio.registro.progetti.find((p) => p.id === progetto.id).attivita[0].faseId, 'fase-seconda')
  assert.equal(archivio.registro.piani.find((p) => p.id === piano.id).attivita[0].faseProgettoId, 'fase-seconda')
})

it('una tappa già del progetto, scritta prima della scaletta, resta autonoma a ogni salvataggio', async () => {
  const progetto = api.creaProgetto(corso.id, 'Interviste')
  await salva('progetti.salva', { progetto })
  // Com'è su disco un piano di prima della v6: progetto e fase, nessuna origine.
  const vecchi = [api.creaPiano(corso.id), api.creaPiano(corso.id), api.creaPiano(corso.id)]
  for (const piano of vecchi) {
    piano.attivita = [{ ...api.creaAttivita('Intervista', 1), progettoId: progetto.id,
      faseProgettoId: progetto.fasi[0].id }]
  }
  archivio.modifica((r) => { r.piani.push(...structuredClone(vecchi)) }, ['piani'])
  for (const piano of vecchi) await salva('piani.salva', { piano })
  await salva('piani.salva', { piano: vecchi[0] })
  const scaletta = archivio.registro.progetti.find((p) => p.id === progetto.id).attivita
  assert.deepEqual(scaletta, [], 'nessuna «Intervista» nasce nella scaletta')
  for (const piano of vecchi) {
    const [tappa] = archivio.registro.piani.find((p) => p.id === piano.id).attivita
    assert.deepEqual([tappa.progettoId, tappa.attivitaProgettoId], [progetto.id, null])
  }
  // Una tappa nuova dello stesso piano sì: è il progetto che la riceve adesso.
  const conNuova = structuredClone(archivio.registro.piani.find((p) => p.id === vecchi[0].id))
  conNuova.attivita.push({ ...api.creaAttivita('Sintesi', 1), progettoId: progetto.id })
  await salva('piani.salva', { piano: conNuova })
  assert.deepEqual(
    archivio.registro.progetti.find((p) => p.id === progetto.id).attivita.map((a) => a.titolo),
    ['Sintesi'],
  )
})

it('un piano senza corso assegnato a un’ora integra il progetto delle tappe nel corso dell’ora', async () => {
  const progetto = api.creaProgetto(null, 'Senza corso')
  await salva('progetti.salva', { progetto })
  // Com'è un piano il cui corso se n'è andato: senza corso, le tappe col progetto.
  const piano = api.creaPiano(null)
  piano.attivita = [{ ...api.creaAttivita('Raccogliere', 1), progettoId: progetto.id,
    faseProgettoId: progetto.fasi[0].id, attivitaProgettoId: null }]
  archivio.modifica((r) => { r.piani.push(piano) }, ['piani'])
  const integrazioni = () =>
    archivio.registro.progetti.find((p) => p.id === progetto.id).integrazioni.map((i) => i.corsoId)
  assert.deepEqual(integrazioni(), [])
  const ora = api.creaLezione(corso.id, '2026-10-05', '08:00', 45)
  archivio.modifica((r) => { r.lezioni.push(ora) }, ['lezioni'])
  await salva('piani.assegna', { lezioneId: ora.id, pianoId: piano.id })
  assert.deepEqual(integrazioni(), [corso.id])
  const vista = nelCorso(archivio.registro.progetti.find((p) => p.id === progetto.id), corso.id)
  assert.deepEqual(lezioniDelProgetto(archivio.registro, vista).map((l) => l.lezione.id), [ora.id])
})
