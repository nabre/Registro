// llama.cpp dentro il processo: il motore dell'assistente per `llm.ts` (pesi,
// conversazione, attrezzi). Impostazioni e frasi stanno in `llm.ts`.
//
// I pesi restano caricati finché non cambia il modello, e il contesto resta
// caldo accanto (vedi `Caldo`) perché rileggere istruzioni e catalogo costa
// decine di secondi. Gli attrezzi sono funzioni che la libreria chiama da sé;
// che cosa eseguono lo decide chi chiama, in `Giro.esegui`. Temperatura zero,
// e `repeatPenalty` e budget dei pensieri dichiarati: i predefiniti rovinano
// il JSON delle chiamate.

import type {
  Attrezzo,
  Collegamento,
  Giro,
  Motore,
} from './llm.js'
import {
  llama,
  modulo,
  type ChatHistoryItem,
  type LlamaChatSession,
  type LlamaModel,
} from './nodeLlama.js'
import { testi } from './llm.testi.js'

/**
 * Quanto contesto si apre: non il massimo del modello (128k costano gigabyte),
 * ma abbastanza per istruzioni e catalogo (~8560 token con Qwen2.5), contesto
 * della pagina, due o tre risultati e la risposta. Se il modello ne dichiara
 * di meno, vince lui.
 */
const CONTESTO = 16384

/**
 * Sotto quanti token non vale la pena cominciare. `contextSize.max` è una
 * trattativa: la libreria scende in silenzio fino a quel che la memoria
 * concede, e sotto questa soglia il catalogo non entra. Meglio dirlo subito.
 */
const CONTESTO_MINIMO = 12288

/**
 * Quante volte il modello può chiedere un attrezzo in un giro: un modello
 * piccolo riprova all'infinito, e dieci bastano a qualunque domanda vera.
 */
const CHIAMATE_MASSIME = 10

/**
 * Quante chiamate si rifiutano *dopo* il tetto prima di togliere gli attrezzi
 * (vedi `chiusura`): il rifiuto è solo una frase, ma se il modello la ascolta
 * conclude da sé e risponde meglio.
 */
const RIFIUTI_MASSIMI = 3

/**
 * La domanda finale, senza attrezzi: senza `functions` la griglia non ammette
 * chiamate. Quel che ha letto resta nella storia, e gli si chiede di concludere.
 */
function chiusura (): string {
  return testi().chiusura
}

/**
 * I tetti ai token per pensieri e commenti. Il predefinito concede ai pensieri
 * il 75% del contesto, e un modello che ragiona se lo mangerebbe prima della
 * prima chiamata; per leggere e riferire il pensiero lungo non serve.
 */
const PENSIERO_MASSIMO = 512
const COMMENTO_MASSIMO = 256

/**
 * Quanto resta caldo un contesto inutilizzato. Costa 600–900 MB che servono
 * anche ad altri; cinque minuti coprono le domande che arrivano di seguito.
 */
const RIPOSO_MS = 5 * 60_000

/**
 * Il `pattern` con cui `api/schemas.ts` scrive una data, l'unico del catalogo:
 * `perGriglia` lo traduce in `format: 'date'`, che la griglia sa scrivere.
 */
const DATA_ISO = '^\\d{4}-\\d{2}-\\d{2}$'

// --------------------------------------------------------- i pesi, una volta

/**
 * Dei pesi in memoria: file, strati e quante domande li usano adesso. Le
 * domande saltano la coda delle scritture, quindi si smaltisce solo a zero
 * utenti (vedi `smaltisci`). `strati` è com'è caricato, non che abbia
 * funzionato: quello lo dice `ultimoBuono`.
 */
interface Pesi {
  file: string
  modello: LlamaModel
  strati: Strati
  /** Quante domande li stanno usando adesso. Vedi `presta` e `molla`. */
  utenti: number
  /** Chi aspetta che l'ultimo molli per portarli via. Vedi `smaltisci`. */
  congedo: (() => void) | null
  /** Il contesto rimasto aperto dall'ultima domanda, o `null`. Vedi `Caldo`. */
  caldo: Caldo | null
}

/** La sequenza di un contesto: è lì dentro che sta quel che il modello ha già letto. */
type Sequenza = ReturnType<Contesto['getSequence']>

/**
 * Il contesto dell'ultima domanda, tenuto aperto per la prossima: la libreria
 * rielabora solo dal primo token diverso, e istruzioni e catalogo non si
 * rileggono. Il riuso sta nella sequenza, presa una volta sola (una per
 * contesto) e tenuta qui perché non finisca al raccoglitore. Non conta fra gli
 * `utenti`, altrimenti `smaltisci` aspetterebbe per sempre: lo spegne `spegniCaldo`.
 */
