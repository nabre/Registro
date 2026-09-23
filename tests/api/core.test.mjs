// Il nucleo: l'unico punto in cui una chiamata viene convalidata, eseguita,
// cronometrata e scritta nel giornale.
//
// L'invariante che questo file difende sopra ogni altra è una riga sola: **si
// valida prima di scrivere**. È la regola che il centralino tiene da sempre —
// «se la validazione non passa non si scrive niente» — e passandola al livello
// API vale anche per chi arriva da fuori dal pannello, dove non c'è nessuna
// schermata a filtrare quel che si batte. Qui la si prova nel modo in cui
// conta: si manda un ingresso storto a una procedura che *scrive*, e si guarda
// che il contatore di modifiche dell'archivio non si sia mosso di uno.
//
// L'altra metà è la busta. Il nucleo non lancia mai: quel che va storto torna
// dentro `{ ok: false, codice, messaggi }`, e un chiamante che non è un webview
// — una riga di comando, un condotto — deve poterci contare. Una procedura che
// esplode non deve far esplodere chi l'ha chiamata, e non deve consegnargli lo
// stack di un guasto interno.
//
// Serve un archivio vero su una cartella temporanea, come in
// `tests/data/sorting.test.mjs`: metà di quel che il nucleo garantisce
// parla di scritture, e un archivio finto non saprebbe contarle.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-api-nucleo-'))
const lavoro = percorso.join(radice, 'lavoro')
const dati = percorso.join(lavoro, 'registro')
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

let api
let archivio

/** Il nome della persona che si manda negli ingressi: il giornale non deve averlo. */
const NOME = 'Rossi Maria'

/**
 * Esegue qualcosa con la console zittita.
 *
 * Il nucleo racconta i guasti interni a `console.error` — ed è giusto che lo
 * faccia — ma le prove che quei guasti li provocano apposta non devono
 * sporcare l'uscita di `node --test` con stack finti.
 */
