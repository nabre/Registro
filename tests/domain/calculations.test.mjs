// I conti del registro: orari con le pause, presenze, medie pesate. Si
// guardano i casi limite (nessun voto, allievo assente, momento senza peso):
// su questi conti si decide un'insufficienza.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  IMPOSTAZIONI_PREDEFINITE,
  matriceCorso,
  scalettaSulleUd,
  arrotondaVoto,
  votiDellaScala,
  avanzamentoPiano,
  confrontaPianoConLezione,
  creaAttivita,
  creaLezione,
  creaPiano,
  creaSlot,
  distribuzione,
  durataMinuti,
  fineLezione,
  formattaVoto,
  inizioLezione,
  lezioniSovrapposte,
  mediaAllievo,
  mediaMomento,
  minutiEffettivi,
  minutiTotali,
  momentoLezione,
  ordinaAllievi,
  riepilogaPresenze,
  contaUd,
  slotInConflitto,
  slotIncatenati,
  slotSpostati,
  slotStirati,
  statiAllineati,
  statoDellOra,
  statoUd,
  unitaDidattiche,
  votoValido,
  datiPresenze,
  percento,
  percentoAssenza,
  segnalazioniDelCorso,
  notaFineSemestre,
} from '../../dist-tests/domain.mjs'
import { scuolaMinima } from '../helpers/register.mjs'

/** Una lezione di due ore con quindici minuti di pausa in mezzo. */
function lezioneConPausa () {
  const lezione = creaLezione('cor1', '2025-09-15', '08:00', 45)
  lezione.slot = [
    creaSlot('08:00', 45),
    creaSlot('08:45', 15, 'pausa'),
    creaSlot('09:00', 45),
  ]
  return lezione
}

describe('orari della lezione', () => {
  it('legge inizio e fine dagli slot, non dal primo che capita', () => {
    const lezione = lezioneConPausa()
    lezione.slot.reverse()
    assert.equal(inizioLezione(lezione), '08:00')
    assert.equal(fineLezione(lezione), '09:45')
  })

  it('non conta le pause nel tempo di lezione', () => {
    const lezione = lezioneConPausa()
    assert.equal(minutiEffettivi(lezione), 90)
    assert.equal(minutiTotali(lezione), 105)
  })

  it('trova gli slot che si accavallano', () => {
    const buoni = [creaSlot('08:00', 45), creaSlot('08:45', 45)]
    assert.equal(slotInConflitto(buoni).length, 0)

    const sovrapposti = [creaSlot('08:00', 60), creaSlot('08:30', 45)]
    assert.equal(slotInConflitto(sovrapposti).length, 1)
  })

  it('vede anche gli accavallamenti non adiacenti', () => {
    // Uno slot lungo che ne contiene due: ordinati per inizio, il terzo non è
    // vicino al primo, e un confronto fra sole coppie adiacenti non vedrebbe A↔C.
    const dentro = [creaSlot('08:00', 240), creaSlot('08:30', 30), creaSlot('09:30', 30)]
    // B e C non si toccano: i conflitti sono A↔B e A↔C.
    assert.equal(slotInConflitto(dentro).length, 2)

    // Chi comincia dopo la fine del primo non conta: l'uscita anticipata dal ciclo
    // non nasconde né inventa conflitti.
    const staccato = [creaSlot('08:00', 30), creaSlot('09:00', 30), creaSlot('10:00', 30)]
    assert.equal(slotInConflitto(staccato).length, 0)
  })

  it('segnala due lezioni sullo stesso orario, ignorando le annullate', () => {
    const prima = lezioneConPausa()
    const seconda = creaLezione('cor2', '2025-09-15', '09:00', 45)
    const altroGiorno = creaLezione('cor3', '2025-09-16', '08:00', 45)

    assert.equal(lezioniSovrapposte([prima, seconda, altroGiorno], prima).length, 1)

    seconda.stato = 'annullata'
    assert.equal(lezioniSovrapposte([prima, seconda, altroGiorno], prima).length, 0)
  })
})

describe('unità didattiche di un\u2019ora', () => {
  it('taglia gli slot in fette da 45 minuti e salta le pause', () => {
    const lezione = lezioneConPausa()
    const ud = unitaDidattiche(lezione, 45)
    assert.deepEqual(
      ud.map((u) => [u.inizio, u.fine]),
      [
        ['08:00', '08:45'],
        ['09:00', '09:45'],
      ],
    )
  })

  it('un blocco di due ore fa quattro UD, con lo stacco dopo la pausa', () => {
    const lezione = creaLezione('cor1', '2025-09-15', '13:15', 90)
    lezione.slot = [
      creaSlot('13:15', 90),
      creaSlot('14:45', 15, 'pausa'),
      creaSlot('15:00', 90),
    ]
    const ud = unitaDidattiche(lezione, 45)
    assert.equal(contaUd(lezione, 45), 4)
    assert.deepEqual(ud.map((u) => u.inizio), ['13:15', '14:00', '15:00', '15:45'])
    // Lo stacco sta solo dove c'era davvero una pausa.
    assert.deepEqual(ud.map((u) => u.dopoUnaPausa), [false, false, true, false])
  })

  it('una durata che non è un multiplo di UD non perde l\u2019avanzo', () => {
    const lezione = creaLezione('cor1', '2025-09-15', '08:00', 45)
    lezione.slot = [{ ...lezione.slot[0], fine: '09:00' }]
    assert.deepEqual(
      unitaDidattiche(lezione, 45).map((u) => [u.inizio, u.fine]),
      [
        ['08:00', '08:45'],
        ['08:45', '09:00'],
      ],
    )
  })
})

