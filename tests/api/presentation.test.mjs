// Come una busta di lettura diventa una tabella: i numeri arrivano alla pagina
// dal registro, non ricopiati dal modello. Una colonna che sparisce non si
// vede a schermo (la tabella si disegna lo stesso), quindi si prova qui.

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
    // Per cento, non ricalcolata: il dominio l'ha già divisa.
    assert.equal(api.scrivi(0.125, 'quota'), '12.5%')
    assert.equal(api.scrivi(0, 'quota'), '0%')
  })

  it('scrive le misure come si dicono, e le date come si scrivono', () => {
    assert.equal(api.scrivi(4_100_000_000, 'byte'), '4.1 GB')
    assert.equal(api.scrivi('2026-09-04', 'data'), '04.09.2026')
    assert.equal(api.scrivi(true, 'siNo'), 'sì')
    assert.equal(api.scrivi(['presente', 'assente'], 'elenco'), 'presente, assente')
  })

  // «—» dice che lì non c'è niente da sapere; una cella vuota sembra un guasto.
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

  // I numeri a destra, per confrontarli a occhio.
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
    // L'elenco tagliato alle stesse duecento righe lo dice (`quante`, `troncata`):
    // un taglio in silenzio si legge come l'elenco intero.
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
    // Niente da mostrare: una tabella vuota farebbe credere a dati nascosti.
    assert.equal(risultato, null)
  })

  it('quel che non dichiara una presentazione non si impagina', () => {
    // `modelli.prova` torna un PDF in base64: niente griglia.
    assert.equal(api.impagina(procedura('modelli.prova'), { nome: 'x', pdf: 'JVBER...' }), null)
    // Una scrittura non ha impaginazione: a chi chiama torna l'esito.
    assert.equal(api.impagina(procedura('ore.salva'), { ok: true }), null)
  })

  // Ogni lettura offerta al modello sa impaginarsi, o il modello torna a
  // ricopiare i dati.
  it('ogni lettura con dei dati dentro dichiara come si impagina', () => {
    api.registraTutte()
    const senza = api.procedure()
      .filter((p) => p.genere === 'lettura' && !p.presentazione)
      .map((p) => p.nome)
    assert.deepEqual(senza, ['modelli.leggi', 'modelli.prova'])
  })
})
