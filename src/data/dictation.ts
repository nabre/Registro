// La dettatura: si parla, e quel che si è detto finisce nella casella.
//
// Sta all'assistente come `llm.ts` sta a Ollama, ed è scritta sullo stesso
// stampo: **un uso** che porta le proprie impostazioni, **un motore** che sa
// parlare a un programma, e in mezzo le guardie che valgono comunque. La
// simmetria non è un vezzo — chi ha già letto `llm.ts` ha già letto questo — ma
// i due file restano separati perché quel che difendono non è la stessa cosa:
//
//   llm.ts        un indirizzo di rete   → la guardia è «dove finiscono i dati»
//   dictation.ts  un programma sul disco → la guardia è «che cosa si esegue»
//
// ------------------------------------------------- perché un programma, e non una libreria
//
// Il riconoscimento vocale in casa non esiste: Chromium ne ha uno, ma parla con
// un servizio di Google con una chiave che Electron non spedisce, e ogni
// libreria che faccia il lavoro sul posto è un modulo nativo da ricompilare a
// ogni versione di Electron. whisper.cpp è un eseguibile e un file di modello:
// non entra nel pacchetto, non si aggiorna con il registro, e chi non lo vuole
// semplicemente non lo tiene — la dettatura resta spenta e non manca niente.
//
// È la stessa forma di Ollama, e per la stessa ragione: **il registro non
// installa roba.** Dice dove va messa e che cosa manca — e, da quando esiste
// `voiceKit.ts`, quel che manca lo sa anche prendere da sé, in una cartella
// sua e verificandone l'impronta. Non è un'eccezione alla regola: niente esce
// da quella cartella, niente sopravvive alla disinstallazione, e chi il
// percorso lo scrive a mano continua ad avere ragione lui. Il perché per esteso
// sta in testa a quel file.
//
// ----------------------------------------------------------- la guardia vera
//
// Le quattro chiavi stanno in un JSON dentro `userData`, cioè in un file che
// qualunque programma che gira con lo stesso accesso può riscrivere. Per
// l'assistente il danno di una riga cambiata è che le domande finiscono a un
// indirizzo altrui; qui è **un'esecuzione**: `programma` è il percorso di un
// eseguibile che il registro fa partire.
//
// Perciò non basta che il file esista. Deve essere un percorso assoluto, deve
// essere un file, e su Windows deve finire in `.exe` — non `.bat`, non `.cmd`,
// non `.ps1`, che non sono programmi ma righe di comando interpretate, ed è
// così che un percorso innocuo diventa l'esecuzione di qualcos'altro. Il
// vettore di argomenti e `shell: false` sono l'altra metà, e stanno in
// `whisper.ts`.
//
// Quel che non si controlla, e si dice: **che l'eseguibile sia davvero
// whisper.cpp.** Non si può, non da qui: chi ha potuto riscrivere il percorso
// ha potuto anche mettere un altro programma in quel punto del disco. Il
// confine che questo file tiene è «un eseguibile scelto da chi usa il
// registro», non «questo eseguibile e nessun altro».
//
// -------------------------------------------------------------- il silenzio
//
// Una registrazione muta non si manda a trascrivere. Non è un'ottimizzazione:
// un modello messo davanti al silenzio *inventa*, e in italiano inventa sempre
// la stessa frase da sottotitoli. Si guarda quanto forte è quel che è arrivato
// e, sotto una soglia, si risponde che non si è sentito niente — che è la
// verità, e costa zero secondi di macchina invece di venti.

import * as apparato from 'apparato'
import { statSync } from 'node:fs'
import * as percorso from 'node:path'

import type { Pezzo } from './kit.js'
import {
  modelloScaricato,
  programmaScaricato,
  scaricaCorredo,
  scaricoAutomatico,
  siScarica,
  type AvanzamentoCorredo,
} from './voiceKit.js'
import { WHISPER } from './whisper.js'
import { senzaVirgolette } from '../domain/text.js'

// ------------------------------------------------------- che cosa si consegna

