// Le consegne: quando scadono, chi le deve fare, e in quali ore ricompaiono.
//
// La prova che porta tutto il peso è l'ultima del file: una consegna data il 12
// deve ripresentarsi il 19 e il 26 finché non è chiusa. È la ragione per cui la
// funzionalità esiste — senza, sarebbe un secondo campo `compiti` con più
// passaggi — e nessuna delle altre viste se ne accorgerebbe se smettesse di
// funzionare.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  avanzamentoConsegna,
  CHI_INSEGNA,
  consegneDaGuardare,
  consegneDellaLezione,
  creaAllievo,
  creaAnno,
  creaClasse,
  creaConsegna,
  creaCorso,
  creaLezione,
  creaMateria,
  dataConsegna,
  destinatariConsegna,
  normalizzaRegistro,
  registroVuoto,
  riferimentiRotti,
  scadenzaConsegna,
  statoConsegna,
} from '../dist-prove/dominio.mjs'

/** Una classe di tre, un corso, e tre ore a distanza di una settimana. */
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

  return { registro, classe, corso, ore, rossi, bianchi, verdi }
}

describe('le date di una consegna', () => {
  it('legata a una lezione, si sposta con lei', () => {
    const { registro, corso, ore } = scuola()
    const consegna = creaConsegna(corso.id, 'esercizi 4–7', ore[0].data, ore[0].id)
    consegna.scadenzaLezioneId = ore[1].id
    registro.consegne.push(consegna)

    assert.equal(dataConsegna(registro, consegna), '2026-10-12')
    assert.equal(scadenzaConsegna(registro, consegna), '2026-10-19')

    // La lezione slitta di un giorno: la consegna la segue senza ritoccarla.
    ore[1].data = '2026-10-20'
    assert.equal(scadenzaConsegna(registro, consegna), '2026-10-20')
  })

  it('con un giorno secco resta dov’è', () => {
    const { registro, corso, ore } = scuola()
    const consegna = creaConsegna(corso.id, 'modulo in segreteria', ore[0].data, ore[0].id)
    consegna.scadenza = '2026-11-03'
    registro.consegne.push(consegna)

    assert.equal(scadenzaConsegna(registro, consegna), '2026-11-03')
    ore[1].data = '2026-12-01'
    assert.equal(scadenzaConsegna(registro, consegna), '2026-11-03', 'non dipende da nessuna ora')
  })

  it('può non avere termine: resta aperta finché non è fatta', () => {
    const { registro, classe, corso, ore } = scuola()
    const consegna = creaConsegna(corso.id, 'tenere d’occhio Rossi', ore[0].data, ore[0].id)
    registro.consegne.push(consegna)
    assert.equal(scadenzaConsegna(registro, consegna), null)
    assert.equal(statoConsegna(registro, consegna, classe, '2027-01-01'), 'aperta')
  })

  it('una consegna a una classe ancora vuota resta aperta', () => {
    const { registro, corso, ore } = scuola()
    const consegna = creaConsegna(corso.id, 'per una classe vuota', ore[0].data, ore[0].id)
    registro.consegne.push(consegna)

    // È la situazione di settembre: la classe c'è, gli allievi non ancora.
    // Contarla come fatta la faceva sparire il minuto dopo averla scritta.
    const avanzamento = avanzamentoConsegna(consegna, null)
    assert.equal(avanzamento.senzaNessuno, true)
    assert.equal(avanzamento.completa, false)
    assert.equal(statoConsegna(registro, consegna, null, '2027-01-01'), 'aperta')
  })

  it('senza nessuno resta aperta: non c’è una chiusura che la zittisca', () => {
    // C'era «Chiudi comunque» e chiudeva la consegna intera: spariva
    // portandosi via i nomi di chi non aveva portato niente, che erano
    // l'unica ragione per cui esisteva. Ora si chiude spuntando, e senza
    // nessuno da spuntare non si chiude — la si cancella.
    const { registro, corso, ore } = scuola()
    const consegna = creaConsegna(corso.id, 'per una classe vuota', ore[0].data, ore[0].id)
    registro.consegne.push(consegna)
    assert.equal(statoConsegna(registro, consegna, null, '2027-01-01'), 'aperta')
  })
})

