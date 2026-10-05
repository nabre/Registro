// Il tondo con le iniziali accanto al nome, in React. È `aria-hidden` e le
// iniziali sono un attributo disegnato dal CSS, così il testo della cella
// (quello copiato e letto dalle prove) resta il nome. La tinta viene dal nome,
// non dall'ordine: la stessa persona ha lo stesso colore ovunque.

import { useState, type CSSProperties, type ReactElement, type ReactNode } from 'react'

import { uriDato } from '#ui/state.js'

/** Quel che basta per disegnare un tondo: il nome, e se c'è la foto. */
export interface Persona {
  nome: string
  cognome?: string
  /** Il ritratto, relativo alla cartella dei dati — come `Allievo.foto`. */
  foto?: string
}

/**
 * Otto tinte, come angoli sul cerchio dei colori; il foglio di stile ne fa
 * fondo e lettera con la stessa luminosità. Di più, due vicine si confondono.
 */
const TINTE = [25, 60, 95, 150, 190, 235, 280, 330] as const

/**
 * La prima lettera vera di una parola: `Array.from` e non `[0]`, perché una
 * lettera fuori dal piano di base spezzata darebbe un quadratino.
 */
function prima (parola: string | undefined): string {
  const lettera = Array.from(parola?.trim() ?? '')[0]
  return lettera ? lettera.toLocaleUpperCase() : ''
}

/**
 * Le iniziali, nome poi cognome. Senza cognome, prima e ultima parola del nome
 * intero: «Maria De Santis» è «MS».
 */
function iniziali (persona: Persona): string {
  if (persona.cognome !== undefined) return prima(persona.nome) + prima(persona.cognome)
  const parole = persona.nome.trim().split(/\s+/).filter(Boolean)
  if (parole.length <= 1) return prima(parole[0])
  return prima(parole[0]) + prima(parole[parole.length - 1])
}

/** Lo stesso nome dà sempre la stessa tinta: un conto sulle lettere, non a caso. */
function tintaDi (persona: Persona): number {
  const chiave = `${persona.nome} ${persona.cognome ?? ''}`.trim().toLocaleLowerCase()
  let somma = 0
  for (const lettera of chiave) somma = (somma * 31 + (lettera.codePointAt(0) ?? 0)) >>> 0
  return TINTE[somma % TINTE.length]
}

/**
 * Il tondo: con la foto, ritagliata al centro alto, e sotto le iniziali, che
 * restano se il file non si apre.
 */
export function Avatar ({ persona }: { persona: Persona }): ReactElement {
  const indirizzo = uriDato(persona.foto)
  // La foto che non si è aperta: non si ritenta finché l'indirizzo è quello.
  // Il nodo lo toglie React, non il gestore: tolto a mano, React non lo
  // ritroverebbe più.
  const [rotta, impostaRotta] = useState<string | null>(null)
  return (
    <span
      className="avatar"
      style={{ '--avatar-tinta': String(tintaDi(persona)) } as CSSProperties}
      data-iniziali={iniziali(persona)}
      aria-hidden="true"
    >
      {indirizzo && rotta !== indirizzo
        ? (
            // La chiave è l'indirizzo: fra due disegni resta lo stesso nodo, e la
            // foto non riparte dalle iniziali finché non è decodificata di nuovo.
            <img
              key={indirizzo}
              className="avatar__foto"
              src={indirizzo}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => impostaRotta(indirizzo)}
            />
          )
        : null}
    </span>
  )
}

/**
 * Il nome in una tabella: il tondo e accanto quel che la vista ci mette (nome,
 * collegamento, pastiglia; `children` dopo il nome). Sta dentro la cella, che
 * resta `th`/`td` come la vuole la tabella.
 */
export function CellaNome ({ persona, nome, children }: {
  persona: Persona
  nome: ReactNode
  children?: ReactNode
}): ReactElement {
  return (
    <span className="cella-nome">
      <Avatar persona={persona} />
      <span className="cella-nome__testo">{nome}{children}</span>
    </span>
  )
}
