// Le procedure vere, contro una scuola vera.
//
// Sono le prime azioni passate sotto contratto — l'appello, la matrice del
// comportamento, i voti, le letture — e sono quelle che si chiamano più spesso
// e avevano meno rete. Quel che si difende qui è di tre generi.
//
// Il primo è la regola-guardia sugli stati: l'elenco che lo schema convalida
// deve combaciare con quello del dominio. Uno schema ha bisogno dei valori
// quando compila, il dominio li tiene in `lexicon.ts`, e le due copie possono
// separarsi in silenzio. La prova in cima a questo file è l'unico posto in cui
// qualcuno se ne accorge.
//
// Il secondo è il buco che questo livello esiste per chiudere: uno stato
// inventato non deve entrare nell'archivio. Il tipo TypeScript lo diceva già,
// ma il tipo non arriva fino al widget dell'agenda né alla riga di comando.
//
// Il terzo è l'invariante di dominio più importante che l'API espone: i **tre
// denominatori** di `corso.presenze`. La quota di assenza si conta sulle UD che
// l'orario prevedeva, la quota di presenza su quelle in cui l'appello è stato
// fatto davvero, e sono due cifre diverse che rispondono a due domande diverse.
// I numeri qui sotto sono scelti apposta perché i due conti diano risultati
// che non si assomigliano: se un giorno qualcuno li unificasse, la prova
// cadrebbe invece di passare per caso.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-api-procedure-'))
const lavoro = percorso.join(radice, 'lavoro')
const dati = percorso.join(lavoro, 'registro')
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

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
 * Il martedì dell'orario del corso, e le tre ore messe a calendario.
 *
 * Settembre 2026 ha cinque martedì — 1, 8, 15, 22, 29 — e una fascia da novanta
 * minuti vale due unità didattiche: l'orario prevede dieci UD nel mese. A
 * calendario ce ne sono tre ore, cioè sei UD, e l'appello si fa su due. Tre
 * numeri diversi, che è il punto.
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
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(dati, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify({ cartellaLavoro: lavoro }),
  )

  api = await import('../../dist-tests/api.mjs')
  // Il lessico si pesca dal bundle del dominio: è l'elenco di cui lo schema
  // deve essere la copia, e confrontarlo con una copia scritta a mano qui
  // vorrebbe dire provare la copia.
  ;({ lessico } = await import('../../dist-tests/domain.mjs'))

  api.registraTutte()

  const {
    Archivio, Uri,
    creaAllievo, creaAnno, creaClasse, creaCorso,
    creaLezione, creaMateria, creaSlot, creaValutazione,
  } = api

  archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  await archivio.apri(null)
  await archivio.creaAnno(
    creaAnno(DAL, '2027-06-30'),
    Uri.file(percorso.join(dati, '2026-2027.registro')),
  )
  const annoId = archivio.registro.anni[0].id

  classe = creaClasse(annoId, 'I MEC A')
  rossi = creaAllievo('Rossi', 'Maria')
  bianchi = creaAllievo('Bianchi', 'Luca')
  const verdi = creaAllievo('Verdi', 'Anna')
  classe.allievi.push(rossi, bianchi, verdi)

  // Una seconda classe che serve a una cosa sola: avere sottomano un allievoId
  // buono che però non è di questo corso.
  const altra = creaClasse(annoId, 'II MEC B')
  estraneo = creaAllievo('Neri', 'Ugo')
  altra.allievi.push(estraneo)

  const materia = creaMateria('Matematica')
  corso = creaCorso(classe.id, materia.id, 'Matematica — I MEC A')
  corso.orario = [{ id: 'ric-prova-0001', giorno: MARTEDI, inizio: '08:20', durataMin: 90, aula: '' }]

  prima = creaLezione(corso.id, '2026-09-01', '08:20', 90)
  seconda = creaLezione(corso.id, '2026-09-08', '08:20', 90)
  terza = creaLezione(corso.id, '2026-09-15', '08:20', 90)
  // Le due unità didattiche dette a slot invece che a minuti: è la forma in cui
  // un'ora spezzata arriva dal calendario, e le procedure devono contarla uguale.
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

after(() => {
  archivio?.dispose()
  rmSync(radice, { recursive: true, force: true })
})

