// Un file JSON in `userData` (impostazioni, segreti, recenti, finestre), letto e
// riscritto senza perderlo. Tre casi: assente → predefiniti e si scrive; non JSON
// → predefiniti, e il file va messo da parte come `.rotto` prima di scriverci;
// illeggibile (EBUSY, EACCES…) → predefiniti ma non si scrive, e si riprova dopo.
// Scrittura atomica: file temporaneo, poi `rename`.

import { closeSync, fsyncSync, openSync, readFileSync, renameSync, writeFileSync } from 'node:fs'

/** Come è andata la lettura: il caso serve a decidere se si può scrivere. */
type EsitoLettura =
  | { stato: 'assente' }
  | { stato: 'letto', valore: unknown }
  | { stato: 'illeggibile', errore: unknown }
  | { stato: 'rotto', errore: unknown }

/** Vero per i codici d'errore che dicono «il file non c'è». */
function mancante (errore: unknown): boolean {
  const codice = (errore as { code?: string } | null)?.code
  return codice === 'ENOENT' || codice === 'ENOTDIR'
}

/** Legge un JSON dal disco senza mai sollevare: l'esito dice che cosa è successo. */
export function leggiJson (percorso: string): EsitoLettura {
  let crudo: string
  try {
    crudo = readFileSync(percorso, 'utf8')
  } catch (errore) {
    return mancante(errore) ? { stato: 'assente' } : { stato: 'illeggibile', errore }
  }
  try {
    return { stato: 'letto', valore: JSON.parse(crudo) }
  } catch (errore) {
    return { stato: 'rotto', errore }
  }
}

/** I rifiuti di Windows che vogliono dire «il file è occupato adesso», non «non puoi». */
const OCCUPATO = new Set(['EPERM', 'EACCES', 'EBUSY'])

/**
 * `renameSync` che su Windows riprova per due secondi se il file è tenuto aperto
 * (antivirus, indicizzatore, OneDrive). Versione sincrona di `rinominaConPazienza`
 * in `fs.ts`, qui perché questo modulo non deve importare Electron.
 */
function rinominaConPazienzaSync (da: string, a: string): void {
  const scadenza = Date.now() + 2000
  let fermo: Int32Array | null = null
  for (let attesa = 10; ; attesa = Math.min(attesa * 2, 200)) {
    try {
      renameSync(da, a)
      return
    } catch (errore) {
      const codice = (errore as NodeJS.ErrnoException).code ?? ''
      if (process.platform !== 'win32' || !OCCUPATO.has(codice) || Date.now() >= scadenza) throw errore
      fermo ??= new Int32Array(new SharedArrayBuffer(4))
      Atomics.wait(fermo, 0, 0, attesa)
    }
  }
}

/** Scrive un JSON in modo atomico; solleva se non ci riesce. */
export function scriviJson (percorso: string, valore: unknown): void {
  const temporaneo = `${percorso}.tmp`
  // `fsync` prima della rinomina: altrimenti un'interruzione può lasciare un file vuoto.
  const file = openSync(temporaneo, 'w')
  try {
    writeFileSync(file, `${JSON.stringify(valore, null, 2)}\n`, 'utf8')
    fsyncSync(file)
  } finally {
    closeSync(file)
  }
  rinominaConPazienzaSync(temporaneo, percorso)
}

/** Mette da parte un file non JSON come `.rotto`; se non riesce, pazienza. */
function mettiDaParte (percorso: string): void {
  try {
    renameSync(percorso, `${percorso}.rotto`)
  } catch {
    // Il file non c'è più o è bloccato: niente da fare.
  }
}

/** Un file JSON tenuto in memoria, che sa dire se scriverlo è sicuro. */
export interface Deposito<T> {
  /** Il contenuto, letto dal disco la prima volta e poi tenuto in memoria. */
  contenuto (): T
  /**
   * Scrive quel che `muta` ricava dal contenuto riletto; falso se il file è
   * illeggibile e va protetto. Una funzione e non un valore perché la rilettura
   * viene prima della modifica. `muta` torna un valore nuovo, o quello ricevuto
   * per dire «niente da scrivere».
   */
  salva (muta: (attuale: T) => T): boolean
  /** Dimentica quel che ha in memoria: la prossima lettura torna sul disco. */
  dimentica (): void
}

export function depositoJson<T> (
  dove: () => string,
  converti: (letto: unknown) => T,
  predefinito: () => T,
): Deposito<T> {
  let memoria: T | null = null
  // File illeggibile: la memoria è un ripiego e scriverla cancellerebbe il disco.
  let daProteggere = false
  // File non JSON: va messo da parte una volta, prima della prima scrittura.
  let daSalvare = false

  const contenuto = (): T => {
    // Finché il file è bloccato si riprova a ogni lettura.
    if (memoria !== null && !daProteggere) return memoria
    const esito = leggiJson(dove())
    daProteggere = esito.stato === 'illeggibile'
    daSalvare = esito.stato === 'rotto'
    memoria = esito.stato === 'letto' ? converti(esito.valore) : predefinito()
    return memoria
  }

  return {
    contenuto,
    salva (muta: (attuale: T) => T): boolean {
      // Se il file era bloccato si rilegge: se ora si legge si parte da lì.
      if (daProteggere) {
        contenuto()
        if (daProteggere) return false
      }
      const attuale = contenuto()
      const valore = muta(attuale)
      // Stesso oggetto: niente da cambiare, niente scrittura (e niente falso allarme a chi osserva il file).
      if (valore === attuale) return true
      const percorso = dove()
      if (daSalvare) {
        mettiDaParte(percorso)
        daSalvare = false
      }
      scriviJson(percorso, valore)
      memoria = valore
      return true
    },
    dimentica (): void {
      memoria = null
      daProteggere = false
      daSalvare = false
    },
  }
}
