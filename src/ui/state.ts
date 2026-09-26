// Lo stato dell'interfaccia: che cosa si sta guardando. `registro` è la copia
// dei dati dell'host e da qui non si modifica mai (si manda un'azione e si
// aspetta la copia nuova); il resto — vista, giorno, selezioni, filtri — è
// stato locale, e la parte da ritrovare riaprendo il pannello si ricorda.

import { daRicordare, partiValide, type PartiContesto } from './assistant/parts.js'
import type { MessaggioStato } from '../protocol.js'
import type {
  Corso,
  Fascicolo,
  Iso,
  Lezione,
  Ora,
  MomentoValutazione,
  PianoLezione,
  Registro,
  Semestre,
} from '../domain/models.js'
import {
  classeDelCorso,
  classeDelMomento,
  classeDellaLezione,
  corsiDellAnno,
  corsiDellaClasse,
  coloreDelCorso,
  corsoDellaLezione,
  corsoPerId as corsoDelRegistro,
  fascicoloDellaClasse,
  registroDelCorso,
  lezioniDellAnno,
  lezioneDelPianoNelRegistro,
  lezioniDellaClasse,
  materiaDelCorso,
  nomeDelPiano,
  numeroDellaLezione,
  pianiDelCorso,
  siglaMateria,
  valutazioniDellaClasse,
} from '../domain/courses.js'
import {
  compleanniDelGiorno as compleanniDelRegistro,
  compleanniPerGiorno as compleanniDelPeriodo,
  type Compleanno,
} from '../domain/birthdays.js'
import {
  adesso, etichettaSemestre, formattaData, giornoDi, isoValida, oggi, semestreDi,
} from '../domain/dates.js'
import { registroVuoto } from '../domain/factories.js'
import {
  faseDellOra,
  indiceDiagnosi,
  oraDaCompilare,
  raggruppaOre,
  type FaseOra,
} from '../domain/dashboard.js'
import { confrontaLezioni } from '../domain/calculations.js'
import { todoDelCorso } from '../domain/todo.js'
import { annoInUso } from '../domain/years.js'
import {
  PROIEZIONE_PREDEFINITA,
  type ImpostazioniProiezione,
  type MiraProiezione,
} from '../domain/projection.js'
import type { Vista } from '../protocol.js'
import { leggiStatoPersistito, scriviStatoPersistito } from './bridge.js'
import { confrontaNomi } from '../domain/text.js'
import { testi as testiCalcoli } from '../domain/calculations.testi.js'
import { testi } from './state.testi.js'

/** L'elenco delle sezioni sta nel protocollo: lo legge anche l'host. */
export type { Vista } from '../protocol.js'

/**
 * Le viste, per convalidare quella ricordata. Scritte a mano perché un'unione
 * di tipi non esiste a tempo di esecuzione; una vista dimenticata qui si
 * riapre sul calendario.
 */
const VISTE: Vista[] = [
  'oggi',
  'calendario',
  'todo',
  'daSmistare',
  'lezione',
  'classi',
  'persone',
  'allievo',
  'docenteClasse',
  'corsi',
  'piani',
  'valutazioni',
  'check',
  'documenti',
  'modelli',
  'modelliLinguistici',
  'mappa',
  'impostazioni',
  'guida',
]

export type ModoCalendario = 'settimana' | 'mese' | 'anno' | 'agenda'

const MODI_CALENDARIO: ModoCalendario[] = ['settimana', 'mese', 'anno', 'agenda']

/**
 * Di chi si guardano le consegne nella pagina delle pendenze. Sta qui perché
 * la legge anche `commands.ts`: i tre modi sono comandi della pagina.
 */
/** Un blocco in lettura o in attesa di esserlo. */
interface VoceLavoro {
  smistamentoId: string
  pagina: number
  etichetta: string
}

interface StatoLavoro {
  corrente: VoceLavoro | null
  /** Quante pagine sono già state lette in questa infornata, e quante erano. */
  fatte: number
  totale: number
  coda: VoceLavoro[]
}

/**
 * Le tre schede di una lezione: amministrazione (mentre la classe entra),
 * lezione (durante e dopo), annotazioni.
 */
export type SchedaLezione = 'amministrazione' | 'lezione' | 'annotazioni'

const SCHEDE_LEZIONE: SchedaLezione[] = ['amministrazione', 'lezione', 'annotazioni']

/**
 * Le tre schede della scheda di una persona in formazione: anagrafica (chi è,
 * come raggiungerla), docente di classe (da riscuotere, da firmare, annotato),
 * materie (ore e voti).
 */
export type SchedaPersona = 'anagrafica' | 'docenteClasse' | 'materie'

/** Se il check riguarda un corso o il lavoro del docente di classe. */
export type AmbitoCheck = 'corso' | 'classe'

const AMBITI_CHECK: AmbitoCheck[] = ['corso', 'classe']

const SCHEDE_PERSONA: SchedaPersona[] = ['anagrafica', 'docenteClasse', 'materie']

/** Le quattro schede del docente di classe, ognuna col suo ritmo. */
export type SchedaDocente = 'todo' | 'documenti' | 'assenze' | 'messaggistica'

const SCHEDE_DOCENTE: SchedaDocente[] = ['todo', 'documenti', 'assenze', 'messaggistica']

/**
 * Le tre schede della pagina Documenti: del corso (presenze, voti, prove,
 * piani), delle lezioni (un riquadro per ora), degli allievi (una scheda a testa).
 */
export type SchedaDocumenti = 'corso' | 'lezioni' | 'allievi'

/** I valori ammessi: serve a convalidare quel che il pannello si ricorda. */
const SCHEDE_DOCUMENTI: SchedaDocumenti[] = ['corso', 'lezioni', 'allievi']

/**
 * Che cosa guarda la mappa: tutti gli indirizzi, solo le aziende, solo le case.
 * Una scheda sola comanda insieme l'elenco e i segnaposti. La sede resta
 * accesa in tutte: è il punto da cui si leggono le distanze.
 */
export type SchedaMappa = 'tutti' | 'lavoro' | 'domicilio'

const SCHEDE_MAPPA: SchedaMappa[] = ['tutti', 'lavoro', 'domicilio']

/**
 * Di chi sono le impostazioni che si guardano: del documento (viaggiano col
 * `.regi`) o del programma (restano su questa macchina, per tutti gli anni).
 */
type AmbitoImpostazioni = 'programma' | 'documento'

const AMBITI_IMPOSTAZIONI: AmbitoImpostazioni[] = ['programma', 'documento']

/** Le sezioni delle impostazioni del programma, nell'ordine in cui si aprono. */
export type SchedaProgramma =
  | 'aspetto'
  | 'posta'
  | 'modelli'
  | 'aggiornamenti'
  | 'condotto'

const SCHEDE_PROGRAMMA: SchedaProgramma[] = [
  'aspetto',
  'posta',
  'modelli',
  'aggiornamenti',
  'condotto',
]

/** Le sezioni delle impostazioni del documento d'anno. */
export type SchedaDocumento =
  | 'anno'
  | 'calendario'
  | 'ics'
  | 'valutazione'
  | 'materie'
  | 'liste'
  | 'intestazione'
  | 'file'

const SCHEDE_DOCUMENTO: SchedaDocumento[] = [
  'anno',
  'calendario',
  'ics',
  'valutazione',
  'materie',
  'liste',
  'intestazione',
  'file',
]

