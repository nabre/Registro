// I tasselli della mappa: scaricati una volta, tenuti su disco, serviti alla
// pagina come se fossero suoi.
//
// Serve perché la pagina del registro non può chiamare niente: la sua
// Content-Security-Policy dice `default-src 'none'`, e le immagini le prende
// solo da `registro:`. Invece di allargare quella politica a un server esterno
// — cioè di togliere la difesa che tiene i nomi degli allievi dentro la
// macchina — la pagina chiede `registro://mappa/<z>/<x>/<y>.png`, e qui si va a
// prendere il tassello e glielo si porge. Del mondo fuori la pagina continua a
// non sapere niente.
//
// La cache sta in `userData` e non nella cartella del docente: sono immagini di
// strade, non dati suoi, e finire dentro OneDrive vorrebbe dire sincronizzare
// qualche migliaio di file che si riscaricano in un secondo. Non si svuota da
// sé — chi vuole liberare lo spazio cancella la cartella — ma un tassello più
// vecchio di una settimana si richiede: le strade cambiano, e soprattutto un
// tassello venuto male non deve restare per sempre. Se la rete non c'è, si
// serve quello vecchio, che è meglio di un buco.

import { app, net } from 'electron'
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

/**
 * Da dove arrivano i tasselli.
 *
 * Il server di OpenStreetMap, che è gratuito e chiede in cambio un
 * `User-Agent` vero e nessuno scarico di massa. Una mappa di classe sono poche
 * decine di tasselli, e dalla seconda apertura sono zero: quel che c'è in cache
 * non si richiede.
 */
const SERVIZIO = 'https://tile.openstreetmap.org'

const CHI_CHIAMA = 'RegistroDocenti/1.0 (registro di classe CPTT; uso didattico)'

/** Fin dove si ingrandisce: è il massimo che quel server disegna. */
const ZOOM_MASSIMO = 19

/**
 * Quanto si aspetta un tassello prima di lasciar perdere.
 *
 * Senza, una richiesta che non torna mai resta appesa per sempre — e la mappa
 * di una classe ne apre qualche decina insieme. Non è come lo scarico di un
 * corredo, dove la scadenza deve guardare il silenzio e non la durata: qui si
 * parla di venti chilobyte, e un tassello che non è arrivato in otto secondi è
 * un tassello che non arriva. Chi apre la mappa non aspetta: vede il fondo
 * vuoto con sopra i suoi segnaposti, che è già la risposta alla domanda.
 */
const ATTESA_MS = 8_000

/**
 * Quanto vale un tassello in cache prima di richiederlo: una settimana, come il
 * `max-age` con cui lo si porge alla pagina.
 */
const SCADENZA_MS = 7 * 24 * 60 * 60 * 1000

/**
 * I tasselli che si stanno prendendo adesso, per percorso.
 *
 * La mappa chiede lo stesso tassello più volte — due segnaposti vicini, un
 * ridisegno mentre il primo giro non è ancora tornato — e senza questa tabella
 * erano due scarichi e **due scritture sullo stesso file**. Su Windows la
 * seconda può trovare il file aperto dalla prima e fallire; ovunque, un lettore
 * che passasse in mezzo leggerebbe mezzo PNG. Chi arriva secondo aspetta la
 * risposta del primo.
 */
const inCorso = new Map<string, Promise<Esito>>()

/**
 * Quel che di un tassello si può condividere: i byte, o il perché non ci sono.
 *
 * Non una `Response`: quella porta un corpo che si legge **una volta sola**, e
 * darne una sola a due richieste vorrebbe dire che la seconda riceve un flusso
 * già consumato. Si condivide il risultato, e la risposta la si costruisce per
 * chi la chiede.
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
 * Il tassello: dalla cache se c'è, dalla rete se no.
 *
 * I numeri sono già stati controllati da `leggiCoordinate` — sono interi dentro
 * l'intervallo del loro zoom — ed è per questo che comporre un percorso con
 * loro è sicuro: non c'è niente, in tre interi, che possa uscire dalla cartella.
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
    // Non c'era: si scarica. È il caso normale la prima volta che si apre la
    // mappa su una zona.
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
  // Senza rete, o con un server che risponde male, un tassello di un mese fa è
  // meglio di un buco nella mappa.
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
      return { stato: 502, perché: `il server dei tasselli ha risposto ${risposta.status}` }
    }
    // Un 200 che non è un'immagine: la pagina di accesso di un proxy di scuola,
    // o un avviso del filtro dei contenuti. Messa in cache, sarebbe un tassello
    // rotto per sempre — o almeno per la settimana della scadenza — anche dopo
    // che il proxy ha smesso di mettersi in mezzo.
    const tipo = risposta.headers.get('content-type') ?? ''
    if (!tipo.toLowerCase().startsWith('image/')) {
      return { stato: 502, perché: `il server dei tasselli ha risposto con «${tipo}», non un'immagine` }
    }
    const byte = new Uint8Array(await risposta.arrayBuffer())
    // Scritto dopo aver risposto sarebbe più svelto, ma non di quanto conti: il
    // tassello è già in memoria e la scrittura è un file da venti chilobyte.
    await metti(file, byte)
    return { byte }
  } catch (errore) {
    // Senza rete la mappa resta a fondo vuoto con i suoi segnaposti sopra, che
    // è comunque la risposta alla domanda «chi sta lontano da chi».
    return { stato: 504, perché: `tasselli non raggiungibili: ${String(errore)}` }
  }
}

/**
 * Il tassello in cache: scritto di fianco, e messo al suo posto in un colpo.
 *
 * Non è pignoleria su un PNG da venti chilobyte. Un `writeFile` diretto sul
 * percorso che gli altri leggono lascia il file **visibile mentre si scrive**:
 * chi passa in quel momento — e la mappa di una classe chiede qualche decina di
 * tasselli insieme — legge un'immagine troncata, la mostra rotta, e se la tiene
 * così per la settimana che dura la cache. Il rinomino invece o è successo o
 * no, e un lettore vede sempre un file intero.
 *
 * Un errore qui — disco pieno, cartella senza permessi — non deve far sparire
 * la mappa: si continua senza cache, e lo si scrive nel giornale.
 */
async function metti (file: string, byte: Uint8Array): Promise<void> {
  const diFianco = `${file}.${String(process.pid)}.parziale`
  try {
    await mkdir(dirname(file), { recursive: true })
    await writeFile(diFianco, byte)
    await rename(diFianco, file)
  } catch (errore) {
    await rm(diFianco, { force: true }).catch(() => {
      // Il provvisorio che non se ne va è un file da venti chilobyte in una
      // cartella che nessuno guarda: non vale un secondo errore nel giornale.
    })
    console.error(`registro://mappa: tassello non messo in cache — ${String(errore)}`)
  }
}
