// Lo stato dell'interfaccia: che cosa si sta guardando. `registro` è la copia
// dei dati dell'host e da qui non si modifica mai (si manda un'azione e si
// aspetta la copia nuova); il resto — posto, giorno, selezioni, filtri — è
// stato locale, e la parte da ritrovare riaprendo il pannello si ricorda
// (`memoria.ts`): le preferenze di forma per tutti, il posto per documento.

import {
  daRicordare,
  partiValide,
  type PartiContesto,
} from './assistant/parts.js'
import type { MessaggioStato } from '../../contract/protocollo.js'
import type {
  Classe,
  Corso,
  Fascicolo,
  Iso,
  Lezione,
  Ora,
  MomentoValutazione,
  PianoLezione,
  Registro,
  Semestre,
} from '../../core/dominio/models.js'
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
} from '../../core/dominio/courses.js'
import {
  compleanniDelGiorno as compleanniDelRegistro,
  compleanniPerGiorno as compleanniDelPeriodo,
  type Compleanno,
} from '../../core/dominio/birthdays.js'
import {
  adesso,
  etichettaSemestre,
  formattaData,
  giornoDi,
  oggi,
  semestreDi,
} from '../../core/dominio/dates.js'
import { registroVuoto } from '../../core/dominio/factories.js'
import {
  faseDellOra,
  indiceDiagnosi,
  oraCoperta,
  oraDaCompilare,
  raggruppaOre,
  type FaseOra,
} from '../../core/dominio/dashboard.js'
import { confrontaLezioni, riepilogaPresenze } from '../../core/dominio/calculations.js'
import { todoDelCorso, todoDelDocenteDiClasse } from '../../core/dominio/todo.js'
import { annoInUso } from '../../core/dominio/years.js'
import {
  PROIEZIONE_PREDEFINITA,
  type ImpostazioniProiezione,
  type MiraProiezione,
} from '../../core/dominio/projection.js'
import type { Vista } from '../../contract/protocollo.js'
import { leggiStatoPersistito, scriviStatoPersistito } from './bridge.js'
import { battiMinuto } from './orologio.js'
import {
  CAMPI_CONTESTO,
  chiaveDelPosto,
  completa,
  derivaVista,
  giornoNellAnno,
  postoDaVecchi,
  type Completato,
  type Contesto,
  type Posto,
  type Scheda,
  type SchedaDocumento,
  type SchedaProgramma,
} from './posto.js'
import {
  chiaveDocumento,
  conVoce,
  leggiMemoria,
  MODI_CALENDARIO,
  SCHEDE_DOCUMENTI,
  SCHEDE_LEZIONE,
  SCHEDE_MAPPA,
  SCHEDE_PERSONA,
  serializza,
  VOCE_SENZA_DOCUMENTO,
  voceDel,
  type Globali,
  type Memoria,
  type VoceDocumento,
} from './memoria.js'
import { confrontaNomi } from '../../core/dominio/text.js'
import { testi as testiCalcoli } from '../../core/dominio/calculations.testi.js'
import { testi } from './state.testi.js'

/** L'elenco delle sezioni sta nel protocollo: lo legge anche l'host. */
export type { Vista } from '../../contract/protocollo.js'

// Le sezioni delle impostazioni stanno col posto (`posto.ts`), di cui fanno parte.
export type { SchedaDocumento, SchedaProgramma } from './posto.js'

/**
 * La regola del giorno dentro l'anno sta in `posto.ts`, che la usa per l'ora
 * aperta; qui la si ripete col nome che le prove del calendario conoscono.
 */
export { giornoNellAnno as giornoDentroLAnno } from './posto.js'

/** Come si guarda il calendario: la settimana, il mese, l'anno o l'agenda. */
export type ModoCalendario = (typeof MODI_CALENDARIO)[number]

/** Un blocco in lettura o in attesa di esserlo. */
interface VoceLavoro {
  smistamentoId: string;
  pagina: number;
  etichetta: string;
}

interface StatoLavoro {
  corrente: VoceLavoro | null;
  /** Quante pagine sono già state lette in questa infornata, e quante erano. */
  fatte: number;
  totale: number;
  coda: VoceLavoro[];
}

/**
 * Le tre schede di una lezione: amministrazione (mentre la classe entra),
 * lezione (durante e dopo), annotazioni.
 */
export type SchedaLezione = (typeof SCHEDE_LEZIONE)[number]

/** I tre strumenti della lezione: valutazioni, pendenze, check. */
export type SchedaStrumentiLezione = 'valutazioni' | 'pendenze' | 'check'

/**
 * Le tre schede della scheda di una persona in formazione: anagrafica (chi è,
 * come raggiungerla), docente di classe (da riscuotere, da firmare, annotato),
 * materie (ore e voti).
 */
export type SchedaPersona = (typeof SCHEDE_PERSONA)[number]

/** Se il check riguarda un corso o il lavoro del docente di classe. */
type AmbitoCheck = 'corso' | 'classe'

/** Le quattro schede del docente di classe, ognuna col suo ritmo. */
export type SchedaDocente = 'todo' | 'documenti' | 'assenze' | 'messaggistica'

/**
 * Le tre schede della pagina Documenti: del corso (presenze, voti, prove,
 * piani), delle lezioni (un riquadro per ora), degli allievi (una scheda a testa).
 */
export type SchedaDocumenti = (typeof SCHEDE_DOCUMENTI)[number]

/**
 * Che cosa guarda la mappa: tutti gli indirizzi, solo le aziende, solo le case.
 * Una scheda sola comanda insieme l'elenco e i segnaposti. La sede resta
 * accesa in tutte: è il punto da cui si leggono le distanze.
 */
export type SchedaMappa = (typeof SCHEDE_MAPPA)[number]

/**
 * Di chi sono le impostazioni che si guardano: del documento (viaggiano col
 * `.regi`) o del programma (restano su questa macchina, per tutti gli anni).
 */
type AmbitoImpostazioni = 'programma' | 'documento'

/**
 * Gli scalini dello zoom delle pagine nello sfoglio, in pixel: abbastanza
 * distanti da vedersi. Oltre l'ultimo si usa il lettore.
 */
export const MISURE_SFOGLIO = [130, 170, 230, 310, 420, 560]

/** La misura di partenza: si vede il colpo d'occhio e si legge il nome in testa. */
export const ZOOM_PREDEFINITO = 230

interface StatoUI {
  sidebarDesktop: boolean;
  sidebarMobile: boolean;
  /**
   * Se il riquadro dell'assistente è aperto. Si ricorda, come la sidebar, per
   * ritrovarlo dopo una ricostruzione della pagina; la conversazione invece no
   * (vedi `ui/assistant.ts`).
   */
  assistenteAperto: boolean;
  /**
   * Che cosa si dice all'assistente di dove si sta guardando, parte per parte.
   * Tutto acceso di principio, perché senza contesto il modello indovina un
   * corso; ogni parte si spegne da sé (vedi `assistant/parts.ts`). Si ricorda.
   */
  contestoAssistente: PartiContesto;

