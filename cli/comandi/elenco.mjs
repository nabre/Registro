// Comando: regi elenco
// Solo moduli `node:`.

import { tabella } from '../tabella.mjs'
import { testi } from '../testi.mjs'

export async function comandoElenco (condotto, grezzo, opzioni = {}) {
  const t = testi()
  const busta = await condotto.chiedi('$elenco', {})
  if (busta === null) return opzioni.muto()
  if (busta.error) {
    opzioni.raccontaGuasto(busta)
    return opzioni.USCITA_RIFIUTO
  }
  if (grezzo) {
    opzioni.scriviDati(JSON.stringify(busta, null, 2))
    return 0
  }
  const righe = busta.result.map((p) => [
    p.nome,
    p.genere,
    p.idempotente ? t.sì : t.no,
    p.titolo,
  ])
  opzioni.scriviDati(tabella(t.colonneElenco, righe))
  return 0
}
