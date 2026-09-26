// La cartella dei modelli `.gguf`: quali ci sono, come ne arriva uno, come se ne
// va. A farli parlare sono `llamaCpp.ts` e `mtmd.ts`.
//
// Sta in `userData` (spostabile con un'impostazione), non nella cartella di
// lavoro: pesano gigabyte. Ci si entra scaricando, trascinando o scegliendo un
// file; su ogni strada i primi quattro byte devono dire `GGUF` e il nome passa
// da `nomeSicuro`. I proiettori `mmproj` sono `.gguf` a parte, accanto ai pesi.

import * as apparato from 'apparato'
import {
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  closeSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { copyFile } from 'node:fs/promises'
import * as percorso from 'node:path'

import { nomeSicuro, senzaVirgolette } from '../domain/text.js'
import { cartellaApplicazione } from './appData.js'
import { modulo } from './nodeLlama.js'
import { testi } from './gguf.testi.js'

/** La sottocartella dei modelli, dentro i dati dell'applicazione. */
const CARTELLA = 'modelli-linguistici'

/** L'estensione, l'unica. */
export const ESTENSIONE = '.gguf'

/** I quattro byte con cui comincia un file GGUF, e che nessun altro formato ha. */
const MAGIA = 'GGUF'

/**
 * Il suffisso di un file che sta ancora scendendo (convenzione della libreria
 * di scarico, che rinomina alla fine). Finché c'è, il file non è un modello.
 */
const IN_CORSO = '.ipull'

/**
 * Il suffisso del biglietto che dice da dove veniva uno scarico a metà: serve a
 * «Riprendi», perché il `.ipull` non conserva l'indirizzo. Sta accanto ai pesi
 * e viaggia con loro.
 */
const SORGENTE = '.sorgente.json'

/**
 * Come si riconosce un proiettore multimodale: dal nome, per convenzione
 * dell'ecosistema, invece di interpretare i metadati del file.
 */
const PROIETTORE = /mmproj/i

/**
 * Un pezzo di un modello spezzato: `nome-00002-of-00009.gguf`. llama.cpp li
 * ricompone dal primo, quindi l'elenco mostra solo il primo.
 */
const PEZZO = /^(.*)-(\d+)-of-(\d+)\.gguf(?:\.ipull)?$/i

/** Di quale modello spezzato è un pezzo, e quale, o `null` se è un file intero. */
function pezzoDi (nome: string): { radice: string, numero: number, di: string } | null {
  const trovato = PEZZO.exec(nome)
  if (!trovato) return null
  return { radice: trovato[1].toLowerCase(), numero: Number(trovato[2]), di: trovato[3] }
}

/**
 * I nomi finiti (senza `.ipull`) su cui questo processo sta scrivendo adesso.
 * Sul disco un `.ipull` vivo e uno caduto sono uguali: quello vivo non si
 * cancella né si riprende con un secondo scarico.
 */
const inScrittura = new Set<string>()

/**
 * Le copie in corso: il loro `.ipull` non si mostra nell'elenco. Se la copia
 * si interrompe, l'avanzo resta e si mostra come gli altri.
 */
const copieInCorso = new Set<string>()

// --------------------------------------------------------------- la cartella

/**
 * Dove stanno i modelli: l'impostazione, se è un percorso assoluto; un percorso
 * relativo si ignora, perché la cartella corrente del main non significa niente.
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
  /** Quanto pesa. */
  byte: number
  /** Se è un proiettore multimodale e non un modello da scegliere. */
  proiettore: boolean
  /**
   * Uno scarico mai arrivato in fondo: non si usa, si butta o si riprende. Si
   * mostra perché altrimenti sarebbero gigabyte invisibili.
   */
  incompiuto?: boolean
  /** Da dove veniva, per i soli file a metà; assente se il biglietto manca. */
  sorgente?: Sorgente
}

/** Da dove veniva uno scarico: quel che serve per rifarlo identico. */
interface Sorgente {
  /** Il deposito di Hugging Face: «bartowski/Qwen2.5-7B-Instruct-GGUF». */
  deposito: string
  /** Il file dentro quel deposito. */
  file: string
  /** Per quale mestiere era stato chiesto, se per uno. */
  per?: 'assistente' | 'ocr'
}

/** Il nome finito di un file, senza il `.ipull` di quel che sta scendendo. */
function senzaInCorso (nome: string): string {
  return nome.replace(new RegExp(`${IN_CORSO}$`, 'i'), '')
}

/** Dove sta il biglietto di un file: accanto a lui, con lo stesso nome. */
function biglietto (nome: string): string {
  return percorso.join(cartellaModelli(), `${senzaInCorso(nome)}${SORGENTE}`)
}

