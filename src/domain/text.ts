// Le piccole regole sul testo usate dappertutto: confrontare un nome, contare
// al plurale, riempire un modello, pulire un percorso. In un posto solo perché
// «rossi» e «Rossi » non diventino due cose diverse. Importa soltanto il
// dispositivo multilingua, che è puro.

import { perNumero } from '../i18n/index.js'

/**
 * Due nomi in ordine, come li metterebbe una persona: `'it'` per gli accenti,
 * `numeric` perché «M2» venga prima di «M10». Lo stesso ordine ovunque, dalla
 * barra laterale al documento salvato.
 */
export function confrontaNomi (a: string, b: string): number {
  return a.localeCompare(b, 'it', { numeric: true })
}

/**
 * Un percorso incollato, senza spazi ai lati e senza le virgolette che
 * «Copia come percorso» di Explorer ci mette attorno (con quelle il file «non
 * esiste»).
 */
export function senzaVirgolette (scritto: string): string {
  return scritto.trim().replace(/^"(.*)"$/, '$1')
}

/**
 * Una quota da 0 a 1 scritta da leggere: «83%», arrotondata all'intero (le UD
 * si contano a decine, un decimale millanterebbe precisione). `vuoto` si scrive
 * quando la quota manca, e può dire perché («appello mai fatto»).
 */
export function percento (quota: number | null | undefined, vuoto = '—'): string {
  // Il miliardesimo in più recupera il mezzo perso dalla virgola mobile:
  // 0,145 * 100 fa 14,499999999999998, e va letto 15%.
  return quota === null || quota === undefined ? vuoto : `${Math.round(quota * 100 + 1e-9)}%`
}

/**
 * Un testo ridotto per il confronto: minuscolo, senza accenti né punteggiatura,
 * spazi normalizzati. Senza accenti perché «Muller» e «Müller» si mescolano.
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
 * I pezzi di una ricerca scritta a mano, pronti per il confronto: passano da
 * `normalizzaTesto` («muller», «MULLER», «Müller» sono la stessa ricerca) e si
 * spezzano dopo, così «dell’acqua» trova «Dell'Acqua» con ogni apostrofo. La
 * paglia deve passare dalla stessa funzione.
 */
export function pezziDiRicerca (cercato: string): string[] {
  return normalizzaTesto(cercato).split(' ').filter(Boolean)
}

/**
 * Vero se ogni pezzo della ricerca si trova nella paglia: una parola in più
 * restringe. Senza pezzi è vero.
 */
export function corrispondeAlla (paglia: string, pezzi: readonly string[]): boolean {
  const normale = normalizzaTesto(paglia)
  // Seconda prova senza spazi, per gli apostrofi: «dellacqua» deve trovare
  // «Dell'Acqua» (normalizzato «dell acqua»). Il prezzo è qualche risultato a
  // cavallo di due parole, meglio di una persona che non si trova.
  const schiacciata = normale.replace(/ /g, '')
  return pezzi.every(
    (pezzo) => normale.includes(pezzo) || schiacciata.includes(pezzo.replace(/ /g, '')),
  )
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

/**
 * «1 lezione», «3 lezioni»: il numero con la parola giusta secondo la lingua
 * (`perNumero`; in francese anche lo zero è singolare). Le due parole le dà
 * chi chiama.
 */
export function plurale (quanti: number, uno: string, molti: string): string {
  return `${quanti} ${perNumero(quanti, uno, molti)}`
}

/**
 * Un modello con i segnaposto fra graffe riempiti. Uno sconosciuto resta
 * scritto: un `{azienda}` rimasto si vede, un buco no.
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
 * Un percorso letto da un file, con le barre nel verso giusto: i file passano
 * da Windows e OneDrive.
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
 * Un nome scrivibile su disco su tutti i sistemi: via caratteri vietati e di
 * controllo, punti e spazi in coda (Windows non li tiene nelle cartelle), nomi
 * riservati. Il ripiego resta uguale in ogni lingua della macchina.
 */
// testo-fisso: nome su disco, uguale in tutte le lingue
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

/**
 * L'impronta di un testo (FNV-1a): dice se un file è ancora quello scritto
 * senza tenerne una copia. Non è una firma di sicurezza.
 */
export function impronta (testo: string): string {
  let valore = 0x811c9dc5
  for (let i = 0; i < testo.length; i += 1) {
    valore ^= testo.charCodeAt(i)
    // Moltiplicazione a 32 bit per il primo FNV (16777619).
    valore = Math.imul(valore, 0x01000193)
  }
  // Senza segno e in esadecimale: è un'etichetta, e si scrive dentro un JSON.
  return (valore >>> 0).toString(16).padStart(8, '0')
}
