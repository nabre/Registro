// Il protocollo dell'assistente e della dettatura: conversazioni, contesto della
// pagina, giri che passano fra riquadro e finestra, risultati impaginati.
// Parte di `contract/protocol.ts`, che lo riesporta.

import type { Iso } from '#core/dominio/models.js'
import type { Vista } from '#contract/protocol.js'

/**
 * Un turno della conversazione come si vede a schermo, con procedure e guasti.
 * Diverso da `Conversazione.storia`, che è quel che si manda al modello.
 * Viaggia solo quando l'assistente passa fra riquadro e finestra.
 */
export interface TurnoAssistente {
  ruolo: 'utente' | 'assistente'
  testo: string
  /**
   * Le procedure aperte per questa risposta; `messaggio` è il motivo di un
   * fallimento, come in `MessaggioAssistente.attrezzo`.
   */
  attrezzi?: Array<{ nome: string, ok: boolean, codice?: string, messaggio?: string }>
  /**
   * Gli id incontrati leggendo per questo turno. Stanno nel turno così spariscono
   * con la conversazione quando la si svuota.
   */
  visti?: IdVisto[]
  /**
   * Quel che le procedure hanno letto, già impaginato (`api/presentation.ts`):
   * viaggia con il turno così le tabelle seguono la conversazione staccata.
   */
  risultati?: RisultatoAssistente[]
  /** Il servizio non ha risposto: si disegna in un altro modo. */
  guasto?: boolean
  /**
   * Chi ha chiesto ha premuto «Ferma»: non è un guasto. Resta comunque fuori
   * dalla storia mandata al modello.
   */
  fermato?: boolean
  /** Il modello ha finito le chiamate concesse: la nota sotto la risposta lo dice. */
  esaurito?: boolean
}

/**
 * Una scelta in una tendina: l'etichetta a schermo, con cui chi chiede ne
 * parla, e l'id che gli attrezzi vogliono.
 */
export interface VoceContesto {
  /** Come si chiama il campo nella barra: «Corso», «Classe», «Semestre». */
  campo: string
  /**
   * Il campo da cui questo dipende («Corso» dentro «Classe»): dice al modello la
   * gerarchia della barra. Assente per le voci indipendenti.
   */
  dentro?: string
  /** Il valore come si legge a schermo: «DIC4a · Matematica», «Tutti i corsi». */
  valore: string
  /** L'id da passare agli attrezzi, quando quel valore ne ha uno. */
  id: string | null
  /**
   * Le altre voci della tendina, ammesse dalla scelta di sopra: così «e la
   * terza?» si risolve senza una seconda lettura. Assente se non c'è scelta.
   */
  opzioni?: Array<{ valore: string, id: string | null }>
}

/**
 * Gli id su cui la pagina è puntata. Tutti presenti: `null` vuol dire «qui non
 * c'è», così il modello non deve indovinare.
 */
export interface RiferimentiContesto {
  annoId: string | null
  semestreId: string | null
  corsoId: string | null
  classeId: string | null
  lezioneId: string | null
  allievoId: string | null
  pianoId: string | null
  valutazioneId: string | null
}

/**
 * Il periodo dei conti, già in date: gli attrezzi vogliono `dal` e `al`, non un
 * `semestreId`. `null` tutti e due quando non c'è ancora un anno.
 */
export interface PeriodoContesto {
  /** Come si legge nella tendina: «2° semestre», «Anno intero». */
  etichetta: string
  /** Il primo giorno che conta, da passare come `dal`. */
  dal: Iso | null
  /** L'ultimo giorno che conta, da passare come `al`. */
  al: Iso | null
}

/**
 * Quel che l'elenco della pagina mostra adesso, filtrato, con gli id
 * nell'ordine a schermo («il terzo della lista»). `troncato` dice se l'elenco
 * è parziale, perché il modello non risponda sicuro su una parte.
 */
export interface ElencoVisibile {
  /** Di che cosa è l'elenco: «corsi», «persone in formazione», «ore». */
  cosa: string
  /** Quanti ne mostra la pagina in tutto, anche oltre quelli che si mandano. */
  quanti: number
  /** Gli id di quelli mostrati, nell'ordine in cui si vedono. */
  ids: string[]
  /** Vero se la pagina ne mostra più di quanti se ne sono mandati. */
  troncato: boolean
}

/**
 * Di che cosa si sta parlando, dedotto da dove si guarda: pagina, scheda,
 * tendine, filtri. Viaggia con `assistente.contesto` e l'host tiene l'ultimo.
 */
