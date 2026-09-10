// Un archivio ZIP letto e scritto a mano.
//
// Il registro tiene i dati di un anno in un file solo — `2026-27.registro` — e
// quel file è uno ZIP vero, non un formato nostro con dentro qualcosa di
// compresso. La differenza conta il giorno in cui il registro non parte: uno
// ZIP lo apre qualunque cosa, dal gestore file di Windows a `unzip` su una
// macchina che non ha mai visto questa applicazione, e dentro ci sono i JSON di
// sempre. Un formato inventato, invece, si legge solo con il programma che lo
// ha scritto — cioè proprio quello che non funziona.
//
// Da qui la scelta di scriverlo da soli invece di aggiungere una libreria: di
// ZIP serve la fetta piccola — voci in `deflate` grezzo o non compresse, nomi
// UTF-8, nessuna cifratura, nessun archivio in più volumi — e `node:zlib` fa
// già la parte difficile. Duecento righe qui costano meno di una dipendenza in
// più da tenere aggiornata per sempre in un'applicazione che gira nelle scuole.
//
// Quel che *non* si fa è altrettanto importante:
//
//   - niente ZIP64. Sopra i quattro gigabyte, o oltre le 65 535 voci, lo ZIP
//     cambia formato; qui dentro ci sono JSON di un anno scolastico, e il
//     limite non si avvicina nemmeno. Se un giorno si avvicinasse, la
//     scrittura si ferma e lo dice invece di produrre un archivio storto;
//   - niente cartelle come voci proprie. Le cartelle in uno ZIP sono un
//     accessorio: `.storico/classi.2026-09-01.json` basta a sé, e chi
//     spacchetta crea quel che serve.
//
// L'ordine delle voci è quello in cui arrivano, e chi scrive lo tiene stabile:
// due salvataggi con gli stessi dati devono dare due archivi uguali, o il file
// risulterebbe cambiato a ogni giro e la cartella sincronizzata avrebbe sempre
// qualcosa da caricare.

import { deflateRaw, deflateRawSync, inflateRawSync } from 'node:zlib'

/** Una voce dell'archivio: il nome com'è dentro lo ZIP, e il suo contenuto. */
export interface VoceZip {
  /** Il percorso dentro l'archivio, sempre con `/`: `.storico/classi.2026-09-01.json`. */
  nome: string
  dati: Uint8Array
  /** Quando è stata scritta: lo ZIP la porta al secondo pari, ed è già abbastanza. */
  modificata?: Date
}

/** Le firme dei tre blocchi che compongono un archivio. */
const FIRMA_LOCALE = 0x04034b50
const FIRMA_CENTRALE = 0x02014b50
const FIRMA_CODA = 0x06054b50

/** Le lunghezze fisse, prima del nome: servono a scorrere senza contare a mano. */
const TESTA_LOCALE = 30
const TESTA_CENTRALE = 46
const CODA = 22

/** Il metodo di compressione: niente, o `deflate` grezzo. */
const NIENTE = 0
const DEFLATE = 8

/** Il bit che dichiara i nomi in UTF-8. Senza, gli accenti dipendono dal paese. */
const NOMI_UTF8 = 0x0800

/** La versione minima che serve per aprirlo: 2.0, cioè `deflate` e basta. */
const VERSIONE = 20

/** Lo ZIP non conosce date prima del 1980: quel che viene prima si porta lì. */
const PRIMO_ANNO_DOS = 1980

export class ErroreZip extends Error {
  constructor (messaggio: string) {
    super(messaggio)
    this.name = 'ErroreZip'
  }
}

// ------------------------------------------------------------------- il CRC

/**
 * La tavola del CRC-32, calcolata una volta sola al primo uso.
 *
 * Lo ZIP porta il CRC di ogni voce, e non è un ornamento: è il solo modo che ha
 * chi legge di accorgersi che l'archivio è arrivato rotto — una
 * sincronizzazione a metà, una chiavetta staccata — invece di consegnare un
 * JSON troncato che poi qualcuno interpreta.
 */
let tavola: Int32Array | null = null

