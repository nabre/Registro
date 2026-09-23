// I momenti di valutazione rimasti senza la tappa che li ha fatti nascere.
//
// Un momento nasce in un posto solo: la tappa del piano che dichiara di essere
// una prova, dentro la lezione in cui la prova si fa. Da lì eredita titolo,
// tipo, peso e data, e resta agganciato a quella riga di scaletta — è così che
// il registro sa rispondere a «questa verifica di che tappa era?».
//
// Ce ne sono che quell'aggancio non ce l'hanno. Sono di tre provenienze:
//
//   - i vecchi, creati quando un momento si poteva fare da cinque punti
//     diversi — la vista Valutazioni, la scheda del corso, l'ora, il piano, il
//     comando «nuovo» — e nessuno di quei punti chiedeva da quale tappa
//     venisse;
//   - quelli a cui la tappa è stata tolta dal piano dopo;
//   - quelli la cui tappa c'è ancora ma ha smesso di essere una prova.
//
// Non si riparano da soli e non si buttano da soli. Un momento porta dei voti,
// e i voti sono l'unica cosa del registro che non si può rifare guardando
// altrove: si dice quali sono, si dice perché sono sganciati e quanti voti si
// porterebbero via, e si lascia decidere.

import type { MomentoValutazione, Registro } from './models.js'

/** Perché un momento non è agganciato a nessuna tappa. */
type MotivoOrfano =
  /** Non cita nessun piano: creato quando lo si poteva fare da fuori. */
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

/** Come si dice il motivo, in una riga. */
export const MOTIVI_ORFANO: Record<MotivoOrfano, string> = {
  'senza-piano': 'non viene da nessun piano lezione',
  'senza-tappa': 'viene da un piano, ma non si sa da quale tappa',
  'piano-sparito': 'il piano da cui veniva non esiste più',
  'tappa-sparita': 'la tappa da cui veniva non è più nella scaletta',
  'tappa-non-valuta': 'la sua tappa non è più una valutazione',
}

/**
 * Perché questo momento è sganciato, o null se è agganciato com'era previsto.
 *
 * L'ordine delle domande è quello in cui si rompono le cose: prima il piano,
 * poi la tappa, poi che cosa la tappa dice di essere. Fermarsi alla prima che
 * risponde è quel che rende il motivo utile: «il piano non c'è più» spiega
 * tutto, «la tappa non c'è» detto di un piano sparito non spiega niente.
 */
export function motivoOrfano (registro: Registro, momento: MomentoValutazione): MotivoOrfano | null {
  if (!momento.pianoId) return 'senza-piano'

  const piano = registro.piani.find((p) => p.id === momento.pianoId)
  if (!piano) return 'piano-sparito'

  if (!momento.attivitaId) return 'senza-tappa'

  const tappa = piano.attivita.find((a) => a.id === momento.attivitaId)
  if (!tappa) return 'tappa-sparita'

  // Una tappa che ha smesso di essere una prova non produce piu momenti, e
  // quello che aveva prodotto resta a galleggiare: si dice, invece di far
  // finta che il legame regga ancora.
  if (!tappa.valutazione) return 'tappa-non-valuta'

  return null
}

/** Vero se il momento è agganciato alla tappa che lo ha fatto nascere. */
export function agganciato (registro: Registro, momento: MomentoValutazione): boolean {
  return motivoOrfano(registro, momento) === null
}

/**
 * Tutti i momenti sganciati, dal più recente al più vecchio.
 *
 * In quest'ordine perché è l'ordine in cui li si riconosce: quelli di ieri si
 * sa che cosa erano, quelli di ottobre no — e sono proprio quelli che vanno
 * guardati con più attenzione prima di buttarli.
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
