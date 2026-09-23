// Il widget sul desktop, dal lato di Windows: le chiamate che Electron non ha.
//
// Un widget, per essere davvero *sul* desktop e non una finestrella che
// galleggia sopra, deve fare tre cose che una `BrowserWindow` da sola non sa
// fare: stare sotto le applicazioni invece che davanti, non sparire quando si
// preme «Mostra desktop», e — se lo si vuole agganciato a un bordo — spostare
// le icone del desktop invece di coprirle.
//
// ## I due modi di stare sul desktop
//
// **Agganciato** (`StrisciaAncorata`): il widget si registra presso la shell
// come *appbar*, che è il meccanismo con cui la barra delle applicazioni si
// riserva il proprio bordo dello schermo. La fetta che si riserva esce
// dall'area di lavoro, e l'area di lavoro è proprio ciò dentro cui Windows
// dispone le icone e massimizza le finestre: le icone si spostano da sole, e
// una finestra massimizzata si ferma al bordo del widget. In cambio sta su un
// bordo e non altrove — un'area di lavoro è un rettangolo, e un buco in mezzo
// non si può descrivere.
//
// **Libero** (`WidgetLibero`): sta dove lo si trascina, come un appunto
// appoggiato sulla scrivania. Non riserva niente e quindi non sposta le icone.
//
// ## Perché koffi
//
// `SHAppBarMessage` e `SetWindowPos` non hanno un equivalente in Electron, e non
// l'avranno: sono chiamate di Windows e basta. koffi le raggiunge senza
// compilare niente — binari già pronti, N-API — ed è l'unica dipendenza nativa
// del registro. Dove non c'è (Windows a parte, o un'installazione monca)
// `ancoraggioDisponibile()` torna falso e il widget non si accende: il registro
// continua a funzionare, e chi lo usa vede una spiegazione invece di un errore.
//
// ## Pixel veri e pixel di Electron
//
// Windows parla in pixel fisici; Electron parla in pixel scalati (DIP). Su uno
// schermo al 150% sono due numeri diversi per lo stesso bordo, e confonderli
// vuol dire un widget largo due terzi di quel che si è chiesto. Tutti i conti
// qui dentro stanno in pixel fisici — che è anche l'unità in cui Windows
// dichiara la spaziatura delle icone — e la conversione sta tutta in
// `environment/agenda.ts`, che è l'unico a parlare con la pagina.

import { BrowserWindow, screen } from 'electron'
import { createRequire } from 'node:module'
import { limita } from '../domain/calculations.js'

/** Il bordo a cui si aggancia: destro. Gli altri tre esistono, ma vedi sotto. */
const ABE_RIGHT = 2

const ABM_NEW = 0x00000000
const ABM_REMOVE = 0x00000001
const ABM_QUERYPOS = 0x00000002
const ABM_SETPOS = 0x00000003
const ABM_WINDOWPOSCHANGED = 0x00000009

/** Il messaggio che la shell rimanda alla striscia. `WM_USER + 1`. */
const MESSAGGIO_ANCORAGGIO = 0x0400 + 1

/** Le notifiche che arrivano su quel messaggio, in `wParam`. */
const ABN_POSCHANGED = 0x0000001
const ABN_FULLSCREENAPP = 0x0000002

/**
 * `SetWindowPos`: sposta, ridimensiona, e — soprattutto — mette in fondo.
 *
 * `HWND_BOTTOM` è il punto: la striscia è un pezzo di scrivania, e una
 * scrivania sta sotto le cose che ci si appoggiano sopra. Senza, basta un clic
 * sul widget per averlo davanti alla finestra su cui si stava lavorando.
 */
const HWND_BOTTOM = 1n
const SWP_NOSIZE = 0x0001
const SWP_NOMOVE = 0x0002
const SWP_NOZORDER = 0x0004
const SWP_NOACTIVATE = 0x0010

/** La spaziatura della griglia delle icone, in pixel fisici. */
const SPI_ICONHORIZONTALSPACING = 0x000d
const SPI_ICONVERTICALSPACING = 0x0018

