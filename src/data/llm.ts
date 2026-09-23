// Che cosa si chiede a un modello, e chi glielo può chiedere.
//
// Il registro usa un modello locale in due posti che non si assomigliano: la
// **lettura delle scansioni** guarda un'immagine e torna del testo, l'**assistente**
// conversa e apre procedure. Diverse nella domanda, identiche in tutto il resto
// — quale modello, se c'è davvero, quanto si aspetta, che cosa si dice a chi
// quando non risponde — e quel «tutto il resto» era scritto due volte, una per
// uso.
//
// Due copie di una difesa sono una difesa sola più un difetto che aspetta: il
// modello riconosciuto di qua e non di là, l'attesa con il pavimento in un file
// e senza nell'altro. Qui c'è una volta.
//
//   ocr.ts            «leggi questa pagina»          \
//                                                      → llm.ts → motore
//   api/trasporti/    «rispondi a questa domanda,    /            (llamaCpp.ts,
//   assistant.ts      con questi attrezzi»                        mtmd.ts)
//
// ----------------------------------------------------- un file, non un servizio
//
// Prima di qui c'era Ollama: un servizio che gira sulla macchina, un indirizzo
// HTTP, e un modello che il registro poteva soltanto nominare sperando che
// qualcuno l'avesse scaricato con un comando battuto in un terminale. Adesso
// quel che il registro usa è **un file**: un `.gguf` sul disco, nella cartella
// che `gguf.ts` governa, scelto in una pagina che lo sa scaricare, trascinare
// dentro e cancellare.
//
// Che cosa cambia davvero, e perché vale il lavoro:
//
//   1. **Non c'è più un secondo programma da installare** per l'assistente. Il
//      modello si carica dentro il main process con `node-llama-cpp`, che è una
//      libreria e non un servitore: niente porta da aprire, niente servizio da
//      accendere prima, niente «Ollama non risponde su 127.0.0.1».
//   2. **Non c'è più un indirizzo**, e quindi non c'è più il modo di sbagliarlo.
//      Fin qui la difesa più delicata di questo file era controllare che l'URL
//      scritto in un JSON riscrivibile non mandasse altrove i nomi di minorenni,
//      le medie e le assenze. Quella difesa adesso non serve: **non c'è una
//      `fetch` da dirottare.** Sulla rete non esce niente, e non perché sia
//      configurato così — perché non c'è il filo.
//   3. **Quel che manca si vede e si rimedia da dentro.** «Il modello non c'è»
//      smette di essere una riga da battere altrove e diventa una pagina.
//
// Quel che resta fuori dalla macchina resta fuori: lo scarico di un `.gguf` da
// Hugging Face è l'unica cosa che parla con la rete, la fa `gguf.ts`, e porta
// dentro un file — non porta fuori un dato del registro.
//
// ------------------------------------------------------ i due assi, separati
//
// **Chi chiede** e **chi risponde** si muovono indipendentemente, ed è il punto
// di questo file.
//
// *Chi chiede* — l'uso — porta le proprie impostazioni, per conto suo: `ocr` e
// `assistente` hanno ciascuno il proprio interruttore, il proprio modello e la
// propria attesa. Sono chiavi con la stessa forma, lette dalla stessa funzione:
// chi legge scansioni con un modello che guarda e conversa con uno che ragiona
// non deve scegliere fra i due, e spegnere l'uno non tocca l'altro. Un terzo
// uso è una riga in `Uso`, una in `PREDEFINITI` e tre chiavi nel manifesto.
//
// *Chi risponde* — il motore — sono due, e sono due per una ragione che non è
// architettonica ma di fatto:
//
//   `llamaCpp.ts`  il modello dentro il processo, via `node-llama-cpp`. Parla,
//                  chiama gli attrezzi, e **non sa guardare**: quella libreria
//                  non accetta immagini.
//   `mtmd.ts`      `llama-mtmd-cli`, il programma di llama.cpp per i modelli
//                  che vedono. Un eseguibile sul disco, come whisper.cpp per
//                  la dettatura, e per la stessa ragione: è l'unico modo di
//                  dare un PNG a un modello locale senza un servizio in mezzo.
//
// La divisione fra i due non si sceglie in un'impostazione e non si deve
// scegliere: discende da che cosa l'uso manda. Chi manda immagini vuole quello
// che vede; chi conversa vuole quello che sta in casa. `motoreDi` lo sa, ed è
// tutto quel che c'è da sapere.

