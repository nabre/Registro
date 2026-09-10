// La cassetta della posta dei documenti: si butta dentro un PDF e ne escono i
// documenti dei singoli allievi, già spuntati nella consegna che li aspettava.
//
// Il gesto che si vuole è quello: la segreteria manda le pagelle di tutta la
// DIC4a in un file solo, lo si trascina in una cartella e non ci si pensa più.
// Quel che succede dopo è la parte noiosa che si faceva a mano — aprire,
// contare le pagine, ritagliare, salvare col nome giusto, spuntare — e che qui
// fa il registro.
//
// La cartella è il modo in cui il file dichiara a quale richiesta appartiene:
// dentro `in-arrivo/` ce n'è una per ogni documento che si sta ancora
// raccogliendo, con il nome della classe e della consegna, e il registro le
// tiene aggiornate da solo. Un PDF lasciato nella radice viene preso lo stesso
// e la consegna si prova a indovinarla — dal nome del file, o dalla classe
// nominata nelle sue pagine — ma indovinare è la seconda scelta: se non ci
// riesce il PDF finisce in quarantena intero, che non è un fallimento, è
// l'unica risposta onesta.
//
// Niente viene mai sovrascritto e niente sparisce senza lasciare traccia: un
// allievo che ha già consegnato non viene rimpiazzato, e l'originale resta
// intero in `quarantena/` finché c'è anche una sola pagina non decisa.

import * as vscode from 'vscode'

import { nomeCompleto } from '../dominio/calcoli.js'
import { PIF, frase } from '../dominio/lessico.js'
import {
  avanzamentoConsegna,
  destinatariConsegna,
  consegneDocumento,
} from '../dominio/consegne.js'
import { classeDellaConsegna } from '../dominio/corsi.js'
import { creaSmistamento } from '../dominio/fabbriche.js'
import { nuovoIdBlocco } from '../dominio/identificatori.js'
import type {
  Allievo,
  Classe,
  Consegna,
  Registro,
  Smistamento,
} from '../dominio/modelli.js'
import {
  bozzaSmistamento,
  giaConsegnati,
  normalizzaPerRicerca,
} from '../dominio/smistamento.js'
import { siConsegna } from '../dominio/consegne.js'
import { archivia, nomeFileArchivio, percorsoConsegna } from './archiviazione.js'
import type { Archivio } from './archivio.js'
import { leggiImmagine, impostazioniOcr } from './ocr.js'
import { contaPagine, estraiPagine, immaginePagina, testoPagine } from './pdf.js'
import {
  cartellaAnno,
  cartellaInArrivo,
  cartellaQuarantena,
  fileAllegato,
  nomeDelFileUri,
  nomeSicuro,
  vociDi,
} from './percorsi.js'

export { classeDellaConsegna }

/**
 * Quanto si aspetta che un file smetta di crescere prima di aprirlo.
 *
 * Un PDF copiato dentro la cartella esiste da subito ma è completo solo dopo:
 * aprirlo appena il sistema lo annuncia vuol dire leggerne metà. Si guarda la
 * dimensione due volte a distanza, e si comincia solo quando è ferma — che è
 * anche quel che serve con una cartella sincronizzata, dove il file compare
 * mentre sta ancora scendendo.
 */
const ATTESA_STABILITA_MS = 800

/** Quante volte riprovare prima di dire che quel file non si stabilizza. */
const TENTATIVI_STABILITA = 8

/** Il carattere con cui si separa la classe dalla consegna nel nome di cartella. */
const SEPARATORE = ' — '

/** Quanto aspettare prima di riprovare un file che non si è fermato in tempo. */
const RIPROVA_MS = 5000

/**
 * Il nome della cartella in cui si buttano i PDF di una certa richiesta.
 * Si ricava ogni volta da classe e consegna invece di essere salvato: rinominare
 * la consegna rinomina la cartella, e non resta in giro un nome che mente.
 */
export function nomeCartellaConsegna (classe: Classe, consegna: Consegna): string {
  return nomeSicuro(`${classe.nome}${SEPARATORE}${consegna.testo}`)
}

/** Il file che spiega, dentro la cartella, che cosa ci si fa. */
const LEGGIMI = [
  'Qui dentro si buttano i PDF da smistare.',
  '',
  'Ogni sottocartella è un documento che si sta raccogliendo: il PDF lasciato',
  `lì dentro viene diviso e assegnato alle ${PIF.plurale} nominate nelle pagine.`,
  'Quel che non si riesce ad assegnare finisce in quarantena, e si sistema dal',
  'pannello del registro, sotto «Da smistare».',
  '',
  'Un PDF lasciato qui nella radice viene preso lo stesso: la richiesta a cui',
  'appartiene si tenta di indovinarla dal nome del file.',
  '',
  'Questo file lo riscrive il registro: non vale la pena modificarlo.',
  '',
].join('\n')

