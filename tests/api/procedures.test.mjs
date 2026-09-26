// Le procedure più chiamate (appello, comportamento, voti, letture) contro una
// scuola vera. Si difendono tre cose:
//   1. gli stati dello schema combaciano con quelli del dominio (`lexicon.ts`);
//   2. uno stato inventato non entra nell'archivio, da nessuna sponda;
//   3. i **tre denominatori** di `corso.presenze`: assenza sulle UD previste
//      dall'orario, presenza su quelle con l'appello fatto. I numeri sono scelti
//      perché i conti non si assomiglino.

import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import * as percorso from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

import { archivioDiProva, cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-procedure-')

let api
let lessico
let archivio
let corso
let classe
let rossi
let bianchi
let estraneo
/** Le tre ore di settembre: due con l'appello fatto, la terza intatta apposta. */
let prima
let seconda
let terza
let momento

/**
 * Il martedì dell'orario. Settembre 2026 ha cinque martedì e una fascia da 90'
 * vale due UD: dieci UD previste, sei a calendario (tre ore), quattro con
 * l'appello.
 */
const MARTEDI = 2
const DAL = '2026-09-01'
const AL = '2026-09-30'

/** La lezione com'è adesso nell'archivio: si rilegge, non si tiene la copia. */
function oraDi (lezione) {
  return archivio.registro.lezioni.find((l) => l.id === lezione.id)
}

/** L'appello di una persona su un'ora, o null se non ha ancora una riga. */
function rigaDi (lezione, allievoId) {
  return oraDi(lezione).presenze.find((p) => p.allievoId === allievoId) ?? null
}

before(async () => {
  ;({ api, archivio } = await archivioDiProva({ lavoro, dati, dal: DAL, registra: false }))
  // Il lessico dal bundle del dominio: è l'originale di cui lo schema è la copia.
  ;({ lessico } = await import('../../dist-tests/domain.mjs'))

  api.registraTutte()

  const {
    creaAllievo, creaClasse, creaCorso,
    creaLezione, creaMateria, creaSlot, creaValutazione,
  } = api

  const annoId = archivio.registro.anni[0].id

  classe = creaClasse(annoId, 'I MEC A')
  rossi = creaAllievo('Rossi', 'Maria')
  bianchi = creaAllievo('Bianchi', 'Luca')
  const verdi = creaAllievo('Verdi', 'Anna')
  classe.allievi.push(rossi, bianchi, verdi)

  // Una seconda classe per avere un allievoId buono ma non di questo corso.
  const altra = creaClasse(annoId, 'II MEC B')
  estraneo = creaAllievo('Neri', 'Ugo')
  altra.allievi.push(estraneo)

  const materia = creaMateria('Matematica')
  corso = creaCorso(classe.id, materia.id, 'Matematica — I MEC A')
  corso.orario = [{ id: 'ric-prova-0001', giorno: MARTEDI, inizio: '08:20', durataMin: 90, aula: '' }]

  prima = creaLezione(corso.id, '2026-09-01', '08:20', 90)
  seconda = creaLezione(corso.id, '2026-09-08', '08:20', 90)
  terza = creaLezione(corso.id, '2026-09-15', '08:20', 90)
  // Due UD dette a slot invece che a minuti, come arriva un'ora spezzata dal
  // calendario: si contano uguale.
  seconda.slot = [creaSlot('08:20', 45), creaSlot('09:05', 45)]

  momento = creaValutazione(corso.id, 'Verifica sui numeri', undefined, '2026-09-10')

  archivio.modifica((r) => {
    r.classi.push(classe, altra)
    r.materie.push(materia)
    r.corsi.push(corso)
    r.lezioni.push(prima, seconda, terza)
    r.valutazioni.push(momento)
  }, ['classi', 'corsi', 'lezioni', 'valutazioni', 'registro'])
})

after(() => smonta(radice, archivio))

describe('la regola-guardia sugli stati', () => {
  it('gli stati dell’appello dello schema sono quelli del dominio, esattamente', () => {
    // Gli elenchi di `api/procedure/ore.ts` sono scritti a mano (lo schema vuole i
    // valori quando compila): uno stato aggiunto al modello e dimenticato qui
    // sarebbe rifiutato dalla convalida.
    assert.deepEqual(api.STATI_APPELLO, api.STATI_PRESENZA.map((s) => s.valore))
  })

  it('gli stati dell’ora dello schema sono quelli del dominio, esattamente', () => {
    // Lo stesso per `lessico.STATI_LEZIONE`.
    assert.deepEqual(api.STATI_LEZIONE, Object.keys(lessico.STATI_LEZIONE))
  })
})

describe('ore.appello.riga', () => {
  it('scrive davvero l’appello, e riscriverlo uguale lascia le stesse caselle', async () => {
    // `idempotente: true` è dichiarato, non dedotto, e permette di ritentare:
    // quindi si verifica.
    const uno = await api.chiama(archivio, 'ore.appello.riga', {
      lezioneId: prima.id, allievoId: rossi.id, stato: 'assente',
    })
    assert.equal(uno.ok, true, JSON.stringify(uno))
    assert.deepEqual(rigaDi(prima, rossi.id).stati, ['assente', 'assente'])

    const due = await api.chiama(archivio, 'ore.appello.riga', {
      lezioneId: prima.id, allievoId: rossi.id, stato: 'assente',
    })
    assert.equal(due.ok, true)
    assert.deepEqual(rigaDi(prima, rossi.id).stati, ['assente', 'assente'])
    // Le altre righe nascono mute: segnare una persona non segna la classe.
    assert.deepEqual(rigaDi(prima, bianchi.id).stati, ['non-impostato', 'non-impostato'])
  })

  it('uno stato inventato non entra, e non lascia niente dietro di sé', async () => {
    // Il tipo `StatoPresenza` non arriva al condotto né alla riga di comando: la
    // convalida sì.
    const revisione = archivio.revisione
    const prese = JSON.stringify(oraDi(seconda).presenze)

    const esito = await api.chiama(archivio, 'ore.appello.riga', {
      lezioneId: seconda.id, allievoId: rossi.id, stato: 'boh',
    })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'ingresso-non-valido')
    assert.equal(esito.campo, 'stato')
    assert.equal(archivio.revisione, revisione)
    assert.equal(JSON.stringify(oraDi(seconda).presenze), prese)
  })

  it('un’ora che non c’è più è «non-trovato», non «rifiutato»', async () => {
    // «Non c'è più» si ritenta dopo aver riletto, «non si può» mai: i due codici
    // non si confondono.
    const esito = await api.chiama(archivio, 'ore.appello.riga', {
      lezioneId: 'lez-sparita-0001', allievoId: rossi.id, stato: 'presente',
    })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'non-trovato')
  })

  it('una persona di un’altra classe è «rifiutato»', async () => {
    // Un allievoId estraneo non crea una riga nuova.
    const esito = await api.chiama(archivio, 'ore.appello.riga', {
      lezioneId: prima.id, allievoId: estraneo.id, stato: 'presente',
    })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'rifiutato')
    assert.equal(rigaDi(prima, estraneo.id), null)
  })
})