export interface Rettangolo {
  left: number
  top: number
  right: number
  bottom: number
}

interface CellaIcone {
  larghezza: number
  altezza: number
}

interface Win32 {
  appBar (messaggio: number, dati: Dati): bigint
  spaziatura (quale: number): number
  /** Sposta la finestra in pixel fisici, senza passare da Electron. Vedi `posiziona`. */
  muovi (hWnd: bigint, rc: Rettangolo): boolean
  /** La rimanda in fondo all'ordine, senza toccarne posizione né misura. */
  inFondo (hWnd: bigint): boolean
  /** Dov'è adesso, in pixel fisici: serve alla guardia che la rimette a posto. */
  dovE (hWnd: bigint): Rettangolo
  /** La finestra del desktop — quella dello sfondo e delle icone — se c'è. */
  desktop (): bigint
  /** Mette la finestra subito sopra un'altra nell'ordine Z. Vedi `ordina`. */
  sopra (hWnd: bigint, altra: bigint): boolean
}

interface Dati {
  cbSize: number
  hWnd: bigint
  uCallbackMessage: number
  uEdge: number
  rc: Rettangolo
  lParam: bigint
}

let win32: Win32 | null | undefined

/**
 * Le funzioni di Windows, caricate una volta sola e mai più.
 *
 * `undefined` vuol dire «non ancora provato», `null` vuol dire «provato e non
 * c'è»: la differenza serve a non ritentare il caricamento a ogni chiamata su
 * una macchina dove non funzionerà mai.
 */
function carica (): Win32 | null {
  if (win32 !== undefined) return win32
  win32 = null
  if (process.platform !== 'win32') return win32

  try {
    // `__filename` e non `import.meta.url`: questo file finisce nel bundle
    // CommonJS del main process, dove `import.meta` non esiste.
    const richiedi = createRequire(__filename)
    const koffi = richiedi('koffi')

    const RECT = koffi.struct('RECT', {
      left: 'int32',
      top: 'int32',
      right: 'int32',
      bottom: 'int32',
    })
    // `hWnd` come intero a 64 bit e non come puntatore: il maniglione di
    // finestra che Electron consegna è un `Buffer` di otto byte, e farlo
    // viaggiare come numero evita di costruire un puntatore finto. Vale finché
    // l'applicazione è a 64 bit, che è l'unica forma in cui viene impacchettata.
    koffi.struct('APPBARDATA', {
      cbSize: 'uint32',
      hWnd: 'uint64',
      uCallbackMessage: 'uint32',
      uEdge: 'uint32',
      rc: RECT,
      lParam: 'int64',
    })

    const shell32 = koffi.load('shell32.dll')
    const user32 = koffi.load('user32.dll')
    const SHAppBarMessage = shell32.func(
      'uint64 __stdcall SHAppBarMessage(uint32 dwMessage, _Inout_ APPBARDATA *pData)',
    )
    const SystemParametersInfoW = user32.func(
      'bool __stdcall SystemParametersInfoW(uint32 uiAction, uint32 uiParam, _Out_ int *pvParam, uint32 fWinIni)',
    )
    const SetWindowPos = user32.func(
      'bool __stdcall SetWindowPos(uint64 hWnd, uint64 hWndInsertAfter, int X, int Y, int cx, int cy, uint32 uFlags)',
    )
    const GetWindowRect = user32.func('bool __stdcall GetWindowRect(uint64 hWnd, _Out_ RECT *lpRect)')
    const FindWindowW = user32.func('uint64 __stdcall FindWindowW(str16 lpClassName, str16 lpWindowName)')

    win32 = {
      appBar: (messaggio, dati) => SHAppBarMessage(messaggio, dati) as bigint,
      spaziatura: (quale) => {
        const esito = [0]
        return SystemParametersInfoW(quale, 0, esito, 0) ? esito[0] : 0
      },
      dovE: (hWnd) => {
        const rc: Rettangolo = { left: 0, top: 0, right: 0, bottom: 0 }
        GetWindowRect(hWnd, rc)
        return rc
      },
      muovi: (hWnd, rc) =>
        SetWindowPos(
          hWnd,
          0n,
          rc.left,
          rc.top,
          rc.right - rc.left,
          rc.bottom - rc.top,
          SWP_NOZORDER | SWP_NOACTIVATE,
        ) as boolean,
      inFondo: (hWnd) =>
        SetWindowPos(hWnd, HWND_BOTTOM, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE) as boolean,
      desktop: () => FindWindowW('Progman', null) as bigint,
      sopra: (hWnd, altra) =>
        SetWindowPos(hWnd, altra, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE) as boolean,
    }
  } catch (errore) {
    // Non è un guasto: è una macchina su cui il widget non si può fare. Lo si
    // dice una volta, e chi guarda i log capisce perché la voce di menu non
    // risponde.
    console.log('ancoraggio: le chiamate di Windows non sono disponibili —', String(errore))
    win32 = null
  }
  return win32
}

