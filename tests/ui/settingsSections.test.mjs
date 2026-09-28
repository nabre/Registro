// Come le impostazioni del programma si dividono nelle sezioni della pagina:
// **ogni impostazione del manifesto finisce in un posto, e in uno solo**. Il
// posto è l'elenco di una sezione o la sua scheda dedicata
// (`CHIAVI_IN_SCHEDA`); una chiave promossa sparisce dall'elenco apposta, e qui
// si conta lo stesso. Nomi e ordine delle sezioni sono liberi: qui non si
// fissano, si provano le regole che li dispongono.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { IMPOSTAZIONI, sospesa } from '../../dist-tests/manifest.mjs'
import {
  CHIAVI_IN_SCHEDA,
  GRUPPI_SEZIONI,
  SEZIONI_DOCUMENTO,
  SEZIONI_PROGRAMMA,
  avanzateDiSezione,
  gruppiDiSezione,
  gruppoDellaSezione,
  nomeVoce,
  sezioneAperta,
  sottoPrefisso,
  vociDiSezione,
  vociMostrateDaSezione,
} from '../../dist-tests/settingsSections.mjs'

/**
 * Le voci come arrivano dal pannello, cioè come le costruisce
 * `vociImpostazioni()`: tutte, nell'ordine del manifesto.
 */
const VOCI = Object.keys(IMPOSTAZIONI)
  .map((chiave) => ({
    chiave,
    tipo: IMPOSTAZIONI[chiave].tipo,
    descrizione: IMPOSTAZIONI[chiave].descrizione,
    formato: IMPOSTAZIONI[chiave].formato ?? null,
    scelte: IMPOSTAZIONI[chiave].scelte ?? null,
    minimo: IMPOSTAZIONI[chiave].minimo ?? null,
    massimo: IMPOSTAZIONI[chiave].massimo ?? null,
    predefinito: IMPOSTAZIONI[chiave].predefinito,
    valore: IMPOSTAZIONI[chiave].predefinito,
    scritta: false,
    dipendeDa: IMPOSTAZIONI[chiave].dipendeDa ?? null,
    sospesa: false,
    avanzata: Boolean(IMPOSTAZIONI[chiave].avanzata),
  }))

/** Le stesse voci, con qualche valore cambiato per chiave. */
const con = (valori) =>
  VOCI.map((voce) =>
    Object.hasOwn(valori, voce.chiave) ? { ...voce, valore: valori[voce.chiave] } : voce,
  )

