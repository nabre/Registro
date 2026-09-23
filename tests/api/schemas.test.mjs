// La convalida da sola, senza archivio sotto.
//
// Quel che si difende qui è la rete che al registro mancava: un tipo
// TypeScript sparisce quando il programma gira, e un messaggio arriva da un
// webview, da un widget o da una riga di comando — tre sponde che il
// compilatore non ha mai guardato insieme. Se questa convalida lascia passare
// uno stato inventato o un numero che non è un numero, il dato storto non si
// ferma più: finisce nel JSON dell'anno e ci resta.
//
// Due cose si guardano con più attenzione delle altre. La prima è il
// *percorso* dell'errore: senza, chi chiama riceve «Serve un numero» e non sa
// di quale campo si parli, e `core.ts` ci costruisce sopra il campo della
// busta. La seconda è la differenza fra `opzionale` e `nullabile`, che non è
// una finezza: `presenze.campi` e `recupero.imposta` si comportano in due modi
// diversi a seconda che una chiave manchi o valga `null`, e confonderle vuol
// dire cancellare un dato che nessuno aveva chiesto di cancellare.

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
    // È il caso che conta davvero: un `parseFloat` di «quattro» dà NaN, NaN è
    // di tipo number, e senza questo controllo entrerebbe nell'archivio come
    // voto. Da lì in poi ogni media di quella classe è NaN.
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
    // Il messaggio elenca i valori buoni: chi chiama da fuori non ha lo schema
    // davanti, e «valore non valido» non gli direbbe che cosa scrivere.
    assert.match(problemi(segno, 'ottimo')[0].message, /positivo/)
  })
})

