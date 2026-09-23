/**
 * Quel che tutti i controlli statici di questa cartella facevano ognuno a modo
 * suo: camminare sui file e scrivere un percorso.
 *
 * Erano cinque camminate — `strati`, `censimento`, `pulsanti`, `moduli`,
 * `procedure` — scritte cinque volte, con **tre** insiemi di estensioni, **due**
 * politiche sui `.d.ts` e **due** modi di comporre il percorso piano, uno dei
 * quali spezzava sulla sola barra rovescia e quindi diceva la verità soltanto su
 * Windows. Cinque copie di una funzione di dieci righe non sono un problema
 * finché una delle cinque non sbaglia: allora è uno script che tace su file che
 * gli altri quattro guardano, e tace in silenzio — che è il modo in cui un
 * controllo statico diventa inutile senza che nessuno se ne accorga.
 *
 * Le estensioni restano un argomento: sono scelte vere e diverse — `strati`
 * guarda anche gli `.mjs` perché la riga di comando è codice, `censimento` anche
 * `.mts` e `.cjs` perché un export si può nominare da lì. I `.d.ts` invece no:
 * una dichiarazione di tipi non contiene codice da controllare, e le due
 * politiche di prima erano una svista, non due idee.
 */
import { readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

/** Le estensioni che si guardano quando nessuno ne chiede altre. */
const ESTENSIONI_PREDEFINITE = ['.ts']

/**
 * Ogni file di codice sotto una cartella, ricorsivamente.
 *
 * L'ordine è quello che dà il sistema — `readdirSync` — con ogni cartella
 * percorsa nel punto in cui compare: è l'ordine che avevano tutte e cinque le
 * copie, e i controlli che stampano un elenco lo ereditano da qui.
 *
 * I `.d.ts` restano sempre fuori: non c'è codice dentro una dichiarazione, e
 * chi la leggesse non ci troverebbe né import da collocare né pulsanti muti.
 */
export function fileSotto (cartella, estensioni = ESTENSIONI_PREDEFINITE, raccolti = []) {
  for (const voce of readdirSync(cartella, { withFileTypes: true })) {
    const percorso = join(cartella, voce.name)
    if (voce.isDirectory()) {
      fileSotto(percorso, estensioni, raccolti)
      continue
    }
    if (voce.name.endsWith('.d.ts')) continue
    if (estensioni.some((fine) => voce.name.endsWith(fine))) raccolti.push(percorso)
  }
  return raccolti
}

/**
 * Lo stesso percorso con le barre in avanti, su qualunque sistema.
 *
 * Non tocca altro: quel che entra relativo esce relativo. Serve perché i
 * messaggi, le mappe degli strati e i confronti fra percorsi si scrivono in una
 * forma sola — un `src\dominio\calculations.ts` in un rilievo si legge male e non si
 * incolla in nessun comando.
 */
export function piano (percorso) {
  return percorso.split(/[\\/]+/).join('/')
}

/** Il percorso piano rispetto a una base: è come i controlli nominano un file. */
export function daRadice (percorso, radice = '.') {
  return piano(relative(radice, percorso))
}
