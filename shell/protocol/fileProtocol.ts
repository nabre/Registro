// Lo schema `registro://`, con quattro autorità:
//
//   registro://pagina/<id>       l'HTML che `webview.html` ha memorizzato
//   registro://app/<percorso>    i file dell'applicazione: bundle e immagini
//   registro://dati/<percorso>   i file del docente: le risorse dei piani
//   registro://mappa/<z>/<x>/<y>.png  i tasselli della mappa, con la loro cache
//
// Privilegiato prima che l'applicazione sia pronta: `standard` perché
// l'origine sia vera e la CSP del pannello combaci, `stream` per i PDF grossi.

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
        // Le autorità sono origini diverse, e la pagina (`registro://pagina`)
        // fa `fetch` su `registro://dati` e `registro://app`. Senza CORS
        // Chromium rifiuta ogni richiesta fra origini; `conOrigine` la concede
        // alle sole nostre.
        corsEnabled: true,
      },
    },
  ])
}

function rifiuta (stato: number, motivo: string): Response {
  // Un 403 si scrive in console, o non si capirebbe perché un file che c'è non arriva.
  if (stato === 403) console.error(`registro://: rifiutato — ${motivo}`)
  return new Response(motivo, { status: stato, headers: { 'content-type': 'text/plain; charset=utf-8' } })
}

/**
 * Vero se il file sta sotto una radice concessa. I nomi nei JSON arrivano anche
 * dai PDF smistati da `in-arrivo/`: senza controllo, un `..` leggerebbe qualunque file.
 */
function concesso (file: Uri): boolean {
  return radiciConcesse().some((radice) => dentro(radice, file))
}

/**
 * Il permesso di lettura fra le autorità di `registro://`, e solo fra quelle:
 * si rimanda l'origine che ha chiesto, non `*`. Senza l'intestazione il
 * renderer vedrebbe un errore di rete invece dello stato vero. Il corpo passa
 * com'è, per non rompere lo streaming.
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
  // testo-fisso: risposta del protocollo per chi sviluppa, nessuna pagina la mostra
  if (!concesso(file)) return rifiuta(403, `${file.fsPath} è fuori dalle cartelle concesse`)
  // I file dell'anno stanno nel documento: la copia su disco si scrive alla
  // prima richiesta, non tutte all'apertura.
  await deposito()?.materializzaChiesto(file)
  // `net.fetch` consegna il file a pezzi invece che tutto in memoria.
  return net.fetch(pathToFileURL(file.fsPath).toString())
}

export function registraProtocollo (): void {
  protocol.handle(SCHEMA, async (richiesta) => {
    // C'è solo per `fetch`; `<img>` e il lettore PDF non passano dal controllo CORS.
    const origine = richiesta.headers.get('origin')
    const indirizzo = new URL(richiesta.url)
    const segmenti = indirizzo.pathname
      .split('/')
      .filter((pezzo) => pezzo !== '')
      .map((pezzo) => decodeURIComponent(pezzo))

    // Una risalita non ha mai motivo di esserci. Dopo la decodifica, perché
    // arriverebbe come `%2e%2e`.
    if (segmenti.some((pezzo) => pezzo === '..' || pezzo === '.')) {
      // testo-fisso: risposta del protocollo per chi sviluppa, nessuna pagina la mostra
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
      // testo-fisso: risposta del protocollo per chi sviluppa, nessuna pagina la mostra
      if (html === undefined) return rifiuta(404, 'pagina chiusa o mai aperta')
      return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
    }

    case 'app':
      // Relativo alla radice dell'app; `serviFile` non lascia uscire dalle radici concesse.
      return serviFile(Uri.joinPath(radiceApp(), ...segmenti))

    case 'dati':
      // Percorso intero, perché la cartella dei dati si sposta; `serviFile` verifica le radici.
      return serviFile(Uri.file(segmenti.join('/')))

    case 'mappa': {
      // Da OpenStreetMap, con cache in `userData`: la pagina non può chiamare
      // fuori (vedi `shell/protocol/tiles.ts`).
      const dove = leggiCoordinate(segmenti)
      // testo-fisso: risposta del protocollo per chi sviluppa, nessuna pagina la mostra
      if (!dove) return rifiuta(404, `${indirizzo.pathname} non è un tassello`)
      return tassello(dove.z, dove.x, dove.y)
    }

    default:
      // testo-fisso: risposta del protocollo per chi sviluppa, nessuna pagina la mostra
      return rifiuta(404, `autorità sconosciuta: ${indirizzo.hostname}`)
  }
}
