// La cartella dei modelli: quali ci sono, come ce ne arriva uno, come se ne va.
//
// Un modello del linguaggio, qui, è **un file**: un `.gguf`, il formato con cui
// llama.cpp impacchetta pesi, vocabolario e metadati in un pezzo solo. Un file
// si scarica, si trascina dentro una finestra, si copia da una chiavetta e si
// cancella — che è esattamente quel che chi insegna sa già fare, e che con un
// servizio da installare e un comando da battere non si poteva.
//
// Questo file governa **dove stanno** e **che cosa ci entra**. Chi li fa
// parlare è un'altra cosa: `llamaCpp.ts` e `mtmd.ts`.
//
// ----------------------------------------------------------------- dove stanno
//
// Nei dati dell'applicazione — `userData`, accanto a impostazioni e preferenze
// — e non nella cartella di lavoro del docente. Sono due o quattro gigabyte per
// file: dentro la cartella del materiale finirebbero nelle copie, nelle
// sincronizzazioni e nei backup di una cartella che deve restare leggera, e su
// una chiavetta da 32 GB finirebbero al posto dei documenti.
//
// Si sposta con un'impostazione, e quella è la via per chi tiene già i propri
// `.gguf` altrove: si dice al registro dove sono e li vede tutti, senza
// copiarne nemmeno uno.
//
// ------------------------------------------------------------ che cosa ci entra
//
// Tre strade, e due di loro portano un file da fuori:
//
//   scaricato    da Hugging Face, con l'indirizzo composto da `huggingFace.ts`
//   trascinato   sulla pagina dei modelli
//   scelto       con il dialogo «Carica un file»
//
// Su tutte e tre passa la stessa guardia, e non è l'estensione: **i primi
// quattro byte devono dire `GGUF`.** Un file rinominato `.gguf` che `.gguf` non
// è non diventa un modello perché si chiama così, e quel che ci si guadagna non
// è sicurezza contro un avversario — è che chi ha trascinato il PDF sbagliato
// lo sappia subito, invece di scoprirlo fra dieci minuti quando il caricamento
// dei pesi muore con un messaggio che parla di tensori.
//
// Il nome viene ripulito con `nomeSicuro`, come ogni altro nome di file che il
// registro scrive: quel che arriva da fuori non decide un percorso.
//
// ---------------------------------------------------------------- il proiettore
//
// Un modello che **guarda** sta in due file: i pesi del linguaggio e l'`mmproj`
// — il proiettore multimodale — che trasforma un'immagine in qualcosa che il
// linguaggio sappia leggere. Sono due `.gguf` e stanno nella stessa cartella;
// si riconoscono dal nome, che per convenzione di llama.cpp comincia o contiene
// `mmproj`. La pagina li mostra come una cosa sola, ma qui restano due file,
// perché due file sono.

import * as apparato from 'apparato'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  closeSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import * as percorso from 'node:path'

import { nomeSicuro, senzaVirgolette } from '../domain/text.js'
import { cartellaApplicazione } from './appData.js'
import { modulo } from './nodeLlama.js'

/** La sottocartella dei modelli, dentro i dati dell'applicazione. */
const CARTELLA = 'modelli-linguistici'

/** L'estensione, l'unica. */
export const ESTENSIONE = '.gguf'

/** I quattro byte con cui comincia un file GGUF, e che nessun altro formato ha. */
const MAGIA = 'GGUF'

/**
 * Come si chiama un modello mentre sta ancora scendendo.
 *
 * Chi scarica scrive in `modello.gguf.ipull` e rinomina in `modello.gguf`
 * soltanto alla fine. È la convenzione della libreria che fa lo scarico, ed è
 * quel che permette a un'interruzione di riprendere da dove era arrivata invece
 * che da capo.
 *
 * Per noi vale soprattutto al contrario: **finché il nome finisce così, quel
 * file non è un modello.** L'elenco lo mostra come «sceso a metà» e la guardia
 * non lo risolve, perché dei pesi troncati caricati sono un errore che parla di
 * tensori a chi voleva sapere quante assenze ha una classe.
 */