describe('ore.appello.campi', () => {
  it('i minuti stanno dentro un intervallo che ha senso', async () => {
    for (const minuti of [-1, 601, 12.5]) {
      const esito = await api.chiama(archivio, 'ore.appello.campi', {
        lezioneId: prima.id, allievoId: rossi.id, minuti,
      })
      assert.equal(esito.ok, false, `${minuti} è passato e non doveva`)
      assert.equal(esito.codice, 'ingresso-non-valido')
      assert.equal(esito.campo, 'minuti')
    }
  })

  it('un campo lasciato fuori non cancella quel che c’era', async () => {
    // Chiave assente e valore nullo sono cose diverse: si scrive la nota senza
    // toccare i minuti, e viceversa.
    await api.chiama(archivio, 'ore.appello.riga', {
      lezioneId: prima.id, allievoId: bianchi.id, stato: 'ritardo',
    })
    await api.chiama(archivio, 'ore.appello.campi', {
      lezioneId: prima.id, allievoId: bianchi.id, minuti: 12, nota: 'bus in ritardo',
    })
    assert.equal(rigaDi(prima, bianchi.id).minuti, 12)

    const esito = await api.chiama(archivio, 'ore.appello.campi', {
      lezioneId: prima.id, allievoId: bianchi.id, nota: 'giustificato',
    })
    assert.equal(esito.ok, true)
    assert.equal(rigaDi(prima, bianchi.id).minuti, 12, 'i minuti sono spariti con la nota')
    assert.equal(rigaDi(prima, bianchi.id).nota, 'giustificato')
  })
})

