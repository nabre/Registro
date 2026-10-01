// Le opzioni di sviluppo: una finestra nativa per chi lavora con `npm run dev`
// (console di ogni finestra, console all'avvio, ricarica, riavvio, cartelle).
// Si apre dal menu «Sviluppo» o con Ctrl+Maiusc+F12 da qualunque finestra.
//
// Tutto passa da `inSviluppo()`: nel pacchetto niente menu, niente scorciatoia,
// niente ascolto sul canale, e la pagina `dev.html` non viene nemmeno
// costruita (`PAGINE_DI_SVILUPPO` in `esbuild.mjs`). Le scelte stanno in
// `sviluppo.json` (`desktop/apparato/dev.ts`), non nel manifesto.

import {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  type Input,
  type MenuItemConstructorOptions,
  type WebContents,
} from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import {
  apriConsole,
  avviaConsoleAllAvvio,
  cambiaImpostazioniSviluppo,
  chiediRiavvio,
  èTipoFinestra,
  impostazioniSviluppo,
  inSviluppo,
  POSIZIONI_CONSOLE,
  posizioneDellaConsole,
  ricaricaFinestre,
  tipoDellaFinestra,
  type ImpostazioniSviluppo,
  type PosizioneConsole,
  type TipoFinestra,
} from '#desktop/apparato/dev.js'
import { cartellaBundle, icona } from '#desktop/apparato/context.js'
import { CANALE } from '#desktop/apparato/channels.js'
import { postoDi, ricordaPosto } from '#desktop/apparato/placement.js'
import {
  coloreSfondo,
  cornicePropria,
  preferenzeConPonte,
  ricordaFascia,
  segniDellaCornice,
  togliMenu,
} from '#desktop/apparato/theme.js'
import { chiudiLeVieDiFuga } from '#desktop/apparato/navigation.js'
import { mostraComunque } from '#desktop/apparato/showAnyway.js'
import { Smaltitore } from '#core/apparato/events.js'
import { percorsoPacchetto } from '#core/dati/paths.js'
import { testi } from '#desktop/shell/pages/dev/dev.testi.js'
import { èSentinella } from '#desktop/shell/sentinel.js'

/** La scorciatoia, mostrata nel menu; la riconosce `èScorciatoia` in ogni pagina. */
const SCORCIATOIA = 'CommandOrControl+Shift+F12'

/** Le variabili d'ambiente che il registro legge all'avvio, mostrate come sono. */
const VARIABILI = ['REGISTRO_DATI', 'REGISTRO_SENZA_IDENTITA', 'REGISTRO_SENZA_INTEGRAZIONE'] as const

/** Una finestra aperta, come la vede la pagina. */
export interface FinestraSviluppo {
  /** L'id dei `webContents`: è quello che la pagina rimanda. */
  id: number
  tipo: TipoFinestra | null
  titolo: string
  console: boolean
  posizione: PosizioneConsole
}

/** Quel che la pagina riceve a ogni cambio. */
export interface StatoSviluppo {
  finestre: FinestraSviluppo[]
  impostazioni: ImpostazioniSviluppo
  posizioni: readonly PosizioneConsole[]
  percorsi: {
    dati: string
    documento: string | null
    giornale: string
    giornaleScritto: boolean
    bundle: string
  }
  ambiente: Array<{ nome: string, valore: string | null }>
}

/** Che cosa si apre in Esplora risorse. */
export type Collegamento = 'dati' | 'documento' | 'giornale' | 'bundle'
const COLLEGAMENTI: readonly Collegamento[] = ['dati', 'documento', 'giornale', 'bundle']

/** Quel che la pagina manda al main process. */
export type RichiestaSviluppo =
  | { sviluppo: 'pronto' }
  | { sviluppo: 'console', id: number, aperta: boolean, posizione: PosizioneConsole }
  | { sviluppo: 'ricarica', id: number }
  | { sviluppo: 'allAvvio', tipo: TipoFinestra, valore: boolean }
  | { sviluppo: 'posizione', posizione: PosizioneConsole }
  | { sviluppo: 'ricaricaAutomatica', valore: boolean }
  | { sviluppo: 'ricaricaTutte' }
  | { sviluppo: 'riavvia' }
  | { sviluppo: 'apri', cosa: Collegamento }

