// Le letture: che rispondano, con la forma che dichiarano, senza toccare niente.
//
// `genere: 'lettura'` decide che una chiamata si può rifare e che sta fuori
// dalla coda delle scritture: una lettura che scrivesse lo farebbe senza
// mettersi in fila. L'invariante si prova per tutte, sul contatore
// `archivio.revisione` (una scrittura che non lo muove non arriva su disco).
//
// In più:
//   1. `registro.integrita` non applica le riparazioni che trova;
//   2. i bordi di `corso.presenze` dove un denominatore va a zero (i tre
//      denominatori li prova `procedures.test.mjs`);
//   3. i valori della busta, non i tipi (lo schema d'uscita lo impone il nucleo).
//
// I modelli di stampa sono del programma (`data/defaultTemplates.ts`): il caso
// felice di `modelli.leggi` e `modelli.prova` non prepara niente su disco.

import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

import { cartelleDiProva, smonta } from '../helpers/archivio.mjs'

const { radice, lavoro, dati } = cartelleDiProva('registro-api-letture-')

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
/** Un calendario ICS minimo, scritto nella cartella della prova. */
const CALENDARIO = percorso.join(radice, 'orario.ics')
/** Un altro anno, chiuso: `classi.altrove` lo legge senza aprirlo. */
const ANNO_SCORSO = percorso.join(dati, '2025-2026.regi')

/**
 * Le trentaquattro letture con un ingresso buono per ciascuna: un elenco solo,
 * perché «risponde» e «non tocca niente» girino sulle stesse.
 */
