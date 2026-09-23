// Lo smistamento dei PDF di classe: si porta dentro un PDF e ne escono i
// documenti dei singoli allievi, già spuntati nella consegna che li aspettava.
//
// Il gesto che si vuole è quello: la segreteria manda le pagelle di tutta la
// DIC4a in un file solo, lo si trascina nel pannello e non ci si pensa più.
// Quel che succede dopo è la parte noiosa che si faceva a mano — aprire,
// contare le pagine, ritagliare, salvare col nome giusto, spuntare — e che qui
// fa il registro.
//
// **I file in ingresso stanno dentro il documento dell'anno.** Un PDF
// trascinato nel pannello, o scelto con «Carica un PDF», entra dritto in
// `quarantena/` dentro `2026-2027.registro`: non c'è più una cartella
// `in-arrivo/` su disco da tenere sincronizzata, da spiegare con un LEGGIMI e
// da guardare con un watcher. Un file lasciato a metà nella cartella di
// lavoro, con OneDrive che lo sta ancora scaricando, era la sola cosa che
// obbligava a quella complicazione; adesso i byte arrivano già interi, in un
// gesto solo, e il documento dell'anno li tiene insieme a tutto il resto.
//
// La consegna a cui un PDF appartiene si dice al momento del rilascio. Quando
// non è stata detta si prova a indovinarla — dal nome del file, o dalla classe
// nominata nelle pagine — ma indovinare è la seconda scelta: se non ci riesce
// il PDF resta lì intero, senza documento, e lo si aggancia o lo si divide a
// mano dal pannello. Non è un fallimento, è l'unica risposta onesta.
//
// Niente viene mai sovrascritto e niente sparisce senza lasciare traccia: un
// allievo che ha già consegnato non viene rimpiazzato, e l'originale resta
// intero in `quarantena/` finché c'è anche una sola pagina non decisa.

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
import { PIF, frase } from '../domain/lexicon.js'
import {
  avanzamentoConsegna,
  destinatariConsegna,
  consegneDocumento,
} from '../domain/assignments.js'
import { classeDellaConsegna } from '../domain/courses.js'
import { QUARANTENA } from '../domain/locations.js'
import { istanteNelNome } from '../domain/dates.js'
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

/**
 * Il nome della cartella in cui si buttano i PDF di una certa richiesta.
 * Si ricava ogni volta da classe e consegna invece di essere salvato: rinominare
 * la consegna rinomina la cartella, e non resta in giro un nome che mente.
 */
function nomeCartellaConsegna (classe: Classe, consegna: Consegna): string {
  return nomeSicuro(`${classe.nome}${SEPARATORE}${consegna.testo}`)
}

interface EsitoSmistamento {
  assegnate: number
  inQuarantena: number
  errore?: string
}

