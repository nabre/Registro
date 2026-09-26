// Che cosa manca, ora per ora: dove sono indietro?
//
// Copertura della scaletta, appello, verifiche: la diagnosi di un'ora si fa
// qui, una volta, perché è un giudizio sui dati («un'ora passata senza appello è
// un buco») che cruscotto, matrice, scheda del corso e vassoio devono contare
// allo stesso modo. Il conto delle ore riparte a ogni semestre, come medie e
// valutazioni.

import {
  confrontaLezioni,
  confrontaPianoConLezione,
  momentoLezione,
  riepilogaPresenze,
} from './calculations.js'
import type { Iso, Lezione, Ora, PianoLezione, Registro } from './models.js'
import { testi } from './dashboard.testi.js'

/**
 * Piani e valutazioni indicizzati per chi diagnostica molte ore insieme (il
 * vassoio, ogni mezzo minuto). Si costruisce per chiamata e si butta: il
 * registro del processo principale cambia sul posto.
 */
export interface IndiceDiagnosi {
  piani: ReadonlyMap<string, PianoLezione>
  /** Le lezioni che hanno almeno una valutazione appesa. */
  valutate: ReadonlySet<string>
}

export function indiceDiagnosi (registro: Registro): IndiceDiagnosi {
  const piani = new Map<string, PianoLezione>()
  // Il primo vince, come `find`: due piani con lo stesso id sono un guasto
  // che non si decide qui.
  for (const piano of registro.piani) if (!piani.has(piano.id)) piani.set(piano.id, piano)
  const valutate = new Set<string>()
  for (const v of registro.valutazioni) if (v.lezioneId !== null) valutate.add(v.lezioneId)
  return { piani, valutate }
}

/**
 * Un segno su una lezione: buchi da chiudere, o fatti da vedere senza aprire
 * l'ora (una verifica, osservazioni da rileggere).
 */
type Segno =
  | 'svolta'
  | 'da-segnare'
  | 'senza-appello'
  | 'assenze'
  | 'scoperta'
  | 'coperta'
  | 'valutazione'
  | 'osservazioni'
  | 'consuntivo'
  | 'todo'
  | 'in-corso'
  | 'annullata'

/** Quanto un'ora chiede attenzione: tre livelli bastano. */
type Urgenza = 'apposto' | 'da-preparare' | 'manca'

/**
 * Quanto della lezione la scaletta copre, da 0 in su: zero senza piano o con
 * piano vuoto, uno se la riempie, oltre se sfora.
 */
function coperturaDellOra (registro: Registro, lezione: Lezione, indice?: IndiceDiagnosi): number {
  const piano = indice
    ? (lezione.pianoId === null ? undefined : indice.piani.get(lezione.pianoId))
    : registro.piani.find((p) => p.id === lezione.pianoId)
  if (!piano) return 0
  const { durataPiano, udLezione } =
    confrontaPianoConLezione(piano, lezione, registro.impostazioni.minutiUd)
  if (udLezione <= 0) return durataPiano > 0 ? 1 : 0
  return durataPiano / udLezione
}

/**
 * Se la scaletta copre l'ora: non basta un piano appeso, il tempo previsto
 * deve arrivare in fondo all'ora. Il margine (un millesimo di UD) assorbe la
 * virgola mobile delle durate in minuti. Sforare copre; lo segnala
 * `confrontaPianoConLezione` a chi prepara.
 */
export function oraCoperta (
  registro: Registro,
  lezione: Lezione,
  indice?: IndiceDiagnosi,
): boolean {
  return coperturaDellOra(registro, lezione, indice) >= 1 - 0.001
}

interface DiagnosiLezione {
  lezione: Lezione
  /** Il numero d'ordine dentro il suo semestre, contando solo le ore che valgono. */
  numero: number
  segni: Segno[]
  urgenza: Urgenza
  /** Quanti assenti risultano dall'appello, se è stato fatto. */
  assenti: number
  osservazioni: number
  /** Le cose da fare che aspettano quest'ora: oggi sempre zero (vedi `diagnosiLezione`). */
  todo: number
}

