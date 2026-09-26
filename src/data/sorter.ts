// Lo smistamento dei PDF di classe: un PDF entra in `quarantena/` dentro il
// documento dell'anno e ne escono i documenti dei singoli allievi, spuntati
// nella consegna. La consegna si dice al rilascio o si indovina (nome del file,
// classe nelle pagine); altrimenti il PDF resta intero da sistemare a mano.
// Niente si sovrascrive: l'originale resta finché c'è una pagina non decisa.

import * as apparato from 'apparato'

import {
  etichettaFoglio,
  foglioDi,
  percorsoFoglioAssenze,
  rigaDi,
  scriviFoglioAssenze,
  trovaBloccoAssenze,
} from '../domain/absences.js'
import { nomeCompleto } from '../domain/calculations.js'
import {
  avanzamentoConsegna,
  destinatariConsegna,
  consegneDocumento,
} from '../domain/assignments.js'
import { classeDellaConsegna } from '../domain/courses.js'
import { QUARANTENA } from '../domain/locations.js'
import { istanteNelNome, istanteAdesso } from '../domain/dates.js'
import { creaSmistamento } from '../domain/factories.js'
import { nuovoIdBlocco } from '../domain/identifiers.js'
import type {
  Allievo,
  Classe,
  Consegna,
  Divisione,
  Registro,
  Smistamento,
  TipoRapporto,
} from '../domain/models.js'
import {
  bozzaSmistamento,
  divisioneDi,
  giaConsegnati,
  indiceNomi,
  intervalliDi,
  normalizzaPerRicerca,
  riconosci,
  riquadroDelNome,
} from '../domain/sorting.js'
import { siConsegna } from '../domain/assignments.js'
import { archivia, nomeFileArchivio, percorsoConsegna } from './filing.js'
import type { Archivio } from './archive.js'
import { testi } from './sorter.testi.js'
import { leggiImmagine, ocrAttivo } from './ocr.js'
import {
  QUOTA_TESTATA,
  contaPagine,
  estraiElenco,
  immaginePagina,
  testoConPosizioni,
  type Porzione,
} from './pdf.js'
import { contenutoDi, deposito } from './store.js'
import {
  cartellaInArrivo,
  nomeDelFileUri,
  nomeSicuro,
  vociDi,
} from './paths.js'

export { classeDellaConsegna }

/** Il carattere con cui si separa la classe dalla consegna nel nome di cartella. */
const SEPARATORE = ' — '

/** Il nome della cartella dei PDF di una richiesta, ricavato ogni volta da classe e consegna. */
function nomeCartellaConsegna (classe: Classe, consegna: Consegna): string {
  return nomeSicuro(`${classe.nome}${SEPARATORE}${consegna.testo}`)
}

interface EsitoSmistamento {
  assegnate: number
  inQuarantena: number
  errore?: string
}

/**
 * Una pagina che aspetta l'OCR. La pagina e non il blocco: ogni lettura cambia
 * il raggruppamento, e una coda di blocchi punterebbe a blocchi spariti.
 */
interface LavoroOcr {
  smistamentoId: string
  pagina: number
  /** Come si chiama in interfaccia: «michel.brenna.pdf · pagina 4». */
  etichetta: string
}

/** A che punto è la coda: quel che si sta leggendo e quel che aspetta. */
interface AvanzamentoOcr {
  corrente: LavoroOcr | null
  /** Quante pagine sono già state lette in questa infornata. */
  fatte: number
  /** Quante ne erano in tutto: serve a dire «3 di 12». */
  totale: number
  coda: LavoroOcr[]
}

/** Quanto testo si tiene di ogni pagina: basta a riconoscere e a far capire. */
const ESTRATTO_SALVATO = 400

/** Che cosa è costata una pagina letta: `startup.ts` ne fa una voce di giornale. */
export interface PaginaLetta {
  etichetta: string
  durataMs: number
  ok: boolean
  /** Quante modifiche ha fatto l'archivio leggendola: 0 se non se n'è cavato niente. */
  modifiche: number
}

export class Smistatore implements apparato.Smaltitore {
  private readonly emettitore = new apparato.EventEmitter<string>()
  /** Racconta quel che ha fatto, per la notifica in interfaccia. */
  readonly alTermine = this.emettitore.event

  private coda: LavoroOcr[] = []
  private corrente: LavoroOcr | null = null
  private fatte = 0
  private totale = 0
  private inCorso = false
  private annullata = false
  /**
   * Il giro in corso: allo spegnimento si aspetta, altrimenti una pagina letta
   * arriverebbe ad `archivio.modifica` dopo la chiusura e andrebbe persa.
   */
  private giro: Promise<void> | null = null
  /** Arriva fino a `execFile` dell'OCR: fermata la coda, si ferma anche la pagina in lettura. */
  private annullo = new AbortController()
  private readonly emettitoreCoda = new apparato.EventEmitter<AvanzamentoOcr>()
  /** Scatta a ogni pagina letta e a ogni cambio di coda: lo guarda il pannello. */
  readonly allAvanzamento = this.emettitoreCoda.event
  private readonly emettitorePagina = new apparato.EventEmitter<PaginaLetta>()
  /** Scatta a ogni pagina letta: lo guarda il giornale, da `startup.ts`. */
  readonly allaPaginaLetta = this.emettitorePagina.event

  constructor (private readonly archivio: Archivio) {}

