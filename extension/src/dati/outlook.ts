// Il collegamento diretto alla casella Exchange, passando da Outlook.
//
// Non c'è niente da autenticare: Outlook è già collegato alla casella, con la
// verifica in due passaggi già fatta e i criteri del tenant già rispettati. Il
// registro non chiede una password, non salva un token e non registra
// un'applicazione da nessuna parte — parla con il programma che sta sulla
// stessa macchina e gli fa comporre il messaggio nella casella giusta.
//
// È la risposta al muro trovato dall'altra parte: chiedere a Microsoft i
// permessi di posta per conto proprio richiede una registrazione su Entra ID
// che nel tenant di una scuola non è detto si possa fare — e senza, la
// richiesta torna indietro con `AADSTS65002`. Qui non si chiede niente a
// nessuno.
//
// Il messaggio nasce dentro Outlook e non come file da importare: così la copia
// nascosta ci arriva davvero (un `.eml` letto da fuori se la perde per strada),
// gli allegati si agganciano dal disco senza limiti di peso, e la bozza sta
// nella casella — non in una cartella del computer.
//
// Solo Windows, e solo con Outlook installato: chi non ce l'ha ripiega sul file
// `.eml`, che è la via che funziona dappertutto.

import { execFile } from 'node:child_process'
import { tmpdir } from 'node:os'
import { randomBytes } from 'node:crypto'

import * as vscode from 'vscode'

import {
  corpoDelMessaggio,
  type MessaggioFallito,
  type MessaggioPosta,
} from '../dominio/comunicazioni.js'

/**
 * Che cosa fare del messaggio appena composto.
 *
 * `mostra` lo apre davanti a chi ha premuto il tasto: è il caso della
 * comunicazione singola, che si rilegge e si manda subito. `salva` lo lascia
 * fra le bozze della casella: è il caso dei giri — venticinque finestre aperte
 * insieme non sono una comodità, e le bozze nella casella si aprono da Outlook
 * una alla volta, anche il giorno dopo e da un altro computer.
 *
 * `spedisci` lo manda e basta, senza mostrarlo. È la via che si accende a mano
 * in `registroDocenti.posta.invioDiretto`, ed è l'unica in cui il registro sa
 * davvero che cosa è partito: fin qui doveva domandarlo a chi stava davanti
 * allo schermo. Quel che parte non si richiama più, e per questo resta spenta
 * finché non la si accende e si conferma il giro.
 */
export type ModoBozza = 'mostra' | 'salva' | 'spedisci'

// Il tipo di chi resta indietro sta nel dominio: lo riempiono in due — Outlook
// e la consegna diretta a Exchange — e chi legge l'esito di un giro non deve
// sapere da quale delle due strade sia passato.
export type { MessaggioFallito } from '../dominio/comunicazioni.js'

export interface EsitoOutlook {
  ok: boolean
  /** Quanti messaggi Outlook ha composto — o spedito, con `spedisci`. */
  quante: number
  /**
   * Quelli rimasti indietro, uno per uno.
   *
   * Serve a `spedisci` e cambia le carte in tavola: un giro in cui la
   * diciottesima mail non parte non è un giro fallito, sono diciassette
   * famiglie avvisate e una no — e il registro deve segnare le prime e non la
   * seconda. Con un solo «è andata storta» le avrebbe sbagliate tutte.
   */
  falliti: MessaggioFallito[]
  errore?: string
}

/**
 * Lo script che parla con Outlook.
 *
 * Sta qui come testo e non come file a parte per un motivo pratico: così non
 * c'è niente da copiare in `dist/` al momento di impacchettare l'estensione, e
 * uno script che manca è un guasto che si scopre solo sulla macchina di chi
 * l'ha installata.
 *
 * I dati non passano dalla riga di comando ma da un file JSON: un oggetto con
 * dentro un apostrofo, o venticinque indirizzi, in una riga di comando
 * diventano un rebus di virgolette — e un nome con dentro un accento non
 * sopravvive al passaggio.
 */
