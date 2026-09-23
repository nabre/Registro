// Il documento del registro: un anno scolastico in un file solo.
//
// Prima i dati di un anno erano nove JSON dentro `2026-27/dati/`, più la
// cartella `.storico/` delle copie. Funzionava, ma erano dieci file che si
// potevano copiare a metà: chi mandava «l'anno» a un collega ne dimenticava
// due, chi lo metteva su una chiavetta ne portava via una versione mescolata,
// e OneDrive poteva sincronizzarne cinque su nove lasciando il registro con le
// lezioni di oggi e le classi di ieri.
//
// Adesso quei dieci file stanno dentro `2026-27.registro`, che è uno ZIP con
// un'estensione nostra:
//
//   2026-27.registro
//   ├── manifesto.json     che cos'è questo file, e di che versione
//   ├── registro.json      l'anno, le sue materie, le sue impostazioni
//   ├── classi.json  corsi.json  lezioni.json  …
//   └── .storico/          le copie di com'erano prima
//
// Accanto resta la cartella `2026-27/`, con gli allegati, l'archivio dei PDF e
// le esportazioni: quelli sono documenti che si aprono con altri programmi e
// non hanno niente da guadagnare a stare chiusi dentro un archivio — anzi, ci
// perderebbero il doppio clic. Nel pacchetto va quel che il registro scrive e
// rilegge da sé.
//
// Il pacchetto si apre e si chiude, come si aprono e si chiudono i documenti.
// Fra l'apertura e la chiusura sta in memoria, e sul disco si scrive in due
// modi:
//
//   - **accodando**, che è il caso normale: le voci nuove vanno in fondo al
//     file, poi l'indice, poi la coda. Si scrive quanto la modifica e non
//     quanto il documento — trentaquattro kilobyte per un anno da nove
//     megabyte — e i byte di prima non si toccano, il che su una cartella
//     sincronizzata è la differenza fra caricare la coda e ricaricare tutto.
//     Ed è atomico per costruzione: la coda che nomina le voci nuove è
//     l'ultima cosa che si scrive, e finché non c'è vale ancora quella di
//     prima, che punta a voci tutte al loro posto;
//   - **rifacendolo**, quando il documento è nuovo o quando lo spazio morto —
//     le versioni vecchie che l'accodare si lascia dietro — è cresciuto oltre
//     un terzo. Lì si scrive un file temporaneo accanto e lo si rinomina.
//
// In tutti e due i casi un salvataggio interrotto lascia al suo posto l'ultimo
// documento buono, che è la sola cosa che conta quando la corrente va via a
// metà pomeriggio.
//
// Aperto vuol dire anche *preso*: accanto compare una serratura — un file
// `.2026-27.registro.serratura` — che dice quale macchina lo sta usando. Non
// impedisce niente, e non potrebbe: su una cartella sincronizzata non esiste un
// lucchetto vero. Serve a fare la domanda giusta prima che sia tardi, «questo
// anno è aperto sul computer della sala docenti: vuoi aprirlo lo stesso in sola
// lettura?», invece di lasciare due registri che si riscrivono a vicenda.

import * as apparato from 'apparato'

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

/**
 * L'estensione dei documenti del registro.
 *
 * `.registro` per esteso, e non una sigla di tre lettere: un docente che dopo
 * tre anni ritrova il file in una cartella deve capire che cos'è senza aprirlo.
 * Le sigle erano tutte prese o pericolose — `.reg` è lo script del registro di
 * configurazione di Windows, e un doppio clic per sbaglio scriverebbe dentro il
 * sistema — e questa non è ambigua per nessuno.
 */
export const ESTENSIONE = '.registro'

/** Come si chiama, dentro l'archivio, il file che dice che cos'è l'archivio. */
export const MANIFESTO = 'manifesto.json'

/** La cartella delle copie, dentro il pacchetto. */
export const STORICO = '.storico'

