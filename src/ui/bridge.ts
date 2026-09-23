// Il canale verso l'extension host.
//
// `postMessage` è a senso unico: si manda e basta. Qui ogni richiesta prende un
// numero e resta in attesa in una mappa finché non torna la risposta con lo
// stesso numero — così dal lato chiamante `await invia(...)` si comporta come
// una normale chiamata, e chi salva un modulo può aspettare l'esito prima di
// chiudere la finestra.

import { notifica } from './components/notifications.js'
import type {
  Azione,
  Conversazione,
  Dettatura,
  GiroAssistente,
  IdVisto,
  TurnoAssistente,
  Domanda,
  MessaggioAssistente,
  MessaggioCorredo,
  MessaggioDettatura,
  MessaggioVersoWebview,
  Richiesta,
  Riscontro,
  Risposta,
  RisultatoAssistente,
  SeguiConversazione,
} from '../protocol.js'

declare function acquireVsCodeApi (): {
  postMessage (messaggio: unknown): void
  getState (): unknown
  setState (stato: unknown): void
}

const api = acquireVsCodeApi()

let contatore = 0
const inAttesa = new Map<number, (risposta: Risposta) => void>()
/**
 * Le domande in volo, in una mappa loro.
 *
 * Due mappe e non una perché sono due promesse di tipo diverso — un esito di
 * scrittura e un dato — e tenerle insieme vorrebbe dire un `any` nel punto in
 * cui il tipo serve di più: quello in cui il dato letto entra in una vista.
 */
const domandeInAttesa = new Map<number, (riscontro: Riscontro) => void>()
/**
 * I fili di conversazione aperti con l'assistente.
 *
 * Una mappa a sé, come quella delle domande e per la stessa ragione: qui non
 * torna una risposta sola, ne tornano parecchie — un attrezzo, un altro
 * attrezzo, la fine — e chi ascolta non risolve una promessa, riceve ogni volta.
 */
const conversazioniInAttesa = new Map<number, (messaggio: MessaggioAssistente) => void>()
/**
 * Le dettature in volo.
 *
 * Una mappa a sé, come le altre due: qui torna una risposta sola — la frase, o
 * il motivo per cui non c'è — ma il tipo è un terzo ancora, e metterlo nella
 * mappa delle domande vorrebbe dire un `any` nel punto in cui il tipo serve.
 */
const dettatureInAttesa = new Map<number, (messaggio: MessaggioDettatura) => void>()

/**
 * Chi guarda scendere il corredo, per le dettature che lo stanno aspettando.
 *
 * Separata dalla mappa qui sopra perché i due messaggi hanno destini diversi:
 * di questi ne arrivano molti e nessuno chiude niente, e chi ascolta se ne va
 * quando arriva la frase — cioè quando si cancella l'altra voce. Tenerli
 * insieme vorrebbe dire una mappa che si svuota a metà.
 */
const corrediInAttesa = new Map<number, (messaggio: MessaggioCorredo) => void>()
type Ascoltatore = (messaggio: MessaggioVersoWebview) => void
const ascoltatori = new Set<Ascoltatore>()

window.addEventListener('message', (evento: MessageEvent<MessaggioVersoWebview>) => {
  const messaggio = evento.data
  if (!messaggio || typeof messaggio !== 'object') return

  if (messaggio.tipo === 'risposta') {
    const risolvi = inAttesa.get(messaggio.id)
    if (risolvi) {
      inAttesa.delete(messaggio.id)
      risolvi(messaggio)
    }
    return
  }
  if (messaggio.tipo === 'riscontro') {
    const risolvi = domandeInAttesa.get(messaggio.id)
    if (risolvi) {
      domandeInAttesa.delete(messaggio.id)
      risolvi(messaggio)
    }
    return
  }
  if (messaggio.tipo === 'dettatura') {
    const risolvi = dettatureInAttesa.get(messaggio.id)
    if (risolvi) {
      dettatureInAttesa.delete(messaggio.id)
      corrediInAttesa.delete(messaggio.id)
      risolvi(messaggio)
    }
    return
  }
  if (messaggio.tipo === 'dettatura.corredo') {
    corrediInAttesa.get(messaggio.id)?.(messaggio)
    return
  }
  if (messaggio.tipo === 'assistente') {
    // Chi ascolta resta iscritto fino a `fine` o `guasto`: un filo può portare
    // dieci eventi, e cancellarlo al primo perderebbe tutti gli altri.
    const al = conversazioniInAttesa.get(messaggio.id)
    if (al) {
      if (messaggio.evento === 'fine' || messaggio.evento === 'guasto') {
        conversazioniInAttesa.delete(messaggio.id)
      }
      al(messaggio)
    }
    return
  }
  for (const ascoltatore of ascoltatori) ascoltatore(messaggio)
})

