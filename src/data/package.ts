// Il documento del registro: un anno in un file `.regi` (ZIP) con manifesto,
// collezioni JSON, `.storico/`, `archivio/` ed `esportazioni/`. Sta in memoria
// e si salva accodando (voci nuove, indice, coda: si scrive quanto la modifica)
// o rifacendolo (documento nuovo o troppo spazio morto: temporaneo e rinomina);
// in entrambi i casi un salvataggio interrotto lascia l'ultimo documento buono.
// La serratura `.<nome>.regi.serratura` accanto avvisa chi lo apre altrove, non blocca.

import * as apparato from 'apparato'

import { GIORNO_MS } from '../domain/dates.js'
import { fraseVersionePiuRecente } from '../domain/upgrades.js'
import {
  CORRENTE,
  DEFINITIVO,
  ErroreZip,
  type VoceCollocata,
  type VocePronta,
  apriZip,
  assembla,
  comprimiAsync,
  corpi,
  daAccodare,
  ingombro,
  sembraZip,
  spazioMorto,
} from './zip.js'
import { testi } from './package.testi.js'

/**
 * L'estensione dei documenti. Non `.reg`, che su Windows scrive nel registro di sistema.
 */
export const ESTENSIONE = '.regi'

/** Come si chiama, dentro l'archivio, il file che dice che cos'è l'archivio. */
export const MANIFESTO = 'manifesto.json'

/** La cartella delle copie, dentro il pacchetto. */
export const STORICO = '.storico'

/**
 * Il marchio del manifesto che distingue i nostri ZIP. Non segue il nome del
 * programma: cambiarlo renderebbe irriconoscibili i documenti già scritti.
 */
export const FORMATO = 'registro-docenti/anno'

/**
 * La versione del contenitore (disposizione delle voci), non dei dati: quella
 * dentro i JSON è `VERSIONE_DATI`.
 */
const VERSIONE_PACCHETTO = 1

/** Sotto questo spreco non si compatta: su un documento piccolo si perderebbe l'accodare. */
const SPRECO_MINIMO = 256 * 1024

/** Quel che il manifesto dichiara. Tutto facoltativo tranne il formato. */
interface Manifesto {
  formato: string
  versione: number
  /** Chi lo ha scritto per ultimo, e quando: serve a chi guarda, non al codice. */
  applicazione?: string
  scritto?: string
}

/** Chi tiene aperto un pacchetto, secondo la serratura trovata accanto. */
export interface Serratura {
  macchina: string
  utente: string
  processo: number
  aperto: string
}

export class ErrorePacchetto extends Error {
  constructor (messaggio: string) {
    super(messaggio)
    this.name = 'ErrorePacchetto'
  }
}

const codifica = new TextEncoder()
const decodifica = new TextDecoder()

/** Il nome del file di serratura di un pacchetto: nascosto, e accanto a lui. */
function fileSerratura (pacchetto: apparato.Uri): apparato.Uri {
  const nome = pacchetto.path.split('/').pop() ?? ''
  return apparato.Uri.joinPath(pacchetto, '..', `.${nome}.serratura`)
}

/** Il nome dell'anno, che è quello del file senza estensione: `2026-27`. */
export function nomeDelPacchetto (pacchetto: apparato.Uri): string {
  const nome = pacchetto.path.split('/').pop() ?? ''
  return nome.toLowerCase().endsWith(ESTENSIONE) ? nome.slice(0, -ESTENSIONE.length) : nome
}

/** Vero se quel nome di file è un documento del registro. */
export function èPacchetto (nome: string): boolean {
  return nome.toLowerCase().endsWith(ESTENSIONE) && !nome.startsWith('.')
}

/**
 * Una voce del documento: contenuto aperto e/o blocco compresso (`pronta`).
 * Finché non si tocca, al salvataggio si riusa il blocco senza ricomprimere:
 * lo storico non viene mai aperto né ricompresso.
 */
