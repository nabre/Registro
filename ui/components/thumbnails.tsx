// Le pagine di un PDF disegnate dentro il pannello, una per una: il lettore di
// Chromium non lascia prendere le pagine col mouse, e lo smistamento è tutto
// un trascinare. Qui pdfjs disegna ogni pagina come immagine della pagina web.
//
// Sul filo principale e non in un `Worker`: pagina (`registro://pagina/<id>`) e
// file dell'app (`registro://app/…`) sono origini diverse, e un worker si
// carica solo dalla propria. pdfjs lavora sul filo principale se trova il suo
// gestore in `globalThis.pdfjsWorker`; per questo le miniature si chiedono una
// alla volta, solo quelle visibili. Chi le mette in pagina e le trascina è
// `views/sorting/pageBrowser.tsx`. In fondo `Miniatura`, il posto in cui la
// fotografia compare in React e la richiesta quando entra in vista.

import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'

import { testi } from '#ui/views/sorting/pageBrowser.testi.js'

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

/** Chi aspetta ogni miniatura in corso, e sa dire se gli serve ancora: vedi `miniatura`. */
const interessati = new Map<string, Array<() => boolean>>()

/** La coda: una pagina alla volta, perché disegnare occupa il filo principale. */
let coda: Promise<unknown> = Promise.resolve()

/** Oltre questo un lavoro si lascia: un `fetch` o un disegno appeso non ferma la coda. */
const TETTO_MS = 30_000

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
 * Il disegno, o `null` passato `TETTO_MS`. Il documento forse è appeso: si
 * chiude, e il prossimo lavoro lo riapre invece di aspettare anche lui.
 */
async function entroIlTetto (
  disegno: Promise<string | null>,
  chiave: string,
): Promise<string | null> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const scaduto = new Promise<null>((risolvi) => {
    timer = setTimeout(() => {
      if (aperto?.chiave === chiave) {
        chiudi(aperto.compito)
        aperto = null
      }
      risolvi(null)
    }, TETTO_MS)
  })
  try {
    return await Promise.race([disegno, scaduto])
  } finally {
    clearTimeout(timer)
  }
}

/**
 * La fotografia della pagina, dalla memoria se c'è. `null` se non si è potuta
 * disegnare: chi la chiede mostra il numero, e la pagina si trascina lo stesso.
 * `serve` dice, quando tocca al lavoro, se la pagina interessa ancora (è in
 * vista): se non serve più a nessuno di chi l'aspetta, non si disegna.
 */
export function miniatura (
  indirizzo: string,
  chiave: string,
  pagina: number,
  larghezza: number,
  serve: () => boolean = () => true,
): Promise<string | null> {
  const scalino = scalinoPer(larghezza)
  const segno = chiaveDi(chiave, pagina, scalino)
  const pronta = fatte.get(segno)
  if (pronta) return Promise.resolve(pronta)

  const gia = inCorso.get(segno)
  if (gia) {
    interessati.get(segno)?.push(serve)
    return gia
  }

  const mia = generazione
  const lavoro: Promise<string | null> = coda.then(async () => {
    try {
      if (mia !== generazione) return null
      if (!(interessati.get(segno) ?? []).some((utile) => utile())) return null
      const immagine = await entroIlTetto(disegna(indirizzo, chiave, pagina, scalino), chiave)
      if (immagine && mia === generazione) fatte.set(segno, immagine)
      return immagine
    } catch {
      // Una pagina che non si disegna non ferma le altre.
      return null
    } finally {
      // Solo se è ancora il suo posto: dopo `dimentica()` lo stesso segno può essere
      // di un lavoro nuovo.
      if (inCorso.get(segno) === lavoro) {
        inCorso.delete(segno)
        interessati.delete(segno)
      }
    }
  })
  inCorso.set(segno, lavoro)
  interessati.set(segno, [serve])
  coda = lavoro
  return lavoro
}

/**
 * Quella già disegnata, subito, per ridisegnare senza sfarfallio: se manca alla
 * misura giusta va bene un altro scalino, sgranato, finché arriva quella nuova.
 */
