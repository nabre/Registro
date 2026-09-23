// Dove vivono i dati e come si chiamano i file.
//
// Il registro lavora su un documento per volta: `2026-2027.registro`, uno ZIP
// con la nostra estensione, e dentro i JSON delle collezioni con le loro copie
// in `.storico/`. Quel file è la sorgente — si apre quello che viene scelto, e
// il suo contenuto popola i dati. Non c'è nessun elenco da cui pescarlo:
//
//   .../dove il docente lo tiene/
//     2026-2027.registro     le collezioni di quell'anno, e le loro copie
//     2026-2027/
//       archivio/            i documenti caricati, per classe
//       esportazioni/        quel che il registro stampa, con la stessa
//                            struttura: si cancella per intero e si rifà
//       quarantena/  allegati/  risorse/  assenze/
//
// Il documento e la cartella accanto portano lo stesso nome, e non è un vezzo:
// è quel che tiene insieme le due metà di un anno — i dati e i documenti —
// senza doverle far puntare l'una all'altra con un identificatore scritto
// dentro, che si può contraddire. Rinominarli insieme li tiene insieme.
//
// La cartella resta cartella vera perché dentro ci sono PDF che si aprono con
// altri programmi: chiusi in un archivio perderebbero il doppio clic. Nel
// documento va quel che il registro scrive e rilegge da sé. Vedi
// `package.ts`: lì c'è il perché, qui solo dove.
//
// ## Tutto si ricava dal documento aperto
//
// Qui prima c'era una `cartellaDati` ricordata nelle impostazioni, un
// `registro.json` che diceva quale anno fosse in uso, e una scansione che
// ritrovava il file dal suo nome. Il nome era una chiave di ricerca: il file
// scelto e il file aperto erano legati solo dal chiamarsi uguale, e un nome che
// non sopravviveva a `nomeSicuro` apriva in silenzio un altro anno.
//
// Adesso l'unico stato è l'Uri del documento, e le cartelle si ricavano da lui:
// quella che lo contiene, e la gemella che porta il suo nome. Il documento può
// stare ovunque — una chiavetta, una cartella sincronizzata, il Desktop — e
// quel che il registro apre è sempre quel che gli è stato dato.
//
// I percorsi salvati dentro i JSON — `documentazione/DIC4a/…`, `allegati/…` —
// restano relativi alla cartella dell'anno, e quindi non sono cambiati di un
// carattere: la cartella gemella sta dove stava, si ricava soltanto partendo
// dal documento invece che da una radice configurata più un nome.

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
  smistamenti: 'smistamenti.json',
  // Gli indirizzi collocati sulla mappa: un file a sé perché la chiave è
  // l'indirizzo e non la persona, e perché si riscrive solo quando qualcuno
  // preme «Trova gli indirizzi» — non a ogni presenza segnata.
  coordinate: 'coordinate.json',
} as const

export type NomeCollezione = keyof typeof NOMI

/**
 * La sottocartella in cui i JSON stavano prima del documento d'anno.
 *
 * Non la scrive più nessuno: resta perché la migrazione la deve ritrovare —
 * una cartella sincronizzata può portarsela dietro per mesi, da una macchina
 * che non è ancora stata aggiornata — e perché `.storico/` di allora sta lì
 * dentro.
 */
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
 * Il documento su cui si sta lavorando: l'unico stato di questo file.
 *
 * Lo imposta `Archivio` quando apre, ed è la sola cosa che serve sapere per
 * tradurre in un Uri qualunque percorso salvato nei JSON. Null finché un
 * documento non c'è — registro appena installato, o documento chiuso: chi
 * scrive deve accorgersene e non inventare un posto dove mettere le cose.
 */
let documentoAperto: apparato.Uri | null = null

/** Dichiara quale documento vale da adesso. Null: nessuno aperto. */
export function impostaDocumento (uri: apparato.Uri | null): void {
  documentoAperto = uri
}

/** Il documento dell'anno in uso, o null se non ce n'è ancora uno. */
export function percorsoPacchetto (): apparato.Uri | null {
  return documentoAperto
}

/**
 * La cartella che contiene il documento.
 *
 * È la radice di tutto quel che il registro scrive accanto ai dati, ed è anche
 * il posto da cui partono le migrazioni: chi apre un documento sta indicando
 * quella cartella, e quel che c'è dentro con la disposizione di prima si
 * converte lì.
 */
export function cartellaDocumento (): apparato.Uri | null {
  return documentoAperto ? apparato.Uri.joinPath(documentoAperto, '..') : null
}

/** Il nome del documento senza estensione: `2026-2027`. */
export function nomeDocumento (): string | null {
  return documentoAperto ? nomeDelPacchetto(documentoAperto) : null
}

/**
 * La cartella gemella del documento: allegati, archivio, esportazioni.
 *
 * Porta il nome del documento e gli sta accanto. Null quando non c'è un
 * documento aperto, per la stessa ragione di sopra.
 */
export function cartellaAnno (): apparato.Uri | null {
  const dove = cartellaDocumento()
  const nome = nomeDocumento()
  return dove && nome ? apparato.Uri.joinPath(dove, nome) : null
}

// ------------------------------------------- una cartella qualunque, per le migrazioni
//
// Le migrazioni lavorano su quel che sta intorno al documento che si sta
// aprendo, e devono poter nominare anni che non sono quello in uso: prendono
// quindi la radice come argomento invece di leggerla da qui. È la sola parte
// del file che sa ancora che in una cartella ci può stare più di un anno.

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

/** La sottocartella dei JSON di un anno, nella disposizione di prima. */
export function cartellaCollezioniIn (radice: apparato.Uri, cartella: string): apparato.Uri | null {
  const anno = cartellaAnnoIn(radice, cartella)
  return anno ? apparato.Uri.joinPath(anno, DATI) : null
}

/** Il file di una collezione di un anno, nella disposizione di prima. */
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
 * La cassetta dei PDF com'era prima: una cartella su disco, con dentro una
 * sottocartella per ogni documento da raccogliere.
 *
 * Non è più la porta d'ingresso. I PDF entrano dal pannello — trascinati o
 * scelti — e stanno dentro il documento dell'anno da subito: una cartella da
 * tenere sincronizzata, con dentro file scaricati a metà da aspettare, era
 * tutta complicazione al servizio di un gesto che adesso si fa in un colpo.
 *
 * Resta perché una cartella sincronizzata se la può portare dietro per mesi,
 * da una macchina non ancora aggiornata, e dentro può esserci il foglio che
 * qualcuno aspetta: `sorter.ts` la svuota all'apertura dell'anno, una
 * volta sola, e da lì in poi non ci guarda più nessuno.
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
export async function vociDi (cartella: apparato.Uri): Promise<Array<[string, apparato.GenereFile]>> {
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
