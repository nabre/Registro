// Le piccole regole sul testo che il registro usa dappertutto: come si
// confronta un nome, come si conta al plurale, come si riempie un modello.
//
// Stanno qui e non sparse perché erano scritte due o tre volte ciascuna, con
// piccole differenze — e la differenza fra «rossi» e «Rossi » è il modo in cui
// due materie uguali finiscono per essere due, o un allievo non si ritrova.
// Il file non importa nulla: lo possono usare tutti senza giri.

/**
 * Un testo ridotto a quel che serve per confrontarlo: minuscolo, senza
 * accenti, senza punteggiatura, con gli spazi normalizzati.
 *
 * Gli accenti se ne vanno perché la segreteria stampa «Muller» dove il registro
 * scrive «Müller» abbastanza spesso da non poterci contare, e «Ed. fisica» e
 * «ed.  fisica» sono la stessa materia scritta due volte.
 */
export function normalizzaTesto (testo: string): string {
  return testo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Vero se `parola` compare intera dentro `testo`, e non come pezzo di un'altra:
 * «conti» non sta dentro «acconti», «rossi» non sta dentro «grossi». Tutti e
 * due devono già essere passati da `normalizzaTesto`.
 */
export function contieneParola (testo: string, parola: string): boolean {
  if (!parola) return false
  return ` ${testo} `.includes(` ${parola} `)
}

/** «1 lezione», «3 lezioni»: il numero con la parola giusta. */
export function plurale (quanti: number, uno: string, molti: string): string {
  return `${quanti} ${quanti === 1 ? uno : molti}`
}

/**
 * Un modello con i segnaposto fra graffe riempiti dai valori dati.
 *
 * Uno sconosciuto resta com'è scritto invece di sparire: un `{azienda}` rimasto
 * in mezzo alla lettera si vede subito, mentre un buco si scopre solo dopo
 * averla spedita a venticinque aziende.
 */
export function compilaModello (modello: string, valori: Record<string, string>): string {
  return modello.replace(/\{(\w+)\}/g, (intero, chiave: string) =>
    chiave in valori ? valori[chiave] : intero,
  )
}

/** Un indirizzo si controlla quel tanto che basta a intercettare un refuso. */
export function emailValida (valore: unknown): boolean {
  return typeof valore === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valore.trim())
}

/**
 * Aggiunge un indirizzo a un elenco senza doppioni, se è un indirizzo. Torna
 * falso quando non lo è: chi chiama deve dire per nome chi resta senza.
 */
export function aggiungiIndirizzo (elenco: Set<string>, valore: string | undefined): boolean {
  const pulito = (valore ?? '').trim()
  if (!emailValida(pulito)) return false
  elenco.add(pulito.toLowerCase())
  return true
}

/**
 * Un percorso letto da un file, con le barre nel verso giusto. I file del
 * registro passano da Windows e da OneDrive, e una backslash scritta a mano
 * non deve diventare un file introvabile.
 */
export function percorsoRelativo (valore: unknown): string {
  return typeof valore === 'string' ? valore.replace(/\\+/g, '/') : ''
}

/** Il nome del file in fondo a un percorso, o stringa vuota. */
export function nomeDelFile (percorso: string): string {
  return percorso.split('/').pop() ?? ''
}

// ------------------------------------------------------------------ file

/** I nomi che Windows non accetta come file o cartella, con o senza estensione. */
const RISERVATI_WINDOWS = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i

/**
 * Un nome che si può scrivere su disco su tutti i sistemi: via i caratteri
 * vietati, i caratteri di controllo, i punti e gli spazi in coda — Windows non
 * li tiene nei nomi di cartella, e lo si scoprirebbe con una cartella che non
 * si crea — e i nomi riservati. Era scritto quattro volte, ognuna con una
 * regola in meno.
 */
export function nomeSicuro (etichetta: string, ripiego = 'senza nome'): string {
  const pulito = etichetta
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/, '')
    .trim()
  if (!pulito) return ripiego
  return RISERVATI_WINDOWS.test(pulito) ? `${pulito}-` : pulito
}

/** L'estensione di un nome di file, punto compreso, o quella di ripiego. */
export function estensioneDi (nome: string, ripiego = '.pdf'): string {
  const solo = nomeDelFile(nome)
  const punto = solo.lastIndexOf('.')
  return punto > 0 ? solo.slice(punto).toLowerCase() : ripiego
}
