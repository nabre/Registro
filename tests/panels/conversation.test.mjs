// A chi arriva quel che il modello risponde. Il giro vive nell'host, e due
// conversazioni insieme (il riquadro e la finestra staccata) hanno ciascuna il
// suo filo. Si prova il destinatario: una risposta consegnata alla pagina
// sbagliata non lascia traccia.
//
// L'assistente è spento e ogni conversazione finisce subito in un guasto, che
// arriva per la stessa strada degli altri eventi.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-pannelli-conversazione-'))
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

let api

/**
 * L'archivio non serve: il giro si ferma prima di toccarlo (`conversa`
 * solleva sul motore mancante).
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
  // Riquadro e finestra chiedono entrambi, e dalla finestra si preme
  // «Riattacca»: si sospende il giro della finestra, non quello con la chiave
  // più alta, e il riquadro continua a ricevere.
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

    // Si consegna **il primo**, che non è il più recente: decide l'id della busta.
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
  // Premuto «Stacca», l'azione resta in coda dietro le scritture: se il modello
  // conclude intanto, il giro si sospende lo stesso e la finestra nuova si sente
  // riconsegnare la risposta (la storia era stata fotografata prima).
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

    // `da: 0`: la pagina aveva fotografato la conversazione prima di ricevere
    // alcunché.
    const dopo = []
    assert.equal(api.riprendiGiro(chiave, 52, 0, (m) => dopo.push(m)), true)
    assert.equal(dopo.length, 1)
    assert.equal(dopo[0].id, 52)

    // Riconsegnato, non resta: dentro ci sono i nomi di una classe.
    assert.equal(api.riprendiGiro(chiave, 53, 0, () => undefined), false)
  })

  // Il margine vale per chi **dichiara** una domanda in volo: il caso normale
  // (domanda finita e letta) resta fuori da ogni riconsegna.
  it('chi non dichiara una domanda in volo non se lo trova fra i piedi', async () => {
    await api.rispondiConversazione(archivio, domanda(61), () => undefined, 'riquadro')
    assert.equal(api.sospendiGiroInCorso({ origine: 'riquadro' }), null)
    assert.equal(api.sospendiGiroInCorso(), null)
  })
})
