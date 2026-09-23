// Lo stato dell'interfaccia: che cosa si sta guardando.
//
// Due strati distinti, e conviene tenerli distinti: `registro` è la copia dei
// dati che arriva dall'host e non si modifica mai da qui — si manda un'azione e
// si aspetta la copia nuova; tutto il resto (vista aperta, giorno mostrato,
// selezioni, filtri) viene ricordato nelle preferenze locali.
//
// Quel che vale la pena ritrovare riaprendo il pannello viene però ricordato da
// il preload: la vista, il giorno, la classe scelta.

import { nomeTipoAttivita } from '../domain/activities.js'
import { daRicordare, partiValide, type PartiContesto } from './assistant/parts.js'
import type { MessaggioStato } from '../protocol.js'
import { minutiDiAttivita } from '../domain/calculations.js'
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
import { MINUTI_UD, adesso, formattaData, oggi, semestreDi } from '../domain/dates.js'
import { registroVuoto } from '../domain/factories.js'
import { annoInUso } from '../domain/years.js'
import {
  PROIEZIONE_PREDEFINITA,
  type ImpostazioniProiezione,
  type MiraProiezione,
} from '../domain/projection.js'
import type { Vista } from '../protocol.js'
import { leggiStatoPersistito, scriviStatoPersistito } from './bridge.js'
import { confrontaNomi } from '../domain/text.js'

/** L'elenco delle sezioni sta nel protocollo: lo legge anche l'host. */
export type { Vista } from '../protocol.js'

/**
 * Le viste, in fila, per convalidare quella che il pannello si ricorda.
 *
 * Scritto a mano e non derivato: `Vista` è un'unione di tipi, e a tempo di
 * esecuzione di un'unione non resta niente. Il compilatore però non lascia
 * scrivere qui un nome che non sia una vista, e una vista aggiunta senza
 * aggiungerla qui si riapre sul calendario invece che su una pagina bianca —
 * che è il male minore fra i due.
 */
