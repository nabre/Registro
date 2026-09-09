// Il cruscotto: che cosa conta come buco, e dove riparte il conto delle ore.
//
// Sono due regole che nessuno vede applicare e tutti leggono come vere: se il
// registro dice «3 ore da completare» quel numero deve essere quello giusto, e
// se dice «lezione n. 4» a maggio dev'essere la quarta del secondo semestre.
// Provarle qui costa poco; scoprirle sbagliate a fine anno costa un colloquio.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  CHI_INSEGNA,
  colonnaCruscotto,
  creaAnno,
  creaClasse,
  creaConsegna,
  creaCorso,
  creaLezione,
  creaMateria,
  creaOsservazione,
  creaValutazione,
  diagnosiLezione,
  registroVuoto,
  riepilogoCruscotto,
} from '../dist-prove/dominio.mjs'

const OGGI = '2027-03-01'

/** Un anno con due semestri, una classe, un corso: il minimo per contare. */
function registroConCorso () {
  const registro = registroVuoto()
  const anno = creaAnno('2026-09-01', '2027-06-30', '2026/27', '2027-01-31')
  const classe = creaClasse(anno.id, 'I MEC A')
  const materia = creaMateria('Matematica')
  const corso = creaCorso(classe.id, materia.id, 'Matematica — I MEC A')
  registro.anni.push(anno)
  registro.annoCorrenteId = anno.id
  registro.classi.push(classe)
  registro.materie.push(materia)
  registro.corsi.push(corso)
  return { registro, anno, classe, corso }
}

/** Aggiunge un'ora al corso e la torna, così il test la può sporcare. */
function ora (registro, corso, data, ritocchi = {}) {
  const lezione = Object.assign(creaLezione(corso.id, data, '08:20', 45), ritocchi)
  registro.lezioni.push(lezione)
  return lezione
}

describe('diagnosi di un’ora', () => {
  it('un’ora passata senza appello è un buco', () => {
    const { registro, corso } = registroConCorso()
    const lezione = ora(registro, corso, '2027-02-10')

    const esito = diagnosiLezione(registro, lezione, 1, OGGI)
    assert.ok(esito.segni.includes('senza-appello'))
  })

  it('righe d’appello tutte vuote sono un appello non fatto', () => {
    const { registro, corso } = registroConCorso()
    const lezione = ora(registro, corso, '2027-02-10', {
      stato: 'svolta',
      presenze: [{ allievoId: 'a1', stati: ['non-impostato'] }],
    })
    const esito = diagnosiLezione(registro, lezione, 1, OGGI)
    assert.ok(esito.segni.includes('senza-appello'))
    assert.equal(esito.urgenza, 'manca')
  })

  it('la stessa ora domani è solo un’ora da fare', () => {
    const { registro, corso } = registroConCorso()
    const lezione = ora(registro, corso, '2027-03-10')

    const esito = diagnosiLezione(registro, lezione, 1, OGGI)
    assert.ok(!esito.segni.includes('senza-appello'), 'il futuro non ha buchi')
    // Senza piano, un'ora futura è lavoro da preparare, non un errore.
    assert.equal(esito.urgenza, 'da-preparare')
  })

  it('non si fida dello stato dichiarato: guarda la data', () => {
    const { registro, corso } = registroConCorso()
    const lezione = ora(registro, corso, '2027-02-10', {
      presenze: [{ allievoId: 'a1', stati: ['presente'] }],
    })

    const esito = diagnosiLezione(registro, lezione, 1, OGGI)
    assert.ok(
      esito.segni.includes('da-segnare'),
      'passata e non segnata svolta: è proprio la cosa che si dimentica',
    )
  })

  it('un’ora passata senza piano non è un buco: si è svolta lo stesso', () => {
    const { registro, corso } = registroConCorso()
    const lezione = ora(registro, corso, '2027-02-10', {
      stato: 'svolta',
      presenze: [{ allievoId: 'a1', stati: ['presente'] }],
    })

    const esito = diagnosiLezione(registro, lezione, 1, OGGI)
    assert.ok(!esito.segni.includes('senza-piano'))
    assert.equal(esito.urgenza, 'apposto')
  })

  it('dice quel che c’è, non solo quel che manca', () => {
    const { registro, corso } = registroConCorso()
    const lezione = ora(registro, corso, '2027-02-10', {
      stato: 'svolta',
      pianoId: 'pia-1',
      consuntivo: 'fatto tutto',
      presenze: [
        { allievoId: 'a1', stati: ['presente'] },
        { allievoId: 'a2', stati: ['assente'] },
      ],
      osservazioni: [creaOsservazione('merito', 'bravo', 'a1')],
    })
    const momento = creaValutazione(corso.id, 'Verifica', registro.impostazioni.scala, '2027-02-10')
    momento.lezioneId = lezione.id
    registro.valutazioni.push(momento)

    const esito = diagnosiLezione(registro, lezione, 1, OGGI)
    for (const atteso of ['svolta', 'con-piano', 'consuntivo', 'valutazione', 'osservazioni', 'assenze']) {
      assert.ok(esito.segni.includes(atteso), `manca il segno ${atteso}`)
    }
    assert.equal(esito.assenti, 1)
    assert.equal(esito.urgenza, 'apposto')
  })
})

