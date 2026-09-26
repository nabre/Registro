// OCR delle pagine scansionate, che testo non ne hanno: le legge un modello
// locale (come ci si parla lo sa `llm.ts`), perché ci sono dati di minorenni
// che non devono uscire dal computer. Facoltativo: senza modello o programma le
// pagine restano in quarantena e si assegnano a mano.

import { collegamento, genera, prontezza, type Collegamento, type Prontezza } from './llm.js'
import { testi } from './mtmd.testi.js'

/** Il collegamento al modello che legge le pagine: chiavi e risoluzione stanno in `llm.ts`. */
function collegamentoOcr (segnale?: AbortSignal): Collegamento {
  return collegamento('ocr', segnale)
}

/**
 * Il segnale che vale per tutte le letture della sessione. Arriva fino a
 * `execFile`, che uccide `llama-mtmd-cli` (fino a minuti per pagina) quando
 * scatta.
 */
let letture = new AbortController()

/**
 * Ferma quel che sta leggendo adesso: la chiama chi spegne l'applicazione.
 * Il controllore si rifà subito, altrimenti ogni lettura successiva nella
 * stessa sessione partirebbe con un segnale già scattato.
 */
export function fermaLetture (): void {
  letture.abort()
  letture = new AbortController()
}

/** Se la lettura automatica è accesa. */
export function ocrAttivo (): boolean {
  return collegamentoOcr().attivo
}

/**
 * Se ci sono modello, proiettore e programma: serve all'interfaccia per
 * spegnere il pulsante prima, invece di fallire dopo minuti.
 */
export async function ocrPronto (): Promise<Prontezza> {
  return prontezza(collegamentoOcr())
}

/**
 * Quel che si chiede al modello: la trascrizione, non «di chi è la pagina».
 * Il nome lo cerca poi l'indice della classe, che sa chi c'è.
 */
function richiesta (): string {
  return testi().richiesta
}

/**
 * Il testo letto da un'immagine di pagina, o stringa vuota. Non solleva: ogni
 * fallimento vuol dire «pagina da guardare a mano», e le altre vanno avanti.
 */
export async function leggiImmagine (png: Uint8Array, segnale?: AbortSignal): Promise<string> {
  // Il programma esterno muore al primo dei due: quello di chi chiede e quello della sessione.
  const fine = segnale ? AbortSignal.any([segnale, letture.signal]) : letture.signal
  const collegamento = collegamentoOcr(fine)
  if (!collegamento.attivo) return ''

  try {
    // Tetto alle parole: i modelli piccoli tendono a ripetere la pagina.
    const letto = await genera(collegamento, {
      richiesta: richiesta(),
      immagini: [png],
      tettoParole: 256,
    })
    return ripulisci(letto)
  } catch (guasto) {
    // Vuoto comunque, ma il perché finisce nel registro degli errori.
    console.error('[ocr]', guasto)
    return ''
  }
}

/**
 * La trascrizione senza le staccionate del markdown e senza il testo ripetuto
 * due volte di fila, tic noto dei modelli piccoli.
 */
function ripulisci (testo: string): string {
  const pulito = testo
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/\r/g, '')
    // La domanda ripetuta in coda: succede quando il modello arriva al tetto e ricomincia.
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
