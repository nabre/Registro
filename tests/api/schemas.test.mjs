// La convalida da sola, senza archivio sotto: il tipo TypeScript non arriva a
// webview, condotto e riga di comando, e un dato storto che passa qui resta nel
// JSON dell'anno. Si guardano in particolare il *percorso* dell'errore (da cui
// `core.ts` ricava il campo) e la differenza fra `opzionale` e `nullabile`, su
// cui reggono `presenze.campi` e `recupero.imposta`.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { schemi } from '../../dist-tests/api.mjs'

const {
  booleano,
  chiaviEstranee,
  convalida,
  elenco,
  entita,
  identificatore,
  iso,
  numero,
  nullabile,
  oggetto,
  opzionale,
  ora,
  qualunque,
  scelta,
  schemaJson,
  testo,
} = schemi

/** I problemi di una convalida andata male, o un errore se invece è passata. */
function problemi (schema, valore) {
  const esito = convalida(schema, valore)
  assert.ok(esito.issues, `«${JSON.stringify(valore)}» è passato e non doveva`)
  return esito.issues
}

/** Il valore accettato, o un errore con dentro il motivo del rifiuto. */
function accettato (schema, valore) {
  const esito = convalida(schema, valore)
  assert.ok(!esito.issues, `rifiutato: ${JSON.stringify(esito.issues)}`)
  return esito.value
}

/** I percorsi dei problemi, uniti come li unisce il nucleo: `campo.sottocampo`. */
function percorsi (schema, valore) {
  return problemi(schema, valore).map((p) => (p.path ?? []).join('.'))
}

describe('le forme semplici', () => {
  it('il testo guarda minimo, massimo e modello', () => {
    const sigla = testo({ minimo: 2, massimo: 4, modello: /^[A-Z]+$/ })
    assert.equal(accettato(sigla, 'MAT'), 'MAT')
    assert.equal(problemi(sigla, 'M').length, 1)
    assert.equal(problemi(sigla, 'MATEM').length, 1)
    assert.equal(problemi(sigla, 'mat').length, 1)
    assert.equal(problemi(sigla, 3).length, 1)
  })

  it('un numero è finito, e NaN e Infinito non lo sono', () => {
    // `parseFloat('quattro')` dà NaN, che è un number: senza questo controllo
    // entrerebbe come voto e ogni media diventerebbe NaN.
    assert.equal(problemi(numero(), Number.NaN).length, 1)
    assert.equal(problemi(numero(), Number.POSITIVE_INFINITY).length, 1)
    assert.equal(problemi(numero(), Number.NEGATIVE_INFINITY).length, 1)
    assert.equal(accettato(numero(), 0), 0)
  })

  it('un numero rispetta intero, minimo e massimo', () => {
    const ud = numero({ intero: true, minimo: 0, massimo: 32 })
    assert.equal(accettato(ud, 0), 0)
    assert.equal(accettato(ud, 32), 32)
    assert.equal(problemi(ud, 1.5).length, 1)
    assert.equal(problemi(ud, -1).length, 1)
    assert.equal(problemi(ud, 33).length, 1)
  })

  it('un booleano vuole vero o falso, non «vero»', () => {
    assert.equal(accettato(booleano(), false), false)
    assert.equal(problemi(booleano(), 'vero').length, 1)
    assert.equal(problemi(booleano(), 1).length, 1)
  })

  it('una scelta accetta quel che è in elenco e nient’altro', () => {
    const segno = scelta(['positivo', 'negativo'])
    assert.equal(accettato(segno, 'positivo'), 'positivo')
    assert.equal(accettato(segno, 'negativo'), 'negativo')
    assert.equal(problemi(segno, 'ottimo').length, 1)
    // Il messaggio elenca i valori buoni: chi chiama da fuori non ha lo schema.
    assert.match(problemi(segno, 'ottimo')[0].message, /positivo/)
  })
})

