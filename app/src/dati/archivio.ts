// L'unico punto in cui il registro tocca il disco.
//
// Tiene lo stato completo in memoria — sono pochi megabyte anche per un anno
// intero — e lo riversa su file dopo ogni modifica, con un ritardo breve: chi
// scrive un consuntivo produce una modifica per tasto premuto, e salvare a ogni
// tasto su una cartella sincronizzata è un modo sicuro di far litigare OneDrive
// con se stesso.
//
// In memoria c'è un anno solo: quello in uso. Gli altri restano nelle loro
// cartelle e se ne legge la sola intestazione — etichetta, semestri,
// sospensioni — che serve a elencarli e a poterci passare sopra. È il motivo
// per cui l'anno è una cartella: «l'anno scorso» si apre, non si filtra, e un
// registro di dieci anni pesa quanto uno di uno.
//
// Scrittura in due tempi (file temporaneo e poi rinomina) perché un salvataggio
// interrotto a metà lasci l'ultimo file buono al suo posto invece di un JSON
// troncato. E prima della rinomina una copia del file che c'era finisce in
// `.storico/`: un registro sta in una cartella sincronizzata, e «com'era ieri»
// è la domanda che ci si fa quando due macchine hanno scritto insieme.
//
// Letture e scritture passano da una coda sola: una ricarica arrivata dal
// watcher mentre un salvataggio è in attesa non deve buttare via la modifica
// che stava per essere scritta.

import * as vscode from 'vscode'

import { annoAllineato } from '../dominio/anni.js'
import { registroVuoto } from '../dominio/fabbriche.js'
import type { AnnoScolastico, Impostazioni, Materia, Registro } from '../dominio/modelli.js'
import { VERSIONE_DATI } from '../dominio/modelli.js'
import { nomeSicuro } from '../dominio/testo.js'
import { normalizzaRegistro } from '../dominio/validazione.js'
import {
  DATI,
  INDICE,
  NOMI,
  type NomeCollezione,
  cartellaAnnoDi,
  cartellaCollezioni,
  cartellaCollezioniDi,
  cartellaDati,
  esisteFile,
  impostaAnnoInUso,
  percorso,
  percorsoIn,
  percorsoIndice,
  sottocartelleDi,
} from './percorsi.js'

const RITARDO_SALVATAGGIO_MS = 400

/** Quanto si aspetta prima di ricaricare: il watcher annuncia lo stesso file più volte. */
const RITARDO_RICARICA_MS = 300

/** Quanto un file appena scritto da noi resta "nostro" agli occhi del watcher. */
const FINESTRA_ECO_MS = 1500

/** La cartella delle copie precedenti, e quante se ne tengono per file. */
const STORICO = '.storico'
const COPIE_STORICO = 10

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

export class Archivio implements vscode.Disposable {
  private stato: Registro = registroVuoto()
  private caricato = false
  private timerSalvataggio: NodeJS.Timeout | null = null
  private timerRicarica: NodeJS.Timeout | null = null
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
  private osservatore: vscode.FileSystemWatcher | null = null
  /** Letture e scritture in fila: mai due insieme sugli stessi file. */
  private coda: Promise<unknown> = Promise.resolve()

  /** Le intestazioni degli anni non in uso, per cartella: si riscrivono dov'erano. */
  private teste = new Map<string, TestaAnno>()

  private modifiche = 0

  private readonly emettitore = new vscode.EventEmitter<Registro>()
  /** Scatta a ogni cambiamento dello stato, da qualunque parte arrivi. */
  readonly alCambiamento = this.emettitore.event

  private readonly emettitoreErrori = new vscode.EventEmitter<string>()
  readonly allErrore = this.emettitoreErrori.event

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

  /** L'anno in uso, o null se non ce n'è ancora nessuno. */
  get annoCorrente (): AnnoScolastico | null {
    return this.stato.anni.find((a) => a.id === this.stato.annoCorrenteId) ?? null
  }

  /** La cartella dell'anno in uso: '2026-2027'. */
  get cartellaCorrente (): string | null {
    return this.annoCorrente?.cartella ?? null
  }