function leTutte () {
  return [
    ['registro.riassunto', {}],
    ['corsi.elenco', {}],
    ['corso.presenze', { corsoId: conOrario.id, dal: DAL, al: AL }],
    ['ore.appello.leggi', { lezioneId: primaOra.id }],
    // Le letture sugli id del contesto: classe, persona, ora, prova, piano, pendenza.
    ['classi.elenco', {}],
    ['classe.persone', { classeId: classe.id }],
    ['persone.cerca', { cerca: 'rossi' }],
    ['persone.scheda', { allievoId: rossi.id }],
    ['persone.argomenti', { allievoId: rossi.id }],
    ['persone.assenze', {}],
    ['persone.medie', {}],
    ['mappa.elenco', {}],
    ['ore.elenco', { corsoId: conOrario.id }],
    // Il momento si passa sempre: senza, la lettura guarderebbe l'orologio.
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
    // Senza `cerca` e con un deposito che non esiste: l'esito non dipende dalla
    // rete.
    ['llm.file', { deposito: 'nessuno/inesistente-GGUF', taglio: 'Q4_K_M' }],
    // Da un file e non da un indirizzo: la rete qui non c'è.
    ['calendario.confronta', { dal: DAL, al: AL }],
    ['calendario.eventi', { dal: DAL, al: AL }],
    // Con l'Electron finto il registro non è impacchettato: non si aggiorna da sé
    // e non va in rete.
    ['aggiornamenti.stato', {}],
    // Anche su un corso senza lista: risponde vuota, non «non trovata».
    ['check.leggi', { corsoId: conOrario.id }],
    // Un altro documento, letto e non aperto: non muove la revisione di questo.
    ['classi.altrove', { percorso: ANNO_SCORSO }],
    // Lo stesso documento, blocco per blocco per l'import intero.
    ['registro.altrove', { percorso: ANNO_SCORSO }],
    // Il dialogo finto risponde «annullato»: torna null.
    ['registro.sfoglia', {}],
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
  writeFileSync(CALENDARIO, [
    'BEGIN:VCALENDAR', 'VERSION:2.0',
    'BEGIN:VEVENT', 'UID:c1', 'DTSTART:20260908T082000', 'DTEND:20260908T090500', 'SUMMARY:Prova',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\n'))

  api = await import('../../dist-tests/api.mjs')
  api.registraTutte()

  const {
    Archivio, Uri,
    creaAllievo, creaAnno, creaClasse, creaConsegna, creaCorso, creaLezione, creaMateria,
    creaPiano, creaValutazione,
  } = api

  // L'anno scorso, scritto e lasciato, con una classe: per `classi.altrove`.
  const scorso = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  await scorso.apri(null)
  await scorso.creaAnno(creaAnno('2025-09-01', '2026-06-30'), Uri.file(ANNO_SCORSO))
  const vecchia = creaClasse(scorso.registro.anni[0].id, 'I MEC A')
  vecchia.allievi.push(creaAllievo('Verdi', 'Anna'))
  scorso.modifica((r) => { r.classi.push(vecchia) }, ['classi'])
  await scorso.chiudi()
  scorso.dispose()

  archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  await archivio.apri(null)
  await archivio.creaAnno(
    creaAnno(DAL, '2027-06-30'),
    Uri.file(percorso.join(dati, '2026-2027.regi')),
  )
  const annoId = archivio.registro.anni[0].id

  classe = creaClasse(annoId, 'I MEC A')
  rossi = creaAllievo('Rossi', 'Maria')
  bianchi = creaAllievo('Bianchi', 'Luca')
  classe.allievi.push(rossi, bianchi)

  // Una classe in cui non è rimasto nessuno di attivo: l'allievo c'è ancora, ma
  // ritirato, ed è la differenza che `allieviAttivi` fa.
  const desertata = creaClasse(annoId, 'II MEC B')
  const ritirato = creaAllievo('Neri', 'Ugo')
  ritirato.attivo = false
  desertata.allievi.push(ritirato)

  // Due materie diverse: con una sola `riferimentiRotti` segnalerebbe due corsi
  // per la stessa materia, un difetto che la prova non mette.
  const matematica = creaMateria('Matematica')
  const storia = creaMateria('Storia')

  conOrario = creaCorso(classe.id, matematica.id, 'I MEC A — Matematica')
  conOrario.orario = [{ id: 'ric-prova-0001', giorno: MARTEDI, inizio: '08:20', durataMin: 90, aula: '' }]

  // Nessuna fascia fissa: il corso a ore variabili che esiste solo a calendario.
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
    // PDF automatici fermi: rifarli in sottofondo terrebbe in piedi il processo.
    r.impostazioni.pdfAutomatici = 'mai'
    r.classi.push(classe, desertata)
    r.materie.push(matematica, storia, disegno)
    r.corsi.push(conOrario, senzaOrario, corsoDeserto)
    r.lezioni.push(primaOra, secondaOra, oraSenzaOrario, altraOraSenzaOrario, oraColPianoRotto)
  }, ['classi', 'corsi', 'lezioni', 'registro'])

  // L'appello sul corso con l'orario: un'assenza e una presenza.
  await api.chiama(archivio, 'ore.appello.riga', {
    lezioneId: primaOra.id, allievoId: rossi.id, stato: 'assente',
  })
  await api.chiama(archivio, 'ore.appello.riga', {
    lezioneId: secondaOra.id, allievoId: rossi.id, stato: 'presente',
  })
  // E sul corso senza orario, così i suoi conti hanno un numeratore.
  await api.chiama(archivio, 'ore.appello.riga', {
    lezioneId: oraSenzaOrario.id, allievoId: rossi.id, stato: 'assente',
  })
  await api.chiama(archivio, 'ore.appello.riga', {
    lezioneId: altraOraSenzaOrario.id, allievoId: rossi.id, stato: 'presente',
  })

  // Un piano, una prova e una pendenza, passando dalle procedure di scrittura:
  // si legge quel che il registro scriverebbe davvero.
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

  // Le letture del calendario leggono la copia del documento, non il file sopra.
  api.registraDeposito(archivio.deposito)
  const calendario = await api.chiama(archivio, 'calendario.aggiungi', { origine: CALENDARIO })
  assert.equal(calendario.ok, true, JSON.stringify(calendario))

  // Il difetto voluto, messo per ultimo: una lezione che cita una scaletta
  // inesistente. `riparazioni()` saprebbe staccarla e non deve farlo.
  archivio.modifica((r) => {
    r.lezioni.find((l) => l.id === oraColPianoRotto.id).pianoId = PIANO_FANTASMA
  }, ['lezioni'])
})

after(() => smonta(radice, archivio))

describe('l’elenco delle letture', () => {
  it('sono trentaquattro, e la tabella di questo file è esattamente quella', () => {
    // La tabella copre tutte le letture dichiarate: una lettura dimenticata qui
    // sfuggirebbe alle due prove che seguono.
    const dichiarate = api.procedure()
      .filter((p) => p.genere === 'lettura')
      .map((p) => p.nome)
      .sort()
    const provate = leTutte().map(([nome]) => nome).sort()
    assert.deepEqual(provate, dichiarate)
    assert.equal(dichiarate.length, 34, `letture dichiarate: ${dichiarate.length}`)
  })
})