describe('presenze', () => {
  const presenze = [
    { allievoId: 'a', stati: ['presente', 'presente'] },
    { allievoId: 'b', stati: ['assente', 'assente'] },
    { allievoId: 'c', stati: ['assente', 'presente'] },
    { allievoId: 'd', stati: ['ritardo', 'presente'], minuti: 10 },
    { allievoId: 'e', stati: ['esonerato', 'esonerato'] },
  ]

  it('conta chi c’era, chi no e chi ne ha persa una parte', () => {
    const riepilogo = riepilogaPresenze(presenze)
    assert.equal(riepilogo.totale, 5)
    // Assente è solo chi è mancato per tutta l'ora: gli altri in aula c'erano.
    assert.equal(riepilogo.assenti, 1)
    assert.equal(riepilogo.presenti, 4)
    assert.equal(riepilogo.parziali, 1)
    assert.equal(riepilogo.ritardi, 1)
    assert.equal(riepilogo.esonerati, 1)
  })

  it('conta le UD perse, che è quel che pesa a fine semestre', () => {
    const riepilogo = riepilogaPresenze(presenze)
    assert.equal(riepilogo.udTotali, 10)
    assert.equal(riepilogo.udAssenza, 3)
  })

  it('con la classe vuota non divide per zero', () => {
    assert.equal(riepilogaPresenze([]).quotaPresenza, 1)
  })

  it('quel che non è stato detto resta non detto', () => {
    assert.equal(statoUd(undefined, 0), 'non-impostato')
    assert.equal(statoUd({ allievoId: 'a', stati: ['assente'] }, 3), 'non-impostato')
    assert.deepEqual(
      statiAllineati({ allievoId: 'a', stati: ['assente'] }, 3),
      ['assente', 'non-impostato', 'non-impostato'],
    )
  })

  it('le caselle vuote non contano né da una parte né dall’altra', () => {
    const riepilogo = riepilogaPresenze([
      { allievoId: 'a', stati: ['presente', 'non-impostato'] },
      { allievoId: 'b', stati: ['non-impostato', 'non-impostato'] },
      { allievoId: 'c', stati: ['assente', 'non-impostato'] },
    ])
    assert.equal(riepilogo.totale, 3)
    // Di 'b' non si sa niente: non è né presente né assente.
    assert.equal(riepilogo.senzaAppello, 1)
    assert.equal(riepilogo.presenti, 1)
    assert.equal(riepilogo.assenti, 1)
    assert.equal(riepilogo.udTotali, 2)
    assert.equal(riepilogo.udSenzaAppello, 4)
  })

  it('un appello mai cominciato non è una classe al completo', () => {
    const riepilogo = riepilogaPresenze([
      { allievoId: 'a', stati: ['non-impostato'] },
      { allievoId: 'b', stati: ['non-impostato'] },
    ])
    assert.equal(riepilogo.presenti, 0)
    assert.equal(riepilogo.assenti, 0)
    assert.equal(riepilogo.senzaAppello, 2)
    assert.equal(riepilogo.udTotali, 0)
  })

  it('riassume l’ora nel caso peggiore che non sia una scusa', () => {
    assert.equal(statoDellOra(['presente', 'presente']), 'presente')
    assert.equal(statoDellOra(['ritardo', 'presente']), 'ritardo')
    assert.equal(statoDellOra(['assente', 'ritardo']), 'assente')
    assert.equal(statoDellOra(['esonerato', 'esonerato']), 'esonerato')
    // Un esonero su una sola UD non esonera l'ora intera.
    assert.equal(statoDellOra(['esonerato', 'presente']), 'presente')
    // Le caselle vuote non fanno numero: contano quelle su cui ci si è espressi.
    assert.equal(statoDellOra(['non-impostato', 'assente']), 'assente')
    assert.equal(statoDellOra(['non-impostato', 'non-impostato']), 'non-impostato')
    assert.equal(statoDellOra([]), 'non-impostato')
  })

  // I conti per persona li fa `matriceCorso`, gli stessi di matrice a schermo,
  // PDF, CSV e segnalazioni.
  const quadro = (lezioni, previste) =>
    matriceCorso([{ id: 'x', cognome: 'X', nome: 'Y', attivo: true, telefoni: [] }],
      lezioni.filter((l) => l.stato !== 'annullata'),
      [], IMPOSTAZIONI_PREDEFINITE, previste).righe[0]

  it('conta le ore con l’appello fatto, non le annullate né quelle mute', () => {
    const svolta = creaLezione('cor1', '2025-09-15', '08:00', 45)
    svolta.stato = 'svolta'
    svolta.presenze = [{ allievoId: 'x', stati: ['assente'] }]

    // Un'ora ancora «pianificata» ma con l'appello fatto è un'ora che c'è stata.
    const pianificata = creaLezione('cor1', '2025-09-22', '08:00', 45)
    pianificata.presenze = [{ allievoId: 'x', stati: ['presente'] }]

    const muta = creaLezione('cor1', '2025-09-29', '08:00', 45)
    muta.presenze = [{ allievoId: 'x', stati: ['non-impostato'] }]

    const annullata = creaLezione('cor1', '2025-10-06', '08:00', 45)
    annullata.stato = 'annullata'
    annullata.presenze = [{ allievoId: 'x', stati: ['assente'] }]

    const riga = quadro([svolta, pianificata, muta, annullata])
    assert.equal(riga.lezioniConAppello, 2)
    assert.equal(riga.assenzeIntere, 1)
    assert.equal(riga.udConAppello, 2)
    assert.equal(riga.udAssenza, 1)
  })

  it('le UD non impostate stanno fuori dai conti', () => {
    const lezione = creaLezione('cor1', '2025-09-15', '08:00', 45)
    lezione.slot = [creaSlot('08:00', 90)]
    lezione.stato = 'svolta'
    lezione.presenze = [{ allievoId: 'x', stati: ['assente', 'non-impostato'] }]

    const riga = quadro([lezione])
    // Una sola UD è stata giudicata, e su quella l'allievo mancava.
    assert.equal(riga.udConAppello, 1)
    assert.equal(riga.udAssenza, 1)
    assert.equal(riga.presenza, 0)
  })

  it('un’ora senza nessuna casella impostata non entra nei conti', () => {
    const lezione = creaLezione('cor1', '2025-09-15', '08:00', 45)
    lezione.stato = 'svolta'
    lezione.presenze = [{ allievoId: 'x', stati: ['non-impostato'] }]

    const riga = quadro([lezione])
    assert.equal(riga.lezioniConAppello, 0)
    assert.equal(riga.udConAppello, 0)
    assert.equal(riga.presenza, null)
  })

  it('le quote si fanno sulle UD, non sulle ore', () => {
    // Un'ora sola persa su un blocco di quattro UD non è un giorno perso.
    const lezione = creaLezione('cor1', '2025-09-15', '08:00', 45)
    lezione.slot = [creaSlot('08:00', 180)]
    lezione.stato = 'svolta'
    lezione.presenze = [{ allievoId: 'x', stati: ['assente', 'presente', 'presente', 'presente'] }]

    const riga = quadro([lezione])
    assert.equal(riga.udConAppello, 4)
    assert.equal(riga.udAssenza, 1)
    assert.equal(riga.udPresenza, 3)
    assert.equal(riga.assenzeIntere, 0)
    assert.equal(riga.assenzeParziali, 1)
    assert.equal(riga.assenza, 0.25)
  })

  it('somma i minuti di ritardo', () => {
    const lezioni = ['2025-09-15', '2025-09-22'].map((data) => {
      const lezione = creaLezione('cor1', data, '08:00', 45)
      lezione.stato = 'svolta'
      lezione.presenze = [{ allievoId: 'x', stati: ['ritardo'], minuti: 10 }]
      return lezione
    })
    const riga = quadro(lezioni)
    assert.equal(riga.ritardi, 2)
    assert.equal(riga.minutiRitardo, 20)
    // Un ritardo non è un'assenza: l'allievo in aula c'è stato.
    assert.equal(riga.assenzeIntere, 0)
    assert.equal(riga.udPresenza, 2)
  })
})

