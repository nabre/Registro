// I recuperi: le prove da rifare a chi non c'era.
//
// La prova che porta il peso di tutto il file è la prima: un allievo assente
// all'appello dell'ora in cui si è fatta la verifica compare fra i recuperi
// *senza che nessuno abbia scritto niente* nella griglia dei voti. È il punto
// della funzionalità — l'assenza è già registrata una volta, e chiedere di
// riscriverla sarebbe l'occasione per dimenticarla — e nessun'altra vista se
// ne accorgerebbe se smettesse di funzionare.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  creaAllievo,
  creaAnno,
  creaClasse,
  creaCorso,
  creaLezione,
  creaMateria,
  creaValutazione,
  normalizzaValutazione,
  recuperiDaFare,
  riconsegneAgliAllievi,
  riconsegneDegliAllievi,
  recuperiDellaLezione,
  recuperiDelMomento,
  recuperiUrgenti,
  registroVuoto,
  statoDelRecupero,
} from '../dist-prove/dominio.mjs'

/** Una classe di tre, un corso, tre ore, e una verifica nella prima. */
function scuola () {
  const registro = registroVuoto()
  const anno = creaAnno('2026-09-01', '2027-06-30')
  const classe = creaClasse(anno.id, 'I MEC A')
  const rossi = creaAllievo('Rossi', 'Maria')
  const bianchi = creaAllievo('Bianchi', 'Luca')
  const verdi = creaAllievo('Verdi', 'Anna')
  classe.allievi.push(rossi, bianchi, verdi)
  const materia = creaMateria('Matematica')
  const corso = creaCorso(classe.id, materia.id, 'Matematica — I MEC A')

  registro.anni.push(anno)
  registro.annoCorrenteId = anno.id
  registro.classi.push(classe)
  registro.materie.push(materia)
  registro.corsi.push(corso)

  const ore = ['2026-10-12', '2026-10-19', '2026-10-26'].map((data) =>
    creaLezione(corso.id, data, '08:20', 45),
  )
  registro.lezioni.push(...ore)

  const prova = creaValutazione(corso.id, 'Verifica sulle equazioni', undefined, '2026-10-12')
  prova.lezioneId = ore[0].id
  registro.valutazioni.push(prova)

  return { registro, classe, corso, ore, prova, rossi, bianchi, verdi }
}

/** Segna un allievo assente all'appello di un'ora. */
function assenteAllAppello (lezione, allievo) {
  lezione.presenze.push({ allievoId: allievo.id, stati: ['assente'] })
}

/** Scrive una riga nella tabella dei recuperi della prova. */
function fissaRecupero (momento, allievo, riga) {
  momento.recuperi = [
    ...(momento.recuperi ?? []),
    { allievoId: allievo.id, previstoIl: null, aggiornatoIl: '2026-10-13T10:00:00.000Z', ...riga },
  ]
}

describe('da dove nasce un recupero', () => {
  it('dall’appello dell’ora, senza che nessuno tocchi la griglia dei voti', () => {
    const { registro, classe, ore, prova, rossi } = scuola()
    assenteAllAppello(ore[0], rossi)

    const recuperi = recuperiDelMomento(registro, prova, classe, '2026-10-13')
    assert.equal(recuperi.length, 1)
    assert.equal(recuperi[0].allievo.id, rossi.id)
    assert.equal(recuperi[0].stato, 'da-fissare')
    // L'assenza non è dichiarata nella griglia: è dedotta, e si deve vedere.
    assert.equal(recuperi[0].daAppello, true)
    assert.equal(prova.voti.length, 0, 'il registro non scrive voti da solo')
  })

  it('dalla casella segnata assente, anche senza appello', () => {
    const { registro, classe, prova, bianchi } = scuola()
    prova.voti.push({ allievoId: bianchi.id, valore: null, assente: true })

    const recuperi = recuperiDelMomento(registro, prova, classe, '2026-10-13')
    assert.deepEqual(recuperi.map((r) => r.allievo.id), [bianchi.id])
    assert.equal(recuperi[0].daAppello, false)
  })

  it('chi c’era e non ha voto non è un recupero: è solo una casella da riempire', () => {
    const { registro, classe, ore, prova, rossi } = scuola()
    ore[0].presenze.push({ allievoId: rossi.id, stati: ['presente'] })
    assert.equal(recuperiDelMomento(registro, prova, classe, '2026-10-13').length, 0)
  })

  it('chi si è ritirato resta fuori: un elenco che non si svuota non si guarda', () => {
    const { registro, classe, ore, prova, rossi } = scuola()
    assenteAllAppello(ore[0], rossi)
    rossi.attivo = false
    assert.equal(recuperiDelMomento(registro, prova, classe, '2026-10-13').length, 0)
  })
})

