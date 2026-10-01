// Le azioni del pannello: quel che si fa al registro (dove si va sta in
// `pages.ts`). Ogni comando dichiara `dove` vive:
//
//   `['app']`            — il registro intero, da qualunque pagina: palette, e
//                          menu «File» per quelli senza `fuoriMenu`.
//   `['calendario', …]`  — la riga delle azioni della pagina aperta, e solo lei.
//   `['schermo']`        — i comandi della proiezione, nella scheda «Proiezione»
//                          che compare a schermo acceso.
//
// Un comando non nomina una pagina che ha già il pulsante suo nel corpo
// (Documenti, Impostazioni): due pulsanti uguali visibili insieme confondono.
// Un comando che adesso non si può fare resta spento e dice perché
// (`impedimento()`). Il contesto viene da `context.ts`, non da chi clicca.
//
// L'elenco sta in `commands/`, una sezione per file con i suoi testi accanto;
// qui i tipi, l'ordine delle sezioni e le regole che valgono per tutti.

import { testi } from './commands.testi.js'
import type { NomeIcona } from './components/icons.js'
import { notifica } from './components/notifications.js'
import { stato, type SchedaDocente, type Vista } from './state.js'
// L'editor del calendario scrive a tasti fermi: vedi `eseguiComando`.
import { scriviInAttesa, spostamentoInAttesa } from './views/calendar/editor.js'
import { COMANDI_CHECK } from './commands/check.js'
import { COMANDI_CLASSE } from './commands/classes.js'
import { COMANDI_DOCUMENTI } from './commands/documents.js'
import { COMANDI_LEZIONE } from './commands/lesson.js'
import { COMANDI_MAPPA } from './commands/map.js'
import { COMANDI_PIANO } from './commands/plans.js'
import { COMANDI_PROGRAMMA } from './commands/program.js'
import { COMANDI_PROGETTO } from './commands/projects.js'
import { COMANDI_PROIEZIONE } from './commands/projection.js'
import { COMANDI_REGISTRO } from './commands/register.js'

// -------------------------------------------------------------- un comando

// Testi letti una volta: la pagina si ricarica quando cambia lingua (`core/i18n/page.ts`).
const t = testi()

/** Un testo che può dipendere da com'è messo il registro adesso. */
type Testo = string | (() => string)

/**
 * I posti in cui un comando può vivere: `'app'` il menu del programma,
 * `'schermo'` la scheda «Proiezione», ogni altro nome la riga di quella vista.
 */
export type Posto = 'app' | 'schermo' | Vista

export type Ambito = readonly Posto[]

export interface ComandoUI {
  /** Un nome stabile: lo usano le scorciatoie e chi invoca per nome. */
  id: string
  titolo: Testo
  simbolo: NomeIcona
  /**
   /**
    * Dove vive il comando. Una pagina mostra i comandi che la nominano e nessun
    * altro.
    */
  dove: Ambito
  /** Sottopagina del fascicolo in cui proporre il comando. */
  schedaDocente?: SchedaDocente
  /** Il riquadro dentro la riga: i comandi che si fanno per lo stesso motivo. */
  gruppo: string
  /** La riga che si legge fermandosi sopra: dice che cosa succede davvero. */
  aiuto?: Testo
  /** Nella grafia che si legge sul tasto: `Ctrl+S`. La ascolta `installaScorciatoie` (`shortcuts.ts`). */
  scorciatoia?: string
  /**
   * La scorciatoia la ascolta il menu dell'applicazione: qui si scrive soltanto.
   * Electron consuma gli acceleratori prima della pagina, e ascoltarli anche qui
   * farebbe partire il comando due volte.
   */
  dalMenu?: boolean
  /**
   * Vive nel programma (`'app'`) ma non nel menu «File», che tiene solo il minimo
   * per file e programma; la palette e la scorciatoia lo trovano comunque.
   */
  fuoriMenu?: boolean | (() => boolean)
  /**
   * Il comando che in quella scheda si preme più spesso: si vede di più. Può
   * dipendere dal registro (senza anni, «Nuovo anno» è l'unica cosa da fare).
   */
  primario?: boolean | (() => boolean)
  /**
   * Se quel che il comando accende è acceso adesso: i comandi della proiezione
   * mostrano lo stato dello schermo sul pulsante.
   */
  acceso?: () => boolean
  /** Perché adesso non si può, o `null` se si può. */
  impedimento?: () => string | null
  /**
   * Se il comando ha senso adesso nella sua pagina; se no non compare. A
   * differenza di `impedimento` lo toglie: per i comandi di un solo modo di
   * guardare (gli eventi ICS esistono solo nella settimana).
   */
  soloSe?: () => boolean
  al: () => void | Promise<unknown>
}

function testoDi (testo: Testo): string {
  return typeof testo === 'function' ? testo() : testo
}

