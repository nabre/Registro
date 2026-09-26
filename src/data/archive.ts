// L'unico punto in cui il registro tocca il disco. Tiene in memoria lo stato
// dell'anno aperto (un documento `.regi`, vedi `package.ts`) e lo salva poco dopo
// ogni modifica, con una copia di prima in `.storico/`. Letture e scritture
// passano da una coda sola, così una ricarica del watcher non butta via una
// modifica in attesa.

import * as apparato from 'apparato'

import { annoAllineato } from '../domain/years.js'
import { registroVuoto } from '../domain/factories.js'
import { ESPORTAZIONI } from '../domain/locations.js'
import type { AnnoScolastico, Impostazioni, Materia, Registro } from '../domain/models.js'
import { VERSIONE_DATI } from '../domain/models.js'
import { normalizzaRegistro } from '../domain/normalization.js'
import {
  aggiornaFormato,
  fraseVersionePiuRecente,
  raccontaAggiornamento,
  type FormatoAggiornato,
} from '../domain/upgrades.js'
import { testoCollezione } from '../domain/persistence.js'
import { testi } from './archive.testi.js'
import { Deposito, dentroIlDocumento } from './store.js'
import { Storia, type EsitoStoria } from './history.js'
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

/** Quanto si aspetta dall'ultima modifica prima di scrivere: il salvataggio costa poco. */
const RITARDO_SALVATAGGIO_MS = 350

/** Tetto dalla prima modifica non salvata: il ritardo si rinnova a ogni tasto. */
const ATTESA_MASSIMA_MS = 2000

/** Quanto si aspetta prima di ricaricare: il watcher annuncia lo stesso file più volte. */
const RITARDO_RICARICA_MS = 300

/** Quanto un file appena scritto da noi resta "nostro" agli occhi del watcher. */
const FINESTRA_ECO_MS = 2500

/** Copie recenti per collezione in `.storico/`, più i gradini di `Pacchetto.conserva`. */
const COPIE_STORICO = 10

/** Tetto dell'attesa fra i tentativi dopo un salvataggio fallito (si parte da 1 s e si raddoppia). */
const RIPROVA_MASSIMA_MS = 60_000

/** Quante volte una ricarica si rifà perché nel frattempo è arrivata una modifica. */
const RICARICHE_RIFATTE = 3

/**
 * Dove va la copia di un documento prima di portarlo a un formato nuovo: nella
 * cartella gemella, non in `.storico/`, che si pota e sta dentro il documento.
 */
const VERSIONI_PRECEDENTI = 'versioni-precedenti'

/** Il contenuto grezzo dei file, prima che la normalizzazione ci metta mano. */
type FilePersistito = Record<NomeCollezione, unknown>

const COLLEZIONI = Object.keys(NOMI) as NomeCollezione[]

