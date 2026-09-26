// Che cos'è una procedura e che cosa torna quando la si chiama.
//
// Una `Procedura` è un'azione del centralino (`src/actions.ts`) con in più:
// l'ingresso controllato a tempo d'esecuzione (condotto, riga di comando e
// pannelli di altre versioni sfuggono al compilatore), un errore con un codice
// e una versione dichiarata. Dove un gestore esiste già, la procedura gli mette
// davanti il contratto e gli passa il lavoro (`daAzione` in `core.ts`).

import type { Parole, Termine } from '../domain/lexicon.js'
import { lessico } from '../domain/lexicon.testi.js'
import type { Collezione } from '../domain/models.js'
import type { Messaggio } from '../protocol.js'
import type { contestoDi } from '../actions/context.js'
import type { Presentazione, PresentazioneQualunque } from './presentation.js'
import type { Schema } from './schemas.js'
import type { TestoPigro } from '../i18n/index.js'
import { testi } from './core.testi.js'

/**
 * La versione del contratto. Sale quando cambia la busta (`Esito`,
 * `Fallimento`, il modo di chiamare), non quando si aggiunge una procedura.
 */
export const VERSIONE_API = 1

/** Quel che una procedura ha sottomano: lo stesso contesto dei gestori di sempre. */
export type Contesto = ReturnType<typeof contestoDi>

/**
 * Da dove arriva una chiamata: si scrive nel giornale, non cambia i permessi.
 *
 * `'proiezione'` oggi non la scrive nessuno: la seconda finestra riceve il
 * contenuto già calcolato da `panels/projection.ts`.
 * `'assistente'` è il modello locale, solo su letture e sulle procedure con
 * `assistente: true` (controllo in `api/transports/assistant.ts`): nel giornale
 * distingue le chiamate che non ha chiesto una persona.
 * L'origine viaggia nel contesto, costruito a ogni chiamata.
 */
export type Origine =
  | 'pannello'
  | 'proiezione'
  | 'programma'
  | 'condotto'
  | 'assistente'
  | 'prova'

/**
 * Legge o scrive. Dice alla riga di comando se una chiamata è innocua e al
 * nucleo se va rispinto lo stato. Una lettura non tocca mai il registro.
 */
export type Genere = 'lettura' | 'scrittura'

export interface Ambito {
  contesto: Contesto
  /** L'identificativo di questa chiamata: sta nel giornale e nella risposta. */
  tracciato: string
  origine: Origine
}

/** Una procedura: il contratto davanti al lavoro. */
// Esportata perché compare nella firma di `definisci`: `npm run census` la
// segnala come «da rendere interna», ma senza `export` l'emissione dei `.d.ts`
// fallirebbe.
export interface Procedura<I = unknown, U = unknown> {
  /** `area.cosa.verbo`, in italiano, come le azioni: `ore.appello.riga`. */
  nome: string
  /** Sale solo se cambia la forma di *questa* procedura in modo non compatibile. */
  versione: number
  genere: Genere
  /** Una riga: che cosa fa, detto a chi non conosce il codice. */
  titolo: TestoPigro
  ingresso: Schema<I>
  /**
   * Che cosa torna. Le scritture tornano quasi sempre `esitoScrittura`: il dato
   * nuovo arriva dallo stato spinto.
   */
  uscita: Schema<U>
  /**
   * Chiamarla due volte con lo stesso ingresso lascia il registro come una volta
   * sola: dice a chi chiama da fuori se può ritentare dopo un errore di trasporto.
   * È una dichiarazione: la prova la verifica solo per `ore.appello.riga`
   * (`tests/api/procedures.test.mjs`).
   */
  idempotente: boolean
  /** Le raccolte che la scrittura può toccare. Vuoto per le letture. */
  collezioni?: readonly Collezione[]
  /**
   * Rapporto con il documento aperto, per le scritture.
   *
   * Assente: se mentre aspettava in fila il documento è cambiato, esce con
   * `conflitto`. È il lato sicuro, anche per chi dichiara `collezioni: []` ma
   * tocca i file del documento.
   * `'cambia'`: la procedura è il cambio di documento (`documento.apri`,
   * `documento.chiudi`).
   * `'indipendente'`: non guarda il documento (finestra, modelli, posta,
   * impostazioni del programma). Nel dubbio non la si mette.
   */
  documento?: 'cambia' | 'indipendente'
  /** L'azione del protocollo che questa procedura ha preso in carico, se c'è. */
  azione?: string
  /**
   * L'assistente la può chiamare anche se non è una lettura (assente = `false`).
   *
   * Unica deroga alla regola di `usaAttrezzo` (solo `genere: 'lettura'`), e solo
   * per quel che non tocca l'archivio (`collezioni` vuoto): oggi aprire una
   * pagina. `tests/api/assistant.test.mjs` conta chi la dichiara.
   */
  assistente?: boolean
  /**
   * Se offrirla al modello dell'assistente (assente = `true`).
   *
   * Toglie dal catalogo le letture che non servono a un docente: ogni voce costa
   * token nella finestra di contesto. In particolare `modelli.prova` torna un PDF
   * in base64, e `llm.file`/`llm.catalogo` fanno richieste di rete a Hugging
   * Face. Decide `offribile()` in `api/tools.ts`.
   */
  perAssistente?: boolean
  /**
   * Come si impagina il risultato per chi lo legge, così il modello
   * dell'assistente non ricopia i dati (e non li inventa): la busta arriva alla
   * pagina già in colonne e al modello resta la frase.
   *
   * Sta accanto all'uscita perché `Valore.campo`, `da` e `Colonna.campo` sono
   * chiavi tipizzate: un campo rinominato non compila. Vedi `api/presentation.ts`.
   */
  presentazione?: Presentazione<U>
  esegui (ambito: Ambito, ingresso: I): U | Promise<U>
}

