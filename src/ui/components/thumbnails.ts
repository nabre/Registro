// Le pagine di un PDF disegnate dentro il pannello, una per una.
//
// La cornice della pagina Documenti inquadra un PDF con il lettore di Chromium,
// e per leggere va benissimo: pagine, zoom, ricerca nel testo. Ma un lettore è
// una finestra chiusa — quel che c'è dentro non si prende con il mouse — e lo
// smistamento è tutto un prendere: queste due pagine sono di Rossi, questa di
// Bianchi. Per trascinare una pagina bisogna che la pagina sia un elemento
// della pagina web, cioè un'immagine che il registro ha disegnato da sé.
//
// Quindi qui c'è pdfjs, lo stesso che l'host usa per leggere il testo, ma
// caricato dentro il webview e usato per l'altro suo mestiere: disegnare.
//
// **Sul filo principale, e non in un `Worker`.** La pagina vive su
// `registro://pagina/<id>` e i file dell'applicazione stanno su
// `registro://app/…`: due autorità, cioè due origini, e un worker si carica
// solo dalla propria. pdfjs prevede il caso — se in `globalThis.pdfjsWorker`
// trova già il suo gestore di messaggi, lavora sul filo principale senza
// cercare nessun file — ed è quel che si fa qui, impacchettando il worker
// insieme al resto. Il costo è che disegnare una pagina occupa il filo
// dell'interfaccia per qualche decina di millisecondi: per questo le miniature
// si chiedono una alla volta, e solo quelle che si vedono davvero.
//
// Il modulo non disegna niente da sé e non sa niente dello smistamento: gli si
// chiede la fotografia della pagina N di un PDF, e lui la dà. Chi la mette in
// pagina — e chi ci attacca il trascinamento — è `views/pageBrowser.ts`.

/** Il tanto di pdfjs che serve qui, dichiarato a mano come in `data/pdf.ts`. */
interface ModuloPdfjs {
  getDocument (parametri: Record<string, unknown>): CompitoPdf
}

/**
 * L'apertura di un documento, che è anche l'unico appiglio per chiuderlo: dalla
 * versione 5 di pdfjs `destroy` sta sul compito e non più sul documento.
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
  render (parametri: Record<string, unknown>): { promise: Promise<void> }
  cleanup (): void
}

let modulo: Promise<ModuloPdfjs> | null = null

/**
 * pdfjs si carica alla prima miniatura e non prima.
 *
 * Sono due megabyte di codice — il lettore e il suo worker — e un registro in
 * cui nessuno apre un PDF da dividere non ha motivo di svegliarli. L'import
 * dinamico li lascia dentro il bundle ma spenti: esbuild li inizializza la
 * prima volta che questa funzione viene chiamata.
 *
 * L'ordine conta: il worker va messo in `globalThis` *prima* che il lettore
 * chieda di aprire qualcosa, altrimenti pdfjs cerca un file worker da caricare
 * e non lo trova.
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
 * Il PDF aperto adesso: uno solo per volta.
 *
 * Un documento aperto tiene in memoria i byte del file e le pagine già
 * decodificate — su una scansione di classe sono decine di megabyte — e di PDF
 * da dividere se ne guarda uno alla volta. Aprendone un altro, il primo si
 * chiude.
 */
let aperto: {
  chiave: string
  compito: Promise<CompitoPdf>
  documento: Promise<DocumentoPdf>
} | null = null

/**
 * Chiude un documento, e se non ci riesce lo dice.
 *
 * Le due cose che possono andare storte qui non si somigliano affatto. Un
 * compito respinto e' un PDF che non si e' caricato: chi l'aveva chiesto lo sa
 * gia', e qui basta raccogliere il rifiuto perche' non resti orfano. Una
 * `destroy` che fallisce e' invece un guaio nostro — dalla versione 5 di pdfjs
 * sta sul compito e non piu' sul documento, ed e' uno scambio facile da fare —
 * e un documento che non si chiude resta in memoria intero.
 *
 * Prima erano lo stesso `catch` vuoto, e il secondo caso spariva senza
 * lasciare traccia: si vedeva solo come memoria che cresceva. Adesso finisce
 * nella console, che e' dove si guarda, senza pero' far cadere il gesto di chi
 * stava leggendo: una chiusura fallita non deve rovinare una miniatura riuscita.
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
 * Dice dove pdfjs può leggere i caratteri standard del PDF.
 *
 * Sono i quattordici che un documento può nominare senza portarseli dentro:
 * senza di loro una pagella scritta in Helvetica viene disegnata con un
 * carattere di ripiego, e la miniatura mostra un foglio che non è quello che si
 * stamperebbe. Stanno accanto ai bundle dell'applicazione, e il pannello ne
 * riceve l'indirizzo con lo stato.
 */
