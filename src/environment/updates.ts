// Gli aggiornamenti del programma via `electron-updater` e il `latest.yml` delle
// release GitHub: controllo, scarico, installazione, e lo stato raccontato a
// parole (`racconta`) a pannello e benvenuto.
//
// Si aggiorna da sé solo l'installato su Windows; portabile, sviluppo e altri
// sistemi ricevono il motivo e la pagina delle release. `electron-updater` si
// carica con `createRequire` perché esbuild non lo impacchetti e le prove non lo
// carichino. L'installazione la conduce `updateInstaller.ts`; `autoInstallOnAppQuit`
// resta spento perché all'uscita decide `installaAllUscita`, dopo l'ultimo
// salvataggio. Esce solo la richiesta a `github.com`, nessun dato del registro.

import { app } from 'electron'
import { createRequire } from 'node:module'
import * as percorso from 'node:path'

import type { AppUpdater, NsisUpdater, ProgressInfo, UpdateDownloadedEvent, UpdateInfo } from 'electron-updater'

import type { FaseAggiornamenti, RaccontoAggiornamenti, StatoAggiornamenti } from '../protocol.js'
import { EventEmitter, type Smaltibile } from './events.js'
import { getConfiguration, onDidChangeConfiguration } from './settings.js'
import { consegnaAllAiutante } from './updateInstaller.js'
import { parole } from '../domain/words.testi.js'
import { testi } from './updates.testi.js'
import { istante, numero } from '../i18n/index.js'

/** Dove stanno le release: il ripiego quando da sé non si può. */
const PAGINA_RELEASE = 'https://github.com/nabre/Registro/releases/latest'

/** Attesa prima del primo controllo, per non appesantire l'avvio. */
const ATTESA_PRIMO_CONTROLLO_MS = 30_000

/** Intervallo minimo fra due annunci dello scarico. */
const RESPIRO_MS = 250

const emettitore = new EventEmitter<StatoAggiornamenti>()

/** Scatta quando lo stato cambia. */
export const alCambioAggiornamenti = emettitore.event

/** Lo stato senza le parole, che aggiunge `statoAggiornamenti`. */
type Grezzo = Omit<StatoAggiornamenti, 'racconto'>

let stato: Grezzo | null = null
let aggiornatore: AppUpdater | null = null
let ultimoRacconto = 0

/** L'installatore scaricato e l'impronta per ricontrollarlo prima del lancio. */
let scaricato: { file: string, sha512?: string } | null = null

/**
 * A chi è consegnata l'installazione: alla `finestra`, o all'installatore `muto`
 * di electron-updater da lanciare all'uscita (se la finestra non è partita).
 */
let consegnata: { a: 'finestra' } | { a: 'muto', riapri: boolean } | null = null

function impostazione<T> (chiave: string, ripiego: T): T {
  return getConfiguration('registroDocenti.aggiornamenti').get<T>(chiave, ripiego) ?? ripiego
}

/** Se questo registro si può aggiornare da sé, e se no perché. */
function supporto (): { supportato: boolean, motivo?: string } {
  if (!app.isPackaged) return { supportato: false, motivo: testi().inSviluppo }
  if (process.env.PORTABLE_EXECUTABLE_DIR) return { supportato: false, motivo: testi().portabile }
  if (process.platform !== 'win32') return { supportato: false, motivo: testi().altroSistema }
  return { supportato: true }
}

/** Lo stato nudo, creato alla prima domanda. */
function adesso (): Grezzo {
  stato ??= {
    versione: app.getVersion(),
    ...supporto(),
    fase: 'fermo',
    pagina: PAGINA_RELEASE,
  }
  return stato
}

/** Lo stato con le parole, ricalcolate a ogni uscita perché seguano la lingua. */
export function statoAggiornamenti (): StatoAggiornamenti {
  const s = { ...adesso(), ...supporto() }
  return { ...s, racconto: racconta(s) }
}

/** Cambia lo stato e lo annuncia; `errore` vale solo per il passo in cui nasce. */
function passa (fase: FaseAggiornamenti, altro: Partial<Grezzo> = {}): void {
  const { errore: _vecchio, ...resto } = adesso()
  stato = { ...resto, fase, ...altro }
  emettitore.fire(statoAggiornamenti())
}

