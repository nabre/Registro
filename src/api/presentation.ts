// Come si impagina quel che una lettura ha letto.
//
// Fin qui una risposta con dei dati dentro era il modello che li **ricopiava**:
// gli si mandava la busta JSON, lui ne ribatteva venticinque righe in una
// tabella di markdown, e chi leggeva doveva controllarle una per una. Un
// modello che ricopia è un modello che ogni tanto sbaglia una cifra, e una
// cifra sbagliata in un registro di classe si trascrive.
//
// Adesso la busta arriva alla pagina **intera e già divisa in colonne**, e il
// modello scrive la sola cosa che sappia fare meglio di una tabella: una riga
// di introduzione e il commento. I numeri non passano più da lui.
//
// ----------------------------------------------------------- chi lo dichiara
//
// **La procedura**, accanto al proprio schema d'uscita, con `presentazione:`.
// Non un elenco a parte: un secondo elenco resterebbe indietro al primo campo
// rinominato, e resterebbe indietro in silenzio — la colonna sparirebbe dalla
// pagina e nessuno saprebbe dire da quando. Dichiarata lì, il campo che non
// c'è più lo nomina `tsc`: `Valore.campo` è una chiave dell'uscita, `da` pure,
// e `Colonna.campo` è una chiave della **riga** che sta dentro `da` — cioè le
// tre cose che una presentazione nomina sono tutte e tre controllate.
//
// L'ultima delle tre non lo era: `colonne` è stata `Array<Colonna<any>>` fin
// qui, e `any` non controlla niente. La colonna il cui campo non esiste più non
// spariva nemmeno — diventava una **colonna intera di trattini**, perché
// `scrivi(undefined)` è `'—'` — e una tabella con dentro una colonna di
// trattini si disegna benissimo. Vedi `Tabella<U>` qui sotto.
//
// Quel che non dichiara niente non si impagina: `modelli.prova` torna un PDF in
// base64, e non c'è nessuna tabella che lo renda leggibile. Meglio niente che
// una griglia di duemila caratteri.
//
// ------------------------------------------------------------- che cosa fa
//
// Legge i valori dalla busta, li scrive come si leggono — una quota diventa
// «12,5%», un byte diventa «4,1 GB», una data diventa «04.09.2026» — e
// consegna righe di stringhe. **Non calcola niente di nuovo**: `quota()`
// moltiplica per cento un numero che il dominio ha già diviso, e non è un
// secondo conto — è lo stesso numero scritto come si legge. Le medie, le UD e i
// denominatori restano quelli che la procedura ha messo nella busta.

import { formattaData } from '../domain/dates.js'
import type { BloccoRisultato, RisultatoAssistente } from '../protocol.js'
import type { ProceduraQualunque } from './contract.js'

/**
 * Quante righe di una tabella viaggiano verso la pagina.
 *
 * Duecento: l'appello di una classe ci sta trenta volte, un anno di ore no —
 * e un anno di ore in una bolla di conversazione non è una risposta, è un
 * elenco in cui cercare. Quel che resta fuori si dice: `troncata` e `quante`
 * viaggiano accanto, come in `ElencoVisibile`.
 */
const QUANTE_RIGHE = 200

/** Come si scrive un valore: quel che decide se va a destra e come si legge. */
export type Formato =
  /** Parole. A sinistra. */
  | 'testo'
  /** Un numero come sta nella busta. A destra. */
  | 'numero'
  /** Una quota da 0 a 1, scritta come si legge: «12,5%». A destra. */
  | 'quota'
  /** Un `Iso`: «04.09.2026». */
  | 'data'
  /** Un'ora «08:20», o il trattino se non c'è. */
  | 'ora'
  /** Un booleano detto a parole: «sì» / «no». */
  | 'siNo'
  /** Byte scritti come si leggono: «4,1 GB». A destra. */
  | 'byte'
  /** Un elenco di stringhe, uno dietro l'altro. */
  | 'elenco'

/** Una colonna che legge un campo della riga, come si è sempre fatto. */
interface ColonnaPiana<R> {
  campo: keyof R & string
  testo: string
  formato?: Formato
}

