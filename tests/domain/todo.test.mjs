// Il todo raccolto per classe: quattro famiglie, e i conti che ne escono.
//
// Quel che queste prove tengono fermo è la divisione. Le quattro famiglie sono
// quattro mestieri distinti — le assenze da far firmare, le prove da correggere
// e ridare, i documenti che vanno e vengono, le attività assegnate — e un
// conteggio che ne mescola due è un numero su cui non si può decidere niente.
//
// L'altra cosa che tengono ferma è il taglio per classe: il lavoro di una
// classe è quello dei suoi corsi, e una prova di un'altra classe non deve
// entrarci nemmeno per sbaglio.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  classiConLavoro,
  creaAllievo,
  creaAnno,
  creaClasse,
  creaConsegna,
  creaCorso,
  creaFascicolo,
  creaLezione,
  creaMateria,
  FAMIGLIE_TODO,
  registroVuoto,
  riepilogoTodo,
  todoDellaClasse,
} from '../../dist-tests/domain.mjs'

const OGGI = '2026-09-09'

/** Due classi con un corso ciascuna: il minimo per provare che il taglio tenga. */
function registroBase () {
  const registro = registroVuoto()
  const anno = creaAnno('2026-09-01', '2027-06-30')
  registro.anni = [anno]
  registro.annoCorrenteId = anno.id

  const materia = creaMateria('Matematica')
  registro.materie = [materia]

  const prima = {
    ...creaClasse(anno.id, 'I MEC A'),
    id: 'cls-1',
    allievi: [{ ...creaAllievo('Rossi', 'Maria'), id: 'a1' }],
  }
  const seconda = {
    ...creaClasse(anno.id, 'II MEC B'),
    id: 'cls-2',
    allievi: [{ ...creaAllievo('Bianchi', 'Luca'), id: 'a2' }],
  }
  registro.classi = [prima, seconda]

  const corsoUno = { ...creaCorso(prima.id, materia.id, 'I MEC A — Matematica'), id: 'cor-1' }
  const corsoDue = { ...creaCorso(seconda.id, materia.id, 'II MEC B — Matematica'), id: 'cor-2' }
  registro.corsi = [corsoUno, corsoDue]

  return { registro, prima, seconda, corsi: registro.corsi }
}

/** Una consegna aperta con termine passato: è quel che conta come «in ritardo». */
function consegnaArretrata (corsoId, testo, extra = {}) {
  return { ...creaConsegna(corsoId, testo, '2026-09-01'), scadenza: '2026-09-02', ...extra }
}

