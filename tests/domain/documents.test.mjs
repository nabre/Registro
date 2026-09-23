// I documenti da raccogliere, che sono consegne come tutte le altre.
//
// Il punto di queste prove è che non esista un secondo elenco: quel che si
// chiede agli allievi è una consegna con dentro la categoria del documento, la
// spunta di chi l'ha portato si porta dietro il file, e la matrice del docente
// di classe è solo il modo in cui si guarda. L'ultima prova è quella che regge
// tutto: i documenti scritti col formato di prima devono ancora arrivare, e
// arrivare come consegne.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  avanzamentoConsegna,
  CHI_INSEGNA,
  consegneDocumento,
  corpoDelMessaggio,
  creaAllievo,
  creaAnno,
  creaClasse,
  creaConsegna,
  normalizzaRegistro,
  raccoglieDocumento,
  raccoltiDiClasse,
  spuntaDi,
  sembraHtml,
} from '../../dist-tests/domain.mjs'

/** Una consegna che si spunta portando un foglio. */
function raccolta (corsoId, testo, allieviIds, categoria = 'certificato') {
  return {
    ...creaConsegna(corsoId, testo, '2026-09-01'),
    tipo: 'consegna',
    documento: categoria,
    a: 'allievi',
    allieviIds,
  }
}

describe('documenti come consegne', () => {
  it('riconosce quali consegne si spuntano con un documento', () => {
    const normale = creaConsegna('cor-1', 'esercizi 4–7', '2026-09-01')
    const foglio = raccolta('cor-1', 'Autorizzazione uscita', ['a1'])

    assert.equal(raccoglieDocumento(normale), false)
    assert.equal(raccoglieDocumento(foglio), true)
  })

  it('le pesca fra tutte le consegne dei corsi dati, in ordine di scadenza', () => {
    const tardi = { ...raccolta('cor-1', 'Tardi', ['a1']), scadenza: '2026-06-30' }
    const presto = { ...raccolta('cor-1', 'Presto', ['a1']), scadenza: '2026-01-15' }
    const senza = raccolta('cor-1', 'Senza termine', ['a1'])
    const normale = creaConsegna('cor-1', 'esercizi', '2026-09-01')
    const altrove = raccolta('cor-2', 'Di un altro corso', ['a1'])
    const registro = { consegne: [senza, normale, tardi, altrove, presto], lezioni: [] }

    const trovate = consegneDocumento(registro, [{ id: 'cor-1' }])

    assert.deepEqual(trovate.map((c) => c.testo), ['Presto', 'Tardi', 'Senza termine'])
  })

  it('la spunta porta con sé il file di chi ha consegnato', () => {
    const classe = creaClasse('1A', 'anno-1')
    const uno = creaAllievo('Rossi', 'Maria')
    const due = creaAllievo('Bianchi', 'Luca')
    classe.allievi = [uno, due]

    const consegna = raccolta('cor-1', 'Autorizzazione', [uno.id, due.id])
    consegna.fatte = [
      { chi: uno.id, fattaIl: '2026-09-02T08:00:00.000Z', file: 'documenti/c/x.pdf', nome: 'x.pdf' },
    ]

    assert.equal(spuntaDi(consegna, uno.id).file, 'documenti/c/x.pdf')
    assert.equal(spuntaDi(consegna, due.id), null)
    const avanzamento = avanzamentoConsegna(consegna, classe)
    assert.equal(avanzamento.fatte, 1)
    assert.deepEqual(avanzamento.mancano, [due.id])
  })
})

