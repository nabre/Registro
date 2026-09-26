// La matrice del comportamento riletta per persona: la somma delle ore e le
// annotazioni accanto alle caselle. Sta nel dominio perché la usano la scheda
// della persona e la stampa, con gli stessi conti.

import type { CellaOsservata, Lezione, SegnoOsservato } from './models.js'
import { testi } from './observations.testi.js'

/**
 * Come si chiamano i due segni, a schermo e sulla carta: le stesse parole
 * ovunque, perché chi legge il foglio non ha la matrice per confrontare.
 */
export const NOMI_SEGNO: Readonly<Record<SegnoOsservato, string>> = Object.defineProperties(
  {} as Record<SegnoOsservato, string>,
  {
    // Lette quando le si chiede: la lingua si sceglie dopo che il file è caricato.
    positivo: { enumerable: true, get: () => testi().positivo },
    negativo: { enumerable: true, get: () => testi().negativo },
  },
)

/** Come si chiama un segno quando lo si deve dire; senza segno, non c'è niente da segnare. */
export function nomeSegnoScritto (segno: SegnoOsservato | null): string {
  return segno ? NOMI_SEGNO[segno] : testi().nessuno
}

/** Una casella segnata, con l'ora in cui lo è stata: senza, non si sa quando. */
interface CellaDiOra {
  lezione: Lezione
  cella: CellaOsservata
}

/**
 * Le caselle di una persona, dalla più recente. Fuori le ore annullate: quel
 * che c'è segnato viene da una pianificazione disdetta.
 */
export function celleDiAllievo (lezioni: Lezione[], allievoId: string): CellaDiOra[] {
  return lezioni
    .filter((lezione) => lezione.stato !== 'annullata')
    .flatMap((lezione) =>
      (lezione.matrice ?? [])
        .filter((cella) => cella.allievoId === allievoId)
        .map((cella) => ({ lezione, cella })),
    )
    .sort((a, b) => b.lezione.data.localeCompare(a.lezione.data))
}

/**
 * Quante volte, e come, per ciascun aspetto. Le caselle senza segno contano a
 * parte: un'annotazione neutra è comunque un fatto.
 */
interface ContoAspetto {
  /** Il valore della voce di lista, non il suo testo: chi disegna lo traduce. */
  aspetto: string
  positivi: number
  negativi: number
  /** Caselle annotate senza segno. */
  neutre: number
  /** Quante in tutto: è il numero che si scrive accanto al nome. */
  quante: number
}

/** I conti per aspetto, dal più segnato al meno. */
export function contiPerAspetto (celle: CellaDiOra[]): ContoAspetto[] {
  const conti = new Map<string, ContoAspetto>()
  for (const { cella } of celle) {
    const conto = conti.get(cella.aspetto) ?? {
      aspetto: cella.aspetto,
      positivi: 0,
      negativi: 0,
      neutre: 0,
      quante: 0,
    }
    if (cella.segno === 'positivo') conto.positivi += 1
    else if (cella.segno === 'negativo') conto.negativi += 1
    else conto.neutre += 1
    conto.quante += 1
    conti.set(cella.aspetto, conto)
  }
  return [...conti.values()].sort(
    (a, b) => b.quante - a.quante || a.aspetto.localeCompare(b.aspetto, 'it'),
  )
}

/** Il bilancio di tutte le caselle insieme: i due numeri che si dicono a voce. */
export function bilancioSegni (celle: CellaDiOra[]): {
  positivi: number
  negativi: number
  neutre: number
} {
  const quanti = (quale: SegnoOsservato | null) =>
    celle.filter(({ cella }) => cella.segno === quale).length
  return {
    positivi: quanti('positivo'),
    negativi: quanti('negativo'),
    neutre: quanti(null),
  }
}