describe('le forme composte', () => {
  it('l’errore di un elenco porta l’indice della voce che non va', () => {
    const voti = elenco(numero())
    assert.deepEqual(percorsi(voti, [4, 'cinque', 6]), ['1'])

    // In un elenco di oggetti indice e campo si sommano: si sa quale riga
    // riscrivere.
    const righe = elenco(oggetto({ allievoId: testo(), voto: numero() }))
    assert.deepEqual(
      percorsi(righe, [{ allievoId: 'alv-1', voto: 4 }, { allievoId: 'alv-2', voto: 'x' }]),
      ['1.voto'],
    )
    assert.equal(problemi(righe, 'non è un elenco').length, 1)
  })

  it('un oggetto scarta i campi in più invece di rifiutare tutto', () => {
    // La tolleranza è voluta: un pannello più nuovo con un campo in più continua a
    // funzionare.
    const forma = oggetto({ lezioneId: testo() })
    assert.deepEqual(accettato(forma, { lezioneId: 'lez-1', novita: true }), { lezioneId: 'lez-1' })
  })

  it('un errore annidato porta il percorso campo.sottocampo', () => {
    const forma = oggetto({ scala: oggetto({ min: numero(), max: numero() }) })
    assert.deepEqual(percorsi(forma, { scala: { min: 1, max: 'sei' } }), ['scala.max'])
  })

  it('un oggetto raccoglie tutti i problemi e non si ferma al primo', () => {
    // Tutti i problemi insieme, non solo il primo.
    const forma = oggetto({
      allievoId: testo({ minimo: 2 }),
      ud: numero({ intero: true }),
      stato: scelta(['presente', 'assente']),
    })
    assert.deepEqual(
      percorsi(forma, { allievoId: 'x', ud: 1.5, stato: 'boh' }),
      ['allievoId', 'ud', 'stato'],
    )
  })

  it('opzionale è «la chiave può mancare», nullabile è «il valore può essere null»', () => {
    // `valore: null` è «non ancora messo», la chiave assente è «lascia com'era».
    const conOpzionale = oggetto({ nota: opzionale(testo()) })
    assert.deepEqual(accettato(conOpzionale, {}), {})
    assert.deepEqual(accettato(conOpzionale, { nota: 'vista' }), { nota: 'vista' })

    const conNullabile = oggetto({ valore: nullabile(numero()) })
    assert.deepEqual(accettato(conNullabile, { valore: null }), { valore: null })
    assert.deepEqual(accettato(conNullabile, { valore: 4 }), { valore: 4 })
    // Nullabile non vuol dire facoltativo: la chiave resta obbligatoria.
    assert.equal(problemi(conNullabile, {}).length, 1)
  })

  it('su un campo opzionale «null» vale quanto la chiave assente', () => {
    // La griglia del modello non sa fare un campo facoltativo e scrive `null` su
    // quelli che non usa: `opzionale` lo tratta come assente, nel contratto, così
    // finestra e riga di comando rispondono uguale.
    const filtri = oggetto({
      classeId: opzionale(identificatore()),
      corsoId: opzionale(identificatore()),
      dal: opzionale(iso()),
      quante: opzionale(numero({ intero: true })),
    })
    const busta = { classeId: null, corsoId: null, dal: null, quante: null }
    // Esce identica a quella vuota: una chiave rimasta con `undefined` riporterebbe
    // la differenza nel gestore che fa lo spread.
    assert.deepEqual(accettato(filtri, busta), {})
    assert.deepEqual(accettato(filtri, {}), {})
    assert.deepEqual(accettato(filtri, { classeId: 'cls-1', corsoId: null }), { classeId: 'cls-1' })
  })

  it('con opzionale(nullabile(...)) il null resta un valore e non diventa un silenzio', () => {
    // `valutazioni.recupero.imposta` distingue «niente sulla riconsegna» da «togli
    // la data»: `opzionale(nullabile(...))` tiene il `null`, o la cancellazione
    // diventerebbe un silenzio.
    const recupero = oggetto({
      previstoIl: nullabile(iso()),
      riconsegnataIl: opzionale(nullabile(iso())),
    })
    assert.deepEqual(
      accettato(recupero, { previstoIl: null, riconsegnataIl: null }),
      { previstoIl: null, riconsegnataIl: null },
    )
    assert.deepEqual(accettato(recupero, { previstoIl: '2026-03-02' }), { previstoIl: '2026-03-02' })
    // Le tre combinazioni: `null` su `opzionale` sparisce, su `nullabile` resta, su
    // `opzionale(nullabile(...))` resta.
    assert.deepEqual(accettato(oggetto({ x: opzionale(testo()) }), { x: null }), {})
    assert.deepEqual(accettato(oggetto({ x: nullabile(testo()) }), { x: null }), { x: null })
    const coppia = oggetto({ x: opzionale(nullabile(testo())) })
    assert.deepEqual(accettato(coppia, { x: null }), { x: null })
  })

  it('le chiavi di troppo si sanno dire, anche quando si scartano', () => {
    // Le chiavi estranee si scartano (tolleranza verso un pannello più nuovo), ma
    // chi convalida può chiedere quali sono cadute: `riconsegnata` al posto di
    // `riconsegnataIl` non deve tornare `ok: true` senza dire niente.
    const forma = oggetto({ riconsegnataIl: opzionale(iso()) }).forma
    assert.deepEqual(chiaviEstranee(forma, { riconsegnataIl: '2026-03-02' }), [])
    assert.deepEqual(chiaviEstranee(forma, { riconsegnata: '2026-03-02' }), ['riconsegnata'])
    // La differenza di maiuscole è una chiave diversa.
    assert.deepEqual(chiaviEstranee(forma, { RiconsegnataIl: 'x' }), ['RiconsegnataIl'])
    // Su una forma aperta i campi in più sono il dato.
    assert.deepEqual(chiaviEstranee(entita({ cosa: 'Lezione' }).forma, { id: 'lez-1', corsoId: 'cor-1' }), [])
    // Una chiave come `toString` non passa per dichiarata (`in` guarderebbe il
    // prototipo).
    assert.deepEqual(chiaviEstranee(forma, { toString: 'x' }), ['toString'])
  })

  it('«severo» rifiuta le chiavi di troppo, e lo schema pubblicato lo dice', () => {
    // Spento di serie: se rompere il silenzio lo decide il nucleo secondo il
    // genere (su una scrittura è un dato perso, su una lettura un filtro in meno).
    const tollerante = oggetto({ a: testo() })
    assert.deepEqual(accettato(tollerante, { a: 'x', b: 'scartato' }), { a: 'x' })
    assert.equal(schemaJson(tollerante.forma).additionalProperties, true)

    const severo = oggetto({ a: testo() }, { severo: true })
    assert.deepEqual(percorsi(severo, { a: 'x', b: 'scartato' }), ['b'])
    assert.deepEqual(accettato(severo, { a: 'x' }), { a: 'x' })
    assert.equal(schemaJson(severo.forma).additionalProperties, false)
  })

  it('qualunque vuole comunque un valore: «può mancare» lo dice opzionale', () => {
    // `qualunque()` non accetta l'assenza: un campo obbligatorio resta tale, come
    // dice `required`.
    const forma = oggetto({ chiave: testo(), valore: qualunque() })
    assert.deepEqual(percorsi(forma, { chiave: 'X' }), ['valore'])
    assert.deepEqual(accettato(forma, { chiave: 'X', valore: false }), { chiave: 'X', valore: false })
    assert.deepEqual(accettato(forma, { chiave: 'X', valore: null }), { chiave: 'X', valore: null })
    // Che possa mancare si dice con `opzionale`.
    assert.deepEqual(accettato(oggetto({ v: opzionale(qualunque()) }), {}), {})
  })
})