describe('le trentaquattro letture rispondono, e nella forma che dichiarano', () => {
  it('registro.riassunto conta l’anno, le classi, i corsi e le ore', async () => {
    const esito = await api.chiama(archivio, 'registro.riassunto', {})
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const r = archivio.registro
    assert.equal(esito.dati.versione, r.versione)
    assert.equal(esito.dati.classi, r.classi.length)
    assert.equal(esito.dati.corsi, 3)
    assert.equal(esito.dati.lezioni, 5)
    // Uno e uno: la prova e la pendenza messe per `valutazioni.voti` e
    // `consegne.elenco`.
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
    // Zero fasce: il corso che l'orario non prevede.
    assert.equal(storia.fasce, 0)

    // La classe desertata: l'allievo c'è ma non è attivo, quindi zero persone.
    const disegno = esito.dati.corsi.find((c) => c.id === corsoDeserto.id)
    assert.equal(disegno.allievi, 0)
  })

  // L'anno si può omettere: la busta dice lo stesso quale ha usato.
  it('corsi.elenco dice di quale anno ha risposto, anche senza averlo chiesto', async () => {
    const esito = await api.chiama(archivio, 'corsi.elenco', {})
    assert.equal(esito.ok, true, JSON.stringify(esito))
    const anno = archivio.registro.anni[0]
    assert.equal(esito.dati.annoId, anno.id)
    assert.equal(esito.dati.anno, anno.etichetta)
  })

  // Gli anni caricati sono solo il documento aperto (`archivio.leggiTutto`):
  // l'id di un altro anno non è un filtro che non pesca, è un documento non
  // aperto, e va detto col rimedio accanto.
  it('classi.elenco e corsi.elenco, con un anno che non è quello aperto, lo dicono', async () => {
    for (const nome of ['classi.elenco', 'corsi.elenco']) {
      const esito = await api.chiama(archivio, nome, { annoId: 'ann-inventato-0001' })
      assert.equal(esito.ok, false, `${nome} ha risposto come se quell'anno ci fosse`)
      assert.equal(esito.codice, 'non-trovato')
      assert.match(esito.messaggi.join(' '), /registro\.riassunto/)
    }
  })

  // L'anno aperto, nominato per esteso, resta una risposta buona.
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
    // Il corso che non c'è lo prova `procedures.test.mjs`: qui basta la forma.
    assert.ok(esito.dati.udPreviste > 0)
  })

  // Il `titolo` di un corso può essere vuoto: la busta dice classe e materia.
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
    // Il nome accanto all'id: il modello non ha un altro attrezzo per risolverlo.
    assert.equal(riga.cognome, 'Rossi')
    assert.equal(riga.nome, 'Maria')
    for (const r of esito.dati.righe) {
      for (const stato of r.stati) assert.ok(api.STATI_APPELLO.includes(stato))
    }
  })

  // Una persona «non trovata» dice **dove si cerca**, o resta solo riprovare con
  // un altro id.
  it('persone.scheda, con un id che non esiste, dice come si trova una persona', async () => {
    const esito = await api.chiama(archivio, 'persone.scheda', { allievoId: 'all-inventato-0001' })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'non-trovato')
    assert.match(esito.messaggi.join(' '), /persone\.cerca/)
    assert.match(esito.messaggi.join(' '), /classe\.persone/)
  })

  // Senza filtro torna tutte: un attrezzo che non sa dire «tutte» costringe a
  // inventarsi un filtro, che torna vuoto.
  it('persone.cerca senza filtro torna tutte, e dice quante ce ne sono', async () => {
    const esito = await api.chiama(archivio, 'persone.cerca', {})
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(
      esito.dati.persone.map((p) => p.nomeCompleto).sort(),
      ['Bianchi Luca', 'Rossi Maria'],
    )
    // Tre e non due: «in registro» conta anche Neri, ritirato e tenuto fuori dal
    // filtro predefinito. Il numero dice quante persone ci sono, non quante ne
    // manda.
    assert.equal(esito.dati.inRegistro, 3)
    assert.equal(esito.dati.esclusiRitirati, 1)
    // Nullo e non zero: nessuna classe archiviata.
    assert.equal(esito.dati.esclusiArchiviate, null)
  })

  // Classi archiviate e ritirati svuotano la busta coi filtri predefiniti:
  // `inRegistro` dice lo stesso quante persone ci sono.
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

      // L'interruttore che le riporta dentro, come dicono le istruzioni del modello.
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

  // «Zero corrispondono» e «zero ce ne sono» sono due fatti: la busta li dice
  // tutti e due.
  it('una ricerca a vuoto dice lo stesso quante persone ci sono', async () => {
    const esito = await api.chiama(archivio, 'persone.cerca', { cerca: 'zurigo' })
    assert.equal(esito.dati.quante, 0)
    assert.equal(esito.dati.inRegistro, 3)
    // E dice che cosa fare.
    assert.match(esito.dati.suggerimento, /senza .cerca./)
    assert.match(esito.dati.suggerimento, /3/)
  })

  // «cerca: allievo» nomina la categoria, non filtra: la parola si toglie in
  // codice (la regola nel prompt non basta) e la busta lo dice.
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

  // Maiuscole, accenti e apostrofi non contano: «muller» trova «Müller»,
  // «dellacqua» trova «Dell'Acqua».
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

  // Tolta la parola di categoria, il resto filtra ancora: «rossi allievo» è Rossi.
  it('la parola di categoria si toglie, il resto del filtro resta', async () => {
    const esito = await api.chiama(archivio, 'persone.cerca', { cerca: 'rossi allievo' })
    assert.deepEqual(esito.dati.persone.map((p) => p.nomeCompleto), ['Rossi Maria'])
    assert.equal(esito.dati.cerca, 'rossi')
    assert.equal(esito.dati.ignorato, 'allievo')
  })

  // Le altre due letture con un filtro acceso di suo dicono anch'esse chi tengono
  // fuori.
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

    // Ogni pezzo deve trovarsi: una parola in più restringe.
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
    // Di una riparazione escono l'effetto e i file toccati; la closure che la
    // applica no.
    assert.equal(stacca.dettaglio, 'lezioni')
  })

  it('documenti.inventario risponde con i quattro elenchi, e i modelli sono quelli del programma', async () => {
    const esito = await api.chiama(archivio, 'documenti.inventario', {})
    assert.equal(esito.ok, true, JSON.stringify(esito))
    for (const campo of ['esportazioni', 'archivio', 'composizioni', 'modelli']) {
      assert.ok(Array.isArray(esito.dati[campo]), `${campo} non è un elenco`)
    }
    // Su un anno appena nato le prime tre sono vuote.
    assert.deepEqual(esito.dati.esportazioni, [])
    assert.deepEqual(esito.dati.archivio, [])
    assert.deepEqual(esito.dati.composizioni, [])
    // `modelli` è il catalogo, sempre intero.
    const nomi = esito.dati.modelli.map((voce) => voce.nome)
    assert.ok(nomi.includes('_base'), nomi.join(', '))
    assert.ok(nomi.includes('verbale-lezione'), nomi.join(', '))
    const base = esito.dati.modelli.find((voce) => voce.nome === '_base')
    assert.equal(base.file, '_base.tpl')
    for (const campo of ['suDisco', 'modificato', 'arretrato', 'misura']) {
      assert.ok(!(campo in base), `«${campo}» parla di un disco che non c’è più`)
    }
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
    // «rifiutato» e non «non-trovato»: il lessico non ha un termine per «modello»
    // (vedi `src/api/procedures/modelli/leggi.ts`).
    assert.equal(esito.codice, 'rifiutato')
    assert.match(esito.messaggi[0], /modello-che-non-esiste/)
  })

  it('modelli.prova compone il PDF e lo rimanda senza scriverlo', async () => {
    const esito = await api.chiama(archivio, 'modelli.prova', { nome: 'verbale-lezione' })
    assert.equal(esito.ok, true, JSON.stringify(esito).slice(0, 300))
    // Un PDF vero: `%PDF-` in base64 comincia per `JVBERi`.
    assert.match(esito.dati.pdf, /^JVBERi/)
  })

  it('modelli.prova non prende più una bozza: la scarta e compone il modello del programma', async () => {
    // `bozza` non esiste più: `oggetto()` la scarta, e torna il foglio di serie.
    const esito = await api.chiama(archivio, 'modelli.prova', { nome: 'verbale-lezione', bozza: '' })
    assert.equal(esito.ok, true, JSON.stringify(esito).slice(0, 300))
    assert.equal(esito.versione, 2)
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
  it('tutte e trentaquattro lasciano «archivio.revisione» dov’era', async () => {
    // Una per una, col nome: la prima cosa che si vuole sapere è quale ha scritto.
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
    // Con l'ingresso sbagliato apposta: una procedura non scrive prima di
    // rifiutare.
    const storti = [
      ['corsi.elenco', { annoId: '' }],
      ['corso.presenze', { corsoId: 'cor-sparito-0001' }],
      ['ore.appello.leggi', { lezioneId: 'lez-sparita-0001' }],
      ['modelli.leggi', { nome: '' }],
      ['modelli.prova', { nome: '' }],
      // Un calendario che il documento non ha.
      ['calendario.confronta', { calendarioId: 'ics-inesistente-0000' }],
      ['calendario.eventi', { calendarioId: 'ics-inesistente-0000' }],
      ['check.leggi', { corsoId: 'cor-sparito-0001' }],
    ]
    for (const [nome, ingresso] of storti) {
      const prima = archivio.revisione
      const esito = await api.chiama(archivio, nome, ingresso)
      assert.equal(esito.ok, false, `${nome} ha accettato un ingresso storto`)
      assert.equal(archivio.revisione, prima, `${nome} ha scritto rifiutando`)
    }
  })
})