  registro: Registro;
  avvisi: string[];
  caricato: boolean;
  /**
   * La cartella dei dati come la vede il webview: dentro la sandbox un percorso
   * di disco non si carica, serve l'indirizzo `registro://` mandato dal pannello.
   */
  radiceDati: string | null;
  /** La radice dei file dell'applicazione: la usa chi disegna le pagine dei PDF. */
  radiceApp: string | null;
  /** Quanti gesti si possono annullare e ripristinare: li dice l'host, con lo stato. */
  storia: MessaggioStato['storia'];
  documenti: MessaggioStato['documenti'];
  /**
   * I documenti nella cartella delle esportazioni, come stanno su disco adesso
   * (il webview non li vede da sé): la pagina Documenti dice «c'è» o «da fare».
   */
  esportati: MessaggioStato['esportati'];
  /** Che cosa c'è sotto `archivio/`: i documenti raccolti dalla classe. */
  archiviati: MessaggioStato['archiviati'];
  /**
   * I fascicoli composti dell'anno: quel che la pagina Documenti elenca nel
   * riquadro «Fascicoli», con il loro PDF accanto.
   */
  composizioni: MessaggioStato['composizioni'];
  /** Se la lettura automatica delle scansioni è accesa nelle impostazioni. */
  ocrAttivo: boolean;
  /**
   * Le impostazioni del programma (`impostazioni.json`, non quelle del documento):
   * arrivano dal pannello perché il webview in sandbox non vede il file.
   */
  programma: MessaggioStato['programma'];
  /**
   * Com'è messa la posta: server, invio diretto, mittente. Arriva dal pannello:
   * sono impostazioni dell'applicazione.
   */
  posta: {
    /** Vero quando la casella è collegata: si spedisce dal server. */
    exchange: boolean;
    server: string;
    porta: number;
    invioDiretto: boolean;
    mittente: string;
    /** Il nome con cui si entra, quando è diverso dall'indirizzo. */
    accesso: string;
    /** Gli indirizzi dell'account collegato, fra cui si sceglie il mittente. */
    indirizzi: string[];
  };
  /**
   * Gli account Microsoft collegati per OneDrive, e la casella della posta.
   * Arriva dal pannello: i gettoni restano nel portachiavi dell'host.
   */
  microsoft: MessaggioStato['microsoft'];
  /** A che punto è la lettura delle scansioni: lavoro della macchina, non dato del registro. */
  lavoro: StatoLavoro;
  /**
   * Se il computer è in rete, come lo dice il browser. La barra di stato lo
   * mostra prima di «spedisci»: senza rete la posta non esce.
   */
  rete: boolean;
  /**
   * Dove si guarda: la pagina, il suo soggetto, la scheda (`posto.ts`). Lo
   * scrive solo `vai`; `vista`, ambiti e schede che fanno pagina ne sono la
   * traduzione per le viste, e gli id qui sotto il contesto.
   */
  posto: Posto;
  /** L'ultimo scelto per ogni tipo: resta cambiando pagina (`Contesto` in `posto.ts`). */
  contesto: Contesto;
  vista: Vista;
  /**
   * Se la riga delle azioni è nascosta. Si ricorda; i comandi restano nella
   * palette e nel menu, e la riga si riapre con l'interruttore o Ctrl+B.
   */
  azioniNascoste: boolean;
  /**
   * Di chi sono i comandi nella riga delle azioni: della pagina o dello schermo
   * per la classe (scheda «Proiezione», a schermo acceso). Passa a `'schermo'`
   * quando lo schermo si accende e torna a `'pagina'` spegnendolo o cambiando
   * pagina. Non si ricorda.
   */
  schedaComandi: 'pagina' | 'schermo';
  /** Quale scheda della lezione si sta guardando. */
  schedaLezione: SchedaLezione;
  /** Quale strumento della lezione si sta guardando nel pannello destro (valutazioni, pendenze, check). */
  schedaStrumentiLezione: SchedaStrumentiLezione;
  schedaPersona: SchedaPersona;
  /** Quale scheda delle pendenze si sta guardando ('tutte' o id corso/classe). */
  schedaTodo: string;
  /** Quale scheda del docente di classe si sta guardando. */
  schedaDocente: SchedaDocente;
  /** Se il check aperto appartiene al corso o alla classe del docente di classe. */
  ambitoCheck: AmbitoCheck;
  /** Quale scheda della pagina Documenti si sta guardando. */
  schedaDocumenti: SchedaDocumenti;
  /** Di chi sono le impostazioni aperte: del programma o del documento. */
  ambitoImpostazioni: AmbitoImpostazioni;
  /** Quale sezione delle impostazioni del programma. */
  schedaProgramma: SchedaProgramma;
  /** Quale sezione delle impostazioni del documento. */
  schedaDocumento: SchedaDocumento;
  /**
   * Il documento esportato nell'anteprima (percorso sotto `esportazioni/`), o
   * `null`. Non si ricorda; si svuota quando il file non c'è più.
   */
  anteprima: string | null;
  /**
   * Il documento raccolto aperto nell'archivio documentale (sotto `archivio/`).
   * Separato da `anteprima` perché le due pagine hanno elenchi diversi e una
   * cornice comune chiuderebbe l'una aprendo l'altra. Non si ricorda.
   */
  anteprimaArchivio: string | null;
  /**
   * Il foglio aperto nella pagina delle assenze (sotto `archivio/`), separato da
   * `anteprimaArchivio` per la stessa ragione. Non si ricorda.
   */
  anteprimaAssenze: string | null;
  /**
   * Le pagine scelte nello sfoglio del PDF da dividere, pronte da trascinare.
   * Stanno nello stato perché la vista si ridisegna a ogni battito dell'orologio;
   * tengono lo smistamento d'origine, così cambiando PDF la scelta non resta
   * appesa al documento sbagliato.
   */
  pagineScelte: { smistamentoId: string; pagine: number[] } | null;
  /** Come si guarda un PDF da dividere: le pagine (per smistare) o il lettore (per leggere). */
  sfoglioArchivio: 'pagine' | 'lettore';
  /** Quanto sono grandi le pagine nello sfoglio, in pixel di larghezza. Si ricorda. */
  zoomSfoglio: number;
  /**
   * Se nello sfoglio si vedono anche le pagine già archiviate. Di norma no: non
   * sono più lavoro da fare; l'interruttore serve a riprendere quella finita
   * sulla riga sbagliata.
   */
  mostraArchiviate: boolean;
  /**
   * I documenti spuntati nella pagina Documenti (percorsi sotto `esportazioni/`),
   * da combinare in un fascicolo. Valgono per tutte e tre le schede; si svuotano
   * cambiando corso o periodo.
   */
  documentiScelti: string[];
  modoCalendario: ModoCalendario;
  /**
   * Se il calendario mostra anche gli eventi ICS del documento (tratteggiati, non
   * si aprono). Lo stesso interruttore accende i segni della striscia «Settimane
   * dell'anno»: quel che non torna fra calendario e registro.
   */
  mostraCalendarioEsterno: boolean;
  /**
   * Se il calendario è in modifica: la griglia smette di aprire le lezioni al
   * clic e le prende in mano. Non si ricorda, perché un clic che doveva solo
   * aprire non sposti un'ora.
   */
  editorCalendario: boolean;
  /** Se la striscia «Settimane dell'anno» è ripiegata a una riga. Si ricorda. */
  strisciaSettimaneChiusa: boolean;
  /** Giorno di riferimento del calendario: la settimana o il mese che lo contiene. */
  data: Iso;
  /**
   * Il momento presente, aggiornato ogni minuto. Sta nello stato perché il
   * ridisegno che ne segue fa passare un'ora da «in corso» a «finita»; leggere
   * `new Date()` nelle viste le lascerebbe ferme.
   */
  adessoData: Iso;
  adessoOra: Ora;
  lezioneId: string | null;
  classeId: string | null;
  /** L'allievo di cui si guarda la scheda; vive dentro `classeId`. */
  allievoId: string | null;
  /**
   * Le classi aperte nell'elenco delle persone in formazione: chiuse di
   * principio, si ricordano quelle aperte.
   */
  classiApertePersone: string[];
  /**
   * Il corso su cui sono puntate le pagine di corso (registro, piani,
   * valutazioni, documenti): uno solo, condiviso fra le pagine.
   */
  corsoId: string | null;
  pianoId: string | null;
  valutazioneId: string | null;
  /** Filtro per classe delle pagine di corso: piani, valutazioni, registro. */
  filtroClasseId: string | null;
  /**
   * La classe della mappa, o `null` per tutte. Separata dal filtro delle pagine
   * di corso: restringere l'una non restringe l'altro.
   */
  classeMappaId: string | null;
  filtroCorsoAgendaId: string | null;
  /**
   * Il semestre dei conti, o `null` per l'anno intero: medie e assenze hanno
   * senso per semestre. Si parte da quello in cui cade oggi.
   */
  semestreId: string | null;
  /** Di chi si guardano le consegne nella pagina delle pendenze. */
  /**
   * La classe aperta nella pagina delle pendenze, o `null` per tutte (anche
   * quando la classe scelta non ha più niente in sospeso).
   */
  /** Quale dei tre elenchi è aperto nella colonna della mappa. */
  schedaMappa: SchedaMappa;
  /**
   * Il filtro delle consegne nel pannello del docente di classe, separato da
   * quello delle pendenze. Si parte da tutte: la domanda è «come sta la classe».
   */
  /**
   * Il periodo di assenze aperto nel pannello del docente di classe: uno per
   * volta, perché la matrice è già larga.
   */
  bloccoAssenzeId: string | null;
  ricerca: string;
  /**
   * Com'è messo lo schermo per la classe. Lo dice l'host: è il solo a sapere se
   * la finestra esiste ancora.
   */
  proiezione: {
    aperta: boolean;
    impostazioni: ImpostazioniProiezione;
  };
}

