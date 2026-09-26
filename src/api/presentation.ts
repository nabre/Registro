// Come si impagina quel che una lettura ha letto.
//
// La busta arriva alla pagina intera e già divisa in colonne; il modello scrive
// solo introduzione e commento, così non ricopia (e non sbaglia) i numeri.
//
// La presentazione la dichiara la procedura accanto al proprio schema d'uscita
// (`presentazione:`): `Valore.campo`, `da` e `Colonna.campo` sono chiavi
// tipizzate, quindi un campo rinominato non compila. Chi non la dichiara non si
// impagina (es. `modelli.prova`, che torna un PDF in base64).
//
// Qui si scrivono i valori come si leggono («12,5%», «4,1 GB», «04.09.2026»)
// senza calcolare niente di nuovo: i numeri sono quelli della busta.

import { formattaData } from '../domain/dates.js'
import { detto, minuscolo, numero, type TestoPigro } from '../i18n/index.js'
import { parole } from '../domain/words.testi.js'
import { testi } from './core.testi.js'
import type { BloccoRisultato, RisultatoAssistente } from '../protocol.js'
import type { ProceduraQualunque } from './contract.js'

/**
 * Quante righe di una tabella viaggiano verso la pagina. Quel che resta fuori
 * si dice con `troncata` e `quante`, come in `ElencoVisibile`.
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
  testo: TestoPigro
  formato?: Formato
}

/**
 * Una colonna che legge dentro un array della riga (es. `persone[].periodi[]`):
 * una voce per elemento, separate da un punto mediano, nell'ordine dei periodi
 * della busta. `dentro` è una chiave tipizzata delle voci, come `campo`.
 */
type ColonnaAnnidata<R> = {
  [K in keyof R]: R[K] extends ReadonlyArray<infer V>
    ? { campo: K & string, testo: TestoPigro, formato?: Formato, dentro: keyof V & string }
    : never
}[keyof R]

/** Una colonna di una tabella: da quale campo viene e come si intitola. */
export type Colonna<R = Record<string, unknown>> = ColonnaPiana<R> | ColonnaAnnidata<R>

/** Un valore in cima: il periodo, la classe, quante UD. */
export interface Valore<U = Record<string, unknown>> {
  campo: keyof U & string
  etichetta: TestoPigro
  formato?: Formato
}

/**
 * La riga di un elenco, estratta dal campo che lo contiene. Con un campo
 * facoltativo (`righe?: Riga[]`) la condizionale distribuisce e il ramo
 * `undefined` dà `never`: resta `Riga`.
 */
type RigaDi<T> = T extends ReadonlyArray<infer R> ? R : never

/**
 * Un blocco di tabella, per una chiave sola dell'uscita. La mappa sulle chiavi
 * riaperta con `[keyof U & string]` lega `da` alle chiavi di `colonne`; con
 * `da: keyof U & string` i due campi resterebbero indipendenti.
 */
type Tabella<U> = {
  [Da in keyof U & string]: {
    tipo: 'tabella'
    /** La chiave dell'uscita che contiene le righe: `righe`, `corsi`, `file`. */
    da: Da
    titolo?: TestoPigro
    colonne: Array<Colonna<RigaDi<U[Da]>>>
  }
}[keyof U & string]

/**
 * `colonne` è tipizzata e non `any`: altrimenti un campo inesistente
 * diventerebbe in silenzio una colonna di trattini (`scrivi(undefined)`).
 */
export type Blocco<U> =
  | { tipo: 'valori', titolo?: TestoPigro, campi: Array<Valore<U>> }
  | Tabella<U>
  | { tipo: 'elenco', da: keyof U & string, titolo?: TestoPigro }

/**
 * Come si impagina l'uscita di una procedura. `titolo` è quello del risultato
 * («Presenze del corso»), non quello della procedura.
 */
export interface Presentazione<U = unknown> {
  titolo: TestoPigro
  blocchi: Array<Blocco<U>>
}

/**
 * La stessa cosa, come la tiene l'elenco delle procedure (uscite diverse, come
 * `ProceduraQualunque` accanto a `Procedura`). Si impagina con `impagina()`.
 */
export interface PresentazioneQualunque {
  titolo: TestoPigro
  blocchi: readonly unknown[]
}

/**
 * Un blocco con i nomi dei campi ridotti a stringhe: quel che `impagina()` sa.
 * `Blocco<unknown>` non va: `keyof unknown` è `never` e il ramo `tabella`
 * sparirebbe. Il controllo dei tipi è già fatto dove si dichiara.
 */
/** Una colonna vista da chi impagina: i nomi di campo sono stringhe e basta. */
type ColonnaLetta = { campo: string, testo: TestoPigro, formato?: Formato, dentro?: string }

