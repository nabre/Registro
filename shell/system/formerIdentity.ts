// Toglie, una volta sola, quel che il nome precedente del programma («Registro
// docenti», identità `ch.edu.ti.cptt.registro-docenti`) ha lasciato nel
// sistema e che nessun altro riscrive o riconosce più:
//
// - la voce di avvio automatico col nome dell'identità precedente (quella
//   nuova la rimette `applicaAvvioConWindows`, se l'impostazione è accesa);
// - la classe «Registro docenti»;
// - le identità del portabile e dei sorgenti nel centro notifiche;
// - `%LOCALAPPDATA%\registro-docenti-updater`, gli scaricamenti di
//   electron-updater;
// - `%APPDATA%\Registro docenti\bin` nel PATH e il ponte `regdoc.cmd`, arrivato
//   con i dati nella cartella nuova;
// - fuori da Windows, `~/.local/bin/regdoc` e il suo blocco nei profili.
//
// Il pin sulla barra delle applicazioni porta l'identità precedente e non si
// ripara da qui. Un segno nella cartella dei dati dice che è fatto; se la
// pulizia fallisce, si riprova al prossimo avvio. Solo installato o portabile:
// da sorgenti quelle voci sono dell'installazione vera.

import { app } from 'electron'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { IDENTITA_VECCHIA, NOME_VECCHIO } from '../../src/data/formerName.js'

/** Il segno che la pulizia è stata fatta. */
const SEGNO = 'identita-vecchia-ripulita'

/** Il comando precedente, e la riga che ne riconosce il ponte come nostro. */
const COMANDO_VECCHIO = 'regdoc'
const FIRMA_PONTE_VECCHIO = `REGISTRO_COMANDO=${COMANDO_VECCHIO}`

/** I marcatori del blocco precedente nei profili della shell. */
const APERTURA_VECCHIA = '# >>> Registro docenti: regdoc >>>'
const CHIUSURA_VECCHIA = '# <<< Registro docenti: regdoc <<<'

/** La cartella degli scaricamenti di electron-updater, dal nome del pacchetto. */
const AGGIORNAMENTI_VECCHI = 'registro-docenti-updater'

// I valori passano nell'ambiente, mai interpolati nel codice PowerShell. La
// classe si toglie solo se il suo comando apre un eseguibile col nome nostro
// (o se il comando non c'è più); il PATH si rilegge senza sciogliere le `%…%`
// e si riscrive col suo tipo, come in `commandLine.ts`.
const SCRIPT_PULIZIA = String.raw`
$ErrorActionPreference = 'Stop'
$utente = [Microsoft.Win32.Registry]::CurrentUser
$identita = $env:REGISTRO_VECCHIA_IDENTITA
$classe = $env:REGISTRO_VECCHIA_CLASSE

$avvio = $utente.OpenSubKey('Software\Microsoft\Windows\CurrentVersion\Run', $true)
$tolti = @()
if ($avvio) {
  try {
    foreach ($nome in @($identita, ($identita + '.portabile'))) {
      if ($avvio.GetValueNames() -contains $nome) { $avvio.DeleteValue($nome, $false); $tolti += $nome }
    }
  } finally { $avvio.Dispose() }
}
$approvati = $utente.OpenSubKey('Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run', $true)
if ($approvati) {
  try { foreach ($nome in $tolti) { $approvati.DeleteValue($nome, $false) } } finally { $approvati.Dispose() }
}

$nostra = $false
$radiceClasse = $utente.OpenSubKey('Software\Classes\' + $classe)
if ($radiceClasse) {
  try {
    $comando = $radiceClasse.OpenSubKey('shell\open\command')
    if ($comando) {
      try {
        $nostra = ([string]$comando.GetValue('')).IndexOf($env:REGISTRO_VECCHIO_EXE, [StringComparison]::OrdinalIgnoreCase) -ge 0
      } finally { $comando.Dispose() }
    } else { $nostra = $true }
  } finally { $radiceClasse.Dispose() }
}
if ($nostra) { $utente.DeleteSubKeyTree('Software\Classes\' + $classe, $false) }

foreach ($nome in @($identita, ($identita + '.portabile'), ($identita + '.sviluppo'))) {
  $utente.DeleteSubKeyTree('Software\Classes\AppUserModelId\' + $nome, $false)
}

$bin = $env:REGISTRO_VECCHIO_BIN
$ambiente = $utente.OpenSubKey('Environment', $true)
$cambiato = $false
if ($ambiente -and $bin) {
  try {
    if ($ambiente.GetValueNames() -contains 'Path') {
      $valore = $ambiente.GetValue('Path', '', [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
      $tipo = $ambiente.GetValueKind('Path')
      $tutte = @($valore -split ';')
      $resto = @($tutte | Where-Object { $_.TrimEnd('\') -ine $bin.TrimEnd('\') })
      if ($resto.Count -ne $tutte.Count) {
        $ambiente.SetValue('Path', ($resto -join ';'), $tipo)
        $cambiato = $true
      }
    }
  } finally { $ambiente.Dispose() }
}

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class PuliziaNomeVecchio {
  [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
  public static extern IntPtr SendMessageTimeout(
    IntPtr finestra, uint messaggio, UIntPtr wParam, string lParam,
    uint modo, uint attesa, out UIntPtr risposta);
  [DllImport("shell32.dll")]
  public static extern void SHChangeNotify(uint evento, uint flags, IntPtr uno, IntPtr due);
}
'@
if ($cambiato) {
  $risposta = [UIntPtr]::Zero
  [PuliziaNomeVecchio]::SendMessageTimeout(
    [IntPtr]0xffff, 0x1A, [UIntPtr]::Zero, 'Environment', 2, 5000, [ref]$risposta) | Out-Null
}
[PuliziaNomeVecchio]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)
`

