// I file dell'anno dentro il documento, trattati come un file system.
// Chi vuole un percorso vero (Acrobat, pdfjs, il protocollo `registro://`) riceve
// una copia materializzata in `userData`, rifatta solo se cambia il CRC. Le copie
// sono cache, si buttano chiudendo; il documento è la verità, e una copia
// modificata da fuori non torna indietro.

import * as apparato from 'apparato'

import { nomeSicuro } from '#core/dominio/text.js'
import { esisteFile, fileAllegato } from './paths.js'
import type { Pacchetto } from './package.js'
import { crc32 } from './zip.js'

/** La cartella di servizio dentro `userData`: copie, non dati. */
const MATERIALIZZATI = 'materializzati'

/** Il file che ricorda che cosa è già stato estratto, e in quale versione. */
const REGISTRO_COPIE = '.copie.json'

/**
 * Un percorso dentro il documento: sempre con `/`, senza risalite. I percorsi
 * vengono da JSON scrivibili a mano, quindi si ripuliscono qui.
 */
export function dentroIlDocumento (relativo: string): string {
  return relativo
    .split(/[\\/]+/)
    .filter((pezzo) => pezzo !== '' && pezzo !== '.' && pezzo !== '..')
    .join('/')
}

export class Deposito {
  /** Da dove prendere il documento aperto: cambia a ogni anno che si apre. */
  private readonly documento: () => Pacchetto | null
  private readonly radiceCopie: apparato.Uri
  /** Da avvisare quando qualcosa cambia: un file scritto deve far scattare il salvataggio. */
  private readonly alCambiamento: () => void
  /**
   * Da avvisare quando un file esce dal documento: Ctrl+Z rimette i JSON, non i
   * byte. Si avvisa qui, dove tutti i file escono, e decide `Archivio`.
   */
  private readonly alTogliere: (relativo: string) => void
  /** Che cosa è già materializzato, e con quale controllo: percorso → crc. */
  private copie = new Map<string, number>()
  private copieLette = false
  /** Le operazioni sulle copie, in fila: vedi `inFila`. */
  private coda: Promise<void> = Promise.resolve()

  constructor (
    documento: () => Pacchetto | null,
    cartellaUtente: apparato.Uri,
    alCambiamento: () => void = () => undefined,
    alTogliere: (relativo: string) => void = () => undefined,
  ) {
    this.documento = documento
    this.radiceCopie = apparato.Uri.joinPath(cartellaUtente, MATERIALIZZATI)
    this.alCambiamento = alCambiamento
    this.alTogliere = alTogliere
  }

  // ------------------------------------------------------------- guardare

  /** Vero se il documento contiene quel file. */
  esiste (relativo: string): boolean {
    return this.documento()?.contiene(dentroIlDocumento(relativo)) ?? false
  }

  /** Quanto misura un file, senza aprirlo. */
  misura (relativo: string): number | null {
    return this.documento()?.misuraDi(dentroIlDocumento(relativo)) ?? null
  }

  /** Quante volte quel file è stato riscritto da quando l'anno è aperto. */
  revisione (relativo: string): number {
    return this.documento()?.revisioneDi(dentroIlDocumento(relativo)) ?? 0
  }

  /** I file sotto un percorso, sottocartelle comprese, con il percorso completo. */
  elenca (prefisso = ''): string[] {
    const dentro = dentroIlDocumento(prefisso)
    const nomi = this.documento()?.nomi() ?? []
    if (dentro === '') return nomi
    return nomi.filter((nome) => nome.startsWith(`${dentro}/`))
  }

  /** I nomi delle sottocartelle dirette di un percorso: quel che un elenco mostra. */
  sottocartelle (prefisso = ''): string[] {
    const dentro = dentroIlDocumento(prefisso)
    const taglio = dentro === '' ? 0 : dentro.length + 1
    const nomi = new Set<string>()
    for (const voce of this.elenca(dentro)) {
      const resto = voce.slice(taglio)
      const barra = resto.indexOf('/')
      if (barra > 0) nomi.add(resto.slice(0, barra))
    }
    return [...nomi].sort()
  }

  /** I file che stanno *direttamente* dentro un percorso, senza scendere oltre. */
  fileIn (prefisso = ''): string[] {
    const dentro = dentroIlDocumento(prefisso)
    const taglio = dentro === '' ? 0 : dentro.length + 1
    return this.elenca(dentro)
      .filter((voce) => !voce.slice(taglio).includes('/'))
      .sort()
  }

  // -------------------------------------------------------------- leggere

