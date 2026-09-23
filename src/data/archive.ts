// L'unico punto in cui il registro tocca il disco.
//
// Tiene lo stato completo in memoria — sono pochi megabyte anche per un anno
// intero — e lo riversa su file dopo ogni modifica, con un ritardo breve: chi
// scrive un consuntivo produce una modifica per tasto premuto, e salvare a ogni
// tasto su una cartella sincronizzata è un modo sicuro di far litigare OneDrive
// con se stesso.
//
// In memoria c'è un anno solo: quello in uso. Degli altri si legge la sola
// intestazione — etichetta, semestri, sospensioni — che serve a elencarli e a
// poterci passare sopra, e poi il loro documento si lascia andare. È il motivo
// per cui l'anno è un file a sé: «l'anno scorso» si apre, non si filtra, e un
// registro di dieci anni pesa quanto uno di uno.
//
// Su disco un anno è un documento solo — `2026-2027.registro`, che è uno ZIP
// con dentro i dieci JSON di sempre — e il registro lo apre come si apre un
// documento: lo prende all'avvio, lo tiene aperto finché ci lavora, lo lascia
// quando si spegne o quando si passa a un altro anno. Le dieci collezioni sono
// voci dentro quell'archivio, e quel che cambia rispetto a prima è che una
// modifica non tocca più un file solo: tocca il documento intero, sempre.
//
// Sempre, ma non tutto: le voci che non cambiano tornano nell'archivio già
// compresse, senza passare da `deflate`. Un salvataggio costa così tre
// millisecondi invece di quaranta, e sono tre millisecondi spesi fuori dal
// thread che disegna le finestre — vedi `package.ts` e `zip.ts`.
//
// Scrittura in due tempi (file temporaneo e poi rinomina) perché un salvataggio
// interrotto a metà lasci l'ultimo documento buono al suo posto invece di un
// archivio troncato. E prima della riscrittura una copia della voce che c'era
// finisce in `.storico/`, dentro lo stesso documento: un registro sta in una
// cartella sincronizzata, e «com'era ieri» è la domanda che ci si fa quando due
// macchine hanno scritto insieme.
//
// Letture e scritture passano da una coda sola: una ricarica arrivata dal
// watcher mentre un salvataggio è in attesa non deve buttare via la modifica
// che stava per essere scritta.

import * as apparato from 'apparato'

import { annoAllineato } from '../domain/years.js'
import { registroVuoto } from '../domain/factories.js'
import type { AnnoScolastico, Impostazioni, Materia, Registro } from '../domain/models.js'
import { VERSIONE_DATI } from '../domain/models.js'
import { normalizzaRegistro } from '../domain/validation.js'
import { testoCollezione } from '../domain/persistence.js'
import { Deposito } from './store.js'
import {
  ErrorePacchetto,
  ESTENSIONE,
  Pacchetto,
  nomeDelPacchetto,
  type Serratura,
} from './package.js'
import {
  NOMI,
  type NomeCollezione,
  esisteFile,
  impostaDocumento,
  nomeDocumento,
  percorsoPacchetto,
} from './paths.js'

/**
 * Quanto si aspetta, dall'ultima modifica, prima di scrivere.
 *
 * Breve: il salvataggio costa un paio di millisecondi — si ricomprime la sola
 * collezione cambiata, non il documento intero — e chi smette di battere per un
 * terzo di secondo ha finito la frase. Più corto di così si scriverebbe in
 * mezzo a una parola.
 */
const RITARDO_SALVATAGGIO_MS = 350

/**
 * E comunque non oltre questo, dalla prima modifica non ancora salvata.
 *
 * Senza un tetto, chi scrive un consuntivo lungo senza mai fermarsi per un
 * terzo di secondo resterebbe con tutto in memoria fino alla fine: il ritardo
 * si rinnova a ogni tasto, ed è proprio quando si sta scrivendo tanto che si
 * ha più da perdere. Due secondi è il massimo che può separare quel che si vede
 * sullo schermo da quel che c'è sul disco.
 */
const ATTESA_MASSIMA_MS = 2000

/** Quanto si aspetta prima di ricaricare: il watcher annuncia lo stesso file più volte. */
const RITARDO_RICARICA_MS = 300

/** Quanto un file appena scritto da noi resta "nostro" agli occhi del watcher. */
const FINESTRA_ECO_MS = 2500

/**
 * Quante copie recenti di ogni collezione si tengono dentro `.storico/`, a cui
 * si aggiungono i gradini — una per giorno dell'ultimo mese, una per settimana
 * oltre: vedi `Pacchetto.conserva`. Dieci da sole, a una al minuto, erano dieci
 * minuti di passato; «com'era ieri» è la domanda che ci si fa davvero.
 */
const COPIE_STORICO = 10

/**
 * Il tetto dell'attesa fra un salvataggio fallito e il tentativo dopo.
 *
 * Si parte da un secondo e si raddoppia: un EPERM di OneDrive passa di solito
 * in pochi secondi, una chiavetta tolta no, e riprovarci ogni secondo per ore
 * sarebbe rumore. Un minuto è quanto si rischia al massimo di aspettare dopo
 * che il disco è tornato disponibile.
 */
const RIPROVA_MASSIMA_MS = 60_000

/** Quante volte una ricarica si rifà perché nel frattempo è arrivata una modifica. */
const RICARICHE_RIFATTE = 3

/** Il contenuto grezzo dei file, prima che la normalizzazione ci metta mano. */
type FilePersistito = Record<NomeCollezione, unknown>

const COLLEZIONI = Object.keys(NOMI) as NomeCollezione[]

/**
 * Quel che si legge di un anno senza aprirlo: l'anno stesso, le sue materie e
 * le sue impostazioni. Sta tutto nel `registro.json` della sua cartella.
 */
interface TestaAnno {
  cartella: string
  anno: AnnoScolastico
  materie: Materia[]
  impostazioni: Impostazioni
}

/**
 * Come sta il salvataggio: se c'è qualcosa che aspetta di essere scritto, e
 * quando è finita l'ultima scrittura riuscita.
 *
 * Due campi e non uno solo: «tutto scritto» senza dire *quando* non basta a
 * chi ha appena battuto tre righe e vuole sapere se sono quelle scritte, e
 * «modifiche in attesa» senza l'ora dell'ultimo salvataggio non dice quanto si
 * rischia di perdere.
 */
interface StatoSalvataggio {
  inSospeso: boolean
  /** L'ultima scrittura riuscita, in millisecondi. `null` se non ce n'è stata. */
  ultimo: number | null
}

