// Che cos'è una procedura, e che cosa torna indietro quando la si chiama.
//
// Il registro ha già un centralino — `src/actions.ts` — e questo non lo
// sostituisce: lo dichiara. Un'`Azione` è un tipo TypeScript con un gestore
// dietro; una `Procedura` è la stessa cosa con, in più, le tre cose che a
// un'azione mancavano per poter essere chiamata da fuori dal pannello:
//
//   1. **una forma dell'ingresso controllata quando il programma gira**, non
//      solo quando compila — perché il widget dell'agenda, la riga di comando
//      e un pannello di una versione diversa sono sponde che il compilatore
//      non ha guardato insieme;
//   2. **un errore con un codice**, oltre alla frase italiana da mostrare —
//      perché «Lezione non trovata.» si legge, ma non si distingue da
//      «Consegna non trovata.» senza confrontare stringhe;
//   3. **una versione dichiarata**, così che due lati disallineati sappiano
//      dirselo invece di scoprirlo con un campo `undefined`.
//
// Quel che non cambia: le procedure non rifanno il lavoro dei gestori. Dove un
// gestore esiste già ed è provato, la procedura gli mette davanti il contratto
// e gli passa la palla (vedi `daAzione` in `core.ts`). Il lavoro sta in un
// posto solo, come prima.

import { accorda, frase, type Termine } from '../domain/lexicon.js'
import type { Collezione } from '../domain/models.js'
import type { Messaggio } from '../protocol.js'
import type { contestoDi } from '../actions/context.js'
import type { Presentazione, PresentazioneQualunque } from './presentation.js'
import type { Schema } from './schemas.js'

/**
 * La versione del contratto.
 *
 * Si alza quando cambia la *busta* — i campi di `Esito`, `Fallimento`, il modo
 * di chiamare — non quando si aggiunge una procedura: aggiungere è
 * retrocompatibile per costruzione, e alzare la versione a ogni procedura
 * nuova insegnerebbe soltanto a non guardarla.
 */
export const VERSIONE_API = 1

/** Quel che una procedura ha sottomano: lo stesso contesto dei gestori di sempre. */
export type Contesto = ReturnType<typeof contestoDi>

/**
 * Da dove arriva una chiamata. Si scrive nel giornale, non cambia cosa si può
 * fare.
 *
 * **`'proiezione'` non la scrive nessuno, ed è giusto così**: la seconda
 * finestra non chiama procedure — `panels/projection.ts` le spedisce il
 * contenuto già calcolato — quindi nel giornale non compare e non deve
 * comparire. Resta nell'unione perché il giorno in cui la proiezione dovesse
 * scrivere qualcosa, il nome c'è già.
 *
 * `'assistente'` la scrive il modello locale, e la scrive **solo su letture**:
 * `api/transports/assistant.ts` ricontrolla il genere prima di chiamare. Nel
 * giornale è l'unica riga che dica «questa non l'ha chiesta una persona», ed è
 * il motivo per cui è un'origine sua e non `'pannello'` — da cui pure arriva la
 * busta.
 *
 * `'programma'` invece non la scriveva nessuno **per un difetto**: il ponte
 * cablava `'pannello'` per tutti, e ogni scrittura partita dal menu nativo
 * risultava venuta dal pannello. Adesso l'origine viaggia nel contesto, che si
 * costruisce a ogni chiamata.
 */
export type Origine =
  | 'pannello'
  | 'proiezione'
  | 'agenda'
  | 'programma'
  | 'condotto'
  | 'assistente'
  | 'prova'

/**
 * Legge o scrive.
 *
 * Non è un vezzo da CQRS: è il campo che dice alla riga di comando se una
 * chiamata è innocua, e al nucleo se dopo va rispinto lo stato. Una lettura
 * non tocca il registro, mai.
 */
export type Genere = 'lettura' | 'scrittura'

export interface Ambito {
  contesto: Contesto
  /** L'identificativo di questa chiamata: sta nel giornale e nella risposta. */
  tracciato: string
  origine: Origine
}

