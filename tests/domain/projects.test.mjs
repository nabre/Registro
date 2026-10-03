// Il progetto dell'anno e la sua integrazione nei corsi (ADR-54 e la sua
// estensione): le letture del dominio (lezioni dai piani, punto di un
// compito, progressione), la lettura di un file toccato a mano, e che cosa
// succede al progetto quando se ne vanno corso, persona, lezione o il
// progetto stesso. Più le fasi (le tappe dei piani che ognuna raccoglie, e il
// quadro che se ne ricava), i riferimenti rotti e le riparazioni.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  avanzamentoDelProgetto,
  creaAttivita,
  creaLezione,
  creaPiano,
  creaProgetto,
  duplicaIntegrazione,
  eliminazione,
  faseDellAttivita,
  fetteDellAnno,
  fineEffettiva,
  lezioniDelProgetto,
  lezioniDellaFase,
  livelliPredefiniti,
  momentiDelProgetto,
  nelCorso,
  normalizzaProgetto,
  normalizzaRegistro,
  periodoDellaFase,
  presenzeNelProgetto,
  progettiDelCorso,
  progressione,
  quadroDelProgetto,
  riferimentiRotti,
  riparazioni,
  statoCompitoPerAllievo,
} from '../../dist-tests/domain.mjs'
import { registroCompleto } from '../helpers/modelli.mjs'

/** Applica l'eliminazione al registro e torna il piano, come fa il contesto. */
function togli (registro, bersaglio) {
  const piano = eliminazione(registro, bersaglio)
  assert.ok(piano, `niente da togliere: ${JSON.stringify(bersaglio)}`)
  piano.applica(registro)
  return piano
}

const progettoDi = (registro) => registro.progetti.find((p) => p.id === 'prg-1')
/** Il progetto visto dal suo corso: gli elenchi sono quelli dell'integrazione. */
const nelSuoCorso = (registro) => nelCorso(progettoDi(registro), 'cor-1')
/** Il lavoro con la classe di `cor-1`. */
const integrazioneDi = (registro) => progettoDi(registro).integrazioni[0]

