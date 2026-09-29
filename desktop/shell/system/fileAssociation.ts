// L'associazione dei `.regi`: la stessa classe dell'installer NSIS, senza
// privilegi. Installato per un utente (HKCU) si riscrive uguale, nel caso la
// cartella cambi; per tutti gli utenti vale quella in HKLM, e qui si toglie
// un'eventuale copia in HKCU. Il portabile non registra niente.
//
// Su Linux il tipo `application/x-regiklass` lo installano `.deb` e `.rpm`, ma
// electron-builder gli dà l'icona generica `x-office-document`; l'AppImage non
// installa niente. Qui si scrive per l'utente, nella sua `~/.local/share` che
// vale più di quella di sistema: il tipo con l'icona nostra e, per l'AppImage,
// la voce che la apre. Li toglie `cli/disinstalla.mjs` (e per i pacchetti
// `os/linux/after-remove.sh`). Su macOS basta il `CFBundleDocumentTypes` che
// scrive electron-builder, con l'icona dell'applicazione.
import { app } from 'electron'
import { execFile } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join } from 'node:path'

import { percorsoIcona } from '../../apparato/context.js'
import { integrazioneSistemaAbilitata } from '../../apparato/settings.js'
import { alCambioLingua } from '../../../core/i18n/index.js'
import { testi } from './fileAssociation.testi.js'

// Percorso e parole mostrate da Esplora file (nome del tipo, voce che apre)
// passano nell'ambiente, mai interpolati nel codice PowerShell.
// UserChoice resta intatto: una scelta esplicita di Windows resta dell'utente.
const SCRIPT_ASSOCIAZIONE = String.raw`
$ErrorActionPreference = 'Stop'
$eseguibileRegistro = $env:REGISTRO_ASSOC_EXE
if (-not [System.IO.File]::Exists($eseguibileRegistro)) { throw 'Eseguibile non trovato' }
$script:modificato = $false
function Imposta-ValoreRegistro([string]$sottochiave, [string]$nome, [string]$valore) {
  $chiave = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey('Software\Classes\' + $sottochiave)
  try {
    if ($chiave.GetValue($nome) -cne $valore) {
      $chiave.SetValue($nome, $valore, [Microsoft.Win32.RegistryValueKind]::String)
      $script:modificato = $true
    }
  } finally { $chiave.Dispose() }
}
$classeRegistro = 'Regiklass'
function Punta-ANoi([Microsoft.Win32.RegistryKey]$radice) {
  $comando = $radice.OpenSubKey('Software\Classes\' + $classeRegistro + '\shell\open\command')
  if (-not $comando) { return $false }
  try {
    return ([string]$comando.GetValue('')).IndexOf($eseguibileRegistro, [StringComparison]::OrdinalIgnoreCase) -ge 0
  } finally { $comando.Dispose() }
}
$utente = [Microsoft.Win32.Registry]::CurrentUser
if (Punta-ANoi ([Microsoft.Win32.Registry]::LocalMachine)) {
  # Installato per tutti gli utenti: la classe l'ha scritta l'installer in HKLM
  # e la toglie il disinstallatore. Una copia in HKCU vincerebbe su quella e
  # sopravviverebbe alla disinstallazione, con l'icona che punta a un exe
  # sparito: se c'è, ed è nostra, se ne va.
  if (Punta-ANoi $utente) {
    $utente.DeleteSubKeyTree('Software\Classes\' + $classeRegistro, $false)
    $estensione = $utente.OpenSubKey('Software\Classes\.regi', $true)
    if ($estensione) {
      try {
        if ($estensione.GetValue('') -eq $classeRegistro) { $estensione.DeleteValue('', $false) }
      } finally { $estensione.Dispose() }
    }
    $script:modificato = $true
  }
} else {
  Imposta-ValoreRegistro $classeRegistro '' $env:REGISTRO_ASSOC_TIPO
  Imposta-ValoreRegistro ($classeRegistro + '\DefaultIcon') '' ('"' + $eseguibileRegistro + '",0')
  Imposta-ValoreRegistro ($classeRegistro + '\shell') '' 'open'
  Imposta-ValoreRegistro ($classeRegistro + '\shell\open') '' $env:REGISTRO_ASSOC_APRI
  Imposta-ValoreRegistro ($classeRegistro + '\shell\open\command') '' ('"' + $eseguibileRegistro + '" "%1"')
  Imposta-ValoreRegistro '.regi' '' $classeRegistro
  $apriCon = $utente.CreateSubKey('Software\Classes\.regi\OpenWithProgids')
  try {
    if ($apriCon.GetValueNames() -notcontains $classeRegistro) {
      $apriCon.SetValue($classeRegistro, [byte[]]@(), [Microsoft.Win32.RegistryValueKind]::None)
      $script:modificato = $true
    }
  } finally { $apriCon.Dispose() }
}
if ($script:modificato) {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class IconeRegistro {
  [DllImport("shell32.dll")]
  public static extern void SHChangeNotify(uint evento, uint flags, IntPtr uno, IntPtr due);
}
'@
  [IconeRegistro]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)
}
`

export function registraFileDelProgramma (): void {
  if (!integrazioneSistemaAbilitata() || !app.isPackaged) return
  if (process.platform === 'linux') {
    const avverti = (male: unknown): void => {
      console.warn(
        'Associazione dei file .regi non aggiornata:',
        male instanceof Error ? male.message : String(male),
      )
    }
    void scriviAssociazioneLinux().catch(avverti)
    alCambioLingua(() => void scriviAssociazioneLinux().catch(avverti))
    return
  }
  // Il portable gira da una cartella temporanea: non registrare quel percorso.
  if (process.platform !== 'win32' || process.env.PORTABLE_EXECUTABLE_FILE) return
  scriviAssociazione()
  // Il nome del tipo è nella lingua del registro: cambiata quella, si riscrive.
  alCambioLingua(scriviAssociazione)
}

