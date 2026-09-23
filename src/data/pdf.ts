// Il minimo di PDF che serve al registro: contare le pagine, leggerne il testo,
// ritagliarne un pezzo, e — quando testo non ce n'è — tirarne fuori l'immagine
// da dare in pasto all'OCR.
//
// Due librerie, due mestieri. `@cantoo/pdf-lib` scrive: è quella che ritaglia le pagine
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

import { PDFDocument } from '@cantoo/pdf-lib'

/** Il worker di pdfjs, detto una volta all'avvio dell'estensione. */
let worker: string | null = null

/** Dove sta `pdf.worker.mjs`: un URL `file:`, che è quel che pdfjs si aspetta. */
export function impostaWorker (url: string): void {
  worker = url
}

/** I caratteri standard che pdfjs legge da sé: una cartella, con la barra finale. */
let caratteri: string | null = null

/**
 * Dove stanno i caratteri standard del PDF, detto una volta all'avvio.
 *
 * Sono i quattordici caratteri che un PDF può nominare senza portarseli dentro
 * — Helvetica, Times, Courier — e pdfjs li vuole per sapere quanto è larga una
 * lettera. Senza, avverte a ogni documento aperto e calcola le larghezze a
 * occhio: e le larghezze sono quel che dice *dove* sta un nome sulla pagina.
 *
 * Stanno in `dist/`, copiati dal pacchetto di pdfjs al momento della
 * costruzione: nell'applicazione installata `node_modules` non c'è.
 */
export function impostaCaratteri (cartella: string): void {
  caratteri = cartella.endsWith('/') ? cartella : `${cartella}/`
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
  getDocument (parametri: Record<string, unknown>): CompitoPdf
}

/**
 * L'apertura di un documento, che è anche l'unico appiglio per chiuderlo.
 *
 * Dalla versione 5 di pdfjs `destroy` sta qui e non più sul documento: chi apre
 * si tiene il compito, non solo quel che ne esce, altrimenti i byte del PDF
 * restano in memoria finché il documento è vivo.
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

/**
 * pdfjs si carica alla prima lettura e non prima: sono megabyte di codice, e
 * un registro in cui non arriva nessun PDF non ha motivo di pagarli.
 */
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
 * Le lamentele di pdfjs sul disegnare, che qui non riguardano nessuno.
 *
 * Caricandosi dentro Node, pdfjs cerca `@napi-rs/canvas` per potersi polyfillare
 * `DOMMatrix`, `ImageData` e `Path2D`, e non trovandolo avverte tre volte che
 * «rendering may be broken». È vero e non importa: qui dentro non si disegna
 * niente. Il registro usa pdfjs per leggere il testo di una pagina e per tirar
 * fuori la fotografia che una scansione si porta dentro — e quella la scrive da
 * sé, in PNG, senza nessuna tela.
 *
 * Portarsi dietro una libreria compilata da venti megabyte per far tacere tre
 * righe sarebbe il rimedio peggiore del male; nasconderle tutte, peggio ancora.
 * Si zittiscono queste, per il tempo di un `import`, e ogni altra parola di
 * pdfjs passa.
 */
async function senzaLamentiDiDisegno<T> (lavoro: () => Promise<T>): Promise<T> {
  // L'ultima riguarda i caratteri standard: pdfjs vorrebbe leggerne i file per
  // *disegnarli*, e nel pacchetto installato quei file non ci sono —
  // `node_modules` resta fuori, e il registro non disegna. Le larghezze del
  // testo le calcola lo stesso, con le metriche che si porta dentro.
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
    ...(caratteri ? { standardFontDataUrl: caratteri } : {}),
    // I font non servono: qui si legge testo e si guardano immagini, non si
    // disegna niente. Chiederli vorrebbe dire spedire in giro altri megabyte.
    disableFontFace: true,
  })
}

/**
 * Quante pagine ha, e niente altro.
 *
 * Il `finally` non è una formalità: un PDF rovinato — lo scanner della
 * segreteria, un caricamento interrotto — fa rigettare `compito.promise`, e
 * senza di quello il compito di pdfjs restava vivo per sempre con il suo
 * lavoratore dietro. È il caso *previsto*, non quello raro: chi chiama
 * (`data/sorter.ts`) lo prende apposta in un `catch` per mettere il foglio
 * in quarantena invece di buttarlo, e in una sessione di smistamento lunga
 * quelle fughe si sommano. Le altre due funzioni di questo file il `finally` ce
 * l'avevano già.
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
 * Un pezzo di testo e dove sta sulla pagina.
 *
 * Le misure sono frazioni del foglio — da 0 a 1, con l'origine in alto a
 * sinistra — e non punti tipografici: chi le usa disegna un riquadro sopra una
 * miniatura larga duecento pixel o sopra una pagina intera, e in nessuno dei
 * due casi sa quanto misurava il foglio di partenza.
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
 * Il testo di ogni pagina con, pezzo per pezzo, il posto in cui sta.
 *
 * Serve a una cosa sola, e vale la pena di dirla: quando il registro riconosce
 * un nome su una pagina, chi guarda deve poter vedere *dove* l'ha letto. Un
 * nome proposto senza il punto in cui compare è una parola che bisogna cercare
 * a mano sul foglio — e su un elenco di classe di trenta righe, cercarla vuol
 * dire rifare il lavoro che il registro dice di aver fatto.
 *
 * Le coordinate di pdfjs hanno l'origine in basso a sinistra e si contano in
 * punti; qui escono in frazioni del foglio, con l'origine in alto a sinistra,
 * che è come si disegna su un'immagine.
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
        // `matrice[5]` è la riga di base del testo: il riquadro comincia
        // sopra, di quanto è alto il carattere.
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
 * Un PDF nuovo con dentro le pagine dette, anche se non si toccano.
 *
 * Serve perché un documento non è sempre un intervallo: in una scansione di
 * classe capita che le due facciate di una persona finiscano lontane — la
 * seconda copia di un modulo rifatto, il foglio ristampato in coda — e
 * chiedere due ritagli separati vorrebbe dire archiviare due documenti dove ce
 * n'è uno.
 *
 * Le pagine escono nell'ordine del PDF di partenza e non in quello in cui le si
 * è dette: chi ne sceglie tre con il mouse le tocca nell'ordine in cui gli
 * capita, e un documento con le facciate invertite non è quel che voleva.
 * Ripetere una pagina non la mette due volte.
 */