/**
 * Come si mette le mani su Outlook, e vale per tutti e due gli script.
 *
 * Due tentativi, in quest'ordine. Prima si aggancia la copia gia' aperta: se
 * qualcuno sta leggendo la posta, quella e' la sessione giusta e non ce n'e'
 * da avviare un'altra. Poi, se non c'e' nessuno, si chiede a Windows di
 * avviarla.
 *
 * L'ordine non e' un dettaglio: `CO_E_SERVER_EXEC_FAILURE` — Outlook aperto
 * che non si lascia avviare una seconda volta — e' il guasto piu' comune di
 * tutti, e agganciare quella aperta lo scavalca senza che nessuno debba
 * chiudere niente.
 */
const APERTURA = String.raw`
function Prendi-Outlook {
  try {
    return [Runtime.InteropServices.Marshal]::GetActiveObject('Outlook.Application')
  } catch { }
  return (New-Object -ComObject Outlook.Application)
}
`

const SCRIPT = String.raw`
param([Parameter(Mandatory=$true)][string]$Dati)
$ErrorActionPreference = 'Stop'
` + APERTURA + String.raw`

$richiesta = Get-Content -LiteralPath $Dati -Raw -Encoding UTF8 | ConvertFrom-Json

# Se Outlook non c'e', o non si lascia comandare, si esce dicendolo: chi ha
# chiamato ripiega sul file .eml invece di restare senza niente.
try {
  $outlook = Prendi-Outlook
} catch {
  Write-Output "NO-OUTLOOK: $($_.Exception.Message)"
  exit 2
}

$fatte = 0
$indice = -1
foreach ($messaggio in $richiesta.messaggi) {
  $indice = $indice + 1

  # Un messaggio per volta, e uno che va storto non ferma gli altri: in un giro
  # di venticinque, un indirizzo che Outlook non risolve farebbe restare senza
  # richiesta le sette famiglie che vengono dopo. Chi ha chiamato legge le
  # righe ERR: e segna spedite solo quelle che sono partite davvero.
  try {
    $voce = $outlook.CreateItem(0)   # olMailItem
    $voce.Subject = $messaggio.oggetto
    if ($messaggio.html) { $voce.HTMLBody = $messaggio.corpo } else { $voce.Body = $messaggio.corpo }
    if ($messaggio.a   -and $messaggio.a.Count   -gt 0) { $voce.To  = ($messaggio.a   -join '; ') }
    if ($messaggio.ccn -and $messaggio.ccn.Count -gt 0) { $voce.BCC = ($messaggio.ccn -join '; ') }

    foreach ($allegato in $messaggio.allegati) {
      if (Test-Path -LiteralPath $allegato) { [void]$voce.Attachments.Add($allegato) }
    }

    # La casella da cui parte, quando fra quelle di Outlook c'e'. Per una bozza
    # da rileggere, se non c'e', si resta sul conto predefinito e chi la
    # rilegge cambia il campo "Da" prima di mandarla. Per una spedizione no:
    # una comunicazione alla classe partita dalla casella privata non si
    # richiama, e Outlook con un solo conto la manderebbe da li' senza dirlo.
    if ($messaggio.da) {
      $conto = $null
      try {
        $conto = $outlook.Session.Accounts | Where-Object { $_.SmtpAddress -eq $messaggio.da } | Select-Object -First 1
        if ($conto) { $voce.SendUsingAccount = $conto }
      } catch { }
      if (-not $conto -and $richiesta.modo -eq 'spedisci') {
        throw "la casella $($messaggio.da) non e' fra gli account di Outlook: non si spedisce da un'altra"
      }
    }

    # Send() non vuol dire "consegnata": la mette nella Posta in uscita, e a
    # portarla fuori e' Outlook quando ha rete. E' quanto di piu' vicino al
    # vero il registro possa sapere, e lo dice con queste parole.
    if ($richiesta.modo -eq 'spedisci') {
      $voce.Send()
    } elseif ($richiesta.modo -eq 'mostra') {
      $voce.Display()
    } else {
      $voce.Save()
    }
    $fatte = $fatte + 1
  } catch {
    $detto = ($_.Exception.Message -replace '\s+', ' ')
    Write-Output ("ERR:" + $indice + ":" + $detto)
  }
}

Write-Output "OK:$fatte"
`