async function muta (fare) {
  const prima = console.error
  console.error = () => {}
  try {
    return await fare()
  } finally {
    console.error = prima
  }
}

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(dati, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify({ cartellaLavoro: lavoro }),
  )

  api = await import('../../dist-tests/api.mjs')
  const { Archivio, Uri, creaAnno, definisci, ErroreApi, registra, SCRITTURA, schemi } = api

  archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  await archivio.apri(null)
  await archivio.creaAnno(
    creaAnno('2026-09-01', '2027-06-30'),
    Uri.file(percorso.join(dati, '2026-2027.registro')),
  )

  // Le procedure finte di questo file: servono a esercitare il nucleo senza
  // legarlo a quel che una procedura vera fa oggi. Sono registrate una volta
  // sola, qui, e i loro nomi cominciano tutti con `finta.`.
  registra(
    definisci({
      nome: 'finta.scrive',
      versione: 1,
      genere: 'scrittura',
      titolo: 'Scrive una nota nelle impostazioni, per avere una scrittura vera',
      idempotente: true,
      collezioni: ['registro'],
      ingresso: schemi.oggetto({
        chi: schemi.testo({ minimo: 1 }),
        minuti: schemi.numero({ intero: true, minimo: 0, massimo: 600 }),
      }),
      uscita: SCRITTURA,
      esegui: (ambito, ingresso) => {
        ambito.contesto.modifica((r) => {
          r.impostazioni.durataPausaPredefinita = ingresso.minuti
        }, ['registro'])
        return { revisione: ambito.contesto.archivio.revisione }
      },
    }),
    definisci({
      nome: 'finta.rifiuta',
      versione: 1,
      genere: 'lettura',
      titolo: 'Lancia un ErroreApi con un codice suo',
      idempotente: true,
      ingresso: schemi.vuoto(),
      uscita: schemi.vuoto(),
      esegui: () => {
        throw new ErroreApi('conflitto', 'Il file su disco non è più quello letto.', 'documento')
      },
    }),
    definisci({
      nome: 'finta.esplode',
      versione: 1,
      genere: 'lettura',
      titolo: 'Lancia un Error qualunque, come farebbe un difetto vero',
      idempotente: true,
      ingresso: schemi.vuoto(),
      uscita: schemi.vuoto(),
      esegui: () => {
        throw new TypeError('non si legge una proprietà di undefined')
      },
    }),
    definisci({
      nome: 'finta.scriveEMente',
      versione: 4,
      genere: 'scrittura',
      titolo: 'Scrive davvero, e poi risponde in una forma che non è la sua',
      idempotente: false,
      collezioni: ['registro'],
      ingresso: schemi.oggetto({
        minuti: schemi.numero({ intero: true, minimo: 0, massimo: 600 }),
      }),
      uscita: SCRITTURA,
      esegui: (ambito, ingresso) => {
        ambito.contesto.modifica((r) => {
          r.impostazioni.durataPausaPredefinita = ingresso.minuti
        }, ['registro'])
        // La scrittura è un fatto compiuto; la busta no.
        return { revisione: 'parecchie' }
      },
    }),
    definisci({
      nome: 'finta.rifiutaDaLontano',
      versione: 1,
      genere: 'lettura',
      titolo: 'Lancia un rifiuto costruito da un’altra copia del modulo',
      idempotente: true,
      ingresso: schemi.vuoto(),
      uscita: schemi.vuoto(),
      esegui: () => {
        // Non `ErroreApi` di *questo* bundle: è quel che succede quando lo
        // stesso file arriva da due strade, cioè il caso che `registra()`
        // dichiara ricorrente. `instanceof` qui direbbe di no.
        class ErroreApiDiUnAltroBundle extends Error {
          constructor () {
            super('Classe non trovata.')
            this.name = 'ErroreApi'
            this.codice = 'non-trovato'
            this.messaggi = ['Classe non trovata.', 'Le classi dell’anno le elenca «classi.elenco».']
            this.campo = 'classeId'
          }
        }
        throw new ErroreApiDiUnAltroBundle()
      },
    }),
    definisci({
      nome: 'finta.bugiarda',
      versione: 1,
      genere: 'lettura',
      titolo: 'Risponde qualcosa di diverso da quel che dichiara',
      idempotente: true,
      ingresso: schemi.vuoto(),
      uscita: schemi.oggetto({ quante: schemi.numero({ intero: true }) }),
      esegui: () => ({ quante: 'parecchie' }),
    }),
  )
})

after(() => {
  archivio?.dispose()
  rmSync(radice, { recursive: true, force: true })
})