interface Voce {
  /** Il contenuto, quando chiesto o appena scritto. Byte, non testo: un PDF via UTF-8 si rovina. */
  bytes: Uint8Array | null
  /** La forma testuale, per le voci che sono JSON: si ricava dai byte una volta sola. */
  testo: string | null
  pronta: VocePronta | null
  /** Come si apre il blocco, per le voci che vengono dal disco e non si sono mai lette. */
  apri: (() => Buffer) | null
  /** Dove sta già scritta nel file: una voce collocata non si riscrive. */
  collocata: VoceCollocata | null
}

/**
 * Un anno aperto: le voci in memoria e il file da cui vengono. Una scrittura
 * identica non segna modifiche: su una cartella sincronizzata ogni scrittura
 * inutile è un possibile conflitto.
 */
export class Pacchetto {
  readonly file: apparato.Uri

  private voci = new Map<string, Voce>()
  private manifesto: Manifesto
  /** Vero quando in memoria c'è qualcosa che sul disco ancora non c'è. */
  private modificato = false
  /** Quanto misura il file com'è adesso sul disco: da lì in poi si accoda. */
  private dimensione = 0
  /** Quanto del file non è più nominato da nessuno: cresce a ogni accodata. */
  private morto = 0
  /**
   * La coda dello ZIP come l'abbiamo lasciata: prima di accodare dice se il file
   * sul disco è ancora quello, perché accodare riusa i vecchi offset.
   */
  private fine: Uint8Array | null = null
  /** La serratura è nostra: alla chiusura si toglie. Falso se si è aperto in lettura. */
  private serrato = false

  /**
   * Quante volte una voce è stata riscritta da quando il documento è aperto
   * (zero se letta dal disco). Chi mostra un file sa così se la sua copia è
   * vecchia: nome e misura possono restare uguali.
   */
  private revisioni = new Map<string, number>()

  private scritture = 0

  /** Livello di compressione: `CORRENTE` o `DEFINITIVO` (vedi `zip.ts`). */
  private livello = CORRENTE

  private constructor (file: apparato.Uri, manifesto: Manifesto) {
    this.file = file
    this.manifesto = manifesto
  }

  /** Comprime al massimo un documento scritto una volta sola (trasloco delle cartelle). */
  stringiAlMassimo (): void {
    this.livello = DEFINITIVO
  }

  /** Il nome dell'anno: `2026-27`, cioè il file senza la sua estensione. */
  get nome (): string {
    return nomeDelPacchetto(this.file)
  }

  /** Vero se in memoria c'è qualcosa che sul disco non c'è ancora. */
  get sporco (): boolean {
    return this.modificato
  }

  /** Vero se questo pacchetto tiene la propria serratura. */
  get bloccato (): boolean {
    return this.serrato
  }

  // ------------------------------------------------------------- apertura

  /** Un pacchetto nuovo: sul disco nasce al primo salvataggio, per non lasciare archivi vuoti. */
  static nuovo (file: apparato.Uri): Pacchetto {
    return new Pacchetto(file, { formato: FORMATO, versione: VERSIONE_PACCHETTO })
  }