/**
 * A che punto è un'ora, in una parola. «Fase» perché `lezione.stato` (quel che
 * il docente dichiara) e `statoDellOra` (presenza di un allievo) esistono già.
 * `Segno` e `Urgenza` servono al cruscotto; chi scrive una riga sola (menu,
 * notifica) usa questa.
 *
 * L'ordine conta: `annullata` prima di tutto (non c'è stata, niente da
 * chiudere); `in-corso` prima di passato e futuro; `da-chiudere` prima di
 * `svolta`, come `urgenza === 'manca'`.
 */
export type FaseOra =
  | 'annullata'
  | 'in-corso'
  | 'da-chiudere'
  | 'svolta'
  | 'da-preparare'
  | 'futura'

export function faseDellOra (
  registro: Registro,
  lezione: Lezione,
  oggi: Iso,
  ora: Ora = '23:59',
  indice?: IndiceDiagnosi,
): FaseOra {
  if (lezione.stato === 'annullata') return 'annullata'

  const momento = momentoLezione(lezione, oggi, ora)
  if (momento === 'in-corso') return 'in-corso'

  const { urgenza } = diagnosiLezione(registro, lezione, 0, oggi, ora, indice)
  if (momento === 'passata') return urgenza === 'manca' ? 'da-chiudere' : 'svolta'
  return urgenza === 'da-preparare' ? 'da-preparare' : 'futura'
}

/** Le ore di un corso divise per stato, ognuna in ordine di calendario. */
export interface OreRaggruppate {
  inCorso: Lezione[]
  daChiudere: Lezione[]
  /** Le future, con e senza piano: l'ordine è quello del calendario. */
  prossime: Lezione[]
  svolte: Lezione[]
  annullate: Lezione[]
}

/**
 * Divide le ore di un corso nei mucchi da vedere separati. Le svolte dalla più
 * recente, le prossime dalla più vicina.
 */
export function raggruppaOre (
  registro: Registro,
  lezioni: Lezione[],
  oggi: Iso,
  ora: Ora = '23:59',
  indice: IndiceDiagnosi = indiceDiagnosi(registro),
): OreRaggruppate {
  const esito: OreRaggruppate = {
    inCorso: [], daChiudere: [], prossime: [], svolte: [], annullate: [],
  }

  for (const lezione of [...lezioni].sort(confrontaLezioni)) {
    switch (faseDellOra(registro, lezione, oggi, ora, indice)) {
      case 'annullata': esito.annullate.push(lezione); break
      case 'in-corso': esito.inCorso.push(lezione); break
      case 'da-chiudere': esito.daChiudere.push(lezione); break
      case 'svolta': esito.svolte.push(lezione); break
      default: esito.prossime.push(lezione)
    }
  }

  esito.svolte.reverse()
  return esito
}

/** L'ora che chiede di essere compilata, o — se non ce n'è — la prossima da fare. */
interface OraDaFare {
  lezione: Lezione
  /** Vero se è un buco rimasto indietro; falso se è solo la prossima in programma. */
  manca: boolean
}

/**
 * Fra tutte le ore, quella su cui andare adesso: prima i buchi (il più vecchio,
 * che si sta dimenticando), poi il futuro. Il giudizio è di `diagnosiLezione`,
 * lo stesso del cruscotto. `null` senza buchi né ore future.
 */
