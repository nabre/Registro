// Il canale verso l'extension host.
//
// `postMessage` è a senso unico: si manda e basta. Qui ogni richiesta prende un
// numero e resta in attesa in una mappa finché non torna la risposta con lo
// stesso numero — così dal lato chiamante `await invia(...)` si comporta come
// una normale chiamata, e chi salva un modulo può aspettare l'esito prima di
// chiudere la finestra.

import { notifica } from './componenti/notifiche.js'
import type { Azione, MessaggioVersoWebview, Richiesta, Risposta } from '../protocollo.js'

declare function acquireVsCodeApi (): {
  postMessage (messaggio: unknown): void
  getState (): unknown
  setState (stato: unknown): void
}

const api = acquireVsCodeApi()

let contatore = 0
const inAttesa = new Map<number, (risposta: Risposta) => void>()
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
  for (const ascoltatore of ascoltatori) ascoltatore(messaggio)
})

// ------------------------------------------------------------------ attesa

/**
 * Le azioni che non sono lavoro di nessuno: partono da sole, di continuo, e
 * segnalarle vorrebbe dire un filo che lampeggia a ogni battito dell'orologio.
 *
 * `proiezione.mira` è l'unica per ora: il pannello dice allo schermo grande
 * dove si sta guardando a ogni cambio di stato, e non è una cosa che qualcuno
 * ha chiesto e sta aspettando.
 */
const DI_FONDO = new Set<Azione['tipo']>(['proiezione.mira'])

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

/** Ascolta i messaggi spinti dall'host (stato, navigazione, notifiche). */
export function ascolta (ascoltatore: Ascoltatore): () => void {
  ascoltatori.add(ascoltatore)
  return () => ascoltatori.delete(ascoltatore)
}

/**
 * Memoria del pannello fra una ricostruzione e l'altra: VS Code la conserva
 * anche quando il webview viene scaricato, e ci si ritrova dove si era.
 */
export function leggiStatoPersistito<T> (): T | null {
  return (api.getState() as T) ?? null
}

export function scriviStatoPersistito (stato: unknown): void {
  api.setState(stato)
}