/**
 * Che cosa fare quando il documento di un anno risulta aperto altrove.
 *
 * Lo decide chi ha una finestra da mostrare — il guscio — e non l'archivio, che
 * di finestre non sa niente. Senza risposta si apre lo stesso: la serratura è
 * un avviso, e un avviso che nessuno può leggere non deve fermare il registro.
 */
type SeOccupato = (
  anno: string,
  serratura: Serratura,
) => Promise<boolean>

export class Archivio implements apparato.Smaltitore {
  private stato: Registro = registroVuoto()
  private caricato = false
  /** Il documento dell'anno in uso: aperto finché ci si lavora. */
  private pacchetto: Pacchetto | null = null
  /**
   * I file dell'anno — PDF, rapporti, immagini — che stanno dentro il
   * documento e devono sembrare file. Guarda sempre il documento aperto in
   * questo momento: cambiando anno, cambia quel che mostra senza doverlo
   * ricostruire.
   */
  readonly deposito: Deposito
  /** Chiesto prima di aprire un anno che risulta aperto altrove. */
  private seOccupato: SeOccupato | null = null
  private timerSalvataggio: NodeJS.Timeout | null = null
  /** Quando è arrivata la prima modifica non ancora scritta: zero se non ce n'è. */
  private primaModificaNonSalvata = 0
  private timerRicarica: NodeJS.Timeout | null = null
  /** Il prossimo tentativo dopo un salvataggio fallito. */
  private timerRiprova: NodeJS.Timeout | null = null
  /** Quanti salvataggi di fila sono falliti: decide quanto aspettare il prossimo. */
  private salvataggiFalliti = 0
  private scritturePendenti = new Set<NomeCollezione>()
  private ultimeScritture = new Map<string, number>()
  /** Il testo scritto per ultimo, per collezione: un file identico non è una modifica. */
  private ultimiTesti = new Map<NomeCollezione, string>()
  /**
   * I file che non si sono riusciti a leggere. Non si riscrivono sopra: un
   * JSON rotto è recuperabile a mano, e coprirlo con una collezione vuota alla
   * prima modifica sarebbe il modo di perderlo per sempre. Si mette da parte
   * con un altro nome, e solo allora si scrive.
   */
  private illeggibili = new Set<NomeCollezione>()
  private osservatore: apparato.Osservatore | null = null
  /** Letture e scritture in fila: mai due insieme sugli stessi file. */
  private coda: Promise<unknown> = Promise.resolve()

  /**
   * Il documento su cui si sta lavorando: quel che è stato scelto da aprire.
   *
   * È il solo indirizzo che l'archivio tiene. Null prima che se ne apra uno, e
   * dopo che lo si è chiuso: `carica()` con questo a null lascia un registro
   * senza anno, che è lo stato giusto per chi non ha ancora scelto niente.
   */
  private documento: apparato.Uri | null = null

  /** L'intestazione dell'anno aperto: l'anno, le sue materie, le sue impostazioni. */
  private testa: TestaAnno | null = null

  private modifiche = 0

  private readonly emettitore = new apparato.EventEmitter<Registro>()
  /** Scatta a ogni cambiamento dello stato, da qualunque parte arrivi. */
  readonly alCambiamento = this.emettitore.event

  private readonly emettitoreErrori = new apparato.EventEmitter<string>()
  readonly allErrore = this.emettitoreErrori.event

  /** Quando è finito l'ultimo salvataggio riuscito: zero se non ce n'è ancora stato. */
  private ultimoSalvataggio = 0

  private readonly emettitoreSalvataggio = new apparato.EventEmitter<StatoSalvataggio>()
  /**
   * Scatta quando cambia il rapporto fra quel che si vede e quel che è scritto:
   * una modifica che entra in coda, una scrittura che va a buon fine.
   *
   * Il registro salva da sé e non ha un tasto «salva», ed è la scelta giusta —
   * ma taciuta diventa «non so se il mio lavoro è al sicuro», che è la domanda
   * che si fa chi viene da trent'anni di documenti da salvare a mano. Questo
   * evento è la risposta: la barra di stato la scrive, e non chiede niente a
   * nessuno.
   */
  readonly alSalvataggio = this.emettitoreSalvataggio.event

  /**
   * La cartella dell'utente serve al deposito, che ci tiene le copie
   * materializzate. Senza — nelle prove che non hanno un contesto — le copie
   * finiscono accanto ai dati, e chi non le usa non se ne accorge.
   */
  constructor (cartellaUtente?: apparato.Uri) {
    this.deposito = new Deposito(
      () => this.pacchetto,
      cartellaUtente ?? apparato.Uri.file(process.cwd()),
      () => this.programmaSalvataggio(),
    )
  }

  // ---------------------------------------------------------------- lettura

  get registro (): Registro {
    return this.stato
  }

  get pronto (): boolean {
    return this.caricato
  }

  /**
   * Quante volte lo stato è stato modificato: un contatore, non una data.
   *
   * Serve a chi deve sapere se un'azione ha davvero cambiato qualcosa. Il solo
   * esito dell'azione non basta: aprire un allegato o esportare un CSV
   * riescono senza toccare il registro, e chi vuole reagire *ai dati* — rifare
   * i documenti, per esempio — reagirebbe anche a quelli. Due letture attorno
   * a un'azione, e se il numero è lo stesso non è successo niente.
   */
  get revisione (): number {
    return this.modifiche
  }

  /**
   * Com'è messo il salvataggio in questo istante.
   *
   * «In sospeso» sono le due cose che `salva` scrive: le collezioni toccate da
   * una modifica e i file che il deposito ha messo nel documento. Guardarne una
   * sola direbbe «tutto scritto» con un PDF appena archiviato ancora in memoria.
   */
  get statoSalvataggio (): StatoSalvataggio {
    return {
      inSospeso: this.scritturePendenti.size > 0 || Boolean(this.pacchetto?.sporco),
      ultimo: this.ultimoSalvataggio || null,
    }
  }

  /** Dice com'è messo il salvataggio a chi lo sta scrivendo sullo schermo. */
  private annunciaSalvataggio (): void {
    this.emettitoreSalvataggio.fire(this.statoSalvataggio)
  }

  /** L'anno in uso, o null se non ce n'è ancora nessuno. */
  get annoCorrente (): AnnoScolastico | null {
    return this.stato.anni.find((a) => a.id === this.stato.annoCorrenteId) ?? null
  }

  /** Il nome dell'anno in uso, che è quello del suo documento: '2026-2027'. */
  get cartellaCorrente (): string | null {
    return nomeDocumento()
  }

