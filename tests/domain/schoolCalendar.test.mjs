// Il calendario scolastico ufficiale e il confronto con l'anno del registro: il
// file generato nel pacchetto dice quel che dice il JSON d'origine, ogni voce
// (inizio, fine, chiusure) si riconosce nell'anno anche scritta a mano o con
// date diverse, e importare tocca solo quel che si è scelto.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import {
  anniDaProporre,
  annoUfficiale,
  applicaVoci,
  bozzaDaAnnoUfficiale,
  chiusureUfficiali,
  periodiImportabili,
  vociDaImportare,
  vociUfficiali,
} from '../../dist-tests/domain.mjs'
import { componiFile, fondi, FILE_GENERATO, FILE_JSON } from '../../tools/schoolCalendar.mjs'

const CALENDARIO = JSON.parse(readFileSync(FILE_JSON, 'utf8'))

/** Un anno 2026/2027 come lo propone il registro, senza pause. */
const bozza = (sospensioni = []) => ({ inizio: '2026-09-01', fine: '2027-06-30', sospensioni })

const voce = (voci, chiave) => voci.find((v) => v.chiave === chiave)

describe('il calendario che viaggia nel pacchetto', () => {
  it('è in accordo con resources/calendario-scolastico-ticino.json', () => {
    assert.equal(
      readFileSync(FILE_GENERATO, 'utf8').replace(/\r\n/g, '\n'),
      componiFile(),
      'da rifare: npm run calendario -- --solo-genera',
    )
  })

  it('ogni anno ha inizio, fine e chiusure dentro le sue date', () => {
    for (const anno of CALENDARIO.anni) {
      assert.ok(anno.inizioAnno < anno.fineAnno, anno.annoScolastico)
      for (const periodo of anno.periodi) {
        assert.ok(periodo.inizio <= periodo.fine, `${anno.annoScolastico}: ${periodo.nome}`)
      }
    }
  })

  it('riletto, un anno sostituisce il suo e gli altri restano', () => {
    const riletto = { ...CALENDARIO, anni: [{ ...CALENDARIO.anni[0], fineAnno: '2027-06-18' }] }
    const fuso = fondi(CALENDARIO, riletto)
    assert.equal(fuso.anni.length, CALENDARIO.anni.length)
    assert.equal(fuso.anni[0].fineAnno, '2027-06-18')
    assert.deepEqual(fuso.note, CALENDARIO.note)
    // Niente di cambiato, niente data nuova.
    assert.equal(fondi(CALENDARIO, { ...CALENDARIO, estrattoIl: '2099-01-01' }).estrattoIl, CALENDARIO.estrattoIl)
  })
})

describe('l’anno giusto del calendario', () => {
  it('si trova dal primo giorno, anche se non coincide', () => {
    assert.equal(annoUfficiale(CALENDARIO, '2026-09-01').annoScolastico, '2026/2027')
    assert.equal(annoUfficiale(CALENDARIO, '2026-08-20').annoScolastico, '2026/2027')
    assert.equal(annoUfficiale(CALENDARIO, '2040-09-01'), null)
    assert.equal(vociUfficiali(CALENDARIO, { ...bozza(), inizio: '2040-09-01' }), null)
  })

  it('le vacanze estive restano fuori, e un nome ripetuto ha id diversi', () => {
    const anno = annoUfficiale(CALENDARIO, '2027-09-01')
    const periodi = periodiImportabili(CALENDARIO, anno)
    assert.ok(!periodi.some((p) => p.nome === 'Vacanze estive'))
    const giorni = periodi.filter((p) => p.nome === 'Giorno di vacanza').map((p) => p.collegamento)
    assert.deepEqual(giorni, ['sos-ti-2027-2028-giorno-di-vacanza', 'sos-ti-2027-2028-giorno-di-vacanza-2'])
  })
})

describe('un anno nuovo, scelto dal calendario', () => {
  it('si propongono l’anno in corso e i successivi, non i passati', () => {
    const proposti = anniDaProporre(CALENDARIO, '2027-10-01').map((a) => a.annoScolastico)
    assert.deepEqual(proposti, ['2027/2028', '2028/2029', '2029/2030'])
    assert.deepEqual(anniDaProporre(CALENDARIO, '2040-10-01'), [])
  })

  it('le chiusure nascono già collegate, e un anno così è allineato', () => {
    const anno = annoUfficiale(CALENDARIO, '2026-09-01')
    const chiusure = chiusureUfficiali(CALENDARIO, anno)
    assert.ok(chiusure.every((c) => c.id.startsWith('sos-ti-2026-2027-')))
    const nato = { inizio: anno.inizioAnno, fine: anno.fineAnno, sospensioni: chiusure }
    assert.deepEqual(vociDaImportare(vociUfficiali(CALENDARIO, nato).voci), [])
  })
})

