// Le strade fra le due pagine dei progetti — la biblioteca (Progetti) e
// l'integrazione nel corso — e la pastiglia dello stato nel corso, che
// mostrano tutte e due: in un file loro, così le pagine non si importano a
// vicenda.

import type { ProgettoNelCorso, StatoProgetto } from '#core/dominio/models.js'
import { pastiglia, type TonoPastiglia } from '#ui/components/base.js'
import { nomeStatoProgetto } from '#ui/forms/project.js'
import { vai } from '#ui/state.js'

const TONI_STATO: Record<StatoProgetto, TonoPastiglia> = {
  bozza: 'quiete',
  'in-corso': 'informativo',
  concluso: 'positivo',
}

/** La pastiglia dello stato di un progetto in un corso: la usa anche la scheda dell'ora. */
export function pastigliaStato (progetto: Pick<ProgettoNelCorso, 'stato'>): HTMLElement {
  return pastiglia(nomeStatoProgetto(progetto.stato), TONI_STATO[progetto.stato])
}

/** Apre un progetto nella biblioteca. */
export function apriProgetto (progettoId: string): void {
  vai({ pagina: 'pagina.progetti', soggetto: { tipo: 'progetto', id: progettoId } })
}

/**
 * Apre un progetto nella pagina Integrazione progetti: nel corso indicato, o
 * in quello di lavoro se è integrato lì, o nel primo in cui lo è (`completa`).
 */
export function apriIntegrazione (progettoId: string, corsoId?: string): void {
  vai(
    { pagina: 'pagina.corso.integrazione', soggetto: { tipo: 'progetto', id: progettoId } },
    corsoId ? { contesto: { corsoId } } : {},
  )
}
