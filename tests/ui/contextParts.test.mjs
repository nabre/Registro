// Che cosa si dice all'assistente quando chi insegna spegne una parte.
//
// È la riga che decide se il nome di una persona in formazione esce dal
// registro dopo che qualcuno ha detto di no, e un difetto qui **non si vede
// guardando lo schermo**: la pagina resta uguale, la conversazione pure, e
// l'unico posto in cui si vedrebbe è il prompt di un modello — cioè mai.
//
// Due cose si provano, e sono le due che contano:
//
//   1. **spento vuol dire spento** — la parte non esce, in nessuna delle sue
//      forme. Gli id, per esempio, stanno in tre posti: i riferimenti, le voci
//      delle tendine e le loro alternative. Toglierne due su tre è peggio che
//      non toglierne nessuno, perché chi ha premuto crede di averli tolti;
//   2. **quel che resta è vero** — nessun campo lasciato a metà, nessun elenco
//      svuotato che sembri assente per caso.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  conGruppo,
  contestoSpento,
  conTendina,
  daRicordare,
  PARTI,
  PARTI_INTERE,
  PARTI_SPENTE,
  parteSpente,
  partiValide,
  riassunti,
  scorciatoiaDi,
  SCORCIATOIE,
  secondoLeParti,
  statoGruppo,
  tendinaAccesa,
  tendineDi,
} from '../../dist-tests/contextParts.mjs'

/** Una veduta con dentro un po' di tutto: ogni parte ha qualcosa da perdere. */
const VEDUTA = {
  vista: 'valutazioni',
  pagina: 'Valutazioni',
  scheda: null,
  sezione: null,
  scelte: [
    {
      campo: 'Corso',
      valore: 'I MEC A · Matematica',
      id: 'cor-0003',
      opzioni: [
        { valore: 'I MEC A · Matematica', id: 'cor-0003' },
        { valore: 'II MEC B · Fisica', id: 'cor-0004' },
      ],
    },
  ],
  filtri: [{ campo: 'Pendenze mostrate', valore: 'mie', id: null }],
  riferimenti: {
    annoId: 'ann-0001',
    semestreId: 'sem-0002',
    corsoId: 'cor-0003',
    classeId: 'cls-0001',
    lezioneId: null,
    allievoId: null,
    pianoId: null,
    valutazioneId: null,
  },
  periodo: { etichetta: '2° semestre', dal: '2027-02-01', al: '2027-06-30' },
  data: '2027-02-10',
  oggi: '2027-02-12',
  ricerca: 'geometria',
  visibili: {
    cosa: 'persone in formazione della I MEC A',
    quanti: 25,
    ids: ['all-0001', 'all-0002'],
    troncato: true,
  },
}

/**
 * La stessa pagina con la barra intera: quattro tendine, ognuna con il suo id.
 *
 * Serve a provare che spegnerne una tocca il suo id e nessun altro. La veduta
 * qui sopra ha una tendina sola, e con una sola «ne ha tolto uno» e «li ha
 * tolti tutti» sono indistinguibili.
 */
const CON_LA_BARRA = {
  ...VEDUTA,
  scelte: [
    { campo: 'Anno scolastico', valore: '2026/2027', id: 'ann-0001' },
    { campo: 'Periodo', valore: '2° semestre', id: 'sem-0002', dentro: 'Anno scolastico' },
    { campo: 'Classe', valore: 'I MEC A', id: 'cls-0001', dentro: 'Anno scolastico' },
    ...VEDUTA.scelte,
  ],
  // Un id che nessuna tendina nomina: non ha un interruttore nel menu, e deve
  // restare anche quando le tendine se ne vanno tutte.
  riferimenti: { ...VEDUTA.riferimenti, allievoId: 'all-0007' },
}

const con = (parti) => secondoLeParti(VEDUTA, { ...PARTI_INTERE, ...parti })

