// Il numero della modale in cui si disegna: rende unici id e chiavi di fuoco
// dei campi, perché con due modali impilate etichette e fuoco non saltino su
// quella sbagliata. Fuori da una modale non c'è.

import { createContext, useContext } from 'react'

export const ScopeModale = createContext<string | null>(null)

/** Il suffisso di questa modale (`--m3`), o vuoto fuori da una modale. */
export function useSuffissoModale (): string {
  const scope = useContext(ScopeModale)
  return scope === null ? '' : `--m${scope}`
}