/**
 * Una colonna che legge **dentro un array della riga**: una cella per ogni
 * voce, separate da un punto mediano.
 *
 * Nasce dal raggruppamento per semestre. Le cifre per periodo stanno in un
 * array **dentro** una riga — `persone[].periodi[]` — e nessuno dei tre generi
 * di blocco scende di due livelli: `impagina()` vuole un array di primo
 * livello, e una cella con dentro un array di oggetti si scriveva
 * «[object Object]». Il risultato era che il raggruppamento viaggiava nella
 * busta, lo leggeva il modello, e **a schermo non arrivava** — cioè non
 * arrivava proprio dove si guarda per accorgersi che qualcuno è peggiorato dal
 * primo semestre al secondo.
 *
 * La scelta è la più piccola che risolve: non un quarto genere di blocco da
 * mantenere per tutte le procedure, ma una colonna che sa scendere di un
 * gradino. «6,5% · 1,7%» in una cella si legge, e l'ordine è quello dei periodi
 * dichiarati in cima alla busta.
 *
 * `dentro` è una chiave del **tipo delle voci**, non una stringa qualunque: la
 * garanzia che `Colonna` ha appena guadagnato — un campo rinominato non compila
 * invece di far comparire una colonna di trattini — vale anche di un gradino
 * più in giù, o questa sarebbe la porta da cui rientra.
 */
type ColonnaAnnidata<R> = {
  [K in keyof R]: R[K] extends ReadonlyArray<infer V>
    ? { campo: K & string, testo: string, formato?: Formato, dentro: keyof V & string }
    : never
}[keyof R]

/** Una colonna di una tabella: da quale campo viene e come si intitola. */
export type Colonna<R = Record<string, unknown>> = ColonnaPiana<R> | ColonnaAnnidata<R>

/** Un valore in cima: il periodo, la classe, quante UD. */
export interface Valore<U = Record<string, unknown>> {
  campo: keyof U & string
  etichetta: string
  formato?: Formato
}

/**
 * La riga di un elenco, estratta dal campo che lo contiene.
 *
 * Serve a legare `colonne` a `da`: `U['righe']` è `Riga[]`, e quel che una
 * colonna può nominare sono le chiavi di `Riga`. Il campo può essere
 * facoltativo nell'uscita — `righe?: Riga[]` — e allora il tipo è
 * `Riga[] | undefined`: la condizionale distribuisce, il ramo `undefined` dà
 * `never`, e l'unione resta `Riga`.
 */
type RigaDi<T> = T extends ReadonlyArray<infer R> ? R : never

/**
 * Un blocco di tabella, per una chiave sola dell'uscita.
 *
 * Scritto come mappa sulle chiavi e poi riaperto con `[keyof U & string]`
 * perché è l'unico modo di dire «`da` è *questa* chiave, e `colonne` nomina i
 * campi di *quelle* righe»: con `da: keyof U & string` scritto dritto, i due
 * campi non si parlerebbero e `colonne` tornerebbe a dover essere `any`.
 */
type Tabella<U> = {
  [Da in keyof U & string]: {
    tipo: 'tabella'
    /** La chiave dell'uscita che contiene le righe: `righe`, `corsi`, `file`. */
    da: Da
    titolo?: string
    colonne: Array<Colonna<RigaDi<U[Da]>>>
  }
}[keyof U & string]

/**
 * ------------------------------------------- perché `colonne` non è più `any`
 *
 * Perché l'intestazione di questo file e quella di `contract.ts` promettevano
 * tutte e due che «un campo rinominato non fa più compilare invece di far
 * sparire una colonna in silenzio», e la promessa era vera per `Valore<U>` e
 * per `da` e **falsa proprio per `colonne`**, che è dove stanno i campi: `any`
 * non controlla niente. A valle `blocco()` legge `campo(riga, colonna.campo)`,
 * trova `undefined` e scrive `'—'`, quindi una colonna il cui campo non esiste
 * più diventa **una colonna intera di trattini** — che si disegna benissimo, e
 * in revisione non si vede. Le ventiquattro presentazioni di oggi sono tutte
 * coerenti; nessuno lo stava verificando.
 */
export type Blocco<U> =
  | { tipo: 'valori', titolo?: string, campi: Array<Valore<U>> }
  | Tabella<U>
  | { tipo: 'elenco', da: keyof U & string, titolo?: string }

