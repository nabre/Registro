// Le letture: che rispondano, che rispondano la forma che dichiarano, e
// che non tocchino niente.
//
// `genere: 'lettura'` non è un'etichetta descrittiva: è il campo su cui si
// prendono due decisioni vere. La riga di comando lo guarda per sapere se una
// chiamata è innocua e si può rifare; il pannello lo guarda per tenere le
// domande **fuori dalla coda delle scritture** — che è la garanzia più forte
// che il sistema abbia, perché è quella che impedisce a due gesti arrivati
// insieme di intrecciarsi sullo stesso registro. Una lettura che scrivesse
// passerebbe da quella porta senza mettersi in fila, e il danno non si
// vedrebbe: il registro resterebbe scritto, solo scritto male.
//
// Quindi l'invariante si prova per **tutte e otto**, non per campione, e si
// prova sul contatore dell'archivio: `archivio.revisione` prima, e la stessa
// cifra dopo. È l'unica misura che non si possa raggirare senza accorgersene —
// una scrittura che non muove la revisione non arriva nemmeno su disco.
//
// Tre cose in più, che sono i modi in cui questa parte si rompe in silenzio:
//
//   1. **`registro.integrita` non applica niente.** `riparazioni()` torna
//      degli oggetti che si portano dietro una closure `applica` capace di
//      riscrivere il registro vivo. Chiamarla per sbaglio dentro una lettura
//      darebbe una diagnosi che *ripara mentre guarda*: un registro che si
//      corregge da sé, senza che nessuno lo abbia chiesto, e senza che nulla
//      lo racconti. Qui si costruisce un difetto apposta e si guarda che dopo
//      la lettura ci sia ancora.
//
//   2. **I casi limite di `corso.presenze`.** I tre denominatori li prova già
//      `tests/api/procedures.test.mjs` e non si rifanno; mancavano i bordi, che
//      sono dove un denominatore va a zero: un corso senza orario, un periodo
//      senza nemmeno un'ora, una classe in cui non è rimasto nessuno.
//
//   3. **La forma dichiarata.** Una busta torna solo se passa dallo schema
//      d'uscita — il nucleo rifiuta con `interno` quel che non lo rispetta —
//      quindi qui si guardano i valori, non i tipi: che le cifre siano quelle
//      del registro e non altre.
//
// Una nota su `modelli.leggi` e `modelli.prova`, e sul perché il caso felice
// si può provare anche senza preparare `templates/` a mano: `leggiModello`
// passa da `assicuraModelli()`, che la cartella se la scrive da sé con i
// modelli di serie la prima volta che qualcuno la chiede. Quei due file
// nascono quindi dentro la cartella dei dati temporanea — è disco, non
// registro, e la revisione infatti non si muove — e il caso felice si prova
// per intero, PDF compreso.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-api-letture-'))
const lavoro = percorso.join(radice, 'lavoro')
const dati = percorso.join(lavoro, 'registro')
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

let api
let archivio
let classe
let rossi
let bianchi
/** Il corso con l'orario fisso: due UD ogni martedì. */
let conOrario
/** Lo stesso periodo, ma senza orario dichiarato. */
let senzaOrario
/** Un corso di una classe in cui non è rimasto nessuno di attivo. */
let corsoDeserto
let primaOra
let piano
let momento
let consegna
let secondaOra
let oraSenzaOrario
let altraOraSenzaOrario
/** L'ora a cui si rompe apposta il piano, per `registro.integrita`. */
let oraColPianoRotto

/** Il martedì: settembre 2026 ne ha cinque, e una fascia da 90' vale due UD. */
const MARTEDI = 2
const DAL = '2026-09-01'
const AL = '2026-09-30'
/** Ottobre non ha nemmeno un'ora a calendario: è il periodo vuoto. */
const OTTOBRE_DAL = '2026-10-01'
const OTTOBRE_AL = '2026-10-31'
/** Il piano che non esiste: è il difetto che `registro.integrita` deve vedere e non toccare. */
const PIANO_FANTASMA = 'pia-inesistente-0001'

/**
 * Le ventisette letture con un ingresso buono per ciascuna.
 *
 * Sta in una tabella sola perché le due prove che contano — «risponde» e «non
 * tocca niente» — devono girare sullo **stesso elenco**: due elenchi scritti a
 * mano si separerebbero alla nona lettura, e la prova dell'invarianza
 * coprirebbe sette procedure raccontando di coprirle tutte.
 */
function leTutte () {
  return [
    ['registro.riassunto', {}],
    ['corsi.elenco', {}],
    ['corso.presenze', { corsoId: conOrario.id, dal: DAL, al: AL }],
    ['ore.appello.leggi', { lezioneId: primaOra.id }],
    // Le letture che chiudono il giro degli id del contesto: classe, persona,
    // ora, prova, piano, pendenza. Prima di loro l'assistente riceveva quegli
    // id a ogni domanda e non aveva un attrezzo che ne prendesse nemmeno uno.
    ['classi.elenco', {}],
    ['classe.persone', { classeId: classe.id }],
    ['persone.cerca', { cerca: 'rossi' }],
    ['persone.scheda', { allievoId: rossi.id }],
    ['persone.argomenti', { allievoId: rossi.id }],
    ['persone.assenze', {}],
    ['persone.medie', {}],
    ['mappa.elenco', {}],
    ['ore.elenco', { corsoId: conOrario.id }],
    // Il momento si passa sempre: è l'unica lettura che senza guarderebbe
    // l'orologio, e una prova che dipende dall'ora in cui gira cade da sola.
    ['ore.prossima', { da: DAL, dalleOre: '07:00' }],
    ['ore.leggi', { lezioneId: primaOra.id }],
    ['valutazioni.elenco', { corsoId: conOrario.id }],
    ['valutazioni.voti', { valutazioneId: momento.id }],
    ['piani.elenco', { corsoId: conOrario.id }],
    ['piani.leggi', { pianoId: piano.id }],
    ['consegne.elenco', {}],
    ['registro.integrita', {}],
    ['documenti.inventario', {}],
    ['modelli.leggi', { nome: 'verbale-lezione' }],
    ['modelli.prova', { nome: 'verbale-lezione' }],
    ['llm.modelli', {}],
    ['llm.catalogo', {}],
    // Senza `cerca` e con un deposito che non esiste: nessuna delle due tocca
    // la rete in modo che possa cambiare l'esito. Una prova che dipendesse da
    // Hugging Face fallirebbe in una scuola senza rete — cioè proprio dove il
    // registro deve funzionare lo stesso.
    ['llm.file', { deposito: 'nessuno/inesistente-GGUF', taglio: 'Q4_K_M' }],
  ]
}

