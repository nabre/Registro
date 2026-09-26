// Una domanda all'assistente e gli eventi che tornano, comune al riquadro e
// alla finestra staccata. Nessuna coda: le conversazioni non scrivono (lo
// garantisce `api/transports/assistant.ts`).
//
// Un giro vive qui, non nella pagina: quando la conversazione cambia finestra
// si sospende (`sospendiGiroInCorso`) e la nuova lo riprende dall'evento in
// cui l'altra si era fermata (`riprendiGiro`). Un giro sospeso scade, perché
// contiene dati della classe. «Ferma» tira l'`AbortController` del giro, fino
// al motore.

import { conversa } from '../api/transports/assistant.js'
import type { Archivio } from '../data/archive.js'
import type { Conversazione, MessaggioAssistente } from '../protocol.js'

/** Un evento del giro senza il suo destinatario: l'`id` lo mette chi ascolta. */
type EventoGiro = Omit<MessaggioAssistente, 'tipo' | 'id'>

/** Da quale pagina viene un giro: le due possono avere giri vivi insieme. */
type OrigineGiro = 'riquadro' | 'finestra'

interface Giro {
  /** L'id della busta con cui chi ascolta adesso riconosce questo filo. */
  id: number
  /** La pagina che tiene il giro adesso; cambia quando un'altra lo riprende. */
  origine: OrigineGiro
  /** Dove scrivere, o `null` mentre il giro sta cambiando finestra. */
  invia: ((messaggio: MessaggioAssistente) => void) | null
  /** Tutti gli eventi emessi, in ordine: chi riprende dice da quale ripartire. */
  eventi: EventoGiro[]
  /** Risposta arrivata: resta da parte finché qualcuno la prende. */
  finito: boolean
  scadenza: ReturnType<typeof setTimeout> | null
  /** Il freno del giro, tirato da «Ferma», fino al motore. */
  freno: AbortController
  /**
   * Fermato: quel che arriva non va a nessuno. Distinto da `invia === null`,
   * che vuol dire anche «sta cambiando finestra».
   */
  fermato: boolean
}

/** I giri vivi, per numero: riquadro e finestra possono averne uno ciascuno. */
const giri = new Map<number, Giro>()
let contatore = 0

/** Quanto si tiene un giro sospeso: lo spostamento dura meno di un secondo. */
const SCADENZA_SOSPESO = 60_000

/**
 * Quanto si tiene un giro finito mentre qualcuno ascoltava: l'azione «Stacca»
 * può essere ancora in coda dietro le scritture, e la pagina aver già smesso.
 */
const SCADENZA_CONSEGNATO = 30_000

function scarta (chiave: number): void {
  const giro = giri.get(chiave)
  if (giro?.scadenza) clearTimeout(giro.scadenza)
  giri.delete(chiave)
}

/** Butta il giro dopo `quanto`; il timer è `unref`, non trattiene la chiusura. */
function programmaScadenza (chiave: number, quanto: number): void {
  const giro = giri.get(chiave)
  if (!giro) return
  if (giro.scadenza) clearTimeout(giro.scadenza)
  const scadenza = setTimeout(() => scarta(chiave), quanto)
  ;(scadenza as { unref?: () => void }).unref?.()
  giro.scadenza = scadenza
}

/**
 * Manda un evento a chi ascolta e lo segna sempre: la pagina può aver smesso di
 * ascoltare senza che l'host lo sappia ancora.
 */
function emetti (chiave: number, evento: EventoGiro): void {
  const giro = giri.get(chiave)
  // Fermato: non è un guasto, niente console.
  if (giro?.fermato) return
  if (!giro) {
    // Scaduto mentre il modello parlava: si dice, sennò la risposta svanisce muta.
    console.error('[assistente] evento per un giro che non c’è più', evento.evento)
    return
  }
  giro.eventi.push(evento)
  giro.invia?.({ tipo: 'assistente', id: giro.id, ...evento })
}

/** Quale giro mettere da parte, detto da chi consegna. */
interface QualeGiro {
  /** La pagina che sta consegnando la conversazione. */
  origine?: OrigineGiro
  /** L'id della busta con cui quella pagina aveva chiesto: `GiroAssistente.busta`. */
  busta?: number
  /**
   * Anche un giro già finito: la pagina aveva una domanda in volo e non ne ha
   * visto la fine.
   */
  ancheFinito?: boolean
}

/**
 * Mette da parte il giro in volo per la finestra che lo prenderà. Torna la
 * chiave per riprenderlo, o `null` se non c'era niente (il caso normale).
 */
export function sospendiGiroInCorso (quale: QualeGiro = {}): number | null {
  const candidati = [...giri.entries()]
    .filter(([, giro]) => giro.invia !== null)
    .filter(([, giro]) => quale.ancheFinito === true || !giro.finito)
    .filter(([, giro]) => quale.origine === undefined || giro.origine === quale.origine)

  // Per id della busta; senza, il più recente fra i candidati.
  const scelto = candidati.find(([, giro]) => quale.busta !== undefined && giro.id === quale.busta)
    ?? candidati.at(-1)
  if (!scelto) return null

  const [chiave, giro] = scelto
  giro.invia = null
  programmaScadenza(chiave, SCADENZA_SOSPESO)
  return chiave
}

/**
 * Riattacca un giro sospeso alla nuova finestra, riconsegnando gli eventi da
 * `da` in poi. `false` se il giro non c'è più (scaduto o host riavviato).
 */