export interface EsitoSmistamento {
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
export interface LavoroOcr {
  smistamentoId: string
  pagina: number
  /** Come si chiama in interfaccia: «michel.brenna.pdf · pagina 4». */
  etichetta: string
}

/** A che punto è la coda: quel che si sta leggendo e quel che aspetta. */
export interface AvanzamentoOcr {
  corrente: LavoroOcr | null
  /** Quante pagine sono già state lette in questa infornata. */
  fatte: number
  /** Quante ne erano in tutto: serve a dire «3 di 12». */
  totale: number
  coda: LavoroOcr[]
}

/** Quanto testo si tiene di ogni pagina: basta a riconoscere e a far capire. */
const ESTRATTO_SALVATO = 400

export class Smistatore implements vscode.Disposable {
  private osservatore: vscode.FileSystemWatcher | null = null
  /** I file già presi in carico: il watcher annuncia lo stesso file più volte. */
  private inLavorazione = new Set<string>()
  private readonly emettitore = new vscode.EventEmitter<string>()
  /** Racconta quel che ha fatto, per la notifica in interfaccia. */
  readonly alTermine = this.emettitore.event

  private coda: LavoroOcr[] = []
  private corrente: LavoroOcr | null = null
  private fatte = 0
  private totale = 0
  private inCorso = false
  private annullata = false
  private readonly emettitoreCoda = new vscode.EventEmitter<AvanzamentoOcr>()
  /** Scatta a ogni pagina letta e a ogni cambio di coda: lo guarda il pannello. */
  readonly allAvanzamento = this.emettitoreCoda.event

  constructor (private readonly archivio: Archivio) {}

  // ------------------------------------------------------------- le cartelle

  /**
   * Crea la cassetta e una cartella per ogni documento ancora da raccogliere.
   *
   * Le cartelle si aggiungono e basta: nessuna viene cancellata quando la
   * consegna si chiude. Dentro potrebbe esserci un file che nessuno ha ancora
   * guardato, e cancellare la cartella di qualcun altro — perché è una cartella
   * dell'utente, non del registro — è un gesto che un programma non fa.
   */
  async preparaCartelle (): Promise<void> {
    const radice = cartellaInArrivo()
    if (!radice) return
    await vscode.workspace.fs.createDirectory(radice)

    // Il foglietto di istruzioni si riscrive solo se è cambiato: queste
    // cartelle si rifanno a ogni modifica del registro, e riscrivere lo stesso
    // file cento volte al giorno dentro una cartella sincronizzata è traffico
    // regalato a OneDrive.
    const spiegazione = vscode.Uri.joinPath(radice, 'LEGGIMI.txt')
    const atteso = new TextEncoder().encode(LEGGIMI)
    let vecchio: Uint8Array | null = null
    try {
      vecchio = await vscode.workspace.fs.readFile(spiegazione)
    } catch {
      vecchio = null
    }
    if (!vecchio || new TextDecoder().decode(vecchio) !== LEGGIMI) {
      await vscode.workspace.fs.writeFile(spiegazione, atteso)
    }

    for (const { classe, consegna } of this.richiesteAperte()) {
      await vscode.workspace.fs.createDirectory(
        vscode.Uri.joinPath(radice, nomeCartellaConsegna(classe, consegna)),
      )
    }
  }

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

  // ------------------------------------------------------------ osservazione

  /** Tiene d'occhio la cassetta. Ogni PDF che compare viene preso in carico. */
  osserva (): vscode.Disposable {
    const radice = cartellaInArrivo()
    if (!radice) return new vscode.Disposable(() => undefined)

    this.osservatore?.dispose()
    this.osservatore = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(radice, '**/*.pdf'),
    )
    const preso = (uri: vscode.Uri) => void this.prendiInCarico(uri)
    this.osservatore.onDidCreate(preso)
    this.osservatore.onDidChange(preso)
    return this.osservatore
  }

  /** I PDF già nella cassetta all'avvio: il watcher non annuncia quel che c'era. */
  async recuperaArretrati (): Promise<void> {
    const radice = cartellaInArrivo()
    if (!radice) return
    for (const uri of await this.pdfSotto(radice)) await this.prendiInCarico(uri)
  }