// ------------------------------------------------------------------ attesa

/**
 * Le azioni che non sono lavoro di nessuno: partono da sole, di continuo, e
 * segnalarle vorrebbe dire un filo che lampeggia a ogni battito dell'orologio.
 *
 * Sono due, e dicono la stessa cosa a due schermi diversi: il pannello dice
 * allo schermo grande dove si sta guardando (`proiezione.mira`) e lo dice
 * all'assistente (`assistente.contesto`), a ogni cambio di stato. Nessuna delle
 * due è una cosa che qualcuno ha chiesto e sta aspettando, e un filo che
 * lampeggiasse a ogni clic sul calendario smetterebbe di voler dire qualcosa
 * anche quando c'è davvero da aspettare.
 *
 * `assistente.contesto` però **è una scrittura in coda**, e la domanda la coda
 * la salta: il contesto arrivava in ritardo e il modello rispondeva sulla
 * pagina di prima. Da quando la veduta viaggia dentro la busta della domanda
 * (`Conversazione.contesto`) questo canale resta soltanto per chi non manda
 * buste — la finestra staccata, che il registro non ce l'ha.
 */
const DI_FONDO = new Set<Azione['tipo']>(['proiezione.mira', 'assistente.contesto'])

/**
 * Quante richieste sono partite e non sono ancora tornate.
 *
 * Serve al filo che dice che il registro sta lavorando. Sta qui e non nello
 * stato dell'interfaccia perché è un fatto del canale, non una scelta di chi
 * guarda — e soprattutto perché deve sopravvivere ai ridisegni: l'orologio ne
 * fa scattare uno ogni minuto, e un generatore di PDF che impiega dieci secondi
 * si vedrebbe portar via il proprio segnale a metà strada.
 */
let inCorso = 0
/**
 * Il filo non si accende subito.
 *
 * Quasi tutte le azioni del registro sono una scrittura su un file locale e
 * tornano in pochi millisecondi: un filo acceso e spento a ogni clic è uno
 * sfarfallio, non un'informazione. Dopo un quarto di secondo, invece, chi ha
 * premuto sta già aspettando, e vuole sapere che qualcosa sta succedendo.
 */
const RITARDO_FILO = 250
let filoAcceso = false
let attesaFilo: ReturnType<typeof setTimeout> | null = null
const attendenti = new Set<() => void>()

/** Vero quando il registro sta lavorando da abbastanza da valere la pena dirlo. */
export function lavoroInCorso (): boolean {
  return filoAcceso
}

/** Avvisa quando il filo si accende o si spegne: il telaio si ridisegna. */
export function iscrivitiAttesa (ascoltatore: () => void): () => void {
  attendenti.add(ascoltatore)
  return () => attendenti.delete(ascoltatore)
}

function mostraFilo (acceso: boolean): void {
  if (filoAcceso === acceso) return
  filoAcceso = acceso
  for (const ascoltatore of attendenti) ascoltatore()
}

function segnaAttesa (delta: number): void {
  inCorso = Math.max(0, inCorso + delta)
  if (inCorso > 0) {
    if (attesaFilo === null && !filoAcceso) {
      attesaFilo = setTimeout(() => {
        attesaFilo = null
        if (inCorso > 0) mostraFilo(true)
      }, RITARDO_FILO)
    }
    return
  }
  if (attesaFilo !== null) {
    clearTimeout(attesaFilo)
    attesaFilo = null
  }
  mostraFilo(false)
}

// ------------------------------------------------------------------ invio