function miniaturaPronta (chiave: string, pagina: number, larghezza: number): string | null {
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
function miniaturaAllaMisura (
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
  interessati.clear()
  // I lavori accodati prima escono da soli (`generazione`): i nuovi non li aspettano.
  coda = Promise.resolve()
  if (precedente) {
    chiudi(precedente.compito)
  }
}

/**
 * Quanto prima di entrare in vista una pagina si comincia a disegnare: uno
 * schermo di anticipo, fra disegnare tutto subito e scorrere su riquadri vuoti.
 */
const ANTICIPO = '800px'

/**
 * Un solo `IntersectionObserver` per tutte le miniature, non uno per riquadro:
 * quando una pagina entra in vista si esegue il suo compito e la si smette di
 * guardare.
 */
const compiti = new Map<Element, () => void>()
let vedetta: IntersectionObserver | null = null

function guarda (elemento: Element, compito: () => void): () => void {
  vedetta ??= new IntersectionObserver(
    (voci) => {
      for (const voce of voci) {
        if (!voce.isIntersecting) continue
        const suo = compiti.get(voce.target)
        compiti.delete(voce.target)
        vedetta?.unobserve(voce.target)
        suo?.()
      }
    },
    { rootMargin: ANTICIPO },
  )
  compiti.set(elemento, compito)
  vedetta.observe(elemento)
  return () => {
    compiti.delete(elemento)
    vedetta?.unobserve(elemento)
  }
}

/** Quel che è arrivato dal disegno, per quale pagina e misura. */
interface Arrivata {
  guardia: string
  immagine: string | null
}

/**
 * La fotografia di una pagina, o il posto in cui comparirà. Il posto dice che si
 * sta disegnando, perché un riquadro vuoto si confonde con una pagina bianca.
 * Finché manca quella alla misura giusta si mostra quel che c'è (la pagina a
 * un'altra misura, o `ripiego`, l'immagine dell'host), sgranato. `children` va
 * sopra la fotografia (il nome letto sul foglio), solo quando c'è.
 */
export function Miniatura ({ indirizzo, chiave, pagina, larghezza, ripiego = null, children }: {
  /** Dove si leggono i byte del PDF. */
  indirizzo: string
  /** La versione del PDF: un file riscritto ha lo stesso indirizzo e un'altra chiave. */
  chiave: string
  pagina: number
  /** Quanto è larga sullo schermo, in pixel CSS. */
  larghezza: number
  ripiego?: string | null
  children?: ReactNode
}): ReactElement {
  const t = testi()
  const posto = useRef<HTMLDivElement | null>(null)
  const guardia = `${chiave}|${pagina}|${larghezza}`
  const [arrivata, impostaArrivata] = useState<Arrivata | null>(null)
  const esatta = miniaturaAllaMisura(chiave, pagina, larghezza)

  useEffect(() => {
    const elemento = posto.current
    if (!elemento || miniaturaAllaMisura(chiave, pagina, larghezza)) return
    let vivo = true
    let smetti = () => {}
    const compito = () => {
      // Una pagina già lontana dalla vista quando tocca a lei si salta: scorrendo
      // in fretta la coda non disegna quel che nessuno guarda più.
      const vicina = (): boolean => {
        if (!vivo || !elemento.isConnected) return false
        const r = elemento.getBoundingClientRect()
        return r.bottom > -window.innerHeight && r.top < 2 * window.innerHeight
      }
      void miniatura(indirizzo, chiave, pagina, larghezza, vicina).then((immagine) => {
        if (!vivo) return
        // Saltata, non fallita: la si riguarda per quando torna in vista.
        if (!immagine && !vicina()) smetti = guarda(elemento, compito)
        else impostaArrivata({ guardia, immagine })
      })
    }
    smetti = guarda(elemento, compito)
    return () => {
      vivo = false
      smetti()
    }
  }, [indirizzo, chiave, pagina, larghezza, guardia])

  const suaArrivata = arrivata?.guardia === guardia ? arrivata : null
  const immagine = esatta ?? suaArrivata?.immagine ?? miniaturaPronta(chiave, pagina, larghezza) ?? ripiego
  // Disegno fallito: lo si dice. La pagina resta trascinabile.
  const fallita = !esatta && suaArrivata !== null && suaArrivata.immagine === null

  return (
    <div ref={posto} className="pagina-sfoglio__foto">
      {fallita
        ? (
            <>
              <span className="pagina-sfoglio__attesa">{t.pagina(pagina)}</span>
              <span className="testo-quieto pagina-sfoglio__nota">{t.nonDisegnabile}</span>
            </>
          )
        : immagine
          ? (
              <>
                {/* Sempre lo stesso `<img>`: cambiando fotografia cambia solo `src`, e non si ridecodifica. */}
                <img src={immagine} alt={t.pagina(pagina)} draggable="false" />
                {children}
              </>
            )
          : (
              <>
                <span className="pagina-sfoglio__attesa">{String(pagina)}</span>
                <span className="testo-quieto pagina-sfoglio__nota">{t.disegnando}</span>
              </>
            )}
    </div>
  )
}
