// Come le impostazioni del programma si dividono nelle sezioni della pagina:
// **ogni impostazione del manifesto finisce in un posto, e in uno solo**. Il
// posto è l'elenco di una sezione o la sua scheda dedicata
// (`CHIAVI_IN_SCHEDA`); una chiave promossa sparisce dall'elenco apposta, e qui
// si conta lo stesso. Nomi e ordine delle sezioni sono liberi.

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

  it('«Generale» raccoglie quel che nessuna ha nominato', () => {
    const raccoglie = SEZIONI_PROGRAMMA.filter((sezione) => sezione.raccoglie)
    assert.equal(raccoglie.length, 1, 'una sola sezione può raccogliere: altrimenti le orfane si duplicano')
    // La sezione che raccoglie il resto è la prima, e le sue chiavi restano sue.
    assert.equal(raccoglie[0].id, 'aspetto')
    assert.ok(!SEZIONI_PROGRAMMA.some((sezione) => sezione.id === 'file'))
    const sue = vociDiSezione(VOCI, raccoglie[0]).map((voce) => voce.chiave)
    assert.ok(sue.some((chiave) => chiave.startsWith('registroDocenti.aspetto.')))

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

  it('posta e recapiti stanno insieme, in «Comunicazioni»', () => {
    const posta = SEZIONI_PROGRAMMA.find((sezione) => sezione.id === 'posta')
    assert.equal(posta.titolo, 'Comunicazioni')
    assert.ok(!SEZIONI_PROGRAMMA.some((sezione) => sezione.id === 'recapiti'))
    const recapiti = VOCI.filter((voce) => voce.chiave.startsWith('registroDocenti.recapiti.'))
    assert.ok(recapiti.length > 0, 'nessuna chiave dei recapiti nel manifesto')
    for (const voce of recapiti) {
      const sue = SEZIONI_PROGRAMMA.filter((sezione) =>
        vociMostrateDaSezione(VOCI, sezione).some((altra) => altra.chiave === voce.chiave),
      )
      assert.deepEqual(sue.map((sezione) => sezione.id), ['posta'], voce.chiave)
    }
  })

  it('i modelli e le loro impostazioni stanno in una sezione sola', () => {
    // File, chi risponde e interruttori stanno insieme.
    for (const chiave of [
      'registroDocenti.modelli.cartella',
      'registroDocenti.ocr.attivo',
      'registroDocenti.assistente.attivo',
      'registroDocenti.dettatura.attivo',
    ]) {
      const sue = SEZIONI_PROGRAMMA.filter((sezione) => sottoPrefisso(chiave, sezione.prefissi))
      assert.deepEqual(sue.map((sezione) => sezione.id), ['modelli'], chiave)
    }
  })

  it('la cartella dei modelli sta nella sua sezione, non nel raccoglitore', () => {
    // La cartella da gigabyte non finisce nella sezione che raccoglie il resto.
    const suoi = SEZIONI_PROGRAMMA.filter((sezione) =>
      sottoPrefisso('registroDocenti.modelli.cartella', sezione.prefissi),
    )
    assert.deepEqual(suoi.map((sezione) => sezione.id), ['modelli'])
  })

  it('un prefisso prende la chiave esatta e quelle puntate sotto, non quelle che le somigliano', () => {
    assert.equal(sottoPrefisso('registroDocenti.posta', ['registroDocenti.posta']), true)
    assert.equal(sottoPrefisso('registroDocenti.posta.mittente', ['registroDocenti.posta']), true)
    // `postaAltro` non è dentro `posta`: il prefisso vale col punto.
    assert.equal(sottoPrefisso('registroDocenti.postaAltro', ['registroDocenti.posta']), false)
  })

  it('dentro una sezione le voci restano divise per gruppo, con un titolo leggibile', () => {
    const aspetto = SEZIONI_PROGRAMMA.find((sezione) => sezione.id === 'aspetto')
    const gruppi = gruppiDiSezione(VOCI, aspetto)

    // Un gruppo per argomento, nell'ordine del manifesto.
    assert.deepEqual(gruppi.map((gruppo) => gruppo.prefisso), [
      'registroDocenti.aspetto',
      'registroDocenti.vassoio',
      'registroDocenti.avvio',
      'registroDocenti.promemoria',
      'registroDocenti.proiezione',
    ])
    assert.equal(gruppi[1].titolo, 'Icona accanto all’orologio')
    assert.ok(gruppi[1].voci.every((voce) => voce.chiave.startsWith('registroDocenti.vassoio.')))
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

  it('i programmi già installati stanno in fondo, non in fila con il resto', () => {
    // Le impostazioni avanzate stanno a parte dagli interruttori.
    const modelli = SEZIONI_PROGRAMMA.find((sezione) => sezione.id === 'modelli')
    const avanzate = avanzateDiSezione(VOCI, modelli).map((voce) => voce.chiave)
    const correnti = gruppiDiSezione(VOCI, modelli).flatMap((gruppo) =>
      gruppo.voci.map((voce) => voce.chiave),
    )

    assert.ok(avanzate.includes('registroDocenti.dettatura.indirizzo'))
    assert.ok(avanzate.includes('registroDocenti.ocr.programma'))
    assert.ok(correnti.includes('registroDocenti.dettatura.attivo'))
    assert.ok(correnti.includes('registroDocenti.dettatura.taglia'))
    // Nessuna chiave in tutte e due: sarebbe la stessa riga due volte.
    assert.deepEqual(avanzate.filter((chiave) => correnti.includes(chiave)), [])
    // E insieme fanno la sezione intera.
    assert.equal(avanzate.length + correnti.length, vociDiSezione(VOCI, modelli).length)
  })

  it('il nome di una voce è quello scritto nel manifesto', () => {
    assert.equal(nomeVoce('registroDocenti.promemoria.anticipoMinuti'), 'Minuti di anticipo')
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
    assert.equal(gruppoDellaSezione('documento', 'intestazione').id, 'stampa')
  })

  it('i calendari ICS hanno una sezione loro, dopo la griglia', () => {
    const anno = GRUPPI_SEZIONI.find((gruppo) => gruppo.id === 'anno')
    assert.deepEqual(anno.voci.map((voce) => voce.id), ['anno', 'calendario', 'ics'])
    assert.equal(sezioneAperta('documento', 'ics', 'aspetto').titolo, 'Calendari ICS')
  })

  it('le liste sono un gruppo loro, subito dopo la didattica', () => {
    const id = GRUPPI_SEZIONI.map((gruppo) => gruppo.id)
    assert.equal(id.indexOf('liste'), id.indexOf('didattica') + 1)
    const liste = GRUPPI_SEZIONI.find((gruppo) => gruppo.id === 'liste')
    assert.deepEqual(liste.voci, [{ ambito: 'documento', id: 'liste' }])
  })

  it('Comunicazioni è un gruppo di una sezione sola, con il suo stesso nome', () => {
    // La fascia e il percorso saltano la sezione quando ripeterebbe il gruppo.
    const qui = sezioneAperta('programma', 'anno', 'posta')
    assert.equal(qui.gruppo.id, 'comunicazioni')
    assert.equal(qui.gruppo.voci.length, 1)
    assert.equal(qui.titolo, qui.gruppo.titolo)
  })

  it('il programma raccoglie anche i modelli linguistici e il condotto, in coda', () => {
    const programma = GRUPPI_SEZIONI.find((gruppo) => gruppo.id === 'programma')
    assert.deepEqual(programma.voci.slice(-2), [
      { ambito: 'programma', id: 'modelli' },
      { ambito: 'programma', id: 'condotto' },
    ])
    const id = GRUPPI_SEZIONI.map((gruppo) => gruppo.id)
    assert.ok(!id.includes('modelli'), 'il gruppo «Modelli locali» è tornato')
    assert.ok(!id.includes('avanzate'), 'il gruppo «Avanzate» è tornato')
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