describe('progetti: le letture del dominio', () => {
  it('un registro completo non ha riferimenti rotti nel progetto', () => {
    assert.deepEqual(riferimentiRotti(registroCompleto()).filter((r) => /progett/i.test(r)), [])
  })

  it('le lezioni del progetto vengono dai piani, con le tappe che lavorano per lui', () => {
    const registro = registroCompleto()
    const lezioni = lezioniDelProgetto(registro, nelSuoCorso(registro))
    assert.deepEqual(lezioni.map(({ lezione }) => lezione.id), ['lez-1'])
    assert.deepEqual(lezioni[0].attivita.map((a) => a.titolo), ['Esercizi'])
    // Una tappa staccata, e la lezione non è più del progetto.
    delete registro.piani[0].attivita[0].progettoId
    assert.deepEqual(lezioniDelProgetto(registro, nelSuoCorso(registro)), [])
  })

  it('i momenti del progetto sono quelli del corso che lo nominano', () => {
    const registro = registroCompleto()
    assert.deepEqual(momentiDelProgetto(registro, nelSuoCorso(registro)).map((m) => m.id), ['val-1'])
    assert.deepEqual(momentiDelProgetto(registro, { id: 'prg-1', corsoId: 'cor-altro' }), [])
  })

  it('il punto di un compito: fatto, in corso, non iniziato, scaduto con la proroga', () => {
    const registro = registroCompleto()
    const [compito] = integrazioneDi(registro).compiti
    assert.equal(statoCompitoPerAllievo(registro, compito, 'al-1', '2026-12-01'), 'fatto')
    assert.equal(statoCompitoPerAllievo(registro, compito, 'al-2', '2026-11-01'), 'in-corso')
    assert.equal(fineEffettiva(registro, compito, 'al-2'), '2026-11-06')
    assert.equal(statoCompitoPerAllievo(registro, compito, 'al-2', '2026-11-07'), 'scaduto')
    compito.inizi = []
    assert.equal(statoCompitoPerAllievo(registro, compito, 'al-2', '2026-10-10'), 'non-iniziato')
  })

  it('la fine data in un’ora segue la lezione, come per le consegne', () => {
    const registro = registroCompleto()
    const [compito] = integrazioneDi(registro).compiti
    compito.fineLezioneId = 'lez-1'
    registro.lezioni[0].data = '2026-10-13'
    assert.equal(fineEffettiva(registro, compito, 'al-1'), '2026-10-13')
  })

  it('la progressione: le celle di ogni criterio dalla prima, col giorno della loro ora', () => {
    const registro = registroCompleto()
    // L'ora si sposta dopo la seconda cella: vale il giorno di adesso.
    registro.lezioni[0].data = '2026-10-27'
    const [precisione, presentazione] = progressione(registro, nelSuoCorso(registro), 'al-1')
    assert.equal(precisione.criterio.id, 'crp-1')
    assert.deepEqual(precisione.celle.map((c) => c.livello), ['raggiunto', 'parziale'])
    assert.deepEqual(presentazione.celle, [])
  })

  it('i progetti integrati in un corso, i più vicini prima; non quelli d’altri', () => {
    const registro = registroCompleto()
    const altro = { ...creaProgetto('cor-1', 'Abaco'), inizio: '2026-09-01' }
    registro.progetti.push(altro, creaProgetto(null, 'Biblioteca'), creaProgetto('cor-altro', 'Altrove'))
    const delCorso = progettiDelCorso(registro, 'cor-1')
    assert.deepEqual(delCorso.map((p) => p.titolo), ['Il bilancio di classe', 'Abaco'])
    assert.equal(delCorso[0].corsoId, 'cor-1')
    assert.equal(delCorso[0].stato, 'in-corso')
  })

  it('va nell’anno dei corsi in cui è integrato; senza integrazioni, fra gli sciolti', () => {
    const registro = registroCompleto()
    registro.progetti.push(creaProgetto(null, 'Biblioteca'))
    assert.deepEqual(fetteDellAnno(registro, 'a1', false).progetti.map((p) => p.id), ['prg-1'])
    assert.deepEqual(fetteDellAnno(registro, 'altro', false).progetti, [])
    assert.deepEqual(fetteDellAnno(registro, 'altro', true).progetti.map((p) => p.titolo), ['Biblioteca'])
  })
})