describe('le parti del contesto', () => {
  it('tutte accese lasciano la veduta com’è', () => {
    assert.deepEqual(secondoLeParti(VEDUTA, PARTI_INTERE), VEDUTA)
  })

  // La pagina non comanda più le altre sette. «Non dirgli su che pagina sono»
  // e «non dirgli niente» sono due richieste diverse, e chi voleva la prima —
  // restare sui filtri della barra senza nominare la pagina — si ritrovava la
  // seconda, cioè l'assistente muto.
  it('spenta la pagina se ne vanno solo pagina, scheda, sezione e vista', () => {
    const ridotta = con({ pagina: false })
    assert.equal(ridotta.pagina, null)
    assert.equal(ridotta.scheda, null)
    assert.equal(ridotta.sezione, null)
    // Anche la vista: è lo stesso fatto detto con il nome che ha nel codice, e
    // lasciarla vorrebbe dire togliere «Valutazioni» e mandare «valutazioni»
    // due righe più in là.
    assert.equal(ridotta.vista, null)
    // E il resto resta: è tutto il punto.
    assert.equal(ridotta.scelte.length, 1)
    assert.equal(ridotta.filtri.length, 1)
    assert.equal(ridotta.periodo.dal, '2027-02-01')
    assert.equal(ridotta.riferimenti.corsoId, 'cor-0003')
    assert.equal(ridotta.visibili.quanti, 25)
  })

  // Il «non dirgli niente» c'è ancora, ed è esplicito: si spengono tutte.
  it('spente tutte non si manda niente', () => {
    assert.equal(secondoLeParti(VEDUTA, PARTI_SPENTE), null)
    assert.equal(contestoSpento(PARTI_SPENTE), true)
    assert.equal(contestoSpento(PARTI_INTERE), false)
    // Una sola accesa basta a far partire la busta: spento vuol dire spento
    // del tutto, e non «quasi».
    assert.equal(contestoSpento({ ...PARTI_SPENTE, ricerca: true }), false)
    assert.notEqual(secondoLeParti(VEDUTA, { ...PARTI_SPENTE, ricerca: true }), null)
  })

  it('gli id spenti se ne vanno da tutti e tre i posti in cui stanno', () => {
    const ridotta = con({ riferimenti: false })
    assert.deepEqual(Object.values(ridotta.riferimenti), Array(8).fill(null))
    assert.equal(ridotta.scelte[0].id, null)
    // Anche dalle alternative: un id in fondo alla riga è un id lo stesso.
    assert.deepEqual(ridotta.scelte[0].opzioni.map((o) => o.id), [null, null])
    // E dall'elenco a schermo: «ci sono 25 persone» è un fatto sulla pagina,
    // venticinque identificatori sono la rubrica di una classe.
    assert.deepEqual(ridotta.visibili.ids, [])
    assert.equal(ridotta.visibili.quanti, 25)
  })

  it('le alternative si spengono senza portarsi via la scelta', () => {
    const ridotta = con({ opzioni: false })
    assert.equal(ridotta.scelte[0].valore, 'I MEC A · Matematica')
    assert.equal(ridotta.scelte[0].id, 'cor-0003')
    assert.equal('opzioni' in ridotta.scelte[0], false)
  })

  it('ogni altra parte si spegne per conto suo', () => {
    assert.deepEqual(con({ scelte: false }).scelte, [])
    assert.deepEqual(con({ filtri: false }).filtri, [])
    assert.equal(con({ periodo: false }).periodo, null)
    assert.equal(con({ ricerca: false }).ricerca, null)
    assert.equal(con({ visibili: false }).visibili, null)
    // Spegnerne una non tocca le altre: è l'unica cosa che rende leggibile la
    // testata, dove si accendono e si spengono una per volta.
    assert.equal(con({ ricerca: false }).periodo.dal, '2027-02-01')
  })

  it('conta quante ne sono spente, per dirlo nella testata', () => {
    assert.equal(parteSpente(PARTI_INTERE), 0)
    assert.equal(parteSpente({ ...PARTI_INTERE, ricerca: false, visibili: false }), 2)
  })
})

