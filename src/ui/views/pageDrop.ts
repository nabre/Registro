// I bersagli su cui si lasciano cadere le pagine di un PDF da dividere: le
// caselle e le righe della matrice dell'archivio, la casella delle firme, le
// caselle della matrice delle assenze. Lo sfoglio da cui partono, e la memoria
// del volo in corso, stanno in `pageBrowser.ts`.

import { dicePagine } from '../../domain/sorting.js'
import type { Consegna, TipoRapporto } from '../../domain/models.js'
import { notifica } from '../components/notifications.js'
import { azione } from '../bridge.js'
import { aggiorna, stato } from '../state.js'
import { testi } from './pageBrowser.testi.js'
import {
  CASELLA_BERSAGLIO,
  CORPO_IN_VOLO,
  RIGA_BERSAGLIO,
  TIPO_PAGINE,
  daDoveVola,
  segnaAtterrate,
  type PagineTrascinate,
} from './pageBrowser.js'

/**
 * Toglie la scelta dopo un ritaglio riuscito, ma solo se è ancora quella di
 * partenza: nel frattempo se ne può essere fatta un'altra.
 */
function azzeraSeFerma (mandate: typeof stato.pagineScelte): void {
  if (stato.pagineScelte === mandate) aggiorna({ pagineScelte: null })
}

/** Le pagine che stanno arrivando, se quel che arriva sono pagine. */
function carico (evento: DragEvent): PagineTrascinate | null {
  const grezzo = evento.dataTransfer?.getData(TIPO_PAGINE)
  if (!grezzo) return null
  try {
    const letto = JSON.parse(grezzo) as PagineTrascinate
    if (!letto?.smistamentoId || !Array.isArray(letto.pagine) || letto.pagine.length === 0) {
      return null
    }
    return letto
  } catch {
    return null
  }
}

/** Vero se in questo trascinamento ci sono pagine da archiviare. */
export function portaPagine (evento: DragEvent): boolean {
  return [...(evento.dataTransfer?.types ?? [])].includes(TIPO_PAGINE)
}

/**
 * In quale colonna finiscono le pagine lasciate su una riga: quella della
 * richiesta a cui è agganciato il PDF. Senza aggancio `null`, e la riga non
 * prende niente: si mira la casella.
 */
function colonnaDi (smistamentoId: string | null): Consegna | null {
  if (!smistamentoId) return null
  const suo = stato.registro.smistamenti.find((s) => s.id === smistamentoId)
  if (!suo?.consegnaId) return null
  return stato.registro.consegne.find((c) => c.id === suo.consegnaId) ?? null
}

/** A chi vanno le pagine lasciate su una riga: una persona, o il foglio firme della colonna. */
type DestinazioneRiga =
  | { tipo: 'persona', allievoId: string, chi: string }
  | { tipo: 'firme' }

/**
 * Fa di una riga della matrice un bersaglio per le pagine, quando il PDF sa già
 * la sua colonna: basta dire di chi sono. La casella resta il bersaglio più
 * forte (ferma l'evento), per archiviare in un'altra colonna.
 */
