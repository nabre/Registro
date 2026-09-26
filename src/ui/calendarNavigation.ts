// Dove si sta guardando il calendario, e come lo si sposta. File a sé perché lo
// leggono la vista e `commands.ts` («Oggi», frecce, modalità), senza legare i
// comandi a una pagina.

import { oggi, sommaGiorni, sommaMesi } from '../domain/dates.js'
import type { Iso } from '../domain/models.js'
import { aggiorna, classeDelCorsoId, stato, type ModoCalendario } from './state.js'

/** Quante settimane si disegnano di slancio, prima e dopo il giorno scelto. */
export const SETTIMANE_ATTORNO = 8
/** Quante se ne aggiungono ogni volta che lo scorrimento arriva a un capo. */
export const SETTIMANE_IN_PIU = 8
/** A che distanza da un capo si comincia ad allungare: prima che il vuoto si veda. */
export const SOGLIA_ALLUNGA = 400

/**
 * Dove si era arrivati a scorrere la striscia dei mesi: la vista si ridisegna a
 * ogni modifica dello stato, e la striscia non deve tornare al punto di partenza.
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
 * Se la settimana, al prossimo disegno, deve scorrere fino all'ora di adesso.
 * Lo chiede solo «Oggi»; gli altri disegni tengono lo scorrimento ricordato. La
 * vista lo consuma e lo rimette a falso.
 */
export const finestraSettimana: { versoAdesso: boolean } = { versoAdesso: false }

/**
 * Riporta la striscia dei mesi sul giorno scelto al prossimo disegno. Serve
 * perché lo scorrimento non è nello stato: si può scorrere lontano senza
 * cambiare il giorno scelto.
 */
function ricentraMese (): void {
  finestraMese.scorrimento = -1
}

/**
 * Di quanto si sposta una freccia: un mese nella vista a mese, una settimana
 * nelle altre (anno e agenda compresi, per non perdere il segno passando
 * dall'una all'altra). Il mese tiene il giorno: il 17 marzo va al 17 aprile, e
 * un 31 che manca diventa l'ultimo del mese (`sommaMesi`).
 */
function passoCalendario (verso: number): Iso {
  return stato.modoCalendario === 'mese'
    ? sommaMesi(stato.data, verso)
    : sommaGiorni(stato.data, verso * 7)
}

/** Avanti o indietro di un passo, e la striscia si riporta sul giorno scelto. */
export function scorriCalendario (verso: number): void {
  ricentraMese()
  aggiorna({ data: passoCalendario(verso) })
}

/**
 * Il calendario su oggi: il giorno, la striscia che si riporta lì, e nella
 * settimana l'ora di adesso in vista.
 */
export function vaiAOggi (): void {
  ricentraMese()
  // Solo se il disegno che segue è una settimana: acceso nel mese, aspetterebbe
  // e farebbe saltare la prima settimana aperta dopo.
  finestraSettimana.versoAdesso = stato.modoCalendario === 'settimana'
  aggiorna({ vista: 'calendario', data: oggi() })
}

/** Come si guarda il calendario: settimana, mese, anno, agenda. */
export function scegliModoCalendario (modo: ModoCalendario): void {
  // Passando al mese la striscia si riporta sul giorno scelto.
  if (modo === 'mese') ricentraMese()
  aggiorna({ modoCalendario: modo })
}

/**
 * Apre un momento di valutazione nella sua pagina. Conta il corso: la pagina
 * dei voti mostra un corso alla volta e tiene la prova solo se è di quel corso.
 * La classe segue il corso; un corso senza classe lascia il filtro com'era.
 */
export function apriMomento (momento: { id: string, corsoId: string }): void {
  aggiorna({
    vista: 'valutazioni',
    valutazioneId: momento.id,
    corsoId: momento.corsoId,
    filtroClasseId: classeDelCorsoId(momento.corsoId)?.id ?? stato.filtroClasseId,
  })
}