  /**
   * Apre un pacchetto dal disco. Un file assente dà un pacchetto vuoto; un file
   * non valido solleva, perché ripartire da vuoto lo sovrascriverebbe.
   */
  static async apri (file: apparato.Uri): Promise<Pacchetto> {
    let contenuto: Uint8Array
    try {
      contenuto = await apparato.file.readFile(file)
    } catch (errore) {
      if (errore instanceof apparato.ErroreFile && errore.code === 'FileNotFound') {
        return Pacchetto.nuovo(file)
      }
      throw errore
    }

    if (contenuto.length === 0) return Pacchetto.nuovo(file)
    if (!sembraZip(contenuto)) {
      throw new ErrorePacchetto(testi().nonDocumento(`${nomeDelPacchetto(file)}${ESTENSIONE}`))
    }

    let aperto: ReturnType<typeof apriZip>
    try {
      // Solo la struttura: le voci si decomprimono quando qualcuno le chiede,
      // e lo storico resta compresso.
      aperto = apriZip(contenuto)
    } catch (errore) {
      const detto = errore instanceof ErroreZip ? errore.message : String(errore)
      throw new ErrorePacchetto(testi().nonSiApre(`${nomeDelPacchetto(file)}${ESTENSIONE}`, detto))
    }

    const pacchetto = new Pacchetto(file, { formato: FORMATO, versione: VERSIONE_PACCHETTO })
    for (const voce of aperto.voci) {
      pacchetto.voci.set(voce.nome, {
        bytes: null,
        testo: null,
        pronta: voce,
        apri: () => voce.dati(),
        collocata: voce,
      })
    }
    pacchetto.dimensione = aperto.dimensione
    pacchetto.morto = spazioMorto(aperto.voci, aperto.dimensione)
    pacchetto.fine = ultimiByte(contenuto)

    const dichiarato = pacchetto.leggiManifesto()
    if (dichiarato) pacchetto.manifesto = dichiarato
    if (dichiarato && dichiarato.formato !== FORMATO) {
      throw new ErrorePacchetto(
        testi().altroProgramma(`${nomeDelPacchetto(file)}${ESTENSIONE}`, dichiarato.formato),
      )
    }
    if (dichiarato && dichiarato.versione > VERSIONE_PACCHETTO) {
      throw new ErrorePacchetto(fraseVersionePiuRecente({
        file: `${nomeDelPacchetto(file)}${ESTENSIONE}`,
        cosa: 'formato',
        delFile: dichiarato.versione,
        quiFinoA: VERSIONE_PACCHETTO,
      }))
    }

    pacchetto.voci.delete(MANIFESTO)
    // Appena letto è identico al disco: niente da scrivere.
    pacchetto.modificato = false
    return pacchetto
  }

  private leggiManifesto (): Manifesto | null {
    try {
      // Anche l'apertura sta nel `try`: un blocco rovinato non deve impedire
      // di aprire le collezioni.
      const testo = this.testo(MANIFESTO)
      if (!testo) return null
      const letto = JSON.parse(testo) as Partial<Manifesto>
      if (typeof letto?.formato !== 'string') return null
      return {
        formato: letto.formato,
        versione: typeof letto.versione === 'number' ? letto.versione : 0,
        applicazione: typeof letto.applicazione === 'string' ? letto.applicazione : undefined,
        scritto: typeof letto.scritto === 'string' ? letto.scritto : undefined,
      }
    } catch {
      // Manifesto illeggibile: vale come non dichiarato, i JSON si leggono lo stesso.
      return null
    }
  }

  // -------------------------------------------------------------- le voci

  /** Il testo di una voce, o null se non c'è. Si decodifica una volta sola. */
  testo (nome: string): string | null {
    const voce = this.voci.get(nome)
    if (!voce) return null
    if (voce.testo === null) {
      const bytes = this.bytes(nome)
      voce.testo = bytes === null ? null : decodifica.decode(bytes)
    }
    return voce.testo
  }

  /** Il contenuto di una voce come byte: alla prima lettura si decomprime e verifica. */
  bytes (nome: string): Uint8Array | null {
    const voce = this.voci.get(nome)
    if (!voce) return null
    if (voce.bytes === null && voce.apri) {
      voce.bytes = voce.apri()
      voce.apri = null
    }
    return voce.bytes
  }

  /** Scrive una voce di testo in memoria (sul disco al prossimo `salva()`); lo stesso testo non è una modifica. */
  scrivi (nome: string, testo: string): void {
    if (this.testoSeSiLegge(nome) === testo) return
    // Il blocco di prima non vale più: al salvataggio si ricomprime solo questa voce.
    this.voci.set(nome, {
      bytes: codifica.encode(testo),
      testo,
      pronta: null,
      apri: null,
      collocata: null,
    })
    this.segnaRevisione(nome)
    this.modificato = true
  }

  /**
   * Come `scrivi`, per i byte (PDF, immagini). `certamenteNuovo` salta il
   * confronto, che su un file grosso non è gratis.
   */
  deposita (nome: string, dati: Uint8Array, opzioni?: { certamenteNuovo?: boolean }): void {
    if (!opzioni?.certamenteNuovo && uguali(this.bytesSeSiLeggono(nome), dati)) return
    this.voci.set(nome, { bytes: dati, testo: null, pronta: null, apri: null, collocata: null })
    this.segnaRevisione(nome)
    this.modificato = true
  }