import * as apparato from 'apparato'

import { modelloNellaCartella } from './gguf.js'
import { LLAMA_CPP } from './llamaCpp.js'
import { MTMD } from './mtmd.js'

// ----------------------------------------------------- che cosa si può dire

/**
 * Chi ha detto una battuta.
 *
 * In italiano e non `system`/`user`/`assistant`/`tool`: quelli sono i nomi che
 * una libreria si aspetta **al suo confine**, e tradurli è mestiere del motore.
 * Qui dentro, e in tutto quel che sta sopra, il registro parla la propria
 * lingua — come fa già con `Azione`, `Esito` e tutto il resto.
 */
export type Ruolo = 'sistema' | 'utente' | 'assistente'

/**
 * Un attrezzo che il modello ha chiesto di usare.
 *
 * `argomenti` è `unknown` apposta, e non un oggetto: il modello li produce
 * seguendo uno schema, ma un modello piccolo ci mette dentro di tutto, e
 * districarli qui vorrebbe dire decidere — in un file che smista domande — che
 * cosa sia un argomento accettabile per una procedura del registro. Quella è
 * una decisione sul registro, e la prende chi esegue.
 */
export interface ChiamataAttrezzo {
  /** Come il modello lo ha chiamato: può essere un nome che non esiste. */
  nome: string
  argomenti: unknown
}

/** Una battuta della conversazione. */
export interface Battuta {
  ruolo: Ruolo
  testo: string
}

/**
 * Un attrezzo offerto al modello.
 *
 * `ingresso` è JSON Schema, che è quel che `api/schemas.ts` sa già stampare da
 * sé con `schemaJson`: non si scrive a mano da nessuna parte. È anche il
 * formato che ogni motore in circolazione accetta, e l'unico pezzo di questa
 * interfaccia che parla una lingua non nostra — ma è una lingua comune, non il
 * dialetto di un servizio.
 */
export interface Attrezzo {
  nome: string
  descrizione: string
  ingresso: Record<string, unknown>
}

/** Una domanda secca: un colpo, niente conversazione. */
export interface Domanda {
  richiesta: string
  /** Le pagine da guardare, in PNG. Vuole un motore che sappia vedere. */
  immagini?: readonly Uint8Array[]
  /**
   * Un tetto alle parole prodotte.
   *
   * Serve ai modelli piccoli, che tendono a ripetere due volte quel che hanno
   * appena detto: ogni parola in più è tempo di macchina speso per niente.
   */
  tettoParole?: number
}

/**
 * Che cosa succede mentre il modello lavora.
 *
 * Il giro di attrezzi dura secondi, e in quei secondi quel che si può mostrare
 * a chi guarda non sono le parole della risposta — arrivano in un colpo alla
 * fine — ma **quali procedure il registro sta aprendo**. È l'unica cosa che
 * distingue un'attesa da una macchina piantata.
 */
export interface Passo {
  /** La procedura che il modello ha chiesto, come l'ha chiamata lui. */
  attrezzo: string
  /**
   * Vero quando la chiamata **non** è stata eseguita: il tetto del giro era
   * finito.
   *
   * Serve perché il tetto non sia invisibile. Fino a qui, esaurite le dieci
   * letture, le chiamate successive tornavano al modello una frase e a chi
   * guardava niente: la barra restava ferma sull'ultima e poi compariva una
   * risposta, senza che nessuno potesse sapere che l'assistente aveva risposto
   * con quel che era riuscito a leggere e non con tutto. Un passo marcato così
   * si disegna diverso — è una chiamata chiesta, non una fatta — e la pagina
   * può dirlo sotto la risposta.
   */
  esaurito?: boolean
}

/**
 * Un giro di conversazione: quel che si è detto, quel che si può aprire, e chi
 * lo apre.
 *
 * `esegui` è la differenza che conta rispetto a com'era prima. Con Ollama il
 * motore tornava le chiamate e il trasporto faceva il ciclo: chiedi, esegui,
 * rimanda, richiedi. Una libreria che tiene la conversazione in casa quel ciclo
 * lo sa fare da sé, e meglio — conosce il formato che il modello si aspetta per
 * i risultati, che cambia da famiglia a famiglia.
 *
 * Quel che **non** le si lascia decidere è *che cosa si esegue*: `esegui` lo
 * porta chi chiama, ed è là dentro che vive il controllo del genere della
 * procedura. Il motore chiama una funzione che gli è stata data; non sa che
 * cosa faccia, e non può allargarla.
 */
