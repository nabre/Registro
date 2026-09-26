// L'associazione dei `.regi`: la stessa classe dell'installer NSIS, senza
// privilegi. Installato per un utente (HKCU) si riscrive uguale, nel caso la
// cartella cambi; per tutti gli utenti vale quella in HKLM, e qui si toglie
// un'eventuale copia in HKCU. Il portabile non registra niente.
import { app } from 'electron'
import { execFile } from 'node:child_process'
import { join } from 'node:path'

import { alCambioLingua } from '../../src/i18n/index.js'
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
$classeRegistro = 'Regiclass'
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
  // Il portable gira da una cartella temporanea: non registrare quel percorso.
  if (process.platform !== 'win32' || !app.isPackaged || process.env.PORTABLE_EXECUTABLE_FILE) return
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