describe('le forme del dominio', () => {
  it('una data è un giorno che esiste, non solo dieci cifre nell’ordine giusto', () => {
    assert.equal(problemi(iso(), '2026-02-30').length, 1)
    assert.equal(accettato(iso(), '2026-02-28'), '2026-02-28')
    assert.equal(problemi(iso(), '2026-2-28').length, 1)
    assert.equal(problemi(iso(), 'ieri').length, 1)
  })

  it('una data vale per tutti gli anni a quattro cifre, compresi i primi cento', () => {
    // `Date.UTC` porta gli anni 0–99 sul Novecento, ma `'0000-01-01'` è la
    // sentinella di `risolviPeriodo` che torna nelle buste: l'API accetta in
    // ingresso quel che emette.
    assert.equal(accettato(iso(), '0000-01-01'), '0000-01-01')
    assert.equal(accettato(iso(), '0099-12-31'), '0099-12-31')
    assert.equal(accettato(iso(), '0100-01-01'), '0100-01-01')
    assert.equal(accettato(iso(), '9999-12-31'), '9999-12-31')
    // Il merito si guarda anche agli estremi: 29 febbraio del 1 no, del 2024 sì,
    // del 2023 no.
    assert.equal(problemi(iso(), '0001-02-29').length, 1)
    assert.equal(accettato(iso(), '2024-02-29'), '2024-02-29')
    assert.equal(problemi(iso(), '2023-02-29').length, 1)
  })

  it('un identificatore torna ripulito, e la stringa vuota non passa', () => {
    // L'id esce senza spazi: `' cls-1 '` non troverebbe niente nella procedura.
    assert.equal(accettato(identificatore(), ' cls-m3k9x2-a7f1 '), 'cls-m3k9x2-a7f1')
    assert.equal(accettato(identificatore(), 'cls-1'), 'cls-1')
    assert.equal(problemi(identificatore(), '').length, 1)
    assert.equal(problemi(identificatore(), '   ').length, 1)
    assert.equal(problemi(identificatore(), 'x'.repeat(65)).length, 1)
  })

  it('un’ora sta sulle ventiquattro e vuole due cifre', () => {
    assert.equal(problemi(ora(), '24:00').length, 1)
    assert.equal(problemi(ora(), '8:15').length, 1)
    assert.equal(accettato(ora(), '08:15'), '08:15')
    assert.equal(accettato(ora(), '23:59'), '23:59')
  })
})

