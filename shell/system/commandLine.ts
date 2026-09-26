// Il comando `regi`: la riga di comando del registro, raggiungibile da un
// terminale qualunque.
//
// Come `fileAssociation.ts`, l'applicazione si registra da sé all'avvio, per
// l'utente e senza privilegi: vale in sviluppo, nel portable e su tre sistemi.
//
// Il ponte contiene solo i percorsi dell'eseguibile e di `registro.mjs`:
// con `ELECTRON_RUN_AS_NODE` Electron fa da Node, che non serve installare.
// Si riscrive a ogni avvio (se diverso), così segue l'applicazione spostata o aggiornata.

import { app } from 'electron'
import { execFile } from 'node:child_process'
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { delimiter, join } from 'node:path'

import { percorsoRigaDiComando } from '../../src/environment/context.js'
import { alCambioLingua, lingua } from '../../src/i18n/index.js'
import { testi } from './commandLine.testi.js'

const NOME = 'regi'

/** Le due righe che dicono «da qui a qui l'ha scritto il registro». */
const APERTURA = '# >>> Regiclass: regi >>>'
const CHIUSURA = '# <<< Regiclass: regi <<<'

// ------------------------------------------------------------------ i percorsi

/**
 * Dove va il ponte: su Windows in una cartella nostra dentro `userData`, che si
 * toglie senza dubbi; altrove in `~/.local/bin`, il posto per utente (niente
 * amministratore).
 */
function cartellaDeiComandi (): string {
  return process.platform === 'win32'
    ? join(app.getPath('userData'), 'bin')
    : join(homedir(), '.local', 'bin')
}

function percorsoDelPonte (): string {
  return join(cartellaDeiComandi(), process.platform === 'win32' ? `${NOME}.cmd` : NOME)
}

// -------------------------------------------------------------------- il ponte

/** Un percorso dentro apici singoli di `sh`, apici compresi. */
function perLaShell (cammino: string): string {
  return `'${cammino.replaceAll("'", "'\\''")}'`
}

/**
 * Il testo del ponte.
 *
 * Su Windows `setlocal` tiene `ELECTRON_RUN_AS_NODE` dentro lo script, o il
 * prossimo Electron lanciato da quel terminale partirebbe come Node. Il codice
 * d'uscita sopravvive all'`endlocal` implicito (2 condotto spento, 1 rifiuto).
 *
 * Su Unix `exec`, così il Ctrl-C arriva a chi lo deve ricevere.
 *
 * `REGISTRO_LINGUA` passa la lingua delle finestre, che la riga di comando non
 * sa ricavare; una variabile già impostata dal terminale vince.
 */
function ponte (eseguibile: string, riga: string): string {
  if (process.platform === 'win32') {
    return [
      '@echo off',
      // testo-fisso: il `rem` di cmd davanti all'avvertenza, che viene dal catalogo
      `rem ${testi().avvertenza}`,
      'setlocal',
      'set "ELECTRON_RUN_AS_NODE=1"',
      // testo-fisso: una riga di cmd, non testo
      `set "REGISTRO_COMANDO=${NOME}"`,
      // testo-fisso: una riga di cmd, non testo
      `if not defined REGISTRO_LINGUA set "REGISTRO_LINGUA=${lingua()}"`,
      `"${eseguibile}" "${riga}" %*`,
      '',
    ].join('\r\n')
  }
  // testo-fisso: una riga di sh, non testo
  const lancio = `exec ${perLaShell(eseguibile)} ${perLaShell(riga)} "$@"`
  return [
    '#!/bin/sh',
    `# ${testi().avvertenza}`,
    // testo-fisso: una riga di sh, non testo
    `ELECTRON_RUN_AS_NODE=1 REGISTRO_COMANDO=${NOME} REGISTRO_LINGUA="\${REGISTRO_LINGUA:-${lingua()}}" ${lancio}`,
    '',
  ].join('\n')
}

/**
 * La scrittura in corso, una alla volta: due scritture sovrapposte (avvio e
 * cambio di lingua) potrebbero lasciare sul disco la lingua di prima.
 */
let scrittura: Promise<void> = Promise.resolve()

function riscriviIlPonte (): Promise<void> {
  scrittura = scrittura.catch(() => undefined).then(scriviIlPonte)
  return scrittura
}

/** Scrive il ponte, e non lo tocca se è già quel che deve essere. */
async function scriviIlPonte (): Promise<void> {
  const dove = percorsoDelPonte()
  const testo = ponte(app.getPath('exe'), percorsoRigaDiComando())

  const vecchio = await readFile(dove, 'utf8').catch(() => null)
  if (vecchio === testo) return

  await mkdir(cartellaDeiComandi(), { recursive: true })
  await writeFile(dove, testo, 'utf8')
  // Fuori da Windows serve il permesso di esecuzione.
  if (process.platform !== 'win32') await chmod(dove, 0o755)
}

// --------------------------------------------------------------------- il PATH

/** La cartella è già fra quelle in cui la shell cerca i comandi? */
function giàNelPercorso (cartella: string): boolean {
  const voci = (process.env.PATH ?? '').split(delimiter).filter((voce) => voce !== '')
  return process.platform === 'win32'
    ? voci.some((voce) => voce.toLowerCase() === cartella.toLowerCase())
    : voci.includes(cartella)
}

