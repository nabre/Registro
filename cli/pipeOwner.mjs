// Verifica del proprietario della Named Pipe su Windows via GetNamedPipeServerProcessId.
// Solo moduli node:, nessuna compilazione.

import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import process from 'node:process'

const SCRIPT_VERIFICA_PIPE = `
$code = @'
using System;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

public static class PipeSecurity {
  [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Auto)]
  public static extern SafeFileHandle CreateFile(
    string lpFileName, uint dwDesiredAccess, uint dwShareMode,
    IntPtr lpSecurityAttributes, uint dwCreationDisposition,
    uint dwFlagsAndAttributes, IntPtr hTemplateFile);

  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern bool GetNamedPipeServerProcessId(SafeFileHandle Pipe, out uint ServerProcessId);

  public static int OttieniServerPid(string pipeName) {
    using (SafeFileHandle h = CreateFile(pipeName, 0x0080, 0, IntPtr.Zero, 3, 0, IntPtr.Zero)) {
      if (h.IsInvalid) return -1;
      uint pid;
      if (GetNamedPipeServerProcessId(h, out pid)) return (int)pid;
      return -1;
    }
  }
}
'@
Add-Type -TypeDefinition $code
$pid = [PipeSecurity]::OttieniServerPid($env:REGISTRO_PIPE_NOME)
Write-Output $pid
`

/**
 * Ricava il PID del processo server che ascolta sulla named pipe Windows.
 * Se la pipe non risponde o fallisce, restituisce -1.
 */
function ottieniServerPidDellaPipe (nomePipe) {
  if (process.platform !== 'win32') return -1
  const windows = process.env.SystemRoot
  if (!windows) return -1
  try {
    const encoded = Buffer.from(SCRIPT_VERIFICA_PIPE, 'utf16le').toString('base64')
    const uscita = execFileSync(
      join(windows, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
      {
        windowsHide: true,
        timeout: 5000,
        env: { ...process.env, REGISTRO_PIPE_NOME: nomePipe },
        encoding: 'utf8',
      },
    )
    const pid = parseInt(uscita.trim(), 10)
    return Number.isInteger(pid) ? pid : -1
  } catch {
    return -1
  }
}

/**
 * Verifica se il proprietario della pipe appartiene al processo indicato o all'utente corrente.
 */
export function verificaProprietarioPipe (nomePipe, pidAtteso) {
  if (process.platform !== 'win32') return true
  const serverPid = ottieniServerPidDellaPipe(nomePipe)
  if (serverPid <= 0) return false
  if (pidAtteso && serverPid !== pidAtteso) return false
  try {
    // Se appartiene a un altro utente della macchina, lancia EPERM
    process.kill(serverPid, 0)
    return true
  } catch {
    return false
  }
}
