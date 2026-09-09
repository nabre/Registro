// Dove vivono i dati e come si chiamano i file.
//
// Il registro non usa uno storage interno dell'applicazione: scrive JSON dentro il
// workspace. Così i dati stanno accanto al resto del materiale del docente,
// si sincronizzano con la cartella, si mettono sotto Git e si possono aprire
// con un editor di testo se serve rimediare a mano.
//
// Un file per collezione invece di un unico blocco: le lezioni cambiano ogni
// giorno, le classi due volte l'anno, e file separati fanno diff leggibili e
// riducono il rischio di perdere tutto in una scrittura andata storta.
//
// E sopra i file c'è l'anno scolastico, che è l'unità di stoccaggio:
//
//   registro/
//     registro.json          dice soltanto quale anno si sta usando
//     2026-2027/
//       dati/                le collezioni di quell'anno, e le loro copie
//         registro.json      l'anno, le sue materie, le sue impostazioni
//         classi.json  corsi.json  lezioni.json  …
//         .storico/
//       archivio/            i documenti caricati, per classe
//       esportazioni/        quel che il registro stampa, con la stessa
//                            struttura: si cancella per intero e si rifà
//       in-arrivo/  quarantena/  allegati/  risorse/  assenze/
//     2027-2028/
//       …
//
// Un anno è una cartella e basta: si archivia, si copia su una chiavetta, si
// consegna a chi subentra, si mette da parte quando è finito. Prima era un
// campo dentro un file unico, e «l'anno scorso» voleva dire filtrare tutto —
// con il rischio, ogni volta che un filtro si dimenticava, di vedere in una
// media i voti di due anni diversi.
//
// Le sottocartelle dell'anno restano quelle di prima, con gli stessi nomi: i
// percorsi salvati nei JSON — `documentazione/DIC4a/…`, `allegati/…` — sono
// relativi alla cartella dell'anno, non alla radice, e quindi non cambiano
// quando un anno viene spostato o rinominato.

import * as vscode from 'vscode'

import { estensioneDi, nomeSicuro } from '../dominio/testo.js'

export { estensioneDi, nomeSicuro }

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
} as const

export type NomeCollezione = keyof typeof NOMI

/**
 * La sottocartella dei JSON dentro l'anno.
 *
 * Sta separata da `documentazione/` e dalle altre perché è l'unica che non si
 * apre a mano: dentro ci sono i file del programma, fuori i documenti di chi
 * insegna. Chi entra in una cartella d'anno per cercare una pagella non deve
 * inciampare in nove JSON.
 */
export const DATI = 'dati'

/** Il file in radice che dice quale anno si sta usando. */
export const INDICE = 'registro.json'

/** L'ultimo pezzo di un Uri: il nome del file come lo si vede nel gestore. */
export function nomeDelFileUri (uri: { path: string }, ripiego = 'documento.pdf'): string {
  return uri.path.split('/').pop() || ripiego
}

/** La cartella di lavoro, o null se non ne è ancora stata scelta una. */
export function radiceWorkspace (): vscode.Uri | null {
  return vscode.workspace.workspaceFolders?.[0]?.uri ?? null
}

/** Il nome di cartella usato quando l'impostazione non dice niente. */
export const CARTELLA_PREDEFINITA = 'registro'

/** Un percorso che non parte dalla radice del workspace: `C:\`, `/dati`, `\\server\quota`. */
function percorsoAssoluto (valore: string): boolean {
  return /^([a-zA-Z]:[\\/]|[\\/]|[a-zA-Z][a-zA-Z0-9+.-]*:)/.test(valore)
}

/**
 * La radice del registro, sempre dentro il workspace aperto: la cartella che
 * contiene un anno scolastico per sottocartella.
 *
 * Il percorso resta per forza relativo alla radice del progetto: un percorso
 * assoluto in `registroDocenti.cartellaDati` legherebbe il registro a una
 * macchina sola, e la stessa cartella sincronizzata aperta altrove punterebbe
 * nel vuoto. Un valore assoluto viene quindi ignorato, come le risalite `..`.
 *
 * Il valore vuoto vuol dire «non configurato», non «la radice del workspace»:
 * senza questa regola un default vuoto — anche quello di un'altra estensione
 * che dichiarasse la stessa impostazione — farebbe cercare i JSON accanto al
 * progetto invece che dentro `registro/`, e il registro risulterebbe vuoto.
 * Chi li vuole davvero nella radice scrive `.`.
 */