/** Se su questa macchina una striscia agganciata si può fare. */
export function ancoraggioDisponibile (): boolean {
  return carica() !== null
}

/**
 * Quanto è larga e alta una cella della griglia delle icone, in pixel fisici.
 *
 * È la misura su cui il desktop dispone le icone, e quindi l'unica su cui una
 * striscia può ridimensionarsi senza lasciare mezze colonne vuote. Windows la
 * dichiara per lo schermo principale e non per monitor: sugli schermi misti è
 * un'approssimazione, ed è quella che usa anche il desktop.
 */
export function cellaIcone (): CellaIcone {
  const api = carica()
  // Settantacinque è quel che Windows dichiara su uno schermo a 96 punti per
  // pollice senza spaziatura aumentata: è il ripiego di chi non ha potuto
  // chiedere, non un valore inventato.
  if (!api) return { larghezza: 75, altezza: 75 }
  return {
    larghezza: api.spaziatura(SPI_ICONHORIZONTALSPACING) || 75,
    altezza: api.spaziatura(SPI_ICONVERTICALSPACING) || 75,
  }
}

/** Il maniglione della finestra, come intero: vedi il commento su `hWnd`. */
function maniglione (finestra: BrowserWindow): bigint {
  const buffer = finestra.getNativeWindowHandle()
  return buffer.length >= 8 ? buffer.readBigUInt64LE(0) : BigInt(buffer.readUInt32LE(0))
}

function dati (hWnd: bigint, rc: Rettangolo = { left: 0, top: 0, right: 0, bottom: 0 }): Dati {
  return {
    // Quarantotto byte su x64: quattro di `cbSize`, otto di maniglione, otto
    // fra i due `UINT`, sedici di rettangolo, otto di `lParam`.
    cbSize: 48,
    hWnd,
    uCallbackMessage: MESSAGGIO_ANCORAGGIO,
    uEdge: ABE_RIGHT,
    rc,
    lParam: 0n,
  }
}

/**
 * Lo schermo su cui il widget vive: il principale.
 *
 * Non è una semplificazione provvisoria. Le icone del desktop stanno sullo
 * schermo principale, e un widget sul secondo monitor non sarebbe più appoggiato
 * a una scrivania ma appeso al proiettore — che è esattamente lo schermo su cui
 * il registro proietta per la classe.
 */
function schermoDelDesktop (): Electron.Display {
  return screen.getPrimaryDisplay()
}

/** I confini dello schermo in pixel fisici, che è l'unità di tutto questo file. */
export function confiniFisici (): Rettangolo {
  const display = schermoDelDesktop()
  const fisico = screen.dipToScreenRect(null, display.bounds)
  return {
    left: fisico.x,
    top: fisico.y,
    right: fisico.x + fisico.width,
    bottom: fisico.y + fisico.height,
  }
}