  /**
   * Vero se in questa cartella il registro è già stato usato: c'è l'indice, o
   * c'è almeno un anno. Distingue un registro avviato da uno mai aperto.
   */
  async esiste (): Promise<boolean> {
    const indice = percorsoIndice()
    if (indice && (await esisteFile(indice))) return true
    const radice = cartellaDati()
    if (!radice) return false
    for (const nome of await sottocartelleDi(radice)) {
      const suo = percorsoIn(nome, 'registro')
      if (suo && (await esisteFile(suo))) return true
    }
    return false
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
   */
  carica (): Promise<Registro> {
    return this.inFila(async () => {
      await this.scriviPendenti()
      return this.leggiTutto()
    })
  }

  /**
   * Gli anni che ci sono, letti dalle cartelle.
   *
   * L'elenco sono le cartelle, non una lista scritta da qualche parte: una
   * lista si sarebbe potuta contraddire con quel che c'è davvero sul disco —
   * un anno copiato a mano non sarebbe comparso, uno cancellato sarebbe
   * rimasto — e la cartella è già l'unico posto in cui l'anno esiste.
   */
  private async leggiTeste (): Promise<TestaAnno[]> {
    const radice = cartellaDati()
    if (!radice) return []
    const teste: TestaAnno[] = []
    for (const cartella of await sottocartelleDi(radice)) {
      const file = percorsoIn(cartella, 'registro')
      if (!file) continue
      const grezzo = await this.leggiFile(file, `${cartella}/${DATI}/${INDICE}`)
      if (!grezzo) continue
      const testa = testaDa(grezzo, cartella)
      if (testa) teste.push(testa)
    }
    return teste.sort((a, b) => a.anno.inizio.localeCompare(b.anno.inizio))
  }

  /** Quale cartella d'anno usare: quella scritta nell'indice, o la prima che c'è. */
  private async annoDaAprire (teste: TestaAnno[]): Promise<string | null> {
    const indice = percorsoIndice()
    const grezzo = indice ? await this.leggiFile(indice, INDICE) : null
    const scritto = typeof (grezzo as { annoCorrente?: unknown })?.annoCorrente === 'string'
      ? nomeSicuro((grezzo as { annoCorrente: string }).annoCorrente)
      : ''
    if (scritto && teste.some((t) => t.cartella === scritto)) return scritto
    // Nessun indice, o punta a una cartella che non c'è più: si apre l'ultimo
    // anno cominciato, che è quello a cui si sta lavorando nove volte su dieci.
    return teste.length > 0 ? teste[teste.length - 1].cartella : null
  }

  private async leggiTutto (): Promise<Registro> {
    const teste = await this.leggiTeste()
    const cartella = await this.annoDaAprire(teste)

    this.teste = new Map(teste.map((t) => [t.cartella, t]))
    impostaAnnoInUso(cartella)
    // I file dell'anno in uso valgono solo per lui: quel che era stato letto
    // dall'anno di prima non deve far credere che un file sia già a posto.
    this.ultimiTesti.clear()
    this.illeggibili.clear()

    const corrente = cartella ? this.teste.get(cartella) ?? null : null
    const grezzo = {} as FilePersistito
    for (const collezione of COLLEZIONI) {
      grezzo[collezione] = collezione === 'registro' ? null : await this.leggiJson(collezione)
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
    })
    // L'elenco completo entra dopo la normalizzazione: quella lavora su un anno
    // solo — è quel che c'è caricato — e non deve toccare gli altri.
    this.stato.anni = teste.map((t) => ({ ...t.anno, cartella: t.cartella }))
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

  /** Legge e interpreta un file JSON qualsiasi, segnalando ma non lanciando. */
  private async leggiFile (file: vscode.Uri, nome: string): Promise<Record<string, unknown> | null> {
    let testo = ''
    try {
      testo = new TextDecoder().decode(await vscode.workspace.fs.readFile(file)).trim()
    } catch (errore) {
      if (errore instanceof vscode.FileSystemError && errore.code === 'FileNotFound') return null
      this.emettitoreErrori.fire(
        `Non riesco a leggere ${nome}: ${errore instanceof Error ? errore.message : errore}`,
      )
      return null
    }
    try {
      const letto = testo ? JSON.parse(testo) : null
      return letto && typeof letto === 'object' ? (letto as Record<string, unknown>) : null
    } catch (errore) {
      this.emettitoreErrori.fire(
        `${nome} non è un JSON valido (${errore instanceof Error ? errore.message : errore}): ` +
          'il file resta com’è.',
      )
      return null
    }
  }

  private async leggiJson (nome: NomeCollezione): Promise<unknown> {
    const file = percorso(nome)
    if (!file) return null
    let testo = ''
    try {
      testo = new TextDecoder().decode(await vscode.workspace.fs.readFile(file)).trim()
    } catch (errore) {
      if (errore instanceof vscode.FileSystemError && errore.code === 'FileNotFound') return null
      this.emettitoreErrori.fire(
        `Non riesco a leggere ${NOMI[nome]}: ${errore instanceof Error ? errore.message : errore}`,
      )
      this.illeggibili.add(nome)
      return null
    }
    try {
      const letto = testo ? JSON.parse(testo) : null
      this.illeggibili.delete(nome)
      return letto
    } catch (errore) {
      // Un JSON rotto non deve azzerare il registro in silenzio: si segnala,
      // si lascia vuota quella sola collezione, e il file non si tocca.
      this.illeggibili.add(nome)
      this.emettitoreErrori.fire(
        `${NOMI[nome]} non è un JSON valido (${errore instanceof Error ? errore.message : errore}): ` +
          'il file resta com’è, e alla prima modifica viene messo da parte con un altro nome.',
      )
      return null
    }
  }

  // ---------------------------------------------------------------- gli anni

  /**
   * Apre un altro anno: scrive l'indice e ricarica.
   *
   * Non è un filtro, è un cambio di cartella: le classi, le ore e i documenti
   * che si vedono dopo sono altri file. Per questo si ricarica tutto invece di
   * rimescolare quel che c'è in memoria.
   */
  async usaAnno (annoId: string): Promise<boolean> {
    const anno = this.stato.anni.find((a) => a.id === annoId)
    if (!anno?.cartella) return false
    await this.salva()
    await this.scriviIndice(anno.cartella)
    await this.carica()
    return true
  }

  /**
   * Un anno nuovo: la sua cartella, e dentro il suo `registro.json`.
   *
   * Materie e impostazioni si copiano dall'anno in uso. Sono le stesse quasi
   * sempre — si insegnano le stesse materie con la stessa scala — e ricopiarle
   * a mano ogni settembre sarebbe il primo motivo per non creare l'anno nuovo.
   * Copiate e non condivise: un anno chiuso deve restare leggibile con le
   * regole con cui è stato scritto, anche se intanto la scala è cambiata.
   */
  async creaAnno (anno: AnnoScolastico): Promise<AnnoScolastico | null> {
    const radice = cartellaDati()
    if (!radice) return null

    const cartella = await this.cartellaLibera(anno.etichetta || anno.inizio.slice(0, 4))
    const dati = cartellaCollezioniDi(cartella)
    if (!dati) return null

    const testa: TestaAnno = {
      cartella,
      anno: { ...anno, cartella },
      materie: this.stato.materie.map((m) => ({ ...m })),
      impostazioni: { ...this.stato.impostazioni, scala: { ...this.stato.impostazioni.scala } },
    }
    try {
      await vscode.workspace.fs.createDirectory(dati)
      await this.scriviTesta(testa)
    } catch (errore) {
      this.emettitoreErrori.fire(
        `Non riesco a creare la cartella dell’anno ${anno.etichetta}: ${errore instanceof Error ? errore.message : errore}`,
      )
      return null
    }

    this.teste.set(cartella, testa)
    this.stato.anni = [...this.stato.anni, testa.anno].sort((a, b) =>
      a.inizio.localeCompare(b.inizio),
    )
    // Il primo anno di un registro nuovo è per forza quello in uso: senza, non
    // ci sarebbe nessuna cartella in cui scrivere la prima classe.
    if (!this.stato.annoCorrenteId) {
      this.stato.annoCorrenteId = testa.anno.id
      impostaAnnoInUso(cartella)
      await this.scriviIndice(cartella)
      this.stato.materie = testa.materie
      this.stato.impostazioni = testa.impostazioni
    }
    this.emettitore.fire(this.stato)
    return testa.anno
  }

  /**
   * Riscrive l'intestazione di un anno che non è quello in uso.
   *
   * Si può correggere il calendario dell'anno prossimo — le vacanze escono in
   * primavera — senza doverci passare sopra e perdere di vista quello in corso.
   */
  async salvaAnno (anno: AnnoScolastico): Promise<boolean> {
    const cartella = anno.cartella ?? this.stato.anni.find((a) => a.id === anno.id)?.cartella
    const testa = cartella ? this.teste.get(cartella) : null
    if (!cartella || !testa) return false
    const aggiornata: TestaAnno = { ...testa, anno: { ...anno, cartella } }
    try {
      await this.scriviTesta(aggiornata)
    } catch (errore) {
      this.emettitoreErrori.fire(
        `Salvataggio dell’anno ${anno.etichetta} non riuscito: ${errore instanceof Error ? errore.message : errore}`,
      )
      return false
    }
    this.teste.set(cartella, aggiornata)
    this.stato.anni = this.stato.anni
      .map((a) => (a.id === anno.id ? aggiornata.anno : a))
      .sort((a, b) => a.inizio.localeCompare(b.inizio))
    this.emettitore.fire(this.stato)
    return true
  }

  /**
   * Butta via un anno: la sua cartella intera va nel cestino.
   *
   * Nel cestino e non cancellata sul serio. Un anno sono tre trimestri di ore,
   * di voti e di documenti: se la si è cancellata per sbaglio, e capita, deve
   * esserci un modo di tornare indietro che non sia il backup di ieri.
   */
  async eliminaAnno (annoId: string): Promise<boolean> {
    const anno = this.stato.anni.find((a) => a.id === annoId)
    const cartella = anno?.cartella
    if (!anno || !cartella) return false
    const dove = cartellaAnnoDi(cartella)
    if (!dove) return false

    // Quel che era in attesa si scrive prima, o si riscriverebbe la cartella
    // appena cestinata al primo salvataggio in ritardo.
    await this.salva()
    try {
      await vscode.workspace.fs.delete(dove, { recursive: true, useTrash: true })
    } catch (errore) {
      this.emettitoreErrori.fire(
        `Non riesco a eliminare l’anno ${anno.etichetta}: ${errore instanceof Error ? errore.message : errore}`,
      )
      return false
    }

    this.teste.delete(cartella)
    const restanti = this.stato.anni.filter((a) => a.id !== annoId)
    // Via l'anno in uso, si apre quello che resta: il registro senza un anno
    // aperto non ha una cartella in cui scrivere.
    const prossimo = annoId === this.stato.annoCorrenteId
      ? restanti[restanti.length - 1]?.cartella ?? null
      : this.cartellaCorrente
    await this.scriviIndice(prossimo)
    await this.carica()
    return true
  }

  /** Un nome di cartella libero, ricavato dall'etichetta: '2026/2027' → '2026-2027'. */
  private async cartellaLibera (etichetta: string): Promise<string> {
    const radice = nomeSicuro(etichetta.replace(/[\\/]+/g, '-')) || 'anno'
    const prese = new Set(await sottocartelleDi(cartellaDati()!))
    if (!prese.has(radice)) return radice
    for (let n = 2; n < 100; n += 1) {
      const tentativo = `${radice} (${n})`
      if (!prese.has(tentativo)) return tentativo
    }
    return `${radice} ${Date.now()}`
  }

  /** Scrive in radice quale anno si sta usando. */
  private async scriviIndice (cartella: string | null): Promise<void> {
    const file = percorsoIndice()
    const radice = cartellaDati()
    if (!file || !radice) return
    const testo = `${JSON.stringify({ versione: VERSIONE_DATI, annoCorrente: cartella }, null, 2)}\n`
    try {
      await vscode.workspace.fs.createDirectory(radice)
      this.ultimeScritture.set(file.toString(), Date.now())
      await vscode.workspace.fs.writeFile(file, new TextEncoder().encode(testo))
      this.ultimeScritture.set(file.toString(), Date.now())
    } catch (errore) {
      this.emettitoreErrori.fire(
        `Non riesco a scrivere ${INDICE}: ${errore instanceof Error ? errore.message : errore}`,
      )
    }
  }

  /** Scrive il `registro.json` di un anno: l'anno, le sue materie, le sue impostazioni. */
  private async scriviTesta (testa: TestaAnno): Promise<void> {
    const file = percorsoIn(testa.cartella, 'registro')
    const dati = cartellaCollezioniDi(testa.cartella)
    if (!file || !dati) return
    const { cartella: _cartella, ...anno } = testa.anno
    const testo = `${JSON.stringify(
      { versione: VERSIONE_DATI, anno, materie: testa.materie, impostazioni: testa.impostazioni },
      null,
      2,
    )}\n`
    await vscode.workspace.fs.createDirectory(dati)
    this.ultimeScritture.set(file.toString(), Date.now())
    await vscode.workspace.fs.writeFile(file, new TextEncoder().encode(testo))
    this.ultimeScritture.set(file.toString(), Date.now())
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
    this.emettitore.fire(this.stato)
    return this.stato
  }

  private programmaSalvataggio (): void {
    if (this.timerSalvataggio) clearTimeout(this.timerSalvataggio)
    this.timerSalvataggio = setTimeout(() => {
      this.timerSalvataggio = null
      void this.salva()
    }, RITARDO_SALVATAGGIO_MS)
  }

  /** Scrive subito quel che è in attesa. Da chiamare anche allo spegnimento. */
  salva (): Promise<void> {
    if (this.scritturePendenti.size === 0) return Promise.resolve()
    return this.inFila(() => this.scriviPendenti())
  }

  private async scriviPendenti (): Promise<void> {
    if (this.scritturePendenti.size === 0) return
    const cartella = cartellaCollezioni()
    // Senza un anno aperto non c'è dove scrivere: quel che è in attesa resta in
    // attesa, e il primo anno creato se lo porta dietro.
    if (!cartella) return

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

    for (const collezione of daScrivere) {
      try {
        await vscode.workspace.fs.createDirectory(cartella)
        await this.scriviJson(collezione, contenuti.get(collezione))
      } catch (errore) {
        // Una cartella di sola lettura o un EPERM di OneDrive non devono
        // perdere niente: quel che non si è scritto torna in attesa.
        this.scritturePendenti.add(collezione)
        this.emettitoreErrori.fire(
          `Salvataggio di ${NOMI[collezione]} non riuscito: ${errore instanceof Error ? errore.message : errore}`,
        )
      }
    }
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
    this.teste.set(cartella, {
      cartella,
      anno,
      materie: this.stato.materie,
      impostazioni: this.stato.impostazioni,
    })
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
    }
  }

