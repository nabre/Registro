// Il menu dell'applicazione e la finestra delle impostazioni. Tutti e due
// nascono da `src/manifest.ts` (`COMANDI`, `IMPOSTAZIONI`): qui si scrive solo
// l'ordine dei gruppi del menu (`GRUPPI`).

import { app, BrowserWindow, dialog, ipcMain, Menu, type MenuItemConstructorOptions } from 'electron'

import { executeCommand, registerCommand } from '../../src/environment/commands.js'
import { icona } from '../../src/environment/context.js'
import { alCambioDocumenti, documentiNoti } from '../../src/environment/documents.js'
import { CANALE } from '../../src/environment/channels.js'
import {
  getConfiguration,
  impostazioneDichiarata,
  onDidChangeConfiguration,
  valoreConMotivo,
  dialogoPercorso,
  vociImpostazioni,
} from '../../src/environment/settings.js'
import { postoDi, ricordaPosto } from '../../src/environment/placement.js'
import { coloreSfondo, preferenzeConPonte } from '../../src/environment/theme.js'
import { chiudiLeVieDiFuga } from '../../src/environment/navigation.js'
import { mostraComunque } from '../../src/environment/showAnyway.js'
import { COMANDI, titoloImpostazioni, type Comando } from '../../src/manifest.js'
import { alCambioLingua } from '../../src/i18n/index.js'
import { parole } from '../../src/domain/words.testi.js'
import { testi, type GruppoDelMenu } from './menu.testi.js'

// ------------------------------------------------------------------- il menu

export interface Azioni {
  /** Apre un `.regi`, dal percorso dato o scelto con il dialogo (vedi `main.ts`). */
  apriDocumento (percorso?: string): Promise<void>
  /**
   * «Disinstalla…» (vedi `shell/system/uninstall.ts`). Facoltativa perché le
   * prove installano il menu senza.
   */
  disinstalla?: () => Promise<void>
}

/**
 * I gruppi del menu e l'ordine dentro ognuno. Titoli e scorciatoie vengono dal
 * manifesto; un comando del manifesto non nominato qui finisce sotto «Altro».
 * L'etichetta del gruppo si legge dal catalogo quando il menu si costruisce.
 */
const GRUPPI: ReadonlyArray<{ gruppo: GruppoDelMenu, comandi: readonly string[] }> = [
  // Come la barra del pannello: il documento e il programma, poi dove si va,
  // poi che cosa si fa.
  {
    gruppo: 'registro',
    comandi: [
      'registroDocenti.apri',
      'registroDocenti.ricarica',
      'registroDocenti.salvaConNome',
      'registroDocenti.chiudiDocumento',
    ],
  },
  {
    gruppo: 'vaiA',
    comandi: [
      'registroDocenti.oggi',
      'registroDocenti.impostazioni',
      'registroDocenti.guida',
    ],
  },
  {
    gruppo: 'nuovo',
    comandi: [
      'registroDocenti.nuovaLezione',
      'registroDocenti.nuovaClasse',
      'registroDocenti.nuovoCorso',
      'registroDocenti.nuovoPiano',
      'registroDocenti.nuovaValutazione',
      'registroDocenti.nuovoAnno',
    ],
  },
  {
    gruppo: 'schermo',
    comandi: ['registroDocenti.proietta'],
  },
  {
    gruppo: 'posta',
    comandi: [
      'registroDocenti.collegaPosta',
      'registroDocenti.provaPosta',
      'registroDocenti.provaInvioPosta',
      'registroDocenti.scollegaPosta',
      'registroDocenti.azzeraPosta',
    ],
  },
  {
    gruppo: 'cartelle',
    comandi: ['registroDocenti.apriCartellaDati'],
  },
]

/** Una voce che invoca un comando. L'`id` serve alle prove per riconoscerla. */
function voceDi (comando: Comando): MenuItemConstructorOptions {
  return {
    id: comando.id,
    label: comando.titolo,
    accelerator: comando.scorciatoia,
    click: () => void executeCommand(comando.id),
  }
}

/** Le voci di un gruppo, tolte da `rimasti` man mano che si consumano. */
function vociDelGruppo (
  nomi: readonly string[],
  rimasti: Map<string, Comando>,
): MenuItemConstructorOptions[] {
  const voci: MenuItemConstructorOptions[] = []
  for (const nome of nomi) {
    const comando = rimasti.get(nome)
    if (!comando) continue
    rimasti.delete(nome)
    voci.push(voceDi(comando))
  }
  return voci
}