describe('le colonne del cruscotto', () => {
  it('numera le ore in fila e salta le annullate', () => {
    const { registro, corso } = registroConCorso()
    ora(registro, corso, '2026-09-14')
    ora(registro, corso, '2026-09-21', { stato: 'annullata' })
    ora(registro, corso, '2026-09-28')

    const colonna = colonnaCruscotto(registro, corso, OGGI)
    assert.deepEqual(colonna.ore.map((o) => o.numero), [1, 2])
    assert.deepEqual(colonna.ore.map((o) => o.lezione.data), ['2026-09-14', '2026-09-28'])
  })

  it('conta i buchi e le ore da preparare', () => {
    const { registro, corso } = registroConCorso()
    ora(registro, corso, '2027-02-10')
    ora(registro, corso, '2027-02-17', { stato: 'svolta', presenze: [{ allievoId: 'a1', stati: ['presente'] }] })
    ora(registro, corso, '2027-04-10')

    const colonna = colonnaCruscotto(registro, corso, OGGI)
    assert.equal(colonna.passate, 2)
    assert.equal(colonna.buchi, 1, 'solo la prima ha appello e stato mancanti')
    assert.equal(colonna.daPreparare, 1, 'quella di aprile non ha ancora un piano')
    assert.equal(colonna.prossima?.data, '2027-04-10')
  })
})