describe('medie', () => {
  const scala = { min: 1, max: 6, sufficienza: 4, passo: 0.25 }
  const momento = (id, peso, voti) => ({
    id,
    corsoId: 'cor1',
    lezioneId: null,
    titolo: id,
    tipo: 'scritto',
    data: '2025-10-01',
    peso,
    scala,
    voti,
    creatoIl: '',
    aggiornatoIl: '',
  })

  it('pesa i voti', () => {
    const momenti = [
      momento('m1', 1, [{ allievoId: 'x', valore: 5, assente: false }]),
      momento('m2', 3, [{ allievoId: 'x', valore: 3, assente: false }]),
    ]
    // (5·1 + 3·3) / 4 = 3.5
    assert.equal(mediaAllievo(momenti, 'x').media, 3.5)
  })

  it('senza voti la media è nulla, non zero', () => {
    const esito = mediaAllievo([momento('m1', 1, [])], 'x')
    assert.equal(esito.media, null)
    assert.equal(esito.conteggio, 0)
  })

  it('un assente non abbassa la media', () => {
    const momenti = [
      momento('m1', 1, [{ allievoId: 'x', valore: 5, assente: false }]),
      momento('m2', 1, [{ allievoId: 'x', valore: null, assente: true }]),
    ]
    assert.equal(mediaAllievo(momenti, 'x').media, 5)
  })

  it('una casella vuota non entra nel conto', () => {
    const momenti = [
      momento('m1', 1, [{ allievoId: 'x', valore: 4, assente: false }]),
      momento('m2', 1, [{ allievoId: 'x', valore: null, assente: false }]),
    ]
    assert.equal(mediaAllievo(momenti, 'x').media, 4)
    assert.equal(mediaAllievo(momenti, 'x').conteggio, 1)
  })

  it('si ferma al centesimo', () => {
    // 5 + 5 + 4 diviso tre: la media si arrotonda qui a «4.67», non solo in
    // stampa, perché tutte le schermate dicano lo stesso numero.
    const momenti = [
      momento('m1', 1, [{ allievoId: 'x', valore: 5, assente: false }]),
      momento('m2', 1, [{ allievoId: 'x', valore: 5, assente: false }]),
      momento('m3', 1, [{ allievoId: 'x', valore: 4, assente: false }]),
    ]
    assert.equal(mediaAllievo(momenti, 'x').media, 4.67)
  })

  it('il confronto con la sufficienza guarda il numero arrotondato', () => {
    // 3.995 si stampa «4» e il confronto deve dire sufficiente, come la cifra
    // scritta.
    const momenti = [
      momento('m1', 1, [{ allievoId: 'x', valore: 3.99, assente: false }]),
      momento('m2', 1, [{ allievoId: 'x', valore: 4, assente: false }]),
    ]
    const media = mediaAllievo(momenti, 'x').media

    assert.equal(media, 4)
    assert.ok(media >= 4, 'quel che si legge «4» è sufficiente anche nel conto')
  })

  it('calcola la media di classe di un singolo momento', () => {
    const m = momento('m1', 1, [
      { allievoId: 'x', valore: 4, assente: false },
      { allievoId: 'y', valore: 6, assente: false },
      { allievoId: 'z', valore: null, assente: true },
    ])
    assert.equal(mediaMomento(m), 5)
  })

  it('anche la media di un momento si ferma al centesimo', () => {
    const m = momento('m1', 1, [
      { allievoId: 'x', valore: 5, assente: false },
      { allievoId: 'y', valore: 5, assente: false },
      { allievoId: 'z', valore: 4, assente: false },
    ])
    assert.equal(mediaMomento(m), 4.67)
  })

  it('descrive la distribuzione dei voti', () => {
    const m = momento('m1', 1, [
      { allievoId: 'a', valore: 3, assente: false },
      { allievoId: 'b', valore: 3.5, assente: false },
      { allievoId: 'c', valore: 4, assente: false },
      { allievoId: 'd', valore: 5.5, assente: false },
    ])
    const esito = distribuzione(m)
    assert.equal(esito.conteggio, 4)
    assert.equal(esito.minimo, 3)
    assert.equal(esito.massimo, 5.5)
    assert.equal(esito.sufficienti, 2)
    assert.equal(esito.insufficienti, 2)
    assert.equal(esito.fasce[3], 2)
    assert.equal(esito.fasce[5], 1)
  })

  it('scrive i voti senza zeri inutili', () => {
    assert.equal(formattaVoto(4.5), '4.5')
    assert.equal(formattaVoto(4), '4')
    assert.equal(formattaVoto(null), '—')
  })

  it('porta il voto sul passo della scala e dentro gli estremi', () => {
    assert.equal(arrotondaVoto(4.3, scala), 4.25)
    assert.equal(arrotondaVoto(4.13, scala), 4.25)
    assert.equal(arrotondaVoto(9, scala), 6)
    assert.equal(arrotondaVoto(0, scala), 1)
  })

  it('riconosce i voti fuori scala', () => {
    assert.equal(votoValido(4, scala), true)
    assert.equal(votoValido(6.5, scala), false)
    assert.equal(votoValido(Number.NaN, scala), false)
  })
})

