// Comando: regi guarda
// Solo moduli `node:`.

import { testi } from '../texts.mjs'

// Le stesse etichette di `LOCALI` in `core/i18n/languages.ts`: la riga di
// comando non importa il core, e l'ora va scritta come la scrive il registro.
const LOCALI = { it: 'it-CH', de: 'de-CH', fr: 'fr-CH', en: 'en-GB' }

/** L'etichetta per `Intl` della lingua in cui parla la riga di comando. */
function localeDi (t) {
  const lingua = Object.keys(LOCALI).find((l) => testi(l) === t) ?? 'it'
  return LOCALI[lingua]
}

export async function comandoGuarda (condotto, grezzo, opzioni = {}) {
  const t = testi()
  const locale = localeDi(t)
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
      const ora = new Date().toLocaleTimeString(locale)
      const esito = voce.ok ? 'ok' : `ERRORE ${voce.codice ?? ''}`.trim()
      const origine = voce.origine ? ` (${voce.origine})` : ''
      const ms = voce.durataMs !== undefined ? ` ${voce.durataMs}ms` : ''
      const mod = voce.modifiche ? ` [${voce.modifiche} mod]` : ''
      opzioni.scriviDati(`[${ora}] ${voce.procedura ?? 'chiamata'}${origine} -> ${esito}${ms}${mod}`)
    })
  })
}