export interface Giro {
  battute: readonly Battuta[]
  /** Senza, il modello può soltanto parlare. */
  attrezzi?: readonly Attrezzo[]
  /**
   * Esegue quel che il modello ha chiesto e torna il testo da rimandargli.
   *
   * **Non solleva**: quel che va storto torna come testo, perché un modello a
   * cui si dice che cosa ha sbagliato cambia strada, e uno a cui si chiude la
   * conversazione in faccia non impara niente.
   */
  esegui?: (chiamata: ChiamataAttrezzo) => Promise<string>
  /** Che cosa sta succedendo, mentre succede. */
  al?: (passo: Passo) => void
}

// ------------------------------------------------------------- chi risponde

/**
 * Un modo di far rispondere un modello che sta su questa macchina.
 *
 * Non c'è un metodo per accendersi o per installare qualcosa: i modelli li
 * governa `gguf.ts` — la cartella, lo scarico, quel che si trascina dentro — e
 * un motore trova un file già lì. Il programma esterno, per chi ne vuole uno,
 * lo indica un'impostazione e non lo procura il registro.
 */
export interface Motore {
  /** Come si chiama, per i messaggi: «llama.cpp». */
  nome: string
  /** Se sa guardare le immagini. Lo usa `motoreDi`, e nient'altro. */
  vede: boolean
  /**
   * Perché adesso questo motore non può lavorare, o `''` se può.
   *
   * Il modello c'è o non c'è lo guarda `prontezza()` qui sotto, uguale per
   * tutti: qui sta soltanto quel che è proprio di questo motore — un programma
   * esterno che manca, un proiettore che non è stato scelto.
   */
  impedimento: (collegamento: Collegamento) => string
  /** Una domanda secca. Solo i motori che vedono la ricevono con le immagini. */
  genera?: (collegamento: Collegamento, domanda: Domanda) => Promise<string>
  /** Un giro di conversazione, attrezzi compresi. */
  chatta?: (collegamento: Collegamento, giro: Giro) => Promise<string>
}

// -------------------------------------------------------------- chi chiede

/**
 * Chi si serve di un modello.
 *
 * Aggiungerne uno è una riga qui, una in `PREDEFINITI` e tre chiavi nel
 * manifesto, con lo stesso prefisso: il nome dell'uso **è** il prefisso, e
 * questa è l'unica cosa che tiene insieme le due metà. Un uso scritto qui e non
 * nel manifesto legge i predefiniti e non si accende mai; il contrario non
 * succede, perché nessuno andrebbe a leggerle.
 */
export type Uso = 'ocr' | 'assistente'

/** Come si chiama un uso in una frase italiana, per i motivi che si mostrano. */
const NOMI: Record<Uso, string> = {
  ocr: 'La lettura delle scansioni',
  assistente: 'L’assistente',
}

/** Dove si accende, per chi legge il motivo e deve rimediare. */
const DOVE_SI_ACCENDE: Record<Uso, string> = {
  ocr: 'nelle impostazioni del programma, sotto «Lettura delle scansioni»',
  assistente: 'nelle impostazioni del programma, sotto «Assistente»',
}

/** Quel che vale se nel file di impostazioni non c'è scritto niente. */
interface Predefiniti {
  attesaSecondi: number
}

/**
 * L'attesa di ciascun uso, quando nessuno l'ha scritta.
 *
 * Il modello predefinito non c'è più, ed è una differenza voluta: con Ollama si
 * poteva nominare `qwen2.5:7b` e sperare, perché il nome era una chiave di
 * ricerca dentro un servizio. Qui il modello è un file, e un file predefinito
 * che non esiste sarebbe una promessa: meglio nessun modello e una pagina che
 * lo dice, con dentro il pulsante per scaricarne uno.
 */