export interface ContestoAssistente {
  /**
   * La pagina aperta, con il nome del codice. `null` quando «la pagina che
   * guardo» è spento; il resto del contesto è indipendente (`ui/assistant/parts.ts`).
   */
  vista: Vista | null
  /** Come si chiama nella barra laterale: «Lezione». `null` come sopra. */
  pagina: string | null
  /** La scheda aperta dentro la pagina, quando ne ha: «Appello». */
  scheda: string | null
  /**
   * La sezione dentro la scheda, per le pagine a due livelli (le impostazioni:
   * scheda programma/documento, poi la sezione).
   */
  sezione: string | null
  /** Le scelte fatte nelle tendine in cima, come si leggono. */
  scelte: VoceContesto[]
  /** Quel che la pagina sta restringendo: vale anche per quel che si chiede. */
  filtri: VoceContesto[]
  riferimenti: RiferimentiContesto
  /**
   * Il periodo dei conti, in date. `null` quando chi chiede l'ha spento: vuol
   * dire «rispondi senza restringere».
   */
  periodo: PeriodoContesto | null
  /** Il giorno che la pagina sta mostrando. */
  data: Iso
  /** Oggi, che non è per forza il giorno mostrato. */
  oggi: Iso
  /** La ricerca battuta nella pagina, quando ce n'è una. */
  ricerca: string | null
  visibili: ElencoVisibile | null
}

/**
 * Una conversazione con l'assistente: una domanda in linguaggio naturale, a cui
 * il modello locale risponde leggendo il registro. Non è un'`Azione` (non
 * scrive) né una `Domanda` (le procedure le sceglie il modello, e
 * `api/transports/assistant.ts` concede solo le letture). Fuori dalla coda
 * delle scritture perché dura secondi. `storia` la tiene la pagina, così
 * cancellarla la fa sparire davvero.
 */
export interface Conversazione {
  id: number
  /** I turni già detti, il più recente per ultimo. Le istruzioni le mette l'host. */
  storia: Array<{ ruolo: 'utente' | 'assistente', testo: string }>
  /**
   * Gli id già incontrati nei turni: `storia` ha solo ruolo e testo, quindi si
   * mandano accanto. Vedi `IdVisto`.
   */
  visti?: IdVisto[]
  /**
   * Il contesto nel momento dell'Invio, dentro la busta: la domanda salta la
   * coda, e `assistente.contesto` accodato dietro un lavoro lungo sarebbe
   * vecchio. `undefined`: la finestra staccata non sa comporlo e vale l'ultimo
   * mandato dal pannello; `null`: contesto spento.
   */
  contesto?: ContestoAssistente | null
  /**
   * «Ferma» il giro con questo `id`: stessa busta perché è il canale già aperto
   * verso l'host; `storia` c'è, vuota. Vedi `panels/conversation.ts`.
   */
  ferma?: true
}

/**
 * Una domanda in corso mentre l'assistente cambia finestra. Il giro vive
 * nell'host; la finestra che se ne va dice quanti eventi ha già ricevuto, così
 * la nuova riprende senza doppioni né buchi.
 */
export interface GiroAssistente {
  /** Quanti eventi di questo giro la finestra che consegna ha già ricevuto. */
  visti: number
  /**
   * L'id della busta con cui questa pagina ha chiesto: dice quale giro sospendere
   * quando ce ne sono due insieme. Opzionale: senza, si prende il più recente
   * della pagina che consegna.
   */
  busta?: number
}

/** Lo stesso giro, come l'host lo restituisce: con il numero per riprenderlo. */
export interface GiroDaRiprendere extends GiroAssistente {
  /** Il numero con cui l'host lo tiene da parte: torna nella busta «segui». */
  id: number
}

/**
 * La finestra arrivata riprende la domanda in volo, senza rimandarla al
 * modello.
 */
export interface SeguiConversazione {
  /** Il giro che l'host tiene da parte: `GiroDaRiprendere.id`. */
  segui: number
  /** L'id su cui questa finestra vuole sentirsi rispondere. */
  id: number
  /** Da quale evento in poi: i precedenti li ha già visti chi ha consegnato. */
  da: number
}

/**
 * Come sta l'assistente, per tutte e due le finestre: il pannello guarda
 * `staccato`, la finestra staccata `acceso` e `modello` (non ha il `Registro`).
 * `storia` c'è solo subito dopo uno spostamento.
 */
export interface MessaggioStatoAssistente {
  tipo: 'assistente.stato'
  acceso: boolean
  modello: string
  staccato: boolean
  /**
   * Se il microfono si può accendere (interruttore della dettatura). Viaggia qui
   * perché la finestra staccata non riceve le impostazioni; il riquadro lo legge
   * da qui lo stesso, per avere una fonte sola.
   */
  dettatura: boolean
  storia?: TurnoAssistente[]
  /** Quel che era battuto nel campo e non ancora mandato, per non ribatterlo dopo lo spostamento. */
  bozza?: string
  /**
   * La domanda in volo durante lo spostamento, solo nel messaggio subito dopo:
   * chi lo riceve manda una `SeguiConversazione` e continua ad ascoltare il giro.
   */
  giro?: GiroDaRiprendere
  /**
   * La finestra ha consegnato con «Riattacca»: il riquadro si riapre. Serve
   * perché `staccato: false` da solo non distingue il rientro dalla chiusura con
   * la crocetta, e una conversazione vuota è comunque una conversazione.
   */
  rientro?: boolean
}

