// I mattoni dei controlli che React non dà da sé: gli id che reggono qualunque
// chiave, e l'innesto dei nodi già fatti da `core/i18n/flags.ts` (bandiere e
// figure della lingua), che resta DOM puro perché lo leggono anche le pagine
// senza React. Mai `innerHTML`: i nodi entrano come nodi.

import {
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type ReactElement,
} from 'react'

/** Un id che regge qualunque chiave: `registroDocenti.aspetto.tema` ha i punti. */
export function idDi (...parti: string[]): string {
  // testo-fisso: un identificatore, non testo
  return ['controllo', ...parti].join('-').replace(/[^\w-]/g, '-')
}

/** Gli id di quel che descrive un elemento, per `aria-describedby`; nessuno, niente attributo. */
export function descritto (...id: Array<string | null | undefined | false>): string | undefined {
  const tutti = id.filter(Boolean).join(' ')
  return tutti || undefined
}

/**
 * Uno `<span>` che porta dentro i nodi fatti da `nodi()`, rifatti quando
 * cambia `chiave`. I figli sono suoi: React non ne mette altri.
 */
export function Innesto ({ nodi, chiave, ...attributi }: Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  nodi: () => Node[]
  chiave: string
}): ReactElement {
  const qui = useRef<HTMLSpanElement | null>(null)
  const ultima = useRef(nodi)
  useLayoutEffect(() => { ultima.current = nodi })
  useLayoutEffect(() => {
    qui.current?.replaceChildren(...ultima.current())
  }, [chiave])
  return <span ref={qui} {...attributi} />
}
