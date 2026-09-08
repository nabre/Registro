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
  creaMateria,
  FAMIGLIE_TODO,
  registroVuoto,
  riepilogoTodo,
  todoDellaClasse,
} from '../dist/dominio.mjs'

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
  it('divide i documenti dalle attività: sono due lavori diversi', () => {
    // Una richiesta di certificato porta un file per ciascuno e una matrice da
    // guardare; «esercizi 4–7» si spunta e basta. Chi cerca la pagella non
    // deve scorrere venti compiti.
    const { registro, prima, corsi } = registroBase()
    registro.consegne = [
      consegnaArretrata('cor-1', 'Certificato medico', { documento: 'certificato' }),
      consegnaArretrata('cor-1', 'Esercizi 4–7'),
    ]

    const todo = todoDellaClasse(registro, prima, corsi, OGGI)

    assert.equal(todo.conti.documenti.aperti, 1)
    assert.equal(todo.conti.attivita.aperti, 1)
    assert.equal(todo.documenti.arretrate[0].testo, 'Certificato medico')
    assert.equal(todo.attivita.arretrate[0].testo, 'Esercizi 4–7')
  })

  it('conta come in ritardo solo quel che ha superato il termine', () => {
    const { registro, prima, corsi } = registroBase()
    registro.consegne = [
      consegnaArretrata('cor-1', 'Scaduta'),
      creaConsegna('cor-1', 'Senza termine', '2026-09-08'),
    ]

    const todo = todoDellaClasse(registro, prima, corsi, OGGI)

    assert.equal(todo.conti.attivita.aperti, 2)
    assert.equal(todo.conti.attivita.urgenti, 1)
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

    assert.equal(suo.conti.attivita.aperti, 1)
    assert.equal(suo.attivita.arretrate[0].testo, 'Della prima')
    assert.equal(altrui.attivita.arretrate[0].testo, 'Della seconda')
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

    assert.equal(tutte.conti.attivita.aperti, 2)
    assert.equal(mie.conti.attivita.aperti, 1)
    assert.equal(mie.attivita.arretrate[0].testo, 'Mia')
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
    assert.equal(riepilogo.conti.attivita.aperti, 3)
    assert.equal(riepilogo.conti.attivita.urgenti, 3)
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
