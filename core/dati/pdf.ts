// Il minimo di PDF per il registro: contare pagine, leggere il testo, ritagliare
// e unire, estrarre l'immagine di una scansione per l'OCR. `@cantoo/pdf-lib`
// scrive, `pdfjs-dist` legge. pdfjs svuota il buffer che riceve (qui gli si passa
// sempre una copia) e vuole il worker anche in Node: senza `impostaWorker` fallisce.

import { deflateSync } from 'node:zlib'

import { PDFDocument } from '@cantoo/pdf-lib'

import { testi } from './pdf.testi.js'

/** Il worker di pdfjs, detto una volta all'avvio dell'estensione. */
let worker: string | null = null

/** Dove sta `pdf.worker.mjs`: un URL `file:`, che è quel che pdfjs si aspetta. */
export function impostaWorker (url: string): void {
  worker = url
}

/** I caratteri standard che pdfjs legge da sé: una cartella, con la barra finale. */
let caratteri: string | null = null

/**
 * Dove stanno i quattordici caratteri standard del PDF, detto all'avvio: pdfjs
 * ne ricava le larghezze, cioè dove sta un nome sulla pagina. Sono copiati in
 * `dist/` alla costruzione: installato, `node_modules` non c'è.
 */
export function impostaCaratteri (cartella: string): void {
  caratteri = cartella.endsWith('/') ? cartella : `${cartella}/`
}

/**
 * Il tanto di pdfjs che si usa, dichiarato a mano: pdfjs è ESM e qui si compila
 * in CommonJS, e importarne il tipo richiederebbe annotazioni di risoluzione.
 */
interface ModuloPdfjs {
  GlobalWorkerOptions: { workerSrc: string }
  OPS: Record<string, number>
  getDocument (parametri: Record<string, unknown>): CompitoPdf
}

/**
 * L'apertura di un documento: `destroy` sta qui, non sul documento, quindi chi
 * apre tiene il compito per liberare la memoria.
 */
interface CompitoPdf {
  promise: Promise<DocumentoPdf>
  destroy (): Promise<void>
}

interface DocumentoPdf {
  numPages: number
  getPage (numero: number): Promise<PaginaPdf>
}

interface PaginaPdf {
  getViewport (opzioni: { scale: number }): { width: number, height: number }
  getTextContent (): Promise<{
    items: Array<{
      str?: string
      /** La matrice del testo: gli ultimi due numeri sono dove comincia. */
      transform?: number[]
      width?: number
      height?: number
    }>
  }>
  getOperatorList (): Promise<{ fnArray: number[] | Int32Array, argsArray: unknown[] }>
  objs: { get (nome: string, callback: (dato: unknown) => void): void }
  cleanup (): void
}

let modulo: Promise<ModuloPdfjs> | null = null

/** pdfjs si carica alla prima lettura: sono megabyte di codice. */
async function pdfjs (): Promise<ModuloPdfjs> {
  if (!modulo) {
    modulo = senzaLamentiDiDisegno(
      () => import('pdfjs-dist/legacy/build/pdf.mjs') as unknown as Promise<ModuloPdfjs>,
    ).then((m) => {
      if (worker) m.GlobalWorkerOptions.workerSrc = worker
      return m
    })
  }
  return modulo
}

/**
 * Zittisce, per il tempo di un `import`, solo gli avvisi di pdfjs sul disegno
 * (manca `@napi-rs/canvas`): qui non si disegna niente, e ogni altro avviso passa.
 */
async function senzaLamentiDiDisegno<T> (lavoro: () => Promise<T>): Promise<T> {
  // `standardFontDataUrl`: i file servirebbero a disegnare; le larghezze pdfjs
  // le calcola lo stesso.
  const MUTE = ['DOMMatrix', 'ImageData', 'Path2D', '@napi-rs/canvas', 'standardFontDataUrl']
  const vero = console.log
  console.log = (...pezzi: unknown[]) => {
    const riga = String(pezzi[0] ?? '')
    if (riga.startsWith('Warning: ') && MUTE.some((parola) => riga.includes(parola))) return
    vero(...pezzi)
  }
  try {
    return await lavoro()
  } finally {
    console.log = vero
  }
}

/**
 * Apre il documento per leggerlo, su una copia dei byte: pdfjs trasferisce il
 * buffer, e un secondo uso troverebbe un array vuoto.
 */
async function apri (byte: Uint8Array) {
  const m = await pdfjs()
  return m.getDocument({
    data: new Uint8Array(byte),
    isEvalSupported: false,
    useSystemFonts: false,
    ...(caratteri ? { standardFontDataUrl: caratteri } : {}),
    // Niente font: non si disegna.
    disableFontFace: true,
  })
}

