// La presenza e l'assenza di un valore: `ha` e `senza`, sulle tre letture che
// li hanno presi.
//
// È il filtro che risponde alla domanda pratica di ogni settimana — chi non
// riceverà la comunicazione, quali ore non dicono che cosa si è fatto, quali
// prove non ho ancora corretto — e prima di lui l'unica strada era scorrere
// l'elenco a occhio. Su venticinque righe si fa; su un anno intero no, e
// «nessuna» detto dopo aver guardato metà elenco è una risposta sbagliata
// data con sicurezza.
//
// Quel che si prova qui non è che il filtro esista: è che dica **vuoto** dove
// vuoto vuol dire vuoto. Sono quattro regole che si rompono in silenzio, cioè
// tornando un elenco che sembra buono:
//
//   1. **Un telefono senza numero non è un telefono.** La rubrica permette di
//      aprire una riga e non compilarla, e contarla manderebbe la segreteria
//      a cercare una cifra che non c'è: la persona sparirebbe proprio
//      dall'elenco di chi va chiamato.
//   2. **Un indirizzo con la via vuota non è un indirizzo.** Resta quando si
//      è salvata la sola località, e su una busta non ci si scrive niente.
//   3. **Un piano che non esiste più non è un piano.** `pianoId` può puntare
//      a una scaletta che il registro ha perso, e quell'ora è proprio quella
//      da ripreparare.
//   4. **Un appello tutto a «non-impostato» è un'ora senza appello.** La riga
//      c'è, le caselle sono bianche, e contarla come fatta nasconderebbe le
//      ore su cui nessuno ha spuntato niente.
//
// E un caso limite che vale per tutte e tre: un filtro che non trova nessuno
// deve tornare **un elenco vuoto con i conti pieni**, non un errore. Chi
// chiede «chi non ha l'e-mail» e non ha nessuno senza e-mail ha ricevuto una
// risposta, ed è la migliore che ci sia.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-api-valori-'))
const lavoro = percorso.join(radice, 'lavoro')
const dati = percorso.join(lavoro, 'registro')
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

const DAL = '2026-09-01'
const AL = '2027-06-30'
/** Il piano che il registro ha perso: `pianoId` punta a niente. */
const PIANO_FANTASMA = 'pia-inesistente-0001'

let api
let archivio
let classe
let corso
/** Ha tutto: è la riga che nessun filtro «senza» deve mai prendere. */
let completa
/** Ha i telefoni e nient'altro: è la lista delle telefonate da fare. */
let soloTelefono
/** Ha le caselle aperte e vuote: un telefono senza cifre, un indirizzo senza via. */
let nuda

/** L'ora raccontata: argomento, materiali, consuntivo, aula, piano e appello. */
let raccontata
/** L'ora muta: nessuna delle sei caselle. */
let muta
/** L'ora con la scaletta perduta: dice di avere un piano che non c'è. */
let orfana

/** La prova corretta, descritta e riconsegnata. */
let finita
/** La prova con le righe aperte e nessun voto messo. */
let daCorreggere
/** La prova corretta e mai restituita: la pila che resta sulla scrivania. */
let inMano
let aMeta

/** Chi risponde a `persone.cerca` con quei filtri, per cognome. */
async function cognomiCon (ingresso) {
  const esito = await api.chiama(archivio, 'persone.cerca', ingresso)
  assert.equal(esito.ok, true, JSON.stringify(esito))
  return { esito, cognomi: esito.dati.persone.map((p) => p.cognome).sort() }
}

/** Gli id delle ore che passano quei filtri. */
async function oreCon (ingresso) {
  const esito = await api.chiama(archivio, 'ore.elenco', ingresso)
  assert.equal(esito.ok, true, JSON.stringify(esito))
  return { esito, id: esito.dati.ore.map((o) => o.id).sort() }
}

/** I titoli delle prove che passano quei filtri. */
async function proveCon (ingresso) {
  const esito = await api.chiama(archivio, 'valutazioni.elenco', ingresso)
  assert.equal(esito.ok, true, JSON.stringify(esito))
  return { esito, titoli: esito.dati.momenti.map((m) => m.titolo).sort() }
}

