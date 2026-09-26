// La storia delle modifiche per annulla e ripristina, solo in memoria.
// Un passo è un gesto (più `modifica` raccolte con `AsyncLocalStorage` dentro
// `inUnPasso`) e tiene il JSON di prima di ogni collezione toccata. Ogni
// modifica dà alla collezione un numero di versione mai usato: se al momento di
// annullare il numero non è quello lasciato dal passo, si rifiuta invece di
// cancellare in silenzio il lavoro altrui. Annullare ridà anche il numero di prima.

import { AsyncLocalStorage } from 'node:async_hooks'

/** Quanti passi si tengono al massimo, fra annulla e ripristina insieme. */
const PASSI_MASSIMI = 100

/**
 * Tetto in caratteri delle copie (`length` è gratis). V8 usa 1 o 2 byte per
 * carattere, quindi in memoria vale fino a circa 128 MB.
 */
const CARATTERI_MASSIMI = 64 * 1024 * 1024

/** Entro quanto due gesti con la stessa chiave si fondono (es. battute di un consuntivo). */
const FUSIONE_MS = 1500

/**
 * Un passo chiuso: le copie di prima e i numeri di versione ai due capi. Se
 * `irreversibile` non ha copie: è un segno perché Ctrl+Z lo rifiuti.
 */
interface Passo<C extends string> {
  /** Il testo di ogni collezione toccata, com'era prima del gesto. */
  copie: Map<C, string>
  /** Il numero che la collezione aveva quando la copia è stata presa. */
  prima: Map<C, number>
  /** Il numero che la collezione ha alla fine del gesto. */
  dopo: Map<C, number>
  /** Quanti caratteri pesano le copie: serve al tetto. */
  peso: number
  /** Che gesto era, per fondere quelli uguali. Assente: non si fonde. */
  chiave?: string
  /** Quando si è chiuso. */
  quando: number
  /** Il gesto ha fatto qualcosa che la storia non sa rimettere. */
  irreversibile?: true
}

/** Un passo ancora in corso: il gesto non è finito. */
interface PassoAperto<C extends string> {
  copie: Map<C, string>
  prima: Map<C, number>
  /** Le collezioni che il gesto ha davvero cambiato, con l'ultimo numero dato. */
  dopo: Map<C, number>
  /** Altri hanno scritto sulle stesse collezioni a metà gesto: il passo non entra. */
  guasto: boolean
  /** Il gesto ha tolto file dal documento: le copie rimetterebbero riferimenti morti. */
  irreversibile: boolean
  chiave?: string
}

/** L'esito di un annulla o di un ripristina. */
export type EsitoStoria<C extends string> =
  | { ok: true; collezioni: C[] }
  | { ok: false; motivo: 'vuota' }
  | { ok: false; motivo: 'irreversibile' }
  | { ok: false; motivo: 'cambiata'; collezioni: C[] }

/**
 * La storia di un archivio. Non sa niente del registro: le collezioni sono
 * nomi, e il loro contenuto lo legge e lo rimette chi la usa.
 */
export class Storia<C extends string> {
  private readonly indietro: Array<Passo<C>> = []
  private readonly avanti: Array<Passo<C>> = []
  private readonly versioni = new Map<C, number>()
  /** Il prossimo numero di versione: cresce e basta, non si riusa mai. */
  private prossima = 1
  private readonly contesto = new AsyncLocalStorage<PassoAperto<C>>()
  /** I passi in corso, per poterli dichiarare guasti quando si azzera tutto. */
  private readonly aperti = new Set<PassoAperto<C>>()

  /**
   * @param leggi Il testo JSON di una collezione com'è adesso.
   */
  constructor (private readonly leggi: (collezione: C) => string) {}

  /** Quanti passi si possono annullare e quanti ripristinare. */
  get conti (): { annulla: number; ripristina: number } {
    return { annulla: this.indietro.length, ripristina: this.avanti.length }
  }