describe('le forme composte', () => {
  it('l’errore di un elenco porta l’indice della voce che non va', () => {
    const voti = elenco(numero())
    assert.deepEqual(percorsi(voti, [4, 'cinque', 6]), ['1'])

    // Dentro un elenco di oggetti l'indice e il campo si sommano: è così che
    // chi riceve l'errore sa quale riga del lotto riscrivere.
    const righe = elenco(oggetto({ allievoId: testo(), voto: numero() }))
    assert.deepEqual(
      percorsi(righe, [{ allievoId: 'alv-1', voto: 4 }, { allievoId: 'alv-2', voto: 'x' }]),
      ['1.voto'],
    )
    assert.equal(problemi(righe, 'non è un elenco').length, 1)
  })

  it('un oggetto scarta i campi in più invece di rifiutare tutto', () => {
    // La tolleranza è voluta e vale come per i file: un pannello più nuovo che
    // manda un campo che l'host non conosce ancora deve continuare a
    // funzionare per tutto il resto.
    const forma = oggetto({ lezioneId: testo() })
    assert.deepEqual(accettato(forma, { lezioneId: 'lez-1', novita: true }), { lezioneId: 'lez-1' })
  })

  it('un errore annidato porta il percorso campo.sottocampo', () => {
    const forma = oggetto({ scala: oggetto({ min: numero(), max: numero() }) })
    assert.deepEqual(percorsi(forma, { scala: { min: 1, max: 'sei' } }), ['scala.max'])
  })

  it('un oggetto raccoglie tutti i problemi e non si ferma al primo', () => {
    // Fermarsi al primo vuol dire far correggere un modulo un campo per volta:
    // chi chiama deve poter rimandare tutto giusto in un colpo.
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
    // Le due cose non coincidono mai per caso nel registro: un `valore: null` è
    // «non ancora messo», una chiave assente è «non sto dicendo niente di
    // questo campo, lascia com'era». `presenze.campi` scrive i minuti solo se
    // la chiave c'è, e `recupero.imposta` regge sulla stessa differenza.
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
    // Era la divergenza più costosa fra i due trasporti dello stesso
    // contratto. La griglia che obbliga il modello non sa fare un campo
    // facoltativo e gli fa scrivere `null` su tutti quelli che non vuole
    // usare; la finestra lo sapeva e ripuliva la busta prima di chiamare
    // (`senzaNulliDiTroppo`), la riga di comando no. La stessa domanda — «chi
    // ha più assenze in IV MEC A?» — rispondeva dalla finestra e dal terminale
    // tornava indietro con nove frasi di rifiuto per dei filtri che nessuno
    // aveva chiesto. Adesso la difesa è nel contratto, che è il solo posto che
    // i due trasporti hanno in comune.
    const filtri = oggetto({
      classeId: opzionale(identificatore()),
      corsoId: opzionale(identificatore()),
      dal: opzionale(iso()),
      quante: opzionale(numero({ intero: true })),
    })
    const busta = { classeId: null, corsoId: null, dal: null, quante: null }
    // Non solo passa: esce identica a quella vuota. Una chiave che restasse
    // presente con dentro `undefined` rimetterebbe la differenza fra «assente»
    // e «null» un gradino più in là, nel gestore che fa lo spread.
    assert.deepEqual(accettato(filtri, busta), {})
    assert.deepEqual(accettato(filtri, {}), {})
    assert.deepEqual(accettato(filtri, { classeId: 'cls-1', corsoId: null }), { classeId: 'cls-1' })
  })

  it('con opzionale(nullabile(...)) il null resta un valore e non diventa un silenzio', () => {
    // È il caso che rende sicura la riga qui sopra, ed è vivo:
    // `valutazioni.recupero.imposta` distingue «non sto dicendo niente della
    // riconsegna» da «togli la data di riconsegna». `opzionale` è il guscio di
    // fuori e vede il `null` per primo: se lo mangiasse sempre, la
    // cancellazione diventerebbe un silenzio e il dato resterebbe com'era.
    const recupero = oggetto({
      previstoIl: nullabile(iso()),
      riconsegnataIl: opzionale(nullabile(iso())),
    })
    assert.deepEqual(
      accettato(recupero, { previstoIl: null, riconsegnataIl: null }),
      { previstoIl: null, riconsegnataIl: null },
    )
    assert.deepEqual(accettato(recupero, { previstoIl: '2026-03-02' }), { previstoIl: '2026-03-02' })
    // E le tre combinazioni messe in fila, che è come si legge la regola:
    // `null` su `opzionale` sparisce, su `nullabile` resta, su
    // `opzionale(nullabile(...))` resta.
    assert.deepEqual(accettato(oggetto({ x: opzionale(testo()) }), { x: null }), {})
    assert.deepEqual(accettato(oggetto({ x: nullabile(testo()) }), { x: null }), { x: null })
    const coppia = oggetto({ x: opzionale(nullabile(testo())) })
    assert.deepEqual(accettato(coppia, { x: null }), { x: null })
  })

  it('le chiavi di troppo si sanno dire, anche quando si scartano', () => {
    // Scartarle in silenzio assoluto costa un dato perso e nessuno lo sa:
    // `recupero.imposta` chiamata con `riconsegnata` invece di
    // `riconsegnataIl` perdeva la chiave qui, il gestore vedeva `undefined` e
    // lasciava com'era, e la busta tornava `ok: true`. La tolleranza resta —
    // serve a un pannello più nuovo di chi lo ospita — ma adesso chi convalida
    // può *chiedere* che cosa è caduto, e decidere lui.
    const forma = oggetto({ riconsegnataIl: opzionale(iso()) }).forma
    assert.deepEqual(chiaviEstranee(forma, { riconsegnataIl: '2026-03-02' }), [])
    assert.deepEqual(chiaviEstranee(forma, { riconsegnata: '2026-03-02' }), ['riconsegnata'])
    // La differenza di maiuscole è una chiave diversa, e va detta come tale.
    assert.deepEqual(chiaviEstranee(forma, { RiconsegnataIl: 'x' }), ['RiconsegnataIl'])
    // Su una forma aperta non c'è niente da segnalare: lì i campi in più sono
    // il dato, non lo sbaglio di chi chiama.
    assert.deepEqual(chiaviEstranee(entita({ cosa: 'Lezione' }).forma, { id: 'lez-1', corsoId: 'cor-1' }), [])
    // E una chiave che porta il nome di un membro di Object.prototype non
    // passa per dichiarata: `'toString' in forma.campi` sarebbe vero.
    assert.deepEqual(chiaviEstranee(forma, { toString: 'x' }), ['toString'])
  })

  it('«severo» rifiuta le chiavi di troppo, e lo schema pubblicato lo dice', () => {
    // Spento resta il predefinito: se il silenzio vada rotto dipende dal
    // genere della procedura — su una scrittura una chiave scartata è un dato
    // perso, su una lettura è un filtro in meno — e il genere lo sa il nucleo.
    // Qui c'è l'interruttore, e la sua verità pubblicata.
    const tollerante = oggetto({ a: testo() })
    assert.deepEqual(accettato(tollerante, { a: 'x', b: 'scartato' }), { a: 'x' })
    assert.equal(schemaJson(tollerante.forma).additionalProperties, true)

    const severo = oggetto({ a: testo() }, { severo: true })
    assert.deepEqual(percorsi(severo, { a: 'x', b: 'scartato' }), ['b'])
    assert.deepEqual(accettato(severo, { a: 'x' }), { a: 'x' })
    assert.equal(schemaJson(severo.forma).additionalProperties, false)
  })

  it('qualunque vuole comunque un valore: «può mancare» lo dice opzionale', () => {
    // Accettare l'assenza rendeva facoltativo un campo che il contratto
    // dichiarava obbligatorio — `programma.salva.valore` — e lo schema
    // continuava a stamparlo in `required`. La dogana a valle lo fermava
    // comunque, ma un contratto che si salta un livello si scopre il giorno in
    // cui quel livello non c'è.
    const forma = oggetto({ chiave: testo(), valore: qualunque() })
    assert.deepEqual(percorsi(forma, { chiave: 'X' }), ['valore'])
    assert.deepEqual(accettato(forma, { chiave: 'X', valore: false }), { chiave: 'X', valore: false })
    assert.deepEqual(accettato(forma, { chiave: 'X', valore: null }), { chiave: 'X', valore: null })
    // Che possa mancare si dice così, e allora torna a mancare in pace.
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
    // `Date.UTC(anno, …)` mappa gli anni da 0 a 99 sul Novecento — è una
    // compatibilità di ECMAScript che nessuno può togliere — e ogni data dei
    // primi cent'anni si prendeva un «non è un giorno che esiste». Non è un
    // caso di laboratorio: `risolviPeriodo` usa `'0000-01-01'` come sentinella
    // quando non c'è un anno corrente, e le letture la rimandano nella busta.
    // Il modello leggeva `{"dal":"0000-01-01"}`, richiamava con quel valore, e
    // l'API rifiutava in ingresso un valore che aveva emesso lei in uscita.
    assert.equal(accettato(iso(), '0000-01-01'), '0000-01-01')
    assert.equal(accettato(iso(), '0099-12-31'), '0099-12-31')
    assert.equal(accettato(iso(), '0100-01-01'), '0100-01-01')
    assert.equal(accettato(iso(), '9999-12-31'), '9999-12-31')
    // E il merito si guarda ancora, agli estremi come in mezzo: il 29 febbraio
    // del 1 non esiste, quello del 2024 sì, quello del 2023 no.
    assert.equal(problemi(iso(), '0001-02-29').length, 1)
    assert.equal(accettato(iso(), '2024-02-29'), '2024-02-29')
    assert.equal(problemi(iso(), '2023-02-29').length, 1)
  })

  it('un identificatore torna ripulito, e la stringa vuota non passa', () => {
    // Il `trim()` serviva solo per decidere: `' cls-1 '` passava e arrivava
    // intero alla procedura, dove `find((c) => c.id === ' cls-1 ')` non trova
    // niente. Chi chiamava si prendeva un `non-trovato` su un id che esiste,
    // con il rimedio che lo mandava a ricercare un id che aveva già giusto.
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
    // È quel che si consegna a chi chiama da fuori al posto della
    // documentazione: se non dicesse il vero, la seconda sponda si scriverebbe
    // contro una forma che non è quella convalidata.
    const forma = oggetto({
      lezioneId: testo(),
      stato: scelta(['presente', 'assente']),
      nota: opzionale(testo({ massimo: 500 })),
    }).forma
    const json = schemaJson(forma)

    assert.equal(json.type, 'object')
    assert.deepEqual(json.required, ['lezioneId', 'stato'])
    // `additionalProperties: false` in JSON Schema non vuol dire «lo scarto»,
    // vuol dire «è invalido». Qui il runtime scarta e basta, quindi la porta si
    // pubblica aperta: il contratto smette di promettere un rifiuto che non fa.
    // Vedi la prova su «severo», dove il rifiuto c'è e la riga torna `false`.
    assert.equal(json.additionalProperties, true)
    assert.deepEqual(json.properties.stato, { type: 'string', enum: ['presente', 'assente'] })
    assert.equal(json.properties.nota.maxLength, 500)
  })

  it('traduce numeri, elenchi e testi con i loro limiti', () => {
    assert.equal(schemaJson(numero({ intero: true, minimo: 0 }).forma).type, 'integer')
    assert.equal(schemaJson(numero().forma).type, 'number')
    assert.deepEqual(schemaJson(elenco(numero()).forma), { type: 'array', items: { type: 'number' } })
    assert.equal(schemaJson(iso().forma).examples[0], '2026-09-21')
    // `minimo: 1` si pubblica come `minLength: 1`: un campo richiesto che
    // rifiuta la stringa vuota e non lo dichiara insegna a chi lo compone che
    // il contratto non si legge.
    assert.equal(schemaJson(testo({ minimo: 1 }).forma).minLength, 1)
    assert.equal(schemaJson(testo().forma).minLength, undefined)
  })

  it('un identificatore pubblica il minimo che applica, e nessun esempio inventato', () => {
    // Lo schema era più largo del controllo: taceva il rifiuto della stringa
    // vuota, quindi `""` era valido per il contratto pubblicato e rifiutato dal
    // controllo — lo stesso difetto che il commento di `identificatore`
    // dichiara risolto, rimasto nell'altra direzione.
    const json = schemaJson(identificatore().forma)
    assert.equal(json.minLength, 1)
    assert.equal(json.maxLength, 64)
    // L'esempio fisso era `lez-m3k9x2-a7f1` su tutti i campi id del catalogo,
    // e `lez-` è il prefisso delle lezioni: `classeId` e `corsoId` portavano un
    // esempio sbagliato *di forma*. Chi ha un esempio vero lo passa; il
    // predefinito non mente più.
    assert.equal(json.examples, undefined)
    assert.match(json.description, /elenco/)
    assert.deepEqual(schemaJson(identificatore({ esempio: 'cls-m3k9x2-a7f1' }).forma).examples, ['cls-m3k9x2-a7f1'])
  })

  it('qualunque si pubblica come l’unione dei tipi JSON, non come schema vuoto', () => {
    // `{}` è vero per qualunque cosa e non dice niente a nessuno: la griglia
    // che obbliga il modello non ci legge un tipo e ripiega sul testo, e una
    // modalità strict di tool-calling uno schema senza `type` non lo prende.
    assert.deepEqual(
      schemaJson(qualunque().forma).type,
      ['string', 'number', 'boolean', 'object', 'array', 'null'],
    )
  })

  it('lascia la porta aperta dove la forma sa di non saper nominare tutto', () => {
    // `entita` dichiara il solo `id` e delega il resto al validatore del
    // dominio. Pubblicarla come un oggetto chiuso diceva a chi chiama da fuori
    // che una Lezione intera — corso, giorno, fasce, appello — non è una
    // Lezione: un cliente che avesse convalidato il proprio ingresso contro il
    // contratto si sarebbe rifiutato da solo di mandare il dato buono.
    const json = schemaJson(entita({ cosa: 'Lezione' }).forma)
    assert.equal(json.type, 'object')
    assert.deepEqual(json.required, ['id'])
    assert.equal(json.additionalProperties, true)

    // Con `aperto` l'aiuto della riga di comando scrive i puntini: è l'unico
    // posto in cui «l'elenco non finisce qui» si vede ancora, da quando
    // `additionalProperties` racconta il rifiuto invece dell'elenco.
    assert.match(schemi.formaInBreve(entita({ cosa: 'Lezione' }).forma), /…/)
    assert.doesNotMatch(schemi.formaInBreve(oggetto({ id: testo() }).forma), /…/)
  })

  it('un campo che ammette null lo dice nel «type», che diventa un elenco', () => {
    // Non è una finezza di forma: la riga di comando decide da questo se
    // «5.5» è il numero cinque e mezzo o il testo «5.5», e leggendo un elenco
    // come se fosse una parola mandava il testo al posto del numero.
    assert.deepEqual(schemaJson(nullabile(numero()).forma).type, ['number', 'null'])
    assert.deepEqual(schemaJson(nullabile(testo()).forma).type, ['string', 'null'])
    assert.equal(schemaJson(numero().forma).type, 'number')
  })

  it('una scelta nullabile mette il null anche nell’enum, o si contraddice', () => {
    // In JSON Schema `type` ed `enum` sono congiunti: si soddisfano tutti e
    // due. Uno schema `{"type":["string","null"],"enum":["A","B"]}` fa passare
    // `null` dal `type` e lo fa fallire nell'`enum`, cioè **vieta esattamente
    // il valore che la sua stessa descrizione dice di mandare**. Quattro campi
    // veri: la lettera della settimana, il segno di comportamento, la vista del
    // contesto, l'apertura della proiezione — e da un client generato dal
    // catalogo «togli la lettera alla settimana» era irraggiungibile.
    const json = schemaJson(nullabile(scelta(['A', 'B'])).forma)
    assert.deepEqual(json.type, ['string', 'null'])
    assert.deepEqual(json.enum, ['A', 'B', null])

    // E una scelta che non ammette null resta com'era: il permesso si dà dove
    // è stato chiesto, non dappertutto.
    assert.deepEqual(schemaJson(scelta(['A', 'B']).forma).enum, ['A', 'B'])

    // Dentro un oggetto il campo resta richiesto e nullabile insieme, che è il
    // caso di `anni.settimana.lettera`.
    const dentro = schemaJson(oggetto({ lettera: nullabile(scelta(['A', 'B'])) }).forma)
    assert.deepEqual(dentro.required, ['lettera'])
    assert.deepEqual(dentro.properties.lettera.enum, ['A', 'B', null])
  })
})
