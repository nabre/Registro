// Il microfono: dal clic ai pezzi di voce che Whisper sa leggere, uno alla
// volta mentre si parla. Tutto l'audio sta qui; `chat.ts` vede solo una presa
// che consegna pezzi.
//
// A pezzi perché chi detta vuole vedere le parole mentre le dice, e voicebox
// (`/transcribe`) vuole un file intero: si taglia alle pause, non a orologio,
// per non spezzare le parole.
//
// Whisper vuole PCM a 16 kHz, mono, 16 bit: un `AudioContext` dichiarato a
// 16 kHz ricampiona da sé i 48 kHz del microfono, senza ricampionatore scritto
// a mano né `ffmpeg`. Al confine passano campioni, non un file.
//
// `ScriptProcessorNode`, benché deprecato: un `AudioWorklet` si carica da un
// indirizzo, e la CSP di queste pagine (`default-src 'none'`, script per nonce,
// `panels/page.ts`) andrebbe allargata a `blob:` per un nodo che somma quadrati.

import { testi } from './chat.testi.js'

/** La frequenza che Whisper vuole, e l'unica che esca da qui. */
export const FREQUENZA = 16000

/**
 * Quanti campioni per giro: 2048 a 16 kHz sono 128 ms. È il grano con cui si
 * misura il silenzio: più piccolo sveglia troppo il thread, più grande ritarda
 * la pausa.
 */
const FOTOGRAMMA = 2048

/** Quanto dura un fotogramma, in millisecondi. */
const FOTOGRAMMA_MS = (FOTOGRAMMA / FREQUENZA) * 1000

/**
 * Soglie di voce: sopra `ENTRA` qualcuno parla, sotto `ESCE` ha smesso. Due
 * soglie perché una frase che si smorza non chiuda il pezzo a metà; `ENTRA` è
 * alta per non aprire un pezzo su un colpo di tosse, `ESCE` è quella di
 * `data/dictation.ts` per la registrazione muta.
 */
const SOGLIA_ENTRA = 0.012
const SOGLIA_ESCE = 0.006

/** Quanto silenzio chiude un pezzo: la pausa fra due frasi, non fra due parole. */
const PAUSA_MS = 600

/** Sotto questa durata non è una frase: è un colpo sulla scrivania. */
const MINIMO_MS = 400

/**
 * Quanto può durare un pezzo comunque: chi legge un elenco può non fermarsi
 * mai, e il testo deve comparire. Il taglio cade in mezzo a una parola.
 */
const PEZZO_MASSIMO_MS = 12_000

/**
 * Quanto suono si tiene prima che la voce cominci: la soglia scatta a sillaba
 * passata, e senza «metti assente Rossi» diventa «etti assente Rossi».
 */
const ANTEPRIMA_MS = 300

/**
 * Il tetto della pagina, dieci minuti: il muro contro un microfono dimenticato
 * acceso. Il limite dell'impostazione, per pezzo, sta nell'host
 * (`data/dictation.ts`).
 */
const TETTO_MS = 600_000

/** Una registrazione in corso. */
export interface Presa {
  /** Chiude il microfono e consegna l'ultimo pezzo, se c'era voce dentro. */
  ferma: () => Promise<void>
  /** Chiude il microfono e butta via quel che non è ancora uscito. */
  annulla: () => void
}

/** Che cosa si vuol sapere, mentre il microfono è aperto. */
interface Ascolto {
  /**
   * Un pezzo di voce tagliato a una pausa, pronto da trascrivere: arriva più
   * volte mentre si parla, mai per il silenzio.
   */
  alPezzo: (campioni: Int16Array) => void
  /** Si è arrivati al muro dei dieci minuti: la presa è già chiusa. */
  alTetto: () => void
}

/**
 * Perché il microfono non si è aperto, in parole: il permesso si può dare, il
 * microfono che manca va attaccato.
 */
function perchéNo (guasto: unknown): string {
  const nome = guasto instanceof Error ? guasto.name : ''
  if (nome === 'NotAllowedError' || nome === 'SecurityError') {
    return testi().microfonoNegato
  }
  if (nome === 'NotFoundError' || nome === 'OverconstrainedError') {
    return testi().nessunMicrofono
  }
  if (nome === 'NotReadableError') {
    return testi().microfonoOccupato
  }
  return testi().microfonoChiuso(guasto instanceof Error ? guasto.message : String(guasto))
}

/**
 * Un fotogramma di suono, dai float del motore audio agli interi del WAV. Si
 * copia: il buffer del nodo si riusa al giro dopo.
 */
function interi (onda: Float32Array): Int16Array {
  const pezzo = new Int16Array(onda.length)
  for (let i = 0; i < onda.length; i += 1) {
    // Tagliato a ±1: un campione fuori scala (guadagno automatico) girerebbe di
    // segno, con uno schiocco trascritto come parola.
    const valore = Math.max(-1, Math.min(1, onda[i]))
    pezzo[i] = Math.round(valore * 32767)
  }
  return pezzo
}

/**
 * Quanto forte è un fotogramma, da 0 a 1: valore quadratico medio e non picco,
 * come in `data/dictation.ts` (un colpo sulla scrivania fa un picco).
 */
function forza (pezzo: Int16Array): number {
  if (pezzo.length === 0) return 0
  let somma = 0
  for (let i = 0; i < pezzo.length; i += 1) {
    const valore = pezzo[i] / 32768
    somma += valore * valore
  }
  return Math.sqrt(somma / pezzo.length)
}