  /**
   * Il testo per il solo confronto: un blocco rovinato vale come diverso invece
   * di impedire la scrittura (il blocco rotto resta nella copia in `.storico/`).
   */
  private testoSeSiLegge (nome: string): string | null | undefined {
    try {
      return this.testo(nome)
    } catch {
      return undefined
    }
  }

  /** Come `testoSeSiLegge`, per i byte. */
  private bytesSeSiLeggono (nome: string): Uint8Array | null {
    try {
      return this.bytes(nome)
    } catch {
      return null
    }
  }

  /**
   * Cambia nome a una voce senza aprirla, così si mette da parte anche una voce
   * illeggibile. Torna vero se la voce c'era.
   */
  rinomina (da: string, a: string): boolean {
    const voce = this.voci.get(da)
    if (voce === undefined) return false
    this.voci.set(a, {
      bytes: voce.bytes,
      testo: voce.testo,
      pronta: voce.pronta ? { ...voce.pronta, nome: a } : null,
      apri: voce.apri,
      collocata: null,
    })
    this.voci.delete(da)
    this.segnaRevisione(a)
    this.modificato = true
    return true
  }

  /** Una scrittura in più per quella voce: il numero cresce e non torna mai indietro. */
  private segnaRevisione (nome: string): void {
    this.scritture += 1
    this.revisioni.set(nome, this.scritture)
  }

  /** La revisione di una voce: zero se come dal disco, poi cresce a ogni riscrittura. */
  revisioneDi (nome: string): number {
    return this.revisioni.get(nome) ?? 0
  }

  /** Toglie una voce. Torna vero se c'era. */
  elimina (nome: string): boolean {
    const esisteva = this.voci.delete(nome)
    if (esisteva) this.modificato = true
    return esisteva
  }

  /** Vero se il documento contiene quella voce. */
  contiene (nome: string): boolean {
    return this.voci.has(nome)
  }

  /** Quanto misura una voce, senza aprirla: è nell'indice. */
  misuraDi (nome: string): number | null {
    const voce = this.voci.get(nome)
    if (!voce) return null
    return voce.bytes?.length ?? voce.collocata?.originale ?? voce.pronta?.originale ?? null
  }

  /**
   * Il CRC di una voce senza aprirla, dall'indice dello ZIP (per
   * `Deposito.materializza`). Null per le voci scritte in questa sessione.
   */
  crcDi (nome: string): number | null {
    const voce = this.voci.get(nome)
    if (!voce) return null
    // Una riscrittura azzera `pronta` e `collocata`: se ci sono, il CRC è valido.
    return voce.pronta?.crc ?? voce.collocata?.crc ?? null
  }

  /** I nomi delle voci, in ordine: le prove ci contano, e i diff pure. */
  nomi (): string[] {
    return [...this.voci.keys()].sort()
  }

  /** Le voci dello storico di una collezione, dalla più vecchia alla più nuova. */
  copieDi (radice: string): string[] {
    return this.nomi().filter(
      (nome) => nome.startsWith(`${STORICO}/${radice}.`) && nome.endsWith('.json'),
    )
  }

  /**
   * Mette da parte in `.storico/` com'era una voce prima di riscriverla, e pota
   * le copie. `aGradini` usa `daTenere`; senza, restano solo le ultime `quante`.
   */
  conserva (nome: string, quante: number, opzioni?: { aGradini?: boolean }): void {
    const attuale = this.voci.get(nome)
    if (attuale === undefined) return
    const radice = nome.replace(/\.json$/, '')
    const marca = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
    const copia = `${STORICO}/${radice}.${marca}.json`

    // Si riusa il blocco compresso (niente `deflate`), non la collocazione: la
    // testa locale nel file porta il vecchio nome, quindi la voce va riscritta.
    this.voci.set(copia, {
      bytes: attuale.bytes,
      testo: attuale.testo,
      pronta: attuale.pronta ? { ...attuale.pronta, nome: copia } : null,
      apri: attuale.apri,
      collocata: null,
    })
    this.modificato = true

    const copie = this.copieDi(radice)
    const tenute = opzioni?.aGradini
      ? daTenere(copie, quante, Date.now())
      : new Set(copie.slice(Math.max(0, copie.length - quante)))
    for (const vecchia of copie) {
      if (!tenute.has(vecchia)) this.voci.delete(vecchia)
    }
  }

