// I passi del formato: come un documento scritto da un registro più vecchio
// diventa un documento di questo.
//
// `VERSIONE_DATI` sta in testa a ogni documento. Uno con numero più alto si
// rifiuta (riscriverlo perderebbe quel che non si sa leggere); uno più basso si
// porta avanti un passo alla volta e si riscrive intero, dopo averne messo da
// parte una copia (`data/archive.ts`).
//
// Un passo porta i dati grezzi (prima della normalizzazione) da `a - 1` ad `a`
// quando la forma cambia davvero: rinomina, spostamento, unità. Un campo nuovo
// col suo predefinito non ha `porta`: lo mette la normalizzazione, ma il passo
// c'è lo stesso perché l'elenco non abbia buchi.
//
// Ogni `VERSIONE_DATI` nuova vuole qui il suo passo e in `tests/samples/formato/`
// il suo campione (`npm run sample`): lo pretendono `upgrades.test.mjs` e
// `formatUpgrade.test.mjs`. Vedi la skill `formato`.

import { VERSIONE_DATI } from './models.js'
import { testi } from './upgrades.testi.js'

/**
 * Quel che si è letto da un documento, prima della normalizzazione: una voce
 * per file — `registro` per l'intestazione, e una per collezione — con dentro
 * il JSON com'era.
 */
type DatiGrezzi = Readonly<Record<string, unknown>>

interface PassoDelFormato {
  /** La versione a cui porta. Si parte dalla precedente, `a - 1`. */
  a: number
  /** Che cosa cambia, per chi apre un documento vecchio (da `upgrades.testi.ts`). */
  readonly cambia: string
  /**
   * Come si portano i dati: riceve una copia sua, può cambiarla, torna i dati
   * della versione `a`. Assente se non c'è niente da spostare.
   */
  porta?: (dati: Record<string, unknown>) => Record<string, unknown>
}

/** I passi, in ordine: da una versione alla successiva, fino a `VERSIONE_DATI`. */
export const PASSI_DEL_FORMATO: readonly PassoDelFormato[] = [
  {
    a: 2,
    get cambia () {
      return testi().passi[2]
    },
  },
  // Dopo la 1.0.0 (formato 2): le pendenze del docente di classe, i dati
  // strutturati del docente, il calendario ufficiale dell'anno e la lezione di
  // supplenza. Tutti campi nuovi con il loro predefinito: niente da portare.
  {
    a: 3,
    get cambia () {
      return testi().passi[3]
    },
  },
  // I progetti dei corsi (ADR-54): una collezione nuova, vuota nei documenti
  // vecchi, e `progettoId` su tappe e momenti, assente vuol dire nessuno. E il
  // piano perde le note: quel che c'era scritto si accoda ai prerequisiti, con
  // l'etichetta davanti, per non perderlo.
  {
    a: 4,
    get cambia () {
      return testi().passi[4]
    },
    porta: (dati) => {
      if (!Array.isArray(dati.piani)) return dati
      return { ...dati, piani: dati.piani.map(noteNeiPrerequisiti) }
    },
  },
  // I minuti di ritardo per UD: in un'ora si può arrivare tardi più volte. Il
  // numero unico di prima va sulla prima UD in ritardo; senza nessuna non
  // diceva niente (l'appello lo toglieva già) e se ne va.
  {
    a: 5,
    get cambia () {
      return testi().passi[5]
    },
    porta: (dati) => {
      if (!Array.isArray(dati.lezioni)) return dati
      return { ...dati, lezioni: dati.lezioni.map(ritardiPerUd) }
    },
  },
  {
    a: 6,
    get cambia () {
      return testi().passi[6]
    },
  },
]

/** Un oggetto letto dal disco, o nullo se non lo è. */
function voce (valore: unknown): Record<string, unknown> | null {
  return valore && typeof valore === 'object' && !Array.isArray(valore)
    ? valore as Record<string, unknown>
    : null
}

/** Una lezione con i `minuti` di ogni presenza portati sulla sua prima UD in ritardo. */
function ritardiPerUd (lezione: unknown): unknown {
  const dati = voce(lezione)
  if (!dati || !Array.isArray(dati.presenze)) return lezione
  return {
    ...dati,
    presenze: dati.presenze.map((grezza: unknown) => {
      const presenza = voce(grezza)
      if (!presenza || !('minuti' in presenza)) return grezza
      const { minuti, ...resto } = presenza
      // Prima ancora degli stati per UD c'era uno stato solo, per tutta l'ora.
      const stati: unknown[] = Array.isArray(resto.stati) ? resto.stati : [resto.stato]
      const prima = stati.indexOf('ritardo')
      if (prima < 0 || typeof minuti !== 'number' || !Number.isFinite(minuti)) return resto
      const ritardi = stati.map((_, i) => (i === prima ? Math.max(0, minuti) : 0))
      return { ...resto, ritardi }
    }),
  }
}

/**
 * Le note di un piano accodate ai prerequisiti, dopo una riga vuota. Un piano
 * senza note resta com'è, salvo la chiave vuota che se ne va.
 */
function noteNeiPrerequisiti (piano: unknown): unknown {
  if (!piano || typeof piano !== 'object' || Array.isArray(piano)) return piano
  const { note, ...resto } = piano as Record<string, unknown>
  const scritte = typeof note === 'string' ? note.trim() : ''
  if (!scritte) return 'note' in piano ? resto : piano
  const prima = typeof resto.prerequisiti === 'string' ? resto.prerequisiti.trimEnd() : ''
  const accodate = testi().noteNeiPrerequisiti(scritte)
  return { ...resto, prerequisiti: prima ? `${prima}\n\n${accodate}` : accodate }
}