describe('progetti: la lettura del file', () => {
  it('nasce con la scala di serie; con un corso, integrato lì in bozza', () => {
    const progetto = creaProgetto('cor-1', ' Officina ')
    assert.equal(progetto.titolo, 'Officina')
    assert.deepEqual(progetto.integrazioni.map((i) => [i.corsoId, i.stato]), [['cor-1', 'bozza']])
    assert.deepEqual(creaProgetto(null, 'Biblioteca').integrazioni, [])
    const valori = (livelli) => livelli.map((l) => l.valore)
    assert.deepEqual(valori(progetto.livelli), valori(livelliPredefiniti()))
    assert.equal(progetto.livelli.length, 4)
  })

  it('raddrizza un file toccato a mano senza perdere quel che si capisce', () => {
    const progetto = normalizzaProgetto({
      id: 'prg-x',
      titolo: 'X',
      livelli: [],
      criteri: [{ id: 'crp-a', titolo: 'A' }, { id: 'crp-a', titolo: 'Doppio' }, {}],
      integrazioni: [{
        corsoId: 'cor-1',
        stato: 'chissà',
        compiti: [{
          titolo: 'C',
          inizi: [{ allievoId: 'al-1', data: '2026-10-01' }, { allievoId: 'al-1', data: '2026-10-02' }],
          proroghe: [{ allievoId: 'al-1', fine: 'domani' }],
        }],
        giudizi: [{ testo: '   ' }, { testo: 'Ok', allievoId: '' }],
        matrice: [
          { allievoId: 'al-1', criterioId: 'crp-a', data: '2026-10-01', livello: 'raggiunto' },
          { allievoId: 'al-1', criterioId: 'crp-a', data: '2026-10-01', livello: 'parziale' },
          { allievoId: 'al-1', criterioId: 'crp-sparito', data: '2026-10-01', livello: 'raggiunto' },
          { allievoId: 'al-1', criterioId: 'crp-a', data: '2026-10-02', livello: 'inventato' },
          { allievoId: 'al-2', criterioId: 'crp-a', data: '2026-10-02', livello: null, nota: 'Assente' },
        ],
      }, { corsoId: 'cor-1', stato: 'concluso' }, { stato: 'concluso' }],
    })
    // Un'integrazione per corso, e nessuna senza corso.
    assert.equal(progetto.integrazioni.length, 1)
    const [letto] = progetto.integrazioni
    assert.equal(letto.stato, 'bozza')
    assert.equal(progetto.livelli.length, 4)
    assert.equal(progetto.criteri.length, 2)
    assert.notEqual(progetto.criteri[1].id, 'crp-a', 'due criteri con lo stesso id')
    assert.equal(letto.compiti[0].inizi.length, 1)
    assert.deepEqual(letto.compiti[0].proroghe, [])
    assert.deepEqual(letto.giudizi.map((g) => [g.testo, g.allievoId]), [['Ok', null]])
    assert.deepEqual(
      letto.matrice.map((c) => [c.allievoId, c.data, c.livello]),
      [['al-1', '2026-10-01', 'raggiunto'], ['al-2', '2026-10-02', null]],
    )
  })

  it('compiti e giudizi con lo stesso id ne prendono uno nuovo, come i criteri', () => {
    const [letto] = normalizzaProgetto({
      id: 'prg-x',
      titolo: 'X',
      integrazioni: [{
        corsoId: 'cor-1',
        compiti: [{ id: 'cmp-a', titolo: 'Uno' }, { id: 'cmp-a', titolo: 'Due' }],
        giudizi: [{ id: 'gdz-a', testo: 'Uno' }, { id: 'gdz-a', testo: 'Due' }],
      }],
    }).integrazioni
    assert.equal(letto.compiti[0].id, 'cmp-a')
    assert.equal(new Set(letto.compiti.map((c) => c.id)).size, 2)
    assert.equal(letto.giudizi[0].id, 'gdz-a')
    assert.equal(new Set(letto.giudizi.map((g) => g.id)).size, 2)
  })

  it('le celle di un criterio tolto spariscono già alla lettura del documento', () => {
    // Per questo né i riferimenti rotti né le riparazioni le cercano: in un
    // registro letto non ci sono, e ogni salvataggio ripulisce la matrice.
    const grezzo = JSON.parse(JSON.stringify(registroCompleto()))
    grezzo.progetti[0].integrazioni[0].matrice.push({
      allievoId: 'al-2', criterioId: 'crp-sparito', data: '2026-10-01', lezioneId: null, livello: 'raggiunto',
    })
    const letto = normalizzaRegistro(grezzo)
    assert.ok(!integrazioneDi(letto).matrice.some((c) => c.criterioId === 'crp-sparito'))
  })

  it('un registro di prima dei progetti si legge con la collezione vuota', () => {
    const { progetti: _via, ...vecchio } = JSON.parse(JSON.stringify(registroCompleto()))
    assert.deepEqual(normalizzaRegistro(vecchio).progetti, [])
  })

  it('un piano di un corso che lega una tappa al progetto lo integra lì', () => {
    const grezzo = JSON.parse(JSON.stringify(registroCompleto()))
    grezzo.progetti[0].integrazioni = []
    const letto = normalizzaRegistro(grezzo)
    assert.deepEqual(progettoDi(letto).integrazioni.map((i) => [i.corsoId, i.stato]), [['cor-1', 'bozza']])
  })

  it('il progetto di tappe e momenti c’è solo se dato', () => {
    const registro = normalizzaRegistro(JSON.parse(JSON.stringify(registroCompleto())))
    assert.equal(registro.piani[0].attivita[0].progettoId, 'prg-1')
    assert.equal(registro.valutazioni[0].progettoId, 'prg-1')
    delete registro.piani[0].attivita[0].progettoId
    const riletto = normalizzaRegistro(JSON.parse(JSON.stringify(registro)))
    // Sul disco la tappa senza progetto non porta il campo.
    assert.ok(!JSON.stringify(riletto.piani[0]).includes('progettoId'))
  })
})

