// Che cosa si dice all'assistente quando chi insegna spegne una parte del
// contesto. Un difetto qui si vedrebbe solo nel prompt del modello:
//
//   1. **spento vuol dire spento**: la parte non esce in nessuna forma (gli
//      id, per esempio, stanno nei riferimenti, nelle tendine e nelle loro
//      alternative);
//   2. **quel che resta è vero**: nessun campo a metà, nessun elenco svuotato
//      che sembri assente per caso.

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
 * La stessa pagina con la barra intera, quattro tendine con il loro id:
 * spegnerne una tocca il suo id e nessun altro.
 */
const CON_LA_BARRA = {
  ...VEDUTA,
  scelte: [
    { campo: 'Anno scolastico', valore: '2026/2027', id: 'ann-0001' },
    { campo: 'Periodo', valore: '2° semestre', id: 'sem-0002', dentro: 'Anno scolastico' },
    { campo: 'Classe', valore: 'I MEC A', id: 'cls-0001', dentro: 'Anno scolastico' },
    ...VEDUTA.scelte,
  ],
  // Un id che nessuna tendina nomina resta anche quando le tendine se ne vanno.
  riferimenti: { ...VEDUTA.riferimenti, allievoId: 'all-0007' },
}

const con = (parti) => secondoLeParti(VEDUTA, { ...PARTI_INTERE, ...parti })

describe('le parti del contesto', () => {
  it('tutte accese lasciano la veduta com’è', () => {
    assert.deepEqual(secondoLeParti(VEDUTA, PARTI_INTERE), VEDUTA)
  })

  // La pagina non comanda le altre parti: «non dirgli su che pagina sono» non è
  // «non dirgli niente».
  it('spenta la pagina se ne vanno solo pagina, scheda, sezione e vista', () => {
    const ridotta = con({ pagina: false })
    assert.equal(ridotta.pagina, null)
    assert.equal(ridotta.scheda, null)
    assert.equal(ridotta.sezione, null)
    // Anche la vista: è lo stesso fatto col nome del codice.
    assert.equal(ridotta.vista, null)
    // E il resto resta.
    assert.equal(ridotta.scelte.length, 1)
    assert.equal(ridotta.filtri.length, 1)
    assert.equal(ridotta.periodo.dal, '2027-02-01')
    assert.equal(ridotta.riferimenti.corsoId, 'cor-0003')
    assert.equal(ridotta.visibili.quanti, 25)
  })

  // «Non dirgli niente» è esplicito: si spengono tutte.
  it('spente tutte non si manda niente', () => {
    assert.equal(secondoLeParti(VEDUTA, PARTI_SPENTE), null)
    assert.equal(contestoSpento(PARTI_SPENTE), true)
    assert.equal(contestoSpento(PARTI_INTERE), false)
    // Una sola accesa basta a far partire la busta.
    assert.equal(contestoSpento({ ...PARTI_SPENTE, ricerca: true }), false)
    assert.notEqual(secondoLeParti(VEDUTA, { ...PARTI_SPENTE, ricerca: true }), null)
  })

  it('gli id spenti se ne vanno da tutti e tre i posti in cui stanno', () => {
    const ridotta = con({ riferimenti: false })
    assert.deepEqual(Object.values(ridotta.riferimenti), Array(8).fill(null))
    assert.equal(ridotta.scelte[0].id, null)
    // Anche dalle alternative: un id in fondo alla riga è un id lo stesso.
    assert.deepEqual(ridotta.scelte[0].opzioni.map((o) => o.id), [null, null])
    // E dall'elenco a schermo: «25 persone» è un fatto sulla pagina, venticinque
    // id sono la rubrica di una classe.
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
    // Spegnerne una non tocca le altre: la testata le accende una per volta.
    assert.equal(con({ ricerca: false }).periodo.dal, '2027-02-01')
  })

  it('conta quante ne sono spente, per dirlo nella testata', () => {
    assert.equal(parteSpente(PARTI_INTERE), 0)
    assert.equal(parteSpente({ ...PARTI_INTERE, ricerca: false, visibili: false }), 2)
  })
})