  /** Le richieste di documenti ancora aperte, con la loro classe. */
  private richiesteAperte (): Array<{ classe: Classe, consegna: Consegna }> {
    const registro = this.archivio.registro
    const esito: Array<{ classe: Classe, consegna: Consegna }> = []
    for (const consegna of consegneDocumento(registro, registro.corsi)) {
      const classe = classeDellaConsegna(registro, consegna)
      // Aperta: manca ancora il foglio di qualcuno.
      if (classe && !avanzamentoConsegna(consegna, classe).completa) {
        esito.push({ classe, consegna })
      }
    }
    return esito
  }

  // ---------------------------------------------------------------- l'ingresso

  /**
   * I PDF rimasti in `in-arrivo/` su disco (una macchina non aggiornata può
   * ancora riempirla): si smistano una volta, l'originale va nel cestino.
   */
  assorbiCassettaVecchia (): Promise<void> {
    // Un giro per volta (lo chiamano avvio e cambio di documento): due giri
    // smisterebbero gli stessi PDF due volte.
    this.assorbendo ??= this.assorbiUnaVolta().finally(() => {
      this.assorbendo = null
    })
    return this.assorbendo
  }

  /** Il giro in corso di `assorbiCassettaVecchia`, se ce n'è uno. */
  private assorbendo: Promise<void> | null = null

  private async assorbiUnaVolta (): Promise<void> {
    const radice = cartellaInArrivo()
    if (!radice) return
    for (const uri of await this.pdfSotto(radice)) {
      const nome = nomeDelFileUri(uri, '')
      const t = testi()
      try {
        const esito = await this.smistaFile(uri)
        if (esito.errore) this.emettitore.fire(t.suFile(nome, esito.errore))
        else if (esito.inQuarantena > 0) {
          this.emettitore.fire(
            t.suFile(nome, t.assegnatiEDaSistemare(esito.assegnate, esito.inQuarantena)),
          )
        } else if (esito.assegnate > 0) {
          this.emettitore.fire(t.suFile(nome, t.assegnati(esito.assegnate)))
        }
      } catch (errore) {
        // Si dice, e il file resta per un secondo tentativo.
        this.emettitore.fire(
          t.suFile(nome, errore instanceof Error ? errore.message : String(errore)),
        )
      }
    }
  }

  private async pdfSotto (cartella: apparato.Uri): Promise<apparato.Uri[]> {
    const trovati: apparato.Uri[] = []
    for (const [nome, tipo] of await vociDi(cartella)) {
      const uri = apparato.Uri.joinPath(cartella, nome)
      if (tipo === apparato.GenereFile.Directory) trovati.push(...(await this.pdfSotto(uri)))
      else if (nome.toLowerCase().endsWith('.pdf')) trovati.push(uri)
    }
    return trovati
  }

  /**
   * Un PDF su disco: si legge, si smista, e solo se è entrato nel documento
   * l'originale va nel cestino.
   */
  async smistaFile (
    uri: apparato.Uri,
    consegnaForzata?: string,
    divisione: Divisione = { modo: 'nomi' },
  ): Promise<EsitoSmistamento> {
    let byte: Uint8Array
    try {
      byte = await apparato.file.readFile(uri)
    } catch (errore) {
      return {
        assegnate: 0,
        inQuarantena: 0,
        errore: testi().nonSiLegge((errore as Error).message),
      }
    }
    // La cartella in cui stava dice a quale richiesta appartiene.
    const cartella = uri.path.split('/').slice(-2, -1)[0] ?? ''
    const esito = await this.smista(byte, nomeDelFileUri(uri), consegnaForzata, cartella, divisione)
    if (esito.assegnate > 0 || esito.inQuarantena > 0) await this.viaDalDisco(uri)
    return esito
  }

  // ------------------------------------------------------------- lo smistamento