describe('progetti: le eliminazioni', () => {
  it('il progetto che se ne va sgancia tappe e momenti, non li cancella', () => {
    const registro = registroCompleto()
    const piano = togli(registro, { genere: 'progetto', id: 'prg-1' })
    assert.deepEqual(registro.progetti, [])
    assert.equal(registro.piani[0].attivita[0].progettoId, undefined)
    assert.equal(registro.valutazioni[0].progettoId, null)
    assert.equal(registro.valutazioni.length, 1)
    assert.deepEqual([...piano.collezioni].sort(), ['piani', 'progetti', 'valutazioni'])
    assert.ok(piano.staccati.some((s) => /1 tappa dei piani resta, senza progetto/.test(s)))
    assert.ok(piano.staccati.some((s) => /1 momento di valutazione resta, senza progetto/.test(s)))
    assert.equal(piano.nome, 'il progetto «Il bilancio di classe»')
  })

  it('i file delle sue risorse se ne vanno con lui', () => {
    const registro = registroCompleto()
    progettoDi(registro).risorse = [{
      id: 'ris-1', tipo: 'file', titolo: 'Traccia', file: 'progetti/traccia.pdf', aggiuntaIl: '2026-09-01T08:00:00.000Z',
    }]
    const piano = togli(registro, { genere: 'progetto', id: 'prg-1' })
    assert.deepEqual(piano.file.documenti, ['progetti/traccia.pdf'])
    assert.ok(piano.perdite.includes('1 file allegato al progetto'))
  })

  it('il corso che se ne va si porta via le sue integrazioni, non il progetto', () => {
    const registro = registroCompleto()
    registro.progetti[0].integrazioni.push({ corsoId: 'cor-altro', stato: 'bozza', compiti: [], giudizi: [], matrice: [] })
    const piano = togli(registro, { genere: 'corso', id: 'cor-1' })
    assert.deepEqual(registro.progetti.map((p) => p.id), ['prg-1'])
    assert.deepEqual(progettoDi(registro).integrazioni.map((i) => i.corsoId), ['cor-altro'])
    // Il piano resta senza corso, e la sua tappa col progetto, che c'è ancora.
    assert.equal(registro.piani[0].corsoId, null)
    assert.equal(registro.piani[0].attivita[0].progettoId, 'prg-1')
    assert.ok(piano.collezioni.includes('progetti'))
    assert.ok(piano.perdite.some((p) => /^1 integrazione di un progetto, con compiti/.test(p)), piano.perdite.join(' | '))
    assert.ok(!piano.staccati.some((s) => /senza progetto/.test(s)))
  })

  it('anche con la classe', () => {
    const registro = registroCompleto()
    togli(registro, { genere: 'classe', id: 'cl-1' })
    assert.deepEqual(registro.progetti.map((p) => [p.id, p.integrazioni.length]), [['prg-1', 0]])
  })

  it('la persona che se ne va si porta via inizi, spunte, giudizi e celle sue', () => {
    const registro = registroCompleto()
    integrazioneDi(registro).giudizi.push({
      id: 'giu-2', allievoId: 'al-1', testo: 'Precisa', data: '2026-10-06', lezioneId: null,
      creatoIl: '2026-10-06T09:00:00.000Z',
    })
    const piano = togli(registro, { genere: 'allievo', classeId: 'cl-1', id: 'al-1' })
    const progetto = integrazioneDi(registro)
    assert.ok(piano.collezioni.includes('progetti'))
    assert.ok(piano.perdite.some((p) => /^5 voci nei progetti/.test(p)), piano.perdite.join(' | '))
    assert.deepEqual(progetto.compiti[0].inizi.map((i) => i.allievoId), ['al-2'])
    assert.deepEqual(progetto.compiti[0].fatti, [])
    assert.deepEqual(progetto.matrice, [])
    // Il giudizio sulla classe resta.
    assert.deepEqual(progetto.giudizi.map((g) => g.id), ['giu-1'])
  })

  it('la lezione che se ne va lascia le voci del progetto, con il suo giorno', () => {
    const registro = registroCompleto()
    registro.lezioni[0].data = '2026-10-07'
    const piano = togli(registro, { genere: 'lezione', id: 'lez-1' })
    const progetto = integrazioneDi(registro)
    assert.ok(piano.collezioni.includes('progetti'))
    assert.ok(piano.staccati.some((s) => /3 voci dei progetti restano, con la data/.test(s)))
    const [inizio] = progetto.compiti[0].inizi
    assert.deepEqual([inizio.lezioneId, inizio.data], [null, '2026-10-07'])
    assert.equal(progetto.giudizi[0].lezioneId, null)
    assert.equal(progetto.matrice[0].data, '2026-10-07')
  })

  it('una lezione che il progetto non cita non tocca il suo file', () => {
    const registro = registroCompleto()
    const altra = creaLezione('cor-1', '2026-10-13', '08:00', 90)
    registro.lezioni.push(altra)
    const piano = togli(registro, { genere: 'lezione', id: altra.id })
    assert.ok(!piano.collezioni.includes('progetti'))
  })
})