/**
 * Una scrittura del corredo che deve riuscire.
 *
 * Con la sola `chiama` un rifiuto passerebbe zitto e il registro resterebbe
 * senza quella prova: le prove dopo troverebbero un elenco più corto e
 * direbbero che il filtro ha tolto una riga che non c'è mai stata. È
 * successo — un voto fuori scala — ed è costato un giro di diagnosi.
 */
async function scrivi (nome, ingresso) {
  const esito = await api.chiama(archivio, nome, ingresso)
  assert.equal(esito.ok, true, `${nome}: ${JSON.stringify(esito)}`)
  return esito
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
    creaAllievo, creaAnno, creaClasse, creaCorso, creaLezione, creaMateria,
    creaPiano, creaValutazione,
  } = api

  archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
  await archivio.apri(null)
  await archivio.creaAnno(creaAnno(DAL, AL), Uri.file(percorso.join(dati, '2026-2027.registro')))
  const annoId = archivio.registro.anni[0].id

  classe = creaClasse(annoId, 'I MEC A')

  completa = creaAllievo('Rossi', 'Maria')
  completa.email = 'maria.rossi@esempio.ch'
  completa.emailTutore = 'tutore.rossi@esempio.ch'
  completa.emailDatore = 'capo@officina.ch'
  completa.telefoni = [
    { id: 'tel-prova-0001', contatto: 'pif', etichetta: 'cellulare', numero: '079 000 00 01' },
  ]
  completa.indirizzo = { via: 'Via Campagna 2', cap: '6500', localita: 'Bellinzona' }
  completa.azienda = 'Officina Meccanica SA'
  completa.dataNascita = '2008-03-14'
  completa.foto = 'classi/i-mec-a/rossi.jpg'

  soloTelefono = creaAllievo('Bianchi', 'Luca')
  soloTelefono.telefoni = [
    {
      id: 'tel-prova-0002',
      contatto: 'rappresentante',
      etichetta: 'casa',
      numero: '091 000 00 02',
    },
  ]

  // Le caselle aperte e mai riempite: il telefono senza cifre e l'indirizzo
  // con la sola località. Sono i due casi che una lettura ingenua conta come
  // pieni, ed è per questi due che la prova esiste.
  nuda = creaAllievo('Neri', 'Ugo')
  nuda.telefoni = [
    { id: 'tel-prova-0003', contatto: 'datore', etichetta: 'centralino', numero: '   ' },
  ]
  nuda.indirizzo = { via: '', cap: '6600', localita: 'Locarno' }

  classe.allievi.push(completa, soloTelefono, nuda)

  const matematica = creaMateria('Matematica')
  corso = creaCorso(classe.id, matematica.id, 'I MEC A — Matematica')
  corso.orario = []

  raccontata = creaLezione(corso.id, '2026-09-01', '08:20', 90)
  raccontata.argomenti = 'Le frazioni equivalenti'
  raccontata.materiali = 'fotocopie'
  raccontata.consuntivo = 'Finito in tempo'
  raccontata.aula = 'A12'

  muta = creaLezione(corso.id, '2026-09-08', '08:20', 90)
  orfana = creaLezione(corso.id, '2026-09-15', '08:20', 90)

  archivio.modifica((r) => {
    // I PDF automatici restano fermi: qui si provano dei filtri, e rifare dei
    // fogli in sottofondo terrebbe in piedi il processo per niente.
    r.impostazioni.pdfAutomatici = 'mai'
    r.classi.push(classe)
    r.materie.push(matematica)
    r.corsi.push(corso)
    r.lezioni.push(raccontata, muta, orfana)
  }, ['classi', 'corsi', 'lezioni', 'registro'])

  // Il piano vero, assegnato all'ora raccontata: passa dalla procedura e non
  // da `modifica`, così quel che si legge è quel che il registro scriverebbe.
  const piano = creaPiano(corso.id)
  piano.obiettivi = ['Riconoscere le frazioni equivalenti']
  await scrivi('piani.salva', { piano })

  // L'appello su una sola delle tre ore: le altre due restano con le caselle
  // bianche, ed è la differenza che il filtro deve vedere.
  await scrivi('ore.appello.riga', {
    lezioneId: raccontata.id, allievoId: completa.id, stato: 'presente',
  })

  archivio.modifica((r) => {
    r.lezioni.find((l) => l.id === raccontata.id).pianoId = piano.id
    // La scaletta perduta, messa per ultima così che nient'altro la cancelli.
    r.lezioni.find((l) => l.id === orfana.id).pianoId = PIANO_FANTASMA
  }, ['lezioni'])

  finita = creaValutazione(corso.id, 'Verifica sulle frazioni', undefined, '2026-09-20')
  finita.descrizione = 'Quattro esercizi sulle frazioni equivalenti'
  finita.voti = [
    { allievoId: completa.id, valore: 5, assente: false, riconsegnataIl: '2026-09-25' },
    { allievoId: soloTelefono.id, valore: 4, assente: false, riconsegnataIl: '2026-09-25' },
  ]
  await scrivi('valutazioni.salva', { valutazione: finita })

  // Le righe ci sono, i voti no: è una prova consegnata e non ancora
  // corretta, e `voti` deve leggerla come vuota.
  daCorreggere = creaValutazione(corso.id, 'Test sulle potenze', undefined, '2026-10-05')
  daCorreggere.voti = [
    { allievoId: completa.id, valore: null, assente: false },
    { allievoId: soloTelefono.id, valore: null, assente: false },
  ]
  await scrivi('valutazioni.salva', { valutazione: daCorreggere })

  inMano = creaValutazione(corso.id, 'Compito sulle radici', undefined, '2026-11-10')
  inMano.voti = [{ allievoId: completa.id, valore: 5, assente: false }]
  await scrivi('valutazioni.salva', { valutazione: inMano })

  // Riconsegnata a metà: un foglio è tornato, l'altro è ancora sulla
  // scrivania. È il caso su cui il filtro mentiva — «almeno uno tornato»
  // la contava come chiusa, e spariva proprio dalla pila da smaltire.
  aMeta = creaValutazione(corso.id, 'Prova sui polinomi', undefined, '2026-11-20')
  aMeta.voti = [
    { allievoId: completa.id, valore: 5, assente: false, riconsegnataIl: '2026-11-25' },
    { allievoId: soloTelefono.id, valore: 4, assente: false },
  ]
  await scrivi('valutazioni.salva', { valutazione: aMeta })
})