  /**
   * Posa i byte di un PDF in quarantena e ne prepara la bozza. Non archivia:
   * un nome riconosciuto è un'ipotesi, conferma chi guarda. Le pagine mute vanno
   * in coda all'OCR; i blocchi si ricavano ogni volta dalle letture delle pagine.
   */
  async smista (
    byte: Uint8Array,
    nome: string,
    consegnaForzata?: string,
    cartella = '',
    divisione: Divisione = { modo: 'nomi' },
    classeDiRipiego?: string | null,
  ): Promise<EsitoSmistamento> {
    if (byte.length === 0) {
      return { assegnate: 0, inQuarantena: 0, errore: testi().vuoto }
    }

    let lette: Awaited<ReturnType<typeof testoConPosizioni>>
    let totale: number
    try {
      totale = await contaPagine(byte)
      // Con le posizioni, per mostrare dove sta un nome riconosciuto.
      lette = await testoConPosizioni(byte)
    } catch (errore) {
      // Illeggibile: in quarantena senza blocchi, con la richiesta indovinata
      // così compare nel pannello della sua classe.
      const bersaglio = consegnaForzata
        ? this.consegnaPerId(consegnaForzata)
        : this.indovinaConsegna(cartella, nome, [])
      if (
        !this.inQuarantenaGrezzo(
          byte,
          nome,
          testi().illeggibilePerche((errore as Error).message),
          bersaglio,
          divisione,
          classeDiRipiego,
        )
      ) {
        return { assegnate: 0, inQuarantena: 0, errore: testi().senzaAnno }
      }
      return { assegnate: 0, inQuarantena: 1, errore: testi().illeggibile }
    }

    const scritti = lette.map((pagina) => pagina.testo)
    const bersaglio = consegnaForzata
      ? this.consegnaPerId(consegnaForzata)
      : this.indovinaConsegna(cartella, nome, scritti)

    const quarantena = this.posaInQuarantena(byte, nome)
    if (!quarantena) {
      return { assegnate: 0, inQuarantena: 0, errore: testi().senzaAnno }
    }

    const smistamento = creaSmistamento(
      quarantena,
      nome,
      totale,
      bersaglio?.consegna.id ?? null,
      // Ripiego: la classe della pagina su cui è stato lasciato cadere; senza,
      // una scansione muta non comparirebbe in nessun archivio.
      bersaglio?.classe?.id ?? classeDiRipiego ?? null,
      divisione,
    )
    // Per segnare dove il nome è stato letto. Senza classe nessun riquadro:
    // meglio che uno attorno alla parola sbagliata.
    const classeDelPdf =
      bersaglio?.classe ??
      this.archivio.registro.classi.find((c) => c.id === classeDiRipiego) ??
      null
    const indice = classeDelPdf ? indiceNomi(classeDelPdf.allievi) : null

    smistamento.letture = lette.map((pagina, posizione) => {
      const trovato = indice ? riconosci(pagina.testo, indice).trovato : ''
      return {
        numero: posizione + 1,
        testo: pagina.testo.slice(0, ESTRATTO_SALVATO),
        lettura: pagina.testo.length > 0 ? ('testo' as const) : ('niente' as const),
        riquadroNome: trovato ? riquadroDelNome(pagina.pezzi, trovato) : undefined,
      }
    })

    this.archivio.modifica((r) => {
      r.smistamenti.push(smistamento)
    }, ['smistamenti'])
    ricostruisci(this.archivio, smistamento.id)

    // Le pagine mute in coda all'OCR (costa minuti), solo dividendo per nomi:
    // a passo fisso o a mano il taglio è già deciso.
    const mute = smistamento.letture.filter((l) => l.lettura === 'niente')
    if (mute.length > 0 && divisione.modo === 'nomi' && ocrAttivo()) {
      this.accodaLettura(
        mute.map((l) => ({
          smistamentoId: smistamento.id,
          pagina: l.numero,
          etichetta: testi().pagina(nome, l.numero),
        })),
      )
    }

    const aggiornato = this.archivio.registro.smistamenti.find((x) => x.id === smistamento.id)
    const proposte = (aggiornato?.blocchi ?? []).filter((b) => b.allievoId).length
    return { assegnate: proposte, inQuarantena: (aggiornato?.blocchi ?? []).length - proposte }
  }

  // ----------------------------------------------------------------- i file

  /**
   * Posa i byte in quarantena e torna il percorso. Il prefisso di tempo
   * leggibile (`260914 09.42.03 pagelle.pdf`) tiene distinti e in ordine due PDF
   * con lo stesso nome.
   */
  private posaInQuarantena (byte: Uint8Array, nome: string): string | null {
    const dove = deposito()
    if (!dove) return null
    const base = `${QUARANTENA}/${istanteNelNome()} ${nomeSicuro(nome)}`
    // Il prefisso va al secondo: due file trascinati insieme prendono un numero.
    const punto = base.lastIndexOf('.')
    const [radice, estensione] =
      punto > base.lastIndexOf('/') ? [base.slice(0, punto), base.slice(punto)] : [base, '']
    let relativo = base
    for (let n = 2; dove.esiste(relativo); n += 1) relativo = `${radice} (${n})${estensione}`
    dove.scrivi(relativo, byte, { certamenteNuovo: true })
    return relativo
  }

  /** Un PDF che non si è nemmeno riusciti ad aprire: in quarantena, senza blocchi. */
  private inQuarantenaGrezzo (
    byte: Uint8Array,
    nome: string,
    errore: string,
    bersaglio: { consegna: Consegna, classe: Classe | null } | null,
    divisione: Divisione,
    classeDiRipiego?: string | null,
  ): boolean {
    const relativo = this.posaInQuarantena(byte, nome)
    if (!relativo) return false
    const smistamento = creaSmistamento(
      relativo,
      nome,
      0,
      bersaglio?.consegna.id ?? null,
      bersaglio?.classe?.id ?? classeDiRipiego ?? null,
      divisione,
    )
    smistamento.errore = errore
    this.archivio.modifica((r) => {
      r.smistamenti.push(smistamento)
    }, ['smistamenti'])
    return true
  }

  /** L'originale su disco, nel cestino: dentro il documento c'è già. */
  private async viaDalDisco (uri: apparato.Uri): Promise<void> {
    try {
      await apparato.file.delete(uri, { useTrash: true })
    } catch {
      // Già sparito o in sola lettura: lo smistamento resta riuscito.
    }
  }

  // ------------------------------------------------------- a chi appartiene

  private consegnaPerId (consegnaId: string): { consegna: Consegna, classe: Classe | null } | null {
    const registro = this.archivio.registro
    const consegna = registro.consegne.find((c) => c.id === consegnaId)
    if (!consegna) return null
    return { consegna, classe: classeDellaConsegna(registro, consegna) }
  }