/** Il valore ricordato, se è ancora uno di quelli che esistono. */
function convalidata<T extends string> (ammessi: T[], ricordata: unknown, ripiego: T): T {
  return ammessi.includes(ricordata as T) ? (ricordata as T) : ripiego
}

/**
 * Gli scalini dello zoom delle pagine nello sfoglio, in pixel: abbastanza
 * distanti da vedersi. Oltre l'ultimo si usa il lettore.
 */
export const MISURE_SFOGLIO = [130, 170, 230, 310, 420, 560]

/** La misura di partenza: si vede il colpo d'occhio e si legge il nome in testa. */
export const ZOOM_PREDEFINITO = 230

interface StatoUI {
  sidebarDesktop: boolean
  sidebarMobile: boolean
  /**
   * Se il riquadro dell'assistente è aperto. Si ricorda, come la sidebar, per
   * ritrovarlo dopo una ricostruzione della pagina; la conversazione invece no
   * (vedi `ui/assistant.ts`).
   */
  assistenteAperto: boolean
  /**
   * Che cosa si dice all'assistente di dove si sta guardando, parte per parte.
   * Tutto acceso di principio, perché senza contesto il modello indovina un
   * corso; ogni parte si spegne da sé (vedi `assistant/parts.ts`). Si ricorda.
   */
  contestoAssistente: PartiContesto

  registro: Registro
  avvisi: string[]
  caricato: boolean
  /**
   * La cartella dei dati come la vede il webview: dentro la sandbox un percorso
   * di disco non si carica, serve l'indirizzo `registro://` mandato dal pannello.
   */
  radiceDati: string | null
  /** La radice dei file dell'applicazione: la usa chi disegna le pagine dei PDF. */
  radiceApp: string | null
  /** Quanti gesti si possono annullare e ripristinare: li dice l'host, con lo stato. */
  storia: MessaggioStato['storia']
  documenti: MessaggioStato['documenti']
  /**
   * I documenti nella cartella delle esportazioni, come stanno su disco adesso
   * (il webview non li vede da sé): la pagina Documenti dice «c'è» o «da fare».
   */
  esportati: MessaggioStato['esportati']
  /** Che cosa c'è sotto `archivio/`: i documenti raccolti dalla classe. */
  archiviati: MessaggioStato['archiviati']
  /**
   * I fascicoli composti dell'anno: quel che la pagina Documenti elenca nel
   * riquadro «Fascicoli», con il loro PDF accanto.
   */
  composizioni: MessaggioStato['composizioni']
  /** Se la lettura automatica delle scansioni è accesa nelle impostazioni. */
  ocrAttivo: boolean
  /**
   * Le impostazioni del programma (`impostazioni.json`, non quelle del documento):
   * arrivano dal pannello perché il webview in sandbox non vede il file.
   */
  programma: MessaggioStato['programma']
  /**
   * Com'è messa la posta: server, invio diretto, mittente. Arriva dal pannello:
   * sono impostazioni dell'applicazione.
   */
  posta: {
    /** Vero quando la casella è collegata: si spedisce dal server. */
    exchange: boolean
    server: string
    invioDiretto: boolean
    mittente: string
    /** Il nome con cui si entra, quando è diverso dall'indirizzo. */
    accesso: string
  }
  /** A che punto è la lettura delle scansioni: lavoro della macchina, non dato del registro. */
  lavoro: StatoLavoro
  /**
   * Se il computer è in rete, come lo dice il browser. La barra di stato lo
   * mostra prima di «spedisci»: senza rete la posta non esce.
   */
  rete: boolean
  vista: Vista
  paginaId: string | null
  /**
   * Se la riga delle azioni è nascosta. Si ricorda; i comandi restano nella
   * palette e nel menu, e la riga si riapre con l'interruttore o Ctrl+B.
   */
  azioniNascoste: boolean
  /**
   * Di chi sono i comandi nella riga delle azioni: della pagina o dello schermo
   * per la classe (scheda «Proiezione», a schermo acceso). Passa a `'schermo'`
   * quando lo schermo si accende e torna a `'pagina'` spegnendolo o cambiando
   * pagina. Non si ricorda.
   */
  schedaComandi: 'pagina' | 'schermo'
  /** Quale scheda della lezione si sta guardando. */
  schedaLezione: SchedaLezione
  schedaPersona: SchedaPersona
  /** Quale scheda del docente di classe si sta guardando. */
  schedaDocente: SchedaDocente
  /** Se il check aperto appartiene al corso o alla classe del docente di classe. */
  ambitoCheck: AmbitoCheck
  /** Quale scheda della pagina Documenti si sta guardando. */
  schedaDocumenti: SchedaDocumenti
  /** Di chi sono le impostazioni aperte: del programma o del documento. */
  ambitoImpostazioni: AmbitoImpostazioni
  /** Quale sezione delle impostazioni del programma. */
  schedaProgramma: SchedaProgramma
  /** Quale sezione delle impostazioni del documento. */
  schedaDocumento: SchedaDocumento
  /**
   * Il documento esportato nell'anteprima (percorso sotto `esportazioni/`), o
   * `null`. Non si ricorda; si svuota quando il file non c'è più.
   */
  anteprima: string | null
  /**
   * Il documento raccolto aperto nell'archivio documentale (sotto `archivio/`).
   * Separato da `anteprima` perché le due pagine hanno elenchi diversi e una
   * cornice comune chiuderebbe l'una aprendo l'altra. Non si ricorda.
   */
  anteprimaArchivio: string | null
  /**
   * Il foglio aperto nella pagina delle assenze (sotto `archivio/`), separato da
   * `anteprimaArchivio` per la stessa ragione. Non si ricorda.
   */
  anteprimaAssenze: string | null
  /**
   * Le pagine scelte nello sfoglio del PDF da dividere, pronte da trascinare.
   * Stanno nello stato perché la vista si ridisegna a ogni battito dell'orologio;
   * tengono lo smistamento d'origine, così cambiando PDF la scelta non resta
   * appesa al documento sbagliato.
   */
  pagineScelte: { smistamentoId: string, pagine: number[] } | null
  /** Come si guarda un PDF da dividere: le pagine (per smistare) o il lettore (per leggere). */
  sfoglioArchivio: 'pagine' | 'lettore'
  /** Quanto sono grandi le pagine nello sfoglio, in pixel di larghezza. Si ricorda. */
  zoomSfoglio: number
  /**
   * Se nello sfoglio si vedono anche le pagine già archiviate. Di norma no: non
   * sono più lavoro da fare; l'interruttore serve a riprendere quella finita
   * sulla riga sbagliata.
   */
  mostraArchiviate: boolean
  /**
   * I documenti spuntati nella pagina Documenti (percorsi sotto `esportazioni/`),
   * da combinare in un fascicolo. Valgono per tutte e tre le schede; si svuotano
   * cambiando corso o periodo.
   */
  documentiScelti: string[]
  modoCalendario: ModoCalendario
  /**
   * Se il calendario mostra anche gli eventi ICS del documento (tratteggiati, non
   * si aprono). Lo stesso interruttore accende i segni della striscia «Settimane
   * dell'anno»: quel che non torna fra calendario e registro.
   */
  mostraCalendarioEsterno: boolean
  /**
   * Se il calendario è in modifica: la griglia smette di aprire le lezioni al
   * clic e le prende in mano. Non si ricorda, perché un clic che doveva solo
   * aprire non sposti un'ora.
   */
  editorCalendario: boolean
  /** Se la striscia «Settimane dell'anno» è ripiegata a una riga. Si ricorda. */
  strisciaSettimaneChiusa: boolean
  /** Giorno di riferimento del calendario: la settimana o il mese che lo contiene. */
  data: Iso
  /**
   * Il momento presente, aggiornato ogni minuto. Sta nello stato perché il
   * ridisegno che ne segue fa passare un'ora da «in corso» a «finita»; leggere
   * `new Date()` nelle viste le lascerebbe ferme.
   */
  adessoData: Iso
  adessoOra: Ora
  lezioneId: string | null
  classeId: string | null
  /** L'allievo di cui si guarda la scheda; vive dentro `classeId`. */
  allievoId: string | null
  /**
   * Le classi aperte nell'elenco delle persone in formazione: chiuse di
   * principio, si ricordano quelle aperte.
   */
  classiApertePersone: string[]
  /**
   * Il corso su cui sono puntate le pagine di corso (registro, piani,
   * valutazioni, documenti): uno solo, condiviso fra le pagine.
   */
  corsoId: string | null
  pianoId: string | null
  valutazioneId: string | null
  /** Filtro per classe delle pagine di corso: piani, valutazioni, registro. */
  filtroClasseId: string | null
  /**
   * La classe della mappa, o `null` per tutte. Separata dal filtro delle pagine
   * di corso: restringere l'una non restringe l'altro.
   */
  classeMappaId: string | null
  filtroCorsoAgendaId: string | null
  /**
   * Il semestre dei conti, o `null` per l'anno intero: medie e assenze hanno
   * senso per semestre. Si parte da quello in cui cade oggi.
   */
  semestreId: string | null
  /** Di chi si guardano le consegne nella pagina delle pendenze. */
  /**
   * La classe aperta nella pagina delle pendenze, o `null` per tutte (anche
   * quando la classe scelta non ha più niente in sospeso).
   */
  /** Quale dei tre elenchi è aperto nella colonna della mappa. */
  schedaMappa: SchedaMappa
  /**
   * Il filtro delle consegne nel pannello del docente di classe, separato da
   * quello delle pendenze. Si parte da tutte: la domanda è «come sta la classe».
   */
  /**
   * Il periodo di assenze aperto nel pannello del docente di classe: uno per
   * volta, perché la matrice è già larga.
   */
  bloccoAssenzeId: string | null
  ricerca: string
  /**
   * Com'è messo lo schermo per la classe. Lo dice l'host: è il solo a sapere se
   * la finestra esiste ancora.
   */
  proiezione: {
    aperta: boolean
    impostazioni: ImpostazioniProiezione
  }
}