describe('le sezioni delle impostazioni del programma', () => {
  it('coprono ogni impostazione del manifesto, una volta sola', () => {
    const conteggio = new Map(VOCI.map((voce) => [voce.chiave, 0]))

    for (const sezione of SEZIONI_PROGRAMMA) {
      for (const voce of vociDiSezione(VOCI, sezione)) {
        conteggio.set(voce.chiave, (conteggio.get(voce.chiave) ?? 0) + 1)
      }
      // Quel che la scheda della sezione disegna da sé conta come coperto.
      for (const chiave of CHIAVI_IN_SCHEDA[sezione.id] ?? []) {
        conteggio.set(chiave, (conteggio.get(chiave) ?? 0) + 1)
      }
    }

    const senzaCasa = [...conteggio].filter(([, quante]) => quante === 0).map(([chiave]) => chiave)
    const inDuePosti = [...conteggio].filter(([, quante]) => quante > 1).map(([chiave]) => chiave)

    assert.deepEqual(senzaCasa, [], 'impostazioni che non compaiono in nessuna sezione')
    assert.deepEqual(inDuePosti, [], 'impostazioni che compaiono in due sezioni')
  })

  it('l’elenco e la scheda insieme: è quel che la sezione mostra davvero', () => {
    // La stessa unione conta per «Ripristina (n)»: `posta.invioDiretto`, disegnata
    // dalla scheda Posta, si conta e si ritira.
    const posta = SEZIONI_PROGRAMMA.find((sezione) => sezione.id === 'posta')
    const promossa = CHIAVI_IN_SCHEDA.posta[0]

    assert.equal(
      vociDiSezione(VOCI, posta).some((voce) => voce.chiave === promossa),
      false,
      'l’elenco non la disegna: la disegna la scheda',
    )
    assert.equal(
      vociMostrateDaSezione(VOCI, posta).some((voce) => voce.chiave === promossa),
      true,
      'chi conta e chi ritira la deve vedere: è in pagina come le altre',
    )
  })

  it('quel che una scheda promuove esiste davvero, e sta nella sua sezione', () => {
    // Una chiave promossa scritta male sparirebbe e basta: deve esistere.
    for (const [sezioneId, chiavi] of Object.entries(CHIAVI_IN_SCHEDA)) {
      const sezione = SEZIONI_PROGRAMMA.find((candidata) => candidata.id === sezioneId)
      assert.ok(sezione, `la scheda «${sezioneId}» promuove chiavi di una sezione che non c'è`)
      for (const chiave of chiavi) {
        assert.ok(chiave in IMPOSTAZIONI, `«${chiave}» non è nel manifesto`)
        assert.ok(
          sottoPrefisso(chiave, sezione.prefissi),
          `«${chiave}» è promossa dalla scheda «${sezioneId}» ma non appartiene a quella sezione`,
        )
      }
    }
  })

  it('una sezione sola raccoglie quel che nessuna ha nominato', () => {
    const raccoglie = SEZIONI_PROGRAMMA.filter((sezione) => sezione.raccoglie)
    assert.equal(raccoglie.length, 1, 'una sola sezione può raccogliere: altrimenti le orfane si duplicano')

    // Un'impostazione di un gruppo nuovo compare nella sezione che raccoglie.
    const nuova = {
      chiave: 'registroDocenti.qualcosaDiNuovo.attiva',
      tipo: 'boolean',
      descrizione: 'inventata dalla prova',
      etichetta: 'Attiva',
      formato: null,
      scelte: null,
      minimo: null,
      massimo: null,
      predefinito: false,
      valore: false,
      scritta: false,
      dipendeDa: null,
      sospesa: false,
      avanzata: false,
    }
    const dentro = vociDiSezione([...VOCI, nuova], raccoglie[0]).map((voce) => voce.chiave)
    assert.ok(dentro.includes(nuova.chiave))
  })

  it('un prefisso prende la chiave esatta e quelle puntate sotto, non quelle che le somigliano', () => {
    assert.equal(sottoPrefisso('registroDocenti.posta', ['registroDocenti.posta']), true)
    assert.equal(sottoPrefisso('registroDocenti.posta.mittente', ['registroDocenti.posta']), true)
    // `postaAltro` non è dentro `posta`: il prefisso vale col punto.
    assert.equal(sottoPrefisso('registroDocenti.postaAltro', ['registroDocenti.posta']), false)
  })

  it('il condotto ha una sezione sua, con l’avviso in testa', () => {
    // Gli interruttori del condotto aprono i dati delle persone in formazione ad
    // altri programmi: hanno una sezione loro.
    const condotto = SEZIONI_PROGRAMMA.find((sezione) =>
      sottoPrefisso('registroDocenti.api.condotto', sezione.prefissi),
    )
    assert.ok(condotto, 'il condotto non ha una sezione sua')
    assert.equal(condotto.raccoglie ?? false, false, 'il condotto non può stare negli avanzi')
    assert.ok(condotto.avvertenza, 'la sezione che concede un accesso deve dire che cosa concede')
  })

  it('dentro una sezione le voci restano divise per gruppo, nell’ordine del manifesto', () => {
    for (const sezione of SEZIONI_PROGRAMMA) {
      const gruppi = gruppiDiSezione(VOCI, sezione)
      for (const gruppo of gruppi) {
        assert.ok(gruppo.titolo, `${sezione.id} › ${gruppo.prefisso}: gruppo senza titolo`)
        assert.ok(
          gruppo.voci.every((voce) => sottoPrefisso(voce.chiave, [gruppo.prefisso])),
          `${sezione.id} › ${gruppo.prefisso}: una voce di un altro gruppo`,
        )
      }
      // I gruppi arrivano nell'ordine in cui il manifesto nomina la loro prima voce.
      const posto = (chiave) => VOCI.findIndex((voce) => voce.chiave === chiave)
      const primaVoce = gruppi.map((gruppo) => posto(gruppo.voci[0].chiave))
      assert.deepEqual(primaVoce, [...primaVoce].sort((a, b) => a - b), sezione.id)
    }
  })

  it('le voci avanzate stanno a parte, e con le altre fanno la sezione intera', () => {
    for (const sezione of SEZIONI_PROGRAMMA) {
      const avanzate = avanzateDiSezione(VOCI, sezione).map((voce) => voce.chiave)
      const correnti = gruppiDiSezione(VOCI, sezione).flatMap((gruppo) =>
        gruppo.voci.map((voce) => voce.chiave),
      )
      assert.ok(avanzate.every((chiave) => IMPOSTAZIONI[chiave].avanzata), sezione.id)
      assert.ok(correnti.every((chiave) => !IMPOSTAZIONI[chiave].avanzata), sezione.id)
      // Nessuna chiave in tutte e due: sarebbe la stessa riga due volte.
      assert.deepEqual(avanzate.filter((chiave) => correnti.includes(chiave)), [], sezione.id)
      const tutte = vociDiSezione(VOCI, sezione).length
      assert.equal(avanzate.length + correnti.length, tutte, sezione.id)
    }
  })

  it('il nome di una voce è quello scritto nel manifesto', () => {
    const chiave = 'registroDocenti.promemoria.anticipoMinuti'
    assert.equal(nomeVoce(chiave), IMPOSTAZIONI[chiave].etichetta)
    // Senza etichetta — una chiave che non è un'impostazione — si ricava a parole.
    assert.equal(nomeVoce('registroDocenti.qualcosaDiNuovo'), 'Qualcosa di nuovo')
  })
})