// ------------------------------------------------------------- le parole
//
// Qui e non nelle pagine (vedi `RaccontoAggiornamenti` in `protocol.ts`).

/** Una data ISO nella lingua attuale: «23 settembre 2026, 14:05». */
function quando (iso: string | undefined, conOra = true): string {
  if (!iso) return ''
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return ''
  return istante(data, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(conOra ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

/** Megabyte con un decimale. */
function mega (byte: number): string {
  // testo-fisso: il simbolo dei megabyte è lo stesso in ogni lingua
  return `${numero(byte / 1_048_576, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`
}

/** Il gesto «Controlla adesso». */
function controlla (): { tipo: 'aggiornamenti.controlla', testo: string } {
  return { tipo: 'aggiornamenti.controlla', testo: testi().controllaAdesso }
}

/** Lo stato a parole: pastiglia, frase, gesto. Esportata per le prove. */
export function racconta (s: Grezzo): RaccontoAggiornamenti {
  const t = testi()
  if (!s.supportato) {
    return {
      breve: t.aManoBreve,
      frase: s.motivo ?? t.nonSiAggiorna,
      tono: 'quiete',
      gesto: { tipo: 'pagina', testo: t.apriLeRelease },
    }
  }

  const nuova = s.nuova?.versione ?? t.nuova
  // Scarico fallito: la frase lo dice in coda e il gesto resta «Scarica».
  const eppure = s.errore && s.fase !== 'errore' ? ` ${s.errore}` : ''

  switch (s.fase) {
    case 'controllo':
      return {
        breve: t.controlloBreve,
        frase: t.controlloFrase,
        tono: 'informativo',
        gesto: { ...controlla(), testo: t.controllando, spento: true },
      }
    case 'aggiornato':
      return {
        breve: t.aggiornatoBreve,
        frase: t.aggiornatoFrase + (s.ultimoControllo ? t.ultimoControllo(quando(s.ultimoControllo)) : ''),
        tono: 'positivo',
        gesto: controlla(),
      }
    case 'errore':
      return {
        breve: t.erroreBreve,
        frase: s.errore ?? t.erroreFrase,
        tono: 'attenzione',
        gesto: controlla(),
      }
    case 'disponibile':
      return {
        breve: t.disponibileBreve(nuova),
        frase: t.disponibileFrase(nuova, quando(s.nuova?.data, false), eppure),
        tono: 'informativo',
        gesto: { tipo: 'aggiornamenti.scarica', testo: parole().scarica },
        notizia: nuova,
      }
    case 'scarico': {
      const totale = s.totale ?? 0
      const quota = totale > 0 ? Math.min(1, (s.byte ?? 0) / totale) : undefined
      return {
        breve: quota === undefined
          ? t.scaricoBreve(nuova)
          : t.scaricoBreveQuota(nuova, Math.round(quota * 100)),
        frase: quota === undefined
          ? t.scaricoFrase(nuova)
          : t.scaricoFraseQuota(nuova, mega(s.byte ?? 0), mega(totale)),
        tono: 'informativo',
        ...(quota === undefined ? {} : { quota }),
        notizia: nuova,
      }
    }
    case 'pronto':
      return {
        breve: t.pronta(nuova),
        frase: impostazione('installaAllaChiusura', true) ? t.prontaAllUscita(nuova) : t.prontaAMano(nuova),
        tono: 'positivo',
        gesto: { tipo: 'aggiornamenti.installa', testo: t.riavviaEAggiorna },
        notizia: t.pronta(nuova),
      }
    case 'installazione':
      return {
        breve: t.installazioneBreve,
        frase: t.installazioneFrase(nuova),
        tono: 'informativo',
        notizia: t.pronta(nuova),
      }
    default:
      return {
        breve: t.fermoBreve,
        frase: impostazione('controlloAutomatico', true) ? t.fermoDaSé : t.fermoSpento,
        tono: 'quiete',
        gesto: controlla(),
      }
  }
}

/** Le note di una release come testo semplice. */
function testoDelleNote (note: UpdateInfo['releaseNotes']): string | undefined {
  if (!note) return undefined
  const grezzo = typeof note === 'string'
    ? note
    : note.map((voce) => voce.note ?? '').filter(Boolean).join('\n\n')
  // GitHub le dà in HTML: si tolgono le etichette.
  const pulito = grezzo
    .replace(/<\/(p|li|h\d)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return pulito || undefined
}

function nuovaDa (info: UpdateInfo): StatoAggiornamenti['nuova'] {
  const note = testoDelleNote(info.releaseNotes)
  return {
    versione: info.version,
    ...(info.releaseDate ? { data: info.releaseDate } : {}),
    ...(note ? { note } : {}),
  }
}

/** Una frase leggibile al posto dell'errore grezzo. */
function motivoDi (errore: unknown): string {
  const grezzo = errore instanceof Error ? errore.message : String(errore)
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|net::ERR_/i.test(grezzo)) return testi().senzaRete
  if (/404/.test(grezzo)) return testi().senzaRelease
  if (/sha512|checksum/i.test(grezzo)) return testi().scartato
  // Solo la prima riga; la traccia intera va in console.
  return grezzo.split('\n')[0].slice(0, 240)
}

/** L'aggiornatore, creato e regolato al primo uso; `null` se non supportato. */
function prendiAggiornatore (): AppUpdater | null {
  if (aggiornatore) return aggiornatore
  if (!adesso().supportato) return null

  // `__filename`: nel bundle CommonJS del main process `import.meta` non esiste.
  const richiedi = createRequire(__filename)
  const { autoUpdater } = richiedi('electron-updater') as typeof import('electron-updater')
  aggiornatore = autoUpdater

  // Scarico e installazione all'uscita li decide il registro, secondo le impostazioni.
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false
  autoUpdater.logger = console

  autoUpdater.on('checking-for-update', () => passa('controllo'))
  autoUpdater.on('update-not-available', () => {
    passa('aggiornato', { ultimoControllo: new Date().toISOString() })
  })
  autoUpdater.on('update-available', (info: UpdateInfo) => {
    passa('disponibile', { nuova: nuovaDa(info), ultimoControllo: new Date().toISOString() })
    if (impostazione('scaricoAutomatico', true)) void scaricaAggiornamento()
  })
  autoUpdater.on('download-progress', (avanzamento: ProgressInfo) => {
    const adesso = Date.now()
    if (adesso - ultimoRacconto < RESPIRO_MS) return
    ultimoRacconto = adesso
    passa('scarico', { byte: avanzamento.transferred, totale: avanzamento.total })
  })
  autoUpdater.on('update-downloaded', (info: UpdateDownloadedEvent) => {
    scaricato = { file: info.downloadedFile, sha512: improntaDichiarata(info) }
    passa('pronto', { nuova: nuovaDa(info), byte: undefined, totale: undefined })
  })
  autoUpdater.on('error', (errore: Error) => {
    console.warn('Aggiornamenti:', errore)
    // A metà scarico si resta su «disponibile» per poter riprovare.
    const fase: FaseAggiornamenti = adesso().nuova ? 'disponibile' : 'errore'
    passa(fase, { errore: motivoDi(errore), byte: undefined, totale: undefined })
  })

  return autoUpdater
}

/**
 * Chiede a GitHub se c'è una versione nuova; l'esito arriva nello stato. Non
 * parte durante un altro controllo, uno scarico o con la versione già pronta.
 */
export function controllaAggiornamenti (): void {
  const suo = prendiAggiornatore()
  if (!suo) return
  const { fase } = adesso()
  if (fase === 'controllo' || fase === 'scarico' || fase === 'pronto' || fase === 'installazione') return
  passa('controllo')
  suo.checkForUpdates().catch((errore: unknown) => {
    // Se l'evento `error` non l'ha già detto.
    if (adesso().fase === 'controllo') passa('errore', { errore: motivoDi(errore) })
  })
}

/** Scarica la versione trovata, se c'è. */
export async function scaricaAggiornamento (): Promise<void> {
  const suo = prendiAggiornatore()
  if (!suo) return
  const { fase } = adesso()
  if (fase !== 'disponibile') return
  passa('scarico', { byte: 0, totale: 0 })
  try {
    await suo.downloadUpdate()
  } catch (errore) {
    if (adesso().fase === 'scarico') {
      passa('disponibile', { errore: motivoDi(errore), byte: undefined, totale: undefined })
    }
  }
}

/**
 * L'impronta che `latest.yml` dichiara per il file scaricato, cercata per nome:
 * una sbagliata bloccherebbe un aggiornamento buono.
 */
function improntaDichiarata (info: UpdateDownloadedEvent): string | undefined {
  const nome = percorso.basename(info.downloadedFile)
  const voce = info.files.find((file) => {
    try {
      return decodeURIComponent(percorso.basename(file.url)) === nome
    } catch {
      return false
    }
  })
  return voce?.sha512
}

/**
 * Consegna l'installazione alla finestra o, se non parte, all'installatore muto
 * all'uscita. Falso se non c'è niente da installare o l'installatore non va più.
 */
async function consegna (riapri: boolean): Promise<boolean> {
  const { fase, nuova } = adesso()
  if (!prendiAggiornatore() || fase !== 'pronto' || !scaricato || !nuova || consegnata) return false
  const file = scaricato
  passa('installazione')
  try {
    const presa = await consegnaAllAiutante({
      installatore: file.file,
      ...(file.sha512 ? { sha512: file.sha512 } : {}),
      da: app.getVersion(),
      a: nuova.versione,
      riapri,
      pagina: PAGINA_RELEASE,
    })
    consegnata = presa ? { a: 'finestra' } : { a: 'muto', riapri }
    return true
  } catch (errore) {
    // Installatore sparito o cambiato: si torna a «Scarica».
    console.warn('Aggiornamenti:', errore)
    scaricato = null
    passa('disponibile', { errore: motivoDi(errore) })
    return false
  }
}

/**
 * «Riavvia e aggiorna»: consegna, poi esce con `app.quit()` (passando da
 * `before-quit` e dall'ultimo salvataggio). Torna subito.
 */
export function installaAggiornamento (): boolean {
  if (!prendiAggiornatore() || adesso().fase !== 'pronto' || !scaricato || consegnata) {
    return false
  }
  void consegna(true).then((consegnato) => {
    if (consegnato) app.quit()
  })
  return true
}

/**
 * Installazione all'uscita, da `before-quit` dopo l'ultimo salvataggio: lancia
 * l'installatore muto se la finestra non è partita, o con `installaAllaChiusura`
 * installa senza riaprire. Mai mentre Windows si spegne: resterebbe a metà.
 */
export async function installaAllUscita (sessioneFinita: boolean): Promise<void> {
  const suo = aggiornatore
  if (!suo || sessioneFinita || !adesso().supportato) return

  if (!consegnata) {
    if (!impostazione('installaAllaChiusura', true)) return
    if (!(await consegna(false))) return
  }
  if (consegnata?.a !== 'muto') return
  // Nella cartella attuale (`/D=` all'installatore).
  const nsis = suo as NsisUpdater
  nsis.installDirectory = percorso.dirname(process.execPath)
  // Silenzioso: senza la finestra nostra, meglio nessuna che quella di NSIS.
  nsis.install(true, consegnata.riapri)
}

/** Ore fra un controllo e l'altro, per un registro che resta acceso a lungo. */
const ORE_FRA_I_CONTROLLI = 6

/**
 * Accende i controlli: il primo poco dopo l'avvio, poi a intervalli. Solo
 * `controlloAutomatico` riavvia il giro; le altre voci si leggono al momento.
 */
export function avviaAggiornamenti (): Smaltibile {
  let primo: NodeJS.Timeout | null = null
  let giro: NodeJS.Timeout | null = null

  const ferma = (): void => {
    if (primo) clearTimeout(primo)
    if (giro) clearInterval(giro)
    primo = null
    giro = null
  }

  const regola = (): void => {
    ferma()
    if (!adesso().supportato) return
    if (!impostazione('controlloAutomatico', true)) return
    primo = setTimeout(controllaAggiornamenti, ATTESA_PRIMO_CONTROLLO_MS)
    giro = setInterval(controllaAggiornamenti, ORE_FRA_I_CONTROLLI * 3_600_000)
    // I timer non tengono acceso il processo.
    primo.unref()
    giro.unref()
  }

  regola()
  const ascolto = onDidChangeConfiguration((evento) => {
    if (!evento.affectsConfiguration('registroDocenti.aggiornamenti')) return
    if (evento.affectsConfiguration('registroDocenti.aggiornamenti.controlloAutomatico')) regola()
    // Le frasi dipendono da queste voci: si ripubblicano.
    emettitore.fire(statoAggiornamenti())
  })

  return {
    dispose: () => {
      ferma()
      ascolto.dispose()
    },
  }
}