interface Caldo {
  contesto: Contesto
  sequenza: Sequenza
  /** Il timer del riposo, fermo mentre una domanda lo usa. Vedi `RIPOSO_MS`. */
  sonno: ReturnType<typeof setTimeout> | null
}

/** I pesi in memoria adesso, o `null` se nessuno. */
let caricato: Pesi | null = null

/**
 * L'ultimo gradino da cui si è davvero aperto un contesto, e per quale file.
 * Si scrive solo dopo un `apri()` riuscito, diversamente da `caricato.strati`;
 * quando è vuoto si riparte dall'alto, così la GPU liberata torna a servire.
 */
let ultimoBuono: { file: string, strati: Strati } | null = null

/**
 * Quanti strati del modello vanno sulla scheda video: `'quel che ci sta'` lo
 * decide la libreria, un numero è un ordine, `0` è tutto sul processore.
 */
type Strati = 'quel che ci sta' | number

/**
 * I caricamenti in volo, condivisi, uno per `(file, strati)`: due giri
 * concorrenti altrimenti caricherebbero due volte e la seconda copia
 * renderebbe irraggiungibile la prima.
 */
const inVolo = new Map<string, Promise<Pesi>>()

/** Un altro che li sta usando: fino a che non molla, non si smaltiscono. */
function presta (quali: Pesi): Pesi {
  quali.utenti += 1
  return quali
}

/** Finita: se era l'ultimo e qualcuno aspettava per portarli via, si fa avanti. */
function molla (quali: Pesi): void {
  quali.utenti -= 1
  if (quali.utenti > 0 || !quali.congedo) return
  const aspetta = quali.congedo
  quali.congedo = null
  aspetta()
}

/**
 * Porta via dei pesi, aspettando che l'ultima domanda che li usa abbia finito.
 * Aspetta invece di rifiutare; l'attesa è limitata dalla scadenza delle domande.
 */
async function smaltisci (quali: Pesi): Promise<void> {
  if (quali.utenti > 0) {
    await new Promise<void>((liberi) => {
      quali.congedo = liberi
    })
  }
  // Il contesto prima dei pesi, esplicitamente.
  await spegniCaldo(quali)
  await quali.modello.dispose().catch(() => {
    // Non deve far fallire niente: al peggio la memoria si libera più tardi.
  })
}

/**
 * Chiude il contesto caldo di quei pesi, se c'è. Campo e timer si svuotano
 * prima del primo `await`, perché nessuna domanda ci apra sopra una sessione.
 */
async function spegniCaldo (quali: Pesi): Promise<void> {
  const caldo = quali.caldo
  if (!caldo) return
  quali.caldo = null
  if (caldo.sonno) clearTimeout(caldo.sonno)
  caldo.sonno = null
  await caldo.contesto.dispose().catch(() => {
    // Come per i pesi: al peggio la memoria si libera più tardi.
  })
}

/**
 * Mette a riposo il contesto caldo: se ne va fra `RIPOSO_MS`, se nessuno l'ha
 * ripreso. Allo scatto ricontrolla che sia ancora quel caldo e che i pesi non
 * abbiano utenti (una domanda appena arrivata può non aver fermato il timer).
 */
function addormenta (quali: Pesi, caldo: Caldo): void {
  if (caldo.sonno) clearTimeout(caldo.sonno)
  caldo.sonno = setTimeout(() => {
    caldo.sonno = null
    if (quali.caldo !== caldo || quali.utenti > 0) return
    void spegniCaldo(quali)
  }, RIPOSO_MS)
  // Il timer non tiene vivo il processo (né le prove né la chiusura).
  caldo.sonno.unref?.()
}

/**
 * I pesi di quel file con quegli strati, caricandoli se serve. Il file è già
 * risolto da `llm.ts` nella cartella dei modelli. Tornano in prestito: chi li
 * prende li deve mollare.
 */
async function pesi (file: string, strati: Strati, segnale: AbortSignal): Promise<Pesi> {
  // Già caricati e giusti, purché nessuno li stia portando via (`congedo`).
  if (caricato?.file === file && caricato.strati === strati && !caricato.congedo) {
    return presta(caricato)
  }
  const chiave = `${String(strati)}\u0000${file}`
  let corsa = inVolo.get(chiave)
  if (!corsa) {
    corsa = carica(file, strati, segnale).finally(() => {
      inVolo.delete(chiave)
    })
    inVolo.set(chiave, corsa)
  }
  // Prestito dopo l'attesa e non in `carica`: anche chi si accoda è un utente.
  return presta(await corsa)
}