/**
 * Gli anni già visti, preferiti in cima (lo stesso elenco del pannello e del
 * benvenuto, `environment/documents.ts`). Da vuoto resta spento, perché le voci
 * vicine non si spostino.
 */
function vociRecenti (azioni: Azioni): MenuItemConstructorOptions {
  const noti = documentiNoti()
  const t = testi()
  return {
    label: t.apriRecente,
    enabled: noti.length > 0,
    submenu: noti.map((file) => ({
      // Un file mancante (chiavetta staccata, cartella non sincronizzata) si vede e non si preme.
      label: `${file.preferito ? '★ ' : ''}${file.nome}${file.mancante ? ` — ${t.nonDisponibile}` : ''}`,
      sublabel: file.cartella,
      toolTip: file.percorso,
      enabled: !file.mancante,
      click: () => void azioni.apriDocumento(file.percorso),
    })),
  }
}

/** Le voci che non vengono da un comando del registro. */
function vociNostre (azioni: Azioni): MenuItemConstructorOptions[] {
  const t = testi()
  return [
    { type: 'separator' },
    {
      label: t.apri,
      accelerator: 'CommandOrControl+O',
      click: () => void azioni.apriDocumento(),
    },
    vociRecenti(azioni),
    {
      // Senza acceleratore: `CommandOrControl+,` è della voce «Impostazioni» di
      // «Vai a», che apre la pagina del registro. Questa apre la finestra nativa.
      label: t.impostazioniDelProgramma,
      click: () => apriImpostazioni(),
    },
    ...(azioni.disinstalla
      ? [
          { type: 'separator' as const },
          { label: t.disinstalla, click: () => void azioni.disinstalla?.() },
        ]
      : []),
  ]
}

/** Il menu «Modifica», solo ruoli: su macOS taglia, copia e incolla nei campi passano di qui. */
function menuModifica (): MenuItemConstructorOptions {
  // Ctrl+Z e Ctrl+Y non si registrano come acceleratori, o Electron li
  // consumerebbe prima della pagina, che li vuole (`tastoDellaStoria` in
  // `src/ui/shortcuts.ts`). Su macOS sì: l'annulla dei campi passa da questo menu.
  const registra = process.platform === 'darwin'
  const t = testi()
  return {
    label: t.modifica,
    submenu: [
      { role: 'undo', label: t.annullaGesto, registerAccelerator: registra },
      { role: 'redo', label: t.ripeti, registerAccelerator: registra },
      { type: 'separator' },
      { role: 'cut', label: t.taglia },
      { role: 'copy', label: parole().copia },
      { role: 'paste', label: parole().incolla },
      { role: 'selectAll', label: t.selezionaTutto },
    ],
  }
}

function menuVisualizza (): MenuItemConstructorOptions {
  const t = testi()
  return {
    label: t.visualizza,
    submenu: [
      { role: 'resetZoom', label: t.dimensioneNormale },
      { role: 'zoomIn', label: t.ingrandisci },
      { role: 'zoomOut', label: t.riduci },
      { type: 'separator' },
      { role: 'togglefullscreen', label: t.schermoIntero },
      { role: 'toggleDevTools', label: t.strumentiDiSviluppo },
    ],
  }
}

/** Esportata per le prove: è il modello che si dà a `Menu.buildFromTemplate`. */
export function modelloDelMenu (azioni: Azioni): MenuItemConstructorOptions[] {
  const rimasti = new Map(COMANDI.map((comando) => [comando.id, comando]))
  const t = testi()

  const dalManifesto = GRUPPI.map(({ gruppo, comandi }) => ({
    gruppo,
    voci: vociDelGruppo(comandi, rimasti),
  }))

  // Le voci nostre vanno nel gruppo del documento, cercato per nome e non per posizione.
  const registro = dalManifesto.find((menu) => menu.gruppo === 'registro')
  if (registro) registro.voci.push(...vociNostre(azioni))

  // I comandi del manifesto senza gruppo: meglio in «Altro» che irraggiungibili.
  const orfani = [...rimasti.values()].map(voceDi)

  const modello: MenuItemConstructorOptions[] = []
  if (process.platform === 'darwin') modello.push({ role: 'appMenu' })

  for (const menu of dalManifesto) {
    if (menu.voci.length === 0) continue
    // Su Windows e Linux l'uscita sta in fondo al primo menu; su macOS la mette `appMenu`.
    if (menu.gruppo === 'registro' && process.platform !== 'darwin') {
      menu.voci.push({ type: 'separator' }, { role: 'quit', label: parole().esci })
    }
    modello.push({ label: t.gruppi[menu.gruppo], submenu: menu.voci })
  }

  // «Altro», «Modifica» e «Visualizza» sempre in coda, indipendenti dai nomi dei gruppi.
  if (orfani.length > 0) modello.push({ label: t.altro, submenu: orfani })
  modello.push(menuModifica(), menuVisualizza())

  return modello
}

