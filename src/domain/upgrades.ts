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
export const PASSI_DEL_FORMATO: readonly PassoDelFormato[] = []

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
 * Il contrario di `fraseVersionePiuRecente`: che cosa dice, o `null`. Si cerca
 * in tutte le lingue, perché l'errore può precedere un cambio di lingua.
 */
export function versionePiuRecente (testo: string): VersionePiuRecente | null {
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