  private async pdfSotto (cartella: vscode.Uri): Promise<vscode.Uri[]> {
    const trovati: vscode.Uri[] = []
    for (const [nome, tipo] of await vociDi(cartella)) {
      const uri = vscode.Uri.joinPath(cartella, nome)
      if (tipo === vscode.FileType.Directory) trovati.push(...(await this.pdfSotto(uri)))
      else if (nome.toLowerCase().endsWith('.pdf')) trovati.push(uri)
    }
    return trovati
  }

  private async prendiInCarico (uri: vscode.Uri): Promise<void> {
    const chiave = uri.toString()
    if (this.inLavorazione.has(chiave)) return
    this.inLavorazione.add(chiave)
    const nome = nomeDelFileUri(uri, '')
    try {
      if (!(await this.aspettaCheSiFermi(uri))) {
        // Sta ancora scendendo dalla sincronizzazione: si riprova fra un po',
        // invece di lasciarlo nella cassetta fino al prossimo riavvio.
        this.inLavorazione.delete(chiave)
        setTimeout(() => void this.prendiInCarico(uri), RIPROVA_MS)
        return
      }
      const esito = await this.smista(uri)
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
      this.emettitore.fire(`«${nome}»: ${errore instanceof Error ? errore.message : String(errore)}`)
    } finally {
      this.inLavorazione.delete(chiave)
    }
  }

  /** Vero quando il file ha smesso di crescere e si può leggere. */
  private async aspettaCheSiFermi (uri: vscode.Uri): Promise<boolean> {
    let precedente = -1
    for (let tentativo = 0; tentativo < TENTATIVI_STABILITA; tentativo += 1) {
      let dimensione = -1
      try {
        dimensione = (await vscode.workspace.fs.stat(uri)).size
      } catch {
        return false
      }
      if (dimensione > 0 && dimensione === precedente) return true
      precedente = dimensione
      await new Promise((risolvi) => setTimeout(risolvi, ATTESA_STABILITA_MS))
    }
    return false
  }

  // ------------------------------------------------------------- lo smistamento