function tavolaCrc (): Int32Array {
  if (tavola) return tavola
  const nuova = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let valore = n
    for (let bit = 0; bit < 8; bit += 1) {
      valore = valore & 1 ? 0xedb88320 ^ (valore >>> 1) : valore >>> 1
    }
    nuova[n] = valore
  }
  tavola = nuova
  return nuova
}

/** Il CRC-32 di un blocco di byte, nella forma senza segno che lo ZIP scrive. */
export function crc32 (dati: Uint8Array): number {
  const tabella = tavolaCrc()
  let crc = -1
  for (let i = 0; i < dati.length; i += 1) {
    crc = tabella[(crc ^ dati[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ -1) >>> 0
}

// ------------------------------------------------------------------ le date

/** Ora e data nel formato del DOS, che è quello che lo ZIP porta con sé. */
function dataDos (quando: Date): { ora: number, data: number } {
  const anno = Math.max(quando.getFullYear(), PRIMO_ANNO_DOS)
  const ora = ((quando.getHours() & 0x1f) << 11) |
    ((quando.getMinutes() & 0x3f) << 5) |
    (Math.floor(quando.getSeconds() / 2) & 0x1f)
  const data = (((anno - PRIMO_ANNO_DOS) & 0x7f) << 9) |
    (((quando.getMonth() + 1) & 0x0f) << 5) |
    (quando.getDate() & 0x1f)
  return { ora, data }
}

/** La strada di ritorno: da ora e data del DOS a una data vera. */
function daDataDos (ora: number, data: number): Date {
  return new Date(
    PRIMO_ANNO_DOS + ((data >> 9) & 0x7f),
    Math.max(((data >> 5) & 0x0f) - 1, 0),
    Math.max(data & 0x1f, 1),
    (ora >> 11) & 0x1f,
    (ora >> 5) & 0x3f,
    (ora & 0x1f) * 2,
  )
}

// ---------------------------------------------------------------- scrittura

/**
 * Una voce già compressa, pronta da mettere in un archivio.
 *
 * È il pezzo che permette di non rifare due volte lo stesso lavoro. Un anno
 * scolastico è per nove decimi il suo storico — le copie di com'erano le
 * collezioni, che una volta scritte non cambiano mai più — e ricomprimerlo a
 * ogni salvataggio costava trentacinque millisecondi buoni per riscrivere byte
 * identici a quelli di prima. Tenendo il blocco compresso così com'è, la
 * riscrittura di un anno costa quanto la sola collezione che è cambiata.
 *
 * Il CRC e la data sono quelli originali, e devono restarlo: sono quel che dice
 * a chi legge che il blocco è arrivato intero.
 */
export interface VocePronta {
  nome: string
  /** Il corpo come finisce nell'archivio: compresso, o tale e quale. */
  corpo: Buffer
  metodo: number
  crc: number
  /** Quanto misura una volta decompresso. */
  originale: number
  ora: number
  data: number
}

/**
 * I due livelli di compressione, e perché sono due.
 *
 * `CORRENTE` è per le collezioni, che si riscrivono a ogni modifica: su un anno
 * intero il livello massimo guadagna novecento byte e costa tre millisecondi in
 * più — tre millisecondi ogni volta, per sempre, contro un guadagno che si
 * rifonde a ogni riscrittura. Non conviene.
 *
 * `DEFINITIVO` è per quel che si scrive una volta e non si tocca più: le copie
 * dello storico quando un anno viene impacchettato. Là il conto si rovescia —
 * il tempo si paga una volta, i byte restano risparmiati a ogni
 * sincronizzazione — e sono otto kilobyte su un anno.
 */
export const CORRENTE = 6
export const DEFINITIVO = 9

/** Quel che serve sapere di una voce, per scriverne l'indice. */
interface VoceScritta extends VocePronta {
  bytesNome: Buffer
  offset: number
}

/** La testa locale di una voce: quel che precede il suo corpo nell'archivio. */
function testaLocale (voce: VocePronta, nome: Buffer): Buffer {
  const testa = Buffer.alloc(TESTA_LOCALE)
  testa.writeUInt32LE(FIRMA_LOCALE, 0)
  testa.writeUInt16LE(VERSIONE, 4)
  testa.writeUInt16LE(NOMI_UTF8, 6)
  testa.writeUInt16LE(voce.metodo, 8)
  testa.writeUInt16LE(voce.ora, 10)
  testa.writeUInt16LE(voce.data, 12)
  testa.writeUInt32LE(voce.crc, 14)
  testa.writeUInt32LE(voce.corpo.length, 18)
  testa.writeUInt32LE(voce.originale, 22)
  testa.writeUInt16LE(nome.length, 26)
  testa.writeUInt16LE(0, 28)
  return testa
}

/** Da contenuto a blocco pronto: è qui che si comprime, e una volta sola. */
export function comprimi (voce: VoceZip, livello = CORRENTE): VocePronta {
  const originale = Buffer.from(voce.dati.buffer, voce.dati.byteOffset, voce.dati.byteLength)
  return conCorpo(voce, originale, deflateRawSync(originale, { level: livello }))
}

/**
 * Lo stesso, senza fermare chi chiama.
 *
 * `deflate` di cento kilobyte sono frazioni di millisecondo, ma sono frazioni
 * spese nel processo che disegna le finestre: la versione asincrona le sposta
 * nel pool di thread, e il registro resta reattivo mentre salva.
 */
export async function comprimiAsync (voce: VoceZip, livello = CORRENTE): Promise<VocePronta> {
  const originale = Buffer.from(voce.dati.buffer, voce.dati.byteOffset, voce.dati.byteLength)
  const compressa = await new Promise<Buffer>((risolvi, rifiuta) => {
    deflateRaw(originale, { level: livello }, (errore, esito) => {
      if (errore) rifiuta(errore)
      else risolvi(esito)
    })
  })
  return conCorpo(voce, originale, compressa)
}

/**
 * Sceglie fra il compresso e l'originale.
 *
 * La compressione si scarta se non serve: su un JSON di trenta righe `deflate`
 * produce più byte dell'originale, e una voce non compressa è più facile da
 * recuperare a mano il giorno che serve.
 */
function conCorpo (voce: VoceZip, originale: Buffer, compressa: Buffer): VocePronta {
  const conviene = compressa.length < originale.length
  const { ora, data } = dataDos(voce.modificata ?? new Date())
  return {
    nome: voce.nome,
    corpo: conviene ? compressa : originale,
    metodo: conviene ? DEFLATE : NIENTE,
    crc: crc32(voce.dati),
    originale: originale.length,
    ora,
    data,
  }
}

/**
 * Mette insieme l'archivio da blocchi già pronti.
 *
 * Qui non si comprime niente: si scrivono teste, indice e coda, e si concatena.
 * Sono i due millisecondi che restano di un salvataggio.
 */
export function assembla (pronte: VocePronta[]): Buffer {
  if (pronte.length > 0xffff) {
    throw new ErroreZip(`troppe voci per un archivio semplice: ${pronte.length}`)
  }

  const pezzi: Buffer[] = []
  const scritte: VoceScritta[] = []
  let offset = 0

  for (const voce of pronte) {
    const bytesNome = Buffer.from(voce.nome, 'utf8')
    const testa = testaLocale(voce, bytesNome)
    pezzi.push(testa, bytesNome, voce.corpo)
    scritte.push({ ...voce, bytesNome, offset })
    offset += testa.length + bytesNome.length + voce.corpo.length
  }

  const inizioIndice = offset
  for (const voce of scritte) {
    const testa = Buffer.alloc(TESTA_CENTRALE)
    testa.writeUInt32LE(FIRMA_CENTRALE, 0)
    testa.writeUInt16LE(VERSIONE, 4)
    testa.writeUInt16LE(VERSIONE, 6)
    testa.writeUInt16LE(NOMI_UTF8, 8)
    testa.writeUInt16LE(voce.metodo, 10)
    testa.writeUInt16LE(voce.ora, 12)
    testa.writeUInt16LE(voce.data, 14)
    testa.writeUInt32LE(voce.crc, 16)
    testa.writeUInt32LE(voce.corpo.length, 20)
    testa.writeUInt32LE(voce.originale, 24)
    testa.writeUInt16LE(voce.bytesNome.length, 28)
    testa.writeUInt16LE(0, 30)
    testa.writeUInt16LE(0, 32)
    testa.writeUInt16LE(0, 34)
    testa.writeUInt16LE(0, 36)
    // Attributi esterni: 0644 nella metà alta, che è come Unix li legge.
    // Windows ignora il campo; senza, chi spacchetta su Linux si ritrova file
    // con i permessi a caso.
    testa.writeUInt32LE(0o644 << 16, 38)
    testa.writeUInt32LE(voce.offset, 42)
    pezzi.push(testa, voce.bytesNome)
    offset += testa.length + voce.bytesNome.length
  }

  const coda = Buffer.alloc(CODA)
  coda.writeUInt32LE(FIRMA_CODA, 0)
  coda.writeUInt16LE(0, 4)
  coda.writeUInt16LE(0, 6)
  coda.writeUInt16LE(scritte.length, 8)
  coda.writeUInt16LE(scritte.length, 10)
  coda.writeUInt32LE(offset - inizioIndice, 12)
  coda.writeUInt32LE(inizioIndice, 16)
  coda.writeUInt16LE(0, 20)
  pezzi.push(coda)

  if (offset + CODA > 0xffffffff) {
    throw new ErroreZip('archivio troppo grande per il formato semplice (4 GB)')
  }
  return Buffer.concat(pezzi)
}

/** Comprime e impacchetta in un colpo solo: la via breve, per chi non riusa niente. */
export function scriviZip (voci: VoceZip[], livello = CORRENTE): Buffer {
  // La funzione si chiama con un argomento solo e non si passa a `map` per
  // riferimento: `map` darebbe l'indice come secondo argomento, e la prima
  // voce di ogni archivio finirebbe al livello zero — cioè non compressa —
  // senza che niente lo dica.
  return assembla(voci.map((voce) => comprimi(voce, livello)))
}

// ------------------------------------------------------------------ lettura

/** Dove comincia la coda dell'archivio, cercandola dal fondo. */
function inizioCoda (dati: Buffer): number {
  // La coda è lunga 22 byte più un commento che può arrivare a 64 KB: si
  // guarda indietro fin lì e non oltre, perché una firma trovata più su
  // sarebbe dentro i dati di una voce e non la coda vera.
  const minimo = Math.max(0, dati.length - CODA - 0xffff)
  for (let i = dati.length - CODA; i >= minimo; i -= 1) {
    if (dati.readUInt32LE(i) === FIRMA_CODA) return i
  }
  return -1
}

/**
 * Una voce letta da un archivio: il blocco com'era, e il modo di aprirlo.
 *
 * `dati()` decomprime e verifica, e lo fa solo quando qualcuno chiede davvero
 * quel contenuto. Finché nessuno lo chiede, la voce resta il blocco compresso
 * che era — pronto per essere riscritto senza passare da `inflate` e `deflate`,
 * che su uno storico di dieci copie per collezione è tutto il costo di un
 * salvataggio.
 */
export interface VoceLetta extends VocePronta {
  dati (): Buffer
  modificata: Date
}

/**
 * Apre un archivio e ne torna le voci, nell'ordine dell'indice.
 *
 * Quel che si verifica subito è la struttura: firme, offset, indice. Il
 * contenuto di una voce si verifica con il proprio CRC quando lo si apre — un
 * blocco arrivato a metà si ferma lì, con il nome del file dentro il messaggio,
 * invece di consegnare un JSON troncato a chi lo interpreta.
 */
export function apriZip (contenuto: Uint8Array): VoceLetta[] {
  const dati = Buffer.from(contenuto.buffer, contenuto.byteOffset, contenuto.byteLength)
  if (dati.length < CODA) throw new ErroreZip('non è un archivio: troppo corto')

  const coda = inizioCoda(dati)
  if (coda < 0) throw new ErroreZip('non è un archivio: manca la coda')

  const quante = dati.readUInt16LE(coda + 10)
  let posizione = dati.readUInt32LE(coda + 16)
  const voci: VoceLetta[] = []

  for (let n = 0; n < quante; n += 1) {
    if (
      posizione + TESTA_CENTRALE > dati.length ||
      dati.readUInt32LE(posizione) !== FIRMA_CENTRALE
    ) {
      throw new ErroreZip(`indice dell’archivio rovinato alla voce ${n + 1}`)
    }
    const metodo = dati.readUInt16LE(posizione + 10)
    const ora = dati.readUInt16LE(posizione + 12)
    const data = dati.readUInt16LE(posizione + 14)
    const crc = dati.readUInt32LE(posizione + 16)
    const compressa = dati.readUInt32LE(posizione + 20)
    const originale = dati.readUInt32LE(posizione + 24)
    const lunghezzaNome = dati.readUInt16LE(posizione + 28)
    const extra = dati.readUInt16LE(posizione + 30)
    const commento = dati.readUInt16LE(posizione + 32)
    const dove = dati.readUInt32LE(posizione + 42)
    const inizioNome = posizione + TESTA_CENTRALE
    const nome = dati.toString('utf8', inizioNome, inizioNome + lunghezzaNome)
    posizione = inizioNome + lunghezzaNome + extra + commento

    // Le cartelle dichiarate come voci si saltano: qui i nomi portano già il
    // proprio percorso, e una voce vuota che finisce con `/` non è un file.
    if (nome.endsWith('/')) continue

    if (dove + TESTA_LOCALE > dati.length || dati.readUInt32LE(dove) !== FIRMA_LOCALE) {
      throw new ErroreZip(`la voce «${nome}» non si trova dove l’indice dice`)
    }
    if (metodo !== NIENTE && metodo !== DEFLATE) {
      throw new ErroreZip(`la voce «${nome}» usa una compressione che non conosco (${metodo})`)
    }
    const inizio = dove + TESTA_LOCALE + dati.readUInt16LE(dove + 26) + dati.readUInt16LE(dove + 28)
    if (inizio + compressa > dati.length) {
      throw new ErroreZip(`la voce «${nome}» finisce oltre la fine dell’archivio`)
    }
    // Una copia del blocco e non una finestra sull'archivio intero: senza,
    // tenere in memoria la più piccola delle voci terrebbe in vita tutto il
    // file da cui viene.
    const corpo = Buffer.from(dati.subarray(inizio, inizio + compressa))

    let aperto: Buffer | null = null
    voci.push({
      nome,
      corpo,
      metodo,
      crc,
      originale,
      ora,
      data,
      modificata: daDataDos(ora, data),
      dati (): Buffer {
        if (aperto) return aperto
        aperto = decomprimi(nome, corpo, metodo, crc, originale)
        return aperto
      },
    })
  }

  return voci
}

/** Apre un blocco e ne verifica il contenuto. */
function decomprimi (
  nome: string,
  corpo: Buffer,
  metodo: number,
  crcAtteso: number,
  originale: number,
): Buffer {
  let contenuto: Buffer
  if (metodo === NIENTE) {
    contenuto = corpo
  } else {
    try {
      contenuto = inflateRawSync(corpo)
    } catch (errore) {
      const detto = errore instanceof Error ? errore.message : String(errore)
      throw new ErroreZip(`la voce «${nome}» non si decomprime: ${detto}`)
    }
  }
  if (contenuto.length !== originale || crc32(contenuto) !== crcAtteso) {
    throw new ErroreZip(`la voce «${nome}» è rovinata: il controllo non torna`)
  }
  return contenuto
}

/**
 * L'archivio aperto per intero, contenuti compresi.
 *
 * È `apriZip` con tutte le voci già decompresse e verificate: la via comoda per
 * chi le vuole tutte comunque — le prove, e chi guarda dentro un documento da
 * fuori.
 */
export function leggiZip (contenuto: Uint8Array): VoceZip[] {
  return apriZip(contenuto).map((voce) => ({
    nome: voce.nome,
    dati: voce.dati(),
    modificata: voce.modificata,
  }))
}

/** Vero se quei byte cominciano come un archivio ZIP. Serve a dare l'errore giusto. */
export function sembraZip (contenuto: Uint8Array): boolean {
  return (
    contenuto.length >= 4 &&
    contenuto[0] === 0x50 &&
    contenuto[1] === 0x4b &&
    (contenuto[2] === 0x03 || contenuto[2] === 0x05) &&
    (contenuto[3] === 0x04 || contenuto[3] === 0x06)
  )
}
