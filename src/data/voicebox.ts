// voicebox (github.com/jamiepine/voicebox, MIT): il dialetto di questo motore
// di dettatura. Impostazioni, guardie e silenzio stanno in `dictation.ts`.
//
// `POST /transcribe` multipart: `file` (WAV costruito in memoria, mai su
// disco), `language` (dichiarata: su frasi corte l'autorilevamento sbaglia),
// `model` (taglia di Whisper; se non è ancora scaricata risponde 202).
// `redirect: 'manual'`: un 3xx è un rifiuto, perché la guardia sull'indirizzo
// vale solo per il primo passo.

import type { Collegamento, MotoreVoce, Registrazione } from './dictation.js'
import { testi } from './dictation.testi.js'

// ------------------------------------------------------------------- il WAV

/** I quarantaquattro byte davanti ai campioni, come li vuole un lettore di WAV. */
function intestazione (byteCampioni: number, frequenza: number): Uint8Array {
  const testa = new Uint8Array(44)
  const vista = new DataView(testa.buffer)
  const scrivi = (posizione: number, testo: string): void => {
    for (let i = 0; i < testo.length; i += 1) testa[posizione + i] = testo.charCodeAt(i)
  }

  scrivi(0, 'RIFF')
  vista.setUint32(4, 36 + byteCampioni, true)
  scrivi(8, 'WAVE')
  scrivi(12, 'fmt ')
  // Sedici byte di descrittore, formato 1 — PCM intero, senza compressione.
  vista.setUint32(16, 16, true)
  vista.setUint16(20, 1, true)
  vista.setUint16(22, 1, true)
  vista.setUint32(24, frequenza, true)
  // Byte al secondo e byte per campione: un canale, due byte l'uno.
  vista.setUint32(28, frequenza * 2, true)
  vista.setUint16(32, 2, true)
  vista.setUint16(34, 16, true)
  scrivi(36, 'data')
  vista.setUint32(40, byteCampioni, true)
  return testa
}

/** I campioni impacchettati in un file WAV, in memoria. Esportata per la prova. */
export function wav (registrazione: Registrazione): Uint8Array<ArrayBuffer> {
  const campioni = registrazione.campioni
  const byte = campioni.length * 2
  const file = new Uint8Array(44 + byte)
  file.set(intestazione(byte, registrazione.frequenza), 0)
  file.set(new Uint8Array(campioni.buffer, campioni.byteOffset, byte), 44)
  return file
}

// ------------------------------------------------------------ la ripulitura

/**
 * Le frasi che Whisper inventa davanti al silenzio, prese dai sottotitoli su
 * cui è addestrato. Seconda rete dopo il filtro del silenzio di `dictation.ts`.
 */
const PARASSITI: readonly RegExp[] = [
  /^sottotitoli\b.*$/i,
  /^sottotitolazione\b.*$/i,
  /^grazie per (aver guardato|la visione)\b.*$/i,
  /^iscriviti al canale\b.*$/i,
]

/**
 * Il testo della risposta, senza annotazioni fra parentesi (`[BLANK_AUDIO]`,
 * `(musica)`), senza frasi parassite e su una riga sola.
 */
export function ripulisci (uscita: string): string {
  const righe = uscita
    .split('\n')
    .map((riga) => riga.trim())
    .filter((riga) => riga !== '')
    .filter((riga) => !/^[[(][^\])]*[\])]$/.test(riga))
    .filter((riga) => !PARASSITI.some((parassita) => parassita.test(riga)))
  return righe.join(' ').replace(/\s+/g, ' ').trim()
}

// ---------------------------------------------------------------- il segnale

/** Il segnale che ferma le trascrizioni in corso: arriva fino a `fetch`. */
let dettature = new AbortController()

/**
 * Ferma quel che sta trascrivendo adesso: la chiama chi spegne l'applicazione.
 * Il controllore si rifà subito, altrimenti le dettature successive
 * partirebbero con un segnale già scattato.
 */
export function fermaDettature (): void {
  dettature.abort()
  dettature = new AbortController()
}

/**
 * Un segnale che scatta allo spegnimento o allo scadere dell'attesa. A mano e
 * non con `AbortSignal.any` perché il messaggio deve distinguere le due cause.
 */