/** Nessun id scelto: il contesto di un documento mai aperto. */
const CONTESTO_VUOTO: Contesto = {
  corsoId: null,
  classeId: null,
  filtroClasseId: null,
  lezioneId: null,
  pianoId: null,
  valutazioneId: null,
  allievoId: null,
}

/**
 * Quel che si ricorda (`memoria.ts`), letto una volta dal ponte. Un JSON di
 * una versione precedente si migra qui: il posto lo ricava `postoDaVecchi`, e
 * la sua voce aspetta il primo documento che si apre.
 */
let memoria: Memoria = leggiMemoria(leggiStatoPersistito<unknown>(), { postoDaVecchi })

const globali: Partial<Globali> = memoria.globali

/**
 * La voce del JSON vecchio: vale già all'avvio, come valevano i campi di
 * prima, e il primo documento che arriva la adotta (`voceDel`).
 */
const primaVoce: VoceDocumento | null = memoria.documenti[VOCE_SENZA_DOCUMENTO] ?? null

const postoIniziale: Posto = primaVoce?.posto ?? { pagina: 'pagina.oggi' }
const contestoIniziale: Contesto = { ...CONTESTO_VUOTO, ...primaVoce?.contesto }
const derivatiIniziali = derivaVista(postoIniziale)

export const stato: StatoUI = {
  registro: registroVuoto(),
  avvisi: [],
  caricato: false,
  sidebarDesktop: globali.sidebarDesktop ?? true,
  sidebarMobile: globali.sidebarMobile ?? false,
  assistenteAperto: globali.assistenteAperto ?? false,
  contestoAssistente: partiValide(globali.contestoAssistente),
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
    porta: 0,
    invioDiretto: false,
    mittente: '',
    accesso: '',
    indirizzi: [],
  },
  microsoft: { account: [] },
  lavoro: { corrente: null, fatte: 0, totale: 0, coda: [] },
  // `navigator.onLine` è un «no» affidabile e un «sì» ottimista: basta a non far
  // partire le comunicazioni col cavo staccato.
  rete: navigator.onLine,
  // La memoria ha già scartato i valori che non esistono più: qui restano i
  // predefiniti di chi non ne ha.
  posto: postoIniziale,
  contesto: contestoIniziale,
  vista: derivatiIniziali.vista,
  azioniNascoste: globali.azioniNascoste ?? false,
  schedaComandi: 'pagina',
  schedaLezione: globali.schedaLezione ?? 'amministrazione',
  schedaStrumentiLezione: 'valutazioni',
  schedaPersona: globali.schedaPersona ?? 'anagrafica',
  schedaTodo: primaVoce?.schedaTodo ?? 'tutte',
  schedaDocente: derivatiIniziali.schedaDocente ?? 'todo',
  ambitoCheck: derivatiIniziali.ambitoCheck ?? 'corso',
  schedaDocumenti: globali.schedaDocumenti ?? 'corso',
  ambitoImpostazioni: derivatiIniziali.ambitoImpostazioni ?? 'documento',
  schedaProgramma: derivatiIniziali.schedaProgramma ??
    globali.ultimaSchedaImpostazioni?.programma ?? 'aspetto',
  schedaDocumento: derivatiIniziali.schedaDocumento ??
    globali.ultimaSchedaImpostazioni?.documento ?? 'anno',
  anteprima: null,
  anteprimaArchivio: null,
  anteprimaAssenze: null,
  pagineScelte: null,
  sfoglioArchivio: 'pagine',
  zoomSfoglio: globali.zoomSfoglio ?? ZOOM_PREDEFINITO,
  mostraArchiviate: false,
  documentiScelti: primaVoce?.documentiScelti ?? [],
  modoCalendario: globali.modoCalendario ?? 'settimana',
  mostraCalendarioEsterno: globali.mostraCalendarioEsterno ?? true,
  editorCalendario: false,
  strisciaSettimaneChiusa: globali.strisciaSettimaneChiusa ?? false,
  data: primaVoce?.giorno ?? oggi(),
  adessoData: oggi(),
  adessoOra: adesso(),
  ...contestoIniziale,
  classiApertePersone: primaVoce?.classiApertePersone ?? [],
  classeMappaId: primaVoce?.classeMappaId ?? null,
  filtroCorsoAgendaId: primaVoce?.filtroCorsoAgendaId ?? null,
  // Assente = mai scelto: vale «anno intero» finché, arrivato il registro,
  // `allineaSemestre` sceglie il semestre di oggi. `null` è una scelta: l'anno intero.
  semestreId: primaVoce?.semestreId ?? null,
  schedaMappa: globali.schedaMappa ?? 'tutti',
  bloccoAssenzeId: primaVoce?.bloccoAssenzeId ?? null,
  ricerca: primaVoce?.ricerca ?? '',
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
let semestreDaAllineare = primaVoce?.semestreId === undefined

/**
 * Se una modifica cambia corso o periodo: l'anteprima di prima mostrerebbe un
 * documento vero del contesto sbagliato.
 */
function cambiaContesto (modifiche: Partial<StatoUI>): boolean {
  return (
    (modifiche.corsoId !== undefined && modifiche.corsoId !== stato.corsoId) ||
    (modifiche.semestreId !== undefined &&
      modifiche.semestreId !== stato.semestreId)
  )
}

/**
 * Se una modifica cambia classe o periodo dell'archivio documentale: il foglio
 * aperto sarebbe di una persona sbagliata.
 */
function cambiaClasse (modifiche: Partial<StatoUI>): boolean {
  return (
    (modifiche.classeId !== undefined &&
      modifiche.classeId !== stato.classeId) ||
    (modifiche.semestreId !== undefined &&
      modifiche.semestreId !== stato.semestreId)
  )
}

// ------------------------------------------------------------------ memoria

/**
 * Il documento di cui lo stato porta posto e scelte (il percorso, come lo dice
 * l'host), e se era provvisorio. `undefined`: non ne è ancora arrivato nessuno.
 */
