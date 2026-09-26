// Tutto quel che il registro chiede all'utente:
//
//   i messaggi        senza bottoni, una notifica nel pannello; con bottoni o
//                     senza pannello, una finestra nostra (`shell/pages/dialog/`),
//                     con `dialog.showMessageBox` come ripiego
//   i file            i dialoghi di sistema, e `shell.openPath` per aprirli
//   le domande        una finestra nostra, perché Electron non le ha

import { app, BrowserWindow, dialog, ipcMain, screen, shell } from 'electron'

import { icona } from './context.js'
import { coloreSfondo, preferenzeConPonte } from './theme.js'
import { chiudiLeVieDiFuga } from './navigation.js'
import { mostraComunque } from './showAnyway.js'
import { CANALE } from './channels.js'
import { Uri } from './uri.js'
import { eUnPannello } from './windows.js'
import { executeCommand, openExternal } from './commands.js'
import { statoAggiornamenti } from './updates.js'
import { limita } from '../domain/calculations.js'
import { versionePiuRecente, type VersionePiuRecente } from '../domain/upgrades.js'
import { parole } from '../domain/words.testi.js'
import { testi } from './dialogs.testi.js'

// ------------------------------------------------------------------ le forme

export interface VoceMessaggio {
  title: string
  /** Gesto che non si disfa: pulsante rosso, come `conferma({ pericolo: true })`. */
  pericolo?: boolean
}

interface OpzioniMessaggio {
  modal?: boolean
  detail?: string
}

export interface VoceScelta {
  label: string
  description?: string
  detail?: string
}

interface OpzioniInputBox {
  title?: string
  prompt?: string
  value?: string
  placeHolder?: string
  password?: boolean
  validateInput?: (valore: string) => string | null | undefined | Promise<string | null | undefined>
}

interface OpzioniQuickPick {
  title?: string
  placeHolder?: string
}

interface OpzioniApertura {
  title?: string
  openLabel?: string
  canSelectMany?: boolean
  canSelectFiles?: boolean
  canSelectFolders?: boolean
  defaultUri?: Uri
  filters?: Record<string, string[]>
}

interface OpzioniSalvataggio {
  title?: string
  saveLabel?: string
  defaultUri?: Uri
  filters?: Record<string, string[]>
}

interface Avanzamento {
  report (quanto: { message?: string, increment?: number }): void
}

interface OpzioniAvanzamento {
  title?: string
}

// --------------------------------------------------------- le finestre in giro

/** Finestre di servizio (dialoghi, avvio): niente notifiche, niente dialoghi appoggiati. */
const diDialogo = new Set<number>()

/**
 * Segna una finestra di servizio. Serve alla finestra d'avvio: un dialogo
 * appoggiato su di lei sparirebbe quando lei si chiude.
 */
export function escludiDaiDialoghi (finestra: BrowserWindow): void {
  const id = finestra.webContents.id
  diDialogo.add(id)
  finestra.once('closed', () => diDialogo.delete(id))
}

/** Le finestre del registro: il pannello, la proiezione. */
function delRegistro (): BrowserWindow[] {
  return BrowserWindow.getAllWindows().filter(
    (finestra) => !finestra.isDestroyed() && !diDialogo.has(finestra.webContents.id),
  )
}

/**
 * Una notifica a tutti i pannelli (la proiezione scarta da sé). `false` se non
 * c'è nessun pannello: allora il messaggio diventa una finestra.
 */
function notifica (livello: 'info' | 'avviso' | 'errore', testo: string): boolean {
  const finestre = delRegistro().filter((finestra) => eUnPannello(finestra.webContents.id))
  for (const finestra of finestre) {
    finestra.webContents.send(CANALE, { tipo: 'notifica', livello, testo })
  }
  return finestre.length > 0
}

/** La finestra su cui appoggiare un dialogo modale. */
function finestraPadre (): BrowserWindow | undefined {
  const conFuoco = BrowserWindow.getFocusedWindow()
  if (conFuoco && !diDialogo.has(conFuoco.webContents.id)) return conFuoco
  return delRegistro()[0]
}

// ----------------------------------------------------------------- i messaggi

type Bottone = string | VoceMessaggio