describe('una tendina per volta', () => {
  // Le tendine non si somigliano: il periodo restringe i conti, il corso dice
  // su che cosa si lavora. Chi chiede «e negli altri corsi?» vuole togliere il
  // corso senza togliere il semestre in cui sta guardando.
  it('spegne la sola tendina nominata, e lascia le altre', () => {
    const parti = conTendina(PARTI_INTERE, 'Corso', false)
    const ridotta = secondoLeParti(
      { ...VEDUTA, scelte: [...VEDUTA.scelte, { campo: 'Periodo', valore: '2° semestre', id: 'sem-0002' }] },
      parti,
    )
    assert.deepEqual(ridotta.scelte.map((v) => v.campo), ['Periodo'])
  })

  // Spegnere una tendina toglieva la riga leggibile e **lasciava l'id**, che il
  // prompt scrive in chiaro con l'ordine di passarlo agli attrezzi: nel menu si
  // leggeva «l'assistente non sa niente di «Corso»» e il modello rispondeva su
  // quel corso lo stesso. È il difetto che si è visto da fuori — «elenco degli
  // allievi con assenze» e «non sono state trovate assenze», perché al modello
  // arrivava un corso che nessuno aveva scelto.
  it('spenta la tendina, se ne va anche il suo id', () => {
    const ridotta = secondoLeParti(CON_LA_BARRA, conTendina(PARTI_INTERE, 'Corso', false))
    assert.deepEqual(ridotta.scelte.map((v) => v.campo), ['Anno scolastico', 'Periodo', 'Classe'])
    assert.equal(ridotta.riferimenti.corsoId, null)
    // E se ne va **solo** il suo: chi chiede «e negli altri corsi?» vuole
    // togliere il corso senza togliere la classe e il semestre in cui guarda.
    assert.equal(ridotta.riferimenti.classeId, 'cls-0001')
    assert.equal(ridotta.riferimenti.semestreId, 'sem-0002')
    assert.equal(ridotta.riferimenti.annoId, 'ann-0001')
  })

  it('vale per ogni tendina che porta un id, non per il solo corso', () => {
    const senza = (campo) => secondoLeParti(CON_LA_BARRA, conTendina(PARTI_INTERE, campo, false))
    assert.equal(senza('Classe').riferimenti.classeId, null)
    assert.equal(senza('Anno scolastico').riferimenti.annoId, null)
    assert.equal(senza('Periodo').riferimenti.semestreId, null)
    // Il periodo dei conti no: ha un interruttore suo, ed è un'altra cosa —
    // l'id del semestre dice *quale* semestre, le due date dicono su che cosa
    // si contano medie e assenze.
    assert.equal(senza('Periodo').periodo.dal, '2027-02-01')
  })

  it('spento il gruppo, se ne vanno gli id di tutte le sue tendine', () => {
    const ridotta = secondoLeParti(CON_LA_BARRA, { ...PARTI_INTERE, scelte: false })
    assert.deepEqual(ridotta.scelte, [])
    assert.equal(ridotta.riferimenti.corsoId, null)
    assert.equal(ridotta.riferimenti.classeId, null)
    assert.equal(ridotta.riferimenti.annoId, null)
    assert.equal(ridotta.riferimenti.semestreId, null)
    // Quel che nessuna tendina nomina resta: non c'è nessun interruttore che
    // l'abbia spento, e toglierlo qui sarebbe il gruppo delle tendine che si
    // porta via un pezzo di pagina che non è suo.
    assert.equal(ridotta.riferimenti.allievoId, 'all-0007')
  })

  // Una verità sola: l'id lo dà la voce che resta, non una seconda copia presa
  // dai riferimenti. Le due potevano divergere — nel pannello del docente di
  // classe la barra mostra la classe del fascicolo e i riferimenti portavano
  // quella dedotta dal corso — e si leggeva «Classe: II MEC B» ricevendo l'id
  // di un'altra.
  it('l’id che si manda è quello della riga che si legge', () => {
    const divergente = {
      ...CON_LA_BARRA,
      riferimenti: { ...CON_LA_BARRA.riferimenti, classeId: 'cls-0099' },
    }
    assert.equal(secondoLeParti(divergente, PARTI_INTERE).riferimenti.classeId, 'cls-0001')
  })

  it('vale anche per i filtri, che sono tendine come le altre', () => {
    const ridotta = secondoLeParti(VEDUTA, conTendina(PARTI_INTERE, 'Pendenze mostrate', false))
    assert.deepEqual(ridotta.filtri, [])
    // E non tocca le scelte: sono due gruppi diversi.
    assert.equal(ridotta.scelte.length, 1)
  })

  // Il gruppo se le porta via tutte, comprese quelle che nessuno ha toccato;
  // una spenta non torna accesa perché il gruppo lo è.
  it('il gruppo e la singola non si scavalcano', () => {
    const spenta = conTendina(PARTI_INTERE, 'Corso', false)
    assert.equal(tendinaAccesa(spenta, { gruppo: 'scelte', campo: 'Corso' }), false)
    assert.equal(tendinaAccesa(spenta, { gruppo: 'scelte', campo: 'Periodo' }), true)
    const gruppoSpento = { ...PARTI_INTERE, scelte: false }
    assert.equal(tendinaAccesa(gruppoSpento, { gruppo: 'scelte', campo: 'Periodo' }), false)
  })

  it('riaccenderla la toglie dalle spente, senza doppioni', () => {
    const spenta = conTendina(conTendina(PARTI_INTERE, 'Corso', false), 'Corso', false)
    assert.deepEqual(spenta.tendineSpente, ['Corso'])
    assert.deepEqual(conTendina(spenta, 'Corso', true).tendineSpente, [])
  })

  it('le tendine da mostrare sono quelle che la pagina ha adesso', () => {
    assert.deepEqual(tendineDi(VEDUTA), [
      { gruppo: 'scelte', campo: 'Corso', valore: 'I MEC A · Matematica' },
      { gruppo: 'filtri', campo: 'Pendenze mostrate', valore: 'mie' },
    ])
  })

  it('la testata conta anche le tendine spente una per una', () => {
    assert.equal(parteSpente(conTendina(PARTI_INTERE, 'Corso', false)), 1)
  })
})

