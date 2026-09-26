// Il canale verso l'host. `postMessage` è a senso unico: ogni richiesta prende
// un numero e aspetta in una mappa la risposta con lo stesso numero, così
// `await invia(...)` si comporta come una chiamata normale.

import { notifica } from './components/notifications.js'
import { testi } from './bridge.testi.js'
import type {
  Azione,
  Conversazione,
  Dettatura,
  GiroAssistente,
  IdVisto,
  TurnoAssistente,
  Domanda,
  MessaggioAssistente,
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
 * Le domande in volo, in una mappa a sé: un dato e non un esito, e tenerle
 * insieme costerebbe un `any` proprio dove il dato entra in una vista.
 */
const domandeInAttesa = new Map<number, (riscontro: Riscontro) => void>()
/**
 * I fili di conversazione con l'assistente: tornano più messaggi per filo
 * (attrezzi, fine), quindi chi ascolta riceve ogni volta invece di risolvere.
 */
const conversazioniInAttesa = new Map<number, (messaggio: MessaggioAssistente) => void>()
/** Le dettature in volo: una risposta sola, ma di un tipo suo. */
const dettatureInAttesa = new Map<number, (messaggio: MessaggioDettatura) => void>()
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
      risolvi(messaggio)
    }
    return
  }
  if (messaggio.tipo === 'assistente') {
    // Chi ascolta resta iscritto fino a `fine` o `guasto`: un filo porta più eventi.
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
 * Le azioni di fondo, che partono da sole a ogni cambio di stato e non
 * accendono il filo: dove si guarda, detto allo schermo grande
 * (`proiezione.mira`) e all'assistente (`assistente.contesto`). Il secondo è
 * una scrittura in coda che la domanda salta: la veduta viaggia dentro la
 * busta (`Conversazione.contesto`), e questo canale resta per la finestra
 * staccata.
 */
const DI_FONDO = new Set<Azione['tipo']>(['proiezione.mira', 'assistente.contesto'])

/**
 * Quante richieste sono partite e non tornate: le legge il filo di lavoro.
 * Sta nel canale perché deve sopravvivere ai ridisegni.
 */
let inCorso = 0
/**
 * Il filo si accende dopo un quarto di secondo: quasi tutte le azioni tornano
 * in pochi millisecondi, e accenderlo a ogni clic sarebbe uno sfarfallio.
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
 * Manda un'azione e aspetta l'esito. Non rifiuta mai: gli errori stanno in
 * `Risposta.errori` e restano a chi chiama (di solito un modulo; chi non ha
 * dove metterli usa `azione`). Il messaggio dell'host lo mostra questa funzione.
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
 * Come `invia`, ma un rifiuto lo notifica da sé: per i comandi senza un modulo
 * in cui mostrare l'errore.
 */
export async function azione (comando: Azione): Promise<Risposta> {
  const risposta = await invia(comando)
  if (!risposta.ok) {
    notifica((risposta.errori ?? [testi().nonRiuscito]).join(' '), 'errore')
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
 * Chiede qualcosa al registro senza cambiarlo. Il tipo lo dichiara chi chiama;
 * dall'altra parte lo schema d'uscita è convalidato. Non mostra niente da sé:
 * una lettura fallita di solito si disegna nel suo riquadro. `diFondo` è per
 * le letture che nessuno aspetta e non accendono il filo (come `DI_FONDO`).
 */
export function chiedi<T> (
  procedura: string,
  ingresso?: unknown,
  opzioni: { diFondo?: boolean } = {},
): Promise<Esito<T>> {
  contatore += 1
  const id = contatore
  const domanda: Domanda = { id, procedura, ingresso }
  const conta = !opzioni.diFondo
  if (conta) segnaAttesa(1)
  return new Promise<Esito<T>>((risolvi) => {
    domandeInAttesa.set(id, (riscontro) => {
      if (conta) segnaAttesa(-1)
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
// Esportata perché compare nella firma di `conversa`: `npm run census` la
// segnala come interna perché guarda chi la cita, non chi la raggiunge.
export interface FiloAssistente {
  /** Una procedura che il modello ha aperto, e com'è andata. */
  alAttrezzo?: (
    attrezzo: { nome: string, ok: boolean, codice?: string, messaggio?: string },
  ) => void
  /**
   * I dati letti da quella procedura, già in colonne: arrivano prima della
   * risposta e il registro li disegna da sé (vedi `api/presentation.ts`).
   */
  alRisultato?: (risultato: RisultatoAssistente) => void
  /**
   * Il motore ha finito le chiamate concesse per una domanda: la risposta che
   * arriva è scritta con quel che si era letto fin lì. `chiamate` è quante.
   */
  alLimite?: (chiamate: number) => void
  /**
   * La risposta, quando c'è tutta. `esaurito` è lo stesso fatto di `alLimite`,
   * detto con la fine: vedi `MessaggioAssistente.esaurito`.
   */
  allaFine: (testo: string, visti?: IdVisto[], esaurito?: boolean) => void
  /** Un guasto del motore (spento, pesi mancanti, attesa scaduta) o del trasporto. */
  alGuasto: (errori: string[]) => void
}

/**
 * Un filo aperto: come si riconosce, quanti eventi ha visto, come si chiude.
 * `visti` conta qui ogni messaggio del giro, riconosciuto o no, come fa l'host
 * in `giro.eventi`: serve a riprendere il giro da un'altra finestra senza
 * ridisegnare due volte attrezzi e tabelle.
 */
export interface FiloAperto {
  /** L'id della busta con cui l'host riconosce questo filo. */
  id: number
  /** Quanti eventi del giro sono arrivati fin qui, riconosciuti o no. */
  visti: () => number
  /**
   * Smetti di ascoltare; il giro dall'altra parte va avanti. Per chi consegna la
   * domanda a un'altra finestra; per smettere davvero c'è `ferma`.
   */
  smetti: () => void
  /**
   * Smetti di ascoltare e di' all'host di fermare il giro: il modello non deve
   * continuare a leggere per una risposta che nessuno leggerà.
   */
  ferma: () => void
}

function ascoltaFilo (id: number, filo: FiloAssistente, da = 0): FiloAperto {
  let visti = da
  conversazioniInAttesa.set(id, (messaggio) => {
    // Il conto prima di ogni smistamento, e una volta sola: vedi `FiloAperto`.
    visti += 1
    if (messaggio.evento === 'attrezzo') {
      // Un evento senza il suo campo è un guasto di trasporto: si registra.
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
    if (messaggio.evento === 'limite') {
      filo.alLimite?.(messaggio.chiamate ?? 0)
      return
    }
    if (messaggio.evento === 'guasto') {
      filo.alGuasto(messaggio.errori ?? [testi().assistenteMuto])
      return
    }
    if (messaggio.evento === 'fine') {
      // Senza testo non è testo vuoto: è un guasto del trasporto, e non va
      // travestito da risposta del modello.
      if (typeof messaggio.testo !== 'string') {
        console.error('[assistente] «fine» senza testo', messaggio)
        filo.alGuasto([testi().rispostaPersa])
        return
      }
      filo.allaFine(messaggio.testo, messaggio.visti, messaggio.esaurito === true)
      return
    }
    // `'pezzo'` non si disegna (lo streaming è spento con gli attrezzi), ma si
    // conta perché l'host lo conta.
    if (messaggio.evento === 'pezzo') return
    console.error('[assistente] evento sconosciuto', messaggio)
  })
  const smetti = (): void => {
    conversazioniInAttesa.delete(id)
  }
  return {
    id,
    visti: () => visti,
    smetti,
    ferma: () => {
      smetti()
      // La stessa busta della domanda, con `ferma` (vedi `Conversazione.ferma`).
      const busta: Conversazione = { id, storia: [], ferma: true }
      api.postMessage(busta)
    },
  }
}

/**
 * Manda una domanda all'assistente e segue quel che succede. Non passa da
 * `segnaAttesa`: un giro dura decine di secondi e la pagina ha la sua attesa.
 * Torna il filo aperto, da lasciare con `smetti` o `ferma`.
 */
export function conversa (
  storia: Conversazione['storia'],
  filo: FiloAssistente,
  /**
   * Dove si sta guardando adesso: viaggia con la domanda
   * (`Conversazione.contesto`). `undefined` (la finestra staccata) fa ricadere
   * l'host sull'ultimo contesto mandato dal pannello.
   */
  contesto?: Conversazione['contesto'],
  /**
   * Gli id già incontrati in questa conversazione (`IdVisto`): rimandati a ogni
   * domanda, evitano di rifare la ricerca per nome.
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
 * Riprende una domanda già partita che l'host tiene da parte, quando la
 * conversazione passa fra riquadro e finestra. Non la rimanda: si avrebbero due
 * risposte. `da` è quanti eventi ha già visto chi ha consegnato: l'host
 * riconsegna da lì.
 */
export function riprendiConversazione (
  giro: number,
  da: number,
  filo: FiloAssistente,
): FiloAperto {
  contatore += 1
  const id = contatore
  const busta: SeguiConversazione = { segui: giro, id, da }
  // Il conto riparte da `da`: quegli eventi sono già disegnati nei turni consegnati.
  const aperto = ascoltaFilo(id, filo, da)
  api.postMessage(busta)
  return aperto
}

// ------------------------------------------------------------- la dettatura

/** Com'è andata una dettatura: la frase, o la riga da mettere sotto la casella. */
interface EsitoDettatura {
  ok: boolean
  testo: string
  motivo: string
}

/**
 * Manda al microfono quel che si è registrato e aspetta la frase. Una promessa,
 * perché torna una cosa sola; non passa da `segnaAttesa`, perché la pagina ha
 * la sua attesa e il registro non sta scrivendo.
 */
export function detta (
  campioni: Int16Array,
  frequenza: number,
): Promise<EsitoDettatura> {
  contatore += 1
  const id = contatore
  const busta: Dettatura = { id, campioni, frequenza }
  return new Promise<EsitoDettatura>((risolvi) => {
    dettatureInAttesa.set(id, (messaggio) => {
      risolvi({
        ok: messaggio.ok,
        testo: messaggio.testo ?? '',
        motivo: messaggio.motivo ?? testi().trascrizioneFallita,
      })
    })
    api.postMessage(busta)
  })
}

/**
 * Le buste che manda solo la finestra staccata dell'assistente: non sono azioni
 * del registro. Il tipo non protegge l'altra parte: il controllo sta dove la
 * busta arriva (`convalidaTurni` in `panels/assistant.ts`).
 */
type BustaAssistente =
  | { pronto: true }
  // Con la conversazione tornano la bozza e il giro ancora in corso (`giro`:
  // eventi già visti), che l'host tiene per il riquadro (`panels/conversation.ts`).
  | { riattacca: TurnoAssistente[], bozza?: string, giro?: GiroAssistente }

/**
 * Manda una busta senza aspettare risposta: quel che torna arriva come
 * `MessaggioStatoAssistente`.
 */
export function manda (busta: BustaAssistente): void {
  api.postMessage(busta)
}

/** Ascolta i messaggi spinti dall'host (stato, navigazione, notifiche). */
export function ascolta (ascoltatore: Ascoltatore): () => void {
  ascoltatori.add(ascoltatore)
  return () => ascoltatori.delete(ascoltatore)
}

/** Memoria del pannello fra una ricostruzione e l'altra, conservata dal preload. */
export function leggiStatoPersistito<T> (): T | null {
  return (api.getState() as T) ?? null
}

export function scriviStatoPersistito (stato: unknown): void {
  api.setState(stato)
}