/**
 * Quante pagine ha. Il `finally` chiude il compito anche su un PDF rovinato,
 * caso previsto (`data/sorter.ts` lo manda in quarantena): senza, resterebbe vivo.
 */
export async function contaPagine (byte: Uint8Array): Promise<number> {
  const compito = await apri(byte)
  try {
    const documento = await compito.promise
    return documento.numPages
  } finally {
    await compito.destroy()
  }
}

/**
 * Un pezzo di testo e dove sta: frazioni del foglio (0–1, origine in alto a
 * sinistra), così vanno bene su una miniatura come su una pagina intera.
 */
interface PezzoDiTesto {
  testo: string
  x: number
  y: number
  larghezza: number
  altezza: number
}

/** Il testo di una pagina, intero e a pezzi. */
interface TestoDiPagina {
  testo: string
  pezzi: PezzoDiTesto[]
}

/**
 * Il testo di ogni pagina con la posizione di ogni pezzo, per mostrare dove si
 * è letto un nome. pdfjs conta in punti dal basso a sinistra; qui si converte.
 */
export async function testoConPosizioni (byte: Uint8Array): Promise<TestoDiPagina[]> {
  const compito = await apri(byte)
  const documento = await compito.promise
  const pagine: TestoDiPagina[] = []
  try {
    for (let n = 1; n <= documento.numPages; n += 1) {
      const pagina = await documento.getPage(n)
      const vista = pagina.getViewport({ scale: 1 })
      const contenuto = await pagina.getTextContent()

      const pezzi: PezzoDiTesto[] = []
      for (const voce of contenuto.items) {
        const testo = (voce.str ?? '').trim()
        if (!testo) continue
        const matrice = voce.transform
        const larghezza = voce.width ?? 0
        const altezza = voce.height ?? 0
        if (!matrice || matrice.length < 6 || vista.width <= 0 || vista.height <= 0) continue
        const x = matrice[4]
        // `matrice[5]` è la riga di base: il riquadro comincia un'altezza sopra.
        const cima = vista.height - (matrice[5] + altezza)
        pezzi.push({
          testo,
          x: x / vista.width,
          y: cima / vista.height,
          larghezza: larghezza / vista.width,
          altezza: altezza / vista.height,
        })
      }

      pagine.push({
        testo: contenuto.items
          .map((voce) => ('str' in voce ? voce.str : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim(),
        pezzi,
      })
      pagina.cleanup()
    }
  } finally {
    await compito.destroy()
  }
  return pagine
}

/**
 * Un PDF nuovo con le pagine dette, anche non contigue. Escono nell'ordine del
 * PDF di partenza, non di scelta; una pagina ripetuta entra una volta.
 */
export async function estraiElenco (
  byte: Uint8Array,
  pagine: readonly number[],
): Promise<Uint8Array> {
  // Molti PDF di scanner hanno una password del proprietario: si leggono lo stesso.
  const origine = await PDFDocument.load(byte, { ignoreEncryption: true })
  const totale = origine.getPageCount()

  const scelte = new Set<number>()
  for (const grezza of pagine) {
    const numero = Math.round(Number(grezza))
    if (Number.isFinite(numero) && numero >= 1 && numero <= totale) scelte.add(numero)
  }
  // Nessuna pagina valida è un errore, non un PDF vuoto da archiviare.
  if (scelte.size === 0) throw new Error(testi().nessunaPagina)

  const fetta = await PDFDocument.create()
  const indici = [...scelte].sort((x, y) => x - y).map((numero) => numero - 1)
  for (const pagina of await fetta.copyPages(origine, indici)) fetta.addPage(pagina)
  return fetta.save()
}

/**
 * Un PDF solo con, in fila, le pagine di tutti quelli dati (il fascicolo).
 * Un file illeggibile salta e gli altri si uniscono; tornano quanti sono entrati
 * e quanti erano cifrati, perché chi consegna sappia che ne manca qualcuno.
 */
export async function unisciPdf (
  fogli: ReadonlyArray<Uint8Array>,
): Promise<{ pdf: Uint8Array, uniti: number, protetti: number }> {
  const unito = await PDFDocument.create()
  let uniti = 0
  let protetti = 0
  for (const foglio of fogli) {
    try {
      const origine = await PDFDocument.load(foglio, { ignoreEncryption: true })

      // Leggere la struttura non è decifrare: copiate, le pagine cifrate
      // uscirebbero illeggibili. Saltano, e il conto lo dice.
      if (origine.isEncrypted) {
        protetti += 1
        continue
      }

      const indici = origine.getPageIndices()
      // Zero pagine: conta come rimasto fuori.
      if (indici.length === 0) continue

      for (const pagina of await unito.copyPages(origine, indici)) unito.addPage(pagina)
      uniti += 1
    } catch {
      // Un foglio illeggibile salta, e il conto che torna lo dice.
    }
  }
  return { pdf: await unito.save(), uniti, protetti }
}

// ------------------------------------------------------------------ immagini

/** Un'immagine grezza: byte di pixel, senza intestazioni. */
interface Bitmap {
  larghezza: number
  altezza: number
  /** Byte per pixel: 1 grigio, 3 RGB, 4 RGBA. */
  canali: 1 | 3 | 4
  pixel: Uint8Array
}

/** Che parte della pagina interessa. */
export type Porzione = 'testata' | 'intera'

/** Quanto della pagina è «testata»: il nome sta quasi sempre in cima, e mezza pagina dimezza l'OCR. */
export const QUOTA_TESTATA = 0.5

/**
 * L'immagine di una pagina scansionata, in PNG per l'OCR. Si prende l'immagine
 * più grande invece di ridisegnare la pagina (servirebbe una tela grafica in
 * Node); `null` se non ce n'è nessuna.
 */
export async function immaginePagina (
  byte: Uint8Array,
  numero: number,
  porzione: Porzione = 'intera',
  latoMassimo = 1000,
): Promise<Uint8Array | null> {
  const m = await pdfjs()
  const compito = await apri(byte)
  const documento = await compito.promise
  try {
    if (numero < 1 || numero > documento.numPages) return null
    const pagina = await documento.getPage(numero)
    const operazioni = await pagina.getOperatorList()

    // Tre forme: immagine per nome, maschera a un bit (bianco e nero), immagine in linea.
    const nomi: string[] = []
    const inLinea: unknown[] = []
    for (let i = 0; i < operazioni.fnArray.length; i += 1) {
      const operazione = operazioni.fnArray[i]
      const argomenti = operazioni.argsArray[i] as unknown[] | undefined
      if (operazione === m.OPS.paintImageXObject || operazione === m.OPS.paintImageMaskXObject) {
        const nome = argomenti?.[0]
        if (typeof nome === 'string') nomi.push(nome)
      } else if (operazione === m.OPS.paintInlineImageXObject) {
        if (argomenti?.[0]) inLinea.push(argomenti[0])
      }
    }

    let migliore: Bitmap | null = null
    const area = (b: Bitmap) => b.larghezza * b.altezza
    for (const nome of nomi) {
      const grezza = await leggiOggetto(pagina, nome)
      const bitmap = aBitmap(grezza)
      if (!bitmap) continue
      if (!migliore || area(bitmap) > area(migliore)) migliore = bitmap
    }
    for (const grezza of inLinea) {
      const bitmap = aBitmap(grezza)
      if (bitmap && (!migliore || area(bitmap) > area(migliore))) migliore = bitmap
    }
    pagina.cleanup()
    if (!migliore) return null

    const tagliata = porzione === 'testata' ? testata(migliore) : migliore
    return codificaPng(riduci(tagliata, latoMassimo))
  } finally {
    await compito.destroy()
  }
}

/**
 * Un oggetto della pagina, aspettando che sia pronto: pdfjs consegna le immagini
 * a decodifica finita, e la richiesta secca può tornare `null`.
 */
async function leggiOggetto (pagina: PaginaPdf, nome: string): Promise<unknown> {
  return new Promise((risolvi) => {
    // Una decodifica fallita non deve fermare la coda dell'OCR.
    const timer = setTimeout(() => risolvi(null), ATTESA_OGGETTO_MS)
    try {
      pagina.objs.get(nome, (dato) => {
        clearTimeout(timer)
        risolvi(dato)
      })
    } catch {
      clearTimeout(timer)
      risolvi(null)
    }
  })
}

/** Quanto si aspetta che pdfjs consegni un'immagine prima di rinunciare. */
const ATTESA_OGGETTO_MS = 10_000

/** Le forme in cui pdfjs consegna un'immagine, ridotte a una sola. */
function aBitmap (grezza: unknown): Bitmap | null {
  const dato = grezza as {
    width?: number
    height?: number
    kind?: number
    data?: Uint8Array | Uint8ClampedArray
  } | null
  if (!dato?.data || !dato.width || !dato.height) return null

  const grezzi = dato.data instanceof Uint8Array ? dato.data : new Uint8Array(dato.data)
  const larghezza = dato.width
  const altezza = dato.height
  const attesi = (canali: number) => larghezza * altezza * canali

  // Bianco e nero (CCITT, JBIG2): un bit per pixel, otto per byte, riga per riga.
  const bytePerRiga = Math.ceil(larghezza / 8)
  if (dato.kind === 1 || grezzi.length === bytePerRiga * altezza) {
    if (grezzi.length < bytePerRiga * altezza) return null
    const pixel = new Uint8Array(larghezza * altezza)
    for (let y = 0; y < altezza; y += 1) {
      for (let x = 0; x < larghezza; x += 1) {
        const bit = (grezzi[y * bytePerRiga + (x >> 3)] >> (7 - (x & 7))) & 1
        pixel[y * larghezza + x] = bit ? 255 : 0
      }
    }
    return { larghezza, altezza, canali: 1, pixel }
  }

  // `kind` (2 RGB, 3 RGBA) può mancare: i canali si ricavano dal conto dei byte.
  const canali =
    grezzi.length >= attesi(4) ? 4
      : grezzi.length >= attesi(3) ? 3
        : grezzi.length >= attesi(1) ? 1
          : 0
  if (canali === 0) return null

  return { larghezza, altezza, canali: canali, pixel: grezzi }
}

/** La fascia superiore dell'immagine: dove sta il nome. */
function testata (bitmap: Bitmap): Bitmap {
  const righe = Math.max(1, Math.round(bitmap.altezza * QUOTA_TESTATA))
  const byte = righe * bitmap.larghezza * bitmap.canali
  return { ...bitmap, altezza: righe, pixel: bitmap.pixel.subarray(0, byte) }
}

/**
 * L'immagine ridotta al lato massimo saltando pixel, senza interpolazione: a
 * 300 dpi il testo regge, e l'OCR passa da minuti a secondi.
 */
function riduci (bitmap: Bitmap, latoMassimo: number): Bitmap {
  const lato = Math.max(bitmap.larghezza, bitmap.altezza)
  if (lato <= latoMassimo) return bitmap

  const fattore = lato / latoMassimo
  const larghezza = Math.max(1, Math.floor(bitmap.larghezza / fattore))
  const altezza = Math.max(1, Math.floor(bitmap.altezza / fattore))
  const pixel = new Uint8Array(larghezza * altezza * bitmap.canali)

  for (let y = 0; y < altezza; y += 1) {
    const sorgenteY = Math.min(bitmap.altezza - 1, Math.floor(y * fattore))
    for (let x = 0; x < larghezza; x += 1) {
      const sorgenteX = Math.min(bitmap.larghezza - 1, Math.floor(x * fattore))
      const da = (sorgenteY * bitmap.larghezza + sorgenteX) * bitmap.canali
      const a = (y * larghezza + x) * bitmap.canali
      for (let c = 0; c < bitmap.canali; c += 1) pixel[a + c] = bitmap.pixel[da + c]
    }
  }

  return { larghezza, altezza, canali: bitmap.canali, pixel }
}

/** L'immagine in PNG per l'OCR, scritta a mano: poche righe invece di una libreria. */
function codificaPng (bitmap: Bitmap): Uint8Array {
  const tipo = bitmap.canali === 1 ? 0 : bitmap.canali === 3 ? 2 : 6

  // Ogni riga va preceduta dal byte del filtro: zero, «nessun filtro».
  const riga = bitmap.larghezza * bitmap.canali
  const grezzo = Buffer.alloc((riga + 1) * bitmap.altezza)
  for (let y = 0; y < bitmap.altezza; y += 1) {
    grezzo[y * (riga + 1)] = 0
    Buffer.from(bitmap.pixel.buffer, bitmap.pixel.byteOffset + y * riga, riga).copy(
      grezzo,
      y * (riga + 1) + 1,
    )
  }

  const intestazione = Buffer.alloc(13)
  intestazione.writeUInt32BE(bitmap.larghezza, 0)
  intestazione.writeUInt32BE(bitmap.altezza, 4)
  intestazione[8] = 8
  intestazione[9] = tipo

  const pezzi = [
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pezzo('IHDR', intestazione),
    pezzo('IDAT', deflateSync(grezzo)),
    pezzo('IEND', Buffer.alloc(0)),
  ]
  return new Uint8Array(Buffer.concat(pezzi))
}

function pezzo (nome: string, dati: Buffer): Buffer {
  const testa = Buffer.alloc(8)
  testa.writeUInt32BE(dati.length, 0)
  testa.write(nome, 4, 'ascii')
  const coda = Buffer.alloc(4)
  coda.writeUInt32BE(crc32(Buffer.concat([testa.subarray(4), dati])), 0)
  return Buffer.concat([testa, dati, coda])
}

const TABELLA_CRC = (() => {
  const tabella = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    tabella[n] = c >>> 0
  }
  return tabella
})()

function crc32 (dati: Buffer): number {
  let c = 0xffffffff
  for (const byte of dati) c = TABELLA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