  /**
   * A quale richiesta appartiene un PDF: dalla cartella, dal nome del file, o
   * dalla classe nominata nelle pagine se lì c'è una sola richiesta aperta.
   * Con due candidate non si sceglie: meglio la quarantena.
   */
  private indovinaConsegna (
    cartella: string,
    nome: string,
    pagine: string[],
  ): { consegna: Consegna, classe: Classe } | null {
    const aperte = this.richiesteAperte()
    if (aperte.length === 0) return null

    // La cartella c'è solo per i file di `in-arrivo/`.
    const dove = normalizzaPerRicerca(cartella)
    if (dove) {
      const perCartella = aperte.find(
        ({ classe, consegna }) =>
          normalizzaPerRicerca(nomeCartellaConsegna(classe, consegna)) === dove,
      )
      if (perCartella) return perCartella
    }

    const nomeFile = normalizzaPerRicerca(nome.replace(/\.pdf$/i, ''))
    if (nomeFile) {
      const perNome = aperte.filter(
        ({ classe, consegna }) =>
          nomeFile.includes(normalizzaPerRicerca(classe.nome)) &&
          nomeFile.includes(normalizzaPerRicerca(consegna.testo)),
      )
      if (perNome.length === 1) return perNome[0]
    }

    const testo = normalizzaPerRicerca(pagine.join(' '))
    if (testo) {
      const classiNominate = [
        ...new Set(
          aperte
            .filter(({ classe }) => {
              const sigla = normalizzaPerRicerca(classe.nome)
              return sigla.length >= 3 && testo.includes(sigla)
            })
            .map(({ classe }) => classe.id),
        ),
      ]
      if (classiNominate.length === 1) {
        const sue = aperte.filter(({ classe }) => classe.id === classiNominate[0])
        if (sue.length === 1) return sue[0]
      }
    }

    return null
  }

  // ------------------------------------------------------ la coda di lettura

  /**
   * Mette in coda la lettura di una o più pagine. Una coda perché l'OCR costa
   * decine di secondi a pagina: il gesto torna subito, le pagine si leggono una
   * alla volta (in parallelo sarebbero più lente) e l'avanzamento si vede.
   */
  accodaLettura (lavori: LavoroOcr[]): void {
    const chiave = (l: LavoroOcr) => `${l.smistamentoId}:${l.pagina}`
    const gia = new Set([
      ...this.coda.map(chiave),
      ...(this.corrente ? [chiave(this.corrente)] : []),
    ])
    let aggiunte = 0
    for (const lavoro of lavori) {
      if (gia.has(chiave(lavoro))) continue
      this.coda.push(lavoro)
      aggiunte += 1
    }
    if (aggiunte === 0) return
    this.totale += aggiunte
    // Riaccodare dopo aver fermato fa ripartire, con un segnale nuovo: uno già
    // tirato non si rilassa.
    this.annullata = false
    if (this.annullo.signal.aborted) this.annullo = new AbortController()
    this.annunciaCoda()
    // Fuori dal passo che ha accodato: la coda dura minuti, e le sue scritture
    // a nome di un passo chiuso farebbero rifiutare il primo Ctrl+Z.
    this.giro = this.archivio.fuoriDalPasso(() => this.smaltisciCoda()).catch((errore: unknown) => {
      console.error('smaltimento della coda di smistamento', errore)
    })
  }

  /** Svuota la coda; la pagina in lettura finisce. */
  fermaLettura (): void {
    this.coda = []
    this.annullata = true
    this.annunciaCoda()
  }

  /**
   * Per `spegni()`: interrompe anche l'OCR in corso e aspetta la fine del giro
   * (fotografia e bozza). Non rifiuta mai.
   */
  async fermaEAspetta (): Promise<void> {
    this.coda = []
    this.annullata = true
    this.annullo.abort()
    await (this.giro ?? Promise.resolve()).catch(() => undefined)
  }

  get avanzamento (): AvanzamentoOcr {
    return {
      corrente: this.corrente,
      fatte: this.fatte,
      totale: this.totale,
      coda: [...this.coda],
    }
  }

  private annunciaCoda (): void {
    this.emettitoreCoda.fire(this.avanzamento)
  }

  /** Legge una pagina alla volta, finché la coda non è vuota. */
  private async smaltisciCoda (): Promise<void> {
    if (this.inCorso) return
    this.inCorso = true
    this.annullata = false

    try {
      while (this.coda.length > 0) {
        // OCR spento nel frattempo: si smette, invece di un avviso falso per
        // pagina. «Rileggi le scansioni» le riprende.
        if (!ocrAttivo()) {
          this.coda = []
          break
        }
        const lavoro = this.coda.shift() as LavoroOcr
        this.corrente = lavoro
        this.annunciaCoda()

        const partenza = Date.now()
        const prima = this.archivio.revisione
        const guaio = await this.leggiPagina(lavoro)
        if (guaio) this.emettitore.fire(guaio)
        this.fatte += 1

        // Scrive nel registro senza passare da `chiama()` (dura minuti), quindi
        // si annuncia al giornale. Con un evento: il giornale sta in `api/`, e
        // lo scrive `startup.ts` (vedi `annota` in `api/core.ts`, `npm run layers`).
        this.emettitorePagina.fire({
          etichetta: lavoro.etichetta,
          durataMs: Date.now() - partenza,
          ok: guaio === null,
          modifiche: this.archivio.revisione - prima,
        })

        // A ogni pagina: i blocchi si vedono formarsi durante la lettura.
        ricostruisci(this.archivio, lavoro.smistamentoId)
        if (this.annullata) break
      }
    } finally {
      this.corrente = null
      this.inCorso = false
      const fermata = this.annullata
      this.annullata = false
      if (this.coda.length === 0) {
        this.fatte = 0
        this.totale = 0
      }
      this.annunciaCoda()
      // Riempita nel frattempo: riparte, e `giro` passa al giro nuovo perché
      // `fermaEAspetta` lo aspetti. Non si azzera mai: una promessa risolta non costa.
      if (!fermata && this.coda.length > 0) {
        const ripresa = this.archivio.fuoriDalPasso(() => this.smaltisciCoda())
        this.giro = ripresa.catch((errore: unknown) => {
          console.error('ripresa della coda di smistamento', errore)
        })
      }
    }
  }