/** Il caricamento vero, fuori dalla promessa condivisa. */
async function carica (file: string, strati: Strati, segnale: AbortSignal): Promise<Pesi> {
  if (caricato) {
    // Il vecchio se ne va prima: due modelli in memoria non ci stanno. Vale
    // anche a file uguale e strati diversi, per liberare la memoria video.
    const vecchio = caricato
    caricato = null
    await smaltisci(vecchio)
  }
  const motore = await llama()
  const modello = await motore.loadModel({
    modelPath: file,
    gpuLayers: strati === 'quel che ci sta' ? { fitContext: { contextSize: CONTESTO } } : strati,
    // Il caricamento dura secondi e `apparecchia` può ripeterlo: dev'essere interrompibile.
    loadSignal: segnale,
  })
  caricato = { file, modello, strati, utenti: 0, congedo: null, caldo: null }
  return caricato
}

/**
 * Pesi e contesto, scendendo di gradino (metà degli strati, poi nessuno) finché
 * il contesto non entra: `fitContext` conta la memoria video al caricamento,
 * ma un altro programma può prenderla subito dopo. Si perde velocità, mai
 * contesto. Se non basta nemmeno il processore, lo dice `apri`.
 */
async function apparecchia (
  file: string,
  segnale: AbortSignal,
): Promise<{ presi: Pesi, caldo: Caldo }> {
  // Si parte dall'ultimo gradino che ha aperto un contesto: vedi `ultimoBuono`.
  // testo-fisso: il gradino «tutto quel che ci sta», un valore di `Strati` e non una frase
  let strati: Strati = ultimoBuono?.file === file ? ultimoBuono.strati : 'quel che ci sta'
  for (;;) {
    const presi = await pesi(file, strati, segnale)
    // Contesto caldo su questi pesi: si riprende com'è, il gradino è già deciso.
    const rimasto = presi.caldo
    if (rimasto && !rimasto.contesto.disposed) {
      if (rimasto.sonno) clearTimeout(rimasto.sonno)
      rimasto.sonno = null
      return { presi, caldo: rimasto }
    }
    // Smaltito dalla libreria: si butta e se ne apre uno nuovo.
    if (rimasto) await spegniCaldo(presi)
    try {
      const contesto = await apri(presi.modello, segnale)
      ultimoBuono = { file, strati }
      // La sequenza si prende qui e una volta sola: vedi `Caldo`.
      const caldo: Caldo = { contesto, sequenza: contesto.getSequence(), sonno: null }
      presi.caldo = caldo
      console.log(
        `[llama.cpp] contesto aperto: ${contesto.contextSize} token dei ${CONTESTO} chiesti, ` +
        `${strati === 'quel che ci sta' ? 'strati sulla scheda decisi dalla libreria' : `${strati} strati sulla scheda`}.`,
      )
      // Il prestito lo chiude chi ha chiesto: vedi il `finally` di `chatta`.
      return { presi, caldo }
    } catch (guasto) {
      // Mollati, così il gradino sotto li può ricaricare.
      molla(presi)
      // Annullo o scadenza: si smette, non si scende di gradino.
      if (segnale.aborted) throw guasto
      const sotto = piùGiù(strati, presi.modello.gpuLayers)
      if (sotto === null) throw guasto
      strati = sotto
    }
  }
}

/**
 * Il gradino sotto, o `null` se si è in fondo. Si dimezza perché ogni gradino
 * costa un caricamento dei pesi.
 */
function piùGiù (strati: Strati, quantiNeAveva: number): Strati | null {
  const ora = strati === 'quel che ci sta' ? quantiNeAveva : strati
  if (ora <= 0) return null
  return Math.floor(ora / 2)
}

/**
 * Scarica quel che è in memoria. La chiama chi cancella un modello: su Windows
 * un `.gguf` caricato è un file aperto e non si cancella.
 */
export async function scaricaPesi (): Promise<void> {
  // Prima i caricamenti in volo, altrimenti il file si aprirebbe subito dopo.
  await Promise.allSettled([...inVolo.values()])
  if (!caricato) return
  const vecchio = caricato
  caricato = null
  // Anche il gradino buono: valeva per i pesi che se ne vanno.
  if (ultimoBuono?.file === vecchio.file) ultimoBuono = null
  // Aspetta le domande ancora vive: vedi `smaltisci`.
  await smaltisci(vecchio)
}

/** Se quel file è in memoria o ci sta arrivando: lo chiede chi lo vuole cancellare. */
export function pesiInUso (file: string): boolean {
  if (caricato?.file === file) return true
  // La chiave di `inVolo` è `strati\0file`: basta la coda.
  return [...inVolo.keys()].some((chiave) => chiave.endsWith(`\u0000${file}`))
}