  // ----------------------------------------------------------- salvataggio

  /**
   * I blocchi dell'archivio: si comprimono (fuori thread) solo le voci senza
   * blocco, e il risultato resta sulla voce. Il manifesto si rifà sempre: porta
   * la data di scrittura.
   */
  private async blocchi (): Promise<Array<{ voce: Voce | null, pronta: VocePronta }>> {
    const manifesto: Manifesto = {
      formato: FORMATO,
      versione: VERSIONE_PACCHETTO,
      // testo-fisso: il marchio, scritto dentro il documento
      applicazione: this.manifesto.applicazione ?? 'Regiclass',
      scritto: new Date().toISOString(),
    }

    const attesa: Array<Promise<{ voce: Voce | null, pronta: VocePronta }>> = [
      comprimiAsync({
        nome: MANIFESTO,
        dati: codifica.encode(`${JSON.stringify(manifesto, null, 2)}
`),
      }).then((pronta) => ({ voce: null, pronta })),
    ]
    for (const nome of this.nomi()) {
      const voce = this.voci.get(nome)!
      if (voce.pronta) {
        attesa.push(Promise.resolve({ voce, pronta: voce.pronta }))
        continue
      }
      attesa.push(
        comprimiAsync({ nome, dati: this.bytes(nome) ?? VUOTO }, this.livello).then(
          (pronta) => {
            voce.pronta = pronta
            return { voce, pronta }
          },
        ),
      )
    }
    return Promise.all(attesa)
  }

  /** Quanto del file non è più nominato: cresce a ogni salvataggio accodato. */
  get sprecato (): number {
    return this.morto
  }

  /**
   * Scrive il pacchetto sul disco se serve: accodando, o rifacendolo se è nuovo,
   * troppo sfilacciato o cambiato altrove. Torna vero se ha scritto.
   */
  async salva (opzioni?: { forza?: boolean, compatta?: boolean }): Promise<boolean> {
    if (!opzioni?.forza && !opzioni?.compatta && !this.modificato) return false
    // Azzerato prima di ogni attesa: le modifiche che arrivano durante il
    // salvataggio devono farne scattare un altro.
    this.modificato = false

    const blocchi = await this.blocchi()
    try {
      if (
        this.dimensione > 0 &&
        !opzioni?.compatta &&
        !this.conviene(blocchi) &&
        (await this.sulDiscoÈQuello())
      ) {
        await this.accoda(blocchi)
      } else {
        await this.rifai(blocchi)
      }
    } catch (errore) {
      // Il documento resta da salvare, o la modifica andrebbe persa.
      this.modificato = true
      throw errore
    }
    return true
  }

  /**
   * Se conviene rifare invece di accodare: spazio morto oltre un terzo (e oltre
   * `SPRECO_MINIMO`), o più di metà del documento da riscrivere.
   */
  private conviene (blocchi: Array<{ voce: Voce | null, pronta: VocePronta }>): boolean {
    if (this.morto > SPRECO_MINIMO && this.morto > this.dimensione / 3) return true
    const daScrivere = blocchi
      .filter(({ voce }) => !voce?.collocata)
      .reduce((totale, { pronta }) => totale + ingombro(pronta), 0)
    return daScrivere > this.dimensione / 2
  }

  /**
   * Vero se il file sul disco è ancora quello lasciato da noi (stessa misura e
   * coda). Altrimenti accodare scriverebbe a offset altrui: si rifà per intero,
   * e chi salva per ultimo copre.
   */
  private async sulDiscoÈQuello (): Promise<boolean> {
    if (this.fine === null) return false
    return apparato.finisceCon(this.file, this.dimensione, this.fine)
  }