/**
 * Come si impagina l'uscita di una procedura.
 *
 * `titolo` è quello del risultato e non quello della procedura: «Presenze del
 * corso» invece di «Presenze, assenze e medie di un corso in un periodo», che è
 * la riga scritta per chi compone una chiamata e non per chi legge una
 * risposta.
 */
export interface Presentazione<U = unknown> {
  titolo: string
  blocchi: Array<Blocco<U>>
}

/**
 * La stessa cosa, come la tiene l'elenco delle procedure.
 *
 * `Blocco<U>` nomina le chiavi dell'uscita, e un elenco di procedure con
 * uscite diverse non le accoglierebbe tutte: è lo stesso motivo per cui
 * `ProceduraQualunque` esiste accanto a `Procedura`. Qui resta la forma che
 * conta a chi legge l'elenco — un titolo e dei blocchi — e chi li impagina
 * passa da `impagina()`, che li legge campo per campo dalla busta.
 */
export interface PresentazioneQualunque {
  titolo: string
  blocchi: readonly unknown[]
}

/**
 * Un blocco con i nomi dei campi ridotti a stringhe: quel che `impagina()` sa.
 *
 * `Blocco<U>` lega `colonne` a `da` attraverso `U`, ed è il suo mestiere —
 * ma chi impagina un blocco preso da `PresentazioneQualunque` quel `U` non ce
 * l'ha più, e `Blocco<unknown>` non è la forma erasa: `keyof unknown` è
 * `never`, quindi il ramo `tabella` sparisce del tutto e `dichiarato.colonne`
 * non esiste. Questa è la stessa forma vista da chi legge a runtime, dove un
 * nome di campo è una stringa e basta. Il controllo è già stato fatto dove si
 * dichiara; qui si legge.
 */
/** Una colonna vista da chi impagina: i nomi di campo sono stringhe e basta. */
type ColonnaLetta = { campo: string, testo: string, formato?: Formato, dentro?: string }

type BloccoLetto =
  | { tipo: 'valori', titolo?: string, campi: Array<{ campo: string, etichetta: string, formato?: Formato }> }
  | {
    tipo: 'tabella'
    da: string
    titolo?: string
    colonne: ColonnaLetta[]
  }
  | { tipo: 'elenco', da: string, titolo?: string }

// --------------------------------------------------------- scrivere i valori

const NUMERI = new Intl.NumberFormat('it-CH')
const QUOTE = new Intl.NumberFormat('it-CH', { maximumFractionDigits: 1 })

/** «4,1 GB», «812 MB»: le misure che si leggono, non i byte contati. */
function misura (byte: number): string {
  if (byte >= 1e9) return `${QUOTE.format(byte / 1e9)} GB`
  if (byte >= 1e6) return `${QUOTE.format(byte / 1e6)} MB`
  if (byte >= 1e3) return `${QUOTE.format(byte / 1e3)} kB`
  return `${byte} B`
}

/**
 * Un valore come si legge.
 *
 * Quel che manca diventa «—» e non una cella vuota: una colonna con dei buchi
 * si legge come una tabella rotta, e «—» dice che lì non c'è niente da sapere.
 */
export function scrivi (valore: unknown, formato: Formato = 'testo'): string {
  if (valore === null || valore === undefined || valore === '') return '—'

  switch (formato) {
    case 'numero':
      return typeof valore === 'number' ? NUMERI.format(valore) : String(valore)
    case 'quota':
      // Per cento e non ricalcolata: il dominio l'ha già divisa per il suo
      // denominatore, e qui si scrive lo stesso numero come si legge.
      return typeof valore === 'number' ? `${QUOTE.format(valore * 100)}%` : String(valore)
    case 'data':
      return typeof valore === 'string' ? formattaData(valore) : String(valore)
    case 'ora':
      return typeof valore === 'string' ? valore : '—'
    case 'siNo':
      return valore === true ? 'sì' : valore === false ? 'no' : String(valore)
    case 'byte':
      return typeof valore === 'number' ? misura(valore) : String(valore)
    case 'elenco':
      return Array.isArray(valore) ? valore.map((v) => String(v)).join(', ') || '—' : String(valore)
    default:
      return Array.isArray(valore) ? valore.join(', ') : String(valore)
  }
}

