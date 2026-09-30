// Comando: regi aspetta
// Solo moduli `node:`.

import { testi } from '../texts.mjs'

export async function comandoAspetta (condotto, grezzo, opzioni = {}) {
  const t = testi()
  const busta = await condotto.chiedi('$versione', {})
  if (busta === null) return opzioni.muto()
  if (busta.error) {
    opzioni.raccontaGuasto(busta)
    return opzioni.USCITA_RIFIUTO
  }

  if (grezzo) {
    opzioni.scriviDati(JSON.stringify({ ok: true, pronto: true, versione: busta.result }, null, 2))
    return 0
  }

  opzioni.scriviDati(t.condottoPronto ?? t.risponde)
  return 0
}
