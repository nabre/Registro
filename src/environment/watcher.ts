// `createFileSystemWatcher` su chokidar.
//
// `archive.ts` scarta l'eco delle proprie scritture confrontando
// `uri.toString()`: l'`Uri` annunciato qui deve essere identico a quello
// composto con `joinPath` in scrittura, quindi si passa sempre da `Uri.file`.
// chokidar non conosce i glob: si osserva la cartella e si filtra qui.

import { realpath } from 'node:fs/promises'
import * as percorsi from 'node:path'
import { dentro } from './context.js'
import { Smaltitore, EventEmitter, type Event } from './events.js'
import { ModelloRelativo, Uri } from './uri.js'

export interface Osservatore extends Smaltitore {
  onDidCreate: Event<Uri>
  onDidChange: Event<Uri>
  onDidDelete: Event<Uri>
  /** Si risolve a prima scansione finita, quando gli eventi cominciano ad arrivare (per le prove). */
  readonly pronto: Promise<void>
}

/**
 * Scioglie le graffe di un glob nell'elenco delle alternative. Le graffe
 * annidate non sono gestite: il pattern non combacerebbe con niente.
 */
export function senzaGraffe (pattern: string): string[] {
  const apre = pattern.indexOf('{')
  if (apre === -1) return [pattern]
  const chiude = pattern.indexOf('}', apre)
  if (chiude === -1) return [pattern]
  const prima = pattern.slice(0, apre)
  const dopo = pattern.slice(chiude + 1)
  return pattern
    .slice(apre + 1, chiude)
    .split(',')
    .flatMap((alternativa) => senzaGraffe(`${prima}${alternativa}${dopo}`))
}

/** Traduce un glob senza graffe nell'espressione che riconosce un percorso relativo. */
export function aEspressione (glob: string, indifferenteAlleMaiuscole: boolean): RegExp {
  let uscita = ''
  for (let i = 0; i < glob.length; i += 1) {
    const carattere = glob[i]
    if (carattere === '*') {
      if (glob[i + 1] === '*') {
        // `**/` copre anche il niente: `**/*.pdf` prende pure i file nella base.
        if (glob[i + 2] === '/') {
          uscita += '(?:.*/)?'
          i += 2
        } else {
          uscita += '.*'
          i += 1
        }
      } else {
        uscita += '[^/]*'
      }
      continue
    }
    if (carattere === '?') {
      uscita += '[^/]'
      continue
    }
    uscita += carattere.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${uscita}$`, indifferenteAlleMaiuscole ? 'i' : '')
}

/**
 * Profondità massima per chokidar: nessuna con `**`, altrimenti il numero di
 * barre del pattern, così non si osservano sottocartelle inutili.
 */
function profondita (glob: string[]): number | undefined {
  if (glob.some((pezzo) => pezzo.includes('**'))) return undefined
  return Math.max(...glob.map((pezzo) => pezzo.split('/').length - 1))
}

/** Un percorso che porta una lettera di unità: su Windows le maiuscole non contano. */
const UNITA = /^\/[A-Za-z]:/

/** Il percorso di un file rispetto alla base, in forma POSIX, o `null` se sta fuori. */
function relativo (base: Uri, file: Uri): string | null {
  if (!dentro(base, file)) return null
  return file.path.slice(base.path.length).replace(/^\//, '')
}

export function createFileSystemWatcher (dove: ModelloRelativo): Osservatore {
  const base = dove.baseUri
  const alternative = senzaGraffe(dove.pattern)
  const indifferente = UNITA.test(base.path)
  const espressioni = alternative.map((glob) => aEspressione(glob, indifferente))

  const creato = new EventEmitter<Uri>()
  const cambiato = new EventEmitter<Uri>()
  const cancellato = new EventEmitter<Uri>()

  const combacia = (file: Uri): boolean => {
    const parte = relativo(base, file)
    return parte !== null && espressioni.some((espressione) => espressione.test(parte))
  }

  /**
   * chokidar osserva il percorso reale della base e gli eventi si riportano
   * alla base richiesta. Con un nome corto 8.3 (`RUNNER~1`) libuv abbatte il
   * processo (`Assertion failed: !_wcsnicmp(...)`).
   */
  let reale = base.fsPath
  const allaBase = (percorso: string): string =>
    reale === base.fsPath
      ? percorso
      : percorsi.join(base.fsPath, percorsi.relative(reale, percorso))

  const annuncia = (emettitore: EventEmitter<Uri>) => (percorso: string) => {
    // Sempre `Uri.file`, come in scrittura: una stringa composta a mano darebbe
    // un `toString()` diverso e l'eco non si riconoscerebbe più.
    const file = Uri.file(allaBase(percorso))
    if (combacia(file)) emettitore.fire(file)
  }

  // Tipo minimo scritto qui: chokidar è solo ESM e il registro compila in CommonJS.
  let osservatore: { close (): Promise<void> } | null = null
  let chiuso = false

  /** chokidar si carica con `import()` dinamico perché è solo ESM. */
  const pronto = (async () => {
    const { watch } = await import('chokidar')
    // Il `realpath` delle promesse usa libuv e scioglie `RUNNER~1`; quello in JS no.
    reale = await realpath(base.fsPath).catch(() => base.fsPath)
    if (chiuso) return
    const vivo = watch(reale, {
      // Quel che c'era già non si annuncia: l'esistente si rilegge all'apertura.
      ignoreInitial: true,
      depth: profondita(alternative),
      // Le cartelle passano sempre, i file solo se combaciano. Senza `stat`
      // chokidar ripassa poi con la `stat`: lì si decide.
      ignored: (percorso, stat) =>
        (stat?.isFile() ? !combacia(Uri.file(allaBase(percorso))) : false),
    })
    osservatore = vivo
    vivo.on('add', annuncia(creato))
    vivo.on('change', annuncia(cambiato))
    vivo.on('unlink', annuncia(cancellato))
    // Un guasto dell'osservatore non ferma il registro: si perde solo l'aggiornamento da fuori.
    vivo.on('error', (errore) => console.error('osservatore dei file', errore))
    await new Promise<void>((risolvi) => vivo.once('ready', () => risolvi()))
  })().catch((errore: unknown) => {
    console.error(`non riesco a osservare ${base.fsPath}`, errore)
  })

  const smaltibile = new Smaltitore(() => {
    chiuso = true
    void osservatore?.close()
    creato.dispose()
    cambiato.dispose()
    cancellato.dispose()
  })

  return Object.assign(smaltibile, {
    onDidCreate: creato.event,
    onDidChange: cambiato.event,
    onDidDelete: cancellato.event,
    pronto,
  })
}