export function cartellaDati (): vscode.Uri | null {
  const radice = radiceWorkspace()
  if (!radice) return null

  const configurata = vscode.workspace
    .getConfiguration('registroDocenti')
    .get<string>('cartellaDati', CARTELLA_PREDEFINITA)
  const relativa = (typeof configurata === 'string' ? configurata : '').trim()
  if (relativa === '.') return radice

  const parti = percorsoAssoluto(relativa)
    ? []
    : relativa.split(/[\\/]+/).filter((p) => p !== '' && p !== '.' && p !== '..')
  return vscode.Uri.joinPath(radice, ...(parti.length > 0 ? parti : [CARTELLA_PREDEFINITA]))
}

/** Il file in radice che dice quale anno è in uso. */
export function percorsoIndice (): vscode.Uri | null {
  const radice = cartellaDati()
  return radice ? vscode.Uri.joinPath(radice, INDICE) : null
}

// ---------------------------------------------------------------- l'anno in uso

/**
 * La cartella dell'anno che si sta usando, per nome.
 *
 * È l'unico stato di questo file, ed è qui e non fra le impostazioni apposta:
 * l'anno in uso appartiene alla cartella — sta scritto nel suo `registro.json`
 * — non alla macchina su cui la si apre. Chi sincronizza il registro su due
 * computer si ritrova sullo stesso anno, che è quel che serve; un'impostazione
 * dell'applicazione invece resterebbe indietro su una delle due.
 *
 * Lo imposta `Archivio` quando carica, ed è la sola cosa che serve sapere per
 * tradurre in un Uri qualunque percorso salvato nei JSON.
 */
let annoInUso: string | null = null

/** Dichiara quale cartella d'anno vale da adesso. Null: nessun anno ancora. */
export function impostaAnnoInUso (cartella: string | null): void {
  annoInUso = cartella ? nomeSicuro(cartella) : null
}

/** Il nome della cartella dell'anno in uso, o null se non ce n'è ancora uno. */
export function annoInUsoCartella (): string | null {
  return annoInUso
}

/** La cartella di un anno qualsiasi, dato il nome della sua cartella. */
export function cartellaAnnoDi (cartella: string): vscode.Uri | null {
  const radice = cartellaDati()
  const nome = nomeSicuro(cartella)
  return radice && nome ? vscode.Uri.joinPath(radice, nome) : null
}

/**
 * La cartella dell'anno in uso: la radice di tutto quel che segue.
 *
 * Null finché un anno non c'è — registro mai usato, o cartella dei dati vuota:
 * chi scrive deve accorgersene e non inventare un posto dove mettere le cose.
 */
export function cartellaAnno (): vscode.Uri | null {
  return annoInUso ? cartellaAnnoDi(annoInUso) : null
}

/** La sottocartella dei JSON di un anno. */
export function cartellaCollezioniDi (cartella: string): vscode.Uri | null {
  const anno = cartellaAnnoDi(cartella)
  return anno ? vscode.Uri.joinPath(anno, DATI) : null
}

/** La sottocartella dei JSON dell'anno in uso. */
export function cartellaCollezioni (): vscode.Uri | null {
  const anno = cartellaAnno()
  return anno ? vscode.Uri.joinPath(anno, DATI) : null
}

/** Il file di una collezione dentro un anno qualsiasi. */
export function percorsoIn (cartella: string, nome: NomeCollezione): vscode.Uri | null {
  const dati = cartellaCollezioniDi(cartella)
  return dati ? vscode.Uri.joinPath(dati, NOMI[nome]) : null
}