describe('piani lezione', () => {
  it('confronta la scaletta con il tempo davvero disponibile', () => {
    const piano = creaPiano()
    piano.attivita = [creaAttivita('Introduzione', 0.5), creaAttivita('Esercizi', 1)]
    const lezione = lezioneConPausa()

    const confronto = confrontaPianoConLezione(piano, lezione, 45)
    assert.equal(confronto.durataPiano, 1.5)
    assert.equal(confronto.udLezione, 2)
    // Mezza unità libera: lo scostamento è negativo.
    assert.equal(confronto.scostamento, -0.5)
    // L'esercizio da quaranta va dal minuto 20 al 60: passa l'intervallo, e i soli
    // minuti non lo direbbero.
    assert.equal(confronto.oltreLaPausa, 1)
  })

  it('non segnala nulla quando la scaletta resta dentro UD attigue', () => {
    const piano = creaPiano()
    piano.attivita = [creaAttivita('Introduzione', 0.5), creaAttivita('Esercizi', 1)]
    // Novanta minuti filati, nessuna pausa: le stesse attività non si spezzano.
    const lezione = creaLezione('cor1', '2025-09-15', '08:00', 90)

    const confronto = confrontaPianoConLezione(piano, lezione, 45)
    assert.equal(confronto.scostamento, -0.5)
    assert.equal(confronto.oltreLaPausa, 0)
  })

  it('misura quanta scaletta è stata svolta', () => {
    const piano = creaPiano()
    piano.attivita = [creaAttivita('Uno', 0.25), creaAttivita('Due', 0.25)]
    const lezione = lezioneConPausa()

    assert.equal(avanzamentoPiano(lezione, piano), 0)

    lezione.avanzamento = [{ attivitaId: piano.attivita[0].id, stato: 'svolta' }]
    assert.equal(avanzamentoPiano(lezione, piano), 0.5)

    // «Parziale» non conta come svolta.
    lezione.avanzamento.push({ attivitaId: piano.attivita[1].id, stato: 'parziale' })
    assert.equal(avanzamentoPiano(lezione, piano), 0.5)
  })

  it('senza piano l’avanzamento è zero e non esplode', () => {
    assert.equal(avanzamentoPiano(lezioneConPausa(), null), 0)
  })
})

describe('elenchi', () => {
  it('ordina per cognome e poi per nome, con gli accenti al posto giusto', () => {
    const allievi = [
      { id: '1', cognome: 'Zanetti', nome: 'Ada', attivo: true },
      { id: '2', cognome: 'Bernasconi', nome: 'Luca', attivo: true },
      { id: '3', cognome: 'Bernasconi', nome: 'Anna', attivo: true },
      { id: '4', cognome: 'Àbate', nome: 'Ivo', attivo: true },
    ]
    assert.deepEqual(
      ordinaAllievi(allievi).map((a) => a.id),
      ['4', '3', '2', '1'],
    )
  })
})