describe('a che punto è un recupero', () => {
  it('senza data è da fissare, con una data futura è fissato', () => {
    const { registro, prova, rossi, ore } = scuola()
    assenteAllAppello(ore[0], rossi)

    assert.equal(statoDelRecupero(registro, prova, rossi.id, '2026-10-13'), 'da-fissare')

    fissaRecupero(prova, rossi, { previstoIl: '2026-10-19' })
    assert.equal(statoDelRecupero(registro, prova, rossi.id, '2026-10-13'), 'fissato')
    assert.equal(statoDelRecupero(registro, prova, rossi.id, '2026-10-19'), 'oggi')
    // Il giorno è passato e la casella è ancora vuota: la prova non è stata
    // rifatta, ed è la cosa peggiore che possa capitare a un recupero.
    assert.equal(statoDelRecupero(registro, prova, rossi.id, '2026-10-20'), 'scaduto')
  })

  it('il voto lo chiude da sé: era quello che doveva produrre', () => {
    const { registro, prova, rossi, ore } = scuola()
    assenteAllAppello(ore[0], rossi)
    fissaRecupero(prova, rossi, { previstoIl: '2026-10-19' })
    prova.voti.push({ allievoId: rossi.id, valore: 4.5, assente: false })
    assert.equal(statoDelRecupero(registro, prova, rossi.id, '2026-10-26'), 'fatto')
  })

  it('un voto messo senza recupero non è un recupero fatto', () => {
    const { registro, prova, rossi } = scuola()
    prova.voti.push({ allievoId: rossi.id, valore: 5, assente: false })
    assert.equal(statoDelRecupero(registro, prova, rossi.id, '2026-10-26'), null)
  })

  it('la dispensa chiude senza voto, ed è una decisione dichiarata', () => {
    const { registro, prova, rossi, ore } = scuola()
    assenteAllAppello(ore[0], rossi)
    fissaRecupero(prova, rossi, { dispensato: true })
    assert.equal(statoDelRecupero(registro, prova, rossi.id, '2026-11-30'), 'dispensato')
  })
})