/** I numeri stanno a destra: è l'unico modo di confrontarli con l'occhio. */
function allinea (formato: Formato | undefined): 'sinistra' | 'destra' {
  return formato === 'numero' || formato === 'quota' || formato === 'byte' ? 'destra' : 'sinistra'
}

// ------------------------------------------------------------ l'impaginazione

function campo (dati: Record<string, unknown>, nome: string): unknown {
  return dati[nome]
}

/**
 * Il testo di una cella: il campo, o le voci di un array uno dietro l'altro.
 *
 * Un array vuoto dà «—» come un valore che manca, e non una stringa vuota: chi
 * guarda una tabella legge il trattino come «qui non c'è», che è quel che è.
 */
function cella (riga: Record<string, unknown>, colonna: ColonnaLetta): string {
  const { dentro } = colonna
  if (dentro === undefined) return scrivi(campo(riga, colonna.campo), colonna.formato)
  const voci = campo(riga, colonna.campo)
  if (!Array.isArray(voci) || voci.length === 0) return '—'
  return voci
    .map((voce) => scrivi(campo(voce as Record<string, unknown>, dentro), colonna.formato))
    .join(' · ')
}

function blocco (
  dichiarato: BloccoLetto,
  dati: Record<string, unknown>,
): BloccoRisultato | null {
  if (dichiarato.tipo === 'valori') {
    const voci = dichiarato.campi
      .map((v) => ({ etichetta: v.etichetta, valore: scrivi(campo(dati, v.campo), v.formato) }))
      // Un valore che non c'è non diventa una riga «—»: in cima alla risposta
      // ci sta quel che si è letto, non l'elenco di quel che manca.
      .filter((voce) => voce.valore !== '—')
    return voci.length > 0 ? { tipo: 'valori', titolo: dichiarato.titolo, voci } : null
  }

  const valore = campo(dati, dichiarato.da)
  if (!Array.isArray(valore) || valore.length === 0) return null

  if (dichiarato.tipo === 'elenco') {
    // `quante` e `troncata` come nella tabella, e per lo stesso motivo: anche
    // l'elenco si taglia a `QUANTE_RIGHE`, e fin qui lo faceva **senza dirlo**
    // — dodici riferimenti rotti su quarantasei si leggevano come tutti quelli
    // che c'erano, e un elenco tagliato in silenzio è una risposta sicura su
    // una parte sola, che è peggio di un «non lo so». La tabella li portava da
    // sempre; l'elenco no, e nessuno guardava la differenza.
    const voci = valore.slice(0, QUANTE_RIGHE).map((v) => scrivi(v))
    return {
      tipo: 'elenco',
      titolo: dichiarato.titolo,
      voci,
      quante: valore.length,
      troncata: valore.length > voci.length,
    }
  }

  const righe = valore.slice(0, QUANTE_RIGHE).map((riga) =>
    dichiarato.colonne.map((colonna) => cella(riga as Record<string, unknown>, colonna)),
  )
  return {
    tipo: 'tabella',
    titolo: dichiarato.titolo,
    colonne: dichiarato.colonne.map((c) => ({ testo: c.testo, allinea: allinea(c.formato) })),
    righe,
    quante: valore.length,
    troncata: valore.length > righe.length,
  }
}

/**
 * La busta di una lettura, impaginata come la procedura ha dichiarato.
 *
 * `null` quando non c'è niente da mostrare: la procedura non dichiara una
 * presentazione, oppure ha letto una busta vuota — e una tabella senza righe
 * dice a chi guarda che il registro sta nascondendo qualcosa, mentre la frase
 * del modello dirà che non c'era niente.
 */
export function impagina (
  procedura: ProceduraQualunque,
  dati: unknown,
): RisultatoAssistente | null {
  const presentazione: PresentazioneQualunque | undefined = procedura.presentazione
  if (!presentazione) return null
  if (typeof dati !== 'object' || dati === null || Array.isArray(dati)) return null

  const blocchi = presentazione.blocchi
    .map((dichiarato) => blocco(dichiarato as BloccoLetto, dati as Record<string, unknown>))
    .filter((b): b is BloccoRisultato => b !== null)

  if (blocchi.length === 0) return null
  return { procedura: procedura.nome, titolo: presentazione.titolo, blocchi }
}