describe('calendario.eventi consegna gli eventi così come sono', () => {
  it('l’evento del file, sull’orologio di chi insegna, con il periodo che copre', async () => {
    // L'evento arriva con titolo e ora, come lo disegna il calendario del pannello.
    const esito = await api.chiama(archivio, 'calendario.eventi', { dal: DAL, al: AL })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.eventi.length, 1)
    const [evento] = esito.dati.eventi
    assert.equal(evento.data, '2026-09-08')
    assert.equal(evento.inizio, '08:20')
    assert.equal(evento.fine, '09:05')
    assert.equal(evento.titolo, 'Prova')
    assert.equal(evento.annullato, false)
    assert.deepEqual(esito.dati.copre, { dal: '2026-09-08', al: '2026-09-08' })
  })

  it('fuori dal periodo non c’è niente, e il periodo non copre niente', async () => {
    const esito = await api.chiama(archivio, 'calendario.eventi', {
      dal: OTTOBRE_DAL, al: OTTOBRE_AL,
    })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(esito.dati.eventi, [])
    assert.equal(esito.dati.copre, null)
  })
})

describe('registro.integrita guarda e basta', () => {
  it('il difetto c’è ancora dopo la lettura, e la revisione non si è mossa', async () => {
    // `riparazioni()` torna oggetti con `applica(registro)`, che riscrive lo stato
    // vivo: una lettura non la chiama mai. Le correzioni passano solo da
    // `manutenzione.ripara`.
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
    // Idempotente: se la prima chiamata correggesse qualcosa, la seconda
    // troverebbe meno da riparare.
    const uno = await api.chiama(archivio, 'registro.integrita', {})
    const due = await api.chiama(archivio, 'registro.integrita', {})
    assert.deepEqual(due.dati, uno.dati)
  })

  it('l’ora rimane com’era in tutto, non solo nel piano', () => {
    // Si guarda l'ora intera, non solo `pianoId`: una riparazione può toccare
    // altro.
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
    // Senza orario fisso `matriceCorso` ripiega sulle UD delle ore passate
    // (`domain/courseMatrix.ts`), e `udPreviste` dichiara quel denominatore, lo
    // stesso su cui sono contate `assenza` e `frequenza`.
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
    // Il denominatore dichiarato è quello su cui l'assenza è contata.
    assert.equal(riga.assenza, riga.udAssenza / dati.udPreviste)
  })

  it('un periodo senza nemmeno un’ora non fa assenti, e la presenza resta «non si sa»', async () => {
    // Ottobre: nessuna ora a calendario. Un mese non generato non è un mese di
    // assenze, quindi le previste non si contano come perse.
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
    // «Non si sa» è `null`, non zero.
    assert.equal(riga.presenza, null)
    assert.notEqual(riga.presenza, 0)
  })

  it('una classe senza nessuno di attivo torna zero righe, e i denominatori restano', async () => {
    // Nessuna riga, ma `udPreviste` e `udACalendario` sono del corso e restano.
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
    // Due persone attive: il conto da cui dipendono le righe delle prove sopra.
    assert.ok(oraDi(primaOra).presenze.some((p) => p.allievoId === bianchi.id))
  })
})

