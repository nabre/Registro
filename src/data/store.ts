// I file dell'anno, che stanno dentro il documento e devono sembrare file.
//
// Dentro `2026-2027.registro` non ci sono solo i JSON: ci sono i PDF
// dell'archivio, i rapporti stampati, le immagini delle schede. Il registro li
// tratta come li ha sempre trattati — li elenca, li legge, li scrive, li
// sposta — e per quello basta questa classe, che è un file system con dentro un
// archivio.
//
// Poi c'è il momento in cui un file deve essere un file per davvero:
//
//   - un doppio clic su un PDF apre Acrobat, e ad Acrobat si passa un percorso;
//   - pdfjs legge le pagine di un PDF per lo smistamento, e vuole un percorso;
//   - il webview mostra l'immagine di una scheda, e il protocollo `registro://`
//     serve file dal disco.
//
// Per quei casi il file si materializza: si scrive una copia in una cartella di
// servizio dentro `userData`, e si consegna quel percorso. La copia resta lì
// finché il contenuto non cambia — si riconosce dal controllo CRC, che
// l'archivio porta già per ogni voce — così aprire due volte lo stesso PDF non
// lo riestrae due volte.
//
// La cartella di servizio è cache e non dati: si può cancellare in qualunque
// momento senza perdere niente, e infatti la si cancella chiudendo il registro.
// Quel che vale è dentro il documento; là fuori ci sono copie che si rifanno.
//
// Una regola sola, ed è quella che tiene insieme il tutto: **il documento è la
// verità**. Una copia materializzata che qualcuno modifica da fuori non torna
// indietro da sé — chi annota un PDF con un altro programma sta scrivendo su
// una copia — e per questo si materializza il meno possibile, e mai per lavorarci.

import * as apparato from 'apparato'

import { nomeSicuro } from '../domain/text.js'
import { fileAllegato } from './paths.js'
import type { Pacchetto } from './package.js'
import { crc32 } from './zip.js'

/** La cartella di servizio dentro `userData`: copie, non dati. */
const MATERIALIZZATI = 'materializzati'

/** Il file che ricorda che cosa è già stato estratto, e in quale versione. */
const REGISTRO_COPIE = '.copie.json'

