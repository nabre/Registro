// I momenti di valutazione sganciati dalla tappa del piano che li genera.
//
// Un momento nasce da una tappa-prova del piano, dentro la sua lezione, e ne
// eredita titolo, tipo, peso e data. Può perdere l'aggancio (vedi
// `MotivoOrfano`). Non si ripara né si butta da solo: porta voti, che non si
// ricostruiscono. Si mostra il motivo e quanti voti porterebbe via.

import type { MomentoValutazione, Registro } from './models.js'
import { testi } from './orphans.testi.js'

/** Perché un momento non è agganciato a nessuna tappa. */
export type MotivoOrfano =
  /** Non cita nessun piano. */
  | 'senza-piano'
  /** Cita un piano, ma non dice da quale delle sue tappe venga. */
  | 'senza-tappa'
  /** Il piano che citava non esiste più. */
  | 'piano-sparito'
  /** La tappa che citava non è più nella scaletta. */
  | 'tappa-sparita'
  /** La tappa c'è ancora, ma ha smesso di essere una prova. */
  | 'tappa-non-valuta'

interface MomentoOrfano {
  momento: MomentoValutazione
  motivo: MotivoOrfano
  /** Quanti voti si porterebbe via: è il numero che fa decidere. */
  voti: number
}

/** Il motivo in una riga, letto dal catalogo nella lingua attuale. */
export const MOTIVI_ORFANO: Readonly<Record<MotivoOrfano, string>> = Object.defineProperties(
  {} as Record<MotivoOrfano, string>,
  Object.fromEntries(
    (Object.keys(testi.in('it')) as MotivoOrfano[]).map((motivo) => [
      motivo,
      { enumerable: true, get: () => testi()[motivo] },
    ]),
  ),
)

/**
 * Perché questo momento è sganciato, o null se è agganciato. Le domande vanno
 * nell'ordine in cui le cose si rompono (piano, tappa, tipo della tappa): la
 * prima risposta è quella che spiega.
 */
export function motivoOrfano (
  registro: Registro,
  momento: MomentoValutazione,
): MotivoOrfano | null {
  if (!momento.pianoId) return 'senza-piano'

  const piano = registro.piani.find((p) => p.id === momento.pianoId)
  if (!piano) return 'piano-sparito'

  if (!momento.attivitaId) return 'senza-tappa'

  const tappa = piano.attivita.find((a) => a.id === momento.attivitaId)
  if (!tappa) return 'tappa-sparita'

  // La tappa non è più una prova: il momento prodotto resta sganciato.
  if (!tappa.valutazione) return 'tappa-non-valuta'

  return null
}

/** Vero se il momento è agganciato alla tappa che lo ha fatto nascere. */
export function agganciato (registro: Registro, momento: MomentoValutazione): boolean {
  return motivoOrfano(registro, momento) === null
}

/**
 * Tutti i momenti sganciati, dal più recente: i vecchi sono i più difficili da
 * riconoscere e vanno guardati per ultimi, con più attenzione.
 */
export function valutazioniOrfane (
  registro: Registro,
  /** Solo quelle di questi corsi, quando si guarda una classe sola. */
  corsi?: Iterable<string>,
): MomentoOrfano[] {
  const soloQuesti = corsi ? new Set(corsi) : null
  return registro.valutazioni
    .filter((momento) => !soloQuesti || soloQuesti.has(momento.corsoId))
    .flatMap((momento) => {
      const motivo = motivoOrfano(registro, momento)
      if (!motivo) return []
      return [{ momento, motivo, voti: momento.voti.filter((v) => v.valore !== null).length }]
    })
    .sort((a, b) => b.momento.data.localeCompare(a.momento.data))
}