describe('ore.comportamento.cella', () => {
  it('un segno messo a null se ne va e lascia la nota dov’è', async () => {
    await api.chiama(archivio, 'ore.comportamento.cella', {
      lezioneId: prima.id, allievoId: rossi.id, aspetto: 'Puntualità',
      segno: 'negativo', nota: 'entrata a metà',
    })
    assert.deepEqual(oraDi(prima).matrice, [
      { allievoId: rossi.id, aspetto: 'Puntualità', segno: 'negativo', nota: 'entrata a metà' },
    ])

    const esito = await api.chiama(archivio, 'ore.comportamento.cella', {
      lezioneId: prima.id, allievoId: rossi.id, aspetto: 'Puntualità', segno: null,
    })
    assert.equal(esito.ok, true)
    assert.deepEqual(oraDi(prima).matrice, [
      { allievoId: rossi.id, aspetto: 'Puntualità', segno: null, nota: 'entrata a metà' },
    ])
  })

  it('senza segno e senza nota la cella sparisce invece di restare vuota', async () => {
    const esito = await api.chiama(archivio, 'ore.comportamento.cella', {
      lezioneId: prima.id, allievoId: rossi.id, aspetto: 'Puntualità', nota: '',
    })
    assert.equal(esito.ok, true)
    assert.deepEqual(oraDi(prima).matrice, [])
  })

  it('un segno che non è né positivo né negativo non entra', async () => {
    const esito = await api.chiama(archivio, 'ore.comportamento.cella', {
      lezioneId: prima.id, allievoId: rossi.id, aspetto: 'Puntualità', segno: 'ottimo',
    })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'ingresso-non-valido')
    assert.equal(esito.campo, 'segno')
  })
})

describe('valutazioni.voto.imposta', () => {
  /** I voti scritti finora nel momento di valutazione. */
  const voti = () => archivio.registro.valutazioni.find((v) => v.id === momento.id).voti

  it('un voto fuori scala è rifiutato, e il messaggio dice quale scala', async () => {
    // La scala è quella congelata nel momento, non quella corrente, e il messaggio
    // la nomina.
    const esito = await api.chiama(archivio, 'valutazioni.voto.imposta', {
      valutazioneId: momento.id, allievoId: rossi.id, valore: 7, assente: false,
    })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'rifiutato')
    assert.match(esito.messaggi[0], /1.*6/)
    assert.match(esito.messaggi[0], /Verifica sui numeri/)
    assert.equal(voti().length, 0)
  })

  it('un voto entra arrotondato al passo della scala', async () => {
    // Quarti di punto: 4.6 diventa 4.5.
    const esito = await api.chiama(archivio, 'valutazioni.voto.imposta', {
      valutazioneId: momento.id, allievoId: rossi.id, valore: 4.6, assente: false,
    })
    assert.equal(esito.ok, true)
    assert.equal(voti()[0].valore, 4.5)
  })

  it('valore null è accettato, e non è zero', async () => {
    // «Non ancora messo» non è zero: uno zero peserebbe come un'insufficienza.
    const esito = await api.chiama(archivio, 'valutazioni.voto.imposta', {
      valutazioneId: momento.id, allievoId: rossi.id, valore: null, assente: false,
    })
    assert.equal(esito.ok, true)
    assert.equal(voti()[0].valore, null)
    assert.notEqual(voti()[0].valore, 0)
  })

  it('un valore che non è un numero non arriva mai al gestore', async () => {
    const esito = await api.chiama(archivio, 'valutazioni.voto.imposta', {
      valutazioneId: momento.id, allievoId: rossi.id, valore: 'quattro', assente: false,
    })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'ingresso-non-valido')
    assert.equal(esito.campo, 'valore')
  })

  it('un momento che non c’è più è «non-trovato»', async () => {
    const esito = await api.chiama(archivio, 'valutazioni.voto.imposta', {
      valutazioneId: 'val-sparito-0001', allievoId: rossi.id, valore: 4, assente: false,
    })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'non-trovato')
  })
})