  /** Il documento aperto, per chi deve nominarlo: i recenti, la barra del titolo. */
  get documentoAperto (): apparato.Uri | null {
    return this.documento
  }

  /**
   * Apre un documento e ne carica il contenuto.
   *
   * È la sola porta d'ingresso dei dati: si consegna l'Uri di quel che si è
   * scelto, e quel che si è scelto è quel che si apre. Non si passa da un nome
   * né da una scansione — il documento può stare ovunque, e ritrovarlo per nome
   * vorrebbe dire poterlo sbagliare.
   *
   * Quel che era in attesa di essere scritto si scrive prima: cambiare
   * documento fra una modifica e il suo salvataggio non deve perderla.
   */
  async apri (file: apparato.Uri | null): Promise<Registro> {
    return this.inFila(async () => {
      await this.scriviPendenti()
      this.documento = file
      return (await this.leggiTutto()) ?? this.stato
    })
  }

  /**
   * Vero se il documento su cui si sta lavorando esiste davvero sul disco.
   *
   * Distingue un registro aperto da uno che ha in mano soltanto un percorso:
   * una chiavetta tolta, una cartella sincronizzata sparita.
   */
  async esiste (): Promise<boolean> {
    const file = percorsoPacchetto()
    return file !== null && (await esisteFile(file))
  }

  /** Dichiara chi risponde quando un anno risulta aperto su un'altra macchina. */
  chiediSeOccupato (domanda: SeOccupato | null): void {
    this.seOccupato = domanda
  }

  /** Mette un lavoro in coda dopo quelli già in corso, e ne torna l'esito. */
  private inFila<T> (lavoro: () => Promise<T>): Promise<T> {
    const esito = this.coda.then(lavoro, lavoro)
    this.coda = esito.catch(() => undefined)
    return esito
  }

  /**
   * Carica tutto da disco. Un file mancante vale come collezione vuota: si
   * comincia da un registro nuovo senza dover creare niente in anticipo.
   *
   * Quel che era in attesa di essere scritto si scrive prima: una ricarica
   * che arriva fra una modifica e il suo salvataggio non deve cancellarla.
   *
   * E quel che arriva *durante* la ricarica nemmeno. La coda tiene in fila le
   * letture e le scritture, non le modifiche: `modifica` è sincrona e tocca lo
   * stato vivo, e fra la scrittura del pendente e la sostituzione dello stato
   * ci sono tre attese — il documento da lasciare, quello da riaprire, il file
   * da leggere. Una lezione battuta in quell'intervallo finiva nello stato di
   * prima, che la ricarica buttava via, e la collezione restava «in attesa» di
   * scrivere il contenuto appena riletto dal disco: sparita senza un errore.
   * Allora si guarda, subito prima di sostituire lo stato, se il contatore
   * delle modifiche si è mosso: se sì non si sostituisce niente, si scrive il
   * nuovo pendente sul documento appena riaperto e si rilegge. Il tetto ai giri
   * è per chi batte senza mai fermarsi: dopo tre la ricarica passa comunque,
   * come faceva prima.
   */
  carica (): Promise<Registro> {
    return this.inFila(async () => {
      for (let giro = 0; ; giro += 1) {
        const prima = this.modifiche
        await this.scriviPendenti()
        const letto = await this.leggiTutto({
          tieniSe: () => this.modifiche !== prima && giro < RICARICHE_RIFATTE,
        })
        if (letto) return letto
      }
    })
  }

  /**
   * L'intestazione dell'anno aperto: l'anno, le sue materie, le sue
   * impostazioni.
   *
   * Una sola, perché uno solo è il documento aperto. Qui si leggevano le
   * intestazioni di tutti i documenti della cartella, per riempire un menu
   * degli anni: adesso gli altri anni sono altri file, e a elencarli è il
   * dialogo di apertura del sistema — che li sa elencare meglio, e li trova
   * anche dove il registro non avrebbe guardato.
   */
  private leggiTesta (aperto: Pacchetto | null): TestaAnno | null {
    if (!aperto) return null
    const cartella = aperto.nome
    const grezzo = this.leggiVoce(aperto, NOMI.registro, `${cartella}${ESTENSIONE}`)
    if (!grezzo) return null
    return testaDa(grezzo, cartella)
  }

  /**
   * Rilegge il documento e sostituisce lo stato.
   *
   * `tieniSe` si chiede dopo l'ultima attesa, subito prima di toccare lo stato:
   * se risponde di sì, lo stato resta quello che è e si torna null — è la
   * ricarica che si accorge di una modifica arrivata mentre leggeva, e la fa
   * scrivere prima di riprovare. Il documento appena riaperto resta in mano:
   * è lì che la modifica va scritta.
   */
  private async leggiTutto (opzioni?: { tieniSe?: () => boolean }): Promise<Registro | null> {
    const file = this.documento

    // Il documento di prima si lascia andare — serratura compresa — prima di
    // prendere il nuovo: due documenti aperti insieme sarebbero due serrature,
    // e alla chiusura ne resterebbe una in giro. Se è lo stesso file — è una
    // ricarica, non un cambio di documento — la serratura resta dov'è.
    const stesso = file !== null && this.pacchetto?.file.toString() === file.toString()
    await this.lasciaPacchetto({ tieniSerratura: stesso })
    this.pacchetto = file ? await this.prendiPacchetto(file, { giàNostro: stesso }) : null
    // Da qui alla fine non si aspetta più niente: quel che si decide adesso
    // vale per lo stato che si sta per sostituire.
    if (opzioni?.tieniSe?.()) return null

    // L'anno in uso è il documento che si è riusciti ad aprire, e nient'altro:
    // un percorso in mano senza il file dietro non è un anno aperto, e
    // dichiararlo tale vorrebbe dire accettare modifiche e non scriverle da
    // nessuna parte.
    impostaDocumento(this.pacchetto ? file : null)
    const corrente = this.leggiTesta(this.pacchetto)
    this.testa = corrente
    // Le voci dell'anno in uso valgono solo per lui: quel che era stato letto
    // dal documento di prima non deve far credere che una collezione sia a posto.
    this.ultimiTesti.clear()
    this.illeggibili.clear()

    const grezzo = {} as FilePersistito
    for (const collezione of COLLEZIONI) {
      grezzo[collezione] = collezione === 'registro' ? null : this.leggiCollezione(collezione)
    }

    this.stato = normalizzaRegistro({
      versione: VERSIONE_DATI,
      anni: corrente ? [corrente.anno] : [],
      annoCorrenteId: corrente?.anno.id ?? null,
      materie: corrente?.materie ?? [],
      impostazioni: corrente?.impostazioni,
      classi: grezzo.classi ?? [],
      corsi: grezzo.corsi ?? [],
      lezioni: grezzo.lezioni ?? [],
      piani: grezzo.piani ?? [],
      valutazioni: grezzo.valutazioni ?? [],
      fascicoli: grezzo.fascicoli ?? [],
      consegne: grezzo.consegne ?? [],
      smistamenti: grezzo.smistamenti ?? [],
      coordinate: grezzo.coordinate ?? [],
    })
    // La cartella dell'anno non sta scritta dentro il documento — è il nome del
    // documento stesso — e quindi si riattacca qui, dopo la normalizzazione:
    // scriverla dentro vorrebbe dire un file che pretende di sapere come si
    // chiama, e che si contraddice appena lo si rinomina.
    this.stato.anni = corrente ? [{ ...corrente.anno, cartella: corrente.cartella }] : []
    this.stato.annoCorrenteId = corrente?.anno.id ?? null
    this.caricato = true

    // Se la lettura ha migrato qualcosa — una versione precedente dei file, o
    // un campo scritto a mano che la normalizzazione ha rimesso in riga — quel
    // lavoro va fissato su disco. Gli id dei corsi nascono nuovi a ogni
    // migrazione: senza salvarli, il caricamento dopo ne inventa altri e le
    // lezioni restano appese.
    const migrate = this.collezioniMigrate(grezzo)
    if (migrate.length > 0) {
      for (const collezione of migrate) this.scritturePendenti.add(collezione)
      this.programmaSalvataggio()
    }

    this.emettitore.fire(this.stato)
    return this.stato
  }

