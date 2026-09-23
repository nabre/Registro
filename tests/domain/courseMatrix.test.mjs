// Il corso visto per allievo: ore, assenze, voti in una riga per ciascuno.
//
// La prova che conta è il denominatore delle presenze: sono le UD su cui
// l'appello è stato fatto, non tutte quelle dell'ora. Un'ora di cui nessuno ha
// segnato niente non è un'ora di assenze, e contarla come tale farebbe crollare
// la percentuale di tutti a ogni appello dimenticato — che è il modo migliore
// per far smettere di guardare quella colonna.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  IMPOSTAZIONI_PREDEFINITE,
  creaAllievo,
  creaLezione,
  creaValutazione,
  matriceCorso,
} from '../../dist-tests/domain.mjs'

/** Un'ora di due UD: 08:00–09:30. */
function ora (data = '2026-09-15') {
  return creaLezione('cor-1', data, '08:00', 90)
}

const impostazioni = { ...IMPOSTAZIONI_PREDEFINITE, passoFineSemestre: 0.5 }

describe('il corso visto per allievo', () => {
  it('conta le UD seguite, quelle mancate e i ritardi', () => {
    const anna = creaAllievo('Rossi', 'Anna')
    const lezione = ora()
    lezione.presenze = [{ allievoId: anna.id, stati: ['presente', 'assente'] }]

    const { righe, ud, lezioni } = matriceCorso([anna], [lezione], [], impostazioni)

    assert.equal(lezioni, 1)
    assert.equal(ud, 2)
    assert.equal(righe[0].udConAppello, 2)
    assert.equal(righe[0].udPresenza, 1)
    assert.equal(righe[0].udAssenza, 1)
    assert.equal(righe[0].presenza, 0.5)
  })

  it('le UD senza appello non contano, e non fanno crollare la presenza', () => {
    const anna = creaAllievo('Rossi', 'Anna')
    const fatta = ora('2026-09-15')
    fatta.presenze = [{ allievoId: anna.id, stati: ['presente', 'presente'] }]
    // Su questa non ha segnato niente: non è un'ora di assenze.
    const dimenticata = ora('2026-09-22')

    const { righe } = matriceCorso([anna], [fatta, dimenticata], [], impostazioni)

    assert.equal(righe[0].udConAppello, 2, 'contano solo le UD segnate')
    assert.equal(righe[0].presenza, 1, 'presenza piena, non a metà')
  })

  it('senza appello da nessuna parte la presenza non è zero: è nulla', () => {
    // Zero per cento vorrebbe dire «non c’è mai stato», e nessuno lo ha detto.
    const anna = creaAllievo('Rossi', 'Anna')
    const { righe } = matriceCorso([anna], [ora()], [], impostazioni)

    assert.equal(righe[0].presenza, null)
    assert.equal(righe[0].udConAppello, 0)
  })

  it('il ritardo si conta per ora, non per unità didattica', () => {
    const anna = creaAllievo('Rossi', 'Anna')
    const lezione = ora()
    lezione.presenze = [{ allievoId: anna.id, stati: ['ritardo', 'ritardo'] }]

    const { righe } = matriceCorso([anna], [lezione], [], impostazioni)

    assert.equal(righe[0].ritardi, 1, 'una sola ora, per quante UD siano')
    assert.equal(righe[0].udPresenza, 2, 'chi arriva tardi c’è, e non è assente')
  })

  it('l’esonero non è un’assenza', () => {
    const anna = creaAllievo('Rossi', 'Anna')
    const lezione = ora()
    lezione.presenze = [{ allievoId: anna.id, stati: ['esonerato', 'presente'] }]

    const { righe } = matriceCorso([anna], [lezione], [], impostazioni)

    assert.equal(righe[0].udEsonero, 1)
    assert.equal(righe[0].udAssenza, 0)
  })

  it('porta media e nota, e dice quante prove ha davvero', () => {
    const anna = creaAllievo('Rossi', 'Anna')
    const luca = creaAllievo('Bianchi', 'Luca')

    const prima = creaValutazione('cor-1', 'Test')
    prima.voti = [
      { allievoId: anna.id, valore: 4.25, assente: false },
      { allievoId: luca.id, valore: null, assente: false },
    ]
    const seconda = creaValutazione('cor-1', 'Orale')
    seconda.voti = [{ allievoId: anna.id, valore: 4.5, assente: false }]

    const { righe } = matriceCorso([anna, luca], [], [prima, seconda], impostazioni)

    assert.equal(righe[0].prove, 2)
    // (4.25 + 4.5) / 2 fa 4.375, e la media si ferma al centesimo: è la cifra
    // che si legge a schermo e sul foglio, e non ce n'è una più lunga dietro.
    assert.equal(righe[0].media, 4.38)
    assert.equal(righe[0].nota, 4.5, 'la media portata sul mezzo punto')

    // Luca ha una casella vuota: non è un voto, e non è una media.
    assert.equal(righe[1].prove, 0)
    assert.equal(righe[1].media, null)
    assert.equal(righe[1].nota, null)
  })
})

