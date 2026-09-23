// Chiaro o scuro, per tutta l'applicazione, da un punto solo.
//
// L'impostazione è `registroDocenti.aspetto.tema` e vale tre cose: `sistema`,
// `chiaro`, `scuro`. Quel che si fa con lei è una riga: si scrive
// `nativeTheme.themeSource`, ed Electron da lì fa rispondere
// `prefers-color-scheme` in *ogni* finestra — il registro, lo schermo della
// classe, le impostazioni, i dialoghi.
//
// È la ragione per cui nessuna pagina riceve un messaggio «adesso è scuro» e
// nessuna deve ricordarselo: il tema non è uno stato dell'applicazione che le
// pagine copiano, è una proprietà del motore. Un ricaricamento non lo perde,
// una finestra aperta dopo lo trova già giusto, e non c'è un momento in cui una
// finestra è chiara e l'altra scura.
//
// Qui dentro restano le cose che il CSS non può fare da sé: il colore con cui
// Electron dipinge una finestra *prima* che la pagina esista, i colori della
// fascia in cui il sistema disegna i tre pulsanti di finestra — quella non la
// legge nessun foglio di stile — il riascolto dell'impostazione quando cambia,
// e la dimensione del testo che il sistema chiede (vedi `dimensioneTesto()`).

import { BrowserWindow, nativeTheme } from 'electron'
import { execFileSync } from 'node:child_process'

import { Smaltitore } from './events.js'
import { getConfiguration, onDidChangeConfiguration } from './settings.js'
import { diSistema } from './system.js'
import { limita } from '../domain/calculations.js'

const CHIAVE = 'registroDocenti.aspetto.tema'

/**
 * I due colori di fondo, ricopiati da `src/ui/styles/theme.css` — `--sfondo`
 * nelle sue due tavolozze.
 *
 * È l'unica duplicazione del tema, ed è inevitabile: questo colore serve al
 * main process quando la pagina non c'è ancora, e il main process non ha modo
 * di leggere un foglio di stile. Se un giorno `--sfondo` cambia, cambia anche
 * qui — e sbagliarlo non rompe niente, si vede: la finestra lampeggia del
 * colore vecchio per un istante prima di disegnarsi.
 */
const SFONDO_CHIARO = '#fbfbfc'
const SFONDO_SCURO = '#15181d'

/**
 * I colori della fascia dei pulsanti di finestra, ricopiati dallo stesso
 * foglio e per la stessa ragione dei due qui sopra: `--sfondo-alto` e
 * `--testo-quieto`.
 *
 * Su Windows e Linux i tre pulsanti li disegna il sistema sopra la nostra
 * barra, e il sistema non legge il CSS: gli si dice di che colore è il fondo
 * su cui si appoggiano, o restano bianchi su una barra scura.
 */
const BARRA_CHIARA = { fondo: '#f2f3f6', segni: '#5c6473' }
const BARRA_SCURA = { fondo: '#1c2027', segni: '#98a1b0' }

/**
 * Quanto è alta la barra del titolo che disegna il registro.
 *
 * Lo stesso numero sta in `src/ui/styles/title-bar.css`, e non c'è modo di
 * scriverlo una volta sola: l'altezza della fascia di sistema si dichiara qui,
 * in pixel, prima che la pagina esista. Sbagliarlo si vede — i pulsanti non
 * stanno in mezzo alla barra.
 */
export const ALTEZZA_BARRA_TITOLO = 40

/** Se in questo momento l'applicazione è scura. */
export function scuro (): boolean {
  return nativeTheme.shouldUseDarkColors
}

/**
 * Il colore con cui Electron dipinge la finestra prima che la pagina arrivi.
 *
 * Senza, una finestra nasce bianca: su un tema scuro è un lampo in faccia, e
 * davanti a una classe la proiezione si apre con un flash bianco sul muro.
 */
export function coloreSfondo (): string {
  return scuro() ? SFONDO_SCURO : SFONDO_CHIARO
}

/**
 * Le finestre che si disegnano la barra del titolo da sé.
 *
 * Serve a `osservaTema`: `setTitleBarOverlay` su una finestra che l'overlay
 * non ce l'ha alza un'eccezione, e girare il tema non deve poter buttare giù
 * il main process. Chi nasce con la fascia si annuncia qui, e il `WeakSet` si
 * svuota da sé quando la finestra se ne va.
 */
const conFascia = new WeakSet<BrowserWindow>()

/** La fascia di sistema, nei colori di adesso. Per `windows.ts` e per il cambio tema. */
export function fasciaDelTema (): { color: string, symbolColor: string, height: number } {
  const colori = scuro() ? BARRA_SCURA : BARRA_CHIARA
  return { color: colori.fondo, symbolColor: colori.segni, height: ALTEZZA_BARRA_TITOLO }
}

/** Dice che questa finestra ha la fascia: da chiamare appena l'ha. */
export function ricordaFascia (finestra: BrowserWindow): void {
  conFascia.add(finestra)
}

/** L'impostazione, ridotta a quel che Electron capisce. */
function sorgente (): 'system' | 'light' | 'dark' {
  const scelta = getConfiguration().get<string>(CHIAVE, 'sistema')
  if (scelta === 'chiaro') return 'light'
  if (scelta === 'scuro') return 'dark'
  return 'system'
}

/**
 * Applica l'impostazione. Da chiamare all'avvio, prima di aprire qualunque
 * finestra: dopo funziona lo stesso, ma la prima finestra sarebbe nata con il
 * fondo dell'altro tema.
 */
export function applicaTema (): void {
  nativeTheme.themeSource = sorgente()
}