/** Scrive da dove sta venendo quel che scende. */
export function segnaSorgente (nome: string, sorgente: Sorgente): void {
  try {
    mkdirSync(cartellaModelli(), { recursive: true })
    writeFileSync(biglietto(nome), JSON.stringify(sorgente), 'utf8')
  } catch (guasto) {
    // Non ferma lo scarico: si perde solo «Riprendi» per quel file.
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
    // Assente o storto: la riga si mostra senza «Riprendi».
    return null
  }
}

/** Butta il biglietto: lo scarico è finito, o quel che era sceso non c'è più. */
function dimenticaSorgente (nome: string): void {
  rmSync(biglietto(nome), { force: true })
}

/**
 * I `.gguf` nella cartella (non ricorsiva), in ordine di nome. I file a metà
 * compaiono marcati `incompiuto`; `modelloNellaCartella` continua a rifiutarli.
 */
export function modelliLocali (): ModelloLocale[] {
  const cartella = cartellaModelli()
  let voci: string[]
  try {
    voci = readdirSync(cartella)
  } catch {
    // La cartella non c'è ancora: nessun modello, non un guasto.
    return []
  }
  const peso = (nome: string): number => {
    try {
      return statSync(percorso.join(cartella, nome)).size
    } catch {
      // Sparito nel frattempo (rinominato a fine scarico): zero, non un elenco caduto.
      return 0
    }
  }
  return voci
    .filter((nome) => {
      const minuscolo = nome.toLowerCase()
      return minuscolo.endsWith(ESTENSIONE) || minuscolo.endsWith(ESTENSIONE + IN_CORSO)
    })
    // I pezzi dopo il primo di un modello spezzato: vedi `PEZZO`.
    .filter((nome) => (pezzoDi(nome)?.numero ?? 1) <= 1)
    // Una copia che sta arrivando non è uno scarico a metà: vedi `copieInCorso`.
    .filter((nome) => !(
      nome.toLowerCase().endsWith(IN_CORSO) && copieInCorso.has(senzaInCorso(nome))
    ))
    .map((nome) => {
      const incompiuto = nome.toLowerCase().endsWith(IN_CORSO)
      // Il biglietto solo per i file a metà: evita una lettura di disco per riga.
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
 * Il percorso intero di un modello se sta davvero nella cartella, `''`
 * altrimenti. È la guardia di `llm.ts`: il nome viene da un JSON riscrivibile
 * e non deve poter indicare un file qualunque del disco.
 */
export function modelloNellaCartella (nome: string): string {
  const pulito = nome.trim()
  if (pulito === '') return ''
  // Solo un nome di file: niente separatori, risalite o lettere di unità.
  if (pulito !== percorso.basename(pulito)) return ''
  // Solo `.gguf`: un `.ipull` sono pesi tronchi.
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

/** Perché quel file non si può prendere, come frase da mostrare, o `''` se si può. */
export function perchéNonEntra (file: string): string {
  const pulito = senzaVirgolette(file)
  if (pulito === '' || !percorso.isAbsolute(pulito)) return testi().nonLeggibile
  let esiste = false
  try {
    esiste = statSync(pulito).isFile()
  } catch {
    esiste = false
  }
  if (!esiste) return testi().nonFile(percorso.basename(pulito))
  if (percorso.extname(pulito).toLowerCase() !== ESTENSIONE) {
    return testi().nonGguf(percorso.basename(pulito))
  }
  if (!èGguf(pulito)) {
    return testi().finto(percorso.basename(pulito))
  }
  return ''
}

/**
 * Se quel nome è già preso: dal `.gguf` finito, da un `.ipull` a metà o da un
 * biglietto. Senza gli ultimi due, due scarichi che `nomeSicuro` appiattisce
 * sullo stesso nome si mescolerebbero.
 */
function occupato (cartella: string, nome: string): boolean {
  return [nome, nome + IN_CORSO, nome + SORGENTE]
    .some((quale) => existsSync(percorso.join(cartella, quale)))
}

/**
 * Se quel nome è uno scarico caduto della stessa sorgente (stesso deposito e
 * file), da riprendere invece di ripartire da zero con `-2`. Uno scarico ancora
 * in corso in questo processo non è caduto.
 */
function riprendibile (cartella: string, nome: string, sorgente?: Sorgente): boolean {
  if (!sorgente || inScrittura.has(nome)) return false
  if (existsSync(percorso.join(cartella, nome))) return false
  if (!existsSync(percorso.join(cartella, nome + IN_CORSO))) return false
  const scritta = sorgenteDi(nome)
  return scritta !== null
    && scritta.deposito === sorgente.deposito
    && scritta.file === sorgente.file
}

/**
 * Un nome libero nella cartella, partendo da quello proposto e aggiungendo un
 * numero: non si sovrascrive mai, salvo lo scarico da riprendere (`riprendibile`).
 */
function nomeLibero (cartella: string, proposto: string, sorgente?: Sorgente): string {
  const base = nomeSicuro(percorso.basename(proposto, ESTENSIONE)) || 'modello'
  let nome = `${base}${ESTENSIONE}`
  let contatore = 2
  while (!riprendibile(cartella, nome, sorgente) && occupato(cartella, nome)) {
    nome = `${base}-${contatore}${ESTENSIONE}`
    contatore += 1
  }
  return nome
}

/** Dove va a finire un `.gguf` che si porta dentro, o il modello se è già nella cartella. */
function destinazione (file: string): { già: ModelloLocale } | {
  sorgente: string
  cartella: string
  nome: string
} {
  const perché = perchéNonEntra(file)
  if (perché !== '') throw new Error(perché)
  const sorgente = senzaVirgolette(file)
  const cartella = cartellaPronta()
  // Già nella cartella: nessuna seconda copia.
  if (percorso.dirname(sorgente) === cartella) {
    const nome = percorso.basename(sorgente)
    return { già: { nome, byte: statSync(sorgente).size, proiettore: PROIETTORE.test(nome) } }
  }
  return { sorgente, cartella, nome: nomeLibero(cartella, sorgente) }
}

/**
 * Copia (non sposta) un `.gguf` nella cartella dei modelli. Scrive su `.ipull`
 * e rinomina alla fine, così una copia interrotta non sembra un modello; è
 * asincrona per non bloccare il main per minuti. Solleva con la frase di
 * `perchéNonEntra`.
 */
export async function importaInDisparte (file: string): Promise<ModelloLocale> {
  const dove = destinazione(file)
  // testo-fisso: il nome di un campo, non una frase
  if ('già' in dove) return dove.già
  const { sorgente, cartella, nome } = dove
  const arrivato = percorso.join(cartella, nome)
  const aMetà = arrivato + IN_CORSO
  inScrittura.add(nome)
  copieInCorso.add(nome)
  try {
    await copyFile(sorgente, aMetà)
    renameSync(aMetà, arrivato)
  } catch (guasto) {
    rmSync(aMetà, { force: true })
    throw guasto
  } finally {
    inScrittura.delete(nome)
    copieInCorso.delete(nome)
  }
  return { nome, byte: statSync(arrivato).size, proiettore: PROIETTORE.test(nome) }
}

/**
 * Toglie un modello dalla cartella. Il nome viene da fuori, quindi passa dalle
 * guardie: cancella solo dentro la cartella e solo `.gguf` o `.gguf.ipull`.
 */
export function elimina (nome: string): void {
  const file = modelloNellaCartella(nome) || parzialeNellaCartella(nome)
  if (file === '') throw new Error(testi().nonScaricato(nome))
  // Quel che sta ancora scendendo non si cancella da sotto la libreria, primo
  // pezzo di un modello spezzato compreso.
  if (inScrittura.has(senzaInCorso(nome.trim()))) {
    throw new Error(testi().staArrivando(senzaInCorso(nome.trim())))
  }
  rmSync(file, { force: true })
  // Il biglietto se ne va con i pesi.
  dimenticaSorgente(nome)
  eliminaFratelli(nome.trim())
}

/**
 * Toglie gli altri pezzi di un modello spezzato quando se ne toglie il primo,
 * perché l'elenco mostra solo quello. Non tocca pezzi di altri modelli o in scrittura.
 */
function eliminaFratelli (nome: string): void {
  const primo = pezzoDi(nome)
  if (!primo || primo.numero !== 1) return
  let voci: string[]
  try {
    voci = readdirSync(cartellaModelli())
  } catch {
    return
  }
  for (const voce of voci) {
    const pezzo = pezzoDi(voce)
    if (!pezzo || pezzo.numero <= 1) continue
    if (pezzo.radice !== primo.radice || pezzo.di !== primo.di) continue
    if (inScrittura.has(senzaInCorso(voce))) continue
    rmSync(percorso.join(cartellaModelli(), voce), { force: true })
    dimenticaSorgente(voce)
  }
}

/**
 * Il percorso di uno scarico lasciato a metà (`.gguf.ipull`), se è lì: le
 * stesse guardie di `modelloNellaCartella`, per «Butta».
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
  /** Da dove viene, da scrivere nel biglietto per un eventuale «Riprendi». */
  sorgente?: Sorgente
}

/**
 * Scarica un modello nella cartella con `node-llama-cpp` (pezzi, ripresa,
 * connessioni parallele). Cartella e nome li decidiamo noi; annullare cancella
 * quel che era sceso a metà.
 */
export async function scarica (scarico: Scarico): Promise<ModelloLocale> {
  const { createModelDownloader } = await modulo()
  const cartella = cartellaPronta()
  // Con la sorgente, per riprendere il nome di uno scarico caduto: vedi `riprendibile`.
  const nome = scarico.nome ? nomeLibero(cartella, scarico.nome, scarico.sorgente) : undefined
  // Preso subito, prima di qualunque attesa: vedi `inScrittura`.
  if (nome) inScrittura.add(nome)
  try {
    return await scaricaCome(createModelDownloader, cartella, nome, scarico)
  } finally {
    if (nome) inScrittura.delete(nome)
  }
}

/**
 * Aspetta una promessa, ma non oltre il segnale: la creazione dello scaricatore
 * non conosce il segnale. Quel che arriva dopo l'annullo va a `dopo`, per chiuderlo.
 */
function finoAlSegnale<T> (
  promessa: Promise<T>,
  segnale: AbortSignal | undefined,
  dopo: (arrivato: T) => void,
): Promise<T> {
  if (!segnale) return promessa
  if (segnale.aborted) {
    promessa.then(dopo, () => {})
    return Promise.reject(new Error(testi().fermato))
  }
  return new Promise<T>((risolvi, rifiuta) => {
    const alFermo = (): void => rifiuta(new Error(testi().fermato))
    segnale.addEventListener('abort', alFermo, { once: true })
    promessa.then(
      (arrivato) => {
        segnale.removeEventListener('abort', alFermo)
        if (segnale.aborted) dopo(arrivato)
        else risolvi(arrivato)
      },
      (guasto: unknown) => {
        segnale.removeEventListener('abort', alFermo)
        rifiuta(guasto instanceof Error ? guasto : new Error(String(guasto)))
      },
    )
  })
}

/** Il lavoro vero di `scarica`, con il nome già preso. */
async function scaricaCome (
  createModelDownloader: Awaited<ReturnType<typeof modulo>>['createModelDownloader'],
  cartella: string,
  nome: string | undefined,
  scarico: Scarico,
): Promise<ModelloLocale> {
  // Il biglietto prima di cominciare: serve proprio se l'applicazione si chiude a metà.
  if (nome && scarico.sorgente) segnaSorgente(nome, scarico.sorgente)

  let scaricatore: Awaited<ReturnType<typeof createModelDownloader>>
  try {
    scaricatore = await finoAlSegnale(
      createModelDownloader({
        modelUri: scarico.uri,
        dirPath: cartella,
        ...(nome ? { fileName: nome } : {}),
        onProgress: ({ downloadedSize, totalSize }) => {
          scarico.al?.({ byte: downloadedSize, totale: totalSize })
        },
        deleteTempFileOnCancel: true,
      }),
      scarico.segnale,
      // Arrivato dopo l'annullo: si chiude senza scaricare.
      (tardivo) => { void tardivo.cancel().catch(() => {}) },
    )
  } catch (guasto) {
    // Fermato mentre si collegava: via il biglietto. Un guasto vero lo lascia.
    if (scarico.segnale?.aborted) {
      if (nome) dimenticaSorgente(nome)
      throw new Error(testi().fermato, { cause: guasto })
    }
    throw guasto
  }

  let file: string
  try {
    file = await scaricatore.download(
      scarico.segnale ? { signal: scarico.segnale } : {},
    )
  } catch (guasto) {
    // L'annullo arriva in due modi, a seconda del momento: qui come eccezione,
    // o sotto come ritorno normale. Si trattano uguali, altrimenti resterebbe
    // un biglietto orfano, invisibile e non eliminabile.
    if (scarico.segnale?.aborted) {
      // La libreria ha già cancellato i pesi: via anche il biglietto.
      if (nome) dimenticaSorgente(nome)
      throw new Error(testi().fermato, { cause: guasto })
    }
    // Guasto vero: il biglietto resta, il `.ipull` si può riprendere.
    throw guasto
  }
  // L'altro modo dell'annullo: `download()` torna ma il file non c'è più, e uno
  // `statSync` darebbe un ENOENT fuorviante.
  if (scarico.segnale?.aborted) {
    if (nome) dimenticaSorgente(nome)
    throw new Error(testi().fermato)
  }

  const scritto = percorso.basename(file)
  // La guardia dei quattro byte anche qui: un proxy o un deposito può servire
  // una pagina HTML con esito 200. Non c'è impronta da confrontare per un
  // catalogo aperto come Hugging Face.
  if (!èGguf(file)) {
    rmSync(file, { force: true })
    dimenticaSorgente(scritto)
    throw new Error(testi().nonModello(scritto))
  }
  // Arrivato in fondo: il biglietto non serve più.
  dimenticaSorgente(scritto)
  try {
    return {
      nome: scritto,
      byte: statSync(file).size,
      proiettore: PROIETTORE.test(scritto),
    }
  } catch (guasto) {
    // Finito ma il file non c'è (disco pieno, antivirus…): si dice che non è arrivato.
    throw new Error(
      testi().fuoriCartella(scritto),
      { cause: guasto },
    )
  }
}
