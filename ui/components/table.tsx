// Il telaio di una tabella in React (contenitore che scorre, intestazione,
// corpo, piede), scritto una volta: chi costruisce una tabella scrive solo le
// celle.

import type { KeyboardEvent, ReactElement, ReactNode } from 'react'

import { classi } from '#ui/classNames.js'
import { Isola } from '#ui/island.js'

/** Quel che sta dentro la tabella: le celle e gli attributi suoi. */
interface Parti {
  /** Le celle dell'intestazione: i `<th>` della riga in cima. */
  intestazione: ReactNode
  /** Le righe del corpo, già costruite. */
  righe: ReactNode
  /** Le celle del piede — i totali, le medie — se ce n'è uno. */
  piede?: ReactNode
  /** Attributi in più della `<table>`: `aria-colcount` di una tabella a finestra. */
  attr?: Record<string, string | number | undefined>
}

interface Telaio {
  /**
   * La variante senza prefisso (`voti` → `tabella--voti`): il foglio di stile ci
   * appende colonne ferme e minimi. Più d'una per le tabelle che ne sommano due
   * (le assenze sono `documenti` con regole in più).
   */
  variante?: string | readonly string[]
  /**
   * La tabella scorre nelle due direzioni e si ferma in altezza sotto la
   * testata: per le matrici, che crescono in righe e in colonne.
   */
  griglia?: boolean
  /**
   * La chiave di scorrimento di questa tabella (`data-scorrimento`, che
   * `Fotografo` rimette): una spunta non la riporta in cima, cambiare matrice sì.
   */
  scorrimento?: string
  /**
   * La chiave di telaio del contenitore (`data-telaio`): in React il nodo resta
   * da sé fra due disegni, la chiave resta perché le prove la leggono.
   */
  telaio?: string
  /**
   * Classi proprie al posto di `tabella-contenitore` e `tabella`, per le matrici
   * col loro foglio di stile (appello, check, corsi); allora `variante` e
   * `griglia` non contano.
   */
  classi?: { telaio?: string, tabella?: string }
  /** Il nome della tabella per chi legge con la voce: `aria-label`. */
  etichetta?: string
  /** La tastiera della griglia sul contenitore: `frecceNellaGriglia(casella)`. */
  onKeyDown?: (evento: KeyboardEvent<HTMLDivElement>) => void
}

/**
 * Le parti già fatte, o chieste a ogni disegno quando la tabella è a finestra
 * (`components/virtualList.tsx`): allora la tabella sta in un'isola, e lo
 * scorrimento rifà lei sola, con le parti di quel momento.
 */
type OpzioniTabella = Telaio & (Parti | { virtuale: { chiave: string, parti: () => Parti } })

/**
 * Il nome dell'isola di un elenco a finestra: lo stesso di `nomeIsola` in
 * `virtualList.tsx`, che la cerca e la rifà con quel nome.
 */
function isolaVirtuale (chiave: string): string {
  // testo-fisso: chiave dell'isola, non si legge
  return `virtuale:${chiave}`
}

/**
 * Il contenitore scorre e la tabella no: la barra di scorrimento sta intorno,
 * così l'intestazione appiccicata in cima non scivola via con le righe.
 */
export function Tabella (opzioni: OpzioniTabella): ReactElement {
  const varianti = typeof opzioni.variante === 'string' ? [opzioni.variante] : opzioni.variante ?? []
  const disegna = (parti: Parti): ReactElement => (
    <table
      className={opzioni.classi?.tabella ?? classi('tabella', ...varianti.map((nome) => `tabella--${nome}`))} // testo-fisso: classe CSS
      aria-label={opzioni.etichetta}
      {...parti.attr}
    >
      <thead><tr>{parti.intestazione}</tr></thead>
      <tbody>{parti.righe}</tbody>
      {parti.piede ? <tfoot><tr>{parti.piede}</tr></tfoot> : null}
    </table>
  )

  return (
    <div
      className={opzioni.classi?.telaio ?? classi('tabella-contenitore', opzioni.griglia && 'tabella-contenitore--griglia')}
      data-scorrimento={opzioni.scorrimento}
      data-telaio={opzioni.telaio}
      onKeyDown={opzioni.onKeyDown}
    >
      {'virtuale' in opzioni
        ? (
            <Isola
              chiave={isolaVirtuale(opzioni.virtuale.chiave)}
              disegna={() => disegna(opzioni.virtuale.parti())}
            />
          )
        : disegna(opzioni)}
    </div>
  )
}
