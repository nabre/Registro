// La finestra d'avvio: un riquadro senza gesti che dice che cosa si sta facendo
// nei secondi prima della prima finestra vera (registro o benvenuto), perché il
// clic non sembri andato a vuoto.

import { app, BrowserWindow } from 'electron'

import { icona } from '../../src/environment/context.js'
import { escludiDaiDialoghi } from '../../src/environment/dialogs.js'
import { chiudiLeVieDiFuga } from '../../src/environment/navigation.js'
import { coloreSfondo, preferenzeConPonte } from '../../src/environment/theme.js'
import { CANALE } from '../../src/environment/channels.js'
import { testi } from './splash.testi.js'

/** Quanto si aspetta al massimo la finestra che prende il posto del riquadro. */
const ATTESA_MASSIMA_MS = 4000

let finestra: BrowserWindow | null = null

/**
 * L'ultima fase annunciata, che la pagina chiede appena nasce. `null` vale la
 * partenza, letta dal catalogo al momento (non a livello di modulo).
 */
let fase: string | null = null

function viva (): BrowserWindow | null {
  return finestra && !finestra.isDestroyed() ? finestra : null
}

function annunciaA (aperta: BrowserWindow): void {
  aperta.webContents.send(CANALE, { avvio: 'fase', testo: fase ?? testi().avvio, versione: app.getVersion() })
}

/** Accende il riquadro. Chiamarla due volte non ne fa due. */
export function mostraAvvio (): void {
  if (viva()) return
  const nata = new BrowserWindow({
    width: 380,
    height: 200,
    center: true,
    frame: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    // Alt+F4 lo chiuderebbe da ultima finestra, e `window-all-closed` uscirebbe
    // a metà avvio. Lo chiude solo `chiudiAvvio`, che distrugge.
    closable: false,
    // testo-fisso: il marchio non si traduce
    title: 'Regiclass',
    show: false,
    backgroundColor: coloreSfondo(),
    ...icona(),
    webPreferences: preferenzeConPonte(),
  })
  finestra = nata
  chiudiLeVieDiFuga(nata)
  escludiDaiDialoghi(nata)

  nata.once('ready-to-show', () => {
    if (!nata.isDestroyed()) nata.show()
  })
  nata.webContents.on('did-finish-load', () => {
    if (!nata.isDestroyed()) annunciaA(nata)
  })
  nata.on('closed', () => {
    if (finestra === nata) finestra = null
  })

  void nata.loadURL('registro://app/dist/splash.html')
}

/** Che cosa si sta facendo adesso: «Apro l'anno 2026-2027…». */
export function annunciaAvvio (testo: string): void {
  fase = testo
  const aperta = viva()
  if (aperta && !aperta.webContents.isLoading()) annunciaA(aperta)
}

/** Via il riquadro, subito: prima di un messaggio d'errore, che non deve avere un «sto arrivando» dietro. */
export function chiudiAvvio (): void {
  viva()?.destroy()
  finestra = null
}

/**
 * Via il riquadro quando un'altra finestra si mostra, o c'è già, e comunque
 * dopo `ATTESA_MASSIMA_MS`. Subito lascerebbe lo schermo vuoto e zero finestre
 * (`window-all-closed` in `main.ts` uscirebbe).
 */
export function chiudiAvvioQuandoAppare (): void {
  const riquadro = viva()
  if (!riquadro) return

  // Solo una finestra che prende il fuoco: le altre non sono quella attesa.
  const prendeIlPosto = (altra: BrowserWindow): boolean =>
    altra !== riquadro && !altra.isDestroyed() && altra.isFocusable()
  const altraVisibile = (): boolean =>
    BrowserWindow.getAllWindows().some((altra) => prendeIlPosto(altra) && altra.isVisible())
  if (altraVisibile()) {
    chiudiAvvio()
    return
  }

  const chiudi = (): void => {
    app.off('browser-window-created', allaNascita)
    clearTimeout(scadenza)
    if (viva() === riquadro) chiudiAvvio()
  }
  const allaNascita = (_evento: unknown, nata: BrowserWindow): void => {
    nata.once('show', () => {
      if (prendeIlPosto(nata)) chiudi()
    })
  }
  app.on('browser-window-created', allaNascita)
  // Anche le finestre già nate e ancora nascoste, come il pannello.
  for (const altra of BrowserWindow.getAllWindows()) {
    if (prendeIlPosto(altra)) altra.once('show', chiudi)
  }
  const scadenza = setTimeout(chiudi, ATTESA_MASSIMA_MS)
}
