// La riga di comando lanciata come la lancia chi la usa, e un condotto finto che
// risponde lo schema e rimanda l'ingresso: quel che serve alle prove di `cli/`
// per vedere che cosa la riga di comando fa di argomenti e risposte.

import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import * as percorso from 'node:path'
import { fileURLToPath } from 'node:url'

import { prova } from '../../cli/access.mjs'

export const CLI = fileURLToPath(new URL('../../cli/main.mjs', import.meta.url))

/**
 * La funzione che lancia la riga di comando e raccoglie quel che dice.
 * `APPDATA` e `XDG_CONFIG_HOME` puntano a `radice`, non ai dati veri di chi
 * esegue `npm test`.
 */
export function lanciatore (radice) {
  return (argomenti, ambiente = {}) => new Promise((risolvi, rifiuta) => {
    const figlio = spawn(process.execPath, [CLI, ...argomenti], {
      env: {
        ...process.env,
        APPDATA: radice,
        XDG_CONFIG_HOME: radice,
        REGISTRO_COMANDO: 'registro',
        ...ambiente,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let uscita = ''
    let errore = ''
    figlio.stdout.on('data', (pezzo) => { uscita += pezzo })
    figlio.stderr.on('data', (pezzo) => { errore += pezzo })
    figlio.on('error', rifiuta)
    figlio.on('close', (codice) => risolvi({ codice, uscita, errore }))
  })
}

/** Un indirizzo di condotto nuovo: una pipe su Windows, un socket in `radice` altrove. */
export function nomeDelCondotto (radice, etichetta) {
  const nome = `registro-${etichetta}-${randomBytes(6).toString('hex')}`
  return process.platform === 'win32'
    ? `\\\\.\\pipe\\${nome}`
    : percorso.join(radice, `${nome}.sock`)
}

/**
 * La chiave di un condotto finto, scritta in `radice`, e la risposta a
 * `$accedi` che dimostra di averla. `ambiente` va alla riga di comando accanto
 * a `REGISTRO_CONDOTTO`.
 */
export function accessoFinto (radice) {
  const chiave = randomBytes(32)
  const file = percorso.join(radice, `chiave-${randomBytes(6).toString('hex')}`)
  writeFileSync(file, chiave.toString('hex'))
  return {
    ambiente: { REGISTRO_CHIAVE: file },
    /** Se la riga è `$accedi`, risponde con la prova e torna `true`. */
    risponde (presa, riga) {
      let richiesta
      try {
        richiesta = JSON.parse(riga.trim())
      } catch {
        return false
      }
      if (richiesta?.method !== '$accedi') return false
      const result = { prova: prova(chiave, 'condotto', richiesta.params?.sfida ?? '') }
      presa.write(`${JSON.stringify({ jsonrpc: '2.0', id: richiesta.id, result })}\n`)
      return true
    },
  }
}

/**
 * Un condotto finto che sa lo schema di `prova.eco` e rimanda l'ingresso
 * ricevuto: `eco(...argomenti)` lancia `chiama prova.eco` contro di lui e
 * legge i dati rimandati. Con `chiudeDopoSchema` risponde a `$schema` e chiude
 * subito la presa, come un registro che si spegne fra le due richieste.
 */
export async function condottoFinto ({ radice, schema, chiudeDopoSchema = false }) {
  const dove = nomeDelCondotto(radice, chiudeDopoSchema ? 'chiude' : 'eco')
  const accesso = accessoFinto(radice)
  const ambiente = { REGISTRO_CONDOTTO: dove, ...accesso.ambiente }
  const chiamate = []
  const server = createServer((presa) => {
    let resto = ''
    presa.on('data', (pezzo) => {
      resto += pezzo.toString('utf8')
      let taglio = resto.indexOf('\n')
      while (taglio >= 0) {
        const riga = resto.slice(0, taglio)
        resto = resto.slice(taglio + 1)
        taglio = resto.indexOf('\n')
        if (accesso.risponde(presa, riga)) continue
        const richiesta = JSON.parse(riga)
        if (richiesta.method !== '$schema') chiamate.push(richiesta)
        const result = richiesta.method === '$schema'
          ? { nome: 'prova.eco', ingresso: schema }
          : { ok: true, dati: richiesta.params }
        const busta = `${JSON.stringify({ jsonrpc: '2.0', id: richiesta.id, result })}\n`
        if (chiudeDopoSchema) {
          presa.end(busta)
          return
        }
        presa.write(busta)
      }
    })
    presa.on('error', () => undefined)
  })
  await new Promise((risolvi) => server.listen(dove, risolvi))
  const lancia = lanciatore(radice)
  return {
    dove,
    ambiente,
    chiamate,
    chiudi: () => new Promise((risolvi) => server.close(() => risolvi())),
    eco: async (...argomenti) => {
      const esito = await lancia(['chiama', 'prova.eco', ...argomenti], ambiente)
      return { ...esito, dati: esito.codice === 0 ? JSON.parse(esito.uscita) : null }
    },
  }
}