/**
 * Lo script che chiede a Outlook di chi è la casella.
 *
 * Serve a rispondere a una domanda che il registro fin qui non sapeva
 * rispondere: «collegato, sì, ma a che cosa?». Chi accende l'invio diretto sta
 * per far partire mail vere dalla propria casella, e ha diritto di vedere
 * scritto da quale — prima, non dopo.
 *
 * Non manda niente e non tocca niente: apre la sessione, legge i conti
 * configurati e chiude. È la prova che si può fare a occhi chiusi.
 */
const SCRIPT_CONTI = APERTURA + String.raw`
$ErrorActionPreference = 'Stop'

try {
  $outlook = Prendi-Outlook
} catch {
  Write-Output "NO-OUTLOOK: $($_.Exception.Message)"
  exit 2
}

# La sessione MAPI e' una cosa a parte dal programma: Outlook puo' essere
# installato e non avere nessun profilo configurato, ed e' il caso in cui
# spedire non funzionerebbe.
try {
  $sessione = $outlook.Session
  $utente = ''
  try { $utente = $sessione.CurrentUser.Name } catch { }

  $conti = @()
  foreach ($conto in $sessione.Accounts) {
    $conti += [pscustomobject]@{
      nome      = $conto.DisplayName
      indirizzo = $conto.SmtpAddress
      tipo      = [int]$conto.AccountType
    }
  }

  Write-Output (ConvertTo-Json -InputObject ([pscustomobject]@{
    utente = $utente
    conti  = @($conti)
  }) -Compress -Depth 4)
} catch {
  Write-Output "NO-PROFILO: $($_.Exception.Message)"
  exit 3
}
`

/**
 * Il guasto tradotto in quel che c'è da fare.
 *
 * `CO_E_SERVER_EXEC_FAILURE` è il più frequente di tutti e il suo messaggio di
 * sistema — «Esecuzione del server non riuscito» — non dice niente a nessuno.
 * Vuol quasi sempre dire una cosa sola: Outlook e VS Code non girano con gli
 * stessi permessi, uno dei due è partito da amministratore. Scriverlo qui vale
 * più di un'ora passata a cercare in rete quel codice.
 */
function rimedio (detto: string): string {
  if (/80080005|CO_E_SERVER_EXEC_FAILURE/.test(detto)) {
    return (
      'Outlook non si lascia comandare. Di solito è perché lui e VS Code girano con permessi ' +
      'diversi: se uno dei due è stato aperto come amministratore, chiudilo e riaprilo normale. ' +
      'Altrimenti chiudi Outlook del tutto e riaprilo.'
    )
  }
  if (/800401E3|MK_E_UNAVAILABLE/.test(detto)) {
    return 'Outlook è aperto ma non risponde all’automazione: chiudilo e riaprilo.'
  }
  if (/8002801D|library not registered/i.test(detto)) {
    return 'La registrazione di Outlook è rotta: una riparazione di Office la rimette a posto.'
  }
  return `Outlook non risponde: ${detto}`
}

/** Le sigle con cui Outlook dice di che specie è una casella. */
const SPECIE: Record<number, string> = {
  0: 'Exchange',
  1: 'IMAP',
  2: 'POP3',
  3: 'HTTP',
  4: 'Exchange ActiveSync',
  5: 'altro',
}

/** Una casella configurata in Outlook. */
export interface ContoOutlook {
  nome: string
  indirizzo: string
  /** 'Exchange', 'IMAP'… come lo si direbbe a voce. */
  specie: string
}

/** Che cosa si è trovato dall'altra parte. */
export interface EsitoConti {
  ok: boolean
  /** Il nome di chi è entrato nella sessione: è la casella da cui partirebbe. */
  utente: string
  conti: ContoOutlook[]
  errore?: string
}

/**
 * Chiede a Outlook quali caselle ha, senza mandare niente.
 *
 * È la prova del collegamento: se torna un indirizzo, è quello da cui le
 * comunicazioni partirebbero. Se torna un errore, dice quale — «Outlook non
 * c'è» e «Outlook c'è ma non ha nessun profilo» sono due guasti diversi, e si
 * riparano in due modi diversi.
 */