describe('slot attaccati uno all’altro', () => {
  it('rimette ogni slot a partire dalla fine del precedente', () => {
    const sparsi = [creaSlot('08:00', 45), creaSlot('09:30', 15, 'pausa'), creaSlot('11:00', 45)]

    assert.deepEqual(
      slotIncatenati(sparsi).map((s) => [s.inizio, s.fine]),
      [
        ['08:00', '08:45'],
        ['08:45', '09:00'],
        ['09:00', '09:45'],
      ],
    )
  })

  it('non cambia le durate: sposta soltanto dove ciascuno comincia', () => {
    const sparsi = [creaSlot('08:00', 90), creaSlot('10:00', 20, 'pausa'), creaSlot('14:00', 45)]

    assert.deepEqual(
      slotIncatenati(sparsi).map((s) => durataMinuti(s.inizio, s.fine)),
      [90, 20, 45],
    )
  })

  it('tiene l’ordine dell’elenco, che è quello deciso trascinando', () => {
    const lezione = lezioneConPausa()
    const rovesciati = [...lezione.slot].reverse()

    assert.deepEqual(
      slotIncatenati(rovesciati).map((s) => [s.tipo, s.inizio]),
      [
        ['lezione', '09:00'],
        ['pausa', '09:45'],
        ['lezione', '10:00'],
      ],
    )
  })

  it('con un inizio nuovo sposta l’ora intera', () => {
    const lezione = lezioneConPausa()

    assert.deepEqual(
      slotIncatenati(lezione.slot, '10:30').map((s) => [s.inizio, s.fine]),
      [
        ['10:30', '11:15'],
        ['11:15', '11:30'],
        ['11:30', '12:15'],
      ],
    )
  })

  it('non tocca gli originali', () => {
    const lezione = lezioneConPausa()
    slotIncatenati(lezione.slot, '15:00')
    assert.equal(lezione.slot[0].inizio, '08:00')
  })

  it('su un elenco vuoto non ha niente da attaccare', () => {
    assert.deepEqual(slotIncatenati([]), [])
  })
})

describe('stirare un’ora da un capo', () => {
  it('allunga la fine di un’unità didattica, e le pause restano dove sono', () => {
    const lezione = lezioneConPausa()
    const stirati = slotStirati(lezione.slot, 'fine', 1, 45)
    assert.deepEqual(
      stirati.map((s) => [s.inizio, s.fine, s.tipo]),
      [
        ['08:00', '08:45', 'lezione'],
        ['08:45', '09:00', 'pausa'],
        ['09:00', '10:30', 'lezione'],
      ],
    )
  })

  it('anticipa l’inizio senza toccare la fine', () => {
    const lezione = lezioneConPausa()
    const stirati = slotStirati(lezione.slot, 'inizio', 1, 45)
    assert.equal(inizioLezione({ ...lezione, slot: stirati }), '07:15')
    assert.equal(fineLezione({ ...lezione, slot: stirati }), '09:45')
  })

  it('accorcia, ma mai sotto una UD', () => {
    const lezione = creaLezione('cor1', '2025-09-15', '08:00', 90)
    const accorciati = slotStirati(lezione.slot, 'fine', -1, 45)
    assert.equal(fineLezione({ ...lezione, slot: accorciati }), '08:45')
    assert.equal(slotStirati(accorciati, 'fine', -1, 45), null)
    assert.equal(slotStirati(accorciati, 'inizio', -1, 45), null)
  })

  it('non esce dal giorno', () => {
    const tardi = creaLezione('cor1', '2025-09-15', '23:00', 45)
    assert.equal(slotStirati(tardi.slot, 'fine', 1, 45), null)
    const presto = creaLezione('cor1', '2025-09-15', '00:30', 45)
    assert.equal(slotStirati(presto.slot, 'inizio', 1, 45), null)
  })

  it('su un capo che è una pausa non fa niente', () => {
    const slot = [creaSlot('08:00', 45), creaSlot('08:45', 15, 'pausa')]
    assert.equal(slotStirati(slot, 'fine', 1, 45), null)
  })

  it('a zero UD lascia gli slot come sono', () => {
    const lezione = lezioneConPausa()
    assert.equal(slotStirati(lezione.slot, 'fine', 0, 45), lezione.slot)
  })
})

describe('spostare un’ora intera', () => {
  it('trascina tutti gli slot insieme, pause comprese', () => {
    const lezione = lezioneConPausa()
    const spostati = slotSpostati(lezione.slot, '10:30')

    assert.deepEqual(
      spostati.map((s) => [s.inizio, s.fine]),
      [
        ['10:30', '11:15'],
        ['11:15', '11:30'],
        ['11:30', '12:15'],
      ],
    )
  })

  it('non cambia le durate: è la stessa ora, spostata', () => {
    const lezione = lezioneConPausa()
    const prima = minutiEffettivi(lezione)
    const dopo = minutiEffettivi({ ...lezione, slot: slotSpostati(lezione.slot, '14:05') })
    assert.equal(dopo, prima)
  })

  it('sa andare anche indietro', () => {
    const lezione = lezioneConPausa()
    const spostati = slotSpostati(lezione.slot, '07:30')
    assert.equal(inizioLezione({ ...lezione, slot: spostati }), '07:30')
    assert.equal(fineLezione({ ...lezione, slot: spostati }), '09:15')
  })

  it('lascia stare quel che è già al posto giusto', () => {
    const lezione = lezioneConPausa()
    assert.equal(slotSpostati(lezione.slot, '08:00'), lezione.slot)
  })

  it('su una lezione senza slot non ha niente da spostare', () => {
    assert.deepEqual(slotSpostati([], '09:00'), [])
  })
})