// ------------------------------------------------------- lo schema per la griglia

/**
 * La `description` del campo con in coda gli `examples`, che la griglia non
 * conosce. Solo esempi numerici o testuali; niente esempi per le date, che col
 * `format` la griglia già annuncia e impone.
 */
function spiegazione (dentro: Record<string, unknown>): { description?: string } {
  const detto = typeof dentro.description === 'string' ? dentro.description : ''
  // Si guarda il `pattern`: lo schema qui è ancora quello prima della traduzione.
  if (dentro.pattern === DATA_ISO) return detto === '' ? {} : { description: detto }
  const esempi = Array.isArray(dentro.examples)
    ? (dentro.examples as unknown[])
        .filter((e) => typeof e === 'string' || typeof e === 'number')
        .map((e) => String(e))
    : []
  if (esempi.length === 0) return detto === '' ? {} : { description: detto }
  const coda = testi().esempi(esempi.join(', '))
  return { description: detto === '' ? coda : `${detto} ${coda}` }
}

/**
 * Le misure minima e massima di un campo (stringa o elenco), se sono numeri;
 * quelle storte si lasciano fuori invece di far rifiutare lo schema.
 */
function quanti (
  dentro: Record<string, unknown>,
  minimo: string,
  massimo: string,
): Record<string, number> {
  const misure: Record<string, number> = {}
  for (const chiave of [minimo, massimo]) {
    const quanto = dentro[chiave]
    if (typeof quanto !== 'number' || !Number.isFinite(quanto)) continue
    // `minLength: 1` si omette: il «non vuoto» lo garantiscono già
    // `senzaFiltriVuoti` e il nucleo, e costerebbe contesto. `minItems: 1`
    // invece resta: un elenco vuoto il modello lo genera volentieri.
    if (chiave === minimo && minimo === 'minLength' && quanto <= 1) continue
    misure[chiave] = quanto
  }
  return misure
}

/**
 * Lo schema di un attrezzo tradotto nel sottoinsieme di JSON Schema che la
 * griglia (la grammatica di `node-llama-cpp`) accetta: quel che ha una
 * traduzione si traduce, il resto sparisce. Esportata per la prova.
 */
export function perGriglia (schema: unknown): Record<string, unknown> {
  if (typeof schema !== 'object' || schema === null || Array.isArray(schema)) {
    return { type: 'string' }
  }
  const dentro = schema as Record<string, unknown>
  const nota = spiegazione(dentro)

  if (Array.isArray(dentro.enum)) return { ...nota, enum: dentro.enum as unknown[] }

  // Il nullabile `type: ["string", "null"]` diventa un `oneOf`.
  if (Array.isArray(dentro.type)) {
    return {
      ...nota,
      oneOf: (dentro.type as string[]).map((tipo) => perGriglia({ ...dentro, type: tipo })),
    }
  }

  switch (dentro.type) {
    case 'object': {
      const proprietà = (dentro.properties ?? {}) as Record<string, unknown>
      const obbligatori = Array.isArray(dentro.required) ? (dentro.required as string[]) : []
      const tradotte: Record<string, unknown> = {}
      for (const [nome, forma] of Object.entries(proprietà)) {
        const tradotta = perGriglia(forma)
        // Il facoltativo diventa «oppure null»: la griglia esige tutte le
        // proprietà dichiarate. La `description` va solo sull'incarto `oneOf`,
        // l'unico posto in cui la libreria la legge.
        const { description: frase, ...ramo } = tradotta
        const sua = typeof frase === 'string' ? { description: frase } : {}
        tradotte[nome] = obbligatori.includes(nome)
          ? tradotta
          : { ...sua, oneOf: [{ type: 'null' }, ramo] }
      }
      return { ...nota, type: 'object', properties: tradotte }
    }
    case 'array':
      return {
        ...nota,
        type: 'array',
        items: perGriglia(dentro.items),
        ...quanti(dentro, 'minItems', 'maxItems'),
      }
    case 'string':
      // Una data diventa `format: 'date'`. Per la libreria una stringa ha un
      // `format` oppure delle lunghezze, mai entrambi.
      if (dentro.pattern === DATA_ISO) return { ...nota, type: 'string', format: 'date' }
      return { ...nota, type: 'string', ...quanti(dentro, 'minLength', 'maxLength') }
    case 'number':
    case 'integer':
    case 'boolean':
    case 'null':
      return { ...nota, type: dentro.type }
    default:
      // Forma senza `type` (`qualunque`): la griglia vuole un tipo, si offre testo.
      return { ...nota, type: 'string' }
  }
}