/**
 * Quel che arriva dal microfono, già nel formato che serve.
 *
 * Il ricampionamento lo fa la pagina (`ui/assistant/voice.ts`): ha il
 * motore audio del browser in mano, e rifarlo qui vorrebbe dire scrivere a
 * mano un ricampionatore in un processo che non ha bisogno di averlo.
 */
export interface Registrazione {
  /** PCM con segno a 16 bit, un canale. */
  campioni: Int16Array
  frequenza: number
}

/**
 * Un programma che sa trascrivere la voce sulla macchina.
 *
 * Due capacità e nient'altro: dire come si scarica quel che manca, e
 * trascrivere. Nessun metodo per installarsi o per scaricare un modello —
 * quelle sono cose che si fanno fuori dal registro, come per i motori di
 * `llm.ts`.
 */
export interface MotoreVoce {
  /** Come si chiama, per i messaggi: «whisper.cpp». */
  nome: string
  /** La frase da dire a chi non ha il modello o il programma. */
  comeScaricare: (modello: string) => string
  trascrivi: (collegamento: Collegamento, registrazione: Registrazione) => Promise<string>
}

/** I motori che il registro sa usare. Uno, e dichiarato come elenco lo stesso. */
const MOTORI = { whisper: WHISPER } as const

/** Un programma, un modello, una lingua e un'attesa: quel che serve per trascrivere. */
export interface Collegamento {
  motore: MotoreVoce
  attivo: boolean
  /** Vuoto se il percorso scritto non ha passato la guardia. */
  programma: string
  /** Vuoto se il modello scritto non ha passato la guardia. */
  modello: string
  /** Sempre `it`: vedi la nota in testa a `whisper.ts`. */
  lingua: string
  attesaMs: number
  durataMassimaMs: number
  /** Il vocabolario di scuola, per chi trascrive. */
  suggerimento: string
}

// ------------------------------------------------------------- le guardie

/**
 * Il percorso di un eseguibile, se è un percorso che si può eseguire.
 *
 * Vuoto quando non lo è, e non un'eccezione: chi chiama deve poter dire «la
 * dettatura non è pronta, ecco perché» invece di scoppiare. Il perché lo
 * ricompone `prontezza`, che rilegge quel che era scritto.
 */
function programmaValido (scritto: string): string {
  const pulito = senzaVirgolette(scritto)
  if (pulito === '' || !percorso.isAbsolute(pulito)) return ''
  // `.bat`, `.cmd` e `.ps1` no: non sono programmi, sono righe date a un
  // interprete, e un percorso che il registro non ha scritto non deve poter
  // diventare una riga di comando. Vedi la nota in testa al file.
  if (process.platform === 'win32' && percorso.extname(pulito).toLowerCase() !== '.exe') return ''
  try {
    return statSync(pulito).isFile() ? pulito : ''
  } catch {
    return ''
  }
}

/** Il percorso di un modello `ggml`, se c'è ed è un file. */
function modelloValido (scritto: string): string {
  const pulito = senzaVirgolette(scritto)
  if (pulito === '' || !percorso.isAbsolute(pulito)) return ''
  try {
    return statSync(pulito).isFile() ? pulito : ''
  } catch {
    return ''
  }
}

// ------------------------------------------------------------ le impostazioni

/**
 * Il vocabolario che il modello non si aspetta.
 *
 * whisper accetta una frase di contesto e la usa per decidere fra due parole
 * che suonano uguali. Senza, «giustificazione» diventa «giustificazioni» o
 * peggio, e «Ida» — una classe — diventa «e da». Con, la stessa registrazione
 * torna scritta come la si direbbe a scuola.
 *
 * È una frase e non un elenco di parole, con la punteggiatura al suo posto:
 * whisper copia anche **come** è scritto quel che gli si dà, e un elenco di
 * parole staccate produce una trascrizione senza virgole.
 */
const SUGGERIMENTO =
  'Registro di classe. Lezione, materia, classe, allievo, assenza, ritardo, ' +
  'giustificazione, nota disciplinare, valutazione, insufficienza, media, ' +
  'piano di lezione, consegna, scrutinio.'