const IN_CORSO = '.ipull'

/**
 * Il biglietto che dice da dove veniva uno scarico lasciato a metà.
 *
 * Serve al tasto «Riprendi», e serve perché **il file a metà non lo dice**. Il
 * `.ipull` della libreria porta a che punto era arrivata — quali pezzi ha già
 * presi — e non l'indirizzo da cui li prendeva: riprendere vuol dire rifare lo
 * stesso scarico, e per rifarlo bisogna sapere qual era. Senza questo biglietto
 * l'unica strada era ritrovare il deposito a mano nel catalogo, cioè ricordarsi
 * da dove veniva un file sceso ieri.
 *
 * Un file accanto e non un elenco altrove: sta nella stessa cartella dei pesi,
 * se ne va con loro quando si butta, e una cartella copiata su un'altra
 * macchina si porta dietro anche da dove veniva quel che c'è dentro.
 */
const SORGENTE = '.sorgente.json'

/**
 * Come si riconosce un proiettore multimodale.
 *
 * Non c'è un campo nel formato che lo dichiari — o meglio: c'è nei metadati, ma
 * leggerli vuol dire aprire il file e interpretarne l'intestazione, cioè fare
 * il lavoro di llama.cpp per sapere una cosa che il nome dice già. Chi pubblica
 * un `mmproj` lo chiama `mmproj`: è la convenzione di tutto l'ecosistema, ed è
 * quella che la pagina usa per non proporre un proiettore come modello.
 */
const PROIETTORE = /mmproj/i

// --------------------------------------------------------------- la cartella

/**
 * Dove stanno i modelli.
 *
 * L'impostazione vince, se dice un percorso assoluto: è la via di chi tiene già
 * i propri `.gguf` in una cartella sua — quella di un altro programma, un disco
 * esterno — e non vuole una seconda copia da quattro gigabyte. Un percorso
 * relativo si ignora invece di risolverlo contro la cartella corrente, che nel
 * main process non vuol dire niente di utile.
 */
export function cartellaModelli (): string {
  const scritta = senzaVirgolette(
    apparato.impostazioni.leggi('registroDocenti').get<string>('modelli.cartella', ''),
  )
  if (scritta !== '' && percorso.isAbsolute(scritta)) return scritta
  return percorso.join(cartellaApplicazione(), CARTELLA)
}

/** La cartella, creata se non c'era. La chiama chi sta per scriverci. */
function cartellaPronta (): string {
  const cartella = cartellaModelli()
  mkdirSync(cartella, { recursive: true })
  return cartella
}

// ------------------------------------------------------------ che cosa c'è

/** Un modello che sta sul disco, come la pagina lo mostra. */
export interface ModelloLocale {
  /** Il nome del file, con l'estensione: è anche la chiave che si sceglie. */
  nome: string
  /** Quanto pesa. Si mostra perché è il numero che decide se ci sta. */
  byte: number
  /** Se è un proiettore multimodale e non un modello da scegliere. */
  proiettore: boolean
  /**
   * Uno scarico che non è mai arrivato in fondo.
   *
   * Non si può scegliere e non si può usare: si può soltanto buttare, o
   * riprendere rilanciando lo stesso scarico. Si mostra — e prima non si
   * mostrava — perché altrimenti sarebbero gigabyte invisibili: un'applicazione
   * chiusa a metà scarico lascia il file lì, e nessuno può accorgersene
   * guardando la pagina.
   */
  incompiuto?: boolean
  /**
   * Da dove veniva, per i soli file a metà.
   *
   * Sta qui e non in una tabella a parte perché chi guarda l'elenco è chi deve
   * decidere se riprenderlo o buttarlo, e quella decisione si prende sapendo
   * che cos'era. Assente quando il biglietto non c'è: uno scarico cominciato
   * da una versione precedente, o un file copiato a mano nella cartella.
   */
  sorgente?: Sorgente
}