export async function contiDiOutlook (): Promise<EsitoConti> {
  if (!outlookPossibile()) {
    return { ok: false, utente: '', conti: [], errore: 'Outlook si comanda solo da Windows.' }
  }

  const cartella = vscode.Uri.file(`${tmpdir()}/registro-docenti`)
  const chiave = randomBytes(8).toString('hex')
  const fileScript = vscode.Uri.joinPath(cartella, `conti-${chiave}.ps1`)

  try {
    await vscode.workspace.fs.createDirectory(cartella)
    await vscode.workspace.fs.writeFile(fileScript, Buffer.from(SCRIPT_CONTI, 'utf8'))

    const uscita = await eseguiPowerShell(fileScript.fsPath, null, 0)
    const detto = uscita.testo.trim()

    if (detto.includes('NO-OUTLOOK')) {
      return { ok: false, utente: '', conti: [], errore: rimedio(detto) }
    }
    if (detto.includes('NO-PROFILO')) {
      return {
        ok: false,
        utente: '',
        conti: [],
        errore: 'Outlook c’è ma non ha nessuna casella configurata: aprilo e completa la configurazione.',
      }
    }

    const letto = JSON.parse(detto) as {
      utente?: string
      conti?: Array<{ nome?: string, indirizzo?: string, tipo?: number }>
    }
    const conti = (letto.conti ?? [])
      .filter((conto) => Boolean(conto.indirizzo))
      .map((conto) => ({
        nome: conto.nome ?? '',
        indirizzo: conto.indirizzo ?? '',
        specie: SPECIE[conto.tipo ?? 5] ?? 'altro',
      }))

    return {
      ok: conti.length > 0,
      utente: letto.utente ?? '',
      conti,
      errore: conti.length === 0 ? 'Outlook risponde ma non ha nessuna casella da cui spedire.' : undefined,
    }
  } catch (errore) {
    return { ok: false, utente: '', conti: [], errore: (errore as Error).message }
  } finally {
    await togli(fileScript)
  }
}

/** Se su questa macchina ha senso anche solo provarci. */
export function outlookPossibile (): boolean {
  return process.platform === 'win32'
}

/**
 * Compone le bozze dentro Outlook.
 *
 * Torna `ok: false` anche quando Outlook semplicemente non c'è: per chi chiama
 * è la stessa cosa — vuol dire «di qui non si passa, ripiega» — e il motivo
 * resta scritto nell'errore per chi lo va a leggere.
 */