describe('progetti: riferimenti rotti e riparazioni', () => {
  /** Applica tutte le riparazioni proposte. */
  const ripara = (registro) => {
    for (const r of riparazioni(registro)) r.applica(registro)
  }

  it('un’integrazione in un corso che non c’è si dice, e si toglie; il progetto resta', () => {
    const registro = registroCompleto()
    progettoDi(registro).integrazioni.push({
      corsoId: 'cor-sparito', stato: 'in-corso', compiti: [], giudizi: [], matrice: [],
    })
    assert.ok(riferimentiRotti(registro).some((r) => /«Il bilancio di classe» è integrato in un corso che non c’è più/.test(r)))
    const proposta = riparazioni(registro).find((r) => /integrazion/.test(r.descrizione))
    assert.deepEqual(proposta?.collezioni, ['progetti'])
    ripara(registro)
    assert.deepEqual(progettoDi(registro).integrazioni.map((i) => i.corsoId), ['cor-1'])
    assert.deepEqual(riferimentiRotti(registro).filter((r) => /progetto/.test(r)), [])
  })

  it('voci di persone estranee e ore sparite si ripuliscono', () => {
    const registro = registroCompleto()
    const progetto = integrazioneDi(registro)
    progetto.compiti[0].inizi.push({ allievoId: 'al-estraneo', data: '2026-10-01', lezioneId: null })
    progetto.giudizi[0].lezioneId = 'lez-sparita'
    const rotti = riferimentiRotti(registro).filter((r) => /progetto/.test(r))
    assert.equal(rotti.length, 2, rotti.join(' | '))

    ripara(registro)
    assert.deepEqual(riferimentiRotti(registro).filter((r) => /progetto/.test(r)), [])
    assert.ok(!progetto.compiti[0].inizi.some((i) => i.allievoId === 'al-estraneo'))
    assert.deepEqual([progetto.giudizi[0].lezioneId, progetto.giudizi[0].data], [null, '2026-10-06'])
  })

  it('tappe e momenti che citano un progetto sparito perdono il rimando', () => {
    const registro = registroCompleto()
    registro.piani[0].attivita[0].progettoId = 'prg-sparito'
    registro.valutazioni[0].progettoId = 'prg-sparito'
    assert.equal(riferimentiRotti(registro).filter((r) => /progetto/.test(r)).length, 2)
    const proposta = riparazioni(registro).find((r) => r.collezioni.includes('piani'))
    assert.deepEqual([...proposta.collezioni].sort(), ['piani', 'valutazioni'])
    ripara(registro)
    assert.equal(registro.piani[0].attivita[0].progettoId, undefined)
    assert.equal(registro.valutazioni[0].progettoId, null)
  })

  it('un momento di un corso in cui il progetto non è integrato perde il rimando; la tappa no', () => {
    const registro = registroCompleto()
    progettoDi(registro).integrazioni = []
    const rotti = riferimentiRotti(registro).filter((r) => /progetto/.test(r))
    assert.equal(rotti.length, 1, rotti.join(' | '))
    ripara(registro)
    assert.equal(registro.piani[0].attivita[0].progettoId, 'prg-1')
    assert.equal(registro.valutazioni[0].progettoId, null)
  })
})