describe('dove sta un’ora rispetto ad adesso', () => {
  it('ieri è passata, domani è futura, comunque sia l’orologio', () => {
    const lezione = lezioneConPausa()
    assert.equal(momentoLezione(lezione, '2025-09-16', '00:01'), 'passata')
    assert.equal(momentoLezione(lezione, '2025-09-14', '23:59'), 'futura')
  })

  it('oggi guarda l’orologio, non solo la data', () => {
    const lezione = lezioneConPausa() // 08:00 – 09:45
    assert.equal(momentoLezione(lezione, '2025-09-15', '07:59'), 'futura')
    assert.equal(momentoLezione(lezione, '2025-09-15', '08:00'), 'in-corso')
    assert.equal(
      momentoLezione(lezione, '2025-09-15', '08:50'),
      'in-corso',
      'durante la pausa si è ancora in classe',
    )
    assert.equal(momentoLezione(lezione, '2025-09-15', '09:44'), 'in-corso')
    assert.equal(
      momentoLezione(lezione, '2025-09-15', '09:45'),
      'passata',
      'finita all’ultimo minuto: se manca l’appello manca adesso, non domani',
    )
  })

  it('un’ora di oggi senza orario non si può dire finita', () => {
    const lezione = creaLezione('cor1', '2025-09-15', '08:00', 45)
    lezione.slot = []
    assert.equal(momentoLezione(lezione, '2025-09-15', '23:00'), 'in-corso')
  })
})

