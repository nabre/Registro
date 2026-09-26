// Pulizia all'avvio delle cartelle temporanee rimaste sul disco.
//
// `mtmd.ts` cancella le sue nel `finally`, ma se il processo muore (Windows che
// si spegne) restano, con dati di minorenni. Si cancellano quelle più vecchie di
// un'ora: le più giovani possono essere al lavoro in un'altra finestra.

import { readdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'

/** I prefissi passati a `mkdtemp` in `mtmd.ts` (vanno tenuti allineati) e quello della voce, che può ancora trovarsi sul disco. */
const PREFISSI = ['registro-pagina-', 'registro-voce-'] as const

/** Più giovani di così non si toccano: potrebbero essere al lavoro adesso. */
const ETA_MINIMA_MS = 60 * 60 * 1000

/**
 * Cancella le cartelle temporanee vecchie. Non solleva mai: quel che resta si
 * riprova al prossimo avvio. `cartella` e `adesso` servono alle prove.
 */
export async function ripulisciTemporaneiVecchi (
  cartella: string = tmpdir(),
  adesso: number = Date.now(),
): Promise<void> {
  let voci: string[]
  try {
    voci = await readdir(cartella)
  } catch {
    return
  }
  await Promise.all(
    voci
      .filter((nome) => PREFISSI.some((prefisso) => nome.startsWith(prefisso)))
      .map(async (nome) => {
        const pieno = percorso.join(cartella, nome)
        try {
          const stato = await stat(pieno)
          if (!stato.isDirectory() || adesso - stato.mtimeMs < ETA_MINIMA_MS) return
          await rm(pieno, { recursive: true, force: true })
        } catch {
          // Sparita nel frattempo o bloccata da un antivirus: al prossimo avvio.
        }
      }),
  )
}