describe('il corso visto tutto insieme', () => {
  it('somma le presenze della classe, non le media a occhio', () => {
    // Anna segue 1 UD su 2, Luca 2 su 2: la presenza di classe è 3 su 4, non
    // la media fra 50% e 100% — che qui coinciderebbe, ma smette di farlo
    // appena due allievi hanno un numero diverso di UD con l'appello.
    const anna = creaAllievo('Rossi', 'Anna')
    const luca = creaAllievo('Bianchi', 'Luca')
    const lezione = ora()
    lezione.presenze = [
      { allievoId: anna.id, stati: ['presente', 'assente'] },
      { allievoId: luca.id, stati: ['presente', 'presente'] },
    ]

    const { classe } = matriceCorso([anna, luca], [lezione], [], impostazioni)

    assert.equal(classe.udConAppello, 4)
    assert.equal(classe.udPresenza, 3)
    assert.equal(classe.udAssenza, 1)
    assert.equal(classe.presenza, 0.75)
  })

  it('la media di classe pesa gli allievi, non i voti', () => {
    // Anna ha due prove, Luca una sola: nella media di classe valgono uno per
    // uno. Mettendo tutti i voti in un mucchio verrebbe 4.5, e la classe
    // sembrerebbe andare come chi ha fatto più prove.
    const anna = creaAllievo('Rossi', 'Anna')
    const luca = creaAllievo('Bianchi', 'Luca')
    const prima = creaValutazione('cor-1', 'Test')
    prima.voti = [
      { allievoId: anna.id, valore: 5, assente: false },
      { allievoId: luca.id, valore: 3, assente: false },
    ]
    const seconda = creaValutazione('cor-1', 'Orale')
    seconda.voti = [{ allievoId: anna.id, valore: 5, assente: false }]

    const { classe } = matriceCorso([anna, luca], [], [prima, seconda], impostazioni)

    assert.equal(classe.media, 4)
    assert.equal(classe.conVoto, 2)
  })

  it('chi non ha ancora nessun voto resta fuori dalla media, e non vale zero', () => {
    const anna = creaAllievo('Rossi', 'Anna')
    const luca = creaAllievo('Bianchi', 'Luca')
    const prova = creaValutazione('cor-1', 'Test')
    prova.voti = [{ allievoId: anna.id, valore: 5, assente: false }]

    const { classe } = matriceCorso([anna, luca], [], [prova], impostazioni)

    assert.equal(classe.media, 5, 'la media è quella di chi un voto ce l’ha')
    assert.equal(classe.conVoto, 1, 'e si dice su quanti è stata fatta')
  })

  it('senza appello e senza voti non inventa zeri', () => {
    const anna = creaAllievo('Rossi', 'Anna')

    const { classe } = matriceCorso([anna], [ora()], [], impostazioni)

    assert.equal(classe.presenza, null)
    assert.equal(classe.media, null)
    assert.equal(classe.conVoto, 0)
  })
})