  /**
   * Quali file la normalizzazione ha cambiato rispetto a com'erano su disco.
   *
   * Il confronto è fra il testo letto e il testo che si riscriverebbe adesso:
   * non c'è da elencare i campi che una migrazione potrebbe toccare, e nessuna
   * migrazione futura può dimenticarsi di aggiornare questo controllo. Su un
   * file già nella forma buona i due testi coincidono, e non si scrive niente.
   * Un file illeggibile non è una migrazione: resta com'è finché non lo si
   * tocca apposta.
   */
  private collezioniMigrate (grezzo: FilePersistito): NomeCollezione[] {
    return COLLEZIONI.filter((collezione) => {
      // L'intestazione dell'anno l'ha già letta e rimessa in riga `leggiTeste`:
      // riscriverla qui vorrebbe dire confrontarla con un file che non è stato
      // letto da questo giro.
      if (collezione === 'registro') return false
      if (this.illeggibili.has(collezione)) return false
      const letto = grezzo[collezione]
      // Un file che non c'è non è una migrazione: lo si crea quando serve.
      if (letto === null || letto === undefined) {
        return this.contenutoNonVuoto(collezione)
      }
      return JSON.stringify(letto) !== JSON.stringify(this.contenutoDi(collezione))
    })
  }

  /** Vero se una collezione ha qualcosa dentro: un file vuoto non va creato. */
  private contenutoNonVuoto (collezione: NomeCollezione): boolean {
    const contenuto = this.contenutoDi(collezione)
    if (Array.isArray(contenuto)) return contenuto.length > 0
    return collezione === 'registro' && this.annoCorrente !== null
  }

  /** Una voce qualsiasi di un documento, interpretata come oggetto JSON. */
  private leggiVoce (
    pacchetto: Pacchetto,
    nome: string,
    dove: string,
  ): Record<string, unknown> | null {
    try {
      // L'apertura della voce sta dentro il `try` come il parse: un blocco con
      // il CRC che non torna è illeggibile quanto un JSON rotto, e deve seguire
      // la stessa strada invece di far cadere l'apertura dell'anno intero.
      const testo = pacchetto.testo(nome)?.trim()
      if (!testo) return null
      // `: unknown` e non il tipo che `JSON.parse` dichiara, che e' `any`: da un
      // `any` in poi TypeScript smette di controllare, e quel che esce di qui
      // finisce dritto nel registro. Dichiararlo ignoto obbliga a guardarlo
      // prima di usarlo — che e' quel che le righe qui sotto gia' fanno.
      const letto: unknown = JSON.parse(testo)
      return letto && typeof letto === 'object' ? (letto as Record<string, unknown>) : null
    } catch (errore) {
      this.emettitoreErrori.fire(
        `${nome} dentro ${dove} non è un JSON valido ` +
          `(${errore instanceof Error ? errore.message : String(errore)}): il documento resta com’è.`,
      )
      return null
    }
  }

  /**
   * Una collezione dell'anno aperto.
   *
   * Non c'è più niente da leggere dal disco: il documento è già tutto in
   * memoria, e qui si interpreta e basta. Quel che resta uguale a prima è che
   * cosa succede a un JSON rotto — si segnala, si lascia vuota quella sola
   * collezione, e la voce non si tocca finché non c'è da riscriverla.
   */
  private leggiCollezione (nome: NomeCollezione): unknown {
    try {
      // Anche l'apertura della voce: un blocco rovinato è una collezione
      // illeggibile come un JSON rotto — si segnala, si mette da parte alla
      // prima modifica, e l'anno si apre lo stesso.
      const testo = this.pacchetto?.testo(NOMI[nome])?.trim()
      if (!testo) return null
      // `: unknown` e non il tipo che `JSON.parse` dichiara, che e' `any`: da un
      // `any` in poi TypeScript smette di controllare, e quel che esce di qui
      // finisce dritto nel registro. Dichiararlo ignoto obbliga a guardarlo
      // prima di usarlo — che e' quel che le righe qui sotto gia' fanno.
      const letto: unknown = JSON.parse(testo)
      this.illeggibili.delete(nome)
      return letto
    } catch (errore) {
      this.illeggibili.add(nome)
      this.emettitoreErrori.fire(
        `${NOMI[nome]} non è un JSON valido (${errore instanceof Error ? errore.message : String(errore)}): ` +
          'resta com’è, e alla prima modifica viene messo da parte con un altro nome.',
      )
      return null
    }
  }

  // ------------------------------------------------------- aprire e chiudere