/** Vero se un percorso del documento è un foglio che il registro stampa da sé. */
function sottoEsportazioni (relativo: string): boolean {
  const pulito = relativo.replace(/\\/g, '/').replace(/^\.?\//, '')
  return pulito === ESPORTAZIONI || pulito.startsWith(`${ESPORTAZIONI}/`)
}

/** L'intestazione di un anno (anno, materie, impostazioni), da `registro.json`. */
interface TestaAnno {
  cartella: string
  anno: AnnoScolastico
  materie: Materia[]
  impostazioni: Impostazioni
}

/** Un altro anno letto soltanto: il registro e i byte dei file, per ricopiarne qualcuno. */
interface AltroAnno {
  registro: Registro
  bytes: (relativo: string) => Uint8Array | null
}

/** Come sta il salvataggio: se c'è qualcosa in attesa, e quando è riuscito l'ultimo. */
interface StatoSalvataggio {
  inSospeso: boolean
  /** L'ultima scrittura riuscita, in millisecondi. `null` se non ce n'è stata. */
  ultimo: number | null
}

/**
 * Che cosa fare se il documento risulta aperto altrove: lo decide il guscio.
 * Senza risposta si apre lo stesso, la serratura è solo un avviso.
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
  /** I file dell'anno dentro il documento; guarda sempre il pacchetto aperto. */
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
   * Le collezioni illeggibili: prima di scriverci sopra si mettono da parte
   * con un altro nome, perché un JSON rotto si recupera a mano.
   */
  private illeggibili = new Set<NomeCollezione>()
  private osservatore: apparato.Osservatore | null = null
  /** Letture e scritture in fila: mai due insieme sugli stessi file. */
  private coda: Promise<unknown> = Promise.resolve()
  /**
   * Il documento si sta chiudendo o è chiuso: le modifiche si rifiutano, perché
   * non ci sarebbe dove scriverle. Torna falso quando lo stato si rilegge o la
   * chiusura è rifiutata.
   */
  private inChiusura = false
  /** Spento per sempre (`chiudi` allo spegnimento): nessun documento si apre più. */
  private spento = false
  /** Dove va la copia d'emergenza se accanto al documento non si riesce a scrivere. */
  private readonly cartellaUtente: apparato.Uri | null

  /** Il documento scelto da aprire. Null: `carica()` lascia un registro senza anno. */
  private documento: apparato.Uri | null = null

  private modifiche = 0

  /** Annulla e ripristina (`history.ts`); si azzera quando lo stato si rilegge. */
  private readonly storia = new Storia<NomeCollezione>(
    (collezione) => this.testoPerLaStoria(collezione),
  )

  private readonly emettitoreStoria = new apparato.EventEmitter<void>()
  /** Scatta quando cambia la storia senza che cambino i dati (per i pulsanti ↶ ↷). */
  readonly alCambioStoria = this.emettitoreStoria.event

  private readonly emettitore = new apparato.EventEmitter<Registro>()
  /** Scatta a ogni cambiamento dello stato, da qualunque parte arrivi. */
  readonly alCambiamento = this.emettitore.event

  private readonly emettitoreErrori = new apparato.EventEmitter<string>()
  readonly allErrore = this.emettitoreErrori.event

  private readonly emettitoreAvvisi = new apparato.EventEmitter<string>()
  /** Avvisi che non sono guasti, come un documento portato al formato attuale. */
  readonly allAvviso = this.emettitoreAvvisi.event

  /** Quando è finito l'ultimo salvataggio riuscito: zero se non ce n'è ancora stato. */
  private ultimoSalvataggio = 0

  /** `cartellaUtente` ospita le copie materializzate; senza (prove), si usa la cartella corrente. */
  constructor (cartellaUtente?: apparato.Uri) {
    this.cartellaUtente = cartellaUtente ?? null
    this.deposito = new Deposito(
      () => this.pacchetto,
      cartellaUtente ?? apparato.Uri.file(process.cwd()),
      () => this.programmaSalvataggio(),
      // Un file tolto rende il gesto irreversibile, tranne le esportazioni, che
      // dopo un annulla si rifanno dai dati.
      (relativo) => {
        if (!sottoEsportazioni(relativo)) this.segnaIrreversibile()
      },
    )
  }

  // ---------------------------------------------------------------- lettura

  get registro (): Registro {
    return this.stato
  }

  get pronto (): boolean {
    return this.caricato
  }

  /** Contatore delle modifiche: letto prima e dopo un'azione, dice se ha toccato i dati. */
  get revisione (): number {
    return this.modifiche
  }

  /** Com'è messo il salvataggio: in sospeso sono sia le collezioni sia i file depositati. */
  get statoSalvataggio (): StatoSalvataggio {
    return {
      inSospeso: this.scritturePendenti.size > 0 || Boolean(this.pacchetto?.sporco),
      ultimo: this.ultimoSalvataggio || null,
    }
  }

  /** L'anno in uso, o null se non ce n'è ancora nessuno. */
  get annoCorrente (): AnnoScolastico | null {
    return this.stato.anni.find((a) => a.id === this.stato.annoCorrenteId) ?? null
  }

  /** Il nome dell'anno in uso, che è quello del suo documento: '2026-2027'. */
  get cartellaCorrente (): string | null {
    return nomeDocumento()
  }

  /**
   * Il documento aperto, per chi deve nominarlo. Null già mentre si chiude:
   * `ancoraQui` rifiuta così le richieste arrivate in quel momento.
   */
  get documentoAperto (): apparato.Uri | null {
    return this.inChiusura ? null : this.documento
  }

  /** Vero se il documento aperto ha in memoria qualcosa che sul disco non c'è. */
  private restaDaScrivere (): boolean {
    return this.pacchetto !== null && (this.scritturePendenti.size > 0 || this.pacchetto.sporco)
  }

  /**
   * Scrive il pendente prima di lasciare il documento; falso solo se la scrittura
   * è fallita. Quel che arriva mentre si scrive si riscrive, per pochi giri.
   */
  private async scriviPrimaDiLasciare (): Promise<boolean> {
    for (let giro = 0; giro < RICARICHE_RIFATTE; giro += 1) {
      try {
        await this.scriviPendenti()
      } catch {
        // Già annunciato e riprogrammato da `salvataggioFallito`.
      }
      if (!this.restaDaScrivere()) return true
      if (this.salvataggiFalliti > 0) return false
    }
    return true
  }

  /** Il rifiuto di lasciare un documento con modifiche che non sono sul disco. */
  private rifiutaDiLasciare (): void {
    const t = testi()
    const nome = this.pacchetto ? `${this.pacchetto.nome}${ESTENSIONE}` : t.lAnno
    this.emettitoreErrori.fire(t.nonLascio(nome))
  }

  /**
   * Apre il documento indicato e ne carica il contenuto: la sola porta d'ingresso
   * dei dati. Prima scrive il pendente; se non ci riesce resta aperto quello di
   * prima. Dopo lo spegnimento non apre più niente (la serratura resterebbe).
   */
  async apri (file: apparato.Uri | null): Promise<Registro> {
    return this.inFila(async () => {
      if (this.spento) return this.stato
      if (!(await this.scriviPrimaDiLasciare())) {
        const stesso = file !== null && this.pacchetto?.file.toString() === file.toString()
        if (!stesso) this.rifiutaDiLasciare()
        return this.stato
      }
      this.documento = file
      return (await this.leggiTutto()) ?? this.stato
    })
  }

  /** Vero se il documento in uso esiste sul disco (non su una chiavetta tolta, per esempio). */
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
   * Ricarica tutto dal disco; un file mancante vale come collezione vuota.
   * Prima scrive il pendente, e se non ci riesce non rilegge. `modifica` è
   * sincrona e la coda non la ferma: se durante la lettura il contatore si
   * muove, lo stato non si sostituisce, si scrive il nuovo pendente e si rilegge
   * (al massimo `RICARICHE_RIFATTE` volte).
   */
  carica (): Promise<Registro> {
    return this.inFila(async () => {
      for (let giro = 0; ; giro += 1) {
        if (this.spento) return this.stato
        const prima = this.modifiche
        if (!(await this.scriviPrimaDiLasciare())) return this.stato
        const letto = await this.leggiTutto({
          tieniSe: () => this.modifiche !== prima && giro < RICARICHE_RIFATTE,
        })
        if (letto) return letto
      }
    })
  }

  /** L'intestazione grezza dell'anno aperto; `testaDa` la mette in riga dopo i passi del formato. */
  private leggiIntestazione (aperto: Pacchetto | null): Record<string, unknown> | null {
    if (!aperto) return null
    return this.leggiVoce(aperto, NOMI.registro, `${aperto.nome}${ESTENSIONE}`)
  }

  /**
   * Rilegge il documento e sostituisce lo stato. Se `tieniSe`, chiesto dopo
   * l'ultima attesa, dice sì, lo stato resta e torna null; il documento
   * riaperto resta in mano, per scriverci la modifica arrivata.
   */
  private async leggiTutto (opzioni?: { tieniSe?: () => boolean }): Promise<Registro | null> {
    const file = this.documento
    const vecchio = this.pacchetto

    // Il nuovo si prova prima di lasciare il vecchio, così un fallimento non
    // lascia senza anno. Stesso file (ricarica): la serratura resta.
    const stesso = file !== null && vecchio?.file.toString() === file.toString()
    const nuovo = file ? await this.prendiPacchetto(file, { giàNostro: stesso }) : null
    if (file && !nuovo && vecchio) {
      // Non si è aperto (già detto): resta quello di prima, intero.
      this.documento = vecchio.file
      return this.stato
    }
    // Formato vecchio: la copia com'è, prima che ci si scriva sopra. Qui, perché
    // più sotto non si aspetta più niente (`tieniSe`).
    const versioneLetta = nuovo ? versioneDati(nuovo) : null
    const copia = file && versioneLetta !== null && versioneLetta < VERSIONE_DATI
      ? await this.copiaPrimaDelFormato(file, versioneLetta)
      : null
    if (nuovo && vecchio && !stesso) {
      // Durante la domanda sulla serratura si è potuto scrivere sul vecchio:
      // va sul disco adesso, o non lo si lascia.
      if (!(await this.scriviPrimaDiLasciare())) {
        await nuovo.lascia()
        this.documento = vecchio.file
        this.rifiutaDiLasciare()
        return this.stato
      }
    }
    // Il vecchio si lascia prima di prendere il nuovo: due serrature insieme
    // lascerebbero in giro una delle due.
    await this.lasciaPacchetto({ tieniSerratura: stesso })
    this.pacchetto = nuovo
    // Un documento che non si è aperto non è quello su cui si lavora.
    this.documento = nuovo ? file : null
    // Da qui alla fine niente attese: la decisione vale per lo stato da sostituire.
    if (opzioni?.tieniSe?.()) return null

    // Solo un documento aperto davvero è l'anno in uso: altrimenti si
    // accetterebbero modifiche senza dove scriverle.
    impostaDocumento(this.pacchetto ? file : null)
    const intestazione = this.leggiIntestazione(this.pacchetto)
    // Quel che si sapeva del documento di prima non vale per questo.
    this.ultimiTesti.clear()
    this.illeggibili.clear()

    const grezzo = {} as FilePersistito
    for (const collezione of COLLEZIONI) {
      grezzo[collezione] = collezione === 'registro' ? null : this.leggiCollezione(collezione)
    }

    // I passi del formato vengono prima della normalizzazione.
    const formato = aggiornaFormato({ ...grezzo, registro: intestazione }, versioneLetta)
    const aggiornati = formato.dati as FilePersistito
    const corrente = this.pacchetto && aggiornati.registro
      ? testaDa(aggiornati.registro as Record<string, unknown>, this.pacchetto.nome)
      : null

    this.stato = registroDa(corrente, aggiornati)
    this.caricato = true
    // Le modifiche da qui arrivano sul documento nuovo.
    this.inChiusura = false
    // I passi di prima parlano dello stato vecchio.
    this.azzeraStoria()

    // Quel che la lettura ha migrato va fissato su disco: gli id nati nella
    // migrazione (es. dei corsi) cambierebbero a ogni caricamento.
    const migrate = this.collezioniMigrate(grezzo)
    if (migrate.length > 0) {
      for (const collezione of migrate) this.scritturePendenti.add(collezione)
      this.programmaSalvataggio()
    }
    if (formato.passi.length > 0 && this.pacchetto) this.portaAlFormato(formato, copia)

    this.emettitore.fire(this.stato)
    return this.stato
  }

  /**
   * Porta al formato attuale un documento più vecchio: lo riscrive intero, per
   * non lasciarlo a metà fra due formati, e dice dove sta la copia. Senza copia
   * non riscrive niente e lo dice.
   */
  private portaAlFormato (formato: FormatoAggiornato, copia: apparato.Uri | null): void {
    const t = testi()
    const nome = `${this.pacchetto?.nome ?? t.ilDocumento}${ESTENSIONE}`
    if (!copia) {
      this.emettitoreErrori.fire(t.copiaNonFatta(nome, formato.a, formato.da))
      return
    }
    for (const collezione of COLLEZIONI) {
      if (this.illeggibili.has(collezione)) continue
      if (collezione === 'registro' || this.contenutoNonVuoto(collezione)) {
        this.scritturePendenti.add(collezione)
      }
    }
    this.programmaSalvataggio()
    this.emettitoreAvvisi.fire(
      t.portatoAlFormato(nome, raccontaAggiornamento(formato), copia.fsPath),
    )
  }

  /**
   * Copia il documento com'è su disco in `VERSIONI_PRECEDENTI`, col formato nel
   * nome. Se c'è già non si rifà: la prima è quella intatta. Null se non riesce.
   */
  private async copiaPrimaDelFormato (
    file: apparato.Uri,
    versione: number,
  ): Promise<apparato.Uri | null> {
    const nome = nomeDelPacchetto(file)
    const cartella = apparato.Uri.joinPath(file, '..', nome, VERSIONI_PRECEDENTI)
    const copia = apparato.Uri.joinPath(cartella, `${nome}.formato-${versione}${ESTENSIONE}`)
    try {
      if (await esisteFile(copia)) return copia
      await apparato.file.createDirectory(cartella)
      await apparato.file.copy(file, copia, { overwrite: false })
      return copia
    } catch (errore) {
      console.error('Copia prima del formato nuovo non riuscita', errore)
      return null
    }
  }

  /**
   * Le collezioni che la normalizzazione ha cambiato: confronta il JSON letto
   * con quello che si riscriverebbe, senza elencare campi. Le illeggibili no.
   */
  private collezioniMigrate (grezzo: FilePersistito): NomeCollezione[] {
    return COLLEZIONI.filter((collezione) => {
      // L'intestazione non passa da `grezzo` (vedi `leggiIntestazione`).
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
      // Anche l'apertura nel `try`: un blocco col CRC sbagliato vale come JSON rotto.
      const testo = pacchetto.testo(nome)?.trim()
      if (!testo) return null
      // `unknown` e non `any`: obbliga a controllare prima di usare.
      const letto: unknown = JSON.parse(testo)
      return letto && typeof letto === 'object' ? (letto as Record<string, unknown>) : null
    } catch (errore) {
      this.emettitoreErrori.fire(testi().voceNonJson(nome, dove, motivoDi(errore)))
      return null
    }
  }

  /**
   * Una collezione dell'anno aperto, interpretata. Se è illeggibile si segnala,
   * resta vuota, e la voce non si tocca finché non c'è da riscriverla.
   */
  private leggiCollezione (nome: NomeCollezione): unknown {
    try {
      // Anche l'apertura nel `try`: un blocco rovinato vale come JSON rotto.
      const testo = this.pacchetto?.testo(NOMI[nome])?.trim()
      if (!testo) return null
      // `unknown` e non `any`: obbliga a controllare prima di usare.
      const letto: unknown = JSON.parse(testo)
      this.illeggibili.delete(nome)
      return letto
    } catch (errore) {
      this.illeggibili.add(nome)
      this.emettitoreErrori.fire(testi().collezioneNonJson(NOMI[nome], motivoDi(errore)))
      return null
    }
  }

  // ------------------------------------------------------- aprire e chiudere

  /**
   * Apre il documento di un anno e ne prende la serratura. Se è aperto altrove
   * chiede a `seOccupato`; un no torna null. Un documento illeggibile si
   * annuncia e non si apre vuoto, o il salvataggio lo coprirebbe.
   */
  private async prendiPacchetto (
    file: apparato.Uri,
    opzioni?: { giàNostro?: boolean },
  ): Promise<Pacchetto | null> {
    const cartella = nomeDelPacchetto(file)

    // Già nostro (ricarica): non si richiede, o ogni sincronizzazione aprirebbe un dialogo.
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
          : testi().nonSiApre(`${cartella}${ESTENSIONE}`, motivoDi(errore)),
      )
      return null
    }

    // Dati di un registro più recente: la normalizzazione scarterebbe i campi
    // ignoti e `collezioniMigrate` li cancellerebbe subito dal documento.
    const versione = versioneDati(pacchetto)
    if (versione !== null && versione > VERSIONE_DATI) {
      this.emettitoreErrori.fire(fraseVersionePiuRecente({
        file: `${cartella}${ESTENSIONE}`, cosa: 'dati', delFile: versione, quiFinoA: VERSIONE_DATI,
      }))
      return null
    }

    await pacchetto.prendi({ giàPresa: opzioni?.giàNostro })
    return pacchetto
  }

  /**
   * Un altro anno in sola lettura, per portarne qualcosa in quello aperto: niente
   * serratura, niente salvataggio, migrazioni solo in memoria. Rifiuta i dati più
   * recenti e il documento aperto stesso. Gli errori tornano come frase, non da
   * `allErrore`.
   */
  async leggiAltroAnno (file: apparato.Uri): Promise<AltroAnno | { errore: string }> {
    const nome = `${nomeDelPacchetto(file)}${ESTENSIONE}`
    if (this.documento && stessoDocumento(this.documento, file)) {
      return { errore: testi().giaAperto(nome) }
    }
    if (!(await esisteFile(file))) return { errore: testi().sparito(nome) }
    let pacchetto: Pacchetto
    try {
      pacchetto = await Pacchetto.apri(file)
    } catch (errore) {
      return {
        errore: errore instanceof ErrorePacchetto
          ? errore.message
          : testi().nonSiLegge(nome, motivoDi(errore)),
      }
    }
    const versione = versioneDati(pacchetto)
    if (versione !== null && versione > VERSIONE_DATI) {
      return {
        errore: fraseVersionePiuRecente({
          file: nome, cosa: 'dati', delFile: versione, quiFinoA: VERSIONE_DATI,
        }),
      }
    }
    const grezzo = {} as FilePersistito
    for (const collezione of COLLEZIONI) {
      grezzo[collezione] = jsonDi(pacchetto, NOMI[collezione])
    }
    // Gli stessi passi dell'apertura, solo in memoria.
    const aggiornati = aggiornaFormato(grezzo, versione).dati as FilePersistito
    const intestazione = aggiornati.registro
    const testa = intestazione && typeof intestazione === 'object' && !Array.isArray(intestazione)
      ? testaDa(intestazione as Record<string, unknown>, pacchetto.nome)
      : null
    if (!testa) return { errore: testi().senzaAnno(nome) }
    return {
      registro: registroDa(testa, aggiornati),
      bytes: (relativo) => pacchetto.bytes(dentroIlDocumento(relativo)),
    }
  }

  /**
   * Lascia il documento aperto: scrive quel che manca e restituisce la
   * serratura, tranne con `tieniSerratura` (ricarica dello stesso anno).
   */
  private async lasciaPacchetto (opzioni?: { tieniSerratura?: boolean }): Promise<void> {
    const pacchetto = this.pacchetto
    if (!pacchetto) return
    this.pacchetto = null
    try {
      await pacchetto.salva()
    } catch (errore) {
      this.emettitoreErrori.fire(
        testi().nonSiSalva(`${pacchetto.nome}${ESTENSIONE}`, motivoDi(errore)),
      )
    }
    if (!opzioni?.tieniSerratura) await pacchetto.lascia()
  }

  /** Butta le copie materializzate: chiudendo, non cambiando anno (sono per anno). */
  private async smontaDeposito (): Promise<void> {
    await this.deposito.smonta()
  }

  /**
   * Chiude il documento: ultimo salvataggio e serratura lasciata. Se il
   * salvataggio fallisce torna falso e l'anno resta aperto; allo spegnimento
   * (`spegni`) invece si scrive una copia d'emergenza.
   */
  async chiudi (): Promise<boolean> {
    const spegnendo = this.spento
    // Da subito: una modifica arrivata durante l'ultima scrittura andrebbe persa.
    this.inChiusura = true
    const chiuso = await this.inFila(async () => {
      if (!(await this.scriviPrimaDiLasciare())) {
        if (!spegnendo) {
          this.rifiutaDiLasciare()
          return false
        }
        await this.copiaDiEmergenza()
      }
      await this.lasciaPacchetto()
      return true
    })
    if (!chiuso) {
      this.inChiusura = false
      return false
    }
    this.azzeraStoria()
    this.fermaRiprova()
    if (this.timerSalvataggio) clearTimeout(this.timerSalvataggio)
    this.timerSalvataggio = null
    // Una ricarica che scattasse adesso riaprirebbe il documento chiuso.
    if (this.timerRicarica) clearTimeout(this.timerRicarica)
    this.timerRicarica = null
    this.osservatore?.dispose()
    this.osservatore = null
    this.documento = null
    await this.smontaDeposito()
    return true
  }

  /**
   * Spegnimento: la prossima `chiudi` non può rifiutare, e nessun documento si
   * apre più (la sua serratura non la toglierebbe nessuno).
   */
  spegni (): void {
    this.spento = true
  }

  /**
   * Allo spegnimento, se il documento non si scrive: il contenuto in memoria in
   * un `.regi` di emergenza accanto, o in `emergenza/` nei dati del programma.
   */
  private async copiaDiEmergenza (): Promise<void> {
    const pacchetto = this.pacchetto
    if (!pacchetto) return
    // Di solito ci sono già, ma se era fallito proprio questo passo si riprova.
    for (const collezione of this.scritturePendenti) {
      try {
        this.aggiornaVoce(collezione, this.contenutoDi(collezione))
      } catch (errore) {
        console.error(`copia d’emergenza: ${NOMI[collezione]} non entra`, errore)
      }
    }
    // Ora locale, non UTC: il nome lo legge il docente.
    const ora = new Date()
    const due = (n: number) => String(n).padStart(2, '0')
    const marca =
      `${ora.getFullYear()}-${due(ora.getMonth() + 1)}-${due(ora.getDate())} ` +
      `${due(ora.getHours())}.${due(ora.getMinutes())}.${due(ora.getSeconds())}`
    const t = testi()
    const nome = `${t.copiaDiEmergenza(pacchetto.nome, marca)}${ESTENSIONE}`
    const posti = [
      apparato.Uri.joinPath(pacchetto.file, '..'),
      this.cartellaUtente ? apparato.Uri.joinPath(this.cartellaUtente, 'emergenza') : null,
    ]
    for (const cartella of posti) {
      if (!cartella) continue
      const file = apparato.Uri.joinPath(cartella, nome)
      try {
        await apparato.file.createDirectory(cartella)
        const copia = Pacchetto.nuovo(file)
        for (const voce of pacchetto.nomi()) {
          let dati: Uint8Array | null
          try {
            dati = pacchetto.bytes(voce)
          } catch {
            // Un blocco già rotto nel documento: non è una modifica di oggi.
            continue
          }
          if (dati) copia.deposita(voce, dati, { certamenteNuovo: true })
        }
        await copia.salva({ forza: true })
        console.error(`registro: modifiche non salvate in ${pacchetto.nome}${ESTENSIONE}, copia in ${file.fsPath}`)
        this.emettitoreErrori.fire(
          t.modificheInCopia(`${pacchetto.nome}${ESTENSIONE}`, file.fsPath),
        )
        return
      } catch (errore) {
        console.error(`copia d’emergenza non scritta in ${cartella.fsPath}`, errore)
      }
    }
    this.emettitoreErrori.fire(t.modifichePerse(`${pacchetto.nome}${ESTENSIONE}`))
  }

  /** Scrive il documento aperto, se c'è qualcosa da scrivere (`Pacchetto.salva`). */
  private async scriviPacchetto (): Promise<void> {
    if (!this.pacchetto) return
    const file = percorsoPacchetto()
    if (file) this.ultimeScritture.set(file.toString(), Date.now())
    await this.pacchetto.salva()
    if (file) this.ultimeScritture.set(file.toString(), Date.now())
    this.salvataggiFalliti = 0
    this.fermaRiprova()
    // Il timbro qui, dove passano tutte le strade di salvataggio.
    this.ultimoSalvataggio = Date.now()
  }

  // ---------------------------------------------------------------- gli anni

  /**
   * Crea un anno nuovo in `file`, con la cartella gemella accanto, e lo apre.
   * Materie e impostazioni si copiano (non si condividono) dall'anno in uso:
   * ogni anno resta leggibile con le sue regole.
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
      // Cartella e gemella prima del documento: sono le due metà di un anno.
      await apparato.file.createDirectory(apparato.Uri.joinPath(file, '..'))
      await apparato.file.createDirectory(
        apparato.Uri.joinPath(file, '..', cartella),
      )

      // Si scrive prima di aprirlo: `apri` non crea niente.
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
        testi().annoNonCreato(anno.etichetta, motivoDi(errore)),
      )
      return null
    }

    await this.apri(file)
    // Se `apri` ha rifiutato (vecchio non scritto), l'anno in uso è ancora l'altro.
    return this.documento?.toString() === file.toString() ? this.annoCorrente : null
  }

  /**
   * «Salva con nome»: chiude, poi copia (non sposta) documento e gemella accanto
   * a `file`, la gemella col nome nuovo. Se la copia fallisce l'anno si riapre
   * dov'era; l'originale lo butta chi chiama, se vuole.
   */
  async salvaCome (file: apparato.Uri): Promise<boolean> {
    const vecchio = this.documento
    if (!vecchio) return false
    if (vecchio.toString() === file.toString()) {
      await this.salva()
      return true
    }
    // Non scritto: la copia perderebbe le modifiche, l'anno resta aperto.
    if (!(await this.chiudi())) return false
    try {
      const dove = apparato.Uri.joinPath(file, '..')
      await apparato.file.createDirectory(dove)
      await apparato.file.copy(vecchio, file, { overwrite: true })
      const gemellaVecchia = apparato.Uri.joinPath(vecchio, '..', nomeDelPacchetto(vecchio))
      const gemellaNuova = apparato.Uri.joinPath(dove, nomeDelPacchetto(file))
      if (await esisteFile(gemellaVecchia)) {
        await apparato.file.copy(gemellaVecchia, gemellaNuova, { overwrite: true })
      } else {
        await apparato.file.createDirectory(gemellaNuova)
      }
    } catch (errore) {
      this.emettitoreErrori.fire(
        testi().nonSalvatoIn(file.fsPath, motivoDi(errore)),
      )
      await this.apri(vecchio)
      return false
    }
    await this.apri(file)
    return this.documento?.toString() === file.toString() && (await this.esiste())
  }

  // ---------------------------------------------------------------- scrittura

  /**
   * Applica una modifica allo stato vivo, in posto, e programma il salvataggio
   * delle collezioni dichiarate.
   */
  modifica (
    operazione: (registro: Registro) => void,
    collezioni: NomeCollezione[] = COLLEZIONI,
  ): Registro {
    this.vietaSeInChiusura()
    // La copia di prima va presa prima di toccare lo stato.
    this.storia.ricordaPrima(collezioni)
    operazione(this.stato)
    this.storia.cambiate(collezioni)
    this.modifiche += 1
    this.stato.versione = VERSIONE_DATI
    for (const collezione of collezioni) this.scritturePendenti.add(collezione)
    this.programmaSalvataggio()
    this.emettitore.fire(this.stato)
    return this.stato
  }

  // ---------------------------------------------------------------- annulla e ripristina

  /**
   * Esegue un gesto come un passo solo della storia. Due gesti vicini con la
   * stessa `chiave` (le battute di un consuntivo) si fondono.
   */
  inUnPasso<T> (lavoro: () => Promise<T>, chiave?: string): Promise<T> {
    return this.storia.inUnPasso(lavoro, chiave)
  }

  /**
   * Si segna com'erano le collezioni prima di cambiarle. `modifica` lo fa da sé;
   * serve a chi cambia lo stato vivo prima di chiamarla (il contesto delle azioni).
   */
  ricordaPrima (collezioni: readonly NomeCollezione[]): void {
    this.storia.ricordaPrima(collezioni)
  }

  /** Il gesto in corso toglie file e non si potrà annullare (`Storia.segnaIrreversibile`). */
  segnaIrreversibile (): void {
    this.storia.segnaIrreversibile()
  }

  /** Esegue `lavoro` fuori dal gesto in corso, per i lavori che gli sopravvivono. */
  fuoriDalPasso<T> (lavoro: () => T): T {
    return this.storia.fuoriDalPasso(lavoro)
  }

  /** Quanti passi si possono annullare e quanti ripristinare. */
  get contiStoria (): { annulla: number; ripristina: number } {
    return this.storia.conti
  }

  /**
   * Solleva se il documento si sta chiudendo. Pubblico per il contesto delle
   * azioni, che cambia lo stato prima di chiamare `modifica`.
   */
  vietaSeInChiusura (): void {
    if (this.inChiusura) {
      throw new Error(testi().inChiusura)
    }
  }

  /** Annulla l'ultimo gesto. */
  annulla (): EsitoStoria<NomeCollezione> {
    this.vietaSeInChiusura()
    return this.dopoLaStoria(this.storia.annulla((copie) => this.rimettiCopie(copie)))
  }

  /** Rifà l'ultimo gesto annullato. */
  ripristina (): EsitoStoria<NomeCollezione> {
    this.vietaSeInChiusura()
    return this.dopoLaStoria(this.storia.ripristina((copie) => this.rimettiCopie(copie)))
  }

  /** Un rifiuto che ha svuotato la storia va detto a chi disegna i pulsanti. */
  private dopoLaStoria (esito: EsitoStoria<NomeCollezione>): EsitoStoria<NomeCollezione> {
    if (!esito.ok) this.emettitoreStoria.fire()
    return esito
  }

  private azzeraStoria (): void {
    this.storia.azzera()
    this.emettitoreStoria.fire()
  }

  /**
   * Il testo di una collezione per la storia. Per `'registro'`: materie,
   * impostazioni e anni (i gesti sul calendario li cambiano); la cartella di un
   * anno la riprende `rimettiCopie` dal documento.
   */
  private testoPerLaStoria (collezione: NomeCollezione): string {
    if (collezione === 'registro') {
      return JSON.stringify({
        materie: this.stato.materie,
        impostazioni: this.stato.impostazioni,
        anni: this.stato.anni,
        annoCorrenteId: this.stato.annoCorrenteId,
      })
    }
    return JSON.stringify(this.contenutoDi(collezione))
  }

  /**
   * Rimette nello stato le copie di un passo e le fa scrivere. Non passa da
   * `modifica`: le versioni le rimette la storia, e un annulla non va in pila.
   * Niente normalizzazione: le copie vengono da uno stato già normalizzato.
   */
  private rimettiCopie (copie: Map<NomeCollezione, string>): void {
    for (const [collezione, testo] of copie) {
      const valore: unknown = JSON.parse(testo)
      if (collezione === 'registro') {
        const { materie, impostazioni, anni, annoCorrenteId } =
          valore as Pick<Registro, 'materie' | 'impostazioni' | 'anni' | 'annoCorrenteId'>
        this.stato.materie = materie
        this.stato.impostazioni = impostazioni
        // La cartella resta quella di adesso; un anno che torna tiene la sua.
        const cartelle = new Map(this.stato.anni.map((a) => [a.id, a.cartella]))
        this.stato.anni = anni.map((anno) => {
          if (!cartelle.has(anno.id)) return anno
          const { cartella: _vecchia, ...resto } = anno
          const cartella = cartelle.get(anno.id)
          return cartella === undefined ? resto : { ...resto, cartella }
        })
        this.stato.annoCorrenteId = annoCorrenteId
      } else {
        ;(this.stato as unknown as Record<string, unknown>)[collezione] = valore
      }
      this.scritturePendenti.add(collezione)
    }
    this.modifiche += 1
    this.programmaSalvataggio()
    this.emettitore.fire(this.stato)
  }

  /** Programma la scrittura poco dopo l'ultima modifica, ed entro il tetto dalla prima. */
  private programmaSalvataggio (): void {
    const adesso = Date.now()
    if (this.primaModificaNonSalvata === 0) this.primaModificaNonSalvata = adesso

    const restante = ATTESA_MASSIMA_MS - (adesso - this.primaModificaNonSalvata)
    const fra = Math.max(0, Math.min(RITARDO_SALVATAGGIO_MS, restante))

    if (this.timerSalvataggio) clearTimeout(this.timerSalvataggio)
    this.timerSalvataggio = setTimeout(() => {
      this.timerSalvataggio = null
      // Nessuno lo aspetta: senza `catch` sarebbe una rejection non gestita.
      this.salva().catch((errore: unknown) => {
        console.error('salvataggio differito del registro', errore)
      })
    }, fra)
  }

  /** Scrive subito quel che è in attesa: collezioni toccate e file depositati. */
  salva (): Promise<void> {
    if (this.scritturePendenti.size === 0 && !this.pacchetto?.sporco) return Promise.resolve()
    return this.inFila(() => this.scriviPendenti())
  }

  private async scriviPendenti (): Promise<void> {
    this.primaModificaNonSalvata = 0
    // Senza anno aperto il pendente resta in attesa.
    if (!this.pacchetto) return
    if (this.scritturePendenti.size === 0) {
      // Solo file depositati: si scrive lo stesso.
      if (!this.pacchetto.sporco) return
      try {
        await this.scriviPacchetto()
      } catch (errore) {
        // Avviso e riprova come per le collezioni, e l'errore sale a chi aspetta.
        this.salvataggioFallito(errore)
        throw errore
      }
      return
    }

    const daScrivere = [...this.scritturePendenti]
    // Contenuto fissato ed estratto dalla coda prima di ogni attesa: così una
    // modifica arrivata durante la scrittura la rimette in coda. Fallendo, rientra.
    const contenuti = new Map<NomeCollezione, unknown>()
    for (const collezione of daScrivere) {
      contenuti.set(collezione, this.contenutoDi(collezione))
      this.scritturePendenti.delete(collezione)
    }

    try {
      // Tutte le voci in memoria, poi una scrittura sola. Nel `try` perché le
      // collezioni sono già fuori dalla coda e un errore deve rimettercele.
      for (const collezione of daScrivere) {
        this.aggiornaVoce(collezione, contenuti.get(collezione))
      }
      await this.scriviPacchetto()
    } catch (errore) {
      // Sola lettura, EPERM di OneDrive: quel che non si è scritto torna in attesa.
      for (const collezione of daScrivere) this.scritturePendenti.add(collezione)
      this.salvataggioFallito(errore)
    }
  }

  /**
   * Annuncia un salvataggio fallito e ne programma un altro, con attesa che
   * raddoppia. Il timer non tiene vivo il processo; `chiudi` lo toglie.
   */
  private salvataggioFallito (errore: unknown): void {
    this.emettitoreErrori.fire(
      testi().salvataggioFallito(motivoDi(errore)),
    )
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
      case 'check':
        return this.stato.check
      case 'smistamenti':
        return this.stato.smistamenti
      case 'coordinate':
        return this.stato.coordinate
    }
  }

  /**
   * Rimette una collezione nel documento aperto (solo in memoria), con la copia
   * di prima in `.storico/`. Il testo lo fa `testoCollezione`.
   */
  private aggiornaVoce (collezione: NomeCollezione, contenuto: unknown): void {
    const pacchetto = this.pacchetto
    if (!pacchetto) return
    const nome = NOMI[collezione]
    const testo = testoCollezione(contenuto)
    if (this.ultimiTesti.get(collezione) === testo) return

    if (this.illeggibili.has(collezione)) this.mettiDaParte(collezione)
    // La copia di prima, potata a gradini (vedi `Pacchetto.conserva`).
    pacchetto.conserva(nome, COPIE_STORICO, { aGradini: true })
    pacchetto.scrivi(nome, testo)
    this.ultimiTesti.set(collezione, testo)
  }

  /**
   * Una voce illeggibile si mette da parte con un altro nome, non si copre;
   * il registro riparte da una collezione nuova.
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
      // Il blocco non si apre: lo si sposta intero sotto l'altro nome.
      if (!pacchetto.rinomina(nome, altrove)) return
      this.emettitoreErrori.fire(testi().messaDaParte(nome, altrove))
      return
    }
    if (rotta === null) return
    pacchetto.scrivi(altrove, rotta)
    this.emettitoreErrori.fire(testi().messaDaParte(nome, altrove))
  }

  // ---------------------------------------------------------------- osservazione

  /**
   * Osserva il documento aperto e ricarica le modifiche da fuori (cartella
   * sincronizzata), ignorando l'eco delle proprie scritture. Va richiamata a
   * ogni cambio di documento: chiude da sé l'osservatore vecchio.
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
      // Una raffica di eventi vale una ricarica sola.
      if (this.timerRicarica) clearTimeout(this.timerRicarica)
      this.timerRicarica = setTimeout(() => {
        this.timerRicarica = null
        // Un `.regi` sincronizzato a metà solleva: la ricarica va
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
    // Chiusura di emergenza: almeno salva e lascia libera la serratura.
    this.spento = true
    this.chiudi().catch((errore: unknown) => {
      console.error('chiusura del registro in emergenza', errore)
    })
    this.osservatore?.dispose()
    this.emettitore.dispose()
    this.emettitoreErrori.dispose()
    this.emettitoreStoria.dispose()
  }
}

/**
 * Il registro di un anno da intestazione e collezioni grezze. Unica per l'anno
 * aperto e per `leggiAltroAnno`, così non divergono.
 */
