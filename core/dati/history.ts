// La storia delle modifiche per annulla e ripristina, solo in memoria.
// Un passo è un gesto (più `modifica` raccolte con `AsyncLocalStorage` dentro
// `inUnPasso`) e sa com'era prima ogni collezione toccata dalle patch inverse
// di immer (ADR-50): solo quel che il gesto ha cambiato, non la collezione intera.
// Ogni modifica dà alla collezione un numero di versione mai usato: se al momento
// di annullare il numero non è quello lasciato dal passo, si rifiuta invece di
// cancellare in silenzio il lavoro altrui. Annullare ridà anche il numero di prima.

import { AsyncLocalStorage } from 'node:async_hooks'

/** Quanti passi si tengono al massimo, fra annulla e ripristina insieme. */
const PASSI_MASSIMI = 100

/**
 * Tetto in caratteri delle patch, come le pesa chi le fa. V8 usa 1 o 2 byte
 * per carattere, quindi in memoria vale fino a circa 128 MB.
 */
const CARATTERI_MASSIMI = 64 * 1024 * 1024

/** Entro quanto due gesti con la stessa chiave si fondono (es. battute di un consuntivo). */
const FUSIONE_MS = 1500

/**
 * Un passo chiuso: come tornare indietro, e i numeri di versione ai due capi.
 * Se `irreversibile` non ha patch: è un segno perché Ctrl+Z lo rifiuti.
 */
interface Passo<C extends string, P> {
  /**
   * Le patch inverse di ogni collezione, a gruppi nell'ordine delle scritture:
   * per tornare indietro si parte dall'ultimo gruppo.
   */
  patch: Map<C, P[][]>
  /** Il numero che la collezione aveva prima del gesto. */
  prima: Map<C, number>
  /** Il numero che la collezione ha alla fine del gesto. */
  dopo: Map<C, number>
  /** Quanto pesano le patch: serve al tetto. */
  peso: number
  /** Che gesto era, per fondere quelli uguali. Assente: non si fonde. */
  chiave?: string
  /** Quando si è chiuso. */
  quando: number
  /** Il gesto ha fatto qualcosa che la storia non sa rimettere. */
  irreversibile?: true
}

/** Un passo ancora in corso: il gesto non è finito. */
interface PassoAperto<C extends string, P> {
  patch: Map<C, P[][]>
  prima: Map<C, number>
  /** Le collezioni che il gesto ha davvero cambiato, con l'ultimo numero dato. */
  dopo: Map<C, number>
  /** Altri hanno scritto sulle stesse collezioni a metà gesto: il passo non entra. */
  guasto: boolean
  /** Il gesto ha tolto file dal documento: le patch rimetterebbero riferimenti morti. */
  irreversibile: boolean
  chiave?: string
}

/** L'esito di un annulla o di un ripristina. */
export type EsitoStoria<C extends string> =
  | { ok: true; collezioni: C[] }
  | { ok: false; motivo: 'vuota' }
  | { ok: false; motivo: 'irreversibile' }
  | { ok: false; motivo: 'cambiata'; collezioni: C[] }

/** Le patch inverse di più scritture, nell'ordine per disfarle: dall'ultima. */
function perDisfare<P> (gruppi: P[][]): P[] {
  return gruppi.slice().reverse().flat()
}

/**
 * La storia di un archivio. Non sa niente del registro: le collezioni sono
 * nomi, le patch valori opachi, e il contenuto lo legge e lo rimette chi la usa.
 */
export class Storia<C extends string, P = never> {
  private readonly indietro: Array<Passo<C, P>> = []
  private readonly avanti: Array<Passo<C, P>> = []
  private readonly versioni = new Map<C, number>()
  /** Il prossimo numero di versione: cresce e basta, non si riusa mai. */
  private prossima = 1
  private readonly contesto = new AsyncLocalStorage<PassoAperto<C, P>>()
  /** I passi in corso, per poterli dichiarare guasti quando si azzera tutto. */
  private readonly aperti = new Set<PassoAperto<C, P>>()

