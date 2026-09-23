// Eventi e cose da smaltire: la valuta con cui il registro tiene insieme i
// pezzi.
//
// Non c'è niente di sottile qui tranne una cosa, ed è la forma di `event`: non
// è un elenco di ascoltatori, è una *funzione* che iscrive e restituisce il
// modo di disiscriversi. Il progetto ci conta dappertutto —
// `archivio.alCambiamento(…)` finisce dritto dentro `contesto.subscriptions`,
// e la stessa riga iscrive e registra la disiscrizione.

/** Qualunque cosa si possa chiudere: è la forma minima che `Smaltitore.from` accetta. */
export interface Smaltibile {
  dispose (): unknown
}

/**
 * Una cosa da chiudere.
 *
 * Il conto delle chiusure sta in una variabile del costruttore e non in un
 * campo `#privato`, e la ragione è una regola di TypeScript che si paga cara:
 * una classe con un campo privato non si può *implementare*, si può solo
 * estendere. Nel registro c'è mezza dozzina di `class X implements
 * apparato.Smaltitore` — `Archivio`, `Smistatore` — e con il campo privato
 * nessuna di quelle compilerebbe. Chiuso dentro il costruttore, il conto è
 * altrettanto inaccessibile da fuori e la classe resta implementabile.
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
    // Una volta sola: `contesto.subscriptions` e un `dispose()` esplicito
    // possono arrivare tutti e due, e la seconda chiusura di un file o di un
    // timer già chiuso è il genere di errore che si vede solo in produzione.
    let rimasto: (() => unknown) | null = smaltisci
    this.dispose = () => {
      const fare = rimasto
      rimasto = null
      if (fare) fare()
    }
  }
}

/**
 * Un evento a cui ci si iscrive. Gli argomenti dopo l'ascoltatore sono quelli
 * di VS Code: il `this` da legare e un elenco in cui infilare la disiscrizione.
 */
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
    // Su una copia: un ascoltatore che si disiscrive mentre l'evento gira —
    // ne esistono, `panels/panel.ts` ne ha — altrimenti accorcerebbe l'insieme
    // sotto i piedi del ciclo.
    for (const ascoltatore of [...this.#ascoltatori]) {
      try {
        ascoltatore(evento)
      } catch (errore) {
        // Un ascoltatore che cade non deve impedire agli altri di sentire:
        // è la regola di VS Code, e qui vale per lo stesso motivo — chi
        // ascolta il cambiamento del registro non sa nulla degli altri.
        console.error('errore in un ascoltatore di eventi', errore)
      }
    }
  }

  dispose (): void {
    this.#ascoltatori.clear()
  }
}

export interface Annullamento {
  readonly isCancellationRequested: boolean
  readonly onCancellationRequested: Event<unknown>
}

/** Il gettone vero: sta separato dall'origine perché chi lo riceve non lo possa annullare. */
class Gettone implements Annullamento {
  #annullato = false
  readonly #emettitore = new EventEmitter<unknown>()
  readonly onCancellationRequested = this.#emettitore.event

  get isCancellationRequested (): boolean {
    return this.#annullato
  }

  annulla (): void {
    if (this.#annullato) return
    this.#annullato = true
    this.#emettitore.fire(undefined)
  }

  chiudi (): void {
    this.#emettitore.dispose()
  }
}

export class SorgenteAnnullamento {
  readonly #proprio = new Gettone()
  readonly token: Annullamento = this.#proprio

  cancel (): void {
    this.#proprio.annulla()
  }

  dispose (): void {
    this.#proprio.chiudi()
  }
}