  /** La via incrementale: in fondo al file, le voci nuove e poi l'indice. */
  private async accoda (blocchi: Array<{ voce: Voce | null, pronta: VocePronta }>): Promise<void> {
    const restano: VoceCollocata[] = []
    const nuove: VocePronta[] = []
    const daCollocare: Array<Voce | null> = []

    for (const { voce, pronta } of blocchi) {
      if (voce?.collocata) {
        restano.push(voce.collocata)
        continue
      }
      nuove.push(pronta)
      daCollocare.push(voce)
    }

    const { corpiNuovi, coda, da, collocate } = daAccodare(restano, nuove, this.dimensione)
    // Prima i corpi, poi la coda: due chiamate perché `scriviDa` chiude con un
    // `sync`, e l'ordine sul disco è garantito.
    if (corpiNuovi.length > 0) await apparato.scriviDa(this.file, da, corpiNuovi)
    await apparato.scriviDa(this.file, da + corpiNuovi.length, coda)

    // Le voci appena scritte hanno un posto: il salvataggio dopo non le riscrive.
    const appena = collocate.slice(restano.length)
    daCollocare.forEach((voce, indice) => {
      if (voce) voce.collocata = appena[indice]
    })
    this.morto += this.dimensione - restano.reduce((t, v) => t + ingombro(v), 0)
    this.dimensione = da + corpiNuovi.length + coda.length
    this.fine = ultimiByte(coda)
  }

  /** La via completa: si riscrive tutto, e lo spazio morto sparisce. */
  private async rifai (blocchi: Array<{ voce: Voce | null, pronta: VocePronta }>): Promise<void> {
    const pronte = blocchi.map(({ pronta }) => pronta)
    const archivio = assembla(pronte)
    const temporaneo = this.file.with({ path: `${this.file.path}.tmp` })
    // `fsync` prima della rinomina: senza, un blackout può lasciare la rinomina
    // fatta e i dati no.
    await apparato.file.writeFile(temporaneo, archivio, { sincronizza: true })
    await apparato.file.rename(temporaneo, this.file, { overwrite: true })

    // Le voci sono rimesse in fila dall'inizio: collocazioni tutte nuove.
    const { collocate } = corpi(pronte, 0)
    blocchi.forEach(({ voce }, indice) => {
      if (voce) voce.collocata = collocate[indice]
    })
    this.dimensione = archivio.length
    this.morto = 0
    this.fine = ultimiByte(archivio)
  }

  // ------------------------------------------------------------ serratura

  /**
   * Chi tiene aperto questo pacchetto, o null. Una serratura di questa macchina
   * non conta: è il resto di una chiusura andata male.
   */
  static async chiLoTiene (file: apparato.Uri): Promise<Serratura | null> {
    try {
      const testo = decodifica.decode(await apparato.file.readFile(fileSerratura(file)))
      const letta = JSON.parse(testo) as Partial<Serratura>
      if (typeof letta?.macchina !== 'string') return null
      const serratura: Serratura = {
        macchina: letta.macchina,
        utente: typeof letta.utente === 'string' ? letta.utente : '',
        processo: typeof letta.processo === 'number' ? letta.processo : 0,
        aperto: typeof letta.aperto === 'string' ? letta.aperto : '',
      }
      return questaMacchina(serratura) ? null : serratura
    } catch {
      // Assente o illeggibile: non ferma nessuno.
      return null
    }
  }

  /**
   * Prende la serratura; se non si scrive si va avanti lo stesso. `giàPresa`
   * serve alla ricarica: riscriverla lascerebbe un attimo l'anno libero.
   */
  async prendi (opzioni?: { giàPresa?: boolean }): Promise<void> {
    if (opzioni?.giàPresa) {
      this.serrato = true
      return
    }
    const serratura: Serratura = {
      macchina: nomeMacchina(),
      utente: nomeUtente(),
      processo: typeof process !== 'undefined' ? process.pid : 0,
      aperto: new Date().toISOString(),
    }
    try {
      await apparato.file.writeFile(
        fileSerratura(this.file),
        codifica.encode(`${JSON.stringify(serratura, null, 2)}\n`),
      )
      this.serrato = true
    } catch {
      // Sola lettura o permessi negati: la serratura è un avviso, non una condizione.
    }
  }

