// L'elenco dei comandi e lo schema delle impostazioni, in un posto solo: menu,
// finestra delle impostazioni e valori predefiniti nascono tutti da qui.

import { LINGUE, NOMI_DELLE_LINGUE, SCELTA_SISTEMA, conMaiuscola, locale, èLingua, type Lingua } from './i18n/index.js'
import { testi } from './manifest.testi.js'

// ------------------------------------------------------------------ i comandi

export interface Comando {
  /** L'identificatore con cui lo si invoca: `registroDocenti.apri`. */
  readonly id: IdComando
  /** Il titolo nel menu, nella lingua di adesso (da `manifest.testi.ts`). */
  readonly titolo: string
  /** La scorciatoia nella grafia di Electron; `CommandOrControl` perché risponda anche su macOS. */
  readonly scorciatoia?: string
}

/** Gli identificatori dei comandi: il catalogo dei titoli non compila se ne manca uno o ne ha uno in più. */
export type IdComando =
  | 'registroDocenti.apri'
  | 'registroDocenti.guida'
  | 'registroDocenti.impostazioni'
  | 'registroDocenti.proietta'
  | 'registroDocenti.oggi'
  | 'registroDocenti.nuovaLezione'
  | 'registroDocenti.nuovaClasse'
  | 'registroDocenti.nuovoCorso'
  | 'registroDocenti.nuovoPiano'
  | 'registroDocenti.nuovaValutazione'
  | 'registroDocenti.nuovoAnno'
  | 'registroDocenti.ricarica'
  | 'registroDocenti.salvaConNome'
  | 'registroDocenti.chiudiDocumento'
  | 'registroDocenti.provaPosta'
  | 'registroDocenti.provaInvioPosta'
  | 'registroDocenti.collegaPosta'
  | 'registroDocenti.scollegaPosta'
  | 'registroDocenti.azzeraPosta'
  | 'registroDocenti.apriCartellaDati'


/** Un comando con il titolo letto a ogni richiesta, così segue il cambio di lingua. */
function comando (id: IdComando, scorciatoia?: string): Comando {
  const nato = { id, ...(scorciatoia ? { scorciatoia } : {}) }
  Object.defineProperty(nato, 'titolo', { enumerable: true, get: () => testi().comandi[id] })
  return nato as Comando
}

// L'ordine dei menu sta in `GRUPPI` (`shell/windows/menu.ts`); un comando non
// nominato là finisce sotto «Altro».
export const COMANDI: readonly Comando[] = [
  comando('registroDocenti.apri', 'CommandOrControl+Alt+R'),
  comando('registroDocenti.guida'),
  comando('registroDocenti.impostazioni', 'CommandOrControl+,'),
  comando('registroDocenti.proietta'),
  comando('registroDocenti.oggi', 'CommandOrControl+Alt+T'),
  comando('registroDocenti.nuovaLezione', 'CommandOrControl+Alt+N'),
  comando('registroDocenti.nuovaClasse'),
  comando('registroDocenti.nuovoCorso'),
  comando('registroDocenti.nuovoPiano'),
  comando('registroDocenti.nuovaValutazione'),
  comando('registroDocenti.nuovoAnno'),
  comando('registroDocenti.ricarica'),
  comando('registroDocenti.salvaConNome'),
  comando('registroDocenti.chiudiDocumento'),
  comando('registroDocenti.provaPosta'),
  comando('registroDocenti.provaInvioPosta'),
  comando('registroDocenti.collegaPosta'),
  comando('registroDocenti.scollegaPosta'),
  comando('registroDocenti.azzeraPosta'),
  comando('registroDocenti.apriCartellaDati'),
]

// ------------------------------------------------------------- le impostazioni

/** Una scelta fra le poche possibili, con il perché accanto. */
export interface Scelta {
  readonly valore: string | number
  readonly aiuto: string
}

/**
 * Che cosa tiene una voce di testo, quando non è testo qualunque.
 *
 * - `email`: un indirizzo di posta;
 * - `cartella`, `eseguibile`, `file`: un percorso intero, scelto con il dialogo
 *   (per `file` fra le `estensioni`); il campo è in sola lettura con «Sfoglia…»;
 * - `modello`: un file della cartella dei modelli, scelto solo nella sezione
 *   «Modelli linguistici»;
 * - `indirizzoLocale`: un indirizzo `http` di questo computer e di nessun altro
 *   (regola in `domain/loopback.ts`).
 */
export type Formato = 'email' | 'cartella' | 'eseguibile' | 'file' | 'modello' | 'indirizzoLocale'

