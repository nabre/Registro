// Quel che i due pannelli hanno in comune: la pagina che li ospita.
//
// Il registro e lo schermo per la classe sono due cose diverse — uno modifica i
// dati, l'altro li legge davanti a venticinque persone — ma la pagina in cui
// vivono è la stessa cosa fin nei dettagli: la stessa politica di sicurezza, lo
// stesso scheletro HTML, le stesse cartelle da cui possono leggere. Prima era
// scritta due volte, e le due copie erano già leggermente diverse fra loro —
// una chiamava `dati` quel che l'altra chiamava `radice` — che è il primo
// stadio del divergere.
//
// Qui c'è una volta sola, e i due pannelli passano le tre cose che davvero li
// distinguono: quale bundle caricare, che titolo dare alla finestra, che classe
// mettere sull'elemento radice.

import * as apparato from 'apparato'

import { deposito } from '../data/store.js'
import { cartellaAnno, cartellaDocumento } from '../data/paths.js'

/**
 * La radice dei file che una pagina carica: la cartella dell'anno in uso.
 *
 * I percorsi salvati nei JSON — `documentazione/…`, `quarantena/…`, `risorse/…`
 * — sono relativi alla cartella dell'anno, non a quella dei dati: è quel che
 * permette di spostare un anno intero senza rompere i riferimenti. Chi
 * componesse gli indirizzi sulla cartella dei dati salterebbe il segmento
 * dell'anno, e ogni immagine arriverebbe vuota.
 */
export function radiceRisorse (): apparato.Uri | null {
  // I file dell'anno stanno dentro il documento, e una pagina sa aprire solo
  // indirizzi: la radice è quella delle copie, e il protocollo le materializza
  // quando la pagina le chiede. Senza un anno aperto si ripiega su quel che
  // c'era prima, che è anche il caso di un registro mai usato.
  return deposito()?.radice() ?? cartellaAnno() ?? cartellaDocumento()
}

/**
 * Le cartelle da cui una pagina può leggere: dove sta il codice, dove stanno le
 * immagini dell'applicazione, e dove stanno i dati del docente.
 *
 * L'ultima cambia quando cambia l'anno, ed è la ragione per cui i due pannelli
 * la ricalcolano invece di ricordarsela: `aggiornaRisorse()`, in tutti e due.
 */
export function radiciDellaPagina (radiceApp: apparato.Uri): apparato.Uri[] {
  const dati = radiceRisorse()
  return [
    apparato.Uri.joinPath(radiceApp, 'dist'),
    apparato.Uri.joinPath(radiceApp, 'resources'),
    ...(dati ? [dati] : []),
  ]
}

/**
 * Il numero che autorizza lo script della pagina, e nient'altro.
 *
 * Nuovo a ogni pagina costruita: è quel che rende `script-src 'nonce-…'` una
 * difesa e non una formalità.
 */
function nonce (): string {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let esito = ''
  for (let i = 0; i < 32; i += 1) esito += alfabeto[Math.floor(Math.random() * alfabeto.length)]
  return esito
}

export interface Pagina {
  readonly webview: apparato.Webview
  /** La radice dell'applicazione: di lì si compongono gli indirizzi dei bundle. */
  readonly radiceApp: apparato.Uri
  /** Il nome dei due bundle, senza estensione: `pannello`, `proiezione`. */
  readonly bundle: string
  /** Il titolo della finestra. */
  readonly titolo: string
  /** La classe dell'elemento radice, su cui poggia il foglio di stile. */
  readonly classe: string
}

/**
 * L'HTML di una pagina del registro.
 *
 * La politica è stretta e vale per tutte e due: niente rete, niente `eval`, e
 * solo lo script che porta questo nonce. Nel registro ci sono nomi di allievi,
 * note personali e valutazioni — nessuna di queste pagine ha motivo di parlare
 * con l'esterno, e dirlo qui una volta sola è meglio che ricordarselo due.
 */
export function paginaHtml (pagina: Pagina): string {
  const risorsa = (...parti: string[]) =>
    pagina.webview.asWebviewUri(apparato.Uri.joinPath(pagina.radiceApp, ...parti))

  const chiave = nonce()
  const script = risorsa('dist', `${pagina.bundle}.js`)
  const stile = risorsa('dist', `${pagina.bundle}.css`)
  const origine = pagina.webview.cspSource

  const csp = [
    "default-src 'none'",
    `img-src ${origine} data:`,
    `style-src ${origine} 'unsafe-inline'`,
    `font-src ${origine}`,
    `script-src 'nonce-${chiave}'`,
    // I documenti che il registro ha stampato, guardati dentro la pagina: il
    // riquadro dell'anteprima è una cornice con dentro il lettore di PDF di
    // Chromium, e senza questa riga resterebbe vuota senza dire perché. Vale
    // solo per `registro://`, che serve i file della cartella dei dati: la
    // pagina non può inquadrare niente che venga da fuori.
    `frame-src ${origine}`,
    // Un CSV non si inquadra: il lettore di PDF non saprebbe che farne, e la
    // pagina lo legge da sé per disegnarne la tabella. Per leggerlo le serve una
    // `fetch` allo stesso protocollo da cui il telaio prende i PDF. Vale solo
    // per quello — `default-src 'none'` resta — quindi la pagina continua a non
    // poter chiamare niente che venga da fuori.
    `connect-src ${origine}`,
  ].join('; ')

  // Il sistema operativo, scritto nella radice del documento.
  //
  // Lo legge solo il CSS della barra del titolo, e non ha altro modo di
  // saperlo: su macOS i tre semafori stanno a sinistra dentro la barra, su
  // Windows e Linux i pulsanti stanno a destra e Chromium pubblica
  // `env(titlebar-area-*)` per dire quanto spazio prendono. Su macOS quelle
  // variabili non esistono, e senza questo attributo la pagina disegnerebbe i
  // propri pulsanti sotto i semafori.
  return `<!DOCTYPE html>
<html lang="it" data-sistema="${process.platform}">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="${stile.toString()}" rel="stylesheet">
  <title>${pagina.titolo}</title>
</head>
<body>
  <div id="radice" class="${pagina.classe}"></div>
  <script nonce="${chiave}" src="${script.toString()}"></script>
</body>
</html>`
}