/** Quanti secondi di voce al massimo, comunque sia scritto nell'impostazione. */
const DURATA_MINIMA_SECONDI = 5
const DURATA_MASSIMA_SECONDI = 300

/**
 * Le impostazioni della dettatura, risolte.
 *
 * Stessa forma di `collegamento` in `llm.ts`, e stessa ragione per cui si legge
 * in un posto solo: chi le rileggesse per conto proprio potrebbe saltare la
 * guardia sul percorso — che qui non è una comodità, è quel che decide che cosa
 * viene eseguito.
 */
export function collegamentoDettatura (): Collegamento {
  const configurazione = apparato.impostazioni.leggi('registroDocenti')
  const durata = configurazione.get<number>('dettatura.durataMassimaSecondi', 60)
  return {
    motore: MOTORI.whisper,
    attivo: configurazione.get<boolean>('dettatura.attivo', false),
    // Quel che è scritto a mano vince; quel che il registro ha scaricato è il
    // ripiego. E il ripiego **passa dalla stessa guardia**: la copia nella
    // cartella del corredo è un file come gli altri, e una seconda porta con
    // un controllo più largo sarebbe il modo in cui questa difesa si perde.
    programma:
      programmaValido(configurazione.get<string>('dettatura.programma', '')) ||
      programmaValido(programmaScaricato()),
    modello:
      modelloValido(configurazione.get<string>('dettatura.modello', '')) ||
      modelloValido(modelloScaricato()),
    // Dichiarata e non indovinata: il perché sta in testa a `whisper.ts`.
    lingua: 'it',
    // Il pavimento c'è perché un'attesa di due secondi non è una
    // configurazione, è un timeout mascherato da impostazione.
    attesaMs: Math.max(10, configurazione.get<number>('dettatura.attesaMassimaSecondi', 120)) * 1000,
    durataMassimaMs:
      Math.min(DURATA_MASSIMA_SECONDI, Math.max(DURATA_MINIMA_SECONDI, durata)) * 1000,
    suggerimento: SUGGERIMENTO,
  }
}

/**
 * Se la dettatura è accesa, per chi deve soltanto decidere se mostrare un
 * pulsante.
 *
 * Non è il collegamento intero: un percorso e un nome di modello non hanno
 * niente da fare in una pagina, e la pagina non ne fa niente.
 */
export function dettaturaAccesa (): boolean {
  return collegamentoDettatura().attivo
}

// --------------------------------------------------------------- se si può

/** Perché adesso non si può dettare, o `pronto` se si può. */
export interface Prontezza {
  pronto: boolean
  motivo: string
  /**
   * Quel che manca, il registro lo sa prendere da sé.
   *
   * Vuol dire tre cose insieme: il file manca, su questo sistema il registro lo
   * sa prendere (`siScarica`), e gli è stato detto di farlo
   * (`dettatura.scaricoAutomatico`). Chi lo legge non deve controllare
   * nient'altro — e soprattutto **il motivo qui accanto dice già la cosa
   * giusta**: «lo scarico io» quando è vero, e dove si prende a mano quando non
   * lo è. Due decisioni in due posti vorrebbero dire una frase che promette uno
   * scarico che nessuno farà.
   *
   * È falso anche quando un percorso nelle impostazioni c'è ma non va: quello è
   * un errore di chi l'ha scritto, e scaricare mezzo gigabyte per aggirarlo
   * vorrebbe dire nascondergli che ha sbagliato a scriverlo.
   */
  scaricabile: boolean
}

/**
 * Se il programma c'è e il modello anche.
 *
 * Si dice **prima** e non dopo la registrazione: chi parla per venti secondi e
 * poi si sente dire che il programma non è installato ha parlato per niente, e
 * la seconda volta non ci riprova.
 *
 * Il motivo è una frase italiana finita, con dentro che cosa fare: chi la legge
 * non ha in mano un codice d'errore, ha una cosa da sistemare.
 */