describe('le voci, confrontate con l’anno', () => {
  it('un anno vuoto: inizio e fine diversi, ogni chiusura mancante', () => {
    const { voci } = vociUfficiali(CALENDARIO, bozza())
    assert.equal(voce(voci, 'inizio').stato, 'diversa')
    assert.equal(voce(voci, 'inizio').dal, '2026-08-31')
    assert.equal(voce(voci, 'fine').dal, '2027-06-16')
    const pause = voci.filter((v) => v.genere === 'pausa')
    assert.ok(pause.length > 5)
    assert.ok(pause.every((v) => v.stato === 'mancante'))
  })

  it('una pausa scritta a mano con le stesse date è da collegare', () => {
    const scritta = { id: 'sos-a', etichetta: 'Natale', dal: '2026-12-24', al: '2027-01-06' }
    const { voci } = vociUfficiali(CALENDARIO, bozza([scritta]))
    const natale = voce(voci, 'sos-ti-2026-2027-vacanze-di-natale')
    assert.equal(natale.stato, 'da-collegare')
    assert.equal(natale.attuale.etichetta, 'Natale')
  })

  it('lo stesso nome con altre date è diversa', () => {
    const scritta = { id: 'sos-a', etichetta: 'Vacanze di Natale', dal: '2026-12-21', al: '2027-01-06' }
    const { voci } = vociUfficiali(CALENDARIO, bozza([scritta]))
    assert.equal(voce(voci, 'sos-ti-2026-2027-vacanze-di-natale').stato, 'diversa')
  })

  it('importata, torna allineata; e le date cambiate si riconoscono dal collegamento', () => {
    const tutte = vociUfficiali(CALENDARIO, bozza()).voci.map((v) => v.chiave)
    const importato = applicaVoci(CALENDARIO, bozza(), tutte)
    assert.equal(importato.inizio, '2026-08-31')
    assert.equal(importato.fine, '2027-06-16')
    assert.deepEqual(vociDaImportare(vociUfficiali(CALENDARIO, importato).voci), [])

    // Il calendario della versione dopo sposta le vacanze di Natale.
    const corretto = structuredClone(CALENDARIO)
    const natale = corretto.anni[0].periodi.find((p) => p.nome === 'Vacanze di Natale')
    natale.inizio = '2026-12-23'
    const dopo = vociUfficiali(corretto, importato).voci
    assert.deepEqual(vociDaImportare(dopo).map((v) => [v.chiave, v.stato]), [
      ['sos-ti-2026-2027-vacanze-di-natale', 'diversa'],
    ])
    const aggiornato = applicaVoci(corretto, importato, ['sos-ti-2026-2027-vacanze-di-natale'])
    assert.equal(aggiornato.sospensioni.length, importato.sospensioni.length, 'aggiornata, non doppiata')
    assert.equal(aggiornato.sospensioni.find((s) => s.etichetta === 'Vacanze di Natale').dal, '2026-12-23')
  })

  it('si importa solo quel che si sceglie, e il nome dato a mano resta', () => {
    const scritta = { id: 'sos-a', etichetta: 'Natale in sede', dal: '2026-12-24', al: '2027-01-06' }
    const altra = { id: 'sos-b', etichetta: 'Giornata d’istituto', dal: '2026-10-02', al: '2026-10-02' }
    const risultato = applicaVoci(CALENDARIO, bozza([scritta, altra]), [
      'sos-ti-2026-2027-vacanze-di-natale',
      'sos-ti-2026-2027-immacolata',
    ])
    assert.equal(risultato.inizio, '2026-09-01', 'l’inizio non era fra le scelte')
    assert.deepEqual(
      risultato.sospensioni.map((s) => [s.id, s.etichetta]),
      [
        ['sos-b', 'Giornata d’istituto'],
        ['sos-ti-2026-2027-immacolata', 'Immacolata'],
        ['sos-ti-2026-2027-vacanze-di-natale', 'Natale in sede'],
      ],
    )
  })
})

describe('un anno che nasce da un anno del calendario', () => {
  const anno = (etichetta) => CALENDARIO.anni.find((a) => a.annoScolastico === etichetta)

  it('prende date e tutte le chiusure, collegate: non resta niente da importare', () => {
    const nato = bozzaDaAnnoUfficiale(CALENDARIO, anno('2026/2027'), bozza())
    assert.equal(nato.inizio, '2026-08-31')
    assert.equal(nato.fine, '2027-06-16')
    assert.deepEqual(
      nato.sospensioni.map((s) => s.id).sort(),
      chiusureUfficiali(CALENDARIO, anno('2026/2027')).map((s) => s.id).sort(),
    )
    assert.deepEqual(vociDaImportare(vociUfficiali(CALENDARIO, nato).voci), [])
  })

  it('cambiando anno, le chiusure della scelta di prima se ne vanno e quelle a mano restano', () => {
    const mano = { id: 'sos-a', etichetta: 'Gita', dal: '2027-10-05', al: '2027-10-05' }
    const primo = bozzaDaAnnoUfficiale(CALENDARIO, anno('2026/2027'), bozza([mano]))
    const secondo = bozzaDaAnnoUfficiale(CALENDARIO, anno('2027/2028'), primo)
    assert.ok(secondo.sospensioni.some((s) => s.id === 'sos-a'), 'la pausa scritta a mano resta')
    assert.ok(
      secondo.sospensioni.every((s) => s.id === 'sos-a' || s.id.startsWith('sos-ti-2027-2028-')),
      secondo.sospensioni.map((s) => s.id).join(', '),
    )
    assert.equal(secondo.inizio, anno('2027/2028').inizioAnno)
  })
})