after(() => {
  archivio?.dispose()
  rmSync(radice, { recursive: true, force: true })
})

describe('persone.cerca sa dire chi non ha un recapito', () => {
  // La domanda del giorno prima di una comunicazione alla classe. Senza
  // questa, «senza» tornerebbe l'elenco intero e nessuno se ne accorgerebbe:
  // un filtro che non filtra risponde sempre qualcosa di plausibile.
  it('chi non ha e-mail sono le due che non ce l’hanno, e non l’altra', async () => {
    const { cognomi } = await cognomiCon({ senza: ['email'] })
    assert.deepEqual(cognomi, ['Bianchi', 'Neri'])
  })

  // I due filtri si compongono, ed è il motivo per cui sono due campi e non
  // un booleano: «chi va chiamato invece che scritto» con un campo solo
  // sarebbe due chiamate e un'intersezione fatta a mano da chi legge.
  it('chi ha il telefono ma non l’e-mail è la lista delle telefonate', async () => {
    const { cognomi } = await cognomiCon({ ha: ['telefono'], senza: ['email'] })
    assert.deepEqual(cognomi, ['Bianchi'])
  })

  // La riga di rubrica aperta e mai compilata. Contata come telefono,
  // toglierebbe Neri proprio dall'elenco di chi non si riesce a raggiungere.
  it('un numero di telefono fatto di spazi non è un telefono', async () => {
    const { cognomi } = await cognomiCon({ senza: ['telefono'] })
    assert.deepEqual(cognomi, ['Neri'])
  })

  // Quel che resta quando si è salvata la sola località: su una busta non ci
  // si scrive niente, e un `Indirizzo` che esiste non vuol dire un indirizzo.
  it('un indirizzo con la via vuota non è un indirizzo', async () => {
    const { cognomi } = await cognomiCon({ senza: ['indirizzo'] })
    assert.deepEqual(cognomi, ['Bianchi', 'Neri'])
  })

  // Tutti i campi di `ha` devono essere pieni, non almeno uno: è la stessa
  // regola della ricerca a pezzi — ogni voce in più restringe — e con un
  // «almeno uno» le due liste vorrebbero dire due cose diverse.
  it('chiedere otto campi pieni lascia solo chi li ha tutti e otto', async () => {
    const { cognomi } = await cognomiCon({
      ha: ['email', 'emailTutore', 'emailDatore', 'telefono',
        'indirizzo', 'azienda', 'dataNascita', 'foto'],
    })
    assert.deepEqual(cognomi, ['Rossi'])
  })

  // Una busta deve sempre dire su che cosa ha risposto: senza, «una persona»
  // riletto il giorno dopo si legge come «una persona in tutto il registro».
  it('la busta rimanda i campi chiesti pieni e quelli chiesti vuoti', async () => {
    const { esito } = await cognomiCon({ ha: ['telefono'], senza: ['email'] })
    assert.deepEqual(esito.dati.ha, ['telefono'])
    assert.deepEqual(esito.dati.senza, ['email'])
  })

  // Vuoti e non nulli quando non si è filtrato: sono due modi di dire la
  // stessa cosa, e chi legge non deve doverli distinguere.
  it('senza filtri la busta rimanda due elenchi vuoti', async () => {
    const { esito } = await cognomiCon({})
    assert.deepEqual(esito.dati.ha, [])
    assert.deepEqual(esito.dati.senza, [])
  })
})

