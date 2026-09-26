// Apre un messaggio nuovo con Outlook anche quando non è il programma di posta
// predefinito (`mailto:` spesso finisce altrove). Argomenti separati, mai una
// riga di comando composta, così un indirizzo non diventa un'istruzione. Se non
// riesce torna `false` e chi chiama ripiega su `mailto:`.

import { execFile, spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import * as percorso from 'node:path'

import * as apparato from 'apparato'

import { argomentiOutlook } from '../domain/contacts.js'

/** Dove sta Outlook su macOS. */
const APPLICAZIONE_MAC = '/Applications/Microsoft Outlook.app'

/**
 * Dove Outlook si installa su Windows, in ordine. `root\\Office16` è Office
 * «clic e usa» dal 2016 a Microsoft 365; gli altri sono installazioni più vecchie.
 */
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

/** Vero se il file c'è. */
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
 * Il percorso di `OUTLOOK.EXE` secondo `App Paths` nel registro di Windows,
 * letto con `reg query`: trova anche le installazioni in posti insoliti.
 */
async function dalRegistro (): Promise<string | null> {
  const chiave =
    'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\OUTLOOK.EXE'
  const riga = await new Promise<string>((risolvi) => {
    try {
      // Percorso intero: un `reg.exe` nella cartella del documento partirebbe al
      // posto di quello vero (`environment/system.ts`).
      execFile(apparato.diSistema('reg.exe'), ['query', chiave, '/ve'], (errore, uscita) =>
        risolvi(errore ? '' : uscita),
      )
    } catch {
      risolvi('')
    }
  })
  // «(Predefinito)  REG_SZ  C:\...\OUTLOOK.EXE»: si prende quel che segue
  // REG_SZ, perché il nome del valore è tradotto nella lingua del sistema.
  const trovato = /REG_SZ\s+(.+\.exe)/i.exec(riga)?.[1]?.trim()
  return trovato && outlookAccettabile(trovato) ? trovato : null
}

/**
 * Vero se il percorso si può far partire (la guardia di `dictation.ts` e
 * `mtmd.ts`): assoluto, perché uno relativo si risolverebbe nella cartella del
 * documento; su Windows solo `.exe`, non script per un interprete. Su macOS è
 * un `.app` per `open -a`.
 */
export function outlookAccettabile (scritto: string): boolean {
  if (!percorso.isAbsolute(scritto)) return false
  return process.platform !== 'win32' || percorso.extname(scritto).toLowerCase() === '.exe'
}

/** L'eseguibile di Outlook: nei posti soliti, altrimenti dal registro di Windows. */
async function eseguibileOutlook (): Promise<string | null> {
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

  // Su macOS un `.app` prende argomenti solo via `open -a` con un `mailto:`.
  const suMac = process.platform === 'darwin'
  const comando = suMac ? 'open' : programma
  const argomenti = suMac
    // testo-fisso: lo schema di un indirizzo di posta, lo legge il sistema
    ? ['-a', programma, `mailto:${indirizzo}`]
    : argomentiOutlook(indirizzo)

  // `spawn` e non `execFile`: basta sapere che è partito (evento «spawn»), non
  // aspettare che si chiuda. Staccato e senza flussi, così sopravvive al registro.
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
