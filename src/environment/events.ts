// Eventi e cose da smaltire. `event` è una funzione che iscrive e restituisce
// la disiscrizione, così una riga sola iscrive e la mette in `contesto.subscriptions`.

/** Qualunque cosa si possa chiudere. */
export interface Smaltibile {
  dispose (): unknown
}

/**
 * Una cosa da chiudere. Lo stato sta in una chiusura del costruttore e non in
 * un campo `#privato`, perché una classe con campi privati non si può
 * `implements` (lo fanno `Archivio`, `Smistatore`…).
 */
export class Smaltitore {
  /** Raccoglie più cose da smaltire in una sola. */
  static from (...smaltibili: Smaltibile[]): Smaltitore {
    return new Smaltitore(() => {
      for (const smaltibile of smaltibili) smaltibile.dispose()
    })
  }

  readonly dispose: () => void

  constructor (smaltisci: () => unknown) {
    // Una volta sola: possono chiudere sia `contesto.subscriptions` sia un `dispose()` esplicito.
    let rimasto: (() => unknown) | null = smaltisci
    this.dispose = () => {
      const fare = rimasto
      rimasto = null
      if (fare) fare()
    }
  }
}

/** Un evento: iscrive l'ascoltatore, con `this` opzionale ed elenco in cui mettere la disiscrizione. */
export type Event<T> = (
  ascoltatore: (evento: T) => unknown,
  questo?: unknown,
  smaltibili?: Smaltitore[],
) => Smaltitore

export class EventEmitter<T> {
  #ascoltatori = new Set<(evento: T) => unknown>()

  readonly event: Event<T> = (ascoltatore, questo, smaltibili) => {
    const legato = questo === undefined ? ascoltatore : ascoltatore.bind(questo)
    this.#ascoltatori.add(legato)
    const smaltibile = new Smaltitore(() => this.#ascoltatori.delete(legato))
    smaltibili?.push(smaltibile)
    return smaltibile
  }

  fire (evento: T): void {
    // Su una copia: un ascoltatore può disiscriversi durante il giro (`panels/panel.ts`).
    for (const ascoltatore of [...this.#ascoltatori]) {
      try {
        ascoltatore(evento)
      } catch (errore) {
        // Un ascoltatore che cade non ferma gli altri.
        console.error('errore in un ascoltatore di eventi', errore)
      }
    }
  }

  dispose (): void {
    this.#ascoltatori.clear()
  }
}