/**
 * Le azioni dell'ultima installazione, e se ci si è già iscritti ai cambi.
 * `installaMenu` può essere chiamata più volte (le prove): l'iscrizione resta
 * una e lavora con le azioni di adesso.
 */
let azioniCorrenti: Azioni | null = null
let seguiDocumenti = false

function ridisegnaMenu (): void {
  if (!azioniCorrenti) return
  Menu.setApplicationMenu(Menu.buildFromTemplate(modelloDelMenu(azioniCorrenti)))
}

export function installaMenu (azioni: Azioni): void {
  registerCommand('registroDocenti.apriDocumento', (percorso?: string) => azioni.apriDocumento(percorso))
  // La finestra nativa delle impostazioni, con un filtro facoltativo (`sorting.ts`
  // la apre sulle voci dell'OCR). Id distinto da `registroDocenti.impostazioni`,
  // la pagina del pannello: `registerCommand` fa `Map.set` e l'ultimo vincerebbe.
  registerCommand('registroDocenti.impostazioniFinestra', (filtro?: string) => {
    apriImpostazioni(typeof filtro === 'string' ? filtro : '')
  })

  azioniCorrenti = azioni
  ridisegnaMenu()

  // Il menu di Electron è una fotografia: si ricostruisce quando cambiano i recenti.
  if (!seguiDocumenti) {
    seguiDocumenti = true
    alCambioDocumenti(ridisegnaMenu)
    // E quando cambia la lingua.
    alCambioLingua(ridisegnaMenu)
  }
}

// ------------------------------------------------------------ le impostazioni

/** Riesportato per le prove del menu; lo costruisce `environment/settings.ts`. */
export { vociImpostazioni }

/** Quel che la pagina delle impostazioni manda al main process. */
export type RichiestaImpostazioni =
  | { impostazioni: 'pronto' }
  /** «Apri nel registro»: la pagina vera sta nel pannello, questa è il ripiego. */
  | { impostazioni: 'apriPannello' }
  | { impostazioni: 'scrivi', chiave: string, valore: unknown }
  | { impostazioni: 'azzera', chiave: string }
  /** «Sfoglia…» accanto a un percorso: il dialogo lo apre il main process. */
  | { impostazioni: 'sfoglia', chiave: string }

function eRichiesta (messaggio: unknown): messaggio is RichiestaImpostazioni {
  return typeof messaggio === 'object' && messaggio !== null && 'impostazioni' in messaggio
}

let finestra: BrowserWindow | null = null
let inAscolto = false

function viva (): BrowserWindow | null {
  return finestra && !finestra.isDestroyed() ? finestra : null
}

function ascolta (): void {
  if (inAscolto) return
  inAscolto = true
  // Canale condiviso: ognuno scarta i mittenti che non sono suoi.
  ipcMain.on(CANALE, (evento: { sender: { id: number } }, messaggio: unknown) => {
    const aperta = viva()
    if (!aperta || evento.sender.id !== aperta.webContents.id) return
    if (eRichiesta(messaggio)) void rispondi(aperta, messaggio)
  })
}

/**
 * Rimanda alla pagina l'elenco intero con i valori di adesso: un cambio può
 * toccare altre righe (spegnere `api.condotto` sospende `lettura` e
 * `scrittura`), o venire dal pannello. La pagina aggiorna in posto e lascia
 * stare il campo in cui si scrive.
 */
function annunciaTutto (aperta: BrowserWindow): void {
  aperta.webContents.send(CANALE, { impostazioni: 'valori', voci: vociImpostazioni() })
}

/** Il rifiuto della dogana, detto alla pagina (riquadro `.voce__errore`). */
function annunciaRifiuto (aperta: BrowserWindow, chiave: string, motivo: string): void {
  aperta.webContents.send(CANALE, { impostazioni: 'rifiuto', chiave, motivo })
}

