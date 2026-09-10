// Il minimo di PDF che serve al registro: contare le pagine, leggerne il testo,
// ritagliarne un pezzo, e — quando testo non ce n'è — tirarne fuori l'immagine
// da dare in pasto all'OCR.
//
// Due librerie, due mestieri. `pdf-lib` scrive: è quella che ritaglia le pagine
// di un allievo e ne fa un PDF nuovo. `pdfjs-dist` legge: è quella che sa dire
// che cosa c'è scritto su una pagina, e che di un documento scansionato sa
// restituire la fotografia che ci sta dentro.
//
// Due avvertenze che costano ore se non si sanno. La prima: pdfjs si prende il
// buffer che gli si passa e lo svuota — dopo una lettura, quegli stessi byte
// non sono più un PDF. Qui dentro ogni lettura riceve una copia, e chi chiama
// può riusare i suoi byte quante volte vuole. La seconda: pdfjs vuole un file
// worker anche quando gira dentro Node, e nel pacchetto quel file è
// `dist/pdf.worker.mjs`; senza `impostaWorker` la prima lettura fallisce.

import { deflateSync } from 'node:zlib'

import { PDFDocument } from 'pdf-lib'

/** Il worker di pdfjs, detto una volta all'avvio dell'estensione. */
let worker: string | null = null

/** Dove sta `pdf.worker.mjs`: un URL `file:`, che è quel che pdfjs si aspetta. */
export function impostaWorker (url: string): void {
  worker = url
}

/**
 * Il tanto di pdfjs che si usa, dichiarato a mano.
 *
 * Il tipo vero verrebbe da `typeof import(...)`, ma pdfjs è un modulo ECMAScript
 * e questo pacchetto si compila in CommonJS: TypeScript non lascia importare il
 * tipo dell'uno dentro l'altro senza annotazioni che legano il codice alla
 * risoluzione dei moduli. Tre firme scritte qui costano meno.
 */
interface ModuloPdfjs {
  GlobalWorkerOptions: { workerSrc: string }
  OPS: Record<string, number>
  getDocument (parametri: Record<string, unknown>): { promise: Promise<DocumentoPdf> }
}

interface DocumentoPdf {
  numPages: number
  getPage (numero: number): Promise<PaginaPdf>
  destroy (): Promise<void>
}

interface PaginaPdf {
  getTextContent (): Promise<{ items: Array<{ str?: string }> }>
  getOperatorList (): Promise<{ fnArray: number[] | Int32Array, argsArray: unknown[] }>
  objs: { get (nome: string, callback: (dato: unknown) => void): void }
  cleanup (): void
}

let modulo: Promise<ModuloPdfjs> | null = null

/**
 * pdfjs si carica alla prima lettura e non prima: sono megabyte di codice, e
 * un registro in cui non arriva nessun PDF non ha motivo di pagarli.
 */
async function pdfjs (): Promise<ModuloPdfjs> {
  if (!modulo) {
    modulo = (import('pdfjs-dist/legacy/build/pdf.mjs') as unknown as Promise<ModuloPdfjs>).then(
      (m) => {
        if (worker) m.GlobalWorkerOptions.workerSrc = worker
        return m
      },
    )
  }
  return modulo
}

/**
 * Apre il documento per leggerlo. La copia dei byte non è prudenza: pdfjs
 * trasferisce il buffer che riceve, e senza copia il secondo uso degli stessi
 * byte trova un array vuoto e dice «No PDF header found».
 */
async function apri (byte: Uint8Array) {
  const m = await pdfjs()
  return m.getDocument({
    data: new Uint8Array(byte),
    isEvalSupported: false,
    useSystemFonts: false,
    // I font non servono: qui si legge testo e si guardano immagini, non si
    // disegna niente. Chiederli vorrebbe dire spedire in giro altri megabyte.
    disableFontFace: true,
  }).promise
}

export async function contaPagine (byte: Uint8Array): Promise<number> {
  const documento = await apri(byte)
  const pagine = documento.numPages
  await documento.destroy()
  return pagine
}

/**
 * Il testo di ogni pagina, nell'ordine in cui stanno.
 *
 * Una stringa vuota non è un errore: è una pagina scansionata, cioè una
 * fotografia senza uno straccio di testo dentro. È il segnale con cui lo
 * smistamento decide che quella pagina va letta in un altro modo.
 */
