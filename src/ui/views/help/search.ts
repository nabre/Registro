// La ricerca nella guida, con le parole di chi cerca e non di chi ha scritto.
//   1. Radici: si confronta senza desinenza, accenti né maiuscole.
//   2. Sinonimi: una tabella corta, scritta a mano (un sinonimo sbagliato
//      riempie i risultati di rumore).
//   3. Punteggio: una parola nel titolo vale più di una in fondo al testo; i
//      primi risultati sono le «migliori risposte».
// Senza risultati, «forse cercavi»: la parola della guida più vicina.
// Tutto puro, senza DOM: si prova in Node. Desinenze, parole vuote e sinonimi
// di ogni lingua stanno in `search.testi.ts`.

import { lingua, type Lingua } from '../../../i18n/index.js'
import { testi } from './search.testi.js'
import type { SezioneGuida, VoceGuida } from './types.js'

/**
 * Senza maiuscole e senza accenti: «perché» si trova anche scrivendo «perche».
 * Le legature del tedesco e del francese si sciolgono: «Strasse» trova
 * «Straße», «coeur» trova «cœur».
 */
export function piano (testo: string): string {
  return testo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'`*]/g, ' ')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
}

/** Le regole della ricerca in una lingua, pronte all'uso. */
interface Regole {
  lunghe: RegExp
  finali: RegExp
  vuote: ReadonlySet<string>
  /** Da una radice a tutte le radici dei suoi sinonimi, lei compresa. */
  parenti: ReadonlyMap<string, readonly string[]>
}

const REGOLE = new Map<Lingua, Regole>()

/** Le regole della lingua di adesso, costruite la prima volta che servono. */
function regole (): Regole {
  const qui = lingua()
  const fatto = REGOLE.get(qui)
  if (fatto) return fatto
  const t = testi()
  const { lunghe, finali } = t.desinenze()
  const nuovo: Regole = {
    lunghe: new RegExp(`(?:${lunghe.join('|')})$`),
    finali: new RegExp(`[${finali.join('')}]$`),
    vuote: new Set(t.vuote()),
    parenti: new Map(),
  }
  // Già qui, perché `radice` legge `lunghe` e `finali` dalle regole.
  REGOLE.set(qui, nuovo)
  const parenti = new Map<string, string[]>()
  for (const gruppo of t.sinonimi()) {
    const radici = gruppo.map((voce) => piano(voce).split(' ').map(radice).join(' '))
    for (const r of radici) {
      const gia = parenti.get(r) ?? []
      parenti.set(r, [...new Set([...gia, ...radici])])
    }
  }
  nuovo.parenti = parenti
  return nuovo
}

/**
 * La radice di una parola: senza la desinenza, se la parola è abbastanza
 * lunga da restare riconoscibile. «lezioni» e «lezione» → «lezion»;
 * «proiettare» e «proiettando» → «proiett», che trova anche «proietta» e
 * «proiettore»; «ora» resta «ora», perché «or» troverebbe mezzo vocabolario.
 */
export function radice (parola: string): string {
  const { lunghe, finali } = regole()
  if (parola.length > 6 && lunghe.test(parola)) return parola.replace(lunghe, '')
  return parola.length > 4 ? parola.replace(finali, '') : parola
}

/** Le parole cercate, già piane e ridotte a radice. Le parole vuote non contano. */
export function paroleDi (cercato: string): string[] {
  const { vuote } = regole()
  const parole = piano(cercato).split(/[^a-z0-9+]+/).filter(Boolean)
  const utili = parole.filter((parola) => !vuote.has(parola))
  // Se sono tutte vuote («come si fa») si cercano lo stesso.
  return (utili.length > 0 ? utili : parole).map(radice)
}

/**
 * Le forme che una parola cercata può avere nel testo: lei e i suoi sinonimi.
 * Anche i sinonimi di più parole, che si cercano interi.
 */
function formeDi (parola: string): readonly string[] {
  return regole().parenti.get(parola) ?? [parola]
}

