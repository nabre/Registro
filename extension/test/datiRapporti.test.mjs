// Che cosa il registro mette dentro un rapporto.
//
// Le prove che contano sono due, e sono la stessa: che un foglio dica di quale
// periodo parla, e che i numeri sopra siano quelli di sotto. Un rapporto è la
// cosa che esce dal registro e va in mano ad altri — a un tutore, in
// segreteria, a chi subentra — e un numero sbagliato lì non lo corregge più
// nessuno, perché nessuno sa che è sbagliato.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'

import {
  IMPOSTAZIONI_PREDEFINITE,
  creaAllievo,
  creaAnno,
  creaLezione,
  creaRicorrenza,
  datiAllievo,
  datiFotoClasse,
  datiMomento,
  datiValutazioni,
  datiPresenze,
  normalizzaRegistro,
} from '../dist-prove/dominio.mjs'

import { componiFile, FILE_GENERATO } from '../strumenti/modelli.mjs'

/** Un'ora di due UD, con l'appello che le si passa. */
function ora (data, presenze) {
  const lezione = creaLezione('cor-1', data, '08:00', 90)
  lezione.presenze = presenze
  lezione.stato = 'svolta'
  return lezione
}

/**
 * Un registro con un corso, due allievi e le ore che gli si danno: il minimo
 * per far uscire un rapporto.
 */
function registroCon (lezioni) {
  const anno = creaAnno('2026-09-01', '2027-06-30', '2026/27', '2027-01-31')
  anno.id = 'a1'
  anno.semestri[0].id = 's1'
  anno.semestri[1].id = 's2'

  const anna = { ...creaAllievo('Rossi', 'Anna'), id: 'al-1' }
  const luca = { ...creaAllievo('Bianchi', 'Luca'), id: 'al-2' }

  return normalizzaRegistro({
    anni: [anno],
    annoCorrenteId: 'a1',
    materie: [{ id: 'mat-1', nome: 'Calcolo professionale' }],
    classi: [{ id: 'cl-1', annoId: 'a1', nome: 'DIC2', allievi: [anna, luca] }],
    corsi: [{ id: 'cor-1', classeId: 'cl-1', materiaId: 'mat-1', titolo: 'CP — DIC2' }],
    lezioni,
    impostazioni: IMPOSTAZIONI_PREDEFINITE,
  })
}

const primoSemestre = (registro) => registro.anni[0].semestri[0]
const secondoSemestre = (registro) => registro.anni[0].semestri[1]
const corso = (registro) => registro.corsi[0]