export async function estraiElenco (
  byte: Uint8Array,
  pagine: readonly number[],
): Promise<Uint8Array> {
  // I PDF di segreteria e di scanner arrivano spesso con una password del
  // proprietario: si leggono lo stesso, e senza questa opzione il ritaglio
  // fallirebbe proprio su quelli.
  const origine = await PDFDocument.load(byte, { ignoreEncryption: true })
  const totale = origine.getPageCount()

  const scelte = new Set<number>()
  for (const grezza of pagine) {
    const numero = Math.round(Number(grezza))
    if (Number.isFinite(numero) && numero >= 1 && numero <= totale) scelte.add(numero)
  }
  // Nessuna pagina buona non è un PDF vuoto da archiviare: è una richiesta che
  // non vuol dire niente, e un documento di zero pagine lo si scopre quando
  // serve. Chi chiama lo racconta a chi ha trascinato.
  if (scelte.size === 0) throw new Error('Nessuna pagina da ritagliare.')

  const fetta = await PDFDocument.create()
  const indici = [...scelte].sort((x, y) => x - y).map((numero) => numero - 1)
  for (const pagina of await fetta.copyPages(origine, indici)) fetta.addPage(pagina)
  return fetta.save()
}

/**
 * Un PDF solo con dentro, in fila, le pagine di tutti quelli che gli si danno.
 *
 * È il fascicolo che si consegna: le schede di una classe, i verbali di un
 * semestre, il pacchetto per la segreteria. Prima si stampavano venticinque
 * file e li si univa fuori dal registro — o non li si univa affatto, e in
 * segreteria arrivavano venticinque allegati.
 *
 * Le pagine si copiano com'erano: `copyPages` porta con sé caratteri e
 * immagini, e il foglio che esce è identico a quello che entra. Un file che non
 * si riesce ad aprire salta, e gli altri si uniscono lo stesso: fermarsi al
 * primo PDF rotto vorrebbe dire perdere le ventiquattro schede buone.
 *
 * Quanti ne sono entrati davvero torna insieme al PDF, e non è un dettaglio: un
 * fascicolo di ventitré schede su venticinque si consegna per sbaglio, e
 * l'unico momento in cui lo si può dire è questo. Con loro torna quanti erano
 * protetti da password, che è l'unico caso in cui vale la pena dire *perché*:
 * un foglio rotto si rifà, un foglio cifrato no.
 */
export async function unisciPdf (
  fogli: ReadonlyArray<Uint8Array>,
): Promise<{ pdf: Uint8Array, uniti: number, protetti: number }> {
  const unito = await PDFDocument.create()
  let uniti = 0
  let protetti = 0
  for (const foglio of fogli) {
    try {
      // Aperto anche se cifrato: `ignoreEncryption` legge la struttura di un PDF
      // che porta una password del proprietario, e quasi tutti i PDF che passano
      // dalla segreteria ne portano una.
      const origine = await PDFDocument.load(foglio, { ignoreEncryption: true })

      // Ma leggere la struttura non è decifrare il contenuto: le pagine copiate
      // da un documento cifrato escono con dentro byte che nessun lettore sa
      // disegnare. Un fascicolo con tre pagine illeggibili in mezzo si consegna
      // senza accorgersene — ed è peggio di un fascicolo con tre pagine in
      // meno, che almeno si conta. Quindi salta, e il conto lo dice.
      if (origine.isEncrypted) {
        protetti += 1
        continue
      }

      const indici = origine.getPageIndices()
      // Un PDF di zero pagine non aggiunge niente e non è un foglio: conta
      // come rimasto fuori, altrimenti «venticinque documenti» ne conterebbe
      // uno che nel fascicolo non c'è.
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

/**
 * Quanto della pagina è «testata». Il nome della persona sta in cima nella
 * quasi totalità dei documenti scolastici, e leggere mezza pagina invece di una
 * intera dimezza il tempo di un OCR che gira sulla macchina di chi insegna.
 */
export const QUOTA_TESTATA = 0.5

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
  const compito = await apri(byte)
  const documento = await compito.promise
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
    await compito.destroy()
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

  return { larghezza, altezza, canali: canali, pixel: grezzi }
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
