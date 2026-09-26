// Un archivio ZIP letto e scritto a mano: il documento `.regi` è uno ZIP vero,
// apribile da qualunque strumento anche se il registro non parte. Serve solo la
// fetta piccola (deflate grezzo o niente, nomi UTF-8) e `node:zlib` fa il resto.
// Niente ZIP64 (oltre 4 GB o 65 535 voci la scrittura si ferma) e niente voci
// per le cartelle. L'ordine delle voci è quello d'arrivo: stessi dati, stesso file.

import { kMaxLength } from 'node:buffer'
import { deflateRaw, deflateRawSync, inflateRawSync } from 'node:zlib'

import { testi } from './zip.testi.js'

/** Una voce dell'archivio: il nome com'è dentro lo ZIP, e il suo contenuto. */
interface VoceZip {
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

/** La tavola del CRC-32, calcolata al primo uso. Il CRC è ciò che scopre una voce arrivata rotta. */
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
 * Una voce già compressa, pronta per un archivio: lo storico, che non cambia,
 * si riscrive senza ricomprimerlo. CRC e data restano quelli originali.
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
 * Livelli di compressione. `CORRENTE` per le collezioni, riscritte spesso: il
 * massimo costerebbe tempo a ogni salvataggio per pochi byte. `DEFINITIVO` per
 * quel che si scrive una volta (lo storico): il tempo si paga una volta sola.
 */
export const CORRENTE = 6
export const DEFINITIVO = 9

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

/** Come `comprimi`, ma nel pool di thread: il processo principale resta reattivo. */
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
 * Sceglie fra compresso e originale: la compressione si scarta se non accorcia
 * (JSON piccoli, PDF e immagini già compressi).
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

/** Una voce già dentro un archivio: l'offset permette di riscrivere l'indice senza toccarla. */
export interface VoceCollocata extends VocePronta {
  /** Dove comincia la sua testa locale, dall'inizio del file. */
  offset: number
}

/** Quanto occupa una voce nel file: testa, nome, corpo. */
export function ingombro (voce: VocePronta): number {
  return TESTA_LOCALE + Buffer.byteLength(voce.nome, 'utf8') + voce.corpo.length
}

/** I corpi delle voci in fila da un offset dato, con la posizione di ognuna per l'indice. */
export function corpi (
  pronte: VocePronta[],
  da: number,
): { blocco: Buffer, collocate: VoceCollocata[] } {
  const pezzi: Buffer[] = []
  const collocate: VoceCollocata[] = []
  let offset = da

  for (const voce of pronte) {
    const bytesNome = Buffer.from(voce.nome, 'utf8')
    pezzi.push(testaLocale(voce, bytesNome), bytesNome, voce.corpo)
    collocate.push({ ...voce, offset })
    offset += TESTA_LOCALE + bytesNome.length + voce.corpo.length
  }
  return { blocco: Buffer.concat(pezzi), collocate }
}

/** L'indice centrale e la coda: le sole parti da riscrivere quando cambia qualcosa. */
export function indice (collocate: VoceCollocata[], da: number): Buffer {
  if (collocate.length > 0xffff) {
    throw new ErroreZip(testi().troppeVoci(collocate.length))
  }

  const pezzi: Buffer[] = []
  let lunghezza = 0

  for (const voce of collocate) {
    const bytesNome = Buffer.from(voce.nome, 'utf8')
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
    testa.writeUInt16LE(bytesNome.length, 28)
    testa.writeUInt16LE(0, 30)
    testa.writeUInt16LE(0, 32)
    testa.writeUInt16LE(0, 34)
    testa.writeUInt16LE(0, 36)
    // Attributi esterni: 0644 nella metà alta, per i permessi Unix (Windows li ignora).
    testa.writeUInt32LE(0o644 << 16, 38)
    testa.writeUInt32LE(voce.offset, 42)
    pezzi.push(testa, bytesNome)
    lunghezza += testa.length + bytesNome.length
  }

  const coda = Buffer.alloc(CODA)
  coda.writeUInt32LE(FIRMA_CODA, 0)
  coda.writeUInt16LE(0, 4)
  coda.writeUInt16LE(0, 6)
  coda.writeUInt16LE(collocate.length, 8)
  coda.writeUInt16LE(collocate.length, 10)
  coda.writeUInt32LE(lunghezza, 12)
  coda.writeUInt32LE(da, 16)
  coda.writeUInt16LE(0, 20)
  pezzi.push(coda)

  if (da + lunghezza + CODA > 0xffffffff) {
    throw new ErroreZip(testi().troppoGrande)
  }
  return Buffer.concat(pezzi)
}

/** Un archivio intero da blocchi già pronti: documento nuovo o compattazione. */
export function assembla (pronte: VocePronta[]): Buffer {
  const { blocco, collocate } = corpi(pronte, 0)
  return Buffer.concat([blocco, indice(collocate, blocco.length)])
}

/**
 * Che cosa accodare a un archivio perché diventi quello nuovo: voci nuove,
 * indice completo e coda. Uno ZIP si legge dalla coda, quindi le voci invariate
 * restano dove sono, si scrive quanto la modifica, e finché la coda nuova non è
 * scritta vale quella vecchia: un salvataggio interrotto lascia un documento
 * buono. Il prezzo è lo spazio morto (`spazioMorto`).
 */
export function daAccodare (
  restano: VoceCollocata[],
  nuove: VocePronta[],
  fineFile: number,
): { corpiNuovi: Buffer, coda: Buffer, da: number, collocate: VoceCollocata[] } {
  const { blocco: corpiNuovi, collocate: appena } = corpi(nuove, fineFile)
  const tutte = [...restano, ...appena]
  const inizioIndice = fineFile + corpiNuovi.length
  // Separati apposta: la coda deve arrivare sul disco dopo i corpi, e una
  // scrittura sola non garantisce l'ordine delle pagine.
  return { corpiNuovi, coda: indice(tutte, inizioIndice), da: fineFile, collocate: tutte }
}

/** I byte del file che l'indice non nomina più: versioni vecchie e indici superati. */
export function spazioMorto (collocate: VoceCollocata[], dimensioneFile: number): number {
  const vivi = collocate.reduce((totale, voce) => totale + ingombro(voce), 0)
  return Math.max(0, dimensioneFile - vivi)
}

/** Comprime e impacchetta in un colpo solo: la via breve, per chi non riusa niente. */
export function scriviZip (voci: VoceZip[], livello = CORRENTE): Buffer {
  // Non `map(comprimi)`: l'indice finirebbe come livello, e la prima voce a livello zero.
  return assembla(voci.map((voce) => comprimi(voce, livello)))
}

// ------------------------------------------------------------------ lettura

/**
 * Dove comincia la coda, cercandola dal fondo. Non si ferma ai 64 KB del
 * commento: dopo un salvataggio interrotto, sotto i corpi a metà c'è ancora la
 * coda buona. Vale solo una coda che punti a un indice vero, non una firma a caso.
 */
function inizioCoda (dati: Buffer): number {
  for (let i = dati.length - CODA; i >= 0; i -= 1) {
    if (dati.readUInt32LE(i) !== FIRMA_CODA) continue
    const dove = dati.readUInt32LE(i + 16)
    const quante = dati.readUInt16LE(i + 10)
    if (quante === 0) {
      // Archivio vuoto: l'indice comincia dove comincia la coda.
      if (dove === i) return i
      continue
    }
    if (dove + TESTA_CENTRALE > dati.length) continue
    if (dati.readUInt32LE(dove) !== FIRMA_CENTRALE) continue
    return i
  }
  return -1
}

/**
 * Una voce letta: `dati()` decomprime e verifica solo su richiesta, così la voce
 * si riscrive compressa com'è senza passare da inflate e deflate.
 */
interface VoceLetta extends VoceCollocata {
  dati (): Buffer
  modificata: Date
}

/** Un archivio aperto: le sue voci, e dove finisce quel che l'indice nomina. */
interface ZipAperto {
  voci: VoceLetta[]
  /**
   * Dove comincia l'indice. Chi accoda riparte dalla fine del file, non da qui:
   * l'indice di prima deve restare leggibile finché il nuovo non è scritto.
   */
  inizioIndice: number
  /** Quanto misura il file da cui viene: serve a calcolare lo spazio morto. */
  dimensione: number
}

/**
 * Apre un archivio e ne torna le voci in ordine d'indice. Subito si verifica la
 * struttura; il contenuto di ogni voce si verifica col CRC quando lo si apre.
 */
export function apriZip (contenuto: Uint8Array): ZipAperto {
  const dati = Buffer.from(contenuto.buffer, contenuto.byteOffset, contenuto.byteLength)
  if (dati.length < CODA) throw new ErroreZip(testi().troppoCorto)

  const coda = inizioCoda(dati)
  if (coda < 0) throw new ErroreZip(testi().senzaCoda)

  const quante = dati.readUInt16LE(coda + 10)
  const inizioIndice = dati.readUInt32LE(coda + 16)
  let posizione = inizioIndice
  const voci: VoceLetta[] = []

  for (let n = 0; n < quante; n += 1) {
    if (
      posizione + TESTA_CENTRALE > dati.length ||
      dati.readUInt32LE(posizione) !== FIRMA_CENTRALE
    ) {
      throw new ErroreZip(testi().indiceRovinato(n + 1))
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

    // Le voci-cartella (nome che finisce con `/`) si saltano.
    if (nome.endsWith('/')) continue

    if (dove + TESTA_LOCALE > dati.length || dati.readUInt32LE(dove) !== FIRMA_LOCALE) {
      throw new ErroreZip(testi().fuoriPosto(nome))
    }
    if (metodo !== NIENTE && metodo !== DEFLATE) {
      throw new ErroreZip(testi().compressioneIgnota(nome, metodo))
    }
    const inizio = dove + TESTA_LOCALE + dati.readUInt16LE(dove + 26) + dati.readUInt16LE(dove + 28)
    if (inizio + compressa > dati.length) {
      throw new ErroreZip(testi().oltreLaFine(nome))
    }
    // Copia, non finestra: una `subarray` terrebbe in vita l'intero file.
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
      offset: dove,
      modificata: daDataDos(ora, data),
      dati (): Buffer {
        if (aperto) return aperto
        aperto = decomprimi(nome, corpo, metodo, crc, originale)
        return aperto
      },
    })
  }

  return { voci, inizioIndice, dimensione: dati.length }
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
      // Tetto a quel che l'indice dichiara, contro i blocchi che si gonfiano;
      // almeno 1, il minimo che `zlib` accetta.
      const tetto = Math.min(Math.max(originale, 1), kMaxLength)
      contenuto = inflateRawSync(corpo, { maxOutputLength: tetto })
    } catch (errore) {
      const detto = errore instanceof Error ? errore.message : String(errore)
      throw new ErroreZip(testi().nonSiDecomprime(nome, detto))
    }
  }
  if (contenuto.length !== originale || crc32(contenuto) !== crcAtteso) {
    throw new ErroreZip(testi().rovinata(nome))
  }
  return contenuto
}

/** `apriZip` con tutte le voci già decompresse e verificate (prove, ispezioni). */
export function leggiZip (contenuto: Uint8Array): VoceZip[] {
  return apriZip(contenuto).voci.map((voce) => ({
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