export function riprendiGiro (
  chiave: number,
  id: number,
  da: number,
  invia: (messaggio: MessaggioAssistente) => void,
  /** La pagina che lo riprende e che da qui lo possiede; senza, non cambia. */
  origine?: OrigineGiro,
): boolean {
  const giro = giri.get(chiave)
  if (!giro || giro.fermato) return false
  if (giro.scadenza) {
    clearTimeout(giro.scadenza)
    giro.scadenza = null
  }
  giro.id = id
  giro.invia = invia
  if (origine) giro.origine = origine
  for (const evento of giro.eventi.slice(Math.max(0, da))) {
    invia({ tipo: 'assistente', id, ...evento })
  }
  // Finito e ora consegnato: non resta niente da tenere.
  if (giro.finito) scarta(chiave)
  return true
}

/**
 * Ferma un giro («Ferma»). Si cerca per id e pagina, perché le due pagine
 * numerano le buste ciascuna per sé.
 */
function fermaGiro (id: number, origine: OrigineGiro): void {
  for (const giro of giri.values()) {
    if (giro.id === id && giro.origine === origine && inAscolto(giro)) frena(giro)
  }
}

/**
 * Ferma i giri che una pagina sta aspettando (la finestra staccata che si
 * chiude). Quelli sospesi restano: li sta per riprendere l'altra pagina.
 */
export function fermaGiriDi (origine: OrigineGiro): void {
  for (const giro of giri.values()) {
    if (giro.origine === origine && inAscolto(giro)) frena(giro)
  }
}

/** Un giro ancora in volo, con qualcuno che lo sta aspettando. */
function inAscolto (giro: Giro): boolean {
  return giro.invia !== null && !giro.finito && !giro.fermato
}

function frena (giro: Giro): void {
  giro.fermato = true
  giro.invia = null
  giro.freno.abort()
}

/**
 * Porta una domanda all'assistente e rimanda gli eventi, marcati con l'`id`
 * della busta. I guasti del motore tornano come `'guasto'`, distinti da una
 * risposta del modello.
 */
export async function rispondiConversazione (
  archivio: Archivio,
  conversazione: Conversazione,
  invia: (messaggio: MessaggioAssistente) => void,
  /** Da quale pagina viene la domanda; la finestra staccata dichiara `'finestra'`. */
  origine: OrigineGiro = 'riquadro',
): Promise<void> {
  // «Ferma» arriva nella stessa busta, con l'id del giro (`Conversazione.ferma`).
  if (conversazione.ferma === true) {
    fermaGiro(conversazione.id, origine)
    return
  }

  const storia = conversazione.storia.map((turno) => ({
    // I ruoli li traduce il motore (`data/llamaCpp.ts`).
    ruolo: turno.ruolo,
    testo: turno.testo,
  }))

  contatore += 1
  const chiave = contatore
  const freno = new AbortController()
  giri.set(chiave, {
    id: conversazione.id,
    origine,
    invia,
    eventi: [],
    finito: false,
    scadenza: null,
    freno,
    fermato: false,
  })

  try {
    const esito = await conversa(archivio, {
      storia,
      // Dove si sta guardando, con la domanda (che salta la coda). La finestra
      // staccata non lo manda, e vale l'ultimo del pannello.
      ...(conversazione.contesto !== undefined ? { contesto: conversazione.contesto } : {}),
      // Gli id già visti, tenuti dalla pagina (`IdVisto`).
      ...(conversazione.visti ? { visti: conversazione.visti } : {}),
      segnale: freno.signal,
      al: (evento) => {
        if (evento.genere === 'attrezzo') {
          emetti(chiave, { evento: 'attrezzo', attrezzo: evento.attrezzo })
          return
        }
        // Il risultato impaginato parte subito: il modello è la parte lenta.
        if (evento.genere === 'risultato') {
          emetti(chiave, { evento: 'risultato', risultato: evento.risultato })
          return
        }
        // Chiamate esaurite: la risposta usa quel che si era letto (una volta per giro).
        if (evento.genere === 'limite') {
          emetti(chiave, { evento: 'limite', chiamate: evento.chiamate })
          return
        }
        // `'testo'` si ignora apposta: esce poi come `fine`, e sarebbe doppio.
        if (evento.genere !== 'testo') {
          console.error('[assistente] evento di genere sconosciuto', evento)
        }
      },
    })
    emetti(chiave, {
      evento: 'fine',
      testo: esito.testo,
      ...(esito.visti.length > 0 ? { visti: esito.visti } : {}),
      // Ripetuto sulla `fine`, nel caso il `limite` fosse sfuggito.
      ...(esito.esaurito ? { esaurito: true } : {}),
    })
  } catch (guasto) {
    // Per esteso in console; nella conversazione (non in una notifica) la riga leggibile.
    const testo = guasto instanceof Error ? guasto.message : String(guasto)
    console.error('[assistente]', guasto)
    emetti(chiave, { evento: 'guasto', errori: [testo] })
  }

  const giro = giri.get(chiave)
  // Fermato: nessuno lo riprenderà.
  if (giro?.fermato) {
    scarta(chiave)
    return
  }
  if (!giro) {
    // Scaduto mentre il modello rispondeva: la risposta non ha destinatario.
    console.error('[assistente] il giro è scaduto prima della risposta')
    return
  }
  giro.finito = true
  // Consegnato: resta ancora un po' (vedi `SCADENZA_CONSEGNATO`), perché la
  // pagina può aver smesso di ascoltare senza che lo si sappia ancora.
  if (giro.invia) programmaScadenza(chiave, SCADENZA_CONSEGNATO)
}