export function accettaPagineSullaRiga (riga: HTMLElement, destinazione: DestinazioneRiga): void {
  /**
   * La colonna buona per questa riga, o `null`. Sulla riga delle firme la
   * richiesta deve anche chiedere un foglio firme.
   */
  const dove = (): Consegna | null => {
    const consegna = colonnaDi(daDoveVola())
    if (!consegna) return null
    if (destinazione.tipo === 'persona') {
      // La richiesta deve riguardare questa persona: altrimenti la sua casella non
      // ha `data-consegna`, e le pagine non vanno archiviate lì.
      const sua =
        consegna.a === 'classe' || consegna.allieviIds.includes(destinazione.allievoId)
      return sua ? consegna : null
    }
    return consegna.verso === 'consegno' && consegna.firmeRichieste ? consegna : null
  }

  /** La casella che prenderà davvero le pagine: si accende con la riga. */
  const casella = (consegna: Consegna | null): HTMLElement | null =>
    consegna
      ? riga.querySelector<HTMLElement>(`[data-consegna="${CSS.escape(consegna.id)}"]`)
      : null

  const acceso = (attivo: boolean, consegna: Consegna | null) => {
    riga.classList.toggle(RIGA_BERSAGLIO, attivo)
    casella(consegna)?.classList.toggle(CASELLA_BERSAGLIO, attivo)
  }

  riga.addEventListener('dragover', (evento: DragEvent) => {
    if (!portaPagine(evento)) return
    const consegna = dove()
    // Senza colonna non si prende: resta il cursore del divieto.
    if (!consegna) return
    evento.preventDefault()
    if (evento.dataTransfer) evento.dataTransfer.dropEffect = 'copy'
    acceso(true, consegna)
  })
  // Si spegne solo quando il puntatore esce davvero dalla riga: `dragleave`
  // scatta anche entrando in un figlio. `relatedTarget` è più solido di un
  // contatore, che perdendo un'uscita resterebbe sbilanciato.
  riga.addEventListener('dragleave', (evento: DragEvent) => {
    const verso = evento.relatedTarget
    if (verso instanceof Node && riga.contains(verso)) return
    acceso(false, dove())
  })
  riga.addEventListener('drop', (evento: DragEvent) => {
    const pagine = carico(evento)
    if (!pagine) return
    const consegna = dove()
    if (!consegna) return
    evento.preventDefault()
    evento.stopPropagation()
    acceso(false, consegna)
    segnaAtterrate()
    document.body.classList.remove(CORPO_IN_VOLO)

    const chi = destinazione.tipo === 'persona' ? destinazione.chi : testi().foglioFirme
    notifica(testi().ritagliando(dicePagine(pagine.pagine), `${chi} · ${consegna.testo}`), 'info')
    const mandate = stato.pagineScelte
    void azione(
      destinazione.tipo === 'persona'
        ? {
            tipo: 'smistamento.assegnaPagine',
            smistamentoId: pagine.smistamentoId,
            consegnaId: consegna.id,
            allievoId: destinazione.allievoId,
            pagine: pagine.pagine,
          }
        : {
            tipo: 'smistamento.assegnaFirme',
            smistamentoId: pagine.smistamentoId,
            consegnaId: consegna.id,
            pagine: pagine.pagine,
          },
    ).then((risposta) => {
      if (risposta.ok) azzeraSeFerma(mandate)
    })
  })
}

/**
 * Fa della casella delle firme (in cima alla matrice, di tutta la colonna) un
 * bersaglio per le pagine: il foglio firme arriva nella stessa scansione.
 * Ferma l'evento, così la riga sotto non prende le pagine.
 */
export function accettaPagineFirme (
  elemento: HTMLElement,
  destinazione: { consegnaId: string, etichetta: string },
): void {
  const acceso = (attivo: boolean) => elemento.classList.toggle(CASELLA_BERSAGLIO, attivo)

  elemento.addEventListener('dragover', (evento: DragEvent) => {
    if (!portaPagine(evento)) return
    evento.preventDefault()
    evento.stopPropagation()
    if (evento.dataTransfer) evento.dataTransfer.dropEffect = 'copy'
    acceso(true)
    spegniRiga(elemento)
  })
  elemento.addEventListener('dragleave', () => acceso(false))
  elemento.addEventListener('drop', (evento: DragEvent) => {
    const pagine = carico(evento)
    if (!pagine) return
    evento.preventDefault()
    evento.stopPropagation()
    acceso(false)
    segnaAtterrate()
    document.body.classList.remove(CORPO_IN_VOLO)

    notifica(testi().ritagliando(dicePagine(pagine.pagine), destinazione.etichetta), 'info')
    const mandate = stato.pagineScelte
    void azione({
      tipo: 'smistamento.assegnaFirme',
      smistamentoId: pagine.smistamentoId,
      consegnaId: destinazione.consegnaId,
      pagine: pagine.pagine,
    }).then((risposta) => {
      if (risposta.ok) azzeraSeFerma(mandate)
    })
  })
}

/**
 * Spegne il bersaglio di riga intorno a una casella che prende il comando: la
 * riga non vede il puntatore sulle celle (la cella ferma l'evento) e resterebbe
 * accesa.
 */