export interface VoceImpostazione {
  readonly tipo: 'string' | 'number' | 'boolean'
  readonly predefinito: string | number | boolean
  /** Il nome della voce come lo legge chi insegna («Minuti di anticipo»). */
  readonly etichetta?: string
  /** Il testo discorsivo sotto il campo. */
  readonly descrizione: string
  /** Le sole risposte accettate, se sono poche e note. */
  readonly scelte?: readonly Scelta[]
  /**
   * Una forma più stretta del tipo. È una dogana, non un suggerimento:
   * `valoreConMotivo` la fa rispettare anche da riga di comando. Il vuoto resta
   * lecito (il predefinito).
   */
  readonly formato?: Formato
  /** Per `formato: 'file'`: le estensioni che il dialogo lascia scegliere, senza punto. */
  readonly estensioni?: readonly string[]
  /** Gli estremi di un numero: dogana come `scelte`; i `Math.max` a valle restano come rete. */
  readonly minimo?: number
  readonly massimo?: number
  /** Voce di rara modifica: in fondo alla sua sezione, in un gruppo che si apre. */
  readonly avanzata?: boolean
  /**
   * La chiave booleana che deve essere accesa perché questa conti. Col padre
   * spento la figlia si mostra disabilitata e non spuntata; il valore scritto
   * resta e torna quando il padre si riaccende.
   */
  readonly dipendeDa?: string
  /**
   * Le chiavi che devono avere un valore perché questo interruttore (solo
   * `boolean`) si accenda: la dogana rifiuta l'accensione con `motivo`, `get`
   * risponde spento, `vociImpostazioni` la mostra spenta. Il valore scritto resta.
   */
  readonly richiede?: Requisito
}

/** Le chiavi senza le quali un interruttore non si accende, e il perché detto a chi lo preme. */
interface Requisito {
  readonly chiavi: readonly string[]
  /** Una frase finita, con dentro dove si rimedia. */
  readonly motivo: string
}

/** Un'impostazione come si dichiara, senza testi: quelli stanno in `manifest.testi.ts`. */
type Dichiarazione = Omit<VoceImpostazione, 'etichetta' | 'descrizione' | 'scelte' | 'richiede'> & {
  /** I soli valori accettati, se sono pochi e noti. L'aiuto di ognuno sta nel catalogo. */
  readonly scelte?: readonly (string | number)[]
  /** Le chiavi senza le quali l'interruttore non si accende. Il perché sta nel catalogo. */
  readonly richiede?: readonly string[]
}