async function rispondi (aperta: BrowserWindow, richiesta: RichiestaImpostazioni): Promise<void> {
  switch (richiesta.impostazioni) {
    case 'pronto':
      // Si mostra solo a pagina disegnata, per non apparire vuota.
      if (!aperta.isVisible()) aperta.show()
      break

    case 'apriPannello':
      // E questa si chiude, senza aspettare il pannello: due superfici sulle
      // stesse impostazioni sono una di troppo.
      void executeCommand('registroDocenti.impostazioni')
      aperta.close()
      break

    case 'scrivi': {
      const { valore, motivo } = valoreConMotivo(richiesta.chiave, richiesta.valore)
      if (valore === undefined) {
        annunciaRifiuto(aperta, richiesta.chiave, motivo ?? testi().valoreRifiutato)
        // Il campo torna a mostrare quel che è scritto nel file.
        annunciaTutto(aperta)
        return
      }
      // Da `update`, che fa scattare `onDidChangeConfiguration` per chi ascolta
      // (il pannello, e l'iscrizione che chiama `annunciaTutto`).
      await getConfiguration().update(richiesta.chiave, valore)
      break
    }

    case 'sfoglia': {
      // Il dialogo sta qui perché la pagina non vede il disco. La scelta passa
      // dalla stessa dogana di «scrivi».
      const scelta = dialogoPercorso(richiesta.chiave)
      if (!scelta) break
      const esito = await dialog.showOpenDialog(aperta, {
        title: scelta.titolo,
        buttonLabel: parole().scegliConferma,
        defaultPath: scelta.da ?? app.getPath('documents'),
        properties: [scelta.cartella ? 'openDirectory' : 'openFile'],
        filters: Object.entries(scelta.filtri).map(([name, extensions]) => ({ name, extensions })),
      })
      const scelto = esito.canceled ? undefined : esito.filePaths[0]
      if (!scelto) break
      const { valore, motivo } = valoreConMotivo(richiesta.chiave, scelto)
      if (valore === undefined) {
        annunciaRifiuto(aperta, richiesta.chiave, motivo ?? testi().percorsoRifiutato)
        return
      }
      await getConfiguration().update(richiesta.chiave, valore)
      break
    }

    case 'azzera':
      // Il main process non si fida: una chiave non dichiarata non si tocca.
      if (!impostazioneDichiarata(richiesta.chiave)) break
      // `undefined` toglie la riga: vale il predefinito del manifesto.
      await getConfiguration().update(richiesta.chiave, undefined)
      break
  }
}

/** La finestra delle impostazioni: una sola, e se c'è già la si porta davanti. */
function apriImpostazioni (filtro = ''): void {
  const gia = viva()
  if (gia) {
    gia.show()
    gia.focus()
    gia.webContents.send(CANALE, { impostazioni: 'filtro', testo: filtro })
    return
  }

  ascolta()
  const nata = new BrowserWindow({
    ...postoDi('impostazioni', { width: 820, height: 760, minWidth: 560 }),
    title: titoloImpostazioni(),
    show: false,
    backgroundColor: coloreSfondo(),
    ...icona(),
    // Qui il menu non ha niente da invocare.
    autoHideMenuBar: true,
    webPreferences: preferenzeConPonte(),
  })
  finestra = nata
  chiudiLeVieDiFuga(nata)
  ricordaPosto('impostazioni', nata)

  // Le due superfici guardano lo stesso file: questa si aggiorna a ogni cambio,
  // anche venuto dal pannello.
  const iscrizione = onDidChangeConfiguration(() => {
    if (!nata.isDestroyed()) annunciaTutto(nata)
  })

  nata.webContents.on('did-finish-load', () => {
    if (nata.isDestroyed()) return
    nata.webContents.send(CANALE, {
      impostazioni: 'schema',
      titolo: titoloImpostazioni(),
      voci: vociImpostazioni(),
      filtro,
    })
    // Se la pagina non dice di essersi disegnata, la si mostra lo stesso.
    mostraComunque(nata)
  })

  nata.on('closed', () => {
    // L'iscrizione vive quanto la finestra.
    iscrizione.dispose()
    if (finestra === nata) finestra = null
  })

  void nata.loadURL('registro://app/dist/settings.html')
}