const VISTE: Vista[] = [
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
 * Di chi si guardano le consegne nella pagina delle pendenze.
 *
 * Sta qui e non nella vista che le elenca perché la legge anche `commands.ts`:
 * i tre modi sono comandi della pagina, nella riga delle azioni, e non un
 * selettore nella testata.
 */
export type FiltroTodo = 'tutte' | 'mie' | 'classi'

const FILTRI_TODO: FiltroTodo[] = ['tutte', 'mie', 'classi']

/** Di chi sono le consegne dentro la scheda di una classe sola. */
type FiltroTodoClasse = 'mie' | 'tutte'

const FILTRI_TODO_CLASSE: FiltroTodoClasse[] = ['mie', 'tutte']

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
 * Le tre schede di una lezione.
 *
 * Aprendo un'ora si fa quasi sempre una cosa sola, e sono tre mestieri
 * diversi: l'amministrazione — chi c'è, che cosa si è ritirato — si fa mentre
 * la classe entra; la lezione — piano, svolgimento, voti — durante e dopo; le
 * annotazioni quando c'è qualcosa da segnare su qualcuno. Tenerli tutti aperti
 * insieme voleva dire scorrere per arrivare all'appello.
 */
export type SchedaLezione = 'amministrazione' | 'lezione' | 'annotazioni'

const SCHEDE_LEZIONE: SchedaLezione[] = ['amministrazione', 'lezione', 'annotazioni']

/**
 * Le tre schede della scheda di una persona in formazione.
 *
 * Sono tre domande diverse, e chi apre la scheda ne ha in mente una sola.
 * **Anagrafica**: chi è, come la si raggiunge, dove sta — è quel che si guarda
 * con il telefono in mano. **Docente di classe**: che cosa c'è da riscuotere,
 * da far firmare, che cosa è stato annotato — il lavoro che si fa a tavolino,
 * per venticinque persone di fila. **Materie**: come va, ore e voti — la
 * domanda del colloquio.
 *
 * Impilate tutte e tre sulla stessa pagina, per arrivare ai voti si scorreva
 * la mappa: tre schermate di roba giusta, nessuna delle quali era quella che
 * si stava cercando.
 */
export type SchedaPersona = 'anagrafica' | 'docenteClasse' | 'materie'

const SCHEDE_PERSONA: SchedaPersona[] = ['anagrafica', 'docenteClasse', 'materie']

/**
 * Le quattro schede del docente di classe.
 *
 * Sono quattro mestieri con quattro ritmi: il todo si guarda ogni mattina, i
 * documenti si riscuotono per settimane, le assenze si chiudono a fine
 * periodo, i messaggi si scrivono quando succede qualcosa. Tenerli impilati
 * sulla stessa pagina voleva dire scorrere tre schede per arrivare alla quarta,
 * e la prima cosa che si vede — il todo — è anche l'unica che si guarda tutti
 * i giorni.
 */
export type SchedaDocente = 'todo' | 'documenti' | 'assenze' | 'messaggistica'

const SCHEDE_DOCENTE: SchedaDocente[] = ['todo', 'documenti', 'assenze', 'messaggistica']

/**
 * Le tre schede della pagina Documenti: del corso, delle ore, di chi lo segue.
 *
 * Sono tre consegne diverse. Quel che è **del corso** — presenze, griglia dei
 * voti, prove, piani — si guarda per materia e finisce in segreteria o in un
 * fascicolo: pochi fogli, e li si vuole tutti. **Lezioni** è un riquadro per
 * ogni ora, con il suo verbale, il suo piano e le prove di quel giorno: il
 * pacchetto che si mette insieme dopo aver chiuso un'ora, o quando qualcuno
 * chiede conto di quel giorno. Quel che è **degli allievi** è una scheda a
 * testa, venticinque righe di cui a volte serve una: quella della persona che è
 * nella stanza. Impilate sulla stessa pagina, per arrivare ai verbali bisognava
 * scorrere la classe intera.
 */
export type SchedaDocumenti = 'corso' | 'lezioni' | 'allievi'

/** I valori ammessi: serve a convalidare quel che il pannello si ricorda. */
const SCHEDE_DOCUMENTI: SchedaDocumenti[] = ['corso', 'lezioni', 'allievi']

/**
 * Che cosa guarda la mappa: tutti gli indirizzi, solo le aziende, solo le case.
 *
 * Una scheda sola comanda **l'elenco e i segnaposti insieme**. Prima erano due
 * cose da tenere d'accordo — le schede della colonna e tre spunte in testata —
 * e nessuna delle due combinazioni sbagliate era ovvia: l'elenco delle aziende
 * con le case accese sulla carta, o la carta piena e la lista di una cosa sola.
 * Un comando, uno stato: quel che si legge a sinistra è quel che si vede a
 * destra.
 *
 * La sede resta accesa in tutte e tre: è il punto rispetto a cui si leggono le
 * distanze, non uno dei posti di cui si sta parlando.
 */
export type SchedaMappa = 'tutti' | 'lavoro' | 'domicilio'

const SCHEDE_MAPPA: SchedaMappa[] = ['tutti', 'lavoro', 'domicilio']

/**
 * Di chi sono le impostazioni che si stanno guardando.
 *
 * È la distinzione che la pagina deve rendere impossibile da sbagliare: quel
 * che sta nel **documento** viaggia con il `.registro` — chi lo apre su un'altra
 * macchina trova la stessa griglia oraria e la stessa scala dei voti — mentre
 * quel che è del **programma** resta su questa macchina e vale per tutti gli
 * anni. Mescolate in un elenco solo, nessuno può sapere quale delle due sta
 * cambiando finché non se ne accorge da un'altra parte.
 */
type AmbitoImpostazioni = 'programma' | 'documento'

const AMBITI_IMPOSTAZIONI: AmbitoImpostazioni[] = ['programma', 'documento']

/** Le sezioni delle impostazioni del programma, nell'ordine in cui si aprono. */
export type SchedaProgramma =
  | 'aspetto'
  | 'agenda'
  | 'avvisi'
  | 'posta'
  | 'recapiti'
  | 'modelli'
  | 'lettura'
  | 'assistente'
  | 'dettatura'
  | 'condotto'
  | 'file'

const SCHEDE_PROGRAMMA: SchedaProgramma[] = [
  'aspetto',
  'agenda',
  'avvisi',
  'posta',
  'recapiti',
  'modelli',
  'lettura',
  'assistente',
  'dettatura',
  'condotto',
  'file',
]

/** Le sezioni delle impostazioni del documento d'anno. */
export type SchedaDocumento =
  | 'anno'
  | 'calendario'
  | 'valutazione'
  | 'materie'
  | 'liste'
  | 'file'

const SCHEDE_DOCUMENTO: SchedaDocumento[] = [
  'anno',
  'calendario',
  'valutazione',
  'materie',
  'liste',
  'file',
]

/** Il valore ricordato, se è ancora uno di quelli che esistono. */
function convalidata<T extends string> (ammessi: T[], ricordata: unknown, ripiego: T): T {
  return ammessi.includes(ricordata as T) ? (ricordata as T) : ripiego
}

/**
 * Le misure fra cui scorre lo zoom delle pagine nello sfoglio, in pixel.
 *
 * Sei scalini e non un numero libero: lo zoom serve a passare da «quante ne
 * vedo» a «che cosa c'è scritto», e fra un passo e l'altro c'è differenza
 * abbastanza da vedersi. L'ultimo è mezza colonna: da lì in poi si legge il
 * foglio intero, e per quello c'è il lettore.
 */
export const MISURE_SFOGLIO = [130, 170, 230, 310, 420, 560]

/** Quanto grandi partono: si vede il colpo d'occhio e si legge il nome in testa. */
export const ZOOM_PREDEFINITO = 230

interface StatoUI {
  sidebarDesktop: boolean
  sidebarMobile: boolean
  /**
   * Se il riquadro dell'assistente è aperto a destra.
   *
   * Sta nello stato e si ricorda, come la sidebar: chi conversa mentre lavora
   * lo tiene aperto per l'ora intera, e ritrovarlo chiuso a ogni ricostruzione
   * della pagina — un cambio di tema, la finestra riaperta — vorrebbe dire
   * riaprirlo di continuo. Quel che **non** si ricorda è la conversazione:
   * vedi `ui/assistant.ts`, dove sta il perché.
   */
  assistenteAperto: boolean
  /**
   * Che cosa si dice all'assistente di dove si sta guardando, parte per parte.
   *
   * Tutto acceso di principio: una domanda in italiano dà per scontato il
   * contesto in cui è fatta, e senza dirglielo il modello sceglie un corso
   * plausibile e risponde su quello. Ma ogni parte si spegne per conto suo —
   * i filtri per una domanda generale, gli id e l'elenco a schermo quando la
   * classe è davanti allo schermo — e le ragioni non si chiudono in un
   * interruttore solo: vedi `assistant/parts.ts`.
   *
   * Si ricorda: chi le spegne le spegne per come lavora, non per una domanda.
   */
  contestoAssistente: PartiContesto

  registro: Registro
  avvisi: string[]
  caricato: boolean
  /**
   * La cartella dei dati come la vede il webview. Dentro la sandbox un percorso
   * di disco non si carica: per mostrare l'immagine di una risorsa ci vuole
   * l'indirizzo `registro://` concesso a quella cartella, e lo manda il pannello.
   */
  radiceDati: string | null
  /** La radice dei file dell'applicazione: la usa chi disegna le pagine dei PDF. */
  radiceApp: string | null
  documenti: MessaggioStato['documenti']
  /**
   * I documenti che stanno nella cartella delle esportazioni.
   *
   * Non è un dato del registro: è quel che c'è su disco adesso, e il webview non
   * lo può guardare da sé. Serve alla pagina Documenti per dire «c'è» o «da
   * fare» accanto a ogni foglio, invece di offrire solo di rifarli tutti.
   */
  esportati: MessaggioStato['esportati']
  /** Che cosa c'è sotto `archivio/`: i documenti raccolti dalla classe. */
  archiviati: MessaggioStato['archiviati']
  /**
   * I fascicoli composti dell'anno: quel che la pagina Documenti elenca nel
   * riquadro «Fascicoli», con il loro PDF accanto.
   */
  composizioni: MessaggioStato['composizioni']
  /**
   * Che cosa c'è in `templates/`: i modelli dei rapporti, la firma delle
   * e-mail, le immagini che i modelli mostrano.
   *
   * Sono nomi e misure, senza il testo dentro: il testo di un modello si
   * chiede aprendolo, ed è la pagina Modelli a tenerselo mentre lo si scrive.
   */
  modelli: MessaggioStato['modelli']
  /** Il modello aperto nella pagina Modelli: il nome, non il file. */
  modelloScelto: string | null
  /** Se la lettura automatica delle scansioni è accesa nelle impostazioni. */
  ocrAttivo: boolean
  /**
   * Le impostazioni del programma — quelle di `impostazioni.json`, non quelle
   * dentro il documento d'anno.
   *
   * Arrivano dal pannello con lo stato: il webview vive in una sandbox e il
   * file non lo vede. Le mostra la pagina Impostazioni, sotto la scheda
   * «Programma», accanto a quelle che viaggiano con il `.registro`.
   */
  programma: MessaggioStato['programma']
  /**
   * Com'è messa la posta: dove si è, se il registro può spedire da sé, da che
   * indirizzo. Arriva dal pannello — sono impostazioni dell'applicazione, e il webview
   * non le legge da sé.
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
  /**
   * A che punto è la lettura delle scansioni. Non sta nel registro perché non è
   * un dato del registro: è quel che la macchina sta facendo adesso, e sparisce
   * chiudendo la finestra.
   */
  lavoro: StatoLavoro
  /**
   * Se il computer è in rete.
   *
   * Non è un dato del registro e non arriva dal pannello: lo sa il browser, e
   * lo dice cambiando. Serve alla barra di stato, e serve *prima* di premere
   * «spedisci»: senza rete la posta non esce, e scoprirlo a metà di un giro di
   * venticinque comunicazioni è il modo peggiore di saperlo.
   */
  rete: boolean
  vista: Vista
  paginaId: string | null
  /**
   * Se la riga delle azioni è nascosta.
   *
   * Si ricorda: chi lavora su un portatile piccolo la chiude una volta e
   * riprende i suoi settanta pixel per sempre. I comandi restano raggiungibili
   * dalla palette e dal menu, e la riga si riapre con lo stesso interruttore o
   * con Ctrl+B.
   */
  azioniNascoste: boolean
  /**
   * Di chi sono i comandi che la riga delle azioni sta mostrando.
   *
   * Quasi sempre `'pagina'`: quel che si può fare qui. A schermo acceso compare
   * nella barra una scheda in più — «Proiezione» — e premendola la riga passa
   * ai comandi dello schermo per la classe, che non sono di nessuna pagina.
   *
   * Non si ricorda fra una sessione e l'altra, ed è voluto: è dove si stava
   * guardando un minuto fa, non una preferenza. Si mette da sé a `'schermo'`
   * quando lo schermo si accende — chi ha appena premuto «Proietta» vuole
   * scegliere che cosa mostrare — e torna a `'pagina'` spegnendolo o andando in
   * un'altra pagina.
   */
  schedaComandi: 'pagina' | 'schermo'
  /** Quale scheda della lezione si sta guardando. */
  schedaLezione: SchedaLezione
  schedaPersona: SchedaPersona
  /** Quale scheda del docente di classe si sta guardando. */
  schedaDocente: SchedaDocente
  /** Quale scheda della pagina Documenti si sta guardando. */
  schedaDocumenti: SchedaDocumenti
  /** Di chi sono le impostazioni aperte: del programma o del documento. */
  ambitoImpostazioni: AmbitoImpostazioni
  /** Quale sezione delle impostazioni del programma. */
  schedaProgramma: SchedaProgramma
  /** Quale sezione delle impostazioni del documento. */
  schedaDocumento: SchedaDocumento
  /**
   * Il documento esportato che si sta guardando nell'anteprima, o `null`.
   *
   * È un percorso sotto `esportazioni/`, e vive solo qui: è dove si sta
   * guardando adesso, non una preferenza da ritrovare alla riapertura. Si
   * svuota da sé quando il file non c'è più — lo si è buttato via, o l'anno è
   * cambiato — perché una cornice che mostra un file che non esiste è peggio di
   * una cornice vuota.
   */
  anteprima: string | null
  /**
   * Il documento raccolto che si sta guardando nell'archivio documentale.
   *
   * È un percorso sotto `archivio/`, e sta a parte da `anteprima` apposta: sono
   * due pagine con due elenchi diversi — là i fogli che il registro stampa, qui
   * quelli che la classe porta — e una cornice sola in comune farebbe sparire
   * il documento aperto di una ogni volta che si apre qualcosa nell'altra.
   * Vive solo qui: è dove si sta guardando adesso, non una preferenza.
   */
  anteprimaArchivio: string | null
  /**
   * Il foglio di assenze che si sta guardando nella pagina delle assenze.
   *
   * Sta a parte da `anteprimaArchivio` per la stessa ragione per cui quello sta
   * a parte da `anteprima`: sono due matrici diverse — là i documenti che la
   * classe porta, qui i rapporti che l'azienda firma — e una cornice sola in
   * comune farebbe sparire il foglio aperto di una ogni volta che si apre
   * qualcosa nell'altra. È un percorso sotto `archivio/`, e vive solo qui: è
   * dove si sta guardando adesso, non una preferenza.
   */
  anteprimaAssenze: string | null
  /**
   * Le pagine scelte nello sfoglio del PDF da dividere, e di quale PDF sono.
   *
   * Sono la cosa che si sta per trascinare: chi smista guarda le pagine, ne
   * prende tre, e le lascia cadere sulla casella di chi sono. Stanno nello
   * stato e non dentro l'elemento perché il pannello ridisegna la vista a ogni
   * battito dell'orologio, e una scelta fatta con il mouse non può svanire
   * mentre si punta la casella.
   *
   * Insieme alle pagine c'è lo smistamento da cui vengono: senza, cambiando PDF
   * resterebbero scelte le pagine «2 e 5» di un documento che non si sta più
   * guardando, ed è un modo di archiviare le pagine sbagliate.
   */
  pagineScelte: { smistamentoId: string, pagine: number[] } | null
  /**
   * Come si guarda un PDF ancora da dividere: le sue pagine, o il lettore.
   *
   * Le pagine sono la vista di chi deve smistare — si vedono tutte insieme, si
   * scelgono, si trascinano — e il lettore è quella di chi deve *leggere*: un
   * documento fitto, una firma da controllare, il testo da cercare. Due
   * mestieri diversi sullo stesso file, e nessuno dei due sostituisce l'altro.
   */
  sfoglioArchivio: 'pagine' | 'lettore'
  /**
   * Quanto sono grandi le pagine nello sfoglio, in pixel di larghezza.
   *
   * È una preferenza e si ricorda: chi smista scansioni fitte le vuole grandi
   * — il nome in testa a un modulo si legge o non si legge — e chi divide
   * pagelle a colpo d'occhio ne vuole venti sullo schermo. Ricominciare ogni
   * volta dalla misura media vorrebbe dire rifare quella scelta tutti i giorni.
   */
  zoomSfoglio: number
  /**
   * Se nello sfoglio si vedono anche le pagine già archiviate.
   *
   * Di norma no: una pagina finita nel fascicolo di qualcuno non è più lavoro
   * da fare, e lasciarla in mezzo alle altre vuol dire cercare ogni volta quali
   * restano. Ma sparire del tutto sarebbe peggio — è lì che si scopre di aver
   * lasciato cadere una pagina sulla riga sbagliata — e quindi c'è
   * l'interruttore, e da lì le si riprende.
   */
  mostraArchiviate: boolean
  /**
   * I documenti spuntati nella pagina Documenti: percorsi sotto
   * `esportazioni/`.
   *
   * Servono a quel che si fa a più fogli insieme, che per ora è una cosa sola —
   * combinarli in un fascicolo — ed è il gesto di chi consegna: una cartella di
   * venticinque schede si controlla scorrendola di seguito, non aprendo
   * venticinque file.
   *
   * Attraversa le tre schede della pagina, apposta: un fascicolo può mettere
   * insieme il verbale di un'ora e la scheda di una persona, e il conto degli
   * scelti si legge nella riga delle azioni anche quando le loro righe non sono
   * in vista. Si svuota cambiando corso o periodo, dove non vorrebbero più dire
   * niente.
   */
  documentiScelti: string[]
  modoCalendario: ModoCalendario
  /** Giorno di riferimento del calendario: la settimana o il mese che lo contiene. */
  data: Iso
  /**
   * Il momento presente, aggiornato ogni minuto.
   *
   * Sta nello stato e non si legge dall'orologio dentro le viste per un motivo
   * solo: così un ridisegno è quel che fa scattare il passaggio di un'ora da «in
   * corso» a «finita». Leggendo `new Date()` dove serve, la vista resterebbe
   * ferma a com'era quando è stata disegnata, e a mezzogiorno direbbe ancora che
   * la lezione delle otto sta cominciando.
   */
  adessoData: Iso
  adessoOra: Ora
  lezioneId: string | null
  classeId: string | null
  /** L'allievo di cui si guarda la scheda; vive dentro `classeId`. */
  allievoId: string | null
  /**
   * Le classi aperte nell'elenco delle persone in formazione.
   *
   * Chiuse di principio: chi insegna in cinque classi ne guarda una per volta,
   * e centoventi nomi in colonna sono un elenco che si scorre, non uno che si
   * legge. Si ricorda quali si sono aperte, perché chi apre sempre la stessa
   * classe non deve riaprirla a ogni avvio.
   */
  classiApertePersone: string[]
  /**
   * Il corso su cui sono puntate le pagine di corso.
   *
   * Non e' piu' solo la vista Corsi: registro, piani, valutazioni e documenti
   * mostrano un corso alla volta, e la barra laterale li elenca sotto il corso
   * a cui appartengono. Uno solo, perche' passando da una pagina all'altra si
   * sta ancora lavorando sulla stessa materia a quella classe.
   */
  corsoId: string | null
  pianoId: string | null
  valutazioneId: string | null
  /** Filtro per classe delle pagine di corso: piani, valutazioni, registro. */
  filtroClasseId: string | null
  filtroCorsoAgendaId: string | null
  /**
   * Il semestre di cui si stanno guardando i conti, o `null` per l'anno intero.
   *
   * Non è un filtro come gli altri: è la scansione su cui la scuola ragiona. Una
   * media che mescola i due semestri non è la media di niente — la pagella ne
   * chiede una per semestre — e «dodici assenze» detto senza dire di quale metà
   * è un numero che non si può usare. Il registro parte sul semestre in cui cade
   * oggi, che è quasi sempre quello che si vuole.
   */
  semestreId: string | null
  /** Di chi si guardano le consegne nella pagina delle pendenze. */
  filtroTodo: FiltroTodo
  /**
   * Su quale classe è aperta la scheda delle pendenze, o `null` per tutte.
   *
   * Le pendenze si organizzano per classe perché è così che si lavora: si entra
   * in un'aula, non in un corso, e ci si porta dentro tutti e quattro i mestieri
   * insieme. Con sei classi l'elenco di prima era lungo una pagina e mezza, e
   * per arrivare alla terza bisognava scorrere le altre due.
   *
   * Una classe che non ha più niente in sospeso non tiene la scheda aperta:
   * `null` vuol dire tutte, ed è dove si torna quando quella scelta si svuota.
   */
  classeTodoId: string | null
  /** Quale dei tre elenchi è aperto nella colonna della mappa. */
  schedaMappa: SchedaMappa
  /**
   * Lo stesso filtro nel pannello del docente di classe, e tenuto a parte: non
   * deve cambiare perché nella pagina delle pendenze si stava guardando
   * dell'altro.
   *
   * Si parte da **tutte le consegne**. Entrando nella scheda di una classe la
   * domanda è «come sta questa classe», e una lista che di suo mostra solo le
   * proprie consegne risponde a metà — nasconde proprio quel che la classe deve
   * portare, che è la parte che si sollecita. Le proprie si isolano con un
   * clic, quando serve la lista della sera prima.
   */
  filtroTodoClasse: 'mie' | 'tutte'
  /**
   * Il periodo di assenze aperto nel pannello del docente di classe.
   *
   * Uno per volta: la matrice di un periodo è larga cinque colonne per
   * venticinque nomi, e tenerne aperti due vorrebbe dire una pagina in cui non
   * si trova più niente. Non si ricorda alla riapertura — il periodo su cui si
   * lavora è quello di adesso, e lo si sceglie in un clic.
   */
  bloccoAssenzeId: string | null
  ricerca: string
  /**
   * Com'è messo lo schermo per la classe.
   *
   * Non lo decide il webview: lo racconta l'host, che è l'unico a sapere se
   * quella finestra esiste ancora — la si può chiudere dalla sua scheda, e il
   * pannello se ne accorgerebbe solo provando a spingerci dentro qualcosa.
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
  filtroTodoClasse: 'mie' | 'tutte'
  bloccoAssenzeId: string | null
  ricerca: string
  sidebarDesktop: boolean
  sidebarMobile: boolean
  assistenteAperto: boolean
  /**
   * Le parti del contesto dell'assistente, con accanto il segno della forma in
   * cui sono state scritte: vedi `daRicordare` in `assistant/parts.ts`.
   */
  contestoAssistente: PartiContesto & { v?: number }
  documentiScelti: string[]

  vista: Vista
  paginaId: string | null
  /** Se la riga delle azioni era nascosta. */
  azioniNascoste: boolean
  schedaLezione: SchedaLezione
  schedaPersona: SchedaPersona
  schedaDocente: SchedaDocente
  schedaDocumenti: SchedaDocumenti
  ambitoImpostazioni: AmbitoImpostazioni
  schedaProgramma: SchedaProgramma
  schedaDocumento: SchedaDocumento
  modoCalendario: ModoCalendario
  data: Iso
  /** L'ora aperta nel registro: riaprendo il pannello si torna dov'eravamo. */
  lezioneId: string | null
  classeId: string | null
  /** Il corso su cui erano puntate le pagine di corso. */
  corsoId: string | null
  filtroClasseId: string | null
  filtroCorsoAgendaId: string | null
  semestreId: string | null
  filtroTodo: FiltroTodo
  classeTodoId: string | null
  schedaMappa: SchedaMappa
  /** Il modello che si stava modificando: si riapre su quello. */
  modelloScelto: string | null
}

const persistito = leggiStatoPersistito<StatoPersistito>()

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
  documenti: { corrente: null, elenco: [] },
  esportati: [],
  archiviati: [],
  composizioni: [],
  modelli: [],
  modelloScelto: persistito?.modelloScelto ?? null,
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
  // `navigator.onLine` dice solo se c'è una scheda di rete attaccata a
  // qualcosa, non se Internet risponde: è un «no» affidabile e un «sì»
  // ottimista. Va bene così — quel che serve è non far partire un giro di
  // comunicazioni con il cavo staccato.
  rete: navigator.onLine,
  // Tutto quel che si ricorda e ha un elenco chiuso di valori passa da
  // `convalidata`: un valore scritto da una versione di prima — una vista
  // rinominata, una scheda tolta — riaprirebbe il pannello su una pagina che
  // non c'è, cioè su niente. Sei di questi campi ne erano rimasti fuori, e il
  // commento di `allineaSemestre` diceva il contrario: è lo stesso guasto del
  // `semestreId`, moltiplicato per sei.
  vista: convalidata(VISTE, persistito?.vista, 'calendario'),
  paginaId: persistito?.paginaId ?? null,
  azioniNascoste: persistito?.azioniNascoste ?? false,
  schedaComandi: 'pagina',
  schedaLezione: convalidata(SCHEDE_LEZIONE, persistito?.schedaLezione, 'amministrazione'),
  schedaPersona: convalidata(SCHEDE_PERSONA, persistito?.schedaPersona, 'anagrafica'),
  schedaDocente: convalidata(SCHEDE_DOCENTE, persistito?.schedaDocente, 'todo'),
  // La scheda ricordata si convalida: un valore di una versione di prima —
  // c'era `'lezione'` finché l'ora era una sola — lascerebbe la pagina su una
  // scheda che non esiste, cioè vuota.
  schedaDocumenti: convalidata(SCHEDE_DOCUMENTI, persistito?.schedaDocumenti, 'corso'),
  // Si riapre dov'era, convalidata: una sezione di una versione di prima
  // lascerebbe la pagina su una scheda che non esiste, cioè vuota.
  ambitoImpostazioni: convalidata(AMBITI_IMPOSTAZIONI, persistito?.ambitoImpostazioni, 'documento'),
  schedaProgramma: convalidata(SCHEDE_PROGRAMMA, persistito?.schedaProgramma, 'aspetto'),
  schedaDocumento: convalidata(SCHEDE_DOCUMENTO, persistito?.schedaDocumento, 'anno'),
  anteprima: null,
  anteprimaArchivio: null,
  anteprimaAssenze: null,
  pagineScelte: null,
  sfoglioArchivio: 'pagine',
  zoomSfoglio: persistito?.zoomSfoglio ?? ZOOM_PREDEFINITO,
  mostraArchiviate: false,
  documentiScelti: persistito?.documentiScelti ?? [],
  modoCalendario: convalidata(MODI_CALENDARIO, persistito?.modoCalendario, 'settimana'),
  data: persistito?.data ?? oggi(),
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
  filtroCorsoAgendaId: persistito?.filtroCorsoAgendaId ?? null,
  // `undefined` vuol dire «mai scelto»: si parte dal semestre di oggi, ma solo
  // quando il registro sarà arrivato — a questo punto è ancora vuoto, e vale
  // come «anno intero» finché `allineaSemestre` non fa la scelta vera. `null`
  // è invece una scelta fatta, e vuol dire l'anno intero per sempre.
  semestreId: persistito?.semestreId === undefined ? null : persistito.semestreId,
  filtroTodo: convalidata(FILTRI_TODO, persistito?.filtroTodo, 'tutte'),
  classeTodoId: persistito?.classeTodoId ?? null,
  schedaMappa: convalidata(SCHEDE_MAPPA, persistito?.schedaMappa, 'tutti'),
  filtroTodoClasse: convalidata(FILTRI_TODO_CLASSE, persistito?.filtroTodoClasse, 'tutte'),
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
 * Se il semestre va ancora portato su quello di oggi.
 *
 * Sta qui, prima di `aggiorna`, perché è lui a spegnerlo: una scelta esplicita
 * vince sull'allineamento, e una variabile letta prima di essere dichiarata
 * sarebbe un errore in faccia al primo aggiornamento.
 */
let semestreDaAllineare = persistito?.semestreId === undefined

/**
 * Se una modifica sposta il contesto da cui l'anteprima dipende.
 *
 * Il documento aperto nella cornice è di un corso e di un periodo: cambiando
 * l'uno o l'altro resterebbe lì il foglio di prima — le presenze del primo
 * semestre mentre la pagina elenca quelle del secondo — e sarebbe la peggiore
 * delle cornici, una che mostra un documento vero della cartella sbagliata.
 */
function cambiaContesto (modifiche: Partial<StatoUI>): boolean {
  return (
    (modifiche.corsoId !== undefined && modifiche.corsoId !== stato.corsoId) ||
    (modifiche.semestreId !== undefined && modifiche.semestreId !== stato.semestreId)
  )
}

/**
 * Se una modifica sposta la classe o il periodo dell'archivio documentale.
 *
 * Il foglio aperto lì è di una classe e di un periodo, come quello della
 * pagina Documenti è di un corso: cambiando classe resterebbe in cornice la
 * scansione di qualcuno di un'altra classe, che è la peggiore delle anteprime
 * — un documento vero, della persona sbagliata.
 */
function cambiaClasse (modifiche: Partial<StatoUI>): boolean {
  return (
    (modifiche.classeId !== undefined && modifiche.classeId !== stato.classeId) ||
    (modifiche.semestreId !== undefined && modifiche.semestreId !== stato.semestreId)
  )
}

/**
 * Scrive nelle preferenze locali quel che vale la pena ritrovare riaprendo.
 *
 * Sta fuori da `aggiorna` perché non tutto quel che si ricorda merita un
 * ridisegno: un gruppo che si chiude nell'elenco delle persone si ridisegna da
 * sé, e passare da `aggiorna` rifarebbe anche la scheda accanto — ritratto e
 * mappa compresi, che è proprio il prezzo che quella vista evita di pagare.
 */
export function ricorda (): void {
  scriviStatoPersistito({
    allievoId: stato.allievoId,
    classiApertePersone: stato.classiApertePersone,
    pianoId: stato.pianoId,
    valutazioneId: stato.valutazioneId,
    filtroTodoClasse: stato.filtroTodoClasse,
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
    schedaDocumenti: stato.schedaDocumenti,
    ambitoImpostazioni: stato.ambitoImpostazioni,
    schedaProgramma: stato.schedaProgramma,
    schedaDocumento: stato.schedaDocumento,
    modoCalendario: stato.modoCalendario,
    data: stato.data,
    lezioneId: stato.lezioneId,
    classeId: stato.classeId,
    corsoId: stato.corsoId,
    filtroClasseId: stato.filtroClasseId,
    filtroCorsoAgendaId: stato.filtroCorsoAgendaId,
    semestreId: stato.semestreId,
    filtroTodo: stato.filtroTodo,
    classeTodoId: stato.classeTodoId,
    schedaMappa: stato.schedaMappa,
    modelloScelto: stato.modelloScelto,
  } satisfies StatoPersistito)
}

export function aggiorna (modifiche: Partial<StatoUI>): void {
  if (modifiche.anteprimaArchivio === undefined && cambiaClasse(modifiche)) {
    modifiche = { ...modifiche, anteprimaArchivio: null }
  }
  // Il foglio delle assenze aperto è di una classe e di un periodo: cambiando
  // l'una o l'altro resterebbe in cornice il rapporto di qualcuno che nella
  // matrice davanti non c’è più. Il periodo conta quanto la classe, perché
  // le frecce scorrono i fogli *di quel* periodo.
  const cambiaPeriodo =
    modifiche.bloccoAssenzeId !== undefined && modifiche.bloccoAssenzeId !== stato.bloccoAssenzeId
  if (modifiche.anteprimaAssenze === undefined && (cambiaClasse(modifiche) || cambiaPeriodo)) {
    modifiche = { ...modifiche, anteprimaAssenze: null }
  }
  // Cambiando foglio si perde quel che si era scelto: le pagine scelte sono
  // pagine *di quel* PDF, e portarle su un altro vorrebbe dire archiviare la
  // pagina 2 di un documento guardandone un altro.
  //
  // Vale per tutte e due le cornici. Quella delle assenze era rimasta fuori, e
  // l’unica differenza è dove si guarda il PDF: le pagine scelte lì dentro
  // sono pagine di quel foglio esattamente come le altre.
  if (
    (modifiche.anteprimaArchivio !== undefined || modifiche.anteprimaAssenze !== undefined) &&
    modifiche.pagineScelte === undefined
  ) {
    modifiche = { ...modifiche, pagineScelte: null }
  }
  // L'anteprima segue il corso e il periodo, a meno che non sia proprio lei
  // quel che si sta cambiando: chi apre un documento passa di qui con il
  // percorso in mano, e non va contraddetto.
  if (modifiche.anteprima === undefined && cambiaContesto(modifiche)) {
    // Con l'anteprima se ne vanno le spunte: erano i fogli di quel corso e di
    // quel periodo, e portarsele dietro vorrebbe dire combinare documenti di
    // due classi diverse senza essersene accorti.
    modifiche = { ...modifiche, anteprima: null, documentiScelti: [] }
  }
  // Un semestre scelto per nome — da chi guarda, o da un elemento aperto
  // dall'albero — spegne l'allineamento automatico: quello mette il semestre
  // di oggi, e sovrascriverebbe la scelta appena fatta la prima volta che i
  // dati arrivano. È il caso di una prova di novembre aperta in gennaio.
  if (modifiche.semestreId !== undefined) semestreDaAllineare = false
  Object.assign(stato, modifiche)
  ricorda()
  for (const ascoltatore of ascoltatori) ascoltatore()
}

// ------------------------------------------------------------------ selezioni

// Le viste non risalgono le catene a mano: chiedono qui, e qui si passa dal
// corso. Sono involucri sottili sulle funzioni del dominio — l'unica cosa che
// aggiungono è il registro corrente, che nel webview è sempre uno solo.

export function annoCorrente () {
  // La regola sta nel dominio: era scritta qui, in `domain/reportData.ts` due
  // volte, e in due altri posti **senza** il ripiego — e quei due erano il
  // widget dell'agenda e quello delle pendenze, cioe' proprio dove la
  // divergenza si vedeva.
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
 * Le classi di cui si è docente di classe: quelle che hanno un fascicolo.
 *
 * Sta qui e non nella vista che le disegna perché la risposta serve prima che
 * la vista esista: la barra ci decide se la sezione «Docente di classe» c'è —
 * senza nemmeno una spunta è un mestiere che questo docente non fa — e la
 * tendina delle classi ci prende le sue voci.
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
 * Tutti i corsi dell'anno aperto, senza il filtro per classe.
 *
 * Serve a chi il corso lo sceglie per nome invece di scorrerne un elenco: il
 * filtro per classe è di un'altra vista — è condiviso, e resta impostato
 * passando di qua — e nascondere metà delle voci di una tendina per via di una
 * scelta fatta altrove, senza mostrarla, vuol dire far cercare un corso che
 * c'è.
 */
export function corsiDellAnnoAperto (): Corso[] {
  const anno = annoCorrente()
  return corsiDellAnno(stato.registro, anno?.id ?? null).sort((a, b) =>
    confrontaNomi(a.titolo, b.titolo),
  )
}

/**
 * I corsi che la barra laterale elenca: quelli dell'anno che vivono nel
 * periodo scelto.
 *
 * Un corso senza nessuna ora nel semestre scelto non ha niente da mostrare —
 * registro vuoto, nessuna prova, nessun documento da stampare — e in una barra
 * che elenca tutti i corsi sarebbe solo una riga da saltare. Quelli senza
 * nemmeno un'ora restano invece in elenco: sono i corsi appena creati, e
 * nasconderli vorrebbe dire non ritrovare quel che si e' appena fatto.
 */
export function corsiNelSemestre (): Corso[] {
  const corsi = corsiDellAnnoAperto()
  const semestre = semestreScelto()
  if (!semestre) return corsi
  return corsi.filter((corso) => {
    const lezioni = lezioniDiCorso(corso.id)
    return (
      lezioni.length === 0 ||
      lezioni.some((l) => l.data >= semestre.inizio && l.data <= semestre.fine)
    )
  })
}

/**
 * Il corso su cui sono puntate le pagine di corso.
 *
 * Le pagine ripiegano sul primo dell'elenco quando quello scelto non c'e' piu'
 * — o e' uscito dal semestre — e la barra laterale deve accendere la stessa
 * riga che la pagina sta mostrando: la regola sta scritta qui una volta sola.
 */
export function corsoAperto (): Corso | null {
  const dellAnno = corsiDellAnnoAperto()
  // Il corso scelto vince anche se le sue ore cadono tutte nell'altro
  // semestre: e' quello che le pagine mostrano, e la barra deve accendere la
  // riga che si sta guardando. Si ripiega sul primo del periodo solo quando
  // quel corso non esiste piu' — o e' di un anno che si e' chiuso.
  return dellAnno.find((c) => c.id === stato.corsoId) ?? corsiNelSemestre()[0] ?? dellAnno[0] ?? null
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
 * Le lezioni di una classe che entrano nei conti: quelle del semestre scelto.
 *
 * Il calendario non passa di qui — lì si naviga per l'anno intero e restringere
 * vorrebbe dire settimane vuote — ma tutto quel che riassume sì: quante ore
 * svolte, quante assenze, che media. Sono i numeri che vanno in pagella, e la
 * pagella è per semestre.
 */
export function lezioniDi (classeId: string) {
  return nelSemestreScelto(lezioniDellaClasse(stato.registro, classeId))
}

/** Le valutazioni di una classe: quelle di tutti i suoi corsi. */
export function valutazioniDi (classeId: string) {
  return nelSemestreScelto(valutazioniDellaClasse(stato.registro, classeId))
}

/**
 * La classe di una persona, dato il suo identificatore.
 *
 * Di solito la si sa già — ci si arriva dall'elenco di una classe — ma
 * dall'albero e dalla palette arriva soltanto la persona: in quel caso la si
 * cerca fra tutte. Sta qui e non nella vista che la disegna perché la chiede
 * anche il percorso in fondo allo schermo, che deve sapere se una linguetta
 * della scheda c'è o no.
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
  return corsoPerId(corsoId)?.titolo ?? 'senza corso'
}

// ------------------------------------------------------------------ dalla lezione

export function classeDiLezione (lezione: Lezione) {
  return classeDellaLezione(stato.registro, lezione)
}

function corsoDiLezione (lezione: Lezione) {
  return corsoDellaLezione(stato.registro, lezione)
}

export function nomeClasseDiLezione (lezione: Lezione): string {
  return classeDiLezione(lezione)?.nome ?? 'senza classe'
}

/**
 * Che materia è quest'ora.
 *
 * Vuota se il corso non c'è più: chi la mostra lascia il posto invece di
 * scrivere «senza materia», che è rumore in un elenco dove la riga accanto la
 * materia ce l'ha.
 */
export function nomeMateriaDiLezione (lezione: Lezione): string {
  return materiaDelCorso(stato.registro, corsoDiLezione(lezione))?.nome ?? ''
}

/** La stessa materia dove il posto è poco: la cella di un mese, una pastiglia. */
export function siglaMateriaDiLezione (lezione: Lezione): string {
  return siglaMateria(materiaDelCorso(stato.registro, corsoDiLezione(lezione)))
}

/**
 * Come si chiama un piano: il corso e il numero dell'ora per cui è fatto.
 *
 * Passa da `nomeDelPiano`, che è la stessa funzione che usano l'albero e i
 * comandi: il numero dell'ora riparte a ogni semestre, e ricomporlo qui
 * vorrebbe dire due conti da tenere d'accordo per scrivere lo stesso nome.
 */
export function nomeDiPiano (piano: PianoLezione): string {
  return nomeDelPiano(stato.registro, piano)
}

/**
 * Di quale lezione è un piano, senza ripetere il corso: «3ª lezione», «bozza del 12.09».
 *
 * È il nome che va negli elenchi di una pagina di corso, dove il corso è già
 * scritto in testata.
 */
export function lezioneDiPiano (piano: PianoLezione): string {
  return lezioneDelPianoNelRegistro(stato.registro, piano)
}

/**
 * Come si chiama una lezione: «3ª lezione».
 *
 * Il numero e non la data, perché è così che si nominano le lezioni parlando —
 * e perché è il nome che porta anche il piano appeso a quell'ora, così l'elenco
 * delle ore e l'elenco dei piani dicono la stessa parola. La data resta il
 * ripiego per le annullate, che un numero non ce l'hanno.
 */
export function nomeDiLezione (lezione: Lezione): string {
  const numero = numeroDellaLezione(stato.registro, lezione)
  return numero ? `${numero}ª lezione` : formattaData(lezione.data, 'giorno')
}

/**
 * Di che cosa parla una lezione, in due parole.
 *
 * Non è il nome del piano — quello è la lezione stessa, e nel calendario
 * ripetere «Matematica 3A · 12ª lezione» dentro il blocco di quell'ora di Matematica 3A
 * è spazio buttato. Quel che serve a colpo d'occhio è l'argomento: lo dice il
 * primo obiettivo del piano, e se obiettivi non ce ne sono la prima tappa
 * della scaletta. Senza piano non c'è niente da dire, e la riga resta pulita.
 */
export function titoloDiLezione (lezione: Lezione): string {
  const piano = pianoPerId(lezione.pianoId)
  if (!piano) return ''
  return piano.obiettivi[0] ?? piano.attivita.find((a) => a.titolo.trim())?.titolo ?? ''
}

/**
 * Le tappe della scaletta di un'ora, nell'ordine in cui si fanno.
 *
 * Una tappa senza titolo non sparisce: si presenta con il proprio tipo —
 * «Esercizio», «Verifica» — perché nella striscia di una settimana quel che si
 * legge è il ritmo dell'ora, e un buco in mezzo alla sequenza la racconta male.
 *
 * Elenco e non stringa: chi la mostra decide dove tagliarla, e in un blocco
 * alto trenta pixel si taglia prima che in un suggerimento.
 */
export function tappeDiLezione (lezione: Lezione): string[] {
  return scalettaDiLezione(lezione).map((tappa) => tappa.titolo)
}

/** Una tappa come si racconta fuori dal piano: come si chiama e quanto dura. */
interface TappaDellaLezione {
  titolo: string
  minuti: number
}

/**
 * La scaletta di un'ora, con le durate in minuti.
 *
 * Le durate nel piano stanno in unità didattiche — così lo stesso piano riusato
 * dove l'UD è da cinquanta riempie comunque l'ora — e qui si convertono con
 * l'unità delle impostazioni, che è quella con cui si prepara.
 */
export function scalettaDiLezione (lezione: Lezione): TappaDellaLezione[] {
  const piano = pianoPerId(lezione.pianoId)
  if (!piano) return []
  const perUd = stato.registro.impostazioni.durataSlotPredefinita || MINUTI_UD
  return piano.attivita.map((a) => ({
    titolo: a.titolo.trim() || nomeTipoAttivita(a.tipo),
    minuti: minutiDiAttivita(a.durataUd, perUd),
  }))
}

export function coloreDiLezione (lezione: Lezione): string {
  return classeDiLezione(lezione)?.colore ?? '#888888'
}

/**
 * Le lezioni dell'anno in corso, con il filtro delle pagine di corso applicato:
 * quelle della classe su cui si sta lavorando.
 */
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
 * La classe di cui il calendario sta mostrando i compleanni, o `null` per tutte.
 *
 * Il filtro del calendario è per corso, ma un compleanno non è di un corso: è
 * della persona, e quindi della sua classe. Guardando le ore di matematica di
 * una classe sola, i compleanni sono quelli di quella classe — mostrare anche
 * gli altri vorrebbe dire un filtro che filtra a metà.
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
 * Su quale ora si apre il Registro quando lo si chiama dal menu.
 *
 * Nell'ordine: quella che si stava guardando, se c'è ancora; altrimenti
 * l'ultima già passata — è quella di cui si scrive il consuntivo, ed è quasi
 * sempre il motivo per cui si apre il registro; se l'anno deve ancora
 * cominciare, la prima che verrà.
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
 * Su quale ora si apre il Registro di un corso preciso.
 *
 * La stessa regola di `lezioneDiRiferimento` — l'ultima gia' passata, o la
 * prima se il corso deve ancora cominciare — ristretta alle ore del semestre
 * scelto: chiamando il registro di un corso da sotto il suo titolo, aprirsi su
 * un'ora dell'altro semestre vorrebbe dire una pagina che i conti accanto non
 * contano. Se in quel periodo ore non ce ne sono si guarda tutto il corso,
 * che e' meglio di una pagina vuota.
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
 * I documenti spuntati che stanno ancora nella cartella.
 *
 * Una spunta sopravvive a quel che spuntava: si butta via un foglio, si rifà un
 * rapporto datato — che prende un nome nuovo — e nell'elenco resta un percorso
 * che non apre più niente. Chi conta le spunte deve contare queste: un comando
 * che dice «combina i 5 scelti» e poi ne trova tre è un comando che ha mentito.
 */
export function sceltiPresenti (): string[] {
  return stato.documentiScelti.filter((percorso) =>
    stato.esportati.some((e) => e.percorso === percorso),
  )
}

/**
 * L'indirizzo con cui il webview può caricare un file della cartella dei dati.
 * Ogni pezzo del percorso va codificato: i nomi dei file scelti da disco hanno
 * spazi, accenti e parentesi, e passati com'è non arriverebbero.
 */
export function uriDato (relativo: string | undefined): string | null {
  if (!relativo || !stato.radiceDati) return null
  const pezzi = relativo.split('/').filter(Boolean).map(encodeURIComponent)
  return pezzi.length > 0 ? `${stato.radiceDati}/${pezzi.join('/')}` : null
}

/**
 * Il fascicolo di una classe, o uno vuoto se non c'è ancora. Le viste non
 * hanno nulla da decidere sulla differenza: un fascicolo che non esiste e uno
 * senza niente dentro si disegnano allo stesso modo, e nasce da solo alla prima
 * cosa che ci si mette.
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
  return stato.registro.classi.find((c) => c.id === classeId)?.nome ?? 'senza classe'
}

/**
 * Vero se il fuoco è dentro un campo di testo libero: mentre si scrive non è
 * il momento di ridisegnare. `ricordaFuoco`/`ripristinaFuoco` rimettono cursore
 * e valore al loro posto, ma per la frazione di secondo fra i due il campo
 * sparisce e ricompare — abbastanza per perdere il tasto premuto in quel
 * momento, se capita in un punto scomodo.
 */
function scrivendoInUnCampo (): boolean {
  const attivo = document.activeElement
  if (attivo instanceof HTMLTextAreaElement) return true
  return (
    attivo instanceof HTMLInputElement &&
    ['text', 'number', 'email', 'tel', 'search', 'url'].includes(attivo.type)
  )
}

/**
 * Tiene `stato.rete` al passo del computer.
 *
 * Due eventi e nient'altro: il browser li manda quando la connessione va e
 * viene, e non c'è niente da interrogare a intervalli.
 */
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
 * Fa battere l'orologio dello stato, e subito quando il pannello torna in primo
 * piano dopo essere stato nascosto.
 *
 * Il minuto è la grana con cui si **ridisegna**: le lezioni durano decine di
 * minuti e nessuna decisione cambia per un secondo, quindi la vista si rifà
 * solo quando data e ora scritte nello stato cambiano davvero.
 *
 * Il battito però è di quindici secondi, ed è un'altra cosa. Guardando una
 * volta al minuto, il minuto nuovo si vedrebbe fino a un minuto dopo essere
 * cominciato — e il registro dice «l'ora comincia fra 5 minuti»: una
 * lancetta che va avanti a scatti di un minuto pieno si vede. Quattro
 * controlli al minuto costano un confronto fra due stringhe, e il ridisegno
 * resta uno. Questo commento diceva «ogni minuto, o si rifarebbe la vista
 * sessanta volte»: nessuno dei due numeri era quello del codice.
 */
export function avviaOrologio (): () => void {
  const batti = () => {
    const data = oggi()
    const ora = adesso()
    if (data === stato.adessoData && ora === stato.adessoOra) return
    // Si riprova al prossimo battito: il minuto cambiato non scappa, e non
    // vale la pena rifare la vista sotto le dita di chi sta scrivendo.
    if (scrivendoInUnCampo()) return
    aggiorna({ adessoData: data, adessoOra: ora })
  }

  const timer = setInterval(batti, 15_000)
  // Tornando su una finestra lasciata aperta dalla mattina, il primo sguardo
  // deve trovare l'ora giusta senza aspettare il prossimo battito.
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
  return semestreScelto()?.etichetta ?? 'anno intero'
}

/** Tiene solo quel che cade nel semestre scelto. */
export function nelSemestreScelto<T extends { data: Iso }> (voci: T[]): T[] {
  const semestre = semestreScelto()
  if (!semestre) return voci
  return voci.filter((v) => v.data >= semestre.inizio && v.data <= semestre.fine)
}

/**
 * Come sopra, per quel che porta la data dentro un istante — `creataIl` — e non
 * in un campo `data` suo.
 *
 * La parte davanti a `T` di un istante ISO è la sua data, e confrontarla con
 * gli estremi del semestre è la stessa cosa che fa `nelSemestreScelto`.
 */
export function nelSemestreSceltoPer<T> (voci: T[], quando: (voce: T) => string): T[] {
  const semestre = semestreScelto()
  if (!semestre) return voci
  return voci.filter((voce) => {
    const giorno = quando(voce).slice(0, 10)
    return giorno >= semestre.inizio && giorno <= semestre.fine
  })
}

/**
 * I periodi che toccano il semestre scelto.
 *
 * Un blocco di assenze è esso stesso un periodo — «1° semestre»,
 * «settembre–dicembre» — e si tiene se si sovrappone, non se ci sta dentro: un
 * periodo a cavallo di gennaio riguarda tutti e due i semestri, e sparire da
 * tutti e due sarebbe il modo di perderlo.
 */
export function toccaIlSemestreScelto<T extends { dal: Iso, al: Iso }> (voci: T[]): T[] {
  const semestre = semestreScelto()
  if (!semestre) return voci
  return voci.filter((v) => v.dal <= semestre.fine && v.al >= semestre.inizio)
}

/**
 * Alla prima apertura porta il registro sul semestre in cui cade oggi — e a
 * ogni apertura controlla che quello ricordato esista ancora.
 *
 * Si fa qui e non nell'inizializzazione perché all'avvio il registro non è
 * ancora arrivato: la scelta buona si può fare solo quando i semestri ci sono.
 * La scelta del docente comanda — ma comanda **dentro il suo documento**.
 *
 * Il controllo di validità mancava. Qui sopra c'era scritto che era l'unico
 * campo ricordato senza — non era vero: ne mancava in sei, `vista` compresa, e
 * adesso passano tutti da `convalidata()` come dice il commento accanto allo
 * stato iniziale. Un `semestreId`
 * è di un documento e basta: cambiato documento non è più di nessuno, e
 * `semestreScelto()` tornava `null`, che per `nelSemestreScelto` e per tutti i
 * conti vuol dire «anno intero». La tendina «Periodo» diceva un semestre e le
 * percentuali erano dell'anno: due risposte diverse alla stessa domanda, a due
 * centimetri l'una dall'altra.
 */
export function allineaSemestre (): void {
  const anno = annoCorrente()
  // Prima del ritorno anticipato: questo va fatto a ogni arrivo dei dati, non
  // solo la prima volta.
  if (stato.semestreId && anno && !anno.semestri.some((s) => s.id === stato.semestreId)) {
    // Diretto e non da `aggiorna`, che spegnerebbe la spia appena riaccesa.
    stato.semestreId = null
    semestreDaAllineare = true
  }
  if (!semestreDaAllineare) return
  if (!anno || anno.semestri.length === 0) return
  semestreDaAllineare = false
  const suo = semestreDi(anno, stato.adessoData)
  // Passa da `aggiorna` e non dallo stato diretto: così la scelta si ricorda, e
  // la vista che sta per disegnarsi la trova già fatta.
  if (suo) aggiorna({ semestreId: suo.id })
}

/** Il semestre in cui cade una data, nell'anno in corso. */
export function semestrePerData (data: Iso): Semestre | null {
  const anno = annoCorrente()
  return anno ? semestreDi(anno, data) : null
}

// ------------------------------------------------------------------ proiezione

/**
 * Dove sta guardando il registro, detto allo schermo per la classe.
 *
 * Sono riferimenti e non dati: la proiezione rilegge tutto dall'archivio, così
 * una correzione fatta mentre lo schermo è acceso arriva anche là. La lezione è
 * quella aperta nel Registro; sulle altre viste si ripiega sul corso o sulla
 * classe, che bastano a mostrare consegne e calendario.
 */
export function miraProiezione (): MiraProiezione {
  // L'ora di riferimento e non «l'ora solo se sono nella vista Registro»: si
  // apre la lezione, poi si passa al piano per cambiare una tappa e al
  // calendario per guardare la settimana, e in tutto questo la classe sta
  // ancora facendo quell'ora. Lo schermo grande non deve svuotarsi perché il
  // docente ha cambiato scheda.
  const lezione = lezionePerId(stato.lezioneId)
  return {
    lezioneId: lezione?.id ?? null,
    corsoId: stato.corsoId ?? lezione?.corsoId ?? null,
    classeId: stato.classeId ?? stato.filtroClasseId,
    semestreId: stato.semestreId,
    data: stato.data,
  }
}
