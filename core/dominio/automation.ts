// Quando i PDF di un corso vanno rifatti, e di quale corso.
//
// Un PDF vecchio non sembra vecchio: l'unica difesa è rifarlo quando i dati
// cambiano. Qui la domanda «quale corso tocca questa modifica», che è una
// domanda sul registro e si prova da sola.

import { corsiDellaClasse } from './courses.js'
import { testi } from './automation.testi.js'
import type { QuandoRifarePdf, Registro } from './models.js'

/** I valori ammessi, in ordine da meno a più automatico: serve anche al modulo. */
export const QUANDO_RIFARE_PDF: QuandoRifarePdf[] = ['mai', 'chiusura', 'sempre']

/** Come si chiamano nell'interfaccia, e che cosa promettono. */
interface ModoPdf {
  readonly valore: QuandoRifarePdf
  readonly nome: string
  readonly spiegazione: string
}

/** I modi in fila, con le parole lette dal catalogo al momento (la lingua si sceglie dopo il caricamento). */
export const MODI_PDF: readonly ModoPdf[] = QUANDO_RIFARE_PDF.map((valore) =>
  Object.defineProperties({ valore } as ModoPdf, {
    nome: { enumerable: true, get: () => testi()[valore].nome },
    spiegazione: { enumerable: true, get: () => testi()[valore].spiegazione },
  }),
)

/**
 * Da che cosa si capisce quale corso è stato toccato: i nomi che il protocollo
 * usa ovunque. Un'azione che non ne porta nessuno non fa rifare niente.
 */
export interface Riferimenti {
  corsoId?: string | null
  lezioneId?: string | null
  valutazioneId?: string | null
  pianoId?: string | null
  classeId?: string | null
  allievoId?: string | null
}

/**
 * I corsi i cui documenti una modifica rende vecchi, dal riferimento più
 * stretto: il corso; il corso di lezione, valutazione o piano; tutti i corsi
 * di una classe o di un allievo (un cognome sta su ogni foglio).
 *
 * Un id che non si trova dà niente, non «tutti»: per un'eliminazione è
 * l'azione a dover dire il corso.
 */
export function corsiDaRifare (registro: Registro, riferimenti: Riferimenti): string[] {
  const unico = (id: string | null | undefined): string[] =>
    id && registro.corsi.some((c) => c.id === id) ? [id] : []

  if (riferimenti.corsoId) return unico(riferimenti.corsoId)

  if (riferimenti.lezioneId) {
    const lezione = registro.lezioni.find((l) => l.id === riferimenti.lezioneId)
    return unico(lezione?.corsoId)
  }
  if (riferimenti.valutazioneId) {
    const momento = registro.valutazioni.find((v) => v.id === riferimenti.valutazioneId)
    return unico(momento?.corsoId)
  }
  if (riferimenti.pianoId) {
    const piano = registro.piani.find((p) => p.id === riferimenti.pianoId)
    return unico(piano?.corsoId)
  }

  const classeId =
    riferimenti.classeId ??
    (riferimenti.allievoId
      ? registro.classi.find((c) => c.allievi.some((a) => a.id === riferimenti.allievoId))?.id ??
        null
      : null)
  if (!classeId) return []
  return corsiDellaClasse(registro, classeId).map((corso) => corso.id)
}

/**
 * Il giorno di cui parla una modifica, se ne parla di uno: sceglie il semestre
 * dei fogli da rifare (un voto di novembre corretto a marzo tocca il primo
 * semestre). Solo lezioni e valutazioni hanno una data; per il resto `null`, e
 * chi chiama usa oggi.
 */
export function giornoDaRifare (registro: Registro, riferimenti: Riferimenti): string | null {
  if (riferimenti.lezioneId) {
    const lezione = registro.lezioni.find((l) => l.id === riferimenti.lezioneId)
    if (lezione) return lezione.data
  }
  if (riferimenti.valutazioneId) {
    const momento = registro.valutazioni.find((v) => v.id === riferimenti.valutazioneId)
    if (momento) return momento.data
  }
  return null
}

