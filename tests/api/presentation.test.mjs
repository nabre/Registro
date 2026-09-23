// Come una busta di lettura diventa una tabella.
//
// È la parte che **toglie i dati di mano al modello**: fin qui una risposta con
// dei numeri dentro era il modello che li ricopiava, e un modello che ricopia
// ogni tanto sbaglia una cifra — in un registro di classe, una cifra sbagliata
// si trascrive. Adesso la busta della procedura arriva alla pagina già divisa
// in colonne, e il modello scrive la frase.
//
// Quel che va provato qui è proprio quel che non si vedrebbe guardando lo
// schermo: una colonna che non c'è più sparisce in silenzio — la tabella si
// disegna lo stesso, con una colonna in meno — e chi guarda dà la colpa al
// modello, che quella volta aveva letto giusto.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import * as api from '../../dist-tests/api.mjs'

const procedura = (nome) => {
  api.registraTutte()
  const trovata = api.procedura(nome)
  assert.ok(trovata, `la procedura «${nome}» non c'è più`)
  return trovata
}

describe('i valori come si leggono', () => {
  it('scrive le quote in percentuale, senza rifare il conto', () => {
    // Per cento e non ricalcolata: il dominio l'ha già divisa per il suo
    // denominatore, e qui si scrive lo stesso numero come si legge.
    assert.equal(api.scrivi(0.125, 'quota'), '12.5%')
    assert.equal(api.scrivi(0, 'quota'), '0%')
  })

  it('scrive le misure come si dicono, e le date come si scrivono', () => {
    assert.equal(api.scrivi(4_100_000_000, 'byte'), '4.1 GB')
    assert.equal(api.scrivi('2026-09-04', 'data'), '04.09.2026')
    assert.equal(api.scrivi(true, 'siNo'), 'sì')
    assert.equal(api.scrivi(['presente', 'assente'], 'elenco'), 'presente, assente')
  })

  // Una cella vuota si legge come una tabella rotta; «—» dice che lì non c'è
  // niente da sapere, che è un'altra cosa.
  it('quel che manca diventa un trattino, non una cella vuota', () => {
    assert.equal(api.scrivi(null), '—')
    assert.equal(api.scrivi(undefined, 'numero'), '—')
    assert.equal(api.scrivi('', 'testo'), '—')
  })
})

