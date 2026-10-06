// I difetti dei rapporti trovati in revisione, uno per prova: ognuna era rossa
// prima della correzione. Un rapporto esce dal registro e va in mano ad altri:
// un indirizzo di troppo, un «tutti presenti» non vero o una media fra scale
// diverse lì non li corregge nessuno.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  IMPOSTAZIONI_PREDEFINITE,
  creaAllievo,
  creaAnno,
  creaComunicazione,
  creaConsegna,
  creaFascicolo,
  creaLezione,
  creaPiano,
  creaValutazione,
  datiAllievo,
  datiCorso,
  datiDiario,
  datiFascicolo,
  datiLezione,
  datiPiano,
  datiPresenze,
  datiValutazioni,
  normalizzaRegistro,
} from '../../dist-tests/domain.mjs'

/** Un'ora di due UD, svolta, con l'appello che le si passa. */
function ora (data, presenze, stato = 'svolta') {
  const lezione = creaLezione('cor-1', data, '08:00', 90)
  lezione.presenze = presenze
  lezione.stato = stato
  return lezione
}

/**
 * Un registro con un corso e la classe che gli si dà: per difetto Rossi Anna
 * inserita prima di Bianchi Luca, così l'ordine d'inserimento non è quello
 * dell'elenco.
 */
function registroCon ({ lezioni = [], valutazioni = [], allievi, fascicoli = [], consegne = [], piani = [] } = {}) {
  const anno = creaAnno('2026-09-01', '2027-06-30', '2026/27', '2027-01-31')
  anno.id = 'a1'
  anno.semestri[0].id = 's1'
  anno.semestri[1].id = 's2'
  const elenco = allievi ?? [
    { ...creaAllievo('Rossi', 'Anna'), id: 'al-1' },
    { ...creaAllievo('Bianchi', 'Luca'), id: 'al-2' },
  ]
  return normalizzaRegistro({
    anni: [anno],
    annoCorrenteId: 'a1',
    materie: [{ id: 'mat-1', nome: 'Calcolo professionale' }],
    classi: [{ id: 'cl-1', annoId: 'a1', nome: 'DIC2', allievi: elenco, docenteDiClasse: true }],
    corsi: [{ id: 'cor-1', classeId: 'cl-1', materiaId: 'mat-1', titolo: 'CP — DIC2' }],
    lezioni,
    valutazioni,
    fascicoli,
    consegne,
    piani,
    impostazioni: IMPOSTAZIONI_PREDEFINITE,
  })
}

/** Un momento di valutazione del corso con i voti dati, sulla scala data. */
function prova (titolo, data, voti, scala = IMPOSTAZIONI_PREDEFINITE.scala) {
  const momento = creaValutazione('cor-1', titolo, scala, data)
  momento.voti = voti.map(([allievoId, valore]) => ({
    allievoId,
    valore,
    assente: valore === null,
  }))
  return momento
}

const primo = (registro) => registro.anni[0].semestri[0]
const corso = (registro) => registro.corsi[0]
const classe = (registro) => registro.classi[0]
/** La colonna di una tabella per nome di serie. */
const colonna = (tabella, nome) => (tabella.chiavi ?? tabella.intestazione).indexOf(nome)