/** La parte di stato che sopravvive a una chiusura del pannello. */
interface StatoPersistito {
  allievoId: string | null
  /** Le classi aperte nell'elenco delle persone in formazione. */
  classiApertePersone: string[]
  /** La misura delle pagine nello sfoglio di un PDF da dividere. */
  zoomSfoglio: number
  pianoId: string | null
  valutazioneId: string | null
  bloccoAssenzeId: string | null
  ricerca: string
  sidebarDesktop: boolean
  sidebarMobile: boolean
  assistenteAperto: boolean
  /** Le parti del contesto dell'assistente, con la versione della forma (`daRicordare` in `assistant/parts.ts`). */
  contestoAssistente: PartiContesto & { v?: number }
  documentiScelti: string[]

  vista: Vista
  paginaId: string | null
  /** Se la riga delle azioni era nascosta. */
  azioniNascoste: boolean
  schedaLezione: SchedaLezione
  schedaPersona: SchedaPersona
  schedaDocente: SchedaDocente
  ambitoCheck: AmbitoCheck
  schedaDocumenti: SchedaDocumenti
  ambitoImpostazioni: AmbitoImpostazioni
  schedaProgramma: SchedaProgramma
  schedaDocumento: SchedaDocumento
  modoCalendario: ModoCalendario
  mostraCalendarioEsterno: boolean
  strisciaSettimaneChiusa: boolean
  data: Iso
  /** L'ora aperta nel registro: riaprendo si torna lì. */
  lezioneId: string | null
  classeId: string | null
  /** Il corso su cui erano puntate le pagine di corso. */
  corsoId: string | null
  filtroClasseId: string | null
  classeMappaId: string | null
  filtroCorsoAgendaId: string | null
  semestreId: string | null
  schedaMappa: SchedaMappa
}

const persistito = leggiStatoPersistito<StatoPersistito>()

/**
 * La sezione del documento su cui si era rimasti. `'modelli'` (sezione o vista)
 * non esiste più: si riapre sull'intestazione, la parte rimasta nel documento.
 */
function schedaDocumentoRicordata (): SchedaDocumento {
  const ricordata: unknown = persistito?.schedaDocumento
  if (ricordata === 'modelli' || persistito?.vista === 'modelli') return 'intestazione'
  return convalidata(SCHEDE_DOCUMENTO, ricordata, 'anno')
}