/** La lezione com'è adesso nell'archivio: si rilegge, non si tiene la copia. */
function oraDi (lezione) {
  return archivio.registro.lezioni.find((l) => l.id === lezione.id)
}

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(dati, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify({ cartellaLavoro: lavoro }),
  )

  api = await import('../../dist-tests/api.mjs')
  api.registraTutte()

  const {
    Archivio, Uri,
    creaAllievo, creaAnno, creaClasse, creaConsegna, creaCorso, creaLezione, creaMateria,
    creaPiano, creaValutazione,
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
  classe.allievi.push(rossi, bianchi)

  // Una classe in cui non è rimasto nessuno di attivo: chi c'era si è
  // ritirato. Non è una classe vuota — l'allievo c'è ancora, con la sua
  // storia — ed è proprio la differenza che `allieviAttivi` fa e che la
  // lettura deve rispettare.
  const desertata = creaClasse(annoId, 'II MEC B')
  const ritirato = creaAllievo('Neri', 'Ugo')
  ritirato.attivo = false
  desertata.allievi.push(ritirato)

  // Due materie diverse per i due corsi della stessa classe: con una sola,
  // `riferimentiRotti` segnalerebbe «due corsi per la stessa materia nella
  // stessa classe» e la prova dell'integrità guarderebbe un difetto che non
  // ha messo lei.
  const matematica = creaMateria('Matematica')
  const storia = creaMateria('Storia')

  conOrario = creaCorso(classe.id, matematica.id, 'I MEC A — Matematica')
  conOrario.orario = [{ id: 'ric-prova-0001', giorno: MARTEDI, inizio: '08:20', durataMin: 90, aula: '' }]

  // Nessuna fascia fissa: è il corso a ore variabili — un laboratorio, un
  // recupero — che l'orario non prevede e che esiste solo a calendario.
  senzaOrario = creaCorso(classe.id, storia.id, 'I MEC A — Storia')
  senzaOrario.orario = []

  const disegno = creaMateria('Disegno')
  corsoDeserto = creaCorso(desertata.id, disegno.id, 'II MEC B — Disegno')
  corsoDeserto.orario = [{ id: 'ric-prova-0002', giorno: MARTEDI, inizio: '08:20', durataMin: 90, aula: '' }]

  primaOra = creaLezione(conOrario.id, '2026-09-01', '08:20', 90)
  secondaOra = creaLezione(conOrario.id, '2026-09-08', '08:20', 90)
  oraSenzaOrario = creaLezione(senzaOrario.id, '2026-09-01', '08:20', 90)
  altraOraSenzaOrario = creaLezione(senzaOrario.id, '2026-09-08', '08:20', 90)
  oraColPianoRotto = creaLezione(corsoDeserto.id, '2026-09-01', '08:20', 90)

  archivio.modifica((r) => {
    // I PDF automatici restano fermi: qui si provano delle letture, e rifare
    // dei fogli in sottofondo terrebbe in piedi il processo per niente.
    r.impostazioni.pdfAutomatici = 'mai'
    r.classi.push(classe, desertata)
    r.materie.push(matematica, storia, disegno)
    r.corsi.push(conOrario, senzaOrario, corsoDeserto)
    r.lezioni.push(primaOra, secondaOra, oraSenzaOrario, altraOraSenzaOrario, oraColPianoRotto)
  }, ['classi', 'corsi', 'lezioni', 'registro'])

  // L'appello sul corso con l'orario: una assenza e una presenza, cioè due
  // ore su cinque martedì.
  await api.chiama(archivio, 'ore.appello.riga', {
    lezioneId: primaOra.id, allievoId: rossi.id, stato: 'assente',
  })
  await api.chiama(archivio, 'ore.appello.riga', {
    lezioneId: secondaOra.id, allievoId: rossi.id, stato: 'presente',
  })
  // E sul corso senza orario, così che i conti di quel corso abbiano un
  // numeratore e il denominatore si veda per quel che è.
  await api.chiama(archivio, 'ore.appello.riga', {
    lezioneId: oraSenzaOrario.id, allievoId: rossi.id, stato: 'assente',
  })
  await api.chiama(archivio, 'ore.appello.riga', {
    lezioneId: altraOraSenzaOrario.id, allievoId: rossi.id, stato: 'presente',
  })

  // Un piano, una prova e una pendenza: le tre cose su cui le letture nuove
  // rispondono. Passano dalle procedure di scrittura e non da `modifica`,
  // così quel che si legge è quel che il registro scriverebbe davvero.
  piano = creaPiano(conOrario.id)
  piano.obiettivi = ['Riconoscere le frazioni equivalenti']
  piano.attivita = [{
    id: 'att-prova-0001',
    titolo: 'Esercizi guidati',
    tipo: 'esercitazione',
    durataUd: 1,
    descrizione: '',
    materiali: 'fotocopie',
    risorse: [],
  }]
  await api.chiama(archivio, 'piani.salva', { piano })

  momento = creaValutazione(conOrario.id, 'Verifica sulle frazioni', undefined, '2026-09-15')
  momento.voti = [
    { allievoId: rossi.id, valore: 3, assente: false },
    { allievoId: bianchi.id, valore: 5, assente: false },
  ]
  await api.chiama(archivio, 'valutazioni.salva', { valutazione: momento })

  consegna = creaConsegna(conOrario.id, 'Portare il libro', '2026-09-01')
  consegna.scadenza = '2026-09-08'
  await api.chiama(archivio, 'consegne.salva', { consegna })

  // Il difetto voluto, messo per ultimo così che nient'altro lo cancelli: una
  // lezione che dice di avere una scaletta e la cita con un id che nel
  // registro non c'è. `riparazioni()` sa staccarlo, e non deve farlo.
  archivio.modifica((r) => {
    r.lezioni.find((l) => l.id === oraColPianoRotto.id).pianoId = PIANO_FANTASMA
  }, ['lezioni'])
})

after(() => {
  archivio?.dispose()
  rmSync(radice, { recursive: true, force: true })
})

describe('l’elenco delle letture', () => {
  it('sono ventisette, e la tabella di questo file è esattamente quella', () => {
    // Senza questa prova le due che seguono coprirebbero quel che è scritto
    // qui sopra invece di quel che il registro espone: aggiungere una lettura
    // e dimenticarla nella tabella non farebbe cadere niente, e l'invariante
    // «nessuna lettura tocca il registro» varrebbe per ventidue procedure
    // raccontando di valere per tutte.
    const dichiarate = api.procedure()
      .filter((p) => p.genere === 'lettura')
      .map((p) => p.nome)
      .sort()
    const provate = leTutte().map(([nome]) => nome).sort()
    assert.deepEqual(provate, dichiarate)
    assert.equal(dichiarate.length, 27, `letture dichiarate: ${dichiarate.length}`)
  })
})