  /** @param pesa Quanti caratteri pesano delle patch: serve al tetto. */
  constructor (private readonly pesa: (patch: readonly P[]) => number) {}

  /** Quanti passi si possono annullare e quanti ripristinare. */
  get conti (): { annulla: number; ripristina: number } {
    return { annulla: this.indietro.length, ripristina: this.avanti.length }
  }

  /**
   * Esegue un gesto come passo solo, anche attraverso le attese. Un gesto che
   * non cambia niente non entra e non svuota il ripristino.
   */
  async inUnPasso<T> (lavoro: () => Promise<T>, chiave?: string): Promise<T> {
    const passo: PassoAperto<C, P> = {
      patch: new Map(),
      prima: new Map(),
      dopo: new Map(),
      guasto: false,
      irreversibile: false,
      ...(chiave ? { chiave } : {}),
    }
    this.aperti.add(passo)
    try {
      return await this.contesto.run(passo, lavoro)
    } finally {
      this.aperti.delete(passo)
      this.chiudi(passo)
    }
  }

  /**
   * Dice che il gesto in corso non si potrà annullare (toglie file dal documento).
   * Al posto del passo resta un segno che Ctrl+Z rifiuta, e la pila sotto si
   * svuota: i numeri di versione non vedono i riferimenti fra collezioni (un'ora
   * rimessa potrebbe nominare un piano ormai tolto). Fuori da un passo non fa niente.
   */
  segnaIrreversibile (): void {
    const passo = this.contesto.getStore()
    if (passo) passo.irreversibile = true
  }

  /**
   * Esegue `lavoro` fuori da ogni passo. Serve ai lavori che continuano dopo il
   * gesto (la coda dell'OCR): il contesto asincrono si eredita, e scriverebbero
   * a nome di un passo già chiuso.
   */
  fuoriDalPasso<T> (lavoro: () => T): T {
    return this.contesto.exit(lavoro)
  }

  /**
   * Tiene le patch inverse di una scrittura fatta su una bozza, se dentro un
   * passo. `inverse` si chiama solo lì: fuori da un gesto (la coda dell'OCR) le
   * patch non servono e non si pagano. Va chiamata prima di `cambiate`.
   */
  ricordaPatch (collezioni: readonly C[], inverse: () => Map<C, P[]>): void {
    const passo = this.passoCheConta()
    if (!passo) return
    let perCollezione: Map<C, P[]> | null = null
    for (const collezione of collezioni) {
      perCollezione ??= inverse()
      const gruppo = perCollezione.get(collezione) ?? []
      const gruppi = passo.patch.get(collezione)
      if (gruppi) {
        gruppi.push(gruppo)
        continue
      }
      // Prima volta nel gesto: le patch partono dal numero di adesso.
      passo.patch.set(collezione, [gruppo])
      passo.prima.set(collezione, this.versione(collezione))
    }
  }

  /** Dà un numero nuovo alle collezioni cambiate, anche fuori da un passo: così annulla se ne accorge. */
  cambiate (collezioni: readonly C[]): void {
    const passo = this.contesto.getStore()
    for (const collezione of collezioni) {
      const attesa = passo?.dopo.get(collezione) ?? passo?.prima.get(collezione)
      if (passo && !passo.guasto) {
        // Numero diverso da quello lasciato dal gesto: in mezzo ha scritto qualcun altro.
        if (attesa === undefined || attesa !== this.versione(collezione)) passo.guasto = true
      }
      const nuova = this.prossima++
      this.versioni.set(collezione, nuova)
      passo?.dopo.set(collezione, nuova)
    }
  }

  /**
   * Annulla l'ultimo passo. `rimetti` applica allo stato le patch che riceve,
   * già nell'ordine giusto (se non combaciano lancia senza aver toccato
   * niente), e torna, per collezione, le patch che lo rifanno.
   */
  annulla (rimetti: (patch: Map<C, P[]>) => Map<C, P[]>): EsitoStoria<C> {
    return this.sposta(this.indietro, this.avanti, rimetti)
  }