describe('il cruscotto per semestre', () => {
  it('spezza in due tabelle e fa ripartire il conto', () => {
    const { registro, anno, corso } = registroConCorso()
    ora(registro, corso, '2026-09-14')
    ora(registro, corso, '2026-09-21')
    ora(registro, corso, '2027-02-10')

    const riepilogo = riepilogoCruscotto(registro, [corso], anno, OGGI)
    assert.equal(riepilogo.sezioni.length, 2)

    const [primo, secondo] = riepilogo.sezioni
    assert.deepEqual(primo.colonne[0].ore.map((o) => o.numero), [1, 2])
    assert.deepEqual(
      secondo.colonne[0].ore.map((o) => o.numero),
      [1],
      'nel secondo semestre la numerazione riparte da uno',
    )
    assert.equal(primo.righe, 2)
    assert.equal(secondo.righe, 1)
  })

  it('sa in quale semestre si è oggi', () => {
    const { registro, anno, corso } = registroConCorso()
    const riepilogo = riepilogoCruscotto(registro, [corso], anno, OGGI)
    assert.deepEqual(riepilogo.sezioni.map((s) => s.corrente), [false, true])
  })

  it('somma l’anno intero, non un semestre solo', () => {
    const { registro, anno, corso } = registroConCorso()
    ora(registro, corso, '2026-10-01')
    ora(registro, corso, '2027-02-10')

    const riepilogo = riepilogoCruscotto(registro, [corso], anno, OGGI)
    assert.equal(riepilogo.ore, 2)
    assert.equal(riepilogo.passate, 2)
    assert.equal(riepilogo.buchi, 2, 'nessuna delle due ha appello')
  })

  it('senza semestri dichiarati resta una tabella sola', () => {
    const { registro, corso } = registroConCorso()
    ora(registro, corso, '2026-10-01')

    const riepilogo = riepilogoCruscotto(registro, [corso], null, OGGI)
    assert.equal(riepilogo.sezioni.length, 1)
    assert.equal(riepilogo.sezioni[0].semestre, null)
  })

  it('raccoglie le ore di oggi da tutti i corsi', () => {
    const { registro, anno, classe } = registroConCorso()
    const altra = creaMateria('Italiano')
    const altroCorso = creaCorso(classe.id, altra.id, 'Italiano — I MEC A')
    registro.materie.push(altra)
    registro.corsi.push(altroCorso)

    ora(registro, registro.corsi[0], OGGI)
    const seconda = ora(registro, altroCorso, OGGI)
    seconda.slot = [{ ...seconda.slot[0], inizio: '07:30', fine: '08:15' }]

    const riepilogo = riepilogoCruscotto(registro, registro.corsi, anno, OGGI)
    assert.equal(riepilogo.oggi.length, 2)
    assert.equal(riepilogo.oggi[0].id, seconda.id, 'in ordine di inizio, non di corso')
  })
})