function èPosizione (valore: unknown): valore is PosizioneConsole {
  return (POSIZIONI_CONSOLE as readonly unknown[]).includes(valore)
}

/**
 * La richiesta, se è una di quelle note e con i campi del tipo giusto; `null`
 * altrimenti. La pagina non è più fidata delle altre: si controlla tutto.
 */
export function richiestaSviluppo (messaggio: unknown): RichiestaSviluppo | null {
  if (typeof messaggio !== 'object' || messaggio === null) return null
  const m = messaggio as Record<string, unknown>
  const intero = (valore: unknown): valore is number => Number.isInteger(valore)
  switch (m.sviluppo) {
    case 'pronto':
    case 'ricaricaTutte':
    case 'riavvia':
      return { sviluppo: m.sviluppo }
    case 'console':
      return intero(m.id) && typeof m.aperta === 'boolean' && èPosizione(m.posizione)
        ? { sviluppo: 'console', id: m.id, aperta: m.aperta, posizione: m.posizione }
        : null
    case 'ricarica':
      return intero(m.id) ? { sviluppo: 'ricarica', id: m.id } : null
    case 'allAvvio':
      return èTipoFinestra(m.tipo) && typeof m.valore === 'boolean'
        ? { sviluppo: 'allAvvio', tipo: m.tipo, valore: m.valore }
        : null
    case 'posizione':
      return èPosizione(m.posizione) ? { sviluppo: 'posizione', posizione: m.posizione } : null
    case 'ricaricaAutomatica':
      return typeof m.valore === 'boolean' ? { sviluppo: 'ricaricaAutomatica', valore: m.valore } : null
    case 'apri':
      return (COLLEGAMENTI as readonly unknown[]).includes(m.cosa)
        ? { sviluppo: 'apri', cosa: m.cosa as Collegamento }
        : null
    default:
      return null
  }
}

// ------------------------------------------------------------------ lo stato

let finestra: BrowserWindow | null = null
let inAscolto = false
/** Chi va chiamato dopo una ricarica a mano: la proiezione vuole lo stato rimandato. */
let dopoRicarica: () => void = () => {}

function viva (): BrowserWindow | null {
  return finestra && !finestra.isDestroyed() ? finestra : null
}

function percorsoGiornale (): string {
  return join(app.getPath('userData'), 'errori.log')
}

/** Le finestre nostre, senza la sentinella; i dettagli che la pagina mostra. */
function finestreAperte (): FinestraSviluppo[] {
  return BrowserWindow.getAllWindows()
    .filter((f) => !f.isDestroyed() && !èSentinella(f))
    .map((f) => ({
      id: f.webContents.id,
      tipo: tipoDellaFinestra(f),
      titolo: f.getTitle(),
      console: f.webContents.isDevToolsOpened(),
      posizione: posizioneDellaConsole(f.webContents),
    }))
}

export function statoSviluppo (): StatoSviluppo {
  const giornale = percorsoGiornale()
  return {
    finestre: finestreAperte(),
    impostazioni: impostazioniSviluppo(),
    posizioni: POSIZIONI_CONSOLE,
    percorsi: {
      dati: app.getPath('userData'),
      documento: percorsoPacchetto()?.fsPath ?? null,
      giornale,
      giornaleScritto: existsSync(giornale),
      bundle: cartellaBundle().fsPath,
    },
    ambiente: [
      { nome: 'Electron', valore: process.versions.electron ?? null },
      { nome: 'Chromium', valore: process.versions.chrome ?? null },
      { nome: 'Node', valore: process.versions.node ?? null },
      ...VARIABILI.map((nome) => ({ nome, valore: process.env[nome] ?? null })),
    ],
  }
}

let annuncioInSospeso: NodeJS.Timeout | null = null

/**
 * Rimanda lo stato alla pagina, una volta per raffica: aprire una finestra fa
 * scattare creazione, titolo e console quasi insieme.
 */