/** Un testo, piano, con gli spazi normalizzati: ci si cerca dentro con `includes`. */
function campo (testo: string | undefined): string {
  return ` ${piano(testo ?? '').replace(/[^a-z0-9+]+/g, ' ')} `
}

/**
 * Una parola del testo risponde a una forma cercata se comincia con lei e
 * aggiunge al più tre lettere: «prov» trova «prova» e «prove» ma non
 * «provvisoria». Le forme lunghe trovano anche parole più lunghe.
 */
export function rispondeA (parola: string, forma: string): boolean {
  if (!parola.startsWith(forma)) return false
  return forma.length >= 6 || parola.length - forma.length <= 3
}

/**
 * Quanto vale trovare una forma in un posto: la parola cercata vale per
 * intero, un suo sinonimo un po' meno.
 */
function peso (dove: string, parola: string, forme: readonly string[], base: number): number {
  let migliore = 0
  for (const forma of forme) {
    const trovata = parolaInFila(dove.split(' ').filter(Boolean), forma.split(' '))
    if (!trovata) continue
    migliore = Math.max(migliore, forma === parola ? base : base * 0.6)
  }
  return migliore
}

/**
 * Le parole di `forma` si trovano una dopo l'altra fra `parole`, ognuna con
 * la sua desinenza: «person in formazion» trova «persone in formazione».
 */
function parolaInFila (parole: readonly string[], forma: readonly string[]): boolean {
  for (let inizio = 0; inizio + forma.length <= parole.length; inizio += 1) {
    if (forma.every((pezzo, i) => rispondeA(parole[inizio + i], pezzo))) return true
  }
  return false
}

interface VoceTrovata {
  voce: VoceGuida
  punti: number
}

export interface SezioneTrovata {
  sezione: SezioneGuida
  voci: VoceTrovata[]
  /** La voce migliore più un poco per ogni altra: una sezione che risponde in tanti punti sale. */
  punti: number
}

export interface Risultato {
  sezioni: SezioneTrovata[]
  /** Le radici cercate, con i loro sinonimi: servono a evidenziare. */
  forme: readonly string[]
  /** Quando non si trova niente: la parola della guida più vicina, se c'è. */
  forse?: string
}

/**
 * Cerca nella guida. Una voce risponde se **ogni** parola cercata — o un suo
 * sinonimo — sta nella voce o in quel che la sua sezione dice di sé.
 * Senza parole risponde tutto, in ordine, con zero punti.
 */
export function cerca (guida: readonly SezioneGuida[], cercato: string): Risultato {
  const parole = paroleDi(cercato)
  if (parole.length === 0) {
    return {
      sezioni: guida.map((sezione) => ({
        sezione,
        voci: sezione.voci.map((voce) => ({ voce, punti: 0 })),
        punti: 0,
      })),
      forme: [],
    }
  }
  const forme = parole.map(formeDi)
  const sezioni: SezioneTrovata[] = []
  for (const sezione of guida) {
    const titolo = campo(sezione.titolo)
    const sommario = campo(sezione.sommario)
    const contorno = campo([
      ...(sezione.figure ?? []).flatMap((figura) => [figura.didascalia, ...(figura.legenda ?? [])]),
      ...(sezione.note ?? []).map((nota) => nota.testo),
    ].join(' '))
    const voci: VoceTrovata[] = []
    for (const voce of sezione.voci) {
      const termine = campo(voce.termine)
      const tasti = campo(voce.tasti)
      const testo = campo(voce.testo)
      let punti = 0
      let tutte = true
      for (const [indice, forma] of forme.entries()) {
        const parola = parole[indice]
        const qui = Math.max(
          peso(titolo, parola, forma, 6),
          peso(termine, parola, forma, 5),
          peso(tasti, parola, forma, 4),
          peso(sommario, parola, forma, 3),
          peso(testo, parola, forma, 2),
          peso(contorno, parola, forma, 1),
        )
        if (qui === 0) { tutte = false; break }
        punti += qui
      }
      if (tutte) voci.push({ voce, punti })
    }
    if (voci.length === 0) continue
    const ordinate = [...voci].sort((a, b) => b.punti - a.punti)
    const punti = ordinate[0].punti + ordinate.slice(1).reduce((s, v) => s + v.punti * 0.1, 0)
    // Dentro la sezione le voci restano nel loro ordine (anche i passi numerati).
    sezioni.push({ sezione, voci, punti })
  }
  sezioni.sort((a, b) => b.punti - a.punti)
  const piatte = forme.flat()
  if (sezioni.length > 0) return { sezioni, forme: piatte }
  return { sezioni, forme: piatte, forse: forseCercavi(guida, cercato) }
}