/**
 * Una procedura qualunque, come la tiene l'elenco.
 *
 * L'ingresso è in posizione contravariante: con `never` ogni procedura ci sta,
 * e chi la chiama dall'elenco passa comunque da `chiama`, che convalida.
 */
export interface ProceduraQualunque {
  nome: string
  versione: number
  genere: Genere
  titolo: TestoPigro
  ingresso: Schema<unknown>
  uscita: Schema<unknown>
  idempotente: boolean
  collezioni?: readonly Collezione[]
  documento?: 'cambia' | 'indipendente'
  azione?: string
  assistente?: boolean
  perAssistente?: boolean
  presentazione?: PresentazioneQualunque
  esegui (ambito: Ambito, ingresso: never): unknown
}

/**
 * Dichiara una procedura; i tipi li deduce il compilatore dagli schemi.
 *
 * Un titolo pigro (`titolo: () => t().titolo`) diventa una proprietà che si
 * legge come stringa nella lingua corrente, come `comando()` in `manifest.ts`.
 */
export function definisci<I, U> (procedura: Procedura<I, U>): Procedura<I, U> {
  const titolo = procedura.titolo
  if (typeof titolo !== 'function') return procedura
  return Object.defineProperty(procedura, 'titolo', { enumerable: true, get: titolo })
}

// ------------------------------------------------------------------- errori

/**
 * Perché non si è fatto. Un codice nuovo solo se chi chiama deve reagire in
 * modo diverso; il testo sta nei `messaggi`, nella lingua del registro.
 */
export type Codice =
  /** L'ingresso non ha la forma dichiarata. Chi chiama ha sbagliato a comporre. */
  | 'ingresso-non-valido'
  /** L'id c'era, la voce no: cancellata da un'altra finestra, o da un file riletto. */
  | 'non-trovato'
  /** La forma è giusta, il contenuto no: un voto fuori scala, semestri non contigui. */
  | 'rifiutato'
  /** Qualcosa è cambiato sotto: il file su disco non è più quello letto. */
  | 'conflitto'
  /** Serve qualcosa che adesso non c'è: nessun anno aperto, posta non collegata. */
  | 'non-disponibile'
  /**
   * La procedura esiste e l'ingresso va bene, ma chi chiama non ha il permesso
   * (oggi solo il condotto, vedi `api/transports/conduit.ts`). Non è `rifiutato`:
   * non c'è niente da correggere nella chiamata, c'è un'impostazione da accendere.
   */
  | 'non-permesso'
  /** Nome sconosciuto: il chiamante parla di una procedura che qui non esiste. */
  | 'procedura-sconosciuta'
  /** Il guasto che non era previsto. Va nel giornale per intero. */
  | 'interno'

/** Un rifiuto con un codice dietro, e le frasi da mostrare a chi ha premuto. */
export class ErroreApi extends Error {
  readonly codice: Codice
  readonly messaggi: string[]
  /** Il campo dell'ingresso che non va, quando è uno solo. */
  readonly campo?: string