describe('chi deve spuntare', () => {
  it('alla classe tocca a tutti quelli che frequentano', () => {
    const { registro, classe, corso, ore, verdi } = scuola()
    const consegna = creaConsegna(corso.id, 'esercizi', ore[0].data, ore[0].id)
    registro.consegne.push(consegna)

    assert.equal(destinatariConsegna(consegna, classe).length, 3)

    // Chi si ritira esce dai destinatari: una consegna eternamente incompleta
    // perché aspetta chi non c'è più è un allarme che si impara a ignorare.
    verdi.attivo = false
    assert.equal(destinatariConsegna(consegna, classe).length, 2)
  })

  it('a me tocca una casella sola', () => {
    const { registro, classe, corso, ore } = scuola()
    const consegna = creaConsegna(corso.id, 'portare le fotocopie', ore[0].data, ore[0].id)
    consegna.a = 'docente'
    registro.consegne.push(consegna)

    assert.deepEqual(destinatariConsegna(consegna, classe), [CHI_INSEGNA])
  })

  it('a qualcuno in particolare tocca solo a lui', () => {
    const { registro, classe, corso, ore, rossi, bianchi } = scuola()
    const consegna = creaConsegna(corso.id, 'recupero', ore[0].data, ore[0].id)
    consegna.a = 'allievi'
    consegna.allieviIds = [rossi.id, bianchi.id]
    registro.consegne.push(consegna)

    assert.deepEqual(destinatariConsegna(consegna, classe), [rossi.id, bianchi.id])
  })

  it('conta chi ha fatto e chi manca, uno per uno', () => {
    const { registro, classe, corso, ore, rossi } = scuola()
    const consegna = creaConsegna(corso.id, 'esercizi', ore[0].data, ore[0].id)
    consegna.fatte = [{ chi: rossi.id, fattaIl: '2026-10-19T08:00:00.000Z' }]
    registro.consegne.push(consegna)

    const avanzamento = avanzamentoConsegna(consegna, classe)
    assert.equal(avanzamento.fatte, 1)
    assert.equal(avanzamento.mancano.length, 2)
    assert.equal(avanzamento.completa, false)
    assert.ok(Math.abs(avanzamento.quota - 1 / 3) < 0.001)
  })

  it('è completa quando non manca più nessuno', () => {
    const { registro, classe, corso, ore, rossi, bianchi, verdi } = scuola()
    const consegna = creaConsegna(corso.id, 'esercizi', ore[0].data, ore[0].id)
    consegna.fatte = [rossi, bianchi, verdi].map((a) => ({ chi: a.id, fattaIl: '2026-10-19T08:00:00.000Z' }))
    registro.consegne.push(consegna)

    assert.equal(avanzamentoConsegna(consegna, classe).completa, true)
  })

  it('spuntarla per tutti la chiude, e resta scritto chi', () => {
    // Il gesto rapido resta — un clic per una riga intera — ma quel che si
    // scrive è una spunta per nome: chiudere la consegna intera diceva
    // «fatta» anche di chi non aveva portato niente.
    const { registro, classe, corso, ore } = scuola()
    const consegna = creaConsegna(corso.id, 'avviso dato', ore[0].data, ore[0].id)
    for (const allievo of classe.allievi) {
      consegna.fatte.push({ chi: allievo.id, fattaIl: '2026-10-13T10:00:00.000Z' })
    }
    registro.consegne.push(consegna)

    const avanzamento = avanzamentoConsegna(consegna, classe)
    assert.equal(avanzamento.completa, true)
    assert.deepEqual(avanzamento.mancano, [], 'e nessun nome resta appeso')
    assert.equal(statoConsegna(registro, consegna, classe, '2027-01-01'), 'completa')
  })
})

describe('come si presenta in una lezione', () => {
  it('torna a galla nelle ore successive finché non è fatta', () => {
    const { registro, classe, corso, ore } = scuola()
    const consegna = creaConsegna(corso.id, 'esercizi 4–7', ore[0].data, ore[0].id)
    consegna.scadenzaLezioneId = ore[1].id
    registro.consegne.push(consegna)

    // Nell'ora in cui la si dà: compare come data.
    const prima = consegneDellaLezione(registro, ore[0], classe)
    assert.deepEqual(prima.date.map((c) => c.id), [consegna.id])
    assert.equal(prima.aperte.length, 1, 'aperta, con il termine più in là')

    // Nell'ora in cui scade.
    const seconda = consegneDellaLezione(registro, ore[1], classe)
    assert.deepEqual(seconda.scadono.map((c) => c.id), [consegna.id])

    // L'ora dopo ancora: nessuno l'ha fatta, quindi è rimasta indietro.
    const terza = consegneDellaLezione(registro, ore[2], classe)
    assert.deepEqual(
      terza.arretrate.map((c) => c.id),
      [consegna.id],
      'è il punto di tutta la faccenda: si ripresenta da sola',
    )
  })

  it('sparisce dalle ore successive quando è fatta da tutti', () => {
    const { registro, classe, corso, ore, rossi, bianchi, verdi } = scuola()
    const consegna = creaConsegna(corso.id, 'esercizi', ore[0].data, ore[0].id)
    consegna.scadenzaLezioneId = ore[1].id
    consegna.fatte = [rossi, bianchi, verdi].map((a) => ({ chi: a.id, fattaIl: '2026-10-19T08:00:00.000Z' }))
    registro.consegne.push(consegna)

    const terza = consegneDellaLezione(registro, ore[2], classe)
    assert.equal(terza.arretrate.length, 0)
    assert.equal(terza.aperte.length, 0)
  })

  it('non compare nelle ore precedenti a quella in cui è nata', () => {
    const { registro, classe, corso, ore } = scuola()
    const consegna = creaConsegna(corso.id, 'per maggio', ore[2].data, ore[2].id)
    registro.consegne.push(consegna)

    const prima = consegneDellaLezione(registro, ore[0], classe)
    assert.equal(prima.aperte.length, 0, 'a ottobre non ha ancora niente da dire')
  })

  it('resta dentro il suo corso', () => {
    const { registro, classe, corso, ore } = scuola()
    const altra = creaMateria('Italiano')
    const altroCorso = creaCorso(classe.id, altra.id, 'Italiano — I MEC A')
    const suaOra = creaLezione(altroCorso.id, '2026-10-20', '10:00', 45)
    registro.materie.push(altra)
    registro.corsi.push(altroCorso)
    registro.lezioni.push(suaOra)
    registro.consegne.push(creaConsegna(corso.id, 'esercizi', ore[0].data, ore[0].id))

    assert.equal(consegneDellaLezione(registro, suaOra, classe).aperte.length, 0)
  })
})

