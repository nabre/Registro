// I dati dei due rapporti del progetto: che cosa portano, con che date, e la
// progressione in ordine di giorno anche quando la matrice è salvata in un
// altro ordine o un'ora si sposta. L'impaginazione la provano i modelli
// (`reportTemplates.test.mjs`); qui i conti.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  corsiDaRifare,
  datiProgetto,
  datiProgettoAllievo,
  eliminazione,
  fogliDeiProgettiOrfani,
  improntaDi,
  percorsiDiUnDocumento,
  riferimentiSpostati,
} from '../../dist-tests/domain.mjs'
import { registroCompleto } from '../helpers/modelli.mjs'

/** Un giorno dopo la fatica di Rossi e prima della fine prorogata di Bianchi. */
const OTTOBRE = '2026-10-25'

/** Le righe di una tabella come oggetti, colonna per colonna. */
function righe (tabella) {
  return tabella.righe.map((riga) => Object.fromEntries(tabella.intestazione.map((c, i) => [c, riga[i]])))
}

function preparato () {
  const registro = registroCompleto()
  const progetto = registro.progetti[0]
  const [rossi, bianchi] = registro.classi[0].allievi
  return { registro, progetto, rossi, bianchi }
}

describe('il rapporto di classe del progetto', () => {
  it('ha in testata progetto, stato e lezioni; obiettivi e scala come elenchi', () => {
    const { registro, progetto } = preparato()
    const dati = datiProgetto(registro, progetto, OTTOBRE)
    assert.equal(dati.valori.progetto, 'Il bilancio di classe')
    assert.equal(dati.valori.stato, 'in corso')
    assert.equal(dati.valori.classe, 'DIC2')
    assert.equal(dati.valori.materia, 'Calcolo professionale')
    assert.equal(dati.valori.quanti, '1')
    assert.deepEqual(dati.elenchi.obiettivi, ['Leggere un bilancio'])
    assert.equal(dati.elenchi.livelli.length, progetto.livelli.length)
  })

  it('la scala porta per ogni livello la sua descrizione, se ce l’ha', () => {
    const { registro, progetto } = preparato()
    progetto.livelli[2].descrizione = 'Sa giustificare ogni voce'
    const { livelli } = datiProgetto(registro, progetto, OTTOBRE).elenchi
    assert.equal(livelli[2], `${progetto.livelli[2].testo} — Sa giustificare ogni voce`)
    assert.equal(livelli[0], progetto.livelli[0].testo)
  })

  it('il periodo lo danno le lezioni del progetto, non una data scritta', () => {
    const { registro, progetto } = preparato()
    // Una lezione sola: il giorno si dice una volta.
    assert.equal(datiProgetto(registro, progetto, OTTOBRE).valori.periodo, '06.10.2026')
    registro.lezioni[0].pianoId = null
    assert.equal(datiProgetto(registro, progetto, OTTOBRE).valori.periodo, 'nessuna lezione')
  })

  it('racconta le lezioni del progetto con le fasi abbinate, gli argomenti e il consuntivo', () => {
    const { registro, progetto } = preparato()
    const [lezione] = righe(datiProgetto(registro, progetto, OTTOBRE).tabelle.lezioni)
    assert.equal(lezione.Data, '06.10.2026')
    assert.match(lezione['Fasi del progetto'], /^Esercizi \(/)
    assert.equal(lezione.Argomenti, 'Le percentuali')
    assert.equal(lezione.Consuntivo, 'Fatto quasi tutto')
  })

  it('i compiti persona per persona: inizio, fine con la proroga, a che punto è', () => {
    const { registro, progetto } = preparato()
    const tabella = datiProgetto(registro, progetto, OTTOBRE).tabelle.statoCompiti
    // Le persone in ordine di elenco: Bianchi prima di Rossi.
    assert.deepEqual(tabella.righe, [
      ['Bianchi Luca', '08.10.2026 → 06.11.2026 (proroga) · in corso'],
      ['Rossi Anna', '06.10.2026 → 30.10.2026 · fatto'],
    ])
    const dopo = datiProgetto(registro, progetto, '2026-11-10').tabelle.statoCompiti
    assert.match(dopo.righe[0][1], /scaduto$/)
    assert.match(dopo.righe[1][1], /fatto$/)
  })

  it('la matrice tiene l’ultimo livello, la progressione tutti i passi per giorno', () => {
    const { registro, progetto } = preparato()
    const dati = datiProgetto(registro, progetto, OTTOBRE)
    assert.deepEqual(dati.tabelle.matrice.righe, [
      ['Bianchi Luca', '', ''],
      ['Rossi Anna', 'Raggiunto', ''],
    ])
    assert.deepEqual(dati.tabelle.progressione.righe, [[
      'Rossi Anna',
      'Precisione',
      'Raggiunto',
      '06.10.2026 Parzialmente raggiunto → 20.10.2026 Raggiunto',
    ]])
  })

  it('la progressione segue il giorno, non l’ordine in cui la matrice è salvata', () => {
    const { registro, progetto } = preparato()
    progetto.matrice.reverse()
    const [riga] = datiProgetto(registro, progetto, OTTOBRE).tabelle.progressione.righe
    assert.equal(riga[2], 'Raggiunto')
    assert.equal(riga[3], '06.10.2026 Parzialmente raggiunto → 20.10.2026 Raggiunto')
  })

  it('una cella nell’ora segue l’ora spostata, e con lei l’ordine e l’ultimo livello', () => {
    const { registro, progetto } = preparato()
    registro.lezioni[0].data = '2026-10-21'
    const dati = datiProgetto(registro, progetto, OTTOBRE)
    assert.equal(dati.tabelle.progressione.righe[0][3], '20.10.2026 Raggiunto → 21.10.2026 Parzialmente raggiunto')
    assert.equal(dati.tabelle.matrice.righe[1][1], 'Parzialmente raggiunto')
  })

  it('valutazioni del progetto con le medie, giudizi e annotazioni con chi e quando', () => {
    const { registro, progetto } = preparato()
    const dati = datiProgetto(registro, progetto, OTTOBRE)
    assert.deepEqual(righe(dati.tabelle.momenti).map((m) => [m.Data, m.Titolo, m.Media]), [
      ['20.10.2026', 'Prova di ottobre', '5'],
    ])
    assert.deepEqual(dati.tabelle.voti.righe[1], ['Rossi Anna', '5', '5.00'])
    assert.deepEqual(dati.tabelle.giudizi.righe, [['06.10.2026', 'classe', 'Buon avvio']])
    assert.deepEqual(dati.tabelle.annotazioni.righe, [
      ['06.10.2026', 'merito', 'Rossi Anna', 'Ottima partecipazione'],
    ])
  })
  it('avanzamento ora per ora dal consuntivo, e presenze nelle sole ore del progetto', () => {
    const { registro, progetto } = preparato()
    registro.lezioni[0].avanzamento = [{ attivitaId: registro.piani[0].attivita[0].id, stato: 'svolta' }]
    const dati = datiProgetto(registro, progetto, OTTOBRE)
    assert.equal(dati.valori.avanzamento, '100%')
    // Fase per fase: titolo, periodo, quota e attività ora per ora.
    const [fase] = dati.gruppi.fasi
    assert.equal(fase.valori.periodoFase, '06.10.2026')
    assert.equal(fase.valori.avanzamentoFase, '100%')
    assert.deepEqual(righe(fase.tabelle.attivitaFase).map((r) => [r.Data, r.Attività, r.Svolta]), [
      ['06.10.2026', 'Esercizi', 'svolta'],
    ])
    // Le UD le conta l'appello delle ore del progetto (`presenzeNelProgetto`).
    assert.deepEqual(dati.tabelle.presenze.righe[1], ['Rossi Anna', '1', '0', '0%', '0'])
  })
})

describe('il rapporto individuale del progetto', () => {
  it('i compiti della persona con le sue date', () => {
    const { registro, progetto, rossi, bianchi } = preparato()
    assert.deepEqual(datiProgettoAllievo(registro, progetto, rossi, OTTOBRE).tabelle.compiti.righe, [
      ['Raccolta delle fatture', '06.10.2026', '30.10.2026', '30.10.2026', 'fatto', '20.10.2026'],
    ])
    assert.deepEqual(datiProgettoAllievo(registro, progetto, bianchi, OTTOBRE).tabelle.compiti.righe, [
      ['Raccolta delle fatture', '08.10.2026', '30.10.2026', '06.11.2026 (proroga)', 'in corso', ''],
    ])
  })

  it('la progressione per criterio in ordine di giorno, con la nota', () => {
    const { registro, progetto, rossi } = preparato()
    progetto.matrice.reverse()
    progetto.matrice[0].nota = 'Ora senza errori'
    const tabella = datiProgettoAllievo(registro, progetto, rossi, OTTOBRE).tabelle.progressione
    assert.deepEqual(tabella.righe, [
      ['Precisione', '06.10.2026', 'Parzialmente raggiunto', ''],
      ['Precisione', '20.10.2026', 'Raggiunto', 'Ora senza errori'],
    ])
  })

  it('voti, media del progetto e presenze nelle sue ore; niente degli altri', () => {
    const { registro, progetto, rossi, bianchi } = preparato()
    const suo = datiProgettoAllievo(registro, progetto, rossi, OTTOBRE)
    assert.equal(suo.valori.allievo, 'Rossi Anna')
    assert.equal(suo.valori.media, '5.00')
    assert.deepEqual(righe(suo.tabelle.voti).map((v) => [v.Data, v.Voto]), [['20.10.2026', '5']])
    const [ora] = righe(suo.tabelle.presenze)
    assert.equal(ora.Data, '06.10.2026')
    assert.equal(ora.Presenze.split(' ').length, 2, 'una sigla per UD')
    assert.equal(suo.tabelle.annotazioni.righe.length, 1)

    // Fase per fase, le sue presenze accanto all'avanzamento della classe.
    assert.deepEqual(suo.tabelle.fasi.righe.map((r) => r.slice(1)), [['06.10.2026', '0%', '1', '0', '0%', '0']])

    const altro = datiProgettoAllievo(registro, progetto, bianchi, OTTOBRE)
    assert.equal(altro.valori.media, '')
    assert.deepEqual(altro.tabelle.progressione.righe, [])
    assert.deepEqual(altro.tabelle.annotazioni.righe, [])
  })
})

describe('i fogli del progetto fra i documenti', () => {
  it('orfani i fogli col titolo di prima o di un progetto che non c’è; restano quelli vivi e gli altri fogli', () => {
    const { registro, progetto } = preparato()
    const [prima] = percorsiDiUnDocumento(registro, 'progetto-classe', progetto.id)
    const [suoDiPrima] = percorsiDiUnDocumento(registro, 'progetto-allievo', progetto.id, { allievoId: 'al-1' })
    const altroCorso = prima.replace('Il bilancio di classe', 'Altro')
    progetto.titolo = 'Il bilancio rifatto'
    const [adesso] = percorsiDiUnDocumento(registro, 'progetto-classe', progetto.id)
    assert.notEqual(prima, adesso)
    const orfani = fogliDeiProgettiOrfani(registro, 'cor-1', [prima, suoDiPrima, adesso, altroCorso, 'esportazioni/x.pdf'])
    // «Altro» non è di nessun progetto di adesso: è orfano anche lui.
    assert.deepEqual(orfani.sort(), [altroCorso, prima, suoDiPrima].sort())
  })

  it('una scrittura sul progetto rifà i fogli del suo corso, e così toglierlo', () => {
    const { registro, progetto } = preparato()
    assert.deepEqual(corsiDaRifare(registro, { progettoId: progetto.id }), ['cor-1'])
    const impronta = improntaDi(registro)
    registro.progetti = []
    assert.ok(riferimentiSpostati(impronta, registro).some((r) => r.corsoId === 'cor-1'))
  })

  it('eliminare il progetto si porta via i suoi fogli, della classe e di ognuno', () => {
    const { registro, progetto } = preparato()
    const via = eliminazione(registro, { genere: 'progetto', id: progetto.id })
    const classe = percorsiDiUnDocumento(registro, 'progetto-classe', progetto.id)
    const persone = percorsiDiUnDocumento(registro, 'progetto-allievo', progetto.id)
    assert.equal(persone.length, 2, 'uno per persona della classe')
    for (const percorso of [...classe, ...persone]) assert.ok(via.file.stampati.includes(percorso), percorso)
  })
})