describe('il conto delle presenze', () => {
  it('guarda un semestre alla volta, e lo scrive sul foglio', () => {
    // La stessa allieva: presente in autunno, assente in primavera. Un foglio
    // che sommasse l'anno direbbe «metà», che non è vero né di un semestre né
    // dell'altro — e nasconderebbe proprio il caso che si vuole vedere.
    const registro = registroCon([
      ora('2026-10-06', [{ allievoId: 'al-1', stati: ['presente', 'presente'] }]),
      ora('2027-03-09', [{ allievoId: 'al-1', stati: ['assente', 'assente'] }]),
    ])

    const primo = datiPresenze(registro, corso(registro), primoSemestre(registro))
    const secondo = datiPresenze(registro, corso(registro), secondoSemestre(registro))

    assert.equal(primo.valori.periodo, '1° semestre')
    assert.equal(secondo.valori.periodo, '2° semestre')
    assert.equal(primo.valori.quanti, '1', 'una lezione nel primo')
    assert.equal(secondo.valori.quanti, '1', 'e una nel secondo')
    assert.equal(primo.valori.presenza, '100%')
    assert.equal(secondo.valori.presenza, '0%')
  })

  it('senza semestre guarda l’anno, e lo dice', () => {
    const registro = registroCon([
      ora('2026-10-06', [{ allievoId: 'al-1', stati: ['presente', 'presente'] }]),
      ora('2027-03-09', [{ allievoId: 'al-1', stati: ['assente', 'assente'] }]),
    ])

    const tutto = datiPresenze(registro, corso(registro), null)

    assert.equal(tutto.valori.periodo, 'anno intero')
    assert.equal(tutto.valori.quanti, '2')
    assert.equal(tutto.valori.presenza, '50%')
  })

  it('le ore annullate non contano: nessuno poteva esserci', () => {
    const registro = registroCon([
      ora('2026-10-06', [{ allievoId: 'al-1', stati: ['presente', 'presente'] }]),
      { ...ora('2026-10-13', []), stato: 'annullata' },
    ])

    const dati = datiPresenze(registro, corso(registro), primoSemestre(registro))

    assert.equal(dati.valori.quanti, '1')
    assert.equal(dati.valori.ud, '2', 'le UD sono quelle dell’ora tenuta')
  })

  it('dice due percentuali, una per denominatore', () => {
    // Due ore da due UD: quattro previste. Sulla seconda l'appello non è stato
    // fatto. La «% assenza» guarda le previste, che è quel che si consegna: le
    // ore che l'allievo doveva fare restano quelle anche se il docente non ha
    // segnato niente. La «% presenza» è la frequenza, cioè cento meno quella.
    // La «% appello» guarda solo le UD segnate — un'ora dimenticata non è
    // un'ora di assenze — e dice quanto le prime due sono affidabili.
    const registro = registroCon([
      ora('2026-10-06', [{ allievoId: 'al-1', stati: ['presente', 'presente'] }]),
      ora('2026-10-13', []),
    ])

    const dati = datiPresenze(registro, corso(registro), primoSemestre(registro))
    const anna = dati.tabelle.presenze.righe.find((riga) => riga[0].startsWith('Rossi'))

    assert.deepEqual(dati.tabelle.presenze.intestazione, [
      'Allievo',
      'UD corso',
      'UD seguite',
      '% presenza',
      'UD di assenza',
      '% assenza',
      'Ritardi',
      'UD con appello',
      '% appello',
    ])
    assert.equal(dati.valori.ud, '4', 'le UD previste sono quelle di tutte e due le ore')
    assert.equal(anna[1], '4', 'la colonna con il monte ore del corso')
    assert.equal(anna[2], '2', 'due UD seguite')
    assert.equal(anna[3], '100%', 'frequenza piena: non ha perso nessuna ora')
    assert.equal(anna[4], '0', 'nessuna UD di assenza')
    assert.equal(anna[5], '0%', 'assenza sulle previste')
    assert.equal(anna[7], '2', 'UD con appello')
    assert.equal(anna[8], '100%', 'presenza piena, non a metà')
  })

  it('l’assenza è sulle ore previste, anche dove l’appello manca', () => {
    // Anna manca alla prima ora; sulla seconda nessuno ha segnato niente.
    // Sulle UD con appello risulta assente al 100%; sulle quattro previste ha
    // perso metà di quel che era in programma, ed è la cifra del rapporto.
    const registro = registroCon([
      ora('2026-10-06', [{ allievoId: 'al-1', stati: ['assente', 'assente'] }]),
      ora('2026-10-13', []),
    ])

    const dati = datiPresenze(registro, corso(registro), primoSemestre(registro))
    const anna = dati.tabelle.presenze.righe.find((riga) => riga[0].startsWith('Rossi'))

    assert.equal(anna[1], '4', 'le UD che il corso prevede')
    assert.equal(anna[3], '50%', 'la frequenza è cento meno l’assenza')
    assert.equal(anna[5], '50%', 'due UD perse su quattro previste')
    assert.equal(anna[8], '0%', 'e nessuna seguita fra quelle segnate')
  })

  it('chiude con la riga della classe: il numero che si legge per primo', () => {
    const registro = registroCon([
      ora('2026-10-06', [
        { allievoId: 'al-1', stati: ['presente', 'presente'] },
        { allievoId: 'al-2', stati: ['presente', 'assente'] },
      ]),
    ])

    const righe = datiPresenze(registro, corso(registro), primoSemestre(registro)).tabelle.presenze.righe
    const ultima = righe[righe.length - 1]

    assert.equal(ultima[0], 'Classe')
    assert.equal(ultima[1], '4', 'le UD del corso, sommate sui due allievi')
    assert.equal(ultima[2], '3', 'tre UD seguite in tutto')
    assert.equal(ultima[3], '75%', 'su quattro previste')
    assert.equal(ultima[4], '1', 'una UD di assenza')
    assert.equal(ultima[5], '25%', 'su quattro UD previste — due a testa')
    assert.equal(ultima[7], '4', 'UD con appello, sommate')
    assert.equal(ultima[8], '75%')
  })

  it('dichiara sul foglio come sono fatte le percentuali', () => {
    const registro = registroCon([])
    const dati = datiPresenze(registro, corso(registro), null)

    assert.match(dati.valori.nota, /appello/)
  })
})