/**
 * Una pagina che aspetta di essere letta dall'OCR.
 *
 * L'unità è la pagina e non il blocco perché i blocchi non stanno fermi: appena
 * una pagina viene letta il raggruppamento cambia — due pagine che sembravano
 * di nessuno diventano il documento di qualcuno — e una coda fatta di blocchi
 * si riferirebbe, mezzo minuto dopo, a blocchi che non esistono più.
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

/**
 * Che cosa è costata una pagina letta: il materiale della voce di giornale che
 * `startup.ts` ne ricava. Vedi il commento dentro `smaltisciCoda`.
 */
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
   * Il giro in corso, per chi lo deve aspettare.
   *
   * Lo spegnimento: `smaltisciCoda` girava senza che nessuno ne tenesse il
   * capo, quindi allo spegnimento una pagina appena letta poteva arrivare a
   * `archivio.modifica` **dopo** che l'archivio aveva lasciato il pacchetto —
   * e quel che aveva letto spariva in silenzio, con i minuti di OCR che ci
   * erano voluti.
   */
  private giro: Promise<void> | null = null
  /**
   * Il segnale che accompagna le letture di questa coda.
   *
   * Il programma dell'OCR è a parte, e senza un segnale che arrivi fino a
   * `execFile` non c'è modo di dirgli di smettere: la pagina in lettura andava
   * avanti fino ai suoi tre minuti d'attesa comunque. Non è una questione di
   * processi orfani — un figlio lanciato con `execFile` muore un secondo e
   * mezzo dopo il padre, perché su Windows libuv li mette già in un job object
   * — è che una coda di quarantena fermata deve smettere davvero, invece di
   * macinare quel che le era rimasto in mano.
   */
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
      // Aperta vuol dire che manca ancora il foglio di qualcuno: è a quei
      // nomi che lo smistatore cerca di far corrispondere le pagine.
      if (classe && !avanzamentoConsegna(consegna, classe).completa) {
        esito.push({ classe, consegna })
      }
    }
    return esito
  }

  // ---------------------------------------------------------------- l'ingresso

  /**
   * I PDF rimasti nella vecchia cassetta su disco, portati dentro il documento.
   *
   * `in-arrivo/` non è più il posto in cui si buttano i PDF — ci si entra dal
   * pannello, trascinandoli o scegliendoli — ma una cartella sincronizzata può
   * portarsene dietro una per mesi, da una macchina che non è ancora stata
   * aggiornata, e dentro può esserci il foglio che qualcuno aspetta. Quei file
   * si smistano una volta sola e l'originale va nel cestino: è lo stesso giro
   * che faceva l'osservatore, fatto all'apertura invece che di continuo.
   */
  async assorbiCassettaVecchia (): Promise<void> {
    const radice = cartellaInArrivo()
    if (!radice) return
    for (const uri of await this.pdfSotto(radice)) {
      const nome = nomeDelFileUri(uri, '')
      try {
        const esito = await this.smistaFile(uri)
        if (esito.errore) this.emettitore.fire(`«${nome}»: ${esito.errore}`)
        else if (esito.inQuarantena > 0) {
          this.emettitore.fire(
            `«${nome}»: ${esito.assegnate} assegnati, ${esito.inQuarantena} da sistemare a mano.`,
          )
        } else if (esito.assegnate > 0) {
          this.emettitore.fire(`«${nome}»: ${esito.assegnate} documenti assegnati.`)
        }
      } catch (errore) {
        // Un guasto imprevisto non deve sparire in una promessa che nessuno
        // guarda: si dice, e il file resta dov'è per un secondo tentativo.
        this.emettitore.fire(
          `«${nome}»: ${errore instanceof Error ? errore.message : String(errore)}`,
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
   * Un PDF che sta su disco: si legge, si smista, e l'originale va nel cestino.
   *
   * Nel cestino e non cancellato, come ogni altro file del registro — e solo
   * dopo che i byte sono al sicuro dentro il documento: se la posa in
   * quarantena non riesce, il file resta dov'era per un secondo tentativo.
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
        errore: `non si riesce a leggerlo (${(errore as Error).message}).`,
      }
    }
    // La cartella in cui stava è l'indizio migliore su a quale richiesta
    // appartenga: era il modo in cui la cassetta lo faceva dichiarare.
    const cartella = uri.path.split('/').slice(-2, -1)[0] ?? ''
    const esito = await this.smista(byte, nomeDelFileUri(uri), consegnaForzata, cartella, divisione)
    if (esito.assegnate > 0 || esito.inQuarantena > 0) await this.viaDalDisco(uri)
    return esito
  }

  // ------------------------------------------------------------- lo smistamento

  /**
   * Prende i byte di un PDF, li posa dentro il documento e ne prepara la bozza.
   *
   * Non archivia niente. Riconoscere un nome su una pagina è un'ipotesi — buona,
   * ma un'ipotesi — e un documento archiviato nel fascicolo sbagliato è un
   * errore che nessuno scopre finché non serve quel documento. Quel che esce di
   * qui è un elenco di proposte, e la conferma è un gesto di chi guarda.
   *
   * Le scansioni non si leggono qui: le pagine mute finiscono in coda all'OCR,
   * che è lento e va guardato mentre lavora. La bozza si rifà da sola man mano
   * che le pagine vengono lette — è per questo che di ogni pagina si tiene la
   * lettura, e i blocchi si ricavano ogni volta da quelle.
   *
   * I byte entrano in `quarantena/` dentro il documento dell'anno, e non c'è
   * nessuna copia da cancellare altrove: chi ha trascinato il file lo ha
   * ancora dove ce l'aveva, e quel che il registro tiene in mano è suo.
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
      return { assegnate: 0, inQuarantena: 0, errore: 'è vuoto.' }
    }

    let lette: Awaited<ReturnType<typeof testoConPosizioni>>
    let totale: number
    try {
      totale = await contaPagine(byte)
      // Con le posizioni e non solo il testo: quando un nome si riconosce, si
      // vuole poter dire anche dove sta sul foglio.
      lette = await testoConPosizioni(byte)
    } catch (errore) {
      // Un PDF illeggibile non si butta: si mette in quarantena senza blocchi
      // proponibili, così resta sott'occhio invece di sparire in silenzio.
      // La richiesta a cui apparteneva si indovina come per gli altri: è quel
      // che lo fa comparire nel pannello della sua classe.
      const bersaglio = consegnaForzata
        ? this.consegnaPerId(consegnaForzata)
        : this.indovinaConsegna(cartella, nome, [])
      if (
        !this.inQuarantenaGrezzo(
          byte,
          nome,
          `non è un PDF leggibile (${(errore as Error).message}).`,
          bersaglio,
          divisione,
          classeDiRipiego,
        )
      ) {
        return { assegnate: 0, inQuarantena: 0, errore: 'non c’è nessun anno aperto in cui metterlo.' }
      }
      return { assegnate: 0, inQuarantena: 1, errore: 'non è un PDF leggibile.' }
    }

    const testi = lette.map((pagina) => pagina.testo)
    const bersaglio = consegnaForzata
      ? this.consegnaPerId(consegnaForzata)
      : this.indovinaConsegna(cartella, nome, testi)

    const quarantena = this.posaInQuarantena(byte, nome)
    if (!quarantena) {
      return { assegnate: 0, inQuarantena: 0, errore: 'non c’è nessun anno aperto in cui metterlo.' }
    }

    const smistamento = creaSmistamento(
      quarantena,
      nome,
      totale,
      bersaglio?.consegna.id ?? null,
      // La classe di ripiego è quella della pagina da cui il file è stato
      // lasciato cadere: senza, un PDF che non nomina nessuno — una scansione
      // muta — resterebbe senza consegna *e* senza classe, cioè in nessun
      // archivio, cioè invisibile a chi l'ha appena portato dentro.
      bersaglio?.classe?.id ?? classeDiRipiego ?? null,
      divisione,
    )
    // L'indice dei nomi della classe: serve a segnare, pagina per pagina, dove
    // il nome è stato letto. La classe può non esserci ancora — un PDF che non
    // nomina nessuno, caricato senza richiesta — e allora non si segna niente:
    // meglio nessun riquadro che un riquadro attorno alla parola sbagliata.
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

    // Le pagine mute vanno lette, e leggerle costa minuti: in coda, con
    // l'avanzamento in vista, invece che dentro questa chiamata. Dividendo a
    // passo fisso o a mano non serve: il taglio è già deciso, e l'OCR
    // servirebbe solo a proporre un nome — che si mette in due secondi dalla
    // tendina, mentre la lettura di dodici scansioni dura un quarto d'ora.
    const mute = smistamento.letture.filter((l) => l.lettura === 'niente')
    if (mute.length > 0 && divisione.modo === 'nomi' && ocrAttivo()) {
      this.accodaLettura(
        mute.map((l) => ({
          smistamentoId: smistamento.id,
          pagina: l.numero,
          etichetta: `${nome} · pagina ${l.numero}`,
        })),
      )
    }

    const aggiornato = this.archivio.registro.smistamenti.find((x) => x.id === smistamento.id)
    const proposte = (aggiornato?.blocchi ?? []).filter((b) => b.allievoId).length
    return { assegnate: proposte, inQuarantena: (aggiornato?.blocchi ?? []).length - proposte }
  }

  // ----------------------------------------------------------------- i file

  /**
   * Posa i byte in quarantena, dentro il documento, e torna il percorso salvato.
   *
   * Il prefisso di tempo evita che due PDF con lo stesso nome — «pagelle.pdf»
   * arrivato oggi e quello di ieri — si coprano a vicenda: dentro il documento
   * un nome che si ripete è una sovrascrittura, e la sovrascrittura qui vuol
   * dire un foglio di qualcuno perso.
   *
   * È scritto come si legge — `260914 09.42.03 pagelle.pdf` — e non più in
   * base 36: il prefisso di prima, `mfk3x1`, teneva i file distinti e in
   * ordine, ma nella pagina dell'archivio si leggeva come una sigla messa a
   * caso. Questo tiene distinti e in ordine allo stesso modo, e dice quando il
   * file è arrivato.
   */
  private posaInQuarantena (byte: Uint8Array, nome: string): string | null {
    const dove = deposito()
    if (!dove) return null
    const relativo = `${QUARANTENA}/${istanteNelNome()} ${nomeSicuro(nome)}`
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
      // Già sparito, o la cartella è di sola lettura: non è un motivo per
      // annullare uno smistamento riuscito.
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
   * A quale richiesta appartiene un PDF, quando non lo dice la cartella.
   *
   * Tre tentativi, dal più affidabile al meno: la cartella da cui viene — se
   * viene da una — il nome del file, e infine la classe nominata nelle pagine —
   * ma quest'ultima basta solo se in quella classe si sta raccogliendo un
   * documento e uno solo. Se restano due candidate non si sceglie: la
   * quarantena è una risposta migliore di un documento archiviato nel posto
   * sbagliato.
   */
  private indovinaConsegna (
    cartella: string,
    nome: string,
    pagine: string[],
  ): { consegna: Consegna, classe: Classe } | null {
    const aperte = this.richiesteAperte()
    if (aperte.length === 0) return null

    // La cartella vale solo per i file che vengono dalla vecchia cassetta: chi
    // trascina un PDF nel pannello dice a quale documento appartiene, e da lì
    // in poi non si indovina più niente.
    const dove = normalizzaPerRicerca(cartella)
    if (dove) {
      const perCartella = aperte.find(
        ({ classe, consegna }) => normalizzaPerRicerca(nomeCartellaConsegna(classe, consegna)) === dove,
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
   * Mette in coda la lettura di una o più pagine.
   *
   * Una coda e non una chiamata diretta perché l'OCR su una macchina normale
   * impiega decine di secondi a pagina: un pulsante che aspetta la fine
   * sembrerebbe rotto, e dodici pagine lette insieme bloccherebbero il pannello
   * per un quarto d'ora senza dire niente. Così il gesto torna subito, il lavoro
   * procede una pagina alla volta — l'OCR mangia la macchina, due letture in
   * parallelo sono più lente di due in fila — e chi guarda vede a che punto è.
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
    // Chi accoda dopo aver fermato vuole che si riparta: senza, la coda
    // resterebbe piena e ferma fino al prossimo riavvio.
    this.annullata = false
    // Un segnale già tirato non si può rilassare: chi riaccoda dopo aver
    // fermato ne vuole uno nuovo, o la prima lettura morirebbe sul nascere.
    if (this.annullo.signal.aborted) this.annullo = new AbortController()
    this.annunciaCoda()
    this.giro = this.smaltisciCoda().catch((errore: unknown) => {
      console.error('smaltimento della coda di smistamento', errore)
    })
  }

  /** Svuota la coda. La pagina in lettura finisce: fermarla a metà non serve. */
  fermaLettura (): void {
    this.coda = []
    this.annullata = true
    this.annunciaCoda()
  }

  /**
   * Ferma la lettura e aspetta che la pagina in mano sia finita. Per `spegni()`.
   *
   * Qui la pagina in lettura si ferma davvero — il segnale arriva fino al
   * programma dell'OCR — perché chi sta uscendo non aspetta tre minuti per una
   * scansione. Quel che si aspetta è il resto del giro: fra `leggiImmagine` e
   * `archivio.modifica` ci sono la fotografia da scrivere e la bozza da
   * rifare, ed è lì che una pagina già letta si perdeva.
   *
   * Torna una promessa che non rifiuta: uno spegnimento non è il posto in cui
   * far esplodere qualcosa.
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
        const lavoro = this.coda.shift() as LavoroOcr
        this.corrente = lavoro
        this.annunciaCoda()

        const partenza = Date.now()
        const prima = this.archivio.revisione
        const guaio = await this.leggiPagina(lavoro)
        if (guaio) this.emettitore.fire(guaio)
        this.fatte += 1

        // Una pagina letta si racconta, e non è un lusso.
        //
        // Questo lavoro scrive nel registro — la trascrizione, l'anteprima, il
        // riquadro del nome — e non può passare da `chiama()`: dura minuti, e
        // una chiamata che tiene la fila delle scritture per minuti è la fila
        // che non funziona più. Restava però l'unico posto del registro in cui
        // qualcosa cambiava e il giornale non ne sapeva niente: alla domanda
        // «che cosa ha toccato questa pagina, e quando» non c'era risposta.
        // Non essendo instradabile, si racconta — è la differenza fra un buco
        // dichiarato e un buco muto.
        //
        // L'evento e non la scrittura diretta nel giornale, perché `dati/` è
        // `core` e il giornale sta in `api/`: chi lo scrive è `startup.ts`, che
        // sta nello strato da cui si vedono tutti e due. Vedi `annota` in
        // `api/core.ts` e `npm run layers`.
        this.emettitorePagina.fire({
          etichetta: lavoro.etichetta,
          durataMs: Date.now() - partenza,
          ok: guaio === null,
          modifiche: this.archivio.revisione - prima,
        })

        // La bozza si rifà a ogni pagina: chi guarda vede i blocchi formarsi
        // mentre la macchina legge, invece di trovarli tutti insieme alla fine.
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
      // Fermata a metà e riempita nel frattempo: si riparte da sé. Il capo del
      // giro si sposta sul giro nuovo, o chi aspetta lo spegnimento lascerebbe
      // indietro proprio la ripresa. Finito, resta una promessa già risolta:
      // aspettarla non costa niente, e azzerarla aprirebbe una finestra in cui
      // `fermaEAspetta` non trova più niente da aspettare.
      if (!fermata && this.coda.length > 0) {
        this.giro = this.smaltisciCoda().catch((errore: unknown) => {
          console.error('ripresa della coda di smistamento', errore)
        })
      }
    }
  }

  /**
   * Legge una pagina e ne scrive la lettura, con la sua fotografia.
   *
   * L'anteprima si salva mentre l'immagine è già in mano: costa niente in più,
   * e su una scansione è la cosa che risponde davvero alla domanda della
   * quarantena — di chi sono queste pagine — meglio di qualunque trascrizione.
   */
  private async leggiPagina (lavoro: LavoroOcr): Promise<string | null> {
    const registro = this.archivio.registro
    const smistamento = registro.smistamenti.find((s) => s.id === lavoro.smistamentoId)
    if (!smistamento) return null

    const { consegna, classe } = contestoSmistamento(registro, smistamento)
    void consegna

    const byte = await bytePdf(smistamento)
    if (!byte) return `«${smistamento.nome}» non è più nella cartella del registro.`

    const anteprima = await scriviAnteprima(byte, smistamento, lavoro.pagina)
    const letto = await ocrDellaPagina(byte, lavoro.pagina, classe, this.annullo.signal)

    // Fermata mentre leggeva: quel che è uscito a metà non si scrive. Durante
    // lo spegnimento l'archivio sta già consegnando il pacchetto al disco, e
    // una modifica che arriva adesso o non ci entra o lo riapre.
    if (this.annullo.signal.aborted) return null

    this.archivio.modifica((r) => {
      const suo = r.smistamenti.find((s) => s.id === smistamento.id)
      const pagina = suo?.letture.find((l) => l.numero === lavoro.pagina)
      if (!pagina) return
      if (anteprima) pagina.anteprima = anteprima
      if (letto.testo) {
        pagina.testo = letto.testo.slice(0, ESTRATTO_SALVATO)
        pagina.lettura = 'ocr'
        // Il modello legge parole, non posizioni: il riquadro è la striscia che
        // ha guardato — la testata, o il foglio intero se in testa non c'era
        // nessuno. Largo, ma vero: dice dove il nome è stato letto, e chi
        // controlla sa dove posare l'occhio.
        pagina.riquadroNome = nominaQualcuno(letto.testo, classe)
          ? strisciaLetta(letto.porzione)
          : undefined
      }
    }, ['smistamenti'])

    return letto.testo ? null : `${lavoro.etichetta}: non se n'è cavato niente di leggibile.`
  }

  dispose (): void {
    this.coda = []
    this.annullata = true
    // Chi arriva di qui non aspetta niente — è lo smaltimento, non lo
    // spegnimento ordinato, che passa da `fermaEAspetta` — ma almeno la pagina
    // in mano smette invece di tenere occupato un programma esterno per tre
    // minuti dopo che il suo committente non c'è più.
    this.annullo.abort()
    this.emettitore.dispose()
    this.emettitoreCoda.dispose()
    this.emettitorePagina.dispose()
  }
}

/**
 * L'unico smistatore della finestra.
 *
 * Ce n'è uno solo perché la coda di lettura è sua: un'istanza creata al volo
 * dentro un'azione avrebbe una coda tutta sua, e il pannello ne guarderebbe
 * un'altra ancora — tre code che non sanno l'una dell'altra e nessuna che dice
 * la verità su quel che la macchina sta facendo.
 */
let condiviso: { archivio: Archivio, smistatore: Smistatore } | null = null

export function smistatoreDi (archivio: Archivio): Smistatore {
  if (!condiviso || condiviso.archivio !== archivio) {
    condiviso = { archivio, smistatore: new Smistatore(archivio) }
  }
  return condiviso.smistatore
}

/**
 * La fotografia di una pagina, salvata accanto al PDF in quarantena.
 *
 * Sta su disco e non in memoria perché il pannello vive in una sandbox e le
 * immagini le carica per indirizzo, come fa con le risorse dei piani. Sparisce
 * con lo smistamento a cui appartiene.
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

  // Dentro il documento come tutto il resto: il pannello la mostra per
  // indirizzo, e il protocollo la materializza quando gliela chiede.
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
      // Un'anteprima che non si cancella non è un problema di nessuno.
    }
  }
}

/**
 * Una pagina passata all'OCR: prima la testata, poi tutta se serve.
 *
 * Le due passate non sono uno scrupolo: la testata costa la metà, e nel
 * documento scolastico tipico il nome è lì. Si guarda la pagina intera solo
 * quando in testa non è comparso nessuno di quella classe — cioè quando o il
 * documento è fatto in un altro modo, o l'OCR ha letto male.
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
    // Il segnale della coda arriva fino a `execFile`: è l'unico modo di
    // accorciare i tre minuti d'attesa di una pagina che nessuno aspetta più.
    const testo = await leggiImmagine(immagine, segnale)
    if (porzione === 'intera') return { testo, porzione }
    if (testo && nominaQualcuno(testo, classe)) return { testo, porzione }
  }
  return { testo: '', porzione: 'intera' }
}

/** La striscia di pagina che l'OCR ha guardato, come riquadro. */
function strisciaLetta (porzione: Porzione): { x: number, y: number, larghezza: number, altezza: number } {
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
 * Scrive il documento di un allievo dove vanno i documenti, e torna il percorso
 * relativo alla cartella dei dati — quello che finisce dentro la spunta.
 *
 * Il nome parla: «DIC4a_Pagella 3° anno_Rossi Mario.pdf». La cartella dei
 * documenti si apre anche da fuori dal registro, e lì dentro un nome fatto di
 * identificatori non serve a nessuno. Due omonimi non si coprono: il secondo
 * prende un numero.
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

/**
 * Il PDF originale di uno smistamento, se è ancora al suo posto. Serve a chi
 * deve ritagliare a mano: senza il file non c'è niente da assegnare.
 */
export async function bytePdf (smistamento: Smistamento): Promise<Uint8Array | null> {
  const dritto = await contenutoDi(smistamento.file)
  if (dritto) return dritto
  return ritrovaInQuarantena(smistamento)
}

/**
 * Il PDF di uno smistamento quando il percorso salvato non porta più a niente.
 *
 * Succede con i file rinominati a mano, e succedeva rismistando un PDF già in
 * quarantena. Il nome originale però è dentro lo smistamento, e in quella
 * cartella i file portano il nome originale in coda a un prefisso: cercare per
 * coda ritrova il file invece di dichiarare perso un documento che è lì.
 */
async function ritrovaInQuarantena (smistamento: Smistamento): Promise<Uint8Array | null> {
  const dove = deposito()
  if (!dove || !smistamento.nome) return null
  const trovato = dove.fileIn('quarantena').find((voce) => voce.endsWith(smistamento.nome))
  return trovato ? dove.leggi(trovato) : null
}

/**
 * Rifà la bozza di uno smistamento a partire dalle letture.
 *
 * I blocchi non sono un dato, sono una deduzione: cambiano appena si legge una
 * pagina in più e appena una pagina viene assegnata. Tenerli come verità
 * significherebbe doverli aggiustare a mano in cinque punti diversi; qui si
 * buttano e si rifanno, che è l'unico modo per cui non possono mentire.
 *
 * Le pagine già assegnate non ci sono più — sono uscite dalle letture — e i
 * blocchi non scavalcano i buchi che lasciano.
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
    // Il modo di taglio è dello smistamento e non di chi ricostruisce: i
    // blocchi si rifanno a ogni pagina assegnata, e senza questa riga il
    // secondo giro tornerebbe al riconoscimento disfacendo la divisione.
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
 * Assegna un intervallo di pagine a un allievo, dentro una richiesta. È la
 * forma di sempre: da qui a lì, comprese.
 */
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
 * Assegna a un allievo le pagine dette, dentro una richiesta — anche pagine
 * che non si toccano.
 *
 * È l'unico punto in cui un documento viene archiviato davvero, e ci si arriva
 * solo da un gesto umano: la conferma di una proposta, l'assegnazione fatta a
 * mano scegliendo pagine, allievo e documento, o delle pagine trascinate sulla
 * casella di qualcuno. Le pagine assegnate escono dalle letture — non sono
 * più in ballo — e la bozza si rifà su quel che resta.
 *
 * Le pagine sparse non sono un capriccio dell'interfaccia: in una scansione di
 * classe le due facciate di una persona finiscono lontane più spesso di quanto
 * sembri, e senza questa via si archivierebbero come due documenti — di cui
 * il registro accetta solo il primo.
 */
export async function assegnaElenco (
  archivio: Archivio,
  smistamentoId: string,
  consegnaId: string,
  allievoId: string,
  pagine: readonly number[],
): Promise<EsitoAssegnazione> {
  const registro = archivio.registro
  const smistamento = registro.smistamenti.find((s) => s.id === smistamentoId)
  if (!smistamento) return { ok: false, errore: 'Quello smistamento non c’è più.' }

  const consegna = registro.consegne.find((c) => c.id === consegnaId)
  if (!consegna) return { ok: false, errore: 'Documento non trovato.' }
  const classe = classeDellaConsegna(registro, consegna)
  const allievo = classe?.allievi.find((x) => x.id === allievoId) ?? null
  if (!classe || !allievo) return { ok: false, errore: frase(PIF, 'trovato', { nega: true }) }

  // Non si sovrascrive un documento già archiviato: se quello di prima era
  // sbagliato lo si toglie dalla matrice, che è un gesto visibile.
  if ((consegna.documenti ?? []).some((d) => d.allievoId === allievo.id)) {
    return {
      ok: false,
      errore: `${nomeCompleto(allievo)} ha già un documento in «${consegna.testo}»: toglierlo prima di metterne un altro.`,
    }
  }

  // Le pagine fuori dal PDF si buttano qui e non nel ritaglio: quel che resta
  // è ciò che verrà archiviato davvero, ed è quel che deve uscire dalle letture.
  const scelte = [...new Set(pagine.map((n) => Math.round(Number(n))))]
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= smistamento.pagine)
    .sort((x, y) => x - y)
  if (scelte.length === 0) return { ok: false, errore: 'Nessuna pagina da archiviare.' }

  const byte = await bytePdf(smistamento)
  if (!byte) return { ok: false, errore: 'Il PDF originale non è più nella cartella del registro.' }

  let pezzo: Uint8Array
  try {
    pezzo = await estraiElenco(byte, scelte)
  } catch (errore) {
    return { ok: false, errore: `Ritaglio non riuscito: ${(errore as Error).message}` }
  }
  const relativo = await scriviDocumento(classe, consegna, allievo, pezzo)
  if (!relativo) return { ok: false, errore: 'Non si riesce a scrivere il documento.' }

  const ora = new Date().toISOString()
  archivio.modifica((r) => {
    const bersaglio = r.consegne.find((c) => c.id === consegna.id)
    if (bersaglio) {
      bersaglio.documenti = [
        ...(bersaglio.documenti ?? []).filter((d) => d.allievoId !== allievo.id),
        { allievoId: allievo.id, file: relativo, nome: smistamento.nome, aggiuntoIl: ora },
      ]
      // Un documento che si raccoglie è arrivato: la scansione è la prova che
      // quel foglio è stato portato. Uno che si distribuisce no — averlo
      // ritagliato non vuol dire averlo dato — e la spunta la mette la consegna.
      if (!siConsegna(bersaglio) && !bersaglio.fatte.some((f) => f.chi === allievo.id)) {
        bersaglio.fatte.push({ chi: allievo.id, fattaIl: ora, modo: 'mano' })
      }
      bersaglio.aggiornataIl = ora
    }

    const suo = r.smistamenti.find((s) => s.id === smistamentoId)
    if (!suo) return
    // A intervalli e non pagina per pagina: è la forma in cui il registro si
    // è sempre segnato quel che ha archiviato, e tre pagine di fila restano
    // una riga sola nel documento dell'anno.
    for (const tratto of intervalliDi(scelte)) {
      suo.assegnate.push({
        allievoId: allievo.id,
        // La consegna, non solo la persona: da un PDF solo possono uscire
        // documenti di richieste diverse — le pagine si lasciano cadere sulla
        // colonna che si vuole — e senza di lei non si saprebbe da dove
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
 * Archivia delle pagine come foglio firme di una richiesta.
 *
 * Il gemello di `assegnaElenco`, e le differenze sono tutte nel fatto che il
 * foglio firme non è di nessuno: non c'è un allievo da trovare, non c'è una
 * spunta da mettere — le firme sono la prova di aver distribuito, non di aver
 * ricevuto — e il file finisce in `fileFirme`, che è uno per colonna.
 *
 * Il resto è identico, ed è voluto: le pagine escono dalle letture, il tratto
 * resta segnato fra le assegnate, e da lì si riprende — perché sbagliare
 * casella capita anche qui, e una pagina che sparisse senza lasciare traccia
 * sarebbe l'unico modo di perderla davvero.
 */
export async function assegnaFirme (
  archivio: Archivio,
  smistamentoId: string,
  consegnaId: string,
  pagine: readonly number[],
): Promise<EsitoAssegnazione> {
  const registro = archivio.registro
  const smistamento = registro.smistamenti.find((s) => s.id === smistamentoId)
  if (!smistamento) return { ok: false, errore: 'Quello smistamento non c’è più.' }

  const consegna = registro.consegne.find((c) => c.id === consegnaId)
  if (!consegna) return { ok: false, errore: 'Documento non trovato.' }
  const classe = classeDellaConsegna(registro, consegna)
  if (!classe) return { ok: false, errore: 'La classe di questa richiesta non c’è più.' }
  if (!siConsegna(consegna) || !consegna.firmeRichieste) {
    return { ok: false, errore: `«${consegna.testo}» non chiede un foglio firme.` }
  }
  if (consegna.fileFirme) {
    return {
      ok: false,
      errore: `«${consegna.testo}» ha già un foglio firme: toglierlo prima di metterne un altro.`,
    }
  }

  const scelte = [...new Set(pagine.map((n) => Math.round(Number(n))))]
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= smistamento.pagine)
    .sort((x, y) => x - y)
  if (scelte.length === 0) return { ok: false, errore: 'Nessuna pagina da archiviare.' }

  const byte = await bytePdf(smistamento)
  if (!byte) return { ok: false, errore: 'Il PDF originale non è più nella cartella del registro.' }

  let pezzo: Uint8Array
  try {
    pezzo = await estraiElenco(byte, scelte)
  } catch (errore) {
    return { ok: false, errore: `Ritaglio non riuscito: ${(errore as Error).message}` }
  }

  const esito = await archivia(
    percorsoConsegna(
      classe,
      nomeFileArchivio(classe.nome, null, consegna.testo, 'firme di consegna', '.pdf'),
    ),
    pezzo,
  )
  if (!('relativo' in esito)) return { ok: false, errore: 'Non si riesce a scrivere il foglio firme.' }

  const ora = new Date().toISOString()
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
 * Archivia delle pagine come foglio di assenze: questo rapporto, di questa
 * persona, in questo periodo.
 *
 * Il terzo gemello di `assegnaElenco`, per l'altra matrice del docente di
 * classe. Quel che cambia è dove il foglio va a finire — nella riga di una
 * persona dentro un periodo, non fra i documenti di una richiesta — e chi
 * decide la colonna: qui non c'è niente da indovinare, perché i rapporti di
 * assenze e di ritardi si somigliano pagina per pagina e a distinguerli è
 * soltanto chi li guarda. Il gesto lo dice: la casella su cui si lasciano
 * cadere le pagine è la risposta.
 *
 * Il resto è identico, ed è voluto: le pagine escono dalle letture, il tratto
 * resta segnato fra le assegnate — con dentro la casella, così da lì si
 * riprende — e la bozza si rifà su quel che resta.
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
  if (!smistamento) return { ok: false, errore: 'Quello smistamento non c’è più.' }

  const trovato = trovaBloccoAssenze(registro, dove.classeId, dove.bloccoId)
  if (!trovato) return { ok: false, errore: 'Periodo non trovato.' }
  const { classe, blocco } = trovato
  const allievo = classe.allievi.find((a) => a.id === dove.allievoId) ?? null
  if (!allievo) return { ok: false, errore: frase(PIF, 'trovato', { nega: true }) }

  // Non si sovrascrive un foglio già archiviato: se quello di prima era
  // sbagliato lo si toglie dalla matrice, che è un gesto visibile.
  if (foglioDi(rigaDi(blocco, allievo.id), tipo, firmato)) {
    return {
      ok: false,
      errore:
        `${nomeCompleto(allievo)} ha già il foglio «${etichettaFoglio(tipo, firmato)}» di questo ` +
        'periodo: toglierlo prima di metterne un altro.',
    }
  }

  const scelte = [...new Set(pagine.map((n) => Math.round(Number(n))))]
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= smistamento.pagine)
    .sort((x, y) => x - y)
  if (scelte.length === 0) return { ok: false, errore: 'Nessuna pagina da archiviare.' }

  const byte = await bytePdf(smistamento)
  if (!byte) return { ok: false, errore: 'Il PDF originale non è più nella cartella del registro.' }

  let pezzo: Uint8Array
  try {
    pezzo = await estraiElenco(byte, scelte)
  } catch (errore) {
    return { ok: false, errore: `Ritaglio non riuscito: ${(errore as Error).message}` }
  }

  const esito = await archivia(
    percorsoFoglioAssenze(classe.nome, blocco, allievo, tipo, firmato, '.pdf'),
    pezzo,
  )
  if (!('relativo' in esito)) return { ok: false, errore: esito.errore }

  const ora = new Date().toISOString()
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
        // La casella e non la sola persona: un PDF di segreteria porta le
        // assenze e i ritardi dello stesso periodo, e senza questa non si
        // saprebbe da dove riprendere delle pagine cadute nella colonna
        // sbagliata.
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
export function scartaPagine (archivio: Archivio, smistamentoId: string, da: number, a: number): void {
  archivio.modifica((r) => {
    const suo = r.smistamenti.find((s) => s.id === smistamentoId)
    if (!suo) return
    suo.letture = suo.letture.filter((l) => l.numero < da || l.numero > a)
  }, ['smistamenti'])
  ricostruisci(archivio, smistamentoId)
}

