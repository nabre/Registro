// Il nucleo: dove una chiamata si convalida, si esegue, si cronometra e va nel
// giornale.
//
// **Si valida prima di scrivere**: un ingresso storto a una procedura che
// scrive non muove il contatore dell'archivio. E il nucleo non lancia mai: quel
// che va storto torna in `{ ok: false, codice, messaggi }`, senza stack.
//
// Serve un archivio vero su una cartella temporanea: metà delle garanzie parla
// di scritture.

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-nucleo-')

let api
let archivio

/** Il nome della persona che si manda negli ingressi: il giornale non deve averlo. */
const NOME = 'Rossi Maria'

/**
 * Esegue qualcosa con la console zittita: i guasti provocati apposta non
 * sporcano l'uscita di `node --test`.
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
  ;({ api, archivio } = await archivioDiProva({ lavoro, dati, registra: false }))
  const { definisci, ErroreApi, registra, SCRITTURA, schemi } = api

  // Le procedure finte (`finta.*`), registrate una volta qui: esercitano il
  // nucleo senza dipendere da una procedura vera.
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
        // Un `ErroreApi` da un altro bundle (lo stesso file caricato due volte):
        // `instanceof` direbbe di no.
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

after(() => smonta(radice, archivio))

describe('quel che torna quando non si può fare', () => {
  it('una procedura sconosciuta torna una busta, non un’eccezione', async () => {
    // Un nome sconosciuto è un rifiuto leggibile, non «gestore is not a function».
    const esito = await api.chiama(archivio, 'ore.appello.quelchenonce', {})
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'procedura-sconosciuta')
    assert.match(esito.messaggi[0], /ore\.appello\.quelchenonce/)
  })

  it('un ingresso storto si ferma prima di toccare l’archivio', async () => {
    // Si valida prima: la procedura *scrive* davvero, quindi il contatore si
    // muoverebbe se la convalida arrivasse dopo.
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
    // Lo stack va nel giornale e nella console; la busta porta una riga sola.
    const esito = await muta(() => api.chiama(archivio, 'finta.esplode', {}))
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'interno')
    assert.equal(esito.messaggi.length, 1)
    const detto = esito.messaggi.join(' ')
    assert.doesNotMatch(detto, /\n\s+at /, 'lo stack è finito nei messaggi')
    assert.doesNotMatch(detto, /dist-tests|\.mjs/, 'un nome di file è finito nei messaggi')
  })

  it('un rifiuto costruito da un’altra copia del modulo resta un rifiuto', async () => {
    // Un `ErroreApi` di un'altra istanza del modulo si riconosce per struttura, o
    // diventerebbe `interno` perdendo il **rimedio** per il modello.
    const esito = await api.chiama(archivio, 'finta.rifiutaDaLontano', {})
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'non-trovato', 'un rifiuto è diventato un guasto interno')
    assert.equal(esito.campo, 'classeId')
    assert.match(esito.messaggi.join(' '), /classi\.elenco/, 'il rimedio si è perso per strada')
  })

  it('una scrittura riuscita che risponde storto dice che qualcosa è successo', async () => {
    // L'uscita si convalida **dopo** `esegui`: la scrittura è già avvenuta quando
    // la busta torna `interno`. `modifiche` dice a chi chiama di non ritentare
    // alla cieca una procedura non idempotente.
    const prima = archivio.revisione
    const esito = await muta(() => api.chiama(archivio, 'finta.scriveEMente', { minuti: 11 }))
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'interno')
    assert.equal(archivio.revisione, prima + 1, 'la scrittura non è avvenuta: la prova non prova niente')
    assert.equal(esito.modifiche, 1, 'la busta non dice che l’archivio è stato toccato')
    assert.equal(esito.revisione, archivio.revisione)
  })

  it('una chiamata rifiutata porta la versione della procedura e zero modifiche', async () => {
    // La versione c'è anche sui rifiuti: chi riceve `ingresso-non-valido` deve
    // sapere se parla della stessa procedura.
    const esito = await api.chiama(archivio, 'finta.scriveEMente', { minuti: 9000 })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'ingresso-non-valido')
    assert.equal(esito.versione, 4)
    assert.equal(esito.modifiche, 0, 'un rifiuto di convalida non ha toccato niente')
  })

  it('una procedura che non rispetta la propria uscita torna «interno»', async () => {
    // Una risposta fuori contratto è colpa del registro, non di chi chiama: non
    // `rifiutato`.
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
    // Il tracciato passa intatto: lega una chiamata a quella che l'ha causata.
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

    // Nel giornale non vanno nomi di persone: la spia riceve la busta, non
    // l'ingresso.
    const scritto = JSON.stringify(voci)
    assert.doesNotMatch(scritto, /Rossi|Maria/, 'un nome di persona è finito nel giornale')
    assert.doesNotMatch(scritto, /"chi"/, 'un campo dell’ingresso è finito nel giornale')
  })

  it('un nome inventato non si conta fra le letture', async () => {
    // Una procedura sconosciuta non ha genere: i nomi inventati non si contano fra
    // le letture.
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
    // Chi osserva non può far cadere la chiamata.
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
    // Lo stesso modulo registrato due volte è innocuo; due procedure *diverse* con
    // lo stesso nome no.
    const gia = api.procedura('finta.scrive')
    assert.ok(gia, 'la procedura finta non è nell’elenco')
    assert.doesNotThrow(() => api.registra(gia))

    const sosia = api.definisci({ ...gia, titolo: 'Un’altra cosa con lo stesso nome' })
    assert.throws(() => api.registra(sosia), /finta\.scrive/)
    assert.equal(api.procedura('finta.scrive'), gia, 'l’elenco è stato sovrascritto lo stesso')
  })

  it('o entrano tutte o non entra nessuna', () => {
    // Un duplicato non lascia la mappa **popolata a metà**: si controlla tutto
    // prima di registrare.
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
    // Il condotto intercetta i metodi `$…`: una procedura con quel nome sarebbe
    // elencata e irraggiungibile.
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