  private async scriviJson (collezione: NomeCollezione, contenuto: unknown): Promise<void> {
    const destinazione = percorso(collezione)
    if (!destinazione) return
    // Indentato e con l'a capo finale: questi file finiscono sotto Git e capita
    // di leggerli a mano.
    const testo = `${JSON.stringify(contenuto, null, 2)}\n`
    if (this.ultimiTesti.get(collezione) === testo) return
    const temporaneo = destinazione.with({ path: `${destinazione.path}.tmp` })

    if (this.illeggibili.has(collezione)) await this.mettiDaParte(destinazione, collezione)
    await this.conservaCopia(destinazione, collezione)

    this.ultimeScritture.set(destinazione.toString(), Date.now())
    await vscode.workspace.fs.writeFile(temporaneo, new TextEncoder().encode(testo))
    await vscode.workspace.fs.rename(temporaneo, destinazione, { overwrite: true })
    this.ultimeScritture.set(destinazione.toString(), Date.now())
    this.ultimiTesti.set(collezione, testo)
  }

  /** Un file che non si è saputo leggere si sposta con un altro nome, non si copre. */
  private async mettiDaParte (file: vscode.Uri, collezione: NomeCollezione): Promise<void> {
    const marca = new Date().toISOString().replace(/[:.]/g, '-')
    const altrove = file.with({ path: file.path.replace(/\.json$/, `.rotto-${marca}.json`) })
    try {
      await vscode.workspace.fs.rename(file, altrove, { overwrite: false })
      this.emettitoreErrori.fire(
        `${NOMI[collezione]} non si leggeva: la copia è in ${altrove.path.split('/').pop()}, e il registro riparte da un file nuovo.`,
      )
    } catch {
      // Non c'era più: niente da mettere da parte.
    }
    this.illeggibili.delete(collezione)
  }

