// Le riconsegne: le prove svolte che non sono ancora tornate agli allievi.
//
// La prova che porta il peso di tutto il file è la prima: una verifica svolta
// compare nel todo *senza che nessuno abbia scritto niente*. È il punto della
// funzionalità — una prova svolta sparisce da ogni altra vista del registro, e
// l'unico posto in cui esiste è la pila sulla scrivania — e nessun'altra
// pagina se ne accorgerebbe se smettesse di funzionare.
//
// La seconda coppia guarda il confine fra i due lavori: finché una casella è
// vuota la prova è da correggere, e il passaggio a «da riconsegnare» avviene
// mettendo i voti, senza una spunta in più. Solo l'ultimo passo si scrive: che
// la classe l'abbia rivista non lo dice nessun dato.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  GIORNI_PER_RICONSEGNARE,
  apertaRiconsegna,
  creaAllievo,
  creaAnno,
  creaClasse,
  creaCorso,
  creaLezione,
  creaMateria,
  creaValutazione,
  normalizzaValutazione,
  riconsegnaDelMomento,
  riconsegneAperte,
  riconsegneDaFare,
  riconsegneUrgenti,
  registroVuoto,
} from '../dist/dominio.mjs'

const PROVA = '2026-10-12'
/** Il giorno dopo la prova: la correzione è cominciata, il ritardo no. */
const DOMANI = '2026-10-13'

/** Una classe di tre, un corso, e una verifica svolta il 12 ottobre. */
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

  const ora = creaLezione(corso.id, PROVA, '08:20', 45)
  registro.lezioni.push(ora)

  const prova = creaValutazione(corso.id, 'Verifica sulle equazioni', undefined, PROVA)
  prova.lezioneId = ora.id
  registro.valutazioni.push(prova)

  return { registro, classe, corso, ora, prova, rossi, bianchi, verdi }
}

/** Mette il voto a tutta la classe: la pila è corretta. */
function correggiTutto (prova, allievi) {
  for (const allievo of allievi) {
    prova.voti.push({ allievoId: allievo.id, valore: 4.5, assente: false })
  }
}

describe('da dove nasce una riconsegna', () => {
  it('dalla prova svolta, senza che nessuno scriva niente', () => {
    // È il punto di tutto: una verifica fatta ieri chiede qualcosa oggi, e
    // nessuno ha dovuto ricordarsi di segnarla da nessuna parte.
    const { classe, prova } = scuola()

    const riconsegna = riconsegnaDelMomento(prova, classe, DOMANI)

    assert.ok(riconsegna, 'la prova svolta compare da sé')
    assert.equal(riconsegna.stato, 'da-correggere')
    assert.equal(riconsegna.corretti, 0)
    assert.equal(riconsegna.attesi, 3)
    assert.equal(prova.voti.length, 0, 'il registro non scrive voti da solo')
  })

  it('il giorno stesso: una prova fatta stamattina è già una pila', () => {
    const { classe, prova } = scuola()

    const riconsegna = riconsegnaDelMomento(prova, classe, PROVA)

    assert.ok(riconsegna)
    assert.equal(riconsegna.giorniPassati, 0)
    assert.equal(riconsegna.inRitardo, false)
  })

  it('una prova che deve ancora svolgersi non chiede niente', () => {
    // Quella sta nel calendario: chiederne la riconsegna prima che si faccia
    // sarebbe una riga che parla di un futuro.
    const { classe, prova } = scuola()

    assert.equal(riconsegnaDelMomento(prova, classe, '2026-10-11'), null)
  })
})

describe('i due lavori, e il confine fra loro', () => {
  it('finché una casella è vuota, la prova è da correggere', () => {
    const { classe, prova, rossi, bianchi } = scuola()
    correggiTutto(prova, [rossi, bianchi])

    const riconsegna = riconsegnaDelMomento(prova, classe, DOMANI)

    assert.equal(riconsegna.stato, 'da-correggere')
    assert.equal(riconsegna.corretti, 2)
    assert.equal(riconsegna.attesi, 3)
  })

  it('con i voti messi passa a «da riconsegnare», senza una spunta in più', () => {
    const { classe, prova, rossi, bianchi, verdi } = scuola()
    correggiTutto(prova, [rossi, bianchi, verdi])

    const riconsegna = riconsegnaDelMomento(prova, classe, DOMANI)

    assert.equal(riconsegna.stato, 'da-riconsegnare')
    assert.equal(apertaRiconsegna(riconsegna.stato), true)
  })

  it('chi non c’era non tiene aperta la correzione', () => {
    // La sua casella la guarda il todo dei recuperi, che è un altro debito.
    // Contarla qui vorrebbe dire una verifica con due assenti che non risulta
    // corretta mai.
    const { classe, prova, rossi, bianchi, verdi } = scuola()
    correggiTutto(prova, [rossi, bianchi])
    prova.voti.push({ allievoId: verdi.id, valore: null, assente: true })

    assert.equal(riconsegnaDelMomento(prova, classe, DOMANI).stato, 'da-riconsegnare')
  })

  it('e nemmeno chi è stato dispensato dal recupero', () => {
    const { classe, prova, rossi, bianchi, verdi } = scuola()
    correggiTutto(prova, [rossi, bianchi])
    prova.voti.push({
      allievoId: verdi.id,
      valore: null,
      assente: true,
      recupero: { previstoIl: null, dispensato: true, aggiornatoIl: '2026-10-13T08:00:00.000Z' },
    })

    assert.equal(riconsegnaDelMomento(prova, classe, DOMANI).stato, 'da-riconsegnare')
  })
})