/** Il file di una collezione dell'anno in uso. */
export function percorso (nome: NomeCollezione): vscode.Uri | null {
  const dati = cartellaCollezioni()
  return dati ? vscode.Uri.joinPath(dati, NOMI[nome]) : null
}

// ------------------------------------------------- le sottocartelle di un anno

/** Sottocartella degli allegati: i PDF di verifiche, soluzioni e prove corrette. */
export function cartellaAllegati (): vscode.Uri | null {
  const anno = cartellaAnno()
  return anno ? vscode.Uri.joinPath(anno, 'allegati') : null
}

/** Sottocartella delle risorse dei piani lezione: file e immagini della scaletta. */
export function cartellaRisorse (): vscode.Uri | null {
  const anno = cartellaAnno()
  return anno ? vscode.Uri.joinPath(anno, 'risorse') : null
}

/**
 * Sottocartella dei rapporti di assenze e ritardi: i fogli vergini e quelli
 * firmati dal datore di lavoro. Sta fuori da `documenti` perché è un'altra
 * pratica — dentro ci sono i periodi, e ogni periodo la sua cartella.
 */
export function cartellaAssenze (): vscode.Uri | null {
  const anno = cartellaAnno()
  return anno ? vscode.Uri.joinPath(anno, 'assenze') : null
}

/**
 * La cassetta della posta dei documenti: qui si buttano i PDF di classe e il
 * registro li divide da solo.
 *
 * Dentro, una sottocartella per ogni documento che si sta ancora raccogliendo —
 * «DIC4a — Pagella 3° anno» — creata dal registro e nominata da lui. È l'unico
 * modo perché un file lasciato cadere sappia dire a quale richiesta appartiene
 * senza che nessuno lo debba dichiarare: la cartella in cui è finito lo dice.
 * Un PDF lasciato nella radice viene comunque preso, e a quel punto la consegna
 * si prova a indovinarla dal nome del file e da quel che c'è scritto dentro.
 *
 * Sta dentro l'anno perché le richieste sono di un anno: la stessa «Pagella 3°
 * anno» torna ogni settembre, ed è un'altra raccolta con altri allievi.
 */
export function cartellaInArrivo (): vscode.Uri | null {
  const anno = cartellaAnno()
  return anno ? vscode.Uri.joinPath(anno, 'in-arrivo') : null
}

/**
 * Dove aspettano i PDF che non si è saputo smistare per intero. Non è un
 * cestino: è il posto in cui il file originale resta intero finché qualcuno non
 * decide che cosa farne, e da cui sparisce quando non resta più niente da fare.
 */
export function cartellaQuarantena (): vscode.Uri | null {
  const anno = cartellaAnno()
  return anno ? vscode.Uri.joinPath(anno, 'quarantena') : null
}

/**
 * L'Uri di un file allegato, dato il suo percorso relativo alla cartella
 * dell'anno. Le risalite `..` si scartano: il percorso viene da un JSON che si
 * può scrivere a mano, e da lì non si deve uscire dalla cartella dell'anno.
 */
export function fileAllegato (relativo: string): vscode.Uri | null {
  const anno = cartellaAnno()
  const parti = relativo.split(/[\\/]+/).filter((p) => p !== '' && p !== '.' && p !== '..')
  return anno && parti.length > 0 ? vscode.Uri.joinPath(anno, ...parti) : null
}

/** Le voci di una cartella, o niente se la cartella non c'è o non si legge. */
export async function vociDi (cartella: vscode.Uri): Promise<Array<[string, vscode.FileType]>> {
  try {
    return await vscode.workspace.fs.readDirectory(cartella)
  } catch {
    return []
  }
}

/** Le sottocartelle di una cartella, escluse quelle nascoste come `.storico`. */
export async function sottocartelleDi (cartella: vscode.Uri): Promise<string[]> {
  return (await vociDi(cartella))
    .filter(([nome, tipo]) => tipo === vscode.FileType.Directory && !nome.startsWith('.'))
    .map(([nome]) => nome)
    .sort()
}

/** Vero se a quel percorso c'è già qualcosa. */
export async function esisteFile (uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri)
    return true
  } catch {
    return false
  }
}