describe('la regola-guardia sugli stati', () => {
  it('gli stati dell’appello dello schema sono quelli del dominio, esattamente', () => {
    // Questa prova esiste per rendere impossibile aggiungere uno stato al
    // modello e dimenticarlo nello schema. Gli elenchi di `api/procedure/ore.ts`
    // sono scritti a mano — uno schema ha bisogno dei valori quando compila,
    // non quando gira — e senza questo confronto la copia si separerebbe
    // dall'originale in silenzio: lo stato nuovo sarebbe nel registro e la
    // convalida lo rifiuterebbe, o viceversa.
    assert.deepEqual(api.STATI_APPELLO, api.STATI_PRESENZA.map((s) => s.valore))
  })

  it('gli stati dell’ora dello schema sono quelli del dominio, esattamente', () => {
    // Stessa ragione, altro elenco: `lessico.STATI_LEZIONE` è la fonte, e lo
    // schema ne è la copia da tenere allineata.
    assert.deepEqual(api.STATI_LEZIONE, Object.keys(lessico.STATI_LEZIONE))
  })
})

describe('ore.appello.riga', () => {
  it('scrive davvero l’appello, e riscriverlo uguale lascia le stesse caselle', async () => {
    // `idempotente: true` è dichiarato da chi ha scritto la procedura, non
    // dedotto: è l'unica cosa che permette a chi chiama da fuori di ritentare
    // dopo un errore di trasporto. Dichiarato non vuol dire vero, quindi si
    // guarda.
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
    // È il buco che questo livello esiste per chiudere. Il tipo `StatoPresenza`
    // lo diceva già al compilatore, ma il widget dell'agenda e la riga di
    // comando sono altre sponde, e lì il tipo non arriva.
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
    // I due codici si ritentano in modi diversi: «non c'è più» si ritenta dopo
    // aver riletto, «non si può» non si ritenta mai. Confonderli vuol dire un
    // pannello che riprova all'infinito o che si arrende quando basterebbe
    // ricaricare.
    const esito = await api.chiama(archivio, 'ore.appello.riga', {
      lezioneId: 'lez-sparita-0001', allievoId: rossi.id, stato: 'presente',
    })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'non-trovato')
  })

  it('una persona di un’altra classe è «rifiutato»', async () => {
    // Prima un allievoId sbagliato creava una riga nuova che nessuno avrebbe
    // più tolto: un dato storto che nessuna schermata mostra.
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
    // È la distinzione fra chiave assente e valore nullo, vista da fuori: si
    // scrive la nota mentre l'ora è in corso senza toccare i minuti, e
    // viceversa. Rimandare sempre tutti i campi vorrebbe dire sovrascrivere
    // quel che un altro campo ha appena salvato.
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
    // La scala è quella congelata nel momento, non quella corrente del
    // registro: cambiare la scala della scuola non deve riscrivere i voti già
    // dati. Nominarla nel messaggio è la differenza fra un errore che si
    // capisce e uno che si indovina.
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
    // Quarti di punto: un 4.6 battuto di fretta diventa 4.5, non un valore che
    // la scala non prevede.
    const esito = await api.chiama(archivio, 'valutazioni.voto.imposta', {
      valutazioneId: momento.id, allievoId: rossi.id, valore: 4.6, assente: false,
    })
    assert.equal(esito.ok, true)
    assert.equal(voti()[0].valore, 4.5)
  })

  it('valore null è accettato, e non è zero', async () => {
    // «Non ancora messo» e «zero» sono due cose diverse, e confonderle vuol
    // dire una media falsa: un voto non dato che pesa come un'insufficienza
    // piena.
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
    // I tre numeri rispondono a tre domande diverse e non si ricavano uno
    // dall'altro:
    //
    //   udPreviste     10  quel che l'orario prevedeva a settembre (cinque
    //                      martedì da due UD), appello o no, calendario o no;
    //   udACalendario   6  le ore davvero messe a calendario (tre da due UD);
    //   udConAppello    4  quelle su cui di Rossi si è detto qualcosa.
    //
    // Se un giorno qualcuno li unificasse, questa prova cadrebbe. È il punto.
    await api.chiama(archivio, 'ore.appello.riga', {
      lezioneId: prima.id, allievoId: rossi.id, stato: 'assente',
    })
    await api.chiama(archivio, 'ore.appello.riga', {
      lezioneId: seconda.id, allievoId: rossi.id, stato: 'presente',
    })
    // La terza ora resta senza appello apposta: è il caso da cui dipende tutto.

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
    // Assenza: 2 UD su 10 previste dall'orario. Frequenza è il suo complemento,
    // sullo stesso denominatore — e non è `presenza`, che è l'altra domanda.
    assert.equal(riga.assenza, 0.2)
    assert.equal(riga.frequenza, 0.8)
    assert.notEqual(riga.presenza, 1 - riga.assenza)
  })

  it('un’ora senza appello non abbassa la presenza di nessuno', async () => {
    // È la regola che un'interfaccia esterna romperebbe per prima: un'ora di
    // cui nessuno ha ancora segnato niente non è un'ora di assenze, e contarla
    // come tale farebbe crollare la percentuale di tutti a ogni lezione
    // dimenticata. La terza ora esiste, vale due UD, e non deve pesare.
    const avanti = await api.chiama(archivio, 'corso.presenze', { corsoId: corso.id, dal: DAL, al: AL })
    const quarta = api.creaLezione(corso.id, '2026-09-22', '08:20', 90)
    archivio.modifica((r) => r.lezioni.push(quarta), ['lezioni'])
    const dopo = await api.chiama(archivio, 'corso.presenze', { corsoId: corso.id, dal: DAL, al: AL })

    const vecchia = rigaDa(avanti.dati, rossi.id)
    const nuova = rigaDa(dopo.dati, rossi.id)
    assert.equal(dopo.dati.udACalendario, avanti.dati.udACalendario + 2, 'l’ora nuova non è a calendario')
    assert.equal(nuova.presenza, vecchia.presenza)
    assert.equal(nuova.udConAppello, vecchia.udConAppello)
    // Le previste vengono dall'orario, non dal calendario: aggiungere un'ora
    // non le muove.
    assert.equal(dopo.dati.udPreviste, avanti.dati.udPreviste)
  })

  it('chi non ha mai avuto un appello ha presenza nulla, non zero', async () => {
    const { dati } = await api.chiama(archivio, 'corso.presenze', {
      corsoId: corso.id, dal: DAL, al: AL,
    })
    // Verdi non è mai stata segnata: «non si sa» è `null`, e zero vorrebbe dire
    // «non c'era mai», che è un'altra cosa.
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
    // `genere: 'lettura'` è una dichiarazione, e vale quanto vale se qualcuno la
    // verifica: è il campo su cui una riga di comando decide se una chiamata è
    // innocua.
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
   * I nomi su cui la regola di recupero può scattare.
   *
   * Le istruzioni che si danno al modello dicono il **fatto** e non i nomi —
   * «se un qualunque conto della busta è maggiore di zero e le righe sono zero,
   * togli un filtro per volta» — proprio perché i nomi cambiano da una lettura
   * all'altra: `escluse` in una, `esclusiRitirati` in un'altra, `guardate` in
   * una terza. Questo elenco è il loro elenco, e serve a questa prova sola.
   */
  const CONTI = /^(guardate|inRegistro|quante|esclus[ei].*)$/

  it('una lettura che spegne un filtro da sé emette un conto per dirlo', () => {
    // `ritirati` e `archiviate` sono i due filtri accesi di suo: chi non li
    // chiede riceve un elenco **già ridotto**, e senza un numero accanto non
    // ha nessun modo di accorgersene. Il guasto non è una cifra sbagliata, è
    // peggio: il modello risponde «non ne ha» dove doveva rispondere «non ho
    // guardato lì», e chi legge non ha niente da ritentare.
    //
    // La regola sta nel fatto e non in un nome preciso, come nelle istruzioni:
    // basta **un** conto su cui scattare. Era la prova che mancava — tre
    // letture dichiaravano i due filtri e non emettevano nessun numero, e la
    // regola di recupero non aveva su che cosa scattare.
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
  // Il nucleo ripulisce il messaggio del **guasto imprevisto**, e il motivo è
  // scritto lì accanto: i percorsi dell'archivio sono costruiti con la classe e
  // il cognome-nome dell'allievo — `archivio/DIC4a/Rossi Mario/…pdf` — quindi
  // un'eccezione che porta fuori un percorso porta fuori il nome di una
  // persona. Ma i **rifiuti** passano interi, e devono: le loro frasi sono
  // scritte per essere lette.
  //
  // Il condotto promette in testa al file che «quel che esce di qui non nomina
  // nessuno… nessun percorso della cartella del docente». La promessa vale
  // quanto vale finché qualcuno la verifica: senza questa prova, il giorno in
  // cui qualcuno scrive `errore.rifiuta(\`Il file ${percorso} esiste già.\`)` la
  // frase esce intera e nessuno se ne accorge. È lo stesso criterio che il
  // progetto applica già al `genere` — dichiarato non vuol dire vero.
  //
  // Si legge il sorgente perché i rifiuti non si possono enumerare a runtime:
  // sono rami di guardie che dipendono da un archivio in uno stato preciso, e
  // provocarli tutti vorrebbe dire ricostruire mezza scuola per ciascuno.

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
