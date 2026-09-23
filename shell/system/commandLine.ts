// Il comando `regdoc`: la riga di comando del registro raggiungibile da un
// terminale qualunque, senza sapere dove l'applicazione è finita.
//
// È lo stesso mestiere di `fileAssociation.ts` — l'applicazione si registra da
// sé, per l'utente che la usa, senza privilegi e senza chiedere — e per la
// stessa ragione: l'installer NSIS non c'è in sviluppo, non c'è nel portable e
// non esiste affatto su Linux e macOS, mentre l'avvio c'è sempre. Una cosa
// sola, in un posto solo, che vale su tre sistemi.
//
// Quel che si scrive è un ponte di tre righe e non una copia della riga di
// comando: dentro ci sono il percorso dell'eseguibile del registro e quello di
// `register.mjs`, e nient'altro. Node non serve che sia installato — Electron
// *è* Node, e `ELECTRON_RUN_AS_NODE` è l'interruttore che glielo fa fare: è
// quel che permette a `regdoc` di funzionare sul computer di un docente, dove
// un ambiente di sviluppo non c'è e non deve esserci.
//
// Si riscrive a ogni avvio invece di controllare se manca. Costa il confronto
// di due stringhe e toglie di mezzo il caso che conta davvero: l'applicazione
// spostata o aggiornata, con il ponte rimasto a indicare dove non è più.

import { app } from 'electron'
import { execFile } from 'node:child_process'
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { delimiter, join } from 'node:path'

import { percorsoRigaDiComando } from '../../src/environment/context.js'

const NOME = 'regdoc'

/** Le due righe che dicono «da qui a qui l'ha scritto il registro». */
const APERTURA = '# >>> Registro docenti: regdoc >>>'
const CHIUSURA = '# <<< Registro docenti: regdoc <<<'

// ------------------------------------------------------------------ i percorsi

/**
 * Dove va il ponte.
 *
 * Su Windows in una cartella nostra, dentro i dati dell'applicazione: è lì che
 * il registro tiene già tutto il resto, e una cartella propria è una cartella
 * che si può togliere senza chiedersi di chi fosse il resto. Su Linux e macOS
 * in `~/.local/bin`, che è il posto convenuto e quello che ogni altro programma
 * per utente usa — l'alternativa sarebbe `/usr/local/bin`, che chiede
 * l'amministratore, e su una macchina scolastica quello ferma tutto.
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
 * Su Windows `setlocal` tiene `ELECTRON_RUN_AS_NODE` dentro lo script: senza,
 * resterebbe acceso nel terminale di chi ha chiamato `regdoc`, e il prossimo
 * Electron lanciato da lì si aprirebbe come Node invece che come applicazione.
 * Il codice d'uscita sopravvive all'`endlocal` implicito, ed è quel che permette
 * a uno script di distinguere il 2 del condotto spento dall'1 del rifiuto.
 *
 * Su Unix `exec` e non una chiamata: il ponte non resta in mezzo a fare da padre
 * a nessuno, e un Ctrl-C arriva a chi lo deve ricevere invece che a lui.
 */
function ponte (eseguibile: string, riga: string): string {
  if (process.platform === 'win32') {
    return [
      '@echo off',
      'rem Scritto dal registro a ogni avvio: quel che si cambia qui si perde.',
      'setlocal',
      'set "ELECTRON_RUN_AS_NODE=1"',
      `set "REGISTRO_COMANDO=${NOME}"`,
      `"${eseguibile}" "${riga}" %*`,
      '',
    ].join('\r\n')
  }
  return [
    '#!/bin/sh',
    '# Scritto dal registro a ogni avvio: quel che si cambia qui si perde.',
    `ELECTRON_RUN_AS_NODE=1 REGISTRO_COMANDO=${NOME} exec ${perLaShell(eseguibile)} ` +
      `${perLaShell(riga)} "$@"`,
    '',
  ].join('\n')
}

