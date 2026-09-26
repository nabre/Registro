// Il catalogo: i testi di un pezzo del registro, in tutte le lingue.
//
// Sta accanto al file che lo usa (`views/absences.ts` → `views/absences.testi.ts`)
// con le quattro lingue una sotto l'altra, così chi cambia l'italiano vede le
// traduzioni.
//
//     const it = {
//       titolo: 'Assenze',
//       righe: (n: number) => plurale(n, 'riga', 'righe'),
//     }
//
//     export const testi = catalogo(it, {
//       de: { titolo: 'Absenzen', righe: (n) => … },
//       fr: { … },
//       en: { … },
//     })
//
//     // nel file che lo usa, al momento dell'uso:
//     h('h2', null, testi().titolo)
//
// L'italiano è la forma: le traduzioni hanno le stesse chiavi con lo stesso
// tipo, e il compilatore lo verifica (niente ripiego sull'italiano).
// Le frasi con un numero o un nome sono funzioni, non segnaposto `{n}`: così
// ogni lingua fa plurali e accordi a modo suo, con argomenti tipizzati.

import { LINGUA_PREDEFINITA, LINGUE, type Lingua } from './languages.js'
import { lingua } from './state.js'

/**
 * La forma di un catalogo, ricavata dall'italiano: stesse chiavi, letterali
 * allargati a `string`. Le funzioni tengono gli argomenti; un ritorno non
 * stringa (DOM, liste) resta dello stesso tipo.
 */
export type Forma<T> =
  T extends string
    ? string
    : T extends (...argomenti: infer A) => infer R
      ? (...argomenti: A) => (R extends string ? string : R)
      : T extends readonly (infer E)[]
        ? readonly Forma<E>[]
        : T extends object
          ? { readonly [K in keyof T]: Forma<T[K]> }
          : T

/** Le lingue che traducono l'italiano. */
export type Traduzioni<T> = { readonly [L in Exclude<Lingua, 'it'>]: Forma<T> }

/**
 * Il catalogo: chiamato senza argomenti dà i testi nella lingua di adesso;
 * `.in(lingua)` in una lingua data.
 */
export interface Catalogo<T> {
  (): Forma<T>
  in (lingua: Lingua): Forma<T>
  /** Le quattro versioni, nell'ordine di `LINGUE`. */
  tutte (): readonly Forma<T>[]
}

/**
 * Un testo letto quando serve: una stringa, o una funzione che lo chiede al
 * catalogo in quel momento. Per le dichiarazioni a livello di modulo (procedure
 * dell'API): `aiuto: () => testi().annoId` esce nella lingua di adesso.
 */
export type TestoPigro = string | (() => string)

/** Il testo di adesso. `undefined` resta `undefined`: un aiuto che non c'è non diventa vuoto. */
export function detto<T extends TestoPigro | undefined> (
  testo: T,
): T extends undefined ? undefined : string
export function detto (testo: TestoPigro | undefined): string | undefined {
  return typeof testo === 'function' ? testo() : testo
}

/** Mette insieme l'italiano e le sue traduzioni in un catalogo. */
export function catalogo<T extends object> (it: T, traduzioni: Traduzioni<T>): Catalogo<T> {
  const perLingua: Readonly<Record<Lingua, Forma<T>>> = {
    // Il cast allarga solo i letterali di `it` a `string`.
    it: it as unknown as Forma<T>,
    ...traduzioni,
  }
  const inLingua = (scelta: Lingua): Forma<T> => perLingua[scelta] ?? perLingua[LINGUA_PREDEFINITA]
  const leggi = (() => inLingua(lingua())) as Catalogo<T>
  leggi.in = inLingua
  leggi.tutte = () => LINGUE.map(inLingua)
  return leggi
}
