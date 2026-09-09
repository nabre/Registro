// Dove stanno i modelli dei rapporti, e come si leggono.
//
// Stanno in `templates/` nella radice del progetto, e non dentro l'estensione:
// sono roba che il docente modifica: l'intestazione con il nome della scuola,
// l'ordine delle sezioni di un verbale, una colonna in più in una tabella.
// Metterli fra il codice avrebbe voluto dire ricompilare per cambiare una
// riga, e perderli a ogni aggiornamento.
//
// Se la cartella non c'è, la si scrive con i modelli di serie: un registro che
// non sa stampare finché qualcuno non gli copia dei file dentro sarebbe rotto
// appena installato. Da lì in poi comanda quel che c'è su disco, sempre — se
// qualcuno cancella una riga, il rapporto esce senza quella riga.

import * as vscode from 'vscode'

import {
  conBase,
  leggiBlocchi,
  leggiModello,
  leggiTesti,
  testiVuoti,
  type Blocchi,
  type Modello,
  type Testi,
} from '../dominio/rapporti.js'
import { MODELLI_PREDEFINITI } from './modelliPredefiniti.js'
import { esisteFile, radiceWorkspace } from './percorsi.js'

/** Il nome del modello comune, quello con intestazione e piede di tutti. */
export const BASE = '_base'

/**
 * Lo strato delle misure: formato del foglio, corpi, colonne delle tabelle.
 *
 * Sta sotto tutti, e non c'è bisogno di dichiararlo. È l'unico modello con
 * questo privilegio, e se lo guadagna per due motivi. Non dice niente su che
 * cosa un rapporto contiene — solo quanto è grande — quindi non può cambiare
 * un foglio a sorpresa. E chi aveva già un `_base.tpl` suo, modificato prima
 * che questo strato esistesse, altrimenti non lo vedrebbe mai: il registro non
 * riscrive i modelli che trova, ed è giusto così, ma vorrebbe dire che chi usa
 * il registro da più tempo è l'unico a non poter cambiare i corpi.
 */
export const STILE = '_stile'

/**
 * Quanti modelli si possono incatenare con `estende`.
 *
 * Tre bastano — `_stile` sotto `_base` sotto il rapporto — e il limite serve a
 * un caso solo: due file che si estendono a vicenda, scritti a mano da
 * qualcuno. Senza, il registro girerebbe in tondo invece di stampare.
 */
const PROFONDITA_MASSIMA = 8

export const CARTELLA_MODELLI = 'templates'

export function cartellaModelli (): vscode.Uri | null {
  const radice = radiceWorkspace()
  return radice ? vscode.Uri.joinPath(radice, CARTELLA_MODELLI) : null
}

/**
 * Scrive i modelli di serie che mancano.
 *
 * Solo quelli che mancano: un modello già lì è stato messo o modificato da
 * qualcuno, e riscriverlo vorrebbe dire cancellare il suo lavoro a ogni
 * avvio — che è esattamente il motivo per cui i modelli stanno fuori dal
 * codice.
 */
export async function assicuraModelli (): Promise<void> {
  const cartella = cartellaModelli()
  if (!cartella) return
  try {
    await vscode.workspace.fs.createDirectory(cartella)
  } catch {
    return
  }
  for (const [nome, contenuto] of Object.entries(MODELLI_PREDEFINITI)) {
    const file = vscode.Uri.joinPath(cartella, nomeFileModello(nome))
    if (await esisteFile(file)) continue
    try {
      await vscode.workspace.fs.writeFile(file, new TextEncoder().encode(contenuto))
    } catch {
      // Cartella in sola lettura: si legge quel che c'è, e se non c'è niente
      // si ripiega sul modello di serie tenuto in memoria.
    }
  }
}

/**
 * Come si chiama su disco un modello: `_base` è `_base.tpl`, `_firma.html` è
 * già il nome che ha.
 *
 * I modelli di rapporto si nominano senza estensione perché è così che si
 * richiamano fra loro — `estende: _base` — mentre gli altri file della cartella
 * se la portano dietro: la firma è HTML, e chiamarla `_firma` vorrebbe dire un
 * modello di rapporto che non esiste.
 */
function nomeFileModello (nome: string): string {
  return nome.includes('.') ? nome : `${nome}.tpl`
}

/** Il file della firma, dentro `templates/`. */
export const FIRMA = '_firma.html'

/**
 * La firma da mettere in fondo alle mail: quella su disco, o quella di serie.
 *
 * Sta in `templates/` con i modelli dei rapporti e non fra le impostazioni per
 * la stessa ragione per cui ci stanno le intestazioni dei fogli: è un pezzo di
 * testo che si scrive una volta, si corregge a mano quando cambia un numero di
 * telefono, e non ha niente a che vedere con come il registro funziona.
 *
 * Vuoto vuol dire nessuna firma: la mail parte com'è scritta.
 */
export async function firmaPosta (): Promise<string> {
  const cartella = cartellaModelli()
  if (cartella) {
    try {
      const byte = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(cartella, FIRMA))
      return new TextDecoder().decode(byte)
    } catch {
      // Non c'è, o non si legge: sotto c'è la copia di serie.
    }
  }
  return MODELLI_PREDEFINITI[FIRMA] ?? ''
}

