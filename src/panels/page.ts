// La pagina che ospita i due pannelli (registro e proiezione): politica di
// sicurezza, scheletro HTML, cartelle leggibili. I pannelli passano solo bundle,
// titolo e classe della radice.

import { randomBytes } from 'node:crypto'

import * as apparato from 'apparato'

import { deposito } from '../data/store.js'
import { cartellaAnno, cartellaDocumento } from '../data/paths.js'

/**
 * Radice dei file che una pagina carica: la cartella dell'anno in uso, perché
 * i percorsi salvati nei JSON (`documentazione/…`, `risorse/…`) sono relativi a lei.
 */
export function radiceRisorse (): apparato.Uri | null {
  // Radice delle copie, che il protocollo materializza a richiesta; senza un
  // anno aperto si ripiega sulle cartelle dell'anno o del documento.
  return deposito()?.radice() ?? cartellaAnno() ?? cartellaDocumento()
}

/**
 * Cartelle leggibili da una pagina: codice, immagini dell'app, dati del docente.
 * L'ultima cambia con l'anno, perciò i pannelli la ricalcolano (`aggiornaRisorse()`).
 */
export function radiciDellaPagina (radiceApp: apparato.Uri): apparato.Uri[] {
  const dati = radiceRisorse()
  return [
    apparato.Uri.joinPath(radiceApp, 'dist'),
    apparato.Uri.joinPath(radiceApp, 'resources'),
    ...(dati ? [dati] : []),
  ]
}

/** Nonce dello script, nuovo a ogni pagina costruita. */
function nonce (): string {
  // Crittografico: un nonce indovinabile rende inutile la CSP.
  return randomBytes(24).toString('base64url')
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
 * L'HTML di una pagina del registro. CSP stretta: niente rete, niente `eval`,
 * solo lo script col nonce, perché la pagina mostra dati personali degli allievi.
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
    `img-src ${origine} data:`, // testo-fisso: direttiva CSP
    `style-src ${origine} 'unsafe-inline'`, // testo-fisso: direttiva CSP
    `font-src ${origine}`, // testo-fisso: direttiva CSP
    `script-src 'nonce-${chiave}'`, // testo-fisso: direttiva CSP
    // Anteprima dei PDF stampati in una cornice (lettore di Chromium), solo da `registro://`.
    `frame-src ${origine}`, // testo-fisso: direttiva CSP
    // `fetch` dei CSV, che la pagina legge da sé per disegnarne la tabella; solo da `registro://`.
    `connect-src ${origine}`, // testo-fisso: direttiva CSP
  ].join('; ')

  // `data-sistema` serve al CSS della barra del titolo: su macOS i semafori
  // stanno a sinistra e `env(titlebar-area-*)` non esiste.
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