/** Le voci migliori di tutta la guida, per la fascia in cima ai risultati. */
export function migliori (
  risultato: Risultato,
  quante = 5,
): { sezione: SezioneGuida, voce: VoceGuida }[] {
  return risultato.sezioni
    .flatMap(({ sezione, voci }) => voci.map(({ voce, punti }) => ({ sezione, voce, punti })))
    .sort((a, b) => b.punti - a.punti)
    .slice(0, quante)
    .map(({ sezione, voce }) => ({ sezione, voce }))
}

// ------------------------------------------------------------ forse cercavi

/** La distanza di modifica, fermandosi appena supera `tetto`. */
function distanza (a: string, b: string, tetto: number): number {
  if (Math.abs(a.length - b.length) > tetto) return tetto + 1
  let prima = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i += 1) {
    const riga = [i]
    let minimo = i
    for (let j = 1; j <= b.length; j += 1) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1
      riga[j] = Math.min(prima[j] + 1, riga[j - 1] + 1, prima[j - 1] + costo)
      minimo = Math.min(minimo, riga[j])
    }
    if (minimo > tetto) return tetto + 1
    prima = riga
  }
  return prima[b.length]
}

let vocabolario: { guida: readonly SezioneGuida[], parole: string[] } | null = null

/** Le parole della guida, una volta sola: la guida non cambia mentre il registro è aperto. */
function paroleDellaGuida (guida: readonly SezioneGuida[]): string[] {
  if (vocabolario?.guida === guida) return vocabolario.parole
  const tutte = new Set<string>()
  for (const sezione of guida) {
    const testi = [
      sezione.titolo,
      sezione.sommario,
      ...sezione.voci.flatMap((voce) => [voce.termine, voce.testo]),
    ]
    for (const parola of piano(testi.join(' ')).split(/[^a-z0-9]+/)) {
      if (parola.length >= 4) tutte.add(parola)
    }
  }
  vocabolario = { guida, parole: [...tutte] }
  return vocabolario.parole
}

/**
 * La correzione più vicina di quel che si è scritto: ogni parola lunga
 * almeno quattro lettere si sostituisce con la parola della guida a una
 * lettera di distanza — due, se è lunga. Se nessuna parola cambia, niente.
 */
export function forseCercavi (guida: readonly SezioneGuida[], cercato: string): string | undefined {
  const parole = piano(cercato).split(/\s+/).filter(Boolean)
  const vocabolo = paroleDellaGuida(guida)
  let cambiata = false
  const corrette = parole.map((parola) => {
    if (parola.length < 4 || vocabolo.includes(parola)) return parola
    const tetto = parola.length >= 8 ? 2 : 1
    let migliore: string | undefined
    let meglio = tetto + 1
    for (const candidata of vocabolo) {
      const d = distanza(parola, candidata, tetto)
      if (d < meglio) { meglio = d; migliore = candidata }
    }
    if (migliore === undefined) return parola
    cambiata = true
    return migliore
  })
  if (!cambiata) return undefined
  const proposta = corrette.join(' ')
  return cerca(guida, proposta).sezioni.length > 0 ? proposta : undefined
}