/** Separa le opzioni dai bottoni, che arrivano insieme negli argomenti variadici. */
function scomponi (resto: unknown[]): { opzioni: OpzioniMessaggio, bottoni: Bottone[] } {
  const primo = resto[0]
  const eOpzioni = typeof primo === 'object' && primo !== null && !('title' in primo)
  return {
    opzioni: eOpzioni ? (primo) : {},
    bottoni: (eOpzioni ? resto.slice(1) : resto) as Bottone[],
  }
}

function etichettaDi (bottone: Bottone): string {
  return typeof bottone === 'string' ? bottone : bottone.title
}

/** Il tono di un messaggio: decide icona e colore. */
type LivelloMessaggio = 'info' | 'avviso' | 'errore' | 'domanda'

/** La veste di un pulsante, come le varianti di `pulsante()` nel pannello. */
type RuoloBottone = 'primario' | 'secondario' | 'pericolo'

export interface BottoneMessaggio {
  etichetta: string
  ruolo?: RuoloBottone
  /** In fondo a sinistra, come le `azioniSecondarie` delle modali del pannello. */
  aSinistra?: boolean
}

/** Un messaggio da mostrare nella finestra del registro. */
export interface Messaggio {
  livello: LivelloMessaggio
  /** La frase principale, come titolo dentro la pagina. */
  messaggio: string
  /** La spiegazione, sotto. Gli a capo si rispettano. */
  dettaglio?: string
  /** Dati su due colonne (es. versione del file e del programma). */
  fatti?: Array<{ nome: string, valore: string }>
  /** I pulsanti, da sinistra a destra. Vuoto vale «Chiudi». */
  bottoni: BottoneMessaggio[]
  /** Il pulsante col fuoco, premuto da Invio; di norma il primo. */
  predefinito?: number
  /** Il pulsante di Esc nella finestra di sistema; nella nostra Esc torna `null`. */
  annulla?: number
  /** Il titolo della finestra, nella barra. */
  titolo?: string
}

const TIPI_DI_SISTEMA = {
  info: 'info',
  avviso: 'warning',
  errore: 'error',
  domanda: 'question',
} as const

/** Ripiego: lo stesso messaggio nella finestra di sistema. */
async function messaggioDiSistema (voce: Messaggio): Promise<number | null> {
  const etichette = voce.bottoni.length > 0
    ? voce.bottoni.map((b) => b.etichetta)
    : [parole().chiudi]
  const fatti = (voce.fatti ?? []).map((fatto) => `${fatto.nome}: ${fatto.valore}`)
  const dettaglio = [voce.dettaglio, fatti.join('\n')].filter(Boolean).join('\n\n')
  const padre = finestraPadre()
  const scelte = {
    type: TIPI_DI_SISTEMA[voce.livello],
    title: voce.titolo,
    message: voce.messaggio,
    detail: dettaglio || undefined,
    buttons: etichette,
    defaultId: voce.predefinito ?? 0,
    cancelId: voce.annulla ?? etichette.length - 1,
    // Senza, su macOS i bottoni oltre il secondo diventano un menu a tendina.
    noLink: true,
  }
  const esito = padre
    ? await dialog.showMessageBox(padre, scelte)
    : await dialog.showMessageBox(scelte)
  return esito.response
}

/**
 * Un messaggio nella finestra del registro. Torna l'indice del pulsante premuto,
 * o `null` per Esc e la X (un «Annulla» va trattato allo stesso modo).
 */
export async function chiediMessaggio (voce: Messaggio): Promise<number | null> {
  const bottoni = voce.bottoni.length > 0
    ? voce.bottoni
    : [{ etichetta: parole().chiudi, ruolo: 'primario' as const }]
  const parametri: ParametriDialogo = {
    tipo: 'messaggio',
    // testo-fisso: il marchio non si traduce
    titolo: voce.titolo ?? 'Regiclass',
    livello: voce.livello,
    messaggio: voce.messaggio,
    dettaglio: voce.dettaglio ?? '',
    fatti: voce.fatti ?? [],
    bottoni: bottoni.map((b) => ({
      etichetta: b.etichetta,
      ruolo: b.ruolo ?? 'secondario',
      aSinistra: Boolean(b.aSinistra),
    })),
    predefinito: limita(voce.predefinito ?? 0, 0, bottoni.length - 1),
  }

  let risposta: EsitoDialogo
  try {
    risposta = await chiedi(parametri, 480)
  } catch (guasto) {
    // Se la finestra non nasce, il messaggio va comunque detto (ripiego sotto).
    console.error('finestra del messaggio non aperta', guasto)
    risposta = { dialogo: 'nonCaricata' }
  }
  if (risposta?.dialogo === 'nonCaricata') {
    const scelta = await messaggioDiSistema(voce)
    return voce.bottoni.length > 0 ? scelta : null
  }
  if (risposta?.dialogo !== 'conferma' || risposta.indice === undefined) return null
  const indice = risposta.indice
  // Un indice fuori dai pulsanti vale Esc: quel che arriva dall'IPC si controlla.
  if (!Number.isInteger(indice) || indice < 0 || indice >= voce.bottoni.length) return null
  return indice
}

