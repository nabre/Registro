// Le carte intestate del documento: scuola, logo e i corsi che le usano. Stanno
// nel `.regi`, non fra i modelli del programma. Si provano la dogana, il
// vincolo (ogni corso su una carta e una sola) e il modo in cui un modello di
// serie indossa la carta: logo all'altezza scelta, e senza logo nessun buco.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  ALTEZZA_LOGO,
  NOME_LOGO,
  cartaDeiCorsi,
  cartaDelCorso,
  completaCarte,
  conIntestazione,
  logoAmmesso,
  normalizzaImpostazioni,
  normalizzaIntestazione,
  registroVuoto,
  spostaCorsi,
  togliCarta,
} from '../../dist-tests/domain.mjs'

const carta = (id, corsi = [], altro = {}) => ({ id, sede: '', altezzaLogo: 14, corsi, ...altro })

describe('normalizzaIntestazione', () => {
  it('un documento scritto prima dell’intestazione ne riceve una carta vuota', () => {
    const intestazione = normalizzaIntestazione(undefined)
    assert.equal(intestazione.carte.length, 1)
    assert.equal(intestazione.carte[0].sede, '')
    assert.equal(intestazione.carte[0].altezzaLogo, ALTEZZA_LOGO.predefinita)
    assert.equal(intestazione.docente, '')
  })

  it('la carta unica di prima diventa la prima carta, logo compreso', () => {
    const intestazione = normalizzaIntestazione({
      sede: 'CPT', docente: 'Io', logo: 'intestazione/logo.png', altezzaLogo: 20,
    })
    assert.equal(intestazione.carte.length, 1)
    assert.equal(intestazione.carte[0].sede, 'CPT')
    assert.equal(intestazione.carte[0].logo, 'intestazione/logo.png')
    assert.equal(intestazione.carte[0].altezzaLogo, 20)
    assert.equal(intestazione.docente, 'Io')
  })

  it('un registro nuovo nasce con una carta, e non condivisa fra due registri', () => {
    const uno = registroVuoto()
    const due = registroVuoto()
    assert.equal(uno.impostazioni.intestazione.carte.length, 1)
    uno.impostazioni.intestazione.carte[0].sede = 'CPT Trevano'
    assert.equal(due.impostazioni.intestazione.carte[0].sede, '')
  })

  it('stringe gli spazi e taglia le righe troppo lunghe', () => {
    const intestazione = normalizzaIntestazione({
      docente: 'x'.repeat(500),
      carte: [{ id: 'a', sede: '  CPT   Trevano \n', corsi: [] }],
    })
    assert.equal(intestazione.carte[0].sede, 'CPT Trevano')
    assert.equal(intestazione.docente.length, 200)
  })

  it('riporta l’altezza del logo dentro gli estremi', () => {
    const alta = (altezzaLogo) => normalizzaIntestazione({ carte: [{ id: 'a', altezzaLogo }] }).carte[0].altezzaLogo
    assert.equal(alta(1), ALTEZZA_LOGO.minimo)
    assert.equal(alta(999), ALTEZZA_LOGO.massimo)
    assert.equal(alta('x'), ALTEZZA_LOGO.predefinita)
  })

  it('tiene il logo solo dentro intestazione/, e solo PNG o JPEG', () => {
    const logo = (logo) => normalizzaIntestazione({ carte: [{ id: 'a', logo }] }).carte[0].logo
    assert.equal(logo('intestazione/a.png'), 'intestazione/a.png')
    assert.equal(logo('../fuori/logo.png'), undefined)
    assert.equal(logo('intestazione/logo.gif'), undefined)
    assert.equal(logo('altrove/logo.png'), undefined)
  })

  it('un id che non è fatto di lettere, cifre e trattini ne riceve uno nuovo', () => {
    const intestazione = normalizzaIntestazione({ carte: [{ id: 'buona' }, { id: '../../fuori' }] })
    assert.equal(intestazione.carte[0].id, 'buona')
    assert.match(intestazione.carte[1].id, /^[A-Za-z0-9_-]+$/)
  })

  it('la carta che prende un id nuovo per collisione non si porta dietro il logo', () => {
    const intestazione = normalizzaIntestazione({
      carte: [{ id: 'a', logo: 'intestazione/a.png' }, { id: 'a', logo: 'intestazione/a.png' }],
    })
    assert.equal(intestazione.carte[0].logo, 'intestazione/a.png')
    assert.equal(intestazione.carte[1].logo, undefined)
  })

  it('due carte con lo stesso id si separano', () => {
    const intestazione = normalizzaIntestazione({ carte: [{ id: 'a' }, { id: 'a' }] })
    assert.notEqual(intestazione.carte[0].id, intestazione.carte[1].id)
  })

  it('tiene la firma com’è scritta, e il segno della vecchia cartella solo se vero', () => {
    const intestazione = normalizzaIntestazione({ firma: '<b>Io</b>', vecchiaCartellaVista: true })
    assert.equal(intestazione.firma, '<b>Io</b>')
    assert.equal(intestazione.vecchiaCartellaVista, true)
    assert.equal(normalizzaIntestazione({ firma: '   ' }).firma, undefined)
    assert.equal(normalizzaIntestazione({ vecchiaCartellaVista: 'sì' }).vecchiaCartellaVista, undefined)
  })

  it('arriva con le impostazioni del documento', () => {
    const impostazioni = normalizzaImpostazioni({ intestazione: { carte: [{ id: 'a', sede: 'SPAI' }] } })
    assert.equal(impostazioni.intestazione.carte[0].sede, 'SPAI')
  })
})