describe('la forma raccontata in JSON Schema', () => {
  it('dichiara i campi obbligatori e gli enum, e la porta com’è davvero', () => {
    // Lo schema JSON è la documentazione di chi chiama da fuori: deve dire la forma
    // convalidata.
    const forma = oggetto({
      lezioneId: testo(),
      stato: scelta(['presente', 'assente']),
      nota: opzionale(testo({ massimo: 500 })),
    }).forma
    const json = schemaJson(forma)

    assert.equal(json.type, 'object')
    assert.deepEqual(json.required, ['lezioneId', 'stato'])
    // `additionalProperties: false` vuol dire «invalido», non «scartato»: qui il
    // runtime scarta, quindi si pubblica aperto (vedi la prova su «severo»).
    assert.equal(json.additionalProperties, true)
    assert.deepEqual(json.properties.stato, { type: 'string', enum: ['presente', 'assente'] })
    assert.equal(json.properties.nota.maxLength, 500)
  })

  it('traduce numeri, elenchi e testi con i loro limiti', () => {
    assert.equal(schemaJson(numero({ intero: true, minimo: 0 }).forma).type, 'integer')
    assert.equal(schemaJson(numero().forma).type, 'number')
    assert.deepEqual(schemaJson(elenco(numero()).forma), { type: 'array', items: { type: 'number' } })
    assert.equal(schemaJson(iso().forma).examples[0], '2026-09-21')
    // `minimo: 1` si pubblica come `minLength: 1`.
    assert.equal(schemaJson(testo({ minimo: 1 }).forma).minLength, 1)
    assert.equal(schemaJson(testo().forma).minLength, undefined)
  })

  it('un identificatore pubblica il minimo che applica, e nessun esempio inventato', () => {
    // Lo stesso per `identificatore`: la stringa vuota è rifiutata e dichiarata.
    const json = schemaJson(identificatore().forma)
    assert.equal(json.minLength, 1)
    assert.equal(json.maxLength, 64)
    // Nessun esempio fisso: `lez-…` era sbagliato di forma per `classeId` e
    // `corsoId`.
    assert.equal(json.examples, undefined)
    assert.match(json.description, /elenco/)
    assert.deepEqual(schemaJson(identificatore({ esempio: 'cls-m3k9x2-a7f1' }).forma).examples, ['cls-m3k9x2-a7f1'])
  })

  it('qualunque si pubblica come l’unione dei tipi JSON, non come schema vuoto', () => {
    // `{}` non dice niente: la griglia del modello e il tool-calling strict vogliono
    // un `type`.
    assert.deepEqual(
      schemaJson(qualunque().forma).type,
      ['string', 'number', 'boolean', 'object', 'array', 'null'],
    )
  })

  it('lascia la porta aperta dove la forma sa di non saper nominare tutto', () => {
    // `entita` dichiara solo `id` e delega il resto al validatore del dominio: si
    // pubblica aperta, o un cliente rifiuterebbe da sé una Lezione intera.
    const json = schemaJson(entita({ cosa: 'Lezione' }).forma)
    assert.equal(json.type, 'object')
    assert.deepEqual(json.required, ['id'])
    assert.equal(json.additionalProperties, true)

    // Con `aperto` l'aiuto della riga di comando scrive i puntini.
    assert.match(schemi.formaInBreve(entita({ cosa: 'Lezione' }).forma), /…/)
    assert.doesNotMatch(schemi.formaInBreve(oggetto({ id: testo() }).forma), /…/)
  })

  it('un campo che ammette null lo dice nel «type», che diventa un elenco', () => {
    // La riga di comando legge qui se «5.5» è un numero o un testo: `type` è un
    // elenco.
    assert.deepEqual(schemaJson(nullabile(numero()).forma).type, ['number', 'null'])
    assert.deepEqual(schemaJson(nullabile(testo()).forma).type, ['string', 'null'])
    assert.equal(schemaJson(numero().forma).type, 'number')
  })

  it('una scelta nullabile mette il null anche nell’enum, o si contraddice', () => {
    // `type` ed `enum` si soddisfano tutti e due: con `null` nel `type`, `null` va
    // anche nell'`enum`, o lo schema vieta il valore che dice di accettare.
    const json = schemaJson(nullabile(scelta(['A', 'B'])).forma)
    assert.deepEqual(json.type, ['string', 'null'])
    assert.deepEqual(json.enum, ['A', 'B', null])

    // Una scelta non nullabile resta com'era.
    assert.deepEqual(schemaJson(scelta(['A', 'B']).forma).enum, ['A', 'B'])

    // Dentro un oggetto il campo è richiesto e nullabile insieme
    // (`anni.settimana.lettera`).
    const dentro = schemaJson(oggetto({ lettera: nullabile(scelta(['A', 'B'])) }).forma)
    assert.deepEqual(dentro.required, ['lettera'])
    assert.deepEqual(dentro.properties.lettera.enum, ['A', 'B', null])
  })
})