describe('l’archivio di una classe', () => {
  /** Due persone e una richiesta con dentro il file di una sola. */
  function conFile () {
    const uno = creaAllievo('Rossi', 'Maria')
    const due = creaAllievo('Bianchi', 'Luca')
    const consegna = raccolta('cor-1', 'Pagella', [uno.id, due.id])
    consegna.documenti = [
      { allievoId: due.id, file: 'archivio/b.pdf', nome: 'b.pdf', aggiuntoIl: '2026-09-03T10:00:00.000Z' },
      { allievoId: uno.id, file: 'archivio/a.pdf', nome: 'a.pdf', aggiuntoIl: '2026-09-02T10:00:00.000Z' },
    ]
    return { uno, due, consegna }
  }

  it('elenca i fogli nell’ordine della pagina, non in quello di arrivo', () => {
    // Le frecce dell'anteprima vanno «al prossimo», e il prossimo è quello che
    // sta sotto nella matrice: l'ordine di elenco delle persone, non quello in
    // cui le scansioni sono entrate.
    const { uno, due, consegna } = conFile()

    const fogli = raccoltiDiClasse([consegna], [uno, due])

    assert.deepEqual(fogli.map((f) => f.file), ['archivio/a.pdf', 'archivio/b.pdf'])
    assert.deepEqual(fogli.map((f) => f.allievoId), [uno.id, due.id])
    assert.equal(fogli[0].genere, 'persona')
    assert.equal(fogli[0].aggiuntoIl, '2026-09-02T10:00:00.000Z')
  })

  it('i fogli di colonna vengono prima dei singoli, e si sa che cosa sono', () => {
    // Il foglio firme e la circolare uguale per tutti riguardano la richiesta
    // intera: in mezzo ai nomi sembrerebbero di qualcuno.
    const { uno, due, consegna } = conFile()
    consegna.fileFirme = 'archivio/firme.pdf'
    consegna.nomeFirme = 'firme.pdf'
    consegna.fileTutti = 'archivio/circolare.pdf'
    consegna.nomeTutti = 'circolare.pdf'

    const fogli = raccoltiDiClasse([consegna], [uno, due])

    assert.deepEqual(fogli.map((f) => f.genere), ['tutti', 'firme', 'persona', 'persona'])
    assert.deepEqual(fogli.slice(0, 2).map((f) => f.allievoId), [null, null])
  })

  it('quel che il docente raccoglie per sé è un foglio come gli altri', () => {
    const consegna = raccolta('cor-1', 'Circolare firmata', [])
    consegna.a = 'docente'
    consegna.documenti = [
      { allievoId: 'docente', file: 'archivio/mio.pdf', nome: 'mio.pdf', aggiuntoIl: '2026-09-05T09:00:00.000Z' },
    ]

    const fogli = raccoltiDiClasse([consegna], [])

    assert.deepEqual(fogli.map((f) => [f.genere, f.file]), [['docente', 'archivio/mio.pdf']])
    assert.equal(fogli[0].allievoId, null)
  })

  it('una richiesta senza niente dentro non lascia righe vuote', () => {
    const uno = creaAllievo('Rossi', 'Maria')
    assert.deepEqual(raccoltiDiClasse([raccolta('cor-1', 'Pagella', [uno.id])], [uno]), [])
  })
})

