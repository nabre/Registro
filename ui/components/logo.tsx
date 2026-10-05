// Il logo dell'applicazione a colori, nella barra del titolo, in React.
// Sorgente unica: `resources/registro-app-piccola.svg`, la variante per
// 16–48 px da cui `npm run icons` fa anche le misure piccole del `.ico`. Si
// carica dalla radice dell'applicazione (`radiceApp`, permessa dalla CSP; prima
// che lo stato arrivi, `registro://app`).

import { useState, type ReactElement } from 'react'

import { classi } from '#ui/classNames.js'
import { stato } from '#ui/state.js'

/** Il file del logo, relativo alla radice dell'applicazione. */
const LOGO = 'resources/registro-app-piccola.svg'

/** Il logo a colori, alla misura che gli dà la classe. Decorativo: il nome lo dice chi gli sta accanto. */
export function Logo ({ classe }: { classe: string }): ReactElement {
  const radice = (stato.radiceApp ?? 'registro://app').replace(/\/$/, '')
  const src = `${radice}/${LOGO}`
  // Un file che non arriva non lascia il riquadro dell'immagine rotta: il posto
  // resta, vuoto. Vale per quell'indirizzo: uno nuovo si riprova.
  const [rotto, impostaRotto] = useState<string | null>(null)
  return (
    // Le misure scritte tengono il posto prima che il file arrivi. Fra due
    // disegni React tiene lo stesso nodo, che non ricarica il file e non lampeggia.
    <img
      className={classi('logo', classe)}
      src={src}
      alt=""
      width={20}
      height={20}
      draggable={false}
      aria-hidden="true"
      style={rotto === src ? { visibility: 'hidden' } : undefined}
      onError={() => impostaRotto(src)}
    />
  )
}