/**
 * Il progetto in due fasi: la tappa di `lez-1` (svolta) nella prima, quella di
 * un'ora una settimana dopo nella seconda, segnata a metà.
 */
function inDueFasi () {
  const registro = registroCompleto()
  progettoDi(registro).fasi.push({ id: 'fsp-2', titolo: 'Realizzazione' })
  const progetto = nelSuoCorso(registro)
  const [prima] = registro.piani[0].attivita
  registro.lezioni[0].avanzamento = [{ attivitaId: prima.id, titolo: prima.titolo, stato: 'svolta' }]
  const piano = { ...creaPiano('cor-1'), id: 'pia-2' }
  const tappa = { ...creaAttivita('Montaggio', 2), progettoId: 'prg-1', faseProgettoId: 'fsp-2' }
  piano.attivita = [tappa]
  registro.piani.push(piano)
  const ora = { ...creaLezione('cor-1', '2026-10-13', '08:00', 90), id: 'lez-2', pianoId: piano.id }
  ora.avanzamento = [{ attivitaId: tappa.id, titolo: tappa.titolo, stato: 'parziale' }]
  registro.lezioni.push(ora)
  return { registro, progetto, prima, tappa }
}

describe('progetti: le fasi', () => {
  it('un progetto nasce con una fase sola; l’integrazione copiata non porta fasi', () => {
    const progetto = creaProgetto('cor-1', 'Officina')
    assert.deepEqual(progetto.fasi.map((f) => f.titolo), ['Fase 1'])
    const copia = duplicaIntegrazione(progetto.integrazioni[0], 'cor-2')
    assert.deepEqual(Object.keys(copia).sort(), ['compiti', 'corsoId', 'giudizi', 'matrice', 'stato'])
  })

  it('la lettura tiene almeno una fase, con id unici e un titolo', () => {
    const base = { id: 'prg-x', titolo: 'X' }
    assert.equal(normalizzaProgetto(base).fasi.length, 1)
    assert.equal(normalizzaProgetto({ ...base, fasi: [] }).fasi.length, 1)
    const letto = normalizzaProgetto({ ...base, fasi: [{ id: 'fsp-a', titolo: 'A' }, { id: 'fsp-a' }] })
    assert.equal(letto.fasi[0].id, 'fsp-a')
    assert.notEqual(letto.fasi[1].id, 'fsp-a')
    assert.equal(letto.fasi[1].titolo, 'Fase 2')
  })

  it('una tappa con una fase che il progetto non ha cade nella prima; senza progetto, senza fase', () => {
    const grezzo = JSON.parse(JSON.stringify(registroCompleto()))
    const [primaFase] = grezzo.progetti[0].fasi
    grezzo.piani[0].attivita[0].faseProgettoId = 'fsp-sparita'
    grezzo.piani[0].attivita.push({ ...creaAttivita('Libera', 1), faseProgettoId: primaFase.id })
    const letto = normalizzaRegistro(grezzo)
    assert.equal(letto.piani[0].attivita[0].faseProgettoId, primaFase.id)
    assert.equal(letto.piani[0].attivita[1].faseProgettoId, undefined)
    assert.ok(!JSON.stringify(letto.piani[0].attivita[1]).includes('faseProgettoId'))
  })

  it('la fase di una tappa: la sua, o la prima; nessuna per una tappa d’altri', () => {
    const { progetto, prima, tappa } = inDueFasi()
    assert.equal(faseDellAttivita(progetto, tappa).id, 'fsp-2')
    assert.equal(faseDellAttivita(progetto, { ...tappa, faseProgettoId: 'fsp-sparita' }).id, progetto.fasi[0].id)
    assert.equal(faseDellAttivita(progetto, prima).id, progetto.fasi[0].id)
    assert.equal(faseDellAttivita(progetto, { progettoId: 'prg-altro' }), null)
  })

  it('ore, periodo e avanzamento di ogni fase vengono dalle sue tappe', () => {
    const { registro, progetto } = inDueFasi()
    const [uno, due] = progetto.fasi
    assert.deepEqual(lezioniDellaFase(registro, progetto, uno.id).map((v) => v.lezione.id), ['lez-1'])
    assert.deepEqual(lezioniDellaFase(registro, progetto, due.id).map((v) => v.lezione.id), ['lez-2'])
    assert.deepEqual(periodoDellaFase(registro, progetto, due.id), { inizio: '2026-10-13', fine: '2026-10-13' })
    assert.equal(periodoDellaFase(registro, progetto, 'fsp-nessuna'), null)

    const tutto = avanzamentoDelProgetto(registro, progetto)
    assert.deepEqual(tutto.attivita.map((a) => [a.lezioneId, a.faseId, a.stato]), [
      ['lez-1', uno.id, 'svolta'],
      ['lez-2', 'fsp-2', 'parziale'],
    ])
    assert.equal(tutto.quota, 0.75)
    assert.equal(avanzamentoDelProgetto(registro, progetto, { faseId: due.id }).quota, 0.5)
    const presenze = presenzeNelProgetto(registro, progetto, ['al-1'], { faseId: uno.id })
    assert.deepEqual(presenze[0].ore.map((o) => o.lezioneId), ['lez-1'])
  })

  it('il quadro: fase per fase, e per intero con presenze di chi frequenta e momenti', () => {
    const { registro, progetto, prima } = inDueFasi()
    registro.valutazioni[0].attivitaId = prima.id
    const quadro = quadroDelProgetto(registro, progetto)
    assert.deepEqual(quadro.periodo, { inizio: '2026-10-06', fine: '2026-10-13' })
    assert.equal(quadro.quota, 0.75)
    assert.deepEqual(quadro.fasi.map((f) => [f.numero, f.fase.id, f.quota, f.attivita.length]), [
      [1, progetto.fasi[0].id, 1, 1],
      [2, 'fsp-2', 0.5, 1],
    ])
    assert.deepEqual(quadro.fasi.map((f) => f.momenti.map((m) => m.id)), [['val-1'], []])
    assert.deepEqual(quadro.momenti.map((m) => m.id), ['val-1'])
    assert.deepEqual(quadro.presenze.map((p) => p.allievoId).sort(), ['al-1', 'al-2'])
    const anna = quadro.presenze.find((p) => p.allievoId === 'al-1')
    assert.deepEqual(anna.ore.map((o) => o.lezioneId), ['lez-1', 'lez-2'])
  })

  it('una fase sparita si dice, e la riparazione porta le tappe nella prima', () => {
    const { registro, progetto, tappa } = inDueFasi()
    progettoDi(registro).fasi = progetto.fasi.filter((f) => f.id !== 'fsp-2')
    assert.ok(riferimentiRotti(registro).some((r) => /fase che il suo progetto non ha più/.test(r)))
    const proposta = riparazioni(registro).find((r) => /prima fase/.test(r.descrizione))
    assert.deepEqual(proposta.collezioni, ['piani'])
    proposta.applica(registro)
    const riparata = registro.piani.find((p) => p.id === 'pia-2').attivita[0]
    assert.equal(riparata.id, tappa.id)
    assert.equal(riparata.faseProgettoId, progetto.fasi[0].id)
    assert.deepEqual(riferimentiRotti(registro).filter((r) => /fase/.test(r)), [])
  })

  it('il progetto che se ne va toglie alle tappe anche la fase', () => {
    const { registro, tappa } = inDueFasi()
    togli(registro, { genere: 'progetto', id: 'prg-1' })
    const sganciata = registro.piani.find((p) => p.id === 'pia-2').attivita[0]
    assert.equal(sganciata.id, tappa.id)
    assert.deepEqual([sganciata.progettoId, sganciata.faseProgettoId], [undefined, undefined])
  })
})