  /** Restituisce la serratura, se era nostra. Si chiama chiudendo il documento. */
  async lascia (): Promise<void> {
    if (!this.serrato) return
    this.serrato = false
    try {
      await apparato.file.delete(fileSerratura(this.file), { useTrash: false })
    } catch {
      // Rimasta: è di questa macchina, e `chiLoTiene` la ignora.
    }
  }
}

const VUOTO = new Uint8Array(0)

/** Quanti byte della fine del file si ricordano: la coda di uno ZIP senza commento. */
const MISURA_FINE = 22

/** Gli ultimi byte di un contenuto, copiati: il contenuto può essere un buffer grande. */
function ultimiByte (contenuto: Uint8Array): Uint8Array {
  return contenuto.slice(Math.max(0, contenuto.length - MISURA_FINE))
}

/** Tutti i giorni che si guardano uno per uno; oltre, uno per settimana. */
const GIORNI_UNO_PER_UNO = 30

/** Il tetto delle copie di una collezione, a gradini compresi. */
const COPIE_MASSIME = 60

/** Il momento scritto nel nome di una copia — `classi.2026-09-01-08-30.json` — o null. */
function momentoDellaCopia (nome: string): number | null {
  const trovato = /\.(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})\.json$/.exec(nome)
  if (!trovato) return null
  const [, anno, mese, giorno, ora, minuto] = trovato.map(Number)
  const momento = Date.UTC(anno, mese - 1, giorno, ora, minuto)
  return Number.isNaN(momento) ? null : momento
}

/**
 * Potatura a gradini: le ultime `quante`, poi la più recente di ognuno degli
 * ultimi 30 giorni, poi una per settimana, fino a `COPIE_MASSIME`. Giorni in UTC,
 * come le marche di `conserva`; le copie senza data restano solo fra le ultime.
 */
function daTenere (copie: string[], quante: number, adesso: number): Set<string> {
  const tenute = new Set(copie.slice(Math.max(0, copie.length - quante)))
  const oggi = Math.floor(adesso / GIORNO_MS)
  const gradiniVisti = new Set<string>()
  // Dalla più nuova: la prima per ogni gradino è la più recente.
  for (const copia of [...copie].reverse()) {
    const momento = momentoDellaCopia(copia)
    if (momento === null) continue
    const giorno = Math.floor(momento / GIORNO_MS)
    const gradino = oggi - giorno < GIORNI_UNO_PER_UNO ? `g${giorno}` : `s${Math.floor(giorno / 7)}`
    if (gradiniVisti.has(gradino)) continue
    gradiniVisti.add(gradino)
    tenute.add(copia)
  }
  if (tenute.size <= COPIE_MASSIME) return tenute
  // In ordine di nome, che è l'ordine del tempo: si tolgono le prime.
  const ordinate = copie.filter((copia) => tenute.has(copia))
  return new Set(ordinate.slice(-COPIE_MASSIME))
}

/** Due contenuti uguali byte per byte: il confronto che decide se c'è da scrivere. */
function uguali (uno: Uint8Array | null, altro: Uint8Array): boolean {
  if (uno === null || uno.length !== altro.length) return false
  return Buffer.from(uno.buffer, uno.byteOffset, uno.byteLength).equals(
    Buffer.from(altro.buffer, altro.byteOffset, altro.byteLength),
  )
}

/** Vero se la serratura è di questo stesso computer e di questo stesso utente. */
function questaMacchina (serratura: Serratura): boolean {
  return serratura.macchina === nomeMacchina() && serratura.utente === nomeUtente()
}

function nomeMacchina (): string {
  return process.env.COMPUTERNAME ?? process.env.HOSTNAME ?? 'computer'
}

function nomeUtente (): string {
  return process.env.USERNAME ?? process.env.USER ?? ''
}