export function impostaCaratteri (radiceApp: string): void {
  caratteri = `${radiceApp.replace(/\/+$/, '')}/dist/pdf-fonts/`
}

/** Le miniature già disegnate: `chiave|pagina` → l'immagine, come indirizzo. */
const fatte = new Map<string, string>()

/** Quelle che si stanno disegnando adesso: chi le chiede due volte aspetta la stessa. */
const inCorso = new Map<string, Promise<string | null>>()

/**
 * La coda: una pagina alla volta.
 *
 * Disegnare è lavoro del filo principale — vedi in testa al file — e venti
 * pagine chieste insieme vorrebbero dire un'interfaccia ferma per qualche
 * secondo. In fila, invece, fra una pagina e l'altra il registro respira: i
 * clic arrivano, la pagina scorre, e le miniature compaiono una dopo l'altra.
 */
let coda: Promise<unknown> = Promise.resolve()

/**
 * Le larghezze a cui una pagina viene davvero disegnata, in pixel.
 *
 * Non una per ogni misura chiesta: lo sfoglio si ingrandisce a scalini, e
 * ridisegnare trenta pagine a ogni pixel di zoom vorrebbe dire un'interfaccia
 * ferma mentre si trascina un cursore. Si sceglie il primo scalino che copre la
 * misura chiesta — il doppio di quella a schermo, perché uno schermo fitto
 * mostra due pixel veri per ogni pixel dichiarato — e le pagine già disegnate
 * a quello scalino restano buone.
 *
 * Lo scalino sta nella chiave di `fatte`, e questo vuol dire che di una pagina
 * possono restare fino a quattro fotografie: tante quanti sono gli scalini che
 * si sono attraversati zoomando. Non è una svista ed è il motivo per cui non
 * c'è uno sfratto: tenere il solo scalino in uso vorrebbe dire buttare via
 * proprio quel che serve a `miniaturaPronta` per riempire i riquadri senza
 * sfarfallio mentre il disegno nuovo arriva — si tornerebbe a trenta riquadri
 * vuoti a ogni scatto dello zoom. La misura è comunque chiusa da due lati: gli
 * scalini sono quattro e non uno per pixel, e `dimentica()` butta tutto appena
 * il documento si chiude.
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
 * Apre il PDF, o ridà quello già aperto.
 *
 * `chiave` distingue una versione dall'altra dello stesso file, come nella
 * cornice: un PDF riscritto sta allo stesso indirizzo di prima, e senza un
 * pezzo che cambia si continuerebbero a mostrare le pagine di ieri.
 *
 * I byte si prendono con `fetch` e si passano a pdfjs già letti: lasciando
 * l'indirizzo a lui, il lettore si metterebbe a scaricarlo da sé — e per un
 * indirizzo che non è `http` non tutte le sue strade funzionano.
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
    if (!risposta.ok) throw new Error(`il PDF non si è potuto leggere (${risposta.status})`)
    const byte = new Uint8Array(await risposta.arrayBuffer())
    return m.getDocument({
      data: byte,
      isEvalSupported: false,
      ...(caratteri ? { standardFontDataUrl: caratteri } : {}),
      // I caratteri servono eccome, qui: si disegna. È l'opposto di quel che
      // fa l'host, che legge e basta.
      disableFontFace: false,
    })
  })()

  // Il compito serve a chiudere, il documento a leggere. Il `then` tiene anche
  // il rifiuto attaccato a qualcuno: senza, un PDF che non si carica lascerebbe
  // una promessa respinta di cui nessuno risponde.
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

/**
 * Una pagina già aperta, disegnata alla larghezza chiesta.
 *
 * Sta a sé perché i chiamanti sono due — le miniature di un PDF su disco e
 * l'anteprima di un modello, che il PDF ce l'ha solo in memoria — e il disegno
 * è la parte che non deve differire fra i due: lo sfondo bianco e la qualità
 * del JPEG sono decisioni prese una volta.
 */
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

  // Il foglio è bianco anche dove il PDF non dichiara nessuno sfondo: senza
  // questa pennellata una pagina di solo testo esce su fondo trasparente, e nel
  // tema scuro diventa testo nero su nero — una miniatura che sembra vuota.
  pennello.fillStyle = '#ffffff'
  pennello.fillRect(0, 0, tela.width, tela.height)
  // La tela accanto al suo contesto: dalla versione 5 pdfjs vuole `canvas` e
  // tiene `canvasContext` per compatibilita'. Oggi ricava l'una dall'altro e il
  // disegno viene identico; dirli tutti e due, invece di appoggiarsi a quel
  // ricavo, costa una parola.
  await foglio.render({ canvas: tela, canvasContext: pennello, viewport: vista }).promise
  foglio.cleanup()
  // In JPEG e non in PNG: una scansione a colori in PNG pesa dieci volte tanto,
  // e di queste immagini in memoria ne resta una per pagina **e per scalino di
  // zoom a cui quella pagina è stata guardata** — vedi `SCALINI`. La qualità è
  // alta perché qui si legge: su un modulo scritto fitto, un JPEG tirato fa
  // sparire proprio i tratti sottili delle lettere.
  return tela.toDataURL('image/jpeg', 0.88)
}