// ----------------------------------------------------------------- il giro

/** L'ultima cosa che ha detto chi scrive, e tutto quel che c'era prima. */
function dividi (battute: readonly { ruolo: string, testo: string }[]): {
  istruzioni: string
  precedenti: { ruolo: string, testo: string }[]
  domanda: string
} {
  const istruzioni = battute.filter((b) => b.ruolo === 'sistema').map((b) => b.testo).join('\n\n')
  const conversazione = battute.filter((b) => b.ruolo !== 'sistema')
  const ultima = conversazione.at(-1)
  return {
    istruzioni,
    precedenti: ultima?.ruolo === 'utente' ? conversazione.slice(0, -1) : conversazione,
    domanda: ultima?.ruolo === 'utente' ? ultima.testo : '',
  }
}

/**
 * Una domanda al modello, con lo stesso campionamento per la domanda vera e per
 * la chiusura. `promptWithMeta` dice anche perché si è fermata;
 * `stopOnAbortSignal` fa tornare quel che c'era invece di far saltare tutto.
 */
async function chiedi (
  sessione: LlamaChatSession,
  testo: string,
  segnale: AbortSignal,
  attrezzi: Record<string, unknown> | undefined,
  scrive: () => void,
): Promise<{ responseText: string, stopReason: string }> {
  return sessione.promptWithMeta(testo, {
    ...(attrezzi ? { functions: attrezzi as never } : {}),
    // Solo per la misura (`cronometro`). Non `onToken`, che ignora gli argomenti
    // delle chiamate: quasi ogni domanda comincia chiamando un attrezzo.
    onResponseChunk: scrive,
    onFunctionCallParamsChunk: scrive,
    temperature: 0,
    // Il predefinito penalizza i token ripetuti, cioè nomi di campi e cifre
    // degli id dentro le chiamate: spento.
    repeatPenalty: false,
    budgets: { thoughtTokens: PENSIERO_MASSIMO, commentTokens: COMMENTO_MASSIMO },
    signal: segnale,
    stopOnAbortSignal: true,
  })
}

/**
 * La frase per un'attesa scaduta, al posto della `DOMException` inglese di
 * `AbortSignal.timeout()`. Dice dove è andato il tempo (in coda, nel
 * caricamento, nella risposta), perché il rimedio cambia.
 */
function scaduta (
  collegamento: Collegamento,
  prontoDopoMs: number | null,
  inCoda: boolean,
): Error {
  const secondi = Math.round(collegamento.attesaMs / 1000)
  const t = testi()
  const modelloPiùPiccolo = t.piuPiccolo

  // Scaduta in coda dietro un'altra domanda (vedi `inFila`): il modello non c'entra.
  if (inCoda) {
    return new Error(t.inCoda(secondi))
  }

  if (prontoDopoMs === null) {
    return new Error(t.nonCaricato(secondi, modelloPiùPiccolo))
  }

  // Un caricamento lento (ha un'attesa sua) indica pesi troppo grandi per la
  // macchina, e quindi anche una generazione lenta.
  const caricamento = Math.round(prontoDopoMs / 1000)
  if (prontoDopoMs * 2 > collegamento.attesaMs) {
    return new Error(t.caricamentoLento(caricamento, secondi, modelloPiùPiccolo))
  }

  return new Error(t.scaduta(secondi))
}

/**
 * Quante chiamate restano, quante ne ha chieste in più, e il freno. Condiviso
 * fra i manici degli attrezzi e `chatta`, che decide se chiudere senza attrezzi.
 */
interface Budget {
  rimaste: number
  rifiuti: number
  freno: AbortController
}

/**
 * Le funzioni che il modello può chiamare, con un budget per tutto il giro.
 * Oltre il tetto si risponde che gli attrezzi sono finiti; dopo
 * `RIFIUTI_MASSIMI` rifiuti si tira il freno (vedi `chiusura`).
 */
