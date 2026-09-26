// Porta la cartella dei dati dal nome precedente («Registro docenti») a quello
// di `userData` (Regiclass), con `traslocaDati` di `src/data/formerName.ts`:
//
// - rinomina riuscita, o niente da rinominare: si va avanti sulla nuova;
// - rinomina fallita (un file là dentro aperto): per questa sessione si lavora
//   sulla vecchia, e si riprova al prossimo avvio;
// - tutte e due presenti: vale la nuova, la vecchia non si tocca.
//
// Importato in cima a `main.ts`, dopo `portable.ts` e prima di
// `requestSingleInstanceLock`, che mette il lucchetto dentro `userData`. Il
// portabile trasloca la sua cartella da sé.

import { app } from 'electron'
import { basename, dirname, join, resolve } from 'node:path'

import { NOME_VECCHIO, traslocaDati } from '../../src/data/formerName.js'

function stessoPosto (uno: string, altro: string): boolean {
  const a = resolve(uno)
  const b = resolve(altro)
  return process.platform === 'linux' ? a === b : a.toLowerCase() === b.toLowerCase()
}

/**
 * Lavora sulla cartella vecchia per questa sessione. `sessionData` e
 * `crashDumps` detti espliciti come in `portable.ts`; `REGISTRO_DATI` per
 * `src/data/appData.ts`, che altrimenti la ricalcolerebbe col nome nuovo.
 */
function restaSullaVecchia (vecchia: string): void {
  app.setPath('userData', vecchia)
  app.setPath('sessionData', vecchia)
  app.setPath('crashDumps', join(vecchia, 'Crashpad'))
  process.env.REGISTRO_DATI = vecchia
}

function traslocaLaCartellaDeiDati (): void {
  // Il portabile ha già scelto la sua.
  if (process.env.REGISTRO_DATI) return
  const nuova = app.getPath('userData')
  const cartellaDelSistema = app.getPath('appData')
  // Solo la cartella predefinita: in una scelta a mano (prove,
  // `--user-data-dir`) i dati veri non vanno traslocati.
  if (!stessoPosto(dirname(nuova), cartellaDelSistema) || basename(nuova) !== app.getName()) return

  const vecchia = join(cartellaDelSistema, NOME_VECCHIO)
  if (stessoPosto(vecchia, nuova)) return
  const trasloco = traslocaDati(vecchia, nuova)
  switch (trasloco.esito) {
    case 'traslocata':
      console.info(
        `Dati portati da «${vecchia}» a «${nuova}»` +
        (trasloco.riscritti.length > 0 ? `; riscritti: ${trasloco.riscritti.join(', ')}` : ''),
      )
      break
    case 'fallita':
      console.warn(`Dati non rinominati, resto su «${vecchia}» per questa volta: ${trasloco.motivo}`)
      restaSullaVecchia(vecchia)
      break
    case 'entrambe':
      console.warn(`Ci sono «${vecchia}» e «${nuova}»: uso la seconda, la prima resta com'è.`)
      break
    case 'niente':
      break
  }
}

traslocaLaCartellaDeiDati()