  /** Rifà l'ultimo passo annullato. */
  ripristina (rimetti: (patch: Map<C, P[]>) => Map<C, P[]>): EsitoStoria<C> {
    return this.sposta(this.avanti, this.indietro, rimetti)
  }

  /**
   * Dimentica tutto (documento cambiato o riletto). Le versioni prendono numeri
   * nuovi, non zero, così un passo a metà non scambia lo stato riletto per il suo.
   */
  azzera (): void {
    this.indietro.length = 0
    this.avanti.length = 0
    for (const passo of this.aperti) passo.guasto = true
    for (const collezione of [...this.versioni.keys()]) {
      this.versioni.set(collezione, this.prossima++)
    }
    // Quelle mai toccate valgono zero: un numero che nessun passo ha visto.
  }

  /**
   * Stacca la storia dal contesto asincrono, allo smaltimento dell'archivio.
   * Un `AsyncLocalStorage` acceso resta nell'elenco globale di Node finché non
   * si spegne, e ogni attesa ne porta dietro il passo: con molti archivi (le
   * prove) il processo rallenta e la memoria cresce.
   */
  smetti (): void {
    this.azzera()
    this.contesto.disable()
  }

  private versione (collezione: C): number {
    return this.versioni.get(collezione) ?? 0
  }

  /** Il passo in corso, se entrerà nella storia: per gli altri non serve ricordare niente. */
  private passoCheConta (): PassoAperto<C, P> | null {
    const passo = this.contesto.getStore()
    if (!passo || passo.guasto || passo.irreversibile) return null
    return passo
  }

  /** Quanto pesa un passo: le sue patch, come le pesa chi le fa. */
  private pesoDi (patch: Map<C, P[][]>): number {
    let peso = 0
    for (const gruppi of patch.values()) {
      for (const gruppo of gruppi) peso += this.pesa(gruppo)
    }
    return peso
  }

  /**
   * Annulla e ripristina, a pile invertite: rimette lo stato di prima e spinge
   * su `a` il passo rovesciato, con lo stato di adesso.
   */
  private sposta (
    da: Array<Passo<C, P>>,
    a: Array<Passo<C, P>>,
    rimetti: (patch: Map<C, P[]>) => Map<C, P[]>,
  ): EsitoStoria<C> {
    const passo = da.at(-1)
    if (!passo) return { ok: false, motivo: 'vuota' }
    if (passo.irreversibile) {
      // Si dice una volta e il segno se ne va; sotto non c'è niente (`chiudi`).
      da.pop()
      return { ok: false, motivo: 'irreversibile' }
    }

    const cambiate = [...passo.dopo].filter(([c, v]) => this.versione(c) !== v).map(([c]) => c)
    if (cambiate.length > 0) return this.buttaTutto(cambiate)

    const inverse = new Map<C, P[]>()
    for (const [collezione, gruppi] of passo.patch) inverse.set(collezione, perDisfare(gruppi))

    let rifare: Map<C, P[]>
    try {
      rifare = rimetti(inverse)
    } catch (errore) {
      // Le patch non combaciano con lo stato: qualcuno l'ha cambiato senza
      // passare da `modifica`. Come per un numero cambiato, non si rimette niente.
      console.error('annulla: le patch non combaciano con lo stato di adesso', errore)
      return this.buttaTutto([...passo.patch.keys()])
    }
    da.pop()
    for (const [collezione, versione] of passo.prima) this.versioni.set(collezione, versione)

    const patch = new Map<C, P[][]>()
    for (const collezione of passo.patch.keys()) {
      patch.set(collezione, [rifare.get(collezione) ?? []])
    }
    a.push({
      patch,
      prima: passo.dopo,
      dopo: passo.prima,
      peso: this.pesoDi(patch),
      quando: Date.now(),
    })
    this.contieni()
    return { ok: true, collezioni: [...passo.dopo.keys()] }
  }