async function funzioni (
  attrezzi: readonly Attrezzo[],
  giro: Giro,
  budget: Budget,
): Promise<Record<string, unknown>> {
  const { defineChatSessionFunction } = await modulo()
  const tavolo: Record<string, unknown> = {}

  for (const attrezzo of attrezzi) {
    tavolo[attrezzo.nome] = defineChatSessionFunction({
      description: attrezzo.descrizione,
      params: perGriglia(attrezzo.ingresso) as never,
      handler: async (argomenti: unknown) => {
        if (budget.rimaste <= 0) {
          budget.rifiuti += 1
          if (budget.rifiuti >= RIFIUTI_MASSIMI) budget.freno.abort()
          // Anche il rifiuto si mostra: la risposta avrà meno letture del chiesto.
          giro.al?.({ attrezzo: attrezzo.nome, esaurito: true })
          return testi().esauriti
        }
        budget.rimaste -= 1
        giro.al?.({ attrezzo: attrezzo.nome })
        if (!giro.esegui) return testi().senzaEsecutore
        try {
          return await giro.esegui({ nome: attrezzo.nome, argomenti })
        } catch (guasto) {
          // `Giro.esegui` non dovrebbe sollevare, ma può: se il manico rifiuta,
          // la libreria annulla l'intera domanda. Raccontato al modello, invece,
          // l'errore è una cosa da cui può uscire.
          return testi().errore(guasto instanceof Error ? guasto.message : String(guasto))
        }
      },
    })
  }
  return tavolo
}

// ------------------------------------------------------ una domanda per volta

/**
 * La coda delle domande a questo motore: la fine dell'ultima entrata. Una per
 * volta perché due sessioni sulla stessa sequenza si corrompono, un secondo
 * contesto non entra nella memoria contata da `fitContext`, e in parallelo
 * non si risponde più in fretta.
 */
let coda: Promise<void> = Promise.resolve()

/**
 * Il proprio turno nella coda, o un annullo se il segnale scatta prima. Torna
 * la funzione che passa il turno, da chiamare sempre (`finally` di `chatta`).
 * Chi rinuncia lo passa solo quando chi era davanti ha finito.
 */
async function inFila (segnale: AbortSignal): Promise<() => void> {
  const davanti = coda
  let passa = (): void => {}
  coda = new Promise<void>((avanti) => {
    passa = avanti
  })
  try {
    await finché(davanti, segnale)
  } catch (guasto) {
    void davanti.then(passa)
    throw guasto
  }
  return passa
}

/** Una promessa che si può smettere di aspettare. Quella di sotto continua. */
async function finché (promessa: Promise<void>, segnale: AbortSignal): Promise<void> {
  segnale.throwIfAborted()
  await new Promise<void>((fatto, fallito) => {
    const smetti = (): void => {
      // `chatta` guarda i segnali, non questo motivo.
      const motivo: unknown = segnale.reason
      fallito(motivo instanceof Error ? motivo : new Error(String(motivo)))
    }
    segnale.addEventListener('abort', smetti, { once: true })
    void promessa.then(() => {
      segnale.removeEventListener('abort', smetti)
      fatto()
    })
  })
}

// ------------------------------------------------------------------ la misura

/**
 * Quanto è costata una domanda, in console: token rielaborati e generati (da
 * `tokenMeter`), riusati (stima: prefisso comune della sequenza prima e dopo)
 * e attesa della prima parola. Rende visibile l'effetto del contesto caldo.
 */
function cronometro (sequenza: Sequenza): { scrive: () => void, racconta: () => void } {
  const inizio = Date.now()
  const contatore = sequenza.tokenMeter.getState()
  const prima = sequenza.contextTokens
  let primoDopoMs: number | null = null
  return {
    scrive: () => {
      primoDopoMs ??= Date.now() - inizio
    },
    racconta: () => {
      try {
        const { usedInputTokens, usedOutputTokens } = sequenza.tokenMeter.diff(contatore)
        const dopo = sequenza.contextTokens
        let riusati = 0
        const quanti = Math.min(prima.length, dopo.length)
        while (riusati < quanti && prima[riusati] === dopo[riusati]) riusati += 1
        const primo = primoDopoMs === null
          // testo-fisso: il giornale per chi sviluppa, come la riga qui sotto
          ? 'nessun token scritto'
          // testo-fisso: il giornale per chi sviluppa
          : `primo token dopo ${primoDopoMs} ms`
        console.log(
          `[llama.cpp] domanda: ${usedInputTokens} token rielaborati, ${riusati} riusati, ` +
          `${usedOutputTokens} generati; ${primo}, in tutto ${Date.now() - inizio} ms.`,
        )
      } catch {
        // Una misura non fa fallire una domanda.
      }
    },
  }
}

// ---------------------------------------------------------------- il contesto

/** Quel che `createContext` torna: la libreria non ne esporta il nome da qui. */
type Contesto = Awaited<ReturnType<LlamaModel['createContext']>>

/**
 * Il contesto della conversazione, o un guasto che dice che la macchina non
 * basta. `min` impedisce alla libreria di scendere in silenzio sotto il
 * catalogo; il pavimento si abbassa al contesto dichiarato dal modello.
 * `apparecchia` riprova più in basso: la frase si legge solo all'ultimo gradino.
 */