  /**
   * La copia di com'era il file prima di riscriverlo, in `.storico/`, con le
   * ultime dieci tenute e le altre buttate. Costa una copia per salvataggio,
   * e ripaga la prima volta che si vuole sapere che cosa c'era ieri.
   */
  private async conservaCopia (file: vscode.Uri, collezione: NomeCollezione): Promise<void> {
    const cartella = cartellaCollezioni()
    if (!cartella) return
    const storico = vscode.Uri.joinPath(cartella, STORICO)
    const radice = NOMI[collezione].replace(/\.json$/, '')
    const marca = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
    try {
      await vscode.workspace.fs.createDirectory(storico)
      await vscode.workspace.fs.copy(file, vscode.Uri.joinPath(storico, `${radice}.${marca}.json`), {
        overwrite: true,
      })
    } catch {
      // Il file non c'era ancora: non c'è niente da conservare.
      return
    }
    try {
      const voci = (await vscode.workspace.fs.readDirectory(storico))
        .map(([nome]) => nome)
        .filter((nome) => nome.startsWith(`${radice}.`) && nome.endsWith('.json'))
        .sort()
      for (const vecchia of voci.slice(0, Math.max(0, voci.length - COPIE_STORICO))) {
        await vscode.workspace.fs.delete(vscode.Uri.joinPath(storico, vecchia), { useTrash: false })
      }
    } catch {
      // Lo storico non si è potuto potare: al prossimo giro.
    }
  }