function mostraMessaggio (risposta: Risposta): void {
  const messaggio = risposta.messaggio
  if (!messaggio) return
  notifica(
    messaggio.testo,
    messaggio.livello === 'errore' ? 'errore' : messaggio.livello === 'avviso' ? 'avviso' : 'info',
  )
}

/**
 * Manda un'azione e aspetta l'esito. Non rifiuta mai la promessa: gli errori
 * arrivano dentro `Risposta.errori`, perché qui un errore è quasi sempre una
 * validazione da mostrare in un modulo, non un guasto.
 *
 * Quel che l'host ha da dire — «12 lezioni aggiunte», «rapporto scritto in…» —
 * lo mostra questa funzione, e nessun altro: era un campo che ogni chiamante
 * avrebbe dovuto leggersi da sé, e non se lo leggeva nessuno. Gli errori invece
 * restano a chi chiama, che quasi sempre li vuole in cima al proprio modulo:
 * chi non ha un posto dove metterli usa `azione`.
 */
export function invia (azione: Azione): Promise<Risposta> {
  contatore += 1
  const id = contatore
  const richiesta: Richiesta = { id, azione }
  const conta = !DI_FONDO.has(azione.tipo)
  if (conta) segnaAttesa(1)
  return new Promise<Risposta>((risolvi) => {
    inAttesa.set(id, (risposta) => {
      if (conta) segnaAttesa(-1)
      mostraMessaggio(risposta)
      risolvi(risposta)
    })
    api.postMessage(richiesta)
  })
}

/**
 * Come `invia`, ma un rifiuto lo dice da sé.
 *
 * È la forma buona per i comandi che partono da un pulsante e non hanno un
 * modulo aperto in cui mettere l'errore: una casella dell'appello, un «apri il
 * documento», una stampa. Prima erano tutti `void invia(...)` — la risposta si
 * buttava via, e un rifiuto dell'host («la lezione non c'è più», «nessuna
 * cartella di lavoro») spariva nel nulla lasciando il pulsante che sembrava non
 * aver fatto niente.
 */
export async function azione (comando: Azione): Promise<Risposta> {
  const risposta = await invia(comando)
  if (!risposta.ok) {
    notifica((risposta.errori ?? ['Non riuscito.']).join(' '), 'errore')
  }
  return risposta
}

// ------------------------------------------------------------------ domande

/** Com'è andata una domanda: il dato, oppure il motivo per cui non c'è. */
export interface Esito<T> {
  ok: boolean
  dati: T | null
  errori: string[]
  /** Il codice dell'API, per chi deve distinguere «non c'è più» da «non si può». */
  codice?: string
}

/**
 * Chiede qualcosa al registro senza cambiarlo.
 *
 * Il tipo del dato lo dichiara chi chiama, ed è un atto di fiducia verso la
 * procedura dall'altra parte — la stessa che il pannello ripone già nel
 * `Registro` che riceve. La differenza è che dall'altra parte, adesso, c'è uno
 * schema d'uscita convalidato: se la procedura rispondesse in una forma
 * diversa da quella che dichiara, il nucleo se ne accorge e risponde un
 * guasto, invece di lasciar arrivare quassù un oggetto storto che si
 * manifesterà tre ridisegni più tardi.
 *
 * Non mostra niente da sé: una lettura che non riesce quasi sempre si disegna
 * — «non è stato possibile leggere il modello» dentro il riquadro — e non si
 * annuncia con una notifica che passa.
 */
export function chiedi<T> (procedura: string, ingresso?: unknown): Promise<Esito<T>> {
  contatore += 1
  const id = contatore
  const domanda: Domanda = { id, procedura, ingresso }
  segnaAttesa(1)
  return new Promise<Esito<T>>((risolvi) => {
    domandeInAttesa.set(id, (riscontro) => {
      segnaAttesa(-1)
      risolvi({
        ok: riscontro.ok,
        dati: riscontro.ok ? (riscontro.dati as T) : null,
        errori: riscontro.errori ?? [],
        codice: riscontro.codice,
      })
    })
    api.postMessage(domanda)
  })
}

// ------------------------------------------------------------ l'assistente