/**
 * Una finestra che sta sul desktop invece che sopra il desktop.
 *
 * Sotto ci sono due modi di starci — agganciata a un bordo o libera dove la si
 * è messa — e questa classe è quel che hanno in comune, che è quasi tutto:
 * restare in fondo all'ordine, restare dove la si è messa, e non sparire quando
 * si preme «Mostra desktop».
 *
 * ## Perché la posizione va difesa
 *
 * Perché nessuno dei due la vuole dov'è. Electron riporta dentro l'area di
 * lavoro le finestre che ne escono, e una striscia agganciata ci sta fuori per
 * mestiere; Windows alza una finestra quando la si attiva, e un widget che
 * salta davanti al documento su cui si sta scrivendo è peggio di non averlo.
 * Da qui i tre presidi: la guardia sugli eventi, il rientro dopo ogni
 * spostamento nostro, e la sentinella che controlla una volta al secondo —
 * perché lo spostamento altrui arriva anche *durante* il nostro, e allora la
 * guardia lo scarta per non richiamarsi da sé.
 */
abstract class FinestraDiScrivania {
  protected readonly finestra: BrowserWindow
  protected readonly hWnd: bigint

  /** Dove deve stare, in pixel fisici. Lo decide `rettangoloVoluto`. */
  #bersaglio: Rettangolo | null = null
  /** Ci si sta già rimettendo: il nostro spostamento non richiama la guardia. */
  #inRientro = false
  #guardia: (() => void) | null = null
  /**
   * L'ascoltatore di `minimize`, tenuto da parte per poterlo togliere.
   *
   * Era anonimo, e `ferma()` non poteva staccarlo: a ogni ciclo di
   * accensione e spegnimento se ne aggiungeva uno, e il widget si rialzava
   * anche dopo essere stato spento.
   */
  #alMinimizza: (() => void) | null = null
  #sentinella: ReturnType<typeof setInterval> | null = null
  #viva = false

  constructor (finestra: BrowserWindow) {
    this.finestra = finestra
    this.hWnd = maniglione(finestra)
  }

  get disponibile (): boolean {
    return carica() !== null
  }

  get attiva (): boolean {
    return this.#viva
  }

  /** Dove la finestra deve stare adesso, in pixel fisici. */
  protected abstract rettangoloVoluto (): Rettangolo | null

  /** Che cosa fare la prima volta: registrarsi presso la shell, o niente. */
  protected attacca (): boolean {
    return true
  }

  /** E che cosa disfare alla fine. */
  protected stacca (): void {}

  /** Chiamata dalla guardia quando arriva una notifica della shell. */
  protected notificaShell (_notifica: number): void {}