  /** Legge una pagina con l'OCR e ne salva la lettura e l'anteprima. */
  private async leggiPagina (lavoro: LavoroOcr): Promise<string | null> {
    const registro = this.archivio.registro
    const smistamento = registro.smistamenti.find((s) => s.id === lavoro.smistamentoId)
    if (!smistamento) return null

    const { consegna, classe } = contestoSmistamento(registro, smistamento)
    void consegna

    const byte = await bytePdf(smistamento)
    if (!byte) return testi().nonPiuQui(smistamento.nome)

    const anteprima = await scriviAnteprima(byte, smistamento, lavoro.pagina)
    const letto = await ocrDellaPagina(byte, lavoro.pagina, classe, this.annullo.signal)

    // Fermata: non si scrive, allo spegnimento il pacchetto va già su disco.
    if (this.annullo.signal.aborted) return null

    this.archivio.modifica((r) => {
      const suo = r.smistamenti.find((s) => s.id === smistamento.id)
      const pagina = suo?.letture.find((l) => l.numero === lavoro.pagina)
      if (!pagina) return
      if (anteprima) pagina.anteprima = anteprima
      if (letto.testo) {
        pagina.testo = letto.testo.slice(0, ESTRATTO_SALVATO)
        pagina.lettura = 'ocr'
        // L'OCR non dà posizioni: il riquadro è la striscia letta (testata o intera).
        pagina.riquadroNome = nominaQualcuno(letto.testo, classe)
          ? strisciaLetta(letto.porzione)
          : undefined
      }
    }, ['smistamenti'])

    return letto.testo ? null : testi().nienteDiLeggibile(lavoro.etichetta)
  }

  dispose (): void {
    this.coda = []
    this.annullata = true
    // Non aspetta (quello è `fermaEAspetta`), ma ferma l'OCR esterno in corso.
    this.annullo.abort()
    this.emettitore.dispose()
    this.emettitoreCoda.dispose()
    this.emettitorePagina.dispose()
  }
}

/** L'unico smistatore della finestra: la coda di lettura dev'essere una sola. */
let condiviso: { archivio: Archivio, smistatore: Smistatore } | null = null

export function smistatoreDi (archivio: Archivio): Smistatore {
  if (!condiviso || condiviso.archivio !== archivio) {
    condiviso = { archivio, smistatore: new Smistatore(archivio) }
  }
  return condiviso.smistatore
}

/**
 * L'anteprima di una pagina, salvata in quarantena: il pannello (in sandbox)
 * carica le immagini per indirizzo. Sparisce con il suo smistamento.
 */
async function scriviAnteprima (
  byte: Uint8Array,
  smistamento: Smistamento,
  pagina: number,
): Promise<string | null> {
  const dove = deposito()
  if (!dove) return null
  let immagine: Uint8Array | null = null
  try {
    immagine = await immaginePagina(byte, pagina, 'intera', 900)
  } catch {
    return null
  }
  if (!immagine) return null

  // Il protocollo la materializza quando il pannello la chiede.
  const relativo = `quarantena/anteprime/${smistamento.id}-p${pagina}.png`
  dove.scrivi(relativo, immagine, { certamenteNuovo: true })
  return relativo
}

/** Le anteprime di uno smistamento se ne vanno con lui. */
export async function togliAnteprime (smistamento: Smistamento): Promise<void> {
  const dove = deposito()
  if (!dove) return
  for (const voce of dove.fileIn('quarantena/anteprime')) {
    if (!(voce.split('/').pop() ?? '').startsWith(`${smistamento.id}-`)) continue
    try {
      dove.elimina(voce)
    } catch {
      // Un'anteprima rimasta non fa danni.
    }
  }
}

/**
 * Una pagina all'OCR: prima la testata (costa la metà, e il nome di solito è
 * lì), la pagina intera solo se in testa non compare nessuno della classe.
 */
async function ocrDellaPagina (
  byte: Uint8Array,
  numero: number,
  classe: Classe | null,
  segnale?: AbortSignal,
): Promise<{ testo: string, porzione: Porzione }> {
  for (const porzione of ['testata', 'intera'] as const) {
    let immagine: Uint8Array | null = null
    try {
      immagine = await immaginePagina(byte, numero, porzione)
    } catch {
      return { testo: '', porzione }
    }
    if (!immagine) return { testo: '', porzione }
    // Il segnale arriva fino a `execFile`: fermata la coda, l'OCR si interrompe.
    const testo = await leggiImmagine(immagine, segnale)
    if (porzione === 'intera') return { testo, porzione }
    if (testo && nominaQualcuno(testo, classe)) return { testo, porzione }
  }
  return { testo: '', porzione: 'intera' }
}

