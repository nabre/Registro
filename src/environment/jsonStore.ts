// Un file JSON in `userData`, letto e riscritto senza perderlo per strada.
//
// Quattro moduli qui dentro — impostazioni, segreti, documenti recenti, posti
// delle finestre — tengono lo stesso genere di file, e avevano tutti e quattro
// lo stesso difetto: un `catch` solo attorno alla lettura, che metteva in
// memoria un oggetto vuoto qualunque fosse il motivo del fallimento. Il primo
// salvataggio successivo riscriveva il file con quel vuoto.
//
// La differenza che conta non è fra «letto» e «non letto», è fra tre casi:
//
// - **Il file non c'è.** È l'avvio pulito. Si parte dai predefiniti e si scrive
//   senza pensarci: non c'è niente da perdere.
// - **Il file c'è ma non è JSON.** Qualcuno l'ha aperto a mano, o un
//   salvataggio è morto prima del rename. I predefiniti vanno bene, ma il file
//   di prima si mette da parte con il suffisso `.rotto` invece di finirci
//   sopra: se dentro c'erano le password della posta, chi le ha scritte vuole
//   poterle ripescare.
// - **Il file non si è potuto leggere.** OneDrive lo tiene aperto, l'antivirus
//   lo sta scandendo, i permessi sono cambiati: `EBUSY`, `EACCES`, `EIO`. Il
//   contenuto sul disco è intatto e va lasciato intatto. Si lavora con i
//   predefiniti per non impedire l'avvio, ma **non si scrive**, e alla lettura
//   dopo si riprova: l'antivirus prima o poi molla la presa.
//
// I salvataggi vanno in due tempi — file temporaneo, poi `rename` — perché il
// rename è atomico e un'interruzione a metà lascia al suo posto il file buono.

import { readFileSync, renameSync, writeFileSync } from 'node:fs'

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

/**
 * Legge un JSON dal disco senza mai sollevare: l'esito dice che cosa è
 * successo, e chi chiama decide che farne.
 */
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

/**
 * Scrive un JSON in due tempi. Solleva se non ci riesce: chi chiama sa se il
 * fallimento va detto all'utente o soltanto annotato.
 */
export function scriviJson (percorso: string, valore: unknown): void {
  const temporaneo = `${percorso}.tmp`
  writeFileSync(temporaneo, `${JSON.stringify(valore, null, 2)}\n`, 'utf8')
  renameSync(temporaneo, percorso)
}

/**
 * Mette da parte un file illeggibile prima di scriverci sopra. Se anche lo
 * spostamento fallisce si lascia perdere: era un tentativo di cortesia, non una
 * condizione per andare avanti.
 */
export function mettiDaParte (percorso: string): void {
  try {
    renameSync(percorso, `${percorso}.rotto`)
  } catch {
    // Il file non c'è più, o è bloccato: in entrambi i casi non c'è altro da
    // fare qui.
  }
}

/**
 * Il guscio attorno ai tre casi: tiene in memoria quel che ha letto e sa dire
 * se scrivere è sicuro.
 *
 * `converti` riceve quel che c'era nel file — che è `unknown`, perché sul disco
 * può esserci qualsiasi cosa — e ne ricava la forma attesa, o i predefiniti se
 * non la riconosce.
 */
export interface Deposito<T> {
  /** Il contenuto, letto dal disco la prima volta e poi tenuto in memoria. */
  contenuto (): T
  /**
   * Scrive quel che `muta` ricava dal contenuto **vero**. Torna falso se il
   * file sul disco non si è potuto leggere e va protetto.
   *
   * Prende una funzione e non un valore per una ragione che è costata un
   * difetto: chi chiamava prendeva il contenuto, lo cambiava e lo passava qui,
   * ma fra il prendere e il passare c'è una rilettura — quella che ricontrolla
   * se il blocco dell'antivirus si è sciolto. Sciogliendosi, la rilettura
   * riportava dal disco tutto quel che c'era, e la scrittura lo copriva con lo
   * snapshot di prima: un `impostazioni.json` con dentro una chiave sola, il
   * resto perduto, e `salva` che tornava `true`.
   *
   * Con la funzione l'ordine non si può più sbagliare: la rilettura viene
   * prima, e quel che si cambia è il contenuto fresco.
   *
   * `muta` costruisce un valore **nuovo**: ritornare quel che ha ricevuto vuol
   * dire «non c'è niente da cambiare», e allora non si scrive niente.
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
  // Vero quando il file esiste ma non si è potuto leggere: finché è così i
  // predefiniti in memoria sono un ripiego, non il contenuto vero, e scriverli
  // vorrebbe dire cancellare quel che c'è sul disco.
  let daProteggere = false
  // Vero quando sul disco c'è qualcosa che JSON non è: va messo da parte prima
  // di scriverci sopra, e una volta sola.
  let daSalvare = false

  const contenuto = (): T => {
    // Finché il file è bloccato quel che c'è in memoria è un ripiego: si
    // riprova a ogni giro, perché l'antivirus prima o poi molla la presa.
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
      // Un giro di lettura prima di scrivere: se il file era bloccato e adesso
      // non lo è più si riparte da quel che c'è, invece che dal vuoto.
      if (daProteggere) {
        contenuto()
        if (daProteggere) return false
      }
      // `muta` riceve quel che c'è **dopo** la rilettura, non prima: è l'ordine
      // che tiene insieme le due cose, e il motivo per cui qui arriva una
      // funzione invece di un valore già fatto.
      const attuale = contenuto()
      const valore = muta(attuale)
      // Chi non ha niente da cambiare ritorna quel che ha ricevuto, e allora
      // non si scrive: un salvataggio a vuoto costa un giro di disco e — dove
      // qualcuno guarda il file — un falso allarme. Ne consegue che `muta`
      // deve costruire un valore nuovo quando cambia qualcosa, e non toccare
      // quello che riceve.
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
