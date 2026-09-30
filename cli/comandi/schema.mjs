// Comando: regi schema <procedura>
// Solo moduli `node:`.

import { tabella } from '../table.mjs'
import { testi } from '../testi.mjs'

export async function comandoSchema (condotto, nome, grezzo, opzioni = {}) {
  const t = testi()
  const busta = await condotto.chiedi('$schema', { procedura: nome })
  if (busta === null) return opzioni.muto()
  if (busta.error) {
    opzioni.raccontaGuasto(busta)
    // Senza permesso di lettura anche l'elenco è negato: non suggerirlo.
    if (busta.error.data?.codice !== 'non-permesso') {
      opzioni.scriviErrore(t.elencoCompleto(opzioni.COMANDO))
    }
    return opzioni.USCITA_RIFIUTO
  }

  const ritratto = busta.result
  if (grezzo) {
    opzioni.scriviDati(
      JSON.stringify({ ingresso: ritratto.ingresso, uscita: ritratto.uscita }, null, 2),
    )
    return 0
  }

  opzioni.scriviDati(`${ritratto.nome} — ${ritratto.titolo}`)
  opzioni.scriviDati(`${ritratto.genere}${ritratto.idempotente ? t.idempotente : ''}`)
  opzioni.scriviDati('')

  const proprieta = ritratto.ingresso?.properties ?? {}
  const richiesti = ritratto.ingresso?.required ?? []
  const nomi = Object.keys(proprieta)
  if (nomi.length === 0) {
    opzioni.scriviDati(t.nonChiedeNiente)
    return 0
  }
  const righe = nomi.map((campo) => [
    richiesti.includes(campo) ? `${campo}*` : campo,
    ritratto.breve?.[campo] ?? proprieta[campo]?.type ?? t.qualunque,
    proprieta[campo]?.description ?? '',
  ])
  opzioni.scriviDati(tabella(t.colonneSchema, righe))
  opzioni.scriviDati('')
  opzioni.scriviDati(t.obbligatorio(opzioni.COMANDO, nome))
  return 0
}