describe('il todo di una classe', () => {
  it('divide le consegne per tipologia: chi deve fare che cosa', () => {
    // Quattro lavori con quattro momenti: aspettare un certificato vuol dire
    // sollecitare venticinque allievi, dare una pagella vuol dire un file per
    // ciascuno, «esercizi 4–7» si spunta, e le fotocopie le fa chi insegna.
    const { registro, prima, corsi } = registroBase()
    registro.consegne = [
      consegnaArretrata('cor-1', 'Certificato medico', { documento: 'certificato' }),
      consegnaArretrata('cor-1', 'Pagella', { documento: 'pagella', verso: 'consegno' }),
      consegnaArretrata('cor-1', 'Esercizi 4–7'),
      consegnaArretrata('cor-1', 'Fotocopie del test', { a: 'docente' }),
    ]

    const todo = todoDellaClasse(registro, prima, corsi, OGGI)

    assert.equal(todo.conti.consegnaClasse.aperti, 1)
    assert.equal(todo.conti.consegnaDocente.aperti, 1)
    assert.equal(todo.conti.svolgeClasse.aperti, 1)
    assert.equal(todo.conti.svolgeDocente.aperti, 1)
    assert.equal(todo.consegne.consegnaClasse.arretrate[0].testo, 'Certificato medico')
    assert.equal(todo.consegne.consegnaDocente.arretrate[0].testo, 'Pagella')
    assert.equal(todo.consegne.svolgeClasse.arretrate[0].testo, 'Esercizi 4–7')
    assert.equal(todo.consegne.svolgeDocente.arretrate[0].testo, 'Fotocopie del test')
  })

  it('un documento chiesto al docente è suo da consegnare, non da raccogliere', () => {
    // `a: 'docente'` con un documento dentro: il foglio lo maneggia chi
    // insegna, e aspettarlo dalla classe sarebbe aspettare sé stessi.
    const { registro, prima, corsi } = registroBase()
    registro.consegne = [
      consegnaArretrata('cor-1', 'Verbale firmato', { documento: 'altro', a: 'docente' }),
    ]

    const todo = todoDellaClasse(registro, prima, corsi, OGGI)

    assert.equal(todo.conti.consegnaDocente.aperti, 1)
    assert.equal(todo.conti.consegnaClasse.aperti, 0)
  })

  it('conta come in ritardo solo quel che ha superato il termine', () => {
    const { registro, prima, corsi } = registroBase()
    registro.consegne = [
      consegnaArretrata('cor-1', 'Scaduta'),
      creaConsegna('cor-1', 'Senza termine', '2026-09-08'),
    ]

    const todo = todoDellaClasse(registro, prima, corsi, OGGI)

    assert.equal(todo.conti.svolgeClasse.aperti, 2)
    assert.equal(todo.conti.svolgeClasse.urgenti, 1)
  })

  it('tiene fuori il lavoro delle altre classi', () => {
    // È il taglio su cui si regge tutta la pagina: una prova della II B non è
    // lavoro della I A perché le due condividono la materia.
    const { registro, prima, seconda, corsi } = registroBase()
    registro.consegne = [
      consegnaArretrata('cor-1', 'Della prima'),
      consegnaArretrata('cor-2', 'Della seconda'),
    ]

    const suo = todoDellaClasse(registro, prima, corsi, OGGI)
    const altrui = todoDellaClasse(registro, seconda, corsi, OGGI)

    assert.equal(suo.conti.svolgeClasse.aperti, 1)
    assert.equal(suo.consegne.svolgeClasse.arretrate[0].testo, 'Della prima')
    assert.equal(altrui.consegne.svolgeClasse.arretrate[0].testo, 'Della seconda')
  })

  it('le assenze da far firmare entrano nella famiglia loro', () => {
    const { registro, prima, corsi } = registroBase()
    const foglio = {
      tipo: 'assenze',
      firmato: false,
      file: 'archivio/x.pdf',
      nome: 'x.pdf',
      aggiuntoIl: '2026-09-05T08:00:00.000Z',
    }
    registro.fascicoli = [
      {
        ...creaFascicolo('cls-1'),
        assenze: [
          {
            id: 'ass-1',
            etichetta: '1° sem',
            dal: '2026-08-24',
            al: '2026-09-04',
            oggetto: '{tipi} — {allievo}',
            corpo: 'testo',
            aAllievo: false,
            aTutore: false,
            recapitiIds: [],
            righe: [{ allievoId: 'a1', fogli: [foglio], invio: null, note: '' }],
            note: '',
            creatoIl: '2026-09-05T08:00:00.000Z',
            aggiornatoIl: '2026-09-05T08:00:00.000Z',
          },
        ],
      },
    ]

    const todo = todoDellaClasse(registro, prima, corsi, OGGI)

    assert.equal(todo.conti.assenze.aperti, 1)
    // Da spedire dipende da chi guarda: è la metà che preme.
    assert.equal(todo.conti.assenze.urgenti, 1)
    assert.equal(todo.assenze.daSpedire.length, 1)
    assert.equal(todo.aperti, 1)
  })

  it('chi passa la soglia di assenza diventa una pendenza', () => {
    // La soglia esisteva già e non produceva niente: qui si prova che produce
    // una riga, nella sua famiglia, e che si spegne mettendola a zero.
    const { registro, prima, corsi } = registroBase()
    registro.impostazioni.sogliaAssenza = 20
    // Un corso con un'ora fissa il mercoledì: nel semestre che contiene OGGI le
    // ore previste sono quelle, e su quelle si conta la percentuale.
    corsi[0].orario = [{ giorno: 3, inizio: '08:00', durataMin: 90 }]
    const anno = registro.anni[0]
    anno.semestri = [
      { id: 'sem-1', numero: 1, etichetta: '1° sem', inizio: '2026-09-01', fine: '2026-09-30' },
    ]
    // Cinque mercoledì nel periodo, dieci UD previste: ne perde sei.
    for (const data of ['2026-09-02', '2026-09-09', '2026-09-16']) {
      const lezione = creaLezione('cor-1', data, '08:00', 90)
      lezione.presenze = [{ allievoId: 'a1', stati: ['assente', 'assente'] }]
      registro.lezioni.push(lezione)
    }

    const todo = todoDellaClasse(registro, prima, corsi, OGGI)

    assert.equal(todo.conti.segnalazioni.aperti, 1)
    assert.equal(todo.segnalazioni[0].allievoId, 'a1')
    assert.equal(todo.segnalazioni[0].classe, 'I MEC A')
    // L'appello è stato fatto su tutte le ore esistenti: la segnalazione non
    // dipende da appelli dimenticati, e quindi preme.
    assert.equal(todo.conti.segnalazioni.urgenti, 1)

    registro.impostazioni.sogliaAssenza = 0
    const spenta = todoDellaClasse(registro, prima, corsi, OGGI)
    assert.equal(spenta.conti.segnalazioni.aperti, 0, 'a zero la soglia è spenta')
  })

  it('il filtro delle consegne vale solo per le consegne', () => {
    // «Le mie» toglie quel che è della classe, e non tocca le altre famiglie:
    // una prova ferma resta lavoro di chi insegna comunque.
    const { registro, prima, corsi } = registroBase()
    registro.consegne = [
      consegnaArretrata('cor-1', 'Mia', { a: 'docente' }),
      consegnaArretrata('cor-1', 'Della classe', { a: 'classe' }),
    ]

    const tutte = todoDellaClasse(registro, prima, corsi, OGGI)
    const mie = todoDellaClasse(registro, prima, corsi, OGGI, (c) => c.a === 'docente')

    // Le mie stanno nella tipologia di chi insegna, le altre in quella della
    // classe: il filtro non cambia la tipologia, cambia che cosa entra.
    assert.equal(tutte.conti.svolgeClasse.aperti + tutte.conti.svolgeDocente.aperti, 2)
    assert.equal(mie.conti.svolgeDocente.aperti, 1)
    assert.equal(mie.conti.svolgeClasse.aperti, 0)
    assert.equal(mie.consegne.svolgeDocente.arretrate[0].testo, 'Mia')
  })
})

