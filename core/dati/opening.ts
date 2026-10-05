// Aprire un file della cartella con il programma del sistema.
//
// Non `openExternal`: passa un indirizzo, e su Windows un nome fuori dall'ASCII
// (`1° semestre.pdf`) non torna al percorso vero. Qui il percorso va com'è, in
// argomenti separati e senza riga di comando, così `&` o spazi restano nome.
// `openExternal` resta per gli URL veri.

import { execFile } from 'node:child_process'
import { stat, writeFile } from 'node:fs/promises'

import * as apparato from 'apparato'

/** Come si chiede al sistema di aprire un file, secondo dove si sta girando. */
function comandoDiApertura (percorso: string): [string, string[]] {
  if (process.platform === 'win32') {
    // `FileProtocolHandler` apre un percorso col programma associato; non
    // `explorer.exe`, che torna errore anche quando riesce e impedirebbe di
    // sapere se ripiegare. Percorso intero perché un nome nudo su Windows si
    // cerca prima nella cartella del documento (`environment/system.ts`);
    // `open` e `xdg-open` si cercano solo nel PATH.
    return [apparato.diSistema('rundll32.exe') ?? 'rundll32.exe', ['url.dll,FileProtocolHandler', percorso]]
  }
  return process.platform === 'darwin' ? ['open', [percorso]] : ['xdg-open', [percorso]]
}

// Le estensioni che si aprono col programma del sistema: documenti, non
// programmi. I file arrivano dentro il documento, che può venire da altri (una
// cartella condivisa, una mail), e la copia materializzata la scrive il
// programma: senza Mark-of-the-Web nessun avviso di SmartScreen fra il clic e
// l'esecuzione. Una lista bianca perché una nera resta sempre indietro (`chm`,
// `ws`, `jnlp`, `mht`…). Fuori, di proposito: i formati Office con le macro
// (`docm`, `xlsm`…), `html`/`svg` (script nel navigatore), `zip` (Esplora
// risorse lo apre come cartella, e i file dentro si lanciano da lì).
const APRIBILI = new Set([
  'pdf',
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tif', 'tiff', 'heic', 'heif',
  'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pps', 'ppsx', 'rtf',
  'odt', 'ods', 'odp', 'odg',
  'txt', 'csv', 'tsv', 'md',
  // Le bozze di posta (`mail.ts`).
  'eml',
  'mp3', 'm4a', 'wav', 'ogg', 'oga', 'opus', 'flac', 'aac', 'wma',
  'mp4', 'm4v', 'mov', 'webm', 'mkv', 'avi', 'wmv', 'mpg', 'mpeg',
])

/**
 * Vero se il nome, come lo leggerebbe Windows (punti e spazi in coda tolti),
 * finisce con un'estensione della lista bianca.
 */
export function èApribile (percorso: string): boolean {
  const nome = percorso.split(/[\\/]/).pop()?.replace(/[. ]+$/, '') ?? ''
  const punto = nome.lastIndexOf('.')
  return punto >= 0 && APRIBILI.has(nome.slice(punto + 1).toLowerCase())
}

/**
 * Segna un file come venuto da Internet (Mark-of-the-Web, zona 3): un doppio
 * clic dalla cartella passa da SmartScreen, e Office lo apre protetto. Solo per
 * i file che non si aprono: su un documento della lista bianca la Visualizzazione
 * protetta fermerebbe a ogni apertura anche i file di chi insegna. Solo Windows
 * e solo NTFS: altrove (FAT, exFAT, una chiavetta) non riesce e si tace.
 */
export async function segnaComeVenutoDaFuori (percorso: string): Promise<void> {
  if (process.platform !== 'win32') return
  try {
    // Il flusso su un file che non c'è creerebbe il file, vuoto.
    if (!(await stat(percorso)).isFile()) return
    await writeFile(`${percorso}:Zone.Identifier`, '[ZoneTransfer]\r\nZoneId=3\r\n')
  } catch {
    // Volume senza flussi alternativi, o file occupato: resta senza segno.
  }
}

/**
 * Apre un file con il programma del sistema; se non riesce lo mostra nella sua
 * cartella. Torna falso se non è riuscita nessuna delle due. Quel che non è in
 * lista bianca non si lancia: si segna e si mostra soltanto, e l'eventuale
 * doppio clic resta di chi guarda.
 */
export async function apriConIlSistema (file: apparato.Uri): Promise<boolean> {
  if (!èApribile(file.fsPath)) {
    await segnaComeVenutoDaFuori(file.fsPath)
    return mostraNellaCartella(file)
  }
  const [comando, argomenti] = comandoDiApertura(file.fsPath)
  const aperto = await new Promise<boolean>((risolvi) => {
    try {
      execFile(comando, argomenti, (errore) => risolvi(!errore))
    } catch {
      risolvi(false)
    }
  })
  if (aperto) return true
  return mostraNellaCartella(file)
}

async function mostraNellaCartella (file: apparato.Uri): Promise<boolean> {
  try {
    await apparato.comandi.esegui('apparato.mostraNellaCartella', file)
    return true
  } catch {
    return false
  }
}
