// Lo schema `registro://`, che è quel che sul desktop sostituisce
// `asWebviewUri`.
//
// Quattro autorità, e ognuna risponde a una domanda diversa:
//
//   registro://pagina/<id>       l'HTML che `webview.html` ha memorizzato
//   registro://app/<percorso>    i file dell'applicazione: bundle e immagini
//   registro://dati/<percorso>   i file del docente: le risorse dei piani
//   registro://mappa/<z>/<x>/<y>.png  i tasselli della mappa, con la loro cache
//
// Lo schema si dichiara privilegiato prima che l'applicazione sia pronta:
// `standard: true` perché l'origine sia un'origine vera e la
// Content-Security-Policy del pannello combaci, `stream: true` perché i PDF e
// le immagini dell'archivio possono essere grossi e non ha senso tenerli tutti
// in memoria.

import { net, protocol } from 'electron'
import { pathToFileURL } from 'node:url'

import { dentro, radiceApp } from '../../src/environment/context.js'
import { deposito } from '../../src/data/store.js'
import { htmlDellaPagina, radiciConcesse } from '../../src/environment/windows.js'
import { Uri } from '../../src/environment/uri.js'
import { leggiCoordinate, tassello } from './tiles.js'

const SCHEMA = 'registro'

/** Da chiamare prima di `app.whenReady()`: dopo, la dichiarazione non conta più. */
export function privilegiaSchema (): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEMA,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        // Le autorità sono origini diverse, e `fetch` da una all'altra è
        // un caso normale qui dentro: la pagina sta su `registro://pagina/<id>`
        // e i byte che chiede — un PDF da sfogliare, un CSV da leggere, i
        // caratteri di pdfjs — stanno su `registro://dati` e `registro://app`.
        // Senza questa riga Chromium non applica CORS allo schema: lo rifiuta e
        // basta, con «Cross origin requests are only supported for protocol
        // schemes: chrome, …». Acceso, le richieste passano dal controllo
        // normale, che `conOrigine` soddisfa per le nostre sole origini.
        corsEnabled: true,
      },
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

/**
 * Il permesso di lettura fra le autorità di `registro://`, e solo fra quelle.
 *
 * Con `corsEnabled` acceso, una risposta senza `Access-Control-Allow-Origin`
 * arriva al renderer come un errore di rete e basta — lo stato vero non si
 * vede, e un 403 delle radici concesse si presenterebbe come un guasto
 * misterioso. Si rimanda indietro l'origine che ha chiesto, non `*`: allargare
 * a tutti vorrebbe dire che una pagina qualunque, se mai ne finisse una dentro
 * l'applicazione, potrebbe leggersi i file del docente.
 *
 * Il corpo si passa com'è, che è quel che tiene in piedi lo streaming di
 * `net.fetch`: un PDF da nove megabyte continua ad arrivare a pezzi.
 */
function conOrigine (risposta: Response, origine: string | null): Response {
  if (origine === null || !origine.startsWith(`${SCHEMA}://`)) return risposta
  const intestazioni = new Headers(risposta.headers)
  intestazioni.set('access-control-allow-origin', origine)
  return new Response(risposta.body, {
    status: risposta.status,
    statusText: risposta.statusText,
    headers: intestazioni,
  })
}

async function serviFile (file: Uri): Promise<Response> {
  if (!concesso(file)) return rifiuta(403, `${file.fsPath} è fuori dalle cartelle concesse`)
  // I file dell'anno stanno dentro il documento, e la copia su disco può non
  // esserci ancora: si scrive adesso, che è la prima volta che qualcuno la
  // chiede davvero. Materializzare tutto all'apertura vorrebbe dire estrarre
  // nove megabyte di PDF per mostrare due foto.
  await deposito()?.materializzaChiesto(file)
  // Con `net.fetch` il file arriva a pezzi invece che tutto in memoria, ed è
  // quel che serve alle scansioni e ai piani con le immagini dentro.
  return net.fetch(pathToFileURL(file.fsPath).toString())
}

export function registraProtocollo (): void {
  protocol.handle(SCHEMA, async (richiesta) => {
    // Chi ha chiesto. C'è quando la richiesta viene da `fetch`; per un `<img>` o
    // per il lettore di PDF di Chromium non c'è, e non serve — quelle non
    // passano dal controllo.
    const origine = richiesta.headers.get('origin')
    const indirizzo = new URL(richiesta.url)
    const segmenti = indirizzo.pathname
      .split('/')
      .filter((pezzo) => pezzo !== '')
      .map((pezzo) => decodeURIComponent(pezzo))

    // Prima di risolvere qualunque cosa: un segmento di risalita non ha mai
    // motivo di esserci, e riconoscerlo qui dice che cosa è successo. Lo si
    // guarda dopo la decodifica, perché `%2e%2e` è la forma in cui arriverebbe.
    if (segmenti.some((pezzo) => pezzo === '..' || pezzo === '.')) {
      return conOrigine(rifiuta(403, `${indirizzo.pathname} contiene una risalita`), origine)
    }

    return conOrigine(await serviRichiesta(indirizzo, segmenti), origine)
  })
}

/** Che cosa c'è a quell'indirizzo, senza sapere chi lo chiede. */
async function serviRichiesta (indirizzo: URL, segmenti: string[]): Promise<Response> {
  switch (indirizzo.hostname) {
    case 'pagina': {
      const html = htmlDellaPagina(segmenti[0] ?? '')
      if (html === undefined) return rifiuta(404, 'pagina chiusa o mai aperta')
      return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
    }

    case 'app':
      // Relativo alla radice dell'app: il registro chiede `dist/panel.js` e
      // quel file sta lì. La difesa è `serviFile`, che non lascia uscire
      // dalle radici concesse.
      return serviFile(Uri.joinPath(radiceApp(), ...segmenti))

    case 'dati':
      // Percorso intero, perché la cartella dei dati si sposta: la difesa non
      // è il percorso ma le radici concesse, che `serviFile` verifica.
      return serviFile(Uri.file(segmenti.join('/')))

    case 'mappa': {
      // I tasselli della mappa, che non stanno né fra i file dell'app né fra
      // quelli del docente: arrivano da OpenStreetMap e vivono in una cache in
      // `userData`. Passano di qui perché la pagina non ha il permesso di
      // chiamare fuori, e non deve averlo: vedi `shell/protocol/tiles.ts`.
      const dove = leggiCoordinate(segmenti)
      if (!dove) return rifiuta(404, `${indirizzo.pathname} non è un tassello`)
      return tassello(dove.z, dove.x, dove.y)
    }

    default:
      return rifiuta(404, `autorità sconosciuta: ${indirizzo.hostname}`)
  }
}