describe('un filtro che non trova nessuno è una risposta, non un errore', () => {
  // Il caso limite che conta più di tutti: chiedere lo stesso campo pieno e
  // vuoto insieme non può trovare niente, e la busta deve dirlo con i conti
  // in ordine. Un errore qui fermerebbe il modello, che leggerebbe un guasto
  // dove c'era una risposta — e «zero trovate» accanto a «tre nel registro»
  // è proprio quel che impedisce di concludere «non c'è nessuno».
  it('persone.cerca torna elenco vuoto, quante a zero e il registro pieno', async () => {
    const { esito, cognomi } = await cognomiCon({ ha: ['foto'], senza: ['foto'] })
    assert.deepEqual(cognomi, [])
    assert.equal(esito.dati.quante, 0)
    assert.equal(esito.dati.troncato, false)
    assert.equal(esito.dati.ancora, 0)
    assert.equal(esito.dati.inRegistro, 3)
    // E la riga che rimette in moto chi legge: dice che nel registro c'è
    // gente, e che sono i filtri a non lasciarla passare.
    assert.match(esito.dati.suggerimento, /3/)
  })

  it('ore.elenco e valutazioni.elenco fanno lo stesso', async () => {
    const ore = await oreCon({ ha: ['aula'], senza: ['aula'] })
    assert.deepEqual(ore.id, [])
    assert.equal(ore.esito.dati.quante, 0)
    assert.equal(ore.esito.dati.troncato, false)

    const prove = await proveCon({ ha: ['voti'], senza: ['voti'] })
    assert.deepEqual(prove.titoli, [])
    assert.equal(prove.esito.dati.quante, 0)
    assert.equal(prove.esito.dati.troncato, false)
  })

  // La riga che rimette in moto chi legge deve nominare il filtro che ha
  // svuotato l'elenco. Quando a svuotarlo sono «ha» e «senza», «richiama
  // senza «cerca» per averle tutte» manda a rifare una chiamata che torna
  // vuota lo stesso: chi legge la rifà, riceve di nuovo zero, e conclude che
  // nel registro non c'è nessuno — la deduzione che tutta questa busta serve
  // a impedire.
  it('il suggerimento nomina i campi chiesti e non incolpa «cerca»', async () => {
    const { esito, cognomi } = await cognomiCon({ cerca: 'rossi', senza: ['email'] })
    assert.deepEqual(cognomi, [])
    assert.match(esito.dati.suggerimento, /«email»/)
    assert.doesNotMatch(esito.dati.suggerimento, /senza «cerca» per averle tutte/)
  })

  // Un campo che non è nell'elenco è un ingresso storto e non un filtro che
  // non trova niente: rispondere «zero» a un nome scritto male insegnerebbe
  // a chi chiama che quel campo esiste e che nessuno ce l'ha.
  it('un campo inventato è un ingresso rifiutato, non zero righe', async () => {
    const esito = await api.chiama(archivio, 'persone.cerca', { senza: ['telefax'] })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'ingresso-non-valido')
  })

  // Un elenco vuoto vorrebbe dire «non filtrare», e c'è già un modo di dirlo:
  // non passare il campo. Due modi per la stessa cosa sono due
  // comportamenti da tenere allineati per sempre.
  it('un elenco di campi vuoto è un ingresso rifiutato', async () => {
    const esito = await api.chiama(archivio, 'persone.cerca', { ha: [] })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'ingresso-non-valido')
  })

  // L'id inventato resta «non c'è»: il filtro nuovo non deve trasformare una
  // guardia in un elenco vuoto, che è la differenza fra «rileggi l'id» e
  // «quel corso non ha prove».
  it('valutazioni.elenco con un corso inventato dice ancora «non c’è»', async () => {
    const esito = await api.chiama(archivio, 'valutazioni.elenco', {
      corsoId: 'cor-inventato-0001', senza: ['voti'],
    })
    assert.equal(esito.ok, false)
    assert.equal(esito.codice, 'non-trovato')
  })
})

