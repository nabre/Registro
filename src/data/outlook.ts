// Aprire un messaggio nuovo con Outlook, anche quando Outlook non è il
// programma predefinito.
//
// `mailto:` consegna l'indirizzo a chi il sistema tiene per la posta, e su una
// macchina di scuola quel «chi» è spesso qualcun altro: un client installato
// una volta e mai più aperto, un browser che si è preso l'associazione, o
// nessuno — e allora il clic non apre niente. Chi scrive alle famiglie lo fa
// da Outlook, e questo modulo è il modo di dirlo una volta nelle impostazioni
// invece di ricordarselo a ogni messaggio.
//
// L'eseguibile non si compone in una riga di comando: si chiama con i suoi
// argomenti separati, come fa `opening.ts` con i file. Un indirizzo con
// dentro una virgoletta o una `&` non può diventare un'altra istruzione.
//
// Quel che non riesce non resta in silenzio: chi chiama riceve `false` e
// ripiega sul `mailto:` di sempre, che è meglio di un pulsante che sembra
// rotto.

import { execFile, spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import * as percorso from 'node:path'

import * as apparato from 'apparato'

import { argomentiOutlook } from '../domain/contacts.js'

/**
 * Dove Outlook si installa, nell'ordine in cui vale la pena guardare.
 *
 * `root\\OfficeNN` è la forma che usa ogni Office moderno — quelli installati
 * con «clic e usa», cioè praticamente tutti — e il numero è la versione:
 * 16 è Office 2016 e tutto quel che è venuto dopo, compreso Microsoft 365.
 * Gli altri due sono le installazioni vecchie, che nelle scuole si trovano
 * ancora.
 */
/** Dove sta Outlook su macOS: una sola, perché le applicazioni stanno tutte lì. */
const APPLICAZIONE_MAC = '/Applications/Microsoft Outlook.app'

function candidatiWindows (): string[] {
  const programmi = [
    process.env['ProgramFiles'] ?? 'C:\\Program Files',
    process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)',
  ]
  const rami = ['root\\Office16', 'Office16', 'Office15', 'Office14']
  return programmi.flatMap((base) =>
    rami.map((ramo) => percorso.join(base, 'Microsoft Office', ramo, 'OUTLOOK.EXE')),
  )
}

/** Vero se il file c'è. Un Office installato altrove non è un errore, è una macchina diversa. */
async function esiste (percorso: string): Promise<boolean> {
  try {
    await access(percorso)
    return true
  } catch {
    return false
  }
}

/** Il primo dei percorsi che esiste davvero. */
async function primoCheEsiste (percorsi: string[]): Promise<string | null> {
  for (const candidato of percorsi) {
    if (await esiste(candidato)) return candidato
  }
  return null
}

/**
 * Quel che il registro di Windows dice di `OUTLOOK.EXE`.
 *
 * `App Paths` è l'elenco con cui Windows risponde a «dov'è quel programma?» —
 * è come fa `Esegui` a sapere che `outlook` è un programma — e vale anche per
 * le installazioni finite in un posto che nessuno indovinerebbe. Si legge con
 * `reg query`, che non apre nessuna finestra e non cambia niente.
 */
async function dalRegistro (): Promise<string | null> {
  const chiave =
    'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\OUTLOOK.EXE'
  const riga = await new Promise<string>((risolvi) => {
    try {
      // Per percorso intero: un `reg.exe` nella cartella del documento partirebbe al
      // posto di quello vero. Vedi `environment/system.ts`.
      execFile(apparato.diSistema('reg.exe'), ['query', chiave, '/ve'], (errore, uscita) =>
        risolvi(errore ? '' : uscita),
      )
    } catch {
      risolvi('')
    }
  })
  // La riga utile è «    (Predefinito)    REG_SZ    C:\...\OUTLOOK.EXE»: quel
  // che serve è l'ultimo pezzo, e il nome del valore è tradotto — cercarlo
  // per nome vorrebbe dire funzionare solo in inglese.
  const trovato = /REG_SZ\s+(.+\.exe)/i.exec(riga)?.[1]?.trim()
  return trovato ? trovato : null
}

/**
 * Vero se un percorso scritto a mano può essere quel che il registro fa partire.
 *
 * La stessa guardia di `dictation.ts` e `mtmd.ts`: assoluto, perché un percorso
 * relativo si risolve nella cartella di lavoro — che, aperto il registro con un
 * doppio clic, è la cartella del documento; e su Windows `.exe`, perché `.bat`,
 * `.cmd` e `.ps1` non sono programmi ma righe date a un interprete. Su macOS il
 * percorso è un `.app` che si passa a `open -a`, e il nome del file non si
 * guarda.
 */
export function outlookAccettabile (scritto: string): boolean {
  if (!percorso.isAbsolute(scritto)) return false
  return process.platform !== 'win32' || percorso.extname(scritto).toLowerCase() === '.exe'
}

/**
 * L'eseguibile di Outlook: quello scritto nelle impostazioni, o quello che si
 * trova da sé.
 *
 * Il percorso scritto a mano vince sempre, e oltre all'esistenza si controlla
 * soltanto la forma (`outlookAccettabile`): chi lo scrive sa dove ha installato
 * Office, e un controllo sul nome del file impedirebbe di puntare a una copia
 * portatile.
 */
async function eseguibileOutlook (): Promise<string | null> {
  const scritto = apparato.impostazioni
    .leggi('registroDocenti.recapiti')
    .get<string>('outlook')
    ?.trim()
  if (scritto) return outlookAccettabile(scritto) && (await esiste(scritto)) ? scritto : null

  if (process.platform === 'darwin') return primoCheEsiste([APPLICAZIONE_MAC])
  if (process.platform !== 'win32') return null

  return (await primoCheEsiste(candidatiWindows())) ?? (await dalRegistro())
}

/**
 * Apre Outlook su un messaggio nuovo già indirizzato. Torna falso se non c'è
 * verso, e allora chi chiama ripiega sul programma predefinito.
 */
export async function apriConOutlook (indirizzo: string): Promise<boolean> {
  const programma = await eseguibileOutlook()
  if (!programma) return false

  // Su macOS non si chiama l'applicazione: si chiede al sistema di aprirci
  // dentro un `mailto:`, che è l'unico modo in cui un `.app` prende un
  // argomento. Gli interruttori di Windows lì non esistono.
  const suMac = process.platform === 'darwin'
  const comando = suMac ? 'open' : programma
  const argomenti = suMac
    ? ['-a', programma, `mailto:${indirizzo}`]
    : argomentiOutlook(indirizzo)

  // `spawn` e non `execFile`: Outlook resta aperto, e aspettarne l'uscita
  // vorrebbe dire aspettare che chi scrive chiuda il programma, e fino ad
  // allora il pulsante resterebbe a girare. Quel che si vuole sapere è se è
  // partito, e lo dice l'evento «spawn».
  //
  // Staccato e senza flussi: il registro non ha niente da dirgli e niente da
  // ascoltare, e chiudendo il registro Outlook non deve chiudersi con lui.
  return new Promise<boolean>((risolvi) => {
    try {
      const figlio = spawn(comando, argomenti, { detached: true, stdio: 'ignore' })
      figlio.once('spawn', () => {
        figlio.unref()
        risolvi(true)
      })
      figlio.once('error', () => risolvi(false))
    } catch {
      risolvi(false)
    }
  })
}