/** I fotogrammi messi in fila in un vettore solo. */
function unisci (fotogrammi: readonly Int16Array[]): Int16Array {
  let quanti = 0
  for (const fotogramma of fotogrammi) quanti += fotogramma.length
  const tutto = new Int16Array(quanti)
  let dove = 0
  for (const fotogramma of fotogrammi) {
    tutto.set(fotogramma, dove)
    dove += fotogramma.length
  }
  return tutto
}

/**
 * Apre il microfono e comincia a tagliare la voce in pezzi. Se non si apre
 * solleva una frase già leggibile. I pezzi escono da `alPezzo`; `ferma`
 * garantisce solo che l'ultimo pezzo è uscito.
 */
export async function apriMicrofono (ascolto: Ascolto): Promise<Presa> {
  let flusso: MediaStream
  try {
    flusso = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        // Le correzioni del browser accese: si detta in aula, e il guadagno
        // automatico porta sopra la soglia una frase detta a mezzo metro.
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })
  } catch (guasto) {
    throw new Error(perchéNo(guasto), { cause: guasto })
  }

  // La frequenza dichiarata al contesto: il motore audio ricampiona quel che gli
  // si attacca.
  const contesto = new AudioContext({ sampleRate: FREQUENZA })
  const sorgente = contesto.createMediaStreamSource(flusso)
  const nodo = contesto.createScriptProcessor(FOTOGRAMMA, 1, 1)
  // Un nodo che non sfocia da nessuna parte non riceve fotogrammi: un guadagno a
  // zero lo attacca all'uscita senza suono.
  const muto = contesto.createGain()
  muto.gain.value = 0

  /** I fotogrammi del pezzo che si sta formando. */
  let dentro: Int16Array[] = []
  /** I trecento millisecondi appena passati, per quando la voce comincerà. */
  let anteprima: Int16Array[] = []
  /** Se adesso c'è qualcuno che parla. */
  let parla = false
  /** Da quanto non si sente più niente, dentro un pezzo aperto. */
  let zitto = 0
  /** Dopo `ferma` e dopo `annulla` non esce più niente. */
  let chiuso = false
  /** `annulla` butta via anche l'ultimo pezzo: vedi `fermaTutto`. */
  let buttaVia = false

  const anteprimaMassima = Math.ceil(ANTEPRIMA_MS / FOTOGRAMMA_MS)

  /** Chiude il pezzo aperto e lo consegna, se dentro c'era abbastanza voce. */
  const chiudiPezzo = (continua: boolean): void => {
    const fotogrammi = dentro
    dentro = []
    zitto = 0
    // `continua` è il taglio forzato dei dodici secondi: si sta ancora parlando, e
    // il pezzo dopo comincia subito.
    parla = continua
    anteprima = []
    if (buttaVia || fotogrammi.length === 0) return
    const campioni = unisci(fotogrammi)
    if ((campioni.length / FREQUENZA) * 1000 < MINIMO_MS) return
    ascolto.alPezzo(campioni)
  }

  nodo.addEventListener('audioprocess', (evento) => {
    if (chiuso) return
    const pezzo = interi(evento.inputBuffer.getChannelData(0))
    const quanto = forza(pezzo)

    if (!parla) {
      if (quanto < SOGLIA_ENTRA) {
        anteprima.push(pezzo)
        if (anteprima.length > anteprimaMassima) anteprima.shift()
        return
      }
      parla = true
      zitto = 0
      dentro = [...anteprima, pezzo]
      anteprima = []
      return
    }

    dentro.push(pezzo)
    zitto = quanto < SOGLIA_ESCE ? zitto + FOTOGRAMMA_MS : 0
    if (zitto >= PAUSA_MS) {
      chiudiPezzo(false)
      return
    }
    let durata = 0
    for (const fotogramma of dentro) durata += fotogramma.length
    if ((durata / FREQUENZA) * 1000 >= PEZZO_MASSIMO_MS) chiudiPezzo(true)
  })

  sorgente.connect(nodo)
  nodo.connect(muto)
  muto.connect(contesto.destination)
  // Un contesto nato sospeso non tira il nodo: il clic di solito basta, ma non sempre.
  if (contesto.state === 'suspended') await contesto.resume()

  /**
   * Spegne tutto, nell'ordine che non lascia niente acceso: le tracce si fermano
   * sempre, perché la spia del microfono non deve restare accesa davanti a una
   * classe.
   */
  const fermaTutto = async (getta: boolean): Promise<void> => {
    if (chiuso) return
    buttaVia = getta
    // L'ultimo pezzo si chiude prima di staccare: dopo il nodo non manda più niente.
    if (parla) chiudiPezzo(false)
    chiuso = true
    for (const traccia of flusso.getTracks()) traccia.stop()
    sorgente.disconnect()
    nodo.disconnect()
    muto.disconnect()
    // Un `AudioContext` aperto tiene viva la scheda audio.
    try {
      await contesto.close()
    } catch {
      // Già chiuso, o chiuso dal sistema: niente da rimediare.
    }
  }

  const orologio = setTimeout(() => {
    void fermaTutto(false).then(() => ascolto.alTetto())
  }, TETTO_MS)

  return {
    ferma: async () => {
      clearTimeout(orologio)
      await fermaTutto(false)
    },
    annulla: () => {
      clearTimeout(orologio)
      void fermaTutto(true)
    },
  }
}
