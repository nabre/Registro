// Come il registro scarica un programma che non impacchetta (il «che cosa» sta
// in un file accanto, es. `visionKit.ts` per `llama-mtmd-cli`). Tutto resta
// nella cartella del corredo; un percorso scritto nelle impostazioni vince.
//
// Si scarica un eseguibile e lo si fa partire, perciò quattro guardie:
//   1. l'indirizzo è scritto per intero nel sorgente, mai composto da fuori;
//   2. la versione è fissa, mai «l'ultima»;
//   3. l'impronta SHA-256 si verifica prima del nome definitivo;
//   4. dall'archivio si estrae solo quel che serve, con nomi passati per `basename`.
// Lo scarico va in `nome.parziale`, riprende con `Range:` e racconta l'avanzamento.

import * as apparato from 'apparato'
import { createHash } from 'node:crypto'
import {
  createReadStream,
  createWriteStream,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import * as percorso from 'node:path'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import { cartellaApplicazione } from './appData.js'
import { apriZip } from './zip.js'
import { detto, type TestoPigro } from '../i18n/index.js'
import { testi } from './gguf.testi.js'

/** Il suffisso di quel che sta ancora scendendo. */
const IN_CORSO = '.parziale'

/**
 * Quanto silenzio si tollera prima di rinunciare: l'orologio riparte a ogni
 * pezzo che arriva. `AbortSignal.timeout` su `fetch` limiterebbe invece la
 * durata dell'intero scarico, anche del corpo.
 */
const ATTESA_MS = 30_000

/*
 * Il parametro `attesaMs` delle funzioni qui sotto lo abbassano solo le prove,
 * per provare la regola del silenzio senza aspettare trenta secondi.
 */

/** Ogni quanto si racconta a che punto si è: più spesso sarebbe rumore. */
const RESPIRO_MS = 250

// ----------------------------------------------------------------- un pacco

/** Di che genere è il pezzo: mentre scende si chiama in un modo o nell'altro. */
export type Pezzo = 'programma' | 'modello'

/** Un file da prendere, con tutto quel che serve per fidarsene. */
export interface Pacco {
  che: Pezzo
  /** Il nome da mostrare, pigro: si legge nella lingua di quando scende. */
  titolo: TestoPigro
  /** L'indirizzo, scritto per intero nel sorgente: vedi la guardia 1. */
  uri: string
  /** Il nome con cui scende nella cartella. Per un programma è un archivio. */
  archivio: string
  /** Quanto pesa, dichiarato: la barra ha un totale anche prima della risposta. */
  byte: number
  /** SHA-256 dell'intero file, in esadecimale: vedi la guardia 3. */
  impronta: string
  /** Il file che deve comparire nella cartella perché il pezzo ci sia davvero. */
  arrivo: string
  /**
   * Che cosa si estrae quando `archivio` è un archivio, il più stretto
   * possibile. Assente se il file scende già pronto all'uso.
   */
  tiene?: (nome: string) => boolean
}

/** A che punto è: lo racconta a chi sta aspettando. */
export interface Avanzamento {
  che: Pezzo
  /** Che cosa sta scendendo, nella lingua di adesso: «il programma che legge le scansioni». */
  titolo: string
  byte: number
  totale: number
  /**
   * L'ultimo avviso: il corredo è al suo posto. Non si deduce da
   * `byte === totale`, perché con più pacchi il primo ci arriva a metà.
   */
  finito?: boolean
}

// ---------------------------------------------------------------- la cartella

/**
 * Dove sta un corredo: nei dati dell'applicazione, fuori dalla cartella del
 * materiale che si sincronizza. Chi ha il programma altrove ne indica il file.
 */
export function cartellaDi (sotto: string): string {
  return percorso.join(cartellaApplicazione(), sotto)
}

/** Il percorso di un file dentro una cartella, se quel file c'è davvero. */
export function nellaCartella (cartella: string, nome: string): string {
  const intero = percorso.join(cartella, nome)
  try {
    return statSync(intero).isFile() ? intero : ''
  } catch {
    return ''
  }
}

/** Se il registro deve scaricare da sé quel che manca: un interruttore per tutti i corredi. */
export function scaricoAutomatico (): boolean {
  return apparato.impostazioni.leggi('registroDocenti').get<boolean>('modelli.scaricoAutomatico', true)
}

// ------------------------------------------------------------- che cosa scende

/**
 * L'impronta di un file sul disco, a file finito: con la ripresa, calcolarla
 * mentre scende vedrebbe solo la coda.
 */
async function impronta (file: string): Promise<string> {
  const conto = createHash('sha256')
  await pipeline(createReadStream(file), conto)
  return conto.digest('hex')
}

/** Se quel che sta sul disco è davvero quel pacco (guardia 3). */
async function suo (file: string, pacco: Pacco): Promise<boolean> {
  try {
    return await impronta(file) === pacco.impronta
  } catch {
    // Illeggibile vale come sbagliato: si riscarica.
    return false
  }
}

/** Dal nome provvisorio a quello vero: da chiamare solo dopo aver verificato l'impronta. */
function consegna (parziale: string, arrivo: string): string {
  rmSync(arrivo, { force: true })
  renameSync(parziale, arrivo)
  return arrivo
}

/**
 * L'errore quando l'orologio scatta: sito muto, o linea caduta a metà (e
 * allora quel che è sceso resta e si riprende).
 */
function silenzio (pacco: Pacco, arrivato: boolean): Error {
  const secondi = Math.round(ATTESA_MS / 1000)
  const titolo = detto(pacco.titolo)
  return new Error(
    arrivato ? testi().silenzioDopo(titolo, secondi) : testi().silenzio(titolo, secondi),
  )
}

/**
 * Scarica un file nella cartella, riprendendo se era a metà. Rinomina solo
 * dopo aver verificato l'impronta; se non torna, il parziale si cancella.
 */
async function prendi (
  pacco: Pacco,
  cartella: string,
  al?: (avanzamento: Avanzamento) => void,
  attesaMs: number = ATTESA_MS,
): Promise<string> {
  const arrivo = percorso.join(cartella, pacco.archivio)
  const parziale = arrivo + IN_CORSO

  let già = 0
  try {
    già = statSync(parziale).size
  } catch {
    già = 0
  }
  // Parziale già completo (interruzione fra l'ultimo byte e il rinomino): se
  // l'impronta torna, si consegna senza riscaricare.
  if (già === pacco.byte && await suo(parziale, pacco)) return consegna(parziale, arrivo)
  // Troppo lungo, o lungo giusto ma diverso: non è un pezzo di questo file.
  if (già >= pacco.byte) {
    rmSync(parziale, { force: true })
    già = 0
  }

  // L'orologio è nostro perché va riarmato a ogni pezzo: vedi `ATTESA_MS`.
  const fermo = new AbortController()
  let arrivato = false
  const sveglia = setTimeout(() => fermo.abort(), attesaMs)

  let sceso = già
  try {
    const risposta = await fetch(pacco.uri, {
      headers: già > 0 ? { range: `bytes=${già}-` } : {},
      signal: fermo.signal,
    }).catch((guasto: unknown) => {
      throw new Error(
        testi().connessione(detto(pacco.titolo)),
        { cause: guasto },
      )
    })
    if (!risposta.ok || !risposta.body) {
      throw new Error(testi().sitoRisponde(detto(pacco.titolo), risposta.status))
    }
    // Certi proxy ignorano `Range` e mandano il file da capo: si riparte da zero.
    const riprende = già > 0 && risposta.status === 206
    if (già > 0 && !riprende) già = 0

    sceso = già
    let ultimo = 0
    const conta = new Transform({
      transform (pezzo: Buffer, _codifica, avanti) {
        // Ogni pezzo riarma l'orologio: si misura il silenzio, non la durata.
        arrivato = true
        sveglia.refresh()
        sceso += pezzo.length
        const adesso = Date.now()
        if (al && adesso - ultimo >= RESPIRO_MS) {
          ultimo = adesso
          al({ che: pacco.che, titolo: detto(pacco.titolo), byte: sceso, totale: pacco.byte })
        }
        avanti(null, pezzo)
      },
    })

    await pipeline(
      Readable.fromWeb(risposta.body as Parameters<typeof Readable.fromWeb>[0]),
      conta,
      createWriteStream(parziale, { flags: riprende ? 'a' : 'w' }),
    )
  } catch (guasto) {
    // La scadenza arriva come `DOMException` («The operation was aborted») o
    // dentro l'errore di connessione: si sostituisce con un messaggio chiaro.
    if (fermo.signal.aborted) throw silenzio(pacco, arrivato)
    throw guasto
  } finally {
    // Sempre: acceso terrebbe vivo il ciclo degli eventi e potrebbe scattare
    // durante il calcolo dell'impronta.
    clearTimeout(sveglia)
  }
  al?.({ che: pacco.che, titolo: detto(pacco.titolo), byte: sceso, totale: pacco.byte })

  // Guardia 3: prima del nome definitivo.
  if (!await suo(parziale, pacco)) {
    rmSync(parziale, { force: true })
    throw new Error(testi().impronta(detto(pacco.titolo)))
  }
  return consegna(parziale, arrivo)
}

/**
 * Estrae dall'archivio quel che `tiene` accetta, con nomi passati per
 * `basename` (guardia 4; esportata per le prove). Torna quanti file sono
 * usciti: zero vuol dire archivio inatteso.
 */
export function scompatta (
  archivio: Uint8Array,
  cartella: string,
  tiene: (nome: string) => boolean,
): number {
  let quanti = 0
  for (const voce of apriZip(archivio).voci) {
    const nome = percorso.basename(voce.nome)
    if (!tiene(nome)) continue
    writeFileSync(percorso.join(cartella, nome), voce.dati())
    quanti += 1
  }
  return quanti
}

/**
 * Estrae in una cartella di fianco e sposta a estrazione finita, con il file
 * d'arrivo per ultimo: `porta()` salta i pacchi il cui file d'arrivo c'è, e
 * un'estrazione interrotta non deve lasciarne uno troncato.
 */
function estrai (archivio: string, cartella: string, pacco: Pacco): number {
  const tiene = pacco.tiene
  if (!tiene) return 0
  // Il pid nel nome: due registri aperti sulla stessa cartella non si pestano.
  const diFianco = percorso.join(cartella, `.estrazione-${process.pid}`)
  rmSync(diFianco, { recursive: true, force: true })
  mkdirSync(diFianco, { recursive: true })
  try {
    const quanti = scompatta(readFileSync(archivio), diFianco, tiene)
    if (quanti === 0) return 0
    const usciti = readdirSync(diFianco)
    const perUltimo = (nome: string): number => (nome === pacco.arrivo ? 1 : 0)
    for (const nome of [...usciti].sort((qua, là) => perUltimo(qua) - perUltimo(là))) {
      const dove = percorso.join(cartella, nome)
      rmSync(dove, { force: true })
      renameSync(percorso.join(diFianco, nome), dove)
    }
    return quanti
  } finally {
    rmSync(diFianco, { recursive: true, force: true })
  }
}

/**
 * Gli scarichi in corso, uno per cartella: chi chiede la stessa cosa mentre
 * scende aspetta la stessa promessa; cartelle diverse non si aspettano.
 */
const inCorso = new Map<string, {
  corsa: Promise<void>
  /** Chi ascolta l'avanzamento: tutti quelli che l'hanno chiesta, non solo il primo. */
  ascoltatori: Set<(avanzamento: Avanzamento) => void>
}>()

/**
 * Porta nella cartella quel che manca, raccontando l'avanzamento. `pacchi`
 * contiene solo quel che ha senso su questo sistema: il resto lo segnala la
 * prontezza di chi chiama.
 */
export function scarica (
  cartella: string,
  pacchi: readonly Pacco[],
  al?: (avanzamento: Avanzamento) => void,
  attesaMs: number = ATTESA_MS,
): Promise<void> {
  const già = inCorso.get(cartella)
  if (già) {
    if (al) già.ascoltatori.add(al)
    return già.corsa
  }
  const ascoltatori = new Set<(avanzamento: Avanzamento) => void>(al ? [al] : [])
  const aTutti = (avanzamento: Avanzamento): void => {
    for (const ascolta of ascoltatori) ascolta(avanzamento)
  }
  const corsa = porta(cartella, pacchi, aTutti, attesaMs).finally(() => {
    inCorso.delete(cartella)
  })
  inCorso.set(cartella, { corsa, ascoltatori })
  return corsa
}

/** Il lavoro vero di `scarica`, fuori dalla promessa condivisa. */
async function porta (
  cartella: string,
  pacchi: readonly Pacco[],
  al?: (avanzamento: Avanzamento) => void,
  attesaMs: number = ATTESA_MS,
): Promise<void> {
  mkdirSync(cartella, { recursive: true })

  let ultimo: Pacco | null = null
  for (const pacco of pacchi) {
    if (nellaCartella(cartella, pacco.arrivo) !== '') continue

    const sceso = await prendi(pacco, cartella, al, attesaMs)
    ultimo = pacco
    // Già al suo posto: i pesi scendono con il nome con cui si usano.
    if (!pacco.tiene) continue

    // Un archivio: si estrae, poi l'archivio si cancella.
    try {
      const quanti = estrai(sceso, cartella, pacco)
      if (quanti === 0) throw new Error(testi().nonDentro(pacco.archivio, pacco.arrivo))
    } catch (guasto) {
      throw new Error(
        testi().nonEstratto(
          detto(pacco.titolo),
          guasto instanceof Error ? guasto.message : String(guasto),
        ),
        { cause: guasto },
      )
    } finally {
      rmSync(sceso, { force: true })
    }
  }

  // Se non è sceso niente il corredo c'era già: nessun avviso.
  if (ultimo) {
    al?.({
      che: ultimo.che,
      titolo: detto(ultimo.titolo),
      byte: ultimo.byte,
      totale: ultimo.byte,
      finito: true,
    })
  }
}