export async function testoPagine (byte: Uint8Array): Promise<string[]> {
  const documento = await apri(byte)
  const pagine: string[] = []
  try {
    for (let n = 1; n <= documento.numPages; n += 1) {
      const pagina = await documento.getPage(n)
      const contenuto = await pagina.getTextContent()
      pagine.push(
        contenuto.items
          .map((voce) => ('str' in voce ? voce.str : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim(),
      )
      pagina.cleanup()
    }
  } finally {
    await documento.destroy()
  }
  return pagine
}

/**
 * Un PDF nuovo con dentro solo le pagine da `da` ad `a`, comprese e contate da
 * 1. È il taglio con cui il documento di un allievo si stacca dal fascio della
 * classe: le pagine si copiano com'erano, senza ridisegnarle.
 */
export async function estraiPagine (byte: Uint8Array, da: number, a: number): Promise<Uint8Array> {
  // I PDF di segreteria e di scanner arrivano spesso con una password del
  // proprietario: si leggono lo stesso, e senza questa opzione il ritaglio
  // fallirebbe proprio su quelli.
  const origine = await PDFDocument.load(byte, { ignoreEncryption: true })
  const totale = origine.getPageCount()
  const primo = Math.max(1, Math.min(da, totale))
  const ultimo = Math.max(primo, Math.min(a, totale))

  const fetta = await PDFDocument.create()
  const indici: number[] = []
  for (let n = primo - 1; n <= ultimo - 1; n += 1) indici.push(n)
  for (const pagina of await fetta.copyPages(origine, indici)) fetta.addPage(pagina)
  return fetta.save()
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

/**
 * Quanto della pagina è «testata». Il nome della persona sta in cima nella
 * quasi totalità dei documenti scolastici, e leggere mezza pagina invece di una
 * intera dimezza il tempo di un OCR che gira sulla macchina di chi insegna.
 */
const QUOTA_TESTATA = 0.5

/**
 * La fotografia dentro una pagina scansionata, pronta per l'OCR.
 *
 * Una pagina scansionata è quasi sempre una sola immagine grande quanto il
 * foglio: si prende quella, invece di ridisegnare la pagina — che in Node
 * vorrebbe dire una tela grafica, cioè una libreria compilata da spedire
 * insieme all'estensione. Se le immagini sono più d'una si tiene la più grande,
 * che è la scansione; le altre sono loghi e firme.
 *
 * Torna `null` quando dentro non c'è niente da guardare: allora quella pagina
 * non è una scansione, è una pagina vuota, e nessun OCR la farà parlare.
 */
export async function immaginePagina (
  byte: Uint8Array,
  numero: number,
  porzione: Porzione = 'intera',
  latoMassimo = 1000,
): Promise<Uint8Array | null> {
  const m = await pdfjs()
  const documento = await apri(byte)
  try {
    if (numero < 1 || numero > documento.numPages) return null
    const pagina = await documento.getPage(numero)
    const operazioni = await pagina.getOperatorList()

    // Una scansione può arrivare in tre forme: un'immagine per nome, una
    // maschera a un bit (le scansioni in bianco e nero), o un'immagine scritta
    // in linea dentro la pagina. Si guardano tutte e tre.
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
    await documento.destroy()
  }
}

/**
 * Un oggetto della pagina, aspettando che sia pronto. pdfjs consegna le
 * immagini quando le ha decodificate, non quando gliele si chiede: la richiesta
 * secca torna `null` sulla prima pagina di un documento appena aperto.
 */
async function leggiOggetto (pagina: PaginaPdf, nome: string): Promise<unknown> {
  return new Promise((risolvi) => {
    // Un oggetto che non arriva mai — una decodifica fallita — non deve
    // tenere ferma la coda dell'OCR per sempre: dopo un po' vale come niente.
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

  // Le scansioni in bianco e nero arrivano a un bit per pixel, impacchettati
  // otto per byte, riga per riga: sono le più comuni — CCITT, JBIG2 — e senza
  // spacchettarle nessun OCR le vedrebbe.
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

  // `kind` dice il formato — 2 RGB, 3 RGBA — ma non tutte le versioni lo
  // mettono: in mancanza lo si ricava dal conto dei byte.
  const canali =
    grezzi.length >= attesi(4) ? 4 : grezzi.length >= attesi(3) ? 3 : grezzi.length >= attesi(1) ? 1 : 0
  if (canali === 0) return null

  return { larghezza, altezza, canali: canali as 1 | 3 | 4, pixel: grezzi }
}

/** La fascia superiore dell'immagine: dove sta il nome. */
function testata (bitmap: Bitmap): Bitmap {
  const righe = Math.max(1, Math.round(bitmap.altezza * QUOTA_TESTATA))
  const byte = righe * bitmap.larghezza * bitmap.canali
  return { ...bitmap, altezza: righe, pixel: bitmap.pixel.subarray(0, byte) }
}

/**
 * L'immagine rimpicciolita al lato massimo, prendendo un pixel ogni tanto.
 *
 * Nessuna interpolazione: una scansione a 300 punti per pollice ha testo grosso
 * abbastanza da reggere il pixel saltato, e ogni raffinatezza in più qui sarebbe
 * codice grafico da mantenere per guadagnare nulla. Il punto è un altro: un OCR
 * che gira su un portatile impiega minuti su un'immagine intera e secondi su
 * una rimpicciolita.
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

/**
 * L'immagine impacchettata in PNG, che è il formato che i modelli di OCR
 * accettano. Sono tre pezzi di intestazione e un blocco compresso: scriverlo a
 * mano costa venti righe e risparmia una libreria intera.
 */
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