/**
 * La fotografia della pagina, presa dalla memoria se c'è già.
 *
 * Torna `null` quando quella pagina non si è potuta disegnare — un PDF rotto,
 * un file sparito — e chi l'ha chiesta mostra il numero della pagina e basta:
 * una pagina che non si vede si può ancora trascinare, ed è meglio di un buco
 * che blocca il lavoro.
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

  const lavoro = coda.then(async () => {
    try {
      const immagine = await disegna(indirizzo, chiave, pagina, scalino)
      if (immagine) fatte.set(segno, immagine)
      return immagine
    } catch {
      // Una pagina che non si disegna non ferma le altre: il PDF può essere
      // rotto in un punto solo, e le venticinque pagine buone servono lo stesso.
      return null
    } finally {
      inCorso.delete(segno)
    }
  })
  inCorso.set(segno, lavoro)
  coda = lavoro
  return lavoro
}

/**
 * Quella già disegnata, subito: serve a ridisegnare la vista senza sfarfallio.
 *
 * Se a quella misura non c'è, ma c'è a un'altra, torna quella: ingrandendo lo
 * sfoglio si vede subito la pagina di prima — un po' sgranata — e un istante
 * dopo arriva quella nuova. È il contrario di quel che succedeva prima, cioè
 * trenta riquadri vuoti mentre il disegno ricomincia da capo.
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
 * Quella disegnata proprio a questa misura, o niente.
 *
 * Serve a distinguere «ho già la fotografia giusta» da «ho una fotografia che
 * intanto va bene»: la seconda si mostra subito e si chiede comunque quella
 * buona, altrimenti ingrandire lo sfoglio lascerebbe in mostra per sempre la
 * miniatura piccola, stirata.
 */
export function miniaturaAllaMisura (
  chiave: string,
  pagina: number,
  larghezza: number,
): string | null {
  return fatte.get(chiaveDi(chiave, pagina, scalinoPer(larghezza))) ?? null
}

/**
 * Chiude il PDF aperto e butta via le sue miniature.
 *
 * Si chiama quando quel documento non si guarda più — la cornice si chiude, il
 * file viene archiviato o buttato — e non è solo memoria: le pagine di una
 * scansione già assegnata non devono ricomparire da una cache al prossimo PDF
 * che prende quel percorso.
 */
export function dimentica (): void {
  const precedente = aperto
  aperto = null
  fatte.clear()
  inCorso.clear()
  if (precedente) {
    chiudi(precedente.compito)
  }
}

/**
 * Le pagine di un PDF che esiste solo in memoria.
 *
 * È l'anteprima di un modello: l'host compone il foglio e lo rimanda indietro
 * senza scriverlo da nessuna parte, quindi non c'è un indirizzo da inquadrare
 * in una cornice — c'è un blocco di byte. Si disegnano qui, una per una, e
 * quel che ne esce sono immagini che la pagina mette in fila.
 *
 * Non passa dalla memoria delle miniature e non chiude il documento aperto:
 * un'anteprima è di passaggio, e non deve buttare via le pagine della scansione
 * che qualcuno stava smistando in un'altra pagina del registro.
 *
 * `massimo` taglia i fogli lunghi: un fascicolo di classe è venti pagine, e
 * disegnarle tutte per vedere com'è venuta l'intestazione vuol dire qualche
 * secondo di interfaccia ferma. Chi chiama dice quante ne mostra e quante ce
 * n'erano.
 */
export async function pagineDaByte (
  byte: Uint8Array,
  larghezza: number,
  massimo = 4,
): Promise<{ pagine: string[], totale: number }> {
  const m = await pdfjs()
  const compito = m.getDocument({
    data: byte,
    isEvalSupported: false,
    ...(caratteri ? { standardFontDataUrl: caratteri } : {}),
    disableFontFace: false,
  })
  const documento = await compito.promise

  try {
    const scalino = scalinoPer(larghezza)
    const quante = Math.min(documento.numPages, massimo)
    const pagine: string[] = []
    for (let numero = 1; numero <= quante; numero += 1) {
      const immagine = await fotografia(await documento.getPage(numero), scalino)
      if (immagine) pagine.push(immagine)
    }
    return { pagine, totale: documento.numPages }
  } finally {
    // I byte di un'anteprima non servono più appena è disegnata: senza questa
    // chiusura ogni prova di un modello lascerebbe in memoria un PDF intero.
    chiudi(compito)
  }
}