describe('quel che torna quando non si può fare', () => {
  it('una procedura sconosciuta torna una busta, non un’eccezione', async () => {
    // È la differenza fra un pannello vecchio che riceve un rifiuto leggibile e
    // un host che cade con «gestore is not a function».
    const esito = await api.chiama(archivio, 'ore.appello.quelchenonce', {})
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'procedura-sconosciuta')
    assert.match(esito.messaggi[0], /ore\.appello\.quelchenonce/)
  })

  it('un ingresso storto si ferma prima di toccare l’archivio', async () => {
    // L'invariante che regge tutto il livello: si valida prima, e se non passa
    // il registro resta esattamente com'era. La procedura chiamata qui *scrive*
    // davvero, quindi il contatore si muoverebbe se la convalida arrivasse
    // dopo.
    const prima = archivio.revisione
    const esito = await api.chiama(archivio, 'finta.scrive', { chi: NOME, minuti: 9000 })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'ingresso-non-valido')
    assert.equal(esito.campo, 'minuti')
    assert.equal(archivio.revisione, prima, 'l’archivio è stato toccato da un ingresso non valido')
  })

  it('un ErroreApi porta fuori il suo codice e il suo campo', async () => {
    const esito = await api.chiama(archivio, 'finta.rifiuta', {})
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'conflitto')
    assert.equal(esito.campo, 'documento')
    assert.deepEqual(esito.messaggi, ['Il file su disco non è più quello letto.'])
  })

  it('un guasto imprevisto diventa «interno», e lo stack non esce', async () => {
    // Lo stack va nel giornale e nella console, non sullo schermo di un docente
    // in mezzo a un appello: quel che torna è una riga sola.
    const esito = await muta(() => api.chiama(archivio, 'finta.esplode', {}))
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'interno')
    assert.equal(esito.messaggi.length, 1)
    const detto = esito.messaggi.join(' ')
    assert.doesNotMatch(detto, /\n\s+at /, 'lo stack è finito nei messaggi')
    assert.doesNotMatch(detto, /dist-tests|\.mjs/, 'un nome di file è finito nei messaggi')
  })

  it('un rifiuto costruito da un’altra copia del modulo resta un rifiuto', async () => {
    // `instanceof ErroreApi` era fragile proprio nel caso che `registra()`
    // dichiara ricorrente — «un file caricato due volte, cosa che i bundle
    // separati delle prove fanno davvero». Con due istanze del modulo, un
    // `errore.nonTrovato(...)` diventava `codice: 'interno'`, e con lui si
    // perdeva il **rimedio**: la frase che dice al modello quale attrezzo
    // chiamare al posto di quello che ha sbagliato. Si riconosce per struttura.
    const esito = await api.chiama(archivio, 'finta.rifiutaDaLontano', {})
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'non-trovato', 'un rifiuto è diventato un guasto interno')
    assert.equal(esito.campo, 'classeId')
    assert.match(esito.messaggi.join(' '), /classi\.elenco/, 'il rimedio si è perso per strada')
  })

  it('una scrittura riuscita che risponde storto dice che qualcosa è successo', async () => {
    // Il caso peggiore di questo file: l'uscita si convalida **dopo** `esegui`,
    // quindi la scrittura è già avvenuta quando la busta torna `interno`. E
    // `interno` non è un rifiuto: uno script scritto bene ritenta — e questa
    // procedura, come trenta delle scritture vere, dichiara `idempotente:
    // false`. `modifiche` è l'unica cosa che gli dica di non ritentare alla
    // cieca.
    const prima = archivio.revisione
    const esito = await muta(() => api.chiama(archivio, 'finta.scriveEMente', { minuti: 11 }))
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'interno')
    assert.equal(archivio.revisione, prima + 1, 'la scrittura non è avvenuta: la prova non prova niente')
    assert.equal(esito.modifiche, 1, 'la busta non dice che l’archivio è stato toccato')
    assert.equal(esito.revisione, archivio.revisione)
  })

  it('una chiamata rifiutata porta la versione della procedura e zero modifiche', async () => {
    // La versione stava solo sul ramo riuscito, cioè arrivava quando non
    // serviva più: chi riceve `ingresso-non-valido` è esattamente chi si deve
    // chiedere se sta parlando della stessa procedura.
    const esito = await api.chiama(archivio, 'finta.scriveEMente', { minuti: 9000 })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'ingresso-non-valido')
    assert.equal(esito.versione, 4)
    assert.equal(esito.modifiche, 0, 'un rifiuto di convalida non ha toccato niente')
  })

  it('una procedura che non rispetta la propria uscita torna «interno»', async () => {
    // Non è colpa di chi ha chiamato, ed è per questo che il codice non è
    // `rifiutato`: è il registro che ha risposto fuori contratto, e lasciar
    // passare la busta vorrebbe dire scoprirlo dall'altra parte.
    const esito = await muta(() => api.chiama(archivio, 'finta.bugiarda', {}))
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'interno')
  })
})

