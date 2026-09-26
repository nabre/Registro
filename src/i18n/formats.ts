// Numeri, plurali, elenchi e date nella lingua di adesso, via `Intl` e `locale()`.
//
// L'ordine dei nomi non passa di qui: `confrontaNomi` (`domain/text.ts`) ordina
// sempre all'italiana, perché l'ordine finisce nel documento e due computer in
// lingue diverse non devono rimescolarlo a ogni salvataggio.
// I formattatori si tengono per etichetta e opzioni: costruirli costa.

import { locale } from './state.js'

const numeri = new Map<string, Intl.NumberFormat>()
const regolePlurali = new Map<string, Intl.PluralRules>()
const elenchi = new Map<string, Intl.ListFormat>()
const date = new Map<string, Intl.DateTimeFormat>()

function ricordato<T> (tabella: Map<string, T>, chiave: string, crea: () => T): T {
  let trovato = tabella.get(chiave)
  if (trovato === undefined) {
    trovato = crea()
    tabella.set(chiave, trovato)
  }
  return trovato
}

/** Un numero come si scrive nella lingua di adesso: «1'234,5» in tedesco svizzero. */
export function numero (valore: number, opzioni: Intl.NumberFormatOptions = {}): string {
  const etichetta = locale()
  const chiave = `${etichetta}|${JSON.stringify(opzioni)}`
  return ricordato(numeri, chiave, () => new Intl.NumberFormat(etichetta, opzioni)).format(valore)
}

/** Vero se il numero vuole il singolare nella lingua di adesso (in francese anche lo zero). */
export function èSingolare (quanti: number): boolean {
  const etichetta = locale()
  return ricordato(regolePlurali, etichetta, () => new Intl.PluralRules(etichetta)).select(quanti) === 'one'
}

/** La parola giusta per il numero: `uno` al singolare, `molti` altrimenti. */
export function perNumero (quanti: number, uno: string, molti: string): string {
  return èSingolare(quanti) ? uno : molti
}

/** «a, b e c» nella lingua di adesso; `'disjunction'` dà «a, b o c». */
export function elenco (
  parti: readonly string[],
  tipo: 'conjunction' | 'disjunction' = 'conjunction',
): string {
  const etichetta = locale()
  return ricordato(elenchi, `${etichetta}|${tipo}`, () =>
    new Intl.ListFormat(etichetta, { style: 'long', type: tipo })).format(parti)
}

/**
 * Un istante (copie di sicurezza, serrature…) nella lingua di adesso. I giorni
 * `AAAA-MM-GG` del calendario stanno in `domain/dates.ts`.
 */
export function istante (quando: Date, opzioni: Intl.DateTimeFormatOptions = {}): string {
  const etichetta = locale()
  const chiave = `${etichetta}|${JSON.stringify(opzioni)}`
  return ricordato(date, chiave, () => new Intl.DateTimeFormat(etichetta, opzioni)).format(quando)
}

/** In minuscolo secondo le regole della lingua di adesso. */
export function minuscolo (testo: string): string {
  return testo.toLocaleLowerCase(locale())
}

/** In maiuscolo secondo le regole della lingua di adesso. */
export function maiuscolo (testo: string): string {
  return testo.toLocaleUpperCase(locale())
}

/** La prima lettera grande, il resto com'è. */
export function conMaiuscola (testo: string): string {
  return testo ? maiuscolo(testo[0]) + testo.slice(1) : testo
}