/**
 * I `.gguf` nella cartella, in ordine di nome, con dentro quel che è sceso a
 * metà.
 *
 * Non ricorsiva: una cartella di modelli è una cartella di file, e scendere
 * negli alberi vorrebbe dire decidere che cosa fare di un modello spezzato in
 * più pezzi dentro una sottocartella — cosa che llama.cpp sa già ricomporre da
 * sé quando i pezzi stanno accanto.
 *
 * **I file a metà si mostrano, marcati.** Prima si saltavano, e per la ragione
 * giusta — offrirli come modelli vorrebbe dire far caricare dei pesi tronchi —
 * ma saltarli del tutto li rendeva invisibili: un'applicazione chiusa mentre
 * scaricava lascia due gigabyte in quella cartella, e nessuno poteva vederli né
 * toglierli dalla pagina. Marcarli `incompiuto` tiene tutte e due le cose:
 * `modelloNellaCartella` continua a non risolverli, e chi guarda sa che sono lì.
 */
/** Da dove veniva uno scarico: quel che serve per rifarlo identico. */
export interface Sorgente {
  /** Il deposito di Hugging Face: «bartowski/Qwen2.5-7B-Instruct-GGUF». */
  deposito: string
  /** Il file dentro quel deposito. */
  file: string
  /** Per quale mestiere era stato chiesto, se per uno. */
  per?: 'assistente' | 'ocr'
}

/** Dove sta il biglietto di un file: accanto a lui, con lo stesso nome. */
function biglietto (nome: string): string {
  const pulito = nome.replace(new RegExp(`${IN_CORSO}$`, 'i'), '')
  return percorso.join(cartellaModelli(), `${pulito}${SORGENTE}`)
}

/** Scrive da dove sta venendo quel che scende. */
export function segnaSorgente (nome: string, sorgente: Sorgente): void {
  try {
    mkdirSync(cartellaModelli(), { recursive: true })
    writeFileSync(biglietto(nome), JSON.stringify(sorgente), 'utf8')
  } catch (guasto) {
    // Un biglietto che non si scrive non ferma uno scarico da due gigabyte:
    // si perde il tasto «Riprendi» per quel file, e si dice nel giornale.
    console.error('[gguf] non riesco a segnare da dove viene lo scarico:', guasto)
  }
}

/** Da dove veniva, se il biglietto c'è ed è leggibile. */
export function sorgenteDi (nome: string): Sorgente | null {
  try {
    const letto: unknown = JSON.parse(readFileSync(biglietto(nome), 'utf8'))
    if (typeof letto !== 'object' || letto === null) return null
    const { deposito, file, per } = letto as Partial<Sorgente>
    if (typeof deposito !== 'string' || typeof file !== 'string') return null
    if (deposito === '' || file === '') return null
    return { deposito, file, ...(per === 'assistente' || per === 'ocr' ? { per } : {}) }
  } catch {
    // Non c'è, o è scritto storto: si risponde «non si sa», e chi chiede
    // mostra la riga senza il tasto invece di un tasto che non può funzionare.
    return null
  }
}

/** Butta il biglietto: lo scarico è finito, o quel che era sceso non c'è più. */
export function dimenticaSorgente (nome: string): void {
  rmSync(biglietto(nome), { force: true })
}