/**
 * Se quel pezzo, adesso, il registro se lo prende da sé.
 *
 * Le due condizioni insieme in un posto solo: **si può** — whisper.cpp pubblica
 * un binario per questo sistema — e **si deve** — nessuno ha spento lo scarico
 * automatico. Separarle vorrebbe dire una prontezza che annuncia uno scarico
 * che poi non parte.
 */
function daSé (che: 'programma' | 'modello'): boolean {
  return siScarica(che) && scaricoAutomatico()
}

/**
 * I pezzi che mancano per trascrivere, adesso, su questa macchina.
 *
 * Si legge dal collegamento e non dalla cartella del corredo: il collegamento
 * ha già unito le due strade — quel che è scritto nelle impostazioni e quel
 * che il registro si è scaricato — e un campo vuoto lì dentro vuol dire
 * «questo pezzo non ce l'ho in nessuno dei due modi», che è esattamente la
 * domanda a cui si deve rispondere prima di scaricare.
 *
 * Esportata per le prove, e non per comodità: da questa riga dipende **quanto**
 * si scarica, e mezzo gigabyte preso per sbaglio sulla rete di una scuola non
 * lo vede nessuna prova che guardi soltanto se la dettatura funziona.
 */
export function mancanti (collegamento: Collegamento): Pezzo[] {
  const quali: Pezzo[] = []
  if (collegamento.programma === '') quali.push('programma')
  if (collegamento.modello === '') quali.push('modello')
  return quali
}

export function prontezzaDettatura (collegamento: Collegamento): Prontezza {
  const configurazione = apparato.impostazioni.leggi('registroDocenti')
  if (!collegamento.attivo) {
    return {
      pronto: false,
      scaricabile: false,
      motivo:
        'La dettatura è spenta: si accende nelle impostazioni del programma, sotto ' +
        '«Assistente», alla voce «Dettatura».',
    }
  }
  if (collegamento.programma === '') {
    const scritto = configurazione.get<string>('dettatura.programma', '').trim()
    if (scritto !== '') {
      return {
        pronto: false,
        scaricabile: false,
        motivo:
          `«${scritto}» non è un eseguibile che il registro possa far partire: ci vuole il ` +
          'percorso intero di un file .exe, non uno script e non un collegamento.',
      }
    }
    // Niente di scritto, il sistema è di quelli per cui whisper.cpp pubblica un
    // binario, e lo scarico automatico è acceso: non c'è niente da chiedere.
    // La frase dice lo stesso che cosa sta per succedere, perché mezzo
    // gigabyte che parte da solo va annunciato anche quando è quel che si
    // voleva.
    return daSé('programma')
      ? {
          pronto: false,
          scaricabile: true,
          motivo: 'Manca il programma che trascrive: lo scarico io, ci vuole qualche minuto.',
        }
      : {
          pronto: false,
          scaricabile: false,
          motivo:
            'Manca il programma che trascrive: nelle impostazioni, «Dettatura», si mette il ' +
            `percorso intero di whisper-cli — ${collegamento.motore.comeScaricare('')}.`,
        }
  }
  if (collegamento.modello === '') {
    const scritto = configurazione.get<string>('dettatura.modello', '').trim()
    if (scritto !== '') {
      return {
        pronto: false,
        scaricabile: false,
        motivo: `Il modello «${scritto}» non si trova. ` +
          `${collegamento.motore.comeScaricare(scritto)}.`,
      }
    }
    return daSé('modello')
      ? {
          pronto: false,
          scaricabile: true,
          motivo:
            'Manca il modello che riconosce la voce: lo scarico io, ci vuole qualche minuto.',
        }
      : {
          pronto: false,
          scaricabile: false,
          motivo:
            'Manca il modello che riconosce la voce: nelle impostazioni, «Dettatura», si mette ' +
            'il percorso intero di un file ggml — per l’italiano ' +
            '«ggml-large-v3-turbo-q5_0.bin», che è il più accurato fra quelli veloci.',
        }
  }
  // Un modello **solo inglese** si riconosce dal nome — `ggml-base.en.bin`,
  // `ggml-small.en.bin` — e non si può usare qui. Non è una preferenza: con un
  // modello `.en` whisper.cpp **ignora `-l it`**, perché quel modello l'italiano
  // non l'ha mai visto, e quel che torna è inglese. Il guasto è muto: la
  // dettatura funziona, il registro scrive, e in una casella dell'appello
  // compare una frase in un'altra lingua.
  //
  // Si dice qui e non si lascia passare, perché è l'unico posto in cui chi
  // legge sta già guardando per capire come mai la dettatura non va.
  if (soloInglese(collegamento.modello)) {
    return {
      pronto: false,
      scaricabile: false,
      motivo:
        `Il modello «${percorso.basename(collegamento.modello)}» capisce solo l’inglese: ` +
        'i file che finiscono con «.en» non hanno l’italiano dentro, e quel che tornerebbe ' +
        'sarebbe scritto in inglese. Nelle impostazioni, «Dettatura», ci vuole un modello ' +
        'multilingue — per l’italiano «ggml-large-v3-turbo-q5_0.bin».',
    }
  }
  return { pronto: true, scaricabile: false, motivo: '' }
}