function scriviAssociazione (): void {
  const windows = process.env.SystemRoot
  if (!windows) return
  const t = testi()
  execFile(join(windows, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'), [
    '-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand',
    Buffer.from(SCRIPT_ASSOCIAZIONE, 'utf16le').toString('base64'),
  ], {
    windowsHide: true,
    timeout: 15000,
    env: {
      ...process.env,
      REGISTRO_ASSOC_EXE: app.getPath('exe'),
      REGISTRO_ASSOC_TIPO: t.tipoDiFile,
      REGISTRO_ASSOC_APRI: t.apriCon,
    },
  }, (errore) => {
    // Un criterio aziendale può impedirlo: il registro si apre comunque.
    if (errore) console.warn('Associazione dei file .regi non aggiornata:', errore.message)
  })
}

// ---------------------------------------------------------------------- Linux

const TIPO_MIME = 'application/x-regiklass'
// Il nome d'icona che il tipo cerca nel tema, come vuole shared-mime-info.
const ICONA_DEL_TIPO = 'application-x-regiklass'
// `desktopName` di `package.json` senza `.desktop`: Electron lo usa come
// `app_id`, e la voce con lo stesso nome raccoglie le finestre aperte.
const VOCE = 'ch.nabre.regiklass'
// Quel che si scrive, relativo a `~/.local/share`: lo stesso elenco sta in
// `cli/disinstalla.mjs` e in `os/linux/after-remove.sh`.
const FILE_DEL_TIPO = join('mime', 'packages', 'regiklass.xml')
const FILE_ICONA_DEL_TIPO = join('icons', 'hicolor', '512x512', 'mimetypes', `${ICONA_DEL_TIPO}.png`)
const FILE_ICONA_VOCE = join('icons', 'hicolor', '512x512', 'apps', `${VOCE}.png`)
const FILE_VOCE = join('applications', `${VOCE}.desktop`)

/** `$XDG_DATA_HOME`, o `~/.local/share` se manca o non è assoluto. */
function datiUtente (): string {
  const xdg = process.env.XDG_DATA_HOME
  return xdg && isAbsolute(xdg) ? xdg : join(homedir(), '.local', 'share')
}

function perXml (testo: string): string {
  return testo.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

/**
 * Un percorso come argomento di `Exec`: fra virgolette con `"`, `` ` ``, `$` e
 * `\` protetti, poi le regole delle stringhe della voce (`\` doppia, `%` doppio).
 */
function perExec (cammino: string): string {
  const citato = `"${cammino.replace(/["`$\\]/g, '\\$&')}"`
  return citato.replaceAll('\\', '\\\\').replaceAll('%', '%%')
}

function descrizioneDelTipo (nome: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<mime-info xmlns="http://www.freedesktop.org/standards/shared-mime-info">',
    `  <mime-type type="${TIPO_MIME}">`,
    `    <comment>${perXml(nome)}</comment>`,
    `    <icon name="${ICONA_DEL_TIPO}"/>`,
    '    <glob pattern="*.regi"/>',
    '  </mime-type>',
    '</mime-info>',
    '',
  ].join('\n')
}

function voceDellAppImage (appImage: string): string {
  return [
    '[Desktop Entry]',
    'Type=Application',
    'Name=Regiklass',
    `Exec=${perExec(appImage)} %U`,
    `Icon=${VOCE}`,
    `MimeType=${TIPO_MIME};`,
    'Categories=Education;',
    'Terminal=false',
    `StartupWMClass=${VOCE}`,
    '',
  ].join('\n')
}

/** Scrive solo se il contenuto cambia, e dice se l'ha fatto. */
async function scriviSeDiverso (file: string, contenuto: string | Buffer): Promise<boolean> {
  const nuovo = typeof contenuto === 'string' ? Buffer.from(contenuto, 'utf8') : contenuto
  const vecchio = await readFile(file).catch(() => null)
  if (vecchio?.equals(nuovo)) return false
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, nuovo)
  return true
}

/** Ricostruisce un indice di freedesktop; senza lo strumento resta com'è. */
function aggiornaIndice (comando: string, cartella: string): void {
  execFile(comando, [cartella], { timeout: 15000 }, (errore) => {
    if (errore) console.warn(`${comando} non eseguito:`, errore.message)
  })
}

async function scriviAssociazioneLinux (): Promise<void> {
  const dati = datiUtente()
  const icona = percorsoIcona()
  const immagine = icona ? await readFile(icona) : null

  if (await scriviSeDiverso(join(dati, FILE_DEL_TIPO), descrizioneDelTipo(testi().tipoDiFile))) {
    aggiornaIndice('update-mime-database', join(dati, 'mime'))
  }
  // Una misura sola: i temi rimpiccioliscono la 512.
  if (immagine) await scriviSeDiverso(join(dati, FILE_ICONA_DEL_TIPO), immagine)

  // `.deb` e `.rpm` hanno la voce di sistema; l'AppImage no, e cambia
  // percorso quando la si sposta: la voce la segue a ogni avvio.
  const appImage = process.env.APPIMAGE
  if (!appImage) return
  if (immagine) await scriviSeDiverso(join(dati, FILE_ICONA_VOCE), immagine)
  if (await scriviSeDiverso(join(dati, FILE_VOCE), voceDellAppImage(appImage))) {
    aggiornaIndice('update-desktop-database', join(dati, 'applications'))
  }
}
