// La finestra d'avvio: un riquadro che dice «sto arrivando» mentre il registro
// si accende.
//
// Fra il doppio clic e la prima finestra vera passano secondi — leggere il
// documento d'anno, i traslochi dei file vecchi, il pannello che si disegna —
// e senza niente sullo schermo quei secondi sembrano un clic andato a vuoto: è
// il momento in cui si clicca una seconda volta. Il riquadro nasce appena
// Electron è pronto, dice che cosa si sta facendo, e se ne va quando al suo
// posto compare una finestra vera — il registro o il benvenuto.
//
// Non ha gesti: niente da premere, niente da chiudere. Non è una finestra
// d'aspetto, è una risposta al clic.

import { app, BrowserWindow } from 'electron'

import { icona, percorsoPreload } from '../../src/environment/context.js'
import { escludiDaiDialoghi } from '../../src/environment/dialogs.js'
import { chiudiLeVieDiFuga } from '../../src/environment/navigation.js'
import { coloreSfondo, preferenzeComuni } from '../../src/environment/theme.js'
import { CANALE } from '../../src/environment/windows.js'

/**
 * Quanto si aspetta, al massimo, la finestra che deve prendere il posto del
 * riquadro. Se non arriva — un avvio silenzioso, con il solo vassoio — il
 * riquadro se ne va lo stesso: resterebbe lì a dire «sto arrivando» per
 * qualcosa che non arriverà.
 */
const ATTESA_MASSIMA_MS = 4000

let finestra: BrowserWindow | null = null

/** L'ultima fase annunciata: la pagina la chiede appena nasce. */
let fase = 'Avvio del registro…'

function viva (): BrowserWindow | null {
  return finestra && !finestra.isDestroyed() ? finestra : null
}

function annunciaA (aperta: BrowserWindow): void {
  aperta.webContents.send(CANALE, { avvio: 'fase', testo: fase, versione: app.getVersion() })
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
    // `frame: false` non ferma Alt+F4 né «Chiudi finestra» dalla barra delle
    // applicazioni: chiuso a mano durante un trasloco dei dati, il riquadro era
    // l'ultima finestra, e `window-all-closed` usciva a trasloco a metà. Lo
    // chiude solo `chiudiAvvio`, che distrugge e non chiede.
    closable: false,
    title: 'Registro docenti',
    show: false,
    backgroundColor: coloreSfondo(),
    ...icona(),
    webPreferences: {
      ...preferenzeComuni(),
      preload: percorsoPreload(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
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
 * Via il riquadro, ma quando al suo posto c'è qualcosa da guardare.
 *
 * Chiuderlo subito lascerebbe un buco: il pannello del registro nasce nascosto
 * e si mostra solo quando si è disegnato, e fra le due cose lo schermo
 * resterebbe vuoto. Peggio: per un istante non ci sarebbe nessuna finestra, e
 * `window-all-closed` in `main.ts` farebbe uscire l'applicazione. Si aspetta allora che un'altra finestra si
 * mostri — o che ce ne sia già una — e comunque non oltre `ATTESA_MASSIMA_MS`.
 */
export function chiudiAvvioQuandoAppare (): void {
  const riquadro = viva()
  if (!riquadro) return

  // Il suo posto lo prende una finestra con cui si lavora, non l'agenda sul
  // desktop: quella si mostra a metà avvio, senza fuoco, e contarla toglieva il
  // riquadro mentre il pannello era ancora nascosto — un vuoto fra i due. Le
  // finestre che non prendono il fuoco sono pezzi di scrivania.
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
  // Le finestre già nate ma ancora nascoste: il pannello può essere stato
  // creato prima di questa chiamata, e mostrarsi solo adesso.
  for (const altra of BrowserWindow.getAllWindows()) {
    if (prendeIlPosto(altra)) altra.once('show', chiudi)
  }
  const scadenza = setTimeout(chiudi, ATTESA_MASSIMA_MS)
}
