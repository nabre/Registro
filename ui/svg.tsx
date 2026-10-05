// I disegni SVG scritti nel programma: le icone e le figure della guida.
// L'unico posto in cui React mette un testo come markup: il tracciato è una
// costante del codice, mai un dato del documento (eslint lo vieta altrove).

import type { ReactElement } from 'react'

/** Un SVG in linea dal suo tracciato, decorativo: il nome lo dà chi lo contiene. */
export function Svg ({ vista, contenuto, classe }: {
  vista: string
  contenuto: string
  classe?: string
}): ReactElement {
  return (
    <svg
      viewBox={vista}
      aria-hidden="true"
      focusable="false"
      className={classe}
      dangerouslySetInnerHTML={{ __html: contenuto }}
    />
  )
}
