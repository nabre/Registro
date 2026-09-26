// La dettatura: la voce va a voicebox, un'app a parte con Whisper che gira su
// questo computer, e il testo torna nella casella. Stessa forma di `llm.ts`:
// un uso con le sue impostazioni e un motore. L'indirizzo passa da
// `indirizzoLocale` a ogni lettura, perché decide dove va la voce: solo un
// servizio di questo computer (non si verifica che sia proprio voicebox).
// Le registrazioni mute non si mandano: davanti al silenzio Whisper inventa.

import * as apparato from 'apparato'
import { rm } from 'node:fs/promises'

import { cartellaDi } from './kit.js'
import { VOICEBOX } from './voicebox.js'
import { indirizzoLocale } from '../domain/loopback.js'
import { lingua } from '../i18n/index.js'
import { testi } from './dictation.testi.js'

// Alla chiusura del registro si fermano le trascrizioni in corso (il segnale
// vive in `voicebox.ts`).
export { fermaDettature } from './voicebox.js'

// ------------------------------------------------------- che cosa si consegna

/**
 * Quel che arriva dal microfono, già ricampionato dalla pagina
 * (`ui/assistant/voice.ts`), che ha il motore audio del browser.
 */
export interface Registrazione {
  /** PCM con segno a 16 bit, un canale. */
  campioni: Int16Array
  frequenza: number
}

/** Un programma che trascrive la voce sulla macchina: dice se c'è, e trascrive. */
export interface MotoreVoce {
  /** Come si chiama, per i messaggi: «voicebox». */
  nome: string
  /** Vuoto se risponde; altrimenti la frase che dice perché no. */
  risponde: (collegamento: Collegamento) => Promise<string>
  trascrivi: (collegamento: Collegamento, registrazione: Registrazione) => Promise<string>
}

/** I motori che il registro sa usare. */
const MOTORI = { voicebox: VOICEBOX } as const

/** Le taglie di Whisper che voicebox conosce: le stesse `scelte` del manifesto. */
const TAGLIE = ['base', 'small', 'medium', 'large', 'turbo'] as const
export type Taglia = (typeof TAGLIE)[number]

/** Un indirizzo, una taglia, una lingua e un'attesa: quel che serve per trascrivere. */
export interface Collegamento {
  motore: MotoreVoce
  attivo: boolean
  /** L'origine di voicebox; vuota se quel che è scritto non ha passato la guardia. */
  indirizzo: string
  taglia: Taglia
  /** La lingua del registro — `it`, `de`, `fr` o `en` —: vedi la testa di `voicebox.ts`. */
  lingua: string
  attesaMs: number
  durataMassimaMs: number
}

// ------------------------------------------------------------ le impostazioni

/** Dove risponde voicebox quando lo si apre dall'app: il predefinito del manifesto. */
const INDIRIZZO_DI_SERIE = 'http://127.0.0.1:17493'

/** Secondi di voce al massimo, oltre si taglia: protegge dal microfono lasciato acceso. */
const DURATA_MASSIMA_SECONDI = 60

/**
 * Quanto si aspetta la trascrizione: senza scheda video un modello grande ci
 * mette quanto dura la voce, a volte il doppio.
 */
const ATTESA_SECONDI = 120

/**
 * Le impostazioni della dettatura, risolte in un posto solo perché nessuno
 * salti la guardia sull'indirizzo.
 */
export function collegamentoDettatura (): Collegamento {
  const configurazione = apparato.impostazioni.leggi('registroDocenti')
  const taglia = configurazione.get<string>('dettatura.taglia', 'turbo')
  return {
    motore: MOTORI.voicebox,
    attivo: configurazione.get<boolean>('dettatura.attivo', false),
    indirizzo: indirizzoLocale(
      configurazione.get<string>('dettatura.indirizzo', INDIRIZZO_DI_SERIE) ?? '',
    ),
    // Le `scelte` del manifesto bastano, salvo un file riscritto a mano.
    taglia: (TAGLIE as readonly string[]).includes(taglia ?? '') ? (taglia as Taglia) : 'turbo',
    // Dichiarata e non indovinata (vedi `voicebox.ts`): i codici del registro
    // sono gli stessi di Whisper.
    lingua: lingua(),
    attesaMs: ATTESA_SECONDI * 1000,
    durataMassimaMs: DURATA_MASSIMA_SECONDI * 1000,
  }
}

/** Se la dettatura è accesa: alla pagina basta questo per mostrare il pulsante. */
export function dettaturaAccesa (): boolean {
  return collegamentoDettatura().attivo
}

// --------------------------------------------------------------- se si può

/** Perché adesso non si può dettare, o `pronto` se si può. */
export interface Prontezza {
  pronto: boolean
  motivo: string
}

/**
 * Per quanto si ricorda che voicebox risponde: si manda un pezzo a ogni pausa.
 * Il «no» non si ricorda, perché voicebox può essere in apertura.
 */