// Le concessioni del condotto: l'interruttore generale e, sotto, che cosa si
// lascia fare. Si prova la regola: chi è sospeso, e quando.
describe('le voci che dipendono da un’altra', () => {
  const CONDOTTO = 'registroDocenti.api.condotto'
  const LETTURA = 'registroDocenti.api.lettura'
  const SCRITTURA = 'registroDocenti.api.scrittura'

  it('lettura e scrittura dichiarano il condotto come padre', () => {
    assert.equal(IMPOSTAZIONI[LETTURA].dipendeDa, CONDOTTO)
    assert.equal(IMPOSTAZIONI[SCRITTURA].dipendeDa, CONDOTTO)
    // L'interruttore generale non dipende da nessuno, o la catena non si
    // riaccenderebbe.
    assert.equal(IMPOSTAZIONI[CONDOTTO].dipendeDa ?? null, null)
  })

  it('col condotto spento sono sospese, qualunque cosa dica il file', () => {
    // La lettura scritta a vero con il condotto spento è sospesa lo stesso: la
    // pagina non mostra una concessione che il condotto non onora.
    const voci = con({ [CONDOTTO]: false, [LETTURA]: true, [SCRITTURA]: true })
    const voce = (chiave) => voci.find((v) => v.chiave === chiave)
    assert.equal(sospesa(voce(LETTURA), voci), true)
    assert.equal(sospesa(voce(SCRITTURA), voci), true)
    assert.equal(sospesa(voce(CONDOTTO), voci), false)
  })

  it('col condotto acceso tornano libere', () => {
    const voci = con({ [CONDOTTO]: true, [LETTURA]: false, [SCRITTURA]: false })
    const voce = (chiave) => voci.find((v) => v.chiave === chiave)
    assert.equal(sospesa(voce(LETTURA), voci), false)
    assert.equal(sospesa(voce(SCRITTURA), voci), false)
  })

  it('una voce senza padre non è mai sospesa', () => {
    const senza = VOCI.filter((voce) => voce.dipendeDa === null)
    assert.ok(senza.length > 0)
    assert.equal(senza.every((voce) => !sospesa(voce, VOCI)), true)
  })

  it('un padre che non esiste lascia libera la figlia', () => {
    // Un refuso nel manifesto costa una voce toccabile, non una pagina bloccata.
    const orfana = { ...VOCI[0], chiave: 'registroDocenti.inventata', dipendeDa: 'non.esiste' }
    assert.equal(sospesa(orfana, VOCI), false)
  })
})

describe('i gruppi tematici della colonna', () => {
  it('ogni sezione, dell’anno e del computer, sta in un gruppo e in uno solo', () => {
    // Ogni sezione è nominata da un gruppo: la colonna è l'unica strada.
    const nominate = GRUPPI_SEZIONI.flatMap((gruppo) =>
      gruppo.voci.map((voce) => `${voce.ambito}:${voce.id}`),
    )
    const attese = [
      ...SEZIONI_DOCUMENTO.map((sezione) => `documento:${sezione.id}`),
      ...SEZIONI_PROGRAMMA.map((sezione) => `programma:${sezione.id}`),
    ]
    assert.deepEqual([...nominate].sort(), [...attese].sort())
    assert.equal(new Set(nominate).size, nominate.length, 'una sezione in due gruppi')
  })

  it('ogni gruppo ha un id suo: fa l’id del pulsante nella riga delle azioni', () => {
    const id = GRUPPI_SEZIONI.map((gruppo) => gruppo.id)
    assert.equal(new Set(id).size, id.length, 'due gruppi con lo stesso id')
  })

  it('ogni sezione ritrova il suo gruppo, e l’ambito conta', () => {
    for (const gruppo of GRUPPI_SEZIONI) {
      for (const voce of gruppo.voci) {
        assert.equal(gruppoDellaSezione(voce.ambito, voce.id).id, gruppo.id)
      }
    }
    // L'ambito conta: «modelli» è una sezione del programma, non del documento;
    // cercata nel documento ricade sul primo gruppo.
    assert.equal(gruppoDellaSezione('programma', 'modelli').id, 'programma')
    assert.equal(gruppoDellaSezione('documento', 'modelli').id, GRUPPI_SEZIONI[0].id)
  })

  it('la sezione aperta porta il suo gruppo, e una scheda sconosciuta ricade sulla prima', () => {
    const qui = sezioneAperta('programma', 'anno', 'posta')
    assert.equal(qui.id, 'posta')
    assert.equal(qui.gruppo.id, gruppoDellaSezione('programma', 'posta').id)

    const ieri = sezioneAperta('documento', 'non-esiste-piu', 'posta')
    assert.equal(ieri.id, SEZIONI_DOCUMENTO[0].id)
    assert.equal(ieri.titolo, SEZIONI_DOCUMENTO[0].titolo)
  })
})