// Che cosa ha perso e che cosa ha fatto: l'incrocio fra argomenti e appello lo
// fa il registro, con gli stessi conti dei rapporti.
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
      // Le ore perse di due corsi diversi: si perdono giornate, non materie.
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
      // I conti del periodo non dipendono dal filtro.
      assert.equal(esito.dati.orePerse, 2)
    })
  })

  it('dice quante delle ore in elenco non dicono che cosa si è fatto', async () => {
    await conArgomenti(async () => {
      // Un'ora senza argomento scritto è un buco da vedere, non da contare.
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

      // Zero ore si leggerebbero come «non ha mai perso niente».
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

// I filtri di `common/filters.ts` (periodo, ricerca, pagina) si comportano
// allo stesso modo su letture diverse, e la pagina porta davvero avanti.
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
    // La seconda pagina non ripete la prima: un `da` ignorato passerebbe il resto.
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
    // Una pagina vuota dice lo stesso quante ce n'erano.
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
    // Ogni riga dice di quale corso è.
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

      // Per materia e non per corso: «quante ore di storia ho fatto». La materia si
      // ripesca dal registro, non dalla costante del `before`.
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

// Chi ha assenze, senza sapere prima di chi si parla: la somma la fa il
// registro, per persona e non per corso, sugli stati scelti.
describe('persone.assenze', () => {
  const chiedi = (ingresso = {}) => api.chiama(archivio, 'persone.assenze', ingresso)

  it('senza filtri risponde solo su chi ne ha, e dice quante persone ha guardato', async () => {
    const esito = await chiedi()
    assert.equal(esito.ok, true, JSON.stringify(esito))
    // Rossi è l'unica con un'assenza nel montaggio.
    assert.deepEqual(esito.dati.persone.map((p) => p.nomeCompleto), ['Rossi Maria'])
    assert.equal(esito.dati.conSegnalazioni, 1)
    // «Guardate» dice su quante si è risposto.
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
    // Più stati in una chiamata: chi ha due stati nella stessa ora conta una volta.
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

    // Una soglia che nessuno supera: la cifra viene dall'ingresso, non dalle
    // impostazioni. In percentuale intera (99 = novantanove per cento), come le
    // impostazioni del registro.
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
    // I due attrezzi si passano l'id.
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
    // In un corso solo non si possono avere più UD che in tutti.
    assert.ok(unCorso.dati.persone[0].ud <= tutto.dati.persone[0].ud)
    // La classe porta accanto la materia: la busta parla di quel corso.
    assert.match(unCorso.dati.persone[0].classe, / — /)
  })

  // Una classe e un corso di un'altra classe non lasciano nessuno: è un errore,
  // non una busta vuota con `ok: true`.
  it('la classe e un corso di un’altra classe sono un errore che nomina il conflitto', async () => {
    const esito = await chiedi({ classeId: classe.id, corsoId: corsoDeserto.id })
    assert.equal(esito.ok, false, 'due filtri che si escludono non possono tornare uno zero')
    assert.equal(esito.codice, 'ingresso-non-valido')
    assert.equal(esito.campo, 'corsoId')
    const detto = esito.messaggi.join(' ')
    // L'errore nomina le due classi, così si sa quale id è di troppo.
    assert.match(detto, /II MEC B/, 'manca la classe di cui è il corso')
    assert.match(detto, /I MEC A/, 'manca la classe che era stata chiesta')
    assert.match(detto, /corsi\.elenco/)
  })

  it('la classe con un corso che è suo resta una risposta buona', async () => {
    // La coppia giusta, quella che il pannello manda, passa.
    const esito = await chiedi({ classeId: classe.id, corsoId: conOrario.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.deepEqual(esito.dati.persone.map((p) => p.nomeCompleto), ['Rossi Maria'])
    assert.equal(esito.dati.corsiGuardati, 1)
  })

  it('un allievoId che non è di nessuno dice come si trova una persona', async () => {
    // Un id di persona inventato è un errore, non «nessuna assenza».
    const esito = await chiedi({ allievoId: 'all-inventato-0001' })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'non-trovato')
    assert.match(esito.messaggi.join(' '), /persone\.cerca/)
  })

  // I conti di quel che è rimasto fuori: «non ho trovato» contro «non ho
  // guardato».
  it('la busta dice quanti corsi ha guardato e chi hanno tolto i filtri', async () => {
    const tutte = await chiedi({})
    // Tre corsi: i due della I MEC A e quello della II MEC B.
    assert.equal(tutte.dati.corsiGuardati, 3)
    // Neri si è ritirato: resta fuori di suo, e adesso la busta lo dice.
    assert.equal(tutte.dati.esclusiRitirati, 1)
    // Bianchi non ha assenze: lo toglie `conAssenze`, acceso di suo.
    assert.equal(tutte.dati.escluseSenzaAssenze, 1)
    // Nessuna classe archiviata: nullo e non zero.
    assert.equal(tutte.dati.esclusiArchiviate, null)

    // Con gli interruttori accesi i conti si spengono: quel che è dentro non è
    // escluso.
    const con = await chiedi({ ritirati: true, conAssenze: false })
    assert.equal(con.dati.esclusiRitirati, null)
    assert.equal(con.dati.escluseSenzaAssenze, null)
    assert.ok(con.dati.persone.some((p) => p.nomeCompleto === 'Neri Ugo'))
  })

  it('un corso guardato senza nessuno dentro non è «nessuna assenza»', async () => {
    // La classe senza attivi: un corso guardato, zero persone, e il perché.
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
    // Il numero su cui le istruzioni del modello insegnano a ritentare.
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
    // «@», «…», «李» si normalizzano a niente: il filtro si dichiara ignorato,
    // invece di far passare tutti come se corrispondessero.
    const chiocciola = await chiedi({ cerca: '@' })
    assert.equal(chiocciola.ok, true, JSON.stringify(chiocciola))
    assert.equal(chiocciola.dati.cercaIgnorato, true)
    assert.deepEqual(chiocciola.dati.persone.map((p) => p.nomeCompleto), ['Rossi Maria'])

    // Un filtro che filtra non si dichiara ignorato, trovi o no.
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

    // Senza `dal` e `al` si conta sui semestri dell'anno della classe, e la busta
    // dice quegli estremi. Qui i due calendari divergono apposta (in un registro
    // valido `validation.ts` li fa coincidere).
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

// Il periodo e i filtri di `corso.presenze` vengono da `common/filters.ts`:
// senza semestri si ricade sugli estremi dell'anno.
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

    // Ottobre non ha ore: `udACalendario` a zero distingue quel mese da un mese
    // senza assenze.
    const ottobre = await chiedi({ corsoId: conOrario.id, dal: OTTOBRE_DAL, al: OTTOBRE_AL })
    assert.equal(ottobre.dati.oreGuardate, 0)
  })

  it('chi si è ritirato restava fuori senza che niente lo dicesse', async () => {
    // La classe svuotata: la busta dice chi è rimasto fuori e c'è l'interruttore.
    const senza = await chiedi({ corsoId: corsoDeserto.id, dal: DAL, al: AL })
    assert.deepEqual(senza.dati.righe, [])
    assert.equal(senza.dati.esclusiRitirati, 1)

    const con = await chiedi({ corsoId: corsoDeserto.id, dal: DAL, al: AL, ritirati: true })
    assert.deepEqual(con.dati.righe.map((r) => r.cognome), ['Neri'])
    assert.equal(con.dati.esclusiRitirati, null)
  })
})

// «Qual è la prossima lezione?» (`prossimaLezione` del dominio). Il momento si
// passa sempre: una prova che dipende dall'ora in cui gira cade da sola.
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
    // La busta dice da quando ha guardato.
    assert.equal(esito.dati.da, '2026-09-01')
    assert.equal(esito.dati.dalleOre, '07:00')
  })

  it('un’ora già cominciata è ancora «la prossima», e lo dice', async () => {
    // A metà lezione la prossima è quella in corso.
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
    // Il momento sta solo sulla prima: sulle altre non vuol dire niente.
    assert.equal(esito.dati.prossime[1].momento, null)
  })

  it('il filtro si applica prima di cercare, non dopo', async () => {
    // Si filtra prima di cercare: la prossima in assoluto può essere di un altro
    // corso.
    const esito = await chiedi({ corsoId: senzaOrario.id })
    assert.equal(esito.dati.prossime[0].id, oraSenzaOrario.id)
    assert.equal(esito.dati.prossime[0].corsoId, senzaOrario.id)
  })

  it('finite le ore lo dice, e distingue «non ce n’è più» da «non ho guardato»', async () => {
    const finite = await chiedi({ corsoId: conOrario.id, da: '2027-01-01' })
    assert.deepEqual(finite.dati.prossime, [])
    // Il calendario non è vuoto: le ore sono solo tutte passate.
    assert.ok(finite.dati.aCalendario > 0)
  })

  it('un corso che non esiste è un errore, non un elenco vuoto', async () => {
    const esito = await chiedi({ corsoId: 'cor-inventato' })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'non-trovato')
  })
})