describe('la scheda dell’allievo', () => {
  it('porta le presenze in cifre, non solo l’elenco delle assenze', () => {
    // È la prima cosa che chiede chi la legge a un colloquio, e prima si
    // poteva solo contare a mano le righe della tabella in fondo.
    const registro = registroCon([
      ora('2026-10-06', [{ allievoId: 'al-1', stati: ['presente', 'assente'] }]),
      ora('2026-10-13', [{ allievoId: 'al-1', stati: ['presente', 'ritardo'] }]),
    ])
    const classe = registro.classi[0]
    const allievo = classe.allievi.find((a) => a.id === 'al-1')

    const dati = datiAllievo(registro, classe, allievo, primoSemestre(registro), corso(registro))

    assert.equal(dati.valori.periodo, '1° semestre')
    assert.equal(dati.valori.udAssenza, '1')
    assert.equal(dati.valori.ritardi, '1')
    assert.equal(dati.valori.udSeguite, '3')
    assert.equal(dati.valori.udPreviste, '4')
    assert.equal(dati.valori.assenza, '25%', 'una UD persa su quattro previste')
    assert.equal(dati.valori.presenza, '75%')
  })

  it('raccoglie le annotazioni sparse in un posto solo', () => {
    // L'osservazione sta dentro il verbale di quel giorno, la nota di un voto
    // dentro la griglia: per ricostruire un semestre bisognava riaprirli uno
    // per uno. Su una scheda che si porta a un colloquio stanno insieme, in
    // ordine di data.
    const registro = registroCon([
      ora('2026-10-06', [{ allievoId: 'al-1', stati: ['presente', 'presente'] }]),
    ])
    registro.lezioni[0].osservazioni = [
      { id: 'oss-1', allievoId: 'al-1', tipo: 'nota', testo: 'Partecipa poco', creataIl: '' },
      { id: 'oss-2', allievoId: 'al-2', tipo: 'nota', testo: 'Di Luca, non sua', creataIl: '' },
      { id: 'oss-3', allievoId: null, tipo: 'nota', testo: 'Della classe', creataIl: '' },
    ]
    registro.valutazioni = [
      {
        id: 'val-1',
        corsoId: 'cor-1',
        lezioneId: null,
        titolo: 'Test',
        tipo: 'scritto',
        data: '2026-10-20',
        peso: 1,
        scala: IMPOSTAZIONI_PREDEFINITE.scala,
        voti: [{ allievoId: 'al-1', valore: 5, assente: false, nota: 'Ha svolto solo metà' }],
        creatoIl: '',
        aggiornatoIl: '',
      },
    ]
    const classe = registro.classi[0]
    const allievo = classe.allievi.find((a) => a.id === 'al-1')

    const dati = datiAllievo(registro, classe, allievo, primoSemestre(registro), corso(registro))
    const righe = dati.tabelle.annotazioni.righe

    assert.equal(righe.length, 2, 'la sua osservazione e la nota del suo voto, non quelle altrui')
    assert.equal(righe[0][0], '06.10.2026', 'in ordine di data')
    // Niente colonna del corso: la scheda è di quel corso, e su ogni riga
    // sarebbe la stessa parola.
    assert.deepEqual(righe[0], ['06.10.2026', 'nota', 'Partecipa poco'])
    assert.equal(righe[1][1], 'prova')
    assert.equal(righe[1][2], 'Test: Ha svolto solo metà')
  })

  it('la griglia delle presenze dice tutte le ore, non solo quelle mancate', () => {
    // Anche le ore andate lisce: senza, un'ora regolare e un'ora di cui
    // nessuno ha fatto l'appello si somigliano troppo — mancano tutte e due.
    const registro = registroCon([
      ora('2026-10-06', [{ allievoId: 'al-1', stati: ['presente', 'presente'] }]),
      ora('2026-10-13', [{ allievoId: 'al-1', stati: ['presente', 'assente'] }]),
      ora('2026-10-20', []),
    ])
    const classe = registro.classi[0]
    const allievo = classe.allievi.find((a) => a.id === 'al-1')

    const dati = datiAllievo(registro, classe, allievo, primoSemestre(registro), corso(registro))
    const righe = dati.tabelle.presenze.righe

    assert.equal(righe.length, 3, 'tre ore, anche quella in cui c’era e basta')
    assert.deepEqual(righe[0].slice(0, 3), ['06.10.2026', 'P', 'P'])
    // Mezz'ora persa non è un'ora persa: le due UD si vedono separate.
    assert.deepEqual(righe[1].slice(0, 3), ['13.10.2026', 'P', 'X'])
    assert.deepEqual(righe[2].slice(0, 3), ['20.10.2026', '-', '-'])
  })

  it('la scheda di tutta la classe la colonna del corso ce l’ha', () => {
    // Senza corso la scheda mette insieme più ore, e lì la colonna è l'unica
    // cosa che dice a quale materia appartiene una riga: toglierla renderebbe
    // l'elenco illeggibile invece che più pulito.
    const registro = registroCon([
      ora('2026-10-06', [{ allievoId: 'al-1', stati: ['presente', 'presente'] }]),
    ])
    const classe = registro.classi[0]
    const allievo = classe.allievi.find((a) => a.id === 'al-1')

    const dati = datiAllievo(registro, classe, allievo, primoSemestre(registro), null)

    assert.ok(dati.tabelle.presenze.intestazione.includes('Corso'))
    assert.equal(dati.valori.corso, 'tutti i corsi della classe', 'e il sottotitolo lo dice')
  })

  it('senza appello non inventa una percentuale', () => {
    const registro = registroCon([ora('2026-10-06', [])])
    const classe = registro.classi[0]
    const allievo = classe.allievi[0]

    const dati = datiAllievo(registro, classe, allievo, primoSemestre(registro), corso(registro))

    // La presenza sulle ore del corso resta una cifra vera — zero UD seguite
    // su quelle previste — ma quanto ci si possa contare lo dice l'altra.
    assert.equal(dati.valori.appello, 'appello mai fatto')
  })
})

describe('i modelli di serie', () => {
  it('sono in accordo con templates/', () => {
    // Servono al primo avvio, quando `templates/` non c'è ancora. Si generano
    // da quella cartella con `npm run modelli`: se questo test cade, qualcuno
    // ha modificato un modello e ha dimenticato di rigenerarli, e chi installa
    // il registro nuovo si troverebbe i modelli di due versioni fa.
    assert.equal(
      readFileSync(FILE_GENERATO, 'utf8').replace(/\r\n/g, '\n'),
      componiFile(),
      'da rifare: npm run modelli',
    )
  })
})