function ripulisciRegistroDiWindows (): Promise<void> {
  const windows = process.env.SystemRoot
  if (!windows) return Promise.resolve()
  return new Promise((risolvi, rifiuta) => {
    execFile(join(windows, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'), [
      '-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand',
      Buffer.from(SCRIPT_PULIZIA, 'utf16le').toString('base64'),
    ], {
      windowsHide: true,
      timeout: 30000,
      env: {
        ...process.env,
        REGISTRO_VECCHIA_IDENTITA: IDENTITA_VECCHIA,
        // Il ProgID era il nome del programma, e così l'eseguibile.
        REGISTRO_VECCHIA_CLASSE: NOME_VECCHIO,
        REGISTRO_VECCHIO_EXE: `${NOME_VECCHIO}.exe`,
        REGISTRO_VECCHIO_BIN: join(app.getPath('appData'), NOME_VECCHIO, 'bin'),
      },
    }, (errore) => {
      if (errore) rifiuta(errore instanceof Error ? errore : new Error(String(errore)))
      else risolvi()
    })
  })
}

/** Toglie un ponte `regdoc`, solo se l'aveva scritto il registro. */
async function togliPonte (file: string): Promise<void> {
  const testo = await readFile(file, 'utf8').catch(() => null)
  if (testo?.includes(FIRMA_PONTE_VECCHIO)) await rm(file, { force: true })
}

/** Il blocco precedente in un profilo della shell, con la riga vuota che lo precede. */
function senzaBloccoVecchio (testo: string): string {
  const inizio = testo.indexOf(APERTURA_VECCHIA)
  if (inizio < 0) return testo
  const fine = testo.indexOf(CHIUSURA_VECCHIA, inizio)
  if (fine < 0) return testo
  const prima = testo.slice(0, inizio).replace(/\n$/, '')
  const dopo = testo.slice(fine + CHIUSURA_VECCHIA.length).replace(/^\n/, '')
  return senzaBloccoVecchio(prima + (dopo === '' ? '\n' : '\n' + dopo))
}

/**
 * Fuori da Windows: il ponte e il blocco nei profili. Se serve, il blocco con
 * i marcatori nuovi lo rimette `registraComandoRiga`, che parte dopo.
 */
async function ripulisciUnix (): Promise<void> {
  await togliPonte(join(homedir(), '.local', 'bin', COMANDO_VECCHIO))
  for (const profilo of ['.profile', '.zprofile']) {
    const file = join(homedir(), profilo)
    const vecchio = await readFile(file, 'utf8').catch(() => null)
    if (vecchio === null) continue
    const nuovo = senzaBloccoVecchio(vecchio)
    if (nuovo !== vecchio) await writeFile(file, nuovo, 'utf8')
  }
}

async function ripulisci (): Promise<void> {
  if (process.platform !== 'win32') {
    await ripulisciUnix()
    return
  }
  await togliPonte(join(app.getPath('userData'), 'bin', `${COMANDO_VECCHIO}.cmd`))
  const locale = process.env.LOCALAPPDATA
  if (locale) await rm(join(locale, AGGIORNAMENTI_VECCHI), { recursive: true, force: true })
  await ripulisciRegistroDiWindows()
}

/**
 * Toglie quel che resta del nome precedente, se non è già stato fatto. Non
 * fallisce mai. `regi`, che scrive nello stesso PATH, la aspetta.
 */
export async function ripulisciIdentitaVecchia (): Promise<void> {
  if (!app.isPackaged) return
  const segno = join(app.getPath('userData'), SEGNO)
  if (existsSync(segno)) return
  try {
    await ripulisci()
    await writeFile(segno, `${new Date().toISOString()}\n`, 'utf8')
  } catch (male) {
    console.warn(
      'Pulizia del nome precedente non riuscita, si riprova al prossimo avvio:',
      male instanceof Error ? male.message : String(male),
    )
  }
}