let documentoRitrovato: string | null | undefined
let documentoProvvisorio = false

/** La chiave del documento aperto nella memoria, o `null` se non se ne ricorda niente. */
function chiaveDelDocumento (): string | null {
  return chiaveDocumento(stato.documenti.corrente, stato.documenti.provvisorio === true)
}

/** Quel che del documento aperto si ricorda: il posto e le scelte con i suoi id. */
function voceDiAdesso (): VoceDocumento {
  const voce: VoceDocumento = {
    usato: '',
    posto: stato.posto,
    contesto: stato.contesto,
    giorno: stato.data,
    filtroCorsoAgendaId: stato.filtroCorsoAgendaId,
    classeMappaId: stato.classeMappaId,
    bloccoAssenzeId: stato.bloccoAssenzeId,
    schedaTodo: stato.schedaTodo,
    classiApertePersone: stato.classiApertePersone,
    documentiScelti: stato.documentiScelti,
    ricerca: stato.ricerca,
  }
  // Un semestre mai scelto non si scrive: riaprendo va ancora allineato a oggi.
  if (!semestreDaAllineare) voce.semestreId = stato.semestreId
  return voce
}

function globaliDiAdesso (): Partial<Globali> {
  return {
    schedaLezione: stato.schedaLezione,
    schedaPersona: stato.schedaPersona,
    schedaDocumenti: stato.schedaDocumenti,
    schedaMappa: stato.schedaMappa,
    modoCalendario: stato.modoCalendario,
    mostraCalendarioEsterno: stato.mostraCalendarioEsterno,
    strisciaSettimaneChiusa: stato.strisciaSettimaneChiusa,
    zoomSfoglio: stato.zoomSfoglio,
    sidebarDesktop: stato.sidebarDesktop,
    sidebarMobile: stato.sidebarMobile,
    assistenteAperto: stato.assistenteAperto,
    contestoAssistente: { ...daRicordare(stato.contestoAssistente) },
    azioniNascoste: stato.azioniNascoste,
    ultimaSchedaImpostazioni: {
      programma: stato.schedaProgramma,
      documento: stato.schedaDocumento,
    },
  }
}

/**
 * Scrive nelle preferenze locali quel che si ritrova riaprendo. Fuori da
 * `aggiorna` perché certe cose si ricordano senza ridisegnare. Scrive solo se
 * è cambiato qualcosa (`aggiorna` chiama a ogni battito), ma subito: una
 * finestra chiusa un attimo dopo il gesto deve averlo salvato. Prima dei dati
 * non scrive: il posto non sarebbe ancora quello del documento. Un documento
 * senza percorso (provvisorio) tiene solo le preferenze di forma.
 */
let ultimoRicordato: string | null = null

export function ricorda (): void {
  if (!stato.caricato) return
  const chiave = chiaveDelDocumento()
  const globaliNuove = globaliDiAdesso()
  const voce = chiave === null ? null : voceDiAdesso()
  // Senza `usato`, che cambia a ogni scrittura: conta se è cambiato il resto.
  const impronta = JSON.stringify([globaliNuove, chiave, voce])
  if (impronta === ultimoRicordato) return
  ultimoRicordato = impronta
  memoria = { ...memoria, globali: globaliNuove }
  if (voce) memoria = conVoce(memoria, chiave, voce, new Date())
  // Il ponte vuole un oggetto; `serializza` lo tiene sotto il limite del disco.
  scriviStatoPersistito(JSON.parse(serializza(memoria)) as unknown)
}

/**
 * Mette nello stato la voce di un documento: il suo posto e contesto, il
 * giorno, le scelte; senza voce, la Dashboard e niente scelto. Il posto si
 * convalida dopo, sui dati del documento (`riconvalidaRicordati`).
 */
function caricaVoce (voce: VoceDocumento | null): void {
  const posto: Posto = voce?.posto ?? { pagina: 'pagina.oggi' }
  const contesto: Contesto = { ...CONTESTO_VUOTO, ...voce?.contesto }
  // Diretto e non da `applica`, che spegnerebbe l'allineamento del semestre.
  Object.assign(stato, {
    posto,
    contesto,
    ...contesto,
    ...derivaVista(posto),
    data: voce?.giorno ?? stato.adessoData,
    semestreId: voce?.semestreId ?? null,
    filtroCorsoAgendaId: voce?.filtroCorsoAgendaId ?? null,
    classeMappaId: voce?.classeMappaId ?? null,
    bloccoAssenzeId: voce?.bloccoAssenzeId ?? null,
    schedaTodo: voce?.schedaTodo ?? 'tutte',
    classiApertePersone: voce?.classiApertePersone ?? [],
    documentiScelti: voce?.documentiScelti ?? [],
    ricerca: voce?.ricerca ?? '',
  } satisfies Partial<StatoUI>)
  semestreDaAllineare = voce?.semestreId === undefined
  // Il giorno ricordato si riporta dentro l'anno del documento.
  annoGiornoRiconvalidato = null
  avvisa()
}

/**
 * Dopo l'arrivo dei dati: se il documento è cambiato porta nello stato quel
 * che se ne ricorda (`caricaVoce`). `'nuovo'` se è un altro documento,
 * `'adottato'` se è lo stesso che ha preso un percorso (un anno provvisorio
 * salvato con nome: si resta dove si è, e la voce nasce da qui), `null` se
 * è lo stesso di prima.
 */
export function ritrovaDocumento (): 'nuovo' | 'adottato' | null {
  const { corrente, provvisorio } = stato.documenti
  if (corrente === documentoRitrovato) return null
  const eraProvvisorio = documentoRitrovato !== undefined && documentoProvvisorio
  documentoRitrovato = corrente
  documentoProvvisorio = provvisorio === true
  const chiave = chiaveDelDocumento()
  if (eraProvvisorio && chiave !== null && !memoria.documenti[chiave]) return 'adottato'
  const trovata = voceDel(memoria, chiave)
  memoria = trovata.memoria
  caricaVoce(trovata.voce)
  return 'nuovo'
}

// ------------------------------------------------------------------ aggiornare

/** Quanti `inBlocco` sono aperti, e se dentro qualcosa è cambiato. */
let blocchi = 0
let cambiatoNelBlocco = false

/** Ricorda e ridisegna; dentro un blocco, alla sua fine. */
function avvisa (): void {
  if (blocchi > 0) {
    cambiatoNelBlocco = true
    return
  }
  ricorda()
  for (const ascoltatore of ascoltatori) ascoltatore()
}

/** Come la fila di Alt+←/→ prende un posto: nuovo, al posto di quello di adesso, o un passo. */
export type ModoStoria = 'aggiungi' | 'sostituisci' | 'passo'

/** Chi segue i posti raggiunti (`history.ts`), col giorno che si lascia. */
type SeguePosto = (fatto: Completato, storia: ModoStoria, giornoLasciato: Iso) => void

const seguaci = new Set<SeguePosto>()

/** L'ultimo posto raggiunto dentro un blocco, da dire alla fine. */
let postoInSospeso: Parameters<SeguePosto> | null = null

/** Segue ogni posto raggiunto da `vai`. Torna la disiscrizione. */
export function seguiPosti (seguace: SeguePosto): () => void {
  seguaci.add(seguace)
  return () => seguaci.delete(seguace)
}