/**
 * Se quel file è un modello whisper addestrato sul solo inglese.
 *
 * Il nome è l'unica cosa che si può guardare senza aprirlo, ed è la convenzione
 * che whisper.cpp usa da sempre per distinguerli: `ggml-small.en.bin` contro
 * `ggml-small.bin`. Guardare dentro vorrebbe dire leggere l'intestazione di un
 * file da mezzo gigabyte a ogni domanda sulla prontezza.
 */
export function soloInglese (file: string): boolean {
  return /\.en(-[a-z0-9]+)?\.bin$/i.test(percorso.basename(file))
}

// ------------------------------------------------------------ che cosa si fa

/**
 * Quanto forte è quel che si è registrato, da 0 a 1.
 *
 * Il valore quadratico medio e non il picco: un colpo sulla scrivania fa un
 * picco e non è voce, mentre una frase detta piano tiene su una media bassa per
 * tutta la sua durata. È la differenza fra «ha parlato qualcuno» e «è successo
 * qualcosa».
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
 * Sotto questa soglia non c'è voce.
 *
 * Misurata su un microfono da portatile in una stanza zitta: il fondo sta
 * intorno a 0,002 e una frase detta piano, a mezzo metro, sta sopra 0,02. La
 * soglia sta in mezzo e dalla parte del dubbio: meglio mandare a trascrivere un
 * sussurro che rispondere «non ho sentito» a chi ha parlato davvero.
 */
const SOGLIA_SILENZIO = 0.006

/** Quanto dura, in millisecondi, quel che è arrivato. */
function durataMs (registrazione: Registrazione): number {
  return (registrazione.campioni.length / registrazione.frequenza) * 1000
}

/**
 * La frase detta, o una riga che dice perché non c'è.
 *
 * Torna sempre un esito e non solleva: dall'altra parte c'è un pulsante
 * premuto da chi sta scrivendo una domanda, e ogni modo di andare storto — il
 * programma che manca, il silenzio, l'attesa scaduta — deve poter diventare una
 * riga sotto la casella invece di una finestra d'errore sopra il registro.
 *
 * `al` racconta lo scarico del corredo, quando ce n'è uno da fare. Non è un
 * avanzamento della trascrizione: quella non ne ha uno, e chi ha premuto lo sa
 * già. È l'unico momento in cui premere il microfono può voler dire aspettare
 * dei minuti, e dei minuti senza un numero che si muove sono un pannello che
 * sembra piantato.
 *
 * ------------------------------------------------------------ l'ordine conta
 *
 * Prima si guarda se manca qualcosa di **non** rimediabile — la dettatura
 * spenta, un percorso scritto storto — e si risponde subito: chi ha parlato per
 * venti secondi e poi si sente dire che il programma non è installato ha
 * parlato per niente.
 *
 * Poi si guarda il **silenzio**, e prima dello scarico: mezzo gigabyte che
 * parte perché qualcuno ha sfiorato il microfono è il genere di cosa per cui si
 * spegne una funzione e non la si riaccende più.
 *
 * Solo alla fine si scarica, e si ricomincia a chiedere se si è pronti: fra
 * l'inizio e la fine di uno scarico passano dei minuti, e in quei minuti le
 * impostazioni possono essere cambiate.
 */