// Il percorso passa nell'ambiente, mai interpolato nel codice PowerShell.
//
// `DoNotExpandEnvironmentNames` è essenziale: il `Path` dell'utente è di solito
// un `REG_EXPAND_SZ` con `%…%`, e letto sciolto e riscritto congelerebbe
// `%JAVA_HOME%\bin`. Per la stessa ragione si riscrive con il tipo trovato.
const SCRIPT_PERCORSO = String.raw`
$ErrorActionPreference = 'Stop'
$cartella = $env:REGISTRO_BIN
if (-not $cartella) { throw 'Cartella non indicata' }
$chiave = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey('Environment')
try {
  $valore = ''
  $tipo = [Microsoft.Win32.RegistryValueKind]::ExpandString
  if ($chiave.GetValueNames() -contains 'Path') {
    $valore = [string]$chiave.GetValue(
      'Path', '', [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
    $tipo = $chiave.GetValueKind('Path')
  }
  $voci = @($valore -split ';' | Where-Object { $_ -ne '' })
  if ($voci -contains $cartella) { exit 0 }
  $chiave.SetValue('Path', (($voci + $cartella) -join ';'), $tipo)
} finally { $chiave.Dispose() }
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class AmbienteRegistro {
  [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
  public static extern IntPtr SendMessageTimeout(
    IntPtr finestra, uint messaggio, UIntPtr wParam, string lParam,
    uint modo, uint attesa, out UIntPtr risposta);
}
'@
$risposta = [UIntPtr]::Zero
# WM_SETTINGCHANGE a tutte le finestre di primo livello: senza, il PATH nuovo lo
# vedrebbero solo i processi nati dopo il prossimo accesso al sistema.
[AmbienteRegistro]::SendMessageTimeout(
  [IntPtr]0xffff, 0x1A, [UIntPtr]::Zero, 'Environment', 2, 5000, [ref]$risposta) | Out-Null
`

function aggiungiAlPercorsoDiWindows (cartella: string): void {
  const windows = process.env.SystemRoot
  if (!windows) return
  execFile(join(windows, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'), [
    '-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand',
    Buffer.from(SCRIPT_PERCORSO, 'utf16le').toString('base64'),
  ], {
    windowsHide: true,
    timeout: 15000,
    env: { ...process.env, REGISTRO_BIN: cartella },
  }, (errore) => {
    // Un criterio aziendale può impedirlo: `regi` resta chiamabile per percorso.
    if (errore) console.warn(`«${NOME}» non è entrato nel PATH:`, errore.message)
  })
}

/**
 * Il blocco da aggiungere a un profilo di shell. `$HOME` perché il profilo può
 * viaggiare su un'altra macchina; il `case` funziona in `sh` ed è innocuo se
 * eseguito due volte.
 */
const BLOCCO = [
  '',
  APERTURA,
  // testo-fisso: righe di sh, non testo
  'case ":$PATH:" in',
  '  *":$HOME/.local/bin:"*) ;;',
  '  *) PATH="$HOME/.local/bin:$PATH" ;;',
  'esac',
  // testo-fisso: una riga di sh, non testo
  'export PATH',
  CHIUSURA,
  '',
].join('\n')

/**
 * I profili in cui scrivere: `~/.profile` (sh, bash) e, solo per chi usa zsh
 * (il predefinito su macOS), `~/.zprofile`, che zsh legge al posto dell'altro.
 */
function profili (): string[] {
  const elenco = [join(homedir(), '.profile')]
  if ((process.env.SHELL ?? '').includes('zsh')) elenco.push(join(homedir(), '.zprofile'))
  return elenco
}

async function aggiungiAlPercorsoDiUnix (): Promise<void> {
  for (const profilo of profili()) {
    const vecchio = await readFile(profilo, 'utf8').catch(() => '')
    if (vecchio.includes(APERTURA)) continue
    await writeFile(profilo, vecchio + BLOCCO, 'utf8')
  }
}

// -------------------------------------------------------------------- l'avvio

async function installa (): Promise<void> {
  await riscriviIlPonte()

  const cartella = cartellaDeiComandi()
  // Già raggiungibile (su Linux di solito sì): il profilo non si tocca.
  if (giàNelPercorso(cartella)) return

  if (process.platform === 'win32') aggiungiAlPercorsoDiWindows(cartella)
  else await aggiungiAlPercorsoDiUnix()
}

/** Mette `regi` a disposizione del terminale. Non si aspetta, e un errore avverte e basta. */
export function registraComandoRiga (): void {
  // Il portable gira da una cartella temporanea che cambia a ogni avvio (come in `fileAssociation.ts`).
  if (process.env.PORTABLE_EXECUTABLE_FILE) return
  // Su macOS l'applicazione aperta dal disco montato, o mai spostata in
  // «Applicazioni», gira da un percorso che il sistema smonta o butta via.
  const eseguibile = app.getPath('exe')
  if (eseguibile.startsWith('/Volumes/') || eseguibile.includes('AppTranslocation')) return

  const avverti = (male: unknown): void => {
    console.warn(
      `Il comando «${NOME}» non è stato installato:`,
      male instanceof Error ? male.message : String(male),
    )
  }
  void installa().catch(avverti)
  // Il ponte porta la lingua: al cambio si riscrive, il PATH no.
  alCambioLingua(() => void riscriviIlPonte().catch(avverti))
}