describe('la scheda di una persona non porta gli indirizzi degli altri', () => {
  it('nella colonna «A chi» solo i suoi, e la comunicazione alla classe si dice tale', () => {
    const fascicolo = creaFascicolo('cl-1')
    const allaClasse = {
      ...creaComunicazione(fascicolo),
      oggetto: 'Uscita',
      stato: 'inviata',
      inviataIl: '2026-10-05T10:00:00.000Z',
      // L'invio salva gli indirizzi in minuscolo.
      destinatari: ['anna.rossi@scuola.ch', 'luca.bianchi@scuola.ch', 'papa.bianchi@casa.ch'],
    }
    fascicolo.comunicazioni = [allaClasse]
    const anna = { ...creaAllievo('Rossi', 'Anna'), id: 'al-1', email: 'Anna.Rossi@scuola.ch' }
    const luca = { ...creaAllievo('Bianchi', 'Luca'), id: 'al-2', email: 'luca.bianchi@scuola.ch' }
    const registro = registroCon({ allievi: [anna, luca], fascicoli: [fascicolo] })

    const dati = datiAllievo(registro, classe(registro), registro.classi[0].allievi[0], null, null)
    const tabella = dati.tabelle.comunicazioni
    assert.equal(tabella.righe.length, 1)
    const aChi = tabella.righe[0][colonna(tabella, 'A chi')]
    assert.doesNotMatch(aChi, /bianchi/, 'niente indirizzi dei compagni né delle loro famiglie')
    assert.match(aChi, /anna\.rossi@scuola\.ch/, 'il suo sì: maiuscole o no è lo stesso indirizzo')
    assert.match(aChi, /tutta la classe/)
  })

  it('un cognome dentro un indirizzo altrui non la fa sua', () => {
    const fascicolo = creaFascicolo('cl-1')
    fascicolo.comunicazioni = [{
      ...creaComunicazione(fascicolo),
      oggetto: 'A un altro Rossi',
      aAllievi: false,
      aTutori: false,
      stato: 'inviata',
      inviataIl: '2026-10-05T10:00:00.000Z',
      // Scritto con le maiuscole, come in un documento di prima del minuscolo.
      destinatari: ['Mario.Rossi@altrove.ch'],
    }]
    const anna = { ...creaAllievo('Rossi', 'Anna'), id: 'al-1', email: 'anna.rossi@scuola.ch' }
    const registro = registroCon({ allievi: [anna], fascicoli: [fascicolo] })

    const dati = datiAllievo(registro, classe(registro), registro.classi[0].allievi[0], null, null)
    assert.deepEqual(dati.tabelle.comunicazioni.righe, [])
  })
})

describe('il diario del corso', () => {
  it('un’ora svolta senza appello non è un’ora di tutti presenti', () => {
    const registro = registroCon({ lezioni: [ora('2026-10-06', [])] })
    const dati = datiDiario(registro, corso(registro), primo(registro))
    const tabella = dati.tabelle.diario
    assert.equal(tabella.righe[0][colonna(tabella, 'Presenze')], 'appello non fatto')
  })

  it('gli assenti una volta sola col numero, e col nome intero', () => {
    const registro = registroCon({
      lezioni: [ora('2026-10-06', [
        { allievoId: 'al-1', stati: ['assente', 'assente'] },
        { allievoId: 'al-2', stati: ['presente', 'presente'] },
      ])],
    })
    const dati = datiDiario(registro, corso(registro), primo(registro))
    const tabella = dati.tabelle.diario
    assert.equal(tabella.righe[0][colonna(tabella, 'Presenze')], '1 assente: Rossi Anna')
  })

  it('le UD svolte sono quelle delle ore svolte, non anche delle pianificate', () => {
    const registro = registroCon({
      lezioni: [ora('2026-10-06', []), ora('2026-10-13', [], 'pianificata')],
    })
    const dati = datiDiario(registro, corso(registro), primo(registro))
    assert.equal(dati.valori.quanti, '1')
    assert.equal(dati.valori.udSvolte, '2')
  })
})

describe('una media fra scale diverse non si stampa', () => {
  // 24 su 30 e 5 su 6 sono due buoni voti; la loro media pesata, 14,5, non è
  // un voto di nessuna delle due scale.
  const trenta = { min: 0, max: 30, passo: 1, sufficienza: 18 }
  const registroMisto = () => registroCon({
    valutazioni: [
      prova('Esame', '2026-10-06', [['al-1', 24]], trenta),
      prova('Verifica', '2026-10-13', [['al-1', 5]]),
    ],
  })

  it('nella griglia dei voti: niente numero, e la nota dice perché', () => {
    const registro = registroMisto()
    const dati = datiValutazioni(registro, corso(registro), primo(registro))
    const tabella = dati.tabelle.voti
    const anna = tabella.righe.find((r) => r[0] === 'Rossi Anna')
    assert.equal(anna[colonna(tabella, 'Media')], '—')
    assert.equal(anna.at(-1), 'scale diverse')
    assert.match(dati.valori.avvisoScale, /scale diverse/)
    assert.equal(dati.grafici.andamento.linee.some((l) => l.tipo === 'media'), false)
  })

  it('nella scheda della persona e nella scheda del corso', () => {
    const registro = registroMisto()
    const scheda = datiAllievo(
      registro, classe(registro), classe(registro).allievi[0], primo(registro), corso(registro),
    )
    assert.equal(scheda.valori.media, '—')
    assert.equal(scheda.valori.notaSemestre, '')
    assert.match(scheda.valori.avvisoScale, /scale diverse/)
    assert.doesNotMatch(JSON.stringify(scheda.tabelle.medie.righe), /14\.50/)

    const scheda2 = datiCorso(registro, corso(registro), primo(registro))
    assert.equal(scheda2.valori.media, '—')
    assert.doesNotMatch(JSON.stringify(scheda2.tabelle.quadro.righe), /14\.50/)
  })
})

