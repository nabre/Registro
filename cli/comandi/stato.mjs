// Comando: regi stato / regi catalogo
// Solo moduli `node:`.

import { indirizzo } from '../address.mjs'
import { testi } from '../texts.mjs'

export async function comandoStato (condotto, grezzo, opzioni = {}) {
  const t = testi()
  const busta = await condotto.chiedi('$versione', {})
  if (busta === null) return opzioni.muto()
  if (busta.error) {
    opzioni.raccontaGuasto(busta)
    return opzioni.USCITA_RIFIUTO
  }
  if (grezzo) {
    opzioni.scriviDati(JSON.stringify(busta, null, 2))
    return 0
  }
  const { api, applicazione, documento, permessi } = busta.result
  const voce = t.voceStato
  const larga = Math.max(...Object.values(voce).map((nome) => nome.length)) + 1
  const riga = (nome, valore) => opzioni.scriviDati(`  ${nome.padEnd(larga)}${valore}`)
  opzioni.scriviDati(t.risponde)
  riga(voce.contratto, api)
  riga(voce.applicazione, applicazione)
  riga(voce.anno, documento ?? t.nessunAnno)
  riga(voce.concesso, concessioni(permessi, t))
  riga(voce.condotto, indirizzo())
  return 0
}

function concessioni (permessi, t) {
  if (!permessi) return t.concedeTutto
  const voci = [permessi.lettura ? t.lettura : null, permessi.scrittura ? t.scrittura : null]
  const concesse = voci.filter((voce) => voce !== null)
  return concesse.length > 0 ? concesse.join(t.e) : t.niente
}

export async function comandoCatalogo (condotto, opzioni = {}) {
  const busta = await condotto.chiedi('$attrezzi', { comando: opzioni.COMANDO })
  if (busta === null) return opzioni.muto()
  if (busta.error) {
    opzioni.raccontaGuasto(busta)
    return opzioni.USCITA_RIFIUTO
  }
  const catalogo = busta.result
  const { assistente: _assistente, ...resto } = catalogo
  opzioni.scriviDati(JSON.stringify(resto, null, 2))
  return 0
}