  /**
   * Apre il documento di un anno e ne prende la serratura.
   *
   * Se risulta già aperto altrove si chiede — a chi ha una finestra per
   * chiedere — se procedere lo stesso. Una risposta negativa non è un errore:
   * torna null, e il registro resta senza anno aperto invece di mettersi a
   * scrivere sopra il lavoro di qualcun altro.
   *
   * Un documento illeggibile invece si annuncia e si lascia stare: non lo si
   * apre vuoto, o il primo salvataggio ci scriverebbe sopra un anno intero.
   */
  private async prendiPacchetto (
    file: apparato.Uri,
    opzioni?: { giàNostro?: boolean },
  ): Promise<Pacchetto | null> {
    const cartella = nomeDelPacchetto(file)

    // Un anno che era già nostro non si richiede: la domanda vale all'apertura,
    // e rifarla a ogni ricarica — una sincronizzazione ne provoca una — sarebbe
    // una finestra modale ogni volta che il collega salva.
    const chiLoTiene = opzioni?.giàNostro ? null : await Pacchetto.chiLoTiene(file)
    if (chiLoTiene && this.seOccupato && !(await this.seOccupato(cartella, chiLoTiene))) {
      return null
    }

    let pacchetto: Pacchetto
    try {
      pacchetto = await Pacchetto.apri(file)
    } catch (errore) {
      this.emettitoreErrori.fire(
        errore instanceof ErrorePacchetto
          ? errore.message
          : `Non riesco ad aprire ${cartella}${ESTENSIONE}: ${errore instanceof Error ? errore.message : String(errore)}`,
      )
      return null
    }

    // Lo stesso rifiuto del contenitore, per i dati che ci stanno dentro: un
    // anno scritto da un registro più recente può avere campi che qui non si
    // conoscono. La normalizzazione li scarterebbe in silenzio, e la prima
    // scrittura — `collezioniMigrate` la fa subito, senza che nessuno tocchi
    // niente — li cancellerebbe dal documento per sempre.
    const versione = versioneDati(pacchetto)
    if (versione !== null && versione > VERSIONE_DATI) {
      this.emettitoreErrori.fire(
        `${cartella}${ESTENSIONE} è stato scritto da una versione più recente ` +
          `del registro (dati ${versione}, qui si arriva a ${VERSIONE_DATI}). ` +
          'Aggiorna il registro invece di aprirlo: scriverci sopra adesso perderebbe quel che non si sa leggere.',
      )
      return null
    }

    await pacchetto.prendi({ giàPresa: opzioni?.giàNostro })
    return pacchetto
  }

  /**
   * Chiude il documento aperto: scrive quel che manca e restituisce la
   * serratura.
   *
   * `tieniSerratura` serve alla ricarica dello stesso anno: là il documento si
   * rilegge da capo — è cambiato sul disco — ma non lo si sta lasciando, e chi
   * lo riapre un istante dopo è lo stesso registro.
   */
  private async lasciaPacchetto (opzioni?: { tieniSerratura?: boolean }): Promise<void> {
    const pacchetto = this.pacchetto
    if (!pacchetto) return
    this.pacchetto = null
    try {
      await pacchetto.salva()
    } catch (errore) {
      this.emettitoreErrori.fire(
        `Non riesco a salvare ${pacchetto.nome}${ESTENSIONE}: ${errore instanceof Error ? errore.message : String(errore)}`,
      )
    }
    if (!opzioni?.tieniSerratura) await pacchetto.lascia()
  }

  /**
   * Le copie materializzate dei file dell'anno che si sta lasciando.
   *
   * Si buttano chiudendo, non cambiando anno: sono in una cartella per anno, e
   * chi torna indietro se le ritrova invece di riestrarle.
   */
  private async smontaDeposito (): Promise<void> {
    await this.deposito.smonta()
  }

  /**
   * Chiude il registro: l'ultimo salvataggio, e poi il documento libero.
   *
   * È quel che si fa spegnendo, e quel che si fa prima di cambiare cartella di
   * lavoro. Dopo, il file sul disco è completo e la sua serratura non c'è più:
   * la stessa cartella aperta da un'altra macchina non trova nessuno.
   */
  async chiudi (): Promise<void> {
    await this.salva()
    await this.inFila(() => this.lasciaPacchetto())
    // Un tentativo programmato dopo un fallimento non ha più niente da fare:
    // l'ultimo salvataggio è appena passato, riuscito o no.
    this.fermaRiprova()
    await this.smontaDeposito()
  }

  /**
   * Scrive il documento aperto, se c'è qualcosa da scrivere.
   *
   * Torna il documento a scriverlo per intero, e non c'è modo di fare
   * altrimenti: uno ZIP non si aggiorna in una voce sola. È il motivo per cui
   * il ritardo prima di salvare è più lungo di quando i file erano nove, e il
   * motivo per cui `Pacchetto` confronta il contenuto prima di toccare il
   * disco.
   */
  private async scriviPacchetto (): Promise<void> {
    if (!this.pacchetto) return
    const file = percorsoPacchetto()
    if (file) this.ultimeScritture.set(file.toString(), Date.now())
    await this.pacchetto.salva()
    if (file) this.ultimeScritture.set(file.toString(), Date.now())
    // Riuscito: i tentativi falliti ricominciano da capo, e quello già
    // programmato non serve più.
    this.salvataggiFalliti = 0
    this.fermaRiprova()
    // Il timbro si mette qui, dopo la scrittura vera e per tutte le strade che
    // ci passano: il salvataggio ritardato, quello chiesto a mano, la chiusura
    // dell'anno. Metterlo in una sola di quelle vorrebbe dire una barra che
    // dice «salvato alle 9:12» mentre l'ultima scrittura è delle 9:40.
    this.ultimoSalvataggio = Date.now()
    this.annunciaSalvataggio()
  }

  // ---------------------------------------------------------------- gli anni

