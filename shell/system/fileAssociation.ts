// La stessa classe registrata dall'installer NSIS, senza privilegi amministrativi.
//
// Vale per le due installazioni, e in modo diverso. Per un utente solo,
// l'installer scrive in HKCU e qui si riscrive lo stesso — serve se la cartella
// cambia. Per tutti gli utenti, l'installer scrive in HKLM: qui non si scrive
// niente, e si toglie la copia in HKCU lasciata dalle versioni di prima. Il
// portabile non registra niente: gira da una cartella che sparisce.
import { app } from 'electron'
import { execFile } from 'node:child_process'
import { join } from 'node:path'

// Il percorso passa nell'ambiente, mai interpolato nel codice PowerShell.
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
$classeRegistro = 'Registro docenti'
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
    $estensione = $utente.OpenSubKey('Software\Classes\.registro', $true)
    if ($estensione) {
      try {
        if ($estensione.GetValue('') -eq $classeRegistro) { $estensione.DeleteValue('', $false) }
      } finally { $estensione.Dispose() }
    }
    $script:modificato = $true
  }
} else {
  Imposta-ValoreRegistro $classeRegistro '' 'Anno scolastico del registro docenti'
  Imposta-ValoreRegistro ($classeRegistro + '\DefaultIcon') '' ('"' + $eseguibileRegistro + '",0')
  Imposta-ValoreRegistro ($classeRegistro + '\shell') '' 'open'
  Imposta-ValoreRegistro ($classeRegistro + '\shell\open') '' 'Apri con Registro docenti'
  Imposta-ValoreRegistro ($classeRegistro + '\shell\open\command') '' ('"' + $eseguibileRegistro + '" "%1"')
  Imposta-ValoreRegistro '.registro' '' $classeRegistro
  $apriCon = $utente.CreateSubKey('Software\Classes\.registro\OpenWithProgids')
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
  const windows = process.env.SystemRoot
  if (!windows) return
  execFile(join(windows, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'), [
    '-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand',
    Buffer.from(SCRIPT_ASSOCIAZIONE, 'utf16le').toString('base64'),
  ], {
    windowsHide: true,
    timeout: 15000,
    env: { ...process.env, REGISTRO_ASSOC_EXE: app.getPath('exe') },
  }, (errore) => {
    // Un criterio aziendale può impedirlo: il registro si apre comunque.
    if (errore) console.warn('Associazione dei file .registro non aggiornata:', errore.message)
  })
}