describe('i recuperi nella scheda della persona', () => {
  it('chi mancava alla prova ha il suo recupero anche senza una riga scritta', () => {
    const registro = registroCon({
      valutazioni: [prova('Verifica', '2026-10-06', [['al-1', null], ['al-2', 5]])],
    })
    const dati = datiAllievo(
      registro, classe(registro), classe(registro).allievi[0], primo(registro), corso(registro),
    )
    const tabella = dati.tabelle.recuperi
    assert.equal(tabella.righe.length, 1)
    assert.equal(tabella.righe[0][colonna(tabella, 'Stato')], 'da fissare')
  })

  it('un ritirato dispensato resta dispensato, non «da fissare»', () => {
    const momento = prova('Verifica', '2026-10-06', [['al-1', null]])
    momento.recuperi = [{ allievoId: 'al-1', dispensato: true }]
    const ritirata = { ...creaAllievo('Rossi', 'Anna'), id: 'al-1', attivo: false }
    const registro = registroCon({ allievi: [ritirata], valutazioni: [momento] })
    const dati = datiAllievo(
      registro, classe(registro), classe(registro).allievi[0], primo(registro), corso(registro),
    )
    const tabella = dati.tabelle.recuperi
    assert.equal(tabella.righe[0][colonna(tabella, 'Stato')], 'non si recupera')
  })
})

describe('le presenze di classe in testata', () => {
  it('sono quelle della riga «Classe» della tabella, sulle UD previste', () => {
    const registro = registroCon({
      lezioni: [
        ora('2026-10-06', [
          { allievoId: 'al-1', stati: ['assente', 'assente'] },
          { allievoId: 'al-2', stati: ['presente', 'presente'] },
        ]),
        // Un'ora di cui nessuno ha segnato niente.
        ora('2026-10-13', []),
      ],
    })
    const dati = datiPresenze(registro, corso(registro), primo(registro))
    const tabella = dati.tabelle.presenze
    const rigaClasse = tabella.righe.at(-1)
    assert.equal(dati.valori.presenza, rigaClasse[colonna(tabella, '% presenza')])
    assert.equal(dati.valori.presenza, '75%')
  })

  it('«Lezioni a calendario» conta le stesse ore di «UD a calendario»', () => {
    const registro = registroCon({
      lezioni: [ora('2026-10-06', []), ora('2026-10-13', [], 'pianificata')],
    })
    const dati = datiPresenze(registro, corso(registro), primo(registro))
    assert.equal(dati.valori.quanti, '2')
    assert.equal(dati.valori.udTenute, '4')
    // E nella scheda del corso il diario non lo copre.
    assert.equal(datiCorso(registro, corso(registro), primo(registro)).valori.quanti, '2')
  })
})

describe('le persone nelle tabelle di classe', () => {
  const conRitirati = () => [
    { ...creaAllievo('Rossi', 'Anna'), id: 'al-1' },
    { ...creaAllievo('Bianchi', 'Luca'), id: 'al-2' },
    { ...creaAllievo('Verdi', 'Ugo'), id: 'al-3', attivo: false },
    { ...creaAllievo('Neri', 'Eva'), id: 'al-4', attivo: false },
  ]

  it('la griglia dei voti va in ordine di elenco; un ritirato solo se ha un voto, segnato', () => {
    const registro = registroCon({
      allievi: conRitirati(),
      valutazioni: [prova('Verifica', '2026-10-06', [['al-1', 5], ['al-2', 4], ['al-4', 3]])],
    })
    const dati = datiValutazioni(registro, corso(registro), primo(registro))
    assert.deepEqual(
      dati.tabelle.voti.righe.map((r) => r[0]),
      ['Bianchi Luca', 'Neri Eva (ritirato)', 'Rossi Anna'],
    )
    assert.deepEqual(
      dati.tabelle.esecuzioni.righe.map((r) => r[0]),
      ['Bianchi Luca', 'Neri Eva (ritirato)', 'Rossi Anna'],
    )
  })

  it('il verbale dell’ora va in ordine di elenco, senza chi si è ritirato prima', () => {
    const registro = registroCon({
      allievi: conRitirati(),
      lezioni: [ora('2026-10-06', [
        { allievoId: 'al-1', stati: ['presente', 'presente'] },
        { allievoId: 'al-2', stati: ['presente', 'presente'] },
      ])],
    })
    const dati = datiLezione(registro, registro.lezioni[0], [])
    assert.deepEqual(dati.tabelle.presenze.righe.map((r) => r[0]), ['Bianchi Luca', 'Rossi Anna'])
  })

  it('il fascicolo conta e elenca chi frequenta', () => {
    const registro = registroCon({ allievi: conRitirati() })
    const dati = datiFascicolo(registro, classe(registro))
    assert.equal(dati.valori.allievi, '2')
    assert.deepEqual(dati.tabelle.allievi.righe.map((r) => r[0]), ['Bianchi Luca', 'Rossi Anna'])
  })
})