export async function bozzeInOutlook (
  messaggi: MessaggioPosta[],
  modo: ModoBozza,
): Promise<EsitoOutlook> {
  if (!outlookPossibile()) {
    return { ok: false, quante: 0, falliti: [], errore: 'Outlook si comanda solo da Windows.' }
  }
  if (messaggi.length === 0) return { ok: true, quante: 0, falliti: [] }

  const cartella = vscode.Uri.file(`${tmpdir()}/registro-docenti`)
  const chiave = randomBytes(8).toString('hex')
  const fileDati = vscode.Uri.joinPath(cartella, `posta-${chiave}.json`)
  const fileScript = vscode.Uri.joinPath(cartella, `posta-${chiave}.ps1`)

  const richiesta = {
    modo,
    messaggi: messaggi.map((messaggio) => {
      const scritto = corpoDelMessaggio(messaggio.corpo, messaggio.firma)
      return {
        oggetto: messaggio.oggetto,
        corpo: scritto.contenuto,
        html: scritto.html,
        a: messaggio.a ?? [],
        ccn: messaggio.ccn,
        da: messaggio.da ?? '',
        // Solo i percorsi: Outlook allega dal disco, e un allegato che non
        // deve passare per la memoria non ha limiti di peso da rispettare.
        allegati: (messaggio.allegati ?? [])
          .map((allegato) => allegato.percorso)
          .filter((percorso): percorso is string => Boolean(percorso)),
      }
    }),
  }

  try {
    await vscode.workspace.fs.createDirectory(cartella)
    await vscode.workspace.fs.writeFile(fileDati, Buffer.from(JSON.stringify(richiesta), 'utf8'))
    await vscode.workspace.fs.writeFile(fileScript, Buffer.from(SCRIPT, 'utf8'))

    const uscita = await eseguiPowerShell(fileScript.fsPath, fileDati.fsPath, messaggi.length)
    const detto = uscita.testo.trim()

    if (detto.includes('NO-OUTLOOK')) {
      // Il caso tipico è `CO_E_SERVER_EXEC_FAILURE`: Outlook c'è ma non si
      // lascia comandare — di solito perché ne è rimasta aperta una copia in
      // uno stato storto, o perché i due programmi girano con permessi
      // diversi. Non è un guasto da fermare tutto: si ripiega sul file.
      return { ok: false, quante: 0, falliti: [], errore: rimedio(detto) }
    }

    // Le righe «ERR:indice:motivo», una per messaggio rimasto indietro.
    const falliti = [...detto.matchAll(/^ERR:(\d+):(.*)$/gm)].map((riga) => ({
      indice: Number(riga[1]),
      errore: riga[2].trim() || 'Outlook non ha detto perché.',
    }))

    const conto = detto.match(/OK:(\d+)/)
    if (!conto) {
      return {
        ok: false,
        quante: 0,
        falliti,
        errore: detto || 'Outlook non ha detto come è andata.',
      }
    }
    // Un giro in cui non è passato niente è un giro fallito; uno in cui è
    // passato qualcosa no, e i nomi di chi è rimasto fuori sono in `falliti`.
    const quante = Number(conto[1])
    return {
      ok: quante > 0 || falliti.length === 0,
      quante,
      falliti,
      errore: quante === 0 && falliti.length > 0 ? falliti[0].errore : undefined,
    }
  } catch (errore) {
    return { ok: false, quante: 0, falliti: [], errore: (errore as Error).message }
  } finally {
    // I dati di una comunicazione — indirizzi delle famiglie, testo del
    // messaggio — non restano in giro nella cartella temporanea un minuto più
    // del necessario.
    await togli(fileDati)
    await togli(fileScript)
  }
}

async function togli (file: vscode.Uri): Promise<void> {
  try {
    await vscode.workspace.fs.delete(file)
  } catch {
    // Non c'era, o è già sparito: non è un guasto di cui valga la pena parlare.
  }
}

/**
 * Fa girare lo script, dando tempo a Outlook di svegliarsi.
 *
 * Outlook che parte da fermo può metterci una decina di secondi: due minuti
 * sono larghi per il caso buono e stretti abbastanza da non lasciare il
 * registro appeso per sempre se qualcosa si è impuntato. Poi cinque secondi
 * per messaggio, e non è prudenza sprecata: un'attesa che scade a metà di un
 * giro di invii lascia le prime mail partite e il registro convinto che non
 * sia partito niente — e chi riprova le manda una seconda volta alle stesse
 * famiglie. Il tetto è dieci minuti, che è quanto si può ragionevolmente
 * restare fermi a guardare.
 */
function eseguiPowerShell (
  script: string,
  /** Il file JSON con i messaggi, per gli script che ne vogliono uno. */
  dati: string | null,
  quanti: number,
): Promise<{ testo: string }> {
  const attesa = Math.min(120_000 + quanti * 5_000, 600_000)
  const argomenti = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script]
  if (dati) argomenti.push('-Dati', dati)
  return new Promise((risolvi, rifiuta) => {
    execFile(
      'powershell.exe',
      argomenti,
      { timeout: attesa, windowsHide: true },
      (errore, uscita, errori) => {
        // I codici 2 e 3 sono quelli con cui gli script dicono «Outlook non c'è»
        // e «Outlook non ha profili»: non sono guasti dell'esecuzione, ed è il
        // testo che va letto.
        if (errore && !/NO-(OUTLOOK|PROFILO)/.test(`${uscita}`)) {
          rifiuta(new Error(`${errori}`.trim() || errore.message))
          return
        }
        risolvi({ testo: `${uscita}` })
      },
    )
  })
}