export const stato: StatoUI = {
  registro: registroVuoto(),
  avvisi: [],
  caricato: false,
  sidebarDesktop: persistito?.sidebarDesktop ?? true,
  sidebarMobile: persistito?.sidebarMobile ?? false,
  assistenteAperto: persistito?.assistenteAperto ?? false,
  contestoAssistente: partiValide(persistito?.contestoAssistente),
  radiceDati: null,
  radiceApp: null,
  storia: { annulla: 0, ripristina: 0 },
  documenti: { corrente: null, elenco: [] },
  esportati: [],
  archiviati: [],
  composizioni: [],
  ocrAttivo: false,
  programma: [],
  posta: {
    exchange: false,
    server: '',
    invioDiretto: false,
    mittente: '',
    accesso: '',
  },
  lavoro: { corrente: null, fatte: 0, totale: 0, coda: [] },
  // `navigator.onLine` è un «no» affidabile e un «sì» ottimista: basta a non far
  // partire le comunicazioni col cavo staccato.
  rete: navigator.onLine,
  // Ogni valore ricordato con un elenco chiuso passa da `convalidata`: una vista
  // o una scheda che non esiste più riaprirebbe il pannello su niente.
  // `'modelli'` non è più una vista: si riapre sulle impostazioni.
  vista: persistito?.vista === 'modelli'
    ? 'impostazioni'
    // Al primo avvio si comincia da «Oggi»; altrimenti dalla pagina lasciata.
    : convalidata(VISTE, persistito?.vista, 'oggi'),
  paginaId: persistito?.paginaId ?? null,
  azioniNascoste: persistito?.azioniNascoste ?? false,
  schedaComandi: 'pagina',
  schedaLezione: convalidata(SCHEDE_LEZIONE, persistito?.schedaLezione, 'amministrazione'),
  schedaPersona: convalidata(SCHEDE_PERSONA, persistito?.schedaPersona, 'anagrafica'),
  schedaDocente: convalidata(SCHEDE_DOCENTE, persistito?.schedaDocente, 'todo'),
  ambitoCheck: convalidata(AMBITI_CHECK, persistito?.ambitoCheck, 'corso'),
  schedaDocumenti: convalidata(SCHEDE_DOCUMENTI, persistito?.schedaDocumenti, 'corso'),
  ambitoImpostazioni: persistito?.vista === 'modelli'
    ? 'documento'
    : convalidata(AMBITI_IMPOSTAZIONI, persistito?.ambitoImpostazioni, 'documento'),
  // `'recapiti'` è dentro «Comunicazioni», che ha l'id della posta; ogni altro
  // nome che non esiste più ricade sulla prima sezione.
  schedaProgramma: (persistito?.schedaProgramma as string | undefined) === 'recapiti'
    ? 'posta'
    : convalidata(SCHEDE_PROGRAMMA, persistito?.schedaProgramma, 'aspetto'),
  schedaDocumento: schedaDocumentoRicordata(),
  anteprima: null,
  anteprimaArchivio: null,
  anteprimaAssenze: null,
  pagineScelte: null,
  sfoglioArchivio: 'pagine',
  zoomSfoglio: persistito?.zoomSfoglio ?? ZOOM_PREDEFINITO,
  mostraArchiviate: false,
  documentiScelti: persistito?.documentiScelti ?? [],
  modoCalendario: convalidata(MODI_CALENDARIO, persistito?.modoCalendario, 'settimana'),
  mostraCalendarioEsterno: persistito?.mostraCalendarioEsterno ?? true,
  editorCalendario: false,
  strisciaSettimaneChiusa: persistito?.strisciaSettimaneChiusa ?? false,
  // Convalidata: una data storta lascerebbe la settimana su una griglia vuota.
  data: isoValida(persistito?.data) ? persistito.data : oggi(),
  adessoData: oggi(),
  adessoOra: adesso(),
  lezioneId: persistito?.lezioneId ?? null,
  classeId: persistito?.classeId ?? null,
  allievoId: persistito?.allievoId ?? null,
  classiApertePersone: persistito?.classiApertePersone ?? [],
  corsoId: persistito?.corsoId ?? null,
  pianoId: persistito?.pianoId ?? null,
  valutazioneId: persistito?.valutazioneId ?? null,
  filtroClasseId: persistito?.filtroClasseId ?? null,
  classeMappaId: persistito?.classeMappaId ?? null,
  filtroCorsoAgendaId: persistito?.filtroCorsoAgendaId ?? null,
  // `undefined` = mai scelto: vale «anno intero» finché, arrivato il registro,
  // `allineaSemestre` sceglie il semestre di oggi. `null` è una scelta: l'anno intero.
  semestreId: persistito?.semestreId === undefined ? null : persistito.semestreId,
  schedaMappa: convalidata(SCHEDE_MAPPA, persistito?.schedaMappa, 'tutti'),
  bloccoAssenzeId: persistito?.bloccoAssenzeId ?? null,
  ricerca: persistito?.ricerca ?? '',
  proiezione: { aperta: false, impostazioni: { ...PROIEZIONE_PREDEFINITA } },
}

type Ascoltatore = () => void
const ascoltatori = new Set<Ascoltatore>()

export function iscriviti (ascoltatore: Ascoltatore): () => void {
  ascoltatori.add(ascoltatore)
  return () => ascoltatori.delete(ascoltatore)
}

/**
 * Se il semestre va ancora portato su quello di oggi. Dichiarata prima di
 * `aggiorna`, che la spegne quando si sceglie un semestre.
 */
let semestreDaAllineare = persistito?.semestreId === undefined

/**
 * Se una modifica cambia corso o periodo: l'anteprima di prima mostrerebbe un
 * documento vero del contesto sbagliato.
 */
function cambiaContesto (modifiche: Partial<StatoUI>): boolean {
  return (
    (modifiche.corsoId !== undefined && modifiche.corsoId !== stato.corsoId) ||
    (modifiche.semestreId !== undefined && modifiche.semestreId !== stato.semestreId)
  )
}

/**
 * Se una modifica cambia classe o periodo dell'archivio documentale: il foglio
 * aperto sarebbe di una persona sbagliata.
 */
function cambiaClasse (modifiche: Partial<StatoUI>): boolean {
  return (
    (modifiche.classeId !== undefined && modifiche.classeId !== stato.classeId) ||
    (modifiche.semestreId !== undefined && modifiche.semestreId !== stato.semestreId)
  )
}

/**
 * Scrive nelle preferenze locali quel che si ritrova riaprendo. Fuori da
 * `aggiorna` perché certe cose si ricordano senza ridisegnare. Scrive solo se
 * è cambiato qualcosa (`aggiorna` chiama a ogni battito), ma subito: una
 * finestra chiusa un attimo dopo il gesto deve averlo salvato.
 */
let ultimoRicordato: string | null = null

export function ricorda (): void {
  const persistito = {
    allievoId: stato.allievoId,
    classiApertePersone: stato.classiApertePersone,
    pianoId: stato.pianoId,
    valutazioneId: stato.valutazioneId,
    bloccoAssenzeId: stato.bloccoAssenzeId,
    ricerca: stato.ricerca,
    sidebarDesktop: stato.sidebarDesktop,
    sidebarMobile: stato.sidebarMobile,
    assistenteAperto: stato.assistenteAperto,
    contestoAssistente: daRicordare(stato.contestoAssistente),
    documentiScelti: stato.documentiScelti,
    zoomSfoglio: stato.zoomSfoglio,

    vista: stato.vista,
    paginaId: stato.paginaId,
    azioniNascoste: stato.azioniNascoste,
    schedaLezione: stato.schedaLezione,
    schedaPersona: stato.schedaPersona,
    schedaDocente: stato.schedaDocente,
    ambitoCheck: stato.ambitoCheck,
    schedaDocumenti: stato.schedaDocumenti,
    ambitoImpostazioni: stato.ambitoImpostazioni,
    schedaProgramma: stato.schedaProgramma,
    schedaDocumento: stato.schedaDocumento,
    modoCalendario: stato.modoCalendario,
    mostraCalendarioEsterno: stato.mostraCalendarioEsterno,
    strisciaSettimaneChiusa: stato.strisciaSettimaneChiusa,
    data: stato.data,
    lezioneId: stato.lezioneId,
    classeId: stato.classeId,
    corsoId: stato.corsoId,
    filtroClasseId: stato.filtroClasseId,
    classeMappaId: stato.classeMappaId,
    filtroCorsoAgendaId: stato.filtroCorsoAgendaId,
    semestreId: stato.semestreId,
    schedaMappa: stato.schedaMappa,
  } satisfies StatoPersistito
  const scritto = JSON.stringify(persistito)
  if (scritto === ultimoRicordato) return
  ultimoRicordato = scritto
  scriviStatoPersistito(persistito)
}