const PREDEFINITI: Record<Uso, Predefiniti> = {
  // Tre minuti di pazienza: tanto ci mette una pagina scansionata.
  ocr: { attesaSecondi: 180 },
  // Due minuti: per un giro con dentro una lettura è largo.
  assistente: { attesaSecondi: 120 },
}

/** Un motore, un modello e un'attesa: quel che serve per chiedere. */
export interface Collegamento {
  uso: Uso
  motore: Motore
  attivo: boolean
  /**
   * Il file `.gguf` scelto, con il percorso intero.
   *
   * Vuoto quando non ce n'è uno: o non è stato scelto, o quel che era scritto
   * non sta più nella cartella dei modelli. Le due cose si dicono diverse in
   * `prontezza()`, perché chi legge deve sapere se deve sceglierlo o
   * riscaricarlo.
   */
  modello: string
  /** Com'era scritto nelle impostazioni, anche quando il file non c'è più. */
  modelloChiesto: string
  /**
   * Il proiettore multimodale — l'`mmproj` — per i motori che vedono.
   *
   * Un modello che guarda sta in **due** file: i pesi del linguaggio e quelli
   * che trasformano un'immagine in qualcosa che il linguaggio sappia leggere.
   * Chi scarica solo il primo ottiene un modello che risponde e non vede, e la
   * pagina dei modelli li tiene insieme apposta.
   */
  proiettore: string
  /** Com'era scritto nelle impostazioni, anche quando il file non c'è più. */
  proiettoreChiesto: string
  /** L'eseguibile esterno, per i motori che ne hanno uno. Vuoto se non vale. */
  programma: string
  attesaMs: number
  /** Per fermare da fuori: lo preme chi chiude la pagina o annulla. */
  segnale?: AbortSignal
}

/**
 * Il motore di un uso.
 *
 * Non è un'impostazione, ed è la scelta che questo file difende: **lo decide
 * che cosa l'uso manda.** Chi manda immagini ha bisogno di un motore che le
 * accetti, e `node-llama-cpp` non le accetta; chi conversa sta meglio dentro il
 * processo, dove non c'è un programma da installare. Una tendina qui non
 * offrirebbe una scelta — offrirebbe il modo di accoppiare l'OCR a un motore
 * cieco e poi chiedersi perché ogni pagina torna vuota.
 */
function motoreDi (uso: Uso): Motore {
  return uso === 'ocr' ? MTMD : LLAMA_CPP
}

/**
 * Le impostazioni di un uso, risolte.
 *
 * Le chiavi sono sempre le stesse e si leggono qui, una volta: un uso che se le
 * rileggesse per conto proprio potrebbe dimenticare il pavimento dell'attesa —
 * che c'è perché un'attesa di due secondi su un modello locale non è una
 * configurazione, è un timeout mascherato da impostazione — o accettare come
 * modello un percorso scritto a mano che porta fuori dalla cartella.
 *
 * Il modello **si risolve dentro la cartella dei modelli** e non si prende come
 * viene scritto: nelle impostazioni ci va un nome di file, e `gguf.ts` lo
 * trasforma in un percorso soltanto se quel file sta davvero lì. Un percorso
 * assoluto messo a mano in quel JSON — che qualunque programma sulla macchina
 * può riscrivere — non diventa un file che il registro apre.
 */
export function collegamento (uso: Uso, segnale?: AbortSignal): Collegamento {
  const motore = motoreDi(uso)
  const configurazione = apparato.impostazioni.leggi('registroDocenti')
  const chiesto = configurazione.get<string>(`${uso}.modello`, '').trim()
  const proiettoreChiesto = configurazione.get<string>(`${uso}.proiettore`, '').trim()
  return {
    uso,
    motore,
    attivo: configurazione.get<boolean>(`${uso}.attivo`, false),
    modello: modelloNellaCartella(chiesto),
    modelloChiesto: chiesto,
    proiettore: modelloNellaCartella(proiettoreChiesto),
    proiettoreChiesto,
    programma: configurazione.get<string>(`${uso}.programma`, '').trim(),
    attesaMs:
      Math.max(
        10,
        configurazione.get<number>(`${uso}.attesaMassimaSecondi`, PREDEFINITI[uso].attesaSecondi),
      ) * 1000,
    ...(segnale ? { segnale } : {}),
  }
}

// ------------------------------------------------------------- se si può

