// L'elenco dei comandi e lo schema delle impostazioni, in un posto solo: menu,
// finestra delle impostazioni e valori predefiniti nascono tutti da qui.

import { LINGUE, NOMI_DELLE_LINGUE, SCELTA_SISTEMA, conMaiuscola, locale, èLingua, type Lingua } from '#core/i18n/index.js'
import { testi } from './manifest.testi.js'

// ------------------------------------------------------------------ i comandi

type GruppoComando = 'registro' | 'vaiA' | 'nuovo' | 'schermo' | 'posta' | 'cartelle'

export interface Comando {
  /** L'identificatore con cui lo si invoca: `registroDocenti.apri`. */
  readonly id: IdComando
  /** Il gruppo di appartenenza nel menu. */
  readonly gruppo: GruppoComando
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
  | 'registroDocenti.informazioniDocumento'
  | 'registroDocenti.chiudiDocumento'
  | 'registroDocenti.account'
  | 'registroDocenti.provaPosta'
  | 'registroDocenti.provaInvioPosta'
  | 'registroDocenti.collegaPosta'
  | 'registroDocenti.scollegaPosta'
  | 'registroDocenti.azzeraPosta'
  | 'registroDocenti.apriCartellaDati'


/** Un comando con il titolo letto a ogni richiesta, così segue il cambio di lingua. */
function comando (id: IdComando, gruppo: GruppoComando, scorciatoia?: string): Comando {
  const nato = { id, gruppo, ...(scorciatoia ? { scorciatoia } : {}) }
  Object.defineProperty(nato, 'titolo', { enumerable: true, get: () => testi().comandi[id] })
  return nato as Comando
}

// L'ordine delle voci nel menu segue l'ordine dei comandi qui e quello dei gruppi in `menu.ts`.
export const COMANDI: readonly Comando[] = [
  comando('registroDocenti.apri', 'registro', 'CommandOrControl+Alt+R'),
  comando('registroDocenti.ricarica', 'registro'),
  comando('registroDocenti.salvaConNome', 'registro'),
  comando('registroDocenti.informazioniDocumento', 'registro'),
  comando('registroDocenti.chiudiDocumento', 'registro'),
  comando('registroDocenti.oggi', 'vaiA', 'CommandOrControl+Alt+T'),
  comando('registroDocenti.impostazioni', 'vaiA', 'CommandOrControl+,'),
  comando('registroDocenti.guida', 'vaiA'),
  comando('registroDocenti.nuovaLezione', 'nuovo', 'CommandOrControl+Alt+N'),
  comando('registroDocenti.nuovaClasse', 'nuovo'),
  comando('registroDocenti.nuovoCorso', 'nuovo'),
  comando('registroDocenti.nuovoPiano', 'nuovo'),
  comando('registroDocenti.nuovaValutazione', 'nuovo'),
  comando('registroDocenti.nuovoAnno', 'nuovo'),
  comando('registroDocenti.proietta', 'schermo'),
  // Con un documento aperto il menu mostra solo questa: gli altri gesti della
  // posta stanno nella sezione del pannello (`menu.ts`, `SOLO_CON_DOCUMENTO`).
  comando('registroDocenti.account', 'posta'),
  comando('registroDocenti.collegaPosta', 'posta'),
  comando('registroDocenti.provaPosta', 'posta'),
  comando('registroDocenti.provaInvioPosta', 'posta'),
  comando('registroDocenti.scollegaPosta', 'posta'),
  comando('registroDocenti.azzeraPosta', 'posta'),
  comando('registroDocenti.apriCartellaDati', 'cartelle'),
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
 *   «Assistente e modelli»;
 * - `indirizzoLocale`: un indirizzo `http` di questo computer e di nessun altro
 *   (regola in `domain/loopback.ts`).
 */
export type Formato = 'email' | 'cartella' | 'eseguibile' | 'file' | 'modello' | 'indirizzoLocale'

/**
 * Come si disegna una voce, quando non basta il tipo (§ 3.5 di
 * `.claude/skills/impostazione/SKILL.md` § «Il sistema delle pagine»): `segmenti` per poche scelte brevi, `tendina`
 * per molte o per un elenco che cambia, `cursore` per un intervallo piccolo e
 * continuo. Assente, chi disegna segue il tipo. È un disegno, non una dogana.
 */
export type Controllo = 'segmenti' | 'tendina' | 'cursore'

/**
 * Da dove vengono le scelte che non si sanno prima: `indirizziPosta`, gli
 * indirizzi da cui l'account collegato può scrivere (`core/dati/oauth.ts`).
 */
export type FonteScelte = 'indirizziPosta'

export interface VoceImpostazione {
  readonly tipo: 'string' | 'number' | 'boolean'
  readonly predefinito: string | number | boolean
  /** Il nome della voce come lo legge chi insegna («Avviso prima della lezione»). */
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
  /**
   * Di quanto si muove un numero, contato dal `minimo` (o da zero). Assente
   * vale 1: un numero è intero se non si dichiara altro. Dogana anche lui.
   */
  readonly passo?: number
  /** L'unità scritta accanto a un numero («min»), nella lingua di adesso. */
  readonly unita?: string
  /** Come si disegna: vedi `Controllo`. */
  readonly controllo?: Controllo
  /** Le scelte che si sanno solo sul momento: vedi `FonteScelte`. */
  readonly scelteDinamiche?: FonteScelte
  /**
   * Se si può scrivere anche un valore fuori elenco: con `scelteDinamiche`, un
   * indirizzo che l'elenco non ha; con `scelte`, un valore che passi il
   * `formato` (le scelte sono allora i valori con un nome, come «nessuno»).
   */
  readonly sceltaLibera?: boolean
  /** Voce di rara modifica: in fondo alla sua sezione, in un gruppo che si apre. */
  readonly avanzata?: boolean
  /**
   * Il registro la legge solo partendo: cambiata, vale dal prossimo avvio. Le
   * due superfici lo dicono accanto al nome, non solo nella descrizione.
   */
  readonly alProssimoAvvio?: boolean
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
type Dichiarazione = Omit<VoceImpostazione, 'etichetta' | 'descrizione' | 'scelte' | 'richiede' | 'unita'> & {
  /** I soli valori accettati, se sono pochi e noti. L'aiuto di ognuno sta nel catalogo. */
  readonly scelte?: readonly (string | number)[]
  /** Le chiavi senza le quali l'interruttore non si accende. Il perché sta nel catalogo. */
  readonly richiede?: readonly string[]
}

/** Quanto concede il condotto: niente, leggere, leggere e scrivere. */
const ACCESSI_DEL_CONDOTTO = ['spento', 'lettura', 'letturaScrittura'] as const

/** Il promemoria spento, fra le scelte di `promemoria.avviso`. */
const NESSUN_AVVISO = 'nessuno'
/** Quanti minuti prima può arrivare il promemoria. Zero: all'ora esatta. */
const MINUTI_DI_AVVISO = [0, 2, 5, 10, 15] as const
/** Il promemoria quando nessuno ha scelto, e quando il file dice una cosa che non è una scelta. */
const AVVISO_PREDEFINITO = 5

/**
 * I minuti di anticipo del promemoria, o `null` se è spento. Un valore scritto
 * a mano che non è una scelta vale il predefinito: è la rete, non la dogana.
 */
export function minutiDiAvviso (valore: unknown): number | null {
  if (valore === NESSUN_AVVISO) return null
  return MINUTI_DI_AVVISO.find((scelta) => String(scelta) === valore) ?? AVVISO_PREDEFINITO
}

/** «Programma di lettura»: lo scarica il registro. */
const LETTORE_DEL_REGISTRO = ''
/** «Programma di lettura»: non scaricare. */
const NESSUN_LETTORE = 'nessuno'
/** Dove voicebox risponde quando lo si apre da sé. */
const PORTA_DI_VOICEBOX = 17493

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
    alProssimoAvvio: true,
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
    // Senza icona accanto all'orologio partire nascosti vorrebbe dire sparire:
    // `desktop/boot.ts` la ignora già.
    dipendeDa: 'registroDocenti.vassoio.attivo',
  },
  // Sta nella sezione «Avanzate» del Programma (`core/controlli/areas.ts`), che
  // è già di rara modifica: niente `avanzata`.
  'registroDocenti.avvio.integrazioneSistema': {
    tipo: 'boolean',
    predefinito: true,
    // Associazione dei .regi, `regi` nel PATH, identità delle notifiche: si
    // registrano all'avvio (`desktop/shell/main.ts`).
    alProssimoAvvio: true,
  },
  // Una scelta sola al posto di interruttore più minuti (`MIGRAZIONI`): i minuti
  // sono testo perché stanno in un elenco con «nessuno».
  'registroDocenti.promemoria.avviso': {
    tipo: 'string',
    predefinito: String(AVVISO_PREDEFINITO),
    scelte: [NESSUN_AVVISO, ...MINUTI_DI_AVVISO.map(String)],
    controllo: 'tendina',
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
    // Lo scrive «Collega la casella» e si cambia dal menu della scheda Posta;
    // non è un campo in nessuna delle due superfici (`CHIAVI_DEL_COLLEGAMENTO`).
    avanzata: true,
    scelteDinamiche: 'indirizziPosta',
    sceltaLibera: false,
  },
  'registroDocenti.posta.utente': {
    tipo: 'string',
    predefinito: '',
    // Un indirizzo completo (`xxx000@edu.ti.ch`): una sigla senza dominio il
    // server la rifiuterebbe solo all'invio.
    formato: 'email',
    avanzata: true,
  },
  'registroDocenti.posta.invioDiretto': {
    tipo: 'boolean',
    predefinito: false,
  },
  'registroDocenti.recapiti.telefono': {
    tipo: 'string',
    predefinito: 'tel',
    scelte: ['tel', 'msteams', 'skype', 'callto', 'nessuno'],
    controllo: 'tendina',
  },
  'registroDocenti.recapiti.posta': {
    tipo: 'string',
    predefinito: 'sistema',
    scelte: ['sistema', 'outlook', 'outlookWeb', 'nessuno'],
    controllo: 'segmenti',
  },
  // Fuori da `registroDocenti.posta`: «Azzera la posta» non lo deve portare via.
  'registroDocenti.supplenza.segretariato': {
    tipo: 'string',
    predefinito: '',
    formato: 'email',
  },

  // ---------------------------------------------------------- i modelli locali
  'registroDocenti.modelli.cartella': {
    tipo: 'string',
    predefinito: '',
    formato: 'cartella',
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
  // Chi porta «llama-mtmd-cli»: vuoto lo scarica il registro, `nessuno` non si
  // scarica, un percorso è «questo .exe». Una voce sola al posto di interruttore
  // più percorso (`MIGRAZIONI`); senza `dipendeDa`: il programma si prepara
  // anche prima di accendere la lettura.
  'registroDocenti.ocr.lettore': {
    tipo: 'string',
    predefinito: LETTORE_DEL_REGISTRO,
    formato: 'eseguibile',
    scelte: [LETTORE_DEL_REGISTRO, NESSUN_LETTORE],
    sceltaLibera: true,
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
    // La voce dettata la scrive l'assistente: spento lui, il microfono non parte
    // (`ui/assistant.tsx`).
    dipendeDa: 'registroDocenti.assistente.attivo',
  },
  'registroDocenti.dettatura.taglia': {
    tipo: 'string',
    predefinito: 'turbo',
    dipendeDa: 'registroDocenti.dettatura.attivo',
    scelte: ['turbo', 'large', 'medium', 'small', 'base'],
    // Cinque, ma nomi di una parola: la misura sta nell'aiuto.
    controllo: 'segmenti',
  },
  // Solo la porta: l'host è fisso, `127.0.0.1`, perché la voce non esca di qui
  // (`core/dati/dictation.ts`). Prima era un indirizzo intero (`MIGRAZIONI`).
  'registroDocenti.dettatura.porta': {
    tipo: 'number',
    predefinito: PORTA_DI_VOICEBOX,
    minimo: 1,
    massimo: 65535,
    avanzata: true,
    dipendeDa: 'registroDocenti.dettatura.attivo',
  },

  // ----------------------------------------------------------- gli aggiornamenti
  'registroDocenti.aggiornamenti.controlloAutomatico': {
    tipo: 'boolean',
    predefinito: false,
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
  // Tre stati utili, una scelta: «solo scrittura» non c'è, perché chi scrive
  // vuole anche sapere che cosa ha scritto. Prima erano tre interruttori (`MIGRAZIONI`).
  'registroDocenti.api.accesso': {
    tipo: 'string',
    predefinito: 'spento',
    scelte: ACCESSI_DEL_CONDOTTO,
    controllo: 'tendina',
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
  pigro('unita', () => testi().impostazioni[chiave].unita)
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
  // La posta prima dell'accesso Microsoft: `azzeraPosta` le toglieva solo a mano.
  'registroDocenti.posta.server',
  'registroDocenti.posta.porta',
  'registroDocenti.posta.autenticazione',
  'registroDocenti.posta.clientId',
  'registroDocenti.posta.tenant',
  // Accorpate in una scelta sola: il valore passa prima da `MIGRAZIONI`.
  'registroDocenti.api.condotto',
  'registroDocenti.api.lettura',
  'registroDocenti.api.scrittura',
  'registroDocenti.promemoria.attivo',
  'registroDocenti.promemoria.anticipoMinuti',
  'registroDocenti.modelli.scaricoAutomatico',
  'registroDocenti.ocr.programma',
  'registroDocenti.dettatura.indirizzo',
]

/**
 * Una chiave nuova ricavata da chiavi dismesse. `ricava` riceve il valore
 * scritto di una vecchia (`undefined` se non c'è) e torna quello nuovo, o
 * `undefined` per lasciare il predefinito.
 */
interface Migrazione {
  readonly nuova: ChiaveImpostazione
  readonly vecchie: readonly string[]
  readonly ricava: (vecchia: (chiave: string) => unknown) => string | number | undefined
}

/**
 * Le chiavi accorpate, lette da un `impostazioni.json` di prima. Le applica chi
 * legge il file (`desktop/apparato/settings.ts`), solo se la nuova non c'è; le
 * vecchie stanno in `CHIAVI_DISMESSE` e se ne vanno all'avvio.
 */
export const MIGRAZIONI: readonly Migrazione[] = [
  {
    nuova: 'registroDocenti.api.accesso',
    vecchie: ['registroDocenti.api.condotto', 'registroDocenti.api.lettura', 'registroDocenti.api.scrittura'],
    ricava: (vecchia) => {
      if (vecchia('registroDocenti.api.condotto') !== true) return undefined
      // I predefiniti di allora: lettura accesa, scrittura spenta.
      const lettura = (vecchia('registroDocenti.api.lettura') ?? true) === true
      const scrittura = vecchia('registroDocenti.api.scrittura') === true
      // Scrittura senza lettura non ha più una scelta: la più prudente non
      // concede la lettura che era negata, e la scrittura si riprende a mano.
      if (!lettura) return undefined
      return scrittura ? 'letturaScrittura' : 'lettura'
    },
  },
  {
    nuova: 'registroDocenti.promemoria.avviso',
    vecchie: ['registroDocenti.promemoria.attivo', 'registroDocenti.promemoria.anticipoMinuti'],
    ricava: (vecchia) => {
      if (vecchia('registroDocenti.promemoria.attivo') === false) return NESSUN_AVVISO
      const scritti = vecchia('registroDocenti.promemoria.anticipoMinuti')
      if (typeof scritti !== 'number' || !Number.isFinite(scritti)) return undefined
      // La scelta più vicina; a pari distanza la più anticipata.
      let vicina: number = MINUTI_DI_AVVISO[0]
      for (const scelta of MINUTI_DI_AVVISO) {
        if (Math.abs(scelta - scritti) <= Math.abs(vicina - scritti)) vicina = scelta
      }
      return String(vicina)
    },
  },
  {
    nuova: 'registroDocenti.ocr.lettore',
    vecchie: ['registroDocenti.modelli.scaricoAutomatico', 'registroDocenti.ocr.programma'],
    ricava: (vecchia) => {
      // Un programma scritto a mano vinceva sullo scaricato: resta «questo .exe».
      const scritto = vecchia('registroDocenti.ocr.programma')
      if (typeof scritto === 'string' && scritto.trim() !== '') return scritto.trim()
      return vecchia('registroDocenti.modelli.scaricoAutomatico') === false ? NESSUN_LETTORE : undefined
    },
  },
  {
    nuova: 'registroDocenti.dettatura.porta',
    vecchie: ['registroDocenti.dettatura.indirizzo'],
    ricava: (vecchia) => {
      const scritto = vecchia('registroDocenti.dettatura.indirizzo')
      if (typeof scritto !== 'string') return undefined
      // Solo un indirizzo di questo computer: uno di fuori il registro non lo
      // usava (lo rifiutava), e la porta di un altro host non vale qui.
      let letto: URL
      try {
        letto = new URL(scritto.trim())
      } catch {
        return undefined
      }
      if (!['127.0.0.1', 'localhost', '[::1]'].includes(letto.hostname)) return undefined
      const porta = Number(letto.port || (letto.protocol === 'https:' ? 443 : 80))
      return Number.isInteger(porta) && porta >= 1 && porta <= 65535 ? porta : undefined
    },
  },
]

/**
 * Le chiavi che scrive «Collega la casella», non una scelta fatta a mano: si
 * mostrano come parametri del collegamento e si cambiano nel registro, in
 * Utente › Posta. Non contano fra le modificate, il filtro non le offre come
 * campi, e «Ripristina» non le tocca: ritirarle staccherebbe la
 * casella dal suo gettone. Le leggono tutte e due le superfici
 * (`VoceProgramma.delCollegamento`).
 */
export const CHIAVI_DEL_COLLEGAMENTO: readonly string[] = [
  'registroDocenti.posta.utente',
  'registroDocenti.posta.mittente',
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

/** Il titolo di un comando del menu o del registro, nella lingua di adesso. */
export function titoloComando (id: IdComando): string {
  return testi().comandi[id]
}

/** I valori predefiniti per chiave piatta, usati quando il file di `userData` non dice niente. */
export function predefinitiImpostazioni (): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(IMPOSTAZIONI).map(([chiave, voce]) => [chiave, voce.predefinito]),
  )
}
