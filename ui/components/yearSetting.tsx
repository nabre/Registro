// Le righe delle impostazioni dell'anno in React, con la forma di quelle del
// programma (`settings/program.tsx`): nome, «i», e sotto il controllo condiviso
// di `core/controlli/` (`campo()`). Una sezione dell'anno si legge nello stesso
// ordine delle altre: Stato e gesti, Scelte, Avanzate (chiuse).

import { Children, type ReactElement, type ReactNode } from 'react'

import { Campo, type SpecCampo, type ValoreCampo } from '#core/controlli/field.js'
import type { Esito } from '#core/controlli/control.js'
import { testi } from '#ui/components/yearSetting.testi.js'
import { Suggerimento } from './hint.js'

/** Il controllo di un campo dell'anno, disegnato come quelli del programma (`core/controlli/`). */
export function CampoAnno ({ spec, quandoCambia }: {
  spec: SpecCampo | (() => SpecCampo)
  quandoCambia: (valore: ValoreCampo) => Promise<Esito> | void
}): ReactElement {
  return <Campo spec={spec} quandoCambia={quandoCambia} />
}

interface Voce {
  nome: string
  /** La spiegazione, dietro la «i» accanto al nome. */
  aiuto?: ReactNode
  /** L'ancora `data-voce`: il filtro e i rimandi arrivano qui. */
  voce?: string
  controllo: ReactNode
  /** Quel che sta accanto al nome: una pastiglia, un pulsante. */
  accanto?: ReactNode
  /** Quel che sta sotto il controllo: un conto, un avviso. */
  sotto?: ReactNode
}

/** Una riga: il nome con la «i», il controllo, e quel che gli sta sotto. */
export function VoceAnno (voce: Voce): ReactElement {
  return (
    <div className="voce-opzione" data-voce={voce.voce}>
      <div className="voce-opzione__testata">
        <span className="voce-opzione__nome">
          {voce.nome}
          {voce.aiuto ? <Suggerimento testo={voce.aiuto} etichetta={voce.nome} /> : null}
        </span>
        {voce.accanto ?? null}
      </div>
      <div className="voce-opzione__campo">{voce.controllo}</div>
      {voce.sotto ?? null}
    </div>
  )
}

/** Un gruppo di righe con il suo titolo. */
export function GruppoAnno ({ titolo, children }: {
  titolo: string | null
  children?: ReactNode
}): ReactElement {
  return (
    <section className="gruppo-opzioni">
      {titolo ? <h3 className="gruppo-opzioni__titolo">{titolo}</h3> : null}
      <div className="voci-opzioni">{children}</div>
    </section>
  )
}

/**
 * Quali gruppi avanzati stanno aperti. Fuori dal componente: lasciando la
 * pagina e tornando restano come li si era lasciati, e non è una preferenza da
 * salvare.
 */
const aperte = new Set<string>()

/** Le voci rare di una sezione, in fondo, chiuse finché non le si apre. */
export function AvanzateAnno ({ id, righe }: {
  id: string
  righe: readonly ReactNode[]
}): ReactElement | null {
  // Con le chiavi messe da `Children`: le righe arrivano come elenco.
  const voci = Children.toArray(righe)
  if (voci.length === 0) return null
  return (
    <details
      className="gruppo-opzioni gruppo-opzioni--avanzate"
      data-avanzate={id}
      open={aperte.has(id)}
      onToggle={(evento) => {
        if (evento.currentTarget.open) aperte.add(id)
        else aperte.delete(id)
      }}
    >
      <summary className="gruppo-opzioni__titolo">{testi().avanzate(voci.length)}</summary>
      <div className="voci-opzioni">{voci}</div>
    </details>
  )
}

/** Le parti di una sezione, nell'ordine di tutte: Stato e gesti, Scelte, Avanzate. */
export function SezioneAnno (parti: {
  stato?: ReactNode
  scelte?: ReactNode
  avanzate?: ReactNode
}): ReactElement {
  return (
    <div className="gruppi-opzioni">
      {parti.stato ?? null}
      {parti.scelte ?? null}
      {parti.avanzate ?? null}
    </div>
  )
}
