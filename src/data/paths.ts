// Dove vivono i dati e come si chiamano i file. L'unico stato è l'Uri del
// documento aperto (`2026-2027.regi`, uno ZIP con le collezioni, `archivio/` ed
// `esportazioni/`); accanto c'è la cartella gemella con lo stesso nome, che tiene
// solo quel che un altro programma deve riscrivere (le bozze di posta).
// I percorsi salvati nei JSON sono relativi alla cartella gemella.

import * as apparato from 'apparato'

import { estensioneDi, nomeSicuro } from '../domain/text.js'
import { ESTENSIONE, nomeDelPacchetto, èPacchetto } from './package.js'

export { estensioneDi, nomeSicuro }

/** I nomi delle collezioni: file dentro il documento dell'anno. */
export const NOMI = {
  registro: 'registro.json',
  classi: 'classi.json',
  corsi: 'corsi.json',
  lezioni: 'lezioni.json',
  piani: 'piani-lezione.json',
  valutazioni: 'valutazioni.json',
  fascicoli: 'fascicoli.json',
  consegne: 'consegne.json',
  check: 'check.json',
  smistamenti: 'smistamenti.json',
  // File a sé: la chiave è l'indirizzo, e si riscrive solo con «Trova gli indirizzi».
  coordinate: 'coordinate.json',
} as const

export type NomeCollezione = keyof typeof NOMI

/** La sottocartella dei JSON nella disposizione su disco: la legge solo la migrazione. */
export const DATI = 'dati'

export { ESTENSIONE, nomeDelPacchetto, èPacchetto }

/** L'ultimo pezzo di un Uri: il nome del file come lo si vede nel gestore. */
export function nomeDelFileUri (uri: { path: string }, ripiego = 'documento.pdf'): string {
  return uri.path.split('/').pop() || ripiego
}

/** La cartella di lavoro, o null se non ne è ancora stata scelta una. */
export function radiceDiLavoro (): apparato.Uri | null {
  return apparato.cartelleDiLavoro()?.[0]?.uri ?? null
}

// ------------------------------------------------------------ il documento aperto

/**
 * Il documento su cui si sta lavorando, impostato da `Archivio`. Null se non ce
 * n'è uno: chi scrive deve accorgersene e non inventare un posto.
 */
let documentoAperto: apparato.Uri | null = null

/** La cartella dell'ultimo documento non provvisorio: dove si apre il «salva con nome». */
let ultimaCartellaVera: apparato.Uri | null = null

/** Dichiara quale documento vale da adesso. Null: nessuno aperto. */
export function impostaDocumento (uri: apparato.Uri | null): void {
  documentoAperto = uri
  if (uri && !èProvvisorio(uri)) ultimaCartellaVera = apparato.Uri.joinPath(uri, '..')
}

/** Dove stava l'ultimo documento non provvisorio aperto, se ce n'è stato uno. */
export function cartellaDellUltimoDocumento (): apparato.Uri | null {
  return ultimaCartellaVera
}

// ------------------------------------------------------------ gli anni provvisori
//
// Un anno nuovo nasce in `<dati dell'utente>/anni-nuovi/<segno>/` e ci resta
// finché non lo si salva con nome; sopravvive alla chiusura del programma.
// Una sottocartella per anno: due etichette uguali non si pestano, e buttarne
// uno è cancellare una cartella.

/** Il nome della cartella degli anni provvisori, dentro i dati dell'utente. */
export const ANNI_NUOVI = 'anni-nuovi'

let cartellaProvvisori: apparato.Uri | null = null

/** Dichiara dove nascono gli anni nuovi. La chiama l'avvio, una volta. */
export function impostaCartellaProvvisori (uri: apparato.Uri | null): void {
  cartellaProvvisori = uri
}

/** Dove far nascere un anno nuovo. Null se l'avvio non ha dichiarato la cartella (prove). */
export function percorsoProvvisorio (etichetta: string): apparato.Uri | null {
  if (!cartellaProvvisori) return null
  const segno = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  return apparato.Uri.joinPath(cartellaProvvisori, segno, `${nomeSicuro(etichetta, 'anno')}${ESTENSIONE}`)
}