  /**
   * Un anno nuovo: il suo documento, e accanto la sua cartella.
   *
   * Dove sta lo dice chi chiama — il dialogo «salva con nome» del sistema — e
   * non più una regola nostra su una cartella nostra: il documento può nascere
   * dove il docente tiene i suoi, che è l'unico posto che conta.
   *
   * Materie e impostazioni si copiano dall'anno in uso. Sono le stesse quasi
   * sempre — si insegnano le stesse materie con la stessa scala — e ricopiarle
   * a mano ogni settembre sarebbe il primo motivo per non creare l'anno nuovo.
   * Copiate e non condivise: un anno chiuso deve restare leggibile con le
   * regole con cui è stato scritto, anche se intanto la scala è cambiata.
   *
   * Il documento nuovo diventa quello aperto: crearne uno e restare sul
   * precedente vorrebbe dire due anni in ballo e nessuno dei due scelto.
   */
  async creaAnno (anno: AnnoScolastico, file: apparato.Uri): Promise<AnnoScolastico | null> {
    const cartella = nomeDelPacchetto(file)
    const testa: TestaAnno = {
      cartella,
      anno: { ...anno, cartella },
      materie: this.stato.materie.map((m) => ({ ...m })),
      impostazioni: { ...this.stato.impostazioni, scala: { ...this.stato.impostazioni.scala } },
    }

    try {
      await this.salva()
      // Le cartelle prima del documento, e la gemella accanto: sono le due
      // metà di un anno, e vederne una sola nel gestore file farebbe pensare
      // che l'altra si sia persa.
      await apparato.file.createDirectory(apparato.Uri.joinPath(file, '..'))
      await apparato.file.createDirectory(
        apparato.Uri.joinPath(file, '..', cartella),
      )

      // Il documento si scrive prima di aprirlo: `apri` non crea niente, e un
      // Uri che non ha dietro un file non è un anno da aprire.
      const nuovo = Pacchetto.nuovo(file)
      const { cartella: _cartella, ...senzaCartella } = testa.anno
      nuovo.scrivi(
        NOMI.registro,
        `${JSON.stringify(
          {
            versione: VERSIONE_DATI,
            anno: senzaCartella,
            materie: testa.materie,
            impostazioni: testa.impostazioni,
          },
          null,
          2,
        )}
`,
      )
      this.ultimeScritture.set(file.toString(), Date.now())
      await nuovo.salva({ forza: true })
      this.ultimeScritture.set(file.toString(), Date.now())
    } catch (errore) {
      this.emettitoreErrori.fire(
        `Non riesco a creare il documento dell’anno ${anno.etichetta}: ${errore instanceof Error ? errore.message : String(errore)}`,
      )
      return null
    }

    await this.apri(file)
    return this.annoCorrente
  }

  /**
   * Riscrive l'intestazione dell'anno aperto: il calendario, i semestri.
   *
   * Qui si poteva correggere anche un anno che non era quello in uso — le
   * vacanze dell'anno prossimo escono in primavera — perché l'archivio teneva
   * in mano le intestazioni di tutti i documenti della cartella. Adesso il
   * documento aperto è uno solo: per correggere un altro anno lo si apre, che
   * è un gesto in più e una sorgente di meno da tenere in riga.
   */
  async salvaAnno (anno: AnnoScolastico): Promise<boolean> {
    const testa = this.testa
    if (!testa || anno.id !== testa.anno.id) return false
    const aggiornata: TestaAnno = { ...testa, anno: { ...anno, cartella: testa.cartella } }
    try {
      await this.scriviTesta(aggiornata)
    } catch (errore) {
      this.emettitoreErrori.fire(
        `Salvataggio dell’anno ${anno.etichetta} non riuscito: ${errore instanceof Error ? errore.message : String(errore)}`,
      )
      return false
    }
    this.testa = aggiornata
    this.stato.anni = [aggiornata.anno]
    this.emettitore.fire(this.stato)
    return true
  }

  /**
   * Scrive l'intestazione di un anno: l'anno, le sue materie, le sue
   * impostazioni.
   *
   * Si scrive nel documento che si ha già in mano, che è il solo che ci sia.
   */
  private async scriviTesta (testa: TestaAnno): Promise<void> {
    const { cartella: _cartella, ...anno } = testa.anno
    const testo = `${JSON.stringify(
      { versione: VERSIONE_DATI, anno, materie: testa.materie, impostazioni: testa.impostazioni },
      null,
      2,
    )}\n`

    if (!this.pacchetto) return
    this.pacchetto.conserva(NOMI.registro, COPIE_STORICO, { aGradini: true })
    this.pacchetto.scrivi(NOMI.registro, testo)
    this.ultimiTesti.set('registro', testo)
    await this.scriviPacchetto()
  }

  // ---------------------------------------------------------------- scrittura

  /**
   * Applica una modifica allo stato e programma il salvataggio delle sole
   * collezioni toccate. La funzione riceve lo stato vivo: la si modifica in
   * posto e si dichiara che cosa si è cambiato.
   */
  modifica (
    operazione: (registro: Registro) => void,
    collezioni: NomeCollezione[] = COLLEZIONI,
  ): Registro {
    operazione(this.stato)
    this.modifiche += 1
    this.stato.versione = VERSIONE_DATI
    for (const collezione of collezioni) this.scritturePendenti.add(collezione)
    this.programmaSalvataggio()
    this.annunciaSalvataggio()
    this.emettitore.fire(this.stato)
    return this.stato
  }

  /**
   * Programma la scrittura: poco dopo l'ultima modifica, e comunque entro il
   * tetto dalla prima.
   *
   * Il ritardo si rinnova a ogni modifica — è quel che raccoglie una frase
   * battuta a macchina in una scrittura sola — ma non può slittare
   * indefinitamente: chi scrive senza pause vedrebbe il proprio lavoro restare
   * in memoria per minuti.
   */
  private programmaSalvataggio (): void {
    const adesso = Date.now()
    if (this.primaModificaNonSalvata === 0) this.primaModificaNonSalvata = adesso

    const restante = ATTESA_MASSIMA_MS - (adesso - this.primaModificaNonSalvata)
    const fra = Math.max(0, Math.min(RITARDO_SALVATAGGIO_MS, restante))

    if (this.timerSalvataggio) clearTimeout(this.timerSalvataggio)
    this.timerSalvataggio = setTimeout(() => {
      this.timerSalvataggio = null
      // Il salvataggio differito non ha nessuno che lo aspetti: un errore qui
      // diventerebbe una rejection non gestita, cioè un processo principale
      // che cade mentre l'utente scrive. Si annota e si va avanti — il
      // prossimo salvataggio riproverà con gli stessi dati.
      this.salva().catch((errore: unknown) => {
        console.error('salvataggio differito del registro', errore)
      })
    }, fra)
  }

  /**
   * Scrive subito quel che è in attesa. Da chiamare anche allo spegnimento.
   *
   * «In attesa» sono due cose: le collezioni toccate da una modifica, e i file
   * messi nel documento dal deposito — un PDF archiviato, un rapporto stampato.
   * I secondi non passano dalle collezioni, e guardare solo quelle vorrebbe dire
   * lasciare un documento appena archiviato in memoria fino alla prossima
   * lezione battuta a macchina.
   */
  salva (): Promise<void> {
    if (this.scritturePendenti.size === 0 && !this.pacchetto?.sporco) return Promise.resolve()
    return this.inFila(() => this.scriviPendenti())
  }