describe('l’orologio nel cruscotto', () => {
  it('un’ora di oggi già finita conta come passata', () => {
    const { registro, anno, corso } = registroConCorso()
    ora(registro, corso, OGGI) // 08:20 – 09:05

    const mattina = riepilogoCruscotto(registro, [corso], anno, OGGI, '08:30')
    assert.equal(mattina.passate, 0, 'alle 08:30 si sta ancora facendo')
    assert.equal(mattina.buchi, 0, 'e non le si può rimproverare niente')

    const mezzogiorno = riepilogoCruscotto(registro, [corso], anno, OGGI, '12:00')
    assert.equal(mezzogiorno.passate, 1)
    assert.equal(
      mezzogiorno.buchi,
      1,
      'a mezzogiorno l’appello delle otto manca adesso, non domani',
    )
  })

  it('dice quale ora si sta facendo e quale viene dopo', () => {
    const { registro, anno, corso } = registroConCorso()
    const prima = ora(registro, corso, OGGI)
    const seconda = ora(registro, corso, OGGI)
    seconda.slot = [{ ...seconda.slot[0], inizio: '10:15', fine: '11:00' }]

    const esito = riepilogoCruscotto(registro, [corso], anno, OGGI, '08:30')
    assert.equal(esito.inCorso?.id, prima.id)
    assert.equal(esito.prossima?.id, seconda.id)

    const dopo = riepilogoCruscotto(registro, [corso], anno, OGGI, '10:30')
    assert.equal(dopo.inCorso?.id, seconda.id)
    assert.equal(dopo.prossima, null, 'non c’è più niente dopo')
  })

  it('a giornata finita le prossime ore sono quelle del giorno in cui si torna', () => {
    const { registro, anno, corso } = registroConCorso()
    ora(registro, corso, OGGI)
    // Il corso non si rivede il giorno dopo: fra le due c'è un buco di giorni,
    // ed è proprio il caso in cui «domani» sarebbe la risposta sbagliata.
    const poi = ora(registro, corso, '2027-03-04')
    const seconda = ora(registro, corso, '2027-03-04')
    seconda.slot = [{ ...seconda.slot[0], inizio: '10:15', fine: '11:00' }]

    const esito = riepilogoCruscotto(registro, [corso], anno, OGGI, '12:00')
    assert.equal(esito.prossima, null, 'di oggi non è rimasto niente')
    assert.equal(esito.successiva?.id, poi.id)
    assert.equal(esito.prossimeLezioni?.data, '2027-03-04')
    assert.deepEqual(
      esito.prossimeLezioni?.lezioni.map((l) => l.id),
      [poi.id, seconda.id],
      'tutte le ore di quella giornata, in ordine di inizio',
    )
  })

  it('finché oggi ha ancora un’ora, le prossime sono il resto di oggi', () => {
    const { registro, anno, corso } = registroConCorso()
    const prima = ora(registro, corso, OGGI)
    const seconda = ora(registro, corso, OGGI)
    seconda.slot = [{ ...seconda.slot[0], inizio: '10:15', fine: '11:00' }]
    ora(registro, corso, '2027-03-04')

    const esito = riepilogoCruscotto(registro, [corso], anno, OGGI, '08:30')
    assert.equal(esito.successiva?.id, seconda.id, 'l’ora in corso non è la successiva')
    assert.equal(esito.prossimeLezioni?.data, OGGI)
    assert.deepEqual(
      esito.prossimeLezioni?.lezioni.map((l) => l.id),
      [prima.id, seconda.id],
      'l’ora in corso resta in testa: è quella in cui si è dentro',
    )
  })

  it('le ore già finite non sono più fra le prossime', () => {
    const { registro, anno, corso } = registroConCorso()
    ora(registro, corso, OGGI)
    const seconda = ora(registro, corso, OGGI)
    seconda.slot = [{ ...seconda.slot[0], inizio: '10:15', fine: '11:00' }]

    const esito = riepilogoCruscotto(registro, [corso], anno, OGGI, '10:30')
    assert.deepEqual(
      esito.prossimeLezioni?.lezioni.map((l) => l.id),
      [seconda.id],
      'delle otto non resta niente da guardare',
    )
  })

  it('a anno finito non resta nessuna prossima ora', () => {
    const { registro, anno, corso } = registroConCorso()
    ora(registro, corso, '2027-02-10')

    const esito = riepilogoCruscotto(registro, [corso], anno, OGGI, '12:00')
    assert.equal(esito.successiva, null)
    assert.equal(esito.prossimeLezioni, null)
  })

  it('segna l’ora in corso', () => {
    const { registro, anno, corso } = registroConCorso()
    ora(registro, corso, OGGI)

    const esito = riepilogoCruscotto(registro, [corso], anno, OGGI, '08:30')
    const diagnosi = esito.sezioni.flatMap((s) => s.colonne).flatMap((c) => c.ore)[0]
    assert.ok(diagnosi.segni.includes('in-corso'))
  })
})