export function titoloDi (comando: ComandoUI): string {
  return testoDi(comando.titolo)
}

export function aiutoDi (comando: ComandoUI): string | null {
  return comando.aiuto ? testoDi(comando.aiuto) : null
}

/**
 * Perché il comando non si può fare *da qui*, o `null`. Lo stato ricorda
 * l'ultima ora aperta anche dopo averla lasciata, e la palette elenca tutti i
 * comandi: si può solo se il comando vive nel programma, nello schermo o nella
 * pagina aperta, come nella barra.
 */
function fuoriPosto (comando: ComandoUI): string | null {
  if (comando.dove.includes('app') || comando.dove.includes('schermo')) return null
  if (vive(comando, stato.vista)) return null
  // La pagina è la sua, ma non quel che mostra (altra scheda, altro modo).
  return comando.dove.includes(stato.vista) ? t.nonConQuelCheMostra : t.dallaSuaPagina
}

export function impedimentoDi (comando: ComandoUI): string | null {
  return fuoriPosto(comando) ?? comando.impedimento?.() ?? null
}

export function primarioDi (comando: ComandoUI): boolean {
  return typeof comando.primario === 'function' ? comando.primario() : comando.primario === true
}
// ---------------------------------------------------------------- i comandi

/**
 * Tutti i comandi, nell'ordine della barra. Dentro un gruppo il primo è il più
 * usato; l'ordine dei gruppi è quello della loro prima comparsa qui: l'ordine
 * delle sezioni conta.
 */
export const COMANDI_UI: readonly ComandoUI[] = [
  ...COMANDI_PROGRAMMA,
  ...COMANDI_REGISTRO,
  ...COMANDI_LEZIONE,
  ...COMANDI_PIANO,
  ...COMANDI_CHECK,
  ...COMANDI_PROGETTO,
  ...COMANDI_MAPPA,
  ...COMANDI_CLASSE,
  ...COMANDI_PROIEZIONE,
  ...COMANDI_DOCUMENTI,
]

// -------------------------------------------------------------- le raccolte

/** Se il comando vive in quel posto. */
function vive (comando: ComandoUI, posto: Posto): boolean {
  return comando.dove.includes(posto) &&
    (posto !== 'docenteClasse' || !comando.schedaDocente || comando.schedaDocente === stato.schedaDocente) &&
    (comando.soloSe?.() ?? true)
}

/**
 * I comandi di un posto, divisi nei riquadri in cui compaiono, nell'ordine di
 * `COMANDI_UI`.
 */
export function gruppiDi (posto: Posto): Array<{ titolo: string, comandi: ComandoUI[] }> {
  const gruppi: Array<{ titolo: string, comandi: ComandoUI[] }> = []
  for (const comando of COMANDI_UI) {
    if (!vive(comando, posto)) continue
    const gruppo = gruppi.find((g) => g.titolo === comando.gruppo)
    if (gruppo) gruppo.comandi.push(comando)
    else gruppi.push({ titolo: comando.gruppo, comandi: [comando] })
  }
  return gruppi
}

/** I comandi della pagina aperta: quel che si può fare qui e adesso. */
export function gruppiDellaPagina (vista: Vista): Array<{ titolo: string, comandi: ComandoUI[] }> {
  return gruppiDi(vista)
}

/** I comandi del menu del programma, nei loro gruppi: senza quelli `fuoriMenu`. */
export function gruppiDelMenu (): Array<{ titolo: string, comandi: ComandoUI[] }> {
  return gruppiDi('app')
    .map((gruppo) => ({
      ...gruppo,
      comandi: gruppo.comandi.filter((comando) =>
        typeof comando.fuoriMenu === 'function' ? !comando.fuoriMenu() : comando.fuoriMenu !== true),
    }))
    .filter((gruppo) => gruppo.comandi.length > 0)
}

/** Il comando con quell'id, per chi lo invoca per nome. */
export function comandoPerId (id: string): ComandoUI | null {
  return COMANDI_UI.find((comando) => comando.id === id) ?? null
}

/**
 * Esegue un comando, o dice perché non si può. Il controllo sta qui perché
 * palette e scorciatoie arrivano da altre strade. Torna quel che il comando ha
 * avviato, così il pulsante tiene la rotella finché l'host risponde.
 */
export function eseguiComando (comando: ComandoUI): void | Promise<unknown> {
  // Uno spostamento delle frecce non ancora scritto è l'ultimo gesto: si scrive
  // prima di annullare o ripristinare, se no si annulla il passo sbagliato e la
  // pila di Ctrl+Y si svuota.
  if ((comando.id === 'modifica.annulla' || comando.id === 'modifica.ripristina') && spostamentoInAttesa()) {
    return scriviInAttesa().then(() => eseguiComando(comando))
  }
  const perche = impedimentoDi(comando)
  if (perche) {
    notifica(perche, 'avviso')
    return
  }
  return comando.al()
}