/** Vero se il documento sta fra gli anni nuovi non ancora salvati con nome. */
export function èProvvisorio (uri: apparato.Uri | null = documentoAperto): boolean {
  if (!uri || !cartellaProvvisori) return false
  const radice = cartellaProvvisori.path.replace(/\/+$/, '').toLowerCase()
  return uri.path.toLowerCase().startsWith(`${radice}/`)
}

/** La sottocartella di un anno provvisorio: quella da buttare quando non serve più. */
export function cartellaDelProvvisorio (uri: apparato.Uri): apparato.Uri | null {
  return èProvvisorio(uri) ? apparato.Uri.joinPath(uri, '..') : null
}

/** Il documento dell'anno in uso, o null se non ce n'è ancora uno. */
export function percorsoPacchetto (): apparato.Uri | null {
  return documentoAperto
}

/** La cartella che contiene il documento: radice di quel che si scrive accanto e delle migrazioni. */
export function cartellaDocumento (): apparato.Uri | null {
  return documentoAperto ? apparato.Uri.joinPath(documentoAperto, '..') : null
}

/** Il nome del documento senza estensione: `2026-2027`. */
export function nomeDocumento (): string | null {
  return documentoAperto ? nomeDelPacchetto(documentoAperto) : null
}

/** La cartella gemella: accanto al documento, con il suo nome. Null senza documento aperto. */
export function cartellaAnno (): apparato.Uri | null {
  const dove = cartellaDocumento()
  const nome = nomeDocumento()
  return dove && nome ? apparato.Uri.joinPath(dove, nome) : null
}

// ------------------------------------------- una cartella qualunque, per le migrazioni
//
// Le migrazioni nominano anche anni diversi da quello in uso: la radice è un argomento.

/** La cartella di un anno dentro una radice qualunque. */
export function cartellaAnnoIn (radice: apparato.Uri, cartella: string): apparato.Uri | null {
  const nome = nomeSicuro(cartella)
  return nome ? apparato.Uri.joinPath(radice, nome) : null
}

/** Il documento di un anno dentro una radice qualunque. */
export function percorsoPacchettoIn (radice: apparato.Uri, cartella: string): apparato.Uri | null {
  const nome = nomeSicuro(cartella)
  return nome ? apparato.Uri.joinPath(radice, `${nome}${ESTENSIONE}`) : null
}

/** La sottocartella dei JSON di un anno, nella disposizione su disco. */
export function cartellaCollezioniIn (radice: apparato.Uri, cartella: string): apparato.Uri | null {
  const anno = cartellaAnnoIn(radice, cartella)
  return anno ? apparato.Uri.joinPath(anno, DATI) : null
}

/** Il file di una collezione di un anno, nella disposizione su disco. */
export function percorsoIn (
  radice: apparato.Uri,
  cartella: string,
  nome: NomeCollezione,
): apparato.Uri | null {
  const dati = cartellaCollezioniIn(radice, cartella)
  return dati ? apparato.Uri.joinPath(dati, NOMI[nome]) : null
}

// ------------------------------------------------- le sottocartelle di un anno

/**
 * La cartella `in-arrivo/` su disco, con una sottocartella per documento da
 * raccogliere. Può ancora arrivare da una cartella sincronizzata: `sorter.ts`
 * la svuota all'apertura dell'anno.
 */
export function cartellaInArrivo (): apparato.Uri | null {
  const anno = cartellaAnno()
  return anno ? apparato.Uri.joinPath(anno, 'in-arrivo') : null
}

/**
 * L'Uri di un file allegato, dato il suo percorso relativo alla cartella
 * dell'anno. Le risalite `..` si scartano: il percorso viene da un JSON che si
 * può scrivere a mano, e da lì non si deve uscire dalla cartella dell'anno.
 */