const RICORDO_MS = 10_000
let rispondeva: { indirizzo: string, fino: number } | null = null

/**
 * Se si può dettare adesso: accesa, indirizzo locale, voicebox che risponde.
 * Il motivo è una frase che dice che cosa sistemare.
 */
export async function prontezzaDettatura (collegamento: Collegamento): Promise<Prontezza> {
  if (!collegamento.attivo) {
    return {
      pronto: false,
      motivo: testi().spenta,
    }
  }
  if (collegamento.indirizzo === '') {
    const scritto = String(
      apparato.impostazioni.leggi('registroDocenti').get<string>('dettatura.indirizzo', '') ?? '',
    ).trim()
    return {
      pronto: false,
      motivo: testi().nonLocale(scritto),
    }
  }
  if (rispondeva?.indirizzo === collegamento.indirizzo && Date.now() < rispondeva.fino) {
    return { pronto: true, motivo: '' }
  }
  const perche = await collegamento.motore.risponde(collegamento)
  if (perche !== '') {
    rispondeva = null
    return { pronto: false, motivo: perche }
  }
  rispondeva = { indirizzo: collegamento.indirizzo, fino: Date.now() + RICORDO_MS }
  return { pronto: true, motivo: '' }
}

// ------------------------------------------------------------ che cosa si fa

/**
 * Quanto forte è la registrazione, da 0 a 1: valore quadratico medio, non il
 * picco, perché un colpo sulla scrivania non è voce.
 */
function forza (campioni: Int16Array): number {
  if (campioni.length === 0) return 0
  let somma = 0
  for (let i = 0; i < campioni.length; i += 1) {
    const valore = campioni[i] / 32768
    somma += valore * valore
  }
  return Math.sqrt(somma / campioni.length)
}

/**
 * Sotto questa soglia non c'è voce. Su un microfono da portatile il fondo sta
 * intorno a 0,002 e una frase detta piano sopra 0,02: la soglia pende verso il sì.
 */
const SOGLIA_SILENZIO = 0.006

/** Quanto dura, in millisecondi, quel che è arrivato. */
function durataMs (registrazione: Registrazione): number {
  return (registrazione.campioni.length / registrazione.frequenza) * 1000
}

/**
 * La frase detta, o una riga che dice perché non c'è; non solleva. Ordine:
 * prontezza, poi silenzio, poi trascrizione. La voce si azzera comunque vada.
 */
export async function trascrivi (
  registrazione: Registrazione,
): Promise<{ ok: boolean, testo: string, motivo: string }> {
  try {
    return await quelCheHaDetto(registrazione)
  } finally {
    // Si azzera la voce da qualunque uscita: contiene nomi appena pronunciati.
    // Il gemello è il `finally` di `voicebox.ts`, che azzera il WAV.
    registrazione.campioni.fill(0)
  }
}

/** Il corpo di `trascrivi`, che lo avvolge per azzerare la voce. */
async function quelCheHaDetto (
  registrazione: Registrazione,
): Promise<{ ok: boolean, testo: string, motivo: string }> {
  const collegamento = collegamentoDettatura()
  const stato = await prontezzaDettatura(collegamento)
  if (!stato.pronto) return { ok: false, testo: '', motivo: stato.motivo }

  // Troppo lunga: si taglia la coda invece di rifiutarla.
  const tetto = Math.floor((collegamento.durataMassimaMs / 1000) * registrazione.frequenza)
  const campioni =
    registrazione.campioni.length > tetto
      ? registrazione.campioni.subarray(0, tetto)
      : registrazione.campioni
  const tagliata: Registrazione = { campioni, frequenza: registrazione.frequenza }

  if (durataMs(tagliata) < 300 || forza(campioni) < SOGLIA_SILENZIO) {
    return { ok: false, testo: '', motivo: testi().nienteSentito }
  }

  try {
    const testo = await collegamento.motore.trascrivi(collegamento, tagliata)
    return testo === ''
      ? { ok: false, testo: '', motivo: testi().nonCapito }
      : { ok: true, testo, motivo: '' }
  } catch (guasto) {
    // Dettagli in console, riga leggibile a chi ha premuto; il «sì» ricordato decade.
    rispondeva = null
    console.error('[dettatura]', guasto)
    return {
      ok: false,
      testo: '',
      motivo: guasto instanceof Error ? guasto.message : String(guasto),
    }
  }
}

// ------------------------------------------------- il corredo che non serve più

/**
 * Cancella all'avvio la cartella `dettatura` nei dati dell'applicazione, dove
 * potrebbero restare `whisper-cli` e il suo modello, che nessuno usa. Non
 * solleva: se non riesce, si riprova al prossimo avvio.
 */
export async function ritiraCorredoWhisper (): Promise<void> {
  try {
    await rm(cartellaDi('dettatura'), { recursive: true, force: true })
  } catch {
    // Si riprova al prossimo avvio.
  }
}