export function oraDaCompilare (
  registro: Registro,
  lezioni: Lezione[],
  oggi: Iso,
  ora: Ora = '23:59',
  indice: IndiceDiagnosi = indiceDiagnosi(registro),
): OraDaFare | null {
  const inOrdine = [...lezioni].sort(confrontaLezioni)

  const buco = inOrdine.find(
    (lezione) => diagnosiLezione(registro, lezione, 0, oggi, ora, indice).urgenza === 'manca',
  )
  if (buco) return { lezione: buco, manca: true }

  // Nessun buco: si guarda avanti con `momentoLezione`, perché l'ora delle otto
  // a mezzogiorno è passata.
  const prossima = inOrdine.find(
    (lezione) => lezione.stato !== 'annullata' && momentoLezione(lezione, oggi, ora) !== 'passata',
  )
  return prossima ? { lezione: prossima, manca: false } : null
}

/**
 * Che cosa dire di un'ora. Il passato si giudica sull'orario e non sullo
 * stato dichiarato, che è proprio quel che ci si dimentica di aggiornare.
 */
export function diagnosiLezione (
  registro: Registro,
  lezione: Lezione,
  numero: number,
  oggi: Iso,
  ora: Ora = '23:59',
  indice?: IndiceDiagnosi,
): DiagnosiLezione {
  const segni: Segno[] = []
  // L'ora delle otto a mezzogiorno è finita: se manca l'appello, manca adesso.
  const momento = momentoLezione(lezione, oggi, ora)
  const passata = momento === 'passata'
  if (momento === 'in-corso' && lezione.stato !== 'annullata') segni.push('in-corso')
  const presenze = riepilogaPresenze(lezione.presenze)
  const osservazioni = lezione.osservazioni.length

  if (lezione.stato === 'annullata') segni.push('annullata')
  if (lezione.stato === 'svolta') segni.push('svolta')

  // I buchi: cose che a quest'ora dovevano esserci e non ci sono.
  // Righe di appello tutte vuote sono un appello non fatto.
  const senzaAppello = presenze.udTotali === 0
  const annullata = lezione.stato === 'annullata'
  if (passata && senzaAppello && !annullata) segni.push('senza-appello')
  if (passata && lezione.stato !== 'svolta' && !annullata) segni.push('da-segnare')

  // Un'ora futura scoperta è lavoro da fare; una passata non conta più.
  if (oraCoperta(registro, lezione, indice)) segni.push('coperta')
  else if (!passata && !annullata) segni.push('scoperta')

  // I fatti che si vogliono vedere senza aprire l'ora.
  const valutata = indice
    ? indice.valutate.has(lezione.id)
    : registro.valutazioni.some((v) => v.lezioneId === lezione.id)
  if (valutata) segni.push('valutazione')
  if (osservazioni > 0) segni.push('osservazioni')
  if ((lezione.consuntivo ?? '').trim() || (lezione.argomenti ?? '').trim()) {
    segni.push('consuntivo')
  }
  // Assente per una parte dell'ora conta: la domanda è «devo guardarla?».
  const mancanti = presenze.assenti + presenze.parziali
  if (!senzaAppello && mancanti > 0) segni.push('assenze')
  // Il segno «todo» e il campo `todo` restano nel tipo ma qui non si
  // calcolano: nessuna vista li usa.
  // nessuna vista li usa.

  const urgenza: Urgenza =
    segni.includes('senza-appello') || segni.includes('da-segnare')
      ? 'manca'
      : segni.includes('scoperta')
        ? 'da-preparare'
        : 'apposto'

  return { lezione, numero, segni, urgenza, assenti: mancanti, osservazioni, todo: 0 }
}

/**
 * Perché un'ora è rimasta aperta, a parole («senza appello», «non segnata
 * svolta»): buchi diversi che si chiudono in posti diversi. Vuoto se non manca
 * niente.
 */
export function cosaManca (diagnosi: DiagnosiLezione): string[] {
  const t = testi()
  const pezzi: string[] = []
  if (diagnosi.segni.includes('senza-appello')) pezzi.push(t.senzaAppello)
  if (diagnosi.segni.includes('da-segnare')) pezzi.push(t.nonSegnataSvolta)
  return pezzi
}