  /** Il contenuto di un file, o null se non c'è. */
  leggi (relativo: string): Uint8Array | null {
    return this.documento()?.bytes(dentroIlDocumento(relativo)) ?? null
  }

  /** Il contenuto di un file di testo. */
  leggiTesto (relativo: string): string | null {
    return this.documento()?.testo(dentroIlDocumento(relativo)) ?? null
  }

  // ------------------------------------------------------------- scrivere

  /** Mette un file nel documento; sul disco va al prossimo salvataggio. */
  scrivi (relativo: string, dati: Uint8Array, opzioni?: { certamenteNuovo?: boolean }): boolean {
    const documento = this.documento()
    if (!documento) return false
    documento.deposita(dentroIlDocumento(relativo), dati, opzioni)
    this.alCambiamento()
    return true
  }

  /**
   * Toglie un file dal documento e la sua copia materializzata, che altrimenti
   * resterebbe apribile da fuori. La copia si toglie in coda (`inFila`), senza
   * aspettare il disco.
   */
  elimina (relativo: string): boolean {
    const tolto = this.documento()?.elimina(dentroIlDocumento(relativo)) ?? false
    if (tolto) {
      this.smaterializza(relativo).catch((errore: unknown) => {
        console.error(`non ho potuto togliere dal disco ${relativo}`, errore)
      })
      this.alTogliere(relativo)
      this.alCambiamento()
    }
    return tolto
  }

  /** Toglie tutto quel che sta sotto un percorso: una cartella intera. */
  eliminaSotto (prefisso: string): number {
    const documento = this.documento()
    if (!documento) return 0
    let quanti = 0
    for (const voce of this.elenca(prefisso)) {
      if (documento.elimina(voce)) {
        quanti += 1
        this.alTogliere(voce)
        this.smaterializza(voce).catch((errore: unknown) => {
          console.error(`non ho potuto togliere dal disco ${voce}`, errore)
        })
      }
    }
    if (quanti > 0) this.alCambiamento()
    return quanti
  }

  /** Sposta un file dentro il documento: costa quanto riscrivere la voce. */
  sposta (da: string, a: string): boolean {
    const contenuto = this.leggi(da)
    if (contenuto === null) return false
    if (!this.scrivi(a, contenuto, { certamenteNuovo: true })) return false
    this.elimina(da)
    return true
  }

  // -------------------------------------------------------- materializzare

  /**
   * Un percorso vero per un file del documento. La copia si rifà solo se cambia
   * il CRC, e tiene il nome originale perché è quello che il lettore PDF mostra.
   */
  async materializza (relativo: string): Promise<apparato.Uri | null> {
    const dentro = dentroIlDocumento(relativo)
    if (!this.esiste(dentro)) return null

    return this.inFila(async () => {
      const destinazione = this.percorsoCopia(dentro)
      await this.leggiCopie()
      // Prima il confronto, poi i byte: una copia già aggiornata non fa
      // decomprimere niente. Tutto in fila, e impronta e byte presi insieme,
      // senza attese in mezzo: un file riscritto (e salvato) durante un'attesa
      // darebbe byte vecchi segnati con l'impronta nuova.
      const nota = this.copie.get(dentro)
      const aggiornata = nota !== undefined && nota === this.impronta(dentro)
      if (aggiornata && (await esisteFile(destinazione))) {
        return destinazione
      }
      const contenuto = this.leggi(dentro)
      if (contenuto === null) return null
      const impronta = this.impronta(dentro, contenuto)

      try {
        await apparato.file.writeFile(destinazione, contenuto)
      } catch (errore) {
        // Su Windows un PDF aperto altrove non si riscrive (EBUSY, EPERM): nome
        // segnato accanto, e la copia non si segna aggiornata, così si riprova.
        const altrove = await this.copiaAccanto(destinazione, contenuto)
        if (altrove === null) throw errore
        return altrove
      }
      if (impronta !== null) this.copie.set(dentro, impronta)
      await this.scriviCopie()
      return destinazione
    })
  }

  /**
   * Il CRC di un file: dall'indice dello ZIP, perché ricalcolarlo costa ~2 ms/MB
   * a ogni richiesta, tutte in fila. Si calcola solo per le voci scritte in
   * questa sessione, che nell'indice non l'hanno ancora e sono già aperte.
   */
  private impronta (dentro: string, contenuto?: Uint8Array): number | null {
    const dalIndice = this.documento()?.crcDi(dentro) ?? null
    if (dalIndice !== null) return dalIndice
    const byte = contenuto ?? this.leggi(dentro)
    return byte === null ? null : crc32(byte)
  }

