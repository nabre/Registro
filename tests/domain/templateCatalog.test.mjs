// Il catalogo dei modelli e la cartella `templates/` dicono gli stessi nomi.
//
// È l'unica cosa, qui, che può rompersi in silenzio: un modello aggiunto alla
// cartella e non al catalogo compare in fondo all'elenco della pagina senza
// titolo, senza riga di spiegazione e senza anteprima — cioè come un file che
// nessuno ha messo lì apposta. E un modello tolto dalla cartella lascerebbe nel
// catalogo una voce che apre il nulla.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  CATALOGO_MODELLI,
  fileDelModello,
  fileDiTesto,
  genereDiProva,
  modelloDelFile,
  impronta,
  nomeFileAmmesso,
  sorteModello,
  titoloModello,
  voceModello,
} from '../../dist-tests/domain.mjs'

import { leggiModelli } from '../../tools/templates.mjs'

describe('il catalogo dei modelli', () => {
  const nellaCartella = leggiModelli().map(({ nome }) => nome)

  it('nomina tutti i file di templates/, e nessuno che non ci sia', () => {
    const nelCatalogo = CATALOGO_MODELLI.map((voce) => voce.nome)
    assert.deepEqual([...nelCatalogo].sort(), [...nellaCartella].sort())
  })

  it('dà a ognuno un titolo e una riga che dice che cosa cambia', () => {
    for (const voce of CATALOGO_MODELLI) {
      assert.ok(voce.titolo.length > 0, `${voce.nome} senza titolo`)
      assert.ok(voce.aiuto.length > 10, `${voce.nome} senza spiegazione`)
      assert.notEqual(voce.titolo, voce.nome, `${voce.nome} si spiega da solo?`)
    }
  })

  it('dà un rapporto d’anteprima a ogni modello che disegna un foglio', () => {
    for (const voce of CATALOGO_MODELLI) {
      if (voce.ruolo === 'posta' || voce.ruolo === 'immagine') {
        assert.equal(voce.genere, null, `${voce.nome} non è un rapporto`)
        continue
      }
      assert.ok(voce.genere, `${voce.nome} non dice su che cosa guardarlo`)
      assert.equal(genereDiProva(voce.nome), voce.genere)
    }
  })

  it('i rapporti coprono tutti i generi che il registro stampa', () => {
    const generi = CATALOGO_MODELLI.filter((voce) => voce.ruolo === 'rapporto').map((v) => v.genere)
    assert.deepEqual([...generi].sort(), [
      'allievo',
      'fascicolo',
      'foto-classe',
      'lezione',
      'momento',
      'piano',
      'presenze',
      'valutazioni',
    ])
  })

  it('il nome del file e il nome del modello sono l’uno l’inverso dell’altro', () => {
    for (const voce of CATALOGO_MODELLI) {
      assert.equal(modelloDelFile(fileDelModello(voce.nome)), voce.nome)
    }
    assert.equal(fileDelModello('_base'), '_base.tpl')
    assert.equal(fileDelModello('_firma.html'), '_firma.html')
  })

  it('un file che non è dei nostri resta sé stesso e non sparisce', () => {
    assert.equal(voceModello('pagella-mia'), null)
    assert.equal(titoloModello('pagella-mia'), 'pagella-mia')
    assert.equal(genereDiProva('pagella-mia'), null)
  })

  it('ammette solo nomi di file semplici: niente percorsi, niente estensioni strane', () => {
    assert.ok(nomeFileAmmesso('_base.tpl'))
    assert.ok(nomeFileAmmesso('logo.jpg'))
    assert.ok(nomeFileAmmesso('logo sede.png'))
    assert.ok(!nomeFileAmmesso('../fuori.tpl'))
    assert.ok(!nomeFileAmmesso('sotto/altro.tpl'))
    assert.ok(!nomeFileAmmesso('appunti.txt'))
    assert.ok(!nomeFileAmmesso('.tpl'))
  })

  it('distingue i file da modificare dalle immagini', () => {
    assert.ok(fileDiTesto('_base.tpl'))
    assert.ok(fileDiTesto('_firma.html'))
    assert.ok(!fileDiTesto('logo.jpg'))
  })
})

describe('che cosa fare di un modello che sta gia nella cartella', () => {
  const diSerie = 'sezione: Presenze\ntabella: presenze\n'
  const vecchiaDiSerie = 'sezione: Presenze\n'
  const segno = (testo) => impronta(testo)

  it('quel che manca si scrive', () => {
    assert.equal(sorteModello({ suDisco: null, diSerie, impronta }), 'manca')
  })

  it('quel che il registro aveva scritto, e nessuno ha toccato, si aggiorna', () => {
    // È il caso per cui questa regola esiste: la cartella si riempiva al primo
    // avvio e da lì in poi non si toccava più, e una sezione nuova non
    // arrivava mai a chi il registro lo usava da più tempo.
    assert.equal(
      sorteModello({
        suDisco: vecchiaDiSerie,
        diSerie,
        scritto: segno(vecchiaDiSerie),
        base: segno(vecchiaDiSerie),
        impronta,
      }),
      'aggiorna',
    )
  })

  it('quel che qualcuno ha modificato non si tocca', () => {
    const suo = 'sezione: Le mie presenze\ntabella: presenze\n'
    assert.equal(
      sorteModello({
        suDisco: suo,
        diSerie,
        scritto: segno(diSerie),
        base: segno(diSerie),
        impronta,
      }),
      'tuo',
    )
  })

  it('modificato, e di serie cambiata nel frattempo: si dice, e basta', () => {
    // Non si riscrive — il lavoro di chi l'ha modificato resta — ma la pagina
    // Modelli lo segna: è la sola cosa che il registro sa e lui no.
    const suo = 'sezione: Le mie presenze\n'
    assert.equal(
      sorteModello({
        suDisco: suo,
        diSerie,
        scritto: segno(vecchiaDiSerie),
        base: segno(vecchiaDiSerie),
        impronta,
      }),
      'arretrato',
    )
  })

  it('senza memoria non si muove niente', () => {
    // Chi aveva la cartella prima che le impronte esistessero: i suoi file
    // restano intatti, e non si dice «arretrato» di un file che potrebbe non
    // esserlo.
    const suo = 'sezione: Le mie presenze\n'
    assert.equal(sorteModello({ suDisco: suo, diSerie, impronta }), 'tuo')
  })

  it('identico alla copia di serie: niente da fare', () => {
    assert.equal(sorteModello({ suDisco: diSerie, diSerie, impronta }), 'uguale')
  })
})