export function aggiorna (modifiche: Partial<StatoUI>): void {
  // «Modelli linguistici» è una sezione delle impostazioni del programma: chi
  // chiede la vista con quel nome (barra, assistente) arriva lì.
  if (modifiche.vista === 'modelliLinguistici') {
    modifiche = {
      ...modifiche,
      vista: 'impostazioni',
      ambitoImpostazioni: 'programma',
      schedaProgramma: 'modelli',
    }
  }
  // Idem per `'modelli'`: nel documento ne resta la carta intestata.
  if (modifiche.vista === 'modelli') {
    modifiche = {
      ...modifiche,
      vista: 'impostazioni',
      ambitoImpostazioni: 'documento',
      schedaDocumento: 'intestazione',
    }
  }
  if (modifiche.anteprimaArchivio === undefined && cambiaClasse(modifiche)) {
    modifiche = { ...modifiche, anteprimaArchivio: null }
  }
  // Il foglio delle assenze è di una classe e di un periodo: cambiando l'uno o
  // l'altro si chiude, perché le frecce scorrono i fogli di quel periodo.
  const cambiaPeriodo =
    modifiche.bloccoAssenzeId !== undefined && modifiche.bloccoAssenzeId !== stato.bloccoAssenzeId
  if (modifiche.anteprimaAssenze === undefined && (cambiaClasse(modifiche) || cambiaPeriodo)) {
    modifiche = { ...modifiche, anteprimaAssenze: null }
  }
  // Cambiando foglio (in tutte e due le cornici) si perdono le pagine scelte:
  // sono pagine di quel PDF.
  if (
    (modifiche.anteprimaArchivio !== undefined || modifiche.anteprimaAssenze !== undefined) &&
    modifiche.pagineScelte === undefined
  ) {
    modifiche = { ...modifiche, pagineScelte: null }
  }
  // L'anteprima segue corso e periodo, salvo quando è lei a cambiare.
  if (modifiche.anteprima === undefined && cambiaContesto(modifiche)) {
    // Con l'anteprima se ne vanno le spunte, che erano fogli di quel contesto.
    modifiche = { ...modifiche, anteprima: null, documentiScelti: [] }
  }
  // Un semestre scelto per nome spegne l'allineamento automatico, che altrimenti
  // lo sovrascriverebbe all'arrivo dei dati (una prova di novembre aperta in gennaio).
  if (modifiche.semestreId !== undefined) semestreDaAllineare = false
  Object.assign(stato, modifiche)
  ricorda()
  for (const ascoltatore of ascoltatori) ascoltatore()
}

// ------------------------------------------------------------------ selezioni

// Le viste chiedono qui invece di risalire le catene a mano: involucri sottili
// sul dominio che aggiungono il registro corrente.

export function annoCorrente () {
  return annoInUso(stato.registro)
}

/** Le classi dell'anno in corso, archiviate escluse, in ordine di nome. */
export function classiVisibili () {
  const anno = annoCorrente()
  return stato.registro.classi
    .filter((c) => (!anno || c.annoId === anno.id) && !c.archiviata)
    .sort((a, b) => confrontaNomi(a.nome, b.nome))
}

/**
 * Le classi di cui si è docente di classe. Sta qui perché la barra la legge per
 * decidere se la sezione «Docente di classe» c'è, e la tendina per le sue voci.
 */
export function classiDiCuiSonoDocente () {
  return classiVisibili().filter((c) => c.docenteDiClasse)
}

/** Tutte le classi dell'anno, archiviate comprese: serve alla vista Classi. */
export function classiDellAnno () {
  const anno = annoCorrente()
  return stato.registro.classi
    .filter((c) => !anno || c.annoId === anno.id)
    .sort((a, b) => Number(a.archiviata) - Number(b.archiviata) || confrontaNomi(a.nome, b.nome))
}

export function classePerId (id: string | null) {
  return id ? stato.registro.classi.find((c) => c.id === id) ?? null : null
}

export function lezionePerId (id: string | null) {
  return id ? stato.registro.lezioni.find((l) => l.id === id) ?? null : null
}

export function pianoPerId (id: string | null) {
  return id ? stato.registro.piani.find((p) => p.id === id) ?? null : null
}

export function valutazionePerId (id: string | null) {
  return id ? stato.registro.valutazioni.find((v) => v.id === id) ?? null : null
}

export function materiaPerId (id: string | null) {
  return id ? stato.registro.materie.find((m) => m.id === id) ?? null : null
}

/** Il nome della materia, o stringa vuota: serve nei sottotitoli, dove il vuoto sparisce. */
export function nomeMateria (id: string | null): string {
  return materiaPerId(id)?.nome ?? ''
}

// ------------------------------------------------------------------ corsi

export function corsoPerId (id: string | null): Corso | null {
  return corsoDelRegistro(stato.registro, id)
}

/**
 * Tutti i corsi dell'anno aperto, senza il filtro per classe: chi sceglie un
 * corso per nome non deve perderne metà per un filtro messo altrove.
 */
export function corsiDellAnnoAperto (): Corso[] {
  const anno = annoCorrente()
  return corsiDellAnno(stato.registro, anno?.id ?? null).sort((a, b) =>
    confrontaNomi(a.titolo, b.titolo),
  )
}

/**
 * I corsi che la barra laterale elenca: quelli dell'anno con almeno un'ora nel
 * semestre scelto, più quelli senza nessuna ora (appena creati, da ritrovare).
 */
export function corsiNelSemestre (): Corso[] {
  const corsi = corsiDellAnnoAperto()
  const semestre = semestreScelto()
  if (!semestre) return corsi
  // Una passata sola su tutte le lezioni: la barra lo chiede a ogni ridisegno.
  const conOre = new Set<string>()
  const nelPeriodo = new Set<string>()
  for (const l of stato.registro.lezioni) {
    conOre.add(l.corsoId)
    if (l.data >= semestre.inizio && l.data <= semestre.fine) nelPeriodo.add(l.corsoId)
  }
  return corsi.filter(
    (corso) => !corso.id || !conOre.has(corso.id) || nelPeriodo.has(corso.id),
  )
}

/**
 * Il corso su cui sono puntate le pagine di corso, o il primo se quello scelto
 * non c'è più: una regola sola, così la barra accende la riga che la pagina mostra.
 */
export function corsoAperto (): Corso | null {
  const dellAnno = corsiDellAnnoAperto()
  // Il corso scelto vince anche se le sue ore sono tutte nell'altro semestre:
  // si ripiega solo se non esiste più (o è di un anno chiuso).
  return (
    dellAnno.find((c) => c.id === stato.corsoId) ?? corsiNelSemestre()[0] ?? dellAnno[0] ?? null
  )
}

/** I corsi di una classe: le materie che ci si insegnano. */
export function corsiDi (classeId: string): Corso[] {
  return corsiDellaClasse(stato.registro, classeId)
}

/** I nomi delle materie insegnate in una classe, in ordine. */
export function materieDiClasse (classeId: string): string[] {
  return corsiDi(classeId)
    .map((corso) => materiaDelCorso(stato.registro, corso)?.nome ?? '')
    .filter(Boolean)
}

/**
 * Le lezioni di una classe che entrano nei conti (ore, assenze, medie): quelle
 * del semestre scelto. Il calendario non passa di qui.
 */
export function lezioniDi (classeId: string) {
  return nelSemestreScelto(lezioniDellaClasse(stato.registro, classeId))
}

/** Le valutazioni di una classe: quelle di tutti i suoi corsi. */
export function valutazioniDi (classeId: string) {
  return nelSemestreScelto(valutazioniDellaClasse(stato.registro, classeId))
}

/**
 * La classe di una persona: quella dichiarata se la contiene, altrimenti la si
 * cerca fra tutte (dall'albero e dalla palette arriva solo la persona). La
 * chiede anche il percorso, per sapere quali linguette ha la scheda.
 */