describe('il riepilogo di tutte le classi', () => {
  it('somma per famiglia e mette davanti chi è più indietro', () => {
    const { registro, prima, seconda, corsi } = registroBase()
    registro.consegne = [
      consegnaArretrata('cor-1', 'Una'),
      consegnaArretrata('cor-2', 'Due'),
      consegnaArretrata('cor-2', 'Tre'),
    ]

    const riepilogo = riepilogoTodo(registro, [prima, seconda], corsi, OGGI)

    assert.equal(riepilogo.aperti, 3)
    assert.equal(riepilogo.conti.svolgeClasse.aperti, 3)
    assert.equal(riepilogo.conti.svolgeClasse.urgenti, 3)
    // La seconda ha due arretrate contro una: sta in cima.
    assert.equal(riepilogo.classi[0].classe, 'II MEC B')
  })

  it('le classi senza niente restano nel riepilogo ma non nella pagina', () => {
    // Il registro di una classe chiede «per questa, che cosa manca?», e
    // «niente» è una risposta; la pagina Todo mostra solo chi ha da fare.
    const { registro, prima, seconda, corsi } = registroBase()
    registro.consegne = [consegnaArretrata('cor-1', 'Una')]

    const riepilogo = riepilogoTodo(registro, [prima, seconda], corsi, OGGI)

    assert.equal(riepilogo.classi.length, 2)
    assert.deepEqual(classiConLavoro(riepilogo).map((c) => c.classe), ['I MEC A'])
  })

  it('senza niente da fare i conti sono a zero, non mancanti', () => {
    // Le quattro famiglie esistono sempre: una che manca sarebbe una sezione
    // che sparisce dalla pagina senza che nessuno se ne accorga.
    const { registro, prima, corsi } = registroBase()
    const riepilogo = riepilogoTodo(registro, [prima], corsi, OGGI)

    for (const famiglia of FAMIGLIE_TODO) {
      assert.deepEqual(riepilogo.conti[famiglia], { aperti: 0, urgenti: 0 })
    }
    assert.equal(riepilogo.aperti, 0)
    assert.deepEqual(classiConLavoro(riepilogo), [])
  })
})
