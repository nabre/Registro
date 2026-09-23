// Dove si sta guardando il calendario, e come lo si sposta.
//
// Sta in un file suo perché lo leggono in due: la vista, che disegna la
// griglia, e `commands.ts`, che mette «Oggi», le frecce e le quattro modalità
// nella riga delle azioni della barra. Scritto dentro la vista, i comandi
// dovrebbero importarlo di lì — e l'elenco dei comandi finirebbe legato a una
// pagina invece che allo stato che quella pagina mostra.
//
// I pulsanti stavano nella testata della vista, sotto la barra: due file di
// comandi a tre centimetri l'una dall'altra, e quella che il registro chiama
// «le azioni di questa pagina» non conteneva le uniche azioni che quella
// pagina aveva davvero.

import { primoDelMese, oggi, sommaGiorni, sommaMesi } from '../domain/dates.js'
import type { Iso } from '../domain/models.js'
import { aggiorna, stato, type ModoCalendario } from './state.js'

/** Quante settimane si disegnano di slancio, prima e dopo il giorno scelto. */
export const SETTIMANE_ATTORNO = 8
/** Quante se ne aggiungono ogni volta che lo scorrimento arriva a un capo. */
export const SETTIMANE_IN_PIU = 8
/** A che distanza da un capo si comincia ad allungare: prima che il vuoto si veda. */
export const SOGLIA_ALLUNGA = 400

/**
 * Dove si era arrivati a scorrere la striscia dei mesi. Il pannello ridisegna
 * la vista intera a ogni modifica dello stato — una lezione trascinata, un
 * appello salvato — e senza questo la striscia tornerebbe ogni volta al punto
 * di partenza, proprio mentre si sta lavorando due mesi più in là.
 */
export const finestraMese: {
  ancora: Iso | null
  su: number
  giu: number
  scorrimento: number
} = {
  ancora: null,
  su: SETTIMANE_ATTORNO,
  giu: SETTIMANE_ATTORNO,
  scorrimento: 0,
}

/**
 * Dice alla striscia dei mesi di riportarsi sul giorno scelto al prossimo
 * disegno, invece di riprendere da dove si era arrivati a scorrere.
 *
 * Serve perché lo scorrimento è memoria dell'occhio, non dello stato: si scorre
 * due mesi più in là senza toccare nessuna cella, e il giorno scelto resta
 * quello di prima. «Oggi» in quel momento non cambierebbe niente da ricordare,
 * e il pulsante sembrerebbe rotto.
 */
function ricentraMese (): void {
  finestraMese.scorrimento = -1
}

/**
 * Di quanto si sposta una freccia: un mese nella vista a mese, una settimana
 * in tutte le altre.
 *
 * Anche nell'anno e nell'agenda si va di settimana: sono due modi di guardare
 * lo stesso periodo, e la freccia deve muovere la stessa quantità di tempo in
 * tutti e due, se no passando dall'una all'altra si perde il segno.
 */
function passoCalendario (verso: number): Iso {
  return stato.modoCalendario === 'mese'
    ? sommaMesi(primoDelMese(stato.data), verso)
    : sommaGiorni(stato.data, verso * 7)
}

/** Avanti o indietro di un passo, e la striscia si riporta sul giorno scelto. */
export function scorriCalendario (verso: number): void {
  ricentraMese()
  aggiorna({ data: passoCalendario(verso) })
}

/** Il calendario su oggi: il giorno, e la striscia che si riporta lì. */
export function vaiAOggi (): void {
  ricentraMese()
  aggiorna({ vista: 'calendario', data: oggi() })
}

/** Come si guarda il calendario: settimana, mese, anno, agenda. */
export function scegliModoCalendario (modo: ModoCalendario): void {
  // Passando al mese la striscia si riporta sul giorno scelto: chi cambia
  // modalità sta chiedendo di vedere *quel* periodo, non quello in cui si era
  // arrivati a scorrere l'ultima volta che il mese era aperto.
  if (modo === 'mese') ricentraMese()
  aggiorna({ modoCalendario: modo })
}
