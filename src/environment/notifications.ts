// Le notifiche del sistema operativo.
//
// Poche righe sopra `Notification` di Electron, ma due cose meritano di essere
// dette perché senza si perde un pomeriggio.
//
// **L'identità su Windows.** Windows non mostra le notifiche di un programma
// che non sa nominare: gli serve un *AppUserModelID*, e senza quello la
// notifica parte, non dà errore, e non compare. Installato ce lo mette
// l'installer, nel collegamento del menu di avvio; il portabile e i sorgenti
// usano un'identità propria e la registrano da sé — vedi `dichiaraIdentita`.
//
// Lo stesso identificatore serve poi a una cosa che con le notifiche non
// c'entra, ed è il motivo per cui `dichiaraIdentita()` si chiama all'avvio e
// non alla prima notifica: la barra delle applicazioni lo legge quando una
// finestra nasce, per sapere di chi è il pulsante e a quale collegamento
// appuntarlo. Dichiararlo dopo non riscrive le finestre già aperte.
//
// **Il permesso.** Non si chiede: `Notification.isSupported()` dice se il
// sistema le regge, e se l'utente le ha spente nelle impostazioni di Windows
// non c'è niente da fare né da segnalare — le ha spente apposta.

import { app, BrowserWindow, Notification } from 'electron'
import { execFile } from 'node:child_process'
import { copyFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { percorsoIcona } from './context.js'

/**
 * Lo stesso di `electron-builder.json`.
 *
 * Scritto due volte, e non si può evitare: qui serve prima che esista un
 * pacchetto, là serve per costruirlo. Che i due non divergano lo controlla la
 * costruzione — `verificaIdentita()` in `esbuild.mjs` — e si ferma dicendolo:
 * divergenti, il registro appuntato alla barra delle applicazioni non si
 * riapre e le notifiche si sdoppiano nel centro notifiche di Windows.
 *
 * La riga si legge da lì con un'espressione regolare: cambiandone la forma —
 * il nome, le virgolette, l'andare a capo — va cambiata anche quella.
 */
const IDENTITA = 'ch.edu.ti.cptt.registro-docenti'

/**
 * L'identità del portabile, che è un'altra.
 *
 * Con la stessa dell'installato, sulla macchina che li ha tutti e due le
 * finestre del portabile finivano sotto il pin dell'installato, e il pin
 * riapriva l'installato. Due programmi, due identità. Si deve chiamare così
 * anche in `src/cli/disinstalla.mjs`, che ne toglie la registrazione.
 */
const IDENTITA_PORTABILE = `${IDENTITA}.portabile`

/**
 * L'identità di chi lancia da sorgenti, che è un'altra ancora.
 *
 * Da sorgenti l'eseguibile è `electron.exe`, e nessun collegamento lo lega al
 * registro. Con l'identità dell'installato, per avere le notifiche si finiva a
 * fare a mano un collegamento del menu di avvio — `Electron.lnk`, su
 * `electron.exe` senza argomenti — e quel collegamento si prendeva l'identità
 * anche per il registro **installato**: notifiche intestate «Electron», e un
 * clic sulla notifica o sul pin che apriva la finestra vuota di Electron,
 * «electron.exe path-to-app». Un'identità propria, registrata senza
 * collegamento come quella del portabile, e l'installato non si tocca più.
 */
const IDENTITA_SVILUPPO = `${IDENTITA}.sviluppo`

/** L'identità di questo processo, secondo come è stato lanciato. */
function identitaDiQuestoProcesso (): string {
  if (process.env.PORTABLE_EXECUTABLE_FILE) return IDENTITA_PORTABILE
  return app.isPackaged ? IDENTITA : IDENTITA_SVILUPPO
}

/**
 * Da chiamare all'avvio, prima di aprire qualunque finestra.
 *
 * Il posto giusto è uno solo ed è in cima a `shell/main.ts`: l'identità
 * conta anche per la barra delle applicazioni, che la legge quando la finestra
 * nasce. Le chiamate che restano sparse — qui sotto i promemoria, là il primo
 * avviso del vassoio — sono la rete di sicurezza di chi le notifiche le mostra:
 * stanno in `src/`, che non sa se sopra di sé c'è il guscio del registro o una
 * prova, e ripeterla non costa niente perché dopo la prima volta non fa nulla.
 */
let dichiarata = false
export function dichiaraIdentita (): void {
  if (dichiarata || process.platform !== 'win32') return
  dichiarata = true

  // La via d'uscita, per capire da quale parte viene l'icona sbagliata.
  //
  // `REGISTRO_SENZA_IDENTITA=1` salta la dichiarazione: le notifiche non
  // compaiono più, e la barra delle applicazioni torna a prendere l'icona dalla
  // finestra. È il modo di sapere quale delle due cose sta parlando, e va usato
  // per una prova e non per lavorare.
  if (process.env.REGISTRO_SENZA_IDENTITA === '1') {
    console.log('identità Windows: NON dichiarata (REGISTRO_SENZA_IDENTITA=1)')
    return
  }

  // Tre identità per tre modi di girare. Installato — per tutti gli utenti o
  // per uno solo — nome e icona li dà a Windows il collegamento che l'installer
  // ha messo nel menu di avvio. Il portabile e i sorgenti un collegamento non
  // ce l'hanno, e se li registrano da sé.
  const identita = identitaDiQuestoProcesso()
  app.setAppUserModelId(identita)
  const eseguibile = process.env.PORTABLE_EXECUTABLE_FILE
  if (eseguibile) {
    appuntabileDalPortabile(eseguibile)
    const icona = iconaCheResta(app.getPath('userData'))
    if (icona) registraSenzaCollegamento(identita, app.getName(), icona)
  } else if (!app.isPackaged) {
    const icona = percorsoIcona()
    if (icona) registraSenzaCollegamento(identita, `${app.getName()} (sviluppo)`, icona)
  }
}

/**
 * Il portabile appuntato alla barra delle applicazioni, che si riapre.
 *
 * Il portabile gira da una copia estratta in `%TEMP%`, che l'avviatore butta
 * alla chiusura, e nessun collegamento porta la sua identità: appuntandolo,
 * Windows lega il pulsante a `process.execPath` — cioè a quella copia — e alla
 * chiusura resta un pin con l'icona bianca che dice «elemento non trovato».
 * Qui ogni finestra dice a Windows da dove si riavvia e con che icona: l'`.exe`
 * sulla chiavetta, che è `PORTABLE_EXECUTABLE_FILE`. Installato non serve — il
 * collegamento dell'installer ha già tutto — e da sorgenti non c'è la variabile.
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
 * L'icona del portabile, copiata dove sopravvive alla chiusura.
 *
 * Quella del programma sta nella copia estratta in `%TEMP%`, che l'avviatore
 * butta a ogni chiusura: Windows la rilegge quando mostra una notifica, anche
 * dal centro notifiche a programma chiuso. La cartella dei dati sta accanto
 * all'eseguibile, e se ne va con «Disinstalla…».
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
 * Nome e icona di un'identità che nessun collegamento dichiara.
 *
 * Windows intesta le notifiche con il nome e l'icona del collegamento del menu
 * di avvio che porta l'identità. Senza collegamento le intestava con
 * l'identità grezza e senza icona, o non le mostrava. La via senza collegamento
 * è la chiave `AppUserModelId` in `HKCU`, con `DisplayName` e `IconUri`.
 *
 * Quella del portabile la toglie «Disinstalla…» (`src/cli/disinstalla.mjs`);
 * una chiavetta buttata senza passare di lì lascia una chiave che nomina un
 * file che non c'è, e vale solo per le notifiche di quell'identità.
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

/** Se il sistema può mostrarle. Falso su una macchina senza centro notifiche. */
export function notificheDisponibili (): boolean {
  return Notification.isSupported()
}

interface Avviso {
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