/** Il marchio che il manifesto porta: distingue i nostri ZIP da tutti gli altri. */
export const FORMATO = 'registro-docenti/anno'

/**
 * La versione del formato del *contenitore*, non dei dati.
 *
 * Sale se cambia la disposizione delle voci dentro l'archivio — un nome, una
 * cartella, il modo di tenere lo storico. Che cosa c'è scritto *dentro* i JSON
 * lo dice `VERSIONE_DATI`, che è un'altra cosa e cambia per altri motivi.
 */
const VERSIONE_PACCHETTO = 1

/**
 * Sotto questo spreco non si compatta: un documento piccolo si riscrive in tre
 * millisecondi, e compattarlo a ogni salvataggio per recuperare venti kilobyte
 * vorrebbe dire rinunciare alla scrittura incrementale proprio dove funziona
 * meglio.
 */
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
 * Una voce del documento, nei due stati in cui può stare.
 *
 * `testo` c'è quando qualcuno l'ha letta o appena scritta; `pronta` è il blocco
 * compresso, che c'è finché quella voce non viene toccata. Le due cose
 * convivono: una collezione letta e non modificata ha tutti e due, e alla
 * riscrittura si riusa il blocco senza ricomprimere niente.
 *
 * È la ragione per cui un salvataggio costa due millisecondi invece di
 * quaranta: lo storico di un anno — nove decimi del documento — non viene mai
 * né aperto né ricompresso, perché nessuno lo guarda e nessuno lo cambia.
 */
interface Voce {
  /**
   * Il contenuto, quando è stato chiesto o appena scritto.
   *
   * Byte e non testo: qui dentro non ci sono solo JSON. Un PDF dell'archivio,
   * passato per una stringa, tornerebbe indietro rovinato — la decodifica UTF-8
   * sostituisce quel che non sa leggere, e il file non si aprirebbe più. Il
   * testo è una vista comoda sopra i byte, e vale solo per chi sa di avere a
   * che fare con del testo.
   */
  bytes: Uint8Array | null
  /** La forma testuale, per le voci che sono JSON: si ricava dai byte una volta sola. */
  testo: string | null
  pronta: VocePronta | null
  /** Come si apre il blocco, per le voci che vengono dal disco e non si sono mai lette. */
  apri: (() => Buffer) | null
  /**
   * Dove sta già scritta nel file, se ci sta. Una voce collocata non si
   * riscrive: nell'indice nuovo si rimette il posto che aveva.
   */
  collocata: VoceCollocata | null
}