describe('i mucchi del todo', () => {
  it('separa quel che va deciso da quel che va solo ricordato', () => {
    const { registro, corso, ore, prova, rossi, bianchi, verdi } = scuola()
    assenteAllAppello(ore[0], rossi)
    assenteAllAppello(ore[0], bianchi)
    assenteAllAppello(ore[0], verdi)

    fissaRecupero(prova, bianchi, { previstoIl: '2026-10-19' })
    fissaRecupero(prova, verdi, { previstoIl: '2026-11-30' })

    const gruppi = recuperiDaFare(registro, [corso], '2026-10-13')
    assert.deepEqual(gruppi.daFissare.map((r) => r.allievo.id), [rossi.id])
    assert.deepEqual(gruppi.presto.map((r) => r.allievo.id), [bianchi.id])
    assert.deepEqual(gruppi.avanti.map((r) => r.allievo.id), [verdi.id])
    assert.equal(gruppi.scaduti.length, 0)
    assert.equal(recuperiUrgenti(gruppi), 1)
  })

  it('conta come urgente anche la data lasciata passare', () => {
    const { registro, corso, ore, prova, rossi, bianchi } = scuola()
    assenteAllAppello(ore[0], rossi)
    assenteAllAppello(ore[0], bianchi)
    fissaRecupero(prova, bianchi, { previstoIl: '2026-10-19' })

    const gruppi = recuperiDaFare(registro, [corso], '2026-10-26')
    assert.deepEqual(gruppi.scaduti.map((r) => r.allievo.id), [bianchi.id])
    assert.equal(recuperiUrgenti(gruppi), 2)
  })

  it('la prova rifatta e non ancora ridata resta un debito', () => {
    // È il pezzo che si perde: messo il voto, il recupero sparisce da tutti
    // gli elenchi di quel che manca, e il foglio corretto resta nella
    // cartella. Un voto che l'allievo non ha visto non è un voto consegnato.
    const { registro, corso, ore, prova, rossi } = scuola()
    assenteAllAppello(ore[0], rossi)
    fissaRecupero(prova, rossi, { previstoIl: '2026-10-19' })
    prova.voti.push({ allievoId: rossi.id, valore: 4.5, assente: false })

    let gruppi = recuperiDaFare(registro, [corso], '2026-10-26')
    assert.deepEqual(gruppi.daRiconsegnare.map((r) => r.allievo.id), [rossi.id])
    assert.equal(gruppi.chiusi.length, 0)

    // Ridata: adesso sì che è finita.
    prova.recuperi[0].riconsegnataIl = '2026-10-26'
    gruppi = recuperiDaFare(registro, [corso], '2026-10-30')
    assert.equal(gruppi.daRiconsegnare.length, 0)
    assert.deepEqual(gruppi.chiusi.map((r) => r.allievo.id), [rossi.id])
  })

  it('quel che non si recupera non ha niente da riconsegnare', () => {
    const { registro, corso, ore, prova, rossi } = scuola()
    assenteAllAppello(ore[0], rossi)
    fissaRecupero(prova, rossi, { dispensato: true })

    const gruppi = recuperiDaFare(registro, [corso], '2026-10-26')
    assert.equal(gruppi.daRiconsegnare.length, 0)
    assert.equal(gruppi.chiusi.length, 1)
  })

  it('guarda solo i corsi che gli si danno', () => {
    const { registro, ore, prova, rossi } = scuola()
    assenteAllAppello(ore[0], rossi)
    assert.equal(recuperiDaFare(registro, [], '2026-10-13').daFissare.length, 0)
  })
})

describe('i recuperi di un’ora', () => {
  it('sono quelli fissati per quel giorno, in quel corso', () => {
    const { registro, ore, prova, rossi } = scuola()
    assenteAllAppello(ore[0], rossi)
    fissaRecupero(prova, rossi, { previstoIl: ore[1].data })

    assert.deepEqual(
      recuperiDellaLezione(registro, ore[1]).map((r) => r.allievo.id),
      [rossi.id],
    )
    // L'ora dopo non deve dire più niente: il recupero era di quel giorno.
    assert.equal(recuperiDellaLezione(registro, ore[2]).length, 0)
  })
})

