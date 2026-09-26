// Le liste di sistema, le voci dei menu a tendina tenute nel documento: una
// lista chiusa non accoglie valori inventati, nessuna lista resta vuota, e
// togliere una voce non cambia di nascosto quel che l'aveva scelta.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  CHIAVI_LISTA,
  COLORE_DI_RIPIEGO,
  coloreDiVoce,
  listaConColore,
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

describe('il colore delle voci', () => {
  it('solo i tipi di attività portano un colore, e ognuno di fabbrica ne ha uno', () => {
    for (const chiave of CHIAVI_LISTA) {
      assert.equal(listaConColore(chiave), chiave === 'tipoAttivita', chiave)
    }
    for (const voce of definizioneLista('tipoAttivita').predefinite) {
      assert.match(voce.colore, /^#[0-9a-f]{6}$/, voce.valore)
    }
  })

  it('normalizzaListe tiene un colore valido e scarta quel che non lo è', () => {
    const scritte = normalizzaListe({
      tipoAttivita: [
        { valore: 'esercizio', testo: 'Esercizio', colore: '#ABCDEF' },
        { valore: 'laboratorio', testo: 'Laboratorio', colore: 'rosso' },
        { valore: 'verifica', testo: 'Verifica', colore: 12 },
      ],
      // Una lista che il colore non lo dichiara non se lo tiene.
      supporto: [{ valore: 'lavagna', testo: 'Lavagna', colore: '#123456' }],
    })
    assert.deepEqual(scritte.tipoAttivita, [
      { valore: 'esercizio', testo: 'Esercizio', colore: '#abcdef' },
      { valore: 'laboratorio', testo: 'Laboratorio' },
      { valore: 'verifica', testo: 'Verifica' },
    ])
    assert.deepEqual(scritte.supporto, [{ valore: 'lavagna', testo: 'Lavagna' }])
  })

  it('una lista salvata senza colori ricade su quelli di fabbrica, per valore', () => {
    // Rinominata e riordinata, senza colori salvati: ogni voce ritrova il suo, non
    // quello della posizione.
    const impostazioni = con('tipoAttivita', [
      { valore: 'laboratorio', testo: 'In officina' },
      { valore: 'esercizio', testo: 'Esercizio' },
    ])
    const predefinita = (valore) =>
      definizioneLista('tipoAttivita').predefinite.find((voce) => voce.valore === valore).colore
    assert.equal(coloreDiVoce(impostazioni, 'tipoAttivita', 'laboratorio'), predefinita('laboratorio'))
    assert.equal(coloreDiVoce(impostazioni, 'tipoAttivita', 'esercizio'), predefinita('esercizio'))
    // Tolto dalla lista, il valore ha ancora il colore di fabbrica.
    assert.equal(coloreDiVoce(impostazioni, 'tipoAttivita', 'verifica'), predefinita('verifica'))
    // Il colore assente non fa di una lista una lista cambiata.
    const senzaColori = definizioneLista('tipoAttivita').predefinite.map(({ valore, testo }) => ({
      valore,
      testo,
    }))
    assert.equal(listaCambiata(con('tipoAttivita', senzaColori), 'tipoAttivita'), false)
  })

  it('un colore scritto vince su quello di fabbrica, e cambia la lista', () => {
    const voci = vociDiLista(null, 'tipoAttivita').map((voce) =>
      voce.valore === 'esercizio' ? { ...voce, colore: '#123456' } : voce,
    )
    const impostazioni = con('tipoAttivita', voci)
    assert.equal(coloreDiVoce(impostazioni, 'tipoAttivita', 'esercizio'), '#123456')
    assert.ok(listaCambiata(impostazioni, 'tipoAttivita'))
  })

  it('un valore sconosciuto, o una lista senza colori, prende il grigio di ripiego', () => {
    assert.equal(coloreDiVoce(null, 'tipoAttivita', 'inventato'), COLORE_DI_RIPIEGO)
    assert.equal(coloreDiVoce(null, 'supporto', 'lavagna'), COLORE_DI_RIPIEGO)
  })
})
