// Le cartelle temporanee rimaste indietro da un giro precedente.
//
// `whisper.ts` e `mtmd.ts` scrivono in `%TEMP%` quel che devono dare a un
// programma a parte — la voce di chi detta, la scansione di un foglio firmato —
// e lo cancellano nel `finally`, comunque vada. Ma un `finally` gira soltanto
// se il processo è ancora vivo: quando Windows si spegne con il registro aperto
// l'applicazione viene chiusa senza `before-quit`, e la cartella resta lì, con
// dentro dati di minorenni, finché qualcuno non pulisce il disco a mano.
//
// Questa è la rete: all'avvio si cancellano le cartelle con quei due prefissi
// più vecchie di un'ora. L'ora c'è per non toccare quelle di un'altra finestra
// del registro aperta adesso, che una trascrizione o una pagina la stanno
// facendo davvero: nessuna delle due dura tanto.

import { readdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'

/** I prefissi passati a `mkdtemp` — `mtmd.ts` e `whisper.ts`. Cambiati lì, vanno cambiati qui. */
const PREFISSI = ['registro-pagina-', 'registro-voce-'] as const

/** Più giovani di così non si toccano: potrebbero essere al lavoro adesso. */
const ETA_MINIMA_MS = 60 * 60 * 1000

/**
 * Cancella le cartelle temporanee di voce e di pagine rimaste da un giro
 * precedente. Non solleva mai: una cartella che non si lascia cancellare si
 * riprova al prossimo avvio, e l'avvio non deve fermarsi per questo.
 *
 * `cartella` e `adesso` esistono per le prove.
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
          // Sparita nel frattempo, o bloccata da un antivirus: al prossimo giro.
        }
      }),
  )
}