/**
 * Tiene l'applicazione al passo: l'impostazione che cambia, e le finestre già
 * aperte quando il tema gira.
 *
 * Il `backgroundColor` non è una cosa che si mette una volta: è quel che si
 * vede mentre una finestra si ridimensiona, e girando da chiaro a scuro con le
 * finestre già aperte resterebbe quello di prima. Le pagine si rifanno da sole
 * — è CSS, e `prefers-color-scheme` cambia sotto di loro — questo no.
 */
export function osservaTema (): Smaltitore {
  const alCambio = (): void => {
    const colore = coloreSfondo()
    const fascia = fasciaDelTema()
    for (const finestra of BrowserWindow.getAllWindows()) {
      if (finestra.isDestroyed()) continue
      finestra.setBackgroundColor(colore)
      // I tre pulsanti di sistema, che il CSS non raggiunge: restano del
      // colore con cui sono nati finché non glielo si ridice. Solo alle
      // finestre che ce l'hanno — vedi `conFascia`.
      if (conFascia.has(finestra)) finestra.setTitleBarOverlay(fascia)
    }
  }
  nativeTheme.on('updated', alCambio)

  // La finestra delle impostazioni scrive con `update`, che fa scattare questo:
  // la spunta si muove e il registro dietro cambia colore nello stesso istante,
  // senza riavviare e senza che le impostazioni sappiano che esiste un registro.
  const iscrizione = onDidChangeConfiguration((evento) => {
    if (evento.affectsConfiguration(CHIAVE)) applicaTema()
  })

  return new Smaltitore(() => {
    nativeTheme.off('updated', alCambio)
    iscrizione.dispose()
  })
}

// ------------------------------------------------------- la dimensione del testo

/**
 * Quanto è grande il testo dell'interfaccia, in pixel, per la radice del
 * documento.
 *
 * Sono due impostazioni di Windows, non una, e fanno cose diverse:
 *
 *   **Scala** (100%, 125%, 150%…) ingrandisce *tutto*, ed è già a posto: la
 *   gestisce Chromium con il fattore di scala dello schermo, e nel CSS non se ne
 *   vede traccia perché un pixel resta un pixel.
 *
 *   **Dimensione testo** (Accessibilità → Dimensione testo, da 100% a 225%)
 *   ingrandisce *solo il testo*, e questa Chromium non la guarda affatto. Chi la
 *   alza lo fa perché altrimenti non legge, e un'applicazione che la ignora è
 *   un'applicazione che quella persona non può usare.
 *
 * La si legge dal registro di sistema, che è dove il cursore di Windows scrive,
 * e la si consegna a Chromium come `defaultFontSize`. Da lì in poi fa tutto il
 * CSS: `--corpo` è in `rem`, e `rem` misura proprio la dimensione predefinita
 * del documento. Il resto del registro sta dietro a `--corpo` in `em`, e cresce
 * con lui senza che nessuna regola sappia che cosa sia successo.
 *
 * Gli spazi restano in pixel, ed è voluto: «dimensione testo» ingrandisce il
 * testo, non i margini — è quel che fa Windows con le proprie finestre, e i
 * riquadri si allargano da sé perché è il testo dentro a spingerli.
 */
const BASE = 16

/** Il valore letto una volta sola: cambiarlo in Windows chiede di riavviare. */
let dimensione: number | null = null

export function dimensioneTesto (): number {
  if (dimensione !== null) return dimensione
  dimensione = Math.round((BASE * fattoreDiSistema()) / 100)
  return dimensione
}

/**
 * Il fattore in centesimi, 100 se non si riesce a saperlo.
 *
 * Su Windows sta in `HKCU\Software\Microsoft\Accessibility\TextScaleFactor`,
 * e non c'è finché non lo si tocca: assente vuol dire 100, non «guasto». Si
 * legge con `reg query` invece che con una libreria perché è una riga sola letta
 * una volta all'avvio, e una dipendenza nativa per questo si porterebbe dietro
 * una compilazione per architettura.
 *
 * Fuori da Windows non c'è niente di equivalente da leggere: macOS e le
 * scrivanie Linux ingrandiscono l'interfaccia intera, e quello Chromium lo fa
 * già da sé.
 */
function fattoreDiSistema (): number {
  if (process.platform !== 'win32') return 100
  try {
    // Per percorso intero: vedi `system.ts` per il `reg.exe` della cartella condivisa.
    const uscita = execFileSync(
      diSistema('reg.exe'),
      ['query', 'HKCU\\Software\\Microsoft\\Accessibility', '/v', 'TextScaleFactor'],
      { encoding: 'utf8', windowsHide: true, timeout: 2000 },
    )
    const trovato = /TextScaleFactor\s+REG_DWORD\s+0x([0-9a-f]+)/i.exec(uscita)
    if (!trovato) return 100
    const letto = Number.parseInt(trovato[1], 16)
    // Windows arriva a 225. Si tiene la briglia comunque: un valore scritto a
    // mano fuori scala renderebbe l'applicazione inutilizzabile invece che
    // grande.
    return Number.isFinite(letto) ? limita(letto, 100, 300) : 100
  } catch {
    // La chiave non c'è (è il caso normale: nessuno l'ha mai toccata), oppure
    // `reg` non risponde. In tutti e due i casi la risposta giusta è «normale».
    return 100
  }
}

/**
 * Le preferenze che ogni finestra dell'applicazione condivide.
 *
 * Sta qui e non ripetuto in tre posti perché una finestra che se ne dimenticasse
 * avrebbe il testo di una misura diversa dalle altre — e sarebbe proprio la
 * finestra del dialogo, cioè quella che si apre sopra le altre.
 */
export function preferenzeComuni (): { defaultFontSize: number } {
  return { defaultFontSize: dimensioneTesto() }
}