  /**
   * Esegue un gesto come passo solo, anche attraverso le attese. Un gesto che
   * non cambia niente non entra e non svuota il ripristino.
   */
  async inUnPasso<T> (lavoro: () => Promise<T>, chiave?: string): Promise<T> {
    const passo: PassoAperto<C> = {
      copie: new Map(),
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

  /** Copia le collezioni che si stanno per toccare, se dentro un passo. Va chiamata prima di cambiarle. */
  ricordaPrima (collezioni: readonly C[]): void {
    const passo = this.contesto.getStore()
    // Un passo che non entrerà nella storia non ha bisogno di copie.
    if (!passo || passo.guasto || passo.irreversibile) return
    for (const collezione of collezioni) {
      // Toccata già da questo gesto: la copia buona è quella di allora.
      if (passo.dopo.has(collezione)) continue
      // Copia presa ma non usata: si rifà solo se nel frattempo la collezione è cambiata.
      if (passo.prima.get(collezione) === this.versione(collezione)) continue
      passo.copie.set(collezione, this.leggi(collezione))
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

  /** Annulla l'ultimo passo. `rimetti` riceve i testi da rimettere nello stato. */
  annulla (rimetti: (copie: Map<C, string>) => void): EsitoStoria<C> {
    return this.sposta(this.indietro, this.avanti, rimetti)
  }

  /** Rifà l'ultimo passo annullato. */
  ripristina (rimetti: (copie: Map<C, string>) => void): EsitoStoria<C> {
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

  private versione (collezione: C): number {
    return this.versioni.get(collezione) ?? 0
  }

  /**
   * Annulla e ripristina, a pile invertite: rimette le copie e spinge su `a` il
   * passo rovesciato con lo stato di adesso.
   */
  private sposta (
    da: Array<Passo<C>>,
    a: Array<Passo<C>>,
    rimetti: (copie: Map<C, string>) => void,
  ): EsitoStoria<C> {
    const passo = da.at(-1)
    if (!passo) return { ok: false, motivo: 'vuota' }
    if (passo.irreversibile) {
      // Si dice una volta e il segno se ne va; sotto non c'è niente (`chiudi`).
      da.pop()
      return { ok: false, motivo: 'irreversibile' }
    }

    const cambiate = [...passo.dopo].filter(([c, v]) => this.versione(c) !== v).map(([c]) => c)
    if (cambiate.length > 0) {
      // Si butta tutta la storia: tenere i passi sotto vorrebbe dire annullare
      // fuori ordine, e rimettere la copia cancellerebbe le scritture altrui
      // (anche quelle dell'OCR, `fuoriDalPasso`).
      this.indietro.length = 0
      this.avanti.length = 0
      return { ok: false, motivo: 'cambiata', collezioni: cambiate }
    }

    da.pop()
    const adesso = new Map<C, string>()
    let peso = 0
    for (const collezione of passo.copie.keys()) {
      const testo = this.leggi(collezione)
      adesso.set(collezione, testo)
      peso += testo.length
    }
    rimetti(passo.copie)
    for (const [collezione, versione] of passo.prima) this.versioni.set(collezione, versione)

    a.push({ copie: adesso, prima: passo.dopo, dopo: passo.prima, peso, quando: Date.now() })
    this.contieni()
    return { ok: true, collezioni: [...passo.copie.keys()] }
  }

  /** Chiude un passo e, se ha cambiato qualcosa, lo mette nella storia. */
  private chiudi (aperto: PassoAperto<C>): void {
    if (aperto.irreversibile) {
      // Anche senza collezioni cambiate: Ctrl+Z deve parlare di questo gesto.
      // La pila sotto se ne va, il segno resta solo (`segnaIrreversibile`).
      this.avanti.length = 0
      this.indietro.length = 0
      this.indietro.push({
        copie: new Map(), prima: new Map(), dopo: new Map(), peso: 0,
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

    const copie = new Map<C, string>()
    const prima = new Map<C, number>()
    let peso = 0
    for (const collezione of aperto.dopo.keys()) {
      const testo = aperto.copie.get(collezione)
      const versione = aperto.prima.get(collezione)
      // Toccata senza copia (non dovrebbe succedere): il passo non si tiene.
      if (testo === undefined || versione === undefined) return
      copie.set(collezione, testo)
      prima.set(collezione, versione)
      peso += testo.length
    }

    const nuovo: Passo<C> = {
      copie,
      prima,
      dopo: new Map(aperto.dopo),
      peso,
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
  private fondi (nuovo: Passo<C>): boolean {
    const cima = this.indietro.at(-1)
    if (!cima || !nuovo.chiave || cima.chiave !== nuovo.chiave) return false
    if (nuovo.quando - cima.quando > FUSIONE_MS) return false
    if (cima.dopo.size !== nuovo.prima.size) return false
    for (const [collezione, versione] of nuovo.prima) {
      if (cima.dopo.get(collezione) !== versione) return false
    }
    cima.dopo = nuovo.dopo
    cima.quando = nuovo.quando
    return true
  }

  /** Tiene la storia dentro i tetti, buttando via i passi più vecchi. */
  private contieni (): void {
    const pesoDi = (pila: Array<Passo<C>>) => pila.reduce((somma, p) => somma + p.peso, 0)
    let peso = pesoDi(this.indietro) + pesoDi(this.avanti)
    while (
      this.indietro.length + this.avanti.length > PASSI_MASSIMI ||
      (peso > CARATTERI_MASSIMI && this.indietro.length + this.avanti.length > 0)
    ) {
      // Prima i più vecchi da annullare; se non ce n'è, il ripristino più lontano.
      const via = this.indietro.length > 0 ? this.indietro.shift() : this.avanti.shift()
      peso -= via?.peso ?? 0
    }
  }
}