/** Com'è andata la lettura di un documento: da che versione, a quale, con quali passi. */
export interface FormatoAggiornato {
  dati: DatiGrezzi
  da: number
  a: number
  passi: readonly PassoDelFormato[]
}

/**
 * I dati di un documento scritto alla versione `da`, portati a
 * `VERSIONE_DATI`, su una copia: i dati letti non si toccano. Già aggiornato o
 * senza numero (scritto a mano) torna com'è; uno più recente non arriva qui.
 * `passi` si passa solo nelle prove.
 */
export function aggiornaFormato (
  dati: DatiGrezzi,
  da: number | null,
  passi: readonly PassoDelFormato[] = PASSI_DEL_FORMATO,
): FormatoAggiornato {
  const fino = passi.length > 0 ? passi[passi.length - 1].a : VERSIONE_DATI
  if (da === null || da >= fino) return { dati, da: da ?? fino, a: da ?? fino, passi: [] }
  const percorsi = passi.filter((passo) => passo.a > da)
  let correnti: Record<string, unknown> = structuredClone({ ...dati })
  for (const passo of percorsi) {
    if (passo.porta) correnti = passo.porta(correnti)
  }
  return { dati: correnti, da, a: fino, passi: percorsi }
}

/**
 * Che cosa è cambiato, in una frase. Più passi si elencano in ordine.
 */
export function raccontaAggiornamento (esito: FormatoAggiornato): string {
  return testi().racconto(esito.da, esito.a, esito.passi.map((passo) => passo.cambia))
}

// ------------------------------------------------ un anno da un registro più recente

/** Quel che si dice di un anno scritto da un registro più recente. */
export interface VersionePiuRecente {
  /** Il nome del file, `2027-2028.regi`. */
  file: string
  /** Quale numero non torna: il contenitore (`VERSIONE_PACCHETTO`) o i dati dentro. */
  cosa: 'formato' | 'dati'
  delFile: number
  quiFinoA: number
}

/**
 * La frase con cui si rifiuta un anno scritto da un registro più recente. Una
 * sola per chi la scrive (apertura, lettura di un altro anno, contenitore) e
 * per chi la riconosce (`environment/dialogs.ts`, il pannello) tramite
 * `versionePiuRecente`.
 */
export function fraseVersionePiuRecente (versione: VersionePiuRecente): string {
  const t = testi()
  const { file, cosa, delFile, quiFinoA } = versione
  return `${t.scrittoDaRecente(file, t.cosa[cosa], delFile, quiFinoA)}. ${t.aggiornaInvece}`
}

export class ErroreVersionePiuRecente extends Error {
  readonly dettaglio: VersionePiuRecente
  constructor (dettaglio: VersionePiuRecente) {
    super(fraseVersionePiuRecente(dettaglio))
    this.name = 'ErroreVersionePiuRecente'
    this.dettaglio = dettaglio
  }
}

function èVersionePiuRecente (valore: unknown): valore is VersionePiuRecente {
  if (typeof valore !== 'object' || valore === null) return false
  const o = valore as Record<string, unknown>
  return (
    typeof o.file === 'string' &&
    (o.cosa === 'formato' || o.cosa === 'dati') &&
    typeof o.delFile === 'number' &&
    typeof o.quiFinoA === 'number'
  )
}

/** Un testo messo dentro un'espressione regolare così com'è. */
function letterale (testo: string): string {
  return testo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * L'espressione che ritrova la frase in una lingua, ricavata dalla frase con
 * segnaposto al posto dei quattro dati: regge ai ritocchi e all'ordine delle
 * parole di ogni lingua.
 */
function riconoscitore (t: ReturnType<typeof testi>): RegExp {
  const [FILE, COSA, DEL_FILE, QUI_FINO_A] = ['\u0001', '\u0002', 900000001, 900000002]
  const cose = [t.cosa.formato, t.cosa.dati].map(letterale).join('|')
  const sorgente = letterale(t.scrittoDaRecente(FILE, COSA, DEL_FILE, QUI_FINO_A))
    .replace(/\s+/g, '\\s+')
    .replace(FILE, '(?<file>[^:\\n]*?)')
    .replace(COSA, `(?<cosa>${cose})`)
    .replace(String(DEL_FILE), '(?<delFile>\\d+)')
    .replace(String(QUI_FINO_A), '(?<quiFinoA>\\d+)')
  return new RegExp(sorgente)
}

/**
 * Il contrario di `fraseVersionePiuRecente`: che cosa dice, o `null`.
 * Riconosce direttamente un `ErroreVersionePiuRecente` o un oggetto col suo
 * `dettaglio`, oppure cerca la frase in tutte le lingue per retrocompatibilità.
 */
export function versionePiuRecente (valore: unknown): VersionePiuRecente | null {
  if (valore instanceof ErroreVersionePiuRecente) return valore.dettaglio
  if (
    typeof valore === 'object' &&
    valore !== null &&
    'dettaglio' in valore &&
    èVersionePiuRecente(valore.dettaglio)
  ) {
    return valore.dettaglio
  }
  const testo = typeof valore === 'string'
    ? valore
    : valore instanceof Error
      ? valore.message
      : null
  if (!testo) return null
  for (const t of testi.tutte()) {
    const trovato = riconoscitore(t).exec(testo)?.groups
    if (!trovato) continue
    return {
      file: (trovato.file ?? '').trim(),
      cosa: trovato.cosa === t.cosa.dati ? 'dati' : 'formato',
      delFile: Number(trovato.delFile),
      quiFinoA: Number(trovato.quiFinoA),
    }
  }
  return null
}