/**
 * Come procede una conversazione: più eventi per domanda. Mentre si aspetta
 * conta `'attrezzo'`, che mostra le procedure aperte. Il testo arriva intero
 * (lo streaming resta spento con gli attrezzi in tavola: i `tool_calls`
 * spezzati confondono i modelli piccoli); `'pezzo'` è pronto per quando si
 * accenderà.
 */
export interface MessaggioAssistente {
  tipo: 'assistente'
  id: number
  evento: 'attrezzo' | 'risultato' | 'limite' | 'pezzo' | 'fine' | 'guasto'
  /**
   * Su `'limite'`: quante letture erano fatte quando il motore ha finito le
   * chiamate concesse; la pagina lo dice sotto la risposta.
   */
  chiamate?: number
  /** Su `'fine'`: vero se il motore ha finito le chiamate prima della risposta. */
  esaurito?: boolean
  /**
   * Su `'attrezzo'`: la procedura aperta e com'è andata. `messaggio` è il motivo
   * leggibile di un fallimento, da mostrare accanto (non in un `title`).
   */
  attrezzo?: { nome: string, ok: boolean, codice?: string, messaggio?: string }
  /** Su `'risultato'`: quel che quella procedura ha letto, già impaginato. */
  risultato?: RisultatoAssistente
  /**
   * Su `'fine'`: gli id incontrati, già uniti a quelli entrati; la pagina li
   * tiene nel turno e li rimanda con la domanda dopo. Vedi `IdVisto`.
   */
  visti?: IdVisto[]
  /** Su `'pezzo'` e su `'fine'`: quel che il modello ha risposto. */
  testo?: string
  /** Su `'guasto'`: le frasi da mostrare, già tradotte. */
  errori?: string[]
}

/**
 * Un id incontrato leggendo, con il suo nome. Mai le cifre: un id è stabile,
 * una quota di assenza cambia all'appello dopo, e una cifra ricordata sarebbe
 * plausibile e sbagliata.
 */
export interface IdVisto {
  id: string
  /** Come si legge: «Bernasconi Elia», «DIC4a — Matematica». */
  nome: string
  /** Di che cosa è l'id: «allievo», «classe», «corso». */
  cosa: string
}

/**
 * Quel che una lettura ha letto, pronto da impaginare: i dati arrivano interi
 * alla pagina senza passare dal modello, che scrive solo introduzione e
 * commento. La forma la dichiara la procedura (`presentazione` in
 * `api/contract.ts`) e la costruisce `api/presentation.ts`.
 */
export interface RisultatoAssistente {
  /** La procedura che l'ha letto: `corso.presenze`. */
  procedura: string
  /** Come si intitola quel che si vede: «Presenze del corso». */
  titolo: string
  /** I blocchi, nell'ordine in cui si leggono. */
  blocchi: BloccoRisultato[]
}

export type BloccoRisultato =
  /** Poche cose con il loro nome: il periodo, la classe, quante UD. */
  | { tipo: 'valori', titolo?: string, voci: Array<{ etichetta: string, valore: string }> }
  /** Una tabella, già impaginata: le colonne sanno da che parte stanno. */
  | {
    tipo: 'tabella'
    titolo?: string
    colonne: Array<{ testo: string, allinea: 'sinistra' | 'destra' }>
    righe: string[][]
    /** Quante righe ci sono in tutto: `righe` può essere più corta. */
    quante: number
    /** Vero se se ne mostrano meno di quante ce ne sono. */
    troncata: boolean
  }
  /**
   * Un elenco di frasi (rotture dell'integrità, fogli di un fascicolo).
   * `quante` e `troncata` come nella tabella, perché un elenco tagliato senza
   * dirlo sembra completo. Opzionali: senza, l'elenco non dichiara niente.
   */
  | { tipo: 'elenco', titolo?: string, voci: string[], quante?: number, troncata?: boolean }

/**
 * Quel che si è detto al microfono, da trascrivere. Non nomina una procedura e
 * non tocca l'archivio: la prende `panels/transcription.ts`, che parla con
 * voicebox. I campioni sono PCM 16 bit, 16 kHz, mono, già il formato di
 * Whisper; il WAV lo scrive chi li consegna. Fuori dalla coda delle scritture.
 */
export interface Dettatura {
  id: number
  campioni: Int16Array
  /** Sempre 16000: viaggia lo stesso, così chi riceve non lo suppone. */
  frequenza: number
}

/**
 * L'esito della trascrizione, uno per dettatura. `motivo` è la riga da mostrare
 * sotto la casella («non ho sentito niente»), non un codice.
 */
export interface MessaggioDettatura {
  tipo: 'dettatura'
  id: number
  ok: boolean
  testo?: string
  motivo?: string
}