/**
 * Un percorso dentro il documento: sempre con `/`, mai fuori dalla radice.
 *
 * I percorsi vengono dai JSON, che si possono correggere a mano, e da nomi di
 * classi e di persone. Le risalite si scartano qui una volta sola, invece di
 * fidarsi di ogni chiamante.
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
  /**
   * Da avvisare quando qualcosa cambia.
   *
   * Un PDF archiviato è una modifica come una lezione battuta a macchina, e
   * deve far scattare lo stesso salvataggio: senza questa riga il file resta in
   * memoria finché non cambia qualcos'altro, e un registro chiuso male se lo
   * porta via.
   */
  private readonly alCambiamento: () => void
  /** Che cosa è già materializzato, e con quale controllo: percorso → crc. */
  private copie = new Map<string, number>()
  private copieLette = false
  /** Le operazioni sulle copie, in fila: vedi `inFila`. */
  private coda: Promise<void> = Promise.resolve()

  constructor (
    documento: () => Pacchetto | null,
    cartellaUtente: apparato.Uri,
    alCambiamento: () => void = () => undefined,
  ) {
    this.documento = documento
    this.radiceCopie = apparato.Uri.joinPath(cartellaUtente, MATERIALIZZATI)
    this.alCambiamento = alCambiamento
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

  /**
   * I file sotto un percorso, in ordine, con il percorso completo.
   *
   * `elenca('archivio')` torna anche quel che sta nelle sottocartelle: dentro
   * un archivio le cartelle non esistono, esistono solo nomi con dentro delle
   * barre, e chi chiede «che cosa c'è sotto archivio» vuole sapere questo.
   */
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

  /**
   * Mette un file nel documento. Sul disco ci va al prossimo salvataggio, come
   * tutto il resto.
   */
  scrivi (relativo: string, dati: Uint8Array, opzioni?: { certamenteNuovo?: boolean }): boolean {
    const documento = this.documento()
    if (!documento) return false
    documento.deposita(dentroIlDocumento(relativo), dati, opzioni)
    this.alCambiamento()
    return true
  }

  /**
   * Toglie un file: dal documento, e la copia che ne era stata materializzata.
   *
   * Tutte e due, perché la copia è quella che il resto del mondo vede — il
   * lettore di PDF la apre, il protocollo dei webview la serve, il gestore file
   * la mostra. Togliendo solo la voce dal documento, un documento buttato via
   * restava aperto e apribile: la pagina chiedeva il suo indirizzo e il file
   * era ancora lì, identico, a dire che la cancellazione non aveva funzionato.
   *
   * La copia se ne va per conto suo, in coda alle altre operazioni sulle
   * copie: qui non si aspetta il disco — il gesto di chi ha premuto è già
   * finito — ma l'ordine è quello dei gesti, e una materializzazione chiesta
   * dopo trova il posto pulito invece di scontrarsi con la cancellazione.
   */
  elimina (relativo: string): boolean {
    const tolto = this.documento()?.elimina(dentroIlDocumento(relativo)) ?? false
    if (tolto) {
      this.smaterializza(relativo).catch((errore: unknown) => {
        console.error(`non ho potuto togliere dal disco ${relativo}`, errore)
      })
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
        this.smaterializza(voce).catch((errore: unknown) => {
          console.error(`non ho potuto togliere dal disco ${voce}`, errore)
        })
      }
    }
    if (quanti > 0) this.alCambiamento()
    return quanti
  }

  /**
   * Sposta un file dentro il documento.
   *
   * Il contenuto non si tocca: cambia il nome sotto cui è nominato. Costa
   * quanto riscrivere quella voce, perché il nome sta dentro il blocco.
   */
  sposta (da: string, a: string): boolean {
    const contenuto = this.leggi(da)
    if (contenuto === null) return false
    if (!this.scrivi(a, contenuto, { certamenteNuovo: true })) return false
    this.elimina(da)
    return true
  }

  // -------------------------------------------------------- materializzare

  /**
   * Un percorso vero per un file del documento, da dare a chi sa aprire solo i
   * file: il programma di sistema, pdfjs, il protocollo dei webview.
   *
   * La copia si rifà solo se il contenuto è cambiato — il confronto è sul CRC
   * che l'archivio porta già — e conserva il nome che il file ha dentro il
   * documento, perché è quel nome che l'utente legge nella finestra del lettore
   * PDF: `DIC4a_Verifica 1_testo.pdf` e non un numero.
   */
  async materializza (relativo: string): Promise<apparato.Uri | null> {
    const dentro = dentroIlDocumento(relativo)
    const contenuto = this.leggi(dentro)
    if (contenuto === null) return null

    return this.inFila(async () => {
      const destinazione = this.percorsoCopia(dentro)
      await this.leggiCopie()
      // L'impronta la porta l'indice dello ZIP, che e' dove il formato la
      // tiene: ricalcolarla costava due millisecondi per megabyte a **ogni**
      // richiesta `registro://dati/...`, e queste richieste passano tutte in
      // fila. Una pagina Persone con venticinque ritratti ne faceva venticinque
      // di fila; l'anteprima di una scansione da venti megabyte ne pagava
      // trentotto, per poi concludere che la copia sul disco andava gia' bene.
      // Si calcola solo per le voci scritte in memoria in questa sessione, che
      // nell'indice un CRC non ce l'hanno ancora.
      const impronta = this.documento()?.crcDi(dentro) ?? crc32(contenuto)
      if (this.copie.get(dentro) === impronta && (await esiste(destinazione))) return destinazione

      try {
        await apparato.file.writeFile(destinazione, contenuto)
      } catch (errore) {
        // Su Windows un PDF aperto in Acrobat non si riscrive: EBUSY, EPERM. Si
        // fa come `servizio`, con un nome numerato accanto — e la copia
        // occupata non si segna come aggiornata, perché non lo è: la prossima
        // richiesta riprova sul nome vero.
        const altrove = await this.copiaAccanto(destinazione, contenuto)
        if (altrove === null) throw errore
        return altrove
      }
      this.copie.set(dentro, impronta)
      await this.scriviCopie()
      return destinazione
    })
  }

  /**
   * Scrive la copia sotto un nome numerato accanto a quello vero —
   * `Verifica (2).pdf` — e ne torna l'indirizzo, o null se nessuno va.
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
      const dove = apparato.Uri.joinPath(destinazione, '..', `${radice} (${copia})${estensione}`)
      try {
        await apparato.file.writeFile(dove, contenuto)
        return dove
      } catch {
        // Occupato anche questo: si prova il prossimo nome.
      }
    }
    return null
  }

  /**
   * Butta via la copia materializzata di un file: il contrario di
   * `materializza`.
   *
   * La chiama `elimina`, e non ha nessun altro motivo di esistere: un file che
   * non è più nel documento non deve restare leggibile da fuori. Un fallimento
   * non si segnala — la copia di un file che non c'è più è al massimo spazio
   * occupato, e la prossima chiusura dell'anno se la porta via comunque.
   */
  async smaterializza (relativo: string): Promise<void> {
    const dentro = dentroIlDocumento(relativo)
    await this.inFila(async () => {
      const nota = this.copie.delete(dentro)
      try {
        await apparato.file.delete(this.percorsoCopia(dentro), { useTrash: false })
      } catch {
        // Non era mai stata materializzata, o qualcuno l'ha aperta in un altro
        // programma: nel primo caso non c'è niente da fare, nel secondo se ne
        // va chiudendo l'anno.
      }
      if (nota) await this.scriviCopie()
    })
  }

  /**
   * Le operazioni sulle copie, una dopo l'altra.
   *
   * Materializzare e smaterializzare lo stesso file sono due scritture sullo
   * stesso posto, e arrivano da due parti che non si parlano: un'eliminazione
   * che non aspetta il disco e una pagina che chiede un indirizzo. Intrecciate,
   * la cancellazione può arrivare dopo la copia rifatta e portarsi via un file
   * che serviva — e resta un indirizzo buono che non apre niente. In fila, no.
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
   * Materializza tutto quel che sta sotto un percorso e torna la cartella.
   *
   * Serve a «mostra nel gestore file»: là non si apre un file, si apre una
   * cartella, e dev'esserci tutto quel che ci si aspetta di vedere.
   */
  async materializzaSotto (prefisso: string): Promise<apparato.Uri | null> {
    const dentro = dentroIlDocumento(prefisso)
    const voci = this.elenca(dentro)
    if (voci.length === 0) return null
    for (const voce of voci) await this.materializza(voce)
    return this.percorsoCopia(dentro)
  }

  /**
   * Riporta dentro il documento un file che era stato materializzato.
   *
   * È la strada di ritorno per chi ha scritto sulla copia: un programma esterno
   * che ha annotato un PDF, o un pezzo del registro che ancora scrive su file.
   * Torna vero se qualcosa è cambiato davvero.
   */
  async assorbi (relativo: string): Promise<boolean> {
    const dentro = dentroIlDocumento(relativo)
    const copia = this.percorsoCopia(dentro)
    let contenuto: Uint8Array
    try {
      contenuto = await apparato.file.readFile(copia)
    } catch {
      return false
    }
    const impronta = crc32(contenuto)
    if (this.copie.get(dentro) === impronta) return false
    this.scrivi(dentro, contenuto)
    this.copie.set(dentro, impronta)
    await this.scriviCopie()
    return true
  }

  /**
   * Butta via le copie: sono copie, e il documento è la verità.
   *
   * Si chiama chiudendo un anno. Se non riesce non fa niente di male — la
   * prossima materializzazione le rifarebbe comunque — e per questo non
   * segnala errori a nessuno.
   */
  async smonta (): Promise<void> {
    this.copie.clear()
    this.copieLette = false
    try {
      await apparato.file.delete(this.radiceCopie, { recursive: true, useTrash: false })
    } catch {
      // Non c'era, o un file è aperto in un altro programma: le copie che
      // restano verranno riconosciute vecchie e riscritte.
    }
  }

  /**
   * Un file di servizio: un ritaglio da guardare, un'anteprima, roba che nasce
   * per essere aperta subito e non deve entrare nel documento.
   *
   * Sta con le copie materializzate, e come quelle sparisce quando si chiude
   * l'anno. Metterla dentro il documento vorrebbe dire farsi crescere un anno
   * scolastico di anteprime che nessuno guarderà mai più.
   */
  async servizio (nome: string, dati: Uint8Array): Promise<apparato.Uri | null> {
    const pulito = nomeSicuro(nome) || 'file'
    const punto = pulito.lastIndexOf('.')
    const radice = punto > 0 ? pulito.slice(0, punto) : pulito
    const estensione = punto > 0 ? pulito.slice(punto) : ''

    // Il nome che si legge nella finestra del lettore è questo, e si rifà
    // uguale a ogni giro: il file di prima si riscrive, che è quel che si vuole
    // — sono ritagli da guardare, non roba da tenere. Ma se il lettore lo sta
    // ancora tenendo aperto, Windows non lascia riscriverlo: allora si numera,
    // invece di dire che il ritaglio non si è potuto fare.
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
   * La cartella in cui vivono le copie di quest'anno.
   *
   * È la radice da cui i webview compongono gli indirizzi delle immagini che
   * mostrano: `radice/archivio/…/Rossi Maria.jpg`. I file dentro non ci sono
   * finché nessuno li chiede — li mette il protocollo, al volo, quando la
   * pagina li domanda: vedi `materializzaChiesto`.
   */
  radice (): apparato.Uri | null {
    return this.documento() ? this.percorsoCopia('') : null
  }

  /**
   * Materializza il file che sta dietro un indirizzo chiesto da una pagina.
   *
   * Il webview chiede `…/materializzati/2026-2027/archivio/DIC4a/foto.jpg`, e
   * quella copia può non esserci ancora: si guarda che percorso sarebbe dentro
   * il documento, e se là c'è, si scrive. Torna vero se adesso il file c'è.
   *
   * È il pezzo che permette a tutto il resto del registro di continuare a
   * ragionare per percorsi: nessuna pagina sa che i file stanno dentro un
   * archivio, e nessuna deve saperlo.
   */
  async materializzaChiesto (assoluto: apparato.Uri): Promise<boolean> {
    const radice = this.radice()
    if (!radice) return false
    const dentro = radice.path.endsWith('/') ? radice.path : `${radice.path}/`
    if (!assoluto.path.startsWith(dentro)) return false
    const relativo = decodeURIComponent(assoluto.path.slice(dentro.length))
    return (await this.materializza(relativo)) !== null
  }

  /** Dove finisce la copia di un file: sotto `userData`, con la stessa struttura. */
  private percorsoCopia (dentro: string): apparato.Uri {
    const documento = this.documento()
    const anno = nomeSicuro(documento?.nome ?? 'anno') || 'anno'
    const pezzi = dentro === '' ? [] : dentro.split('/')
    return apparato.Uri.joinPath(this.radiceCopie, anno, ...pezzi)
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
      // Prima volta, o file rovinato: si riparte senza copie note, e al massimo
      // si riestrae qualcosa che c'era già.
    }
  }

  private async scriviCopie (): Promise<void> {
    try {
      await apparato.file.writeFile(
        this.percorsoRegistroCopie,
        new TextEncoder().encode(`${JSON.stringify(Object.fromEntries(this.copie), null, 2)}\n`),
      )
    } catch {
      // Se non si scrive, la prossima sessione riestrae: è una scorciatoia, non
      // un dato.
    }
  }
}