describe('l’impaginazione di una busta', () => {
  it('mette in colonna le righe di un appello, con i nomi davanti', () => {
    const risultato = api.impagina(procedura('ore.appello.leggi'), {
      lezioneId: 'lez-1', data: '2026-09-04', inizio: '08:20', fine: '09:50',
      stato: 'svolta', corsoId: 'cor-1', corso: 'I MEC A — Matematica',
      classeId: 'cls-1', classe: 'I MEC A', materia: 'Matematica', ud: 2,
      righe: [
        { allievoId: 'all-1', cognome: 'Rossi', nome: 'Maria', stati: ['assente', 'assente'] },
        { allievoId: 'all-2', cognome: 'Bianchi', nome: 'Luca', stati: ['presente', 'presente'], minuti: 5 },
      ],
    })

    assert.equal(risultato.procedura, 'ore.appello.leggi')
    assert.equal(risultato.titolo, 'L’appello dell’ora')

    const valori = risultato.blocchi.find((b) => b.tipo === 'valori')
    assert.deepEqual(
      valori.voci.find((v) => v.etichetta === 'Giorno'),
      { etichetta: 'Giorno', valore: '04.09.2026' },
    )

    const tabella = risultato.blocchi.find((b) => b.tipo === 'tabella')
    assert.deepEqual(tabella.colonne.map((c) => c.testo), [
      'Cognome', 'Nome', 'Appello', 'Minuti di ritardo', 'Nota',
    ])
    assert.deepEqual(tabella.righe[0], ['Rossi', 'Maria', 'assente, assente', '—', '—'])
    assert.equal(tabella.quante, 2)
    assert.equal(tabella.troncata, false)
  })

  // I numeri a destra: è l'unico modo di confrontarli con l'occhio invece che
  // contando le cifre, e chi disegna non deve indovinarlo.
  it('dice da che parte sta ogni colonna', () => {
    const risultato = api.impagina(procedura('corso.presenze'), {
      corsoId: 'cor-1', titolo: '', classeId: 'cls-1', classe: 'I MEC A',
      materia: 'Matematica', dal: '2026-09-01', al: '2027-01-31',
      udPreviste: 36, udACalendario: 30,
      righe: [{
        allievoId: 'all-1', cognome: 'Rossi', nome: 'Maria', udConAppello: 30,
        udPresenza: 26, udAssenza: 4, assenza: 0.111, presenza: 0.866,
        frequenza: 0.889, ritardi: 1, minutiRitardo: 5, prove: 2, media: 4.5, nota: 4.5,
      }],
    })
    const tabella = risultato.blocchi.find((b) => b.tipo === 'tabella')
    const perTesto = new Map(tabella.colonne.map((c) => [c.testo, c.allinea]))
    assert.equal(perTesto.get('Cognome'), 'sinistra')
    assert.equal(perTesto.get('UD perse'), 'destra')
    assert.equal(perTesto.get('Assenza (su previste)'), 'destra')
    // La quota esce come si legge, e i tre denominatori restano tre colonne.
    assert.equal(tabella.righe[0][3], '11.1%')
  })

  it('un elenco tagliato lo dice, come la tabella', () => {
    // La tabella portava `quante` e `troncata` da sempre; l'elenco si tagliava
    // alle stesse duecento righe **senza dirlo**, e duecento rotture su
    // trecento si leggevano come tutte quelle che c'erano. Un elenco tagliato
    // in silenzio è una risposta sicura su una parte sola, che è peggio di un
    // «non lo so» — e a chi legge non resta nessun modo di accorgersene.
    const trecento = Array.from({ length: 300 }, (_, i) => `Riferimento rotto numero ${i + 1}`)
    const risultato = api.impagina(procedura('registro.integrita'), {
      riferimentiRotti: trecento, riparazioni: [],
    })
    const elenco = risultato.blocchi.find((b) => b.tipo === 'elenco')
    assert.equal(elenco.voci.length, 200)
    assert.equal(elenco.quante, 300)
    assert.equal(elenco.troncata, true)
  })

  it('un elenco che ci sta tutto non si dichiara tagliato', () => {
    const risultato = api.impagina(procedura('registro.integrita'), {
      riferimentiRotti: ['Una lezione senza corso'], riparazioni: [],
    })
    const elenco = risultato.blocchi.find((b) => b.tipo === 'elenco')
    assert.equal(elenco.quante, 1)
    assert.equal(elenco.troncata, false)
  })

  it('un elenco vuoto non diventa una tabella senza righe', () => {
    const risultato = api.impagina(procedura('registro.integrita'), {
      riferimentiRotti: [], riparazioni: [],
    })
    // Niente da mostrare: la frase del modello dirà che non c'è niente, e una
    // tabella vuota farebbe credere che il registro stia nascondendo qualcosa.
    assert.equal(risultato, null)
  })

  it('quel che non dichiara una presentazione non si impagina', () => {
    // `modelli.prova` torna un PDF in base64: non c'è tabella che lo renda
    // leggibile, e meglio niente che una griglia di duemila caratteri.
    assert.equal(api.impagina(procedura('modelli.prova'), { nome: 'x', pdf: 'JVBER...' }), null)
    // Una scrittura non ne ha nessuna: al modello non è data, e a chi chiama
    // dal condotto torna l'esito, non una pagina.
    assert.equal(api.impagina(procedura('ore.salva'), { ok: true }), null)
  })

  // Tutte le letture che il modello può chiamare devono sapersi mostrare: una
  // che non lo sa lascia chi ha chiesto davanti a una frase senza i dati, e
  // rimette il modello nella condizione di ricopiarli.
  it('ogni lettura con dei dati dentro dichiara come si impagina', () => {
    api.registraTutte()
    const senza = api.procedure()
      .filter((p) => p.genere === 'lettura' && !p.presentazione)
      .map((p) => p.nome)
    assert.deepEqual(senza, ['modelli.leggi', 'modelli.prova'])
  })
})