describe('l’unica cosa che si scrive', () => {
  it('la riconsegna chiude la riga, e nient’altro lo fa', () => {
    // I voti dicono che la prova è corretta, non che gli allievi l'hanno
    // vista: fra i due fatti passano regolarmente tre settimane.
    const { classe, prova, rossi, bianchi, verdi } = scuola()
    correggiTutto(prova, [rossi, bianchi, verdi])

    assert.equal(riconsegnaDelMomento(prova, classe, DOMANI).stato, 'da-riconsegnare')

    // Non c'è una data della prova: ce n'è una per riga, ed è la sola che il
    // registro conosce.
    for (const voto of prova.voti) voto.riconsegnataIl = '2026-10-20'
    const chiusa = riconsegnaDelMomento(prova, classe, '2026-10-21')

    assert.equal(chiusa.stato, 'riconsegnata')
    assert.equal(chiusa.riconsegnataIl, '2026-10-20')
    assert.equal(chiusa.inRitardo, false, 'chiusa non è più in ritardo')
    assert.equal(apertaRiconsegna(chiusa.stato), false)
  })

  it('si chiude quando è tornato l’ultimo foglio, non prima', () => {
    // Chi riconsegna i compiti in tre volte — o li dà a chi manca quando
    // torna — ha finito lo stesso lavoro, e la data è quella dell'ultimo.
    const { classe, prova, rossi, bianchi, verdi } = scuola()
    correggiTutto(prova, [rossi, bianchi, verdi])

    for (const voto of prova.voti) voto.riconsegnataIl = '2026-10-19'
    prova.voti[2].riconsegnataIl = '2026-10-26'

    const chiusa = riconsegnaDelMomento(prova, classe, '2026-10-27')

    assert.equal(chiusa.stato, 'riconsegnata')
    assert.equal(chiusa.daRidare, 0)
    assert.equal(prova.riconsegnataIl, undefined, 'la prova non ha una data sua')
    // È finita quando è tornato l'ultimo foglio: quella è la data che qualcuno
    // verrebbe a cercare.
    assert.equal(chiusa.riconsegnataIl, '2026-10-26')
  })

  it('finché ne manca uno resta da riconsegnare', () => {
    // Due su tre non è finito: il terzo foglio è ancora nella cartella, ed è
    // proprio quello che qualcuno reclamerà.
    const { classe, prova, rossi, bianchi, verdi } = scuola()
    correggiTutto(prova, [rossi, bianchi, verdi])
    prova.voti[0].riconsegnataIl = '2026-10-19'
    prova.voti[1].riconsegnataIl = '2026-10-19'

    const riconsegna = riconsegnaDelMomento(prova, classe, '2026-10-20')

    assert.equal(riconsegna.stato, 'da-riconsegnare')
    assert.equal(riconsegna.daRidare, 1)
    assert.equal(riconsegna.riconsegnataIl, null)
  })

  it('una prova a cui erano tutti assenti non ha fogli da ridare', () => {
    // Nessuno ha una prova da farsi ridare: quel debito è il recupero, e sta
    // nel suo elenco. Tenerla fra le riconsegne sarebbe una riga che chiede
    // un gesto che non esiste.
    const { classe, prova, rossi, bianchi, verdi } = scuola()
    for (const allievo of [rossi, bianchi, verdi]) {
      prova.voti.push({ allievoId: allievo.id, valore: null, assente: true })
    }

    const riconsegna = riconsegnaDelMomento(prova, classe, DOMANI)

    assert.equal(riconsegna.stato, 'riconsegnata')
    assert.equal(riconsegna.daRidare, 0)
    assert.equal(riconsegna.riconsegnataIl, null, 'non si inventa un giorno')
  })

  it('la vecchia data della prova scende su ogni voto alla rilettura', () => {
    // I registri scritti prima hanno una data sola per la prova. Buttarla via
    // vorrebbe dire riaprire nel todo tutto quel che era chiuso fino a ieri, e
    // chi riapre il registro non capirebbe perché.
    const { classe, prova, rossi, bianchi, verdi } = scuola()
    correggiTutto(prova, [rossi, bianchi, verdi])
    // Una sua ce l'ha già: è più precisa, e non la si tocca.
    prova.voti[1].riconsegnataIl = '2026-10-23'

    const riletta = normalizzaValutazione({
      ...JSON.parse(JSON.stringify(prova)),
      riconsegnataIl: '2026-10-20',
    })

    assert.deepEqual(
      riletta.voti.map((v) => v.riconsegnataIl),
      ['2026-10-20', '2026-10-23', '2026-10-20'],
    )
    assert.equal(riletta.riconsegnataIl, undefined, 'e il campo della prova non c’è più')
    assert.equal(riconsegnaDelMomento(riletta, classe, '2026-10-24').stato, 'riconsegnata')
  })

  it('una prova ferma da più di due settimane si fa notare', () => {
    const { classe, prova } = scuola()
    const tardi = '2026-11-02' // ventun giorni dopo

    const riconsegna = riconsegnaDelMomento(prova, classe, tardi)

    assert.equal(riconsegna.giorniPassati, 21)
    assert.ok(riconsegna.giorniPassati > GIORNI_PER_RICONSEGNARE)
    assert.equal(riconsegna.inRitardo, true)
    // In ritardo resta dov'è: il gesto che la chiude è lo stesso, e il ritardo
    // dice soltanto quale guardare per prima.
    assert.equal(riconsegna.stato, 'da-correggere')
  })

  it('sopravvive al giro su disco', () => {
    // Un campo che il caricamento lascia cadere è un campo che si perde alla
    // prima riapertura del registro, e la prova tornerebbe nel todo da sola.
    const { prova, rossi, bianchi, verdi } = scuola()
    correggiTutto(prova, [rossi, bianchi, verdi])
    for (const voto of prova.voti) voto.riconsegnataIl = '2026-10-20'

    const riletta = normalizzaValutazione(JSON.parse(JSON.stringify(prova)))
    assert.ok(riletta.voti.every((v) => v.riconsegnataIl === '2026-10-20'))

    // Chi non ha una data non ne prende una: vale «non riconsegnata», che è la
    // verità che si conosce.
    const vecchia = normalizzaValutazione({
      id: 'v1',
      corsoId: 'c1',
      titolo: 'Vecchia',
      data: PROVA,
      voti: [{ allievoId: 'a1', valore: 4 }],
    })
    assert.equal(vecchia.voti[0].riconsegnataIl, null)
  })
})