/**
 * Un anno aperto: le sue voci in memoria, e il file da cui vengono.
 *
 * Le voci sono testo — sono JSON — e si tengono come testo: il confronto fra
 * quel che c'è e quel che si scriverebbe passa di qui, ed è quello a decidere
 * se il file va riscritto. Un registro consultato e non modificato non deve
 * toccare il disco: su una cartella sincronizzata ogni scrittura è una
 * sincronizzazione, e una sincronizzazione inutile è un conflitto in più.
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
   * Gli ultimi byte del file come l'abbiamo lasciato — letto o scritto noi —
   * cioè la coda dello ZIP, che dice dove sta l'indice e quanto è lungo.
   *
   * Serve a una domanda sola, prima di accodare: «il file sul disco è ancora
   * quello?». Accodare riusa gli offset di quando lo si è letto; se intanto un
   * altro registro ci ha scritto, o qualcuno l'ha compattato, quegli offset
   * nominano byte che non sono più i nostri — e il documento non si riapre.
   */
  private fine: Uint8Array | null = null
  /** La serratura è nostra: alla chiusura si toglie. Falso se si è aperto in lettura. */
  private serrato = false

  /**
   * Quante volte una voce è stata riscritta da quando il documento è aperto.
   *
   * Serve a chi mostra un file e deve sapere se quel che ha in mano è ancora
   * buono: il lettore di PDF della pagina Documenti tiene in memoria quel che
   * ha caricato, e all'indirizzo di prima mostrerebbe la copia di prima. Il
   * nome del file non cambia — un rapporto si riscrive al posto suo — e nemmeno
   * la misura, quando a cambiare è un voto lungo quanto quello di prima.
   *
   * Zero per tutto quel che è stato letto dal disco: aprendo il documento
   * nessuno ha ancora in mano niente da confrontare.
   */
  private revisioni = new Map<string, number>()

  private scritture = 0

  /**
   * Quanto stringere. Il valore corrente per un anno che si sta usando; il
   * massimo per un anno che si sta impacchettando una volta sola — vedi
   * `zip.ts`, dove c'è il conto.
   */
  private livello = CORRENTE

  private constructor (file: apparato.Uri, manifesto: Manifesto) {
    this.file = file
    this.manifesto = manifesto
  }

  /**
   * Dichiara che questo documento si scrive una volta e non si tocca più:
   * comprime al massimo. Lo usa il trasloco delle cartelle in documenti.
   */
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

  /**
   * Un pacchetto nuovo, che sul disco ancora non c'è. Si scrive al primo
   * salvataggio: creare il file subito vorrebbe dire lasciare un archivio
   * vuoto in giro se poi la creazione dell'anno non va in porto.
   */
  static nuovo (file: apparato.Uri): Pacchetto {
    return new Pacchetto(file, { formato: FORMATO, versione: VERSIONE_PACCHETTO })
  }

  /**
   * Apre un pacchetto dal disco.
   *
   * Un file che non c'è non è un errore: torna un pacchetto vuoto, e chi lo ha
   * chiesto ci scrive dentro come se ci fosse sempre stato. Un file che c'è ma
   * non è un archivio, o è un archivio rovinato, sì: quello si dice, perché
   * l'alternativa — ripartire da vuoto — cancellerebbe un anno di lavoro alla
   * prima scrittura.
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
      throw new ErrorePacchetto(
        `${nomeDelPacchetto(file)}${ESTENSIONE} non è un documento del registro: ` +
          'il file non comincia come un archivio.',
      )
    }

    let aperto: ReturnType<typeof apriZip>
    try {
      // Struttura sì, contenuti no: le collezioni si aprono appena qualcuno le
      // chiede — e il registro le chiede tutte, subito — mentre lo storico
      // resta il blocco compresso che è. Aprirlo all'apertura vorrebbe dire
      // decomprimere un megabyte e mezzo di copie che nessuno guarda.
      aperto = apriZip(contenuto)
    } catch (errore) {
      const detto = errore instanceof ErroreZip ? errore.message : String(errore)
      throw new ErrorePacchetto(`${nomeDelPacchetto(file)}${ESTENSIONE} non si apre: ${detto}`)
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
        `${nomeDelPacchetto(file)}${ESTENSIONE} è un archivio di un altro programma (${dichiarato.formato}).`,
      )
    }
    if (dichiarato && dichiarato.versione > VERSIONE_PACCHETTO) {
      throw new ErrorePacchetto(
        `${nomeDelPacchetto(file)}${ESTENSIONE} è stato scritto da una versione più recente ` +
          `del registro (formato ${dichiarato.versione}, qui si arriva a ${VERSIONE_PACCHETTO}). ` +
          'Aggiorna il registro invece di aprirlo: scriverci sopra adesso perderebbe quel che non si sa leggere.',
      )
    }

    pacchetto.voci.delete(MANIFESTO)
    // Quel che si è appena letto è identico a quel che c'è sul disco: finché
    // qualcuno non lo cambia, non c'è niente da scrivere.
    pacchetto.modificato = false
    return pacchetto
  }

  private leggiManifesto (): Manifesto | null {
    try {
      // Anche l'apertura della voce sta dentro il `try`: un manifesto con il
      // blocco rovinato è un manifesto illeggibile come un altro, e non deve
      // impedire di aprire le collezioni, che stanno in blocchi loro.
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
      // Un manifesto illeggibile non basta a rifiutare l'archivio: dentro ci
      // sono i JSON, e quelli si leggono lo stesso. Vale come «non dichiarato».
      return null
    }
  }

  // -------------------------------------------------------------- le voci

  /**
   * Il testo di una voce, o null se in questo pacchetto non c'è.
   *
   * La prima lettura di una voce che viene dal disco la apre e la verifica; le
   * successive trovano il testo già lì. Una voce che nessuno legge non viene
   * aperta mai — ed è il caso dello storico, che si guarda una volta all'anno.
   */
  testo (nome: string): string | null {
    const voce = this.voci.get(nome)
    if (!voce) return null
    if (voce.testo === null) {
      const bytes = this.bytes(nome)
      voce.testo = bytes === null ? null : decodifica.decode(bytes)
    }
    return voce.testo
  }

  /**
   * Il contenuto di una voce, come byte. È la forma vera: `testo` ci passa
   * sopra.
   *
   * La prima lettura di una voce che viene dal disco la apre e la verifica; le
   * successive trovano i byte già lì. Una voce che nessuno legge non viene
   * aperta mai — ed è il caso dello storico, e dei PDF dell'archivio finché
   * nessuno li apre.
   */
  bytes (nome: string): Uint8Array | null {
    const voce = this.voci.get(nome)
    if (!voce) return null
    if (voce.bytes === null && voce.apri) {
      voce.bytes = voce.apri()
      voce.apri = null
    }
    return voce.bytes
  }

  /**
   * Scrive una voce di testo in memoria. Sul disco ci va al prossimo `salva()`.
   *
   * Riscrivere una voce con lo stesso testo non è una modifica: su una cartella
   * sincronizzata ogni scrittura è una sincronizzazione, e il registro riscrive
   * volentieri collezioni identiche a quelle di prima.
   */
  scrivi (nome: string, testo: string): void {
    if (this.testoSeSiLegge(nome) === testo) return
    // Il blocco compresso di prima non vale più: si ricomprime al salvataggio,
    // e solo questa voce.
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
   * Mette un file dentro il documento: un PDF dell'archivio, un rapporto
   * appena stampato, l'immagine di una scheda.
   *
   * Come `scrivi`, ma senza passare dal testo. Il confronto con quel che c'è
   * già si fa sui byte, e su un file grosso non è gratis: se ne fa a meno
   * quando il contenuto viene da fuori ed è certamente nuovo.
   */
  deposita (nome: string, dati: Uint8Array, opzioni?: { certamenteNuovo?: boolean }): void {
    if (!opzioni?.certamenteNuovo && uguali(this.bytesSeSiLeggono(nome), dati)) return
    this.voci.set(nome, { bytes: dati, testo: null, pronta: null, apri: null, collocata: null })
    this.segnaRevisione(nome)
    this.modificato = true
  }

  /**
   * Il testo di una voce per il solo confronto con quel che si sta per
   * scrivere: una voce con il blocco rovinato — CRC che non torna, `inflate`
   * che si ferma — vale come diversa, invece di impedire di scriverci sopra.
   * Il blocco rotto non si perde: chi riscrive una collezione ne fa prima la
   * copia in `.storico/`, e la copia si porta dietro il blocco com'era.
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
   * Cambia nome a una voce senza aprirla.
   *
   * Il blocco compresso passa com'è sotto il nome nuovo, come fa `conserva`:
   * serve a mettere da parte una voce che non si sa leggere — per un JSON rotto
   * come per un blocco che non si decomprime — senza doverla leggere per
   * spostarla. Torna vero se la voce c'era.
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

  /**
   * A che punto è una voce: zero se sta come l'ha letta dal disco, un numero
   * che cresce a ogni riscrittura.
   *
   * Non è una data e non è un'impronta: è un contatore, e costa niente. Chi lo
   * guarda vuole sapere una cosa sola — «è cambiato da quando l'ho guardato?» —
   * e per quella un numero diverso da prima basta e avanza.
   */
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
   * L'impronta CRC di una voce **senza aprirla**: sta gia' nell'indice dello
   * ZIP, che e' dove il formato la mette.
   *
   * Torna `null` per le voci scritte in memoria in questa sessione, che
   * un'impronta nell'indice non ce l'hanno ancora: quelle chi la vuole se la
   * calcola. Serve a `Deposito.materializza`, che il CRC lo ricalcolava in
   * JavaScript a **ogni** richiesta `registro://dati/...` — due millisecondi per
   * megabyte, cioe' trentotto su una scansione di classe da venti, ripagati a
   * ogni apertura della cornice anche quando la copia sul disco era gia'
   * identica a quella di un minuto prima. Il commento di `materializza` diceva
   * gia' «il confronto e' sul CRC che l'archivio porta gia'»: adesso e' vero.
   */
  crcDi (nome: string): number | null {
    const voce = this.voci.get(nome)
    if (!voce) return null
    // Una riscrittura azzera `pronta` e `collocata` (vedi `scriviByte`): se
    // sono ancora li', il contenuto e' quello che l'indice descrive.
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
   * Mette da parte com'era una voce prima di riscriverla, e pota le copie in
   * eccesso.
   *
   * Le copie stanno dentro il pacchetto e non accanto: un anno resta un file
   * solo anche con il suo passato dentro, e chi lo copia su una chiavetta si
   * porta via pure quello. Costano poco — sono JSON dentro uno ZIP, e dieci
   * versioni dello stesso file si comprimono quasi a niente.
   *
   * `aGradini` è la potatura che usa il registro: le ultime `quante`, più la
   * più recente di ciascuno degli ultimi trenta giorni, più una per settimana
   * oltre — vedi `daTenere`. Senza, restano le ultime `quante` e basta: a una
   * copia al minuto sono dieci minuti di passato, e l'aiuto promette «com'era
   * ieri».
   */
  conserva (nome: string, quante: number, opzioni?: { aGradini?: boolean }): void {
    const attuale = this.voci.get(nome)
    if (attuale === undefined) return
    const radice = nome.replace(/\.json$/, '')
    const marca = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
    const copia = `${STORICO}/${radice}.${marca}.json`

    // La copia si porta dietro il blocco già compresso della voce, con il nome
    // cambiato: mettere da parte com'era non costa un `deflate` — e quella
    // copia, da lì in poi, non verrà più né aperta né ricompressa.
    // Il blocco si riusa, ma la collocazione no: il corpo che sta nel file
    // porta scritto dentro il *vecchio* nome, e una voce con un altro nome deve
    // essere riscritta per intero.
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
   * I blocchi con cui si compone l'archivio, comprimendo solo quel che serve.
   *
   * Le voci intoccate hanno già il proprio blocco e se lo tengono; quelle
   * scritte da poco si comprimono qui, e il risultato resta attaccato alla
   * voce — così il salvataggio dopo, se quella voce non è cambiata di nuovo,
   * non ripaga il conto. In genere si comprimono una o due collezioni, e si fa
   * fuori dal thread che disegna le finestre.
   *
   * Il manifesto si rifà ogni volta: porta la data di scrittura, ed è l'unica
   * voce che cambia a ogni salvataggio anche quando non cambia nient'altro.
   */
  private async blocchi (): Promise<Array<{ voce: Voce | null, pronta: VocePronta }>> {
    const manifesto: Manifesto = {
      formato: FORMATO,
      versione: VERSIONE_PACCHETTO,
      applicazione: this.manifesto.applicazione ?? 'Registro docenti',
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

  /**
   * Quanto del file non è più nominato da nessuno.
   *
   * Cresce a ogni salvataggio incrementale: la versione di prima di una
   * collezione resta dov'era, e con lei l'indice che la nominava. È il prezzo
   * della scrittura incrementale, e si paga volentieri finché resta una frazione
   * del documento.
   */
  get sprecato (): number {
    return this.morto
  }

  /**
   * Scrive il pacchetto sul disco, se c'è qualcosa da scrivere.
   *
   * Due strade, e la differenza fra le due è tutta qui:
   *
   *   - **accodare**, quando il documento c'è già e non è troppo sfilacciato: si
   *     scrivono in fondo le sole voci nuove, l'indice e la coda. Costa quanto
   *     la modifica e non quanto il documento, e chi sincronizza la cartella
   *     carica soltanto la fine del file;
   *   - **rifare**, quando il documento non c'è ancora o quando lo spazio morto
   *     è cresciuto troppo: file temporaneo accanto, poi rinomina. Recupera
   *     tutto lo spazio e rimette le voci in ordine.
   *
   * Torna vero se ha scritto davvero.
   */
  async salva (opzioni?: { forza?: boolean, compatta?: boolean }): Promise<boolean> {
    if (!opzioni?.forza && !opzioni?.compatta && !this.modificato) return false
    // Azzerato prima di ogni attesa: quel che arriva da qui in poi è roba
    // nuova, e deve far scattare un altro salvataggio invece di essere data
    // per scritta insieme a questa.
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
      // Non si è scritto niente di quel che conta: il documento resta da
      // salvare, o la modifica risulterebbe fatta e non tornerebbe più.
      this.modificato = true
      throw errore
    }
    return true
  }

  /**
   * Se conviene rifare il documento da capo invece di accodare.
   *
   * Due casi. Il primo è lo spazio morto: oltre un terzo del file — e almeno un
   * po' di roba vera, o si compatterebbe un documento da dieci kilobyte a ogni
   * salvataggio — si riscrive tutto e si torna a zero. Il secondo è quando
   * accodare costerebbe più che rifare: se sono cambiate quasi tutte le voci,
   * la scrittura incrementale non risparmia niente e lascia dietro un doppione
   * di tutto il documento.
   */
  private conviene (blocchi: Array<{ voce: Voce | null, pronta: VocePronta }>): boolean {
    if (this.morto > SPRECO_MINIMO && this.morto > this.dimensione / 3) return true
    const daScrivere = blocchi
      .filter(({ voce }) => !voce?.collocata)
      .reduce((totale, { pronta }) => totale + ingombro(pronta), 0)
    return daScrivere > this.dimensione / 2
  }

  /**
   * Vero se il file sul disco è ancora quello che si è letto o scritto per
   * ultimo: stessa misura, stessa coda.
   *
   * Se non lo è — un altro registro ci ha salvato sopra, una compattazione
   * fatta altrove l'ha rimesso in fila, è stato cancellato — accodare
   * scriverebbe a offset che non sono più i nostri: nel migliore dei casi si
   * copre la modifica dell'altro in un modo che nessuno vede, nel peggiore il
   * documento non si riapre più. Allora si rifà per intero, e chi salva per
   * ultimo copre: è quel che il dialogo della serratura già promette.
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
    // I corpi prima, e sul disco per davvero; la coda che li nomina solo dopo.
    // Fino a quel momento vale l'archivio di prima, che è ancora tutto lì.
    //
    // Due chiamate e non una: `scriviDa` chiude con un `sync`, quindi la prima
    // non torna prima che i corpi siano sul piatto. In una chiamata sola i due
    // pezzi partivano insieme e l'ordine lo decideva il sistema.
    if (corpiNuovi.length > 0) await apparato.scriviDa(this.file, da, corpiNuovi)
    await apparato.scriviDa(this.file, da + corpiNuovi.length, coda)

    // Da qui in poi le voci appena scritte hanno un posto, e il salvataggio
    // dopo non le riscriverà.
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
    // Sul disco per davvero prima della rinomina: senza `fsync`, una corrente
    // che va via subito dopo può lasciare la rinomina fatta e i dati no, cioè
    // al posto dell'ultimo documento buono un file della misura giusta e vuoto.
    await apparato.file.writeFile(temporaneo, archivio, { sincronizza: true })
    await apparato.file.rename(temporaneo, this.file, { overwrite: true })

    // Le collocazioni si rifanno tutte: le voci sono state rimesse in fila
    // dall'inizio, e quelle di prima non valgono più niente.
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
   * Chi tiene aperto questo pacchetto, o null se nessuno.
   *
   * Una serratura scritta da noi stessi non conta: è quel che resta di un
   * registro che se n'è andato male — corrente tolta, processo ucciso — e
   * fermare l'apertura per una serratura propria vorrebbe dire non riaprire
   * mai più il registro dopo un blocco.
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
      // Non c'è, o è illeggibile: in tutti e due i casi non c'è nessuno da
      // annunciare, e una serratura che non si legge non deve fermare nessuno.
      return null
    }
  }

  /**
   * Prende la serratura. Se non si riesce a scriverla si va avanti lo stesso.
   *
   * `giàPresa` è per la ricarica: il file su disco è cambiato e si rilegge, ma
   * l'anno è lo stesso e la serratura accanto è ancora la nostra. Toglierla e
   * riscriverla a ogni ricarica sarebbe un file in più che si sincronizza, e
   * una finestra — breve, ma reale — in cui l'anno risulta libero a chi lo
   * stesse aprendo altrove.
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
      // Cartella di sola lettura, o permessi negati: si lavora comunque. La
      // serratura è un avviso fra colleghi, non una condizione per aprire.
    }
  }

  /** Restituisce la serratura, se era nostra. Si chiama chiudendo il documento. */
  async lascia (): Promise<void> {
    if (!this.serrato) return
    this.serrato = false
    try {
      await apparato.file.delete(fileSerratura(this.file), { useTrash: false })
    } catch {
      // Già sparita, o non cancellabile: al prossimo avvio risulterà di questa
      // stessa macchina, e `chiLoTiene` la ignora.
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

const GIORNO_MS = 24 * 60 * 60 * 1000

/** Il momento scritto nel nome di una copia — `classi.2026-09-01-08-30.json` — o null. */
function momentoDellaCopia (nome: string): number | null {
  const trovato = /\.(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})\.json$/.exec(nome)
  if (!trovato) return null
  const [, anno, mese, giorno, ora, minuto] = trovato.map(Number)
  const momento = Date.UTC(anno, mese - 1, giorno, ora, minuto)
  return Number.isNaN(momento) ? null : momento
}

/**
 * Quali copie tenere, con la potatura a gradini.
 *
 * Le ultime `quante` sempre: sono il «com'era cinque minuti fa» di chi ha
 * appena cancellato la cosa sbagliata. Poi, fra le altre, la più recente di
 * ciascuno degli ultimi trenta giorni — «com'era ieri», «com'era lunedì» — e
 * oltre, la più recente di ogni settimana. Il tutto con un tetto: un anno
 * scolastico sono una quarantina di settimane, e sessanta copie di un JSON
 * dentro uno ZIP si comprimono quasi a niente. Oltre il tetto se ne vanno le
 * più vecchie.
 *
 * Le marche sono in UTC, come le scrive `conserva`: il giorno è quello di UTC,
 * e a mezzanotte di un'ora sbagliata non si perde niente — si tiene una copia
 * per giorno, non si sceglie quale giorno. Una copia con un nome che non porta
 * una data si tratta come prima: fuori dalle ultime `quante`, se ne va.
 */
function daTenere (copie: string[], quante: number, adesso: number): Set<string> {
  const tenute = new Set(copie.slice(Math.max(0, copie.length - quante)))
  const oggi = Math.floor(adesso / GIORNO_MS)
  const gradiniVisti = new Set<string>()
  // Dalla più nuova alla più vecchia: la prima incontrata per ogni gradino è
  // la più recente di quel gradino.
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
