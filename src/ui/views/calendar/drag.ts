// Il calendario: prendere un'ora con il mouse e portarla altrove.
// A parte perché attraversa le viste (settimana, mese, e «copia alla settimana
// prossima» del menu) e tiene l'unico stato fra un evento e l'altro: la lezione
// in viaggio.

import { inizioSullaGriglia, slotSullePause } from '../../../domain/breaks.js'
import { lezioniSovrapposte } from '../../../domain/calculations.js'
import { lezioniDellAnno } from '../../../domain/courses.js'
import { formattaData } from '../../../domain/dates.js'
import type { Iso, Lezione } from '../../../domain/models.js'
import { h } from '../../dom.js'
import { ancorataAIcs } from '../../externalCalendar.js'
import { notifica } from '../../components/notifications.js'
import { azione } from '../../bridge.js'
import { annoCorrente, nomeClasseDiLezione, stato } from '../../state.js'
import { testi } from './calendar.testi.js'

// ------------------------------------------------------------------ trascinamento

/*
 * Trascinando si sposta; con Ctrl (o Alt) si copia. La copia porta scaletta e
 * aula, non appello né consuntivo, che sono dell'ora svolta. Tutto si posa su
 * una griglia di minuti (`AGGANCIO_MINUTI`).
 */

/** Il minuto su cui si posa quel che si trascina: multipli di cinque. */
export const AGGANCIO_MINUTI = 5

/**
 * La lezione che si sta trascinando: `dragover` non può leggere il contenuto
 * del trasferimento, e serve per disegnare sotto il puntatore.
 */
export let trascinata: Lezione | null = null

/** Copia invece di spostare: Ctrl, Alt o Cmd. */
export function vuoleCopiare (evento: DragEvent | MouseEvent): boolean {
  return evento.ctrlKey || evento.altKey || evento.metaKey
}

/**
 * La pulizia di fine trascinamento, su `document` (come `views/pageBrowser.ts`):
 * un ridisegno durante il gesto butta via il blocco con il suo `dragend`, e
 * resterebbero `trascinata` e le colonne `.zona-posa` non cliccabili.
 */
document.addEventListener('dragend', () => {
  trascinata = null
  for (const viaggiante of document.querySelectorAll('.blocco--in-viaggio')) {
    viaggiante.classList.remove('blocco--in-viaggio')
  }
  for (const guida of document.querySelectorAll('.settimana__guida')) guida.remove()
  for (const zona of document.querySelectorAll('.zona-posa')) zona.classList.remove('zona-posa')
})

/** Rende un blocco afferrabile. Il resto — dove si posa — lo sanno le colonne. */
export function rendiTrascinabile (elemento: HTMLElement, lezione: Lezione): void {
  // Una lezione ancorata a eventi ICS non si trascina: il collegamento si ricava
  // dall'orario e si romperebbe (`ancorataAIcs`).
  if (ancorataAIcs(lezione.id)) {
    elemento.draggable = false
    elemento.classList.add('blocco--ancorata')
    // Con «Calendario ICS» spento il perché sta nel suggerimento, solo nella
    // settimana; altrove l'ICS non si nomina, ma la lezione resta ferma.
    if (stato.modoCalendario === 'settimana') {
      elemento.title = [elemento.title, testi().ancorataNonSiTrascina]
        .filter(Boolean)
        .join('\n')
    }
    return
  }
  elemento.draggable = true
  elemento.addEventListener('dragstart', (evento: DragEvent) => {
    trascinata = lezione
    elemento.classList.add('blocco--in-viaggio')
    if (!evento.dataTransfer) return
    evento.dataTransfer.effectAllowed = 'copyMove'
    // Un contenuto ci vuole comunque, o Firefox non fa partire il trascinamento.
    evento.dataTransfer.setData('text/plain', lezione.id)
  })
}

/** Porta la lezione dove la si è lasciata: stesso giorno diverso, o copia. */
export async function posa (
  lezione: Lezione,
  data: Iso,
  posata: string | undefined,
  copia: boolean,
): Promise<void> {
  // Il punto di posa va sulla griglia delle pause, così le UD cadono intere; il
  // gestore la ridispone (`slotSullePause`), qui serve per l'ora vera e le
  // sovrapposizioni.
  const giornata = stato.registro.impostazioni
  const inizio = posata && giornata.pause && !lezione.slot.some((s) => s.ics)
    ? inizioSullaGriglia(posata, giornata)
    : posata
  // Due lezioni alla stessa ora possono essere volute (gruppi, compresenza):
  // non si rifiuta, ma si avvisa.
  const proposta: Lezione = {
    ...lezione,
    // Copiando la nuova lezione non ha l'id dell'originale, altrimenti
    // `lezioniSovrapposte` la scarterebbe come se fosse se stessa.
    id: copia ? '' : lezione.id,
    data,
    slot: inizio ? slotSullePause(lezione.slot, giornata, inizio) : lezione.slot,
  }
  // Tutte le lezioni dell'anno, non solo le visibili: il filtro classe
  // nasconderebbe lo scontro con un'altra classe.
  const scontri = lezioniSovrapposte(
    lezioniDellAnno(stato.registro, annoCorrente()?.id ?? null),
    proposta,
  )

  // Il rifiuto lo dice `azione`.
  const risposta = await azione(
    copia
      ? { tipo: 'lezione.duplica', lezioneId: lezione.id, data, ...(inizio ? { inizio } : {}) }
      : { tipo: 'lezione.sposta', lezioneId: lezione.id, data, ...(inizio ? { inizio } : {}) },
  )
  if (!risposta.ok) return
  const t = testi()
  const quando = t.quando(formattaData(data, 'giorno'), inizio)
  if (scontri.length > 0) {
    const sopra = t.sopra(scontri.map((l) => nomeClasseDiLezione(l)).join(', '))
    notifica(t.posata(copia, quando, sopra), 'avviso')
  } else {
    notifica(t.posata(copia, quando, ''), 'successo')
  }
  // Si resta nel calendario, senza aprire la copia: chi copia sta riempiendo la settimana.
}

/**
 * La riga che mostra dove finirà la lezione, dentro la colonna sorvolata.
 * Vive fuori dal ciclo di ridisegno: nasce e muore con il trascinamento.
 */
export function guida (
  colonna: HTMLElement,
  minuto: number,
  fascia: { primaOra: number, ultimaOra: number },
  copia: boolean,
): void {
  let riga = colonna.querySelector<HTMLElement>('.settimana__guida')
  if (!riga) {
    riga = h('span', { class: 'settimana__guida' })
    colonna.appendChild(riga)
  }
  // Dalla frazione della colonna vera, come `oraSotto`: la colonna si allunga
  // con la finestra, e una scala fissa indicherebbe un'altra ora.
  const durata = fascia.ultimaOra - fascia.primaOra
  const frazione = durata > 0 ? (minuto - fascia.primaOra) / durata : 0
  riga.style.top = `${(frazione * 100).toFixed(3)}%`
  riga.classList.toggle('settimana__guida--copia', copia)
}