describe('che cosa c’è dentro ogni parte', () => {
  // È quel che si legge sotto ogni voce del menu: un interruttore che dice
  // soltanto «filtri» obbliga a spegnerlo per scoprire che cosa toglieva.
  it('dice il valore di adesso, parte per parte', () => {
    const dentro = riassunti(VEDUTA)
    assert.equal(dentro.pagina, 'Valutazioni')
    assert.equal(dentro.scelte, 'Corso: I MEC A · Matematica')
    assert.equal(dentro.filtri, 'Pendenze mostrate: mie')
    assert.equal(dentro.ricerca, '«geometria»')
    assert.equal(dentro.visibili, '25 persone in formazione della I MEC A')
    // Le date come si scrivono, non come stanno nella busta.
    assert.equal(dentro.periodo, '2° semestre · 01.02.2027 – 30.06.2027')
  })

  it('conta gli id di tutti i posti in cui stanno, e le tendine con alternative', () => {
    const dentro = riassunti(VEDUTA)
    // Quattro riferimenti più l'id della voce «Corso».
    assert.equal(dentro.riferimenti, '5 da passare agli attrezzi')
    assert.equal(dentro.opzioni, 'Corso (2)')
  })

  // Le tendine lunghe si mandano fino a un tetto, e in fondo alle alternative
  // c'è la riga che dice quante ne restano fuori. Contata come alternativa
  // vera, si leggeva «Corso (3)» per due corsi più il segnaposto: è la riga con
  // cui si decide che cosa si sta togliendo, e diceva un numero che nella
  // tendina non esiste.
  it('non conta il segnaposto di quelle non elencate', () => {
    const dentro = riassunti({
      ...VEDUTA,
      scelte: [{
        ...VEDUTA.scelte[0],
        opzioni: [...VEDUTA.scelte[0].opzioni, { valore: '… e altre 7 non elencate', id: null }],
      }],
    })
    assert.equal(dentro.opzioni, 'Corso (2)')
  })

  // «Anno intero», «Tutti i corsi» e i modi del calendario sono scelte vere
  // senza id: riconoscere il segnaposto dal solo `id: null` le avrebbe tolte
  // dal conto, cioè un menu che dice «niente qui» su una tendina che si apre.
  it('conta le alternative vere che non hanno un id', () => {
    const dentro = riassunti({
      ...VEDUTA,
      scelte: [{
        campo: 'Periodo',
        valore: 'Anno intero',
        id: null,
        opzioni: [
          { valore: '1° semestre', id: 'sem-0001' },
          { valore: '2° semestre', id: 'sem-0002' },
          { valore: 'Anno intero', id: null },
        ],
      }],
    })
    assert.equal(dentro.opzioni, 'Periodo (3)')
  })

  // Una parte che qui non ha niente da dire lo dice, invece di sparire: un
  // interruttore che compare e sparisce a seconda della pagina è un
  // interruttore che non si ritrova il giorno in cui serve.
  it('una parte vuota dice che qui non c’è niente', () => {
    const dentro = riassunti({
      ...VEDUTA,
      filtri: [],
      ricerca: null,
      visibili: null,
      periodo: null,
    })
    assert.equal(dentro.filtri, 'niente qui')
    assert.equal(dentro.ricerca, 'niente qui')
    assert.equal(dentro.visibili, 'niente qui')
    assert.equal(dentro.periodo, 'niente qui')
  })

  it('accorcia gli elenchi lunghi invece di riempire il menu', () => {
    const dentro = riassunti({
      ...VEDUTA,
      scelte: ['Anno', 'Periodo', 'Corso', 'Classe'].map((campo) => ({
        campo, valore: 'x', id: null,
      })),
    })
    assert.equal(dentro.scelte, 'Anno: x, Periodo: x, e altre 2')
  })
})