/** La striscia di pagina che l'OCR ha guardato, come riquadro. */
function strisciaLetta (
  porzione: Porzione,
): { x: number, y: number, larghezza: number, altezza: number } {
  return porzione === 'testata'
    ? { x: 0, y: 0, larghezza: 1, altezza: QUOTA_TESTATA }
    : { x: 0, y: 0, larghezza: 1, altezza: 1 }
}

/** Vero se in quel testo compare qualcuno della classe: basta a fermare l'OCR. */
function nominaQualcuno (testo: string, classe: Classe | null): boolean {
  if (!classe) return false
  const pagina = normalizzaPerRicerca(testo)
  return classe.allievi.some((allievo) => {
    const cognome = normalizzaPerRicerca(allievo.cognome)
    return cognome.length > 2 && pagina.includes(cognome)
  })
}

/**
 * La consegna e la classe di uno smistamento: la classe della consegna se ne
 * ha una, altrimenti quella che il PDF nominava da solo.
 */
function contestoSmistamento (
  registro: Registro,
  smistamento: Smistamento,
): { consegna: Consegna | null, classe: Classe | null } {
  const consegna = registro.consegne.find((c) => c.id === smistamento.consegnaId) ?? null
  const classe = consegna
    ? classeDellaConsegna(registro, consegna)
    : registro.classi.find((c) => c.id === smistamento.classeId) ?? null
  return { consegna, classe }
}

/**
 * Archivia il documento di un allievo («DIC4a_Pagella 3° anno_Rossi Mario.pdf»)
 * e torna il percorso da mettere nella consegna. Due omonimi non si coprono.
 */
async function scriviDocumento (
  classe: Classe,
  consegna: Consegna,
  allievo: Allievo,
  byte: Uint8Array,
): Promise<string | null> {
  const esito = await archivia(
    percorsoConsegna(
      classe,
      nomeFileArchivio(classe.nome, nomeCompleto(allievo), consegna.testo, null, '.pdf'),
      nomeCompleto(allievo),
    ),
    byte,
  )
  return 'relativo' in esito ? esito.relativo : null
}

/** Il PDF originale di uno smistamento, se c'è ancora. */
export async function bytePdf (smistamento: Smistamento): Promise<Uint8Array | null> {
  const dritto = await contenutoDi(smistamento.file)
  if (dritto) return dritto
  return ritrovaInQuarantena(smistamento)
}

/**
 * Il PDF di uno smistamento quando il percorso salvato non porta a niente (file
 * rinominato): in quarantena il nome originale sta in coda al prefisso.
 */
async function ritrovaInQuarantena (smistamento: Smistamento): Promise<Uint8Array | null> {
  const dove = deposito()
  if (!dove || !smistamento.nome) return null
  const trovato = dove.fileIn('quarantena').find((voce) => voce.endsWith(smistamento.nome))
  return trovato ? dove.leggi(trovato) : null
}

/**
 * Rifà la bozza di uno smistamento dalle letture. I blocchi sono una deduzione:
 * si buttano e si rifanno a ogni cambio. Non scavalcano le pagine già assegnate.
 */
export function ricostruisci (archivio: Archivio, smistamentoId: string): void {
  const registro = archivio.registro
  const smistamento = registro.smistamenti.find((s) => s.id === smistamentoId)
  if (!smistamento) return

  const { consegna, classe } = contestoSmistamento(registro, smistamento)

  const bozza = bozzaSmistamento(
    smistamento.letture.map((l) => ({ numero: l.numero, testo: l.testo, lettura: l.lettura })),
    consegna,
    classe,
    consegna ? destinatariConsegna(consegna, classe) : [],
    consegna ? giaConsegnati(consegna) : new Set<string>(),
    // Il modo di taglio è dello smistamento: senza, ogni ricostruzione
    // tornerebbe al riconoscimento dei nomi.
    divisioneDi(smistamento),
  )

  archivio.modifica((r) => {
    const suo = r.smistamenti.find((s) => s.id === smistamentoId)
    if (!suo) return
    suo.blocchi = bozza.map((blocco) => ({
      ...blocco,
      id: nuovoIdBlocco(),
      anteprima: suo.letture.find((l) => l.numero === blocco.da)?.anteprima,
    }))
  }, ['smistamenti'])
}

interface EsitoAssegnazione {
  ok: boolean
  errore?: string
}

/**
 * Il rifiuto per pagine non più da smistare, o `null`. Una pagina archiviata o
 * scartata resta nel PDF ma non nelle letture: senza questo controllo la stessa
 * pagina finirebbe nel fascicolo di due persone.
 */
function pagineNonInBallo (smistamento: Smistamento, scelte: readonly number[]): string | null {
  const inBallo = new Set(smistamento.letture.map((l) => l.numero))
  const giaFuori = scelte.filter((n) => !inBallo.has(n))
  if (giaFuori.length === 0) return null
  return testi().pagineGiaFuori(giaFuori)
}

/** Il rifiuto, o quel che si cercava. */
type Trovato<T> = ({ ok: true } & T) | { ok: false, errore: string }

/** Lo smistamento e la richiesta in cui si archivia. */
function smistamentoEConsegna (
  archivio: Archivio,
  smistamentoId: string,
  consegnaId: string,
): Trovato<{ smistamento: Smistamento, consegna: Consegna }> {
  const registro = archivio.registro
  const smistamento = registro.smistamenti.find((s) => s.id === smistamentoId)
  if (!smistamento) return { ok: false, errore: testi().smistamentoSparito }
  const consegna = registro.consegne.find((c) => c.id === consegnaId)
  if (!consegna) return { ok: false, errore: testi().documentoNonTrovato }
  return { ok: true, smistamento, consegna }
}