/** Quel che la pagina dell'assistente vede succedere mentre aspetta. */
// Esportata anche se nessun altro file la nomina: compare nella firma di
// `conversa`, che e' esportata. `npm run census` la segnala come «da rendere
// interna» perche' guarda chi la cita, non chi la puo' raggiungere per
// inferenza — e toglierle l'`export` diventerebbe un errore il giorno in cui
// `tsconfig.json` accende l'emissione dei `.d.ts`.
export interface FiloAssistente {
  /** Una procedura che il modello ha aperto, e com'è andata. */
  alAttrezzo?: (
    attrezzo: { nome: string, ok: boolean, codice?: string, messaggio?: string },
  ) => void
  /**
   * Quel che quella procedura ha letto, già diviso in colonne.
   *
   * Arriva prima della risposta, e non è la risposta: sono i dati che il
   * registro disegna da sé, così il modello non li ricopia. Vedi
   * `api/presentation.ts`.
   */
  alRisultato?: (risultato: RisultatoAssistente) => void
  /** La risposta, quando c'è tutta. */
  allaFine: (testo: string, visti?: IdVisto[]) => void
  /**
   * Il motore, non il modello: l'assistente spento, il file dei pesi mai
   * scaricato, l'attesa scaduta. E il trasporto: una risposta arrivata a metà.
   */
  alGuasto: (errori: string[]) => void
}

/**
 * Manda una domanda all'assistente e segue quel che succede.
 *
 * Non torna una promessa e non passa da `segnaAttesa`: un giro dura decine di
 * secondi, e il filo di lavoro in cima al pannello — che esiste per dire «il
 * registro sta ancora scrivendo» — resterebbe acceso per tutto quel tempo, su
 * una pagina che ha già la propria attesa disegnata dentro di sé.
 *
 * Torna il gesto per smettere di ascoltare: la conversazione dall'altra parte
 * va avanti — il modello non si ferma perché nessuno guarda — ma quel che
 * torna non tocca più una pagina che nel frattempo è cambiata.
 */
/**
 * Un filo aperto: come si riconosce, quanto se n'è visto, come si chiude.
 *
 * `visti` sta qui e non nella pagina, ed è il difetto per cui questa forma
 * esiste. Il conto serve a riprendere un giro da un'altra finestra — l'host
 * riconsegna «da quel numero in poi» — ma lo teneva chi *disegnava*, cioè
 * `chat.ts`, e chi disegna vede solo gli eventi che questa funzione gli passa.
 * Ogni evento scartato qui — un campo mancante, un `'pezzo'` che nessuno
 * gestisce — l'host se l'era già segnato e la pagina no: al riallineamento il
 * numero era troppo basso, e attrezzi e tabelle si riscrivevano due volte sotto
 * la stessa risposta. Qui si conta **ogni messaggio del giro**, riconosciuto o
 * no, che è esattamente quel che l'host mette in `giro.eventi`.
 */
export interface FiloAperto {
  /** L'id della busta con cui l'host riconosce questo filo. */
  id: number
  /** Quanti eventi del giro sono arrivati fin qui, riconosciuti o no. */
  visti: () => number
  /** Smetti di ascoltare: il giro dall'altra parte va avanti lo stesso. */
  smetti: () => void
}