type BloccoLetto =
  | { tipo: 'valori', titolo?: TestoPigro, campi: Array<{ campo: string, etichetta: TestoPigro, formato?: Formato }> }
  | {
    tipo: 'tabella'
    da: string
    titolo?: TestoPigro
    colonne: ColonnaLetta[]
  }
  | { tipo: 'elenco', da: string, titolo?: TestoPigro }

// --------------------------------------------------------- scrivere i valori

/** Una cifra decimale al più: le quote e le misure. */
const UNA_CIFRA: Intl.NumberFormatOptions = { maximumFractionDigits: 1 }

/** «4,1 GB», «812 MB»: le misure che si leggono, non i byte contati. */
function misura (byte: number): string {
  const t = testi()
  if (byte >= 1e9) return t.gigabyte(numero(byte / 1e9, UNA_CIFRA))
  if (byte >= 1e6) return t.megabyte(numero(byte / 1e6, UNA_CIFRA))
  if (byte >= 1e3) return t.kilobyte(numero(byte / 1e3, UNA_CIFRA))
  return t.byte(String(byte))
}

/**
 * Un valore come si legge. Quel che manca diventa «—», non una cella vuota.
 */
export function scrivi (valore: unknown, formato: Formato = 'testo'): string {
  if (valore === null || valore === undefined || valore === '') return '—'

  switch (formato) {
    case 'numero':
      return typeof valore === 'number' ? numero(valore) : String(valore)
    case 'quota':
      // Per cento del numero già diviso dal dominio: nessun ricalcolo.
      return typeof valore === 'number' ? `${numero(valore * 100, UNA_CIFRA)}%` : String(valore)
    case 'data':
      return typeof valore === 'string' ? formattaData(valore) : String(valore)
    case 'ora':
      return typeof valore === 'string' ? valore : '—'
    case 'siNo':
      if (typeof valore !== 'boolean') return String(valore)
      return minuscolo(valore ? parole().si : parole().no)
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
 * Il testo di una cella: il campo, o le voci di un array una dietro l'altra.
 * Un array vuoto dà «—».
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
      .map((v) => ({
        etichetta: detto(v.etichetta),
        valore: scrivi(campo(dati, v.campo), v.formato),
      }))
      // Un valore che manca non diventa una riga «—» in cima alla risposta.
      .filter((voce) => voce.valore !== '—')
    return voci.length > 0 ? { tipo: 'valori', titolo: detto(dichiarato.titolo), voci } : null
  }

  const valore = campo(dati, dichiarato.da)
  if (!Array.isArray(valore) || valore.length === 0) return null

  if (dichiarato.tipo === 'elenco') {
    // `quante` e `troncata` come nella tabella: anche l'elenco si taglia a
    // `QUANTE_RIGHE`, e il taglio va detto.
    const voci = valore.slice(0, QUANTE_RIGHE).map((v) => scrivi(v))
    return {
      tipo: 'elenco',
      titolo: detto(dichiarato.titolo),
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
    titolo: detto(dichiarato.titolo),
    colonne: dichiarato.colonne.map((c) => ({
      testo: detto(c.testo),
      allinea: allinea(c.formato),
    })),
    righe,
    quante: valore.length,
    troncata: valore.length > righe.length,
  }
}

/**
 * La presentazione con i testi letti adesso, per il catalogo su disco e
 * `$elenco`: in JSON una funzione cadrebbe in silenzio.
 */
export function presentazioneDetta (presentazione: PresentazioneQualunque): PresentazioneQualunque {
  const campo = (valore: unknown): unknown => (typeof valore === 'function' ? detto(valore as TestoPigro) : valore)
  return {
    titolo: detto(presentazione.titolo),
    blocchi: presentazione.blocchi.map((dichiarato) => {
      const letto = dichiarato as BloccoLetto
      return {
        ...letto,
        ...(letto.titolo !== undefined ? { titolo: campo(letto.titolo) } : {}),
        ...(letto.tipo === 'valori'
          ? { campi: letto.campi.map((v) => ({ ...v, etichetta: campo(v.etichetta) })) }
          : {}),
        ...(letto.tipo === 'tabella'
          ? { colonne: letto.colonne.map((c) => ({ ...c, testo: campo(c.testo) })) }
          : {}),
      }
    }),
  }
}

/**
 * La busta di una lettura, impaginata come la procedura ha dichiarato.
 * `null` se non c'è presentazione o la busta è vuota: una tabella senza righe
 * sembrerebbe nascondere qualcosa.
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
  return { procedura: procedura.nome, titolo: detto(presentazione.titolo), blocchi }
}