/** Una procedura: il contratto davanti al lavoro. */
// Esportata anche se nessun altro file la nomina: compare nella firma di
// `definisci`, che e' esportata. `npm run census` la segnala come «da rendere
// interna» perche' guarda chi la cita, non chi la puo' raggiungere per
// inferenza — e toglierle l'`export` diventerebbe un errore il giorno in cui
// `tsconfig.json` accende l'emissione dei `.d.ts`.
export interface Procedura<I = unknown, U = unknown> {
  /** `area.cosa.verbo`, in italiano, come le azioni: `ore.appello.riga`. */
  nome: string
  /** Sale solo se cambia la forma di *questa* procedura in modo non compatibile. */
  versione: number
  genere: Genere
  /** Una riga: che cosa fa, detto a chi non conosce il codice. */
  titolo: string
  ingresso: Schema<I>
  /**
   * Che cosa torna. Le scritture tornano quasi sempre `esitoScrittura`: il
   * dato nuovo arriva al pannello dallo stato spinto, non da qui.
   */
  uscita: Schema<U>
  /**
   * Chiamarla due volte di fila con lo stesso ingresso lascia il registro come
   * chiamarla una volta sola.
   *
   * Dichiarato e non dedotto: è l'unica cosa che permette a chi chiama da
   * fuori di sapere se può ritentare dopo un errore di trasporto.
   *
   * **È una dichiarazione, e oggi una sola procedura la verifica davvero** —
   * `ore.appello.riga`, in `tests/api/procedures.test.mjs`, che la chiama due
   * volte di fila e guarda le caselle. Stava scritto qui che «le prove lo
   * verificano dove conta», e la frase faceva credere a una copertura che non
   * c'è: chi legge un `idempotente: true` su una delle altre centosettantaquattro
   * sta leggendo la parola di chi l'ha scritta, non il risultato di una prova.
   * Chi ci si appoggia per ritentare una scrittura, la prova se la scrive.
   */
  idempotente: boolean
  /** Le raccolte che la scrittura può toccare. Vuoto per le letture. */
  collezioni?: readonly Collezione[]
  /** L'azione del protocollo che questa procedura ha preso in carico, se c'è. */
  azione?: string
  /**
   * Il modello dell'assistente la può chiamare anche se non è una lettura.
   *
   * L'assistente vede le procedure di `genere: 'lettura'` e nient'altro, e la
   * riga che lo fa rispettare è in `usaAttrezzo`. Questo campo è l'unica
   * deroga, e ha due proprietà che la rendono sopportabile: **la dichiara la
   * procedura**, come il genere — non c'è un secondo elenco che possa restare
   * indietro nella direzione pericolosa — e una procedura nuova non la eredita,
   * perché il valore assente vale `false`.
   *
   * Si concede a quel che **non tocca l'archivio**: aprire una pagina del
   * registro è l'unico caso, e `collezioni` vuoto è la prova che si può
   * leggere accanto. Una scrittura decisa da un modello resta quel che era —
   * una scrittura che nessuno ha chiesto — e nel registro di una classe non si
   * disfa. Che l'elenco di chi la dichiara non cresca di nascosto lo tiene
   * fermo `tests/api/assistant.test.mjs`, che lo conta.
   */
  assistente?: boolean
  /**
   * Se ha senso metterla in mano al modello dell'assistente. Vale `true` di suo.
   *
   * È la deroga al contrario di `assistente`, e serve perché «lettura» e
   * «roba che un docente chiede» non sono la stessa cosa. Il catalogo offerto
   * al modello locale pesa circa 6 400 token su una finestra di contesto che
   * ne ha dodici o sedicimila, e dentro ci stavano sette letture che con una
   * domanda di un docente non c'entrano niente: i modelli del linguaggio
   * scaricati, i file di un deposito di Hugging Face, l'inventario dei
   * documenti, i modelli di stampa, l'integrità dei riferimenti. Sette voci in
   * più fra cui sbagliare, pagate da quel che resta per la domanda.
   *
   * Due, fra quelle, sono peggio delle altre e sono il motivo per cui questo
   * campo non è soltanto una dieta: `modelli.prova` torna un PDF in base64 —
   * un modello che la chiama si prende migliaia di caratteri al posto dei dati
   * — e `llm.file` e `llm.catalogo` parlano con Hugging Face, cioè
   * lascerebbero comporre al modello la stringa di ricerca di una richiesta di
   * rete. `src/data/llm.ts` dichiara che «non c'è il filo»; offrirle sarebbe
   * dire il contrario.
   *
   * Come `genere` e `assistente`, **lo dichiara la procedura**: non c'è un
   * secondo elenco scritto altrove che possa restare indietro. Il predefinito è
   * `true` e non `false` apposta — una lettura nuova nasce utile, e chi la
   * scrive toglie solo quel che sa di dover togliere. Chi decide è `offribile()`
   * in `api/tools.ts`, e il catalogo ne pubblica la risposta.
   */
  perAssistente?: boolean
  /**
   * Come si impagina quel che torna, per chi la risposta la deve **leggere**.
   *
   * La dichiarano le letture che il modello dell'assistente può chiamare, e
   * serve a togliergli di mano i dati: senza, una risposta con dei numeri
   * dentro era il modello che li ricopiava in una tabella di markdown — cioè un
   * modello che ribatte venticinque righe, in un registro di classe, con il
   * vizio di inventare. Dichiarata qui, la busta arriva alla pagina già divisa
   * in colonne e al modello resta la frase.
   *
   * Sta accanto all'uscita apposta: `Valore.campo` e `da` sono chiavi del tipo
   * di uscita e `Colonna.campo` è una chiave della riga che sta dentro `da`,
   * quindi un campo rinominato non fa più compilare invece di far sparire una
   * colonna in silenzio. Quel che non la dichiara non si impagina —
   * `modelli.prova` torna un PDF in base64, e non c'è tabella che lo renda
   * leggibile. Vedi `api/presentation.ts`.
   */
  presentazione?: Presentazione<U>
  esegui (ambito: Ambito, ingresso: I): U | Promise<U>
}