export async function trascrivi (
  registrazione: Registrazione,
  al?: (avanzamento: AvanzamentoCorredo) => void,
): Promise<{ ok: boolean, testo: string, motivo: string }> {
  try {
    return await quelCheHaDetto(registrazione, al)
  } finally {
    // La voce se ne va con la frase che ha prodotto, comunque sia andata e da
    // qualunque delle uscite si esca — il silenzio, il corredo che non scende,
    // whisper che non risponde.
    //
    // Non è scrupolo di memoria: dentro ci sono i nomi che chi detta ha appena
    // pronunciato, e adesso che la dettatura è in tempo reale di questi vettori
    // ne passa uno per ogni pausa invece di uno per registrazione. Il gemello
    // sul disco è il `finally` di `whisper.ts`, che cancella il WAV.
    registrazione.campioni.fill(0)
  }
}

/** Il corpo di `trascrivi`, che la sua gemella avvolge per cancellare la voce. */
async function quelCheHaDetto (
  registrazione: Registrazione,
  al?: (avanzamento: AvanzamentoCorredo) => void,
): Promise<{ ok: boolean, testo: string, motivo: string }> {
  let collegamento = collegamentoDettatura()
  let stato = prontezzaDettatura(collegamento)
  const daScaricare = !stato.pronto && stato.scaricabile
  if (!stato.pronto && !stato.scaricabile) return { ok: false, testo: '', motivo: stato.motivo }

  // Più lunga del consentito: si taglia in coda invece di rifiutarla. Chi ha
  // parlato per due minuti con il tetto a uno si è dimenticato il microfono
  // acceso, e la prima metà di quel che ha detto è comunque quel che voleva.
  const tetto = Math.floor((collegamento.durataMassimaMs / 1000) * registrazione.frequenza)
  const campioni =
    registrazione.campioni.length > tetto
      ? registrazione.campioni.subarray(0, tetto)
      : registrazione.campioni
  const tagliata: Registrazione = { campioni, frequenza: registrazione.frequenza }

  if (durataMs(tagliata) < 300 || forza(campioni) < SOGLIA_SILENZIO) {
    return { ok: false, testo: '', motivo: 'Non ho sentito niente: prova a parlare più vicino.' }
  }

  if (daScaricare) {
    try {
      // Solo i pezzi che mancano davvero. Chi ha già un modello suo scritto
      // nelle impostazioni — un `ggml-tiny.bin`, un `base` — e non ha il
      // programma si vedeva partire anche mezzo gigabyte di
      // `large-v3-turbo`: un modello scelto a mano non sta nella cartella del
      // corredo, e chi porta i pacchi guarda lì dentro e nient'altro.
      await scaricaCorredo(al, mancanti(collegamento))
    } catch (guasto) {
      console.error('[dettatura]', guasto)
      return {
        ok: false,
        testo: '',
        motivo: guasto instanceof Error ? guasto.message : String(guasto),
      }
    }
    collegamento = collegamentoDettatura()
    stato = prontezzaDettatura(collegamento)
    if (!stato.pronto) return { ok: false, testo: '', motivo: stato.motivo }
  }

  try {
    const testo = await collegamento.motore.trascrivi(collegamento, tagliata)
    return testo === ''
      ? { ok: false, testo: '', motivo: 'Non sono riuscito a capire quel che è stato detto.' }
      : { ok: true, testo, motivo: '' }
  } catch (guasto) {
    // Il guasto per esteso resta in console con il resto; a chi ha premuto va
    // la riga che si può leggere.
    console.error('[dettatura]', guasto)
    return {
      ok: false,
      testo: '',
      motivo: guasto instanceof Error ? guasto.message : String(guasto),
    }
  }
}