function ascoltaFilo (id: number, filo: FiloAssistente, da = 0): FiloAperto {
  let visti = da
  conversazioniInAttesa.set(id, (messaggio) => {
    // Il conto prima di ogni smistamento, e una volta sola: vedi `FiloAperto`.
    visti += 1
    if (messaggio.evento === 'attrezzo') {
      // Un evento senza il suo campo è un guasto di trasporto, non un evento
      // vuoto: scartarlo in silenzio lasciava una pastiglia in meno sotto la
      // risposta e nessuna traccia da nessuna parte.
      if (!messaggio.attrezzo) {
        console.error('[assistente] «attrezzo» senza attrezzo', messaggio)
        return
      }
      filo.alAttrezzo?.(messaggio.attrezzo)
      return
    }
    if (messaggio.evento === 'risultato') {
      if (!messaggio.risultato) {
        console.error('[assistente] «risultato» senza risultato', messaggio)
        return
      }
      filo.alRisultato?.(messaggio.risultato)
      return
    }
    if (messaggio.evento === 'guasto') {
      filo.alGuasto(messaggio.errori ?? ['L’assistente non ha risposto.'])
      return
    }
    if (messaggio.evento === 'fine') {
      // «Senza testo» e «testo vuoto» sono due cose diverse, e confonderle era
      // il silenzio peggiore di questo percorso: un `fine` troncato o con il
      // protocollo disallineato diventava `''`, e `chat.ts` ci scriveva sopra
      // «Non sono riuscito a rispondere con quel che ho letto» — cioè una frase
      // **plausibile del modello** per un guasto del trasporto. Chi legge dà la
      // colpa alla domanda e la rifà uguale.
      if (typeof messaggio.testo !== 'string') {
        console.error('[assistente] «fine» senza testo', messaggio)
        filo.alGuasto(['La risposta si è persa per strada: l’assistente non ha detto niente. Rifai la domanda.'])
        return
      }
      filo.allaFine(messaggio.testo, messaggio.visti)
      return
    }
    // `'pezzo'` il protocollo lo dichiara e nessuno lo gestisce: lo streaming è
    // spento finché ci sono attrezzi in tavola. Non è un guasto — è un evento
    // che si sa di non disegnare — ma **si conta**, perché l'host lo conta.
    if (messaggio.evento === 'pezzo') return
    console.error('[assistente] evento sconosciuto', messaggio)
  })
  return {
    id,
    visti: () => visti,
    smetti: () => conversazioniInAttesa.delete(id),
  }
}

export function conversa (
  storia: Conversazione['storia'],
  filo: FiloAssistente,
  /**
   * Dove si sta guardando, adesso.
   *
   * Viaggia **con la domanda** e non per il canale di prima: vedi
   * `Conversazione.contesto` nel protocollo. `undefined` vuol dire «non lo so
   * comporre» — è la finestra staccata — e l'host ricade su quel che il
   * pannello gli ha mandato per ultimo.
   */
  contesto?: Conversazione['contesto'],
  /**
   * Gli id che questa conversazione ha già incontrato leggendo.
   *
   * Li tiene la pagina, nei turni, e li rimanda a ogni domanda: è così che «e
   * quante ne ha Bernasconi?» non costringe a rifare la ricerca per nome. Vedi
   * `IdVisto` nel protocollo.
   */
  visti?: Conversazione['visti'],
): FiloAperto {
  contatore += 1
  const id = contatore
  const busta: Conversazione = {
    id,
    storia,
    ...(contesto !== undefined ? { contesto } : {}),
    ...(visti && visti.length > 0 ? { visti } : {}),
  }
  const aperto = ascoltaFilo(id, filo)
  api.postMessage(busta)
  return aperto
}

/**
 * Riprende una domanda già partita, che l'host tiene da parte.
 *
 * È l'altra metà dello spostamento fra il riquadro e la finestra: la
 * conversazione arriva scritta nei turni, e questa arriva **viva** — la rotella
 * che gira, gli attrezzi che passano, la risposta quando arriva. Non si manda
 * di nuovo la domanda: il modello la sta già leggendo, e chiederla due volte
 * vorrebbe dire due risposte, il doppio dell'attesa e nessun modo di sapere
 * quale delle due tenere.
 *
 * `da` è quanti eventi aveva già ricevuto chi ha consegnato: l'host riconsegna
 * da lì in poi, così gli attrezzi già disegnati non si scrivono due volte sotto
 * la stessa risposta.
 */
export function riprendiConversazione (
  giro: number,
  da: number,
  filo: FiloAssistente,
): FiloAperto {
  contatore += 1
  const id = contatore
  const busta: SeguiConversazione = { segui: giro, id, da }
  // Il conto riparte da `da` e non da zero: quegli eventi li ha visti chi ha
  // consegnato, e sono già disegnati nei turni arrivati insieme alla busta.
  // Ricominciando da capo, una seconda consegna li avrebbe chiesti di nuovo.
  const aperto = ascoltaFilo(id, filo, da)
  api.postMessage(busta)
  return aperto
}

// ------------------------------------------------------------- la dettatura

/**
 * Com'è andata: la frase detta, o la riga da mettere sotto la casella.
 *
 * Esportata anche se nessun altro file la nomina, come `FiloAssistente` e per
 * la stessa ragione: compare nella firma di `detta`, e `npm run census`
 * guarda chi la cita e non chi la può raggiungere per inferenza.
 */