/**
 * Una procedura qualunque, come la tiene l'elenco.
 *
 * Serve perché un elenco di procedure è un elenco di cose con ingressi
 * diversi, e `Procedura<unknown, unknown>` non le accoglierebbe: l'ingresso sta
 * in posizione contravariante. Con `never` al posto suo ogni procedura ci sta,
 * e chi la chiama dall'elenco deve comunque passare per `chiama`, che convalida
 * prima di eseguire — cioè l'unico modo in cui quell'ingresso può diventare
 * davvero del tipo giusto.
 */
export interface ProceduraQualunque {
  nome: string
  versione: number
  genere: Genere
  titolo: string
  ingresso: Schema<unknown>
  uscita: Schema<unknown>
  idempotente: boolean
  collezioni?: readonly Collezione[]
  azione?: string
  assistente?: boolean
  perAssistente?: boolean
  presentazione?: PresentazioneQualunque
  esegui (ambito: Ambito, ingresso: never): unknown
}

/**
 * Dichiara una procedura, lasciando che i tipi li deduca il compilatore dagli
 * schemi.
 *
 * Senza, andrebbero scritti a mano due volte — nel parametro di tipo e nello
 * schema — e la seconda volta che si scrive la stessa cosa è la volta in cui
 * si sbaglia.
 */
export function definisci<I, U> (procedura: Procedura<I, U>): Procedura<I, U> {
  return procedura
}

// ------------------------------------------------------------------- errori

/**
 * Perché non si è fatto.
 *
 * Sette codici e non venti: uno in più si aggiunge quando qualcuno deve
 * *reagire* in modo diverso, non quando il testo cambia. Il testo sta nei
 * `messaggi`, che restano in italiano e restano quelli che il pannello mostra
 * già oggi — nessuna frase è stata riscritta passando di qui.
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
   * La procedura esiste e l'ingresso va bene: è chi chiama a non avere il
   * permesso. Oggi lo dice solo il condotto, a cui si può concedere la lettura
   * senza la scrittura — vedi `api/transports/conduit.ts`. È un codice a sé e
   * non un `rifiutato` perché la risposta di chi lo riceve è diversa: non c'è
   * niente da correggere nella chiamata, c'è un'impostazione da accendere.
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

/**
 * Le scorciatoie che le procedure usano davvero.
 *
 * `nonTrovato` prende un `Termine` del lessico e non una stringa, ed è il
 * motivo per cui il lessico esiste: con una stringa la frase era cucita al
 * femminile — «Lezione non trovata» giusto, «Momento di valutazione non
 * trovata» sbagliato — e l'accordo lo avrebbe dovuto fare a mano chi scrive
 * ogni procedura. `frase(termine, 'trovato', { nega: true })` lo fa da sé, e
 * cambiando una parola nel lessico cambia qui senza che nessuno la riscriva.
 */