describe('la busta', () => {
  it('porta sempre api, procedura e tracciato, comunque sia andata', async () => {
    const bene = await api.chiama(archivio, 'finta.scrive', { chi: NOME, minuti: 15 })
    const male = await api.chiama(archivio, 'finta.scrive', { chi: '', minuti: 15 })

    for (const esito of [bene, male]) {
      assert.equal(esito.api, api.VERSIONE_API)
      assert.equal(esito.procedura, 'finta.scrive')
      assert.equal(typeof esito.tracciato, 'string')
      assert.ok(esito.tracciato.length > 0)
    }
    assert.equal(bene.ok, true)
    assert.equal(bene.versione, 1)
    assert.equal(male.ok, false)
  })

  it('rispetta il tracciato che le si passa, invece di farsene uno suo', async () => {
    // È quel che permette di legare una chiamata a quella che l'ha causata: un
    // tracciato riscritto qui spezzerebbe la catena proprio dove serve.
    const esito = await api.chiama(
      archivio,
      'finta.scrive',
      { chi: NOME, minuti: 20 },
      { tracciato: 'trc-di-prova', origine: 'prova' },
    )
    assert.equal(esito.tracciato, 'trc-di-prova')
  })
})

describe('il giornale', () => {
  it('annota ogni chiamata, riuscita o no, e non ci mette dentro l’ingresso', async () => {
    const voci = []
    const stacca = api.osserva((voce) => voci.push(voce))
    try {
      await api.chiama(archivio, 'finta.scrive', { chi: NOME, minuti: 25 }, { origine: 'prova' })
      await api.chiama(archivio, 'finta.scrive', { chi: NOME, minuti: -1 }, { origine: 'prova' })
    } finally {
      stacca()
    }

    assert.equal(voci.length, 2)
    const [riuscita, fallita] = voci

    assert.equal(riuscita.ok, true)
    assert.equal(riuscita.procedura, 'finta.scrive')
    assert.equal(riuscita.origine, 'prova')
    assert.equal(riuscita.genere, 'scrittura')
    assert.equal(riuscita.modifiche, 1, 'una scrittura riuscita vale una modifica')
    assert.equal(typeof riuscita.durataMs, 'number')
    assert.ok(riuscita.durataMs >= 0)

    assert.equal(fallita.ok, false)
    assert.equal(fallita.codice, 'ingresso-non-valido')
    assert.equal(fallita.modifiche, 0, 'una chiamata rifiutata non ha modificato niente')

    // La voce di giornale finisce in un file che qualcuno leggerà: dentro non
    // ci vanno nomi di persone. È il motivo per cui la spia riceve la busta e
    // non l'ingresso.
    const scritto = JSON.stringify(voci)
    assert.doesNotMatch(scritto, /Rossi|Maria/, 'un nome di persona è finito nel giornale')
    assert.doesNotMatch(scritto, /"chi"/, 'un campo dell’ingresso è finito nel giornale')
  })

  it('un nome inventato non si conta fra le letture', async () => {
    // Qui c'era `genere: 'lettura'` messo per comodità, perché il campo era
    // obbligatorio. Chi contava le chiamate per genere contava così i nomi
    // inventati fra le letture — e un nome inventato è il primo modo in cui un
    // modello sbaglia, cioè proprio la riga che si va a cercare nel giornale.
    const voci = []
    const stacca = api.osserva((voce) => voci.push(voce))
    try {
      await api.chiama(archivio, 'finta.quelchenonce', {}, { origine: 'assistente' })
    } finally {
      stacca()
    }
    assert.equal(voci.length, 1)
    assert.equal(voci[0].codice, 'procedura-sconosciuta')
    assert.equal(voci[0].genere, undefined, 'un nome inventato è stato contato come una lettura')
  })

  it('smette di annotare quando la spia si stacca', async () => {
    const voci = []
    const stacca = api.osserva((voce) => voci.push(voce))
    await api.chiama(archivio, 'finta.scrive', { chi: NOME, minuti: 30 })
    stacca()
    await api.chiama(archivio, 'finta.scrive', { chi: NOME, minuti: 35 })
    assert.equal(voci.length, 1)
  })

  it('una spia che si rompe non fa fallire la chiamata che stava guardando', async () => {
    // Guardare non è partecipare: chi osserva non deve poter far cadere
    // l'appello di chi sta lavorando.
    const stacca = api.osserva(() => {
      throw new Error('la spia è rotta')
    })
    try {
      const esito = await api.chiama(archivio, 'finta.scrive', { chi: NOME, minuti: 40 })
      assert.equal(esito.ok, true)
    } finally {
      stacca()
    }
  })
})