/** Le immagini che un modello può chiedere: `templates/logo.png` e simili. */
const IMMAGINE_AMMESSA = /^[A-Za-z0-9_ -]+\.(png|jpe?g)$/i

/**
 * I byte di un'immagine di `templates/`, o niente se non c'è.
 *
 * Solo un nome di file, controllato di nuovo qui: il primo controllo sta nel
 * dominio, che legge il modello, ma questa è la funzione che apre davvero un
 * file e non deve fidarsi di chi la chiama. Le immagini stanno accanto ai
 * modelli perché sono la stessa cosa — il logo della sede è impaginazione, non
 * un documento della classe — e ci si arriva dalla stessa cartella che si apre
 * per cambiare la testata.
 */
export async function immagineModello (nome: string): Promise<Uint8Array | null> {
  if (!IMMAGINE_AMMESSA.test(nome)) return null
  const cartella = cartellaModelli()
  if (!cartella) return null
  try {
    return await vscode.workspace.fs.readFile(vscode.Uri.joinPath(cartella, nome))
  } catch {
    // Non c'è: il rapporto esce senza. Un logo mancante non è un motivo per
    // non stampare il verbale.
    return null
  }
}

/**
 * Il testo di un modello: quello su disco, o quello di serie se non c'è.
 *
 * Il nome viene da una riga `estende:` di un file di testo che si modifica a
 * mano, e `joinPath` risolve i `..`: senza questo controllo un modello poteva
 * chiedere `../../../qualcosa` e finire dentro un rapporto. I modelli hanno
 * nomi di parole, non percorsi.
 */
async function sorgenteDi (nome: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]+$/.test(nome)) return null
  const cartella = cartellaModelli()
  if (cartella) {
    try {
      const byte = await vscode.workspace.fs.readFile(
        vscode.Uri.joinPath(cartella, `${nome}.tpl`),
      )
      return new TextDecoder().decode(byte)
    } catch {
      // Non c'è, o non si legge: sotto c'è la copia di serie.
    }
  }
  return MODELLI_PREDEFINITI[nome] ?? null
}

/** Il nome del file con le frasi e i nomi delle colonne. */
export const TESTI = '_testi'

/** Il nome del file con i pezzi di corpo riusabili. */
export const BLOCCHI = '_blocchi'

/**
 * Le parole comuni: `_testi.tpl`, o niente se non c'è.
 *
 * Niente e non un errore: un registro senza quel file stampa esattamente come
 * prima che il file esistesse, con le frasi che il codice porta di suo. È la
 * stessa regola dei modelli — comanda quel che c'è su disco, e quel che non
 * c'è non manca.
 */
export async function testi (): Promise<Testi> {
  const sorgente = await sorgenteDi(TESTI)
  return sorgente === null ? testiVuoti() : leggiTesti(sorgente)
}

/**
 * I pezzi di corpo riusabili: `_blocchi.tpl`, o niente se non c'è.
 *
 * Come le parole: quel che non c'è non manca. Un modello che chiama con `usa:`
 * un blocco che non esiste salta quella riga, e il resto del rapporto esce.
 */
export async function blocchi (): Promise<Blocchi> {
  const sorgente = await sorgenteDi(BLOCCHI)
  return sorgente === null ? {} : leggiBlocchi(sorgente)
}

/**
 * Il modello con quel nome, posato su tutti quelli che estende.
 *
 * La catena si segue fino in fondo e non per un livello solo: `_stile` sta
 * sotto `_base`, e `_base` sotto ogni rapporto. Prima ci si fermava al primo
 * gradino, e uno strato comune sotto la base non sarebbe mai arrivato in cima.
 *
 * Si risolve dal basso: si raccoglie la catena, poi si posa il più profondo e
 * ci si mette sopra gli altri uno per volta, così ogni gradino sovrascrive
 * quello sotto e il file che si è chiesto vince su tutti.
 *
 * Torna null solo se il modello non esiste né su disco né fra quelli di serie:
 * a quel punto è un nome sbagliato, non un file mancante, e chi ha chiesto il
 * rapporto deve saperlo.
 */
export async function modello (nome: string): Promise<Modello | null> {
  const testo = await sorgenteDi(nome)
  if (testo === null) return null

  const catena = [leggiModello(nome, testo)]
  const visti = new Set([nome])
  for (let passo = 0; passo < PROFONDITA_MASSIMA; passo += 1) {
    const sopra = catena[catena.length - 1]
    const padre = sopra.estende
    // Un modello che si estende da sé, o due che si rimandano a vicenda: si
    // smette qui e vale quel che si è già letto. Un rapporto un po' spoglio è
    // meglio di un rapporto che non esce.
    if (!padre || visti.has(padre)) break
    const testoPadre = await sorgenteDi(padre)
    if (testoPadre === null) break
    visti.add(padre)
    catena.push(leggiModello(padre, testoPadre))
  }

  // Lo strato delle misure va in fondo alla catena se nessuno l'ha nominato:
  // vedi la nota su `STILE`.
  if (!visti.has(STILE)) {
    const testoStile = await sorgenteDi(STILE)
    if (testoStile !== null) catena.push(leggiModello(STILE, testoStile))
  }

  let composto = catena[catena.length - 1]
  for (let i = catena.length - 2; i >= 0; i -= 1) composto = conBase(catena[i], composto)
  return composto
}