export function fileAllegato (relativo: string): apparato.Uri | null {
  const anno = cartellaAnno()
  const parti = relativo.split(/[\\/]+/).filter((p) => p !== '' && p !== '.' && p !== '..')
  return anno && parti.length > 0 ? apparato.Uri.joinPath(anno, ...parti) : null
}

/** Le voci di una cartella, o niente se la cartella non c'è o non si legge. */
export async function vociDi (
  cartella: apparato.Uri,
): Promise<Array<[string, apparato.GenereFile]>> {
  try {
    return await apparato.file.readDirectory(cartella)
  } catch {
    return []
  }
}

/** Le sottocartelle di una cartella, escluse quelle nascoste come `.storico`. */
export async function sottocartelleDi (cartella: apparato.Uri): Promise<string[]> {
  return (await vociDi(cartella))
    .filter(([nome, tipo]) => tipo === apparato.GenereFile.Directory && !nome.startsWith('.'))
    .map(([nome]) => nome)
    .sort()
}

/** Vero se a quel percorso c'è già qualcosa. */
export async function esisteFile (uri: apparato.Uri): Promise<boolean> {
  try {
    await apparato.file.stat(uri)
    return true
  } catch {
    return false
  }
}

/** Come travasa e toglie: le due migrazioni che la usano non vogliono la stessa prudenza. */
export interface OpzioniTravaso {
  /** Destinazione non creabile: `travasa` torna falso invece di sollevare (trasloco in `years.ts`). */
  saltaSeNonSiCrea?: boolean
  /** Toglie solo cartelle vuote del tutto, non quelle con dentro cartelle vuote. */
  soloSeVuotaDelTutto?: boolean
}

/** Travasa una cartella dentro un'altra, voce per voce, senza coprire niente. */
export async function travasa (
  da: apparato.Uri,
  a: apparato.Uri,
  opzioni: OpzioniTravaso = {},
): Promise<boolean> {
  let qualcosa = false
  try {
    await apparato.file.createDirectory(a)
  } catch (errore) {
    if (opzioni.saltaSeNonSiCrea) return false
    throw errore
  }
  for (const [nome, tipo] of await vociDi(da)) {
    const origine = apparato.Uri.joinPath(da, nome)
    const destinazione = apparato.Uri.joinPath(a, nome)
    if (tipo === apparato.GenereFile.Directory) {
      if (await travasa(origine, destinazione, opzioni)) qualcosa = true
      await togliSeVuota(origine, opzioni)
      continue
    }
    if (await esisteFile(destinazione)) continue
    try {
      await apparato.file.rename(origine, destinazione, { overwrite: false })
      qualcosa = true
    } catch {
      // Aperto altrove o in sola lettura: resta dov'è, si riprova la volta dopo.
    }
  }
  return qualcosa
}

/**
 * Cancella una cartella e le sue sottocartelle, ma solo se non c'è più niente:
 * nessun file, a nessuna profondità. Con `soloSeVuotaDelTutto`, nemmeno una
 * sottocartella. Torna vero se l'ha tolta.
 */
export async function togliSeVuota (
  cartella: apparato.Uri,
  opzioni: Pick<OpzioniTravaso, 'soloSeVuotaDelTutto'> = {},
): Promise<boolean> {
  // Non `vociDi`: su errore torna vuoto, e una cartella illeggibile (segnaposto
  // OneDrive, permesso negato) verrebbe cancellata senza cestino.
  let voci: Array<[string, apparato.GenereFile]>
  try {
    voci = await apparato.file.readDirectory(cartella)
  } catch {
    return false
  }
  if (opzioni.soloSeVuotaDelTutto && voci.length > 0) return false
  for (const [nome, tipo] of voci) {
    if (tipo !== apparato.GenereFile.Directory) return false
    if (!(await togliSeVuota(apparato.Uri.joinPath(cartella, nome)))) return false
  }
  try {
    // Senza file verificato sopra: `recursive` non toglie altro, e serve ad alcuni file system.
    await apparato.file.delete(cartella, { recursive: true, useTrash: false })
    return true
  } catch {
    // Non si è potuta togliere: una cartella vuota di troppo non fa danno.
    return false
  }
}