/**
 * Le pagine scelte, ritagliate in un documento solo. Si filtrano qui: le
 * `scelte` sono anche quelle da togliere dalle letture.
 */
async function ritaglioScelto (
  smistamento: Smistamento,
  pagine: readonly number[],
): Promise<Trovato<{ scelte: number[], pezzo: Uint8Array }>> {
  const scelte = [...new Set(pagine.map((n) => Math.round(Number(n))))]
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= smistamento.pagine)
    .sort((x, y) => x - y)
  if (scelte.length === 0) return { ok: false, errore: testi().nessunaPagina }
  const giaFuori = pagineNonInBallo(smistamento, scelte)
  if (giaFuori) return { ok: false, errore: giaFuori }

  const byte = await bytePdf(smistamento)
  if (!byte) return { ok: false, errore: testi().originaleSparito }

  try {
    return { ok: true, scelte, pezzo: await estraiElenco(byte, scelte) }
  } catch (errore) {
    return { ok: false, errore: testi().ritaglioFallito((errore as Error).message) }
  }
}

/** Assegna a un allievo, dentro una richiesta, le pagine da `da` ad `a` comprese. */
export async function assegnaPagine (
  archivio: Archivio,
  smistamentoId: string,
  consegnaId: string,
  allievoId: string,
  da: number,
  a: number,
): Promise<EsitoAssegnazione> {
  const primo = Math.min(da, a)
  const ultimo = Math.max(da, a)
  const elenco: number[] = []
  for (let n = primo; n <= ultimo; n += 1) elenco.push(n)
  return assegnaElenco(archivio, smistamentoId, consegnaId, allievoId, elenco)
}

/**
 * Assegna a un allievo le pagine dette (anche non contigue: le facciate di una
 * persona possono essere lontane). Unico punto che archivia davvero, sempre da
 * un gesto umano; le pagine escono dalle letture e la bozza si rifà.
 */
export async function assegnaElenco (
  archivio: Archivio,
  smistamentoId: string,
  consegnaId: string,
  allievoId: string,
  pagine: readonly number[],
): Promise<EsitoAssegnazione> {
  const registro = archivio.registro
  const trovati = smistamentoEConsegna(archivio, smistamentoId, consegnaId)
  if (!trovati.ok) return trovati
  const { smistamento, consegna } = trovati
  const classe = classeDellaConsegna(registro, consegna)
  const allievo = classe?.allievi.find((x) => x.id === allievoId) ?? null
  if (!classe || !allievo) return { ok: false, errore: testi().pifNonTrovato }

  // Non si sovrascrive: uno sbagliato si toglie dalla matrice, a vista.
  if ((consegna.documenti ?? []).some((d) => d.allievoId === allievo.id)) {
    return {
      ok: false,
      errore: testi().giaUnDocumento(nomeCompleto(allievo), consegna.testo),
    }
  }

  const ritaglio = await ritaglioScelto(smistamento, pagine)
  if (!ritaglio.ok) return ritaglio
  const { scelte, pezzo } = ritaglio
  const relativo = await scriviDocumento(classe, consegna, allievo, pezzo)
  if (!relativo) return { ok: false, errore: testi().documentoNonScritto }

  const ora = istanteAdesso()
  archivio.modifica((r) => {
    const bersaglio = r.consegne.find((c) => c.id === consegna.id)
    if (bersaglio) {
      bersaglio.documenti = [
        ...(bersaglio.documenti ?? []).filter((d) => d.allievoId !== allievo.id),
        { allievoId: allievo.id, file: relativo, nome: smistamento.nome, aggiuntoIl: ora },
      ]
      // Da raccogliere: la scansione prova che è arrivato. Da distribuire no:
      // la spunta la mette la consegna.
      if (!siConsegna(bersaglio) && !bersaglio.fatte.some((f) => f.chi === allievo.id)) {
        bersaglio.fatte.push({ chi: allievo.id, fattaIl: ora, modo: 'mano' })
      }
      bersaglio.aggiornataIl = ora
    }

    const suo = r.smistamenti.find((s) => s.id === smistamentoId)
    if (!suo) return
    // A intervalli: tre pagine di fila sono una riga sola.
    for (const tratto of intervalliDi(scelte)) {
      suo.assegnate.push({
        allievoId: allievo.id,
        // Anche la consegna: un PDF può servire più richieste, e serve a
        // riprendere una pagina finita nel posto sbagliato.
        consegnaId: consegna.id,
        da: tratto.da,
        a: tratto.a,
      })
    }
    const fuori = new Set(scelte)
    suo.letture = suo.letture.filter((l) => !fuori.has(l.numero))
  }, ['consegne', 'smistamenti'])

  ricostruisci(archivio, smistamentoId)
  return { ok: true }
}

/**
 * Archivia delle pagine come foglio firme di una richiesta (`fileFirme`, uno per
 * colonna). Come `assegnaElenco`, ma senza allievo né spunta; il tratto resta
 * fra le assegnate per poterlo riprendere.
 */