  /**
   * Butta tutta la storia: tenere i passi sotto vorrebbe dire annullare fuori
   * ordine, e rimettere lo stato di prima cancellerebbe le scritture altrui
   * (anche quelle dell'OCR, `fuoriDalPasso`).
   */
  private buttaTutto (collezioni: C[]): EsitoStoria<C> {
    this.indietro.length = 0
    this.avanti.length = 0
    return { ok: false, motivo: 'cambiata', collezioni }
  }

  /** Chiude un passo e, se ha cambiato qualcosa, lo mette nella storia. */
  private chiudi (aperto: PassoAperto<C, P>): void {
    if (aperto.irreversibile) {
      // Anche senza collezioni cambiate: Ctrl+Z deve parlare di questo gesto.
      // La pila sotto se ne va, il segno resta solo (`segnaIrreversibile`).
      this.avanti.length = 0
      this.indietro.length = 0
      this.indietro.push({
        patch: new Map(), prima: new Map(), dopo: new Map(), peso: 0,
        quando: Date.now(), irreversibile: true,
      })
      this.contieni()
      return
    }
    if (aperto.dopo.size === 0) return
    // Un gesto nuovo rende vecchio ogni ripristino: il ramo di prima non c'è più.
    this.avanti.length = 0
    if (aperto.guasto) {
      // Le sue scritture restano, e i passi sotto le scavalcherebbero nei
      // riferimenti fra collezioni: la pila si svuota, come in `sposta`.
      this.indietro.length = 0
      return
    }

    const patch = new Map<C, P[][]>()
    const prima = new Map<C, number>()
    for (const collezione of aperto.dopo.keys()) {
      const gruppi = aperto.patch.get(collezione)
      const versione = aperto.prima.get(collezione)
      // Toccata senza patch (non dovrebbe succedere): il passo non si tiene.
      if (gruppi === undefined || versione === undefined) return
      patch.set(collezione, gruppi)
      prima.set(collezione, versione)
    }

    const nuovo: Passo<C, P> = {
      patch,
      prima,
      dopo: new Map(aperto.dopo),
      peso: this.pesoDi(patch),
      ...(aperto.chiave ? { chiave: aperto.chiave } : {}),
      quando: Date.now(),
    }
    if (!this.fondi(nuovo)) this.indietro.push(nuovo)
    this.contieni()
  }

  /**
   * Fonde il passo nuovo con la cima se hanno stessa chiave, stesse collezioni,
   * sono vicini e il nuovo parte dove l'altro finiva.
   */
  private fondi (nuovo: Passo<C, P>): boolean {
    const cima = this.indietro.at(-1)
    if (!cima || !nuovo.chiave || cima.chiave !== nuovo.chiave) return false
    if (nuovo.quando - cima.quando > FUSIONE_MS) return false
    if (cima.dopo.size !== nuovo.prima.size) return false
    for (const [collezione, versione] of nuovo.prima) {
      if (cima.dopo.get(collezione) !== versione) return false
    }
    // Le patch si accodano: tornando indietro si disfano prima quelle del nuovo.
    for (const [collezione, gruppi] of nuovo.patch) cima.patch.get(collezione)?.push(...gruppi)
    cima.peso += nuovo.peso
    cima.dopo = nuovo.dopo
    cima.quando = nuovo.quando
    return true
  }

  /** Tiene la storia dentro i tetti, buttando via i passi più vecchi. */
  private contieni (): void {
    const pesoDi = (pila: Array<Passo<C, P>>) => pila.reduce((somma, p) => somma + p.peso, 0)
    let peso = pesoDi(this.indietro) + pesoDi(this.avanti)
    while (
      this.indietro.length + this.avanti.length > PASSI_MASSIMI ||
      (peso > CARATTERI_MASSIMI && this.indietro.length + this.avanti.length > 0)
    ) {
      // Prima i più vecchi da annullare; se non ce n'è, il ripristino più lontano.
      const via = this.indietro.shift() ?? this.avanti.shift()
      peso -= via?.peso ?? 0
    }
  }
}
