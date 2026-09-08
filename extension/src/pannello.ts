// Il pannello del registro: un webview solo, riusato.
//
// Aprire il registro due volte non ha senso — sono gli stessi dati, e due copie
// dello stesso stato si contraddicono appena una delle due salva. Qui c'è
// un'istanza sola: la seconda chiamata a `mostra` porta in primo piano quella
// che c'è già.

import * as vscode from 'vscode'

import { azioneValida, esegui } from './azioni.js'
import type { Archivio } from './dati/archivio.js'
import { impostazioniOcr } from './dati/ocr.js'
import { outlookPossibile } from './dati/outlook.js'
import { collegatoNoto, conto as contoExchange } from './dati/exchange.js'
import { modoAccesso } from './dati/oauth.js'
import { invioDiretto, mittente as mittentePosta } from './dati/posta.js'
import { smistatoreDi } from './dati/smistatore.js'
import { cartellaAnno, cartellaDati } from './dati/percorsi.js'
import { riferimentiRotti } from './dominio/validazione.js'
import { allaProiezione, PannelloProiezione, statoProiezione } from './pannelloProiezione.js'
import type { MessaggioNavigazione, MessaggioVersoWebview, Richiesta } from './protocollo.js'

function nonce (): string {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let esito = ''
  for (let i = 0; i < 32; i += 1) esito += alfabeto[Math.floor(Math.random() * alfabeto.length)]
  return esito
}

/**
 * La radice dei file che il webview carica: la cartella dell'anno in uso.
 *
 * I percorsi salvati nei JSON — `documentazione/…`, `quarantena/…`, `risorse/…`
 * — sono relativi alla cartella dell'anno, non a quella dei dati: è quel che
 * permette di spostare un anno intero senza rompere i riferimenti. Chi
 * componesse gli indirizzi sulla cartella dei dati salterebbe il segmento
 * dell'anno, e ogni immagine arriverebbe vuota.
 */
function radiceRisorse (): vscode.Uri | null {
  return cartellaAnno() ?? cartellaDati()
}

/** Le risorse del pannello: dove sta il codice e dove stanno i dati. */
function localResourceRoots (extensionUri: vscode.Uri): vscode.Uri[] {
  const radice = radiceRisorse()
  return [
    vscode.Uri.joinPath(extensionUri, 'dist'),
    vscode.Uri.joinPath(extensionUri, 'media'),
    ...(radice ? [radice] : []),
  ]
}

export class PannelloRegistro {
  private static istanza: PannelloRegistro | null = null

  private readonly smaltibili: vscode.Disposable[] = []
  /** Navigazione chiesta prima che il webview fosse pronto ad ascoltare. */
  private navigazioneInAttesa: MessaggioNavigazione | null = null
  private pronto = false
  /** Le richieste si eseguono una dopo l'altra: mai due insieme sullo stesso registro. */
  private coda: Promise<void> = Promise.resolve()
  /** Una spinta dello stato è già in coda: non se ne accoda una seconda. */
  private spintaInSospeso = false

  private constructor (
    private readonly pannello: vscode.WebviewPanel,
    private readonly contesto: vscode.ExtensionContext,
    private readonly archivio: Archivio,
  ) {
    this.pannello.webview.html = this.html()

    this.smaltibili.push(
      this.pannello.webview.onDidReceiveMessage((messaggio) => this.gestisci(messaggio)),
      // Ogni modifica dell'archivio — anche quelle che arrivano da fuori, per
      // esempio da un file modificato a mano — si riversa nel webview.
      this.archivio.alCambiamento(() => this.spingiStato()),
      // La lettura delle scansioni si accende dalle impostazioni di VS Code, e
      // il pannello deve accorgersene subito: altrimenti il pulsante continua a
      // proporre di attivarla dopo che è stata attivata.
      vscode.workspace.onDidChangeConfiguration((evento) => {
        if (evento.affectsConfiguration('registroDocenti.ocr')) this.spingiStato()
      }),
      // L'avanzamento della lettura arriva a parte, e spesso: una pagina di
      // scansione impiega decine di secondi, e per tutto quel tempo il pannello
      // deve poter dire che cosa sta macinando e che cosa aspetta in coda.
      // Com'è messa la proiezione: i suoi comandi stanno qui, nel pannello del
      // docente, e devono raccontare quel che sta davvero sullo schermo grande
      // — anche quando è stato chiuso dalla sua finestra, chiudendo la scheda.
      allaProiezione((stato) => this.invia(stato)),
      smistatoreDi(this.archivio).allAvanzamento((avanzamento) =>
        this.invia({
          tipo: 'lavoro',
          corrente: avanzamento.corrente,
          fatte: avanzamento.fatte,
          totale: avanzamento.totale,
          coda: avanzamento.coda,
        }),
      ),
    )

    this.pannello.onDidDispose(() => this.smaltisci(), null, this.smaltibili)
  }