function annuncia (): void {
  if (!viva() || annuncioInSospeso) return
  annuncioInSospeso = setTimeout(() => {
    annuncioInSospeso = null
    viva()?.webContents.send(CANALE, { sviluppo: 'stato', stato: statoSviluppo() })
  }, 50)
}

/** Le finestre di cui si seguono i cambi che la pagina mostra. */
const seguite = new WeakSet<BrowserWindow>()

function segui (seguita: BrowserWindow): void {
  if (seguite.has(seguita)) return
  seguite.add(seguita)
  seguita.on('closed', annuncia)
  seguita.on('page-title-updated', annuncia)
  seguita.webContents.on('devtools-opened', annuncia)
  seguita.webContents.on('devtools-closed', annuncia)
}

/** I `webContents` di una finestra nostra, per id; mai quelli di un'altra cosa. */
function contenutiDi (id: number): WebContents | null {
  const trovata = BrowserWindow.getAllWindows().find(
    (f) => !f.isDestroyed() && !èSentinella(f) && f.webContents.id === id,
  )
  return trovata?.webContents ?? null
}

/** Salva le scelte e lo dice alla pagina se il file è bloccato. */
function salva (
  aperta: BrowserWindow,
  muta: (attuali: ImpostazioniSviluppo) => ImpostazioniSviluppo,
): void {
  const salvate = cambiaImpostazioniSviluppo(muta)
  if (!salvate) aperta.webContents.send(CANALE, { sviluppo: 'rifiuto', motivo: testi().nonSalvato })
  annuncia()
}

async function apri (cosa: Collegamento): Promise<void> {
  const stato = statoSviluppo().percorsi
  switch (cosa) {
    case 'dati':
      await shell.openPath(stato.dati)
      break
    case 'bundle':
      await shell.openPath(stato.bundle)
      break
    case 'documento':
      if (stato.documento) shell.showItemInFolder(stato.documento)
      break
    case 'giornale':
      if (stato.giornaleScritto) await shell.openPath(stato.giornale)
      else await shell.openPath(stato.dati)
      break
  }
}

function rispondi (aperta: BrowserWindow, richiesta: RichiestaSviluppo): void {
  switch (richiesta.sviluppo) {
    case 'pronto':
      if (!aperta.isVisible()) aperta.show()
      break

    case 'console': {
      const contenuti = contenutiDi(richiesta.id)
      if (!contenuti) break
      if (richiesta.aperta) apriConsole(contenuti, richiesta.posizione)
      else contenuti.closeDevTools()
      // Gli eventi della console arrivano solo se cambia qualcosa: la riga torna com'era.
      annuncia()
      break
    }

    case 'ricarica':
      contenutiDi(richiesta.id)?.reloadIgnoringCache()
      break

    case 'allAvvio':
      salva(aperta, (attuali) => ({
        ...attuali,
        allAvvio: { ...attuali.allAvvio, [richiesta.tipo]: richiesta.valore },
      }))
      break

    case 'posizione':
      salva(aperta, (attuali) => ({ ...attuali, posizione: richiesta.posizione }))
      break

    case 'ricaricaAutomatica':
      salva(aperta, (attuali) => ({ ...attuali, ricaricaAutomatica: richiesta.valore }))
      break

    case 'ricaricaTutte':
      ricaricaFinestre(dopoRicarica)
      break

    case 'riavvia':
      chiediRiavvio()
      break

    case 'apri':
      void apri(richiesta.cosa)
      break
  }
}

function ascolta (): void {
  if (inAscolto) return
  inAscolto = true
  // Canale condiviso: ognuno scarta i mittenti che non sono suoi.
  ipcMain.on(CANALE, (evento: { sender: { id: number } }, messaggio: unknown) => {
    const aperta = viva()
    if (!aperta || evento.sender.id !== aperta.webContents.id) return
    const richiesta = richiestaSviluppo(messaggio)
    if (richiesta) rispondi(aperta, richiesta)
    else console.warn('[IPC sviluppo] messaggio scartato:', messaggio)
  })
}

// ------------------------------------------------------------------ la finestra

