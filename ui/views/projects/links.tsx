// Le strade fra le due pagine dei progetti — la biblioteca (Progetti) e
// l'integrazione nel corso — e la pastiglia dello stato nel corso, che
// mostrano tutte e due: in un file loro, così le pagine non si importano a
// vicenda.

import type { ReactElement } from 'react'

import type { ProgettoNelCorso, Risorsa, StatoProgetto, TipoRisorsa } from '#core/dominio/models.js'
import { parole } from '#core/dominio/words.testi.js'
import { classi } from '#ui/classNames.js'
import { Pastiglia, type TonoPastiglia } from '#ui/components/base.js'
import { Icona, type NomeIcona } from '#ui/components/icons.js'
import { nomeStatoProgetto } from '#ui/forms/project.js'
import { vai } from '#ui/state.js'

const TONI_STATO: Record<StatoProgetto, TonoPastiglia> = {
  bozza: 'quiete',
  'in-corso': 'informativo',
  concluso: 'positivo',
}

/** La pastiglia dello stato di un progetto in un corso: la usa anche la scheda dell'ora. */
export function pastigliaStato (progetto: Pick<ProgettoNelCorso, 'stato'>): ReactElement {
  return <Pastiglia testo={nomeStatoProgetto(progetto.stato)} tono={TONI_STATO[progetto.stato]} />
}

const SIMBOLI_RISORSA: Record<TipoRisorsa, NomeIcona> = {
  collegamento: 'collegamento',
  file: 'documento',
  immagine: 'immagine',
}

/**
 * Una risorsa del progetto col simbolo del suo tipo: il collegamento si apre
 * fuori, il file si nomina. La usano la biblioteca e la Panoramica, che la
 * mostrano uguale.
 */
export function risorsaDelProgetto (risorsa: Risorsa, classe?: string): ReactElement {
  const titolo = risorsa.titolo || risorsa.nome || risorsa.url || parole().senzaTitolo
  return (
    <span className={classi('risorsa-progetto', classe)}>
      <Icona nome={SIMBOLI_RISORSA[risorsa.tipo] ?? 'documento'} classe="icona--minuta" />
      {risorsa.url
        // Con l'aspetto di `Collegamento`, non il blu del browser.
        ? <a className="collegamento" href={risorsa.url} target="_blank" rel="noopener noreferrer">{titolo}</a>
        : <span>{titolo}</span>}
    </span>
  )
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