function segnaleCon (attesaMs: number): {
  segnale: AbortSignal
  scaduto: () => boolean
  fermato: () => boolean
  chiudi: () => void
} {
  const fuori = dettature.signal
  const controllore = new AbortController()
  let scaduto = false
  const allaFermata = (): void => controllore.abort()
  fuori.addEventListener('abort', allaFermata, { once: true })
  const orologio = setTimeout(() => {
    scaduto = true
    controllore.abort()
  }, attesaMs)
  if (fuori.aborted) controllore.abort()
  return {
    segnale: controllore.signal,
    scaduto: () => scaduto,
    fermato: () => fuori.aborted,
    chiudi: () => {
      clearTimeout(orologio)
      fuori.removeEventListener('abort', allaFermata)
    },
  }
}

// ------------------------------------------------------------ le risposte

/**
 * Il `detail` di una risposta di FastAPI: testo per un 400, oggetto con
 * `message` per il 202; altrimenti il codice.
 */
async function dettaglio (risposta: Response): Promise<string> {
  try {
    const corpo = (await risposta.json()) as { detail?: unknown }
    const detto = corpo?.detail
    if (typeof detto === 'string') return detto
    if (detto && typeof detto === 'object' && typeof (detto as { message?: unknown }).message === 'string') {
      return (detto as { message: string }).message
    }
  } catch {
    // Non era JSON: si ripiega sul codice, qui sotto.
  }
  return testi().risposta(risposta.status)
}

/** Quanto si aspetta un «ci sei?»: il servizio è sulla stessa macchina. */
const ATTESA_PROVA_MS = 3000

// --------------------------------------------------------------- il motore

/**
 * Il motore, come `dictation.ts` lo vuole. Il WAV e i campioni si azzerano nel
 * `finally`: la voce non resta in memoria fino al raccoglitore.
 */
export const VOICEBOX: MotoreVoce = {
  nome: 'voicebox',

  risponde: async (collegamento: Collegamento) => {
    // `/health` e non `/`: la radice serve la pagina web di voicebox.
    try {
      const risposta = await fetch(`${collegamento.indirizzo}/health`, {
        redirect: 'manual',
        signal: AbortSignal.timeout(ATTESA_PROVA_MS),
      })
      // Corpo scartato perché non resti una connessione aperta.
      await risposta.body?.cancel()
      return risposta.ok
        ? ''
        : testi().nonPronto(collegamento.indirizzo, risposta.status)
    } catch {
      return testi().nonRisponde(collegamento.indirizzo)
    }
  },

  trascrivi: async (collegamento: Collegamento, registrazione: Registrazione) => {
    const suono = wav(registrazione)
    const attesa = segnaleCon(collegamento.attesaMs)
    try {
      const modulo = new FormData()
      modulo.append('file', new Blob([suono], { type: 'audio/wav' }), 'dettatura.wav')
      modulo.append('language', collegamento.lingua)
      modulo.append('model', collegamento.taglia)

      let risposta: Response
      try {
        risposta = await fetch(`${collegamento.indirizzo}/transcribe`, {
          method: 'POST',
          body: modulo,
          redirect: 'manual',
          signal: attesa.segnale,
        })
      } catch (guasto) {
        if (attesa.fermato()) throw new Error(testi().fermata, { cause: guasto })
        if (attesa.scaduto()) {
          throw new Error(
            testi().scaduta(Math.round(collegamento.attesaMs / 1000)),
            { cause: guasto },
          )
        }
        throw new Error(testi().nonRisponde(collegamento.indirizzo), { cause: guasto })
      }

      if (risposta.status >= 300 && risposta.status < 400) {
        await risposta.body?.cancel()
        throw new Error(testi().rinvio(collegamento.indirizzo))
      }
      // 202 prima di `ok`, che lo comprende: qui vuol dire «modello in scarico».
      if (risposta.status === 202) {
        await risposta.body?.cancel()
        throw new Error(testi().scaricaModello(collegamento.taglia))
      }
      if (!risposta.ok) {
        throw new Error(testi().nonTrascritto(await dettaglio(risposta)))
      }
      const corpo = (await risposta.json()) as { text?: unknown }
      return ripulisci(typeof corpo?.text === 'string' ? corpo.text : '')
    } finally {
      attesa.chiudi()
      // La voce si azzera comunque sia andata.
      suono.fill(0)
      registrazione.campioni.fill(0)
    }
  },
}
