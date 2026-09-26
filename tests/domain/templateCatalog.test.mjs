// Il catalogo dei modelli e la cartella `templates/` dicono gli stessi nomi: un
// modello solo in cartella comparirebbe senza titolo né anteprima, uno solo nel
// catalogo aprirebbe il nulla.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  CATALOGO_MODELLI,
  fileDelModello,
  fileDiTesto,
  genereDiProva,
  nomeFileAmmesso,
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

  it('il nome del file porta l’estensione dei modelli, e la firma resta com’è', () => {
    assert.equal(fileDelModello('_base'), '_base.tpl')
    assert.equal(fileDelModello('verbale-lezione'), 'verbale-lezione.tpl')
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
