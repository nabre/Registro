// L'OCR: leggere il nome sulle pagine che testo non ne hanno.
//
// Metà dei documenti che arrivano in segreteria sono scansioni — il modulo
// firmato dai genitori, il certificato timbrato — e dentro un PDF così non c'è
// una lettera da cercare: c'è una fotografia. Senza qualcuno che la guardi,
// quelle pagine finiscono tutte in quarantena e lo smistamento non ha smistato
// niente.
//
// A guardarle è un modello che gira sulla macchina di chi insegna — come ci si
// parli lo sa `llm.ts`, e questo file non lo sa. Sta in locale e non altrove per il motivo per cui il pannello ha una
// politica di sicurezza stretta: su quelle pagine ci sono nomi di minorenni,
// diagnosi, situazioni di famiglia. Non escono dal computer.
//
// È un pezzo facoltativo. Se il modello non è stato scaricato, o manca il
// programma che sa guardare le immagini, il registro non si rompe: le pagine
// scansionate restano in quarantena e si assegnano a mano, che è esattamente
// quel che si faceva prima.

import { collegamento, genera, prontezza, type Collegamento, type Prontezza } from './llm.js'

/**
 * Il collegamento al modello che legge le pagine.
 *
 * Non si legge niente qui: le chiavi — interruttore, modello, proiettore,
 * programma, attesa — sono le stesse di ogni altro uso, e a leggerle, a
 * risolvere il modello dentro la cartella e a sapere che questo uso vuole un
 * motore capace di guardare è `llm.ts`. Di questo file resta il nome dell'uso,
 * che è tutto quel che lo distingue.
 */
function collegamentoOcr (segnale?: AbortSignal): Collegamento {
  return collegamento('ocr', segnale)
}

/**
 * Il segnale che vale per tutte le letture di questa sessione.
 *
 * Il modello che legge le scansioni **non gira dentro il registro**: gira in
 * `llama-mtmd-cli`, un programma a parte, e una pagina può tenerlo occupato
 * fino a tre minuti — è l'attesa dichiarata nelle impostazioni. Finché nessuno
 * gli dava un segnale, quei tre minuti non si potevano accorciare da qui: una
 * coda di quarantena annullata continuava a macinare pagine che nessuno voleva
 * più, e uno spegnimento aspettava il programma o lo lasciava lì.
 *
 * Il segnale invece arriva fino a `execFile`, che al primo strattone ammazza il
 * processo. Non è la coda a doverselo ricordare — la coda sa di pagine, non di
 * processi: lo sa questo file, che è quello che li fa partire.
 */
let letture = new AbortController()

/**
 * Ferma quel che sta leggendo adesso: la chiama chi spegne l'applicazione.
 *
 * Il controllore si rifà subito dopo, e non è per simmetria: senza, ogni
 * lettura chiesta dopo — che succede, perché si può spegnere il pannello e
 * riaprirlo nella stessa sessione — partirebbe con un segnale già tirato e
 * morirebbe prima di cominciare, senza che niente dica perché.
 */
export function fermaLetture (): void {
  letture.abort()
  letture = new AbortController()
}

/**
 * Se la lettura automatica è accesa.
 *
 * È quel che serve a chi deve solo decidere se provarci — lo smistatore, che
 * manda in quarantena invece di chiedere, e il pannello, che accende un
 * pulsante — e non è il collegamento intero: un indirizzo e un nome di modello
 * non hanno niente da dire a quelle due domande.
 */
export function ocrAttivo (): boolean {
  return collegamentoOcr().attivo
}

/**
 * Se c'è tutto quel che serve per leggere: il modello, il suo proiettore, il
 * programma. Serve a dirlo prima, in interfaccia: un pulsante «leggi la
 * scansione» che macina cinque minuti per poi annunciare che il modello non è
 * stato scelto è peggio di un pulsante spento.
 */
export async function ocrPronto (): Promise<Prontezza> {
  return prontezza(collegamentoOcr())
}

/**
 * Quel che si chiede al modello. Si domanda la trascrizione e non «di chi è
 * questa pagina»: un modello che legge non deve anche decidere, e il nome lo
 * cerca poi l'indice della classe — che sa chi c'è in quella classe, cosa che
 * il modello non sa.
 */
const RICHIESTA = 'Trascrivi il testo di questa pagina, in particolare nomi e cognomi. Solo il testo.'

/**
 * Il testo letto da un'immagine di pagina, o stringa vuota se non se n'è
 * cavato niente.
 *
 * Non solleva: una scansione illeggibile, un modello mai scaricato o uno che
 * ci mette troppo sono tutte la stessa cosa dal punto di vista di chi smista —
 * quella pagina va guardata a mano — e non c'è motivo di far fallire lo
 * smistamento delle altre.
 */
export async function leggiImmagine (png: Uint8Array, segnale?: AbortSignal): Promise<string> {
  // Due segnali e non uno: quello di chi ha chiesto — la coda che smette
  // perché lo smistamento è stato annullato — e quello della sessione, che
  // vale per tutte. Il programma esterno muore al primo dei due, ed è l'unica
  // cosa che lo fa morire: `execFile` lo ammazza quando il segnale scatta.
  const fine = segnale ? AbortSignal.any([segnale, letture.signal]) : letture.signal
  const collegamento = collegamentoOcr(fine)
  if (!collegamento.attivo) return ''

  try {
    // Il tetto alle parole: i modelli piccoli tendono a ripetere la pagina due
    // volte, e ogni parola in più è tempo di macchina speso per niente. Una
    // testata ci sta comoda.
    const letto = await genera(collegamento, {
      richiesta: RICHIESTA,
      immagini: [png],
      tettoParole: 256,
    })
    return ripulisci(letto)
  } catch (guasto) {
    // Torna stringa vuota comunque — quella pagina si guarda a mano, ed è la
    // regola dichiarata qui sopra — ma il perché resta scritto. Senza questa
    // riga, uno scarico del programma andato storto marcherebbe illeggibili
    // venti pagine senza che da nessuna parte ci sia detto perché.
    console.error('[ocr]', guasto)
    return ''
  }
}

/**
 * La trascrizione ripulita di quel che i modelli di OCR aggiungono di loro: le
 * staccionate del markdown, e la ripetizione dello stesso testo due volte di
 * fila — che è un tic noto dei modelli piccoli e che, lasciato passare,
 * gonfierebbe l'estratto mostrato in quarantena senza aggiungere nulla.
 */
function ripulisci (testo: string): string {
  const pulito = testo
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/\r/g, '')
    // La domanda ripetuta in coda alla risposta: succede quando il modello
    // arriva al tetto delle parole e ricomincia da capo.
    .replace(/Trascrivi il testo[^\n]*/gi, '')
    .trim()
  const meta = Math.floor(pulito.length / 2)
  if (meta > 20) {
    const prima = pulito.slice(0, meta).trim()
    const dopo = pulito.slice(meta).trim()
    if (prima && dopo.startsWith(prima.slice(0, Math.min(prima.length, 60)))) return prima
  }
  return pulito
}
