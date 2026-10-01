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
  /** Un progetto: i suoi fogli stanno con quelli del suo corso. */
  progettoId?: string | null
  /**
   * Il giorno, quando lo si sa già senza cercarlo: quello di prima per una
   * voce spostata o tolta, che nel registro di adesso non c'è più.
   */
  giorno?: string | null
}

/**
 * I corsi i cui documenti una modifica rende vecchi, dal riferimento più
 * stretto: il corso; il corso di lezione, valutazione o piano; tutti i corsi
 * di una classe o di un allievo (un cognome sta su ogni foglio).
 *
 * Un id che non si trova dà niente, non «tutti»: di una voce eliminata o
 * spostata il corso di prima lo dice `riferimentiSpostati`.
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
  if (riferimenti.progettoId) {
    const progetto = registro.progetti.find((p) => p.id === riferimenti.progettoId)
    return unico(progetto?.corsoId)
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
  if (riferimenti.giorno) return riferimenti.giorno
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
  conCorso(prima.progetti, dopo.progetti, (p) => ({ corsoId: p.corsoId }))

  return [...trovati.values()]
}

/** Dove sta una voce che finisce nei fogli di un corso: il corso e il giorno. */
interface Posto {
  corsoId: string | null
  giorno: string | null
}

/**
 * Dove stava tutto prima di una scrittura: ogni voce che finisce nei fogli di
 * un corso, e la classe di ogni persona. Il registro si cambia in posto, e
 * dopo la scrittura una lezione spostata o tolta non dice più da dove veniva.
 */
export interface Impronta {
  voci: ReadonlyMap<string, Posto>
  allievi: ReadonlyMap<string, string>
}

/** Le voci con un corso, ognuna sotto la sua raccolta: gli id non si mescolano. */
function postiDi (registro: Registro): Map<string, Posto> {
  const posti = new Map<string, Posto>()
  for (const l of registro.lezioni) posti.set(`lezioni:${l.id}`, { corsoId: l.corsoId, giorno: l.data }) // testo-fisso: chiave interna
  for (const v of registro.valutazioni) posti.set(`valutazioni:${v.id}`, { corsoId: v.corsoId, giorno: v.data }) // testo-fisso: chiave interna
  for (const p of registro.piani) posti.set(`piani:${p.id}`, { corsoId: p.corsoId, giorno: null }) // testo-fisso: chiave interna
  for (const c of registro.consegne ?? []) posti.set(`consegne:${c.id}`, { corsoId: c.corsoId, giorno: c.data }) // testo-fisso: chiave interna
  for (const p of registro.progetti ?? []) posti.set(`progetti:${p.id}`, { corsoId: p.corsoId, giorno: null }) // testo-fisso: chiave interna
  return posti
}

/** La classe di ogni persona. */
function classiDegliAllievi (registro: Registro): Map<string, string> {
  const classi = new Map<string, string>()
  for (const classe of registro.classi) {
    for (const allievo of classe.allievi) classi.set(allievo.id, classe.id)
  }
  return classi
}

/** Fotografa il registro prima di una scrittura, per `riferimentiSpostati`. */
export function improntaDi (registro: Registro): Impronta {
  return { voci: postiDi(registro), allievi: classiDegliAllievi(registro) }
}

/**
 * I due capi di ogni spostamento fra l'impronta e il registro di adesso: una
 * voce passata a un altro corso o a un altro giorno tocca i fogli di dove
 * stava e di dove sta (il semestre lo sceglie il giorno); una tolta quelli di
 * dove stava, una nuova quelli di dove sta. Una persona cambiata di classe
 * tocca le due classi, una tolta quella dove stava.
 */
export function riferimentiSpostati (prima: Impronta, registro: Registro): Riferimenti[] {
  const trovati = new Map<string, Riferimenti>()
  const aggiungi = (riferimenti: Riferimenti): void => {
    trovati.set(JSON.stringify(riferimenti), riferimenti)
  }

  const adesso = postiDi(registro)
  for (const [chiave, vecchio] of prima.voci) {
    const nuovo = adesso.get(chiave)
    if (nuovo && nuovo.corsoId === vecchio.corsoId && nuovo.giorno === vecchio.giorno) continue
    if (vecchio.corsoId) aggiungi({ corsoId: vecchio.corsoId, giorno: vecchio.giorno })
    if (nuovo?.corsoId) aggiungi({ corsoId: nuovo.corsoId, giorno: nuovo.giorno })
  }
  // Le voci nuove: una copia può nascere in un altro giorno o corso di quello
  // che l'azione nomina.
  for (const [chiave, nuovo] of adesso) {
    if (!prima.voci.has(chiave) && nuovo.corsoId) {
      aggiungi({ corsoId: nuovo.corsoId, giorno: nuovo.giorno })
    }
  }

  const classi = classiDegliAllievi(registro)
  for (const [allievoId, vecchia] of prima.allievi) {
    const nuova = classi.get(allievoId)
    if (nuova === vecchia) continue
    aggiungi({ classeId: vecchia })
    if (nuova) aggiungi({ classeId: nuova })
  }

  return [...trovati.values()]
}