describe('quel che sopravvive alla rilettura del file', () => {
  // Il registro si scrive su disco e si rilegge: quel che la normalizzazione
  // non ricopia sparisce in silenzio, ed è il modo peggiore di perdere un dato
  // — nessun errore, solo una decisione che il giorno dopo non c'è più.

  it('la riga di un recupero, con la sua data e la sua nota', () => {
    const letto = normalizzaValutazione({
      recuperi: [
        {
          allievoId: 'a1',
          previstoIl: '2026-10-19',
          nota: 'solo la parte B',
          aggiornatoIl: '2026-10-13T10:00:00.000Z',
        },
      ],
    })
    assert.deepEqual(letto.recuperi, [
      {
        allievoId: 'a1',
        previstoIl: '2026-10-19',
        riconsegnataIl: null,
        nota: 'solo la parte B',
        dispensato: undefined,
        aggiornatoIl: '2026-10-13T10:00:00.000Z',
      },
    ])
  })

  it('la dispensa, che è una decisione senza data', () => {
    const letto = normalizzaValutazione({
      recuperi: [{ allievoId: 'a1', dispensato: true }],
    })
    assert.equal(letto.recuperi[0].dispensato, true)
    assert.equal(letto.recuperi[0].previstoIl, null)
  })

  it('la riconsegna del recupero, che è un giorno suo', () => {
    const letto = normalizzaValutazione({
      voti: [{ allievoId: 'a2', valore: 4, riconsegnataIl: '2026-10-15' }],
      recuperi: [{ allievoId: 'a1', previstoIl: '2026-10-19', riconsegnataIl: '2026-10-26' }],
    })
    // Due date diverse, e devono restare due: chi c'era ha riavuto la prova il
    // 15, chi l'ha rifatta il 19 riavrà la sua il 26.
    assert.equal(letto.voti[0].riconsegnataIl, '2026-10-15')
    assert.equal(letto.recuperi[0].riconsegnataIl, '2026-10-26')
  })

  it('una riga con la sola riconsegna vale: è una decisione anche quella', () => {
    const letto = normalizzaValutazione({
      recuperi: [{ allievoId: 'a1', riconsegnataIl: '2026-10-26' }],
    })
    assert.equal(letto.recuperi.length, 1)
    assert.equal(letto.recuperi[0].previstoIl, null)
  })

  it('una riga che non decide niente non si tiene', () => {
    // Senza data, senza nota e senza rinuncia direbbe soltanto quel che il
    // registro sa già: che quell'allievo era assente.
    assert.deepEqual(normalizzaValutazione({ recuperi: [{ allievoId: 'a1' }] }).recuperi, [])
    assert.deepEqual(normalizzaValutazione({}).recuperi, [])
  })

  it('le decisioni scritte quando stavano dentro il voto', () => {
    // La forma vecchia è durata poche ore, ma un giorno concordato con un
    // allievo è una decisione presa: non si butta perché è cambiato il posto
    // in cui si scrive.
    const letto = normalizzaValutazione({
      voti: [
        {
          allievoId: 'a1',
          valore: null,
          assente: true,
          recupero: { previstoIl: '2026-09-17', nota: '1.5' },
        },
      ],
    })
    assert.equal(letto.recuperi.length, 1)
    assert.equal(letto.recuperi[0].allievoId, 'a1')
    assert.equal(letto.recuperi[0].previstoIl, '2026-09-17')
    // Il voto invece torna quello di sempre: niente recupero appeso sopra.
    assert.equal(letto.voti[0].recupero, undefined)
  })
})

describe('i documenti del recupero', () => {
  // Restano allegati della prova, che è una sola: stessa cartella, stesso
  // cestino, stessa apertura. Il ruolo dice che sono della seconda tornata,
  // l'allievo se sono il testo per tutti o il compito di uno.

  it('il testo per tutti e la scansione di uno stanno insieme e distinti', () => {
    const letto = normalizzaValutazione({
      allegati: [
        { id: 'g1', ruolo: 'verifica', file: 'allegati/v1/testo.pdf', nome: 'testo.pdf' },
        {
          id: 'g2',
          ruolo: 'recupero',
          file: 'allegati/v1/testo-recupero.pdf',
          nome: 'testo-recupero.pdf',
        },
        {
          id: 'g3',
          ruolo: 'recupero',
          allievoId: 'a1',
          file: 'allegati/v1/rossi-recupero.pdf',
          nome: 'rossi.pdf',
        },
      ],
    })
    assert.equal(letto.allegati.length, 3)
    assert.equal(letto.allegati[1].ruolo, 'recupero')
    assert.equal(letto.allegati[1].allievoId, null)
    assert.equal(letto.allegati[2].allievoId, 'a1')
  })

  it('la prova resta una: il recupero non è un altro momento', () => {
    const { registro, classe, ore, prova, rossi } = scuola()
    assenteAllAppello(ore[0], rossi)
    fissaRecupero(prova, rossi, { previstoIl: '2026-10-19' })

    assert.equal(statoDelRecupero(registro, prova, rossi.id, '2026-10-19'), 'oggi')
    // Il voto va nella casella di sempre, e la chiude.
    prova.voti.push({ allievoId: rossi.id, valore: 4.5, assente: false })
    assert.equal(statoDelRecupero(registro, prova, rossi.id, '2026-10-26'), 'fatto')
    // E nessun momento in più è nato per strada.
    assert.equal(registro.valutazioni.length, 1)
    assert.equal(
      recuperiDelMomento(registro, prova, classe, '2026-10-26')[0].voto,
      4.5,
    )
  })
})