describe('ore.elenco sa dire quali ore non raccontano niente', () => {
  // «Quali ore non dicono che cosa si è fatto» è la domanda con cui si chiude
  // un semestre, e fin qui si rispondeva scorrendo il calendario mese per
  // mese — cioè sbagliandola.
  it('le ore senza argomento sono le due che nessuno ha raccontato', async () => {
    const { id } = await oreCon({ senza: ['argomenti'] })
    assert.deepEqual(id, [muta.id, orfana.id].sort())
  })

  it('l’ora raccontata ha argomento, materiali, consuntivo e aula', async () => {
    const { id } = await oreCon({ ha: ['argomenti', 'materiali', 'consuntivo', 'aula'] })
    assert.deepEqual(id, [raccontata.id])
  })

  // Il rimando rotto: `pianoId` c'è ma non punta a niente. Contarlo come
  // piano nasconderebbe proprio l'ora che va ripreparata.
  it('un piano che non esiste più non conta come piano', async () => {
    const con = await oreCon({ ha: ['piano'] })
    assert.deepEqual(con.id, [raccontata.id])
    const senza = await oreCon({ senza: ['piano'] })
    assert.deepEqual(senza.id, [muta.id, orfana.id].sort())
  })

  // Le caselle bianche: sulle due ore mute nessuno ha spuntato niente, e una
  // riga di presenze tutta a «non-impostato» non è un appello fatto.
  it('un’ora su cui nessuno ha spuntato niente è un’ora senza appello', async () => {
    const con = await oreCon({ ha: ['appello'] })
    assert.deepEqual(con.id, [raccontata.id])
    assert.equal(con.esito.dati.ore[0].conAppello, true)
    const senza = await oreCon({ senza: ['appello'] })
    assert.deepEqual(senza.id, [muta.id, orfana.id].sort())
  })

  // Le ore tenute davvero e mai raccontate: è la composizione che dà il
  // valore ai due campi, e quella che fa l'elenco del lavoro arretrato.
  it('con l’appello ma senza argomento sono le ore da riprendere', async () => {
    const { id } = await oreCon({ ha: ['appello'], senza: ['argomenti'] })
    assert.deepEqual(id, [])
  })

  it('la busta delle ore rimanda i campi chiesti', async () => {
    const { esito } = await oreCon({ senza: ['argomenti', 'aula'] })
    assert.deepEqual(esito.dati.senza, ['argomenti', 'aula'])
    assert.deepEqual(esito.dati.ha, [])
  })
})