export function classeDellAllievo (allievoId: string | null, dichiarataId: string | null) {
  const dichiarata = classePerId(dichiarataId)
  return dichiarata?.allievi.some((a) => a.id === allievoId) === true
    ? dichiarata
    : stato.registro.classi.find((c) => c.allievi.some((a) => a.id === allievoId)) ?? null
}

export function classeDelCorsoId (corsoId: string | null) {
  return classeDelCorso(stato.registro, corsoPerId(corsoId))
}

export function materiaDelCorsoId (corsoId: string | null) {
  return materiaDelCorso(stato.registro, corsoPerId(corsoId))
}

/** Il nome di un corso, o una stringa che dice che manca. */
export function nomeCorso (corsoId: string | null): string {
  return corsoPerId(corsoId)?.titolo ?? testi().senzaCorso
}

// ------------------------------------------------------------------ dalla lezione

export function classeDiLezione (lezione: Lezione) {
  return classeDellaLezione(stato.registro, lezione)
}

function corsoDiLezione (lezione: Lezione) {
  return corsoDellaLezione(stato.registro, lezione)
}

export function nomeClasseDiLezione (lezione: Lezione): string {
  return classeDiLezione(lezione)?.nome ?? testi().senzaClasse
}

/**
 * Che materia è quest'ora, o vuoto se il corso non c'è più: in un elenco il
 * posto vuoto è meglio di «senza materia».
 */
export function nomeMateriaDiLezione (lezione: Lezione): string {
  return materiaDelCorso(stato.registro, corsoDiLezione(lezione))?.nome ?? ''
}

/** La stessa materia dove il posto è poco: la cella di un mese, una pastiglia. */
export function siglaMateriaDiLezione (lezione: Lezione): string {
  return siglaMateria(materiaDelCorso(stato.registro, corsoDiLezione(lezione)))
}

/**
 * Come si chiama un piano: il corso e il numero dell'ora. Passa da
 * `nomeDelPiano`, come l'albero e i comandi, perché il numero riparte a ogni semestre.
 */
export function nomeDiPiano (piano: PianoLezione): string {
  return nomeDelPiano(stato.registro, piano)
}

/**
 * Di quale lezione è un piano, senza il corso: «3ª lezione», «bozza del 12.09».
 * Per gli elenchi di una pagina di corso, dove il corso è in testata.
 */
export function lezioneDiPiano (piano: PianoLezione): string {
  return lezioneDelPianoNelRegistro(stato.registro, piano)
}

/**
 * Come si chiama una lezione: «3ª lezione», lo stesso nome del suo piano. La
 * data è il ripiego per le annullate, che non hanno numero.
 */
export function nomeDiLezione (lezione: Lezione): string {
  const numero = numeroDellaLezione(stato.registro, lezione)
  return numero ? testiCalcoli().ennesimaLezione(numero) : formattaData(lezione.data, 'giorno')
}

/**
 * Di che cosa parla una lezione, in due parole: il primo obiettivo del piano,
 * o la prima tappa della scaletta. Vuoto senza piano.
 */
export function titoloDiLezione (lezione: Lezione): string {
  const piano = pianoPerId(lezione.pianoId)
  if (!piano) return ''
  return piano.obiettivi[0] ?? piano.attivita.find((a) => a.titolo.trim())?.titolo ?? ''
}

export function coloreDiLezione (lezione: Lezione): string {
  const corso = stato.registro.corsi.find((c) => c.id === lezione.corsoId)
  return corso ? coloreDiCorso(corso) : (classeDiLezione(lezione)?.colore ?? '#888888')
}

/**
 * Il colore di un corso: il suo se l'ha scelto, altrimenti la media fra classe
 * e materia (`coloreDelCorso`).
 */
export function coloreDiCorso (corso: Corso): string {
  return coloreDelCorso(corso, classePerId(corso.classeId), materiaPerId(corso.materiaId))
}

/** Le lezioni dell'anno in corso, ristrette alla classe del filtro delle pagine di corso. */
function lezioniVisibili (): Lezione[] {
  const anno = annoCorrente()
  const lezioni = lezioniDellAnno(stato.registro, anno?.id ?? null)
  if (!stato.filtroClasseId) return lezioni
  const corsi = new Set(corsiDi(stato.filtroClasseId).map((c) => c.id))
  return lezioni.filter((l) => corsi.has(l.corsoId))
}

/** Le lezioni dell'anno in corso, con il filtro del calendario già applicato. */
export function lezioniInAgenda (): Lezione[] {
  const anno = annoCorrente()
  const lezioni = lezioniDellAnno(stato.registro, anno?.id ?? null)
  if (!stato.filtroCorsoAgendaId) return lezioni
  return lezioni.filter((l) => l.corsoId === stato.filtroCorsoAgendaId)
}

// ------------------------------------------------------------------ compleanni

/**
 * La classe di cui il calendario mostra i compleanni, o `null` per tutte: il
 * filtro è per corso, ma un compleanno è della classe del corso filtrato.
 */
function classeDeiCompleanni (): string | null {
  return classeDelCorsoId(stato.filtroCorsoAgendaId)?.id ?? null
}

/** Chi compie gli anni in un giorno, con il filtro del calendario già applicato. */
export function compleanniDi (data: Iso): Compleanno[] {
  return compleanniDelRegistro(
    stato.registro,
    annoCorrente()?.id ?? null,
    data,
    classeDeiCompleanni(),
  )
}

/** I compleanni di un periodo, giorno per giorno: la settimana e il mese li chiedono così. */
export function compleanniFra (dal: Iso, al: Iso): Map<Iso, Compleanno[]> {
  return compleanniDelPeriodo(
    stato.registro,
    annoCorrente()?.id ?? null,
    dal,
    al,
    classeDeiCompleanni(),
  )
}

// ------------------------------------------------------------------ il registro del corso

/** Le lezioni di un corso, dalla prima all'ultima: le pagine del suo registro. */
export function lezioniDiCorso (corsoId: string | null): Lezione[] {
  return registroDelCorso(stato.registro, corsoId)
}

/**
 * Su quale ora si apre il Registro dal menu: quella aperta se c'è ancora,
 * altrimenti l'ultima passata (quella da consuntivare), o la prima che verrà.
 */
export function lezioneDiRiferimento (): string | null {
  const aperta = lezionePerId(stato.lezioneId)
  if (aperta) return aperta.id

  const lezioni = lezioniVisibili().sort(
    (a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id),
  )
  if (lezioni.length === 0) return null
  const passate = lezioni.filter((l) => l.data <= stato.adessoData)
  return (passate[passate.length - 1] ?? lezioni[0]).id
}

/**
 * Su quale ora si apre il Registro di un corso: la regola di
 * `lezioneDiRiferimento`, ristretta al semestre scelto; se lì non ci sono ore,
 * su tutto il corso.
 */
export function lezioneDiRiferimentoDiCorso (corsoId: string): string | null {
  const tutte = lezioniDiCorso(corsoId)
  const nelPeriodo = nelSemestreScelto(tutte)
  const lezioni = nelPeriodo.length > 0 ? nelPeriodo : tutte
  if (lezioni.length === 0) return null
  const passate = lezioni.filter((l) => l.data <= stato.adessoData)
  return (passate[passate.length - 1] ?? lezioni[0]).id
}

