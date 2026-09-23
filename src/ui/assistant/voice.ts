// Il microfono: dal momento in cui si preme ai pezzi di voce che whisper sa
// leggere, uno alla volta, mentre si parla.
//
// Tutto quel che riguarda l'audio sta qui, e non in `chat.ts`: quella è la
// conversazione, e la conversazione non deve sapere che cosa sia un
// `AudioContext`. Da fuori si vede una cosa sola — si apre una presa, ogni
// tanto arriva un pezzo di voce, la si ferma — e tutto il resto (il permesso,
// la cattura, il taglio alle pause, lo spegnimento della spia rossa) vive
// dentro queste righe.
//
// ----------------------------------------------------- perché a pezzi, e non uno
//
// Chi detta vuole **vedere le parole mentre le dice**. Una registrazione intera
// mandata alla fine vuol dire parlare venti secondi davanti a un pulsante
// fermo, e poi aspettarne altri dieci: nel mezzo non si sa nemmeno se il
// microfono stia sentendo. whisper.cpp però non ascolta un flusso — `whisper-cli`
// legge un file e basta — quindi il tempo reale lo si costruisce qui: si taglia
// la voce in **pezzi**, e ogni pezzo parte a trascrivere da sé.
//
// Il taglio non è a orologio, è **alle pause**. Un pezzo staccato ogni tre
// secondi cadrebbe a metà di una parola, e mezza parola trascritta è una parola
// sbagliata su tutti e due i lati del taglio. Si guarda invece quanto forte è
// quel che arriva, e si chiude il pezzo quando chi parla si ferma: è il punto
// in cui anche un essere umano metterebbe la virgola.
//
// ------------------------------------------------- perché il ricampionamento qui
//
// whisper.cpp legge **PCM a 16 kHz, un canale, 16 bit** e nient'altro. Il
// microfono dà 48 kHz, e in mezzo ci vuole un ricampionatore.
//
// La pagina ce l'ha già, ed è l'unico posto del registro che l'abbia: un
// `AudioContext` a cui si *dichiara* la frequenza ricampiona quel che gli si
// attacca, e lo fa il motore audio di Chromium, scritto in C++ e già caricato.
// Farlo dall'altra parte vorrebbe dire o scrivere a mano un ricampionatore in
// TypeScript — codice numerico da mantenere per sempre — oppure appoggiarsi a
// `ffmpeg`, cioè a un secondo programma da installare accanto a whisper.
//
// Quel che passa il confine sono quindi **campioni e non un file**: 16 kHz, un
// canale, interi a 16 bit, qualche secondo per volta. Sono numeri, e il canale
// li porta come li porta.
//
// -------------------------------------- perché un `ScriptProcessorNode`, deprecato
//
// Il modo moderno di guardare i campioni uno per uno è l'`AudioWorklet`, e non
// si può usare: un worklet si carica da un indirizzo, e la
// Content-Security-Policy di queste pagine dice `default-src 'none'` con un
// solo script ammesso per nonce (`panels/page.ts`). Farlo entrare vorrebbe
// dire allargare `script-src` a `blob:` o all'origine intera — cioè aprire la
// porta da cui *ogni* script potrebbe entrare — per un nodo che qui fa una
// somma di quadrati su centoventotto millisecondi di suono ogni centoventotto
// millisecondi. Il nodo deprecato costa un filo di lavoro sul thread principale
// e nessuna riga di politica in meno.

/** La frequenza che whisper.cpp vuole, e l'unica che esca da qui. */
export const FREQUENZA = 16000

/**
 * Quanti campioni per giro: 2048 a 16 kHz sono centoventotto millisecondi.
 *
 * È il grano con cui si misura il silenzio, e decide due cose insieme: sotto,
 * il thread principale viene svegliato più spesso del necessario; sopra, la
 * pausa fra due frasi si riconosce con un ritardo che si vede.
 */
const FOTOGRAMMA = 2048

/** Quanto dura un fotogramma, in millisecondi. */
const FOTOGRAMMA_MS = (FOTOGRAMMA / FREQUENZA) * 1000