describe('check.leggi', () => {
  // Un corso e una classe a sé: la persona ritirata della lista cambierebbe i
  // conti delle altre prove.
  let corsoCheck
  let lezioneCheck
  let verdi
  let gialli
  let ritirata
  let modulo
  let quaderno

  before(async () => {
    const annoId = archivio.registro.anni[0].id
    const classeCheck = api.creaClasse(annoId, 'III ELE C')
    verdi = api.creaAllievo('Verdi', 'Anna')
    gialli = api.creaAllievo('Gialli', 'Piero')
    ritirata = api.creaAllievo('Blu', 'Carla')
    ritirata.attivo = false
    classeCheck.allievi.push(verdi, gialli, ritirata)
    const fisica = api.creaMateria('Fisica')
    corsoCheck = api.creaCorso(classeCheck.id, fisica.id, 'III ELE C — Fisica')
    lezioneCheck = api.creaLezione(corsoCheck.id, '2026-09-03', '08:20', 90)
    archivio.modifica((r) => {
      r.classi.push(classeCheck)
      r.materie.push(fisica)
      r.corsi.push(corsoCheck)
      r.lezioni.push(lezioneCheck)
    }, ['classi', 'corsi', 'lezioni', 'registro'])

    const colonne = await api.chiama(archivio, 'check.colonne', {
      corsoId: corsoCheck.id,
      colonne: [{ id: '', titolo: 'Modulo firmato' }, { id: '', titolo: 'Quaderno' }],
    })
    assert.equal(colonne.ok, true, JSON.stringify(colonne))
    ;[modulo, quaderno] = archivio.registro.check.find((c) => c.corsoId === corsoCheck.id).colonne

    const spunta = (allievoId, colonnaId, altro) =>
      api.chiama(archivio, 'check.spunta', {
        corsoId: corsoCheck.id, allievoId, colonnaId, fatta: true, ...altro,
      })
    for (const esito of [
      await spunta(verdi.id, modulo.id, { lezioneId: lezioneCheck.id }),
      await spunta(verdi.id, quaderno.id, { data: '2026-09-10' }),
      // La ritirata aveva portato il modulo prima di andarsene.
      await spunta(ritirata.id, modulo.id, { data: '2026-09-02' }),
    ]) assert.equal(esito.ok, true, JSON.stringify(esito))
  })

  it('ogni colonna dice quanti l’hanno fatta e chi manca, fra chi frequenta', async () => {
    const esito = await api.chiama(archivio, 'check.leggi', { corsoId: corsoCheck.id })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.equal(esito.dati.allievi, 2)
    const [m, q] = esito.dati.colonne
    assert.deepEqual([m.titolo, m.fatte, m.totale], ['Modulo firmato', 1, 2])
    assert.deepEqual([q.titolo, q.fatte, q.totale], ['Quaderno', 1, 2])
    // Chi si è ritirato non manca a niente: la colonna non si chiuderebbe mai.
    assert.equal(m.mancano.length, 1)
    assert.match(m.mancano[0], /Gialli/)
    assert.equal(q.mancano.length, 1)
    assert.match(q.mancano[0], /Gialli/)
  })

  it('le righe dicono il giorno e l’ora di ogni spunta, e tengono chi si è ritirato', async () => {
    const esito = await api.chiama(archivio, 'check.leggi', { corsoId: corsoCheck.id })
    const riga = (id) => esito.dati.righe.find((r) => r.allievoId === id)
    assert.deepEqual(riga(verdi.id).caselle, [
      { colonnaId: modulo.id, data: '2026-09-03', lezioneId: lezioneCheck.id },
      { colonnaId: quaderno.id, data: '2026-09-10', lezioneId: null },
    ])
    assert.deepEqual(riga(gialli.id).caselle.map((c) => c.data), [null, null])
    assert.equal(riga(ritirata.id).attivo, false)
    assert.equal(riga(ritirata.id).caselle[0].data, '2026-09-02')
  })

  it('una spunta presa in un’ora ha il giorno dell’ora, anche dopo averla spostata', async () => {
    archivio.modifica((r) => {
      r.lezioni.find((l) => l.id === lezioneCheck.id).data = '2026-09-04'
    }, ['lezioni'])
    const esito = await api.chiama(archivio, 'check.leggi', { corsoId: corsoCheck.id })
    const verdiRiga = esito.dati.righe.find((r) => r.allievoId === verdi.id)
    assert.equal(verdiRiga.caselle[0].data, '2026-09-04')
  })

  it('non tocca il registro', async () => {
    const prima = archivio.revisione
    await api.chiama(archivio, 'check.leggi', { corsoId: corsoCheck.id })
    assert.equal(archivio.revisione, prima)
  })
})
