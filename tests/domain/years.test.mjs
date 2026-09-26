// L'anno scolastico e i suoi semestri. L'anno non ha date sue (comincia col
// primo semestre e finisce con l'ultimo) e fra un semestre e il successivo non
// resta un giorno di nessuno: una lezione non può cadere fuori da tutti e due.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  allineaSemestri,
  annoAllineato,
  cartellaDellAnno,
  conLetteraSettimana,
  confineAnno,
  creaAnno,
  fetteDellAnno,
  intervalloAnno,
  letteraSettimana,
  normalizzaRegistro,
  semestreDi,
  validaAnno,
} from '../../dist-tests/domain.mjs'

/** Due semestri scritti a mano, per provare che cosa se ne ricava. */
function semestri (primoInizio, primoFine, secondoInizio, secondoFine) {
  return [
    { id: 's1', numero: 1, etichetta: '1° semestre', inizio: primoInizio, fine: primoFine },
    { id: 's2', numero: 2, etichetta: '2° semestre', inizio: secondoInizio, fine: secondoFine },
  ]
}

describe('l’anno si ricava dai suoi semestri', () => {
  it('prende inizio dal primo e fine dall’ultimo', () => {
    const dentro = semestri('2026-09-01', '2027-01-31', '2027-02-01', '2027-06-30')

    assert.deepEqual(intervalloAnno(dentro), { inizio: '2026-09-01', fine: '2027-06-30' })
  })

  it('riscrive le date dell’anno anche quando erano altre', () => {
    const anno = annoAllineato({
      id: 'a1',
      etichetta: '2026/27',
      inizio: '2026-08-15',
      fine: '2027-07-31',
      semestri: semestri('2026-09-01', '2027-01-31', '2027-02-01', '2027-06-30'),
      sospensioni: [],
    })

    assert.equal(anno.inizio, '2026-09-01')
    assert.equal(anno.fine, '2027-06-30')
  })

  it('senza semestri non inventa niente', () => {
    const nudo = { id: 'a1', etichetta: 'x', inizio: '2026-09-01', fine: '2027-06-30', semestri: [], sospensioni: [] }

    assert.equal(intervalloAnno([]), null)
    assert.deepEqual(annoAllineato(nudo), nudo)
  })
})

describe('i semestri sono attigui', () => {
  it('chiude il buco fra l’uno e l’altro', () => {
    // Il secondo comincia una settimana dopo: i giorni in mezzo non sarebbero di
    // nessuno.
    const [, secondo] = allineaSemestri(
      semestri('2026-09-01', '2027-01-31', '2027-02-08', '2027-06-30'),
    )

    assert.equal(secondo.inizio, '2027-02-01')
  })

  it('toglie la sovrapposizione', () => {
    const [, secondo] = allineaSemestri(
      semestri('2026-09-01', '2027-01-31', '2027-01-15', '2027-06-30'),
    )

    assert.equal(secondo.inizio, '2027-02-01')
  })

  it('li rimette in ordine e li rinumera', () => {
    const scambiati = [
      { id: 's2', numero: 1, etichetta: 'secondo', inizio: '2027-02-01', fine: '2027-06-30' },
      { id: 's1', numero: 2, etichetta: 'primo', inizio: '2026-09-01', fine: '2027-01-31' },
    ]

    const messi = allineaSemestri(scambiati)

    assert.deepEqual(messi.map((s) => [s.id, s.numero]), [['s1', 1], ['s2', 2]])
  })

  it('ogni giorno dell’anno appartiene a un semestre', () => {
    const anno = creaAnno('2026-09-01', '2027-06-30', '2026/27', '2027-01-31')
    const giorni = ['2026-09-01', '2027-01-31', '2027-02-01', '2027-06-30']

    for (const giorno of giorni) {
      assert.ok(semestreDi(anno, giorno), `${giorno} non sta in nessun semestre`)
    }
    assert.equal(confineAnno(anno), '2027-01-31')
  })
})

describe('quel che si legge dai file esce già in accordo', () => {
  it('un anno scritto con le date discordi si rimette a posto da solo', () => {
    const registro = normalizzaRegistro({
      anni: [
        {
          id: 'a1',
          etichetta: '2026/27',
          // Date dell'anno e semestri discordano: vincono i semestri, e il buco si
          // chiude.
          inizio: '2026-08-01',
          fine: '2027-07-15',
          semestri: semestri('2026-09-01', '2027-01-31', '2027-02-10', '2027-06-30'),
          sospensioni: [],
        },
      ],
      annoCorrenteId: 'a1',
    })

    const [anno] = registro.anni
    assert.equal(anno.inizio, '2026-09-01')
    assert.equal(anno.fine, '2027-06-30')
    assert.equal(anno.semestri[1].inizio, '2027-02-01')
    assert.ok(validaAnno(anno).valido, validaAnno(anno).errori?.join(' '))
  })
})