function segnalaPosto (...posto: Parameters<SeguePosto>): void {
  if (blocchi === 0) {
    for (const seguace of seguaci) seguace(...posto)
    return
  }
  // Nel blocco conta l'ultimo posto; un «aggiungi» non si perde per un
  // «sostituisci» dopo, e il giorno lasciato è quello di prima del blocco.
  const prima = postoInSospeso
  const storia = prima?.[1] === 'aggiungi' && posto[1] === 'sostituisci' ? 'aggiungi' : posto[1]
  postoInSospeso = [posto[0], storia, prima?.[2] ?? posto[2]]
}

/**
 * Più cambi come uno solo: ascoltatori, memoria e storia sentono solo lo
 * stato finale. Serve dove un gesto fa più passi (l'arrivo dei dati:
 * documento, semestre, posto) e uno stato a metà partirebbe verso l'host (la
 * mira dello schermo con gli id dell'anno di prima).
 */
export function inBlocco (fn: () => void): void {
  blocchi += 1
  try {
    fn()
  } finally {
    blocchi -= 1
    if (blocchi === 0) {
      const posto = postoInSospeso
      postoInSospeso = null
      if (posto) segnalaPosto(...posto)
      if (cambiatoNelBlocco) {
        cambiatoNelBlocco = false
        avvisa()
      }
    }
  }
}

