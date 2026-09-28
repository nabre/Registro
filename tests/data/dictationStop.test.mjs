// Fermare una dettatura in corso, come allo spegnimento. Un server finto
// locale riceve la voce e non risponde: `fermaDettature()` chiude la richiesta,
// l'errore dice «fermata» e non «scaduta», e la dettatura dopo parte con un
// segnale nuovo.

import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { describe, it } from 'node:test'

// Un bundle solo, `dist-tests/dictation.mjs`: `fermaDettature` da
// `dictation.ts` (dove la chiama lo spegnimento) e il motore da `voicebox.ts`
// condividono il segnale.
import { VOICEBOX, fermaDettature } from '../../dist-tests/dictation.mjs'

/** Aspetta che una cosa diventi vera, senza aspettare per sempre. */
async function finché (vero, ms = 5000) {
  const fine = Date.now() + ms
  while (!vero()) {
    if (Date.now() > fine) throw new Error('non è successo in tempo')
    await new Promise((poi) => setTimeout(poi, 10))
  }
}

/** Un voicebox che prende la voce e non risponde più. */
async function servizioAppeso () {
  const aperte = new Set()
  const server = createServer((richiesta) => {
    aperte.add(richiesta.socket)
    richiesta.resume()
  })
  await new Promise((pronto) => server.listen(0, '127.0.0.1', pronto))
  return {
    indirizzo: `http://127.0.0.1:${server.address().port}`,
    ricevute: () => aperte.size,
    chiudi: () => {
      for (const presa of aperte) presa.destroy()
      server.close()
    },
  }
}

function collegamento (indirizzo, attesaMs) {
  return { indirizzo, taglia: 'turbo', lingua: 'it', attesaMs, durataMassimaMs: 60_000 }
}

describe('fermaDettature', () => {
  it('ferma la trascrizione in corso', async () => {
    const servizio = await servizioAppeso()
    try {
      const registrazione = { campioni: new Int16Array(16_000).fill(9000), frequenza: 16_000 }
      const inizio = Date.now()
      const lunga = collegamento(servizio.indirizzo, 60_000)
      const trascrizione = VOICEBOX.trascrivi(lunga, registrazione)
      // Si ferma quando la richiesta è arrivata al servizio, non prima: è la
      // trascrizione in corso che va interrotta.
      void finché(() => servizio.ricevute() >= 1).then(fermaDettature, fermaDettature)

      await assert.rejects(trascrizione, /fermata/)
      assert.ok(servizio.ricevute() >= 1, 'fermata prima che la richiesta partisse')
      assert.ok(Date.now() - inizio < 10_000, 'non si è fermata: è arrivata a scadenza')
      // La voce se ne va anche così.
      assert.ok(registrazione.campioni.every((campione) => campione === 0))
    } finally {
      servizio.chiudi()
    }
  })

  it('dopo averla fermata, la dettatura dopo parte con un segnale nuovo', async () => {
    fermaDettature()
    const servizio = await servizioAppeso()
    try {
      const registrazione = { campioni: new Int16Array(16_000), frequenza: 16_000 }
      // Col segnale vecchio morirebbe subito; con quello nuovo arriva alla scadenza.
      await assert.rejects(
        VOICEBOX.trascrivi(collegamento(servizio.indirizzo, 1_500), registrazione),
        /non ha finito entro/,
      )
    } finally {
      servizio.chiudi()
    }
  })
})