  /**
   * Scrive la copia sotto un nome segnato accanto a quello vero —
   * `Verifica ~2.pdf` — e ne torna l'indirizzo, o null se nessuno va. Non
   * « (2)»: è il nome di un altro file del documento (bozza gemella, progetto
   * omonimo), la cui copia verrebbe coperta. Se un file del documento si
   * chiama davvero così, la sua copia non vale più come aggiornata.
   */
  private async copiaAccanto (
    destinazione: apparato.Uri,
    contenuto: Uint8Array,
  ): Promise<apparato.Uri | null> {
    const nome = destinazione.path.split('/').pop() ?? ''
    const punto = nome.lastIndexOf('.')
    const radice = punto > 0 ? nome.slice(0, punto) : nome
    const estensione = punto > 0 ? nome.slice(punto) : ''
    for (let copia = 2; copia <= 9; copia += 1) {
      const dove = apparato.Uri.joinPath(destinazione, '..', `${radice} ~${copia}${estensione}`)
      try {
        await apparato.file.writeFile(dove, contenuto)
      } catch {
        // Occupato anche questo: si prova il prossimo nome.
        continue
      }
      const coperte = [...this.copie.keys()].filter(
        (altro) => this.percorsoCopia(altro).path === dove.path,
      )
      for (const altro of coperte) this.copie.delete(altro)
      if (coperte.length > 0) await this.scriviCopie()
      return dove
    }
    return null
  }

  /**
   * Butta via la copia materializzata di un file tolto. Un fallimento non si
   * segnala: la chiusura dell'anno la porta via comunque.
   */
  async smaterializza (relativo: string): Promise<void> {
    const dentro = dentroIlDocumento(relativo)
    await this.inFila(async () => {
      const nota = this.copie.delete(dentro)
      try {
        await apparato.file.delete(this.percorsoCopia(dentro), { useTrash: false })
      } catch {
        // Mai materializzata, o aperta altrove: se ne va chiudendo l'anno.
      }
      if (nota) await this.scriviCopie()
    })
  }

  /**
   * Le operazioni sulle copie, in fila: intrecciate, una cancellazione potrebbe
   * arrivare dopo una copia rifatta e portarsela via.
   */
  private inFila<T> (operazione: () => Promise<T>): Promise<T> {
    const prossima = this.coda.then(operazione, operazione)
    this.coda = prossima.then(
      () => undefined,
      () => undefined,
    )
    return prossima
  }

  /**
   * All'avvio, prima di aprire un anno: le copie di una sessione finita male
   * (crash, PC spento di colpo) sono PDF con dati di minorenni lasciati sul
   * disco fino alla prossima chiusura. In fila, così nessuna copia nuova nasce
   * mentre si butta la cartella.
   */
  ripulisciRimaste (): Promise<void> {
    return this.inFila(() => this.smonta())
  }

  /** Butta via le copie chiudendo un anno; un fallimento non si segnala. */
  async smonta (): Promise<void> {
    this.copie.clear()
    this.copieLette = false
    try {
      await apparato.file.delete(this.radiceCopie, { recursive: true, useTrash: false })
    } catch {
      // Non c'era, o un file è aperto altrove: le copie rimaste si riscrivono.
    }
  }

  /**
   * Un file di servizio (ritaglio, anteprima) da aprire subito: sta con le
   * copie, fuori dal documento, e sparisce chiudendo l'anno.
   */
  async servizio (nome: string, dati: Uint8Array): Promise<apparato.Uri | null> {
    const pulito = nomeSicuro(nome) || 'file'
    const punto = pulito.lastIndexOf('.')
    const radice = punto > 0 ? pulito.slice(0, punto) : pulito
    const estensione = punto > 0 ? pulito.slice(punto) : ''

    // Stesso nome ogni volta, così si riscrive; se è ancora aperto (Windows non
    // lascia riscriverlo) si numera.
    for (let copia = 1; copia <= 9; copia += 1) {
      const dove = apparato.Uri.joinPath(
        this.percorsoCopia('.servizio'),
        `${radice}${copia > 1 ? ` (${copia})` : ''}${estensione}`,
      )
      try {
        await apparato.file.writeFile(dove, dati)
        return dove
      } catch {
        // Occupato o non scrivibile: si prova il prossimo nome.
      }
    }
    return null
  }

  /**
   * La cartella delle copie di quest'anno: i webview vi compongono gli indirizzi,
   * e i file arrivano su richiesta (`materializzaChiesto`).
   */
  radice (): apparato.Uri | null {
    return this.documento() ? this.percorsoCopia('') : null
  }