// ------------------------------------------------------------------ dal momento

export function classeDiMomento (momento: MomentoValutazione) {
  return classeDelMomento(stato.registro, momento)
}

// ------------------------------------------------------------------ piani e fascicoli

/** I piani buoni per un corso: quelli della sua materia, di qualunque anno. */
export function pianiPerCorso (corsoId: string | null) {
  const corso = corsoPerId(corsoId)
  return corso ? pianiDelCorso(stato.registro, corso.id) : []
}

/**
 * I documenti spuntati che esistono ancora nella cartella: sono quelli da
 * contare, perché una spunta sopravvive al file buttato o rinominato.
 */
export function sceltiPresenti (): string[] {
  return stato.documentiScelti.filter((percorso) =>
    stato.esportati.some((e) => e.percorso === percorso),
  )
}

/**
 * L'indirizzo con cui il webview carica un file della cartella dei dati. Ogni
 * pezzo del percorso va codificato (spazi, accenti, parentesi).
 */
export function uriDato (relativo: string | undefined): string | null {
  if (!relativo || !stato.radiceDati) return null
  const pezzi = relativo.split('/').filter(Boolean).map(encodeURIComponent)
  return pezzi.length > 0 ? `${stato.radiceDati}/${pezzi.join('/')}` : null
}

/**
 * Il fascicolo di una classe, o uno vuoto: per le viste non c'è differenza, e
 * il fascicolo nasce alla prima cosa che ci si mette.
 */
export function fascicoloDi (classeId: string): Fascicolo {
  return (
    fascicoloDellaClasse(stato.registro, classeId) ?? {
      id: '',
      classeId,
      recapiti: [],
      documenti: [],
      comunicazioni: [],
      assenze: [],
      creatoIl: '',
      aggiornatoIl: '',
    }
  )
}

export function nomeClasse (classeId: string): string {
  return stato.registro.classi.find((c) => c.id === classeId)?.nome ?? testi().senzaClasse
}

/**
 * Vero se il fuoco è in un campo di testo libero: ridisegnare adesso farebbe
 * sparire il campo per un attimo e perdere il tasto premuto in quel momento.
 */
function scrivendoInUnCampo (): boolean {
  const attivo = document.activeElement
  if (attivo instanceof HTMLTextAreaElement) return true
  return (
    attivo instanceof HTMLInputElement &&
    ['text', 'number', 'email', 'tel', 'search', 'url'].includes(attivo.type)
  )
}

/** Tiene `stato.rete` al passo, con gli eventi `online`/`offline` del browser. */
export function avviaRete (): () => void {
  const batti = () => aggiorna({ rete: navigator.onLine })
  window.addEventListener('online', batti)
  window.addEventListener('offline', batti)
  return () => {
    window.removeEventListener('online', batti)
    window.removeEventListener('offline', batti)
  }
}

/**
 * Fa battere l'orologio dello stato ogni quindici secondi, e subito quando il
 * pannello torna in primo piano. Si ridisegna solo quando cambia il minuto;
 * il battito più fitto evita che il minuto nuovo si veda in ritardo.
 */
export function avviaOrologio (): () => void {
  const batti = () => {
    const data = oggi()
    const ora = adesso()
    if (data === stato.adessoData && ora === stato.adessoOra) return
    // Si riprova al battito dopo: non si ridisegna sotto le dita di chi scrive.
    if (scrivendoInUnCampo()) return
    // Né durante il tiro o lo stiro di un'ora: il ridisegno perde la cattura del
    // puntatore. Le classi sono quelle che `calendar/editor.ts` mette durante il gesto.
    if (document.querySelector('.settimana__bozza, .blocco--in-stiro')) return
    aggiorna({ adessoData: data, adessoOra: ora })
  }

  const timer = setInterval(batti, 15_000)
  // Tornando su una finestra lasciata aperta, l'ora giusta subito.
  document.addEventListener('visibilitychange', batti)
  window.addEventListener('focus', batti)

  return () => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', batti)
    window.removeEventListener('focus', batti)
  }
}

/** Il semestre di cui si stanno guardando i conti, o `null` per l'anno intero. */
export function semestreScelto (): Semestre | null {
  const anno = annoCorrente()
  if (!anno || !stato.semestreId) return null
  return anno.semestri.find((s) => s.id === stato.semestreId) ?? null
}

/** Come si chiama il periodo scelto, per dirlo nei sottotitoli. */
export function nomeSemestreScelto (): string {
  return etichettaSemestre(semestreScelto())
}

/** Tiene solo quel che cade nel semestre scelto. */
export function nelSemestreScelto<T extends { data: Iso }> (voci: T[]): T[] {
  const semestre = semestreScelto()
  if (!semestre) return voci
  return voci.filter((v) => v.data >= semestre.inizio && v.data <= semestre.fine)
}

/**
 * Come `nelSemestreScelto`, per voci che portano la data dentro un istante
 * (`creataIl`): conta la parte prima di `T`.
 */
export function nelSemestreSceltoPer<T> (voci: T[], quando: (voce: T) => string): T[] {
  const semestre = semestreScelto()
  if (!semestre) return voci
  return voci.filter((voce) => {
    const giorno = giornoDi(quando(voce)) ?? quando(voce).slice(0, 10)
    return giorno >= semestre.inizio && giorno <= semestre.fine
  })
}

/**
 * I periodi che toccano il semestre scelto: basta sovrapporsi, così un periodo
 * a cavallo di gennaio compare in tutti e due.
 */
export function toccaIlSemestreScelto<T extends { dal: Iso, al: Iso }> (voci: T[]): T[] {
  const semestre = semestreScelto()
  if (!semestre) return voci
  return voci.filter((v) => v.dal <= semestre.fine && v.al >= semestre.inizio)
}

/**
 * Alla prima apertura porta il registro sul semestre in cui cade oggi, e a ogni
 * arrivo dei dati azzera un semestre ricordato che nel documento non esiste più
 * (altrimenti la tendina direbbe un semestre e i conti sarebbero dell'anno).
 * Si fa qui perché all'avvio i semestri non ci sono ancora.
 */
export function allineaSemestre (): void {
  const anno = annoCorrente()
  // Prima del ritorno anticipato: va fatto a ogni arrivo dei dati.
  if (stato.semestreId && anno && !anno.semestri.some((s) => s.id === stato.semestreId)) {
    // Diretto e non da `aggiorna`, che spegnerebbe la spia appena riaccesa.
    stato.semestreId = null
    semestreDaAllineare = true
  }
  if (!semestreDaAllineare) return
  if (!anno || anno.semestri.length === 0) return
  semestreDaAllineare = false
  const suo = semestreDi(anno, stato.adessoData)
  // Da `aggiorna`, così la scelta si ricorda e la vista la trova già fatta.
  if (suo) aggiorna({ semestreId: suo.id })
}

/** L'anno (id ed estremi) per cui `riconvalidaRicordati` ha già guardato il giorno. */
let annoGiornoRiconvalidato: string | null = null

/**
 * Azzera i filtri ricordati che puntano a qualcosa che nel documento non c'è
 * più (classe, corso dell'agenda, periodo di assenze): `null` vuol dire «tutti».
 */