describe('il cento per cento sono le ore che l’orario prevede', () => {
  /** Lo stesso registro, ma con il corso che ha un orario fisso il martedì. */
  function conOrario (lezioni) {
    const registro = registroCon(lezioni)
    // Martedì, 08:00, novanta minuti: due UD a settimana.
    registro.corsi[0].orario = [creaRicorrenza(2, '08:00', 90)]
    return registro
  }

  it('conta il monte ore dell’orario, non le ore già a calendario', () => {
    // Il semestre va dal 1° settembre al 31 gennaio: una ventina di martedì.
    // Sul calendario c'è una lezione sola, perché il resto non è ancora stato
    // generato. Contando su quella, chi ha saltato quell'unica ora sarebbe al
    // 100% di assenza — e non è vero: ha perso due UD su tutte quelle previste.
    const registro = conOrario([
      ora('2026-09-08', [{ allievoId: 'al-1', stati: ['assente', 'assente'] }]),
    ])

    const dati = datiPresenze(registro, corso(registro), primoSemestre(registro))
    const previste = Number(dati.valori.ud)
    const anna = dati.tabelle.presenze.righe.find((riga) => riga[0].startsWith('Rossi'))

    assert.ok(previste > 30, `le UD previste dall’orario sono ${previste}, non due`)
    assert.equal(dati.valori.udTenute, '2', 'a calendario ce n’è una sola, da due UD')
    assert.equal(anna[1], String(previste), 'la colonna dice il monte ore del corso')
    assert.equal(anna[4], '2', 'due UD di assenza')
    assert.equal(anna[5], `${Math.round((2 / previste) * 100)}%`)
    assert.equal(anna[8], '0%', 'sulle UD segnate è mancata a tutte')
  })

  it('con ore ancora da fare la frequenza resta piena', () => {
    // Una lezione seguita su un monte ore di un semestre intero: le ore di
    // maggio non ci sono ancora state, e non sono ore perse. La frequenza è
    // cento meno l'assenza, e l'assenza è zero.
    const registro = conOrario([
      ora('2026-09-08', [{ allievoId: 'al-1', stati: ['presente', 'presente'] }]),
    ])

    const dati = datiPresenze(registro, corso(registro), primoSemestre(registro))
    const anna = dati.tabelle.presenze.righe.find((riga) => riga[0].startsWith('Rossi'))
    const seguita = Number(anna[3].replace('%', ''))
    const persa = Number(anna[5].replace('%', ''))

    assert.equal(persa, 0, 'non ha mancato niente')
    assert.equal(seguita, 100, 'e la frequenza è cento meno zero')
  })

  it('le vacanze non fanno monte ore', () => {
    const registro = conOrario([])
    const anno = registro.anni[0]
    const semestre = anno.semestri[0]
    const senza = Number(datiPresenze(registro, corso(registro), semestre).valori.ud)

    // Due settimane di chiusura tolgono i martedì che ci cadono dentro.
    anno.sospensioni = [
      { id: 'sos-1', etichetta: 'Vacanze', dal: '2026-10-05', al: '2026-10-18' },
    ]
    const con = Number(datiPresenze(registro, corso(registro), semestre).valori.ud)

    assert.equal(con, senza - 4, 'due martedì in meno, due UD ciascuno')
  })

  it('un corso senza orario ripiega sulle ore a calendario', () => {
    // Non c'è un monte ore da cui partire: l'unico che si conosce sono le ore
    // messe a mano, e dirlo storto sarebbe peggio che dire quello.
    const registro = registroCon([
      ora('2026-10-06', [{ allievoId: 'al-1', stati: ['presente', 'assente'] }]),
    ])

    const dati = datiPresenze(registro, corso(registro), primoSemestre(registro))

    assert.equal(dati.valori.ud, '2')
    assert.equal(dati.valori.udTenute, '2')
    assert.match(dati.valori.nota, /previste dall’orario del corso/)
  })
})

