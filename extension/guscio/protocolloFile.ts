// Lo schema `registro://`, che è quel che sul desktop sostituisce
// `asWebviewUri`.
//
// Tre autorità, e ognuna risponde a una domanda diversa:
//
//   registro://pagina/<id>       l'HTML che `webview.html` ha memorizzato
//   registro://app/<percorso>    i file dell'applicazione: bundle e immagini
//   registro://dati/<percorso>   i file del docente: le risorse dei piani
//
// Lo schema si dichiara privilegiato prima che l'applicazione sia pronta:
// `standard: true` perché l'origine sia un'origine vera e la
// Content-Security-Policy del pannello combaci, `stream: true` perché i PDF e
// le immagini dell'archivio possono essere grossi e non ha senso tenerli tutti
// in memoria.

import { net, protocol } from 'electron'
import { pathToFileURL } from 'node:url'

import { dentro, radiceApp } from '../src/ambiente/contesto.js'
import { htmlDellaPagina, radiciConcesse } from '../src/ambiente/finestre.js'
import { Uri } from '../src/ambiente/uri.js'

export const SCHEMA = 'registro'

/** Da chiamare prima di `app.whenReady()`: dopo, la dichiarazione non conta più. */
export function privilegiaSchema (): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEMA,
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
    },
  ])
}

function rifiuta (stato: number, motivo: string): Response {
  // Sulla console e non in silenzio: un 403 in sviluppo si nota e si capisce,
  // e senza la riga si passerebbe il pomeriggio a cercare un file che c'è.
  if (stato === 403) console.error(`registro://: rifiutato — ${motivo}`)
  return new Response(motivo, { status: stato, headers: { 'content-type': 'text/plain; charset=utf-8' } })
}

/**
 * Il controllo che rende innocuo un percorso.
 *
 * Non è una precauzione teorica: i nomi dei file finiscono nei JSON del
 * registro, e non li scrive tutti il docente — arrivano anche dai PDF che
 * entrano dalla cassetta `in-arrivo/`, per via dello smistamento. Un `..` in un
 * nome, senza questo controllo, diventa la lettura di un file qualunque del
 * disco da dentro una pagina.
 */
function concesso (file: Uri): boolean {
  return radiciConcesse().some((radice) => dentro(radice, file))
}

async function serviFile (file: Uri): Promise<Response> {
  if (!concesso(file)) return rifiuta(403, `${file.fsPath} è fuori dalle cartelle concesse`)
  // Con `net.fetch` il file arriva a pezzi invece che tutto in memoria, ed è
  // quel che serve alle scansioni e ai piani con le immagini dentro.
  return net.fetch(pathToFileURL(file.fsPath).toString())
}

export function registraProtocollo (): void {
  protocol.handle(SCHEMA, async (richiesta) => {
    const indirizzo = new URL(richiesta.url)
    const segmenti = indirizzo.pathname
      .split('/')
      .filter((pezzo) => pezzo !== '')
      .map((pezzo) => decodeURIComponent(pezzo))

    // Prima di risolvere qualunque cosa: un segmento di risalita non ha mai
    // motivo di esserci, e riconoscerlo qui dice che cosa è successo. Lo si
    // guarda dopo la decodifica, perché `%2e%2e` è la forma in cui arriverebbe.
    if (segmenti.some((pezzo) => pezzo === '..' || pezzo === '.')) {
      return rifiuta(403, `${indirizzo.pathname} contiene una risalita`)
    }

    switch (indirizzo.hostname) {
      case 'pagina': {
        const html = htmlDellaPagina(segmenti[0] ?? '')
        if (html === undefined) return rifiuta(404, 'pagina chiusa o mai aperta')
        return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
      }

      case 'app':
        // Relativo alla radice dell'app: il registro chiede `dist/pannello.js` e
        // quel file sta lì. La difesa è `serviFile`, che non lascia uscire
        // dalle radici concesse.
        return serviFile(Uri.joinPath(radiceApp(), ...segmenti))

      case 'dati':
        // Percorso intero, perché la cartella dei dati si sposta: la difesa non
        // è il percorso ma le radici concesse, che `serviFile` verifica.
        return serviFile(Uri.file(segmenti.join('/')))

      default:
        return rifiuta(404, `autorità sconosciuta: ${indirizzo.hostname}`)
    }
  })
}