describe('corso.presenze e i suoi tre denominatori', () => {
  /** La riga di una persona nell'uscita della procedura. */
  const rigaDa = (dati, allievoId) => dati.righe.find((r) => r.allievoId === allievoId)

  it('tiene separate le UD previste, quelle a calendario e quelle con l’appello', async () => {
    // Tre numeri, tre domande, nessuno ricavabile dagli altri:
    //
    //   udPreviste     10  l'orario di settembre (cinque martedì da due UD);
    //   udACalendario   6  le ore messe a calendario (tre da due UD);
    //   udConAppello    4  quelle su cui di Rossi si è detto qualcosa.
    await api.chiama(archivio, 'ore.appello.riga', {
      lezioneId: prima.id, allievoId: rossi.id, stato: 'assente',
    })
    await api.chiama(archivio, 'ore.appello.riga', {
      lezioneId: seconda.id, allievoId: rossi.id, stato: 'presente',
    })
    // La terza ora resta senza appello apposta.

    const esito = await api.chiama(archivio, 'corso.presenze', {
      corsoId: corso.id, dal: DAL, al: AL,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const dati = esito.dati

    assert.equal(dati.udPreviste, 10)
    assert.equal(dati.udACalendario, 6)

    const riga = rigaDa(dati, rossi.id)
    assert.equal(riga.udConAppello, 4)
    assert.equal(riga.udPresenza, 2)
    assert.equal(riga.udAssenza, 2)
  })

  it('assenza e presenza hanno denominatori diversi, e si vede dai numeri', async () => {
    const { dati } = await api.chiama(archivio, 'corso.presenze', {
      corsoId: corso.id, dal: DAL, al: AL,
    })
    const riga = rigaDa(dati, rossi.id)

    // Presenza: 2 UD su 4 con l'appello fatto.
    assert.equal(riga.presenza, 0.5)
    // Assenza: 2 UD su 10 previste. Frequenza è il complemento sullo stesso
    // denominatore, e non è `presenza`.
    assert.equal(riga.assenza, 0.2)
    assert.equal(riga.frequenza, 0.8)
    assert.notEqual(riga.presenza, 1 - riga.assenza)
  })

  it('un’ora senza appello non abbassa la presenza di nessuno', async () => {
    // Un'ora senza appello non è un'ora di assenze: la terza vale due UD e non
    // pesa.
    const avanti = await api.chiama(archivio, 'corso.presenze', { corsoId: corso.id, dal: DAL, al: AL })
    const quarta = api.creaLezione(corso.id, '2026-09-22', '08:20', 90)
    archivio.modifica((r) => r.lezioni.push(quarta), ['lezioni'])
    const dopo = await api.chiama(archivio, 'corso.presenze', { corsoId: corso.id, dal: DAL, al: AL })

    const vecchia = rigaDa(avanti.dati, rossi.id)
    const nuova = rigaDa(dopo.dati, rossi.id)
    assert.equal(dopo.dati.udACalendario, avanti.dati.udACalendario + 2, 'l’ora nuova non è a calendario')
    assert.equal(nuova.presenza, vecchia.presenza)
    assert.equal(nuova.udConAppello, vecchia.udConAppello)
    // Le previste vengono dall'orario: aggiungere un'ora non le muove.
    assert.equal(dopo.dati.udPreviste, avanti.dati.udPreviste)
  })

  it('chi non ha mai avuto un appello ha presenza nulla, non zero', async () => {
    const { dati } = await api.chiama(archivio, 'corso.presenze', {
      corsoId: corso.id, dal: DAL, al: AL,
    })
    // Verdi non è mai stata segnata: `null`, non zero.
    const verdi = dati.righe.find((r) => r.cognome === 'Verdi')
    assert.equal(verdi.presenza, null)
    assert.equal(verdi.udConAppello, 0)
  })

  it('un corso che non c’è è «non-trovato»', async () => {
    const esito = await api.chiama(archivio, 'corso.presenze', { corsoId: 'cor-sparito-0001' })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'non-trovato')
  })
})

describe('le letture del registro', () => {
  it('registro.riassunto conta quel che c’è dentro davvero', async () => {
    const { dati } = await api.chiama(archivio, 'registro.riassunto', {})
    assert.equal(dati.classi, archivio.registro.classi.length)
    assert.equal(dati.corsi, archivio.registro.corsi.length)
    assert.equal(dati.lezioni, archivio.registro.lezioni.length)
    assert.equal(dati.valutazioni, 1)
    assert.equal(dati.consegne, 0)
    assert.equal(dati.anno.inizio, DAL)
    assert.equal(dati.anno.semestri, 2)
  })

  it('corsi.elenco dice classe, materia, persone e ore', async () => {
    const { dati } = await api.chiama(archivio, 'corsi.elenco', {})
    assert.equal(dati.corsi.length, 1)
    const voce = dati.corsi[0]
    assert.equal(voce.id, corso.id)
    assert.equal(voce.classe, 'I MEC A')
    assert.equal(voce.materia, 'Matematica')
    assert.equal(voce.allievi, 3)
    assert.equal(voce.lezioni, archivio.registro.lezioni.length)
    assert.equal(voce.fasce, 1)
  })

  it('ore.appello.leggi rende l’appello nella forma dichiarata', async () => {
    const esito = await api.chiama(archivio, 'ore.appello.leggi', { lezioneId: prima.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.lezioneId, prima.id)
    assert.equal(esito.dati.data, '2026-09-01')
    assert.equal(esito.dati.ud, 2)
    assert.equal(esito.dati.righe.length, classe.allievi.length)
    for (const riga of esito.dati.righe) {
      for (const stato of riga.stati) assert.ok(api.STATI_APPELLO.includes(stato))
    }
  })

  it('una lettura non tocca l’archivio', async () => {
    // `genere: 'lettura'` è dichiarato: si verifica che non muova la revisione.
    const revisione = archivio.revisione
    await api.chiama(archivio, 'registro.riassunto', {})
    await api.chiama(archivio, 'corsi.elenco', {})
    await api.chiama(archivio, 'corso.presenze', { corsoId: corso.id, dal: DAL, al: AL })
    await api.chiama(archivio, 'ore.appello.leggi', { lezioneId: prima.id })
    assert.equal(archivio.revisione, revisione)
  })
})

describe('i filtri accesi da soli, e l’appiglio per accorgersene', () => {
  /**
   * I nomi dei conti su cui la regola di recupero del modello può scattare. Le
   * istruzioni dicono il fatto, non i nomi, perché cambiano da una lettura
   * all'altra.
   */
  const CONTI = /^(guardate|inRegistro|quante|esclus[ei].*)$/

  it('una lettura che spegne un filtro da sé emette un conto per dirlo', () => {
    // `ritirati` e `archiviate` sono accesi di suo e riducono l'elenco: una lettura
    // che li dichiara deve emettere almeno **un** conto, o il modello risponde «non
    // ne ha» invece di «non ho guardato lì».
    const senza = []
    for (const p of api.procedure()) {
      if (p.genere !== 'lettura') continue
      const ingresso = p.ingresso.forma
      if (ingresso.genere !== 'oggetto') continue
      const spegne = ['ritirati', 'archiviate'].filter((c) => ingresso.campi[c])
      if (spegne.length === 0) continue

      const uscita = p.uscita.forma
      const conti = uscita.genere === 'oggetto'
        ? Object.keys(uscita.campi).filter((c) => CONTI.test(c))
        : []
      if (conti.length === 0) senza.push(`${p.nome} (filtra su ${spegne.join(', ')})`)
    }
    assert.deepEqual(senza, [], 'queste letture riducono l’elenco senza dare un numero per accorgersene')
  })
})

describe('quel che esce di qui non nomina nessuno', () => {
  // Il nucleo ripulisce i guasti imprevisti perché i percorsi dell'archivio
  // contengono nomi di persone (`archivio/DIC4a/Rossi Mario/…pdf`); i **rifiuti**
  // invece passano interi. Quindi nessun rifiuto deve interpolare un percorso.
  // Si legge il sorgente: i rifiuti non si enumerano a runtime.

  /** Le due cartelle in cui si scrivono le frasi che escono dall'API. */
  const CARTELLE = ['src/api/procedures', 'src/actions']

  /** Dove un messaggio che nomina un percorso si costruisce. */
  const COSTRUTTORI = /(errore\.(rifiuta|nonDisponibile|conflitto|nonTrovato)|new ErroreApi|errori:\s*)[([]/g

  /** I nomi che, interpolati in una frase, ci mettono dentro un percorso. */
  const NOMI = /\$\{[^}]*\b(percors[oi]|cartell[ae]|fsPath|[Uu]ri|path)\b/

  /** Una barra dentro una frase è già un percorso, o sta per diventarlo. */
  const BARRE = /[\\/]/

  const radiceProgetto = fileURLToPath(new URL('../../', import.meta.url))

  function sorgenti (cartella) {
    const dentro = percorso.join(radiceProgetto, cartella)
    const trovati = []
    for (const voce of readdirSync(dentro)) {
      const pieno = percorso.join(dentro, voce)
      if (statSync(pieno).isDirectory()) trovati.push(...sorgenti(percorso.join(cartella, voce)))
      else if (pieno.endsWith('.ts')) trovati.push(pieno)
    }
    return trovati
  }

  /** L'argomento di una chiamata, contando le parentesi invece di indovinarle. */
  function argomento (testo, apertura) {
    const chiude = testo[apertura] === '(' ? ')' : ']'
    let profondita = 0
    for (let i = apertura; i < testo.length; i++) {
      if (testo[i] === testo[apertura]) profondita++
      else if (testo[i] === chiude) {
        profondita--
        if (profondita === 0) return testo.slice(apertura + 1, i)
      }
    }
    return testo.slice(apertura + 1)
  }

  it('nessun rifiuto scritto a mano nomina un percorso', () => {
    const colpevoli = []
    for (const cartella of CARTELLE) {
      for (const file of sorgenti(cartella)) {
        const testo = readFileSync(file, 'utf8')
        COSTRUTTORI.lastIndex = 0
        let trovato
        while ((trovato = COSTRUTTORI.exec(testo)) !== null) {
          const frase = argomento(testo, COSTRUTTORI.lastIndex - 1)
          if (NOMI.test(frase) || BARRE.test(frase)) {
            const riga = testo.slice(0, trovato.index).split('\n').length
            colpevoli.push(`${percorso.relative(radiceProgetto, file)}:${riga}`)
          }
        }
      }
    }
    assert.deepEqual(
      colpevoli, [],
      'un messaggio di rifiuto nomina un percorso: i percorsi dell’archivio contengono ' +
      'la classe e il nome di una persona',
    )
  })
})
