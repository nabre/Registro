// Le liste di sistema: le voci dei menu a tendina, tenute nel documento.
//
// Quel che si prova qui è la parte che non si vede e che fa il danno se sbaglia:
// che una lista chiusa non accolga valori inventati — sarebbero voci che si
// possono scegliere e che non fanno niente — che nessuna lista possa restare
// vuota, e soprattutto che togliere una voce non cambi di nascosto quel che
// l'aveva già scelta.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  CHIAVI_LISTA,
  IMPOSTAZIONI_PREDEFINITE,
  definizioneLista,
  listaCambiata,
  normalizzaImpostazioni,
  normalizzaListe,
  testoDiVoce,
  vociConValore,
  vociDiLista,
} from '../../dist-tests/domain.mjs'

/** Impostazioni come le altre, con dentro una sola lista riscritta. */
function con (chiave, voci) {
  return { ...IMPOSTAZIONI_PREDEFINITE, liste: { [chiave]: voci } }
}

describe('le liste di sistema', () => {
  it('senza niente di scritto valgono le voci di fabbrica', () => {
    for (const chiave of CHIAVI_LISTA) {
      const voci = vociDiLista(null, chiave)
      assert.deepEqual(voci, definizioneLista(chiave).predefinite)
      assert.ok(voci.length > 0, `la lista ${chiave} nasce vuota`)
      assert.equal(listaCambiata(null, chiave), false)
    }
  })

  it('una voce rinominata si legge con la parola nuova', () => {
    const impostazioni = con('supporto', [{ valore: 'lavagna', testo: 'Alla lavagna' }])
    assert.equal(testoDiVoce(impostazioni, 'supporto', 'lavagna'), 'Alla lavagna')
    assert.ok(listaCambiata(impostazioni, 'supporto'))
    // Il valore non è cambiato: è quel che sta scritto nei piani già preparati.
    assert.equal(vociDiLista(impostazioni, 'supporto')[0].valore, 'lavagna')
  })

  it('una voce tolta resta offerta a chi l’aveva già scelta', () => {
    const impostazioni = con('supporto', [{ valore: 'lavagna', testo: 'Lavagna' }])
    const voci = vociConValore(impostazioni, 'supporto', 'proiezione')
    assert.equal(voci.length, 2)
    // In coda, e dichiarata: la tendina non la nasconde e non la cambia.
    assert.equal(voci[1].valore, 'proiezione')
    assert.match(voci[1].testo, /tolta/)

    // Chi non ha scelto niente non si porta dietro nessuna coda.
    assert.deepEqual(vociConValore(impostazioni, 'supporto', null), [
      { valore: 'lavagna', testo: 'Lavagna' },
    ])
  })

  it('una lista chiusa non accoglie valori inventati', () => {
    const scritte = normalizzaListe({
      tipoAttivita: [
        { valore: 'spiegazione', testo: 'Teoria' },
        { valore: 'tornitura', testo: 'Al tornio' },
      ],
    })
    assert.deepEqual(scritte.tipoAttivita, [{ valore: 'spiegazione', testo: 'Teoria' }])
  })

  it('una lista aperta accoglie voci nuove, e non due volte la stessa', () => {
    const scritte = normalizzaListe({
      supporto: [
        { valore: 'tornio', testo: 'Al tornio' },
        { valore: 'tornio', testo: 'Ancora al tornio' },
        { valore: '   ', testo: 'senza valore' },
        'non è nemmeno un oggetto',
      ],
    })
    assert.deepEqual(scritte.supporto, [{ valore: 'tornio', testo: 'Al tornio' }])
  })

  it('senza la parola che si legge vale il valore', () => {
    const scritte = normalizzaListe({ supporto: [{ valore: 'tornio' }] })
    assert.deepEqual(scritte.supporto, [{ valore: 'tornio', testo: 'tornio' }])
  })

  it('una lista che resterebbe vuota torna alle voci di fabbrica', () => {
    // Nessuna voce ammessa: la chiave sparisce, e la tendina riprende le sue.
    const scritte = normalizzaListe({ raggruppamento: [{ valore: 'in-cortile', testo: 'Fuori' }] })
    assert.equal(scritte.raggruppamento, undefined)
    assert.deepEqual(
      vociDiLista({ ...IMPOSTAZIONI_PREDEFINITE, liste: scritte }, 'raggruppamento'),
      definizioneLista('raggruppamento').predefinite,
    )
  })

  it('quel che non è una lista riconosciuta non si salva', () => {
    assert.deepEqual(normalizzaListe({ colori: [{ valore: 'rosso', testo: 'Rosso' }] }), {})
    assert.deepEqual(normalizzaListe(null), {})
    assert.deepEqual(normalizzaListe([1, 2, 3]), {})
  })

  it('le impostazioni riportano le liste dal file', () => {
    const impostazioni = normalizzaImpostazioni({
      liste: { supporto: [{ valore: 'tornio', testo: 'Al tornio' }] },
    })
    assert.deepEqual(impostazioni.liste.supporto, [{ valore: 'tornio', testo: 'Al tornio' }])
    // Un file vecchio, senza liste, non resta con le tendine vuote.
    assert.deepEqual(normalizzaImpostazioni({}).liste, {})
    assert.ok(vociDiLista(normalizzaImpostazioni({}), 'tipoAttivita').length > 0)
  })
})