async function apri (modello: LlamaModel, segnale: AbortSignal): Promise<Contesto> {
  const pavimento = Math.min(CONTESTO_MINIMO, modello.trainContextSize)
  try {
    return await modello.createContext({
      contextSize: { min: pavimento, max: CONTESTO },
      // Anche l'apertura del contesto è tempo: interrompibile.
      createSignal: segnale,
    })
  } catch (guasto) {
    throw new Error(testi().memoria(pavimento), { cause: guasto })
  }
}

// ------------------------------------------------- quando il contesto si riempie

/**
 * Il testo al posto di un risultato tolto: dice al modello che c'era e che si
 * può richiedere, invece di fargli credere di non aver trovato niente.
 */
function segnaposto (nome: string): string {
  return testi().tolto(nome)
}

/**
 * La storia accorciata senza buttare le letture: la strategia predefinita
 * butta per prime le chiamate d'attrezzo e tiene le istruzioni. Qui si tolgono
 * i pensieri chiusi, poi, dai più vecchi, i risultati diventano segnaposti
 * (la chiamata resta). Il catalogo non viene passato alla strategia, quindi il
 * suo peso si stima come tetto meno misura, con un 5% di margine; se il conto
 * sbaglia, la libreria ripiega sulla sua strategia.
 */
function sfoltisci (
  storia: readonly ChatHistoryItem[],
  tetto: number,
  misura: (storia: ChatHistoryItem[]) => number,
): ChatHistoryItem[] {
  // Copia fino alle risposte: la storia che arriva è quella viva della libreria.
  const copia: ChatHistoryItem[] = storia.map((voce) =>
    voce.type === 'model' ? { ...voce, response: [...voce.response] } : voce)

  const catalogo = Math.max(0, tetto - misura(copia))
  const bersaglio = Math.max(1, tetto - catalogo - Math.ceil(tetto / 20))

  for (const voce of copia) {
    if (voce.type !== 'model') continue
    const senzaPensieri = voce.response.filter(
      (pezzo) => typeof pezzo === 'string' || pezzo.type !== 'segment' || !pezzo.ended,
    )
    if (senzaPensieri.length !== voce.response.length) voce.response = senzaPensieri
  }

  // Si rimisura solo dopo una sostituzione: `misura` ritokenizza tutta la storia.
  let quanto = misura(copia)
  for (const voce of copia) {
    if (voce.type !== 'model') continue
    for (let i = 0; i < voce.response.length; i += 1) {
      if (quanto <= bersaglio) return copia
      const pezzo = voce.response[i]
      if (typeof pezzo === 'string' || pezzo.type !== 'functionCall') continue
      voce.response[i] = { ...pezzo, result: segnaposto(pezzo.name) }
      quanto = misura(copia)
    }
  }
  return copia
}

// --------------------------------------------------------------- il motore