export const errore = {
  /**
   * `rimedio` è la frase che dice **come si trova**: «Le persone si cercano
   * con “persone.cerca”».
   *
   * Non è un abbellimento del messaggio, è quel che ferma un giro a vuoto. Un
   * modello che riceve «non trovata, forse è sparita» ha davanti una strada
   * sola — riprovare con un altro identificatore inventato — e il giornale lo
   * ha registrato: dieci `persone.scheda` di fila, tutte `non-trovato`, tutte
   * con un id che nel registro non è mai esistito. Con la seconda frase la
   * strada c'è, e il giro successivo chiama l'attrezzo che serve.
   *
   * Vale per chi legge, non solo per il modello: la stessa frase compare nella
   * riga di comando e nella notifica del pannello, e «come si trova» è la
   * domanda che viene subito dopo «non c'è».
   */
  nonTrovato: (cosa: Termine, rimedio?: string) =>
    new ErroreApi(
      'non-trovato',
      [
        `${frase(cosa, 'trovato', { nega: true })} Forse è già ${accorda(cosa, 'sparito')}.`,
        ...(rimedio ? [rimedio] : []),
      ],
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
    /** Le frasi in italiano, già pronte da mostrare. */
    messaggi: string[]
    campo?: string
    /**
     * La versione della procedura, quando la procedura esiste.
     *
     * Manca soltanto su `procedura-sconosciuta`, che è l'unico caso in cui non
     * c'è una versione da dire. Stava solo sul ramo riuscito, e quindi chi
     * voleva negoziare la versione non poteva farlo **proprio quando la
     * chiamata era fallita per forma sbagliata** — che è l'unico momento in cui
     * la domanda «ma io e te parliamo della stessa procedura?» serva a
     * qualcosa. Un pannello che riceve `ingresso-non-valido` e legge
     * `versione: 3` mentre ne conosce la 2 sa che deve aggiornarsi, invece di
     * riprovare a comporre la stessa busta.
     */
    versione?: number
    /**
     * Quante modifiche ha fatto l'archivio **prima** di fallire: 0 se non ha
     * toccato niente.
     *
     * Esiste per un caso solo, ed è il caso peggiore: l'uscita si convalida
     * **dopo** `esegui`, quindi una scrittura riuscita che risponde fuori
     * contratto torna indietro con `codice: 'interno'`. `interno` non è un
     * rifiuto, quindi uno script scritto bene ritenta — e trenta delle
     * centoquarantanove scritture dichiarano `idempotente: false`. Con
     * `modifiche > 0` accanto al codice, chi chiama sa che **qualcosa è già
     * successo** e che ritentare alla cieca vuol dire farlo due volte.
     *
     * Non costa niente: il numero è già calcolato per il giornale, sulla riga
     * sopra.
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
   * Assente quando la procedura non esiste, ed è l'unico caso.
   *
   * Era obbligatorio, e per un nome sconosciuto il nucleo scriveva
   * `genere: 'lettura'` per comodità — il campo andava riempito e una lettura
   * sembrava la cosa più innocua. Ma chi conta le chiamate per genere contava
   * così i **nomi inventati** fra le letture, e i nomi inventati sono proprio
   * il primo modo in cui un modello sbaglia: il giornale diceva «ha letto» di
   * una chiamata in cui non si era letto niente. Meglio un campo che manca —
   * che si vede — di un valore di comodo, che non si vede.
   */
  genere?: Genere
  durataMs: number
  ok: boolean
  codice?: Codice
  /** Quante modifiche ha fatto l'archivio: 0 se non ha toccato niente. */
  modifiche: number
}

export type Spia = (voce: VoceGiornale) => void