describe('una tendina per volta', () => {
  // Il periodo restringe i conti, il corso dice su che cosa si lavora: «e negli
  // altri corsi?» toglie il corso e lascia il semestre.
  it('spegne la sola tendina nominata, e lascia le altre', () => {
    const parti = conTendina(PARTI_INTERE, 'Corso', false)
    const ridotta = secondoLeParti(
      { ...VEDUTA, scelte: [...VEDUTA.scelte, { campo: 'Periodo', valore: '2° semestre', id: 'sem-0002' }] },
      parti,
    )
    assert.deepEqual(ridotta.scelte.map((v) => v.campo), ['Periodo'])
  })

  // Spenta la tendina se ne va anche il suo id, che il prompt scrive in chiaro:
  // altrimenti il modello risponderebbe su un corso che nessuno ha scelto.
  it('spenta la tendina, se ne va anche il suo id', () => {
    const ridotta = secondoLeParti(CON_LA_BARRA, conTendina(PARTI_INTERE, 'Corso', false))
    assert.deepEqual(ridotta.scelte.map((v) => v.campo), ['Anno scolastico', 'Periodo', 'Classe'])
    assert.equal(ridotta.riferimenti.corsoId, null)
    // E **solo** il suo: classe e semestre restano.
    assert.equal(ridotta.riferimenti.classeId, 'cls-0001')
    assert.equal(ridotta.riferimenti.semestreId, 'sem-0002')
    assert.equal(ridotta.riferimenti.annoId, 'ann-0001')
  })

  it('vale per ogni tendina che porta un id, non per il solo corso', () => {
    const senza = (campo) => secondoLeParti(CON_LA_BARRA, conTendina(PARTI_INTERE, campo, false))
    assert.equal(senza('Classe').riferimenti.classeId, null)
    assert.equal(senza('Anno scolastico').riferimenti.annoId, null)
    assert.equal(senza('Periodo').riferimenti.semestreId, null)
    // Il periodo dei conti ha un interruttore suo: l'id del semestre dice quale
    // semestre, le date su che cosa si contano medie e assenze.
    assert.equal(senza('Periodo').periodo.dal, '2027-02-01')
  })

  it('spento il gruppo, se ne vanno gli id di tutte le sue tendine', () => {
    const ridotta = secondoLeParti(CON_LA_BARRA, { ...PARTI_INTERE, scelte: false })
    assert.deepEqual(ridotta.scelte, [])
    assert.equal(ridotta.riferimenti.corsoId, null)
    assert.equal(ridotta.riferimenti.classeId, null)
    assert.equal(ridotta.riferimenti.annoId, null)
    assert.equal(ridotta.riferimenti.semestreId, null)
    // Quel che nessuna tendina nomina resta: nessun interruttore l'ha spento.
    assert.equal(ridotta.riferimenti.allievoId, 'all-0007')
  })

  // L'id che si manda è quello della voce che resta, non una seconda copia dai
  // riferimenti (nel pannello del docente di classe le due possono divergere).
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

  // Il gruppo se le porta via tutte; una spenta non si riaccende perché il
  // gruppo è acceso.
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
  // Sotto ogni voce del menu si legge il valore di adesso.
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

  // In fondo alle alternative troncate c'è la riga «ne restano fuori N»: non si
  // conta come alternativa.
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
  // senza id: si contano.
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

  // Una parte vuota lo dice invece di sparire, così l'interruttore si ritrova.
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
  // Il campo scritto come booleano solo, nei file vecchi.
  it('un interruttore solo diventa tutto acceso o tutto spento', () => {
    assert.deepEqual(partiValide(true), PARTI_INTERE)
    // Allora «spento» spegneva la sola pagina; ora si scrive per intero.
    assert.deepEqual(partiValide(false), PARTI_SPENTE)
  })

  // Nei file vecchi «pagina: false» voleva dire «niente»: riletto oggi vale
  // ancora così, o manderebbe il contesto a chi l'aveva zittito.
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
    // Un campo storto non zittisce l'assistente: il contesto acceso è il caso
    // normale.
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
    // Non un elenco: torna vuoto, cioè tutte accese.
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

  // Tre stati: il gruppo acceso con una tendina spenta non è né acceso né
  // spento.
  it('dice se ci sono tutte, qualcuna o nessuna', () => {
    assert.equal(statoGruppo(PARTI_INTERE, 'scelte', CAMPI), 'tutto')
    assert.equal(statoGruppo(conTendina(PARTI_INTERE, 'Corso', false), 'scelte', CAMPI), 'parte')
    assert.equal(statoGruppo({ ...PARTI_INTERE, scelte: false }, 'scelte', CAMPI), 'niente')
    // Tutte spente una per una è «niente», come il gruppo spento.
    const nessuna = CAMPI.reduce((p, campo) => conTendina(p, campo, false), PARTI_INTERE)
    assert.equal(statoGruppo(nessuna, 'scelte', CAMPI), 'niente')
  })

  // Un gruppo senza tendine in questa pagina non è «a metà».
  it('un gruppo vuoto acceso è acceso', () => {
    assert.equal(statoGruppo(PARTI_INTERE, 'filtri', []), 'tutto')
  })

  // Riacceso, il gruppo si riprende tutte le sue tendine.
  it('acceso, il gruppo si riprende le sue tendine spente', () => {
    const bucato = conTendina({ ...PARTI_INTERE, scelte: false }, 'Corso', false)
    const intero = conGruppo(bucato, 'scelte', CAMPI, true)
    assert.equal(intero.scelte, true)
    assert.deepEqual(intero.tendineSpente, [])
  })

  // Spegnere il gruppo lascia le singole com'erano.
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

  // Un contesto composto a mano non corrisponde a nessuna scorciatoia.
  it('un contesto composto a mano non è nessuna delle tre', () => {
    assert.equal(scorciatoiaDi({ ...PARTI_INTERE, riferimenti: false }), null)
    // Nemmeno con una tendina spenta.
    assert.equal(scorciatoiaDi(conTendina(PARTI_INTERE, 'Corso', false)), null)
  })

  it('ognuna scrive un contesto che si rilegge come lei', () => {
    for (const corta of SCORCIATOIE) {
      assert.equal(scorciatoiaDi(corta.parti), corta.chiave)
    }
  })
})
