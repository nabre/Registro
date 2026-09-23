// A chi arriva quel che il modello risponde.
//
// Il giro vive nell'host e non nella pagina che l'ha chiesto: chiudere una
// finestra non lo ferma. Finché a spostarsi era una conversazione sola andava
// bene indovinare — «metti da parte il più recente» — ma **due conversazioni
// insieme sono un caso previsto**: il riquadro dentro il registro chiede, la
// finestra staccata chiede, e ciascuna ha il suo filo.
//
// Quel che si prova qui non è la risposta, è il destinatario. È la metà che si
// rompe in silenzio: una risposta consegnata alla pagina sbagliata non lancia
// niente e non lascia traccia — di là una rotella che gira per sempre, di qua
// gli attrezzi di una conversazione sotto la risposta di un'altra.
//
// L'assistente è spento su questa macchina e non c'è nessun modello: ogni
// conversazione finisce subito in un guasto. È quel che serve, perché il guasto
// è un evento come gli altri e arriva per la stessa strada.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-pannelli-conversazione-'))
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

let api

/**
 * L'archivio non serve e non si costruisce.
 *
 * Il giro si ferma prima di toccarlo — l'assistente è spento, e `conversa`
 * solleva sul motore mancante — e montarne uno vero vorrebbe dire provare
 * l'archivio in un file che parla di destinatari.
 */
const archivio = {}

/** Una domanda con il numero di busta che la pagina le ha dato. */
const domanda = (id) => ({ id, storia: [{ ruolo: 'utente', testo: 'che corsi ho?' }] })

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify({}),
  )
  api = await import('../../dist-tests/api.mjs')
})

after(() => {
  rmSync(radice, { recursive: true, force: true })
})

describe('quale giro si mette da parte', () => {
  // Il difetto, per esteso: il riquadro e la finestra staccata chiedono
  // entrambi; dalla finestra si preme «Riattacca»; l'host sospendeva il giro
  // con la chiave più alta, che poteva essere quello del riquadro. Il riquadro
  // smetteva di ricevere — nessun `fine`, nessun `guasto`, la rotella per
  // sempre — e la finestra si riprendeva un conto di eventi contato su un
  // filo che non era il suo.
  it('quello della pagina che consegna, non il più recente', async () => {
    const alRiquadro = []
    const allaFinestra = []
    const dalRiquadro = api.rispondiConversazione(
      archivio, domanda(11), (m) => alRiquadro.push(m), 'riquadro',
    )
    const dallaFinestra = api.rispondiConversazione(
      archivio, domanda(22), (m) => allaFinestra.push(m), 'finestra',
    )

    // A riattaccare è la finestra: è il suo giro che va messo da parte.
    const chiave = api.sospendiGiroInCorso({ origine: 'finestra', busta: 22 })
    assert.notEqual(chiave, null)
    await Promise.all([dalRiquadro, dallaFinestra])

    // Il riquadro continua a ricevere: nessuno l'ha toccato.
    assert.equal(alRiquadro.length, 1)
    assert.equal(alRiquadro[0].id, 11)
    // La finestra no: il suo filo aspetta chi verrà a prenderselo.
    assert.deepEqual(allaFinestra, [])

    const dopo = []
    assert.equal(api.riprendiGiro(chiave, 99, 0, (m) => dopo.push(m)), true)
    assert.equal(dopo.length, 1)
    assert.equal(dopo[0].id, 99)
  })

  it('l’id della busta sceglie fra due giri della stessa pagina', async () => {
    const alPrimo = []
    const alSecondo = []
    const primo = api.rispondiConversazione(
      archivio, domanda(31), (m) => alPrimo.push(m), 'riquadro',
    )
    const secondo = api.rispondiConversazione(
      archivio, domanda(32), (m) => alSecondo.push(m), 'riquadro',
    )

    // Si consegna **il primo**, che non è il più recente: senza l'id della
    // busta si sarebbe sospeso l'altro.
    const chiave = api.sospendiGiroInCorso({ origine: 'riquadro', busta: 31 })
    await Promise.all([primo, secondo])

    assert.deepEqual(alPrimo, [])
    assert.equal(alSecondo.length, 1)
    assert.equal(alSecondo[0].id, 32)
    assert.equal(api.riprendiGiro(chiave, 33, 0, () => undefined), true)
  })

  it('di una pagina che non ha niente in volo non si sospende il giro di un’altra', async () => {
    const alRiquadro = []
    const giro = api.rispondiConversazione(
      archivio, domanda(41), (m) => alRiquadro.push(m), 'riquadro',
    )
    assert.equal(api.sospendiGiroInCorso({ origine: 'finestra' }), null)
    await giro
    assert.equal(alRiquadro.length, 1)
  })
})

describe('il giro finito mentre si stava consegnando', () => {
  // Il difetto, per esteso: si preme «Stacca», la pagina smette di disegnare, e
  // l'azione resta in coda dietro le scritture — dietro un generatore di PDF,
  // dieci secondi. Se il modello conclude in quei secondi, il `fine` partiva
  // verso un webview che non ascoltava più e il giro si buttava: quando
  // l'azione arrivava non c'era più niente da sospendere, e la finestra nuova
  // si apriva con una bolla dell'assistente **vuota** — perché la storia era
  // stata fotografata prima che la risposta arrivasse.
  it('si sospende lo stesso, e la finestra nuova si sente riconsegnare la risposta', async () => {
    const visti = []
    await api.rispondiConversazione(archivio, domanda(51), (m) => visti.push(m), 'riquadro')
    assert.equal(visti.length, 1)

    const chiave = api.sospendiGiroInCorso({
      origine: 'riquadro',
      busta: 51,
      ancheFinito: true,
    })
    assert.notEqual(chiave, null)

    // `da: 0` perché la pagina aveva fotografato la conversazione prima di
    // ricevere alcunché: la risposta le va riconsegnata per intero.
    const dopo = []
    assert.equal(api.riprendiGiro(chiave, 52, 0, (m) => dopo.push(m)), true)
    assert.equal(dopo.length, 1)
    assert.equal(dopo[0].id, 52)

    // Riconsegnato, non resta: dentro un giro ci sono le tabelle lette dal
    // registro, cioè i nomi di una classe.
    assert.equal(api.riprendiGiro(chiave, 53, 0, () => undefined), false)
  })

  // L'altra metà, e conta quanto la prima: il margine vale per chi **dichiara**
  // di avere una domanda in volo. Chi non lo dichiara non trova niente, che è
  // quel che tiene il caso normale — una domanda finita e letta — fuori da
  // qualunque riconsegna.
  it('chi non dichiara una domanda in volo non se lo trova fra i piedi', async () => {
    await api.rispondiConversazione(archivio, domanda(61), () => undefined, 'riquadro')
    assert.equal(api.sospendiGiroInCorso({ origine: 'riquadro' }), null)
    assert.equal(api.sospendiGiroInCorso(), null)
  })
})