describe('i recuperi sul foglio che si consegna', () => {
  // Una casella vuota in conferenza Ã¨ una domanda: Â«e questo?Â». Se il foglio
  // non porta il recupero, la risposta bisogna cercarla a memoria â e la
  // memoria, tre mesi dopo, dice che il buco Ã¨ una dimenticanza.

  /** Un registro con una prova, un assente e il suo recupero. */
  function conRecupero (riga) {
    const registro = registroCon([
      ora('2026-10-06', [
        { allievoId: 'al-1', stati: ['presente', 'presente'] },
        { allievoId: 'al-2', stati: ['assente', 'assente'] },
      ]),
    ])
    registro.valutazioni = [
      {
        id: 'val-1',
        corsoId: 'cor-1',
        lezioneId: registro.lezioni[0].id,
        pianoId: null,
        attivitaId: null,
        titolo: 'Verifica',
        tipo: 'scritto',
        data: '2026-10-06',
        peso: 1,
        scala: registro.impostazioni.scala,
        voti: [
          { allievoId: 'al-1', valore: 5, assente: false },
          { allievoId: 'al-2', valore: null, assente: true },
        ],
        recuperi: riga ? [{ allievoId: 'al-2', ...riga }] : [],
        allegati: [],
        riconsegnataIl: null,
        creatoIl: '2026-10-06T00:00:00.000Z',
        aggiornatoIl: '2026-10-06T00:00:00.000Z',
      },
    ]
    return registro
  }

  it('la casella dice quando la prova si rifà, non solo che manca', () => {
    const registro = conRecupero({ previstoIl: '2026-10-20', aggiornatoIl: 'x' })
    const dati = datiValutazioni(registro, corso(registro), primoSemestre(registro))

    const riga = dati.tabelle.voti.righe.find((r) => r[0].startsWith('Bianchi'))
    assert.equal(riga[1], 'R 20.10.2026')
    assert.deepEqual(dati.tabelle.recuperi.righe[0].slice(0, 3), [
      'Bianchi Luca',
      'Verifica',
      '20.10.2026',
    ])
  })

  it('il voto rifatto porta la R: non è un voto preso con la classe', () => {
    const registro = conRecupero({ previstoIl: '2026-10-20', aggiornatoIl: 'x' })
    registro.valutazioni[0].voti[1] = { allievoId: 'al-2', valore: 4, assente: false }
    const dati = datiValutazioni(registro, corso(registro), primoSemestre(registro))

    assert.equal(dati.tabelle.voti.righe.find((r) => r[0].startsWith('Bianchi'))[1], '4 R')
    assert.equal(dati.tabelle.recuperi.righe[0][5], 'rifatta')
    // Valutato ma non ancora ridato: il momento non Ã¨ chiuso.
    assert.equal(dati.tabelle.momenti.righe[0][5], '1 di 1')
  })

  it('chi non recupera lo dice, invece di sembrare dimenticato', () => {
    const registro = conRecupero({ previstoIl: null, dispensato: true, aggiornatoIl: 'x' })
    const dati = datiValutazioni(registro, corso(registro), primoSemestre(registro))

    assert.equal(dati.tabelle.voti.righe.find((r) => r[0].startsWith('Bianchi'))[1], 'disp.')
    assert.equal(dati.tabelle.recuperi.righe[0][5], 'non si recupera')
    assert.equal(dati.tabelle.momenti.righe[0][5], '1 chiuso')
  })

  it('senza una riga, l’assente compare lo stesso: è un recupero da fissare', () => {
    // Il recupero non aspetta che qualcuno lo scriva: l'appello dice già chi
    // mancava, e sul foglio quella casella vuota deve portare la sua domanda.
    const registro = conRecupero(null)
    const dati = datiValutazioni(registro, corso(registro), primoSemestre(registro))
    assert.equal(dati.tabelle.voti.righe.find((r) => r[0].startsWith('Bianchi'))[1], 'ass.')
    assert.deepEqual(dati.tabelle.recuperi.righe[0].slice(0, 3), ['Bianchi Luca', 'Verifica', ''])
    assert.equal(dati.tabelle.recuperi.righe[0][5], 'da fissare')
  })

  it('la scheda dell’allievo porta recupero e riconsegna', () => {
    const registro = conRecupero({
      previstoIl: '2026-10-20',
      riconsegnataIl: '2026-10-27',
      aggiornatoIl: 'x',
    })
    registro.valutazioni[0].voti[1] = { allievoId: 'al-2', valore: 4, assente: false }
    const dati = datiAllievo(
      registro,
      registro.classi[0],
      registro.classi[0].allievi[1],
      primoSemestre(registro),
      corso(registro),
    )

    // La colonna del corso non c'è: la scheda è di un corso solo.
    const riga = dati.tabelle.prove.righe[0]
    assert.deepEqual(riga.slice(0, 3), ['06.10.2026', 'Verifica', '1'])
    assert.equal(riga[4], 'del 20.10.2026')
    assert.equal(riga[5], '27.10.2026')
  })

  it('le prove finiscono con il totale, e il profitto con la nota', () => {
    const registro = conRecupero(null)
    registro.valutazioni[0].voti[1] = { allievoId: 'al-2', valore: 4, assente: false }
    const dati = datiAllievo(
      registro,
      registro.classi[0],
      registro.classi[0].allievi[1],
      primoSemestre(registro),
      corso(registro),
    )

    // Quante prove hanno fatto media e che media ne è venuta, in fondo alla
    // colonna dei voti: è lì che si guarda dopo averli letti uno per uno.
    assert.deepEqual(dati.tabelle.prove.totale, ['Totale', '1 prova', '', '4.00', '', ''])
    // E la nota, che è il numero per cui la scheda si stampa, sta a sé: il
    // modello la mette in un riquadro invece che in una riga di tabella.
    assert.equal(dati.valori.notaSemestre, '4')
    assert.equal(dati.valori.media, '4.00')
    assert.equal(dati.valori.prove, '1')
  })

  it('una prova che non entra nella media lo dice in colonna', () => {
    const registro = conRecupero({ previstoIl: '2026-10-20', aggiornatoIl: 'x' })
    registro.valutazioni[0].peso = 0
    registro.valutazioni[0].voti[1] = { allievoId: 'al-2', valore: 4, assente: false }
    const dati = datiAllievo(
      registro,
      registro.classi[0],
      registro.classi[0].allievi[1],
      primoSemestre(registro),
      corso(registro),
    )

    assert.equal(dati.tabelle.prove.righe[0][2], 'non conta')
  })

  it('chi ha rifatto la prova non compare fra quelli a cui ridarla', () => {
    // Il suo foglio è quello del recupero, e la sua riconsegna è segnata là:
    // contarlo anche qui vorrebbe dire due righe per lo stesso compito.
    const registro = conRecupero({ previstoIl: '2026-10-20', aggiornatoIl: 'x' })
    registro.valutazioni[0].voti[1] = { allievoId: 'al-2', valore: 4, assente: false }
    const dati = datiValutazioni(registro, corso(registro), primoSemestre(registro))

    assert.deepEqual(
      dati.tabelle.daRidare.righe.map((r) => r[0]),
      ['Rossi Anna'],
    )
  })
})