describe('le ventisette letture rispondono, e nella forma che dichiarano', () => {
  it('registro.riassunto conta l’anno, le classi, i corsi e le ore', async () => {
    const esito = await api.chiama(archivio, 'registro.riassunto', {})
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const r = archivio.registro
    assert.equal(esito.dati.versione, r.versione)
    assert.equal(esito.dati.classi, r.classi.length)
    assert.equal(esito.dati.corsi, 3)
    assert.equal(esito.dati.lezioni, 5)
    // Uno e uno: la prova e la pendenza che il corredo mette per le letture
    // nuove — `valutazioni.voti` e `consegne.elenco` vogliono qualcosa da
    // leggere, e il riassunto le conta come conta tutto il resto.
    assert.equal(esito.dati.valutazioni, 1)
    assert.equal(esito.dati.consegne, 1)
    assert.equal(esito.dati.daSmistare, 0)
    assert.equal(esito.dati.anno.inizio, DAL)
    assert.equal(esito.dati.anno.semestri, 2)
  })

  it('corsi.elenco dice per ciascuno classe, materia, persone, ore e fasce', async () => {
    const esito = await api.chiama(archivio, 'corsi.elenco', {})
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.corsi.length, 3)

    const storia = esito.dati.corsi.find((c) => c.id === senzaOrario.id)
    assert.equal(storia.classe, 'I MEC A')
    assert.equal(storia.materia, 'Storia')
    assert.equal(storia.allievi, 2)
    assert.equal(storia.lezioni, 2)
    // Zero fasce: è il corso che l'orario non prevede, e il campo lo dice.
    assert.equal(storia.fasce, 0)

    // La classe desertata: l'allievo c'è ma non è attivo, e «quante persone
    // frequentano» è zero, non uno.
    const disegno = esito.dati.corsi.find((c) => c.id === corsoDeserto.id)
    assert.equal(disegno.allievi, 0)
  })

  // L'anno si può omettere — «senza, l'anno in uso» — e una busta che non dice
  // quale sia costringe chi legge a fidarsi di aver indovinato. Fuori di qui
  // c'è un modello a cui è vietato inventare: deve poterlo scrivere.
  it('corsi.elenco dice di quale anno ha risposto, anche senza averlo chiesto', async () => {
    const esito = await api.chiama(archivio, 'corsi.elenco', {})
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const anno = archivio.registro.anni[0]
    assert.equal(esito.dati.annoId, anno.id)
    assert.equal(esito.dati.anno, anno.etichetta)
  })

  // Un anno che non è quello aperto tornava un elenco vuoto, ed è lo sbaglio
  // che questo file prova due volte sotto un altro nome: «zero corrispondono»
  // e «zero ce ne sono» sono fatti diversi. Gli anni caricati sono uno solo —
  // `archivio.leggiTutto` mette in `anni` il documento aperto e nient'altro —
  // quindi l'id di un altro anno non è un filtro che non pesca: è un documento
  // che non è aperto, e va detto con il rimedio accanto.
  it('classi.elenco e corsi.elenco, con un anno che non è quello aperto, lo dicono', async () => {
    for (const nome of ['classi.elenco', 'corsi.elenco']) {
      const esito = await api.chiama(archivio, nome, { annoId: 'ann-inventato-0001' })
      assert.equal(esito.ok, false, `${nome} ha risposto come se quell'anno ci fosse`)
      assert.equal(esito.codice, 'non-trovato')
      assert.match(esito.messaggi.join(' '), /registro\.riassunto/)
    }
  })

  // E l'anno aperto, nominato per esteso, resta una risposta buona: la guardia
  // non deve aver chiuso la porta anche a chi passa l'id giusto.
  it('classi.elenco con l’id dell’anno aperto risponde come senza', async () => {
    const anno = archivio.registro.anni[0]
    const conId = await api.chiama(archivio, 'classi.elenco', { annoId: anno.id })
    const senza = await api.chiama(archivio, 'classi.elenco', {})
    assert.equal(conId.ok, true, JSON.stringify(conId))
    assert.deepEqual(conId.dati, senza.dati)
  })

  it('corso.presenze torna i tre denominatori accanto alle righe', async () => {
    const esito = await api.chiama(archivio, 'corso.presenze', {
      corsoId: conOrario.id, dal: DAL, al: AL,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.corsoId, conOrario.id)
    assert.equal(esito.dati.dal, DAL)
    assert.equal(esito.dati.al, AL)
    assert.equal(esito.dati.righe.length, 2, 'le due persone attive della classe')
    // Un corso che non c'è resta «non-trovato»: lo prova già
    // `tests/api/procedures.test.mjs`, e qui basta la forma.
    assert.ok(esito.dati.udPreviste > 0)
  })

  // Il `titolo` di un corso si può lasciare vuoto, e la busta usciva con lui
  // solo: una risposta che dice «—» al posto della classe non si usa.
  it('corso.presenze dice classe e materia accanto al titolo', async () => {
    const esito = await api.chiama(archivio, 'corso.presenze', {
      corsoId: conOrario.id, dal: DAL, al: AL,
    })
    assert.equal(esito.dati.classe, 'I MEC A')
    assert.equal(esito.dati.materia, 'Matematica')
    assert.equal(esito.dati.classeId, classe.id)
  })

  it('ore.appello.leggi rende le righe con gli stati che il dominio conosce', async () => {
    const esito = await api.chiama(archivio, 'ore.appello.leggi', { lezioneId: primaOra.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.lezioneId, primaOra.id)
    assert.equal(esito.dati.data, '2026-09-01')
    assert.equal(esito.dati.ud, 2)
    const riga = esito.dati.righe.find((r) => r.allievoId === rossi.id)
    assert.deepEqual(riga.stati, ['assente', 'assente'])
    // Il nome accanto all'id: chi legge di qui — il modello dell'assistente —
    // non ha un secondo attrezzo per risolvere un id di persona, e non può
    // inventarne uno. Senza questi due campi «chi era assente?» non ha risposta.
    assert.equal(riga.cognome, 'Rossi')
    assert.equal(riga.nome, 'Maria')
    for (const r of esito.dati.righe) {
      for (const stato of r.stati) assert.ok(api.STATI_APPELLO.includes(stato))
    }
  })

  // Il caso vero, preso dal giornale: dieci «persone.scheda» di fila con un id
  // inventato. La busta di «non trovato» deve dire **dove si cerca**, o
  // l'unica strada che resta a chi legge è riprovare con un altro id.
  it('persone.scheda, con un id che non esiste, dice come si trova una persona', async () => {
    const esito = await api.chiama(archivio, 'persone.scheda', { allievoId: 'all-inventato-0001' })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'non-trovato')
    assert.match(esito.messaggi.join(' '), /persone\.cerca/)
    assert.match(esito.messaggi.join(' '), /classe\.persone/)
  })

  // Il difetto vero, dal transcript: «elencami le persone in formazione» è
  // diventato una ricerca della parola «allievo», zero risultati, e la
  // conclusione «ci sono 0 persone in questo registro» — falsa, e detta con
  // sicurezza. Un attrezzo che non sa dire «tutte» costringe a inventarsi un
  // filtro, e un filtro inventato torna sempre vuoto.
  it('persone.cerca senza filtro torna tutte, e dice quante ce ne sono', async () => {
    const esito = await api.chiama(archivio, 'persone.cerca', {})
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(
      esito.dati.persone.map((p) => p.nomeCompleto).sort(),
      ['Bianchi Luca', 'Rossi Maria'],
    )
    // Tre e non due: «in registro» conta anche Neri, che si è ritirato e che
    // il filtro predefinito tiene fuori. È il punto di quel numero — dire
    // quante persone ci sono, non quante ne ha mandate — e contarlo dentro il
    // filtro lo faceva andare a zero insieme al risultato.
    assert.equal(esito.dati.inRegistro, 3)
    assert.equal(esito.dati.esclusiRitirati, 1)
    // Nullo e non zero: non c'è nessuna classe archiviata, e una riga «0» sotto
    // la risposta parlerebbe di un problema che non esiste.
    assert.equal(esito.dati.esclusiArchiviate, null)
  })

  // Il caso che ha fatto dire «non ci sono allievi» su un registro pieno: le
  // classi di un anno finito sono archiviate, chi c'era dentro si è ritirato, e
  // i due filtri predefiniti insieme svuotano la busta. Con `inRegistro` contato
  // dentro il filtro la risposta era «0 trovate, 0 nel registro», e da lì «non
  // c'è nessuno» è una deduzione giusta da una premessa falsa.
  it('con tutte le classi archiviate, persone.cerca dice lo stesso quante ce ne sono', async () => {
    const prima = archivio.registro.classi.map((c) => c.archiviata)
    archivio.modifica((r) => {
      for (const classe of r.classi) classe.archiviata = true
    }, [])
    try {
      const esito = await api.chiama(archivio, 'persone.cerca', {})
      assert.equal(esito.ok, true, JSON.stringify(esito))
      assert.deepEqual(esito.dati.persone, [], 'il filtro le tiene fuori, ed è giusto')
      assert.equal(esito.dati.quante, 0)
      assert.equal(esito.dati.inRegistro, 3, 'ma ci sono, e la busta lo dice')
      assert.equal(esito.dati.esclusiArchiviate, 3)

      // E l'interruttore che le riporta dentro funziona: è la mossa che le
      // istruzioni del modello gli dicono di fare quando legge quel numero.
      const tutte = await api.chiama(archivio, 'persone.cerca', {
        archiviate: true, ritirati: true,
      })
      assert.equal(tutte.dati.persone.length, 3)
      assert.equal(tutte.dati.esclusiArchiviate, null, 'niente è escluso: l’interruttore è acceso')
      assert.equal(tutte.dati.esclusiRitirati, null)
    } finally {
      archivio.modifica((r) => {
        r.classi.forEach((classe, i) => { classe.archiviata = prima[i] })
      }, [])
    }
  })

  // «Zero corrispondono» e «zero ce ne sono» sono due fatti diversi, e la
  // busta li dice tutti e due: senza il secondo, il primo si legge come l'altro.
  it('una ricerca a vuoto dice lo stesso quante persone ci sono', async () => {
    const esito = await api.chiama(archivio, 'persone.cerca', { cerca: 'zurigo' })
    assert.equal(esito.dati.quante, 0)
    assert.equal(esito.dati.inRegistro, 3)
    // E dice che cosa fare: è la riga che rimette in moto chi si è fermato.
    assert.match(esito.dati.suggerimento, /senza .cerca./)
    assert.match(esito.dati.suggerimento, /3/)
  })

  // Dal giornale, due volte: a «mi dai l'elenco degli allievi» il modello chiama
  // «persone.cerca» con «cerca: allievo». Le istruzioni glielo vietano già, e lo
  // fa lo stesso — una regola nel prompt è un consiglio. Qui è codice: la parola
  // che nomina la categoria non è un filtro, si toglie, e la busta dice che è
  // stata tolta.
  it('cercare la parola «allievo» non è un filtro: torna tutte, e lo dice', async () => {
    for (const parola of ['allievo', 'allievi', 'studenti', 'persone']) {
      const esito = await api.chiama(archivio, 'persone.cerca', { cerca: parola })
      assert.equal(esito.ok, true, JSON.stringify(esito))
      assert.equal(esito.dati.quante, 2, `«${parola}» ha filtrato qualcosa`)
      assert.equal(esito.dati.cerca, '', 'il filtro applicato è nessun filtro')
      assert.equal(esito.dati.ignorato, parola, 'e la busta dice che cosa ha tolto')
      assert.match(esito.dati.suggerimento, /categoria/)
    }
  })

  // Chi cerca scrive quel che ha sotto le dita: «muller» per «Müller»,
  // «ROSSI» per «Rossi», «dellacqua» per «Dell'Acqua». Tutte e tre devono
  // trovare la persona: una ricerca che pretende l'ortografia esatta è una
  // ricerca che serve solo a chi già sa dov'è quel che cerca.
  it('la ricerca non guarda maiuscole, accenti né apostrofi', async () => {
    const prima = archivio.registro.classi[0].allievi.map((a) => [a.cognome, a.nome])
    archivio.modifica((r) => {
      const [uno, due] = r.classi[0].allievi
      uno.cognome = 'Müller'; uno.nome = 'Jürg'
      due.cognome = 'Dell’Acqua'; due.nome = 'Renée'
    }, [])
    try {
      for (const [cercato, atteso] of [
        ['muller', 'Müller Jürg'],
        ['MÜLLER', 'Müller Jürg'],
        ['jurg', 'Müller Jürg'],
        ['dellacqua', 'Dell’Acqua Renée'],
        ["dell'acqua", 'Dell’Acqua Renée'],
        ['RENEE', 'Dell’Acqua Renée'],
      ]) {
        const esito = await api.chiama(archivio, 'persone.cerca', { cerca: cercato })
        assert.equal(esito.ok, true, JSON.stringify(esito))
        assert.deepEqual(
          esito.dati.persone.map((p) => p.nomeCompleto),
          [atteso],
          `«${cercato}» non ha trovato ${atteso}`,
        )
      }
    } finally {
      archivio.modifica((r) => {
        r.classi[0].allievi.forEach((a, i) => { [a.cognome, a.nome] = prima[i] })
      }, [])
    }
  })

  // Tolta la parola di categoria, quel che resta cerca ancora: «rossi allievo»
  // è Rossi, non tutte. Togliere una parola non deve allargare la ricerca.
  it('la parola di categoria si toglie, il resto del filtro resta', async () => {
    const esito = await api.chiama(archivio, 'persone.cerca', { cerca: 'rossi allievo' })
    assert.deepEqual(esito.dati.persone.map((p) => p.nomeCompleto), ['Rossi Maria'])
    assert.equal(esito.dati.cerca, 'rossi')
    assert.equal(esito.dati.ignorato, 'allievo')
  })

  // Lo stesso difetto visto dalle altre due letture che hanno un filtro acceso
  // di suo: una classe in cui tutti si sono ritirati e un anno le cui classi
  // sono archiviate tornavano un elenco vuoto e nient'altro.
  it('classe.persone dice quante ritirate tiene fuori', async () => {
    const desertata = archivio.registro.classi.find((c) => c.nome === 'II MEC B')
    const esito = await api.chiama(archivio, 'classe.persone', { classeId: desertata.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.quante, 0, 'nessuna frequenta')
    assert.equal(esito.dati.escluse, 1, 'ma una c’è, ritirata')

    const con = await api.chiama(archivio, 'classe.persone', {
      classeId: desertata.id, ritirati: true,
    })
    assert.equal(con.dati.quante, 1)
    assert.equal(con.dati.escluse, null)
  })

  it('classi.elenco dice quante classi archiviate tiene fuori', async () => {
    const prima = archivio.registro.classi.map((c) => c.archiviata)
    archivio.modifica((r) => {
      r.classi.find((c) => c.nome === 'II MEC B').archiviata = true
    }, [])
    try {
      const esito = await api.chiama(archivio, 'classi.elenco', {})
      assert.equal(esito.ok, true, JSON.stringify(esito))
      assert.deepEqual(esito.dati.classi.map((c) => c.nome), ['I MEC A'])
      assert.equal(esito.dati.escluse, 1)

      const con = await api.chiama(archivio, 'classi.elenco', { archiviate: true })
      assert.equal(con.dati.classi.length, 2)
      assert.equal(con.dati.escluse, null)
    } finally {
      archivio.modifica((r) => {
        r.classi.forEach((classe, i) => { classe.archiviata = prima[i] })
      }, [])
    }
  })

  it('persone.cerca trova a pezzi, come si cerca parlando', async () => {
    const esito = await api.chiama(archivio, 'persone.cerca', { cerca: 'rossi' })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(esito.dati.persone.map((p) => p.nomeCompleto), ['Rossi Maria'])
    assert.equal(esito.dati.persone[0].classe, 'I MEC A')

    // Ogni pezzo deve trovarsi: «rossi mec» resta Rossi della I MEC A, «rossi
    // storia» non trova niente — è il modo in cui una parola in più restringe.
    const stretta = await api.chiama(archivio, 'persone.cerca', { cerca: 'rossi mec' })
    assert.equal(stretta.dati.persone.length, 1)
    const vuota = await api.chiama(archivio, 'persone.cerca', { cerca: 'rossi zurigo' })
    assert.deepEqual(vuota.dati.persone, [])
  })

  it('ore.appello.leggi dice anche di quale ora si tratta', async () => {
    const esito = await api.chiama(archivio, 'ore.appello.leggi', { lezioneId: primaOra.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.corsoId, conOrario.id)
    assert.equal(esito.dati.classe, 'I MEC A')
    assert.equal(esito.dati.materia, 'Matematica')
    assert.equal(esito.dati.corso, 'I MEC A — Matematica')
    assert.ok(api.STATI_LEZIONE.includes(esito.dati.stato))
  })

  it('registro.integrita torna le rotture e le correzioni, descritte', async () => {
    const esito = await api.chiama(archivio, 'registro.integrita', {})
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.ok(
      esito.dati.riferimentiRotti.some((frase) => /piano assegnato non esiste/i.test(frase)),
      `le rotture non nominano il piano fantasma: ${JSON.stringify(esito.dati.riferimentiRotti)}`,
    )
    const stacca = esito.dati.riparazioni.find((r) => /[Ss]tacca il piano/.test(r.titolo))
    assert.ok(stacca, `nessuna riparazione per il piano: ${JSON.stringify(esito.dati.riparazioni)}`)
    // Di una riparazione restano le due cose che si possono dire prima di
    // farla: che cosa succederebbe, e quali file toccherebbe. La closure che
    // la applica non esce di qui, ed è il punto della prova più sotto.
    assert.equal(stacca.dettaglio, 'lezioni')
  })

  it('documenti.inventario risponde con i quattro elenchi del documento d’anno', async () => {
    const esito = await api.chiama(archivio, 'documenti.inventario', {})
    assert.equal(esito.ok, true, JSON.stringify(esito))
    for (const campo of ['esportazioni', 'archivio', 'composizioni', 'modelli']) {
      assert.ok(Array.isArray(esito.dati[campo]), `${campo} non è un elenco`)
    }
    // Su un anno appena nato le prime tre sono vuote: niente è stato ancora
    // esportato, archiviato o composto.
    assert.deepEqual(esito.dati.esportazioni, [])
    assert.deepEqual(esito.dati.archivio, [])
    assert.deepEqual(esito.dati.composizioni, [])
    // `modelli` invece non si conta: `inventarioModelli()` rende l'elenco
    // **in memoria**, che si riempie quando qualcuno rilegge la cartella —
    // oggi lo fa `aggiornaInventarioModelli()`, cioè `modelli.leggi` o
    // l'apertura della pagina Modelli. Prima di allora è vuoto, e quante voci
    // ci siano dipenderebbe da quale prova ha girato per prima: una prova che
    // cambia esito con l'ordine dei file non prova niente.
  })

  it('modelli.leggi rende il sorgente e i nomi che quel rapporto riempie', async () => {
    const esito = await api.chiama(archivio, 'modelli.leggi', { nome: 'verbale-lezione' })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.ok(esito.dati.testo.length > 0, 'il modello è tornato vuoto')
    assert.match(esito.dati.testo, /estende:/)
    for (const campo of ['valori', 'elenchi', 'tabelle', 'grafici', 'gallerie', 'gruppi', 'blocchi', 'frasi', 'immagini', 'modelli']) {
      assert.ok(Array.isArray(esito.dati.nomi[campo]), `nomi.${campo} non è un elenco`)
    }
    assert.ok(esito.dati.nomi.valori.length > 0, 'un verbale senza nemmeno un segnaposto')
  })

  it('modelli.leggi su un nome che non c’è è «rifiutato», e lo dice in italiano', async () => {
    const esito = await api.chiama(archivio, 'modelli.leggi', { nome: 'modello-che-non-esiste' })
    assert.equal(esito.ok, false)
    // Non «non-trovato»: il lessico non ha un termine per «modello», e la
    // procedura tiene apposta la frase di `actions/templates.ts` invece di
    // cucirne una nuova. Vedi il commento in `src/api/procedures/rapporti.ts`.
    assert.equal(esito.codice, 'rifiutato')
    assert.match(esito.messaggi[0], /modello-che-non-esiste/)
  })

  it('modelli.prova compone il PDF e lo rimanda senza scriverlo', async () => {
    const esito = await api.chiama(archivio, 'modelli.prova', { nome: 'verbale-lezione' })
    assert.equal(esito.ok, true, JSON.stringify(esito).slice(0, 300))
    // Base64 di un PDF vero: `%PDF-` all'inizio, che in base64 comincia per
    // `JVBERi`. Guardare la firma e non la sola lunghezza è la differenza fra
    // «ha risposto qualcosa» e «ha risposto un foglio».
    assert.match(esito.dati.pdf, /^JVBERi/)
  })

  it('modelli.prova su un nome che non c’è è «rifiutato»', async () => {
    const esito = await api.chiama(archivio, 'modelli.prova', { nome: 'modello-che-non-esiste' })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'rifiutato')
    assert.match(esito.messaggi[0], /modello-che-non-esiste/)
  })
})

describe('nessuna lettura tocca il registro', () => {
  it('tutte e otto lasciano «archivio.revisione» dov’era', async () => {
    // Per tutte e otto, una per una, con il nome di quella che si muove: un
    // `assert` sulla somma direbbe che qualcosa ha scritto senza dire che
    // cosa, e la prima cosa che si vuole sapere è quale.
    const mosse = []
    for (const [nome, ingresso] of leTutte()) {
      const prima = archivio.revisione
      const esito = await api.chiama(archivio, nome, ingresso)
      assert.equal(esito.ok, true, `${nome}: ${JSON.stringify(esito).slice(0, 200)}`)
      if (archivio.revisione !== prima) {
        mosse.push(`${nome}: ${prima} → ${archivio.revisione}`)
      }
    }
    assert.deepEqual(mosse, [], `letture che hanno scritto:\n${mosse.join('\n')}`)
  })

  it('e nemmeno quando rifiutano', async () => {
    // Il rifiuto è l'altra metà: una procedura che scrivesse prima di
    // accorgersi che l'ingresso non andava lascerebbe dietro di sé quel che
    // nessuna schermata mostra. Qui si sbaglia apposta l'ingresso di ognuna.
    const storti = [
      ['corsi.elenco', { annoId: '' }],
      ['corso.presenze', { corsoId: 'cor-sparito-0001' }],
      ['ore.appello.leggi', { lezioneId: 'lez-sparita-0001' }],
      ['modelli.leggi', { nome: '' }],
      ['modelli.prova', { nome: '' }],
    ]
    for (const [nome, ingresso] of storti) {
      const prima = archivio.revisione
      const esito = await api.chiama(archivio, nome, ingresso)
      assert.equal(esito.ok, false, `${nome} ha accettato un ingresso storto`)
      assert.equal(archivio.revisione, prima, `${nome} ha scritto rifiutando`)
    }
  })
})

describe('registro.integrita guarda e basta', () => {
  it('il difetto c’è ancora dopo la lettura, e la revisione non si è mossa', async () => {
    // Il modo di fallire che questa prova esiste per prendere: `riparazioni()`
    // torna degli oggetti con dentro `applica(registro)`, una closure che
    // riscrive lo stato vivo. Chiamarla qui — per completezza, per comodità,
    // perché «tanto è una correzione sicura» — vorrebbe dire un registro che
    // si aggiusta da solo ogni volta che qualcuno chiede come sta. Le
    // correzioni si applicano con un gesto che si preme: l'azione
    // `manutenzione.ripara`, e quella sola.
    const rotta = () => archivio.registro.lezioni.find((l) => l.id === oraColPianoRotto.id)
    assert.equal(rotta().pianoId, PIANO_FANTASMA, 'il difetto non c’era già prima')

    const prima = archivio.revisione
    const esito = await api.chiama(archivio, 'registro.integrita', {})
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.ok(esito.dati.riparazioni.length > 0, 'niente da riparare: la prova non prova niente')

    assert.equal(rotta().pianoId, PIANO_FANTASMA, 'la lettura ha applicato la riparazione')
    assert.equal(archivio.revisione, prima)
  })

  it('richiamarla due volte dice la stessa cosa', async () => {
    // Idempotenza dichiarata e verificata: se la prima chiamata avesse
    // corretto qualcosa, la seconda troverebbe meno da riparare — ed è
    // esattamente come ci si accorgerebbe, in produzione, che la diagnosi
    // ripara di nascosto.
    const uno = await api.chiama(archivio, 'registro.integrita', {})
    const due = await api.chiama(archivio, 'registro.integrita', {})
    assert.deepEqual(due.dati, uno.dati)
  })

  it('l’ora rimane com’era in tutto, non solo nel piano', () => {
    // La closure di una riparazione tocca quel che vuole: guardare il solo
    // `pianoId` proverebbe che quella riparazione non è stata applicata, non
    // che nessuna lo è stata.
    const ora = oraDi(oraColPianoRotto)
    assert.equal(ora.corsoId, corsoDeserto.id)
    assert.equal(ora.data, '2026-09-01')
    assert.equal(ora.pianoId, PIANO_FANTASMA)
  })
})

describe('corso.presenze sui bordi', () => {
  /** La riga di una persona nell'uscita della procedura. */
  const rigaDa = (dati, allievoId) => dati.righe.find((r) => r.allievoId === allievoId)

  it('un corso senza orario ripiega sulle UD a calendario', async () => {
    // **Questa prova cade oggi, ed è un difetto vero di
    // `src/api/procedures/lettura.ts`.**
    //
    // Il dominio il caso lo gestisce: `matriceCorso` riceve `previste` e, se
    // è zero — che è quel che torna un corso senza orario fisso — ripiega
    // sulle UD delle ore passate, «l'unico monte ore che in quel caso si
    // conosca» (vedi il commento sul parametro in `domain/courseMatrix.ts`).
    // Il denominatore che ne esce sta in `matrice.udPreviste`.
    //
    // La procedura però rimanda `udPreviste: previste` — il numero *prima*
    // del ripiego — mentre `assenza` e `frequenza` le prende dalla matrice,
    // cioè contate sul denominatore *dopo*. Per un corso senza orario la
    // busta esce quindi con `udPreviste: 0` accanto a `assenza: 0.5`, e le
    // due cifre non stanno insieme: non esiste un denominatore nella
    // risposta che dia quel risultato. Chi legge da fuori — la riga di
    // comando, il widget — o divide per zero, o ricava il denominatore vero
    // da sé, che è precisamente la terza formula che il commento in testa a
    // quella procedura dice di voler impedire.
    //
    // La correzione è una riga: in `src/api/procedures/lettura.ts`, dentro
    // `corso.presenze`, `udPreviste: previste` va letto dalla matrice —
    // `udPreviste: matrice.udPreviste` — che è il denominatore davvero usato.
    // `udACalendario` resta `matrice.ud` e non cambia.
    const esito = await api.chiama(archivio, 'corso.presenze', {
      corsoId: senzaOrario.id, dal: DAL, al: AL,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const dati = esito.dati
    const riga = rigaDa(dati, rossi.id)

    // Due ore da due UD: quattro a calendario, quattro con l'appello fatto.
    assert.equal(dati.udACalendario, 4)
    assert.equal(riga.udConAppello, 4)
    assert.equal(riga.udAssenza, 2)

    assert.equal(
      dati.udPreviste, dati.udACalendario,
      'senza orario le UD previste devono ripiegare su quelle a calendario',
    )
    // E il denominatore dichiarato dev'essere quello su cui l'assenza è stata
    // davvero contata: è tutto il senso di mandarli insieme.
    assert.equal(riga.assenza, riga.udAssenza / dati.udPreviste)
  })

  it('un periodo senza nemmeno un’ora non fa assenti, e la presenza resta «non si sa»', async () => {
    // Ottobre: l'orario prevedeva delle ore, a calendario non ce n'è
    // nessuna, e di nessuno si è segnato niente. La tentazione sarebbe
    // contare le previste come tutte perse — sarebbe «quante ore ha perso» —
    // ma un mese non ancora generato non è un mese di assenze, e dirlo
    // farebbe crollare la percentuale di tutti a ogni periodo futuro che
    // qualcuno guarda.
    const esito = await api.chiama(archivio, 'corso.presenze', {
      corsoId: conOrario.id, dal: OTTOBRE_DAL, al: OTTOBRE_AL,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const dati = esito.dati

    assert.equal(dati.udACalendario, 0, 'ottobre non doveva avere ore')
    assert.ok(dati.udPreviste > 0, 'l’orario prevedeva dei martedì anche in ottobre')

    const riga = rigaDa(dati, rossi.id)
    assert.equal(riga.udConAppello, 0)
    assert.equal(riga.udAssenza, 0)
    assert.equal(riga.assenza, 0, 'un mese non generato non è un mese di assenze')
    assert.equal(riga.frequenza, 1)
    // «Non si sa» è `null`, e non è zero: zero vorrebbe dire «non c'era mai»,
    // che di un mese in cui non si è ancora fatto niente è una bugia.
    assert.equal(riga.presenza, null)
    assert.notEqual(riga.presenza, 0)
  })

  it('una classe senza nessuno di attivo torna zero righe, e i denominatori restano', async () => {
    // Nessuna riga, ma non una risposta vuota: `udPreviste` e `udACalendario`
    // sono del corso, non delle persone, e continuano a dire quante ore quel
    // corso prevedeva e quante ne ha fatte. È la risposta che serve a chi
    // guarda un corso che si è svuotato in corso d'anno.
    const esito = await api.chiama(archivio, 'corso.presenze', {
      corsoId: corsoDeserto.id, dal: DAL, al: AL,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(esito.dati.righe, [])
    assert.equal(esito.dati.udPreviste, 10, 'cinque martedì da due UD')
    assert.equal(esito.dati.udACalendario, 2, 'un’ora sola a calendario')
    assert.equal(esito.dati.corsoId, corsoDeserto.id)
  })

  it('e su nessuno dei tre bordi il registro si muove', async () => {
    const prima = archivio.revisione
    for (const corsoId of [senzaOrario.id, conOrario.id, corsoDeserto.id]) {
      await api.chiama(archivio, 'corso.presenze', { corsoId, dal: DAL, al: AL })
      await api.chiama(archivio, 'corso.presenze', { corsoId, dal: OTTOBRE_DAL, al: OTTOBRE_AL })
    }
    assert.equal(archivio.revisione, prima)
    assert.equal(oraDi(primaOra).presenze.length, 2, 'l’appello è cambiato leggendolo')
    assert.equal(oraDi(secondaOra).presenze.length, 2)
    // Le righe sono due perché la classe ha due persone attive: è il conto da
    // cui dipendono tutte le righe delle prove qui sopra.
    assert.ok(oraDi(primaOra).presenze.some((p) => p.allievoId === bianchi.id))
  })
})

// Che cosa ha perso, e che cosa ha fatto: la stessa domanda girata.
//
// Gli argomenti stavano in `ore.elenco` e l'appello in `ore.appello.leggi`, e
// incrociarli era un giro che nessuno fa: una chiamata per ogni ora e un
// accoppiamento a mano fra due elenchi. Qui si prova che l'incrocio lo fa il
// registro, e che lo fa con gli stessi conti dei rapporti.
describe('persone.argomenti', () => {
  /** Gli argomenti scritti sulle ore della prova, e poi rimessi com'erano. */
  async function conArgomenti (fai) {
    const prima = archivio.registro.lezioni.map((l) => l.argomenti)
    archivio.modifica((r) => {
      r.lezioni.find((l) => l.id === primaOra.id).argomenti = 'Frazioni equivalenti'
      r.lezioni.find((l) => l.id === secondaOra.id).argomenti = 'Equazioni di primo grado'
      r.lezioni.find((l) => l.id === oraSenzaOrario.id).argomenti = 'La Grande Guerra'
      r.lezioni.find((l) => l.id === altraOraSenzaOrario.id).argomenti = ''
    }, [])
    try {
      await fai()
    } finally {
      archivio.modifica((r) => {
        r.lezioni.forEach((l, i) => { l.argomenti = prima[i] })
      }, [])
    }
  }

  const chiedi = (ingresso) =>
    api.chiama(archivio, 'persone.argomenti', { allievoId: rossi.id, ...ingresso })

  it('senza filtro dice che cosa si è fatto nelle ore perse', async () => {
    await conArgomenti(async () => {
      const esito = await chiedi({})
      assert.equal(esito.ok, true, JSON.stringify(esito))
      // Le due ore in cui era assente, di due corsi diversi: una persona
      // perde giornate, non materie, e un elenco per corso non risponde a
      // «che cosa deve recuperare».
      assert.deepEqual(
        esito.dati.ore.map((o) => o.argomenti).sort(),
        ['Frazioni equivalenti', 'La Grande Guerra'],
      )
      assert.equal(esito.dati.presenza, 'perse')
      assert.equal(esito.dati.orePerse, 2)
      assert.ok(esito.dati.ore.every((o) => o.presenza === 'persa'))
    })
  })

  it('«seguite» risponde all’altra metà della domanda', async () => {
    await conArgomenti(async () => {
      const esito = await chiedi({ presenza: 'seguite' })
      assert.deepEqual(
        esito.dati.ore.map((o) => o.argomenti).sort(),
        ['', 'Equazioni di primo grado'],
      )
      // I conti del periodo non si muovono con il filtro: dicono come sta la
      // persona, non che cosa si è chiesto di vedere.
      assert.equal(esito.dati.orePerse, 2)
    })
  })

  it('dice quante delle ore in elenco non dicono che cosa si è fatto', async () => {
    await conArgomenti(async () => {
      // Un'ora senza argomento scritto non si recupera: è un buco che va
      // visto, non contato insieme alle altre.
      const seguite = await chiedi({ presenza: 'seguite' })
      assert.equal(seguite.dati.senzaArgomento, 1)
      const perse = await chiedi({})
      assert.equal(perse.dati.senzaArgomento, 0)
    })
  })

  it('il corso restringe, e un corso di un’altra classe è un rifiuto', async () => {
    await conArgomenti(async () => {
      const uno = await chiedi({ corsoId: conOrario.id })
      assert.deepEqual(uno.dati.ore.map((o) => o.argomenti), ['Frazioni equivalenti'])

      // Zero ore si leggerebbero come «non ha mai perso niente»: è la stessa
      // regola dell'elenco vuoto che non è un registro vuoto.
      const altrove = await chiedi({ corsoId: corsoDeserto.id })
      assert.equal(altrove.ok, false)
      assert.equal(altrove.codice, 'rifiutato')
      assert.match(altrove.messaggi.join(' '), /corsi\.elenco/)
    })
  })

  it('la ricerca guarda l’argomento, e non guarda le maiuscole', async () => {
    await conArgomenti(async () => {
      const esito = await chiedi({ presenza: 'tutte', cerca: 'GUERRA' })
      assert.deepEqual(esito.dati.ore.map((o) => o.argomenti), ['La Grande Guerra'])
    })
  })

  it('un id che non è di nessuno dice come si trova una persona', async () => {
    const esito = await chiedi({ allievoId: 'all-inventato-0001' })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'non-trovato')
    assert.match(esito.messaggi.join(' '), /persone\.cerca/)
  })
})

// I filtri sono gli stessi dappertutto, ed è il punto: chi ha imparato a
// restringere un elenco sa restringerli tutti. Qui si prova che i tre pezzi di
// `common/filters.ts` — periodo, ricerca, pagina — si comportano allo stesso
// modo su letture diverse, e che la pagina è una strada vera e non un
// «troncato: true» che non porta da nessuna parte.
describe('i filtri che le letture si dividono', () => {
  it('la pagina dice dove si è e quante ne restano', async () => {
    const tutte = await api.chiama(archivio, 'ore.elenco', {})
    assert.equal(tutte.ok, true, JSON.stringify(tutte))
    const quante = tutte.dati.quante
    assert.ok(quante >= 4, 'la prova vuole almeno quattro ore a calendario')

    const prima = await api.chiama(archivio, 'ore.elenco', { quanti: 2 })
    assert.equal(prima.dati.ore.length, 2)
    assert.equal(prima.dati.da, 0)
    assert.equal(prima.dati.quante, quante)
    assert.equal(prima.dati.ancora, quante - 2)
    assert.equal(prima.dati.troncato, true)

    const dopo = await api.chiama(archivio, 'ore.elenco', { da: 2, quanti: 2 })
    assert.equal(dopo.dati.da, 2)
    // Le righe della seconda pagina non sono quelle della prima: senza questa
    // riga un `da` ignorato passerebbe tutte le altre prove.
    assert.deepEqual(
      dopo.dati.ore.map((o) => o.id).filter((id) => prima.dati.ore.some((o) => o.id === id)),
      [],
    )
  })

  it('chiedere oltre la fine torna una pagina vuota, non un numero all’indietro', async () => {
    const esito = await api.chiama(archivio, 'ore.elenco', { da: 999 })
    assert.deepEqual(esito.dati.ore, [])
    assert.equal(esito.dati.ancora, 0)
    assert.equal(esito.dati.troncato, false)
    // E dice lo stesso quante ce n'erano: una pagina vuota non è un registro
    // vuoto, come per «persone.cerca».
    assert.ok(esito.dati.quante > 0)
  })

  it('la pagina ha un tetto: una busta non diventa un file', async () => {
    const esito = await api.chiama(archivio, 'ore.elenco', { quanti: 5000 })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'ingresso-non-valido')
  })

  it('valutazioni.elenco non vuole più un corso, e sa restringere per classe', async () => {
    const tutte = await api.chiama(archivio, 'valutazioni.elenco', {})
    assert.equal(tutte.ok, true, JSON.stringify(tutte))
    assert.equal(tutte.dati.corsoId, null, 'nessun corso chiesto, nessun corso dichiarato')
    assert.ok(tutte.dati.momenti.length >= 1)
    // Ogni riga dice di quale corso è: senza, chiedendoli tutti non si
    // saprebbe a quale attribuire una prova.
    assert.ok(tutte.dati.momenti.every((m) => m.corsoId !== ''))

    const perClasse = await api.chiama(archivio, 'valutazioni.elenco', { classeId: classe.id })
    assert.equal(perClasse.dati.momenti.length, tutte.dati.momenti.length)

    const cercata = await api.chiama(archivio, 'valutazioni.elenco', { cerca: 'frazioni' })
    assert.deepEqual(cercata.dati.momenti.map((m) => m.titolo), ['Verifica sulle frazioni'])
  })

  it('piani.elenco non vuole più un corso, e filtra per etichetta', async () => {
    const tutti = await api.chiama(archivio, 'piani.elenco', {})
    assert.equal(tutti.ok, true, JSON.stringify(tutti))
    assert.ok(tutti.dati.piani.length >= 1)
    assert.ok(tutti.dati.piani.every((p) => p.corsoId !== ''))

    const cercati = await api.chiama(archivio, 'piani.elenco', { cerca: 'frazioni equivalenti' })
    assert.equal(cercati.dati.piani.length, 1, 'cerca anche dentro gli obiettivi')

    const conTag = await api.chiama(archivio, 'piani.elenco', { tag: 'mai-messa' })
    assert.deepEqual(conTag.dati.piani, [])
  })

  it('ore.elenco cerca fra gli argomenti e restringe per materia', async () => {
    const prima = archivio.registro.lezioni.map((l) => l.argomenti)
    archivio.modifica((r) => {
      r.lezioni.find((l) => l.id === primaOra.id).argomenti = 'Frazioni equivalenti'
    }, [])
    try {
      const cercate = await api.chiama(archivio, 'ore.elenco', { cerca: 'frazioni' })
      assert.deepEqual(cercate.dati.ore.map((o) => o.id), [primaOra.id])
      assert.equal(cercate.dati.cerca, 'frazioni')

      // Per materia e non per corso: è la domanda «quante ore di storia ho
      // fatto», che per corso vorrebbe dire una chiamata per classe.
      // La materia si ripesca dal registro: nel `before` è una costante
      // locale, e una prova che si porta dietro dei riferimenti al montaggio
      // è una prova che cade quando il montaggio cambia.
      const storia = archivio.registro.materie.find((m) => m.nome === 'Storia')
      const perMateria = await api.chiama(archivio, 'ore.elenco', { materiaId: storia.id })
      assert.ok(perMateria.dati.ore.length >= 1)
      assert.ok(perMateria.dati.ore.every((o) => o.corsoId === senzaOrario.id))
    } finally {
      archivio.modifica((r) => {
        r.lezioni.forEach((l, i) => { l.argomenti = prima[i] })
      }, [])
    }
  })
})

// Chi ha assenze: la domanda con cui si comincia.
//
// Non l'aveva nessuna lettura. `corso.presenze` vuole un corso, `persone.scheda`
// vuole una persona, e «chi ha assenze» non ha né l'uno né l'altro: si fa
// prima di sapere di chi si sta parlando. Qui si prova che la somma la fa il
// registro, che la fa per persona e non per corso, e che gli stati contati si
// scelgono invece di essere decisi da chi ha scritto la procedura.
describe('persone.assenze', () => {
  const chiedi = (ingresso = {}) => api.chiama(archivio, 'persone.assenze', ingresso)

  it('senza filtri risponde solo su chi ne ha, e dice quante persone ha guardato', async () => {
    const esito = await chiedi()
    assert.equal(esito.ok, true, JSON.stringify(esito))
    // Rossi è l'unica con un'assenza nel montaggio di questo file: gli altri
    // non compaiono, ed è quel che vuol dire «gli allievi che hanno assenze».
    assert.deepEqual(esito.dati.persone.map((p) => p.nomeCompleto), ['Rossi Maria'])
    assert.equal(esito.dati.conSegnalazioni, 1)
    // «Guardate» dice su quante si è risposto: senza, una riga sola si legge
    // come «c'è una persona sola», che è l'errore di sempre.
    assert.ok(esito.dati.guardate >= 2)
    assert.deepEqual(esito.dati.stati, ['assente'])
  })

  it('«conAssenze: false» riporta dentro chi non ne ha', async () => {
    const esito = await chiedi({ conAssenze: false, ordina: 'nome' })
    const nomi = esito.dati.persone.map((p) => p.nomeCompleto)
    assert.ok(nomi.includes('Bianchi Luca'), 'chi non ha assenze deve poter comparire')
    assert.ok(nomi.includes('Rossi Maria'))
    assert.equal(nomi.join(' '), [...nomi].sort((a, b) => a.localeCompare(b, 'it')).join(' '))
    const senza = esito.dati.persone.find((p) => p.nomeCompleto === 'Bianchi Luca')
    assert.equal(senza.ud, 0)
    assert.equal(senza.oltreSoglia, false)
  })

  it('gli stati si scelgono, e se ne possono contare più d’uno', async () => {
    // È il punto del campo `stati`: «chi ha problemi di frequenza» non è
    // «chi è assente», e con un valore solo sarebbero due chiamate e una
    // somma a mano che conta due volte chi ha i due stati nella stessa ora.
    const soloRitardi = await chiedi({ stati: ['ritardo'] })
    assert.deepEqual(soloRitardi.dati.stati, ['ritardo'])
    assert.deepEqual(soloRitardi.dati.persone.map((p) => p.nomeCompleto), [])

    const esoneri = await chiedi({ stati: ['esonerato'] })
    assert.deepEqual(esoneri.dati.persone.map((p) => p.nomeCompleto), [])

    const insieme = await chiedi({ stati: ['assente', 'ritardo'] })
    assert.deepEqual(insieme.dati.stati, ['assente', 'ritardo'])
    assert.ok(insieme.dati.persone.length >= 1)
  })

  it('uno stato che non esiste è un ingresso non valido, non un conto a zero', async () => {
    const esito = await chiedi({ stati: ['sparito'] })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'ingresso-non-valido')
  })

  it('la soglia si può scavalcare, e la busta dice quale ha usato', async () => {
    const delRegistro = await chiedi({})
    assert.equal(delRegistro.dati.sogliaUsata, delRegistro.dati.sogliaDelRegistro)

    // Una soglia altissima non la supera nessuno: serve a provare che la
    // cifra viene dall'ingresso e non dalle impostazioni.
    // In cifra tonda, come le impostazioni del registro: 99 è il novantanove
    // per cento. Per un pezzo questo campo ha avuto due scale nella stessa
    // riga — un `soglia` esplicito si confrontava fra 0 e 1, il predefinito
    // del registro arrivava come 20 e non scattava mai — e quel disaccordo
    // faceva rispondere «nessuno oltre soglia» a una classe che ne aveva sette.
    const alta = await chiedi({ soglia: 99 })
    assert.equal(alta.dati.sogliaUsata, 99)
    assert.equal(alta.dati.oltreSoglia, 0)
    assert.ok(alta.dati.persone.every((p) => p.oltreSoglia === false))

    const bassa = await chiedi({ soglia: 1 })
    assert.ok(bassa.dati.oltreSoglia >= 1)
    const soli = await chiedi({ soglia: 1, soloOltreSoglia: true })
    assert.ok(soli.dati.persone.every((p) => p.oltreSoglia))
  })

  it('una riga porta con sé l’id per chiedere che cosa ha perso', async () => {
    const esito = await chiedi({})
    const riga = esito.dati.persone[0]
    // I due attrezzi si passano l'id: senza, «chi ha assenze» e «che cosa ha
    // perso» restano due domande che non si parlano.
    const argomenti = await api.chiama(archivio, 'persone.argomenti', {
      allievoId: riga.allievoId,
    })
    assert.equal(argomenti.ok, true, JSON.stringify(argomenti))
    assert.equal(argomenti.dati.allievoId, riga.allievoId)
  })

  it('il corso restringe il conto, e resta la stessa persona', async () => {
    const tutto = await chiedi({})
    const unCorso = await chiedi({ corsoId: conOrario.id })
    assert.deepEqual(unCorso.dati.persone.map((p) => p.nomeCompleto), ['Rossi Maria'])
    // Meno o uguali: in un corso solo non si possono avere più UD che in tutti.
    assert.ok(unCorso.dati.persone[0].ud <= tutto.dati.persone[0].ud)
    // E la classe porta accanto la materia, perché la busta parla di quel
    // corso: «I MEC A» da solo si rilegge come se fossero tutte.
    assert.match(unCorso.dati.persone[0].classe, / — /)
  })

  // Il guasto da cui è nato tutto il resto: «elenco degli allievi con assenze»
  // con un `corsoId` di un'altra classe, infilato dal contesto dell'interfaccia.
  // L'incrocio dei due filtri non lasciava in piedi nessuna classe, la busta
  // usciva a zero con `ok: true`, e di lì «non sono state trovate assenze per
  // nessun allievo» è una deduzione corretta da una premessa falsa.
  it('la classe e un corso di un’altra classe sono un errore che nomina il conflitto', async () => {
    const esito = await chiedi({ classeId: classe.id, corsoId: corsoDeserto.id })
    assert.equal(esito.ok, false, 'due filtri che si escludono non possono tornare uno zero')
    assert.equal(esito.codice, 'ingresso-non-valido')
    assert.equal(esito.campo, 'corsoId')
    const detto = esito.messaggi.join(' ')
    // Le due classi per nome: un errore che non dice **quale** dei due id è di
    // troppo non si corregge, e chi lo riceve ritenta con gli stessi due.
    assert.match(detto, /II MEC B/, 'manca la classe di cui è il corso')
    assert.match(detto, /I MEC A/, 'manca la classe che era stata chiesta')
    assert.match(detto, /corsi\.elenco/)
  })

  it('la classe con un corso che è suo resta una risposta buona', async () => {
    // La guardia non deve aver chiuso la porta anche a chi passa i due id
    // giusti: è la coppia che il pannello manda quando la classe è aperta.
    const esito = await chiedi({ classeId: classe.id, corsoId: conOrario.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(esito.dati.persone.map((p) => p.nomeCompleto), ['Rossi Maria'])
    assert.equal(esito.dati.corsiGuardati, 1)
  })

  it('un allievoId che non è di nessuno dice come si trova una persona', async () => {
    // Era il solo dei tre id senza guardia: un `.filter` su un id inventato
    // tornava una busta buona e vuota, che chi legge riceve come «quella
    // persona non ha assenze» — detto di una persona che non esiste.
    const esito = await chiedi({ allievoId: 'all-inventato-0001' })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'non-trovato')
    assert.match(esito.messaggi.join(' '), /persone\.cerca/)
  })

  // I conti di quel che è rimasto fuori: sono la differenza fra «non ho
  // trovato» e «non ho guardato», e prima di loro la busta diceva le due cose
  // con lo stesso zero.
  it('la busta dice quanti corsi ha guardato e chi hanno tolto i filtri', async () => {
    const tutte = await chiedi({})
    // Tre corsi: i due della I MEC A e quello della II MEC B.
    assert.equal(tutte.dati.corsiGuardati, 3)
    // Neri si è ritirato: resta fuori di suo, e adesso la busta lo dice.
    assert.equal(tutte.dati.esclusiRitirati, 1)
    // Bianchi non ha assenze: lo toglie `conAssenze`, acceso di suo.
    assert.equal(tutte.dati.escluseSenzaAssenze, 1)
    // Nessuna classe archiviata: nullo e non zero, o il pannello scriverebbe
    // una riga su un problema che non c'è.
    assert.equal(tutte.dati.esclusiArchiviate, null)

    // Gli interruttori accesi spengono i conti: quel che è dentro non è
    // «escluso», e uno zero scritto lo stesso rimanderebbe a riaccenderli.
    const con = await chiedi({ ritirati: true, conAssenze: false })
    assert.equal(con.dati.esclusiRitirati, null)
    assert.equal(con.dati.escluseSenzaAssenze, null)
    assert.ok(con.dati.persone.some((p) => p.nomeCompleto === 'Neri Ugo'))
  })

  it('un corso guardato senza nessuno dentro non è «nessuna assenza»', async () => {
    // La classe in cui non è rimasto nessuno di attivo: un corso guardato,
    // zero persone, e il numero che dice perché.
    const esito = await chiedi({ corsoId: corsoDeserto.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(esito.dati.persone, [])
    assert.equal(esito.dati.guardate, 0)
    assert.equal(esito.dati.corsiGuardati, 1, 'il corso è stato guardato davvero')
    assert.equal(esito.dati.esclusiRitirati, 1, 'e chi c’era è stato tolto da un filtro')

    const dentro = await chiedi({ corsoId: corsoDeserto.id, ritirati: true, conAssenze: false })
    assert.deepEqual(dentro.dati.persone.map((p) => p.nomeCompleto), ['Neri Ugo'])
    assert.equal(dentro.dati.esclusiRitirati, null)
  })

  it('una classe archiviata svuota la risposta, e la busta lo dice', async () => {
    // È il caso su cui le istruzioni del modello gli insegnano a ritentare
    // («quando la busta dice esclusiArchiviate maggiore di zero e l’elenco è
    // vuoto…»): senza quel numero, la regola non aveva su che cosa scattare.
    const segna = (archiviata) => archivio.modifica((r) => {
      r.classi.find((c) => c.id === classe.id).archiviata = archiviata
    }, ['classi'])

    segna(true)
    try {
      const esito = await chiedi({})
      assert.equal(esito.ok, true, JSON.stringify(esito))
      assert.deepEqual(esito.dati.persone, [])
      assert.equal(esito.dati.esclusiArchiviate, 2, 'le due persone della classe archiviata')
      assert.equal(esito.dati.corsiGuardati, 1, 'restava solo il corso dell’altra classe')

      const dentro = await chiedi({ archiviate: true })
      assert.deepEqual(dentro.dati.persone.map((p) => p.nomeCompleto), ['Rossi Maria'])
      assert.equal(dentro.dati.esclusiArchiviate, null)
      assert.equal(dentro.dati.corsiGuardati, 3)
    } finally {
      segna(false)
    }
  })

  it('un filtro di testo che non filtra niente lo dichiara', async () => {
    // «@», «…», «李»: `normalizzaTesto` li riduce a niente, e un elenco di
    // pezzi vuoto lascia passare tutti. La busta rimandava «cerca: @» accanto a
    // tutte le righe del registro, e chi legge capiva «queste corrispondono a @».
    const chiocciola = await chiedi({ cerca: '@' })
    assert.equal(chiocciola.ok, true, JSON.stringify(chiocciola))
    assert.equal(chiocciola.dati.cercaIgnorato, true)
    assert.deepEqual(chiocciola.dati.persone.map((p) => p.nomeCompleto), ['Rossi Maria'])

    // Un filtro che filtra non si dichiara ignorato, né quando trova né quando
    // non trova: «nessuno corrisponde» e «non ho filtrato» sono due fatti.
    const vero = await chiedi({ cerca: 'rossi' })
    assert.equal(vero.dati.cercaIgnorato, false)
    assert.equal(vero.dati.cerca, 'rossi')
    const nessuno = await chiedi({ cerca: 'zzz' })
    assert.equal(nessuno.dati.cercaIgnorato, false)
    assert.deepEqual(nessuno.dati.persone, [])
  })

  it('il periodo dichiarato è quello su cui si è contato davvero', async () => {
    const anno = archivio.registro.anni[0]
    const semestri = anno.semestri
    const chiesto = await chiedi({ dal: DAL, al: AL })
    assert.equal(chiesto.dati.dal, DAL)
    assert.equal(chiesto.dati.al, AL)

    // Senza `dal` e `al` si conta sul calendario della classe — i semestri del
    // suo anno — mentre la busta rimandava gli estremi dichiarati dall'anno in
    // uso. In un registro valido i due coincidono (`validation.ts` lo impone),
    // quindi qui si fanno divergere apposta: prima la busta diceva il 2020, e
    // aveva contato da settembre.
    const inizioVero = anno.inizio
    archivio.modifica((r) => { r.anni[0].inizio = '2020-01-01' }, ['registro'])
    try {
      const esito = await chiedi({})
      assert.equal(esito.dati.dal, semestri[0].inizio)
      assert.equal(esito.dati.al, semestri[semestri.length - 1].fine)
      assert.notEqual(esito.dati.dal, '2020-01-01', 'la busta dichiarava un periodo che non ha guardato')
    } finally {
      archivio.modifica((r) => { r.anni[0].inizio = inizioVero }, ['registro'])
    }
  })
})

// Il periodo e i filtri di `corso.presenze`, che erano scritti a mano.
//
// Tre duplicazioni in una procedura sola — lo schema di `dal` e `al`, la loro
// risoluzione, il confronto — proprio in quella che `common/filters.ts` cita
// come la regola. E una differenza di comportamento vera: senza semestri
// questa guardava tutto il tempo invece di ricadere sugli estremi dell'anno.
describe('corso.presenze: il periodo condiviso, e chi resta fuori', () => {
  const chiedi = (ingresso) => api.chiama(archivio, 'corso.presenze', ingresso)

  it('senza dal e al risponde sul calendario dell’anno della classe', async () => {
    const anno = archivio.registro.anni[0]
    const esito = await chiedi({ corsoId: conOrario.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.dal, anno.semestri[0].inizio)
    assert.equal(esito.dati.al, anno.semestri[anno.semestri.length - 1].fine)
  })

  it('dice quante ore ha guardato, e zero non è «nessuna assenza»', async () => {
    const settembre = await chiedi({ corsoId: conOrario.id, dal: DAL, al: AL })
    assert.equal(settembre.dati.oreGuardate, 2)

    // Ottobre non ha nemmeno un'ora: la tabella esce con tutte le quote a
    // zero, ed è l'unico campo che distingue quel mese da un mese senza assenze.
    const ottobre = await chiedi({ corsoId: conOrario.id, dal: OTTOBRE_DAL, al: OTTOBRE_AL })
    assert.equal(ottobre.dati.oreGuardate, 0)
  })

  it('chi si è ritirato restava fuori senza che niente lo dicesse', async () => {
    // La classe svuotata: prima la busta usciva con zero righe e nessuna
    // parola, e non c'era nemmeno l'interruttore per riportarla dentro.
    const senza = await chiedi({ corsoId: corsoDeserto.id, dal: DAL, al: AL })
    assert.deepEqual(senza.dati.righe, [])
    assert.equal(senza.dati.esclusiRitirati, 1)

    const con = await chiedi({ corsoId: corsoDeserto.id, dal: DAL, al: AL, ritirati: true })
    assert.deepEqual(con.dati.righe.map((r) => r.cognome), ['Neri'])
    assert.equal(con.dati.esclusiRitirati, null)
  })
})

// «Qual è la prossima lezione?»
//
// La domanda che la chat non sapeva riconoscere: il conto stava nel dominio
// (`prossimaLezione`) e non c'era nessuna porta per chiederlo da fuori. Chi ci
// provava con `ore.elenco` doveva chiedere l'anno intero e ordinare a mente, e
// un modello che ci prova risponde con la prima riga dell'elenco, che è la
// prima **dell'anno**.
//
// Qui il momento si passa sempre, apposta: è l'unica lettura dell'API che
// guarderebbe l'orologio, e una prova che dipende dall'ora in cui gira è una
// prova che un giorno cade da sola.
describe('ore.prossima', () => {
  const chiedi = (ingresso) =>
    api.chiama(archivio, 'ore.prossima', { da: '2026-09-01', dalleOre: '07:00', ...ingresso })

  it('è la prima che deve ancora cominciare, non la prima dell’anno', async () => {
    const esito = await chiedi({ corsoId: conOrario.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.prossime.length, 1)
    assert.equal(esito.dati.prossime[0].id, primaOra.id)
    assert.equal(esito.dati.prossime[0].fraGiorni, 0)
    assert.equal(esito.dati.prossime[0].momento, 'futura')
    // E la busta dice da quando ha guardato: senza, una risposta che dipende
    // dall'istante non si può nemmeno rileggere il giorno dopo.
    assert.equal(esito.dati.da, '2026-09-01')
    assert.equal(esito.dati.dalleOre, '07:00')
  })

  it('un’ora già cominciata è ancora «la prossima», e lo dice', async () => {
    // Chi chiede a metà lezione non vuole sentirsi rispondere con quella dopo:
    // la sua prossima è quella in cui è dentro.
    const esito = await chiedi({ corsoId: conOrario.id, dalleOre: '09:00' })
    assert.equal(esito.dati.prossime[0].id, primaOra.id)
    assert.equal(esito.dati.prossime[0].momento, 'in-corso')
  })

  it('finita quella, passa al giorno dopo', async () => {
    const esito = await chiedi({ corsoId: conOrario.id, dalleOre: '12:00' })
    assert.equal(esito.dati.prossime[0].id, secondaOra.id)
    assert.equal(esito.dati.prossime[0].fraGiorni, 7)
  })

  it('«quante» dà anche quelle dopo, in ordine e senza ripetere', async () => {
    const esito = await chiedi({ corsoId: conOrario.id, quante: 5 })
    assert.deepEqual(esito.dati.prossime.map((o) => o.id), [primaOra.id, secondaOra.id])
    // Il momento sta solo sulla prima: sulle altre «in corso» non vuol dire
    // niente, e un campo che risponde a una domanda che nessuno ha fatto si
    // legge come un dato.
    assert.equal(esito.dati.prossime[1].momento, null)
  })

  it('il filtro si applica prima di cercare, non dopo', async () => {
    // Cercare prima e filtrare poi darebbe «non ce n'è nessuna» ogni volta che
    // la prossima in assoluto è di un altro corso: qui le due del corso senza
    // orario cadono negli stessi due giorni di quelle con l'orario.
    const esito = await chiedi({ corsoId: senzaOrario.id })
    assert.equal(esito.dati.prossime[0].id, oraSenzaOrario.id)
    assert.equal(esito.dati.prossime[0].corsoId, senzaOrario.id)
  })

  it('finite le ore lo dice, e distingue «non ce n’è più» da «non ho guardato»', async () => {
    const finite = await chiedi({ corsoId: conOrario.id, da: '2027-01-01' })
    assert.deepEqual(finite.dati.prossime, [])
    // Il calendario non è vuoto: le ore ci sono, sono solo tutte passate.
    assert.ok(finite.dati.aCalendario > 0)
  })

  it('un corso che non esiste è un errore, non un elenco vuoto', async () => {
    const esito = await chiedi({ corsoId: 'cor-inventato' })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'non-trovato')
  })
})
