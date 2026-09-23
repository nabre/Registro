// Chi guarda i file: `createFileSystemWatcher` su chokidar.
//
// Due soli osservatori esistono nel registro — i JSON dell'anno in
// `archive.ts`, i PDF della cassetta in `sorter.ts` — ma il primo dei due
// regge la difesa più delicata di tutta la migrazione, e va capita prima di
// leggere il resto del file.
//
// `archive.ts` scrive i propri file e poi si sente annunciare le proprie
// scritture. Per non ricaricarsi da solo a ogni salvataggio tiene una mappa
// chiavata su `uri.toString()` e scarta gli eventi arrivati subito dopo una
// scrittura sua. Perché quella mappa funzioni, l'`Uri` che esce di qui deve
// dare *la stessa identica stringa* dell'`Uri` composto con `joinPath` nel
// percorso di scrittura. È per questo che l'`Uri` dello shim canonicalizza nel
// costruttore, ed è qui che si vede se serviva: chokidar consegna percorsi
// nativi — `D:\Registro\2026-2027\dati\lezioni.json` — e la sola via lecita per
// tornare a un `Uri` è `Uri.file`, che è quella che il resto del registro usa.
// Nessuna scorciatoia, nessuna stringa composta a mano.
//
// L'altra differenza da VS Code è che chokidar dalla versione 4 non conosce
// più i glob: si osserva la cartella e si filtra qui. Il filtro non è un
// dettaglio di comodo — senza, l'archivio si ricaricherebbe anche per una
// copia finita in `.storico/` — e la traduzione del pattern è provata a parte.

import { dentro } from './context.js'
import { Smaltitore, EventEmitter, type Event } from './events.js'
import { ModelloRelativo, Uri } from './uri.js'

export interface Osservatore extends Smaltitore {
  onDidCreate: Event<Uri>
  onDidChange: Event<Uri>
  onDidDelete: Event<Uri>
  /**
   * Non è API di VS Code: dice quando la prima scansione è finita e gli eventi
   * cominciano ad arrivare. Serve alle prove, che altrimenti scriverebbero un
   * file prima che ci sia qualcuno ad accorgersene.
   */
  readonly pronto: Promise<void>
}

/**
 * Scioglie le graffe di un glob nell'elenco delle alternative.
 *
 * `{registro.json, <anno>/dati/<nome>.json}` diventa due pattern, che è quel che chokidar
 * vuole: le graffe sono l'unica parte della sintassi di VS Code che non ha un
 * corrispondente. Le graffe annidate non si trattano perché nel registro non
 * ce ne sono: comparissero, il pattern uscirebbe di qui intero e non
 * combacerebbe con niente — un guasto che si vede subito, non uno che si
 * nasconde.
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
        // `**/` copre anche il niente: in VS Code `**/*.pdf` prende pure i file
        // che stanno subito dentro la base, e la cassetta ne è piena.
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
 * Quanto in giù scendere.
 *
 * Con un `**` non c'è un fondo e chokidar deve guardare tutto; senza, il fondo
 * è il numero di barre del pattern, e dirglielo evita di mettersi in ascolto su
 * `documentazione/` — che è la parte grossa della cartella e non contiene
 * niente che l'archivio voglia sapere.
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

  const annuncia = (emettitore: EventEmitter<Uri>) => (percorso: string) => {
    // L'unica via lecita per tornare a un `Uri`: `Uri.file`, la stessa che usa
    // il percorso di scrittura. Comporre la stringa a mano — anche solo
    // mettendo insieme la base e il nome — darebbe un `toString()` diverso, e
    // la difesa contro l'eco smetterebbe di riconoscere le proprie scritture.
    const file = Uri.file(percorso)
    if (combacia(file)) emettitore.fire(file)
  }

  // Del watcher di chokidar serve una cosa sola, ed è chiuderlo: il tipo si
  // dichiara qui, per quel che se ne usa. Nominarlo per intero vorrebbe dire
  // importarlo, e chokidar è solo ESM mentre il registro compila in CommonJS.
  let osservatore: { close (): Promise<void> } | null = null
  let chiuso = false

  /**
   * chokidar si carica a parte perché è solo ESM e il registro compila in
   * CommonJS. Non cambia niente per chi chiama: gli eventi che contano
   * arrivano dopo la prima scansione, che è comunque asincrona.
   */
  const pronto = (async () => {
    const { watch } = await import('chokidar')
    if (chiuso) return
    const vivo = watch(base.fsPath, {
      // Come in VS Code: quel che c'era già non è una novità. Chi deve
      // guardare anche l'esistente se lo rilegge da sé all'apertura.
      ignoreInitial: true,
      depth: profondita(alternative),
      // Le cartelle passano sempre, o non si scenderebbe fino ai file che
      // interessano; i file che non combaciano non meritano un watcher
      // ciascuno. Senza la stat chokidar ripassa di qui con la stat in mano: in
      // quel giro non si decide niente.
      ignored: (percorso, stat) => (stat?.isFile() ? !combacia(Uri.file(percorso)) : false),
    })
    osservatore = vivo
    vivo.on('add', annuncia(creato))
    vivo.on('change', annuncia(cambiato))
    vivo.on('unlink', annuncia(cancellato))
    // Un guasto dell'osservatore non deve far cadere il registro: chi scrive
    // continua a scrivere, e quel che si perde è l'aggiornamento da fuori.
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