describe('la matrice di esecuzione e riconsegna', () => {
  // Le due date che di una prova si contestano — «io la verifica l'ho fatta»,
  // «quel compito non me l'hanno mai ridato» — stavano sparse fra tre tabelle,
  // e chi cercava un nome le doveva incrociare a mano. Qui stanno in una
  // casella sola, nella stessa griglia in cui si guardano i voti.

  function conRecupero (riga) {
    const registro = registroCon([
      ora('2026-10-06', [
        { allievoId: 'al-1', stati: ['presente', 'presente'] },
        { allievoId: 'al-2', stati: ['assente', 'assente'] },
      ]),
    ])
    registro.valutazioni = [
      {
        id: 'val-1',
        corsoId: 'cor-1',
        lezioneId: registro.lezioni[0].id,
        pianoId: null,
        attivitaId: null,
        titolo: 'Verifica',
        tipo: 'scritto',
        data: '2026-10-06',
        peso: 1,
        scala: registro.impostazioni.scala,
        voti: [
          { allievoId: 'al-1', valore: 5, assente: false },
          { allievoId: 'al-2', valore: null, assente: true },
        ],
        recuperi: riga ? [{ allievoId: 'al-2', ...riga }] : [],
        allegati: [],
        riconsegnataIl: null,
        creatoIl: '2026-10-06T00:00:00.000Z',
        aggiornatoIl: '2026-10-06T00:00:00.000Z',
      },
    ]
    return registro
  }

  const suo = (dati, cognome) =>
    dati.tabelle.esecuzioni.righe.find((r) => r[0].startsWith(cognome))[1]

  it('la riconsegna è quella dell’allievo, e finisce nella sua casella', () => {
    const registro = conRecupero(null)
    registro.valutazioni[0].voti[0].riconsegnataIl = '2026-10-27'
    const dati = datiValutazioni(registro, corso(registro), primoSemestre(registro))

    assert.deepEqual(dati.tabelle.esecuzioni.intestazione, ['Allievo', 'Verifica'])
    assert.equal(suo(dati, 'Rossi'), '06.10.2026 > 27.10.2026')
  })

  it('un foglio non ancora ridato lo dice, invece di fermarsi alla data della prova', () => {
    // Il trattino è la domanda che si viene a fare: senza, la casella si legge
    // come se la riconsegna non fosse mai stata in ballo.
    const registro = conRecupero(null)
    const dati = datiValutazioni(registro, corso(registro), primoSemestre(registro))

    assert.equal(suo(dati, 'Rossi'), '06.10.2026 > -')
  })

  it('chi ha recuperato porta il giorno del recupero, non quello degli altri', () => {
    const registro = conRecupero({
      previstoIl: '2026-10-20',
      riconsegnataIl: '2026-10-27',
      aggiornatoIl: 'x',
    })
    registro.valutazioni[0].voti[1] = { allievoId: 'al-2', valore: 4, assente: false }
    // Il giorno in cui gli altri hanno riavuto la loro non è il suo: lui quel
    // giorno la prova non l'aveva ancora rifatta.
    registro.valutazioni[0].voti[0].riconsegnataIl = '2026-10-13'
    const dati = datiValutazioni(registro, corso(registro), primoSemestre(registro))

    assert.equal(suo(dati, 'Bianchi'), '20.10.2026 > 27.10.2026')
    assert.equal(suo(dati, 'Rossi'), '06.10.2026 > 13.10.2026')
  })

  it('chi non recupera e chi aspetta una data lo dicono in chiaro', () => {
    const dispensato = conRecupero({ previstoIl: null, dispensato: true, aggiornatoIl: 'x' })
    assert.equal(
      suo(datiValutazioni(dispensato, corso(dispensato), primoSemestre(dispensato)), 'Bianchi'),
      'disp. > -',
    )

    // Con una riga aperta ma senza data: il recupero c'è, il giorno no.
    const daFissare = conRecupero({ previstoIl: null, aggiornatoIl: 'x' })
    assert.equal(
      suo(datiValutazioni(daFissare, corso(daFissare), primoSemestre(daFissare)), 'Bianchi'),
      'da fissare > -',
    )

    // Senza nessuna riga resta quel che l'appello sa: quel giorno non c'era.
    // È la stessa parola che porta la casella della griglia dei voti, ed è
    // giusto che le due griglie dicano la stessa cosa dello stesso allievo.
    const assente = conRecupero(null)
    assert.equal(
      suo(datiValutazioni(assente, corso(assente), primoSemestre(assente)), 'Bianchi'),
      'ass. > -',
    )
  })
})

describe('le due facce dello stesso denominatore', () => {
  // Presenza e assenza sono contate sulle stesse ore — quelle che il corso
  // prevede — e non sono l'una il complemento dell'altra finché restano ore
  // da fare: chi non ha né seguito né mancato le ore di maggio non è assente,
  // quelle ore non ci sono ancora state.

  it('sommano a cento solo quando tutte le ore sono passate', () => {
    const registro = registroCon([
      ora('2026-10-06', [{ allievoId: 'al-1', stati: ['presente', 'assente'] }]),
    ])

    const dati = datiPresenze(registro, corso(registro), primoSemestre(registro))
    const anna = dati.tabelle.presenze.righe.find((riga) => riga[0].startsWith('Rossi'))

    // Due UD in tutto, una seguita e una persa: metà e metà.
    assert.equal(anna[3], '50%')
    assert.equal(anna[5], '50%')
  })
})
describe('le presenze sulla scheda dell’allievo', () => {
  // A schermo l'appello è una griglia: una riga per ora, una colonna per UD,
  // quattro sigle. Sulla scheda era un elenco delle sole ore storte, e su un
  // foglio che si contesta due cose sparivano: l'ora di cui nessuno ha fatto
  // l'appello — che mancava come quelle regolari — e la differenza fra
  // mancare un'ora intera e mancarne metà.

  function schedaCon (lezioni) {
    const registro = registroCon(lezioni)
    return datiAllievo(
      registro,
      registro.classi[0],
      registro.classi[0].allievi[0],
      primoSemestre(registro),
      corso(registro),
    )
  }

  it('porta una colonna per UD e le stesse sigle della griglia', () => {
    const dati = schedaCon([
      ora('2026-10-06', [{ allievoId: 'al-1', stati: ['presente', 'assente'] }]),
      ora('2026-10-13', [{ allievoId: 'al-1', stati: ['ritardo', 'esonerato'] }]),
    ])

    // Il corso non c'è: la scheda è di un corso solo, e starebbe su ogni riga.
    assert.deepEqual(dati.tabelle.presenze.intestazione, ['Data', '1', '2', 'Min.', 'Nota'])
    assert.deepEqual(dati.tabelle.presenze.righe[0].slice(0, 3), ['06.10.2026', 'P', 'X'])
    assert.deepEqual(dati.tabelle.presenze.righe[1].slice(0, 3), ['13.10.2026', 'R', 'E'])
    assert.match(dati.valori.legendaPresenze, /X assente/)
  })

  it('l’ora di cui nessuno ha fatto l’appello resta scritta, col trattino', () => {
    // Prima non compariva affatto, e un appello dimenticato si leggeva come
    // un'ora andata liscia.
    const dati = schedaCon([
      ora('2026-10-06', [{ allievoId: 'al-1', stati: ['non-impostato', 'non-impostato'] }]),
    ])

    assert.deepEqual(dati.tabelle.presenze.righe[0].slice(0, 3), ['06.10.2026', '-', '-'])
  })

  it('le colonne sono quelle dell’ora più lunga, e le altre finiscono prima', () => {
    // Una casella vuota non è un trattino: quella UD non esiste, non è una UD
    // senza appello.
    const lunga = creaLezione('cor-1', '2026-10-13', '08:00', 135)
    lunga.stato = 'svolta'
    lunga.presenze = [{ allievoId: 'al-1', stati: ['presente', 'presente', 'assente'] }]
    const dati = schedaCon([
      ora('2026-10-06', [{ allievoId: 'al-1', stati: ['presente', 'presente'] }]),
      lunga,
    ])

    assert.deepEqual(dati.tabelle.presenze.intestazione.slice(0, 4), ['Data', '1', '2', '3'])
    assert.deepEqual(dati.tabelle.presenze.righe[0].slice(0, 4), ['06.10.2026', 'P', 'P', ''])
    assert.deepEqual(dati.tabelle.presenze.righe[1].slice(0, 4), ['13.10.2026', 'P', 'P', 'X'])
  })
})