function registroDa (testa: TestaAnno | null, grezzo: FilePersistito): Registro {
  const registro = normalizzaRegistro({
    versione: VERSIONE_DATI,
    anni: testa ? [testa.anno] : [],
    annoCorrenteId: testa?.anno.id ?? null,
    materie: testa?.materie ?? [],
    impostazioni: testa?.impostazioni,
    classi: grezzo.classi ?? [],
    corsi: grezzo.corsi ?? [],
    lezioni: grezzo.lezioni ?? [],
    piani: grezzo.piani ?? [],
    valutazioni: grezzo.valutazioni ?? [],
    fascicoli: grezzo.fascicoli ?? [],
    consegne: grezzo.consegne ?? [],
    check: grezzo.check ?? [],
    smistamenti: grezzo.smistamenti ?? [],
    coordinate: grezzo.coordinate ?? [],
  })
  // La cartella è il nome del documento, non sta scritta dentro: si riattacca qui.
  registro.anni = testa ? [{ ...testa.anno, cartella: testa.cartella }] : []
  registro.annoCorrenteId = testa?.anno.id ?? null
  return registro
}

/** Una voce di un documento letto soltanto, come JSON; null se manca o non si legge, senza avvisi. */
function jsonDi (pacchetto: Pacchetto, nome: string): Record<string, unknown> | unknown[] | null {
  try {
    const testo = pacchetto.testo(nome)?.trim()
    if (!testo) return null
    const letto: unknown = JSON.parse(testo)
    return letto && typeof letto === 'object' ? (letto as Record<string, unknown> | unknown[]) : null
  } catch {
    return null
  }
}

/** Vero se due indirizzi sono lo stesso file; su Windows senza badare alle maiuscole. */
function stessoDocumento (uno: apparato.Uri, altro: apparato.Uri): boolean {
  const normale = (uri: apparato.Uri) =>
    process.platform === 'win32' ? uri.fsPath.toLowerCase() : uri.fsPath
  return normale(uno) === normale(altro)
}

/** Quel che un errore dice di sé, per metterlo in coda a una frase. */
function motivoDi (errore: unknown): string {
  return errore instanceof Error ? errore.message : String(errore)
}

/** La versione dei dati dichiarata nell'intestazione, o null (l'errore di lettura lo dà `leggiVoce`). */
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
 * L'intestazione di un anno dal suo file, passata dalla normalizzazione
 * completa. Accetta anche `anni` al plurale, che la migrazione legge da qui.
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