/** Toglie il «Regiclass: » iniziale (anche con lo spazio francese prima dei due punti). */
function senzaPrefisso (testo: string): string {
  const senza = testo.replace(/^Regiclass\s?:\s+/, '')
  return senza.charAt(0).toUpperCase() + senza.slice(1)
}

/** Oltre questa lunghezza la frase va nel corpo, e il titolo lo dà il tono. */
const TITOLO_MASSIMO = 110

/** Il titolo del tono nella lingua corrente; il marchio per info e domande. */
function titoloDelTono (livello: LivelloMessaggio): string {
  switch (livello) {
    case 'avviso': return parole().attenzione
    case 'errore': return testi().qualcosaNonÈAndato
    // testo-fisso: il marchio non si traduce
    default: return 'Regiclass'
  }
}

async function mostraMessaggio (
  tipo: 'info' | 'warning' | 'error',
  messaggio: string,
  resto: unknown[],
): Promise<string | undefined> {
  const { opzioni, bottoni } = scomponi(resto)
  const livello = tipo === 'error' ? 'errore' : tipo === 'warning' ? 'avviso' : 'info'

  if (bottoni.length === 0 && !opzioni.modal) {
    const testo = opzioni.detail ? `${messaggio} ${opzioni.detail}` : messaggio
    // Senza pannello (avvio, benvenuto) si passa alla finestra.
    if (notifica(livello, testo)) return undefined
  }

  if (bottoni.length === 0) {
    const recente = versionePiuRecente(messaggio)
    if (recente) {
      await mostraVersionePiuRecente(recente)
      return undefined
    }
  }

  const etichette = bottoni.map(etichettaDi)
  const pulito = senzaPrefisso(messaggio)
  const lungo = !opzioni.detail && pulito.length > TITOLO_MASSIMO
  const parti = lungo
    ? { messaggio: titoloDelTono(livello), dettaglio: pulito }
    : { messaggio: pulito, dettaglio: opzioni.detail }

  if (etichette.length === 0) {
    await chiediMessaggio({ livello, ...parti, bottoni: [] })
    return undefined
  }

  // Con una scelta c'è sempre «Annulla», che torna `undefined`. Ordine delle
  // modali del pannello: il primo bottone in fondo a destra, «Annulla» accanto,
  // gli altri a sinistra.
  const pericolo = (indice: number) => {
    const bottone = bottoni[indice]
    return typeof bottone === 'object' && bottone.pericolo === true
  }
  const disposti: Array<BottoneMessaggio & { etichettaChiamante?: string }> = [
    ...etichette.slice(1).map((etichetta, i) => ({
      etichetta,
      etichettaChiamante: etichetta,
      ruolo: pericolo(i + 1) ? 'pericolo' as const : 'secondario' as const,
      aSinistra: true,
    })),
    { etichetta: parole().annulla, ruolo: 'secondario' },
    {
      etichetta: etichette[0] ?? '',
      etichettaChiamante: etichette[0],
      ruolo: pericolo(0) ? 'pericolo' : 'primario',
    },
  ]
  const indice = await chiediMessaggio({
    livello,
    ...parti,
    bottoni: disposti,
    predefinito: disposti.length - 1,
    annulla: disposti.length - 2,
  })
  return indice === null ? undefined : disposti[indice]?.etichettaChiamante
}

// ------------------------------------------------- un anno da un registro nuovo

// L'errore si riconosce con `versionePiuRecente` (`domain/upgrades.ts`), accanto
// alla frase che lo compone.

/**
 * Un anno scritto da un registro più nuovo: le due versioni e le due strade,
 * aggiornare (pagina delle release, perché qui non c'è pannello) o aprire un
 * altro anno.
 */