describe('la scheda di una prova sola', () => {
  /** Una verifica con cinque voti sparsi su tutta la scala. */
  function conProva (voti) {
    const registro = registroCon([
      ora('2026-10-06', [{ allievoId: 'al-1', stati: ['presente', 'presente'] }]),
    ])
    registro.classi[0].allievi.push(
      ...['al-3', 'al-4', 'al-5'].map((id, i) => ({
        ...creaAllievo(`Cognome${i}`, `Nome${i}`),
        id,
      })),
    )
    registro.valutazioni = [
      {
        id: 'val-1',
        corsoId: 'cor-1',
        lezioneId: null,
        pianoId: null,
        attivitaId: null,
        titolo: 'Verifica di ottobre',
        tipo: 'scritto',
        data: '2026-10-06',
        peso: 2,
        scala: registro.impostazioni.scala,
        descrizione: 'Percentuali e sconti',
        voti,
        recuperi: [],
        allegati: [],
        creatoIl: '',
        aggiornatoIl: '',
      },
    ]
    return registro
  }

  it('porta i conti della prova, non quelli del corso', () => {
    const registro = conProva([
      { allievoId: 'al-1', valore: 3, assente: false },
      { allievoId: 'al-2', valore: 3.5, assente: false },
      { allievoId: 'al-3', valore: 5, assente: false },
      { allievoId: 'al-4', valore: 5.5, assente: false },
    ])
    const dati = datiMomento(registro, registro.valutazioni[0])

    assert.equal(dati.valori.prova, 'Verifica di ottobre')
    assert.equal(dati.valori.peso, '2')
    assert.equal(dati.valori.voti, '4')
    assert.equal(dati.valori.media, '4.25')
    assert.equal(dati.valori.minimo, '3')
    assert.equal(dati.valori.massimo, '5.5')
    assert.equal(dati.valori.sufficienti, '2 su 4 (50%)')
    // Non c'è una data della prova: la riconsegna è per allievo, e qui si
    // dice soltanto a che punto è il giro.
    assert.equal(dati.valori.riconsegna, 'non ancora riconsegnata a tutti')
  })

  it('quando ogni foglio è tornato lo dice, senza una data di gruppo', () => {
    const registro = conProva([
      { allievoId: 'al-1', valore: 4, assente: false, riconsegnataIl: '2026-10-20' },
      { allievoId: 'al-2', valore: 5, assente: false, riconsegnataIl: '2026-10-27' },
    ])
    const dati = datiMomento(registro, registro.valutazioni[0])

    assert.equal(dati.valori.riconsegna, 'tornata a tutti')
    const anna = dati.tabelle.voti.righe.find((r) => r[0].startsWith('Rossi'))
    assert.equal(anna[3], '20.10.2026', 'e nella riga c’è la sua, non quella degli altri')
  })

  it('un punto per voto, al valore esatto e non per fascia', () => {
    // Con le fasce intere il 3.75 e il 3 finivano nella stessa colonna, e la
    // differenza fra «quasi» e «lontano» è proprio quella che si guarda
    // decidendo chi recupera. Chi ha lo stesso voto si impila.
    const registro = conProva([
      { allievoId: 'al-1', valore: 3, assente: false },
      { allievoId: 'al-2', valore: 3.75, assente: false },
      { allievoId: 'al-3', valore: 3.75, assente: false },
      { allievoId: 'al-4', valore: 6, assente: false },
    ])
    const grafico = datiMomento(registro, registro.valutazioni[0]).grafici.distribuzione

    assert.deepEqual(grafico.punti, [
      { valore: 3, quanti: 1 },
      { valore: 3.75, quanti: 2 },
      { valore: 6, quanti: 1 },
    ])
    // L'asse è la scala della prova, non l'intervallo dei voti che ci sono:
    // una prova in cui nessuno è andato sotto il 4 non deve sembrare una prova
    // in cui il 4 era il minimo possibile.
    assert.equal(grafico.da, 1)
    assert.equal(grafico.a, 6)
    // Il numero ogni mezzo punto, la lineetta muta ogni quarto: il quarto è il
    // passo con cui i voti si mettono, ma ventun cifre sotto l'asse si
    // leggerebbero addosso.
    assert.deepEqual(grafico.tacche, [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6])
    assert.deepEqual(
      grafico.tacchette,
      [1.25, 1.75, 2.25, 2.75, 3.25, 3.75, 4.25, 4.75, 5.25, 5.75],
    )
    assert.equal(grafico.soglia, 4)
  })

  it('sull’asse segna la media, e la sufficienza no', () => {
    // Senza la media i punti sono una nuvola e non si sa da che parte stia.
    // La sufficienza invece una riga sua non ce l'ha: la dice il colore dei
    // punti, e il tratteggio ripeteva quel che si vedeva già.
    const registro = conProva([
      { allievoId: 'al-1', valore: 3, assente: false },
      { allievoId: 'al-2', valore: 5, assente: false },
    ])
    const grafico = datiMomento(registro, registro.valutazioni[0]).grafici.distribuzione

    assert.deepEqual(grafico.segni, [
      { valore: 4, etichetta: 'media 4' },
    ])
  })

  it('nell’elenco dei voti c’è anche chi non ne ha uno', () => {
    // La casella vuota è proprio quel che si viene a chiedere: un elenco dei
    // soli valutati la farebbe sparire.
    const registro = conProva([
      { allievoId: 'al-1', valore: 4, assente: false, nota: 'Consegnato a metà' },
      { allievoId: 'al-2', valore: null, assente: true },
    ])
    const righe = datiMomento(registro, registro.valutazioni[0]).tabelle.voti.righe

    assert.equal(righe.length, 5, 'tutti gli allievi attivi, non i soli voti')
    const anna = righe.find((r) => r[0].startsWith('Rossi'))
    const luca = righe.find((r) => r[0].startsWith('Bianchi'))
    assert.equal(anna[1], '4')
    assert.equal(anna[4], 'Consegnato a metà')
    assert.equal(luca[1], 'ass.')
    const senzaNiente = righe.find((r) => r[0].startsWith('Cognome0'))
    assert.equal(senzaNiente[1], '', 'chi non ha né voto né assenza resta con la casella vuota')
  })

  it('senza nemmeno un voto non inventa una media', () => {
    const registro = conProva([])
    const dati = datiMomento(registro, registro.valutazioni[0])

    assert.equal(dati.valori.voti, '0')
    assert.equal(dati.valori.media, '—')
    assert.equal(dati.valori.sufficienti, '—')
    // Il grafico c'è ma è senza punti: chi compone il foglio lo toglie da sé,
    // perché un asse spoglio è un modo elaborato di dire «non c'è niente».
    assert.deepEqual(dati.grafici.distribuzione.punti, [])
    assert.deepEqual(dati.grafici.distribuzione.segni, [])
  })
})

