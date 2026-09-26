// Le notifiche del sistema operativo, sopra `Notification` di Electron.
// Su Windows servono un AppUserModelID (senza, la notifica non compare e non dà
// errore); la barra delle applicazioni lo legge alla nascita di ogni finestra,
// per questo si dichiara all'avvio. Il permesso non si chiede.

import { app, BrowserWindow, Notification } from 'electron'
import { execFile } from 'node:child_process'
import { copyFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { percorsoIcona } from './context.js'

/**
 * Uguale a `appId` di `electron-builder.json`: lo verifica `verificaIdentita()` in
 * `esbuild.mjs` con un'espressione regolare su questa riga, da tenere di questa forma.
 */
const IDENTITA = 'ch.nabre.regiclass'

/**
 * Identità propria del portabile, perché il suo pin non si confonda con quello
 * dell'installato. Stesso nome in `src/cli/disinstalla.mjs`, che la toglie.
 */
const IDENTITA_PORTABILE = `${IDENTITA}.portabile`

/** Identità propria di chi lancia da sorgenti (`electron.exe`), per non toccare l'installato. */
const IDENTITA_SVILUPPO = `${IDENTITA}.sviluppo`

/** L'identità di questo processo, secondo come è stato lanciato. */
function identitaDiQuestoProcesso (): string {
  if (process.env.PORTABLE_EXECUTABLE_FILE) return IDENTITA_PORTABILE
  return app.isPackaged ? IDENTITA : IDENTITA_SVILUPPO
}

/**
 * Dichiara l'identità Windows; va chiamata in cima a `shell/main.ts`, prima di ogni
 * finestra. Le altre chiamate sono una rete di sicurezza: dopo la prima non fa nulla.
 */
let dichiarata = false
export function dichiaraIdentita (): void {
  if (dichiarata || process.platform !== 'win32') return
  dichiarata = true

  // Solo diagnosi: senza identità niente notifiche, e l'icona della barra viene dalla finestra.
  if (process.env.REGISTRO_SENZA_IDENTITA === '1') {
    console.log('identità Windows: NON dichiarata (REGISTRO_SENZA_IDENTITA=1)')
    return
  }

  // Installato, nome e icona vengono dal collegamento dell'installer; portabile e
  // sorgenti non ne hanno e li registrano da sé.
  const identita = identitaDiQuestoProcesso()
  app.setAppUserModelId(identita)
  const eseguibile = process.env.PORTABLE_EXECUTABLE_FILE
  if (eseguibile) {
    appuntabileDalPortabile(eseguibile)
    const icona = iconaCheResta(app.getPath('userData'))
    if (icona) registraSenzaCollegamento(identita, app.getName(), icona)
  } else if (!app.isPackaged) {
    const icona = percorsoIcona()
    // testo-fisso: solo lanciando da sorgenti, e lo legge chi sviluppa
    if (icona) registraSenzaCollegamento(identita, `${app.getName()} (sviluppo)`, icona)
  }
}

/**
 * Fa puntare il pin del portabile all'`.exe` sulla chiavetta, non alla copia
 * estratta in `%TEMP%` che sparisce alla chiusura.
 */
function appuntabileDalPortabile (eseguibile: string): void {
  app.on('browser-window-created', (_evento, finestra) => {
    finestra.setAppDetails({
      appId: IDENTITA_PORTABILE,
      appIconPath: eseguibile,
      appIconIndex: 0,
      relaunchCommand: `"${eseguibile}"`,
      relaunchDisplayName: app.getName(),
    })
  })
}

/**
 * Copia l'icona del portabile nella cartella dei dati, perché Windows la rilegge
 * anche a programma chiuso e la copia in `%TEMP%` non c'è più.
 */
function iconaCheResta (cartella: string): string | null {
  const sorgente = percorsoIcona()
  if (!sorgente) return null
  const icona = join(cartella, 'icona-notifiche.png')
  try {
    if (statSync(icona, { throwIfNoEntry: false })?.size !== statSync(sorgente).size) {
      copyFileSync(sorgente, icona)
    }
    return icona
  } catch (male) {
    console.warn('Icona delle notifiche non copiata:', male instanceof Error ? male.message : String(male))
    return null
  }
}

/**
 * Registra nome e icona di un'identità senza collegamento, nella chiave
 * `HKCU\…\AppUserModelId`. Quella del portabile la toglie `src/cli/disinstalla.mjs`.
 */
function registraSenzaCollegamento (identita: string, nome: string, icona: string): void {
  const windows = process.env.SystemRoot
  if (!windows) return
  const chiave = `HKCU\\Software\\Classes\\AppUserModelId\\${identita}`
  const reg = join(windows, 'System32', 'reg.exe')
  for (const [voce, valore] of [['DisplayName', nome], ['IconUri', icona]] as const) {
    const argomenti = ['add', chiave, '/v', voce, '/t', 'REG_SZ', '/d', valore, '/f']
    execFile(reg, argomenti, { windowsHide: true }, (errore) => {
      if (errore) console.warn(`Identità ${identita}: ${voce} non scritto:`, errore.message)
    })
  }
}

/** Se il sistema può mostrare notifiche. */
export function notificheDisponibili (): boolean {
  return Notification.isSupported()
}

/**
 * Le notifiche ancora sullo schermo: tenute qui perché, raccolte dal garbage
 * collector, il loro clic andrebbe perso.
 */
const vive = new Set<Notification>()

/** Quante notifiche sono tenute in vita adesso. Per le prove. */
export function notificheVive (): number {
  return vive.size
}

interface Avviso {
  titolo: string
  corpo: string
  /** Che cosa fare quando la si preme. Senza, la notifica è solo da leggere. */
  al?: () => void
}

/**
 * Mostra un avviso con il suono di sistema e torna il modo di ritirarlo.
 * `urgency` conta solo su Linux, dove tiene la notifica sullo schermo.
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

  vive.add(notifica)
  const lascia = (): void => {
    vive.delete(notifica)
  }
  notifica.on('close', lascia)
  notifica.on('failed', lascia)
  notifica.on('click', lascia)
  if (avviso.al) notifica.on('click', avviso.al)
  notifica.show()

  return {
    chiudi: () => {
      lascia()
      notifica.close()
    },
  }
}

/** Se una finestra del registro ha il fuoco: allora non serve notificare. */
export function finestraDavanti (): boolean {
  return BrowserWindow.getFocusedWindow() !== null
}