describe('quel che chiede attenzione oggi', () => {
  it('separa gli arretrati da quel che scade adesso', () => {
    const { registro, corso, ore } = scuola()
    const tardi = creaConsegna(corso.id, 'in ritardo', ore[0].data, ore[0].id)
    tardi.scadenzaLezioneId = ore[0].id
    const oggi = creaConsegna(corso.id, 'per oggi', ore[0].data, ore[0].id)
    oggi.scadenzaLezioneId = ore[1].id
    registro.consegne.push(tardi, oggi)

    const esito = consegneDaGuardare(registro, registro.corsi, '2026-10-19')
    assert.deepEqual(esito.arretrate.map((c) => c.testo), ['in ritardo'])
    assert.deepEqual(esito.scadono.map((c) => c.testo), ['per oggi'])
  })
})

describe('integrità', () => {
  it('un registro con consegne sane non ha niente da segnalare', () => {
    const { registro, corso, ore, rossi } = scuola()
    const consegna = creaConsegna(corso.id, 'esercizi', ore[0].data, ore[0].id)
    consegna.fatte = [{ chi: rossi.id, fattaIl: '2026-10-19T08:00:00.000Z' }]
    registro.consegne.push(consegna)

    assert.deepEqual(riferimentiRotti(registro), [])
  })

  it('segnala una consegna appesa a una lezione che non c’è più', () => {
    const { registro, corso, ore } = scuola()
    const consegna = creaConsegna(corso.id, 'esercizi', ore[0].data, ore[0].id)
    consegna.scadenzaLezioneId = 'lez-sparita'
    registro.consegne.push(consegna)

    assert.equal(riferimentiRotti(registro).length, 1)
  })
})

describe('la vecchia chiusura di una consegna', () => {
  it('alla rilettura diventa una spunta per ciascuno', () => {
    // «Chiudi comunque» è stato: chiudeva la consegna intera e si portava via
    // i nomi di chi non aveva portato niente. Buttarlo via senza convertirlo
    // vorrebbe però dire riaprire a marzo tutto quel che era chiuso fino a
    // ieri, e chi riapre il registro non capirebbe perché.
    const { registro, classe, corso, ore, rossi } = scuola()
    const consegna = creaConsegna(corso.id, 'certificato', ore[0].data, ore[0].id)
    // Uno l'aveva già portato davvero: la sua spunta ha la data vera, e non si
    // tocca.
    consegna.fatte.push({ chi: rossi.id, fattaIl: '2026-10-13T09:00:00.000Z' })
    consegna.aggiornataIl = '2026-11-02T15:00:00.000Z'
    registro.consegne.push({ ...consegna, chiusa: true })

    const riletto = normalizzaRegistro(JSON.parse(JSON.stringify(registro)))
    const letta = riletto.consegne.find((c) => c.id === consegna.id)

    assert.equal(letta.chiusa, undefined, 'il campo non c’è più')
    assert.equal(letta.fatte.length, 3, 'una spunta per ogni allievo attivo')
    assert.equal(
      letta.fatte.find((f) => f.chi === rossi.id).fattaIl,
      '2026-10-13T09:00:00.000Z',
      'chi l’aveva già portato tiene la sua data',
    )
    assert.equal(avanzamentoConsegna(letta, classe).completa, true)
  })

  it('quel che era aperto resta aperto', () => {
    const { registro, classe, corso, ore } = scuola()
    const consegna = creaConsegna(corso.id, 'esercizi', ore[0].data, ore[0].id)
    registro.consegne.push(consegna)

    const riletto = normalizzaRegistro(JSON.parse(JSON.stringify(registro)))
    const letta = riletto.consegne.find((c) => c.id === consegna.id)

    assert.deepEqual(letta.fatte, [])
    assert.equal(avanzamentoConsegna(letta, classe).completa, false)
  })
})