const DICHIARAZIONI = {
  // ------------------------------------------------------------ generale
  // La lingua per prima, trovabile anche senza leggere: le scelte si mostrano
  // col loro nome proprio (`NOMI_DELLE_LINGUE`) e la bandiera (`i18n/flags.ts`).
  'registroDocenti.aspetto.lingua': {
    tipo: 'string',
    predefinito: SCELTA_SISTEMA,
    scelte: [SCELTA_SISTEMA, ...LINGUE],
  },
  'registroDocenti.aspetto.tema': {
    tipo: 'string',
    predefinito: 'sistema',
    // Si sceglie da schede con miniatura (`ui/views/settings/figures.ts`): il
    // nome prima dei due punti nell'aiuto fa da titolo, il resto da frase.
    scelte: ['sistema', 'chiaro', 'scuro'],
  },
  'registroDocenti.vassoio.attivo': {
    tipo: 'boolean',
    predefinito: true,
  },
  'registroDocenti.vassoio.chiusuraNelVassoio': {
    tipo: 'boolean',
    predefinito: true,
    dipendeDa: 'registroDocenti.vassoio.attivo',
  },
  'registroDocenti.avvio.conWindows': {
    tipo: 'boolean',
    predefinito: false,
  },
  'registroDocenti.avvio.soloVassoio': {
    tipo: 'boolean',
    predefinito: false,
  },
  'registroDocenti.promemoria.attivo': {
    tipo: 'boolean',
    predefinito: true,
  },
  'registroDocenti.promemoria.anticipoMinuti': {
    tipo: 'number',
    predefinito: 5,
    dipendeDa: 'registroDocenti.promemoria.attivo',
    minimo: 0,
    // Oltre due ore non è più il promemoria di quella lezione.
    massimo: 120,
  },
  'registroDocenti.proiezione.schermoIntero': {
    tipo: 'boolean',
    predefinito: false,
  },

  // --------------------------------------------------------------- la posta
  'registroDocenti.posta.mittente': {
    tipo: 'string',
    predefinito: '',
    formato: 'email',
  },
  'registroDocenti.posta.utente': {
    tipo: 'string',
    predefinito: '',
    // Un indirizzo completo (`xxx000@edu.ti.ch`): una sigla senza dominio il
    // server la rifiuterebbe solo all'invio.
    formato: 'email',
  },
  'registroDocenti.posta.invioDiretto': {
    tipo: 'boolean',
    predefinito: false,
  },
  'registroDocenti.recapiti.telefono': {
    tipo: 'string',
    predefinito: 'tel',
    scelte: ['tel', 'msteams', 'skype', 'callto', 'nessuno'],
  },
  'registroDocenti.recapiti.posta': {
    tipo: 'string',
    predefinito: 'sistema',
    scelte: ['sistema', 'outlook', 'outlookWeb', 'nessuno'],
  },

  // ---------------------------------------------------------- i modelli locali
  'registroDocenti.modelli.cartella': {
    tipo: 'string',
    predefinito: '',
    formato: 'cartella',
  },
  'registroDocenti.modelli.scaricoAutomatico': {
    tipo: 'boolean',
    predefinito: true,
  },
  'registroDocenti.ocr.attivo': {
    tipo: 'boolean',
    predefinito: false,
    richiede: ['registroDocenti.ocr.modello', 'registroDocenti.ocr.proiettore'],
  },
  // Niente `dipendeDa` qui: l'interruttore `richiede` loro, e le due frecce
  // insieme si bloccherebbero a vicenda.
  'registroDocenti.ocr.modello': {
    tipo: 'string',
    predefinito: '',
    formato: 'modello',
  },
  'registroDocenti.ocr.proiettore': {
    tipo: 'string',
    predefinito: '',
    formato: 'modello',
  },
  'registroDocenti.ocr.programma': {
    tipo: 'string',
    predefinito: '',
    formato: 'eseguibile',
    avanzata: true,
    dipendeDa: 'registroDocenti.ocr.attivo',
  },
  'registroDocenti.assistente.attivo': {
    tipo: 'boolean',
    predefinito: false,
    richiede: ['registroDocenti.assistente.modello'],
  },
  // Senza `dipendeDa`, come quello della lettura delle scansioni: vedi là.
  'registroDocenti.assistente.modello': {
    tipo: 'string',
    predefinito: '',
    formato: 'modello',
  },
  'registroDocenti.dettatura.attivo': {
    tipo: 'boolean',
    predefinito: false,
  },
  'registroDocenti.dettatura.taglia': {
    tipo: 'string',
    predefinito: 'turbo',
    dipendeDa: 'registroDocenti.dettatura.attivo',
    scelte: ['turbo', 'large', 'medium', 'small', 'base'],
  },
  'registroDocenti.dettatura.indirizzo': {
    tipo: 'string',
    predefinito: 'http://127.0.0.1:17493',
    formato: 'indirizzoLocale',
    avanzata: true,
    dipendeDa: 'registroDocenti.dettatura.attivo',
  },

  // ----------------------------------------------------------- gli aggiornamenti
  'registroDocenti.aggiornamenti.controlloAutomatico': {
    tipo: 'boolean',
    predefinito: true,
  },
  'registroDocenti.aggiornamenti.scaricoAutomatico': {
    tipo: 'boolean',
    predefinito: true,
  },
  'registroDocenti.aggiornamenti.installaAllaChiusura': {
    tipo: 'boolean',
    predefinito: true,
  },

  // ------------------------------------------------------------- il condotto
  'registroDocenti.api.condotto': {
    tipo: 'boolean',
    predefinito: false,
  },
  'registroDocenti.api.lettura': {
    tipo: 'boolean',
    predefinito: true,
    dipendeDa: 'registroDocenti.api.condotto',
  },
  'registroDocenti.api.scrittura': {
    tipo: 'boolean',
    predefinito: false,
    dipendeDa: 'registroDocenti.api.condotto',
  },
} satisfies Record<string, Dichiarazione>

export type ChiaveImpostazione = keyof typeof DICHIARAZIONI

/** Una voce del manifesto con i testi letti dal catalogo a ogni richiesta, per seguire la lingua. */
function voce (chiave: ChiaveImpostazione, dichiarata: Dichiarazione): VoceImpostazione {
  const { scelte, richiede, ...resto } = dichiarata
  const nata: Record<string, unknown> = { ...resto }
  const pigro = (nome: string, leggi: () => unknown): void => {
    Object.defineProperty(nata, nome, { enumerable: true, get: leggi })
  }
  pigro('etichetta', () => testi().impostazioni[chiave].etichetta)
  pigro('descrizione', () => testi().impostazioni[chiave].descrizione)
  if (scelte) {
    pigro('scelte', () => scelte.map((valore): Scelta => ({ valore, aiuto: aiutoDellaScelta(chiave, valore) })))
  }
  if (richiede) {
    pigro('richiede', (): Requisito => ({ chiavi: richiede, motivo: testi().impostazioni[chiave].motivo ?? '' }))
  }
  return nata as unknown as VoceImpostazione
}