describe('la scaletta posata sulle unità didattiche', () => {
  /** Un'ora di due UD piene: 08:20–09:50 senza pause. */
  function oraDiDueUd () {
    return creaLezione('cor-1', '2027-03-01', '08:20', 90)
  }

  it('dice in quale UD comincia ogni attività', () => {
    const lezione = oraDiDueUd()
    const scaletta = [
      { ...creaAttivita('introduzione', 0.25) },
      { ...creaAttivita('spiegazione', 0.75) },
      { ...creaAttivita('esercizio', 0.75) },
    ]

    const esito = scalettaSulleUd(scaletta, lezione, 45)

    // La seconda riempie la prima UD fino al minuto 45: la terza comincia
    // esattamente sul confine, quindi apre la seconda UD.
    assert.deepEqual(esito.posti.map((p) => p.ud), [0, 0, 1])
    assert.equal(esito.minutiLezione, 90)
    assert.equal(esito.udLezione, 2)
    assert.equal(esito.durataPiano, 1.75)
    assert.equal(esito.scostamento, -0.25)
  })

  it('segna l’attività che sta a cavallo di due UD', () => {
    const lezione = oraDiDueUd()
    // 30 + 30: la seconda comincia al minuto 30 e finisce al 60, oltre il
    // confine dei 45.
    const esito = scalettaSulleUd(
      [creaAttivita('a', 0.75), creaAttivita('b', 0.75)],
      lezione,
      45,
    )

    assert.equal(esito.posti[0].aCavallo, false)
    assert.equal(esito.posti[1].aCavallo, true)
  })

  it('quel che non ci sta resta fuori, dichiarato', () => {
    const lezione = oraDiDueUd()
    const esito = scalettaSulleUd(
      [creaAttivita('lunga', 2), creaAttivita('avanzo', 0.5)],
      lezione,
      45,
    )

    assert.equal(esito.posti[1].ud, null, 'la seconda comincia oltre la fine')
    assert.equal(esito.scostamento, 0.5)
  })

  it('conta i minuti presi in ciascuna UD', () => {
    const lezione = oraDiDueUd()
    const esito = scalettaSulleUd([creaAttivita('unica', 1.5)], lezione, 45)

    assert.deepEqual(esito.ud.map((u) => u.occupati), [45, 23])
    assert.deepEqual(esito.ud.map((u) => u.capienza), [45, 45])
    // Il cambio con cui la scaletta si posa sull'ora: la media delle sue UD.
    assert.equal(esito.minutiPerUd, 45)
  })

  it('accetta durate che non sono multipli di cinque', () => {
    const lezione = oraDiDueUd()
    const esito = scalettaSulleUd(
      [creaAttivita('un quarto', 0.25), creaAttivita('un briciolo', 0.05)],
      lezione,
      45,
    )

    // Cinque centesimi di unità non sono un'attività: si sale al quarto.
    assert.equal(esito.durataPiano, 0.5)
    assert.deepEqual(esito.posti.map((p) => p.ud), [0, 0])
  })

  it('due UD senza pausa in mezzo sono attigue: sconfinare non è sforare', () => {
    const esito = scalettaSulleUd(
      [creaAttivita('a', 0.75), creaAttivita('b', 0.75)],
      oraDiDueUd(),
      45,
    )

    assert.equal(esito.posti[1].aCavallo, true, 'passa da una UD all’altra')
    assert.equal(esito.posti[1].oltreLaPausa, false, 'ma le due si toccano')
    assert.deepEqual(esito.ud.map((u) => u.attigua), [false, true])
    assert.equal(esito.blocchi.length, 1)
    assert.deepEqual(
      { da: esito.blocchi[0].da, a: esito.blocchi[0].a, capienza: esito.blocchi[0].capienza },
      { da: 0, a: 1, capienza: 90 },
    )
  })

  it('segna chi comincia prima dell’intervallo e finisce dopo', () => {
    // 08:00–08:45, pausa, 09:00–09:45: le due UD non sono attigue.
    const esito = scalettaSulleUd(
      [creaAttivita('a', 0.75), creaAttivita('b', 0.75)],
      lezioneConPausa(),
      45,
    )

    assert.equal(esito.posti[1].ud, 0)
    assert.equal(esito.posti[1].udFine, 1)
    assert.equal(esito.posti[1].oltreLaPausa, true)
    assert.deepEqual(esito.ud.map((u) => u.attigua), [false, false])
    assert.deepEqual(esito.blocchi.map((b) => b.capienza), [45, 45])
    assert.deepEqual(esito.blocchi.map((b) => [b.inizio, b.fine]), [
      ['08:00', '08:45'],
      ['09:00', '09:45'],
    ])
  })

  it('dà a ogni attività l’ora dell’orologio, pause comprese', () => {
    // 08:00–08:45, intervallo di 15, 09:00–09:45.
    const esito = scalettaSulleUd(
      [creaAttivita('a', 0.75), creaAttivita('b', 0.75), creaAttivita('c', 0.25)],
      lezioneConPausa(),
      45,
    )

    assert.deepEqual(esito.posti.map((p) => [p.oraInizio, p.oraFine]), [
      ['08:00', '08:34'],
      // Comincia alle 08:30, ne restano 15 prima dell'intervallo: gli altri 15
      // cadono dopo, e l'attività finisce alle 09:15, non alle 09:00.
      ['08:34', '09:23'],
      ['09:23', '09:34'],
    ])
    assert.equal(esito.blocchi[1].pausaPrima, 15)
  })

  it('conta tutte le UD dell’ora, anche quelle su cui non cade niente', () => {
    const esito = scalettaSulleUd([creaAttivita('corta', 0.25)], lezioneConPausa(), 45)

    assert.equal(esito.ud.length, 2)
    assert.deepEqual(esito.ud.map((u) => u.occupati), [11, 0])
    assert.deepEqual(esito.ud.map((u) => u.blocco), [0, 1])
    assert.deepEqual(esito.blocchi.map((b) => b.occupati), [11, 0])
  })

  it('raggruppa le UD attaccate e dice quante ne tiene ogni gruppo', () => {
    // 13:15–14:45 sono due UD attaccate, poi l'intervallo, poi altre due.
    const lezione = creaLezione('cor1', '2027-03-01', '13:15', 90)
    lezione.slot = [
      creaSlot('13:15', 90),
      creaSlot('14:45', 15, 'pausa'),
      creaSlot('15:00', 90),
    ]

    const esito = scalettaSulleUd([creaAttivita('a', 2.25)], lezione, 45)

    assert.equal(esito.ud.length, 4)
    assert.deepEqual(esito.blocchi.map((b) => b.ud), [2, 2])
    assert.deepEqual(esito.blocchi.map((b) => [b.inizio, b.fine]), [
      ['13:15', '14:45'],
      ['15:00', '16:30'],
    ])
    // Cento minuti: novanta nel primo gruppo, dieci dopo l'intervallo.
    assert.deepEqual(esito.blocchi.map((b) => b.occupati), [90, 11])
    assert.equal(esito.posti[0].blocco, 0)
    assert.equal(esito.posti[0].bloccoFine, 1)
    assert.equal(esito.posti[0].oltreLaPausa, true)
  })

  it('un’ora senza pause è un gruppo solo', () => {
    const esito = scalettaSulleUd([creaAttivita('a', 1.25)], oraDiDueUd(), 45)

    assert.equal(esito.blocchi.length, 1)
    assert.equal(esito.blocchi[0].ud, 2)
    assert.equal(esito.blocchi[0].capienza, 90)
    assert.equal(esito.posti[0].blocco, 0)
    assert.equal(esito.posti[0].bloccoFine, 0)
  })

  it('chi sfora la fine dell’ora è fuori, non a cavallo', () => {
    const esito = scalettaSulleUd([creaAttivita('lunga', 3)], oraDiDueUd(), 45)

    assert.equal(esito.posti[0].udFine, null)
    assert.equal(esito.posti[0].aCavallo, false)
    assert.equal(esito.posti[0].oltreLaPausa, false)
    assert.equal(esito.scostamento, 1)
  })
})

describe('i voti che una scala ammette', () => {
  // Sono quelli della tendina: sbagliarli vuol dire proporre voti che la scala
  // non prevede, o non proporre quelli che chi insegna usa ogni giorno.

  it('vanno dal minimo al massimo, sul passo della scala', () => {
    assert.deepEqual(
      votiDellaScala({ min: 1, max: 6, sufficienza: 4, passo: 0.5 }).slice(0, 4),
      ['1', '1.5', '2', '2.5'],
    )
    assert.equal(votiDellaScala({ min: 1, max: 6, sufficienza: 4, passo: 0.5 }).length, 11)
    assert.equal(votiDellaScala({ min: 1, max: 6, sufficienza: 4, passo: 0.25 }).length, 21)
  })

  it('non lascia in giro le cifre del virgola mobile', () => {
    // Sommando 0,25 quattro volte si arriva a 1.7500000000000002: niente code nei
    // voti della tendina.
    const voti = votiDellaScala({ min: 1, max: 6, sufficienza: 4, passo: 0.25 })
    assert.ok(voti.every((v) => v.length <= 4), voti.join(' '))
    assert.ok(voti.includes('1.75'))
    assert.ok(voti.includes('6'))
  })

  it('un passo storto non produce un elenco infinito', () => {
    // Zero, negativo, o più grande della scala: si torna al mezzo punto.
    assert.equal(votiDellaScala({ min: 1, max: 6, sufficienza: 4, passo: 0 }).length, 11)
    assert.equal(votiDellaScala({ min: 1, max: 6, sufficienza: 4, passo: -1 }).length, 11)
    assert.equal(votiDellaScala({ min: 1, max: 6, sufficienza: 4, passo: 99 }).length, 11)
  })
})

