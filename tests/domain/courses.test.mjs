// Come si chiamano le cose di un corso: la sigla di una materia, il numero di
// un'ora, il nome di un piano. Sbagliarle fa leggere due ore diverse come la
// stessa.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  creaAttivita,
  creaMateria,
  creaPiano,
  nomeDelPiano,
  numeriDelleLezioni,
  numeroDellaLezione,
  lezioneDelPianoNelRegistro,
  siglaMateria,
  coloreDelCorso,
} from '../../dist-tests/domain.mjs'
import { ore, scuolaMinima } from '../helpers/register.mjs'

describe('la sigla di una materia', () => {
  it('è quella scritta, quando c’è', () => {
    assert.equal(siglaMateria(creaMateria('Calcolo professionale', 'CP')), 'CP')
  })

  it('si ricava dalle iniziali quando le parole sono più d’una', () => {
    assert.equal(siglaMateria(creaMateria('Calcolo professionale')), 'CP')
    assert.equal(siglaMateria(creaMateria('Disegno tecnico assistito')), 'DTA')
  })

  it('da una parola sola prende le prime tre lettere', () => {
    assert.equal(siglaMateria(creaMateria('Matematica')), 'MAT')
    assert.equal(siglaMateria(creaMateria('Italiano')), 'ITA')
  })

  it('senza materia non inventa niente', () => {
    assert.equal(siglaMateria(null), '')
    assert.equal(siglaMateria(creaMateria('')), '')
  })
})

describe('il numero di un’ora', () => {
  it('conta dall’inizio del semestre, non dall’inizio dell’anno', () => {
    const { registro, corso, anno } = scuolaMinima()
    const primoSemestre = ore(registro, corso, ['2026-09-07', '2026-09-14', '2026-09-21'])
    // Il secondo semestre comincia dove lo dice l'anno: si prende una data che ci
    // cade dentro.
    const secondo = anno.semestri[1]
    const dopo = ore(registro, corso, [secondo.inizio])

    assert.deepEqual(
      primoSemestre.map((l) => numeroDellaLezione(registro, l)),
      [1, 2, 3],
    )
    assert.equal(
      numeroDellaLezione(registro, dopo[0]),
      1,
      'la prima del secondo semestre è la prima, non la quarta',
    )
  })

  it('in blocco dà gli stessi numeri, anche nel secondo semestre', () => {
    // La tendina (in blocco) e il calendario (una per volta) danno lo stesso
    // numero.
    const { registro, corso, anno } = scuolaMinima()
    const prima = ore(registro, corso, ['2026-09-07', '2026-09-14', '2026-09-21'])
    const dopo = ore(registro, corso, [anno.semestri[1].inizio])
    prima[1].stato = 'annullata'
    const tutte = [...dopo, ...prima]
    const numeri = numeriDelleLezioni(registro, tutte)
    for (const lezione of tutte) {
      assert.equal(numeri.get(lezione.id), numeroDellaLezione(registro, lezione), lezione.data)
    }
    assert.equal(numeri.get(dopo[0].id), 1)
  })

  it('fuori dall’anno conta solo le ore fuori semestre, in blocco e da sola', () => {
    // Un'ora fuori dai semestri si conta fra le sole ore fuori semestre.
    const { registro, corso, anno } = scuolaMinima()
    const [primo, secondo] = anno.semestri
    const tutte = ore(registro, corso, [
      primo.inizio,
      primo.fine,
      secondo.inizio,
      secondo.fine,
      '2027-08-01',
    ])
    const fuori = tutte[4]
    const numeri = numeriDelleLezioni(registro, tutte)

    assert.equal(numeroDellaLezione(registro, fuori), 1)
    for (const lezione of tutte) {
      assert.equal(numeri.get(lezione.id), numeroDellaLezione(registro, lezione), lezione.data)
    }
  })

  it('le annullate non si contano e non hanno un numero', () => {
    const { registro, corso } = scuolaMinima()
    const [prima, persa, terza] = ore(registro, corso, [
      '2026-09-07',
      '2026-09-14',
      '2026-09-21',
    ])
    persa.stato = 'annullata'

    assert.equal(numeroDellaLezione(registro, prima), 1)
    assert.equal(numeroDellaLezione(registro, persa), null, 'un’ora che non si è tenuta non è un’ora')
    assert.equal(numeroDellaLezione(registro, terza), 2, 'e non lascia un buco nel conto')
  })
})