/**
 * Sopra questa forza c'è qualcuno che parla; sotto quella dopo, non c'è più.
 *
 * Due soglie e non una: con una sola, una frase che si smorza sull'ultima
 * sillaba entra ed esce dal «sta parlando» a ogni fotogramma, e il pezzo si
 * chiuderebbe in mezzo alle parole. Quella per entrare sta più in alto —
 * perché un colpo di tosse non deve aprire un pezzo — e quella per uscire più
 * in basso, che è la stessa soglia con cui `data/dictation.ts` decide se una
 * registrazione è muta.
 */
const SOGLIA_ENTRA = 0.012
const SOGLIA_ESCE = 0.006

/**
 * Quanto silenzio chiude un pezzo.
 *
 * Seicento millisecondi è la pausa che si fa fra una frase e l'altra, e non
 * quella che si fa fra due parole: più corta e si taglierebbe a metà di un
 * elenco detto piano, più lunga e il testo comparirebbe con un ritardo che si
 * nota.
 */
const PAUSA_MS = 600

/** Sotto questa durata non è una frase: è un colpo sulla scrivania. */
const MINIMO_MS = 400

/**
 * Quanto può durare un pezzo, comunque vada.
 *
 * Chi legge a voce alta un elenco può andare avanti mezzo minuto senza una
 * pausa vera, e un pezzo che cresce è un pezzo che non parte: qui si taglia
 * lo stesso. Il taglio cade in mezzo a una parola — non c'è modo che non ci
 * cada — ed è il prezzo di non lasciare chi parla davanti a una casella ferma.
 */
const PEZZO_MASSIMO_MS = 12_000

/**
 * Quanto suono si tiene da parte *prima* che cominci la voce.
 *
 * La soglia scatta sulla prima sillaba, cioè quando quella sillaba è già
 * passata: senza questi trecento millisecondi di anticipo «metti assente
 * Rossi» si trascrive «etti assente Rossi». Sono nove fotogrammi, e si
 * buttano via a ogni pezzo chiuso.
 */
const ANTEPRIMA_MS = 300

/**
 * Il tetto della pagina: dieci minuti.
 *
 * Non è l'impostazione — quella sta nell'host e taglia ogni singolo pezzo
 * (`data/dictation.ts`) — è il muro che impedisce a un microfono dimenticato
 * acceso di restare acceso tutto il pomeriggio. Era di due minuti quando la
 * registrazione cresceva in memoria fino alla fine; adesso che se ne va a
 * pezzi non cresce più niente, e il muro difende la spia rossa e non la
 * memoria.
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
export interface Ascolto {
  /**
   * Un pezzo di voce, tagliato a una pausa e pronto da trascrivere.
   *
   * Arriva **mentre** si parla, e più volte: chi lo riceve li mette in coda e
   * li trascrive in ordine. Non arriva mai per il silenzio.
   */
  alPezzo: (campioni: Int16Array) => void
  /**
   * Si è arrivati al muro dei dieci minuti.
   *
   * La presa si è già chiusa da sé, e chi l'ha aperta deve ridisegnarsi e
   * aspettare che la coda finisca.
   */
  alTetto: () => void
}

/**
 * Perché il microfono non si è aperto, detto in italiano.
 *
 * I nomi che il browser usa — `NotAllowedError`, `NotFoundError` — dicono la
 * stessa cosa a chi li ha scritti e niente a chi ha premuto un pulsante. Le due
 * differenze che contano sono: il permesso lo si può dare, il microfono che non
 * c'è va attaccato.
 */
function perchéNo (guasto: unknown): string {
  const nome = guasto instanceof Error ? guasto.name : ''
  if (nome === 'NotAllowedError' || nome === 'SecurityError') {
    return 'Il microfono non è stato concesso: lo si autorizza nelle impostazioni di Windows, sotto «Privacy e sicurezza», «Microfono».'
  }
  if (nome === 'NotFoundError' || nome === 'OverconstrainedError') {
    return 'Non c’è nessun microfono attaccato a questo computer.'
  }
  if (nome === 'NotReadableError') {
    return 'Il microfono è occupato da un altro programma.'
  }
  return `Il microfono non si è aperto: ${guasto instanceof Error ? guasto.message : String(guasto)}`
}