describe('chi deve ancora riavere la sua prova', () => {
  // La pila torna indietro un giorno solo, ma chi mancava riavrà la sua
  // un'altra volta — e di solito è chi ha più bisogno di vederla. Con una
  // data sola per la prova quei fogli non li reclamava nessuno.

  it('riconsegnare a tutti scrive la data su ogni riga', () => {
    // Il gesto resta uno — la pila torna indietro in un giorno solo — ma quel
    // che si scrive sono venti riconsegne, una per allievo: una data della
    // prova direbbe «riavuta» anche di chi quel giorno mancava.
    const { registro, classe, corso, prova, rossi, bianchi } = scuola()
    prova.voti.push({ allievoId: rossi.id, valore: 5, assente: false, riconsegnataIl: '2026-10-15' })
    prova.voti.push({ allievoId: bianchi.id, valore: 4, assente: false, riconsegnataIl: '2026-10-15' })

    const righe = riconsegneDegliAllievi(prova, classe)
    assert.equal(righe.length, 2)
    assert.ok(righe.every((r) => r.riconsegnataIl === '2026-10-15'))
    // Nessuno da rincorrere: le hanno riavute tutti.
    assert.equal(riconsegneAgliAllievi(registro, [corso], '2026-10-26').length, 0)
  })

  it('chi non c’era quel giorno resta in elenco, con il suo nome', () => {
    const { registro, classe, corso, prova, rossi, bianchi } = scuola()
    prova.voti.push({ allievoId: rossi.id, valore: 5, assente: false, riconsegnataIl: null })
    prova.voti.push({ allievoId: bianchi.id, valore: 4, assente: false })
    // Gli altri l'hanno riavuta, Rossi no: quel giorno mancava.
    prova.voti[1].riconsegnataIl = '2026-10-15'

    const restano = riconsegneAgliAllievi(registro, [corso], '2026-10-26')
    assert.deepEqual(restano.map((r) => r.allievo.id), [rossi.id])
    assert.equal(riconsegneDegliAllievi(prova, classe, true).length, 1)
  })

  it('senza voto non c’è foglio da ridare', () => {
    const { registro, corso, ore, prova, rossi } = scuola()
    // Casella vuota: è una correzione da fare, non una riconsegna.
    prova.voti.push({ allievoId: rossi.id, valore: null, assente: false })
    assert.equal(riconsegneAgliAllievi(registro, [corso], '2026-10-26').length, 0)

    // Assente: il suo debito è il recupero, non la riconsegna.
    assenteAllAppello(ore[0], rossi)
    prova.voti[0].assente = true
    assert.equal(riconsegneAgliAllievi(registro, [corso], '2026-10-26').length, 0)
  })

  it('una prova che deve ancora svolgersi non si riconsegna', () => {
    const { registro, corso, prova, rossi } = scuola()
    prova.voti.push({ allievoId: rossi.id, valore: 5, assente: false })
    assert.equal(riconsegneAgliAllievi(registro, [corso], '2026-10-01').length, 0)
  })
})