function spegniRiga (casella: HTMLElement): void {
  const riga = casella.closest('tr')
  if (!riga) return
  riga.classList.remove(RIGA_BERSAGLIO)
  for (const acceso of riga.querySelectorAll(`.${CASELLA_BERSAGLIO}`)) {
    if (acceso !== casella) acceso.classList.remove(CASELLA_BERSAGLIO)
  }
}

/**
 * Fa di una casella della matrice delle assenze un bersaglio per le pagine. La
 * casella dice anche che rapporto sono (assenze o ritardi, vergini o firmati).
 * Ferma l'evento, così non arriva alla pagina.
 */
export function accettaPagineAssenze (
  elemento: HTMLElement,
  destinazione: {
    classeId: string
    bloccoId: string
    allievoId: string
    genere: TipoRapporto
    firmato: boolean
    etichetta: string
  },
): void {
  const acceso = (attivo: boolean) => elemento.classList.toggle(CASELLA_BERSAGLIO, attivo)

  elemento.addEventListener('dragover', (evento: DragEvent) => {
    if (!portaPagine(evento)) return
    evento.preventDefault()
    evento.stopPropagation()
    if (evento.dataTransfer) evento.dataTransfer.dropEffect = 'copy'
    acceso(true)
  })
  elemento.addEventListener('dragleave', () => acceso(false))
  elemento.addEventListener('drop', (evento: DragEvent) => {
    const pagine = carico(evento)
    if (!pagine) return
    evento.preventDefault()
    evento.stopPropagation()
    acceso(false)
    segnaAtterrate()
    document.body.classList.remove(CORPO_IN_VOLO)

    notifica(testi().ritagliando(dicePagine(pagine.pagine), destinazione.etichetta), 'info')
    void azione({
      tipo: 'smistamento.assegnaAssenze',
      smistamentoId: pagine.smistamentoId,
      classeId: destinazione.classeId,
      bloccoId: destinazione.bloccoId,
      allievoId: destinazione.allievoId,
      genere: destinazione.genere,
      firmato: destinazione.firmato,
      pagine: pagine.pagine,
    }).then((risposta) => {
      if (risposta.ok) aggiorna({ pagineScelte: null })
    })
  })
}

/**
 * Fa di una casella della matrice un bersaglio per le pagine: la cella intera,
 * non i pulsanti dentro. Quel che non porta pagine passa oltre (un PDF dal
 * gestore file va a «Da smistare»). Ferma l'evento e vince sulla riga.
 */
export function accettaPagine (
  elemento: HTMLElement,
  destinazione: { consegnaId: string, allievoId: string, etichetta: string },
): void {
  const acceso = (attivo: boolean) => elemento.classList.toggle(CASELLA_BERSAGLIO, attivo)

  elemento.addEventListener('dragover', (evento: DragEvent) => {
    if (!portaPagine(evento)) return
    evento.preventDefault()
    evento.stopPropagation()
    if (evento.dataTransfer) evento.dataTransfer.dropEffect = 'copy'
    acceso(true)
    // Sotto il puntatore c'è una casella: la riga che la contiene si spegne, con
    // la casella che aveva acceso.
    spegniRiga(elemento)
  })
  elemento.addEventListener('dragleave', () => acceso(false))
  elemento.addEventListener('drop', (evento: DragEvent) => {
    const pagine = carico(evento)
    if (!pagine) return
    evento.preventDefault()
    evento.stopPropagation()
    acceso(false)
    segnaAtterrate()
    document.body.classList.remove(CORPO_IN_VOLO)

    notifica(testi().ritagliando(dicePagine(pagine.pagine), destinazione.etichetta), 'info')
    void azione({
      tipo: 'smistamento.assegnaPagine',
      smistamentoId: pagine.smistamentoId,
      consegnaId: destinazione.consegnaId,
      allievoId: destinazione.allievoId,
      pagine: pagine.pagine,
    }).then((risposta) => {
      // Le pagine archiviate non restano scelte; quelle non riuscite sì, per riprovare.
      if (risposta.ok) aggiorna({ pagineScelte: null })
    })
  })
}