  /**
   * Prende un PDF, lo legge e ne prepara la bozza.
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
   * L'originale se ne va dalla cassetta in ogni caso: si sposta in `quarantena/`,
   * dove il pannello lo aspetta. Lasciarlo dov'era vorrebbe dire ritrovarselo
   * smistato una seconda volta al riavvio.
   */
  async smista (uri: vscode.Uri, consegnaForzata?: string): Promise<EsitoSmistamento> {
    const nome = nomeDelFileUri(uri)

    let byte: Uint8Array
    try {
      byte = await vscode.workspace.fs.readFile(uri)
    } catch (errore) {
      return {
        assegnate: 0,
        inQuarantena: 0,
        errore: `non si riesce a leggerlo (${(errore as Error).message}).`,
      }
    }

    let testi: string[]
    let totale: number
    try {
      totale = await contaPagine(byte)
      testi = await testoPagine(byte)
    } catch (errore) {
      // Un PDF illeggibile non si butta: si mette in quarantena senza blocchi
      // proponibili, così resta sott'occhio invece di sparire in silenzio.
      // La richiesta a cui apparteneva si indovina dalla cartella, come per
      // gli altri: è quel che lo fa comparire nel pannello della sua classe.
      const bersaglio = consegnaForzata
        ? this.consegnaPerId(consegnaForzata)
        : this.indovinaConsegna(uri, nome, [])
      await this.inQuarantenaGrezzo(
        uri,
        nome,
        `non è un PDF leggibile (${(errore as Error).message}).`,
        bersaglio,
      )
      return { assegnate: 0, inQuarantena: 1, errore: 'non è un PDF leggibile.' }
    }

    const bersaglio = consegnaForzata
      ? this.consegnaPerId(consegnaForzata)
      : this.indovinaConsegna(uri, nome, testi)

    const quarantena = await this.spostaInQuarantena(uri, nome)
    if (!quarantena) {
      return { assegnate: 0, inQuarantena: 0, errore: 'non si riesce a metterlo in quarantena.' }
    }

    const smistamento = creaSmistamento(
      quarantena,
      nome,
      totale,
      bersaglio?.consegna.id ?? null,
      bersaglio?.classe?.id ?? null,
    )
    smistamento.letture = testi.map((testo, indice) => ({
      numero: indice + 1,
      testo: testo.slice(0, ESTRATTO_SALVATO),
      lettura: testo.length > 0 ? ('testo' as const) : ('niente' as const),
    }))

    this.archivio.modifica((r) => {
      r.smistamenti.push(smistamento)
    }, ['smistamenti'])
    ricostruisci(this.archivio, smistamento.id)

    // Le pagine mute vanno lette, e leggerle costa minuti: in coda, con
    // l'avanzamento in vista, invece che dentro questa chiamata.
    const mute = smistamento.letture.filter((l) => l.lettura === 'niente')
    if (mute.length > 0 && impostazioniOcr().attivo) {
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
   * Sposta l'originale in quarantena e torna il percorso relativo ai dati.
   *
   * Un file che in quarantena c'è già resta dov'è. Succede rismistando un PDF
   * appena agganciato alla sua richiesta: rinominarlo un'altra volta gli
   * appiccicherebbe un secondo prefisso e — peggio — lascerebbe il riferimento
   * salvato a puntare al nome di prima, cioè nel vuoto.
   */
  private async spostaInQuarantena (uri: vscode.Uri, nome: string): Promise<string | null> {
    const cartella = cartellaQuarantena()
    if (!cartella) return null
    if (uri.path.startsWith(`${cartella.path}/`)) {
      return `quarantena/${uri.path.slice(cartella.path.length + 1)}`
    }
    await vscode.workspace.fs.createDirectory(cartella)
    const destinazione = vscode.Uri.joinPath(cartella, `${Date.now().toString(36)} ${nomeSicuro(nome)}`)
    try {
      await vscode.workspace.fs.rename(uri, destinazione, { overwrite: true })
    } catch {
      try {
        await vscode.workspace.fs.copy(uri, destinazione, { overwrite: true })
        await this.viaDallaCassetta(uri)
      } catch {
        return null
      }
    }
    return `quarantena/${destinazione.path.split('/').pop() ?? ''}`
  }

  /** Un PDF che non si è nemmeno riusciti ad aprire: in quarantena, senza blocchi. */
  private async inQuarantenaGrezzo (
    uri: vscode.Uri,
    nome: string,
    errore: string,
    bersaglio: { consegna: Consegna, classe: Classe | null } | null,
  ): Promise<void> {
    const relativo = await this.spostaInQuarantena(uri, nome)
    if (!relativo) return
    const smistamento = creaSmistamento(
      relativo,
      nome,
      0,
      bersaglio?.consegna.id ?? null,
      bersaglio?.classe?.id ?? null,
    )
    smistamento.errore = errore
    this.archivio.modifica((r) => {
      r.smistamenti.push(smistamento)
    }, ['smistamenti'])
  }

  private async viaDallaCassetta (uri: vscode.Uri): Promise<void> {
    try {
      await vscode.workspace.fs.delete(uri, { useTrash: true })
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
   * Tre tentativi, dal più affidabile al meno: la cartella in cui è stato
   * lasciato, il nome del file, e infine la classe nominata nelle sue pagine —
   * ma quest'ultima basta solo se in quella classe si sta raccogliendo un
   * documento e uno solo. Se restano due candidate non si sceglie: la
   * quarantena è una risposta migliore di un documento archiviato nel posto
   * sbagliato.
   */
  private indovinaConsegna (
    uri: vscode.Uri,
    nome: string,
    pagine: string[],
  ): { consegna: Consegna, classe: Classe } | null {
    const aperte = this.richiesteAperte()
    if (aperte.length === 0) return null

    // `Uri.path` è già decodificato: un `%` nel nome della consegna non va
    // decodificato una seconda volta, o salterebbe tutto lo smistamento.
    const cartella = normalizzaPerRicerca(uri.path.split('/').slice(-2, -1)[0] ?? '')
    if (cartella) {
      const perCartella = aperte.find(
        ({ classe, consegna }) => normalizzaPerRicerca(nomeCartellaConsegna(classe, consegna)) === cartella,
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
    this.annunciaCoda()
    void this.smaltisciCoda()
  }

  /** Svuota la coda. La pagina in lettura finisce: fermarla a metà non serve. */
  fermaLettura (): void {
    this.coda = []
    this.annullata = true
    this.annunciaCoda()
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

        const guaio = await this.leggiPagina(lavoro)
        if (guaio) this.emettitore.fire(guaio)
        this.fatte += 1

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
      // Fermata a metà e riempita nel frattempo: si riparte da sé.
      if (!fermata && this.coda.length > 0) void this.smaltisciCoda()
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
    const letto = await ocrDellaPagina(byte, lavoro.pagina, classe)

    this.archivio.modifica((r) => {
      const suo = r.smistamenti.find((s) => s.id === smistamento.id)
      const pagina = suo?.letture.find((l) => l.numero === lavoro.pagina)
      if (!pagina) return
      if (anteprima) pagina.anteprima = anteprima
      if (letto) {
        pagina.testo = letto.slice(0, ESTRATTO_SALVATO)
        pagina.lettura = 'ocr'
      }
    }, ['smistamenti'])

    return letto ? null : `${lavoro.etichetta}: non se n'è cavato niente di leggibile.`
  }

  dispose (): void {
    this.coda = []
    this.annullata = true
    this.osservatore?.dispose()
    this.emettitore.dispose()
    this.emettitoreCoda.dispose()
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
export async function scriviAnteprima (
  byte: Uint8Array,
  smistamento: Smistamento,
  pagina: number,
): Promise<string | null> {
  const cartella = cartellaQuarantena()
  if (!cartella) return null
  let immagine: Uint8Array | null = null
  try {
    immagine = await immaginePagina(byte, pagina, 'intera', 900)
  } catch {
    return null
  }
  if (!immagine) return null

  const anteprime = vscode.Uri.joinPath(cartella, 'anteprime')
  const nome = `${smistamento.id}-p${pagina}.png`
  try {
    await vscode.workspace.fs.createDirectory(anteprime)
    await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(anteprime, nome), immagine)
  } catch {
    return null
  }
  return `quarantena/anteprime/${nome}`
}

/** Le anteprime di uno smistamento se ne vanno con lui. */
export async function togliAnteprime (smistamento: Smistamento): Promise<void> {
  const cartella = cartellaQuarantena()
  if (!cartella) return
  const anteprime = vscode.Uri.joinPath(cartella, 'anteprime')
  for (const [nome] of await vociDi(anteprime)) {
    if (!nome.startsWith(`${smistamento.id}-`)) continue
    try {
      await vscode.workspace.fs.delete(vscode.Uri.joinPath(anteprime, nome), { useTrash: false })
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
export async function ocrDellaPagina (
  byte: Uint8Array,
  numero: number,
  classe: Classe | null,
): Promise<string> {
  for (const porzione of ['testata', 'intera'] as const) {
    let immagine: Uint8Array | null = null
    try {
      immagine = await immaginePagina(byte, numero, porzione)
    } catch {
      return ''
    }
    if (!immagine) return ''
    const testo = await leggiImmagine(immagine)
    if (porzione === 'intera') return testo
    if (testo && nominaQualcuno(testo, classe)) return testo
  }
  return ''
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
  const file = fileAllegato(smistamento.file)
  if (!file || !cartellaAnno()) return null
  try {
    return await vscode.workspace.fs.readFile(file)
  } catch {
    const ripiego = await ritrovaInQuarantena(smistamento)
    if (!ripiego) return null
    try {
      return await vscode.workspace.fs.readFile(ripiego)
    } catch {
      return null
    }
  }
}

/**
 * Il PDF di uno smistamento quando il percorso salvato non porta più a niente.
 *
 * Succede con i file rinominati a mano, e succedeva rismistando un PDF già in
 * quarantena. Il nome originale però è dentro lo smistamento, e in quella
 * cartella i file portano il nome originale in coda a un prefisso: cercare per
 * coda ritrova il file invece di dichiarare perso un documento che è lì.
 */
async function ritrovaInQuarantena (smistamento: Smistamento): Promise<vscode.Uri | null> {
  const cartella = cartellaQuarantena()
  if (!cartella || !smistamento.nome) return null
  const trovato = (await vociDi(cartella)).find(
    ([nome, tipo]) => tipo === vscode.FileType.File && nome.endsWith(smistamento.nome),
  )
  return trovato ? vscode.Uri.joinPath(cartella, trovato[0]) : null
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

export interface EsitoAssegnazione {
  ok: boolean
  errore?: string
}

/**
 * Assegna un intervallo di pagine a un allievo, dentro una richiesta.
 *
 * È l'unico punto in cui un documento viene archiviato davvero, e ci si arriva
 * solo da un gesto umano: la conferma di una proposta, o un'assegnazione fatta
 * a mano scegliendo pagine, allievo e documento. Le pagine assegnate escono
 * dalle letture — non sono più in ballo — e la bozza si rifà su quel che resta.
 */
export async function assegnaPagine (
  archivio: Archivio,
  smistamentoId: string,
  consegnaId: string,
  allievoId: string,
  da: number,
  a: number,
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

  const primo = Math.max(1, Math.min(da, a))
  const ultimo = Math.min(smistamento.pagine, Math.max(da, a))

  const byte = await bytePdf(smistamento)
  if (!byte) return { ok: false, errore: 'Il PDF originale non è più nella cartella del registro.' }

  let pezzo: Uint8Array
  try {
    pezzo = await estraiPagine(byte, primo, ultimo)
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
    suo.assegnate.push({ allievoId: allievo.id, da: primo, a: ultimo })
    suo.letture = suo.letture.filter((l) => l.numero < primo || l.numero > ultimo)
  }, ['consegne', 'smistamenti'])

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