/** Perché adesso non si può chiedere niente, o `pronto` se si può. */
export interface Prontezza {
  pronto: boolean
  motivo: string
}

/**
 * Se c'è tutto quel che serve per chiedere.
 *
 * Si dice **prima** e non al primo invio: un pulsante che macina cinque minuti
 * per poi annunciare che il modello non è stato scelto è peggio di un pulsante
 * spento, e una domanda battuta e rifiutata dopo trenta secondi manda a cercare
 * la colpa nella domanda.
 *
 * Il motivo è una frase italiana finita, con dentro **dove si rimedia**: chi la
 * legge non ha in mano un codice d'errore, ha una cosa da fare. E adesso quella
 * cosa si fa dentro il registro — la pagina «Modelli linguistici» —, non in un
 * terminale.
 *
 * Non è `async` e non chiede niente a nessuno: guardare se un file c'è costa
 * una `stat`, mentre prima costava una richiesta a un servizio che poteva anche
 * non rispondere. Chi la chiamava con `await` continua a funzionare.
 */
export function prontezza (collegamento: Collegamento): Prontezza {
  const { uso, motore, modello, modelloChiesto } = collegamento
  if (!collegamento.attivo) {
    return { pronto: false, motivo: `${NOMI[uso]} è spenta: si accende ${DOVE_SI_ACCENDE[uso]}.` }
  }
  if (modelloChiesto === '') {
    return {
      pronto: false,
      motivo:
        `${NOMI[uso]} non ha un modello: se ne scarica uno dalla pagina «Modelli ` +
        'linguistici», oppure ci si trascina dentro un file .gguf che si ha già.',
    }
  }
  if (modello === '') {
    return {
      pronto: false,
      motivo:
        `Il modello «${modelloChiesto}» non è più nella cartella dei modelli: lo si ` +
        'riscarica dalla pagina «Modelli linguistici», o se ne sceglie un altro.',
    }
  }
  const impedimento = motore.impedimento(collegamento)
  if (impedimento !== '') return { pronto: false, motivo: impedimento }
  return { pronto: true, motivo: '' }
}

// ------------------------------------------------------------ che cosa si fa

/**
 * Una domanda secca. Solleva se il motore non ce la fa.
 *
 * Chi vuole il guasto tradotto in una frase che si legge usa `conMotivo`: qui
 * si solleva e basta, perché che cosa mostrare dipende da chi ha chiesto — una
 * scansione illeggibile si ignora, una domanda dell'assistente si racconta.
 */
export async function genera (collegamento: Collegamento, domanda: Domanda): Promise<string> {
  if (!collegamento.motore.genera) {
    throw new Error(`${collegamento.motore.nome} non risponde a domande secche.`)
  }
  return collegamento.motore.genera(collegamento, domanda)
}

/** Un giro di conversazione, attrezzi compresi. Solleva se il motore non ce la fa. */
export async function chatta (collegamento: Collegamento, giro: Giro): Promise<string> {
  if (!collegamento.motore.chatta) {
    throw new Error(`${collegamento.motore.nome} non sa conversare.`)
  }
  return collegamento.motore.chatta(collegamento, giro)
}

/**
 * Lo stesso, con il guasto tradotto in un motivo che si sa leggere.
 *
 * `prontezza()` sa dire **che cosa** manca — l'uso spento, il modello mai
 * scelto, il file sparito dalla cartella — e il messaggio di una libreria no:
 * dice che non è riuscita a caricare dei pesi. Il controllo si paga solo quando
 * serve, cioè dopo un guasto, e non prima di ogni giro: sulla strada buona non
 * c'è nessuna verifica in più.
 */
export async function conMotivo<T> (
  collegamento: Collegamento,
  giro: () => Promise<T>,
): Promise<T> {
  try {
    return await giro()
  } catch (guasto) {
    const stato = prontezza(collegamento)
    // Il guasto vero resta attaccato come `cause`: quel che si mostra è il
    // motivo leggibile, quel che si legge in console è la catena intera.
    if (!stato.pronto) throw new Error(stato.motivo, { cause: guasto })
    // C'è tutto e non ha funzionato lo stesso: il guasto è un altro, e si dice
    // com'è.
    throw guasto instanceof Error
      ? guasto
      : new Error(`${collegamento.motore.nome} non ha risposto.`)
  }
}