/** Apre le opzioni di sviluppo, o le porta davanti; `null` fuori da `npm run dev`. */
export function apriSviluppo (): BrowserWindow | null {
  if (!inSviluppo()) return null
  const gia = viva()
  if (gia) {
    if (gia.isMinimized()) gia.restore()
    gia.show()
    gia.focus()
    return gia
  }

  ascolta()
  const nata = new BrowserWindow({
    ...postoDi('sviluppo', { width: 760, height: 720, minWidth: 520, minHeight: 420 }),
    title: testi().titolo,
    show: false,
    backgroundColor: coloreSfondo(),
    ...icona(),
    ...cornicePropria(),
    webPreferences: preferenzeConPonte(),
  })
  finestra = nata
  ricordaFascia(nata)
  togliMenu(nata)
  chiudiLeVieDiFuga(nata)
  ricordaPosto('sviluppo', nata)

  // Le finestre già aperte; quelle che nasceranno le prende `installaSviluppo`.
  for (const aperta of BrowserWindow.getAllWindows()) {
    if (!aperta.isDestroyed() && !èSentinella(aperta)) segui(aperta)
  }

  nata.webContents.on('did-finish-load', () => {
    if (nata.isDestroyed()) return
    nata.setTitle(testi().titolo)
    nata.webContents.send(CANALE, { sviluppo: 'stato', stato: statoSviluppo() })
    mostraComunque(nata)
  })
  nata.on('closed', () => {
    if (finestra === nata) finestra = null
  })

  void nata.loadURL(`registro://app/dist/dev.html?${segniDellaCornice()}`)
  return nata
}

/** Il menu «Sviluppo», o `null` fuori da `npm run dev`. */
export function menuSviluppo (): MenuItemConstructorOptions | null {
  if (!inSviluppo()) return null
  const t = testi()
  return {
    id: 'sviluppo',
    label: t.menuSviluppo,
    submenu: [
      {
        id: 'sviluppo.opzioni',
        label: t.menuOpzioni,
        accelerator: SCORCIATOIA,
        // La scorciatoia la prende `èScorciatoia` in ogni pagina, anche in quelle
        // senza menu: registrata anche qui, scatterebbe due volte.
        registerAccelerator: false,
        click: () => apriSviluppo(),
      },
      { type: 'separator' },
      { id: 'sviluppo.ricaricaTutte', label: t.ricaricaTutte, click: () => ricaricaFinestre(dopoRicarica) },
      { id: 'sviluppo.riavvia', label: t.riavvia, click: () => chiediRiavvio() },
    ],
  }
}

/** Ctrl+Maiusc+F12 (Cmd su macOS), premuto in una pagina qualunque. */
function èScorciatoia (tasto: Input): boolean {
  const comando = process.platform === 'darwin' ? tasto.meta : tasto.control
  return tasto.type === 'keyDown' && tasto.key === 'F12' && comando && tasto.shift && !tasto.alt
}

/**
 * In sviluppo: la scorciatoia in ogni pagina, la console all'avvio, il seguito
 * delle finestre per la pagina. Da chiamare prima della prima finestra. Fuori
 * da `npm run dev` non installa niente.
 */
export function installaSviluppo (opzioni: { dopoRicarica?: () => void } = {}): Smaltitore {
  if (!inSviluppo()) return new Smaltitore(() => {})
  dopoRicarica = opzioni.dopoRicarica ?? (() => {})

  const allaScorciatoia = (evento: { preventDefault (): void }, tasto: Input): void => {
    if (!èScorciatoia(tasto)) return
    evento.preventDefault()
    apriSviluppo()
  }
  const contenutiNati = (_evento: unknown, contenuti: WebContents): void => {
    contenuti.on('before-input-event', allaScorciatoia)
  }
  const finestraNata = (_evento: unknown, nata: BrowserWindow): void => {
    segui(nata)
    annuncia()
  }
  app.on('web-contents-created', contenutiNati)
  app.on('browser-window-created', finestraNata)
  const consoleAllAvvio = avviaConsoleAllAvvio()

  return new Smaltitore(() => {
    app.off('web-contents-created', contenutiNati)
    app.off('browser-window-created', finestraNata)
    consoleAllAvvio.dispose()
  })
}