export async function assegnaFirme (
  archivio: Archivio,
  smistamentoId: string,
  consegnaId: string,
  pagine: readonly number[],
): Promise<EsitoAssegnazione> {
  const registro = archivio.registro
  const trovati = smistamentoEConsegna(archivio, smistamentoId, consegnaId)
  if (!trovati.ok) return trovati
  const { smistamento, consegna } = trovati
  const classe = classeDellaConsegna(registro, consegna)
  if (!classe) return { ok: false, errore: testi().classeSparita }
  if (!siConsegna(consegna) || !consegna.firmeRichieste) {
    return { ok: false, errore: testi().senzaFirme(consegna.testo) }
  }
  if (consegna.fileFirme) return { ok: false, errore: testi().giaFirme(consegna.testo) }

  const ritaglio = await ritaglioScelto(smistamento, pagine)
  if (!ritaglio.ok) return ritaglio
  const { scelte, pezzo } = ritaglio

  const esito = await archivia(
    percorsoConsegna(
      classe,
      // testo-fisso: un nome sotto `archivio/`, che non cambia con la lingua
      nomeFileArchivio(classe.nome, null, consegna.testo, 'firme di consegna', '.pdf'),
    ),
    pezzo,
  )
  if (!('relativo' in esito)) return { ok: false, errore: testi().firmeNonScritte }

  const ora = istanteAdesso()
  archivio.modifica((r) => {
    const bersaglio = r.consegne.find((c) => c.id === consegna.id)
    if (bersaglio) {
      bersaglio.fileFirme = esito.relativo
      bersaglio.nomeFirme = smistamento.nome
      bersaglio.aggiornataIl = ora
    }

    const suo = r.smistamenti.find((s) => s.id === smistamentoId)
    if (!suo) return
    for (const tratto of intervalliDi(scelte)) {
      suo.assegnate.push({ allievoId: '', consegnaId: consegna.id, firme: true, da: tratto.da, a: tratto.a })
    }
    const fuori = new Set(scelte)
    suo.letture = suo.letture.filter((l) => !fuori.has(l.numero))
  }, ['consegne', 'smistamenti'])

  ricostruisci(archivio, smistamentoId)
  return { ok: true }
}

/**
 * Archivia delle pagine come foglio di assenze di una persona in un periodo.
 * Come `assegnaElenco`; la casella (tipo, firmato) la dice il gesto, perché
 * assenze e ritardi si somigliano e non si indovinano.
 */
export async function assegnaAssenze (
  archivio: Archivio,
  smistamentoId: string,
  dove: { classeId: string, bloccoId: string, allievoId: string },
  tipo: TipoRapporto,
  firmato: boolean,
  pagine: readonly number[],
): Promise<EsitoAssegnazione> {
  const registro = archivio.registro
  const smistamento = registro.smistamenti.find((s) => s.id === smistamentoId)
  if (!smistamento) return { ok: false, errore: testi().smistamentoSparito }

  const trovato = trovaBloccoAssenze(registro, dove.classeId, dove.bloccoId)
  if (!trovato) return { ok: false, errore: testi().periodoNonTrovato }
  const { classe, blocco } = trovato
  const allievo = classe.allievi.find((a) => a.id === dove.allievoId) ?? null
  if (!allievo) return { ok: false, errore: testi().pifNonTrovato }

  // Non si sovrascrive: uno sbagliato si toglie dalla matrice, a vista.
  if (foglioDi(rigaDi(blocco, allievo.id), tipo, firmato)) {
    return {
      ok: false,
      errore: testi().giaFoglio(nomeCompleto(allievo), etichettaFoglio(tipo, firmato)),
    }
  }

  const ritaglio = await ritaglioScelto(smistamento, pagine)
  if (!ritaglio.ok) return ritaglio
  const { scelte, pezzo } = ritaglio

  const esito = await archivia(
    percorsoFoglioAssenze(classe.nome, blocco, allievo, tipo, firmato, '.pdf'),
    pezzo,
  )
  if (!('relativo' in esito)) return { ok: false, errore: esito.errore }

  const ora = istanteAdesso()
  archivio.modifica((r) => {
    scriviFoglioAssenze(r, dove, {
      tipo,
      firmato,
      file: esito.relativo,
      nome: smistamento.nome,
      aggiuntoIl: ora,
    })

    const suo = r.smistamenti.find((s) => s.id === smistamentoId)
    if (!suo) return
    for (const tratto of intervalliDi(scelte)) {
      suo.assegnate.push({
        allievoId: allievo.id,
        // Anche la casella, per riprendere pagine cadute nella colonna sbagliata.
        assenze: { classeId: dove.classeId, bloccoId: dove.bloccoId, tipo, firmato },
        da: tratto.da,
        a: tratto.a,
      })
    }
    const fuori = new Set(scelte)
    suo.letture = suo.letture.filter((l) => !fuori.has(l.numero))
  }, ['fascicoli', 'smistamenti'])

  ricostruisci(archivio, smistamentoId)
  return { ok: true }
}

/** Toglie delle pagine dalla bozza senza darle a nessuno. */
export function scartaPagine (
  archivio: Archivio,
  smistamentoId: string,
  da: number,
  a: number,
): void {
  archivio.modifica((r) => {
    const suo = r.smistamenti.find((s) => s.id === smistamentoId)
    if (!suo) return
    suo.letture = suo.letture.filter((l) => l.numero < da || l.numero > a)
  }, ['smistamenti'])
  ricostruisci(archivio, smistamentoId)
}

