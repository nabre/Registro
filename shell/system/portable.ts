// La versione portabile tiene i suoi dati accanto all'eseguibile: non ha
// disinstallatore, e con i dati in `%APPDATA%` lascerebbe sul computer
// dell'aula impostazioni, modelli e segreti di chi l'ha usata.
//
// Anche i temporanei (`os.tmpdir()`, usato per esempio da `data/mtmd.ts`): un
// processo chiuso a forza li lascia indietro.
//
// Modulo a sé, importato per primo da `main.ts`: `requestSingleInstanceLock`
// mette il lucchetto in `userData`, e gli `import` si valutano prima del corpo.
//
// `PORTABLE_EXECUTABLE_DIR` (dall'avviatore di electron-builder) è la cartella
// dell'eseguibile aperto, non quella temporanea in cui è estratto.

import { app } from 'electron'
import { accessSync, constants, mkdirSync } from 'node:fs'
import { join } from 'node:path'

import { CARTELLA_PORTABILE_VECCHIA, traslocaDati } from '../../src/data/formerName.js'

/** Il nome della cartella dei dati, accanto all'eseguibile portabile. */
// testo-fisso: nome di una cartella su disco, che deve restare quello in ogni lingua
const CARTELLA_DATI = 'Regiclass - dati'

/**
 * La cartella dei dati accanto all'eseguibile, rinominata se ha ancora il nome
 * precedente (come fa `userData.ts` per l'installato). Va fatto prima del
 * `mkdirSync` sotto, che la nuova la crea vuota. Se la rinomina non riesce, per
 * questa sessione si lavora sulla vecchia.
 */
function cartellaDati (cartellaEseguibile: string): string {
  const nuova = join(cartellaEseguibile, CARTELLA_DATI)
  const vecchia = join(cartellaEseguibile, CARTELLA_PORTABILE_VECCHIA)
  const trasloco = traslocaDati(vecchia, nuova)
  if (trasloco.esito === 'fallita') {
    console.warn(`Dati del portabile non rinominati, resto su «${vecchia}»: ${trasloco.motivo}`)
    return vecchia
  }
  if (trasloco.esito === 'entrambe') {
    console.warn(`Ci sono «${vecchia}» e «${nuova}»: uso la seconda, la prima resta com'è.`)
  }
  return nuova
}

function spostaDatiAccantoAllEseguibile (cartellaEseguibile: string): void {
  const dati = cartellaDati(cartellaEseguibile)
  const temporanei = join(dati, 'temp')
  try {
    mkdirSync(temporanei, { recursive: true })
    accessSync(dati, constants.W_OK)
  } catch (male) {
    // Sola lettura (chiavetta protetta, cartella di rete): meglio `%APPDATA%`
    // che un registro che non si apre.
    console.warn(
      `Dati del portabile in «${dati}» non scrivibili, uso la cartella predefinita:`,
      male instanceof Error ? male.message : String(male),
    )
    return
  }

  app.setPath('userData', dati)
  // `sessionData` (cache e archivi di Chromium) e `crashDumps` seguono
  // `userData` solo se lo si cambia prima che Electron li abbia calcolati:
  // detti espliciti, non dipendono da quando questo modulo arriva.
  app.setPath('sessionData', dati)
  app.setPath('crashDumps', join(dati, 'Crashpad'))
  app.setPath('temp', temporanei)
  process.env.TEMP = temporanei
  process.env.TMP = temporanei
  // Per `data/appData.ts`, che ricalcola la cartella dei dati senza Electron
  // (modelli e corredo delle scansioni).
  process.env.REGISTRO_DATI = dati
}

const cartellaEseguibile = process.env.PORTABLE_EXECUTABLE_DIR
if (cartellaEseguibile) spostaDatiAccantoAllEseguibile(cartellaEseguibile)
