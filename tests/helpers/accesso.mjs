// Una presa sul condotto già presentata con `$accedi`: le prove che parlano il
// protocollo a mano cominciano da qui, così righe, code e buste che contano
// sono solo le loro.

import { randomBytes } from 'node:crypto'
import { createConnection } from 'node:net'
import * as percorso from 'node:path'

import { leggiChiave, prova } from '../../cli/access.mjs'

/** La chiave che il condotto di prova ha scritto nella sua cartella dei dati. */
export function chiaveDiProva (cartella = process.env.REGISTRO_USERDATA) {
  const chiave = leggiChiave(percorso.join(cartella, 'condotto.chiave'))
  if (!chiave) throw new Error(`nessuna condotto.chiave in ${cartella}`)
  return chiave
}

/** La riga di `$accedi` con una sfida data, per le prove che la vogliono vedere. */
export function rigaDiAccesso (sfida, { id = 'accesso', chiave = chiaveDiProva() } = {}) {
  const params = { sfida, prova: prova(chiave, 'cliente', sfida) }
  return `${JSON.stringify({ jsonrpc: '2.0', id, method: '$accedi', params })}\n`
}

/**
 * Apre una presa, si presenta e la consegna quando il condotto ha risposto con
 * la prova giusta. Il condotto non manda altro senza domanda: chi riceve la
 * presa attacca il suo ascoltatore di `data` prima del prossimo pacchetto.
 */
export function presaRiconosciuta (indirizzo, { chiave = chiaveDiProva() } = {}) {
  const sfida = randomBytes(32).toString('hex')
  return new Promise((risolvi, rifiuta) => {
    const presa = createConnection(indirizzo)
    let resto = ''
    const sveglia = setTimeout(() => finisci(new Error('il condotto non ha risposto a $accedi')), 10000)
    function finisci (male) {
      clearTimeout(sveglia)
      presa.off('data', leggi)
      presa.off('error', finisci)
      if (male) {
        presa.destroy()
        rifiuta(male)
      } else risolvi(presa)
    }
    function leggi (pezzo) {
      resto += pezzo.toString('utf8')
      const taglio = resto.indexOf('\n')
      if (taglio < 0) return
      const busta = JSON.parse(resto.slice(0, taglio))
      if (busta.result?.prova !== prova(chiave, 'condotto', sfida)) {
        finisci(new Error(`$accedi rifiutato: ${JSON.stringify(busta)}`))
        return
      }
      finisci()
    }
    presa.on('data', leggi)
    presa.on('error', finisci)
    presa.on('connect', () => presa.write(rigaDiAccesso(sfida, { chiave })))
  })
}