export function riconvalidaRicordati (): void {
  const r = stato.registro
  const anno = annoCorrente()
  const classe = (id: string | null) => id !== null && !r.classi.some((c) => c.id === id)
  const modifiche: Partial<StatoUI> = {}
  if (classe(stato.filtroClasseId)) modifiche.filtroClasseId = null
  if (classe(stato.classeMappaId)) modifiche.classeMappaId = null
  if (stato.filtroCorsoAgendaId && !r.corsi.some((c) => c.id === stato.filtroCorsoAgendaId)) {
    modifiche.filtroCorsoAgendaId = null
  }
  if (
    stato.bloccoAssenzeId &&
    !r.fascicoli.some((f) => f.assenze.some((b) => b.id === stato.bloccoAssenzeId))
  ) {
    modifiche.bloccoAssenzeId = null
  }
  const senzaDocenze = classiDiCuiSonoDocente().length === 0
  const dentroSezioneClasse = stato.vista === 'docenteClasse' ||
    (stato.vista === 'check' && stato.ambitoCheck === 'classe')
  if (senzaDocenze && dentroSezioneClasse) {
    modifiche.vista = anno ? 'classi' : 'oggi'
    modifiche.paginaId = null
  }
  // Il giorno scelto si riporta dentro l'anno aperto solo quando l'anno cambia
  // (o all'avvio): alle altre spinte dell'host si lascia dov'è l'ha portato chi guarda.
  const chiaveAnno = anno ? `${anno.id}|${anno.inizio}|${anno.fine}` : null
  if (chiaveAnno !== annoGiornoRiconvalidato) {
    annoGiornoRiconvalidato = chiaveAnno
    const giorno = giornoDentroLAnno(stato.data, anno, oggi())
    if (giorno !== stato.data) modifiche.data = giorno
  }
  if (Object.keys(modifiche).length > 0) aggiorna(modifiche)
}

/**
 * Il giorno da guardare in un anno: quello scelto se ci cade, se no oggi se ci
 * cade, se no il capo dell'anno più vicino. Senza anno, o con estremi storti,
 * resta quello scelto.
 */
export function giornoDentroLAnno (
  data: Iso,
  anno: { inizio: Iso, fine: Iso } | null,
  oggiIso: Iso,
): Iso {
  if (!anno || !isoValida(anno.inizio) || !isoValida(anno.fine)) return data
  if (anno.inizio > anno.fine) return data
  const dentro = (giorno: Iso): boolean => giorno >= anno.inizio && giorno <= anno.fine
  if (dentro(data)) return data
  if (dentro(oggiIso)) return oggiIso
  return data < anno.inizio ? anno.inizio : anno.fine
}

// ------------------------------------------------------------------ derivati

/**
 * Conti fatti una volta per registro. `stato.registro` non si modifica mai sul
 * posto (ogni spinta dell'host ne porta uno nuovo), quindi fa da chiave; il
 * resto da cui il conto dipende (giorno, filtri) sta in `chiave`. Il risultato
 * è condiviso: si legge, non si modifica.
 */
const memorie = new WeakMap<Registro, Map<string, unknown>>()

function derivato<T> (nome: string, chiave: string, calcola: () => T): T {
  let memoria = memorie.get(stato.registro)
  if (!memoria) {
    memoria = new Map()
    memorie.set(stato.registro, memoria)
  }
  const voce = `${nome}|${chiave}`
  if (!memoria.has(voce)) memoria.set(voce, calcola())
  return memoria.get(voce) as T
}

/**
 * L'ora che chiede qualcosa adesso: il buco da riempire, o la prossima. Una
 * sola per la barra di stato e per «Ora da compilare»: sulle ore dell'agenda
 * e dentro il periodo scelto, i due filtri che la barra ha accanto.
 */
export function oraDaFare (): ReturnType<typeof oraDaCompilare> {
  return derivato(
    'oraDaFare',
    [stato.filtroCorsoAgendaId, stato.semestreId, stato.adessoData, stato.adessoOra].join('|'),
    () =>
      oraDaCompilare(
        stato.registro,
        nelSemestreScelto(lezioniInAgenda()),
        stato.adessoData,
        stato.adessoOra,
      ),
  )
}

/**
 * Le ore di oggi con la loro fase, per la pagina «Oggi»: sulle ore dell'agenda
 * come il calendario, annullate comprese (spente). La fase si calcola qui, in
 * memoria, e l'ora di adesso è nella chiave.
 */
export function oreDiOggi (): Array<{ lezione: Lezione, fase: FaseOra }> {
  return derivato(
    'oreDiOggi',
    [stato.filtroCorsoAgendaId, stato.adessoData, stato.adessoOra].join('|'),
    () => {
      const indice = indiceDiagnosi(stato.registro)
      return lezioniInAgenda()
        .filter((l) => l.data === stato.adessoData)
        .sort(confrontaLezioni)
        .map((lezione) => ({
          lezione,
          fase: faseDellOra(stato.registro, lezione, stato.adessoData, stato.adessoOra, indice),
        }))
    },
  )
}

/**
 * Le ore rimaste senza registro nel periodo scelto (tessera «Da compilare» di
 * «Oggi»): stesse ore e stesso giudizio di `oraDaFare`, così il numero e l'ora
 * a cui porta vanno d'accordo.
 */
export function oreDaChiudere (): Lezione[] {
  return derivato(
    'oreDaChiudere',
    [stato.filtroCorsoAgendaId, stato.semestreId, stato.adessoData, stato.adessoOra].join('|'),
    () => raggruppaOre(
      stato.registro,
      nelSemestreScelto(lezioniInAgenda()),
      stato.adessoData,
      stato.adessoOra,
      indiceDiagnosi(stato.registro),
    ).daChiudere,
  )
}

/**
 * Le pendenze che la barra conta: le stesse della pagina delle pendenze
 * (classi visibili, giorno dell'orologio), così il clic non porta a una pagina vuota.
 */
export function pendenzeDellaBarra (): { aperti: number, urgenti: number } {
  const corso = corsoAperto()
  const classe = corso ? classePerId(corso.classeId) : null
  if (!corso || !classe) return { aperti: 0, urgenti: 0 }
  return derivato('pendenze', `${corso.id}|${stato.adessoData}`, () => {
    const todo = todoDelCorso(stato.registro, classe, corso, stato.adessoData)
    return { aperti: todo.aperti, urgenti: todo.urgenti }
  })
}

/** Il semestre in cui cade una data, nell'anno in corso. */
export function semestrePerData (data: Iso): Semestre | null {
  const anno = annoCorrente()
  return anno ? semestreDi(anno, data) : null
}

// ------------------------------------------------------------------ proiezione

/**
 * Dove sta guardando il registro, detto allo schermo per la classe. Sono
 * riferimenti: la proiezione rilegge dall'archivio, così le correzioni arrivano
 * anche là. Senza lezione si ripiega su corso o classe.
 */
export function miraProiezione (): MiraProiezione {
  // La lezione di riferimento anche fuori dal Registro: la classe sta ancora
  // facendo quell'ora mentre il docente cambia scheda.
  const lezione = lezionePerId(stato.lezioneId)
  return {
    lezioneId: lezione?.id ?? null,
    corsoId: stato.corsoId ?? lezione?.corsoId ?? null,
    classeId: stato.classeId ?? stato.filtroClasseId,
    semestreId: stato.semestreId,
    data: stato.data,
  }
}