describe('la validazione guarda i semestri', () => {
  const base = {
    id: 'a1',
    etichetta: '2026/27',
    inizio: '2026-09-01',
    fine: '2027-06-30',
    sospensioni: [],
  }

  it('accetta un anno in accordo con i suoi semestri', () => {
    const esito = validaAnno({
      ...base,
      semestri: semestri('2026-09-01', '2027-01-31', '2027-02-01', '2027-06-30'),
    })

    assert.ok(esito.valido, esito.errori?.join(' '))
  })

  it('rifiuta un anno senza semestri: non avrebbe né inizio né fine', () => {
    assert.equal(validaAnno({ ...base, semestri: [] }).valido, false)
  })

  it('rifiuta i semestri staccati', () => {
    const esito = validaAnno({
      ...base,
      semestri: semestri('2026-09-01', '2027-01-31', '2027-02-08', '2027-06-30'),
    })

    assert.equal(esito.valido, false)
    assert.match(esito.errori.join(' '), /giorno dopo/)
  })

  it('rifiuta le date dell’anno che non sono quelle dei semestri', () => {
    const esito = validaAnno({
      ...base,
      fine: '2027-07-31',
      semestri: semestri('2026-09-01', '2027-01-31', '2027-02-01', '2027-06-30'),
    })

    assert.equal(esito.valido, false)
    assert.match(esito.errori.join(' '), /non sono quelle dei suoi semestri/)
  })
})

describe('le pause dell’anno', () => {
  const conSemestri = {
    id: 'a1',
    etichetta: '2026/27',
    inizio: '2026-09-01',
    fine: '2027-06-30',
    semestri: [
      { id: 's1', numero: 1, etichetta: '1° semestre', inizio: '2026-09-01', fine: '2027-01-31' },
      { id: 's2', numero: 2, etichetta: '2° semestre', inizio: '2027-02-01', fine: '2027-06-30' },
    ],
  }

  it('accetta le vacanze dentro l’anno', () => {
    const esito = validaAnno({
      ...conSemestri,
      sospensioni: [
        { id: 'p1', etichetta: 'Vacanze di Natale', dal: '2026-12-21', al: '2027-01-06' },
        { id: 'p2', etichetta: 'Vacanze di carnevale', dal: '2027-02-15', al: '2027-02-21' },
      ],
    })

    assert.ok(esito.valido, esito.errori?.join(' '))
  })

  it('rifiuta una pausa che cade fuori dall’anno', () => {
    const esito = validaAnno({
      ...conSemestri,
      sospensioni: [{ id: 'p1', etichetta: 'Vacanze estive', dal: '2027-07-10', al: '2027-08-20' }],
    })

    assert.equal(esito.valido, false)
    assert.match(esito.errori.join(' '), /fuori dall’anno/)
  })

  it('una pausa di un giorno solo ha dal e al uguali', () => {
    const esito = validaAnno({
      ...conSemestri,
      sospensioni: [{ id: 'p1', etichetta: 'Giornata d’istituto', dal: '2027-03-12', al: '2027-03-12' }],
    })

    assert.ok(esito.valido, esito.errori?.join(' '))
  })

  it('rifiuta una pausa che finisce prima di cominciare', () => {
    const esito = validaAnno({
      ...conSemestri,
      sospensioni: [{ id: 'p1', etichetta: 'Ponte', dal: '2027-03-12', al: '2027-03-01' }],
    })

    assert.equal(esito.valido, false)
  })
})

// --------------------------------------------------- l'anno come unità di stoccaggio

describe('il nome della cartella di un anno', () => {
  it('ricava il nome dall’etichetta, con le barre che diventano trattini', () => {
    const anno = { id: 'a1', etichetta: '2026/2027', inizio: '2026-09-01' }

    assert.equal(cartellaDellAnno(anno, new Set()), '2026-2027')
  })

  it('non pesta una cartella già presa', () => {
    const anno = { id: 'a1', etichetta: '2026/2027', inizio: '2026-09-01' }

    assert.equal(cartellaDellAnno(anno, new Set(['2026-2027'])), '2026-2027 (2)')
  })

  it('senza etichetta ripiega sull’anno d’inizio', () => {
    const anno = { id: 'a1', etichetta: '', inizio: '2026-09-01' }

    assert.equal(cartellaDellAnno(anno, new Set()), '2026')
  })
})