  /** Apre il registro, o lo riporta davanti se è già aperto. */
  static mostra (
    contesto: vscode.ExtensionContext,
    archivio: Archivio,
    navigazione?: MessaggioNavigazione,
  ): PannelloRegistro {
    if (PannelloRegistro.istanza) {
      PannelloRegistro.istanza.pannello.reveal(vscode.ViewColumn.One)
      if (navigazione) PannelloRegistro.istanza.naviga(navigazione)
      return PannelloRegistro.istanza
    }

    const pannello = vscode.window.createWebviewPanel(
      'registroDocenti.pannello',
      'Registro',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        // Il registro è pieno di moduli a metà compilazione: ricostruire tutto
        // ogni volta che si guarda un altro file farebbe perdere il lavoro.
        retainContextWhenHidden: true,
        // Oltre al proprio codice, il pannello deve poter mostrare le immagini
        // che stanno nella cartella dei dati: sono risorse dei piani lezione.
        localResourceRoots: localResourceRoots(contesto.extensionUri),
      },
    )
    pannello.iconPath = vscode.Uri.joinPath(contesto.extensionUri, 'media', 'registro.svg')

    PannelloRegistro.istanza = new PannelloRegistro(pannello, contesto, archivio)
    if (navigazione) PannelloRegistro.istanza.naviga(navigazione)
    return PannelloRegistro.istanza
  }

  static get aperto (): boolean {
    return PannelloRegistro.istanza !== null
  }

  static chiudi (): void {
    PannelloRegistro.istanza?.pannello.dispose()
  }

  /**
   * Da chiamare quando cambia `registroDocenti.cartellaDati`: se il pannello
   * era già aperto, tiene i `localResourceRoots` di una cartella che non è
   * più quella giusta, e le immagini dei piani della classe appena caricata
   * risulterebbero fuori dalla sandbox concessa al webview.
   */
  static aggiornaRisorse (): void {
    PannelloRegistro.istanza?.aggiornaRisorse()
    // Anche lo schermo per la classe mostra le immagini dei piani: se resta con
    // la sandbox della cartella di prima, la scaletta proiettata perde le
    // figure proprio mentre la classe la sta guardando.
    PannelloProiezione.aggiornaRisorse()
  }

  /**
   * Una notifica di errore, mostrata una volta sola: nel webview se il
   * pannello è aperto — dove il resto delle notifiche del registro compare
   * già — altrimenti con la finestra di VS Code, che è l'unico posto in cui
   * chi non ha ancora aperto il registro può vederla.
   */
  static avvisa (testo: string): void {
    if (PannelloRegistro.istanza) {
      PannelloRegistro.istanza.invia({ tipo: 'notifica', livello: 'errore', testo })
    } else {
      void vscode.window.showErrorMessage(`Registro: ${testo}`)
    }
  }

  naviga (messaggio: MessaggioNavigazione): void {
    if (this.pronto) this.invia(messaggio)
    else this.navigazioneInAttesa = messaggio
  }

  private aggiornaRisorse (): void {
    this.pannello.webview.options = {
      ...this.pannello.webview.options,
      localResourceRoots: localResourceRoots(this.contesto.extensionUri),
    }
  }

  // ---------------------------------------------------------------- messaggi

  private gestisci (messaggio: unknown): void {
    const richiesta = messaggio as Richiesta
    if (!richiesta || typeof richiesta.id !== 'number' || !richiesta.azione) return

    // La prima richiesta è sempre 'stato.leggi': è il segnale che lo script del
    // webview è partito e che si può consegnare quel che era in attesa.
    if (!this.pronto) {
      this.pronto = true
      // Com'è messa la proiezione, subito: ricostruendo il webview — un cambio
      // di tema, una finestra riaperta — i suoi comandi devono ritrovarsi come
      // erano, non spenti mentre lo schermo grande è ancora acceso.
      this.invia(statoProiezione())
      if (this.navigazioneInAttesa) {
        const inAttesa = this.navigazioneInAttesa
        this.navigazioneInAttesa = null
        setTimeout(() => this.invia(inAttesa), 0)
      }
    }

    // In coda, una dopo l'altra: due richieste arrivate vicine — un doppio
    // clic, un salvataggio e una spunta nello stesso istante — non si devono
    // intrecciare sullo stesso registro. Un errore nell'una non deve fermare
    // le altre: la coda continua comunque.
    this.coda = this.coda.then(() => this.eseguiRichiesta(richiesta)).catch(() => undefined)
  }

  private async eseguiRichiesta (richiesta: Richiesta): Promise<void> {
    if (!azioneValida(richiesta.azione.tipo)) {
      this.invia({
        tipo: 'risposta',
        id: richiesta.id,
        ok: false,
        errori: [`Azione sconosciuta: «${richiesta.azione.tipo}».`],
      })
      return
    }

    try {
      const esito = await esegui(this.archivio, richiesta.azione)
      // Lo stato prima della risposta: il webview ridisegna nella microtask
      // con cui la risposta risolve la sua promessa, e a quel punto deve
      // trovare già il registro aggiornato — non quello di un attimo prima.
      // `invariato` è un'azione riuscita che non ha toccato i dati — dove
      // guardare, che cosa proiettare: rispingere il registro intero per una
      // cosa che nel registro non c'è sarebbe lavoro fatto per niente, e ne
      // arriva una a ogni gesto.
      if (esito.ok && !esito.invariato) {
        this.spingiStato()
        this.flushStato()
      }
      this.invia({
        tipo: 'risposta',
        id: richiesta.id,
        ok: esito.ok,
        errori: esito.errori,
        creato: esito.creato,
        messaggio: esito.messaggio,
      })
    } catch (errore) {
      const testo = errore instanceof Error ? errore.message : String(errore)
      this.invia({ tipo: 'risposta', id: richiesta.id, ok: false, errori: [testo] })
      PannelloRegistro.avvisa(testo)
    }
  }

  /**
   * Segna il registro cambiato. Una singola azione può scrivere più volte —
   * una spedizione per allievo, ognuna con la sua `archivio.modifica` — e
   * ognuna fa scattare `alCambiamento`: senza questo cancelletto finirebbero
   * per serializzare e spedire il registro una volta a scrittura invece che
   * una sola, alla fine.
   */
  private spingiStato (): void {
    if (this.spintaInSospeso) return
    this.spintaInSospeso = true
    queueMicrotask(() => this.flushStato())
  }

  /** La spinta vera e propria: la si chiama subito quando serve prima di un'altra cosa. */
  private flushStato (): void {
    if (!this.spintaInSospeso) return
    this.spintaInSospeso = false
    const cartella = radiceRisorse()
    this.invia({
      tipo: 'stato',
      registro: this.archivio.registro,
      avvisi: riferimentiRotti(this.archivio.registro),
      radiceDati: cartella ? this.pannello.webview.asWebviewUri(cartella).toString() : null,
      ocrAttivo: impostazioniOcr().attivo,
      posta: {
        outlook: outlookPossibile(),
        exchange: collegatoNoto(),
        server: contoExchange().server,
        modo: modoAccesso(),
        invioDiretto: invioDiretto(),
        mittente: mittentePosta(),
      },
    })
  }

  private invia (messaggio: MessaggioVersoWebview): void {
    void this.pannello.webview.postMessage(messaggio)
  }

  // ---------------------------------------------------------------- pagina

  private html (): string {
    const webview = this.pannello.webview
    const risorsa = (...parti: string[]) =>
      webview.asWebviewUri(vscode.Uri.joinPath(this.contesto.extensionUri, ...parti))

    const chiave = nonce()
    const script = risorsa('dist', 'webview.js')
    const stile = risorsa('dist', 'webview.css')

    // Politica stretta: niente rete, niente eval, e solo lo script con questo
    // nonce. Nel registro ci sono nomi di allievi e note personali: il pannello
    // non ha motivo di parlare con l'esterno.
    const csp = [
      "default-src 'none'",
      `img-src ${webview.cspSource} data:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `font-src ${webview.cspSource}`,
      `script-src 'nonce-${chiave}'`,
    ].join('; ')

    return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="${stile}" rel="stylesheet">
  <title>Registro</title>
</head>
<body>
  <div id="radice" class="app"></div>
  <script nonce="${chiave}" src="${script}"></script>
</body>
</html>`
  }

  private smaltisci (): void {
    PannelloRegistro.istanza = null
    // Chiudendo il registro si chiude anche lo schermo per la classe: da solo
    // resterebbe acceso su un'ora che nessuno può più cambiare, e i suoi
    // comandi stanno tutti in questa finestra.
    PannelloProiezione.chiudi()
    while (this.smaltibili.length > 0) this.smaltibili.pop()?.dispose()
  }
}
