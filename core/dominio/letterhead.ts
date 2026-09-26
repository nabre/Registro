// Le carte intestate: quale va su quale foglio.
//
// Invariante: ogni corso sta su una carta e una sola, e c'è sempre almeno una
// carta. La normalizzazione la applica in lettura, il gestore dopo ogni
// salvataggio; chi stampa non trova mai un corso senza carta.

import { identificatore } from './identifiers.js'
import { ALTEZZA_LOGO, type CartaIntestata, type Intestazione } from './models.js'

/** Un identificatore nuovo per una carta. */
export const nuovoIdCarta = (): string => identificatore('car')

/** Una carta vuota: senza scuola, senza logo, senza corsi. */
export function cartaVuota (id: string = nuovoIdCarta()): CartaIntestata {
  return { id, sede: '', altezzaLogo: ALTEZZA_LOGO.predefinita, corsi: [] }
}

/**
 * La matrice completa: ogni corso esistente su una carta sola. Via i corsi che
 * non ci sono più; un doppione resta sulla prima carta che lo nomina; i corsi
 * non nominati vanno sulla prima; senza carte ne nasce una.
 */
export function completaCarte (
  carte: readonly CartaIntestata[],
  corsiEsistenti: readonly string[],
): CartaIntestata[] {
  const esistono = new Set(corsiEsistenti)
  const visti = new Set<string>()
  const fatte = (carte.length > 0 ? carte : [cartaVuota()]).map((carta) => ({
    ...carta,
    corsi: carta.corsi.filter((id) => {
      if (!esistono.has(id) || visti.has(id)) return false
      visti.add(id)
      return true
    }),
  }))
  const orfani = corsiEsistenti.filter((id) => !visti.has(id))
  if (orfani.length > 0) fatte[0] = { ...fatte[0], corsi: [...fatte[0].corsi, ...orfani] }
  return fatte
}

/** La carta di un corso: quella che lo nomina, o la prima. */
export function cartaDelCorso (intestazione: Intestazione, corsoId: string | null): CartaIntestata {
  const prima = intestazione.carte[0]
  if (!corsoId) return prima
  return intestazione.carte.find((carta) => carta.corsi.includes(corsoId)) ?? prima
}

/**
 * La carta di un foglio con più corsi (fascicolo o foto di classe): quella
 * comune a tutti, altrimenti la prima.
 */
export function cartaDeiCorsi (intestazione: Intestazione, corsiIds: readonly string[]): CartaIntestata {
  const carte = new Set(corsiIds.map((id) => cartaDelCorso(intestazione, id).id))
  if (carte.size === 1) {
    const [unica] = carte
    return intestazione.carte.find((carta) => carta.id === unica) ?? intestazione.carte[0]
  }
  return intestazione.carte[0]
}

/**
 * Sposta dei corsi su una carta: li toglie da dove stavano e li mette in coda
 * a quella. Una carta che non c'è lascia tutto com'era.
 */
export function spostaCorsi (
  carte: readonly CartaIntestata[],
  corsiIds: readonly string[],
  cartaId: string,
): CartaIntestata[] {
  if (!carte.some((carta) => carta.id === cartaId)) return [...carte]
  const muovi = new Set(corsiIds)
  return carte.map((carta) => {
    const restano = carta.corsi.filter((id) => !muovi.has(id))
    return carta.id === cartaId ? { ...carta, corsi: [...restano, ...corsiIds] } : { ...carta, corsi: restano }
  })
}

/**
 * Toglie una carta e ne passa i corsi alla prima rimasta. L'ultima non si
 * toglie, se no restano corsi senza carta.
 */
export function togliCarta (carte: readonly CartaIntestata[], cartaId: string): CartaIntestata[] {
  const via = carte.find((carta) => carta.id === cartaId)
  if (!via || carte.length <= 1) return [...carte]
  const restano = carte.filter((carta) => carta.id !== cartaId)
  restano[0] = { ...restano[0], corsi: [...restano[0].corsi, ...via.corsi] }
  return restano
}