describe('l’elenco delle procedure', () => {
  it('accetta la stessa procedura due volte e rifiuta due omonime diverse', () => {
    // Lo stesso modulo può arrivare da due strade nei bundle delle prove:
    // registrarlo due volte deve essere innocuo. Due procedure *diverse* con lo
    // stesso nome invece no — senza questo controllo una sovrascriverebbe
    // l'altra, e nessuno se ne accorgerebbe finché non cambia una delle due.
    const gia = api.procedura('finta.scrive')
    assert.ok(gia, 'la procedura finta non è nell’elenco')
    assert.doesNotThrow(() => api.registra(gia))

    const sosia = api.definisci({ ...gia, titolo: 'Un’altra cosa con lo stesso nome' })
    assert.throws(() => api.registra(sosia), /finta\.scrive/)
    assert.equal(api.procedura('finta.scrive'), gia, 'l’elenco è stato sovrascritto lo stesso')
  })

  it('o entrano tutte o non entra nessuna', () => {
    // Il `throw` stava in mezzo al ciclo: le procedure prima del duplicato
    // restavano registrate, quelle dopo no. E `registraTutte()` la chiamano il
    // condotto e il ponte, quindi un'eccezione da lì lasciava la mappa
    // **popolata a metà** — il registro partiva con un sottoinsieme arbitrario
    // di azioni sotto contratto, le altre cadevano sul gestore vecchio, e
    // nessuno lo diceva.
    const gia = api.procedura('finta.scrive')
    const buona = api.definisci({ ...gia, nome: 'finta.chearriverebbeprima' })
    const sosia = api.definisci({ ...gia, titolo: 'Un’altra cosa con lo stesso nome' })

    assert.throws(() => api.registra(buona, sosia), /finta\.scrive/)
    assert.equal(
      api.procedura('finta.chearriverebbeprima'),
      undefined,
      'una procedura è entrata lo stesso, prima che il ciclo si fermasse',
    )
  })

  it('due omonime nella stessa chiamata si vedono anche se la mappa è vuota', () => {
    const gia = api.procedura('finta.scrive')
    const una = api.definisci({ ...gia, nome: 'finta.gemella' })
    const altra = api.definisci({ ...gia, nome: 'finta.gemella', titolo: 'L’altra' })
    assert.throws(() => api.registra(una, altra), /finta\.gemella/)
    assert.equal(api.procedura('finta.gemella'), undefined)
  })

  it('un nome che comincia con «$» non entra', () => {
    // Il condotto intercetta ogni metodo `$…` prima di smistare: una procedura
    // chiamata così comparirebbe in `$elenco` e in `resources/tools.json` e
    // risponderebbe **sempre** `procedura-sconosciuta`. Visibile e
    // irraggiungibile insieme, che è il modo più lento di accorgersene.
    const gia = api.procedura('finta.scrive')
    assert.throws(() => api.registra(api.definisci({ ...gia, nome: '$finta' })), /\$finta/)
    assert.equal(api.procedura('$finta'), undefined)
  })

  it('descrive una procedura senza mostrarne il lavoro', () => {
    const ritratto = api.descrivi(api.procedura('finta.scrive'))
    assert.equal(ritratto.nome, 'finta.scrive')
    assert.equal(ritratto.genere, 'scrittura')
    assert.equal(ritratto.idempotente, true)
    assert.equal(ritratto.esegui, undefined)
  })
})