/** Scrive il ponte, e non lo tocca se è già quel che deve essere. */
async function scriviIlPonte (): Promise<void> {
  const dove = percorsoDelPonte()
  const testo = ponte(app.getPath('exe'), percorsoRigaDiComando())

  const vecchio = await readFile(dove, 'utf8').catch(() => null)
  if (vecchio === testo) return

  await mkdir(cartellaDeiComandi(), { recursive: true })
  await writeFile(dove, testo, 'utf8')
  // Su Windows è l'estensione a dire che si esegue; altrove è il permesso, e un
  // file senza non è un comando: è un errore che non nomina il motivo.
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
// `DoNotExpandEnvironmentNames` è la riga da cui dipende tutto il resto: il
// `Path` dell'utente è quasi sempre un `REG_EXPAND_SZ` pieno di `%…%`, e
// leggerlo senza quell'opzione lo restituisce già sciolto. Riscritto così,
// `%JAVA_HOME%\bin` diventa il percorso che Java aveva quel giorno e smette di
// seguire l'aggiornamento — un danno che non si vede subito ed è di chi l'ha
// fatto. Per la stessa ragione si riscrive con il tipo che si è trovato.
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
    // Un criterio aziendale può impedire la scrittura: il registro si apre
    // comunque, e `regdoc` resta chiamabile per percorso.
    if (errore) console.warn(`«${NOME}» non è entrato nel PATH:`, errore.message)
  })
}

/**
 * Il blocco da aggiungere a un profilo di shell.
 *
 * `$HOME` e non il percorso disteso: il profilo è un file che l'utente può
 * portarsi su un'altra macchina, dove la sua cartella si chiama in un altro
 * modo. Il `case` è la forma che funziona anche in `sh` — i profili li legge
 * quello, non bash — e rende il blocco innocuo se lo si esegue due volte.
 */
const BLOCCO = [
  '',
  APERTURA,
  'case ":$PATH:" in',
  '  *":$HOME/.local/bin:"*) ;;',
  '  *) PATH="$HOME/.local/bin:$PATH" ;;',
  'esac',
  'export PATH',
  CHIUSURA,
  '',
].join('\n')

/**
 * I profili in cui scrivere.
 *
 * `~/.profile` lo leggono `sh` e bash; zsh no, e non ci guarda nemmeno per
 * sbaglio — un utente zsh resterebbe senza comando senza capire perché, ed è il
 * caso normale su macOS, dove zsh è la shell di serie. L'altro verso vale meno:
 * creare un `~/.zprofile` dove zsh non si usa lascia un file che non legge
 * nessuno, e per questo lo si scrive solo a chi zsh ce l'ha davvero.
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
  await scriviIlPonte()

  const cartella = cartellaDeiComandi()
  // Già raggiungibile: non c'è niente da cambiare. Su Linux `~/.local/bin` di
  // solito ci è già, e toccare il profilo di chi non ne ha bisogno sarebbe una
  // riga scritta in casa d'altri in cambio di niente.
  if (giàNelPercorso(cartella)) return

  if (process.platform === 'win32') aggiungiAlPercorsoDiWindows(cartella)
  else await aggiungiAlPercorsoDiUnix()
}

/**
 * Mette `regdoc` a disposizione del terminale.
 *
 * Non si aspetta e non sa fallire in modo rumoroso: è una comodità, e un
 * registro che non si apre perché non ha potuto scrivere un file di cinque
 * righe sarebbe un pessimo scambio.
 */
export function registraComandoRiga (): void {
  // Il portable gira da una cartella temporanea che cambia a ogni avvio: un
  // ponte che indica quella è già rotto quando il registro si chiude. È la
  // stessa ragione per cui `fileAssociation.ts` lo salta.
  if (process.env.PORTABLE_EXECUTABLE_FILE) return
  // Su macOS l'applicazione aperta dal disco montato, o mai spostata in
  // «Applicazioni», gira da un percorso che il sistema smonta o butta via.
  const eseguibile = app.getPath('exe')
  if (eseguibile.startsWith('/Volumes/') || eseguibile.includes('AppTranslocation')) return

  void installa().catch((male: unknown) => {
    console.warn(
      `Il comando «${NOME}» non è stato installato:`,
      male instanceof Error ? male.message : String(male),
    )
  })
}