export function modelliLocali (): ModelloLocale[] {
  const cartella = cartellaModelli()
  let voci: string[]
  try {
    voci = readdirSync(cartella)
  } catch {
    // La cartella non c'è ancora: non è un guasto, è un registro su cui non si
    // è mai scaricato niente.
    return []
  }
  const peso = (nome: string): number => {
    try {
      return statSync(percorso.join(cartella, nome)).size
    } catch {
      // Sparito fra la lettura della cartella e adesso — succede proprio
      // durante uno scarico, quando il file viene rinominato: si mostra a zero
      // invece di far cadere l'elenco intero.
      return 0
    }
  }
  return voci
    .filter((nome) => {
      const minuscolo = nome.toLowerCase()
      return minuscolo.endsWith(ESTENSIONE) || minuscolo.endsWith(ESTENSIONE + IN_CORSO)
    })
    .map((nome) => {
      const incompiuto = nome.toLowerCase().endsWith(IN_CORSO)
      // Il biglietto si legge solo per i file a metà: per un modello finito
      // «da dove veniva» non serve a nessuno, e sarebbe una lettura di disco
      // per riga a ogni apertura della pagina.
      const sorgente = incompiuto ? sorgenteDi(nome) : null
      return {
        nome,
        byte: peso(nome),
        proiettore: PROIETTORE.test(nome),
        ...(incompiuto ? { incompiuto: true } : {}),
        ...(sorgente ? { sorgente } : {}),
      }
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
}

/**
 * Il percorso intero di un modello, se quel modello sta davvero nella cartella.
 *
 * **È la guardia di `llm.ts`**, ed è per questo che il nome ci passa dentro
 * invece di essere usato com'è. Nelle impostazioni ci va un nome di file; il
 * valore arriva da un JSON in `userData`, cioè da un file che qualsiasi
 * programma sulla macchina può riscrivere. Senza questa riga, cambiare una voce
 * lì dentro basterebbe a far caricare al registro un file qualunque del disco
 * scelto da chi l'ha riscritta — o a far leggere `../../` di qualcos'altro.
 *
 * Torna `''` quando non si può: chi chiama deve poter dire «il modello non c'è,
 * ecco come rimediare» invece di scoppiare.
 */
export function modelloNellaCartella (nome: string): string {
  const pulito = nome.trim()
  if (pulito === '') return ''
  // Solo un nome di file: niente separatori, niente risalite, niente lettere
  // di unità. Un percorso, qui, non è un modello — è un tentativo.
  if (pulito !== percorso.basename(pulito)) return ''
  // Un `.gguf` e basta: quel che finisce in `.ipull` sta ancora scendendo, e
  // caricare dei pesi tronchi è un errore che parla di tensori a chi voleva
  // sapere quante assenze ha una classe.
  if (percorso.extname(pulito).toLowerCase() !== ESTENSIONE) return ''
  const intero = percorso.join(cartellaModelli(), pulito)
  try {
    return statSync(intero).isFile() ? intero : ''
  } catch {
    return ''
  }
}

// ------------------------------------------------------------- che cosa entra

/** I primi quattro byte di un file, quando si riescono a leggere. */
function primiByte (file: string): string {
  let maniglia: number | null = null
  try {
    maniglia = openSync(file, 'r')
    const testa = Buffer.alloc(4)
    readSync(maniglia, testa, 0, 4, 0)
    return testa.toString('latin1')
  } catch {
    return ''
  } finally {
    if (maniglia !== null) closeSync(maniglia)
  }
}

/** Se quel file è un GGUF davvero, e non soltanto di nome. */
function èGguf (file: string): boolean {
  return primiByte(file) === MAGIA
}

/**
 * Perché quel file non si può prendere, o `''` se si può.
 *
 * Una frase e non un booleano: chi trascina dentro la cosa sbagliata deve
 * leggere *che cosa* ha trascinato, non «non valido».
 */
export function perchéNonEntra (file: string): string {
  const pulito = senzaVirgolette(file)
  if (pulito === '' || !percorso.isAbsolute(pulito)) return 'Non è un file che si possa leggere.'
  let esiste = false
  try {
    esiste = statSync(pulito).isFile()
  } catch {
    esiste = false
  }
  if (!esiste) return `«${percorso.basename(pulito)}» non è un file.`
  if (percorso.extname(pulito).toLowerCase() !== ESTENSIONE) {
    return `«${percorso.basename(pulito)}» non è un file .gguf: i modelli hanno questa estensione.`
  }
  if (!èGguf(pulito)) {
    return (
      `«${percorso.basename(pulito)}» si chiama .gguf ma non lo è: dentro non c'è un modello.`
    )
  }
  return ''
}

/**
 * Se quel nome è già preso, in uno qualunque dei tre modi in cui lo può essere.
 *
 * Il `.gguf` finito è il caso ovvio. Gli altri due no, e sono quelli che
 * facevano il danno: due scarichi diversi che `nomeSicuro` appiattisce sullo
 * stesso nome — è quel che succede a due quantizzazioni dello stesso modello
 * prese da depositi diversi — trovavano libero un nome su cui c'era già un
 * `.gguf.ipull` a metà, e ci scrivevano sopra. Il secondo riprendeva i pezzi
 * del primo, il biglietto del primo diceva il deposito del secondo, e quel che
 * ne usciva era un file che si chiama come uno dei due e non è né l'uno né
 * l'altro — senza che niente, da nessuna parte, l'avesse detto.
 */
function occupato (cartella: string, nome: string): boolean {
  return [nome, nome + IN_CORSO, nome + SORGENTE]
    .some((quale) => existsSync(percorso.join(cartella, quale)))
}

/**
 * Un nome libero nella cartella, partendo da quello che il file aveva.
 *
 * Non si sovrascrive mai: due modelli con lo stesso nome sono due modelli, e
 * quello di prima potrebbe essere quello che l'assistente sta usando in questo
 * momento — o quello che sta ancora scendendo. Si aggiunge un numero, come fa
 * qualunque cartella di scarichi.
 */
function nomeLibero (cartella: string, proposto: string): string {
  const base = nomeSicuro(percorso.basename(proposto, ESTENSIONE)) || 'modello'
  let nome = `${base}${ESTENSIONE}`
  let contatore = 2
  while (occupato(cartella, nome)) {
    nome = `${base}-${contatore}${ESTENSIONE}`
    contatore += 1
  }
  return nome
}

/**
 * Porta un `.gguf` nella cartella dei modelli, copiandolo.
 *
 * Copia e non sposta: il file che si trascina dentro è di chi lo ha trascinato,
 * e un programma che lo fa sparire dalla cartella Scaricati è un programma che
 * si prende le cose. Costa il tempo di scrivere qualche gigabyte, e si fa una
 * volta sola.
 *
 * Solleva con la frase di `perchéNonEntra`: è quella che la pagina mostra.
 */
export function importa (file: string): ModelloLocale {
  const perché = perchéNonEntra(file)
  if (perché !== '') throw new Error(perché)
  const sorgente = senzaVirgolette(file)
  const cartella = cartellaPronta()
  // Già nostro: chi trascina dentro un file che sta già nella cartella non ne
  // vuole una seconda copia, vuole vederlo nell'elenco — e c'è già.
  if (percorso.dirname(sorgente) === cartella) {
    const nome = percorso.basename(sorgente)
    return { nome, byte: statSync(sorgente).size, proiettore: PROIETTORE.test(nome) }
  }
  const nome = nomeLibero(cartella, sorgente)
  const arrivato = percorso.join(cartella, nome)
  copyFileSync(sorgente, arrivato)
  return { nome, byte: statSync(arrivato).size, proiettore: PROIETTORE.test(nome) }
}

/**
 * Toglie un modello dalla cartella.
 *
 * Passa per `modelloNellaCartella`, quindi cancella soltanto dentro la cartella
 * dei modelli e soltanto un `.gguf`: il nome arriva da una procedura, cioè da
 * fuori, e una cancellazione è la cosa che non si disfa.
 */
export function elimina (nome: string): void {
  const file = modelloNellaCartella(nome) || parzialeNellaCartella(nome)
  if (file === '') throw new Error(`«${nome}» non è fra i modelli scaricati.`)
  rmSync(file, { force: true })
  // Il biglietto se ne va con i pesi: da solo sarebbe un indirizzo appeso a un
  // file che non c'è più, e la riga «Riprendi» non ha più niente da riprendere.
  dimenticaSorgente(nome)
}

/**
 * Il percorso di uno scarico lasciato a metà, se è lì.
 *
 * Passa dalle stesse guardie del modello finito — un nome di file, dentro la
 * cartella — e ne aggiunge una: il nome deve finire in `.gguf.ipull`. Serve a
 * «Butta», che è l'unica cosa che si può fare con dei pesi a metà, e che senza
 * questa riga non avrebbe niente da cancellare: `modelloNellaCartella` quei
 * file li rifiuta, ed è giusto che continui a rifiutarli.
 */
function parzialeNellaCartella (nome: string): string {
  const pulito = nome.trim()
  if (pulito === '' || pulito !== percorso.basename(pulito)) return ''
  if (!pulito.toLowerCase().endsWith(ESTENSIONE + IN_CORSO)) return ''
  const intero = percorso.join(cartellaModelli(), pulito)
  try {
    return statSync(intero).isFile() ? intero : ''
  } catch {
    return ''
  }
}

// ------------------------------------------------------------- che cosa scende

/** A che punto è uno scarico: lo mostra la pagina, mentre scende. */
export interface Avanzamento {
  /** Quanto è già sul disco. */
  byte: number
  /** Quanto sarà in tutto, o `0` finché non si sa. */
  totale: number
}

export interface Scarico {
  /** L'indirizzo, come lo compone `huggingFace.ts`: `hf:utente/deposito/file`. */
  uri: string
  /** Come si chiamerà il file, se si vuole imporlo. */
  nome?: string
  /** Mentre scende. */
  al?: (avanzamento: Avanzamento) => void
  /** Per fermarlo: lo preme chi chiude la pagina o preme «Annulla». */
  segnale?: AbortSignal
  /**
   * Da dove viene, da scrivere accanto a quel che scende.
   *
   * Non serve allo scarico — l'indirizzo è già in `uri` — ma a quello dopo:
   * un'applicazione chiusa a metà lascia i pesi troncati e nient'altro, e
   * senza questo biglietto «Riprendi» non saprebbe che cosa rifare.
   */
  sorgente?: Sorgente
}

/**
 * Scarica un modello nella cartella.
 *
 * Lo scarico vero lo fa `node-llama-cpp`, e non è pigrizia: sa ricomporre i
 * modelli spezzati in più file — `modello-00001-di-00009.gguf`, che è come
 * vengono pubblicati quelli grandi —, riprende quel che era rimasto a metà, e
 * apre più connessioni in parallelo, che su una linea di scuola è la differenza
 * fra venti minuti e un'ora. Riscriverlo qui vorrebbe dire riscrivere tutto
 * questo peggio.
 *
 * **Quel che non gli si lascia fare è scegliere dove.** La cartella è la
 * nostra, il nome passa da `nomeSicuro`, e quel che torna è il nome del file
 * come sta sul disco — non l'indirizzo da cui è venuto.
 *
 * Annullare cancella quel che era sceso a metà: un file tronco nella cartella
 * dei modelli è un modello che sembra esserci e non si carica.
 */
export async function scarica (scarico: Scarico): Promise<ModelloLocale> {
  const { createModelDownloader } = await modulo()
  const cartella = cartellaPronta()
  const nome = scarico.nome ? nomeLibero(cartella, scarico.nome) : undefined

  // Il biglietto prima di cominciare, non dopo: se l'applicazione si chiude a
  // metà scarico — ed è il caso per cui esiste — dopo non c'è nessun «dopo».
  if (nome && scarico.sorgente) segnaSorgente(nome, scarico.sorgente)

  const scaricatore = await createModelDownloader({
    modelUri: scarico.uri,
    dirPath: cartella,
    ...(nome ? { fileName: nome } : {}),
    onProgress: ({ downloadedSize, totalSize }) => {
      scarico.al?.({ byte: downloadedSize, totale: totalSize })
    },
    // Quel che è sceso a metà se ne va con l'annullo: vedi sopra.
    deleteTempFileOnCancel: true,
  })

  let file: string
  try {
    file = await scaricatore.download(
      scarico.segnale ? { signal: scarico.segnale } : {},
    )
  } catch (guasto) {
    // L'annullo esce di qui **in due modi**, e per un pezzo se ne guardava uno
    // solo. Se la libreria fa in tempo a chiudere lo scarico per conto suo,
    // `download()` torna come se niente fosse — il percorso di un file che non
    // c'è — ed è il caso che il controllo qui sotto copriva già; se invece
    // l'annullo la coglie dentro la richiesta, `download()` **rilancia la
    // ragione dell'annullo**, e allora tutto quel che viene dopo, biglietto
    // compreso, non gira. Un biglietto senza pesi accanto resta in cartella per
    // sempre: invisibile nell'elenco, che mostra i file, e fuori portata di
    // «Elimina», che cancella quel che nell'elenco c'è. Quale dei due modi sia
    // dipende dal momento, cioè da niente su cui si possa contare: si trattano
    // uguali.
    if (scarico.segnale?.aborted) {
      // Fermato a mano: la libreria ha già cancellato quel che era sceso, e un
      // biglietto per un file che non c'è più è un «Riprendi» che non riprende
      // niente.
      if (nome) dimenticaSorgente(nome)
      throw new Error('Scarico fermato.', { cause: guasto })
    }
    // Rotto per conto suo — la linea caduta, il deposito che risponde male —
    // e allora il biglietto **resta**: il `.ipull` a metà è ancora lì, ed è
    // esattamente il caso per cui «Riprendi» esiste.
    throw guasto
  }
  // L'altro dei due modi: `download()` è tornato, e il segnale è tirato. Si
  // dice così, e non si va a guardare il file — chi annulla cancella anche quel
  // che era sceso, e uno `statSync` su un file che non c'è più risponderebbe
  // «ENOENT: no such file or directory»: un messaggio che parla di un percorso
  // a chi ha appena premuto «Ferma», e che nel giornale sembrerebbe un guasto
  // del disco.
  if (scarico.segnale?.aborted) {
    if (nome) dimenticaSorgente(nome)
    throw new Error('Scarico fermato.')
  }

  const scritto = percorso.basename(file)
  // La guardia dei primi quattro byte, anche su questa strada.
  //
  // La nota in testa al file dice che su tutte e tre passa la stessa guardia, e
  // su questa non passava: si guardava che il file esistesse, non che cosa
  // fosse. Basta un proxy della scuola che risponde con la sua pagina di
  // blocco, o un deposito che serve un HTML d'errore con esito 200, perché in
  // cartella resti un «modello» che si carica soltanto per morire con un
  // messaggio che parla di tensori — e che nell'elenco sembra a posto.
  //
  // Non è un'impronta: l'impronta di quel che sta su Hugging Face non la sa
  // nessuno qui, e inventarsela vorrebbe dire scriverla nel sorgente come per i
  // corredi, che sono tre file fissi e non un catalogo. Quattro byte dicono
  // «non è quello che credi», ed è la parte che si può dire con verità.
  if (!èGguf(file)) {
    rmSync(file, { force: true })
    dimenticaSorgente(scritto)
    throw new Error(
      `«${scritto}» è arrivato ma non è un modello: dentro non c’è un GGUF. ` +
      'L’ho cancellato. Controlla l’indirizzo, e se sei dietro a un proxy che ' +
      'filtra gli scarichi prendi il file a mano e trascinalo qui.',
    )
  }
  // Arrivato in fondo: da dove veniva non serve più a nessuno.
  dimenticaSorgente(scritto)
  try {
    return {
      nome: scritto,
      byte: statSync(file).size,
      proiettore: PROIETTORE.test(scritto),
    }
  } catch (guasto) {
    // Lo scarico si è dichiarato finito e il file non c'è: è raro e non è
    // nostro — disco pieno, cartella tolta da sotto, un antivirus che l'ha
    // messo in quarantena mentre scendeva — ma va detto con parole, perché chi
    // lo legge deve sapere che il modello *non* è arrivato.
    throw new Error(
      '«' + scritto + '» risulta scaricato ma non è nella cartella dei modelli.',
      { cause: guasto },
    )
  }
}
