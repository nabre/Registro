// Le pagine di un PDF disegnate dentro il pannello, una per una: il lettore di
// Chromium non lascia prendere le pagine col mouse, e lo smistamento è tutto
// un trascinare. Qui pdfjs disegna ogni pagina come immagine della pagina web.
//
// Sul filo principale e non in un `Worker`: pagina (`registro://pagina/<id>`) e
// file dell'app (`registro://app/…`) sono origini diverse, e un worker si
// carica solo dalla propria. pdfjs lavora sul filo principale se trova il suo
// gestore in `globalThis.pdfjsWorker`; per questo le miniature si chiedono una
// alla volta, solo quelle visibili. Chi le mette in pagina e le trascina è
// `views/pageBrowser.ts`.

/** Il tanto di pdfjs che serve qui, dichiarato a mano come in `data/pdf.ts`. */
interface ModuloPdfjs {
  getDocument (parametri: Record<string, unknown>): CompitoPdf
}

/** L'apertura di un documento, unico appiglio per chiuderlo: in pdfjs 5 `destroy` sta qui. */
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
  render (parametri: Record<string, unknown>): { promise: Promise<void> }
  cleanup (): void
}

let modulo: Promise<ModuloPdfjs> | null = null

/**
 * pdfjs (due megabyte) si carica alla prima miniatura: l'import dinamico lo
 * lascia spento nel bundle. Il worker va messo in `globalThis` prima di
 * aprire qualcosa, se no pdfjs cerca un file worker che non trova.
 */
async function pdfjs (): Promise<ModuloPdfjs> {
  if (!modulo) {
    modulo = (async () => {
      const operaio = await import('pdfjs-dist/legacy/build/pdf.worker.mjs')
      ;(globalThis as unknown as Record<string, unknown>).pdfjsWorker = operaio
      return await import('pdfjs-dist/legacy/build/pdf.mjs')
    })()
  }
  return modulo
}

/**
 * Il PDF aperto adesso, uno solo: un documento aperto tiene decine di
 * megabyte, e aprendone un altro il primo si chiude.
 */
let aperto: {
  chiave: string
  compito: Promise<CompitoPdf>
  documento: Promise<DocumentoPdf>
} | null = null

/**
 * Chiude un documento. Un compito respinto è un PDF mai caricato, e basta
 * raccogliere il rifiuto; una `destroy` fallita lascia il documento in memoria,
 * quindi va in console, senza far cadere il gesto in corso.
 */
function chiudi (compito: Promise<CompitoPdf> | CompitoPdf): void {
  void Promise.resolve(compito).then(
    async (aperto) => {
      try {
        await aperto.destroy()
      } catch (errore) {
        console.error('il PDF non si e\' chiuso', errore)
      }
    },
    () => {},
  )
}

/** Dove stanno i caratteri standard del PDF, come indirizzo che la pagina sa caricare. */
let caratteri: string | null = null

/**
 * Dice dove pdfjs legge i quattordici caratteri standard del PDF: senza, una
 * pagella in Helvetica esce con un carattere di ripiego. Stanno accanto ai
 * bundle, e il pannello ne riceve l'indirizzo con lo stato.
 */
export function impostaCaratteri (radiceApp: string): void {
  caratteri = `${radiceApp.replace(/\/+$/, '')}/dist/pdf-fonts/`
}

/** Le miniature già disegnate: `chiave|pagina` → l'immagine, come indirizzo. */
const fatte = new Map<string, string>()

/** Quelle che si stanno disegnando adesso: chi le chiede due volte aspetta la stessa. */
const inCorso = new Map<string, Promise<string | null>>()

/** La coda: una pagina alla volta, perché disegnare occupa il filo principale. */
let coda: Promise<unknown> = Promise.resolve()

/**
 * Quante volte si è chiamato `dimentica()`: un lavoro accodato prima non
 * riapre il PDF né rimette in memoria una pagina che doveva sparire.
 */
let generazione = 0

/**
 * Le larghezze a cui una pagina si disegna davvero: il primo scalino che copre
 * la misura chiesta (per due, sugli schermi fitti), così lo zoom non ridisegna
 * a ogni pixel. Di una pagina restano fino a quattro fotografie, una per
 * scalino attraversato: servono a `miniaturaPronta` per non lasciare riquadri
 * vuoti durante lo zoom, e `dimentica()` le butta alla chiusura.
 */
const SCALINI = [320, 560, 900, 1400]

/** Oltre questa altezza non si va: un foglio lunghissimo non deve mangiare la memoria. */
const ALTEZZA_MASSIMA = 2200

/** Lo scalino a cui si disegna una pagina larga tanto sullo schermo. */
function scalinoPer (larghezza: number): number {
  const chiesta = larghezza * Math.min(window.devicePixelRatio || 1, 2)
  return SCALINI.find((scalino) => scalino >= chiesta) ?? SCALINI[SCALINI.length - 1]
}

function chiaveDi (chiave: string, pagina: number, scalino: number): string {
  return `${chiave}|${pagina}|${scalino}`
}

/**
 * Apre il PDF, o ridà quello già aperto. `chiave` distingue le versioni dello
 * stesso file (un PDF riscritto ha lo stesso indirizzo). I byte si prendono con
 * `fetch` e si passano a pdfjs, che con indirizzi non `http` non sempre sa
 * scaricare da sé.
 */