async function mostraVersionePiuRecente (recente: VersionePiuRecente): Promise<void> {
  const stato = statoAggiornamenti()
  const t = testi()
  const dettaglio = [t.nonLoApre, stato.supportato ? t.aggiornaDaQui : t.aggiornaAMano].join('\n\n')
  const bottoni: BottoneMessaggio[] = [
    { etichetta: t.apriUnAltroAnno, aSinistra: true },
    { etichetta: parole().chiudi },
    { etichetta: t.scaricaLaNuova, ruolo: 'primario' },
  ]
  const scelta = await chiediMessaggio({
    livello: 'avviso',
    titolo: t.titoloPiùRecente,
    messaggio: t.vieneDaUnPiùRecente(recente.file),
    dettaglio,
    fatti: [
      { nome: t.ilFile(recente.cosa), valore: String(recente.delFile) },
      { nome: t.questoArrivaA(stato.versione), valore: String(recente.quiFinoA) },
    ],
    bottoni,
    predefinito: 2,
    annulla: 1,
  })
  if (scelta === 0) {
    // Come «Apri…» nel menu.
    void executeCommand('registroDocenti.apriDocumento').catch((guasto: unknown) => {
      console.error('«Apri un altro anno» non riuscito', guasto)
    })
  } else if (scelta === 2) {
    void openExternal(Uri.parse(stato.pagina))
  }
}

export function showInformationMessage (
  messaggio: string,
  ...resto: unknown[]
): Promise<string | undefined> {
  return mostraMessaggio('info', messaggio, resto)
}

export function showWarningMessage (
  messaggio: string,
  ...resto: unknown[]
): Promise<string | undefined> {
  return mostraMessaggio('warning', messaggio, resto)
}

export function showErrorMessage (
  messaggio: string,
  ...resto: unknown[]
): Promise<string | undefined> {
  return mostraMessaggio('error', messaggio, resto)
}

// --------------------------------------------------------------------- i file

export async function showOpenDialog (opzioni: OpzioniApertura = {}): Promise<Uri[] | undefined> {
  const proprieta: Array<'openFile' | 'openDirectory' | 'multiSelections'> = []
  // `canSelectFiles` non detto vale «sì», come in VS Code.
  if (opzioni.canSelectFolders) proprieta.push('openDirectory')
  if (opzioni.canSelectFiles ?? !opzioni.canSelectFolders) proprieta.push('openFile')
  if (opzioni.canSelectMany) proprieta.push('multiSelections')

  const padre = finestraPadre()
  const scelte = {
    title: opzioni.title,
    buttonLabel: opzioni.openLabel,
    defaultPath: opzioni.defaultUri?.fsPath ?? app.getPath('documents'),
    properties: proprieta,
    filters: Object.entries(opzioni.filters ?? {}).map(([name, estensioni]) => ({
      name,
      // Electron le vuole senza punto, VS Code le accetta in tutti e due i modi.
      extensions: estensioni.map((pezzo) => pezzo.replace(/^\./, '')),
    })),
  }
  const esito = padre
    ? await dialog.showOpenDialog(padre, scelte)
    : await dialog.showOpenDialog(scelte)

  if (esito.canceled || esito.filePaths.length === 0) return undefined
  return esito.filePaths.map((percorso) => Uri.file(percorso))
}

/**
 * Dove salvare un file nuovo (il documento di un anno). Le cartelle mancanti
 * le crea chi riceve l'Uri, non il dialogo.
 */
export async function showSaveDialog (opzioni: OpzioniSalvataggio = {}): Promise<Uri | undefined> {
  const padre = finestraPadre()
  const scelte = {
    title: opzioni.title,
    buttonLabel: opzioni.saveLabel,
    defaultPath: opzioni.defaultUri?.fsPath ?? app.getPath('documents'),
    properties: ['createDirectory' as const],
    filters: Object.entries(opzioni.filters ?? {}).map(([name, estensioni]) => ({
      name,
      // Electron le vuole senza punto, VS Code le accetta in tutti e due i modi.
      extensions: estensioni.map((pezzo) => pezzo.replace(/^\./, '')),
    })),
  }
  const esito = padre
    ? await dialog.showSaveDialog(padre, scelte)
    : await dialog.showSaveDialog(scelte)

  if (esito.canceled || !esito.filePath) return undefined
  return Uri.file(esito.filePath)
}

/** Apre un file col programma di sistema (es. un CSV o PDF appena esportato). */
export async function showTextDocument (cosa: unknown, _opzioni?: unknown): Promise<void> {
  const uri = cosa instanceof Uri ? cosa : null
  if (uri) await shell.openPath(uri.fsPath)
}