  private async scriviPendenti (): Promise<void> {
    this.primaModificaNonSalvata = 0
    // Senza un anno aperto non c'è dove scrivere: quel che è in attesa resta in
    // attesa, e il primo anno creato se lo porta dietro.
    if (!this.pacchetto) return
    if (this.scritturePendenti.size === 0) {
      // Niente collezioni da riscrivere, ma il documento ha dentro qualcosa di
      // nuovo: un file depositato. Si scrive lo stesso.
      if (!this.pacchetto.sporco) return
      try {
        await this.scriviPacchetto()
      } catch (errore) {
        // Lo stesso avviso e la stessa riprova delle collezioni: un PDF
        // archiviato che non arriva sul disco è lavoro in memoria quanto una
        // lezione. E l'errore sale lo stesso, come prima: chi aspetta questo
        // salvataggio deve sapere che non è andato.
        this.salvataggioFallito(errore)
        throw errore
      }
      return
    }

    const daScrivere = [...this.scritturePendenti]
    // Il contenuto si fissa adesso, prima di qualunque attesa, e la collezione
    // esce subito dalla coda. Toglierla *dopo* la scrittura perderebbe quel che
    // è stato battuto nel frattempo: la modifica rimetterebbe la collezione in
    // coda, e la riga finale la cancellerebbe da lì scambiandola per salvata —
    // scritta invece era la versione serializzata un istante prima. Fallendo,
    // la collezione rientra in coda e riparte al salvataggio dopo.
    const contenuti = new Map<NomeCollezione, unknown>()
    for (const collezione of daScrivere) {
      if (collezione === 'registro') this.fissaTestaCorrente()
      contenuti.set(collezione, this.contenutoDi(collezione))
      this.scritturePendenti.delete(collezione)
    }

    try {
      // Le voci si aggiornano tutte in memoria, e poi il documento si scrive
      // una volta sola: uno ZIP non si aggiorna in una voce sola, e nove
      // scritture di seguito sarebbero nove archivi interi.
      //
      // Dentro il `try` anche questo: le collezioni sono già uscite dalla coda,
      // e un `aggiornaVoce` che solleva le lasciava fuori — una modifica data
      // per scritta che non era arrivata nemmeno nel documento in memoria.
      for (const collezione of daScrivere) {
        this.aggiornaVoce(collezione, contenuti.get(collezione))
      }
      await this.scriviPacchetto()
    } catch (errore) {
      // Un file di sola lettura o un EPERM di OneDrive non devono perdere
      // niente: quel che non si è scritto torna in attesa, e resta in memoria
      // dentro il documento aperto finché non riesce.
      for (const collezione of daScrivere) this.scritturePendenti.add(collezione)
      this.salvataggioFallito(errore)
    }
  }

  /**
   * Dice che un salvataggio non è andato, e ne programma un altro.
   *
   * Prima un salvataggio fallito restava fallito fino alla modifica dopo: chi
   * aveva finito di scrivere e se n'era andato lasciava tutto in memoria, con
   * la barra che diceva «da salvare» a una stanza vuota. Adesso si riprova da
   * sé, aspettando un po' di più a ogni fallimento. Il timer non tiene vivo il
   * processo — allo spegnimento l'ultimo salvataggio lo fa `chiudi` — e
   * `chiudi` lo toglie.
   */
  private salvataggioFallito (errore: unknown): void {
    this.emettitoreErrori.fire(
      `Salvataggio dell’anno non riuscito: ${errore instanceof Error ? errore.message : String(errore)}`,
    )
    // E la barra torna a dire che c'è roba in attesa: l'errore passa, la
    // riga che dice «da salvare» resta finché la scrittura non riesce.
    this.annunciaSalvataggio()

    this.salvataggiFalliti += 1
    const volte = Math.min(this.salvataggiFalliti - 1, 16)
    const attesa = Math.min(RIPROVA_MASSIMA_MS, 1000 * 2 ** volte)
    this.fermaRiprova()
    const timer = setTimeout(() => {
      this.timerRiprova = null
      this.salva().catch((altro: unknown) => {
        console.error('nuovo tentativo di salvataggio del registro', altro)
      })
    }, attesa)
    timer.unref?.()
    this.timerRiprova = timer
  }

  /** Toglie il tentativo programmato dopo un salvataggio fallito, se c'è. */
  private fermaRiprova (): void {
    if (this.timerRiprova) clearTimeout(this.timerRiprova)
    this.timerRiprova = null
  }

  /**
   * L'intestazione dell'anno in uso, riscritta dallo stato vivo.
   *
   * Passa dalla stessa strada di `.storico` e del file temporaneo degli altri:
   * è il file che tiene la scala dei voti e il calendario, e perderlo a metà
   * scrittura sarebbe la perdita peggiore di tutte.
   */
  private fissaTestaCorrente (): void {
    const anno = this.annoCorrente
    const cartella = this.cartellaCorrente
    if (!anno || !cartella) return
    this.testa = {
      cartella,
      anno,
      materie: this.stato.materie,
      impostazioni: this.stato.impostazioni,
    }
  }

  private contenutoDi (collezione: NomeCollezione): unknown {
    switch (collezione) {
      case 'registro': {
        const corrente = this.annoCorrente
        const { cartella: _cartella, ...anno } = corrente ?? ({} as AnnoScolastico)
        return {
          versione: this.stato.versione,
          anno: corrente ? anno : null,
          materie: this.stato.materie,
          impostazioni: this.stato.impostazioni,
        }
      }
      case 'classi':
        return this.stato.classi
      case 'corsi':
        return this.stato.corsi
      case 'lezioni':
        return this.stato.lezioni
      case 'piani':
        return this.stato.piani
      case 'valutazioni':
        return this.stato.valutazioni
      case 'fascicoli':
        return this.stato.fascicoli
      case 'consegne':
        return this.stato.consegne
      case 'smistamenti':
        return this.stato.smistamenti
      case 'coordinate':
        return this.stato.coordinate
    }
  }

  /**
   * Rimette una collezione dentro il documento aperto, con la sua copia in
   * `.storico/`.
   *
   * Non tocca il disco: il documento si scrive dopo, una volta sola. Il testo
   * lo fa `testoCollezione`: indentato, perché questi JSON capita di leggerli
   * a mano dopo aver aperto l'archivio con un doppio clic, e senza i campi
   * lasciati vuoti, che la lettura rimette da sé.
   */
  private aggiornaVoce (collezione: NomeCollezione, contenuto: unknown): void {
    const pacchetto = this.pacchetto
    if (!pacchetto) return
    const nome = NOMI[collezione]
    const testo = testoCollezione(contenuto)
    if (this.ultimiTesti.get(collezione) === testo) return

    if (this.illeggibili.has(collezione)) this.mettiDaParte(collezione)
    // La copia di com'era prima di riscriverla, con le ultime dieci tenute più
    // una per giorno e una per settimana, e le altre buttate. Costa poco — dieci versioni dello stesso JSON dentro uno
    // ZIP si comprimono quasi a niente — e ripaga la prima volta che si vuole
    // sapere che cosa c'era ieri.
    pacchetto.conserva(nome, COPIE_STORICO, { aGradini: true })
    pacchetto.scrivi(nome, testo)
    this.ultimiTesti.set(collezione, testo)
  }

