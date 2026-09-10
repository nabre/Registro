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
// Fra l'apertura e la chiusura sta tutto in memoria — sono poche centinaia di
// kilobyte — e il file su disco si riscrive per intero a ogni salvataggio, in
// due tempi: prima un file temporaneo accanto, poi la rinomina. Un salvataggio
// interrotto lascia al suo posto l'ultimo archivio buono, che è la sola cosa
// che conta quando la corrente va via a metà pomeriggio.
//
// Aperto vuol dire anche *preso*: accanto compare una serratura — un file
// `.2026-27.registro.serratura` — che dice quale macchina lo sta usando. Non
// impedisce niente, e non potrebbe: su una cartella sincronizzata non esiste un
// lucchetto vero. Serve a fare la domanda giusta prima che sia tardi, «questo
// anno è aperto sul computer della sala docenti: vuoi aprirlo lo stesso in sola
// lettura?», invece di lasciare due registri che si riscrivono a vicenda.

import * as vscode from 'vscode'

import {
  CORRENTE,
  DEFINITIVO,
  ErroreZip,
  type VoceLetta,
  type VocePronta,
  apriZip,
  assembla,
  comprimiAsync,
  sembraZip,
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
export const VERSIONE_PACCHETTO = 1

/** Quel che il manifesto dichiara. Tutto facoltativo tranne il formato. */
export interface Manifesto {
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
export function fileSerratura (pacchetto: vscode.Uri): vscode.Uri {
  const nome = pacchetto.path.split('/').pop() ?? ''
  return vscode.Uri.joinPath(pacchetto, '..', `.${nome}.serratura`)
}

/** Il nome dell'anno, che è quello del file senza estensione: `2026-27`. */
export function nomeDelPacchetto (pacchetto: vscode.Uri): string {
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
  testo: string | null
  pronta: VocePronta | null
  /** Come si apre il blocco, per le voci che vengono dal disco e non si sono mai lette. */
  apri: (() => Buffer) | null
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
  readonly file: vscode.Uri

  private voci = new Map<string, Voce>()
  private manifesto: Manifesto
  /** Vero quando in memoria c'è qualcosa che sul disco ancora non c'è. */
  private modificato = false
  /** La serratura è nostra: alla chiusura si toglie. Falso se si è aperto in lettura. */
  private serrato = false

  /**
   * Quanto stringere. Il valore corrente per un anno che si sta usando; il
   * massimo per un anno che si sta impacchettando una volta sola — vedi
   * `zip.ts`, dove c'è il conto.
   */
  private livello = CORRENTE

  private constructor (file: vscode.Uri, manifesto: Manifesto) {
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
  static nuovo (file: vscode.Uri): Pacchetto {
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
  static async apri (file: vscode.Uri): Promise<Pacchetto> {
    let contenuto: Uint8Array
    try {
      contenuto = await vscode.workspace.fs.readFile(file)
    } catch (errore) {
      if (errore instanceof vscode.FileSystemError && errore.code === 'FileNotFound') {
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

    let voci: VoceLetta[]
    try {
      // Struttura sì, contenuti no: le collezioni si aprono appena qualcuno le
      // chiede — e il registro le chiede tutte, subito — mentre lo storico
      // resta il blocco compresso che è. Aprirlo all'apertura vorrebbe dire
      // decomprimere un megabyte e mezzo di copie che nessuno guarda.
      voci = apriZip(contenuto)
    } catch (errore) {
      const detto = errore instanceof ErroreZip ? errore.message : String(errore)
      throw new ErrorePacchetto(`${nomeDelPacchetto(file)}${ESTENSIONE} non si apre: ${detto}`)
    }

    const pacchetto = new Pacchetto(file, { formato: FORMATO, versione: VERSIONE_PACCHETTO })
    for (const voce of voci) {
      pacchetto.voci.set(voce.nome, { testo: null, pronta: voce, apri: () => voce.dati() })
    }

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
    const testo = this.testo(MANIFESTO)
    if (!testo) return null
    try {
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
    if (voce.testo === null && voce.apri) {
      voce.testo = decodifica.decode(voce.apri())
      voce.apri = null
    }
    return voce.testo
  }

  /**
   * Scrive una voce in memoria. Sul disco ci va al prossimo `salva()`.
   *
   * Riscrivere una voce con lo stesso testo non è una modifica: su una cartella
   * sincronizzata ogni scrittura è una sincronizzazione, e il registro riscrive
   * volentieri collezioni identiche a quelle di prima.
   */
  scrivi (nome: string, testo: string): void {
    if (this.testo(nome) === testo) return
    // Il blocco compresso di prima non vale più: si ricomprime al salvataggio,
    // e solo questa voce.
    this.voci.set(nome, { testo, pronta: null, apri: null })
    this.modificato = true
  }

  /** Toglie una voce. Torna vero se c'era. */
  elimina (nome: string): boolean {
    const esisteva = this.voci.delete(nome)
    if (esisteva) this.modificato = true
    return esisteva
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
   */
  conserva (nome: string, quante: number): void {
    const attuale = this.voci.get(nome)
    if (attuale === undefined) return
    const radice = nome.replace(/\.json$/, '')
    const marca = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
    const copia = `${STORICO}/${radice}.${marca}.json`

    // La copia si porta dietro il blocco già compresso della voce, con il nome
    // cambiato: mettere da parte com'era non costa un `deflate` — e quella
    // copia, da lì in poi, non verrà più né aperta né ricompressa.
    this.voci.set(copia, {
      testo: attuale.testo,
      pronta: attuale.pronta ? { ...attuale.pronta, nome: copia } : null,
      apri: attuale.apri,
    })
    this.modificato = true

    const copie = this.copieDi(radice)
    for (const vecchia of copie.slice(0, Math.max(0, copie.length - quante))) {
      this.voci.delete(vecchia)
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
   */
  private async blocchi (): Promise<VocePronta[]> {
    const manifesto: Manifesto = {
      formato: FORMATO,
      versione: VERSIONE_PACCHETTO,
      applicazione: this.manifesto.applicazione ?? 'Registro docenti',
      scritto: new Date().toISOString(),
    }

    const attesa: Array<Promise<VocePronta>> = [
      comprimiAsync({
        nome: MANIFESTO,
        dati: codifica.encode(`${JSON.stringify(manifesto, null, 2)}
`),
      }),
    ]
    for (const nome of this.nomi()) {
      const voce = this.voci.get(nome)!
      if (voce.pronta) {
        attesa.push(Promise.resolve(voce.pronta))
        continue
      }
      attesa.push(
        comprimiAsync({ nome, dati: codifica.encode(voce.testo ?? '') }, this.livello).then((pronta) => {
          voce.pronta = pronta
          return pronta
        }),
      )
    }
    return Promise.all(attesa)
  }

  /**
   * Scrive il pacchetto sul disco, se c'è qualcosa da scrivere.
   *
   * Prima il file temporaneo accanto, poi la rinomina, come si faceva con i
   * nove JSON: quel che cambia è che adesso la scrittura è una sola, e un anno
   * non può più restare mezzo vecchio e mezzo nuovo.
   *
   * Torna vero se ha scritto davvero.
   */
  async salva (opzioni?: { forza?: boolean }): Promise<boolean> {
    if (!opzioni?.forza && !this.modificato) return false
    // Azzerato prima di ogni attesa: quel che arriva da qui in poi è roba
    // nuova, e deve far scattare un altro salvataggio invece di essere data
    // per scritta insieme a questa.
    this.modificato = false

    const archivio = assembla(await this.blocchi())
    const temporaneo = this.file.with({ path: `${this.file.path}.tmp` })
    try {
      await vscode.workspace.fs.writeFile(temporaneo, archivio)
      await vscode.workspace.fs.rename(temporaneo, this.file, { overwrite: true })
    } catch (errore) {
      // Non si è scritto niente: il documento resta da salvare, o la modifica
      // risulterebbe fatta e non tornerebbe più.
      this.modificato = true
      throw errore
    }
    return true
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
  static async chiLoTiene (file: vscode.Uri): Promise<Serratura | null> {
    try {
      const testo = decodifica.decode(await vscode.workspace.fs.readFile(fileSerratura(file)))
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
      await vscode.workspace.fs.writeFile(
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
      await vscode.workspace.fs.delete(fileSerratura(this.file), { useTrash: false })
    } catch {
      // Già sparita, o non cancellabile: al prossimo avvio risulterà di questa
      // stessa macchina, e `chiLoTiene` la ignora.
    }
  }
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