  // ---------------------------------------------------------------- osservazione

  /**
   * Tiene d'occhio la cartella dell'anno in uso: il registro sta in una
   * cartella sincronizzata e lo stesso anno può essere aperto su due macchine.
   * Le modifiche che arrivano da fuori vengono ricaricate; l'eco delle proprie
   * scritture no.
   *
   * Si guarda la cartella dell'anno e non solo i suoi `dati/`: un anno
   * comparso da una sincronizzazione — o l'indice cambiato su un'altra macchina
   * — deve farsi vedere senza dover chiudere e riaprire.
   */
  osserva (): vscode.Disposable {
    const radice = cartellaDati()
    if (!radice) return new vscode.Disposable(() => undefined)

    this.osservatore?.dispose()
    this.osservatore = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(radice, `{${INDICE},*/${DATI}/*.json}`),
    )

    const ricarica = (uri: vscode.Uri) => {
      const quando = this.ultimeScritture.get(uri.toString()) ?? 0
      if (Date.now() - quando < FINESTRA_ECO_MS) return
      // Una raffica di eventi — nove file toccati insieme da una
      // sincronizzazione — vale una ricarica sola.
      if (this.timerRicarica) clearTimeout(this.timerRicarica)
      this.timerRicarica = setTimeout(() => {
        this.timerRicarica = null
        void this.carica()
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
    void this.salva()
    this.osservatore?.dispose()
    this.emettitore.dispose()
    this.emettitoreErrori.dispose()
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