describe('ogni corso su una carta sola', () => {
  it('i corsi che nessuno nomina vanno sulla prima carta', () => {
    const carte = completaCarte([carta('a', ['c1']), carta('b')], ['c1', 'c2', 'c3'])
    assert.deepEqual(carte[0].corsi, ['c1', 'c2', 'c3'])
    assert.deepEqual(carte[1].corsi, [])
  })

  it('un corso nominato due volte resta dove l’ha messo la prima carta', () => {
    const carte = completaCarte([carta('a', ['c1']), carta('b', ['c1', 'c2'])], ['c1', 'c2'])
    assert.deepEqual(carte[0].corsi, ['c1'])
    assert.deepEqual(carte[1].corsi, ['c2'])
  })

  it('un corso che non esiste più se ne va', () => {
    const carte = completaCarte([carta('a', ['c1', 'via'])], ['c1'])
    assert.deepEqual(carte[0].corsi, ['c1'])
  })

  it('senza carte ne nasce una, con tutti i corsi', () => {
    const carte = completaCarte([], ['c1'])
    assert.equal(carte.length, 1)
    assert.deepEqual(carte[0].corsi, ['c1'])
  })

  it('spostare dei corsi li toglie da dove stavano', () => {
    const carte = spostaCorsi([carta('a', ['c1', 'c2']), carta('b', ['c3'])], ['c1', 'c3'], 'b')
    assert.deepEqual(carte[0].corsi, ['c2'])
    assert.deepEqual(carte[1].corsi, ['c1', 'c3'])
  })

  it('spostare su una carta che non c’è non cambia niente', () => {
    const prima = [carta('a', ['c1'])]
    assert.deepEqual(spostaCorsi(prima, ['c1'], 'nessuna'), prima)
  })

  it('togliere una carta porta i suoi corsi sulla prima che resta, e l’ultima non si toglie', () => {
    const carte = togliCarta([carta('a', ['c1']), carta('b', ['c2'])], 'a')
    assert.deepEqual(carte.map((c) => c.id), ['b'])
    assert.deepEqual(carte[0].corsi, ['c2', 'c1'])
    assert.equal(togliCarta(carte, 'b').length, 1)
  })
})

describe('quale carta va su un foglio', () => {
  const intestazione = { docente: '', carte: [carta('a', ['c1', 'c2']), carta('b', ['c3', 'c4'])] }

  it('il foglio di un corso usa la sua carta', () => {
    assert.equal(cartaDelCorso(intestazione, 'c3').id, 'b')
  })

  it('un corso sconosciuto, o nessun corso, usa la prima', () => {
    assert.equal(cartaDelCorso(intestazione, 'ignoto').id, 'a')
    assert.equal(cartaDelCorso(intestazione, null).id, 'a')
  })

  it('un foglio di classe usa la carta comune ai suoi corsi, o la prima se sono diverse', () => {
    assert.equal(cartaDeiCorsi(intestazione, ['c3', 'c4']).id, 'b')
    assert.equal(cartaDeiCorsi(intestazione, ['c1', 'c3']).id, 'a')
  })
})

describe('logoAmmesso', () => {
  it('ammette un nome con spazi e parentesi, come quelli che dà il deposito', () => {
    assert.equal(logoAmmesso('intestazione/car-prima (2).jpg'), true)
  })

  it('rifiuta barre rovesciate e risalite', () => {
    assert.equal(logoAmmesso('intestazione/..\\logo.png'), false)
    assert.equal(logoAmmesso('intestazione/../logo.png'), false)
    assert.equal(logoAmmesso('intestazione/a/logo.png'), false)
  })
})

describe('conIntestazione', () => {
  const modello = {
    intestazioneImmagini: [
      { file: NOME_LOGO, altezza: 14, allineamento: 'destra' },
      { file: 'altro/ritratto.jpg', altezza: 20, allineamento: 'sinistra' },
    ],
    piedeImmagini: [],
  }

  it('dà al logo l’altezza scelta sulla carta', () => {
    const fatto = conIntestazione(modello, { logo: 'intestazione/a.png', altezzaLogo: 22 })
    assert.equal(fatto.intestazioneImmagini[0].altezza, 22)
    assert.equal(fatto.intestazioneImmagini[1].altezza, 20)
  })

  it('senza logo toglie la sua riga, e lascia le altre immagini', () => {
    const fatto = conIntestazione(modello, { altezzaLogo: 14 })
    assert.deepEqual(fatto.intestazioneImmagini.map((i) => i.file), ['altro/ritratto.jpg'])
  })
})