interface EsitoDettatura {
  ok: boolean
  testo: string
  motivo: string
}

/**
 * Manda al microfono quel che si è registrato e aspetta la frase.
 *
 * Una promessa e non un filo di eventi — al contrario di `conversa` — perché
 * qui torna una cosa sola: non c'è niente da mostrare mentre si aspetta se non
 * «sto trascrivendo», e quello lo sa già chi ha premuto.
 *
 * L'eccezione è `alCorredo`, e c'è per un caso solo: la **prima** dettatura di
 * una macchina su cui whisper non c'è ancora. Lì il registro se lo va a
 * prendere, e quella è l'unica attesa di questa funzione che si misura in
 * minuti invece che in secondi. Passata la prima volta non scatta mai più.
 *
 * Non passa da `segnaAttesa`, come la conversazione e per la stessa ragione: il
 * filo di lavoro in cima al pannello direbbe che il registro sta scrivendo
 * mentre invece sta soltanto ascoltando, e la pagina ha la propria attesa
 * disegnata dentro di sé.
 */
export function detta (
  campioni: Int16Array,
  frequenza: number,
  alCorredo?: (avanzamento: {
    titolo: string
    byte: number
    totale: number
    finito: boolean
  }) => void,
): Promise<EsitoDettatura> {
  contatore += 1
  const id = contatore
  const busta: Dettatura = { id, campioni, frequenza }
  return new Promise<EsitoDettatura>((risolvi) => {
    if (alCorredo) {
      corrediInAttesa.set(id, (messaggio) => {
        alCorredo({
          titolo: messaggio.titolo,
          byte: messaggio.byte,
          totale: messaggio.totale,
          finito: messaggio.finito === true,
        })
      })
    }
    dettatureInAttesa.set(id, (messaggio) => {
      risolvi({
        ok: messaggio.ok,
        testo: messaggio.testo ?? '',
        motivo: messaggio.motivo ?? 'La trascrizione non è riuscita.',
      })
    })
    api.postMessage(busta)
  })
}

/**
 * Le due buste che manda **solo** la finestra staccata dell'assistente.
 *
 * Sono qui e non in `Azione` perché non sono azioni del registro: una dice
 * «sono in piedi» e l'altra consegna la conversazione a chi la riprende.
 *
 * Il tipo dichiarato serve a chi **scrive** da questa parte e non protegge
 * niente dall'altra: sparisce alla compilazione, e questa resta l'unica porta
 * del ponte che non passa da un contratto. La riga che la chiude sta dove la
 * busta arriva — `convalidaTurni` in `panels/assistant.ts` — e non qui.
 */
type BustaAssistente =
  | { pronto: true }
  // La mezza domanda torna indietro con la conversazione: chi riattacca
  // mentre sta scrivendo si ritrova nel riquadro quel che aveva battuto.
  //
  // E con loro la domanda a cui il modello sta ancora rispondendo: `giro` dice
  // quanti eventi questa finestra ha già visto, e l'host tiene il filo da parte
  // per il riquadro che lo riprende. Vedi `panels/conversation.ts`.
  | { riattacca: TurnoAssistente[], bozza?: string, giro?: GiroAssistente }

/**
 * Manda una busta senza aspettare risposta.
 *
 * Non conta come lavoro in corso: quel che torna arriva come
 * `MessaggioStatoAssistente`, quando l'host ha qualcosa da dire, e non come
 * risposta a questa.
 */
export function manda (busta: BustaAssistente): void {
  api.postMessage(busta)
}

/** Ascolta i messaggi spinti dall'host (stato, navigazione, notifiche). */
export function ascolta (ascoltatore: Ascoltatore): () => void {
  ascoltatori.add(ascoltatore)
  return () => ascoltatori.delete(ascoltatore)
}

/**
 * Memoria del pannello fra una ricostruzione e l'altra: la conserva il
 * preload, e ci si ritrova dove si era.
 */
export function leggiStatoPersistito<T> (): T | null {
  return (api.getState() as T) ?? null
}

export function scriviStatoPersistito (stato: unknown): void {
  api.setState(stato)
}