describe('le percentuali', () => {
  it('percento arrotonda il mezzo per eccesso anche quando la virgola mobile lo affonda', () => {
    assert.equal(percento(0.145), '15%')
    assert.equal(percento(29 / 200), '15%')
    assert.equal(percento(0.2), '20%')
    assert.equal(percento(null), '—')
  })

  it('percentoAssenza non scrive «20%» per chi è oltre il 20', () => {
    const quota = 45 / 224
    assert.equal(percento(quota), '20%')
    assert.equal(percentoAssenza(quota, 20), '20,1%')
    assert.equal(percentoAssenza(0.18, 20), '18%')
    assert.equal(percentoAssenza(0.5, 20), '50%')
    assert.equal(percentoAssenza(null, 20), '—')
    // Soglia spenta: si legge la percentuale e basta.
    assert.equal(percentoAssenza(quota, 0), '20%')
  })

  /** Quattro martedì da tre UD: dodici previste. Rossi ne perde una, l'8,33%. */
  function scuolaDiDodici () {
    const base = scuolaMinima()
    base.corso.orario = [{ giorno: 2, inizio: '08:00', durataMin: 135 }]
    for (const [i, data] of ['2026-09-15', '2026-09-22', '2026-09-29', '2026-10-06'].entries()) {
      const lezione = creaLezione(base.corso.id, data, '08:00', 135)
      lezione.presenze = [
        { allievoId: base.rossi.id, stati: [i === 0 ? 'assente' : 'presente', 'presente', 'presente'] },
        { allievoId: base.bianchi.id, stati: ['presente', 'presente', 'presente'] },
      ]
      base.registro.lezioni.push(lezione)
    }
    base.registro.impostazioni.sogliaAssenza = 8
    return base
  }
  const PERIODO = {
    id: 'sem-prova', numero: 1, etichetta: 'periodo di prova',
    inizio: '2026-09-15', fine: '2026-10-06',
  }

  it('lo scarto di chi è oltre di un soffio non è zero', () => {
    const { registro, corso } = scuolaDiDodici()
    const [s] = segnalazioniDelCorso(registro, corso, PERIODO)
    assert.equal(s.percento, 8.4)
    assert.equal(s.scarto, 0.4)
  })

  it('il foglio della classe scrive la stessa cifra dell’elenco', () => {
    const { registro, corso } = scuolaDiDodici()
    const dati = datiPresenze(registro, corso, PERIODO)
    assert.equal(dati.elenchi.oltreSoglia.length, 1)
    assert.match(dati.elenchi.oltreSoglia[0], /assenza del 8,4% su 12 UD previste/)
  })
})

describe('i voti sul passo, senza residui', () => {
  /** Una scala da 1 a 6 con il passo dato. */
  function scala (passo) {
    return { min: 1, max: 6, sufficienza: 4, passo }
  }

  it('con il passo 0,1 ogni voto della tendina si salva uguale', () => {
    assert.equal(arrotondaVoto(3.8, scala(0.1)), 3.8)
    for (const voto of votiDellaScala(scala(0.1))) {
      assert.equal(arrotondaVoto(Number(voto), scala(0.1)), Number(voto), `il ${voto}`)
    }
    for (const voto of votiDellaScala(scala(0.2))) {
      assert.equal(arrotondaVoto(Number(voto), scala(0.2)), Number(voto), `il ${voto}`)
    }
  })

  it('il passo si conta dal minimo della scala, come la tendina', () => {
    // Minimo 1 e passo 0,3: 1; 1,3; 1,6… — non 0,9; 1,2; 1,5.
    assert.equal(arrotondaVoto(1.3, scala(0.3)), 1.3)
    assert.equal(arrotondaVoto(1, scala(0.3)), 1, 'il minimo resta nella scala')
    assert.equal(arrotondaVoto(6, scala(0.3)), 6, 'e anche il massimo')
  })

  it('a quarti e a mezzi non cambia niente', () => {
    assert.equal(arrotondaVoto(4.13, scala(0.25)), 4.25)
    assert.equal(arrotondaVoto(4.12, scala(0.25)), 4)
    assert.equal(arrotondaVoto(4.75, scala(0.5)), 5)
    assert.equal(arrotondaVoto(7.3, { min: 1, max: 10, sufficienza: 6, passo: 0.5 }), 7.5)
  })

  it('la nota di fine semestre: senza residui, e dentro la scala', () => {
    assert.equal(notaFineSemestre(3.77, scala(0.25), 0.1), 3.8)
    assert.equal(notaFineSemestre(4.37, scala(0.25), 0.5), 4.5)
    // Un passo che scavalca il massimo non porta la nota fuori scala.
    assert.equal(notaFineSemestre(6, scala(0.25), 4), 6)
  })
})
