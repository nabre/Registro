// Il nome precedente del programma: «Registro docenti».
//
// La cartella dei dati si rinomina (mai copiarla: contiene gigabyte di modelli)
// e i percorsi nei suoi file passano al nome nuovo.
//
// Solo moduli `node:`: gira in cima a `shell/main.ts`, prima di chiunque chieda
// dove stanno i dati.

import { existsSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** Il nome precedente della cartella dei dati. */
// testo-fisso: il nome di una cartella sul disco, lo stesso in ogni lingua
export const NOME_VECCHIO = 'Registro docenti'

/** Il nome precedente della cartella dei dati del portabile, accanto all'eseguibile. */
// testo-fisso: il nome di una cartella sul disco, lo stesso in ogni lingua
export const CARTELLA_PORTABILE_VECCHIA = 'Registro docenti - dati'

/**
 * L'`appId` precedente: nome di voci nel registro di Windows, e origine del
 * GUID dell'installazione che `electron-builder.json` tiene fisso.
 * `verificaIdentita()` in `esbuild.mjs` lo legge da questa riga.
 */
export const IDENTITA_VECCHIA = 'ch.edu.ti.cptt.registro-docenti'

/** I file dei dati che contengono percorsi. */
const FILE_CON_PERCORSI = ['impostazioni.json', 'documenti.json']

// --------------------------------------------------------------- il trasloco

type EsitoTrasloco =
  /** Niente da traslocare. */
  | { esito: 'niente' }
  /** Rinominata; `riscritti` sono i file con i percorsi aggiornati. */
  | { esito: 'traslocata', riscritti: string[] }
  /** Ci sono tutte e due: vale la nuova, la vecchia resta com'è. */
  | { esito: 'entrambe' }
  /** Rinomina non riuscita: per questa volta si lavora sulla vecchia. */
  | { esito: 'fallita', motivo: string }

function èCartella (cammino: string): boolean {
  try {
    return statSync(cammino).isDirectory()
  } catch {
    return false
  }
}

/**
 * Rinomina la cartella dei dati con una `rename` sola: istantanea e atomica.
 * Su Windows fallisce (`EPERM`, `EBUSY`) se un file dentro è aperto, e chi
 * chiama resta sulla vecchia. Con tutte e due presenti non si fonde niente.
 */
export function traslocaDati (vecchia: string, nuova: string): EsitoTrasloco {
  if (!èCartella(vecchia)) return { esito: 'niente' }
  if (existsSync(nuova)) return { esito: 'entrambe' }
  try {
    renameSync(vecchia, nuova)
  } catch (errore) {
    const codice = (errore as { code?: string } | null)?.code
    const messaggio = errore instanceof Error ? errore.message : String(errore)
    return { esito: 'fallita', motivo: codice ? `${codice}: ${messaggio}` : messaggio }
  }
  // La cartella è già al suo posto: un guasto nelle rifiniture non lo annulla.
  let riscritti: string[] = []
  try {
    riscritti = riscriviPercorsi(nuova, vecchia, nuova)
  } catch (errore) {
    console.warn('Percorsi dei dati non riscritti:', errore instanceof Error ? errore.message : String(errore))
  }
  return { esito: 'traslocata', riscritti }
}

/** Il confronto dei percorsi: senza maiuscole dove il sistema non le distingue. */
function comeLiConfronta (testo: string): string {
  return process.platform === 'linux' ? testo : testo.toLowerCase()
}

/**
 * `valore` con il prefisso `vecchia` sostituito da `nuova`, o `null`. Il
 * prefisso deve finire a un separatore (`…\Registro docenti2` non conta), e
 * vale anche scritto con le barre dritte.
 */
function sostituisciPrefisso (valore: string, vecchia: string, nuova: string): string | null {
  const forme: Array<[string, string]> = [[vecchia, nuova]]
  if (vecchia.includes('\\')) forme.push([vecchia.replaceAll('\\', '/'), nuova.replaceAll('\\', '/')])
  for (const [da, a] of forme) {
    if (!comeLiConfronta(valore).startsWith(comeLiConfronta(da))) continue
    const resto = valore.slice(da.length)
    if (resto === '' || resto.startsWith('\\') || resto.startsWith('/')) return a + resto
  }
  return null
}

/** Ogni stringa di un valore JSON, ripassata da `cambia`. */
function ripassa (valore: unknown, cambia: (testo: string) => string): unknown {
  if (typeof valore === 'string') return cambia(valore)
  if (Array.isArray(valore)) return valore.map((voce) => ripassa(voce, cambia))
  if (valore !== null && typeof valore === 'object') {
    return Object.fromEntries(
      Object.entries(valore as Record<string, unknown>)
        .map(([chiave, voce]) => [chiave, ripassa(voce, cambia)]),
    )
  }
  return valore
}

/**
 * In `impostazioni.json` e `documenti.json` ogni stringa che comincia con la
 * cartella vecchia passa alla nuova. Tutte le stringhe, non un elenco di chiavi, così le chiavi future sono
 * coperte. Scrive come `environment/jsonStore.ts`, solo se è cambiato qualcosa;
 * un file illeggibile resta com'è. Torna i nomi dei file riscritti.
 */
export function riscriviPercorsi (cartellaDati: string, vecchia: string, nuova: string): string[] {
  const riscritti: string[] = []
  for (const nome of FILE_CON_PERCORSI) {
    const file = join(cartellaDati, nome)
    let letto: unknown
    try {
      letto = JSON.parse(readFileSync(file, 'utf8'))
    } catch {
      continue
    }
    let cambiato = false
    const nuovo = ripassa(letto, (testo) => {
      const esito = sostituisciPrefisso(testo, vecchia, nuova) ?? testo
      if (esito !== testo) cambiato = true
      return esito
    })
    if (!cambiato) continue
    const provvisorio = `${file}.trasloco`
    writeFileSync(provvisorio, `${JSON.stringify(nuovo, null, 2)}\n`, 'utf8')
    renameSync(provvisorio, file)
    riscritti.push(nome)
  }
  return riscritti
}
