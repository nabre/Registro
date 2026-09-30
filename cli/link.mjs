// Gestione della connessione al condotto e conversazione JSON-RPC.
// Solo moduli `node:`, nessuna compilazione.

import net from 'node:net'
import { indirizzo } from './address.mjs'
import { testi } from './texts.mjs'

/** Il rifiuto di `collega` quando l'indirizzo non si conosce. */
export class CondottoMaiAcceso extends Error {}

/** Tetto di tempo predefinito per le richieste ordinarie (30s). */
const TIMEOUT_ORDINARIO_MS = 30000

/** Tetto di tempo per le procedure interattive o lunghe (5 minuti). */
const TIMEOUT_INTERATTIVO_MS = 300000

/**
 * Determina se un metodo è di tipo interattivo o a lungo decorso, per cui
 * si applica un tetto di tempo prolungato.
 */
function eInterattiva (metodo) {
  if (!metodo) return false
  if (metodo.startsWith('$guarda') || metodo.startsWith('$aspetta')) return true
  if (
    metodo.startsWith('assistente.') ||
    metodo.startsWith('llm.') ||
    metodo.startsWith('dettatura.') ||
    metodo.startsWith('ocr.')
  ) {
    return true
  }
  return false
}

function dormi (ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Apre il condotto o dice che non c'è.
 * Con `aspetta: true` effettua tentativi ripetuti in caso di ENOENT / ECONNREFUSED
 * o mancanza del segreto dell'indirizzo.
 */
export async function collega ({ aspetta = false, timeout = 0, intervallo = 200 } = {}) {
  const inizio = Date.now()

  while (true) {
    const dove = indirizzo()
    if (dove !== null) {
      try {
        const presa = await tentaConnessione(dove)
        return presa
      } catch (err) {
        if (!aspetta) throw err
      }
    } else if (!aspetta) {
      throw new CondottoMaiAcceso('il condotto non si è mai acceso su questa macchina')
    }

    if (timeout > 0 && Date.now() - inizio >= timeout) {
      throw new Error(testi().nonRisponde)
    }

    await dormi(intervallo)
  }
}

function tentaConnessione (dove) {
  return new Promise((risolvi, rifiuta) => {
    const presa = net.createConnection(dove)
    const onConnect = () => {
      presa.removeListener('error', onError)
      risolvi(presa)
    }
    const onError = (male) => {
      presa.removeListener('connect', onConnect)
      rifiuta(male)
    }
    presa.once('connect', onConnect)
    presa.once('error', onError)
  })
}

/**
 * Gestisce il flusso JSON-RPC su una presa condotto.
 * Esporta `conversazione` per `main.mjs` e per i test.
 */
export function conversazione (presa) {
  let resto = ''
  let prossimo = 1
  let chiusa = false
  const attese = new Map()
  const ascoltatoriNotifiche = new Set()

  presa.setEncoding('utf8')
  presa.on('data', (pezzo) => {
    resto += pezzo
    let taglio = resto.indexOf('\n')
    while (taglio >= 0) {
      const riga = resto.slice(0, taglio)
      resto = resto.slice(taglio + 1)
      consegna(riga)
      taglio = resto.indexOf('\n')
    }
  })

  // Alla chiusura chi aspetta riceve `null`, cioè «il condotto è muto».
  const chiudiTutto = () => {
    chiusa = true
    for (const { callback, timer } of attese.values()) {
      if (timer) clearTimeout(timer)
      callback(null)
    }
    attese.clear()
  }

  presa.on('close', chiudiTutto)
  presa.on('end', chiudiTutto)
  presa.on('error', chiudiTutto)

  function consegna (riga) {
    if (riga.trim() === '') return
    let busta = null
    try {
      busta = JSON.parse(riga)
    } catch {
      return
    }

    // Se è una notifica dal condotto (es. streaming di $guarda)
    if (busta && busta.id === undefined) {
      for (const cb of ascoltatoriNotifiche) {
        try { cb(busta) } catch {}
      }
      return
    }

    const voceAttesa = attese.get(busta?.id)
    if (voceAttesa) {
      if (voceAttesa.timer) clearTimeout(voceAttesa.timer)
      attese.delete(busta.id)
      voceAttesa.callback(busta)
      return
    }

    // Un errore con `id: null` risponde a tutte le attese.
    if (busta?.error && attese.size > 0) {
      for (const { callback, timer } of attese.values()) {
        if (timer) clearTimeout(timer)
        callback(busta)
      }
      attese.clear()
    }
  }

  return {
    chiedi (method, params, opzioni = {}) {
      if (chiusa) return Promise.resolve(null)
      const id = prossimo++

      // Determina il timeout specifico o differenziato per procedure interattive
      let limiteMs = opzioni.timeout
      if (limiteMs === undefined) {
        limiteMs = eInterattiva(method) ? TIMEOUT_INTERATTIVO_MS : TIMEOUT_ORDINARIO_MS
      }

      return new Promise((risolvi) => {
        let timer = null
        if (limiteMs > 0) {
          timer = setTimeout(() => {
            if (attese.has(id)) {
              attese.delete(id)
              const t = testi()
              risolvi({
                jsonrpc: '2.0',
                id,
                error: {
                  code: -32000,
                  message: t.tempoEsauritoRichiesta ?? 'Tempo di attesa della richiesta esaurito.',
                  data: { codice: 'non-disponibile' },
                },
              })
            }
          }, limiteMs)
        }

        attese.set(id, { callback: risolvi, timer })
        try {
          presa.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
        } catch {
          chiudiTutto()
        }
      })
    },

    suNotifica (cb) {
      ascoltatoriNotifiche.add(cb)
      return () => ascoltatoriNotifiche.delete(cb)
    },

    chiudi () {
      chiudiTutto()
      presa.end()
    },
  }
}