describe('valutazioni.elenco sa dire che cosa manca a una prova', () => {
  // Le righe ci sono e i voti no: contarle come voti farebbe sparire dalla
  // lista proprio le prove che qualcuno deve ancora correggere.
  it('le prove senza voti sono quelle con le righe ancora aperte', async () => {
    const { titoli } = await proveCon({ senza: ['voti'] })
    assert.deepEqual(titoli, ['Test sulle potenze'])
  })

  // La pila sulla scrivania: c'è ancora un foglio da restituire. La data sta
  // sul voto e non sulla prova, perché chi quel giorno mancava la sua non
  // l'ha riavuta — e la prova riconsegnata **a metà** è nella pila come le
  // altre, che è il difetto per cui questo campo si chiama così.
  it('le prove con dei fogli ancora in mano sono la pila da smaltire', async () => {
    const { titoli } = await proveCon({ ha: ['voti', 'daRiconsegnare'] })
    assert.deepEqual(titoli, ['Compito sulle radici', 'Prova sui polinomi'])
  })

  // La regressione, misurata: con «almeno un foglio tornato» al posto di «ne
  // resta uno», la prova a metà spariva dalla pila mentre la stessa busta
  // diceva «daRiconsegnare: 1». Il filtro contraddiceva il numero che gli sta
  // accanto, ed è il numero che si guarda per sapere se si è finito.
  it('una prova riconsegnata a metà resta nella pila, e la busta lo conferma', async () => {
    const { esito, titoli } = await proveCon({ ha: ['daRiconsegnare'] })
    assert.ok(titoli.includes('Prova sui polinomi'))
    const riga = esito.dati.momenti.find((m) => m.titolo === 'Prova sui polinomi')
    assert.equal(riga.daRiconsegnare, 1, 'un foglio è ancora in mano a chi insegna')
  })

  it('le prove chiuse sono quelle con tutti i fogli tornati', async () => {
    const { titoli } = await proveCon({ ha: ['voti'], senza: ['daRiconsegnare'] })
    assert.deepEqual(titoli, ['Verifica sulle frazioni'])
  })

  // Descrizione, allegati e recuperi: tre caselle che nessuna delle prove del
  // corredo riempie tranne una, e che senza filtro si trovano solo aprendole.
  it('senza descrizione, allegati e recuperi restano le due prove spoglie', async () => {
    const { titoli } = await proveCon({ senza: ['descrizione', 'allegati', 'recuperi'] })
    assert.deepEqual(titoli, ['Compito sulle radici', 'Prova sui polinomi', 'Test sulle potenze'])
  })

  it('la busta delle prove rimanda i campi chiesti', async () => {
    const { esito } = await proveCon({ ha: ['voti'], senza: ['daRiconsegnare'] })
    assert.deepEqual(esito.dati.ha, ['voti'])
    assert.deepEqual(esito.dati.senza, ['daRiconsegnare'])
  })
})

// La zona in «persone.cerca»: i due campi erano dichiarati nelle altre due
// letture e non in questa, e passati qui lo schema li scartava in silenzio —
// la busta tornava con tutte le persone e nessuna parola su un filtro non
// applicato. Misurato prima di aggiungerli: «comune: LUGANO» tornava tutti.
describe('persone.cerca guarda anche la zona', () => {
  it('il comune filtra, e non guarda accenti né maiuscole', async () => {
    const tutte = await api.chiama(archivio, 'persone.cerca', {})
    assert.ok(tutte.dati.persone.length > 1, 'la prova vuole più di una persona')

    const esito = await api.chiama(archivio, 'persone.cerca', { comune: 'LUGANO' })
    assert.equal(esito.ok, true, JSON.stringify(esito))
    assert.ok(esito.dati.persone.length < tutte.dati.persone.length, 'il filtro deve stringere')
    assert.ok(esito.dati.persone.every((p) => p.nomeCompleto !== ''))
    // E la busta dice su che cosa ha risposto, come per «cerca».
    assert.equal(esito.dati.comune, 'LUGANO')
  })

  it('il comune si confronta intero: «Lugano» non prende «Luganello»', async () => {
    const esito = await api.chiama(archivio, 'persone.cerca', { comune: 'Lugan' })
    assert.deepEqual(esito.dati.persone, [], 'un confronto a pezzi sarebbe una ricerca')
    // Ma il registro non è vuoto, e la busta lo dice: è la stessa regola per
    // cui «inRegistro» esiste.
    assert.ok(esito.dati.inRegistro > 0)
  })

  it('il NAP filtra per prefisso: «69» è la zona, «6900» è la città', async () => {
    const zona = await api.chiama(archivio, 'persone.cerca', { cap: '69' })
    const citta = await api.chiama(archivio, 'persone.cerca', { cap: '6900' })
    assert.ok(zona.dati.persone.length >= citta.dati.persone.length)
    assert.equal(zona.dati.cap, '69')
  })
})
