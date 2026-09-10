// Le notifiche del sistema operativo.
//
// Poche righe sopra `Notification` di Electron, ma due cose meritano di essere
// dette perché senza si perde un pomeriggio.
//
// **L'identità su Windows.** Windows non mostra le notifiche di un programma
// che non sa nominare: gli serve un *AppUserModelID*, e senza quello la
// notifica parte, non dà errore, e non compare. Nel pacchetto ce lo mette
// l'installer; lanciando da sorgenti no, e va dichiarato a mano — con lo stesso
// `appId` di `electron-builder.json`, o le due installazioni si contendono il
// posto nel centro notifiche.
//
// **Il permesso.** Non si chiede: `Notification.isSupported()` dice se il
// sistema le regge, e se l'utente le ha spente nelle impostazioni di Windows
// non c'è niente da fare né da segnalare — le ha spente apposta.

import { app, BrowserWindow, Notification } from 'electron'

import { percorsoIcona } from './contesto.js'

/**
 * Lo stesso di `electron-builder.json`.
 *
 * Scritto due volte, e non si può evitare: qui serve prima che esista un
 * pacchetto, là serve per costruirlo. Se un giorno divergono, le notifiche
 * lanciate da sorgenti e quelle dell'applicazione installata finiscono in due
 * voci diverse del centro notifiche di Windows — che è un guasto che si vede,
 * non uno che si nasconde.
 */
const IDENTITA = 'ch.edu.ti.cptt.registro-docenti'

/** Da chiamare una volta, all'avvio, prima di mostrare qualunque notifica. */
export function dichiaraIdentita (): void {
  if (process.platform === 'win32') app.setAppUserModelId(IDENTITA)
}

/** Se il sistema può mostrarle. Falso su una macchina senza centro notifiche. */
export function notificheDisponibili (): boolean {
  return Notification.isSupported()
}

export interface Avviso {
  titolo: string
  corpo: string
  /** Che cosa fare quando la si preme. Senza, la notifica è solo da leggere. */
  al?: () => void
}

/**
 * Mostra un avviso, e torna il modo di ritirarlo.
 *
 * `silent: false` lascia al sistema il suo suono: è una notifica che arriva
 * cinque minuti prima di entrare in classe, e il punto è accorgersene mentre si
 * sta guardando altro.
 *
 * `urgency` non conta su Windows ma non fa danno, e su Linux fa la differenza
 * fra una notifica che resta e una che scivola via in tre secondi.
 */
export function avvisa (avviso: Avviso): { chiudi: () => void } | null {
  if (!notificheDisponibili()) return null

  const icona = percorsoIcona()
  const notifica = new Notification({
    title: avviso.titolo,
    body: avviso.corpo,
    silent: false,
    urgency: 'normal',
    ...(icona ? { icon: icona } : {}),
  })

  if (avviso.al) notifica.on('click', avviso.al)
  notifica.show()

  return { chiudi: () => notifica.close() }
}

/**
 * Se una finestra del registro ha il fuoco adesso.
 *
 * Serve a stare zitti quando serve: chi sta guardando il registro non ha
 * bisogno che il sistema operativo gli dica quel che ha già sotto gli occhi.
 */
export function finestraDavanti (): boolean {
  return BrowserWindow.getFocusedWindow() !== null
}