/**
 * Un fotogramma di suono, dai numeri del motore audio agli interi di whisper.
 *
 * Si copia e non si tiene il riferimento: quel vettore è il buffer del nodo, e
 * il giro dopo ci sta dentro il suono successivo.
 */
function interi (onda: Float32Array): Int16Array {
  const pezzo = new Int16Array(onda.length)
  for (let i = 0; i < onda.length; i += 1) {
    // Tagliato a ±1 prima di moltiplicare: un campione fuori scala — succede
    // con il guadagno automatico — girerebbe di segno, e un giro di segno si
    // sente come uno schiocco e si trascrive come una parola che non c'era.
    const valore = Math.max(-1, Math.min(1, onda[i]))
    pezzo[i] = Math.round(valore * 32767)
  }
  return pezzo
}

/**
 * Quanto forte è un fotogramma, da 0 a 1.
 *
 * Il valore quadratico medio e non il picco, per la stessa ragione per cui lo
 * è in `data/dictation.ts`: un colpo sulla scrivania fa un picco e non è voce.
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
 * Apre il microfono e comincia a tagliare la voce in pezzi.
 *
 * Solleva con una frase già leggibile se il microfono non si apre: chi chiama
 * la mette sotto la casella e non deve tradurre niente.
 *
 * Da qui in poi non torna più niente per valore: i pezzi escono da `alPezzo`
 * mentre si parla, e `ferma` non consegna una registrazione — consegna
 * soltanto la certezza che l'ultimo pezzo è uscito.
 */
export async function apriMicrofono (ascolto: Ascolto): Promise<Presa> {
  let flusso: MediaStream
  try {
    flusso = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        // Le tre correzioni del browser, accese: chi detta sta in un'aula o in
        // una sala docenti, non in uno studio. Il guadagno automatico è quello
        // che conta di più — una frase detta a mezzo metro dal portatile arriva
        // altrimenti sotto la soglia del silenzio.
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })
  } catch (guasto) {
    throw new Error(perchéNo(guasto), { cause: guasto })
  }

  // La frequenza si **dichiara** al contesto: quel che gli si attacca viene
  // ricampionato dal motore audio, e da qui in avanti non esistono più i 48 kHz
  // del microfono. È il ricampionamento di cui parla la nota in testa al file.
  const contesto = new AudioContext({ sampleRate: FREQUENZA })
  const sorgente = contesto.createMediaStreamSource(flusso)
  const nodo = contesto.createScriptProcessor(FOTOGRAMMA, 1, 1)
  // Un nodo che non sfocia da nessuna parte non viene tirato, e non riceve
  // fotogrammi: il guadagno a zero lo attacca all'uscita senza che si senta
  // niente in cassa. È il modo con cui si è sempre fatto, e l'alternativa
  // sarebbe il worklet che la politica non lascia entrare.
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
    // `continua` è il taglio forzato dei dodici secondi: chi parla sta ancora
    // parlando, e il pezzo dopo comincia dal fotogramma successivo senza
    // aspettare una soglia che non scatterà.
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
  // Un contesto nato sospeso non tira il nodo, e il nodo non riceve niente: il
  // clic sul microfono è già un gesto e quasi sempre basta, ma il «quasi» qui
  // vorrebbe dire un microfono acceso che non sente niente e non lo dice.
  if (contesto.state === 'suspended') await contesto.resume()

  /**
   * Spegne tutto, nell'ordine che non lascia niente acceso.
   *
   * Le tracce si fermano sempre, in ogni uscita da questo file. Un microfono
   * che resta aperto dopo che si è smesso di parlare è la cosa peggiore che
   * questa funzionalità possa fare — e in un programma che ha davanti una
   * classe è anche la più visibile, perché la spia del portatile resta accesa.
   */
  const fermaTutto = async (getta: boolean): Promise<void> => {
    if (chiuso) return
    buttaVia = getta
    // L'ultimo pezzo si chiude **prima** di staccare: dopo, il nodo non manda
    // più fotogrammi e quel che si stava dicendo resterebbe nel vettore.
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
      // Già chiuso, o chiuso dal sistema: non c'è niente da rimediare e niente
      // da dire a chi ha premuto il microfono.
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