describe('dividere un registro per anno', () => {
  /**
   * Due anni con una classe ciascuno, e sotto un corso, un'ora, un voto, una
   * consegna e un fascicolo: la catena che la divisione deve risalire.
   */
  function registroDiDueAnni (extra = {}) {
    return normalizzaRegistro({
      anni: [
        {
          id: 'a1',
          etichetta: '2025/2026',
          inizio: '2025-09-01',
          fine: '2026-06-30',
          semestri: semestri('2025-09-01', '2026-01-31', '2026-02-01', '2026-06-30'),
          sospensioni: [],
        },
        {
          id: 'a2',
          etichetta: '2026/2027',
          inizio: '2026-09-01',
          fine: '2027-06-30',
          semestri: semestri('2026-09-01', '2027-01-31', '2027-02-01', '2027-06-30'),
          sospensioni: [],
        },
      ],
      annoCorrenteId: 'a2',
      materie: [{ id: 'm1', nome: 'Calcolo professionale' }],
      classi: [
        { id: 'c1', annoId: 'a1', nome: 'DIC3a', allievi: [] },
        { id: 'c2', annoId: 'a2', nome: 'DIC4a', allievi: [] },
      ],
      corsi: [
        { id: 'k1', classeId: 'c1', materiaId: 'm1', titolo: 'CP — DIC3a' },
        { id: 'k2', classeId: 'c2', materiaId: 'm1', titolo: 'CP — DIC4a' },
      ],
      lezioni: [
        { id: 'l1', corsoId: 'k1', data: '2025-10-01' },
        { id: 'l2', corsoId: 'k2', data: '2026-10-01' },
      ],
      valutazioni: [
        { id: 'v1', corsoId: 'k1', titolo: 'Verifica 1', data: '2025-10-08', voti: [] },
        { id: 'v2', corsoId: 'k2', titolo: 'Verifica 1', data: '2026-10-08', voti: [] },
      ],
      consegne: [
        { id: 'g1', corsoId: 'k1', testo: 'Esercizi', tipo: 'compito' },
        { id: 'g2', corsoId: 'k2', testo: 'Esercizi', tipo: 'compito' },
      ],
      fascicoli: [{ classeId: 'c1' }, { classeId: 'c2' }],
      ...extra,
    })
  }

  it('dà a ogni anno le sue classi, e con loro corsi, ore, voti e consegne', () => {
    const registro = registroDiDueAnni()

    const primo = fetteDellAnno(registro, 'a1', false)
    const secondo = fetteDellAnno(registro, 'a2', false)

    assert.deepEqual(primo.classi.map((c) => c.nome), ['DIC3a'])
    assert.deepEqual(primo.corsi.map((c) => c.id), ['k1'])
    assert.deepEqual(primo.lezioni.map((l) => l.id), ['l1'])
    assert.deepEqual(primo.valutazioni.map((v) => v.id), ['v1'])
    assert.deepEqual(primo.consegne.map((g) => g.id), ['g1'])
    assert.deepEqual(primo.fascicoli.map((f) => f.classeId), ['c1'])
    assert.deepEqual(secondo.lezioni.map((l) => l.id), ['l2'])
  })

  it('non lascia niente in comune fra due anni', () => {
    const registro = registroDiDueAnni()

    const primo = fetteDellAnno(registro, 'a1', true)
    const secondo = fetteDellAnno(registro, 'a2', false)

    const doppi = primo.lezioni.filter((l) => secondo.lezioni.some((s) => s.id === l.id))
    assert.deepEqual(doppi, [])
  })

  it('gli sciolti vanno in un anno solo, e non spariscono', () => {
    // Una classe con un anno che non c'è finisce nell'anno di ripiego, non in
    // nessuna cartella.
    const registro = registroDiDueAnni({
      classi: [
        { id: 'c1', annoId: 'a1', nome: 'DIC3a', allievi: [] },
        { id: 'c2', annoId: 'a2', nome: 'DIC4a', allievi: [] },
        { id: 'c9', annoId: 'sparito', nome: 'DIC9z', allievi: [] },
      ],
    })

    const conRipiego = fetteDellAnno(registro, 'a2', true)
    const senza = fetteDellAnno(registro, 'a1', false)

    assert.ok(conRipiego.classi.some((c) => c.id === 'c9'))
    assert.ok(!senza.classi.some((c) => c.id === 'c9'))
  })

  it('un piano senza corso segue l’anno di ripiego', () => {
    const registro = registroDiDueAnni({
      piani: [{ id: 'p1', corsoId: null, titolo: 'Ripasso', attivita: [] }],
    })

    assert.deepEqual(fetteDellAnno(registro, 'a2', true).piani.map((p) => p.id), ['p1'])
    assert.deepEqual(fetteDellAnno(registro, 'a1', false).piani, [])
  })

  it('ogni voce del registro finisce in esattamente una cartella', () => {
    const registro = registroDiDueAnni({
      classi: [
        { id: 'c1', annoId: 'a1', nome: 'DIC3a', allievi: [] },
        { id: 'c2', annoId: 'a2', nome: 'DIC4a', allievi: [] },
        { id: 'c9', annoId: 'sparito', nome: 'DIC9z', allievi: [] },
      ],
      piani: [{ id: 'p1', corsoId: null, titolo: 'Ripasso', attivita: [] }],
    })

    // 'a2' è l'anno in uso e raccoglie gli sciolti: le due fette fanno il registro
    // intero, senza doppioni né buchi.
    const fette = [fetteDellAnno(registro, 'a1', false), fetteDellAnno(registro, 'a2', true)]

    for (const collezione of ['classi', 'corsi', 'lezioni', 'piani', 'valutazioni', 'consegne', 'fascicoli']) {
      const divisi = fette.flatMap((f) => f[collezione])
      const chiavi = divisi.map((v) => v.id ?? v.classeId)
      assert.equal(
        chiavi.length,
        new Set(chiavi).size,
        `${collezione}: la stessa voce finisce in due anni`,
      )
      assert.equal(divisi.length, registro[collezione].length, `${collezione}: qualcosa si è perso`)
    }
  })
})