/**
 * Una lingua col nome proprio e, se diverso, quello nella lingua di adesso via
 * `Intl`: «Deutsch: Tedesco». Stessa forma «nome: frase» delle altre scelte.
 */
function aiutoDellaLingua (lingua: Lingua): string {
  const propria = NOMI_DELLE_LINGUE[lingua]
  let detta: string | undefined
  try {
    detta = new Intl.DisplayNames([locale()], { type: 'language' }).of(lingua)
  } catch {
    // Un runtime senza i dati delle lingue: basta il nome proprio.
  }
  if (!detta || detta.toLocaleLowerCase() === propria.toLocaleLowerCase()) return propria
  return `${propria}: ${conMaiuscola(detta)}`
}

/** L'aiuto di una scelta nella lingua di adesso; le lingue non stanno nel catalogo, una scelta mancante mostra il valore. */
function aiutoDellaScelta (chiave: ChiaveImpostazione, valore: string | number): string {
  if (chiave === 'registroDocenti.aspetto.lingua' && èLingua(valore)) return aiutoDellaLingua(valore)
  return testi().impostazioni[chiave].scelte?.[String(valore)] ?? String(valore)
}

/**
 * Le impostazioni per chiave piatta e puntata, la forma in cui si leggono:
 * `apparato.impostazioni.leggi('registroDocenti.posta')` più `get('mittente')`.
 */
export const IMPOSTAZIONI: Readonly<Record<string, VoceImpostazione>> = Object.fromEntries(
  Object.entries(DICHIARAZIONI).map(([chiave, dichiarata]) =>
    [chiave, voce(chiave as ChiaveImpostazione, dichiarata)]),
)

/**
 * Chiavi non più in uso che un `impostazioni.json` può ancora contenere:
 * `ritiraChiaviDismesse` le toglie all'avvio, perché nessuna pagina le mostra.
 */
export const CHIAVI_DISMESSE: readonly string[] = [
  'registroDocenti.aperturaAutomatica',
  'registroDocenti.recapiti.outlook',
  'registroDocenti.ocr.scaricoAutomatico',
  'registroDocenti.ocr.cartella',
  'registroDocenti.ocr.attesaMassimaSecondi',
  'registroDocenti.assistente.attesaMassimaSecondi',
  'registroDocenti.dettatura.scaricoAutomatico',
  'registroDocenti.dettatura.cartella',
  'registroDocenti.dettatura.durataMassimaSecondi',
  'registroDocenti.dettatura.attesaMassimaSecondi',
  'registroDocenti.dettatura.modello',
  'registroDocenti.dettatura.programma',
  'registroDocenti.aggiornamenti.intervalloOre',
  'registroDocenti.agenda.attiva',
  'registroDocenti.agenda.ancorata',
  'registroDocenti.agenda.scheda',
  'registroDocenti.agenda.celle',
  'registroDocenti.agenda.celleAltezza',
  'registroDocenti.agenda.colonna',
  'registroDocenti.agenda.riga',
]

/** Quel che `sospesa` guarda di una voce: comune al manifesto e al protocollo, senza dipendere da questo. */
interface VoceConPadre {
  readonly chiave: string
  readonly valore: unknown
  readonly dipendeDa?: string | null
}

/**
 * Vero se la voce ha un padre (`dipendeDa`) spento. Sta qui e non nella pagina
 * perché la applica `vociImpostazioni()` per tutte e due le superfici. Un padre
 * inesistente lascia libera la figlia.
 */
export function sospesa (voce: VoceConPadre, tutte: readonly VoceConPadre[]): boolean {
  if (!voce.dipendeDa) return false
  const padre = tutte.find((altra) => altra.chiave === voce.dipendeDa)
  return padre !== undefined && !padre.valore
}

/**
 * La prima chiave richiesta da un interruttore che è vuota (assente, solo spazi
 * o spenta), o `null`. `valoreDi` dà il valore di adesso, da file o da elenco.
 */
export function requisitoMancante (
  chiave: string,
  valoreDi: (chiave: string) => unknown,
): string | null {
  const requisito = IMPOSTAZIONI[chiave]?.richiede
  if (!requisito) return null
  for (const richiesta of requisito.chiavi) {
    const valore = valoreDi(richiesta)
    if (typeof valore === 'string' ? valore.trim() === '' : !valore) return richiesta
  }
  return null
}

/** Il titolo della finestra delle impostazioni, nella lingua di adesso. */
export function titoloImpostazioni (): string {
  return testi().titoloImpostazioni
}

/** I valori predefiniti per chiave piatta, usati quando il file di `userData` non dice niente. */
export function predefinitiImpostazioni (): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(IMPOSTAZIONI).map(([chiave, voce]) => [chiave, voce.predefinito]),
  )
}
