// Il confronto con il calendario dall'API: aggiungere un .ics, leggerlo dalla
// copia, applicare la revisione senza cancellare niente. Il calendario sta in
// un file: la rete qui non serve.

import assert from 'node:assert/strict'
import { renameSync, writeFileSync } from 'node:fs'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-calendario-')

let api
let archivio
let corso
let vecchia
let svolta

const file = percorso.join(radice, 'orario.ics')

/** Un evento del corso in ora locale flottante: è quel che scrive la maggior parte dei gestionali. */
const evento = (uid, giorno, da, a, altro = []) => [
  'BEGIN:VEVENT',
  `UID:${uid}`,
  `DTSTART:${giorno}T${da}00`,
  `DTEND:${giorno}T${a}00`,
  'SUMMARY:Matematica I MEC A',
  ...altro,
  'END:VEVENT',
]

before(async () => {
  writeFileSync(file, [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    ...evento('nuova', '20260916', '0820', '0905'),
    ...evento('spostata', '20260915', '0835', '0920', ['LOCATION:A12']),
    ...evento('annullata', '20260917', '0820', '0905', ['STATUS:CANCELLED']),
    'BEGIN:VEVENT',
    'UID:riunione',
    'DTSTART:20260915T160000',
    'DTEND:20260915T173000',
    'SUMMARY:Collegio docenti',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n'))
  ;({ api, archivio } = await archivioDiProva({
    lavoro,
    dati,
    deposito: true,
    pdfAutomatici: 'mai',
  }))
  const { creaClasse, creaCorso, creaLezione, creaMateria } = api

  const classe = creaClasse(archivio.registro.anni[0].id, 'I MEC A')
  const materia = creaMateria('Matematica')
  corso = creaCorso(classe.id, materia.id, 'I MEC A — Matematica')
  vecchia = creaLezione(corso.id, '2026-09-15', '08:20', 45)
  svolta = creaLezione(corso.id, '2026-09-17', '08:20', 45)
  // Nel periodo del calendario ma senza un evento: da segnalare, mai da togliere.
  const orfana = creaLezione(corso.id, '2026-09-16', '14:00', 45)
  svolta.stato = 'svolta'
  archivio.modifica((r) => {
    r.classi.push(classe)
    r.materie.push(materia)
    r.corsi.push(corso)
    r.lezioni.push(vecchia, orfana, svolta)
  }, ['classi', 'corsi', 'lezioni', 'registro'])
})

after(() => smonta(radice, archivio))

/** Il primo calendario del documento: quello che il confronto legge senza id. */
const primo = () => archivio.registro.impostazioni.calendario?.calendari[0]

describe('i calendari del documento', () => {
  it('un file che non c’è non si aggiunge, e la frase non dice il percorso', async () => {
    const esito = await api.chiama(archivio, 'calendario.aggiungi', { origine: percorso.join(radice, 'non-ce.ics') })
    assert.equal(esito.ok, false)
    assert.ok(!esito.messaggi.join(' ').includes(radice))
    assert.equal(archivio.registro.impostazioni.calendario, undefined)
  })

  it('un file si aggiunge con la sua copia, e il nome viene dal file', async () => {
    const esito = await api.chiama(archivio, 'calendario.aggiungi', { origine: file })
    assert.equal(esito.ok, true, JSON.stringify(esito).slice(0, 400))
    const aggiunto = primo()
    assert.equal(aggiunto.nome, 'orario')
    assert.equal(aggiunto.origine, file)
    assert.ok(aggiunto.copiatoIl, 'la copia è fatta subito')
  })

  it('la stessa origine due volte non fa due calendari', async () => {
    const esito = await api.chiama(archivio, 'calendario.aggiungi', { origine: file })
    assert.equal(esito.ok, false)
    assert.equal(archivio.registro.impostazioni.calendario.calendari.length, 1)
  })

  it('un nome si cambia, e un’origine che non si legge lascia tutto com’era', async () => {
    const id = primo().id
    const rinomina = await api.chiama(archivio, 'calendario.modifica', { calendarioId: id, nome: 'Orario di sede' })
    assert.equal(rinomina.ok, true, JSON.stringify(rinomina).slice(0, 400))
    assert.equal(primo().nome, 'Orario di sede')

    const prima = { ...primo() }
    const sbagliata = await api.chiama(archivio, 'calendario.modifica', {
      calendarioId: id,
      origine: percorso.join(radice, 'sparito.ics'),
    })
    assert.equal(sbagliata.ok, false)
    assert.deepEqual(primo(), prima)
  })
})

describe('calendario.confronta', () => {
  it('è una lettura che il modello non chiama', () => {
    const p = api.procedura('calendario.confronta')
    assert.equal(p.genere, 'lettura')
    assert.equal(p.perAssistente, false)
  })

  it('un calendario che il documento non ha è «non trovato»', async () => {
    const esito = await api.chiama(archivio, 'calendario.confronta', { calendarioId: 'ics-inesistente-0000' })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'non-trovato')
  })

  it('legge la copia nel documento: il file di partenza può anche sparire', async () => {
    const via = `${file}.via`
    renameSync(file, via)
    try {
      const esito = await api.chiama(archivio, 'calendario.confronta', {})
      assert.equal(esito.ok, true, JSON.stringify(esito).slice(0, 400))
      // E «Aggiorna», che rilegge l'origine, dice di no e lascia la copia.
      const aggiorna = await api.chiama(archivio, 'calendario.aggiorna', { calendarioId: primo().id })
      assert.equal(aggiorna.ok, false)
      assert.ok(!aggiorna.messaggi.join(' ').includes(radice))
      const ancora = await api.chiama(archivio, 'calendario.confronta', {})
      assert.equal(ancora.ok, true)
    } finally {
      renameSync(via, file)
    }
  })

  it('mette il calendario a fronte delle lezioni, e non scrive niente', async () => {
    const prima = archivio.revisione
    const esito = await api.chiama(archivio, 'calendario.confronta', {})
    assert.equal(esito.ok, true, JSON.stringify(esito).slice(0, 400))
    assert.equal(archivio.revisione, prima)
    const perEsito = Object.fromEntries(esito.dati.voci.map((v) => [v.esito, v]))
    assert.equal(perEsito.nuova.data, '2026-09-16')
    assert.equal(perEsito.allineare.lezioneId, vecchia.id)
    assert.equal(perEsito.annullare.lezioneId, svolta.id)
    assert.equal(perEsito.annullare.statoLezione, 'svolta')
    assert.deepEqual(esito.dati.senzaCorso.map((g) => g.titolo), ['Collegio docenti'])
    assert.equal(esito.dati.assenti.length, 1)
  })
})

describe('calendario.applica', () => {
  it('crea, allinea, annulla e salva le regole — e le lezioni che mancano restano', async () => {
    const letto = await api.chiama(archivio, 'calendario.confronta', {})
    const voci = letto.dati.voci
    const nuova = voci.find((v) => v.esito === 'nuova')
    const spostata = voci.find((v) => v.esito === 'allineare')
    const quante = archivio.registro.lezioni.length

    const esito = await api.chiama(archivio, 'calendario.applica', {
      regole: [{ testo: 'Collegio docenti', corsoId: null }],
      crea: [{ corsoId: nuova.corsoId, data: nuova.data, fasce: nuova.fasce }],
      allinea: [{ lezioneId: spostata.lezioneId, fasce: spostata.fasce, aula: spostata.aula }],
      annulla: [],
    })
    assert.equal(esito.ok, true, JSON.stringify(esito).slice(0, 400))

    const r = archivio.registro
    assert.equal(r.lezioni.length, quante + 1, 'una lezione in più, nessuna in meno')
    const allineata = r.lezioni.find((l) => l.id === vecchia.id)
    assert.equal(allineata.slot[0].inizio, '08:35')
    assert.equal(allineata.aula, 'A12')
    assert.equal(allineata.slot[0].id, vecchia.slot[0].id, 'la fascia allineata tiene il suo id')
    assert.equal(r.lezioni.find((l) => l.id === svolta.id).stato, 'svolta', 'non spuntata, non toccata')
    assert.equal(r.impostazioni.calendario.calendari[0].origine, file, 'i calendari restano')
    assert.equal(r.impostazioni.calendario.regole.length, 1)
    assert.equal(r.impostazioni.calendario.regole[0].corsoId, null)
    assert.match(r.impostazioni.calendario.regole[0].id, /^rgc-/)

    // Con la regola salvata la riunione non si propone più.
    const dopo = await api.chiama(archivio, 'calendario.confronta', {})
    assert.deepEqual(dopo.dati.senzaCorso, [])
    assert.equal(dopo.dati.ignorati, 1)
  })

  it('la stessa revisione due volte non fa due lezioni', async () => {
    const quante = archivio.registro.lezioni.length
    const esito = await api.chiama(archivio, 'calendario.applica', {
      regole: archivio.registro.impostazioni.calendario.regole,
      crea: [{ corsoId: corso.id, data: '2026-09-16', fasce: [{ inizio: '08:20', fine: '09:05', tipo: 'lezione' }] }],
      allinea: [],
      annulla: [svolta.id],
    })
    assert.equal(esito.ok, true, JSON.stringify(esito).slice(0, 400))
    assert.equal(archivio.registro.lezioni.length, quante)
    assert.equal(archivio.registro.lezioni.find((l) => l.id === svolta.id).stato, 'annullata')
  })

  it('una fascia che non è fatta di unità didattiche intere rifiuta tutto, e non scrive niente', async () => {
    const prima = archivio.revisione
    const esito = await api.chiama(archivio, 'calendario.applica', {
      regole: [],
      crea: [{ corsoId: corso.id, data: '2026-10-01', fasce: [{ inizio: '08:20', fine: '08:50', tipo: 'lezione' }] }],
      allinea: [],
      annulla: [],
    })
    assert.equal(esito.ok, false)
    assert.equal(archivio.revisione, prima)
  })
})

describe('più calendari, e toglierli', () => {
  const secondo = percorso.join(radice, 'laboratori.ics')

  it('gli eventi di tutti insieme, con la chiave che dice di quale calendario', async () => {
    writeFileSync(secondo, [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      // Lo stesso UID del primo calendario: restano due eventi distinti.
      ...evento('nuova', '20260918', '1000', '1045'),
      'END:VCALENDAR',
      '',
    ].join('\r\n'))
    const aggiunto = await api.chiama(archivio, 'calendario.aggiungi', { origine: secondo, nome: 'Laboratori' })
    assert.equal(aggiunto.ok, true, JSON.stringify(aggiunto).slice(0, 400))
    const [sede, lab] = archivio.registro.impostazioni.calendario.calendari
    assert.equal(lab.nome, 'Laboratori')

    const tutti = await api.chiama(archivio, 'calendario.eventi', { dal: '2026-09-01', al: '2026-09-30' })
    assert.equal(tutti.ok, true, JSON.stringify(tutti).slice(0, 400))
    const chiavi = tutti.dati.eventi.map((e) => e.chiave)
    assert.equal(new Set(chiavi).size, chiavi.length, 'nessuna chiave doppia fra calendari')
    assert.ok(tutti.dati.eventi.some((e) => e.calendarioId === sede.id))
    assert.ok(tutti.dati.eventi.some((e) => e.calendarioId === lab.id))

    const solo = await api.chiama(archivio, 'calendario.eventi', { calendarioId: lab.id, dal: '2026-09-01', al: '2026-09-30' })
    assert.deepEqual(solo.dati.eventi.map((e) => e.data), ['2026-09-18'])
  })

  it('«Aggiorna» rilegge l’origine e la copia cambia', async () => {
    const lab = archivio.registro.impostazioni.calendario.calendari[1]
    writeFileSync(secondo, [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      ...evento('nuova', '20260925', '1000', '1045'),
      'END:VCALENDAR',
      '',
    ].join('\r\n'))
    // Prima di «Aggiorna» si legge ancora la copia vecchia.
    const prima = await api.chiama(archivio, 'calendario.eventi', { calendarioId: lab.id, dal: '2026-09-01', al: '2026-09-30' })
    assert.deepEqual(prima.dati.eventi.map((e) => e.data), ['2026-09-18'])

    const esito = await api.chiama(archivio, 'calendario.aggiorna', { calendarioId: lab.id })
    assert.equal(esito.ok, true, JSON.stringify(esito).slice(0, 400))
    const dopo = await api.chiama(archivio, 'calendario.eventi', { calendarioId: lab.id, dal: '2026-09-01', al: '2026-09-30' })
    assert.deepEqual(dopo.dati.eventi.map((e) => e.data), ['2026-09-25'])
  })

  it('togliere un calendario lascia gli altri e le regole', async () => {
    const [sede, lab] = archivio.registro.impostazioni.calendario.calendari
    const esito = await api.chiama(archivio, 'calendario.togli', { calendarioId: lab.id })
    assert.equal(esito.ok, true, JSON.stringify(esito).slice(0, 400))
    const rimasto = archivio.registro.impostazioni.calendario
    assert.deepEqual(rimasto.calendari.map((c) => c.id), [sede.id])
    assert.ok(rimasto.regole.length > 0)
    const letto = await api.chiama(archivio, 'calendario.eventi', { calendarioId: lab.id })
    assert.equal(letto.codice, 'non-trovato')
  })

  it('l’ultimo calendario tolto, senza regole, porta via tutto il campo', async () => {
    const { calendario: _vecchio, ...resto } = archivio.registro.impostazioni
    await api.chiama(archivio, 'impostazioni.salva', {
      impostazioni: {
        ...resto,
        calendario: {
          calendari: archivio.registro.impostazioni.calendario.calendari,
          regole: [],
        },
      },
    })
    const esito = await api.chiama(archivio, 'calendario.togli', { calendarioId: primo().id })
    assert.equal(esito.ok, true, JSON.stringify(esito).slice(0, 400))
    assert.equal(archivio.registro.impostazioni.calendario, undefined)
  })
})