describe('le assenze sulle ore previste', () => {
  it('conta su quel che il corso prevedeva, non su quel che si è segnato', () => {
    // Due ore da due UD: quattro previste. Anna ne ha perse due, e su una delle
    // due ore l'appello non è stato fatto per nessuno.
    //
    // Sulle UD con l'appello fatto risulta al 50%: è la lettura onesta di
    // come sta andando. Sulle previste è al 50% di assenza — ed è quella che
    // finisce nel rapporto da far controfirmare, dove un'ora dimenticata dal
    // docente resta un'ora che l'allievo doveva fare.
    const anna = creaAllievo('Rossi', 'Anna')
    const segnata = ora('2026-09-15')
    segnata.presenze = [{ allievoId: anna.id, stati: ['assente', 'assente'] }]
    const dimenticata = ora('2026-09-22')

    const { righe, classe, ud } = matriceCorso([anna], [segnata, dimenticata], [], impostazioni)

    assert.equal(ud, 4, 'le UD previste sono quelle di tutte e due le ore')
    assert.equal(righe[0].udPreviste, 4)
    assert.equal(righe[0].udConAppello, 2)
    assert.equal(righe[0].assenza, 0.5, 'due UD perse su quattro previste')
    assert.equal(righe[0].presenza, 0, 'e nessuna seguita fra quelle segnate')
    assert.equal(classe.udPreviste, 4)
    assert.equal(classe.assenza, 0.5)
  })

  it('le previste sono le stesse per tutti, l’assenza no', () => {
    const anna = creaAllievo('Rossi', 'Anna')
    const luca = creaAllievo('Bianchi', 'Luca')
    const lezione = ora()
    lezione.presenze = [
      { allievoId: anna.id, stati: ['presente', 'assente'] },
      { allievoId: luca.id, stati: ['presente', 'presente'] },
    ]

    const { righe, classe } = matriceCorso([anna, luca], [lezione], [], impostazioni)

    assert.deepEqual(righe.map((r) => r.udPreviste), [2, 2])
    assert.deepEqual(righe.map((r) => r.assenza), [0.5, 0])
    assert.equal(classe.udPreviste, 4, 'due UD a testa')
    assert.equal(classe.assenza, 0.25, 'una UD persa su quattro')
  })

  it('senza ore non inventa una percentuale', () => {
    const anna = creaAllievo('Rossi', 'Anna')

    const { righe, classe } = matriceCorso([anna], [], [], impostazioni)

    assert.equal(righe[0].assenza, null)
    assert.equal(righe[0].presenzaPreviste, null)
    assert.equal(classe.assenza, null)
    assert.equal(classe.presenzaPreviste, null)
  })

  it('la frequenza è cento meno l’assenza, non le ore seguite', () => {
    // Un semestre da venti UD di cui due sole già tenute, e Anna a una delle
    // due è mancata. Le diciotto di maggio non sono ore perse: non ci sono
    // ancora state, e una frequenza contata sulle UD seguite direbbe 5% a chi
    // ha saltato una lezione sola. Cento meno l'assenza dice 95%, ed è la
    // cifra che si certifica.
    const anna = creaAllievo('Rossi', 'Anna')
    const lezione = ora()
    lezione.presenze = [{ allievoId: anna.id, stati: ['presente', 'assente'] }]

    const { righe, classe } = matriceCorso([anna], [lezione], [], impostazioni, 20)

    assert.equal(righe[0].udPreviste, 20)
    assert.equal(righe[0].udPresenza, 1, 'una sola UD seguita, delle venti previste')
    assert.equal(righe[0].assenza, 0.05, 'una UD persa su venti')
    assert.equal(righe[0].presenzaPreviste, 0.95, 'e la frequenza è il suo complemento')
    assert.equal(classe.presenzaPreviste, 0.95)
  })

  it('l’esonero non abbassa la frequenza', () => {
    // Chi è esonerato non ha perso quell'ora: non è un'assenza, e cento meno
    // l'assenza lo tiene fuori da sé.
    const anna = creaAllievo('Rossi', 'Anna')
    const lezione = ora()
    lezione.presenze = [{ allievoId: anna.id, stati: ['presente', 'esonerato'] }]

    const { righe } = matriceCorso([anna], [lezione], [], impostazioni)

    assert.equal(righe[0].udEsonero, 1)
    assert.equal(righe[0].assenza, 0)
    assert.equal(righe[0].presenzaPreviste, 1, 'frequenza piena')
  })
})

describe('la quota di assenza sulle ore previste', () => {
  it('non sfonda il cento per cento quando si fanno più ore del previsto', () => {
    // Le assenze vengono dall'appello, le previste dall'orario: due fonti
    // diverse. Un recupero in più nel periodo e il quoziente supera l'uno —
    // il rapporto stampava «125% di assenza» e «−25% di frequenza».
    const anna = creaAllievo('Rossi', 'Anna')
    const prima = ora('2026-09-15')
    const seconda = ora('2026-09-22')
    prima.presenze = [{ allievoId: anna.id, stati: ['assente', 'assente'] }]
    seconda.presenze = [{ allievoId: anna.id, stati: ['assente', 'assente'] }]

    const { righe, classe } = matriceCorso(
      [anna],
      [prima, seconda],
      [],
      impostazioni,
      2, // l'orario ne dichiarava due, di UD; ne sono state fatte quattro
    )

    assert.equal(righe[0].assenza, 1, 'al massimo tutte')
    assert.equal(righe[0].presenzaPreviste, 0, 'e mai sotto zero')
    assert.equal(classe.assenza, 1)
    assert.equal(classe.presenzaPreviste, 0)
  })

  it('senza ore previste non dice niente invece di dire zero', () => {
    const anna = creaAllievo('Rossi', 'Anna')
    const { righe } = matriceCorso([anna], [], [], impostazioni, 0)
    assert.equal(righe[0].assenza, null)
    assert.equal(righe[0].presenzaPreviste, null)
  })
})
