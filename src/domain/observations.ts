// La matrice del comportamento riletta da fuori dell'ora in cui è stata segnata.
//
// Si compila un'ora alla volta, di sfuggita, mentre la classe lavora: lì la
// domanda è «chi, adesso, su che cosa». Riletta dopo, la domanda è un'altra —
// «come ha lavorato questa persona in questa materia» — e la risposta non sta
// in nessuna delle ore prese da sola: sta nella somma, e in quel che si è
// scritto accanto alle caselle.
//
// Sta nel dominio perché la chiedono in due — la scheda della persona e, un
// giorno, il rapporto da stampare — e i conti fatti due volte sono due
// occasioni di dire due numeri diversi della stessa cosa.

import type { CellaOsservata, Lezione, SegnoOsservato } from './models.js'

/**
 * Come si chiamano i due segni, a schermo e sulla carta.
 *
 * Le parole stanno qui e non accanto alle icone perché le legge anche chi
 * stampa: un verbale che dicesse «positivo» dove la matrice dice «molto bene»
 * sarebbe lo stesso dato raccontato con due parole diverse, e chi riceve il
 * foglio non ha la matrice sotto gli occhi per accorgersene.
 */
export const NOMI_SEGNO: Record<SegnoOsservato, string> = {
  positivo: 'Molto bene',
  negativo: 'Da migliorare',
}

/** Come si chiama un segno quando lo si deve dire; senza segno, non c'è niente da segnare. */
export function nomeSegnoScritto (segno: SegnoOsservato | null): string {
  return segno ? NOMI_SEGNO[segno] : 'Niente da segnare'
}

/** Una casella segnata, con l'ora in cui lo è stata: senza, non si sa quando. */
interface CellaDiOra {
  lezione: Lezione
  cella: CellaOsservata
}

/**
 * Le caselle di una persona, dalla più recente.
 *
 * Le ore annullate restano fuori: un'ora che non si è tenuta non è un'ora in
 * cui qualcuno si è comportato in un modo o nell'altro, e quel che ci fosse
 * segnato è rimasto lì da una pianificazione poi disdetta.
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
 * Quante volte, e come, per ciascun aspetto.
 *
 * Le caselle senza segno si contano a parte e non si buttano: «ha chiesto di
 * cambiare posto» non è né un bene né un male, ma è successo, e un aspetto che
 * ha tre annotazioni e nessun segno non è un aspetto su cui non si è mai
 * guardato.
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

/**
 * I conti per aspetto, dal più segnato al meno.
 *
 * L'ordine è quello: davanti l'aspetto di cui c'è più da dire. In ordine di
 * lista si leggeva per primo quello che nessuno guarda mai, e per trovare il
 * motivo per cui si è aperta la scheda bisognava scorrere fino in fondo.
 */
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