  constructor (codice: Codice, messaggi: string | string[], campo?: string) {
    const elenco = Array.isArray(messaggi) ? messaggi : [messaggi]
    super(elenco.join(' '))
    this.name = 'ErroreApi'
    this.codice = codice
    this.messaggi = elenco
    this.campo = campo
  }
}

/** Il lessico nella lingua di adesso, come lo torna il catalogo. */
type Lessico = ReturnType<typeof lessico>

/** Il nome di un termine del lessico (`'classe'`, `'pif'`): resta uguale in ogni lingua. */
export type NomeTermine = {
  [K in keyof Lessico]: Lessico[K] extends Parole ? K : never
}[keyof Lessico]

/**
 * Il termine nella lingua corrente. Una costante italiana di `lexicon.ts`
 * (`PIF`, `SCUOLA.classe`) si riconosce per identità; un termine sconosciuto
 * resta com'è.
 */
function termineDetto (cosa: Termine | NomeTermine): Parole {
  if (typeof cosa === 'string') return lessico()[cosa]
  const italiano: Readonly<Record<string, unknown>> = lessico.in('it')
  const nome = Object.keys(italiano).find((chiave) => italiano[chiave] === cosa)
  return nome ? lessico()[nome as NomeTermine] : cosa
}

/**
 * Le scorciatoie usate dalle procedure.
 *
 * `nonTrovato` prende un termine del lessico, non una stringa: la frase la
 * compone il catalogo di ogni lingua (`core.testi.ts`) con l'accordo giusto.
 */
export const errore = {
  /**
   * `rimedio` dice come si trova la cosa («Le persone si cercano con
   * “persone.cerca”»): senza, un modello riprova con altri id inventati.
   */
  nonTrovato: (cosa: Termine | NomeTermine, rimedio?: string) =>
    new ErroreApi(
      'non-trovato',
      [testi().nonTrovato(termineDetto(cosa)), ...(rimedio ? [rimedio] : [])],
    ),
  rifiuta: (...messaggi: string[]) => new ErroreApi('rifiutato', messaggi),
  nonDisponibile: (perche: string) => new ErroreApi('non-disponibile', perche),
  conflitto: (perche: string) => new ErroreApi('conflitto', perche),
}

// -------------------------------------------------------------------- esiti

/** Com'è andata una scrittura. Il dato nuovo arriva dallo stato, non da qui. */
export interface EsitoScrittura {
  /** Il contatore di modifiche dell'archivio dopo la scrittura. */
  revisione: number
  /** L'id di quel che è nato, quando è nato qualcosa. */
  creato?: { id: string }
  /** Una frase per chi ha premuto. */
  messaggio?: Messaggio
  /** Il documento appena scritto, relativo alla cartella dei dati. */
  documento?: string
  /** È riuscita e non ha cambiato niente: il pannello non rispinge lo stato. */
  invariato?: boolean
}

/** La busta che torna a chi ha chiamato, comunque sia andata. */
export type Risultato<U = unknown> =
  | {
    ok: true
    api: number
    procedura: string
    versione: number
    tracciato: string
    dati: U
  }
  | {
    ok: false
    api: number
    procedura: string
    tracciato: string
    codice: Codice
    /** Le frasi nella lingua del registro, già pronte da mostrare. */
    messaggi: string[]
    campo?: string
    /**
     * La versione della procedura; manca solo su `procedura-sconosciuta`.
     * C'è anche sui fallimenti: con `ingresso-non-valido` chi chiama capisce se
     * deve aggiornarsi invece di ricomporre la stessa busta.
     */
    versione?: number
    /**
     * Quante modifiche ha fatto l'archivio prima di fallire (0 = nessuna).
     *
     * L'uscita si convalida dopo `esegui`: una scrittura riuscita con uscita fuori
     * contratto torna `interno`. Con `modifiche > 0` chi chiama sa che ritentare
     * rifarebbe la scrittura.
     */
    modifiche?: number
    /** Il contatore dell'archivio dopo il tentativo, per chi voglia confrontarlo. */
    revisione?: number
  }

/** Quel che il giornale registra di ogni chiamata. Nessun dato personale dentro. */
export interface VoceGiornale {
  tracciato: string
  procedura: string
  origine: Origine
  /**
   * Assente solo quando la procedura non esiste: un nome inventato non va
   * contato fra le letture.
   */
  genere?: Genere
  durataMs: number
  ok: boolean
  codice?: Codice
  /** Quante modifiche ha fatto l'archivio: 0 se non ha toccato niente. */
  modifiche: number
}

export type Spia = (voce: VoceGiornale) => void
