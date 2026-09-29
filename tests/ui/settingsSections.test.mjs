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
  AREE,
  CHIAVI_IN_SCHEDA,
  SEZIONI,
  SEZIONI_PROGRAMMA,
  avanzateDiSezione,
  cercaImpostazioni,
  daRipristinare,
  daSistemare,
  gruppiDiSezione,
  nomeVoce,
  scritteNellArea,
  sezioneDi,
  sezioniDellArea,
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
    const chiave = 'registroDocenti.aspetto.tema'
    assert.equal(nomeVoce(chiave), IMPOSTAZIONI[chiave].etichetta)
    // Senza etichetta — una chiave che non è un'impostazione — si ricava a parole.
    assert.equal(nomeVoce('registroDocenti.qualcosaDiNuovo'), 'Qualcosa di nuovo')
  })
})

// Una voce figlia di un'altra: la dettatura sta sotto l'assistente, che la
// scrive. Si prova la regola: chi è sospeso, e quando.
describe('le voci che dipendono da un’altra', () => {
  const PADRE = 'registroDocenti.assistente.attivo'
  const FIGLIA = 'registroDocenti.dettatura.attivo'

  it('la figlia dichiara il padre, e il padre non dipende da lei', () => {
    assert.equal(IMPOSTAZIONI[FIGLIA].dipendeDa, PADRE)
    // Un padre che dipendesse dalla figlia non si riaccenderebbe più.
    assert.notEqual(IMPOSTAZIONI[PADRE].dipendeDa ?? null, FIGLIA)
  })

  it('col padre spento è sospesa, qualunque cosa dica il file', () => {
    // La figlia scritta a vero con il padre spento è sospesa lo stesso: la
    // pagina non mostra acceso quel che il programma non onora.
    const voci = con({ [PADRE]: false, [FIGLIA]: true })
    const voce = (chiave) => voci.find((v) => v.chiave === chiave)
    assert.equal(sospesa(voce(FIGLIA), voci), true)
    assert.equal(sospesa(voce(PADRE), voci), false)
  })

  it('col padre acceso torna libera', () => {
    const voci = con({ [PADRE]: true, [FIGLIA]: false })
    const voce = (chiave) => voci.find((v) => v.chiave === chiave)
    assert.equal(sospesa(voce(FIGLIA), voci), false)
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

describe('le aree e le loro sezioni', () => {
  it('quattro aree, nell’ordine della testata', () => {
    assert.deepEqual(AREE.map((area) => area.id), ['calendario', 'didattica', 'utente', 'programma'])
    for (const area of AREE) assert.ok(area.titolo, `${area.id}: area senza nome`)
  })

  it('ogni sezione sta in un’area e in una sola, e ha un nome', () => {
    const ids = SEZIONI.map((sezione) => sezione.id)
    assert.equal(new Set(ids).size, ids.length, 'una sezione in due aree')
    for (const sezione of SEZIONI) {
      assert.ok(AREE.some((area) => area.id === sezione.area), `${sezione.id}: area sconosciuta`)
      assert.deepEqual(
        AREE.filter((area) => sezioniDellArea(area.id).some((s) => s.id === sezione.id)).map((a) => a.id),
        [sezione.area],
        sezione.id,
      )
      assert.ok(sezione.titolo && sezione.sottotitolo, `${sezione.id}: senza nome o riassunto`)
    }
  })

  it('ogni sezione delle chiavi è una sezione di un’area', () => {
    for (const sezione of SEZIONI_PROGRAMMA) {
      assert.equal(sezioneDi(sezione.id).id, sezione.id, `«${sezione.id}» non sta in nessuna area`)
    }
  })

  it('le chiavi del computer stanno in sezioni del computer', () => {
    // La pastiglia d'ambito non deve dire «Questo anno» sopra una chiave di `impostazioni.json`.
    for (const sezione of SEZIONI_PROGRAMMA) {
      assert.ok(sezioneDi(sezione.id).ambiti.includes('computer'), sezione.id)
    }
  })

  it('una sezione sconosciuta ricade sulla prima', () => {
    assert.equal(sezioneDi('non-esiste-piu').id, SEZIONI[0].id)
  })

  it('la Didattica ha Valutazione e Liste: le materie stanno solo nei Corsi', () => {
    assert.deepEqual(sezioniDellArea('didattica').map((sezione) => sezione.id), ['valutazione', 'liste'])
    assert.equal(SEZIONI.some((sezione) => sezione.id === 'materie'), false)
  })

  it('il Programma finisce con le Avanzate: integrazione di sistema e condotto, con l’avvertenza', () => {
    const programma = sezioniDellArea('programma').map((sezione) => sezione.id)
    assert.equal(programma.at(-1), 'condotto')
    const avanzate = SEZIONI_PROGRAMMA.find((sezione) => sezione.id === 'condotto')
    const sue = vociDiSezione(VOCI, avanzate).map((voce) => voce.chiave)
    // Il prefisso più lungo vince: la chiave sola si sposta, il suo gruppo resta in Avvio.
    assert.deepEqual(sue, ['registroDocenti.avvio.integrazioneSistema', 'registroDocenti.api.accesso'])
    const avvio = SEZIONI_PROGRAMMA.find((sezione) => sezione.id === 'avvio')
    assert.ok(vociDiSezione(VOCI, avvio).some((voce) => voce.chiave === 'registroDocenti.avvio.conWindows'))
    assert.ok(avanzate.avvertenza)
  })
})

describe('cercare fra le impostazioni', () => {
  const trovate = (cercato) => cercaImpostazioni(VOCI, cercato)
  const chiavi = (cercato) => trovate(cercato).filter((t) => t.voce).map((t) => t.voce.chiave)

  it('trova tema e lingua, che Ctrl+K prima non trovava', () => {
    assert.ok(chiavi('tema').includes('registroDocenti.aspetto.tema'))
    assert.ok(chiavi('lingua').includes('registroDocenti.aspetto.lingua'))
  })

  it('una voce porta alla sua riga, nell’area della sua sezione', () => {
    const [tema] = trovate('tema').filter((t) => t.voce?.chiave === 'registroDocenti.aspetto.tema')
    assert.equal(tema.area, 'programma')
    assert.equal(tema.scheda, 'programma#registroDocenti.aspetto.tema')
    assert.equal(tema.ambito, 'computer')
  })

  it('una voce disegnata da una scheda porta alla sezione, che non ha una riga sua', () => {
    const chiave = 'registroDocenti.posta.invioDiretto'
    const [invio] = trovate(chiave).filter((t) => t.voce?.chiave === chiave)
    assert.equal(invio.scheda, 'utente#posta')
  })

  it('trova anche le sezioni dell’anno, per nome e per i campi che contengono', () => {
    const pause = trovate('pause').filter((t) => !t.voce).map((t) => t.scheda)
    assert.ok(pause.includes('calendario#giornata'))
    const [giornata] = trovate('pause').filter((t) => t.scheda === 'calendario#giornata')
    assert.equal(giornata.ambito, 'anno')
  })

  it('senza parole non trova niente', () => {
    assert.deepEqual(trovate('   '), [])
  })
})

describe('che cosa dice la scheda di un’area', () => {
  const AMODELLO = 'registroDocenti.assistente.modello'

  it('conta le voci decise a mano, area per area', () => {
    const scritte = VOCI.map((voce) =>
      voce.chiave === 'registroDocenti.aspetto.tema' ? { ...voce, scritta: true } : voce)
    assert.equal(scritteNellArea(scritte, 'programma'), 1)
    assert.equal(scritteNellArea(scritte, 'utente'), 0)
  })

  it('un uso acceso senza modello chiede attenzione nell’area Programma', () => {
    const voci = con({ 'registroDocenti.assistente.attivo': true, [AMODELLO]: '' })
    assert.equal(daSistemare('programma', voci, { invioDiretto: false, exchange: false }).length, 1)
    const conModello = con({ 'registroDocenti.assistente.attivo': true, [AMODELLO]: 'qwen.gguf' })
    assert.deepEqual(daSistemare('programma', conModello, { invioDiretto: false, exchange: false }), [])
  })

  it('«Ripristina» di un’area tocca solo le voci degli elenchi decise a mano', () => {
    const scritte = (chiavi) => VOCI.map((voce) =>
      chiavi.includes(voce.chiave) ? { ...voce, scritta: true } : voce)
    const chiavi = (voci, area) => daRipristinare(voci, area).map((voce) => voce.chiave)
    const voci = scritte([
      'registroDocenti.aspetto.tema',
      // Scelte nelle schede: il modello, la cartella dei modelli.
      'registroDocenti.assistente.modello',
      'registroDocenti.modelli.cartella',
      // Del collegamento, e l'interruttore promosso nella scheda Posta.
      'registroDocenti.posta.mittente',
      'registroDocenti.posta.utente',
      'registroDocenti.posta.invioDiretto',
      'registroDocenti.recapiti.telefono',
    ])
    assert.deepEqual(chiavi(voci, 'programma'), ['registroDocenti.aspetto.tema'])
    assert.deepEqual(chiavi(voci, 'utente'), ['registroDocenti.recapiti.telefono'])
    assert.deepEqual(chiavi(voci, 'calendario'), [])
    // Il numero sull'area conta anche le schede: lì si vede che cosa è deciso.
    assert.equal(scritteNellArea(voci, 'programma'), 3)
  })

  it('l’invio diretto senza casella chiede attenzione nell’area Utente', () => {
    assert.equal(daSistemare('utente', VOCI, { invioDiretto: true, exchange: false }).length, 1)
    assert.deepEqual(daSistemare('utente', VOCI, { invioDiretto: true, exchange: true }), [])
    assert.deepEqual(daSistemare('calendario', VOCI, { invioDiretto: true, exchange: false }), [])
  })
})
