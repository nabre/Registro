// I tasselli della mappa, scaricati una volta, tenuti su disco e serviti alla
// pagina come `registro://mappa/<z>/<x>/<y>.png`. La CSP della pagina
// (`default-src 'none'`) resta chiusa verso l'esterno: i nomi degli allievi non
// escono dalla macchina.
//
// La cache sta in `userData`, non nella cartella del docente sincronizzata. Non
// si svuota da sé; un tassello più vecchio di una settimana si richiede, e
// senza rete si serve quello vecchio.

import { app, net } from 'electron'
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { ZOOM_MASSIMO } from '../../src/domain/map.js'

/** Il server di OpenStreetMap: chiede un `User-Agent` vero e nessuno scarico di massa. */
const SERVIZIO = 'https://tile.openstreetmap.org'

// testo-fisso: lo User-Agent che OpenStreetMap chiede, non lo legge nessuno nel registro
const CHI_CHIAMA = 'Regiclass/1.0 (+https://github.com/nabre/Registro)'

/**
 * Quanto si aspetta un tassello prima di lasciar perdere: sono venti
 * chilobyte, e senza tetto una richiesta muta resterebbe appesa.
 */
const ATTESA_MS = 8_000

/**
 * Quanto vale un tassello in cache prima di richiederlo: una settimana, come il
 * `max-age` con cui lo si porge alla pagina.
 */
const SCADENZA_MS = 7 * 24 * 60 * 60 * 1000

/**
 * I tasselli in arrivo, per percorso: la mappa chiede lo stesso tassello più
 * volte, e due scarichi scriverebbero lo stesso file. Chi arriva secondo aspetta il primo.
 */
const inCorso = new Map<string, Promise<Esito>>()

/**
 * Quel che di un tassello si condivide: i byte, o il perché non ci sono. Non
 * una `Response`, il cui corpo si legge una volta sola.
 */
type Esito = { byte: Uint8Array<ArrayBuffer> } | { stato: number, perché: string }

function cartellaCache (): string {
  return join(app.getPath('userData'), 'tasselli')
}

/** Il tassello chiesto, o `null` se la richiesta non è un tassello. */
export function leggiCoordinate (segmenti: string[]): { z: number; x: number; y: number } | null {
  if (segmenti.length !== 3) return null
  const z = Number(segmenti[0])
  const x = Number(segmenti[1])
  const y = Number(segmenti[2].replace(/\.png$/i, ''))
  if (![z, x, y].every((n) => Number.isInteger(n))) return null
  if (z < 0 || z > ZOOM_MASSIMO) return null
  const quanti = 2 ** z
  if (x < 0 || x >= quanti || y < 0 || y >= quanti) return null
  return { z, x, y }
}

/**
 * Il tassello, dalla cache o dalla rete. Le coordinate vengono da
 * `leggiCoordinate` (interi nell'intervallo): il percorso non può uscire dalla cartella.
 */
export async function tassello (z: number, x: number, y: number): Promise<Response> {
  const file = join(cartellaCache(), String(z), String(x), `${y}.png`)

  let vecchio: Uint8Array<ArrayBuffer> | null = null
  try {
    const [byte, stato] = await Promise.all([readFile(file), stat(file)])
    if (Date.now() - stato.mtimeMs < SCADENZA_MS) return rispondi({ byte: new Uint8Array(byte) })
    // Scaduto: si riscarica, e questo si tiene per quando la rete non c'è.
    vecchio = new Uint8Array(byte)
  } catch {
    // Non c'era: si scarica.
  }

  // Uno solo per percorso, e gli altri aspettano lui: vedi `inCorso`.
  let corsa = inCorso.get(file)
  if (!corsa) {
    corsa = prendi(file, z, x, y).finally(() => {
      inCorso.delete(file)
    })
    inCorso.set(file, corsa)
  }
  const esito = await corsa
  // Senza rete, meglio un tassello vecchio che un buco.
  return rispondi(vecchio && !('byte' in esito) ? { byte: vecchio } : esito)
}

/** La risposta per chi ha chiesto, costruita nuova ogni volta: vedi `Esito`. */
function rispondi (esito: Esito): Response {
  if ('byte' in esito) {
    return new Response(esito.byte, {
      headers: { 'content-type': 'image/png', 'cache-control': 'max-age=604800' },
    })
  }
  return new Response(esito.perché, {
    status: esito.stato,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}

/** Il tassello dalla rete, messo in cache per la volta dopo. */
async function prendi (file: string, z: number, x: number, y: number): Promise<Esito> {
  try {
    const risposta = await net.fetch(`${SERVIZIO}/${z}/${x}/${y}.png`, {
      headers: { 'user-agent': CHI_CHIAMA },
      signal: AbortSignal.timeout(ATTESA_MS),
    })
    if (!risposta.ok) {
      // testo-fisso: risposta del protocollo per chi sviluppa, nessuna pagina la mostra
      return { stato: 502, perché: `il server dei tasselli ha risposto ${risposta.status}` }
    }
    // Un 200 che non è un'immagine (la pagina di un proxy di scuola) non va in cache.
    const tipo = risposta.headers.get('content-type') ?? ''
    if (!tipo.toLowerCase().startsWith('image/')) {
      // testo-fisso: risposta del protocollo per chi sviluppa, nessuna pagina la mostra
      return { stato: 502, perché: `il server dei tasselli ha risposto con «${tipo}», non un'immagine` }
    }
    const byte = new Uint8Array(await risposta.arrayBuffer())
    await metti(file, byte)
    return { byte }
  } catch (errore) {
    // Senza rete la mappa resta a fondo vuoto, con i segnaposti sopra.
    // testo-fisso: risposta del protocollo per chi sviluppa, nessuna pagina la mostra
    return { stato: 504, perché: `tasselli non raggiungibili: ${String(errore)}` }
  }
}

/**
 * Il tassello in cache: scritto di fianco e rinominato, così un lettore non
 * vede mai un PNG a metà. Un errore non ferma la mappa: si va avanti senza cache.
 */
async function metti (file: string, byte: Uint8Array): Promise<void> {
  const diFianco = `${file}.${String(process.pid)}.parziale`
  try {
    await mkdir(dirname(file), { recursive: true })
    await writeFile(diFianco, byte)
    await rename(diFianco, file)
  } catch (errore) {
    await rm(diFianco, { force: true }).catch(() => {
      // Un provvisorio rimasto non vale un secondo errore nel giornale.
    })
    console.error(`registro://mappa: tassello non messo in cache — ${String(errore)}`)
  }
}