describe('quel che era ricordato', () => {
  // Il campo ha già avuto due forme: non c'era, ed era un booleano solo.
  it('un interruttore solo diventa tutto acceso o tutto spento', () => {
    assert.deepEqual(partiValide(true), PARTI_INTERE)
    // «Spento» allora si scriveva spegnendo la sola pagina, perché la pagina
    // comandava le altre; adesso si scrive per intero.
    assert.deepEqual(partiValide(false), PARTI_SPENTE)
  })

  // Le parti scritte prima che la pagina smettesse di comandare le altre. Là
  // «pagina: false» voleva dire «niente», qualunque cosa dicessero le altre
  // sette: rilette con le regole di adesso manderebbero un contesto quasi
  // intero a chi l'aveva zittito, e non se ne accorgerebbe nessuno.
  it('un «pagina: false» di prima vale ancora «niente»', () => {
    assert.deepEqual(partiValide({ pagina: false, scelte: true, filtri: true }), PARTI_SPENTE)
  })

  it('con il segno della forma, «pagina: false» vale quel che dice', () => {
    const lette = partiValide(daRicordare({ ...PARTI_INTERE, pagina: false }))
    assert.equal(lette.pagina, false)
    assert.equal(lette.scelte, true)
    assert.equal(lette.filtri, true)
  })

  it('quel che non c’è o non si riconosce torna intero', () => {
    assert.deepEqual(partiValide(undefined), PARTI_INTERE)
    assert.deepEqual(partiValide('sì'), PARTI_INTERE)
    // Un campo storto non deve zittire l'assistente per sempre: il contesto
    // acceso è il caso normale.
    assert.deepEqual(partiValide({ ricerca: 'forse' }), PARTI_INTERE)
  })

  it('tiene quel che riconosce e completa il resto', () => {
    const lette = partiValide({ visibili: false })
    assert.equal(lette.visibili, false)
    assert.equal(lette.scelte, true)
    assert.deepEqual(lette.tendineSpente, [])
  })

  it('le tendine spente si ricordano per nome, e quel che non è un nome cade', () => {
    assert.deepEqual(partiValide({ tendineSpente: ['Corso', 3, null] }).tendineSpente, ['Corso'])
    // Non un elenco: torna vuoto, cioè tutte accese. Una tendina nuova nasce
    // accesa come il resto del contesto.
    assert.deepEqual(partiValide({ tendineSpente: 'Corso' }).tendineSpente, [])
  })

  it('l’elenco della testata copre tutte le parti che si accendono', () => {
    assert.deepEqual(
      PARTI.map((p) => p.chiave).sort(),
      Object.keys(PARTI_INTERE).filter((chiave) => chiave !== 'tendineSpente').sort(),
    )
  })
})