describe('il nome di un piano', () => {
  it('è il corso e il numero dell’ora a cui è appeso', () => {
    const { registro, corso } = scuolaMinima()
    const lezioni = ore(registro, corso, ['2026-09-07', '2026-09-14', '2026-09-21'])
    const piano = creaPiano(corso.id)
    registro.piani.push(piano)
    lezioni[2].pianoId = piano.id

    assert.equal(nomeDelPiano(registro, piano), 'Matematica — I MEC A · 3ª lezione')
  })

  it('usato su più ore, si nomina dalla prima e dice quante altre', () => {
    const { registro, corso } = scuolaMinima()
    const lezioni = ore(registro, corso, ['2026-09-07', '2026-09-14'])
    const piano = creaPiano(corso.id)
    registro.piani.push(piano)
    for (const lezione of lezioni) lezione.pianoId = piano.id

    assert.equal(nomeDelPiano(registro, piano), 'Matematica — I MEC A · 1ª lezione +1')
  })

  it('appeso a nessun’ora è una bozza, e si nomina dal giorno in cui è nata', () => {
    const { registro, corso } = scuolaMinima()
    const piano = creaPiano(corso.id)
    piano.creatoIl = '2026-09-12T10:30:00.000Z'
    registro.piani.push(piano)

    assert.equal(nomeDelPiano(registro, piano), 'Matematica — I MEC A · bozza del 12.09.2026')
  })

  it('non si chiama mai con l’argomento: quello cambia mentre si prepara', () => {
    const { registro, corso } = scuolaMinima()
    const piano = creaPiano(corso.id)
    piano.creatoIl = '2026-09-12T10:30:00.000Z'
    piano.obiettivi.push('Ripasso delle proporzioni')
    piano.attivita.push(creaAttivita('Esercizi guidati', 1))
    registro.piani.push(piano)

    const nome = nomeDelPiano(registro, piano)
    assert.doesNotMatch(nome, /Ripasso/)
    assert.doesNotMatch(nome, /attività/, 'nemmeno «3 attività»: è un conto, non un nome')
    assert.equal(nome, 'Matematica — I MEC A · bozza del 12.09.2026')
  })

  it('dentro una pagina di corso il corso non si ripete: resta l’ora', () => {
    const { registro, corso } = scuolaMinima()
    const lezioni = ore(registro, corso, ['2026-09-07', '2026-09-14'])
    const appeso = creaPiano(corso.id)
    const bozza = creaPiano(corso.id)
    bozza.creatoIl = '2026-09-12T10:30:00.000Z'
    registro.piani.push(appeso, bozza)
    lezioni[1].pianoId = appeso.id

    assert.equal(lezioneDelPianoNelRegistro(registro, appeso), '2ª lezione')
    assert.equal(lezioneDelPianoNelRegistro(registro, bozza), 'bozza del 12.09.2026')
  })

  it('appeso a un’ora annullata torna alla data: un numero non ce l’ha', () => {
    const { registro, corso } = scuolaMinima()
    const [lezione] = ore(registro, corso, ['2026-09-07'])
    lezione.stato = 'annullata'
    const piano = creaPiano(corso.id)
    registro.piani.push(piano)
    lezione.pianoId = piano.id

    assert.equal(nomeDelPiano(registro, piano), 'Matematica — I MEC A · 07.09.2026')
  })
})

describe('coloreDelCorso', () => {
  it('senza un colore suo, la media fra classe e materia', () => {
    assert.equal(coloreDelCorso({}, { colore: '#ff0000' }, { colore: '#0000ff' }), '#800080')
  })

  it('una materia senza colore lascia quello della classe', () => {
    assert.equal(coloreDelCorso({}, { colore: '#123456' }, { colore: '' }), '#123456')
    assert.equal(coloreDelCorso({}, { colore: '#123456' }, null), '#123456')
  })

  it('il colore scelto per il corso vince', () => {
    assert.equal(coloreDelCorso({ colore: '#00aa00' }, { colore: '#ff0000' }, { colore: '#0000ff' }), '#00aa00')
  })

  it('un colore scritto male non conta', () => {
    assert.equal(coloreDelCorso({ colore: 'rosso' }, { colore: '#ff0000' }, { colore: 'blu' }), '#ff0000')
    assert.equal(coloreDelCorso({}, null, null), '#888888')
  })
})
