#!/usr/bin/env node
// Toglie dal computer quel che il registro ci ha lasciato per l'utente che lo
// lancia: la cartella dei dati, le cartelle temporanee rimaste indietro, il
// comando `regdoc` e la sua voce nel PATH, l'associazione dei file `.registro`
// e la voce di avvio automatico. I documenti `.registro` del docente no: sono
// suoi, stanno dove li ha messi lui, e disinstallare un programma non è una
// ragione per perdere un anno di lavoro.
//
// Chi lo chiama:
//
// - il disinstallatore di Windows (`os/windows/uninstall.nsh`), con l'eseguibile del
//   registro e `ELECTRON_RUN_AS_NODE`: Electron *è* Node, e sulla macchina di un
//   docente un altro Node non c'è;
// - la voce di menu «Disinstalla…» (`shell/system/uninstall.ts`), che è l'unica strada
//   su macOS, con l'AppImage e con il portabile, dove un disinstallatore non
//   esiste. Il registro lo lancia staccato, con `--attendi` e il proprio pid, e
//   si chiude: questo aspetta che sia chiuso davvero, perché su Windows una
//   cartella con dentro un file aperto non si cancella.
//
// Su Linux, dai pacchetti `.deb` e `.rpm`, fa lo stesso lavoro
// `os/linux/after-remove.sh`: gira da root e dopo che il programma è già stato
// tolto, quindi non può chiamare questo, e passa per ogni utente della macchina.
// Quello che si toglie qui e là deve restare lo stesso elenco.
//
// Come `registro.mjs`, non si compila e non ha dipendenze, solo moduli `node:`.
//
//   disinstalla.mjs [--dati <cartella>] [--eseguibile <file>]
//                   [--attendi <pid>] [--togli <file>]

import { execFile } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { setTimeout as aspetta } from 'node:timers/promises'

/** Deve restare uguale al `productName` di `package.json`, come in `registro.mjs`. */
const NOME_APPLICAZIONE = 'Registro docenti'

/** L'`appId` di `electron-builder.json`: su macOS dà il nome a qualche file. */
const IDENTITA = 'ch.edu.ti.cptt.registro-docenti'

/** I prefissi delle cartelle temporanee di `data/mtmd.ts` e `data/whisper.ts`. */
const TEMPORANEI = ['registro-pagina-', 'registro-voce-']

/** Le righe con cui `shell/system/commandLine.ts` delimita quel che scrive nei profili. */
const APERTURA = '# >>> Registro docenti: regdoc >>>'
const CHIUSURA = '# <<< Registro docenti: regdoc <<<'

/** La riga che riconosce il ponte `regdoc` come nostro, e non di un omonimo. */
const FIRMA_PONTE = 'REGISTRO_COMANDO=regdoc'

// ---------------------------------------------------------------- gli argomenti

function argomenti (elenco) {
  const letti = {}
  for (let i = 0; i < elenco.length; i++) {
    const nome = elenco[i]
    if (!nome.startsWith('--')) continue
    letti[nome.slice(2)] = elenco[i + 1] ?? ''
    i++
  }
  return letti
}

/** La stessa regola di `src/data/appData.ts`. */
function cartellaDatiPredefinita () {
  if (process.platform === 'win32') {
    return join(process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'), NOME_APPLICAZIONE)
  }
  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', NOME_APPLICAZIONE)
  }
  return join(process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), NOME_APPLICAZIONE)
}

// ------------------------------------------------------------------- l'attesa

function vivo (pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (errore) {
    // `EPERM` vuol dire che c'è, ma di un altro: vivo lo stesso.
    return errore.code === 'EPERM'
  }
}

/** Aspetta che il registro sia chiuso, ma non per sempre. */
async function attendiChiusura (pid) {
  const fine = Date.now() + 60_000
  while (vivo(pid) && Date.now() < fine) await aspetta(250)
}

// ------------------------------------------------------------------ i file

const TENTATIVI = { recursive: true, force: true, maxRetries: 20, retryDelay: 250 }

function togli (cammino) {
  try {
    rmSync(cammino, TENTATIVI)
  } catch (errore) {
    console.warn(`Non tolto: ${cammino} (${errore.message})`)
  }
}

function togliTemporanei () {
  const cartella = tmpdir()
  let voci = []
  try {
    voci = readdirSync(cartella)
  } catch {
    return
  }
  for (const voce of voci) {
    if (TEMPORANEI.some((prefisso) => voce.startsWith(prefisso))) togli(join(cartella, voce))
  }
}

