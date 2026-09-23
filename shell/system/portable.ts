// La versione portabile tiene i suoi dati accanto all'eseguibile.
//
// Installato, il registro scrive in `%APPDATA%\Registro docenti`, e la
// disinstallazione quella cartella la toglie. Il portabile un disinstallatore
// non ce l'ha: si butta l'eseguibile e basta. Con i dati in `%APPDATA%`,
// buttarlo lascerebbe sul computer — magari quello dell'aula, dove la chiavetta
// è passata una volta sola — impostazioni, recenti, modelli scaricati e segreti
// di chi l'ha usato. Accanto all'eseguibile viaggiano con lui, e si tolgono
// con lui.
//
// Anche le cartelle temporanee: la scansione di una pagina e la voce della
// dettatura passano da `os.tmpdir()` (`data/mtmd.ts`, `data/whisper.ts`), che
// su Windows è `TEMP`. Si cancellano in un `finally`, ma un processo chiuso a
// forza le lascia indietro, e sul computer di qualcun altro non devono restare.
//
// È un modulo a sé, importato per primo da `main.ts`, perché va eseguito prima
// di tutto il resto: `requestSingleInstanceLock` mette il suo lucchetto in
// `userData`, e gli `import` di `main.ts` si valutano prima del suo corpo.
//
// `PORTABLE_EXECUTABLE_DIR` lo mette l'avviatore del portabile di
// electron-builder: è la cartella dell'eseguibile che il docente ha aperto, non
// quella temporanea in cui il programma è stato estratto e che sparisce a ogni
// chiusura.

import { app } from 'electron'
import { accessSync, constants, mkdirSync } from 'node:fs'
import { join } from 'node:path'

/** Il nome della cartella dei dati, accanto all'eseguibile portabile. */
const CARTELLA_DATI = 'Registro docenti - dati'

function spostaDatiAccantoAllEseguibile (cartellaEseguibile: string): void {
  const dati = join(cartellaEseguibile, CARTELLA_DATI)
  const temporanei = join(dati, 'temp')
  try {
    mkdirSync(temporanei, { recursive: true })
    accessSync(dati, constants.W_OK)
  } catch (male) {
    // Una chiavetta protetta in scrittura, un CD, una cartella di rete in sola
    // lettura: meglio i dati in `%APPDATA%` che un registro che non si apre.
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
  // Per `data/appData.ts`, che Electron non lo conosce e la cartella dei dati
  // se la ricalcola da sé: è lì che finiscono modelli e corredo della dettatura.
  process.env.REGISTRO_DATI = dati
}

const cartellaEseguibile = process.env.PORTABLE_EXECUTABLE_DIR
if (cartellaEseguibile) spostaDatiAccantoAllEseguibile(cartellaEseguibile)