// --------------------------------------------------------- le settimane A e B

describe('le settimane A e B', () => {
  const anno = {
    id: 'a1',
    etichetta: '2026/27',
    inizio: '2026-08-31',
    fine: '2027-06-30',
    semestri: semestri('2026-08-31', '2027-01-31', '2027-02-01', '2027-06-30'),
    sospensioni: [],
  }

  it('la lettera si mette sulla settimana, non sul giorno', () => {
    // La chiave è il lunedì: da qualunque giorno la si chieda si trova.
    const messa = conLetteraSettimana(anno, '2026-09-02', 'A')

    assert.deepEqual(messa.settimane, { '2026-08-31': 'A' })
    assert.equal(letteraSettimana(messa, '2026-09-04'), 'A', 'anche dal venerdì')
    assert.equal(letteraSettimana(messa, '2026-08-31'), 'A', 'e dal lunedì')
  })

  it('una settimana senza lettera non compare nel file', () => {
    // Assente, non vuota: niente righe di JSON per dire niente.
    const messa = conLetteraSettimana(anno, '2026-09-02', 'A')
    const tolta = conLetteraSettimana(messa, '2026-09-02', null)

    assert.deepEqual(tolta.settimane, {})
    assert.equal(letteraSettimana(tolta, '2026-09-02'), null)
  })

  it('le settimane non marcate non hanno lettera', () => {
    const messa = conLetteraSettimana(anno, '2026-08-31', 'A')

    assert.equal(letteraSettimana(messa, '2026-09-07'), null)
    assert.equal(letteraSettimana(anno, '2026-08-31'), null, 'un anno senza niente')
    assert.equal(letteraSettimana(null, '2026-08-31'), null, 'e nessun anno')
  })

  it('l’anno letto dal file butta le chiavi che non sono date e i tipi vuoti, tiene gli altri', () => {
    const registro = normalizzaRegistro({
      anni: [
        {
          ...anno,
          settimane: {
            '2026-08-31': 'A',
            // Un mercoledì scritto a mano: diventa il lunedì della sua settimana.
            '2026-09-09': 'B',
            'settimana 40': 'A',
            // Un terzo tipo della lista «Tipi di settimana»: resta.
            '2026-10-05': 'C',
            '2026-10-12': '',
            '2026-10-19': 7,
          },
        },
      ],
      annoCorrenteId: 'a1',
    })

    assert.deepEqual(registro.anni[0].settimane, {
      '2026-08-31': 'A',
      '2026-09-07': 'B',
      '2026-10-05': 'C',
    })
  })

  it('le settimane restano in ordine di data', () => {
    // Il file lo si legge a mano: un elenco di date sparse non si scorre.
    let messo = conLetteraSettimana(anno, '2026-10-05', 'B')
    messo = conLetteraSettimana(messo, '2026-08-31', 'A')
    messo = conLetteraSettimana(messo, '2026-09-14', 'A')

    assert.deepEqual(Object.keys(messo.settimane), [
      '2026-08-31',
      '2026-09-14',
      '2026-10-05',
    ])
  })
})