/** Il blocco che `commandLine.ts` aggiunge ai profili, con la riga vuota che lo precede. */
function senzaBlocco (testo) {
  const inizio = testo.indexOf(APERTURA)
  if (inizio < 0) return testo
  const fine = testo.indexOf(CHIUSURA, inizio)
  if (fine < 0) return testo
  const prima = testo.slice(0, inizio).replace(/\n$/, '')
  const dopo = testo.slice(fine + CHIUSURA.length).replace(/^\n/, '')
  return senzaBlocco(prima + (dopo === '' ? '\n' : '\n' + dopo))
}

function togliRegdocDaUnix () {
  const ponte = join(homedir(), '.local', 'bin', 'regdoc')
  try {
    if (readFileSync(ponte, 'utf8').includes(FIRMA_PONTE)) togli(ponte)
  } catch {
    // Non c'è, o non è leggibile: in nessuno dei due casi è da togliere.
  }
  for (const profilo of ['.profile', '.zprofile']) {
    const file = join(homedir(), profilo)
    try {
      const vecchio = readFileSync(file, 'utf8')
      const nuovo = senzaBlocco(vecchio)
      if (nuovo !== vecchio) writeFileSync(file, nuovo, 'utf8')
    } catch {
      // Un profilo che non c'è non ha niente di nostro dentro.
    }
  }
}

/** Quel che macOS tiene fuori da `Application Support`, a nome del programma. */
function togliDaMacOS () {
  const libreria = join(homedir(), 'Library')
  togli(join(libreria, 'Preferences', `${IDENTITA}.plist`))
  togli(join(libreria, 'Saved Application State', `${IDENTITA}.savedState`))
  togli(join(libreria, 'Caches', NOME_APPLICAZIONE))
  togli(join(libreria, 'Caches', IDENTITA))
  togli(join(libreria, 'Logs', NOME_APPLICAZIONE))
}

// ------------------------------------------------------------------ il registro di Windows

// I valori passano nell'ambiente, mai interpolati nel codice PowerShell — come
// in `shell/system/commandLine.ts` e `shell/system/fileAssociation.ts`, che sono quelli che
// queste chiavi le hanno scritte.
//
// Il PATH si rilegge con `DoNotExpandEnvironmentNames` e si riscrive con il tipo
// che aveva, per la stessa ragione detta in `commandLine.ts`: un `%JAVA_HOME%`
// sciolto per sbaglio è un danno fatto a qualcun altro. E si riscrive solo se
// la nostra voce c'era, così un PATH che non ci riguarda non si tocca nemmeno.
//
// L'associazione: la classe se ne va tutta, ma solo se apre **questo**
// eseguibile — il portabile che si disinstalla non deve portarsi via
// l'associazione dell'installato, che ha la stessa classe. `.registro` perde
// solo quel che puntava a noi, e sparisce se resta vuota. Il portabile toglie
// invece la propria identità nel centro notifiche, che scrive
// `environment/notifications.ts`. L'avvio automatico: si
// riconosce dal percorso dell'eseguibile, perché il nome del valore lo sceglie
// Electron e non noi.
const SCRIPT_REGISTRO = String.raw`
$ErrorActionPreference = 'Continue'
$utente = [Microsoft.Win32.Registry]::CurrentUser
$classe = 'Registro docenti'

$bin = $env:REGISTRO_BIN
$ambiente = $utente.OpenSubKey('Environment', $true)
if ($ambiente -and $bin) {
  try {
    if ($ambiente.GetValueNames() -contains 'Path') {
      $valore = $ambiente.GetValue('Path', '', [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
      $tipo = $ambiente.GetValueKind('Path')
      $tutte = @($valore -split ';')
      $resto = @($tutte | Where-Object { $_.TrimEnd('\') -ine $bin.TrimEnd('\') })
      if ($resto.Count -ne $tutte.Count) { $ambiente.SetValue('Path', ($resto -join ';'), $tipo) }
    }
  } finally { $ambiente.Dispose() }
}

$nostra = $false
$comandoClasse = $utente.OpenSubKey('Software\Classes\' + $classe + '\shell\open\command')
if ($comandoClasse -and $env:REGISTRO_EXE) {
  try {
    $nostra = ([string]$comandoClasse.GetValue('')).IndexOf($env:REGISTRO_EXE, [StringComparison]::OrdinalIgnoreCase) -ge 0
  } finally { $comandoClasse.Dispose() }
}
if ($nostra) { $utente.DeleteSubKeyTree('Software\Classes\' + $classe, $false) }
$estensione = if ($nostra) { $utente.OpenSubKey('Software\Classes\.registro', $true) } else { $null }
if ($estensione) {
  try {
    if ($estensione.GetValue('') -eq $classe) { $estensione.DeleteValue('', $false) }
    $apriCon = $estensione.OpenSubKey('OpenWithProgids', $true)
    if ($apriCon) {
      try {
        $apriCon.DeleteValue($classe, $false)
        $apriConVuota = $apriCon.ValueCount -eq 0 -and $apriCon.SubKeyCount -eq 0
      } finally { $apriCon.Dispose() }
      if ($apriConVuota) { $estensione.DeleteSubKey('OpenWithProgids', $false) }
    }
    $estensioneVuota = $estensione.ValueCount -eq 0 -and $estensione.SubKeyCount -eq 0
  } finally { $estensione.Dispose() }
  if ($estensioneVuota) { $utente.DeleteSubKey('Software\Classes\.registro', $false) }
}

if ($env:REGISTRO_AUMID) {
  $utente.DeleteSubKeyTree('Software\Classes\AppUserModelId\' + $env:REGISTRO_AUMID, $false)
}

$eseguibile = $env:REGISTRO_EXE
if ($eseguibile) {
  $tolti = @()
  $avvio = $utente.OpenSubKey('Software\Microsoft\Windows\CurrentVersion\Run', $true)
  if ($avvio) {
    try {
      foreach ($nome in $avvio.GetValueNames()) {
        $comando = [string]$avvio.GetValue($nome)
        if ($comando.IndexOf($eseguibile, [StringComparison]::OrdinalIgnoreCase) -ge 0) {
          $avvio.DeleteValue($nome, $false)
          $tolti += $nome
        }
      }
    } finally { $avvio.Dispose() }
  }
  $approvati = $utente.OpenSubKey('Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run', $true)
  if ($approvati) {
    try { foreach ($nome in $tolti) { $approvati.DeleteValue($nome, $false) } } finally { $approvati.Dispose() }
  }
}

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class PuliziaRegistro {
  [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
  public static extern IntPtr SendMessageTimeout(
    IntPtr finestra, uint messaggio, UIntPtr wParam, string lParam,
    uint modo, uint attesa, out UIntPtr risposta);
  [DllImport("shell32.dll")]
  public static extern void SHChangeNotify(uint evento, uint flags, IntPtr uno, IntPtr due);
}
'@
$risposta = [UIntPtr]::Zero
[PuliziaRegistro]::SendMessageTimeout(
  [IntPtr]0xffff, 0x1A, [UIntPtr]::Zero, 'Environment', 2, 5000, [ref]$risposta) | Out-Null
[PuliziaRegistro]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)
`