  /**
   * Una voce che non si è saputa leggere si rinomina, non si copre.
   *
   * Resta dentro il documento con un altro nome: chi apre l'archivio la trova
   * accanto alle altre, e il registro nel frattempo riparte da una collezione
   * nuova invece di rifiutarsi di salvare.
   */
  private mettiDaParte (collezione: NomeCollezione): void {
    const pacchetto = this.pacchetto
    if (!pacchetto) return
    const nome = NOMI[collezione]
    this.illeggibili.delete(collezione)
    const marca = new Date().toISOString().replace(/[:.]/g, '-')
    const altrove = nome.replace(/\.json$/, `.rotto-${marca}.json`)
    let rotta: string | null
    try {
      rotta = pacchetto.testo(nome)
    } catch {
      // Il blocco stesso non si apre — CRC che non torna, `inflate` che si
      // ferma — e quindi non se ne può fare una copia leggendola: si sposta
      // il blocco com'è sotto l'altro nome, senza aprirlo. Chi saprà
      // ripararlo lo troverà intero.
      if (!pacchetto.rinomina(nome, altrove)) return
      this.emettitoreErrori.fire(
        `${nome} non si leggeva: la copia è dentro l’anno con il nome ${altrove}, ` +
          'e il registro riparte da una collezione nuova.',
      )
      return
    }
    if (rotta === null) return
    pacchetto.scrivi(altrove, rotta)
    this.emettitoreErrori.fire(
      `${nome} non si leggeva: la copia è dentro l’anno con il nome ${altrove}, ` +
        'e il registro riparte da una collezione nuova.',
    )
  }

  // ---------------------------------------------------------------- osservazione

  /**
   * Tiene d'occhio il documento aperto: il registro sta spesso in una cartella
   * sincronizzata, e lo stesso anno può essere aperto su due macchine. Le
   * modifiche che arrivano da fuori vengono ricaricate; l'eco delle proprie
   * scritture no.
   *
   * Si guarda quello aperto e basta. Prima si guardavano tutti i documenti
   * della cartella, perché un anno comparso da una sincronizzazione doveva
   * entrare nel menu degli anni: quel menu non c'è più, e un file che non si è
   * aperti non ha niente da dire al registro.
   *
   * Va richiamata a ogni cambio di documento: l'osservatore vecchio si chiude
   * qui dentro, e chi apre un altro anno non deve ricordarsene.
   */
  osserva (): apparato.Smaltitore {
    const file = this.documento
    this.osservatore?.dispose()
    this.osservatore = null
    if (!file) return new apparato.Smaltitore(() => undefined)

    this.osservatore = apparato.osserva(
      new apparato.ModelloRelativo(apparato.Uri.joinPath(file, '..'), nomeDelPacchetto(file) + ESTENSIONE),
    )

    const ricarica = (uri: apparato.Uri) => {
      const quando = this.ultimeScritture.get(uri.toString()) ?? 0
      if (Date.now() - quando < FINESTRA_ECO_MS) return
      // Una raffica di eventi — nove file toccati insieme da una
      // sincronizzazione — vale una ricarica sola.
      if (this.timerRicarica) clearTimeout(this.timerRicarica)
      this.timerRicarica = setTimeout(() => {
        this.timerRicarica = null
        // Un `.registro` sincronizzato a metà solleva: la ricarica va
        // riprovata al prossimo evento, non fatta cadere sul processo.
        this.carica().catch((errore: unknown) => {
          console.error('ricarica del registro dopo un cambiamento sul disco', errore)
        })
      }, RITARDO_RICARICA_MS)
    }

    this.osservatore.onDidChange(ricarica)
    this.osservatore.onDidCreate(ricarica)
    this.osservatore.onDidDelete(ricarica)
    return this.osservatore
  }

  dispose (): void {
    if (this.timerSalvataggio) clearTimeout(this.timerSalvataggio)
    if (this.timerRicarica) clearTimeout(this.timerRicarica)
    this.fermaRiprova()
    // L'ultimo salvataggio *e* la serratura: chi aspetta lo spegnimento passa
    // da `chiudi`, e chi arriva qui senza aspettare — un `dispose` di
    // emergenza — almeno lascia il documento libero per la prossima apertura.
    this.chiudi().catch((errore: unknown) => {
      console.error('chiusura del registro in emergenza', errore)
    })
    this.osservatore?.dispose()
    this.emettitore.dispose()
    this.emettitoreErrori.dispose()
  }
}

/**
 * La versione dei dati che l'intestazione di un documento dichiara, o null se
 * non la dichiara o non si legge. Chi non si legge lo dice `leggiVoce` più
 * avanti, con il suo messaggio: qui interessa solo il caso del numero troppo
 * alto.
 */
function versioneDati (pacchetto: Pacchetto): number | null {
  try {
    const testo = pacchetto.testo(NOMI.registro)
    if (!testo) return null
    const letto: unknown = JSON.parse(testo)
    const versione = (letto as { versione?: unknown } | null)?.versione
    return typeof versione === 'number' ? versione : null
  } catch {
    return null
  }
}

/**
 * L'intestazione di un anno da quel che c'è nel suo file.
 *
 * Passa dalla normalizzazione completa, con le collezioni vuote: è la stessa
 * rete che regge un file scritto a mano o di una versione precedente, e non
 * vale la pena averne due. `anni` al plurale si accetta perché è la forma che
 * aveva il file unico di prima: la migrazione lo legge da qui.
 */
function testaDa (grezzo: Record<string, unknown>, cartella: string): TestaAnno | null {
  const anni = grezzo.anno ? [grezzo.anno] : Array.isArray(grezzo.anni) ? grezzo.anni : []
  if (anni.length === 0) return null
  const letto = normalizzaRegistro({ ...grezzo, anni, annoCorrenteId: null })
  const anno = letto.anni[0]
  if (!anno) return null
  return {
    cartella,
    anno: { ...annoAllineato(anno), cartella },
    materie: letto.materie,
    impostazioni: letto.impostazioni,
  }
}
