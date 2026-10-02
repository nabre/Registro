// Il registro della pagina seguito a differenze: l'host manda il registro
// intero solo quando serve (`MessaggioStato`), e poi le patch di ogni
// scrittura (`MessaggioDifferenze`). Le patch fanno un registro nuovo con
// oggetti nuovi solo lungo i percorsi toccati: le collezioni non toccate
// restano le stesse, e i conti di `derivato()` fatti su di loro valgono ancora.

import { Immer, enablePatches } from 'immer'

import type { Registro } from '#core/dominio/models.js'
import type { MessaggioDifferenze, PatchRegistro } from '#contract/protocol.js'

enablePatches()

/**
 * Un immer tutto nostro. `autoFreeze` spento: il registro della pagina non è
 * mai stato congelato (lo tiene immutabile la regola di `state.ts`, che non lo
 * cambia sul posto), e congelarne solo i pezzi toccati lo renderebbe diverso a
 * seconda della strada da cui è arrivato.
 */
const immer = new Immer({ autoFreeze: false })

/** Il registro con le patch applicate: un oggetto nuovo, quello di prima resta com'era. */
export function applicaPatch (registro: Registro, patch: readonly PatchRegistro[]): Registro {
  if (patch.length === 0) return registro
  return immer.applyPatches(registro, patch)
}

/**
 * Tiene il conto della revisione del registro che la pagina ha. Le differenze
 * valgono solo sul registro della revisione da cui partono: fuori sequenza, o
 * con patch che non si applicano, il registro resta quello di prima e si
 * chiede all'host lo stato intero, una volta sola finché non arriva.
 */
export class SeguitoDelRegistro {
  private revisione: number | null = null
  private inAttesa = false

  constructor (private readonly chiediIntero: () => void) {}

  /** Il registro intero: da qui ripartono le differenze. */
  intero (registro: Registro, revisione: number | undefined): Registro {
    // Un host di prima delle differenze non manda la revisione: niente seguito.
    this.revisione = typeof revisione === 'number' ? revisione : null
    this.inAttesa = false
    return registro
  }

  /**
   * Il registro dopo le differenze, o `null` se non si applicano: allora la
   * pagina tiene quello che ha finché arriva lo stato intero.
   */
  differenze (registro: Registro, messaggio: Pick<MessaggioDifferenze, 'da' | 'revisione' | 'patch'>): Registro | null {
    if (this.inAttesa) return null
    if (this.revisione === null || messaggio.da !== this.revisione) return this.perso()
    let nuovo: Registro
    try {
      nuovo = applicaPatch(registro, messaggio.patch)
    } catch (errore) {
      console.warn('[differenze] patch che non si applicano: si chiede lo stato intero', errore)
      return this.perso()
    }
    this.revisione = messaggio.revisione
    return nuovo
  }

  private perso (): null {
    this.revisione = null
    this.inAttesa = true
    this.chiediIntero()
    return null
  }
}