function documentoDi (indirizzo: string, chiave: string): Promise<DocumentoPdf> {
  if (aperto?.chiave === chiave) return aperto.documento

  const precedente = aperto
  if (precedente) {
    chiudi(precedente.compito)
    for (const segnata of [...fatte.keys()]) {
      if (segnata.startsWith(`${precedente.chiave}|`)) fatte.delete(segnata)
    }
  }

  const compito = (async () => {
    const m = await pdfjs()
    const risposta = await fetch(indirizzo)
    if (!risposta.ok) throw new Error(`il PDF non si è potuto leggere (${risposta.status})`) // testo-fisso: errore interno, non si mostra
    const byte = new Uint8Array(await risposta.arrayBuffer())
    return m.getDocument({
      data: byte,
      isEvalSupported: false,
      ...(caratteri ? { standardFontDataUrl: caratteri } : {}),
      // I caratteri servono: qui si disegna (l'host invece legge soltanto).
      disableFontFace: false,
    })
  })()

  // Il compito serve a chiudere, il documento a leggere; il `then` tiene anche
  // il rifiuto attaccato a qualcuno.
  const documento = compito.then((c) => c.promise)
  aperto = { chiave, compito, documento }
  return documento
}

/** La fotografia di una pagina, disegnata adesso alla larghezza chiesta. */
async function disegna (
  indirizzo: string,
  chiave: string,
  pagina: number,
  scalino: number,
): Promise<string | null> {
  const documento = await documentoDi(indirizzo, chiave)
  if (pagina < 1 || pagina > documento.numPages) return null

  return fotografia(await documento.getPage(pagina), scalino)
}

/** Una pagina già aperta, disegnata alla larghezza chiesta su fondo bianco, in JPEG. */
async function fotografia (foglio: PaginaPdf, scalino: number): Promise<string | null> {
  const naturale = foglio.getViewport({ scale: 1 })
  const scala = Math.min(
    scalino / naturale.width,
    ALTEZZA_MASSIMA / naturale.height,
  )
  const vista = foglio.getViewport({ scale: scala })

  const tela = document.createElement('canvas')
  tela.width = Math.max(1, Math.round(vista.width))
  tela.height = Math.max(1, Math.round(vista.height))
  const pennello = tela.getContext('2d')
  if (!pennello) return null

  // Fondo bianco anche dove il PDF non ne dichiara: nel tema scuro una pagina
  // trasparente sarebbe nero su nero.
  pennello.fillStyle = '#ffffff'
  pennello.fillRect(0, 0, tela.width, tela.height)
  // pdfjs 5 vuole `canvas` e tiene `canvasContext` per compatibilità: si passano
  // tutti e due.
  await foglio.render({ canvas: tela, canvasContext: pennello, viewport: vista }).promise
  foglio.cleanup()
  // JPEG e non PNG: una scansione a colori pesa dieci volte meno, e ne resta una
  // per pagina e per scalino. Qualità alta perché si legge, anche i tratti sottili.
  return tela.toDataURL('image/jpeg', 0.88)
}

/**
 * La fotografia della pagina, dalla memoria se c'è. `null` se non si è potuta
 * disegnare: chi la chiede mostra il numero, e la pagina si trascina lo stesso.
 */
export function miniatura (
  indirizzo: string,
  chiave: string,
  pagina: number,
  larghezza: number,
): Promise<string | null> {
  const scalino = scalinoPer(larghezza)
  const segno = chiaveDi(chiave, pagina, scalino)
  const pronta = fatte.get(segno)
  if (pronta) return Promise.resolve(pronta)

  const gia = inCorso.get(segno)
  if (gia) return gia

  const mia = generazione
  const lavoro: Promise<string | null> = coda.then(async () => {
    try {
      if (mia !== generazione) return null
      const immagine = await disegna(indirizzo, chiave, pagina, scalino)
      if (immagine && mia === generazione) fatte.set(segno, immagine)
      return immagine
    } catch {
      // Una pagina che non si disegna non ferma le altre.
      return null
    } finally {
      // Solo se è ancora il suo posto: dopo `dimentica()` lo stesso segno può essere
      // di un lavoro nuovo.
      if (inCorso.get(segno) === lavoro) inCorso.delete(segno)
    }
  })
  inCorso.set(segno, lavoro)
  coda = lavoro
  return lavoro
}

/**
 * Quella già disegnata, subito, per ridisegnare senza sfarfallio: se manca alla
 * misura giusta va bene un altro scalino, sgranato, finché arriva quella nuova.
 */
export function miniaturaPronta (chiave: string, pagina: number, larghezza: number): string | null {
  const suo = miniaturaAllaMisura(chiave, pagina, larghezza)
  if (suo) return suo
  for (const scalino of SCALINI) {
    const altra = fatte.get(chiaveDi(chiave, pagina, scalino))
    if (altra) return altra
  }
  return null
}

/**
 * Quella disegnata proprio a questa misura, o niente: distingue la fotografia
 * giusta da quella provvisoria, che va comunque rimpiazzata.
 */
export function miniaturaAllaMisura (
  chiave: string,
  pagina: number,
  larghezza: number,
): string | null {
  return fatte.get(chiaveDi(chiave, pagina, scalinoPer(larghezza))) ?? null
}

/**
 * Chiude il PDF aperto e butta le sue miniature, quando non si guarda più: le
 * pagine di una scansione già assegnata non devono ricomparire da una cache.
 */
export function dimentica (): void {
  const precedente = aperto
  aperto = null
  generazione += 1
  fatte.clear()
  inCorso.clear()
  if (precedente) {
    chiudi(precedente.compito)
  }
}