  avvia (): boolean {
    if (!carica() || this.#viva) return this.#viva
    if (!this.attacca()) return false
    this.#viva = true

    this.#guardia = () => this.rimettiAPosto()
    this.finestra.on('move', this.#guardia)
    this.finestra.on('resize', this.#guardia)
    this.finestra.on('show', this.#guardia)
    this.finestra.on('focus', this.#guardia)
    // «Mostra desktop» (Win+D) minimizza tutte le finestre, e un widget del
    // desktop nascosto dal gesto che serve a *vedere* il desktop è una
    // contraddizione. Qui si rialza da sé: la minimizzazione dura un
    // battito di ciglia e poi torna dov'era, in fondo a tutto.
    this.#alMinimizza = () => {
      if (this.finestra.isDestroyed()) return
      this.finestra.restore()
      this.rimettiAPosto()
    }
    this.finestra.on('minimize', this.#alMinimizza)
    this.#sentinella = setInterval(() => this.rimettiAPosto(), 1000)

    this.posiziona()
    return true
  }

  /** Rifà i conti e ci si rimette: da chiamare quando cambiano misure o schermo. */
  posiziona (): void {
    const api = carica()
    if (!api || !this.#viva || this.finestra.isDestroyed()) return
    const voluto = this.rettangoloVoluto()
    if (!voluto) return
    this.#bersaglio = voluto
    this.muoviAlBersaglio()
  }

  /** Sposta la finestra sul bersaglio, senza che la guardia si richiami da sé. */
  protected muoviAlBersaglio (): void {
    const api = carica()
    if (!api || !this.#bersaglio) return
    this.#inRientro = true
    api.muovi(this.hWnd, this.#bersaglio)
    this.ordina()
    // Il rientro si chiude al giro dopo: lo spostamento arriva come evento, e
    // l'evento non è ancora stato consegnato quando questa riga finisce.
    setImmediate(() => {
      this.#inRientro = false
    })
  }

  /**
   * La finestra è stata spostata o alzata da qualcun altro: ci si rimette.
   *
   * Il confronto è in pixel fisici e con due pixel di tolleranza: le misure di
   * Electron passano per i pixel scalati e tornano indietro arrotondate, e un
   * confronto esatto farebbe rimbalzare la finestra all'infinito fra due
   * posizioni che sono la stessa.
   */
  protected rimettiAPosto (): void {
    const api = carica()
    if (!api || this.#inRientro || !this.#bersaglio || !this.#viva) return
    if (this.finestra.isDestroyed()) return

    const dove = api.dovE(this.hWnd)
    const scarto = Math.max(
      Math.abs(dove.left - this.#bersaglio.left),
      Math.abs(dove.top - this.#bersaglio.top),
      Math.abs(dove.right - this.#bersaglio.right),
      Math.abs(dove.bottom - this.#bersaglio.bottom),
    )
    // A posto dov'è: resta l'ordine, che un clic o una comparsa hanno potuto
    // alzare senza spostare un pixel.
    if (scarto <= 2) {
      this.ordina()
      return
    }
    this.muoviAlBersaglio()
  }

  /**
   * Rimette il widget al suo piano: subito sopra il desktop, sotto tutto il
   * resto.
   *
   * «Subito sopra il desktop» e non «in fondo a tutto», e la differenza si vede
   * premendo Win+D. «Mostra desktop» non minimizza le finestre una per una:
   * alza il desktop sopra tutte, e una finestra in fondo — per quanto in fondo
   * — finisce sotto di lui. Il widget spariva nel gesto che serve a *vedere* il
   * desktop, che è l'unico gesto per cui esiste.
   *
   * Agganciato al desktop invece che al fondo, il widget lo segue: quando il
   * desktop sale, sale con lui e si vede; quando torna giù, torna sotto a ogni
   * applicazione. È una riga di codice e vale tutta la differenza fra un widget
   * del desktop e una finestra che si comporta male.
   *
   * Senza il desktop — non dovrebbe succedere, ma è una `FindWindow` e può
   * tornare niente — si ripiega sul fondo, che è il comportamento di prima.
   */
  protected ordina (): void {
    const api = carica()
    if (!api || this.finestra.isDestroyed()) return
    const desktop = api.desktop()
    if (desktop) api.sopra(this.hWnd, desktop)
    else api.inFondo(this.hWnd)
  }

  /**
   * Smette. Si può chiamare quante volte si vuole: dopo la prima non fa più
   * niente — è quel che permette di chiamarla sia dalla chiusura della finestra
   * sia dall'uscita dell'applicazione senza chiedersi chi arriva prima.
   */
  ferma (): void {
    if (!this.#viva) return
    this.#viva = false
    if (!this.finestra.isDestroyed()) {
      if (this.#guardia) {
        this.finestra.off('move', this.#guardia)
        this.finestra.off('resize', this.#guardia)
        this.finestra.off('show', this.#guardia)
        this.finestra.off('focus', this.#guardia)
      }
      if (this.#alMinimizza) this.finestra.off('minimize', this.#alMinimizza)
    }
    this.#guardia = null
    this.#alMinimizza = null
    if (this.#sentinella) clearInterval(this.#sentinella)
    this.#sentinella = null
    this.#bersaglio = null
    this.stacca()
  }
}

/**
 * La striscia agganciata al bordo destro: un'*appbar*, come la barra delle
 * applicazioni.
 *
 * È il modo in cui un widget riesce a spostare le icone del desktop: la fetta
 * che si riserva esce dall'area di lavoro, e l'area di lavoro è proprio ciò
 * dentro cui Windows dispone le icone e massimizza le finestre. Le icone si
 * spostano da sole, senza che il registro tocchi niente di loro.
 *
 * `ferma()` non è facoltativo. Una striscia registrata e mai tolta lascia
 * l'area di lavoro ristretta anche dopo l'uscita dell'applicazione: il desktop
 * resta con una colonna vuota a destra, e nessuna finestra massimizzata ci
 * arriva più.
 */
export class StrisciaAncorata extends FinestraDiScrivania {
  #larghezza: number
  /** L'altezza in pixel fisici, o `null` per «tutto il bordo». */
  #altezza: number | null
  #ascoltoShell: ((wParam: Buffer, lParam: Buffer) => void) | null = null

  constructor (finestra: BrowserWindow, larghezzaFisica: number, altezzaFisica: number | null = null) {
    super(finestra)
    this.#larghezza = larghezzaFisica
    this.#altezza = altezzaFisica
  }

  get larghezza (): number {
    return this.#larghezza
  }

  get altezza (): number {
    const schermo = confiniFisici()
    return this.#altezza ?? schermo.bottom - schermo.top
  }

  get altezzaMassima (): number {
    const schermo = confiniFisici()
    return schermo.bottom - schermo.top
  }

  ridimensiona (misure: { larghezza?: number, altezza?: number | null }): void {
    if (misure.larghezza !== undefined) this.#larghezza = misure.larghezza
    if (misure.altezza !== undefined) this.#altezza = misure.altezza
    this.posiziona()
  }

  protected override attacca (): boolean {
    const api = carica()
    if (!api) return false
    if (api.appBar(ABM_NEW, dati(this.hWnd)) === 0n) return false

    // La shell rimanda qui i cambiamenti che riguardano la striscia: un'altra
    // appbar che si registra, la risoluzione che cambia, un gioco a schermo
    // intero. Senza questo ascolto la striscia resterebbe dov'era, cioè in
    // mezzo a uno schermo che nel frattempo è diventato un altro.
    this.#ascoltoShell = (wParam: Buffer) => {
      const notifica = Buffer.isBuffer(wParam) ? wParam.readUInt32LE(0) : Number(wParam)
      if (notifica === ABN_POSCHANGED) this.posiziona()
      // Un'applicazione a schermo intero — un video, una presentazione — deve
      // poter coprire anche la striscia: è il comportamento della barra delle
      // applicazioni, ed è quel che si aspetta chi preme F11 su un filmato.
      if (notifica === ABN_FULLSCREENAPP && !this.finestra.isDestroyed()) {
        this.finestra.setAlwaysOnTop(false)
      }
    }
    this.finestra.hookWindowMessage(MESSAGGIO_ANCORAGGIO, this.#ascoltoShell)
    return true
  }

  protected override stacca (): void {
    const api = carica()
    if (this.#ascoltoShell && !this.finestra.isDestroyed()) {
      this.finestra.unhookWindowMessage(MESSAGGIO_ANCORAGGIO)
    }
    this.#ascoltoShell = null
    api?.appBar(ABM_REMOVE, dati(this.hWnd))
  }

  /**
   * Chiede il posto, lo accetta come la shell lo concede, e ci mette la
   * finestra.
   *
   * I due passaggi — `ABM_QUERYPOS` e poi `ABM_SETPOS` — non sono cerimonia: il
   * primo è dove Windows sposta il rettangolo per non sovrapporlo alla barra
   * delle applicazioni o a un'altra appbar già registrata, e saltarlo vuol dire
   * finire sotto la barra su chi ce l'ha a destra.
   */
  protected override rettangoloVoluto (): Rettangolo | null {
    const api = carica()
    if (!api) return null

    const schermo = confiniFisici()
    const richiesta = dati(this.hWnd, {
      left: schermo.right - this.#larghezza,
      top: schermo.top,
      right: schermo.right,
      bottom: schermo.bottom,
    })
    api.appBar(ABM_QUERYPOS, richiesta)
    // Della risposta conta il bordo esterno: la larghezza è quella che ha
    // chiesto chi trascina, e non va rinegoziata a ogni giro.
    const riservato: Rettangolo = {
      left: richiesta.rc.right - this.#larghezza,
      top: richiesta.rc.top,
      right: richiesta.rc.right,
      bottom: richiesta.rc.bottom,
    }
    // La fetta riservata resta tutta l'altezza del bordo anche quando la
    // striscia è più corta: l'area di lavoro è un rettangolo, e una colonna
    // libera solo a metà non si può descrivere.
    api.appBar(ABM_SETPOS, dati(this.hWnd, riservato))
    // Va detto alla shell dopo aver spostato la finestra — lo fa `posiziona`
    // subito dopo di qui — ma il messaggio parla della fetta, non della
    // finestra, e quindi si può mandare adesso.
    api.appBar(ABM_WINDOWPOSCHANGED, dati(this.hWnd))

    return {
      left: riservato.left,
      top: riservato.top,
      right: riservato.right,
      bottom: this.#altezza === null
        ? riservato.bottom
        : Math.min(riservato.bottom, riservato.top + this.#altezza),
    }
  }
}

/**
 * Il widget libero: dove lo si è messo, e sotto a tutto.
 *
 * Non riserva niente e non sposta le icone — per farlo bisognerebbe togliere
 * una fetta all'area di lavoro, e un'area di lavoro è un rettangolo con un buco
 * su un bordo, non un riquadro in mezzo allo schermo. In cambio sta dove lo si
 * trascina, che è come si tiene un appunto sulla scrivania.
 *
 * Tutto il resto è come per la striscia: in fondo all'ordine, non attivabile,
 * e immune a «Mostra desktop».
 */
export class WidgetLibero extends FinestraDiScrivania {
  #rettangolo: Rettangolo

  constructor (finestra: BrowserWindow, rettangoloFisico: Rettangolo) {
    super(finestra)
    this.#rettangolo = rettangoloFisico
  }

  get rettangolo (): Rettangolo {
    return { ...this.#rettangolo }
  }

  get larghezza (): number {
    return this.#rettangolo.right - this.#rettangolo.left
  }

  get altezza (): number {
    return this.#rettangolo.bottom - this.#rettangolo.top
  }

  get altezzaMassima (): number {
    const schermo = confiniFisici()
    return schermo.bottom - schermo.top
  }

  /** Lo si trascina: l'angolo in alto a sinistra va dove dice chi trascina. */
  sposta (sinistra: number, alto: number): void {
    const larghezza = this.larghezza
    const altezza = this.altezza
    this.#rettangolo = {
      left: sinistra,
      top: alto,
      right: sinistra + larghezza,
      bottom: alto + altezza,
    }
    this.posiziona()
  }

  ridimensiona (misure: { larghezza?: number, altezza?: number | null }): void {
    const larghezza = misure.larghezza ?? this.larghezza
    const altezza = misure.altezza ?? this.altezza
    this.#rettangolo = {
      left: this.#rettangolo.left,
      top: this.#rettangolo.top,
      right: this.#rettangolo.left + larghezza,
      bottom: this.#rettangolo.top + altezza,
    }
    this.posiziona()
  }

  /**
   * Il rettangolo che si è chiesto, tenuto dentro lo schermo.
   *
   * Un widget trascinato fuori dal bordo non si riprende più: non è nella barra
   * delle applicazioni, non risponde ad Alt+Tab, e l'unico modo di rivederlo
   * sarebbe spegnerlo e riaccenderlo. Qui resta sempre visibile almeno per una
   * cella, che è quanto basta per riafferrarlo.
   */
  protected override rettangoloVoluto (): Rettangolo {
    const schermo = confiniFisici()
    const larghezza = this.larghezza
    const altezza = this.altezza
    const margine = Math.min(larghezza, altezza, 40)

    const left = Math.min(
      Math.max(this.#rettangolo.left, schermo.left - larghezza + margine),
      schermo.right - margine,
    )
    const top = limita(this.#rettangolo.top, schermo.top, schermo.bottom - margine)

    this.#rettangolo = { left, top, right: left + larghezza, bottom: top + altezza }
    return { ...this.#rettangolo }
  }
}