describe('i documenti scritti prima diventano consegne', () => {
  /** Un registro nel formato vecchio: i documenti stanno nel fascicolo. */
  function registroVecchio (documenti) {
    const anno = creaAnno('2026-09-01', '2027-06-30', '2026/27')
    return {
      versione: 1,
      anni: [anno],
      annoCorrenteId: anno.id,
      materie: [{ id: 'mat-1', nome: 'Calcolo' }],
      classi: [{ id: 'cls-1', nome: '1A', annoId: anno.id, allievi: [], docenteDiClasse: true }],
      corsi: [{ id: 'cor-1', classeId: 'cls-1', materiaId: 'mat-1', titolo: 'Calcolo — 1A' }],
      lezioni: [],
      piani: [],
      valutazioni: [],
      consegne: [],
      fascicoli: [{ id: 'fas-1', classeId: 'cls-1', recapiti: [], comunicazioni: [], documenti }],
    }
  }

  it('raggruppa per titolo i documenti dei singoli e tiene i file già raccolti', () => {
    const registro = normalizzaRegistro(
      registroVecchio([
        {
          id: 'doc-1',
          allievoId: 'alv-1',
          titolo: 'Pagella 3°anno',
          categoria: 'certificato',
          file: 'documenti/cls-1/pagella.pdf',
          nome: 'pagella.pdf',
          scadenza: '2026-09-17',
          aggiuntoIl: '2026-09-04T12:48:47.633Z',
        },
        {
          id: 'doc-2',
          allievoId: 'alv-2',
          titolo: 'Pagella 3°anno',
          categoria: 'certificato',
          file: '',
          nome: '',
          scadenza: '2026-09-17',
          aggiuntoIl: '2026-09-04T12:48:47.633Z',
        },
      ]),
    )

    assert.equal(registro.consegne.length, 1)
    const [consegna] = registro.consegne
    assert.equal(consegna.testo, 'Pagella 3°anno')
    assert.equal(consegna.documento, 'certificato')
    assert.equal(consegna.corsoId, 'cor-1')
    assert.equal(consegna.scadenza, '2026-09-17')
    assert.deepEqual(consegna.allieviIds, ['alv-1', 'alv-2'])
    // Chi aveva già portato il foglio risulta spuntato, e il suo file sta fra
    // i documenti della consegna — la forma che tutto il resto sa leggere.
    assert.equal(consegna.fatte.length, 1)
    assert.equal(consegna.fatte[0].chi, 'alv-1')
    assert.equal(consegna.fatte[0].file, undefined)
    assert.deepEqual(
      consegna.documenti.map((d) => [d.allievoId, d.file]),
      [['alv-1', 'documenti/cls-1/pagella.pdf']],
    )
    // E il fascicolo non tiene più un secondo elenco.
    assert.deepEqual(registro.fascicoli[0].documenti, [])
  })

  it('un documento di classe diventa una raccolta mia e conserva il suo id', () => {
    const registro = normalizzaRegistro(
      registroVecchio([
        {
          id: 'doc-classe',
          allievoId: null,
          titolo: 'Circolare gita',
          categoria: 'modulo',
          file: 'documenti/cls-1/circolare.pdf',
          nome: 'circolare.pdf',
          aggiuntoIl: '2026-09-04T12:48:47.633Z',
        },
      ]),
    )

    const [consegna] = registro.consegne
    // L'id resta: le comunicazioni già scritte lo tengono fra gli allegati.
    assert.equal(consegna.id, 'doc-classe')
    assert.equal(consegna.a, 'docente')
    assert.equal(consegna.fatte[0].chi, CHI_INSEGNA)
    assert.equal(consegna.documenti[0].allievoId, CHI_INSEGNA)
    assert.equal(consegna.documenti[0].file, 'documenti/cls-1/circolare.pdf')
  })

  it('senza un corso in quella classe i documenti restano dove sono', () => {
    const grezzo = registroVecchio([
      {
        id: 'doc-1',
        allievoId: 'alv-1',
        titolo: 'Certificato',
        categoria: 'certificato',
        file: '',
        aggiuntoIl: '2026-09-04T12:48:47.633Z',
      },
    ])
    grezzo.corsi = []

    const registro = normalizzaRegistro(grezzo)

    assert.equal(registro.consegne.length, 0)
    assert.equal(registro.fascicoli[0].documenti.length, 1)
  })
})

describe('la firma in fondo ai messaggi', () => {
  it('senza firma il corpo resta quello scritto', () => {
    const scritto = corpoDelMessaggio('Buongiorno,\nla lezione di domani è annullata.')

    assert.equal(scritto.html, false)
    assert.equal(scritto.contenuto, 'Buongiorno,\nla lezione di domani è annullata.')
  })

  it('una firma a righe tiene il messaggio in testo semplice', () => {
    // Con la riga «-- » davanti: è la convenzione con cui un programma di posta
    // sa che quel che segue non è parte del messaggio.
    const scritto = corpoDelMessaggio('Buongiorno.', 'Michel Brenna\nDocente di classe')

    assert.equal(scritto.html, false)
    assert.equal(scritto.contenuto, 'Buongiorno.\n\n-- \nMichel Brenna\nDocente di classe')
  })

  it('una firma con dei tag porta tutto il messaggio in HTML', () => {
    // Un corpo non può essere metà testo e metà HTML: decide la firma, e il
    // testo scritto dal docente si adegua.
    const scritto = corpoDelMessaggio('Buongiorno,\na domani.', '<div>Michel Brenna</div>')

    assert.equal(scritto.html, true)
    assert.ok(scritto.contenuto.includes('<div>Buongiorno,<br>a domani.</div>'))
    assert.ok(scritto.contenuto.endsWith('<div>-- </div><div>Michel Brenna</div>'))
  })

  it('quel che in HTML vorrebbe dire qualcosa si neutralizza', () => {
    // Un messaggio che parla di «<3 ore» non deve aprire un tag, e una & non
    // deve mangiarsi la parola che segue.
    const scritto = corpoDelMessaggio('Meno di <3 ore & mezza', '<div>x</div>')

    assert.ok(scritto.contenuto.includes('Meno di &lt;3 ore &amp; mezza'))
  })

  it('riconosce una firma scritta a righe da una scritta in HTML', () => {
    assert.equal(sembraHtml('Michel Brenna\nDocente'), false)
    assert.equal(sembraHtml('<div>Michel Brenna</div>'), true)
  })
})