async function esiste (uri: apparato.Uri): Promise<boolean> {
  try {
    await apparato.file.stat(uri)
    return true
  } catch {
    return false
  }
}

/**
 * Il percorso vero di un file dell'anno, da dare a chi sa aprire solo i file.
 *
 * Prima si guarda dentro il documento, che è dove i file stanno adesso; se là
 * non c'è, si guarda sul disco, dove stanno quelli di un anno non ancora
 * assorbito o messi lì a mano da qualcuno. Il ripiego non è una gentilezza: una
 * cartella sincronizzata può portare un anno vecchio da un'altra macchina, e un
 * riferimento che punta a un file che c'è non deve rispondere «non c'è».
 */
export async function percorsoVero (relativo: string): Promise<apparato.Uri | null> {
  const dentro = await deposito()?.materializza(relativo)
  if (dentro) return dentro
  const fuori = fileAllegato(relativo)
  return fuori && (await esiste(fuori)) ? fuori : null
}

/**
 * Il contenuto di un file dell'anno, senza materializzarlo.
 *
 * È la via da preferire quando il file serve solo per essere letto — allegato a
 * una mail, disegnato dentro un PDF, mandato a pdfjs come byte: non si scrive
 * niente sul disco, e non resta niente da ripulire. Come `percorsoVero`,
 * ripiega su quel che sta ancora fuori.
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
 * Il deposito dell'anno aperto.
 *
 * Un solo posto in cui vive, come per l'anno in uso in `paths.ts` e per il
 * portachiavi: chi archivia un documento sta scrivendo dentro *quel* documento,
 * e passarsi il deposito di mano in mano per venti funzioni non aggiungerebbe
 * niente se non venti parametri.
 *
 * `null` prima che un anno sia aperto: chi scrive deve accorgersene e dirlo,
 * non inventare un posto dove mettere le cose.
 */
let inUso: Deposito | null = null

export function registraDeposito (deposito: Deposito): void {
  inUso = deposito
}

/** Il deposito dell'anno aperto, o null se non ce n'è ancora uno. */
export function deposito (): Deposito | null {
  return inUso
}