describe('il todo nel cruscotto', () => {
  /** Una consegna aperta senza termine: si fa la prossima volta che li vedo. */
  function daFare (registro, corso, data) {
    const consegna = creaConsegna(corso.id, 'portare le fotocopie', data)
    consegna.a = 'docente'
    registro.consegne.push(consegna)
    return consegna
  }

  it('il segno sta sulla prima ora non ancora passata, non su quelle prima', () => {
    const { registro, corso } = registroConCorso()
    ora(registro, corso, '2027-02-10')
    ora(registro, corso, '2027-03-05')
    ora(registro, corso, '2027-03-12')
    daFare(registro, corso, '2027-02-01')

    const colonna = colonnaCruscotto(registro, corso, OGGI)
    const conTodo = colonna.ore.filter((o) => o.segni.includes('todo'))

    assert.equal(conTodo.length, 1, 'una sola ora lo porta')
    assert.equal(conTodo[0].lezione.data, '2027-03-05')
    assert.equal(conTodo[0].todo, 1)
  })

  it('passando la data, il segno si sposta sull’ora dopo', () => {
    const { registro, corso } = registroConCorso()
    ora(registro, corso, '2027-03-05')
    ora(registro, corso, '2027-03-12')
    daFare(registro, corso, '2027-02-01')

    const dopo = colonnaCruscotto(registro, corso, '2027-03-06')
    const conTodo = dopo.ore.filter((o) => o.segni.includes('todo'))

    assert.equal(conTodo.length, 1)
    assert.equal(conTodo[0].lezione.data, '2027-03-12', 'l’ora passata non lo tiene')
  })

  it('senza niente da fare non compare nessun segno', () => {
    const { registro, corso } = registroConCorso()
    ora(registro, corso, '2027-03-05')

    const colonna = colonnaCruscotto(registro, corso, OGGI)
    assert.ok(!colonna.ore.some((o) => o.segni.includes('todo')))
  })

  it('una consegna spuntata non è più una cosa da fare', () => {
    const { registro, corso } = registroConCorso()
    ora(registro, corso, '2027-03-05')
    // Tocca a chi insegna: il destinatario è uno solo, e la sua spunta chiude.
    daFare(registro, corso, '2027-02-01').fatte.push({
      chi: CHI_INSEGNA,
      fattaIl: '2027-02-01T10:00:00.000Z',
    })

    const colonna = colonnaCruscotto(registro, corso, OGGI)
    assert.ok(!colonna.ore.some((o) => o.segni.includes('todo')))
  })

  it('conta anche quel che scade lì e quel che è arretrato', () => {
    const { registro, corso } = registroConCorso()
    const lezione = ora(registro, corso, '2027-03-05')
    const consegna = daFare(registro, corso, '2027-02-01')
    consegna.scadenzaLezioneId = lezione.id
    daFare(registro, corso, '2027-02-01')

    const colonna = colonnaCruscotto(registro, corso, OGGI)
    const prima = colonna.ore[0]

    // Un segno solo per tutto quel che aspetta quell'ora, da ritirare compreso.
    assert.ok(prima.segni.includes('todo'))
    assert.equal(prima.todo, 2)
  })

  it('quel che era da ritirare in un’ora passata risale alla prossima', () => {
    const { registro, corso } = registroConCorso()
    const passata = ora(registro, corso, '2027-02-10')
    ora(registro, corso, '2027-03-05')
    const consegna = daFare(registro, corso, '2027-02-01')
    consegna.scadenzaLezioneId = passata.id

    const colonna = colonnaCruscotto(registro, corso, OGGI)

    assert.ok(!colonna.ore[0].segni.includes('todo'), 'l’ora passata non lo tiene')
    assert.ok(colonna.ore[1].segni.includes('todo'))
    assert.equal(colonna.ore[1].todo, 1)
  })

  it('la stessa consegna non si conta due volte, una per semestre', () => {
    // Ogni tabella guardava la propria prima ora non passata: a marzo il conto
    // compariva sulla prossima del secondo semestre e di nuovo, identico,
    // sulla prima del primo — che è passata da mesi.
    const { registro, corso } = registroConCorso()
    ora(registro, corso, '2026-10-05')
    ora(registro, corso, '2027-03-05')
    daFare(registro, corso, '2026-10-01')

    const riepilogo = riepilogoCruscotto(registro, [corso], registro.anni[0], OGGI)
    const conTodo = riepilogo.sezioni
      .flatMap((s) => s.colonne)
      .flatMap((c) => c.ore)
      .filter((o) => o.segni.includes('todo'))

    assert.equal(conTodo.length, 1, 'una sola ora porta le cose da fare')
    assert.equal(conTodo[0].lezione.data, '2027-03-05')
  })

  it('un’ora annullata e passata non è un buco', () => {
    const { registro, corso } = registroConCorso()
    ora(registro, corso, '2027-02-10', { stato: 'annullata' })

    const diagnosi = diagnosiLezione(registro, registro.lezioni[0], 1, OGGI)

    assert.ok(!diagnosi.segni.includes('senza-appello'))
    assert.ok(!diagnosi.segni.includes('da-segnare'))
    assert.equal(diagnosi.urgenza, 'apposto')
  })
})