export const LLAMA_CPP: Motore = {
  nome: 'llama.cpp',

  // `node-llama-cpp` non accetta immagini: per le scansioni c'è `mtmd.ts`.
  vede: false,

  // Niente da procurarsi: la libreria è nel programma, il modello l'ha già controllato `llm.ts`.
  impedimento: () => '',

  chatta: async (collegamento, giro) => {
    const { LlamaChatSession } = await modulo()
    const { istruzioni, precedenti, domanda } = dividi(giro.battute)
    if (domanda === '') {
      // L'ultima battuta dev'essere dell'utente: a una domanda vuota il modello
      // risponderebbe comunque qualcosa.
      throw new Error(testi().nienteDaChiedere)
    }

    // Due attese: una per il caricamento (coda compresa) e una per la risposta,
    // che parte a pesi pronti. Così il disco lento non ruba tempo alla risposta
    // e tutte e due restano limitate e interrompibili.
    const caricamento = AbortSignal.timeout(collegamento.attesaMs)
    const perCaricare = collegamento.segnale
      ? AbortSignal.any([collegamento.segnale, caricamento])
      : caricamento
    // Il freno del tetto delle chiamate, distinto dall'attesa: vedi `funzioni`.
    const freno = new AbortController()

    // Quando i pesi sono stati pronti; `null` se mai. Vedi `scaduta`.
    const acceso = Date.now()
    let prontoDopoMs: number | null = null
    // Finché i pesi non sono pronti vale la scadenza del caricamento.
    let scadenza: AbortSignal = caricamento
    let attesa: AbortSignal = perCaricare
    // Finché è vero, un'attesa scaduta è stata un'attesa in coda.
    let inCoda = true
    let passa: (() => void) | null = null

    try {
      // Il turno si aspetta dentro l'attesa del caricamento, interrompibile.
      passa = await inFila(perCaricare)
      inCoda = false
      // Pesi e contesto insieme: gli strati sulla scheda dipendono dal contesto.
      const { presi, caldo } = await apparecchia(collegamento.modello, perCaricare)
      prontoDopoMs = Date.now() - acceso
      scadenza = AbortSignal.timeout(collegamento.attesaMs)
      attesa = collegamento.segnale
        ? AbortSignal.any([collegamento.segnale, scadenza])
        : scadenza
      const misura = cronometro(caldo.sequenza)
      let sessione: LlamaChatSession | null = null
      // Un'eccezione vera della libreria (non annullo, scadenza o freno): la
      // sequenza non è più affidabile e il contesto si butta nel `finally`.
      let rotto = false
      try {
        sessione = new LlamaChatSession({
          contextSequence: caldo.sequenza,
          // Sfoltimento nostro, che tiene le letture: vedi `sfoltisci`.
          contextShift: {
            strategy: ({ chatHistory, maxTokensCount, tokenizer, chatWrapper }) => ({
              chatHistory: sfoltisci(
                chatHistory,
                maxTokensCount,
                (quale) => chatWrapper
                  .generateContextState({ chatHistory: quale })
                  .contextText.tokenize(tokenizer).length,
              ),
            }),
          },
        })

        // Istruzioni e conversazione precedente entrano sempre come storia, non
        // come `systemPrompt`: con griglie senza battuta di sistema (Gemma) la
        // libreria butterebbe il `systemPrompt` in silenzio. Una strada sola
        // tiene anche uguale il prefisso fra una domanda e l'altra (contesto caldo).
        sessione.setChatHistory([
          ...(istruzioni ? [{ type: 'system' as const, text: istruzioni }] : []),
          ...precedenti.map((battuta) =>
            battuta.ruolo === 'utente'
              ? { type: 'user' as const, text: battuta.testo }
              : { type: 'model' as const, response: [battuta.testo] },
          ),
        ])

        const attrezzi = giro.attrezzi ?? []
        const budget: Budget = { rimaste: CHIAMATE_MASSIME, rifiuti: 0, freno }
        let detto = await chiedi(
          sessione,
          domanda,
          AbortSignal.any([attesa, freno.signal]),
          attrezzi.length > 0 ? await funzioni(attrezzi, giro, budget) : undefined,
          misura.scrive,
        )

        // Freno scattato: si chiude con una domanda senza `functions`, che la
        // griglia non lascia più rispondere con una chiamata.
        if (freno.signal.aborted && !attesa.aborted) {
          console.log(
            `[llama.cpp] ${budget.rifiuti} chiamate d’attrezzo oltre il tetto di ` +
            `${CHIAMATE_MASSIME}: chiudo la domanda senza attrezzi.`,
          )
          detto = await chiedi(sessione, chiusura(), attesa, undefined, misura.scrive)
        }

        // Annullo e scadenza si guardano sui segnali: con `stopOnAbortSignal`
        // non vengono sollevati.
        if (collegamento.segnale?.aborted) {
          // «Ferma» non è un errore.
          return ''
        }
        if (scadenza.aborted) throw scaduta(collegamento, prontoDopoMs, false)

        if (detto.stopReason === 'maxTokens' || detto.stopReason === 'abort') {
          console.log(`[llama.cpp] risposta interrotta (${detto.stopReason}): è a metà.`)
        }
        return detto.responseText.trim()
      } catch (guasto) {
        // Annullo, scadenza e freno lasciano la sequenza in ordine; il resto no.
        if (!attesa.aborted && !freno.signal.aborted) rotto = true
        throw guasto
      } finally {
        misura.racconta()
        // La sessione se ne va, la sequenza resta: altrimenti le resterebbe
        // appeso un ascoltatore per ogni domanda.
        sessione?.dispose({ disposeSequence: false })
        // Il contesto resta caldo, salvo guasto o pesi in partenza (`congedo`
        // o non più quelli caricati).
        if (rotto || presi.congedo !== null || presi !== caricato) {
          await spegniCaldo(presi)
        } else if (presi.caldo === caldo) {
          addormenta(presi, caldo)
        }
        // I pesi restano caricati, ma da qui si possono smaltire.
        molla(presi)
      }
    } catch (guasto) {
      // Guasti del caricamento o dell'apertura del contesto: vedi `scaduta`.
      if (collegamento.segnale?.aborted) return ''
      if (scadenza.aborted) throw scaduta(collegamento, prontoDopoMs, inCoda)
      throw guasto
    } finally {
      // Il turno passa solo a sessione chiusa, contesto sistemato e pesi mollati.
      passa?.()
    }
  },
}
