// Indietro e avanti fra le pagine del registro, come in un browser: Alt+← / Alt+→
// e i tasti laterali del mouse (`shortcuts.ts`) percorrono la fila dei posti.
// La fila la riempie `vai` (`seguiPosti`): ogni strada che cambia posto passa
// di lì.

import { ricordaScorrimenti } from './dom.js'
import { chiaveDelPosto, completa, type Completato, type Posto } from './place.js'
import {
  aggiorna,
  inBlocco,
  ridisegna,
  seguiPosti,
  stato,
  vai,
  type ModoStoria,
} from './state.js'
import type { Iso } from '#core/dominio/models.js'

type Scorrimenti = ReturnType<typeof ricordaScorrimenti>

interface Voce {
  /** `chiaveDelPosto`: la stessa di `data-scorrimento` (`shell.ts`), così tornando si ritrova lo scorrimento. */
  chiave: string
  posto: Posto
  /** Il giorno guardato: tornando, il calendario si rimette lì. */
  giorno: Iso
  /** Dov'era arrivato l'occhio quando ce ne siamo andati. */
  scorrimenti: Scorrimenti
}

/** Quante voci si tengono: nessuno torna indietro di cinquanta passi. */
const MASSIMO = 50

const fila: Voce[] = []
/** Dove si è nella fila: l'ultima voce, salvo dopo un «indietro». */
let indice = -1
/** Gli scorrimenti da rimettere al prossimo disegno, dopo un passo nella fila. */
let daRitrovare: Scorrimenti | null = null

/** Svuota la fila: in un altro documento i posti di prima puntano a id che non ci sono. */
export function azzeraStoria (): void {
  fila.length = 0
  indice = -1
  daRitrovare = null
}

/**
 * Mette in fila il posto raggiunto, se è nuovo. Gira prima del disegno (che
 * aspetta il fotogramma), quindi lo scorrimento della pagina lasciata si legge
 * ancora dal DOM.
 */
function segui (fatto: Completato, storia: ModoStoria, giornoLasciato: Iso): void {
  if (!stato.caricato) return
  const chiave = chiaveDelPosto(fatto.posto)
  const qui = fila[indice]
  // Un passo ha già spostato l'indice: la voce si rinfresca col posto completato.
  if (storia === 'passo' || qui?.chiave === chiave) {
    if (qui) Object.assign(qui, { chiave, posto: fatto.posto, giorno: stato.data })
    return
  }
  if (storia === 'sostituisci' && qui) {
    Object.assign(qui, { chiave, posto: fatto.posto, giorno: stato.data })
    return
  }
  if (qui) {
    qui.scorrimenti = ricordaScorrimenti()
    qui.giorno = giornoLasciato
  }
  // Andando altrove da un posto raggiunto con «indietro», l'«avanti» si perde.
  fila.splice(indice + 1)
  fila.push({ chiave, posto: fatto.posto, giorno: stato.data, scorrimenti: new Map() })
  if (fila.length > MASSIMO) fila.splice(0, fila.length - MASSIMO)
  indice = fila.length - 1
}

/** Aggancia la fila ai posti raggiunti. Una volta, all'avvio del pannello. */
export function installaCammino (): void {
  seguiPosti(segui)
}

/**
 * Se la voce si ritrova ancora così com'era: se `completa` la porterebbe
 * altrove (l'ora cancellata, la persona uscita), si salta.
 */
function ritrovabile (voce: Voce): boolean {
  const fatto = completa(voce.posto, stato.contesto, stato.registro, stato.adessoData, {
    semestreId: stato.semestreId,
    filtroCorsoAgendaId: stato.filtroCorsoAgendaId,
  })
  return chiaveDelPosto(fatto.posto) === voce.chiave
}

/** Un passo nella fila: -1 indietro, +1 avanti. Vero se si è mossa. */
function passo (verso: -1 | 1): boolean {
  const qui = fila[indice]
  if (!qui) return false
  let arrivo = indice + verso
  while (fila[arrivo] && !ritrovabile(fila[arrivo])) arrivo += verso
  const voce = fila[arrivo]
  if (!voce) return false
  qui.scorrimenti = ricordaScorrimenti()
  qui.giorno = stato.data
  indice = arrivo
  daRitrovare = voce.scorrimenti
  inBlocco(() => {
    vai(voce.posto, { storia: 'passo', giorno: voce.giorno })
    // Cambiare pagina riporta la riga delle azioni sui comandi della pagina.
    aggiorna({ schedaComandi: 'pagina' })
  })
  // `daRitrovare` si consuma al disegno, anche se il posto è quello di adesso.
  ridisegna()
  return true
}

export function indietro (): boolean {
  return passo(-1)
}

export function avanti (): boolean {
  return passo(1)
}

/**
 * Aggiunge agli scorrimenti del ridisegno quelli del posto a cui si torna. Va
 * chiamata prima di `rimpiazza`, vale una volta e solo dopo un passo nella
 * fila: altrimenti una pagina si apre dall'alto (`tests/interfaccia/scroll.spec.ts`). Rimette
 * solo le scatole che la pagina di adesso non ha: la barra laterale non
 * appartiene al posto e non deve saltare.
 */
export function conGliScorrimentiDelRitorno (scorrimenti: Scorrimenti): Scorrimenti {
  const ritorno = daRitrovare
  daRitrovare = null
  if (!ritorno || ritorno.size === 0) return scorrimenti
  const presenti = new Set<string>()
  for (const elemento of document.querySelectorAll<HTMLElement>('[data-scorrimento]')) {
    if (elemento.dataset.scorrimento) presenti.add(elemento.dataset.scorrimento)
  }
  const unione = new Map(scorrimenti)
  for (const [chiave, dove] of ritorno) {
    if (!presenti.has(chiave)) unione.set(chiave, dove)
  }
  return unione
}
