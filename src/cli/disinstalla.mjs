#!/usr/bin/env node
// Toglie quel che il registro ha lasciato per l'utente che lo lancia: dati,
// temporanei, comando `regi` e voce nel PATH, associazione `.regi`, avvio
// automatico, anche col nome precedente (`regdoc`). I documenti
// del docente restano.
//
// Lo chiamano il disinstallatore di Windows (`os/windows/uninstall.nsh`, con
// `ELECTRON_RUN_AS_NODE`) e la voce «Disinstalla…» (`shell/system/uninstall.ts`)
// dove un disinstallatore non c'è: lanciato staccato con `--attendi <pid>`,
// aspetta che il registro sia chiuso perché su Windows un file aperto blocca la
// cancellazione. Per `.deb`/`.rpm` fa lo stesso `os/linux/after-remove.sh`: i due
// elenchi vanno tenuti uguali. Solo moduli `node:`, niente compilazione.
//
// `--tieni` con i nomi di `GRUPPI` separati da virgole tiene una parte dei dati;
// senza, si toglie tutto.
//
//   disinstalla.mjs [--dati <cartella>] [--eseguibile <file>]
//                   [--attendi <pid>] [--togli <file>]
//                   [--tieni modelli,account,impostazioni]

import { execFile } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { setTimeout as aspetta } from 'node:timers/promises'

import { cartellaUtente, cartellaUtentePrecedente, NOME_APPLICAZIONE, NOME_PRECEDENTE } from './common.mjs'

/** L'`appId` di `electron-builder.json`: su macOS dà il nome a qualche file. */
const IDENTITA = 'ch.nabre.regiclass'

/** L'identità precedente (`IDENTITA_VECCHIA` in `src/data/formerName.ts`). */
const IDENTITA_PRECEDENTE = 'ch.edu.ti.cptt.registro-docenti'

/**
 * I prefissi delle cartelle temporanee: `data/mtmd.ts`, la voce (vedi
 * `data/temporaryFiles.ts`), l'aggiornamento (`environment/updateInstaller.ts`).
 */
const TEMPORANEI = ['registro-pagina-', 'registro-voce-', 'registro-aggiornamento-']

/**
 * Le righe con cui `shell/system/commandLine.ts` delimita quel che scrive nei
 * profili: le sue, e quelle col nome precedente.
 */
const BLOCCHI = [
  ['# >>> Regiclass: regi >>>', '# <<< Regiclass: regi <<<'],
  ['# >>> Registro docenti: regdoc >>>', '# <<< Registro docenti: regdoc <<<'],
]

/** I ponti del comando, con la riga che li riconosce come nostri e non di un omonimo. */
const PONTI = ['regi', 'regdoc'].map((nome) => ({ nome, firma: `REGISTRO_COMANDO=${nome}` }))

/**
 * Le parti della cartella dei dati che si possono tenere; il resto (cache,
 * ponte di `regi`) si rifà da sé e se ne va comunque.
 *
 * - `modelli`: i download pesanti (`data/gguf.ts`, `data/visionKit.ts`, `dettatura`).
 * - `account`: i segreti (`environment/secrets.ts`) con `Local State`, che
 *   tiene la chiave con cui sono cifrati.
 * - `impostazioni`: impostazioni, registri recenti, finestre, interfaccia.
 */
const GRUPPI = {
  modelli: ['modelli-linguistici', 'dettatura', 'lettura'],
  account: ['segreti.json', 'Local State'],
  impostazioni: ['impostazioni.json', 'documenti.json', 'finestre.json', 'interfaccia'],
}

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