function puliziaDiWindows (dati, eseguibile, portabile) {
  const windows = process.env.SystemRoot
  if (!windows) return Promise.resolve()
  return new Promise((risolvi) => {
    execFile(join(windows, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'), [
      '-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand',
      Buffer.from(SCRIPT_REGISTRO, 'utf16le').toString('base64'),
    ], {
      windowsHide: true,
      timeout: 30000,
      env: {
        ...process.env,
        // La cartella che `commandLine.ts` ha messo nel PATH.
        REGISTRO_BIN: join(dati, 'bin'),
        REGISTRO_EXE: eseguibile ?? '',
        // Come `IDENTITA_PORTABILE` in `src/environment/notifications.ts`.
        REGISTRO_AUMID: portabile ? `${IDENTITA}.portabile` : '',
      },
    }, (errore) => {
      if (errore) console.warn('Registro di Windows non ripulito:', errore.message)
      risolvi()
    })
  })
}

// ------------------------------------------------------------------- il giro

async function disinstalla () {
  const letti = argomenti(process.argv.slice(2))
  const pid = Number(letti.attendi)
  if (Number.isInteger(pid) && pid > 0) await attendiChiusura(pid)

  const dati = letti.dati || cartellaDatiPredefinita()

  if (process.platform === 'win32') await puliziaDiWindows(dati, letti.eseguibile, Boolean(letti.togli))
  else togliRegdocDaUnix()
  if (process.platform === 'darwin') togliDaMacOS()
  if (process.platform === 'linux') togli(join(homedir(), '.cache', NOME_APPLICAZIONE))

  togliTemporanei()
  togli(dati)

  // Il programma stesso, quando non c'è un disinstallatore che lo faccia: il
  // portabile di Windows. Il suo avviatore resta aperto qualche istante dopo
  // il registro, ed è il motivo dei tentativi ripetuti dentro `togli`.
  if (letti.togli && existsSync(letti.togli)) togli(letti.togli)
}

await disinstalla()