/** Le voci di una raccolta che due fotografie del registro vedono diverse. */
function vociCambiate<V extends { id: string }> (
  prima: readonly V[],
  dopo: readonly V[],
): Array<{ vecchia: V | undefined; nuova: V | undefined }> {
  // La stessa raccolta (il caso comune): niente da confrontare.
  if (prima === dopo) return []
  const nuove = new Map(dopo.map((voce) => [voce.id, voce]))
  const cambiate: Array<{ vecchia: V | undefined; nuova: V | undefined }> = []
  for (const vecchia of prima) {
    const nuova = nuove.get(vecchia.id)
    nuove.delete(vecchia.id)
    if (!nuova || JSON.stringify(vecchia) !== JSON.stringify(nuova)) {
      cambiate.push({ vecchia, nuova })
    }
  }
  for (const nuova of nuove.values()) cambiate.push({ vecchia: undefined, nuova })
  return cambiate
}

/**
 * Di che cosa parla la differenza fra due fotografie del registro, nei
 * riferimenti che leggono `corsiDaRifare` e `giornoDaRifare`. Serve ad annulla
 * e ripristina, che non portano id.
 *
 * Una voce che c'è ancora nomina sé stessa; una sparita o che ha cambiato
 * corso nomina anche il corso di prima. L'intestazione (materie, impostazioni,
 * anni) sta su ogni foglio: cambiarla tocca tutti i corsi. Si confrontano solo
 * le raccolte che sono oggetti diversi.
 */
export function riferimentiCambiati (prima: Registro, dopo: Registro): Riferimenti[] {
  const trovati = new Map<string, Riferimenti>()
  const aggiungi = (riferimenti: Riferimenti): void => {
    trovati.set(JSON.stringify(riferimenti), riferimenti)
  }

  const intestazione = (r: Registro) =>
    JSON.stringify([r.materie, r.impostazioni, r.anni, r.annoCorrenteId])
  const toccata =
    prima.materie !== dopo.materie ||
    prima.impostazioni !== dopo.impostazioni ||
    prima.anni !== dopo.anni ||
    prima.annoCorrenteId !== dopo.annoCorrenteId
  if (toccata && intestazione(prima) !== intestazione(dopo)) {
    for (const corso of dopo.corsi) aggiungi({ corsoId: corso.id })
  }

  for (const { vecchia, nuova } of vociCambiate(prima.corsi, dopo.corsi)) {
    if (nuova) aggiungi({ corsoId: nuova.id })
    // Un corso tolto non ha fogli, ma i conti della sua classe cambiano.
    if (vecchia && !nuova) aggiungi({ classeId: vecchia.classeId })
  }
  for (const { vecchia, nuova } of vociCambiate(prima.classi, dopo.classi)) {
    aggiungi({ classeId: (nuova ?? vecchia)?.id ?? null })
  }

  // Le voci con un corso; lezioni e valutazioni hanno anche un giorno.
  const conCorso = <V extends { id: string; corsoId: string | null }>(
    vecchie: readonly V[],
    nuove: readonly V[],
    perSé: (voce: V) => Riferimenti,
  ): void => {
    for (const { vecchia, nuova } of vociCambiate(vecchie, nuove)) {
      if (nuova) aggiungi(perSé(nuova))
      if (vecchia?.corsoId && (!nuova || nuova.corsoId !== vecchia.corsoId)) {
        aggiungi({ corsoId: vecchia.corsoId })
      }
    }
  }
  conCorso(prima.lezioni, dopo.lezioni, (l) => ({ lezioneId: l.id }))
  conCorso(prima.valutazioni, dopo.valutazioni, (v) => ({ valutazioneId: v.id }))
  conCorso(prima.piani, dopo.piani, (p) => ({ pianoId: p.id }))
  conCorso(prima.consegne, dopo.consegne, (c) => ({ corsoId: c.corsoId }))

  return [...trovati.values()]
}