/** Mette le modifiche nello stato, con le regole che legano un campo all'altro. */
function applica (modifiche: Partial<StatoUI>): void {
  if (modifiche.anteprimaArchivio === undefined && cambiaClasse(modifiche)) {
    modifiche = { ...modifiche, anteprimaArchivio: null }
  }
  // Il foglio delle assenze è di una classe e di un periodo: cambiando l'uno o
  // l'altro si chiude, perché le frecce scorrono i fogli di quel periodo.
  const cambiaPeriodo =
    modifiche.bloccoAssenzeId !== undefined &&
    modifiche.bloccoAssenzeId !== stato.bloccoAssenzeId
  if (
    modifiche.anteprimaAssenze === undefined &&
    (cambiaClasse(modifiche) || cambiaPeriodo)
  ) {
    modifiche = { ...modifiche, anteprimaAssenze: null }
  }
  // Cambiando foglio (in tutte e due le cornici) si perdono le pagine scelte:
  // sono pagine di quel PDF.
  if (
    (modifiche.anteprimaArchivio !== undefined ||
      modifiche.anteprimaAssenze !== undefined) &&
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
  // Solo quel che cambia davvero: un valore uguale (lo stesso registro spinto di
  // nuovo, l'orologio nello stesso minuto, un clic sulla scheda già aperta) non
  // ridisegna. Lo stato non si modifica mai sul posto, quindi basta `Object.is`.
  const cambiate = Object.entries(modifiche).filter(([chiave, valore]) =>
    valore !== undefined && !Object.is(stato[chiave as keyof StatoUI], valore))
  if (cambiate.length === 0) return
  Object.assign(stato, Object.fromEntries(cambiate))
  avvisa()
}

/**
 * I campi che dicono dove si è: li scrive solo `vai`, che li deriva dal posto
 * (`derivaVista`) e dal contesto. Per `aggiorna` non esistono.
 */
type CampoDelPosto =
  | 'posto'
  | 'contesto'
  | 'vista'
  | 'ambitoCheck'
  | 'schedaDocente'
  | 'ambitoImpostazioni'
  | 'schedaProgramma'
  | 'schedaDocumento'
  | typeof CAMPI_CONTESTO[number]

/** Lo stato che si cambia senza muoversi: tutto meno il posto e i suoi derivati. */
type ModificheStato = Partial<Omit<StatoUI, CampoDelPosto>>

/** Cambia lo stato e ridisegna. Per cambiare dove si è c'è `vai`. */
export function aggiorna (modifiche: ModificheStato): void {
  applica(modifiche)
}

/**
 * Ridisegna senza cambiare lo stato: per chi tiene qualcosa fuori da `stato`
 * (una lettura arrivata, uno scarico che avanza) e deve farlo vedere.
 */
export function ridisegna (): void {
  if (blocchi > 0) {
    cambiatoNelBlocco = true
    return
  }
  for (const ascoltatore of ascoltatori) ascoltatore()
}

// ------------------------------------------------------------------ il posto

interface OpzioniVai {
  /** Il giorno da guardare: comanda su quello del soggetto (`naviga` con la data). */
  giorno?: Iso
  storia?: ModoStoria
  /** Le preferenze del documento da cambiare insieme: semestre, filtro dell'agenda. */
  preferenze?: Partial<Pick<StatoUI, 'semestreId' | 'filtroCorsoAgendaId'>>
  /** Gli id scelti insieme al posto: il contesto che il soggetto poi completa. */
  contesto?: Partial<Contesto>
  /** Il resto dello stato da cambiare nello stesso passo. */
  altro?: ModificheStato
  /**
   * Si riconferma il posto di adesso sui dati nuovi: il soggetto non sposta
   * giorno, semestre né filtro scelti da chi guarda.
   */
  riprendi?: boolean
  /**
   * Se il soggetto è un elemento chiesto per nome (un'ora, una prova), che
   * porta con sé giorno e semestre. Di norma: se il posto ne ha uno. Un'ora
   * che la pagina si prende da sé (il Registro di un corso) non cambia il
   * periodo scelto.
   */
  elementoChiesto?: boolean
}

/** Dove si è adesso. */
export function postoCorrente (): Posto {
  return stato.posto
}

/** La sezione da cui si riaprono le impostazioni: l'ultima guardata nel suo ambito. */
function schedaRicordata (): Scheda {
  // testo-fisso: l'id di una sezione
  if (stato.ambitoImpostazioni === 'programma') return `programma.${stato.schedaProgramma}`
  // testo-fisso: l'id di una sezione
  return `documento.${stato.schedaDocumento}`
}

function stessoContesto (a: Contesto, b: Contesto): boolean {
  return CAMPI_CONTESTO.every((campo) => a[campo] === b[campo])
}

/**
 * Va in un posto: lo rende vero sul registro (`completa`: il soggetto che
 * manca dal contesto, quello sparito col suo ripiego), porta contesto,
 * giorno e semestre del soggetto, scrive i campi di prima che le viste
 * leggono ancora, e lo dice alla storia. Un passo solo.
 */
export function vai (chiesto: Posto, opzioni: OpzioniVai = {}): Completato {
  const altro: ModificheStato = { ...opzioni.altro, ...opzioni.preferenze }
  const posto = chiesto.pagina === 'pagina.impostazioni' && !chiesto.scheda
    ? { ...chiesto, scheda: schedaRicordata() }
    : chiesto
  const fatto = completa(
    posto,
    { ...stato.contesto, ...opzioni.contesto },
    altro.registro ?? stato.registro,
    stato.adessoData,
    {
      semestreId: altro.semestreId !== undefined ? altro.semestreId : stato.semestreId,
      filtroCorsoAgendaId: altro.filtroCorsoAgendaId !== undefined
        ? altro.filtroCorsoAgendaId
        : stato.filtroCorsoAgendaId,
    },
  )
  const stesso = chiaveDelPosto(fatto.posto) === chiaveDelPosto(stato.posto)
  const pref: Partial<StatoUI> = {}
  const { giorno, semestreId, filtroCorsoAgendaId } = fatto.preferenzeDoc
  if (!stesso && opzioni.riprendi !== true) {
    const trovato = fatto.posto.soggetto
    const chiestoDavvero = (opzioni.elementoChiesto ?? chiesto.soggetto !== undefined) &&
      trovato?.tipo === chiesto.soggetto?.tipo && trovato?.id === chiesto.soggetto?.id
    if (chiestoDavvero) {
      if (giorno !== undefined) pref.data = giorno
      if (semestreId !== undefined) pref.semestreId = semestreId
    }
    if (filtroCorsoAgendaId !== undefined) pref.filtroCorsoAgendaId = filtroCorsoAgendaId
  } else if (filtroCorsoAgendaId === null) {
    // Un filtro su un corso che non c'è più si spegne comunque.
    pref.filtroCorsoAgendaId = null
  }
  const giornoLasciato = stato.data
  applica({
    ...pref,
    ...altro,
    ...(opzioni.giorno ? { data: opzioni.giorno } : {}),
    // Gli oggetti di prima se non cambiano: `applica` confronta con `Object.is`.
    posto: stesso ? stato.posto : fatto.posto,
    contesto: stessoContesto(fatto.contesto, stato.contesto) ? stato.contesto : fatto.contesto,
    ...fatto.contesto,
    ...fatto.derivati,
  })
  segnalaPosto(fatto, opzioni.storia ?? 'aggiungi', giornoLasciato)
  return fatto
}

// ------------------------------------------------------------------ selezioni

// Le viste chiedono qui invece di risalire le catene a mano: involucri sottili
// sul dominio che aggiungono il registro corrente.

export function annoCorrente () {
  return annoInUso(stato.registro)
}

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

/** Le classi dell'anno in corso, archiviate escluse, in ordine di nome. */
export function classiVisibili () {
  const anno = annoCorrente()
  return derivato('classiVisibili', anno?.id ?? '', () =>
    stato.registro.classi
      .filter((c) => (!anno || c.annoId === anno.id) && !c.archiviata)
      .sort((a, b) => confrontaNomi(a.nome, b.nome)),
  )
}

/**
 * Le classi di cui si è docente di classe. Sta qui perché la barra la legge per
 * decidere se la sezione «Docente di classe» c'è, e la tendina per le sue voci.
 */
export function classiDiCuiSonoDocente () {
  const anno = annoCorrente()
  return derivato('classiDiCuiSonoDocente', anno?.id ?? '', () =>
    classiVisibili().filter((c) => c.docenteDiClasse),
  )
}

/** Tutte le classi dell'anno, archiviate comprese: serve alla vista Classi. */
export function classiDellAnno () {
  const anno = annoCorrente()
  return derivato('classiDellAnno', anno?.id ?? '', () =>
    stato.registro.classi
      .filter((c) => !anno || c.annoId === anno.id)
      .sort(
        (a, b) =>
          Number(a.archiviata) - Number(b.archiviata) ||
          confrontaNomi(a.nome, b.nome),
      ),
  )
}

export function classePerId (id: string | null) {
  return id ? (stato.registro.classi.find((c) => c.id === id) ?? null) : null
}

export function lezionePerId (id: string | null) {
  return id ? (stato.registro.lezioni.find((l) => l.id === id) ?? null) : null
}

export function pianoPerId (id: string | null) {
  return id ? (stato.registro.piani.find((p) => p.id === id) ?? null) : null
}

export function valutazionePerId (id: string | null) {
  return id
    ? (stato.registro.valutazioni.find((v) => v.id === id) ?? null)
    : null
}

export function materiaPerId (id: string | null) {
  return id ? (stato.registro.materie.find((m) => m.id === id) ?? null) : null
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
  return derivato('corsiDellAnnoAperto', anno?.id ?? '', () =>
    corsiDellAnno(stato.registro, anno?.id ?? null).sort((a, b) =>
      confrontaNomi(a.titolo, b.titolo),
    ),
  )
}

/**
 * I corsi che la barra laterale elenca: quelli dell'anno con almeno un'ora nel
 * semestre scelto, più quelli senza nessuna ora (appena creati, da ritrovare).
 */
export function corsiNelSemestre (): Corso[] {
  const semestre = semestreScelto()
  return derivato('corsiNelSemestre', `${annoCorrente()?.id ?? ''}|${semestre?.id ?? ''}`, () => {
    const corsi = corsiDellAnnoAperto()
    if (!semestre) return corsi
    // Una passata sola su tutte le lezioni: la barra lo chiede a ogni ridisegno.
    const conOre = new Set<string>()
    const nelPeriodo = new Set<string>()
    for (const l of stato.registro.lezioni) {
      conOre.add(l.corsoId)
      if (l.data >= semestre.inizio && l.data <= semestre.fine) {
        nelPeriodo.add(l.corsoId)
      }
    }
    return corsi.filter(
      (corso) => !corso.id || !conOre.has(corso.id) || nelPeriodo.has(corso.id),
    )
  })
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
    dellAnno.find((c) => c.id === stato.corsoId) ??
    corsiNelSemestre()[0] ??
    dellAnno[0] ??
    null
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
export function classeDellAllievo (
  allievoId: string | null,
  dichiarataId: string | null,
) {
  const dichiarata = classePerId(dichiarataId)
  return dichiarata?.allievi.some((a) => a.id === allievoId) === true
    ? dichiarata
    : (stato.registro.classi.find((c) =>
        c.allievi.some((a) => a.id === allievoId),
      ) ?? null)
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
  return numero
    ? testiCalcoli().ennesimaLezione(numero)
    : formattaData(lezione.data, 'giorno')
}

/**
 * Di che cosa parla una lezione, in due parole: il primo obiettivo del piano,
 * o la prima tappa della scaletta. Vuoto senza piano.
 */
export function titoloDiLezione (lezione: Lezione): string {
  const piano = pianoPerId(lezione.pianoId)
  if (!piano) return ''
  return (
    piano.obiettivi[0] ??
    piano.attivita.find((a) => a.titolo.trim())?.titolo ??
    ''
  )
}

export function coloreDiLezione (lezione: Lezione): string {
  const corso = stato.registro.corsi.find((c) => c.id === lezione.corsoId)
  return corso
    ? coloreDiCorso(corso)
    : (classeDiLezione(lezione)?.colore ?? '#888888')
}

/**
 * Il colore di un corso: il suo se l'ha scelto, altrimenti la media fra classe
 * e materia (`coloreDelCorso`).
 */
export function coloreDiCorso (corso: Corso): string {
  return coloreDelCorso(
    corso,
    classePerId(corso.classeId),
    materiaPerId(corso.materiaId),
  )
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
  return (
    stato.registro.classi.find((c) => c.id === classeId)?.nome ??
    testi().senzaClasse
  )
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
 * pannello torna in primo piano. Si ridisegna solo quando cambia il giorno; il
 * minuto nuovo lo sente chi segna l'ora (`alMinuto` in `orologio.ts`). Il
 * battito più fitto evita che il minuto nuovo si veda in ritardo.
 */
export function avviaOrologio (): () => void {
  const batti = () => {
    const data = oggi()
    const ora = adesso()
    if (data === stato.adessoData && ora === stato.adessoOra) return
    if (data === stato.adessoData) {
      // Solo il minuto: niente ridisegno, si sposta da sé chi segna l'ora
      // (`orologio.ts`). Diretto e non da `aggiorna`: le memorie derivate con
      // `adessoOra` nella chiave si ricalcolano al prossimo ridisegno naturale.
      stato.adessoOra = ora
      battiMinuto(ora)
      return
    }
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
  return voci.filter(
    (v) => v.data >= semestre.inizio && v.data <= semestre.fine,
  )
}

/**
 * Come `nelSemestreScelto`, per voci che portano la data dentro un istante
 * (`creataIl`): conta la parte prima di `T`.
 */
export function nelSemestreSceltoPer<T> (
  voci: T[],
  quando: (voce: T) => string,
): T[] {
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
export function toccaIlSemestreScelto<T extends { dal: Iso; al: Iso }> (
  voci: T[],
): T[] {
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
  if (
    stato.semestreId &&
    anno &&
    !anno.semestri.some((s) => s.id === stato.semestreId)
  ) {
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
 * A ogni arrivo dei dati: azzera le scelte ricordate che puntano a qualcosa
 * che nel documento non c'è più (classe della mappa, periodo di assenze:
 * `null` vuol dire «tutti»), riporta il giorno dentro l'anno quando l'anno
 * cambia, e riconferma il posto sui dati nuovi (`completa`: l'ora cancellata,
 * il corso di un altro anno, la sezione del docente di classe sparita).
 */
export function riconvalidaRicordati (): void {
  const r = stato.registro
  const anno = annoCorrente()
  const modifiche: Partial<StatoUI> = {}
  if (stato.classeMappaId !== null && !r.classi.some((c) => c.id === stato.classeMappaId)) {
    modifiche.classeMappaId = null
  }
  if (
    stato.bloccoAssenzeId &&
    !r.fascicoli.some((f) =>
      f.assenze.some((b) => b.id === stato.bloccoAssenzeId),
    )
  ) {
    modifiche.bloccoAssenzeId = null
  }
  // Il giorno scelto si riporta dentro l'anno aperto solo quando l'anno cambia
  // (o all'avvio): alle altre spinte dell'host si lascia dov'è l'ha portato chi guarda.
  const chiaveAnno = anno ? `${anno.id}|${anno.inizio}|${anno.fine}` : null
  if (chiaveAnno !== annoGiornoRiconvalidato) {
    annoGiornoRiconvalidato = chiaveAnno
    const giorno = giornoNellAnno(stato.data, anno, oggi())
    if (giorno !== stato.data) modifiche.data = giorno
  }
  inBlocco(() => {
    if (Object.keys(modifiche).length > 0) applica(modifiche)
    vai(stato.posto, { storia: 'sostituisci', riprendi: true })
  })
}

// ------------------------------------------------------------------ derivati

/**
 * L'ora che chiede qualcosa adesso: il buco da riempire, o la prossima. Una
 * sola per la barra di stato e per «Ora da compilare»: sulle ore dell'agenda
 * e dentro il periodo scelto, i due filtri che la barra ha accanto.
 */
export function oraDaFare (): ReturnType<typeof oraDaCompilare> {
  return derivato(
    'oraDaFare',
    [
      stato.filtroCorsoAgendaId,
      stato.semestreId,
      stato.adessoData,
      stato.adessoOra,
    ].join('|'),
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
 * Le ore di oggi con la loro fase, per la Dashboard: sulle ore dell'agenda
 * come il calendario, annullate comprese (spente). La fase si calcola qui, in
 * memoria, e l'ora di adesso è nella chiave.
 */
export function oreDiOggi (): Array<{ lezione: Lezione; fase: FaseOra }> {
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
          fase: faseDellOra(
            stato.registro,
            lezione,
            stato.adessoData,
            stato.adessoOra,
            indice,
          ),
        }))
    },
  )
}

interface Conto { aperti: number; urgenti: number }

/**
 * Le pendenze di ogni corso e di ogni classe di cui si è docente, una volta per
 * registro e giorno: sono il conto pesante (tutte le classi), e non dipendono
 * dalla pagina guardata. Cambiando pagina si rilegge da qui.
 */
function contoDelCorso (corso: Corso): Conto {
  return derivato('pendenzeDelCorso', `${corso.id}|${stato.adessoData}`, () => {
    const classe = classePerId(corso.classeId)
    if (!classe) return NIENTE
    const todo = todoDelCorso(stato.registro, classe, corso, stato.adessoData)
    return { aperti: todo.aperti, urgenti: todo.urgenti }
  })
}

function contoDellaClasse (classe: Classe): Conto {
  return derivato('pendenzeDellaClasse', `${classe.id}|${stato.adessoData}`, () => {
    const todo = todoDelDocenteDiClasse(
      stato.registro, classe, corsiDi(classe.id), stato.adessoData,
    )
    return { aperti: todo.aperti, urgenti: todo.urgenti }
  })
}

/**
 * Le pendenze di ogni corso e di ogni classe di cui si è docente, una volta per
 * registro e giorno: sono il conto pesante (tutte le classi), e non dipendono
 * dalla pagina guardata. Cambiando pagina si rilegge da qui.
 */
function pendenzeDellAnno (): { corsi: Map<string, Conto>; classi: Map<string, Conto> } {
  return derivato('pendenzeDellAnno', stato.adessoData, () => {
    const corsi = new Map<string, Conto>()
    for (const corso of corsiDellAnnoAperto()) {
      corsi.set(corso.id, contoDelCorso(corso))
    }
    const classi = new Map<string, Conto>()
    for (const classe of classiDiCuiSonoDocente()) {
      classi.set(classe.id, contoDellaClasse(classe))
    }
    return { corsi, classi }
  })
}

/** La somma di più conti. */
function somma (conti: Iterable<Conto>): Conto {
  let aperti = 0
  let urgenti = 0
  for (const conto of conti) {
    aperti += conto.aperti
    urgenti += conto.urgenti
  }
  return { aperti, urgenti }
}

const NIENTE: Conto = { aperti: 0, urgenti: 0 }

/**
 * Le pendenze che la barra conta: il totale di tutte le pendenze aperte
 * per il filtro considerato (scheda todo attiva, corso o classe aperta, oppure
 * anno intero). Qui si sceglie soltanto quali conti sommare: i conti li fa
 * `pendenzeDellAnno`, una volta per giorno.
 */
export function pendenzeDellaBarra (): Conto {
  // 1. Vista legata a un corso
  const visteCorso: readonly Vista[] = ['lezione', 'valutazioni', 'piani', 'documenti']
  const eCorso =
    visteCorso.includes(stato.vista) ||
    (stato.vista === 'check' && stato.ambitoCheck === 'corso')
  if (eCorso) {
    const corso = corsoAperto()
    if (corso && classePerId(corso.classeId)) return contoDelCorso(corso)
  }

  // 2. Vista legata alla docenza di classe
  const eClasse =
    stato.vista === 'docenteClasse' ||
    (stato.vista === 'check' && stato.ambitoCheck === 'classe')
  if (eClasse) {
    const docenze = classiDiCuiSonoDocente()
    if (docenze.length > 0) {
      const classe = (stato.classeId ? classePerId(stato.classeId) : undefined) ?? docenze[0]
      if (classe) return contoDellaClasse(classe)
    }
  }

  // 3. Vista todo: il filtro considerato è la scheda attiva
  if (stato.vista === 'todo') {
    const scheda = stato.schedaTodo || 'tutte'
    if (scheda.startsWith('corso:')) {
      const corso = corsoPerId(scheda.slice(6))
      return corso ? contoDelCorso(corso) : NIENTE
    }
    if (scheda.startsWith('classe:')) {
      const classe = classePerId(scheda.slice(7))
      return classe ? contoDellaClasse(classe) : NIENTE
    }
  }

  // 4. Tutte le pendenze dell'anno
  const { corsi, classi } = pendenzeDellAnno()
  if (corsi.size === 0 && classi.size === 0) return NIENTE

  if (stato.vista === 'todo') {
    const scheda = stato.schedaTodo || 'tutte'
    if (scheda === 'corsi') return somma(corsi.values())
    if (scheda === 'classi') return somma(classi.values())
  }

  return somma([...corsi.values(), ...classi.values()])
}

/** Oggi se ci sono lezioni; altrimenti la prossima giornata del periodo scelto. */
function giornoDellaDashboard (): Iso {
  const lezioni = nelSemestreScelto(
    lezioniDellAnno(stato.registro, annoCorrente()?.id ?? null),
  )
  if (lezioni.some((lezione) => lezione.data === stato.adessoData))
    return stato.adessoData
  return (
    lezioni
      .map((lezione) => lezione.data)
      .filter((data) => data > stato.adessoData)
      .sort()[0] ?? stato.adessoData
  )
}

/** La data della prossima giornata con lezioni nel periodo scelto (strettamente dopo oggi). */
export function dataProssimaGiornataDashboard (): Iso | null {
  const lezioni = nelSemestreScelto(
    lezioniDellAnno(stato.registro, annoCorrente()?.id ?? null),
  )
  const future = lezioni
    .map((lezione) => lezione.data)
    .filter((data) => data > stato.adessoData)
    .sort()
  return future[0] ?? null
}

/** Le ore di oggi per la Dashboard, senza filtri nascosti di corso. */
export function oreDiOggiDashboard (): Array<{
  lezione: Lezione;
  fase: FaseOra;
}> {
  return derivato(
    'oreDiOggiDashboard',
    [stato.semestreId, stato.adessoData, stato.adessoOra].join('|'),
    () => {
      const indice = indiceDiagnosi(stato.registro)
      return lezioniDellAnno(stato.registro, annoCorrente()?.id ?? null)
        .filter((lezione) => lezione.data === stato.adessoData)
        .sort(confrontaLezioni)
        .map((lezione) => ({
          lezione,
          fase: faseDellOra(
            stato.registro,
            lezione,
            stato.adessoData,
            stato.adessoOra,
            indice,
          ),
        }))
    },
  )
}

/** Le ore della prossima giornata per la Dashboard. */
export function oreDellaProssimaGiornataDashboard (): Array<{
  lezione: Lezione;
  fase: FaseOra;
}> {
  const giorno = dataProssimaGiornataDashboard()
  if (!giorno) return []
  return derivato(
    'oreDellaProssimaGiornataDashboard',
    [stato.semestreId, giorno, stato.adessoData, stato.adessoOra].join('|'),
    () => {
      const indice = indiceDiagnosi(stato.registro)
      return lezioniDellAnno(stato.registro, annoCorrente()?.id ?? null)
        .filter((lezione) => lezione.data === giorno)
        .sort(confrontaLezioni)
        .map((lezione) => ({
          lezione,
          fase: faseDellOra(
            stato.registro,
            lezione,
            stato.adessoData,
            stato.adessoOra,
            indice,
          ),
        }))
    },
  )
}

/** Le ore della giornata rappresentata dalla Dashboard, senza filtri nascosti. */
function oreDellaDashboard (): Array<{
  lezione: Lezione;
  fase: FaseOra;
}> {
  const giorno = giornoDellaDashboard()
  return derivato(
    'oreDellaDashboard',
    [stato.semestreId, giorno, stato.adessoData, stato.adessoOra].join('|'),
    () => {
      const indice = indiceDiagnosi(stato.registro)
      return lezioniDellAnno(stato.registro, annoCorrente()?.id ?? null)
        .filter((lezione) => lezione.data === giorno)
        .sort(confrontaLezioni)
        .map((lezione) => ({
          lezione,
          fase: faseDellOra(
            stato.registro,
            lezione,
            stato.adessoData,
            stato.adessoOra,
            indice,
          ),
        }))
    },
  )
}
void oreDellaDashboard

interface StatisticheDashboard {
  lezioniTotali: number;
  lezioniSvolte: number;
  lezioniFuture: number;
  lezioniAnnullate: number;
  percentualeSvolte: number;
  lezioniCoperte: number;
  percentualeCoperte: number;
  tassoPresenzaMedio: number | null;
  valutazioniTotali: number;
  valutazioniSvolte: number;
  valutazioniFuture: number;
}

/** Statistiche didattiche del periodo scelto per la Dashboard. */
export function statisticheDashboard (): StatisticheDashboard {
  return derivato(
    'statisticheDashboard',
    [stato.semestreId, stato.adessoData, stato.adessoOra].join('|'),
    () => {
      const lezioni = nelSemestreScelto(
        lezioniDellAnno(stato.registro, annoCorrente()?.id ?? null),
      )
      const indice = indiceDiagnosi(stato.registro)
      let svolte = 0
      let annullate = 0
      let future = 0
      let coperte = 0
      let presentiTot = 0
      let udAppelloTot = 0

      for (const l of lezioni) {
        if (l.stato === 'annullata') {
          annullate++
          continue
        }
        const fase = faseDellOra(stato.registro, l, stato.adessoData, stato.adessoOra, indice)
        if (fase === 'svolta' || l.stato === 'svolta') {
          svolte++
        } else if (fase === 'futura' || fase === 'da-preparare') {
          future++
        }

        if (oraCoperta(stato.registro, l, indice)) {
          coperte++
        }

        const rep = riepilogaPresenze(l.presenze)
        if (rep.udTotali > 0) {
          udAppelloTot += rep.udTotali
          presentiTot += rep.presenti
        }
      }

      const attive = lezioni.length - annullate
      const percSvolte = attive > 0 ? Math.round((svolte / attive) * 100) : 0
      const percCoperte = attive > 0 ? Math.round((coperte / attive) * 100) : 0
      const tassoPresenza = udAppelloTot > 0 ? Math.round((presentiTot / udAppelloTot) * 100) : null

      const corsi = new Set(corsiDellAnnoAperto().map((c) => c.id))
      const valutazioni = nelSemestreScelto(stato.registro.valutazioni)
        .filter((v) => corsi.has(v.corsoId))
      const valPassate = valutazioni.filter((v) => v.data < stato.adessoData).length
      const valFuture = valutazioni.filter((v) => v.data >= stato.adessoData).length

      return {
        lezioniTotali: lezioni.length,
        lezioniSvolte: svolte,
        lezioniFuture: future,
        lezioniAnnullate: annullate,
        percentualeSvolte: percSvolte,
        lezioniCoperte: coperte,
        percentualeCoperte: percCoperte,
        tassoPresenzaMedio: tassoPresenza,
        valutazioniTotali: valutazioni.length,
        valutazioniSvolte: valPassate,
        valutazioniFuture: valFuture,
      }
    },
  )
}

/** Buchi della Dashboard nel periodo scelto, senza il filtro corso del calendario. */
export function oreDaChiudereDashboard (): Lezione[] {
  return derivato(
    'oreDaChiudereDashboard',
    [stato.semestreId, stato.adessoData, stato.adessoOra].join('|'),
    () =>
      raggruppaOre(
        stato.registro,
        nelSemestreScelto(
          lezioniDellAnno(stato.registro, annoCorrente()?.id ?? null),
        ),
        stato.adessoData,
        stato.adessoOra,
        indiceDiagnosi(stato.registro),
      ).daChiudere,
  )
}

/** Prima ora operativa della Dashboard, nello stesso insieme contato dalla tessera. */
export function oraDaFareDashboard (): ReturnType<typeof oraDaCompilare> {
  return derivato(
    'oraDaFareDashboard',
    [stato.semestreId, stato.adessoData, stato.adessoOra].join('|'),
    () =>
      oraDaCompilare(
        stato.registro,
        nelSemestreScelto(
          lezioniDellAnno(stato.registro, annoCorrente()?.id ?? null),
        ),
        stato.adessoData,
        stato.adessoOra,
      ),
  )
}

/** Compleanni della Dashboard: tutte le classi, perché non mostra un filtro corso. */
export function compleanniDellaDashboard (data: Iso): Compleanno[] {
  return compleanniDelRegistro(
    stato.registro,
    annoCorrente()?.id ?? null,
    data,
    null,
  )
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