// -------------------------------------------------------------- l'avanzamento

/**
 * Esegue un lavoro lungo e ne racconta i passi come notifiche nel pannello.
 * Non si può annullare.
 */
export async function withProgress<T> (
  opzioni: OpzioniAvanzamento,
  compito: (avanzamento: Avanzamento) => Promise<T>,
): Promise<T> {
  if (opzioni.title) notifica('info', opzioni.title)
  const avanzamento: Avanzamento = {
    report ({ message }) {
      if (message) notifica('info', message)
    },
  }
  return await compito(avanzamento)
}

// ------------------------------------------------------------------ le domande

/** Toglie i segnaposto delle icone (`$(copy)` e simili) dalle etichette. */
export function senzaSegnaposti (etichetta: string): string {
  return etichetta.replace(/\$\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Quel che la pagina del dialogo riceve: tipo e parametri già ripuliti. */
export type ParametriDialogo =
  | {
    tipo: 'input'
    titolo: string
    invito: string
    valore: string
    segnaposto: string
    password: boolean
  }
  | {
    tipo: 'elenco'
    titolo: string
    segnaposto: string
    voci: Array<{ etichetta: string, descrizione: string, dettaglio: string }>
  }
  | {
    tipo: 'messaggio'
    titolo: string
    livello: LivelloMessaggio
    messaggio: string
    dettaglio: string
    fatti: Array<{ nome: string, valore: string }>
    bottoni: Array<{ etichetta: string, ruolo: RuoloBottone, aSinistra: boolean }>
    predefinito: number
  }

/** Quel che la pagina risponde; il resto si scarta. */
export type RispostaDialogo =
  | { dialogo: 'conferma', indice?: number, testo?: string }
  | { dialogo: 'annulla' }
  | { dialogo: 'valida', testo: string }
  | { dialogo: 'altezza', valore: number }

function eRisposta (messaggio: unknown): messaggio is RispostaDialogo {
  return typeof messaggio === 'object' && messaggio !== null && 'dialogo' in messaggio
}

/**
 * Esito di `chiedi`; `nonCaricata` vale «Annulla» per le domande, mentre i
 * messaggi ripiegano sulla finestra di sistema.
 */
type EsitoDialogo = RispostaDialogo | { dialogo: 'nonCaricata' } | null

let inAscolto = false

/** Le pagine di dialogo vive, per id di webContents: dice chi ha risposto. */
const aperti = new Map<number, (risposta: RispostaDialogo) => void>()

function ascolta (): void {
  if (inAscolto) return
  inAscolto = true
  // Canale condiviso con `windows.ts`: ognuno scarta i mittenti dell'altro.
  ipcMain.on(CANALE, (evento: { sender: { id: number } }, messaggio: unknown) => {
    if (eRisposta(messaggio)) aperti.get(evento.sender.id)?.(messaggio)
  })
}

/** Indirizzo della pagina del dialogo, in `dist/` (dove la copia esbuild). */
function indirizzo (parametri: ParametriDialogo): string {
  // Parametri nella query: la pagina li ha già al primo disegno.
  return `registro://app/dist/dialog.html?p=${encodeURIComponent(JSON.stringify(parametri))}`
}

/**
 * La finestra di dialogo generica, parametrizzata dal tipo. Annullare (Esc, X,
 * bottone) risolve con `null`, mai con un rifiuto.
 */
function chiedi (
  parametri: ParametriDialogo,
  larghezza: number,
  valida?: (testo: string) => Promise<string | null | undefined>,
): Promise<EsitoDialogo> {
  ascolta()
  const padre = finestraPadre()
  const finestra = new BrowserWindow({
    width: larghezza,
    height: 200,
    parent: padre,
    modal: padre !== undefined,
    // Si mostra quando la pagina dice quanto è alta, per non farla saltare.
    show: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: parametri.titolo,
    backgroundColor: coloreSfondo(),
    ...icona(),
    webPreferences: preferenzeConPonte(),
  })
  chiudiLeVieDiFuga(finestra)
  const contenuti = finestra.webContents.id
  diDialogo.add(contenuti)

  return new Promise<EsitoDialogo>((risolvi) => {
    let risolto = false
    // Convalide in fila: `validateInput` può essere asincrona, e l'ultima
    // risposta deve essere quella dell'ultimo testo.
    let convalide: Promise<unknown> = Promise.resolve()
    const convalida = (testo: string): Promise<string | null> => {
      const esito = convalide.then(async () => (valida ? ((await valida(testo)) ?? null) : null))
      convalide = esito.catch(() => undefined)
      return esito
    }
    const finisci = (risposta: EsitoDialogo) => {
      if (risolto) return
      risolto = true
      risolvi(risposta)
      if (!finestra.isDestroyed()) finestra.close()
    }

    aperti.set(contenuti, (risposta) => {
      switch (risposta.dialogo) {
        case 'conferma':
          if (!valida) {
            finisci(risposta)
            break
          }
          // Si riconvalida il testo confermato, senza fidarsi del bottone; se
          // non va, la finestra resta aperta con l'errore.
          void convalida(risposta.testo ?? '').then(
            (errore) => {
              if (!errore) {
                finisci(risposta)
                return
              }
              if (finestra.isDestroyed()) return
              finestra.webContents.send(CANALE, { dialogo: 'errore', messaggio: errore })
            },
            // Una convalida che si rompe non trattiene il testo: si conferma.
            (guasto: unknown) => {
              console.error('convalida alla conferma non riuscita', guasto)
              finisci(risposta)
            },
          )
          break

        case 'annulla':
          finisci(null)
          break

        case 'valida':
          // Qui e non nella pagina: `validateInput` è una funzione, non passa l'IPC.
          void convalida(risposta.testo ?? '').then(
            (errore) => {
              if (finestra.isDestroyed()) return
              finestra.webContents.send(CANALE, { dialogo: 'errore', messaggio: errore })
            },
            (guasto: unknown) => console.error('convalida non riuscita', guasto),
          )
          break

        case 'altezza': {
          // La finestra si adatta all'altezza della pagina disegnata.
          if (finestra.isDestroyed()) return
          // Tetto: lo schermo meno un margine; il resto scorre nella pagina
          // (`overflow-y` in `shell/pages/dialog/`).
          const schermo = screen.getDisplayMatching(finestra.getBounds()).workAreaSize.height
          finestra.setContentSize(larghezza, limita(risposta.valore, 120, schermo - 80))
          finestra.center()
          finestra.show()
          break
        }
      }
    })

    // La X, e ogni altra via d'uscita: come Esc.
    finestra.on('closed', () => {
      aperti.delete(contenuti)
      diDialogo.delete(contenuti)
      finisci(null)
    })

    // Una finestra invisibile lascerebbe la promessa appesa: se la pagina non
    // arriva si rinuncia, se non dice l'altezza la si mostra lo stesso.
    finestra.webContents.on('did-fail-load', () => finisci({ dialogo: 'nonCaricata' }))
    finestra.webContents.on('did-finish-load', () => mostraComunque(finestra))

    void finestra.loadURL(indirizzo(parametri))
  })
}

export async function showInputBox (opzioni: OpzioniInputBox = {}): Promise<string | undefined> {
  const valida = async (testo: string): Promise<string | null | undefined> =>
    opzioni.validateInput ? await opzioni.validateInput(testo) : null

  const risposta = await chiedi(
    {
      tipo: 'input',
      // testo-fisso: il marchio non si traduce
      titolo: opzioni.title ?? 'Regiclass',
      invito: opzioni.prompt ?? '',
      valore: opzioni.value ?? '',
      segnaposto: opzioni.placeHolder ?? '',
      password: Boolean(opzioni.password),
    },
    520,
    valida,
  )
  if (!risposta || risposta.dialogo !== 'conferma' || risposta.testo === undefined) return undefined
  return risposta.testo
}

export async function showQuickPick<T extends VoceScelta> (
  voci: readonly T[] | Promise<readonly T[]>,
  opzioni: OpzioniQuickPick = {},
): Promise<T | undefined> {
  const elenco = await voci
  const risposta = await chiedi(
    {
      tipo: 'elenco',
      // testo-fisso: il marchio non si traduce
      titolo: opzioni.title ?? 'Regiclass',
      segnaposto: opzioni.placeHolder ?? parole().filtra,
      voci: elenco.map((voce) => ({
        etichetta: senzaSegnaposti(voce.label),
        descrizione: voce.description ?? '',
        dettaglio: voce.detail ?? '',
      })),
    },
    560,
  )
  if (!risposta || risposta.dialogo !== 'conferma' || risposta.indice === undefined) return undefined
  return elenco[risposta.indice]
}