  /**
   * Materializza il file dietro un indirizzo `…/materializzati/<anno>/…` chiesto
   * da una pagina. Torna dove sta la copia, che con l'originale occupato è un
   * nome numerato accanto; null se l'indirizzo non è di un file dell'anno.
   */
  async materializzaChiesto (assoluto: apparato.Uri): Promise<apparato.Uri | null> {
    const radice = this.radice()
    if (!radice) return null
    const dentro = radice.path.endsWith('/') ? radice.path : `${radice.path}/`
    if (!assoluto.path.startsWith(dentro)) return null
    const relativo = decodeURIComponent(assoluto.path.slice(dentro.length))
    return this.materializza(relativo)
  }

  /** Dove finisce la copia di un file: sotto `userData`, con la stessa struttura. */
  private percorsoCopia (dentro: string): apparato.Uri {
    const documento = this.documento()
    const anno = nomeSicuro(documento?.nome ?? 'anno') || 'anno'
    const cartella = apparato.Uri.joinPath(this.radiceCopie, anno)
    // Ripulito di nuovo anche se chi chiama l'ha già fatto: `joinPath` risolve
    // `..` e su Windows `\` diventa separatore, e una copia fuori da qui
    // finirebbe ovunque nel profilo (e `smaterializza` ci cancellerebbe).
    const pezzi = dentroIlDocumento(dentro).split('/').filter(Boolean)
    const copia = apparato.Uri.joinPath(cartella, ...pezzi)
    if (copia.path !== cartella.path && !copia.path.startsWith(`${cartella.path}/`)) {
      // testo-fisso: guardia interna, irraggiungibile dopo `dentroIlDocumento`
      throw new Error(`copia fuori dalla cartella delle copie: ${dentro}`)
    }
    return copia
  }

  /** Il file che ricorda le copie fatte, letto una volta per sessione. */
  private get percorsoRegistroCopie (): apparato.Uri {
    const documento = this.documento()
    const anno = nomeSicuro(documento?.nome ?? 'anno') || 'anno'
    return apparato.Uri.joinPath(this.radiceCopie, anno, REGISTRO_COPIE)
  }

  private async leggiCopie (): Promise<void> {
    if (this.copieLette) return
    this.copieLette = true
    try {
      const testo = new TextDecoder().decode(
        await apparato.file.readFile(this.percorsoRegistroCopie),
      )
      const letto = JSON.parse(testo) as Record<string, unknown>
      for (const [nome, impronta] of Object.entries(letto)) {
        if (typeof impronta === 'number') this.copie.set(nome, impronta)
      }
    } catch {
      // Prima volta o file rovinato: si riparte senza copie note.
    }
  }

  private async scriviCopie (): Promise<void> {
    try {
      await apparato.file.writeFile(
        this.percorsoRegistroCopie,
        new TextEncoder().encode(`${JSON.stringify(Object.fromEntries(this.copie), null, 2)}\n`),
      )
    } catch {
      // È una scorciatoia: se non si scrive, la prossima sessione riestrae.
    }
  }
}

/**
 * Il percorso vero di un file dell'anno: dal documento, o in ripiego dalla
 * cartella gemella su disco (file non ancora inglobati o messi a mano).
 */
export async function percorsoVero (relativo: string): Promise<apparato.Uri | null> {
  const dentro = await deposito()?.materializza(relativo)
  if (dentro) return dentro
  const fuori = fileAllegato(relativo)
  return fuori && (await esisteFile(fuori)) ? fuori : null
}

/**
 * Il contenuto di un file dell'anno senza materializzarlo: da preferire quando
 * basta leggerlo. Ripiega sul disco come `percorsoVero`.
 */
export async function contenutoDi (relativo: string): Promise<Uint8Array | null> {
  const dentro = deposito()?.leggi(relativo)
  if (dentro) return dentro
  const fuori = fileAllegato(relativo)
  if (!fuori) return null
  try {
    return await apparato.file.readFile(fuori)
  } catch {
    return null
  }
}

// ------------------------------------------------------- il deposito in uso

/**
 * Il deposito dell'anno aperto, globale come il documento in `paths.ts`.
 * `null` prima che un anno sia aperto: chi scrive deve accorgersene.
 */
let inUso: Deposito | null = null

export function registraDeposito (deposito: Deposito): void {
  inUso = deposito
}

/** Il deposito dell'anno aperto, o null se non ce n'è ancora uno. */
export function deposito (): Deposito | null {
  return inUso
}