describe('l’assenza oltre la soglia', () => {
  // Due ore da due UD: chi manca a una intera è al 50%, ben oltre il 20% di
  // serie.
  const conAssenze = () =>
    registroCon([
      ora('2026-10-06', [
        { allievoId: 'al-1', stati: ['presente', 'presente'] },
        { allievoId: 'al-2', stati: ['assente', 'assente'] },
      ]),
      ora('2026-10-13', [
        { allievoId: 'al-1', stati: ['presente', 'presente'] },
        { allievoId: 'al-2', stati: ['presente', 'presente'] },
      ]),
    ])

  it('mette in chiaro chi la supera, sul foglio della classe', () => {
    const registro = conAssenze()
    const dati = datiPresenze(registro, corso(registro), primoSemestre(registro))

    assert.equal(dati.elenchi.oltreSoglia.length, 1)
    assert.match(dati.elenchi.oltreSoglia[0], /^Bianchi Luca — assenza del 50%/)
    assert.equal(dati.valori.sogliaAssenza, '20')
  })

  it('e sulla scheda del singolo, con una frase da mettere in evidenza', () => {
    const registro = conAssenze()
    const scheda = (allievo) =>
      datiAllievo(registro, registro.classi[0], allievo, primoSemestre(registro), corso(registro))

    assert.equal(
      scheda(registro.classi[0].allievi[1]).valori.avvisoAssenza,
      'Attenzione: assenza del 50%, oltre il 20% previsto.',
    )
    // Chi sta sotto non porta nessun avviso: il riquadro sparisce da sé, come
    // ogni altro pezzo appeso a un segnaposto vuoto.
    assert.equal(scheda(registro.classi[0].allievi[0]).valori.avvisoAssenza, '')
  })

  it('a zero non segnala nessuno', () => {
    // C'è chi quel conto lo fa altrove e non vuole un avviso su ogni foglio.
    const registro = conAssenze()
    registro.impostazioni.sogliaAssenza = 0
    const dati = datiPresenze(registro, corso(registro), primoSemestre(registro))

    assert.deepEqual(dati.elenchi.oltreSoglia, [])
  })
})

describe('la parete di ritratti della classe', () => {
  it('mette una casella per allievo, con foto o senza', () => {
    const registro = registroCon([])
    registro.classi[0].allievi[0].foto = 'documentazione/DIC2/foto/Rossi Anna.jpg'

    const dati = datiFotoClasse(registro, registro.classi[0])

    assert.deepEqual(
      dati.gallerie.allievi.celle.map((c) => [c.titolo, c.immagine]),
      [
        ['Bianchi Luca', ''],
        ['Rossi Anna', 'documentazione/DIC2/foto/Rossi Anna.jpg'],
      ],
    )
    assert.equal(dati.valori.allievi, '2')
    // Quante facce ci sono davvero: è il numero che dice se il foglio serve
    // già a qualcosa o se le foto sono ancora da mettere.
    assert.equal(dati.valori.conFoto, '1')
  })

  it('non porta chi si è ritirato', () => {
    // La parete si guarda in aula, e chi non c'è più non ci si siede.
    const registro = registroCon([])
    registro.classi[0].allievi[1].attivo = false

    const dati = datiFotoClasse(registro, registro.classi[0])

    assert.deepEqual(dati.gallerie.allievi.celle.map((c) => c.titolo), ['Rossi Anna'])
  })
})