/** Le voci da tenere, dai gruppi di `--tieni`; i nomi sconosciuti non contano. */
function vociDaTenere (tieni) {
  const voci = new Set()
  for (const gruppo of (tieni ?? '').split(',')) {
    for (const voce of GRUPPI[gruppo.trim()] ?? []) voci.add(voce.toLowerCase())
  }
  return voci
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

/**
 * La cartella dei dati, meno quel che si tiene. Senza niente da tenere se ne va
 * la cartella intera; altrimenti voce per voce, e la cartella resta.
 */
function togliDati (dati, tenute) {
  if (tenute.size === 0) return togli(dati)
  let voci = []
  try {
    voci = readdirSync(dati)
  } catch {
    return
  }
  // Senza maiuscole: su Windows e macOS i nomi non le distinguono.
  for (const voce of voci) {
    if (!tenute.has(voce.toLowerCase())) togli(join(dati, voce))
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

/** Un blocco che `commandLine.ts` aggiunge ai profili, con la riga vuota che lo precede. */
function senzaBlocco (testo, apertura, chiusura) {
  const inizio = testo.indexOf(apertura)
  if (inizio < 0) return testo
  const fine = testo.indexOf(chiusura, inizio)
  if (fine < 0) return testo
  const prima = testo.slice(0, inizio).replace(/\n$/, '')
  const dopo = testo.slice(fine + chiusura.length).replace(/^\n/, '')
  return senzaBlocco(prima + (dopo === '' ? '\n' : '\n' + dopo), apertura, chiusura)
}

function togliComandoDaUnix () {
  for (const { nome, firma } of PONTI) {
    const ponte = join(homedir(), '.local', 'bin', nome)
    try {
      if (readFileSync(ponte, 'utf8').includes(firma)) togli(ponte)
    } catch {
      // Non c'è o non è leggibile: niente da togliere.
    }
  }
  for (const profilo of ['.profile', '.zprofile']) {
    const file = join(homedir(), profilo)
    try {
      const vecchio = readFileSync(file, 'utf8')
      const nuovo = BLOCCHI.reduce(
        (testo, [apertura, chiusura]) => senzaBlocco(testo, apertura, chiusura),
        vecchio,
      )
      if (nuovo !== vecchio) writeFileSync(file, nuovo, 'utf8')
    } catch {
      // Profilo assente: niente da togliere.
    }
  }
}

/** Quel che macOS tiene fuori da `Application Support`, a nome del programma. */
function togliDaMacOS () {
  const libreria = join(homedir(), 'Library')
  for (const identita of [IDENTITA, IDENTITA_PRECEDENTE]) {
    togli(join(libreria, 'Preferences', `${identita}.plist`))
    togli(join(libreria, 'Saved Application State', `${identita}.savedState`))
    togli(join(libreria, 'Caches', identita))
  }
  for (const nome of [NOME_APPLICAZIONE, NOME_PRECEDENTE]) {
    togli(join(libreria, 'Caches', nome))
    togli(join(libreria, 'Logs', nome))
  }
}

// ------------------------------------------------------------------ il registro di Windows

// I valori passano nell'ambiente, mai interpolati nel PowerShell, come in
// `shell/system/commandLine.ts` e `shell/system/fileAssociation.ts` che scrivono
// queste chiavi.
//
// PATH: letto con `DoNotExpandEnvironmentNames` e riscritto col suo tipo, così
// un `%JAVA_HOME%` non si scioglie; riscritto solo se la nostra voce c'era.
// Associazione: la classe si toglie solo se apre questo eseguibile (portabile e
// installato condividono la classe); l'estensione perde solo quel che punta a
// noi e sparisce se resta vuota. Il portabile toglie anche la sua identità nelle
// notifiche (`environment/notifications.ts`). L'avvio automatico si riconosce
// dal percorso dell'eseguibile: il nome del valore lo sceglie Electron.
const SCRIPT_REGISTRO = String.raw`
$ErrorActionPreference = 'Continue'
$utente = [Microsoft.Win32.Registry]::CurrentUser

$bin = @($env:REGISTRO_BIN -split ';' | Where-Object { $_ -ne '' })
$ambiente = $utente.OpenSubKey('Environment', $true)
if ($ambiente -and $bin.Count -gt 0) {
  try {
    if ($ambiente.GetValueNames() -contains 'Path') {
      $valore = $ambiente.GetValue('Path', '', [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
      $tipo = $ambiente.GetValueKind('Path')
      $tutte = @($valore -split ';')
      $resto = @($tutte | Where-Object { $voce = $_.TrimEnd('\'); -not ($bin | Where-Object { $_.TrimEnd('\') -ieq $voce }) })
      if ($resto.Count -ne $tutte.Count) { $ambiente.SetValue('Path', ($resto -join ';'), $tipo) }
    }
  } finally { $ambiente.Dispose() }
}

# Classe ed estensione di adesso, e classe col nome precedente.
foreach ($coppia in @(@('Regiclass', '.regi'), @('Registro docenti', $null))) {
  $classe = $coppia[0]
  $chiaveEstensione = if ($coppia[1]) { 'Software\Classes\' + $coppia[1] } else { $null }
  $nostra = $false
  $comandoClasse = $utente.OpenSubKey('Software\Classes\' + $classe + '\shell\open\command')
  if ($comandoClasse -and $env:REGISTRO_EXE) {
    try {
      $nostra = ([string]$comandoClasse.GetValue('')).IndexOf($env:REGISTRO_EXE, [StringComparison]::OrdinalIgnoreCase) -ge 0
    } finally { $comandoClasse.Dispose() }
  }
  if ($nostra) { $utente.DeleteSubKeyTree('Software\Classes\' + $classe, $false) }
  $estensione = if ($nostra -and $chiaveEstensione) { $utente.OpenSubKey($chiaveEstensione, $true) } else { $null }
  if ($estensione) {
    $apriConVuota = $false
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
    if ($estensioneVuota) { $utente.DeleteSubKey($chiaveEstensione, $false) }
  }
}

foreach ($aumid in @($env:REGISTRO_AUMID, $env:REGISTRO_AUMID_PRECEDENTE | Where-Object { $_ })) {
  $utente.DeleteSubKeyTree('Software\Classes\AppUserModelId\' + $aumid, $false)
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
        // Le cartelle che `commandLine.ts` mette nel PATH, anche col nome precedente.
        REGISTRO_BIN: [join(dati, 'bin'), join(cartellaUtentePrecedente(), 'bin')].join(';'),
        REGISTRO_EXE: eseguibile ?? '',
        // Come `IDENTITA_PORTABILE` in `src/environment/notifications.ts`.
        REGISTRO_AUMID: portabile ? `${IDENTITA}.portabile` : '',
        REGISTRO_AUMID_PRECEDENTE: portabile ? `${IDENTITA_PRECEDENTE}.portabile` : '',
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

  const dati = letti.dati || cartellaUtente()

  if (process.platform === 'win32') await puliziaDiWindows(dati, letti.eseguibile, Boolean(letti.togli))
  else togliComandoDaUnix()
  if (process.platform === 'darwin') togliDaMacOS()
  if (process.platform === 'linux') {
    togli(join(homedir(), '.cache', NOME_APPLICAZIONE))
    togli(join(homedir(), '.cache', NOME_PRECEDENTE))
  }

  togliTemporanei()
  const tenute = vociDaTenere(letti.tieni)
  togliDati(dati, tenute)
  // La cartella col nome precedente, solo se sta accanto a quella di adesso:
  // col portabile i dati stanno altrove e quella è di un'altra installazione.
  const precedente = cartellaUtentePrecedente()
  if (dirname(dati) === dirname(precedente) && dati !== precedente && existsSync(precedente)) {
    togliDati(precedente, tenute)
  }

  // Il programma stesso, per il portabile di Windows. Il suo avviatore resta
  // aperto qualche istante: per questo `togli` riprova.
  if (letti.togli && existsSync(letti.togli)) togli(letti.togli)
}

await disinstalla()