describe('la media di classe della scheda del corso', () => {
  it('lascia fuori chi si è ritirato', () => {
    const registro = registroCon({
      allievi: [
        { ...creaAllievo('Rossi', 'Anna'), id: 'al-1' },
        { ...creaAllievo('Bianchi', 'Luca'), id: 'al-2' },
        { ...creaAllievo('Verdi', 'Ugo'), id: 'al-3', attivo: false },
      ],
      valutazioni: [prova('Verifica', '2026-10-06', [['al-1', 5], ['al-2', 5], ['al-3', 1]])],
    })
    assert.equal(datiCorso(registro, corso(registro), primo(registro)).valori.media, '5.00')
  })

  it('si arrotonda al centesimo come le altre medie, non con toFixed', () => {
    // (4,45 + 4,5) / 2 = 4,475, che in virgola mobile è 4,47499…: toFixed dà 4,47.
    const registro = registroCon({
      valutazioni: [prova('Verifica', '2026-10-06', [['al-1', 4.45], ['al-2', 4.5]])],
    })
    assert.equal(datiCorso(registro, corso(registro), primo(registro)).valori.media, '4.48')
  })
})

describe('le piccole cose della scheda della persona', () => {
  it('le consegne sono quelle del periodo', () => {
    const autunno = { ...creaConsegna('cor-1', 'Esercizi 1', '2026-10-06'), a: 'classe' }
    const primavera = { ...creaConsegna('cor-1', 'Esercizi 2', '2027-03-09'), a: 'classe' }
    const registro = registroCon({ consegne: [autunno, primavera] })
    const dati = datiAllievo(
      registro, classe(registro), classe(registro).allievi[0], primo(registro), corso(registro),
    )
    assert.deepEqual(
      dati.tabelle.consegne.righe.map((r) => r[colonna(dati.tabelle.consegne, 'Che cosa')]),
      ['Esercizi 1'],
    )
  })

  it('il consuntivo dell’ora, nota sulla classe, non entra nel suo diario', () => {
    const lezione = ora('2026-10-06', [{ allievoId: 'al-1', stati: ['presente', 'presente'] }])
    lezione.consuntivo = 'Classe agitata, Bianchi da richiamare'
    const registro = registroCon({ lezioni: [lezione] })
    const dati = datiAllievo(
      registro, classe(registro), classe(registro).allievi[0], primo(registro), corso(registro),
    )
    assert.doesNotMatch(JSON.stringify(dati.tabelle.diario.righe), /agitata/)
  })
})

describe('il piano lezione', () => {
  it('una tappa da fare si scrive «da fare»', () => {
    const piano = creaPiano('cor-1')
    piano.attivita = [{ id: 'att-1', titolo: 'Ripasso', tipo: 'ripasso', durataUd: 1, risorse: [] }]
    const lezione = ora('2026-10-06', [])
    lezione.pianoId = piano.id
    lezione.avanzamento = []
    const registro = registroCon({ lezioni: [lezione], piani: [piano] })
    const dati = datiLezione(registro, registro.lezioni[0], [])
    assert.equal(dati.tabelle.scaletta.righe[0].at(-1), 'da fare')
  })

  it('il periodo è il semestre delle ore che lo usano', () => {
    const piano = creaPiano('cor-1')
    const lezione = ora('2026-10-06', [])
    lezione.pianoId = piano.id
    const registro = registroCon({ lezioni: [lezione], piani: [piano] })
    assert.equal(datiPiano(registro, registro.piani[0]).valori.periodo, '1° semestre')
  })
})
