// Comando: regi guarda
// Solo moduli `node:`.

import { testi } from '../testi.mjs'

export async function comandoGuarda (condotto, grezzo, opzioni = {}) {
  const t = testi()
  const busta = await condotto.chiedi('$guarda', {})
  if (busta === null) return opzioni.muto()
  if (busta.error) {
    opzioni.raccontaGuasto(busta)
    return opzioni.USCITA_RIFIUTO
  }

  if (!grezzo) {
    opzioni.scriviErrore(t.giornaleInAscolto ?? 'In ascolto del giornale del registro...')
  }

  return new Promise((_risolvi) => {
    condotto.suNotifica((notifica) => {
      const voce = notifica.params ?? notifica
      if (grezzo) {
        opzioni.scriviDati(JSON.stringify(voce))
        return
      }
      const ora = new Date().toLocaleTimeString()
      const esito = voce.ok ? 'ok' : `ERRORE ${voce.codice ?? ''}`.trim()
      const origine = voce.origine ? ` (${voce.origine})` : ''
      const ms = voce.durataMs !== undefined ? ` ${voce.durataMs}ms` : ''
      const mod = voce.modifiche ? ` [${voce.modifiche} mod]` : ''
      opzioni.scriviDati(`[${ora}] ${voce.procedura ?? 'chiamata'}${origine} -> ${esito}${ms}${mod}`)
    })
  })
}