describe('i gruppi di tendine, a tre stati', () => {
  const CAMPI = ['Corso', 'Periodo', 'Classe']

  // Tre stati e non due: il gruppo acceso a cui manca una tendina non è
  // acceso — sarebbe una spunta piena su un elenco bucato — e non è spento.
  it('dice se ci sono tutte, qualcuna o nessuna', () => {
    assert.equal(statoGruppo(PARTI_INTERE, 'scelte', CAMPI), 'tutto')
    assert.equal(statoGruppo(conTendina(PARTI_INTERE, 'Corso', false), 'scelte', CAMPI), 'parte')
    assert.equal(statoGruppo({ ...PARTI_INTERE, scelte: false }, 'scelte', CAMPI), 'niente')
    // Tutte spente una per una è «niente», come spegnere il gruppo: il menu
    // non deve mostrare un segno di mezzo su un gruppo che non manda niente.
    const nessuna = CAMPI.reduce((p, campo) => conTendina(p, campo, false), PARTI_INTERE)
    assert.equal(statoGruppo(nessuna, 'scelte', CAMPI), 'niente')
  })

  // Un gruppo senza tendine in questa pagina non è «a metà»: non ha niente da
  // perdere, e un segno di mezzo direbbe che gli manca qualcosa.
  it('un gruppo vuoto acceso è acceso', () => {
    assert.equal(statoGruppo(PARTI_INTERE, 'filtri', []), 'tutto')
  })

  // Accendere vuol dire **tutte**: un gruppo riacceso che si ritrovasse dentro
  // le tendine spente di mezz'ora prima sarebbe una spunta piena su un contesto
  // bucato.
  it('acceso, il gruppo si riprende le sue tendine spente', () => {
    const bucato = conTendina({ ...PARTI_INTERE, scelte: false }, 'Corso', false)
    const intero = conGruppo(bucato, 'scelte', CAMPI, true)
    assert.equal(intero.scelte, true)
    assert.deepEqual(intero.tendineSpente, [])
  })

  // Spegnere il gruppo lascia le singole com'erano: il gruppo se le porta via
  // comunque, e riaccendendolo si torna interi.
  it('spento, non tocca le tendine di un altro gruppo', () => {
    const conFiltroSpento = conTendina(PARTI_INTERE, 'Pendenze mostrate', false)
    const spento = conGruppo(conFiltroSpento, 'scelte', CAMPI, false)
    assert.equal(spento.scelte, false)
    assert.deepEqual(spento.tendineSpente, ['Pendenze mostrate'])
  })
})

describe('le scorciatoie in cima al menu', () => {
  it('si riconoscono quando il contesto è esattamente quello', () => {
    assert.equal(scorciatoiaDi(PARTI_INTERE), 'tutto')
    assert.equal(scorciatoiaDi(PARTI_SPENTE), 'niente')
    assert.equal(scorciatoiaDi({ ...PARTI_SPENTE, pagina: true, periodo: true }), 'solo-pagina')
  })

  // Nessuna spuntata è la risposta giusta a un contesto composto a mano: dire
  // «tutto» a chi ha spento gli id sarebbe il menu che smentisce la busta.
  it('un contesto composto a mano non è nessuna delle tre', () => {
    assert.equal(scorciatoiaDi({ ...PARTI_INTERE, riferimenti: false }), null)
    // Nemmeno con una tendina spenta: le parti sono le stesse, il contesto no.
    assert.equal(scorciatoiaDi(conTendina(PARTI_INTERE, 'Corso', false)), null)
  })

  it('ognuna scrive un contesto che si rilegge come lei', () => {
    for (const corta of SCORCIATOIE) {
      assert.equal(scorciatoiaDi(corta.parti), corta.chiave)
    }
  })
})