describe('i mucchi del todo', () => {
  it('dividono per lavoro, e contano quel che è fermo da troppo', () => {
    const { registro, corso, prova, rossi, bianchi, verdi } = scuola()
    correggiTutto(prova, [rossi, bianchi, verdi])

    const seconda = creaValutazione(corso.id, 'Test d’ingresso', undefined, '2026-09-14')
    registro.valutazioni.push(seconda)
    const terza = creaValutazione(corso.id, 'Interrogazione', undefined, '2026-11-30')
    registro.valutazioni.push(terza)

    const gruppi = riconsegneDaFare(registro, [corso], '2026-10-13')

    assert.deepEqual(gruppi.daRiconsegnare.map((r) => r.momento.id), [prova.id])
    assert.deepEqual(gruppi.daCorreggere.map((r) => r.momento.id), [seconda.id])
    assert.equal(gruppi.fatte.length, 0)
    // La terza è di fine novembre: non si è ancora svolta, e non entra.
    assert.equal(riconsegneAperte(gruppi), 2)
    // Il test d'ingresso è di un mese prima: quello sì che è fermo da troppo.
    assert.equal(riconsegneUrgenti(gruppi), 1)
  })

  it('prima le più vecchie: in fondo alla pila c’è quel che aspetta di più', () => {
    const { registro, corso } = scuola()
    registro.valutazioni.push(
      creaValutazione(corso.id, 'Seconda', undefined, '2026-10-05'),
      creaValutazione(corso.id, 'Prima', undefined, '2026-09-21'),
    )

    const gruppi = riconsegneDaFare(registro, [corso], '2026-10-13')

    assert.deepEqual(
      gruppi.daCorreggere.map((r) => r.momento.data),
      ['2026-09-21', '2026-10-05', PROVA],
    )
  })

  it('i corsi che non si stanno guardando restano fuori', () => {
    const { registro, corso } = scuola()

    assert.equal(riconsegneAperte(riconsegneDaFare(registro, [], '2026-10-13')), 0)
    assert.equal(riconsegneAperte(riconsegneDaFare(registro, [corso], '2026-10-13')), 1)
  })
})
